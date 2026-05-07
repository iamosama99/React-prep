# Composition Over Inheritance

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Composition | Building UI by combining components via props/children | Avoids tight coupling and deep class hierarchies |
| Containment | Passing unknown content through `children` | Components own structure; callers own content |
| Specialization | Creating variants by configuring, not extending | Zero extra logic — just presets on the base component |
| Named slots | Passing multiple content areas as separate props | Explicit layout control when one `children` isn't enough |
| Behavior composition | Sharing logic via custom hooks, not base classes | Logic is reusable without adding anything to the component tree |

## What Is This?

Composition over inheritance means building reusable behavior by *combining* components rather than extending from base classes. Instead of a `BaseButton` that `PrimaryButton` inherits from, you pass behavior and UI through props, children, and hooks — assembling the result from parts.

In React this shows up most obviously in how you nest components:

```jsx
// Inheritance mindset (not how React works well)
class FancyDialog extends Dialog {
  renderContent() { return <SpecialContent />; }
}

// Composition mindset (how React works)
function FancyDialog() {
  return (
    <Dialog>
      <SpecialContent />
    </Dialog>
  );
}
```

> **Check yourself:** What is the core difference between the inheritance mindset and the composition mindset as shown in the code above — specifically, what does each approach control?

## Why Does It Exist?

JavaScript's prototype chain supports inheritance, but UI components are a terrible fit for it. Here's why:

**Inheritance creates tight coupling.** If `Dialog` changes its internal structure, every subclass may break. You can't override just one slot — you inherit all the assumptions the parent baked in.

**UI is naturally compositional.** A button *has* an icon, not *is* an icon. A modal *has* a header and a body, not *extends* them. The containment relationship maps directly to JSX nesting.

**React's component model makes inheritance awkward.** Class components technically support it via `extends`, but React's own team explicitly discouraged it. Facebook built thousands of components without ever needing inheritance beyond `React.Component`. The recommendation has been the same since 2016: use composition.

The Gang of Four said this in 1994 for general OOP. React just makes it the *only* good option for UIs.

## How It Works

There are two main compositional mechanisms in React:

### 1. Containment via `children`

When a component doesn't know its content ahead of time — dialogs, cards, panels — it accepts anything through `children`:

```jsx
function Card({ children, className }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// The caller decides what goes inside
<Card className="featured">
  <img src={hero} alt="" />
  <h2>Title</h2>
  <p>Body text</p>
</Card>
```

The `Card` owns the shell; the caller owns the content. Neither knows about the other's internals.

### 2. Specialization via props

When you need a "special case" of a general component, build it by configuring rather than extending:

```jsx
function Button({ variant = 'secondary', size = 'md', children, ...rest }) {
  return (
    <button className={`btn btn--${variant} btn--${size}`} {...rest}>
      {children}
    </button>
  );
}

// Specialized versions are just configured instances
function PrimaryButton(props) {
  return <Button variant="primary" {...props} />;
}

function SmallPrimaryButton(props) {
  return <Button variant="primary" size="sm" {...props} />;
}
```

No class hierarchy. `PrimaryButton` adds zero logic — it's a preset.

### 3. Multiple named slots via named props

When `children` isn't enough, pass multiple render areas explicitly:

```jsx
function SplitLayout({ sidebar, main, footer }) {
  return (
    <div className="layout">
      <aside>{sidebar}</aside>
      <main>{main}</main>
      <footer>{footer}</footer>
    </div>
  );
}

<SplitLayout
  sidebar={<NavMenu />}
  main={<ArticleContent />}
  footer={<PageFooter />}
/>
```

This is sometimes called the "named slots" pattern — borrowed from web components, achieved here with ordinary props.

### 4. Behavior composition via hooks

Shared non-visual logic belongs in custom hooks, not in a base class:

```jsx
// Old class approach: inherit from BaseDataFetcher
// Composition approach: use a hook

function useUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetchUsers().then(setUsers); }, []);
  return users;
}

function UserList() {
  const users = useUsers();
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

function AdminUserList() {
  const users = useUsers(); // same behavior, different rendering
  return <table>...</table>;
}
```

The hook *composes in* the behavior without either component knowing about the other.

> **Check yourself:** When would you choose named slot props over a single `children` prop? What is the signal that you've reached the limit of named slots?

## Inheritance vs Composition — Side by Side

| | Inheritance | Composition |
|---|---|---|
| Reuse mechanism | Extend a class | Pass parts as props/children |
| Coupling | Tight — subclass depends on parent internals | Loose — components see only their props |
| Override granularity | Override entire methods | Pass different JSX for any slot |
| Testability | Must test through the full hierarchy | Each component tested in isolation |
| TypeScript ergonomics | Complex — `super`, method signatures | Simple — props are just function arguments |

## Gotchas

**"Composition over inheritance" doesn't mean no abstraction.** You still extract `<Button>`, `<Dialog>`, `<Card>`. It means you compose these primitives rather than subclassing them.

**`children` is opaque by default — you can't introspect it safely.** If you find yourself cloning children to inject props (`React.cloneElement`), that's a smell. Usually compound components or render props serve better. See those topics next.

**Named slot props become unwieldy past 3-4 slots.** When you have `header`, `footer`, `sidebar`, `toolbar`, and `statusBar`, consider compound components so the caller controls placement.

**Don't confuse component composition with state composition.** Composing render trees is easy. Composing state across multiple composed components is where you need Context, lifting state, or a state manager. Composition solves the UI structure problem, not the state sharing problem.

## Interview Questions

**Q (High): Why does React prefer composition over inheritance?**

Answer: React's component model is fundamentally function-in, JSX-out. Inheritance implies a hierarchy of overrides and shared mutable state via `this`, which conflicts with React's unidirectional data flow and the expectation that components are predictable given their props. Composition maps directly to JSX nesting — a component owns the structure, the caller provides the content through `children` or named props. The result is looser coupling, easier testing, and better TypeScript modeling, since props are just function arguments rather than inherited method contracts.

The trap: Candidates who say "because class components are deprecated." That's not the reason — the preference for composition predates hooks and applied even in the class component era. The real reason is architectural.

**Q (High): What is the "named slots" pattern and when would you use it over `children`?**

Answer: Named slots means accepting multiple render areas as separate props (e.g., `sidebar`, `header`, `footer`) rather than a single `children`. You use this when the component has structurally distinct areas that callers need to fill independently, and when the order of those areas is defined by the component, not the caller. `children` is fine when there's one continuous content area. Named slots are better when there are multiple distinct positions, especially if their visual order and markup structure are owned by the layout component.

The trap: Overusing `children` for everything and then fighting it with `React.Children.toArray` inspection. Named slots keep the API explicit.

**Q (Medium): How do hooks replace inheritance for sharing non-visual logic?**

Answer: In the class era, you'd put shared logic in a base class (`BaseForm extends React.Component`) and have subclasses call `super.method()`. With hooks, you extract the logic into a custom hook and call it in any component that needs it. The hook has no opinion about how the component renders — it returns data and setters. Multiple components can share behavior without knowing about each other's rendering, and the logic is independently testable via `renderHook`. It's mixins done correctly, without the namespace collisions.

The trap: Describing hooks as "replacing HOCs" — that's partially true, but the deeper answer is that hooks replace the *need for inheritance* for logic reuse.

**Q (Medium): Can you give an example where you'd still choose a HOC or render prop over composition?**

Answer: Composition via `children` handles structure well but not cross-cutting concerns — things like analytics tracking, authentication guards, or error boundaries that need to wrap arbitrary components. A HOC is still appropriate when you want to add behavior to a component you don't own or can't modify. Render props still appear in libraries that must support React < 16.8. But in greenfield code, a custom hook almost always replaces both for logic concerns.

The trap: Saying "you'd never use them" — HOCs are still common in older codebases and in some library APIs.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why inheritance is a poor fit for React UI components (in terms of coupling and unidirectional data flow)
- [ ] Can write a containment component using `children` and a specialization component using props from memory
- [ ] Can name the four compositional mechanisms in React and give a one-sentence description of each
- [ ] Can explain when to switch from `children` to named slot props, and when named slots become unwieldy
- [ ] Can explain how custom hooks replace inheritance for logic reuse, and what the pre-hooks alternative was

---
*Next: Compound Components — how to take composition further when you need related components to share implicit state without prop drilling.*
