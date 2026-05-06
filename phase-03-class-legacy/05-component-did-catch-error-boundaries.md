# componentDidCatch & Error Boundaries

## What Is This?

An **error boundary** is a class component that catches JavaScript errors thrown anywhere in its child component tree during rendering, in lifecycle methods, and in constructors — and displays a fallback UI instead of crashing the whole app.

A class becomes an error boundary by implementing either or both of:
- `static getDerivedStateFromError(error)` — derives state to trigger the fallback render
- `componentDidCatch(error, info)` — logs the error to a reporting service

```js
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <PaymentForm />
</ErrorBoundary>
```

If `PaymentForm` (or any component inside it) throws, the `ErrorBoundary` catches the error, renders the fallback, and calls `componentDidCatch` for reporting — instead of crashing the entire React tree.

---

## Why Does It Exist?

Before error boundaries (pre-React 16), an unhandled error thrown in a component's render would leave the UI in a broken, inconsistent state with no recovery mechanism. The component tree was corrupted but still partially visible.

React 16 introduced a deliberate design decision: **an unhandled error in the render phase unmounts the entire tree**. The reasoning is that a corrupted UI is worse than no UI — showing an incorrect payment amount or broken account data is more dangerous than showing a crash screen. So React now aggressively unmounts everything.

Error boundaries are the opt-in recovery mechanism. They contain the crash to a subtree, allowing the rest of the app to continue functioning. Think of them like try/catch for render: the error propagates up through the component tree until it hits the nearest boundary, which contains it.

---

## How It Works

### The Two Methods

**`static getDerivedStateFromError(error)`**

Called during the render phase when a descendant throws. Must be static (pure, no side effects). Return state to trigger the fallback UI:

```js
static getDerivedStateFromError(error) {
  // Return state that causes the component to render the fallback
  return { hasError: true, error };
}
```

This runs synchronously before the browser paints. When it returns new state, React immediately re-renders the boundary with that state, showing the fallback instead of the broken subtree.

**`componentDidCatch(error, info)`**

Called during the commit phase, after the fallback has been rendered. Has access to `this` — use it for side effects like logging:

```js
componentDidCatch(error, info) {
  // info.componentStack is a string like:
  //   at PaymentForm (PaymentForm.js:42)
  //   at ErrorBoundary (App.js:10)
  Sentry.captureException(error, { extra: info });
}
```

### The Error Flow

When a component throws during render:

1. React unwinds the render, looking for the nearest error boundary above the throwing component
2. `getDerivedStateFromError` fires on that boundary (still in the render phase)
3. React re-renders the boundary with the new state → shows the fallback
4. `componentDidCatch` fires (commit phase) — log, report, track
5. Components outside the boundary are unaffected

If no error boundary catches the error, React unmounts the entire root.

---

## What Error Boundaries Can and Cannot Catch

**Can catch:**
- Errors thrown in `render()`
- Errors thrown in class lifecycle methods
- Errors thrown in constructors of child components

**Cannot catch:**
- Errors in event handlers (use try/catch there — event handlers don't run in React's rendering control flow)
- Errors in async code (`setTimeout`, `fetch` callbacks, async functions)
- Errors in the error boundary itself
- Server-side rendering errors

```js
// NOT caught by an error boundary
function Button() {
  const handleClick = () => {
    throw new Error('oops'); // React doesn't catch this — it's in an event handler
  };
  return <button onClick={handleClick}>Click</button>;
}

// IS caught by an error boundary
function BrokenComponent() {
  throw new Error('oops'); // this runs during render — caught
  return <div />;
}
```

For event handler errors, you need explicit try/catch and local state to show fallback UI:

```js
function Button() {
  const [error, setError] = useState(null);

  const handleClick = async () => {
    try {
      await doSomethingRisky();
    } catch (err) {
      setError(err);
    }
  };

  if (error) return <p>Error: {error.message}</p>;
  return <button onClick={handleClick}>Click</button>;
}
```

---

## Why Error Boundaries Must Be Class Components

React has never added hook equivalents for `getDerivedStateFromError` and `componentDidCatch`. The stated reason: these methods need to work in the render phase and commit phase with specific semantics that don't map cleanly onto the hooks model.

The practical reason: error handling in the render phase needs to be synchronous and must influence the current render cycle. The hooks model is built around scheduling — `useState` setters are asynchronous by design and won't influence the render that just failed.

There are community wrappers (like the `react-error-boundary` package) that give you a hook-friendly API, but they use a class component underneath:

```js
// react-error-boundary package
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={(error, info) => logError(error, info)}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

Even in 2026, if you need error boundaries, you're touching a class component — either writing one yourself or using a library that does it for you.

---

## Placement Strategy

Error boundaries can be placed at any level of the tree. The granularity is a product decision:

**Coarse (one boundary at the root):**
```
<ErrorBoundary>
  <App />
</ErrorBoundary>
```
Catches everything but shows one giant fallback. The whole app breaks on any render error.

**Medium (per major section):**
```
<ErrorBoundary fallback={<DashboardError />}>
  <Dashboard />
</ErrorBoundary>
<ErrorBoundary fallback={<SidebarError />}>
  <Sidebar />
</ErrorBoundary>
```
A broken dashboard doesn't take down the sidebar. Recommended for most apps.

**Fine-grained (per widget):**
```
{widgets.map(widget => (
  <ErrorBoundary key={widget.id} fallback={<WidgetError />}>
    <Widget {...widget} />
  </ErrorBoundary>
))}
```
Maximum isolation — a single broken widget doesn't affect others. Good for dashboards and feeds.

---

## Recovering from Errors

By default, error boundaries just show a fallback forever. You can add a reset mechanism:

```js
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logError(error, info);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <p>Something went wrong.</p>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

When the user clicks "Try again," the boundary resets its state and attempts to render the children again. If the underlying problem is fixed (e.g., it was a transient network error), the UI recovers.

---

## Gotchas

**Errors in `componentDidCatch` are not caught.** The error boundary can't catch its own errors. If logging throws (e.g., your analytics service is down), you get an uncaught error at the root.

**Event handler errors are invisible to error boundaries.** This is the most common misconception. Event handlers don't run during React's render pipeline — they run later, in response to browser events. React has no control over them and can't intercept their throws.

**In StrictMode during development, `componentDidCatch` fires twice.** React intentionally double-invokes render-phase methods in development. This means your error reporting service may see duplicate events during local development. This is normal and doesn't happen in production.

**Async errors in `useEffect` are not caught by boundaries.** Errors thrown inside `useEffect` callbacks (including async ones) are not render errors — they propagate as unhandled exceptions, not through React's error boundary mechanism.

**Error boundaries don't reset when the error source is fixed.** If the broken component updates its props and is now renderable, the boundary still shows the fallback until you explicitly reset it. The boundary has no way to know the underlying issue is resolved.

**`getDerivedStateFromError` and `componentDidCatch` can both coexist on the same class.** Use `getDerivedStateFromError` to update state and trigger the fallback. Use `componentDidCatch` to log. They serve different purposes at different phases.

---

## Interview Questions

**Q (High): What is an error boundary in React, and why must it be a class component?**

Answer: An error boundary is a React component that catches errors in its child subtree during render, in lifecycle methods, and in constructors — and renders a fallback UI instead of crashing. It's implemented by overriding `getDerivedStateFromError` (to update state during the render phase) and/or `componentDidCatch` (to log errors during the commit phase). It must be a class component because React has never provided hook equivalents for these methods — the error handling mechanism needs to intercept and redirect a failed render synchronously, which doesn't fit the asynchronous, scheduled nature of hooks. In 2026, this remains the one category of React functionality that hooks cannot replace.

The trap: saying hooks "can't handle errors." They can (try/catch in event handlers, `useEffect` for async errors). What hooks can't do is intercept synchronous render errors the way `getDerivedStateFromError` does.

---

**Q (High): What kinds of errors do error boundaries NOT catch?**

Answer: Three categories. First, errors in event handlers — they don't run in React's render pipeline, so React can't intercept them. Use try/catch inside the handler and setState to show local error UI. Second, errors in asynchronous code — `setTimeout` callbacks, promises, `async/await` in effects. These errors propagate outside React's control and must be caught explicitly. Third, errors in server-side rendering — SSR has its own error handling mechanism. And critically, error boundaries don't catch errors in themselves — an error in the boundary's own `render` propagates up to the next boundary.

---

**Q (Medium): How do you let a user recover from an error boundary showing its fallback?**

Answer: Add a reset mechanism to the boundary's state. The fallback UI renders a "Try again" button that calls `this.setState({ hasError: false })` on the boundary. This clears the error state, causing the boundary to attempt rendering its children again. If the error was transient (network blip, race condition), the retry succeeds and the UI recovers. If the error is deterministic, it throws again and the fallback re-appears. Libraries like `react-error-boundary` provide this via a `resetKeys` prop — when any of the specified values change, the boundary automatically resets, which handles cases like navigating to a new route after an error.

---

**Q (Medium): Where should you place error boundaries in your component tree?**

Answer: It depends on the desired isolation. One boundary at the root is the minimum viable safety net — it prevents total white-screens but takes down the entire UI on any render error. The better pattern is per major section: wrap dashboard, sidebar, and header in separate boundaries so a broken widget doesn't take down navigation. In widget-heavy UIs (feeds, dashboards), per-widget boundaries give maximum isolation. The guiding question is: "If this subtree breaks, what else should still work?" Everything that should remain functional needs to live outside the failing boundary.

---

**Q (Low): What is the `info` object passed to `componentDidCatch`, and what does it contain?**

Answer: It's an object with one field: `componentStack` — a string representation of the component tree at the point of the error. It looks like a stack trace but shows component names and their source file/line (in development). It's invaluable for debugging because it tells you exactly which component in which tree threw the error, which the JavaScript error stack alone doesn't tell you. This is what you pass to error monitoring services like Sentry or Datadog alongside the error itself.

---

*Next: this binding in class methods — the last piece of the class component puzzle, and why this became one of the most common JavaScript interview questions in the React era.*
