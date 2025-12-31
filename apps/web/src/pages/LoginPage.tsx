import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';

export function LoginPage() {
    const [email, setEmail] = useState('admin@demo.com');
    const [password, setPassword] = useState('changeme123');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            const payload = { email, password };
            const res = await apiFetch<{ accessToken: string; user: any }>('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            login(res.accessToken, res.user);
            navigate(res.user.role === 'SUPER_ADMIN' ? '/admin/orgs' : '/dashboard');
        } catch (err: any) {
            setError(err.message);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-white px-4">
            <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-100">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold">SS</div>
                    <div>
                        <p className="text-lg font-semibold text-slate-900">SpeakScore</p>
                        <p className="text-xs text-slate-500">Recruiter console</p>
                    </div>
                </div>
                <h1 className="mt-6 text-xl font-semibold text-slate-900">Sign in</h1>
                <p className="text-sm text-slate-500">Admin demo account prefilled.</p>
                <form onSubmit={handleLogin} className="mt-4 space-y-4">
                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <input type="password" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">Continue</button>
                </form>
            </div>
        </div>
    );
}
