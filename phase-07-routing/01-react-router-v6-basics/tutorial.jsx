// ============================================================
// Topic:   React Router v6 Basics
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial react-router-v6-basics
//
// APPROACH: Observation + deliberate breakage.
//   Each exercise is a working mini-SPA. A URLBar component shows
//   the current in-memory path as you navigate. Follow the TODO
//   comments to remove or change one thing at a time and watch what
//   breaks. Answer the CHECK YOURSELF questions before notes.md.
// ============================================================

import { useState } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, NavLink, Outlet, useLocation,
  createMemoryRouter, RouterProvider,
} from 'react-router-dom';

// ─── Shared utilities ─────────────────────────────────────────
// Shows the current URL inside any MemoryRouter context.
function URLBar() {
  const { pathname, search } = useLocation();
  return (
    <div style={s.urlBar}>
      📍 {pathname}{search}
    </div>
  );
}

function Page({ bg, icon, title, children }) {
  return (
    <div style={{ ...s.page, background: bg }}>
      {icon} <strong>{title}</strong>
      {children && <div style={{ marginTop: 6, fontSize: 13, color: '#444' }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — BrowserRouter fundamentals:
//              layout route · index route · NavLink `end`
//
// The nav persists across all pages because AppShell is a
// *pathless layout route* — it renders for every matched child
// without contributing a URL segment.
//
// OBSERVE:
//   Click the three links. Watch the URL bar update and the page
//   content swap. The nav never unmounts — it's always rendered.
//
// TODO #1 (NavLink `end` gotcha):
//   Remove the `end` prop from the Home NavLink below.
//   Navigate to /about — notice Home stays bold/highlighted.
//   Every URL starts with "/", so NavLink to="/" is always active
//   without `end`.  Add `end` back to fix it.
//
// TODO #2 (missing Outlet):
//   Comment out <Outlet /> inside AppShell.
//   The nav still renders, but all page content disappears.
//   This is the single most common nested-route bug.
//
// CHECK YOURSELF:
//   You navigate to /about. Does the index route render? Why not?
// ─────────────────────────────────────────────────────────────

function AppShell1() {
  const linkCss = ({ isActive }) => ({
    color: isActive ? '#38bdf8' : '#94a3b8',
    fontWeight: isActive ? 700 : 400,
    textDecoration: 'none',
    marginRight: 16,
  });

  return (
    <div>
      <nav style={s.nav}>
        {/* `end` → active only when URL is EXACTLY "/", not a prefix */}
        <NavLink to="/" style={linkCss} end>Home</NavLink>
        <NavLink to="/about" style={linkCss}>About</NavLink>
        <NavLink to="/users" style={linkCss}>Users</NavLink>
      </nav>
      <URLBar />
      {/* Remove this → all children vanish. No Outlet = nowhere to render them. */}
      <Outlet />
    </div>
  );
}

function Exercise1() {
  return (
    // Swap MemoryRouter → BrowserRouter for a real app.
    // MemoryRouter keeps history in JS memory so multiple demos
    // can live on the same page without stepping on each other.
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <Routes>
        {/*
          Pathless layout route (no `path` prop):
          renders AppShell1 for every matched child route,
          without adding a segment to the URL.
        */}
        <Route element={<AppShell1 />}>
          {/* index: renders at the parent path ("/") when no child matches */}
          <Route index element={<Page bg="#f0f9ff" icon="🏠" title="Home" />} />
          <Route path="about" element={<Page bg="#f0fdf4" icon="ℹ️" title="About" />} />
          <Route path="users" element={<Page bg="#fef9c3" icon="👥" title="Users" />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Route matching: specificity beats order
//
// v6 algorithm scores each route's specificity automatically.
// Static segments > dynamic segments (:param) > wildcards (*).
// You never need to order routes manually (unlike v5's Switch).
//
// OBSERVE:
//   • "/users"      → hits the static route (more specific)
//   • "/users/42"   → hits the dynamic :id route
//   • "/anything"   → hits the * catch-all (404)
//   • "/"           → hits the root index
//
// TODO:
//   Comment out the catch-all route. Navigate to "/anything".
//   Nothing renders — Routes returns null when nothing matches.
//   That silent failure is why you need a catch-all in real apps.
//
// v5 → v6 API renames (reference while you work):
//   <Switch>           →  <Routes>
//   exact prop         →  removed — all paths exact by default
//   <Redirect to="x"> →  <Navigate to="x" />
//   useHistory()       →  useNavigate()
//   component={Comp}   →  element={<Comp />}
//
// CHECK YOURSELF:
//   Does <Route path="/users"> match "/users/42" in v6?
//   No — exact by default. Write "/users/*" to match any prefix.
// ─────────────────────────────────────────────────────────────

function RouteMatchDemo() {
  return (
    <div>
      <URLBar />
      <div style={s.linkRow}>
        <Link to="/" style={s.link}>/ (root)</Link>
        <Link to="/users" style={s.link}>/users (static)</Link>
        <Link to="/users/42" style={s.link}>/users/42 (dynamic :id)</Link>
        <Link to="/anything" style={s.link}>/anything (catch-all)</Link>
      </div>
      <Routes>
        <Route index element={<Page bg="#f0f9ff" icon="🏠" title="Root index" />} />
        <Route
          path="/users"
          element={<Page bg="#fef9c3" icon="👥" title="User List" />}
        />
        <Route
          path="/users/:id"
          element={
            <Page bg="#fae8ff" icon="👤" title="User Detail">
              Dynamic :id matched — useParams() covered in topic 03
            </Page>
          }
        />
        {/* Catch-all — only reached when nothing else matches */}
        <Route
          path="*"
          element={<Page bg="#fff1f2" icon="🚫" title="404 — no route matched" />}
        />
      </Routes>
    </div>
  );
}

function Exercise2() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <RouteMatchDemo />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — createMemoryRouter: the v6.4 "data router" setup
//
// createBrowserRouter (or createMemoryRouter in tests/demos) is
// the preferred setup for new apps. Routes are objects, not JSX.
// This is what enables loaders, actions, and errorElement (topic 07).
//
// For production, replace:
//   createMemoryRouter → createBrowserRouter
//   options.initialEntries → not needed (browser URL is the source)
//
// OBSERVE:
//   • Navigation works identically to Exercise 1.
//   • The route config is a plain JS array — no JSX, tree-shakeable,
//     and inspectable at build time.
//   • 404 catch-all is included from the start.
//
// CHECK YOURSELF:
//   What extra capability does createBrowserRouter give you
//   that <BrowserRouter> + <Routes> does not?
//   Answer: loaders, actions, errorElement, defer, useFetcher.
// ─────────────────────────────────────────────────────────────

// Layout shell used by Exercise 3
function Shell3() {
  const linkCss = ({ isActive }) => ({
    color: isActive ? '#38bdf8' : '#94a3b8',
    fontWeight: isActive ? 700 : 400,
    textDecoration: 'none',
    marginRight: 16,
  });
  return (
    <div>
      <nav style={s.nav}>
        <NavLink to="/" style={linkCss} end>Home</NavLink>
        <NavLink to="/about" style={linkCss}>About</NavLink>
        <NavLink to="/nope" style={linkCss}>Unknown path</NavLink>
      </nav>
      <URLBar />
      <Outlet />
    </div>
  );
}

// Route config as objects (v6.4+ style)
const ex3Router = createMemoryRouter(
  [
    {
      path: '/',
      element: <Shell3 />,
      // In a real app you'd add: loader, errorElement here
      children: [
        {
          index: true,
          element: <Page bg="#f0f9ff" icon="🏠" title="Home" />,
        },
        {
          path: 'about',
          element: <Page bg="#f0fdf4" icon="ℹ️" title="About" />,
        },
        {
          // Catch-all — the algorithm picks more-specific routes first,
          // so this only fires when nothing else matches.
          path: '*',
          element: <Page bg="#fff1f2" icon="🚫" title="404 — not found" />,
        },
      ],
    },
  ],
  { initialEntries: ['/'], initialIndex: 0 },
);

function Exercise3() {
  // RouterProvider is the pair for createBrowserRouter/createMemoryRouter.
  // It replaces the old <BrowserRouter> wrapper.
  return <RouterProvider router={ex3Router} />;
}

// ─── Playground ──────────────────────────────────────────────
// Build a blog router using createMemoryRouter:
//   /               → Home (index)
//   /blog           → Blog index: list of article links
//   /blog/:slug     → Article page showing the slug
//   *               → 404
//
// Requirements:
//   • /blog and /blog/:slug share a layout with a "← Blog" back link
//   • Home gets a different layout (no back link)
//   • NavLink on Home uses `end`
//
// Hint: you'll need TWO layout routes — one wrapping everything
// for the main nav, and one wrapping only the blog routes for the
// "← Blog" back link.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      Build a blog router (see instructions above). When it works,
      navigate to /blog/react-hooks and verify the slug appears.
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  nav:     { background: '#1e293b', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 },
  urlBar:  { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', padding: '4px 10px', marginBottom: 8 },
  page:    { padding: '10px 14px', borderRadius: 6, margin: '6px 0', fontSize: 14 },
  link:    { color: '#38bdf8', textDecoration: 'none', marginRight: 12, fontSize: 13 },
  linkRow: { marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4 },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1 style={t.h1}>React Router v6 Basics</h1>
      <p style={t.meta}>
        Each exercise is an isolated mini-SPA (MemoryRouter). Click links,
        follow the TODOs, answer the CHECK YOURSELF questions.
      </p>

      <h2 style={t.h2}>Exercise 1 — Layout route · index route · NavLink `end`</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — Specificity: static beats dynamic beats wildcard</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — createMemoryRouter (the v6.4 data-router setup)</h2>
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
