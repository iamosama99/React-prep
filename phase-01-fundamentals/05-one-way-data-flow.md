# One-Way Data Flow

## What Is This?

One-way data flow is React's core architectural rule: **data moves down the component tree as props, and change requests move back up through callbacks.** A parent passes data to a child. If the child needs to change that data, it calls a function the parent passed down. The actual change happens in the owner — the parent — and the new value flows back down as a prop.

Nothing flows sideways. Nothing flows up spontaneously. The direction is always: owner → consumer for data, consumer → owner for intent to change.

```jsx
function Parent() {
  const [name, setName] = useState('Osama');
  return <Child name={name} onNameChange={setName} />;
}

function Child({ name, onNameChange }) {
  return <input value={name} onChange={e => onNameChange(e.target.value)} />;
}
```

`name` flows down as a prop. `onNameChange` is the callback that flows the child's intent back up. The child never touches state directly — it calls a function that the owner decides what to do with.

---

## Why One-Way Flow Exists

This is a deliberate design choice, and understanding why it was made is what makes the rule feel logical rather than arbitrary.

**The problem with two-way data binding** (as in early AngularJS, or `v-model` in Vue 2): any component can read and write shared data directly. A change anywhere propagates to all bindings immediately. This sounds convenient — less code to write — and it is, until the app grows.

With two-way binding, when the UI shows unexpected data, you have to trace *which binding* wrote what, *when*, and in what order multiple simultaneous mutations resolved. In a large app with many components sharing state, this is extremely hard to debug. The data has no single owner — everyone is reading and writing — so understanding the current state requires understanding the entire write history from every direction.

**One-way flow constrains that.** There is always exactly one component that owns a piece of state. If you want to know why a value is what it is, you find the owner — the component that holds it in `useState` — and trace the event handlers that call `setState`. The trail is always top-down, one direction, one owner. You can answer "why is the cart empty?" by finding the component that owns cart state and reading its update logic. You don't have to worry about a sibling component that wrote to it from the side.

This traceability is what makes React applications debuggable at scale.

---

## How It Works in Practice

### Data flows down through props

Any component can pass data to its children as props. Those children can pass to their children. The data cascades down the tree, always from owner to consumer:

```jsx
function App() {
  const [user, setUser] = useState({ name: 'Osama', role: 'admin' });
  return <Dashboard user={user} onUserUpdate={setUser} />;
}

function Dashboard({ user, onUserUpdate }) {
  return (
    <div>
      <Header username={user.name} />
      <ProfileEditor user={user} onSave={onUserUpdate} />
    </div>
  );
}
```

`user` is owned by `App`. `Dashboard`, `Header`, and `ProfileEditor` are all consumers. None of them own the data — they display and potentially trigger changes to it.

### Change intent flows back up through callbacks

When a child wants to change something the parent owns, it calls a function the parent provided:

```jsx
function ProfileEditor({ user, onSave }) {
  const [draft, setDraft] = useState(user);

  function handleSubmit() {
    onSave(draft); // calls the parent's setter with the new value
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))} />
      <button type="submit">Save</button>
    </form>
  );
}
```

`ProfileEditor` has its own local draft state (edits haven't been committed yet). When the user submits, it calls `onSave(draft)` — which is the parent's `setUser`. The parent updates its state, re-renders, and the new `user` flows back down. The child is in complete control of *when* it asks the parent to update, but the parent controls *whether* and *how* to actually update.

### The component as a pure function of its inputs

The ideal React component behaves like a pure function: given the same props and state, it always renders the same output. Side effects are constrained to `useEffect`. Nothing unexpected happens during rendering.

This is the logical consequence of one-way flow. If data only comes from props (from above) and state (owned by this component), then the output is fully determined by those two inputs. There are no hidden channels writing to the component from the side.

```jsx
// This component is a pure function of its props — fully predictable
function UserBadge({ name, role }) {
  return (
    <span className={`badge badge-${role}`}>
      {name} ({role})
    </span>
  );
}
```

You can predict exactly what this renders by reading its props. You don't need to know anything about other components, global state, or timing.

---

## Lifting State Up

The most important practical pattern that follows from one-way flow is **lifting state up**: when two components need to share the same data, you move the state to their common ancestor, which then passes it down to both.

```jsx
// Problem: two components both need to show/update the same count
// Solution: lift the state to their common parent

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Display count={count} />
      <Controls onIncrement={() => setCount(c => c + 1)} />
    </div>
  );
}

function Display({ count }) {
  return <p>Count: {count}</p>;
}

function Controls({ onIncrement }) {
  return <button onClick={onIncrement}>+</button>;
}
```

`Display` and `Controls` are siblings. They can't share state directly — siblings don't have a channel between them in one-way flow. The solution is to own the state at `Parent` — the lowest common ancestor — and pass data down to `Display` and a callback down to `Controls`.

This pattern is called lifting state up because you're moving state from child to parent (or higher) to share it. The alternative — keeping state in both components and synchronizing them — always leads to inconsistency.

Knowing when to lift state is a core React design skill. The rule: if two components need to agree on the same value, that value's state lives in their nearest common ancestor.

---

## One-Way Flow and the "Source of Truth" Principle

Because data has a single owner, there is a single source of truth for every piece of state. No component needs to track a copy of data owned elsewhere — it just reads the prop passed to it.

The antipattern is copying props into local state:

```jsx
// Antipattern — creates a second source of truth
function NameDisplay({ name }) {
  const [localName, setLocalName] = useState(name); // copies prop into state

  // Now `localName` and `name` can get out of sync.
  // If the parent's `name` prop changes, `localName` doesn't update
  // (initial state value is used only once).
}
```

When you copy props to state, you now have two sources of truth. They'll diverge the moment the parent updates the prop — the child's local copy doesn't update automatically. This is almost always wrong.

The correct behavior: read the prop directly, or use `useMemo`/derivation to transform it. If you need to track *local edits before committing them* (like a form draft), that's a specific legitimate case — but you should think of local state as "uncommitted edits," not a copy of the prop.

---

## Gotchas

**Prop drilling is a symptom, not a violation.** One-way flow requires that data pass through intermediate components to reach deeply nested consumers. When 5 components in a chain only forward a prop without using it, that's prop drilling — a maintenance problem, not a fundamental flaw in the model. The model is correct; the tree structure may need rethinking (more composition) or you may need a different tool (Context, state management library) for genuinely global data. Don't confuse the symptom with the rule.

**Callbacks don't break one-way flow — they complete it.** A callback prop is not "two-way data binding." The data still flows down (as the result of the parent updating state). The callback is the mechanism for expressing intent, not a backdoor for bidirectional mutation. Understanding this distinction matters in interviews.

**Sibling-to-sibling communication always goes through the parent.** There is no direct sibling channel. Component A cannot directly update Component B if they're siblings. They must share state through their common ancestor. If this feels cumbersome, it's a signal that the two components are more tightly coupled than the current tree structure reflects — either lift state, use Context, or restructure composition.

**Parent re-renders always trigger child re-renders by default.** When a parent re-renders (because its state changed), all of its children re-render — even children whose props didn't change. This is by design: React prefers correctness over premature optimization. If a child's render is expensive and its props genuinely haven't changed, `React.memo` opts it out. But this is an optimization applied after the fact, not the default behavior.

---

## Interview Questions

**Q: What is one-way data flow in React and why did React choose it?**

Answer: One-way data flow means data travels in a single direction: from parent to child as props. Children communicate intent back to parents via callbacks, but they don't write to parent state directly — the parent decides whether and how to update. React chose this model for predictability and debuggability: with a single owner per piece of state, you can always trace the current value to its source. In a two-way binding model, any component can modify shared state, which makes it hard to answer "why does this value look like this?" when the app has grown. One-way flow constrains the answer to: find the owner, read its update logic.

The trap: Describing one-way flow as a limitation ("React can't do two-way binding"). It's a deliberate constraint that buys traceability. The follow-up question is almost always "then how does user input work?" — the answer is controlled components and callbacks.

---

**Q: What does "lifting state up" mean, and when do you do it?**

Answer: Lifting state up means moving state from a child component to its parent (or further up) so that multiple components can share access to the same data. The trigger is when two components need to agree on the same value. Siblings can't share state directly — React has no sibling-to-sibling channel. So you move state to their nearest common ancestor, which passes the data down to one and the update callback down to the other (or both). The principle: state should live in the lowest component that needs to know about it. No higher (unnecessary coupling), no lower (can't be shared).

The trap: Immediately reaching for Context or Redux when two components need to share state. Lifting state is the right first tool — it's local, explicit, and doesn't require additional infrastructure. Context and libraries are for when lifting becomes impractical (too deep, too many consumers).

---

**Q: If sibling components need to communicate, how do they do it in React's one-way flow model?**

Answer: Through their common ancestor. Component A cannot directly signal Component B — there's no React mechanism for that. The pattern: lift the shared state to the nearest common parent, pass it down as a prop to the component that reads it, and pass a callback down to the component that needs to trigger changes. When the callback fires, the parent updates state, and the new value flows down to the other sibling. It feels indirect, but it keeps the data and the flow predictable. If the state needs to be shared across very distant cousins in a large tree, Context is the right tool — it's essentially the same pattern but skips the intermediary components.

The trap: Suggesting the components use a shared mutable variable outside the tree (like a module-level object). That completely bypasses React's rendering model and causes unsynchronized updates.

---

**Q: Why is copying a prop into local state with `useState` usually a bug?**

Answer: Because it creates two sources of truth. The initial value passed to `useState` is only used on the first render — after that, local state and the prop diverge. If the parent re-renders with a new prop value, the component's local copy doesn't update. Now the UI reflects stale data, and any handler that updates local state further entrenches the divergence. The legitimate exception is "uncontrolled mode" — when you intentionally copy an initial value and let the component manage edits locally (like a form field with a `defaultValue`). Even then, you should be explicit about it in the component's design and name the prop `initialX` rather than `x` to signal it's a seed value, not a live prop.

The trap: Not knowing that `useState(prop)` only reads the prop once. This is a common real-world bug.

---

**Q: What is the difference between one-way data flow and two-way data binding?**

Answer: In two-way data binding, a piece of UI state is directly connected to a data model — changes in the UI update the model, and changes to the model update the UI, automatically in both directions. In React's one-way flow, the UI reads data passed down as props, and any change to data goes through an explicit callback that updates the owner's state, which then re-renders the UI. Two-way binding is less code to wire up initially but harder to debug at scale because you lose the single-source-of-truth property. One-way flow is more explicit and slightly more verbose, but every data change is traceable to a specific `setState` call in a specific owner component. React's controlled inputs (`value` + `onChange`) are sometimes called "two-way binding" colloquially, but they implement the one-way flow pattern — the input is driven by state, and `onChange` requests a state update via a callback. The data always flows through the owner.

The trap: Thinking React can't do interactive forms because it only allows one-way flow. The controlled input pattern is the answer.

---

*Next: Conditional Rendering — one-way flow governs how data gets to a component. Conditional rendering governs what that component does with the data: how you use it to decide what to show or hide, and the patterns and gotchas that come with expressing conditions inside JSX.*
