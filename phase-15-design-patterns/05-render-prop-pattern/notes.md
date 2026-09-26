# Render Props (as a Design Pattern)

## Quick Reference

| Form | Looks like | Use when |
|---|---|---|
| `render` prop | `<Mouse render={pos => <Cat {...pos} />} />` | Named, explicit; several render props on one component |
| Children-as-function | `<Mouse>{pos => <Cat {...pos} />}</Mouse>` | Single render slot; reads like a block |
| Extension-point props | `<List renderItem={…} renderEmpty={…} />` | The component owns the loop/layout; caller owns per-item UI |
| Replaced by | `const pos = useMouse()` | Logic reuse where the *hook can be called in the consumer* |
| Still wins | Render-time control by the parent | Virtualised lists, per-row render, headless UI, cross-component context |

## Where You've Seen This Before

- Mechanism, both spellings, the callback-nesting problem, hooks as the successor → [Phase 4: Render props](../../phase-04-component-patterns/03-render-props/notes.md)
- Why logic moved to hooks → [Custom hooks as the modern pattern](../../phase-04-component-patterns/05-custom-hooks-modern-pattern/notes.md) and [Topic 7](../07-custom-hook-pattern/notes.md)
- Function-as-child and memoisation traps → [Inline objects/functions in JSX](../../phase-05-performance/07-inline-objects-functions-jsx/notes.md)
- Windowed lists use `renderItem` heavily → [List virtualisation](../../phase-05-performance/10-list-virtualization/notes.md)

**New here:** the design lens — what *problem* render props solve that composition doesn't, a rigorous **"render prop → hook + thin component" migration recipe**, the cases where a render prop is still the *right* tool (not just legacy), and typing them with generics.

## What Is This?

A **render prop** is a prop whose value is a function returning React elements. A component that takes one *delegates a piece of rendering* to its caller, and calls the function with whatever data or handlers the caller needs.

```tsx
type MouseProps = { children: (pos: { x: number; y: number }) => ReactNode };

function Mouse({ children }: MouseProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return <>{children(pos)}</>;
}

<Mouse>{({ x, y }) => <p>Cursor at {x}, {y}</p>}</Mouse>
```

`Mouse` knows *how* to track; the caller decides *what to draw*. That's the same inversion of control as compound components — but where compound components invert control over **structure**, render props invert control over **output given data**.

> **Check yourself:** In the example, who owns the mouse state, and who owns the markup? Where does the state live if two different `<Mouse>` instances are on the page?

## Why Does It Exist?

Pre-hooks (2016–2018), function components had no state, and class components couldn't share logic except by inheritance (discouraged) or HOCs (indirect, with prop collisions). Render props were the explicit alternative: the reusable component holds the stateful logic and *passes it to the caller* through a function argument. Data flow is visible, names never collide, and you can typecheck the argument.

They also solved a problem hooks *don't*: **the parent decides rendering at render time, per instance, with values the child computes.**

```tsx
<VirtualList
  items={rows}
  height={600}
  rowHeight={40}
  renderItem={(row, index, style) => <Row key={row.id} row={row} style={style} />}
/>
```

`VirtualList` computes which rows are visible and the `style` (absolute position) for each; the caller supplies what a row looks like. A hook can't express "call my rendering function only for the visible subset."

> **Check yourself:** Why can't `useVirtualList(rows)` fully replace `renderItem`? What does the component still need from the caller at render time?

## How It Works

### Two spellings, one idea

```tsx
<Fetch url="/api/users" render={({ data, loading }) => …} />     // render prop
<Fetch url="/api/users">{({ data, loading }) => …}</Fetch>        // children as function
```

Children-as-function reads better for a single slot; named render props scale when a component needs several (`renderHeader`, `renderRow`, `renderEmpty`). TypeScript treats them identically: type the prop as a function.

### Typing with generics

```tsx
type FetchState<T> = { data: T | null; loading: boolean; error: Error | null; refetch: () => void };

function Fetch<T>({ url, children }: { url: string; children: (s: FetchState<T>) => ReactNode }) {
  const state = useFetch<T>(url);        // the logic already lives in a hook…
  return <>{children(state)}</>;         // …the component is a thin adapter
}

<Fetch<User[]> url="/api/users">{({ data }) => <Users list={data ?? []} />}</Fetch>
```

Note the last two lines: the modern form of a render-prop component **is a thin wrapper over a hook**. That's the migration recipe.

### Render prop → hook, in three steps

1. Move the state/effects from the render-prop component into `useThing()`.
2. Return exactly what the render function used to receive.
3. Keep `<Thing render>` as a two-line adapter *only if* JSX call sites or non-hook contexts (class components, `React.cloneElement` boundaries) still need it — otherwise delete it.

```tsx
// Before                              // After
<Mouse>{p => <Cat {...p} />}</Mouse>   const p = useMouse(); return <Cat {...p} />;
```

### The nesting problem — and why hooks fix it

```tsx
// "Callback pyramid" — three concerns, three indentation levels
<Mouse>{pos =>
  <Fetch url={`/near?x=${pos.x}`}>{({ data }) =>
    <Toggle>{({ on, toggle }) => …}</Toggle>}</Fetch>}</Mouse>

// Hooks: flat, and each value is a plain variable
const pos = useMouse();
const { data } = useFetch(`/near?x=${pos.x}`);
const [on, toggle] = useToggle();
```

### Extension points — the survivor use case

Components that own a *loop or layout* and want per-item rendering from the caller: `renderItem`, `renderEmpty`, `renderOption`, `renderCell`. TanStack Table (`flexRender`), Downshift, Formik's `<Field>` / `<FieldArray>`, React Aria collections, and windowing libraries still use this shape. It's not legacy; it's the correct tool when the *parent* needs to run rendering code with values the *child* computes.

## When To Use Which

| Need | Use |
|---|---|
| Share stateful logic between components | **Custom hook** |
| Caller decides the element structure inside a widget that shares state | Compound components (Topic 4) |
| Component owns iteration/layout, caller owns per-item output | **Render prop** (`renderItem`) |
| Wrap a *component* with behaviour (auth guard, error boundary, memo) | HOC (Topic 6) |
| Fixed regions, no data crossing | Slots (Topic 14) / `children` |

> **Check yourself:** You're building `<DataTable columns rows />`. Which parts of it would you expose as render props, which as compound components, and which as plain props?

## Gotchas

**Inline render functions defeat `React.memo`.** `render={x => <Cat {...x} />}` is a new function each render, so a memoised component receiving it re-renders every time. Stabilise with `useCallback`, or hoist the function out of the component when it needs no closure. (Compilers like React Compiler make this automatic — Topic 13.)

**Hooks inside the render function.** The function you pass is *called during the component's render*, not as its own component, so calling `useState` inside it registers the hook against the **wrapper** component. Conditional calls, or changing how many times it's invoked, break the Rules of Hooks. If the callback needs state, return a real component from it.

**Keys.** When a render prop produces a list, the `key` must sit on the element you return, not on the wrapper.

**Callback nesting.** More than two levels deep is a signal to switch to hooks or compound components.

**Performance of returning big trees.** The function runs on every render of the provider — for expensive subtrees, memoise the returned element or extract a memoised component and render it from the callback.

**Naming.** `render`, `children`, `renderX` are conventions, not React features. Be consistent within a codebase.

**Stale closures.** The function captures the caller's variables at render time, like any closure. Nothing special — but people forget when the provider re-renders rarely.

## Interview Questions

**Q (High): What is the render-props pattern and what problem does it solve?**

Answer: A component takes a function prop that returns elements and calls it with data or behaviour it owns, so it can share logic without deciding the UI. Before hooks it was the explicit way to reuse stateful logic between components: the reusable component owns the state, the caller owns the markup, and data flow is visible through function arguments — no prop-name collisions like HOCs, no inheritance. It's an inversion-of-control pattern over *rendering given values*.

The trap: Describing it only as "passing a function as a prop" without stating the inversion of control or the logic-reuse motivation.

**Q (High): Hooks replaced most render props. When is a render prop still the right choice?**

Answer: When the component owns iteration or layout and the *caller must supply per-item output at render time with values the component computed*: windowed lists (`renderItem(row, style)`), tables and grids (`renderCell`), comboboxes (`renderOption`), form-field render helpers, and headless UI libraries that need the parent's JSX in specific slots. A hook can return data but can't make the component invoke your rendering code for only the visible or relevant items. I'd still write the *logic* as a hook and expose the render prop as the adapter.

The trap: "Never — hooks replaced them." That misses extension-point use cases.

**Q (High): How do you migrate a render-prop component to a hook?**

Answer: Move state and effects into `useThing()` and return what the render function used to receive. Update call sites to call the hook and use the values directly, which flattens nesting. Keep a thin `<Thing>{fn}</Thing>` wrapper that calls the hook only if class components or third-party consumers still need the component form. Type stays the same: the render function's argument becomes the hook's return type.

The trap: Rewriting behaviour along the way. The migration should be mechanical and covered by existing tests.

**Q (Medium): What's the difference between the `render` prop and children-as-function?**

Answer: None mechanically — both are function props. Children-as-function uses the `children` slot so the call site reads like a block; a named `render` prop is better when a component needs multiple render slots or when `children` already has another meaning. TypeScript types them the same way.

The trap: Claiming they behave differently, or that `children` as a function is special-cased by React. It isn't.

**Q (Medium): What happens if you call `useState` inside the render function you pass to a render-prop component?**

Answer: The function is executed during the provider's render, so the hook attaches to the *provider* component, not to anything in your tree. It "works" until the provider calls the function conditionally or a different number of times — then you violate the Rules of Hooks and state slots misalign. If the child needs its own state, return a component element (`<Row />`) that has its own hooks.

The trap: Not realising the callback isn't a component.

**Q (Medium): How do inline render props interact with `React.memo` and how do you fix it?**

Answer: An inline arrow is a new reference each render, so a memoised receiver sees a changed prop and re-renders. Fix by `useCallback` when the function closes over changing values, hoisting it to module scope when it doesn't, or using React Compiler which memoises automatically. You can also restructure so the memoised part receives data and the render function is called outside it.

The trap: Wrapping the receiver in `memo` and expecting a win while passing an inline function.

**Q (Low): Compare render props, HOCs and hooks for logic reuse.**

Answer: HOCs wrap a component and inject props — implicit names, static composition, wrapper hell, harder typing. Render props pass values through a function argument — explicit, but nest. Hooks return values into the consumer — flat, composable, plain functions, but can't be used in classes and can't wrap a component boundary (e.g. error boundaries). Today: hooks for logic, render props for render-time extension points, HOCs for wrapping components.

The trap: Framing it as pure historical progression rather than fit-for-purpose.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write `<Mouse>` / `<Fetch<T>>` as render-prop components in both spellings
- [ ] Can state the inversion of control involved (render at the caller, state at the provider)
- [ ] Can convert a render-prop component to a hook and keep a thin adapter
- [ ] Can name three cases where a render prop is still the best tool
- [ ] Can explain why an inline render function breaks `memo` and why hooks inside it are unsafe
- [ ] Can compare render props, HOCs, hooks on wrapping, nesting, typing and class support

---
*Next: [Higher-Order Functions & Components](../06-hof-and-hoc-pattern/notes.md) — the third reuse mechanism, which starts in plain JavaScript and ends up wrapping components.*
