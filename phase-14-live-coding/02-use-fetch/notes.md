# useFetch

## Quick Reference

| Concern | Pattern |
|---|---|
| State shape | `{ data: T \| null, loading: boolean, error: string \| null }` |
| Race condition cause | Multiple in-flight requests resolve out of order |
| Race condition fix | `AbortController` — cancel previous fetch on re-run |
| Abort error handling | `if (error.name === 'AbortError') return;` — don't show to user |
| Initial state | `data: null, loading: false, error: null` |
| Loading state | Set `loading: true` at start of fetch, `false` in finally |
| Generic hook signature | `useFetch<T>(url: string): { data: T \| null, loading: boolean, error: string \| null }` |

---

## Why This Matters

`useFetch` is the canonical example of a custom hook that encapsulates async lifecycle. Interviewers ask for it because:

1. It tests state machine thinking (idle → loading → success | error)
2. It exposes whether you know about the race condition
3. It tests `AbortController` knowledge — a frequently asked browser API
4. TypeScript generics: making the return type match the data shape

A naive implementation with just `useState` and `fetch` is expected from junior candidates. Senior candidates are expected to handle the race condition and cleanup.

---

## Core Concepts

### State Machine

Every async operation has a state machine. For `useFetch`:

```
idle ──(url set)──→ loading ──(success)──→ success
                           └──(error)───→ error
```

Map this directly to state:

```tsx
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Basic Implementation (no abort)

```tsx
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(json => setData(json))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}
```

This works, but has a race condition.

### The Race Condition

```
User clicks "User 1"  → Request A fires
User clicks "User 3"  → Request B fires
Request B resolves (fast)  → data = User 3's data ✓
Request A resolves (slow)  → data = User 1's data  ✗ STALE!
```

The UI now shows User 1's data even though the user selected User 3. This is silent data corruption — no error, just wrong data.

### AbortController Fix

```tsx
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then(json => setData(json))
      .catch(err => {
        // AbortError is expected — don't show it as an error to the user
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}
```

When the effect re-runs (because `url` changed), the cleanup function runs first — `controller.abort()` cancels the in-flight request. The new effect then starts a fresh fetch with a fresh controller.

### How AbortController Works

```tsx
const controller = new AbortController();
// controller.signal is an AbortSignal object

fetch(url, { signal: controller.signal });
// fetch reads the signal — if it's aborted, the promise rejects with AbortError

controller.abort(); // Signal fires — pending fetch rejects immediately
```

### Adding a Refetch Function

A useful enhancement for manual refresh:

```tsx
const [fetchKey, setFetchKey] = useState(0);
// In the useEffect deps: [url, fetchKey]

const refetch = useCallback(() => setFetchKey(k => k + 1), []);
return { data, loading, error, refetch };
```

---

## Common Interview Gotchas

1. **Not handling `res.ok`**: `fetch` only rejects on network failures. A 404 or 500 response resolves the promise. Always check `res.ok` and throw if false.

2. **Treating AbortError as a user-visible error**: `controller.abort()` causes the fetch to reject with an AbortError. This is expected behavior — do not set error state for it.

3. **Calling `setLoading(false)` in `.finally()` after abort**: This can still run after abort. It's usually harmless, but in strict cases you can check `!controller.signal.aborted` before calling any state setter.

4. **Missing `setError(null)` at fetch start**: If a previous fetch errored, the error persists when a new URL is requested. Reset error state at the beginning of each effect.

5. **Not including `url` in the dependency array**: The effect won't re-run when the URL changes.

---

## Self-Assessment

- [ ] I can implement `useFetch` with loading, data, and error states
- [ ] I can explain the race condition and demonstrate it occurring
- [ ] I can implement `AbortController` correctly and handle `AbortError`
- [ ] I know why `fetch` doesn't reject on 404/500 and how to handle it
- [ ] I can add a `refetch` function to force a re-fetch

---

## Interview Q&A

**Q: What is the race condition in a naive useFetch implementation? `High`**

A: When the URL changes rapidly — say a user clicks through a list — multiple fetch requests can be in-flight simultaneously. If they resolve out of order (network latency varies), an older response can overwrite a newer one. The user sees stale data with no indication of an error. The fix is `AbortController`: each time the effect re-runs, the cleanup function aborts the previous fetch before the new one starts, so only the latest request can update state.

---

**Q: What happens when `controller.abort()` is called on an in-flight fetch? `High`**

A: The fetch promise rejects with a `DOMException` whose `.name` property is `'AbortError'`. You must catch this in your error handler and explicitly ignore it — do not call `setError` for an AbortError because it's expected behavior, not a real error. If you don't handle it, users see an error message every time they type in a search box (every fast URL change triggers an abort).

---

**Q: Why does `fetch` not reject on a 404 or 500 response? `Medium`**

A: `fetch` only rejects when the request itself cannot be made — network failure, DNS resolution failure, CORS block, or abort. HTTP error status codes (4xx, 5xx) are still valid HTTP responses that `fetch` considers successful at the transport level. The response object has `res.ok` (true for 200–299) and `res.status` to check the actual status code. Always add `if (!res.ok) throw new Error(...)` after the `await fetch()`.

---

**Q: How would you add a cache to `useFetch` to avoid re-fetching the same URL? `Medium`**

A: Store results in a module-level `Map<string, unknown>` or a React context. Before fetching, check if the URL is cached. If it is, set data immediately without a loading state. If not, fetch and populate the cache on success. For production, use a library like SWR or React Query — they implement caching, deduplication, revalidation, and stale-while-revalidate out of the box.

---

**Q: How do you implement a `refetch` function in `useFetch`? `Low`**

A: Add a counter state (`fetchKey`) to the dependency array of the useEffect alongside `url`. Incrementing it forces the effect to re-run even if the URL hasn't changed. Expose a `refetch` callback that increments the counter. This is a clean pattern because it works within the rules of React's hook system — no imperative fetch calls needed.
