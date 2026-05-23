# Typing Event Handlers

## Quick Reference

| Event | React type | Target |
|---|---|---|
| Input change | `React.ChangeEvent<HTMLInputElement>` | `.target.value: string` |
| Click | `React.MouseEvent<HTMLButtonElement>` | `.currentTarget: button` |
| Form submit | `React.FormEvent<HTMLFormElement>` | `.preventDefault()` |
| Keyboard | `React.KeyboardEvent<HTMLInputElement>` | `.key`, `.code`, `.ctrlKey` |
| Focus/blur | `React.FocusEvent<HTMLInputElement>` | `.relatedTarget` |
| Drag | `React.DragEvent<HTMLDivElement>` | `.dataTransfer` |

---

## The mental model: React events wrap the DOM

React's synthetic event system means you're not working with raw `MouseEvent` or `InputEvent` — you're working with `React.MouseEvent`, `React.ChangeEvent`, etc. The types live in `@types/react` and mirror the DOM event interface but are namespaced under `React`.

Every React event generic takes the element type that fired it. This matters because `.currentTarget` and `.target` are typed based on that parameter.

---

## ChangeEvent for input handling

The most common event type:

```typescript
function SearchInput() {
  const [query, setQuery] = React.useState("");

  // Inline handler — TypeScript infers the event type from the JSX attribute
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

When inline, TypeScript infers `e` as `React.ChangeEvent<HTMLInputElement>` from the context of the `onChange` prop. You don't annotate inline handlers.

When extracting the handler:

```typescript
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setQuery(e.target.value);
}
```

`e.target.value` is `string` — typed correctly because `HTMLInputElement.value` is always a string.

**Checkbox variant:**

```typescript
function handleCheck(e: React.ChangeEvent<HTMLInputElement>) {
  // e.target.checked for checkboxes — boolean
  setChecked(e.target.checked);
}
```

**Select element:**

```typescript
function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
  setValue(e.target.value); // string
}
```

---

> **Check yourself:** You extract an `onChange` handler to a named function. What annotation do you put on the `e` parameter for an `<input>`, a `<select>`, and a `<textarea>`?

---

## MouseEvent for click handlers

```typescript
function Button({ onClick }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <button onClick={onClick}>Click me</button>;
}
```

Common use: `e.preventDefault()` for links, `e.stopPropagation()` for nested click targets.

```typescript
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  e.stopPropagation();
  doSomething();
}
```

For elements that aren't buttons — `<div onClick>`, `<li onClick>` — use `React.MouseEvent<HTMLDivElement>`, `React.MouseEvent<HTMLLIElement>`, etc.

---

## FormEvent for form submission

```typescript
function LoginForm() {
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitLogin(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">Log in</button>
    </form>
  );
}
```

`FormEvent` doesn't expose the form values through the event object (unlike `ChangeEvent` which gives you `target.value`). You access form values through controlled state or `FormData`:

```typescript
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const email = formData.get("email") as string;
};
```

`e.currentTarget` is the form element — typed as `HTMLFormElement` based on the generic.

---

> **Check yourself:** What's the difference between `e.target` and `e.currentTarget`? Which one is always typed to the generic element parameter?

---

## `e.target` vs `e.currentTarget`

This trips up a lot of TypeScript users:

- `e.currentTarget` — the element the handler is attached to. Always typed as the element in the generic parameter (`HTMLButtonElement`, `HTMLFormElement`, etc.).
- `e.target` — the element that actually fired the event (could be a child). React types it as the wider `EventTarget`, which doesn't have element-specific properties.

```typescript
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  // Safe — currentTarget is always the button
  console.log(e.currentTarget.disabled);

  // Unsafe — target could be a child span inside the button
  // TypeScript types e.target as EventTarget, not HTMLButtonElement
  // @ts-expect-error: Property 'disabled' does not exist on type 'EventTarget'
  console.log(e.target.disabled);
}
```

For most handlers, use `e.currentTarget`. Use `e.target` with a type assertion or narrowing when you genuinely need the element that was clicked — event delegation patterns.

---

## KeyboardEvent

```typescript
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    submitSearch();
  }
  if (e.key === "Escape") {
    clearSearch();
  }
}
```

`e.key` is the modern way — string values like `"Enter"`, `"Escape"`, `"ArrowUp"`. `e.keyCode` is deprecated but still used in old codebases (typed as `number`).

Common modifier checks: `e.ctrlKey`, `e.metaKey` (Cmd on Mac), `e.shiftKey`, `e.altKey` — all `boolean`.

---

## Generic event handler type for reuse

When you want a shared handler type across multiple elements:

```typescript
type InputHandler = React.ChangeEventHandler<HTMLInputElement>;
// Equivalent to (event: React.ChangeEvent<HTMLInputElement>) => void

type ButtonHandler = React.MouseEventHandler<HTMLButtonElement>;
// Equivalent to (event: React.MouseEvent<HTMLButtonElement>) => void
```

These `*Handler` aliases live in `@types/react` and are useful for prop typing:

```typescript
type InputProps = {
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};
```

---

> **Check yourself:** You have a click handler on a `<div>` that contains `<button>` children. Inside the handler, `e.currentTarget` refers to what? What about `e.target`?

---

## Typing a generic input handler

Sometimes you want one handler for multiple inputs, distinguished by `name`:

```typescript
type FormState = {
  email: string;
  password: string;
};

function LoginForm() {
  const [form, setForm] = React.useState<FormState>({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form>
      <input name="email" value={form.email} onChange={handleChange} />
      <input name="password" type="password" value={form.password} onChange={handleChange} />
    </form>
  );
}
```

TypeScript can't verify that `name` is a keyof `FormState` at compile time here (it's just `string`). If you want strict typing:

```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const name = e.target.name as keyof FormState;
  setForm(prev => ({ ...prev, [name]: e.target.value }));
};
```

The type assertion on `name` is acceptable here — you control what `name` attributes you put on the inputs.

---

## Gotchas

**Async event handlers.** React's synthetic event object is not a plain DOM object — historically it was pooled and nullified after the handler returned. Event pooling was removed in React 17, but you may still see `e.persist()` calls in old codebases (it's now a no-op). In modern React, async access to the event is fine.

**TypeScript doesn't enforce `e.preventDefault()`.** Nothing in the types tells you that you need to call it. This is a runtime concern, not a type concern.

**Drag events on divs.** `<div onDrop>` needs `e.preventDefault()` in the `onDragOver` handler to enable dropping — TypeScript won't remind you. The type `React.DragEvent<HTMLDivElement>` gives you `.dataTransfer` typed as `DataTransfer`.

---

## Interview Q&A

**Q: How do you type an extracted event handler function? (High)**

Annotate the event parameter with the corresponding React event type parameterized by the element type: `React.ChangeEvent<HTMLInputElement>`, `React.MouseEvent<HTMLButtonElement>`, `React.FormEvent<HTMLFormElement>`. Inline handlers don't need annotation — TypeScript infers from the JSX prop context.

---

**Q: What's the difference between `e.target` and `e.currentTarget` in TypeScript? (High)**

`e.currentTarget` is always typed as the element the handler is attached to — it matches the generic parameter. `e.target` is typed as `EventTarget` (the wide base type) because events bubble and the actual firing element could be a child. For element-specific access, always prefer `e.currentTarget`. Use `e.target` with narrowing or a type assertion only when doing event delegation.

---

**Q: How would you type a single `onChange` handler that handles multiple inputs? (Medium)**

The handler takes `React.ChangeEvent<HTMLInputElement>`. Access `e.target.name` (typed as `string`) and `e.target.value`. If the state shape is a known object, cast `e.target.name as keyof StateType` to get type-safe key access in the `setState` call.

---

**Q: What are the `React.*EventHandler` aliases and when are they useful? (Medium)**

They're type aliases in `@types/react` for handler function types: `React.ChangeEventHandler<T>` is `(event: React.ChangeEvent<T>) => void`. They're cleaner for prop typing when you want to accept a callback without inlining the full function type signature.

---

**Q: How do you type keyboard shortcuts that require modifier keys? (Low)**

The event object is `React.KeyboardEvent<Element>`. Check `e.key` for the key name (string) and `e.ctrlKey`, `e.metaKey`, `e.shiftKey`, `e.altKey` (all boolean) for modifiers. Example: `e.metaKey && e.key === "k"` for Cmd+K on Mac.

---

## Self-Assessment

- [ ] I can annotate an extracted `onChange`, `onClick`, `onSubmit`, and `onKeyDown` handler
- [ ] I know when TypeScript infers inline handler types automatically vs. when I need to annotate
- [ ] I can explain the `e.target` vs `e.currentTarget` type difference and which to prefer
- [ ] I know the `React.*EventHandler<T>` alias pattern for prop typing
- [ ] I can handle modifier key detection with proper types
- [ ] I understand why `e.target.value` is typed as `string` for inputs but `EventTarget` needs narrowing
