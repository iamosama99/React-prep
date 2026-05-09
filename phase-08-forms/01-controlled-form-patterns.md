# Controlled Form Patterns

## Quick Reference

| Concept | Details |
|---|---|
| Controlled input | `value` + `onChange` — React owns the value |
| Single handler | One `onChange` reads `e.target.name` to update any field |
| Key rule | Never mix `value` and `defaultValue` on the same input |
| Reset pattern | Set state back to initial object; React re-renders with cleared fields |
| `<select>` / `<textarea>` | Same pattern — `value` + `onChange`, not `selected`/`innerText` |

---

## Why Controlled Forms Exist

An uncontrolled input keeps its value in the DOM. React doesn't know about it until you go read the ref. That's fine for simple cases, but the moment you need to validate as the user types, disable a submit button until the form is valid, or programmatically reset a field, you need React to own the value — and that's exactly what a controlled input is.

With a controlled input, the displayed value is always `props.value`. The component re-renders on every keystroke, React writes the value back to the DOM, and the DOM stays in sync with your state. The DOM is the display layer; your state is the source of truth.

---

## Single onChange Handler Pattern

Instead of writing a separate handler per field, read `e.target.name` to map the event to the correct key.

```jsx
function SignupForm() {
  const [fields, setFields] = React.useState({
    email: '',
    password: '',
    username: '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    console.log(fields);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        value={fields.email}
        onChange={handleChange}
      />
      <input
        name="password"
        type="password"
        value={fields.password}
        onChange={handleChange}
      />
      <input
        name="username"
        type="text"
        value={fields.username}
        onChange={handleChange}
      />
      <button type="submit">Sign up</button>
    </form>
  );
}
```

This scales cleanly — adding a new field means adding it to initial state and adding the input with the matching `name`. The handler never changes.

---

## Checkboxes and Select

Checkboxes use `checked` instead of `value`. Read `e.target.checked` in the handler.

```jsx
const [agreed, setAgreed] = React.useState(false);

<input
  type="checkbox"
  name="agreed"
  checked={agreed}
  onChange={e => setAgreed(e.target.checked)}
/>
```

For a generic handler that supports both text and checkboxes:

```jsx
function handleChange(e) {
  const { name, value, type, checked } = e.target;
  setFields(prev => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value,
  }));
}
```

`<select>` is identical to a text input — use `value` on the `<select>` element, not `selected` on the `<option>`:

```jsx
<select name="role" value={fields.role} onChange={handleChange}>
  <option value="viewer">Viewer</option>
  <option value="editor">Editor</option>
  <option value="admin">Admin</option>
</select>
```

---

> **Check yourself:** What happens if you set `value` on an input but don't provide `onChange`? What does React warn about, and why does the input appear frozen?

---

## Resetting the Form

Resetting is trivial when state owns the values — just set state back to the initial object.

```jsx
const INITIAL = { email: '', password: '' };

const [fields, setFields] = React.useState(INITIAL);

function handleReset() {
  setFields(INITIAL);
}
```

React re-renders and writes the empty strings back to the DOM. No need to imperatively touch inputs.

---

## Derived State: Disable Submit Until Valid

Because React owns the values, you can compute validity inline without any extra effects:

```jsx
const isValid = fields.email.includes('@') && fields.password.length >= 8;

<button type="submit" disabled={!isValid}>
  Create account
</button>
```

This updates on every keystroke with zero extra code. The button enables the moment both conditions are met.

---

> **Check yourself:** What is the difference between a controlled and an uncontrolled component? When would you deliberately choose uncontrolled?

---

## Common Gotchas

**`value={undefined}` switches the input to uncontrolled.** If your state initializes a field as `undefined` instead of `''`, React will treat that input as uncontrolled until the value becomes defined, then warn about switching modes. Always initialize string fields to `''`.

**Do not mix `value` and `defaultValue`.** `defaultValue` is for uncontrolled inputs. Using both is undefined behavior.

**`e.target.value` is always a string.** For numeric inputs, parse manually: `Number(e.target.value)`. React doesn't coerce types.

**Synthetic event reuse.** React's SyntheticEvent is pooled and recycled (this mattered before React 17's removal of pooling). Today it is not an issue, but destructuring `{ name, value }` immediately from the event is still the cleaner pattern.

---

## Self-Assessment

- [ ] I can build a multi-field form with a single `onChange` handler
- [ ] I know why `value={undefined}` causes a warning and how to prevent it
- [ ] I can handle checkboxes and selects with the same handler pattern
- [ ] I can disable a submit button based on derived validity without effects
- [ ] I can explain what "controlled" means to an interviewer in one sentence

---

## Interview Q&A

**Q: What is a controlled component? (High)**

A: A controlled component is one where React state is the single source of truth for the input's value. The input renders `value={stateVar}` and fires `onChange` to update state, so every displayed character is a reflection of state — never an independent DOM value.

*Interviewer trap:* They might ask "is `defaultValue` controlled?" — no, `defaultValue` sets the initial DOM value and then steps back; the DOM owns it from that point. Only `value` + `onChange` together makes an input controlled.

---

**Q: Why do you prefer a single `onChange` handler over per-field handlers? (Medium)**

A: A single handler reading `e.target.name` scales to any number of fields without adding new functions. It also avoids the common mistake of capturing stale closures in per-field arrow functions defined inline. The name-keyed pattern keeps the component lean and the handler logic in one place.

---

**Q: What happens when you set `value` on an input with no `onChange`? (Medium)**

A: React makes the input read-only — the user can't type because every keystroke would re-render the input back to the current state value, which never changes. React also logs a warning: "You provided a `value` prop without an `onChange` handler." The fix is either add `onChange`, or switch to `defaultValue` if you want uncontrolled.

---

**Q: How do you handle a controlled `<select>` with a multi-select? (Low)**

A: Add `multiple` to the `<select>` element and store an array in state. In `onChange`, convert `e.target.selectedOptions` (an HTMLCollection) to an array of values: `Array.from(e.target.selectedOptions, o => o.value)`. The `value` prop on a multi-select accepts an array and highlights matching options.
