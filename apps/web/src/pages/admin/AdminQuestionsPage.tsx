import { useEffect, useState } from 'react';
import { Plus, Trash2, Mic, Type, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../api';
import { AdminLayout } from '../../components/common/AdminLayout';

export function AdminQuestionsPage() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ type: 'TEXT', prompt: '', isActive: true });

    async function loadQuestions() {
        setLoading(true);
        try {
            const data = await apiFetch<any[]>('/api/admin/questions');
            setQuestions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadQuestions();
    }, []);

    async function handleCreate() {
        try {
            await apiFetch('/api/admin/questions', {
                method: 'POST',
                body: JSON.stringify(newQuestion)
            });
            setIsCreating(false);
            setNewQuestion({ type: 'TEXT', prompt: '', isActive: true });
            loadQuestions();
        } catch (err) {
            alert('Failed to create question');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this question?')) return;
        try {
            await apiFetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
            setQuestions(questions.filter(q => q.id !== id));
        } catch (err) {
            alert('Failed to delete question');
        }
    }

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Global Question Pool</h1>
                    <p className="text-slate-500">Manage questions available to all organizations.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                    <Plus size={16} />
                    New Question
                </button>
            </div>

            {isCreating && (
                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <h3 className="mb-3 font-semibold text-blue-900">Add New Question</h3>
                    <div className="grid gap-4 md:grid-cols-[150px_1fr_auto]">
                        <select
                            value={newQuestion.type}
                            onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}
                            className="rounded-lg border-slate-200 text-sm"
                        >
                            <option value="TEXT">Text Answer</option>
                            <option value="AUDIO">Audio Response</option>
                            <option value="MCQ">Multiple Choice</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Enter question prompt..."
                            value={newQuestion.prompt}
                            onChange={e => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                            className="rounded-lg border-slate-200 px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleCreate}
                                disabled={!newQuestion.prompt}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">Type</th>
                            <th className="px-6 py-3 font-medium">Prompt</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {questions.map((q) => (
                            <tr key={q.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                        {q.type === 'AUDIO' ? <Mic size={12} /> : <Type size={12} />}
                                        {q.type}
                                    </span>
                                </td>
                                <td className="px-6 py-3 font-medium text-slate-900">{q.prompt}</td>
                                <td className="px-6 py-3">
                                    {q.isActive ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                            <CheckCircle size={12} /> Active
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400">Inactive</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button
                                        onClick={() => handleDelete(q.id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!loading && questions.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                    No questions in the global pool.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
