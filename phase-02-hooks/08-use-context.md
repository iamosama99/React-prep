# useContext

## What Is This?
useContext is a React hook that reads the current value from a context object created with React.createContext.
It lets a component subscribe to a context provider without using the older Context.Consumer render prop API.

## Why Does It Exist?
Context is the standard way to share data like theme, locale, auth, or UI state across many components without prop drilling. useContext provides a simpler, hook-based API for consuming that data inside function components.

## How It Works
First, create and provide a context:

```js
const ThemeContext = React.createContext('light')

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  )
}
```

Then consume it:

```js
function Toolbar() {
  const theme = useContext(ThemeContext)
  return <div className={theme}>...</div>
}
```

React uses the nearest provider above the consumer in the tree. When the provider's value changes, all consuming components re-render.

### Context behavior
- Consumers read the value from the nearest provider.
- If there is no provider, consumers read the default value.
- Context propagation is based on identity, so updating the provider with a new object triggers all consumers.

## Gotchas
- Every consumer re-renders when the provider's value changes, even if they only use part of the object.
- Avoid passing a new object or array literal as `value` unless wrapped in useMemo.
- Context is not a state management solution for highly dynamic data at large scale.
- Splitting context into smaller providers is often better than one large provider.

## Interview Questions
**Q (High): What are the limitations of useContext?**
Answer: it causes broad re-renders because any update to the provider value re-renders all consumers. It also doesn’t solve component-level memoization or manage asynchronous state; it’s best for relatively stable shared data.
The trap: saying it is only for global state or that it automatically avoids prop drilling issues.

**Q (High): How can you avoid unnecessary re-renders with context?**
Answer: split context into smaller pieces, memoize provider values, and keep context values as primitive or stable references when possible. Use selectors or separate contexts for different concerns.
The trap: thinking `useMemo` alone solves all context re-render problems.

---
*Next: useReducer — for more structured state logic after shared values and callbacks.*
