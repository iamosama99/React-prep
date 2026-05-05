# Stale closure problem

## What Is This?
The stale closure problem occurs when a hook callback captures a value from an earlier render and continues using that outdated value after the component has updated.

## Why Does It Exist?
In JavaScript, functions close over the variables that were in scope when they were created. In React, a component render creates a new scope each time, so a callback defined during one render can lock in old state or props if it is not recreated with current values.

## How It Works
Example:

```js
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

Because the effect has an empty dependency array, the interval callback closes over the initial `count` value and logs `0` forever.

### Fixes
- add the stale value to effect dependencies
- use refs to hold the latest value
- use an event hook like `useEvent` to always access current state

Example with ref:

```js
const countRef = useRef(count)
useEffect(() => {
  countRef.current = count
}, [count])

useEffect(() => {
  const id = setInterval(() => {
    console.log(countRef.current)
  }, 1000)
  return () => clearInterval(id)
}, [])
```

## Gotchas
- The stale closure problem is not limited to effects; it appears in event handlers, callbacks, subscriptions, and timers.
- Adding dependencies to useEffect or useCallback can fix stale closures but can also cause extra re-renders if not managed carefully.
- Using refs bypasses reactivity, so it should be used only when you need the latest mutable value without triggering a render.

## Interview Questions
**Q: What is a stale closure in React?**
Answer: it is when a callback uses a value captured from a previous render, causing it to operate on outdated state or props. This happens because hooks and callbacks are recreated per render, and stale dependencies are not refreshed unless the hook dependencies change.
The trap: saying it is a React bug rather than a JavaScript closure behavior combined with render semantics.

**Q: How do you fix stale closures in hooks?**
Answer: by including current values in dependency arrays, by using refs to store the latest value, or by using patterns like `useEvent` for stable callbacks that access fresh state. The right fix depends on the exact case.
The trap: blindly removing dependencies or disabling lint rules.

---
*Next: Common custom hooks — practical reusable patterns once you master the hook primitives.*
