// ============================================================
// Topic:   Common Custom Hooks
// Phase:   2 — Hooks
// ============================================================
//
// Custom hooks = plain JS functions that start with "use" and
// call other hooks inside them.
//
// They follow the same rules as built-in hooks.
// They can return anything: a value, a tuple, or an object.
//
// This file: implement 4 essential hooks from scratch.
// Each one tests a different combination of built-in hooks.
// ============================================================

import { useState, useEffect, useRef, useCallback, useDebugValue } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: usePrevious — track the last render's value.
//
// Implement usePrevious(value) that returns the value from the
// PREVIOUS render.
//
// How it works (timing trick):
//   - useRef stores the value from the last time the effect ran.
//   - The effect runs AFTER render — so during render, ref.current
//     still holds the previous render's value.
//   - After render, the effect updates ref to the new value.
//
// Steps:
//   1. Create ref = useRef(undefined).
//   2. Add useEffect(() => { ref.current = value; }, [value]).
//   3. Return ref.current (the previous value, captured before the effect).
//   4. Add useDebugValue to label it in DevTools.
//
// Test: click "+10" — the previous score updates one click behind.
//
// Gotcha: on the VERY FIRST render, previous is undefined.
//         Handle this by returning a default or checking for undefined.

function usePrevious(value) {
  const ref = useRef(undefined);
  // TODO: useEffect(() => { ref.current = value; }, [value]);
  // TODO: useDebugValue(ref.current, prev => `prev: ${prev ?? 'none'}`);
  return ref.current;
}

function Exercise1() {
  const [score, setScore] = useState(0);
  const prevScore = usePrevious(score);

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 14, margin: 0 }}>
        Current: <strong>{score}</strong> |
        Previous: <strong>{prevScore ?? '(none)'}</strong>
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setScore(s => s + 10)}>+10</button>
        <button onClick={() => setScore(s => s - 5)}>−5</button>
        <button onClick={() => setScore(0)}>Reset</button>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        "Previous" lags behind by exactly one click — that's the timing trick.
        Check DevTools Hooks panel for the debug label.
      </p>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: useDebounce — delay a value until input settles.
//
// Implement useDebounce(value, delay) that returns a debounced
// copy of value — it only updates after `delay` ms of no changes.
//
// How it works:
//   - useState tracks the debounced value.
//   - useEffect sets a timeout whenever value changes.
//   - Cleanup cancels the previous timeout (prevents premature updates).
//   - After `delay` ms with no new value, the timeout fires and updates.
//
// Steps:
//   1. const [debounced, setDebounced] = useState(value);
//   2. useEffect with a setTimeout that calls setDebounced(value).
//   3. Return () => clearTimeout(id) as cleanup.
//   4. Add useDebugValue showing live and debounced values.
//
// Test: type quickly — "Debounced" only updates after you pause.
// Bonus: add a visual indicator showing when the debounce is "pending".

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  // TODO: useEffect cleanup pattern
  // useEffect(() => {
  //   const id = setTimeout(() => setDebounced(value), delay);
  //   return () => clearTimeout(id);
  // }, [value, delay]);
  //
  // TODO: useDebugValue({ value, debounced }, ...)
  return debounced;
}

function Exercise2() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const isPending = query !== debouncedQuery;

  return (
    <div style={styles.box}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type here (debounce 400ms)…"
        style={{ padding: '4px 8px' }}
      />
      <p style={{ fontSize: 13, margin: 0 }}>
        Live:      <code style={{ background: '#eee', padding: '1px 4px' }}>{query || '—'}</code>
        {' '}
        {isPending && <span style={{ color: '#ff9800' }}>⏳</span>}
        {' '}
        Debounced: <code style={{ background: '#eee', padding: '1px 4px' }}>{debouncedQuery || '—'}</code>
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        "Debounced" updates only when you stop typing for 400ms.
        The ⏳ indicator shows when a debounce is pending.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: useOnClickOutside — detect clicks outside a ref'd element.
//
// Implement useOnClickOutside(ref, callback) that calls `callback`
// whenever the user clicks outside the element pointed to by `ref`.
//
// How it works:
//   - useEffect adds a mousedown listener to document.
//   - Inside the listener: if ref.current && !ref.current.contains(event.target)
//     → the click was outside → call callback.
//   - Cleanup removes the listener.
//
// Steps:
//   1. useEffect with document.addEventListener('mousedown', handler).
//   2. handler checks ref.current.contains(event.target).
//   3. Return () => document.removeEventListener('mousedown', handler).
//   4. Store `callback` in a ref to avoid stale closure issues.
//
// Test: click inside the card → nothing. Click outside → card closes.
//
// Gotcha: the callback changes on every render if it's an inline function.
//         Store it in a callbackRef to avoid recreating the effect.

function useOnClickOutside(ref, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback; // always fresh, no stale closure

  // TODO: useEffect(() => {
  //   const handler = (event) => {
  //     if (ref.current && !ref.current.contains(event.target)) {
  //       callbackRef.current(event);
  //     }
  //   };
  //   document.addEventListener('mousedown', handler);
  //   return () => document.removeEventListener('mousedown', handler);
  // }, [ref]);
}

function Exercise3() {
  const [open, setOpen] = useState(false);
  const cardRef = useRef(null);

  useOnClickOutside(cardRef, () => setOpen(false));

  return (
    <div style={styles.box}>
      <button onClick={() => setOpen(true)}>Open card</button>
      {open && (
        <div
          ref={cardRef}
          style={{
            border: '2px solid #7c4dff',
            borderRadius: 8,
            padding: '1rem',
            background: '#fff',
            maxWidth: 300,
          }}
        >
          <p style={{ margin: 0, fontWeight: 'bold' }}>Click-outside card</p>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>
            Click anywhere outside this card to close it.
          </p>
          <button onClick={() => setOpen(false)} style={{ marginTop: 8 }}>
            Close (or click outside)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Exercise 4 ──────────────────────────────────────────────
// TOPIC: useLocalStorage — state that persists across page refreshes.
//
// Implement useLocalStorage(key, initialValue) that:
//   - Initializes from localStorage (lazy init to parse once).
//   - Syncs to localStorage whenever the value changes.
//   - Returns [value, setValue] — same API as useState.
//
// Steps:
//   1. Lazy init: useState(() => JSON.parse(localStorage.getItem(key)) ?? initialValue)
//   2. useEffect to write back: localStorage.setItem(key, JSON.stringify(value))
//   3. Return [value, setValue].
//   4. Bonus: listen to the 'storage' event to sync across browser tabs.
//
// Test: change the color, refresh the page — it persists.

function useLocalStorage(key, initialValue) {
  // TODO: lazy init from localStorage
  const [value, setValue] = useState(initialValue);

  // TODO: useEffect to sync to localStorage
  // useEffect(() => {
  //   localStorage.setItem(key, JSON.stringify(value));
  // }, [key, value]);

  // TODO: Bonus — 'storage' event listener for cross-tab sync

  return [value, setValue];
}

const COLORS = ['#e91e63', '#3f51b5', '#4caf50', '#ff9800', '#9c27b0'];

function Exercise4() {
  const [color, setColor] = useLocalStorage('preferred-color', '#3f51b5');

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13, margin: 0 }}>
        Preferred color (persisted to localStorage):
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 36, height: 36,
              background: c,
              border: color === c ? '3px solid #333' : '2px solid transparent',
              borderRadius: '50%',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
      <div style={{
        height: 40, borderRadius: 8,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 13, fontWeight: 'bold',
      }}>
        {color}
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        Refresh the page — the color persists via localStorage.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1>Common Custom Hooks</h1>

      <h2>Exercise 1 — usePrevious</h2>
      <p style={styles.goal}>
        Implement using useRef + useEffect. Return the value from last render.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — useDebounce</h2>
      <p style={styles.goal}>
        setTimeout + cleanup. Returns a value that only updates after idle time.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — useOnClickOutside</h2>
      <p style={styles.goal}>
        Document mousedown listener. Callback stored in ref to avoid staleness.
      </p>
      <Exercise3 />

      <h2>Exercise 4 — useLocalStorage</h2>
      <p style={styles.goal}>
        Lazy init from storage. Sync back on change. Persists across refreshes.
      </p>
      <Exercise4 />
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ddd', borderRadius: 6,
    padding: '0.75rem 1rem', marginBottom: '0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
