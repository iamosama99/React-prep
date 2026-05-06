# useRef

## What Is This?

`useRef` is a hook that gives you a mutable container that persists across renders. It has two main uses:

1. **Access the DOM directly**: Get a reference to a DOM node so you can call imperative methods like `focus()`, `play()`, etc.
2. **Store mutable state**: Keep a value that doesn't trigger re-renders when it changes.

```javascript
// Use case 1: Access DOM
const inputRef = useRef(null);
<input ref={inputRef} />
inputRef.current.focus();

// Use case 2: Store mutable value
const countRef = useRef(0);
countRef.current++; // Doesn't trigger re-render
```

## Why Does It Exist?

React is declarative — you describe what the UI *should* be, and React makes it happen. But sometimes you need imperative access: focus an input, play a video, measure an element's scroll position.

`useRef` is the escape hatch for imperatives. It lets you get a direct reference to a DOM node and call methods on it.

The secondary use case (storing mutable values) stems from the fact that refs are just plain JavaScript objects that persist across renders. Use this when you need to store something that shouldn't trigger re-renders (like a timer ID or the previous props value).

## How It Works

### Refs and `.current`

When you call `useRef(initialValue)`, React returns an object with a `.current` property:

```javascript
const ref = useRef(null);
console.log(ref); // { current: null }
```

When you pass `ref` to a JSX element's `ref` attribute, React automatically sets `ref.current` to the DOM node:

```javascript
const inputRef = useRef(null);
return <input ref={inputRef} />;
// After render: inputRef.current = <HTMLInputElement instance>
```

### Mutating Refs Doesn't Trigger Re-renders

```javascript
const countRef = useRef(0);

const handleClick = () => {
  countRef.current++; // Mutate the ref
  console.log(countRef.current); // 1, 2, 3, ...
  // Component doesn't re-render
};

return (
  <div>
    <button onClick={handleClick}>Increment</button>
    <p>{count}</p> {/* Doesn't change */}
  </div>
);
```

The ref is updated immediately and synchronously. No re-render. If you want re-renders, use `useState`.

### Ref Persistence

The same ref object persists across renders:

```javascript
const ref = useRef(null);

console.log(ref === ref); // Always true, even after re-renders
```

React returns the *exact same object* on every render. This is unlike regular variables, which are recreated each render.

## Use Case 1: Accessing the DOM

### Focus an Input

```javascript
function TextInput() {
  const inputRef = useRef(null);
  
  const handleClick = () => {
    inputRef.current.focus();
  };
  
  return (
    <>
      <input ref={inputRef} />
      <button onClick={handleClick}>Focus input</button>
    </>
  );
}
```

When you click the button, the input gets focus. You're calling an imperative DOM method.

### Play/Pause a Video

```javascript
function VideoPlayer() {
  const videoRef = useRef(null);
  
  const handlePlay = () => videoRef.current.play();
  const handlePause = () => videoRef.current.pause();
  
  return (
    <>
      <video ref={videoRef}>
        <source src="video.mp4" />
      </video>
      <button onClick={handlePlay}>Play</button>
      <button onClick={handlePause}>Pause</button>
    </>
  );
}
```

### Measuring Elements

```javascript
function MeasureBox() {
  const boxRef = useRef(null);
  
  useLayoutEffect(() => {
    const { width, height } = boxRef.current.getBoundingClientRect();
    console.log(width, height);
  }, []);
  
  return <div ref={boxRef}>Box</div>;
}
```

You need `useLayoutEffect` (or `useEffect`) to actually read the measurements, but the ref is your connection to the DOM node.

## Use Case 2: Storing Mutable Values

### Tracking Interval IDs

```javascript
function Stopwatch() {
  const intervalRef = useRef(null);
  const [seconds, setSeconds] = useState(0);
  
  const handleStart = () => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  };
  
  const handleStop = () => {
    clearInterval(intervalRef.current);
  };
  
  return (
    <>
      <p>{seconds}s</p>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
    </>
  );
}
```

You store the interval ID in the ref so you can clear it later. Why not use state? Because storing a number in state would be wasteful — the ID isn't part of the UI, so changes to it shouldn't trigger re-renders.

### Storing Previous Props/State

```javascript
function Component({ value }) {
  const prevValueRef = useRef();
  
  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);
  
  return <div>Current: {value}, Previous: {prevValueRef.current}</div>;
}
```

After the component renders with new props, you update the ref to store the old value. Next render, you can compare new vs old.

### Debounced Search

```javascript
function SearchInput() {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef(null);
  
  const handleChange = (e) => {
    setQuery(e.target.value);
    
    clearTimeout(timeoutRef.current); // Clear old timeout
    timeoutRef.current = setTimeout(() => {
      // Perform search after 500ms of inactivity
      fetch(`/search?q=${query}`);
    }, 500);
  };
  
  return <input value={query} onChange={handleChange} />;
}
```

You store the timeout ID so you can clear it when the user types again.

## Refs vs State

| Aspect | useState | useRef |
|--------|----------|--------|
| **Triggers re-render** | ✅ Yes | ❌ No |
| **Mutable** | ❌ (use spread/structuredClone) | ✅ Yes |
| **Persists across renders** | ✅ Yes | ✅ Yes |
| **Initial value** | Computed once (lazy init) | Computed once |
| **Access** | Synchronous variable | `.current` property |
| **Use for** | UI state | DOM access, non-UI values |

## Refs and Functional Components (forwardRef)

By default, you can't pass a ref to a functional component:

```javascript
const MyComponent = (props) => <input />;
const ref = useRef(null);
<MyComponent ref={ref} />; // ❌ Warning: doesn't work
```

Refs only work on DOM elements (or class components). To pass a ref through a functional component, use `forwardRef`:

```javascript
const MyComponent = forwardRef((props, ref) => <input ref={ref} />);
const ref = useRef(null);
<MyComponent ref={ref} />; // ✅ Works
```

(See [forwardRef](../phase-04-component-patterns/07-forward-ref.md) for deep dive.)

## Gotchas

### 1. Refs are not re-rendered

```javascript
const ref = useRef(null);

// This won't work the way you think
ref.current = computeValue(); // Updates ref

// Component doesn't re-render, so the UI isn't updated
return <div>{ref.current}</div>; // Still shows old value
```

Mutating a ref *doesn't* trigger a re-render. The JSX still references the old value until you do something that causes a re-render (like setState).

### 2. Accessing refs before they're assigned

```javascript
const inputRef = useRef(null);

// ❌ Won't work — ref isn't assigned yet
handleClick = () => inputRef.current.focus(); // null

return <input ref={inputRef} />;
```

Refs are assigned during the render commit phase. In event handlers, they're available. In render phase (before the component returns JSX), they might not be.

### 3. Don't create refs in render

```javascript
// ❌ Bad
function Component() {
  const ref = useRef(null); // Creates a new ref object every render!
  return <input ref={ref} />;
}

// ✅ Good
function Component() {
  const ref = useRef(null); // Called only once
  return <input ref={ref} />;
}
```

Hooks are only called once per component instance (in the same order). If you somehow called `useRef` conditionally, you'd break things.

Actually, this isn't a real gotcha — the hook system prevents this. But it's good to understand that `useRef` runs once on mount, not on every render.

### 4. Mutating refs is not reactive

```javascript
const countRef = useRef(0);

const increment = () => {
  countRef.current++;
  // Component doesn't re-render
  // UI still shows 0
};

return (
  <div>
    <p>{countRef.current}</p>
    <button onClick={increment}>Increment</button>
  </div>
);
```

If you want reactive updates, use state. Refs are for non-UI-related values.

### 5. Refs can be a code smell

```javascript
// Tempting but problematic
const Component = () => {
  const dataRef = useRef(null);
  
  useEffect(() => {
    fetch('/api/data').then(res => dataRef.current = res);
  }, []);
  
  return <div>{dataRef.current}</div>; // Won't update!
};
```

If you're storing data in a ref to display it, you should use state. Refs are for *imperative* access to the DOM or for values that don't affect the UI.

### 6. useRef vs useCallback for memoization

Sometimes people try to use refs for memoization:

```javascript
// ❌ Doesn't work
const memoRef = useRef(null);

const expensiveFunction = () => {
  if (memoRef.current) return memoRef.current;
  const result = computeExpensive();
  memoRef.current = result;
  return result;
};
```

This isn't idiomatic. Use `useMemo` or `useCallback` for memoization. Refs are for imperative, non-UI values.

## Interview Questions

**Q (High): What's the difference between a ref and a state variable?**

Answer: State variables trigger re-renders when they change; refs don't. Both persist across renders. Use state for UI-related values. Use refs for imperative access to the DOM or for storing values that aren't part of the UI.

```javascript
// State: changes trigger re-render
const [count, setCount] = useState(0);

// Ref: changes don't trigger re-render
const countRef = useRef(0);
```

If you want to update state and see the UI change, use `useState`. If you want to store a value that never needs to be displayed or cause re-renders, use `useRef`.

The trap: Beginners use refs for everything, not realizing that refs don't trigger re-renders. They store data in refs, then wonder why the UI doesn't update. Or they use state for non-UI values and cause unnecessary re-renders.

---

**Q (High): How do you pass a ref to a functional component?**

Answer: You can't, directly. Functional components don't accept refs by default. You need to use `forwardRef` to forward the ref to an inner DOM element:

```javascript
const MyInput = forwardRef((props, ref) => {
  return <input ref={ref} />;
});

// Now you can pass a ref
const inputRef = useRef(null);
<MyInput ref={inputRef} />;
```

Without `forwardRef`, the ref would be in the `props` object (and wouldn't work as a special ref attribute).

The trap: Developers forget about `forwardRef` and try to pass refs directly, then wonder why it doesn't work. Also, they forget to actually use the `ref` parameter inside the functional component.

---

**Q (High): Why would you store a value in a ref instead of state?**

Answer: When the value doesn't affect the UI and changes shouldn't trigger re-renders. Examples:
- Timer/interval IDs (for cleanup later)
- Previous prop values (for comparing old vs new)
- DOM measurements (store once, don't need to update)
- Debounce timeout IDs

Using state for these would waste CPU cycles on unnecessary re-renders.

```javascript
// ❌ Wasteful: re-renders on every timer ID change
const [intervalId, setIntervalId] = useState(null);

// ✅ Correct: store in ref, no re-renders
const intervalRef = useRef(null);
```

The trap: Developers don't think about performance implications and use state for everything. Conversely, they try to use refs for values that *do* affect the UI, then wonder why the UI doesn't update.

---

**Q (Medium): When should you access a ref in an effect vs in an event handler?**

Answer: Refs are available in both, but timing matters. In event handlers, the ref is definitely assigned (the component has rendered). In effects, the ref is also assigned (after the commit phase).

The only scenario where a ref might not be assigned is during the render phase itself (while the component function is executing). Once rendering is done, the ref is available.

```javascript
function Component() {
  const ref = useRef(null);
  
  // ✅ Safe: event handler
  const handleClick = () => console.log(ref.current); // Defined
  
  // ✅ Safe: effect
  useEffect(() => {
    console.log(ref.current); // Defined
  }, []);
  
  // ❌ Not applicable: during render
  console.log(ref.current); // Might not be assigned yet (usually null on first render)
  
  return <input ref={ref} />;
}
```

The trap: Developers try to access refs during render and get `null`, then assume refs don't work. Refs work fine in event handlers and effects.

---

**Q (Medium): Can you use a ref to store state that affects the UI?**

Answer: Technically yes, but you shouldn't. If the value affects the UI, changes to it should trigger re-renders. Use state for that.

```javascript
// ❌ Bad: won't update UI
const countRef = useRef(0);
const increment = () => { countRef.current++; };
return <div>{countRef.current}</div>; // Always shows 0

// ✅ Good: triggers re-render
const [count, setCount] = useState(0);
const increment = () => { setCount(c => c + 1); };
return <div>{count}</div>; // Updates
```

If you find yourself storing UI-related data in a ref, you're probably solving the problem wrong. Reconsider whether you need state instead.

The trap: Beginners store everything in refs and don't understand why the UI doesn't update. Understanding that refs don't trigger re-renders is fundamental.

---

*Next: [useMemo](06-use-memo.md) — Caching expensive computations to avoid re-renders.*
