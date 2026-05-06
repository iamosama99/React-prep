# Avoiding Re-renders Without Memo

## What Is This?

`React.memo` is the hammer in React performance work, but structural patterns can eliminate unnecessary re-renders entirely — without the overhead of prop comparison, without requiring `useCallback`/`useMemo` to stabilize references, and without the maintenance burden of custom comparators.

These patterns work by keeping fast-changing state away from components that don't need it, using composition to pass stable component trees through parents that re-render frequently.

---

## Why Does It Exist?

Memo is a bailout mechanism — it stops an unnecessary render that was already about to happen. Structural patterns are a prevention mechanism — they ensure the render never propagates to unaffected components in the first place. Prevention is always simpler than bailout.

The patterns below exploit a single insight: **React only re-renders the subtree rooted at the component that holds the changing state**. If you can restructure so that fast-changing state lives lower in the tree, fewer components are in its re-render blast radius.

---

## Pattern 1: Push State Down

If only one part of your UI responds to a piece of state, move that state into the component that needs it. The parent never re-renders.

```js
// Bad — count state in App, entire tree re-renders on every click
function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <ExpensiveTree />  {/* re-renders on every count change */}
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
    </div>
  );
}

// Good — count state isolated in Counter, ExpensiveTree never re-renders
function App() {
  return (
    <div>
      <ExpensiveTree />  {/* never re-renders due to count */}
      <Counter />
    </div>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

The state and the component that uses it are co-located. `ExpensiveTree` is a sibling, not a child of the re-rendering component, so it's outside the propagation path.

---

## Pattern 2: Lift Content Up (Children as Props)

When you can't push state down because the state-owning component needs to wrap the expensive tree, you can pass the expensive tree in as `children`. The parent can re-render freely, but since `children` is passed from *above* the state-holder — from a component that doesn't re-render — the same children element is reused.

```js
// Bad — ColorPicker wraps ExpensiveTree, which re-renders on every color change
function App() {
  return <ColorPicker />;
}

function ColorPicker() {
  const [color, setColor] = useState('blue');
  return (
    <div style={{ color }}>
      <ExpensiveTree />  {/* always re-renders with ColorPicker */}
      <input value={color} onChange={e => setColor(e.target.value)} />
    </div>
  );
}

// Good — App passes ExpensiveTree as children; App doesn't re-render on color change
function App() {
  return (
    <ColorPicker>
      <ExpensiveTree />
    </ColorPicker>
  );
}

function ColorPicker({ children }) {
  const [color, setColor] = useState('blue');
  return (
    <div style={{ color }}>
      {children}  {/* same element reference from App — React bails out */}
      <input value={color} onChange={e => setColor(e.target.value)} />
    </div>
  );
}
```

Why does this work? `<ExpensiveTree />` is a React element — an object created by `App`'s render. `App` doesn't re-render when `color` changes (color state is in `ColorPicker`). So the `children` prop passed to `ColorPicker` is the same React element object on every `ColorPicker` render. React sees the same reference and bails out of reconciling `ExpensiveTree`.

This is composition as a performance strategy, not just a design pattern.

---

## Pattern 3: Lift Content Up (Render Props / Slot Props)

The same idea extends to render props or any JSX prop. If the JSX is created in a parent that doesn't re-render, it's a stable reference.

```js
// The sidebar content comes from App (doesn't re-render), not Layout (re-renders on scroll)
function App() {
  return (
    <Layout sidebar={<SidebarContent />}>
      <MainContent />
    </Layout>
  );
}

function Layout({ sidebar, children }) {
  const [scrollY, setScrollY] = useState(0);
  // ... scroll handling
  return (
    <div>
      <aside>{sidebar}</aside>  {/* stable reference from App */}
      <main>{children}</main>   {/* stable reference from App */}
    </div>
  );
}
```

`SidebarContent` and `MainContent` never re-render due to scroll changes in `Layout`, even without memo.

---

## How React Bails Out on Same-Reference Elements

When React encounters a child element during reconciliation and the element's reference is identical to the previous render (same object pointer), it skips reconciling that entire subtree. This is a built-in optimization in the reconciler — it's not specific to `React.memo`. It relies on the fact that React elements are immutable — if the reference is the same, the content must be the same.

```js
// React element identity:
const el = <ExpensiveTree />;
// el is an object: { type: ExpensiveTree, props: {} }
// If this same object is passed as children on the next render,
// React doesn't enter ExpensiveTree at all.
```

This is why the children-as-props pattern works without any memo.

---

## Pattern 4: Separate Rendering Concerns with Context

When multiple disconnected parts of the tree respond to the same state, context is the standard solution. But the structure of the context provision matters:

```js
// Bad — ThemeProvider re-renders the whole app on theme change
function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ExpensiveStaticSection />  {/* re-renders on theme change */}
      <ThemedUI />
    </ThemeContext.Provider>
  );
}

// Better — isolate the provider to only wrap what actually consumes it
function App() {
  return (
    <div>
      <ExpensiveStaticSection />  {/* no re-render on theme change */}
      <ThemedApp />
    </div>
  );
}

function ThemedApp() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ThemedUI />
    </ThemeContext.Provider>
  );
}
```

---

## When to Reach for Memo vs Structure

| Approach | Use when |
|---|---|
| Push state down | Fast-changing state is only needed by a small subtree |
| Children as props | A wrapper re-renders often but its content doesn't need to change |
| React.memo | You can't restructure and the component is measurably expensive |

Structural fixes are preferable to memo when possible — they're zero-cost (no comparison overhead) and self-documenting (the code makes the data flow visible). Memo is the escape hatch when restructuring is impractical.

---

## Gotchas

**1. The children trick only works if the parent of the expensive tree is stable.**

If `App` re-renders (due to its own state), `<ExpensiveTree />` is re-created as a new element object and the same-reference bailout no longer applies. The pattern relies on `App` (the tree creator) being stable.

**2. Pushing state down can create prop drilling problems.**

If the moved state is needed by multiple siblings, you've traded a re-render problem for a prop-drilling or context problem. The right refactor depends on the access pattern.

**3. The children-as-props pattern doesn't prevent effects from running.**

If `ExpensiveTree` has a `useEffect` that fires on every render, passing it as children doesn't help — you'd need to fix the effect dependencies. Same-reference bailout prevents the component *function* from running, which prevents effects from re-running, but only if the component doesn't re-render at all.

**4. Context still causes re-renders in consumers regardless of structure.**

Even if you've perfectly isolated state using these patterns, any `useContext` call in `ExpensiveTree` will re-render it when that context value changes. Structural patterns control parent→child propagation but not context propagation.

---

## Interview Questions

**Q (High): You have an expensive component re-rendering because its parent re-renders, but you want to avoid adding `React.memo`. What structural patterns can you use?**

Answer: Two main patterns. First, push state down — if the parent's state is only used by a small portion of the tree, move that state into a smaller component that only wraps what needs it. The expensive component becomes a sibling, outside the re-render propagation path. Second, use children as props — move the expensive component up to a grandparent that doesn't re-render, and pass it down as `children`. When the immediate parent re-renders, the `children` prop is the same React element reference (created by the stable grandparent), so React bails out of reconciling it without needing memo. Both patterns work by keeping the expensive component outside the blast radius of the re-rendering state owner.

The trap: Many candidates jump straight to `React.memo` for any re-render problem. Interviewers testing performance depth will ask "can you avoid memo entirely?" — knowing the structural patterns shows architectural understanding, not just API knowledge.

---

**Q (High): How does passing a component as `children` prevent it from re-rendering when the parent re-renders?**

Answer: A React element is a plain JavaScript object created by `React.createElement`. When `App` renders `<ExpensiveTree />` and passes it as `children` to `Wrapper`, that object is created in `App`'s render. If `App` doesn't re-render, the same object reference is passed to `Wrapper` every time `Wrapper` re-renders. During reconciliation, React checks element identity — if the element reference is the same as the previous render, it skips reconciling that entire subtree. The expensive component function never runs. This is a built-in reconciler optimization, independent of `React.memo`.

---

**Q (Medium): What's the tradeoff between pushing state down and using `React.memo`?**

Answer: Pushing state down is zero-cost — no comparison overhead, no need to stabilize references with `useCallback`/`useMemo`, and the code makes the data flow visible by design. The tradeoff is structural: it only works when the state is genuinely local to a small subtree. If the state needs to be shared across many siblings or distant descendants, pushing it down creates prop drilling or requires context. `React.memo` is more flexible — it works regardless of where state lives — but it adds comparison cost on every render, requires reference stability from the parent, and can introduce stale closure bugs when combined with `useCallback`. Prefer structural solutions; use memo when structure can't solve it.

---

*Next: Inline Objects/Functions in JSX — the children-as-props pattern works because elements are created in a stable parent. But inline objects and functions created in JSX defeat memoization entirely. This topic covers exactly why, and the systematic fix.*
