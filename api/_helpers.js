
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';



function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export function getServerFirebase() {
  const app = getAdminApp();
  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

export async function requireAdminFromBearer(req) {
  const authorization = req.headers.authorization || '';
  const idToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!idToken) throw new Error('MISSING_ADMIN_TOKEN');

  const { auth, db } = getServerFirebase();
  const decoded = await auth.verifyIdToken(idToken);
  const adminSnap = await db.collection('admins').doc(decoded.uid).get();
  if (!adminSnap.exists) throw new Error('ADMIN_REQUIRED');
  return decoded;
}

export async function sendMessengerText(psid, text) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const graphVersion = process.env.META_GRAPH_VERSION || 'v24.0';

  if (!accessToken || !pageId) {
    return { sent: false, reason: 'Meta Messenger environment variables are not configured.' };
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${pageId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: psid },
      messaging_type: 'RESPONSE',
      message: { text },
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Messenger Send API failed.');
  }

  return { sent: true, result };
}

export function formatBookingDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
}

export function buildMessengerBookingMessage(booking) {
  const details = [
    `Mã lịch: ${booking.booking_code}`,
    `Dịch vụ: ${booking.service}`,
    `Ngày: ${formatBookingDate(booking.booking_date)}`,
    `Giờ: ${String(booking.booking_time || '').slice(0, 5)}`,
  ];

  if (booking.status === 'CONFIRMED') {
    return [
      '💅 A.T Nail Lab',
      'Mình xác nhận lịch của bạn nha 💕',
      '',
      ...details,
    ].join('\n');
  }

  if (booking.status === 'CANCELLED') {
    return [
      '💅 A.T Nail Lab',
      'A.T Nail Lab rất tiếc, lịch này hiện chưa thể xác nhận. Bạn vui lòng chọn khung giờ khác giúp mình nha 💕',
      '',
      ...details,
    ].join('\n');
  }

  if (booking.status === 'COMPLETED') {
    return [
      '💅 A.T Nail Lab',
      'Cảm ơn bạn đã ghé A.T Nail Lab. Hẹn gặp lại bạn trong lần làm móng tiếp theo nha 💕',
      '',
      ...details,
    ].join('\n');
  }

  return [
    '💅 A.T Nail Lab đã nhận yêu cầu đặt lịch của bạn.',
    '',
    ...details,
    '',
    'Bạn vui lòng chờ A.T Nail Lab xác nhận lịch nhé 💕',
  ].join('\n');
}

export function extractReferralCode(event) {
  const candidates = [
    event?.referral?.ref,
    event?.message?.referral?.ref,
    event?.postback?.referral?.ref,
    event?.postback?.payload,
    event?.message?.text,
  ].filter(Boolean);

  for (const value of candidates) {
    const match = String(value).toUpperCase().match(/ATN-[0-9]{6}-[A-Z0-9]{8}/);
    if (match) return match[0];
  }

  return null;
}
