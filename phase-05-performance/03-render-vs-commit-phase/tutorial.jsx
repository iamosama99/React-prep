// ============================================================
// Topic:   Render vs Commit Phase
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises make the render/commit
//   timing difference observable through real browser behavior:
//   tooltip positioning, scroll synchronization, and effect ordering.
// ============================================================

import { useState, useEffect, useLayoutEffect, useRef } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Exercise 1: The Tooltip Flicker ─────────────────────────
//
// SITUATION
//   A tooltip that positions itself below an anchor element.
//   It needs to read the anchor's getBoundingClientRect() to know
//   where to render. There are two implementations:
//   - useEffect version: fires AFTER paint — user briefly sees the
//     tooltip at top:0 before it snaps into place (a "flash")
//   - useLayoutEffect version: fires BEFORE paint — user never sees
//     the intermediate position
//
//   This is THE canonical use case for useLayoutEffect.
//
// YOUR TASK
//   1. Click "Show tooltip" in the useEffect version. Watch carefully
//      for a brief flash of the tooltip appearing in the wrong position
//      before jumping to the correct one.
//   2. Click "Show tooltip" in the useLayoutEffect version. No flash.
//   3. In DevTools, throttle CPU (Performance → CPU 6x slowdown)
//      to make the flash in the useEffect version more visible.
//   4. Answer in the comment: what specific condition requires
//      useLayoutEffect over useEffect?

function TooltipWithEffect({ text }) {
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);

  // ❌ useEffect: fires AFTER the browser has painted
  // User sees tooltip at top:0 briefly (the initial render)
  // then it jumps to the correct position
  useEffect(() => {
    if (visible && tooltipRef.current && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      tooltipRef.current.style.top = `${rect.bottom + 6}px`;
      tooltipRef.current.style.left = `${rect.left}px`;
    }
  }, [visible]);

  return (
    <div>
      <button
        ref={anchorRef}
        onClick={() => setVisible(v => !v)}
        style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
      >
        {visible ? 'Hide' : 'Show'} tooltip (useEffect)
      </button>
      {visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: 0, left: 0, // initial position — visible as a flash
            background: '#1e293b',
            color: 'white',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 12,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function TooltipWithLayoutEffect({ text }) {
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);

  // ✅ useLayoutEffect: fires synchronously after DOM mutation, before paint
  // Tooltip is positioned correctly before the browser renders anything
  useLayoutEffect(() => {
    if (visible && tooltipRef.current && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      tooltipRef.current.style.top = `${rect.bottom + 6}px`;
      tooltipRef.current.style.left = `${rect.left}px`;
    }
  }, [visible]);

  return (
    <div>
      <button
        ref={anchorRef}
        onClick={() => setVisible(v => !v)}
        style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
      >
        {visible ? 'Hide' : 'Show'} tooltip (useLayoutEffect)
      </button>
      {visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            background: '#1e293b',
            color: 'white',
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 12,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Tooltip Flicker: useEffect vs useLayoutEffect</h2>
      <p style={hint}>
        Click both buttons. On a fast machine you may not see the flash —
        open DevTools → Performance → CPU throttle (4x or 6x) to make it visible.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            ❌ useEffect — positions after paint
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
            DOM updates → browser paints (tooltip at top:0) →
            useEffect runs → tooltip repositions → browser paints again.
            User sees a flash of the wrong position.
          </p>
          <TooltipWithEffect text="Tooltip (useEffect)" />
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 8 }}>
            ✅ useLayoutEffect — positions before paint
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 12px' }}>
            DOM updates → useLayoutEffect runs → tooltip repositioned →
            browser paints (tooltip is already at correct position).
            No flash ever.
          </p>
          <TooltipWithLayoutEffect text="Tooltip (useLayoutEffect)" />
        </div>
      </div>

      {/* ANSWER: When do you NEED useLayoutEffect?
          When you need to:
          1. Read DOM measurements (getBoundingClientRect, scrollTop, offsetHeight) AND
          2. Apply a DOM change based on that measurement BEFORE the user sees anything.

          If you use useEffect for this, the browser paints the "wrong" state first
          (before your measurement-based adjustment), then your adjustment creates
          a second paint — user sees a flash.

          useLayoutEffect fires synchronously after DOM mutation, before paint, so
          your adjustment is included in the first paint. No flash.

          Default to useEffect for everything that doesn't need this guarantee.
      */}

      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Key test:</strong> If removing your effect causes a visual flash,
        use <code>useLayoutEffect</code>. Otherwise use <code>useEffect</code>.
        The flash is the signal — not "I'm accessing the DOM."
      </div>
    </section>
  );
}


// ─── Exercise 2: Scroll-to-Bottom with useLayoutEffect ────────
//
// SITUATION
//   A chat window that should automatically scroll to the newest message.
//   If we use useEffect, there's a brief moment where the new message
//   is visible but the window hasn't scrolled yet — the user sees the
//   old scroll position for one frame before it jumps to the bottom.
//   useLayoutEffect fixes this.
//
//   Additionally: calling setState inside useLayoutEffect triggers a
//   synchronous re-render before paint — the user never sees the
//   intermediate state. This is useful for "measure → compute → update"
//   patterns.
//
// YOUR TASK
//   1. Add messages to each chat window. Notice if there's a scroll jump.
//   2. Then answer: why does the effect version show the old scroll
//      position briefly before snapping to the new message?

function ChatWindow({ useLayout, messages }) {
  const containerRef = useRef(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  // Switch between useEffect and useLayoutEffect to compare behavior
  useEffect(() => {
    if (!useLayout) scrollToBottom();
  }, [messages, useLayout]);

  useLayoutEffect(() => {
    if (useLayout) scrollToBottom();
  }, [messages, useLayout]);

  return (
    <div
      ref={containerRef}
      style={{
        height: 180,
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        padding: '8px 12px',
        fontSize: 13,
      }}
    >
      {messages.map((msg, i) => (
        <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
          {msg}
        </div>
      ))}
    </div>
  );
}

function Exercise2() {
  const [messages, setMessages] = useState([
    'Alice: Hello!',
    'Bob: Hey, what\'s up?',
    'Alice: Not much. How about you?',
  ]);

  const addMessage = () => {
    const names = ['Alice', 'Bob', 'Charlie'];
    const texts = ['Got it!', 'Sounds good.', 'Let me check.', 'On it!', 'Thanks!'];
    const name = names[Math.floor(Math.random() * names.length)];
    const text = texts[Math.floor(Math.random() * texts.length)];
    setMessages(prev => [...prev, `${name}: ${text} (#${prev.length + 1})`]);
  };

  return (
    <section>
      <h2>Exercise 2 — Scroll Sync: useLayoutEffect Prevents the Jump</h2>
      <p style={hint}>
        Add messages to both windows. With CPU throttling enabled in DevTools,
        you may see the useEffect version briefly show the old scroll position.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            useEffect — scroll after paint
          </div>
          <ChatWindow messages={messages} useLayout={false} />
        </div>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 8 }}>
            useLayoutEffect — scroll before paint
          </div>
          <ChatWindow messages={messages} useLayout={true} />
        </div>
      </div>

      <button
        onClick={addMessage}
        style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
      >
        Add message
      </button>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Answer:</strong> Why does the useEffect version show old scroll position briefly?
        {/* The browser paints the new DOM (new message is in the DOM, scroll is still at old position).
             Then useEffect runs (after paint), scrolls to bottom, browser paints again.
             With CPU throttling, the gap between paint-1 and paint-2 is visible.
             useLayoutEffect runs between DOM mutation and paint-1, so the scroll
             is adjusted before the user ever sees anything. Only one paint happens. */}
      </div>
    </section>
  );
}


// ─── Exercise 3: Full Phase Sequence ─────────────────────────
//
// SITUATION
//   Understanding the complete sequence of events in a single update
//   is essential for debugging timing bugs. This exercise instruments
//   every phase so you can observe the exact order.
//
//   Expected sequence per state update:
//   1. Render body (component function called)
//   2. useLayoutEffect cleanup (old deps)
//   3. useLayoutEffect setup (new deps) — synchronous, before paint
//   4. Browser paints
//   5. useEffect cleanup (old deps)
//   6. useEffect setup (new deps) — asynchronous, after paint
//
// YOUR TASK
//   Click the "Update value" button several times.
//   Read the phase log and verify the order matches the sequence above.
//   Then predict: if you had TWO useEffects in the same component,
//   in what order would their setups and cleanups run?

function PhaseSequenceDemo({ value, onPhase }) {
  console.log(`%c[RENDER] body — value=${value}`, 'color: #3b82f6; font-weight:600');

  useLayoutEffect(() => {
    onPhase(`[LAYOUT] setup — value=${value}`);
    console.log(`%c[LAYOUT] setup — value=${value}`, 'color: #7c3aed; font-weight:600');
    return () => {
      onPhase(`[LAYOUT] cleanup — value=${value}`);
      console.log(`%c[LAYOUT] cleanup — value=${value}`, 'color: #7c3aed');
    };
  }, [value, onPhase]);

  useEffect(() => {
    onPhase(`[EFFECT] setup — value=${value}`);
    console.log(`%c[EFFECT] setup — value=${value}`, 'color: #059669; font-weight:600');
    return () => {
      onPhase(`[EFFECT] cleanup — value=${value}`);
      console.log(`%c[EFFECT] cleanup — value=${value}`, 'color: #059669');
    };
  }, [value, onPhase]);

  return (
    <div style={{ padding: '8px 14px', background: '#eff6ff', borderRadius: 6, fontSize: 13 }}>
      Current value: <strong>{value}</strong>
      <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8' }}>(check console for render log)</span>
    </div>
  );
}

function Exercise3() {
  const [value, setValue] = useState(0);
  const [phases, setPhases] = useState([]);

  const addPhase = (msg) => setPhases(prev => [...prev.slice(-8), msg]);

  return (
    <section>
      <h2>Exercise 3 — Full Phase Sequence: Render → Layout → Paint → Effect</h2>
      <p style={hint}>
        Open the console. Update the value several times and watch the
        exact order of all phases. Cleanups always run before the new setup.
      </p>

      <div style={{ marginBottom: 16 }}>
        <PhaseSequenceDemo value={value} onPhase={addPhase} />
      </div>

      <button
        onClick={() => setValue(v => v + 1)}
        style={{ ...btnStyle, background: '#3b82f6', color: 'white', marginBottom: 16 }}
      >
        Update value → {value + 1}
      </button>

      {phases.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Phase log (last 8):</div>
          {phases.map((phase, i) => (
            <div key={i} style={{
              fontSize: 12, fontFamily: 'monospace', padding: '2px 0',
              color: phase.includes('LAYOUT') ? '#7c3aed' : phase.includes('cleanup') ? '#94a3b8' : '#059669',
            }}>
              {i + 1}. {phase}
            </div>
          ))}
        </div>
      )}

      {/* ANSWER: Two useEffects in the same component — order?
          Both setups run top-to-bottom after paint.
          Both cleanups for the previous render run top-to-bottom before
          the new setups for the current render.

          So for update N→N+1 with two effects (A and B):
          1. A.cleanup (for render N)
          2. B.cleanup (for render N)
          3. A.setup (for render N+1)
          4. B.setup (for render N+1)

          All in the passive effects flush, after paint.
          Same ordering rule applies to useLayoutEffect (but synchronously before paint).
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Predict:</strong> If you add a second <code>useEffect</code> with different
        deps — say, <code>useEffect(() =&gt; ..., [])</code> (mount only) — will its
        cleanup run on every update? Will its setup run on every update?
        {/* Cleanup runs before unmount only. Setup runs only once (on mount).
             The deps array controls when setup and cleanup fire:
             - [] → setup on mount, cleanup on unmount
             - [dep] → setup and cleanup when dep changes
             - no array → setup and cleanup on every render */}
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 03 — Render vs Commit Phase
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
