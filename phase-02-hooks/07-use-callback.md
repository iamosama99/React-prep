# useCallback

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Stable function reference | Returns the same function object when deps unchanged | Prevents memoized children from re-rendering unnecessarily |
| `useMemo(() => fn, deps)` equivalence | `useCallback` is syntactic sugar over `useMemo` | Conceptually the same; `useCallback` is more readable for functions |
| Deps must be complete | Every external value referenced by the callback | Missing deps = stale closure inside the callback |
| Not a performance panacea | Adds overhead if child isn't memoized | Only useful when stable identity actually prevents renders |

## What Is This?

`useCallback` is a hook that returns a memoized version of a callback function. It preserves the function reference across renders when its dependency list does not change.

> **Check yourself:** If you wrap a callback in `useCallback` but the child component receiving it is not wrapped in `React.memo`, does `useCallback` have any effect on rendering?

## Why Does It Exist?

In React, functions defined inside a component are recreated on every render. That can break downstream optimizations such as `React.memo` or dependencies in other hooks. `useCallback` exists to provide a stable callback identity when the callback itself does not need to change.

## How It Works

`useCallback` takes a function and a dependency array:

```js
const handleClick = useCallback(() => {
  setCount(count + 1)
}, [count])
```

React keeps the same function object until one dependency changes. When the dependency array changes, React produces a new function reference.

`useCallback` is effectively a specialization of `useMemo`:

```js
const memoized = useMemo(() => fn, deps)
```

### Common use cases
- passing callbacks to memoized children
- stable event handlers for custom hooks
- avoiding re-creation of functions used in dependency arrays

> **Check yourself:** Why must every external value referenced inside a `useCallback` callback appear in the dependency array?

## Gotchas

- It is not a performance panacea; if the callback value is cheap and not passed to memoized components, `useCallback` may be unnecessary.
- Dependencies must include every external value referenced by the callback.
- If the callback is used only inside the component and never passed down, a plain function is usually cleaner.
- `useCallback` does not preserve closure values; it still recreates the callback when dependencies change.

## Interview Questions

**Q (High): When should you use `useCallback`?**

Answer: use it when you need a stable function reference, usually for memoized children or hooks that depend on callback identity. It is not required for every handler and should be reserved for cases where the reference itself affects rendering or effect behavior.

The trap: saying `useCallback` is needed for every event handler or that it prevents re-renders by itself.

**Q (High): Why does `useCallback` sometimes not help performance?**

Answer: because it adds dependency tracking and function recreation costs, and it does not avoid the component's own render. If children are not memoized or the function is cheap, `useCallback` can be a net loss.

The trap: assuming memoizing the function always makes the tree faster.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why `useCallback` is essentially `useMemo(() => fn, deps)` and what that means practically
- [ ] Can describe the exact condition where `useCallback` actually prevents a child re-render (child must also be `React.memo`-wrapped)
- [ ] Can identify when `useCallback` adds overhead without benefit
- [ ] Can explain the stale-closure risk when dependencies are omitted from the array

---

*Next: useContext — the provider-consumer pattern is the next step after stable callback and value identity.*
