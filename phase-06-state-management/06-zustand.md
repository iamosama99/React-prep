# Zustand

## The Pitch

Zustand is global state management with almost no API surface. There are no providers, no reducers, no action creators, no boilerplate. You define a store as a function, read it with a selector hook, and update it by calling functions you defined in the store. That's the entire model.

It's built by Daishi Kato (also Jotai, React Spring) on top of `useSyncExternalStore` — it subscribes to a plain JavaScript object stored outside the React tree, with selective re-renders via selector comparison.

---

## Creating a Store

```js
import { create } from 'zustand';

const useCounterStore = create((set, get) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
  getDoubled: () => get().count * 2, // read current state without subscribing
}));
```

`create` returns a hook. Call the hook with a selector in any component — no Provider needed:

```js
function Counter() {
  const count = useCounterStore(state => state.count);
  const increment = useCounterStore(state => state.increment);

  return <button onClick={increment}>{count}</button>;
}
```

The component re-renders only when `count` changes. A component that only selects `increment` never re-renders (functions don't change).

---

## How It Works

The store state lives in a closure outside React. `create` returns an enhanced hook backed by `useSyncExternalStore`. When you call the hook with a selector, Zustand subscribes the component to the store and runs the selector on every state change. If the selector's return value changes (by `Object.is`), the component re-renders. If not, it doesn't.

No provider means the store is module-level — a singleton. This is deliberate. For per-component or per-subtree state, use React's own `useState`/`useReducer`. Zustand is for state that truly needs to be global.

---

## Updating State

`set` merges by default — you only need to specify the properties that changed:

```js
const useUserStore = create(set => ({
  name: '',
  email: '',
  role: 'viewer',
  setName: (name) => set({ name }), // merges, doesn't replace entire state
  setRole: (role) => set({ role }),
}));
```

For nested state, you need to spread manually (Zustand doesn't use Immer by default):

```js
updateAddress: (city) => set(state => ({
  user: { ...state.user, address: { ...state.user.address, city } }
}))
```

Or enable the `immer` middleware for mutation syntax:

```js
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useUserStore = create(immer(set => ({
  user: { name: '', address: { city: '' } },
  updateCity: (city) => set(state => {
    state.user.address.city = city; // Immer draft — mutate freely
  }),
})));
```

---

## Middleware

Zustand has composable middleware. The most used ones:

**`persist`** — serializes state to localStorage (or any storage):

```js
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings', // localStorage key
      partialize: (state) => ({ theme: state.theme }), // only persist theme
    }
  )
);
```

**`devtools`** — connects to Redux DevTools:

```js
import { devtools } from 'zustand/middleware';

const useStore = create(devtools(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 }), false, 'increment'),
  //                                                                  ^^^^^^^^^^^
  //                                          action name shown in DevTools
})));
```

Compose middleware by nesting:

```js
const useStore = create(
  devtools(persist(immer((set) => ({
    // ...
  })), { name: 'my-store' }))
);
```

---

## Selecting Multiple Values

Selecting multiple values in a single call returns an object — which is a new reference every render. Use `shallow` to compare individual fields instead of the object reference:

```js
import { shallow } from 'zustand/shallow';

function UserProfile() {
  // Without shallow: re-renders on any store change (new object each time)
  const { name, email } = useUserStore(state => ({ name: state.name, email: state.email }));

  // With shallow: only re-renders when name or email changes
  const { name, email } = useUserStore(
    state => ({ name: state.name, email: state.email }),
    shallow
  );
}
```

Alternatively, select values in separate calls — each subscribes independently:

```js
const name = useUserStore(state => state.name);
const email = useUserStore(state => state.email);
```

---

## Reading State Outside Components

The store object returned by `create` has direct methods for accessing state outside the React tree:

```js
const useCounterStore = create(set => ({ count: 0, increment: () => set(...) }));

// Access state outside React (in services, utilities, event handlers)
const count = useCounterStore.getState().count;
useCounterStore.getState().increment();

// Subscribe to changes outside React
const unsub = useCounterStore.subscribe(state => {
  console.log('count changed to', state.count);
});
```

This is a significant advantage over Context — you can read and update state from anywhere, not just from within components.

---

## When Zustand vs Redux

**Zustand fits when:**
- You want global state without the Redux ceremony
- The team is small or the app is medium-scale
- You don't need time-travel debugging or complex middleware pipelines
- You want to read/write state outside React components easily

**Redux/RTK fits when:**
- The codebase is large with many contributors and state inspection matters
- You're building features that require time-travel debugging (undo/redo)
- You're adding data fetching with RTK Query (already in RTK)
- You need the serializable-action constraint enforced

Zustand isn't a Redux replacement for every project — it's the right tool for projects where Redux's constraints feel like overhead rather than guardrails.

---

## Interview Questions

**Q (High): How does Zustand avoid re-rendering components that don't care about the changed state?**

Answer: Every `useStore(selector)` call subscribes the component to the store via `useSyncExternalStore`. On every state change, Zustand runs the selector function and compares the result to the previous result using `Object.is`. If the result is the same, the component doesn't re-render. If it's different, it does. This is per-component, per-selector granularity — a component selecting only `state.count` doesn't re-render when `state.name` changes, because `count` is the same value. This is more granular than Context, which re-renders all subscribers on any change.

---

**Q (High): Zustand has no Provider. What are the implications?**

Answer: The store is a module-level singleton — it's created once when the module is imported. All components in the app share the same store instance. Implications: (1) No setup required in the tree; any component can import and use the store directly. (2) State persists for the lifetime of the JavaScript module, not the component tree — you need to reset it manually if needed. (3) It's harder to have independent instances of the same store (e.g., two independent counter widgets) — that scenario usually calls for component-level state instead. (4) Testing requires resetting or clearing the store between tests to avoid state leakage.

---

**Q (Medium): Why does selecting multiple values with an object return in Zustand cause unnecessary re-renders, and how do you fix it?**

Answer: When the selector returns `{ name: state.name, email: state.email }`, a new object is created on every call — even if `name` and `email` haven't changed. Zustand's default comparison is `Object.is`, which returns false for two different object references regardless of contents. Fix: pass `shallow` as the second argument to `useStore`. Shallow equality compares each property individually instead of comparing the container object reference. Alternatively, select each value in a separate `useStore` call — each one uses `Object.is` on a primitive, which only re-renders when that specific primitive changes.

---

**Q (Medium): How do you use Zustand state outside of React components?**

Answer: The return value of `create` is the hook, but it also has `getState()`, `setState()`, and `subscribe()` methods. `getState()` returns the current state snapshot synchronously. `setState()` updates state the same way `set` does inside the store. `subscribe()` lets you listen for state changes. This lets you read and update Zustand state from services, utilities, event handlers outside the React tree, or in non-component code — something that's not possible with Context or component-level state.

---

*Next: Jotai and Recoil — atom-based state management for granular, composable subscriptions.*
