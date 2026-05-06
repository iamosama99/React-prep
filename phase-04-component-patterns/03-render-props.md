# Render Props

## What Is This?

A render prop is a function prop that a component calls to get what it should render. Instead of rendering its own JSX, the component passes its internal data to the function and renders whatever that function returns.

```jsx
<Mouse render={({ x, y }) => (
  <div>Cursor at {x}, {y}</div>
)} />
```

The `Mouse` component tracks mouse position. The `render` prop receives that position and decides what to draw. `Mouse` owns the behavior; the caller owns the output.

The pattern is often implemented as `children` as a function (sometimes called "function as children"):

```jsx
<Mouse>
  {({ x, y }) => <div>Cursor at {x}, {y}</div>}
</Mouse>
```

These are equivalent. `children` as a function is more ergonomic at the call site.

## Why Does It Exist?

Before hooks (React < 16.8), there was no clean way to share stateful logic between components. Mixins were removed, HOCs had prop-drilling and wrapper hell problems, and class components couldn't extract logic into reusable functions.

Render props solved this by inverting control: the component with the logic calls *you* with the data. You decide how to render. This gave library authors a way to ship reusable behavior — mouse tracking, scroll position, form state, data fetching — without dictating the UI.

Libraries like `react-motion`, `downshift`, `react-query` (early versions), and `formik` popularized the pattern between 2016–2019. Even after hooks landed, render props remain in the ecosystem because:

1. Some libraries still use them (Formik's `<Field render>`, React Router's `<Route render>`)
2. They work in environments that can't use hooks (non-component contexts, very old React versions)
3. They can be more explicit than hooks about what data flows where

## How It Works

```jsx
class Mouse extends React.Component {
  state = { x: 0, y: 0 };
  
  handleMouseMove = (e) => {
    this.setState({ x: e.clientX, y: e.clientY });
  };
  
  render() {
    return (
      <div onMouseMove={this.handleMouseMove}>
        {this.props.render(this.state)}
      </div>
    );
  }
}

// Usage
<Mouse render={({ x, y }) => <Cursor x={x} y={y} />} />
```

As a function component with `children`:

```jsx
function Mouse({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {children(pos)}
    </div>
  );
}

// Usage
<Mouse>
  {({ x, y }) => <Cursor x={x} y={y} />}
</Mouse>
```

The data flows down from `Mouse` into the render function, and the JSX returned flows back up as the rendered output. The component doesn't know or care what `children` does with the position data.

## Render Props vs HOCs

They solve the same problem — sharing behavior — with different trade-offs:

```jsx
// HOC
const TrackedCursor = withMouse(Cursor);
// Cursor receives x and y as props, but where they come from isn't visible at the call site

// Render prop
<Mouse>{({ x, y }) => <Cursor x={x} y={y} />}</Mouse>
// Explicit: x and y come from Mouse, passed to Cursor
```

| | Render Props | HOCs |
|---|---|---|
| Data flow visibility | Explicit at call site | Invisible (magic props) | 
| Nesting | Can nest deeply (callback hell) | Compose at module level |
| Prop naming collisions | Not possible | Possible (two HOCs add same prop name) |
| Static analysis | Better — it's just a function call | Harder — type inference through HOC is tricky |
| In React DevTools | Shows as one component | Adds wrapper components to tree |

## Render Props vs Hooks

The honest comparison:

```jsx
// Render prop
<Mouse>
  {({ x, y }) => <div style={{ left: x, top: y }} />}
</Mouse>

// Hook
function Follower() {
  const { x, y } = useMouse();
  return <div style={{ left: x, top: y }} />;
}
```

Hooks win for:
- No extra wrapper in the component tree
- Easier to compose (call multiple hooks, no pyramid of callbacks)
- Work in conditions (sort of — see Rules of Hooks)
- More readable, especially with multiple behaviors combined

Render props still win when:
- You need to share *rendering* behavior, not just data/logic
- The consumer component receives the JSX from the provider (like `react-table`'s slot system)
- The library must work without hooks (rare now)

## Real Patterns in the Wild

**React Router v5 (still in many codebases):**
```jsx
<Route path="/user/:id" render={({ match }) => (
  <UserProfile id={match.params.id} />
)} />
```

**Formik's `<Field>` component:**
```jsx
<Field name="email">
  {({ field, meta }) => (
    <div>
      <input {...field} />
      {meta.error && <span>{meta.error}</span>}
    </div>
  )}
</Field>
```

**Headless UI patterns (before they switched to hooks):**
```jsx
<Disclosure>
  {({ open }) => (
    <>
      <Disclosure.Button>Toggle {open ? '▲' : '▼'}</Disclosure.Button>
      <Disclosure.Panel>Content here</Disclosure.Panel>
    </>
  )}
</Disclosure>
```

## Gotchas

**Inline render functions cause re-renders on every parent render.** When you write `render={() => <Cursor />}` inline, a new function identity is created every time the parent renders, which means the child sees new props every time and re-renders. Cache the function or move it outside the render if performance matters.

```jsx
// Bad — new function every render
<Mouse render={() => <Cursor />} />

// Good — stable reference
const renderCursor = ({ x, y }) => <Cursor x={x} y={y} />;
<Mouse render={renderCursor} />
```

**"Callback hell" with nested render props.** Before hooks, combining multiple behaviors required nesting:

```jsx
<Mouse>
  {mouse => (
    <Scroll>
      {scroll => (
        <WindowSize>
          {size => <MyComponent mouse={mouse} scroll={scroll} size={size} />}
        </WindowSize>
      )}
    </Scroll>
  )}
</Mouse>
```

This is exactly what hooks eliminated. If you see this in a codebase, it's a prime candidate for migrating to hooks.

**`children` as a function surprises type checkers.** TypeScript doesn't automatically know `children` is a function — you need to type it explicitly as `children: (data: T) => ReactNode`.

**Don't use the term "render prop" to mean "a prop that accepts JSX."** That's a prop that accepts `ReactNode` (a value, not a function). A render prop is specifically a function that the component calls. The distinction matters in interviews.

## Interview Questions

**Q (High): What is a render prop and what problem does it solve?**

Answer: A render prop is a function prop that a component calls and renders the return value of. The component owns some behavior (state, subscriptions, calculations), and instead of rendering a fixed output, it delegates rendering to the caller. This solves the problem of sharing stateful logic between components — before hooks, this and HOCs were the only good options. The component and its behavior are reusable; the rendering is customizable.

The trap: Describing it as "a prop that takes JSX." That's a `ReactNode` prop, not a render prop. The function-call inversion is the whole point.

**Q (High): What's the main performance gotcha with render props and how do you fix it?**

Answer: Inline arrow functions are created fresh on every render, so the render prop prop has a new identity each time the parent renders. The child sees new props and re-renders. The fix is to define the function outside the render or wrap it in `useCallback` if it depends on state. This is one advantage of hooks over render props — a custom hook doesn't create any extra function allocations.

The trap: Saying "it's fine because React is fast." It's often fine, but in lists or high-frequency renders (scroll handlers, animations), it becomes visible. The interviewer wants you to know the mechanism.

**Q (Medium): When would you still choose a render prop over a custom hook in new code?**

Answer: When you're sharing rendering behavior rather than just logic. If a component needs to own part of the JSX shape — like `react-table` providing row structures, or a virtualized list providing item renderers — render props are the natural fit because hooks return data, not JSX. Also when building a component that calls back with both data and event handlers that should stay bundled together semantically. In practice, hooks cover 90% of cases, but render props still appear in rendering-centric libraries.

The trap: "Hooks always win." Understanding the rendering-vs-logic distinction shows senior-level nuance.

**Q (Medium): How is a render prop different from a HOC architecturally?**

Answer: A HOC enhances a component at definition time — you wrap it once and the wrapped component always has the extra props. A render prop operates at render time — the behavior component renders first, then calls your function, then renders your result. HOCs compose at the module level and their data source is invisible at the call site. Render props make the data source explicit in JSX. HOCs work better for capabilities that should be transparent to the caller; render props work better when the caller needs to react to the data the provider exposes.

The trap: Saying "they're the same, just different syntax." The composition model, data flow visibility, and DevTools representation are all different.

---
*Next: Higher-Order Components (HOCs) — the other pre-hooks pattern for sharing logic, still found throughout the ecosystem and important to understand deeply.*
