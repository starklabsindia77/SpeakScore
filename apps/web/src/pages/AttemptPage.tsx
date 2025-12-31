import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { Badge } from '../components/common/Badge';

export function AttemptPage() {
    const { token } = useParams();
    const [data, setData] = useState<any>();
    const [current, setCurrent] = useState(0);
    const [recordings, setRecordings] = useState<string[]>([]);
    const [uploadStatus, setUploadStatus] = useState('');

    useEffect(() => {
        if (!token) return;
        apiFetch<any>(`/public/attempt/${token}`).then(setData).catch(() => setUploadStatus('Invalid link'));
    }, [token]);

    async function startAttempt() {
        if (!token) return;
        await apiFetch(`/public/attempt/${token}/start`, { method: 'POST' });
    }

    async function handleRecord(questionId: string) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const objectKey = `${questionId}-${Date.now()}.webm`;
            if (!token) return;
            const { uploadUrl } = await apiFetch<{ uploadUrl: string }>(`/public/attempt/${token}/response`, {
                method: 'POST',
                body: JSON.stringify({ questionId, audioObjectKey: objectKey })
            });
            await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'audio/webm' } });
            setRecordings((prev) => [...prev, objectKey]);
            setCurrent((prev) => prev + 1);
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 5000);
    }

    async function submitAttempt() {
        if (!token) return;
        setUploadStatus('Submitting...');
        await apiFetch(`/public/attempt/${token}/submit`, {
            method: 'POST',
            body: JSON.stringify({ submittedAt: new Date().toISOString() })
        });
        setUploadStatus('Submitted!');
    }

    const question = data?.questions?.[current];
    const totalQuestions = data?.questions?.length || 0;
    const progress = totalQuestions ? Math.min(100, Math.round((current / totalQuestions) * 100)) : 0;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Candidate experience</p>
                        <h1 className="text-xl font-semibold text-slate-900">{data?.test?.name || 'Assessment'}</h1>
                    </div>
                    <Badge tone="neutral">{progress}%</Badge>
                </div>
                {!data && <p className="mt-2 text-sm text-red-600">{uploadStatus || 'Loading attempt...'}</p>}
                {data && current < data.questions.length && (
                    <div className="mt-4 space-y-4">
                        <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                            <p className="text-xs font-semibold text-slate-600">Question {current + 1} of {data.questions.length}</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{question?.prompt}</p>
                            <p className="text-sm text-slate-500">Media-capable prompt with up to 60s response time.</p>
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => handleRecord(question.id)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Record</button>
                                <button onClick={startAttempt} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">Start</button>
                            </div>
                        </div>
                    </div>
                )}
                {data && current >= data.questions.length && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-green-50/80 p-4">
                        <p className="text-lg font-semibold text-slate-900">Great job!</p>
                        <p className="text-sm text-slate-600">Upload complete for {recordings.length} responses.</p>
                        <button onClick={submitAttempt} className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700">Submit attempt</button>
                        {uploadStatus && <p className="mt-2 text-sm text-slate-700">{uploadStatus}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
