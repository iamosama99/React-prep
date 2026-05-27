// ============================================================
// Topic:   Multi-Step / Wizard Forms
// Phase:   8 — Forms
//
// APPROACH:
//   Exercise 1 — 2-step wizard: state accumulation across steps
//   Exercise 2 — diagnose & fix data loss when navigating Back
//   Exercise 3 — 3-step wizard with step indicator + per-step validation
// ============================================================

import { useState } from 'react';

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 2 };
const errorStyle = { color: '#dc2626', fontSize: 12, margin: '2px 0 0' };

// ─── Exercise 1 ──────────────────────────────────────────────
// 2-STEP WIZARD — accumulate state across steps
//
// Build a 2-step account creation flow:
//
//   Step 0 — Account:   email, password
//   Step 1 — Profile:   firstName, lastName, bio
//
// The wizard parent holds ALL the data in one state object.
// Each step receives its slice of data and an onNext callback.
//
// TODO:
//   □ In WizardParent, initialise formData with all five fields as ''
//   □ Implement handleNext(stepData):
//       merge stepData into formData (spread both), then advance step
//   □ Implement handleBack():
//       decrement step — DO NOT clear formData
//   □ Pass defaultValues={formData} to each step so pre-fill works on Back
//   □ On the last step: call handleSubmit(stepData) which merges + logs
//
// WHAT TO NOTICE:
//   - Fill out Step 0, go Next, then click Back
//   - Step 0 should be pre-filled with your earlier input
//   - The parent <pre> shows accumulated data growing after each Next

function AccountStep({ defaultValues, onNext }) {
  const [fields, setFields] = useState({
    email:    defaultValues.email    || '',
    password: defaultValues.password || '',
  });

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fields.email || !fields.password) return;
    onNext(fields);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>Email</label>
        <input name="email" type="email" value={fields.email} onChange={handleChange} style={inputStyle} />
      </div>
      <div>
        <label>Password</label>
        <input name="password" type="password" value={fields.password} onChange={handleChange} style={inputStyle} />
      </div>
      <button type="submit">Next →</button>
    </form>
  );
}

function ProfileStep({ defaultValues, onNext, onBack }) {
  const [fields, setFields] = useState({
    firstName: defaultValues.firstName || '',
    lastName:  defaultValues.lastName  || '',
    bio:       defaultValues.bio       || '',
  });

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fields.firstName || !fields.lastName) return;
    onNext(fields);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>First name</label>
        <input name="firstName" value={fields.firstName} onChange={handleChange} style={inputStyle} />
      </div>
      <div>
        <label>Last name</label>
        <input name="lastName" value={fields.lastName} onChange={handleChange} style={inputStyle} />
      </div>
      <div>
        <label>Bio (optional)</label>
        <textarea name="bio" value={fields.bio} onChange={handleChange} rows={2} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onBack}>← Back</button>
        <button type="submit">Create account ✓</button>
      </div>
    </form>
  );
}

function Exercise1() {
  const [step, setStep] = useState(0);
  // TODO: initialise formData with all five fields as empty strings
  const [formData, setFormData] = useState({});

  // TODO: merge stepData into formData, advance step
  function handleNext(stepData) {
    setStep(s => s + 1);
  }

  // TODO: decrement step — DO NOT clear formData
  function handleBack() {
    setStep(s => s - 1);
  }

  function handleSubmit(finalStepData) {
    const payload = { ...formData, ...finalStepData };
    console.log('Final payload:', payload);
    alert('Account created!\n' + JSON.stringify(payload, null, 2));
    setStep(0);
    setFormData({});
  }

  return (
    <div>
      <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 12px' }}>
        Step {step + 1} of 2: {step === 0 ? 'Account' : 'Profile'}
      </p>

      {step === 0 && (
        <AccountStep
          defaultValues={formData}
          onNext={handleNext}
        />
      )}
      {step === 1 && (
        <ProfileStep
          defaultValues={formData}
          onNext={handleSubmit}
          onBack={handleBack}
        />
      )}

      <pre style={{ marginTop: 16, fontSize: 12, background: '#f3f4f6', padding: 8 }}>
        Accumulated: {JSON.stringify(formData, null, 2)}
      </pre>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// DIAGNOSE & FIX — the data-loss bug
//
// The wizard below has a bug: going Back wipes the data from Step 0.
// This is the most common wizard mistake.
//
// Step 1 — Read the code and understand WHY the data is lost.
//   Hint: look at what handleBack does to formData and at how
//   AccountStep initialises its own local state.
//
// Step 2 — Run the buggy wizard:
//   Fill in email + password → Next → Back
//   Observe: Step 0 fields are empty!
//
// Step 3 — Fix it with the smallest possible change.
//   You should NOT change AccountStep or ProfileStep.
//   The fix is entirely in the parent (BuggyWizard).
//
// WHAT TO NOTICE after fixing:
//   - AccountStep initialises from defaultValues — but only on mount
//   - So defaultValues must carry the correct data when AccountStep mounts
//   - If you clear formData on Back, AccountStep sees empty defaults

function BuggyAccountStep({ defaultValues, onNext }) {
  // Each step has its own local state, initialised from defaultValues on mount
  const [fields, setFields] = useState({
    email:    defaultValues.email    || '',
    password: defaultValues.password || '',
  });

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onNext(fields); }} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>Email</label>
        <input name="email" type="email" value={fields.email} onChange={handleChange} style={inputStyle} />
      </div>
      <div>
        <label>Password</label>
        <input name="password" type="password" value={fields.password} onChange={handleChange} style={inputStyle} />
      </div>
      <button type="submit">Next →</button>
    </form>
  );
}

function BuggyProfileStep({ defaultValues, onBack, onSubmit }) {
  const [fields, setFields] = useState({
    firstName: defaultValues.firstName || '',
    lastName:  defaultValues.lastName  || '',
  });

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(fields); }} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>First name</label>
        <input name="firstName" value={fields.firstName} onChange={handleChange} style={inputStyle} />
      </div>
      <div>
        <label>Last name</label>
        <input name="lastName" value={fields.lastName} onChange={handleChange} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onBack}>← Back</button>
        <button type="submit">Submit</button>
      </div>
    </form>
  );
}

function BuggyWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});

  function handleNext(stepData) {
    setFormData(prev => ({ ...prev, ...stepData }));
    setStep(1);
  }

  // BUG: this clears formData — so AccountStep re-mounts with empty defaultValues
  function handleBack() {
    setFormData({});   // ← fix this
    setStep(0);
  }

  function handleSubmit(finalStepData) {
    const payload = { ...formData, ...finalStepData };
    alert('Submitted: ' + JSON.stringify(payload, null, 2));
    setStep(0);
    setFormData({});
  }

  return (
    <div>
      <p style={{ color: '#dc2626', fontWeight: 600, margin: '0 0 8px' }}>
        ⚠ Fill Step 0 → Next → Back → observe data loss → fix it
      </p>
      <p style={{ fontWeight: 600, color: '#6b7280', margin: '0 0 12px' }}>
        Step {step + 1} of 2
      </p>
      {step === 0 && (
        <BuggyAccountStep defaultValues={formData} onNext={handleNext} />
      )}
      {step === 1 && (
        <BuggyProfileStep defaultValues={formData} onBack={handleBack} onSubmit={handleSubmit} />
      )}
    </div>
  );
}

function Exercise2() {
  return <BuggyWizard />;
}

// ─── Exercise 3 ──────────────────────────────────────────────
// FULL WIZARD — step indicator + per-step validation + final review
//
// Build a 3-step wizard: Account → Preferences → Review & Submit
//
// TODO:
//   □ Implement StepIndicator: shows step labels, marks completed steps with ✓,
//     highlights current step — use aria-current="step" on the active item
//   □ PreferencesStep: theme (select: 'light'|'dark'|'system') + notifications (checkbox)
//   □ ReviewStep: shows all accumulated formData in a summary table
//     with an "Edit" link per section (just alert which section for now)
//     and a final "Submit" button that logs the payload
//   □ Per-step required-field check before allowing Next
//     (account: email + password; preferences: theme always valid)
//
// The AccountStep and ProfileStep from Exercise 1 can be reused.
//
// WHAT TO NOTICE:
//   - Each step component is self-contained — knows nothing about step count
//   - The parent orchestrates: which step shows, data accumulation, navigation
//   - The review step is read-only — it renders state, not form fields

const STEPS = ['Account', 'Preferences', 'Review'];

function StepIndicator({ steps, current }) {
  // TODO: render an <ol> where each <li> shows the step number + label
  // - completed steps (index < current) show a ✓ after the label
  // - the current step has aria-current="step" and a visual highlight
  return (
    <ol style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
      {steps.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          style={{
            fontWeight: i === current ? 700 : 400,
            color: i === current ? '#2563eb' : i < current ? '#16a34a' : '#9ca3af',
          }}
        >
          {i + 1}. {label}{i < current ? ' ✓' : ''}
        </li>
      ))}
    </ol>
  );
}

function PreferencesStep({ defaultValues, onNext, onBack }) {
  const [fields, setFields] = useState({
    theme:         defaultValues.theme         || 'system',
    notifications: defaultValues.notifications ?? true,
  });

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    setFields(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onNext(fields); }} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>Theme</label>
        <select name="theme" value={fields.theme} onChange={handleChange} style={inputStyle}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            name="notifications"
            checked={fields.notifications}
            onChange={handleChange}
          />
          {' '}Enable email notifications
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onBack}>← Back</button>
        <button type="submit">Next →</button>
      </div>
    </form>
  );
}

function ReviewStep({ formData, onBack, onSubmit }) {
  // TODO: render a summary of ALL formData fields
  // Group them by section (Account, Preferences) for readability
  // Include a Submit button that calls onSubmit(formData)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Review your information</h3>

      <table style={{ borderCollapse: 'collapse', fontSize: 14, width: '100%' }}>
        <tbody>
          {Object.entries(formData).map(([key, value]) => (
            <tr key={key} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px', color: '#6b7280', textTransform: 'capitalize' }}>
                {key}
              </td>
              <td style={{ padding: '6px 8px', fontWeight: 500 }}>
                {String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onBack}>← Back</button>
        <button type="button" onClick={() => onSubmit(formData)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
          Create account ✓
        </button>
      </div>
    </div>
  );
}

function Exercise3() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});

  function handleNext(stepData) {
    setFormData(prev => ({ ...prev, ...stepData }));
    setStep(s => s + 1);
  }

  function handleBack() {
    setStep(s => s - 1);
  }

  function handleSubmit(payload) {
    console.log('Final payload:', payload);
    alert('Account created!\n' + JSON.stringify(payload, null, 2));
    setStep(0);
    setFormData({});
  }

  return (
    <div>
      <StepIndicator steps={STEPS} current={step} />

      {step === 0 && (
        <AccountStep defaultValues={formData} onNext={handleNext} />
      )}
      {step === 1 && (
        <PreferencesStep defaultValues={formData} onNext={handleNext} onBack={handleBack} />
      )}
      {step === 2 && (
        <ReviewStep formData={formData} onBack={handleBack} onSubmit={handleSubmit} />
      )}
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas:
//   - Persist formData to sessionStorage so it survives a page refresh
//   - Put the step index in the URL with ?step=0 using useSearchParams
//   - Use FormProvider + useFormContext (RHF) to share a single form instance
//     across all steps, then call trigger(['email', 'password']) per step
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 520 }}>
      <h1>Multi-Step / Wizard Forms</h1>

      <h2>Exercise 1 — 2-Step Wizard: State Accumulation</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Diagnose & Fix Data Loss on Back</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — 3-Step Wizard with Step Indicator</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
