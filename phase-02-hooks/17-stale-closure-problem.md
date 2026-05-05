# Stale Closure Problem

## What Is This?

A stale closure is when a function in React "closes over" a variable at a particular point in time and continues using that captured value even after the variable has been updated. The function sees the old value, not the current one — it's stale.

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // 'count' is captured as 0 and never updates
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps — effect runs once, count is forever 0

  return <div>{count}</div>; // Always shows 1 after the first tick!
}
```

The interval increments `0 + 1` every second, not the current count. `count` in the closure is stuck at the value it had when the closure was created: `0`.

## Why Does This Happen?

This is fundamental JavaScript, not a React bug. When a function is created, it captures variables from its enclosing scope *by reference* — it holds a reference to the variable binding, not a snapshot of the value.

For regular mutable variables, this works perfectly: the closure reads the current value through its reference.

For React state, the problem is subtler. Every render creates a new closure with a **new local `count` variable** containing the current value. The previous closure's `count` variable still exists in memory from when *that* render ran — it's a separate variable, not an update to the same binding.

```javascript
// Render 1: count = 0
const count = 0;
const intervalCb = () => setCount(count + 1); // captures 'count = 0' forever

// Render 2: count = 1
const count = 1; // New variable binding! The old closure still has its own 'count = 0'
const intervalCb = () => setCount(count + 1); // This new closure captures 'count = 1'
```

If the effect ran in Render 1 with an empty dep array, the `intervalCb` from Render 1 is the one that keeps running. It captures the `count` from Render 1 — which is `0` — permanently.

## Where It Appears

### useEffect with Timers

Already shown above. Any timer (setInterval, setTimeout) inside an effect with an empty or incomplete dep array is a stale closure candidate.

```javascript
// ❌ Classic stale closure
useEffect(() => {
  const id = setTimeout(() => {
    console.log(count); // Logs initial count, never the current one
  }, 5000);
  return () => clearTimeout(id);
}, []); // Should include count, but then the timer restarts every render
```

### useEffect with Event Listeners

```javascript
// ❌ handleKeyDown closes over state from when the effect ran
useEffect(() => {
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      submitForm(inputValue); // inputValue is stale!
    }
  }
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // inputValue should be in deps, but that causes re-add on every change
```

### useCallback

```javascript
// ❌ handler always calls doSomething with the initial 'data'
const handler = useCallback(() => {
  doSomething(data);
}, []); // Missing 'data' in deps
```

The ESLint `exhaustive-deps` rule exists specifically to catch these.

### Debounced Callbacks

```javascript
// ❌ The debounced function closes over the initial 'value'
const debouncedSearch = useMemo(
  () => debounce((query) => search(query), 300),
  [] // If you add 'search' as dep, the debounce resets on every render
);
```

Debounced functions are tricky because the whole point is to keep the same function reference, but that means it captures a snapshot of its dependencies at creation time.

## The Fixes

### 1. Add the Value to Dependencies

The cleanest fix when it doesn't cause correctness issues:

```javascript
// ✅ effect re-runs when count changes — always has fresh count
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]); // Re-runs (and restarts interval) whenever count changes
```

Downside: the interval restarts on every count change. For this specific case, that's wasteful. Use the functional update pattern instead.

### 2. Functional State Updates

When updating state based on previous state, the functional form of `setState` always receives the current state — bypassing the closure problem entirely:

```javascript
// ✅ No closure issue — React passes the current state as argument
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1); // 'c' is always the current count
  }, 1000);
  return () => clearInterval(id);
}, []); // Empty deps is now correct — no count capture
```

This works because `setCount(fn)` calls `fn` with the actual current state at update time. The closure doesn't need to capture `count` at all.

This pattern works for `useState` and `useReducer` (`dispatch`).

### 3. The Ref Escape Hatch

When you need to read the latest value inside a long-lived callback (like a debounced function or event listener), store it in a ref:

```javascript
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);

  // Keep ref in sync with state
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Stable callback that always reads latest query via ref
  const debouncedSearch = useMemo(
    () => debounce(() => onSearch(queryRef.current), 300),
    [onSearch] // Debounce function is stable; reads from ref at call time
  );

  return (
    <input
      value={query}
      onChange={e => {
        setQuery(e.target.value);
        debouncedSearch();
      }}
    />
  );
}
```

The ref always holds the latest value. The debounced function reads from the ref rather than closing over the state variable. No stale closure.

A cleaner version of the same pattern — update the ref synchronously in the render body (no need for a useEffect):

```javascript
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query; // Always current — runs every render

  const debouncedSearch = useMemo(
    () => debounce(() => onSearch(queryRef.current), 300),
    [onSearch]
  );
  // ...
}
```

This works because by the time the debounce fires, the current render has already updated `queryRef.current`.

### 4. useEffectEvent (React 19 / Experimental)

React's experimental `useEffectEvent` hook is designed specifically for this pattern — a callback that should always see the latest state but shouldn't be in the effect's dep array:

```javascript
// Experimental / React 19
const onTick = useEffectEvent(() => {
  setCount(count + 1); // Always reads current count
});

useEffect(() => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}, []); // onTick is not in deps — it's an "event" not a dependency
```

`useEffectEvent` extracts the "what to do" from the "when to do it," cleanly separating reactive dependencies from imperative callbacks.

## Recognizing the Bug

Common symptoms:
- State updates feel like they're skipping, resetting, or not accumulating
- An effect appears to have no effect despite being triggered
- A stale value from an earlier render appears in a log or output
- A form submission uses initial values, not current ones
- A timer accumulates by 1 each tick instead of by the current count

The debugging technique: `console.log` inside the suspect callback. If the logged value matches the *initial* state, not the current one, you have a stale closure. Check the dep array.

## Gotchas

### ESLint won't catch everything

`exhaustive-deps` catches missing deps in hooks it knows about (`useEffect`, `useMemo`, `useCallback`). It won't catch:
- Stale closures in callbacks passed to libraries (debounce, throttle, event emitters)
- Manually managed subscriptions outside React's hook system
- `useRef` callbacks

### Fixing with deps can introduce new bugs

Adding a dep to fix a stale closure sometimes causes correctness issues: the effect re-runs too often, the interval restarts, the subscription re-registers. Understand what re-running the effect *means* before blindly adding deps. Sometimes the functional update or ref pattern is the right fix.

### Props can go stale too

Stale closures aren't just about state. Props can go stale in the same way:

```javascript
// ❌ onSave prop may be stale if parent re-renders
useEffect(() => {
  const id = setInterval(() => {
    onSave(formData); // onSave captured at effect creation
  }, 30000);
  return () => clearInterval(id);
}, []); // onSave should be in deps
```

If the parent passes a new `onSave` function (e.g., it re-renders and creates a new closure), this effect would still call the old one. The fix: add `onSave` to deps (which restarts the interval when it changes), or use the ref pattern to always call the latest `onSave`.

## Interview Questions

**Q: What is a stale closure in React? Can you give an example?**

Strong answer: A stale closure is when a function captures a variable's value from a past render and continues using that old value even after the variable has been updated. It happens because React state creates a new variable binding on every render — each render's closures capture that render's local variables. A closure created in an earlier render holds a reference to that render's variables, not the current ones. Classic example: `setInterval` inside a `useEffect` with an empty dep array. The interval callback closes over the initial state value and never sees updates.

```javascript
useEffect(() => {
  setInterval(() => {
    setCount(count + 1); // count is always 0
  }, 1000);
}, []); // count captured as 0 at mount, never updates
```

The trap: Saying "it's a JavaScript closure bug." It's JavaScript behavior, but the React-specific context (state creating new bindings per render) is what makes it a gotcha in React specifically.

---

**Q: What are the options for fixing a stale closure?**

Strong answer: Three approaches, each appropriate in different contexts. (1) **Add the value to deps**: the cleanest fix when re-running the effect is acceptable and correct. (2) **Functional state update** (`setState(prev => prev + 1)`): bypasses the closure entirely for state updates — the callback receives the current state as its argument at update time, no capture needed. Best for counters, toggles, or any "update based on previous state" pattern. (3) **Ref escape hatch**: store the value in a `useRef`, update it on every render (`ref.current = value`), and read from the ref inside long-lived callbacks. Best for debounced functions, event listeners, and anywhere you need a stable function reference that always reads current values. The choice depends on whether re-running the effect is acceptable and whether you're dealing with state updates vs reads.

The trap: Only knowing "add it to deps." That's one fix but not always the right one, and adding deps carelessly can introduce other bugs.

---

**Q: Why does the functional form of `setState` avoid stale closures?**

Strong answer: When you write `setState(prev => prev + 1)`, React calls your function at the time of the update, passing the actual current state as the argument. The closure doesn't need to capture the state variable at all — it receives it fresh. This sidesteps the whole "which render's closure is this" problem. The closure only needs to capture the update *logic*, not the current *value*. This pattern is most powerful when you need to derive next state from previous state in a way that might happen after a delay — intervals, timeouts, event handlers installed at mount.

The trap: Not explaining *why* it works, just saying "use the functional form." The mechanism — React injecting current state into the callback at update time — is what makes it reliable.

---

*Next: [Common Custom Hooks](18-common-custom-hooks.md) — The hooks every React developer is expected to know how to build: useDebounce, useFetch, usePrevious, useOnClickOutside, useLocalStorage, and useIntersectionObserver.*
