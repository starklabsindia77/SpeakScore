import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Badge } from '../../components/common/Badge';
import { PlatformLog } from '../../types';
import { formatDate } from '../../utils/date';

export function AdminLogsPage() {
    const [logs, setLogs] = useState<PlatformLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ level: '', orgId: '', fromDate: '', toDate: '' });
    const [error, setError] = useState('');

    async function loadLogs() {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filters.level) params.append('level', filters.level);
            if (filters.orgId) params.append('org_id', filters.orgId);
            if (filters.fromDate) params.append('from_date', filters.fromDate);
            if (filters.toDate) params.append('to_date', filters.toDate);
            const res = await apiFetch<PlatformLog[]>(`/api/admin/logs?${params.toString()}`);
            setLogs(res);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLogs();
    }, []);

    return (
        <AdminLayout>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Visibility</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Platform logs</h1>
                </div>
                <button onClick={loadLogs} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
                    Refresh
                </button>
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-700">Level</label>
                        <select
                            value={filters.level}
                            onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Any</option>
                            <option value="INFO">INFO</option>
                            <option value="WARN">WARN</option>
                            <option value="ERROR">ERROR</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">Org ID</label>
                        <input
                            value={filters.orgId}
                            onChange={(e) => setFilters((prev) => ({ ...prev, orgId: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Optional org filter"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">From</label>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">To</label>
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <button onClick={loadLogs} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">
                        Apply filters
                    </button>
                </div>
                <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {loading && <p className="px-4 py-3 text-sm text-slate-600">Loading logs...</p>}
                    {!loading &&
                        logs.map((log) => (
                            <div key={log.id} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm">
                                <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                                <span><Badge tone={log.level === 'ERROR' ? 'danger' : log.level === 'WARN' ? 'warning' : 'neutral'}>{log.level}</Badge></span>
                                <span className="text-xs font-semibold text-slate-700">{log.source}</span>
                                <span className="text-slate-800">{log.message}</span>
                                <span className="text-xs text-slate-500">{log.orgId || '—'}</span>
                            </div>
                        ))}
                    {!loading && logs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No logs yet.</p>}
                </div>
            </div>
        </AdminLayout>
    );
}
