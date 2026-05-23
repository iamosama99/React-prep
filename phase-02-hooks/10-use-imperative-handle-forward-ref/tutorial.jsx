// ============================================================
// Topic:   useImperativeHandle + forwardRef
// Phase:   2 — Hooks
// ============================================================
//
// Mental model:
//   forwardRef  — "let a parent pass a ref INTO this component"
//   useImperativeHandle — "but expose only THIS API, not the raw DOM"
//
// This is an escape hatch. Use only for genuine imperative needs
// (focus, scroll, play, reset). Not for sharing state.
// ============================================================

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: forwardRef basics — expose focus() to the parent.
//
// FancyInput below is a styled wrapper around <input>.
// The parent (Exercise1) needs to focus it programmatically,
// but can't reach the DOM node because it's inside a functional component.
//
// Steps:
//   1. Wrap FancyInput with forwardRef.
//   2. Inside, create an innerRef = useRef(null) and attach it to <input>.
//   3. Use useImperativeHandle(ref, () => ({ focus: () => innerRef.current.focus() }))
//   4. In Exercise1, calling inputRef.current.focus() must focus the input.
//
// Key: after useImperativeHandle, ref.current is the CUSTOM OBJECT
//      you returned, NOT the raw DOM node.

// TODO: wrap with forwardRef
function FancyInput(props /* , ref */) {
  // TODO: const innerRef = useRef(null);
  // TODO: useImperativeHandle(ref, () => ({ focus: () => innerRef.current.focus() }));

  return (
    <input
      // TODO: ref={innerRef}
      {...props}
      style={{
        border: '2px solid #7c4dff',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 14,
        outline: 'none',
        width: '100%',
      }}
    />
  );
}

function Exercise1() {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  return (
    <div style={styles.box}>
      <FancyInput
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="I'm a FancyInput…"
      />
      <button onClick={() => inputRef.current?.focus()}>
        Focus FancyInput from parent
      </button>
      <p style={{ fontSize: 12, color: '#888' }}>
        ref.current will be the custom API object, not the DOM node.
        Try: console.log(inputRef.current) after clicking.
      </p>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Richer API — expose focus(), clear(), and getValue().
//
// Extend FancyInput2 to expose three methods through the ref:
//   focus()    — focus the input
//   clear()    — clear the input value (controlled: call setValue(''))
//   getValue() — return current value synchronously
//
// The parent form uses all three:
//   "Focus" button → focuses the input
//   "Clear" button → clears it
//   "Submit" button → reads value via getValue(), logs it, then clears
//
// Note: getValue() reads value from a ref (not state) to always
//       be synchronous and not stale. See the hint below.

const FancyInput2 = forwardRef(function FancyInput2(props, ref) {
  const [value, setValue] = useState('');
  const innerRef = useRef(null);
  // HINT: store value in a ref so getValue() is always current
  const valueRef = useRef(value);
  valueRef.current = value; // keep in sync on every render

  useImperativeHandle(ref, () => ({
    focus: () => innerRef.current?.focus(),
    // TODO: clear() — set value to '' via setValue
    // TODO: getValue() — return valueRef.current
  }));

  return (
    <input
      ref={innerRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      {...props}
      style={{
        border: '2px solid #00897b',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 14,
        width: '100%',
      }}
    />
  );
});

function Exercise2() {
  const inputRef = useRef(null);

  function handleSubmit() {
    const val = inputRef.current?.getValue();
    console.log('Submitted:', val);
    alert(`Submitted: "${val}"`);
    inputRef.current?.clear();
    inputRef.current?.focus();
  }

  return (
    <div style={styles.box}>
      <FancyInput2 ref={inputRef} placeholder="Type something and Submit…" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => inputRef.current?.focus()}>Focus</button>
        <button onClick={() => inputRef.current?.clear()}>Clear</button>
        <button onClick={handleSubmit}>Submit (logs + clears)</button>
      </div>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Multi-step form — parent orchestrates child inputs imperatively.
//
// Build a two-step form where a wizard parent focuses the right
// field on each step using refs, without controlling the inputs.
//
// FormStep1 has: name input, email input
// FormStep2 has: password input, confirm-password input
//
// Each step component uses forwardRef + useImperativeHandle to expose:
//   focusFirst() — focuses the first field in the step
//   getValues()  — returns { field1, field2 } from valueRefs
//
// The Wizard:
//   - Renders step 1, calls focusFirst() on mount
//   - "Next" validates (values not empty) then switches to step 2
//   - "Back" goes to step 1 and re-focuses
//   - "Submit" calls getValues() on current step and logs result
//
// This is the real-world use case: complex multi-input components
// that expose a controlled API instead of raw DOM nodes.

const FormStep1 = forwardRef(function FormStep1(props, ref) {
  const nameRef   = useRef(null);
  const emailRef  = useRef(null);
  const nameValRef  = useRef('');
  const emailValRef = useRef('');

  useImperativeHandle(ref, () => ({
    focusFirst: () => nameRef.current?.focus(),
    getValues:  () => ({ name: nameValRef.current, email: emailValRef.current }),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={styles.label}>
        Name
        <input
          ref={nameRef}
          onChange={e => { nameValRef.current = e.target.value; }}
          style={styles.input}
          placeholder="Alice"
        />
      </label>
      <label style={styles.label}>
        Email
        <input
          ref={emailRef}
          onChange={e => { emailValRef.current = e.target.value; }}
          style={styles.input}
          placeholder="alice@example.com"
        />
      </label>
    </div>
  );
});

// TODO: implement FormStep2 similarly with password + confirmPassword
// const FormStep2 = forwardRef(function FormStep2(props, ref) { ... });

function Exercise3() {
  const [step, setStep] = useState(1);
  const step1Ref = useRef(null);
  // const step2Ref = useRef(null);

  // Auto-focus first field when step mounts
  // TODO: useEffect to call step1Ref.current?.focusFirst() when step changes

  function handleNext() {
    const vals = step1Ref.current?.getValues();
    if (!vals?.name || !vals?.email) {
      alert('Please fill in all fields');
      return;
    }
    setStep(2);
  }

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13, fontWeight: 'bold', margin: 0 }}>
        Step {step} of 2
      </p>
      {step === 1
        ? <FormStep1 ref={step1Ref} />
        : <p style={{ fontSize: 13, color: '#888' }}>
            FormStep2 — implement it and wire it up
          </p>
      }
      <div style={{ display: 'flex', gap: 8 }}>
        {step > 1 && <button onClick={() => setStep(1)}>← Back</button>}
        {step < 2
          ? <button onClick={handleNext}>Next →</button>
          : <button onClick={() => {
              const vals = step1Ref.current?.getValues();
              console.log('Submit:', vals);
              alert(JSON.stringify(vals, null, 2));
            }}>Submit</button>
        }
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// What happens if you use useImperativeHandle WITHOUT forwardRef?
//
// Steps:
//   1. Remove forwardRef from BrokenComponent.
//   2. Try to call ref.current.focus() from the parent.
//   3. Observe: ref.current is null — the ref is never populated.
//
// Conclusion: useImperativeHandle has NO effect without forwardRef.

const BrokenComponent = forwardRef(function BrokenComponent(props, ref) {
  // Try removing forwardRef from the line above and observe
  const innerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => innerRef.current?.focus(),
  }));

  return <input ref={innerRef} placeholder="Remove forwardRef and I break" style={styles.input} />;
});

function Playground() {
  const ref = useRef(null);

  return (
    <div style={styles.box}>
      <BrokenComponent ref={ref} />
      <button onClick={() => {
        console.log('ref.current:', ref.current);
        ref.current?.focus();
      }}>
        Log ref.current &amp; focus
      </button>
      <p style={{ fontSize: 12, color: '#888' }}>
        Remove forwardRef from BrokenComponent — ref.current becomes null.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1>useImperativeHandle + forwardRef</h1>

      <h2>Exercise 1 — Expose focus() via forwardRef</h2>
      <p style={styles.goal}>
        Wrap FancyInput so the parent can call inputRef.current.focus().
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Richer API: focus / clear / getValue</h2>
      <p style={styles.goal}>
        Add clear() and getValue() to the imperative handle.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Multi-step Wizard Form</h2>
      <p style={styles.goal}>
        Each step exposes focusFirst() and getValues() to the wizard parent.
      </p>
      <Exercise3 />

      <h2>Playground — Without forwardRef</h2>
      <Playground />
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ddd', borderRadius: 6,
    padding: '0.75rem 1rem', marginBottom: '0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 },
  input: { padding: '6px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc' },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
