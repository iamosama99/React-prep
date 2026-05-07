# useImperativeHandle + forwardRef

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| `forwardRef` | Wrapper that passes the parent's `ref` into a child function component | Without it, functional components silently ignore the `ref` prop |
| `useImperativeHandle` | Customizes what the forwarded ref exposes to the parent | Parent gets a controlled API instead of the raw DOM node |
| Object returned | The value assigned to the parent's `ref.current` | Parent can call `.focus()`, `.reset()`, etc. without DOM coupling |
| Escape hatch only | Use only for genuine imperative needs | Overusing it breaks declarative patterns |

## What Is This?

`useImperativeHandle` is a hook that lets a custom component expose imperative methods to its parent through a ref. It is used together with `forwardRef`, which forwards a ref from the parent into the child component.

> **Check yourself:** What does `ref.current` point to after `useImperativeHandle` runs — the raw DOM node or something else?

## Why Does It Exist?

React prefers declarative data flow, but some components need an instance-like API for focus, selection, or imperative scrolling. `useImperativeHandle` provides a controlled escape hatch without exposing the child's full DOM or implementation details.

## How It Works

First wrap the component with `forwardRef`:

```js
const TextInput = forwardRef(function TextInput(props, ref) {
  const inputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus()
    }
  }))

  return <input ref={inputRef} {...props} />
})
```

The parent can then use the ref:

```js
function Form() {
  const inputRef = useRef(null)
  return (
    <>
      <TextInput ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  )
}
```

The object returned by `useImperativeHandle` becomes the value of the forwarded ref.

> **Check yourself:** What happens if you use `useImperativeHandle` inside a component that is NOT wrapped with `forwardRef`?

## Gotchas

- Only use it when there is a real imperative need, such as focusing or measuring.
- The hook should return an object, and that object should be stable unless the exposed API changes.
- Avoid exposing DOM nodes directly when an abstract API is sufficient.
- `useImperativeHandle` has no effect unless the component is wrapped with `forwardRef`.

## Interview Questions

**Q (Medium): When should you use `useImperativeHandle`?**

Answer: when a component must expose an imperative method or API to its parent, such as `focus()`, `scrollIntoView()`, or `reset()`. It is an escape hatch for cases where declarative props are awkward or impossible.

The trap: saying it is for every ref use or using it to avoid lifting state.

**Q (Medium): What is the role of `forwardRef` here?**

Answer: `forwardRef` makes the parent's ref available to the child function component. Without `forwardRef`, function components do not receive refs. `useImperativeHandle` customizes the object assigned to that forwarded ref.

The trap: confusing `forwardRef` with `useRef` or thinking `forwardRef` alone is enough to expose child methods.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write a `forwardRef` + `useImperativeHandle` example that exposes a `focus()` method from memory
- [ ] Can explain what `ref.current` points to after `useImperativeHandle` sets it (the custom object, not the DOM node)
- [ ] Can state the consequence of using `useImperativeHandle` without `forwardRef`
- [ ] Can name the kind of use case that justifies `useImperativeHandle` versus lifting state

---

*Next: useTransition — for marking updates as non-urgent in concurrent rendering.*
