# useTransition

## What Is This?

`useTransition` is a hook that lets you mark a state update as non-urgent, telling React it's okay to defer that update if more urgent work arrives. It returns an `isPending` boolean and a `startTransition` function.

```javascript
const [isPending, startTransition] = useTransition();

function handleTabChange(tab) {
  startTransition(() => {
    setSelectedTab(tab); // Mark this update as non-urgent
  });
}

// Use isPending to show feedback while the transition is in progress
{isPending && <Spinner />}
```

Without `useTransition`, switching tabs would block the UI while React renders the new tab's content. With it, React can interrupt the tab render to handle more urgent interactions (like another click), keeping the UI responsive.

## Why Does It Exist?

React 18 introduced **concurrent rendering** — the ability to work on multiple renders simultaneously and interrupt lower-priority work to handle higher-priority work. But React needs you to tell it which updates are urgent and which aren't.

Before concurrent React, all state updates were treated equally — urgent user input (typing, clicking) and non-urgent view transitions (switching a tab, navigating a page) all had to complete before React yielded back to the browser. If the new tab's content was expensive to render, the entire UI would freeze until it finished.

`useTransition` is the signal: "this state change is a view transition — it's okay to deprioritize it." React can then:

1. Keep the current UI interactive while the transition is in progress
2. Interrupt the transition if the user does something more urgent
3. Show a loading indicator (`isPending`) without committing an intermediate broken state

This is fundamentally different from debouncing or setTimeout tricks — React is doing real concurrent work, not just delaying it.

## How It Works

### Concurrent Rendering Under the Hood

In traditional React, rendering is synchronous and blocking — React starts a render, finishes it, then commits. The browser can't paint or handle events while this is happening.

Concurrent React can **pause** a render partway through, yield to the browser (to handle inputs, paint), and then resume the render. It can also **discard** a partially-completed render and start fresh if better information arrives.

`useTransition` hooks into this: any state update inside `startTransition` is tagged as low priority. React will render it concurrently — yielding to the browser between work units — rather than in one blocking burst.

### The isPending State

`isPending` is true from the moment you call `startTransition` until the transition state has been committed to the screen. During this window, you can show a loading indicator while keeping the current content fully interactive.

```javascript
function TabBar({ tabs }) {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [isPending, startTransition] = useTransition();

  function selectTab(tab) {
    startTransition(() => setActiveTab(tab));
  }

  return (
    <>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab)}
            style={{ opacity: isPending ? 0.7 : 1 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Current tab content stays visible until transition completes */}
      {/* New content renders in background, commits only when ready */}
      <TabContent tab={activeTab} />
    </>
  );
}
```

While the transition renders, the old tab content stays on screen. React doesn't show a partially-rendered new tab. When rendering is complete, it commits the new tab all at once.

### What React Actually Does

```
User clicks "Tab B"
→ React starts rendering Tab B content (low priority)
→ User hovers over a button (urgent: needs hover state)
→ React pauses Tab B render
→ React handles hover event (milliseconds)
→ React resumes Tab B render
→ Tab B render completes
→ React commits Tab B content to DOM
→ isPending becomes false
```

This interruptibility is what makes the UI feel snappy even when rendering is expensive.

## startTransition Without the Hook

React also exports `startTransition` as a standalone function from the `react` package. Use this when you need to mark a transition outside a component (e.g., in an event handler at the module level):

```javascript
import { startTransition } from 'react';

startTransition(() => {
  setState(newValue);
});
```

The difference: the standalone `startTransition` has no `isPending` — you don't get the loading state feedback.

## Concurrency with Suspense

`useTransition` pairs naturally with Suspense. When transitioning to a view that suspends (e.g., lazy-loaded data), React holds the previous view until the data is ready, rather than showing a fallback spinner. This is the "keep the previous content during loading" pattern:

```javascript
function App() {
  const [tab, setTab] = useState('overview');
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <TabButtons onSelect={(t) => startTransition(() => setTab(t))} />
      <Suspense fallback={<Spinner />}>
        {/* If TabContent suspends, React keeps the old tab visible
            (showing isPending) rather than showing the Suspense fallback */}
        <TabContent tab={tab} />
      </Suspense>
    </>
  );
}
```

Without `startTransition`, switching to a suspending tab would immediately show the Suspense fallback (a jarring flash). With it, React shows the previous tab with a pending indicator until the new tab is ready, then swaps atomically.

## What You Can't Put in startTransition

Updates inside `startTransition` must be synchronous state updates. You can't directly wrap async operations:

```javascript
// ❌ Wrong — async code can't be inside startTransition
startTransition(async () => {
  const data = await fetchData(); // React can't track this
  setData(data);
});

// ✅ Correct — start the transition, then update state after async work
async function loadData() {
  const data = await fetchData();
  startTransition(() => {
    setData(data); // The state update is the transition
  });
}
```

The transition is about *rendering*, not about data fetching. Wrap the state update that causes the expensive render, not the data loading itself.

## Gotchas

### 1. Controlled inputs cannot be transitions

React won't let you make an input's controlled state a transition. Typing must be immediately responsive — React will ignore `startTransition` for controlled input values. Only put view-level transitions (switching tabs, navigating pages, toggling views) inside transitions.

### 2. isPending doesn't immediately become false

When the transition's state update completes, React doesn't set `isPending` to false immediately. It waits until the transition has been fully committed to the DOM. During concurrent rendering, React might restart the render multiple times (due to interruptions), and `isPending` correctly reflects that work is still happening.

### 3. Urgent updates win — which can cause unexpected behavior

If the user rapidly fires transitions, React may interrupt or discard earlier transition renders in favor of newer ones. This is the desired behavior (the user changed their mind), but be aware that transition state updates are not guaranteed to be processed in sequence — only the latest wins.

### 4. Not a replacement for debouncing

`useTransition` doesn't reduce *how often* state updates happen — it changes their *priority*. If you need to reduce update frequency (e.g., not re-rendering on every keystroke), use debouncing or `useDeferredValue`. If the expensive render happens immediately but you want it to be interruptible, use `useTransition`.

### 5. Transition renders can be observed in StrictMode

StrictMode double-invokes renders to find impure code. This is more apparent with transitions since they render asynchronously — you may see extra renders in development. This is expected and intentional.

## Interview Questions

**Q: What does `useTransition` actually do? What's different about state updates inside `startTransition`?**

Strong answer: Updates inside `startTransition` are tagged as low-priority, meaning React will render them concurrently — yielding to the browser between work units — instead of rendering them in one synchronous blocking burst. If higher-priority work arrives (user input, another urgent state update) while a transition is in progress, React pauses the transition render, handles the urgent work, and then resumes. `isPending` is true for the duration of the transition, so you can show intermediate UI without committing a partially-rendered state. The effect from the user's perspective: the UI stays responsive during expensive renders instead of freezing.

The trap: Describing it as "debouncing" or "delaying" the update. The update starts immediately — it just runs at lower priority and can be interrupted.

---

**Q: How does `useTransition` interact with Suspense?**

Strong answer: When you trigger a transition to a component that suspends, React keeps the previous content on screen (with `isPending: true`) instead of immediately showing the Suspense fallback. This avoids the jarring "flash to spinner" pattern. React waits until the new content is fully ready, then atomically commits it to the screen. Without `startTransition`, any Suspense boundary above a pending component would show its fallback immediately on navigation. This "concurrent + suspense" pattern is the designed way to do data-driven navigation in React 18+.

The trap: Not knowing about this interaction, which is one of the main motivations for transitions in real applications.

---

**Q: What's the difference between `useTransition` and `useDeferredValue`?**

Strong answer: They address the same underlying problem (keeping UI responsive during expensive renders) but from different angles. `useTransition` wraps a *state update* — you control when the low-priority update is dispatched. `useDeferredValue` wraps a *value* — React may defer showing the new value while the old value remains visible. Use `useTransition` when you control the update (button click, tab switch). Use `useDeferredValue` when you receive a value from outside (a prop, a context value) and want to defer the expensive rendering it triggers. The effects are similar; the deciding factor is whether you control the update or are reacting to one.

The trap: Treating them as interchangeable. The distinction is about where in the data flow you have control.

---

*Next: [useDeferredValue](12-use-deferred-value.md) — Deferring the rendering of expensive derived UI while keeping the input responsive.*
