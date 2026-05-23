// ============================================================
// Topic:   useCallback
// Phase:   2 — Hooks
// ============================================================
//
// Core insight: useCallback(fn, deps) === useMemo(() => fn, deps)
//
// useCallback only prevents re-renders when BOTH are true:
//   1. The callback is passed to a child component as a prop
//   2. That child is wrapped in React.memo
//
// These exercises prove that through a render-counter pattern.
// ============================================================

import { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';

// ─── Shared helper ────────────────────────────────────────────
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

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Prove that useCallback alone does NOT prevent re-renders
//        if the child is not wrapped in React.memo.
//
// Steps:
//   1. Run the app. Click "Parent counter".
//      Both "without memo" and "with memo" children re-render —
//      even though the handlers are wrapped in useCallback!
//   2. Wrap UnmemoizedChild in React.memo.
//      Now clicking "Parent counter" should stop re-rendering it.
//   3. Conclusion: write a comment on what the TWO requirements are.
//
// Key rule: useCallback alone = useless; useCallback + React.memo = win.

function UnmemoizedChild({ onAdd }) {
  // TODO: wrap this component in React.memo and observe the change
  return (
    <div style={{ padding: 8, background: '#fff3e0', borderRadius: 4 }}>
      <RenderBadge label="UnmemoizedChild" />
      <button onClick={onAdd} style={{ marginLeft: 8 }}>Add</button>
    </div>
  );
}

const MemoizedChild = memo(function MemoizedChild({ onAdd }) {
  return (
    <div style={{ padding: 8, background: '#e8f5e9', borderRadius: 4 }}>
      <RenderBadge label="MemoizedChild" />
      <button onClick={onAdd} style={{ marginLeft: 8 }}>Add</button>
    </div>
  );
});

function Exercise1() {
  const [count, setCount] = useState(0);
  const [counter, setCounter] = useState(0);

  const handleAdd = useCallback(() => {
    setCount(c => c + 1);
  }, []); // stable reference — never recreated

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setCounter(c => c + 1)}>
          Parent counter: {counter}
        </button>
        <RenderBadge label="Parent" />
      </div>
      <p style={{ fontSize: 13 }}>Count: <strong>{count}</strong></p>
      <p style={{ fontSize: 12, color: '#555' }}>Without memo (orange if re-rendered):</p>
      <UnmemoizedChild onAdd={handleAdd} />
      <p style={{ fontSize: 12, color: '#555' }}>With memo (stays green):</p>
      <MemoizedChild onAdd={handleAdd} />
      {/*
        TODO: After observing both, write a comment:
          For useCallback to prevent re-renders, BOTH must be true:
          1. ____
          2. ____
      */}
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Stale closure inside useCallback when a dependency is missing.
//
// The SearchBox below has a bug: the "Submit" button always submits
// an empty string because `query` is missing from the dependency array.
//
// Steps:
//   1. Type something in the input.
//   2. Click "Submit" — see it logs '' instead of your text.
//   3. Fix it by adding `query` to the dependency array.
//   4. Confirm: Submit now logs the correct query value.
//
// This demonstrates why "exhaustive-deps" ESLint rule exists —
// missing deps = stale closure bug.

function Exercise2() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  // BUG: `query` is used inside but not in the deps array
  // The function closes over the stale initial value: ''
  const handleSubmit = useCallback(() => {
    console.log('Submitting:', query); // always logs ''
    setSubmitted(query);
  }, []); // ← BUG: missing [query]

  return (
    <div style={styles.box}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type a search query…"
        style={{ padding: '4px 8px' }}
      />
      <button onClick={handleSubmit}>Submit</button>
      <p style={{ fontSize: 13 }}>
        Last submitted: <strong>{submitted || '(nothing yet)'}</strong>
      </p>
      <p style={{ fontSize: 12, color: '#888' }}>
        Fix the deps array and watch Submit start working correctly.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: useCallback in a custom hook — stable callbacks for consumers.
//
// Build a useCounter hook that returns { count, increment, decrement, reset }.
// The increment/decrement/reset callbacks must be STABLE (useCallback)
// so that any memoized component using them doesn't re-render unnecessarily.
//
// Requirement: all three actions use the functional updater form
//              (prev => prev + 1) so they have empty deps arrays
//              and are truly stable across renders.
//
// Success: CounterDisplay (memoized) should render only ONCE,
//          even as you click increment/decrement many times.

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);

  // TODO: implement increment, decrement, reset using useCallback
  // Each should use the functional updater form so deps can be []
  const increment = () => setCount(c => c + 1);   // BUG: recreated every render
  const decrement = () => setCount(c => c - 1);   // BUG: recreated every render
  const reset     = () => setCount(initial);       // BUG: recreated every render

  return { count, increment, decrement, reset };
}

const CounterDisplay = memo(function CounterDisplay({ count, increment, decrement, reset }) {
  return (
    <div style={{ padding: 8, background: '#e3f2fd', borderRadius: 4 }}>
      <RenderBadge label="CounterDisplay" />
      <p style={{ margin: '4px 0', fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={increment}>+1</button>
        <button onClick={decrement}>−1</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
});

function Exercise3() {
  const { count, increment, decrement, reset } = useCounter(0);

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13 }}>
        CounterDisplay should render only once (green badge) if callbacks
        are stable.  Currently it re-renders on every click (orange).
      </p>
      <CounterDisplay
        count={count}
        increment={increment}
        decrement={decrement}
        reset={reset}
      />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Prove useCallback is useMemo(() => fn, deps) under the hood.
//
// Implement myUseCallback using only useMemo and verify it behaves
// exactly like the real useCallback.

function myUseCallback(fn, deps) {
  // TODO: return useMemo(() => fn, deps);
  return fn; // stub
}

function Playground() {
  const [count, setCount] = useState(0);

  const cb1 = useCallback(() => console.log('useCallback:', count), [count]);
  const cb2 = myUseCallback(() => console.log('myUseCallback:', count), [count]);

  return (
    <div style={styles.box}>
      <button onClick={() => setCount(c => c + 1)}>Increment: {count}</button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={cb1}>Real useCallback</button>
        <button onClick={cb2}>myUseCallback (implement me)</button>
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>
        Both should log the same current count value.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>useCallback</h1>

      <h2>Exercise 1 — useCallback Requires React.memo to Work</h2>
      <p style={styles.goal}>
        Observe: memoized child stays green; unmemoized child still re-renders.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Stale Closure from Missing Dep</h2>
      <p style={styles.goal}>
        Fix the missing dependency so Submit logs the correct query.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Stable Callbacks in a Custom Hook</h2>
      <p style={styles.goal}>
        Wrap the hook's callbacks in useCallback so CounterDisplay renders only once.
      </p>
      <Exercise3 />

      <h2>Playground — Implement useCallback via useMemo</h2>
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
