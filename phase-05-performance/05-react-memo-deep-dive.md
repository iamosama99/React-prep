# React.memo Deep Dive

## What Is This?

`React.memo` is a higher-order component that wraps a function component and adds a shallow prop comparison check before each render. If the incoming props are shallowly equal to the previous props, React skips calling the component function and reuses the last rendered output.

```js
const MemoizedChild = React.memo(function Child({ name, onClick }) {
  console.log('Child rendered');
  return <button onClick={onClick}>{name}</button>;
});
```

It is the primary tool for opting a component out of the default "always re-render when parent renders" behavior.

---

## Why Does It Exist?

By default, React re-renders the entire subtree below any component that re-renders. For many apps this is fine — renders are cheap and fast. But when a parent holds rapidly-changing state (a search query, a scroll position, a timer) and has expensive child subtrees that don't depend on that state, you want to draw a re-render boundary.

`React.memo` is that boundary. It intercepts the render propagation and asks: "did any prop actually change?" If not, the child tree is reused as-is.

---

## How It Works

Internally, `React.memo` wraps the component in a special fiber type (`REACT_MEMO_TYPE`). Before React calls the wrapped component during reconciliation, it runs the comparison function against `prevProps` and `nextProps`. If the comparison returns `true` (props are equal), React bails out of rendering that fiber and its entire subtree.

The default comparison is a **shallow equality check** — one level deep:

```js
function defaultAreEqual(prevProps, nextProps) {
  for (const key in nextProps) {
    if (!Object.is(prevProps[key], nextProps[key])) return false;
  }
  return true;
}
```

Each prop is compared with `Object.is`. Primitive values (strings, numbers, booleans) compare by value. Objects, arrays, and functions compare by **reference** — two different objects with identical contents are not equal.

---

## Custom Comparison Function

You can provide a second argument to `React.memo` for a custom comparison:

```js
const MemoRow = React.memo(
  function Row({ item, isSelected }) {
    return <div className={isSelected ? 'selected' : ''}>{item.name}</div>;
  },
  (prevProps, nextProps) => {
    // Return true to skip render, false to render
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);
```

Use a custom comparator when:
- Props include deeply nested objects where only specific fields matter
- You want to ignore certain props entirely (e.g., stable callback references you know won't change semantically)

Don't use it to implement deep equality across large objects — the comparison itself becomes expensive and defeats the purpose.

---

## The Reference Stability Problem

`React.memo` only helps when props are referentially stable across renders. The most common failure mode: the parent creates a new object or function on every render, memo sees it as a changed prop, and renders anyway.

```js
function Parent() {
  const [count, setCount] = useState(0);

  // New function reference on every Parent render → memo never bails out
  const handleClick = () => console.log('clicked');

  // New object reference on every Parent render → memo never bails out
  const style = { color: 'red' };

  return <MemoChild onClick={handleClick} style={style} />;
}
```

Fix with `useCallback` and `useMemo`:

```js
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => console.log('clicked'), []);
  const style = useMemo(() => ({ color: 'red' }), []);

  return <MemoChild onClick={handleClick} style={style} />;
}
```

Now `handleClick` and `style` are stable references. When `count` changes, the parent re-renders but `MemoChild` sees the same props and skips its render.

---

## When React.memo Helps vs Hurts

**It helps when:**
- The component renders frequently due to parent re-renders
- The component's render is computationally expensive (large list, complex layout)
- Props are referentially stable (primitives or memoized objects/functions)
- The component is a pure display layer with no own state that changes often

**It hurts (or is wasted) when:**
- The component's props always change (memoizing guarantees a render every time + comparison cost)
- The component is cheap to render (comparison overhead > render cost)
- The wrapped component has its own frequently-changing state (state changes always trigger a render regardless of memo)
- Props include non-memoized objects/functions from the parent (memo never bails out)

**The rule:** profile first. Memo without profiling is educated guessing. Adding memo to every component is a common mistake that adds comparison overhead everywhere while providing benefit nowhere.

---

## React.memo vs useMemo vs useCallback

These three are often confused:

| | What it memoizes | Scope |
|---|---|---|
| `React.memo` | The rendered output of a component | Skips re-render if props unchanged |
| `useMemo` | The result of a computation | Returns cached value if deps unchanged |
| `useCallback` | A function reference | Returns same function if deps unchanged |

`useMemo` and `useCallback` are tools you use *inside* a component to stabilize values that are passed as props to a memoized child. `React.memo` is the opt-in gate on the child side.

```js
// Parent: stabilize what you pass
const stableOnChange = useCallback((val) => setQuery(val), []);
const stableOptions = useMemo(() => ({ debounce: 300 }), []);

// Child: gate on those stable props
const SearchInput = React.memo(function SearchInput({ onChange, options }) {
  return <input onChange={e => onChange(e.target.value)} />;
});
```

---

## Gotchas

**1. Memo doesn't prevent renders caused by own state changes.**

`React.memo` only intercepts renders caused by parent re-renders (prop changes). If the memoized component calls `setState` itself or consumes a context that changes, it re-renders — memo cannot prevent this.

**2. Children prop breaks memo.**

JSX children are elements — new object references on every render. Passing JSX as children to a memoized component means it will always re-render:

```js
// Memo never bails out — `children` is a new React element every render:
<MemoPanel>
  <span>Content</span>
</MemoPanel>

// Fix: memoize the children too, or restructure
const content = useMemo(() => <span>Content</span>, []);
<MemoPanel>{content}</MemoPanel>
```

**3. Context consumption ignores memo.**

If a memoized component calls `useContext`, it will re-render when the context changes regardless of whether its props changed. Memo only intercepts the parent → child render path. Context changes bypass that interception entirely.

**4. `React.memo` compares `prevProps` to `nextProps`, not `prevRender` to `nextRender`.**

If the comparison passes but the component has `useMemo`/`useCallback` whose deps changed internally, those will still recompute — but the component won't re-render if props haven't changed. Wait: if the component doesn't re-render, its hooks don't run, so internal memos don't recompute either. The component must render for any hook to run. Memo prevents the render entirely.

**5. Forgetting that memo wraps the component, not individual renders.**

`React.memo` is applied at component definition time. It wraps the *component*, not individual prop slots. You can't selectively skip renders for some prop changes but not others without a custom comparator.

**6. Memo can cause stale closure bugs.**

If you pass a non-memoized callback to a memoized child, you'll wrap it in `useCallback`. If that `useCallback` captures state from the parent but the deps array is wrong (missing the state value), the memoized child will have a stale closure. The performance optimization introduces a correctness bug. Always verify deps arrays after adding `useCallback` for memo compatibility.

---

## Interview Questions

**Q (High): How does `React.memo` work and what is it doing internally?**

Answer: `React.memo` wraps a component in a special fiber type. Before React calls the wrapped component during reconciliation, it runs a comparison function — by default, a shallow equality check using `Object.is` on each prop. If all props are equal, React bails out of the entire subtree rooted at that component — it reuses the last rendered output without calling the function. If any prop is different, it renders normally. The shallow check means primitives compare by value and objects/arrays/functions compare by reference. A new object with the same content is not equal to the previous one.

The trap: Candidates who say "memo does a deep comparison" are wrong. Interviewers follow up with "so what happens if you pass `style={{ color: 'red' }}` to a memoized component?" — memo will never bail out because a new object literal is created on every render.

---

**Q (High): You've wrapped a component in `React.memo` but it still re-renders every time the parent renders. What are the likely causes?**

Answer: The most common causes: (1) A prop is a new object or array literal created in the parent's render body — new reference every render, memo sees it as changed. (2) A prop is an inline function defined in the parent — new function reference every render. (3) A prop is JSX (React children) — React.createElement returns a new object each time. (4) The component consumes a context that changes — context bypasses memo. (5) The component has its own state that changes. Fix: stabilize object/array props with `useMemo`, stabilize function props with `useCallback`. Profile with React DevTools to confirm which prop is changing.

---

**Q (High): When should you NOT use `React.memo`?**

Answer: When the component's props change on almost every render — memo runs the comparison but always renders, so you've added comparison overhead with no benefit. When the component is cheap to render — for a `<div>` with a text node, comparing the props costs more than just re-rendering. When the component has its own frequently-changing state — memo only intercepts parent-triggered renders; the component's own state changes always render regardless. And when props include non-stabilized objects/functions — memo adds complexity (you now also need useCallback/useMemo everywhere in the parent) that may not pay off. Wrap with memo after profiling shows the component is a hot path.

---

**Q (Medium): What's the relationship between `React.memo`, `useCallback`, and `useMemo`?**

Answer: They form a trio for preventing unnecessary child renders. `React.memo` is the gate on the child: it bails out if props are shallowly equal. `useCallback` and `useMemo` are tools in the parent to produce stable prop references: `useCallback` for functions, `useMemo` for objects/arrays. Without reference stability in the parent, memo in the child never bails out. All three are needed together to achieve the optimization: memo checks stability, the other two provide it.

---

**Q (Medium): Can a memoized component still re-render even when no props changed?**

Answer: Yes — three ways. (1) The component's own state changes (`useState`, `useReducer`). (2) A context it subscribes to changes — `useContext` bypasses the memo check entirely. (3) A custom comparison function returns `false` (a poorly written comparator that always returns false). Memo only prevents re-renders triggered by parent renders. It has no effect on re-renders from the component's own internal state or from context.

---

*Next: Avoiding Re-renders Without Memo — React.memo is one tool, but there are structural patterns that prevent unnecessary re-renders without needing memoization at all. These patterns are often simpler and more robust.*
