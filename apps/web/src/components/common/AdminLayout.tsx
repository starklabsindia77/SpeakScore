import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, Settings, LogOut, HelpCircle, ShieldAlert, Activity, CreditCard, BarChart3 } from 'lucide-react';
import { useAuth } from '../../auth';
import { Badge } from './Badge';
import { Sidebar } from './Sidebar';

const adminNavItems = [
    { label: 'Dashboard', to: '/admin', icon: Activity },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    { label: 'Billing', to: '/admin/billing', icon: CreditCard },
    { label: 'Organizations', to: '/admin/orgs', icon: Building2 },
    { label: 'Global Questions', to: '/admin/questions', icon: HelpCircle },
    { label: 'Platform Admins', to: '/admin/admins', icon: ShieldAlert },
    { label: 'Platform logs', to: '/admin/logs', icon: FileText },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            <Sidebar
                navItems={adminNavItems}
                title="SpeakScore Admin"
                subtitle="Platform Control"
                logo={
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white font-bold">
                        A
                    </div>
                }
            />

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex items-center justify-between border-b bg-white/90 px-6 py-3 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-semibold text-slate-800">Admin Console</h1>
                        <Badge tone="danger">SUPER ADMIN</Badge>
                    </div>

                    <div className="flex items-center gap-4">
                        {user && <span className="text-sm font-medium text-slate-600">{user.email}</span>}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors"
                        >
                            <LogOut size={16} />
                            <span>Sign out</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6">
                    <div className="mx-auto max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
