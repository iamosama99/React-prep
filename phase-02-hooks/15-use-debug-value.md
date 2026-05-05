# useDebugValue

## What Is This?

`useDebugValue` is a hook that adds a label or value to a custom hook in React DevTools. When you inspect a component using a custom hook, DevTools shows the debug value next to the hook's name, making it much easier to see what the hook is doing at a glance.

```javascript
function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot);
  useDebugValue(isOnline ? 'Online' : 'Offline'); // Shows in DevTools
  return isOnline;
}
```

In React DevTools, when you inspect a component using `useOnlineStatus`, you'll see:

```
▼ OnlineStatus Component
  ▼ useOnlineStatus: "Online"
    isOnline: true
```

Without `useDebugValue`, you'd just see the raw hook state without the context label.

## Why Does It Exist?

Custom hooks compose other hooks, which can make them hard to inspect in DevTools. When a component uses `useAuth`, DevTools shows the internals: `useState`, `useEffect`, etc. — but you have to mentally reconstruct what `useAuth` is doing from those raw pieces. `useDebugValue` lets the hook author surface a meaningful summary.

This is a developer experience tool. It has zero impact on production behavior.

## How It Works

```javascript
useDebugValue(value);
// or with a formatter:
useDebugValue(value, formatFn);
```

React reads the value and displays it in DevTools next to the hook's name. In production builds, `useDebugValue` is a no-op — React strips it.

### The Formatter Function

If computing the debug value is expensive, use the optional second argument: a formatter function that's only called when DevTools is open.

```javascript
function useComplexHook(userId) {
  const [data, setData] = useState(null);

  // ❌ formatDate(data) runs on every render, even when DevTools is closed
  useDebugValue(formatDate(data?.createdAt));

  // ✅ formatDate only runs when DevTools is actually inspecting this hook
  useDebugValue(data, (d) => d ? formatDate(d.createdAt) : 'No data');
}
```

React passes the first argument to the formatter and uses the formatter's return value as the display value. The formatter is lazy — it runs only when DevTools requests the debug value.

## Practical Examples

### Authentication State

```javascript
function useAuth() {
  const { user, loading } = useContext(AuthContext);

  useDebugValue(
    { user, loading },
    ({ user, loading }) =>
      loading ? 'Loading...' : user ? `Authenticated: ${user.email}` : 'Not authenticated'
  );

  return { user, loading };
}
```

### Data Fetching

```javascript
function useFetch(url) {
  const [state, dispatch] = useReducer(fetchReducer, initialState);

  useDebugValue(state.status);
  // Shows: useFetch: "loading" / "success" / "error"

  // ... fetch logic
  return state;
}
```

### Feature Flag

```javascript
function useFeatureFlag(flagName) {
  const flags = useContext(FeatureFlagContext);
  const isEnabled = flags[flagName] ?? false;

  useDebugValue(`${flagName}: ${isEnabled ? 'enabled' : 'disabled'}`);

  return isEnabled;
}
```

## When to Use It

Only in **custom hooks** — not regular components. Calling `useDebugValue` in a component body doesn't do anything useful; DevTools already shows component state and props directly.

It's most valuable in:
- Library hooks that other teams will use (they can't see your internals)
- Complex hooks with non-obvious state (async status machines, auth states)
- Hooks in large codebases where debugging common hooks saves time

For simple hooks, it's usually not worth it:

```javascript
// Not worth it — the state is already obvious
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  useDebugValue(value); // Doesn't add much — DevTools shows useState already
  return [value, setValue];
}
```

## Gotchas

### 1. No-op in production

`useDebugValue` is removed from production builds. Never use it to pass data, trigger effects, or do anything meaningful — it's purely a DevTools annotation.

### 2. Only works in custom hooks

`useDebugValue` is designed to label custom hooks. If you call it inside a component (not a custom hook), React may display it, but there's no semantic meaning to the label placement.

### 3. The formatter argument is the lazy evaluation escape hatch

The common mistake is computing an expensive formatted string directly as the first argument:

```javascript
// ❌ formatLargeDataStructure runs every render
useDebugValue(formatLargeDataStructure(data));

// ✅ Only runs when DevTools is open
useDebugValue(data, formatLargeDataStructure);
```

If your format computation is cheap (a string template, a ternary), the first form is fine. For anything nontrivial, use the formatter.

## Interview Questions

**Q: What is `useDebugValue` for, and when should you use it?**

Strong answer: It's a DevTools annotation for custom hooks — it attaches a label or formatted value to the hook that appears in the React DevTools component inspector. It's for developer experience only: it helps the person debugging understand what a custom hook is doing without having to read its internals. The right time to add it is when you're authoring a custom hook that other developers will use (especially library authors), when the hook's internal state isn't immediately readable in DevTools without context, or when you're debugging complex hook state and want a summary. It has no effect in production builds.

The trap: Thinking it does anything in production, or using it in components rather than custom hooks.

---

**Q: What's the purpose of the second argument to `useDebugValue`?**

Strong answer: It's a lazy formatter — a function that's only called when React DevTools actually renders the debug value (i.e., when someone has the component inspector open). Without the formatter, the first argument is evaluated on every render, even when DevTools isn't open. For expensive transformations (serializing large objects, formatting complex dates), this is wasteful overhead for something that only matters during debugging. Passing `(value) => formatIt(value)` as the second argument ensures the formatting work only happens when it's actually needed.

The trap: Not knowing the second argument exists and inadvertently running expensive formatting on every render in development.

---

*Next: [Rules of Hooks](16-rules-of-hooks.md) — Why hooks can only be called at the top level and inside React functions, and what React is actually doing that makes these rules necessary.*
