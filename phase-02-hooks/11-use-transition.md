# useTransition

## What Is This?
useTransition is a React hook for marking state updates as non-urgent. It returns a boolean `isPending` and a `startTransition` function that lets React keep urgent updates responsive while deferring lower-priority work.

## Why Does It Exist?
Modern UI often has fast interactions (typing, clicking) combined with expensive rendering (filtering lists, route transitions). useTransition exists to keep the UI feel responsive by allowing React to prioritize immediate updates and delay less important ones.

## How It Works
Use it like this:

```js
const [isPending, startTransition] = useTransition()

function handleSearch(value) {
  setQuery(value)
  startTransition(() => {
    setFilteredItems(filter(value))
  })
}
```

The update inside startTransition is considered non-urgent. React may postpone it to keep more urgent state updates, like input value changes, from blocking.

`isPending` becomes true while the transition is in progress, so you can show fallback UI:

```js
{isPending ? <Spinner /> : <List items={filteredItems} />}
```

### What it does not do
- It does not make a state update asynchronous in legacy render modes; it is a hint to the React scheduler.
- It does not debounce input values; the controlled input state update should still happen immediately.

## Gotchas
- Only use it for updates that are okay to delay, such as list filtering or route/page transitions.
- If you wrap too much state in startTransition, you can make the UI feel sluggish.
- `isPending` is a signal, not a loading flag for network requests.
- In StrictMode, the transition may be started more than once during development.

## Interview Questions
**Q: What is the difference between useTransition and useDeferredValue?**
Answer: useTransition marks an update as non-urgent and returns a pending state, while useDeferredValue produces a deferred copy of a value. useTransition is about scheduling state changes, and useDeferredValue is about letting a stale value be used while the new value catches up.
The trap: conflating the two or thinking useTransition is only for showing spinners.

**Q: When should you use useTransition?**
Answer: use it for heavy renders or UI updates that can lag behind immediate interactions, such as filtering large lists, navigating between views, or rendering a new search result set.
The trap: using it for every state update or expecting it to fix all performance problems.

---
*Next: useDeferredValue — deferring a value is the natural complement to deferring an update.*
