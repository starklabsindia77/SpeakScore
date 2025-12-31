import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';
import { Badge } from '../../components/common/Badge';

export function AdminSettingsPage() {
    const [config, setConfig] = useState<any>({ provider: 'gemini', apiKeys: [], model: 'gemini-1.5-pro' });
    const [newKey, setNewKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        apiFetch<any>('/api/admin/settings/ai')
            .then(setConfig)
            .catch((err) => setError(err.message));
    }, []);

    async function handleSave() {
        setLoading(true);
        setError('');
        setSuccess(false);
        try {
            await apiFetch('/api/admin/settings/ai', {
                method: 'POST',
                body: JSON.stringify(config)
            });
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

    return (
        <AdminLayout>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Platform Settings</p>
                    <h1 className="text-2xl font-semibold text-slate-900">AI Configuration</h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Settings saved successfully!</p>}

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Provider Selection</h2>
                        <p className="text-sm text-slate-500">Choose the primary AI service for the platform.</p>
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
                                    placeholder="e.g. gemini-1.5-pro, gpt-4, etc."
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
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">API Gateway & Failsafe Keys</h2>
                    <p className="text-sm text-slate-500">Manage multiple API keys. The system will failover if a key hits rate limits.</p>

                    <div className="mt-4 flex gap-2">
                        <input
                            type="password"
                            placeholder="Enter API Key"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <button
                            onClick={addKey}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
                        >
                            Add Key
                        </button>
                    </div>

                    <div className="mt-6 space-y-3">
                        {config.apiKeys.map((key: string, idx: number) => (
                            <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-slate-500">KEY {idx + 1}</span>
                                    <span className="font-mono text-sm text-slate-700">••••••••••••{key.slice(-4)}</span>
                                </div>
                                <button
                                    onClick={() => removeKey(idx)}
                                    className="text-xs font-bold text-red-600 hover:text-red-700"
                                >
                                    REMOVE
                                </button>
                            </div>
                        ))}
                        {config.apiKeys.length === 0 && (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
                                <p className="text-sm font-medium text-slate-400">No keys added yet.</p>
                                <p className="text-xs text-slate-400">Add at least one key to enable AI features.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
