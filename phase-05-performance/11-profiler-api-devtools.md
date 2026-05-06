# Profiler API & DevTools Profiler

## What Is This?

React exposes two complementary profiling tools:

1. **`<Profiler>` component** — a programmatic API for measuring render performance in code. It fires a callback with timing data every time a component subtree commits.

2. **React DevTools Profiler tab** — a browser extension UI for recording and visually inspecting render performance. It shows a flame graph of which components rendered, how long each took, and why they rendered.

Both are production-grade measurement tools. The DevTools Profiler is what you reach for when debugging an unknown performance problem. The `<Profiler>` API is what you reach for when you want to measure and report performance metrics from real user sessions.

---

## The `<Profiler>` Component

### Basic usage

```js
import { Profiler } from 'react';

function onRenderCallback(
  id,           // the "id" prop on <Profiler>
  phase,        // "mount" or "update"
  actualDuration,  // time spent rendering the committed update (ms)
  baseDuration,    // estimated time to render without memoization (ms)
  startTime,    // when React started rendering (performance.now() timestamp)
  commitTime,   // when React committed the update
) {
  console.log({ id, phase, actualDuration, baseDuration });
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

### The callback parameters explained

**`actualDuration`** — the time React actually spent on this render. This is the most important number: if it's high, the render is slow. If memoization is working well, this will be much smaller than `baseDuration`.

**`baseDuration`** — the estimated time to render this subtree with no memoization at all (i.e., every component rendered). It represents the "worst case" baseline.

**`baseDuration - actualDuration`** — the time saved by memoization. If these are close, your memoization isn't helping much.

**`phase`** — `"mount"` on first render, `"update"` on re-renders. Track them separately: a slow mount is a different problem from slow updates.

### Measuring real user performance

The `<Profiler>` API works in production builds (unlike some other debug utilities). Use it to send performance data to your monitoring service:

```js
function onRenderCallback(id, phase, actualDuration) {
  if (actualDuration > 50) {
    // Send slow render to monitoring
    analytics.track('slow_render', { component: id, phase, duration: actualDuration });
  }
}
```

You can nest `<Profiler>` components to measure specific subtrees independently:

```js
<Profiler id="App" onRender={onRender}>
  <Profiler id="Sidebar" onRender={onRender}>
    <Sidebar />
  </Profiler>
  <Profiler id="Main" onRender={onRender}>
    <Main />
  </Profiler>
</Profiler>
```

---

## React DevTools Profiler

The DevTools Profiler is the browser-based performance recorder. Install the React Developer Tools browser extension, then open DevTools → Profiler tab.

### Recording a session

1. Click the record button (circle icon) in the Profiler tab
2. Interact with the UI — perform the action you want to profile (click a button, type in a field, navigate a route)
3. Click stop
4. Inspect the results

### Reading the flame graph

The flame graph shows one "commit" per bar at the top. Each commit is a single DOM update (one render phase + commit phase). Clicking a commit shows the flame graph for that commit:

- Each horizontal bar is a component
- Bar width = time spent rendering that component
- Color indicates relative render time (yellow = slower, green = faster, gray = not rendered in this commit)
- Components that didn't render in this commit are shown as gray with a dotted border

```
Commit 3 (12.3ms)
├── App          [1.2ms]
│   ├── Header   [0.4ms]  ← gray (didn't render)
│   └── Main    [10.7ms]  ← yellow (slow)
│       ├── Sidebar [1.1ms]
│       └── List    [9.6ms]  ← hot component
│           └── Row × 50 [0.2ms each]
```

### "Why did this render?"

Enable "Record why each component rendered" in DevTools settings. After profiling, click any component in the flame graph to see the reason:

- "Props changed" — lists which specific props changed
- "State changed" — the component's own state changed
- "Context changed" — a subscribed context changed
- "Hooks changed" — a hook returned a new value
- "Parent rendered" — no own change; re-rendered because a parent did

The "parent rendered" reason on a component you expected to be memoized is a diagnostic signal — something is breaking the memo bailout.

### The ranked chart

The Profiler tab also offers a "ranked" view that lists all components rendered in a commit, sorted by render duration from slowest to fastest. This is the fastest way to find the hottest component in a large render.

---

## What to Look For

**Commits that are too frequent:**
In the top bar, each rectangle is a commit. If you see 20 commits for a single button click, components are re-rendering more than they should. Look for the root cause in the "parent rendered" chains.

**Components with wide bars:**
Wide bars in the flame graph indicate time-consuming renders. Click the component to see its props in the right panel — check if any are unnecessary.

**Memoization not working:**
`actualDuration ≈ baseDuration` means memoization is saving nothing. Check for inline object/function props defeating memo.

**Waterfall renders:**
A tall, thin flame graph where each level is a small sequential commit suggests a render cascade (setState in effect triggers another render). Flatten these with `useReducer` or by rethinking the effect.

---

## `useDebugValue` for Custom Hooks

When profiling a component that uses custom hooks, the DevTools show the hook's returned value in the component's hook list. `useDebugValue` lets you add a custom label:

```js
function useUserStatus(userId) {
  const [status, setStatus] = useState('offline');

  // Without useDebugValue: DevTools shows "State: offline"
  // With useDebugValue: DevTools shows "UserStatus: offline"
  useDebugValue(status === 'online' ? 'Online' : 'Offline');

  // ...
  return status;
}
```

This only shows in development DevTools — no production cost.

---

## Gotchas

**1. The `<Profiler>` component has a small performance overhead itself.**

Even though it works in production, profiling isn't free. Use it for targeted measurement, not permanently on every component in production.

**2. DevTools Profiler only works in development builds.**

The development build of React includes the profiling instrumentation hooks. The production build strips most of them out for size. You can use the special `react-dom/profiling` build to profile production React, but it has overhead and is used for targeted investigations, not monitoring.

**3. `actualDuration` measures React render time, not browser layout time.**

If a component's render is fast (small `actualDuration`) but scrolling is still janky, the bottleneck is DOM layout and paint, not React. Use the browser's Performance tab and Layer panel for those issues.

**4. The flame graph shows render time, not total commit time.**

Commit time includes applying DOM mutations. A component with a fast React render but heavy DOM mutation may show a small flame graph bar but still cause a long commit. Look at the total commit time at the top of the Profiler, not just component bars.

**5. Strict Mode double-invokes renders in development.**

`React.StrictMode` calls your component function twice during development to detect side effects. DevTools Profiler shows only the second invocation's timing. This means the profiled durations in development are roughly doubled compared to production — use the ranked chart for relative comparisons within a session, not for absolute production estimates.

---

## Interview Questions

**Q (High): What is the React `<Profiler>` component and when would you use it over the DevTools Profiler?**

Answer: The `<Profiler>` component is a programmatic API that fires a callback with timing data on every commit within its subtree — `actualDuration`, `baseDuration`, `phase` (mount/update), and timestamps. It works in production. The DevTools Profiler is a browser extension for interactive recording and visual inspection — flame graphs, ranked views, "why did this render" annotations. Use DevTools Profiler when debugging an unknown performance problem in development — it gives the full visual picture fast. Use the `<Profiler>` API when you need to monitor render performance from real user sessions (RUM), log slow renders to an analytics service, or run performance assertions in CI. Both measure the same thing; the choice is interactive-visual vs programmatic-production.

---

**Q (High): You open the React DevTools Profiler and see that a component shows "Parent rendered" as its render reason. What does this mean and what would you do?**

Answer: "Parent rendered" means the component had no changes to its own state, props, or context — it re-rendered only because a parent re-rendered. This is often harmless for cheap components, but if the component is expensive, it's a candidate for `React.memo`. To fix: (1) Wrap the component in `React.memo` to add a prop comparison gate. (2) Ensure the parent passes stable references — if any prop is an inline object or function, memo will fail even with the wrapper. (3) Consider structural fixes — can the changing state be pushed down, away from this component's parent? Start with the "why did this render" info to know which prop React thinks changed.

---

**Q (Medium): What is `baseDuration` vs `actualDuration` in the Profiler callback and what can the difference tell you?**

Answer: `baseDuration` is the estimated time to render the subtree if every component re-rendered — no memo bailouts, no skip. `actualDuration` is the time actually spent — only the components that did render. The gap (`baseDuration - actualDuration`) is the time saved by memoization. If `actualDuration ≈ baseDuration`, memoization is saving nothing — every component in the tree is rendering. If `actualDuration` is much smaller, memo is working. A high `baseDuration` with a low `actualDuration` is a healthy profile for a large tree with good memoization. A high `actualDuration` on a small `baseDuration` subtree means the renders themselves are expensive.

---

**Q (Low): How do you profile a React app in production?**

Answer: Two options. First, the `<Profiler>` component — it works in production builds with a small overhead. Place it around the subtrees you care about, log slow renders to your monitoring service, and remove or disable it when not needed. Second, use the `react-dom/profiling` bundle instead of `react-dom` in your production build. This is a version of React that includes the profiling instrumentation hooks, allowing the DevTools Profiler to connect to a production build. It's heavier than the normal production build and is used for targeted investigations (e.g., "reproduce the exact slow render from a user report") rather than always-on monitoring.

---

*Next: Bundle Analysis — the Profiler measures runtime render performance; bundle analysis measures the static cost of your JavaScript before any rendering happens. Understanding what's in your bundle and why is the other half of frontend performance work.*
