// ============================================================
// Topic:   useSyncExternalStore
// Phase:   2 — Hooks
// ============================================================
//
// The problem it solves:
//   In concurrent React, the UI can render at multiple priorities.
//   If you subscribe to an external store with useEffect+useState,
//   different parts of the tree might read DIFFERENT store snapshots
//   during the same render — "tearing".
//   useSyncExternalStore gives React a contract that prevents this.
//
// API:
//   useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
//     subscribe(onStoreChange) → returns unsubscribe fn
//     getSnapshot()  → returns CURRENT value (must be synchronous)
//     getServerSnapshot() → optional, for SSR
// ============================================================

import { useSyncExternalStore, useState } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Subscribe to the browser's online/offline status.
//
// Build a useOnlineStatus() hook using useSyncExternalStore.
// The hook must:
//   - subscribe to 'online' and 'offline' window events
//   - return a boolean: true if online, false if offline
//
// Steps:
//   1. Implement the subscribe function: registers listeners and
//      returns a cleanup function.
//   2. Implement getSnapshot: returns navigator.onLine synchronously.
//   3. Return useSyncExternalStore(subscribe, getSnapshot).
//   4. Test by going offline (DevTools → Network → Offline).
//
// Note: the subscribe callback MUST be called every time the store
//       changes — React uses it to know when to re-render.

function useOnlineStatus() {
  // TODO: implement subscribe
  // const subscribe = (onStoreChange) => {
  //   window.addEventListener('online',  onStoreChange);
  //   window.addEventListener('offline', onStoreChange);
  //   return () => {
  //     window.removeEventListener('online',  onStoreChange);
  //     window.removeEventListener('offline', onStoreChange);
  //   };
  // };

  // TODO: implement getSnapshot
  // const getSnapshot = () => navigator.onLine;

  // TODO: return useSyncExternalStore(subscribe, getSnapshot);
  return true; // stub
}

function Exercise1() {
  const isOnline = useOnlineStatus();

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 16, margin: 0 }}>
        Status:{' '}
        <span style={{ color: isOnline ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </span>
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        DevTools → Network → Offline to test. Should update instantly.
      </p>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Subscribe to window width — a browser value that isn't React state.
//
// Build a useWindowWidth() hook that returns the current window width
// and updates when the window is resized.
//
// Steps:
//   1. subscribe: add a 'resize' listener, return cleanup.
//   2. getSnapshot: return window.innerWidth.
//   3. Use it in the component to build a responsive layout indicator.
//
// Bonus: derive a breakpoint from width: 'mobile' | 'tablet' | 'desktop'.
//        Show different content based on the breakpoint.

function useWindowWidth() {
  // TODO: implement using useSyncExternalStore
  return typeof window !== 'undefined' ? window.innerWidth : 0; // stub
}

function Exercise2() {
  const width = useWindowWidth();
  const breakpoint = width < 600 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 14, margin: 0 }}>
        Window width: <strong>{width}px</strong> →{' '}
        <span style={{
          background: breakpoint === 'mobile' ? '#e3f2fd' : breakpoint === 'tablet' ? '#fce4ec' : '#e8f5e9',
          padding: '2px 8px', borderRadius: 10, fontSize: 12,
        }}>
          {breakpoint}
        </span>
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        Resize the browser window — the width updates in real time.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Build a minimal external store — the full pattern.
//
// This is how state management libraries (Zustand, Valtio, Jotai)
// integrate with React under the hood.
//
// The store below is a plain JavaScript object with:
//   state     — the current value
//   listeners — set of subscriber callbacks
//   subscribe — registers/unregisters a listener
//   setState  — updates state and notifies all listeners
//   getState  — returns current state synchronously
//
// Steps:
//   1. Implement createStore(initialState) — returns the store object.
//   2. Implement useStore(store, selector) hook using useSyncExternalStore.
//   3. The selector lets consumers pick only part of the state.
//   4. Wire up the UI (already written) to test it.
//
// Success: clicking increment / decrement / reset updates the counter.
//          Clicking toggle updates the theme — without any useState.

// TODO: implement createStore
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    // TODO: subscribe(listener) — add to set, return cleanup
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // TODO: getState() — return current state
    getState() {
      return state;
    },
    // TODO: setState(updater) — call updater(state), notify listeners
    setState(updater) {
      state = updater(state);
      listeners.forEach(l => l());
    },
  };
}

// Create a store with initial values
const appStore = createStore({ count: 0, theme: 'light' });

// TODO: implement useStore
function useStore(store, selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
  );
}

function CounterPanel() {
  // Subscribes only to `count` — not re-rendered when `theme` changes
  const count = useStore(appStore, state => state.count);

  return (
    <div style={{ padding: 8, background: '#e3f2fd', borderRadius: 4 }}>
      <p style={{ margin: 0, fontSize: 14 }}>Count: <strong>{count}</strong></p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => appStore.setState(s => ({ ...s, count: s.count + 1 }))}>+1</button>
        <button onClick={() => appStore.setState(s => ({ ...s, count: s.count - 1 }))}>−1</button>
        <button onClick={() => appStore.setState(s => ({ ...s, count: 0 }))}>Reset</button>
      </div>
    </div>
  );
}

function ThemePanel() {
  // Subscribes only to `theme` — not re-rendered when `count` changes
  const theme = useStore(appStore, state => state.theme);

  return (
    <div style={{
      padding: 8,
      background: theme === 'dark' ? '#333' : '#fff9c4',
      borderRadius: 4,
      border: '1px solid #ccc',
    }}>
      <p style={{ margin: 0, fontSize: 14, color: theme === 'dark' ? '#fff' : '#333' }}>
        Theme: <strong>{theme}</strong>
      </p>
      <button
        onClick={() => appStore.setState(s => ({
          ...s,
          theme: s.theme === 'light' ? 'dark' : 'light',
        }))}
        style={{ marginTop: 8 }}
      >
        Toggle theme
      </button>
    </div>
  );
}

function Exercise3() {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
        Both panels read from the same external store.
        Each only re-renders when ITS slice of state changes.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <CounterPanel />
        <ThemePanel />
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Why useEffect + useState is NOT enough (conceptual).
//
// The naive approach:
//   useEffect(() => {
//     const unsub = store.subscribe(() => setState(store.getState()));
//     return unsub;
//   }, []);
//
// Problem in concurrent React:
//   React may render with a "stale" snapshot (from before the effect
//   ran) and show old data — "tearing".
//
// useSyncExternalStore forces React to always use the LATEST snapshot
// during render, preventing inconsistency.
//
// Steps:
//   1. Read the comment above.
//   2. In the code below, try implementing useNaiveStore using
//      useEffect+useState.
//   3. In normal (non-concurrent) scenarios it works.
//   4. Write a comment: what scenario would cause tearing?

function useNaiveStore(store, selector) {
  const [value, setValue] = useState(() => selector(store.getState()));

  // TODO: implement with useEffect
  // useEffect(() => {
  //   return store.subscribe(() => setValue(selector(store.getState())));
  // }, [store, selector]);

  return value;
}

function Playground() {
  const countNaive = useNaiveStore(appStore, s => s.count);
  const countSafe  = useStore(appStore, s => s.count);

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13 }}>
        Naive (useEffect): <strong>{countNaive}</strong><br />
        Safe (useSyncExternalStore): <strong>{countSafe}</strong>
      </p>
      <button onClick={() => appStore.setState(s => ({ ...s, count: s.count + 1 }))}>
        Increment shared store
      </button>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        {/*
          TODO: explain in a comment:
          In what scenario (think: concurrent rendering with high/low priority
          updates) would `countNaive` show a different value than `countSafe`?
        */}
        In concurrent mode, the naive approach can tear — different components
        see different store snapshots during the same render pass.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>useSyncExternalStore</h1>

      <h2>Exercise 1 — Online / Offline Status</h2>
      <p style={styles.goal}>
        Implement useOnlineStatus with subscribe + getSnapshot.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Window Width</h2>
      <p style={styles.goal}>
        Subscribe to resize events; derive a responsive breakpoint.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Custom External Store</h2>
      <p style={styles.goal}>
        Build createStore + useStore — the pattern behind Zustand/Redux.
      </p>
      <Exercise3 />

      <h2>Playground — Naive vs Safe Store Subscription</h2>
      <Playground />
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ddd', borderRadius: 6,
    padding: '0.75rem 1rem', marginBottom: '0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
