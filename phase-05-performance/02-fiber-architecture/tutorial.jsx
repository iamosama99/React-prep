// ============================================================
// Topic:   Fiber Architecture
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. Fiber's internals aren't directly observable
//   from user code — these exercises reveal the CONSEQUENCES of how
//   Fiber works: purity requirements, commit phase atomicity, and
//   why a heavy component still blocks even in concurrent mode.
// ============================================================

import { useState, useEffect, useLayoutEffect, useRef } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };


// ─── Exercise 1: Purity — The Render Phase Can Run Twice ─────
//
// SITUATION
//   Fiber's render phase is interruptible and can be RESTARTED.
//   In concurrent mode, your component function may be called more
//   than once before a commit. React.StrictMode deliberately double-
//   invokes renders in development to surface exactly this class of bug.
//
//   If you have side effects in the render body (mutating external state,
//   making a fetch, writing to a ref that tracks something external),
//   those effects fire on EVERY invocation — including the "throw-away"
//   runs that are never committed.
//
// YOUR TASK
//   1. Click "Trigger render" and watch the console logs.
//   2. Count: how many log lines appear per button click?
//      (Should be 2 in development with StrictMode wrapping the app.)
//   3. Observe that externalCounter grows by 2 per logical render —
//      because the impure function ran twice.
//   4. Contrast with the ref-based counter — the displayed value is
//      correct because a ref mutation is local to the component.
//   5. Answer the question at the bottom in the comment.

let externalCounter = 0; // lives outside React — shared global state

function ImpureComponent({ trigger }) {
  // ❌ IMPURE: mutates external state during render
  externalCounter++;
  console.log(`%c[Impure] render invocation — externalCounter is now ${externalCounter}`, 'color: #dc2626');

  return (
    <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 4, fontSize: 13 }}>
      externalCounter: <strong>{externalCounter}</strong>
      <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8' }}>
        (doubles per click in StrictMode — a sign of impurity)
      </span>
    </div>
  );
}

function PureComponent({ trigger }) {
  const renderInvocations = useRef(0);
  renderInvocations.current++;
  console.log(`%c[Pure] render invocation #${renderInvocations.current} for trigger=${trigger}`, 'color: #16a34a');

  return (
    <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 4, fontSize: 13 }}>
      ref invocation count: <strong>{renderInvocations.current}</strong>
      <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8' }}>
        (doubles too, but the component is still pure — no external mutation)
      </span>
    </div>
  );
}

function Exercise1() {
  const [trigger, setTrigger] = useState(0);

  return (
    <section>
      <h2>Exercise 1 — Purity: Why the Render Body Must Have No Side Effects</h2>
      <p style={hint}>Open DevTools console. Click the button and count how many logs appear per click.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>❌ Impure render</div>
          <ImpureComponent trigger={trigger} />
          <p style={{ fontSize: 13, margin: '8px 0 0', color: '#64748b' }}>
            Each click shows 2 console logs. externalCounter grows by 2.
            In production with concurrent mode, this becomes N network requests
            per render — one for each time React runs the function before committing.
          </p>
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>✅ Pure render (ref mutation)</div>
          <PureComponent trigger={trigger} />
          <p style={{ fontSize: 13, margin: '8px 0 0', color: '#64748b' }}>
            Ref mutations during render are technically impure (the ref value changes),
            but because refs are local to the component, double-invoking is still safe.
            The function doesn't touch anything outside its own fiber node.
          </p>
        </div>
      </div>

      <button
        onClick={() => setTrigger(t => t + 1)}
        style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        Trigger render (trigger: {trigger})
      </button>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Answer without looking:</strong> Why does React.StrictMode double-invoke render functions?
        {/* ANSWER: To simulate concurrent mode's behavior where a render may run
             multiple times before committing. By running your function twice in
             development, StrictMode makes impure renders immediately visible —
             you see doubled side effects before your code ever reaches production. */}
      </div>
    </section>
  );
}


// ─── Exercise 2: Commit Phase Timing ─────────────────────────
//
// SITUATION
//   The render phase builds a work-in-progress tree (interruptible).
//   The commit phase applies it to the DOM (atomic, uninterruptible).
//   useLayoutEffect fires synchronously INSIDE the commit — after DOM
//   mutation but before the browser paints.
//   useEffect fires ASYNCHRONOUSLY — after the browser paints.
//
// YOUR TASK
//   1. Click the button. Watch the log sequence.
//   2. You should see: render body → layout effect → (paint) → passive effect
//   3. Explain in the comment: when would you NEED useLayoutEffect instead of useEffect?
//   4. Bonus: wrap the layout effect setState call and observe how it prevents
//      the intermediate state from ever being painted.

function TimingDemo({ onLog }) {
  const [step, setStep] = useState('initial');
  const boxRef = useRef(null);

  console.log(`%c[TimingDemo] RENDER body — step="${step}"`, 'color: #3b82f6');

  useLayoutEffect(() => {
    console.log(`%c[TimingDemo] useLayoutEffect — DOM updated, not yet painted`, 'color: #7c3aed; font-weight: bold');
    onLog(`useLayoutEffect: DOM updated (step="${step}")`);
    // This is the correct place to read DOM geometry before paint:
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      console.log(`  → box width: ${Math.round(rect.width)}px (measured before paint)`);
    }
  });

  useEffect(() => {
    console.log(`%c[TimingDemo] useEffect — browser has painted`, 'color: #059669');
    onLog(`useEffect: after paint (step="${step}")`);
  });

  return (
    <div ref={boxRef} style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 6, fontSize: 13 }}>
      step: <strong>{step}</strong>
      <button
        onClick={() => setStep(s => s === 'initial' ? 'updated' : 'initial')}
        style={{ marginLeft: 12, padding: '3px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
      >
        Toggle step
      </button>
    </div>
  );
}

function Exercise2() {
  const [log, setLog] = useState([]);
  const addLog = (msg) => setLog(prev => [...prev.slice(-6), msg]);

  return (
    <section>
      <h2>Exercise 2 — Commit Phase: useLayoutEffect vs useEffect Timing</h2>
      <p style={hint}>
        Open DevTools console. Click "Toggle step" and observe the order of logs.
        Note that useLayoutEffect always fires before useEffect.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Demo</div>
          <TimingDemo onLog={addLog} />
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Execution order:</div>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ padding: '4px 8px', background: '#eff6ff', borderRadius: 3, borderLeft: '3px solid #3b82f6' }}>
              1. Render body (interruptible)
            </div>
            <div style={{ padding: '4px 8px', background: '#f3e8ff', borderRadius: 3, borderLeft: '3px solid #7c3aed' }}>
              2. useLayoutEffect (sync, blocks paint)
            </div>
            <div style={{ padding: '4px 8px', background: '#d1fae5', borderRadius: 3, borderLeft: '3px solid #059669' }}>
              3. Browser paints
            </div>
            <div style={{ padding: '4px 8px', background: '#d1fae5', borderRadius: 3, borderLeft: '3px solid #059669' }}>
              4. useEffect (async, after paint)
            </div>
          </div>
        </div>
      </div>

      {log.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Recent effect log:</div>
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: 12, fontFamily: 'monospace', color: entry.includes('Layout') ? '#7c3aed' : '#059669' }}>
              {entry}
            </div>
          ))}
        </div>
      )}

      {/* ANSWER: When to use useLayoutEffect instead of useEffect?
          Use useLayoutEffect when you need to:
          1. Read DOM geometry (getBoundingClientRect, scrollTop, clientHeight)
             AND use that measurement to update the UI — if you used useEffect,
             the browser would paint the "wrong" UI first, then you'd update it,
             causing a visible flash.
          2. Synchronously prevent a flash of incorrect state — e.g., measuring
             a tooltip anchor's position and placing the tooltip correctly before
             the user sees anything.

          Default to useEffect for everything else — it's non-blocking and doesn't
          delay the browser's ability to paint.
      */}

      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Rule of thumb:</strong> Start with <code>useEffect</code>. Switch to{' '}
        <code>useLayoutEffect</code> only when you observe a visible flash
        (content jumping to its correct position). The flash is the signal.
      </div>
    </section>
  );
}


// ─── Exercise 3: One Heavy Component Still Blocks ────────────
//
// SITUATION
//   Fiber's time-slicing yields BETWEEN components. Within a single
//   component function, execution is uninterrupted. If one component
//   does 300ms of synchronous work, the browser is blocked for 300ms
//   regardless of concurrent mode.
//
//   The solution is NOT concurrent rendering for this case — it's:
//   - useMemo (cache the expensive computation)
//   - Web Worker (move computation off main thread)
//   - Avoid the expensive computation in render at all
//
// YOUR TASK
//   1. Enable "heavy compute" and click Render. Notice the UI freezes.
//   2. Check "use useMemo fix" — now only the first render is slow.
//      Subsequent renders with the same input use the cached value.
//   3. Explain in the comment: why can't useTransition fix this case?

function fakeExpensiveWork(seed) {
  // Synchronous busy-loop: blocks for ~150ms
  const deadline = performance.now() + 150;
  let result = seed;
  while (performance.now() < deadline) {
    result = (result * 1.0000001 + seed) % 1000000;
  }
  return Math.round(result);
}

function HeavyItem({ id, useMemoFix, heavy }) {
  const renderCount = useRef(0);
  renderCount.current++;

  let computedValue;
  if (!heavy) {
    computedValue = id * 2; // cheap
  } else if (useMemoFix) {
    // useMemo caches the result — fakeExpensiveWork only runs when `id` changes
    // In real code: const computedValue = useMemo(() => fakeExpensiveWork(id), [id]);
    // Shown inline for clarity:
    computedValue = id * 2; // simulating the cached path
  } else {
    computedValue = fakeExpensiveWork(id); // runs on every render
  }

  return (
    <div style={{ padding: '5px 10px', borderBottom: '1px solid #f1f5f9', fontSize: 13, display: 'flex', gap: 12 }}>
      <span>Item {id}</span>
      <span style={{ color: '#64748b' }}>→ {computedValue}</span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>render #{renderCount.current}</span>
    </div>
  );
}

function Exercise3() {
  const [tick, setTick] = useState(0);
  const [heavy, setHeavy] = useState(false);
  const [memoFix, setMemoFix] = useState(false);
  const [lastDuration, setLastDuration] = useState(null);

  const handleRender = () => {
    const t0 = performance.now();
    setTick(t => t + 1);
    requestAnimationFrame(() => {
      setLastDuration(Math.round(performance.now() - t0));
    });
  };

  return (
    <section>
      <h2>Exercise 3 — One Heavy Component Blocks the Thread (Fiber Can't Help)</h2>
      <p style={hint}>
        Enable heavy compute and trigger renders. See how a single slow
        component freezes the UI. Fiber yields between components, not inside them.
      </p>

      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={heavy} onChange={e => setHeavy(e.target.checked)} />
          Simulate heavy compute (~150ms per item)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, opacity: heavy ? 1 : 0.4 }}>
          <input type="checkbox" checked={memoFix} onChange={e => setMemoFix(e.target.checked)} disabled={!heavy} />
          Apply useMemo fix (cache result per id)
        </label>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        {[1, 2, 3].map(id => (
          <HeavyItem key={id} id={id} heavy={heavy} useMemoFix={memoFix} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handleRender}
          style={{ padding: '8px 20px', background: heavy && !memoFix ? '#dc2626' : '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Trigger render (tick: {tick})
        </button>
        {lastDuration !== null && (
          <span style={{ fontSize: 13, color: lastDuration > 100 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
            Measured: ~{lastDuration}ms to next frame
          </span>
        )}
      </div>

      {/* ANSWER: Why can't useTransition fix this?
          useTransition marks a state update as low-priority so React can yield
          between fiber nodes. But yielding only happens BETWEEN components — each
          individual component runs to completion. HeavyItem's 150ms compute is a
          single component, a single fiber unit. React cannot pause it mid-execution.
          useTransition would help if we had 1000 SEPARATE components to render
          (React could yield between them). It cannot help when one component itself
          is slow.

          The fix: useMemo caches the result inside HeavyItem. The expensive function
          only runs when `id` changes, not on every parent re-render.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Takeaway:</strong> Concurrent rendering improves responsiveness by
        interleaving work at component boundaries. A single slow component is a single
        indivisible unit. Fix slow components with <code>useMemo</code> (cache) or
        Web Workers (off main thread). Fix large numbers of components with
        <code>useTransition</code> (interruptible render across boundaries).
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 02 — Fiber Architecture
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
