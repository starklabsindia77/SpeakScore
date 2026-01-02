import { useEffect, useState } from 'react';
import { Activity, Database, Server, CheckCircle, AlertTriangle, Users, Building2, Cloud, History, Info, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { formatDate, formatTimeAgo } from '../../utils/date';
import { Badge } from '../../components/common/Badge';

export function AdminDashboardPage() {
    const [health, setHealth] = useState<any>(null);
    const [stats, setStats] = useState<any>({ totalOrgs: 0, totalAdmins: 0 });
    const [recentErrors, setRecentErrors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [healthData, orgsData, adminsData, errorData] = await Promise.all([
                    apiFetch<any>('/api/admin/health'),
                    apiFetch<any>('/api/admin/orgs?pageSize=1'),
                    apiFetch<any>('/api/admin/admins'),
                    apiFetch<any>('/api/admin/system/errors')
                ]);
                setHealth(healthData);
                setStats({
                    totalOrgs: orgsData.total,
                    totalAdmins: adminsData.length
                });
                setRecentErrors(errorData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return (
        <AdminLayout>
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-slate-500">Loading dashboard...</p>
            </div>
        </AdminLayout>
    );

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 border-b pb-1">Admin Dashboard</h1>
                <p className="text-slate-500 mt-1">Real-time platform overview and system health.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${health?.status === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Status</p>
                            <p className="text-xl font-bold text-slate-900 capitalize">{health?.status || 'Unknown'}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Organizations</p>
                            <p className="text-xl font-bold text-slate-900">{stats.totalOrgs}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Super Admins</p>
                            <p className="text-xl font-bold text-slate-900">{stats.totalAdmins}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Server size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Uptime</p>
                            <p className="text-xl font-bold text-slate-900">
                                {health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Infrastructure Column */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900">Infrastructure Health</h3>
                        <Badge tone="neutral">Real-time</Badge>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Database</p>
                                    <p className="text-xs text-slate-500">PostgreSQL</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`flex items-center gap-1 text-sm font-bold ${health?.services?.database?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                                    {health?.services?.database?.status === 'connected' ? 'Operational' : 'Error'}
                                </div>
                                <p className="text-[10px] font-mono font-bold text-slate-400">{health?.services?.database?.latency}ms</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="flex items-center gap-3">
                                <Cloud size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900">S3 Storage</p>
                                    <p className="text-xs text-slate-500">AWS / LocalStack</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`flex items-center gap-1 text-sm font-bold ${health?.services?.storage?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                                    {health?.services?.storage?.status === 'connected' ? 'Operational' : 'Error'}
                                </div>
                                <p className="text-[10px] font-mono font-bold text-slate-400">{health?.services?.storage?.latency}ms</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="flex items-center gap-3">
                                <Server size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900">API Gateway</p>
                                    <p className="text-xs text-slate-500">v{health?.services?.api?.version}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                                    Operational
                                </div>
                                <p className="text-[10px] font-mono font-bold text-slate-400">Stable</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Errors Column */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/20 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-red-600" size={20} />
                            <h3 className="font-bold text-slate-900">Critical System Events</h3>
                        </div>
                        <Badge tone="danger">Recent 20</Badge>
                    </div>

                    <div className="max-h-[350px] overflow-auto">
                        {recentErrors.length > 0 ? (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-white sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500 tracking-wider">Level</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500 tracking-wider">Event / Message</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500 tracking-wider">Source</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold uppercase text-slate-500 tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {recentErrors.map((err) => (
                                        <tr key={err.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge tone={err.level === 'ERROR' ? 'danger' : 'warning'}>{err.level}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-bold text-slate-800">{err.message}</div>
                                                <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{err.action}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                                                    <Info size={10} />
                                                    {err.source}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-[10px] font-bold text-slate-400">
                                                {formatTimeAgo(err.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <History size={48} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium">No critical system events recorded</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
