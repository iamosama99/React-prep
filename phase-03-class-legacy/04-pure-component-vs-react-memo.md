# PureComponent vs React.memo

## What Is This?

Both `PureComponent` and `React.memo` are tools for skipping unnecessary re-renders by doing a shallow comparison of props. The difference is where they live: `PureComponent` is a base class for class components; `React.memo` is a higher-order component that wraps function components.

```js
// Class component — extend PureComponent instead of Component
class UserCard extends React.PureComponent {
  render() {
    return <div>{this.props.name}</div>;
  }
}

// Function component — wrap with React.memo
const UserCard = React.memo(function UserCard({ name }) {
  return <div>{name}</div>;
});
```

Both accomplish the same thing: if the props (and for `PureComponent`, state) haven't changed since the last render — by shallow comparison — the component skips re-rendering entirely.

---

## Why Does It Exist?

React's default behavior is to re-render a component whenever its parent re-renders, regardless of whether the component's own props actually changed. This is correct but sometimes expensive:

```js
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <ExpensiveChild name="Alice" />  {/* re-renders every time Parent re-renders */}
    </>
  );
}
```

`ExpensiveChild` receives the same props on every render but still re-renders because its parent did. `React.memo` (or `PureComponent` for classes) breaks this chain: if the props are the same as last time, the child skips its render entirely.

---

## How Shallow Comparison Works

"Shallow" means: compare each prop at the top level using `===`. Don't recurse into objects or arrays.

```js
// These props are "shallowly equal" (no re-render with PureComponent/memo)
{ name: "Alice", age: 30 }  ===  { name: "Alice", age: 30 }  // primitives match

// These are NOT shallowly equal (triggers re-render, even if contents are same)
{ user: { name: "Alice" } }  !==  { user: { name: "Alice" } }  // different object refs
{ items: [1, 2, 3] }         !==  { items: [1, 2, 3] }         // different array refs
() => doThing()              !==  () => doThing()               // different function refs
```

The check is roughly:

```js
function shallowEqual(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  if (prevKeys.length !== nextKeys.length) return false;
  return prevKeys.every(key => prevProps[key] === nextProps[key]);
}
```

When `shallowEqual` returns `true` (props are equal), the component skips its render. When it returns `false`, React re-renders normally.

---

## PureComponent

`PureComponent` implements `shouldComponentUpdate` with a shallow comparison of both **props and state**:

```js
// What PureComponent effectively does under the hood
shouldComponentUpdate(nextProps, nextState) {
  return !shallowEqual(this.props, nextProps)
      || !shallowEqual(this.state, nextState);
}
```

State comparison matters here. A regular `Component` re-renders on every `setState` call, even if you set state to the same value. `PureComponent` skips the render if the new state is shallowly equal to the previous state.

```js
// With regular Component: re-renders
this.setState({ count: 5 }); // even if count was already 5

// With PureComponent: skips the render
this.setState({ count: 5 }); // count unchanged by shallow comparison → no re-render
```

---

## React.memo

`React.memo` wraps a function component and does a shallow comparison of props only (function components don't have instance state in the same sense):

```js
const MemoizedComponent = React.memo(MyComponent);

// With a custom comparator (optional second argument)
const MemoizedComponent = React.memo(MyComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  // Return false if props changed (do re-render)
  return prevProps.id === nextProps.id && prevProps.name === nextProps.name;
});
```

The custom comparator is useful when you want to use something other than shallow equality — for example, comparing array contents rather than references.

---

## Side-by-Side Comparison

| | `PureComponent` | `React.memo` |
|---|---|---|
| Applies to | Class components | Function components |
| Compares | Props + state | Props only |
| Default comparison | Shallow equality | Shallow equality |
| Custom comparison | Override `shouldComponentUpdate` | Second argument to `React.memo` |
| Can wrap HOCs | No (it's a base class) | Yes |
| Children optimization | No — skips only the class's render | No — skips only the wrapped function |

---

## When Memo/PureComponent Actually Helps

Both are optimizations, and like all optimizations, they have a cost: the comparison itself takes time. For small components with few props, the comparison overhead can exceed the cost of just re-rendering.

They help when:
- The render is expensive (many child nodes, heavy computation in render)
- The parent re-renders frequently but the child's props are stable
- The component is a leaf node that renders often

They don't help (or can hurt) when:
- Props change on almost every render anyway
- The component is cheap to render
- Props include complex objects that are recreated each time (memo never prevents the re-render, just adds comparison cost)

---

## The Inline Prop Problem

`React.memo` and `PureComponent` break when props include values created inline in JSX:

```js
function Parent() {
  return (
    <MemoizedChild
      user={{ name: 'Alice' }}        // new object every render
      onClick={() => doSomething()}   // new function every render
      items={[1, 2, 3]}              // new array every render
    />
  );
}
```

Every render of `Parent` creates new references for these values. Shallow equality fails every time — `MemoizedChild` re-renders on every parent render. The memo does nothing.

The fix is to stabilize the references:
- Lift constants out of the render function
- Use `useMemo` for objects and arrays
- Use `useCallback` for functions

```js
function Parent() {
  const user = useMemo(() => ({ name: 'Alice' }), []);
  const handleClick = useCallback(() => doSomething(), []);
  const items = useMemo(() => [1, 2, 3], []);

  return (
    <MemoizedChild user={user} onClick={handleClick} items={items} />
  );
}
```

This is why `useMemo` and `useCallback` are often paired with `React.memo` — memo creates the demand for stable references, and the other two supply them.

---

## Gotchas

**Children prop breaks memo by default.** JSX children become the `children` prop, and JSX creates new React element objects on every render. If you pass any children to a memoized component, it will re-render every time because `children` is a new object reference.

```js
// This will ALWAYS re-render — children is a new object each time
<MemoizedWrapper>
  <SomeChild />
</MemoizedWrapper>
```

**Context bypasses both.** If a component (even a memoized one) consumes a context value via `useContext` or `contextType`, it re-renders when that context value changes — regardless of whether its props are stable. Memo only protects against prop-driven re-renders.

**`React.memo` wraps, not replaces.** The `displayName` in DevTools will show "Memo(ComponentName)" unless you set it explicitly. This can make debugging harder in large trees.

**Don't memo everything.** This is a common cargo-cult mistake. Wrapping every component in `React.memo` adds comparison overhead everywhere and makes code harder to read. Profile first, then optimize specifically.

**PureComponent and mutable state are mutually exclusive.** If you mutate state (push to an array, modify an object field) instead of replacing it, `PureComponent`'s state comparison sees the same reference and decides nothing changed — the component doesn't re-render even though the data changed. Always treat state as immutable.

---

## Interview Questions

**Q (High): What is the difference between `PureComponent` and `React.memo`?**

Answer: They solve the same problem for different component types. `PureComponent` is a base class for class components — it implements `shouldComponentUpdate` with a shallow comparison of both props and state. `React.memo` is a higher-order component that wraps function components and does a shallow comparison of props only. Both skip re-rendering when their comparison indicates nothing changed. The key behavioral difference is that `PureComponent` also compares state, while `React.memo` only looks at props (function components manage state internally via hooks, and state changes always trigger renders — memo can't intercept that).

---

**Q (High): Why does wrapping a component in `React.memo` sometimes have no effect?**

Answer: Shallow comparison uses `===`. If any prop is an object, array, or function created inline in the parent's JSX, it gets a new reference on every parent render — and `===` returns `false` for different references even when the contents are identical. So memo's comparison always says "props changed" and the component re-renders every time. The fix is to stabilize the reference: move static values outside render, and use `useMemo`/`useCallback` for derived values and callbacks. Memo creates the demand for stable references; the memoization hooks supply them.

---

**Q (Medium): Explain why a memoized component can still re-render even when its props don't change.**

Answer: Three main reasons. First, the component consumes a context value — context updates bypass memo entirely. Second, the component calls `forceUpdate()` (class) or has its own state changes (hooks). Third, if you're using React DevTools with "Highlight updates when components render," you might see false positives from the DevTools extension itself. The guaranteed bypass is context: if a `React.memo` component subscribes to a context that changes, it will re-render no matter how stable its props are.

---

**Q (Medium): When would you use a custom comparator with `React.memo` instead of the default shallow comparison?**

Answer: When the default shallow comparison is either too conservative or too liberal. Too conservative: a prop is an array of IDs — a new array with the same contents would trigger a re-render under shallow comparison, but if the contents are the same the output is the same. A custom comparator can deep-compare just that one prop. Too liberal: a prop is an object where only a subset of fields affects the render — the default compares all fields, but you only care about a few. The risk of a custom comparator is returning `true` (equal) when something actually changed, which causes stale output. The risk of returning `false` too often is just unnecessary re-renders (a performance issue, not a correctness issue).

---

**Q (Low): Does `React.memo` do a deep comparison?**

Answer: No. The default is shallow — it checks each top-level prop with `===`. Deep comparison would be prohibitively expensive at scale and would defeat the purpose (if the comparison takes longer than the render, you've gained nothing). You can opt into deeper comparison with a custom comparator, but you're responsible for writing it correctly and efficiently. In practice, the better solution to deep-equality problems is to restructure props so that memoized data is passed at the level of granularity you need — passing a primitive ID instead of a whole user object, for instance.

---

*Next: componentDidCatch & error boundaries — the only use case where class components remain mandatory even in 2026, and how React's error propagation model works.*
