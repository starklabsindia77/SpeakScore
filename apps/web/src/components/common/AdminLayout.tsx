import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { Badge } from './Badge';

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="border-b bg-white/90 px-4 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/admin/orgs" className="text-lg font-semibold text-blue-700">SpeakScore Admin</Link>
                        <Badge tone="danger">SUPER ADMIN</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-700">
                        {user && <span className="text-xs text-slate-500">{user.email}</span>}
                        <button onClick={handleLogout} className="text-xs font-semibold text-blue-700 underline">Sign out</button>
                    </div>
                </div>
                <div className="mx-auto mt-2 flex max-w-6xl gap-3 text-sm font-semibold text-slate-600">
                    <NavLink to="/admin/orgs" className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
                        Organizations
                    </NavLink>
                    <NavLink to="/admin/logs" className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
                        Platform logs
                    </NavLink>
                    <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
                        Settings
                    </NavLink>
                </div>
            </header>
            <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
        </div>
    );
}
