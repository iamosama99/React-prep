// ============================================================
// Topic:   OTP Input
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: auto-advance + backspace-on-empty (no paste/arrows).
//   3. Exercise 2: add paste + arrow key navigation.
//   4. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 11-otp-input
// ============================================================

import { useState, useRef, useEffect, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Basic OTP (Auto-Advance + Backspace)
//
// TODO:
//   1. In handleChange:
//      a. Normalize: digits only, last character
//         → e.target.value.replace(/\D/g, '').slice(-1)
//      b. Update values[index] immutably
//      c. If digit entered AND not last input → focus next
//      d. If all filled → call onComplete
//   2. In handleKeyDown:
//      a. If Backspace AND values[index] is empty:
//         → clear previous value, focus previous input
//      b. Do NOT preventDefault (let browser clear normally if not empty)
//
// No paste handling or arrow key nav in this exercise.
// ─────────────────────────────────────────────────────────────

function BasicOTP({
  length = 6,
  onComplete,
}: {
  length?: number;
  onComplete?: (value: string) => void;
}) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    // TODO: Step 1 — normalize to a single digit
    const digit = e.target.value; // replace with: e.target.value.replace(/\D/g, '').slice(-1)

    // TODO: Step 2 — immutable array update
    // const newValues = [...values];
    // newValues[index] = digit;
    // setValues(newValues);

    // TODO: Step 3 — auto-advance
    // if (digit && index < length - 1) {
    //   inputRefs.current[index + 1]?.focus();
    // }

    // TODO: Step 4 — completion check
    // if (newValues.every(v => v !== '')) {
    //   onComplete?.(newValues.join(''));
    // }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      // TODO: if current input is empty, go back to previous
      // if (values[index] === '' && index > 0) {
      //   const newValues = [...values];
      //   newValues[index - 1] = '';
      //   setValues(newValues);
      //   inputRefs.current[index - 1]?.focus();
      // }
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={values[i]}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          style={{
            width: '3rem',
            height: '3.5rem',
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 600,
            border: `2px solid ${values[i] ? '#3b82f6' : '#ddd'}`,
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  );
}

// Demo for Exercise 1
function BasicOTPDemo() {
  const [submitted, setSubmitted] = useState('');
  const [error, setError] = useState('');

  function handleComplete(value: string) {
    setSubmitted(value);
    setError('');
    // Simulate validation
    if (value === '123456') {
      setError('');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
        Enter the 6-digit code sent to your phone. Try: <strong>123456</strong>
      </p>
      <BasicOTP length={6} onComplete={handleComplete} />
      {submitted && (
        <div style={{ padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Submitted: <strong>{submitted}</strong>
          {submitted === '123456' ? ' — Valid!' : ' — Invalid code'}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Full OTP (Paste + Arrow Keys)
//
// Build on Exercise 1. Add:
//   1. handlePaste:
//      a. e.preventDefault()
//      b. Read: e.clipboardData.getData('text')
//      c. Strip non-digits: .replace(/\D/g, '')
//      d. Slice from current index: .slice(0, length - index)
//      e. Fill values array from index onwards
//      f. Focus the last filled input
//      g. Check completion
//   2. In handleKeyDown, add:
//      - ArrowLeft → focus previous input (preventDefault)
//      - ArrowRight → focus next input (preventDefault)
// ─────────────────────────────────────────────────────────────

function FullOTP({
  length = 6,
  onComplete,
}: {
  length?: number;
  onComplete?: (value: string) => void;
}) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newValues.every(v => v !== '')) {
      onComplete?.(newValues.join(''));
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();

    // TODO: Step 1 — read clipboard text
    const pasted = ''; // replace with: e.clipboardData.getData('text')

    // TODO: Step 2 — strip non-digits and slice to remaining length
    // const digits = pasted.replace(/\D/g, '').split('').slice(0, length - index);

    // TODO: Step 3 — fill values from current index
    // const newValues = [...values];
    // digits.forEach((d, i) => { newValues[index + i] = d; });
    // setValues(newValues);

    // TODO: Step 4 — focus last filled input
    // const lastFilledIndex = Math.min(index + digits.length - 1, length - 1);
    // inputRefs.current[lastFilledIndex]?.focus();

    // TODO: Step 5 — check completion
    // if (newValues.every(v => v !== '')) onComplete?.(newValues.join(''));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'Backspace':
        if (values[index] === '' && index > 0) {
          const newValues = [...values];
          newValues[index - 1] = '';
          setValues(newValues);
          inputRefs.current[index - 1]?.focus();
        }
        break;
      // TODO: case 'ArrowLeft': focus prev, preventDefault
      // TODO: case 'ArrowRight': focus next, preventDefault
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={values[i]}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => handlePaste(i, e)}
          style={{
            width: '3rem',
            height: '3.5rem',
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 600,
            border: `2px solid ${values[i] ? '#3b82f6' : '#ddd'}`,
            borderRadius: '8px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  );
}

// Demo for Exercise 2
function FullOTPDemo() {
  const [otp, setOtp] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
        Try pasting <strong>654321</strong> into any box — it should fill from that position.
        Also test arrow keys to navigate between boxes.
      </p>
      <FullOTP length={6} onComplete={setOtp} />
      {otp && (
        <div style={{ padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Complete OTP: <strong>{otp}</strong>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete OTP with all behaviors:
//   - Digit-only validation
//   - Auto-advance on input
//   - Backspace: clear current or go-back to previous
//   - Paste: fill from current position, focus last filled
//   - ArrowLeft/Right navigation
//   - onComplete callback
//   - Visual: filled/active/error states
//   - autoComplete="one-time-code" for SMS OTP prompt
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

interface OTPInputProps {
  length?: number;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

function ReferenceOTP({ length = 6, onComplete, error = false, disabled = false }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function checkComplete(newValues: string[]) {
    if (newValues.every(v => v !== '')) {
      onComplete?.(newValues.join(''));
    }
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    checkComplete(newValues);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'Backspace':
        if (values[index] === '' && index > 0) {
          const newValues = [...values];
          newValues[index - 1] = '';
          setValues(newValues);
          inputRefs.current[index - 1]?.focus();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) inputRefs.current[index - 1]?.focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (index < length - 1) inputRefs.current[index + 1]?.focus();
        break;
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '').split('').slice(0, length - index);

    if (digits.length === 0) return;

    const newValues = [...values];
    digits.forEach((d, i) => {
      newValues[index + i] = d;
    });
    setValues(newValues);

    const lastFilledIndex = Math.min(index + digits.length - 1, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();
    checkComplete(newValues);
  }

  const inputStyle = (i: number): React.CSSProperties => ({
    width: '3rem',
    height: '3.5rem',
    textAlign: 'center',
    fontSize: '1.5rem',
    fontWeight: 600,
    border: `2px solid ${
      error ? '#ef4444' :
      activeIndex === i ? '#3b82f6' :
      values[i] ? '#93c5fd' :
      '#ddd'
    }`,
    borderRadius: '8px',
    outline: 'none',
    background: disabled ? '#f5f5f5' : '#fff',
    color: disabled ? '#aaa' : '#1a1a1a',
    transition: 'border-color 0.15s',
    cursor: disabled ? 'not-allowed' : 'text',
  });

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={values[i]}
          disabled={disabled}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => handlePaste(i, e)}
          onFocus={() => setActiveIndex(i)}
          onBlur={() => setActiveIndex(null)}
          style={inputStyle(i)}
        />
      ))}
    </div>
  );
}

function ReferenceOTPDemo() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [otp, setOtp] = useState('');

  function handleComplete(value: string) {
    setOtp(value);
    setStatus('checking');
    // Simulate async validation
    setTimeout(() => {
      setStatus(value === '123456' ? 'success' : 'error');
    }, 800);
  }

  const statusColors = { idle: '#555', checking: '#f59e0b', success: '#22c55e', error: '#ef4444' };
  const statusMessages = { idle: '', checking: 'Verifying…', success: 'Code accepted!', error: 'Invalid code. Try 123456.' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
        Enter the 6-digit code. Correct code: <strong>123456</strong>.
        Try pasting <strong>654321</strong> or navigating with arrow keys.
      </p>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#888' }}>4-digit PIN</p>
          <ReferenceOTP length={4} onComplete={() => {}} />
        </div>
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#888' }}>6-digit OTP (with validation)</p>
          <ReferenceOTP length={6} onComplete={handleComplete} error={status === 'error'} />
          {status !== 'idle' && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: statusColors[status] }}>
              {statusMessages[status]}
            </p>
          )}
        </div>
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#888' }}>Disabled state</p>
          <ReferenceOTP length={6} onComplete={() => {}} disabled />
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>OTP Input</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Build a multi-cell OTP input with auto-advance, backspace navigation, paste support,
      and arrow key navigation. Each exercise adds a layer of behavior.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — Auto-Advance + Backspace</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in the TODOs in <code>handleChange</code> and <code>handleKeyDown</code>.
          No paste or arrow key handling yet.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <BasicOTPDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Typing a digit should move focus to the next input automatically</li>
            <li>Pressing Backspace on an empty input should clear the previous input and move focus there</li>
            <li>Pressing Backspace on a filled input should clear it (normal browser behavior — no special handling needed)</li>
            <li>Filling all 6 inputs should trigger onComplete</li>
          </ul>
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2 — Paste + Arrow Key Navigation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Add <code>handlePaste</code> and extend <code>handleKeyDown</code> with ArrowLeft/Right.
          Paste from any position should fill inputs starting from that position.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <FullOTPDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Click on input 3 (index 2), paste "654321" — should fill inputs 3, 4, 5, 6 with "6543" (4 digits, starting from position 2)</li>
            <li>Click on input 1 (index 0), paste "654321" — should fill all 6 inputs</li>
            <li>ArrowLeft should move focus to the previous input</li>
            <li>ArrowRight should move focus to the next input</li>
          </ul>
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Complete OTP with all behaviors, visual states (active/filled/error/disabled), and
          <code> autoComplete="one-time-code"</code> for SMS OTP autofill. Read this only after attempting the exercises.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem' }}>
          <ReferenceOTPDemo />
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li><code>autoComplete="one-time-code"</code> on the first input — triggers browser/SMS OTP autofill</li>
            <li>Separate <code>activeIndex</code> state tracks which input has focus for the border highlight</li>
            <li>Error prop turns all borders red — no need to track which inputs are "wrong"</li>
            <li>Paste fills from the index of the focused input, not always from 0</li>
            <li>Backspace does NOT preventDefault when input has a value — lets browser handle it naturally</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
