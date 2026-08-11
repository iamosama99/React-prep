# useMemo

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Memoized value | Cached result of a factory function, keyed by deps | Skips expensive recomputation when inputs haven't changed |
| Stable reference | Same object/array identity when deps unchanged | Prevents unnecessary re-renders of memoized children |
| Factory must be pure | No side effects; React may discard the cache | Side effects in `useMemo` are a bug waiting to happen |
| Not a guarantee | React can drop the cache between renders | Correctness must not depend on the cache existing |

## What Is This?

`useMemo` is a React hook that memoizes (caches) the return value of a function. You give it a "factory" function and a dependency array. React calls the factory on the first render, stores the result, and on subsequent renders only re-calls the factory if one of the dependencies has changed.

```javascript
const expensiveResult = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

It serves two distinct purposes:
1. **Skip expensive recomputation** — avoid redoing heavy work when inputs haven't changed.
2. **Stabilize references** — keep the same object/array identity so memoized children don't re-render.

> **Check yourself:** If you remove the dependency array entirely from `useMemo`, what happens? Does it memoize anything?

## Why Does It Exist?

React re-renders a function component whenever its parent renders, state updates, or context changes. Every render re-executes the entire function body — every variable, object literal, array, and computation is recreated from scratch.

For cheap operations (`array.length`, simple math), this is fine. But some computations are genuinely expensive: filtering thousands of items, sorting large datasets, parsing complex data structures. Running those on every render wastes CPU time and makes the UI feel sluggish.

Additionally, even cheap operations that create new objects or arrays produce *new references*. If those references are passed as props to children wrapped in `React.memo`, the children re-render unnecessarily because the reference changed even though the data didn't.

`useMemo` solves both problems: it caches the result and returns the *same* result (same reference) until a dependency changes.

## How It Works

### The Mechanism

When you call `useMemo(factory, deps)`:

1. **First render**: React calls `factory()`, stores the returned value, and returns it.
2. **Subsequent renders**: React compares each dependency with its previous value using `Object.is()`. If *all* dependencies are the same, React skips calling the factory and returns the cached value. If *any* dependency changed, React calls the factory again, caches the new result, and returns it.

```javascript
const [query, setQuery] = useState('');
const [counter, setCounter] = useState(0);

// Without useMemo: runs on EVERY render (including counter changes)
const filtered = items.filter(item => item.name.includes(query));

// With useMemo: only runs when `items` or `query` change
const filtered = useMemo(() => {
  return items.filter(item => item.name.includes(query));
}, [items, query]);
```

> **Check yourself:** In the code above, if you click a button that increments `counter`, does the filter run? With `useMemo`? Without?

### The Cache Is a Hint, Not a Contract

React's documentation explicitly states that `useMemo` is an optimization hint. React *may* discard cached values if it needs to free memory. Your code must work correctly even if the factory runs on every render — `useMemo` should only affect *performance*, never *correctness*.

```javascript
// ✅ Correct: code works with or without the cache
const sorted = useMemo(() => [...items].sort(compareFn), [items]);

// ❌ Wrong: code relies on the cache for correctness
const id = useMemo(() => Math.random(), []); // Don't use useMemo to generate stable IDs
```

### Dependency Comparison

React uses `Object.is()` to compare dependencies. This means:

- Primitives (numbers, strings, booleans) are compared by value.
- Objects, arrays, and functions are compared by *reference*.

```javascript
// This dependency is always "new" — useMemo recalculates every time
const options = { sortBy: 'name' };
const result = useMemo(() => process(data, options), [data, options]);
// options is a new object every render → deps always change → useless!

// Fix: move the object outside the component or memoize it too
const options = useMemo(() => ({ sortBy: 'name' }), []);
const result = useMemo(() => process(data, options), [data, options]);
```

> **Check yourself:** If one of your `useMemo` dependencies is an inline object literal like `{ key: 'value' }`, will the memoization ever prevent recalculation? Why or why not?

## Use Case 1: Skip Expensive Computation

```javascript
function ProductList({ products, searchTerm }) {
  // Filtering 10,000 products is expensive
  const filtered = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  return (
    <ul>
      {filtered.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

Without `useMemo`, typing in an unrelated input field that causes a parent re-render would re-filter 10,000 products every time — even though `products` and `searchTerm` haven't changed.

## Use Case 2: Stable Reference for Memoized Children

```javascript
const MemoizedChart = memo(function Chart({ data }) {
  // Expensive chart rendering
  return <canvas>{/* ... */}</canvas>;
});

function Dashboard() {
  const [counter, setCounter] = useState(0);
  const rawData = useRawData();

  // Without useMemo: new array every render → Chart re-renders
  // With useMemo: same array reference → Chart skips re-render
  const chartData = useMemo(() => {
    return rawData.map(d => ({ x: d.date, y: d.value }));
  }, [rawData]);

  return (
    <>
      <button onClick={() => setCounter(c => c + 1)}>Counter: {counter}</button>
      <MemoizedChart data={chartData} />
    </>
  );
}
```

The key insight: `useMemo` alone doesn't prevent child re-renders. The child *must also* be wrapped in `React.memo`. Both are required.

## Use Case 3: Context Value Stabilization

```javascript
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // ❌ New object every render → all consumers re-render
  const value = { user, login, logout };

  // ✅ Stable reference → consumers only re-render when user changes
  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

This is one of the most impactful uses of `useMemo` in real apps. A context provider at the top of the tree can trigger re-renders of *every* consumer if its value changes reference on every render.

## useMemo vs useCallback

`useCallback` is syntactic sugar for memoizing a function reference. Under the hood:

```javascript
// These are equivalent
const memoizedFn = useCallback(fn, deps);
const memoizedFn = useMemo(() => fn, deps);
```

| Aspect | useMemo | useCallback |
|--------|---------|-------------|
| **Memoizes** | Any computed value | A function reference |
| **Returns** | The result of calling the factory | The function itself (not its result) |
| **Use for** | Expensive calculations, stable objects/arrays | Stable callbacks passed to memoized children |
| **Equivalent** | `useMemo(() => fn, deps)` = `useCallback(fn, deps)` | `useCallback(fn, deps)` = `useMemo(() => fn, deps)` |

> **Check yourself:** If you write `useMemo(() => myFunction, [])`, what does it return — the function itself, or the result of calling `myFunction()`? How is this different from `useMemo(() => myFunction(), [])`?

## When to Use It

- ✅ Expensive calculations that run on every render (filtering, sorting, parsing large data)
- ✅ Objects or arrays passed as props to `React.memo`-wrapped children
- ✅ Context provider values that would otherwise cause broad re-renders
- ✅ Values used as dependencies in other hooks (`useEffect`, `useCallback`)

## When NOT to Use It

- ❌ Cheap operations like `array.length`, simple math, string concatenation
- ❌ Values that aren't passed to memoized children (no one benefits from the stable reference)
- ❌ As a replacement for proper state management
- ❌ When correctness depends on the cache (it's a hint, not a guarantee)

```javascript
// ❌ Pointless: addition is instant
const total = useMemo(() => price + tax, [price, tax]);

// ❌ Pointless: child isn't memoized
const data = useMemo(() => transform(rawData), [rawData]);
return <PlainChild data={data} />; // PlainChild re-renders anyway
```

## Gotchas

### 1. useMemo doesn't prevent the component itself from re-rendering

```javascript
const Parent = () => {
  const [count, setCount] = useState(0);
  const data = useMemo(() => expensiveWork(), []);

  // Parent STILL re-renders when count changes.
  // useMemo just skips re-running expensiveWork().
  return <div>{count}</div>;
};
```

`useMemo` optimizes *what work happens inside* a render, not *whether* the render happens.

### 2. Inline dependencies defeat the purpose

```javascript
// ❌ Deps change every render because {} creates a new reference
const result = useMemo(() => compute(config), [{ sort: 'asc' }]);

// ✅ Use a stable reference or primitive deps
const result = useMemo(() => compute('asc'), ['asc']);
```

### 3. Missing dependencies cause stale values

```javascript
const [multiplier, setMultiplier] = useState(2);

// ❌ Missing `multiplier` — result uses stale multiplier value
const doubled = useMemo(() => items.map(i => i * multiplier), [items]);

// ✅ Include all referenced values
const doubled = useMemo(() => items.map(i => i * multiplier), [items, multiplier]);
```

### 4. Side effects inside useMemo

```javascript
// ❌ Side effects in the factory — React may call it unpredictably
const result = useMemo(() => {
  fetch('/api/data'); // Side effect!
  return computeValue();
}, [deps]);

// ✅ Side effects belong in useEffect
useEffect(() => {
  fetch('/api/data');
}, [deps]);
```

The factory must be pure. React may call it multiple times or skip it — side effects would behave unpredictably.

### 5. Over-memoization adds overhead

```javascript
// ❌ Premature: memoizing a trivial operation adds more overhead than it saves
const fullName = useMemo(() => `${first} ${last}`, [first, last]);

// ✅ Just compute it
const fullName = `${first} ${last}`;
```

Every `useMemo` call costs memory (storing the cached value) and CPU (comparing dependencies). If the computation is trivial, the overhead of `useMemo` may exceed the cost of just recomputing.

### 6. useMemo alone cannot prevent child re-renders

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  const data = useMemo(() => [1, 2, 3], []);

  // Child is NOT wrapped in React.memo → re-renders every time Parent renders
  return <Child data={data} />;
}
```

For `useMemo` to prevent child re-renders, **both** conditions must be true:
1. The value is wrapped in `useMemo`
2. The child is wrapped in `React.memo`

> **Check yourself:** You have `useMemo` on a value and pass it to a `React.memo` child. But the child still re-renders. What else might be going on? (Hint: does the child receive other props that change?)

## Interview Questions

**Q (High): What is the difference between `useMemo` and `useCallback`?**

Answer: `useMemo` memoizes a *computed value* — it calls the factory and caches its return value. `useCallback` memoizes a *function reference* — it returns the function itself without calling it. Under the hood, `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`.

Use `useMemo` when you need to cache the result of an expensive calculation or stabilize an object/array reference. Use `useCallback` when you need a stable function identity (typically for callbacks passed to memoized children or as dependencies in other hooks).

The trap: Saying they're interchangeable or that both are "just for performance." They memoize different things — values vs functions — and serve different purposes.

---

**Q (High): When should you avoid `useMemo`?**

Answer: Avoid it for cheap calculations (simple math, string concatenation, `array.length`), because the overhead of dependency comparison and cache storage exceeds the cost of recomputation. Also avoid it when the memoized value isn't passed to a memoized child — there's no one to benefit from the stable reference.

`useMemo` is not free. It costs memory (cached value + dependency array) and CPU (Object.is comparisons on every render). Overusing it makes code harder to read without measurable benefit.

The trap: Thinking `useMemo` should wrap every object literal or array. Profile first, optimize second.

---

**Q (High): Why is `useMemo` described as a "hint" rather than a guarantee?**

Answer: React's documentation states that the cache may be discarded between renders. React could drop cached values to free memory or during concurrent rendering. Your code must produce correct results whether the factory runs once or every render — `useMemo` should only affect performance, not behavior.

This means you should never use `useMemo` to guarantee a stable identity for correctness (like generating a random ID once). For that, use `useRef`.

The trap: Building logic that breaks if the factory re-runs. If removing `useMemo` changes behavior (not just performance), there's a bug.

---

**Q (High): You wrap a value in `useMemo` and pass it to a child, but the child still re-renders on every parent render. Why?**

Answer: Most likely the child is not wrapped in `React.memo`. `useMemo` stabilizes the *reference*, but React still re-renders all children when the parent renders — unless the child is explicitly memoized with `React.memo`. Both are required.

Other possibilities: the child receives another prop that *does* change, or the dependency array in `useMemo` is wrong (inline objects, functions) causing the value to be recalculated anyway.

The trap: Assuming `useMemo` alone prevents re-renders. It doesn't. It stabilizes a value; `React.memo` is what prevents the re-render.

---

**Q (Medium): How does React compare dependencies in `useMemo`?**

Answer: React uses `Object.is()` to compare each dependency with its value from the previous render. For primitives, this is value equality. For objects, arrays, and functions, this is *reference* equality — two objects with identical contents but different references are considered different.

This means inline object literals `{}`, array literals `[]`, and arrow functions `() => {}` are *always* different across renders, which defeats memoization if used as dependencies.

The trap: Not understanding reference equality. Developers pass `[items.filter(...)]` as a dependency, which is always a new array reference, making `useMemo` useless.

---

**Q (Medium): How do you decide between `useMemo` and just computing the value?**

Answer: Measure first. If the computation takes less than ~1ms, don't memoize. If the component re-renders frequently and the computation is expensive (filtering/sorting large lists, parsing JSON, complex math), `useMemo` helps. Also use it when reference stability matters for downstream memoization.

A good rule of thumb: if you can't observe the performance difference, don't add `useMemo`. It adds complexity and cognitive overhead. React's recommendation is to default to no memoization and add it only when you have a measured performance problem.

The trap: Premature optimization. Wrapping everything in `useMemo` makes code harder to read and can even be slower due to overhead.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the two reasons to use `useMemo`: expensive computation and stable reference identity
- [ ] Can articulate why `useMemo` alone cannot stop a child from re-rendering if the child is not wrapped in `React.memo`
- [ ] Can state that the factory function must be pure and explain what breaks if it has side effects
- [ ] Can name at least two situations where `useMemo` is unnecessary overhead
- [ ] Can explain how `useMemo` relates to `useCallback` under the hood
- [ ] Can explain why `useMemo` is a "hint" and what that means for correctness

---

*Next: [useCallback](../07-use-callback/notes.md) — stable function identity is the next concern after stable values.*
