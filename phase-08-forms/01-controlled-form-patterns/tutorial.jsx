// ============================================================
// Topic:   Controlled Form Patterns
// Phase:   8 — Forms
//
// APPROACH:
//   Exercise 1 — build a multi-field form with ONE onChange handler
//   Exercise 2 — find and fix three controlled-input bugs
//   Exercise 3 — derive UI state (counter, disabled button) from values
// ============================================================

import { useState } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// BUILD IT — The single-handler pattern
//
// Build a sign-up form with these five fields:
//   • username   (text)
//   • email      (email)
//   • password   (password)
//   • role       (select: 'viewer' | 'editor' | 'admin')
//   • newsletter (checkbox)
//
// Rules:
//   □ Use ONE handleChange for ALL five inputs (no per-field handlers)
//   □ Hint: const { name, value, type, checked } = e.target
//           [name]: type === 'checkbox' ? checked : value
//   □ Submit button disabled until username, email, password are filled
//     (derive this — no useEffect)
//   □ On submit: log the state object, then reset to INITIAL_STATE
//
// WHAT TO NOTICE after it works:
//   - Adding a new field = one line in INITIAL_STATE + one input tag
//   - handleChange never changes regardless of how many fields you add
//   - Watch the <pre> update live — React owns every character

const INITIAL_STATE = {
  username: '',
  email: '',
  password: '',
  role: 'viewer',
  newsletter: false,
};

function Exercise1() {
  const [fields, setFields] = useState(INITIAL_STATE);

  // TODO: one handler that works for text, email, password, select, AND checkbox
  function handleChange(e) {
    // ...
  }

  // TODO: prevent default, log fields, reset to INITIAL_STATE
  function handleSubmit(e) {
    // ...
  }

  // TODO: replace false — username AND email AND password must be non-empty strings
  const isValid = false;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
      {/* TODO: render all 5 inputs / select / checkbox using handleChange
               Checkboxes need: checked={fields.newsletter}
               <select> needs: value={fields.role} on the <select> element, not <option> */}

      <button type="submit" disabled={!isValid}>Create account</button>
      <pre style={{ marginTop: 8, fontSize: 12, background: '#f3f4f6', padding: 8 }}>
        {JSON.stringify(fields, null, 2)}
      </pre>
    </form>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// BREAK THEN FIX — Three controlled-input bugs
//
// The component below has THREE bugs. Read the code, run it,
// observe the broken behaviour, then fix each one.
//
// Bug 1: age field triggers a React warning on first render.
//        Why? Check how `fields.age` is initialised.
//
// Bug 2: terms checkbox is permanently frozen — clicking does nothing.
//        Why? Checkboxes need `checked`, not `value`.
//
// Bug 3: country select appears to change but the state shown in <pre>
//        never reflects the correct selected option.
//        Why? A controlled <select> needs `value` on the <select> element.
//
// Fix all three without changing the form's structure.
// After fixing, confirm all three fields update in the <pre> below.

function BrokenForm() {
  const [fields, setFields] = useState({
    age: undefined,   // BUG 1 — should be '' (or 0)
    terms: false,
    country: 'us',
  });

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  return (
    <form style={{ display: 'grid', gap: 8 }}>
      {/* BUG 1: value={undefined} makes React treat this as uncontrolled */}
      <label>
        Age:
        <input
          type="number"
          name="age"
          value={fields.age}
          onChange={handleChange}
        />
      </label>

      {/* BUG 2: checkbox needs `checked`, not `value` */}
      <label>
        <input
          type="checkbox"
          name="terms"
          value={fields.terms}
          onChange={handleChange}
        />
        {' '}Accept terms
      </label>

      {/* BUG 3: <select> is missing the prop that controls the displayed option */}
      <label>
        Country:
        <select name="country" onChange={handleChange}>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
          <option value="ca">Canada</option>
        </select>
      </label>

      <pre style={{ fontSize: 12, background: '#f3f4f6', padding: 8 }}>
        {JSON.stringify(fields, null, 2)}
      </pre>
    </form>
  );
}

function Exercise2() {
  return (
    <div>
      <p style={{ color: '#b45309', fontWeight: 600, margin: '0 0 8px' }}>
        ⚠ Find and fix 3 bugs below ↓
      </p>
      <BrokenForm />
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// DERIVED STATE — Live character counter and gated submit
//
// Build a bio textarea where all UI feedback is derived from the value:
//   □ A live counter: "X / 200" — updates on every keystroke
//   □ Counter turns red when the user has typed more than 180 characters
//   □ Submit button is disabled until at least 20 characters are typed
//   □ "Reset" button clears the textarea
//
// Rules:
//   □ Zero useEffect — all calculations happen in the render body
//   □ maxLength={200} on the textarea prevents typing past 200
//
// WHAT TO NOTICE:
//   - You derive the counter value, warning colour, and disabled state
//     all in one render pass — no side effects, no sync problems
//   - This is the core payoff of controlled inputs: state IS the source of truth,
//     so you can compute anything from it instantly

function Exercise3() {
  const [bio, setBio] = useState('');

  // Derived values — no useState, no useEffect
  const charCount = bio.length;
  const isOverWarning = charCount > 180;
  const canSubmit = charCount >= 20;

  return (
    <div>
      <label htmlFor="bio" style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
        Bio
      </label>
      {/* TODO: add value={bio} and onChange={e => setBio(e.target.value)} */}
      <textarea
        id="bio"
        rows={4}
        maxLength={200}
        placeholder="Tell us about yourself (20–200 characters)…"
        style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
      />

      {/* TODO: replace the static "0 / 200" with charCount,
               change text colour when isOverWarning is true */}
      <p style={{ fontSize: 12, color: isOverWarning ? '#dc2626' : '#6b7280', margin: '4px 0' }}>
        0 / 200
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => setBio('')}>
          Reset
        </button>
        {/* TODO: remove the hard-coded `disabled` — use !canSubmit */}
        <button type="button" disabled>
          Save bio
        </button>
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Experiment freely. Some ideas:
//   - What happens when you write value="fixed" with no onChange?
//   - Build a <select multiple> and store an array in state
//   - Try initialising a field as null — what warning does React log?
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 500 }}>
      <h1>Controlled Form Patterns</h1>

      <h2>Exercise 1 — Single onChange Handler</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Break Then Fix (3 bugs)</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — Derived State</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
