// ============================================================
// Topic:   React Hook Form
// Phase:   8 — Forms
//
// REQUIRES: npm install react-hook-form
//
// APPROACH:
//   Exercise 1 — register + handleSubmit + errors (zero state, zero handlers)
//   Exercise 2 — conditional field driven by watch()
//   Exercise 3 — async submit lifecycle: isSubmitting, reset, setError
// ============================================================

import { useForm } from 'react-hook-form';

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 2 };
const errorStyle = { color: '#dc2626', fontSize: 12, margin: '2px 0 0' };

// ─── Exercise 1 ──────────────────────────────────────────────
// THE BASICS — register, handleSubmit, errors
//
// Build a sign-up form (username, email, password) using RHF.
// Notice: you write zero useState, zero onChange, zero onBlur.
//
// TODO:
//   □ Call useForm() and destructure: register, handleSubmit,
//     formState: { errors }, reset
//   □ Each input gets: {...register('fieldName', rules)}
//   □ The <form> gets: onSubmit={handleSubmit(onValid)}
//   □ Show errors.fieldName?.message below each input
//
// Validation rules:
//   username → required + minLength 3 +
//              validate: v => !/\s/.test(v) || 'No spaces allowed'
//   email    → required + pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
//   password → required + minLength: { value: 8, message: 'Min 8 characters' }
//
// WHAT TO NOTICE:
//   - Open React DevTools — the parent component does NOT re-render per keystroke
//   - Errors appear only after the first submit attempt (default mode: 'onSubmit')
//   - onValid receives a clean data object shaped exactly like what you registered

function Exercise1() {
  // TODO: call useForm() and destructure register, handleSubmit, formState: { errors }, reset
  // const { register, handleSubmit, formState: { errors }, reset } = useForm();

  function onValid(data) {
    console.log('Submitted:', data);
    alert(`Welcome, ${data.username}!`);
    // TODO: call reset() to clear the form after submit
  }

  return (
    // TODO: add onSubmit={handleSubmit(onValid)}
    <form style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="username">Username</label>
        {/* TODO: add {...register('username', { ... })} */}
        <input id="username" style={inputStyle} />
        {/* TODO: errors.username?.message */}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        {/* TODO: register email with required + pattern */}
        <input id="email" type="email" style={inputStyle} />
        {/* TODO: errors.email?.message */}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        {/* TODO: register password with required + minLength */}
        <input id="password" type="password" style={inputStyle} />
        {/* TODO: errors.password?.message */}
      </div>

      <button type="submit">Create account</button>
    </form>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// CONDITIONAL FIELDS — a checkbox drives what appears in the form
//
// Build a checkout shipping form:
//   □ A checkbox: "Ship to a different address?"
//   □ When checked → show a "Shipping address" text input (required)
//   □ When unchecked → hide it (and don't validate it)
//
// TODO:
//   □ Register the checkbox with register('differentAddress')
//   □ Call watch('differentAddress') — its value re-renders the component
//   □ Conditionally render the address input only when the checkbox is true
//   □ Register the address field with { required: 'Shipping address is required' }
//     only inside the conditional block (so it registers/unregisters with the DOM)
//
// WHAT TO NOTICE:
//   - watch() causes a re-render when 'differentAddress' changes — only this component
//   - When the address input is hidden, it's unregistered — it won't appear in the
//     submitted data and won't be validated
//   - Submit while checkbox is unchecked → no address field in the logged object
//   - Check it, leave address empty, submit → you get the required error

function Exercise2() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { differentAddress: false, shippingAddress: '' },
  });

  // TODO: call watch('differentAddress') to get the live checkbox value
  const differentAddress = false; // replace with watch(...)

  function onValid(data) {
    console.log('Order placed:', data);
    alert(JSON.stringify(data, null, 2));
  }

  return (
    <form onSubmit={handleSubmit(onValid)} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>
          {/* TODO: spread {...register('differentAddress')} */}
          <input type="checkbox" />
          {' '}Ship to a different address?
        </label>
      </div>

      {/* TODO: only render this block when differentAddress is true */}
      <div style={{ paddingLeft: 16, borderLeft: '3px solid #e5e7eb' }}>
        <label htmlFor="shippingAddress">Shipping address</label>
        <input
          id="shippingAddress"
          placeholder="123 Main St, City, State"
          style={inputStyle}
          {...register('shippingAddress', { required: 'Shipping address is required' })}
        />
        {errors.shippingAddress && (
          <p style={errorStyle}>{errors.shippingAddress.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="notes">Order notes (optional)</label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <button type="submit">Place order</button>
    </form>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// ASYNC SUBMIT LIFECYCLE — isSubmitting, reset, setError
//
// Simulate an async profile update (pre-populated with user data):
//   □ Form is pre-filled via defaultValues — no useEffect needed
//   □ Submit button shows "Saving…" while isSubmitting is true
//   □ Button is disabled when isSubmitting OR the form hasn't changed (isDirty)
//   □ On success: call reset(savedData) so the submitted values become
//     the new baseline (isDirty resets to false)
//   □ On failure (30% chance): inject a server error onto the email field
//     using setError('email', { type: 'server', message: 'Email already taken' })
//
// TODO — three spots marked below
//
// WHAT TO NOTICE:
//   - isSubmitting is true only for the duration of your async onValid function
//   - reset(data) makes the submitted values the new defaultValues — isDirty resets
//   - setError writes into the same errors object the UI already reads
//   - Server errors look exactly the same as validation errors to the user

const FAKE_USER = {
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  bio: 'Computing pioneer',
};

function fakeApiSave(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Math.random() < 0.3
        ? reject(new Error('Email already taken'))
        : resolve(data);
    }, 1500);
  });
}

function Exercise3() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ defaultValues: FAKE_USER });

  async function onValid(data) {
    try {
      const saved = await fakeApiSave(data);
      // TODO: call reset(saved) so saved values become the new baseline
      alert('Profile saved!');
    } catch (err) {
      // TODO: call setError('email', { type: 'server', message: err.message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          {...register('displayName', { required: 'Required' })}
          style={inputStyle}
        />
        {errors.displayName && <p style={errorStyle}>{errors.displayName.message}</p>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email', { required: 'Required' })}
          style={inputStyle}
        />
        {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          {...register('bio')}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* TODO: disabled when isSubmitting OR !isDirty */}
      <button type="submit" disabled={isSubmitting}>
        {/* TODO: show "Saving…" when isSubmitting */}
        Save profile
      </button>

      {!isDirty && (
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>No unsaved changes</p>
      )}
    </form>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas:
//   - Change useForm({ mode: 'onTouched' }) and watch how error timing changes
//   - Use Controller to wrap a <select> styled with custom CSS
//   - Try getValues() vs watch() — add console.log inside a button click handler
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 480 }}>
      <h1>React Hook Form</h1>

      <h2>Exercise 1 — register + handleSubmit + errors</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Conditional Field with watch()</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — Async Submit Lifecycle</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
