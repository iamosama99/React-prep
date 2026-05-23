# SWR

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Key-as-fetcher-arg | The SWR key is passed directly to the fetcher function | Simpler setup but less flexible than React Query's separate key/queryFn |
| Auto-revalidation | Refetches on mount, tab focus, and network reconnect by default | Users returning to a tab silently get fresh data |
| `useSWRMutation` | Hook for write operations (SWR v2+) | Explicit mutation control separate from read queries |
| `mutate` | Imperative function to trigger revalidation or update cache | Manual cache invalidation or optimistic update entry point |

## What SWR Is

SWR is Vercel's data fetching library for React. The name is the caching strategy: **stale-while-revalidate** — serve cached data immediately, then revalidate in the background. It's lighter than React Query, with a smaller API surface and a stronger focus on simplicity over features.

```
npm install swr
```

---

## Basic Usage

```js
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(r => r.json());

function UserProfile({ id }) {
  const { data, error, isLoading } = useSWR(`/api/users/${id}`, fetcher);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage />;

  return <div>{data.name}</div>;
}
```

The **key** is the first argument — a string, array, or function. The **fetcher** is any async function that returns data. SWR calls `fetcher(key)` and caches the result under `key`. Two components using the same key share one request.

Unlike React Query, the key doubles as the argument to the fetcher. This means your key and your URL are often the same string, which is convenient but less flexible than React Query's separate `queryKey` + `queryFn`.

---

## Key as the Fetcher Argument

```js
// Simple string key — passed directly to fetcher
useSWR('/api/users', fetcher);

// Array key — destructured in fetcher (or passed as array)
useSWR(['/api/users', { page: 2 }], ([url, params]) =>
  fetch(url + '?' + new URLSearchParams(params)).then(r => r.json())
);

// Function key — conditional fetching, skip when null/false
useSWR(userId ? `/api/users/${userId}` : null, fetcher);
```

---

## Global Configuration

```js
import { SWRConfig } from 'swr';

function App() {
  return (
    <SWRConfig
      value={{
        fetcher: (url) => fetch(url).then(r => r.json()), // default fetcher
        revalidateOnFocus: true,                           // refetch on tab focus
        revalidateOnReconnect: true,                      // refetch on reconnect
        dedupingInterval: 2000,                           // dedup requests within 2s
        errorRetryCount: 3,                               // retry on error, max 3 times
      }}
    >
      <Router />
    </SWRConfig>
  );
}
```

With a global fetcher, you don't need to pass it to every `useSWR` call.

---

## Mutations with useSWRMutation

For write operations, SWR v2 introduced `useSWRMutation`:

```js
import useSWRMutation from 'swr/mutation';

async function createUser(url, { arg }) {
  return fetch(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  }).then(r => r.json());
}

function CreateUserForm() {
  const { trigger, isMutating } = useSWRMutation('/api/users', createUser);

  async function handleSubmit(data) {
    try {
      const user = await trigger(data); // arg is passed as second argument to fetcher
      console.log('created:', user);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <button onClick={() => handleSubmit({ name: 'Alice' })} disabled={isMutating}>
      Create
    </button>
  );
}
```

---

## Manual Revalidation

```js
import { mutate } from 'swr';

// Globally trigger a revalidation for a key (refetch from anywhere)
mutate('/api/users');

// Or from within a component
import useSWR, { useSWRConfig } from 'swr';

function RefreshButton() {
  const { mutate } = useSWRConfig();
  return <button onClick={() => mutate('/api/users')}>Refresh</button>;
}
```

`mutate` can also be used to update cache data directly (for optimistic updates):

```js
// Optimistic update with rollback
mutate('/api/users/1',
  // Optimistically set data
  { ...currentData, name: 'New Name' },
  {
    optimisticData: { ...currentData, name: 'New Name' },
    rollbackOnError: true,        // revert if the update function throws
    revalidate: true,             // refetch after mutation
  }
);
```

> **Check yourself:** What is the difference between calling `mutate('/api/users')` with no data argument vs calling it with a data object and `optimisticData`?

---

## SWR vs React Query

Both implement stale-while-revalidate. The differences matter in practice:

| | SWR | React Query |
|---|---|---|
| Bundle size | ~4kb | ~13kb |
| API surface | Minimal | Comprehensive |
| Key/fetcher coupling | Key is passed to fetcher | Separate `queryKey` + `queryFn` |
| Mutation API | `useSWRMutation` (v2) | `useMutation` with `onSuccess/onError/onMutate` |
| Infinite scroll | `useSWRInfinite` | `useInfiniteQuery` |
| Devtools | None built-in | React Query Devtools |
| Optimistic updates | `mutate` with `optimisticData` | `onMutate` + `setQueryData` |
| Tag-based invalidation | No — key-based only | No — key-based only (tags are an RTK Query concept) |
| Suspense support | Yes | Yes |
| Pagination | Manual with `useSWRInfinite` | `keepPreviousData`, `useInfiniteQuery` |

**When to choose SWR:**
- You want minimal API surface and bundle size
- You're in a Next.js project (SWR is by Vercel, excellent integration)
- Your data fetching needs are straightforward: fetch + cache + revalidate

**When to choose React Query:**
- You need richer mutation lifecycle hooks (`onMutate`, `onError`, `onSettled`)
- You want DevTools for inspecting and debugging cache state
- You need more control over cache invalidation
- You're building complex paginated or infinite-scroll UIs

---

## Revalidation Triggers

SWR automatically revalidates data in several scenarios:

1. **On mount** — when a component using the key mounts for the first time, or mounts after data is stale
2. **On focus** — when the browser tab regains focus (`revalidateOnFocus: true` by default)
3. **On reconnect** — when the network comes back online (`revalidateOnReconnect: true` by default)
4. **On interval** — if `refreshInterval` is set
5. **Manual** — via `mutate(key)`

Tab focus revalidation is one of SWR's signature behaviors. A user who switches tabs and returns will silently get fresh data. This can be surprising if you're not expecting it — and useful if you are.

> **Check yourself:** A user opens your app, switches to another tab for 5 minutes, then comes back. SWR is configured with default options. What happens to the displayed data?

---

## Interview Questions


**Q (High): What does "stale-while-revalidate" mean in SWR?**

Answer: When a component requests data and a cached entry exists — even if it's stale — SWR returns the cached data immediately, with no loading state. Simultaneously, it starts a background revalidation request. When the request completes and the data has changed, the component re-renders with the updated data. If it hasn't changed, nothing happens. The user sees content instantly instead of waiting for a network round-trip. "Stale" means the cached data may be outdated. "While-revalidate" means while we're fetching fresh data in the background. The tradeoff: users briefly see possibly-outdated data, but they're never blocked on a spinner for data they've seen before.

---
**Q (Medium): How does SWR's key differ from React Query's queryKey?**

Answer: In SWR, the key is passed directly to the fetcher function as its argument. This means the key is typically the URL (or a value that can be coerced to a URL), and the fetcher receives it to know what to fetch. In React Query, `queryKey` and `queryFn` are separate: the key is purely for caching/deduplication identity, and the `queryFn` is an independent function that can use anything from its closure. React Query's model is more flexible — the query key doesn't have to be the URL. SWR's coupling of key to fetcher argument is simpler but less flexible, particularly for queries with complex parameters.

---

**Q (Medium): What causes SWR to revalidate automatically, without you calling `mutate`?**

Answer: Three automatic triggers: (1) Component mount — when the component using a key mounts or remounts and the data is considered stale. (2) Window focus — when the browser tab regains focus (`revalidateOnFocus`, enabled by default). This ensures users coming back to a tab after time away see fresh data. (3) Network reconnect — when the device comes back online (`revalidateOnReconnect`, enabled by default). You can also set `refreshInterval` for periodic polling. All of these can be configured globally in `SWRConfig` or per-hook.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the stale-while-revalidate strategy in one sentence without notes
- [ ] Can name the three automatic revalidation triggers in SWR
- [ ] Can explain the key difference between SWR's key and React Query's `queryKey`
- [ ] Can state two scenarios where you'd choose SWR over React Query, and two where you'd choose React Query
- [ ] Can write a basic `useSWR` call with conditional fetching from memory

---

*Next: Optimistic updates — the pattern for making mutations feel instant with rollback on failure.*
