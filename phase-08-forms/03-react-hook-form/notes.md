# React Hook Form

## Quick Reference

| Concept | Details |
|---|---|
| Core strategy | Uncontrolled by default — refs, not state, per field |
| Registration | `{...register('fieldName', rules)}` spreads `ref`, `name`, `onChange`, `onBlur` |
| Submit | `handleSubmit(onValid, onInvalid)` — calls `onValid` only when all rules pass |
| Errors | `formState.errors.fieldName.message` |
| Watch | `watch('field')` re-renders the component; prefer `getValues()` for non-reactive reads |
| Controller | Wraps controlled third-party inputs (Select, DatePicker) with RHF |

---

## Why React Hook Form Exists

Traditional controlled forms re-render on every keystroke. For a form with 20 fields, that's 20 re-renders per character — multiplied by every character the user types. At scale (complex validations, expensive child components), this becomes a performance problem.

React Hook Form (RHF) flips the model: inputs are uncontrolled. Each field registers a ref and manages its own DOM value. RHF reads values only when needed (submit, watch, getValues), not on every change. The result is dramatically fewer re-renders — often zero per-keystroke renders for the parent component.

The tradeoff is that you lose the React data flow: you can't derive UI state from field values without `watch()`, which re-introduces renders. For most forms, this tradeoff is worth it.

---

## Basic Setup

```jsx
import { useForm } from 'react-hook-form';

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  function onSubmit(data) {
    // data = { email: '...', password: '...' }
    console.log(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        type="email"
        {...register('email', {
          required: 'Email is required',
          pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
        })}
      />
      {errors.email && <p>{errors.email.message}</p>}

      <input
        type="password"
        {...register('password', {
          required: 'Password is required',
          minLength: { value: 8, message: 'Min 8 characters' },
        })}
      />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit">Sign up</button>
    </form>
  );
}
```

`register('email', rules)` returns `{ ref, name, onChange, onBlur }`. Spreading it on the input wires everything up. No state, no handlers to write.

---

## Built-in Validation Rules

```js
register('field', {
  required: 'This field is required',
  min: { value: 18, message: 'Must be 18+' },
  max: { value: 99, message: 'Max 99' },
  minLength: { value: 8, message: 'Min 8 chars' },
  maxLength: { value: 20, message: 'Max 20 chars' },
  pattern: { value: /regex/, message: 'Invalid format' },
  validate: value => value !== 'admin' || 'Reserved username',
  // validate can also be an object of named validators:
  validate: {
    notAdmin: v => v !== 'admin' || 'Reserved',
    notEmpty: v => v.trim().length > 0 || 'Cannot be blank',
  },
})
```

---

> **Check yourself:** What does `register` actually return, and why does spreading it on the `<input>` work? What would happen if you forgot to spread it?

---

## Default Values

```jsx
const { register } = useForm({
  defaultValues: {
    email: 'user@example.com',
    role: 'viewer',
  },
});
```

`defaultValues` are the values RHF uses as the baseline. They also define what `reset()` reverts to. Use `defaultValues` for async data (fetched user profile) by passing them in or using `reset(fetchedData)` after the fetch resolves.

```jsx
// Populate form after async fetch
React.useEffect(() => {
  fetchUser(id).then(user => reset(user));
}, [id, reset]);
```

---

## Watching Values

`watch()` subscribes the component to a field's changes — it re-renders on every change to that field.

```jsx
const watchedEmail = watch('email');
```

For reads that don't need to trigger re-renders (e.g., reading a value inside a submit handler or an effect), use `getValues()`:

```jsx
const { getValues } = useForm();
// Inside a handler — no re-render
const email = getValues('email');
```

---

## Controller: Wrapping Controlled Third-Party Inputs

Some component libraries (React Select, MUI DatePicker) don't expose a native ref. Use `Controller` to bridge them:

```jsx
import { Controller } from 'react-hook-form';
import Select from 'react-select';

<Controller
  name="country"
  control={control}
  rules={{ required: 'Country is required' }}
  render={({ field }) => (
    <Select
      {...field}
      options={countryOptions}
    />
  )}
/>
```

`field` contains `{ value, onChange, onBlur, name, ref }` — exactly what RHF needs. `Controller` makes the third-party input behave as if it were a native controlled input in RHF's world.

---

> **Check yourself:** When would you use `Controller` vs `register`? What is the key structural difference between inputs that use each approach?

---

## Form State

```jsx
const {
  formState: {
    errors,        // { fieldName: { message, type } }
    isDirty,       // any field differs from defaultValues
    isValid,       // all validations pass
    isSubmitting,  // currently in the async onSubmit fn
    touchedFields, // { fieldName: true } for visited fields
    dirtyFields,   // { fieldName: true } for changed fields
  }
} = useForm({ mode: 'onBlur' });
```

`mode` controls when validation runs: `'onSubmit'` (default), `'onBlur'`, `'onChange'`, `'onTouched'` (blur first, then change after touched), or `'all'`.

---

## Schema Validation with a Resolver

Instead of per-field rules, pass a resolver to validate the whole form with Zod or Yup:

```jsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

Now there are no inline rules. RHF calls the resolver on submit (or on the mode's trigger), gets back errors, and maps them to the field names. This is the recommended pattern for anything beyond trivial validation.

---

## Self-Assessment

- [ ] I can build a form with `register`, `handleSubmit`, and `formState.errors`
- [ ] I know what `register` returns and why spreading it works
- [ ] I can set `defaultValues` and use `reset()` for async population
- [ ] I understand when to use `watch` vs `getValues`
- [ ] I can wrap a third-party input with `Controller`
- [ ] I know how to attach a Zod or Yup resolver

---

## Interview Q&A

**Q: Why is React Hook Form faster than Formik for large forms? (High)**

A: RHF uses uncontrolled inputs — refs, not state — so field values are stored in the DOM, not in React state. The parent component doesn't re-render on every keystroke. Formik uses controlled inputs (state per field), so a 20-field form re-renders the whole tree on every character. RHF re-renders only when validation errors appear or watched values change.

*Interviewer follow-up:* "When does RHF re-render?" — on `watch()` calls, when `formState` properties change (e.g., `isDirty`, `isValid`), and on submit. Not on every keystroke.

---

**Q: What does `handleSubmit` do that a plain `onSubmit` doesn't? (High)**

A: It calls `e.preventDefault()` for you, runs validation against all registered fields, and only calls your `onValid` callback if all rules pass. If validation fails, it populates `formState.errors` and optionally calls `onInvalid`. It also sets `isSubmitting` to `true` for the duration of your async submit function and back to `false` when it resolves.

---

**Q: When do you use `Controller` instead of `register`? (Medium)**

A: `register` works by attaching a native ref to the DOM input — it only works with HTML elements that accept a `ref` and expose `value` through the DOM. Third-party components (React Select, Headless UI Combobox, date pickers) render their own DOM and manage their own value internally. `Controller` wraps them with a controlled interface that RHF can talk to, passing `field.onChange` and `field.value` explicitly.

---

**Q: How do you pre-populate a form with data fetched asynchronously? (Medium)**

A: Pass `defaultValues` to `useForm` if you have the data synchronously, or call `reset(fetchedData)` inside a `useEffect` after the fetch resolves. `reset` restores the form to the new default values and clears dirty/touched state. Do not use `setValue` for initial population — that sets individual fields and doesn't update the dirty baseline.

---

**Q: What does `mode: 'onTouched'` do? (Low)**

A: Validates on blur for the first time a field is touched, then switches to on-change validation for that field. This is the hybrid strategy — the best UX pattern — built into RHF's mode system. It matches the production pattern most teams use: no errors while typing, errors after leaving the field, live correction feedback once an error has appeared.
