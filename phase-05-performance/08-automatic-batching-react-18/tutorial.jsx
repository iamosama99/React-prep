// ============================================================
// Topic:   Automatic Batching (React 18)
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises make batching OBSERVABLE via
//   render counters. You'll see that multiple setState calls in an
//   async callback now produce ONE render instead of multiple.
// ============================================================

import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Exercise 1: Batching in Async Callbacks ──────────────────
//
// SITUATION
//   React 18 batches ALL state updates within the same scheduler task —
//   including those in setTimeout, Promise callbacks, and native listeners.
//   Before React 18, only updates inside React's own event handlers were batched.
//
//   This means: if a fetch callback calls setUser(), setLoading(), and setError()
//   in sequence, React 18 produces ONE render with all three changes applied.
//   React 17 would have produced THREE renders.
//
// WHAT YOU'LL SEE
//   Each button simulates a network response with multiple state updates.
//   Watch the render count:
//   - Batched: 3 setState calls → 1 render
//   - Unbatched (simulated with flushSync): 3 setState calls → 3 renders
//
// YOUR TASK
//   1. Click "Simulated fetch (batched)" — render count +1.
//   2. Click "Simulated fetch (unbatched)" — render count +3.
//   3. Explain: why does the unbatched version cause 3 renders?
//   4. Predict: what happens if you call setCount(v+1) twice in a batch
//      using the direct form vs the functional form?

function DataView() {
  const renderCount = useRef(0);
  renderCount.current++;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [renderLog, setRenderLog] = useState([]);

  const addLog = (entry) => setRenderLog(prev => [...prev.slice(-5), entry]);

  // ✅ React 18: all three setState calls are batched → 1 render
  const fetchBatched = () => {
    setLoading(true);
    // Simulate async response
    setTimeout(() => {
      // These three updates are in the SAME scheduler task
      // React 18 batches them → one render
      setUser({ name: 'Alice', email: 'alice@example.com' });
      setLoading(false);
      setError(null);
      // React renders once here with all three changes applied
    }, 300);
  };

  // ❌ Forced unbatched: flushSync breaks the batch around each update
  const fetchUnbatched = () => {
    setLoading(true);
    setTimeout(() => {
      // flushSync forces an immediate synchronous render after each call
      flushSync(() => setUser({ name: 'Bob', email: 'bob@example.com' }));
      // ^ render 1
      flushSync(() => setLoading(false));
      // ^ render 2
      flushSync(() => setError(null));
      // ^ render 3
    }, 300);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13 }}>Render count: <strong>{renderCount.current}</strong></span>
        <span style={{ fontSize: 12, padding: '2px 8px', background: '#eff6ff', borderRadius: 8 }}>
          React 18 with createRoot
        </span>
      </div>

      <div style={{ fontSize: 13, marginBottom: 10, padding: '8px 12px', background: '#f1f5f9', borderRadius: 4 }}>
        {loading && <div style={{ color: '#3b82f6' }}>⏳ Loading...</div>}
        {error && <div style={{ color: '#dc2626' }}>❌ {error}</div>}
        {user && !loading && (
          <div>
            <div>👤 <strong>{user.name}</strong></div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{user.email}</div>
          </div>
        )}
        {!user && !loading && <div style={{ color: '#94a3b8' }}>No user loaded</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={fetchBatched}
          style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
        >
          Fetch (batched — 1 render)
        </button>
        <button
          onClick={fetchUnbatched}
          style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          Fetch (unbatched — 3 renders)
        </button>
      </div>
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Automatic Batching in Async Callbacks</h2>
      <p style={hint}>
        Each fetch button calls 3 setState functions. Watch the render count.
        Batched → render count +1. Unbatched (flushSync) → render count +3.
      </p>

      <div style={card}>
        <DataView />
      </div>

      {/* ANSWER:
          Q: Why does the unbatched version cause 3 renders?
          A: flushSync forces React to commit synchronously after each setState call,
             bypassing the scheduler's batching. Each flushSync is a complete render
             + commit cycle. Without flushSync, React 18 queues all three updates and
             flushes them together at the end of the same scheduler task — one render.

          Q: React 17 vs React 18 behavior:
          React 17: multiple setState in setTimeout → 3 separate renders (no batching outside events)
          React 18: multiple setState in setTimeout → 1 render (automatic batching everywhere)
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>React 17 vs 18:</strong> In React 17, the "batched" fetch would also
        produce 3 renders (no batching outside event handlers). React 18 gives this
        improvement for free — just upgrade to createRoot and async callbacks batch automatically.
        No code changes needed.
      </div>
    </section>
  );
}


// ─── Exercise 2: Direct vs Functional Updater in a Batch ──────
//
// SITUATION
//   When multiple setState calls are batched together, they apply
//   in sequence before React renders. This creates a subtle difference
//   between the direct form and the functional form.
//
//   Direct: setCount(count + 1) — reads `count` from the current render.
//   Both calls see the SAME stale `count`. Result: one increment, not two.
//
//   Functional: setCount(v => v + 1) — receives the most recently queued state.
//   Second call sees the result of the first. Result: two increments.
//
// YOUR TASK
//   1. Click "Direct form × 2" — predict the count change before clicking.
//   2. Click "Functional form × 2" — predict the count change.
//   3. Verify your predictions match the actual behavior.
//   4. Answer: when is the functional form REQUIRED?

function Exercise2() {
  const [count, setCount] = useState(0);
  const renderCount = useRef(0);
  renderCount.current++;

  // Direct form: both calls see `count` from THIS render
  // React batches them but both enqueue count+1 (same stale value)
  const incrementDirect = () => {
    setCount(count + 1); // schedules: count → count+1
    setCount(count + 1); // also schedules: count → count+1 (same value, overwrites)
    // Batch flushes: count = count+1 (NOT count+2)
  };

  // Functional form: each call receives the most recently queued value
  const incrementFunctional = () => {
    setCount(v => v + 1); // schedules: v → v+1
    setCount(v => v + 1); // receives result of first: v+1 → v+2
    // Batch flushes: count = count+2
  };

  return (
    <section>
      <h2>Exercise 2 — Direct vs Functional Updater in a Batch</h2>
      <p style={hint}>
        Predict the count change before clicking each button.
        Then verify. The difference reveals when functional updaters are required.
      </p>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{count}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>renders: {renderCount.current}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <button
              onClick={incrementDirect}
              style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
            >
              Direct ×2: <code>setCount(count+1)</code> twice
            </button>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>
              Prediction: count changes by ___ (1 or 2?)
            </div>
          </div>

          <div>
            <button
              onClick={incrementFunctional}
              style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
            >
              Functional ×2: <code>setCount(v =&gt; v+1)</code> twice
            </button>
            <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>
              Prediction: count changes by ___ (1 or 2?)
            </div>
          </div>
        </div>
      </div>

      {/* ANSWERS:
          Direct form: count changes by 1.
          Both calls see the same `count` from the current closure.
          They both schedule `count → count+1`. The second overwrites the first.
          One increment.

          Functional form: count changes by 2.
          First call: v = current count, schedules v+1.
          Second call: v = result of first (count+1), schedules count+2.
          Two increments.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Rule:</strong> Always use the functional form when the new state depends
        on the previous state — especially when multiple updates may be batched together.
        <code>setCount(v =&gt; v + 1)</code> is always correct;
        <code>setCount(count + 1)</code> is correct only when you know no other update
        has been queued in the same batch.
      </div>
    </section>
  );
}


// ─── Exercise 3: flushSync — When to Actually Use It ─────────
//
// SITUATION
//   flushSync forces an immediate synchronous render, breaking the batch.
//   It's an escape hatch for cases where you need to read the DOM
//   immediately after a state update — before the batch flushes.
//
//   Real use case: scroll a newly-added item into view. The item's DOM
//   node doesn't exist until the render that adds it commits. You need
//   to force that render synchronously so you can measure the item's
//   position and scroll to it.
//
// YOUR TASK
//   1. Click "Add & scroll (useEffect)" — the list adds an item but
//      scroll happens slightly after (after paint). On slow connections
//      you'd see the list before it scrolls.
//   2. Click "Add & scroll (flushSync)" — the item renders synchronously,
//      then you can scroll to it before paint. No lag.
//   3. Answer: why is flushSync used sparingly? What's the cost?

function Exercise3() {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);
  const listRef = useRef(null);

  const addWithEffect = () => {
    // Normal setState — batched, renders asynchronously
    setItems(prev => [...prev, `Item ${prev.length + 1}`]);
    // Problem: the new item's DOM node doesn't exist yet here
    // We'd need useEffect to scroll after render, which is delayed
  };

  const addWithFlushSync = () => {
    // flushSync: forces synchronous render immediately
    flushSync(() => {
      setItems(prev => [...prev, `Item ${prev.length + 1}`]);
    });
    // NOW the new item is in the DOM — we can scroll immediately
    if (listRef.current) {
      listRef.current.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <section>
      <h2>Exercise 3 — flushSync: Force a Synchronous Render</h2>
      <p style={hint}>
        Both buttons add an item and try to scroll to it. flushSync forces the
        render synchronously so the DOM node exists when you try to scroll to it.
      </p>

      <div style={card}>
        <div
          ref={listRef}
          style={{ height: 140, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 10px', marginBottom: 12 }}
        >
          {items.map((item, i) => (
            <div key={i} style={{ padding: '4px 0', fontSize: 13, borderBottom: '1px solid #f8fafc' }}>
              {item}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={addWithEffect}
            style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
          >
            Add (normal setState — no auto-scroll)
          </button>
          <button
            onClick={addWithFlushSync}
            style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
          >
            Add + flushSync (immediate DOM, auto-scrolls)
          </button>
        </div>
      </div>

      {/* ANSWER: Why is flushSync used sparingly?
          It breaks batching — each flushSync is a full synchronous render + commit.
          If called multiple times in sequence, you get multiple synchronous renders
          where one batched render would have sufficed. It also blocks the thread
          while it runs (synchronous = no yielding). Use only when you genuinely need
          to read the DOM immediately after a state update — rare in practice.
          Most "I need to scroll after adding" cases can be handled with useLayoutEffect
          or useEffect and are fine with the slight async delay.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>When flushSync is actually needed:</strong> DOM measurements that must
        happen in the same synchronous task as a state update — third-party integrations
        that read the DOM synchronously, scroll anchoring after DOM mutation, or
        coordinating with non-React code that expects synchronous state. In most React
        apps you'll never need it. If you find yourself reaching for it often, it's a
        signal that the state structure should be rethought.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 08 — Automatic Batching (React 18)
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
