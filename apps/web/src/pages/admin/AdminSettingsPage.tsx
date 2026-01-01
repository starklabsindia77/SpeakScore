import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Badge } from '../../components/common/Badge';
import { Shield, Plus, X, CreditCard } from 'lucide-react';

export function AdminSettingsPage() {
    const [config, setConfig] = useState<any>({ provider: 'gemini', apiKeys: [], model: 'gemini-1.5-pro', billing: {} });
    const [newKey, setNewKey] = useState('');
    const [newIp, setNewIp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        Promise.all([
            apiFetch<any>('/api/admin/settings/ai'),
            apiFetch<any>('/api/admin/settings/feature-costs'),
            apiFetch<any>('/api/admin/settings/maintenance'),
            apiFetch<any>('/api/admin/settings/security'),
            apiFetch<any>('/api/admin/settings/billing')
        ])
            .then(([aiData, costsData, maintenanceData, securityData, billingData]) => {
                setConfig({
                    provider: 'gemini',
                    model: 'gemini-1.5-pro',
                    ...aiData,
                    apiKeys: Array.isArray(aiData?.apiKeys) ? aiData.apiKeys : [],
                    featureCosts: costsData,
                    maintenance: maintenanceData,
                    security: securityData,
                    billing: billingData
                });
            })
            .catch((err) => setError(err.message));
    }, []);

    async function handleSave() {
        setLoading(true);
        setError('');
        setSuccess(false);
        try {
            await Promise.all([
                apiFetch('/api/admin/settings/ai', {
                    method: 'POST',
                    body: JSON.stringify({
                        provider: config.provider,
                        model: config.model,
                        projectId: config.projectId,
                        apiKeys: config.apiKeys
                    })
                }),
                apiFetch('/api/admin/settings/feature-costs', {
                    method: 'POST',
                    body: JSON.stringify(config.featureCosts)
                }),
                apiFetch('/api/admin/settings/security', {
                    method: 'POST',
                    body: JSON.stringify(config.security)
                }),
                apiFetch('/api/admin/settings/billing', {
                    method: 'POST',
                    body: JSON.stringify(config.billing)
                })
            ]);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function addKey() {
        if (!newKey.trim()) return;
        setConfig({ ...config, apiKeys: [...config.apiKeys, newKey.trim()] });
        setNewKey('');
    }

    function removeKey(index: number) {
        const updated = [...config.apiKeys];
        updated.splice(index, 1);
        setConfig({ ...config, apiKeys: updated });
    }

    function addIp() {
        if (!newIp.trim()) return;
        const currentIps = config.security?.ipWhitelist?.ips || [];
        setConfig({
            ...config,
            security: {
                ...config.security,
                ipWhitelist: {
                    ...config.security?.ipWhitelist,
                    ips: [...currentIps, newIp.trim()]
                }
            }
        });
        setNewIp('');
    }

    function removeIp(ipToRemove: string) {
        const currentIps = config.security?.ipWhitelist?.ips || [];
        setConfig({
            ...config,
            security: {
                ...config.security,
                ipWhitelist: {
                    ...config.security?.ipWhitelist,
                    ips: currentIps.filter((ip: string) => ip !== ipToRemove)
                }
            }
        });
    }

    function toggleIpWhitelist(enabled: boolean) {
        setConfig({
            ...config,
            security: {
                ...config.security,
                ipWhitelist: {
                    ...config.security?.ipWhitelist,
                    enabled,
                    ips: config.security?.ipWhitelist?.ips || []
                }
            }
        });
    }

    return (
        <AdminLayout>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
                    <p className="text-slate-500">Configure AI, Billing, and Security.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved successfully!</p>}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* AI Configuration Section */}
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">AI Provider</h2>
                        <div className="mt-4 space-y-3">
                            {['gemini', 'openai', 'claude'].map((p) => (
                                <label
                                    key={p}
                                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${config.provider === p ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            name="provider"
                                            className="h-4 w-4 text-blue-600"
                                            checked={config.provider === p}
                                            onChange={() => setConfig({ ...config, provider: p })}
                                        />
                                        <span className="text-sm font-semibold uppercase text-slate-700">{p}</span>
                                    </div>
                                    {p === 'gemini' && <Badge tone="neutral">DEFAULT</Badge>}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Model Configuration</h2>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Model Name</label>
                                <input
                                    value={config.model || ''}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                    placeholder="e.g. gemini-1.5-pro"
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            {config.provider === 'gemini' && (
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project ID (GCP)</label>
                                    <input
                                        value={config.projectId || ''}
                                        onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                                        placeholder="Your Google Cloud Project ID"
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t pt-4">
                            <h3 className="text-sm font-medium text-slate-900 mb-2">API Keys</h3>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="password"
                                    placeholder="Enter new API Key"
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                                <button
                                    onClick={addKey}
                                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {config.apiKeys.map((key: string, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                        <span className="font-mono text-slate-600">••••••••••••{key.slice(-4)}</span>
                                        <button onClick={() => removeKey(idx)} className="text-red-600 hover:text-red-700">Remove</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Payment Gateway Section */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="text-blue-600" size={20} />
                            <h2 className="text-lg font-semibold text-slate-900">Payment Gateway</h2>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Razorpay configuration for handling payments.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key ID</label>
                                <input
                                    value={config.billing?.razorpay?.keyId || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        billing: { ...config.billing, razorpay: { ...config.billing?.razorpay, keyId: e.target.value } }
                                    })}
                                    placeholder="rzp_test_..."
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key Secret</label>
                                <input
                                    type="password"
                                    value={config.billing?.razorpay?.keySecret || ''}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        billing: { ...config.billing, razorpay: { ...config.billing?.razorpay, keySecret: e.target.value } }
                                    })}
                                    placeholder="Enter Key Secret"
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Security & Costs */}
                <div className="space-y-6">
                    {/* Security Section */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="text-blue-600" size={20} />
                            <h2 className="text-lg font-semibold text-slate-900">Security & Access Control</h2>
                        </div>

                        <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-900">Admin IP Whitelist</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.security?.ipWhitelist?.enabled || false}
                                        onChange={(e) => toggleIpWhitelist(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                Only allow Super Admins to access the dashboard from specific IP addresses.
                                <span className="text-red-600 font-medium ml-1">Warning: Ensure your current IP is added before enabling.</span>
                            </p>

                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    placeholder="Enter IP Address (e.g. 192.168.1.1)"
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    disabled={!config.security?.ipWhitelist?.enabled}
                                />
                                <button
                                    onClick={addIp}
                                    disabled={!config.security?.ipWhitelist?.enabled}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(config.security?.ipWhitelist?.ips || []).map((ip: string) => (
                                    <span key={ip} className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                                        {ip}
                                        <button onClick={() => removeIp(ip)} className="text-slate-400 hover:text-red-600">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-red-900">Maintenance Mode</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.maintenance?.enabled || false}
                                        onChange={async (e) => {
                                            try {
                                                await apiFetch('/api/admin/settings/maintenance', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ enabled: e.target.checked })
                                                });
                                                setConfig({ ...config, maintenance: { enabled: e.target.checked } });
                                            } catch (err: any) {
                                                alert(err.message);
                                            }
                                        }}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-red-700 mt-1">Lock platform for non-admin users.</p>

                            <hr className="my-4 border-red-200" />

                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900">System Migrations</span>
                                <button
                                    onClick={async () => {
                                        if (!confirm('Run all tenant migrations? This might take a while.')) return;
                                        try {
                                            await apiFetch('/api/admin/migrations/run-all', { method: 'POST' });
                                            alert('Migrations triggered successfully.');
                                        } catch (err: any) {
                                            alert('Failed: ' + err.message);
                                        }
                                    }}
                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded"
                                >
                                    Run All
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Data Management Section */}
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-amber-900">Data Management</h2>
                        </div>
                        <p className="text-xs text-amber-700 mb-4">
                            Compliance tools to export or purge organization data.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-amber-700">Export Data</label>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        placeholder="Org ID (optional, defaults to all if empty which is unsafe)"
                                        className="flex-1 rounded-lg border-amber-200 px-3 py-2 text-sm"
                                        id="exportOrgId"
                                    />
                                    <button
                                        onClick={() => {
                                            const orgId = (document.getElementById('exportOrgId') as HTMLInputElement).value;
                                            if (!orgId) return alert('Please provide Org ID');
                                            window.open(`/api/admin/data/export?orgId=${orgId}`, '_blank');
                                        }}
                                        className="rounded-lg bg-amber-600 px-3 py-2 text-white text-sm hover:bg-amber-700"
                                    >
                                        Export JSON
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-amber-200">
                                <label className="text-xs font-semibold uppercase tracking-wider text-red-700">Data Purge (Destructive)</label>
                                <div className="mt-2 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Org ID"
                                            className="flex-1 rounded-lg border-amber-200 px-3 py-2 text-sm"
                                            id="purgeOrgId"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Older than (days)"
                                            className="w-32 rounded-lg border-amber-200 px-3 py-2 text-sm"
                                            id="purgeDays"
                                            defaultValue={365}
                                        />
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const orgId = (document.getElementById('purgeOrgId') as HTMLInputElement).value;
                                            const days = (document.getElementById('purgeDays') as HTMLInputElement).value;

                                            if (!orgId || !days) return alert('Missing fields');
                                            if (!confirm(`DANGER: Are you sure you want to PERMANENTLY DELETE data for Org ${orgId} older than ${days} days?`)) return;

                                            try {
                                                const res = await apiFetch<any>('/api/admin/data/purge', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ orgId, olderThanDays: Number(days) })
                                                });
                                                alert(`Success. Deleted ${res.deletedCount} candidates.`);
                                            } catch (err: any) {
                                                alert('Purge failed: ' + err.message);
                                            }
                                        }}
                                        className="w-full rounded-lg bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 font-semibold"
                                    >
                                        Purge Old Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Billing Defaults</h2>
                <div className="mt-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attempt Cost</label>
                    <input
                        type="number"
                        min={0}
                        value={config.featureCosts?.ATTEMPT_SUBMISSION ?? 1}
                        onChange={(e) => setConfig({
                            ...config,
                            featureCosts: {
                                ...config.featureCosts,
                                ATTEMPT_SUBMISSION: parseInt(e.target.value) || 0
                            }
                        })}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
