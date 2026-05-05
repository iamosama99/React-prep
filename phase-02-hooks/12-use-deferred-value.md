# useDeferredValue

## What Is This?
useDeferredValue is a React hook that returns a deferred version of a value. It lets React continue rendering with an older value while a newer value is being updated in the background.

## Why Does It Exist?
Sometimes a rapidly changing value drives expensive rendering, such as typed search input used to filter a large list. useDeferredValue lets the immediate input remain responsive while the slower rendering uses the previous value until React is ready.

## How It Works
Use it like this:

```js
const deferredQuery = useDeferredValue(query)
const filteredItems = useMemo(() => filter(items, deferredQuery), [items, deferredQuery])
```

React updates `deferredQuery` with lower priority than the original `query`. During the transition, `deferredQuery` may lag behind, which reduces expensive recalculations.

### Key difference from useTransition
- useTransition wraps a state update to mark it as non-urgent.
- useDeferredValue gives you a stable, lower-priority value derived from another value.

## Gotchas
- The deferred value is intentionally stale for a short time; your UI must handle that gracefully.
- It is not a form of debouncing; it does not prevent updates, it only delays them in rendering.
- Do not use it for critical form state or values that must always remain in sync.
- Keep the deferred-dependent render path contained to avoid making the entire component slow.

## Interview Questions
**Q: When should you use useDeferredValue instead of useTransition?**
Answer: useDeferredValue is ideal when you need a lower-priority version of an already-updating value, especially for expensive derived rendering. useTransition is better when you want to wrap an entire update and track an `isPending` state.
The trap: thinking they are interchangeable or that useDeferredValue alone handles user input responsiveness.

**Q: What kind of UI problem does useDeferredValue solve?**
Answer: it solves cases where a fast-changing value, like a text input, causes slow re-renders. By letting the UI keep the immediate value while the derived render uses a deferred value, it improves responsiveness.
The trap: describing it as a debounce or async state hook.

---
*Next: useId — stable, SSR-safe IDs are the next building block for accessible components.*
