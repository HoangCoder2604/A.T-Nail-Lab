import { salon } from '../data/salon.js';

const LAST_BOOKING_KEY = 'at-nail-last-booking';
const BOOKING_HISTORY_KEY = 'at-nail-booking-history';

function formatDate(value = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
}

function bookingDetails(booking) {
  return [
    `Mã lịch: ${booking.booking_code}`,
    `Dịch vụ: ${booking.service}`,
    `Thời gian: ${String(booking.booking_time || '').slice(0, 5)} ngày ${formatDate(booking.booking_date)}`,
  ];
}

export function buildBookingShareText(booking) {
  return [
    '💅 A.T NAIL LAB - YÊU CẦU ĐẶT LỊCH',
    '',
    `Mã lịch: ${booking.booking_code}`,
    `Khách hàng: ${booking.customer_name}`,
    `Số điện thoại: ${booking.phone}`,
    `Dịch vụ: ${booking.service}`,
    `Ngày: ${formatDate(booking.booking_date)}`,
    `Giờ: ${String(booking.booking_time || '').slice(0, 5)}`,
    `Ghi chú: ${booking.note || 'Không có'}`,
    '',
    'Mình đã đặt lịch trên website. Nhờ A.T Nail Lab kiểm tra và xác nhận giúp mình nha 💕',
  ].join('\n');
}

export function buildAdminStatusReply(booking, status) {
  const details = bookingDetails(booking);

  if (status === 'CONFIRMED') {
    return [
      '💅 A.T Nail Lab xác nhận lịch của bạn nhé!',
      '',
      ...details,
      '',
      `Hẹn bạn tại: ${salon.address}`,
      `Google Maps: ${salon.mapsUrl}`,
      '',
      'Hẹn gặp bạn tại A.T Nail Lab nha 💕',
    ].join('\n');
  }

  if (status === 'CANCELLED') {
    return [
      '💅 A.T Nail Lab rất tiếc, lịch này hiện chưa thể xác nhận.',
      '',
      ...details,
      '',
      'Bạn vui lòng chọn khung giờ khác hoặc nhắn lại để A.T Nail Lab hỗ trợ nhé 💕',
    ].join('\n');
  }

  if (status === 'COMPLETED') {
    return [
      '💅 Cảm ơn bạn đã ghé A.T Nail Lab!',
      '',
      ...details,
      '',
      'Hy vọng bạn hài lòng với bộ móng mới. Hẹn gặp lại bạn trong lần tiếp theo nha 💕',
    ].join('\n');
  }

  return '';
}

function copyWithSelection(text) {
  if (typeof document === 'undefined') return false;

  let textarea;
  try {
    textarea = document.createElement('textarea');
    textarea.value = String(text || '');
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea?.remove();
  }
}

export async function copyBookingText(text) {
  const value = String(text || '');
  const clipboardPromise = typeof navigator !== 'undefined' && navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(value).then(() => true).catch(() => false)
    : Promise.resolve(false);

  // Chạy fallback đồng bộ ngay trong thao tác chạm/click. Mobile thường thu hồi
  // quyền clipboard ngay sau khi code đi qua một lệnh await.
  const selectionCopied = copyWithSelection(value);
  const clipboardCopied = await clipboardPromise;
  return clipboardCopied || selectionCopied;
}

export function saveLastBooking(booking) {
  try {
    const savedBooking = {
      ...booking,
      savedAt: new Date().toISOString(),
    };
    const history = readSavedBookings()
      .filter((item) => item.booking_code !== booking.booking_code);
    localStorage.setItem(
      BOOKING_HISTORY_KEY,
      JSON.stringify([savedBooking, ...history]),
    );
    localStorage.removeItem(LAST_BOOKING_KEY);
  } catch {
    // Trình duyệt có thể chặn localStorage; booking trên Firebase vẫn không bị ảnh hưởng.
  }
}

export function isBookingExpired(booking, now = Date.now()) {
  const date = String(booking?.booking_date || '');
  const time = String(booking?.booking_time || '').slice(0, 5);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) return false;

  const bookingTime = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  ).getTime();

  return Number.isFinite(bookingTime) && bookingTime <= now;
}

function isValidSavedBooking(booking) {
  return /^ATN-[0-9]{6}-[A-Z0-9]{8}$/.test(booking?.booking_code || '');
}

function sortSavedBookings(bookings) {
  return [...bookings].sort((left, right) => {
    const leftTime = `${left.booking_date || ''}T${left.booking_time || ''}`;
    const rightTime = `${right.booking_date || ''}T${right.booking_time || ''}`;
    return leftTime.localeCompare(rightTime);
  });
}

export function replaceSavedBookings(bookings) {
  try {
    const normalized = sortSavedBookings(
      (Array.isArray(bookings) ? bookings : [])
        .filter(isValidSavedBooking)
        .filter((booking) => !isBookingExpired(booking)),
    );
    localStorage.setItem(BOOKING_HISTORY_KEY, JSON.stringify(normalized));
    localStorage.removeItem(LAST_BOOKING_KEY);
    return normalized;
  } catch {
    return [];
  }
}

export function readSavedBookings() {
  try {
    const history = JSON.parse(localStorage.getItem(BOOKING_HISTORY_KEY) || 'null');
    const legacyBooking = JSON.parse(localStorage.getItem(LAST_BOOKING_KEY) || 'null');
    const source = Array.isArray(history)
      ? history
      : (isValidSavedBooking(legacyBooking) ? [legacyBooking] : []);
    const seen = new Set();
    const normalized = sortSavedBookings(source.filter((booking) => {
      if (!isValidSavedBooking(booking) || isBookingExpired(booking)) return false;
      if (seen.has(booking.booking_code)) return false;
      seen.add(booking.booking_code);
      return true;
    }));

    localStorage.setItem(BOOKING_HISTORY_KEY, JSON.stringify(normalized));
    localStorage.removeItem(LAST_BOOKING_KEY);
    return normalized;
  } catch {
    return [];
  }
}

export function removeSavedBooking(bookingCode) {
  return replaceSavedBookings(
    readSavedBookings().filter((booking) => booking.booking_code !== bookingCode),
  );
}

// Giữ lại API cũ để dữ liệu hoặc component cũ không bị lỗi khi nâng cấp.
export function readLastBooking() {
  return readSavedBookings()[0] || null;
}

export function clearLastBooking() {
  try {
    localStorage.removeItem(BOOKING_HISTORY_KEY);
    localStorage.removeItem(LAST_BOOKING_KEY);
  } catch {
    // Không cần làm gì nếu trình duyệt chặn localStorage.
  }
}
