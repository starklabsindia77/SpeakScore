import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from './api';
import { useAuth } from './auth';

const recruiterNav = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Batches', to: '/batches' },
  { label: 'Tests', to: '/tests' },
  { label: 'Candidates', to: '/candidates' },
  { label: 'Review queue', to: '/review' }
];

const orgAdminNav = [
  ...recruiterNav,
  { label: 'Team members', to: '/org/users' },
  { label: 'Roles & Permissions', to: '/org/roles' },
  { label: 'Email Templates', to: '/org/templates' }
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


function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for notifications
  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await apiFetch<any[]>('/api/notifications');
        setNotifications(res);
        setUnreadCount(res.filter((n) => !n.is_read).length);
      } catch (e) {
        // fail silently
      }
    }
    fetchNotes(); // initial
    const interval = setInterval(fetchNotes, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  async function markRead(id: string) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {/* ignore */ }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <span className="sr-only">Notifications</span>
        {/* Bell Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
        )}
      </button>

      {show && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShow(false)}></div>
          <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl ring-1 ring-black ring-opacity-5">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">No new notifications.</div>
              )}
              {notifications.map((n) => (
                <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`cursor-pointer px-4 py-3 hover:bg-slate-50 ${n.is_read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                  <div className="flex justify-between">
                    <p className={`text-sm font-medium ${n.is_read ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                    {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(new Date(n.created_at || new Date()))}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date) {
  const diff = (new Date().getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const activeNav = user?.role === 'ORG_ADMIN' ? orgAdminNav : recruiterNav;

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
          {activeNav.map((item) => (
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
              {activeNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="neutral">Multi-tenant</Badge>
              <NotificationBell />
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
  const [bulkInput, setBulkInput] = useState('');
  const [bulkLinks, setBulkLinks] = useState<any[]>([]);
  const [linkInfo, setLinkInfo] = useState<{ token: string } | null>(null);
  const [candidateName, setCandidateName] = useState('Alex Candidate');
  const [candidateEmail, setCandidateEmail] = useState('alex@example.com');
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  useEffect(() => {
    if (id) apiFetch<any>(`/api/tests/${id}`).then(setTest);
    apiFetch<any[]>('/api/batches').then(setBatches).catch(() => setBatches([]));
  }, [id]);

  async function generateLink() {
    if (!id) return;
    const res = await apiFetch<{ token: string }>(`/api/tests/${id}/links`, {
      method: 'POST',
      body: JSON.stringify({ candidateName, candidateEmail })
    });
    setLinkInfo(res);
    apiFetch<any>(`/api/tests/${id}`).then(setTest);
  }

  async function handleBulkInvite() {
    if (!id || !bulkInput.trim()) return;
    const lines = bulkInput.split('\n').filter(l => l.trim());
    const candidates = lines.map(line => {
      const parts = line.split(/[,\t]/);
      return {
        name: parts[0]?.trim() || 'Candidate',
        email: (parts[1] || parts[0])?.trim()
      };
    });

    const res = await apiFetch<any>(`/api/tests/${id}/links/bulk`, {
      method: 'POST',
      body: JSON.stringify({ candidates })
    });
    setBulkLinks(res.invitations);
    setBulkInput('');
    apiFetch<any>(`/api/tests/${id}`).then(setTest);
  }

  async function handleBatchInvite() {
    if (!id || !selectedBatchId) return;
    const batchData = await apiFetch<any>(`/api/batches/${selectedBatchId}`);
    const res = await apiFetch<any>(`/api/tests/${id}/links/bulk`, {
      method: 'POST',
      body: JSON.stringify({ candidates: batchData.candidates })
    });
    setBulkLinks(res.invitations);
    apiFetch<any>(`/api/tests/${id}`).then(setTest);
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
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Invite candidate</h2>
            <p className="text-sm text-slate-500">Add a single candidate to generate a link.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input placeholder="Name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <input placeholder="Email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              <button onClick={generateLink} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Generate link</button>
            </div>
            {linkInfo && (
              <p className="mt-3 text-sm text-slate-700">
                Link: <span className="font-mono text-blue-700">{`${window.location.origin}/attempt/${linkInfo.token}`}</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Invite from Batch</h2>
            <p className="text-sm text-slate-500">Select a pre-configured candidate batch to send invitations.</p>
            <div className="mt-3 flex gap-3">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a batch...</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.candidates?.length || 0} candidates)</option>)}
              </select>
              <button
                onClick={handleBatchInvite}
                disabled={!selectedBatchId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                Invite Batch
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Direct Bulk Invite</h2>
            <p className="text-sm text-slate-500">Paste names and emails (one per line, e.g. "John Doe, john@example.com")</p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Name, email&#10;Name, email"
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button onClick={handleBulkInvite} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800">Invite candidates</button>

            {bulkLinks.length > 0 && (
              <div className="mt-4 max-h-40 overflow-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Generated Links</p>
                {bulkLinks.map((inv, idx) => (
                  <div key={idx} className="text-xs mb-1">
                    <span className="font-semibold">{inv.name}:</span>
                    <span className="ml-1 text-blue-700 break-all">{`${window.location.origin}/attempt/${inv.token}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    apiFetch<any[]>('/api/batches').then(setBatches).catch(() => setBatches([]));
  }, []);

  async function createBatch() {
    if (!name.trim()) return;
    const created = await apiFetch<any>('/api/batches', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
    setBatches((prev) => [created, ...prev]);
    setName('');
    setDescription('');
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Logistics</p>
            <h1 className="text-2xl font-semibold text-slate-900">Candidate Batches</h1>
          </div>
          <button onClick={createBatch} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Create batch</button>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">New batch</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Batch Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend Leads Jan 2026" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Link key={b.id} to={`/batches/${b.id}`} className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900">{b.name}</p>
                <Badge tone="neutral">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{b.description || 'No description provided'}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Created: {formatDate(b.createdAt)}</span>
                <span className="font-semibold text-blue-600 group-hover:underline">Manage candidates →</span>
              </div>
            </Link>
          ))}
          {batches.length === 0 && <div className="md:col-span-2 lg:col-span-3"><EmptyState title="No batches yet" description="Create a batch to start organizing your candidates." /></div>}
        </div>
      </div>
    </Layout>
  );
}

function BatchDetail() {
  const { id } = useParams();
  const [batch, setBatch] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);

  async function loadBatch() {
    if (!id) return;
    const res = await apiFetch<any>(`/api/batches/${id}`);
    setBatch(res);
    setCandidates(res.candidates || []);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFiles(Array.from(e.target.files));
    } else {
      setResumeFiles([]);
    }
  }

  useEffect(() => {
    loadBatch();
  }, [id]);

  async function addCandidate() {
    if (!id || !candidateName || !candidateEmail) return;
    await apiFetch('/api/candidates', {
      method: 'POST',
      body: JSON.stringify({ candidateName, candidateEmail, batchId: id })
    });
    setCandidateName('');
    setCandidateEmail('');
    loadBatch();
  }

  async function handleBulkUpload() {
    if (!id || !bulkInput.trim()) return;
    const lines = bulkInput.split('\n').filter((l) => l.trim());
    const list = lines.map((line) => {
      const parts = line.split(/[,\t]/);
      return { name: parts[0]?.trim(), email: (parts[1] || parts[0])?.trim() };
    });
    await apiFetch('/api/candidates/bulk', {
      method: 'POST',
      body: JSON.stringify({ batchId: id, candidates: list })
    });
    setBulkInput('');
    setShowBulk(false);
    loadBatch();
  }

  async function handleAiParse() {
    if (!bulkInput.trim() && resumeFiles.length === 0) {
      alert('Please paste resume text OR select files.');
      return;
    }
    setIsParsing(true);
    try {
      if (resumeFiles.length > 0) {
        if (!id) return;
        const formData = new FormData();
        formData.append('batchId', id);
        resumeFiles.forEach(f => formData.append('files', f));

        const res = await apiFetch<any>('/api/candidates/import/cv-bulk', {
          method: 'POST',
          body: formData
        });

        if (res.success) {
          alert(`Successfully added ${res.count} candidates from files.`);
          setResumeFiles([]);
          setShowBulk(false);
          loadBatch();
        } else {
          alert('Partial success or no candidates found.');
        }

      } else {
        const data = await apiFetch<any>('/api/candidates/parse-cv', {
          method: 'POST',
          body: JSON.stringify({ text: bulkInput })
        });
        setCandidateName(data.name || '');
        setCandidateEmail(data.email || '');
        setShowBulk(false);
      }
    } catch (e: any) {
      alert('AI Parsing failed: ' + e.message);
    } finally {
      setIsParsing(false);
    }
  }

  if (!batch) return <Layout><p className="py-10 text-center text-slate-500 text-sm">Loading batch details...</p></Layout>;

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Batch management</p>
            <h1 className="text-2xl font-semibold text-slate-900">{batch.name}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(!showBulk)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              {showBulk ? 'Hide Import' : 'Bulk / AI Import'}
            </button>
          </div>
        </div>

        {showBulk && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-blue-900">Bulk Import & AI Parsing</h2>
            <p className="text-xs text-blue-700">Paste CSV list or Resume text, OR upload files (PDF/DOCX).</p>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={5}
              className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Full Resume Text... OR ... Name, Email"
            />

            <div className="mt-3">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
              {resumeFiles.length > 0 && <p className="mt-1 text-xs font-medium text-green-600">Selected: {resumeFiles.length} file(s)</p>}
            </div>

            <div className="mt-4 flex gap-2">
              <button disabled={isParsing} onClick={handleBulkUpload} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50">
                Process as CSV
              </button>
              <button disabled={isParsing} onClick={handleAiParse} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50">
                {isParsing ? 'AI Parsing...' : 'Parse (AI)'}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Manual Entry</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input placeholder="Name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <input placeholder="Email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <button onClick={addCandidate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700">Add to batch</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">IN BATCH</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {candidates.length === 0 && <EmptyState title="No candidates" description="Add candidates to this batch manually or via CSV/CV." />}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Batch Info</h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{batch.description || 'No description provided.'}</p>
              <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                <p className="text-xs text-slate-500">Total Count: <span className="font-semibold text-slate-800">{candidates.length}</span></p>
                <p className="text-xs text-slate-500">Created: <span className="font-semibold text-slate-800">{formatDate(batch.createdAt)}</span></p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-50 bg-white p-4 shadow-sm ring-1 ring-blue-50">
              <h3 className="text-sm font-semibold text-blue-900">Next Step</h3>
              <p className="mt-1 text-xs text-blue-700">Link this batch to an active assessment in the Tests control center.</p>
              <Link to="/tests" className="mt-3 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700">Go to Tests</Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
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
          <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'text-blue-700' : 'hover:text-blue-600')}>
            Settings
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
  const [isCreating, setIsCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    schemaName: '',
    creditsBalance: 100,
    adminEmail: '',
    adminPassword: ''
  });

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

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created = await apiFetch<AdminOrg>('/api/admin/orgs', {
        method: 'POST',
        body: JSON.stringify(newOrg)
      });
      setOrgs((prev) => [created, ...prev]);
      setIsCreating(false);
      setNewOrg({
        name: '',
        schemaName: '',
        creditsBalance: 100,
        adminEmail: '',
        adminPassword: ''
      });
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Platform control</p>
          <h1 className="text-2xl font-semibold text-slate-900">Organizations</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="neutral">{orgs.length} orgs</Badge>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            Create Organization
          </button>
        </div>
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

      {isCreating && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Create New Organization</h2>
              <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-slate-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateOrg} className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Organization Name</label>
                  <input
                    required
                    value={newOrg.name}
                    onChange={(e) => setNewOrg((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Schema Name (Optional)</label>
                  <input
                    value={newOrg.schemaName}
                    onChange={(e) => setNewOrg((prev) => ({ ...prev, schemaName: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. acme_corp"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Initial Credits</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={newOrg.creditsBalance}
                  onChange={(e) => setNewOrg((prev) => ({ ...prev, creditsBalance: parseInt(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-800">Admin User Account</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={newOrg.adminEmail}
                      onChange={(e) => setNewOrg((prev) => ({ ...prev, adminEmail: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="admin@acme.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Admin Password</label>
                    <input
                      type="password"
                      required
                      value={newOrg.adminPassword}
                      onChange={(e) => setNewOrg((prev) => ({ ...prev, adminPassword: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                >
                  Provision Organization
                </button>
              </div>
            </form>
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

function OrgUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState({ email: '', role: '', title: '', customRoleId: '' });

  async function loadData() {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        apiFetch<any[]>('/api/org/users'),
        apiFetch<any[]>('/api/org/roles')
      ]);
      setUsers(u);
      setRoles(r);
      if (r.length > 0) setInvite(prev => ({ ...prev, role: r[0].name, customRoleId: r[0].id }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/api/org/users/invite', {
        method: 'POST',
        body: JSON.stringify(invite)
      });
      setShowInvite(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team members</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          Invite member
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="grid grid-cols-4 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>User</span>
          <span>Role</span>
          <span>Terminology</span>
          <span>Joined</span>
        </div>
        <div className="divide-y">
          {users.map(u => (
            <div key={u.id} className="grid grid-cols-4 px-6 py-4 text-sm">
              <span className="font-medium">{u.email}</span>
              <span><Badge tone="neutral">{u.role}</Badge></span>
              <span className="text-slate-500">{u.title || '—'}</span>
              <span className="text-slate-500">{formatDate(u.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Invite new member</h2>
            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Email address</label>
                <input required type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold">Role</label>
                <select
                  value={invite.customRoleId}
                  onChange={e => {
                    const r = roles.find(x => x.id === e.target.value);
                    setInvite({ ...invite, customRoleId: e.target.value, role: r?.name || '' });
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold">Terminology (e.g. Senior HR)</label>
                <input type="text" value={invite.title} onChange={e => setInvite({ ...invite, title: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

import { SYSTEM_PERMISSIONS } from '@speakscore/shared';

function OrgRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', permissions: [] as string[] });

  async function loadRoles() {
    const res = await apiFetch<any[]>('/api/org/roles');
    setRoles(res);
  }

  useEffect(() => { loadRoles(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/org/roles', { method: 'POST', body: JSON.stringify(newRole) });
    setShowAdd(false);
    setNewRole({ name: '', permissions: [] });
    loadRoles();
  }

  const togglePerm = (p: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(p)
        ? prev.permissions.filter(x => x !== p)
        : [...prev.permissions, p]
    }));
  };

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
          <p className="text-sm text-slate-500">Define custom terminology and access levels for your team.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          Create custom role
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(r => (
          <div key={r.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{r.name}</h3>
              {r.is_system && <Badge tone="neutral">System</Badge>}
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {r.permissions.includes('*') ? (
                <Badge tone="success">Full Access</Badge>
              ) : (
                r.permissions.map((p: string) => <Badge key={p} tone="neutral">{p}</Badge>)
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Create custom role</h2>
            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Role Name (e.g. Junior Recruiter)</label>
                <input required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold">Permissions</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SYSTEM_PERMISSIONS.map(p => (
                    <label key={p} className="flex items-center gap-2 rounded-lg border p-2 text-xs hover:bg-slate-50">
                      <input type="checkbox" checked={newRole.permissions.includes(p)} onChange={() => togglePerm(p)} />
                      {p.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow">Create role</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
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

function AdminSettingsPage() {
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


function TemplatesPage() {
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tests" element={<ProtectedRoute><TestsList /></ProtectedRoute>} />
      <Route path="/tests/:id" element={<ProtectedRoute><TestDetail /></ProtectedRoute>} />
      <Route path="/batches" element={<ProtectedRoute><BatchesPage /></ProtectedRoute>} />
      <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
      <Route path="/candidates" element={<ProtectedRoute><CandidatesPage /></ProtectedRoute>} />
      <Route path="/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
      <Route path="/org/users" element={<ProtectedRoute><OrgUsersPage /></ProtectedRoute>} />
      <Route path="/org/roles" element={<ProtectedRoute><OrgRolesPage /></ProtectedRoute>} />
      <Route path="/org/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
      <Route path="/admin/orgs" element={<AdminRoute><AdminOrganizationsPage /></AdminRoute>} />
      <Route path="/admin/orgs/:id" element={<AdminRoute><AdminOrgDetailPage /></AdminRoute>} />
      <Route path="/admin/logs" element={<AdminRoute><AdminLogsPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />
      <Route path="/attempt/:token" element={<AttemptPage />} />
    </Routes>
  );
}
