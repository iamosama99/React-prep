# Common Custom Hooks

## What Is This?

Custom hooks are functions whose names start with `use` and that call built-in React hooks. They're how React encourages logic reuse — instead of duplicating `useEffect` + `useState` patterns across components, you extract them into a named hook with a clear interface.

This topic covers the six hooks every senior React developer is expected to know how to implement from scratch:

1. `useDebounce`
2. `useFetch`
3. `usePrevious`
4. `useOnClickOutside`
5. `useLocalStorage`
6. `useIntersectionObserver`

Understanding the implementation of each demonstrates real command of the hooks system.

---

## useDebounce

Delays a value update until the input hasn't changed for `delay` milliseconds. Essential for search inputs and any input that triggers expensive operations.

```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer); // Cleanup: cancel if value changes before delay
  }, [value, delay]);

  return debouncedValue;
}
```

**How it works**: Every time `value` changes, the effect resets the timer. If `value` doesn't change for `delay` ms, the timer fires and updates `debouncedValue`. The cleanup function cancels the previous timer, so intermediate values never reach `debouncedValue`.

**Usage**:

```javascript
function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) fetchResults(debouncedQuery);
  }, [debouncedQuery]); // Only fires 300ms after user stops typing

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

**Interview gotcha**: Why does the cleanup cancel the previous timer, not the current one? Because the cleanup runs *before* the next effect run. So when `value` changes, the previous timeout is cancelled, then a new one is set.

---

## useFetch

Encapsulates the loading/error/data state machine for async data fetching.

```javascript
function useFetch(url) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    setState({ data: null, loading: true, error: null });

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => {
      cancelled = true; // Prevent state update after unmount or url change
    };
  }, [url]);

  return state;
}
```

**The `cancelled` flag**: This handles the race condition. If the component unmounts or `url` changes while a fetch is in-flight, the cleanup sets `cancelled = true`. When the promise resolves, it checks `cancelled` before calling `setState`. Without this, you'd set state on an unmounted component or update with stale data.

**Usage**:

```javascript
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <div>{data.name}</div>;
}
```

**Extended version with refetch**:

```javascript
function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    // ... same fetch logic
  }, [url, refetchIndex]); // refetchIndex changing triggers a re-fetch

  const refetch = useCallback(() => setRefetchIndex(i => i + 1), []);

  return { ...state, refetch };
}
```

---

## usePrevious

Returns the value from the previous render. Useful for comparisons (did a prop change?) or transitions (animating from old to new value).

```javascript
function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]); // Updates ref AFTER render

  return ref.current; // Returns the previous value (before this render's effect)
}
```

**How the timing works**: The effect runs after the render completes. During the render, `ref.current` still holds the value from the *previous* render. After the render, the effect updates it to the current value. On the *next* render, `ref.current` is this render's value — which is the "previous" from the next render's perspective.

```javascript
// Timeline:
// Render 1: value=1 → ref.current=undefined (initial) → useEffect sets ref.current=1
// Render 2: value=2 → returns ref.current=1 (previous) → useEffect sets ref.current=2
// Render 3: value=3 → returns ref.current=2 (previous) → ...
```

**Usage**:

```javascript
function Component({ count }) {
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {prevCount}</p>
      {count > prevCount ? '↑ Increased' : '↓ Decreased'}
    </div>
  );
}
```

---

## useOnClickOutside

Calls a handler when the user clicks outside a given element. Used for closing dropdowns, modals, and popovers.

```javascript
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function listener(event) {
      // Do nothing if clicking ref's element or its descendants
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    }

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]); // handler should be wrapped in useCallback at call site
}
```

**Usage**:

```javascript
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <div ref={ref}>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && <DropdownMenu />}
    </div>
  );
}
```

**Why `mousedown` instead of `click`**: `click` fires after `mousedown` + `mouseup`. If you're closing a dropdown on `click`, and the user's down-stroke is inside and up-stroke is outside, you might get confusing behavior. `mousedown` fires as soon as the button is pressed, which feels more natural for closing overlays.

**Handler stability**: The `handler` in the dep array means the effect re-runs if `handler` changes reference. Wrap the handler at the call site with `useCallback` to prevent unnecessary re-subscriptions.

---

## useLocalStorage

Synchronizes state with `localStorage`, persisting across page refreshes.

```javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function (same API as useState)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch {
      console.warn(`useLocalStorage: failed to write key "${key}"`);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}
```

**Key implementation details**:

1. **Lazy initialization**: `useState(() => ...)` reads from `localStorage` only on the first render, not on every render. Without the function form, you'd read localStorage on every render.

2. **try/catch**: `localStorage` can throw in private browsing mode, when storage is full, or in some SSR environments. Failing silently (returning `initialValue`) is the right default.

3. **Function setter support**: Mirrors the `useState` API — `setValue(prev => prev + 1)` should work.

**Usage**:

```javascript
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

**SSR consideration**: `localStorage` doesn't exist on the server. Add a check or use a `typeof window !== 'undefined'` guard if SSR is in scope.

---

## useIntersectionObserver

Detects when an element enters or exits the viewport. Used for infinite scroll, lazy-loading images, and scroll-triggered animations.

```javascript
function useIntersectionObserver(options = {}) {
  const [entry, setEntry] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      {
        threshold: 0,
        rootMargin: '0px',
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.root]);

  return { ref, entry };
}
```

**Usage**:

```javascript
function LazyImage({ src, alt }) {
  const { ref, entry } = useIntersectionObserver({ threshold: 0.1 });
  const isVisible = entry?.isIntersecting;

  return (
    <div ref={ref}>
      {isVisible ? (
        <img src={src} alt={alt} />
      ) : (
        <div style={{ height: 200, background: '#eee' }} />
      )}
    </div>
  );
}

function InfiniteList() {
  const { ref, entry } = useIntersectionObserver({ rootMargin: '100px' });

  useEffect(() => {
    if (entry?.isIntersecting) {
      loadMoreItems();
    }
  }, [entry?.isIntersecting]);

  return (
    <div>
      {items.map(item => <Item key={item.id} item={item} />)}
      <div ref={ref} /> {/* Sentinel element at the bottom */}
    </div>
  );
}
```

**Why a sentinel element**: For infinite scroll, you observe an empty `<div>` at the bottom of the list. When that element becomes visible, you know the user has scrolled to the end.

**Options stability**: The `options` object passed to the effect must have stable references. The dep array spreads individual option values (`options.threshold`, `options.rootMargin`) rather than the whole `options` object to avoid re-creating the observer when the parent re-renders with a new object reference.

---

## What Makes a Good Custom Hook

Looking at these six hooks, notice the patterns:

1. **Returns what the consumer needs, hides what they don't**: `useFetch` returns `{ data, loading, error }` — not the internal abort controller or cancelled flag.

2. **Handles cleanup**: Every hook with subscriptions, timers, or observers returns a cleanup function from its effects.

3. **Handles edge cases**: `useLocalStorage` has try/catch. `useFetch` has the cancelled flag. `useOnClickOutside` checks `ref.current.contains`.

4. **Mirrors React's own API**: `useLocalStorage` returns `[value, setter]` like `useState`. `useDebounce` takes and returns the same value type.

5. **Has a clear, single responsibility**: Each hook does one thing and does it well. Composition handles complexity.

## Interview Questions

**Q: Implement `useDebounce` from scratch and explain why the cleanup function is essential.**

Strong answer:

```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

The cleanup is essential because it cancels the previous timer before setting a new one. Without it, every keystroke would schedule a timer, and all of them would fire — you'd get a burst of state updates after the full delay from each keystroke. The cleanup runs before the effect re-runs (and on unmount), so when `value` changes, the old timer is cancelled and only the most recent one fires. This is what produces the "only fire after N ms of inactivity" behavior.

The trap: Implementing it without cleanup and not noticing that it would fire once per character typed with a 300ms delay on each, rather than once 300ms after the last character.

---

**Q: What's the race condition in `useFetch`, and how does the `cancelled` flag fix it?**

Strong answer: The race condition: if `url` changes while a fetch is in-flight (or the component unmounts), the old fetch may complete and call `setState` after the component has moved on. In a worst case, two fetches run concurrently for different URLs, and the earlier fetch resolves last — the component shows data for the old URL. The `cancelled` flag is a boolean scoped to the effect's closure. The cleanup function sets it to `true` before the next effect run. When the fetch resolves, it checks the flag: if `true`, it discards the result. This is the classic way to cancel a promise you can't actually cancel (unlike `AbortController`, which is a better solution but more verbose).

The trap: Not knowing the race condition exists. Or implementing the fix with an `AbortController` and not being able to explain the simpler `cancelled` flag approach.

---

**Q: How does `usePrevious` work? Why is the timing right?**

Strong answer: `usePrevious` stores a value in a ref and updates it in a `useEffect`. The key is timing: `useEffect` runs after the render and after the DOM has been committed. So during each render, `ref.current` holds the value from the *previous* render's effect — not the current render's value. Only after this render's effect runs does `ref.current` become the current value. So the return value during any given render is always one step behind the current value. The ref (not state) is used because updating it shouldn't trigger a re-render — it's just a cache of the previous value.

The trap: Using `useState` instead of `useRef`, which would cause an extra re-render. Or not understanding why the timing works — thinking you'd need to store it "before" the render somehow.

---

**Q: You're building a dropdown that closes when you click outside. Walk through the implementation.**

Strong answer: Attach a `mousedown` event listener to `document`. In the handler, check if the click target is inside the dropdown's DOM node using `ref.current.contains(event.target)`. If it's inside, do nothing. If it's outside, close the dropdown. Manage the listener with `useEffect` — add on mount, remove on cleanup. Prefer `mousedown` over `click` because it fires earlier and feels more natural for closing overlays. Make sure the callback passed to the hook is wrapped in `useCallback` at the call site, otherwise the effect re-runs on every render.

The trap: Using `click` instead of `mousedown` (explains why), forgetting the cleanup (memory leak + double-fire), or not explaining the `contains` check (what makes it "outside" vs "inside").

---

*Phase 2 complete. Phase 3 covers class components and legacy patterns — still tested in 2026 since many large codebases haven't fully migrated.*
