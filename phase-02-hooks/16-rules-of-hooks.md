# Rules of hooks

## What Is This?
The rules of hooks are the constraints React enforces on how hooks are called. They require hooks to be called only at the top level of function components and custom hooks, and never inside loops, conditions, or nested functions.

## Why Does It Exist?
React relies on the order of hook calls to associate stateful behavior with a component. If hooks are called conditionally or inside loops, the call order can change between renders, breaking React’s internal hook state tracking.

## How It Works
There are two core rules:

1. Call hooks at the top level.
2. Call hooks only from React function components or custom hooks.

Example of an incorrect pattern:

```js
if (isVisible) {
  useEffect(() => { ... }, [])
}
```

If `isVisible` changes between renders, the hook order changes and React cannot match effects and state to the correct positions.

### Why top-level matters
React builds a list of hooks in the order they are called during render. That list must be stable across all renders of the same component. Conditional or dynamic hook calls break that guarantee.

### Custom hooks count too
A custom hook is just a function that uses hooks. The rules apply inside custom hooks as well, because they are still part of React’s hook call sequence.

## Gotchas
- `useEffect` inside an event handler is invalid because the hook is not called during render.
- Calling hooks inside `forEach`, `map`, or nested helper functions is invalid.
- A hook inside a component that sometimes returns early is invalid if the hook call can be skipped.
- The ESLint React Hooks plugin exists to enforce these rules automatically.

## Interview Questions
**Q (High): Why must hooks be called at the top level?**
Answer: because React uses call order to track hook state. Top-level calls ensure the same sequence on every render, so state and effects stay matched to the correct hook position.
The trap: saying it is only a style rule or that it is to make code easier to read.

**Q (Medium): Can you call hooks inside a custom hook?**
Answer: yes. Custom hooks are just reusable functions that follow the same rules. They are allowed to call hooks because they are part of the hook call sequence.
The trap: thinking custom hooks are exempt from the hooks rules.

---
*Next: Stale closure problem — a common bug pattern once hook rules are understood.*
