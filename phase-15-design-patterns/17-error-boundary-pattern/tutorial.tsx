// ============================================================
// Topic:   Error Boundary Pattern
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — write a reusable ErrorBoundary (fallbackRender, onError, onReset, resetKeys)
//   Exercise 2 — bridge an async error into a boundary (useErrorBoundary)
//   Exercise 3 — granular placement + a withErrorBoundary HOC + "reset the cause"
//
// Note: the whole tutorial sits inside a RootBoundary (given) — the last-resort
// layer. Before you implement Exercise 1, a thrown error lands THERE, which is
// itself a demo of layered boundaries. In dev, React 18 may also show the
// framework's error overlay for caught errors — dismiss it to see the fallback.
//
// Run: npm run tutorial error-boundary-pattern
// ============================================================

import {
  Component, useCallback, useState, ComponentType, ErrorInfo, FC, ReactNode,
} from 'react';

// ─── A complete, given boundary (used by Exercises 2 and 3 and the root) ──
type FallbackProps = { error: Error; reset: () => void };
type BoundaryProps = {
  children: ReactNode;
  fallbackRender: (p: FallbackProps) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
};

const keysChanged = (a: unknown[] = [], b: unknown[] = []) =>
  a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));

class SimpleBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { this.props.onError?.(error, info); }
  componentDidUpdate(prev: BoundaryProps, prevState: { error: Error | null }) {
    if (prevState.error && keysChanged(prev.resetKeys, this.props.resetKeys)) this.reset();
  }
  reset = () => { this.props.onReset?.(); this.setState({ error: null }); };
  render() {
    return this.state.error
      ? this.props.fallbackRender({ error: this.state.error, reset: this.reset })
      : this.props.children;
  }
}

// ─── Exercise 1: Write the Boundary ──────────────────────────
//
// BUILD  ErrorBoundary (class component), same API as SimpleBoundary:
//   - state { error: Error | null }
//   - static getDerivedStateFromError(error)   → PURE: { error }
//   - componentDidCatch(error, info)           → call props.onError (side effects live HERE)
//   - reset()                                   → props.onReset?.(); setState({ error: null })
//   - componentDidUpdate(prev, prevState)      → if we were ALREADY in error and resetKeys changed → reset()
//                                                 (why "already in error"? read the notes)
//   - render                                    → fallbackRender({ error, reset }) or children
//
// TEST
//   Tick "arm", then: the card fails → fallback with Retry. Retry with the bomb
//   still armed fails AGAIN (reset the cause!). Untick "arm" then Retry → works.
//   Switch users while in error: resetKeys=[userId] auto-resets.
//   The log shows what onError received.

class ErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  // TODO: implement (or extend SimpleBoundary once you understand it — but write it yourself first)
  render() {
    return this.props.children;
  }
}

const UserCard: FC<{ userId: number; armed: boolean }> = ({ userId, armed }) => {
  if (armed) throw new Error(`Failed to render user #${userId}`);
  return <div style={card}>👤 User #{userId} — rendered fine</div>;
};

function Exercise1() {
  const [userId, setUserId] = useState(1);
  const [armed, setArmed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  return (
    <section>
      <h2>Exercise 1 — ErrorBoundary</h2>
      <p>
        {[1, 2, 3].map(id => (
          <button key={id} onClick={() => setUserId(id)} style={{ fontWeight: id === userId ? 700 : 400 }}>user {id}</button>
        ))}{' '}
        <label><input type="checkbox" checked={armed} onChange={e => setArmed(e.target.checked)} /> arm (child throws while rendering)</label>
      </p>
      <ErrorBoundary
        resetKeys={[userId]}
        onError={(e, info) => setLog(l => [`${e.message} · stack: ${(info.componentStack ?? '').trim().split('\n')[0]}`, ...l].slice(0, 3))}
        onReset={() => setLog(l => ['reset', ...l].slice(0, 3))}
        fallbackRender={({ error, reset }) => (
          <div role="alert" style={{ ...card, borderColor: '#fca5a5', background: '#fef2f2' }}>
            <strong>Couldn’t show this user.</strong> <span style={muted}>{error.message}</span>{' '}
            <button onClick={reset}>Retry</button>
          </div>
        )}
      >
        <UserCard userId={userId} armed={armed} />
      </ErrorBoundary>
      <div style={muted}>onError log: {log.join(' | ') || '—'}</div>
    </section>
  );
}

// ─── Exercise 2: Bridge Async Errors into a Boundary ─────────
//
// SITUATION
//   Boundaries catch RENDER errors, not errors in event handlers or promises.
//   Sometimes an async failure should replace the UI. Then you must
//   throw it DURING RENDER.
//
// BUILD  useErrorBoundary(): (error: unknown) => void
//   - const [, setState] = useState()
//   - return useCallback(err => setState(() => { throw err; }), [])
//     (state updater functions run during render — that is why this works)
//
// THEN  SaveForm behaviour:
//   - empty name          → EXPECTED failure → inline message, NOT the boundary
//   - "boom"              → server 500 → showBoundary(error) → boundary fallback
//   - anything else       → success message

function useErrorBoundary(): (error: unknown) => void {
  // TODO
  return () => {};
}

async function fakeSave(name: string): Promise<string> {
  await new Promise(r => setTimeout(r, 400));
  if (name === 'boom') throw new Error('Server exploded (500)');
  return `Saved “${name}”`;
}

const SaveForm: FC = () => {
  const showBoundary = useErrorBoundary();
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMessage('Name is required'); return; }   // expected → inline
    try {
      setMessage(await fakeSave(name));
    } catch (err) {
      showBoundary(err);                                            // unexpected → boundary
    }
  }

  return (
    <form onSubmit={onSubmit} style={card}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder='try "boom" or leave empty' />{' '}
      <button>Save</button>
      {message && <div style={muted}>{message}</div>}
    </form>
  );
};

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Bridging Async Errors</h2>
      <SimpleBoundary
        fallbackRender={({ error, reset }) => (
          <div role="alert" style={{ ...card, borderColor: '#fca5a5' }}>
            Save failed: {error.message} <button onClick={reset}>Try again</button>
          </div>
        )}
      >
        <SaveForm />
      </SimpleBoundary>
    </section>
  );
}

// ─── Exercise 3: Granular Boundaries + a HOC ─────────────────
//
// SITUATION
//   A dashboard with three widgets. One broken widget must not blank the others.
//   Compare ONE boundary around everything vs one boundary PER widget.
//
// BUILD  withErrorBoundary(Wrapped, { label, resetKeys? })
//   - returns a component that renders <SimpleBoundary> around <Wrapped {...props}/>
//   - fallback: small card "Couldn’t load {label}" with a Retry button
//   - resetKeys: derive from props via opts.resetKeys?.(props)
//   - set displayName
//
// THEN  In GranularDashboard use the wrapped widgets.
//   Break a widget: only that card fails. "Retry" while still broken fails again;
//   "Repair data" flips the prop → resetKeys sees it change → the card recovers by itself.

type WidgetProps = { broken: boolean };

const RevenueChart: FC<WidgetProps> = ({ broken }) => {
  if (broken) throw new Error('Malformed revenue series');
  return <div style={card}>📈 Revenue chart</div>;
};
const ActivityFeed: FC<WidgetProps> = ({ broken }) => {
  if (broken) throw new Error('Feed item missing "actor"');
  return <div style={card}>📰 Activity feed</div>;
};
const StatsRow: FC<WidgetProps> = () => <div style={card}>🔢 Stats (never breaks)</div>;

function withErrorBoundary<P extends object>(
  Wrapped: ComponentType<P>,
  opts: { label: string; resetKeys?: (props: P) => unknown[] },
): ComponentType<P> {
  // TODO: WithBoundary component using SimpleBoundary; fallback with Retry; displayName
  void opts; void SimpleBoundary;
  return Wrapped;
}

const SafeRevenue = withErrorBoundary(RevenueChart, { label: 'revenue chart', resetKeys: p => [p.broken] });
const SafeFeed = withErrorBoundary(ActivityFeed, { label: 'activity feed', resetKeys: p => [p.broken] });

function Exercise3() {
  const [chartBroken, setChartBroken] = useState(false);
  const [feedBroken, setFeedBroken] = useState(false);
  return (
    <section>
      <h2>Exercise 3 — Granular Placement</h2>
      <p>
        <button onClick={() => setChartBroken(true)}>Break chart</button>{' '}
        <button onClick={() => setFeedBroken(true)}>Break feed</button>{' '}
        <button onClick={() => { setChartBroken(false); setFeedBroken(false); }}>Repair data</button>
      </p>

      <h4>Coarse: one boundary around the whole dashboard</h4>
      <SimpleBoundary
        resetKeys={[chartBroken, feedBroken]}
        fallbackRender={({ error }) => <div role="alert" style={{ ...card, borderColor: '#fca5a5' }}>Whole dashboard down: {error.message}</div>}
      >
        <RevenueChart broken={chartBroken} />
        <ActivityFeed broken={feedBroken} />
        <StatsRow broken={false} />
      </SimpleBoundary>

      <h4>Granular: a boundary per widget</h4>
      <SafeRevenue broken={chartBroken} />
      <SafeFeed broken={feedBroken} />
      <StatsRow broken={false} />
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add a "fatal vs recoverable" classification — a custom error class whose fallback
// offers Retry for NetworkError but "Reload" for InvariantError.

// ─── App: the last-resort layer (given) ──────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const RootBoundary: FC<{ children: ReactNode }> = ({ children }) => {
  const [n, setN] = useState(0);
  const report = useCallback((e: Error) => console.warn('[root boundary] would report to Sentry:', e.message), []);
  return (
    <SimpleBoundary
      key={n}
      onError={report}
      fallbackRender={({ error }) => (
        <div role="alert" style={{ ...card, borderColor: '#ef4444', background: '#fef2f2' }}>
          <h3>💥 Something went wrong (root boundary)</h3>
          <p>{error.message}</p>
          <button onClick={() => setN(x => x + 1)}>Reload app</button>
        </div>
      )}
    >
      {children}
    </SimpleBoundary>
  );
};

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 17 — Error Boundary Pattern</h1>
    <RootBoundary>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </RootBoundary>
  </div>
);

export default App;
