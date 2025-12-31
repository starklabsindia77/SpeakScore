import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { Badge } from './Badge';
import { NotificationBell } from './NotificationBell';

const recruiterNav = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Batches', to: '/batches' },
    { label: 'Tests', to: '/tests' },
    { label: 'Candidates', to: '/candidates' },
    { label: 'Review queue', to: '/review' }
];

const orgAdminNav = [
    ...recruiterNav,
    { label: 'Team members', to: '/org/users' },
    { label: 'Roles & Permissions', to: '/org/roles' },
    { label: 'Email Templates', to: '/org/templates' }
];

export function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const activeNav = user?.role === 'ORG_ADMIN' ? orgAdminNav : recruiterNav;

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            <aside className="hidden w-64 border-r bg-white/90 backdrop-blur md:block">
                <div className="flex items-center gap-2 px-6 py-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold">SS</div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">SpeakScore</p>
                        <p className="text-xs text-slate-500">Assessment control</p>
                    </div>
                </div>
                <nav className="mt-4 space-y-1 px-3">
                    {activeNav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 ${isActive ? 'bg-slate-100 text-blue-700' : 'text-slate-700'}`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between">
                        <Link to="/" className="text-lg font-semibold text-blue-700 md:hidden">SpeakScore</Link>
                        <div className="hidden gap-3 text-sm font-medium text-slate-600 md:flex">
                            {/* {activeNav.map((item) => (
                                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
                                    {item.label}
                                </NavLink>
                            ))} */}
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge tone="neutral">Multi-tenant</Badge>
                            <NotificationBell />
                            <Badge tone="warning">Pilot</Badge>
                            {user && <Badge tone={user.role === 'SUPER_ADMIN' ? 'danger' : 'neutral'}>{user.role}</Badge>}
                            {user && (
                                <button onClick={handleLogout} className="text-xs font-semibold text-slate-600 underline hover:text-blue-700">
                                    Sign out
                                </button>
                            )}
                        </div>
                    </div>
                </header>
                <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
            </div>
        </div>
    );
}
