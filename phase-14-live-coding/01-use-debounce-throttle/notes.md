# useDebounce & useThrottle

## Quick Reference

| Concept | Debounce | Throttle |
|---|---|---|
| Behavior | Delays execution until N ms of silence | Executes at most once per N ms |
| Resets timer on new call? | Yes — every call restarts the delay | No — ignores calls within the window |
| Best for | Search inputs, form validation | Scroll/resize handlers, button spam |
| Hook signature | `useDebounce<T>(value, delay): T` | `useThrottle<T>(value, interval): T` |
| Internal timer ref | `useRef<ReturnType<typeof setTimeout>>` | `useRef<number>` (timestamp) |
| Cleanup | `clearTimeout(timerId)` in useEffect return | Clear pending timer in useEffect return |

---

## Why This Matters

In a live coding round, interviewers frequently ask candidates to implement one or both of these hooks from scratch. They test:

1. Whether you know `useRef` vs `useState` for implementation details
2. Whether you remember cleanup (memory leaks / state-after-unmount warnings)
3. Whether you understand the semantic difference between the two patterns
4. TypeScript generics — making the hook work for any value type, not just strings

These are the single most common custom hook implementations asked in React interviews at all levels.

---

## Core Concepts

### Debounce

The timer resets every time a new value arrives. The callback only fires after the specified delay passes with no new values.

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the previous timer if value changes before delay elapses
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debouncedValue;
}
```

The cleanup function is the key — it runs *before* the next effect and on unmount. Without it, a fast-typing user would queue up many state updates, all of which would fire.

### Throttle

Execute immediately, then suppress all calls for the next N ms. Use a ref (not state) to track when the last emission happened.

```tsx
function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLast = now - lastUpdated.current;

    if (timeSinceLast >= interval) {
      // Enough time has passed — emit immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Schedule the update for when the interval completes
      const remaining = interval - timeSinceLast;
      const timerId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, remaining);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}
```

### Why useRef for the Timer ID?

The timer ID is an *implementation detail* — it does not affect what the UI renders. Storing it in `useState` would cause a re-render every time you start or clear a timer. `useRef` mutates the `.current` field without triggering a render cycle.

```tsx
// Wrong — triggers extra renders
const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);

// Correct — silent mutation, no re-renders
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

### Mental Model: Debounce vs Throttle Timeline

```
Input:     A--B--C---------D--E
           (fast typing)   (pause) (typing again)

Debounce(300ms):
           --------C---------D------E
           (only emits after 300ms of silence)

Throttle(300ms):
           A-----------C---D-------E
           (emits, then blocks for 300ms, then emits next)
```

---

## Common Interview Gotchas

1. **Not cleaning up**: Without `return () => clearTimeout(timerId)`, you get memory leaks and potential `setState` calls after unmount.

2. **Using `useState` for the timer ID**: Interviewers watch for this. Always use `useRef`.

3. **Missing `delay` in dependency array**: If `delay` can change, it must be in the deps. If it's static, it won't matter, but including it is correct.

4. **Debounce vs throttle confusion**: Debounce = "wait for silence." Throttle = "don't exceed a rate." If an interviewer asks for a search input optimizer, they want debounce. If they ask for scroll/resize, they want throttle.

5. **Not handling the initial render**: The hook should return `initialValue` on the first render (before any delay elapses). Both implementations above handle this correctly — `useState<T>(value)` initializes to the first value.

---

## Self-Assessment

- [ ] I can implement `useDebounce` from scratch without looking at notes
- [ ] I can implement `useThrottle` from scratch without looking at notes
- [ ] I can explain why `useRef` is used for the timer ID, not `useState`
- [ ] I can draw a timeline showing the difference between debounce and throttle behavior
- [ ] I can explain what happens without the useEffect cleanup function
- [ ] I know which hook to reach for: search input (debounce) vs scroll (throttle)

---

## Interview Q&A

**Q: Why do you use `useRef` for the timer ID instead of `useState`? `High`**

A: The timer ID is an implementation detail — it's not something the component renders or cares about visually. Storing it in `useState` would trigger a re-render every time you call `setTimeout` or `clearTimeout`, which is wasteful and can cause subtle bugs. `useRef` gives you a mutable container that persists across renders without causing re-renders when its `.current` changes.

---

**Q: What is the difference between debounce and throttle? `High`**

A: Debounce delays execution until the input has been silent for N ms — every new call resets the timer. It's ideal for search inputs where you want to wait until the user stops typing before making a network request. Throttle limits execution to at most once per N ms — it emits immediately on the first call, then ignores subsequent calls until the interval passes. It's ideal for scroll and resize handlers where you want rate-limiting but not delay. The key mental model: debounce waits for silence, throttle enforces a maximum rate.

---

**Q: How do you prevent a state update from firing after a component unmounts? `Medium`**

A: Return a cleanup function from `useEffect` that calls `clearTimeout(timerId)`. The cleanup runs when the component unmounts, canceling any pending timer so `setDebouncedValue` is never called on an unmounted component. In React 18's Strict Mode (development only), effects fire twice — the cleanup function also prevents double-firing bugs during this development check.

---

**Q: A user types 20 characters in 500ms. How many times does a debounced search fire? `Medium`**

A: Once — assuming the delay is longer than the time between keystrokes. Each keystroke restarts the timer. The timer only fires after the user pauses for the full delay duration. If the user types all 20 characters within 500ms and the delay is 300ms, the search fires 300ms after the last keystroke, sending the final query string.

---

**Q: When would you use throttle instead of debounce for a search input? `Low`**

A: If you want to show results as the user types (not just after they stop), throttle gives you periodic updates — e.g., every 500ms during typing. This can feel more responsive. The trade-off is more API calls than debounce. A practical middle ground is to debounce for the API call but keep a local filter (over cached results) running on every keystroke with no delay.
