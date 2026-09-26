// ============================================================
// Topic:   Suspense Data-Fetching Pattern
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// React 19's use(promise) isn't available in this React 18 sandbox, so you
// build its ENGINE by hand: a promise cache whose read() throws while
// pending — exactly what use() does for you. (Same approach as Phase 11.)
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — build the cache: preload / read / invalidate; then retry that works
//   Exercise 2 — kill a waterfall by preloading in parallel; measure the difference
//   Exercise 3 — startTransition: keep old content instead of re-showing the fallback
//
// Run: npm run tutorial suspense-fetching
// ============================================================

import {
  Component, Suspense, useEffect, useRef, useState, useTransition, ErrorInfo, FC, ReactNode,
} from 'react';

// ─── Fake API ────────────────────────────────────────────────
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
type User = { id: number; name: string };
type Post = { id: number; title: string };

let failNext = false;
const api = {
  async user(id: number): Promise<User> {
    await wait(700);
    if (id === 3 || failNext) { failNext = false; throw new Error(`User ${id} could not be loaded`); }
    return { id, name: ['', 'Ada Lovelace', 'Grace Hopper'][id] ?? `User ${id}` };
  },
  async posts(id: number): Promise<Post[]> {
    await wait(700);
    return [1, 2].map(n => ({ id: n, title: `Post ${n} by user ${id}` }));
  },
};

// ─── Given: a small error boundary (Topic 17) ────────────────
type BoundaryProps = {
  children: ReactNode;
  fallbackRender: (p: { error: Error; reset: () => void }) => ReactNode;
  onReset?: () => void;
  resetKeys?: unknown[];
};
class SimpleBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_e: Error, _i: ErrorInfo) { /* log here in real apps */ }
  componentDidUpdate(prev: BoundaryProps, prevState: { error: Error | null }) {
    const a = prev.resetKeys ?? [], b = this.props.resetKeys ?? [];
    if (prevState.error && (a.length !== b.length || a.some((x, i) => !Object.is(x, b[i])))) this.reset();
  }
  reset = () => { this.props.onReset?.(); this.setState({ error: null }); };
  render() {
    return this.state.error
      ? this.props.fallbackRender({ error: this.state.error, reset: this.reset })
      : this.props.children;
  }
}

// ─── Exercise 1: The Promise Cache (your use()) ──────────────
//
// BUILD
//   type Entry<T> = pending{promise} | success{value} | error{error}
//   const cache = new Map<string, Entry<unknown>>()
//
//   preload(key, fetcher)   if the key is NOT cached: call fetcher(), store a 'pending'
//                           entry whose promise, when settled, REPLACES the entry with
//                           'success' or 'error'. (The stored promise itself must never reject —
//                           it's only a "wake me up" signal.)
//   read(key, fetcher)      preload(key, fetcher) then look at the entry:
//                             pending  → throw entry.promise     (Suspense shows the fallback)
//                             error    → throw entry.error       (Error boundary catches it)
//                             success  → return entry.value
//   invalidate(key?)        delete one key, or clear all
//
// THEN  The demo: user 3 always fails. Click "Retry" — the boundary must reset
//       AND the cache entry must be invalidated, otherwise the cached error re-throws.
//
// (The stub read() throws a never-resolving promise, so you'll see the fallback forever.)

type Entry<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown };

const cache = new Map<string, Entry<unknown>>();

function preload<T>(key: string, fetcher: () => Promise<T>): void {
  // TODO: if (cache.has(key)) return; …
  void key; void fetcher;
}

function read<T>(key: string, fetcher: () => Promise<T>): T {
  // TODO: preload(key, fetcher); const entry = cache.get(key)!; switch on entry.status …
  void key; void fetcher; void preload;
  throw new Promise<void>(() => { /* never resolves until you implement read() */ });
}

function invalidate(key?: string) {
  // TODO: key === undefined ? cache.clear() : cache.delete(key)
  void key;
}

const userKey = (id: number) => `user:${id}`;
const postsKey = (id: number) => `posts:${id}`;
const readUser = (id: number) => read(userKey(id), () => api.user(id));
const readPosts = (id: number) => read(postsKey(id), () => api.posts(id));

const UserCard: FC<{ id: number }> = ({ id }) => {
  const user = readUser(id);                   // ← only the happy path lives here
  return <div style={card}>👤 <strong>{user.name}</strong></div>;
};

function Exercise1() {
  const [id, setId] = useState(1);
  return (
    <section>
      <h2>Exercise 1 — The Cache</h2>
      <p>
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => setId(n)} style={{ fontWeight: n === id ? 700 : 400 }}>
            user {n}{n === 3 ? ' (always fails)' : ''}
          </button>
        ))}{' '}
        <button onClick={() => invalidate()}>clear cache</button>
      </p>
      <SimpleBoundary
        resetKeys={[id]}
        onReset={() => invalidate(userKey(id))}
        fallbackRender={({ error, reset }) => (
          <div role="alert" style={{ ...card, borderColor: '#fca5a5' }}>
            {error.message} <button onClick={reset}>Retry</button>
          </div>
        )}
      >
        <Suspense fallback={<div style={{ ...card, color: '#64748b' }}>loading user…</div>}>
          <UserCard id={id} />
        </Suspense>
      </SimpleBoundary>
    </section>
  );
}

// ─── Exercise 2: Kill the Waterfall ──────────────────────────
//
// SITUATION
//   Waterfall: <Posts> only mounts AFTER <WaterfallProfile> has its user, so
//   the posts request can't even start until the user request finishes
//   (≈ 700 + 700 ms).
//
// BUILD  In ParallelPanel's run(): call preload() for BOTH keys BEFORE
//   setting state, so both requests are in flight together (≈ 700 ms total).
//   The components themselves stay unchanged — they just read().
//
// The stopwatch shows time-to-fully-shown for each panel.

const Posts: FC<{ id: number; onShown: () => void }> = ({ id, onShown }) => {
  const posts = readPosts(id);
  useEffect(() => { onShown(); }, [onShown]);
  return <ul style={{ margin: '6px 0' }}>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
};

const Profile: FC<{ id: number; onShown: () => void }> = ({ id, onShown }) => {
  const user = readUser(id);
  return (
    <div>
      <strong>{user.name}</strong>
      <Posts id={id} onShown={onShown} />   {/* nested: mounts only after the user has resolved */}
    </div>
  );
};

function useStopwatch() {
  const t0 = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  return {
    elapsed,
    start: () => { t0.current = performance.now(); setElapsed(null); },
    stop: () => {
      if (t0.current === null) return;
      setElapsed(Math.round(performance.now() - t0.current));
      t0.current = null;
    },
  };
}

const WaterfallPanel: FC = () => {
  const [run, setRun] = useState(0);
  const sw = useStopwatch();
  return (
    <div style={card}>
      <strong>Waterfall</strong>{' '}
      <button onClick={() => { invalidate(); sw.start(); setRun(r => r + 1); }}>run</button>{' '}
      <span style={muted}>time to fully shown: {sw.elapsed === null ? '…' : `${sw.elapsed} ms`}</span>
      {run > 0 && (
        <Suspense key={run} fallback={<div style={muted}>loading…</div>}>
          <Profile id={1} onShown={sw.stop} />
        </Suspense>
      )}
    </div>
  );
};

const ParallelPanel: FC = () => {
  const [run, setRun] = useState(0);
  const sw = useStopwatch();
  function runIt() {
    invalidate();
    // TODO: preload(userKey(2), () => api.user(2)); preload(postsKey(2), () => api.posts(2));
    void preload; void postsKey;
    sw.start();
    setRun(r => r + 1);
  }
  return (
    <div style={card}>
      <strong>Parallel (preload)</strong>{' '}
      <button onClick={runIt}>run</button>{' '}
      <span style={muted}>time to fully shown: {sw.elapsed === null ? '…' : `${sw.elapsed} ms`}</span>
      {run > 0 && (
        <Suspense key={run} fallback={<div style={muted}>loading…</div>}>
          <Profile id={2} onShown={sw.stop} />
        </Suspense>
      )}
    </div>
  );
};

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Waterfall vs Parallel</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <WaterfallPanel />
        <ParallelPanel />
      </div>
    </section>
  );
}

// ─── Exercise 3: Keep the Old UI (Transitions) ───────────────
//
// SITUATION
//   Switching users suspends the profile. Left alone, React replaces the
//   content you were reading with the fallback every time (panel A).
//
// BUILD  In panel B, wrap the state update in startTransition and dim the
//   content while isPending. The old profile stays visible until the new one
//   is ready; the fallback only shows on the FIRST load.
//
// TEST  Click "clear cache" first, then switch users in both panels.

const Switcher: FC<{ title: string; transition: boolean }> = ({ title, transition }) => {
  const [id, setId] = useState(1);
  const [isPending, startTransition] = useTransition();

  function select(next: number) {
    if (!transition) { setId(next); return; }
    // TODO: startTransition(() => setId(next));
    void startTransition;
    setId(next);
  }

  return (
    <div style={card}>
      <strong>{title}</strong>
      <div>
        {[1, 2].map(n => (
          <button key={n} onClick={() => select(n)} style={{ fontWeight: n === id ? 700 : 400 }}>user {n}</button>
        ))}
        {transition && isPending && <span style={muted}> updating…</span>}
      </div>
      <div style={{ opacity: transition && isPending ? 0.5 : 1, transition: 'opacity .15s' }}>
        <Suspense fallback={<div style={{ ...card, color: '#64748b' }}>loading user…</div>}>
          <UserCard id={id} />
        </Suspense>
      </div>
    </div>
  );
};

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Transitions</h2>
      <button onClick={() => invalidate()}>clear cache</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <Switcher title="A. Plain setState (fallback flashes)" transition={false} />
        <Switcher title="B. startTransition (old UI stays)" transition />
      </div>
    </section>
  );
}

// ─── React 19 equivalent (for reference) ─────────────────────
const REACT19 = `// The cache/preload is the same idea; read() becomes use():
function UserCard({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// Promise created OUTSIDE render — event handler, loader, or a Server Component parent:
function select(id: number) { startTransition(() => setPromise(fetchUser(id))); }

<ErrorBoundary fallbackRender={...}>
  <Suspense fallback={<Skeleton />}>
    <UserCard userPromise={promise} />
  </Suspense>
</ErrorBoundary>`;

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 18 — Suspense Data Fetching</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
    <hr style={{ margin: '32px 0' }} />
    <h3>React 19 equivalent</h3>
    <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
      {REACT19}
    </pre>
  </div>
);

export default App;
