import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { Badge } from '../../components/common/Badge';
import { Layout } from '../../components/common/Layout';

export function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [current, setCurrent] = useState<any>({ name: '', type: 'INVITE', subject: '', body: '', isDefault: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function loadTemplates() {
        setLoading(true);
        try {
            const res = await apiFetch<any[]>('/api/templates');
            setTemplates(res);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadTemplates(); }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (current.id) {
                await apiFetch(`/api/templates/${current.id}`, { method: 'PATCH', body: JSON.stringify(current) });
            } else {
                await apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(current) });
            }
            setShowModal(false);
            loadTemplates();
        } catch (e: any) {
            setError(e.message);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure?')) return;
        try {
            await apiFetch(`/api/templates/${id}`, { method: 'DELETE' });
            loadTemplates();
        } catch (e: any) {
            setError(e.message);
        }
    }

    function openEdit(t: any) {
        setCurrent({ ...t });
        setShowModal(true);
    }

    function openNew() {
        setCurrent({ name: '', type: 'INVITE', subject: '', body: '', isDefault: false });
        setShowModal(true);
    }

    return (
        <Layout>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Email Templates</h1>
                    <p className="text-sm text-slate-500">Customize automated emails for your organization.</p>
                </div>
                <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">
                    New Template
                </button>
            </div>

            {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {templates.map(t => (
                    <div key={t.id} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                                    {t.is_default && <Badge tone="neutral">Default</Badge>}
                                </div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">{t.type}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(t)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Edit</button>
                                <button onClick={() => handleDelete(t.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">Delete</button>
                            </div>
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-700">Subject: <span className="font-normal">{t.subject}</span></p>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{t.body}</p>
                    </div>
                ))}
                {templates.length === 0 && !loading && (
                    <div className="col-span-2 py-10 text-center text-slate-500 text-sm">No templates defined. System defaults will be used.</div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-semibold">{current.id ? 'Edit Template' : 'New Template'}</h2>
                        <form onSubmit={handleSave} className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold">Template Name</label>
                                    <input required value={current.name} onChange={e => setCurrent({ ...current, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. Friendly Invite" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold">Type</label>
                                    <select value={current.type} onChange={e => setCurrent({ ...current, type: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                                        <option value="INVITE">Invitation</option>
                                        <option value="REMINDER">Reminder</option>
                                        <option value="RESULT">Results</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold">Subject Line</label>
                                <input required value={current.subject} onChange={e => setCurrent({ ...current, subject: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Subject..." />
                            </div>
                            <div>
                                <label className="text-xs font-semibold">Email Body</label>
                                <p className="mb-1 text-[10px] text-slate-400">Supported variables: {'{{candidate_name}}'}, {'{{test_link}}'}, {'{{org_name}}'}</p>
                                <textarea required value={current.body} onChange={e => setCurrent({ ...current, body: e.target.value })} rows={6} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Hi {{candidate_name}}..." />
                            </div>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={current.isDefault || false} onChange={e => setCurrent({ ...current, isDefault: e.target.checked })} />
                                <span className="text-sm font-medium">Set as default for {current.type}</span>
                            </label>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="text-sm font-semibold text-slate-600">Cancel</button>
                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">Save Template</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
