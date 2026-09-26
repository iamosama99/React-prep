# Facade Pattern

## Quick Reference

| Before | After (Facade) | Payoff |
|---|---|---|
| Component calls 6 hooks + services + flags + permission checks | `const checkout = useCheckout()` — one seam | Component reads like the UI spec |
| Component knows *how* things work (query objects, dispatch, SDK shapes) | Facade exposes **view-ready data** and **intent-named actions** | UI is decoupled from libraries |
| Swap a vendor (Segment → PostHog, REST → GraphQL) = edit every component | Change the facade only | One-place migrations |
| Testing needs 6 providers/mocks | Test the facade with fakes; test the UI with a fake facade | Small, focused tests |
| Business rules scattered across JSX | Rules live in the facade's mapping | One place to read/change the rules |

## Where You've Seen This Before

Facade overlaps with things you already know — the *distinction* is what matters:

- A hook that gathers logic for a component → [Topic 7: Custom hooks](../07-custom-hook-pattern/notes.md) and the **hook-as-container** form in [Topic 2: Container–Presenter](../02-container-presenter/notes.md). A facade *is* that shape.
- Hiding variation behind an interface → [Topic 15: Strategy](../15-strategy-pattern/notes.md) (contrast: Strategy hides *which implementation*; Facade hides *how many things*)
- A single place to wrap a service/client → the API layer in [RTK Query](../../phase-06-state-management/05-rtk-query/notes.md) or [TanStack Query](../../phase-06-state-management/09-react-query-tanstack/notes.md)
- Orchestrating several hooks with `useMemo`/`useCallback` → [useMemo](../../phase-02-hooks/06-use-memo/notes.md), [useCallback](../../phase-02-hooks/07-use-callback/notes.md)

**New here:** the *intent*. A custom hook is any reusable logic. A **facade** is a hook (or module) whose *job* is to be the single, simplified entry point between UI and **several** subsystems — with a deliberately small, UI-shaped API, and a rule that **nothing from the subsystems leaks through**.

## What Is This?

The **Facade pattern** (Gang of Four) provides a simple, unified interface to a complex subsystem. The client talks to the facade; the facade coordinates the messy parts.

In React the most useful facade is a **facade hook**:

```tsx
// Without a facade: the component is the integration point for everything
function Checkout() {
  const { items, clear } = useCart();
  const { user, isGuest } = useAuth();
  const perms = usePermissions(user);
  const flags = useFlags();
  const tax = useTax(items);
  const track = useAnalytics();
  const order = usePlaceOrder();
  // …40 lines deciding whether the button is enabled, what to show, what to track…
}

// With a facade: the component only expresses UI
function Checkout() {
  const { lines, total, canPurchase, blockedReason, status, submit } = useCheckout();
  return (
    <>
      <OrderLines lines={lines} />
      <Total value={total} />
      <button disabled={!canPurchase || status === 'submitting'} onClick={submit}>Pay</button>
      {blockedReason && <p role="alert">{blockedReason}</p>}
    </>
  );
}
```

Everything that used to be in the component — combining the subsystems, deciding, tracking — now lives in `useCheckout`. The component doesn't import `useAuth`, `useFlags`, or the analytics SDK. It couldn't tell you if the cart is in Redux, Zustand or a server cache.

> **Check yourself:** List everything `Checkout` no longer needs to import after the refactor. What would change in `Checkout` if analytics moved from one vendor to another?

## Why Does It Exist?

Components accumulate **integration responsibilities**. A "simple" screen touches auth, permissions, feature flags, data fetching, analytics, routing and validation. When the component itself wires them together:

- **It's unreadable.** The JSX is drowned in orchestration.
- **It's brittle.** A change in any subsystem's API touches every screen that uses it.
- **It's untestable in isolation.** To test a button you need all seven providers.
- **Rules are scattered.** "Guests can't purchase when the flag is off" is encoded three ways in three components.

A facade concentrates integration in **one seam**. The subsystems can evolve or be replaced behind it; the UI depends on a small, stable contract expressed in *domain/UI language* (`canPurchase`, `submit`), not *library language* (`mutation.isPending`, `dispatch({ type: 'SET' })`).

## How It Works

### Designing the facade (in this order)

1. **Start from the component's needs**, not the subsystems' capabilities. Write the JSX you *wish* you had; the values it needs are your facade's return type.
2. **Shape the return type for the UI**: display-ready values and intent-named actions.
3. **Compose the subsystems** inside; map/normalise their outputs.
4. **Return a stable, memoised object**, and stable callbacks.

```tsx
type CheckoutStatus = 'idle' | 'submitting' | 'success' | 'error';

type Checkout = {
  lines: { id: string; label: string; price: string }[];      // already formatted
  total: string;
  canPurchase: boolean;
  blockedReason: string | null;
  status: CheckoutStatus;                                       // one enum, not 3 booleans
  error: string | null;
  submit: () => Promise<void>;                                  // intent-named
};

function useCheckout(): Checkout {
  const { items, clear } = useCart();
  const { user, isGuest } = useAuth();
  const { can } = usePermissions(user);
  const { expressCheckout } = useFlags();
  const { tax } = useTax(items);
  const track = useAnalytics();
  const order = usePlaceOrder();

  const blockedReason =
    items.length === 0 ? 'Your cart is empty'
    : isGuest && !expressCheckout ? 'Sign in to check out'
    : !can('purchase') ? 'Your account cannot place orders'
    : null;

  const submit = useCallback(async () => {
    track('checkout_started', { items: items.length });
    try {
      await order.mutateAsync({ items });
      clear();
      track('checkout_completed');
    } catch { track('checkout_failed'); }
  }, [items, order, clear, track]);

  return useMemo(() => ({
    lines: items.map(i => ({ id: i.id, label: i.name, price: formatMoney(i.price) })),
    total: formatMoney(sum(items) + tax),
    canPurchase: blockedReason === null,
    blockedReason,
    status: order.isPending ? 'submitting' : order.isError ? 'error' : order.isSuccess ? 'success' : 'idle',
    error: order.error?.message ?? null,
    submit,
  }), [items, tax, blockedReason, order, submit]);
}
```

Facade rules — the checklist that separates a facade from "a big hook":

| Rule | Why |
|---|---|
| **Small API surface**, named for UI intent (`submit`, `canPurchase`) | The point is to simplify |
| **Nothing leaks**: no raw query/mutation objects, `dispatch`, SDK types, or store shapes | Otherwise the UI is still coupled to the subsystem |
| **View-ready values**: formatted, derived, mapped | UI stays declarative |
| **Collapse state into enums/unions**, not flag piles (`status` not `isLoading && !isError && …`) | Impossible states become unrepresentable |
| **Orchestrate, don't implement** — delegate to smaller hooks/services | Keeps the facade thin and testable |
| **No JSX** in the facade | It's logic, not UI (otherwise it's a component) |
| **One facade per screen/feature**, not one per app | Avoid the god hook |
| **Stable identities** (memoised return, `useCallback` actions) | Safe to pass to memoised children |

### Layering

```
UI components            ← know only the facade
  └─ Feature facade      useCheckout()      (orchestration + view model)
       └─ Domain hooks   useCart, useAuth, usePermissions, usePlaceOrder
            └─ Services  api client, analytics SDK, storage, feature-flag client
```

Each layer talks only to the layer below. That's what makes "swap the analytics vendor" a one-file change.

### Non-hook facades

Facades aren't only hooks. Any *module* that hides a messy dependency behind a clean API is one:

```ts
// analytics.ts — the rest of the app never imports Segment or PostHog
export const analytics = {
  track(name: EventName, props?: Props) {
    try { vendor.capture(name, sanitize(props)); } catch { /* never break the UI over telemetry */ }
  },
  identify(user: User) { vendor.identify(user.id, { plan: user.plan }); },
};
```

This doubles as an **anti-corruption layer**: third-party shapes, naming and quirks stop at the boundary. Common facades: API client (`api.users.list()` hiding fetch/headers/retry/auth refresh), analytics, storage, feature flags, payments SDK, WebSocket clients.

### Testing

- **Facade:** `renderHook(useCheckout, { wrapper })` with fake subsystem providers; assert the mapped output for each scenario (guest, empty cart, flag on/off, submit success/failure) and which events were tracked.
- **UI:** render `<Checkout />` with a fake `useCheckout` (module mock) returning each `status` — no providers.
- The pattern turns a wide integration test into two narrow ones.

> **Check yourself:** A teammate returns `{ ...order, items }` from the facade "for convenience." What have they broken and how would you notice in a code review?

## Facade vs Look-alikes

| Pattern | Hides | Direction |
|---|---|---|
| **Facade** | Complexity of *several* subsystems | Simplifies → one API |
| **Adapter** | A *single* incompatible interface | Translates one shape to another |
| **Strategy** ([Topic 15](../15-strategy-pattern/notes.md)) | Which of several implementations | Swappable behaviour |
| **Container** ([Topic 2](../02-container-presenter/notes.md)) | Logic from markup | Separation of concerns |
| **Mediator** | Object-to-object communication | Coordinates peers |

A facade often *uses* adapters and strategies internally, and a container is often *implemented as* a facade hook. They compose; naming the intent tells reviewers what to expect.

## When Not To Use It

- **One subsystem.** A hook that just wraps `useQuery` with a different name adds a layer for nothing.
- **A single, small component.** Three hooks in a 30-line component are readable as-is.
- **When the facade would need to expose subsystem internals** to serve the UI — then the UI genuinely needs those internals, and the facade is fighting you.

## Gotchas

**The God facade.** `useApp()` returning everything about the app re-renders every consumer for every change and becomes unownable. Scope one facade per feature/screen.

**Leaking the subsystem.** Returning raw `mutation`/`query`/`dispatch` re-couples the UI. If a consumer needs `isPending`, expose `status` — not the mutation.

**Facade = pass-through.** If every field is a rename of a subsystem field, it adds nothing. It should *compose and decide*.

**Unstable return values.** A new object and new functions every render invalidate memoised children and effect deps. Memoise the result and callbacks — or lean on the React Compiler ([Topic 13](../13-performance-advanced-patterns/notes.md)).

**Hidden side effects.** `useCheckout()` must not silently fire network calls or analytics on mount unless that's documented; side effects belong in named actions or clearly-named effects.

**Flag piles.** Returning `isLoading`, `isError`, `isSuccess`, `isIdle` separately allows impossible combinations. Return one `status`.

**Business rules duplicated in the UI.** If the component re-checks `isGuest` next to `canPurchase`, the facade isn't the single source of truth.

**Hook-order/conditional logic.** All subsystem hooks run unconditionally in the facade — put conditions *inside* (e.g. `enabled` options), never around the hook calls.

**Facade over-abstraction.** Layering facade-over-facade-over-facade for a CRUD screen is complexity theatre.

## Interview Questions

**Q (High): What is the Facade pattern and how does it apply in React?**

Answer: A facade gives a simple, unified interface to a complex set of subsystems. In React I implement it as a hook (or module) per feature — `useCheckout()` — that composes several hooks/services (cart, auth, permissions, flags, analytics, mutations) and returns a small, UI-shaped API: view-ready data plus intent-named actions. The component depends only on that hook, so it reads like the UI spec, is easy to test, and doesn't change when a subsystem or vendor changes.

The trap: Describing it as "just a custom hook." The distinguishing traits are: single seam over *multiple* subsystems, deliberately small API, and nothing leaking through.

**Q (High): How is a facade different from a custom hook, a container, and an adapter?**

Answer: A custom hook is any reusable logic. A container separates logic from markup; in modern React it's often implemented *as* a hook. A facade's intent is to simplify and decouple from *several* subsystems behind a small contract. An adapter converts *one* interface to another. In practice a facade hook is the container's logic layer, uses adapters to normalise third-party shapes, and may use strategies for variation.

The trap: Treating the terms as interchangeable or being unable to say what *intent* separates them.

**Q (High): What should and shouldn't a facade hook return?**

Answer: Should: view-ready values (formatted, derived, mapped), a single `status` enum instead of flag piles, intent-named actions (`submit`, `retry`), and a memoised, stable shape. Shouldn't: raw query/mutation objects, `dispatch`, store/SDK types, JSX, or a grab-bag of everything the subsystems expose. If the UI needs something, add a named field for it.

The trap: "Return everything so the component has flexibility" — the flexibility *is* the coupling the pattern removes.

**Q (Medium): How do you test a facade and the component that uses it?**

Answer: Test the facade with `renderHook` and fake providers/mocks for the subsystems: assert the output for each scenario and that the right side effects (tracking, mutations) happened. Test the component by mocking the facade module to return each `status`/`blockedReason` variant — no providers needed. Two narrow tests replace one wide integration test; keep one or two end-to-end tests for the wiring.

The trap: Only integration-testing everything through the UI, or mocking each subsystem inside component tests.

**Q (Medium): How does a facade help when swapping a library or vendor?**

Answer: All knowledge of the old library is inside the facade (or the service layer beneath it), so migration is a change to that one place; UI code depends on the contract. It acts as an anti-corruption layer: third-party types and quirks never cross the boundary. I'd keep the facade contract expressed in domain terms so it can survive the swap unchanged.

The trap: Claiming abstraction is free — the contract must be designed well or the swap will still force UI changes.

**Q (Medium): What are the risks of facades?**

Answer: God facades that everything depends on and re-render together; leaky facades that expose subsystem types; pass-through facades that add indirection without value; unstable return values that defeat memoisation; hidden side effects; and layers piled beyond what the problem needs. Mitigate by scoping to a feature, keeping the API minimal and UI-shaped, memoising, and only introducing a facade when a component is integrating multiple concerns.

The trap: Presenting it as always beneficial.

**Q (Low): Where would you put a facade for a third-party SDK like analytics or payments?**

Answer: In a plain module under a services layer (`analytics.ts`) exposing an app-specific API (`track(event, props)`), with try/catch so telemetry never breaks the UI, and mocked in tests. React hooks (`useAnalytics`) sit above it if components need a hook form or context-provided instance.

The trap: Importing the vendor SDK directly in components.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can define Facade and explain what makes a facade hook different from an arbitrary custom hook
- [ ] Can refactor a component with 5+ hooks into a facade and a UI-only component
- [ ] Can list six facade rules (small API, no leaks, view-ready, status enum, orchestrate-not-implement, stable identity)
- [ ] Can draw the layering (UI → facade → domain hooks → services) and explain the swap-a-vendor benefit
- [ ] Can explain how to test the facade and the UI separately
- [ ] Can name five gotchas including the God facade and leaking subsystems

---
*Next: [Error Boundary Pattern](../17-error-boundary-pattern/notes.md) — a facade tidies the happy path; an error boundary decides what happens to the tree when the unhappy path throws.*
