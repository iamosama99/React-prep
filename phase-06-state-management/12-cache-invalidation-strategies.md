# Cache Invalidation Strategies

## The Problem

A cache is only useful if it reflects reality. When server data changes — because the user mutated it, another user mutated it, or a background process modified it — the cached copy becomes stale. Leaving stale data in the cache is a correctness bug. Invalidating too aggressively means fetching data you didn't need to, hurting performance.

Cache invalidation is the art of knowing exactly which cached data to discard or refresh, and when.

---

## Strategy 1: Invalidation After Mutation (React Query)

The most common strategy: when a mutation succeeds, invalidate the queries that depend on the affected data.

```js
const mutation = useMutation({
  mutationFn: createPost,
  onSuccess: () => {
    // Invalidate all queries whose key starts with 'posts'
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

`invalidateQueries` marks matching cache entries as stale and refetches any that currently have active subscribers. Entries with no active subscribers are marked stale but not refetched — they'll refetch the next time a component subscribes to them.

**Key-prefix matching** lets you invalidate a whole resource type without specifying every variant:

```js
// Matches: ['posts'], ['posts', 'list'], ['posts', 1], ['posts', 'search', { q: 'react' }]
queryClient.invalidateQueries({ queryKey: ['posts'] });

// Only matches exactly ['posts', 1]
queryClient.invalidateQueries({ queryKey: ['posts', 1], exact: true });
```

---

## Strategy 2: Tag-Based Invalidation (RTK Query)

RTK Query uses explicit tags. Queries declare what data they `providesTags`. Mutations declare what they `invalidatesTags`. The framework handles the rest.

```js
const api = createApi({
  endpoints: (builder) => ({
    // This query's cache entry is tagged with ['Post', { type: 'Post', id: LIST }]
    getPosts: builder.query({
      query: () => '/posts',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Post', id })),
              { type: 'Post', id: 'LIST' },
            ]
          : [{ type: 'Post', id: 'LIST' }],
    }),

    // Invalidates only the specific post that was updated
    updatePost: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/posts/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Post', id }],
    }),

    // Invalidates the entire list (triggers getPosts to refetch)
    createPost: builder.mutation({
      query: (post) => ({ url: '/posts', method: 'POST', body: post }),
      invalidatesTags: [{ type: 'Post', id: 'LIST' }],
    }),
  }),
});
```

The `LIST` sentinel tag is a convention: tag the list query with a special ID so you can invalidate the whole list without invalidating individual items. Invalidating `{ type: 'Post', id: 5 }` only causes the single-post query for post 5 to refetch; invalidating `{ type: 'Post', id: 'LIST' }` causes the list query to refetch.

---

## Strategy 3: Time-Based Staleness (staleTime)

Let data expire automatically based on age, without event-based invalidation. Useful when you can tolerate eventual consistency and don't always know when the server data changes.

```js
// Data is fresh for 5 minutes; after that, the next mount or focus triggers a refetch
const { data } = useQuery({
  queryKey: ['settings'],
  queryFn: fetchSettings,
  staleTime: 1000 * 60 * 5,
});

// Frequently changing data: very short stale time
const { data } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  staleTime: 10_000, // stale after 10 seconds
});

// Rarely changing data: long stale time
const { data } = useQuery({
  queryKey: ['countries'],
  queryFn: fetchCountries,
  staleTime: Infinity, // never stale — fetched once, never refetched
});
```

`staleTime: Infinity` is appropriate for truly static data (country lists, enum values, configs). It fetches once per session and never again.

---

## Strategy 4: Manual Cache Update (setQueryData)

Sometimes you have the updated data from the server response and can update the cache directly without a refetch. This avoids a round trip.

```js
const mutation = useMutation({
  mutationFn: updatePost,
  onSuccess: (updatedPost) => {
    // Update the cache directly with what the server returned
    queryClient.setQueryData(['post', updatedPost.id], updatedPost);

    // Also invalidate the list — the list may show derived data that changed
    queryClient.invalidateQueries({ queryKey: ['posts', 'list'] });
  },
});
```

This is most efficient when:
- The mutation returns the full updated resource
- You want instant UI update without a refetch round trip
- You still invalidate list queries that may show summarized versions

---

## Strategy 5: Polling

Background refetch on an interval for data that changes independently of user actions:

```js
// Polling: refetch every 30 seconds
const { data } = useQuery({
  queryKey: ['jobStatus', jobId],
  queryFn: () => fetchJobStatus(jobId),
  refetchInterval: 30_000,
  // Stop polling when job is done
  refetchIntervalInBackground: false,
  enabled: jobStatus !== 'completed',
});
```

In SWR:

```js
const { data } = useSWR('/api/job-status', fetcher, {
  refreshInterval: 30_000,
  // Can also use a function: refresh interval decreases as job progresses
  refreshInterval: (data) => data?.status === 'completed' ? 0 : 5000,
});
```

---

## Strategy 6: WebSocket / Server-Sent Events for Real-Time

For data that changes server-side and must appear in the UI immediately, polling is a workaround. The real solution is a push channel.

With React Query, you handle the WebSocket message and call `queryClient.invalidateQueries` or `queryClient.setQueryData`:

```js
useEffect(() => {
  const ws = new WebSocket('/ws/posts');

  ws.onmessage = (event) => {
    const { type, postId, data } = JSON.parse(event.data);

    if (type === 'post_updated') {
      queryClient.setQueryData(['post', postId], data);
    } else if (type === 'post_deleted') {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  };

  return () => ws.close();
}, [queryClient]);
```

React Query doesn't know about WebSockets — it just provides `setQueryData` and `invalidateQueries` as imperative APIs you call from wherever.

---

## Choosing a Strategy

| Scenario | Strategy |
|---|---|
| User performs a mutation, affected data is known | Invalidate by key prefix after mutation |
| Using RTK Query | Provide/invalidate tags |
| Data can be updated from the mutation response | `setQueryData` with server response |
| Data changes on its own (job status, prices) | Polling or WebSocket |
| Rarely changes, tolerance for eventual consistency | `staleTime` |
| Static data (reference data, configs) | `staleTime: Infinity` |
| Real-time data (chat, live feed) | WebSocket + `setQueryData` |

---

## Interview Questions

**Q (High): How does tag-based invalidation in RTK Query work? How is it different from React Query's approach?**

Answer: RTK Query uses a declarative tag system. Queries annotate their results with `providesTags` — a list of typed tags describing what data they return. Mutations annotate with `invalidatesTags` — a list of tags describing what they changed. When a mutation completes, RTK Query automatically finds every cache entry whose `providesTags` intersects with the mutation's `invalidatesTags` and refetches them. React Query doesn't have a tag system — invalidation is key-based. You call `queryClient.invalidateQueries({ queryKey: ['posts'] })` manually in the mutation's `onSuccess` callback, and React Query matches by key prefix. Both achieve the same outcome; RTK Query is more declarative and automatic, React Query gives you imperative control.

---

**Q (High): When should you use `setQueryData` instead of `invalidateQueries`?**

Answer: Use `setQueryData` when the mutation returns the full updated resource and you want to update the cache without an extra network round trip. If you update a post and the server returns the complete updated post, write it directly to the cache — the data is already there, no refetch needed. Use `invalidateQueries` when you don't have the new data (e.g., a delete mutation doesn't return the updated list), or when the mutation affects queries that you can't update directly (e.g., a list that derives summary data). Often you do both: `setQueryData` for the specific resource, `invalidateQueries` for any list queries that might include it.

---

**Q (Medium): What's the difference between marking a query as stale and removing it from the cache?**

Answer: Marking as stale (via `invalidateQueries` or because `staleTime` expired) means: the next time a component mounts with this key, or a revalidation trigger fires, a background fetch will run. The cached data stays in memory and is returned immediately while the fetch is in progress — the stale-while-revalidate pattern. Removing from the cache (via `removeQueries` or `gcTime` expiry) means the entry is gone. The next mount shows a loading state with no data until the fetch completes. Stale = outdated but usable. Removed = gone entirely.

---

*Next: State machines (XState) — when explicit states and transitions are cleaner than a tangle of booleans.*
