// ============================================================
// Topic:   Higher-Order Functions & Higher-Order Components
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — HOFs in plain TypeScript: once, memoize, compose
//   Exercise 2 — A typed data-injecting HOC (withMovies)
//   Exercise 3 — A gate HOC (withAuth) + the "HOC inside render" bug
//
// Run: npm run tutorial hof-and-hoc
// ============================================================

import {
  createContext, useContext, useEffect, useState, ComponentType, FC,
} from 'react';

// ─── Exercise 1: HOFs — the Ladder Under HOCs ────────────────
//
// SITUATION
//   A HOC is a HOF applied to components. Warm up on plain functions.
//   The checks below run automatically — make them all green.
//
// BUILD
//   once(fn)      → calls fn on the first call only; later calls return the FIRST result
//   memoize(fn)   → caches results keyed by the single argument
//   compose(...fns) → right-to-left composition; compose() is the identity

function once<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  // TODO: keep `called` and `result` in a closure
  return fn;
}

function memoize<A, R>(fn: (arg: A) => R): (arg: A) => R {
  // TODO: a Map<A, R> in the closure; check .has() (results may be falsy)
  return fn;
}

function compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  // TODO: reduceRight over fns, starting from x
  void fns;
  return x => x;
}

const CHECKS: { name: string; run: () => boolean }[] = [
  { name: 'once: calls the function only on the first call', run: () => { let n = 0; const f = once(() => ++n); f(); f(); return n === 1; } },
  { name: 'once: later calls return the first result', run: () => { const f = once((x: number) => x * 2); f(2); return f(5) === 4; } },
  { name: 'memoize: computes once per argument', run: () => { let calls = 0; const sq = memoize((x: number) => { calls++; return x * x; }); sq(3); sq(3); return calls === 1 && sq(3) === 9; } },
  { name: 'memoize: caches falsy results too', run: () => { let calls = 0; const z = memoize((x: number) => { calls++; return x * 0; }); z(1); z(1); return calls === 1; } },
  { name: 'compose: applies right-to-left', run: () => compose<number>(x => x + 1, x => x * 2)(5) === 11 },
  { name: 'compose(): is the identity', run: () => compose<number>()(7) === 7 },
];

function Exercise1() {
  const [, rerun] = useState(0);
  return (
    <section>
      <h2>Exercise 1 — HOFs</h2>
      <button onClick={() => rerun(n => n + 1)}>Re-run checks</button>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {CHECKS.map(c => {
          let ok = false;
          try { ok = c.run(); } catch { ok = false; }
          return <li key={c.name} style={{ color: ok ? '#15803d' : '#b91c1c' }}>{ok ? '✓' : '✗'} {c.name}</li>;
        })}
      </ul>
    </section>
  );
}

// ─── Exercise 2: A Typed Data-Injecting HOC ──────────────────
//
// SITUATION
//   Three screens need the movie list, each with its own layout. Instead
//   of repeating the fetch, inject { data, loading, error } via a HOC.
//
// BUILD
//   withMovies<P extends Injected>(Wrapped: ComponentType<P>)
//     - returns a component whose props are Omit<P, keyof Injected>
//     - calls useMovies() and renders <Wrapped {...props} {...state} />
//       (cast props with `as unknown as P` at the seam)
//     - sets displayName = `withMovies(${Wrapped.displayName ?? Wrapped.name})`
//
// CHECK
//   - <MovieListWithData title="…" /> compiles WITHOUT data/loading/error.
//   - The panel below prints the displayName.

type Movie = { id: number; title: string; year: number };
type Injected = { data: Movie[] | null; loading: boolean; error: Error | null };

function useMovies(): Injected {
  const [state, setState] = useState<Injected>({ data: null, loading: true, error: null });
  useEffect(() => {
    const t = setTimeout(
      () => setState({
        data: [
          { id: 1, title: 'Arrival', year: 2016 },
          { id: 2, title: 'Dune', year: 2021 },
          { id: 3, title: 'Her', year: 2013 },
        ],
        loading: false,
        error: null,
      }),
      600,
    );
    return () => clearTimeout(t);
  }, []);
  return state;
}

function MovieList({ data, loading, error, title }: Injected & { title: string }) {
  if (error) return <p style={{ color: '#b91c1c' }}>{error.message}</p>;
  if (loading) return <p style={muted}>{title}: loading…</p>;
  if (!data) return <p style={muted}>{title}: no data — is withMovies implemented?</p>;
  return (
    <div>
      <strong>{title}</strong>
      <ul>{data.map(m => <li key={m.id}>{m.title} ({m.year})</li>)}</ul>
    </div>
  );
}

function withMovies<P extends Injected>(Wrapped: ComponentType<P>): ComponentType<Omit<P, keyof Injected>> {
  // TODO: define WithMovies(props: Omit<P, keyof Injected>) that calls useMovies()
  //       and renders <Wrapped {...(props as unknown as P)} {...state} />
  //       set WithMovies.displayName, return WithMovies
  void useMovies;
  return Wrapped as unknown as ComponentType<Omit<P, keyof Injected>>;
}

// Defined ONCE at module scope
const MovieListWithData = withMovies(MovieList);

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — withMovies</h2>
      <div style={card}>
        <MovieListWithData title="Now showing" />
      </div>
      <p style={muted}>displayName: <code>{MovieListWithData.displayName ?? '(none)'}</code></p>
    </section>
  );
}

// ─── Exercise 3: withAuth Gate + the Remount Bug ─────────────
//
// SITUATION
//   AdminPanel must never MOUNT for logged-out users (its effects would
//   hit the API). A hook can't prevent mounting; a HOC can.
//
// BUILD
//   withAuth<P extends object>(Wrapped: ComponentType<P>)
//     - reads AuthContext; if no user: render <p>Please log in</p>
//       (Wrapped must NOT be rendered — watch the "mounts" counter stay 0)
//     - otherwise render <Wrapped {...props} />
//     - set displayName
//
// THEN
//   BuggyParent creates the HOC INSIDE render. Click "Bump parent" and watch
//   the child's typed text disappear (remount every render). Fix it by
//   hoisting the enhanced component to module scope.

const AuthContext = createContext<{ user: string | null }>({ user: null });

let adminMounts = 0;
const AdminPanel: FC<{ title: string }> = ({ title }) => {
  useEffect(() => { adminMounts++; }, []);
  const [note, setNote] = useState('');
  return (
    <div style={card}>
      <strong>{title}</strong>
      <div><input value={note} onChange={e => setNote(e.target.value)} placeholder="type a note…" /></div>
    </div>
  );
};

function withAuth<P extends object>(Wrapped: ComponentType<P>): ComponentType<P> {
  // TODO: WithAuth reads useContext(AuthContext); gate on user; set displayName
  void useContext;
  return Wrapped;
}

const SecureAdminPanel = withAuth(AdminPanel);

// Bug: a NEW component type every parent render → unmount + mount of the subtree
const BuggyParent: FC = () => {
  const [n, setN] = useState(0);
  const Enhanced = withAuth(AdminPanel);           // ← TODO: hoist (use SecureAdminPanel)
  return (
    <div>
      <button onClick={() => setN(x => x + 1)}>Bump parent ({n})</button>
      <Enhanced title="Buggy: type here, then bump the parent" />
    </div>
  );
};

function Exercise3() {
  const [user, setUser] = useState<string | null>(null);
  const [, refresh] = useState(0);
  return (
    <section>
      <h2>Exercise 3 — withAuth</h2>
      <p>
        <button onClick={() => setUser(u => (u ? null : 'ada'))}>{user ? 'Log out' : 'Log in'}</button>{' '}
        <span style={muted}>
          AdminPanel mounts so far: <strong>{adminMounts}</strong>{' '}
          <button onClick={() => refresh(n => n + 1)}>refresh count</button>
        </span>
      </p>
      <AuthContext.Provider value={{ user }}>
        <SecureAdminPanel title="Secure admin panel" />
        <BuggyParent />
      </AuthContext.Provider>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: compose(withAuth, withMovies)(MovieList) — what order should the gate go in?

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 06 — HOFs &amp; HOCs</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
