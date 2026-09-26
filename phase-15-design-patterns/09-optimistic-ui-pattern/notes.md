# Optimistic UI

## Quick Reference

| Idea | What happens | Why it matters |
|---|---|---|
| Regular update | Click → spinner → server responds → UI changes | Feels slow; latency is the UX |
| Optimistic update | Click → UI changes *now* → server confirms in the background | Feels instant when the server usually says yes |
| `useOptimistic(state, reducer)` (React 19) | Returns `[optimisticState, addOptimistic]` — a *temporary layer* over real state | The layer lasts only while an async Action runs |
| Rollback | When the Action settles, React discards the layer and shows the real state | Success: real state already includes the change. Failure: change vanishes |
| When *not* to | Payments, irreversible/destructive actions, low success rate, heavy server-side validation | A wrong guess costs more than a spinner |

## Where You've Seen This Before

- Optimistic updates with TanStack Query (`onMutate` / snapshot / rollback in `onError` / `onSettled` invalidate) → [Phase 6: Optimistic updates](../../phase-06-state-management/11-optimistic-updates/notes.md)
- Server Actions and form actions, transitions → [Phase 11: Server actions](../../phase-11-modern-react/06-server-actions/notes.md), [useTransition](../../phase-02-hooks/11-use-transition/notes.md)
- Cache invalidation after a mutation → [Cache invalidation strategies](../../phase-06-state-management/12-cache-invalidation-strategies/notes.md)

**New here:** the *React-native* mechanism — `useOptimistic` — which replaces the hand-rolled "snapshot, mutate cache, restore on error" dance with a **derived, self-cleaning layer over state**; the correct mental model of *when the layer disappears*; temp-id reconciliation; and a decision framework for when optimism is a bad idea.

## What Is This?

The **Optimistic UI pattern** shows the *expected result* of an action immediately and reconciles with the server afterwards. You are "optimistic" that the request will succeed; if it fails you undo the change and tell the user.

```
Regular:     click ──────── 800 ms wait ────────▶ UI updates
Optimistic:  click ▶ UI updates now ─── 800 ms ──▶ server confirms (UI already right)
                                              └─▶ server rejects → UI reverts + error
```

It's a *perceived-performance* technique. The network hasn't gotten faster; you've just stopped making the user wait for a result you're 99% sure of — likes, toggles, reorders, comments, checking a todo, marking a notification read.

> **Check yourself:** Name two actions in a typical app where optimism is a great fit and two where it's a bad idea. What property separates them?

## Why Does It Exist?

Round-trip latency is 100–1000 ms on real networks and unbounded on flaky ones. Applications that wait for the server before showing feedback feel sluggish, and users double-click "Like" because nothing seems to have happened. Native apps solved this decades ago; on the web the "do it locally first" approach needed hand-written state juggling, which is easy to get wrong (forgotten rollbacks, stale data, duplicated items).

React 19 made it a first-class feature because Actions (async transitions, form actions, Server Actions) give React something new: a well-defined **"pending" window**. React knows when the async work started and when it settled, so it can own the *lifetime* of the optimistic state instead of you managing it.

## How It Works

### The mental model: a layer over real state

`useOptimistic` doesn't hold state. It **derives** a value from your real state plus any pending optimistic updates:

```
shown = pendingUpdates.reduce(reducer, realState)
```

- While an Action is in flight: `shown` includes your optimistic change.
- When the Action **settles**: the pending updates are dropped, so `shown === realState`.
  - On success you've updated the real state inside the Action, so `realState` now contains the change — the UI doesn't flicker.
  - On failure you didn't (or couldn't), so `shown` snaps back — that *is* the rollback.

There is no rollback code because there's nothing to roll back; the temporary layer simply expires.

### The React 19 shape

```tsx
function Likes({ post }: { post: Post }) {
  const [optimistic, addOptimistic] = useOptimistic(
    post,
    (current: Post, _: 'toggle') => ({ ...current, liked: !current.liked, likes: current.likes + (current.liked ? -1 : 1) }),
  );
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      addOptimistic('toggle');                 // 1. show it now (must be inside the Action)
      await api.toggleLike(post.id);           // 2. do the real work
      await refreshPost();                     // 3. real state now includes it
    });                                        // 4. transition ends → layer discarded
  }
  return <button onClick={onClick}>{optimistic.liked ? '♥' : '♡'} {optimistic.likes}</button>;
}
```

Rules:

1. `addOptimistic` must be called **inside a transition or form action** — otherwise the optimistic value has no "end" and React warns.
2. The **first argument is your source of truth** (props/state). When it changes, the layer re-bases on top of it.
3. The optional reducer merges each pending update into the current value; without it, the update *replaces* the value.
4. If your real state doesn't update by the time the Action settles, the UI reverts — so on success you must update it (refetch, set state, or revalidate).

With form actions it's even simpler — `<form action={fn}>` runs `fn` as a transition:

```tsx
async function action(formData: FormData) {
  const text = String(formData.get('text'));
  addOptimistic({ id: crypto.randomUUID(), text, pending: true });   // temp item
  await saveTodo(text);                                               // server action revalidates the list
}
```

### Temp ids and reconciliation

Optimistic items don't have server ids yet. Give them a client-generated `tempId` and a `pending: true` flag:

- Use the temp id as the React `key`; when the real item arrives, the layer is dropped and the list re-renders from real state (the new item now has its real id — a key change, so a remount; if that matters, keep a stable `clientId` alongside the server `id` and use that as the key).
- Style pending items ("sending…", faded) — honest feedback beats a silent lie.

### Failure handling

Reverting the UI silently is confusing. On failure:

- **Tell the user** (toast/inline error) — the change they saw vanished.
- **Preserve their input** where possible (keep the text in the form; show a "Retry" affordance) — losing a typed comment is worse than a spinner.
- **Don't retry non-idempotent requests blindly** — a retry after a timeout may double-apply. Use idempotency keys.

### Concurrency and ordering

Two rapid actions ⇒ two pending updates layered in order; each settles independently. Trouble arises when responses return out of order or when Action B depends on A's result. Serialise dependent mutations, or make the server the tiebreaker and reconcile from *its* final state.

### Without React 19

Same layer, hand-built: hold `pending` items in state, render `reduce(pending, real)`, remove the pending entry in a `finally`. Or with TanStack Query: `onMutate` (cancel queries, snapshot, `setQueryData`), `onError` (restore snapshot), `onSettled` (invalidate) — same concept, cache-level.

> **Check yourself:** In the `Likes` example the real `post` doesn't change until `refreshPost()` resolves. What would the user see if you forgot step 3 and the request succeeded? What if `api.toggleLike` throws?

## When To Be Optimistic

| Green light | Red light |
|---|---|
| High success rate (>95%) | Frequent server-side rejection (validation, conflicts, stock) |
| Cheap to undo | Irreversible (delete forever, send email, payments) |
| User-visible immediately matters (likes, reorders, toggles) | The *server-computed result* is the point (price, tax, ids you must show) |
| Idempotent or easily reconciled | Non-idempotent with side effects |
| Small, local change to a known shape | Large cross-entity changes hard to predict |

Compromise for edge cases: **pessimistic + fast feedback** — disable the control and show inline progress.

## Gotchas

**Calling `addOptimistic` outside an Action.** No transition, no defined end; React warns and the value may never revert. Wrap in `startTransition(async …)` or use a form `action`.

**Forgetting to update real state on success.** The layer expires and the UI snaps back to the *old* state even though the server accepted the change. Refetch, set state, or revalidate inside the Action.

**Silent rollback.** Users see the change flip back with no explanation. Always surface the failure.

**Losing user input on failure.** Clearing a form on submit then rolling back the list leaves users retyping. Reset the form only on success.

**Duplicate items after reconciliation.** Appending the server's copy *and* keeping the optimistic one shows two. Derive the list from real state + pending layer, never append to both.

**Key churn.** Temp id → real id changes the key and remounts the row (losing focus/animations). Use a stable client-side key.

**Non-idempotent retries.** Timeouts + automatic retries can double-charge or double-post. Use idempotency keys.

**Race with refetch.** A background refetch landing mid-mutation can overwrite the optimistic view (Query handles with `cancelQueries`). In React 19 the layer re-bases on whatever real state is current.

**Optimism for the wrong operations.** Payments and destructive actions deserve explicit confirmation states, not wishful thinking.

## Interview Questions

**Q (High): What is optimistic UI and what are the trade-offs?**

Answer: Updating the UI immediately with the expected outcome of an action, then reconciling with the server response. Benefit: perceived instant responsiveness. Costs: you need rollback and error handling, reconciliation of temporary vs server data (ids, computed fields), care with concurrency and ordering, and it's inappropriate for irreversible or frequently-rejected operations. The decision hinges on success probability, cost of being wrong, and whether the user needs the server's result.

The trap: Presenting it as strictly good. A senior answer includes when *not* to use it.

**Q (High): How does `useOptimistic` work, and when does the optimistic state revert?**

Answer: It returns a value derived from your real state plus pending optimistic updates run through a reducer. `addOptimistic` must be called inside a transition or form action. While that Action is pending, the derived value includes the update; when the Action settles React discards the pending updates and the value becomes your real state again. On success you have updated real state within the Action so the result persists; on failure you didn't (the Action threw), so it reverts — automatically, with no rollback code.

The trap: Thinking `useOptimistic` stores state or that you must manually revert. Also missing that you must update the real state on success.

**Q (High): How would you implement optimistic add-to-list with temporary IDs?**

Answer: Generate a temp/client id, add `{ id: temp, text, pending: true }` via `addOptimistic` inside the Action, call the API, then update real state (or revalidate) with the server's item. Render from `optimistic` state, mark pending rows visually, and use a stable client key to avoid remounting when the real id arrives. On failure, revert (automatic), keep the user's text, and show an error with retry.

The trap: Appending both the optimistic and the server item, or using the temp id as the persistent key and remounting.

**Q (Medium): How does this differ from the TanStack Query optimistic-update recipe?**

Answer: Same idea at a different layer. Query does it in the cache: `onMutate` cancels in-flight queries, snapshots, and writes the expected value to the cache; `onError` restores the snapshot; `onSettled` invalidates to sync with the server. `useOptimistic` is component-scoped and self-expiring — no snapshot to restore. Query's version is better when the same data appears in many components; `useOptimistic` is lighter for local UI tied to an Action. They can combine.

The trap: Believing one replaces the other.

**Q (Medium): Two optimistic actions fire quickly and the responses arrive out of order. What can go wrong?**

Answer: Each layer applies in submission order, but real state updates as responses arrive. If the second response arrives first and the first later overwrites with staler data, the UI can flicker to an inconsistent state. Mitigations: serialise dependent mutations (queue), have the server return the full resulting entity and reconcile from that, use version numbers/ETags to ignore stale responses, and make operations idempotent.

The trap: Assuming responses come back in order.

**Q (Medium): When would you refuse to make an interaction optimistic?**

Answer: Payments, sending irreversible messages, permanent deletes, operations that frequently fail validation, or anything where the server computes the value the user is waiting for (totals, generated ids they must see). Use pessimistic UI with immediate inline progress, or a confirmation step, instead.

The trap: "Always be optimistic for speed."

**Q (Low): Why must `addOptimistic` be called inside a transition?**

Answer: The optimistic layer needs a defined lifetime. A transition/Action gives React a start and end; when it ends the layer is dropped. Outside one there's no end, so the value could persist indefinitely, diverging from real state.

The trap: Treating the requirement as an arbitrary API quirk rather than the mechanism that makes automatic rollback possible.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain optimistic UI and name its costs and when it's inappropriate
- [ ] Can describe `useOptimistic` as "derived layer over real state that expires when the Action settles"
- [ ] Can write the `startTransition` + `addOptimistic` + API + real-state-update sequence
- [ ] Can handle temp ids, pending styling and stable keys
- [ ] Can list failure-handling requirements (notify, preserve input, idempotency)
- [ ] Can contrast `useOptimistic` with the TanStack Query `onMutate`/rollback recipe

---
*Next: [State Reducer Pattern](../10-state-reducer-pattern/notes.md) — from updating state predictably to letting the *consumer* of your component override how its state changes.*
