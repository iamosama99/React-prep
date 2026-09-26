# Error Boundary Pattern

## Quick Reference

| Question | Answer |
|---|---|
| What does a boundary catch? | Errors thrown while **rendering**, in **lifecycle methods**, and in **constructors** of anything *below* it |
| What does it *not* catch? | Event handlers, async code (`setTimeout`, promises), SSR, and errors thrown *by the boundary itself* |
| Why a class? | Only class components can define `getDerivedStateFromError` / `componentDidCatch` — hooks have no equivalent |
| Where to place them? | Granularly: app root (last resort) → route → widget/feature. Blast radius = the boundary's subtree |
| How does it recover? | Reset state (`key` change, `resetKeys`, "Try again" button) so children re-mount |
| Where do errors go? | `componentDidCatch` / `onError` → logging service (Sentry, Datadog) with the component stack |

## Where You've Seen This Before

- The class mechanics: `getDerivedStateFromError` (render fallback) vs `componentDidCatch` (side effects), what's not caught → [Phase 3: componentDidCatch & error boundaries](../../phase-03-class-legacy/05-component-did-catch-error-boundaries/notes.md)
- Suspense/`use()` — the *other* half of the boundary story, which throws Promises → [Phase 11: Suspense for data fetching](../../phase-11-modern-react/03-suspense-data-fetching/notes.md), and this phase's [Topic 18](../18-suspense-fetching-pattern/notes.md)
- HOC wrapping is the usual way to add a boundary around a component → [Topic 6](../06-hof-and-hoc-pattern/notes.md)
- Focus/announcement on failure → [Focus management in SPAs](../../phase-13-tooling-security-a11y/08-focus-management-spas/notes.md), [ARIA roles](../../phase-13-tooling-security-a11y/07-aria-roles-labels/notes.md)
- Framework equivalents: React Router `errorElement`, Next.js `error.tsx` → [Phase 7](../../phase-07-routing/01-react-router-v6-basics/notes.md), [Phase 12](../../phase-12-ssr-frameworks/03-nextjs-app-router/notes.md)

**New here:** everything *design-level*: where to place boundaries, the reusable API (`fallbackRender`, `resetKeys`, `onReset`, `onError`), bridging errors that boundaries can't see (event handlers, async), recoverable vs fatal classification, the production checklist (logging, a11y, chunk-load failures), and React 19's root-level error hooks. Phase 3 taught the *mechanism*; this is the *pattern*.

## What Is This?

By default a JavaScript error thrown during rendering **unmounts the entire React tree** — the user sees a white screen. An **error boundary** is a component that catches errors thrown by its descendants during render, shows a fallback UI instead, and lets the rest of the app keep working.

```tsx
<ErrorBoundary fallbackRender={({ error, reset }) => <ChartError error={error} onRetry={reset} />}>
  <RevenueChart />        {/* if this throws while rendering, only this region is replaced */}
</ErrorBoundary>
<Sidebar />               {/* unaffected */}
```

It's `try/catch` for a subtree of the render output. The **pattern** is about *where* you put these and *what* they do: containment, communication, recovery.

> **Check yourself:** A `<Chart>` throws during render. Without a boundary, what does the user see? With a boundary around only `<Chart>`, what do they see, and what state elsewhere on the page survives?

## Why Does It Exist?

React's contract for render is that it produces UI from data. If a component throws mid-render, React can't know what UI is valid — continuing would show a half-updated, possibly corrupt tree (a wrong balance, a wrong user). Before React 16 errors left the UI in a corrupted state; React 16 chose **unmount everything** as the safe default and introduced boundaries as the way to opt into *partial* failure.

Production apps depend on third-party data and code. A missing field, a malformed API response, a bug in one widget shouldn't take down checkout. Boundaries give **fault isolation** — the same principle as bulkheads in ships and process isolation in operating systems.

## How It Works

### A reusable boundary

```tsx
type FallbackProps = { error: Error; reset: () => void };

type Props = {
  children: ReactNode;
  fallbackRender: (p: FallbackProps) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;      // logging
  onReset?: () => void;                                    // let the caller clean up (refetch, clear cache)
  resetKeys?: unknown[];                                   // auto-reset when these change
};

class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }        // render phase: switch to fallback

  componentDidCatch(error: Error, info: ErrorInfo) {                          // commit phase: side effects
    this.props.onError?.(error, info);                                        // info.componentStack
  }

  componentDidUpdate(prev: Props, prevState: { error: Error | null }) {
    // Only reset if we were ALREADY in an error state before this update; otherwise an error thrown
    // in the same update that changed resetKeys would be reset immediately and loop.
    if (prevState.error && changed(prev.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = () => { this.props.onReset?.(); this.setState({ error: null }); };

  render() {
    return this.state.error ? this.props.fallbackRender({ error: this.state.error, reset: this.reset }) : this.props.children;
  }
}
```

Two responsibilities are split deliberately: `getDerivedStateFromError` is **pure** (choose fallback), `componentDidCatch` is where **side effects** (logging) go.

In real projects use `react-error-boundary`, which provides exactly this API plus `useErrorBoundary`, `withErrorBoundary`, and battle-tested reset semantics.

### Recovery: reset by remounting

A boundary that shows an error forever isn't useful. Recovery = clear the error state so children mount again *from scratch*:

| Trigger | How |
|---|---|
| User clicks "Try again" | `reset()` from `fallbackRender` |
| Input that caused the error changed | `resetKeys={[userId]}` — auto-reset when the id changes |
| Navigation | Put a boundary per route, or key it by `location.pathname` |
| Data was refreshed | `onReset={() => queryClient.resetQueries()}` — reset the *cause*, not only the UI |

**Reset the cause, not just the UI.** If the error came from cached bad data, remounting will throw again and loop. `onReset` is where you clear/refetch.

### Boundaries don't see everything: bridging errors

Not caught: **event handlers**, **async code** (promises, timers), **SSR**, and **errors in the boundary itself**. Event handler errors don't break render, so React doesn't treat them as render failures — you handle them with `try/catch` and UI state. But when an async failure *should* replace the UI, **throw it during render** so the nearest boundary sees it:

```tsx
function useErrorBoundary() {
  const [, setState] = useState();
  return useCallback((error: unknown) => setState(() => { throw error; }), []);   // throw inside the updater → during render
}

function SaveButton() {
  const showBoundary = useErrorBoundary();
  return <button onClick={async () => { try { await save(); } catch (e) { showBoundary(e); } }}>Save</button>;
}
```

`setState(() => { throw … })` works because state updater functions run *during render*. (`react-error-boundary` ships this as `useErrorBoundary().showBoundary`.) Use it for **unrecoverable-in-place** failures; for expected failures (validation, 4xx) show inline UI instead — don't blow away the screen for a typo.

### Placement strategy — granular by design

```
<App>
  <ErrorBoundary fatal>                     ← last resort: "Something went wrong — reload"
    <Layout>
      <Sidebar />
      <Routes>
        <Route element={<ErrorBoundary route><Orders/></ErrorBoundary>} />   ← route-level: page error, nav still works
      </Routes>
      <Dashboard>
        <ErrorBoundary widget><RevenueChart/></ErrorBoundary>                ← widget-level: one card fails, the rest live
        <ErrorBoundary widget><ActivityFeed/></ErrorBoundary>
      </Dashboard>
    </Layout>
  </ErrorBoundary>
</App>
```

| Level | Fallback | Recovery |
|---|---|---|
| **App root** | Full-page "Something went wrong" + reload | Reload, report |
| **Route/page** | Page-level error with nav intact | Retry, "go home", `resetKeys` on route |
| **Widget/feature** | Small inline card: "Couldn't load chart — Retry" | Retry that remounts just this widget |
| **Third-party embed** | Silent fallback / hide | Log only |

Rule of thumb: **wrap things that can fail independently, and things whose failure the user can recover from without losing everything else.** Too few boundaries = large blast radius; too many = a wall of error cards and duplicated logging.

### Communicating the failure

- **Log** in `onError` with component stack, user/session, route, release — to Sentry/Datadog. React logs to the console in dev but nothing reaches your backend by default.
- **Tell the user** something actionable: what failed, what they can do (retry, contact, reload). No raw stack traces in production.
- **Accessibility:** the fallback should be announced (`role="alert"`) and, when it replaces the focused region, focus should move to it (or its heading), otherwise keyboard/screen-reader users are left on an unmounted node.
- **Classify:** recoverable (network blip → retry), fatal (invariant violated → reload), expected (404 → dedicated UI). Different fallbacks for each.

### Common specific boundaries

- **Chunk-load failures** (`lazy()` after a deploy invalidated hashes): boundary around lazy routes with "A new version is available — reload."
- **Suspense pairing:** `<ErrorBoundary><Suspense fallback>…</Suspense></ErrorBoundary>` — Suspense handles *pending*, the boundary handles *failed* ([Topic 18](../18-suspense-fetching-pattern/notes.md)).
- **HOC form:** `withErrorBoundary(Widget, { fallbackRender, onError })` to wrap third-party components without editing them.

### React 19 additions

`createRoot(el, { onCaughtError, onUncaughtError, onRecoverableError })` centralise error reporting for the whole app: *caught* errors are those handled by a boundary, *uncaught* are those that weren't. Duplicate console logs are also removed — React 19 reports each error once. Combined with per-boundary `onError`, you can log business context locally and infrastructure context globally.

## Gotchas

**Only class components can be boundaries.** No hook equivalent exists; use a class (or `react-error-boundary`). Function-component children are fine.

**A boundary can't catch its own errors.** An error in `fallbackRender` or the boundary's `render` propagates to the *next* boundary up. Keep fallbacks trivial and dependency-free.

**Event handlers and async errors are invisible to boundaries.** Use `try/catch` + UI state, or bridge with `showBoundary`. This is the most-asked interview trap.

**Dev overlay ≠ production.** In React 18 development, a caught error is also re-surfaced to the window (so CRA/Vite-style error overlays pop up even though your boundary handled it) — dismiss the overlay to see the fallback. Production shows only the fallback. React 19 stops re-throwing caught errors and reports them once through `onCaughtError`.

**Infinite error loops.** Resetting without changing the cause re-throws immediately. Reset data/state in `onReset`, or key the boundary by the thing that changed.

**Resetting on the same update that errors.** `resetKeys` comparison must only fire if the boundary was *already* in an error state, or an error in the update that changed the keys is instantly cleared.

**Swallowing errors.** A boundary that renders a fallback but doesn't log means production failures are invisible.

**Losing state.** Resetting remounts the subtree — local state inside is gone. That's usually desired, but lift state that must survive (a form draft) above the boundary.

**One boundary per app.** Any error nukes everything, defeating the pattern.

**Error boundaries and SSR.** Boundaries don't render fallbacks on the server for errors thrown there; with streaming SSR, a Suspense boundary can fall back to client rendering. Frameworks (`error.tsx`, `errorElement`) wire this for you.

**Testing.** Rendering a throwing child logs noisy `console.error`; silence it in the test (`jest.spyOn(console, 'error').mockImplementation()`), and assert on the fallback and on `onError` calls.

## Interview Questions

**Q (High): What is an error boundary, what does it catch, and what doesn't it catch?**

Answer: A class component with `getDerivedStateFromError` and/or `componentDidCatch` that catches errors thrown during rendering, in lifecycle methods and constructors of its descendants and renders a fallback instead of unmounting the whole tree. It does *not* catch errors in event handlers, asynchronous code (promises, timeouts), server-side rendering, or errors thrown by the boundary itself. For those, use `try/catch` and UI state, or bridge the error into render (`setState(() => { throw err })`) so a boundary can catch it.

The trap: Claiming error boundaries catch "all errors" or that you can write one with hooks.

**Q (High): Where would you place error boundaries in an application?**

Answer: Layered and granular. A root boundary as the last resort (full-page recovery/reload), a boundary per route so nav and shell survive a page failure, and boundaries around independently failing widgets (charts, feeds, third-party embeds) so one failure doesn't blank the page. Boundaries sit next to Suspense boundaries for data-loading regions. Too few makes the blast radius huge; too many produces noisy UI and duplicated logging, so I wrap things that can fail independently and be retried independently.

The trap: "One boundary at the top" or wrapping every component.

**Q (High): How do you recover from an error and avoid infinite loops?**

Answer: Reset the boundary's error state so children remount: a "Try again" button calling `reset`, auto-reset via `resetKeys` when an input (route/id) changes, or keying the boundary. Reset the *cause* too — `onReset` should clear/refetch the data that triggered the error — otherwise the remount re-throws immediately. Only compare `resetKeys` when the boundary was already in error, so an error in the same update doesn't get cleared.

The trap: Just clearing state and hoping. Also not knowing resetting remounts the subtree and discards local state.

**Q (High): An async `fetch` fails inside `onClick`. Will the error boundary catch it? What do you do?**

Answer: No — event handlers and promise rejections happen outside React's render. Handle with `try/catch`: for expected failures show inline error state (toast, field error). If the failure should replace the UI, bridge it into render by storing it in state and throwing it during render, or `setState(() => { throw error })` — which `useErrorBoundary().showBoundary` from `react-error-boundary` does — so the nearest boundary catches it.

The trap: Saying "wrap the handler in an error boundary" or ignoring the difference between expected and fatal failures.

**Q (Medium): How do you log errors from boundaries?**

Answer: In `componentDidCatch` / `onError`, send the error plus `info.componentStack` and context (route, user id, release, feature) to a monitoring service like Sentry. Keep `getDerivedStateFromError` pure. In React 19 also configure `onCaughtError`/`onUncaughtError` on `createRoot` for global reporting. Don't rely on the console — production users' errors never reach it.

The trap: Doing the logging inside `getDerivedStateFromError` (a side effect in the render phase), or not logging at all.

**Q (Medium): How do error boundaries and Suspense work together?**

Answer: They're complementary: Suspense handles the *pending* state (a thrown Promise / `use(promise)`), error boundaries handle the *rejected* state (a thrown Error). Standard composition: `<ErrorBoundary><Suspense fallback={<Skeleton/>}><DataView/></Suspense></ErrorBoundary>`. Retry resets the boundary and creates a fresh fetch (new promise) — otherwise the rejected promise re-throws again.

The trap: Forgetting that a cached rejected promise re-throws on retry.

**Q (Medium): What accessibility considerations apply to error fallbacks?**

Answer: Announce the failure (`role="alert"` or a live region), provide an actionable message, and manage focus: if the focused element was inside the region that got replaced, focus is lost, so move focus to the fallback heading or a retry button. Never expose raw stack traces to users.

The trap: Treating the fallback as purely visual.

**Q (Low): What changed in React 19 for error handling?**

Answer: `createRoot`/`hydrateRoot` accept `onCaughtError`, `onUncaughtError` and `onRecoverableError` for centralised reporting, and errors are no longer double-logged. Error boundaries themselves are still class components.

The trap: Believing hooks-based boundaries arrived.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can list what boundaries catch and don't catch, with the reason for each
- [ ] Can write a reusable class `ErrorBoundary` with `fallbackRender`, `onError`, `resetKeys`, `onReset`
- [ ] Can bridge an async/event-handler error into a boundary
- [ ] Can design a three-level boundary layout and justify each level's fallback and recovery
- [ ] Can explain why resetting needs to reset the *cause* and how resetKeys avoids loops
- [ ] Can list the production checklist: logging, accessible messaging, chunk-load handling, Suspense pairing

---
*Next: [Suspense Data-Fetching Pattern](../18-suspense-fetching-pattern/notes.md) — the other half of the pair: declaratively handling *loading* while the boundary handles *failure*.*
