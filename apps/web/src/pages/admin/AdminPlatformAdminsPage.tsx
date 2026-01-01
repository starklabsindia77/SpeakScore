import { useEffect, useState } from 'react';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { formatDate } from '../../utils/date';

export function AdminPlatformAdminsPage() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', password: '' });

    async function loadAdmins() {
        setLoading(true);
        try {
            const data = await apiFetch<any[]>('/api/admin/admins');
            setAdmins(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAdmins();
    }, []);

    async function handleInvite() {
        try {
            await apiFetch('/api/admin/admins', {
                method: 'POST',
                body: JSON.stringify(inviteData)
            });
            setIsInviting(false);
            setInviteData({ email: '', password: '' });
            loadAdmins();
        } catch (err: any) {
            alert(err.message || 'Failed to invite admin');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to remove this Super Admin? This cannot be undone.')) return;
        try {
            await apiFetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
            setAdmins(admins.filter(a => a.id !== id));
        } catch (err: any) {
            alert(err.message || 'Failed to remove admin');
        }
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Admins</h1>
                    <p className="text-slate-500">Manage users with Super Admin access.</p>
                </div>
                <button
                    onClick={() => setIsInviting(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                    <Plus size={16} />
                    Invite Admin
                </button>
            </div>

            {isInviting && (
                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <h3 className="mb-3 font-semibold text-blue-900">Invite New Super Admin</h3>
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                        <input
                            type="email"
                            placeholder="Email address"
                            value={inviteData.email}
                            onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                            className="rounded-lg border-slate-200 px-3 py-2 text-sm"
                        />
                        <input
                            type="password"
                            placeholder="Password (min 12 chars)"
                            value={inviteData.password}
                            onChange={e => setInviteData({ ...inviteData, password: e.target.value })}
                            className="rounded-lg border-slate-200 px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleInvite}
                                disabled={!inviteData.email || inviteData.password.length < 12}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                Invite
                            </button>
                            <button
                                onClick={() => setIsInviting(false)}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                        <ShieldAlert size={12} />
                        Super Admins have full access to all organizations and system settings.
                    </p>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">Email</th>
                            <th className="px-6 py-3 font-medium">Role</th>
                            <th className="px-6 py-3 font-medium">Joined</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {admins.map((a) => (
                            <tr key={a.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-3 font-medium text-slate-900">{a.email}</td>
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center rounded-md bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                                        SUPER ADMIN
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-500">{formatDate(a.createdAt)}</td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Revoke all active sessions for this admin? They will need to log in again.')) return;
                                                try {
                                                    await apiFetch(`/api/admin/admins/${a.id}/revoke-sessions`, { method: 'POST' });
                                                    alert('Sessions revoked successfully');
                                                } catch (err: any) {
                                                    alert(err.message || 'Failed to revoke sessions');
                                                }
                                            }}
                                            className="text-slate-400 hover:text-orange-600 transition-colors"
                                            title="Revoke All Sessions"
                                        >
                                            <ShieldAlert size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(a.id)}
                                            className="text-slate-400 hover:text-red-600 transition-colors"
                                            title="Remove Admin"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
