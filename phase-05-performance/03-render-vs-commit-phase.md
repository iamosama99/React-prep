# Render vs Commit Phase

## Quick Reference

| Phase | When it runs | Interruptible? | What happens |
|---|---|---|---|
| Render | On every state/prop/context change | Yes (concurrent mode) | Component functions called, WIP fiber tree built, flags set |
| Commit — mutation | After render completes | No | DOM updated, refs attached |
| Commit — layout | Immediately after mutation | No | `useLayoutEffect` fires synchronously before paint |
| Passive effects | After browser paints | N/A | `useEffect` fires asynchronously |

## What Is This?

React's work is divided into two distinct phases: the **render phase** and the **commit phase**. They run sequentially and have fundamentally different properties — one is interruptible and pure, the other is synchronous and effectful.

Understanding where your code runs in this pipeline explains why effects fire when they do, why reading the DOM in a render function is wrong, and why `useLayoutEffect` blocks the paint but `useEffect` does not.

> **Check yourself:** What makes the render phase safe to interrupt, and what makes interrupting the commit phase dangerous?

---

## Why Does It Exist?

React needs to separate *figuring out what changed* from *applying those changes*. If both happened together, you couldn't interrupt mid-stream without leaving the DOM in a torn state. The split also means the render phase can be re-run (in concurrent mode) without any observable side effects — the user never sees speculative work that didn't make it to commit.

---

## How It Works

### The Render Phase

The render phase is where React figures out what needs to change. It:

1. Calls your component functions (or class `render` methods)
2. Runs hooks in order, collecting state, reducers, context values
3. Builds / updates the work-in-progress fiber tree
4. Diffs the WIP tree against the current tree
5. Tags each fiber with effect flags (Placement, Update, Deletion, etc.)

**Key properties:**
- No DOM mutations happen here
- No refs are attached here (they're still pointing at the previous DOM nodes)
- In concurrent mode, this phase can be paused, aborted, and restarted
- Component functions may run multiple times before a commit occurs

```js
function Counter({ count }) {
  // This runs during the render phase — pure computation only.
  // Calling document.title here is a side effect — wrong phase.
  const doubled = count * 2; // fine
  document.title = `Count: ${count}`; // DON'T — render may run many times

  return <div>{doubled}</div>;
}
```

### The Commit Phase

The commit phase applies the changes. React walks the completed WIP fiber tree and executes all the flagged mutations against the real DOM. It runs synchronously to completion — no interruptions.

The commit phase has three distinct sub-phases, in order:

#### Sub-phase 1: Before Mutation

React reads any snapshots it needs before touching the DOM — `getSnapshotBeforeUpdate` for class components fires here. This sub-phase is rarely relevant for function components.

#### Sub-phase 2: Mutation

React applies DOM mutations: inserting new nodes, updating attributes/text, removing deleted nodes. This is where `ref.current` is updated for DOM refs — after this sub-phase, `ref.current` points to the freshly-updated DOM node.

#### Sub-phase 3: Layout

`useLayoutEffect` (and class `componentDidMount` / `componentDidUpdate`) fires synchronously here, *after* DOM mutation but *before* the browser has a chance to paint. The DOM is fully consistent at this point — you can safely read layout values (getBoundingClientRect, scrollTop, clientHeight).

```js
useLayoutEffect(() => {
  // DOM is updated. Browser hasn't painted yet.
  const rect = ref.current.getBoundingClientRect();
  // Safe to read geometry, synchronously adjust layout.
}, [dep]);
```

After the layout sub-phase, the commit phase is complete. React flips the WIP tree to become the new current tree.

### After the Commit: Passive Effects

`useEffect` does not run during the commit phase. After the commit, React schedules passive effects to run asynchronously — the browser paints first, *then* effects fire.

```
Render phase   →   Commit phase (mutation → layout)   →   Browser paint   →   useEffect
```

```js
useEffect(() => {
  // DOM is updated AND painted. Anything async belongs here.
  fetchData();
  subscribeToSocket();
}, [dep]);
```

> **Check yourself:** In the sequence render → commit → paint → useEffect, at which point does `useLayoutEffect` fire and what can you safely do there that you cannot do in `useEffect`?

---

## The Full Timeline

```
1. State update triggered (setState, dispatch, context change)
2. React schedules a render
3. ─── RENDER PHASE (interruptible in concurrent mode) ──────────────────
   a. Component functions called
   b. Hooks run (useState returns current state, useRef returns current ref)
   c. WIP fiber tree built and diffed
   d. Fiber flags set (what mutations are needed)
4. ─── COMMIT PHASE (always synchronous) ────────────────────────────────
   a. Before mutation: getSnapshotBeforeUpdate
   b. Mutation: DOM updated, refs attached
   c. Layout: useLayoutEffect cleanup → useLayoutEffect setup
5. Browser paints the updated DOM
6. Passive effects: useEffect cleanup → useEffect setup
```

---

## What You Can and Can't Do in Each Phase

| | Render Phase | Commit Phase (layout) | After paint (effect) |
|---|---|---|---|
| Read component state | ✅ | ✅ | ✅ |
| Mutate state (setState) | ❌ (causes infinite loop) | ✅ (triggers sync re-render) | ✅ |
| Read DOM geometry | ❌ (DOM not updated) | ✅ (DOM updated, not painted) | ✅ (DOM painted) |
| Mutate the DOM directly | ❌ | ✅ (use sparingly) | ✅ |
| Network requests | ❌ (may run multiple times) | ❌ (blocks paint) | ✅ |
| Subscriptions / timers | ❌ | ❌ | ✅ |
| Read refs | ⚠️ (stale until commit) | ✅ | ✅ |

---

## useLayoutEffect vs useEffect — The Practical Distinction

The only difference is *when* they fire relative to the browser paint:

- `useLayoutEffect` → synchronous, before paint → blocks paint → use when you need to read/mutate DOM before user sees it
- `useEffect` → asynchronous, after paint → non-blocking → use for everything else

```js
// useLayoutEffect: prevent flash of wrong position
function Tooltip({ anchorRef }) {
  const tooltipRef = useRef();

  useLayoutEffect(() => {
    // Measure anchor, position tooltip.
    // If we used useEffect, user would briefly see tooltip in wrong position.
    const { bottom } = anchorRef.current.getBoundingClientRect();
    tooltipRef.current.style.top = `${bottom + 8}px`;
  }, []);

  return <div ref={tooltipRef} className="tooltip">...</div>;
}

// useEffect: data fetching, subscriptions — don't block paint
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return user ? <Profile user={user} /> : <Spinner />;
}
```

---

## Gotchas

**1. Calling setState in useLayoutEffect triggers a synchronous re-render before paint.**

This can be intentional (measuring DOM, adjusting layout) but it means two renders happen before the user sees anything. If the second render is expensive, you've blocked paint for the cost of both renders. Use it deliberately, not casually.

**2. Calling setState during render causes an infinite loop.**

React re-renders on state change. If render itself triggers a state change, you get render → setState → render → setState → crash. The exception: calling `setState` in the render body *conditionally* is allowed only in the exact pattern React documents for `getDerivedStateFromProps` equivalents in function components — and it's still a footgun.

**3. Refs are stale during the render phase.**

`ref.current` is only updated during the mutation sub-phase of commit. If you read `ref.current` during render, you get the value from the *previous* render, not the current one. This is fine for most uses (refs are intentionally outside the render/props system) but trips people up when they try to use a ref to avoid a stale closure — and then read it at render time.

**4. Effects run after every commit, not every render.**

If React bails out of a commit (because the render produced no changes), effects don't fire. The check happens during the render phase. If your effect isn't running, check whether the render is actually producing a diff.

**5. useInsertionEffect runs before any DOM mutation.**

There's a third effect type: `useInsertionEffect`. It fires before `useLayoutEffect`, before the browser has any of the new DOM nodes. Its only legitimate use is CSS-in-JS libraries that need to inject `<style>` tags before layout is read. Don't use it in application code.

**6. Cleanup runs before the new setup, not after.**

Effect cleanup order: old cleanup → new setup. Both happen in the same phase. When deps change: old `useLayoutEffect` cleanup fires in the layout sub-phase, new `useLayoutEffect` setup fires right after. For `useEffect`, old cleanup fires before new setup in the passive effects flush — not between renders.

---

## Interview Questions


**Q (High): What's the difference between `useEffect` and `useLayoutEffect`? When would you choose one over the other?**

Answer: Both run after a commit, but at different points. `useLayoutEffect` fires synchronously after React has mutated the DOM but before the browser paints. `useEffect` fires asynchronously after the browser has painted. The practical consequence: `useLayoutEffect` can read layout (getBoundingClientRect, scrollTop) and make DOM adjustments before the user sees anything — preventing a flash of wrong state. `useEffect` is non-blocking and is the correct choice for data fetching, subscriptions, timers, and anything that doesn't need to read or mutate the DOM immediately after render. Default to `useEffect`. Switch to `useLayoutEffect` only when you observe a visual flash that happens because the effect runs too late.

The trap: Candidates who say "use `useLayoutEffect` when you need DOM access" are too broad. Both can access the DOM. The criterion is whether you need to prevent a flash by acting *before paint*.

---

**Q (High): Why can't you safely perform side effects (fetch data, subscribe) directly in your component's render body?**

Answer: The render phase can run multiple times before a commit in concurrent mode. React may call your component function, then interrupt and call it again (or not commit it at all). Any side effect in the render body — a network request, a subscription, a mutable write — fires each time the function runs. A fetch in the render body means multiple in-flight requests per commit, none of them properly cleaned up. Effects in `useEffect` are tied to the commit: they run once per commit, after the DOM is updated, and their cleanup runs before the next effect fires or before the component unmounts.

The trap: In legacy (synchronous) mode, the render phase runs exactly once per commit, so side effects in the render body happen to work. This masks the bug. StrictMode double-invokes renders in development to surface it.

---

**Q (Medium): A user sees a brief visual flicker when a tooltip appears. The tooltip is positioned with a `useEffect` that reads the anchor's bounding rect. How do you fix it?**

Answer: Switch to `useLayoutEffect`. The flicker happens because `useEffect` runs after the browser has painted: the browser paints the tooltip in its default position (top: 0), then the effect reads the anchor rect and moves it — the user sees the jump. `useLayoutEffect` runs synchronously after DOM mutation but before paint, so the repositioning happens before the browser renders anything visible. The user never sees the wrong position.

The trap: Some candidates suggest moving the positioning logic to CSS or a resize observer. Those are valid architectural alternatives, but the interviewer is testing knowledge of the render/commit timing model. Give the direct answer first.

---

**Q (Medium): What happens if you call `setState` inside `useLayoutEffect`?**

Answer: React synchronously re-renders the component before the browser paints. The sequence is: commit → `useLayoutEffect` fires → setState → synchronous re-render → commit again → browser finally paints. The user sees the result of the *second* render, never the intermediate state. This can be intentional — measure DOM, compute derived value, setState — but it doubles the work before paint. If the second render is expensive, you've blocked paint for the combined cost of both. It's a valid pattern when you genuinely need to avoid a flash, but it's frequently overused.

---
**Q (Low): In what order do effects clean up and run when a dependency changes?**

Answer: React processes effects in a predictable order within each phase. When dependencies change after a commit:
- `useLayoutEffect` cleanup (old) → `useLayoutEffect` setup (new) — synchronous, before paint
- `useEffect` cleanup (old) → `useEffect` setup (new) — asynchronous, after paint

Cleanup always runs before the new setup for the same effect. For multiple effects in the same component, they run in declaration order — top to bottom.

---

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can recite the full sequence: render phase → commit sub-phases → paint → passive effects
- [ ] Can explain why `useLayoutEffect` blocks paint and when that is actually desirable
- [ ] Can name what is and isn't safe to do during the render phase
- [ ] Can describe the cleanup ordering: old cleanup runs before new setup, in the same phase
- [ ] Can explain why calling `setState` in the render body causes an infinite loop
- [ ] Can describe the tooltip flicker scenario and fix it correctly with `useLayoutEffect`

---

*Next: What Causes Re-renders — the render/commit model explains how React processes work; next is understanding what triggers that work in the first place, and how to reason about unnecessary re-renders.*
