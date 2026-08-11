# useSyncExternalStore

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useSyncExternalStore | Hook for safely subscribing to external stores | Prevents tearing in concurrent rendering |
| Tearing | Different parts of the UI reading different store snapshots | Causes visual inconsistency during concurrent renders |
| subscribe | Registers a listener called when the store changes | Must synchronously call the provided callback |
| getSnapshot | Returns the current store value synchronously | Must be a pure, synchronous read |
| getServerSnapshot | Optional snapshot for SSR | Required when the server value differs from the client |

## What Is This?

`useSyncExternalStore` is a React hook for subscribing to external data sources in a way that's safe for concurrent rendering. It provides a contract between React and any non-React state management system, ensuring consistent reads during render.

```javascript
const state = useSyncExternalStore(
  store.subscribe,      // How to listen for changes
  store.getSnapshot,    // How to read the current value (client)
  store.getServerSnapshot // How to read the current value (server, optional)
);
```

"External store" means any state that lives outside React: Redux, Zustand, MobX, browser APIs (`navigator.onLine`, `window.innerWidth`), or your own custom store.

> **Check yourself:** What counts as an "external store"? Is `useState` an external store? Is localStorage?

## Why Does It Exist?

### The Tearing Problem

In concurrent rendering (React 18+), React can pause a render in the middle and resume it later. If an external store changes between the pause and resume, different parts of the UI may read different snapshots of the store — this is called **tearing**.

```
Timeline:
1. React starts rendering component A → reads store.value = "red"
2. React pauses (user typed something urgent)
3. Store updates: store.value = "blue"
4. React resumes rendering component B → reads store.value = "blue"
5. Result: A shows "red", B shows "blue" → inconsistent UI (tearing!)
```

Before `useSyncExternalStore`, developers used `useEffect` + `useState` to subscribe to stores:

```javascript
// ❌ Pre-React 18 pattern — can tear in concurrent mode
function useStore(store) {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(store.getState());
    });
    return unsubscribe;
  }, [store]);

  return state;
}
```

This pattern has two problems in concurrent mode:
1. **Tearing**: The render reads a stale `state` value while the store has already updated.
2. **Missed updates**: Between the render and the effect setup, the store may have changed.

`useSyncExternalStore` solves both by reading the snapshot *synchronously during render* and re-rendering synchronously when the store changes.

> **Check yourself:** Why does `useEffect` + `useState` fail to prevent tearing? At what point in the render cycle does the problem occur?

## How It Works

### The API

```javascript
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

**`subscribe(callback)`**: Register a listener. React calls this function with a callback. You must call that callback whenever the store changes. Return an unsubscribe function.

**`getSnapshot()`**: Return the current store value. Must be synchronous. Must return the same value if nothing changed (referential equality for objects).

**`getServerSnapshot()`** (optional): Return the store value for server rendering. Required when the store has no value on the server (like `window.innerWidth`).

### Building a Custom Store

```javascript
// A simple external store
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState: (newState) => {
      state = typeof newState === 'function' ? newState(state) : newState;
      listeners.forEach(listener => listener()); // Notify all listeners
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener); // Return unsubscribe
    },
  };
}

const counterStore = createStore({ count: 0 });

// React hook
function useCounterStore() {
  return useSyncExternalStore(
    counterStore.subscribe,
    counterStore.getState
  );
}

// Component
function Counter() {
  const { count } = useCounterStore();
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterStore.setState(s => ({ count: s.count + 1 }))}>
        Increment
      </button>
    </div>
  );
}
```

### With a Selector

For large stores, you often want to select a subset:

```javascript
function useStoreSelector(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getServerState?.() ?? store.getState())
  );
}

// Only re-renders when the selected value changes
function UserName() {
  const name = useStoreSelector(state => state.user.name);
  return <span>{name}</span>;
}
```

> **Check yourself:** If `getSnapshot` returns a new object on every call (even with the same data), what happens? Does the component re-render infinitely?

## Common Use Cases

### 1. Browser APIs

```javascript
// Subscribe to online/offline status
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
    () => true // Server assumes online
  );
}

function StatusBar() {
  const isOnline = useOnlineStatus();
  return <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>;
}
```

### 2. Window Dimensions

```javascript
function useWindowWidth() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    () => window.innerWidth,
    () => 1024 // Server default
  );
}
```

### 3. Media Queries

```javascript
function useMediaQuery(query) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false // Server can't evaluate media queries
  );
}

function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return <div>{isMobile ? <MobileLayout /> : <DesktopLayout />}</div>;
}
```

### 4. Third-Party State Libraries

Libraries like Redux, Zustand, and Jotai use `useSyncExternalStore` internally:

```javascript
// Simplified Redux useSelector implementation
function useSelector(selector) {
  const store = useContext(ReduxContext);
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
}
```

### 5. localStorage with Cross-Tab Sync

```javascript
function useLocalStorage(key, initialValue) {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
    () => {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    },
    () => initialValue
  );
}
```

## The Subscribe Contract

The `subscribe` function has strict requirements:

```javascript
function subscribe(callback) {
  // 1. Register the callback to be called when the store changes
  store.on('change', callback);

  // 2. MUST return an unsubscribe function
  return () => store.off('change', callback);
}
```

Rules:
- **Must call the callback synchronously** when the store changes
- **Must return an unsubscribe function**
- **Must not call the callback during subscribe** (that would trigger a re-render during render)

### The getSnapshot Contract

```javascript
function getSnapshot() {
  // MUST be synchronous
  // MUST return the same value (===) if nothing changed
  return store.getState();
}
```

Rules:
- **Must be synchronous** — no async, no promises
- **Must return the same reference** if the data hasn't changed (for objects). Otherwise, React re-renders infinitely.

```javascript
// ❌ Creates a new object every call → infinite re-renders
function getSnapshot() {
  return { count: store.count }; // New object every time!
}

// ✅ Returns the stored object directly
function getSnapshot() {
  return store.state; // Same reference when nothing changed
}
```

## Gotchas

### 1. getSnapshot must return a stable reference

```javascript
// ❌ Infinite re-render: new object on every call
const value = useSyncExternalStore(
  subscribe,
  () => ({ count: externalCount }) // New object each time!
);

// ✅ Return the same reference when data hasn't changed
const value = useSyncExternalStore(
  subscribe,
  () => store.getState() // Returns the stored object
);
```

### 2. getServerSnapshot is required for SSR

```javascript
// ❌ Crashes on server: window is undefined
const width = useSyncExternalStore(
  subscribe,
  () => window.innerWidth
  // No server snapshot!
);

// ✅ Provide a server default
const width = useSyncExternalStore(
  subscribe,
  () => window.innerWidth,
  () => 1024 // Server default
);
```

### 3. subscribe must be stable

```javascript
// ❌ New subscribe function every render → subscribe/unsubscribe loop
function Component() {
  const value = useSyncExternalStore(
    (cb) => { // Inline function = new reference each render
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    },
    () => window.innerWidth
  );
}

// ✅ Stable subscribe function (defined outside component or memoized)
const subscribe = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

function Component() {
  const width = useSyncExternalStore(subscribe, () => window.innerWidth);
}
```

### 4. Don't put side effects in getSnapshot

```javascript
// ❌ Side effect in getSnapshot
function getSnapshot() {
  localStorage.setItem('lastRead', Date.now()); // Side effect!
  return store.getState();
}
```

`getSnapshot` may be called multiple times during a single render. Keep it pure.

### 5. This hook is primarily for library authors

Most application developers won't use `useSyncExternalStore` directly. Libraries like Redux, Zustand, and React Query use it internally. You'd use it when building your own external store or subscribing to browser APIs.

## Interview Questions

**Q (High): What is "tearing" in concurrent React?**

Answer: Tearing occurs when different parts of the UI render with different snapshots of external state. In concurrent mode, React can pause and resume renders. If an external store changes between pause and resume, components rendered before the pause see the old value, while components rendered after see the new value — an inconsistent UI.

`useSyncExternalStore` prevents tearing by ensuring React reads the store snapshot synchronously and re-renders synchronously when the store changes.

The trap: Saying tearing is about "slow renders" or "race conditions." It's specifically about concurrent rendering reading inconsistent state.

---

**Q (High): Why use `useSyncExternalStore` instead of `useEffect` + `useState` for store subscriptions?**

Answer: The `useEffect` + `useState` pattern can tear in concurrent mode because:
1. There's a gap between reading the initial state (during render) and subscribing (in the effect). Updates during this gap are missed.
2. In concurrent mode, the state read during render may become stale by the time React commits.

`useSyncExternalStore` solves both by synchronously reading the snapshot during render and forcing synchronous re-renders on store changes.

The trap: Saying `useEffect` + `useState` is "just slower." It's not about speed — it's about consistency.

---

**Q (Medium): What are the required arguments to `useSyncExternalStore`?**

Answer: `subscribe` (registers a listener, returns unsubscribe) and `getSnapshot` (returns current store value synchronously). `getServerSnapshot` is optional but required for SSR when the store value differs between server and client.

The trap: Forgetting `getServerSnapshot` when using SSR and getting hydration crashes.

---

**Q (Medium): What must `getSnapshot` guarantee?**

Answer: It must be synchronous, pure (no side effects), and return the *same reference* if the data hasn't changed. If it returns a new object on every call (even with identical contents), React sees "different" data and re-renders infinitely.

The trap: Creating a new object in `getSnapshot` on every call (`() => ({ count: store.count })`) and causing infinite re-renders.

---

**Q (Low): Give an example of using `useSyncExternalStore` with a browser API.**

Answer: Subscribing to online/offline status:

```javascript
const isOnline = useSyncExternalStore(
  (cb) => {
    window.addEventListener('online', cb);
    window.addEventListener('offline', cb);
    return () => {
      window.removeEventListener('online', cb);
      window.removeEventListener('offline', cb);
    };
  },
  () => navigator.onLine,
  () => true
);
```

The pattern works for any browser API: `resize`, `matchMedia`, `storage`, `visibilitychange`, etc.

The trap: Not providing a server snapshot for browser APIs, which don't exist on the server.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can define tearing and explain why it is a problem in concurrent rendering
- [ ] Can write a minimal `useSyncExternalStore` usage from memory including all three arguments
- [ ] Can explain what `subscribe` must do when the store changes
- [ ] Can name when `getServerSnapshot` is required and what happens without it
- [ ] Can explain why `getSnapshot` must be synchronous and return stable references

---

*Next: [useDebugValue](../15-use-debug-value/notes.md) — add meaningful labels for custom hooks in DevTools.*
