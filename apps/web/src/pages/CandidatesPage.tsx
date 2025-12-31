import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';

export function CandidatesPage() {
    const [candidates, setCandidates] = useState<any[]>([]);
    useEffect(() => {
        apiFetch<any[]>('/api/candidates').then(setCandidates).catch(() => setCandidates([]));
    }, []);

    return (
        <Layout>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Talent pipeline</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Candidates</h1>
                </div>
                <Link to="/tests" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Invite candidate</Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {['Name', 'Email', 'Status', 'Score', 'Decision'].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {candidates.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                                <td className="px-4 py-3">
                                    <Badge tone={c.status === 'SCORED' ? 'success' : c.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{c.status}</Badge>
                                </td>
                                <td className="px-4 py-3 text-slate-700">{c.overallScore ?? '—'}</td>
                                <td className="px-4 py-3 text-slate-700">{c.decision ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {candidates.length === 0 && <EmptyState title="No candidates" description="Invite candidates to see them here." />}
            </div>
        </Layout>
    );
}
