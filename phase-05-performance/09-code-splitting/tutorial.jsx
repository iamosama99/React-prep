// ============================================================
// Topic:   Code Splitting
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises implement lazy loading
//   from scratch using React.lazy + Suspense, including error handling
//   and the named-export gotcha. The simulated "chunks" add a
//   network delay so you can observe the loading behavior.
// ============================================================

import { useState, lazy, Suspense } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Simulated heavy modules ──────────────────────────────────
// In a real app these would be in separate files loaded via dynamic import.
// Here we simulate the loading delay with a Promise timeout.

function makeFakeModule(component, delayMs = 1200) {
  let resolved = false;
  let cachedModule = null;
  return () =>
    new Promise((resolve) => {
      if (resolved) return resolve(cachedModule);
      setTimeout(() => {
        resolved = true;
        cachedModule = { default: component };
        resolve(cachedModule);
      }, delayMs);
    });
}

function makeFakeModuleNamed(component, exportName, delayMs = 1200) {
  return () =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve({ [exportName]: component });
      }, delayMs);
    });
}

// The "heavy" components that would normally be in separate files
function DashboardPage() {
  return (
    <div style={{ padding: '20px 24px', background: '#eff6ff', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 8px' }}>📊 Dashboard</h3>
      <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
        This "chunk" was loaded lazily — only when you navigated here.
        In a real app it would contain the full dashboard JavaScript.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {['Revenue: $142K', 'Users: 8,291', 'Conversion: 3.2%'].map(stat => (
          <div key={stat} style={{ padding: '8px 14px', background: 'white', borderRadius: 6, fontSize: 13, border: '1px solid #e2e8f0' }}>
            {stat}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div style={{ padding: '20px 24px', background: '#f0fdf4', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 8px' }}>⚙️ Settings</h3>
      <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
        Settings chunk loaded. A different bundle from Dashboard — users
        who never visit Settings never download this code.
      </p>
    </div>
  );
}

function ChartWidget() {
  return (
    <div style={{ padding: '20px 24px', background: '#fef3c7', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 8px' }}>📈 Chart Widget</h3>
      <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
        This chart library (normally ~300KB) loads only when this panel is visible.
        Below the fold / hidden panels are prime code-splitting candidates.
      </p>
    </div>
  );
}

// Named export (for Exercise 2):
function AnalyticsPanel({ compact }) {
  return (
    <div style={{ padding: '16px 20px', background: '#f3e8ff', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 8px' }}>📉 Analytics {compact ? '(compact)' : ''}</h3>
      <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
        This component uses a named export. React.lazy requires default exports —
        see the wrapper pattern to handle named exports.
      </p>
    </div>
  );
}


// ─── Exercise 1: Basic Route-Level Lazy Loading ───────────────
//
// SITUATION
//   A 3-page app. Without code splitting, all three pages download
//   on initial load. With lazy loading, each page's code is fetched
//   only when the user navigates to it.
//
//   React.lazy() wraps a factory function that returns a Promise (the
//   dynamic import). Suspense provides the fallback UI while loading.
//   The Suspense boundary MUST be an ancestor of the lazy component.
//
// YOUR TASK
//   1. Click each nav button — notice the loading state on first click.
//   2. Click the same route again — instant (already loaded).
//   3. Notice: each route's "chunk" only loads when first visited.
//   4. Answer: what would happen if there were no <Suspense> wrapper?

const LazyDashboard = lazy(makeFakeModule(DashboardPage, 800));
const LazySettings = lazy(makeFakeModule(SettingsPage, 1000));

function Spinner({ message }) {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 13 }}>{message || 'Loading chunk...'}</div>
    </div>
  );
}

function Exercise1() {
  const [route, setRoute] = useState(null);

  return (
    <section>
      <h2>Exercise 1 — Route-Level Lazy Loading</h2>
      <p style={hint}>
        First click loads the chunk (shows spinner). Second click is instant.
        Open DevTools → Network to see the simulated loading behavior.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[null, 'dashboard', 'settings'].map(r => (
          <button
            key={r ?? 'home'}
            onClick={() => setRoute(r)}
            style={{
              ...btnStyle,
              background: route === r ? '#1e293b' : '#f1f5f9',
              color: route === r ? 'white' : '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            {r ?? 'Home'}
          </button>
        ))}
      </div>

      <div style={card}>
        {/* Suspense MUST wrap the lazy component — it catches the thrown Promise */}
        <Suspense fallback={<Spinner message="Loading page..." />}>
          {route === null && (
            <div style={{ padding: '20px 24px', fontSize: 13, color: '#64748b' }}>
              🏠 Home page — no lazy loading (always in the main bundle).
              Navigate to Dashboard or Settings to trigger a lazy load.
            </div>
          )}
          {route === 'dashboard' && <LazyDashboard />}
          {route === 'settings' && <LazySettings />}
        </Suspense>
      </div>

      {/* ANSWER: What would happen without Suspense?
          React.lazy works by throwing a Promise when the component is first rendered
          but the module hasn't loaded yet. React catches this throw at the nearest
          Suspense boundary and shows the fallback. Without a Suspense ancestor,
          the thrown Promise propagates upward uncaught — React treats it as an
          error and either crashes the component tree or (in React 18) shows the
          nearest error boundary. You'd see an error screen instead of a loading spinner.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Key points:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Second visit is instant — the module Promise is cached after first load</li>
          <li>Each route is independent — Dashboard loading doesn't affect Settings</li>
          <li>Suspense boundary can be placed at any granularity (per-page, per-section)</li>
          <li>In real apps: each lazy chunk is a separate .js file in your build output</li>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 2: Named Export Gotcha ─────────────────────────
//
// SITUATION
//   React.lazy expects the dynamic import to resolve to a module with
//   a DEFAULT export. If your component uses a named export, you need
//   a wrapper that maps it to a default.
//
//   Without the wrapper:
//   lazy(() => import('./analytics')) → module.default is undefined → crash
//
//   With the wrapper:
//   lazy(() => import('./analytics').then(m => ({ default: m.AnalyticsPanel })))
//
// YOUR TASK
//   1. Click "Load broken" — it fails because AnalyticsPanel is a named export.
//   2. Click "Load fixed" — the wrapper maps the named export to default.
//   3. Implement the wrapper yourself: fill in the TODO below.
//   4. Answer: what error message would you see in the console without the wrapper?

// ❌ BROKEN: module doesn't have a default export
const LazyAnalyticsBroken = lazy(() =>
  makeFakeModuleNamed(AnalyticsPanel, 'AnalyticsPanel', 600)()
  // The module resolves to { AnalyticsPanel: ... }
  // React.lazy reads module.default → undefined → runtime error
);

// ✅ FIXED: map named export to default
const LazyAnalyticsFixed = lazy(() =>
  makeFakeModuleNamed(AnalyticsPanel, 'AnalyticsPanel', 600)()
    .then(module => ({ default: module.AnalyticsPanel }))
  // Now module.default = AnalyticsPanel → React.lazy works
);

// Simple error boundary for exercise demonstration
import { Component } from 'react';
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, background: '#fef2f2', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
          ❌ Lazy load failed: {this.state.error.message || 'Module has no default export'}
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginLeft: 12, padding: '2px 8px', fontSize: 11, border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Exercise2() {
  const [show, setShow] = useState(null); // null | 'broken' | 'fixed'

  return (
    <section>
      <h2>Exercise 2 — Named Export Gotcha</h2>
      <p style={hint}>
        Click "Load broken" to see the error. Click "Load fixed" to see the correct approach.
        The only difference is the <code>.then()</code> wrapper that maps named → default.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setShow('broken')}
          style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          Load broken (named export, no wrapper)
        </button>
        <button
          onClick={() => setShow('fixed')}
          style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
        >
          Load fixed (.then() wrapper)
        </button>
        {show && (
          <button
            onClick={() => setShow(null)}
            style={{ ...btnStyle, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
          >
            Reset
          </button>
        )}
      </div>

      <div style={card}>
        {show === 'broken' && (
          <ErrorBoundary key="broken">
            <Suspense fallback={<Spinner message="Loading AnalyticsPanel..." />}>
              <LazyAnalyticsBroken />
            </Suspense>
          </ErrorBoundary>
        )}
        {show === 'fixed' && (
          <Suspense fallback={<Spinner message="Loading AnalyticsPanel..." />}>
            <LazyAnalyticsFixed />
          </Suspense>
        )}
        {!show && (
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Click a button above to load.</p>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The wrapper pattern:</strong>
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '10px 14px', borderRadius: 4, fontSize: 12, marginTop: 8, overflow: 'auto' }}>{`// Named export → wrap with .then():
const LazyChart = lazy(() =>
  import('./charts').then(module => ({ default: module.Chart }))
);

// Or create a re-export file (charts/index.js):
// export { Chart as default } from './charts';
// Then: lazy(() => import('./charts/index'))`}</pre>
      </div>
    </section>
  );
}


// ─── Exercise 3: Error Boundary Around Lazy Load ─────────────
//
// SITUATION
//   A chunk fetch can fail (network error, 404, server down).
//   Without an error boundary around the lazy component, a failed
//   load crashes the component tree with an unhandled error.
//   With an error boundary, you can show a recovery UI.
//
//   Correct structure: ErrorBoundary > Suspense > LazyComponent
//   (ErrorBoundary catches failed loads; Suspense catches pending loads)
//
// YOUR TASK
//   1. Click "Load (will fail)" — the simulated chunk fails to load.
//   2. Without error boundary: the tree crashes.
//   3. With error boundary: the retry UI appears.
//   4. Click "Retry" — the next load succeeds (simulated).
//   5. Answer: why must ErrorBoundary be OUTSIDE Suspense, not inside?

let failCount = 0;
function makeFailingModule(component, failTimes = 1, delayMs = 800) {
  return () =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (failCount < failTimes) {
          failCount++;
          reject(new Error('Failed to fetch chunk (network error)'));
        } else {
          resolve({ default: component });
        }
      }, delayMs);
    });
}

// This lazy component will fail on first load, succeed on retry
const LazyChartWithFailure = lazy(makeFailingModule(ChartWidget, 1, 700));

class RetryBoundary extends Component {
  state = { error: null, key: 0 };
  static getDerivedStateFromError(error) { return { error }; }
  retry = () => {
    failCount = 0; // reset for demo purposes
    this.setState(s => ({ error: null, key: s.key + 1 }));
  };
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, background: '#fef2f2', borderRadius: 6, border: '1px solid #fca5a5' }}>
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 8 }}>
            ❌ Failed to load chart: {this.state.error.message}
          </div>
          <button
            onClick={this.retry}
            style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', padding: '5px 12px' }}
          >
            Retry loading
          </button>
        </div>
      );
    }
    return (
      <div key={this.state.key}>
        {this.props.children}
      </div>
    );
  }
}

function Exercise3() {
  const [showChart, setShowChart] = useState(false);

  return (
    <section>
      <h2>Exercise 3 — Error Boundary Around Lazy Load</h2>
      <p style={hint}>
        First load fails. The error boundary catches it and shows a retry button.
        Retry succeeds. Without the boundary, the whole tree would crash.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => { failCount = 0; setShowChart(true); }}
          style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
        >
          Load chart (first attempt fails, retry succeeds)
        </button>
        <button
          onClick={() => setShowChart(false)}
          style={{ ...btnStyle, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
        >
          Reset
        </button>
      </div>

      <div style={card}>
        {showChart ? (
          // ✅ Correct structure: ErrorBoundary wraps Suspense wraps LazyComponent
          <RetryBoundary>
            <Suspense fallback={<Spinner message="Loading chart..." />}>
              <LazyChartWithFailure />
            </Suspense>
          </RetryBoundary>
        ) : (
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Click "Load chart" to start.</p>
        )}
      </div>

      {/* ANSWER: Why must ErrorBoundary be outside Suspense?
          When a lazy component throws a Promise (pending), React catches it at the
          NEAREST Suspense boundary and shows the fallback. The Promise throw propagates
          inward, not outward past Suspense.

          When a lazy component's Promise REJECTS (error), React throws an actual Error.
          If ErrorBoundary were INSIDE Suspense, Suspense would already be in "fallback mode"
          from the pending state — the error boundary would be in the hidden subtree
          (the one Suspense replaced with its fallback). Errors thrown during async loading
          propagate UP to the nearest error boundary ABOVE the Suspense boundary.

          Structure: ErrorBoundary > Suspense > LazyComponent
          - Pending: Suspense catches → shows fallback
          - Rejected: propagates past Suspense → ErrorBoundary catches → shows retry UI
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Always use both:</strong>
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '10px 14px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>{`<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Spinner />}>
    <LazyDashboard />
  </Suspense>
</ErrorBoundary>`}</pre>
        Suspense handles the loading state. ErrorBoundary handles load failures.
        Omitting either leaves the user experience broken in different ways.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 09 — Code Splitting
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
