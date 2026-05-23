// ============================================================
// Topic:   useRef
// Phase:   2 — Hooks
// ============================================================
//
// useRef has TWO distinct use cases — exercises cover both:
//   1. DOM access (imperative focus, measurement, media control)
//   2. Mutable storage (interval IDs, previous values, debounce timeouts)
// ============================================================

import { useState, useEffect, useRef, useLayoutEffect } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: DOM access — the ref-as-imperative-handle pattern.
//
// Build a search-bar component with these behaviors:
//
//   a) An "Auto-focus" button focuses the search input without
//      touching any state (no re-render needed).
//   b) A "Select All" button selects all text in the input so the
//      user can immediately retype without manually clearing.
//   c) A "Clear & Focus" button empties the controlled value AND
//      focuses the input — combine state + ref in one handler.
//
// Key rule: use inputRef.current.<method>() for imperative actions.
//           use value / setValue for the controlled text.
//
// Success: all three buttons work without any extra re-renders for
//          the focus/select operations themselves.

function Exercise1() {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  return (
    <div style={styles.box}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type something…"
        style={{ padding: '4px 8px', fontSize: 14, width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => {
          // TODO: focus the input using inputRef
        }}>
          Auto-focus
        </button>

        <button onClick={() => {
          // TODO: select all text using inputRef.current.select()
        }}>
          Select All
        </button>

        <button onClick={() => {
          // TODO: clear value (setState) AND focus (ref) in one click
        }}>
          Clear &amp; Focus
        </button>
      </div>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Mutable storage — interval ID in a ref so we can clear it.
//        Also shows why storing the ID in STATE is wrong.
//
// Build a Stopwatch with:
//   - A displayed elapsed time (seconds), updated every second
//   - Start / Stop / Reset buttons
//
// Rules:
//   - Store the interval ID in a ref (not state) — changing it
//     should NOT trigger a re-render.
//   - Store elapsed seconds in STATE — the UI must update.
//   - Prevent "double-start": if the stopwatch is already running,
//     clicking Start again should be a no-op (check intervalRef.current).
//
// Verify:
//   - Start → Stop → Start resumes correctly (doesn't reset).
//   - Reset clears the interval and sets seconds to 0.
//   - Clicking Start twice doesn't create two intervals.

function Exercise2() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null); // stores the setInterval return value

  function start() {
    if (intervalRef.current) return; // already running
    setRunning(true);
    // TODO: intervalRef.current = setInterval(() => {
    //         setSeconds(s => s + 1);
    //       }, 1000);
  }

  function stop() {
    // TODO: clearInterval(intervalRef.current);
    // TODO: intervalRef.current = null;
    setRunning(false);
  }

  function reset() {
    // TODO: stop the interval AND reset seconds to 0
  }

  // Clean up on unmount
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const display = [
    Math.floor(seconds / 60).toString().padStart(2, '0'),
    (seconds % 60).toString().padStart(2, '0'),
  ].join(':');

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 32, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        {display}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={start}  disabled={running}>Start</button>
        <button onClick={stop}   disabled={!running}>Stop</button>
        <button onClick={reset}>Reset</button>
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>
        The interval ID lives in a ref — updating it never triggers a re-render.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Previous value — a classic ref pattern for comparisons.
//
// Part A — usePrevious hook:
//   Implement a usePrevious(value) hook that returns the value
//   from the PREVIOUS render.  It must use useRef + useEffect.
//
//   Why it works: effects run AFTER render, so updating the ref
//   in the effect gives you the previous render's value during
//   the current render.
//
// Part B — render count:
//   Add a renderCount ref that increments every time the
//   component function body runs (no state, no effect — just
//   increment during render).  Display it in the UI.
//
// Success:
//   - "Previous score" shows the value before the most recent change.
//   - "Render count" increments on every button click.
//   - The render count does NOT cause extra renders (it's a ref).

function usePrevious(value) {
  const ref = useRef(undefined);
  // TODO: useEffect to store value in ref.current after each render
  return ref.current; // returns previous render's value
}

function Exercise3() {
  const [score, setScore] = useState(0);
  const prevScore = usePrevious(score);

  // TODO: Part B — create a renderCount ref and increment it here
  // const renderCount = useRef(0);
  // renderCount.current++;   ← happens during render, no setState needed

  return (
    <div style={styles.box}>
      <p>Current score: <strong>{score}</strong></p>
      <p>Previous score: <strong>{prevScore ?? '(none yet)'}</strong></p>
      {/* TODO: display renderCount.current */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setScore(s => s + 10)}>+10</button>
        <button onClick={() => setScore(s => s - 5)}>−5</button>
        <button onClick={() => setScore(0)}>Reset</button>
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>
        "Previous" is behind by exactly one render — that's the timing trick.
      </p>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Prove that mutating ref.current does NOT trigger a re-render.
//
// Steps:
//   1. Click "Mutate ref" — the ref value changes but nothing re-renders.
//   2. Click "Force re-render" — NOW you see the updated ref value in the UI.
//   3. This is the defining difference between refs and state.

function Playground() {
  const [, forceRender] = useState(0);
  const mutRef = useRef('initial');

  return (
    <div style={styles.box}>
      <p>ref.current = <strong>{mutRef.current}</strong></p>
      <p style={{ fontSize: 12, color: '#888' }}>
        (This text only updates when the component re-renders.)
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => {
          mutRef.current = 'mutated at ' + new Date().toLocaleTimeString();
          // No re-render — notice the display doesn't change
          console.log('ref mutated to:', mutRef.current);
        }}>
          Mutate ref (no re-render)
        </button>
        <button onClick={() => forceRender(n => n + 1)}>
          Force re-render (see updated ref)
        </button>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1>useRef</h1>

      <h2>Exercise 1 — DOM Access (Focus / Select)</h2>
      <p style={styles.goal}>
        Implement focus, select-all, and clear+focus without extra re-renders.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Stopwatch (interval ID in ref)</h2>
      <p style={styles.goal}>
        Store the interval ID in a ref so Start/Stop/Reset work correctly.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Previous Value + Render Count</h2>
      <p style={styles.goal}>
        Implement usePrevious and a render-count ref — neither triggers re-renders.
      </p>
      <Exercise3 />

      <h2>Playground — ref.current mutation ≠ re-render</h2>
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
