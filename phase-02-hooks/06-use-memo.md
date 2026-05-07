# useMemo

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Memoized value | Cached result of a factory function, keyed by deps | Skips expensive recomputation when inputs haven't changed |
| Stable reference | Same object/array identity when deps unchanged | Prevents unnecessary re-renders of memoized children |
| Factory must be pure | No side effects; React may discard the cache | Side effects in `useMemo` are a bug waiting to happen |
| Not a guarantee | React can drop the cache between renders | Correctness must not depend on the cache existing |

## What Is This?

`useMemo` is a React hook for memoizing a computed value. It returns a cached result from the previous render when dependency inputs are unchanged, which helps avoid repeated expensive work and keeps object or array references stable.

> **Check yourself:** What are the two distinct reasons to use `useMemo` — one about computation cost and one about reference stability?

## Why Does It Exist?

React re-renders a function component whenever its parent renders or state updates. That means every inline calculation, object literal, or array literal is recreated on every render. `useMemo` exists so React can skip recomputation when the inputs are the same.

## How It Works

`useMemo` takes a factory function and a dependency array:

```js
const filtered = useMemo(() => items.filter(item => item.active), [items])
```

On mount, React calls the factory and stores the returned value. On subsequent renders, React compares each dependency by reference. If none changed, React returns the cached result instead of calling the factory again.

Because `useMemo` is a hint, React may discard the cached value if it chooses. The factory must be pure and side-effect-free.

### When to use it
- expensive calculations that would otherwise run on every render
- stable object or array values passed to memoized children
- avoiding a new function or object identity in context provider values

### When not to use it
- cheap operations like `array.length` or simple math
- every object or array literal in JSX
- trying to prevent a component from re-rendering; `useMemo` only stabilizes a value

> **Check yourself:** If you wrap `useMemo` around a value passed to a `React.memo` child, but the child is not wrapped in `React.memo`, does `useMemo` help prevent the child from re-rendering?

## Gotchas

- React compares dependencies by identity, so `[]`, `{}`, and inline functions are always new.
- Memoized values can be dropped between renders; don't rely on them for correctness.
- `useMemo` does not make renders free; it costs memory and dependency checks.
- `useMemo` is not a cache for async data or mutable values.

## Interview Questions

**Q (High): What is the difference between `useMemo` and `useCallback`?**

Answer: `useMemo` memoizes a computed value, while `useCallback` memoizes a function reference. Under the hood, `useCallback` is essentially the same as `useMemo(() => fn, deps)`. `useCallback` is useful only when a stable callback identity matters for child props, while `useMemo` is for expensive derived values.

The trap: saying they are interchangeable or that both are only for performance without mentioning stable identity versus cached values.

**Q (High): When should you avoid `useMemo`?**

Answer: avoid it for cheap calculations and for values that are already inexpensive to create. Overusing `useMemo` adds complexity and can cost more than it saves. It is not a cure-all for re-renders.

The trap: thinking `useMemo` should wrap every object or array literal.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the two reasons to use `useMemo`: expensive computation and stable reference identity
- [ ] Can articulate why `useMemo` alone cannot stop a child from re-rendering if the child is not wrapped in `React.memo`
- [ ] Can state that the factory function must be pure and explain what breaks if it has side effects
- [ ] Can name at least two situations where `useMemo` is unnecessary overhead
- [ ] Can explain how `useMemo` relates to `useCallback` under the hood

---

*Next: useCallback — stable function identity is the next concern after stable values.*
