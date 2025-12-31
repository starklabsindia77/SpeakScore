import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Badge } from '../../components/common/Badge';
import { OrgStatusBadge } from '../../components/common/OrgStatusBadge';
import { AdminOrg } from '../../types';
import { formatDate } from '../../utils/date';

export function AdminOrganizationsPage() {
    const [orgs, setOrgs] = useState<AdminOrg[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<AdminOrg | null>(null);
    const [creditsInput, setCreditsInput] = useState(10);
    const [note, setNote] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newOrg, setNewOrg] = useState({
        name: '',
        schemaName: '',
        creditsBalance: 100,
        adminEmail: '',
        adminPassword: ''
    });

    async function loadOrgs() {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch<{ items: AdminOrg[] }>('/api/admin/orgs');
            setOrgs(res.items);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrgs();
    }, []);

    async function toggleStatus(org: AdminOrg) {
        const nextStatus = org.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
        const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
        });
        setOrgs((prev) => prev.map((item) => (item.id === org.id ? updated : item)));
        if (selectedOrg?.id === org.id) setSelectedOrg(updated);
    }

    async function allocateCredits(org: AdminOrg) {
        if (creditsInput <= 0) return;
        const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/credits`, {
            method: 'POST',
            body: JSON.stringify({ credits: creditsInput, note })
        });
        setOrgs((prev) => prev.map((item) => (item.id === org.id ? updated : item)));
        setSelectedOrg(null);
        setCreditsInput(10);
        setNote('');
    }

    async function handleCreateOrg(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            const created = await apiFetch<AdminOrg>('/api/admin/orgs', {
                method: 'POST',
                body: JSON.stringify(newOrg)
            });
            setOrgs((prev) => [created, ...prev]);
            setIsCreating(false);
            setNewOrg({
                name: '',
                schemaName: '',
                creditsBalance: 100,
                adminEmail: '',
                adminPassword: ''
            });
        } catch (err: any) {
            setError(err.message);
        }
    }

    return (
        <AdminLayout>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Platform control</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Organizations</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Badge tone="neutral">{orgs.length} orgs</Badge>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                    >
                        Create Organization
                    </button>
                </div>
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <span>Name</span>
                    <span>ID</span>
                    <span>Schema</span>
                    <span className="text-right">Credits</span>
                    <span>Status</span>
                    <span>Created</span>
                    <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading && <p className="px-4 py-3 text-sm text-slate-600">Loading organizations...</p>}
                    {!loading &&
                        orgs.map((org) => (
                            <div key={org.id} className="grid grid-cols-7 items-center px-4 py-3 text-sm">
                                <span className="font-semibold text-slate-900">{org.name}</span>
                                <span className="truncate text-xs text-slate-500">{org.id}</span>
                                <span className="text-xs text-slate-600">{org.schemaName}</span>
                                <span className="text-right font-semibold">{org.creditsBalance}</span>
                                <OrgStatusBadge status={org.status} />
                                <span className="text-xs text-slate-500">{formatDate(org.createdAt)}</span>
                                <div className="flex justify-end gap-2 text-xs font-semibold">
                                    <Link to={`/admin/orgs/${org.id}`} className="text-blue-700">View</Link>
                                    <button onClick={() => toggleStatus(org)} className="text-slate-700 underline">
                                        {org.status === 'DISABLED' ? 'Enable' : 'Disable'}
                                    </button>
                                    <button onClick={() => setSelectedOrg(org)} className="text-blue-700 underline">
                                        Allocate credits
                                    </button>
                                </div>
                            </div>
                        ))}
                    {!loading && orgs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No organizations yet.</p>}
                </div>
            </div>

            {selectedOrg && (
                <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Allocate credits</p>
                                <p className="text-xs text-slate-500">{selectedOrg.name}</p>
                            </div>
                            <button onClick={() => setSelectedOrg(null)} className="text-sm text-slate-500">Close</button>
                        </div>
                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="text-xs font-medium text-slate-700">Credits to add</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={creditsInput}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        setCreditsInput(Number.isFinite(value) ? value : 0);
                                    }}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-700">Note (optional)</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setSelectedOrg(null)} className="text-sm font-semibold text-slate-600">Cancel</button>
                                <button
                                    onClick={() => allocateCredits(selectedOrg)}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                                    disabled={creditsInput <= 0}
                                >
                                    Allocate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCreating && (
                <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-900">Create New Organization</h2>
                            <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-slate-700">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrg} className="mt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Organization Name</label>
                                    <input
                                        required
                                        value={newOrg.name}
                                        onChange={(e) => setNewOrg((prev) => ({ ...prev, name: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="e.g. Acme Corp"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Schema Name (Optional)</label>
                                    <input
                                        value={newOrg.schemaName}
                                        onChange={(e) => setNewOrg((prev) => ({ ...prev, schemaName: e.target.value }))}
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="e.g. acme_corp"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Initial Credits</label>
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={newOrg.creditsBalance}
                                    onChange={(e) => setNewOrg((prev) => ({ ...prev, creditsBalance: parseInt(e.target.value) || 0 }))}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-800">Admin User Account</h3>
                                <div className="mt-3 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700">Admin Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={newOrg.adminEmail}
                                            onChange={(e) => setNewOrg((prev) => ({ ...prev, adminEmail: e.target.value }))}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                            placeholder="admin@acme.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700">Admin Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={newOrg.adminPassword}
                                            onChange={(e) => setNewOrg((prev) => ({ ...prev, adminPassword: e.target.value }))}
                                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                                >
                                    Provision Organization
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
