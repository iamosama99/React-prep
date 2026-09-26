# State Reducer Pattern

## Quick Reference

| Piece | What it is | Why it matters |
|---|---|---|
| `reducer(state, action)` | Pure function: current state + described event → next state | All transitions in one testable place (from `useReducer`) |
| `stateReducer` prop | An *optional consumer-supplied* reducer that sees every proposed transition | Consumers customise **behaviour** without you adding a prop per case |
| Exported default reducer + action types | `useCounter.reducer`, `useCounter.types` | Consumers can delegate to default logic and branch on `action.type` |
| Control props (contrast) | Consumer *owns* the state (`value` + `onChange`) | Full control, but the consumer re-implements the logic |
| Inversion of control | Author owns *how state works*; consumer overrides *what happens on specific transitions* | Third IoC axis: structure (compound) · output (render props) · **state changes** (this) |

## Where You've Seen This Before

- `useReducer`, reducers as pure `(state, action) => state`, action design → [Phase 2: useReducer](../../phase-02-hooks/09-use-reducer/notes.md)
- Controlled vs uncontrolled component APIs (`value` / `onChange`) → [Phase 4: Controlled vs uncontrolled design](../../phase-04-component-patterns/06-controlled-vs-uncontrolled-design/notes.md), [Topic 3](../03-state-vs-refs-inputs/notes.md)
- Inversion of control over structure → [Topic 4: Compound components](../04-compound-component-pattern/notes.md); over output → [Topic 5: Render props](../05-render-prop-pattern/notes.md)
- Redux reducers, middleware-style interception → [Phase 6: Redux core](../../phase-06-state-management/03-redux-core/notes.md)

**New here:** everything in this topic is new as a *pattern*. `useReducer` is the mechanism; the State Reducer pattern is about **exposing the reducer as an extension point** so consumers can override transitions.

## What Is This?

Imagine you ship a `useToggle` hook. Consumers ask for changes:

- "Don't let it turn *off* once it's on."
- "Only allow 4 toggles, then ignore clicks."
- "Add a `reset`."
- "Toggle but also close the other panel."

Each request is a new prop (`allowOff`, `maxToggles`, …) and a new branch in your code. Eventually your hook has twelve options and a combinatorial test matrix.

The **State Reducer pattern** answers with one prop:

```tsx
const { on, toggle } = useToggle({
  stateReducer(state, action) {
    if (action.type === 'toggle' && state.on) return state;   // "never turn off"
    return useToggle.reducer(state, action);                   // otherwise, default behaviour
  },
});
```

The author writes a normal reducer for the default behaviour. The **consumer is invited to intercept every transition** — see the current state and the proposed action, and return the state that should result. The hook's author doesn't need to anticipate each customisation; the consumer implements them.

> **Check yourself:** In the example, what two pieces of information does the consumer's reducer receive, and what must it return? Which line makes sure default behaviour is preserved for everything it *doesn't* customise?

## Why Does It Exist?

Component APIs face a design tension between **simple** (few props, one behaviour) and **flexible** (support every use case). Prior patterns handle flexibility along two axes:

| Axis | Pattern |
|---|---|
| Structure (which parts, in what order) | Compound components |
| Output (what gets rendered with these values) | Render props |
| **State transitions (what happens when X occurs)** | **State reducer** |

Until this pattern, customising *behaviour* meant adding props or forking the component. State reducers move the decision to the consumer at the exact moment it matters — the transition — with full knowledge of current state and the incoming action. Downshift (the accessible combobox library) popularised it; Kent C. Dodds' *Advanced React Patterns* generalised it; React's own `useReducer` made it trivial to implement.

## How It Works

### Step 1 — Write the hook's own reducer, with named actions

```tsx
type ToggleState = { on: boolean };
type ToggleAction =
  | { type: 'toggle' }
  | { type: 'on' }
  | { type: 'off' }
  | { type: 'reset'; initialState: ToggleState };

function toggleReducer(state: ToggleState, action: ToggleAction): ToggleState {
  switch (action.type) {
    case 'toggle': return { on: !state.on };
    case 'on':     return { on: true };
    case 'off':    return { on: false };
    case 'reset':  return action.initialState;
  }
}
```

Actions are **descriptions of events**, not commands: `'toggle'` says what the user did; the reducer decides what that means. That's what lets a consumer reinterpret it.

### Step 2 — Accept an optional `stateReducer`

```tsx
type StateReducer = (state: ToggleState, action: ToggleAction) => ToggleState;

function useToggle({ initialOn = false, stateReducer = toggleReducer }: { initialOn?: boolean; stateReducer?: StateReducer } = {}) {
  const initialState = { on: initialOn };
  const [state, dispatch] = useReducer(stateReducer, initialState);

  const toggle = useCallback(() => dispatch({ type: 'toggle' }), []);
  const reset  = useCallback(() => dispatch({ type: 'reset', initialState }), []); // eslint-disable-line
  return { on: state.on, toggle, reset };
}
useToggle.reducer = toggleReducer;                       // export the default so consumers can delegate
useToggle.types = { toggle: 'toggle', on: 'on', off: 'off', reset: 'reset' } as const;
```

`useReducer(stateReducer, …)` *is* the whole trick: passing the consumer's reducer in place of the default. Exporting the default reducer and the action types makes the extension point usable — a consumer can write `useToggle.reducer(state, action)` for "everything else."

### Step 3 — Consumers customise transitions

```tsx
// "Only 4 toggles"
const [clicks, setClicks] = useState(0);
const { on, toggle } = useToggle({
  stateReducer(state, action) {
    if (action.type === useToggle.types.toggle && clicks >= 4) return state;   // ignore
    return useToggle.reducer(state, action);
  },
});
<button onClick={() => { toggle(); setClicks(c => c + 1); }}>{on ? 'ON' : 'OFF'}</button>
```

Returning `state` unchanged = "ignore this action". Returning a modified copy = "do something different." Returning `reducer(state, action)` = "defer to the default."

### Variant: pass `changes`

Some libraries (Downshift) run the default reducer first and give the consumer `{ ...action, changes }` — *the state the default would produce* — so overrides can be minimal: `return { ...changes, isOpen: true }`. Pick one style and document it; passing `changes` is friendlier when the state is large.

### Making it robust

**Latest-reducer ref.** If a consumer passes an inline `stateReducer`, its identity changes every render. `useReducer` handles a changing reducer, but internal callbacks should not depend on it. Keep a stable internal reducer that delegates to the latest consumer function via a ref:

```tsx
const reducerRef = useRef(stateReducer);
reducerRef.current = stateReducer;    // (assigned in an effect in strict-purity code)
const [state, dispatch] = useReducer((s: ToggleState, a: ToggleAction) => reducerRef.current(s, a), initialState);
```

**Purity.** Reducers run during render (and twice in Strict Mode); they must be pure — no `setState`, no fetch. A consumer who needs a side effect on a transition uses an `onChange` callback or an effect keyed on state, not the reducer.

**Action typing.** Export the discriminated union so TypeScript narrows `action` inside the consumer's reducer.

### State reducer vs control props

| | Control props (`value` + `onChange`) | State reducer |
|---|---|---|
| Who owns state? | Consumer | Hook (consumer intercepts) |
| Consumer effort | Implements all transitions | Only the exceptions |
| Best for | Syncing to external state (URL, form library) | Tweaking *rules* of the transition |
| Can combine? | Yes — Downshift supports both |

### Combining with other patterns

- **Compound components:** the root uses `useToggle({ stateReducer })` and shares the result via Context — consumers get behaviour override *and* structural freedom.
- **Provider:** put the hook in a provider that accepts `stateReducer`; every descendant sees the customised behaviour.
- **HOF:** `withLogging(reducer)` wraps any reducer to log transitions — a reducer is just a function, so higher-order functions compose ([Topic 6](../06-hof-and-hoc-pattern/notes.md)).

> **Check yourself:** A consumer needs "when the dropdown closes, also clear the search text." Is that best done in a `stateReducer`, an `onChange` callback, or control props? What decides it?

## When To Use It

| Use when | Skip when |
|---|---|
| You ship a reusable hook/component with **stateful behaviour** many teams will bend | The component is used once, or behaviour rarely changes |
| Customisation requests arrive as "can you add a prop that…" | A single `value`/`onChange` (control props) is all anyone needs |
| The state machine is small and well-named | The state is huge; overriding transitions requires deep knowledge |
| You want consumers to *reuse* default logic while tweaking | The default logic is trivial (`useState` is enough) |

## Gotchas

**Exposing internals as public API.** Action types and state shape become contract. Renaming `'toggle'` to `'flip'` is a breaking change; version and document them.

**Impure reducers.** Side effects or randomness in the consumer's reducer double-fire in Strict Mode and under concurrent rendering.

**Forgetting to delegate.** A consumer's reducer that returns `state` for unknown actions disables everything else. Always end with `return defaultReducer(state, action)`.

**Inline reducer identity.** Consumers writing `stateReducer={(s, a) => …}` create a new function each render; if your internals put it in dependency arrays you'll churn. Use the latest-ref approach.

**Reducing the wrong thing.** Consumers put side effects (analytics, requests) into the reducer. Provide `onChange`/`onStateChange` callbacks as the sanctioned place.

**Over-engineering.** For simple components, a couple of props is easier than a public reducer API. State reducer earns its place with library-style components.

**Testing.** The pattern is *good* for tests — reducers are pure — but you must test the default reducer and at least one override path.

## Interview Questions

**Q (High): What is the State Reducer pattern and what problem does it solve?**

Answer: A component or hook takes an optional `stateReducer` prop; internally it runs its state through `useReducer(stateReducer ?? defaultReducer)`. The consumer's reducer sees the current state and every proposed action and can modify, ignore or extend the outcome. It solves prop explosion for *behavioural* customisation: instead of adding `allowOff`, `maxClicks` etc., the author exposes one extension point at the state-transition level and consumers implement their own rules, reusing the exported default reducer for everything else.

The trap: Describing it as "just useReducer." The pattern is *exposing the reducer to the consumer* as inversion of control.

**Q (High): How does it differ from control props (controlled components)?**

Answer: In control props the consumer owns the state and the component just renders it and reports changes — the consumer must implement all state logic. With a state reducer the hook still owns state and logic; the consumer only intercepts specific transitions. Control props suit external synchronisation (URL, forms); state reducer suits tweaking rules. Libraries like Downshift support both.

The trap: Treating them as alternatives to the same problem. They're different levels of control.

**Q (High): Implement `useCounter` with a state reducer and show a consumer capping it at 10.**

Answer: Default reducer handles `increment`/`decrement`/`reset` on `{ count }`. Hook: `const [state, dispatch] = useReducer(stateReducer ?? counterReducer, { count: initial })`, returning `count` plus dispatching helpers. Consumer: `stateReducer: (state, action) => action.type === 'increment' && state.count >= 10 ? state : useCounter.reducer(state, action)`. Emphasise returning `state` to ignore, delegating otherwise, and exporting the default reducer and action types.

The trap: Mutating state in the reducer, or forgetting to delegate to the default reducer.

**Q (Medium): Why must the consumer's reducer be pure, and where do side effects go?**

Answer: Reducers run during rendering, may run more than once (Strict Mode, concurrent rendering), and their results can be discarded. Side effects there would fire unpredictably. Side effects belong in event handlers, `onChange`-style callbacks provided by the hook, or effects driven by the resulting state.

The trap: Putting analytics or requests inside the reducer.

**Q (Medium): How do you handle a `stateReducer` whose identity changes every render?**

Answer: Don't let internals depend on its identity. Store the latest consumer reducer in a ref and have a stable internal reducer delegate to `ref.current`. `useReducer` tolerates changing reducers, but stabilising keeps internal callbacks and memoised values stable, and avoids surprises when the reducer closes over consumer state (like a click counter).

The trap: Wrapping the consumer's function in `useCallback` inside the hook — you can't fix an unstable reference you don't control.

**Q (Medium): What are the downsides of exposing a state reducer?**

Answer: It makes internal action types and state shape part of your public API, so refactors become breaking changes; it increases the documentation surface; consumers can create states you didn't design for; and it's overkill for simple components. Use it for library-style, reusable, behaviour-heavy building blocks.

The trap: Only listing benefits.

**Q (Low): Where have you seen this pattern in the wild?**

Answer: Downshift (`stateReducer` and `changes`), Kent C. Dodds' Advanced React Patterns (`useToggle`), and in spirit Redux middleware/enhancers (interception of transitions) and XState's machine options. React Table v7 exposed `stateReducer` for table state too.

The trap: Not being able to name a real example.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the three inversion-of-control axes: structure, output, state transitions
- [ ] Can write a hook that accepts `stateReducer`, exports its default reducer and action types
- [ ] Can write consumer overrides: ignore an action, modify an outcome, delegate the rest
- [ ] Can contrast state reducer with control props and say when each fits
- [ ] Can explain purity and where side effects go instead
- [ ] Can describe the `changes` variant and the latest-ref stabilisation

---
*Next: [Pub-Sub vs Observer](../11-pub-sub-vs-observer/notes.md) — so far state has flowed through props, context and reducers; now: how do unrelated parts of an app talk to each other without knowing about each other?*
