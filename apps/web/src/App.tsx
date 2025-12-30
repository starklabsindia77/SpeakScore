import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from './api';
import { useAuth } from './auth';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Tests', to: '/tests' },
  { label: 'Candidates', to: '/candidates' },
  { label: 'Review queue', to: '/review' }
];

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const toneClass = {
    neutral: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700'
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>;
}

function OrgStatusBadge({ status }: { status: string }) {
  return <Badge tone={status === 'ACTIVE' ? 'success' : 'danger'}>{status}</Badge>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-64 border-r bg-white/90 backdrop-blur md:block">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-semibold">SS</div>
          <div>
            <p className="text-sm font-semibold text-slate-800">SpeakScore</p>
            <p className="text-xs text-slate-500">Assessment control</p>
          </div>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 ${isActive ? 'bg-slate-100 text-blue-700' : 'text-slate-700'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link to="/" className="text-lg font-semibold text-blue-700 md:hidden">SpeakScore</Link>
            <div className="hidden gap-3 text-sm font-medium text-slate-600 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="neutral">Multi-tenant</Badge>
              <Badge tone="warning">Pilot</Badge>
              {user && <Badge tone={user.role === 'SUPER_ADMIN' ? 'danger' : 'neutral'}>{user.role}</Badge>}
              {user && (
                <button onClick={handleLogout} className="text-xs font-semibold text-slate-600 underline hover:text-blue-700">
                  Sign out
                </button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function LoginPage() {
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

function Dashboard() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  useEffect(() => {
    apiFetch<any[]>('/api/candidates')
      .then(setCandidates)
      .catch(() => setCandidates([]));
    apiFetch<any[]>('/api/tests')
      .then(setTests)
      .catch(() => setTests([]));
  }, []);

  const scored = candidates.filter((c) => c.status === 'SCORED').length;
  const flagged = candidates.filter((c) => c.status === 'SUBMITTED').length;
  const activeTests = tests.length;
  const pipeline = useMemo(() => {
    const grouped: Record<string, number> = {};
    candidates.forEach((c) => {
      grouped[c.status] = (grouped[c.status] || 0) + 1;
    });
    return grouped;
  }, [candidates]);

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Control center</p>
            <h1 className="text-2xl font-semibold text-slate-900">Assessment performance</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/tests" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Create test</Link>
            <Link to="/review" className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600">Review queue</Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active tests" value={activeTests} hint="Live and draft" />
          <StatCard label="Candidates" value={candidates.length} hint="Rolling 30d" />
          <StatCard label="Scored" value={scored} hint="Completed scoring" />
          <StatCard label="Needs review" value={flagged} tone="warning" hint="Flagged or pending" />
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Pipeline by status</p>
              <span className="text-xs text-slate-500">Live</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {['INVITED', 'STARTED', 'SUBMITTED', 'SCORED'].map((status) => (
                <div key={status} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-xs font-medium text-slate-600">{status}</p>
                  <p className="text-lg font-semibold text-slate-900">{pipeline[status] || 0}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Latest candidates</p>
              <Link to="/candidates" className="text-xs font-semibold text-blue-600">View all</Link>
            </div>
            <div className="mt-3 space-y-2">
              {candidates.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                  <Badge tone={c.status === 'SCORED' ? 'success' : c.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{c.status}</Badge>
                </div>
              ))}
              {candidates.length === 0 && <EmptyState title="No candidates yet" description="Invite candidates to start seeing activity." />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, hint, tone = 'neutral' }: { label: string; value: number | string; hint: string; tone?: 'neutral' | 'warning' }) {
  const toneClass = tone === 'warning' ? 'text-amber-600 bg-amber-50' : 'text-blue-700 bg-blue-50';
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneClass}`}>{hint}</p>
    </div>
  );
}

function TestsList() {
  const [tests, setTests] = useState<any[]>([]);
  const [name, setName] = useState('Phone screening set');
  const [duration, setDuration] = useState(12);
  const [questionCount, setQuestionCount] = useState(4);

  useEffect(() => {
    apiFetch<any[]>('/api/tests').then(setTests).catch(() => setTests([]));
  }, []);

  async function createTest() {
    const payload = {
      name,
      configJson: { duration, questions: questionCount, adaptive: true, randomizedSections: true, mediaSupport: true }
    };
    const created = await apiFetch<any>('/api/tests', { method: 'POST', body: JSON.stringify(payload) });
    setTests((prev) => [created, ...prev]);
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Test builder</p>
            <h1 className="text-2xl font-semibold text-slate-900">Create and manage assessments</h1>
          </div>
          <button onClick={createTest} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Create test</button>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Quick setup</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Duration (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value, 10))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Question count</label>
              <input type="number" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Adaptive routing, randomized sections, and media prompts are pre-enabled for new tests.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {tests.map((t) => (
            <Link key={t.id} to={`/tests/${t.id}`} className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900">{t.name}</p>
                <Badge tone="neutral">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">Adaptive with media & section randomization</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>Duration: {t.configJson?.duration ?? duration}m</span>
                <span>Questions: {t.configJson?.questions ?? questionCount}</span>
              </div>
            </Link>
          ))}
          {tests.length === 0 && <EmptyState title="No tests yet" description="Create your first test to invite candidates." />}
        </div>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Test details</p>
          <h1 className="text-2xl font-semibold text-slate-900">{test?.name || 'Test'}</h1>
        </div>
        <Badge tone="neutral">Adaptive + media</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Invite candidate</h2>
          <p className="text-sm text-slate-500">Links expire after 60 minutes by default.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <input value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            <button onClick={generateLink} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Generate link</button>
          </div>
          {linkInfo && (
            <p className="mt-3 text-sm text-slate-700">
              Share this link:{' '}
              <span className="font-mono text-blue-700">{`${window.location.origin}/attempt/${linkInfo.token}`}</span>
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Configuration</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            <li>Adaptive routing</li>
            <li>Media-rich prompts</li>
            <li>Randomized sections</li>
            <li>Timed sections: enabled</li>
          </ul>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Candidates</h2>
          <Badge tone="neutral">{test?.candidates?.length ?? 0} total</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {test?.candidates?.length ? (
            test.candidates.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </div>
                <Badge tone={c.status === 'SCORED' ? 'success' : c.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{c.status}</Badge>
              </div>
            ))
          ) : (
            <EmptyState title="No candidates yet" description="Generate a link to invite your first candidate." />
          )}
        </div>
      </div>
    </Layout>
  );
}

function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  useEffect(() => {
    apiFetch<any[]>('/api/candidates').then(setCandidates).catch(() => setCandidates([]));
  }, []);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Talent pipeline</p>
          <h1 className="text-2xl font-semibold text-slate-900">Candidates</h1>
        </div>
        <Link to="/tests" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Invite candidate</Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Name', 'Email', 'Status', 'Score', 'Decision'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={c.status === 'SCORED' ? 'success' : c.status === 'SUBMITTED' ? 'warning' : 'neutral'}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{c.overallScore ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{c.decision ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {candidates.length === 0 && <EmptyState title="No candidates" description="Invite candidates to see them here." />}
      </div>
    </Layout>
  );
}

function ReviewQueue() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiFetch<any[]>('/api/candidates/review/flags')
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Quality & trust</p>
          <h1 className="text-2xl font-semibold text-slate-900">Review queue</h1>
        </div>
        <Badge tone="warning">{items.length} flagged</Badge>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Flagged responses</p>
          <p className="text-xs text-slate-500">Low confidence or policy triggers</p>
        </div>
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.candidate?.name}</p>
                  <p className="text-xs text-slate-500">{item.question?.prompt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="warning">{item.flaggedReason || 'Low confidence'}</Badge>
                  <Badge tone="neutral">Conf: {item.confidence ?? '—'}</Badge>
                  {item.signedUrl && (
                    <a href={item.signedUrl} className="text-xs font-semibold text-blue-600 underline" target="_blank" rel="noreferrer">Listen</a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <EmptyState title="No flags" description="New flags will appear here when responses need review." />}
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

type AdminOrg = {
  id: string;
  name: string;
  schemaName: string;
  status: string;
  creditsBalance: number;
  createdAt: string;
  updatedAt?: string;
};

type PlatformLog = { id: string; level: string; source: string; message: string; orgId?: string | null; createdAt: string; meta?: Record<string, any> };

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/orgs" replace />;
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Link to="/admin/orgs" className="text-lg font-semibold text-blue-700">SpeakScore Admin</Link>
            <Badge tone="danger">SUPER ADMIN</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            {user && <span className="text-xs text-slate-500">{user.email}</span>}
            <button onClick={handleLogout} className="text-xs font-semibold text-blue-700 underline">Sign out</button>
          </div>
        </div>
        <div className="mx-auto mt-2 flex max-w-6xl gap-3 text-sm font-semibold text-slate-600">
          <NavLink to="/admin/orgs" className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
            Organizations
          </NavLink>
          <NavLink to="/admin/logs" className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
            Platform logs
          </NavLink>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}

function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<AdminOrg | null>(null);
  const [creditsInput, setCreditsInput] = useState(10);
  const [note, setNote] = useState('');

  async function loadOrgs() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<{ items: AdminOrg[] }>('/api/admin/orgs');
      setOrgs(res.items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  async function toggleStatus(org: AdminOrg) {
    const nextStatus = org.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });
    setOrgs((prev) => prev.map((item) => (item.id === org.id ? updated : item)));
    if (selectedOrg?.id === org.id) setSelectedOrg(updated);
  }

  async function allocateCredits(org: AdminOrg) {
    if (creditsInput <= 0) return;
    const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/credits`, {
      method: 'POST',
      body: JSON.stringify({ credits: creditsInput, note })
    });
    setOrgs((prev) => prev.map((item) => (item.id === org.id ? updated : item)));
    setSelectedOrg(null);
    setCreditsInput(10);
    setNote('');
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Platform control</p>
          <h1 className="text-2xl font-semibold text-slate-900">Organizations</h1>
        </div>
        <Badge tone="neutral">{orgs.length} orgs</Badge>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          <span>Name</span>
          <span>ID</span>
          <span>Schema</span>
          <span className="text-right">Credits</span>
          <span>Status</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading && <p className="px-4 py-3 text-sm text-slate-600">Loading organizations...</p>}
          {!loading &&
            orgs.map((org) => (
              <div key={org.id} className="grid grid-cols-7 items-center px-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">{org.name}</span>
                <span className="truncate text-xs text-slate-500">{org.id}</span>
                <span className="text-xs text-slate-600">{org.schemaName}</span>
                <span className="text-right font-semibold">{org.creditsBalance}</span>
                <OrgStatusBadge status={org.status} />
                <span className="text-xs text-slate-500">{formatDate(org.createdAt)}</span>
                <div className="flex justify-end gap-2 text-xs font-semibold">
                  <Link to={`/admin/orgs/${org.id}`} className="text-blue-700">View</Link>
                  <button onClick={() => toggleStatus(org)} className="text-slate-700 underline">
                    {org.status === 'DISABLED' ? 'Enable' : 'Disable'}
                  </button>
                  <button onClick={() => setSelectedOrg(org)} className="text-blue-700 underline">
                    Allocate credits
                  </button>
                </div>
              </div>
            ))}
          {!loading && orgs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No organizations yet.</p>}
        </div>
      </div>

      {selectedOrg && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Allocate credits</p>
                <p className="text-xs text-slate-500">{selectedOrg.name}</p>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="text-sm text-slate-500">Close</button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Credits to add</label>
                <input
                  type="number"
                  min={1}
                  value={creditsInput}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setCreditsInput(Number.isFinite(value) ? value : 0);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSelectedOrg(null)} className="text-sm font-semibold text-slate-600">Cancel</button>
                <button
                  onClick={() => allocateCredits(selectedOrg)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                  disabled={creditsInput <= 0}
                >
                  Allocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function AdminOrgDetailPage() {
  const { id } = useParams();
  const [org, setOrg] = useState<AdminOrg | null>(null);
  const [error, setError] = useState('');
  const [creditsInput, setCreditsInput] = useState(5);
  const [note, setNote] = useState('');

  async function loadOrg() {
    if (!id) return;
    setError('');
    try {
      const res = await apiFetch<AdminOrg>(`/api/admin/orgs/${id}`);
      setOrg(res);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadOrg();
  }, [id]);

  async function toggleStatus() {
    if (!org) return;
    const nextStatus = org.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });
    setOrg(updated);
  }

  async function allocate() {
    if (!org || creditsInput <= 0) return;
    const updated = await apiFetch<AdminOrg>(`/api/admin/orgs/${org.id}/credits`, {
      method: 'POST',
      body: JSON.stringify({ credits: creditsInput, note })
    });
    setOrg(updated);
    setCreditsInput(5);
    setNote('');
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Organization</p>
          <h1 className="text-2xl font-semibold text-slate-900">{org?.name || 'Loading...'}</h1>
        </div>
        <Link to="/admin/orgs" className="text-sm font-semibold text-blue-700 underline">Back to list</Link>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {org && (
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{org.name}</p>
              <p className="text-xs text-slate-500">{org.id}</p>
            </div>
            <OrgStatusBadge status={org.status} />
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-lg bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Schema</p>
              <p className="font-semibold text-slate-900">{org.schemaName}</p>
            </div>
            <div className="rounded-lg bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Credits</p>
              <p className="text-lg font-semibold text-slate-900">{org.creditsBalance}</p>
            </div>
            <div className="rounded-lg bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Created</p>
              <p className="font-semibold text-slate-900">{formatDate(org.createdAt)}</p>
            </div>
            <div className="rounded-lg bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Updated</p>
              <p className="font-semibold text-slate-900">{formatDate(org.updatedAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={toggleStatus} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
              {org.status === 'DISABLED' ? 'Enable org' : 'Disable org'}
            </button>
            <div className="flex flex-1 flex-col gap-2 rounded-lg border border-slate-100 p-3 md:max-w-md">
              <label className="text-xs font-semibold text-slate-700">Allocate credits</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={creditsInput}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setCreditsInput(Number.isFinite(value) ? value : 0);
                  }}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <button
                  onClick={allocate}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                  disabled={creditsInput <= 0}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function AdminLogsPage() {
  const [logs, setLogs] = useState<PlatformLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ level: '', orgId: '', fromDate: '', toDate: '' });
  const [error, setError] = useState('');

  async function loadLogs() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.level) params.append('level', filters.level);
      if (filters.orgId) params.append('org_id', filters.orgId);
      if (filters.fromDate) params.append('from_date', filters.fromDate);
      if (filters.toDate) params.append('to_date', filters.toDate);
      const res = await apiFetch<PlatformLog[]>(`/api/admin/logs?${params.toString()}`);
      setLogs(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Visibility</p>
          <h1 className="text-2xl font-semibold text-slate-900">Platform logs</h1>
        </div>
        <button onClick={loadLogs} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">
          Refresh
        </button>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Level</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Any</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Org ID</label>
            <input
              value={filters.orgId}
              onChange={(e) => setFilters((prev) => ({ ...prev, orgId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Optional org filter"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">From</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">To</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={loadLogs} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">
            Apply filters
          </button>
        </div>
        <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {loading && <p className="px-4 py-3 text-sm text-slate-600">Loading logs...</p>}
          {!loading &&
            logs.map((log) => (
              <div key={log.id} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm">
                <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                <span><Badge tone={log.level === 'ERROR' ? 'danger' : log.level === 'WARN' ? 'warning' : 'neutral'}>{log.level}</Badge></span>
                <span className="text-xs font-semibold text-slate-700">{log.source}</span>
                <span className="text-slate-800">{log.message}</span>
                <span className="text-xs text-slate-500">{log.orgId || '—'}</span>
              </div>
            ))}
          {!loading && logs.length === 0 && <p className="px-4 py-3 text-sm text-slate-600">No logs yet.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tests" element={<ProtectedRoute><TestsList /></ProtectedRoute>} />
      <Route path="/tests/:id" element={<ProtectedRoute><TestDetail /></ProtectedRoute>} />
      <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
      <Route path="/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/admin/orgs" element={<AdminRoute><AdminOrganizationsPage /></AdminRoute>} />
      <Route path="/admin/orgs/:id" element={<AdminRoute><AdminOrgDetailPage /></AdminRoute>} />
      <Route path="/admin/logs" element={<AdminRoute><AdminLogsPage /></AdminRoute>} />
      <Route path="/attempt/:token" element={<AttemptPage />} />
    </Routes>
  );
}
