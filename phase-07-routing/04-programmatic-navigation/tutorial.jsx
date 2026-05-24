// ============================================================
// Topic:   Programmatic Navigation
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial programmatic-navigation
//
// APPROACH: Three scenarios that mirror real production code.
//   Exercise 1 — push vs replace: see the history stack grow or collapse.
//   Exercise 2 — navigation state + the navigate(-1) off-site risk.
//   Exercise 3 — the canonical redirect-back-after-login pattern.
//
// Each exercise shows a history log so you can SEE what happens
// to the stack. In a real BrowserRouter, this is your browser's
// Back button history.
// ============================================================

import { useState, useCallback } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, useNavigate, useLocation, Navigate,
} from 'react-router-dom';

// ─── Shared utilities ─────────────────────────────────────────
function URLBar() {
  const { pathname, search } = useLocation();
  return <div style={s.urlBar}>📍 {pathname}{search}</div>;
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — push vs { replace: true }
//
// navigate('/path')              → push:    new history entry. Back works.
// navigate('/path', {replace:true}) → replace: overwrites current entry. Back skips it.
//
// The history log shows you the current stack. Watch how it grows
// differently with push vs replace.
//
// OBSERVE:
//   Mode: PUSH
//   1. Click "Go to Page B" → stack: [A, B]
//   2. Click "Go to Page C" → stack: [A, B, C]
//   3. Click "Go Back"      → stack: [A, B] ← back to B
//
//   Mode: REPLACE
//   1. Click "Go to Page B" → stack: [B]   (A is gone!)
//   2. Click "Go to Page C" → stack: [C]   (B is gone!)
//   3. Click "Go Back"      → goes to whatever was before Page A
//
// When to use replace:
//   ✅ After login (don't keep login page in history)
//   ✅ After form submit (prevent re-submit on Back)
//   ✅ Auth redirects
//   ❌ Normal link-style navigation (user should be able to go Back)
//
// CHECK YOURSELF:
//   After a successful login, should you push or replace to /dashboard?
//   Answer: replace — Back from /dashboard should not return to /login.
// ─────────────────────────────────────────────────────────────

function HistoryDemo() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [log, setLog] = useState(['/ (start)']);
  const [useReplace, setUseReplace] = useState(false);

  function go(path) {
    const opts = useReplace ? { replace: true } : undefined;
    navigate(path, opts);
    setLog(prev => {
      if (useReplace) {
        // Replace overwrites the last entry
        return [...prev.slice(0, -1), `${path} (replaced)`];
      }
      return [...prev, path];
    });
  }

  function goBack() {
    navigate(-1);
    setLog(prev => [...prev.slice(0, -1)]);
  }

  const pages = ['/page-a', '/page-b', '/page-c', '/page-d'];

  return (
    <div>
      <URLBar />
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={useReplace} onChange={e => setUseReplace(e.target.checked)} />
        <span style={{ color: useReplace ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
          {useReplace ? '⚠️ navigate(path, { replace: true })' : '✅ navigate(path) — default push'}
        </span>
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {pages.map(p => (
          <button key={p} onClick={() => go(p)} style={{ ...s.btn, background: location.pathname === p ? '#3b82f6' : '#e2e8f0', color: location.pathname === p ? '#fff' : '#1e293b' }}>
            Go to {p}
          </button>
        ))}
        <button onClick={goBack} style={{ ...s.btn, marginLeft: 'auto' }}>← Go Back</button>
      </div>

      {/* History stack visualization */}
      <div style={{ fontSize: 13, background: '#0f172a', color: '#94a3b8', borderRadius: 6, padding: 10 }}>
        <div style={{ color: '#64748b', marginBottom: 4, fontSize: 11 }}>HISTORY STACK (top = current)</div>
        {[...log].reverse().map((entry, i) => (
          <div key={i} style={{ color: i === 0 ? '#38bdf8' : '#64748b', fontFamily: 'monospace' }}>
            {i === 0 ? '▶ ' : '  '}{entry}
          </div>
        ))}
      </div>

      <Routes>
        {pages.map(p => (
          <Route key={p} path={p} element={
            <div style={{ ...s.page, marginTop: 8 }}>
              <strong>{p}</strong>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                This page was {useReplace ? 'pushed with replace — Back skips it' : 'pushed — Back returns here'}.
              </div>
            </div>
          } />
        ))}
        <Route path="/" element={<div style={{ ...s.page, marginTop: 8, background: '#f0f9ff' }}>🏠 Start here</div>} />
      </Routes>
    </div>
  );
}

function Exercise1() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <HistoryDemo />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Navigation state + the navigate(-1) risk
//
// PART A — Navigation state (useLocation().state):
//   You can carry arbitrary data through a navigation invisibly.
//   The data is NOT in the URL — it's in the browser history entry.
//   It disappears on page refresh / direct link.
//
// PART B — navigate(-1) can go off-site:
//   If the user opened your app in a fresh tab with no prior history,
//   navigate(-1) exits your SPA entirely.
//   Guard: window.history.length > 1 (though unreliable in SPAs;
//   better to track "can go back" in your own app state).
//
// OBSERVE (Part A):
//   Click "Go to Detail with state". The detail page shows the
//   referral source passed via navigate state — invisible in the URL.
//   Then click "Simulate refresh" — state is gone (null).
//
// OBSERVE (Part B):
//   The Back button shows whether there's history to go back to.
//   In a fresh tab with no prior history, navigate(-1) would
//   take you to the browser's previous page (maybe a search engine).
//
// CHECK YOURSELF:
//   You pass { from: 'email-link' } in navigation state.
//   Can the user bookmark a URL and share this state with a colleague?
//   Answer: No — navigation state is not in the URL. Never use it
//   for state that needs to be shareable or survive refresh.
// ─────────────────────────────────────────────────────────────

function NavStateDemo() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [simulatedRefresh, setSimulatedRefresh] = useState(false);

  // The state we received via navigate('/detail', { state: { from: '...' } })
  const receivedState = simulatedRefresh ? null : location.state;

  return (
    <div>
      <URLBar />
      <Routes>
        <Route path="/" element={
          <div>
            <div style={s.page}>
              <strong>Source Page</strong>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/detail', { state: { from: 'email-link', timestamp: Date.now() } })}
                  style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}
                >
                  Go to Detail (with state)
                </button>
                <button
                  onClick={() => navigate('/detail')}
                  style={s.btn}
                >
                  Go to Detail (no state)
                </button>
              </div>
            </div>
          </div>
        } />

        <Route path="/detail" element={
          <div style={s.page}>
            <strong>Detail Page</strong>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              <div style={{ marginBottom: 6 }}>
                <strong>location.state:</strong>{' '}
                <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>
                  {receivedState ? JSON.stringify(receivedState) : 'null'}
                </code>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setSimulatedRefresh(r => !r)} style={{ ...s.btn, color: simulatedRefresh ? '#ef4444' : '#059669' }}>
                  {simulatedRefresh ? '↺ Undo simulated refresh' : '🔄 Simulate refresh (clears state)'}
                </button>
                <button
                  onClick={() => {
                    // ⚠️ Guard: in a real app check window.history.length > 1
                    // or track your own navigation stack
                    const canGoBack = true; // always true here since we navigated here
                    if (canGoBack) navigate(-1);
                    else navigate('/', { replace: true }); // fallback
                  }}
                  style={s.btn}
                >
                  ← Go Back (with guard)
                </button>
                <Link to="/" style={{ ...s.btn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  🏠 Go Home (Link — no navigate call needed)
                </Link>
              </div>
            </div>
          </div>
        } />
      </Routes>

      <div style={{ marginTop: 10, fontSize: 12, color: '#555', background: '#f8fafc', padding: '8px 10px', borderRadius: 4 }}>
        <strong>State vs URL:</strong> Navigation state is invisible in the URL bar and gone on refresh.
        Use it for ephemeral context only ("where did this nav come from?").
        For state that needs to survive refresh or be shareable, use search params.
      </div>
    </div>
  );
}

function Exercise2() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <NavStateDemo />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — The canonical redirect-back-after-login pattern
//
// Flow:
//   1. User visits /dashboard (protected)
//   2. Not authenticated → redirect to /login with state: { from: location }
//   3. User logs in
//   4. Redirect to location.state.from.pathname (or /dashboard as fallback)
//   Both redirects use { replace: true } to keep history clean.
//
// Without replace: history would be:
//   /dashboard → /login → /dashboard  (back goes to /login → redirects again)
//
// With replace: history becomes just:
//   /dashboard  (back from /dashboard goes to wherever the user was before all this)
//
// OBSERVE:
//   1. Click "Go to Dashboard" while logged out.
//      Redirected to /login. Note the URL still shows /login.
//   2. Click "Login". Redirected back to /dashboard.
//   3. Click Logout. Then go to /profile and try again.
//      After login, you land on /profile — not /dashboard.
//
// CHECK YOURSELF:
//   Why do BOTH navigate calls use { replace: true }?
//   The first: /login should not be in the stack after auth succeeds.
//   The second: /login (again) should not be in the stack after landing on /from.
// ─────────────────────────────────────────────────────────────

// Simulated auth context (in real apps, use Context + API)
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const login  = useCallback(() => setIsAuthenticated(true),  []);
  const logout = useCallback(() => setIsAuthenticated(false), []);
  return { isAuthenticated, login, logout };
}

// The guard: layout route with no path
function RequireAuth({ isAuthenticated }) {
  const location = useLocation();
  if (!isAuthenticated) {
    // Pass the current location as state so /login knows where to send us back
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return (
    <div style={{ border: '2px solid #22c55e', borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 4 }}>[ protected zone — authenticated ✅ ]</div>
      {/* Outlet would go here in a real app — we're rendering children directly for simplicity */}
    </div>
  );
}

function LoginPage({ login }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Where to go after login — falls back to /dashboard if no "from" in state
  const from = location.state?.from?.pathname ?? '/dashboard';

  function handleLogin() {
    login();
    navigate(from, { replace: true }); // replace: /login should not appear in history
  }

  return (
    <div style={s.page}>
      <strong>🔐 Login</strong>
      <div style={{ fontSize: 13, color: '#555', margin: '6px 0' }}>
        You'll be sent to: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{from}</code>
        {location.state?.from
          ? ' (remembered from redirect)'
          : ' (default fallback — no "from" in state)'}
      </div>
      <button onClick={handleLogin} style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>
        Log In
      </button>
    </div>
  );
}

function RedirectBackDemo() {
  const { isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <URLBar />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: isAuthenticated ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
          {isAuthenticated ? '✅ Logged in' : '❌ Logged out'}
        </span>
        {isAuthenticated
          ? <button onClick={() => { logout(); navigate('/'); }} style={{ ...s.btn, color: '#ef4444' }}>Logout</button>
          : null}
        <button onClick={() => navigate('/dashboard')} style={s.btn}>Go to /dashboard</button>
        <button onClick={() => navigate('/profile')} style={s.btn}>Go to /profile</button>
        <button onClick={() => navigate('/')} style={s.btn}>Go to /</button>
      </div>

      <Routes>
        <Route path="/" element={<div style={s.page}>🏠 <strong>Home</strong> (public)</div>} />
        <Route path="/login" element={<LoginPage login={login} />} />

        {/* Protected routes use RequireAuth as a guard */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated
              ? <div style={{ ...s.page, background: '#f0fdf4' }}>📊 <strong>Dashboard</strong> — protected content</div>
              : <Navigate to="/login" state={{ from: { pathname: '/dashboard' } }} replace />
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated
              ? <div style={{ ...s.page, background: '#f0f9ff' }}>👤 <strong>Profile</strong> — protected content</div>
              : <Navigate to="/login" state={{ from: { pathname: '/profile' } }} replace />
          }
        />
      </Routes>
    </div>
  );
}

function Exercise3() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <RedirectBackDemo />
    </MemoryRouter>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a multi-step wizard using navigate() with state:
//   Step 1 /wizard/name   → collect name
//   Step 2 /wizard/email  → collect email, receive name from state
//   Step 3 /wizard/done   → show name + email, both from state
//
// Each step navigates to the next with { state: { ...prevState, newField } }.
// The Back button should take the user to the previous step with their
// previous data still visible (it's in the history entry's state).
//
// Hint: useLocation().state at each step.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      Build a 3-step wizard that passes data forward via navigation state.
      Bonus: add a "Back" button that reads state from the previous entry.
      What happens to the state if the user refreshes on Step 2?
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  urlBar: { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', padding: '4px 10px', marginBottom: 8, borderRadius: 4 },
  page:   { background: '#f8fafc', borderRadius: 4, padding: 10, fontSize: 14, border: '1px solid #e2e8f0', marginBottom: 4 },
  btn:    { padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12 },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 660 }}>
      <h1 style={t.h1}>Programmatic Navigation</h1>
      <p style={t.meta}>
        Exercise 1: history stack — push vs replace.
        Exercise 2: navigation state + the navigate(-1) risk.
        Exercise 3: redirect-back-after-login.
      </p>

      <h2 style={t.h2}>Exercise 1 — push vs replace: watch the history stack</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — Navigation state + navigate(-1) risk</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — Redirect-back-after-login (the canonical pattern)</h2>
      <Exercise3 />

      <h2 style={t.h2}>Playground</h2>
      <Playground />
    </div>
  );
}

const t = {
  h1:   { fontSize: 20, marginBottom: 4 },
  h2:   { fontSize: 15, marginTop: 28, marginBottom: 6 },
  meta: { color: '#666', fontSize: 13, marginBottom: 20 },
};
