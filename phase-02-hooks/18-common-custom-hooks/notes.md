# Common Custom Hooks

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Custom hook | A `use`-prefixed function that calls React hooks internally | Extracts reusable stateful logic without duplicating it |
| Composition | Hooks can call other hooks | Build complex behavior from simple primitives |
| Stable references | Callbacks and objects returned by hooks should be memoized | Prevents unnecessary re-renders in consumers |
| Testing | Custom hooks can be tested independently with `renderHook` | Decouples logic from UI for easier testing |

## What Is This?

Custom hooks are plain JavaScript functions whose names start with `use` and which call other hooks inside them. They let you extract reusable stateful logic from components, so multiple components can share the same behavior without duplicating code.

```javascript
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}

// Any component can use this:
function Modal() {
  const [isOpen, toggleOpen] = useToggle(false);
  return <div>{isOpen && <p>Content</p>}<button onClick={toggleOpen}>Toggle</button></div>;
}
```

Custom hooks are the primary mechanism for code reuse in modern React.

> **Check yourself:** What makes a function a "custom hook" vs a regular function? Can a regular function call `useState`?

## Why Does It Exist?

Before hooks, reusing stateful logic required Higher-Order Components (HOCs) or render props — both patterns with significant drawbacks (wrapper hell, prop name collisions, hard to trace data flow).

Custom hooks solve the reuse problem cleanly:
- No wrapper components
- No prop collisions
- Clear data flow (just a function call)
- Composable (hooks can call hooks)
- Testable (pure functions with predictable inputs/outputs)

## How They Work

A custom hook is just a function that:
1. Has a name starting with `use`
2. Calls React hooks internally
3. Returns whatever the consumer needs (value, callback, object, etc.)

```javascript
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
```

**Why `usePrevious` returns the previous value**: On render N, `ref.current` still holds the value from render N-1 (the effect hasn't run yet). The effect runs *after* render, updating `ref.current` to the current value. So during render N+1, `ref.current` holds the value from render N — the "previous" value.

> **Check yourself:** In `usePrevious`, what would happen if you used `useState` instead of `useRef` to store the previous value?

### Hook Composition

Custom hooks can call other custom hooks:

```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function useDebouncedSearch(query) {
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/search?q=${debouncedQuery}`)
      .then(res => res.json())
      .then(data => { setResults(data); setLoading(false); });
  }, [debouncedQuery]);

  return { results, loading };
}
```

`useDebouncedSearch` composes `useDebounce` — hooks building on hooks.

## Common Custom Hook Implementations

### 1. usePrevious — Track Previous Value

```javascript
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

// Usage:
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current: {count}, Previous: {prevCount}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
```

### 2. useDebounce — Delay a Value Update

```javascript
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage:
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery) {
      fetch(`/api/search?q=${debouncedQuery}`);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**Why cleanup matters**: The `clearTimeout` in the cleanup function cancels the previous timer when `value` changes. Without it, multiple timers would fire, potentially setting the debounced value multiple times.

### 3. useFetch — Data Fetching with Loading/Error

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) { setData(data); setLoading(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

// Usage:
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return <div>{user.name}</div>;
}
```

**Key design decisions**:
- `cancelled` flag prevents setting state on unmounted components
- Error handling resets data and loading states
- The URL as a dependency means changing the URL re-fetches

### 4. useLocalStorage — Persistent State

```javascript
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage full or security errors
    }
  }, [key, value]);

  return [value, setValue];
}

// Usage:
function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  return (
    <select value={theme} onChange={e => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### 5. useOnClickOutside — Detect Outside Clicks

```javascript
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Usage:
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  return (
    <div ref={dropdownRef}>
      <button onClick={() => setIsOpen(o => !o)}>Menu</button>
      {isOpen && <ul><li>Option 1</li><li>Option 2</li></ul>}
    </div>
  );
}
```

### 6. useMediaQuery — Responsive Design

```javascript
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage:
function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
```

### 7. useIntersectionObserver — Viewport Detection

```javascript
function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options.threshold, options.root, options.rootMargin]);

  return isIntersecting;
}

// Usage:
function LazyImage({ src, alt }) {
  const imgRef = useRef(null);
  const isVisible = useIntersectionObserver(imgRef, { threshold: 0.1 });

  return (
    <div ref={imgRef}>
      {isVisible ? <img src={src} alt={alt} /> : <Placeholder />}
    </div>
  );
}
```

## Best Practices for Custom Hooks

### 1. Single Responsibility

Each hook should do one thing well:

```javascript
// ❌ Does too much
function useEverything() {
  const auth = useAuth();
  const theme = useTheme();
  const locale = useLocale();
  return { auth, theme, locale };
}

// ✅ Focused, composable
function useAuth() { /* ... */ }
function useTheme() { /* ... */ }
function useLocale() { /* ... */ }
```

### 2. Return Stable References

Memoize callbacks and objects returned by your hook:

```javascript
// ❌ New object on every render
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  return {
    count,
    increment: () => setCount(c => c + 1), // New function every render
    decrement: () => setCount(c => c - 1), // New function every render
  };
}

// ✅ Stable callbacks
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);

  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);

  return useMemo(
    () => ({ count, increment, decrement }),
    [count, increment, decrement]
  );
}
```

### 3. Handle Cleanup

Always clean up side effects:

```javascript
function useInterval(callback, delay) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return; // Allow pausing

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id); // Cleanup!
  }, [delay]);
}
```

### 4. Document the Contract

Make it clear what your hook expects and returns:

```javascript
/**
 * useDebounce - Returns a debounced version of the input value.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {any} The debounced value (lags behind the input)
 *
 * The returned value only updates after `delay` ms of no changes to `value`.
 * Useful for delaying API calls until the user stops typing.
 */
function useDebounce(value, delay = 300) { /* ... */ }
```

### 5. Prefix with `use`

The `use` prefix is required, not optional. React and the ESLint plugin use it to identify custom hooks and enforce the rules of hooks inside them.

```javascript
// ❌ Not recognized as a hook — hooks inside it won't be checked
function getAuth() {
  const [user, setUser] = useState(null); // ESLint won't warn about this
}

// ✅ Recognized as a hook
function useAuth() {
  const [user, setUser] = useState(null); // ESLint enforces rules
}
```

> **Check yourself:** If you rename `useAuth` to `getAuth`, do the React hooks inside it still work? What changes?

## Gotchas

### 1. Custom hooks share logic, not state

```javascript
function useCounter() {
  const [count, setCount] = useState(0);
  return [count, setCount];
}

function App() {
  const [countA, setCountA] = useCounter(); // Independent state
  const [countB, setCountB] = useCounter(); // Independent state

  // countA and countB are NOT shared — each call creates its own state
}
```

Two components calling the same custom hook get *independent* state. The hook is a template for logic, not a shared singleton.

### 2. Rules of hooks still apply

```javascript
// ❌ Violates rules of hooks INSIDE the custom hook
function useConditionalFetch(url, shouldFetch) {
  if (!shouldFetch) return null; // Early return before hooks!

  const [data, setData] = useState(null);
  useEffect(() => { fetch(url)... }, [url]);
  return data;
}

// ✅ Hooks unconditionally, condition inside
function useConditionalFetch(url, shouldFetch) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!shouldFetch) return;
    fetch(url)...
  }, [url, shouldFetch]);
  return data;
}
```

### 3. Dependency arrays inside custom hooks

```javascript
// ❌ Missing dependency
function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, []); // Missing title!
}

// ✅ Include all dependencies
function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
```

### 4. Over-abstracting

```javascript
// ❌ Custom hook for a one-liner used in one component
function useSetPageTitle(title) {
  useEffect(() => { document.title = title; }, [title]);
}

// Just inline it — the abstraction adds no value
useEffect(() => { document.title = title; }, [title]);
```

Custom hooks should improve readability and reduce duplication. If a hook is used once and the inline version is equally clear, skip the abstraction.

### 5. Testing requires renderHook

Custom hooks can't be called in tests directly (they need React's hook machinery). Use `renderHook` from `@testing-library/react`:

```javascript
import { renderHook, act } from '@testing-library/react';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

## Interview Questions

**Q (High): Why create a custom hook instead of a helper function?**

Answer: Custom hooks can use React hooks internally (`useState`, `useEffect`, `useRef`, etc.) — regular functions cannot. This means custom hooks can manage state, subscribe to external data, run side effects, and participate in React's render lifecycle.

A helper function is appropriate for pure transformations (formatting, calculations). A custom hook is appropriate for reusable *stateful* logic that interacts with React's lifecycle.

The trap: Saying a custom hook is "just a regular function" or that it's only for code reuse. It's specifically for reusing *hook-based* logic.

---

**Q (High): Custom hooks share logic, not state. What does that mean?**

Answer: Each component that calls a custom hook gets its own independent copy of the hook's state. Two components calling `useCounter()` have separate counts — they don't share a single count. The hook defines the *pattern* of state management; each call creates a new instance.

If you need shared state, use context or an external store — not just a custom hook.

The trap: Thinking two components using the same hook share the same state.

---

**Q (High): What makes a function a "custom hook"?**

Answer: Two requirements:
1. Its name starts with `use` (e.g., `useAuth`, `useFetch`)
2. It calls React hooks internally

The `use` prefix is how React and the ESLint plugin identify it. Without the prefix, React won't enforce the rules of hooks inside it, leading to potential bugs.

The trap: Naming a hook without the `use` prefix (like `fetchData`) and wondering why React doesn't track its state correctly.

---

**Q (Medium): What is a good signal that logic should be extracted into a custom hook?**

Answer: When the same combination of hooks appears in multiple components, or when a component's hook logic becomes complex enough to obscure the rendering logic. Good candidates: data fetching patterns, form field logic, subscription management, browser API wrappers.

Bad candidates: one-off logic used in a single component, trivial state (a single `useState` toggle), or pure calculations that don't use hooks.

The trap: Extracting every piece of logic into hooks prematurely, adding abstraction without value.

---

**Q (Medium): How do you test a custom hook?**

Answer: Use `renderHook` from `@testing-library/react`. You can't call hooks outside React components, so `renderHook` creates a minimal component that runs the hook.

```javascript
const { result } = renderHook(() => useCounter());
act(() => result.current.increment());
expect(result.current.count).toBe(1);
```

For hooks with side effects, use `waitFor` or `act` to handle async updates.

The trap: Trying to call the hook directly in a test without `renderHook`.

---

**Q (Medium): How do you ensure a custom hook returns stable references?**

Answer: Use `useCallback` for returned functions and `useMemo` for returned objects. This prevents consumers from seeing new references on every render, which would break `React.memo` and dependency arrays.

```javascript
function useAuth() {
  const [user, setUser] = useState(null);
  const login = useCallback(async (creds) => { /* ... */ }, []);
  const logout = useCallback(() => { /* ... */ }, []);
  return useMemo(() => ({ user, login, logout }), [user, login, logout]);
}
```

The trap: Returning inline objects or functions from hooks without memoization, causing downstream re-renders.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write `usePrevious` from memory and explain why it returns the previous value
- [ ] Can write `useDebounce` from memory including the cleanup
- [ ] Can articulate when to extract logic into a custom hook versus keeping it inline
- [ ] Can explain why a custom hook can call other hooks but a plain helper function cannot
- [ ] Can name at least five common custom hook patterns and what problem each solves
- [ ] Can explain that custom hooks share logic, not state
- [ ] Can test a custom hook using `renderHook`

---

*Next: [Lifecycle Methods](../../phase-03-class-legacy/01-lifecycle-methods/notes.md) — which is the natural follow-up after hooks and modern component patterns.*
