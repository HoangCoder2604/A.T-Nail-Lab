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
export const BOOKING_CAPACITY_PER_WINDOW = 2;

export class BookingConflictError extends Error {
  constructor(message = 'Khoảng thời gian này đã đủ 2 khách. Vui lòng chọn giờ khác.') {
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

function timeToMinutes(time) {
  const [hour, minute] = normalizeTime(time).split(':').map(Number);
  return hour * 60 + minute;
}

function getNearbySlotIds(date, time) {
  const currentMinutes = timeToMinutes(time);
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

  if (!formData.service?.trim()) {
    throw new Error('Vui lòng chọn ít nhất một dịch vụ.');
  }

  if (formData.service.length > 500) {
    throw new Error('Danh sách dịch vụ đã chọn không hợp lệ.');
  }

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
    // Mỗi document đại diện cho một phút bắt đầu và chứa tối đa 2 mã lịch.
    // Sau khi thêm lịch mới, không được có 3 lượt bắt đầu nằm trong cùng một
    // khoảng dưới 30 phút. Mốc cách đúng 30 phút được chấp nhận.
    const nearbySlotRefs = getNearbySlotIds(formData.date, bookingTime)
      .map((nearbySlotId) => doc(firestoreDb, 'bookingSlots', nearbySlotId));
    const nearbySlotSnapshots = await Promise.all(
      nearbySlotRefs.map((nearbySlotRef) => transaction.get(nearbySlotRef)),
    );

    const candidateMinute = timeToMinutes(bookingTime);
    const occupiedMinutes = [candidateMinute];

    nearbySlotSnapshots.forEach((snapshot) => {
      if (!snapshot.exists()) return;
      const slot = snapshot.data();
      const bookingCodes = Array.isArray(slot.booking_codes)
        ? slot.booking_codes
        : (slot.booking_code ? [slot.booking_code] : []);
      const startMinute = timeToMinutes(slot.booking_time);
      bookingCodes.forEach(() => occupiedMinutes.push(startMinute));
    });

    occupiedMinutes.sort((left, right) => left - right);
    const exceedsCapacity = occupiedMinutes.some((minute, index) => (
      index >= BOOKING_CAPACITY_PER_WINDOW
      && minute - occupiedMinutes[index - BOOKING_CAPACITY_PER_WINDOW] < BOOKING_MIN_GAP_MINUTES
    ));

    if (exceedsCapacity) {
      throw new BookingConflictError();
    }

    const currentSlotSnapshot = nearbySlotSnapshots.find(
      (snapshot) => snapshot.ref.id === slotId,
    );
    const currentSlot = currentSlotSnapshot?.exists() ? currentSlotSnapshot.data() : null;
    const currentBookingCodes = currentSlot
      ? (Array.isArray(currentSlot.booking_codes)
          ? currentSlot.booking_codes
          : [currentSlot.booking_code].filter(Boolean))
      : [];

    transaction.set(bookingRef, {
      ...booking,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      confirmed_at: null,
    });

    transaction.set(slotRef, {
      slot_id: slotId,
      booking_codes: [...currentBookingCodes, bookingCode],
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: 'HELD',
      created_at: currentSlot?.created_at || serverTimestamp(),
      updated_at: serverTimestamp(),
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

export async function checkStoredBookingExists(booking) {
  const bookingCode = String(booking?.booking_code || '').trim().toUpperCase();
  const lookupKey = String(booking?.lookup_key || '').trim().toLowerCase();

  if (!/^ATN-[0-9]{6}-[A-Z0-9]{8}$/.test(bookingCode)) return false;
  if (!/^[a-f0-9]{64}$/.test(lookupKey)) return null;

  try {
    const response = await fetch('/api/check-booking-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingCode, lookupKey }),
      cache: 'no-store',
    });

    if (response.ok) {
      const result = await response.json();
      return result.exists === true;
    }
  } catch {
    // `npm run dev` không chạy Vercel API. Sẽ thử document public ở dưới.
  }

  // Fallback khi chạy local hoặc API tạm thời không sẵn sàng. Không cần mở quyền
  // đọc collection bookings và không xóa local nếu Firebase cũng không truy cập được.
  if (!firestoreDb) return null;

  try {
    const publicSnapshot = await getDoc(
      doc(firestoreDb, 'bookingPublic', lookupKey),
    );
    return publicSnapshot.exists();
  } catch {
    return null;
  }
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
  let current;

  await runTransaction(firestoreDb, async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists()) throw new Error('Không tìm thấy booking.');

    current = { id: bookingSnap.id, ...bookingSnap.data() };
    let slotSnapshot = null;
    let slotRef = null;

    if (status === BOOKING_STATUS.CANCELLED && current.slot_id) {
      slotRef = doc(firestoreDb, 'bookingSlots', current.slot_id);
      slotSnapshot = await transaction.get(slotRef);
    }

    const patch = {
      status,
      updated_at: serverTimestamp(),
    };

    if (status === BOOKING_STATUS.CONFIRMED) {
      patch.confirmed_at = serverTimestamp();
    }

    transaction.update(bookingRef, patch);

    if (current.lookup_key) {
      transaction.set(
        doc(firestoreDb, 'bookingPublic', current.lookup_key),
        { status, updated_at: serverTimestamp() },
        { merge: true },
      );
    }

    // Hủy lịch -> chỉ gỡ mã này khỏi slot. Transaction tránh ghi đè nếu đúng lúc
    // một khách khác đang được thêm vào cùng mốc giờ.
    if (slotRef && slotSnapshot?.exists()) {
      const slotData = slotSnapshot.data();
      const bookingCodes = Array.isArray(slotData.booking_codes)
        ? slotData.booking_codes
        : [slotData.booking_code].filter(Boolean);
      const remainingCodes = bookingCodes.filter((code) => code !== current.booking_code);

      if (remainingCodes.length > 0) {
        transaction.set(slotRef, {
          slot_id: current.slot_id,
          booking_codes: remainingCodes,
          booking_date: current.booking_date,
          booking_time: current.booking_time,
          status: 'HELD',
          created_at: slotData.created_at,
          updated_at: serverTimestamp(),
        });
      } else {
        transaction.delete(slotRef);
      }
    }
  });

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
