import { SYSTEM_PERMISSIONS } from '@speakscore/shared';
import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { Badge } from '../../components/common/Badge';
import { Layout } from '../../components/common/Layout';

export function OrgRolesPage() {
    const [roles, setRoles] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', permissions: [] as string[] });

    async function loadRoles() {
        const res = await apiFetch<any[]>('/api/org/roles');
        setRoles(res);
    }

    useEffect(() => { loadRoles(); }, []);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        await apiFetch('/api/org/roles', { method: 'POST', body: JSON.stringify(newRole) });
        setShowAdd(false);
        setNewRole({ name: '', permissions: [] });
        loadRoles();
    }

    const togglePerm = (p: string) => {
        setNewRole(prev => ({
            ...prev,
            permissions: prev.permissions.includes(p)
                ? prev.permissions.filter(x => x !== p)
                : [...prev.permissions, p]
        }));
    };

    return (
        <Layout>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
                    <p className="text-sm text-slate-500">Define custom terminology and access levels for your team.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                    Create custom role
                </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roles.map(r => (
                    <div key={r.id} className="rounded-xl border bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">{r.name}</h3>
                            {r.is_system && <Badge tone="neutral">System</Badge>}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1">
                            {r.permissions.includes('*') ? (
                                <Badge tone="success">Full Access</Badge>
                            ) : (
                                r.permissions.map((p: string) => <Badge key={p} tone="neutral">{p}</Badge>)
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showAdd && (
                <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-semibold">Create custom role</h2>
                        <form onSubmit={handleAdd} className="mt-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold">Role Name (e.g. Junior Recruiter)</label>
                                <input required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold">Permissions</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {SYSTEM_PERMISSIONS.map(p => (
                                        <label key={p} className="flex items-center gap-2 rounded-lg border p-2 text-xs hover:bg-slate-50">
                                            <input type="checkbox" checked={newRole.permissions.includes(p)} onChange={() => togglePerm(p)} />
                                            {p.replace(/_/g, ' ')}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowAdd(false)} className="text-sm font-semibold text-slate-600">Cancel</button>
                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">Create role</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
