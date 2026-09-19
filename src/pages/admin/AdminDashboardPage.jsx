import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BookingTable from '../../components/admin/BookingTable';
import {
  BOOKING_STATUS,
  listBookings,
  signOutAdmin,
  subscribeBookings,
  updateBookingStatus,
} from '../../services/bookingService';
import {
  enableAdminPushNotifications,
  getAdminPushState,
  showForegroundPush,
  subscribeForegroundPush,
  syncAdminPushTokenIfAllowed,
} from '../../services/adminNotificationService';

const notificationLabels = {
  loading: 'Đang kiểm tra…',
  default: 'Bật thông báo',
  granted: 'Đã bật thông báo',
  denied: 'Thông báo bị chặn',
  unsupported: 'Không hỗ trợ thông báo',
  'missing-vapid': 'Thông báo chưa sẵn sàng',
};

function playBookingChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 760;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.34);
    oscillator.addEventListener('ended', () => context.close());
  } catch {
    // Trình duyệt có thể chặn âm thanh trước khi admin tương tác với trang.
  }
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedBookingCode = (searchParams.get('booking') || '').toUpperCase();
  const firstRealtimeSnapshot = useRef(true);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState(focusedBookingCode);
  const [date, setDate] = useState('');
  const [notice, setNotice] = useState('');
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [realtimeState, setRealtimeState] = useState('connecting');
  const [pushState, setPushState] = useState({ state: 'loading', label: 'Đang kiểm tra push…' });
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeBookings(
      (items, added) => {
        setBookings(items);
        setLoading(false);
        setRealtimeState('live');

        if (firstRealtimeSnapshot.current) {
          firstRealtimeSnapshot.current = false;
          return;
        }

        const realNewBookings = added.filter((item) => item.status === BOOKING_STATUS.PENDING);
        if (realNewBookings.length) {
          setNewBookingCount((current) => current + realNewBookings.length);
          const latest = realNewBookings[realNewBookings.length - 1];
          setNotice(`🔔 Có lịch mới: ${latest.customer_name} • ${latest.booking_date} lúc ${latest.booking_time}`);
          playBookingChime();
        }
      },
      (error) => {
        setRealtimeState('error');
        setLoading(false);
        setNotice('Kết nối bị gián đoạn. Vui lòng thử làm mới trang.');
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeMessage = () => {};

    (async () => {
      const state = await getAdminPushState();
      if (!cancelled) setPushState(state);

      if (state.state === 'granted') {
        try {
          await syncAdminPushTokenIfAllowed();
        } catch {
          // Local Vite không chạy Vercel /api. Không làm dashboard realtime bị lỗi.
        }
      }

      unsubscribeMessage = await subscribeForegroundPush(async (payload) => {
        if (cancelled) return;
        const data = payload?.data || {};
        setNotice(data.body ? `🔔 ${data.body}` : '🔔 Có lịch hẹn mới từ website.');
        await showForegroundPush(payload).catch(() => {});
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeMessage?.();
    };
  }, []);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === BOOKING_STATUS.PENDING).length,
    confirmed: bookings.filter((b) => b.status === BOOKING_STATUS.CONFIRMED).length,
    completed: bookings.filter((b) => b.status === BOOKING_STATUS.COMPLETED).length,
  }), [bookings]);

  const filtered = useMemo(() => bookings.filter((booking) => {
    const matchesStatus = filter === 'ALL' || booking.status === filter;
    const haystack = `${booking.customer_name} ${booking.phone} ${booking.booking_code} ${booking.service}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesDate = !date || booking.booking_date === date;
    return matchesStatus && matchesQuery && matchesDate;
  }), [bookings, filter, query, date]);

  const refresh = async () => {
    setLoading(true);
    try {
      setBookings(await listBookings());
      setNotice('Đã cập nhật danh sách lịch hẹn.');
    } catch (error) {
      setNotice('Không tải được danh sách lịch hẹn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const enablePush = async () => {
    setPushBusy(true);
    setNotice('');
    try {
      const result = await enableAdminPushNotifications();
      setPushState(result);
      setNotice('🔔 Đã bật thông báo lịch hẹn mới trên thiết bị này.');
    } catch (error) {
      setPushState(await getAdminPushState());
      setNotice('Không thể bật thông báo trên thiết bị này.');
    } finally {
      setPushBusy(false);
    }
  };

  const showNewBookings = () => {
    setFilter(BOOKING_STATUS.PENDING);
    setQuery('');
    setDate('');
    setNewBookingCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeStatus = async (booking, status) => {
    setBusyId(booking.id);
    setNotice('');

    try {
      const updated = await updateBookingStatus(booking.id, status);

      // onSnapshot sẽ cập nhật lại danh sách; update local ngay để UI phản hồi tức thì.
      setBookings((current) => current.map((item) => item.id === booking.id ? updated : item));

      setNotice('Đã cập nhật trạng thái lịch hẹn. Bạn có thể phản hồi khách trực tiếp trên Messenger.');
    } catch (error) {
      setNotice('Không cập nhật được lịch hẹn. Vui lòng thử lại.');
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  };

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo">A.T <span>NAIL LAB</span></div>
        <nav>
          <a className="active" href="#bookings"><CalendarDays size={17} /> Lịch hẹn</a>
          <a href="/" target="_blank" rel="noreferrer"><Sparkles size={17} /> Xem website</a>
        </nav>
        <button onClick={logout}><LogOut size={17} /> Đăng xuất</button>
      </aside>

      <section className="admin-content" id="bookings">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">A.T NAIL LAB</p>
            <h1>Quản lý lịch hẹn</h1>
            <p>Theo dõi và cập nhật lịch khách đặt từ website.</p>
          </div>

          <div className="admin-topbar-actions">
            <span className={`admin-live ${realtimeState}`}>
              <Radio size={14} /> {realtimeState === 'live' ? 'Đang cập nhật' : realtimeState === 'error' ? 'Mất kết nối' : 'Đang kết nối'}
            </span>
            <button className="admin-refresh" onClick={refresh}><RefreshCw size={16} /> Làm mới</button>
          </div>
        </header>

        <div className="admin-notification-toolbar">
          <button
            className={`admin-push-button push-${pushState.state}`}
            onClick={enablePush}
            disabled={pushBusy || pushState.state === 'unsupported' || pushState.state === 'denied'}
          >
            {pushState.state === 'granted' ? <BellRing size={17} /> : <Bell size={17} />}
            {pushBusy ? 'Đang bật…' : (notificationLabels[pushState.state] || 'Bật thông báo')}
          </button>

          <button className="admin-new-bookings" onClick={showNewBookings}>
            <Bell size={17} /> Lịch chờ xác nhận
            <strong>{newBookingCount || stats.pending}</strong>
          </button>
        </div>

        <div className="admin-push-help">
          Danh sách sẽ tự cập nhật khi có lịch mới. Bạn có thể bật thông báo trên từng thiết bị muốn sử dụng.
        </div>

        {notice && <div className="admin-notice">{notice}</div>}

        <div className="admin-stats">
          <div><CalendarDays /><span>Tổng lịch hẹn</span><strong>{stats.total}</strong></div>
          <div><Clock3 /><span>Chờ xác nhận</span><strong>{stats.pending}</strong></div>
          <div><CheckCircle2 /><span>Đã xác nhận</span><strong>{stats.confirmed}</strong></div>
          <div><Sparkles /><span>Hoàn thành</span><strong>{stats.completed}</strong></div>
        </div>

        <div className="admin-filters">
          <label className="admin-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên, SĐT, mã đặt lịch..." /></label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {loading
          ? <div className="admin-loading">Đang tải lịch hẹn...</div>
          : <BookingTable bookings={filtered} onStatusChange={changeStatus} busyId={busyId} focusedId={focusedBookingCode} />}
      </section>
    </main>
  );
}
