import { useEffect, useState } from 'react';
import { BarChart, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';

export function AdminAnalyticsPage() {
    const [data, setData] = useState<{ date: string; amount: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch<any[]>('/api/admin/analytics/usage')
            .then((res) => setData(res))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const maxAmount = Math.max(...data.map(d => d.amount), 10);

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Usage Analytics</h1>
                <p className="text-slate-500">Credit consumption trends over the last 30 days.</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">Total Credit Consumption</h2>
                        <p className="text-sm text-slate-500">Aggregated from all active organizations</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                        <TrendingUp size={16} />
                        <span>{data.reduce((acc, curr) => acc + curr.amount, 0)} Total Credits</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center text-slate-400">Loading data...</div>
                ) : data.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-slate-400">No usage data available for this period.</div>
                ) : (
                    <div className="mt-8 flex h-64 items-end gap-2 border-b border-slate-100 pb-2">
                        {data.map((d) => {
                            const heightPercent = Math.max((d.amount / maxAmount) * 100, 5); // Min 5% height
                            return (
                                <div key={d.date} className="relative group flex-1 flex flex-col items-center gap-2">
                                    <div
                                        className="w-full max-w-[40px] rounded-t-sm bg-blue-500 transition-all hover:bg-blue-600"
                                        style={{ height: `${heightPercent}%` }}
                                    ></div>
                                    <div className="absolute bottom-full mb-2 hidden rounded bg-slate-800 px-2 py-1 text-xs text-white shadow-lg group-hover:block z-10">
                                        <div className="font-semibold">{d.amount} credits</div>
                                        <div className="text-slate-300">{d.date}</div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 rotate-[-45deg] origin-top-left translate-y-4 whitespace-nowrap">
                                        {d.date.slice(5)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
