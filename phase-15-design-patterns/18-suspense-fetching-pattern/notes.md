# Suspense Data-Fetching Pattern

## Quick Reference

| Concern | Effect-based fetching | Suspense pattern |
|---|---|---|
| Loading state | `isLoading` flag in every component | `<Suspense fallback>` *around* the component |
| Error state | `error` flag in every component | `<ErrorBoundary>` *around* the component |
| Component body | Handles loading + error + data | **Only the happy path** — `const user = use(promise)` |
| Race conditions | Manual (`ignore` flag / abort) | Solved by construction (render reads a specific promise) |
| Waterfalls | Easy to create, invisible | Explicit: fetch in parallel, *then* render |
| The pattern | — | `ErrorBoundary > Suspense > Component` |

## Where You've Seen This Before

- What Suspense is, thrown promises, `React.lazy`, boundaries, render-as-you-fetch → [Phase 11: Suspense for data fetching](../../phase-11-modern-react/03-suspense-data-fetching/notes.md)
- The `use()` API, conditional `use`, `use(Context)` → [Phase 11: use() hook](../../phase-11-modern-react/08-use-hook/notes.md)
- The failure half → [Topic 17: Error boundary pattern](../17-error-boundary-pattern/notes.md) and [Phase 3](../../phase-03-class-legacy/05-component-did-catch-error-boundaries/notes.md)
- Transitions keep old UI on screen → [useTransition](../../phase-02-hooks/11-use-transition/notes.md); server side of the story → [Streaming SSR](../../phase-11-modern-react/07-streaming-ssr/notes.md), [Server components](../../phase-11-modern-react/04-server-components-rsc/notes.md)
- Effect-based fetching hazards → [useEffect](../../phase-02-hooks/02-use-effect/notes.md) (race conditions, cleanup)

**New here:** the *architecture as a repeatable pattern* — the boundary trio, where the promise must come from (the #1 mistake: creating it in render), how to keep fetches parallel, boundary granularity, transitions to avoid UI flicker, and retry that actually works.

## What Is This?

The **Suspense data-fetching pattern** moves loading and error handling *out of components* and into *boundaries*. A component that needs data simply reads it; if it isn't ready, the component **suspends** — React shows the nearest `Suspense` fallback; if it failed, the nearest error boundary shows its fallback.

```tsx
function UserPage({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);            // suspends until resolved; throws if rejected
  return <h1>{user.name}</h1>;              // ← the component only describes the success state
}

<ErrorBoundary fallbackRender={({ reset }) => <RetryCard onRetry={reset} />}>
  <Suspense fallback={<ProfileSkeleton />}>
    <UserPage userPromise={userPromise} />
  </Suspense>
</ErrorBoundary>
```

Compare with the effect-based version: `useState` × 3, a `useEffect`, an ignore-flag, three early returns — *in every component that loads data*.

> **Check yourself:** In the Suspense version, which piece of code is responsible for the loading UI, which for the error UI, and which for the success UI? What does that do to the size and testability of `UserPage`?

## Why Does It Exist?

Effect-based fetching (`useEffect` + `useState`) has structural problems that show up as an app grows:

1. **Boilerplate states.** Every component re-implements `loading`/`error`/`data` and their combinations (including impossible ones).
2. **Races.** Out-of-order responses overwrite newer ones unless you add cancellation everywhere.
3. **Hidden waterfalls.** A parent fetches, renders, *then* its child mounts and fetches, then *its* child… serial round-trips nobody planned. Effects run after render, so a child's fetch can't even *start* until its parent's data has rendered.
4. **Inconsistent UI.** Each widget toggles its own spinner at its own moment — a screen full of pop-in.
5. **Retry is ad-hoc.** No standard way to reset and refetch.

Suspense makes "not ready yet" a first-class *render outcome*, so React — not your component — decides what to show and when to reveal, coordinating loading states across the tree.

## How It Works

### The three roles

| Role | Provided by | Responsible for |
|---|---|---|
| **Data source** | A cache/library (`useSuspenseQuery`, Relay, RSC, or your own promise cache) | Owning the promise, its status, and invalidation |
| **Suspense boundary** | `<Suspense fallback>` | The *pending* UI |
| **Error boundary** | `<ErrorBoundary>` | The *failed* UI + retry |

Component ⟶ *reads*. Boundaries ⟶ *decide the UI for non-happy states.*

### The rule that trips everyone: where does the promise come from?

`use(promise)` and thrown-promise Suspense both need the **same promise across re-renders**. When a component suspends, React discards its work and re-renders it later — if the render *creates* a new promise, every retry creates another pending promise: an infinite loop of suspending.

```tsx
// ✗ New promise every render → suspends forever
function User({ id }) {
  const user = use(fetchUser(id));
  …
}

// ✓ Promise comes from a stable place:
//   1. a cache keyed by args (library or your own)
const user = use(getUser(id));                 // getUser memoises the promise per id
//   2. created in an event handler / loader / parent Server Component, then passed down
<User userPromise={userPromise} />
//   3. a route loader (React Router, Next.js) that starts the fetch before render
```

A minimal cache, to see the shape:

```ts
const cache = new Map<string, Promise<unknown>>();
export function getUser(id: string) {
  const key = `user:${id}`;
  if (!cache.has(key)) cache.set(key, fetch(`/api/users/${id}`).then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); }));
  return cache.get(key) as Promise<User>;
}
export const invalidate = (key: string) => cache.delete(key);
```

In production, use a library that also handles deduping, staleness, revalidation and GC — TanStack Query's `useSuspenseQuery`, SWR's `suspense` option, Relay — or let a framework do it (RSC/Next.js).

### Fetch strategies

| Strategy | Sequence | Result |
|---|---|---|
| **Fetch-on-render** | Render → effect fetch → render → child effect fetch… | Waterfalls |
| **Fetch-then-render** | Fetch everything → render | Wait for the slowest; no partial UI |
| **Render-as-you-fetch** | Start fetches → render immediately → components suspend until each is ready | Parallel *and* progressive |

Render-as-you-fetch is the goal: kick off requests as early as possible (route change, event handler, loader), render right away, let each part reveal when its data lands.

### Avoiding waterfalls

```tsx
// ✗ Waterfall: <Posts/> doesn't mount until <Profile/> has its data
function Profile({ id }) {
  const user = use(getUser(id));
  return (<><h1>{user.name}</h1><Posts id={id} /></>);   // Posts' fetch starts only now
}

// ✓ Parallel: start both up front, components just read
function onSelect(id: string) { preloadUser(id); preloadPosts(id); setId(id); }

// ✓ Or siblings under separate boundaries: both mount at once, both fetch at once
<Suspense fallback={<HeaderSkeleton/>}><Header id={id}/></Suspense>
<Suspense fallback={<PostsSkeleton/>}><Posts id={id}/></Suspense>
```

Only nest a component *inside* another when it genuinely needs the parent's data to know *what* to fetch.

### Boundary granularity: the UX design decision

- **One boundary for the page** → one skeleton; everything appears together. Simple, but slow parts hold up fast parts.
- **A boundary per region** → sections pop in independently (a progressive page). Can look jumpy.
- **Nested boundaries** → a shell appears first, inner regions fill later.

Match the boundary to *what should appear together*. Place fallbacks so their footprint matches the final layout to avoid layout shift.

### Don't hide what's already visible: transitions

Updating state that causes a *new* thing to suspend normally re-shows the fallback — replacing content the user was reading with a spinner. Wrap the update in `startTransition` (or use `useDeferredValue`) and React **keeps the old UI on screen** until the new data is ready, exposing `isPending` so you can dim it:

```tsx
const [isPending, startTransition] = useTransition();
<button onClick={() => startTransition(() => setUserId(next))}>Next</button>
<div style={{ opacity: isPending ? 0.6 : 1 }}><Suspense fallback={<Skeleton/>}><Profile id={userId}/></Suspense></div>
```

Fallbacks then appear only for *initial* loads; refreshes feel like the page is thinking, not resetting.

### Retry that actually works

A rejected promise is cached; re-rendering re-throws the same error. Retry must **reset the boundary and invalidate the cache** so a fresh promise is created:

```tsx
<ErrorBoundary
  onReset={() => invalidate('user:' + id)}                              // new promise next time
  resetKeys={[id]}
  fallbackRender={({ error, reset }) => <button onClick={reset}>Retry: {error.message}</button>}
>
```

With TanStack Query: `QueryErrorResetBoundary` + `useQueryErrorResetBoundary` do this pairing for you.

### Suspense on the server

With streaming SSR and RSC, `<Suspense>` boundaries let the server send the shell immediately and stream each region as its data resolves; client hydration is also *selective* per boundary. The same boundary structure you wrote for the client governs streaming ([Streaming SSR](../../phase-11-modern-react/07-streaming-ssr/notes.md)).

## Gotchas

**Promise created in render.** The #1 bug — infinite suspend loop (React logs "A component was suspended by an uncached promise"). Cache/preload the promise elsewhere.

**Error boundary placed *inside* Suspense (or missing).** A rejection with no boundary above blanks the whole tree. Standard order: `ErrorBoundary` outside, `Suspense` inside.

**Retry without invalidation.** The cached rejected promise re-throws immediately. Reset the boundary *and* the cache.

**Nested waterfalls.** A child that fetches after its parent's data renders re-creates the waterfall Suspense was supposed to avoid. Preload, hoist, or fetch as siblings.

**Fallback flicker.** Rapid transitions between keys cause spinner → content → spinner. Use `startTransition`/`useDeferredValue`, and consider a minimum display time only if UX research demands it.

**Too many boundaries.** A page of 12 independent skeletons popping in feels chaotic. Group what should reveal together.

**State loss on suspend.** When a *newly* mounting component suspends inside a not-yet-visible tree, its local state isn't preserved until it commits; a component that's *already visible* and suspends again is hidden (state preserved) with the fallback shown. Design initial state accordingly.

**Side effects during render.** The suspending component may render several times; never mutate outside state or fire analytics in the render path.

**Mixing paradigms.** Suspense doesn't detect `useEffect` fetches. Only sources that throw/`use()` a promise participate.

**Testing.** Wrap in `Suspense`/`ErrorBoundary` in tests, `await findBy…`, and reset the cache between tests.

## Interview Questions

**Q (High): How does the Suspense data-fetching pattern differ from `useEffect` + `useState`?**

Answer: With effects, each component owns its loading/error/data state and starts fetching only *after* it renders, which causes boilerplate, races and waterfalls. With Suspense, the component reads data through `use(promise)` (or a Suspense-aware library) and simply describes the success state; if data isn't ready it suspends and the nearest `Suspense` boundary shows the fallback, and rejections are caught by the nearest error boundary. Fetching can start before rendering (render-as-you-fetch), React coordinates reveal, and loading/error UI is declarative and centralised in boundaries.

The trap: Describing Suspense as "a loading spinner component" or omitting the error boundary half.

**Q (High): Why can't you create the promise inside the component that calls `use()`?**

Answer: When a component suspends React throws away its render and re-renders later. A new promise on each render is a new pending promise each time, so it suspends again forever. The promise must be stable across renders — from a cache keyed by inputs, an event handler/loader/route, or a parent (often a Server Component) that passes it down. Libraries like TanStack Query or Relay provide this cache with dedupe, staleness and invalidation.

The trap: Believing `use(fetch(url))` in a client component is fine because "use handles promises."

**Q (High): How do you avoid request waterfalls with Suspense?**

Answer: Start requests early and in parallel — preload in the event handler/route loader, fetch in parent Server Components with `Promise.all`, or render independent components as siblings so they mount and fetch simultaneously, each under its own boundary. Only nest a fetching component under another when it needs the parent's data to know what to request. Render-as-you-fetch is the strategy: begin fetching, render immediately, suspend where data is missing.

The trap: Wrapping a nested component tree in Suspense and assuming that solved the waterfall — it only changed *where* the spinner shows.

**Q (Medium): How do you implement Retry for a failed Suspense fetch?**

Answer: Retry needs two things: reset the error boundary so children remount, and invalidate the failed cache entry so a *new* promise is created — otherwise the same rejected promise re-throws. `onReset` on the boundary invalidates; `resetKeys` can auto-reset on input change. With TanStack Query use `QueryErrorResetBoundary`.

The trap: Only resetting the boundary state.

**Q (Medium): How do transitions interact with Suspense, and why do you want them?**

Answer: Updating state that makes a visible tree suspend shows the fallback, replacing content the user was viewing. Wrapping the update in `startTransition` (or using `useDeferredValue`) tells React the update is non-urgent: it keeps the current UI, prepares the new one in the background, and swaps when ready, exposing `isPending` for a subtle indicator. Fallbacks are then reserved for initial loads.

The trap: Not knowing transitions prevent the fallback from re-appearing on already-revealed content.

**Q (Medium): How do you decide where to place Suspense boundaries?**

Answer: By what should be revealed together. A route-level boundary for the page shell; per-region boundaries for independent sections that shouldn't block each other; skeletons sized like the final content to prevent layout shift. Avoid a boundary per tiny component (popcorn loading) and avoid one boundary so high that fast content waits on slow content. Pair each with an error boundary appropriately scoped.

The trap: "Wrap the whole app in one Suspense."

**Q (Low): How does this relate to React Server Components and streaming?**

Answer: RSC can `await` data directly on the server; wrapping slow parts in `<Suspense>` lets the server stream the rest of the HTML immediately and stream the slow region when ready, and the client hydrates boundaries independently. The boundary structure you design for data fetching drives streaming and selective hydration.

The trap: Treating Suspense as client-only.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can draw `ErrorBoundary > Suspense > Component` and say what each layer is responsible for
- [ ] Can explain the "promise in render" infinite loop and three stable sources for the promise
- [ ] Can distinguish fetch-on-render, fetch-then-render and render-as-you-fetch, and fix a waterfall
- [ ] Can implement a Retry that resets the boundary *and* invalidates the cache
- [ ] Can use `startTransition` to keep old content during a refetch and explain why
- [ ] Can choose Suspense boundary granularity for a page and justify it

---
*Next: [Custom Hook for Forms](../19-useform-hook-pattern/notes.md) — the final pattern in this phase composes several earlier ones (custom hook + provider + facade) into something you'll actually be asked to build.*
