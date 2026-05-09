# Form Validation Strategies

## Quick Reference

| Strategy | When it fires | UX feel | Best for |
|---|---|---|---|
| On submit | `onSubmit` only | Delayed feedback | Simple forms |
| On blur | Field loses focus | Balanced | Most forms |
| On change | Every keystroke | Immediate | Search, passwords |
| Hybrid | Blur first, then change after first error | Best UX | Production forms |

---

## Why Validation Strategy Matters

Validation is not just about correctness — it's about when the user gets feedback. Show errors too early (on the first keystroke) and you frustrate users before they've even finished typing. Show them too late (only on submit) and you waste the user's time. The strategy you pick is a product decision as much as a technical one.

The "right" strategy for most production forms is hybrid: validate on blur to catch errors after the user leaves a field, then switch to on-change validation for that field after its first error is shown. This gives the user a clean slate to start, feedback as soon as they finish a field, and live correction once they know something is wrong.

---

## On-Submit Validation

The simplest pattern. Validate everything in the `onSubmit` handler, collect errors, and set them in state.

```jsx
function LoginForm() {
  const [fields, setFields] = React.useState({ email: '', password: '' });
  const [errors, setErrors] = React.useState({});

  function validate(values) {
    const errs = {};
    if (!values.email.includes('@')) errs.email = 'Valid email required';
    if (values.password.length < 8) errs.password = 'Min 8 characters';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    // submit
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={fields.email} onChange={handleChange} />
      {errors.email && <p>{errors.email}</p>}

      <input name="password" type="password" value={fields.password} onChange={handleChange} />
      {errors.password && <p>{errors.password}</p>}

      <button type="submit">Login</button>
    </form>
  );
}
```

Simple but gives no feedback until the user hits submit.

---

## On-Blur Validation

Fire validation when a field loses focus (`onBlur`). Track which fields have been "touched" so errors only show after the user has visited them.

```jsx
const [touched, setTouched] = React.useState({});

function handleBlur(e) {
  const { name } = e.target;
  setTouched(prev => ({ ...prev, [name]: true }));
}

// Render error only for touched fields
{touched.email && errors.email && <p>{errors.email}</p>}
```

Computing errors can be done inline on every render (derived from current field values) rather than storing them separately — that way they always reflect the latest state.

```jsx
const errors = validate(fields); // pure function, runs on every render
```

---

> **Check yourself:** Why is it better to compute `errors` as derived state on each render rather than storing them in a separate `useState`? What problem does that avoid?

---

## On-Change Validation

Validate on every keystroke. Appropriate for fields where immediate feedback is valuable — passwords (strength meter), async availability checks (username taken), or search inputs.

```jsx
function handleChange(e) {
  const { name, value } = e.target;
  setFields(prev => ({ ...prev, [name]: value }));
  // Validate immediately — errors update with every character
}

const errors = validate(fields); // recalculated on every render
```

For async checks (e.g., username availability), debounce the API call:

```jsx
React.useEffect(() => {
  if (!fields.username) return;
  const id = setTimeout(async () => {
    const taken = await checkUsername(fields.username);
    setErrors(prev => ({ ...prev, username: taken ? 'Username taken' : '' }));
  }, 400);
  return () => clearTimeout(id);
}, [fields.username]);
```

---

## Hybrid Strategy (Production Pattern)

Show no error until the user blurs the field. Once an error appears, switch to on-change validation so the user gets live feedback as they correct it.

```jsx
function handleBlur(e) {
  const { name } = e.target;
  setTouched(prev => ({ ...prev, [name]: true }));
}

function handleChange(e) {
  const { name, value } = e.target;
  setFields(prev => ({ ...prev, [name]: value }));
  // If the field already has an error visible, validate immediately
  if (touched[name]) {
    // errors will recalculate on re-render — nothing extra needed
  }
}

// Show error only if the field has been touched
const showError = name => touched[name] && errors[name];
```

Because `errors` is derived from `fields` on every render, switching from blur-only to change-tracking just means setting `touched[name] = true` on blur and then relying on the fact that re-renders already recompute errors. No extra logic needed.

---

> **Check yourself:** What does "touched" mean in the context of form validation, and why is it necessary?

---

## Error Display Best Practices

- Place errors immediately below (or adjacent to) the field they belong to
- Use `aria-describedby` to connect the error message to the input for screen readers
- Use `aria-invalid="true"` on the input when it has an error
- Don't use color alone to signal errors — pair with an icon or text

```jsx
<div>
  <input
    id="email"
    name="email"
    value={fields.email}
    onChange={handleChange}
    onBlur={handleBlur}
    aria-invalid={showError('email') ? 'true' : 'false'}
    aria-describedby={showError('email') ? 'email-error' : undefined}
  />
  {showError('email') && (
    <p id="email-error" role="alert">
      {errors.email}
    </p>
  )}
</div>
```

`role="alert"` causes screen readers to announce the error as soon as it appears, even without the user navigating to it.

---

## Self-Assessment

- [ ] I can explain the tradeoff between on-submit, on-blur, and on-change validation
- [ ] I know what "touched" tracking is and why on-blur alone isn't sufficient
- [ ] I can implement the hybrid strategy (blur first, change after first error)
- [ ] I know the ARIA attributes needed to make error messages accessible
- [ ] I can implement async field validation with debouncing

---

## Interview Q&A

**Q: What validation strategy do you use in production and why? (High)**

A: Hybrid — validate on blur so the user gets a clean slate while typing, but once an error is shown for a field, switch to on-change so they get live feedback as they correct it. This avoids premature errors while still giving fast correction feedback. Purely on-submit is the worst UX because it batches all surprises at the end.

---

**Q: Why compute errors as derived state rather than storing them in useState? (Medium)**

A: If errors live in `useState`, they can get out of sync with the fields — e.g., the user clears a field but the old error still shows because state hasn't been updated. Deriving errors from the current field values on every render means they're always consistent. The cost is a validation function call per render, which is cheap for synchronous rules.

---

**Q: How do you do async validation (e.g., checking if a username is taken)? (Medium)**

A: Use a `useEffect` that watches the field value and fires a debounced API call. Store the async error in a separate state key. Debounce is essential — you don't want a network request on every keystroke. Cancel the previous timeout in the cleanup function so you only act on the latest value.

---

**Q: How do you make form errors accessible to screen reader users? (Medium)**

A: Two things: set `aria-invalid="true"` on the invalid input so the screen reader knows it's in an error state, and connect the error message to the input via `aria-describedby` pointing to the error element's `id`. Adding `role="alert"` to the error message causes it to be announced immediately when it appears, without the user needing to navigate to it.
