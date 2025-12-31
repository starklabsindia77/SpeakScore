import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';
import { formatDate } from '../utils/date';

export function BatchesPage() {
    const [batches, setBatches] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        apiFetch<any[]>('/api/batches').then(setBatches).catch(() => setBatches([]));
    }, []);

    async function createBatch() {
        if (!name.trim()) return;
        const created = await apiFetch<any>('/api/batches', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
        setBatches((prev) => [created, ...prev]);
        setName('');
        setDescription('');
    }

    return (
        <Layout>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Logistics</p>
                        <h1 className="text-2xl font-semibold text-slate-900">Candidate Batches</h1>
                    </div>
                    <button onClick={createBatch} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Create batch</button>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">New batch</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Batch Name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend Leads Jan 2026" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Description</label>
                            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {batches.map((b) => (
                        <Link key={b.id} to={`/batches/${b.id}`} className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-semibold text-slate-900">{b.name}</p>
                                <Badge tone="neutral">Active</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{b.description || 'No description provided'}</p>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                <span>Created: {formatDate(b.createdAt)}</span>
                                <span className="font-semibold text-blue-600 group-hover:underline">Manage candidates →</span>
                            </div>
                        </Link>
                    ))}
                    {batches.length === 0 && <div className="md:col-span-2 lg:col-span-3"><EmptyState title="No batches yet" description="Create a batch to start organizing your candidates." /></div>}
                </div>
            </div>
        </Layout>
    );
}
