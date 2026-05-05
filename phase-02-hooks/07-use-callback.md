# useCallback

## What Is This?

`useCallback` is a hook that returns a memoized version of a callback function — one that stays the same reference across renders until its dependencies change.

```javascript
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

Without `useCallback`, `handleClick` would be a brand-new function object on every render. With it, the same function reference is returned as long as `id` stays the same.

## Why Does It Exist?

Functions in JavaScript are objects. Two functions with identical code are not equal by reference:

```javascript
const a = () => console.log('hi');
const b = () => console.log('hi');
a === b; // false
```

This matters in React because when a parent re-renders, every function defined in the body is recreated. If those functions are passed as props to children wrapped in `React.memo`, the children will re-render anyway — `React.memo`'s shallow comparison sees a new function reference and concludes the prop changed.

`useCallback` solves this by stabilizing the function reference. The child receives the same function object until the dependency changes, so `React.memo` can actually prevent the re-render.

The same issue applies to `useEffect` dependency arrays: if an effect depends on a callback that's recreated every render, the effect fires every render.

## How It Works

`useCallback(fn, deps)` is mechanically identical to `useMemo(() => fn, deps)`. React stores the function on the component's internal fiber. On subsequent renders, it compares the deps array using `Object.is`. If all deps are equal, it returns the stored function reference. If any dep changed, it stores the new function and returns it.

```javascript
// These are exactly equivalent:
const fn1 = useCallback(() => doWork(x), [x]);
const fn2 = useMemo(() => () => doWork(x), [x]);
```

The separation into two hooks is purely ergonomic — `useCallback` is cleaner to read when you're obviously caching a function.

## The Parent-Child Re-Render Chain

The canonical use case:

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  // Without useCallback: new reference on every render
  const handleSubmit = useCallback(() => {
    console.log(text);
  }, [text]);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <ExpensiveChild onSubmit={handleSubmit} />
    </>
  );
}

const ExpensiveChild = React.memo(({ onSubmit }) => {
  // Only re-renders when onSubmit reference changes
  return <button onClick={onSubmit}>Submit</button>;
});
```

When `count` changes, `Parent` re-renders. Without `useCallback`, `handleSubmit` is a new function, `ExpensiveChild` sees a new prop, and it re-renders even though `text` hasn't changed. With `useCallback`, `handleSubmit` is the same reference (since `text` didn't change), and `ExpensiveChild` stays stable.

Note the requirement: **`useCallback` is only useful when paired with `React.memo`** (or when the function is a dep in another hook). Without `React.memo` on the child, stabilizing the function reference accomplishes nothing.

## Stable Refs in useEffect Dependencies

```javascript
function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');

  // onSearch comes from parent — if it's recreated every render,
  // this effect fires on every parent render
  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

If the parent wraps `onSearch` in `useCallback`, the effect only re-fires when `query` or the actual search logic changes. Without `useCallback` in the parent, the effect fires on every parent re-render regardless of `query`.

This is a subtler use case but equally valid. Any callback that appears in an effect's dep array should be stable.

## When NOT to Use It

`useCallback` costs something every render: it runs the deps comparison, stores the function, and adds cognitive load. For the majority of callbacks, this cost outweighs any benefit.

**Don't use it for inline event handlers on DOM elements:**

```javascript
// ❌ Pointless — DOM elements don't use React.memo
<button onClick={useCallback(() => doThing(), [])}>Click</button>

// ✅ Just pass the function
<button onClick={() => doThing()}>Click</button>
```

React doesn't memoize event bindings to DOM elements. The function being recreated here has zero impact on performance.

**Don't use it without React.memo on the recipient:**

```javascript
// ❌ useCallback is wasted — ChildComponent re-renders anyway
const handler = useCallback(() => doWork(), []);
<ChildComponent onAction={handler} />

// ChildComponent without React.memo re-renders whenever parent renders,
// regardless of whether props changed
```

`useCallback` only prevents re-renders if the child is actually bailing out via `React.memo`. Check that the optimization chain is complete before adding `useCallback`.

**Don't memoize cheap functions:**

```javascript
// ❌ The overhead of useCallback exceeds any savings
const double = useCallback((n) => n * 2, []);
```

## The Stale Closure Connection

A function "closes over" variables from the enclosing scope at the time it was created. If you memoize a function but forget to include a variable in the deps, the function captures an old value:

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  // ❌ Bug: count is captured at value 0, never updates
  const logCount = useCallback(() => {
    console.log(count); // Always logs 0
  }, []); // Missing `count` in deps

  return <button onClick={logCount}>Log</button>;
}
```

The ESLint rule `react-hooks/exhaustive-deps` catches this. For values that change frequently but you don't want to invalidate the memoized function, use a ref:

```javascript
function Counter() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  // Stable function that always reads the latest count via ref
  const logCount = useCallback(() => {
    console.log(countRef.current);
  }, []); // No stale closure — reads from ref at call time
}
```

## Gotchas

### 1. useCallback alone doesn't prevent re-renders

`useCallback` stabilizes a function reference. It does not prevent anything from re-rendering by itself. The re-render prevention comes from `React.memo` on the child. Without that, `useCallback` is pure overhead.

### 2. Every dep change invalidates the function

```javascript
const handler = useCallback(() => {
  process(a, b, c, d, e);
}, [a, b, c, d, e]);
```

If any of those five deps changes, you get a new function reference, and all downstream children using this callback re-render. A function with many deps may change so frequently that memoization provides little benefit.

### 3. The empty dependency array is usually wrong

```javascript
// ❌ Likely a stale closure bug
const handleClick = useCallback(() => {
  submit(formData); // formData never updates in this callback
}, []);
```

An empty array means "never recreate this function." That only makes sense for functions that genuinely depend on no state or props — utility functions that only use their arguments.

### 4. Object and array deps are unstable

```javascript
// ❌ options is recreated every render, so useCallback never caches
const handler = useCallback(() => process(options), [options]);
// where options is { key: 'value' } defined inline above
```

If a dep is itself an unstable reference, the memoization is pointless. Stabilize deps before memoizing.

### 5. Context values as deps

```javascript
const { user } = useContext(AuthContext);
const handleAction = useCallback(() => doWork(user.id), [user]);
```

If `user` is a new object reference on every context value change (even if `user.id` is the same), `handleAction` is invalidated unnecessarily. Consider using `user.id` in deps instead of `user`.

## Interview Questions

**Q: When does `useCallback` actually prevent a re-render?**

Strong answer: `useCallback` by itself never prevents anything from re-rendering. It stabilizes a function reference. The re-render prevention happens in the child component through `React.memo`. The full chain is: parent re-renders → `useCallback` returns the same function reference → `React.memo` compares old and new props via shallow equality → sees same reference → skips the child's re-render. If any link in that chain is missing — either `useCallback` is absent or `React.memo` is absent — the optimization doesn't work. This is why you should always check that both pieces are in place before adding `useCallback`.

The trap: Candidates say "`useCallback` prevents re-renders" without understanding the mechanism. The strong answer names both pieces and explains how they interact.

---

**Q: What's the difference between `useCallback` and `useMemo`?**

Strong answer: Mechanically, none — `useCallback(fn, deps)` is exactly `useMemo(() => fn, deps)`. Both cache a value between renders and recompute when deps change. The difference is semantic: `useMemo` caches the *result of calling* a function (a computed value), while `useCallback` caches the *function itself* (to be called later). React provides both for readability. Use `useMemo` when you want a derived value; use `useCallback` when you want a stable function reference.

The trap: Candidates treat them as fundamentally different. Understanding they're the same mechanism makes it obvious why they have the same pitfalls (stale closures, unstable deps, overhead costs).

---

**Q: Why is `useCallback` with an empty dep array sometimes a bug?**

Strong answer: An empty dep array means the function is created once and never recreated. Any state or props it closes over are captured at their initial values and will be stale for the rest of the component's life. For example, `useCallback(() => submit(formData), [])` will always submit the initial `formData` value, never the current one. An empty array is only correct for functions that genuinely have no dependencies — functions that only use their own arguments or import-level constants. The ESLint `exhaustive-deps` rule catches this class of bug automatically.

The trap: Thinking "empty array = runs once = good performance." That logic is for `useEffect`. For `useCallback`, an empty array with missing deps means a stale closure.

---

**Q: You've added `useCallback` but the child still re-renders on every parent render. Why?**

Strong answer: Most likely the child isn't wrapped in `React.memo`. `useCallback` stabilizes the function reference, but if the child re-renders unconditionally whenever the parent renders (the default behavior), the stable reference doesn't help. The other common cause is that the callback's deps are unstable — an object or array dep is being recreated every render, so `useCallback` is getting a new dep every time and returning a new function anyway. A third possibility: the child is memoized but has other props changing. `React.memo` skips a re-render only if *all* props are shallow-equal.

The trap: Blaming `useCallback` instead of diagnosing the full optimization chain. The right debugging approach is to verify React.memo is present, check that deps are stable, and verify no other props are changing.

---

*Next: [useContext](08-use-context.md) — Subscribing to shared state without prop drilling, and why it comes with a re-render cost you need to understand.*
