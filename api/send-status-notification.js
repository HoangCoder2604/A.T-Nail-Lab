import {
  buildMessengerBookingMessage,
  getServerFirebase,
  requireAdminFromBearer,
  sendMessengerText,
} from './_helpers.js';

const NOTIFIABLE_STATUSES = new Set(['CONFIRMED', 'CANCELLED', 'COMPLETED']);
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    await requireAdminFromBearer(req);

    const bookingId = req.body?.bookingId;
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required.' });
    }

    const { db } = getServerFirebase();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const claim = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(bookingRef);
      if (!snapshot.exists) return { state: 'NOT_FOUND' };

      const booking = snapshot.data();
      if (!booking.messenger_psid) return { state: 'NOT_LINKED' };
      if (!NOTIFIABLE_STATUSES.has(booking.status)) return { state: 'STATUS_NOT_NOTIFIABLE' };
      if (booking.messenger_last_notified_status === booking.status) {
        return { state: 'ALREADY_SENT', booking };
      }

      const claimedAt = booking.messenger_status_claimed_at?.toDate?.();
      const claimIsFresh = claimedAt && Date.now() - claimedAt.getTime() < CLAIM_TIMEOUT_MS;
      if (
        booking.messenger_status_state === 'CLAIMED'
        && booking.messenger_status_claimed_status === booking.status
        && claimIsFresh
      ) {
        return { state: 'IN_PROGRESS', booking };
      }

      transaction.update(bookingRef, {
        messenger_status_state: 'CLAIMED',
        messenger_status_claimed_status: booking.status,
        messenger_status_claimed_at: new Date(),
        updated_at: new Date(),
      });

      return { state: 'CLAIMED', booking };
    });

    if (claim.state === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (claim.state === 'NOT_LINKED') {
      return res.status(200).json({
        sent: false,
        reason: 'Booking chưa được liên kết với Messenger Page.',
      });
    }

    if (claim.state === 'STATUS_NOT_NOTIFIABLE') {
      return res.status(400).json({ error: 'Booking status is not notifiable.' });
    }

    if (claim.state === 'ALREADY_SENT' || claim.state === 'IN_PROGRESS') {
      return res.status(200).json({ sent: false, duplicate: true });
    }

    try {
      const result = await sendMessengerText(
        claim.booking.messenger_psid,
        buildMessengerBookingMessage(claim.booking),
      );
      if (!result.sent) throw new Error(result.reason || 'Messenger Send API failed.');

      await bookingRef.update({
        messenger_status_state: 'SENT',
        messenger_last_notified_status: claim.booking.status,
        messenger_last_notified_at: new Date(),
        updated_at: new Date(),
      });

      return res.status(200).json({ ...result, status: claim.booking.status });
    } catch (sendError) {
      await bookingRef.update({
        messenger_status_state: 'FAILED',
        messenger_status_error: String(sendError?.message || 'SEND_FAILED').slice(0, 500),
        updated_at: new Date(),
      });
      throw sendError;
    }
  } catch (error) {
    console.error('send-status-notification error:', error);

    if (error.message === 'MISSING_ADMIN_TOKEN') {
      return res.status(401).json({ error: 'Missing admin access token.' });
    }

    if (error.message === 'ADMIN_REQUIRED') {
      return res.status(403).json({ error: 'Admin permission required.' });
    }

    return res.status(500).json({ error: error.message || 'Internal server error.' });
  }
}
