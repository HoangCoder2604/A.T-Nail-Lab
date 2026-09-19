import crypto from 'node:crypto';
import {
  buildMessengerBookingMessage,
  extractReferralCode,
  getServerFirebase,
  sendMessengerText,
} from './_helpers.js';

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function hasValidMetaSignature(rawBody, signature) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true;
  if (!signature?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')}`;

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

async function claimBookingMessengerLink(db, bookingCode, psid) {
  const bookingRef = db.collection('bookings').doc(bookingCode);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(bookingRef);
    if (!snapshot.exists) return { state: 'NOT_FOUND' };

    const booking = snapshot.data();
    if (booking.messenger_psid && booking.messenger_psid !== psid) {
      return { state: 'ALREADY_LINKED' };
    }

    if (booking.messenger_welcome_state === 'SENT') {
      return { state: 'ALREADY_SENT' };
    }

    const claimedAt = booking.messenger_welcome_claimed_at?.toDate?.();
    const claimIsFresh = claimedAt && Date.now() - claimedAt.getTime() < CLAIM_TIMEOUT_MS;
    if (booking.messenger_welcome_state === 'CLAIMED' && claimIsFresh) {
      return { state: 'IN_PROGRESS' };
    }

    const now = new Date();
    transaction.update(bookingRef, {
      messenger_psid: psid,
      messenger_linked_at: booking.messenger_linked_at || now,
      messenger_welcome_state: 'CLAIMED',
      messenger_welcome_claimed_at: now,
      updated_at: now,
    });

    return {
      state: 'CLAIMED',
      ref: bookingRef,
      booking: { ...booking, messenger_psid: psid },
    };
  });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Webhook verification failed.');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let body;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-hub-signature-256'];
    if (!hasValidMetaSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid webhook payload.' });
  }

  if (body?.object !== 'page') {
    return res.status(200).json({ received: true });
  }

  // Luồng hiện tại dùng copy/paste thủ công. Chỉ bật lại webhook automation khi
  // chủ dự án chủ động đặt biến server này thành "true".
  if (process.env.MESSENGER_AUTOMATION_ENABLED !== 'true') {
    return res.status(200).json({ received: true, automation: 'disabled' });
  }

  try {
    const { db } = getServerFirebase();
    const events = (body.entry || []).flatMap((entry) => entry.messaging || []);

    for (const event of events) {
      const psid = event?.sender?.id;
      const bookingCode = extractReferralCode(event)?.toUpperCase();
      if (!psid || !bookingCode) continue;

      const claim = await claimBookingMessengerLink(db, bookingCode, psid);
      if (claim.state !== 'CLAIMED') continue;

      try {
        const result = await sendMessengerText(
          psid,
          buildMessengerBookingMessage(claim.booking),
        );
        if (!result.sent) throw new Error(result.reason || 'Messenger Send API failed.');

        await claim.ref.update({
          messenger_welcome_state: 'SENT',
          messenger_welcome_sent_at: new Date(),
          messenger_welcome_status: claim.booking.status,
          updated_at: new Date(),
        });
      } catch (sendError) {
        await claim.ref.update({
          messenger_welcome_state: 'FAILED',
          messenger_welcome_error: String(sendError?.message || 'SEND_FAILED').slice(0, 500),
          updated_at: new Date(),
        });
        console.error('Messenger booking summary failed:', sendError.message);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Messenger webhook error:', error);
    // Meta cần nhận 200 nhanh để tránh retry storm.
    return res.status(200).json({ received: true, warning: error.message });
  }
}
