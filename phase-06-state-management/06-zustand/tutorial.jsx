// ============================================================
// Topic:   Zustand
// Phase:   6 — State Management
//
// REQUIRES: npm install zustand
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install zustand
//
// APPROACH:
//   Exercise 1 — build and use a basic Zustand store
//   Exercise 2 — diagnose and fix the shallow equality problem
//   Exercise 3 — add persist middleware + outside-React access
// ============================================================

import { useRef } from 'react';
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

// ─── Shared utility ──────────────────────────────────────────
function useRenderCount() {
  const r = useRef(0); r.current += 1; return r.current;
}
function Badge({ label, count }) {
  return (
    <span style={{
      background: count === 1 ? '#bbf7d0' : '#fde68a',
      borderRadius: 4, padding: '1px 7px', fontSize: 12, marginLeft: 8,
    }}>
      {label}: {count}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Create a Zustand store and use it in components
//
// Zustand's pitch: no Provider, no reducers, no boilerplate.
// `create` returns a hook. Call the hook with a selector.
//
// TODO:
//   1. Complete useCounterStore using `create`.
//      State: { count: 0 }
//      Actions: increment(), decrement(), reset(),
//               incrementBy(amount: number)
//
//   2. In CounterDisplay, use the hook to select count.
//      In CounterActions, use the hook to select the action fns.
//
//   3. Add render counters to both components.
//      Observe: clicking a button re-renders CounterDisplay
//      but CounterActions render count should stay at 1.
//      (Actions are functions — their references never change.)
//
// CHECK YOURSELF:
//   Why doesn't clicking a button re-render CounterActions?
//   What would happen if you did useCounterStore() with no selector?
// ─────────────────────────────────────────────────────────────

// TODO: implement the store
const useCounterStore = create((set) => ({
  count: 0,
  // increment: () => set(state => ({ ... })),
  // decrement: () => set(state => ({ ... })),
  // reset:     () => set({ ... }),
  // incrementBy: (n) => set(state => ({ ... })),
}));

function CounterDisplay() {
  const renders = useRenderCount();
  // TODO: select count from the store
  const count = useCounterStore((s) => s.count);
  return (
    <div style={card}>
      <span style={{ fontSize: 28, fontWeight: 'bold' }}>{count}</span>
      <Badge label="Display" count={renders} />
    </div>
  );
}

function CounterActions() {
  const renders = useRenderCount();
  // TODO: select action functions from the store
  // (each selected individually so each subscription is narrow)
  const increment   = useCounterStore((s) => s.increment);
  const decrement   = useCounterStore((s) => s.decrement);
  const reset       = useCounterStore((s) => s.reset);
  const incrementBy = useCounterStore((s) => s.incrementBy);

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        <button onClick={decrement}>− 1</button>
        <button onClick={increment}>+ 1</button>
        <button onClick={() => incrementBy?.(5)}>+ 5</button>
        <button onClick={reset}>Reset</button>
      </div>
      <Badge label="Actions (should stay at 1)" count={renders} />
    </div>
  );
}

function Exercise1() {
  return (
    <div>
      <p style={hint}>
        Implement useCounterStore. CounterActions should stay at 1 render
        even after many increments — it only subscribes to stable functions.
      </p>
      <CounterDisplay />
      <CounterActions />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — The shallow equality problem (and the fix)
//
// When a selector returns an OBJECT, Zustand compares the returned
// reference using Object.is. A new object is created every call →
// the component re-renders on every state change, even when the
// selected values didn't change.
//
// PART A: Observe the bug.
//   UserProfile below selects { name, email } as ONE object.
//   Click "Change role" — name and email don't change, but
//   UserProfile's render count still goes up. Watch it.
//
// PART B: Fix it two ways.
//   Way 1 — pass `shallow` as the second argument to the hook.
//   Way 2 — select name and email in separate hook calls.
//
// TODO:
//   1. Fix UserProfile using the `shallow` import at the top.
//   2. Write UserProfileSplit that uses two separate hook calls.
//   3. Compare render counts across the three variants.
//
// CHECK YOURSELF:
//   What does `shallow` do differently from Object.is?
//   Which fix do you prefer and why?
// ─────────────────────────────────────────────────────────────

const useUserStore = create((set) => ({
  name:  'Alice',
  email: 'alice@example.com',
  role:  'viewer',
  setName:  (name)  => set({ name }),
  setRole:  (role)  => set({ role }),
}));

// BROKEN: returns a new object every call → re-renders on any store change
function UserProfileBroken() {
  const renders = useRenderCount();
  const { name, email } = useUserStore((s) => ({ name: s.name, email: s.email }));
  return (
    <div style={{ ...card, borderColor: '#f97316' }}>
      {name} / {email}
      <Badge label="Broken (re-renders on role change)" count={renders} />
    </div>
  );
}

// TODO: fix with shallow
function UserProfileShallow() {
  const renders = useRenderCount();
  // TODO: pass shallow as the second argument
  const { name, email } = useUserStore(
    (s) => ({ name: s.name, email: s.email }),
    // shallow   ← add this
  );
  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      {name} / {email}
      <Badge label="Shallow (should stay stable)" count={renders} />
    </div>
  );
}

// TODO: fix with separate hook calls (no shallow needed)
function UserProfileSplit() {
  const renders = useRenderCount();
  // TODO: two separate useUserStore calls
  const name  = useUserStore((s) => s.name);
  const email = useUserStore((s) => s.email);
  return (
    <div style={{ ...card, borderColor: '#6366f1' }}>
      {name} / {email}
      <Badge label="Split (should stay stable)" count={renders} />
    </div>
  );
}

function Exercise2() {
  const role    = useUserStore((s) => s.role);
  const setRole = useUserStore((s) => s.setRole);
  return (
    <div>
      <p style={hint}>
        Click "Change role" — role changes but name/email don't.
        Watch which variants re-render unnecessarily.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setRole(role === 'viewer' ? 'admin' : 'viewer')}>
          Change role (current: {role})
        </button>
        <button onClick={() => useUserStore.getState().setName('Bob')}>
          Change name
        </button>
      </div>
      <UserProfileBroken />
      <UserProfileShallow />
      <UserProfileSplit />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — persist middleware + accessing state outside React
//
// PART A: persist middleware
//   Wrap your settings store with `persist` so the theme choice
//   survives a page refresh. Check localStorage in DevTools.
//
// PART B: accessing state outside React
//   Zustand stores have getState() and subscribe() on the hook itself.
//   The "sync indicator" below should update its text OUTSIDE of React
//   by subscribing directly to the store.
//
// TODO:
//   1. Complete useSettingsStore with persist middleware.
//      State: { theme: 'light' }
//      Action: setTheme(theme: string)
//      Persist: only persist 'theme' (use partialize option).
//
//   2. In ThemeSwitcher, use useSettingsStore to toggle theme.
//
//   3. The syncDiv ref points to a raw DOM element. Use
//      useSettingsStore.subscribe() in a useEffect to update its
//      textContent whenever theme changes — without React.
//      This demonstrates state access outside the component tree.
//
// CHECK YOURSELF:
//   How is useSettingsStore.getState() different from useSettingsStore()?
//   When would you reach for .getState() instead of the hook?
// ─────────────────────────────────────────────────────────────

// TODO: implement with persist middleware
const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      // setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'tutorial-settings', // localStorage key
      // partialize: (state) => ({ theme: state.theme }),
    }
  )
);

import { useEffect, useRef as useRefAlias } from 'react';

function ThemeSwitcher() {
  // TODO: get theme and setTheme from useSettingsStore
  const theme    = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <div style={{ ...card, background: theme === 'dark' ? '#1e293b' : 'white', color: theme === 'dark' ? '#f1f5f9' : '#111' }}>
      <span>Theme: <strong>{theme}</strong></span>
      <button
        onClick={() => setTheme?.(theme === 'light' ? 'dark' : 'light')}
        style={{ marginLeft: 8 }}
      >
        Toggle
      </button>
      <div style={{ fontSize: 11, marginTop: 4, color: theme === 'dark' ? '#94a3b8' : '#6b7280' }}>
        Refresh the page — your preference should persist in localStorage.
      </div>
    </div>
  );
}

// Subscribes to the store OUTSIDE React — updates a DOM element directly
function OutsideReactSync() {
  const divRef = useRefAlias(null);

  useEffect(() => {
    // TODO: subscribe to useSettingsStore and update divRef.current.textContent
    const unsub = useSettingsStore.subscribe((state) => {
      if (divRef.current) {
        // TODO: set divRef.current.textContent = `Outside React: theme is ${state.theme}`
      }
    });
    return unsub; // cleanup on unmount
  }, []);

  return (
    <div style={{ ...card, borderColor: '#a78bfa', fontFamily: 'monospace', fontSize: 12 }}>
      <div ref={divRef} style={{ color: '#7c3aed' }}>
        Outside React sync — implement the subscribe() in useEffect above
      </div>
    </div>
  );
}

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Implement the persist store. Toggle the theme and refresh — it should
        persist. The "outside React" div should update without React re-rendering.
      </p>
      <ThemeSwitcher />
      <OutsideReactSync />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a shopping cart store:
//   State: { items: [], discount: 0 }
//   Actions: addItem(item), removeItem(id), setDiscount(pct)
//   Derived (outside React): getTotal() using store.getState()
//   Middleware: devtools + persist (persist items and discount)
// Note: combine devtools + persist using the nested pattern:
//   create(devtools(persist(...)))
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
      Build a cart store with devtools + persist middleware (nested).
      Add a <code>getTotal()</code> function that reads state outside React
      using <code>useCartStore.getState()</code>.
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
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Zustand</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install zustand</code>
      </p>

      <h2 style={h2}>Exercise 1 — Basic store: create, selectors, render granularity</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — shallow equality: diagnose and fix object selector re-renders</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — persist middleware + outside-React state access</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
