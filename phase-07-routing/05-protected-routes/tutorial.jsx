// ============================================================
// Topic:   Protected Routes
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial protected-routes
//
// APPROACH: Build the pattern from scratch three times,
//   each version adding one critical layer.
//   Exercise 1 — RequireAuth: the idiomatic v6 layout-route guard.
//   Exercise 2 — The loading-state flash: why isLoading matters.
//   Exercise 3 — Role-based access: stacked guards, real RBAC.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, NavLink, Outlet, useLocation, useNavigate, Navigate,
} from 'react-router-dom';

// ─── Shared utilities ─────────────────────────────────────────
function URLBar() {
  const { pathname } = useLocation();
  return <div style={s.urlBar}>📍 {pathname}</div>;
}

function AuthControls({ user, login, logout, userOptions }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: user ? '#22c55e' : '#ef4444' }}>
        {user ? `✅ ${user.name} (${user.role})` : '❌ Not logged in'}
      </span>
      {user
        ? <button onClick={logout} style={{ ...s.btn, color: '#ef4444' }}>Logout</button>
        : userOptions.map(u => (
            <button key={u.name} onClick={() => login(u)} style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>
              Login as {u.name} ({u.role})
            </button>
          ))
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — RequireAuth: the idiomatic v6 guard
//
// Pattern: a pathless layout route that either renders <Outlet />
// (authenticated) or <Navigate> (not authenticated).
// It wraps any number of protected routes — one guard, many routes.
//
// This is DIFFERENT from wrapping each route element:
//   ❌ Verbose: <Route path="/x" element={<PrivateRoute><X /></PrivateRoute>} />
//   ✅ Idiomatic: one RequireAuth layout route wrapping all protected children
//
// OBSERVE:
//   1. Start logged out. Click "Go to Dashboard" — redirected to /login.
//      Notice the URL shows /login and the "from" path is stored in state.
//   2. Click "Login as Alice". Redirected back to /dashboard.
//   3. Logout. Go to /settings. Then log in — you land on /settings.
//
// TODO:
//   Add a new protected route /reports inside RequireAuth.
//   You only need to add ONE route — no new guard code.
//   That's the power of the layout-route pattern.
//
// CHECK YOURSELF:
//   RequireAuth has no path. What URL does /dashboard correspond to?
//   Answer: /dashboard — the guard doesn't add a URL segment.
// ─────────────────────────────────────────────────────────────

function RequireAuth({ user }) {
  const location = useLocation();
  if (!user) {
    // Pass current location so /login knows where to send the user back
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

function LoginPage({ login, users }) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  return (
    <div style={s.page}>
      <strong>🔐 Login</strong>
      <div style={{ fontSize: 13, color: '#555', margin: '6px 0' }}>
        After login you'll be sent to: <code style={s.code}>{from}</code>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {users.map(u => (
          <button key={u.name} onClick={() => { login(u); navigate(from, { replace: true }); }}
            style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>
            Login as {u.name} ({u.role})
          </button>
        ))}
      </div>
    </div>
  );
}

function Exercise1() {
  const [user, setUser] = useState(null);
  const users = [{ name: 'Alice', role: 'admin' }, { name: 'Bob', role: 'user' }];

  return (
    <MemoryRouter initialEntries={['/dashboard']} initialIndex={0}>
      <AuthControls
        user={user}
        login={setUser}
        logout={() => setUser(null)}
        userOptions={users}
      />
      <URLBar />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
        <Link to="/" style={s.link}>/ (public)</Link>
        <Link to="/dashboard" style={s.link}>/dashboard</Link>
        <Link to="/settings" style={s.link}>/settings</Link>
        <Link to="/login" style={s.link}>/login</Link>
      </div>

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<div style={s.page}>🌐 <strong>Home</strong> — public</div>} />
        <Route path="/login" element={<LoginPage login={setUser} users={users} />} />

        {/*
          RequireAuth: pathless layout route.
          ALL children get the same guard — no repetition.
          Add more routes here without touching the guard logic.
        */}
        <Route element={<RequireAuth user={user} />}>
          <Route path="/dashboard" element={<div style={{ ...s.page, background: '#f0fdf4' }}>📊 <strong>Dashboard</strong> — protected</div>} />
          <Route path="/settings"  element={<div style={{ ...s.page, background: '#f0f9ff' }}>⚙️ <strong>Settings</strong> — protected</div>} />
          {/* TODO: add a /reports route here */}
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — The loading-state flash
//
// In real apps, auth state comes from an API call — it's not
// synchronously available. There are two failure modes:
//
// Version A (broken): isLoading is ignored.
//   If the default auth state is `false`, the user is briefly
//   redirected to /login before the real auth state loads.
//   If the default is `true`, protected content flashes before redirect.
//
// Version B (fixed): render a spinner while isLoading is true.
//   The UI stays neutral until we know the auth state.
//
// OBSERVE:
//   Toggle "Simulate auth loading delay" on.
//   In BROKEN mode: navigate to /dashboard — you briefly see the redirect
//   to /login before the auth check completes.
//   In FIXED mode: you see the spinner, then /dashboard loads directly.
//
// CHECK YOURSELF:
//   What are the two failure modes without a loading state?
//   1. Default false → redirect flash (user sees /login briefly)
//   2. Default true  → protected content flash (user sees content briefly)
// ─────────────────────────────────────────────────────────────

function RequireAuthWithLoading({ isAuthenticated, isLoading }) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
        ⏳ Checking auth…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login-v2" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function Exercise2() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [simulateDelay, setSimulateDelay]      = useState(false);
  const [broken, setBroken]                   = useState(false);

  function simulateLogin() {
    if (simulateDelay) {
      setIsLoading(true);
      setTimeout(() => { setIsAuthenticated(true); setIsLoading(false); }, 1200);
    } else {
      setIsAuthenticated(true);
    }
  }

  function logout() {
    setIsAuthenticated(false);
    setIsLoading(false);
  }

  const guard = broken
    ? // ❌ BROKEN: ignores loading state — may flash /login or protected content
      function RequireAuthBroken({ isAuthenticated }) {
        const location = useLocation();
        if (!isAuthenticated) return <Navigate to="/login-v2" state={{ from: location }} replace />;
        return <Outlet />;
      }
    : RequireAuthWithLoading;

  const GuardComponent = broken
    ? ({ children }) => {
        const location = useLocation();
        if (!isAuthenticated) return <Navigate to="/login-v2" state={{ from: location }} replace />;
        return <Outlet />;
      }
    : () => <RequireAuthWithLoading isAuthenticated={isAuthenticated} isLoading={isLoading} />;

  return (
    <MemoryRouter initialEntries={['/dashboard-v2']} initialIndex={0}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={broken} onChange={e => setBroken(e.target.checked)} />
          <span style={{ color: broken ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
            {broken ? '❌ Broken: no loading check' : '✅ Fixed: spinner while isLoading'}
          </span>
        </label>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={simulateDelay} onChange={e => setSimulateDelay(e.target.checked)} />
          <span>Simulate 1.2s auth delay</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isAuthenticated ? '#22c55e' : '#ef4444' }}>
          {isLoading ? '⏳ Loading auth…' : isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}
        </span>
        {isAuthenticated
          ? <button onClick={logout} style={{ ...s.btn, color: '#ef4444' }}>Logout</button>
          : <button onClick={simulateLogin} style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>
              Login{simulateDelay ? ' (with 1.2s delay)' : ''}
            </button>
        }
      </div>

      <URLBar />
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
        <Link to="/dashboard-v2" style={s.link}>/dashboard</Link>
        <Link to="/login-v2" style={s.link}>/login</Link>
      </div>

      <Routes>
        <Route path="/login-v2" element={
          <div style={s.page}>
            <strong>🔐 Login</strong>
            <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
              {broken && simulateDelay
                ? '⚠️ In broken mode with delay: you briefly see this page before being sent here, even if you should be authenticated.'
                : 'In fixed mode: you see a spinner at /dashboard until auth resolves, then land here only if truly unauthenticated.'}
            </div>
          </div>
        } />

        <Route element={<GuardComponent />}>
          <Route path="/dashboard-v2" element={
            <div style={{ ...s.page, background: '#f0fdf4' }}>
              📊 <strong>Dashboard</strong> — protected content<br />
              <span style={{ fontSize: 12, color: '#555' }}>You only see this if auth resolved to true.</span>
            </div>
          } />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Role-based access: stacked guards
//
// RBAC pattern: two guards stacked as layout routes.
//   RequireAuth → checks authentication
//   RequireRole → checks authorization (role whitelist)
//
// Route structure:
//   /           public
//   /user       authenticated (any role)
//   /admin      authenticated + role must be in ['admin']
//   /mod        authenticated + role must be in ['admin', 'mod']
//
// OBSERVE:
//   1. Login as Guest   → can only access /
//   2. Login as User    → can access / and /user, not /admin or /mod
//   3. Login as Mod     → can access / and /user and /mod, not /admin
//   4. Login as Admin   → can access everything
//
// The two guards compose because they're both layout routes.
// RequireAuth wraps all authenticated content.
// RequireRole wraps only the routes that need a specific role.
//
// CHECK YOURSELF:
//   Is client-side RBAC sufficient security? Why not?
//   Answer: No. The server must also enforce roles. Client-side
//   protection is UX, not security — JS is inspectable and modifiable.
// ─────────────────────────────────────────────────────────────

const USERS_EX3 = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob',   role: 'mod'   },
  { name: 'Carol', role: 'user'  },
];

function RoleGuard({ user, allowedRoles }) {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/rbac/login" state={{ from: location }} replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/rbac/forbidden" replace />;
  }
  return <Outlet />;
}

function Exercise3() {
  const [user, setUser] = useState(null);

  const roleColors = { admin: '#8b5cf6', mod: '#f59e0b', user: '#3b82f6', guest: '#94a3b8' };
  const roleColor = user ? roleColors[user.role] ?? '#94a3b8' : '#94a3b8';

  return (
    <MemoryRouter initialEntries={['/rbac']} initialIndex={0}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: user ? roleColor : '#ef4444' }}>
          {user ? `✅ ${user.name} — ${user.role}` : '❌ Not logged in (guest)'}
        </span>
        {user
          ? <button onClick={() => setUser(null)} style={{ ...s.btn, color: '#ef4444' }}>Logout</button>
          : USERS_EX3.map(u => (
              <button key={u.name} onClick={() => setUser(u)}
                style={{ ...s.btn, background: roleColors[u.role], color: '#fff' }}>
                {u.name} ({u.role})
              </button>
            ))
        }
      </div>

      <URLBar />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, flexWrap: 'wrap' }}>
        <Link to="/rbac" style={s.link}>/rbac (public)</Link>
        <Link to="/rbac/user" style={s.link}>/user (any auth)</Link>
        <Link to="/rbac/mod" style={s.link}>/mod (mod+admin)</Link>
        <Link to="/rbac/admin" style={s.link}>/admin (admin only)</Link>
      </div>

      <Routes>
        <Route path="/rbac">
          {/* Public */}
          <Route index element={<div style={s.page}>🌐 <strong>Public Home</strong> — no auth required</div>} />
          <Route path="login"     element={<div style={s.page}>🔐 <strong>Login page</strong> — log in above</div>} />
          <Route path="forbidden" element={<div style={{ ...s.page, background: '#fff1f2' }}>🚫 <strong>Forbidden</strong> — your role can't access that</div>} />

          {/* Authenticated only (any role) */}
          <Route element={<RoleGuard user={user} allowedRoles={['user', 'mod', 'admin']} />}>
            <Route path="user" element={<div style={{ ...s.page, background: '#f0f9ff' }}>👤 <strong>User Area</strong> — authenticated users only</div>} />

            {/* Mod + Admin only */}
            <Route element={<RoleGuard user={user} allowedRoles={['mod', 'admin']} />}>
              <Route path="mod" element={<div style={{ ...s.page, background: '#fef9c3' }}>🛡️ <strong>Mod Area</strong> — mod and admin</div>} />

              {/* Admin only */}
              <Route element={<RoleGuard user={user} allowedRoles={['admin']} />}>
                <Route path="admin" element={<div style={{ ...s.page, background: '#fae8ff' }}>👑 <strong>Admin Panel</strong> — admin only</div>} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a subscription-gated route:
//   Users have roles: free | pro | enterprise.
//   /dashboard/basic   → all authenticated users
//   /dashboard/reports → pro + enterprise only
//   /dashboard/api     → enterprise only
//
// When a free user tries /reports, don't send to /forbidden —
// instead show an UpgradePage that explains what they're missing.
// Hint: change RequireRole to accept a fallback element instead of
// always navigating to /forbidden.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      Build subscription-gated routes (free/pro/enterprise). Instead of
      /forbidden, show an UpgradePage component when the tier is insufficient.
      Hint: the guard component can render a fallback element directly
      instead of &lt;Navigate&gt; when role doesn't match.
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  urlBar: { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', padding: '4px 10px', marginBottom: 8, borderRadius: 4 },
  page:   { background: '#f8fafc', borderRadius: 4, padding: 10, fontSize: 14, border: '1px solid #e2e8f0', marginBottom: 4 },
  btn:    { padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12 },
  link:   { color: '#38bdf8', textDecoration: 'none' },
  code:   { background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace' },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 660 }}>
      <h1 style={t.h1}>Protected Routes</h1>
      <p style={t.meta}>
        Exercise 1: RequireAuth — the idiomatic v6 layout-route guard.
        Exercise 2: loading-state flash — why isLoading matters.
        Exercise 3: RBAC — stacked role guards.
      </p>

      <h2 style={t.h2}>Exercise 1 — RequireAuth: one guard wraps many routes</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — The loading-state flash (toggle broken vs fixed)</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — Role-based access: stacked guards</h2>
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
