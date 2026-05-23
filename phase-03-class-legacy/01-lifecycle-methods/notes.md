# Lifecycle Methods

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Mount phase | constructor → getDerivedStateFromProps → render → componentDidMount | The sequence every class component follows on first appearance |
| `componentDidMount` | Fires once after the DOM is ready | The correct place for data fetching, subscriptions, timers |
| `componentDidUpdate` | Fires after every subsequent re-render | Respond to prop/state changes; always guard with a comparison |
| `componentWillUnmount` | Fires just before the component is removed | Clean up everything set up in componentDidMount to prevent leaks |
| Deprecated methods | `componentWillMount`, `componentWillReceiveProps`, `componentWillUpdate` | Unsafe in concurrent mode — replaced by commit-phase equivalents |

## What Is This?

Class components go through three distinct phases during their existence: **mounting** (born into the DOM), **updating** (re-rendering when props or state change), and **unmounting** (removed from the DOM). React exposes hooks into each of these phases as methods you override on the class. These are lifecycle methods.

```js
class Timer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { seconds: 0 };
  }

  componentDidMount() {
    this.interval = setInterval(() => {
      this.setState(s => ({ seconds: s.seconds + 1 }));
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return <div>{this.state.seconds}s</div>;
  }
}
```

This is the class-world equivalent of `useEffect` — same concerns, different form.

---

## Why Does It Exist?

Before hooks (React 16.8), class components were the only way to use local state and perform side effects. The lifecycle methods were how you answered "when do I run this code?" — which is the same question hooks answer, just with a more imperative API.

React's team designed these methods around a predictable sequence: render the output, commit to the DOM, notify the component. Every lifecycle method maps to a moment in that sequence.

---

## How It Works

### The Mount Phase

When a component first appears in the tree, React runs these in order:

**1. `constructor(props)`**

Called before anything else. Use it to initialize `this.state` and bind event handlers. You must call `super(props)` first — without it, `this.props` is undefined inside the constructor.

```js
constructor(props) {
  super(props);
  this.state = { count: 0 };
  this.handleClick = this.handleClick.bind(this);
}
```

Don't fetch data here. Don't set state from props here unless you have a good reason (see `getDerivedStateFromProps`).

**2. `static getDerivedStateFromProps(props, state)`**

A static method — no access to `this`. React calls this before every render (mount and update). Return an object to merge into state, or `null` to change nothing. Covered in depth in the next topic.

**3. `render()`**

The only required lifecycle method. Must be pure — no side effects, no `setState`. Returns JSX (or `null`, or an array). React calls this during both mount and update.

**4. `componentDidMount()`**

Fires after React inserts the component into the DOM. This is the right place for:
- Fetching data
- Starting subscriptions, timers, intervals
- Measuring DOM nodes
- Setting up WebSocket connections

```js
componentDidMount() {
  fetch('/api/user')
    .then(r => r.json())
    .then(user => this.setState({ user }));
}
```

The equivalent of `useEffect(() => { ... }, [])`.

---

> **Check yourself:** In the mount phase, what is the correct order of the four main steps from constructor to componentDidMount? Can you name them in sequence without looking?

---

### The Update Phase

Triggered when props change (parent re-renders) or `this.setState` is called.

**1. `static getDerivedStateFromProps(props, state)`**

Runs again before every update render.

**2. `shouldComponentUpdate(nextProps, nextState)`**

Return `false` to bail out of the re-render entirely. Return `true` (the default) to continue. This is a performance optimization — misuse breaks correctness. Covered in depth in topic 3.

**3. `render()`**

Same as mount, but React now diffs the output against the previous render.

**4. `getSnapshotBeforeUpdate(prevProps, prevState)`**

Runs after render but before React mutates the DOM. Whatever you return here gets passed as the third argument to `componentDidUpdate`. Used for reading DOM state (scroll position, measured heights) before it changes.

```js
getSnapshotBeforeUpdate(prevProps, prevState) {
  if (prevProps.list.length < this.props.list.length) {
    const list = this.listRef.current;
    return list.scrollHeight - list.scrollTop;
  }
  return null;
}

componentDidUpdate(prevProps, prevState, snapshot) {
  if (snapshot !== null) {
    const list = this.listRef.current;
    list.scrollTop = list.scrollHeight - snapshot;
  }
}
```

The only legitimate use case for `getSnapshotBeforeUpdate` is scroll position preservation in chat-style UIs.

**5. `componentDidUpdate(prevProps, prevState, snapshot)`**

Fires after the DOM is updated. Use it to respond to prop/state changes — fetching data when a filter changes, updating an external library, etc.

```js
componentDidUpdate(prevProps) {
  if (prevProps.userId !== this.props.userId) {
    this.fetchUserData(this.props.userId);
  }
}
```

The equivalent of `useEffect(() => { ... }, [dependency])`. Always guard with a comparison — otherwise you get infinite loops.

---

### The Unmount Phase

**`componentWillUnmount()`**

Fires right before React removes the component from the DOM. Clean up everything you set up in `componentDidMount`: clear timers, cancel requests, remove event listeners, close connections.

```js
componentWillUnmount() {
  clearInterval(this.interval);
  this.abortController.abort();
  window.removeEventListener('resize', this.handleResize);
}
```

The equivalent of the cleanup function returned from `useEffect`.

---

### Error Handling

**`static getDerivedStateFromError(error)`**

Called when a descendant throws during render. Return state to render a fallback UI. This makes the class an error boundary.

**`componentDidCatch(error, info)`**

Called after `getDerivedStateFromError` when the error has been caught. Use it to log errors to a reporting service. Covered in depth in topic 5.

---

> **Check yourself:** What is `getSnapshotBeforeUpdate` for, and what happens to its return value? Where does that value end up?

---

## The Deprecated Methods

React 16.3 deprecated three lifecycle methods because they were frequently misused and caused bugs in concurrent mode (where React can interrupt, abandon, and restart renders):

| Deprecated | Replacement |
|---|---|
| `componentWillMount` | `constructor` or `componentDidMount` |
| `componentWillReceiveProps` | `getDerivedStateFromProps` |
| `componentWillUpdate` | `getSnapshotBeforeUpdate` |

They were prefixed with `UNSAFE_` (e.g., `UNSAFE_componentWillMount`) to signal the danger without breaking existing code. Still work, still bad practice.

The core problem: these ran before React committed to the DOM, in the "render phase." In concurrent mode, that phase can run multiple times. Side effects in the render phase — the main sin of these deprecated methods — produce duplicated or inconsistent behavior.

---

## Lifecycle-to-Hook Equivalents

| Class lifecycle | Hook equivalent |
|---|---|
| `constructor` | `useState` initial value, `useRef` |
| `componentDidMount` | `useEffect(() => {...}, [])` |
| `componentDidUpdate` | `useEffect(() => {...}, [dep])` |
| `componentWillUnmount` | `useEffect` cleanup function |
| `shouldComponentUpdate` | `React.memo` / `useMemo` / `useCallback` |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` (partial) |
| `getDerivedStateFromError` | No hook equivalent — must be a class |
| `componentDidCatch` | No hook equivalent — must be a class |

---

## Gotchas

**`componentDidMount` runs after the first paint in some modes.** In concurrent mode, it's after commit (DOM is ready) but may not be the same tick as the paint. For synchronous DOM reads, `useLayoutEffect` / `getSnapshotBeforeUpdate` are safer.

**`setState` in `componentDidUpdate` causes a second render.** That's unavoidable sometimes, but always guard it with `if (prevProps.x !== this.props.x)` or you'll loop forever.

**`constructor` side effects run in StrictMode twice.** React 18 double-invokes the constructor in development. If you do async work in the constructor (you shouldn't), it runs twice.

**`componentWillUnmount` doesn't fire on every remount in StrictMode.** React 18 simulates mount → unmount → remount to check cleanup correctness, and `componentWillUnmount` fires in the middle of that cycle. Your cleanup code must be idempotent.

**`getSnapshotBeforeUpdate` return value is passed as the third arg to `componentDidUpdate` — not as state.** It's a synchronous data handoff between pre-mutation and post-mutation, not a state update. Many devs forget this and try to access it from `this.state`.

**You cannot call `setState` in `render()`.** This creates an infinite loop. React throws an error in development but the loop will still happen before the throw.

---

## Interview Questions


**Q (High): Walk me through the complete lifecycle of a React class component.**

Answer: Three phases. Mount: constructor initializes state and binds handlers → `getDerivedStateFromProps` derives any state from props → `render` returns the element tree → React commits to the DOM → `componentDidMount` fires (side effects go here). Update: triggered by `setState` or prop change → `getDerivedStateFromProps` → `shouldComponentUpdate` (can bail out) → `render` → `getSnapshotBeforeUpdate` (captures DOM state before changes) → React commits → `componentDidUpdate` (respond to changes, compare prev vs current props/state). Unmount: `componentWillUnmount` fires → component is removed.

The trap: candidates forget `getSnapshotBeforeUpdate`, mix up the order of `getDerivedStateFromProps` and `shouldComponentUpdate`, or say `componentDidMount` fires before the DOM is updated (it fires after).

---

**Q (High): Why were `componentWillMount`, `componentWillReceiveProps`, and `componentWillUpdate` deprecated?**

Answer: All three run in the render phase — before React commits to the DOM. In concurrent mode, React can interrupt a render, throw it away, and restart it. That means render-phase methods can fire multiple times for a single logical update. The deprecated methods were routinely used for side effects (data fetching, subscriptions), which became non-deterministic when they started firing multiple times. The replacements (`componentDidMount`, `getDerivedStateFromProps`, `getSnapshotBeforeUpdate`) either run in the commit phase (once, reliably) or are pure functions that tolerate multiple calls.

The trap: just saying "they're deprecated" without explaining why concurrent mode made them unsafe. Interviewers want to see you understand the render vs. commit phase distinction.

---

**Q (Medium): What's the difference between `componentDidMount` and `componentDidUpdate`? When would you use each?**

Answer: `componentDidMount` fires once, after the initial render, when the component is first in the DOM. Use it for one-time setup: fetching initial data, starting subscriptions, setting up third-party library instances. `componentDidUpdate` fires after every subsequent re-render. Use it to respond to changes — re-fetching data when a prop changes, triggering animations based on state changes. The key difference: `componentDidUpdate` receives `prevProps` and `prevState`, so you can compare and act only when something specific changed. Without that guard, every update triggers the effect infinitely.

---

**Q (Medium): What is `getSnapshotBeforeUpdate` and when would you actually use it?**

Answer: It runs synchronously after `render` but before React applies the DOM changes. Whatever it returns gets passed to `componentDidUpdate` as the third argument. The canonical use case is preserving scroll position in a chat UI or feed. You read the current scroll height before new messages are added, then in `componentDidUpdate` you restore the position so the user's viewport doesn't jump. The sync read is the key — `componentDidUpdate` fires after the DOM mutation, so by then the scroll position has already shifted and you can't read the pre-mutation state. There's no clean hook equivalent; `useLayoutEffect` gets you close but doesn't give you access to the pre-mutation DOM in quite the same way.

---
**Q (Low): Can you call `setState` in `componentDidMount`? What happens?**

Answer: Yes, you can. React will trigger a second render immediately after the first one, before the browser paints — so the user never sees the intermediate state. This is how libraries initialize from DOM measurements (e.g., knowing the width of a container before showing content). The cost is that two renders happen on mount instead of one. Avoid it when you can initialize state in the constructor, but it's legitimate for DOM-dependent initialization.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can list all mount-phase methods in the correct order from constructor to componentDidMount
- [ ] Can explain why `componentDidUpdate` needs a conditional guard and what happens without one
- [ ] Can describe what `getSnapshotBeforeUpdate` does and where its return value ends up
- [ ] Can name the three deprecated lifecycle methods and explain why concurrent mode made them unsafe
- [ ] Can write the `componentDidMount` / `componentWillUnmount` pattern for a timer from memory
- [ ] Can map each class lifecycle to its hook equivalent

---

*Next: getDerivedStateFromProps — the specific lifecycle method that replaced `componentWillReceiveProps`, and why its API is designed the way it is.*
