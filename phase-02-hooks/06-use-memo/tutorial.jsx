// ============================================================
// Topic:   useMemo
// Phase:   2 — Hooks
// ============================================================
//
// Two distinct reasons to use useMemo:
//   1. Skip expensive computation (the obvious one)
//   2. Stabilize object/array references so memoized children
//      don't re-render unnecessarily (the subtle one)
//
// These exercises prove both through a render-counter pattern.
// ============================================================

import { useState, useMemo, memo, useRef, createContext, useContext } from 'react';

// ─── Shared helpers ───────────────────────────────────────────

// RenderBadge: shows how many times a component has rendered.
function RenderBadge({ label }) {
  const count = useRef(0);
  count.current++;
  return (
    <span style={{
      fontSize: 11,
      background: count.current > 1 ? '#ff9800' : '#4caf50',
      color: '#fff',
      borderRadius: 10,
      padding: '1px 8px',
    }}>
      {label} renders: {count.current}
    </span>
  );
}

// Simulates a slow computation (~20ms)
function slowFilter(items, query) {
  const start = performance.now();
  while (performance.now() - start < 20) {} // artificial delay
  return items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
}

const ITEMS = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  name: `Item ${i} — ${['apple', 'banana', 'cherry', 'date', 'elderberry'][i % 5]}`,
}));

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Skip expensive computation with useMemo.
//
// The component below filters 200 items on every render —
// including unrelated re-renders from the "unrelated counter".
//
// Steps:
//   1. Click "Unrelated counter" — notice it feels sluggish (the
//      filter runs even though the query didn't change).
//   2. Wrap the filter in useMemo so it only runs when `query` changes.
//   3. Click "Unrelated counter" again — it should feel instant now.
//
// Success: changing the query re-filters; clicking the counter
//          does NOT re-run the filter.

function Exercise1() {
  const [query, setQuery] = useState('');
  const [counter, setCounter] = useState(0);

  // BUG: runs on EVERY render — even when only counter changes
  const filtered = slowFilter(ITEMS, query);
  // TODO: wrap in useMemo(() => slowFilter(ITEMS, query), [query])

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter items…"
          style={{ padding: '4px 8px', flex: 1 }}
        />
        <button onClick={() => setCounter(c => c + 1)}>
          Unrelated counter: {counter}
        </button>
      </div>
      <p style={{ fontSize: 13 }}>
        Showing <strong>{filtered.length}</strong> of {ITEMS.length} items
      </p>
      <ul style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, margin: 0 }}>
        {filtered.slice(0, 20).map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
        {filtered.length > 20 && <li>…and {filtered.length - 20} more</li>}
      </ul>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Stable reference — useMemo prevents child from re-rendering
//        when the parent re-renders for unrelated reasons.
//
// MemoizedChild is wrapped in React.memo so it only re-renders
// when its props actually change.  But if the parent creates a
// NEW array on every render, React.memo sees a different reference
// each time → child re-renders anyway.
//
// Steps:
//   1. Click "Parent counter" — watch the child's render count climb
//      even though the child's data didn't change.
//   2. Wrap `selectedItems` in useMemo so the array reference is
//      stable when the ids haven't changed.
//   3. Click "Parent counter" again — child should NOT re-render.
//
// Success: child render count stays at 1 while you click the counter.

const MemoizedChild = memo(function Child({ items }) {
  return (
    <div style={{
      background: '#f9f9f9',
      border: '1px solid #ccc',
      borderRadius: 6,
      padding: '0.5rem',
    }}>
      <RenderBadge label="Child" />
      <ul style={{ fontSize: 12, margin: '8px 0 0', padding: '0 0 0 1rem' }}>
        {items.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  );
});

const SELECTED_IDS = [3, 7, 12, 42];

function Exercise2() {
  const [counter, setCounter] = useState(0);

  // BUG: creates a NEW array reference every render
  const selectedItems = ITEMS.filter(item => SELECTED_IDS.includes(item.id));
  // TODO: wrap in useMemo(() => ITEMS.filter(...), [])
  //       deps are stable constants, so the array reference never changes

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setCounter(c => c + 1)}>
          Parent counter: {counter}
        </button>
        <RenderBadge label="Parent" />
      </div>
      <p style={{ fontSize: 13 }}>
        Child receives the same 4 items — should never re-render after mount.
      </p>
      <MemoizedChild items={selectedItems} />
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Context value stabilization — the most common real-world
//        useMemo pattern in large apps.
//
// When a context provider re-renders, it creates a new `value`
// object on every render.  This causes EVERY context consumer to
// re-render, even if the actual data didn't change.
//
// Steps:
//   1. Click "Toggle dark mode" — both consumers re-render (expected).
//   2. Click "Unrelated parent counter" — consumers ALSO re-render (bug!).
//   3. Wrap the context value in useMemo([dark]).
//      Now clicking the counter should NOT re-render consumers.

const ThemeContext = createContext({ dark: false, toggle: () => {} });

function ThemeConsumerA() {
  const { dark } = useContext(ThemeContext);
  return (
    <div style={{ padding: 8, background: dark ? '#333' : '#f5f5f5', borderRadius: 4 }}>
      <RenderBadge label="ConsumerA" />
      <p style={{ margin: 0, color: dark ? '#fff' : '#333', fontSize: 13 }}>
        Panel A — {dark ? 'Dark' : 'Light'} mode
      </p>
    </div>
  );
}

function ThemeConsumerB() {
  const { dark } = useContext(ThemeContext);
  return (
    <div style={{ padding: 8, background: dark ? '#444' : '#eee', borderRadius: 4 }}>
      <RenderBadge label="ConsumerB" />
      <p style={{ margin: 0, color: dark ? '#ddd' : '#555', fontSize: 13 }}>
        Panel B — {dark ? 'Dark' : 'Light'} mode
      </p>
    </div>
  );
}

function Exercise3() {
  const [dark, setDark] = useState(false);
  const [counter, setCounter] = useState(0);

  // BUG: creates a new object every render — all consumers re-render
  const contextValue = { dark, toggle: () => setDark(d => !d) };
  // TODO: wrap in useMemo(() => ({ dark, toggle: () => setDark(d => !d) }), [dark])

  return (
    <ThemeContext.Provider value={contextValue}>
      <div style={styles.box}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setDark(d => !d)}>Toggle dark mode</button>
          <button onClick={() => setCounter(c => c + 1)}>
            Unrelated counter: {counter}
          </button>
        </div>
        <p style={{ fontSize: 13 }}>
          After memoizing context value, only "Toggle dark mode" should
          cause consumers to re-render.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemeConsumerA />
          <ThemeConsumerB />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Test: when does useMemo NOT help?
//
// Below, useMemo wraps a value BUT the child is NOT React.memo'd.
// Steps:
//   1. Click the counter — notice the child STILL re-renders.
//   2. Write a comment explaining WHY useMemo doesn't help here.
//   3. What two conditions must both be true for useMemo to
//      prevent a child re-render?

function PlainChild({ value }) {
  // NOT wrapped in React.memo — useMemo alone cannot stop this re-render
  return (
    <div style={{ padding: '0.5rem', background: '#fff3e0', borderRadius: 4 }}>
      <RenderBadge label="PlainChild" />
      <p style={{ margin: 0, fontSize: 13 }}>value = {value}</p>
    </div>
  );
}

function Playground() {
  const [counter, setCounter] = useState(0);
  const memoedValue = useMemo(() => ({ x: 1, y: 2 }), []);

  return (
    <div style={styles.box}>
      <button onClick={() => setCounter(c => c + 1)}>
        Counter: {counter}
      </button>
      <PlainChild value={JSON.stringify(memoedValue)} />
      {/*
        TODO: Add a comment:
          - Why does PlainChild still re-render despite useMemo on the value?
          - What two things must be true for useMemo to prevent child re-renders?
            1. ____
            2. ____
      */}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>useMemo</h1>

      <h2>Exercise 1 — Skip Expensive Computation</h2>
      <p style={styles.goal}>
        Wrap the filter in useMemo — the unrelated counter should no longer lag.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Stable Reference for Memoized Child</h2>
      <p style={styles.goal}>
        Stabilize selectedItems so MemoizedChild's render count stays at 1.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Context Value Stabilization</h2>
      <p style={styles.goal}>
        Memoize the context value so consumers only re-render when theme changes.
      </p>
      <Exercise3 />

      <h2>Playground — When useMemo Doesn't Help</h2>
      <Playground />
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
