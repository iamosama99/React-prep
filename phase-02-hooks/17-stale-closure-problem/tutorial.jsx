// ============================================================
// Topic:   Stale Closure Problem
// Phase:   2 — Hooks
// ============================================================
//
// A stale closure is a function that captured a variable from
// an earlier render and still uses THAT old value instead of the
// current one.
//
// Pattern: effect/timer/handler created at render N, then used
//          at render N+5 — but it still "sees" the state from N.
//
// Two fixes, different trade-offs:
//   A) Add the value to deps → callback refreshes (may cause extra effects)
//   B) Store in a ref → always fresh, no re-runs (bypasses reactivity)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Reproduce the classic stale closure bug (interval + counter).
//
// The interval below logs `count` every second.
// Because deps is [], the interval is created ONCE at mount and
// closes over count=0 forever — even after you click "+".
//
// Steps:
//   1. Run the app. Click "+" several times.
//   2. Watch the console — it always logs 0 (stale!).
//   3. Add a comment explaining WHY it's stale.
//   4. Do NOT fix it yet — fixing comes in Exercise 2 & 3.
//
// Hint: draw the render timeline:
//   Render 0: count=0, interval captures count=0
//   Render 1: count=1, but interval still has count=0
//   Render 2: count=2, interval still has count=0 ← stale

function Exercise1() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // BUG: `count` captured at mount — always 0
      console.log('interval sees count =', count);
    }, 1000);
    return () => clearInterval(id);
  }, []); // ← empty deps locks in count=0

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        count = {count}
      </p>
      <button onClick={() => setCount(c => c + 1)}>+ (then watch console)</button>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        Console always logs 0 even after clicking "+".
        {/*
          TODO: Add your explanation here:
          "The interval callback closes over count from render ____.
           It never re-runs so it never sees renders ____."
        */}
      </p>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Fix A — add `count` to effect dependencies.
//
// Adding count to deps means the effect re-runs whenever count changes.
// Each new interval closes over the LATEST count.
//
// Steps:
//   1. Copy the Exercise 1 code and add `count` to the dependency array.
//   2. Confirm in the console: it now logs the current count.
//   3. Notice the interval is destroyed and recreated on every click.
//      That's the trade-off: accuracy at the cost of re-runs.
//   4. Write a comment: when is this trade-off acceptable?
//      When is it NOT acceptable? (Think: WebSocket connections)

function Exercise2() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // TODO: fix — this should now log the CURRENT count
      console.log('interval sees count =', count);
    }, 1000);
    return () => clearInterval(id);
    // TODO: add count to deps — observe interval recreates on each click
  }, []); // ← change this

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        count = {count}
      </p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        After fixing: console logs the correct count each second.
        Trade-off: interval restarts on every click.
        {/*
          When is deps-array fix NOT ideal?
          → When the effect is expensive to restart (WebSocket, video stream, etc.)
        */}
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Fix B — store the latest value in a ref.
//
// A ref always holds the most current value without triggering
// re-renders or restarting the effect.  This is the "always-fresh
// callback" pattern.
//
// Steps:
//   1. Create: const countRef = useRef(count);
//   2. Keep it in sync: useEffect(() => { countRef.current = count; }, [count]);
//   3. In the interval, read countRef.current instead of count.
//   4. Now: interval logs the correct value WITHOUT restarting.
//
// Compare with Fix A:
//   Fix A: simple, but reruns effect on every dep change
//   Fix B: more code, interval NEVER restarts, always reads fresh value

function Exercise3() {
  const [count, setCount] = useState(0);

  // TODO: const countRef = useRef(count);

  // TODO: useEffect to sync ref with latest count
  // useEffect(() => { countRef.current = count; }, [count]);

  useEffect(() => {
    const id = setInterval(() => {
      // TODO: change `count` to `countRef.current`
      console.log('interval sees count =', count);
    }, 1000);
    return () => clearInterval(id);
  }, []); // ← stays empty — interval never restarts

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        count = {count}
      </p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        After fixing: console logs correct count, but interval never restarts.
        This is the "stable interval" pattern — one interval for the lifetime.
        {/*
          Trade-off vs Fix A:
          Ref fix: more setup, interval is stable (no restart overhead)
          Dep fix: less setup, interval restarts on every state change
        */}
      </p>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// TOPIC: Stale closures in event handlers — not just effects.
//
// The async handler below also suffers from staleness.
// After a 2-second delay, it sends the count from when the
// button was clicked — not the CURRENT count.
//
// Steps:
//   1. Click "+", "+", "+", then "Send (will be stale)".
//      The alert shows the count from when you clicked Send, not now.
//   2. Fix using a ref: read countRef.current in the timeout.
//   3. Bonus: implement a useEvent hook that gives a stable callback
//      that always reads the latest state (common React pattern).

function Playground() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  countRef.current = count; // always in sync (no effect needed here)

  const handleSend = useCallback(() => {
    setTimeout(() => {
      // BUG: closes over stale `count` from when the callback was created
      alert('Sent with count = ' + count);
      // FIX: alert('Sent with count = ' + countRef.current);
    }, 2000);
  }, [count]); // ← try removing count from deps and using ref instead

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        count = {count}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setCount(c => c + 1)}>+</button>
        <button onClick={handleSend}>
          Send (shows count in 2s)
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        Click "+", "+", "+", then "Send" — increment more while waiting.
        Alert shows stale count. Fix: read countRef.current in the timeout.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1>Stale Closure Problem</h1>

      <h2>Exercise 1 — Reproduce the Bug</h2>
      <p style={styles.goal}>
        Click "+" and watch the console always log 0. Explain WHY in a comment.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Fix A: Add to Dependency Array</h2>
      <p style={styles.goal}>
        Add count to deps. Logs correct value, but interval restarts each click.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Fix B: Store in a Ref</h2>
      <p style={styles.goal}>
        Read countRef.current in the interval. Correct AND stable (never restarts).
      </p>
      <Exercise3 />

      <h2>Playground — Stale Handler (async)</h2>
      <Playground />
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
