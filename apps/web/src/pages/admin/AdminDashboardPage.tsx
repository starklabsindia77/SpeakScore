import { useEffect, useState } from 'react';
import { Activity, Database, Server, CheckCircle, AlertTriangle, Users, Building2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { formatDate } from '../../utils/date';

export function AdminDashboardPage() {
    const [health, setHealth] = useState<any>(null);
    const [stats, setStats] = useState<any>({ totalOrgs: 0, totalAdmins: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [healthData, orgsData, adminsData] = await Promise.all([
                    apiFetch<any>('/api/admin/health'),
                    apiFetch<any>('/api/admin/orgs?pageSize=1'), // Just to get count
                    apiFetch<any>('/api/admin/admins')
                ]);
                setHealth(healthData);
                setStats({
                    totalOrgs: orgsData.total,
                    totalAdmins: adminsData.length
                });
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
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-500">System overview and health status.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${health?.status === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
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

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold text-slate-900">Infrastructure Health</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="flex items-center gap-3">
                                <Database size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Database Connection</p>
                                    <p className="text-xs text-slate-500">Primary PostgreSQL Cluster</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`flex items-center gap-1.5 text-sm font-semibold ${health?.services?.database?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                                    {health?.services?.database?.status === 'connected' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                    {health?.services?.database?.status === 'connected' ? 'Operational' : 'Error'}
                                </div>
                                <p className="text-xs text-slate-400">{health?.services?.database?.latency}ms latency</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                            <div className="flex items-center gap-3">
                                <Server size={20} className="text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium text-slate-900">API Gateway</p>
                                    <p className="text-xs text-slate-500">v{health?.services?.api?.version}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                                    <CheckCircle size={14} />
                                    Operational
                                </div>
                                <p className="text-xs text-slate-400">Responding</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
