// ============================================================
// Topic:   Form Validation Strategies
// Phase:   8 — Forms
//
// APPROACH:
//   Exercise 1 — on-submit validation (errors only on submit)
//   Exercise 2 — on-blur with touched tracking (errors after leaving a field)
//   Exercise 3 — hybrid strategy + ARIA accessibility (production pattern)
//
// All three exercises use the same form and the same validate() function.
// The difference is WHEN errors become visible — that's the whole lesson.
// ============================================================

import { useState } from 'react';

// ─── Shared pure validator ────────────────────────────────────
// Returns an object of error strings keyed by field name.
// Called synchronously — no state, no side effects.
function validate(values) {
  const errs = {};
  if (!values.name.trim())            errs.name     = 'Name is required';
  if (!values.email.includes('@'))    errs.email    = 'Valid email required';
  if (values.password.length < 8)     errs.password = 'Min 8 characters';
  return errs;
}

const INITIAL = { name: '', email: '', password: '' };

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 2 };
const errorStyle = { color: '#dc2626', fontSize: 12, margin: '2px 0 0' };

// ─── Exercise 1 ──────────────────────────────────────────────
// ON-SUBMIT — errors appear only when the user hits submit
//
// Implement the three TODOs below:
//   □ In handleSubmit: run validate(), store errors in state
//     If no errors, alert 'Submitted!' and reset the form
//   □ Render errors[field] beneath each input
//     (errors is {} at first — nothing shows until submit)
//
// WHAT TO NOTICE after it works:
//   - Fill in nothing and submit — all errors appear at once
//   - The form is completely clean until that first submit click
//   - Fix one field and submit again — only that field's error clears
//   - This strategy gives zero feedback while typing (worst UX for long forms)

function Exercise1() {
  const [fields, setFields] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: run validate(fields), store result in errors state
    // If Object.keys(errs).length === 0 → alert('Submitted!') + reset
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>Name</label>
        <input name="name" value={fields.name} onChange={handleChange} style={inputStyle} />
        {/* TODO: render errors.name when it exists */}
      </div>
      <div>
        <label>Email</label>
        <input name="email" type="email" value={fields.email} onChange={handleChange} style={inputStyle} />
        {/* TODO: render errors.email */}
      </div>
      <div>
        <label>Password</label>
        <input name="password" type="password" value={fields.password} onChange={handleChange} style={inputStyle} />
        {/* TODO: render errors.password */}
      </div>
      <button type="submit">Sign up</button>
    </form>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// ON-BLUR + TOUCHED — errors appear when you leave a field
//
// Key insight: errors are DERIVED (recalculated every render from field values),
// not stored. This prevents the classic stale-error bug.
//
// TODO:
//   □ Implement handleBlur: mark e.target.name as touched in state
//   □ showError(name): return true only when touched[name] && errors[name]
//   □ Add onBlur={handleBlur} to each input
//
// WHAT TO NOTICE:
//   - Tab through all fields without typing — each error appears as you leave
//   - Start typing into an errored field — the error disappears immediately
//     because errors is recalculated live on every render
//   - `errors` never goes stale — it's always derived from the latest values

function Exercise2() {
  const [fields, setFields] = useState(INITIAL);
  const [touched, setTouched] = useState({});

  // Derived — computed fresh on every render, always in sync
  const errors = validate(fields);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  }

  // TODO: mark e.target.name as touched
  function handleBlur(_e) {
    // setTouched(prev => ({ ...prev, [_e.target.name]: true }));
  }

  // TODO: return true only when both conditions hold
  const showError = (_name) => false;

  return (
    <form onSubmit={e => e.preventDefault()} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>Name</label>
        <input
          name="name"
          value={fields.name}
          onChange={handleChange}
          onBlur={handleBlur}
          style={inputStyle}
        />
        {showError('name') && <p style={errorStyle}>{errors.name}</p>}
      </div>
      <div>
        <label>Email</label>
        <input
          name="email"
          type="email"
          value={fields.email}
          onChange={handleChange}
          onBlur={handleBlur}
          style={inputStyle}
        />
        {showError('email') && <p style={errorStyle}>{errors.email}</p>}
      </div>
      <div>
        <label>Password</label>
        <input
          name="password"
          type="password"
          value={fields.password}
          onChange={handleChange}
          onBlur={handleBlur}
          style={inputStyle}
        />
        {showError('password') && <p style={errorStyle}>{errors.password}</p>}
      </div>
      <button type="submit">Sign up</button>
    </form>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// HYBRID + ACCESSIBILITY — the production pattern
//
// You already have the hybrid strategy from Exercise 2!
// The derived errors + touched guard naturally gives you:
//   • No error while typing for the first time (clean slate)
//   • Error appears when you leave the field (blur)
//   • Error updates live as you correct it (because errors is derived)
//
// What's missing: ARIA accessibility.
// Screen reader users need to know which fields are invalid and what the error is.
//
// TODO — for each field input, add:
//   □ aria-invalid={showError(name) ? 'true' : 'false'}
//   □ aria-describedby={showError(name) ? `${name}-error` : undefined}
//
// TODO — for each error <p>, add:
//   □ id={`${name}-error`}
//   □ role="alert"   ← announces to screen readers immediately when it appears
//
// TODO — submit button:
//   □ disabled when any field is invalid (use Object.keys(errors).length > 0)
//   □ Show "Fix errors above" vs "Sign up" based on validity
//
// WHAT TO NOTICE:
//   - The ARIA attributes don't change the visual — they're for screen readers
//   - role="alert" causes the error to be announced the moment it renders
//   - The submit button enables the instant the last error clears

function Exercise3() {
  const [fields, setFields] = useState(INITIAL);
  const [touched, setTouched] = useState({});

  const errors = validate(fields);
  const isFormValid = Object.keys(errors).length === 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  }

  function handleBlur(e) {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  }

  const showError = (name) => !!(touched[name] && errors[name]);

  const fieldConfig = [
    { name: 'name',     label: 'Name',     type: 'text' },
    { name: 'email',    label: 'Email',    type: 'email' },
    { name: 'password', label: 'Password', type: 'password' },
  ];

  return (
    <form onSubmit={e => e.preventDefault()} style={{ display: 'grid', gap: 12 }}>
      {fieldConfig.map(({ name, label, type }) => (
        <div key={name}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            type={type}
            value={fields[name]}
            onChange={handleChange}
            onBlur={handleBlur}
            style={inputStyle}
            // TODO: aria-invalid={showError(name) ? 'true' : 'false'}
            // TODO: aria-describedby={showError(name) ? `${name}-error` : undefined}
          />
          {showError(name) && (
            <p style={errorStyle}>
              {/* TODO: id={`${name}-error`} role="alert" */}
              {errors[name]}
            </p>
          )}
        </div>
      ))}

      <button type="submit" disabled={!isFormValid}>
        {isFormValid ? 'Sign up ✓' : 'Fix errors above'}
      </button>
    </form>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas to explore:
//   - What does "on-change" validation look like?
//     Remove the touched guard — errors show immediately on every keystroke
//   - Add an async username-availability check using setTimeout in a useEffect
//   - Try aria-live="polite" vs role="alert" — what's the screen reader difference?
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 480 }}>
      <h1>Form Validation Strategies</h1>

      <h2>Exercise 1 — On-Submit Validation</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — On-Blur + Touched Tracking</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — Hybrid Strategy + ARIA</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
