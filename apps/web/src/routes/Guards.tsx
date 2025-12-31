import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/orgs" replace />;
    return children;
}

export function AdminRoute({ children }: { children: JSX.Element }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/admin/login" replace />;
    if (user.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
    return children;
}
