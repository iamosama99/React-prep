// ============================================================
// Topic:   StrictMode
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Wrap <App /> in <StrictMode> in your entry point to see all effects.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
//
// IMPORTANT: These exercises only show their bugs under React 18 + StrictMode.
//   The double-invocation of effects is a React 18 dev-mode behavior.
//   Make sure your app root looks like:
//     <StrictMode><App /></StrictMode>
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { StrictMode } from 'react';

// ─── Exercise 1: Side Effect in Render ───────────────────────
//
// SITUATION
//   StrictMode double-invokes your component function (in development) to catch
//   side effects that happen during render. Renders must be PURE — same input,
//   same output, no external mutations or observations.
//
//   BrokenCounter below has a bug: it mutates an external variable INSIDE
//   the component function (during render). Under StrictMode, the counter
//   increments twice on each render — the value is always wrong.
//
// YOUR TASK
//   1. Read BrokenCounter and identify the mutation that happens during render.
//   2. Observe: mount the component — the count immediately shows 2 (not 1)
//      because StrictMode runs the component function twice.
//   3. Implement FixedCounter with the same external tracking, but correctly:
//      Move the mutation into a useEffect (which runs AFTER render, once).
//      Or better: track it with state entirely (no external mutation needed).
//   4. Under StrictMode, FixedCounter should show consistent values.
//
// KEY INSIGHT: The double-invocation doesn't commit the first render's output.
//   Only the second render is committed. But external mutations in both
//   renders persist — that's the bug StrictMode is exposing.

// External state — simulates a singleton counter or analytics tracker
let externalRenderCount = 0;

function BrokenCounter() {
  // BUG: mutates externalRenderCount DURING RENDER
  // StrictMode runs this twice → count is 2 on first mount, 4 on first update
  externalRenderCount++;

  return (
    <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8 }}>
      <p style={{ margin: 0, fontWeight: 'bold', color: '#dc2626' }}>Broken: Render count</p>
      <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 'bold' }}>{externalRenderCount}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>
        Should be 1 on first render, but StrictMode double-invocation makes it 2.
        External state is mutated during render — a side effect.
      </p>
    </div>
  );
}

// Reset the counter for FixedCounter to start from 0
let fixedExternalCount = 0;

function FixedCounter() {
  // TODO: Fix the mutation issue. Two approaches:
  //
  // APPROACH A — Pure render (no external mutation during render):
  //   Move the increment into useEffect(() => { fixedExternalCount++; }, []);
  //   Then display a local state variable instead.
  //
  // APPROACH B — Use state entirely:
  //   const [count, setCount] = useState(0);
  //   useEffect(() => { setCount(c => c + 1); }, []);  // runs once after mount
  //
  // Either way: render is pure (no side effects during function body execution)

  return (
    <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
      <p style={{ margin: 0, fontWeight: 'bold', color: '#16a34a' }}>Fixed: Render count</p>
      <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 'bold' }}>1</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#16a34a' }}>
        Implement this — it should show 1 after mount, not 2.
      </p>
    </div>
  );
}

function Exercise1() {
  const [, forceUpdate] = useState(0);

  return (
    <section>
      <h2>Exercise 1 — Side Effect in Render</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Under StrictMode, the Broken counter immediately shows 2 (not 1) because
        the external variable is mutated during render — which runs twice.
        Fix it so the count is correct.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <BrokenCounter />
        <FixedCounter />
      </div>
      <button onClick={() => forceUpdate(n => n + 1)}>Force re-render</button>
      <p style={{ fontSize: 12, color: '#94a3b8' }}>
        (Each re-render doubles the broken count further)
      </p>
    </section>
  );
}


// ─── Exercise 2: Missing Effect Cleanup ──────────────────────
//
// SITUATION
//   StrictMode double-invokes effects: mount → cleanup → remount.
//   If an effect adds a listener but doesn't clean it up, after StrictMode's
//   remount, you have TWO listeners. Every event fires the handler twice.
//
//   BrokenKeyCounter adds a keydown listener but has no return (no cleanup).
//   Under StrictMode: mount → (cleanup: nothing) → remount → two listeners.
//   Every keypress increments the counter twice.
//
// YOUR TASK
//   1. Mount BrokenKeyCounter and press any key. Count increments by 2 (not 1).
//   2. Implement FixedKeyCounter with proper cleanup:
//      return () => window.removeEventListener('keydown', handler);
//   3. Under StrictMode, FixedKeyCounter should increment by 1 per keypress.
//
// WHY THIS MATTERS BEYOND STRICTMODE:
//   Without cleanup, the listener persists after component unmount too.
//   Every time the component mounts, it adds another permanent listener.
//   This is a memory leak in production, not just a StrictMode issue.

function BrokenKeyCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // BUG: no cleanup — listener is added twice under StrictMode
    // (mount → cleanup: nothing → remount → two listeners)
    const handler = () => setCount(c => c + 1);
    window.addEventListener('keydown', handler);
    // Missing: return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, minWidth: 200 }}>
      <p style={{ margin: 0, fontWeight: 'bold', color: '#dc2626' }}>Broken: Key presses</p>
      <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 'bold' }}>{count}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>
        Under StrictMode: increments by 2 per keypress (two listeners).
        In production: leaks listeners on every unmount/remount.
      </p>
    </div>
  );
}

function FixedKeyCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      // Ignore modifier-only keys to reduce noise
      if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Space') {
        setCount(c => c + 1);
      }
    };
    window.addEventListener('keydown', handler);
    // TODO: return the cleanup function
    // return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, minWidth: 200 }}>
      <p style={{ margin: 0, fontWeight: 'bold', color: '#16a34a' }}>Fixed: Key presses</p>
      <p style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 'bold' }}>{count}</p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#16a34a' }}>
        Add the cleanup return. Under StrictMode: exactly 1 per keypress.
      </p>
    </div>
  );
}

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Missing Effect Cleanup</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Click anywhere in the page first (to ensure the window has focus),
        then press keyboard keys. Broken increments by 2; Fixed by 1.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <BrokenKeyCounter />
        <FixedKeyCounter />
      </div>
    </section>
  );
}


// ─── Exercise 3: Fetch with No Cancellation ──────────────────
//
// SITUATION
//   The most common StrictMode complaint: "my API call fires twice!"
//   This is correct behavior — StrictMode mounts, runs the effect (fetch starts),
//   unmounts (cleanup runs — or does nothing if you have no cleanup), remounts
//   (effect runs again — second fetch starts).
//   In production: cleanup only runs on unmount, so one fetch. In dev: two fetches.
//
//   THE WRONG FIX: remove StrictMode.
//   THE RIGHT FIX: write the effect with a cancellation flag. Then StrictMode's
//   double-invoke causes the first fetch to be cancelled (by the cleanup), and
//   only the second request completes and updates state.
//
// YOUR TASK
//   1. Observe BrokenFetcher in DevTools Network tab — you see two requests.
//      If the first one resolves before cancellation, you may get a state update
//      from a "stale" request. React 18 shows this as an unmounted-component warning.
//   2. Implement FixedFetcher with a cancellation flag:
//      let cancelled = false;
//      fetch(...).then(d => { if (!cancelled) setData(d); });
//      return () => { cancelled = true; };
//   3. Under StrictMode: first request is cancelled by cleanup. Second completes.
//      Network tab shows 2 requests, but only 1 result is displayed. That's correct.
//
// ALSO IMPLEMENT: the "useRef flag" anti-pattern (for comparison)
//   const didInit = useRef(false);
//   useEffect(() => { if (didInit.current) return; didInit.current = true; fetch(...); }, []);
//   This skips the second invocation — BUT it defeats StrictMode's purpose.
//   The effect is never cleaned up. Explain in a comment why this is wrong.

function BrokenFetcher({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // BUG: no cancellation — if this component unmounts mid-request (StrictMode
    // remount) and the request completes later, setUser fires on unmounted component
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        setUser(data); // called even if component already unmounted
        setLoading(false);
      });
    // No cleanup → cancelled flag impossible → double fetch in StrictMode
  }, [userId]);

  return (
    <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, minWidth: 200 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#dc2626' }}>Broken fetcher</p>
      {loading ? <p>Loading…</p> : <p style={{ margin: 0 }}>{user?.name}</p>}
      <p style={{ fontSize: 12, color: '#dc2626', margin: '8px 0 0' }}>
        Check Network tab — 2 requests, no cancellation.
      </p>
    </div>
  );
}

function FixedFetcher({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setUser(null);

    // TODO: add the cancellation flag
    // let cancelled = false;
    //
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        // TODO: if (!cancelled) { setUser(data); setLoading(false); }
        setUser(data);
        setLoading(false);
      });

    // TODO: return the cleanup
    // return () => { cancelled = true; };
  }, [userId]);

  return (
    <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, minWidth: 200 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#16a34a' }}>Fixed fetcher</p>
      {loading ? <p>Loading…</p> : <p style={{ margin: 0 }}>{user?.name}</p>}
      <p style={{ fontSize: 12, color: '#16a34a', margin: '8px 0 0' }}>
        After fix: 2 requests in dev (StrictMode), but first is cancelled.
        In production: 1 request. Both correct.
      </p>
    </div>
  );
}

function AntiPatternFetcher({ userId }) {
  const [user, setUser] = useState(null);
  const didInit = useRef(false);

  useEffect(() => {
    // ANTI-PATTERN: skip StrictMode's second invocation with a ref flag
    // This "works" but defeats StrictMode's purpose — and the effect has no cleanup,
    // so a real unmount-remount (e.g., conditional rendering) still leaks.
    if (didInit.current) return;
    didInit.current = true;

    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then(r => r.json())
      .then(data => setUser(data));
    // Still no cleanup — bugs hidden, not fixed
  }, [userId]);

  return (
    <div style={{ padding: 16, background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, minWidth: 200 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#92400e' }}>Anti-pattern</p>
      <p style={{ margin: 0 }}>{user?.name ?? 'Loading…'}</p>
      <p style={{ fontSize: 12, color: '#92400e', margin: '8px 0 0' }}>
        1 request in dev (hides the bug). Still leaks on real unmount.
        This is the wrong fix — it disables StrictMode detection.
      </p>
    </div>
  );
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Fetch Cleanup (the StrictMode Double-Request)</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Open the Network tab. All three fetch user #1. Compare request counts and
        whether state updates from cancelled requests can cause warnings.
        The "Fixed" approach is correct in both dev and production.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <BrokenFetcher userId={1} />
        <FixedFetcher userId={1} />
        <AntiPatternFetcher userId={1} />
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
// NOTE: For StrictMode exercises to work, your entry point must use:
//   <StrictMode><App /></StrictMode>
// In StackBlitz / local Vite, this is the default.

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 10 — StrictMode</h1>
      <div style={{ padding: 12, background: '#eff6ff', borderRadius: 6, marginBottom: 24, fontSize: 13 }}>
        <strong>Setup check:</strong> These exercises require React 18 + StrictMode.
        The default Vite template wraps App in StrictMode — if you removed it, add it back.
      </div>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
