import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Copy, ExternalLink, Instagram, X } from 'lucide-react';
import { Link } from 'react-router-dom';
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
    setCopyState(copied ? 'Đã sao chép. Bây giờ bạn hãy mở Messenger hoặc Instagram, dán và gửi nhé.' : 'Không thể sao chép. Vui lòng thử lại.');
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
          <button className="btn primary" type="button" onClick={copyAgain}>
            {copyState.startsWith('Đã sao chép')
              ? <>Đã sao chép <CheckCircle2 size={16} /></>
              : <>1. Sao chép thông tin <Copy size={16} /></>}
          </button>
          <a className="btn ghost" href={salon.messengerUrl} target="_blank" rel="noreferrer">
            2. Mở Messenger <ExternalLink size={16} />
          </a>
          <a className="btn ghost" href={salon.instagramMessageUrl} target="_blank" rel="noreferrer">
            2. Mở Instagram <Instagram size={16} />
          </a>
          <Link
            className="btn ghost"
            to="/check-booking"
            state={{ booking }}
          >
            Kiểm tra trạng thái <ClipboardCheck size={16} />
          </Link>
        </div>

        <p className="booking-success-note booking-success-instruction">
          <strong>Bước 1:</strong> Bấm “Sao chép thông tin”. <strong>Bước 2:</strong> Mở Messenger hoặc Instagram, sau đó <strong>Dán → Gửi</strong> cho A.T Nail Lab. Tiệm sẽ đối chiếu mã lịch và phản hồi cho bạn.
        </p>
        {copyState && <p className="booking-success-note">{copyState}</p>}
      </div>
    </div>
  );
}
