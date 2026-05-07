# Controlled vs Uncontrolled Inputs

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Controlled input | React owns the value via state + `value` prop | Enables real-time validation, transformation, and programmatic control |
| Uncontrolled input | DOM owns the value; read via `ref` on demand | Simpler for submit-only forms; required for `<input type="file">` |
| `value` vs `defaultValue` | `value` locks the input to state on every render; `defaultValue` seeds once | Mixing them up creates read-only inputs or the controlled/uncontrolled warning |
| Switching modes | React tracks controlled vs uncontrolled at mount and warns if you switch | Always coerce to a defined value (`?? ''`) to stay consistently controlled |

## What Is This?

Every HTML input has a value. The question is: who owns it?

In **controlled inputs**, React owns the value. You store the input's current value in state, pass it to the input as `value`, and update state whenever the user types. The DOM is always a reflection of React's state — React drives the input.

In **uncontrolled inputs**, the DOM owns the value. The input is a regular HTML element that manages its own value. React doesn't track it. To read the value, you use a `ref` to reach into the DOM and pull it out on demand.

```jsx
// Controlled — React is in charge
function ControlledInput() {
  const [text, setText] = useState('');
  return <input value={text} onChange={e => setText(e.target.value)} />;
}

// Uncontrolled — DOM is in charge
function UncontrolledInput() {
  const ref = useRef(null);

  function handleSubmit() {
    console.log(ref.current.value); // pull from DOM when needed
  }

  return (
    <>
      <input ref={ref} defaultValue="" />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}
```

Both render an input. But in the controlled version, every keystroke flows through `setText` → state update → re-render → `value` prop update → DOM reflects new value. In the uncontrolled version, keystrokes go directly into the DOM; React is not involved until you explicitly read `ref.current.value`.

> **Check yourself:** Walk through what happens step-by-step when a user presses a key in a controlled input. What is the sequence of events, and who is in control at each step?

---

## Why the Distinction Exists

HTML inputs are special DOM elements — they have their own internal state. A `<input>` element remembers what the user typed. A `<select>` remembers which option is chosen. A `<textarea>` remembers its content. This internal state lives in the browser, not in JavaScript.

React's rendering model says: the DOM is a function of your state. But browser inputs are already managing their own state. This creates a conflict: two owners competing for the same value.

**Controlled inputs resolve this by making React the single owner.** React takes over the input's value by passing the `value` prop. The browser's internal state is effectively bypassed — the input's displayed value is always exactly what React says it is. The browser handles keystrokes first (because it has to — that's how DOM events work), but React immediately overwrites the value back to whatever state says. The net effect: the input's value is always React's state, never the browser's own tracking.

**Uncontrolled inputs accept the browser's ownership.** You use `defaultValue` (not `value`) to seed an initial value, then let the browser track changes natively. React doesn't interfere. You read the value from the DOM directly when you need it.

---

## Controlled Inputs in Depth

### The `value` + `onChange` contract

A controlled input requires both:
- `value={state}` — sets the displayed value from state
- `onChange={handler}` — updates state when the user types

Without `onChange`, passing `value` makes the input read-only — the user can't change it because every keystroke is immediately overwritten by the unchanged state:

```jsx
// This creates a read-only input that can't be edited
<input value={text} /> // no onChange — user types, React overwrites immediately
```

React actually warns about this: "You provided a `value` prop without an `onChange` handler." If you want a read-only input, be explicit: use `readOnly`.

### Instant access to the current value

Because the value is in state, you always have it:

```jsx
function SearchInput() {
  const [query, setQuery] = useState('');

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <p>You typed: {query}</p>
      <button disabled={query.length < 3}>Search</button>
    </>
  );
}
```

You can use `query` anywhere — validate it inline, disable buttons based on it, filter other data with it. There's no need to imperatively read from a ref.

### Real-time validation and transformation

With controlled inputs, you can intercept keystrokes and either reject or transform them:

```jsx
// Only allow numeric input
function NumericInput({ value, onChange }) {
  function handleChange(e) {
    const raw = e.target.value;
    if (/^\d*$/.test(raw)) { // only update state if it's numeric
      onChange(raw);
    }
    // if the user typed a non-numeric char, state doesn't change,
    // and the input reverts to the last valid state on next render
  }

  return <input value={value} onChange={handleChange} />;
}
```

This pattern — intercept in `onChange`, update state only if valid — is how you enforce input constraints in real time.

---

## Uncontrolled Inputs in Depth

### `defaultValue`, not `value`

For uncontrolled inputs, use `defaultValue` to seed an initial value. Unlike `value`, `defaultValue` is only applied once (on mount) and then ignored — the browser tracks changes itself.

```jsx
<input defaultValue="initial text" ref={inputRef} />
```

If you use `value` and don't also track `onChange`, you get a locked read-only field. `defaultValue` gives you "start here" without controlling subsequent changes.

The equivalent for checkbox/radio is `defaultChecked`:

```jsx
<input type="checkbox" defaultChecked={true} ref={checkboxRef} />
```

### Reading the value via ref

You read the current value when you actually need it — typically on form submit:

```jsx
function LoginForm() {
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const username = usernameRef.current.value;
    const password = passwordRef.current.value;
    // submit username and password
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" ref={usernameRef} />
      <input type="password" ref={passwordRef} />
      <button type="submit">Login</button>
    </form>
  );
}
```

You're not tracking state on every keystroke. You pull values out when you need them. For a simple login form where you don't need real-time validation, this is perfectly fine.

### Resetting an uncontrolled form

To reset an uncontrolled form (clear all inputs back to their initial state), you can:

1. Call `form.reset()` on the form DOM node via a form ref
2. Change the component's `key` prop — this unmounts and remounts it, resetting all browser state

```jsx
// Reset by calling native form reset
const formRef = useRef(null);
function handleReset() {
  formRef.current.reset();
}

// Reset by key change (nuclear option — remounts everything)
const [formKey, setFormKey] = useState(0);
function handleReset() {
  setFormKey(k => k + 1);
}
<MyForm key={formKey} />
```

> **Check yourself:** If you pass `value="hello"` to an input with no `onChange`, what does the user experience? What's the correct prop to use if you want the input to start with "hello" but allow the user to edit it?

---

## The File Input Exception

`<input type="file">` is **always uncontrolled**. The browser prevents JavaScript from setting the value of a file input (this is a security feature — pages can't silently pre-select files). You can only read the selected file, never set it programmatically.

```jsx
function FileUpload() {
  const fileRef = useRef(null);

  function handleUpload() {
    const file = fileRef.current.files[0];
    // do something with file
  }

  return (
    <>
      <input type="file" ref={fileRef} />
      <button onClick={handleUpload}>Upload</button>
    </>
  );
}
```

If you need to track whether a file has been selected, you can still use `onChange` with a state variable to track the file reference — but you can't pass a `value` prop to the input itself.

---

## When to Use Each

**Use controlled inputs when you need:**
- Real-time validation (show errors as the user types)
- Conditional UI based on input value (enable/disable buttons, filter results)
- Value transformation (auto-format phone numbers, enforce case)
- Programmatic control (clear the input from a parent component via state)
- Integration with form libraries like React Hook Form or Formik (they wrap controlled inputs)

**Use uncontrolled inputs when:**
- The form is simple and you only need values on submit
- You're integrating with a non-React library that manages inputs directly
- Performance matters and you want to avoid re-rendering on every keystroke (though this is rarely a real issue at the component level)
- You have no real-time validation or dynamic behavior

**The file input exception:** always uncontrolled — no choice.

In practice, **controlled inputs are the default recommendation** for React code. The React team recommends them. Most form libraries build on them. The ability to have instant access to all input values and the ability to transform/validate in `onChange` make them more predictable and easier to test.

---

## Switching Between Controlled and Uncontrolled

React warns (and sometimes breaks) if a component switches from uncontrolled to controlled or vice versa mid-life. The warning: "A component is changing an uncontrolled input to be controlled."

The trigger: you pass `value={undefined}` initially (which makes React treat it as uncontrolled), then later `value="some string"` (which makes React treat it as controlled). React doesn't support this transition — it's either always controlled or always uncontrolled.

The fix: always pass a defined value for controlled inputs, even if it's an empty string:

```jsx
// Wrong — undefined makes React treat this as uncontrolled initially
<input value={user?.name} onChange={...} />
// If user is undefined, value is undefined → uncontrolled
// When user loads, value becomes a string → switch to controlled → warning

// Correct — always defined, always controlled
<input value={user?.name ?? ''} onChange={...} />
```

---

## Gotchas

**`value` without `onChange` creates a read-only input, not a controlled one.** People sometimes pass `value` thinking it just sets an initial value. It doesn't — it locks the input to that value indefinitely. Use `defaultValue` for initial values in uncontrolled inputs.

**`onChange` fires on every keystroke, not just on blur.** This is different from native HTML `change` events, which fire on blur. React's `onChange` fires as the user types. This is actually the more useful behavior for real-time validation, but if you've come from non-React code, the frequency might surprise you.

**For `<select>`, pass `value` to the `<select>` element, not to `<option>` elements.** Controlled selects work by matching the `value` prop on `<select>` to the `value` attribute on the selected `<option>`:

```jsx
<select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
  <option value="london">London</option>
  <option value="dubai">Dubai</option>
</select>
```

**For `<textarea>`, use it as `<textarea value={text} onChange={...} />`, not with children.** Native HTML `<textarea>content</textarea>` uses child text. In React, the controlled textarea uses the `value` prop — same as inputs. Using children in a controlled textarea produces a warning.

---

## Interview Questions


**Q (High): What is the difference between a controlled and uncontrolled input in React?**

Answer: In a controlled input, React owns the input's value — it's stored in state and passed as the `value` prop. Every change goes through `onChange`, which updates state, which causes a re-render, which sets the new value. React is always in sync with what the input displays. In an uncontrolled input, the browser owns the value — React doesn't track it. You use `defaultValue` to seed an initial value and a `ref` to read the value imperatively when needed (typically on submit). Controlled inputs give you real-time access to the value and enable real-time validation and transformation. Uncontrolled inputs are simpler for cases where you only need the value at a specific point in time.

The trap: "Controlled inputs are always better." The answer should acknowledge tradeoffs. Uncontrolled inputs are legitimate for simple, submit-only forms.

---

**Q (High): What happens if you pass `value` to an input without also passing `onChange`?**

Answer: The input becomes read-only — the user can't change it. React will also log a warning about a controlled input without an `onChange` handler. What's happening under the hood: the user types, the DOM temporarily shows the typed character, React re-renders and overwrites the DOM value back to the unchanged state value. The net effect is that the input ignores user input. If you genuinely want a read-only input, be explicit with the `readOnly` HTML attribute. If you want an initial value for an uncontrolled input, use `defaultValue` instead of `value`.

The trap: Thinking `value` sets an initial value. It sets the *current* value on every render — it's a fully controlled prop, not a seed.

---

**Q (High): What causes the warning "A component is changing an uncontrolled input to be controlled" and how do you fix it?**

Answer: React tracks whether an input is controlled (has a `value` prop) or uncontrolled (no `value` prop) when it first mounts. If you initially pass `value={undefined}` — because the data hasn't loaded yet — React treats it as uncontrolled. When data loads and you pass a real string, React sees a controlled `value` for the first time — it's switching modes, which React doesn't support. The fix is to always pass a defined value: `value={data?.name ?? ''}` ensures the value is always a string (empty or not), keeping the input controlled from the first render.

The trap: Not knowing the fix. The solution — coalesce to an empty string — is simple but non-obvious if you don't understand why the warning fires.

---
**Q (Medium): Why is `<input type="file">` always uncontrolled?**

Answer: Because the browser enforces this as a security restriction. JavaScript cannot set the `value` of a file input — if it could, a malicious page could silently pre-select a file and steal it. The browser only allows the user to choose the file through the file picker UI. React can't override this — any attempt to pass a `value` prop to a file input is ignored by the browser. You must use a `ref` to read `inputRef.current.files` when the user makes a selection. You can track the file's *name* or *metadata* in state via `onChange`, but you can't control what file is selected.

The trap: Forgetting this exception exists. File inputs are the one case where you must go uncontrolled in React regardless of your preference.

---

**Q (Medium): How do you reset a controlled form input to its initial value?**

Answer: Call the setter with the initial value. If the form is tracking state, you can reset by calling `setFieldValue('')` or `setFormValues(initialValues)`. For an entire form, if you're tracking all fields in a single state object, you reset by calling `setFormState(initialFormState)`. If you're using uncontrolled inputs, you call `formRef.current.reset()` or force a remount by changing the form's `key` prop. The controlled approach is more explicit: you own the state, you can reset it to whatever value you want at any time by calling the setter.

The trap: Suggesting you need to imperatively touch the DOM to reset a controlled form. Controlled forms reset by updating state.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write a minimal controlled input from memory with `useState`, `value`, and `onChange` wired up correctly
- [ ] Can explain what happens when `value` is passed without `onChange` — the exact mechanism, not just "it's read-only"
- [ ] Can explain the difference between `value` and `defaultValue` and when to use each
- [ ] Can name the one input type that is always uncontrolled and explain the browser security reason why
- [ ] Can diagnose and fix the "changing uncontrolled to controlled" warning — what triggers it and what the fix is

---

*Next: Synthetic Events — inputs emit events when the user interacts with them. React wraps those native browser events in a synthetic event system. Understanding why that wrapper exists and what it does (and what it used to do but no longer does) is essential for any code that handles user interactions.*
