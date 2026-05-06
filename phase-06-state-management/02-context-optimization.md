# Context Optimization

## The Problem to Solve

The core limitation of Context is all-or-nothing subscriptions. Any component calling `useContext(X)` re-renders when `X`'s value changes, whether or not the part of the value it cares about changed. Optimization strategies all reduce to one of three approaches: (1) reduce how often the value changes, (2) split the value so fewer components are subscribed to any given change, or (3) add a selection layer that compares results before triggering a re-render.

---

## Strategy 1: Memoize the Context Value

If the Provider's `value` is an object, memoize it so it only produces a new reference when something in it actually changed:

```js
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  const value = useMemo(() => ({ user, theme, setUser, setTheme }), [user, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

This prevents the "parent re-renders for unrelated reason, context object gets new reference, all consumers re-render" problem. But it doesn't help when `user` changes and a component that only cares about `theme` subscribes — both are in the same object, so any change to either triggers a re-render for all subscribers.

---

## Strategy 2: Split Contexts

The most effective and straightforward fix: give each logical concern its own context. A component subscribes only to what it needs.

```js
const UserContext = createContext(null);
const ThemeContext = createContext('light');
const UserActionsContext = createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  // Stable reference for actions — setUser/setTheme are stable from useState
  const actions = useMemo(() => ({ setUser, setTheme }), []);

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <UserActionsContext.Provider value={actions}>
          {children}
        </UserActionsContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

Key insight: separate read state from write actions. `setUser` and `setTheme` are stable references from `useState` — they never change. Putting them in their own context means action-dispatching components never re-render from state changes.

```js
// Only re-renders when user changes
function UserAvatar() {
  const user = useContext(UserContext);
  return <img src={user?.avatar} />;
}

// Only re-renders when theme changes
function ThemeButton() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Toggle</button>;
}

// Never re-renders from state changes
function UpdateUserButton() {
  const { setUser } = useContext(UserActionsContext);
  return <button onClick={() => setUser({ name: 'Bob' })}>Update</button>;
}
```

---

## Strategy 3: Reducer + Dispatch Context

When using `useReducer`, the dispatch function is stable across renders. Separate the state context from the dispatch context:

```js
const CountStateContext = createContext(null);
const CountDispatchContext = createContext(null);

function CountProvider({ children }) {
  const [count, dispatch] = useReducer(reducer, 0);

  return (
    <CountDispatchContext.Provider value={dispatch}>
      <CountStateContext.Provider value={count}>
        {children}
      </CountStateContext.Provider>
    </CountDispatchContext.Provider>
  );
}
```

Components that only dispatch actions — buttons, form handlers — subscribe to `CountDispatchContext` only. They never re-render when state changes. This pattern scales well for complex state shapes.

---

## Strategy 4: use-context-selector

The `use-context-selector` library (by Daishi Kato, same author as Jotai) adds Redux-style selectors to Context:

```js
import { createContext, useContextSelector } from 'use-context-selector';

const AppContext = createContext(null);

// Only re-renders when user.name changes
function UserName() {
  const name = useContextSelector(AppContext, ctx => ctx.user.name);
  return <span>{name}</span>;
}

// Only re-renders when theme changes
function ThemedButton() {
  const theme = useContextSelector(AppContext, ctx => ctx.theme);
  return <button className={theme}>Click</button>;
}
```

The selector function runs on every context value change and the component only re-renders if the selector's return value changed (compared by `Object.is`). This is the closest you get to `useSelector` from react-redux without actually using Redux.

Limitation: it relies on `unstable_batchedUpdates` and undocumented React internals. It works, but carries some risk of breakage across React versions.

---

## Strategy 5: Children as Props (Structural)

Sometimes the right fix is structural rather than optimization-specific. "Children as props" prevents re-renders without any memoization:

```js
// Bad: every time App re-renders, ExpensiveComponent re-renders too
function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Counter count={count} setCount={setCount} />
      <ExpensiveComponent />  {/* re-renders when count changes */}
    </div>
  );
}

// Good: ExpensiveComponent is passed from outside, its props are stable
function App() {
  return <Counter><ExpensiveComponent /></Counter>;
}

function Counter({ children }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {children}  {/* same React element reference, doesn't re-render */}
    </div>
  );
}
```

The parent creates the `<ExpensiveComponent />` element once and passes it as `children`. From `Counter`'s perspective, `children` is a stable prop reference — it never changes — so the element is reused without re-rendering.

---

## Decision Matrix

| Situation | Strategy |
|---|---|
| Entire value object changes reference unnecessarily | `useMemo` the value |
| Different consumers care about different parts of state | Split contexts |
| Components only dispatch actions, never read state | Separate state/dispatch contexts |
| Need fine-grained subscriptions without splitting | `use-context-selector` |
| Child components are expensive but don't depend on parent state | Children-as-props pattern |
| Frequent updates, many subscribers, complex derived state | Stop using Context — use Zustand/Redux |

The last row is the real answer. Context optimization has a ceiling. When you're writing `use-context-selector` and splitting state into 8 contexts, you've outgrown Context. The code complexity of "optimized Context" rivals using a dedicated library — without any of the library's benefits.

---

## Interview Questions

**Q (High): You have a single large Context with user, theme, and cart data. Components that only care about cart are re-rendering when the user logs out. How do you fix it?**

Answer: Split the context into separate concerns: `UserContext`, `ThemeContext`, `CartContext`. Each provider wraps independently; components subscribe only to the context they actually need. A change to user state only re-renders `UserContext` subscribers. If splitting alone isn't enough (e.g., components need a subset of one context), `useMemo` the value objects to minimize unnecessary reference changes, or use `use-context-selector` to add selector-based subscriptions. The cleanest fix is always structural: one context per logical concern.

---

**Q (Medium): Why should you separate state and dispatch into two different contexts when using `useReducer`?**

Answer: `useReducer` returns a stable dispatch function — it never changes across renders. If you put state and dispatch in the same context object, every state change creates a new context value, causing components that only dispatch (and never read state) to re-render needlessly. Separating them means action-only components subscribe to `DispatchContext`, which never produces a new value, so they never re-render from state changes. It's free performance with minimal structure overhead.

---

**Q (Medium): What does `use-context-selector` do that `useContext` can't?**

Answer: `useContext` is all-or-nothing — subscribe to the context, re-render when any part of the value changes. `use-context-selector` accepts a selector function and only triggers a re-render if the selector's return value changed. It's the same model as `useSelector` in react-redux. Internally it uses React's `unstable_batchedUpdates` and subscription tracking to defer re-renders until after the selector has been checked. The tradeoff: it uses undocumented React internals and carries a risk of breakage across React versions.

---

**Q (Low): How does passing a component as `children` prevent it from re-rendering when the parent's state changes?**

Answer: When a parent component passes JSX as `children`, the React element is created in the parent's parent — the component that renders the parent. The parent receiving `children` doesn't own that React element; it just renders whatever it received. From the parent's perspective, `children` is a stable prop (same object reference) across its own state changes. Since `React.createElement` wasn't called again for the child, no new element is created, and React reuses the previous render output for that subtree.

---

*Next: Redux core — store, reducers, actions, middleware, and why the architecture was designed this way.*
