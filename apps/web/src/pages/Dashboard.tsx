import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';
import { StatCard } from '../components/common/StatCard';

export function Dashboard() {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    useEffect(() => {
        apiFetch<any[]>('/api/candidates')
            .then(setCandidates)
            .catch(() => setCandidates([]));
        apiFetch<any[]>('/api/tests')
            .then(setTests)
            .catch(() => setTests([]));
    }, []);

    const scored = candidates.filter((c) => c.status === 'SCORED').length;
    const flagged = candidates.filter((c) => c.status === 'SUBMITTED').length;
    const activeTests = tests.length;
    const pipeline = useMemo(() => {
        const grouped: Record<string, number> = {};
        candidates.forEach((c) => {
            grouped[c.status] = (grouped[c.status] || 0) + 1;
        });
        return grouped;
    }, [candidates]);

    return (
        <Layout>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Control center</p>
                        <h1 className="text-2xl font-semibold text-slate-900">Assessment performance</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/tests" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Create test</Link>
                        <Link to="/review" className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600">Review queue</Link>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard label="Active tests" value={activeTests} hint="Live and draft" />
                    <StatCard label="Candidates" value={candidates.length} hint="Rolling 30d" />
                    <StatCard label="Scored" value={scored} hint="Completed scoring" />
                    <StatCard label="Needs review" value={flagged} tone="warning" hint="Flagged or pending" />
                </div>
                <div className="grid gap-4 lg:grid-cols-5">
                    <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">Pipeline by status</p>
                            <span className="text-xs text-slate-500">Live</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                            {['INVITED', 'STARTED', 'SUBMITTED', 'SCORED'].map((status) => (
                                <div key={status} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                                    <p className="text-xs font-medium text-slate-600">{status}</p>
                                    <p className="text-lg font-semibold text-slate-900">{pipeline[status] || 0}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">Latest candidates</p>
                            <Link to="/candidates" className="text-xs font-semibold text-blue-600">View all</Link>
                        </div>
                        <div className="mt-3 space-y-2">
                            {candidates.slice(0, 5).map((c) => (
                                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                                        <p className="text-xs text-slate-500">{c.email}</p>
                                    </div>
                                    <Badge tone={c.status === 'SCORED' ? 'success' : c.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{c.status}</Badge>
                                </div>
                            ))}
                            {candidates.length === 0 && <EmptyState title="No candidates yet" description="Invite candidates to start seeing activity." />}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
