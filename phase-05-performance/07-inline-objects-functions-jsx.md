# Inline Objects and Functions in JSX

## What Is This?

Every time your component renders, any object literal, array literal, or function expression written inline in JSX creates a new value with a new memory reference. Since `React.memo` and most hook dependency comparisons use `Object.is` (reference equality), these new references defeat memoization and cause unnecessary re-renders — even when the data or behavior is logically identical to the previous render.

```js
// Each render of Parent creates a new `style` object and a new `onClick` function.
// If Child is memoized, memo always fails — new references every render.
function Parent() {
  return (
    <Child
      style={{ color: 'red' }}
      onClick={() => console.log('clicked')}
    />
  );
}
```

---

## Why Does It Exist?

This is not a React design flaw — it's a consequence of how JavaScript works. Object literals and function expressions are evaluated at runtime, and each evaluation produces a new value. In a language without persistent data structures or structural equality checks, `{} !== {}`.

React's comparison model is deliberately simple: `Object.is`. Deep equality checks across arbitrary prop trees would be expensive and would give React a false sense of what has "changed." The answer is to make references stable when the underlying value is stable.

---

## How Each Inline Type Creates Reference Instability

### Inline objects

```js
// New object reference on every render:
<Component config={{ timeout: 5000, retries: 3 }} />

// New array reference on every render:
<Component items={[1, 2, 3]} />

// New style object on every render:
<div style={{ margin: '0 auto', maxWidth: 960 }} />
```

### Inline functions (event handlers, callbacks)

```js
// New function reference on every render:
<button onClick={() => handleClick(id)}>Delete</button>

// Also a new function:
<Input onChange={function(e) { setValue(e.target.value); }} />
```

### Inline JSX (children)

```js
// New React element object on every render:
<Tooltip content={<span>Help text</span>} />
```

---

## When It Actually Matters

**It doesn't matter for most components** — the child renders anyway (no memo), and the re-render is cheap. Don't optimize blindly.

It matters when:
1. The child is wrapped in `React.memo` and the inline prop is defeating the bailout
2. The inline value is in a `useEffect` / `useMemo` / `useCallback` dependency array — the effect fires every render because the dep is "new" every render
3. The inline value is passed to a custom hook that uses it as a dep

---

## The Fixes

### 1. Hoist to module-level constants

For objects and arrays that never change, define them outside the component. They're created once at module load time and the same reference is reused forever.

```js
// Module-level — created once, reference is stable
const DEFAULT_CONFIG = { timeout: 5000, retries: 3 };
const INITIAL_ITEMS = [1, 2, 3];

function Parent() {
  return <Child config={DEFAULT_CONFIG} items={INITIAL_ITEMS} />;
}
```

This is the simplest and cheapest fix — no hook overhead, no re-evaluation on every render.

### 2. useMemo for computed objects

When the object's content depends on props or state, `useMemo` gives you a stable reference that only changes when its inputs change:

```js
function Parent({ userId, role }) {
  const userConfig = useMemo(
    () => ({ userId, role, timestamp: Date.now() }),
    [userId, role]
  );

  return <Child config={userConfig} />;
}
```

Now `userConfig` is the same object reference until `userId` or `role` changes.

### 3. useCallback for functions

`useCallback` is `useMemo` for functions — it returns the same function reference until deps change:

```js
function Parent({ itemId, onSuccess }) {
  const handleDelete = useCallback(() => {
    deleteItem(itemId).then(onSuccess);
  }, [itemId, onSuccess]);

  return <MemoChild onDelete={handleDelete} />;
}
```

### 4. Move JSX into a stable variable

For inline JSX that doesn't depend on component state, create it at module level or memoize it:

```js
// Module-level JSX (no deps):
const HELP_TOOLTIP = <span>Help text</span>;

function Parent() {
  return <Tooltip content={HELP_TOOLTIP} />;
}

// Or memo'd JSX with deps:
function Parent({ label }) {
  const tooltipContent = useMemo(() => <span>{label}</span>, [label]);
  return <Tooltip content={tooltipContent} />;
}
```

---

## The Dependency Array Problem

Inline objects and functions in `useEffect` / `useMemo` / `useCallback` dependency arrays cause those hooks to run on every render:

```js
function Component({ userId }) {
  // Bug — `options` is new on every render, so this effect fires every render:
  const options = { include: ['name', 'email'] };

  useEffect(() => {
    fetchUser(userId, options);
  }, [userId, options]); // options is always "new"
}
```

Fixes:

```js
// Option 1 — hoist to module level if constant:
const USER_OPTIONS = { include: ['name', 'email'] };

useEffect(() => {
  fetchUser(userId, USER_OPTIONS);
}, [userId]); // no dep on options — it's stable

// Option 2 — useMemo if computed:
const options = useMemo(() => ({ include: ['name', 'email'] }), []);

useEffect(() => {
  fetchUser(userId, options);
}, [userId, options]); // stable reference now

// Option 3 — move the object inside the effect (remove it from deps):
useEffect(() => {
  fetchUser(userId, { include: ['name', 'email'] });
}, [userId]); // object created inside effect, not a dep
```

Option 3 is often the cleanest — if the object is only used inside the effect, it doesn't need to be a dep at all.

---

## A Systematic Approach to Inline Reference Bugs

When diagnosing "why is this hook/memo misfiring":

1. Open the dependency array
2. For each dep, ask: "is this a primitive or an object/array/function?"
3. For each non-primitive dep, ask: "where is it created? Is it re-created on every render?"
4. Fix: hoist (if stable), `useMemo`/`useCallback` (if computed), or move inside the hook (if only used there)

---

## Gotchas

**1. `useCallback` and `useMemo` are not free.**

Both hooks allocate a closure, store deps, and run a comparison on every render. For trivial functions and objects, the hook overhead can exceed the cost of just re-rendering. Don't memoize everything — profile first.

**2. Stable references require stable deps.**

If your `useCallback` deps include a non-stable value (another inline object), you've just moved the instability one level up. Stability chains: every dep of a `useCallback` must itself be stable.

```js
// handleDelete is stable, but only if onSuccess is also stable.
// If onSuccess is a new function on every Parent render, handleDelete is too.
const handleDelete = useCallback(() => {
  deleteItem(itemId).then(onSuccess);
}, [itemId, onSuccess]); // onSuccess must be stable
```

**3. Style objects and CSS-in-JS.**

Inline style objects are a common source of reference instability. For static styles, use CSS classes. For dynamic styles that only change when specific values change, `useMemo`. For styles that always correspond to a specific prop state, CSS custom properties or a data attribute are simpler.

**4. Event handlers in lists.**

Generating an `onClick` per list item inline:

```js
// New function for every item on every render:
items.map(item => (
  <Row key={item.id} onClick={() => handleClick(item.id)} />
))
```

If `Row` is memoized, memo never bails out — new function per item per render. Fix: pass the `handleClick` function and the `id` separately, and let `Row` call `handleClick(id)` — or use event delegation at the list level instead.

**5. Context value objects.**

This is the most impactful inline object problem in many apps:

```js
// New value object on every App render — all consumers re-render:
<Context.Provider value={{ user, logout, theme }}>
```

Fix: `useMemo` the value object, or split into separate contexts per concern.

---

## Interview Questions

**Q (High): Why does `React.memo` sometimes fail to prevent re-renders even when the data hasn't changed?**

Answer: Because `React.memo` uses `Object.is` to compare each prop, and `Object.is` for objects, arrays, and functions compares by reference. If the parent creates a new object literal, array, or function in its render body and passes it as a prop, the reference is new on every render — even if the content is identical. Memo sees the new reference as a changed prop and renders anyway. The fix is reference stability in the parent: hoist constant objects to module level, use `useMemo` for computed objects, and `useCallback` for functions.

---

**Q (High): You have a `useEffect` that fires on every render even though you've specified dependencies. What's likely happening?**

Answer: One or more deps in the dependency array is a non-primitive that's re-created on every render. `useEffect` compares deps with `Object.is` between renders. If a dep is an inline object (`{ key: value }`), an array (`[item]`), or a function defined in the render body, it produces a new reference each render — `Object.is` returns false, and the effect fires. Diagnosis: look at each dep, identify which is non-primitive, and find where it's created. Fix: hoist it to module level if constant, `useMemo`/`useCallback` if computed, or move it inside the effect if it's only used there (making it unnecessary as a dep).

---

**Q (Medium): What is the most common source of reference instability in React apps?**

Answer: Inline object and function expressions in JSX and hook dependency arrays. The most impactful instances in practice: (1) Context `value` props created as object literals — affects every context consumer on every provider re-render. (2) Inline `onClick` handlers created per list item — defeats memoization on list rows. (3) Options objects in `useEffect` deps — causes effects to fire every render. (4) Computed config objects passed to deeply nested components — propagates renders through the whole subtree. The pattern to fix all of them is the same: make references stable by hoisting, `useMemo`, or `useCallback`.

---

**Q (Low): Is it always worth adding `useMemo` or `useCallback` to stabilize a reference?**

Answer: No. Both hooks have overhead: they allocate a closure, store the dep array, and compare deps on every render. For a function that wraps a single statement and is passed to a non-memoized child, `useCallback` adds cost without benefit. For a tiny object used in an effect that rarely fires, the overhead of `useMemo` exceeds the cost of re-creating the object. The rule: stabilize a reference only when you've confirmed via profiling or logical analysis that the instability is causing a measurable problem — a wasted expensive render or a firing effect with side effects. Don't add memoization preemptively to "be safe."

---

*Next: Automatic Batching (React 18) — related to re-renders: React 18 batches multiple state updates together into a single render. Understanding what changed in React 18 explains why some apps got a free performance boost on upgrade.*
