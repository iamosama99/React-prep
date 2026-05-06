# RTK Query

## What It Is

RTK Query is a data fetching and caching solution built into Redux Toolkit. It eliminates the manual `createAsyncThunk` + loading/error/data state pattern for server data. You define endpoints, RTK Query generates hooks, and the hooks manage fetching, caching, deduplication, background refetching, and cache invalidation automatically.

It lives inside RTK — no separate package needed if you already use RTK. It stores data in the Redux store, so everything is accessible via DevTools.

---

## createApi

Everything starts with `createApi`:

```js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const usersApi = createApi({
  reducerPath: 'usersApi',       // key in the Redux store
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User'],            // cache invalidation tags
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation({
      query: (newUser) => ({
        url: '/users',
        method: 'POST',
        body: newUser,
      }),
      invalidatesTags: ['User'],  // invalidates all User-tagged cache entries
    }),
    updateUser: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
} = usersApi;
```

Register the API's reducer and middleware in the store:

```js
import { configureStore } from '@reduxjs/toolkit';
import { usersApi } from './usersApi';

const store = configureStore({
  reducer: {
    [usersApi.reducerPath]: usersApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(usersApi.middleware),
});
```

The middleware is required — it handles cache lifetime, polling, and invalidation.

---

## Query Hooks

Generated query hooks fetch data when the component mounts and return a result object:

```js
function UserList() {
  const { data, isLoading, isFetching, isError, error } = useGetUsersQuery();

  if (isLoading) return <Spinner />;      // first load, no cache
  if (isError) return <Error message={error.message} />;

  return (
    <ul>
      {data.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

Key status flags:
- `isLoading` — true only on the first fetch (no cached data yet)
- `isFetching` — true whenever a request is in-flight (including background refetches)
- `isSuccess` — data exists and is not stale
- `isError` — last request failed

**Conditional fetching** — skip the query until a condition is met:

```js
const { data } = useGetUserByIdQuery(userId, { skip: !userId });
```

**Polling** — refetch on an interval:

```js
const { data } = useGetUsersQuery(undefined, { pollingInterval: 30000 }); // every 30s
```

---

## Mutation Hooks

```js
function CreateUserForm() {
  const [createUser, { isLoading, isError }] = useCreateUserMutation();

  async function handleSubmit(formData) {
    try {
      const user = await createUser(formData).unwrap(); // throws on error
      console.log('Created:', user);
    } catch (err) {
      console.error('Failed:', err);
    }
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

`.unwrap()` returns a Promise that resolves with the data or rejects with the error. Without it, the mutation always "succeeds" from the hook's perspective (errors are in the result object, not thrown).

---

## Cache and Invalidation

RTK Query's power is its cache invalidation model. Queries declare what data they `providesTags`, and mutations declare what `invalidatesTags`. When a mutation invalidates a tag, every query that provided that tag is automatically refetched.

```js
// This query provides a User tag for this specific user
getUserById: builder.query({
  query: (id) => `/users/${id}`,
  providesTags: (result, error, id) => [{ type: 'User', id }],
}),

// This mutation invalidates only the specific updated user, not all users
updateUser: builder.mutation({
  query: ({ id, ...patch }) => ({ url: `/users/${id}`, method: 'PATCH', body: patch }),
  invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
}),

// This mutation invalidates all User tags (causes all user queries to refetch)
deleteUser: builder.mutation({
  query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
  invalidatesTags: ['User'],
}),
```

Tags can be typed (`{ type: 'User', id: 5 }`) for per-item granularity, or untyped (`'User'`) to invalidate all queries of that type.

---

## Cache Lifecycle

RTK Query keeps cached data alive for 60 seconds after the last subscriber unmounts (configurable via `keepUnusedDataFor`). If another component mounts and subscribes to the same endpoint+args before the cache expires, it gets the cached data immediately — no new request.

```js
getUserById: builder.query({
  query: (id) => `/users/${id}`,
  keepUnusedDataFor: 300, // keep for 5 minutes after last subscriber unmounts
}),
```

This deduplication is automatic — two components calling `useGetUserByIdQuery(42)` at the same time trigger exactly one network request.

---

## Manual Cache Updates (Optimistic Updates)

For optimistic UI, RTK Query provides `onQueryStarted` with `updateQueryData`:

```js
updateUser: builder.mutation({
  query: ({ id, ...patch }) => ({ url: `/users/${id}`, method: 'PATCH', body: patch }),
  async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
    // Optimistically update the cache before the request completes
    const patchResult = dispatch(
      usersApi.util.updateQueryData('getUserById', id, (draft) => {
        Object.assign(draft, patch); // Immer draft, mutate freely
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo(); // rollback on failure
    }
  },
}),
```

`patchResult.undo()` rolls back the optimistic update if the request fails.

---

## RTK Query vs React Query

Both solve server state caching. The main differences:

| | RTK Query | React Query |
|---|---|---|
| Requires Redux | Yes | No |
| Bundle size | Smaller if already using RTK | Standalone |
| DevTools | Redux DevTools | Dedicated React Query DevTools |
| Cache storage | Redux store | Internal cache |
| Endpoint definition | Centralized in `createApi` | Per-query |
| Optimistic updates | `onQueryStarted` + `updateQueryData` | `onMutate` + `setQueryData` |

Choose RTK Query if you're already in a Redux codebase. Choose React Query if you want server-state management without Redux.

---

## Interview Questions

**Q (High): How does RTK Query's cache invalidation work?**

Answer: Queries declare `providesTags` — an array of tags describing what data they return. Mutations declare `invalidatesTags` — an array of tags describing what data they changed. When a mutation completes, RTK Query finds every cached query whose `providesTags` intersects with the mutation's `invalidatesTags` and marks them as stale, triggering a background refetch for any query that currently has active subscribers. Tags can be typed (`{ type: 'User', id: 5 }`) to target a specific item, or generic (`'User'`) to invalidate all queries of that type. This lets you express fine-grained invalidation: updating a single user refetches only that user's detail page, while creating a user refetches the entire list.

---

**Q (High): What is the difference between `isLoading` and `isFetching` in RTK Query?**

Answer: `isLoading` is true only when the first request is in-flight and there's no cached data yet — the component has no data to show. `isFetching` is true whenever any request is in-flight, including background refetches after invalidation or polling. A component that had cached data will have `isLoading: false, isFetching: true` during a background refetch — it can show the stale data while the update is in progress. The distinction lets you show full loading spinners for initial loads and subtle background refresh indicators for subsequent updates.

---

**Q (Medium): Why is the RTK Query middleware required in `configureStore`?**

Answer: RTK Query uses the Redux middleware to manage cache lifetimes. When a query's last subscriber unmounts, the middleware starts a timer — by default 60 seconds. If no new subscriber mounts before the timer expires, the middleware dispatches an action to remove the cached data from the store. The middleware also handles polling intervals and re-trigger logic when tags are invalidated. Without it, none of these background operations happen: data would stay in the store forever (memory leak) or be garbage-collected immediately, losing the cache benefits.

---

**Q (Medium): How do you perform optimistic updates in RTK Query and roll back on failure?**

Answer: Use the `onQueryStarted` callback in a mutation endpoint. It receives the mutation argument and a `{ dispatch, queryFulfilled }` object. Call `dispatch(api.util.updateQueryData(endpointName, queryArg, draft => { ... }))` to immediately update the cache optimistically — the draft uses Immer so you can mutate freely. Store the returned `patchResult`. Then `await queryFulfilled` — if it resolves, the optimistic update is confirmed and stays. If it throws, call `patchResult.undo()` to roll back the cache to its previous value.

---

*Next: Zustand — minimal global state without providers, reducers, or boilerplate.*
