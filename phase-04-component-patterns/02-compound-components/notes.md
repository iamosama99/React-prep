# Compound Components

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Compound components | A group of components sharing implicit state via Context | Caller gets layout control; parent keeps state encapsulated |
| Inversion of control | Caller arranges sub-components however they like | No longer limited to combinations the author anticipated |
| Context-based sharing | Sub-components read shared state from a Provider | Works at any nesting depth; no prop threading |
| Controlled + uncontrolled | Supporting both `value` and `defaultValue` modes | Makes components reusable in simple and complex scenarios |
| Dot notation | Exposing sub-components as `Parent.Child` | Communicates family membership; single import |

## What Is This?

Compound components are a pattern where a group of components work together, sharing implicit state, to form a single cohesive UI element. The canonical examples are `<select>` and `<option>` — `<option>` has no meaning outside `<select>`, and `<select>` needs its children to know which options are available. They're two separate elements but they form one logical component.

In React, you build this with Context:

```jsx
<Tabs defaultValue="overview">
  <Tabs.List>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="details">Details</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Panel value="overview"><OverviewContent /></Tabs.Panel>
  <Tabs.Panel value="details"><DetailsContent /></Tabs.Panel>
</Tabs>
```

The caller controls layout and content. `Tabs` manages which tab is active. The sub-components read that state automatically — no `activeTab` prop threading.

## Why Does It Exist?

The problem is **inversion of control with shared state**.

The naive way to build a `Tabs` component is to accept an array of `{ label, content }` configs:

```jsx
<Tabs tabs={[
  { label: 'Overview', content: <OverviewContent /> },
  { label: 'Details', content: <DetailsContent /> },
]} />
```

This works until the caller needs to customize the tab list structure — put an icon next to one label, render a badge on another, conditionally render one tab, or rearrange them. Every customization becomes a new prop. The API grows without bound, and the caller still can't express things the component author didn't anticipate.

Compound components flip this: the parent owns the state; the caller owns the structure. The caller gets complete layout control, and the sub-components get access to shared state without any prop threading. You get flexibility *and* encapsulation simultaneously.

> **Check yourself:** What is the specific problem with the array-of-configs API that compound components solve? What can a caller do with compound components that they can't do with config props?

## How It Works

There are two approaches: Context-based (modern) and `React.cloneElement`-based (legacy).

### Context-based compound components

```jsx
const TabsContext = createContext(null);

function Tabs({ defaultValue, children }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Must be used inside <Tabs>');
  return ctx;
}

Tabs.List = function TabsList({ children }) {
  return <div role="tablist">{children}</div>;
};

Tabs.Trigger = function TabsTrigger({ value, children }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = function TabsPanel({ value, children }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
};
```

The parent (`Tabs`) holds state in a Context. Each sub-component reads only what it needs. The caller arranges them however they like.

### Controlled variant

Allow callers to fully control the state:

```jsx
function Tabs({ value, defaultValue, onChange, children }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  const activeTab = value ?? internalValue;
  const setActiveTab = onChange ?? setInternalValue;
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}
```

When `value` is provided, `Tabs` becomes controlled (the caller drives state). When it's not, internal state takes over. This is the standard dual-mode design used in Radix, Headless UI, and every serious component library.

### `React.cloneElement` approach (legacy)

The older technique iterates `children` and injects props directly:

```jsx
function Tabs({ children, defaultValue }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div>
      {React.Children.map(children, child =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </div>
  );
}
```

This has significant problems: it only works one level deep (grandchildren don't get the injected props), it breaks with non-element children (strings, nulls), it requires sub-components to accept those props explicitly, and it's unpredictable when children are wrapped in fragments or other components. **Context is strictly better** for all new code.

> **Check yourself:** Why does the `React.cloneElement` approach break at depth, and how does Context solve that specific problem?

## Naming Sub-components

There are two conventional ways to expose sub-components:

**Dot notation (most common):**
```jsx
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Panel = TabsPanel;
```
Callers write `<Tabs.Trigger>`. The relationship is visually obvious, and tree-shaking still works since they're module-level functions.

**Named exports:**
```jsx
export { Tabs, TabsList, TabsTrigger, TabsPanel };
// caller: import { Tabs, TabsTrigger } from './tabs'
```
Allows more flexible import patterns, but loses the visual grouping.

Most serious libraries use dot notation for the parent-is-namespace convention.

## Real-World Examples

Radix UI, shadcn/ui, and Headless UI are all built on compound components. `<Select.Root>`, `<Select.Trigger>`, `<Select.Content>`, `<Select.Item>` — that's compound components with Context plus accessibility roles baked in. The pattern is so dominant in design system work that understanding it is non-negotiable at the senior level.

## Gotchas

**The Context must be private.** Don't export `TabsContext`. Sub-components should expose a `useTabsContext()` hook internally. If you export the context, callers can read/write the internal state directly, bypassing your API surface.

**Sub-components used outside the parent will fail silently or with confusing errors.** That's why `useTabsContext` should throw: `if (!ctx) throw new Error('TabsTrigger must be used inside Tabs')`. This makes misuse obvious immediately.

**`React.cloneElement` breaks with non-element children.** If the caller passes `null`, `false`, or a string as a child (e.g., for conditional rendering), `cloneElement` will throw. Context doesn't have this problem.

**Dot notation and Fast Refresh sometimes conflict.** If you assign sub-components as properties on the function after declaration (not inline), some bundlers may drop them in dev mode. Assign them before export, or define them as separate named components.

**Controlled + uncontrolled simultaneously requires care.** If you support both modes (as shown above), you need to decide: when both `value` and `defaultValue` are provided, which wins? Convention is `value` wins (controlled takes precedence), and you should warn in dev when the component transitions between controlled and uncontrolled.

**Server Components and Context don't mix.** If you're in a React Server Component environment (Next.js App Router), the Context provider must be in a Client Component (`'use client'`). Compound components built on Context are inherently client-side.

## Interview Questions

**Q (High): What problem do compound components solve that a simple props-based API doesn't?**

Answer: They give the caller inversion of control over structure while keeping state encapsulated. A single-component API (where you pass config as props) limits the caller to whatever combinations the author anticipated. Compound components let the caller arrange sub-components however they want — reorder them, add markup between them, conditionally render some — while the parent transparently manages the shared state. You get the full flexibility of JSX composition without any prop-threading.

The trap: Saying "it's just for aesthetics / cleaner syntax." The real answer is about power — the caller can do things the component author never explicitly designed for.

**Q (High): Why is Context preferred over `React.cloneElement` for compound components?**

Answer: `cloneElement` only injects props one level deep — grandchildren don't receive them. It breaks when children aren't React elements (null, strings, fragments). It requires sub-components to declare and forward the injected props explicitly, coupling them to the parent's injection. Context has none of these limitations: any sub-component anywhere in the tree can opt into the shared state regardless of nesting depth, and non-element children aren't affected.

The trap: Only knowing that "hooks are better than cloneElement" without explaining the specific mechanism of why.

**Q (High): How do you implement a compound component that supports both controlled and uncontrolled modes?**

Answer: Store the value in internal state (`useState(defaultValue)`) but override it with the `value` prop when provided. The active value is `value !== undefined ? value : internalValue`. The setter similarly defers to the `onChange` callback when provided, or updates internal state when not. This is the same pattern React uses for native inputs — `value` + `onChange` makes it controlled, omitting `value` makes it uncontrolled. In a compound component you surface this through the root (`Tabs.Root` / `Tabs`) since it owns the Context.

The trap: Using `defaultValue` as state and then merging the `value` prop on top — this conflates the two modes. They should be exclusive: if `value` is provided, internal state is ignored.

**Q (Medium): What's the advantage of dot notation (`Tabs.Trigger`) over named exports (`TabsTrigger`)?**

Answer: Dot notation communicates that these components are part of a family — they're designed to work together and have limited meaning in isolation. The import is a single namespace: `import { Tabs } from './tabs'` vs importing six separate names. It also makes auto-complete in editors show the available sub-components when you type `Tabs.`. Named exports are more flexible for tree-shaking and aliasing but lose the grouping signal. In practice, most libraries use dot notation for the compound component API.

The trap: Thinking dot notation has runtime implications. Both approaches use the same Context under the hood — the difference is purely API ergonomics.

**Q (Medium): How do you protect against someone using a sub-component outside its parent?**

Answer: The internal `useContext` call returns `null` (or whatever your default is). You add a guard that throws a descriptive error: `if (!ctx) throw new Error('<Tabs.Trigger> must be rendered inside <Tabs>')`. This converts a subtle, confusing runtime failure (undefined reads, silent wrong behavior) into an immediate, actionable error message.

The trap: Using `createContext(someDefault)` with a non-null default to avoid the check. This means misuse fails silently — the sub-component renders but with no real state backing it. Always use `createContext(null)` and throw explicitly.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the inversion-of-control problem that compound components solve, using a specific example like Tabs
- [ ] Can write the Context-based compound component structure from memory (Provider, guard hook, sub-components as dot properties)
- [ ] Can explain why `React.cloneElement` fails at depth and what specific limitation Context overcomes
- [ ] Can implement the controlled/uncontrolled dual-mode pattern in a compound component root
- [ ] Can name at least two real-world libraries that use compound components and one gotcha specific to this pattern

---
*Next: Render Props — an older but still relevant pattern for sharing behavior without hooks, and still found throughout the ecosystem.*
