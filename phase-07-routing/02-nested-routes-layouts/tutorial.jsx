// ============================================================
// Topic:   Nested Routes & Layouts
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial nested-routes-layouts
//
// APPROACH: Build → observe → deliberately break.
//   Exercise 1 is a 3-level layout tree you navigate through —
//   each level has its own Outlet. Exercise 2 isolates the two
//   most common gotchas. Exercise 3 shows Outlet context,
//   the lightweight data-pass from layout to children.
// ============================================================

import { useState } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, NavLink, Outlet,
  useLocation, useOutletContext,
} from 'react-router-dom';

// ─── Shared utilities ─────────────────────────────────────────
function URLBar() {
  const { pathname } = useLocation();
  return <div style={s.urlBar}>📍 {pathname}</div>;
}

function Breadcrumb({ path }) {
  return (
    <div style={s.breadcrumb}>
      {path.map((seg, i) => (
        <span key={i}>
          {i > 0 && ' › '}
          <span style={{ color: i === path.length - 1 ? '#1e293b' : '#64748b' }}>{seg}</span>
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — 3-level layout tree
//
// URL structure:
//   /                         → AppLayout > index (Home)
//   /users                    → AppLayout > UsersSection > UserList (index)
//   /users/:id                → AppLayout > UsersSection > UserDetail
//   /users/:id/settings       → AppLayout > UsersSection > UserDetail > UserSettings
//
// Render order: AppLayout renders, its <Outlet> renders UsersSection,
// its <Outlet> renders UserDetail, its <Outlet> renders UserSettings.
//
// OBSERVE:
//   Navigate through the links and watch the breadcrumb build up.
//   Each level's shell stays on screen while only the Outlet content swaps.
//
// TODO #1 (break it):
//   In UsersSection, comment out <Outlet />.
//   Navigate to /users/1. The user list nav disappears — correct.
//   But navigate to /users — UsersSection renders, then nothing.
//   Every level in the tree needs its own <Outlet>.
//
// TODO #2 (break it):
//   Remove the `index` route inside UsersSection.
//   Navigate to /users. The section shell renders but the Outlet is empty —
//   no default content for the parent path.
//
// CHECK YOURSELF:
//   /users/1/settings: how many elements are on screen simultaneously?
//   Answer: 4 — AppLayout, UsersSection, UserDetail, UserSettings.
// ─────────────────────────────────────────────────────────────

// Level 1: top-level app shell
function AppLayout() {
  const linkCss = ({ isActive }) => ({
    ...s.navLink,
    color: isActive ? '#38bdf8' : '#94a3b8',
    fontWeight: isActive ? 700 : 400,
  });
  return (
    <div style={s.level1}>
      <Breadcrumb path={['App']} />
      <nav style={s.nav}>
        <NavLink to="/" style={linkCss} end>Home</NavLink>
        <NavLink to="/users" style={linkCss}>Users</NavLink>
        <NavLink to="/settings" style={linkCss}>Settings</NavLink>
      </nav>
      <URLBar />
      {/* Level 1 → Level 2 renders here */}
      <Outlet />
    </div>
  );
}

// Level 2: users section with its own nav
function UsersSection() {
  return (
    <div style={s.level2}>
      <Breadcrumb path={['App', 'Users']} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 13 }}>
        <Link to="/users/1" style={s.link}>User #1</Link>
        <Link to="/users/2" style={s.link}>User #2</Link>
        <Link to="/users/3" style={s.link}>User #3</Link>
        <Link to="/users" style={{ ...s.link, color: '#64748b' }}>← User List</Link>
      </div>
      {/* Level 2 → Level 3 renders here */}
      <Outlet />
    </div>
  );
}

// Level 2 index: default view at /users
function UserList() {
  return (
    <div style={s.content}>
      <strong>👥 User List</strong>
      <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>
        Select a user above. This index route fills the Outlet at /users.
      </p>
    </div>
  );
}

// Level 3: user detail — has its own Outlet for /users/:id/settings
function UserDetail() {
  const { pathname } = useLocation();
  const userId = pathname.split('/')[2]; // quick extract for demo

  return (
    <div style={s.level3}>
      <Breadcrumb path={['App', 'Users', `User #${userId}`]} />
      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <Link to={`/users/${userId}/settings`} style={s.link}>⚙️ Settings</Link>
        {'  ·  '}
        <Link to={`/users/${userId}`} style={{ ...s.link, color: '#64748b' }}>Overview</Link>
      </div>
      {/* Level 3 → Level 4 renders here (or empty if no child matches) */}
      <Outlet />
      {/* UserDetail's own content — always visible at this level */}
      <div style={s.content}>
        <strong>👤 User #{userId} Detail</strong>
        <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>
          User detail renders here. Settings fills the Outlet above when matched.
        </p>
      </div>
    </div>
  );
}

// Level 4: settings nested inside a specific user
function UserSettings() {
  const { pathname } = useLocation();
  const userId = pathname.split('/')[2];
  return (
    <div style={s.content}>
      <strong>⚙️ Settings for User #{userId}</strong>
      <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>
        Deepest level — nested inside UserDetail's Outlet.
        Full path: /users/{userId}/settings
      </p>
    </div>
  );
}

function Exercise1() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<div style={s.content}>🏠 <strong>Home</strong> — index at "/"</div>} />
          <Route path="settings" element={<div style={s.content}>⚙️ <strong>App Settings</strong></div>} />

          {/* UsersSection is a "URL layout route" — it has a path AND children */}
          <Route path="users" element={<UsersSection />}>
            <Route index element={<UserList />} />
            <Route path=":id" element={<UserDetail />}>
              {/* :id has its own child — another level of nesting */}
              <Route path="settings" element={<UserSettings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Two gotchas side by side
//
// GOTCHA A: Layout route (no path) vs route with path="/"
//   They look similar. The difference: a route with path="/" only
//   wraps routes that start with "/". A pathless route wraps
//   whatever children you give it — including /login, /register,
//   routes that don't start with "/app", etc.
//
// GOTCHA B: Missing /* on parent when using nested <Routes>
//   If a parent route renders its own <Routes> inside the element
//   (not via `children`), you MUST add /* to the parent path.
//   With `children` in the object config, this is handled automatically.
//
// OBSERVE:
//   Toggle the "Broken" switch. Shell disappears for /login because
//   the broken version uses path="/" which only matches "/" and its
//   children, not standalone /login.
//
// CHECK YOURSELF:
//   Can you have two pathless layout routes as siblings? Yes or no?
//   Yes — they're structural, not URL-based. Both can wrap different
//   sets of routes at the same URL level.
// ─────────────────────────────────────────────────────────────

function Shell({ label, color }) {
  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: 6, padding: 8, margin: '4px 0' }}>
      <div style={{ fontSize: 12, color, marginBottom: 4 }}>[ {label} shell ]</div>
      <Outlet />
    </div>
  );
}

function Exercise2() {
  const [broken, setBroken] = useState(false);

  return (
    <div>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={broken} onChange={e => setBroken(e.target.checked)} />
        Show broken version (path="/" instead of pathless)
      </label>
      <MemoryRouter initialEntries={['/login']} initialIndex={0}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
          <Link to="/" style={s.link}>/ (home)</Link>
          <Link to="/dashboard" style={s.link}>/dashboard</Link>
          <Link to="/login" style={s.link}>/login (no shell wanted)</Link>
        </div>
        <URLBar />
        <Routes>
          {broken ? (
            // ❌ BROKEN: path="/" only wraps routes at / and below.
            // /login is not a child of /, so it escapes the shell.
            // But wait — in v6, <Route path="/"> wraps all children
            // because "/" is a prefix. Actually this still wraps /login.
            // The real difference: pathless routes share styles/context
            // for routes that share NO common URL prefix (e.g., /admin + /settings).
            <>
              <Route path="/" element={<Shell label="path='/'" color="#ef4444" />}>
                <Route index element={<div style={s.content}>🏠 Home</div>} />
                <Route path="dashboard" element={<div style={s.content}>📊 Dashboard</div>} />
              </Route>
              {/* /login is OUTSIDE the shell — correct in both versions */}
              <Route path="login" element={<div style={s.content}>🔐 Login (no shell — public page)</div>} />
            </>
          ) : (
            // ✅ CORRECT: pathless layout route wraps only the routes
            // you give it as children. /login is excluded from the shell.
            <>
              <Route element={<Shell label="pathless layout" color="#22c55e" />}>
                <Route index element={<div style={s.content}>🏠 Home</div>} />
                <Route path="dashboard" element={<div style={s.content}>📊 Dashboard</div>} />
              </Route>
              <Route path="login" element={<div style={s.content}>🔐 Login (no shell)</div>} />
            </>
          )}
        </Routes>
      </MemoryRouter>
      <p style={{ fontSize: 12, color: '#555', margin: '6px 0 0' }}>
        Key insight: the pathless layout route lets you apply a shell to routes
        that share <em>no URL prefix</em> — purely a structural grouping.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Outlet context: layout → children data handoff
//
// <Outlet context={value} /> passes data to the rendered child
// without a separate Context Provider. The child reads it with
// useOutletContext().
//
// WHEN TO USE:
//   Layout-specific data that children need but that doesn't
//   belong in global context — e.g., the current user object
//   fetched in a dashboard layout.
//
// WHEN NOT TO USE:
//   Deeply nested trees, data needed by many unrelated components,
//   or data with a lifecycle (auth state). Use React context for those.
//
// OBSERVE:
//   All three child routes receive the user without prop drilling.
//   Change the user name in the input — all pages update instantly.
//
// TODO:
//   Try accessing useOutletContext() in a component that is NOT
//   rendered inside this Outlet. What does React throw?
//   Answer: "useOutletContext called outside of Outlet" error.
//
// CHECK YOURSELF:
//   Why is Outlet context not a replacement for React context?
// ─────────────────────────────────────────────────────────────

function DashboardLayout({ user, setUser }) {
  const linkCss = ({ isActive }) => ({
    ...s.navLink,
    color: isActive ? '#38bdf8' : '#94a3b8',
    fontWeight: isActive ? 700 : 400,
  });
  return (
    <div style={s.level1}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#555' }}>Logged in as:</span>
        <input
          value={user.name}
          onChange={e => setUser({ ...user, name: e.target.value })}
          style={{ fontSize: 13, padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1', width: 140 }}
        />
      </div>
      <nav style={s.nav}>
        <NavLink to="/" style={linkCss} end>Home</NavLink>
        <NavLink to="/profile" style={linkCss}>Profile</NavLink>
        <NavLink to="/billing" style={linkCss}>Billing</NavLink>
      </nav>
      <URLBar />
      {/* user object travels to any child that calls useOutletContext() */}
      <Outlet context={{ user }} />
    </div>
  );
}

// Each child pulls data from the Outlet context — no props needed
function ProfilePage() {
  const { user } = useOutletContext();
  return (
    <div style={s.content}>
      <strong>Profile</strong>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
        Editing profile for: <strong>{user.name}</strong>
      </div>
    </div>
  );
}

function BillingPage() {
  const { user } = useOutletContext();
  return (
    <div style={s.content}>
      <strong>Billing</strong>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
        Billing account: <strong>{user.name}</strong>
      </div>
    </div>
  );
}

function Exercise3() {
  const [user, setUser] = useState({ name: 'Alice', role: 'admin' });

  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <Routes>
        <Route
          path="/"
          // Pass user+setUser as props because DashboardLayout is not
          // itself a route child — it owns the Outlet.
          element={<DashboardLayout user={user} setUser={setUser} />}
        >
          <Route
            index
            element={
              // Even the index route can use Outlet context
              <DashboardHome />
            }
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function DashboardHome() {
  const { user } = useOutletContext();
  return (
    <div style={s.content}>
      <strong>Dashboard Home</strong>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
        Welcome back, <strong>{user.name}</strong>! ({user.role})
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a 4-level route tree without looking at the notes:
//   /admin                    → AdminLayout (sidebar nav)
//   /admin/users              → UserSection (users sub-nav)
//   /admin/users              → UserList (index)
//   /admin/users/:id          → UserDetail
//   /admin/users/:id/edit     → UserEdit
//
// Requirements:
//   • AdminLayout passes { role: 'admin' } via Outlet context
//   • UserEdit reads the role from useOutletContext()
//   • All 4 levels show a Breadcrumb
//   • Missing any Outlet should blank out all children below it
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      Build the 4-level admin tree (see instructions above).
      After it works: comment out the Outlet in UserDetail and confirm
      UserEdit disappears but UserDetail still shows.
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  nav:        { background: '#1e293b', padding: '8px 12px', display: 'flex', gap: 4, marginBottom: 4 },
  navLink:    { textDecoration: 'none', marginRight: 12, fontSize: 13 },
  urlBar:     { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', padding: '4px 10px', marginBottom: 8 },
  breadcrumb: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  level1:     { border: '2px solid #3b82f6', borderRadius: 6, padding: 10, marginBottom: 8 },
  level2:     { border: '2px solid #8b5cf6', borderRadius: 6, padding: 10, marginBottom: 4 },
  level3:     { border: '2px solid #ec4899', borderRadius: 6, padding: 10, marginBottom: 4 },
  content:    { background: '#f8fafc', borderRadius: 4, padding: 10, fontSize: 14 },
  link:       { color: '#38bdf8', textDecoration: 'none' },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 660 }}>
      <h1 style={t.h1}>Nested Routes & Layouts</h1>
      <p style={t.meta}>
        Border colors indicate nesting depth: blue → purple → pink.
        Follow TODOs to break and fix each level.
      </p>

      <h2 style={t.h2}>Exercise 1 — 3-level layout tree with Outlet at every level</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — Pathless vs path="/" layout routes</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — Outlet context: data from layout to children</h2>
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
