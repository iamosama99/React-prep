# Multi-Step / Wizard Forms

## Quick Reference

| Concern | Approach |
|---|---|
| Step state | `useState` for current step index |
| Accumulated data | Single state object, merged at each step |
| Per-step validation | Validate only current step's fields before advancing |
| Back navigation | Never clear data from previous steps |
| URL-based steps | `useSearchParams` to preserve step on refresh |
| RHF across steps | Single `useForm` instance at the parent level |

---

## Why Multi-Step Forms Are Tricky

A multi-step (wizard) form is deceptively complex. The obvious parts — showing different fields per step, having a Next/Back button — are easy. The hard parts are:

1. **Data accumulation** — each step's data must survive navigating away from that step
2. **Per-step validation** — you want to validate only the current step's fields, not the whole form
3. **Going back** — navigating back must show the previously entered data pre-filled
4. **Final submit** — merging all steps' data into one payload
5. **Step persistence** — if the user refreshes the page, which step should they land on?

---

## Architecture Pattern: Single State Object

The cleanest pattern is a single accumulated state object at the parent level. Each step reads from it and writes back to it on Next.

```jsx
const STEPS = ['Account', 'Profile', 'Payment'];

function WizardForm() {
  const [step, setStep] = React.useState(0);
  const [formData, setFormData] = React.useState({
    // Step 0 — Account
    email: '',
    password: '',
    // Step 1 — Profile
    firstName: '',
    lastName: '',
    bio: '',
    // Step 2 — Payment
    cardNumber: '',
    expiry: '',
  });

  function handleStepData(stepData) {
    setFormData(prev => ({ ...prev, ...stepData }));
  }

  function handleNext(stepData) {
    handleStepData(stepData);
    setStep(s => s + 1);
  }

  function handleBack() {
    setStep(s => s - 1);
    // Do NOT clear data — user should see their previous input when going back
  }

  async function handleSubmit(finalStepData) {
    const payload = { ...formData, ...finalStepData };
    await submitToServer(payload);
  }

  return (
    <div>
      <StepIndicator steps={STEPS} current={step} />
      {step === 0 && (
        <AccountStep defaultValues={formData} onNext={handleNext} />
      )}
      {step === 1 && (
        <ProfileStep defaultValues={formData} onNext={handleNext} onBack={handleBack} />
      )}
      {step === 2 && (
        <PaymentStep defaultValues={formData} onBack={handleBack} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
```

Each step receives `defaultValues` so it pre-fills from accumulated data when the user navigates back. Each step calls `onNext(stepData)` with only its own fields.

---

## Per-Step Component with React Hook Form

Each step manages its own RHF instance, validating only its own fields.

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const accountSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

function AccountStep({ defaultValues, onNext }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: defaultValues.email,
      password: defaultValues.password,
    },
    resolver: zodResolver(accountSchema),
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <input {...register('email')} type="email" />
      {errors.email && <p>{errors.email.message}</p>}

      <input {...register('password')} type="password" />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit">Next</button>
    </form>
  );
}
```

`handleSubmit(onNext)` only calls `onNext` if this step's validation passes. The parent accumulates the data and advances the step.

---

> **Check yourself:** Why does each step receive `defaultValues` from the parent? What would happen if you didn't pass them?

---

## Single RHF Instance Pattern

For tighter integration (or when steps share fields), keep a single `useForm` at the wizard level and pass the RHF context to children via `FormProvider`.

```jsx
import { useForm, FormProvider, useFormContext } from 'react-hook-form';

function WizardForm() {
  const methods = useForm({
    defaultValues: { email: '', password: '', firstName: '' },
    mode: 'onBlur',
  });

  async function onSubmit(data) {
    await submitToServer(data);
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {step === 0 && <AccountFields />}
        {step === 1 && <ProfileFields />}
        <NavigationButtons />
      </form>
    </FormProvider>
  );
}

function AccountFields() {
  const { register, formState: { errors } } = useFormContext();
  return (
    <>
      <input {...register('email', { required: true })} />
      {errors.email && <p>Required</p>}
    </>
  );
}
```

With a single form instance, all field values persist across steps automatically — they live in RHF's internal store, not in your state. To validate only the current step's fields before advancing, use `trigger()` with a list of field names:

```js
const { trigger } = useFormContext();

async function handleNext() {
  const valid = await trigger(['email', 'password']); // validate only step 0 fields
  if (valid) setStep(s => s + 1);
}
```

---

## Step Indicator

A step indicator shows progress. Keep it purely visual — driven by the current step index.

```jsx
function StepIndicator({ steps, current }) {
  return (
    <nav aria-label="Form steps">
      <ol>
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === current ? 'step' : undefined}
          >
            <span>{i + 1}</span> {label}
            {i < current && ' ✓'}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

`aria-current="step"` tells screen readers which step is active.

---

> **Check yourself:** What is the difference between the "separate RHF per step" pattern and the "single RHF + FormProvider" pattern? What does each do better?

---

## URL-Based Step State

Storing the step in the URL allows the user to share links, use browser back/forward, and not lose their place on refresh.

```jsx
import { useSearchParams } from 'react-router-dom';

function WizardForm() {
  const [params, setParams] = useSearchParams();
  const step = Number(params.get('step') ?? 0);

  function handleNext(stepData) {
    setFormData(prev => ({ ...prev, ...stepData }));
    setParams({ step: step + 1 });
  }

  function handleBack() {
    setParams({ step: step - 1 });
  }
  // ...
}
```

The accumulated `formData` still needs to live in React state (or a global store) because it won't survive a page refresh. Consider persisting it to `sessionStorage` if refresh preservation is a requirement.

---

## Handling the Final Submit

On the last step, merge accumulated state with the final step's data and submit:

```jsx
async function handleSubmit(finalStepData) {
  const payload = { ...formData, ...finalStepData };
  try {
    await api.post('/users', payload);
    // navigate to success screen
  } catch (err) {
    // Show server error on the last step
    setServerError(err.message);
  }
}
```

---

## Self-Assessment

- [ ] I can build a wizard with separate state per step accumulated into a parent object
- [ ] I can implement per-step validation using RHF's `trigger()` or per-step `useForm` instances
- [ ] I know how to pre-fill steps when the user navigates back
- [ ] I can put the step index in the URL with `useSearchParams`
- [ ] I can use `FormProvider` and `useFormContext` to share a single RHF instance across steps
- [ ] I know how to handle a server error on the final step

---

## Interview Q&A

**Q: How do you prevent data loss when the user navigates between steps? (High)**

A: Keep all field values in a parent state object and pass `defaultValues` down to each step from that object. When the user hits Next, merge the step's data into the parent state before advancing. When they go Back, the parent state still holds their previous input, and passing it as `defaultValues` pre-fills the form. Never clear the parent state on Back.

---

**Q: How do you validate only the current step's fields and not the whole form? (High)**

A: Two approaches. With separate `useForm` instances per step, each form's `handleSubmit` only validates its own registered fields — so validation is naturally isolated. With a single `useForm` via `FormProvider`, call `trigger(['field1', 'field2'])` with the list of field names belonging to the current step. `trigger` runs validation and returns a boolean — advance only if it resolves to `true`.

---

**Q: Should multi-step form state live in URL params or component state? (Medium)**

A: Both, for different concerns. The step index belongs in the URL — this makes back/forward navigation work, lets users share links mid-form, and survives refreshes. The accumulated form data belongs in React state (or `sessionStorage` for refresh resilience). URL params aren't suitable for large form payloads; they're for bookmarkable navigation state.

---

**Q: How would you handle a server error that maps back to a field on step 1, while the user is on step 3? (Low)**

A: Store the server error in parent state keyed by field name. When the user navigates back to step 1, pass those server errors to that step and display them alongside the field. With RHF, use `setError('fieldName', { message: '...' })` on the step-1 form instance, or use `FormProvider` and `useFormContext().setError` if using a single instance. You may also redirect the user back to the step that has the error automatically.
