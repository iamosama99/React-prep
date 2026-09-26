# Custom Hook for Forms (`useForm`)

## Quick Reference

| Piece | What it holds | Design rule |
|---|---|---|
| `values` | Current field values | State — the source of truth |
| `errors` | Validation messages | **Derived** from `values` (don't store what you can compute) |
| `touched` | Which fields the user has interacted with | State — controls *when* to show errors |
| `getFieldProps(name)` | `{ name, value, onChange, onBlur, aria-* }` | One spread per input replaces 5 lines of wiring |
| `handleSubmit(fn)` | Prevents default, touches all, validates, calls `fn(values)` | Owns the submit lifecycle and `isSubmitting` |
| Context (`<Form>` / `<Field>`) | Shares the form instance without prop drilling | Turns 100+ line forms into declarative JSX |

## Where You've Seen This Before

You've seen every ingredient; this topic *assembles* them into the thing you'd be asked to write in an interview.

- Controlled inputs, `value` + `onChange`, one-state-object forms → [Phase 8: Controlled form patterns](../../phase-08-forms/01-controlled-form-patterns/notes.md)
- Validation timing (on change / blur / submit), sync vs async → [Phase 8: Form validation strategies](../../phase-08-forms/02-form-validation-strategies/notes.md)
- The library you'd use in production (uncontrolled-first, subscriptions) → [React Hook Form](../../phase-08-forms/03-react-hook-form/notes.md), [Formik](../../phase-08-forms/04-formik/notes.md); schema validation → [Zod/Yup](../../phase-08-forms/05-schema-validation-zod-yup/notes.md)
- Extracting logic into a hook → [Topic 7: Custom hook pattern](../07-custom-hook-pattern/notes.md); sharing through Context → [Topic 8: Provider](../08-provider-pattern/notes.md); parts of a form as compound components → [Topic 4](../04-compound-component-pattern/notes.md); one seam for the UI → [Topic 16: Facade](../16-facade-pattern/notes.md)
- Derive, don't sync → [Topic 12](../12-performance-rerender-patterns/notes.md); debounce + stale-response protection → [Phase 14: useDebounce](../../phase-14-live-coding/01-use-debounce-throttle/notes.md), [Debounced search](../../phase-08-forms/08-debounced-search-inputs/notes.md)

**New here:** designing **your own** `useForm<T>` end to end — the state model, *why errors are derived*, the `getFieldProps` API, the submit lifecycle (touch-all → validate → focus first error), a Context layer with `<Field>`, async validation with race protection, and an honest performance analysis (when to reach for React Hook Form instead).

## What Is This?

A form component without abstraction repeats the same six things for **every field**: a piece of state, an `onChange`, an `onBlur`, an error, a touched flag, and ARIA attributes. Twelve fields is 100+ lines of plumbing hiding the actual form.

A `useForm` hook **extracts the plumbing** into one reusable unit:

```tsx
function Signup() {
  const form = useForm({
    initialValues: { email: '', password: '', age: '' },
    validate: v => ({
      ...(!/^\S+@\S+\.\S+$/.test(v.email) && { email: 'Enter a valid email' }),
      ...(v.password.length < 8 && { password: 'At least 8 characters' }),
    }),
    onSubmit: async values => { await api.signup(values); },
  });

  return (
    <form onSubmit={form.handleSubmit} noValidate>
      <label>Email <input {...form.getFieldProps('email')} /></label>
      {form.showError('email') && <p role="alert">{form.errors.email}</p>}
      …
      <button disabled={form.isSubmitting}>Sign up</button>
    </form>
  );
}
```

The component contains **only what's specific to this form**: its fields and its rules.

> **Check yourself:** Count what a single field needs without the hook (state, handlers, error, touched, ARIA). Which of those does `getFieldProps('email')` supply, and which does the component still write?

## Why Does It Exist?

- **Boilerplate scales linearly with fields** and is easy to get subtly wrong (forgetting `onBlur`, mismatched error keys, stale closures).
- **Behaviour must be consistent** across forms: *when* errors appear, how submit works, how `isSubmitting` disables the button. A shared hook makes the policy explicit and single-sourced.
- **Testability**: validation is a pure function `values → errors`; the hook is testable with `renderHook`.
- **The abstraction level matches how you think** about forms: "these fields, these rules, this submit," not "these `useState`s."

In production you'll usually use React Hook Form (or Formik/TanStack Form); writing your own is the best way to understand what they do and where their designs come from — and it's a standard interview exercise.

## How It Works

### 1. The state model

```tsx
type Values = Record<string, unknown>;
type Errors<T> = Partial<Record<keyof T, string>>;
type Touched<T> = Partial<Record<keyof T, boolean>>;

function useForm<T extends Values>({ initialValues, validate, onSubmit }: {
  initialValues: T;
  validate?: (values: T) => Errors<T>;
  onSubmit: (values: T) => void | Promise<void>;
}) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<Touched<T>>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => validate?.(values) ?? {}, [values, validate]);   // DERIVED
  const isValid = Object.keys(errors).length === 0;
  const isDirty = useMemo(() => Object.keys(initialValues).some(k => values[k] !== initialValues[k]), [values, initialValues]);
  …
}
```

**Errors are derived, not stored.** `errors = validate(values)` is a pure function of `values`, so recompute it (memoise if expensive) rather than syncing it into state with an effect. That removes an entire class of bugs (stale errors, extra renders) — the "derive, don't sync" rung from [Topic 12](../12-performance-rerender-patterns/notes.md).

**`touched` is separate from `errors`.** Errors exist as soon as a value is invalid (an empty required field is "invalid" from the first render), but you show them only after the field is *touched* or the form was *submitted*. Showing "Email is required" while the user is still typing in the field for the first time is hostile UX.

### 2. `getFieldProps` — the API that removes the boilerplate

```tsx
const getFieldProps = <K extends keyof T & string>(name: K) => ({
  name,
  value: values[name] as string,
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { type, value, checked } = e.target as HTMLInputElement;
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }));   // functional update: no stale closure
  },
  onBlur: () => setTouched(t => ({ ...t, [name]: true })),
  'aria-invalid': !!(touched[name] && errors[name]),
  'aria-describedby': touched[name] && errors[name] ? `${name}-error` : undefined,
});
```

Design points: the generic `K extends keyof T` keeps names type-checked; state updates use the **functional form** so rapid input never reads stale `values`; `aria-*` are wired automatically (one place to get accessibility right).

### 3. The submit lifecycle

```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setTouched(allTrue(initialValues));                  // reveal every error
  if (Object.keys(validate?.(values) ?? {}).length) {  // use fresh errors, not the stale `errors` closure
    focusFirstInvalid(e.currentTarget as HTMLFormElement);
    return;
  }
  setSubmitting(true); setSubmitError(null);
  try { await onSubmit(values); }
  catch (err) { setSubmitError(err instanceof Error ? err.message : 'Something went wrong'); }
  finally { setSubmitting(false); }
};
```

Details worth being able to explain: **touch all fields** so nothing valid-looking hides an error; **focus the first invalid field** (`form.querySelector('[aria-invalid="true"]')?.focus()`), a11y essential; **guard against double submit** (`isSubmitting`); **`finally`** to always clear the flag; **server errors** get their own channel (`submitError`, or mapping to field errors) because they aren't derived from `values`.

### 4. `reset`, dirty, and initial values

`reset()` restores `values`, clears `touched`, `submitError`. `isDirty` compares to `initialValues` — useful for "unsaved changes" prompts and disabling Save. If `initialValues` comes from async data (edit form), decide explicitly whether the form re-initialises when it changes (an `enableReinitialize` option) — otherwise `useState(initialValues)` ignores later changes ([Topic 12](../12-performance-rerender-patterns/notes.md), "mirroring props in state").

### 5. Context: from 100 lines to declarative JSX

Passing `form` through props to every field is noise. Provide it through Context ([Topic 8](../08-provider-pattern/notes.md)) and build small **field components** that read it — a compound-component-style API ([Topic 4](../04-compound-component-pattern/notes.md)):

```tsx
const [FormProvider, useFormContext] = createSafeContext<ReturnType<typeof useForm>>('Form');

function Field({ name, label, type = 'text' }: { name: string; label: string; type?: string }) {
  const form = useFormContext();
  const showError = form.touched[name] && form.errors[name];
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} type={type} {...form.getFieldProps(name)} />
      {showError && <p id={`${name}-error`} role="alert">{form.errors[name]}</p>}
    </div>
  );
}

<Form form={form}>            {/* provider + <form onSubmit> */}
  <Field name="email" label="Email" />
  <Field name="password" label="Password" type="password" />
  <Form.Submit>Sign up</Form.Submit>
</Form>
```

Now a 12-field form is 12 lines. Repeated concerns (label association, error placement, ARIA) live in `Field` **once** — the "custom hook for forms + Context" combination.

### 6. Async validation (and its race)

"Is this username taken?" is asynchronous and *out-of-order responses are the bug*: typing `ad`, `adm`, `admin` fires three requests that can resolve in any order; a late `ad` response can overwrite the result for `admin`.

```tsx
function useAsyncCheck(value: string, check: (v: string) => Promise<boolean>, delay = 400) {
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  useEffect(() => {
    if (!value) { setState('idle'); return; }
    let ignore = false;                            // ← stale-response guard
    setState('checking');
    const t = setTimeout(async () => {
      const ok = await check(value);
      if (!ignore) setState(ok ? 'ok' : 'taken');  // only the latest effect run may write
    }, delay);
    return () => { ignore = true; clearTimeout(t); };
  }, [value, check, delay]);
  return state;
}
```

Debounce reduces requests; the `ignore` flag guarantees correctness. Treat `'checking'` as *not yet valid* on submit, and re-validate on the server anyway — client checks are UX, not security.

### 7. Performance — the honest analysis

A controlled `useForm` re-renders the **whole form on every keystroke**, because `values` lives in one state object at the top. For 5–15 fields it's fine. For big forms:

- Split fields into memoised components that take only their own value + stable handlers ([Topic 12](../12-performance-rerender-patterns/notes.md)).
- Keep the `values` in a ref/store and subscribe fields individually.
- Go **uncontrolled**: register inputs, read the DOM at submit ([Topic 3](../03-state-vs-refs-inputs/notes.md)).

That last option *is* React Hook Form: `register('email')` returns `{ ref, name, onChange, onBlur }` and stores values outside React state, re-rendering only what subscribes (`formState`, `watch`, `useController`). If you're building a serious app form, use it (or TanStack Form); write your own for small forms and for understanding.

## Gotchas

**Storing errors in state and syncing with an effect.** Extra render, stale flash, and out-of-sync bugs. Derive.

**Showing errors immediately.** Gate on `touched || submitted`. "Required" while the user is still typing hurts conversion.

**Stale closure in `onChange`.** `setValues({ ...values, [name]: v })` reads `values` from the render that created the handler; rapid changes overwrite each other. Use the functional update.

**Validating with stale `errors` in submit.** `handleSubmit` runs from the render's closure; recompute with the freshest `values` (or read from a ref), don't trust a memo captured earlier if state has been batched.

**Checkbox/number/select inputs.** `e.target.value` is a string; checkboxes need `checked`; number inputs should be parsed explicitly. Centralise this in `onChange`.

**Uncontrolled ↔ controlled warning.** `value={undefined}` for fields missing from `initialValues`. Initialise every field (`''`, `false`).

**`initialValues` identity.** Passing an inline object literal each render breaks `isDirty` memoisation and "reinitialise" logic; hoist or memoise it.

**Double submit.** Guard with `isSubmitting`; disable the button *and* ignore the handler when submitting.

**Async validation races.** Always guard with an `ignore` flag or `AbortController`; consider `'checking'` as invalid on submit.

**Client-only validation.** The server must re-validate; map server errors back into fields.

**Accessibility.** `aria-invalid`, `aria-describedby`, `role="alert"` for messages, focus the first error on failed submit, don't rely on colour alone.

**Rolling your own for a huge form.** Whole-form re-render per keystroke will bite; that's the point where RHF earns its keep.

## Interview Questions

**Q (High): Implement a `useForm` hook. What state does it hold and what does it return?**

Answer: State: `values`, `touched`, `isSubmitting` (and a `submitError`). `errors` are *derived* from `values` via a pure `validate` function (memoised), not stored. It returns `values`, `errors`, `touched`, `isValid`/`isDirty`, `getFieldProps(name)` (name/value/onChange/onBlur/aria), `handleSubmit`, `reset`, and helpers like `setValue`. `onChange` uses functional updates; `handleSubmit` prevents default, marks all fields touched, validates, focuses the first invalid field, then awaits `onSubmit` with `isSubmitting` in a `try/finally`.

The trap: Storing errors in state with an effect, forgetting `touched`, or using non-functional setState in `onChange`.

**Q (High): When should validation errors be shown, and how does `touched` help?**

Answer: Errors exist as soon as a value is invalid, but showing them on first render or mid-typing is poor UX. Track `touched` per field (set on blur) and mark everything touched on submit; display an error when `touched[name] && errors[name]`. Optionally validate on change after the first touch ("reward early, punish late") for quick recovery.

The trap: Conflating "has an error" with "should display an error."

**Q (High): How would you reduce a 100+ line form component with this pattern?**

Answer: Move state, handlers, validation timing, ARIA wiring and the submit lifecycle into `useForm`, expose a `getFieldProps` API, and put shared field UI (label, input, error message, ids) into a `Field` component that reads the form from Context. The component then declares the fields and the validation rules; everything else is shared and tested once.

The trap: Just splitting JSX into sub-components without moving the plumbing.

**Q (Medium): How do you handle async validation, such as username availability?**

Answer: Debounce the check and guard against stale responses with an `ignore` flag (or `AbortController`) in the effect cleanup so only the latest input's result is applied. Represent the state as `idle | checking | ok | taken`, treat `checking` as not-yet-valid on submit, and still validate on the server since client checks can be bypassed or race.

The trap: Debouncing without stale-response protection, or trusting the client check.

**Q (Medium): Controlled forms re-render on every keystroke. How do you scale that?**

Answer: For modest forms it's fine. To scale: memoise field components with stable props/handlers, keep values in a store/ref and subscribe per field, or go uncontrolled — register inputs and read values at submit or via subscriptions — which is what React Hook Form does. Measure first; the cost is usually the *rest of the tree* re-rendering, not the input.

The trap: Abandoning controlled inputs reflexively, or not knowing why RHF is faster.

**Q (Medium): How do you focus and announce errors on a failed submit?**

Answer: After validation fails, find the first invalid field (e.g. `form.querySelector('[aria-invalid="true"]')`) and `focus()` it; wire `aria-invalid` and `aria-describedby` to the message element with `role="alert"` (or a live region summary), so screen-reader users hear what's wrong and keyboard users land at the problem.

The trap: Only styling errors red.

**Q (Low): Why keep `initialValues` stable, and how do edit forms with async data work?**

Answer: `useState(initialValues)` only reads it on mount, and `isDirty` compares against it. For data that arrives later, either mount the form after the data is ready (key it by id), or provide an explicit reinitialise path that resets values when the loaded data changes — don't sync via effect on every render.

The trap: Expecting `useState` to update when the prop changes.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write `useForm<T>` with values/touched/derived errors, `getFieldProps`, `handleSubmit`, `reset`
- [ ] Can explain why errors are derived and touched is separate, and when to show errors
- [ ] Can list the submit lifecycle steps (touch all → validate → focus first error → submit → finally)
- [ ] Can add a Context layer with a `Field` component and explain what it buys
- [ ] Can implement async validation with debounce and a stale-response guard
- [ ] Can explain the whole-form re-render cost and how React Hook Form avoids it

---
*That completes Phase 15. From here, the best next step is to pick a pattern and rebuild it under time pressure — Phase 14's live-coding drills pair naturally with the patterns here (Tabs ↔ compound components, Toast ↔ provider + pub-sub, useFetch ↔ Suspense/facade). When you're ready, revisit any Self-Assessment items you couldn't tick.*
