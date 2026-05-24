// ============================================================
// Topic:   Lazy-Loaded Routes
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial lazy-loaded-routes
//
// APPROACH: Simulation-based observation.
//   Since all code lives in one file, we simulate chunk loading
//   with artificial delays and Promise rejection — the Suspense
//   and error boundary behavior is identical to real chunk loading.
//
//   Exercise 1 — React.lazy + Suspense: the right vs wrong placement.
//   Exercise 2 — Named export workaround + error boundary.
//   Exercise 3 — Prefetch on hover: load the chunk before click.
// ============================================================

import { useState, lazy, Suspense, Component } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, NavLink, Outlet, useLocation,
  createMemoryRouter, RouterProvider,
} from 'react-router-dom';

// ─── Shared utilities ─────────────────────────────────────────
function URLBar() {
  const { pathname } = useLocation();
  return <div style={s.urlBar}>📍 {pathname}</div>;
}

// Simulates dynamic import() with a configurable delay.
// In production: lazy(() => import('./pages/Dashboard'))
// Here: lazy(() => fakeImport(DashboardComponent, 800))
function fakeImport(Component, delay = 800) {
  return new Promise(resolve =>
    setTimeout(() => resolve({ default: Component }), delay)
  );
}

// Simulates a chunk that FAILS to load (network error)
function failingImport(delay = 500) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('ChunkLoadError: Loading chunk failed (simulated)')), delay)
  );
}

// ─── "Pages" that simulate separately-bundled files ───────────
function DashboardPage() {
  return (
    <div style={{ ...s.page, background: '#f0fdf4' }}>
      📊 <strong>Dashboard</strong>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
        This component was "lazy loaded" — it didn't ship in the initial bundle.
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div style={{ ...s.page, background: '#f0f9ff' }}>
      ⚙️ <strong>Settings</strong>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
        Loaded on demand when /settings was first visited.
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div style={{ ...s.page, background: '#fef9c3' }}>
      👤 <strong>Profile</strong>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
        A third lazy route — each has its own chunk in production.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — React.lazy + Suspense: placement rules
//
// The mechanism:
//   1. lazy(() => import('./Page')) creates a lazy component.
//   2. On first render, it throws a Promise (Suspense protocol).
//   3. <Suspense> catches the Promise, shows fallback.
//   4. When the Promise resolves (chunk loaded), tree re-renders.
//
// CRITICAL RULES:
//   • lazy() calls must be at MODULE SCOPE — never inside a component.
//     Inside = new lazy component created on every render = broken.
//   • <Suspense> must be an ANCESTOR of the lazy component.
//     It can be anywhere above — it doesn't need to be the direct parent.
//
// OBSERVE:
//   Click the nav links. Each link triggers the "chunk load" (800ms delay).
//   Watch the fallback spinner appear, then the page.
//   Navigate away and back — the chunk is cached, no re-load.
//
// TODO #1 (wrong placement):
//   There's a commented-out "WRONG" version below.
//   Uncomment it — notice it creates a new lazy component on every render
//   and the page never stops loading (infinite re-mount cycle).
//
// TODO #2 (no Suspense):
//   Remove the <Suspense> wrapper from one route's element.
//   React throws: "A component suspended while rendering, but no
//   fallback UI was specified". Suspense is mandatory.
//
// CHECK YOURSELF:
//   <Suspense> and the lazy component are in different components.
//   Does Suspense need to be in the same JSX as the lazy component?
//   No — it only needs to be an ancestor in the component tree.
// ─────────────────────────────────────────────────────────────

// ✅ CORRECT: lazy() at module scope — created once, cached on first load
const LazyDashboard = lazy(() => fakeImport(DashboardPage, 800));
const LazySettings  = lazy(() => fakeImport(SettingsPage, 600));
const LazyProfile   = lazy(() => fakeImport(ProfilePage, 1000));

function Spinner({ label = 'Loading…' }) {
  return (
    <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
      ⏳ {label}
    </div>
  );
}

function AppShell() {
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
        <NavLink to="/dashboard" style={linkCss}>Dashboard</NavLink>
        <NavLink to="/settings" style={linkCss}>Settings</NavLink>
        <NavLink to="/profile" style={linkCss}>Profile</NavLink>
      </nav>
      <URLBar />
      {/*
        One Suspense at the layout level covers ALL lazy children.
        Or use per-route Suspense for different fallback UIs per page.
      */}
      <Suspense fallback={<Spinner label="Loading page chunk…" />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

function Exercise1() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<div style={s.page}>🏠 <strong>Home</strong> — not lazy (in the initial bundle)</div>} />
          {/* Each lazy route triggers a separate "chunk download" on first visit */}
          <Route path="/dashboard" element={<LazyDashboard />} />
          <Route path="/settings"  element={<LazySettings />} />
          <Route path="/profile"   element={<LazyProfile />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

/*
  ❌ WRONG — uncomment and paste into Exercise1 to see the bug:

  function Exercise1Wrong() {
    return (
      <MemoryRouter>
        <Routes>
          <Route path="/dashboard" element={
            (() => {
              // lazy() inside JSX = new component instance on every render
              const Bad = lazy(() => fakeImport(DashboardPage, 800));
              return (
                <Suspense fallback={<Spinner />}>
                  <Bad />
                </Suspense>
              );
            })()
          } />
        </Routes>
      </MemoryRouter>
    );
  }
*/

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Named export workaround + error boundary
//
// React.lazy ONLY works with default exports.
//   lazy(() => import('./Foo'))          ← imports default export
//   lazy(() => import('./Foo').then(m => ({ default: m.NamedExport })))
//                                        ← named export workaround
//
// Chunk load FAILURES are NOT caught by <Suspense>.
//   <Suspense> handles the pending (loading) state.
//   A failing import throws an Error, which only an Error Boundary catches.
//   You need BOTH: <ErrorBoundary> wrapping <Suspense> wrapping the lazy component.
//
// OBSERVE:
//   "Load Named Export" works — the .then() trick wraps it as a default.
//   "Load Broken Module" fails — without an error boundary, it crashes the tree.
//   Toggle "Use Error Boundary" — the error boundary catches and shows a recovery UI.
//
// CHECK YOURSELF:
//   A lazy component is loading. The network drops out. Which component
//   catches the error — <Suspense> or <ErrorBoundary>?
//   Answer: ErrorBoundary — Suspense only handles pending Promises.
// ─────────────────────────────────────────────────────────────

// Simulates a module with a NAMED export (not default)
function AnalyticsPage() {
  return <div style={{ ...s.page, background: '#fae8ff' }}>📈 <strong>Analytics</strong> — was a named export</div>;
}

// Named export workaround: .then(m => ({ default: m.NamedExport }))
const LazyAnalytics = lazy(() =>
  fakeImport(null, 600).then(() => ({ default: AnalyticsPage }))
);

// Simulates a broken chunk (network failure)
const LazyBroken = lazy(() => failingImport(600));

// React error boundaries require class components
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error) {
    // In production: log to Sentry, Datadog, etc.
    console.error('Chunk load error caught:', error.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ ...s.page, background: '#fff1f2', border: '1px solid #fca5a5' }}>
          <strong>⚠️ Failed to load page</strong>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4, marginBottom: 8 }}>
            {this.state.error?.message}
          </div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} style={s.btn}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Exercise2() {
  const [showNamed, setShowNamed]   = useState(false);
  const [showBroken, setShowBroken] = useState(false);
  const [useEB, setUseEB]           = useState(false);
  // Reset keys force remount so we can retry the import
  const [namedKey, setNamedKey]   = useState(0);
  const [brokenKey, setBrokenKey] = useState(0);

  const brokenContent = (
    <Suspense fallback={<Spinner label="Loading broken chunk…" />}>
      <LazyBroken key={brokenKey} />
    </Suspense>
  );

  return (
    <div>
      {/* Named export demo */}
      <div style={{ marginBottom: 12 }}>
        <div style={s.label}>Named export workaround</div>
        <button onClick={() => { setShowNamed(true); setNamedKey(k => k + 1); }} style={{ ...s.btn, marginRight: 8 }}>
          Load Analytics (named export)
        </button>
        {showNamed && (
          <Suspense fallback={<Spinner label="Loading analytics chunk…" />}>
            <LazyAnalytics key={namedKey} />
          </Suspense>
        )}
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          <code style={s.code}>lazy(() =&gt; fakeImport().then(m =&gt; ({"{ default: m.Analytics }"})))</code>
        </div>
      </div>

      {/* Broken chunk demo */}
      <div>
        <div style={s.label}>Chunk load failure</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setShowBroken(true); setBrokenKey(k => k + 1); }} style={{ ...s.btn, background: '#ef4444', color: '#fff' }}>
            Load Broken Module
          </button>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={useEB} onChange={e => setUseEB(e.target.checked)} />
            <span style={{ color: useEB ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
              {useEB ? '✅ ErrorBoundary wraps Suspense' : '❌ No ErrorBoundary (app crashes)'}
            </span>
          </label>
        </div>

        {showBroken && (
          useEB
            ? <ErrorBoundary key={brokenKey}>{brokenContent}</ErrorBoundary>
            : brokenContent
        )}

        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Without ErrorBoundary: the thrown Error propagates to React's root handler → white screen.
          With ErrorBoundary: catches it and shows recovery UI.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Prefetch on hover
//
// Default: chunk downloads when the user clicks the link.
//   User clicks → navigation starts → chunk downloads → page renders.
//   If the chunk takes 2s, the user waits 2s after clicking.
//
// Prefetch on hover: chunk downloads when the user HOVERS.
//   User hovers → prefetch starts (import() called)
//   User clicks → chunk already downloaded → page renders instantly.
//
// The browser caches dynamic imports: calling import('./Dashboard')
// twice only issues one network request. The second call
// resolves immediately from the module registry.
//
// OBSERVE:
//   1. "Hover to prefetch" link: hover for 1 second, then click.
//      The page appears immediately because the chunk is cached.
//   2. "No prefetch" link: click directly.
//      You wait the full simulated delay before seeing the page.
//
// In real production code:
//   import('./pages/Dashboard') — browser fetches, caches, done.
//   The lazy component then resolves instantly.
//
// CHECK YOURSELF:
//   Why is prefetch-on-hover better than prefetch-on-mount?
//   On hover: user has signaled intent. On mount: you're guessing — every
//   link on the page would prefetch all chunks, defeating code splitting.
// ─────────────────────────────────────────────────────────────

// Simulates a module registry (real browsers do this natively)
const moduleCache = new Map();

function prefetchModule(key, importFn) {
  if (!moduleCache.has(key)) {
    const promise = importFn();
    moduleCache.set(key, promise);
    console.log(`[Prefetch] ${key} — chunk started loading`);
    promise.then(() => console.log(`[Prefetch] ${key} — chunk ready`));
  }
}

// In production:
//   const LazyHeavy = lazy(() => import('./pages/Heavy'));
//   function prefetch() { import('./pages/Heavy'); }
//
// Here we simulate the same behavior with artificial delays:
const DELAY_NORMAL = 1500; // 1.5s without prefetch
const DELAY_PREFETCH = 800; // 800ms chunk load

// "Module" factories — simulated separately
let heavyPageCache = null;
function HeavyPage() {
  return <div style={{ ...s.page, background: '#f0fdf4' }}>🏋️ <strong>Heavy Page</strong> — loaded!</div>;
}

const LazyHeavyNoPrefetch = lazy(() => fakeImport(HeavyPage, DELAY_NORMAL));

// The prefetch-aware version: import() is called on hover
// to start the download. The lazy component wraps the SAME import.
let prefetchStarted = false;
function startHeavyPrefetch() {
  if (!prefetchStarted) {
    prefetchStarted = true;
    heavyPageCache = fakeImport(HeavyPage, DELAY_PREFETCH);
  }
}
const LazyHeavyPrefetched = lazy(() =>
  heavyPageCache ?? fakeImport(HeavyPage, DELAY_NORMAL)
);

function PrefetchDemo() {
  const [showNoPrefetch, setShowNoPrefetch]   = useState(false);
  const [showPrefetched, setShowPrefetched]   = useState(false);
  const [hovered, setHovered]                 = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* No prefetch — click to load */}
        <div style={{ flex: 1, minWidth: 200, border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
          <div style={s.label}>No prefetch</div>
          <button onClick={() => setShowNoPrefetch(true)} style={{ ...s.btn, marginBottom: 8 }}>
            Click to load ({DELAY_NORMAL / 1000}s wait)
          </button>
          {showNoPrefetch && (
            <Suspense fallback={<Spinner label={`Loading… (${DELAY_NORMAL / 1000}s)`} />}>
              <LazyHeavyNoPrefetch />
            </Suspense>
          )}
        </div>

        {/* Prefetch on hover */}
        <div style={{ flex: 1, minWidth: 200, border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
          <div style={s.label}>Hover to prefetch, then click</div>
          <button
            onMouseEnter={() => { startHeavyPrefetch(); setHovered(true); }}
            onClick={() => setShowPrefetched(true)}
            style={{
              ...s.btn, marginBottom: 8,
              background: hovered ? '#22c55e' : '#f8fafc',
              color: hovered ? '#fff' : '#1e293b',
            }}
          >
            {hovered ? '✅ Prefetch started — click now' : 'Hover me first, then click'}
          </button>
          {showPrefetched && (
            <Suspense fallback={<Spinner label={`Loading… (${DELAY_PREFETCH / 1000}s if not prefetched)`} />}>
              <LazyHeavyPrefetched />
            </Suspense>
          )}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#555', background: '#f8fafc', padding: '8px 10px', borderRadius: 4 }}>
        <strong>Production pattern:</strong>
        {' '}
        <code style={s.code}>{'<Link onMouseEnter={() => import("./Heavy")} to="/heavy">'}</code>
        {' '}
        The browser caches the import — subsequent lazy() calls resolve instantly.
      </div>
    </div>
  );
}

function Exercise3() {
  return <PrefetchDemo />;
}

// ─── Playground ──────────────────────────────────────────────
// Build a tab interface where each tab's content is lazy loaded:
//   Tabs: Overview | Analytics | Settings | Reports
//   Only load a tab's component when it's first clicked.
//   Show a per-tab skeleton while loading.
//   Add prefetch on hover for all tab buttons.
//
// Bonus: add an ErrorBoundary per tab so one failing tab doesn't
// crash the others.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      Build a lazy-loaded tab interface: 4 tabs, each loads on first click,
      with a per-tab spinner skeleton. Prefetch on tab hover.
      Add a per-tab ErrorBoundary so one broken chunk doesn't crash others.
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  nav:    { background: '#1e293b', padding: '8px 12px', display: 'flex', gap: 4 },
  urlBar: { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', padding: '4px 10px', marginBottom: 8, borderRadius: 4 },
  page:   { background: '#f8fafc', borderRadius: 4, padding: 10, fontSize: 14, border: '1px solid #e2e8f0', marginBottom: 4 },
  btn:    { padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12 },
  label:  { fontSize: 12, color: '#64748b', marginBottom: 6 },
  code:   { background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 660 }}>
      <h1 style={t.h1}>Lazy-Loaded Routes</h1>
      <p style={t.meta}>
        Chunks are simulated with artificial delays — the Suspense and error
        boundary behavior is identical to real dynamic import().
      </p>

      <h2 style={t.h2}>Exercise 1 — React.lazy + Suspense: module scope + ancestor rule</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — Named export workaround + error boundary</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — Prefetch on hover: load before click</h2>
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
