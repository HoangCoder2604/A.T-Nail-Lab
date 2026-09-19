import { useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Phone, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkBooking } from '../services/bookingService';

const statusLabel = {
  PENDING: 'Đang chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function CheckBookingPage() {
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setLoading(true);
    setMessage('');
    setResult(null);

    try {
      const booking = await checkBooking(data.bookingCode, data.phone);
      if (!booking) {
        setMessage('Không tìm thấy lịch phù hợp. Hãy kiểm tra lại mã đặt lịch và số điện thoại.');
      } else {
        setResult(booking);
      }
    } catch {
      setMessage('Không thể kiểm tra lịch lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lookup-page">
      <div className="lookup-shell">
        <Link to="/" className="lookup-back"><ArrowLeft size={17} /> Về trang chủ</Link>

        <section className="lookup-card">
          <div className="lookup-brand">A.T <span>NAIL LAB</span></div>
          <p className="eyebrow">TRA CỨU LỊCH HẸN</p>
          <h1>Kiểm tra lịch hẹn</h1>
          <p className="lookup-intro">Nhập mã đặt lịch và số điện thoại bạn đã sử dụng.</p>

          <form onSubmit={submit} className="lookup-form">
            <label>Mã đặt lịch<input required name="bookingCode" placeholder="ATN-260919-AB12" /></label>
            <label>Số điện thoại<input required name="phone" inputMode="tel" placeholder="09xx xxx xxx" /></label>
            <button className="btn primary" type="submit" disabled={loading}>
              <Search size={17} /> {loading ? 'Đang kiểm tra...' : 'Kiểm tra lịch'}
            </button>
          </form>

          {message && <p className="lookup-message">{message}</p>}

          {result && (
            <div className="lookup-result">
              <div className={`status-pill status-${result.status.toLowerCase()}`}>
                <CheckCircle2 size={16} /> {statusLabel[result.status] || result.status}
              </div>
              <strong className="lookup-code">{result.booking_code}</strong>
              <div className="lookup-details">
                <div><Sparkles size={17} /><span>Dịch vụ</span><b>{result.service}</b></div>
                <div><CalendarDays size={17} /><span>Ngày</span><b>{result.booking_date}</b></div>
                <div><Clock3 size={17} /><span>Giờ</span><b>{result.booking_time}</b></div>
                <div><Phone size={17} /><span>Khách hàng</span><b>{result.customer_name}</b></div>
              </div>
              {result.note && <p className="lookup-note"><b>Ghi chú:</b> {result.note}</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
