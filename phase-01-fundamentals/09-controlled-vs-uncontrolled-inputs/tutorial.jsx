// ============================================================
// Topic:   Controlled vs Uncontrolled Inputs
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import { useState, useRef } from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// SIDE BY SIDE — Controlled vs Uncontrolled for the same search field
//
// Build the same "search field with live character count" using BOTH approaches.
// This makes the contrast concrete: where does the value live, and who reads it?
//
// ControlledSearch:
//   □ Uses useState for the input value
//   □ Shows a live character count below: "12 characters"
//   □ Shows a "Search" button that is DISABLED when the field is empty
//   □ On button click, shows: "Searching for: <value>"
//   □ The value is always available without reading the DOM
//
// UncontrolledSearch:
//   □ Uses useRef to hold a reference to the input DOM node
//   □ Uses defaultValue="" to seed it (NOT value)
//   □ The character count area shows "? characters" — you don't know the count until submit
//      (This is the limitation you're demonstrating)
//   □ On button click: reads ref.current.value and shows: "Searching for: <value>"
//   □ The "Search" button is always enabled (you can't easily check before submit)
//
// WHAT TO NOTICE:
//   - ControlledSearch: you have the value instantly, at any point, no DOM reading
//   - UncontrolledSearch: you only learn the value when you ask for it (on submit)
//   - The controlled version can enable/disable the button; uncontrolled can't easily

function ControlledSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);

  function handleOnClick() {
    setResult(query);
  }

  // TODO: implement
  // Hint: <input value={query} onChange={e => setQuery(e.target.value)} />
  return <>
    <input onChange={(e) => setQuery(e.target.value)} value={query} />
    <button disabled={query.trim().length === 0} onClick={handleOnClick}>search</button>
    <p>{query.length} characters</p>
    {result && <p>Searching for {result}</p>}
  </>
}

function UncontrolledSearch() {
  const inputRef = useRef(null);
  const [result, setResult] = useState(null);

  function handleSearch() {
    // TODO: read from ref.current.value
    setResult(inputRef.current.value);
  }

  // TODO: implement
  // Hint: <input ref={inputRef} defaultValue="" />
  return <>
    <input ref={inputRef} defaultValue="" />
    <button onClick={handleSearch}>search</button>
    <p>? characters</p>
    {result && <p>Searching for {result}</p>}
  </>
}

function Exercise1() {
  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <h4 style={{ margin: '0 0 0.5rem' }}>Controlled</h4>
        <ControlledSearch />
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <h4 style={{ margin: '0 0 0.5rem' }}>Uncontrolled</h4>
        <UncontrolledSearch />
      </div>
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// TRIGGER THE WARNING — "Changing an uncontrolled input to be controlled"
//
// This is the most common real-world controlled/uncontrolled bug.
// You're going to reproduce it intentionally, then fix it.
//
// PART A — Reproduce the warning (already set up):
//   The component below simulates async data loading.
//   Initially, `user` is null (data hasn't loaded yet).
//   After 2 seconds, `user` becomes { name: 'Osama', email: 'o@example.com' }.
//
//   The input uses: value={user?.name}
//   Before data loads:  user is null → user?.name is undefined → input is UNCONTROLLED
//   After data loads:   user.name is a string → input is CONTROLLED
//   React detects this transition and warns.
//
//   RUN THE APP. Open the browser console. After 2 seconds, you should see:
//   "Warning: A component is changing an uncontrolled input to be controlled."
//
// PART B — Fix it:
//   Change value={user?.name} to value={user?.name ?? ''}
//   The ?? '' ensures the value is always a string (empty until data loads).
//   The input stays controlled from the very first render.
//
//   Verify: reload the app. The warning should be gone.
//   Verify: the input starts empty and populates after 2 seconds.
//
// PART C — The other direction:
//   What if you wanted the input to start as uncontrolled (with defaultValue)
//   and never switch? When would that be the right choice?
//   Write your answer as a comment.

function Exercise2() {
  const [user, setUser] = useState(null);

  // Simulates async data load
  useState(() => {
    const timer = setTimeout(() => {
      setUser({ name: 'Osama', email: 'o@example.com' });
    }, 2000);
    return () => clearTimeout(timer);
  });

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
        Data loads after 2 seconds. Watch the console for the warning before fixing.
      </p>
      <label style={{ display: 'block', marginBottom: '0.25rem' }}>Name:</label>
      {/* BUG: value={user?.name} is undefined before data loads → uncontrolled
          FIX: value={user?.name ?? ''} → always a string → always controlled */}
      <input
        value={user?.name ?? ''}
        onChange={e => setUser(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Loading..."
        style={{ display: 'block', marginBottom: '0.5rem' }}
      />
      {user && <p style={{ color: '#22c55e' }}>Data loaded: {user.name}</p>}
      {/* PART C answer: when to prefer uncontrolled with defaultValue: when forms are large and we do not need state of every fields, for better performance and for third party integeration which have their own internal DOM */}
    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// REGISTRATION FORM — Controlled inputs with real-time validation
//
// Build a registration form. This is where controlled inputs shine:
// you have the value at all times, so you can validate live, conditionally
// enable the submit button, and reset programmatically.
//
// FIELDS:
//   username    — required, min 3 characters
//   email       — required, must contain @
//   password    — required, min 8 characters
//   confirm     — must match password
//
// BEHAVIOR:
//   □ Each field shows a red error message below it AFTER the user has blurred
//     (don't show errors before they've touched the field — use a "touched" flag per field)
//   □ The Submit button is disabled until ALL fields are valid (no need to touch first)
//   □ On submit: preventDefault, log the values, show "Registered!" and reset the form
//   □ "Reset" button clears all fields and touched flags back to initial state
//
// ARCHITECTURE:
//   Store form values in one state object: { username, email, password, confirm }
//   Store touched flags in another: { username, email, password, confirm }
//   Derive validation errors from values (not state) — don't store errors in state
//
// HINT for touched: onBlur on each input sets touched[fieldName] = true
//
// VALIDATION RULES (derive these, don't store them):
//   usernameError  = username.length < 3 ? 'Min 3 characters' : ''
//   emailError     = !email.includes('@') ? 'Enter a valid email' : ''
//   passwordError  = password.length < 8 ? 'Min 8 characters' : ''
//   confirmError   = confirm !== password ? 'Passwords do not match' : ''
//   isValid        = all four errors are empty strings

const INITIAL_VALUES = { username: '', email: '', password: '', confirm: '' };
const INITIAL_TOUCHED = { username: false, email: false, password: false, confirm: false };

// Helper component declared OUTSIDE Exercise3 so React preserves DOM nodes and focus across re-renders
function Field({ label, value, onChange, onBlur, error, showError, type = 'text' }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        style={{
          display: 'block',
          borderColor: showError ? '#ef4444' : '#cbd5e1',
          outline: 'none',
          padding: '6px 10px',
          borderRadius: 4,
          border: `1px solid ${showError ? '#ef4444' : '#cbd5e1'}`,
          width: '100%',
          maxWidth: 300,
        }}
      />
      {showError && (
        <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>{error}</p>
      )}
    </div>
  );
}

function Exercise3() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [touched, setTouched] = useState(INITIAL_TOUCHED);
  const [submitted, setSubmitted] = useState(false);

  // Helper: update one field
  function handleChange(field, value) {
    setValues(prev => ({ ...prev, [field]: value }));
  }

  // Helper: mark a field as touched on blur
  function handleBlur(field) {
    setTouched(prev => ({ ...prev, [field]: true }));
  }

  // TODO: derive all validation errors from values
  const usernameError = values.username.length < 3 ? 'Min 3 Characters' : '';  // implement
  const emailError = !values.email.includes('@') ? 'Enter a valid email' : '';    // implement
  const passwordError = values.password.length < 8 ? 'Min 8 characters' : ''; // implement
  const confirmError = values.confirm !== values.password ? 'Passwords do not match' : '';  // implement
  const isValid = !usernameError && !emailError && !passwordError && !confirmError;    // implement — true when all errors are ''

  const errors = {
    username: usernameError,
    email: emailError,
    password: passwordError,
    confirm: confirmError,
  };

  function handleSubmit(e) {
    e.preventDefault();
    console.log('Submitted values:', values);
    setSubmitted(true);
    setValues(INITIAL_VALUES);
    setTouched(INITIAL_TOUCHED);
  }

  function handleReset() {
    setValues(INITIAL_VALUES);
    setTouched(INITIAL_TOUCHED);
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div style={{ color: '#22c55e', fontWeight: 600 }}>
        ✓ Registered successfully!
        <button onClick={handleReset} style={{ marginLeft: '1rem', fontWeight: 'normal' }}>
          Register another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320 }}>
      <Field
        label="Username"
        value={values.username}
        onChange={e => handleChange('username', e.target.value)}
        onBlur={() => handleBlur('username')}
        error={errors.username}
        showError={touched.username && errors.username}
      />
      <Field
        label="Email"
        type="email"
        value={values.email}
        onChange={e => handleChange('email', e.target.value)}
        onBlur={() => handleBlur('email')}
        error={errors.email}
        showError={touched.email && errors.email}
      />
      <Field
        label="Password"
        type="password"
        value={values.password}
        onChange={e => handleChange('password', e.target.value)}
        onBlur={() => handleBlur('password')}
        error={errors.password}
        showError={touched.password && errors.password}
      />
      <Field
        label="Confirm Password"
        type="password"
        value={values.confirm}
        onChange={e => handleChange('confirm', e.target.value)}
        onBlur={() => handleBlur('confirm')}
        error={errors.confirm}
        showError={touched.confirm && errors.confirm}
      />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="submit" disabled={!isValid}>
          Register
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
        Submit is disabled until all fields are valid.
      </p>
    </form>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. value without onChange — the frozen input
//    Render: <input value="hello" />
//    Try to type in it. What happens? Check the console warning.
//    Then add readOnly to make the intent explicit.
//
// 2. File input — always uncontrolled
//    Add <input type="file" ref={fileRef} onChange={...} /> to a component.
//    In onChange, log fileRef.current.files[0].name.
//    Try adding value={something} — notice the browser ignores it (security).
//
// 3. Select + textarea
//    Build a controlled <select> (value on the <select> element, not <option>)
//    and a controlled <textarea> (value prop, not children).
//    Confirm they work the same way as controlled text inputs.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>Controlled vs Uncontrolled Inputs</h1>

      <h2>Exercise 1 — Side by side: controlled vs uncontrolled search</h2>
      <Exercise1 />

      <h2>Exercise 2 — Trigger and fix the controlled/uncontrolled warning</h2>
      <Exercise2 />

      <h2>Exercise 3 — Registration form with real-time validation</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
