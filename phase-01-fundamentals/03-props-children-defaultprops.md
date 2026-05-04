# Props, props.children, and defaultProps

## What Is This?

**Props** (short for properties) are how you pass data *into* a component. They're the component's public API — the knobs and levers a caller can turn to customize what the component does or displays.

From a pure JavaScript perspective, props are just the first argument to a function component:

```jsx
function Button({ label, onClick, disabled }) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// Caller
<Button label="Save" onClick={handleSave} disabled={false} />
```

When React calls `Button`, it passes `{ label: 'Save', onClick: handleSave, disabled: false }` as the first argument. That's it. There's no magic — props are a regular JavaScript object.

**`props.children`** is a special prop that contains whatever you put *between* a component's opening and closing tags:

```jsx
<Card>
  <h2>Title</h2>
  <p>Some content here</p>
</Card>
```

Inside `Card`, `props.children` is the `<h2>` and `<p>` elements. This is what makes components composable — they can accept arbitrary content from the outside, just like native HTML elements do.

**`defaultProps`** was the original mechanism for defining fallback values when a prop is not passed. In modern React with function components, this has been replaced by JavaScript default parameter syntax. But you'll still encounter `defaultProps` in class components and older codebases.

---

## Why Props Exist — The Mechanism Behind Reusability

Without props, every component would be hardcoded. You'd need a `SaveButton`, a `CancelButton`, a `DeleteButton` — separate components for every variation. Props are what make a single `Button` component work for all of them.

More fundamentally, props enforce **one-way data flow** — data moves *down* the component tree from parent to child, never the other way around. A parent owns the data, passes it down as props, and the child renders based on what it receives. This constraint is what makes React applications predictable: to understand what a component renders, you look at its props. There are no side channels.

This is in deliberate contrast to two-way data binding frameworks (like early Angular), where data could flow both ways and state could be hard to trace. React chose the stricter model intentionally.

---

## How Props Work — The Full Picture

### Props are read-only by design

A component must never modify its own props. If you receive `{ count: 5 }` as a prop, you cannot do `props.count = 6`. This isn't just a convention — it's an architectural rule.

Why? Because the parent owns that data. The child is a consumer, not an owner. If the child modified props, you'd have two places mutating the same data, and the parent would have no way to know its data changed. The result would be unpredictable, out-of-sync UIs — exactly the problem React's one-way flow prevents.

If a child needs to change something that affects the parent, it does so by calling a function the parent passed *down* as a prop:

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return <Child count={count} onIncrement={() => setCount(c => c + 1)} />;
}

function Child({ count, onIncrement }) {
  // Child doesn't own `count` — it can only request a change via onIncrement
  return <button onClick={onIncrement}>{count}</button>;
}
```

The data flows down (count → Child). The *intent to change* flows back up (onIncrement ← Child calls it). The actual change still happens in the owner (Parent calls setCount). This pattern is fundamental to React — it's the basis of "lifting state up."

### Any JavaScript value is a valid prop

Strings, numbers, booleans, objects, arrays, functions, other React elements — anything:

```jsx
<UserCard
  name="Osama"                        // string
  age={31}                            // number
  isAdmin={true}                      // boolean
  permissions={['read', 'write']}     // array
  config={{ theme: 'dark' }}          // object
  onDelete={handleDelete}             // function
  icon={<StarIcon />}                 // React element
/>
```

Passing a function as a prop is the standard way to give a child component a way to communicate upward — the callback pattern above.

Passing a React element as a prop is less common but powerful — it lets a caller inject arbitrary UI into a component without changing the component. This is the foundation of the render props pattern and the slot pattern.

### Boolean shorthand in JSX

If a prop's value is `true`, you can omit the value:

```jsx
<Button disabled />
// is identical to
<Button disabled={true} />
```

And if you want `false`, you must be explicit:

```jsx
<Button disabled={false} />
```

### Spreading props

You can spread an object onto a component as props:

```jsx
const buttonProps = { label: 'Save', disabled: false, onClick: handleSave };
<Button {...buttonProps} />
// is identical to
<Button label="Save" disabled={false} onClick={handleSave} />
```

This is common when a wrapper component passes most props through to a child. But spread can make it hard to know what a component is receiving — use it deliberately.

---

## props.children — Components as Wrappers

`children` is a built-in prop that React populates with whatever you put between a component's opening and closing tags.

```jsx
function Card({ children }) {
  return <div className="card">{children}</div>;
}

// Usage
<Card>
  <h2>My Title</h2>
  <p>My content</p>
</Card>
```

`children` can be anything: a string, a single element, multiple elements, null, an array, or even a function (the render props pattern). What you receive in `children` is exactly what the caller placed inside the tags.

### Why children matters

Without children, every component would have to define explicit props for every piece of content:

```jsx
// Without children — caller has to name everything
<Card title={<h2>My Title</h2>} body={<p>My content</p>} />

// With children — caller controls the content naturally
<Card>
  <h2>My Title</h2>
  <p>My content</p>
</Card>
```

The children pattern is what makes components feel like HTML — you nest content inside them naturally, and the component wraps or decorates that content without needing to know what it is. Layout components (`Container`, `Section`, `Modal`, `Card`), provider components (`ThemeProvider`, `AuthProvider`), and utility wrappers all use children this way.

### children is just a prop — it can be passed explicitly too

This surprises people: you can pass `children` as a named prop:

```jsx
<Card children={<p>Hello</p>} />
// identical to
<Card><p>Hello</p></Card>
```

This is rarely done in practice but it confirms that `children` has no special status in the props object — it's just a conventionally-named prop that JSX populates automatically from nested content.

### Multiple children vs a single child

When you pass multiple children, `children` is an array. When you pass one child, `children` is that single element (not wrapped in an array). When you pass none, `children` is `undefined`. This inconsistency is the reason `React.Children.map` exists — it handles all cases uniformly. More on that in the Component Patterns phase.

---

## defaultProps and Default Parameters

### The original way: defaultProps

In the class era, `defaultProps` was how you defined fallback values for missing props:

```jsx
class Button extends React.Component {
  static defaultProps = {
    variant: 'primary',
    disabled: false,
  };

  render() {
    return (
      <button className={this.props.variant} disabled={this.props.disabled}>
        {this.props.children}
      </button>
    );
  }
}
```

This also worked with function components for a long time:

```jsx
function Button({ variant, disabled, children }) { ... }

Button.defaultProps = {
  variant: 'primary',
  disabled: false,
};
```

### The modern way: JavaScript default parameters

With function components, you don't need `defaultProps`. JavaScript's native default parameter syntax does the same thing, more directly and with better TypeScript support:

```jsx
function Button({ variant = 'primary', disabled = false, children }) {
  return (
    <button className={variant} disabled={disabled}>
      {children}
    </button>
  );
}
```

Default parameters are resolved at the call site — if the prop is `undefined` (not passed), the default kicks in. This is standard JavaScript behavior.

**React 19 deprecated `defaultProps` for function components.** It still works but logs a warning. The intent is clear: use default parameters. `defaultProps` continues to be supported for class components because classes don't have a clean native equivalent.

---

## Prop Drilling — When Props Become a Design Problem

Prop drilling is what happens when data needs to travel through multiple layers of the component tree to reach a deeply nested component that actually needs it. The intermediate components have no use for the data — they just pass it through:

```jsx
function App() {
  const [user, setUser] = useState({ name: 'Osama', role: 'admin' });
  return <Dashboard user={user} />;
}

function Dashboard({ user }) {
  // Dashboard doesn't use `user` — just passes it down
  return <Sidebar user={user} />;
}

function Sidebar({ user }) {
  // Sidebar doesn't use `user` — just passes it down
  return <UserAvatar user={user} />;
}

function UserAvatar({ user }) {
  // This is the only component that actually needed it
  return <img src={user.avatar} alt={user.name} />;
}
```

The problem isn't performance — it's maintenance. When the `user` object shape changes, you have to update every intermediate component's prop types and destructuring, even though they don't care about the data. This coupling between unrelated components is the smell.

The solutions are context (for data that many components need), composition (for structural problems), or a state management library (for global state). All of these are covered in later phases. The key thing to recognize at this stage is *why* prop drilling is a problem — it's not that passing props is wrong, it's that making components responsible for forwarding data they don't use creates invisible coupling.

---

## Gotchas

**`children` is `undefined` when empty, not an empty array.** `<Card></Card>` or `<Card />` gives you `children = undefined`, not `children = []`. This means checking `if (children)` works, but code that calls `children.map(...)` will throw if children are absent. Guard with `React.Children.map` or check first.

**Default parameter values only trigger on `undefined`, not `null`.** If a caller explicitly passes `null`, the default does not apply:

```jsx
function Button({ variant = 'primary' }) { ... }

<Button variant={null} />  // variant is null, not 'primary'
<Button />                 // variant is 'primary' ✅
```

This is plain JavaScript behavior, but it surprises people. If your API needs to treat `null` and `undefined` the same, coerce: `variant ?? 'primary'` inside the function body.

**Spreading props can pass unrecognized HTML attributes to the DOM.** If you do `<div {...props} />` and `props` contains custom keys like `isAdmin` or `onDataLoad`, React will attempt to set them as DOM attributes and log a warning. Filter out custom props before spreading onto native elements.

**Mutating props doesn't cause a re-render — it silently breaks things.** React doesn't watch for mutations on the props object. If you do `props.count++`, the value changes in memory but React has no idea — the UI won't update, and the parent's state is now corrupted because the child modified something it didn't own. This is why the read-only rule exists.

**`key` and `ref` are not available in props.** Even though you write them as JSX attributes, React strips them from the `props` object before passing it to your component. `props.key` and `props.ref` are always `undefined` inside the component.

**Re-rendering doesn't mean props changed.** A component re-renders whenever its parent re-renders, even if the props passed to it are identical. This is the basis for `React.memo` — but that's a Phase 5 topic.

---

## Interview Questions

**Q: What are props and how are they different from state?**

Strong answer: Props are inputs passed *into* a component from its parent — they are owned by the caller, read-only inside the component, and the mechanism for one-way data flow. State is data *owned by* the component itself — it lives inside the component, can be changed by the component, and causes a re-render when it changes. The key mental model: props are "what you're told," state is "what you remember." A component can read its props freely, but it can never write to them.

The trap: Saying "props are external, state is internal" without explaining *why* props are read-only. The reason is ownership — the parent is the source of truth, and the child modifying that data would break the traceability that one-way flow provides.

---

**Q: What is props.children and when would you use it?**

Strong answer: `children` is a built-in prop that React populates with whatever is nested between a component's opening and closing tags in JSX. It lets a component act as a wrapper or container without needing to know in advance what content it will hold. You use it for layout components (`Card`, `Modal`, `Section`), context providers (`ThemeProvider`), and any component where the caller should control the inner content. It's what makes components composable like HTML elements.

The trap: Thinking `children` is special beyond its name. It's an ordinary prop — you can pass it explicitly as `children={...}` — it just has the syntactic convenience that JSX populates it from nested content automatically.

---

**Q: What is prop drilling, why is it a problem, and how do you solve it?**

Strong answer: Prop drilling is passing data through multiple component layers to reach a deeply nested component, where intermediate components receive and forward props they don't actually use. The problem is maintenance coupling — when the data shape changes, every intermediate component needs to be updated even though they have no interest in the data. It also makes components harder to reuse in isolation because they carry props purely for forwarding. Solutions depend on the cause: Context API for data that many components need (like theme, auth user, locale); composition/children for structural problems where you can restructure the tree; state management libraries for app-wide state.

The trap: Saying "prop drilling is always bad" or "use Context instead of props." Context has its own performance tradeoffs (every consumer re-renders on any context change). Prop drilling is only a problem when it becomes deep and pervasive. 2-3 levels is usually fine.

---

**Q: What's the difference between `defaultProps` and default parameter values?**

Strong answer: Both define fallback values for missing props, but they operate at different levels. `defaultProps` is a React-level feature — React merges the defaults into the props object before calling the component. Default parameters are a JavaScript-level feature — the runtime substitutes the default when the argument is `undefined`. For function components, default parameters are the modern approach: they're native JavaScript, better supported by TypeScript type inference, and `defaultProps` for function components was deprecated in React 19. `defaultProps` still applies for class components.

The trap: Not knowing that `defaultProps` is deprecated for function components. Also missing that both approaches only trigger on `undefined` — passing `null` explicitly bypasses both.

---

**Q: Why are props immutable? What happens if you mutate them?**

Strong answer: Props are immutable by design because the parent is the source of truth. The parent owns the data and passes it down — the child is a consumer, not an owner. If the child could mutate props, you'd have two places writing the same data with no coordination, breaking React's traceability guarantees. In practice, mutating props doesn't throw — JavaScript doesn't prevent it — but it corrupts the parent's state silently, and since React doesn't watch for mutations, the UI won't update. You get inconsistent state with no re-render and no error. If a child needs to trigger a change, it calls a function passed down as a prop.

The trap: Thinking React throws an error on prop mutation. It doesn't (unless you're in strict mode with a frozen object). The danger is silent corruption, which is harder to debug than a crash.

---

**Q: How do you pass data from a child component back up to a parent?**

Strong answer: You can't pass data *up* directly — that would break one-way data flow. Instead, the parent passes a callback function down as a prop, and the child calls it when something happens. The parent's callback runs in the parent's scope, so it has access to the parent's state setter. The data technically flows upward through a function call, but *state* is always updated in the owner. This is the "lifting state up" pattern.

The trap: Saying "you can't do it at all" or suggesting you'd reach for Context or Redux for this. Callback props are the right tool for parent-child communication. Context and libraries are for non-parent/child relationships or global state — overkill for a simple child-to-parent notification.

---

**Q: What does React do with `key` and `ref` props — do they show up in `props` inside the component?**

Strong answer: No. `key` and `ref` are special attributes that React intercepts and uses for its own purposes — `key` for the reconciliation algorithm to identify list items, `ref` for exposing DOM nodes or component imperative handles. React strips both from the props object before passing it to your component. Inside the component, `props.key` and `props.ref` are always `undefined`. If you need to pass a key-like identifier to a component for internal use, you have to pass it as a different prop name (e.g., `id`).

The trap: Thinking you can read `props.key` inside a component to access the key you set on it from the outside. This never works and surprises people the first time they try it.

---

**Q: You have a component used in 20 places and you need to add a new optional prop with a default. What's the safest way to do it?**

Strong answer: Add it with a default value in the function signature: `function MyComponent({ existingProp, newProp = 'defaultValue' })`. Because the default kicks in when the prop is absent (`undefined`), all 20 existing call sites that don't pass the prop will get the default automatically — no changes needed at the call sites. This is the whole value of defaults. If you're in a TypeScript codebase, mark the prop optional in the type: `newProp?: string`. The only risk is if some call sites are explicitly passing `null` and expecting the default behavior — default parameters don't activate on `null`, so you'd need `newProp = undefined` and handle null inside the function, or use `newProp ?? 'defaultValue'` in the body.

The trap: Saying you'd add a required prop and update all 20 call sites. That's valid for truly required data, but unnecessary for optional behavior with sensible defaults. The interviewer is testing whether you default-in-the-signature instinctively.

---

*Next: State & Immutability — props are data passed in from outside that a component can't change. State is data a component owns and can change. Understanding how that change mechanism works — and why you must never mutate it directly — is the foundation for everything in React's rendering model.*
