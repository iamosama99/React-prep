# Stale Closure Problem

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Stale closure | A callback holding a value from an earlier render | Causes bugs where outdated state is used silently |
| Per-render scope | Each render creates a new function scope with that render's values | Closures created in render lock in those values |
| Dependency array fix | Adding the stale value to the hook's deps causes the callback to refresh | Most direct fix; can cause extra re-runs |
| Ref fix | Storing the latest value in a ref and reading from the ref | Gives fresh value without triggering re-renders |

## What Is This?

The stale closure problem is a bug pattern where a function inside a React component captures a value from an *earlier* render and continues using that outdated value, even after the component has re-rendered with new state or props.

It's not a React bug — it's a consequence of how JavaScript closures work combined with React's per-render execution model.

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // Always logs 0 — stale!
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps → effect created once → closure captures count = 0

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

Click the button 10 times. The interval still logs `0` because it captured `count` from the first render and never got a fresh value.

> **Check yourself:** Why does the interval see `0` forever? What would happen if you added `count` to the dependency array?

## Why Does It Happen?

### JavaScript Closures Refresher

A closure is a function that "remembers" the variables from its surrounding scope:

```javascript
function createGreeter(name) {
  return function greet() {
    console.log(`Hello, ${name}`); // name is captured from the outer scope
  };
}

const greetAlice = createGreeter('Alice');
greetAlice(); // "Hello, Alice" — name is locked in
```

The function `greet` captures `name` at the moment it's created. Changing `name` later doesn't affect the captured value — the closure holds a snapshot.

### React's Per-Render Scope

In React, each render creates a new function scope with the current state and props values:

```javascript
function Counter() {
  const [count, setCount] = useState(0);
  // Render 1: count = 0
  // Render 2: count = 1
  // Render 3: count = 2

  const handleClick = () => {
    // This function captures `count` from THIS render
    console.log(count);
  };

  return <button onClick={handleClick}>{count}</button>;
}
```

Each render creates a *new* `handleClick` function that captures the `count` value from that specific render. This is fine for event handlers — React creates a new function each render, so the handler always has the latest value.

### Where It Breaks: Persistent Callbacks

The problem appears when a callback is created once and persists across renders:

```javascript
useEffect(() => {
  // This function is created during render 1
  // It captures count = 0
  const id = setInterval(() => {
    console.log(count); // Always 0
  }, 1000);
  return () => clearInterval(id);
}, []); // Empty deps → callback created ONCE
```

The interval callback was created during render 1, so it captured `count = 0`. Because the effect has an empty dependency array, it never re-runs — the callback never gets a fresh `count` value.

> **Check yourself:** If you change `[]` to `[count]`, does the stale closure go away? What's the tradeoff?

## Stale Closures in Different Contexts

### 1. In useEffect with Empty Deps

```javascript
const [count, setCount] = useState(0);

useEffect(() => {
  const id = setInterval(() => {
    // Stale: always reads count from render 1
    setCount(count + 1); // Always sets to 1, not incrementing
  }, 1000);
  return () => clearInterval(id);
}, []); // count captured once
```

After 10 seconds, `count` is still `1` — not `10`. Every interval tick reads `count = 0` and sets `count = 0 + 1 = 1`.

### 2. In Event Handlers with setTimeout

```javascript
const [message, setMessage] = useState('hello');

const handleClick = () => {
  setTimeout(() => {
    alert(message); // Shows the message from when the click happened
  }, 3000);
};

// If you change the message and click, the alert shows the OLD message
```

This is actually *correct behavior* in React's model — the event handler captures the message at the time of the click. But it surprises developers who expect the latest value.

### 3. In useCallback with Missing Deps

```javascript
const [items, setItems] = useState([]);

const handleAdd = useCallback((item) => {
  setItems([...items, item]); // Stale: items is always []
}, []); // Missing items dep!

// Every add replaces the list with [newItem] instead of appending
```

### 4. In Event Listeners

```javascript
const [position, setPosition] = useState({ x: 0, y: 0 });

useEffect(() => {
  const handler = (e) => {
    // Stale: position is always { x: 0, y: 0 }
    console.log(`Position: ${position.x}, ${position.y}`);
    console.log(`Mouse: ${e.clientX}, ${e.clientY}`);
  };

  window.addEventListener('mousemove', handler);
  return () => window.removeEventListener('mousemove', handler);
}, []); // position captured once
```

### 5. In Callbacks Passed to Children

```javascript
function Parent() {
  const [count, setCount] = useState(0);

  const handleChildEvent = useCallback(() => {
    console.log(`Count is: ${count}`); // Stale if count not in deps
  }, []); // Missing count!

  return <MemoizedChild onEvent={handleChildEvent} />;
}
```

> **Check yourself:** Name three different places where stale closures can appear (not just `useEffect`).

## Fix Strategies

### Fix 1: Add to Dependency Array

The most direct fix — include the stale value in the dependency array so the effect/callback is recreated with the fresh value:

```javascript
// ✅ Effect re-runs when count changes
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // Fresh value on each effect run
  }, 1000);
  return () => clearInterval(id);
}, [count]); // Re-creates interval when count changes
```

**Tradeoff**: The interval is destroyed and recreated every time `count` changes. For timers, this means the interval resets — which may or may not be what you want.

### Fix 2: Functional Updater

When the stale value is state, use the functional updater form to access the latest state:

```javascript
// ✅ Functional updater reads the latest state
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1); // c is always the latest count
  }, 1000);
  return () => clearInterval(id);
}, []); // No need for count in deps!
```

**Why it works**: `setCount(c => c + 1)` doesn't read from the closure. React passes the current state as `c`, so the closure never goes stale. This is the best fix when you're *updating* state based on the current state.

**Limitation**: This only works for state updates. If you need to *read* the value (e.g., `console.log(count)`), functional updaters don't help.

### Fix 3: Ref to Hold the Latest Value

Store the latest value in a ref and read from the ref inside the callback:

```javascript
const [count, setCount] = useState(0);
const countRef = useRef(count);

// Keep ref in sync with state
useEffect(() => {
  countRef.current = count;
}, [count]);

// Read from ref instead of closure
useEffect(() => {
  const id = setInterval(() => {
    console.log(countRef.current); // Always the latest count
  }, 1000);
  return () => clearInterval(id);
}, []); // No deps needed — ref is a stable reference
```

**Why it works**: `countRef` is a stable object reference. It's the same object on every render. The interval callback captures the ref (stable), then reads `.current` (always up to date).

**Tradeoff**: More code, and it bypasses React's reactivity model. The ref update is manual and imperative.

### Fix 4: useEffectEvent (Experimental, React 18.3+)

React is introducing `useEffectEvent` (experimental) for exactly this pattern — a function that always reads the latest values without being a dependency:

```javascript
// ⚠️ Experimental — not stable yet
const onTick = useEffectEvent(() => {
  console.log(count); // Always the latest count
});

useEffect(() => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}, []); // onTick is not a dependency
```

This is the cleanest solution, but it's not yet stable in React.

### Comparison of Fix Strategies

| Strategy | Pros | Cons | Best for |
|----------|------|------|----------|
| **Add to deps** | Simple, idiomatic | Effect re-runs (timer resets) | Effects where re-running is acceptable |
| **Functional updater** | No deps needed, no re-runs | Only works for state updates | `setCount(c => c + 1)` patterns |
| **Ref** | Always fresh, no re-runs | More code, bypasses reactivity | Reading (not updating) values in long-lived callbacks |
| **useEffectEvent** | Cleanest, no deps | Experimental, not stable | Future React (when stabilized) |

> **Check yourself:** You have a `setInterval` that needs to both *read* and *update* state. Which fix strategy works? Can you combine strategies?

## Visual Timeline

```
Render 1: count = 0
  → useEffect creates interval
  → interval callback captures count = 0
  → interval ticks: console.log(0), console.log(0), console.log(0)...

User clicks button → setCount(1) → Render 2: count = 1
  → useEffect does NOT re-run (empty deps)
  → interval still has the OLD callback
  → interval ticks: console.log(0), console.log(0)... ← STALE!

With [count] deps:
  → useEffect cleanup: clears old interval
  → useEffect creates NEW interval
  → NEW callback captures count = 1
  → interval ticks: console.log(1), console.log(1)...

User clicks button → Render 3: count = 2
  → useEffect cleanup: clears old interval
  → useEffect creates NEW interval
  → NEW callback captures count = 2
  → interval ticks: console.log(2), console.log(2)...
```

## Gotchas

### 1. ESLint warns but developers ignore

```javascript
// ESLint: "React Hook useEffect has a missing dependency: 'count'"
useEffect(() => {
  console.log(count);
}, []); // ← ESLint catches this

// ❌ Developer adds eslint-disable instead of fixing it
// eslint-disable-next-line react-hooks/exhaustive-deps
```

The ESLint `exhaustive-deps` rule exists to catch stale closures. Disabling it is almost always wrong.

### 2. The fix can introduce infinite loops

```javascript
useEffect(() => {
  setCount(count + 1); // Updates count
}, [count]); // count changes → effect runs → count changes → ♾️
```

Adding a stale value to deps fixes the stale closure but can create a loop if the effect *updates* that value.

Fix: use a functional updater or add a condition:

```javascript
useEffect(() => {
  setCount(c => c + 1); // No count in deps
}, []); // No dependency loop
```

### 3. Stale closures are silent

The most insidious part: stale closures don't throw errors. The code runs, uses an old value, and produces wrong results — silently. You only notice when the behavior is obviously wrong (logging the wrong number, submitting stale form data, etc.).

### 4. Objects and arrays are especially tricky

```javascript
const [items, setItems] = useState([]);

useEffect(() => {
  socket.on('new_item', (item) => {
    setItems([...items, item]); // Stale: items is always []
  });
}, []); // items captured as []
```

Every new item overwrites the list. Fix with functional updater:

```javascript
setItems(prev => [...prev, item]); // Always has the latest items
```

### 5. Multiple stale values compound the problem

```javascript
useEffect(() => {
  const handler = () => {
    // Both count AND name are stale
    console.log(`${name}: ${count}`);
  };
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []); // Missing both count AND name
```

## Interview Questions

**Q (High): What is a stale closure in React?**

Answer: A stale closure occurs when a function (callback, event handler, timer) captures a state or props value from an earlier render and continues using that outdated value after the component has re-rendered with new values. It's a consequence of JavaScript closures combined with React's per-render execution model.

Example: An interval callback created during the first render captures `count = 0`. Even after the user clicks to increment `count`, the interval still logs `0` because it holds the value from when it was created.

The trap: Saying it's a React bug. It's standard JavaScript closure behavior. React's contribution is the per-render scope model, which makes closures more prevalent.

---

**Q (High): How do you fix stale closures in hooks?**

Answer: Four strategies:
1. **Add to dependency array**: Re-create the callback when the value changes. Simple but may cause unwanted re-runs.
2. **Functional updater**: Use `setState(prev => newValue)` to access the latest state without adding it to deps. Only works for state updates.
3. **Refs**: Store the latest value in a ref (`ref.current = value`) and read from the ref. Works for any value, but bypasses reactivity.
4. **useEffectEvent** (experimental): A function that always reads fresh values without being a dependency.

The right fix depends on the specific case. Functional updaters are best for state updates. Refs are best for reading values in long-lived callbacks.

The trap: Blindly disabling the `exhaustive-deps` lint rule instead of fixing the stale closure.

---

**Q (High): Explain the stale closure in this code and fix it:**

```javascript
const [count, setCount] = useState(0);
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

Answer: The interval callback captures `count = 0` from the first render. Every tick calls `setCount(0 + 1)`, always setting count to 1. After 10 seconds, count is 1, not 10.

Fix with functional updater:
```javascript
setCount(c => c + 1); // c is always the latest count
```

Now each tick reads the current count and adds 1. After 10 seconds, count is 10.

The trap: Adding `count` to the dependency array. This "fixes" the stale closure but destroys and recreates the interval on every tick, which resets the timer.

---

**Q (High): What's the difference between fixing a stale closure with deps vs a ref?**

Answer: Adding to deps re-creates the callback with the fresh value, but the effect re-runs (timers reset, subscriptions re-subscribe). Using a ref keeps the callback stable (no re-runs) but requires manual synchronization (`useEffect` to keep `ref.current` updated).

Deps are the idiomatic React fix. Refs are the escape hatch for cases where re-running the effect is problematic (long-running timers, WebSocket connections, animation frames).

The trap: Always using one approach without considering the tradeoffs.

---

**Q (Medium): Are stale closures limited to useEffect?**

Answer: No. They appear anywhere a function captures a value and persists across renders:
- `setTimeout` / `setInterval` callbacks
- Event listeners added in effects
- `useCallback` with missing deps
- Callbacks passed to memoized children
- Promise `.then()` chains
- WebSocket message handlers

Any long-lived function that references state or props is susceptible.

The trap: Only thinking about `useEffect` and missing stale closures in callbacks, event handlers, and other contexts.

---

**Q (Medium): Why does the functional updater fix stale closures?**

Answer: Because `setState(prev => next)` doesn't read from the closure at all. React passes the *current* state as `prev` when the update runs. The callback doesn't need to capture `count` — it receives the latest value as a parameter.

```javascript
// Stale: reads count from closure (may be outdated)
setCount(count + 1);

// Fresh: receives current count from React
setCount(c => c + 1);
```

This is why functional updaters are the preferred fix when you're updating state based on the current state.

The trap: Not knowing that `setCount(c => c + 1)` is different from `setCount(count + 1)` in terms of closures.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what a stale closure is in plain terms without referencing React-specific jargon
- [ ] Can reproduce the interval stale closure bug from memory and explain exactly why it happens
- [ ] Can write the ref-based fix for a stale closure from memory
- [ ] Can name the trade-off between the dependency-array fix and the ref fix
- [ ] Can name at least three contexts outside useEffect where stale closures can appear
- [ ] Can explain why the functional updater `setState(prev => next)` avoids stale closures

---

*Next: [Common custom hooks](../18-common-custom-hooks/notes.md) — practical reusable patterns once you master the hook primitives.*
