# useMemo

## What Is This?

`useMemo` is a hook that caches the result of an expensive computation. You give it a function and a dependency array; it runs the function once, returns the result, and only re-runs the function when one of the dependencies changes. Between dependency changes, it returns the same cached value.

```javascript
const sortedItems = useMemo(() => {
  return items.slice().sort((a, b) => a.price - b.price);
}, [items]);
```

Every render, `sortedItems` is the same reference — the sort only runs again if `items` changes.

## Why Does It Exist?

Two related problems:

**1. Expensive computations.** React re-renders components frequently. If a component does a slow computation (filtering thousands of rows, building a derived data structure, running a complex algorithm), and that computation doesn't depend on what just changed, recomputing it every render wastes CPU.

**2. Referential equality.** JavaScript objects and arrays are compared by reference, not value. `[] === []` is `false`. When a child component receives an object or array as a prop, and that object is recreated on every render of the parent, `React.memo` on the child is useless — the prop always looks "new" even if its contents are identical. `useMemo` pins the reference so the prop stays stable until the underlying data actually changes.

These two use cases are distinct. The first is about raw CPU cycles. The second is about ensuring downstream components don't re-render unnecessarily.

## How It Works

### The Basics

```javascript
const result = useMemo(() => compute(a, b), [a, b]);
```

On the first render, React calls `compute(a, b)` and stores both the result and the current deps `[a, b]`.

On subsequent renders, React compares the new deps to the stored deps using `Object.is`. If they're all equal, React returns the stored result without calling the function again. If any dep changed, React calls the function again and stores the new result.

### What "Cached" Actually Means

React doesn't guarantee it will always preserve the cached value. In the current implementation it does, but React reserves the right to throw away caches — for example, when components are offscreen in concurrent mode or when the dev environment intentionally discards them (StrictMode double-invocation). Design your code so the memoized function is always safe to re-run — it should be pure and side-effect-free.

### Relationship to useMemo and useCallback

`useCallback(fn, deps)` is literally `useMemo(() => fn, deps)`. They're the same mechanism — `useMemo` caches a *value*, `useCallback` caches a *function reference*. Internally, React treats them identically.

## When to Use It

### Expensive Computations

```javascript
function ProductList({ products, searchTerm }) {
  // Filters potentially thousands of items
  const filtered = useMemo(
    () => products.filter(p => p.name.includes(searchTerm)),
    [products, searchTerm]
  );

  return filtered.map(p => <ProductCard key={p.id} product={p} />);
}
```

Without `useMemo`, `products.filter(...)` runs on every render of `ProductList` — even if neither `products` nor `searchTerm` changed. With it, the filter result is cached until one of them changes.

Rule of thumb: if the computation takes < 1ms, `useMemo` isn't worth it. If it takes > ~10ms (measure it), it is.

### Stable Object/Array References for Downstream Memoization

```javascript
function Parent({ userId }) {
  // Without useMemo: new object on every render
  const config = useMemo(() => ({ threshold: 100, userId }), [userId]);

  return <Chart config={config} />;
}

const Chart = React.memo(({ config }) => {
  // Only re-renders when config reference changes
  return <canvas />;
});
```

`React.memo` on `Chart` does a shallow comparison of props. If `config` is a new object every render (even with the same values), shallow comparison fails and `Chart` re-renders anyway. `useMemo` keeps `config` as the same reference until `userId` changes.

### Stable References in useEffect Dependencies

```javascript
function Component({ filters }) {
  const normalizedFilters = useMemo(
    () => filters.map(f => f.trim().toLowerCase()),
    [filters]
  );

  useEffect(() => {
    fetchData(normalizedFilters);
  }, [normalizedFilters]); // Stable reference — won't re-fire unless filters changes
}
```

Without `useMemo`, `normalizedFilters` is a new array every render, and the effect would fire on every render regardless of whether `filters` actually changed.

## When NOT to Use It

This is the more important section. `useMemo` has a cost:

- It executes a function to store the result (adds work on first render)
- It compares deps on every render (adds work on every render)
- It increases memory usage (storing the cached result)
- It adds cognitive overhead (more code, more mental model)

For cheap operations, `useMemo` is net negative:

```javascript
// ❌ Not worth it
const total = useMemo(() => a + b, [a, b]);

// ✅ Just compute it
const total = a + b;
```

`useMemo` is worth it when:
1. The computation is measurably slow
2. The result is passed to a child wrapped in `React.memo` or used in an effect dep array

Don't add it preemptively. Profile first.

## Gotchas

### 1. Forgetting deps breaks the cache

```javascript
// ❌ Bug: sortBy is used but not in deps
const sorted = useMemo(() => {
  return items.sort(sortBy);
}, [items]); // sortBy not listed — sorted uses stale sortBy
```

The ESLint rule `react-hooks/exhaustive-deps` catches this. Never suppress it without understanding why.

### 2. The function must be pure

`useMemo` can re-run at any time (React may discard the cache). If your function has side effects, they'll fire unpredictably:

```javascript
// ❌ Never do this
const value = useMemo(() => {
  fetch('/api/data'); // Side effect in useMemo
  return computeResult();
}, [dep]);
```

Side effects belong in `useEffect`.

### 3. Object identity in deps

```javascript
// ❌ Deps object is new every render — useMemo never caches
const result = useMemo(() => compute(options), [options]);
// where options = { key: 'value' } inline in the parent

// ✅ Memoize the options first, then use as dep
const stableOptions = useMemo(() => ({ key: 'value' }), []);
const result = useMemo(() => compute(stableOptions), [stableOptions]);
```

If a dep is itself recreated every render, the memoization is pointless. You're paying the overhead with no benefit.

### 4. StrictMode runs it twice in development

React StrictMode double-invokes the `useMemo` function in development to help you find impure computations. This is intentional. In production, it only runs once.

### 5. Memoizing doesn't mean the component won't re-render

`useMemo` caches a *value*, not a render. The component still re-renders on every state/prop change. `useMemo` just ensures the computed value is stable across those re-renders if its deps haven't changed. For preventing child re-renders, you need `React.memo` on the child component.

### 6. Premature optimization is the leading misuse

The most common wrong use of `useMemo` is memoizing values that are never bottlenecks:

```javascript
// These are all unnecessary
const displayName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);
const isAdmin = useMemo(() => role === 'admin', [role]);
const doubled = useMemo(() => count * 2, [count]);
```

These computations take nanoseconds. The overhead of `useMemo` likely exceeds their cost.

## Interview Questions

**Q: What does `useMemo` actually do, and when should you reach for it?**

Strong answer: `useMemo` memoizes a computed value — it caches the return value of a function and only recomputes it when the listed dependencies change. There are two scenarios where it genuinely helps: (1) computationally expensive operations that would otherwise run on every render, and (2) stabilizing object/array references that are passed to `React.memo`-wrapped children or used in effect dependency arrays. For anything that computes in under a millisecond, `useMemo` adds overhead without benefit. The right default is to not use it and add it only after profiling confirms a bottleneck.

The trap: Candidates either over-apply it everywhere ("wrap everything in useMemo for performance") or under-apply it ("I just use state"). The strong answer explains the two distinct problems it solves and adds the nuance that it has real costs.

---

**Q: What's the difference between `useMemo` and `useCallback`?**

Strong answer: `useCallback(fn, deps)` is syntactic sugar for `useMemo(() => fn, deps)`. They're mechanically identical — both cache a value across renders, only recomputing when deps change. The difference is what they cache: `useMemo` caches the *return value* of a function call; `useCallback` caches the *function itself*. Use `useMemo` for computed data, use `useCallback` for event handlers or callbacks passed to children.

```javascript
// These are equivalent:
const stableFn = useCallback(() => doWork(a), [a]);
const stableFn = useMemo(() => () => doWork(a), [a]);
```

The trap: Many candidates think they're completely different hooks with different internals. Understanding they're the same mechanism reveals when and why to use each.

---

**Q: If I wrap an expensive computation in `useMemo`, will the component stop re-rendering?**

Strong answer: No. `useMemo` doesn't prevent re-renders — it only prevents re-running the computation on re-renders. The component still re-renders on every state/prop change. `useMemo` ensures the memoized value is the same reference when deps haven't changed, which matters for downstream components using `React.memo` or effects with that value as a dependency. To prevent a child component from re-rendering, you need `React.memo` on the child. `useMemo` and `React.memo` work together, but they're different tools doing different things.

The trap: Conflating "memoize a value" with "skip rendering." Candidates who mix these up will implement memoization that doesn't actually solve the performance problem they think it does.

---

**Q: Can React ever ignore your `useMemo` cache and re-run the function?**

Strong answer: Yes. React explicitly reserves the right to discard memoized values — this is documented behavior, not a quirk. In practice it happens during offscreen rendering in concurrent mode, or when React reclaims memory. This is why `useMemo` functions must be pure and have no side effects: the function needs to be safe to re-run at any time. Treating `useMemo` as a side-effect mechanism ("only fetch once") is wrong. For guaranteed single-execution with cleanup, use `useEffect`.

The trap: Assuming `useMemo` guarantees the function runs exactly once. It doesn't. Only initialization patterns with `useRef` or `useEffect` give you that guarantee.

---

**Q: Why would `useMemo` make no difference even when wrapped correctly?**

Strong answer: The most common reason is that the deps themselves are unstable — they're new objects or arrays created inline, so they're always "different" on every render even if their contents are the same. For example, if you write `useMemo(() => compute(options), [options])` but `options` is `{ key: 'value' }` defined inline in the parent, `options` is a new object every render and the memo never caches. The fix is to memoize the dep first, or break it down to primitives. The second common reason is the wrong mental model — checking that the child is actually wrapped in `React.memo`, otherwise a stable reference doesn't help.

The trap: Fixing the symptom ("my component is slow") without understanding *why* memoization isn't working. Unstable deps is the #1 cause of useless `useMemo` wrappers.

---

*Next: [useCallback](07-use-callback.md) — The same mechanism as useMemo but for stabilizing function references passed to child components.*
