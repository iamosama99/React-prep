# State vs Refs, Controlled vs Uncontrolled

## Quick Reference

| Question | If the answer is… | Reach for |
|---|---|---|
| Does the value affect what's *rendered*? | Yes | State |
| Do I only need it inside handlers/effects/timers? | Yes | Ref |
| Who is the source of truth for this input? | React (need live validation, masking, cross-field logic) | Controlled (`value` + `onChange`) |
| | The DOM (read once on submit, perf-sensitive, third-party widget) | Uncontrolled (`defaultValue` + ref / `FormData`) |
| Component API: who owns `open`, `value`, `selected`? | Caller *or* component, depending on use | Support both: `value`/`defaultValue` + `onChange` |

## Where You've Seen This Before

Three separate earlier topics cover the mechanics. Read these for the "how"; this topic is the "which one, and why":

- Controlled vs uncontrolled *inputs*, file-input exception, the "uncontrolled → controlled" warning → [Phase 1: Controlled vs uncontrolled inputs](../../phase-01-fundamentals/09-controlled-vs-uncontrolled-inputs/notes.md)
- `useRef` for DOM nodes and mutable boxes, refs-vs-state table → [Phase 2: useRef](../../phase-02-hooks/05-use-ref/notes.md)
- Controlled vs uncontrolled *component API design*, `useControllable` → [Phase 4: Controlled vs uncontrolled design](../../phase-04-component-patterns/06-controlled-vs-uncontrolled-design/notes.md)
- Controlled form patterns at scale → [Phase 8: Controlled form patterns](../../phase-08-forms/01-controlled-form-patterns/notes.md)

**New here:** one unified idea — *who is the source of truth?* — that covers all three (a `useRef` box, an `<input>`, a component's `open` prop). Plus the hybrid patterns (ref + state together), `FormData` for boilerplate-free uncontrolled forms, and the React 19 form-action angle.

## What Is This?

Every value in a React UI has exactly one **source of truth**. Choosing it is the whole game:

- **State** — React owns it. Changing it schedules a render, and each render sees a fixed snapshot.
- **Ref** — *you* own it. It's a mutable box (`{ current }`) that React preserves between renders but never watches. Writing to it triggers nothing.
- **DOM** — the browser owns it (an `<input>`'s current text). You read it when you need it.

"Controlled" means React state is the source of truth and the DOM element is a mirror. "Uncontrolled" means the DOM is the source of truth and React looks at it on demand. The same distinction applies one level up to your own components: is `open` owned by the caller's state (controlled) or by the component's internal state (uncontrolled)?

```tsx
// Controlled — React is the truth, input mirrors it
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />

// Uncontrolled — DOM is the truth, we ask when we need it
const ref = useRef<HTMLInputElement>(null);
<input ref={ref} defaultValue="" />
// later: ref.current?.value
```

> **Check yourself:** A ref changes and the screen doesn't. Is that a bug in React? What would you change if the screen *should* reflect that value?

## Why Does It Exist?

**Why two ways to hold a value?** Because re-rendering is the price of reactivity. State is right whenever the value appears in the output. But many values are pure bookkeeping — a `setTimeout` id, "was this component mounted," the previous prop, the latest callback. Storing those in state would cause pointless renders (or infinite loops if set inside effects). Refs are the escape hatch for *instance variables* in a function-component world.

**Why two ways to own an input?** Because forms sit at a tension. Controlled inputs give React total awareness — live validation, input masks, conditional UI, resetting from anywhere — at the cost of a render per keystroke and boilerplate per field. Uncontrolled inputs are cheap and let the browser do what it's good at (native validation, `<form>` semantics, autofill, `FormData`), but React can't react to the value until you ask.

**Why two ways to own a *component's* state?** Because a reusable component serves two audiences. A quick prototype wants `<Accordion />` to just work. A form library or URL-synced page wants `<Accordion value={…} onChange={…} />`. Supporting both means you never have to rewrite the component when a caller's needs grow.

> **Check yourself:** Give one example where the *uncontrolled* choice is strictly better than controlled, and one where controlled is the only option.

## How It Works

### State vs ref — the render-time contract

```tsx
function Demo() {
  const [count, setCount] = useState(0);
  const clicks = useRef(0);

  const onClick = () => {
    clicks.current += 1;   // no render
    setCount(c => c + 1);  // render
  };

  console.log('render', count, clicks.current);
  return <button onClick={onClick}>{count}</button>;
}
```

| | State | Ref |
|---|---|---|
| Triggers re-render on change | Yes | No |
| Mutable in place | No (replace) | Yes (`ref.current = …`) |
| Value inside a render | Fixed snapshot | Whatever `current` is *now* |
| Safe to read/write during render | Read yes; write no | **Neither** (except lazy init) — it breaks purity and concurrent rendering |
| Right place | Anything rendered | DOM nodes, timer ids, previous values, "latest callback" |

### Refs beyond the DOM — the four everyday uses

```tsx
// 1. Previous value
function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; });   // runs AFTER render, so during render it holds the old one
  return ref.current;
}

// 2. Timer / subscription id
const timer = useRef<ReturnType<typeof setTimeout>>();

// 3. "Latest value" — read fresh data from a long-lived callback without re-subscribing
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

// 4. Skip first render / mount tracking
const first = useRef(true);
```

The "latest" pattern is the everyday answer to stale closures (Phase 2): the interval or listener is created once, and it reads `latest.current` at fire time.

### Controlled: the loop

`value` is always what state says; `onChange` proposes a new value; state decides. If you don't update state, the input visibly refuses to change. That refusal *is* the feature — it lets you veto, format or clamp input.

```tsx
<input
  value={phone}
  onChange={e => setPhone(formatPhone(e.target.value))}   // mask on the way in
/>
```

### Uncontrolled without boilerplate: `FormData`

The most under-used tool. Give inputs `name`s; read the whole form on submit — no per-field state, no refs:

```tsx
function Signup() {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));   // { email, password, plan }
    api.signup(data);
    e.currentTarget.reset();                                           // DOM-level reset
  }
  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" defaultValue="" required />
      <input name="password" type="password" required minLength={8} />
      <select name="plan" defaultValue="free"><option>free</option><option>pro</option></select>
      <button>Sign up</button>
    </form>
  );
}
```

Native constraint validation (`required`, `minLength`, `type="email"`) still works. React 19 goes further: `<form action={fn}>` calls `fn(formData)` for you, and React resets uncontrolled fields after the action — designed around this exact model (see Phase 11: Server actions).

> **Check yourself:** In the form above, how would you clear it from a "Reset" button without any state? And how would the same reset look if the inputs were controlled?

### Hybrid: each tool for its job

Most real forms mix them. Common combos:

- **Uncontrolled inputs + one piece of state** — e.g. keep the inputs uncontrolled, but hold `passwordStrength` in state, updated via `onInput` on just that field.
- **Ref for the value, state for the *display* of derived data** — e.g. a large textarea is uncontrolled for typing performance, and you copy `ref.current.value.length` into state on a debounce for a character counter.
- **Libraries** — React Hook Form is uncontrolled-first (refs + subscriptions) with escape hatches (`Controller`) for controlled UI kits. That's why it out-scales naive controlled forms (Phase 8).

### Controlled vs uncontrolled component APIs

```tsx
function useControllableState<T>({
  value, defaultValue, onChange,
}: { value?: T; defaultValue: T; onChange?: (v: T) => void }) {
  const [internal, setInternal] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const set = useCallback((next: T) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);                      // always notify, in both modes
  }, [isControlled, onChange]);

  return [current, set] as const;
}
```

`<Toggle value={on} onChange={setOn} />` is controlled; `<Toggle defaultValue />` is uncontrolled; same component. Warn in dev if `isControlled` flips between renders — that's always a caller bug.

## Decision Guide

| Situation | Choice |
|---|---|
| Live validation, input masks, character limits | Controlled |
| Dependent fields (country → state list), conditional submit-disabling | Controlled |
| Value must be set/reset from elsewhere (URL, another component) | Controlled |
| Submit-only form, native validation is enough | Uncontrolled + `FormData` |
| 50-field form, keystroke lag | Uncontrolled (or RHF) |
| `<input type="file">` | Uncontrolled — always |
| Wrapping a non-React widget (date picker lib, editor) | Uncontrolled + ref |
| Timer id, previous value, latest callback, "did it mount" | Ref |
| Anything rendered that changes over time | State |

## Gotchas

**Reading or writing `ref.current` during render.** It works in simple cases, then fails under Strict Mode or concurrent rendering because renders can be repeated or discarded. Mutate refs in effects and event handlers. (One allowed exception: lazy initialisation — `if (ref.current === null) ref.current = expensive()`.)

**`usePrevious` returns the previous *render's* value, not the previous *change*.** Any unrelated re-render (a parent update, another state) re-runs the effect with the same value, so `prev` becomes equal to `current`. If you need "the value before it last changed", track it only when the value differs (`if (ref.current !== value) { prev.current = ref.current; ref.current = value }`) or keep an explicit history in state.

**Effects depending on `ref.current`.** `useEffect(..., [ref.current])` is a bug — refs don't trigger renders, so the dependency is read once during render and never observed changing. If you need to react to a DOM node appearing, use a **callback ref** (or state set by a callback ref).

**`value={undefined}` flips a controlled input uncontrolled.** Initialising state with `undefined`/`null` from an API then filling it later triggers "changing an uncontrolled input to be controlled." Coalesce: `value={user?.name ?? ''}`.

**`value` without `onChange`** makes a read-only input (React warns). Use `defaultValue` or `readOnly` deliberately.

**A ref as the source of truth for rendered UI.** "I'll just use a ref, it's faster" — and now nothing updates. If the user should *see* it, it belongs in state.

**Controlled-input perf blame.** A single controlled input rarely lags; the real cost is usually the *rest of the tree* re-rendering on every keystroke because state sits too high. Move state down, split components, or memoise before abandoning controlled inputs.

**Resetting.** Uncontrolled: `form.reset()` or change the `key` of the input/form to remount. Controlled: set state back to initial. Changing `defaultValue` after mount does nothing.

**Callback refs and identity.** An inline `ref={node => …}` is a new function every render, so React calls the old one with `null` then the new one with the node each time. Stabilise with `useCallback` if the side effects are non-trivial.

## Interview Questions

**Q (High): What's the difference between state and a ref, and how do you choose?**

Answer: State is preserved between renders and changing it schedules a re-render; each render sees an immutable snapshot. A ref is a mutable `{ current }` box preserved between renders that React never observes — mutating it doesn't render. Use state for anything the user should see change; use refs for values that only matter to handlers, effects and timers — DOM nodes, timer ids, previous values, the latest callback. Rule of thumb: if it's used in JSX, it's state; if it's used only in event handlers/effects, a ref is fine.

The trap: "Refs are for the DOM." That's one use. Also the reverse: putting UI-visible data in a ref and wondering why nothing updates.

**Q (High): When would you pick an uncontrolled input over a controlled one?**

Answer: When I don't need to react to each keystroke. Submit-only forms with native validation, large forms where per-keystroke re-render matters, file inputs (always uncontrolled), and wrapping non-React widgets. I read values on submit through `FormData` or refs. I pick controlled when the UI must respond live — validation as you type, masks, dependent fields, or when other code needs to set the value. In practice, libraries like React Hook Form are uncontrolled-first for performance and give controlled wrappers where UI kits demand them.

The trap: "Always controlled — it's the React way." That's dogma; the docs themselves recommend controlled for most cases but acknowledge uncontrolled is valid, and `FormData` makes it clean.

**Q (High): How do you design a component that works both controlled and uncontrolled?**

Answer: Accept `value`, `defaultValue`, and `onChange`. Keep internal state initialised from `defaultValue`; treat the component as controlled iff `value !== undefined`. Read from `value` when controlled, from internal state otherwise; when the user acts, update internal state only if uncontrolled, and always call `onChange`. Extract it into a `useControllableState` hook so every component shares one implementation, and warn in dev when a component switches modes across renders.

The trap: Syncing `value` into internal state with an effect, which causes an extra render and a one-frame stale value. Derive; don't sync.

**Q (Medium): What is the "latest ref" pattern and what problem does it solve?**

Answer: Store the newest value (usually a callback or prop) in a ref updated every render — `ref.current = value` in an effect — and read `ref.current` from a long-lived callback like an interval or event listener. It avoids stale closures without re-creating the subscription on every change and without listing the value in the dependency array. The tradeoff: you lose the reactive re-subscription, so it's appropriate for values you only need "at fire time."

The trap: Using it to dodge the lint rule for a dependency that *should* re-trigger the effect.

**Q (Medium): Why is writing to `ref.current` during render a problem?**

Answer: Render must be pure — React may call it multiple times, discard it, or pause it in concurrent mode. A ref write during render is a side effect that can run for renders that never commit, leaving the ref in an inconsistent state. Mutate refs in event handlers or effects. Lazy init (`null` check) is the accepted exception.

The trap: Believing it "works in my test," without connecting it to concurrent rendering and Strict Mode's double-render.

**Q (Medium): How do you reset a form in each model?**

Answer: Uncontrolled: call `form.reset()` (restores `defaultValue`s), or change the form's `key` to remount it. Controlled: set state back to initial values. Note that changing `defaultValue` after mount has no effect — it only seeds the initial DOM value.

The trap: Trying `ref.current.value = ''` on inputs that React also thinks it controls — it desyncs state and DOM.

**Q (Low): Why do callback refs re-run on every render if defined inline?**

Answer: React compares the `ref` prop by identity. A new function each render means React calls the previous callback with `null` and the new one with the node. That's harmless for trivial ref assignments and wasteful (or buggy) for callbacks that measure or attach observers; wrap in `useCallback`. React 19 also allows callback refs to return a cleanup function.

The trap: Not knowing the `null` call happens.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can state "source of truth" for a ref, a controlled input, an uncontrolled input, and a controlled/uncontrolled component
- [ ] Can explain why refs don't re-render and why they must not be written during render
- [ ] Can write `usePrevious` and `useLatest` from memory and say what each replaces
- [ ] Can build a multi-field form with `FormData` and no per-field state
- [ ] Can write `useControllableState` and explain why `onChange` is always called
- [ ] Can name three situations for each of controlled and uncontrolled inputs

---
*Next: [Compound Components](../04-compound-component-pattern/notes.md) — with ownership of state settled, the next question is how a component family shares it without a prop-threading mess.*
