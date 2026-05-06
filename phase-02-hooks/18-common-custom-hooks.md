# Common custom hooks

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

**Q (Medium): What is a good sign that logic should be extracted into a custom hook?**
Answer: when the same stateful behavior is used by multiple components, or when a component becomes difficult to understand because of repeated hook logic. The hook should improve readability and reduce duplication.
The trap: extracting logic too early or creating hooks for trivial one-off code.

---
*Next: Phase 3 begins with lifecycle methods, which is the natural follow-up after hooks and modern component patterns.*
