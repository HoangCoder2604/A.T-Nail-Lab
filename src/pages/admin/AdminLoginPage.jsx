import { useState } from 'react';
import { ArrowLeft, LockKeyhole, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signInAdmin } from '../../services/bookingService';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      await signInAdmin(data.email, data.password);
      navigate('/admin', { replace: true });
    } catch {
      setError('Email hoặc mật khẩu chưa đúng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <Link to="/" className="admin-home-link"><ArrowLeft size={17} /> Website A.T Nail Lab</Link>
      <section className="admin-login-card">
        <div className="admin-login-mark"><LockKeyhole size={24} /></div>
        <p className="eyebrow">KHU VỰC QUẢN LÝ</p>
        <h1>Đăng nhập quản trị</h1>
        <p>Dành cho nhân viên A.T Nail Lab được cấp quyền truy cập.</p>

        <form onSubmit={submit} className="admin-login-form">
          <label>Email<input required type="email" name="email" autoComplete="email" placeholder="admin@atnaillab.com" /></label>
          <label>Mật khẩu<input required type="password" name="password" autoComplete="current-password" placeholder="••••••••" /></label>
          <button className="btn primary" type="submit" disabled={loading}>
            <LogIn size={17} /> {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {error && <p className="admin-login-error">{error}</p>}
      </section>
    </main>
  );
}
