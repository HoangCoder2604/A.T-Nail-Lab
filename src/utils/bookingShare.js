import { salon } from '../data/salon.js';

const LAST_BOOKING_KEY = 'at-nail-last-booking';

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
    localStorage.setItem(LAST_BOOKING_KEY, JSON.stringify({
      ...booking,
      savedAt: new Date().toISOString(),
    }));
  } catch {
    // Trình duyệt có thể chặn localStorage; booking trên Firebase vẫn không bị ảnh hưởng.
  }
}

export function readLastBooking() {
  try {
    const booking = JSON.parse(localStorage.getItem(LAST_BOOKING_KEY) || 'null');
    return /^ATN-[0-9]{6}-[A-Z0-9]{8}$/.test(booking?.booking_code || '')
      ? booking
      : null;
  } catch {
    return null;
  }
}

export function clearLastBooking() {
  try {
    localStorage.removeItem(LAST_BOOKING_KEY);
  } catch {
    // Không cần làm gì nếu trình duyệt chặn localStorage.
  }
}
