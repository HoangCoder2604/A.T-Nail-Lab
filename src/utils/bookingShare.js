function formatDate(value = '') {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
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

export async function copyBookingText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Tiếp tục dùng phương án tương thích với trình duyệt cũ/chặn Clipboard API.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}
