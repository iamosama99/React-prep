# StrictMode

## What Is This?

`React.StrictMode` is a development-only tool that activates extra checks and warnings for its descendant components. It renders nothing in the DOM — it's a wrapper that tells React to run in a stricter mode for catching bugs.

```jsx
import { StrictMode } from 'react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

StrictMode has no effect in production builds. All its behavior is stripped at build time.

## Why Does It Exist?

React's concurrent mode (React 18+) changed how React can render: renders can be interrupted, restarted, and run multiple times. This revealed bugs in code that assumed renders and effects run exactly once in order — a safe assumption in the synchronous rendering model but not in concurrent rendering.

StrictMode simulates these concurrent behaviors in development to surface bugs *before* you turn on real concurrent features. Think of it as a stress test: if your code breaks under StrictMode, it will break in production under concurrent rendering.

The specific behaviors it enables are designed to catch the most common categories of concurrent-mode bugs.

## What StrictMode Does

### 1. Double-invokes render functions and state initializers

In React 18 (with concurrent features), React may render a component, throw away the result, and render it again. StrictMode simulates this by calling your component function (and `useState` initializers, `useMemo`, `useReducer`) **twice** in development.

```jsx
function Component() {
  console.log('render'); // logs twice in StrictMode dev
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

If your render has side effects — mutating a variable, logging, modifying an external store — they'll run twice and you'll see the bug:

```jsx
let renderCount = 0;

function BuggyComponent() {
  renderCount++; // BUG: runs twice, count is wrong
  return <div>Rendered {renderCount} times</div>;
}
```

Renders must be pure — same inputs, same output, no side effects. StrictMode enforces this.

### 2. Double-invokes effects (mount/unmount/remount)

In React 18 StrictMode, every `useEffect` and `useLayoutEffect` runs through a full mount → unmount → remount cycle in development:

1. Component mounts → effects run
2. Component unmounts → cleanup runs
3. Component remounts → effects run again

This simulates React's planned "Offscreen" feature (components preserved in memory while hidden). If your effects don't clean up properly, the double-invocation reveals it:

```jsx
// Bug revealed by StrictMode
useEffect(() => {
  window.addEventListener('keydown', handler);
  // No cleanup → listener is added twice after remount
}, []);

// Fixed
useEffect(() => {
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

The rule: if your effect adds something, your cleanup must remove it. If your effect creates a subscription, cleanup must unsubscribe. StrictMode makes violations visible as double listeners, double API calls, and doubled state mutations.

### 3. Warns about deprecated APIs

StrictMode surfaces warnings for:
- `findDOMNode` (deprecated)
- Old-style string refs (`ref="myRef"`)
- Legacy Context API (`childContextTypes`)
- `componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate` (the UNSAFE_ lifecycle methods)

These APIs have known problems in concurrent mode and are on the deprecation path.

### 4. Warns about `act()` violations in tests

If you update state outside of `act()` in tests, StrictMode makes this warning louder and more consistent.

## Double-Invocation in Practice

The most common question: "My API call fires twice — is that StrictMode?"

Yes. The effect runs, fires the request, then the cleanup runs (optionally cancelling it), then the effect runs again. In development this gives you two requests.

The correct response is not to remove StrictMode — it's to write the effect correctly:

```jsx
useEffect(() => {
  let cancelled = false;
  
  fetchUser(userId).then(user => {
    if (!cancelled) setUser(user);
  });
  
  return () => { cancelled = true; };
}, [userId]);
```

After the first invocation completes and cleanup sets `cancelled = true`, the second invocation starts a fresh request. The first request's result is ignored (cancelled). In production (no double-invocation), the cancellation flag is never needed but doesn't hurt. Code written this way is correct in both modes.

If you're using React Query or SWR, they handle deduplication and cancellation internally — you don't need to worry about it.

## What StrictMode Does NOT Do

- It does not affect production behavior
- It does not slow down production builds
- It does not double-invoke lifecycle methods on class components (only function components are double-invoked in React 18)
- It does not change props, state, or any data — the extra renders are thrown away before committing to the DOM

The double render is a phantom — React discards the first render's side effects (for pure functions without external mutations, there are none). The second render's result is what gets committed.

## StrictMode and Third-Party Libraries

Some older libraries break under StrictMode because they assume effects run exactly once. Examples include:

- Animation libraries that initialize timelines in `useEffect` without cleanup
- Singleton patterns that set global state in effects
- Libraries that assume `componentDidMount` fires once

This is the library's bug, not yours. Proper cleanup in `useEffect` means the library can run correctly under double-invocation. When evaluating libraries, StrictMode compatibility is a signal of code quality.

## Should You Use It?

Yes, always. In every project. From day one.

The bugs StrictMode catches are exactly the bugs that cause subtle, hard-to-reproduce production issues in concurrent mode. The double-invocation is annoying in development until your effects are correctly written, at which point it becomes invisible. The warning signals are high signal-to-noise.

Turn it off only as a temporary debugging tool — "is this bug caused by StrictMode behavior?" — not as a permanent decision.

## Gotchas

**StrictMode's double-invocation only applies in React 18.** In React 16 and 17, StrictMode double-invokes renders but not effects. The effect double-invocation was added in React 18.

**`console.log` appears to fire twice.** React actually suppresses the second duplicate `console.log` in React 18 (only the first and last show). If you see repeated logs, it's because your component function truly runs twice or you have a console call outside the render path.

**Removing StrictMode to fix a bug is almost always wrong.** If your code breaks under StrictMode, it will break in production under concurrent rendering. StrictMode is revealing a real bug. Fix the code.

**State updates from the second (discarded) render don't persist.** React throws away the first render's effects. Any state set by side effects in the discarded render is not reflected in the final committed output.

**Using refs to track "first render" to skip StrictMode double-invocation is a code smell:**

```jsx
// Do not do this
const didInit = useRef(false);
useEffect(() => {
  if (didInit.current) return;
  didInit.current = true;
  expensiveOneTimeSetup();
}, []);
```

This works but defeats the purpose of StrictMode. If `expensiveOneTimeSetup` isn't idempotent and needs cleanup, write the cleanup. If it's truly a one-time initialization, it belongs in module scope, not in an effect.

## Interview Questions

**Q (High): What does StrictMode actually do in React 18, and why?**

Answer: In React 18, StrictMode does three main things in development: it double-invokes component render functions (to catch side effects in render); it runs effects through a full mount/unmount/remount cycle (to reveal missing cleanup and simulate concurrent React's ability to unmount and remount components); and it warns about deprecated APIs. All of this is stripped in production. The reason is concurrent rendering — React 18 introduced features where components can render multiple times and effects can be torn down and re-run. StrictMode simulates these behaviors in development to surface bugs that would otherwise only appear in production under concurrent features.

The trap: Saying "it catches bugs" without explaining *what kind* of bugs or *why* the double-invocation specifically catches them.

**Q (High): My API call fires twice in development. What's happening and what should I do?**

Answer: StrictMode is double-invoking the effect to simulate concurrent React's mount/remount cycle. The fix is not to remove StrictMode — it's to write the effect with proper cleanup. Use an `isCancelled` flag or an `AbortController` to cancel the in-flight request when the cleanup function runs. The first invocation's request is cancelled by the cleanup, and the second invocation starts a fresh request. In production (no double-invocation), the cleanup is called only on unmount, so the request completes normally. Code written this way is correct in both environments. If you're using React Query or SWR, they handle this internally.

The trap: "Remove StrictMode" or "use a ref to track first render." Both suppress the symptom without fixing the underlying issue.

**Q (Medium): Does StrictMode affect class components and hooks differently in React 18?**

Answer: In React 18, the effect double-invocation only applies to function components (useEffect, useLayoutEffect). Class component lifecycle methods (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`) are not double-invoked. However, class component render methods are still double-invoked (a behavior from earlier StrictMode versions). This is partly because class components with proper lifecycle implementation are already expected to handle mount/unmount gracefully, and partly because effects are the primary mechanism in the concurrent world.

The trap: Assuming StrictMode behaves identically for class and function components.

**Q (Low): Is StrictMode useful in a project that doesn't use React 18's concurrent features?**

Answer: Yes. Even without explicitly using `startTransition`, `useDeferredValue`, or Suspense, React 18's rendering can use concurrent scheduling under the hood. More importantly, StrictMode catches incorrect patterns that will matter more as you adopt more React 18 features and as the ecosystem moves toward concurrent-safe code. The warnings about deprecated APIs are also valuable regardless of concurrent mode usage. Running StrictMode from day one means these bugs never accumulate in the first place.

---
*Next: Polymorphic Components — building components that can render as different HTML elements or other components, a key pattern in design system work.*
