# Concurrent Rendering Model

## Quick Reference

| Concept | What it means |
|---|---|
| Interruptible renders | React can pause a render mid-flight and resume later |
| Priority lanes | Each update gets a priority; high-priority work preempts low |
| `startTransition` | Marks work as low-priority — can be interrupted |
| Time slicing | React breaks render work into chunks, yielding to the browser between chunks |
| Tearing | Inconsistent UI state when an async render reads store data at different points in time |

---

## Why Concurrent Rendering Exists

The original React renderer was **synchronous and recursive**. When React started rendering a component tree, it ran to completion — nothing could interrupt it. If rendering 1,000 components took 300ms, the browser was blocked for 300ms. No user input could be handled. Animations froze. The UI felt unresponsive.

The fix requires a fundamentally different model: instead of a recursive function call that must complete, rendering becomes a **unit of interruptible work** that can be paused, prioritized, and resumed.

This is the concurrent rendering model. React can now:
1. Start rendering an update
2. Receive higher-priority work (a new keystroke, an animation frame)
3. **Abandon** the in-progress render
4. Handle the high-priority work first
5. Restart (or resume) the lower-priority render

---

## Fiber: The Foundation

React's Fiber architecture (shipped in React 16) was the prerequisite. Instead of a recursive call stack, React builds a linked list of **Fiber nodes** — one per component instance. Each Fiber stores:

- The component type, props, and state
- Pointers to parent, child, and sibling nodes
- A "work in progress" copy for pending renders

This data structure lets React walk the tree iteratively, **pause at any node**, and resume where it left off. The recursive model made that impossible.

---

## Priority Lanes

React 18 assigns every update to a **lane** — a priority bucket:

| Lane | Priority | Examples |
|---|---|---|
| SyncLane | Highest | Direct user input (click, keydown) |
| InputContinuousLane | High | Scroll, drag |
| DefaultLane | Normal | Data fetching responses |
| TransitionLane | Low | `startTransition` updates |
| IdleLane | Lowest | Prefetching, non-visible updates |

When React decides what to render next, it picks the highest-priority lane with pending work. If a higher-priority update arrives while rendering a lower-priority one, React **yields** (stops the current render) and handles the urgent work first.

---

## `startTransition`

This is how you tell React that a particular state update is low-priority:

```tsx
import { startTransition, useTransition } from 'react';

// Option 1: useTransition (gives you isPending)
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value); // urgent — runs synchronously

    startTransition(() => {
      setResults(computeExpensiveFilter(e.target.value)); // interruptible
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultsList results={results} />}
    </>
  );
}

// Option 2: standalone startTransition (no isPending)
startTransition(() => {
  setTab('comments');
});
```

Inside `startTransition`, the update goes into a TransitionLane. If the user types again before that render completes, React **throws away the in-progress render** and starts a new one with the latest value. This means your filter/search never shows stale intermediate results.

> **Check yourself:** What happens to a transition render if a sync update arrives? React abandons the transition render immediately, handles the sync work, then restarts the transition with the updated state. The abandoned render is simply discarded — no partial updates are committed.

---

## Time Slicing

React breaks render work into **5ms chunks** (approximately one frame at 120fps). After each chunk, it checks: "Is there higher-priority work?" If yes, it yields. If no, it continues.

This is invisible to your component code — `render` still runs synchronously from the component's perspective. The chunking happens in the scheduler, not inside your components.

```
Frame 1: render 10 components... check for urgent work... none... continue
Frame 2: render 10 more components... check... keystroke arrives! yield
Frame 3: handle keystroke (sync) → restart transition render
```

---

## Tearing and `useSyncExternalStore`

Tearing is a problem unique to concurrent rendering. Consider a Redux store:

1. React starts rendering component A — reads `store.count` = 5
2. React yields (concurrent pause)
3. An action fires, updating `store.count` to 6
4. React resumes, renders component B — reads `store.count` = 6

Now A shows 5 and B shows 6 — **inconsistent UI from a single render pass**. This is tearing.

`useSyncExternalStore` solves this by forcing reads to be synchronous and consistent:

```tsx
const count = useSyncExternalStore(
  store.subscribe,     // subscribe to changes
  store.getCount,      // get current value (client)
  store.getCountSSR,   // get current value (server, for hydration)
);
```

React checks the snapshot between each chunk; if it changed, the whole render is restarted from a consistent snapshot. Any external state library (Redux, Zustand, MobX) that wants to be concurrent-safe must use this hook internally.

---

## What Concurrent Rendering Is NOT

- It does not mean **parallel** execution. JavaScript is single-threaded. Concurrent means interleaved, not simultaneous.
- It does not mean your renders are faster. Individual renders take the same time. The benefit is that **high-priority work isn't blocked** by low-priority renders.
- It does not require any opt-in beyond `createRoot`. But the benefits only show when you use `startTransition` or `useDeferredValue` to mark non-urgent work.

> **Check yourself:** If a transition render takes 2 seconds and no other work arrives, is the browser responsive during those 2 seconds? Yes — React yields to the browser every ~5ms regardless. The browser can process events; if no higher-priority React work arrives, it continues the transition render in chunks.

---

## Self-Assessment

- [ ] I can explain why the synchronous renderer caused jank and why concurrent rendering fixes it
- [ ] I know what a Fiber node is and why the linked-list structure enables interruptibility
- [ ] I can describe what lanes are and name at least three priority levels
- [ ] I understand what tearing is and why `useSyncExternalStore` prevents it
- [ ] I can explain what time slicing means without claiming JS runs in parallel

---

## Interview Q&A

**Q: What is concurrent rendering and what problem does it solve? `High`**

A: Concurrent rendering is React's ability to interrupt, pause, and resume renders based on priority. The synchronous renderer blocked the browser for the full duration of a render — if it took 200ms, user input was ignored for 200ms. Concurrent rendering breaks work into chunks and yields to the browser between them, so high-priority work (user input, animations) is never blocked by low-priority rendering.

---

**Q: What does `startTransition` actually do under the hood? `High`**

A: It marks the state updates inside its callback as low-priority (TransitionLane). React renders them interruptibly — if a higher-priority update arrives (like a new keystroke), React abandons the in-progress transition render, handles the urgent work, then restarts the transition with the latest state. The component sees a clean render, not a partial one.

---

**Q: What is tearing and how does React 18 prevent it? `Medium`**

A: Tearing is when different components in the same render pass read different values from an external store — one reads the old value before a store update, another reads the new value after a yield point. `useSyncExternalStore` prevents this by checking the store snapshot between chunks; if the snapshot changed, React restarts the render from a consistent state.

---

**Q: Does concurrent rendering mean React is multi-threaded? `Medium`**

A: No. JavaScript is single-threaded. Concurrent means interleaved — React breaks render work into ~5ms chunks and checks for higher-priority work between them. Multiple renders can be in-progress at the same time conceptually, but only one runs at a time. Work offloaded to a Web Worker would be parallel, but that's a separate mechanism entirely.

---

**Q: How does Fiber enable concurrent rendering? `Low`**

A: Fiber replaced the recursive call stack with a linked list of work units (Fiber nodes). A recursive renderer must run to completion once started — you can't pause a call stack. An iterative linked list lets React process one node, check for interruption, and come back later. Fiber also keeps a "work in progress" tree separate from the committed tree, so abandoned renders don't corrupt the displayed UI.
