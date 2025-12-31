import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';

export function TestDetail() {
    const { id } = useParams();
    const [test, setTest] = useState<any>();
    const [bulkInput, setBulkInput] = useState('');
    const [bulkLinks, setBulkLinks] = useState<any[]>([]);
    const [linkInfo, setLinkInfo] = useState<{ token: string } | null>(null);
    const [candidateName, setCandidateName] = useState('Alex Candidate');
    const [candidateEmail, setCandidateEmail] = useState('alex@example.com');
    const [batches, setBatches] = useState<any[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');

    useEffect(() => {
        if (id) apiFetch<any>(`/api/tests/${id}`).then(setTest);
        apiFetch<any[]>('/api/batches').then(setBatches).catch(() => setBatches([]));
    }, [id]);

    async function generateLink() {
        if (!id) return;
        const res = await apiFetch<{ token: string }>(`/api/tests/${id}/links`, {
            method: 'POST',
            body: JSON.stringify({ candidateName, candidateEmail })
        });
        setLinkInfo(res);
        apiFetch<any>(`/api/tests/${id}`).then(setTest);
    }

    async function handleBulkInvite() {
        if (!id || !bulkInput.trim()) return;
        const lines = bulkInput.split('\n').filter(l => l.trim());
        const candidates = lines.map(line => {
            const parts = line.split(/[,\t]/);
            return {
                name: parts[0]?.trim() || 'Candidate',
                email: (parts[1] || parts[0])?.trim()
            };
        });

        const res = await apiFetch<any>(`/api/tests/${id}/links/bulk`, {
            method: 'POST',
            body: JSON.stringify({ candidates })
        });
        setBulkLinks(res.invitations);
        setBulkInput('');
        apiFetch<any>(`/api/tests/${id}`).then(setTest);
    }

    async function handleBatchInvite() {
        if (!id || !selectedBatchId) return;
        const batchData = await apiFetch<any>(`/api/batches/${selectedBatchId}`);
        const res = await apiFetch<any>(`/api/tests/${id}/links/bulk`, {
            method: 'POST',
            body: JSON.stringify({ candidates: batchData.candidates })
        });
        setBulkLinks(res.invitations);
        apiFetch<any>(`/api/tests/${id}`).then(setTest);
    }

    return (
        <Layout>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Test details</p>
                    <h1 className="text-2xl font-semibold text-slate-900">{test?.name || 'Test'}</h1>
                </div>
                <Badge tone="neutral">Adaptive + media</Badge>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Invite candidate</h2>
                        <p className="text-sm text-slate-500">Add a single candidate to generate a link.</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <input placeholder="Name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                            <input placeholder="Email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                            <button onClick={generateLink} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Generate link</button>
                        </div>
                        {linkInfo && (
                            <p className="mt-3 text-sm text-slate-700">
                                Link: <span className="font-mono text-blue-700">{`${window.location.origin}/attempt/${linkInfo.token}`}</span>
                            </p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Invite from Batch</h2>
                        <p className="text-sm text-slate-500">Select a pre-configured candidate batch to send invitations.</p>
                        <div className="mt-3 flex gap-3">
                            <select
                                value={selectedBatchId}
                                onChange={(e) => setSelectedBatchId(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">Select a batch...</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.candidates?.length || 0} candidates)</option>)}
                            </select>
                            <button
                                onClick={handleBatchInvite}
                                disabled={!selectedBatchId}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                            >
                                Invite Batch
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Direct Bulk Invite</h2>
                        <p className="text-sm text-slate-500">Paste names and emails (one per line, e.g. "John Doe, john@example.com")</p>
                        <textarea
                            value={bulkInput}
                            onChange={(e) => setBulkInput(e.target.value)}
                            placeholder="Name, email&#10;Name, email"
                            rows={4}
                            className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <button onClick={handleBulkInvite} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">Invite candidates</button>

                        {bulkLinks.length > 0 && (
                            <div className="mt-4 max-h-40 overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Generated Links</p>
                                {bulkLinks.map((inv, idx) => (
                                    <div key={idx} className="text-xs mb-1">
                                        <span className="font-semibold">{inv.name}:</span>
                                        <span className="ml-1 text-blue-700 break-all">{`${window.location.origin}/attempt/${inv.token}`}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">Configuration</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                        <li>Adaptive routing</li>
                        <li>Media-rich prompts</li>
                        <li>Randomized sections</li>
                        <li>Timed sections: enabled</li>
                    </ul>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Candidates</h2>
                    <Badge tone="neutral">{test?.candidates?.length ?? 0} total</Badge>
                </div>
                <div className="mt-3 space-y-2">
                    {test?.candidates?.length ? (
                        test.candidates.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                                    <p className="text-xs text-slate-500">{c.email}</p>
                                </div>
                                <Badge tone={c.status === 'SCORED' ? 'success' : c.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{c.status}</Badge>
                            </div>
                        ))
                    ) : (
                        <EmptyState title="No candidates yet" description="Generate a link to invite your first candidate." />
                    )}
                </div>
            </div>
        </Layout>
    );
}
