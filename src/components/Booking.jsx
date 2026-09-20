import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  LoaderCircle,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { bookingHours, salon } from '../data/salon';
import {
  BookingConflictError,
  checkStoredBookingExists,
  createBooking,
  notifyAdminOfNewBooking,
} from '../services/bookingService';
import BookingSuccessModal from './BookingSuccessModal';
import {
  buildBookingShareText,
  isBookingExpired,
  readSavedBookings,
  removeSavedBooking,
  replaceSavedBookings,
  saveLastBooking,
} from '../utils/bookingShare';

const serviceGroups = [
  {
    label: 'Cơ bản',
    items: [
      'Cắt da + dũa form',
      'Cắt da nam',
      'Cứng móng thường',
      'Cứng móng tạo cầu / fill',
      'Phá sơn gel',
      'Phá móng up / đắp',
      'Che khuyết điểm móng',
    ],
  },
  {
    label: 'Sơn',
    items: ['Sơn gel', 'Sơn thạch', 'Mắt mèo', 'Ombre / Tráng gương', 'French', 'Sơn mix màu'],
  },
  {
    label: 'Up móng',
    items: ['Up móng base', 'Up móng 6in1', 'Dual form', 'Đắp gel', 'Fill up / gel'],
  },
  {
    label: 'Design',
    items: ['Vẽ', 'Ẩn nhũ', 'Đính đá', 'Charm', 'Nặn thú - hoa'],
  },
];

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function Booking() {
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [savedBookings, setSavedBookings] = useState(readSavedBookings);
  const [selectedServices, setSelectedServices] = useState(['Sơn gel']);
  const minDate = useMemo(todayISO, []);
  const savedBookingSignature = savedBookings
    .map((item) => `${item.booking_code}:${item.lookup_key || ''}`)
    .join('|');

  useEffect(() => {
    if (savedBookings.length === 0) return undefined;

    let active = true;
    let checking = false;

    const verifySavedBookings = async () => {
      if (checking) return;
      checking = true;

      try {
        const checks = await Promise.all(savedBookings.map(async (item) => {
          if (isBookingExpired(item)) return { item, keep: false };
          const exists = await checkStoredBookingExists(item);
          return { item, keep: exists !== false };
        }));
        if (!active) return;

        const keptBookings = checks.filter((result) => result.keep).map((result) => result.item);
        if (keptBookings.length === savedBookings.length) return;

        const removedCodes = new Set(
          checks.filter((result) => !result.keep).map((result) => result.item.booking_code),
        );
        const normalized = replaceSavedBookings(keptBookings);
        setSavedBookings(normalized);
        setBooking((current) => (
          removedCodes.has(current?.booking_code) ? null : current
        ));
      } finally {
        checking = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void verifySavedBookings();
    };

    void verifySavedBookings();
    window.addEventListener('focus', verifySavedBookings);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const intervalId = window.setInterval(verifySavedBookings, 30_000);

    return () => {
      active = false;
      window.removeEventListener('focus', verifySavedBookings);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [savedBookingSignature]);

  const removeBookingFromDevice = (bookingCode) => {
    const updated = removeSavedBooking(bookingCode);
    setSavedBookings(updated);
    setBooking((current) => (
      current?.booking_code === bookingCode ? null : current
    ));
  };

  const toggleService = (service) => {
    setSelectedServices((current) => {
      if (current.includes(service)) {
        return current.filter((item) => item !== service);
      }

      setStatus('');
      return [...current, service];
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (selectedServices.length === 0) {
      setStatusType('error');
      setStatus('Vui lòng chọn ít nhất một dịch vụ.');
      return;
    }

    data.service = selectedServices.join(' + ');

    // Honeypot chống bot cơ bản.
    if (data.website) return;

    setLoading(true);
    setStatusType('info');
    setStatus('Đang kiểm tra khung giờ và hoàn tất lịch hẹn…');

    let created;
    try {
      created = await createBooking(data);
    } catch (error) {
      if (error instanceof BookingConflictError || error?.code === 'BOOKING_TIME_CONFLICT') {
        setStatusType('error');
        setStatus('Khoảng thời gian này đã đủ 2 khách. Vui lòng chọn giờ khác.');
      } else if (/^(Vui lòng|A\.T Nail Lab)/.test(error?.message || '')) {
        setStatusType('error');
        setStatus(error.message);
      } else {
        console.error('Booking create failed:', error);
        setStatusType('error');
        setStatus('Không thể đặt lịch lúc này. Vui lòng thử lại.');
      }
      setLoading(false);
      return;
    }

    // Từ đây booking chắc chắn đã được Firebase lưu. Các bước phụ không được phép
    // đổi kết quả thành thất bại nếu clipboard, localStorage hoặc popup bị chặn.
    void notifyAdminOfNewBooking(created.booking_code);

    const shareText = buildBookingShareText(created);
    const savedBooking = { ...created, shareText, copied: false };

    saveLastBooking(savedBooking);
    setSavedBookings(readSavedBookings());
    setBooking(savedBooking);
    setStatusType('success');
    setStatus(`Đặt lịch thành công • ${created.booking_code}`);
    form.reset();
    setSelectedServices(['Sơn gel']);
    setLoading(false);

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
          {savedBookings.length > 0 && (
            <div className="booking-history">
              <div className="booking-history-heading">
                <span>Các lịch đã lưu trên thiết bị này</span>
                <small>Tự động xóa khi đã qua giờ hẹn</small>
              </div>
              <div className="booking-history-list">
                {savedBookings.map((savedBooking) => (
                  <article className="booking-history-item" key={savedBooking.booking_code}>
                    <div>
                      <strong>{savedBooking.booking_code}</strong>
                      <span>{savedBooking.booking_time} • {savedBooking.booking_date}</span>
                    </div>
                    <div className="booking-history-actions">
                      <button type="button" onClick={() => setBooking(savedBooking)}>Xem lại</button>
                      <button
                        className="remove"
                        type="button"
                        onClick={() => removeBookingFromDevice(savedBooking.booking_code)}
                      >
                        Xóa
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="booking-trust-row">
            <span><CheckCircle2 size={15} /> Xác nhận yêu cầu đặt lịch nhanh chóng</span>
            <span><ShieldCheck size={15} /> Mỗi khoảng 30 phút nhận tối đa 2 khách</span>
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

              <fieldset className="service-choices full" aria-label="Dịch vụ">
                <div className="service-choices-title">Dịch vụ</div>
                <p>Bạn có thể chọn một hoặc nhiều dịch vụ.</p>
                {serviceGroups.map((group) => (
                  <div className="service-choice-group" key={group.label}>
                    <strong>{group.label}</strong>
                    <div>
                      {group.items.map((service) => (
                        <label key={service}>
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service)}
                            onChange={() => toggleService(service)}
                          />
                          <span>{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>

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
                  step="60"
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
              Nhận lịch từ {bookingHours.open} đến {bookingHours.close}. Tiệm có 2 thợ nên mỗi khoảng 30 phút có thể nhận tối đa 2 khách.
            </p>

            <button className="btn primary full-btn magnetic" type="submit" disabled={loading}>
              {loading
                ? <>Đang đặt lịch… <LoaderCircle size={17} /></>
                : <>Đặt lịch <CheckCircle2 size={17} /></>}
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
              Sau khi đặt thành công, hãy sao chép thông tin trong hộp thoại rồi chọn Messenger hoặc Instagram để gửi cho A.T Nail Lab.
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
