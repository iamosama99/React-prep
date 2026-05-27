// ============================================================
// Topic:   Context API Limitations
// Phase:   6 — State Management
//
// HOW TO RUN: Pure React — no extra installs.
//   npm run tutorial context-api-limitations
//
// APPROACH: These are *observation* exercises. The code is
// intentionally written to demonstrate each limitation.
// Run it, click the buttons, read the render counters, and
// make sure you can explain WHY each counter behaves as it does.
//
// After each exercise, answer the "Check yourself" question
// at the bottom of that section before moving on.
// ============================================================

import { createContext, useContext, useState, useRef, memo } from 'react';

// ─── Shared utility ──────────────────────────────────────────
// Tracks how many times a component has rendered.
function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

function Badge({ label, count }) {
  const fresh = count === 1;
  return (
    <span style={{
      display: 'inline-block',
      background: fresh ? '#bbf7d0' : '#fde68a',
      color: '#111', borderRadius: 4, padding: '1px 7px',
      fontSize: 12, marginLeft: 8,
    }}>
      {label}: {count} render{count !== 1 ? 's' : ''}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — All-or-nothing subscription
//
// A single context holds { user, theme }.
// UserCard only cares about user.  ThemeTag only cares about theme.
// Neither reads the other's data.
//
// OBSERVE: Click "Change Theme" repeatedly.
//          Watch UserCard's render count climb even though user
//          never changed.  That is the all-or-nothing limitation.
//
// CHECK YOURSELF (answer without looking at notes.md):
//   Why does UserCard re-render when only theme changes?
// ─────────────────────────────────────────────────────────────

const AppCtx = createContext(null);

function AppProvider({ children }) {
  const [user, setUser]   = useState({ name: 'Alice', avatar: '👤' });
  const [theme, setTheme] = useState('light');

  // ⚠️  Inline object literal — new reference on every render.
  // Both consumers re-render whenever *any* value changes.
  return (
    <AppCtx.Provider value={{ user, theme, setUser, setTheme }}>
      {children}
    </AppCtx.Provider>
  );
}

function UserCard() {
  const renders = useRenderCount();
  const { user } = useContext(AppCtx);
  return (
    <div style={card}>
      {user.avatar} {user.name}
      <Badge label="UserCard" count={renders} />
    </div>
  );
}

function ThemeTag() {
  const renders = useRenderCount();
  const { theme } = useContext(AppCtx);
  return (
    <div style={card}>
      Theme: <strong>{theme}</strong>
      <Badge label="ThemeTag" count={renders} />
    </div>
  );
}

function Exercise1() {
  return (
    <AppProvider>
      <p style={hint}>
        Click the buttons below and watch the render counts.
        UserCard only reads <code>user</code> — but it re-renders
        when <code>theme</code> changes too.
      </p>
      <UserCard />
      <ThemeTag />
      <CtxActions />
    </AppProvider>
  );
}

// Helper — reads both setters from context to drive the demo.
function CtxActions() {
  const { setTheme, setUser } = useContext(AppCtx);
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <button onClick={() => setUser({ name: 'Bob', avatar: '🧑' })}>
        Change User
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — React.memo cannot bail out a context consumer
//
// MemoUserCard is wrapped in React.memo with no props at all
// (perfect memo conditions: no props, no prop changes).
//
// OBSERVE: Click "Toggle Theme".
//          MemoUserCard still re-renders — its render count
//          goes up just like the unwrapped version.
//
// CHECK YOURSELF:
//   Why doesn't memo prevent the re-render here?
//   What would memo *actually* protect against?
// ─────────────────────────────────────────────────────────────

const MemoUserCard = memo(function MemoUserCard() {
  const renders = useRenderCount();
  const { user } = useContext(AppCtx);
  return (
    <div style={{ ...card, borderColor: '#a78bfa' }}>
      {user.avatar} {user.name}
      <Badge label="memo(UserCard)" count={renders} />
      <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 6 }}>
        ← wrapped in memo, still re-renders
      </span>
    </div>
  );
});

function Exercise2() {
  return (
    <AppProvider>
      <p style={hint}>
        <code>MemoUserCard</code> has no props. Memo's prop-comparison
        sees nothing to change. Yet context bypasses that check entirely.
      </p>
      <MemoUserCard />
      <ThemeTag />
      <CtxActions />
    </AppProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Object reference churn: re-renders with unchanged data
//
// CountProvider creates a new { count, increment } object on every
// render of App — even when App re-renders for unrelated reasons.
//
// Two components subscribe:
//   CountDisplay — reads count (legitimate subscriber)
//   ActionButton — only calls increment, never reads count
//
// Non-subscriber:
//   OutsideChild — lives inside CountProvider but does NOT call
//   useContext. Watch how it behaves differently.
//
// OBSERVE:
//   Click "Increment" — count changes, all three update as expected.
//   Then click "Trigger parent re-render" — it re-renders the parent
//   WITHOUT changing count. Watch what happens to each component.
//
// CHECK YOURSELF:
//   Why does ActionButton re-render when count doesn't change?
//   Why does OutsideChild NOT re-render on "Trigger parent re-render"?
// ─────────────────────────────────────────────────────────────

const CountCtx = createContext(null);

function CountProvider({ children }) {
  const [count, setCount] = useState(0);
  const increment = () => setCount(c => c + 1);

  // New object reference on every render of CountProvider.
  // Even if count didn't change, the object is new → consumers re-render.
  return (
    <CountCtx.Provider value={{ count, increment }}>
      {children}
    </CountCtx.Provider>
  );
}

function CountDisplay() {
  const renders = useRenderCount();
  const { count } = useContext(CountCtx);
  return (
    <div style={card}>
      Count: <strong>{count}</strong>
      <Badge label="CountDisplay" count={renders} />
    </div>
  );
}

function ActionButton() {
  const renders = useRenderCount();
  const { increment } = useContext(CountCtx);
  return (
    <div style={{ ...card, borderColor: '#fb923c' }}>
      <button onClick={increment}>Increment</button>
      <span style={{ marginLeft: 8, fontSize: 12, color: '#ea580c' }}>
        reads only increment, never count
      </span>
      <Badge label="ActionButton" count={renders} />
    </div>
  );
}

// Not a context consumer — renders inside the tree but never calls useContext.
function OutsideChild() {
  const renders = useRenderCount();
  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      Not subscribed to any context
      <Badge label="OutsideChild" count={renders} />
    </div>
  );
}

function Exercise3Wrapper() {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <p style={hint}>
        "Trigger parent re-render" bumps a state that CountProvider
        doesn't know about — but the inline object in its value prop
        is still recreated, triggering all consumers.
      </p>
      <button onClick={() => setTick(t => t + 1)} style={{ marginBottom: 8 }}>
        Trigger parent re-render (tick: {tick})
      </button>
      <CountProvider>
        <CountDisplay />
        <ActionButton />
        <OutsideChild />
      </CountProvider>
    </div>
  );
}

function Exercise3() {
  return <Exercise3Wrapper />;
}

// ─── Playground ──────────────────────────────────────────────
// Try to build a context with 4 keys and 4 components, each reading
// one key. Use render counters to count total re-renders per button
// click. Can you calculate the number before you run it?
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
      Build a context with 4 keys (a, b, c, d). Four consumer components,
      each reading one key. Add render counters. Click "change a" — how
      many total re-renders occur? Why is it 4 and not 1?
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card = {
  padding: 8, border: '1px solid #d1d5db', borderRadius: 4,
  marginBottom: 6, fontSize: 14,
};
const hint = { margin: '0 0 8px', color: '#555', fontSize: 13 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Context API Limitations</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Run each exercise, interact with the buttons, and explain the render
        counts before reading the answer in notes.md.
      </p>

      <h2 style={h2}>Exercise 1 — All-or-nothing subscription</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — React.memo can't bail out a context consumer</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Object reference churn: spurious re-renders</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}

const h2 = { fontSize: 15, marginTop: 28, marginBottom: 6 };
