// ============================================================
// Topic:   What Causes Re-renders
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises make re-renders VISIBLE
//   via render counters. The goal: predict before clicking, then
//   verify. Every wrong prediction is a gap to close.
// ============================================================

import { useState, useContext, createContext, useRef, useCallback } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };

// Shared render counter helper — displays how many times a component rendered
function RenderBadge({ name, count, highlight }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 12, fontSize: 12,
      background: highlight ? '#fef2f2' : '#f1f5f9',
      border: `1px solid ${highlight ? '#fca5a5' : '#e2e8f0'}`,
      color: highlight ? '#dc2626' : '#475569',
    }}>
      <strong>{name}</strong>
      renders: <strong>{count}</strong>
    </div>
  );
}

// ─── Exercise 1: The Four Causes ─────────────────────────────
//
// SITUATION
//   React re-renders a component when:
//   1. Its own state changes
//   2. Its parent re-renders (regardless of whether props changed)
//   3. A context it subscribes to changes
//   4. A hook it uses internally changes state
//
//   Props changing does NOT cause re-renders on its own —
//   the parent must render first, which then causes the child to render.
//
// YOUR TASK
//   Before clicking each button, PREDICT which render counts will increase.
//   Then click and verify. The most surprising behavior is cause #2:
//   NoPropsChild re-renders every time Parent re-renders, even though
//   it receives zero props.

function NoPropsChild({ renderCount }) {
  return (
    <div style={{ padding: '6px 10px', background: '#eff6ff', borderRadius: 4, fontSize: 13 }}>
      NoPropsChild — <RenderBadge name="" count={renderCount} />
    </div>
  );
}

function PropsChild({ value, renderCount }) {
  return (
    <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 4, fontSize: 13 }}>
      PropsChild (value={value}) — <RenderBadge name="" count={renderCount} />
    </div>
  );
}

function Exercise1() {
  const parentRenders = useRef(0);
  parentRenders.current++;

  const noPropsRenders = useRef(0);
  noPropsRenders.current++;

  const propsRenders = useRef(0);

  const [parentState, setParentState] = useState(0);
  const [propsValue, setPropsValue] = useState('hello');

  // Force a child re-render tracker (we'll track via its own ref)
  const childCounterRef = useRef(0);

  return (
    <section>
      <h2>Exercise 1 — The Four Causes of Re-renders</h2>
      <p style={hint}>
        PREDICT before clicking: which render counts will change?
        The answers might surprise you.
      </p>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Parent — <RenderBadge name="" count={parentRenders.current} highlight={true} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setParentState(s => s + 1)}
            style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
          >
            Parent own state (cause #1)
          </button>
          <button
            onClick={() => setPropsValue(v => v === 'hello' ? 'world' : 'hello')}
            style={{ ...btnStyle, background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb' }}
          >
            Change PropsChild's prop (triggers parent render first)
          </button>
        </div>

        {/* PREDICT: does NoPropsChild re-render when parentState changes?
            Even though it receives NO PROPS? */}
        <ChildWithOwnCounter label="NoPropsChild (no props)" color="#eff6ff" />
        <div style={{ height: 8 }} />
        <ChildWithOwnCounter label={`PropsChild (value="${propsValue}")`} color="#f0fdf4" />
      </div>

      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Answer these before scrolling:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Does NoPropsChild re-render when Parent's state changes? Why?</li>
          <li>What would prevent NoPropsChild from re-rendering?</li>
          <li>If PropsChild's value prop doesn't change, does it still re-render?</li>
        </ol>
        {/* ANSWERS:
          1. YES. When a parent renders, ALL its children render by default —
             regardless of whether props changed. React doesn't compare props
             before calling the child function. Props comparison only happens
             with React.memo.

          2. Wrapping NoPropsChild in React.memo. Memo adds a shallow prop
             comparison check before each render. Since NoPropsChild has no
             props, it would never re-render due to parent renders.

          3. YES — if the parent re-renders, PropsChild re-renders. Even if
             value is the same string 'hello', React still calls PropsChild.
             Prop comparison only matters with React.memo.
        */}
      </div>
    </section>
  );
}

// Helper: a child that tracks its own renders
function ChildWithOwnCounter({ label, color }) {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '6px 10px', background: color, borderRadius: 4, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <RenderBadge name="renders" count={count.current} />
    </div>
  );
}


// ─── Exercise 2: Context Causes All Consumers to Re-render ───
//
// SITUATION
//   When a context value changes, EVERY component that called useContext
//   with that context re-renders — even if the component only uses a
//   PORTION of the value that didn't change.
//
//   This is context's key limitation vs state managers with selectors
//   (Zustand, Redux): there's no way to subscribe to only part of a context.
//
// YOUR TASK
//   1. Increment the counter. Observe: both consumers re-render, even
//      though UserConsumer doesn't use the counter field.
//   2. Change the username. Same: both re-render.
//   3. Answer the question: how would you fix UserConsumer re-rendering
//      when only the counter changes?

const AppContext = createContext(null);

function CounterConsumer() {
  const ctx = useContext(AppContext);
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '6px 10px', background: '#eff6ff', borderRadius: 4, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <span>CounterConsumer — uses ctx.counter: <strong>{ctx.counter}</strong></span>
      <RenderBadge name="renders" count={count.current} highlight={count.current > 1} />
    </div>
  );
}

function UserConsumer() {
  const ctx = useContext(AppContext);
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '6px 10px', background: '#f0fdf4', borderRadius: 4, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <span>UserConsumer — uses ctx.username: <strong>{ctx.username}</strong></span>
      <RenderBadge name="renders" count={count.current} highlight={count.current > 1} />
    </div>
  );
}

function Exercise2() {
  const [counter, setCounter] = useState(0);
  const [username, setUsername] = useState('alice');

  const contextValue = { counter, username };
  // ⚠️ Note: this object is recreated on every render of Exercise2!
  // This means the context value changes by reference on every render,
  // which re-renders all consumers even when counter and username are the same.
  // Fix: useMemo(() => ({ counter, username }), [counter, username])

  return (
    <section>
      <h2>Exercise 2 — Context: All Consumers Re-render on Any Change</h2>
      <p style={hint}>
        Click each button. Both consumers re-render when EITHER value changes,
        even the consumer that doesn't use the changed field.
      </p>

      <AppContext.Provider value={contextValue}>
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Context consumers:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <CounterConsumer />
            <UserConsumer />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCounter(c => c + 1)}
              style={{ ...btnStyle, background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb' }}
            >
              Increment counter ({counter})
            </button>
            <button
              onClick={() => setUsername(u => u === 'alice' ? 'bob' : 'alice')}
              style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
            >
              Toggle username ({username})
            </button>
          </div>
        </div>
      </AppContext.Provider>

      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Fixes for context over-rendering:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><strong>Split contexts</strong> — separate CounterContext and UserContext.
            Changing the counter only re-renders counter consumers.</li>
          <li><strong>useMemo the value</strong> — prevents the object reference changing
            when neither counter nor username changed (parent re-renders).</li>
          <li><strong>External state manager</strong> — Zustand, Redux with useSelector
            let components subscribe to specific slices, not the whole store.</li>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 3: What Does NOT Cause Re-renders ───────────────
//
// SITUATION
//   Three common misconceptions:
//   A. "Changing a ref causes a re-render" — FALSE
//   B. "Calling setState with the same value causes a re-render" — FALSE
//      (React bails out if new value is Object.is equal to old value)
//   C. "Re-render means the DOM updated" — FALSE
//      (A re-render just calls the function; DOM is only updated if the
//       output diffed differently from the previous render)
//
// YOUR TASK
//   For each button below, PREDICT what will happen to the render counts.
//   Then click and verify your prediction.

function Exercise3() {
  const renderCount = useRef(0);
  renderCount.current++;

  const [stateValue, setStateValue] = useState(42);
  const mutableRef = useRef('initial');

  const setSameValue = () => setStateValue(42); // Object.is(42, 42) → bailout
  const mutateRef = () => { mutableRef.current = `mutated at ${Date.now()}`; };
  const setNewValue = () => setStateValue(v => v + 1);

  return (
    <section>
      <h2>Exercise 3 — What Does NOT Cause Re-renders</h2>
      <p style={hint}>
        Predict the render count change for each action. Some are
        counterintuitive — read carefully before clicking.
      </p>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>This component:</span>
          <RenderBadge name="renders" count={renderCount.current} highlight={true} />
        </div>

        <div style={{ fontSize: 13, marginBottom: 8, color: '#475569' }}>
          stateValue: <strong>{stateValue}</strong> |
          mutableRef.current: <strong>{mutableRef.current}</strong>
          <span style={{ fontSize: 11, color: '#94a3b8' }}> (read at render time)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={setSameValue}
              style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
            >
              setStateValue(42) — same value
            </button>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Prediction: renders? __ Actual: React bails out — <em>no re-render</em>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={mutateRef}
              style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
            >
              mutate ref.current
            </button>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Prediction: renders? __ Actual: ref mutation — <em>no re-render</em>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={setNewValue}
              style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
            >
              setStateValue(v + 1) — new value
            </button>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Prediction: renders? __ Actual: state changed — <em>re-renders</em>
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Note on the ref display:</strong> When you mutate the ref, the
        displayed value doesn't update — the component didn't re-render.
        Click "setStateValue(v+1)" <em>after</em> mutating the ref — now both
        values update because the render function ran again and read the current ref value.
        This is why refs are sometimes described as "a mutable box outside React's
        reactivity system."
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 04 — What Causes Re-renders
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
