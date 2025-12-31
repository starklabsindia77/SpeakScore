import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';
import { formatDate } from '../utils/date';

export function BatchDetail() {
    const { id } = useParams();
    const [batch, setBatch] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [candidateName, setCandidateName] = useState('');
    const [candidateEmail, setCandidateEmail] = useState('');
    const [bulkInput, setBulkInput] = useState('');
    const [showBulk, setShowBulk] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [resumeFiles, setResumeFiles] = useState<File[]>([]);

    async function loadBatch() {
        if (!id) return;
        const res = await apiFetch<any>(`/api/batches/${id}`);
        setBatch(res);
        setCandidates(res.candidates || []);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            setResumeFiles(Array.from(e.target.files));
        } else {
            setResumeFiles([]);
        }
    }

    useEffect(() => {
        loadBatch();
    }, [id]);

    async function addCandidate() {
        if (!id || !candidateName || !candidateEmail) return;
        await apiFetch('/api/candidates', {
            method: 'POST',
            body: JSON.stringify({ candidateName, candidateEmail, batchId: id })
        });
        setCandidateName('');
        setCandidateEmail('');
        loadBatch();
    }

    async function handleBulkUpload() {
        if (!id || !bulkInput.trim()) return;
        const lines = bulkInput.split('\n').filter((l) => l.trim());
        const list = lines.map((line) => {
            const parts = line.split(/[,\t]/);
            return { name: parts[0]?.trim(), email: (parts[1] || parts[0])?.trim() };
        });
        await apiFetch('/api/candidates/bulk', {
            method: 'POST',
            body: JSON.stringify({ batchId: id, candidates: list })
        });
        setBulkInput('');
        setShowBulk(false);
        loadBatch();
    }

    async function handleAiParse() {
        if (!bulkInput.trim() && resumeFiles.length === 0) {
            alert('Please paste resume text OR select files.');
            return;
        }
        setIsParsing(true);
        try {
            if (resumeFiles.length > 0) {
                if (!id) return;
                const formData = new FormData();
                formData.append('batchId', id);
                resumeFiles.forEach(f => formData.append('files', f));

                const res = await apiFetch<any>('/api/candidates/import/cv-bulk', {
                    method: 'POST',
                    body: formData
                });

                if (res.success) {
                    alert(`Successfully added ${res.count} candidates from files.`);
                    setResumeFiles([]);
                    setShowBulk(false);
                    loadBatch();
                } else {
                    alert('Partial success or no candidates found.');
                }

            } else {
                const data = await apiFetch<any>('/api/candidates/parse-cv', {
                    method: 'POST',
                    body: JSON.stringify({ text: bulkInput })
                });
                setCandidateName(data.name || '');
                setCandidateEmail(data.email || '');
                setShowBulk(false);
            }
        } catch (e: any) {
            alert('AI Parsing failed: ' + e.message);
        } finally {
            setIsParsing(false);
        }
    }

    if (!batch) return <Layout><p className="py-10 text-center text-slate-500 text-sm">Loading batch details...</p></Layout>;

    return (
        <Layout>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Batch management</p>
                        <h1 className="text-2xl font-semibold text-slate-900">{batch.name}</h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowBulk(!showBulk)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                            {showBulk ? 'Hide Import' : 'Bulk / AI Import'}
                        </button>
                    </div>
                </div>

                {showBulk && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
                        <h2 className="text-sm font-semibold text-blue-900">Bulk Import & AI Parsing</h2>
                        <p className="text-xs text-blue-700">Paste CSV list or Resume text, OR upload files (PDF/DOCX).</p>
                        <textarea
                            value={bulkInput}
                            onChange={(e) => setBulkInput(e.target.value)}
                            rows={5}
                            className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Full Resume Text... OR ... Name, Email"
                        />

                        <div className="mt-3">
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                            />
                            {resumeFiles.length > 0 && <p className="mt-1 text-xs font-medium text-green-600">Selected: {resumeFiles.length} file(s)</p>}
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button disabled={isParsing} onClick={handleBulkUpload} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50">
                                Process as CSV
                            </button>
                            <button disabled={isParsing} onClick={handleAiParse} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50">
                                {isParsing ? 'AI Parsing...' : 'Parse (AI)'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-semibold text-slate-900">Manual Entry</h2>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <input placeholder="Name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                                <input placeholder="Email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                                <button onClick={addCandidate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Add to batch</button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-slate-100 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {candidates.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                                            <td className="px-4 py-3 text-slate-600">{c.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge tone="neutral">IN BATCH</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {candidates.length === 0 && <EmptyState title="No candidates" description="Add candidates to this batch manually or via CSV/CV." />}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Batch Info</h3>
                            <p className="mt-2 text-sm text-slate-600 line-clamp-3">{batch.description || 'No description provided.'}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                                <p className="text-xs text-slate-500">Total Count: <span className="font-semibold text-slate-800">{candidates.length}</span></p>
                                <p className="text-xs text-slate-500">Created: <span className="font-semibold text-slate-800">{formatDate(batch.createdAt)}</span></p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-blue-50 bg-white p-4 shadow-sm ring-1 ring-blue-50">
                            <h3 className="text-sm font-semibold text-blue-900">Next Step</h3>
                            <p className="mt-1 text-xs text-blue-700">Link this batch to an active assessment in the Tests control center.</p>
                            <Link to="/tests" className="mt-3 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">Go to Tests</Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
