// ============================================================
// Topic:   Custom Hook for Forms (useForm)
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — build useForm<T>: values, derived errors, touched, getFieldProps, submit
//   Exercise 2 — Context + <Form>/<Field>: a 6-field form in ~10 lines of JSX
//   Exercise 3 — async validation with debounce and a stale-response guard
//
// Run: npm run tutorial useform-hook
// ============================================================

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  ChangeEvent, FC, FormEvent, ReactNode,
} from 'react';

// ─── Exercise 1: useForm ─────────────────────────────────────
//
// SITUATION
//   Every field needs: value state, onChange, onBlur, touched, error, ARIA.
//   Extract it once. The signup form below should end up with NO per-field state.
//
// BUILD  useForm<T>({ initialValues, validate?, onSubmit })
//   state          values, touched, isSubmitting, submitError
//   errors         DERIVED: useMemo<Errors<T>>(() => validate?.(values) ?? {}, [values, validate])
//                  (annotate the generic — `?? {}` alone widens the type to `{}`)
//   isValid        no keys in errors
//   isDirty        any value !== its initial value
//   showError(n)   errors[n] only if touched[n]   (else undefined)
//   setValue(n,v)  functional update: setValues(s => ({ ...s, [n]: v }))
//   getFieldProps(name) → { name, value, onChange, onBlur, 'aria-invalid', 'aria-describedby' }
//                   onChange → setValue (checkbox uses `checked`), onBlur → touched[name] = true,
//                   aria-describedby = `${name}-error` ONLY when an error is showing
//   handleSubmit(e) preventDefault → mark ALL fields touched → validate (fresh, from `values`)
//                   → if invalid: focus first [aria-invalid="true"] in the form and stop
//                   → else isSubmitting → await onSubmit(values) in try/catch/finally
//                     (catch sets submitError)
//   reset()        values = initialValues, touched = {}, submitError = null
//
// The stub returns inert values so the page renders; nothing reacts until you implement it.

type FormValues = Record<string, string | boolean>;
type Errors<T> = Partial<Record<keyof T, string>>;
type Touched<T> = Partial<Record<keyof T, boolean>>;

type FieldProps = {
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
};

type FormApi<T extends FormValues> = {
  values: T;
  errors: Errors<T>;
  touched: Touched<T>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  showError: (name: keyof T) => string | undefined;
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  getFieldProps: (name: keyof T & string) => FieldProps;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
};

function useForm<T extends FormValues>(opts: {
  initialValues: T;
  validate?: (values: T) => Errors<T>;
  onSubmit: (values: T) => void | Promise<void>;
}): FormApi<T> {
  const { initialValues } = opts;
  // TODO: implement (see the spec above)
  void useState; void useMemo; void useCallback;
  return {
    values: initialValues,
    errors: {},
    touched: {},
    isValid: true,
    isDirty: false,
    isSubmitting: false,
    submitError: null,
    showError: () => undefined,
    setValue: () => {},
    getFieldProps: name => ({
      name, value: String(initialValues[name] ?? ''), onChange: () => {}, onBlur: () => {}, 'aria-invalid': false,
    }),
    handleSubmit: async e => { e.preventDefault(); },
    reset: () => {},
  };
}

type SignupValues = { email: string; password: string; plan: string; terms: boolean };

function validateSignup(v: SignupValues): Errors<SignupValues> {
  const e: Errors<SignupValues> = {};
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Enter a valid email';
  if (v.password.length < 8) e.password = 'At least 8 characters';
  if (!v.terms) e.terms = 'You must accept the terms';
  return e;
}

function Exercise1() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const form = useForm<SignupValues>({
    initialValues: { email: '', password: '', plan: 'free', terms: false },
    validate: validateSignup,
    onSubmit: async values => {
      await new Promise(r => setTimeout(r, 600));
      if (values.email.startsWith('fail')) throw new Error('Server rejected this email');
      setSubmitted(JSON.stringify(values));
    },
  });

  return (
    <section>
      <h2>Exercise 1 — useForm</h2>
      <form onSubmit={form.handleSubmit} noValidate style={card}>
        <div>
          <label>Email <input {...form.getFieldProps('email')} /></label>
          {form.showError('email') && <p id="email-error" role="alert" style={err}>{form.showError('email')}</p>}
        </div>
        <div>
          <label>Password <input type="password" {...form.getFieldProps('password')} /></label>
          {form.showError('password') && <p id="password-error" role="alert" style={err}>{form.showError('password')}</p>}
        </div>
        <div>
          <label>
            Plan{' '}
            <select {...form.getFieldProps('plan')}><option>free</option><option>pro</option></select>
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              name="terms"
              checked={form.values.terms}
              onChange={e => form.setValue('terms', e.target.checked)}
              onBlur={form.getFieldProps('terms').onBlur}
              aria-invalid={!!form.showError('terms')}
            />{' '}
            I accept the terms
          </label>
          {form.showError('terms') && <p role="alert" style={err}>{form.showError('terms')}</p>}
        </div>
        <button disabled={form.isSubmitting}>{form.isSubmitting ? 'Submitting…' : 'Sign up'}</button>{' '}
        <button type="button" onClick={form.reset}>Reset</button>
        {form.submitError && <p role="alert" style={err}>{form.submitError}</p>}
        <div style={muted}>valid: {String(form.isValid)} · dirty: {String(form.isDirty)} · (try an email starting with “fail”)</div>
      </form>
      {submitted && <pre style={{ ...card, fontSize: 12 }}>submitted: {submitted}</pre>}
    </section>
  );
}

// ─── Exercise 2: Context + <Form> / <Field> ──────────────────
//
// SITUATION
//   Fields repeat label / input / error / ids / ARIA. Put that in ONE Field
//   component that reads the form from Context.
//
// BUILD
//   Form({ form, children })   Provider + <form onSubmit={form.handleSubmit} noValidate>
//   useFormContext()           guarded; throws if outside <Form>
//   Field({ name, label, type })
//        <label htmlFor={name}> + <input id={name} type {...form.getFieldProps(name)}/>
//        + <p id={`${name}-error`} role="alert"> when form.showError(name)
//   Form.Submit({ children })  button disabled while submitting
//
// Then the profile form below should work with NO per-field code.

type AnyForm = FormApi<Record<string, string | boolean>>;
const FormContext = createContext<AnyForm | null>(null);

function useFormContext(): AnyForm {
  const ctx = useContext(FormContext);
  // TODO: throw a descriptive error when there is no <Form> above
  return ctx as AnyForm;
}

const FormRoot: FC<{ form: AnyForm; children: ReactNode }> = ({ form, children }) => {
  // TODO: provide the form via FormContext and render <form onSubmit={form.handleSubmit} noValidate>
  void form; void FormContext;
  return <form noValidate>{children}</form>;
};

const Field: FC<{ name: string; label: string; type?: string }> = ({ name, label, type = 'text' }) => {
  // TODO: const form = useFormContext(); label + input + error message
  void useFormContext;
  return <div><label>{label} <input name={name} type={type} /></label></div>;
};

const FormSubmit: FC<{ children: ReactNode }> = ({ children }) => {
  // TODO: read the form from context; disable while submitting
  return <button>{children}</button>;
};

const Form = Object.assign(FormRoot, { Submit: FormSubmit });

type ProfileValues = { first: string; last: string; email: string; phone: string; city: string; bio: string };

function Exercise2() {
  const [saved, setSaved] = useState<string | null>(null);
  const form = useForm<ProfileValues>({
    initialValues: { first: '', last: '', email: '', phone: '', city: '', bio: '' },
    validate: v => ({
      ...(!v.first && { first: 'First name is required' }),
      ...(!v.last && { last: 'Last name is required' }),
      ...(!/^\S+@\S+\.\S+$/.test(v.email) && { email: 'Enter a valid email' }),
    }),
    onSubmit: v => setSaved(`${v.first} ${v.last} <${v.email}>`),
  });
  return (
    <section>
      <h2>Exercise 2 — Context + Field</h2>
      <div style={card}>
        <Form form={form as unknown as AnyForm}>
          <Field name="first" label="First name" />
          <Field name="last" label="Last name" />
          <Field name="email" label="Email" type="email" />
          <Field name="phone" label="Phone" type="tel" />
          <Field name="city" label="City" />
          <Field name="bio" label="Bio" />
          <Form.Submit>Save profile</Form.Submit>
        </Form>
      </div>
      {saved && <p style={muted}>saved: {saved}</p>}
    </section>
  );
}

// ─── Exercise 3: Async Validation without the Race ───────────
//
// SITUATION
//   "Is this username taken?" Typing "a", "ad", "adm", "admin" fires several
//   requests that resolve in RANDOM order (200–1200 ms). A late response for
//   an OLD value must never overwrite the result for the CURRENT value.
//
// BUILD  useAsyncCheck(value, check, delay = 400): 'idle' | 'checking' | 'ok' | 'taken'
//   - empty value → 'idle'
//   - otherwise 'checking', then after `delay` ms of no changes call check(value)
//   - an `ignore` flag set in the effect CLEANUP prevents stale writes; clear the timer too
//
// TEST  Type "admin" quickly, then delete and type "sam". Watch the arrivals log:
//       responses arrive out of order, but the badge always reflects the CURRENT text.

const TAKEN = new Set(['admin', 'root', 'ada']);

function useAsyncCheck(
  value: string,
  check: (v: string) => Promise<boolean>,
  delay = 400,
): 'idle' | 'checking' | 'ok' | 'taken' {
  // TODO: useState + useEffect with debounce timer and an `ignore` flag
  void value; void check; void delay; void useEffect;
  return 'idle';
}

function Exercise3() {
  const [name, setName] = useState('');
  const [arrivals, setArrivals] = useState<string[]>([]);

  const check = useCallback(async (v: string) => {
    const latency = 200 + Math.random() * 1000;
    await new Promise(r => setTimeout(r, latency));
    const free = !TAKEN.has(v.toLowerCase());
    setArrivals(a => [`“${v}” answered after ${Math.round(latency)} ms → ${free ? 'free' : 'taken'}`, ...a].slice(0, 5));
    return free;
  }, []);

  const status = useAsyncCheck(name, check, 300);
  const badge = {
    idle: { text: '', color: '#64748b' },
    checking: { text: 'checking…', color: '#a16207' },
    ok: { text: '✓ available', color: '#15803d' },
    taken: { text: '✗ taken', color: '#b91c1c' },
  }[status];

  return (
    <section>
      <h2>Exercise 3 — Async Validation</h2>
      <label>
        Username <input value={name} onChange={e => setName(e.target.value)} placeholder="try admin, root, ada" />
      </label>{' '}
      <span style={{ color: badge.color }}>{badge.text}</span>
      <div style={{ ...card, minHeight: 60 }}>
        <div style={muted}>arrivals (newest first — note they can be out of order):</div>
        {arrivals.map((a, i) => <div key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>{a}</div>)}
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add `validateOn: 'change' | 'blur'` to useForm, or a `useFieldArray` for repeatable rows.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 8 } as const;
const err = { color: '#b91c1c', fontSize: 13, margin: '2px 0 6px' } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 19 — useForm</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
