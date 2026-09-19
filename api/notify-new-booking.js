import { getMessaging } from 'firebase-admin/messaging';
import { getServerFirebase } from './_helpers.js';

function validBookingCode(value) {
  return /^ATN-[0-9]{6}-[A-Z0-9]{8}$/.test(String(value || ''));
}

function formatBody(booking) {
  const customer = booking.customer_name || 'Khách mới';
  const service = booking.service || 'Dịch vụ nail';
  const date = booking.booking_date || '';
  const time = booking.booking_time || '';
  return `${customer} • ${service} • ${date} lúc ${time}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const bookingCode = String(req.body?.bookingCode || '').toUpperCase();
  if (!validBookingCode(bookingCode)) {
    return res.status(400).json({ error: 'BOOKING_CODE_INVALID' });
  }

  try {
    const { db } = getServerFirebase();
    const bookingRef = db.collection('bookings').doc(bookingCode);
    const notificationRef = db.collection('bookingPushNotifications').doc(bookingCode);

    const claimed = await db.runTransaction(async (transaction) => {
      const [bookingSnap, notificationSnap] = await Promise.all([
        transaction.get(bookingRef),
        transaction.get(notificationRef),
      ]);

      if (!bookingSnap.exists) throw new Error('BOOKING_NOT_FOUND');
      if (notificationSnap.exists) return null;

      const booking = bookingSnap.data();
      if (booking.status !== 'PENDING') throw new Error('BOOKING_NOT_PENDING');

      transaction.create(notificationRef, {
        booking_code: bookingCode,
        state: 'CLAIMED',
        created_at: new Date(),
      });

      return booking;
    });

    if (!claimed) {
      return res.status(200).json({ ok: true, sent: 0, duplicate: true });
    }

    const tokenSnapshot = await db.collection('adminPushTokens')
      .where('enabled', '==', true)
      .get();

    if (tokenSnapshot.empty) {
      await notificationRef.set({
        state: 'NO_REGISTERED_DEVICE',
        completed_at: new Date(),
      }, { merge: true });
      return res.status(200).json({ ok: true, sent: 0, reason: 'NO_REGISTERED_DEVICE' });
    }

    const title = '💅 A.T Nail Lab • Có lịch đặt mới';
    const body = formatBody(claimed);
    const url = `/admin?booking=${encodeURIComponent(bookingCode)}`;
    const messaging = getMessaging();

    const results = await Promise.all(tokenSnapshot.docs.map(async (tokenDoc) => {
      const tokenData = tokenDoc.data();
      try {
        const messageId = await messaging.send({
          token: tokenData.token,
          data: {
            title,
            body,
            bookingCode,
            url,
          },
          webpush: {
            headers: { Urgency: 'high' },
          },
        });
        return { ok: true, messageId, ref: tokenDoc.ref };
      } catch (error) {
        const code = error?.code || '';
        const invalid = [
          'messaging/registration-token-not-registered',
          'messaging/invalid-registration-token',
        ].includes(code);
        if (invalid) await tokenDoc.ref.delete();
        return { ok: false, code, ref: tokenDoc.ref };
      }
    }));

    const sent = results.filter((item) => item.ok).length;
    const failed = results.length - sent;

    await notificationRef.set({
      state: sent > 0 ? 'SENT' : 'FAILED',
      sent_count: sent,
      failed_count: failed,
      completed_at: new Date(),
    }, { merge: true });

    return res.status(200).json({ ok: true, sent, failed });
  } catch (error) {
    const message = error?.message || 'PUSH_SEND_FAILED';
    const code = message === 'BOOKING_NOT_FOUND' ? 404 : 500;
    return res.status(code).json({ error: message });
  }
}
