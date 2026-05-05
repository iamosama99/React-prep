# useState

## What Is This?

`useState` is a hook that lets a functional component track local state. You call it with an initial value (or initializer function), and it returns a tuple: the current state value and a function to update it.

```javascript
const [count, setCount] = useState(0);
const [name, setName] = useState(() => computeExpensiveInitialName());
```

It's the foundational hook — the one you reach for first when a component needs to remember something between renders.

## Why Does It Exist?

Before hooks, only class components could have state. Functional components were just props → JSX, no memory. Hooks were introduced (React 16.8, 2019) to give functional components the same stateful capabilities as classes, but with cleaner composition and no `this` binding mess.

`useState` specifically solves the problem of *local, component-level state*. Not external state (Redux for that), not side effects (useEffect for that) — just: "this component needs to remember a value across renders, and when it changes, re-render."

## How It Works

### The Mechanism

When you call `useState(initialValue)`:

1. React checks if this is the *first* render. If yes, it stores `initialValue` in an internal fiber node for that component instance.
2. React returns `[currentValue, setterFunction]`.
3. When you call the setter (e.g., `setCount(5)`), React schedules a re-render of that component.
4. On the next render, `useState` returns the new value.

React's state is stored *per component instance*, not globally. If you render two `<Counter />` components, each has its own `count` state.

### Why Call It a "Tuple"?

It's an array with two elements. You destructure it:

```javascript
const [state, setState] = useState(initial);
```

You *could* do `const arr = useState(initial); arr[0]; arr[1];` but destructuring is the convention.

### Batching

If you call `setState` multiple times in the same event handler, React **batches** them:

```javascript
const handleClick = () => {
  setCount(count + 1);
  setName("Alice");
  setActive(true);
  // React schedules ONE re-render, not three
};
```

This is automatic in React 18+. In React 17 and earlier, batching only happened in event handlers — promises, timeouts, and `flushSync()` would bypass batching.

In React 18, **automatic batching** applies everywhere (event handlers, promises, timeouts, etc.), unless you explicitly opt out with `flushSync()`:

```javascript
import { flushSync } from 'react';

const handleClick = () => {
  flushSync(() => setCount(c => c + 1));  // renders immediately
  // DOM has been updated here
  flushSync(() => setName("Bob"));         // renders again immediately
};
```

### Functional Updates

You can pass a function to the setter. It receives the current state and must return the new state:

```javascript
const [count, setCount] = useState(0);

// Option 1: direct value
setCount(5);

// Option 2: function
setCount(prevCount => prevCount + 1);
```

**Why functional updates matter:** If you're computing the new state based on the current state, the function form guarantees you get the *most recent* state value, even if multiple setState calls are pending.

```javascript
const increment = () => setCount(c => c + 1);

// If you call this three times rapidly:
increment();
increment();
increment();

// All three see the updated previous state
// Final count: 3
```

Without the function form, if you did `setCount(count + 1)` three times synchronously, the third call would overwrite the first two (because all three see the same stale `count` value).

### Lazy Initialization

If computing the initial state is expensive, pass a function instead of a value:

```javascript
const [state, setState] = useState(() => {
  // This function runs ONLY on the first render
  const expensiveComputation = JSON.parse(localStorage.getItem('state'));
  return expensiveComputation || defaultValue;
});
```

React calls the initializer function *only once*, on mount. On subsequent renders, the function is ignored.

Without the initializer function:

```javascript
// ❌ BAD: runs on EVERY render
const [state, setState] = useState(JSON.parse(localStorage.getItem('state')));
```

## State is Per-Render

A critical mental model: when React calls your component function, it passes the *latest state* into that render. The state value you see is specific to that render. Old renders had old state values.

```javascript
function Counter() {
  const [count, setCount] = useState(0);
  
  const handleClick = () => {
    setCount(count + 1);
    console.log(count); // Still the OLD count! Not +1
  };
  
  return <button onClick={handleClick}>{count}</button>;
}
```

The `console.log` still shows the old `count` because `setState` doesn't update the variable — it schedules a re-render. The new `count` value won't exist until the next render.

This is the source of the **stale closure** problem and one of the most common gotchas.

## Automatic Re-render Behavior

React's default: if you call `setState` with a *different* value (by `Object.is()` comparison), React schedules a re-render. If you set the same value:

```javascript
setState(5);
setState(5);
setState(5);
// React bails out early — no re-render
```

For objects and arrays, this is *reference* equality:

```javascript
setState({ name: 'Alice' });
setState({ name: 'Alice' });
// Two renders, because the objects have different references
```

This is why you must use spread or structuredClone to update state objects (see [State & Immutability](../phase-01-fundamentals/04-state-and-immutability.md)).

## Gotchas

### 1. setState is asynchronous

```javascript
const [count, setCount] = useState(0);

setCount(1);
console.log(count); // Still 0! 

// ... later, after React renders ...
// Now count is 1
```

React batches state updates and re-renders are asynchronous. The new value won't be visible until the next render.

### 2. State updates don't merge

In class components, `this.setState()` merges the object you pass into state. Not with `useState`:

```javascript
const [state, setState] = useState({ name: '', age: 0 });

setState({ name: 'Alice' }); // ❌ Replaces entire state with { name: 'Alice' }
// age is gone!

setState(s => ({ ...s, name: 'Alice' })); // ✅ Spreads old state, then overrides name
```

### 3. Closures capture state by value

Every render creates a new function body with the current state captured:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log(count); // Logs the count from when the effect was created
    }, 3000);
  }, []); // Empty deps = runs once
  
  return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
}

// If you click the button then wait 3 seconds, it logs 0, not the new count
```

This is the stale closure problem in action (covered in detail in [Stale Closure Problem](17-stale-closure-problem.md)).

### 4. Infinite loops with state and side effects

```javascript
const [count, setCount] = useState(0);

useEffect(() => {
  setCount(count + 1); // Runs after every render
}, [count]); // When count changes, this effect runs again → infinite loop
```

The effect runs when `count` changes, updates `count`, which triggers the effect again.

### 5. Multiple setState calls are batched, but...

In event handlers:

```javascript
const handleClick = () => {
  setCount(c => c + 1);
  setName('Alice');
  // These two batched into one re-render
};
```

But if you call setState in different async contexts:

```javascript
const handleClick = async () => {
  setCount(c => c + 1);
  await fetchData(); // Async operation
  setName('Alice');  // In React 18+, still batched with the previous setState
};
```

In React 18+, they're still batched. In React 17 and earlier, the second one triggers a separate render.

## Interview Questions

**Q: What's the difference between `setState(value)` and `setState(prevState => newState)`?**

Answer: The function form (updater function) lets you compute the new state based on the previous state. It's important when you're doing multiple state updates and need to ensure each sees the latest state value, not a stale one. For example, if you call `increment()` three times, using `setCount(c => c + 1)` guarantees you get count + 3, not count + 1 (which you'd get if all three calls closed over the same stale `count` value). The function form also decouples the update logic from when it executes — useful in debouncing or queuing scenarios.

The trap: Beginners think `setState` is synchronous and the state variable updates immediately. It doesn't. Also, they often forget to use the function form when the new state depends on the old state, leading to "missing" updates when multiple setState calls happen quickly.

---

**Q: What does lazy initialization do, and when would you use it?**

Answer: Lazy initialization means passing a function to `useState` instead of a value. React calls that function only on the first render; on subsequent renders, the function is never called. Use this when the initial state computation is expensive — parsing large JSON from localStorage, running complex calculations, etc. It avoids wasting CPU cycles re-running expensive computations on every render.

Example: `useState(() => JSON.parse(localStorage.getItem('data')) || defaultValue)` vs `useState(JSON.parse(localStorage.getItem('data')) || defaultValue)`. The first runs the parse once; the second runs it on every render.

The trap: Passing a value by accident instead of a function. If you do `useState(expensiveFunction())`, the function runs immediately. If you do `useState(expensiveFunction)`, you're passing the function itself as state, not its return value.

---

**Q: What is automatic batching, and how did it change in React 18?**

Answer: Batching is when React groups multiple state updates together and does one re-render instead of multiple. Before React 18, batching only happened inside event handlers. If you called setState in a promise, timeout, or other async context, each call triggered a separate re-render.

React 18 introduced automatic batching everywhere — event handlers, promises, timeouts, all of it. So code like this:

```javascript
async function handleClick() {
  setCount(c => c + 1);
  await fetchData();
  setName('Alice');
}
```

In React 17, this would cause two re-renders. In React 18, it's batched into one.

If you *need* a render in between, use `flushSync()`:

```javascript
import { flushSync } from 'react';

flushSync(() => setCount(c => c + 1)); // renders immediately
console.log(document.getElementById('count').textContent); // can inspect updated DOM
```

The trap: Developers don't realize batching changed, so they assume setState is synchronous and the DOM updates immediately. Or they expect `flushSync()` to work in places it doesn't (e.g., you can't use it in event handlers in the way they think).

---

**Q: Why does React need `useState` at all? Why can't you just use a regular variable?**

Answer: Because a regular variable in a function component gets reset on every render. If you did:

```javascript
function Counter() {
  let count = 0; // Reset to 0 on every render!
  return <button onClick={() => count++}>{count}</button>;
}
```

The `count` variable would always be 0, and incrementing it wouldn't cause a re-render (React wouldn't know to re-render). React needs to store state *outside* the component function, in a stable location (the fiber node), so the value persists across renders and changes trigger re-renders.

`useState` is React's way of saying: "Store this value persistently, associate it with this component instance, and when it changes, re-render the component with the new value."

The trap: Beginners sometimes think React "remembers" the variable. It doesn't — React uses a call-order-based system (hooks must be in the same order every render) to match setState calls to stored state. If you call hooks conditionally, React can't match them correctly and you get an error.

---

**Q: How does React know which `useState` call maps to which state variable?**

Answer: React relies on **call order**. On every render, React calls your component function. Each `useState` call is matched to a stored state value by its position in the render. First `useState` call → first state slot, second `useState` call → second state slot, etc.

```javascript
function Component() {
  const [count, setCount] = useState(0);     // First state slot
  const [name, setName] = useState('');      // Second state slot
  const [active, setActive] = useState(true); // Third state slot
}
```

This is why you can't call `useState` conditionally:

```javascript
// ❌ BAD
function Component({ show }) {
  if (show) {
    const [count, setCount] = useState(0); // Might be called, might not
  }
}
```

If `show` is true on the first render, React sets up three state slots (count, then name, then active). On the next render, if `show` is false, React tries to match `useState` calls to those slots, but now there are only two `useState` calls, and they get mismatched to the wrong state values. This breaks things badly.

The trap: Developers think they can conditionally initialize state to save memory or avoid setup logic. They can't. Hooks must run in the same order every render. (There's a lint rule that catches this.)

---

**Q: What happens when you call `setState` with the same value twice?**

Answer: React uses `Object.is()` to compare the new value with the current state. If they're equal, React skips the re-render entirely (this is called "bailout").

```javascript
setCount(5);
setCount(5);
setCount(5);
// Only one re-render, not three
```

But for objects and arrays, this is *reference* equality:

```javascript
setState({ name: 'Alice' });
setState({ name: 'Alice' });
// Two re-renders, because the objects are different references
```

This is why you must create new objects/arrays when updating state (spread operator, structuredClone, etc.), or use immutability libraries.

The trap: Developers create new objects unnecessarily and don't realize they're causing extra renders. Or they try to mutate objects in place and wonder why React doesn't re-render (because the reference is the same).

---

**Q: In a component, you call `setState` then immediately log the state variable. What gets logged?**

Answer: The *old* state value, not the new one. `setState` is asynchronous — it schedules a re-render, but doesn't update the variable immediately.

```javascript
const [count, setCount] = useState(0);

const handleClick = () => {
  setCount(1);
  console.log(count); // Logs 0, not 1
};
```

The new `count` value (1) won't be visible until the next render completes. This trips up a lot of developers who expect synchronous state updates like in Vue or plain JavaScript.

The trap: Developers try to access the updated state immediately after calling setState and get confused when they see the old value. They sometimes try workarounds like `setTimeout(() => console.log(count), 0)` or other anti-patterns instead of understanding the async nature of React.

---

*Next: [useEffect](02-use-effect.md) — How React handles side effects and synchronization with the external world.*
