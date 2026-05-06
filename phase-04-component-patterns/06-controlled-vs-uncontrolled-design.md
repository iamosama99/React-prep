# Controlled vs Uncontrolled Component Design

## What Is This?

In Phase 1 we covered controlled vs uncontrolled *inputs* — whether React or the DOM owns the value of a form element. This topic extends that same principle to the design of your own React components.

A **controlled component** has its state fully owned by the caller:
```jsx
<Modal open={isOpen} onClose={() => setIsOpen(false)} />
```

An **uncontrolled component** manages its own state internally:
```jsx
<Modal defaultOpen={true} />
```

The caller of a controlled component is in charge. The caller of an uncontrolled component delegates to the component and just receives notifications.

Most serious component libraries (Radix, Headless UI, shadcn) support both modes simultaneously — this is called the **dual-mode pattern**, and it's the gold standard for reusable component design.

## Why Does This Matter?

Not every caller has the same needs:

**Simple use case**: a modal that opens and closes itself. The caller doesn't need to know about the open state at all. Forcing them to manage it adds boilerplate.

**Complex use case**: a modal that the caller needs to open from a button in a different part of the tree, close when an API request fails, and sync with URL params. Here the caller must own the state — the component can't manage it.

If you only support controlled mode: simple callers have to maintain state they don't care about.
If you only support uncontrolled mode: complex callers can't integrate the component into their state management.

Supporting both is the mark of a well-designed component.

## How It Works

The dual-mode pattern follows a convention used throughout React's own APIs (native inputs) and every major component library:

- **Controlled**: pass `value` (or `open`, `selected`, etc.) + `onChange` (or `onOpenChange`, `onSelect`)
- **Uncontrolled**: pass `defaultValue` (or `defaultOpen`, `defaultSelected`) — the component owns the state internally
- **Neither**: the component uses its own initial value (fully internal default)

```jsx
function Disclosure({ open, defaultOpen = false, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  // Is the caller controlling us?
  const isControlled = open !== undefined;
  
  // The actual value to use
  const isOpen = isControlled ? open : internalOpen;
  
  const toggle = useCallback(() => {
    const nextOpen = !isOpen;
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen); // always notify the caller
  }, [isOpen, isControlled, onOpenChange]);
  
  return (
    <DisclosureContext.Provider value={{ isOpen, toggle }}>
      {children}
    </DisclosureContext.Provider>
  );
}
```

Key decisions here:
1. `isControlled` is determined by whether `open` is `undefined` — not whether it's falsy. `false` is a valid controlled value.
2. In controlled mode, internal state is never updated — `isOpen` comes entirely from props.
3. `onOpenChange` is always called, whether controlled or not — callers can listen without owning.

## The `useControllable` Hook

This pattern appears in every component library. It's worth extracting:

```jsx
function useControllable(controlledValue, onChange, defaultValue) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  
  const value = isControlled ? controlledValue : internalValue;
  
  const setValue = useCallback((next) => {
    const nextValue = typeof next === 'function' ? next(value) : next;
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  }, [isControlled, value, onChange]);
  
  return [value, setValue];
}

// Usage in Disclosure:
function Disclosure({ open, defaultOpen = false, onOpenChange, children }) {
  const [isOpen, setIsOpen] = useControllable(open, onOpenChange, defaultOpen);
  const toggle = useCallback(() => setIsOpen(v => !v), [setIsOpen]);
  ...
}
```

Radix UI uses this exact pattern internally. The hook becomes a building block for every component that has this dual-mode requirement.

## Warning: The Mode-Switching Problem

React's own `<input>` warns in dev mode when a component switches between controlled and uncontrolled. You should too.

Switching from controlled to uncontrolled (or vice versa) in the same component lifetime is almost always a bug — it means the parent accidentally started passing `undefined` for `value` when they meant to pass an empty string, or they removed a `value` prop when they should have kept it.

```jsx
function useControllable(controlledValue, onChange, defaultValue) {
  const isControlled = controlledValue !== undefined;
  const wasControlled = useRef(isControlled);
  
  if (process.env.NODE_ENV !== 'production') {
    if (wasControlled.current !== isControlled) {
      console.warn(
        'A component changed from controlled to uncontrolled (or vice versa). ' +
        'This is likely a bug.'
      );
    }
    wasControlled.current = isControlled;
  }
  
  // ...rest of implementation
}
```

## Naming Conventions

Follow the same convention as HTML inputs and React's own APIs:

| Controlled prop | Uncontrolled prop | Callback |
|---|---|---|
| `value` | `defaultValue` | `onChange` |
| `open` | `defaultOpen` | `onOpenChange` |
| `selected` | `defaultSelected` | `onSelectedChange` |
| `checked` | `defaultChecked` | `onChange` |

This is so ubiquitous in the React ecosystem that deviating from it makes your component feel wrong to experienced developers.

## When to Use Each at the Call Site

**Choose controlled when:**
- State needs to be shared with sibling or parent components
- The open/selected state derives from server data or URL
- You need to prevent transitions (e.g., prevent closing a modal if a form is dirty)
- You're using the component in a form library that manages all field state centrally

**Choose uncontrolled when:**
- The component is isolated and self-contained
- You only need to react to changes, not pre-approve them
- You want the component to handle its own state for simpler call sites

## Gotchas

**`undefined` is not the same as not provided.** `open={undefined}` is technically controlled mode with an undefined value, which is a bug — it makes the component uncontrolled. Always check `open !== undefined`, not `!open`. For TypeScript, use `open?: boolean` and check for undefined explicitly.

**Don't sync internal state from controlled props with `useEffect`.** The common mistake:

```jsx
// Bad
const [isOpen, setIsOpen] = useState(defaultOpen);
useEffect(() => {
  if (open !== undefined) setIsOpen(open);
}, [open]);
```

This causes a render cycle: props update → effect fires → state updates → second render. Instead, read from `controlledValue` directly when it's provided and don't store it in state at all.

**Always call the callback even in controlled mode.** Callers who are in controlled mode need the callback to know what value they should update their state to. If you skip it in controlled mode, the caller has no way to respond to user interaction.

**In controlled mode, if the caller doesn't update state, nothing changes.** This is intentional — the component is controlled, the caller is responsible. But it catches beginners who forget to update state in the `onChange` handler and wonder why the component isn't responding.

## Interview Questions

**Q (High): What does it mean for a component to be controlled vs uncontrolled, at the component design level (not just for inputs)?**

Answer: A controlled component has its visible state owned by the caller — the caller passes the current value and a setter callback, and the component renders whatever it's given. An uncontrolled component manages its own state internally — the caller provides an initial value and can listen to changes, but doesn't drive the state. The distinction matters for composability: controlled components integrate cleanly into external state management (Redux, URL state, form libraries), while uncontrolled components are simpler to use in isolation. A well-designed component supports both.

The trap: Limiting the answer to form inputs. The interviewer wants to see that you understand this as a general component design principle.

**Q (High): How do you implement dual-mode (controlled + uncontrolled) in a custom component?**

Answer: You determine whether the component is controlled by checking if the `value` prop (or `open`, `selected`, etc.) is `undefined`. If it's not undefined, you're controlled and you read directly from props. If it is undefined, you maintain internal state initialized from `defaultValue`. The setter always calls the callback (so the caller can observe changes in either mode) but only updates internal state when uncontrolled. The actual rendered value is `isControlled ? props.value : internalValue`. This logic is typically extracted into a `useControllable` hook so it can be shared across many components.

The trap: Using a `useEffect` to sync props into state. That causes double renders and is the wrong model.

**Q (Medium): Why should you always call `onChange` even when in controlled mode?**

Answer: In controlled mode, the component can't update its own value — only the caller can, via their state setter. If the user interacts with the component and the component doesn't call `onChange`, the caller never learns that the user tried to do something. They can't update their state. The interaction appears to do nothing. The `onChange` callback is the mechanism by which the component tells the caller "the user wants this value" — whether the caller acts on it or not is up to them (they might validate, transform, or reject the change).

The trap: "The caller already knows if they're in controlled mode." They know they're controlling it, but they don't know what value to set unless the component tells them.

**Q (Medium): How do you detect the controlled-to-uncontrolled switching bug?**

Answer: Track whether the component was controlled on mount using a ref, and compare it against the current mode on each render. If the mode changes, warn in development. React's native inputs do this. The ref persists across renders without causing re-renders and gives you a stable comparison point. You should also warn in the reverse direction (uncontrolled → controlled). This catches the common bug where a prop that was always provided accidentally becomes `undefined` — often because the caller forgot to handle a loading state and passed `user?.preferences?.theme` when `user` is still null.

---
*Next: forwardRef — how refs propagate through component boundaries, and why it's a prerequisite for building composable, accessible component libraries.*
