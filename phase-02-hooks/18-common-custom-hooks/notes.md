# Common custom hooks

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Custom hook | A `use`-prefixed function that calls React hooks internally | Extracts reusable stateful logic without duplicating it |
| usePrevious | Returns the value from the prior render using a ref | Useful for comparisons without extra state |
| useDebounce | Delays a value update until input settles | Avoids over-triggering expensive operations |
| Stable references | Callbacks and objects returned by hooks should be memoized | Prevents unnecessary re-renders in consumers |

## What Is This?
This topic surveys common custom hooks and how they package reusable behavior. Custom hooks are plain JavaScript functions whose names start with `use` and which call other hooks inside them.

## Why Does It Exist?
When multiple components need the same logic, duplicating the code leads to bugs and inconsistent behavior. Custom hooks let you extract that shared behavior while keeping component code declarative and composable.

## How It Works
A custom hook is just a function:

```js
function usePrevious(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}
```

It can return anything: a value, a callback, an object, or an API.

> **Check yourself:** Why does usePrevious return `ref.current` before the effect runs — what render timing property makes this work?

### Common patterns
- `useDebounce` delays a value update until the user stops typing.
- `useFetch` wraps fetch logic, loading state, and error handling.
- `usePrevious` tracks the previous render value.
- `useOnClickOutside` detects clicks outside a ref element.
- `useLocalStorage` keeps state synced with localStorage.
- `useIntersectionObserver` observes when an element enters the viewport.

## Practical examples
```js
function usePrevious(value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}
```

```js
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
```

> **Check yourself:** In useDebounce, why does the effect return a cleanup function, and what happens if that cleanup is omitted?

## Best practices
- keep hooks focused on a single responsibility
- return stable references when the hook exposes callbacks or objects
- handle cleanup in effects to avoid leaks
- document the hook contract clearly

## Gotchas
- custom hooks are not magic; they still follow the rules of hooks.
- avoid over-abstracting; a custom hook should improve readability, not hide important logic.
- dependency arrays inside custom hooks must include all relevant values.
- useDebugValue can make custom hooks easier to inspect in DevTools.

## Interview Questions


**Q (High): Why create a custom hook instead of a helper function?**
Answer: because custom hooks can use React hooks internally and preserve hook rules. Helper functions cannot manage state or effects. Custom hooks encapsulate reusable hook logic while retaining the component model.
The trap: saying a custom hook is just a normal function or that it is only for code reuse.


---

**Q (Medium): What is a good sign that logic should be extracted into a custom hook?**
Answer: when the same stateful behavior is used by multiple components, or when a component becomes difficult to understand because of repeated hook logic. The hook should improve readability and reduce duplication.
The trap: extracting logic too early or creating hooks for trivial one-off code.
---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write usePrevious from memory and explain why it returns the previous value
- [ ] Can write useDebounce from memory including the cleanup
- [ ] Can articulate when to extract logic into a custom hook versus keeping it inline
- [ ] Can explain why a custom hook can call other hooks but a plain helper function cannot
- [ ] Can name three common custom hook patterns and what problem each solves

---

*Next: Phase 3 begins with lifecycle methods, which is the natural follow-up after hooks and modern component patterns.*
