import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, X } from 'lucide-react';
import { salon } from '../data/salon';
import { copyBookingText } from '../utils/bookingShare';

export default function BookingSuccessModal({ booking, onClose }) {
  const [copyState, setCopyState] = useState('');

  useEffect(() => {
    setCopyState('');
  }, [booking?.booking_code]);

  if (!booking) return null;

  const copyAgain = async () => {
    const copied = await copyBookingText(booking.shareText);
    setCopyState(copied ? 'Đã sao chép. Bạn hãy mở Messenger, dán và gửi nhé.' : 'Không thể tự sao chép. Vui lòng thử lại.');
  };

  return (
    <div className="booking-success-backdrop" role="dialog" aria-modal="true" aria-labelledby="booking-success-title">
      <div className="booking-success-card">
        <button className="booking-success-close" type="button" onClick={onClose} aria-label="Đóng">
          <X size={20} />
        </button>

        <div className="booking-success-icon"><CheckCircle2 size={30} /></div>
        <p className="eyebrow">ĐÃ NHẬN YÊU CẦU</p>
        <h3 id="booking-success-title">Đặt lịch thành công 💕</h3>
        <p className="booking-success-lead">
          A.T Nail Lab đã nhận được yêu cầu của bạn. Vui lòng lưu lại mã lịch bên dưới để tiện kiểm tra và trao đổi.
        </p>

        <div className="booking-code-box">
          <span>Mã đặt lịch</span>
          <strong>{booking.booking_code}</strong>
        </div>

        <div className="booking-success-summary">
          <div><span>Dịch vụ</span><b>{booking.service}</b></div>
          <div><span>Ngày</span><b>{booking.booking_date}</b></div>
          <div><span>Giờ</span><b>{booking.booking_time}</b></div>
        </div>

        <div className="booking-success-actions">
          <a className="btn primary" href={salon.messengerUrl} target="_blank" rel="noreferrer">
            Mở Messenger <ExternalLink size={16} />
          </a>
          <button className="btn ghost" type="button" onClick={copyAgain}>
            Sao chép lại <Copy size={16} />
          </button>
        </div>

        <p className="booking-success-note booking-success-instruction">
          {booking.copied ? 'Thông tin đặt lịch đã được sao chép.' : 'Nếu thông tin chưa được sao chép, hãy bấm “Sao chép lại”.'} Khi Messenger mở, hãy <strong>Dán → Gửi</strong> cho A.T Nail Lab. Tiệm sẽ đối chiếu mã lịch và phản hồi cho bạn.
        </p>
        {copyState && <p className="booking-success-note">{copyState}</p>}
      </div>
    </div>
  );
}
