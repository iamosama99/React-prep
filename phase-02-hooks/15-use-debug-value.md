# useDebugValue

## What Is This?
useDebugValue is a React hook for displaying a label or formatted value for a custom hook in React DevTools. It does not affect runtime behavior or state.

## Why Does It Exist?
Custom hooks encapsulate reusable logic, but they can become opaque during debugging. useDebugValue provides a way to expose useful information about the hook’s internal state to developers without changing the hook’s public API.

## How It Works
Use it inside a custom hook:

```js
function useOnlineStatus() {
  const [online, setOnline] = useState(true)
  useDebugValue(online ? 'online' : 'offline')
  return online
}
```

For formatted values, pass a formatter:

```js
useDebugValue(user, user => user ? user.name : 'guest')
```

DevTools displays the label only when the component tree is inspected.

## Gotchas
- It only affects DevTools; it does not change behavior or render output.
- Some versions of React strip debug values in production.
- It must be called inside a hook, not in plain components.
- Keep the debug label simple and focused on the hook's key state.

## Interview Questions
**Q: What problem does useDebugValue solve?**
Answer: it makes custom hooks easier to debug in React DevTools by exposing a readable label for the hook’s internal state. It’s for developer ergonomics, not functionality.
The trap: thinking it changes the hook’s behavior or is needed for production logic.

**Q: When should you use a formatter with useDebugValue?**
Answer: use a formatter when the raw hook value is complex or not human-friendly, such as an object or nested state. The formatter can convert it into a concise label.
The trap: overusing it for every hook or using it in plain components.

---
*Next: Rules of hooks — the foundation for why these hooks must be called consistently.*
