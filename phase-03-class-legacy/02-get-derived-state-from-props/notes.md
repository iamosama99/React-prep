# getDerivedStateFromProps

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| `getDerivedStateFromProps` | Static method called before every render; returns state update or null | Replaces the unsafe `componentWillReceiveProps` |
| Static by design | No `this`, no `setState`, no side effects allowed | Forces purity so it's safe to call multiple times in concurrent mode |
| Storing prev props in state | The only way to compare incoming props against previous props | Required pattern because the method has no access to previous props |
| "Almost never needed" | The React team's own framing | A `key` prop or `componentDidUpdate` usually solves the same problem more simply |

## What Is This?

`getDerivedStateFromProps` is a static lifecycle method that React calls before every render — both on mount and on every update. It receives the current props and current state, and returns either an object to merge into state or `null` to leave state unchanged.

```js
class EmailInput extends React.Component {
  state = { email: this.props.defaultEmail };

  static getDerivedStateFromProps(props, state) {
    if (props.userEmail !== state.prevUserEmail) {
      return {
        email: props.userEmail,
        prevUserEmail: props.userEmail,
      };
    }
    return null;
  }

  render() {
    return (
      <input
        value={this.state.email}
        onChange={e => this.setState({ email: e.target.value })}
      />
    );
  }
}
```

The method is deliberately static — you have no access to `this`, no access to previous props, and you cannot call `this.setState`. It's designed to be pure.

---

## Why Does It Exist?

The original method for syncing props to state was `componentWillReceiveProps`. It had a fundamental problem: it ran in the render phase, where React can (in concurrent mode) invoke things multiple times. This made it unsafe for side effects. But worse, its common usage patterns were subtly wrong even in legacy mode.

The most common `componentWillReceiveProps` pattern looked like this:

```js
// UNSAFE — the old way
componentWillReceiveProps(nextProps) {
  if (nextProps.userId !== this.props.userId) {
    this.setState({ userData: null });
    this.fetchUserData(nextProps.userId);
  }
}
```

This looks reasonable but has a race condition: the fetch is a side effect in the render phase. If React rerenders the component for an unrelated reason (parent re-renders), `componentWillReceiveProps` fires again. The fetch might fire twice. And because `fetchUserData` is async, the results can arrive out of order.

`getDerivedStateFromProps` solves the render-phase problem by making the method static and purely functional — it can only compute derived state, nothing else. Side effects must go in `componentDidUpdate`.

The name "getDerived**State**FromProps" is literal: its only job is to derive state from props. If you find yourself doing anything else in it, you're misusing it.

---

> **Check yourself:** Why is `getDerivedStateFromProps` a static method? What does making it static prevent you from doing, and why does that matter in concurrent mode?

---

## How It Works

React calls it on every render cycle, before `render()` is called. The sequence is:

```
props change → getDerivedStateFromProps → shouldComponentUpdate → render → commit → componentDidUpdate
```

```js
static getDerivedStateFromProps(nextProps, currentState) {
  // Return an object to update state
  // Return null to make no changes
}
```

Because it has no access to `this`, you can't read previous props directly. The pattern for tracking previous props is to store them in state:

```js
static getDerivedStateFromProps(props, state) {
  if (props.value !== state.prevValue) {
    return {
      derivedValue: expensiveComputation(props.value),
      prevValue: props.value,   // mirror props into state for next comparison
    };
  }
  return null;
}
```

This is a bit ugly — storing "prevValue" in state feels wrong. The React team acknowledges this. It's a deliberate trade-off to make the method static (and thus safe for concurrent mode).

---

## When You Actually Need It

**Almost never.** The React docs call it an "escape hatch for rare use cases." Before reaching for it, ask:

1. **Do you need to reset state when a prop changes?** Use a `key` prop instead — changing the key unmounts and remounts the component with fresh state.
2. **Do you need to recompute something expensive when props change?** Compute it in `render()`, or memoize with `useMemo` in functional components.
3. **Do you need to perform a side effect when props change?** That belongs in `componentDidUpdate`, not `getDerivedStateFromProps`.

The cases where `getDerivedStateFromProps` is genuinely warranted: controlled components with internal state that needs to be overridable by props (e.g., an input that can be both controlled and partially uncontrolled). Even then, there are often better designs.

---

> **Check yourself:** A developer wants to fetch new data whenever the `userId` prop changes. They reach for `getDerivedStateFromProps`. What's wrong with this, and where should the side effect actually go?

---

## Common Antipatterns

**Mirroring props into state unconditionally:**

```js
// BUG: this kills any user edits
static getDerivedStateFromProps(props, state) {
  return { value: props.value }; // always overwrites state
}
```

Every time the parent re-renders (even for unrelated reasons), the user's input gets clobbered. The guard (`if (props.value !== state.prevValue)`) is what makes the pattern safe.

**Fetching data inside getDerivedStateFromProps:**

```js
// WRONG — static method, but you might try dispatching an action
static getDerivedStateFromProps(props, state) {
  if (props.userId !== state.prevUserId) {
    fetchUser(props.userId); // side effect! wrong place!
    return { prevUserId: props.userId };
  }
  return null;
}
```

Side effects in `getDerivedStateFromProps` can fire multiple times per actual update in concurrent mode. Put side effects in `componentDidUpdate`.

---

## The Functional Equivalent

In functional components, there's no `getDerivedStateFromProps`. You have two options:

**Option 1 — Derive during render (no state needed):**
```js
function Component({ rawValue }) {
  const derivedValue = expensiveComputation(rawValue); // recomputes every render
  // or:
  const derivedValue = useMemo(() => expensiveComputation(rawValue), [rawValue]);
}
```

**Option 2 — State update on prop change:**
```js
function Component({ userId }) {
  const [data, setData] = useState(null);
  const [prevUserId, setPrevUserId] = useState(userId);

  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setData(null); // reset state during render
  }
  // ...
}
```

React allows `setState` calls during render as long as they're conditional — they trigger a synchronous re-render before the browser paints. This is the functional equivalent of `getDerivedStateFromProps`, and it's just as rare and just as ugly.

---

## Gotchas

**It runs on every render, not just when props change.** A `setState` call also triggers `getDerivedStateFromProps`. This surprises developers who think of it as "triggered by props." If your computation is expensive, memoize the result yourself inside the method (or just use `useMemo` in functional components).

**You cannot access previous props.** Unlike `componentDidUpdate`, you only get current props and current state. If you need to compare against previous props, you must store the previous prop value in state.

**Returning `null` is explicit.** Unlike `shouldComponentUpdate`, returning nothing (`undefined`) is treated as a bug in development mode. Always return either an object or `null`.

**It can cause infinite loops if you're not careful.** If you return state that changes on every call (e.g., creating a new object reference each time), and that state change triggers another render, you loop. Always return `null` when nothing needs to change.

**`getDerivedStateFromProps` runs before `shouldComponentUpdate`.** If you update state in `getDerivedStateFromProps`, that doesn't bypass `shouldComponentUpdate` — the new state is factored in when `shouldComponentUpdate` evaluates `nextState`.

---

## Interview Questions


**Q (High): What problem does `getDerivedStateFromProps` solve, and why is it static?**

Answer: It replaced `componentWillReceiveProps`, which was unsafe in concurrent mode because it ran in the render phase where React can interrupt and restart work. The static design is deliberate: by removing `this`, React makes it impossible to call `setState`, trigger subscriptions, or cause other side effects. The method can only read props and state and return new state — which makes it safe to call multiple times per commit. The trade-off is that you lose access to previous props and must store them in state if you need to compare.

The trap: just saying "it's safer" without explaining why — which requires understanding the render phase vs. commit phase distinction.

---

**Q (High): When would you use `getDerivedStateFromProps` vs a `key` prop to reset state?**

Answer: The `key` approach is simpler and almost always preferable. Changing a component's `key` causes React to unmount the old instance and mount a fresh one — state is reset automatically. Use this when you want a full reset when an identity changes (e.g., switching between users in a profile form). Use `getDerivedStateFromProps` when you need more control: for example, you want to reset some state but preserve other state when a prop changes, or you want to accept the new prop value as a starting point but still allow the user to edit it locally. The key trade-off: `key` is a blunt instrument (everything resets, component remounts), while `getDerivedStateFromProps` gives surgical control.

---

**Q (Medium): You have a controlled input that should sync to `props.value` when `props.userId` changes but should let the user edit freely otherwise. How would you implement this?**

Answer: Store `prevUserId` in state. In `getDerivedStateFromProps`, compare the incoming `userId` against `prevUserId`. If they differ, update both the input value and `prevUserId`. If they're the same, return `null` so user edits (which only change `value` in state, not `userId` in props) aren't reverted.

```js
static getDerivedStateFromProps(props, state) {
  if (props.userId !== state.prevUserId) {
    return {
      value: props.value,
      prevUserId: props.userId,
    };
  }
  return null;
}
```

The trap: returning `{ value: props.value }` unconditionally, which overwrites user edits on every parent re-render.

---
**Q (Low): Can `getDerivedStateFromProps` cause a re-render by itself?**

Answer: Yes — returning a non-null object triggers a state merge, which causes a re-render. But it won't cause infinite loops on its own because the returned state is merged before `render()` runs, not after — so it doesn't trigger another cycle. The danger is if you return a new object reference every time (e.g., `return { options: [...props.options] }`), and some downstream check uses reference equality — that can cause unnecessary re-renders but not infinite loops.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why `getDerivedStateFromProps` is static and what that prevents
- [ ] Can describe the "store prevProps in state" pattern and why it's necessary
- [ ] Can name the three alternatives to reach for before using `getDerivedStateFromProps`
- [ ] Can explain the unconditional-mirroring antipattern and why it breaks user input
- [ ] Can articulate the difference between using `key` vs. `getDerivedStateFromProps` to reset state

---

*Next: shouldComponentUpdate — how to manually control whether a component re-renders, which underpins PureComponent and the class-world equivalent of React.memo.*
