# Performance Patterns I — Re-renders & Memoisation

## Quick Reference

| Symptom | Real cause | Pattern (in order of preference) |
|---|---|---|
| Typing in one input lags the whole page | State lives too high; every keystroke re-renders siblings | **Colocate state** → **lift content up** (`children`) → `memo` |
| Memoised child still re-renders | A prop's *identity* changes every render (inline object/function) | `useCallback` / `useMemo` / hoist constants |
| Extra render after every prop change | `useEffect(() => setX(f(props)), [props])` | **Derive during render**; `useMemo` if expensive; `key` to reset |
| Handler fires 60×/s (search, scroll, resize) | Work runs per event | **Debounce** (wait for pause) / **Throttle** (cap rate) |
| Expensive calculation runs every render | Recomputed unconditionally | `useMemo` — *after* measuring |

## Where You've Seen This Before

This topic is the **decision ladder** that ties together five earlier topics. The mechanics live there; here you learn the order in which to try things.

- What triggers a render (state, parent, context) → [Phase 5: What causes re-renders](../../phase-05-performance/04-what-causes-rerenders/notes.md)
- `React.memo` internals and its shallow comparison → [React.memo deep dive](../../phase-05-performance/05-react-memo-deep-dive/notes.md)
- Fixes that need no memo at all (colocation, `children` as props) → [Avoiding re-renders without memo](../../phase-05-performance/06-avoiding-rerenders-without-memo/notes.md)
- Why inline objects/functions break memoisation → [Inline objects/functions in JSX](../../phase-05-performance/07-inline-objects-functions-jsx/notes.md)
- `useMemo` / `useCallback` semantics → [useMemo](../../phase-02-hooks/06-use-memo/notes.md), [useCallback](../../phase-02-hooks/07-use-callback/notes.md)
- Debounce/throttle implementations under interview conditions → [Phase 14: useDebounce & useThrottle](../../phase-14-live-coding/01-use-debounce-throttle/notes.md)
- Measuring before fixing → [Profiler API & DevTools](../../phase-05-performance/11-profiler-api-devtools/notes.md)

**New here:** the *sequence* — measure → restructure → derive → memoise → rate-limit — and the reasoning for why each rung comes before the next; the identity-chain diagnosis; derived-state anti-patterns; and a reusable `useDebouncedCallback`.

## What Is This?

Performance work in React is not "wrap everything in `memo`." It's a **ladder**: try the cheapest, least invasive fix first, and only climb when measurement says you must.

```
0. Measure          Profiler / why-did-you-render — is there actually a problem?
1. Do less work     Colocate state, lift content up (children), split components
2. Don't store what you can compute   Derive during render; key to reset
3. Skip work        memo + stable props (useCallback/useMemo), hoist constants
4. Rate-limit       Debounce / throttle event-driven work; defer non-urgent renders
```

Each rung removes a *cause*, not a symptom. Memoisation (rung 3) is a fix for a cascade you couldn't restructure away — not a default.

> **Check yourself:** Why does "colocate state" appear before `React.memo` on the ladder? What does each cost in code complexity and in ongoing maintenance?

## Why Does It Exist?

React's rule is simple and conservative: **when a component re-renders, all of its children re-render** unless told otherwise. Re-rendering is *calling your function* and diffing — cheap for small trees, expensive when a subtree is large, a component does heavy work, or an event fires dozens of times per second. Problems appear when a **fast-changing value sits above a slow subtree** — a text input's value above a 2,000-node table, mouse position above a chart.

The fix is to break that coupling; the ladder orders the ways to do it from "structural and free" to "explicit and fragile."

## How It Works

### Rung 1 — Do less work: colocate and lift content up

```tsx
// ✗ color changes re-render <SlowTree> every time
function Page() {
  const [color, setColor] = useState('teal');
  return (<div><ColorPicker value={color} onChange={setColor} /><p style={{ color }}>Hi</p><SlowTree /></div>);
}

// ✓ Colocate: state lives with the only things that use it
function Page() { return (<div><ColorSection /><SlowTree /></div>); }
function ColorSection() {
  const [color, setColor] = useState('teal');
  return (<><ColorPicker value={color} onChange={setColor} /><p style={{ color }}>Hi</p></>);
}

// ✓ Lift content up: state wrapper receives the slow part as children
function ColorScope({ children }: { children: ReactNode }) {
  const [color, setColor] = useState('teal');
  return (<div style={{ color }}><ColorPicker value={color} onChange={setColor} />{children}</div>);
}
<ColorScope><SlowTree /></ColorScope>
```

Why `children` works: `<SlowTree />` is created by *Page*, which doesn't re-render. `ColorScope` re-renders, but the `children` prop is the *same element object* as before; React sees an identical element reference and bails out. No `memo`, no hooks.

### Rung 2 — Derive, don't sync

```tsx
// ✗ two renders per query change, plus a frame where `filtered` is stale
const [filtered, setFiltered] = useState(items);
useEffect(() => setFiltered(items.filter(i => i.name.includes(query))), [items, query]);

// ✓ compute in render — always consistent, one render
const filtered = items.filter(i => i.name.includes(query));

// ✓ if it's genuinely expensive (measure!):
const filtered = useMemo(() => items.filter(i => i.name.includes(query)), [items, query]);
```

Rules: if a value can be calculated from props/state, **don't store it**. If you want state to *reset* when a prop changes, give the component a `key` (`<Profile key={userId} />`) rather than syncing with an effect. If you need to adjust state during render in response to a prop change, prefer the "store previous prop" pattern over effects — but usually a `key` is simpler.

### Rung 3 — Skip work: the identity chain

`React.memo(Child)` skips rendering when props are shallow-equal (`Object.is` per prop). That only helps if every prop is **referentially stable**. One unstable prop breaks the chain:

```tsx
const Row = memo(function Row({ item, onSelect, style }: RowProps) { … });

// ✗ every parent render creates new `onSelect` and `style` → memo never hits
{items.map(i => <Row key={i.id} item={i} onSelect={id => setSelected(id)} style={{ fontWeight: selected === i.id ? 700 : 400 }} />)}

// ✓ stable callback, primitive prop instead of a new object
const onSelect = useCallback((id: number) => setSelected(id), []);
{items.map(i => <Row key={i.id} item={i} onSelect={onSelect} bold={selected === i.id} />)}
```

Mental model: **memo is only as good as its least stable prop.** Fixes, by preference:

1. Pass primitives (`bold: boolean`) instead of objects.
2. Hoist constants out of the component (`const STYLE = { … }`).
3. `useCallback` for handlers, `useMemo` for derived objects/arrays — **only** where they feed a memoised child or another hook's dependency.
4. Restructure so the unstable value isn't needed by the child.

`useMemo` and `useCallback` have their own cost (dependency comparison, closures retained); on a component that isn't memoised and has cheap children, they're overhead. The React Compiler (Topic 13) automates this — but only if your code follows the rules.

Also remember the traps: **context updates bypass `memo`** (a consumer re-renders when its context changes regardless of props), and a **`children` prop is a new object each parent render** (so `memo` on a component that receives JSX children is useless unless the parent stabilises them).

### Rung 4 — Rate-limit event-driven work

| | Debounce | Throttle |
|---|---|---|
| Fires | After the events **stop** for N ms | At most once per N ms **while** events continue |
| Use for | Search-as-you-type, autosave, resize-end | Scroll position, mousemove, drag, resize-during |
| Latency | Adds a delay after last event | Immediate first call (leading), steady cadence |

Two shapes matter in React:

- **Debounce a *value*** (`useDebounce(query, 300)`) — feed the debounced value to an effect or query.
- **Debounce a *callback*** — the handler itself is rate-limited. It must survive re-renders (keep the timer in a ref), always call the *latest* function, and clean up on unmount:

```tsx
function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef(fn);
  useEffect(() => { latest.current = fn; });

  const cancel = useCallback(() => clearTimeout(timer.current), []);
  useEffect(() => cancel, [cancel]);                        // unmount cleanup

  return useMemo(() => Object.assign(
    (...args: A) => { clearTimeout(timer.current); timer.current = setTimeout(() => latest.current(...args), delay); },
    { cancel },
  ), [delay, cancel]);
}
```

Don't create the debounced function inline in render (`debounce(fn, 300)` each render → a new timer every time, nothing is ever debounced). Prefer this hook, or `useMemo`/`useRef`.

For *rendering* work (not I/O), React 18's `useDeferredValue` / `useTransition` are often better than debouncing — they keep input responsive by deprioritising the render, without an artificial delay. Debounce when you want to **reduce requests/work**, defer when you want to **reduce render blocking**.

> **Check yourself:** A search box drives (a) an API call and (b) filtering a 10,000-row in-memory table. Which needs debounce, which is better served by `useDeferredValue`, and why?

## Gotchas

**Optimising without measuring.** Guess-driven `memo`/`useMemo` adds complexity for no gain. Use the Profiler; look at *commit* durations and *why* something rendered.

**`memo` with unstable props.** The most common failure — an inline `{}`/`[]`/`() =>` prop silently defeats it. Diagnose with the "why did this render?" Profiler setting or `why-did-you-render`.

**`useMemo` as a semantic guarantee.** React may discard memoised values; treat it as an optimisation, never as something correctness depends on.

**Stale deps.** Omitting a dependency to "keep the memo stable" creates stale closures. Fix the structure; don't lie to the linter.

**Mirroring props in state.** `useState(props.value)` ignores later prop changes; syncing with effects causes extra renders. Derive or use `key`.

**Debouncing inside render.** A new debounced function per render never debounces. Store it in a ref/`useMemo` or use a hook.

**Debounce + unmount.** A pending timer firing after unmount calls `setState` on a dead component (or issues a stale request). Cancel on cleanup.

**Context bypasses memo.** Splitting context, memoising values, or moving hot state out of Context is the real fix ([Topic 8](../08-provider-pattern/notes.md)).

**Key misuse.** Index keys on reorderable lists force needless remounts and state leaks; stable ids keep the reconciler efficient.

## Interview Questions

**Q (High): A component re-renders too often. How do you approach it?**

Answer: Measure first with the Profiler to confirm it matters and see what triggers it. Then walk a ladder: restructure to avoid the work — colocate state next to its users, or lift slow content up as `children` so it isn't re-created; derive values during render instead of syncing via effects; only then memoise (`React.memo` with stable props via `useCallback`/`useMemo`/hoisting); and rate-limit event-driven work with debounce/throttle or `useDeferredValue`. Each step is more invasive than the one before, so I try them in that order.

The trap: Jumping straight to `React.memo`/`useMemo` everywhere, or quoting hooks without a diagnosis method.

**Q (High): Why does `React.memo` sometimes not prevent re-renders?**

Answer: It shallow-compares props with `Object.is`. Inline objects, arrays and functions are new references each parent render, so the comparison always fails — one unstable prop is enough. Children passed as JSX are also new objects each render. Context updates bypass `memo` entirely. Fix by passing primitives, hoisting constants, `useCallback`/`useMemo` for values that must be objects/functions, and moving context consumers/producers appropriately.

The trap: Blaming React or thinking `memo` is "broken" rather than examining prop identity.

**Q (High): Explain "derived state" and the anti-patterns around it.**

Answer: Derived state is any value computable from existing props/state. Storing it in state and syncing via `useEffect` causes an extra render and a window where the two disagree. Compute it during render; wrap in `useMemo` only if the computation is measurably expensive. When you need to reset state on identity change (e.g. a different user), use a `key` on the component. `useState(props.x)` "initial only" semantics are a related trap — later prop changes are ignored.

The trap: Reaching for `useEffect` + `setState` for every calculation.

**Q (High): Debounce vs throttle — how do they differ and how do you implement them in React?**

Answer: Debounce runs after events stop for N ms (search, autosave); throttle caps execution to once per N ms during a stream (scroll, drag). In React the timer and the latest function must survive re-renders — keep the timer id and latest callback in refs, return a stable debounced function via `useMemo`/`useCallback`, and clear the timer on unmount. Don't create `debounce(fn)` inline during render; every render would get a fresh timer.

The trap: Inline debounce in render, missing cleanup, or using state for the timer id.

**Q (Medium): How does lifting content up with `children` avoid re-renders?**

Answer: The slow subtree is created as a JSX element by a parent that doesn't re-render, then passed down as `children`. The state-owning wrapper re-renders but receives the *same element reference*; React bails out on identical elements, so the subtree isn't re-rendered. It's structural — no memoisation.

The trap: Thinking it's an optimisation trick rather than a consequence of element identity.

**Q (Medium): When is `useMemo` worth it?**

Answer: When a computation is measurably expensive and its inputs change rarely, or when it produces an object/array that must be referentially stable for a memoised child or another hook's dependency. Not for cheap operations — the dependency comparison and retained closure cost something. Measure before adding it.

The trap: Wrapping every calculation, or relying on `useMemo` for correctness.

**Q (Medium): Debounce or `useDeferredValue` for a search box that filters a big list?**

Answer: For network requests, debounce reduces request volume. For a heavy *render* driven by the input, `useDeferredValue` (or `useTransition`) is often better — it keeps the input responsive by rendering the expensive list at lower priority, without a fixed artificial delay, and it's interruptible. They can be combined: debounce the API call, defer the list render.

The trap: Debouncing render work and making typing feel laggy.

**Q (Low): What does the React Compiler change about this ladder?**

Answer: It automatically memoises components and values at build time, removing most manual `useMemo`/`useCallback`/`memo` — provided your code follows the Rules of React (pure render, no mutation). It doesn't restructure state placement or fix data-flow problems, so rungs 1–2 still matter.

The trap: Believing the compiler eliminates the need to understand identity and structure.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state the ladder (measure → restructure → derive → memoise → rate-limit) and justify the order
- [ ] Can refactor a state-above-slow-tree problem two ways: colocation and `children`
- [ ] Can diagnose a broken memo by finding the unstable prop, and fix it
- [ ] Can rewrite an effect-synced state as derived state (or use `key`)
- [ ] Can write `useDebouncedCallback` with ref-held timer, latest-ref and unmount cleanup
- [ ] Can say when `useDeferredValue` beats debouncing

---
*Next: [Performance Patterns II — Compiler, Splitting, Virtualisation & Concurrency](../13-performance-advanced-patterns/notes.md) — when restructuring and memoisation aren't enough: shrink what you ship, render only what's visible, and let React prioritise.*
