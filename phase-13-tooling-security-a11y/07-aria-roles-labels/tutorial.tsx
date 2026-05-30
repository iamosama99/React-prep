// ============================================================
// Topic:   ARIA Roles & Labels
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: INTERACTIVE EXPLORER + QUIZ + LIVE DEMO + COMPARISON
//
// Run: npm run tutorial 07-aria-roles-labels
// ============================================================

import { useState, useRef, useEffect, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Accessibility Tree Explorer
//
// For each HTML/JSX snippet, predict what a screen reader would
// announce when that element receives focus. Then reveal the truth.
//
// The DOM and the accessibility tree are not the same thing.
// ARIA modifies entries in the a11y tree — not visual appearance.
// ─────────────────────────────────────────────────────────────

interface A11yCard {
  id: number;
  label: string;
  broken: { code: string; a11yTree: string; problem: string };
  fixed: { code: string; a11yTree: string; explanation: string };
}

const A11Y_CARDS: A11yCard[] = [
  {
    id: 1,
    label: 'Clickable div vs button',
    broken: {
      code: `<div class="btn" onclick={save}>Save</div>`,
      a11yTree: 'generic — no role, no interactivity signal',
      problem: 'Screen reader says nothing useful. Tab skips it. No Enter/Space support.',
    },
    fixed: {
      code: `<button onClick={save}>Save</button>`,
      a11yTree: 'button "Save"',
      explanation: 'Native <button> gives you role, label, keyboard support, and focus for free.',
    },
  },
  {
    id: 2,
    label: 'Icon-only button with no label',
    broken: {
      code: `<button><XIcon /></button>`,
      a11yTree: 'button "" (empty name)',
      problem: 'Screen reader announces "button" with no label. User has no idea what it does.',
    },
    fixed: {
      code: `<button aria-label="Close dialog">\n  <XIcon aria-hidden={true} />\n</button>`,
      a11yTree: 'button "Close dialog"',
      explanation: 'aria-label provides the accessible name. aria-hidden={true} on the icon prevents double-announcing.',
    },
  },
  {
    id: 3,
    label: 'Input with only a placeholder',
    broken: {
      code: `<input type="text" placeholder="Email" />`,
      a11yTree: 'edit text (no label — placeholder is unreliable)',
      problem: 'Placeholder disappears on typing. Some screen readers use it; many don\'t. Never reliable as the only label.',
    },
    fixed: {
      code: `<label htmlFor="email">Email</label>\n<input id="email" type="text" />`,
      a11yTree: 'edit text "Email"',
      explanation: 'A <label> with htmlFor creates a permanent, reliable accessible name that persists when the user types.',
    },
  },
  {
    id: 4,
    label: 'Image with no alt text',
    broken: {
      code: `<img src="q3-chart.png" />`,
      a11yTree: 'image "q3-chart.png" (filename read aloud)',
      problem: 'Screen reader reads the filename. Useless or confusing. WCAG 1.1.1 violation.',
    },
    fixed: {
      code: `<img src="q3-chart.png" alt="Q3 revenue up 23% vs Q2" />`,
      a11yTree: 'image "Q3 revenue up 23% vs Q2"',
      explanation: 'Alt text describes what the image conveys, not just what it shows. For decorative images, use alt="".',
    },
  },
  {
    id: 5,
    label: 'Semantic landmark elements',
    broken: {
      code: `<div class="nav">...</div>\n<div class="main">...</div>\n<div class="footer">...</div>`,
      a11yTree: 'three generic divs — no landmarks',
      problem: 'Screen reader users can\'t jump between sections. No rotor landmarks. The page is a wall of text.',
    },
    fixed: {
      code: `<nav>...</nav>\n<main>...</main>\n<footer>...</footer>`,
      a11yTree: 'navigation, main, contentinfo — three landmarks',
      explanation: '<nav> = navigation landmark, <main> = main landmark, <footer> (top-level) = contentinfo. Users jump between them instantly.',
    },
  },
  {
    id: 6,
    label: 'aria-hidden on a focusable element — the DANGER case',
    broken: {
      code: `<div aria-hidden="true" tabIndex={0}>\n  Important text\n</div>`,
      a11yTree: 'GHOST — receives focus, announces nothing',
      problem: 'aria-hidden removes it from the a11y tree. tabIndex={0} keeps it in the tab order. User tabs to it, screen reader goes silent. Extremely confusing.',
    },
    fixed: {
      code: `<div aria-hidden="true">Decorative text</div>\n{/* Never tabIndex on aria-hidden elements */}`,
      a11yTree: 'removed from a11y tree (correct for decorative content)',
      explanation: 'aria-hidden is safe ONLY on non-focusable elements. Remove tabIndex, or remove aria-hidden. Never both together.',
    },
  },
];

function A11yCardComponent({ card }: { card: A11yCard }) {
  const [view, setView] = useState<'before' | 'after'>('before');
  const [revealed, setRevealed] = useState(false);

  const data = view === 'before' ? card.broken : card.fixed;

  return (
    <div style={{
      border: `2px solid ${view === 'before' ? '#e74c3c' : '#27ae60'}`,
      borderRadius: '10px',
      overflow: 'hidden',
      background: '#fff',
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        padding: '0.6rem 1rem',
        background: view === 'before' ? '#fdf2f2' : '#f0fff4',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid #eee',
      }}>
        <strong style={{ flex: 1, fontSize: '0.9rem' }}>#{card.id} — {card.label}</strong>
        <button
          onClick={() => { setView('before'); setRevealed(false); }}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: '2px solid',
            borderColor: view === 'before' ? '#e74c3c' : '#ccc',
            background: view === 'before' ? '#e74c3c' : '#fff',
            color: view === 'before' ? '#fff' : '#555',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          Broken
        </button>
        <button
          onClick={() => setView('after')}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: '2px solid',
            borderColor: view === 'after' ? '#27ae60' : '#ccc',
            background: view === 'after' ? '#27ae60' : '#fff',
            color: view === 'after' ? '#fff' : '#555',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          Fixed
        </button>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{
          background: '#1e1e1e',
          borderRadius: '6px',
          padding: '0.75rem 1rem',
          marginBottom: '0.75rem',
          fontFamily: 'monospace',
          fontSize: '0.82rem',
          color: '#d4d4d4',
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}>
          {data.code}
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: '#f9f9f9',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            What does the screen reader say? →
          </button>
        ) : (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: view === 'before' ? '#fdf2f2' : '#f0fff4',
              border: `1px solid ${view === 'before' ? '#e74c3c' : '#27ae60'}`,
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.85rem',
              marginBottom: '0.6rem',
            }}>
              <span style={{ fontSize: '1rem' }}>{view === 'before' ? '🔊' : '✓'}</span>
              <strong>A11y tree:</strong> <code style={{ fontSize: '0.82rem' }}>{data.a11yTree}</code>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: 1.6 }}>
              {view === 'before'
                ? (card.broken as typeof card.broken).problem
                : (card.fixed as typeof card.fixed).explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Exercise1_A11yTreeExplorer() {
  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 1: Accessibility Tree Explorer</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        For each element, read the code. Click "What does the screen reader say?" to see what the
        a11y tree actually exposes. Toggle between Broken and Fixed to compare.
      </p>
      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong> Before clicking reveal on each card, say
        out loud what you think a screen reader would announce. Then check. Which cases surprised you?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {A11Y_CARDS.map(card => <A11yCardComponent key={card.id} card={card} />)}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — "Which ARIA Attribute?" Matcher
//
// 8 UI situations. Pick the correct ARIA attribute.
// Reveal with explanation.
// ─────────────────────────────────────────────────────────────

interface AriaQuestion {
  id: number;
  situation: string;
  hint: string;
  options: string[];
  answer: string;
  explanation: string;
}

const ARIA_QUESTIONS: AriaQuestion[] = [
  {
    id: 1,
    situation: 'An icon-only trash button. No visible text — just a delete icon.',
    hint: 'The accessible name must come from an attribute, not the DOM.',
    options: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden'],
    answer: 'aria-label',
    explanation: 'aria-label provides the accessible name as a string when no visible text exists. Use it for icon-only buttons, unlabeled inputs, etc.',
  },
  {
    id: 2,
    situation: 'A modal dialog that has an <h2 id="modal-title">Confirm Delete</h2> inside it.',
    hint: 'The visible text already exists — point to it.',
    options: ['aria-label', 'aria-labelledby', 'aria-controls', 'aria-describedby'],
    answer: 'aria-labelledby',
    explanation: 'aria-labelledby="modal-title" on the dialog element. It points to the h2\'s ID. This ensures the programmatic label matches the visible heading — always prefer this when a visible label exists.',
  },
  {
    id: 3,
    situation: 'A "Show options" button that toggles a dropdown menu open and closed.',
    hint: 'State — is the thing open or closed right now?',
    options: ['aria-selected', 'aria-expanded', 'aria-checked', 'aria-pressed'],
    answer: 'aria-expanded',
    explanation: 'aria-expanded={isOpen} communicates the open/closed state to screen readers. When true: "Show options, expanded, button". When false: "Show options, collapsed, button". Use it on the trigger, not the panel.',
  },
  {
    id: 4,
    situation: 'A loading spinner that appears while data is fetching. Screen reader users need to know something is happening.',
    hint: 'Dynamic content. Announce without moving focus. Not urgent.',
    options: ['role="alert"', 'aria-live="polite"', 'aria-live="assertive"', 'aria-busy'],
    answer: 'aria-live="polite"',
    explanation: 'aria-live="polite" on a status region announces changes when the user is idle — ideal for non-critical updates like loading states. Use role="status" (which implies aria-live="polite") as a shorthand.',
  },
  {
    id: 5,
    situation: 'An error message "Invalid email format" that appears below an email input when validation fails.',
    hint: 'Supplemental info — connects to a specific input.',
    options: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-errormessage'],
    answer: 'aria-describedby',
    explanation: 'aria-describedby="error-id" on the input connects the error text. Screen reader reads: "Email, edit text, Invalid email format." Also set aria-invalid={true} on the input to signal the error state.',
  },
  {
    id: 6,
    situation: 'A purely decorative swirly background pattern image. It conveys no information.',
    hint: 'Hide from the a11y tree entirely.',
    options: ['aria-hidden="true"', 'aria-label=""', 'role="presentation"', 'alt="decorative"'],
    answer: 'aria-hidden="true"',
    explanation: 'aria-hidden="true" removes the element from the accessibility tree. For <img>, use alt="" instead (same effect). role="presentation" works too but aria-hidden is broader and covers non-img elements.',
  },
  {
    id: 7,
    situation: 'A "Payment failed!" error that needs to be announced immediately, interrupting the screen reader.',
    hint: 'Critical. Time-sensitive. Interrupts immediately.',
    options: ['aria-live="polite"', 'role="alert"', 'role="status"', 'aria-atomic="true"'],
    answer: 'role="alert"',
    explanation: 'role="alert" is equivalent to aria-live="assertive" + aria-atomic="true". It immediately interrupts whatever the screen reader is doing to announce the message. Use sparingly — overusing assertive is disorienting.',
  },
  {
    id: 8,
    situation: 'A page with two <nav> elements: main site navigation and breadcrumb trail.',
    hint: 'Multiple instances of the same landmark type need differentiation.',
    options: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-roledescription'],
    answer: 'aria-label',
    explanation: 'Add aria-label="Primary" and aria-label="Breadcrumb" to distinguish the two navs. Without labels, VoiceOver rotor shows "navigation" twice — user can\'t tell which is which.',
  },
];

function Exercise2_ARIAMatcher() {
  const [answers, setAnswers] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(ARIA_QUESTIONS.map(q => [q.id, null]))
  );
  const [revealed, setRevealed] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(ARIA_QUESTIONS.map(q => [q.id, false]))
  );

  const score = ARIA_QUESTIONS.filter(q => revealed[q.id] && answers[q.id] === q.answer).length;
  const revealedCount = ARIA_QUESTIONS.filter(q => revealed[q.id]).length;

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 2: Which ARIA Attribute?</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        8 UI situations. Select the correct ARIA attribute, then reveal the explanation.
        Think through the reasoning before clicking.
      </p>
      {revealedCount > 0 && (
        <div style={{ background: '#e8f5e9', padding: '0.5rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealedCount}</strong> correct so far
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {ARIA_QUESTIONS.map(q => {
          const isCorrect = answers[q.id] === q.answer;
          return (
            <div key={q.id} style={{
              border: '1px solid',
              borderColor: revealed[q.id] ? (isCorrect ? '#27ae60' : '#e74c3c') : '#ddd',
              borderRadius: '8px',
              padding: '1rem',
              background: revealed[q.id] ? (isCorrect ? '#f0fff4' : '#fff5f5') : '#fff',
              transition: 'all 0.2s',
            }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                <strong>#{q.id}</strong> {q.situation}
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#777', fontStyle: 'italic' }}>
                Hint: {q.hint}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: revealed[q.id] ? '0.75rem' : '0' }}>
                {q.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => !revealed[q.id] && setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    disabled={revealed[q.id]}
                    style={{
                      padding: '0.3rem 0.85rem',
                      borderRadius: '4px',
                      border: '2px solid',
                      borderColor: answers[q.id] === opt
                        ? '#1a73e8'
                        : revealed[q.id] && opt === q.answer
                          ? '#27ae60'
                          : '#ddd',
                      background: answers[q.id] === opt
                        ? '#1a73e8'
                        : revealed[q.id] && opt === q.answer
                          ? '#27ae60'
                          : '#fff',
                      color: answers[q.id] === opt || (revealed[q.id] && opt === q.answer) ? '#fff' : '#333',
                      cursor: revealed[q.id] ? 'default' : 'pointer',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {opt}
                  </button>
                ))}
                {answers[q.id] && !revealed[q.id] && (
                  <button
                    onClick={() => setRevealed(prev => ({ ...prev, [q.id]: true }))}
                    style={{
                      padding: '0.3rem 0.85rem',
                      borderRadius: '4px',
                      border: '2px solid #333',
                      background: '#333',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      marginLeft: 'auto',
                    }}
                  >
                    Reveal →
                  </button>
                )}
              </div>
              {revealed[q.id] && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '0.75rem', fontSize: '0.85rem', color: '#444', lineHeight: 1.6 }}>
                  <strong>{isCorrect ? '✓ Correct. ' : `✗ You chose "${answers[q.id]}" — answer is "${q.answer}". `}</strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — aria-live Announcer Demo
//
// Live, interactive demo of aria-live regions.
// You can see the actual div in the DOM and trigger announcements.
// Also demonstrates aria-atomic: true vs false.
// ─────────────────────────────────────────────────────────────

function Exercise3_AriaLiveDemo() {
  const [politeMsg, setPoliteMsg] = useState('');
  const [assertiveMsg, setAssertiveMsg] = useState('');
  const [counter, setCounter] = useState(0);
  const [atomicMode, setAtomicMode] = useState<'atomic' | 'non-atomic'>('atomic');
  const [log, setLog] = useState<Array<{ type: string; msg: string; time: string }>>([]);

  function addLog(type: string, msg: string) {
    setLog(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  }

  function sendPolite(msg: string) {
    setPoliteMsg('');
    setTimeout(() => {
      setPoliteMsg(msg);
      addLog('polite', msg);
    }, 50);
  }

  function sendAssertive(msg: string) {
    setAssertiveMsg('');
    setTimeout(() => {
      setAssertiveMsg(msg);
      addLog('assertive', msg);
    }, 50);
  }

  function incrementCounter() {
    const next = counter + 1;
    setCounter(next);
    addLog(atomicMode, atomicMode === 'atomic'
      ? `Counter updated: ${next} items selected`
      : `${next}`
    );
  }

  const counterRegionStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    background: '#e8f5e9',
    border: '1px solid #a5d6a7',
    fontSize: '0.9rem',
  };

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 3: aria-live Announcer Demo</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        With a real screen reader active, these regions announce updates without moving focus.
        The "Simulated output" log below shows what a screen reader would receive.
        Trigger updates to see the difference between polite and assertive.
      </p>

      {/* The actual aria-live regions (visible for learning — in production they'd be sr-only) */}
      <div style={{ background: '#f0f4ff', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid #c5cae9' }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#3949ab' }}>
          Live ARIA regions in the DOM (normally sr-only, shown here for demonstration)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div style={{ background: '#fff', border: '2px solid #7986cb', borderRadius: '6px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3949ab', marginBottom: '0.4rem', fontFamily: 'monospace' }}>
              aria-live="polite" aria-atomic="true"
            </div>
            <div
              aria-live="polite"
              aria-atomic="true"
              style={{ fontSize: '0.85rem', color: '#333', minHeight: '1.4rem' }}
            >
              {politeMsg}
            </div>
          </div>
          <div style={{ background: '#fff', border: '2px solid #ef9a9a', borderRadius: '6px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c62828', marginBottom: '0.4rem', fontFamily: 'monospace' }}>
              role="alert" (aria-live="assertive")
            </div>
            <div
              role="alert"
              style={{ fontSize: '0.85rem', color: '#333', minHeight: '1.4rem' }}
            >
              {assertiveMsg}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => sendPolite('3 results found for "keyboard"')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '2px solid #7986cb', background: '#e8eaf6', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Polite: Search results loaded
          </button>
          <button
            onClick={() => sendPolite('File uploaded successfully')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '2px solid #7986cb', background: '#e8eaf6', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Polite: Upload success
          </button>
          <button
            onClick={() => sendAssertive('Error: Payment failed. Check your card details.')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '2px solid #ef9a9a', background: '#ffebee', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Assertive: Payment error
          </button>
          <button
            onClick={() => sendAssertive('Session expires in 2 minutes. Save your work.')}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '2px solid #ef9a9a', background: '#ffebee', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Assertive: Session warning
          </button>
        </div>

        {/* aria-atomic demo */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '0.75rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
            aria-atomic demo: counter with "{counter} items selected"
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={counterRegionStyle}>
              {atomicMode === 'atomic'
                ? `Counter: ${counter} items selected`
                : counter.toString()}
            </div>
            <button
              onClick={incrementCounter}
              style={{ padding: '0.4rem 0.9rem', borderRadius: '6px', border: '2px solid #27ae60', background: '#e8f5e9', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              +1 Select item
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setAtomicMode('atomic')}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', border: '2px solid', borderColor: atomicMode === 'atomic' ? '#27ae60' : '#ccc', background: atomicMode === 'atomic' ? '#27ae60' : '#fff', color: atomicMode === 'atomic' ? '#fff' : '#555', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                atomic=true
              </button>
              <button
                onClick={() => setAtomicMode('non-atomic')}
                style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', border: '2px solid', borderColor: atomicMode === 'non-atomic' ? '#e67e22' : '#ccc', background: atomicMode === 'non-atomic' ? '#e67e22' : '#fff', color: atomicMode === 'non-atomic' ? '#fff' : '#555', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                atomic=false
              </button>
            </div>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#777' }}>
            atomic=true → announces full region: "{counter} items selected" | atomic=false → announces only changed part: "{counter}"
          </p>
        </div>
      </div>

      {/* Simulated log */}
      {log.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>
            Simulated screen reader output (most recent first)
          </div>
          {log.map((entry, i) => (
            <div key={i} style={{
              padding: '0.5rem 1rem',
              borderBottom: '1px solid #f5f5f5',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              background: i === 0 ? '#fffde7' : '#fff',
            }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: entry.type === 'assertive' ? '#ffcdd2' : '#e3f2fd',
                color: entry.type === 'assertive' ? '#c62828' : '#1565c0',
                whiteSpace: 'nowrap',
              }}>
                {entry.type === 'assertive' ? 'INTERRUPTS' : entry.type === 'atomic' ? 'POLITE (full)' : 'POLITE (part)'}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#333', flex: 1 }}>{entry.msg}</span>
              <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{entry.time}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2.1 }}>
          <li>Why would you NEVER use role="alert" for a search results count?</li>
          <li>A spinner appears for 300ms. Should you aria-live announce it? What's the UX downside of always announcing?</li>
          <li>With atomic=false, why might "5" be confusing when announced by itself?</li>
          <li>Where in the DOM should aria-live regions be placed? Why not dynamically inserted?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Fix the Inaccessible Tab Component
//
// Broken version: divs with no ARIA, no keyboard support.
// Fixed version: correct ARIA roles, attributes, and tab behavior.
// Toggle between them and see the checklist.
// ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', content: 'Your name, avatar, and bio settings.' },
  { id: 'billing', label: 'Billing', content: 'Payment methods and invoice history.' },
  { id: 'security', label: 'Security', content: 'Password, 2FA, and active sessions.' },
];

function BrokenTabs() {
  const [active, setActive] = useState('profile');
  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '1rem' }}>
        {TABS.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              padding: '0.6rem 1.25rem',
              cursor: 'pointer',
              borderBottom: active === tab.id ? '2px solid #1a73e8' : '2px solid transparent',
              color: active === tab.id ? '#1a73e8' : '#555',
              fontWeight: active === tab.id ? 700 : 400,
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div style={{ padding: '0.5rem', fontSize: '0.9rem', color: '#333' }}>
        {TABS.find(t => t.id === active)?.content}
      </div>
    </div>
  );
}

function FixedTabs() {
  const [active, setActive] = useState('profile');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(e: React.KeyboardEvent, tabId: string) {
    const ids = TABS.map(t => t.id);
    const idx = ids.indexOf(tabId);
    if (e.key === 'ArrowRight') {
      const next = (idx + 1) % ids.length;
      setActive(ids[next]);
      tabRefs.current[ids[next]]?.focus();
    } else if (e.key === 'ArrowLeft') {
      const prev = (idx - 1 + ids.length) % ids.length;
      setActive(ids[prev]);
      tabRefs.current[ids[prev]]?.focus();
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Account settings" style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '1rem' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            ref={el => { tabRefs.current[tab.id] = el; }}
            onClick={() => setActive(tab.id)}
            onKeyDown={e => handleKeyDown(e, tab.id)}
            style={{
              padding: '0.6rem 1.25rem',
              cursor: 'pointer',
              border: 'none',
              borderBottom: active === tab.id ? '2px solid #1a73e8' : '2px solid transparent',
              background: 'none',
              color: active === tab.id ? '#1a73e8' : '#555',
              fontWeight: active === tab.id ? 700 : 400,
              marginBottom: '-2px',
              fontFamily: 'system-ui',
              fontSize: '1rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map(tab => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          tabIndex={0}
          hidden={active !== tab.id}
          style={{ padding: '0.5rem', fontSize: '0.9rem', color: '#333' }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

const ARIA_CHECKLIST = [
  { attr: 'role="tablist"', where: 'Container div', why: 'Tells screen readers this group contains tabs. Enables rotor navigation.' },
  { attr: 'role="tab"', where: 'Each tab element', why: 'Semantic identity. Screen reader announces "Profile, tab, 1 of 3".' },
  { attr: 'aria-selected={active === tab.id}', where: 'Each tab', why: 'Communicates which tab is currently active. Announced as "selected".' },
  { attr: 'aria-controls="panel-id"', where: 'Each tab', why: 'Links tab to its panel. Some screen readers let users jump directly.' },
  { attr: 'role="tabpanel"', where: 'Each content panel', why: 'Identifies the region. Screen reader announces "Profile, tab panel".' },
  { attr: 'aria-labelledby="tab-id"', where: 'Each panel', why: 'Panel\'s accessible name comes from its tab. No need to repeat the label.' },
  { attr: 'tabIndex={active ? 0 : -1}', where: 'Each tab', why: 'Roving tabindex: only the active tab is in the tab order. Arrow keys navigate within.' },
  { attr: 'Arrow key handlers', where: 'Each tab button', why: 'Left/Right arrow keys move between tabs and update which is active.' },
];

function Exercise4_TabAccessibility() {
  const [version, setVersion] = useState<'broken' | 'fixed'>('broken');
  const [checklistOpen, setChecklistOpen] = useState(false);

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 4: Fix the Inaccessible Tabs</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        The Broken version uses plain divs — no ARIA, no keyboard navigation.
        The Fixed version adds the correct roles, attributes, and keyboard behavior.
        Try tabbing into each and navigating with arrow keys.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setVersion('broken')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '2px solid', borderColor: version === 'broken' ? '#e74c3c' : '#ddd', background: version === 'broken' ? '#e74c3c' : '#fff', color: version === 'broken' ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600 }}
        >
          Try Broken Version
        </button>
        <button
          onClick={() => setVersion('fixed')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '2px solid', borderColor: version === 'fixed' ? '#27ae60' : '#ddd', background: version === 'fixed' ? '#27ae60' : '#fff', color: version === 'fixed' ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600 }}
        >
          Try Fixed Version
        </button>
      </div>

      <div style={{ border: `2px solid ${version === 'broken' ? '#e74c3c' : '#27ae60'}`, borderRadius: '8px', padding: '1rem', marginBottom: '1rem', transition: 'border-color 0.2s' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: version === 'broken' ? '#e74c3c' : '#27ae60', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {version === 'broken' ? 'Broken — div-based, no ARIA' : 'Fixed — proper roles + keyboard nav'}
        </div>
        {version === 'broken' ? <BrokenTabs /> : <FixedTabs />}
      </div>

      {version === 'broken' && (
        <div style={{ background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <strong>Issues with the broken version:</strong> No role (screen reader sees divs), no keyboard navigation (Tab skips over divs), no selected state announced, no association between tabs and panels.
          Switch to Fixed and press Tab then arrow keys.
        </div>
      )}

      <button
        onClick={() => setChecklistOpen(v => !v)}
        style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #1a73e8', background: '#e8f0fe', color: '#1a73e8', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '0.75rem' }}
      >
        {checklistOpen ? 'Hide' : 'Show'} ARIA checklist ({ARIA_CHECKLIST.length} attributes)
      </button>

      {checklistOpen && (
        <div style={{ border: '1px solid #e3f2fd', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#e3f2fd' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #bbdefb' }}>Attribute / Pattern</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #bbdefb' }}>Where</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #bbdefb' }}>Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {ARIA_CHECKLIST.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0f0f0', fontFamily: 'monospace', color: '#1a73e8', whiteSpace: 'nowrap' }}>{row.attr}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0f0f0', color: '#555' }}>{row.where}</td>
                  <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0f0f0', color: '#333' }}>{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2.1 }}>
          <li>Why does the fixed version use arrow keys to switch tabs, not Tab key?</li>
          <li>What is the "roving tabindex" technique? How is it demonstrated in this component?</li>
          <li>Why is aria-labelledby better than aria-label on the tabpanel?</li>
          <li>A button that opens a disclosure (show/hide): is role="tab" correct? What should it be?</li>
        </ol>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>ARIA Roles &amp; Labels</h1>
    <div style={{ background: '#e3f2fd', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
      <strong>Core rule:</strong> ARIA modifies the accessibility tree — not visual appearance or behavior.
      It fills gaps that native HTML can't fill. Prefer semantic HTML always: &lt;button&gt; over div[role=button],
      &lt;nav&gt; over div[role=navigation]. The first rule of ARIA is to not use ARIA.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_A11yTreeExplorer />
      <hr />
      <Exercise2_ARIAMatcher />
      <hr />
      <Exercise3_AriaLiveDemo />
      <hr />
      <Exercise4_TabAccessibility />
    </div>
  </div>
);

export default App;
