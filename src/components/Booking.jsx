import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { bookingHours, salon } from '../data/salon';
import {
  BookingConflictError,
  createBooking,
  notifyAdminOfNewBooking,
} from '../services/bookingService';
import BookingSuccessModal from './BookingSuccessModal';
import { buildBookingShareText, copyBookingText } from '../utils/bookingShare';

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function prepareMessengerTab() {
  const tab = window.open('', '_blank');
  if (!tab) return null;

  try {
    tab.document.title = 'A.T Nail Lab • Đang mở Messenger';
    tab.document.body.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;background:#f7f3ef;color:#362b27;font-family:system-ui,sans-serif;padding:24px;text-align:center">
        <div>
          <div style="font-family:Georgia,serif;font-size:38px;margin-bottom:10px">A.T Nail Lab</div>
          <p style="margin:0;color:#756d68;line-height:1.7">Đang hoàn tất lịch hẹn của bạn…<br/>Khi Messenger mở, hãy dán thông tin và gửi cho A.T Nail Lab.</p>
        </div>
      </div>`;
  } catch {
    // Một số browser hạn chế thao tác với about:blank; vẫn có thể redirect tab sau đó.
  }

  return tab;
}

export default function Booking() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const minDate = useMemo(todayISO, []);

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot chống bot cơ bản.
    if (data.website) return;

    setLoading(true);
    setStatusType('info');
    setStatus('Đang kiểm tra khung giờ và hoàn tất lịch hẹn…');

    // Mở tab ngay trong user gesture để giảm khả năng Safari/Chrome chặn popup.
    // Tab chỉ được chuyển sang Messenger SAU KHI Firebase commit thành công.
    const messengerTab = prepareMessengerTab();

    try {
      const created = await createBooking(data);

      // Push cho admin là best-effort: booking đã commit vào Firestore trước.
      // Nếu đang chạy `npm run dev`, Vite không có Vercel /api nên lời gọi này
      // có thể không gửi push; dashboard realtime vẫn nhận booking ngay lập tức.
      void notifyAdminOfNewBooking(created.booking_code);

      const shareText = buildBookingShareText(created);
      const copied = await copyBookingText(shareText);

      setBooking({ ...created, shareText, copied });
      setStatusType('success');
      setStatus(
        copied
          ? `Đặt lịch thành công • ${created.booking_code} • Đã sao chép thông tin`
          : `Đặt lịch thành công • ${created.booking_code}`,
      );
      form.reset();

      // Cho modal thành công kịp render trước khi chuyển tab phụ sang Messenger.
      window.setTimeout(() => {
        if (messengerTab && !messengerTab.closed) {
          messengerTab.location.replace(salon.messengerUrl);
        }
      }, 450);
    } catch (error) {
      if (messengerTab && !messengerTab.closed) messengerTab.close();

      if (error instanceof BookingConflictError || error?.code === 'BOOKING_TIME_CONFLICT') {
        setStatusType('error');
        setStatus('Khung giờ này đã có khách đặt. Hãy chọn giờ khác cách ít nhất 30 phút.');
      } else {
        setStatusType('error');
        setStatus('Không thể đặt lịch lúc này. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="booking-section" id="booking">
        <div className="booking-image reveal">
          <img src="/images/salon-brand.jpg" alt="A.T Nail Lab" />
          <div className="booking-image-shade" />
          <div className="booking-image-caption">
            <span>A.T NAIL LAB</span>
            <p>Beauty • Nail • You</p>
          </div>
          <div className="booking-floating-chip">1:1 appointment ✦</div>
        </div>

        <div className="booking-copy reveal">
          <p className="eyebrow">BOOK YOUR APPOINTMENT</p>
          <h2>Đặt lịch trước,<br /><em>thảnh thơi hơn.</em></h2>
          <p className="promo-line"><CalendarDays /> {salon.promo}</p>

          <div className="booking-trust-row">
            <span><CheckCircle2 size={15} /> Xác nhận yêu cầu đặt lịch nhanh chóng</span>
            <span><ShieldCheck size={15} /> Giữ riêng khung giờ bạn đã chọn</span>
          </div>

          <form onSubmit={submit} className="booking-form">
            <input
              className="hp-field"
              tabIndex="-1"
              autoComplete="off"
              name="website"
              aria-hidden="true"
            />

            <div className="form-grid">
              <label>
                Họ và tên
                <input required name="name" placeholder="Tên của bạn" autoComplete="name" />
              </label>

              <label>
                Số điện thoại
                <input
                  required
                  name="phone"
                  inputMode="tel"
                  placeholder="09xx xxx xxx"
                  autoComplete="tel"
                  pattern="[0-9 +()-]{8,20}"
                />
              </label>

              <label>
                Dịch vụ
                <select name="service" defaultValue="Sơn gel">
                  <option>Sơn gel</option>
                  <option>Sơn thạch</option>
                  <option>Mắt mèo</option>
                  <option>Ombre / Tráng gương</option>
                  <option>French</option>
                  <option>Up móng</option>
                  <option>Nail Art / Trang trí</option>
                  <option>Chăm sóc / Cắt da</option>
                </select>
              </label>

              <label>
                Ngày
                <input required name="date" type="date" min={minDate} />
              </label>

              <label>
                Giờ
                <input
                  required
                  name="time"
                  type="time"
                  min={bookingHours.open}
                  max={bookingHours.close}
                  step="1800"
                />
              </label>

              <label className="full">
                Ghi chú
                <textarea
                  name="note"
                  rows="3"
                  maxLength="500"
                  placeholder="Mẫu mong muốn, màu sắc, độ dài móng..."
                />
              </label>
            </div>

            <p className="booking-slot-note">
              Nhận lịch từ {bookingHours.open} đến {bookingHours.close}, mỗi khung giờ cách nhau 30 phút. Nếu giờ bạn chọn đã có khách, vui lòng chọn một giờ khác.
            </p>

            <button className="btn primary full-btn magnetic" type="submit" disabled={loading}>
              {loading
                ? <>Đang đặt lịch… <LoaderCircle size={17} /></>
                : <>Đặt lịch & mở Messenger <MessageCircle size={17} /></>}
            </button>

            {status && (
              <p className={`form-status ${statusType === 'error' ? 'form-status-error' : ''}`}>
                {statusType === 'error'
                  ? <TriangleAlert size={16} />
                  : <CheckCircle2 size={16} />}
                {status}
              </p>
            )}

            <p className="booking-helper-text">
              Thông tin sẽ được tự động sao chép. Khi Messenger mở, bạn chỉ cần dán và gửi cho A.T Nail Lab.
            </p>
          </form>

          <div className="booking-links">
            {salon.phone && <a href={`tel:${salon.phone}`}><Phone size={17} /> {salon.phoneDisplay}</a>}
            <a href={salon.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
            <a href={salon.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </section>

      <BookingSuccessModal booking={booking} onClose={() => setBooking(null)} />
    </>
  );
}
