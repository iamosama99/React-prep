# useDebugValue

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useDebugValue | Attaches a label to a custom hook in React DevTools | Makes opaque hooks inspectable during debugging |
| Formatter argument | Optional second argument that transforms the raw value | Avoids expensive formatting unless DevTools is open |
| DevTools only | Has zero effect on runtime behavior or renders | Safe to use in production; stripped in some builds |
| Must be in a hook | Cannot be called in plain components | Follows the rules of hooks |

## What Is This?
useDebugValue is a React hook for displaying a label or formatted value for a custom hook in React DevTools. It does not affect runtime behavior or state.

## Why Does It Exist?
Custom hooks encapsulate reusable logic, but they can become opaque during debugging. useDebugValue provides a way to expose useful information about the hook's internal state to developers without changing the hook's public API.

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

> **Check yourself:** What is the purpose of the optional second argument to useDebugValue, and when would you use it?

## Gotchas
- It only affects DevTools; it does not change behavior or render output.
- Some versions of React strip debug values in production.
- It must be called inside a hook, not in plain components.
- Keep the debug label simple and focused on the hook's key state.

> **Check yourself:** Can useDebugValue be called directly inside a component, or only inside a custom hook? What rule does this follow?

## Interview Questions
**Q (Low): What problem does useDebugValue solve?**
Answer: it makes custom hooks easier to debug in React DevTools by exposing a readable label for the hook's internal state. It's for developer ergonomics, not functionality.
The trap: thinking it changes the hook's behavior or is needed for production logic.

**Q (Low): When should you use a formatter with useDebugValue?**
Answer: use a formatter when the raw hook value is complex or not human-friendly, such as an object or nested state. The formatter can convert it into a concise label.
The trap: overusing it for every hook or using it in plain components.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what useDebugValue does and does not affect at runtime
- [ ] Can write a custom hook that uses useDebugValue with a formatter from memory
- [ ] Can state where useDebugValue must be called and why
- [ ] Can name one reason to use a formatter instead of passing the raw value directly

---

*Next: Rules of hooks — the foundation for why these hooks must be called consistently.*
