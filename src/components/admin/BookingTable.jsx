import { Check, CircleX, Sparkles } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { BOOKING_STATUS } from '../../services/bookingService';

export default function BookingTable({ bookings, onStatusChange, busyId, focusedId = '' }) {
  if (!bookings.length) {
    return <div className="admin-empty"><Sparkles size={26} /><p>Không có lịch hẹn phù hợp bộ lọc.</p></div>;
  }

  return (
    <div className="admin-booking-list">
      {bookings.map((booking) => (
        <article
          id={`booking-${booking.id}`}
          className={`admin-booking-card ${focusedId === booking.id ? 'is-focused' : ''}`}
          key={booking.id}
        >
          <div className="admin-booking-main">
            <div>
              <span className="admin-booking-time">{booking.booking_time?.slice(0, 5)}</span>
              <strong>{booking.customer_name}</strong>
              <a href={`tel:${booking.phone}`}>{booking.phone}</a>
            </div>
            <div>
              <span>{booking.booking_date}</span>
              <strong>{booking.service}</strong>
              <small>{booking.booking_code}</small>
            </div>
            <div className="admin-booking-state">
              <StatusBadge status={booking.status} />
            </div>
          </div>

          {booking.note && <p className="admin-booking-note">“{booking.note}”</p>}

          <div className="admin-booking-actions">
            {booking.status === BOOKING_STATUS.PENDING && (
              <button disabled={busyId === booking.id} onClick={() => onStatusChange(booking, BOOKING_STATUS.CONFIRMED)}>
                <Check size={15} /> Xác nhận
              </button>
            )}
            {booking.status === BOOKING_STATUS.CONFIRMED && (
              <button disabled={busyId === booking.id} onClick={() => onStatusChange(booking, BOOKING_STATUS.COMPLETED)}>
                <Check size={15} /> Hoàn thành
              </button>
            )}
            {booking.status !== BOOKING_STATUS.CANCELLED && booking.status !== BOOKING_STATUS.COMPLETED && (
              <button className="danger" disabled={busyId === booking.id} onClick={() => onStatusChange(booking, BOOKING_STATUS.CANCELLED)}>
                <CircleX size={15} /> Hủy lịch
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
