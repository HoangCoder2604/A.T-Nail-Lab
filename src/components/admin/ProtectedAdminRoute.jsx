import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAdminSession } from '../../services/bookingService';

export default function ProtectedAdminRoute({ children }) {
  const [state, setState] = useState({ loading: true, allowed: false });

  useEffect(() => {
    let active = true;
    getAdminSession().then((session) => {
      if (active) setState({ loading: false, allowed: Boolean(session) });
    });
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="admin-route-loading">Đang kiểm tra quyền truy cập...</div>;
  if (!state.allowed) return <Navigate to="/admin/login" replace />;
  return children;
}
