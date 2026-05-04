# Function vs Class Components

Interviewers ask this less to test syntax knowledge and more to see if you understand *why* the ecosystem moved on. A mid-level answer is "functions are simpler." A senior answer explains the mental model difference, what problem hooks actually solved, and the specific cases where class components still matter — including one that has no function-based replacement even in 2026.

## The Core Mental Model Difference

A class component is an *instance*. When React mounts a class component, it creates an object from the class. That object persists for the lifetime of the component. `this.state` and `this.props` live on that instance, and every lifecycle method runs in the context of that same, mutating object. When state updates, the instance stays alive — only `this.state` and `this.props` change on it.

A function component is just a *function call*. Every render is a fresh invocation. There is no persistent object, no `this`, no instance. React calls your function, gets back elements, and discards the call frame. State and refs are stored externally by React — the function just reads and returns.

This distinction matters because it changes how you reason about values over time. In a class component, `this.props` always refers to *current* props — reading `this.props.value` inside a timeout will give you whatever `value` is at the time the timeout fires, not the value that was there when you registered it. In a function component, a closure captures the props at the time the render ran. This is why function components are described as capturing a *snapshot* of the render, while class components follow references to shared mutable state.

Dan Abramov demonstrated this with a vivid bug: follow a user on a class component, wait for a timeout, and then immediately switch to a different user — the alert fires with the *new* user's name. The same code in a function component alerts the *original* user, because the closure captured that render's props. Neither behavior is always right, but function components make the default consistent and predictable.

## Why Hooks Were the Inflection Point

Before hooks, reusing stateful logic between components required awkward workarounds: HOCs (higher-order components) and render props. Both work by wrapping a component in another component to inject behavior. The problem was that as you composed more behaviors, you'd end up with deeply nested wrappers — the "wrapper hell" visible in React DevTools as a stack of `<WithAuth>`, `<WithTheme>`, `<WithAnalytics>`. Each wrapper was invisible in the UI but added noise to debugging and made prop flow hard to trace.

Hooks solved this by letting you extract stateful logic into a plain function — a custom hook — and compose multiple of them inside a single component without any wrapping. `useAuth()`, `useTheme()`, `useAnalytics()` all coexist flat inside one function component. The component tree stays clean; the logic lives in reusable functions.

The other driver was lifecycle complexity. In class components, related logic was split across `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount`. A data-fetching side effect would be started in `componentDidMount`, cleaned up in `componentWillUnmount`, and re-run when props changed in `componentDidUpdate` — three methods, one concern. `useEffect` collocates setup and cleanup together, organized by concern rather than by lifecycle phase.

## When Class Components Still Appear

In greenfield code today, you will almost never write a class component. But you'll encounter them in production codebases and in interviews for two reasons.

First, many large codebases have class components that predate hooks and haven't been fully migrated. Understanding lifecycle methods and `this` binding is still a practical skill.

Second, and more importantly: **error boundaries must be class components**. As of 2026, there is no hooks-based API for catching render errors in the component tree. The `componentDidCatch` and `getDerivedStateFromError` lifecycle methods are the only way to implement an error boundary, and they are only available on class components. This is a genuine architectural reason to know class syntax.

## Side-by-Side Comparison

The same component, both styles:

```jsx
// Class
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this);
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  componentDidMount() {
    document.title = `Count: ${this.state.count}`;
  }

  componentDidUpdate() {
    document.title = `Count: ${this.state.count}`;
  }

  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
```

```jsx
// Function
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

The function version is shorter, but the substantive difference is that the document title logic is colocated with the state it depends on. In the class version, that same logic is split across two lifecycle methods.

## Gotchas

**`this` binding in class components is manual.** Methods defined on a class do not automatically bind `this` to the instance. Passing an unbound method as a prop (`onClick={this.handleClick}`) will lose the `this` context when called. You must bind in the constructor or use class field syntax (`handleClick = () => {...}`). Forgetting this is a classic class component bug.

**`PureComponent` is not the same as `React.memo`.** Both optimize rendering via shallow comparison, but `PureComponent` is a base class for class components and `React.memo` is a higher-order component for function components. They are not interchangeable.

**You cannot use hooks inside class components.** Hooks rely on React's internal fiber and are only called by the React runtime when it invokes a function component. Trying to call `useState` inside a class method will throw. If you need to use a hook's behavior in a class component, you must wrap it: create a function component that uses the hook and passes the value down as a prop, or use a HOC.

**Migrating class components is not always straightforward.** Lifecycle methods like `componentDidUpdate` have fine-grained control over when they run (comparison logic inside the method). Translating those to `useEffect` requires careful dependency arrays and sometimes `useRef` to track previous values.

## Interview Questions

**Q: Why did the React ecosystem move from class components to function components?**

Strong answer: Two main reasons. First, sharing stateful logic required HOCs or render props in the class era — these worked but created wrapper hell in the component tree and obscured data flow. Hooks let you extract and compose stateful logic as plain functions without wrapping. Second, class components split related logic across lifecycle methods by *phase* (mount, update, unmount) rather than by *concern*. A single side effect — say, subscribing to a WebSocket — would be set up in `componentDidMount`, torn down in `componentWillUnmount`, and re-subscribed in `componentDidUpdate`. `useEffect` keeps setup and cleanup together. There's also a subtler advantage: function components model rendering as a pure function of props/state, capturing a snapshot per render, which makes reasoning about values over time more predictable.

The trap: Saying "functions are simpler syntax." That's true but shallow. The interviewer is probing for understanding of the real motivation — reusability and lifecycle cohesion.

---

**Q: Is there anything you still need class components for?**

Strong answer: Yes — error boundaries. `componentDidCatch` and `getDerivedStateFromError` are the only APIs for catching render-phase errors in the component tree, and they require class syntax. There is no hooks equivalent. In practice most teams have a single `ErrorBoundary` class component at the app level (or use a library like `react-error-boundary`) and write everything else as function components.

The trap: Saying "no, hooks can do everything." This is wrong, and interviewers specifically use this question to find out if you know the error boundary exception.

---

**Q: What is the difference between `PureComponent` and `React.memo`?**

Strong answer: Both implement a shallow comparison optimization to skip re-renders when props haven't changed. `PureComponent` is a base class — you extend it instead of `Component` in a class component. `React.memo` is a higher-order component — you wrap a function component with it. Behavior is equivalent: if the shallow comparison says props are the same, the render is skipped. Both can receive a custom comparison function (`shouldComponentUpdate` for PureComponent, a second argument to `React.memo`).

The trap: Thinking they are the same thing or interchangeable across component types. They apply to different paradigms.

---

**Q: In a class component, `this.props` always reflects current props. Why can that be a bug?**

Strong answer: Because code that closes over `this.props` asynchronously — inside a `setTimeout`, a Promise, an event listener — will read whatever `this.props` is *at the time of execution*, not at the time the code was registered. If props change between registration and execution, the async code silently operates on stale or incorrect data. Function components don't have this problem by default: each render creates a closure that captures the props of that render, so async callbacks carry the value they saw when they were created.

The trap: Missing that this is actually a correctness problem, not just a style preference. In certain UIs — like following/unfollowing a user and immediately navigating away — the class behavior produces observable bugs.

---

*Next: Props, props.children, and defaultProps — now that you know how components are defined, the next question is how data moves into them and what patterns and pitfalls come with that.*
