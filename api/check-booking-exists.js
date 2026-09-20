import { getServerFirebase } from './_helpers.js';

function isValidBookingCode(value) {
  return /^ATN-[0-9]{6}-[A-Z0-9]{8}$/.test(String(value || ''));
}

function isValidLookupKey(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const bookingCode = String(req.body?.bookingCode || '').trim().toUpperCase();
  const lookupKey = String(req.body?.lookupKey || '').trim().toLowerCase();

  if (!isValidBookingCode(bookingCode) || !isValidLookupKey(lookupKey)) {
    return res.status(400).json({ error: 'BOOKING_REFERENCE_INVALID' });
  }

  try {
    const { db } = getServerFirebase();
    const snapshot = await db.collection('bookings').doc(bookingCode).get();
    const exists = snapshot.exists && snapshot.data()?.lookup_key === lookupKey;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ exists });
  } catch (error) {
    console.error('Booking existence check failed:', error);
    return res.status(500).json({ error: 'BOOKING_CHECK_FAILED' });
  }
}
