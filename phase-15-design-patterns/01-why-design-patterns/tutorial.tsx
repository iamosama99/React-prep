// ============================================================
// Topic:   Why React Needs Design Patterns
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — recognise smells and name the pattern (self-checking quiz)
//   Exercise 2 — refresher: fix three classic bugs in one component
//   Exercise 3 — rule of three: extract duplicated logic into a hook
//
// Run: npm run tutorial why-design-patterns
// ============================================================

import { useState, useEffect, FC } from 'react';

// ─── Exercise 1: Smell → Pattern ─────────────────────────────
//
// SITUATION
//   In an interview, "how would you structure this?" is really
//   "what smell do you see, and what is the named answer?"
//   Pick the pattern you'd reach for. Wrong answers are the point —
//   read the explanation after each one.

type PatternId =
  | 'container-presenter'
  | 'compound'
  | 'custom-hook'
  | 'provider'
  | 'strategy'
  | 'facade'
  | 'error-boundary'
  | 'optimistic';

const PATTERNS: { id: PatternId; label: string }[] = [
  { id: 'container-presenter', label: 'Container–Presenter' },
  { id: 'compound', label: 'Compound components' },
  { id: 'custom-hook', label: 'Custom hook' },
  { id: 'provider', label: 'Provider (Context)' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'facade', label: 'Facade' },
  { id: 'error-boundary', label: 'Error boundary' },
  { id: 'optimistic', label: 'Optimistic UI' },
];

const SMELLS: { snippet: string; answer: PatternId; why: string }[] = [
  {
    snippet: `<Modal title="Delete?" body="Sure?" footerButtons={[...]}
       showHeader={false} headerIcon="warn" footerAlign="right" />`,
    answer: 'compound',
    why: 'Prop soup: the caller wants layout control. Modal.Header / Modal.Body / Modal.Footer invert the control.',
  },
  {
    snippet: `// Same 12 lines in Sidebar, Header and Banner:
const [online, setOnline] = useState(navigator.onLine);
useEffect(() => { /* add + remove listeners */ }, []);`,
    answer: 'custom-hook',
    why: 'Identical stateful logic in three places — extract it into useOnlineStatus().',
  },
  {
    snippet: `<App user={u}><Layout user={u}><Sidebar user={u}>
  <Avatar user={u} /></Sidebar></Layout></App>`,
    answer: 'provider',
    why: 'Prop drilling: intermediate components carry a value they never use.',
  },
  {
    snippet: `function usePricing(plan) {
  if (plan === 'free') { ... } else if (plan === 'pro') { ... }
  else if (plan === 'team') { ... } // a 4th arrives every quarter
}`,
    answer: 'strategy',
    why: 'Behaviour varies by a discriminator and keeps growing — swap in a strategy per plan instead of branching.',
  },
  {
    snippet: `function Checkout() {
  const cart = useCart(); const flags = useFlags(); const perms = usePermissions();
  const tax = useTax(); const promo = usePromo(); /* ...and 4 more */
}`,
    answer: 'facade',
    why: 'The component talks to many subsystems. One useCheckout() facade gives it a single, simple entry point.',
  },
  {
    snippet: `// A malformed API response makes <Chart> throw during render
// → the ENTIRE page is a white screen.`,
    answer: 'error-boundary',
    why: 'Render errors propagate up the tree. An error boundary contains the blast radius and shows a fallback.',
  },
  {
    snippet: `async function like() {
  await api.like(id);   // 800 ms of dead UI
  setLiked(true);
}`,
    answer: 'optimistic',
    why: 'The UI waits on the server for a change that almost always succeeds. Update first, reconcile after.',
  },
  {
    snippet: `function Dashboard() {
  // useEffect fetch + loading/error flags + sorting + 90 lines of JSX
}`,
    answer: 'container-presenter',
    why: 'Data acquisition and markup share one component. Split into a container (knows) and a presenter (shows).',
  },
];

function Exercise1() {
  const [picks, setPicks] = useState<Record<number, PatternId | ''>>({});

  const score = SMELLS.filter((s, i) => picks[i] === s.answer).length;
  const answered = Object.values(picks).filter(Boolean).length;

  return (
    <section>
      <h2>Exercise 1 — Smell → Pattern</h2>
      <p style={muted}>
        Score: {score} / {SMELLS.length} ({answered} answered)
      </p>
      {SMELLS.map((s, i) => {
        const pick = picks[i] ?? '';
        const correct = pick === s.answer;
        return (
          <div key={i} style={card}>
            <pre style={codeBlock}>{s.snippet}</pre>
            <select
              value={pick}
              onChange={e => setPicks(p => ({ ...p, [i]: e.target.value as PatternId | '' }))}
            >
              <option value="">— which pattern? —</option>
              {PATTERNS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {pick && (
              <p style={{ margin: '8px 0 0', color: correct ? '#15803d' : '#b91c1c', fontSize: 13 }}>
                {correct ? '✓ ' : '✗ '}
                {correct ? s.why : `Not quite — think about what pain the snippet shows. (${s.why})`}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ─── Exercise 2: Refresher — Three Classic Bugs ──────────────
//
// SITUATION
//   The component below is the kind of thing that ships and then
//   misbehaves. Three refresher ideas are being violated:
//     (a) state must be updated immutably
//     (b) effects need cleanup
//     (c) list items need stable keys, not indexes
//
// YOUR TASK — fix each one. The UI makes each bug observable:
//   (a) Click a todo. Nothing visually updates. Why?
//   (b) Toggle "Show ticker" on/off several times. "Active intervals" grows.
//   (c) Type in a row's note field, then click "Reverse". Notes stay put
//       while the labels move.

let activeIntervals = 0;
function trackedSetInterval(fn: () => void, ms: number) {
  activeIntervals++;
  return setInterval(fn, ms);
}
function trackedClearInterval(id: ReturnType<typeof setInterval>) {
  activeIntervals--;
  clearInterval(id);
}

type Todo = { id: number; text: string; done: boolean };

const Ticker: FC = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = trackedSetInterval(() => setTick(t => t + 1), 1000);
    // TODO (b): return a cleanup that calls trackedClearInterval(id)
    void id;
  }, []);

  return <span>tick: {tick}</span>;
};

function Exercise2() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn patterns', done: false },
    { id: 2, text: 'Ship refactor', done: false },
    { id: 3, text: 'Review PR', done: false },
  ]);
  const [showTicker, setShowTicker] = useState(true);
  const [, force] = useState(0);

  const toggle = (id: number) => {
    // TODO (a): this mutates the existing object and re-sets the SAME array reference.
    //           Produce a new array with a new object for the toggled todo.
    const t = todos.find(t => t.id === id);
    if (t) {
      t.done = !t.done;
      setTodos(todos);
    }
  };

  return (
    <section>
      <h2>Exercise 2 — Three Classic Bugs</h2>

      <div style={card}>
        <strong>(a) Immutability</strong>
        <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
          {/* TODO (c): key={i} is wrong here — use a stable identifier */}
          {todos.map((t, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <button onClick={() => toggle(t.id)}>{t.done ? '☑' : '☐'}</button>
              <span style={{ textDecoration: t.done ? 'line-through' : 'none', minWidth: 120 }}>
                {t.text}
              </span>
              <input placeholder="note…" style={{ width: 120 }} />
            </li>
          ))}
        </ul>
        <button onClick={() => setTodos(ts => [...ts].reverse())}>Reverse (tests bug c)</button>{' '}
        <button onClick={() => force(n => n + 1)}>Force re-render</button>
        <p style={muted}>
          After fixing (a), the checkbox flips on click. Note: a "force re-render" made the mutated
          state <em>appear</em> to work — which is exactly why mutation bugs are hard to spot.
        </p>
      </div>

      <div style={card}>
        <strong>(b) Effect cleanup</strong>
        <p>
          <label>
            <input type="checkbox" checked={showTicker} onChange={e => setShowTicker(e.target.checked)} />{' '}
            Show ticker
          </label>{' '}
          {showTicker && <Ticker />}
        </p>
        <p style={muted}>
          Active intervals: <strong>{activeIntervals}</strong>{' '}
          <button onClick={() => force(n => n + 1)}>refresh count</button>
          <br />
          Toggle the ticker a few times, then refresh. It should read 1 (visible) or 0 (hidden).
        </p>
      </div>
    </section>
  );
}

// ─── Exercise 3: Rule of Three → Custom Hook ─────────────────
//
// SITUATION
//   Two components below each re-implement "am I online?".
//   A third one is being requested. Rule of three: it's time to extract.
//
// YOUR TASK
//   1. Implement useOnlineStatus(): boolean
//        - initial value from navigator.onLine
//        - subscribe to window 'online' / 'offline' events
//        - clean up both listeners
//   2. Replace the duplicated logic in OnlineBadge and OnlineBanner
//      with a single call to your hook.
//   Use the buttons to fire synthetic offline/online events and verify.

function useOnlineStatus(): boolean {
  // TODO: useState + useEffect (subscribe, cleanup) and return the boolean
  return true;
}

const OnlineBadge: FC = () => {
  // TODO: replace this duplicated logic with useOnlineStatus()
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return <span style={{ color: online ? '#15803d' : '#b91c1c' }}>● {online ? 'online' : 'offline'}</span>;
};

const OnlineBanner: FC = () => {
  // TODO: replace this duplicated logic with useOnlineStatus()
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online ? null : <div style={{ background: '#fee2e2', padding: 8 }}>You are offline — changes will sync later.</div>;
};

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Rule of Three</h2>
      <div style={card}>
        <OnlineBadge />
        <OnlineBanner />
        <p>
          <button onClick={() => window.dispatchEvent(new Event('offline'))}>Fire "offline"</button>{' '}
          <button onClick={() => window.dispatchEvent(new Event('online'))}>Fire "online"</button>
        </p>
        <p style={muted}>
          Checklist: a single useOnlineStatus, no duplicated listener code in the components,
          both consumers update together, listeners removed on unmount.
        </p>
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Pick any smell from Exercise 1 and refactor it here.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 } as const;
const codeBlock = {
  background: '#0f172a', color: '#e2e8f0', padding: 10, borderRadius: 6,
  fontSize: 12, overflowX: 'auto', margin: '0 0 8px',
} as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 01 — Why React Needs Design Patterns</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
