# Debounced Search Inputs

## Quick Reference

| Concept | Details |
|---|---|
| Debounce | Delay execution until N ms after the last call — collapses rapid events |
| Throttle | Execute at most once per N ms — limits rate but doesn't suppress all |
| `useDeferredValue` | React 18 — defers a value to low priority rendering; no network delay |
| `useTransition` | Marks state update as non-urgent; UI stays responsive during re-render |
| Race condition | Older requests arriving after newer ones — fixed with cleanup/abort |
| `AbortController` | Cancel in-flight fetch requests when the query changes |

---

## Why Search Inputs Need Special Treatment

A search input that fires a network request on every keystroke can trigger 10+ requests for a single word. Only the last result matters, but all requests run concurrently. Two problems emerge:

1. **Performance** — unnecessary API load, throttling, and cost
2. **Race conditions** — if request #8 resolves after request #10, the user sees stale results for their latest query

Debouncing collapses the keystrokes into a single request after the user pauses. Cancelling previous requests eliminates race conditions.

---

## useDebounce Custom Hook

A simple debounce hook using `useEffect` and `setTimeout`.

```jsx
function useDebounce(value, delay) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
```

Every time `value` changes, a new timeout is set. If `value` changes again before the timeout fires, the cleanup clears the previous timeout — so only the final change after a pause produces an updated `debounced` value.

---

## Basic Search Component

```jsx
function SearchInput() {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const debouncedQuery = useDebounce(query, 400);

  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setResults(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
        aria-label="Search"
      />
      {loading && <p>Loading...</p>}
      <ul>
        {results.map(r => <li key={r.id}>{r.name}</li>)}
      </ul>
    </div>
  );
}
```

The `cancelled` flag is the simplest race-condition guard: if the effect re-runs (query changed) before the previous fetch resolves, the cleanup sets `cancelled = true`, and the stale response is ignored.

---

> **Check yourself:** What is the race condition problem in search inputs and why does the `cancelled` flag fix it?

---

## AbortController: Proper Request Cancellation

The `cancelled` flag ignores the stale response but doesn't cancel the network request — the browser still processes it. `AbortController` actually cancels the in-flight request.

```jsx
React.useEffect(() => {
  if (!debouncedQuery.trim()) {
    setResults([]);
    return;
  }

  const controller = new AbortController();
  setLoading(true);

  fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
    signal: controller.signal,
  })
    .then(r => r.json())
    .then(data => {
      setResults(data);
      setLoading(false);
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        setLoading(false);
        // handle real errors
      }
      // AbortError is expected — ignore it
    });

  return () => controller.abort();
}, [debouncedQuery]);
```

When the effect cleans up, `controller.abort()` fires and the pending fetch rejects with an `AbortError`. Filter for `AbortError` to avoid treating it as a real error.

---

## useDeferredValue (React 18)

`useDeferredValue` is a React 18 primitive that defers rendering a value to low priority. It doesn't debounce network requests — it's for expensive local computation or rendering.

```jsx
function SearchResults({ query }) {
  // Heavy filtering over a large local list
  const filtered = expensiveFilter(items, query);
  return <List items={filtered} />;
}

function SearchPage() {
  const [query, setQuery] = React.useState('');
  const deferredQuery = React.useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchResults query={deferredQuery} />
    </>
  );
}
```

The input updates at full priority (every keystroke), while `SearchResults` receives `deferredQuery` which React updates at a lower priority — it may lag behind by one or more renders. The input stays responsive even if rendering the list is slow.

This is **not** a substitute for debouncing API calls. Use `useDeferredValue` for expensive renders; use `useDebounce` for network requests.

---

> **Check yourself:** What is the key difference between `useDebounce` and `useDeferredValue`? Can `useDeferredValue` replace debouncing in a search with API calls?

---

## useTransition for Search

`useTransition` marks a state update as non-urgent. The UI can interrupt it if a higher-priority update (like another keystroke) comes in.

```jsx
const [isPending, startTransition] = React.useTransition();

function handleChange(e) {
  const value = e.target.value;
  setQuery(value); // urgent — updates input immediately
  startTransition(() => {
    setFilteredResults(computeResults(value)); // non-urgent
  });
}
```

`isPending` is `true` while the transition is in progress — use it to show a loading indicator.

For search, `useTransition` is most useful for filtering large local datasets, not for API calls. For API calls, debounce + `AbortController` is still the right tool.

---

## Debounce vs Throttle

**Debounce** — wait until the input has been silent for N ms, then fire once. Best for search: you only care about the final value after the user pauses.

**Throttle** — fire at most once per N ms, no matter how fast events arrive. Best for scroll/resize handlers where you want regular sampling, not one final value.

```js
// Throttle with useRef
function useThrottle(fn, delay) {
  const lastCall = React.useRef(0);
  return React.useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      fn(...args);
    }
  }, [fn, delay]);
}
```

---

## Accessibility

- Use `<input type="search">` — screen readers announce it as a search field; browsers add a clear button
- Add `role="status"` and `aria-live="polite"` to the results count so screen readers announce updates
- Add `aria-busy="true"` to the results container while loading

```jsx
<p role="status" aria-live="polite">
  {loading ? 'Searching...' : `${results.length} results`}
</p>
```

---

## Self-Assessment

- [ ] I can implement `useDebounce` from scratch
- [ ] I can build a debounced search with `cancelled` flag for race condition prevention
- [ ] I can use `AbortController` to cancel in-flight requests
- [ ] I can explain the difference between `useDebounce` and `useDeferredValue`
- [ ] I know when to use debounce vs throttle
- [ ] I can add `aria-live` to announce search results to screen readers

---

## Interview Q&A

**Q: What is debouncing and why is it needed for search inputs? (High)**

A: Debouncing delays execution until N milliseconds after the last event. A search input fires `onChange` on every keystroke — without debouncing, each character triggers a network request. Debouncing collapses the burst of events into one request that fires after the user pauses, reducing API calls from ~10 per word to 1.

---

**Q: What is the race condition in search and how do you fix it? (High)**

A: If the user types quickly, multiple requests can be in-flight simultaneously. If an older request resolves after a newer one, the results from the older (stale) query overwrite the newer ones. Fix it by either tracking a `cancelled` flag (set in effect cleanup, checked before updating state) or using `AbortController` to cancel the previous request before starting a new one. `AbortController` is the cleaner solution because it actually cancels the request.

---

**Q: What does `useDeferredValue` do and how is it different from debouncing? (Medium)**

A: `useDeferredValue` tells React to update a value at lower priority, letting higher-priority updates (like typing in an input) interrupt it. It's a rendering concern — it keeps the UI responsive when rendering is expensive. Debouncing delays an event handler from firing. `useDeferredValue` doesn't delay network requests; it defers the React render that consumes a value. For API-based search, you need debouncing. For local expensive filtering, `useDeferredValue` can make the input feel more responsive.

---

**Q: What is the difference between debounce and throttle? When would you use each? (Medium)**

A: Debounce fires once after N ms of silence — the callback only runs when activity has stopped. Throttle fires at most once per N ms regardless — the callback runs at a regular rate during sustained activity. Use debounce for search (you want one request after the user pauses, not during typing). Use throttle for scroll or resize handlers where you want regular sampling but need to limit how often the handler runs.

---

**Q: Why should you not set `Content-Type` when using `AbortController`? (Low)**

A: That's a file upload concern, not related to `AbortController`. The relevant `AbortController` gotcha is handling `AbortError` — when `controller.abort()` fires, the fetch promise rejects with a `DOMException` where `name === 'AbortError'`. If you don't filter for it, your `catch` block treats cancellation as a real error, which can show false error states or trigger retry logic unnecessarily.
