# useSyncExternalStore

## What Is This?

`useSyncExternalStore` is a hook for subscribing to external state stores — data that lives outside of React's state system. It provides a safe, tear-free way to read from and react to external data sources (Redux store, Zustand store, browser APIs like `localStorage`, `window.matchMedia`, custom event emitters).

```javascript
const snapshot = useSyncExternalStore(
  subscribe,      // Function to subscribe to the store
  getSnapshot,    // Function to read the current value
  getServerSnapshot // Optional: what to return during SSR
);
```

## Why Does It Exist?

Before concurrent React, reading from external stores was simple: subscribe in `useEffect`, store the value in `useState`, done. This worked because React rendered synchronously — once it started a render, it finished without interruption.

Concurrent React breaks this assumption. React can now **pause a render partway through**, process something else, and resume. This creates a window where different parts of the same render might read the store at different points in time — and if the store changes during that window, some components see the old value and some see the new one. This is called **tearing**: the UI is visually inconsistent, showing data from two different store states simultaneously.

```
// Simplified tearing scenario
// Store has value: 1
Component A reads store: 1  ← renders with 1

// Store changes to 2 (externally, between React's work units)

Component B reads store: 2  ← renders with 2

// Result: A shows "1", B shows "2" — tearing!
```

`useSyncExternalStore` solves this by:
1. Reading the store synchronously during render
2. Detecting if the store changed between when different parts of the tree read it
3. If inconsistency is detected, forcing a synchronous re-render to restore consistency

The "sync" in the name is the key: despite React's concurrent internals, reads from external stores are *synchronized* — the entire tree sees the same snapshot.

## How It Works

### The Three Arguments

```javascript
const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

**`subscribe(callback)`**: A function that subscribes to the store. React calls it once with a callback. Whenever the store changes, you call the callback. The function must return an unsubscribe function.

```javascript
function subscribe(onStoreChange) {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}
```

**`getSnapshot()`**: A function that returns the current value from the store. React calls this during render. Must return the same reference if nothing changed (referential stability matters for preventing unnecessary re-renders).

```javascript
function getSnapshot() {
  return navigator.onLine;
}
```

**`getServerSnapshot()`** (optional): What to return during SSR. The browser-specific APIs (like `navigator.onLine`) aren't available on the server, so you return a sensible default.

```javascript
function getServerSnapshot() {
  return true; // Assume online on server
}
```

### Putting It Together

```javascript
function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    () => true // SSR default
  );
}

function NetworkStatus() {
  const isOnline = useOnlineStatus();
  return <span>{isOnline ? 'Online' : 'Offline'}</span>;
}
```

## Subscribing to a Custom Store

Here's a minimal external store that works with `useSyncExternalStore`:

```javascript
// store.js — outside of React
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (newState) => {
      state = newState;
      listeners.forEach(listener => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const counterStore = createStore({ count: 0 });

// React component
function Counter() {
  const { count } = useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getState
  );

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => counterStore.setState({ count: count + 1 })}>+</button>
    </div>
  );
}
```

This is essentially what Zustand and Redux do internally.

## What Libraries Use This

After React 18, major state management libraries switched their internal subscription mechanism to `useSyncExternalStore`:

- **Redux** / Redux Toolkit: `useSelector` uses it
- **Zustand**: uses it for its store subscriptions  
- **Jotai**: uses it for atom subscriptions
- **MobX**: `observer` HOC uses it

Before React 18, these libraries had their own subscription logic with `useEffect` + `useState`, which was prone to tearing in concurrent mode. `useSyncExternalStore` is the blessed, tear-safe API.

## getSnapshot Must Return a Stable Reference

A critical constraint: if nothing in the store has changed, `getSnapshot` must return the same reference. React calls `getSnapshot` repeatedly and uses `Object.is` to compare results. If you return a new object every time even for the same data, React will loop re-rendering forever.

```javascript
// ❌ New array every call — infinite re-render loop
getSnapshot: () => store.items.filter(item => item.active)

// ✅ Compute derived data outside the snapshot, or cache it
let lastSnapshot = null;
let lastItems = null;

getSnapshot: () => {
  if (store.items === lastItems) return lastSnapshot;
  lastItems = store.items;
  lastSnapshot = store.items.filter(item => item.active);
  return lastSnapshot;
}
```

In practice, if you need to transform data from the store, do it in a `useMemo` after reading the raw snapshot:

```javascript
const rawItems = useSyncExternalStore(subscribe, () => store.items);
const activeItems = useMemo(() => rawItems.filter(i => i.active), [rawItems]);
```

## Gotchas

### 1. subscribe must be stable (or extracted outside the component)

```javascript
// ❌ New function every render — React re-subscribes every render
function Component() {
  const value = useSyncExternalStore(
    (cb) => store.subscribe(cb), // Inline arrow function — new every render
    () => store.getState()
  );
}

// ✅ Extract outside the component so it's stable
const subscribe = (cb) => store.subscribe(cb);
const getSnapshot = () => store.getState();

function Component() {
  const value = useSyncExternalStore(subscribe, getSnapshot);
}
```

### 2. getServerSnapshot is required if the snapshot reads browser APIs

If `getSnapshot` touches `window`, `navigator`, `localStorage`, or similar, it will fail on the server. Always provide `getServerSnapshot` when using browser APIs.

### 3. This is a low-level building block

Most applications don't call `useSyncExternalStore` directly — they use it through a library (Redux, Zustand). This hook is for authors of state management libraries or custom store integrations. If you're using Redux or Zustand, `useSyncExternalStore` is already being used under the hood.

## Interview Questions

**Q: What problem does `useSyncExternalStore` solve that `useEffect` + `useState` doesn't?**

Strong answer: In concurrent React, `useEffect` + `useState` subscriptions are vulnerable to **tearing** — a visual inconsistency where different components in the same render see different versions of the same external store. This happens because React can pause a concurrent render between work units, and if the external store changes during that pause, some components read the old value and some read the new one. `useSyncExternalStore` prevents this by synchronizing store reads: it detects when a read would be inconsistent and forces a synchronous re-render so the entire tree sees the same store snapshot. The "sync" in the name refers to this guarantee.

The trap: Not knowing tearing exists or thinking `useEffect` subscriptions are fine for concurrent React. They work in practice for many apps (concurrent features are opt-in), but library authors must use `useSyncExternalStore` to be safe.

---

**Q: You're building a hook that subscribes to `localStorage` changes. Why might `useEffect` + `useState` cause problems?**

Strong answer: Two issues. First, tearing in concurrent mode — covered above. Second, SSR: `localStorage` doesn't exist on the server, so `useEffect` + `useState` with a `window.localStorage` read would throw during SSR. `useSyncExternalStore` with a `getServerSnapshot` argument handles this cleanly: `getServerSnapshot` returns a safe default during server rendering, and `getSnapshot` reads from `localStorage` in the browser. The subscribe function listens to `storage` events for cross-tab updates. This is the recommended pattern for any browser-API-based subscription.

The trap: Only addressing the SSR issue and missing tearing. Or not knowing that `storage` events don't fire in the same tab that made the change (only cross-tab).

---

*Next: [useDebugValue](15-use-debug-value.md) — Adding labels to custom hooks so they show up usefully in React DevTools.*
