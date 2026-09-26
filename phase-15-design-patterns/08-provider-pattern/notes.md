# Provider Pattern

## Quick Reference

| Piece | Role | Gotcha |
|---|---|---|
| `createContext` | Declares the channel and its type | Default value hides a missing provider — prefer `null` + guard |
| `<Provider value>` | Owns the state; broadcasts it to the subtree | New object each render re-renders *every* consumer |
| `useX()` guard hook | Only public way to read; throws if no provider | Keeps the raw context object private |
| Split contexts | State in one, dispatch/actions in another | Components that only *write* never re-render on reads |
| Composition | `AppProviders` nests providers once at the root | Order matters when one provider reads another |

## Where You've Seen This Before

- `createContext` / `useContext` mechanics, default values, re-render rule → [Phase 2: useContext](../../phase-02-hooks/08-use-context/notes.md)
- Why Context isn't a state manager, what re-renders and why → [Context API limitations](../../phase-06-state-management/01-context-api-limitations/notes.md)
- Splitting contexts, memoised values, selector workarounds → [Context optimisation](../../phase-06-state-management/02-context-optimization/notes.md)
- Reducer-backed state → [useReducer](../../phase-02-hooks/09-use-reducer/notes.md)
- Providers in Server Components → [Client vs server components](../../phase-11-modern-react/05-client-vs-server-components/notes.md)

**New here:** the pattern framed as **dependency injection for a subtree** — how to design the provider *API* (safe-context factory, state/actions split, scoping by nesting), how to keep `AppProviders` from turning into provider hell, the React 19 syntax, and a clear rule for when *not* to reach for a provider.

## What Is This?

The Provider pattern makes a value available to any component in a subtree **without passing it through every intermediate component**. A provider component owns some state or service and puts it into Context; descendants read it with a hook.

```tsx
<ThemeProvider>
  <AuthProvider>
    <App />            {/* any depth: const { theme } = useTheme(); */}
  </AuthProvider>
</ThemeProvider>
```

Think of it as **dependency injection scoped to a subtree**: descendants ask for "the theme" or "the current user" without knowing where it comes from or how it's managed. Swapping the implementation (real API vs mock, light vs dark) is a change at the provider, not at every consumer.

> **Check yourself:** How does a provider differ from a global variable? Name two things it gives you that a module-level singleton doesn't.

## Why Does It Exist?

**Prop drilling.** A value needed by a deeply nested component must be threaded through every layer between the owner and consumer, forcing intermediate components to accept props they don't use, coupling them to data they don't care about. Any change to the shape ripples through all of them.

**Scoping.** Unlike a singleton, a provider is *positional*: the nearest ancestor wins. That gives you:
- a themed sub-area (`<ThemeProvider theme="dark">` around one panel),
- per-test/per-Storybook-story injection,
- multiple independent instances (two form wizards, each with its own state).

**Ownership + reactivity in one place.** The provider is a normal component: it can use `useState`, `useReducer`, effects, refs. When its state changes, consumers re-render — no manual subscription code.

## How It Works

### The safe-context factory

Every provider needs the same boilerplate: context, provider, guarded hook. Extract it once:

```tsx
function createSafeContext<T>(name: string) {
  const Ctx = createContext<T | null>(null);
  Ctx.displayName = name;

  function useSafeContext(): T {
    const value = useContext(Ctx);
    if (value === null) throw new Error(`use${name} must be used inside <${name}Provider>`);
    return value;
  }
  return [Ctx.Provider, useSafeContext] as const;
}

const [ThemeCtxProvider, useTheme] = createSafeContext<{ theme: Theme; toggle(): void }>('Theme');

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const value = useMemo(
    () => ({ theme, toggle: () => setTheme(t => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  );
  return <ThemeCtxProvider value={value}>{children}</ThemeCtxProvider>;
}
```

Two decisions to notice: the default is `null` (so misuse throws rather than silently rendering with fake data), and the **value is memoised** — otherwise every provider render creates a new object and re-renders every consumer.

### React 19 syntax

React 19 lets you render the context object itself as the provider and read conditionally with `use`:

```tsx
<ThemeContext value={value}>{children}</ThemeContext>     // was <ThemeContext.Provider …>
const { theme } = use(ThemeContext);                       // can be inside if / after an early return
```

`Context.Provider` still works; the shorthand is what new code should prefer.

### Split state from actions

Consumers re-render when the context *value identity* changes. A component that only dispatches (`AddTodoForm`) doesn't care that the list changed — but with a single combined context it re-renders anyway.

```tsx
const TodosStateCtx = createContext<Todo[] | null>(null);
const TodosDispatchCtx = createContext<Dispatch<Action> | null>(null);

function TodosProvider({ children }: { children: ReactNode }) {
  const [todos, dispatch] = useReducer(reducer, []);   // dispatch is stable by React's guarantee
  return (
    <TodosDispatchCtx value={dispatch}>
      <TodosStateCtx value={todos}>{children}</TodosStateCtx>
    </TodosDispatchCtx>
  );
}
```

`dispatch` never changes identity, so components that read only `TodosDispatchCtx` never re-render because of list changes. It's the cheapest performance win in the pattern.

### Composing providers without the pyramid

```tsx
const composeProviders = (...providers: ComponentType<{ children: ReactNode }>[]) =>
  ({ children }: { children: ReactNode }) =>
    providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);

const AppProviders = composeProviders(QueryProvider, ThemeProvider, AuthProvider, ToastProvider);
```

Order encodes dependencies: a provider may only read providers **above** it. If `ToastProvider` calls `useTheme()`, it must be inside `ThemeProvider`.

### Scoping by nesting

```tsx
<ThemeProvider>                    {/* light for the app */}
  <Header />
  <ThemeOverride theme="dark">     {/* nearest provider wins in this subtree */}
    <PreviewPane />
  </ThemeOverride>
</ThemeProvider>
```

### Providers and Server Components

Context needs client-side state, so a provider is a Client Component. Server-rendered content can still be passed *through* it as `children` — the provider file has `'use client'`, but `{children}` remain Server Components. Mount providers in a client `Providers` wrapper near the layout root; don't mark the whole app `'use client'`.

> **Check yourself:** Your `AuthProvider` wraps the whole app. A single field in the auth object (`lastSeenAt`) updates every 30 seconds. What happens to every component that calls `useAuth()`, and what are two ways to contain it?

## When Not To Use a Provider

| Situation | Better tool |
|---|---|
| State changes many times per second (mouse, scroll, drag) | External store + `useSyncExternalStore` / Zustand selectors |
| Server data (lists, entities, cache, revalidation) | TanStack Query / SWR / RSC — [Server vs client state](../../phase-06-state-management/08-server-state-vs-client-state/notes.md) |
| A value used by one parent and one child | Props |
| Values needed only in one component tree of 2–3 levels | Composition (`children`) — pass the *element*, not the data |
| Fine-grained subscriptions ("re-render only when `user.name` changes") | Store with selectors (Context has none) |

Good fits: theme, locale, authenticated user, feature flags, router, toasts, design-system configuration, form-wizard state within one flow.

## Gotchas

**Every consumer re-renders on any value change.** Context has no selectors. Memoise the value, split contexts, or move hot state elsewhere.

**Inline value objects.** `<Ctx value={{ a, b }}>` is a new object every render — same as above, and the most common accidental perf bug.

**Non-null defaults hide missing providers.** `createContext({ theme: 'light' })` lets components render outside a provider using fake data, which is invisible in production and confusing in tests. Use `null` + guard.

**God context.** One `AppContext` with user, theme, cart, notifications means any change re-renders everything. One concern per context.

**Provider hell.** Eight nested providers at the root is readable only with a compose helper — and often signals that some of that state should be a store or a route-level provider.

**Provider order.** A provider reading another must sit inside it. Circular needs mean the design is wrong: extract shared state.

**Testing.** Components using `useTheme()` throw in isolation. Render them with a wrapper that mounts the right providers (`render(ui, { wrapper: TestProviders })`), often with stubbed values — one of the pattern's benefits.

**Stale value inside memoised children.** `React.memo` doesn't block context updates — consumers re-render regardless of props. That's correct, but surprises people who expected memo to shield them.

**Context is not global state.** No persistence, no devtools, no middleware, no selective subscription. It is a *delivery mechanism*; the state still lives in whatever hook the provider uses.

## Interview Questions

**Q (High): What problem does the Provider pattern solve and how does it work in React?**

Answer: It removes prop drilling: a value needed deep in the tree is provided once by an ancestor via Context, and any descendant reads it with `useContext`, without intermediate components knowing. The provider component owns the state (with `useState`/`useReducer`), puts it into Context, and consumers re-render when the value changes. It's positional, so nearest ancestor wins, which enables scoping, per-test injection, and multiple independent instances — the "dependency injection for a subtree" reading.

The trap: "It's global state." It's a delivery mechanism, not a store — no selectors, no persistence.

**Q (High): What causes unnecessary re-renders with Context and how do you prevent them?**

Answer: Every consumer re-renders whenever the context value changes by `Object.is`. The usual causes are inline object values (new identity per render), one large context holding unrelated data, and frequently changing data. Fixes: memoise the value (`useMemo`), split into separate contexts (state vs dispatch, or by concern), keep hot state outside Context with a store that supports selectors, and localise the provider closer to consumers. `React.memo` alone doesn't help since context updates bypass props.

The trap: Believing `memo` on consumers prevents context-triggered re-renders.

**Q (High): How would you structure and type a provider for a team codebase?**

Answer: A `createSafeContext<T>(name)` factory returning `[Provider, useHook]`: context defaults to `null`, the hook throws a descriptive error when no provider is present, and the raw context isn't exported. The provider component owns state with `useState`/`useReducer`, memoises its value, and exposes actions as stable functions. For state that changes often, split state and dispatch contexts. Consumers only ever use the hook.

The trap: Exporting the raw context, using a fake default, or passing a fresh object literal as `value`.

**Q (Medium): How do you avoid provider hell?**

Answer: Compose providers in one `AppProviders` component with a small `composeProviders` helper; keep provider order explicit since it encodes dependencies; scope providers to route or feature subtrees instead of the root when only that area needs them; and question whether each piece of state should be Context at all (server state → a query library; hot state → a store).

The trap: Only mentioning the helper, not the design question of whether it should be Context.

**Q (Medium): What changed with Context in React 19?**

Answer: `<Context value={…}>` can be used directly as the provider (no `.Provider`), and the `use(Context)` API reads context and can be called conditionally — after early returns or inside branches — unlike `useContext`. The mental model and re-render behaviour are unchanged.

The trap: Thinking `use` makes context selective. It doesn't.

**Q (Medium): Can you use the Provider pattern with Server Components?**

Answer: Providers rely on client state, so they must be Client Components (`'use client'`). Server Components can still be passed as `children` to a client provider, so keeping a thin `Providers` client wrapper at the layout level preserves server rendering for the rest of the tree. Values crossing the boundary must be serialisable; functions can't be passed from server to client provider except server actions.

The trap: Marking the entire layout `'use client'` to "make context work."

**Q (Low): Provider pattern vs Redux/Zustand — when do you pick which?**

Answer: Provider/Context for low-frequency, app-wide configuration-like values (theme, locale, auth) and locally scoped state. A store when many components subscribe to slices of frequently changing state, when you want devtools/middleware/persistence, or need selector-based re-render control. They aren't exclusive: stores are often *delivered* through a provider for testability and SSR isolation.

The trap: Treating Redux as "Context but bigger."

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the Provider pattern as scoped dependency injection and contrast it with a singleton
- [ ] Can write `createSafeContext` from memory and say why the default is `null`
- [ ] Can explain what re-renders on a context change and list three fixes
- [ ] Can split a reducer-backed provider into state and dispatch contexts
- [ ] Can write `composeProviders` and explain why order matters
- [ ] Can name five things Context is a good fit for and three where a store or query library is better
- [ ] Can describe the React 19 `<Context value>` / `use()` changes and the RSC boundary rule

---
*Next: [Optimistic UI](../09-optimistic-ui-pattern/notes.md) — from how state is shared to how it's updated: showing the result before the server confirms it.*
