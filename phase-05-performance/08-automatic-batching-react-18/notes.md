# Automatic Batching (React 18)

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Batching | React grouping multiple `setState` calls into one re-render | Reduces wasted renders when multiple state slices update together |
| React 17 batching | Only applied inside React synthetic event handlers | `setTimeout`, Promises, and native listeners each triggered one render per `setState` |
| Automatic batching (React 18) | Batching applies everywhere in the same scheduler task | Free perf win for async callbacks and third-party code that sets state |
| `createRoot` requirement | Automatic batching only activates with `createRoot` | Apps still on `ReactDOM.render` keep React 17 behavior |
| `flushSync` | Forces an immediate synchronous flush, breaking the batch | Opt-out for cases where you need an intermediate DOM commit |

## What Is This?

Batching is React grouping multiple state updates into a single re-render. Instead of re-rendering once per `setState` call, React waits until all updates in a given context are queued, then renders once with the final state.

React 18 expanded batching to work automatically everywhere — including inside `setTimeout`, `Promise` callbacks, and native event handlers. In React 17 and earlier, batching only happened inside React synthetic event handlers.

```js
// React 18 — both setState calls are batched → one re-render
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // one render with both updates applied
}, 1000);

// React 17 — NOT batched → two re-renders
setTimeout(() => {
  setCount(c => c + 1); // render 1
  setFlag(f => !f);     // render 2
}, 1000);
```

---

## Why Does It Exist?

### The pre-React 18 problem

React's reconciler has always been able to batch updates — the mechanism existed. The limitation was *when* batching was applied. React only batched state updates that originated from its own synthetic event system (onClick, onChange, etc.). Anything else — `setTimeout`, `setInterval`, `fetch.then()`, native DOM event listeners — bypassed React's event handler and therefore bypassed batching.

This meant that async code was penalized: a fetch callback that updated two state variables caused two separate renders and two separate commits. For UIs that update multiple state slices after a network response, this doubled the rendering work.

### React 18's solution

React 18 introduced a scheduler-level batching model. Instead of "batch updates that arrive from within a React event handler," React now batches all updates that arrive within the same microtask / scheduler task, regardless of their origin. The render is deferred to the next scheduler tick, giving any synchronous state updates in the current call stack time to accumulate before the render runs.

> **Check yourself:** In React 17, which contexts batched `setState` calls and which didn't? What was the practical consequence for async code?

---

## How It Works

### The old model (React 17)

React's legacy event system wrapped browser events in a batch:

```
Browser dispatches click
  → React's event handler wrapper: unstable_batchedUpdates()
    → Your onClick handler runs
      → setState calls queued
    → Handler exits
  → Batch flushes: one render
```

Outside of this wrapper (e.g., in a `setTimeout` callback), `setState` immediately triggered a render synchronously:

```
setTimeout fires
  → Your callback runs
    → setCount() → render 1
    → setFlag()  → render 2
```

### The new model (React 18 with `createRoot`)

`createRoot` opts your app into React 18's concurrent mode and the new scheduler. State updates are no longer flushed immediately on `setState` — they're enqueued and flushed at the end of the current task. Any state updates queued synchronously within the same task are batched:

```
setTimeout fires
  → Your callback runs
    → setCount() → queued
    → setFlag()  → queued
  → Callback exits
→ React scheduler flushes: one render
```

This applies to:
- `setTimeout` / `setInterval`
- `fetch` / `Promise.then`
- Native event listeners added with `addEventListener`
- Any synchronous call sequence

### Opting out: `flushSync`

If you genuinely need an intermediate render (rare), you can force a synchronous flush with `flushSync`:

```js
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1);
});
// DOM is updated here — before the next line
flushSync(() => {
  setFlag(f => !f);
});
// DOM is updated here — two separate renders, two commits
```

`flushSync` is for edge cases: animating from a DOM measurement taken after a specific state update, or third-party integrations that read the DOM synchronously after setState. Don't reach for it as a default.

---

## What Automatic Batching Changes in Practice

Most well-written React apps already batched all critical state updates together. The scenarios where automatic batching helps most are:

**1. Multiple state updates in async callbacks:**

```js
// React 17: three renders for one fetch response
// React 18: one render
async function loadUser(id) {
  const user = await fetchUser(id);
  setUser(user);
  setLoading(false);
  setError(null);
}
```

**2. Multiple state updates in event handlers added with `addEventListener`:**

```js
// React 17: separate render per setState
// React 18: one render
document.addEventListener('keydown', (e) => {
  setKey(e.key);
  setModifiers({ ctrl: e.ctrlKey, shift: e.shiftKey });
});
```

**3. Third-party libraries that call setState outside React's event system:**

Libraries that integrate with the DOM directly (drag libraries, rich text editors, WebSocket handlers) now get batching for free in React 18.

---

## The `createRoot` Requirement

Automatic batching only applies when you've migrated to `createRoot`. If you're still using `ReactDOM.render` (legacy mode), you get React 17 batching behavior even with the React 18 package installed.

```js
// Legacy mode — no automatic batching outside events:
ReactDOM.render(<App />, document.getElementById('root'));

// Concurrent mode — automatic batching everywhere:
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

This was a deliberate migration path — apps could upgrade the React package and adopt new features incrementally.

> **Check yourself:** You upgraded to React 18 but async callbacks still seem to cause multiple re-renders. What's the most likely cause?

---

## Batching and State Update Order

Batching doesn't change the semantics of individual updates — it only delays the render. State updates within a batch are still applied in order, and each update sees the state from the previous update in the batch (when using the functional form):

```js
// Both updaters run before the render.
// Second updater receives the count after the first updater ran.
setCount(c => c + 1); // c: 0 → 1
setCount(c => c + 1); // c: 1 → 2
// One render with count = 2
```

With the direct form:

```js
// Both updates reference the same `count` from the render that enqueued them.
// Second setCount overwrites, effectively:
setCount(count + 1); // schedules count → count+1
setCount(count + 1); // schedules count → count+1 again (same stale value)
// One render with count = count + 1, not count + 2
```

> **Check yourself:** If you call `setCount(count + 1)` twice in a batch, do you get one increment or two? Why? What form fixes this?

---

## Gotchas

**1. Batching is not the same as debouncing.**

Batching groups updates that occur in the same synchronous call frame. If two `setState` calls are 100ms apart (two separate `setTimeout` callbacks), they produce two separate renders — they're in different tasks.

**2. `flushSync` inside a batched context forces an early flush.**

If you call `flushSync` inside a callback that would otherwise be batched, React commits the updates queued before `flushSync` immediately, then continues. Updates after `flushSync` are a new batch.

**3. React 18 batching in third-party portals.**

If your app uses legacy `ReactDOM.render` for portals while the rest uses `createRoot`, portal updates aren't batched in the new model. Mixed-mode apps need careful testing.

**4. State reads inside the batch still see stale values.**

Within a batched call:

```js
setCount(count + 1);
console.log(count); // still the old value — render hasn't happened yet
```

The render hasn't happened; state is not updated synchronously. Always use the functional updater form if the next update depends on the current state.

---

## Interview Questions


**Q (High): What is batching in React and what changed in React 18?**

Answer: Batching is React grouping multiple state updates into a single re-render. Before React 18, batching only applied inside React's synthetic event handlers — `setTimeout`, Promises, and native event listeners each triggered one render per `setState` call. React 18 with `createRoot` enables automatic batching everywhere: any state updates queued synchronously within the same scheduler task are collapsed into one render. A `fetch` callback that calls three `setState`s now produces one render instead of three. The opt-out is `flushSync` for cases where you genuinely need an intermediate DOM commit.

The trap: Candidates who say "React always batched state updates" are partially right (within event handlers) but miss the scope of the change. The correct nuance is "React 17 batched within synthetic events; React 18 batches everywhere, unconditionally."

---

**Q (High): What is `flushSync` and when would you actually use it?**

Answer: `flushSync` forces React to synchronously flush all queued state updates and commit the resulting DOM changes before returning. It's the opt-out from batching. You'd use it when you need to read the DOM immediately after a state update — for example, computing a scroll position after an item is added to a list, or coordinating with a third-party library that reads the DOM synchronously. It's intentionally verbose — if you find yourself reaching for it often, it's usually a signal that the state structure or the component design should be rethought. Overusing `flushSync` negates the performance benefit of batching and can cause layout thrash.

---
**Q (Medium): Does automatic batching apply if I'm still using `ReactDOM.render` (legacy mode)?**

Answer: No. Automatic batching is gated on `createRoot`. If you're on legacy mode (`ReactDOM.render`), you get React 17's batching behavior even with the React 18 package — batching only inside synthetic event handlers. This was deliberate: it gives teams a gradual migration path. They can upgrade the React package and adopt new React 18 features incrementally, without breaking apps that depend on the synchronous setState behavior outside event handlers.

---

**Q (Medium): In a batched update, you call `setState` twice with the direct form (`setState(value + 1)`) vs the functional form (`setState(v => v + 1)`). What's the difference?**

Answer: The direct form captures the state value from the current render — both calls see the same `value`. If both enqueue `value + 1`, the second overwrites the first and you end up with one increment, not two. The functional form receives the most recent queued state as its argument — the second call sees the result of the first. Two functional increments produce two increments. This is why the functional updater form is always safer when the new state depends on the previous state, especially in batched contexts.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what React 17 batched vs what it did NOT batch, with a concrete example
- [ ] Can explain what changed in React 18 and what the `createRoot` requirement is
- [ ] Can describe what `flushSync` does and name a real use case for it
- [ ] Can explain the difference between the direct and functional updater form within a batch, and predict the final state value
- [ ] Can name why automatic batching is a no-op if you haven't migrated to `createRoot`

---

*Next: Code Splitting — batching reduces re-render count; code splitting reduces how much JavaScript the browser loads upfront. Both are essential performance levers for production React apps.*
