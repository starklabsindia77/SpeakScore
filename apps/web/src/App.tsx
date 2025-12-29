import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from './api';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-primary-600">SpeakScore</Link>
          <nav className="space-x-4 text-sm">
            <Link to="/dashboard" className="text-gray-700 hover:text-primary-600">Dashboard</Link>
            <Link to="/tests" className="text-gray-700 hover:text-primary-600">Tests</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('changeme123');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await apiFetch<{ accessToken: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('accessToken', res.accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="flex justify-center">
      <form onSubmit={handleLogin} className="mt-10 w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-semibold">Recruiter Login</h1>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mt-4 block text-sm font-medium text-gray-700">Password</label>
        <input type="password" className="mt-1 w-full rounded border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="mt-6 w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700">Login</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [summary, setSummary] = useState<{ candidates: number; scored: number }>({ candidates: 0, scored: 0 });
  useEffect(() => {
    apiFetch<any[]>('/api/candidates')
      .then((data) => {
        setSummary({ candidates: data.length, scored: data.filter((c) => c.status === 'SCORED').length });
      })
      .catch(() => setSummary({ candidates: 0, scored: 0 }));
  }, []);
  return (
    <Layout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Candidates</p>
          <p className="text-2xl font-semibold">{summary.candidates}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Scored</p>
          <p className="text-2xl font-semibold">{summary.scored}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Status</p>
          <p className="text-2xl font-semibold">Pilot Ready</p>
        </div>
      </div>
    </Layout>
  );
}

function TestsList() {
  const [tests, setTests] = useState<any[]>([]);
  const [name, setName] = useState('Phone screening set');

  useEffect(() => {
    apiFetch<any[]>('/api/tests').then(setTests).catch(() => setTests([]));
  }, []);

  async function createTest() {
    const payload = { name, configJson: { duration: 12, questions: 4 } };
    const created = await apiFetch<any>('/api/tests', { method: 'POST', body: JSON.stringify(payload) });
    setTests((prev) => [...prev, created]);
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tests</h1>
        <div className="space-x-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <button onClick={createTest} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Create</button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {tests.map((t) => (
          <Link key={t.id} to={`/tests/${t.id}`} className="block rounded-lg bg-white p-4 shadow hover:ring-1 hover:ring-blue-200">
            <p className="text-lg font-semibold">{t.name}</p>
            <p className="text-sm text-gray-500">Active</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

function TestDetail() {
  const { id } = useParams();
  const [test, setTest] = useState<any>();
  const [linkInfo, setLinkInfo] = useState<{ token: string } | null>(null);
  const [candidateName, setCandidateName] = useState('Alex Candidate');
  const [candidateEmail, setCandidateEmail] = useState('alex@example.com');

  useEffect(() => {
    if (id) apiFetch<any>(`/api/tests/${id}`).then(setTest);
  }, [id]);

  async function generateLink() {
    if (!id) return;
    const res = await apiFetch<{ token: string }>(`/api/tests/${id}/links`, {
      method: 'POST',
      body: JSON.stringify({ candidateName, candidateEmail })
    });
    setLinkInfo(res);
  }

  return (
    <Layout>
      <h1 className="text-xl font-semibold">{test?.name || 'Test'}</h1>
      <div className="mt-4 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Invite candidate</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <input value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="rounded border px-3 py-2 text-sm" />
          <button onClick={generateLink} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Generate link</button>
        </div>
        {linkInfo && (
          <p className="mt-3 text-sm text-gray-700">Share this link: <span className="font-mono">{`${window.location.origin}/attempt/${linkInfo.token}`}</span></p>
        )}
      </div>
      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold">Candidates</h2>
        <div className="mt-2 space-y-2">
          {test?.candidates?.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-gray-500">{c.email}</p>
              </div>
              <span className="text-sm text-gray-600">{c.status}</span>
            </div>
          )) || <p className="text-sm text-gray-500">No candidates yet.</p>}
        </div>
      </div>
    </Layout>
  );
}

function AttemptPage() {
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
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">{data?.test?.name || 'Assessment'}</h1>
      {!data && <p className="mt-2 text-sm text-red-600">{uploadStatus || 'Loading attempt...'}</p>}
      {data && current < data.questions.length && (
        <div className="mt-4 rounded bg-white p-4 shadow">
          <p className="text-sm text-gray-500">Question {current + 1} of {data.questions.length}</p>
          <p className="mt-2 text-lg font-semibold">{question?.prompt}</p>
          <button onClick={() => handleRecord(question.id)} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Record</button>
        </div>
      )}
      {data && current >= data.questions.length && (
        <div className="mt-4 rounded bg-white p-4 shadow">
          <p className="text-lg font-semibold">Great job!</p>
          <p className="text-sm text-gray-600">Upload complete for {recordings.length} responses.</p>
          <button onClick={submitAttempt} className="mt-4 rounded bg-green-600 px-4 py-2 text-white">Submit attempt</button>
          {uploadStatus && <p className="mt-2 text-sm text-gray-700">{uploadStatus}</p>}
        </div>
      )}
      <button onClick={startAttempt} className="mt-4 text-sm text-blue-600">Start attempt</button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tests" element={<TestsList />} />
      <Route path="/tests/:id" element={<TestDetail />} />
      <Route path="/attempt/:token" element={<AttemptPage />} />
    </Routes>
  );
}
