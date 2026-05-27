// ============================================================
// Topic:   Formik
// Phase:   8 — Forms
//
// REQUIRES: npm install formik yup
//
// APPROACH:
//   Exercise 1 — useFormik + manual validate fn + getFieldProps
//   Exercise 2 — swap validate fn for a Yup validationSchema
//   Exercise 3 — <Formik> component API + useFormikContext (no prop drilling)
// ============================================================

import { useFormik, Formik, Form, Field, ErrorMessage, useFormikContext } from 'formik';
import * as Yup from 'yup';

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 2 };
const errorStyle = { color: '#dc2626', fontSize: 12, margin: '2px 0 0' };

// ─── Exercise 1 ──────────────────────────────────────────────
// useFormik — wire everything manually
//
// Build a login form (email + password) using the low-level useFormik hook.
//
// TODO:
//   □ Pass initialValues: { email: '', password: '' }
//   □ Write a validate(values) function:
//       - email must contain '@' → 'Valid email required'
//       - password must be 8+ chars → 'Min 8 characters'
//       Return the errors object (empty = valid)
//   □ Write onSubmit(values, { resetForm }):
//       Log values, alert 'Login successful!', then call resetForm()
//   □ Wire each input with {...formik.getFieldProps('fieldName')}
//     (This spreads: name, value, onChange, onBlur — all wired)
//   □ Show an error only when formik.touched[field] && formik.errors[field]
//
// WHAT TO NOTICE:
//   - getFieldProps also spreads onBlur, so `touched` populates automatically
//   - Formik re-renders the component on every keystroke (controlled inputs)
//   - The touched guard means errors stay hidden until the user leaves the field

function Exercise1() {
  const formik = useFormik({
    initialValues: { email: '', password: '' },
    // TODO: add validate function
    // TODO: add onSubmit
  });

  return (
    <form onSubmit={formik.handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="ex1-email">Email</label>
        <input
          id="ex1-email"
          type="email"
          style={inputStyle}
          // TODO: {...formik.getFieldProps('email')}
        />
        {/* TODO: formik.touched.email && formik.errors.email */}
      </div>

      <div>
        <label htmlFor="ex1-password">Password</label>
        <input
          id="ex1-password"
          type="password"
          style={inputStyle}
          // TODO: {...formik.getFieldProps('password')}
        />
        {/* TODO: formik.touched.password && formik.errors.password */}
      </div>

      <button type="submit" disabled={formik.isSubmitting}>
        {formik.isSubmitting ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// Yup validationSchema — replace the manual validate fn
//
// The manual `validate` function works, but doesn't scale.
// Yup gives you composable, declarative rules that read like documentation.
//
// TODO:
//   □ Complete loginSchema below with:
//       email    → Yup.string().email('Invalid email').required('Required')
//       password → Yup.string().min(8, 'Min 8 characters').required('Required')
//   □ Pass it to useFormik as `validationSchema: loginSchema`
//     (remove `validate` — Formik runs the schema automatically)
//
// BONUS: Add a `username` field to the schema and the form.
//   Notice: the handler and form structure don't change — only schema + JSX.
//
// WHAT TO NOTICE:
//   - Error messages come from Yup now — you configure them once in the schema
//   - Yup validates on every blur by default with Formik
//   - The validate fn is gone but the behaviour is identical to Exercise 1

const loginSchema = Yup.object({
  // TODO: define email and password rules
});

function Exercise2() {
  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit(values, { resetForm }) {
      console.log('Submitted:', values);
      alert('Login successful!');
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="ex2-email">Email</label>
        <input
          id="ex2-email"
          type="email"
          {...formik.getFieldProps('email')}
          style={inputStyle}
        />
        {formik.touched.email && formik.errors.email && (
          <p style={errorStyle}>{formik.errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="ex2-password">Password</label>
        <input
          id="ex2-password"
          type="password"
          {...formik.getFieldProps('password')}
          style={inputStyle}
        />
        {formik.touched.password && formik.errors.password && (
          <p style={errorStyle}>{formik.errors.password}</p>
        )}
      </div>

      <button type="submit" disabled={formik.isSubmitting}>Log in</button>
    </form>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// <Formik> component API + useFormikContext
//
// The useFormik hook is the low-level API — you wire everything manually.
// The <Formik> component puts form state into React context, so any
// descendant can access it with useFormikContext — no prop drilling.
//
// TODO — implement SubmitButton (a separate component):
//   □ Call useFormikContext() to get { isSubmitting, isValid, dirty }
//   □ Disable the button when: isSubmitting OR !isValid OR !dirty
//   □ Show "Saving…" text while isSubmitting, else "Save profile"
//   □ DO NOT pass any of these as props — read them from context
//
// The rest of the form is already wired below using <Field> and <ErrorMessage>.
// Read through it to understand the <Formik> component API.
//
// WHAT TO NOTICE:
//   - SubmitButton has no props at all — context gives it everything it needs
//   - <Form> auto-wires to Formik's handleSubmit
//   - <Field name="..."> is a pre-wired input (no getFieldProps needed)
//   - <ErrorMessage> renders only when the field is touched AND invalid

const profileSchema = Yup.object({
  displayName: Yup.string().min(2, 'Min 2 characters').required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  website: Yup.string().url('Must be a valid URL').notRequired(),
});

// TODO: implement this component — it must not receive any props
function SubmitButton() {
  const { isSubmitting, isValid, dirty } = useFormikContext();
  // TODO: disabled={isSubmitting || !isValid || !dirty}
  // TODO: text "Saving…" / "Save profile"
  return <button type="submit">Save profile (implement me)</button>;
}

function Exercise3() {
  return (
    <Formik
      initialValues={{ displayName: 'Ada Lovelace', email: 'ada@example.com', website: '' }}
      validationSchema={profileSchema}
      onSubmit={async (values, { setSubmitting }) => {
        await new Promise(r => setTimeout(r, 1500));
        console.log('Saved:', values);
        alert('Profile saved!');
        setSubmitting(false);
        // Note: no resetForm — user stays on the page with their saved data
      }}
    >
      <Form style={{ display: 'grid', gap: 12 }}>
        <div>
          <label htmlFor="displayName">Display name</label>
          <Field id="displayName" name="displayName" style={inputStyle} />
          <ErrorMessage name="displayName">
            {msg => <p style={errorStyle}>{msg}</p>}
          </ErrorMessage>
        </div>

        <div>
          <label htmlFor="profileEmail">Email</label>
          <Field id="profileEmail" name="email" type="email" style={inputStyle} />
          <ErrorMessage name="email">
            {msg => <p style={errorStyle}>{msg}</p>}
          </ErrorMessage>
        </div>

        <div>
          <label htmlFor="website">Website (optional)</label>
          <Field id="website" name="website" type="url" placeholder="https://…" style={inputStyle} />
          <ErrorMessage name="website">
            {msg => <p style={errorStyle}>{msg}</p>}
          </ErrorMessage>
        </div>

        {/* SubmitButton reads form state from context — no props needed */}
        <SubmitButton />
      </Form>
    </Formik>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas:
//   - Add a server-side error: in onSubmit, call setErrors({ email: 'Taken' })
//   - Use <Field as="select"> and <Field as="textarea"> — same pattern, different element
//   - Compare re-renders: add a console.log at the top of Exercise1 and Exercise3
//     — Formik re-renders more often than RHF. Can you measure it?
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 480 }}>
      <h1>Formik</h1>

      <h2>Exercise 1 — useFormik + manual validate</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Yup validationSchema</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — Component API + useFormikContext</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
