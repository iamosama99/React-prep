# Concurrent Rendering

## What Is This?

Concurrent rendering is React's ability to prepare multiple versions of the UI simultaneously, interrupt in-progress renders, and prioritize certain updates over others — all without blocking the browser's main thread between each unit of work.

In practice, concurrent rendering is the engine behind React 18's most important user-facing APIs: `useTransition`, `useDeferredValue`, and Suspense with streaming. It's not a feature you opt into directly — it's a capability enabled by `createRoot` that those APIs build on top of.

```js
// Opting into concurrent rendering:
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App />);
// (Legacy mode: ReactDOM.render — synchronous, no concurrent features)
```

---

## Why Does It Exist?

### The fundamental tension in UI work

User interactions and rendering are both JavaScript — they compete for the same thread. In classic React (synchronous rendering), once a render started, it ran to completion. A search input that triggered a 200ms render would block the thread for 200ms. Keystrokes queued. The UI froze.

The two categories of work:
- **Urgent** — user input, animations, direct feedback (must feel instant, ≤ 100ms)
- **Non-urgent** — background re-renders, data fetching, expensive computations (user tolerates latency)

In synchronous React, all state updates are treated as equally urgent. A state update triggered by a keypress has the same priority as a state update triggered by a background data sync. They queue together, run together, block together.

Concurrent rendering lets React treat these categories differently.

---

## How It Works

The mechanism is Fiber's work loop and the scheduler, covered in the Fiber topic. The key addition in React 18 is **lanes** — a priority system that tags every state update with a urgency level. The scheduler processes higher-priority lanes first and can interrupt lower-priority work.

### The scheduler's yield loop

React's work loop yields to the browser between fiber nodes:

```js
// Simplified concept:
function workLoop() {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
  // If shouldYield() returned true, schedule continuation and return.
  // Browser gets the main thread back.
}
```

`shouldYield()` returns true when a deadline has passed (~5ms per scheduler frame). This lets the browser handle pending input events, run animations, and paint before React continues its render.

### The double-buffer model under concurrency

React always maintains a current tree (on screen) and a work-in-progress tree (being built). In concurrent mode:

- A low-priority render is building a WIP tree
- A high-priority update arrives (user types)
- React abandons the low-priority WIP tree (discards it)
- Builds a new WIP tree for the high-priority update
- Commits it
- Restarts the low-priority render from scratch

The current tree is never touched during this process — the screen remains consistent at all times.

---

## The User-Facing APIs

### useTransition

Marks a state update as non-urgent. The update starts immediately in a low-priority lane. Urgent updates (input events, click handlers) can preempt it.

```js
const [isPending, startTransition] = useTransition();

function handleSearch(e) {
  setQuery(e.target.value);        // urgent — updates input instantly

  startTransition(() => {
    setResults(filter(data, e.target.value)); // non-urgent — can be preempted
  });
}

// Show stale results while the transition is in progress
return (
  <div>
    <input value={query} onChange={handleSearch} />
    {isPending && <Spinner />}
    <ResultsList results={results} />
  </div>
);
```

**What this achieves:** The input updates immediately on every keystroke (urgent lane). The result list is computed in a low-priority lane. If the user types again before the previous filter render finishes, React abandons the in-progress filter render and starts a new one. The user never waits for a stale computation to complete.

`isPending` is `true` while the transition render is in flight — use it to show a loading indicator without hiding the current (stale) results.

### useDeferredValue

Defers updating a derived value until after urgent renders complete. Think of it as an auto-managed stale copy.

```js
function SearchPage({ query }) {
  // deferredQuery lags behind query during transitions
  const deferredQuery = useDeferredValue(query);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* ResultsList uses the deferred query — won't block the input */}
      <ResultsList query={deferredQuery} />
    </div>
  );
}
```

`useDeferredValue` is `useTransition` without the wrapper. Use `useTransition` when you control the state setter. Use `useDeferredValue` when you receive a value as a prop or from context and want to defer its propagation without refactoring the parent.

During a transition, `query` and `deferredQuery` are different values. React renders the urgent part with `query`, and the non-urgent part with the old `deferredQuery`. When the transition settles, they match.

To tell whether a component is rendering with stale data:

```js
const isStale = query !== deferredQuery;
return <div style={{ opacity: isStale ? 0.7 : 1 }}><Results /></div>;
```

### Suspense with concurrent rendering

Suspense in React 18 is more powerful than in React 17. In concurrent mode:

- Multiple Suspense boundaries can independently resolve — parts of the UI load as they're ready
- Selective hydration — in SSR, React can hydrate interactive components in priority order (clicked components first, rest later)
- Streaming SSR — the server sends HTML progressively, each Suspense boundary completing independently

```js
function App() {
  return (
    <div>
      {/* These two load in parallel — each shows its own fallback independently */}
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>
    </div>
  );
}
```

In synchronous React, a Suspense boundary inside an SSR render blocked the entire render until the suspended component resolved. In concurrent mode, the boundary is sent with its fallback immediately, and the resolved content is streamed later.

---

## What Concurrent Rendering Is Not

**It is not multi-threading.** JavaScript is single-threaded. Concurrent rendering works by time-slicing on the main thread — yielding between fiber nodes. It doesn't run React renders in parallel; it interleaves them with browser work.

**It is not a guarantee of no jank.** A single expensive component function that takes 300ms still blocks the thread for 300ms — Fiber can only yield between components, not inside them. Concurrent rendering prevents a 300ms render from blocking a keystroke; it can't prevent a 300ms render from being 300ms.

**It is not enabled by default in React 18.** You opt in with `createRoot`. Apps still using `ReactDOM.render` run in legacy synchronous mode.

**Concurrent features don't change render semantics for pure components.** A pure component function running in concurrent mode behaves identically to one in synchronous mode — it may just run more than once before a commit. This is why purity (no side effects during render) is a hard requirement, not just a style preference.

---

## Concurrent Mode and the render → commit Contract

In synchronous mode, every render leads to a commit. In concurrent mode, renders can be abandoned — they prepare a WIP tree that is never committed. This has implications:

- Render functions may run multiple times without a commit occurring (intentional in StrictMode for exactly this reason)
- Side effects during render (network calls, mutable writes) may fire multiple times — only `useEffect` and `useLayoutEffect` (which run in the commit phase) are guaranteed to run once per commit
- `startTransition` renders may be restarted from scratch if preempted — the previous WIP tree is discarded

---

## Gotchas

**1. `startTransition` cannot mark async work as non-urgent.**

`startTransition` wraps a synchronous state setter. The async data fetching that precedes a state update is not within the transition. You use `startTransition` to mark the render triggered by `setState`, not the fetch itself.

```js
// Wrong — the await is not part of the transition:
startTransition(async () => {
  const data = await fetch('/api/data'); // async — outside the transition
  setResults(data);
});

// Correct — transition wraps the setter, not the fetch:
const data = await fetch('/api/data');
startTransition(() => {
  setResults(data); // the render triggered by this is the transition
});
```

**2. Transitions can be visible to users.**

`isPending` is the signal. If you don't show it, users may think nothing happened after clicking. Always acknowledge transitions with a pending state — a spinner, a visual dimming, or a progress indicator.

**3. Not all state updates should be transitions.**

Transitions are for updates where it's acceptable to show stale UI briefly. Error messages, form validation feedback, modal open/close — these should not be transitions. Users expect immediate feedback from these interactions. Transitions are for large background computations where the current result is still useful while the new one loads.

**4. Concurrent renders may see inconsistent external state.**

If your component reads from an external mutable store (without `useSyncExternalStore`), a concurrent render may read state that's different from what the commit will see — because the render was paused and the store mutated during the pause. `useSyncExternalStore` is the correct API for subscribing to external state in concurrent mode; it ensures the component reads consistent snapshots.

**5. Libraries built for React 16/17 may not be concurrent-safe.**

Libraries that rely on synchronous renders, direct DOM manipulation during render, or non-idempotent render functions may produce incorrect behavior in concurrent mode. Most major libraries updated for React 18 — but verify before upgrading.

---

## Interview Questions

**Q (High): What is concurrent rendering in React and how does it improve user experience?**

Answer: Concurrent rendering is React's ability to interrupt in-progress renders, prioritize urgent updates over non-urgent ones, and prepare multiple UI versions simultaneously — all while yielding the main thread between units of work so the browser can handle input and painting. It improves UX in two ways. First, urgent interactions (keystrokes, clicks) are never blocked by background renders — they're processed in a higher-priority lane and preempt lower-priority work. Second, non-urgent renders can be progressive: Suspense boundaries resolve independently, streaming SSR sends content progressively, and selective hydration prioritizes what the user interacted with. The practical entry points are `useTransition` and `useDeferredValue`, which let you explicitly mark expensive renders as interruptible.

The trap: Candidates who say "concurrent rendering makes React faster" are imprecise. It doesn't make any individual render faster — it makes expensive renders non-blocking for the user. The throughput is the same; the responsiveness is dramatically better.

---

**Q (High): When would you use `useTransition` vs `useDeferredValue`?**

Answer: Both defer a render to a lower-priority lane, but the entry point differs. `useTransition` is used when you control the state setter — you wrap the `setState` call in `startTransition` and get an `isPending` flag. `useDeferredValue` is used when you receive a value you didn't set — a prop, a context value, or a derived computation — and want to defer reacting to its changes downstream. Example: if you own a search input and control `setQuery`, use `useTransition`. If you receive `query` as a prop and want `<ResultsList>` to update non-urgently without refactoring the parent, wrap `query` in `useDeferredValue` inside the parent component. `useTransition` is more explicit (you see the pending state); `useDeferredValue` is simpler when you don't control the state update.

---

**Q (High): Why can component functions run multiple times before a commit in concurrent mode and what does this mean for your code?**

Answer: In concurrent mode, a render can be interrupted and restarted. React abandons the work-in-progress tree and begins again from the root of the interrupted subtree. Any component function that was called during the abandoned render runs again. Additionally, `StrictMode` intentionally double-invokes renders in development to surface this. The implication: component functions must be pure — they can compute and return, but any side effect (network requests, external writes, global mutations) that runs during render may fire multiple times before a single commit occurs. Side effects belong exclusively in `useEffect`, `useLayoutEffect`, or event handlers — where React guarantees they fire once per committed render.

---

**Q (Medium): What is selective hydration and how does it relate to concurrent rendering?**

Answer: Selective hydration is a React 18 SSR feature that uses concurrent rendering to prioritize hydrating interactive components. In traditional SSR, the browser receives fully-rendered HTML immediately but the page isn't interactive until React finishes hydrating the entire tree. If the page is large, the user sees content but can't interact for several seconds. With selective hydration, React starts hydrating from the top of the tree. If the user clicks an element that hasn't been hydrated yet, React immediately prioritizes that component — it jumps the queue and hydrates it first, making it interactive before finishing the rest of the tree. This is only possible because concurrent rendering can interrupt the in-progress hydration (a low-priority render) and handle the urgent user interaction first.

---

**Q (Medium): Can `startTransition` wrap an async function?**

Answer: No — not correctly. `startTransition` marks a synchronous `setState` call as non-urgent. The transition ends when the synchronous block exits. If you `await` inside `startTransition`, the Promise suspension exits the transition scope immediately — the code after `await` runs outside the transition, as a normal-priority update. The correct pattern is to `await` the async work first, then call `startTransition` around the state setter. The transition affects the render triggered by `setState`, not the data fetching that precedes it. This is a common source of confusion — `startTransition` is about render priority, not async flow control.

---

*End of Phase 5 — Performance & Internals. This phase built from the ground up: VDOM reconciliation → Fiber's execution model → render/commit phases → what triggers renders → how to prevent unnecessary renders (memo, structure, reference stability) → batching → loading performance (code splitting, virtualization, bundle analysis, tree shaking) → measuring outcomes (Profiler, Web Vitals) → the concurrent rendering model that ties it all together.*
