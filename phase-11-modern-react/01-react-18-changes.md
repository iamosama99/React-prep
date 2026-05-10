# React 18 Changes Summary

## Quick Reference

| Change | What it does | Why it matters |
|---|---|---|
| `createRoot` | New render API | Opts into concurrent features |
| Automatic batching | Groups all setState calls | Fewer re-renders in async code |
| `useTransition` / `useDeferredValue` | Marks low-priority updates | UI stays responsive during heavy renders |
| `useSyncExternalStore` | Safe external store subscription | Fixes tearing in concurrent mode |
| `useId` | SSR-safe unique IDs | Eliminates hydration mismatch for IDs |
| Strict Mode double-invoke | Mounts, unmounts, remounts in dev | Catches missing effect cleanup |

---

## Why React 18 Exists

React 17 had no new user-facing features — it was purely a plumbing release to enable incremental adoption. React 18 is the payoff: all the concurrent infrastructure that was built over several years, shipped in a way that doesn't break existing apps.

The core insight is that **not all state updates are equally urgent**. Typing into a search box is urgent — the input must feel instant. Rendering 500 filtered results is less urgent — a few hundred milliseconds of lag is acceptable. Before React 18, React had no way to express this. Every `setState` triggered a synchronous render chain; the browser couldn't interrupt it, so heavy renders caused jank.

React 18 gives you the tools to **prioritize** renders, **interrupt** low-priority ones, and **stream** HTML progressively to the browser.

---

## The New Root API

```tsx
// React 17 — no concurrent features
import { render } from 'react-dom';
render(<App />, document.getElementById('root'));

// React 18 — opts into all concurrent features
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

`createRoot` is the gate. Using the old `render` API keeps everything working exactly as before — no breaking changes. But you get none of the new features.

For hydrating SSR'd HTML:

```tsx
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root')!, <App />);
```

---

## Automatic Batching

Before React 18, batching (grouping multiple `setState` calls into one render) only worked inside React event handlers. In async code, every `setState` triggered its own render:

```tsx
// React 17 — three separate renders in a setTimeout
setTimeout(() => {
  setCount(c => c + 1);  // render
  setFlag(f => !f);       // render
  setName('Alice');       // render
}, 1000);

// React 18 — one render for all three
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  setName('Alice');
}, 1000); // batched automatically
```

This applies to `setTimeout`, `Promise.then`, `fetch` callbacks, native event listeners — anywhere. If you ever need to opt out:

```tsx
import { flushSync } from 'react-dom';

flushSync(() => setCount(c => c + 1)); // forces immediate render
flushSync(() => setFlag(f => !f));     // forces immediate render
```

> **Check yourself:** Why did React 17 batch in synthetic event handlers but not in `setTimeout`? Because the old synchronous renderer could only batch work it "owned" — code inside its own event dispatch loop. Async callbacks ran outside that loop, so React had no hook to delay flushing.

---

## Concurrent Features

### `useTransition`

Marks a state update as non-urgent. React can interrupt it to handle more urgent work (like new keystrokes).

```tsx
const [isPending, startTransition] = useTransition();

function handleSearch(query: string) {
  setQuery(query);                          // urgent — sync
  startTransition(() => {
    setFilteredResults(filter(data, query)); // non-urgent — interruptible
  });
}
```

`isPending` is `true` while the transition is in flight — use it to show a loading indicator without blocking the input.

### `useDeferredValue`

Stabilizes a derived value: the deferred copy lags behind the live value by one render, giving you the previous value while the new one computes.

```tsx
const deferredQuery = useDeferredValue(query);
// deferredQuery trails query by ~one render in heavy scenarios
```

### Suspense for Data (integration with frameworks)

React 18 made Suspense for data fetching official. Previously, it only worked with `React.lazy`. Now any framework/library can suspend by throwing a Promise. React renders a fallback while waiting, then re-renders when the Promise resolves.

```tsx
<Suspense fallback={<Spinner />}>
  <UserProfile userId={id} />
</Suspense>
```

---

## New Hooks Overview

| Hook | Purpose |
|---|---|
| `useTransition` | Defer non-urgent state updates |
| `useDeferredValue` | Defer a derived value |
| `useId` | SSR-safe unique ID generation |
| `useSyncExternalStore` | Subscribe to external stores safely under concurrent rendering |
| `useInsertionEffect` | CSS-in-JS: inject styles before DOM reads |

---

## Strict Mode in React 18

React 18's Strict Mode now **mounts, unmounts, then remounts** every component in development. The unmount step runs cleanup functions. This catches bugs where effects are not properly cleaned up.

```tsx
// This effect now runs twice in StrictMode (mount → unmount → mount)
useEffect(() => {
  const sub = subscribe(id);
  return () => sub.unsubscribe(); // cleanup MUST work
}, [id]);
```

This only happens in development — production is unaffected. Many developers were caught off guard by this change when upgrading.

> **Check yourself:** If your effect runs twice in StrictMode and causes a bug, is the bug in StrictMode or in your effect? In your effect — production network hiccups and re-mounts (e.g. React Native navigation) will also remount; StrictMode is just surfacing the missing cleanup early.

---

## Concurrent Rendering Is Opt-In

Using `createRoot` opts you in, but all breaking behavior only shows up when you use concurrent APIs (`useTransition`, `useDeferredValue`, `startTransition`, Suspense for data). Plain code with no concurrent APIs renders the same as before.

---

## Self-Assessment

- [ ] I can explain why `createRoot` is required for concurrent features
- [ ] I can describe what automatic batching fixes and how to opt out with `flushSync`
- [ ] I know the difference between `useTransition` and `useDeferredValue`
- [ ] I understand why StrictMode double-invokes effects in React 18 and what it catches
- [ ] I can name the five new hooks and their purposes

---

## Interview Q&A

**Q: What does `createRoot` change vs the old `render` API? `High`**

A: `createRoot` opts the entire tree into React 18's concurrent renderer. With the old `render`, React uses the legacy synchronous renderer and ignores all concurrent APIs. The migration is a one-line change — existing code keeps working, and you can adopt concurrent features incrementally.

---

**Q: What problem does automatic batching solve? `High`**

A: In React 17, state updates inside async callbacks (Promises, setTimeout, native event listeners) each triggered their own render. Automatic batching groups all updates within the same async task into a single render, reducing work and preventing intermediate renders with inconsistent state.

---

**Q: What is `useTransition` and when do you use it? `High`**

A: `useTransition` marks a state update as non-urgent, allowing React to interrupt its render if higher-priority work arrives (like a new keystroke). You use it when an update triggers an expensive render but you don't want to block user input. The `isPending` flag lets you show a loading indicator without freezing the UI.

---

**Q: What changed about Strict Mode in React 18 and why? `Medium`**

A: React 18's Strict Mode runs effect cleanup then remounts every component once in development (mount → unmount → mount). This simulates future React behavior where components may be offscreen and restored. It surfaces effects that don't clean up properly before those bugs reach production.

---

**Q: How does React 18 handle Suspense for data differently than React 17? `Medium`**

A: React 17 supported Suspense only for `React.lazy` — code splitting. React 18 made Suspense a first-class data fetching primitive: any library or framework can suspend a component by throwing a Promise during render. React renders the nearest Suspense boundary's fallback, then re-renders when the Promise resolves. Combined with streaming SSR, this enables progressive page delivery.

---

**Q: When would you use `flushSync`? `Low`**

A: When you need a state update to flush synchronously before the next line of code runs — typically in cases where you must read the DOM immediately after a state change, or when integrating with third-party code that expects synchronous DOM updates. It's rare; most code should let React batch automatically.
