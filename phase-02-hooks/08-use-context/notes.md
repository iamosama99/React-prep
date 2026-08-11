# useContext

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Context consumer | Reads the nearest provider's value in the tree | Avoids prop drilling without an external state library |
| All consumers re-render | Any provider value change re-renders every consumer | Granular splitting or `useMemo` on the value is critical for perf |
| Default value | Value used when no provider is above the consumer | Useful for testing and standalone component usage |
| Not async state management | Context is synchronous value propagation only | Use a state library for complex, dynamic, high-frequency data |

## What Is This?

`useContext` is a React hook that reads the current value from a Context object. It subscribes the component to the nearest matching `Provider` above it in the component tree. When that provider's value changes, every component consuming the context re-renders.

```javascript
const ThemeContext = React.createContext('light');

function ThemedButton() {
  const theme = useContext(ThemeContext); // Reads 'light' or whatever the provider passes
  return <button className={theme}>Click me</button>;
}
```

It replaces the older `Context.Consumer` render prop pattern with a cleaner hook-based API.

> **Check yourself:** If you call `useContext(ThemeContext)` and there is no `ThemeContext.Provider` anywhere above in the tree, what value do you get?

## Why Does It Exist?

In React, data flows top-down through props. But some data needs to be available to many components at different nesting levels: theme, locale, authentication status, user preferences. Passing these through every intermediate component is called "prop drilling" — and it's tedious, error-prone, and creates coupling between components that don't use the data themselves.

Context solves this by letting you "broadcast" data from a provider to any consumer in its subtree, skipping intermediate components entirely.

Before hooks, consuming context required the `Context.Consumer` render prop pattern:

```javascript
// Old pattern (pre-hooks)
<ThemeContext.Consumer>
  {theme => <button className={theme}>Click</button>}
</ThemeContext.Consumer>
```

`useContext` replaced this with a simpler, more readable API:

```javascript
// Hook pattern (modern)
const theme = useContext(ThemeContext);
return <button className={theme}>Click</button>;
```

## How It Works

### The Three Steps: Create → Provide → Consume

**Step 1: Create the context**

```javascript
// ThemeContext.js
import { createContext } from 'react';

const ThemeContext = createContext('light'); // 'light' is the default value
export default ThemeContext;
```

The default value is used *only* when there's no provider above the consumer. It's useful for testing components in isolation.

**Step 2: Provide the context**

```javascript
function App() {
  const [theme, setTheme] = useState('dark');

  return (
    <ThemeContext.Provider value={theme}>
      <Toolbar />
      <Sidebar />
      <Main />
    </ThemeContext.Provider>
  );
}
```

Every component inside the `Provider` can access the value. The provider can be anywhere in the tree — it doesn't have to be at the root.

**Step 3: Consume the context**

```javascript
function ThemedButton() {
  const theme = useContext(ThemeContext); // 'dark'
  return <button className={`btn-${theme}`}>Click</button>;
}
```

React finds the *nearest* `ThemeContext.Provider` above `ThemedButton` in the tree and returns its `value`.

> **Check yourself:** If you have two nested providers for the same context, which one does the consumer read from?

### Nested Providers

Providers can be nested. The consumer reads from the *nearest* one:

```javascript
<ThemeContext.Provider value="light">
  <Sidebar /> {/* reads "light" */}
  <ThemeContext.Provider value="dark">
    <MainContent /> {/* reads "dark" */}
  </ThemeContext.Provider>
</ThemeContext.Provider>
```

This lets you override context values for specific subtrees.

### Context with Complex Values

Context can carry any JavaScript value: primitives, objects, functions:

```javascript
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Any consumer:
function UserMenu() {
  const { user, logout } = useContext(AuthContext);
  return user ? <button onClick={logout}>Logout {user.name}</button> : null;
}
```

> **Check yourself:** In the `AuthProvider` above, what happens to every consumer when `login()` is called? Do they all re-render?

## Common Use Cases

### 1. Theme System

```javascript
const ThemeContext = createContext({ mode: 'light', colors: lightColors });

function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const colors = mode === 'light' ? lightColors : darkColors;

  const value = useMemo(() => ({
    mode, colors, toggleTheme: () => setMode(m => m === 'light' ? 'dark' : 'light')
  }), [mode, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Consumer
function Card() {
  const { colors } = useContext(ThemeContext);
  return <div style={{ background: colors.surface }}>...</div>;
}
```

### 2. Authentication

```javascript
const AuthContext = createContext(null);

function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

The custom `useAuth` hook pattern adds a runtime check that catches missing providers — much better than silently using `null`.

### 3. Locale / Internationalization

```javascript
const LocaleContext = createContext('en');

function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('en');

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

function Greeting() {
  const { locale } = useContext(LocaleContext);
  const messages = { en: 'Hello', es: 'Hola', ja: 'こんにちは' };
  return <h1>{messages[locale]}</h1>;
}
```

### 4. Context + useReducer (Mini Redux)

```javascript
const TodoContext = createContext(null);

function todoReducer(state, action) {
  switch (action.type) {
    case 'add':
      return [...state, { id: Date.now(), text: action.text, done: false }];
    case 'toggle':
      return state.map(t => t.id === action.id ? { ...t, done: !t.done } : t);
    case 'delete':
      return state.filter(t => t.id !== action.id);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  return (
    <TodoContext.Provider value={{ todos, dispatch }}>
      {children}
    </TodoContext.Provider>
  );
}
```

This pattern is often called "mini Redux" — it gives you centralized state management without a library.

## The Re-render Problem

The biggest performance concern with context is **broad re-renders**. When a provider's value changes, *every* consumer re-renders — even if they only use a subset of the value.

```javascript
// Provider passes an object with user AND theme
<AppContext.Provider value={{ user, theme }}>

// This consumer only uses theme, but re-renders when user changes too
function Footer() {
  const { theme } = useContext(AppContext);
  return <footer className={theme}>...</footer>;
}
```

### Fix 1: Split Contexts

```javascript
// Instead of one big context:
<AppContext.Provider value={{ user, theme, locale }}>

// Split into focused contexts:
<UserContext.Provider value={user}>
  <ThemeContext.Provider value={theme}>
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  </ThemeContext.Provider>
</UserContext.Provider>
```

Now changing `user` only re-renders `UserContext` consumers, not theme or locale consumers.

### Fix 2: Memoize the Provider Value

```javascript
function AppProvider({ children }) {
  const [user, setUser] = useState(null);

  // ❌ New object every render → all consumers re-render
  return <AppContext.Provider value={{ user, login, logout }}>{children}</AppContext.Provider>;

  // ✅ Memoized → consumers only re-render when user changes
  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

### Fix 3: Separate State and Dispatch Contexts

```javascript
const TodoStateContext = createContext(null);
const TodoDispatchContext = createContext(null);

function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  return (
    <TodoStateContext.Provider value={todos}>
      <TodoDispatchContext.Provider value={dispatch}>
        {children}
      </TodoDispatchContext.Provider>
    </TodoStateContext.Provider>
  );
}
```

Components that only dispatch actions (like an "Add" button) don't re-render when the todo list changes.

> **Check yourself:** You pass `{ user, theme }` as a context value. If only `user` changes, which consumers re-render — only those that read `user`, or all consumers of this context?

## Gotchas

### 1. New object literals in value cause unnecessary re-renders

```javascript
// ❌ Every render creates a new object → all consumers re-render
<UserContext.Provider value={{ name, email }}>

// ✅ Memoize the value
const value = useMemo(() => ({ name, email }), [name, email]);
<UserContext.Provider value={value}>
```

### 2. Context is not selective

```javascript
const ctx = useContext(BigContext);
// Even if you only destructure `theme`, you still re-render
// when ANY property of BigContext's value changes
const { theme } = ctx;
```

React has no built-in selector mechanism for context. You re-render on any value change, period.

### 3. Missing provider gives the default value silently

```javascript
const ThemeContext = createContext('light');

// If no Provider exists above this component:
const theme = useContext(ThemeContext); // Returns 'light' silently — no error
```

This can hide bugs. Use a custom hook with a runtime check:

```javascript
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

### 4. Context is not a state manager

Context *propagates* values — it doesn't manage state. You still need `useState`, `useReducer`, or an external library for the actual state management. Context just solves the distribution problem.

### 5. Deeply nested providers can be hard to debug

```javascript
// "Provider hell"
<AuthProvider>
  <ThemeProvider>
    <LocaleProvider>
      <FeatureFlagProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </FeatureFlagProvider>
    </LocaleProvider>
  </ThemeProvider>
</AuthProvider>
```

This is a real pattern in large apps. It works, but debugging which provider caused a re-render can be difficult.

## Interview Questions

**Q (High): What are the limitations of `useContext`?**

Answer: The main limitation is that all consumers re-render when the provider's value changes, even if they only use part of the value. There's no built-in selector mechanism. This can cause performance problems in large apps with frequent updates.

Other limitations: context is synchronous (no built-in async data handling), it's not a state manager (just a distribution mechanism), and deeply nested providers can become hard to manage.

The trap: Saying context replaces Redux or that it "automatically avoids prop drilling." Context avoids the drilling, but introduces its own performance challenges.

---

**Q (High): How can you avoid unnecessary re-renders with context?**

Answer: Three strategies:
1. **Split contexts**: Separate unrelated data into different contexts (UserContext, ThemeContext, etc.) so changes to one don't re-render consumers of the other.
2. **Memoize the value**: Wrap the provider's value in `useMemo` so the reference doesn't change on every parent render.
3. **Separate state and dispatch**: Put state in one context and dispatch/actions in another. Components that only dispatch don't re-render when state changes.

The trap: Thinking `useMemo` alone solves all context performance problems. If the memoized value genuinely changes frequently, all consumers still re-render. Splitting is often more effective.

---

**Q (High): Explain the create → provide → consume pattern.**

Answer: First, create a context with `createContext(defaultValue)`. Then, render a `Context.Provider` component somewhere in the tree with a `value` prop. Finally, call `useContext(Context)` in any descendant component to read the current value from the nearest provider.

The default value is only used when no provider exists above the consumer. The nearest provider wins when multiple providers are nested.

The trap: Forgetting to render the Provider and wondering why the consumer gets the default value instead of the expected data.

---

**Q (High): What is the "mini Redux" pattern with context?**

Answer: Combine `useReducer` for centralized state management with `useContext` for distribution. The reducer handles all state transitions through dispatched actions, and the context makes state and dispatch available throughout the tree.

```javascript
const [state, dispatch] = useReducer(reducer, initialState);
<StateContext.Provider value={state}>
  <DispatchContext.Provider value={dispatch}>
    {children}
  </DispatchContext.Provider>
</StateContext.Provider>
```

It's "mini Redux" because it provides the same reducer + dispatch + provider pattern, but without middleware, devtools, or the global store architecture that Redux adds.

The trap: Saying this is a replacement for Redux in all cases. For large apps with complex async state, middleware, or time-travel debugging needs, Redux (or Zustand/Jotai) is still more appropriate.

---

**Q (Medium): What happens when there's no Provider above a consumer?**

Answer: The consumer receives the default value passed to `createContext()`. This happens silently — no error, no warning. This is useful for testing (components work in isolation) but dangerous in production (bugs are silent).

Best practice: create a custom hook that throws an error when the provider is missing:

```javascript
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

The trap: Not checking for missing providers and getting silent `undefined` bugs.

---

**Q (Medium): Why should you avoid passing inline objects as the Provider value?**

Answer: Because React creates a new object on every render. Context uses reference equality to detect changes. A new object reference means "value changed" to React, which re-renders all consumers — even if the actual data inside the object is identical.

Fix: wrap the value in `useMemo` so the reference stays stable when the data hasn't changed.

The trap: Not understanding reference equality and wondering why consumers re-render when "nothing changed."

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write a minimal create-provide-consume context example from memory
- [ ] Can explain why passing a new object literal as `value` to a provider on every render is a problem
- [ ] Can name three strategies for reducing broad consumer re-renders (splitting contexts, memoizing the value, separate state/dispatch)
- [ ] Can state what a consumer receives when there is no provider above it
- [ ] Can explain the "mini Redux" pattern using useReducer + useContext
- [ ] Can write a custom hook with a runtime check for missing providers

---

*Next: [useReducer](../09-use-reducer/notes.md) — for more structured state logic after shared values and callbacks.*
