# shouldComponentUpdate

## What Is This?

`shouldComponentUpdate` is a lifecycle method that gives you manual control over whether a class component re-renders. React calls it before every update, passing the incoming props and state. Return `true` to proceed with the render. Return `false` to skip it entirely — the component stays as-is in the DOM.

```js
class ExpensiveList extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.items !== this.props.items
      || nextState.selected !== this.state.selected;
  }

  render() {
    return (
      <ul>
        {this.props.items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );
  }
}
```

When you return `false`, React skips `render`, skips `getSnapshotBeforeUpdate`, and skips `componentDidUpdate`. The component is completely frozen for that update cycle.

---

## Why Does It Exist?

Re-rendering in React is cheap relative to DOM mutations, but not free. The diffing algorithm still has to run, child components still receive new prop objects (which may trigger their own unnecessary re-renders), and in large trees this accumulates. `shouldComponentUpdate` is the escape valve: it lets you say "I know my output won't change, so don't bother."

The classic use case is a component that receives many props updates but only cares about a subset:

```js
// Parent re-renders on every keypress, passing new `theme` and `searchQuery`
// This child only cares about `data` — shouldn't re-render for theme changes
class DataGrid extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.data !== this.props.data;
  }
  // ...
}
```

Before `PureComponent` (React 15.3) and `React.memo` (React 16.6), manual `shouldComponentUpdate` was how you did memoization.

---

## How It Works

The full update sequence when `shouldComponentUpdate` is present:

```
setState / new props
  → getDerivedStateFromProps
  → shouldComponentUpdate(nextProps, nextState)
      → false: stop here, component doesn't re-render
      → true: continue to render()
  → render()
  → getSnapshotBeforeUpdate
  → DOM mutations
  → componentDidUpdate
```

You receive the *incoming* props and state, while `this.props` and `this.state` still hold the *current* values. This lets you compare old vs. new:

```js
shouldComponentUpdate(nextProps, nextState) {
  // Only re-render if the user ID or the data changed
  return (
    nextProps.userId !== this.props.userId ||
    nextState.data !== this.state.data
  );
}
```

**This is a reference equality check (`!==`), not a deep equality check.** Two objects with identical contents are not `===` unless they're literally the same object in memory.

---

## Shallow vs. Deep Comparison

The performance trap: doing a deep equality check inside `shouldComponentUpdate` can be more expensive than just re-rendering.

```js
// Potentially slower than re-rendering!
shouldComponentUpdate(nextProps) {
  return !deepEqual(nextProps, this.props); // traverses entire prop tree
}
```

Shallow comparison is the practical default — compare each top-level prop by reference:

```js
shouldComponentUpdate(nextProps, nextState) {
  const propsChanged = Object.keys(nextProps).some(
    key => nextProps[key] !== this.props[key]
  );
  const stateChanged = Object.keys(nextState).some(
    key => nextState[key] !== this.state[key]
  );
  return propsChanged || stateChanged;
}
```

`PureComponent` implements exactly this — shallow comparison of all props and state — so you rarely need to write this manually.

---

## When Manual `shouldComponentUpdate` Beats PureComponent

**You only care about specific props, not all of them:**

```js
// PureComponent compares all props. Manual SCU is more precise.
shouldComponentUpdate(nextProps) {
  return nextProps.dataId !== this.props.dataId;
  // Ignores theme, className, onClick changes deliberately
}
```

**You need custom comparison logic:**

```js
shouldComponentUpdate(nextProps) {
  // Array contents matter, not reference
  return !arraysEqual(nextProps.ids, this.props.ids);
}
```

**You're inheriting from a class that already extends `PureComponent` and want to override its behavior:**

In practice, this is rare. Most class-component optimization should use `PureComponent` and make sure props are stable references (use memoized selectors, don't create objects inline in render).

---

## The Functional Equivalent

In functional components: `React.memo`. It wraps the component and does a shallow comparison of props by default. You can pass a custom comparator as the second argument:

```js
const ExpensiveList = React.memo(
  function ExpensiveList({ items, selected }) { /* ... */ },
  (prevProps, nextProps) => {
    // Return true to SKIP re-render (opposite of shouldComponentUpdate's false)
    return prevProps.items === nextProps.items
      && prevProps.selected === nextProps.selected;
  }
);
```

Note the inversion: `shouldComponentUpdate` returning `false` means "don't render," `React.memo`'s comparator returning `true` means "don't render" (props are equal, skip).

---

## Gotchas

**Returning `false` from `shouldComponentUpdate` does not prevent child re-renders from the children's own state.** It only prevents *this* component from re-rendering. Children with their own state can still update themselves.

**If you return `false` incorrectly, you create stale UI.** This is the correctness risk. If your comparison is wrong — returns `false` when something actually changed — the component will display outdated data. React won't help you detect this. It's your responsibility.

**`shouldComponentUpdate` is not called for `forceUpdate()`.** If you call `this.forceUpdate()`, React skips `shouldComponentUpdate` entirely and always re-renders.

**Mutable state kills `shouldComponentUpdate`.** If you mutate state or props directly instead of creating new objects, the references are the same and `shouldComponentUpdate` will always see `nextProps.items === this.props.items` — and never update. This is why immutability is not just a stylistic preference; it's a correctness requirement for any reference-based optimization.

```js
// BREAKS shouldComponentUpdate
this.state.items.push(newItem); // mutates — reference unchanged
this.setState({ items: this.state.items }); // same reference as before

// CORRECT
this.setState({ items: [...this.state.items, newItem] }); // new reference
```

**Context changes bypass `shouldComponentUpdate`.** If the component consumes a context value and that context updates, the component re-renders regardless of what `shouldComponentUpdate` returns. This is a common surprise.

---

## Interview Questions

**Q (High): What does `shouldComponentUpdate` do and what are the risks of using it incorrectly?**

Answer: `shouldComponentUpdate` receives the incoming props and state and returns a boolean — `true` to proceed with the render, `false` to skip it. The risk of returning `false` incorrectly is stale UI: the component stops updating even though something it cares about changed. React has no mechanism to catch this — the app appears to work but shows outdated data. The second risk is maintenance: as the component evolves and new props are added, the check must be updated too. Forgetting to include a new prop in the comparison means changes to that prop are silently ignored. `PureComponent` avoids this by comparing all props, but at the cost of less precision.

---

**Q (High): What's the difference between `shouldComponentUpdate` and `PureComponent`?**

Answer: `PureComponent` is a base class that implements `shouldComponentUpdate` for you using a shallow comparison of all props and state. Manual `shouldComponentUpdate` lets you write your own comparison — you can be more selective (only compare the props that matter), use custom equality logic (like comparing array contents rather than references), or skip properties you know won't affect the output. `PureComponent` is the right default for most components. Manual `shouldComponentUpdate` is for cases where `PureComponent`'s comparison is either too coarse (compares props you don't care about) or too shallow (misses meaningful changes in specific props).

---

**Q (Medium): You have a component that receives a `filters` object prop. The parent creates this object inline on each render. The component uses `PureComponent` but still re-renders every time. Why, and how do you fix it?**

Answer: Inline object literals create new references on every render: `<Component filters={{ status: 'active' }} />` passes a different object each time even if the contents are identical. `PureComponent`'s shallow comparison sees `prevProps.filters !== nextProps.filters` (different references) and re-renders. The fix: move the object out of render (define it as a constant or memoize it with `useMemo`), or pass individual primitive props instead of an object, or override `shouldComponentUpdate` with a custom deep comparison of the filters properties. In class components the clean solution is a memoized selector (e.g., with `reselect`). In functional components, `useMemo` handles this.

---

**Q (Low): Can you use `shouldComponentUpdate` with `React.forwardRef`?**

Answer: Yes, but with a caveat. If you wrap a class component in `forwardRef`, `shouldComponentUpdate` still works on the underlying class. The `forwardRef` wrapper itself is a thin function component and doesn't have lifecycle methods. The ref is forwarded to the class instance, and the class's `shouldComponentUpdate` controls its rendering as normal.

---

*Next: PureComponent vs React.memo — the automated versions of shouldComponentUpdate for class and function components respectively, and the shallow comparison semantics they share.*
