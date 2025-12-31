import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { OrgStatusBadge } from '../../components/common/OrgStatusBadge';
import { AdminOrg } from '../../types';
import { formatDate } from '../../utils/date';

export function AdminOrgDetailPage() {
    const { id } = useParams();
    const [org, setOrg] = useState<AdminOrg | null>(null);
    const [error, setError] = useState('');
    const [creditsInput, setCreditsInput] = useState(5);
    const [note, setNote] = useState('');

    async function loadOrg() {
        if (!id) return;
        setError('');
        try {
            const res = await apiFetch<AdminOrg>(`/api/admin/orgs/${id}`);
            setOrg(res);
        } catch (err: any) {
            setError(err.message);
        }
    }

    useEffect(() => {
        loadOrg();
    }, [id]);

    async function toggleStatus() {
        if (!org) return;
        const nextStatus = org.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
        const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
        });
        setOrg(updated);
    }

    async function allocate() {
        if (!org || creditsInput <= 0) return;
        const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/credits`, {
            method: 'POST',
            body: JSON.stringify({ credits: creditsInput, note })
        });
        setOrg(updated);
        setCreditsInput(5);
        setNote('');
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Organization</p>
                    <h1 className="text-2xl font-semibold text-slate-900">{org?.name || 'Loading...'}</h1>
                </div>
                <Link to="/admin/orgs" className="text-sm font-semibold text-blue-700 underline">Back to list</Link>
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {org && (
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                            <p className="text-xs text-slate-500">{org.id}</p>
                        </div>
                        <OrgStatusBadge status={org.status} />
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-lg bg-slate-50/70 p-3">
                            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Schema</p>
                            <p className="font-semibold text-slate-900">{org.schemaName}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 p-3">
                            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Credits</p>
                            <p className="text-lg font-semibold text-slate-900">{org.creditsBalance}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 p-3">
                            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Created</p>
                            <p className="font-semibold text-slate-900">{formatDate(org.createdAt)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50/70 p-3">
                            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Updated</p>
                            <p className="font-semibold text-slate-900">{formatDate(org.updatedAt)}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={toggleStatus} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
                            {org.status === 'DISABLED' ? 'Enable org' : 'Disable org'}
                        </button>
                        <div className="flex flex-1 flex-col gap-2 rounded-lg border border-slate-100 p-3 md:max-w-md">
                            <label className="text-xs font-semibold text-slate-700">Allocate credits</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    value={creditsInput}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        setCreditsInput(Number.isFinite(value) ? value : 0);
                                    }}
                                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Optional note"
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <button
                                    onClick={allocate}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                                    disabled={creditsInput <= 0}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
