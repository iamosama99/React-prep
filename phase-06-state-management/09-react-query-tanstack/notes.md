# React Query / TanStack Query

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Query key | Serializable array that uniquely identifies a cache entry | Same key = one request, shared cache; hierarchical prefix matching for invalidation |
| `staleTime` | How long fetched data is considered fresh | Controls whether a background refetch fires on mount |
| `gcTime` | How long unused cache entries stay in memory after last subscriber unmounts | Controls retention without blocking the initial load experience |
| Stale-while-revalidate | Return cached data immediately, refetch in background | Users see content instantly; UI silently corrects if data changed |

## What It Is

TanStack Query (formerly React Query) is a server-state management library. It handles the full lifecycle of async data in React: fetching, caching, background refetching, deduplication, stale-while-revalidate, pagination, mutations, and optimistic updates. You describe what data you want and how to get it; the library manages every phase of that data's life.

Current version is v5 (TanStack Query). The API changed significantly from v3. This covers v5.

---

## Setup

```js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 minutes — data stays fresh for this long
      gcTime: 1000 * 60 * 10,     // 10 minutes — unused cache entries removed after this
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}
```

---

## useQuery

```js
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
    staleTime: 1000 * 60 * 2, // override default: stay fresh for 2 minutes
    enabled: !!userId,         // don't fetch until userId is truthy
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorMessage message={error.message} />;

  return <div>{data.name}</div>;
}
```

**Query key** is the cache key. It must be an array. Any serializable value can go in it. Same key from multiple components = same cache entry = one request.

```js
// These all get the same cache entry
useQuery({ queryKey: ['user', 42], queryFn: ... });
useQuery({ queryKey: ['user', 42], queryFn: ... }); // deduped
```

**`staleTime` vs `gcTime`:**
- `staleTime`: how long fetched data is considered fresh. During this window, no background refetch happens.
- `gcTime` (was `cacheTime` in v3): how long *unused* data stays in the cache after the last subscriber unmounts. After this, it's garbage-collected.

> **Check yourself:** You set `staleTime: 60000`. A component mounts and fetches the data. 30 seconds later the component unmounts, then remounts. Does it show a loading spinner? Does it background-refetch?

---

## Status Flags

`isLoading` is true only when there's no cached data and a fetch is in-flight. `isFetching` is true whenever a request is in-flight — including background refetches. Use `isFetching` for "subtle refresh spinner" UX; use `isLoading` for "full loading screen" UX.

v5 also exposes a `status` field (`'pending' | 'error' | 'success'`) and `fetchStatus` (`'fetching' | 'paused' | 'idle'`) for more granular control.

---

## useMutation

```js
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreatePost() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newPost) =>
      fetch('/api/posts', { method: 'POST', body: JSON.stringify(newPost) })
        .then(r => r.json()),
    onSuccess: () => {
      // Invalidate the posts list so it refetches
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Failed to create post:', error);
    },
  });

  return (
    <button
      onClick={() => mutation.mutate({ title: 'New Post', body: '...' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Creating...' : 'Create Post'}
    </button>
  );
}
```

`mutation.mutate` is fire-and-forget. `mutation.mutateAsync` returns a Promise for `await`-based flows.

---

## Stale-While-Revalidate

This is React Query's default caching strategy. When a component mounts and the data is in the cache but stale (older than `staleTime`):
1. The cached data is returned immediately (no loading spinner)
2. A background refetch starts silently
3. When the refetch completes, the component re-renders with fresh data

The user sees data instantly, then gets an update if it changed. This is the `stale-while-revalidate` pattern from HTTP caching, applied to in-memory server state.

```js
// With staleTime: 0 (default), every mount triggers a background refetch
// With staleTime: 5min, data fetched less than 5min ago won't trigger a refetch
const { data } = useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
  staleTime: 1000 * 60 * 5,
});
```

---

## Query Invalidation

`queryClient.invalidateQueries` marks matching cache entries as stale and triggers a refetch for any that have active subscribers:

```js
// Invalidate all queries whose key starts with 'posts'
queryClient.invalidateQueries({ queryKey: ['posts'] });

// Invalidate exactly this query
queryClient.invalidateQueries({ queryKey: ['posts', postId], exact: true });
```

> **Check yourself:** `queryClient.invalidateQueries({ queryKey: ['posts'] })` is called. Which of these keys are matched: `['posts']`, `['posts', 1]`, `['post', 1]`, `['posts', 'list', { filter: 'active' }]`?

---

## Optimistic Updates

```js
const mutation = useMutation({
  mutationFn: updatePost,
  onMutate: async (updatedPost) => {
    // Cancel outgoing refetches to prevent them overwriting our optimistic update
    await queryClient.cancelQueries({ queryKey: ['post', updatedPost.id] });

    // Snapshot the current value for rollback
    const previousPost = queryClient.getQueryData(['post', updatedPost.id]);

    // Optimistically update the cache
    queryClient.setQueryData(['post', updatedPost.id], updatedPost);

    // Return context for onError
    return { previousPost };
  },
  onError: (err, updatedPost, context) => {
    // Rollback
    queryClient.setQueryData(['post', updatedPost.id], context.previousPost);
  },
  onSettled: () => {
    // Refetch regardless of success or failure to sync with server
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

---

## Pagination and Infinite Queries

```js
// Offset pagination
function PostList() {
  const [page, setPage] = useState(1);
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['posts', page],
    queryFn: () => fetchPosts({ page }),
    placeholderData: keepPreviousData, // keep old data while fetching next page
  });

  return (
    <>
      {data?.posts.map(post => <Post key={post.id} post={post} />)}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={isPlaceholderData || !data?.hasMore}
      >
        Next
      </button>
    </>
  );
}

// Infinite scroll
import { useInfiniteQuery } from '@tanstack/react-query';

function InfinitePostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  return (
    <>
      {data.pages.flatMap(page => page.posts).map(post => <Post key={post.id} post={post} />)}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load more
        </button>
      )}
    </>
  );
}
```

---

## Prefetching

Load data before the user navigates to a page:

```js
// On hover, prefetch so the page is instant when clicked
<Link
  to={`/users/${userId}`}
  onMouseEnter={() =>
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
    })
  }
>
  View Profile
</Link>
```

---

## Interview Questions


**Q (High): Explain the stale-while-revalidate pattern in React Query.**

Answer: When a query has cached data that's older than `staleTime`, React Query returns the cached data immediately (no loading state) and starts a background refetch simultaneously. The user sees content instantly. When the refetch completes, if the data changed, the component re-renders with the fresh data. If it didn't change, nothing happens. This pattern prioritizes responsiveness — the user is never blocked waiting for a network request when there's usable data in cache. `staleTime` controls how long data is considered "fresh enough" to not trigger a background refetch. At `staleTime: 0` (default), data is stale the moment it's fetched, so every component mount triggers a background refetch.

---

**Q (High): What is the query key and why does its structure matter?**

Answer: The query key is a serializable array that uniquely identifies a cache entry. React Query uses it as the cache key, for deduplication (multiple components with the same key share one request and one cache entry), and for invalidation (you can invalidate by prefix match). Structure matters because React Query does hierarchical matching: `invalidateQueries({ queryKey: ['posts'] })` matches `['posts']`, `['posts', 1]`, `['posts', 'list', { filter: 'active' }]`. This lets you invalidate all queries related to a resource type without knowing every specific query. By convention, keys are structured `[entity, id?, params?]` — `['posts']` for the list, `['post', id]` for a single item. Dependencies that change the query (user ID, filter, page) go in the key so React Query refetches automatically when they change.

---

**Q (High): What is the difference between `staleTime` and `gcTime` (cacheTime)?**

Answer: `staleTime` determines freshness — how long after a successful fetch the data is considered current. During this window, if a component mounts and finds this data in cache, it uses it without triggering a background refetch. `gcTime` determines retention — how long unused cache entries (no active subscribers) remain in memory before being garbage-collected. When a component unmounts, its cache entry isn't removed immediately; it stays for `gcTime` in case the component remounts or another component needs the same data. If the component remounts within `gcTime`, it gets the cached data immediately. After `gcTime`, the entry is removed and the next mount triggers a fresh fetch.

---
**Q (Medium): How do you handle the race condition where a background refetch overwrites an optimistic update?**

Answer: In the `onMutate` callback, before applying the optimistic update, call `queryClient.cancelQueries()` for the affected query keys. This cancels any in-flight refetch requests for those queries. Without this, you could apply an optimistic update, then have a concurrent background refetch complete and overwrite it with stale server data before your mutation's response arrives. After canceling, apply the optimistic update. The `onSettled` callback — which runs on both success and failure — typically calls `invalidateQueries` to trigger a fresh refetch once the mutation is resolved.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain stale-while-revalidate in one sentence without notes
- [ ] Can distinguish `staleTime` from `gcTime` — what each controls and when each matters
- [ ] Can explain query key hierarchical matching and why it enables efficient invalidation
- [ ] Can write the full optimistic update pattern (onMutate / onError / onSettled) from memory
- [ ] Can explain when to use `isLoading` vs `isFetching` for UX decisions

---

*Next: SWR — Vercel's alternative to React Query and where they differ.*
