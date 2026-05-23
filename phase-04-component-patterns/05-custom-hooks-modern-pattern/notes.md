# Custom Hooks as the Modern Pattern

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Custom hook | A `use*` function that calls other hooks | The unit of reusable stateful logic — no tree noise, no prop injection |
| Single responsibility | One hook, one job | Keeps hooks composable and independently testable |
| Tuple vs object return | Array `[value, setter]` vs `{ value, setter, ... }` | Tuples allow renaming; objects scale better as returns grow |
| Referential stability | Wrapping returned functions in `useCallback` | Prevents infinite loops when callers put returns in dependency arrays |
| `enabled` option | A flag to conditionally skip side effects | Workaround for Rules of Hooks; avoids putting hooks in conditionals |

## What Is This?

A custom hook is a JavaScript function whose name starts with `use` and which calls other hooks inside it. That's the entire definition. There's no special React API for them — the naming convention is what lets the linter enforce hook rules on them.

```jsx
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
  return size;
}

// Usage in any component
function Layout() {
  const { width } = useWindowSize();
  return width > 768 ? <DesktopLayout /> : <MobileLayout />;
}
```

This is the same logic that previously required a render prop or HOC — now it's a function you call.

## Why It Supersedes Render Props and HOCs

All three patterns solve the same problem: **sharing stateful logic between components**. The question is which mechanism is least painful.

### What render props required:
- A component wrapper in the tree (extra DOM or virtual node)
- JSX to express what used to be a function call
- Nesting for multiple behaviors (callback hell)
- The logic and the rendering to be co-located conceptually

### What HOCs required:
- Defining enhanced components at module level
- Prop injection (with collision risks)
- `forwardRef` handling for refs
- `displayName` for DevTools
- `hoist-non-react-statics` for static methods

### What custom hooks require:
- Name it `use*`
- Call it inside a component or another hook

No tree noise. No prop injection. No ref forwarding. No static method hoisting. The logic is local to the component that uses it, and composing multiple behaviors is just calling multiple hooks in sequence.

> **Check yourself:** List all the boilerplate a correctly implemented HOC requires that a custom hook does not. Can you name at least four?

## Design Principles for Good Custom Hooks

### 1. Single responsibility

A hook should have one job. `useUserData` fetches users. `useSearch` manages search state. Don't let hooks grow into multi-concern utilities.

```jsx
// Too broad
function useUserPage() {
  // fetches user, manages tabs, handles form, tracks analytics
}

// Focused
function useUser(id) { ... }
function useTabState(tabs) { ... }
function useAnalytics(event) { ... }
```

### 2. Return the right shape

Return an object when you have multiple values with distinct names. Return a tuple `[value, setter]` only when you're following `useState`'s convention — typically for single stateful values:

```jsx
// Object return — named, clear, order doesn't matter
function useUser(id) {
  return { user, loading, error, refetch };
}

// Tuple return — when it's a value/setter pair like useState
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(v => !v), []);
  return [on, toggle]; // consumer can name these anything
}
```

Object returns scale better — adding a new return value doesn't require callers to update destructuring order.

### 3. Pass options, not implementation details

A hook's API should be caller-facing, not implementation-facing:

```jsx
// Bad — leaks implementation details
function useFetch(url, abortControllerRef, cacheKey) { ... }

// Good — clean options object
function useFetch(url, { enabled = true, staleTime = 0 } = {}) { ... }
```

### 4. Make side effects controllable

If the hook has a side effect (fetch, subscription, timer), expose a way to control when it runs:

```jsx
function useFetch(url, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, [url, enabled]);
  
  return data;
}

// Can now delay fetching until some condition is met
const data = useFetch('/api/user', { enabled: !!userId });
```

### 5. Preserve referential stability where it matters

If your hook returns functions, wrap them in `useCallback`. If it returns derived objects, wrap them in `useMemo`. Callers who put your hook's return values in dependency arrays will get infinite loops otherwise.

```jsx
function useUser(id) {
  const [user, setUser] = useState(null);
  
  const refetch = useCallback(() => {
    fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
  }, [id]);
  
  return { user, refetch }; // refetch is stable across renders for same id
}
```

## Hooks as the Unit of Abstraction

The shift with hooks isn't just "render props but shorter." It's a change in what the unit of abstraction *is*.

Before hooks, the component was the smallest unit of logic. You couldn't extract stateful logic without extracting a component. This meant every piece of reusable behavior added at least one component to your tree.

With hooks, **the hook is the unit of logic**. Components become the unit of rendering. Logic and rendering are separated cleanly. You can have dozens of hooks that contribute to a single component's behavior without adding anything to the component tree.

This has second-order effects: testing is cleaner (test the hook with `renderHook`, test the component separately), TypeScript is cleaner (no generic inference chains through HOCs), and mental models are simpler (the component just lists its dependencies at the top).

> **Check yourself:** If two different components both call `useWindowSize`, do they share a single state instance or have two independent ones? What does this mean for when you need Context?

## When Custom Hooks Are *Not* the Right Tool

Custom hooks aren't free:

- **They can't conditionally be called.** Rules of Hooks apply. You can work around this with `enabled` options, but you can't conditionally skip a hook call.
- **They add indirection.** A hook called `useData` in a component — what does it fetch? You have to navigate to find out. Too many abstractions, and the component becomes hard to read.
- **They share state instances only through composition, not reference.** Two components both calling `useWindowSize` get two separate subscriptions, not shared state. If you want shared state, you need Context or an external store.
- **They're not for rendering.** If you find yourself returning JSX from a hook, stop. That's a component.

## Practical Example: A Full Production-Quality Hook

```jsx
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`useLocalStorage: could not save key "${key}"`, error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setValue];
}
```

This handles lazy initialization (reads localStorage only once via the initializer function), gracefully catches storage errors (SSR, incognito mode quota), supports functional updates like `useState`, and exposes a familiar `[value, setter]` API.

## Interview Questions



**Q (High): What problem do custom hooks solve, and how do they compare to HOCs and render props?**

Answer: All three share stateful logic between components. HOCs inject props from outside, adding wrapper components to the tree and risking prop name collisions. Render props invert control, delegating rendering back to the caller through a callback, but create pyramid nesting when multiple behaviors are combined. Custom hooks extract logic into a reusable function that components call directly — the logic is local, there's no extra tree depth, no prop injection, and composing multiple behaviors is just calling multiple hooks. Hooks also compose naturally with TypeScript, since a hook is just a function with a straightforward return type.

The trap: Saying "hooks are better, period." The correct answer acknowledges that HOCs still serve specific use cases (error boundaries, third-party component wrapping) and that the choice depends on what you're sharing (logic → hook, rendering → render prop or compound component).

---



**Q (High): When should a custom hook return an array vs an object?**

Answer: Return a tuple (array) when you're following the `useState` convention for a simple value/setter pair — this lets callers alias the names freely. Return an object when you have multiple distinct values because order is meaningless and you can add new return values without breaking callers. As a rule of thumb: if the hook has two returns and they're clearly "the data" and "the action," use a tuple. If there are three or more or the semantics are richer, use an object.

The trap: Always returning tuples. It works but breaks as the hook grows — callers must update every destructuring when you add a return value.

---



**Q (High): Two components both call `useWindowSize`. Do they share state?**

Answer: No. Each call creates an independent state and effect. Both components set up their own resize event listeners and their own `useState`. They'll have the same *value* after resizing (since they read from the same window), but they're not sharing a single state instance. If you want truly shared state, you'd use Context, a singleton subscription (like `useSyncExternalStore`), or an external state manager. This is a fundamental characteristic of hooks: they provide per-call-site isolation.

The trap: Assuming hooks are singletons. They're not — they're per component instance. This distinction matters when you're deciding whether to use Context or a hook.


---

**Q (Medium): What are the signs that a custom hook is poorly designed?**

Answer: A few red flags: it returns JSX (that should be a component); it takes too many parameters that are implementation details rather than caller-facing options; it handles multiple unrelated concerns (fetching, analytics, tab management) in one hook; it returns functions without `useCallback`, causing unnecessary re-renders in callers who put those functions in dependency arrays; it doesn't expose an `enabled` or similar option, forcing callers to put it inside conditional logic which violates the Rules of Hooks.

The trap: Only citing the Rules of Hooks as the design constraint. Good hook design goes well beyond that.

---



**Q (Medium): How do you test a custom hook?**

Answer: Use `renderHook` from `@testing-library/react`. It renders the hook in an isolated test component and returns `result.current` as the hook's return value. You can call returned functions inside `act()` to trigger state updates. This lets you test the hook's behavior completely independently of any UI. For hooks that use Context, wrap the `renderHook` call in a `wrapper` that provides the context. For hooks with async behavior, combine `waitFor` with assertions on `result.current`.

The trap: "Just test it through the component that uses it." That couples the hook tests to the component's rendering. Testing hooks in isolation gives better error messages and is faster.
---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the full definition of a custom hook and why the `use*` naming matters
- [ ] Can state the five design principles for good custom hooks and give a one-line description of each
- [ ] Can explain when to return a tuple vs an object, and why object returns scale better
- [ ] Can explain why two components calling the same hook do not share state, and what to use instead when shared state is needed
- [ ] Can write the `useLocalStorage` hook's lazy initializer pattern and explain why it's needed

---
*Next: Controlled vs Uncontrolled Component Design — the pattern (from Phase 1's input discussion) elevated to a full component design principle, covering how to build library-quality components that support both modes.*
