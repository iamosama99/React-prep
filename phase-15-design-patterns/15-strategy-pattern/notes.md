# Strategy Pattern (and Hook Factories)

## Quick Reference

| Smell | Strategy move | Result |
|---|---|---|
| `if (type === 'a') … else if (type === 'b') …` growing over time | Table of interchangeable implementations: `strategies[type]` | Add a case by adding an entry — the caller doesn't change |
| Behaviour varies by plan / region / provider / feature flag | One **interface**, many **implementations**, chosen at one place | Consumers depend on the interface, not the variants |
| Strategies need React state/effects | Make each strategy a **hook**, but pick it *stably* (factory, `key`, or Context) | Hook order never changes for a mounted component |
| Choice can change at runtime | Pure function/object strategies, **or** `key={strategy}` to remount | No "rendered more hooks than previous render" |
| Strategy should be swappable per subtree / test | Provide it via **Context** | Dependency injection; trivial mocking |

## Where You've Seen This Before

Nothing in Phases 1–14 names this pattern, but you've used its ingredients:

- Rules of Hooks — *why* hooks can't be swapped mid-lifetime → [Phase 2: Rules of hooks](../../phase-02-hooks/16-rules-of-hooks/notes.md)
- Context as dependency injection → [Topic 8: Provider pattern](../08-provider-pattern/notes.md)
- Custom hooks as the reuse unit → [Topic 7](../07-custom-hook-pattern/notes.md)
- `key` to reset component identity → [Lists & keys](../../phase-01-fundamentals/07-lists-and-keys/notes.md), [Topic 13 (reconciliation)](../13-performance-advanced-patterns/notes.md)
- Discriminated unions and exhaustive checking → [Phase 9: Discriminated union props](../../phase-09-typescript/07-discriminated-union-props/notes.md)
- HOFs returning functions — the shape of a factory → [Topic 6](../06-hof-and-hoc-pattern/notes.md)

**New here:** everything. Strategy is one of the classic Gang-of-Four patterns; the React-specific twist is **how it interacts with the Rules of Hooks**, which gives rise to *hook factories*.

## What Is This?

The **Strategy pattern** defines a family of interchangeable algorithms behind one interface, encapsulates each, and lets the client pick one without the client knowing the details. The behaviour varies; the *caller doesn't branch on it*.

Before:

```tsx
function usePrice(plan: Plan, seats: number) {
  if (plan === 'free')       return 0;
  else if (plan === 'pro')   return seats * 12;
  else if (plan === 'team')  return Math.max(5, seats) * 9;
  else if (plan === 'enterprise') return seats > 100 ? seats * 6 : seats * 8;
  // …a fifth plan lands every quarter, each edit touching this function
}
```

After:

```tsx
type PricingStrategy = { label: string; price(seats: number): number };

const pricing = {
  free:       { label: 'Free',       price: () => 0 },
  pro:        { label: 'Pro',        price: s => s * 12 },
  team:       { label: 'Team',       price: s => Math.max(5, s) * 9 },
  enterprise: { label: 'Enterprise', price: s => (s > 100 ? s * 6 : s * 8) },
} satisfies Record<Plan, PricingStrategy>;

function usePrice(plan: Plan, seats: number) {
  return useMemo(() => pricing[plan].price(seats), [plan, seats]);   // one line, forever
}
```

Adding a plan = adding an entry (and a union member — TypeScript then *forces* you to provide it via `satisfies Record<Plan, …>`). The consumer never changes.

> **Check yourself:** Which SOLID principle is the "after" version demonstrating? What exactly is *closed for modification* and what is *open for extension*?

## Why Does It Exist?

**Conditionals that dispatch on a type are a growth smell.** Every new variant means editing a function that already has all the other variants' logic in it — risk to unrelated cases, merge conflicts, and a test matrix that multiplies. Worse, the same `switch (type)` tends to be *copied* into several places (price, label, validation, icon), so adding a variant means finding every switch.

Strategy centralises "what varies" into one object per variant. It also enables:

- **Testing each variant in isolation** (pure functions, no component needed).
- **Runtime swapping** (A/B tests, feature flags, user preference).
- **Dependency injection** (mock strategy in tests; different strategy per subtree).

Not every `if` is a strategy. Two branches that will never grow are clearer as an `if`. Reach for Strategy when there are three or more variants, **or** the variants keep arriving, **or** the same discriminator branches in multiple places.

## How It Works

### Form 1 — Strategies as plain data/functions (default choice)

The example above. No hooks inside strategies; they're pure. Safe to switch at any time, trivially testable, and works in and out of React. **Start here.**

Ways to select:

```tsx
const strategy = pricing[plan];                       // lookup table (exhaustive with Record)
const strategy = plan === 'x' ? a : b;                // small fixed set
const strategy = resolveStrategy({ plan, region });   // a resolver function when selection rules are complex
```

### Form 2 — Strategies that need React (hooks) and the hook-order problem

Sometimes the variation *includes React behaviour*: Stripe needs an effect to load an SDK, PayPal uses a reducer and a ref.

```tsx
const strategies = { stripe: useStripe, paypal: usePayPal };

function Checkout({ method }: { method: 'stripe' | 'paypal' }) {
  const usePayment = strategies[method];   // ← picks a DIFFERENT hook depending on props
  const payment = usePayment();            // ← hook order changes when `method` changes → crash
  …
}
```

When `method` changes, this render calls a different hook with a different internal sequence (`useState` vs `useReducer + useRef`). React matches state by *call order* (Rules of Hooks), so it throws **"Rendered more/fewer hooks than during the previous render"** or, worse, silently mixes state between the two implementations.

The fix depends on whether the choice can change while the component is mounted.

**a) The choice is fixed for the component's lifetime → hook factory (module-level selection)**

```tsx
function createUseDiscount(strategy: DiscountStrategy) {
  return function useDiscount(cart: Cart) {              // a real hook with a fixed body
    const total = useMemo(() => strategy.apply(cart), [cart]);
    const [banner] = useState(strategy.banner);
    return { total, banner };
  };
}

export const useBlackFriday = createUseDiscount(blackFriday);
export const useLoyalty     = createUseDiscount(loyalty);
```

A **hook factory** is a function that returns a hook. It's "hook-safe" because each returned hook has a *fixed call sequence* and the component chooses *which one to call at authoring time* (e.g. `BlackFridayCart` calls `useBlackFriday`; `LoyaltyCart` calls `useLoyalty`). At any moment, a given component instance always calls the same hook. The factory runs at module scope, not during render — so it never changes hook order.

**b) The choice changes at runtime → remount on change with `key`**

```tsx
<PaymentPanel key={method} method={method} />   // new key = new instance = fresh hook order
```

Each strategy value gets its own component instance, so switching is "unmount one, mount the other," and hook order can't conflict. State is (deliberately) discarded on switch.

**c) The choice changes at runtime and state must persist → don't put hooks in strategies**

Have *one* hook with a fixed body that reads data/functions from the selected strategy (Form 1). Behaviour that needs React state lives in that one hook; the strategy supplies pure pieces (`format`, `validate`, `price`).

### Form 3 — Strategy components

Map a discriminator to a *component*, not a hook:

```tsx
const forms: Record<Method, ComponentType<FormProps>> = { stripe: StripeForm, paypal: PayPalForm };
const Form = forms[method];
return <Form {...props} />;          // different type ⇒ React remounts ⇒ no hook-order issue
```

Rendering a different component *type* naturally resets hook order. This is often the cleanest hook-safe strategy in React.

### Form 4 — Strategy via Context (dependency injection)

```tsx
const [DiscountProvider, useDiscount] = createSafeContext<DiscountStrategy>('Discount');

<DiscountProvider value={isBlackFriday ? blackFriday : none}>
  <Cart />                                   {/* Cart calls useDiscount().apply(cart) */}
</DiscountProvider>
```

Consumers ask for "the discount strategy" and don't know which one they got. Swapping in tests, per route, or per experiment is one prop. It combines with Form 1 (strategies are pure) so runtime switching is safe.

### Choosing

| Situation | Form |
|---|---|
| Variants are pure computations (price, format, validate, sort, compare) | **1 — data/functions** |
| Variants need effects/state, fixed per component | **2a — hook factory** |
| Variants need effects/state, switch at runtime, state may reset | **2b — `key`** or **3 — components** |
| Same call site, different implementation per subtree/test | **4 — Context** |

> **Check yourself:** Explain in two sentences why `const useX = map[kind]; useX();` is legal JavaScript and lint-clean but still a bug when `kind` changes at runtime. Then name two different fixes.

### TypeScript ergonomics

- `satisfies Record<Plan, Strategy>` (TS 4.9+) gives **exhaustiveness** *and* keeps literal types.
- Type the strategy interface once (`type Strategy = { label: string; run(input: In): Out }`); every implementation is checked against it.
- Discriminated unions + `never`-check in a `switch` give the same exhaustiveness when you'd rather keep a switch (fine for a single, localised dispatch).

## Strategy vs Neighbouring Patterns

| | Strategy | State (GoF) | Config props | Plugin/registry |
|---|---|---|---|---|
| Who selects | The client / a resolver | The object itself, as it changes | The caller via flags | Runtime registration |
| Variants change | Rarely at runtime | Constantly (transitions) | — | — |
| React analogue | Table lookup, hook factory | `useReducer` / state machines | `<Button variant>` | Provider + map |

## Gotchas

**Dynamic hook selection without `key`.** The signature bug. Same hook count *and* order across variants mask it (state swaps silently); different counts throw.

**Creating the factory hook inside render.** `const useX = createUseX(cfg)` in a component body creates a new hook function each render — hook *identity* is irrelevant to React, but the returned function's *internals* (closures over `cfg`) may change behaviour unpredictably and it defeats linting. Create at module scope.

**Strategies that reach for globals.** A "strategy" with hidden singletons or module-level state isn't swappable or testable. Pass dependencies in.

**Over-application.** Two variants, no growth expected → an `if`. Strategy adds indirection (a table, an interface, files).

**Leaky interface.** If callers still check `strategy.type === 'x'`, the abstraction failed — put the difference *behind* the interface.

**Selection logic scattered.** The pattern needs *one* place that chooses. If ten components each call `pickStrategy(user)`, centralise or inject via Context.

**Non-exhaustive tables.** `Record<string, Strategy>` lets an unknown key return `undefined` at runtime. Key by a union type and use `satisfies`.

**Stale strategy in memo deps.** If the strategy object is recreated every render and used in `useMemo`/`useEffect` deps, memoisation never hits. Hoist strategy objects.

## Interview Questions

**Q (High): What is the Strategy pattern and how would you apply it in a React codebase?**

Answer: Define a common interface for a family of interchangeable behaviours, implement each variant separately, and select one without the caller branching on type. In React I typically start with a lookup table of pure strategies (`pricing[plan].price(seats)`) used inside a single hook or component; a new variant is a new entry, not an edit to existing logic. When variants need React behaviour, I use a hook factory, a component-per-variant map, or inject the strategy through Context, depending on whether the choice can change at runtime. It's the "open for extension, closed for modification" principle applied to behaviour.

The trap: Reciting the GoF definition with no React specifics — especially without addressing hooks.

**Q (High): What's wrong with selecting a hook dynamically — `const useStrategy = map[type]; useStrategy();` — and how do you fix it?**

Answer: React tracks hook state by call order. If `type` changes while mounted, a different hook (possibly with a different internal sequence) runs in the same slots: React either throws "rendered more/fewer hooks than previous render" or, when counts match, silently mixes state. Fixes: (1) if the choice is fixed per component, select at module scope — a hook factory or just calling the specific hook; (2) if it changes, give the component a `key` on the strategy so React remounts and hook order resets; (3) render a *different component per strategy* (type change ⇒ remount); or (4) keep strategies free of hooks and have one fixed hook consume pure strategy data.

The trap: Believing the ESLint rule protects you. It only checks call *sites* (top level, `use` prefix), not that the same hook is called each render.

**Q (High): What is a hook factory and why is it "hook-safe"?**

Answer: A function that takes configuration (usually a strategy) and returns a custom hook: `createUseDiscount(strategy) → useDiscount`. It's called at module scope, so each resulting hook is a fixed function with a fixed body and a fixed sequence of internal hook calls. Components choose which hook to call *at authoring time*, so a given component instance calls the same hook every render — satisfying the Rules of Hooks — while the hooks share one implementation parameterised by the strategy.

The trap: Calling the factory inside a component's render, or thinking it makes runtime switching safe.

**Q (Medium): How do you avoid an if/else chain in a hook that returns different behaviour by type?**

Answer: Replace the branches with a table keyed by the discriminator (`satisfies Record<Type, Strategy>` for exhaustiveness), and have the hook do `strategies[type]` and call the strategy's methods. The hook body stays constant regardless of how many variants exist; each variant is tested on its own. If selection rules are complex, extract a `resolveStrategy` function.

The trap: Splitting one `if` into many small `if`s spread across files, which changes location but not the problem.

**Q (Medium): How does Context help with Strategy, and what do you gain?**

Answer: Context injects the strategy at a subtree boundary so consumers depend on the interface only. You can swap strategies per route, experiment, or test (a fake payment strategy in tests) without touching consumers. Keep strategies pure/immutable and memoise the provided value so consumers don't re-render needlessly.

The trap: Passing strategy through props for ten levels (prop drilling), or putting a hook-based strategy in context and switching it at runtime.

**Q (Low): How does Strategy differ from the State pattern or from `<Button variant="…">` props?**

Answer: Strategy varies an algorithm chosen by the client and rarely changes during an object's life. State pattern models an object whose behaviour changes as it transitions between states (in React, `useReducer` or a state machine). A `variant` prop is configuration of a single implementation — fine for styling; if each variant has *different logic*, it's really a strategy.

The trap: Treating every variant prop as needing the pattern.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can refactor an if/else chain into a `satisfies Record<Union, Strategy>` table
- [ ] Can explain precisely why dynamic hook selection breaks (call order) and give three fixes
- [ ] Can write `createUseX(strategy)` and say why calling it at module scope is essential
- [ ] Can inject a strategy via Context and explain the testing benefit
- [ ] Can state when *not* to use Strategy (two stable branches) and the "leaky interface" failure
- [ ] Can contrast Strategy with State pattern and variant props

---
*Next: [Facade Pattern](../16-facade-pattern/notes.md) — Strategy hides *variation* behind an interface; Facade hides *complexity*: one simple entry point in front of many hooks and services.*
