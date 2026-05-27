// ============================================================
// Topic:   Context Optimization
// Phase:   6 — State Management
//
// HOW TO RUN: Pure React — no extra installs.
//   npm run tutorial context-optimization
//
// APPROACH: Each exercise starts with BROKEN code (same bugs
// as topic 01) and gives you a TODO to fix it using one of
// the five optimization strategies. The render counters will
// show you when you got it right.
// ============================================================

import {
  createContext, useContext, useState, useReducer,
  useMemo, useRef, memo,
} from 'react';

// ─── Shared utility ──────────────────────────────────────────
function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

function Badge({ label, count }) {
  return (
    <span style={{
      display: 'inline-block',
      background: count === 1 ? '#bbf7d0' : '#fde68a',
      color: '#111', borderRadius: 4, padding: '1px 7px',
      fontSize: 12, marginLeft: 8,
    }}>
      {label}: {count}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Strategy: useMemo on the context value
//
// PROBLEM: AppProvider below creates a new { user, theme } object
// on every render.  Even unrelated parent state changes cause all
// subscribers to re-render.
//
// TODO:
//   Wrap the value object in useMemo so a new object is only
//   created when user or theme actually change.
//
//   const value = useMemo(() => ({ user, theme, setUser, setTheme }),
//                         [user, theme]);
//
// VERIFY:
//   1. Click "Trigger parent re-render" — after your fix,
//      UserCard and ThemeTag render counts should NOT increase.
//   2. Click "Change User" — UserCard should go up, ThemeTag should not.
//      Wait... does ThemeTag still go up? Why? (see Check Yourself)
//
// CHECK YOURSELF:
//   After memoizing, does ThemeTag still re-render when user changes?
//   useMemo reduces how often the value changes — does it eliminate
//   cross-concern re-renders entirely?
// ─────────────────────────────────────────────────────────────

const AppCtx1 = createContext(null);

function AppProvider1({ children }) {
  const [user, setUser]   = useState({ name: 'Alice', avatar: '👤' });
  const [theme, setTheme] = useState('light');

  // TODO: replace this with a memoized value
  const value = { user, theme, setUser, setTheme }; // ← broken: new object every render

  return (
    <AppCtx1.Provider value={value}>
      {children}
    </AppCtx1.Provider>
  );
}

function UserCard1() {
  const renders = useRenderCount();
  const { user } = useContext(AppCtx1);
  return <div style={card}>{user.avatar} {user.name}<Badge label="UserCard" count={renders} /></div>;
}

function ThemeTag1() {
  const renders = useRenderCount();
  const { theme } = useContext(AppCtx1);
  return <div style={card}>Theme: <strong>{theme}</strong><Badge label="ThemeTag" count={renders} /></div>;
}

function Exercise1() {
  const [tick, setTick] = useState(0);
  const { setTheme, setUser } = useContext(AppCtx1);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setTick(t => t + 1)}>Trigger parent re-render (tick: {tick})</button>
        <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>Toggle Theme</button>
        <button onClick={() => setUser({ name: 'Bob', avatar: '🧑' })}>Change User</button>
      </div>
      <UserCard1 />
      <ThemeTag1 />
    </div>
  );
}

// Wrapper needed so Exercise1 can call useContext(AppCtx1)
function Exercise1Wrapper() {
  return (
    <AppProvider1>
      <p style={hint}>Fix the provider so "Trigger parent re-render" stops causing unnecessary re-renders.</p>
      <Exercise1 />
    </AppProvider1>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Strategy: split contexts
//
// PROBLEM (same as Exercise 1, but now useMemo isn't enough):
// UserCard2 and ThemeTag2 are in the same AppCtx2. Even with
// memoization, changing user causes ThemeTag2 to re-render
// (they share the same context object, so any change triggers all).
//
// TODO:
//   1. Create two separate contexts: UserCtx and ThemeCtx.
//   2. Update AppProvider2 to render two nested providers —
//      one for each context.
//   3. Memoize the setters in a third ActionsCtx (they're stable,
//      so the memo deps array is []).
//   4. Update UserCard2 to read from UserCtx only.
//   5. Update ThemeTag2 to read from ThemeCtx only.
//   6. Update Buttons2 to read from ActionsCtx.
//
// VERIFY:
//   Click "Toggle Theme" — ThemeTag2 goes up, UserCard2 stays.
//   Click "Change User" — UserCard2 goes up, ThemeTag2 stays.
//
// CHECK YOURSELF:
//   Why does separating state and actions into their own context
//   make the action-only components more stable?
// ─────────────────────────────────────────────────────────────

// TODO: replace this single context with three separate ones
const AppCtx2 = createContext(null); // ← delete this and create UserCtx, ThemeCtx, ActionsCtx

function AppProvider2({ children }) {
  const [user, setUser]   = useState({ name: 'Alice', avatar: '👤' });
  const [theme, setTheme] = useState('light');

  // TODO: split into three providers
  // Hint: actions (setUser, setTheme) are stable — useMemo(()=>({...}), [])
  const value = useMemo(() => ({ user, theme, setUser, setTheme }), [user, theme]);

  return (
    <AppCtx2.Provider value={value}>
      {children}
    </AppCtx2.Provider>
  );
}

function UserCard2() {
  const renders = useRenderCount();
  // TODO: read from UserCtx instead of AppCtx2
  const { user } = useContext(AppCtx2);
  return <div style={card}>{user.avatar} {user.name}<Badge label="UserCard2" count={renders} /></div>;
}

function ThemeTag2() {
  const renders = useRenderCount();
  // TODO: read from ThemeCtx instead of AppCtx2
  const { theme } = useContext(AppCtx2);
  return <div style={card}>Theme: <strong>{theme}</strong><Badge label="ThemeTag2" count={renders} /></div>;
}

function Buttons2() {
  const renders = useRenderCount();
  // TODO: read from ActionsCtx — this component should NEVER re-render from state changes
  const { setTheme, setUser } = useContext(AppCtx2);
  return (
    <div style={{ ...card, borderColor: '#818cf8' }}>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>Toggle Theme</button>
      {' '}
      <button onClick={() => setUser({ name: 'Bob', avatar: '🧑' })}>Change User</button>
      <Badge label="Buttons2 (should stay at 1)" count={renders} />
    </div>
  );
}

function Exercise2() {
  return (
    <AppProvider2>
      <p style={hint}>
        After splitting contexts, changing theme should not re-render
        UserCard2, and Buttons2 should stay at 1 render forever.
      </p>
      <UserCard2 />
      <ThemeTag2 />
      <Buttons2 />
    </AppProvider2>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Strategy: useReducer + separate state/dispatch contexts
//
// This is the classic pattern for complex state: one context for
// the state value, a separate context for dispatch.
//
// Components that only dispatch (Increment, Decrement buttons)
// subscribe to DispatchCtx only — they never re-render when
// count changes because DispatchCtx never produces a new value
// (dispatch is stable for the lifetime of the provider).
//
// The SKELETON below has the two contexts but they both come from
// one provider. Your job is to complete the provider and the hooks.
//
// TODO:
//   1. Complete countReducer — handle 'increment', 'decrement', 'reset'.
//   2. In CountProvider, call useReducer(countReducer, 0).
//   3. Provide `count` to CountStateCtx and `dispatch` to CountDispatchCtx.
//   4. Create two custom hooks — useCount() and useCountDispatch() —
//      that read from their respective contexts.
//   5. Update CounterDisplay, IncrementButton, DecrementButton,
//      and ResetButton to use the correct hook.
//
// VERIFY:
//   Click Increment/Decrement — IncrementButton and DecrementButton
//   render counts should STAY AT 1. Only CounterDisplay should go up.
//
// CHECK YOURSELF:
//   Why is dispatch stable (never a new reference) when you use useReducer?
//   What would happen if you put state AND dispatch in one context object?
// ─────────────────────────────────────────────────────────────

const CountStateCtx    = createContext(null);
const CountDispatchCtx = createContext(null);

// TODO: complete this reducer
function countReducer(state, action) {
  switch (action.type) {
    // case 'increment': ...
    // case 'decrement': ...
    // case 'reset':     ...
    default: return state;
  }
}

function CountProvider({ children }) {
  // TODO: const [count, dispatch] = useReducer(countReducer, 0);

  return (
    // TODO: nest CountDispatchCtx.Provider (outer) and CountStateCtx.Provider (inner)
    // Outer = dispatch (never changes), Inner = state (changes on every action)
    <CountStateCtx.Provider value={null}>
      <CountDispatchCtx.Provider value={null}>
        {children}
      </CountDispatchCtx.Provider>
    </CountStateCtx.Provider>
  );
}

// TODO: implement these two custom hooks
function useCount()         { return useContext(CountStateCtx); }
function useCountDispatch() { return useContext(CountDispatchCtx); }

function CounterDisplay() {
  const renders = useRenderCount();
  const count = useCount();
  return (
    <div style={card}>
      Count: <strong>{count ?? '—'}</strong>
      <Badge label="Display (re-renders with count)" count={renders} />
    </div>
  );
}

function IncrementButton() {
  const renders = useRenderCount();
  const dispatch = useCountDispatch();
  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      <button onClick={() => dispatch?.({ type: 'increment' })}>+</button>
      <Badge label="Increment (should stay at 1)" count={renders} />
    </div>
  );
}

function DecrementButton() {
  const renders = useRenderCount();
  const dispatch = useCountDispatch();
  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      <button onClick={() => dispatch?.({ type: 'decrement' })}>−</button>
      <Badge label="Decrement (should stay at 1)" count={renders} />
    </div>
  );
}

function ResetButton() {
  const renders = useRenderCount();
  const dispatch = useCountDispatch();
  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      <button onClick={() => dispatch?.({ type: 'reset' })}>Reset</button>
      <Badge label="Reset (should stay at 1)" count={renders} />
    </div>
  );
}

function Exercise3() {
  return (
    <CountProvider>
      <p style={hint}>
        Complete the reducer and provider. Increment/Decrement/Reset buttons
        should never re-render after their first mount — only CounterDisplay should.
      </p>
      <CounterDisplay />
      <IncrementButton />
      <DecrementButton />
      <ResetButton />
    </CountProvider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try building a "cart" context optimized for:
//   - CartItemsCtx  — array of items (changes when items added/removed)
//   - CartCountCtx  — derived item count (could be a separate context or derived)
//   - CartActionsCtx — addItem, removeItem, clearCart (never changes)
//
// Which components need which contexts?
// How do you prevent the checkout button from re-rendering when items change?
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
      Build an optimized cart context following the three-context split above.
      The checkout button should subscribe only to CartActionsCtx and stay at
      1 render even as items are added and removed.
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 6, fontSize: 14 };
const hint = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2   = { fontSize: 15, marginTop: 28, marginBottom: 6 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Context Optimization</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Each exercise starts broken. Apply the strategy described in the TODO
        and use render counts to confirm you fixed it.
      </p>

      <h2 style={h2}>Exercise 1 — useMemo on the context value</h2>
      <Exercise1Wrapper />

      <h2 style={h2}>Exercise 2 — Split into separate contexts</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — useReducer + state/dispatch context split</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
