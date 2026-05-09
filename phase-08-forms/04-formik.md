# Formik

## Quick Reference

| Concept | Details |
|---|---|
| Core philosophy | Controlled inputs — Formik state mirrors every field value |
| Setup | `useFormik(config)` or `<Formik>` render-prop component |
| Field wire-up | `getFieldProps('name')` spreads `value`, `onChange`, `onBlur`, `name` |
| Errors | `formik.errors.fieldName` (only shown if `formik.touched.fieldName`) |
| Touched | Populated on `onBlur`; guards against premature error display |
| Schema | `validationSchema` prop accepts a Yup schema |

---

## Why Formik

Formik (2017) was the first library to systematically solve the three pain points of hand-rolled React forms: tracking values, tracking touched state, and wiring validation. Before Formik, every team reinvented the wheel with their own `useState` + `errors` + `touched` pattern.

It uses controlled inputs — every field value lives in Formik's internal state, and re-renders happen on every keystroke. For most forms this is fine. For very large or complex forms, RHF's uncontrolled approach is more performant. Formik is still extremely common in codebases and libraries built before 2020.

---

## useFormik Hook

The lowest-level API — gives you a Formik instance to wire up manually.

```jsx
import { useFormik } from 'formik';

function LoginForm() {
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validate(values) {
      const errors = {};
      if (!values.email) errors.email = 'Required';
      else if (!/\S+@\S+\.\S+/.test(values.email)) errors.email = 'Invalid email';
      if (!values.password) errors.password = 'Required';
      else if (values.password.length < 8) errors.password = 'Min 8 characters';
      return errors;
    },
    onSubmit(values) {
      console.log(values);
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <input
        id="email"
        type="email"
        {...formik.getFieldProps('email')}
      />
      {formik.touched.email && formik.errors.email && (
        <p>{formik.errors.email}</p>
      )}

      <input
        id="password"
        type="password"
        {...formik.getFieldProps('password')}
      />
      {formik.touched.password && formik.errors.password && (
        <p>{formik.errors.password}</p>
      )}

      <button type="submit">Login</button>
    </form>
  );
}
```

`getFieldProps('name')` returns `{ name, value, onChange, onBlur }` — spreading it wires the input to Formik completely. Showing errors only when `touched` is true implements the on-blur-first strategy automatically.

---

## Yup Schema Validation

Instead of the `validate` function, pass a Yup schema as `validationSchema`. Formik runs it automatically.

```jsx
import * as Yup from 'yup';

const schema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(8, 'Min 8 characters').required('Required'),
});

const formik = useFormik({
  initialValues: { email: '', password: '' },
  validationSchema: schema,
  onSubmit(values) { /* ... */ },
});
```

Yup schemas compose well and give you a declarative single source of truth for validation rules. They're more maintainable than a hand-written `validate` function for complex forms.

---

> **Check yourself:** What does `formik.touched` contain, and why does the pattern `formik.touched.email && formik.errors.email` matter?

---

## Formik Component API

`<Formik>` is a render-prop/context-based alternative to `useFormik`. Its advantage: child components can consume Formik state via `useFormikContext` without prop drilling.

```jsx
import { Formik, Form, Field, ErrorMessage } from 'formik';

function SignupForm() {
  return (
    <Formik
      initialValues={{ email: '', username: '' }}
      validationSchema={schema}
      onSubmit={(values, actions) => {
        submitToServer(values).then(() => {
          actions.setSubmitting(false);
          actions.resetForm();
        });
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <Field name="email" type="email" />
          <ErrorMessage name="email" component="p" />

          <Field name="username" />
          <ErrorMessage name="username" component="p" />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </Form>
      )}
    </Formik>
  );
}
```

- `<Form>` is a pre-wired `<form>` that calls `formik.handleSubmit`
- `<Field>` is a pre-wired input that calls `getFieldProps` for you
- `<ErrorMessage>` renders the error for a field only when it's touched and invalid

---

## useFormikContext

Any component inside a `<Formik>` tree can access the Formik instance:

```jsx
import { useFormikContext } from 'formik';

function SubmitButton() {
  const { isSubmitting, isValid, dirty } = useFormikContext();
  return (
    <button type="submit" disabled={isSubmitting || !isValid || !dirty}>
      Submit
    </button>
  );
}
```

This is the key advantage of the `<Formik>` component API over `useFormik`: context propagation allows deep component trees to access form state without prop threading.

---

> **Check yourself:** What is the difference between `useFormik` and the `<Formik>` + `useFormikContext` pattern? When would you choose one over the other?

---

## Handling Async Submit

Formik sets `isSubmitting` to `true` when `handleSubmit` is called and back to `false` when the `onSubmit` promise resolves. Use this to disable the submit button and show a loading state.

```jsx
onSubmit: async (values, { setSubmitting, setErrors, resetForm }) => {
  try {
    await createUser(values);
    resetForm();
  } catch (err) {
    // Set server-side errors back onto form fields
    setErrors({ email: err.message });
  } finally {
    setSubmitting(false);
  }
}
```

`setErrors` injects errors that didn't come from client-side validation — e.g., "Email already taken" from the server. These appear in `formik.errors` and render alongside client errors.

---

## Formik vs React Hook Form at a Glance

| | Formik | React Hook Form |
|---|---|---|
| Input strategy | Controlled (state) | Uncontrolled (refs) |
| Re-renders | Every keystroke | Only when needed |
| Bundle size | ~15 kB | ~9 kB |
| Third-party inputs | `<Field as={Component}>` | `<Controller>` |
| Schema library | Yup (native), Zod (plugin) | Zod, Yup, Joi, others |
| Context API | `useFormikContext` | `useFormContext` |
| Age / ecosystem | Older, very common | Newer, growing fast |

Neither is universally better. Formik is cleaner to read, RHF is faster. At scale (50+ fields, complex validation trees), the performance difference matters.

---

## Self-Assessment

- [ ] I can build a form with `useFormik`, including `getFieldProps` and touched guards
- [ ] I can attach a Yup schema via `validationSchema`
- [ ] I know the difference between `useFormik` and the `<Formik>` component
- [ ] I can use `useFormikContext` to access form state in a child component
- [ ] I can handle server-side errors with `setErrors` in the `onSubmit` callback
- [ ] I can articulate the Formik vs RHF tradeoff to an interviewer

---

## Interview Q&A

**Q: What is Formik's `touched` object and why is it necessary? (High)**

A: `touched` tracks which fields the user has visited (blurred). Showing errors requires both a validation failure (`errors.field`) and the user having interacted with the field (`touched.field`). Without the touched guard, errors appear on page load before the user has typed anything — a poor UX. Formik sets `touched[name] = true` in its `onBlur` handler, which `getFieldProps` wires up automatically.

---

**Q: How does Formik handle server-side validation errors? (Medium)**

A: In the `onSubmit` callback, Formik provides `setErrors(errorsObject)` as part of the `formikHelpers` argument. After the API returns an error, call `setErrors({ fieldName: 'Server error message' })`. This injects errors into `formik.errors` exactly as if they came from client-side validation, and they render in the same `<ErrorMessage>` components.

---

**Q: When would you choose Formik over React Hook Form? (Medium)**

A: Formik when the team is already using it, when legibility matters more than performance, or when the codebase uses Yup heavily (Formik's integration is first-class). RHF when the form is large/complex, re-render performance is a concern, or TypeScript inference is important (RHF's types are more precise). In greenfield projects today, most teams default to RHF.

---

**Q: What does `resetForm()` do in Formik? (Low)**

A: It resets `values` back to `initialValues`, clears `errors`, clears `touched`, and resets `isSubmitting` and other flags. If you call `resetForm({ values: newValues })`, it resets to the new values rather than the original `initialValues`. This is useful after an async submit that should clear the form, or after loading new data into an edit form.
