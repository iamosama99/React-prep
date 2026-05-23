# Optimistic Updates

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Snapshot → Apply → Confirm/Rollback | The 4-step pattern every optimistic update follows | Structures the implementation so rollback is always possible |
| `cancelQueries` before applying | Cancels in-flight refetches before setting optimistic state | Prevents a concurrent refetch from overwriting your optimistic update |
| `onSettled` refetch | Invalidates the query after success or failure | Ensures eventual consistency even when your prediction was wrong |
| Concurrent mutations | Multiple optimistic updates before any complete can have interfering snapshots | Rollbacks can undo each other; `onSettled` is safer than relying solely on rollback |

## What They Are

An optimistic update is when the UI reflects a change immediately — before the server has confirmed it — on the assumption (optimism) that the request will succeed. If the request fails, the UI rolls back to the previous state. If it succeeds, the UI stays as-is or syncs with the server response.

The user experience difference is significant. Without optimistic updates: click "like" → spinner → like count increases. With optimistic updates: click "like" → like count increases immediately → silent sync in background. The action feels instant because it is instant (from the user's perspective).

---

## The Pattern

Every optimistic update implementation follows the same four steps:

1. **Snapshot** the current state before the mutation
2. **Apply** the predicted outcome to the UI immediately
3. **Wait** for the server response
4. **Confirm** (do nothing) on success, or **rollback** to the snapshot on failure

```js
// Conceptually:
function handleLike(postId) {
  const previous = store.get(postId);          // 1. snapshot
  store.set(postId, { ...previous, likes: previous.likes + 1 }); // 2. apply
  api.likePost(postId)
    .then(() => {})                            // 3/4. success: leave as-is
    .catch(() => store.set(postId, previous)); // 4. failure: rollback
}
```

---

> **Check yourself:** What are the four steps of the optimistic update pattern? What triggers step 4's "rollback" branch vs the "confirm" branch?

## With React Query (useMutation + onMutate)

```js
import { useMutation, useQueryClient } from '@tanstack/react-query';

function LikeButton({ postId }) {
  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: (id) => api.likePost(id),

    onMutate: async (id) => {
      // 1. Cancel concurrent refetches (they'd overwrite the optimistic update)
      await queryClient.cancelQueries({ queryKey: ['post', id] });

      // 2. Snapshot current value
      const previousPost = queryClient.getQueryData(['post', id]);

      // 3. Apply optimistic update
      queryClient.setQueryData(['post', id], (old) => ({
        ...old,
        likes: old.likes + 1,
        likedByMe: true,
      }));

      // 4. Return snapshot as context (available in onError)
      return { previousPost };
    },

    onError: (err, id, context) => {
      // Rollback to snapshot
      queryClient.setQueryData(['post', id], context.previousPost);
    },

    onSettled: (data, error, id) => {
      // Always refetch to sync with real server state
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  return <button onClick={() => mutate(postId)}>Like</button>;
}
```

**Why `cancelQueries` first?** If a background refetch is already in-flight when you apply the optimistic update, the refetch may complete after your update and overwrite it with stale server data — giving the illusion of the action being undone. Canceling any in-flight requests for the key prevents this.

**Why `onSettled` refetches?** Optimistic updates are predictions. Even on success, the server response might differ from your prediction (e.g., the server deduplicates likes, or another user also liked simultaneously). `onSettled` ensures eventual consistency.

---

## With RTK Query (onQueryStarted)

```js
updatePost: builder.mutation({
  query: ({ id, ...patch }) => ({
    url: `/posts/${id}`,
    method: 'PATCH',
    body: patch,
  }),
  async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      postsApi.util.updateQueryData('getPost', id, (draft) => {
        // Immer draft — mutate directly
        Object.assign(draft, patch);
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo(); // rollback on error
    }
  },
}),
```

RTK Query's model is similar to React Query but uses `patchResult.undo()` instead of snapshot/restore.

---

## With Zustand (pure client state)

When the state is fully client-owned (not server state), optimistic updates are simpler — there's no server to sync with, but you still need rollback on network failure:

```js
const usePostStore = create(set => ({
  posts: {},
  likePost: async (postId) => {
    // Apply immediately
    set(state => ({
      posts: {
        ...state.posts,
        [postId]: { ...state.posts[postId], likes: state.posts[postId].likes + 1 }
      }
    }));

    try {
      await api.likePost(postId);
    } catch (err) {
      // Rollback
      set(state => ({
        posts: {
          ...state.posts,
          [postId]: { ...state.posts[postId], likes: state.posts[postId].likes - 1 }
        }
      }));
      throw err;
    }
  },
}));
```

---

## The Harder Cases

**Operations that produce server-generated data:**

When the server generates a new ID, timestamp, or computed field that you can't predict:

```js
onMutate: async (newTodo) => {
  const previousTodos = queryClient.getQueryData(['todos']);

  // Apply with a temporary placeholder ID
  queryClient.setQueryData(['todos'], (old) => [
    ...old,
    { ...newTodo, id: `temp-${Date.now()}`, pending: true },
  ]);

  return { previousTodos };
},

onSuccess: (savedTodo) => {
  // Replace the temp entry with the real server response
  queryClient.setQueryData(['todos'], (old) =>
    old.map(t => t.id.startsWith('temp-') ? savedTodo : t)
  );
},

onError: (err, newTodo, context) => {
  queryClient.setQueryData(['todos'], context.previousTodos);
},
```

**Concurrent mutations on the same resource:**

If the user triggers multiple optimistic updates before any complete, each snapshot overwrites the previous rollback target. Track them carefully — or use the server's eventual response as the source of truth in `onSettled`.

**List reordering:**

Optimistically reordering a list then discovering the server rejected the move requires restoring the original order. Snapshot the entire list before the mutation.

---

> **Check yourself:** Why does React Query's `onMutate` call `cancelQueries` before applying the optimistic update? What specific failure mode does this prevent?

## When Not to Use Optimistic Updates

- High-value or high-stakes operations: payments, deletes, permission changes. The cost of showing a false positive (the action appeared to succeed then rolled back) exceeds the benefit of responsiveness. Show a confirmation dialog instead.
- Operations where failure is common: if 30% of these mutations fail, users will frequently see rollbacks, which is disorienting.
- Operations that can't be predicted: anything where the server response materially differs from your prediction (e.g., server-side validation that rejects the mutation with a business rule).

The right question: "Is a rollback more surprising than a brief loading spinner?" If yes, skip the optimistic update.

---

## Interview Questions



**Q (High): Describe the full optimistic update pattern in React Query with rollback.**

Answer: In `useMutation`'s `onMutate` callback: (1) cancel any in-flight queries for the affected keys so a concurrent refetch doesn't overwrite the optimistic update; (2) snapshot the current cache value with `getQueryData`; (3) apply the predicted result with `setQueryData`; (4) return the snapshot as context. In `onError`, use the context to restore the snapshot with `setQueryData`. In `onSettled` (runs on both success and failure), call `invalidateQueries` to trigger a fresh server fetch and ensure eventual consistency. The reason for canceling in-flight queries: without it, a background refetch that completes after your optimistic update could overwrite the UI change, making the action appear to undo itself.

---



**Q (High): Why do you refetch in `onSettled` even when the mutation succeeded?**

Answer: An optimistic update is a prediction. The server may produce a different outcome: a timestamp the client doesn't know, a server-computed field, a business rule that partially changes the data, or a race condition where another user modified the same resource concurrently. If you only rely on the optimistic update and never re-sync with the server, the UI can permanently diverge from the actual server state. `onSettled` invalidates the query regardless of outcome, triggering a refetch. Since stale-while-revalidate applies, the user sees the optimistic update immediately and the screen silently corrects to the server truth when the refetch completes — usually with no visible change if your prediction was correct.


---

**Q (Medium): What can go wrong with concurrent optimistic updates on the same resource?**

Answer: Each `onMutate` snapshots the current state and returns it as context. If two mutations fire before either completes, the second mutation's snapshot is the post-first-optimistic state, not the true server state. If the first mutation fails and rolls back, it restores its snapshot — overwriting the second mutation's changes. If the second then fails, it restores its snapshot — which was the "first mutation applied" state, which was just undone. The snapshots reference different points in time and rollbacks interfere with each other. Solutions: serialize mutations (don't let the user trigger another until the first completes), or rely on `onSettled` to always refetch the definitive server state rather than relying solely on rollbacks.
---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can name the four steps of the optimistic update pattern and explain what each one does
- [ ] Can write the React Query `useMutation` optimistic pattern from memory, including `onMutate`, `onError`, and `onSettled`
- [ ] Can explain why `cancelQueries` is called before applying the optimistic update — what specific race condition it prevents
- [ ] Can explain why `onSettled` refetches even on success
- [ ] Can name at least two operation types where optimistic updates should NOT be used, and why

---

*Next: Cache invalidation strategies — tags, query keys, manual refetch, and when to use each.*
