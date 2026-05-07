# Context API Limitations

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| All-or-nothing subscription | Every `useContext` consumer re-renders on any value change | No built-in way to subscribe to only part of a context |
| Object reference problem | Inline object literals in `value` prop create new references on every render | All consumers re-render even when logical content is unchanged |
| `React.memo` bypass | Context changes skip memo's prop-change interception entirely | Wrapping a consumer in memo does not prevent context-triggered re-renders |
| No selectors | Context has no equivalent to `useSelector` — you get the whole value | Fine-grained subscriptions require splitting contexts or a selector library |

## What Context Actually Is

React Context is a broadcast mechanism, not a state management solution. It lets a value — any value — skip the component tree and land directly in any descendant that subscribes to it. What it is not is a store, a selector system, or a cache. The conflation of "Context" with "state management" is the source of most Context-related performance bugs.

The API has two parts: `createContext` produces a context object with a `Provider`. Any component that calls `useContext(MyContext)` subscribes to that provider's `value` prop and re-renders whenever it changes.

```js
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  );
}

function Button() {
  const theme = useContext(ThemeContext); // re-renders when theme changes
  return <button className={theme}>Click</button>;
}
```

---

## The Core Problem: No Selective Subscriptions

Every component that calls `useContext(X)` re-renders whenever the context value changes — regardless of whether the part of the value it cares about actually changed.

```js
const AppContext = createContext(null);

function App() {
  const [user, setUser] = useState({ name: 'Alice' });
  const [theme, setTheme] = useState('light');

  // This object is recreated on every render
  return (
    <AppContext.Provider value={{ user, theme, setUser, setTheme }}>
      <Tree />
    </AppContext.Provider>
  );
}

function UserAvatar() {
  const { user } = useContext(AppContext); // re-renders when theme changes too
  return <img src={user.avatar} />;
}
```

`UserAvatar` only uses `user`, but it re-renders whenever `theme` changes because the context value object is a new reference. There is no concept of "I only care about this key" — Context is all-or-nothing per subscription.

> **Check yourself:** A component calls `useContext(AppContext)` and only reads `ctx.user`. The provider updates `ctx.theme`. Does the component re-render? Why?

---

## The Value Object Reference Problem

Context compares values with `Object.is`. When the Provider's `value` prop is an object literal, React creates a new object on every parent render, triggering all consumers to re-render even when the logical contents are unchanged:

```js
// Every render creates a new object → all consumers re-render
<MyContext.Provider value={{ count, increment }}>

// Fix: memoize the value
const ctxValue = useMemo(() => ({ count, increment }), [count, increment]);
<MyContext.Provider value={ctxValue}>
```

This is easy to miss and often overlooked in code review. The fix is `useMemo` on the value object, but that just reduces the frequency of re-renders — it doesn't give consumers the ability to subscribe selectively.

---

## Bailout Doesn't Work for Context

`React.memo` and `useMemo` cannot bail out a context consumer. If a component subscribes to a context that changes, it will re-render — even if it's wrapped in `React.memo`, even if all its props are stable:

```js
const MemoChild = React.memo(function Child() {
  const value = useContext(MyContext); // memo does nothing here
  return <div>{value.count}</div>;
});
```

`React.memo` only intercepts renders propagated from a parent through props. Context bypasses that interception entirely — it's a separate subscription channel. A context change is like an invisible prop change that memo never sees.

> **Check yourself:** You wrap a context consumer in `React.memo` and all its props are stable. The context value changes. Does the component re-render?

---

## No Middleware or Derived State

Redux has middleware. Zustand has middleware. Context has none. There's no built-in way to:

- Intercept actions before they modify state
- Log state transitions
- Run side effects on state change (without putting them in `useEffect`)
- Derive computed state efficiently (every consumer must derive it inline, on every render)

If you need any of these things, you're building them yourself on top of Context — at which point you've reimplemented a library's plumbing and gotten none of the optimizations.

---

## When Context Is the Right Tool

Context works well for values that:

1. Change infrequently — theme, locale, auth user, feature flags
2. Are consumed by many components — no prop-drilling alternative
3. Are consumed wholesale — no need for selective subscriptions

It works poorly for:

1. High-frequency updates — form state, real-time data, scroll position
2. Large objects where consumers only care about parts
3. State with complex update logic (use `useReducer` + Context for this, but still no selectors)
4. Anything where you'd want middleware, devtools, or time-travel debugging

The common interview mistake is saying "just use Context instead of Redux." That's defensible for small apps with slow-changing global values. It's wrong for complex state with frequent updates and selective consumption needs.

---

## The Propagation Model

When a context value changes, React walks the tree from the Provider downward and marks every component that subscribes to that context as needing a re-render — skipping components that don't subscribe. This means the re-render cost scales with the number of subscribers, not the depth of the tree. An app with 50 components subscribing to a single frequently-updating context has 50 components re-rendering on every keystroke.

This is different from how Redux (with `react-redux`) works: `useSelector` subscribers only re-render when the selected slice of state changes, using a per-component equality check.

> **Check yourself:** An app has 50 components subscribed to one context that updates on every keystroke. How many re-renders occur per keystroke, and what is the equivalent behavior in Redux?

---

## Interview Questions


**Q (High): Why is React Context not a replacement for Redux?**

Answer: Context is a broadcast mechanism — it propagates a value to all subscribers, and all subscribers re-render when the value changes. Redux (with react-redux) provides selective subscriptions via `useSelector`: each component only re-renders when its selected slice of state changes. For high-frequency updates or large state trees where different components care about different parts, Context causes unnecessary re-renders that Redux avoids. Additionally, Redux has a middleware pipeline, devtools with time-travel debugging, and normalized store patterns that Context provides no equivalent for. Context is appropriate for infrequently-changing global values; Redux is appropriate for complex, frequently-updated shared state.

---

**Q (High): You have a Context with a `{ user, theme }` object. `UserProfile` only uses `user` and `ThemeButton` only uses `theme`. Both re-render on every state change. Why and how do you fix it?**

Answer: The context value is a single object. When either `user` or `theme` changes, the entire object is a new reference, and every subscriber — regardless of which key it uses — re-renders because `Object.is` sees a new value. The fixes: (1) Split into two separate contexts — `UserContext` and `ThemeContext` — so changes to one don't affect subscribers of the other. (2) Keep one context but memoize the value object so it only creates a new reference when one of its contents actually changes. (3) Use a selector library like `use-context-selector` to add `useSelector`-style subscriptions to Context. Splitting contexts is usually the simplest and most maintainable fix.

---
**Q (Medium): Does wrapping a context consumer in `React.memo` prevent re-renders caused by context changes?**

Answer: No. `React.memo` intercepts renders that propagate from parent to child through props. Context subscriptions bypass that path — they're a direct subscription channel between the consumer and the provider. When a context value changes, React marks all subscribers for re-render directly, and memo never sees the signal. The component will re-render regardless of memo. To prevent unnecessary re-renders from context, you need to either split contexts, memoize the context value, or use a selector library.

---

**Q (Medium): What happens when you put a new object literal directly in a Context Provider's `value` prop?**

Answer: A new object is created on every render of the component that owns the Provider. Since `Object.is` sees a new reference on every render, all consumers re-render on every render of that parent — even if the logical contents haven't changed. Fix: memoize the value with `useMemo` so a new object is only created when the underlying data changes.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why `React.memo` does not prevent context-triggered re-renders
- [ ] Can explain the object reference problem and write the `useMemo` fix from memory
- [ ] Can state the two conditions under which Context is the right tool vs the wrong tool
- [ ] Can describe what "all-or-nothing subscription" means and why it causes unnecessary re-renders
- [ ] Can explain how Redux's `useSelector` differs from Context subscriptions in terms of re-render granularity

---

*Next: Context optimization — splitting providers, memoizing values, and using selector libraries to get selective subscriptions out of Context.*
