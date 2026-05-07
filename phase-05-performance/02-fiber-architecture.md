# Fiber Architecture

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Fiber node | JS object representing one unit of work | Replaces the call stack; enables pausing between nodes |
| Double buffering | Current tree + work-in-progress tree | Renders can be aborted without touching the screen |
| Render phase | Interruptible computation — builds WIP tree | Can yield to browser between fiber nodes |
| Commit phase | Synchronous DOM mutation | Must be atomic; can never be interrupted |
| Lanes | Priority bitmask on every update | Enables preemption — high-priority work jumps the queue |

## What Is This?

Fiber is React's internal reconciliation engine — a complete rewrite of the original stack-based reconciler, shipped in React 16. Where the old reconciler walked the component tree recursively and couldn't stop mid-way, Fiber breaks work into small units that can be paused, resumed, prioritized, and aborted.

Each "fiber" is a plain JavaScript object that represents one unit of work — essentially an augmented virtual DOM node that carries not just the element description but also scheduling metadata, effect state, and a pointer to its work-in-progress twin.

> **Check yourself:** What was the core problem with the stack-based reconciler that Fiber was designed to fix?

---

## Why Does It Exist?

### The problem with synchronous recursion

The pre-Fiber reconciler was a recursive depth-first traversal. When a re-render started, it walked the entire component tree from root to leaves, calling `render` on every dirty component. It couldn't be interrupted — once started, it ran until complete.

This was fine when component trees were small and JS ran faster than the browser's frame budget. The problem appears when reconciliation takes more than ~16ms (the duration of a single 60fps frame). The browser is single-threaded: while React is reconciling, it cannot respond to user input, run animations, or paint. The UI freezes.

The symptom: typing into an input connected to a large component tree produces visible input lag. Animations stutter when triggered alongside expensive renders.

```
// Old reconciler — once started, this runs to completion.
// If it takes 200ms, the browser is blocked for 200ms.
reconcileTree(root);
```

### What Fiber enables

Fiber makes the reconciler interruptible. Instead of one deep recursive call, it structures work as a linked list of fiber nodes that can be processed one unit at a time. Between units, React can check whether higher-priority work has arrived (an animation, a user keypress) and yield to the browser's scheduler before continuing.

This is the foundation for every concurrent feature React 18 introduced: `useTransition`, `useDeferredValue`, Suspense with streaming, selective hydration — all require the ability to interrupt and reprioritize renders.

---

## How It Works

### The fiber node

Each component instance and each DOM element has a corresponding fiber node. It's a plain JS object with roughly this shape:

```js
const fiber = {
  // Identity
  type: MyComponent,       // function, class, or string ('div')
  key: null,

  // Tree structure (linked list, not a child array)
  child: null,             // first child fiber
  sibling: null,           // next sibling fiber
  return: null,            // parent fiber

  // Work to do
  pendingProps: {},        // props on the new render
  memoizedProps: {},       // props from the last commit
  memoizedState: null,     // hook list (useState, useEffect, ...)

  // Scheduling
  lanes: 0,                // priority bitmask
  flags: 0,                // what mutations this fiber needs (Update, Placement, Deletion...)

  // Double buffering
  alternate: null,         // pointer to the work-in-progress twin
};
```

### The double-buffering model

At any point there are two fiber trees:

- **Current tree**: what's currently rendered on screen.
- **Work-in-progress (WIP) tree**: what React is building for the next render.

When React starts a render, it clones the current fiber nodes into the WIP tree (or reuses existing WIP nodes if one exists from an interrupted render). Changes are made to the WIP tree. When the render is complete and committed, the WIP tree becomes the new current tree, and the old current tree becomes the WIP buffer for next time.

This is why React can abort a render mid-way — it just discards the WIP tree. The current tree is untouched; the screen is unchanged.

```
current tree        WIP tree
─────────────       ────────────
    App          ←→     App
     │                   │
   Header              Header
     │                   │
   List                 List
   / | \               / | \
 A   B   C           A   B   C  ← being built
```

### The two phases

**Render phase (interruptible)**

React walks the WIP fiber tree, calling component functions, running hooks, and building out the new tree. This phase is pure computation — no DOM mutations, no side effects. It can be paused between any two fiber nodes and resumed later.

React uses a work loop that processes one fiber at a time:

```js
// Simplified work loop concept
function workLoop() {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

`shouldYield()` checks the scheduler — if the browser has signaled that it needs the main thread (pending input events, animation frames), the loop yields. Crucially, this only yields *between* fiber nodes, not mid-component. A single component function always runs to completion.

**Commit phase (synchronous)**

Once the render phase produces a complete WIP tree, React enters the commit phase. This is synchronous and uninterruptible — it must complete in one shot because it mutates the DOM. Pausing mid-commit would leave the DOM in an inconsistent state.

The commit phase has three sub-phases:
1. **Before mutation**: snapshot effects (`getSnapshotBeforeUpdate`)
2. **Mutation**: apply DOM changes (insertions, updates, deletions)
3. **Layout**: `useLayoutEffect` and `componentDidMount/Update` fire here, synchronously after DOM mutation

`useEffect` is scheduled after the browser paints — it runs asynchronously after the commit phase.

### Priority lanes

Every update has a priority, expressed as a bitmask called a "lane." React 18 uses these lanes to decide which work to do first:

| Lane | When used |
|------|-----------|
| SyncLane | `ReactDOM.flushSync`, legacy mode |
| InputContinuousLane | Continuous input events (dragging, scrolling) |
| DefaultLane | Normal `setState` calls |
| TransitionLane | `startTransition` / `useTransition` |
| IdleLane | Offscreen, pre-rendering |

When a high-priority update arrives during a low-priority render, React can interrupt the low-priority WIP tree, process the high-priority update first (starting a new WIP tree), commit it, and then restart the low-priority work.

This is called **lane-based preemption** — the mechanism behind `useTransition` keeping the UI responsive while expensive renders are in flight.

> **Check yourself:** Why is the commit phase always synchronous even though the render phase can be interrupted? What would go wrong if you paused mid-commit?

---

## Fiber vs Stack Reconciler

| | Stack reconciler (React ≤15) | Fiber (React 16+) |
|---|---|---|
| Traversal | Recursive, call stack | Iterative, linked list |
| Interruptible | No | Yes |
| Priority | None | Lane-based |
| Concurrent features | Impossible | Enabled |
| Commit | Integrated with render | Separate phase |

---

## Gotchas

**1. Render phase may run multiple times in concurrent mode.**

Because renders can be interrupted and restarted, your component function may be called more than once before a commit happens. Any code that runs during render with external side effects (network requests, logging, writing to refs) can fire multiple times unexpectedly. This is why effects must go in `useEffect`, not in the render body, and why `StrictMode` double-invokes render functions in development — to surface exactly this class of bug.

**2. A single component always runs to completion.**

Fiber yields between components, not inside them. If your component function takes 500ms (e.g., running an expensive synchronous computation), Fiber cannot help — the browser is blocked for 500ms regardless. Move expensive computation to `useMemo`, Web Workers, or off the critical path.

**3. The commit phase is always synchronous.**

People expect that because renders are interruptible, DOM updates are too. They're not. Once React commits, it runs to completion. You cannot interrupt a commit by clicking or typing. The only thing Fiber makes interruptible is the *render phase*.

**4. `useLayoutEffect` blocks the browser paint.**

`useLayoutEffect` fires synchronously in the commit phase, before the browser paints. If your layout effect is slow, it delays the visual update — the same problem Fiber was designed to fix, just pushed to a different phase. Use `useEffect` unless you genuinely need to read DOM geometry before paint.

**5. Suspending during render doesn't abort the work.**

When a component throws a Promise (Suspense), React doesn't discard the WIP tree — it "parks" it and shows the fallback. When the Promise resolves, React can resume from where it left off rather than re-rendering from scratch. This is only possible because the WIP tree is a persistent data structure, not a call stack.

---

## Interview Questions


**Q (High): What problem does Fiber solve that the old stack reconciler couldn't?**

Answer: The stack reconciler was a synchronous, non-interruptible recursive traversal. Once a render started, it owned the main thread until completion. For large trees, this blocked the browser for tens or hundreds of milliseconds — input events were queued, animations stuttered, the UI felt unresponsive. Fiber replaces the call stack with an explicit linked list of work units. The work loop processes one fiber at a time and checks between each unit whether the browser needs the thread back. If it does, React yields and resumes later. This makes the render phase interruptible, which is the prerequisite for all concurrent features: transitions, deferred values, streaming SSR, selective hydration.

The trap: Candidates often say "Fiber makes React faster." Fiber doesn't make any individual render faster — it makes React *responsive* by preventing long renders from blocking the thread. The distinction matters: a 200ms render is still 200ms of CPU work, but with Fiber it can be split across multiple frames rather than blocking one.

---

**Q (High): What is the double-buffering model in Fiber and why does it matter?**

Answer: Fiber maintains two trees at all times: the current tree (what's on screen) and a work-in-progress tree (what React is building for the next render). React applies all changes to the WIP tree. The current tree is never mutated during a render — it stays intact and the screen stays consistent. When the render completes and commits, the WIP tree atomically becomes the new current tree, and the old current tree becomes the next WIP buffer. The consequence: React can abort a render at any point by simply discarding the WIP tree. The user sees no partial UI — the screen only changes on commit. This also enables time-slicing: a render can be paused, the current tree serves the user in the meantime, and the WIP work resumes later.

The trap: Candidates describe Fiber as "virtual DOM 2.0." It's not a diffing algorithm improvement — it's a scheduling and execution model change. The diff logic is largely the same; what changed is *how* and *when* that logic runs.

---

**Q (High): Why is the render phase interruptible but the commit phase not?**

Answer: The render phase is pure computation — it builds the WIP tree, runs hooks for their return values, and produces a list of mutations. No DOM has been touched, no side effects have fired. Interrupting it and restarting is safe because there's no observable external state change to undo. The commit phase, by contrast, mutates the real DOM. If you interrupted mid-commit, you'd have a partially-updated DOM — some nodes reflecting new state, others reflecting old state. The browser might paint this intermediate state and the user would see a broken UI. So the commit phase must run atomically and synchronously once started. This is also why `useLayoutEffect` (which fires in the commit phase) can safely read freshly-updated DOM geometry — the DOM is fully consistent at that point.

The trap: Interviewers often ask "can a user click a button and interrupt a React commit?" The answer is no — DOM events are queued while the commit runs. The design is intentional; the commit is expected to be fast since it's just DOM mutation, not computation.

---

**Q (Medium): What are lanes in Fiber and how do they relate to `useTransition`?**

Answer: Lanes are a bitmask-based priority system. Every state update is tagged with a lane that represents its urgency — SyncLane for flushSync, InputContinuousLane for drag events, DefaultLane for normal setState, TransitionLane for updates wrapped in `startTransition`. React processes higher-priority lanes first. If a high-priority update arrives while a lower-priority render is in flight, React can interrupt the low-priority WIP tree, start a new render for the high-priority update, commit it, and then restart the low-priority work. `useTransition` works by tagging its updates with TransitionLane — explicitly telling React "this update can be preempted by anything more urgent." The UI remains responsive because input events always land in a higher-priority lane.

The trap: Weaker answers describe `useTransition` as "debouncing" or "delaying" updates. It doesn't delay anything — it *deprioritizes*. The update starts immediately in a lower-priority lane and can be preempted if something more urgent arrives.

---

**Q (Medium): Why can your component function run more than once before a commit in concurrent mode?**

Answer: In concurrent mode, React can interrupt and restart renders. If a higher-priority update arrives mid-render, React discards the current WIP tree and starts over — your component functions run again from scratch. Additionally, React 18 may intentionally run render functions twice in StrictMode to surface impure renders. This means any side effect in the render body (network calls, external writes, mutable refs) may fire multiple times before a commit happens. The fix is to ensure render functions are pure — they compute and return, nothing more. Side effects belong exclusively in `useEffect` or event handlers.

The trap: Candidates familiar only with legacy mode (where renders run once) are caught off-guard. A good answer acknowledges that StrictMode's double-invocation is a deliberate diagnostic, not a bug.

---
**Q (Low): A colleague says "Fiber makes React's virtual DOM faster." How would you correct that?**

Answer: Fiber doesn't speed up the reconciliation algorithm itself — the diff heuristics are largely unchanged from React 15. What Fiber changes is the execution model: it converts the synchronous recursive traversal into an iterative work loop over a linked list of fiber nodes. This makes the render phase interruptible and allows React to yield the main thread between fiber nodes. The performance benefit isn't faster diffing — it's avoiding long tasks that block user input and animations. For raw throughput (total CPU time to reconcile a tree), Fiber may actually be slightly *slower* due to the overhead of the work loop and scheduler. The win is responsiveness and the enabling of concurrent features, not throughput.

---

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why the stack reconciler caused UI freezes and what Fiber changed structurally
- [ ] Can describe what a fiber node is and name at least four fields it contains
- [ ] Can explain the double-buffering model and why it allows safe render aborts
- [ ] Can name the three sub-phases of the commit phase in order
- [ ] Can explain why the render phase is interruptible but the commit phase is not
- [ ] Can describe what lanes are and how they enable `useTransition` to keep the UI responsive

---

*Next: Render vs Commit Phase — now that you know Fiber splits work into a render phase and commit phase, the next topic examines what exactly happens in each, where your effects fire, and what you can and can't do in each.*
