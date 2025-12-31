import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { Badge } from '../../components/common/Badge';
import { Layout } from '../../components/common/Layout';
import { formatDate } from '../../utils/date';

export function OrgUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [error, setError] = useState('');
    const [invite, setInvite] = useState({ email: '', role: '', title: '', customRoleId: '' });

    async function loadData() {
        setLoading(true);
        try {
            const [u, r] = await Promise.all([
                apiFetch<any[]>('/api/org/users'),
                apiFetch<any[]>('/api/org/roles')
            ]);
            setUsers(u);
            setRoles(r);
            if (r.length > 0) setInvite(prev => ({ ...prev, role: r[0].name, customRoleId: r[0].id }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadData(); }, []);

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        try {
            await apiFetch('/api/org/users/invite', {
                method: 'POST',
                body: JSON.stringify(invite)
            });
            setShowInvite(false);
            loadData();
        } catch (err: any) {
            setError(err.message);
        }
    }

    return (
        <Layout>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Team members</h1>
                <button
                    onClick={() => setShowInvite(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                    Invite member
                </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="grid grid-cols-4 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>User</span>
                    <span>Role</span>
                    <span>Terminology</span>
                    <span>Joined</span>
                </div>
                <div className="divide-y">
                    {users.map(u => (
                        <div key={u.id} className="grid grid-cols-4 px-6 py-4 text-sm">
                            <span className="font-medium">{u.email}</span>
                            <span><Badge tone="neutral">{u.role}</Badge></span>
                            <span className="text-slate-500">{u.title || '—'}</span>
                            <span className="text-slate-500">{formatDate(u.createdAt)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {showInvite && (
                <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-semibold">Invite new member</h2>
                        <form onSubmit={handleInvite} className="mt-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold">Email address</label>
                                <input required type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold">Role</label>
                                <select
                                    value={invite.customRoleId}
                                    onChange={e => {
                                        const r = roles.find(x => x.id === e.target.value);
                                        setInvite({ ...invite, customRoleId: e.target.value, role: r?.name || '' });
                                    }}
                                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                                >
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold">Terminology (e.g. Senior HR)</label>
                                <input type="text" value={invite.title} onChange={e => setInvite({ ...invite, title: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Optional" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowInvite(false)} className="text-sm font-semibold text-slate-600">Cancel</button>
                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">Send invite</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
