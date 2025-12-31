import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { Layout } from '../components/common/Layout';

export function ReviewQueue() {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        apiFetch<any[]>('/api/candidates/review/flags')
            .then(setItems)
            .catch(() => setItems([]));
    }, []);

    return (
        <Layout>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Quality & trust</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Review queue</h1>
                </div>
                <Badge tone="warning">{items.length} flagged</Badge>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Flagged responses</p>
                    <p className="text-xs text-slate-500">Low confidence or policy triggers</p>
                </div>
                <div className="mt-3 space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{item.candidate?.name}</p>
                                    <p className="text-xs text-slate-500">{item.question?.prompt}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge tone="warning">{item.flaggedReason || 'Low confidence'}</Badge>
                                    <Badge tone="neutral">Conf: {item.confidence ?? '—'}</Badge>
                                    {item.signedUrl && (
                                        <a href={item.signedUrl} className="text-xs font-semibold text-blue-600 underline" target="_blank" rel="noreferrer">Listen</a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <EmptyState title="No flags" description="New flags will appear here when responses need review." />}
                </div>
            </div>
        </Layout>
    );
}
