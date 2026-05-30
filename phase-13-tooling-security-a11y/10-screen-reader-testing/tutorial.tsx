// ============================================================
// Topic:   Screen Reader Testing
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: QUIZ GAME + AUDIT + LIVE ANNOUNCER + CODE REVIEW
//
// Run: npm run tutorial 10-screen-reader-testing
// ============================================================

import { useState, useEffect, useRef, useCallback, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — "What Does the Screen Reader Say?"
//
// Show 6 DOM structures. Predict the VoiceOver/NVDA announcement
// when focused. Score tracking + clear feedback.
// ─────────────────────────────────────────────────────────────

interface SRQuestion {
  id: number;
  label: string;
  code: string;
  options: string[];
  answer: string;
  explanation: string;
  warning?: string;
}

const SR_QUESTIONS: SRQuestion[] = [
  {
    id: 1,
    label: 'A plain button with text',
    code: `<button>Save</button>`,
    options: ['"Save"', '"Save, button"', '"button"', '"Save, element"'],
    answer: '"Save, button"',
    explanation: 'VoiceOver announces: accessible name + role. The button\'s text "Save" is its accessible name. Role is "button". Full announcement: "Save, button".',
  },
  {
    id: 2,
    label: 'A button containing only an SVG icon, no text',
    code: `<button>\n  <img src="x.svg" />\n</button>`,
    options: ['"icon, button"', '"x.svg, button"', '"button" (no name)', '"image, button"'],
    answer: '"button" (no name)',
    explanation: 'The SVG/img has no alt text. The button has no text content. Screen reader announces just "button" with no accessible name. The user has no idea what this button does. Critical failure.',
    warning: 'This is one of the most common accessibility bugs. Always label icon-only buttons.',
  },
  {
    id: 3,
    label: 'A button with aria-label and a hidden SVG',
    code: `<button aria-label="Save changes">\n  <img src="save.svg" aria-hidden="true" />\n</button>`,
    options: ['"Save changes, button"', '"save.svg, button"', '"button"', '"image Save changes, button"'],
    answer: '"Save changes, button"',
    explanation: 'aria-label overrides all other name computation. The img has aria-hidden so it\'s ignored. Full announcement: "Save changes, button". aria-hidden on the img prevents double-announcing.',
  },
  {
    id: 4,
    label: 'An input with only a placeholder',
    code: `<input type="text" placeholder="Search" />`,
    options: ['"Search, edit text"', '"edit text"', '"Search, text field" (unreliable)', '"Search input"'],
    answer: '"Search, text field" (unreliable)',
    explanation: 'Placeholder behavior varies by screen reader and browser. Some announce it as the label; many don\'t. It disappears when typing. NEVER rely on placeholder as the only accessible name. Always use a <label> or aria-label.',
    warning: 'Placeholder as the sole label is a WCAG 1.3.1 failure. Screen readers handle it inconsistently.',
  },
  {
    id: 5,
    label: 'An input with an explicit aria-label',
    code: `<input type="text" aria-label="Search products" />`,
    options: ['"Search products, edit text"', '"edit text, Search products"', '"Search products"', '"text field"'],
    answer: '"Search products, edit text"',
    explanation: 'Screen readers announce: accessible name + role/type. aria-label provides the name "Search products". The input type gives "edit text" (VoiceOver) or "text field" (NVDA). Order is typically name → role.',
  },
  {
    id: 6,
    label: 'A div with role="alert" and error text added dynamically',
    code: `<div role="alert">Error: invalid email</div>`,
    options: [
      'Announced only when focused',
      '"Error: invalid email" — announced immediately when content appears',
      'Announced on next Tab press',
      'Nothing — div is not interactive',
    ],
    answer: '"Error: invalid email" — announced immediately when content appears',
    explanation: 'role="alert" is equivalent to aria-live="assertive" + aria-atomic="true". When the text is inserted into the div, screen readers immediately interrupt and announce the content — WITHOUT the user needing to focus the element. No focus movement required.',
  },
];

function Exercise1_SRQuiz() {
  const [answers, setAnswers] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(SR_QUESTIONS.map(q => [q.id, null]))
  );
  const [revealed, setRevealed] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(SR_QUESTIONS.map(q => [q.id, false]))
  );

  const score = SR_QUESTIONS.filter(q => revealed[q.id] && answers[q.id] === q.answer).length;
  const revealedCount = SR_QUESTIONS.filter(q => revealed[q.id]).length;

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 1: What Does the Screen Reader Say?</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        For each element, predict what VoiceOver or NVDA would announce when it receives focus
        (or when it appears dynamically). Select your answer, then reveal. Score tracked below.
      </p>

      {revealedCount > 0 && (
        <div style={{ background: '#e8f5e9', padding: '0.5rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealedCount}</strong> correct
          {revealedCount === SR_QUESTIONS.length && score === SR_QUESTIONS.length && (
            <span style={{ color: '#27ae60', marginLeft: '0.75rem' }}>Perfect score!</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {SR_QUESTIONS.map(q => {
          const isCorrect = answers[q.id] === q.answer;
          return (
            <div key={q.id} style={{
              border: '1px solid',
              borderColor: revealed[q.id] ? (isCorrect ? '#27ae60' : '#e74c3c') : '#ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              background: revealed[q.id] ? (isCorrect ? '#f0fff4' : '#fff5f5') : '#fff',
              transition: 'all 0.2s',
            }}>
              <div style={{ padding: '0.6rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.85rem' }}>#{q.id} — {q.label}</strong>
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ background: '#1e1e1e', borderRadius: '6px', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#d4d4d4', whiteSpace: 'pre' }}>
                  {q.code}
                </div>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: '#555', fontStyle: 'italic' }}>
                  When focused, the screen reader announces:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: revealed[q.id] ? '0.75rem' : 0 }}>
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => !revealed[q.id] && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      disabled={revealed[q.id]}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '4px',
                        border: '2px solid',
                        borderColor: revealed[q.id] && opt === q.answer
                          ? '#27ae60'
                          : answers[q.id] === opt && !revealed[q.id]
                            ? '#1a73e8'
                            : '#ddd',
                        background: revealed[q.id] && opt === q.answer
                          ? '#27ae60'
                          : answers[q.id] === opt && !revealed[q.id]
                            ? '#1a73e8'
                            : '#fff',
                        color: (revealed[q.id] && opt === q.answer) || (answers[q.id] === opt && !revealed[q.id])
                          ? '#fff'
                          : '#333',
                        cursor: revealed[q.id] ? 'default' : 'pointer',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        textAlign: 'left',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                  {answers[q.id] && !revealed[q.id] && (
                    <button
                      onClick={() => setRevealed(prev => ({ ...prev, [q.id]: true }))}
                      style={{ padding: '0.35rem 0.85rem', borderRadius: '4px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', marginLeft: 'auto' }}
                    >
                      Reveal →
                    </button>
                  )}
                </div>
                {revealed[q.id] && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: '0.6rem', fontSize: '0.85rem', color: '#444', lineHeight: 1.6 }}>
                    <strong>{isCorrect ? '✓ Correct. ' : `✗ You chose "${answers[q.id]}" — answer is "${q.answer}". `}</strong>
                    {q.explanation}
                    {q.warning && (
                      <div style={{ marginTop: '0.4rem', padding: '0.4rem 0.6rem', background: '#fff8e1', borderLeft: '3px solid #f9a825', fontSize: '0.8rem', color: '#7c5b00' }}>
                        {q.warning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Form Accessibility Audit
//
// A broken form with 5 issues. User marks each issue,
// then sees the fixed version side-by-side.
// ─────────────────────────────────────────────────────────────

interface FormIssue {
  id: number;
  title: string;
  location: string;
  description: string;
  fix: string;
}

const FORM_ISSUES: FormIssue[] = [
  {
    id: 1,
    title: 'Input has no label — only a placeholder',
    location: 'Email field',
    description: 'The email input relies on placeholder="Email address" as its only label. Placeholder disappears when typing and is not reliably announced.',
    fix: 'Add <label htmlFor="email">Email address</label> and id="email" on the input. Or add aria-label="Email address".',
  },
  {
    id: 2,
    title: 'Required field has no programmatic indication',
    location: 'Name field',
    description: 'The name field is visually marked as required (asterisk) but has no aria-required or required attribute. Screen readers won\'t announce it as required.',
    fix: 'Add required or aria-required="true" to the input. Screen readers then announce "Name, edit text, required".',
  },
  {
    id: 3,
    title: 'Error message not connected to the input',
    location: 'Email error',
    description: 'When validation fails, an error appears below the email field. But it\'s not linked to the input via aria-describedby. Screen reader users won\'t know the error relates to the email field.',
    fix: 'Add id="email-error" to the error element and aria-describedby="email-error" aria-invalid={true} to the input.',
  },
  {
    id: 4,
    title: 'Submit button has icon only, no accessible label',
    location: 'Submit button',
    description: 'The submit button contains only an SVG arrow icon. No text, no aria-label. Screen reader announces "button" — user doesn\'t know it submits the form.',
    fix: 'Add aria-label="Submit form" to the button, or add visually-hidden text: <span className="sr-only">Submit</span>.',
  },
  {
    id: 5,
    title: 'Field hint text not associated with the input',
    location: 'Password hint',
    description: 'A hint "Must be at least 8 characters" appears below the password field but is not connected to it. Screen readers read the hint separately (if at all) rather than after the password label.',
    fix: 'Add id="password-hint" to the hint and aria-describedby="password-hint" to the password input. Screen reader reads: "Password, edit text. Must be at least 8 characters."',
  },
];

function BrokenForm({ markedIssues, onMark }: { markedIssues: Set<number>; onMark: (id: number) => void }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div style={{ border: '2px solid #e74c3c', borderRadius: '8px', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e74c3c', marginBottom: '1rem', textTransform: 'uppercase' }}>
        Broken Form — 5 accessibility issues
      </div>

      {/* Issue 1: no label, only placeholder */}
      <div
        style={{ marginBottom: '0.75rem', outline: markedIssues.has(1) ? '2px dashed #e74c3c' : 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer', position: 'relative' }}
        onClick={() => onMark(1)}
        title="Click to mark as issue"
      >
        {markedIssues.has(1) && <span style={{ position: 'absolute', top: '-10px', right: '4px', background: '#e74c3c', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>Issue #{1} found</span>}
        <input
          type="text"
          placeholder="Email address"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '0.9rem' }}
        />
      </div>

      {/* Issue 2: required but no aria-required */}
      <div
        style={{ marginBottom: '0.75rem', outline: markedIssues.has(2) ? '2px dashed #e74c3c' : 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer', position: 'relative' }}
        onClick={() => onMark(2)}
        title="Click to mark as issue"
      >
        {markedIssues.has(2) && <span style={{ position: 'absolute', top: '-10px', right: '4px', background: '#e74c3c', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>Issue #{2} found</span>}
        <label htmlFor="broken-name" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
          Full Name <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        {/* Missing: required or aria-required */}
        <input id="broken-name" type="text" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '0.9rem' }} />
      </div>

      {/* Issue 3: error not connected */}
      <div
        style={{ marginBottom: '0.75rem', outline: markedIssues.has(3) ? '2px dashed #e74c3c' : 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer', position: 'relative' }}
        onClick={() => onMark(3)}
        title="Click to mark as issue"
      >
        {markedIssues.has(3) && <span style={{ position: 'absolute', top: '-10px', right: '4px', background: '#e74c3c', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>Issue #{3} found</span>}
        <label htmlFor="broken-email2" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Email</label>
        {/* Missing: aria-describedby, aria-invalid */}
        <input id="broken-email2" type="email" defaultValue="not-an-email" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e74c3c', boxSizing: 'border-box', fontSize: '0.9rem' }} />
        <p style={{ margin: '0.25rem 0 0', color: '#e74c3c', fontSize: '0.8rem' }}>Invalid email format</p>
        {/* Error not linked to input */}
      </div>

      {/* Issue 4: icon-only button */}
      <div
        style={{ marginBottom: '0.75rem', outline: markedIssues.has(4) ? '2px dashed #e74c3c' : 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer', position: 'relative' }}
        onClick={() => onMark(4)}
        title="Click to mark as issue"
      >
        {markedIssues.has(4) && <span style={{ position: 'absolute', top: '-10px', right: '4px', background: '#e74c3c', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>Issue #{4} found</span>}
        {/* Missing: aria-label */}
        <button style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>
          →
        </button>
        <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#777' }}>← this button</span>
      </div>

      {/* Issue 5: hint not connected */}
      <div
        style={{ marginBottom: '0.75rem', outline: markedIssues.has(5) ? '2px dashed #e74c3c' : 'none', borderRadius: '4px', padding: '2px', cursor: 'pointer', position: 'relative' }}
        onClick={() => onMark(5)}
        title="Click to mark as issue"
      >
        {markedIssues.has(5) && <span style={{ position: 'absolute', top: '-10px', right: '4px', background: '#e74c3c', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>Issue #{5} found</span>}
        <label htmlFor="broken-pass" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
        {/* Missing: aria-describedby */}
        <input id="broken-pass" type="password" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '0.9rem' }} />
        {/* Hint not connected to input */}
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#777' }}>Must be at least 8 characters</p>
      </div>

      <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#888' }}>
        Click on each section to mark it as an issue. Found {markedIssues.size}/5.
      </p>
    </div>
  );
}

function FixedForm() {
  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#27ae60', marginBottom: '1rem', textTransform: 'uppercase' }}>
        Fixed Form — all issues corrected
      </div>

      {/* Fix 1: proper label */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="fixed-email1" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
          Email address
        </label>
        <input id="fixed-email1" type="text" placeholder="Email address" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '0.9rem' }} />
        <div style={{ fontSize: '0.72rem', color: '#27ae60', marginTop: '2px' }}>Fix: &lt;label htmlFor&gt; + matching id</div>
      </div>

      {/* Fix 2: required */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="fixed-name" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
          Full Name <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <input id="fixed-name" type="text" required aria-required="true" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '0.9rem' }} />
        <div style={{ fontSize: '0.72rem', color: '#27ae60', marginTop: '2px' }}>Fix: required + aria-required="true"</div>
      </div>

      {/* Fix 3: error connected */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="fixed-email2" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Email</label>
        <input
          id="fixed-email2"
          type="email"
          defaultValue="not-an-email"
          aria-describedby="fixed-email-error"
          aria-invalid="true"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e74c3c', boxSizing: 'border-box', fontSize: '0.9rem' }}
        />
        <p id="fixed-email-error" role="alert" style={{ margin: '0.25rem 0 0', color: '#e74c3c', fontSize: '0.8rem' }}>
          Invalid email format
        </p>
        <div style={{ fontSize: '0.72rem', color: '#27ae60', marginTop: '2px' }}>Fix: aria-describedby + aria-invalid + role="alert"</div>
      </div>

      {/* Fix 4: labeled button */}
      <div style={{ marginBottom: '0.75rem' }}>
        <button aria-label="Submit form" style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>
          →
        </button>
        <div style={{ fontSize: '0.72rem', color: '#27ae60', marginTop: '2px' }}>Fix: aria-label="Submit form"</div>
      </div>

      {/* Fix 5: hint connected */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="fixed-pass" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
        <input
          id="fixed-pass"
          type="password"
          aria-describedby="fixed-pass-hint"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '0.9rem' }}
        />
        <p id="fixed-pass-hint" style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#777' }}>Must be at least 8 characters</p>
        <div style={{ fontSize: '0.72rem', color: '#27ae60', marginTop: '2px' }}>Fix: aria-describedby="fixed-pass-hint"</div>
      </div>
    </div>
  );
}

function Exercise2_FormAudit() {
  const [markedIssues, setMarkedIssues] = useState<Set<number>>(new Set());
  const [showFixed, setShowFixed] = useState(false);

  function handleMark(id: number) {
    setMarkedIssues(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 2: Form Accessibility Audit</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        The form on the left has 5 accessibility issues. Click on each problematic section to mark it.
        Once you've found all 5, reveal the fixes on the right.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — find all 5 issues before revealing fixes.</strong>
        For each one, think about what a screen reader user would experience and which ARIA
        attribute or HTML element fixes it.
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {FORM_ISSUES.map(issue => (
          <div
            key={issue.id}
            onClick={() => handleMark(issue.id)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              border: '2px solid',
              borderColor: markedIssues.has(issue.id) ? '#e74c3c' : '#ddd',
              background: markedIssues.has(issue.id) ? '#ffebee' : '#fff',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: markedIssues.has(issue.id) ? 700 : 400,
              color: markedIssues.has(issue.id) ? '#e74c3c' : '#555',
            }}
          >
            {markedIssues.has(issue.id) ? '✓' : '○'} Issue #{issue.id}
          </div>
        ))}
        <button
          onClick={() => setShowFixed(v => !v)}
          style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: '2px solid #27ae60', background: showFixed ? '#27ae60' : '#f0fff4', color: showFixed ? '#fff' : '#27ae60', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, marginLeft: 'auto' }}
        >
          {showFixed ? 'Hide Fixed' : 'Show Fixed Form'}
        </button>
      </div>

      {markedIssues.size > 0 && (
        <div style={{ marginBottom: '1rem', border: '1px solid #ffcdd2', borderRadius: '8px', overflow: 'hidden' }}>
          {[...markedIssues].sort().map(id => {
            const issue = FORM_ISSUES.find(i => i.id === id)!;
            return (
              <div key={id} style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #ffcdd2', background: '#fff5f5' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#c62828' }}>Issue #{id}: {issue.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.2rem' }}>{issue.description}</div>
                <div style={{ fontSize: '0.8rem', color: '#27ae60', marginTop: '0.25rem' }}><strong>Fix:</strong> {issue.fix}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: showFixed ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        <BrokenForm markedIssues={markedIssues} onMark={handleMark} />
        {showFixed && <FixedForm />}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — aria-live Announcement Simulator
//
// Mock "screen reader output" panel.
// Trigger different dynamic updates and see what the simulated
// SR announces. Demonstrates polite vs assertive vs atomic.
// ─────────────────────────────────────────────────────────────

interface SRAnnouncement {
  id: number;
  time: string;
  type: 'polite' | 'assertive' | 'atomic-full' | 'atomic-part';
  text: string;
  region: string;
}

function Exercise3_SRSimulator() {
  const [announcements, setAnnouncements] = useState<SRAnnouncement[]>([]);
  const [searchResults, setSearchResults] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [counter, setCounter] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const counterRef = useRef(0);
  const announcementIdRef = useRef(0);

  function addAnnouncement(type: SRAnnouncement['type'], text: string, region: string) {
    announcementIdRef.current += 1;
    setAnnouncements(prev => [{
      id: announcementIdRef.current,
      time: new Date().toLocaleTimeString(),
      type,
      text,
      region,
    }, ...prev].slice(0, 15));
  }

  function simulateSearch() {
    setIsLoading(true);
    setSearchResults(null);
    addAnnouncement('polite', 'Loading results...', 'status region (aria-live="polite")');
    setTimeout(() => {
      setIsLoading(false);
      setSearchResults('12 results found for "keyboard navigation"');
      addAnnouncement('polite', '12 results found for "keyboard navigation"', 'status region (aria-live="polite")');
    }, 1500);
  }

  function simulateError() {
    const msg = 'Error: Payment declined. Please check your card details.';
    setNotification(msg);
    addAnnouncement('assertive', msg, 'alert region (role="alert")');
    setTimeout(() => setNotification(null), 4000);
  }

  function simulateNotification() {
    const msg = 'File "report.pdf" uploaded successfully';
    addAnnouncement('polite', msg, 'status region (aria-live="polite")');
  }

  function incrementCounter(mode: 'full' | 'part') {
    counterRef.current += 1;
    const n = counterRef.current;
    setCounter(n);
    if (mode === 'full') {
      addAnnouncement('atomic-full', `${n} items selected`, 'counter (aria-atomic="true") → full region announced');
    } else {
      addAnnouncement('atomic-part', `${n}`, 'counter (aria-atomic="false") → only changed part announced');
    }
  }

  const TYPE_CONFIG = {
    'polite': { label: 'POLITE', color: '#3949ab', bg: '#e8eaf6' },
    'assertive': { label: 'ASSERTIVE', color: '#c62828', bg: '#ffebee' },
    'atomic-full': { label: 'POLITE (full region)', color: '#1b5e20', bg: '#e8f5e9' },
    'atomic-part': { label: 'POLITE (changed part)', color: '#e65100', bg: '#fff3e0' },
  };

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 3: Screen Reader Announcement Simulator</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Trigger different UI events and see what a screen reader would announce in the output panel.
        This simulates how aria-live regions work — polite waits for idle time, assertive interrupts,
        and atomic controls whether the full region or just the changed text is announced.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ border: '1px solid #c5cae9', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#3949ab', marginBottom: '0.5rem' }}>
              Polite announcements (waits for idle)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={simulateSearch}
                disabled={isLoading}
                style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: '2px solid #c5cae9', background: '#e8eaf6', cursor: isLoading ? 'default' : 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
              >
                {isLoading ? 'Loading... (watch output)' : 'Trigger: Search → results loaded'}
              </button>
              <button
                onClick={simulateNotification}
                style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: '2px solid #c5cae9', background: '#e8eaf6', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left' }}
              >
                Trigger: File upload success
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid #ffcdd2', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#c62828', marginBottom: '0.5rem' }}>
              Assertive — interrupts immediately
            </div>
            <button
              onClick={simulateError}
              style={{ padding: '0.45rem 1rem', borderRadius: '6px', border: '2px solid #ffcdd2', background: '#ffebee', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'left', width: '100%' }}
            >
              Trigger: Payment error (critical)
            </button>
            {notification && (
              <div role="alert" style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: '#ffcdd2', borderRadius: '4px', fontSize: '0.8rem', color: '#c62828' }}>
                {notification}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #c8e6c9', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2e7d32', marginBottom: '0.5rem' }}>
              aria-atomic demo — same counter, different region config
            </div>
            <div style={{ background: '#f0f0f0', borderRadius: '4px', padding: '0.4rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              Counter: <strong>{counter}</strong> items selected
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => incrementCounter('full')}
                style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: '2px solid #c8e6c9', background: '#e8f5e9', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                +1 (atomic=true) → full text
              </button>
              <button
                onClick={() => incrementCounter('part')}
                style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: '2px solid #ffcc80', background: '#fff3e0', cursor: 'pointer', fontSize: '0.78rem' }}
              >
                +1 (atomic=false) → just number
              </button>
            </div>
          </div>
        </div>

        {/* Simulated SR output */}
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
            Simulated screen reader output
          </div>
          <div style={{ border: '2px solid #333', borderRadius: '8px', minHeight: '280px', overflow: 'hidden', background: '#1e1e1e' }}>
            {announcements.length === 0 ? (
              <div style={{ padding: '1rem', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Screen reader output will appear here...
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {announcements.map((a, i) => {
                  const config = TYPE_CONFIG[a.type];
                  return (
                    <div key={a.id} style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #333', background: i === 0 ? '#2d2d1a' : 'transparent' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700, background: config.bg, color: config.color }}>
                          {config.label}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>{a.time}</span>
                      </div>
                      <div style={{ color: '#e0e0e0', fontSize: '0.85rem', fontFamily: 'monospace' }}>"{a.text}"</div>
                      <div style={{ color: '#666', fontSize: '0.72rem', marginTop: '0.15rem' }}>{a.region}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => setAnnouncements([])}
            style={{ marginTop: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: '#777', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            Clear output
          </button>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Run the search simulation. How many announcements happen? Why two instead of one?</li>
          <li>With atomic=false and "N items selected" in the region, why is announcing just "N" confusing?</li>
          <li>When should you use assertive vs polite? Give a real-world example for each.</li>
          <li>Why must aria-live regions be in the DOM BEFORE content is inserted into them?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — jest-axe Test Patterns
//
// Show 4 components: 2 accessible, 2 with violations.
// Show what jest-axe outputs for each.
// Show what it DOESN'T catch.
// ─────────────────────────────────────────────────────────────

interface JestAxeExample {
  id: number;
  title: string;
  accessible: boolean;
  component: string;
  testCode: string;
  testOutput: string;
  lesson: string;
}

const JEST_AXE_EXAMPLES: JestAxeExample[] = [
  {
    id: 1,
    title: 'Image with no alt text',
    accessible: false,
    component: `<img src="chart.png" />`,
    testCode: `test('chart image is accessible', async () => {
  const { container } = render(<ChartImage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});`,
    testOutput: `● chart image is accessible

  expect(received).toHaveNoViolations()

  Received 1 violation:

  1. image-alt (critical)
     Element: <img src="chart.png">
     Fix: Add an alt attribute with a meaningful description
     or alt="" for decorative images.`,
    lesson: 'jest-axe catches missing alt text. This is a structural violation it can detect by inspecting the DOM.',
  },
  {
    id: 2,
    title: 'Form input with a proper label',
    accessible: true,
    component: `<label htmlFor="email">Email</label>
<input id="email" type="email" />`,
    testCode: `test('email field is accessible', async () => {
  const { container } = render(<EmailField />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});`,
    testOutput: `PASS
  ✓ email field is accessible (45ms)`,
    lesson: 'The label/id association is structurally correct — jest-axe confirms no violations. But it can\'t verify that "Email" is the right label for this field in context.',
  },
  {
    id: 3,
    title: 'Button with no accessible name',
    accessible: false,
    component: `<button>
  <svg aria-hidden="true" />
</button>`,
    testCode: `test('action button is accessible', async () => {
  const { container } = render(<ActionButton />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});`,
    testOutput: `● action button is accessible

  Received 1 violation:

  1. button-name (critical)
     Element: <button>
     Fix: Buttons must have discernible text.
     Add aria-label, visible text, or aria-labelledby.`,
    lesson: 'jest-axe catches buttons with no accessible name — a critical violation. The svg is aria-hidden and the button has no text, so the name computation returns empty.',
  },
  {
    id: 4,
    title: 'Custom widget with correct ARIA but confusing label',
    accessible: true,
    component: `<button aria-label="X">
  Close
</button>`,
    testCode: `test('close button is accessible', async () => {
  const { container } = render(<CloseButton />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});`,
    testOutput: `PASS
  ✓ close button is accessible (38ms)`,
    lesson: 'PASSES jest-axe — but aria-label="X" overrides the visible "Close" text. A screen reader announces "X, button" which is terrible UX. Automated tools can\'t catch semantic meaning problems.',
  },
];

function Exercise4_JestAxePatterns() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 4: jest-axe Test Patterns</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        jest-axe catches structural violations (missing alt, no button name, invalid ARIA).
        It CANNOT catch semantic meaning, focus order, or whether labels are helpful.
        See what passes and fails — and why.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Automated tools catch 30–40% of a11y issues. What's in the other 60–70%?</li>
          <li>Example #4 passes jest-axe but has a real problem. What is it? How would you catch it?</li>
          <li>What does toHaveNoViolations() from jest-axe actually check?</li>
          <li>Should you write jest-axe tests for every component? What's a good strategy?</li>
        </ol>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {JEST_AXE_EXAMPLES.map(ex => (
          <div key={ex.id} style={{ border: `2px solid ${ex.accessible ? '#27ae60' : '#e74c3c'}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div
              style={{ padding: '0.6rem 1rem', background: ex.accessible ? '#f0fff4' : '#fff5f5', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
              onClick={() => setExpanded(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
            >
              <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, background: ex.accessible ? '#27ae60' : '#e74c3c', color: '#fff' }}>
                {ex.accessible ? 'PASS' : 'FAIL'}
              </span>
              <strong style={{ flex: 1, fontSize: '0.9rem' }}>#{ex.id} — {ex.title}</strong>
              <span style={{ color: '#888', fontSize: '0.8rem' }}>{expanded[ex.id] ? '▲' : '▼'}</span>
            </div>
            {expanded[ex.id] && (
              <div style={{ padding: '1rem', borderTop: `1px solid ${ex.accessible ? '#c8e6c9' : '#ffcdd2'}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Component</div>
                    <div style={{ background: '#1e1e1e', borderRadius: '6px', padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#d4d4d4', whiteSpace: 'pre' }}>
                      {ex.component}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Test code</div>
                    <div style={{ background: '#1e1e1e', borderRadius: '6px', padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#d4d4d4', whiteSpace: 'pre', overflowX: 'auto' }}>
                      {ex.testCode}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Test output</div>
                  <div style={{ background: ex.accessible ? '#1a2a1a' : '#2a1a1a', borderRadius: '6px', padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.78rem', color: ex.accessible ? '#a5d6a7' : '#ef9a9a', whiteSpace: 'pre', overflowX: 'auto' }}>
                    {ex.testOutput}
                  </div>
                </div>
                <div style={{ background: '#e3f2fd', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.82rem', color: '#1565c0' }}>
                  <strong>Key lesson:</strong> {ex.lesson}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#f3e5f5', border: '1px solid #ce93d8', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>What jest-axe catches:</strong> Missing alt text, buttons/inputs without accessible names,
        invalid ARIA role usage, color contrast violations (via aXe rules), duplicate IDs,
        form inputs without labels.
        <br /><br />
        <strong>What it cannot catch:</strong> Whether labels are meaningful, whether focus order makes sense,
        whether aria-live announcements are timely, whether custom widgets are actually operable,
        whether alt text accurately describes the image.
        <br /><br />
        <strong>Best practice:</strong> Integrate jest-axe in CI for regression prevention.
        Add a manual testing pass before shipping significant UI changes.
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Screen Reader Testing</h1>
    <div style={{ background: '#e3f2fd', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
      <strong>Reality check:</strong> Automated tools (axe, Lighthouse, jest-axe) catch 30–40% of
      accessibility issues. The rest require manual testing with VoiceOver or NVDA.
      Use both: automated in CI for regression prevention, manual before shipping.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_SRQuiz />
      <hr />
      <Exercise2_FormAudit />
      <hr />
      <Exercise3_SRSimulator />
      <hr />
      <Exercise4_JestAxePatterns />
    </div>
  </div>
);

export default App;
