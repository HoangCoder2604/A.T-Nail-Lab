import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  firebaseAuth,
  firestoreDb,
  isFirebaseConfigured,
} from '../lib/firebase';
import { bookingHours } from '../data/salon';

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const BOOKING_MIN_GAP_MINUTES = 30;

export class BookingConflictError extends Error {
  constructor(message = 'Khung giờ này đã có lịch gần đó. Vui lòng chọn giờ khác cách ít nhất 30 phút.') {
    super(message);
    this.name = 'BookingConflictError';
    this.code = 'BOOKING_TIME_CONFLICT';
  }
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

function normalizeTime(time = '') {
  return String(time).slice(0, 5);
}

function isValidTime(time = '') {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalizeTime(time));
}

function makeSlotId(date, time) {
  return `${date}_${normalizeTime(time)}`;
}

function getNearbySlotIds(date, time) {
  const [hour, minute] = normalizeTime(time).split(':').map(Number);
  const currentMinutes = hour * 60 + minute;
  const ids = [];

  for (let offset = -(BOOKING_MIN_GAP_MINUTES - 1); offset < BOOKING_MIN_GAP_MINUTES; offset += 1) {
    const candidateMinutes = currentMinutes + offset;
    if (candidateMinutes < 0 || candidateMinutes >= 24 * 60) continue;

    const candidateHour = String(Math.floor(candidateMinutes / 60)).padStart(2, '0');
    const candidateMinute = String(candidateMinutes % 60).padStart(2, '0');
    ids.push(makeSlotId(date, `${candidateHour}:${candidateMinute}`));
  }

  return ids;
}

function toLocalDateTime(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = normalizeTime(time).split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function makeLookupKey(bookingCode, phone) {
  return sha256Hex(`${bookingCode.toUpperCase()}|${normalizePhone(phone)}`);
}

export function generateBookingCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `ATN-${yy}${mm}${dd}-${random}`;
}

function validateBookingInput(formData) {
  if (!formData.name?.trim()) throw new Error('Vui lòng nhập họ và tên.');

  const phone = normalizePhone(formData.phone);
  if (phone.length < 9 || phone.length > 12) {
    throw new Error('Số điện thoại chưa hợp lệ.');
  }

  if (!formData.date) throw new Error('Vui lòng chọn ngày đặt lịch.');
  if (!formData.time) throw new Error('Vui lòng chọn giờ đặt lịch.');

  if (!isValidTime(formData.time)) {
    throw new Error('Giờ đặt lịch chưa hợp lệ.');
  }

  const bookingTime = normalizeTime(formData.time);
  if (bookingTime < bookingHours.open || bookingTime > bookingHours.close) {
    throw new Error(`A.T Nail Lab nhận lịch từ ${bookingHours.open} đến ${bookingHours.close}.`);
  }

  if (toLocalDateTime(formData.date, formData.time).getTime() <= Date.now()) {
    throw new Error('Vui lòng chọn thời gian trong tương lai.');
  }
}

export async function createBooking(formData) {
  if (!isFirebaseConfigured || !firestoreDb) {
    throw new Error('Firebase chưa được cấu hình. Hãy kiểm tra file .env rồi khởi động lại Vite.');
  }

  validateBookingInput(formData);

  const bookingCode = generateBookingCode();
  const phone = normalizePhone(formData.phone);
  const bookingTime = normalizeTime(formData.time);
  const slotId = makeSlotId(formData.date, bookingTime);
  const lookupKey = await makeLookupKey(bookingCode, phone);

  const booking = {
    booking_code: bookingCode,
    customer_name: formData.name.trim(),
    phone,
    email: formData.email?.trim() || null,
    service: formData.service,
    booking_date: formData.date,
    booking_time: bookingTime,
    note: formData.note?.trim() || null,
    status: BOOKING_STATUS.PENDING,
    messenger_psid: null,
    slot_id: slotId,
    lookup_key: lookupKey,
  };

  const bookingRef = doc(firestoreDb, 'bookings', bookingCode);
  const slotRef = doc(firestoreDb, 'bookingSlots', slotId);
  const publicRef = doc(firestoreDb, 'bookingPublic', lookupKey);

  await runTransaction(firestoreDb, async (transaction) => {
    // Đọc mọi giờ bắt đầu nằm trong khoảng ±29 phút. Nếu một giao dịch đồng thời
    // tạo bất kỳ document nào vừa được đọc, Firestore sẽ retry transaction và phát
    // hiện xung đột. Hai lịch cách đúng 30 phút vẫn được chấp nhận.
    const nearbySlotRefs = getNearbySlotIds(formData.date, bookingTime)
      .map((nearbySlotId) => doc(firestoreDb, 'bookingSlots', nearbySlotId));
    const nearbySlotSnapshots = await Promise.all(
      nearbySlotRefs.map((nearbySlotRef) => transaction.get(nearbySlotRef)),
    );

    if (nearbySlotSnapshots.some((snapshot) => snapshot.exists())) {
      throw new BookingConflictError();
    }

    transaction.set(bookingRef, {
      ...booking,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      confirmed_at: null,
    });

    transaction.set(slotRef, {
      slot_id: slotId,
      booking_code: bookingCode,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: 'HELD',
      created_at: serverTimestamp(),
    });

    transaction.set(publicRef, {
      lookup_key: lookupKey,
      booking_code: bookingCode,
      customer_name: booking.customer_name,
      service: booking.service,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      note: booking.note,
      status: BOOKING_STATUS.PENDING,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  });

  const now = new Date().toISOString();
  return {
    id: bookingCode,
    ...booking,
    created_at: now,
    updated_at: now,
    confirmed_at: null,
  };
}

export async function checkBooking(bookingCode, phone) {
  if (!isFirebaseConfigured || !firestoreDb) {
    throw new Error('Firebase chưa được cấu hình.');
  }

  const code = bookingCode.trim().toUpperCase();
  const normalizedPhone = normalizePhone(phone);
  const lookupKey = await makeLookupKey(code, normalizedPhone);
  const snapshot = await getDoc(doc(firestoreDb, 'bookingPublic', lookupKey));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

function waitForAuthUser() {
  if (!firebaseAuth) return Promise.resolve(null);
  if (firebaseAuth.currentUser) return Promise.resolve(firebaseAuth.currentUser);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function isAdminUser(user) {
  if (!user || !firestoreDb) return false;
  const snapshot = await getDoc(doc(firestoreDb, 'admins', user.uid));
  return snapshot.exists();
}

export async function signInAdmin(email, password) {
  if (!firebaseAuth || !firestoreDb) {
    throw new Error('Firebase chưa được cấu hình.');
  }

  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const allowed = await isAdminUser(credential.user);
  if (!allowed) {
    await signOut(firebaseAuth);
    throw new Error('Tài khoản này không có quyền quản trị.');
  }
  return { user: credential.user };
}

export async function signOutAdmin() {
  if (firebaseAuth) await signOut(firebaseAuth);
}

export async function getAdminSession() {
  if (!firebaseAuth || !firestoreDb) return null;
  const user = await waitForAuthUser();
  if (!user) return null;
  return (await isAdminUser(user)) ? { user } : null;
}

export async function listBookings() {
  if (!firestoreDb) throw new Error('Firebase chưa được cấu hình.');

  const snapshot = await getDocs(collection(firestoreDb, 'bookings'));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const left = `${a.booking_date}T${a.booking_time}`;
      const right = `${b.booking_date}T${b.booking_time}`;
      return right.localeCompare(left);
    });
}


export function subscribeBookings(onData, onError) {
  if (!firestoreDb) {
    onError?.(new Error('Firebase chưa được cấu hình.'));
    return () => {};
  }

  return onSnapshot(
    collection(firestoreDb, 'bookings'),
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const left = `${a.booking_date}T${a.booking_time}`;
          const right = `${b.booking_date}T${b.booking_time}`;
          return right.localeCompare(left);
        });

      const added = snapshot.docChanges()
        .filter((change) => change.type === 'added')
        .map((change) => ({ id: change.doc.id, ...change.doc.data() }));

      onData?.(items, added);
    },
    (error) => onError?.(error),
  );
}

export async function notifyAdminOfNewBooking(bookingCode) {
  try {
    const response = await fetch('/api/notify-new-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingCode }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      return { sent: false, reason: result.error || `HTTP_${response.status}` };
    }

    return response.json().catch(() => ({ ok: true }));
  } catch (error) {
    // Khi chạy bằng `npm run dev`, Vite không chạy Vercel /api. Booking vẫn thành công;
    // push sẽ hoạt động sau khi deploy Vercel hoặc khi dùng `vercel dev`.
    return { sent: false, reason: error?.message || 'PUSH_ENDPOINT_UNAVAILABLE' };
  }
}

export async function updateBookingStatus(id, status) {
  if (!Object.values(BOOKING_STATUS).includes(status)) {
    throw new Error('Trạng thái không hợp lệ.');
  }
  if (!firestoreDb) throw new Error('Firebase chưa được cấu hình.');

  const bookingRef = doc(firestoreDb, 'bookings', id);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) throw new Error('Không tìm thấy booking.');

  const current = { id: bookingSnap.id, ...bookingSnap.data() };
  const batch = writeBatch(firestoreDb);
  const patch = {
    status,
    updated_at: serverTimestamp(),
  };

  if (status === BOOKING_STATUS.CONFIRMED) {
    patch.confirmed_at = serverTimestamp();
  }

  batch.update(bookingRef, patch);

  if (current.lookup_key) {
    batch.set(
      doc(firestoreDb, 'bookingPublic', current.lookup_key),
      { status, updated_at: serverTimestamp() },
      { merge: true },
    );
  }

  // Hủy lịch -> nhả slot để người khác có thể đặt lại.
  if (status === BOOKING_STATUS.CANCELLED && current.slot_id) {
    batch.delete(doc(firestoreDb, 'bookingSlots', current.slot_id));
  }

  await batch.commit();

  return {
    ...current,
    status,
    updated_at: new Date().toISOString(),
    confirmed_at:
      status === BOOKING_STATUS.CONFIRMED
        ? new Date().toISOString()
        : current.confirmed_at,
  };
}

export async function getAccessToken() {
  if (!firebaseAuth) return null;
  const user = firebaseAuth.currentUser || (await waitForAuthUser());
  return user ? user.getIdToken() : null;
}

export async function notifyStatusViaMessenger(booking) {
  if (!booking?.messenger_psid) {
    return {
      sent: false,
      reason: 'Booking chưa được liên kết với Messenger Page. Khách cần mở/nhắn Page để webhook nhận PSID trước khi hệ thống có thể gửi phản hồi tự động.',
    };
  }

  const token = await getAccessToken();
  if (!token) return { sent: false, reason: 'Phiên admin đã hết hạn.' };

  const response = await fetch('/api/send-status-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId: booking.id }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Không gửi được Messenger.');
  return result;
}

export function getMessengerMode() {
  return 'page';
}

export function buildMessengerHandoffUrl(bookingCode) {
  const page = import.meta.env.VITE_MESSENGER_PAGE || '61584573756566';
  const baseUrl = `https://m.me/${page}`;

  return bookingCode
    ? `${baseUrl}?ref=${encodeURIComponent(bookingCode)}`
    : baseUrl;
}

export function isMessengerAutoReplyAvailable() {
  return true;
}
