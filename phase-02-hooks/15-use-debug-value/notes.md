# useDebugValue

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useDebugValue | Attaches a label to a custom hook in React DevTools | Makes opaque hooks inspectable during debugging |
| Formatter argument | Optional second argument that transforms the raw value | Avoids expensive formatting unless DevTools is open |
| DevTools only | Has zero effect on runtime behavior or renders | Safe to use in production; stripped in some builds |
| Must be in a hook | Cannot be called in plain components | Follows the rules of hooks |

## What Is This?

`useDebugValue` is a React hook that displays a label next to a custom hook in React DevTools. It doesn't affect runtime behavior, rendering, or state — it's purely a debugging aid.

```javascript
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useDebugValue(isOnline ? 'Online' : 'Offline');
  // In DevTools: "OnlineStatus: Online" or "OnlineStatus: Offline"

  // ... subscription logic

  return isOnline;
}
```

When you inspect a component using `useOnlineStatus` in DevTools, you'll see the label "Online" or "Offline" next to the hook, instead of just a raw boolean value.

> **Check yourself:** Does `useDebugValue` affect how a component renders or behaves? What happens if you remove all `useDebugValue` calls from your code?

## Why Does It Exist?

Custom hooks encapsulate reusable logic, but they can become opaque during debugging. When you look at a component in React DevTools, you see a list of hooks. For built-in hooks (`useState`, `useEffect`), DevTools shows useful information. But for custom hooks, the internal state may not be obvious.

### Without useDebugValue

```
Component
  └── useAuth
      ├── useState: { user: {...}, token: "abc..." }
      ├── useState: false
      └── useEffect
```

What does `useState: false` mean? Is the user logged in? Is the token valid? Is loading complete?

### With useDebugValue

```
Component
  └── useAuth: "Authenticated as alice@example.com"
      ├── useState: { user: {...}, token: "abc..." }
      ├── useState: false
      └── useEffect
```

Now the hook's state is immediately understandable.

## How It Works

### Basic Usage

Call `useDebugValue` inside a custom hook with the value you want to display:

```javascript
function useFormField(initialValue) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  useDebugValue(
    error ? `Error: ${error}` : touched ? `Value: ${value}` : 'Untouched'
  );

  return { value, setValue, error, setError, touched, setTouched };
}
```

### The Formatter Function

The optional second argument is a formatter function. React only calls it when the hook is actually inspected in DevTools:

```javascript
function useUser(userId) {
  const [user, setUser] = useState(null);

  // ❌ Formatting runs on every render (even without DevTools open)
  useDebugValue(user ? `${user.name} (${user.email})` : 'Loading...');

  // ✅ Formatter only runs when DevTools inspects this hook
  useDebugValue(user, (user) => user ? `${user.name} (${user.email})` : 'Loading...');

  return user;
}
```

The formatter pattern is important when the formatting is expensive (e.g., serializing a large object). Without a formatter, the debug label is computed on every render, which wastes CPU when DevTools isn't open.

> **Check yourself:** When does the formatter function actually execute — on every render, or only when DevTools inspects the component?

### What DevTools Shows

```javascript
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useDebugValue(size, s => `${s.width}×${s.height}`);

  useEffect(() => {
    const handler = () => setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}

// In DevTools:
// Component
//   └── useWindowSize: "1920×1080"
```

## Common Use Cases

### 1. Authentication Status

```javascript
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useDebugValue(
    loading ? 'Loading...' : user ? `Logged in as ${user.name}` : 'Not authenticated'
  );

  // ... auth logic

  return { user, loading };
}
```

### 2. Data Fetching State

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useDebugValue({ url, loading, error: error?.message }, (info) =>
    info.loading ? `Loading ${info.url}` :
    info.error ? `Error: ${info.error}` :
    `Loaded ${info.url}`
  );

  // ... fetch logic

  return { data, error, loading };
}
```

### 3. Feature Flags

```javascript
function useFeatureFlag(flagName) {
  const [enabled, setEnabled] = useState(false);

  useDebugValue(`${flagName}: ${enabled ? 'ON' : 'OFF'}`);

  // ... flag check logic

  return enabled;
}
```

### 4. Subscription Hooks

```javascript
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useDebugValue(`${query}: ${matches ? 'matches' : 'no match'}`);

  // ... matchMedia logic

  return matches;
}
```

## When to Use (and When to Skip)

### ✅ Use when:
- Building shared custom hooks used by many developers (hook libraries, design systems)
- The hook's internal state is not obvious from its name
- The hook manages complex state that benefits from a human-readable label
- You're debugging a specific issue and want temporary visibility

### ❌ Skip when:
- The hook is simple and its state is obvious (`useToggle`, `useCounter`)
- The hook is used in only one component
- The label adds no information beyond what DevTools already shows
- You're worried about even the tiniest performance overhead (though it's negligible)

```javascript
// ❌ Pointless: DevTools already shows the boolean value
function useToggle(initial) {
  const [value, setValue] = useState(initial);
  useDebugValue(value); // Just shows true/false — DevTools does this already
  return [value, () => setValue(v => !v)];
}

// ✅ Useful: transforms opaque state into a meaningful label
function useAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);
  useDebugValue(state.user ? `Authenticated: ${state.user.email}` : 'Guest');
  return { state, dispatch };
}
```

## Gotchas

### 1. Only works inside custom hooks

```javascript
// ❌ Won't work in a component
function MyComponent() {
  useDebugValue('hello'); // Technically works but React ignores it
  // DevTools won't show this label
}

// ✅ Must be inside a custom hook (function starting with "use")
function useMyHook() {
  useDebugValue('hello'); // Shows in DevTools
}
```

### 2. Zero runtime impact

```javascript
// useDebugValue does not:
// - Cause re-renders
// - Affect state
// - Change behavior
// - Throw errors (even with bad values)

useDebugValue(undefined); // Fine — shows "undefined" in DevTools
useDebugValue(null);      // Fine — shows "null"
useDebugValue({ complex: 'object' }); // Fine — DevTools renders it
```

### 3. Production builds may strip it

Some bundler configurations or React production builds may strip `useDebugValue` calls entirely. Don't rely on it for anything beyond DevTools inspection.

### 4. The formatter is called lazily

```javascript
useDebugValue(data, (data) => {
  console.log('formatter called!'); // Only logs when DevTools inspects
  return formatData(data);
});
```

The formatter only runs when React DevTools is open *and* the component is being inspected. This is why expensive formatting should always use the formatter pattern.

### 5. Keep labels concise

```javascript
// ❌ Too verbose — hard to scan in DevTools
useDebugValue(`The current user is ${user.name} with email ${user.email} and they have ${user.permissions.length} permissions and their account was created on ${user.createdAt}`);

// ✅ Concise and scannable
useDebugValue(user ? `${user.name} (${user.role})` : 'Guest');
```

## Interview Questions

**Q (Medium): What problem does `useDebugValue` solve?**

Answer: It makes custom hooks easier to debug in React DevTools by displaying a human-readable label next to the hook. Without it, inspecting a custom hook shows raw state values that may not be immediately meaningful. It's purely a developer ergonomics tool — it has zero effect on runtime behavior.

The trap: Thinking it changes the hook's behavior, affects renders, or is needed for production logic.

---

**Q (Medium): When should you use a formatter with `useDebugValue`?**

Answer: When the formatting is expensive (e.g., serializing a large object, running string operations on complex data). The formatter is only called when DevTools is open and the component is being inspected — so expensive formatting doesn't waste CPU during normal operation.

```javascript
// Without formatter: formatExpensiveData runs on every render
useDebugValue(formatExpensiveData(data));

// With formatter: formatExpensiveData only runs when inspected
useDebugValue(data, formatExpensiveData);
```

The trap: Overusing formatters for trivial formatting like string interpolation (not worth the extra complexity).

---

**Q (Low): Can `useDebugValue` be called inside a regular component?**

Answer: Technically yes — it won't throw an error. But React DevTools ignores it when called outside a custom hook. It only displays labels for custom hooks (functions starting with `use`).

The trap: Calling it inside components and wondering why nothing shows in DevTools.

---

**Q (Low): Does `useDebugValue` affect performance?**

Answer: Negligibly. Without a formatter, the label value is computed on every render (but it's usually just a string). With a formatter, the computation only happens when DevTools inspects the component. In production builds, some bundlers may strip it entirely.

The trap: Worrying about performance impact and avoiding it entirely. The overhead is essentially zero.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what `useDebugValue` does and does not affect at runtime
- [ ] Can write a custom hook that uses `useDebugValue` with a formatter from memory
- [ ] Can state where `useDebugValue` must be called and why
- [ ] Can name one reason to use a formatter instead of passing the raw value directly
- [ ] Can explain when DevTools actually calls the formatter function

---

*Next: [Rules of hooks](../16-rules-of-hooks/notes.md) — the foundation for why these hooks must be called consistently.*
