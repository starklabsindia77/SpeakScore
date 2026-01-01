import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setStatus('LOADING');
        try {
            await apiFetch('/api/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            setStatus('SUCCESS');
        } catch (err: any) {
            setError(err.message);
            setStatus('ERROR');
        }
    }

    if (status === 'SUCCESS') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-white px-4">
                <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-100 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">Email Sent</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        If an account exists for {email}, you will receive a password reset link shortly.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-8 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
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
                <h1 className="mt-6 text-xl font-semibold text-slate-900">Forgot Password</h1>
                <p className="mt-2 text-sm text-slate-500">Enter your email address and we'll send you a link to reset your password.</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    <div>
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            required
                            type="email"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={status === 'LOADING'}
                        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {status === 'LOADING' ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
