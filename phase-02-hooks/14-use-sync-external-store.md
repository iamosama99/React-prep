# useSyncExternalStore

## What Is This?
useSyncExternalStore is a hook for subscribing to external stores in a way that is compatible with concurrent rendering. It addresses consistency issues when React renders at multiple priorities or resumes renders later.

## Why Does It Exist?
Before this hook, developers used useEffect plus useState to subscribe to store updates. That pattern can tear in concurrent rendering because React may render with stale values, skip updates, or replay renders incorrectly. useSyncExternalStore provides a safe contract for reading and subscribing.

## How It Works
The API looks like this:

```js
const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
```

- `subscribe` registers a callback to run when the store changes.
- `getSnapshot` returns the current store value for the client.
- `getServerSnapshot` is optional and used for server rendering.

Example store hook:

```js
function useStore(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getServerState())
  )
}
```

React uses the snapshot to determine whether it should re-render and to avoid tearing between render passes.

## Gotchas
- The subscribe callback should synchronously call the provided listener when the store changes.
- The snapshot must be read synchronously during render.
- getServerSnapshot is required for SSR if the store value differs between server and client.
- avoid side effects inside the subscribe or snapshot functions.

## Interview Questions
**Q (Medium): Why use useSyncExternalStore instead of useEffect and useState for a store subscription?**
Answer: because useSyncExternalStore is designed to avoid tearing and inconsistent renders in concurrent mode. It gives React a consistent way to read external values during render and subscribe to changes safely.
The trap: saying it is only for performance or only for Redux.

**Q (Low): What are the required arguments to useSyncExternalStore?**
Answer: `subscribe` and `getSnapshot` are required; `getServerSnapshot` is optional but needed for SSR when the server snapshot differs from the client.
The trap: forgetting `getServerSnapshot` when using SSR.

---
*Next: useDebugValue — add meaningful labels for custom hooks in DevTools.*
