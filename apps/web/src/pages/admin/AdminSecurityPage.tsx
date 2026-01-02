import { useEffect, useState } from 'react';
import { Shield, Search, UserX, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../utils/date';

interface SecurityUser {
    id: string;
    email: string;
    role: string;
    orgId: string;
    orgName: string;
    token_version: number;
    created_at: string;
}

export function AdminSecurityPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<SecurityUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    async function loadUsers(email?: string) {
        setLoading(true);
        try {
            const url = email ? `/api/admin/security/users?email=${encodeURIComponent(email)}` : '/api/admin/security/users';
            const data = await apiFetch<SecurityUser[]>(url);
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleRevoke(orgId: string, userId: string) {
        if (!confirm('Are you sure you want to revoke all active sessions for this user? They will be logged out immediately.')) return;

        setRevokingId(userId);
        try {
            await apiFetch(`/api/admin/security/users/${orgId}/${userId}/revoke`, { method: 'POST' });
            // Refresh local state or just increment version
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, token_version: u.token_version + 1 } : u));
        } catch (err) {
            alert('Failed to revoke sessions');
        } finally {
            setRevokingId(null);
        }
    }

    return (
        <AdminLayout>
            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 border-b pb-1">Platform Security</h1>
                        <p className="text-slate-500 mt-1">Manage global user sessions and security settings across all organizations.</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Search Header */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">Global User Search</h2>
                            <Badge tone="neutral">{users.length} Users Found</Badge>
                        </div>
                        <div className="relative flex-1 min-w-[300px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search user by email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadUsers(searchTerm)}
                                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => loadUsers(searchTerm)}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : 'Search'}
                        </button>
                    </div>
                </div>

                {/* User Table */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xl shadow-slate-200/20">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">User / Email</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Organization</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest">Token Ver.</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">{u.email}</div>
                                            <div className="text-xs text-slate-400">{u.id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-700">{u.orgName}</div>
                                            <div className="text-xs text-slate-400">{u.orgId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge tone={u.role === 'ORG_ADMIN' ? 'success' : 'neutral'}>
                                                {u.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                            v{u.token_version}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleRevoke(u.orgId, u.id)}
                                                disabled={revokingId === u.id}
                                                className="inline-flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                                                title="Revoke all active sessions"
                                            >
                                                {revokingId === u.id ? <RefreshCw className="animate-spin" size={14} /> : <UserX size={14} />}
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-sm text-slate-400 italic">
                                        {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found in active organizations.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Privacy & Alerts Section */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="text-blue-600" size={24} />
                            <h3 className="font-bold text-slate-900">Security Insights</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Revoking a user's session increments their security token version.
                            This action immediately invalidates all active JWTs for that user, requiring them to log in again on all devices.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-amber-600" size={24} />
                            <h3 className="font-bold text-slate-900">Data Privacy (GDPR)</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            Access data anonymization tools to handle "Right to be Forgotten" requests across multi-tenant schemas.
                        </p>
                        <button disabled className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-2 rounded-lg opacity-50 cursor-not-allowed">
                            Configure Anonymization Policy
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
