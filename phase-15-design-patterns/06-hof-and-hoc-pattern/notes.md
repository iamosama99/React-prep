# Higher-Order Functions & Higher-Order Components

## Quick Reference

| Level | Definition | Example |
|---|---|---|
| **Higher-order function (HOF)** | A function that takes a function and/or returns a function | `arr.map(fn)`, `debounce(fn, 300)`, `compose(f, g)` |
| **Higher-order component (HOC)** | A HOF whose input and output are *components* | `const Guarded = withAuth(Dashboard)` |
| **What a HOC adds** | Behaviour, injected props, or a wrapper — around a component you don't edit | Auth gate, data injection, error boundary, analytics |
| **Modern default** | A custom hook for logic; a HOC only when you must *wrap the component boundary* | `useAuth()` vs `withAuth()` |

## Where You've Seen This Before

- HOC mechanics, the wrapper-hell and prop-collision problems, `displayName`, static hoisting, ref forwarding, "never create a HOC inside render" → [Phase 4: HOCs](../../phase-04-component-patterns/04-hocs/notes.md)
- Why hooks displaced HOCs for logic reuse → [Custom hooks as the modern pattern](../../phase-04-component-patterns/05-custom-hooks-modern-pattern/notes.md), [Topic 5](../05-render-prop-pattern/notes.md)
- `React.memo` is itself a HOC → [React.memo deep dive](../../phase-05-performance/05-react-memo-deep-dive/notes.md)
- Error boundaries are class components, so wrapping is how you use them → [Phase 3: error boundaries](../../phase-03-class-legacy/05-component-did-catch-error-boundaries/notes.md)
- Route guards → [Protected routes](../../phase-07-routing/05-protected-routes/notes.md)

**New here:** the *ladder from plain JavaScript* (HOF → HOC) that makes the pattern feel inevitable rather than exotic, a typed HOC template, composition with `compose`, and a clear **"HOC or hook?" decision rule**.

## What Is This?

A **higher-order function** is a function that either accepts a function as an argument, returns a function, or both. JavaScript developers use them constantly:

```ts
[1, 2, 3].map(n => n * 2);                       // takes a function
const debounced = debounce(save, 300);           // takes AND returns a function
const add = (a: number) => (b: number) => a + b; // returns a function (currying)
```

A **higher-order component** applies the same idea to components. It's a function that takes a component and returns a new component with extra behaviour:

```tsx
const withLogger = <P extends object>(Wrapped: ComponentType<P>) =>
  function WithLogger(props: P) {
    useEffect(() => { console.log('mounted', Wrapped.name); }, []);
    return <Wrapped {...props} />;
  };

const LoggedMovieList = withLogger(MovieList);
```

The mental model is a **decorator**: leave the original untouched, produce an enhanced version.

> **Check yourself:** Name a HOF you use every day that *returns* a function and one that *takes* one. Then explain in one sentence why `withLogger(MovieList)` is the same idea one level up.

## Why Does It Exist?

Before hooks, a function component had no state, effects or context — and class components could only share behaviour by inheritance (which composes badly) or mixins (removed). A HOC was the way to say "give this component the same data-fetching / auth / subscription behaviour as those five others" *without editing them*. It works because the **unit of reuse in React is the component, and a function that maps components to components is the natural way to compose them.**

HOCs solve **cross-cutting concerns**: things that many unrelated components need but which aren't part of any one of them — auth checks, feature flags, logging, error handling, data injection, theming, performance instrumentation.

> **Check yourself:** Why is "cross-cutting concern" the right phrase? What would it mean for the concern to be *inside* each component instead?

## How It Works

### A worked example: injecting fetched data

```tsx
type Injected = { data: Movie[] | null; loading: boolean; error: Error | null };

function withMovies<P extends Injected>(Wrapped: ComponentType<P>) {
  function WithMovies(props: Omit<P, keyof Injected>) {
    const state = useFetch<Movie[]>('/api/movies');
    return <Wrapped {...(props as unknown as P)} {...state} />;
  }
  WithMovies.displayName = `withMovies(${Wrapped.displayName ?? Wrapped.name})`;
  return WithMovies;
}

function MovieList({ data, loading, error, title }: Injected & { title: string }) { … }

const MovieListWithData = withMovies(MovieList);   // define ONCE, at module scope
<MovieListWithData title="Now showing" />          // callers pass only `title`
```

Three typing details worth knowing:

1. `P extends Injected` — the wrapped component must be able to accept the injected props.
2. `Omit<P, keyof Injected>` — callers must **not** need to supply what the HOC injects.
3. `as unknown as P` — TypeScript can't prove `Omit<P, K> & Injected` equals `P` for a generic `P`; a controlled cast at this single seam is the accepted trade-off.

### The four things a HOC can do

| Move | Example |
|---|---|
| **Inject props** | `withMovies`, `withRouter` (legacy), `withTheme` |
| **Gate rendering** | `withAuth` returns `<Redirect />` and never mounts the wrapped tree |
| **Wrap in a provider/boundary** | `withErrorBoundary(Widget)`, `withSuspense(Widget)` |
| **Instrument** | `withProfiler`, `withAnalytics` |

### Composing HOCs

HOCs compose like functions. A `compose` helper flattens the nesting:

```tsx
const compose = <T,>(...fns: Array<(x: T) => T>) => (x: T) => fns.reduceRight((acc, fn) => fn(acc), x);

const Enhanced = compose(withAuth, withLogger, withMovies)(MovieList);
// equivalent to withAuth(withLogger(withMovies(MovieList)))
```

Order matters: the outermost HOC runs first at render time (`withAuth` can short-circuit before `withMovies` fetches anything).

### HOC vs hook: the decision rule

```
Do I need to control whether the wrapped component RENDERS AT ALL,
or wrap it in something (a class boundary, a provider), or apply this
to a component I can't edit?                     → HOC
Do I just need values/behaviour INSIDE a component I own?   → Hook
```

| | HOC | Custom hook |
|---|---|---|
| Access | Props injected from outside | Values returned into the component |
| Can prevent mounting the child | **Yes** | No (you return early yourself) |
| Wrap in class-only APIs (error boundary) | **Yes** | No |
| Works on components you can't edit | **Yes** | No |
| Naming collisions | Possible (`data`, `user`) | None — you name the variable |
| Tree depth | Adds wrapper nodes | None |
| TypeScript | Painful generics | Straightforward |
| Composition | `compose(...)` | Call several hooks |

> **Check yourself:** You need "redirect to /login if not authenticated." Write it as a hook-based component and as a HOC. Which one guarantees the dashboard's own hooks never run for logged-out users, and why does that matter?

## Gotchas

**Never create a HOC inside a render.** `const Enhanced = withX(Comp)` inside a component body produces a *new component type each render*, so React unmounts and remounts the whole subtree, losing state every time. Define enhanced components at module scope.

**Static methods are lost.** `hoistNonReactStatics(Wrapper, Wrapped)` (from `hoist-non-react-statics`) copies them; or export/attach explicitly.

**Refs don't pass through.** `ref` isn't a normal prop (before React 19), so it attaches to the wrapper. Use `forwardRef` inside the HOC. (React 19 treats `ref` as a prop on function components, easing this.)

**Prop collisions.** A HOC that injects `data` silently overwrites a caller-passed `data`. Namespace injected props or document them; TypeScript's `Omit` prevents callers from passing them at all.

**`displayName`.** Without it DevTools shows `Anonymous`/`WithMovies` for everything. Set `withThing(Wrapped)` names — it makes profiler traces readable.

**Wrapper hell.** `withA(withB(withC(withD(X))))` in DevTools is four extra layers and hard to debug; a good reason to move logic-only HOCs to hooks.

**Render-order surprises.** Outer HOCs render first. A `withAuth` inside a `withData` will fetch data for a user who's about to be redirected.

**Copying `defaultProps`/`propTypes` and static `defaultProps` in legacy code** doesn't happen automatically either — hoist or re-declare.

## Interview Questions

**Q (High): What is a higher-order component and what problem does it solve?**

Answer: A function that takes a component and returns a new component with additional behaviour — props injected, rendering gated, or the component wrapped in something. It's the component-level analogue of a higher-order function. It solves cross-cutting concerns (auth, logging, data injection, error handling, theming) that many components need but that shouldn't be edited into each one. Before hooks it was also the main way to share stateful logic.

The trap: Answering "it's a component that returns a component." Precision matters: it's a *function* from component to component, not a component itself.

**Q (High): HOC or custom hook — how do you choose?**

Answer: Hook by default for logic reuse: no wrapper nodes, no prop collisions, easy typing, composes by calling. HOC when I need to wrap the component boundary — control whether the component renders at all (auth gates that stop the child's hooks and effects from running), wrap in a class-only API like an error boundary, apply behaviour to a component I don't own, or when code still lives in class components. `React.memo`, `forwardRef` and `React.lazy` are themselves HOC-like wrappers.

The trap: "Hooks made HOCs obsolete." Show the specific cases where wrapping is the right shape.

**Q (High): What's wrong with defining a HOC-wrapped component inside another component's render?**

Answer: Each render produces a new component *type*. React's reconciliation compares types by identity; a different type means unmount-then-mount, so the entire subtree loses state, refs and DOM on every parent render. Create the enhanced component once at module scope (or memoise it) and render it.

The trap: Not connecting it to reconciliation: type identity → remount.

**Q (Medium): How do you type a HOC that injects props in TypeScript?**

Answer: Make it generic over the wrapped props `P extends InjectedProps`, return a component whose props are `Omit<P, keyof InjectedProps>` so callers don't supply what's injected, and spread `{...(props as unknown as P)} {...injected}` into the wrapped component. Set `displayName`. The cast at the seam is the pragmatic compromise — TypeScript can't prove `Omit<P, K> & Injected` is `P` for arbitrary generic `P`.

The trap: Giving the HOC props `any`, losing type safety entirely.

**Q (Medium): What problems do HOCs have that led to hooks?**

Answer: Wrapper hell (deep trees in DevTools), implicit prop-name collisions, static composition (can't vary per render), painful TypeScript generics, lost refs and statics, and indirection — the source of a prop isn't visible in the consuming component. Hooks give the same reuse as plain functions called inside the component.

The trap: Listing only "hooks are simpler" with no specifics.

**Q (Medium): In `compose(withAuth, withLogger, withData)(Comp)`, which runs first at render time and why does it matter?**

Answer: `compose` applies right-to-left, so the result is `withAuth(withLogger(withData(Comp)))`. At render, the outermost wrapper (`withAuth`) renders first, so it can short-circuit before `withData` starts fetching. Put gates outermost and data/instrumentation inside.

The trap: Mixing up wrapping order and render order.

**Q (Low): How does `React.memo` relate to HOCs?**

Answer: `memo(Component)` is a HOC: it takes a component and returns a new one that skips re-rendering when props are shallow-equal. The same is true of `forwardRef` and (conceptually) `lazy`. Understanding HOCs makes these APIs unsurprising — including why you should create `memo(...)` at module scope.

The trap: Thinking `memo` is a special compiler feature.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can define HOF and HOC and give an example of a HOF that returns a function
- [ ] Can write a typed `withX` HOC (generic, `Omit`, `displayName`) from memory
- [ ] Can explain why `compose` order equals render order (outermost first)
- [ ] Can state the HOC-vs-hook decision rule with three cases where HOC wins
- [ ] Can explain the remount bug when creating HOCs in render
- [ ] Can list four HOC gotchas (statics, refs, collisions, wrapper hell)

---
*Next: [Custom Hook Pattern](../07-custom-hook-pattern/notes.md) — the pattern that replaced HOCs and render props for logic reuse, and the rules for writing good ones.*
