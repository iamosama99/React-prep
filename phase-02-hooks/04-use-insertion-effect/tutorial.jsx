// ============================================================
// Topic:   useInsertionEffect
// Phase:   2 — Hooks
// ============================================================
//
// Context:
//   useInsertionEffect is a LIBRARY AUTHOR'S tool — not for app code.
//   As a senior dev you need to:
//     (a) Know the full effect execution order
//     (b) Understand exactly why CSS-in-JS libraries need it
//     (c) Be able to explain why you'd never use it in app code
//
//   These exercises prove all three through observation, not just reading.
// ============================================================

import { useState, useEffect, useLayoutEffect, useInsertionEffect, useRef } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Prove the effect execution order with your own eyes.
//
// Complete the three effects below so they log in this exact order:
//
//   1. useInsertionEffect
//   2. useLayoutEffect
//   3. useEffect
//
// Steps:
//   1. Add console.log statements to each effect stub.
//   2. Click "Mount" — watch the console.
//   3. Also add cleanup functions that log "[hook] cleanup".
//   4. Click "Unmount" — confirm cleanups run in reverse order.
//
// Why this matters: when you're interviewed about "the effect ordering"
// you should be able to state it from memory AND explain the reason.

function OrderProof() {
  useInsertionEffect(() => {
    // TODO: console.log('1. useInsertionEffect — styles injected here');
    return () => {
      // TODO: console.log('1. useInsertionEffect cleanup');
    };
  }, []);

  useLayoutEffect(() => {
    // TODO: console.log('2. useLayoutEffect — DOM measurement safe here');
    return () => {
      // TODO: console.log('2. useLayoutEffect cleanup');
    };
  }, []);

  useEffect(() => {
    // TODO: console.log('3. useEffect — async work safe here');
    return () => {
      // TODO: console.log('3. useEffect cleanup');
    };
  }, []);

  return (
    <p style={{ fontSize: 13 }}>
      Mounted — open the console and read the order.
    </p>
  );
}

function Exercise1() {
  const [show, setShow] = useState(false);

  return (
    <div style={styles.box}>
      <button onClick={() => setShow(s => !s)}>
        {show ? 'Unmount' : 'Mount'} order demo
      </button>
      {show && <OrderProof />}
      <p style={{ fontSize: 12, color: '#888' }}>
        Expected console order:<br />
        Mount:   1→2→3<br />
        Unmount: cleanup 1→2→3 (React calls them in order)
      </p>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Why CSS-in-JS libraries need useInsertionEffect.
//
// The two panels below demonstrate what goes wrong when styles
// are injected at the WRONG time in the effect chain.
//
// The "Broken" panel injects a style in useEffect (too late —
// useLayoutEffect already measured without that style).
// The "Fixed" panel injects the same style in useInsertionEffect
// (before measurements).
//
// Steps:
//   1. Click "Mount both" — read the "Measured height" values.
//      The Broken panel shows a height WITHOUT the padding.
//      The Fixed panel shows a height WITH the padding.
//   2. Complete the fixedStyleRef injection using useInsertionEffect.
//   3. Confirm: both panels should now show the correct (larger) height.
//
// This concretely explains WHY the hook exists.

const INJECTED_STYLE_ID = 'ex2-dynamic-style';

function BrokenPanel() {
  const boxRef = useRef(null);
  const [height, setHeight] = useState(0);

  // ❌ Style injected AFTER layout measurement — too late
  useEffect(() => {
    const style = document.getElementById(INJECTED_STYLE_ID + '-broken')
      || Object.assign(document.createElement('style'), {
          id: INJECTED_STYLE_ID + '-broken',
        });
    style.textContent = '.dynamic-box { padding: 40px; }';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useLayoutEffect(() => {
    // This measures BEFORE the style above is injected — wrong height
    setHeight(boxRef.current?.offsetHeight ?? 0);
  }, []);

  return (
    <div style={{ border: '2px solid #f44336', borderRadius: 6, padding: '0.5rem' }}>
      <p style={{ margin: 0, color: '#f44336', fontSize: 12 }}>❌ Broken (useEffect injection)</p>
      <div ref={boxRef} className="dynamic-box" style={{ background: '#fce4ec', minHeight: 20 }}>
        Content
      </div>
      <p style={{ margin: 0, fontSize: 12 }}>
        Measured height: <strong>{height}px</strong>
        <br />(should include 40px padding on each side)
      </p>
    </div>
  );
}

function FixedPanel() {
  const boxRef = useRef(null);
  const [height, setHeight] = useState(0);

  // TODO: Use useInsertionEffect to inject the style FIRST
  // so that useLayoutEffect below measures the correct height.
  // useInsertionEffect(() => {
  //   const style = Object.assign(document.createElement('style'), {
  //     id: INJECTED_STYLE_ID + '-fixed',
  //   });
  //   style.textContent = '.dynamic-box { padding: 40px; }';
  //   document.head.appendChild(style);
  //   return () => style.remove();
  // }, []);

  useLayoutEffect(() => {
    // This should now measure AFTER styles are injected — correct height
    setHeight(boxRef.current?.offsetHeight ?? 0);
  }, []);

  return (
    <div style={{ border: '2px solid #4caf50', borderRadius: 6, padding: '0.5rem' }}>
      <p style={{ margin: 0, color: '#4caf50', fontSize: 12 }}>✅ Fixed (useInsertionEffect injection)</p>
      <div ref={boxRef} className="dynamic-box" style={{ background: '#e8f5e9', minHeight: 20 }}>
        Content
      </div>
      <p style={{ margin: 0, fontSize: 12 }}>
        Measured height: <strong>{height}px</strong>
        <br />(should include 40px padding on each side)
      </p>
    </div>
  );
}

function Exercise2() {
  const [key, setKey] = useState(0);

  return (
    <div style={styles.box}>
      <button onClick={() => setKey(k => k + 1)}>Remount both</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BrokenPanel key={`broken-${key}`} />
        <FixedPanel  key={`fixed-${key}`} />
      </div>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: "Would you ever reach for this in app code?"
//        — A decision-making exercise (no code to write).
//
// For each scenario below, decide: useInsertionEffect, useLayoutEffect,
// or useEffect?  Write your answer and reasoning in comments.
//
// Scenario A: Fetch user data when component mounts.
// Scenario B: Inject a dynamic <style> tag before any DOM measurement.
// Scenario C: Measure an element's width and store it in state.
// Scenario D: Add a window 'keydown' listener.
// Scenario E: A CSS-in-JS library needs styles ready before layout effects.
//
// After answering, read the confirmation below.

function Exercise3() {
  return (
    <div style={styles.box}>
      <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Decision table:</p>
      <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={td}>Scenario</th>
            <th style={td}>Your answer</th>
            <th style={td}>Correct hook</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Fetch user data on mount',                              '???', 'useEffect'],
            ['Inject dynamic <style> before DOM measurement',        '???', 'useInsertionEffect'],
            ['Measure element width, store in state',                '???', 'useLayoutEffect'],
            ['Add window keydown listener',                          '???', 'useEffect'],
            ['CSS-in-JS lib: styles needed before layout effects',   '???', 'useInsertionEffect'],
          ].map(([scenario, yours, correct], i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={td}>{scenario}</td>
              <td style={{ ...td, color: '#999' }}>
                {/* TODO: replace '???' with your answer above */}
                {yours}
              </td>
              <td style={{ ...td, color: '#4caf50' }}>{correct}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
        Key rule: if you're writing app code, you should NEVER reach for
        useInsertionEffect. It's for library authors injecting styles.
      </p>
    </div>
  );
}

const td = { border: '1px solid #ddd', padding: '6px 10px', textAlign: 'left' };

// ─── Playground ──────────────────────────────────────────────
// Verify: what happens if you call setState inside useInsertionEffect?
//
// According to the notes it's "allowed but a code smell."
// Try it here — does it cause issues?  What does React warn about?

function Playground() {
  const [log, setLog] = useState([]);

  // Uncomment to experiment:
  // useInsertionEffect(() => {
  //   setLog(l => [...l, 'useInsertionEffect ran at ' + Date.now()]);
  // }, []);

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13 }}>
        Uncomment the useInsertionEffect + setState experiment above.<br />
        Does React warn? Does it cause extra renders?
      </p>
      {log.map((entry, i) => <p key={i} style={{ fontSize: 12, margin: 0 }}>{entry}</p>)}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 720 }}>
      <h1>useInsertionEffect</h1>

      <h2>Exercise 1 — Effect Execution Order</h2>
      <p style={styles.goal}>
        Add console.logs to prove the order: Insertion → Layout → Effect.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Why CSS-in-JS Libraries Need It</h2>
      <p style={styles.goal}>
        Inject a style in useInsertionEffect so measurements in useLayoutEffect are correct.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Hook Selection Decision Table</h2>
      <p style={styles.goal}>
        Fill in the "Your answer" column before reading the correct answer.
      </p>
      <Exercise3 />

      <h2>Playground — setState inside useInsertionEffect</h2>
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
