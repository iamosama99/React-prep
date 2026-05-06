# Function vs Class Components

## What Is This?

In React, a **component** is the fundamental building block — a piece of UI with its own logic, state, and output. There are two ways to define one.

**A function component** is a plain JavaScript function that takes props and returns JSX:

```jsx
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>;
}
```

**A class component** is an ES6 class that extends `React.Component`, has a `render()` method, and uses `this.state` and `this.props`:

```jsx
class Greeting extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

Both define components. Both can receive props, render JSX, and show up in your component tree identically. But they have fundamentally different mental models, and understanding the difference is what this topic is actually about.

---

## Why Two Approaches Exist — The History

React was released in 2013. JavaScript at the time didn't have a clean way to share behavior between objects, and the React team wanted a familiar model for developers coming from OOP backgrounds. So they built the class-based component model: you extend `React.Component`, override `render()`, and use lifecycle methods like `componentDidMount`.

Function components existed from early on, but they were "dumb" — they could accept props and return JSX, but they had no way to hold state or run side effects. They were only useful for simple display logic.

**In February 2019, React 16.8 shipped with Hooks.** Hooks gave function components the ability to manage state (`useState`), run side effects (`useEffect`), access context, and more. Overnight, function components could do everything class components could, plus one thing class components couldn't: easily share stateful logic between components without restructuring the component tree.

From that point, the community started preferring function components with hooks for all new code. Class components didn't disappear — codebases still full of them exist — but greenfield React code has been almost exclusively function-based since 2019.

---

## The Core Mental Model Difference — This Is What Interviewers Are Actually Testing

This is the deep part. Both types render UI, but they have a different relationship with *time*.

### Class components are instances

When React mounts a class component, it calls `new MyComponent(props)` and holds onto that object for the entire lifetime of the component. One object, persisting across renders. `this.state` and `this.props` are properties on that living object — they get mutated when state updates or new props arrive.

Because of this, inside any method — a click handler, a timeout callback, a promise `.then()` — `this.props` and `this.state` always refer to *whatever the current values are at the time of access*.

### Function components are snapshots

Every time React needs to render a function component, it *calls the function*. Fresh invocation, fresh local variables, fresh closure. There's no persistent object. State is stored externally by React (in the fiber), and the function just reads it for that call.

This means every render captures its own snapshot of props and state. A callback created during render closes over *that render's values*, not some shared mutable reference.

### Why does this matter in practice?

Here's a concrete example. Imagine a follow button. When clicked, it waits 3 seconds and then shows a confirmation alert:

**Class component version:**
```jsx
class FollowButton extends React.Component {
  handleClick = () => {
    setTimeout(() => {
      alert(`You followed ${this.props.username}`);
    }, 3000);
  };

  render() {
    return <button onClick={this.handleClick}>Follow {this.props.username}</button>;
  }
}
```

**Function component version:**
```jsx
function FollowButton({ username }) {
  function handleClick() {
    setTimeout(() => {
      alert(`You followed ${username}`);
    }, 3000);
  }

  return <button onClick={handleClick}>Follow {username}</button>;
}
```

Now do this: click Follow on `userA`, then *immediately* switch to `userB` (which re-renders the component with a new `username` prop), wait 3 seconds.

- **Class component alerts:** "You followed userB" — because `this.props.username` was read at alert time, by which point props had changed.
- **Function component alerts:** "You followed userA" — because `username` was captured in the closure at click time.

Neither is always "correct" — it depends on what you want. But the function component behavior is more predictable: what you closed over is what you get. The class component behavior requires careful thought about *when* you're reading `this.props`.

This "capture at render time" behavior is what people mean when they say function components have clearer semantics around values over time. It also directly motivates the **stale closure problem** in hooks — but that's a later topic.

---

## What Hooks Actually Solved (Beyond Syntax)

The move to function components wasn't just about cleaner syntax. There were two real problems in the class era:

### Problem 1: Sharing stateful logic was a nightmare

Suppose multiple components need a "window resize" behavior — subscribe to resize events, store the dimensions in state, unsubscribe on unmount. In the class era, you had two ways to share this:

**Higher-Order Components (HOCs):** Write `withWindowSize(MyComponent)` — a function that wraps your component in another component that injects the behavior as props. This works, but stack 4 behaviors and you get:

```jsx
<WithAuth>
  <WithTheme>
    <WithWindowSize>
      <WithAnalytics>
        <YourComponent />
      </WithAnalytics>
    </WithWindowSize>
  </WithTheme>
</WithAuth>
```

That's "wrapper hell" — a deeply nested tree in DevTools where the actual component is buried, prop conflicts are invisible, and debugging is miserable.

**Render props:** Same idea, different mechanism. You pass a function as a prop and the wrapper calls it to render. Same wrapper-hell problem.

**With hooks:** Extract the logic into a `useWindowSize()` custom hook — a plain function. Call it inside any component. No wrapping. No nesting. Multiple behaviors stay flat:

```jsx
function MyComponent() {
  const { width, height } = useWindowSize();
  const { user } = useAuth();
  const theme = useTheme();
  // all behaviors coexist, no wrappers
}
```

### Problem 2: Lifecycle methods split related logic by phase, not by concern

In class components, the phases are `componentDidMount`, `componentDidUpdate`, and `componentWillUnmount`. If you have a data fetching behavior, it lives across all three:

```jsx
componentDidMount() {
  this.subscription = subscribe(this.props.id);
}

componentDidUpdate(prevProps) {
  if (prevProps.id !== this.props.id) {
    this.subscription.unsubscribe();
    this.subscription = subscribe(this.props.id);
  }
}

componentWillUnmount() {
  this.subscription.unsubscribe();
}
```

Three methods, one concern, spread across the class. If you have multiple concerns (data fetching + analytics + subscriptions), each lifecycle method becomes a mix of unrelated code.

`useEffect` collocates the setup and teardown of a single concern:

```jsx
useEffect(() => {
  const subscription = subscribe(id);
  return () => subscription.unsubscribe(); // cleanup lives right here
}, [id]);
```

---

## Side-by-Side — The Same Component, Both Ways

```jsx
// Class
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  componentDidMount() {
    document.title = `Count: ${this.state.count}`;
  }

  componentDidUpdate() {
    document.title = `Count: ${this.state.count}`;
  }

  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        {this.state.count}
      </button>
    );
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

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  );
}
```

Beyond being shorter, the function version keeps the document title logic colocated with the state it depends on, rather than split across `componentDidMount` and `componentDidUpdate`.

---

## When Class Components Are Still Necessary

For all the advantages of function components and hooks, there is one thing you **cannot do with hooks as of 2026: implement an error boundary.**

An error boundary is a component that catches JavaScript errors thrown during rendering in its subtree and shows fallback UI instead of crashing the whole app. It requires two class-only lifecycle methods:

- `static getDerivedStateFromError(error)` — updates state to trigger the fallback UI
- `componentDidCatch(error, info)` — used for logging

There is no hooks equivalent. This is a known gap in the React API that the team has discussed but not yet shipped a solution for.

In practice, every React app with error handling has exactly one class component: the `ErrorBoundary`. Most teams either write it themselves or use the `react-error-boundary` package (which provides a class-based implementation wrapped in a friendly API):

```jsx
// This is still a class component in 2026
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logToService(error, info);
  }

  render() {
    if (this.state.hasError) return <h1>Something went wrong.</h1>;
    return this.props.children;
  }
}
```

---

## Gotchas

**`this` binding doesn't happen automatically in class components.** Methods defined on a class don't automatically have `this` bound to the instance. If you pass `onClick={this.handleClick}` and `handleClick` uses `this.setState`, it will throw because `this` is `undefined` when the browser calls the handler. You must either bind in the constructor or use class field syntax (arrow function as a class property):

```jsx
// Two valid solutions
class MyComponent extends React.Component {
  // Option 1: bind in constructor
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  // Option 2: class field (arrow function captures `this` at definition)
  handleClick = () => {
    this.setState({ clicked: true });
  };
}
```

**You cannot call hooks inside class components.** Hooks are called by the React runtime when it invokes a function component. Calling `useState` inside a class method breaks the rules of hooks and will throw. If you need hook-powered behavior inside a class component, you have to wrap: create a function component that uses the hook and passes the value down as a prop.

**`PureComponent` is not the same as `React.memo`.** Both do a shallow comparison to skip unnecessary renders, but `PureComponent` is a class base you extend, while `React.memo` is a higher-order component you wrap around a function component. They are the class-world and function-world equivalents of the same optimization.

**Migrating from class to function is not always 1:1.** `componentDidUpdate` gives you direct access to previous props (`prevProps`) for comparison. Replicating that in hooks requires `useRef` to manually store the previous value. The behaviors are equivalent but the implementation looks different.

---

## Interview Questions

**Q (High): Why did the React ecosystem move from class to function components?**

Answer: Two concrete reasons. First, sharing stateful logic between class components required HOCs or render props — both work, but both involve wrapping components inside other components, producing deeply nested trees ("wrapper hell") that are painful to debug. Hooks let you extract stateful logic into plain functions that any component can call directly, with no wrapping. Second, class lifecycle methods organized code by *phase* (mount, update, unmount) rather than by *concern*. Related setup and teardown logic was split across multiple methods. `useEffect` keeps a single concern's setup and cleanup together. There's also the snapshot-vs-instance behavioral difference, but the reusability and colocation wins were the primary motivations.

The trap: "Functions are simpler syntax." That's true but surface-level. The interviewer is looking for the actual engineering reasons — reusability and colocation.

---

**Q (High): Is there anything you still can't do with function components?**

Answer: Yes — error boundaries. Catching render errors in a subtree requires `static getDerivedStateFromError` and `componentDidCatch`, which are class-only lifecycle methods. There is no hooks equivalent. In practice this means every React app with error handling has at least one class component (or uses `react-error-boundary`, which wraps one).

The trap: "No, hooks can do everything classes can." This is a common overconfident answer. The error boundary exception is a real and ongoing limitation.

---

**Q (High): What is the behavioral difference between `this.props` in a class component and captured props in a function component?**

Answer: In a class component, `this.props` is a reference to the current props object on the instance. Reading it in an asynchronous callback — a timeout, a promise, an event listener — gives you whatever props are *at the time of reading*, not at the time the callback was registered. If props change between registration and execution, the callback silently operates on new values. In a function component, props are local variables. A closure captures them at render time. An async callback created in that render will always see the props that existed when the render ran — even if the component has since re-rendered with new props. Function components give you "values frozen at render time"; class components give you "always live references."

The trap: Missing that this is a correctness issue, not just a style preference. The class behavior causes real bugs in async UI code.

---

**Q (High): Why can't you use hooks inside class components?**

Answer: Hooks rely on a call-order mechanism inside React's fiber. When React renders a function component, it tracks each hook call in sequence and stores their state in a linked list on the fiber. This only works because React calls the function itself. Class components are instantiated and their `render` method is invoked, but React doesn't have a hook-tracking context set up for that execution. Calling `useState` inside a class method bypasses the mechanism entirely — React has no way to know which component the hook belongs to.

The trap: Thinking it's just an arbitrary rule. Understanding *why* makes the rule predictable and extends to understanding the Rules of Hooks in general.

---

**Q (Medium): What is the difference between `PureComponent` and `React.memo`?**

Answer: Both skip re-renders using shallow prop comparison, but they apply to different paradigms. `PureComponent` is a class base — you extend `React.PureComponent` instead of `React.Component`. `React.memo` is a higher-order component — you wrap a function component: `export default React.memo(MyComponent)`. Both accept a custom comparison function (`shouldComponentUpdate` for PureComponent, a second argument to `React.memo`). They are functional equivalents in their respective worlds.

The trap: Treating them as the same thing. They're separate APIs for separate component paradigms.

---

**Q (Medium): In what order does React call things when a function component renders, vs when a class component renders?**

Answer: For a function component, React calls the function directly — `MyComponent(props)` — and your hooks run in order as part of that call. The return value is the element tree. For a class component, React calls `render()` on the existing instance — `instance.render()`. Lifecycle methods (`componentDidMount`, `componentDidUpdate`, etc.) run separately at specific phases of the commit. The function model is one invocation producing output; the class model is a persistent object with methods called at different times.

The trap: Not understanding that React *calls* function components rather than instantiating them. This explains why you can't use `new` on a function component, and why `this` doesn't exist inside one.

---

**Q (Medium): Can you explain what "wrapper hell" is and how hooks solve it?**

Answer: Wrapper hell is what happens when you compose multiple HOCs or render props to inject behaviors into a component. Each HOC wraps the component in another component, so in React DevTools you see a deep chain of wrappers — `<WithAuth><WithTheme><WithLocale><ActualComponent>` — even though only one component is visible in the UI. It makes debugging hard, props collide invisibly, and the structure is difficult to reason about. Hooks solve this by letting you express the same behaviors as plain function calls inside the component body. `useAuth()`, `useTheme()`, `useLocale()` can all coexist flat inside one function without any wrapping — the component tree stays clean.

The trap: Vaguely saying "HOCs are bad." The specific problem is the structural bloat and opacity they introduce, and the specific solution is that hooks decouple behavior from component wrapping.

---

*Next: Props, props.children, and defaultProps — now that you understand what a component is and how it gets called, the next question is how data moves into it: what props are, how children work, how defaults are set, and where prop drilling starts to become a design problem.*
