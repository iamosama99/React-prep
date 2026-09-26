# Performance Patterns II — Compiler, Splitting, Virtualisation & Concurrency

## Quick Reference

| Technique | What it reduces | Reach for it when |
|---|---|---|
| **React Compiler** | Manual `memo`/`useMemo`/`useCallback` (auto-memoisation at build time) | You follow the Rules of React and want memoisation without the bookkeeping |
| **Code splitting** (`lazy` + `Suspense`) | JS shipped/parsed on first load | Heavy, rarely-used UI: routes, editors, charts, modals |
| **Render boundaries / isolation** | Blast radius of a state change | A fast-changing leaf (clock, input, drag) sits near a slow subtree |
| **Virtualisation** | DOM nodes and rendered components | Lists/tables with hundreds–thousands of rows |
| **Concurrency** (`useTransition`, `useDeferredValue`) | *Perceived* blocking — not total work | Input must stay responsive while a heavy render catches up |
| **Correct reconciliation** (keys, stable component identity) | Needless remounts and lost state | Always — it's a correctness *and* performance issue |

## Where You've Seen This Before

- Compiler-adjacent memoisation manually → [Topic 12](../12-performance-rerender-patterns/notes.md)
- `React.lazy`, `Suspense` boundaries, route-level splitting → [Phase 5: Code splitting](../../phase-05-performance/09-code-splitting/notes.md), [Lazy-loaded routes](../../phase-07-routing/06-lazy-loaded-routes/notes.md)
- Windowing → [Phase 5: List virtualisation](../../phase-05-performance/10-list-virtualization/notes.md); building an infinite list → [Phase 14: Infinite scroll](../../phase-14-live-coding/05-infinite-scroll/notes.md)
- `useTransition` / `useDeferredValue` mechanics and the concurrent renderer → [useTransition](../../phase-02-hooks/11-use-transition/notes.md), [useDeferredValue](../../phase-02-hooks/12-use-deferred-value/notes.md), [Concurrent rendering](../../phase-05-performance/15-concurrent-rendering/notes.md)
- Splitting/memoising context → [Context optimisation](../../phase-06-state-management/02-context-optimization/notes.md)
- Keys and the diff algorithm → [Virtual DOM & reconciliation](../../phase-05-performance/01-virtual-dom-reconciliation/notes.md), [Lists & keys](../../phase-01-fundamentals/07-lists-and-keys/notes.md)
- Measuring → [Profiler API & DevTools](../../phase-05-performance/11-profiler-api-devtools/notes.md), [Bundle analysis](../../phase-05-performance/12-bundle-analysis/notes.md), [Web vitals](../../phase-05-performance/14-web-vitals-react/notes.md)

**New here:** the **React Compiler** (not covered earlier), the *decision map* that matches a symptom to the right technique, **reconciliation pitfalls as performance bugs** (components defined inside components, unstable keys), and a from-scratch windowing calculation.

## What Is This?

[Topic 12](../12-performance-rerender-patterns/notes.md) was about **doing less rendering**. This topic is what you reach for when the tree *must* be large, the bundle *is* heavy, or the work *is* expensive. Four different levers, each attacking a different resource:

```
Bytes shipped       → code splitting
DOM nodes / renders → virtualisation, isolation
Main-thread priority→ concurrent features
Developer effort    → the React Compiler
```

Matching the lever to the bottleneck is the actual skill. A virtualised list won't fix a 3 MB bundle; code splitting won't fix an input that stutters.

> **Check yourself:** A page loads slowly (LCP 5s) *and* typing in a filter box janks. Which two different techniques would you apply, and what would you measure to prove each one worked?

## How It Works

### 1. The React Compiler

A build-time compiler (`babel-plugin-react-compiler`) that analyses your components and **inserts memoisation automatically** — at a finer granularity than you'd write by hand, including *after early returns* and for individual JSX elements.

```tsx
// You write
function Cart({ items, onCheckout }) {
  const total = items.reduce((s, i) => s + i.price, 0);
  return <Summary total={total} onCheckout={() => onCheckout(items)} />;
}
// The compiler emits (conceptually): total cached on `items`, the inline arrow cached on
// [onCheckout, items], and the <Summary/> element cached on [total, that arrow]
```

What it **relies on**: the *Rules of React* — pure render (no mutation of props/state/refs during render), hooks called unconditionally, immutable updates. If code breaks the rules, the compiler **skips that component** (bails out) rather than break it; ESLint (`eslint-plugin-react-compiler` / `react-hooks`) flags violations.

What it **doesn't do**: fix state that sits too high (Topic 12, rung 1), reduce bundle size, virtualise, or change algorithmic cost. It also doesn't add value if you were already memoising correctly — it removes the *effort* and the mistakes.

Adoption: opt in per-directory or with `compilationMode: 'annotation'` + `"use memo"`; opt a component out with `"use no memo"`. React DevTools marks compiled components (a "Memo ✨" badge). Practical guidance: don't rip out existing `useMemo`/`useCallback` en masse — they can remain, and some (like effect dependencies you rely on) are semantically meaningful.

### 2. Code splitting with `lazy` + `Suspense`

```tsx
const Chart = lazy(() => import('./Chart'));       // default export

<Suspense fallback={<ChartSkeleton />}>
  <Chart data={data} />                           {/* chunk downloads when first rendered */}
</Suspense>
```

Split by **route first** (users only pay for the page they visit), then by **heavy, conditional UI** (rich-text editor, charts, PDF viewer, admin panels, modals). Don't split tiny components — request overhead outweighs savings.

Patterns that make it feel good:

- **Prefetch on intent:** start the import on hover/focus or when the browser is idle so the click feels instant (`onMouseEnter={() => import('./Chart')}` — the module cache dedupes it).
- **Right-sized fallbacks:** skeletons matching the layout avoid layout shift (CLS).
- **Error boundary around the boundary:** chunk loads can fail (offline, deploy invalidated the hash). Wrap with an error boundary and offer retry / hard reload ([Topic 17](../17-error-boundary-pattern/notes.md)).
- **Avoid waterfalls:** a lazy component that then lazily loads data that then lazily loads another component serialises three round trips; hoist the fetch or preload together.
- **Named exports:** `lazy` wants `{ default }`: `lazy(() => import('./x').then(m => ({ default: m.Chart })))`.

### 3. Component isolation and render boundaries

Put **fast-changing state in leaf components** so its re-renders can't propagate: a `<LiveClock />`, a self-contained `<SearchInput />` that reports upward only on submit, a drag layer that updates its own transform. Combine with `memo` on *heavy* boundary components (a chart, a big table) whose props are stable. Give distinct concerns distinct contexts, or move hot state out of Context entirely into an external store with selectors ([Topic 8](../08-provider-pattern/notes.md), [Topic 11](../11-pub-sub-vs-observer/notes.md)).

### 4. Virtualisation (windowing)

Only render the rows in (and just around) the viewport; fake the rest with spacer space so the scrollbar is right.

```tsx
function useWindow({ count, itemHeight, height, overscan = 3 }: Opts) {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end   = Math.min(count, Math.ceil((scrollTop + height) / itemHeight) + overscan);
  return { start, end, totalHeight: count * itemHeight, offsetY: start * itemHeight, onScroll: (e: UIEvent<HTMLElement>) => setScrollTop(e.currentTarget.scrollTop) };
}
// render: <div style={{height, overflow:'auto'}} onScroll>
//           <div style={{height: totalHeight, position:'relative'}}>
//             <div style={{transform:`translateY(${offsetY}px)`}}>{rows.slice(start, end)}</div>
```

Use a library for real work (`@tanstack/react-virtual`, `react-window`) — they handle variable heights, horizontal/grid, dynamic measurement, and scroll restoration. Costs: `Ctrl+F` doesn't find off-screen rows, accessibility needs `aria-rowcount`/`aria-rowindex`, and rows must be cheap to mount. Cheaper alternatives first: **pagination**, "load more", or CSS `content-visibility: auto` for long static content.

### 5. Concurrency: `useTransition` and `useDeferredValue`

They **don't make work faster** — they change *priority*. React can start rendering a low-priority update, and if a high-priority one (a keystroke) arrives, **interrupt** the low-priority render and handle the urgent one first.

```tsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);              // lags behind while the list renders
const isStale = query !== deferredQuery;
<input value={query} onChange={e => setQuery(e.target.value)} />       {/* urgent: always instant */}
<HeavyList query={deferredQuery} style={{ opacity: isStale ? 0.6 : 1 }} />

// or mark the *state update* non-urgent:
const [isPending, startTransition] = useTransition();
onChange={e => { setText(e.target.value); startTransition(() => setFilter(e.target.value)); }}
```

Use `useDeferredValue` when you **receive** a value (props) and can't control the setter; `useTransition` when you **own** the state update. They work only if the slow part is a **render** (not, say, a synchronous 300 ms function in an event handler) and the expensive component is memoised so the deferred pass isn't repeated for the urgent one.

### 6. Reconciliation pitfalls (performance *and* correctness)

React matches old and new trees by **type and key**. Get it wrong and React unmounts/remounts instead of updating — destroying state, focus and DOM and re-doing work.

```tsx
// ✗ New component TYPE every render → whole subtree remounts on each parent render
function Parent() {
  const Inner = () => <input />;                 // defined inside
  return <Inner />;
}

// ✗ Unstable key → remount every render
items.map(i => <Row key={Math.random()} … />)

// ✗ Index key on a reorderable/filterable list → state attaches to the wrong row
items.map((i, idx) => <Row key={idx} … />)

// ✓ Component defined at module scope; keys are stable ids
```

Also: switching a wrapper element's type (`<div>` ↔ `<section>`) or conditionally wrapping (`cond ? <Wrap>{x}</Wrap> : x`) changes the tree shape and remounts `x`. Prefer keeping position and type stable, and use `key` deliberately to *force* a reset.

### 7. Measure with the right tool

| Question | Tool |
|---|---|
| Which components render, why, and how long? | React DevTools Profiler (flamegraph, ranked, "why did this render") / `<Profiler onRender>` |
| Is the main thread blocked? | Chrome Performance panel (long tasks) |
| How big is the bundle and what's in it? | Bundle analyser (`vite-bundle-visualizer`, `webpack-bundle-analyzer`) |
| Real-user impact | Web Vitals (LCP, INP, CLS) in RUM; Lighthouse for lab |

Always profile a **production build** — development mode is 2–10× slower and Strict Mode double-renders.

## Decision Map

| Symptom | First lever |
|---|---|
| Slow first load, large JS | Code splitting, tree-shaking, analyse the bundle |
| Typing/interaction jank with heavy render | Isolation → memo → `useDeferredValue` / `useTransition` |
| Scrolling a huge list is slow / DOM is huge | Virtualisation (or pagination) |
| Lots of `useMemo`/`useCallback` noise, bugs from missing deps | React Compiler |
| State resets / inputs lose focus unexpectedly | Reconciliation: component identity and keys |
| Everything re-renders on any context change | Split contexts / external store |

## Gotchas

**Compiler ≠ magic.** It bails out silently on rule violations; use the lint rule and DevTools badge to confirm what's compiled.

**Over-splitting.** Dozens of tiny chunks → request waterfalls and worse performance. Split at meaningful boundaries.

**Suspense fallback flicker.** Nested boundaries that resolve at different times cause spinner cascades; group related loads under one boundary or use `startTransition` to keep old UI visible.

**Virtualisation breaks assumptions.** Off-screen items aren't in the DOM: find-in-page, focus retention, `scrollIntoView`, and screen reader item counts all need explicit handling.

**Transitions don't speed up slow code.** A synchronous heavy function in an event handler still blocks; only *render* work is interruptible.

**Deferred value + un-memoised child.** If the expensive child isn't memoised it renders for the urgent value too, cancelling the benefit.

**Components defined inside components.** The classic accidental remount; often introduced by "just moving a helper into the render function."

**Profiling dev builds.** Misleading numbers; always confirm in production mode.

**Index keys "because it works."** Works until reorder/insert/filter — then state leaks between rows.

## Interview Questions

**Q (High): What does the React Compiler do, and what are its limits?**

Answer: A build-time compiler that analyses components and automatically memoises values, callbacks and JSX — finer-grained than manual `useMemo`/`useCallback`/`memo`, including after conditional returns. It depends on code following the Rules of React (pure render, no mutation, hooks unconditional); components that break the rules are skipped. It doesn't fix state placement, bundle size, list size or algorithmic cost, so structural fixes and virtualisation still matter. You adopt it incrementally (directory opt-in, `"use no memo"` escape hatch) and verify with the DevTools badge and lint rules.

The trap: "It makes React fast automatically" or "we can delete all memoisation." Neither is true.

**Q (High): How would you approach optimising a slow, list-heavy page?**

Answer: Measure first (Profiler for render cost, Performance panel for long tasks, bundle analyser for load). Then match lever to bottleneck: code split heavy routes/widgets; restructure state so typing doesn't re-render the list; virtualise if the row count is large; memoise row components with stable props (or rely on the compiler); use `useDeferredValue`/`useTransition` for responsiveness on expensive renders; check keys and component identity for accidental remounts. Verify improvements in a production build with before/after numbers.

The trap: A list of techniques with no diagnosis-first process.

**Q (High): What do `useTransition` and `useDeferredValue` actually do? Do they make things faster?**

Answer: No — they change priority. Updates in a transition, or renders driven by a deferred value, are low-priority and interruptible: if an urgent update (typing) arrives, React abandons the in-progress low-priority render and handles the urgent one first, so the UI stays responsive while the heavy render catches up. Total work isn't reduced. `useDeferredValue` is for values you receive; `useTransition` wraps updates you own and gives an `isPending` flag. The slow part must be a React render, and the heavy component should be memoised.

The trap: Claiming they "run in the background" or "reduce render time."

**Q (High): Why is defining a component inside another component's body a performance (and correctness) bug?**

Answer: Each parent render creates a new function, i.e. a new component *type*. Reconciliation compares types by identity; a different type means React unmounts the old subtree and mounts a fresh one — losing state, focus and DOM, and redoing all work, every render. Define components at module scope and pass data via props; if it needs closure data, pass it as props or use render-helper functions that *return JSX* rather than component types.

The trap: Attributing the symptom (input losing focus) to "React being buggy."

**Q (Medium): When is virtualisation not the right choice?**

Answer: When lists are modest (hundreds), when users need browser find-in-page or accessible full-list semantics, when row heights are highly dynamic and costly to measure, or when pagination/"load more" solves the problem more simply. Virtualisation adds complexity: scroll math, keyboard/focus handling, `aria-rowcount`/`aria-rowindex`, and scroll restoration. CSS `content-visibility: auto` is a cheap alternative for long static content.

The trap: Reflexively virtualising every list.

**Q (Medium): How do you make code splitting feel instant?**

Answer: Split at route and heavy-widget boundaries, use skeleton fallbacks that match layout to avoid CLS, prefetch the chunk on hover/focus/idle or when the route becomes likely, avoid data/component waterfalls by preloading together, and wrap in an error boundary with retry for chunk-load failures.

The trap: Splitting everything and paying request overhead, or leaving a blank/jumping fallback.

**Q (Medium): Why can index keys hurt performance and correctness?**

Answer: Keys tell React which element is which across renders. With index keys, inserting/removing/reordering shifts identities: React reuses the wrong component instance, keeping stale state (uncontrolled input values, expanded state) attached to a different item, and may update far more DOM than needed. Use stable unique ids. Index keys are acceptable only for static lists that are never reordered or filtered.

The trap: "It only matters for animations."

**Q (Low): How do you verify that a performance change actually helped?**

Answer: Baseline before with the same scenario in a production build: Profiler commit times/render counts, Performance panel long tasks and INP, bundle size and LCP. Make one change, re-measure, keep it only if the number moves. In production, confirm with real-user metrics.

The trap: Declaring victory from dev-mode feel.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain what the React Compiler does, what it requires, and what it can't fix
- [ ] Can write a `lazy` + `Suspense` split with prefetch-on-hover and an error boundary for chunk failures
- [ ] Can compute the visible window for a virtualised list (start, end, offset, total height)
- [ ] Can explain transitions/deferred values as *priority* changes and when they don't help
- [ ] Can name three reconciliation mistakes (nested component definition, unstable/index keys, tree-shape changes)
- [ ] Can match six symptoms to the right technique and name the measurement tool for each

---
*Next: [Slot Pattern](../14-slot-composition-pattern/notes.md) — back to component design: how to give callers named regions in a layout without a soup of props.*
