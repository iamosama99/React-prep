// ============================================================
// Topic:   useLayoutEffect
// Phase:   2 — Hooks
// ============================================================
//
// Core question to answer with your own eyes:
//   Does the screen flicker?  That flicker IS the difference
//   between useEffect (after paint) and useLayoutEffect (before paint).
// ============================================================

import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Seeing the flicker — side-by-side useEffect vs useLayoutEffect.
//
// Both boxes measure their own width and display it as a colored bar.
// The LEFT box uses useEffect → paints with 0px, THEN measures → flicker.
// The RIGHT box uses useLayoutEffect → measures BEFORE paint → no flicker.
//
// Steps:
//   1. Run the app and click "Remount both" rapidly.
//      You should see the left bar briefly flash at 0 width.
//   2. Complete the useLayoutEffect version:
//      - Measure containerRef.current.offsetWidth
//      - Call setBarWidth with that value
//   3. Click "Remount both" again — the RIGHT side should never flash.
//
// Why this happens:
//   useEffect  timeline: commit → paint (with barWidth=0) → effect → repaint
//   useLayoutEffect:      commit → layoutEffect → paint (with correct width)

function FlickerDemo({ useHook }) {
  const containerRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);

  // TODO (right side): change useEffect to useLayoutEffect
  // Both stubs are useEffect right now — making both "broken" for comparison.
  useEffect(() => {
    // Simulate a brief expensive measurement
    const width = containerRef.current?.offsetWidth ?? 0;
    setBarWidth(width);
  }, []);

  const label = useHook === 'layout' ? 'useLayoutEffect' : 'useEffect';
  const color = useHook === 'layout' ? '#4caf50' : '#f44336';

  return (
    <div
      ref={containerRef}
      style={{ border: `2px solid ${color}`, padding: '0.5rem', borderRadius: 6 }}
    >
      <p style={{ margin: 0, fontSize: 13, color }}>{label}</p>
      <div
        style={{
          height: 24,
          width: barWidth,
          background: color,
          borderRadius: 4,
          transition: 'none', // no transition so flicker is visible
        }}
      />
      <p style={{ margin: 0, fontSize: 12 }}>Measured: {barWidth}px</p>
    </div>
  );
}

function Exercise1() {
  const [key, setKey] = useState(0);

  return (
    <div style={styles.box}>
      <button onClick={() => setKey(k => k + 1)}>Remount both (watch left)</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FlickerDemo key={`effect-${key}`}       useHook="effect" />
        {/* TODO: After you see the flicker, open FlickerDemo and change
                  the right side's useEffect to useLayoutEffect */}
        <FlickerDemo key={`layout-${key}`}       useHook="layout" />
      </div>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Tooltip / popover positioning — a real-world use case.
//
// When a tooltip opens, it must be positioned relative to its
// trigger.  If positioned in useEffect (after paint), the tooltip
// briefly appears at 0,0 before jumping to the correct location.
//
// Build a Tooltip component:
//   - Render a "Hover me" button (the trigger).
//   - On hover (onMouseEnter/onMouseLeave), toggle the tooltip.
//   - When the tooltip appears, use useLayoutEffect to read the
//     trigger's bounding rect and position the tooltip below it.
//   - Display the tooltip in a <div> with position: fixed.
//
// Success: hover the button — the tooltip appears immediately below
//          it without any flash or jump.
//
// Key measurement:
//   const rect = triggerRef.current.getBoundingClientRect();
//   // position tooltip: top: rect.bottom + 4, left: rect.left

function Exercise2() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  // TODO: useLayoutEffect to measure triggerRef and set pos
  //       Run this effect whenever `open` changes to `true`

  return (
    <div style={styles.box}>
      <button
        ref={triggerRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        Hover me
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: '#333',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 13,
            pointerEvents: 'none',
          }}
        >
          I'm a tooltip — positioned by useLayoutEffect!
        </div>
      )}
      <p style={{ fontSize: 12, color: '#888' }}>
        If you used useEffect here, the tooltip would flash at top:0 first.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Scroll restoration — set scroll position before paint.
//
// When a "page" mounts, restore the saved scroll position
// BEFORE the browser paints, so the user never sees the top-of-page flash.
//
// Steps:
//   1. Complete useLayoutEffect so it reads `scrollY` from the
//      `savedScrollY` prop and calls window.scrollTo(0, savedScrollY).
//   2. Add a useEffect to SAVE the scroll position as the user scrolls
//      (listen to the 'scroll' event and update savedScrollY state).
//   3. Toggle between "Page A" and "Page B".  Each page remembers
//      its own scroll position.
//
// Observe: switch pages rapidly — the previous page's scroll
//          position is instantly restored without a flash.

const PAGES = {
  A: { color: '#e3f2fd', label: 'Page A', height: 1200 },
  B: { color: '#fce4ec', label: 'Page B', height: 800 },
};

function PageContent({ page, savedScrollY }) {
  useLayoutEffect(() => {
    // TODO: restore savedScrollY before paint
    // window.scrollTo(0, savedScrollY);
  }, [page, savedScrollY]);

  return (
    <div
      style={{
        background: PAGES[page].color,
        height: PAGES[page].height,
        padding: '1rem',
        borderRadius: 6,
      }}
    >
      <p>{PAGES[page].label} — scroll down, switch pages, come back.</p>
      <p style={{ position: 'sticky', top: 8, fontSize: 12 }}>
        Scroll position: {Math.round(window.scrollY)}px
      </p>
    </div>
  );
}

function Exercise3() {
  const [page, setPage] = useState('A');
  const [scrollPositions, setScrollPositions] = useState({ A: 0, B: 0 });

  // TODO: add a scroll listener that updates scrollPositions[page]

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8, position: 'sticky', top: 0, background: '#fff', padding: '4px 0' }}>
        <button onClick={() => setPage('A')} style={{ fontWeight: page === 'A' ? 'bold' : 'normal' }}>
          Page A
        </button>
        <button onClick={() => setPage('B')} style={{ fontWeight: page === 'B' ? 'bold' : 'normal' }}>
          Page B
        </button>
        <span style={{ fontSize: 12, alignSelf: 'center', color: '#888' }}>
          Saved: A={scrollPositions.A}px B={scrollPositions.B}px
        </span>
      </div>
      <PageContent
        key={page}
        page={page}
        savedScrollY={scrollPositions[page]}
      />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Confirm the execution order: useLayoutEffect runs BEFORE useEffect.
//
// Steps:
//   1. Open the console.
//   2. Click "Mount / Unmount".
//   3. You should see:
//        🟡 useLayoutEffect
//        🔵 useEffect
//      — in that order, every time.

function OrderDemo() {
  useLayoutEffect(() => {
    console.log('🟡 useLayoutEffect — before paint');
    return () => console.log('🟡 useLayoutEffect cleanup');
  }, []);

  useEffect(() => {
    console.log('🔵 useEffect — after paint');
    return () => console.log('🔵 useEffect cleanup');
  }, []);

  return <p style={{ fontSize: 13 }}>Mounted — check the console for order.</p>;
}

function Playground() {
  const [show, setShow] = useState(false);

  return (
    <div style={styles.box}>
      <button onClick={() => setShow(s => !s)}>
        {show ? 'Unmount' : 'Mount'} order demo
      </button>
      {show && <OrderDemo />}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 680 }}>
      <h1>useLayoutEffect</h1>

      <h2>Exercise 1 — See the Flicker</h2>
      <p style={styles.goal}>
        Convert the right side to useLayoutEffect.  Watch the left flash; the right won't.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Tooltip Positioning</h2>
      <p style={styles.goal}>
        Position a tooltip before paint so it never flashes at 0,0.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Scroll Restoration</h2>
      <p style={styles.goal}>
        Restore each page's scroll position before paint using useLayoutEffect.
      </p>
      <Exercise3 />

      <h2>Playground — Effect Execution Order</h2>
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
