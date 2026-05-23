// ============================================================
// Topic:   componentDidCatch & Error Boundaries
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz or: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState } from 'react';

// ─── Shared styles ────────────────────────────────────────────
const S = {
  box:   { border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' },
  btn:   { margin: '0 6px 6px 0', padding: '4px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  note:  { fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' },
  error: { background: '#fff0f0', border: '1px solid #f99', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem' },
  red:   { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#e55', color: '#fff', marginRight: 6 },
  green: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#5a5', color: '#fff', marginRight: 6 },
};

// ─── Exercise 1 — Write a minimal ErrorBoundary from scratch ──
//
// An error boundary is any class that implements ONE or BOTH of:
//   • static getDerivedStateFromError(error)  — render phase, returns fallback state
//   • componentDidCatch(error, info)           — commit phase, log/report the error
//
// A component throws during render → React unwinds → finds the nearest boundary above →
// calls getDerivedStateFromError → boundary re-renders with fallback state →
// calls componentDidCatch (for logging).
//
// Your tasks:
//   [ ] Implement getDerivedStateFromError:
//         Return { hasError: true, error } to trigger the fallback render.
//         (Remember: static — no `this`, no side effects)
//   [ ] Implement componentDidCatch(error, info):
//         console.log('Error caught:', error.message, info.componentStack)
//         (info.componentStack shows the component tree at the point of failure)
//   [ ] After implementing: click "💣 Trigger render error" and observe the fallback.
//   [ ] Click "↩ Reset" to attempt recovery.
//
// Key questions:
//   Q: Why is getDerivedStateFromError static? (hint: render phase, concurrent safety)
//   Q: Why is componentDidCatch an instance method? (hint: needs `this` for logging setup)
//   Q: What would happen WITHOUT the error boundary? (entire tree unmounts)

// TODO: Implement this class to make it an actual error boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    // TODO: return the state that triggers the fallback render
    //
    // return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // TODO: log the error (in a real app, send to Sentry/Datadog)
    //
    // console.error('Error caught by boundary:', error.message);
    // console.error('Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={S.error}>
          <strong>⚠ Something went wrong</strong>
          <p style={{ fontSize: '0.85rem', color: '#c55', margin: '4px 0' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button style={S.btn} onClick={() => this.setState({ hasError: false, error: null })}>
            ↩ Reset
          </button>
          <p style={S.note}>Check DevTools → Console for the componentStack log.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// A component that throws during render (deterministic — same error every render)
function BrokenWidget({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('BrokenWidget: render error triggered');
  }
  return (
    <div style={{ ...S.box, borderColor: '#8c8' }}>
      <span style={S.green}>Widget is healthy ✓</span>
      <p style={S.note}>This component is rendering normally.</p>
    </div>
  );
}

function Exercise1() {
  const [shouldThrow, setShouldThrow] = useState(false);
  return (
    <div>
      <button style={S.btn} onClick={() => setShouldThrow(true)}>
        💣 Trigger render error
      </button>
      <button style={S.btn} onClick={() => setShouldThrow(false)}>
        🩹 Heal the component
      </button>
      <ErrorBoundary>
        <BrokenWidget shouldThrow={shouldThrow} />
      </ErrorBoundary>
      <p style={S.note}>
        Without the boundary implemented, the whole page would crash.
        After implementing, only the widget shows the fallback.
      </p>
    </div>
  );
}

// ─── Exercise 2 — What error boundaries CANNOT catch ──────────
//
// Error boundaries only catch errors in React's RENDER PIPELINE:
//   ✅ render() methods
//   ✅ class lifecycle methods (componentDidMount, etc.)
//   ✅ constructors of child components
//
// They CANNOT catch:
//   ❌ event handler errors (not in React's render pipeline — use try/catch)
//   ❌ async errors (setTimeout, Promise, fetch)
//   ❌ errors in the boundary itself
//   ❌ SSR errors
//
// This exercise demonstrates the difference with two buttons:
//   • One triggers a RENDER error → boundary catches it, shows fallback
//   • One triggers an EVENT HANDLER error → boundary misses it, page stays visible
//     but the error is unhandled (you need try/catch in the handler)
//
// Your tasks:
//   [ ] Click "Render error" → observe boundary fallback appears
//   [ ] Click "Event handler error" → observe NOTHING catches it (DevTools shows unhandled error)
//   [ ] Implement handleActionWithCatch to handle the event handler error locally with try/catch

// A boundary for this exercise (complete — don't modify)
class ErrorBoundaryForE2 extends React.Component {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error) { return { hasError: true, message: error.message }; }
  componentDidCatch(error, info) { console.error('[E2 boundary]', error.message, info.componentStack); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={S.error}>
          <strong>⚠ Boundary caught a RENDER error:</strong>
          <p style={{ fontSize: '0.85rem', color: '#c55' }}>{this.state.message}</p>
          <button style={S.btn} onClick={() => this.setState({ hasError: false })}>Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DemoWidget() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [localError, setLocalError]   = useState(null);

  // This error happens during render → boundary catches it
  if (shouldThrow) {
    throw new Error('RENDER ERROR: thrown during render()');
  }

  // This error happens in an event handler → boundary does NOT catch it
  const handleActionBroken = () => {
    throw new Error('EVENT HANDLER ERROR: not caught by boundary');
  };

  // TODO: Handle the event handler error with try/catch and display it locally
  const handleActionWithCatch = () => {
    // TODO: wrap the throw in try/catch, setLocalError(err) on failure
    //
    // try {
    //   throw new Error('EVENT HANDLER ERROR: now caught locally');
    // } catch (err) {
    //   setLocalError(err.message);
    // }
    handleActionBroken(); // ← replace this with try/catch version above
  };

  return (
    <div style={S.box}>
      <div style={{ marginBottom: '0.5rem' }}>
        <button style={{ ...S.btn, background: '#fee', borderColor: '#f99' }}
          onClick={() => setShouldThrow(true)}>
          💣 Render error → boundary catches this
        </button>
        <button style={{ ...S.btn, background: '#fef', borderColor: '#c9c' }}
          onClick={handleActionBroken}>
          🎇 Event handler error (broken) → boundary MISSES this
        </button>
        <button style={{ ...S.btn, background: '#efe', borderColor: '#9c9' }}
          onClick={handleActionWithCatch}>
          🛡 Event handler error (fixed with try/catch)
        </button>
      </div>
      {localError && (
        <div style={{ ...S.error, marginTop: '0.5rem' }}>
          <strong>Locally caught:</strong> {localError}
          <button style={S.btn} onClick={() => setLocalError(null)}>Dismiss</button>
        </div>
      )}
      <p style={S.note}>Watch DevTools → Console for unhandled errors from the broken button.</p>
    </div>
  );
}

function Exercise2() {
  return (
    <div>
      <ErrorBoundaryForE2>
        <DemoWidget />
      </ErrorBoundaryForE2>
    </div>
  );
}

// ─── Exercise 3 — Multi-level placement + Try Again recovery ──
//
// Real apps use multiple error boundaries at different granularities:
//   • Root boundary: last-resort — catches anything not caught below
//   • Section boundaries: isolate major UI regions from each other
//   • Widget boundaries: finest grain — one broken widget doesn't affect others
//
// This exercise models a dashboard with 3 widgets. Each has its own boundary.
// When a widget fails, only that widget shows a fallback. The others keep working.
//
// The RecoverableBoundary below supports a "Try Again" button that resets state
// and attempts to re-render the children. If the underlying issue is fixed (or was
// transient), the UI recovers.
//
// Your tasks:
//   [ ] Implement RecoverableBoundary's reset method so "Try Again" works.
//       Hint: this.setState({ hasError: false, error: null }) re-attempts render.
//   [ ] Crash Widget 1 → only Widget 1 shows fallback, others stay up.
//   [ ] Click "Try Again" on Widget 1 → it recovers (error was transient).
//   [ ] Crash all 3 → root boundary should catch anything that slips through.

// Recoverable boundary with "Try Again" — TODO: implement reset
class RecoverableBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.warn(`[${this.props.name}] boundary caught:`, error.message);
  }

  reset = () => {
    // TODO: reset state so the boundary attempts to render children again
    //
    // this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={S.error}>
          <strong>⚠ {this.props.name} failed</strong>
          <p style={{ fontSize: '0.82rem', color: '#c55' }}>
            {this.state.error?.message}
          </p>
          <button style={S.btn} onClick={this.reset}>↩ Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Root-level boundary (coarse — catches anything not caught below)
class RootBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ ...S.error, borderColor: '#c55', background: '#fff5f5' }}>
          <strong>🚨 Root boundary — something critical failed.</strong>
          <button style={S.btn} onClick={() => this.setState({ hasError: false })}>Recover</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// A widget that can be told to crash
function DashboardWidget({ name, shouldCrash, children }) {
  if (shouldCrash) throw new Error(`${name}: widget crashed`);
  return (
    <div style={{ ...S.box, borderColor: '#adf' }}>
      <strong>{name}</strong>
      <p style={{ fontSize: '0.85rem' }}>{children}</p>
    </div>
  );
}

function Exercise3() {
  const [crash1, setCrash1] = useState(false);
  const [crash2, setCrash2] = useState(false);
  const [crash3, setCrash3] = useState(false);

  return (
    <RootBoundary>
      <div>
        <div style={{ marginBottom: '0.75rem' }}>
          <button style={S.btn} onClick={() => setCrash1(c => !c)}>
            {crash1 ? '🩹 Heal Widget 1' : '💣 Crash Widget 1'}
          </button>
          <button style={S.btn} onClick={() => setCrash2(c => !c)}>
            {crash2 ? '🩹 Heal Widget 2' : '💣 Crash Widget 2'}
          </button>
          <button style={S.btn} onClick={() => setCrash3(c => !c)}>
            {crash3 ? '🩹 Heal Widget 3' : '💣 Crash Widget 3'}
          </button>
        </div>
        <p style={S.note}>
          Each widget has its own boundary. Crash one — the others keep working.
          Click "Try Again" on a crashed widget to attempt recovery (implement reset first).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <RecoverableBoundary name="Widget 1">
            <DashboardWidget name="📊 Analytics" shouldCrash={crash1}>
              Users today: 1,248 — Revenue: $4,230
            </DashboardWidget>
          </RecoverableBoundary>

          <RecoverableBoundary name="Widget 2">
            <DashboardWidget name="📋 Tasks" shouldCrash={crash2}>
              7 open tasks — 3 due today
            </DashboardWidget>
          </RecoverableBoundary>

          <RecoverableBoundary name="Widget 3">
            <DashboardWidget name="💬 Messages" shouldCrash={crash3}>
              12 unread — 3 urgent
            </DashboardWidget>
          </RecoverableBoundary>
        </div>
      </div>
    </RootBoundary>
  );
}

// ─── Playground — Async errors are NOT caught ─────────────────
//
// Error boundaries only catch synchronous RENDER errors.
// Async errors (setTimeout, fetch callbacks, useEffect async) bypass them entirely.
//
// Observe:
//   [ ] "Render error" → boundary catches it, fallback appears
//   [ ] "Async error (setTimeout)" → boundary misses it, DevTools shows unhandled rejection
//   [ ] "Effect error" → same — useEffect errors are also NOT caught
//
// Solution for async errors: explicit try/catch inside the async code,
//   then setState to show error UI locally. (Same pattern as event handlers.)

class AsyncDemoWrapper extends React.Component {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error) { return { hasError: true, message: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={S.error}>
          <strong>Boundary caught something synchronous:</strong> {this.state.message}
          <button style={S.btn} onClick={() => this.setState({ hasError: false })}>Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AsyncErrorDemo() {
  const [renderThrow, setRenderThrow] = useState(false);
  const [asyncError, setAsyncError]   = useState(null);

  if (renderThrow) throw new Error('Synchronous render error — boundary catches this ✓');

  const triggerAsyncError = () => {
    setTimeout(() => {
      throw new Error('Async setTimeout error — boundary MISSES this ✗');
    }, 0);
  };

  const triggerWithCatch = () => {
    setTimeout(() => {
      try {
        throw new Error('Async error — handled locally ✓');
      } catch (err) {
        setAsyncError(err.message);
      }
    }, 0);
  };

  return (
    <div style={S.box}>
      <div style={{ marginBottom: '0.5rem' }}>
        <button style={S.btn} onClick={() => setRenderThrow(true)}>
          💣 Render error (boundary catches)
        </button>
        <button style={S.btn} onClick={triggerAsyncError}>
          ⏰ setTimeout error (boundary misses)
        </button>
        <button style={S.btn} onClick={triggerWithCatch}>
          🛡 setTimeout with try/catch (local handling)
        </button>
      </div>
      {asyncError && (
        <div style={{ ...S.error, marginTop: '0.5rem' }}>
          <strong>Locally caught async error:</strong> {asyncError}
          <button style={S.btn} onClick={() => setAsyncError(null)}>Dismiss</button>
        </div>
      )}
      <p style={S.note}>Async errors that aren't caught locally show up in DevTools → Console.</p>
    </div>
  );
}

function Playground() {
  return (
    <div>
      <AsyncDemoWrapper>
        <AsyncErrorDemo />
      </AsyncDemoWrapper>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 900 }}>
      <h1>componentDidCatch &amp; Error Boundaries</h1>

      <h2>Exercise 1 — Write the ErrorBoundary class</h2>
      <p style={S.note}>
        Implement <code>getDerivedStateFromError</code> and <code>componentDidCatch</code>.
        Click "Trigger render error" — without your implementation, the whole app crashes.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — What can't be caught</h2>
      <p style={S.note}>
        Render errors → boundary catches. Event handler errors → boundary misses.
        Fix the third button with try/catch.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Multi-level placement &amp; Try Again</h2>
      <p style={S.note}>
        Implement <code>reset</code> in RecoverableBoundary. Crash individual widgets and recover.
      </p>
      <Exercise3 />

      <h2>Playground — Async errors bypass boundaries</h2>
      <Playground />
    </div>
  );
}
