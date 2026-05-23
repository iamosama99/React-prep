# What Causes Re-renders

## Quick Reference

| Trigger | Causes re-render? | Notes |
|---|---|---|
| Own state change (`setState`) | Yes | Bails out if new value `Object.is` equal to old |
| Parent re-renders | Yes (default) | Regardless of whether props changed — use `React.memo` to opt out |
| Context value changes | Yes | All-or-nothing; no selector mechanism in built-in context |
| Changed props (without memo) | No — parent re-render causes it | Prop comparison only matters with `React.memo` |
| Ref mutation (`ref.current = x`) | No | Refs are intentionally outside the reactivity system |

## What Is This?

A re-render is React calling your component function again to produce a new virtual tree. Understanding exactly what triggers re-renders — and what doesn't — is the foundation of React performance work. Most performance bugs boil down to components re-rendering more often than they need to.

> **Check yourself:** A component has no state and its parent re-renders. Does the component re-render? Does it matter whether its props changed?

---

## Why Does It Exist?

React's core contract is: UI = f(state). When state changes, the UI should reflect the new state. React's mechanism is to re-render. The question is *which* components re-render — and React's default answer is broader than most people expect.

---

## The Four Causes of Re-renders

### 1. Own state changes

When a component calls `setState` (via `useState`) or `dispatch` (via `useReducer`), that component schedules a re-render.

```js
function Counter() {
  const [count, setCount] = useState(0);

  // Calling setCount re-renders Counter
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Bailout:** React runs the state updater, compares the new state to the old state with `Object.is`. If they're the same value, React bails out — the component does *not* re-render, and neither do its children.

```js
const [count, setCount] = useState(0);
setCount(0); // count is still 0 → Object.is(0, 0) === true → bailout, no re-render
```

### 2. Parent re-renders

When a parent renders, React re-renders all of its children by default — regardless of whether the child's props changed.

```js
function Parent() {
  const [x, setX] = useState(0);
  return (
    <>
      <button onClick={() => setX(c => c + 1)}>Increment</button>
      <Child /> {/* re-renders on every Parent re-render, even though it has no props */}
    </>
  );
}

function Child() {
  console.log('Child rendered');
  return <div>I have no props</div>;
}
```

This is the most common source of unnecessary re-renders. React's default is to re-render the whole subtree. `React.memo` is the opt-out.

### 3. Context value changes

When a context value changes, every component that called `useContext` with that context will re-render — regardless of which part of the value changed or whether the component uses the changed part.

```js
const ThemeContext = React.createContext();

function App() {
  const [theme, setTheme] = useState('light');
  // Every consumer re-renders when theme changes, even if they only use 'light'/'dark'
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Toolbar />
      <Sidebar />
    </ThemeContext.Provider>
  );
}
```

Context doesn't have a selector mechanism — it's all-or-nothing. This is the main reason external state managers (Zustand, Redux) outperform Context for frequently-changing state.

### 4. Hook results changing

Hooks that are called inside your component will trigger a re-render when their result changes. This includes:

- `useContext` (covered above)
- Custom hooks that call `useState` or `useReducer` internally
- `useSyncExternalStore` when the subscribed slice changes

```js
// If useWindowSize returns a new object on every resize event, this component
// re-renders on every window resize — even if width and height didn't change.
function Component() {
  const { width } = useWindowSize();
  return <div>{width}</div>;
}
```

---

## What Does NOT Cause Re-renders

**Changed props do not cause re-renders by themselves.** This is a critical misconception. The parent renders, and React re-renders the child as part of processing the parent's output — prop comparison only matters if you've wrapped the child in `React.memo`. Without memo, the child always re-renders when the parent does, regardless of props.

**Changed refs do not cause re-renders.** `ref.current` is a mutable box intentionally outside React's reactivity system. Writing to it never triggers a render. Reading it during render always returns the current value without subscribing to changes.

**Re-render does not mean DOM update.** A re-render is React calling your function and diffing the output. If the output is identical to the previous render, the commit phase produces zero DOM mutations. Re-renders are cheap (CPU, not DOM). The goal of optimization is to avoid *expensive* re-renders and *unnecessary* DOM mutations — not to eliminate all re-renders.

> **Check yourself:** A developer wraps a child component in `React.memo` but the parent still passes the same props. Will the child re-render? Now answer the same question without `React.memo` — does the answer change?

---

## The Propagation Model

Re-renders propagate downward, never upward. When a component re-renders, all of its descendants re-render by default. The boundary is only drawn at:

1. Components wrapped in `React.memo` (and where all props pass the comparison)
2. Components whose rendering is guarded by a `shouldComponentUpdate` returning false (class components)

```
App (state changes)
├── Header            ← re-renders (child of App)
│   └── Logo         ← re-renders (child of Header)
└── Sidebar           ← re-renders (child of App)
    └── NavList       ← re-renders (child of Sidebar)
        └── NavItem   ← re-renders (child of NavList)
```

Every node in the subtree re-renders by default. React.memo on `Sidebar` would prevent Sidebar and its entire subtree from re-rendering if Sidebar's props didn't change.

---

## Diagnosing Re-renders

The fastest tool: `React.StrictMode` double-invokes renders in development — if your component has side effects during render, you'll see doubled logs. Use React DevTools Profiler to see which components rendered, how long each took, and *why* they rendered (the "why did this render?" tooltip shows which prop or state changed).

A quick manual probe:

```js
function MyComponent(props) {
  console.log('MyComponent rendered');
  // ...
}
```

Or using a ref to count renders without causing more:

```js
function MyComponent(props) {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`Rendered ${renderCount.current} times`);
  // ...
}
```

---

## Gotchas

**1. `Object.is` equality, not deep equality.**

React's bailout check uses `Object.is` — strict reference equality for objects and arrays. Two objects with the same content are not equal: `{} !== {}`. This means a state update that produces a new array or object always triggers a re-render, even if the contents are identical.

```js
// Always re-renders — new array reference every time:
setItems([...items]);

// Bails out — same primitive:
setCount(count); // Object.is(count, count) === true
```

**2. Props comparison only matters with React.memo.**

Without `React.memo`, it doesn't matter if the parent passes the same props — the child renders. Many developers assume React compares props automatically and are surprised when profiling shows unchanged-props renders.

**3. setState in effects can cause render cascades.**

An effect that calls setState triggers a re-render, which may re-run the effect (if deps changed), which may call setState again. The pattern of `useEffect → setState → render → useEffect → setState` can produce visible re-render cascades even when each individual link seems innocent.

**4. Providing a new context value object on every render.**

A common context bug:

```js
// Bad — new object reference on every App render, all consumers re-render:
<Context.Provider value={{ user, logout }}>

// Better — memoize the value:
const value = useMemo(() => ({ user, logout }), [user, logout]);
<Context.Provider value={value}>
```

**5. Default props that are object/function literals.**

```js
// Bad — new object on every parent render:
<List options={{ sortable: true }} />

// Good — stable reference:
const LIST_OPTIONS = { sortable: true };
<List options={LIST_OPTIONS} />
```

**6. Re-rendering is not the same as re-mounting.**

Re-render: component function called again, state preserved, refs preserved. Re-mount: component instance destroyed and a new one created, state reset to initial values. Key changes and element type changes cause remounts. Everything else (state updates, prop changes, parent renders) causes re-renders.

---

## Interview Questions


**Q (High): What are the things that cause a React component to re-render?**

Answer: Four things: (1) The component's own state changes via `setState` or `dispatch`. (2) The parent component re-renders — React re-renders all children by default, regardless of whether props changed. (3) A consumed context value changes — any component calling `useContext` re-renders when the context value changes, even if the component only uses a portion of that value. (4) A custom hook's internal state changes — the component that calls the hook re-renders.

The trap: Many candidates list "prop changes" as a cause. Props do not cause re-renders by themselves — the parent renders, which causes the child to render. Prop comparison is only relevant when the child is wrapped in `React.memo`. Missing this distinction is a sign of surface-level knowledge.

---

**Q (High): Does React compare props before re-rendering a child component?**

Answer: No — not unless the child is wrapped in `React.memo`. By default, whenever a parent renders, all of its children render, unconditionally. React does not compare the new props to the old props before calling the child's function. The comparison only happens with `React.memo`, which does a shallow comparison of all props using `Object.is` and skips the render if all props are equal. This is a deliberate design choice — prop comparison itself has a cost, and for small/cheap components, always rendering is cheaper than comparing props to decide whether to render.

The trap: Candidates who believe React automatically does prop comparison will give incorrect performance advice ("just pass the same props and it won't re-render").

---

**Q (High): A component re-renders but the DOM doesn't change. Is this a problem?**

Answer: It depends on cost. A re-render is React calling your function — if the function is cheap (no expensive computations, no large arrays being processed) and the diff produces no mutations, the render is essentially free. React DevTools Profiler shows render duration; if it's sub-millisecond, optimizing it with `memo` or `useMemo` adds more complexity than it saves. The problem only arises when re-renders are *expensive* — large component trees, heavy computations in the render body, or cascades that touch hundreds of components simultaneously. Profile first, optimize second.

The trap: Candidates who say "any re-render is bad" optimize prematurely and add memoization that actually slows things down (memo has its own overhead).

---
**Q (Medium): Why do context consumers re-render even when the part of the context they use hasn't changed?**

Answer: React's context system doesn't have a subscription-per-key model. When the provider's value changes (by reference), React re-renders all consumers that called `useContext` with that context — there's no way to say "only re-render if the `theme` key changed." The comparison is on the value object as a whole, using `Object.is`. Two common fixes: (1) Split contexts — one context per slice of state that changes independently. (2) Use a state manager that provides selector-based subscriptions (Zustand, Redux with `useSelector`), where components only re-render when their selected slice changes.

---

**Q (Medium): You have a parent with expensive state that changes frequently, and a child that never needs to change. How do you prevent the child from re-rendering?**

Answer: Wrap the child in `React.memo`. `React.memo` does a shallow prop comparison before rendering. If all props pass `Object.is` equality, it skips the render entirely. The child must receive stable prop references — if the parent passes a new function or object literal on every render, memo will see them as changed and render anyway. Combine `React.memo` on the child with `useCallback` / `useMemo` in the parent to produce stable references.

Alternatively, restructure to push state down into the parent's own isolated subtree, keeping the child as a sibling rather than a descendant. Then the child is simply never in the re-render propagation path.

---

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can name all four causes of re-renders without notes
- [ ] Can explain why "props changed" is NOT a direct cause of re-renders (and when it matters)
- [ ] Can explain why a context consumer re-renders even when the specific field it uses hasn't changed
- [ ] Can describe the `Object.is` bailout and why `setItems([...items])` still triggers a re-render
- [ ] Can explain the difference between re-rendering and re-mounting
- [ ] Can write a ref-based render counter that doesn't itself cause re-renders

---

*Next: React.memo Deep Dive — now that you know parent renders always cascade to children, the next topic examines exactly how React.memo intercepts that cascade, what its comparison does and doesn't guarantee, and when it helps vs hurts.*
