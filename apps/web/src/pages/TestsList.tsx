import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';

export function TestsList() {
    const [tests, setTests] = useState<any[]>([]);
    const [name, setName] = useState('Phone screening set');
    const [duration, setDuration] = useState(12);
    const [questionCount, setQuestionCount] = useState(4);

    useEffect(() => {
        apiFetch<any[]>('/api/tests').then(setTests).catch(() => setTests([]));
    }, []);

    async function createTest() {
        const payload = {
            name,
            configJson: { duration, questions: questionCount, adaptive: true, randomizedSections: true, mediaSupport: true }
        };
        const created = await apiFetch<any>('/api/tests', { method: 'POST', body: JSON.stringify(payload) });
        setTests((prev) => [created, ...prev]);
    }

    return (
        <Layout>
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Test builder</p>
                        <h1 className="text-2xl font-semibold text-slate-900">Create and manage assessments</h1>
                    </div>
                    <button onClick={createTest} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Create test</button>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Quick setup</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Duration (min)</label>
                            <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-600">Question count</label>
                            <input type="number" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Adaptive routing, randomized sections, and media prompts are pre-enabled for new tests.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    {tests.map((t) => (
                        <Link key={t.id} to={`/tests/${t.id}`} className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-semibold text-slate-900">{t.name}</p>
                                <Badge tone="neutral">Active</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">Adaptive with media & section randomization</p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                <span>Duration: {t.configJson?.duration ?? duration}m</span>
                                <span>Questions: {t.configJson?.questions ?? questionCount}</span>
                            </div>
                        </Link>
                    ))}
                    {tests.length === 0 && <EmptyState title="No tests yet" description="Create your first test to invite candidates." />}
                </div>
            </div>
        </Layout>
    );
}
