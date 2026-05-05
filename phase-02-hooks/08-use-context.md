# useContext

## What Is This?

`useContext` is a hook that lets a component read a value from a React context — a mechanism for sharing data through the component tree without passing props at every level.

```javascript
const theme = useContext(ThemeContext);
```

Any component in the tree can read the context value without needing the parent to explicitly pass it down as a prop. The component automatically re-renders whenever the context value changes.

## Why Does It Exist?

The problem it solves is **prop drilling**: passing data through multiple layers of intermediary components that don't use the data themselves, just to get it to a deeply nested component that does.

```javascript
// Prop drilling: every intermediate component must know about theme
function App() {
  const [theme, setTheme] = useState('dark');
  return <Layout theme={theme} setTheme={setTheme} />;
}
function Layout({ theme, setTheme }) {
  return <Sidebar theme={theme} setTheme={setTheme} />;
}
function Sidebar({ theme, setTheme }) {
  return <Toggle theme={theme} setTheme={setTheme} />;
}
function Toggle({ theme, setTheme }) {
  // This is the only component that actually needs theme
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>...</button>;
}
```

Context cuts through the intermediate layers. `Toggle` can read `theme` directly without `Layout` and `Sidebar` ever knowing it exists.

The context API existed in React since the class component era, but the `useContext` hook (introduced in React 16.8) made it much more ergonomic than the old `contextType` or render-prop `Consumer` patterns.

## How It Works

### Creating and Providing Context

```javascript
// 1. Create the context (usually in its own file)
const ThemeContext = createContext('light'); // 'light' is the default value

// 2. Provide a value somewhere up the tree
function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <Layout />
    </ThemeContext.Provider>
  );
}
```

The `Provider` component broadcasts a value to all descendants. Components outside the Provider get the default value passed to `createContext`.

### Consuming the Context

```javascript
// 3. Any descendant can read it
function Toggle() {
  const theme = useContext(ThemeContext);
  return <div className={`toggle ${theme}`}>...</div>;
}
```

`useContext` subscribes `Toggle` to the context. When `App` updates the theme state, the Provider re-renders with a new value, and `Toggle` automatically re-renders with the new value.

### The Re-Render Model

This is the critical part to understand. When the Provider's `value` prop changes reference, **every component that calls `useContext` with that context re-renders**, regardless of whether the specific part of the value they care about changed.

```javascript
const ThemeContext = createContext(null);

function App() {
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState({ name: 'Alice' });

  // ❌ Both theme and user in one context object
  return (
    <ThemeContext.Provider value={{ theme, user }}>
      <Toggle /> {/* Only needs theme */}
      <UserProfile /> {/* Only needs user */}
    </ThemeContext.Provider>
  );
}
```

When `user` changes, `Toggle` re-renders — even though it only uses `theme`. The context value is a new object reference, and every consumer re-renders.

This is not a bug, it's a fundamental property of how context works. Understanding it is essential for building performant apps with context.

## Context Patterns

### Separate Context Per Concern

The simplest optimization: split high-frequency and low-frequency values into separate contexts.

```javascript
const ThemeContext = createContext('light');
const UserContext = createContext(null);

function App() {
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState({ name: 'Alice' });

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <App />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
```

Now `Toggle` reading `ThemeContext` doesn't re-render when `user` changes. Providers are cheap to nest.

### Providing Stable Values

Wrap context values in `useMemo` to prevent unnecessary re-renders from object identity changes:

```javascript
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Without useMemo: new object every render of AuthProvider
  const value = useMemo(() => ({ user, setUser }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

Without `useMemo`, every time `AuthProvider` re-renders (for any reason), it creates a new object, which triggers re-renders in all context consumers even if `user` hasn't changed.

### Splitting State and Dispatch

A common pattern for reducer-based contexts: split the state and the dispatch into separate contexts. Dispatch functions are stable (never change), so components that only call actions can subscribe to `DispatchContext` without re-rendering when state changes.

```javascript
const CountStateContext = createContext(null);
const CountDispatchContext = createContext(null);

function CountProvider({ children }) {
  const [count, dispatch] = useReducer(reducer, 0);

  return (
    <CountStateContext.Provider value={count}>
      <CountDispatchContext.Provider value={dispatch}>
        {children}
      </CountDispatchContext.Provider>
    </CountStateContext.Provider>
  );
}

// Only re-renders when count changes
function Counter() {
  return <span>{useContext(CountStateContext)}</span>;
}

// Never re-renders (dispatch is stable)
function IncrementButton() {
  const dispatch = useContext(CountDispatchContext);
  return <button onClick={() => dispatch({ type: 'increment' })}>+</button>;
}
```

### Custom Hook Wrapper

Always wrap context consumption in a custom hook:

```javascript
function useTheme() {
  const theme = useContext(ThemeContext);
  if (theme === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}
```

This gives you a better error message if someone uses the hook outside the Provider, and encapsulates the context import.

## What Context Is Not

Context is often misused as a global state manager. It's not one. Context is a **dependency injection mechanism** — it passes values through the component tree without prop threading. It doesn't provide:

- Fine-grained subscriptions (like Zustand or Jotai atoms)
- Selector-based optimization (like Redux's `useSelector`)
- Batched updates across multiple values
- DevTools integration for state changes

For genuinely complex global state (shopping carts, auth with many consumers, large forms), context-only solutions hit performance ceilings fast. That's where dedicated state management libraries earn their keep.

Context is excellent for:
- Theme / locale / feature flags (read-only, low frequency)
- Auth user (changes rarely)
- Dependency injection (passing service objects down)
- Compound component shared state (see [Phase 4](../phase-04-component-patterns/02-compound-components.md))

## Gotchas

### 1. Every consumer re-renders on any context value change

Already covered, but it's the most important gotcha. The fix is splitting contexts, using `useMemo` on the value, or choosing a selector-capable library.

### 2. The default value is only used when there's no Provider

```javascript
const ThemeContext = createContext('light');
```

The `'light'` here is the fallback used by components that have no `ThemeContext.Provider` ancestor — not the initial value of the Provider's state. This trips people up because they expect the default to sync with the Provider somehow.

### 3. Context doesn't trigger re-renders via prop changes

```javascript
// ❌ Misconception: changing the Provider's value via props doesn't "push" to consumers
<ThemeContext.Provider value={theme}>
```

The Provider re-renders the context consumers when `value` changes by reference. If the parent of the Provider re-renders but `theme` is the same state value (same reference), consumers don't re-render. Reference equality is the trigger, not the parent's render.

### 4. Deeply nested components can be hard to debug

With prop drilling, you can trace exactly where data comes from. With context, the source of a value isn't visible at the component level. Tools like React DevTools' component inspector show context values, which helps, but it's worth being intentional about which values live in context vs props.

### 5. Server-side rendering with context

Context works fine in SSR, but the initial value must be provided on the server and match the client to avoid hydration mismatches. Typically this means serializing context state and passing it as a script tag.

## Interview Questions

**Q: What's the performance implication of `useContext`, and how do you mitigate it?**

Strong answer: Every component that calls `useContext` for a given context will re-render whenever that context's Provider value changes reference. This means if you put multiple unrelated values in one context object, a change to any of them re-renders every consumer even if that consumer only uses a different part of the object. Three mitigation strategies: (1) split contexts by update frequency — a `ThemeContext` and a `UserContext` instead of one `AppContext`; (2) memoize the context value with `useMemo` so a new object reference is only created when the relevant data changes; (3) for high-frequency updates with many consumers, replace context with a state management library that supports selectors, which allows components to subscribe to specific slices.

The trap: Candidates who say "context causes re-renders, so just avoid it" miss the nuance. The question is whether those re-renders are expensive and unnecessary, and what tools you use to control them.

---

**Q: How is `useContext` different from just passing props?**

Strong answer: Props are explicit — you can see at every component in the tree exactly what data is flowing where. Context is implicit — a consumer reads a value without any visible connection to the provider. Props create tight coupling between parent and child interfaces. Context creates a "broadcast" relationship where the provider is decoupled from which descendants consume the value. The tradeoff is that props are easier to trace and refactor, while context avoids threading data through intermediary components that don't need it. Neither is universally better — choose based on how many layers the data must traverse and how often the intermediary components change.

The trap: "Context is always better than prop drilling" — context has real costs (implicit data flow, re-render blast radius, harder to test in isolation). The strong answer articulates the tradeoffs.

---

**Q: Can you prevent a context consumer from re-rendering when the context value changes?**

Strong answer: Not directly — `useContext` opts you into all updates from that context. But you can control what changes trigger a new context value. If the value is a primitive (string, number, boolean), it only changes when the value itself changes. If it's an object, use `useMemo` on the value object so it's only a new reference when the actual data changes. You can also split the context so the consumer only subscribes to the part that's relevant. What you can't do with the built-in context API is have a selector-style subscription like `useSelector(ctx => ctx.count)` — for that you need a library like `use-context-selector` or a purpose-built state manager.

The trap: Answering "wrap the consumer in React.memo." React.memo doesn't help — it only compares props, not context. A memoized component still re-renders when its context changes.

---

**Q: When would you choose context over a state management library like Zustand?**

Strong answer: Context is appropriate when the data changes infrequently or has a small number of consumers. Good fits: theme, locale, feature flags, auth user, dependency injection. The moment you have frequently-changing data with many consumers — or you need consumers to subscribe to only part of the state — context hits performance ceilings. Zustand, Jotai, and Redux give you granular subscriptions (components only re-render when their slice changes), external store access (from event handlers outside React), and DevTools integration. The decision isn't about complexity — it's about update frequency, consumer count, and whether you need fine-grained subscriptions.

The trap: Picking based on "context is simpler" or "Redux is enterprise." The real heuristic is update frequency × consumer count. If that product is low, context is fine. If it's high, reach for a selector-capable library.

---

*Next: [useReducer](09-use-reducer.md) — Managing complex state transitions with a predictable reducer pattern, and why it pairs so naturally with context.*
