// ============================================================
// Topic:   Render Props
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState, useCallback } from 'react';

// ─── Exercise 1: Build a Render Prop Component ───────────────
//
// SITUATION
//   You need a <HoverTracker> component that tracks whether the user is
//   hovering over a zone. Multiple components across the app need this
//   behavior, but each one renders differently — one shows a tooltip,
//   one dims the element, one highlights a border.
//   The behavior is shared; the rendering is not.
//
// PART A — Named render prop
//   Build <HoverTracker render={({ isHovered }) => <YourJSX />} />
//   - Wraps a div with onMouseEnter / onMouseLeave
//   - Tracks `isHovered` in state
//   - Calls props.render({ isHovered }) to get the JSX to display
//
// PART B — Children as function (same thing, different syntax)
//   Build <HoverTracker2> that uses `children` as the render function:
//   <HoverTracker2>{({ isHovered }) => <YourJSX />}</HoverTracker2>
//
// IMPORTANT DISTINCTION (this comes up in interviews)
//   A render prop is a FUNCTION the component calls — not a ReactNode.
//   `render={() => <div />}`  ← render prop (function)
//   `header={<div />}`        ← named slot (ReactNode value, not a function)
//   Know the difference cold.

function HoverTracker({ render }) {
  // TODO: track isHovered with useState
  // TODO: return a div with onMouseEnter / onMouseLeave handlers
  //       that calls render({ isHovered }) as the content
  return <div>HoverTracker stub</div>;
}

function HoverTracker2({ children }) {
  // TODO: same as HoverTracker but calls children({ isHovered }) instead of render(...)
  return <div>HoverTracker2 stub</div>;
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Build a Render Prop Component</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Both components track hover. The caller decides what to render.
        Hover over the boxes below.
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Named render prop */}
        <HoverTracker
          render={({ isHovered }) => (
            <div style={{
              padding: 24,
              border: `2px solid ${isHovered ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: 8,
              transition: 'border-color 0.15s',
              cursor: 'pointer',
            }}>
              <strong>Named render prop</strong>
              <p style={{ margin: '4px 0', fontSize: 13, color: isHovered ? '#3b82f6' : '#64748b' }}>
                {isHovered ? '👋 Hovering!' : 'Hover over me'}
              </p>
            </div>
          )}
        />

        {/* Children as function */}
        <HoverTracker2>
          {({ isHovered }) => (
            <div style={{
              padding: 24,
              background: isHovered ? '#f0fdf4' : '#f8fafc',
              borderRadius: 8,
              transition: 'background 0.15s',
              cursor: 'pointer',
            }}>
              <strong>Children as function</strong>
              <p style={{ margin: '4px 0', fontSize: 13, color: isHovered ? '#16a34a' : '#64748b' }}>
                {isHovered ? '✅ Active' : 'Same behavior, different syntax'}
              </p>
            </div>
          )}
        </HoverTracker2>
      </div>
    </section>
  );
}


// ─── Exercise 2: The Performance Bug ─────────────────────────
//
// SITUATION
//   The code below has a classic render prop performance problem.
//   <ExpensiveChild> is wrapped in React.memo — it should only re-render
//   when its props change. But it keeps re-rendering on every parent update.
//
// YOUR TASK
//   1. Read the broken code and identify WHY <ExpensiveChild> re-renders
//      even though its displayed content hasn't changed.
//      (Hint: what is the identity of the `render` prop on each parent render?)
//
//   2. Fix it — without changing the external API of <DataProvider> or the
//      call site structure. Two valid approaches:
//        Option A: move the render function outside the parent component
//        Option B: wrap it in useCallback inside the parent
//
//   3. After fixing, click the "Unrelated update" button — <ExpensiveChild>
//      should NOT flash/re-render.
//
// HOW TO SEE RE-RENDERS
//   Open React DevTools → enable "Highlight updates when components render"
//   OR: watch the render counter in <ExpensiveChild> — it should stop climbing.

import { memo } from 'react';

function DataProvider({ render }) {
  const [data] = useState({ user: 'Osama', score: 42 });
  return <div>{render(data)}</div>;
}

// This component is memoized — it should NOT re-render unless its props change
const ExpensiveChild = memo(function ExpensiveChild({ user, renderCount }) {
  return (
    <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, marginTop: 8 }}>
      <p style={{ margin: 0 }}>Hello, {user} 👋</p>
      <p style={{ margin: '4px 0', fontSize: 12, color: '#64748b' }}>
        This component rendered {renderCount} times. It should stop after the first.
      </p>
    </div>
  );
});

function Exercise2() {
  const [tick, setTick] = useState(0);
  const renderCount = useState(0);

  // PROBLEM: this inline function is recreated on every render of Exercise2
  // which means DataProvider sees a new `render` prop every time,
  // which means ExpensiveChild sees new props, which breaks memo.
  //
  // TODO: Fix the render function so it's referentially stable.
  //       Move it outside this component, or use useCallback.

  return (
    <section>
      <h2>Exercise 2 — The Performance Bug</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Click "Unrelated update" then check if ExpensiveChild re-rendered.
        Before fix: it re-renders every time. After fix: it stays stable.
      </p>

      <button onClick={() => setTick(t => t + 1)} style={{ marginBottom: 12 }}>
        Unrelated update (tick: {tick})
      </button>

      {/* BROKEN: inline arrow = new function identity every render */}
      <DataProvider
        render={(data) => {
          // This closure is re-created on every render of Exercise2
          // ExpensiveChild.memo() sees a new `render` prop and re-renders
          const count = renderCount[0]; // just tracking renders for display
          return <ExpensiveChild user={data.user} renderCount={count} />;
        }}
      />

      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
        Hint: look at what changes between parent renders and what stays the same.
      </p>
    </section>
  );
}


// ─── Exercise 3: Convert to a Hook — Why Hooks Win ───────────
//
// SITUATION
//   Below is a real-world example of "callback hell" — combining three
//   render-prop components to compose three behaviors together.
//   This was normal in 2018. Today it's a sign to migrate.
//
//   Your task: convert all three render-prop providers into custom hooks,
//   then show how the hook version is dramatically simpler.
//
// THE BEFORE CODE (read-only, pre-written)
//   <MousePosition> → tracks mouse x, y
//   <WindowSize>    → tracks window width, height
//   <OnlineStatus>  → tracks navigator.onLine
//
// YOUR TASK
//   Write three custom hooks:
//     useMousePosition()  → { x, y }
//     useWindowSize()     → { width, height }
//     useOnlineStatus()   → boolean
//
//   Then build <AfterHooks> that uses all three hooks in sequence —
//   no nesting, no callbacks, no pyramid.
//
// KEY INSIGHT to articulate after finishing:
//   Hooks don't add any components to the tree. They don't require
//   passing functions. Multiple behaviors compose with sequential calls,
//   not nested callbacks. This is exactly what the notes mean by
//   "hooks eliminated callback hell."

// ── Before: Render prop pyramid (read-only) ─────────────────
function MousePosition({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div
      onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
      style={{ display: 'contents' }}
    >
      {children(pos)}
    </div>
  );
}
function WindowSize({ children }) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useState(() => {
    const h = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  });
  return children(size);
}
function OnlineStatus({ children }) {
  const [online, setOnline] = useState(navigator.onLine);
  useState(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  });
  return children(online);
}

function BeforeHooks() {
  return (
    <MousePosition>
      {(mouse) => (
        <WindowSize>
          {(window) => (
            <OnlineStatus>
              {(online) => (
                // Finally we have all three values — three levels of nesting deep
                <div style={{ fontSize: 13, background: '#fefce8', padding: 12, borderRadius: 8 }}>
                  <p style={{ margin: '2px 0' }}>🖱 Mouse: {mouse.x}, {mouse.y}</p>
                  <p style={{ margin: '2px 0' }}>📐 Window: {window.width}×{window.height}</p>
                  <p style={{ margin: '2px 0' }}>{online ? '🟢 Online' : '🔴 Offline'}</p>
                  <p style={{ margin: '8px 0 0', color: '#92400e', fontSize: 12 }}>
                    Three levels of nesting just to read three values.
                  </p>
                </div>
              )}
            </OnlineStatus>
          )}
        </WindowSize>
      )}
    </MousePosition>
  );
}

// ── After: Your hook versions ────────────────────────────────

import { useEffect } from 'react';

function useMousePosition() {
  // TODO: useState + useEffect (mousemove listener + cleanup)
  // Return { x, y }
  return { x: 0, y: 0 }; // stub
}

function useWindowSize() {
  // TODO: useState + useEffect (resize listener + cleanup)
  // Return { width, height }
  return { width: 0, height: 0 }; // stub
}

function useOnlineStatus() {
  // TODO: useState + useEffect (online/offline listeners + cleanup)
  // Return boolean
  return true; // stub
}

function AfterHooks() {
  // TODO: call the three hooks — no nesting, no callbacks, no pyramid
  // Then display the same information as BeforeHooks
  return (
    <div style={{ fontSize: 13, background: '#f0fdf4', padding: 12, borderRadius: 8 }}>
      <p style={{ margin: '2px 0', color: '#64748b' }}>
        Implement useMousePosition, useWindowSize, useOnlineStatus above,
        then call them here in sequence — no nesting needed.
      </p>
    </div>
  );
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Convert Render Props to Hooks</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Both panels show the same data. The "Before" uses three nested render prop
        components. The "After" calls three hooks in sequence — flat, readable, no pyramid.
        Move your mouse and resize the window to see them update.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h4 style={{ fontSize: 13, color: '#92400e', marginTop: 0 }}>Before (render prop pyramid)</h4>
          <BeforeHooks />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h4 style={{ fontSize: 13, color: '#166534', marginTop: 0 }}>After (hook composition)</h4>
          <AfterHooks />
        </div>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 03 — Render Props</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
