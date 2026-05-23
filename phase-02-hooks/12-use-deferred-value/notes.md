# useDeferredValue

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useDeferredValue | Returns a lower-priority copy of a value | Keeps fast UI responsive while expensive renders lag behind |
| Deferred rendering | React renders with the old value first, updates when idle | Prevents expensive recalculations from blocking input |
| vs useTransition | useDeferredValue wraps a value; useTransition wraps a state update | Choose based on whether you own the state update |
| Not a debounce | Updates are not delayed by time, only by render priority | Misunderstanding this leads to wrong tool choice |

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

> **Check yourself:** After a user types a new character, what value does `deferredQuery` hold — the new value or the old one — and when does it update?

### Key difference from useTransition
- useTransition wraps a state update to mark it as non-urgent.
- useDeferredValue gives you a stable, lower-priority value derived from another value.

> **Check yourself:** If you control the state setter, which hook is more appropriate — useDeferredValue or useTransition? Why?

## Gotchas
- The deferred value is intentionally stale for a short time; your UI must handle that gracefully.
- It is not a form of debouncing; it does not prevent updates, it only delays them in rendering.
- Do not use it for critical form state or values that must always remain in sync.
- Keep the deferred-dependent render path contained to avoid making the entire component slow.

## Interview Questions


**Q (High): When should you use useDeferredValue instead of useTransition?**
Answer: useDeferredValue is ideal when you need a lower-priority version of an already-updating value, especially for expensive derived rendering. useTransition is better when you want to wrap an entire update and track an `isPending` state.
The trap: thinking they are interchangeable or that useDeferredValue alone handles user input responsiveness.


---

**Q (Medium): What kind of UI problem does useDeferredValue solve?**
Answer: it solves cases where a fast-changing value, like a text input, causes slow re-renders. By letting the UI keep the immediate value while the derived render uses a deferred value, it improves responsiveness.
The trap: describing it as a debounce or async state hook.
---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what "deferred" means in terms of render priority, not time delay
- [ ] Can write a minimal example using useDeferredValue with useMemo from memory
- [ ] Can name the key difference between useDeferredValue and useTransition
- [ ] Can explain why useDeferredValue is not a debounce
- [ ] Can name one gotcha — what happens if the deferred value is used for critical form state

---

*Next: useId — stable, SSR-safe IDs are the next building block for accessible components.*
