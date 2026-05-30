// ============================================================
// Topic:   Focus Management in SPAs
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: LIVE DEMOS + QUIZ + INTERACTIVE SIMULATION
//
// Run: npm run tutorial 08-focus-management-spas
// ============================================================

import { useState, useEffect, useRef, useCallback, FC } from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — tabIndex Quiz: What's the Tab Order?
//
// Three DOM structures. Click elements in the order Tab would
// reach them. Then reveal the correct answer and explanation.
// ─────────────────────────────────────────────────────────────

interface TabQuiz {
  id: number;
  title: string;
  description: string;
  elements: Array<{ id: string; label: string; tabIndex?: number; visualOrder?: number }>;
  domOrder: string[];    // element ids in correct tab order
  explanation: string;
  gotcha: string;
}

const TAB_QUIZZES: TabQuiz[] = [
  {
    id: 1,
    title: 'Simple DOM Order',
    description: 'Four buttons in normal DOM order. No CSS tricks. What order does Tab reach them?',
    elements: [
      { id: 'a', label: 'Button A' },
      { id: 'b', label: 'Button B' },
      { id: 'c', label: 'Button C' },
      { id: 'd', label: 'Button D' },
    ],
    domOrder: ['a', 'b', 'c', 'd'],
    explanation: 'Tab follows DOM order. No tabIndex attributes means all buttons use their natural DOM position. Order: A → B → C → D.',
    gotcha: 'This is the baseline. Tab order = DOM order when no tabIndex values are set.',
  },
  {
    id: 2,
    title: 'CSS flex-direction: row-reverse',
    description: 'Same four buttons, but rendered with CSS flex-direction: row-reverse. Visual order is D-C-B-A left to right. What does Tab do?',
    elements: [
      { id: 'a', label: 'A (DOM: 1st)', visualOrder: 4 },
      { id: 'b', label: 'B (DOM: 2nd)', visualOrder: 3 },
      { id: 'c', label: 'C (DOM: 3rd)', visualOrder: 2 },
      { id: 'd', label: 'D (DOM: 4th)', visualOrder: 1 },
    ],
    domOrder: ['a', 'b', 'c', 'd'],
    explanation: 'Tab STILL follows DOM order: A → B → C → D. CSS visual reordering does NOT change tab order. A keyboard user presses Tab and jumps from "D" (visually first) to "C" then "B" then "A" — moving right-to-left visually. WCAG violation.',
    gotcha: 'This is the most common keyboard a11y bug. CSS order ≠ tab order. Fix by reordering the DOM to match the intended visual order.',
  },
  {
    id: 3,
    title: 'Mixed tabIndex values',
    description: 'Buttons with different tabIndex values: no tabIndex, tabIndex={0}, and tabIndex={-1}. Which are reachable?',
    elements: [
      { id: 'a', label: 'A (tabIndex={-1})', tabIndex: -1 },
      { id: 'b', label: 'B (no tabIndex)' },
      { id: 'c', label: 'C (tabIndex={0})' },
      { id: 'd', label: 'D (tabIndex={-1})', tabIndex: -1 },
    ],
    domOrder: ['b', 'c'],
    explanation: 'Only B and C are tab-reachable. tabIndex={-1} removes elements from the tab order (but allows programmatic focus via .focus()). tabIndex={0} and no-tabIndex both participate in normal DOM-order tabbing.',
    gotcha: 'tabIndex={-1} = focusable by JavaScript only, not by Tab key. Use it for elements you need to focus programmatically (headings, modal containers) without putting them in the tab order.',
  },
];

function TabOrderQuiz({ quiz }: { quiz: TabQuiz }) {
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);

  function handleClick(id: string) {
    if (revealed) return;
    if (userOrder.includes(id)) {
      setUserOrder(prev => prev.filter(x => x !== id));
    } else {
      setUserOrder(prev => [...prev, id]);
    }
  }

  const isCorrect = revealed &&
    userOrder.join(',') === quiz.domOrder.join(',');

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ padding: '0.75rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
        <strong>#{quiz.id} — {quiz.title}</strong>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#555' }}>{quiz.description}</p>
      </div>
      <div style={{ padding: '1rem' }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#777' }}>
          Click elements in the Tab order you predict. Click again to deselect.
        </p>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
          flexDirection: quiz.id === 2 ? 'row-reverse' : 'row',
        }}>
          {quiz.elements.map(el => {
            const pos = userOrder.indexOf(el.id);
            const isSelected = pos !== -1;
            const isTabReachable = el.tabIndex !== -1;
            return (
              <button
                key={el.id}
                onClick={() => !revealed && isTabReachable && handleClick(el.id)}
                disabled={revealed || !isTabReachable}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  border: '2px solid',
                  borderColor: revealed
                    ? (quiz.domOrder.includes(el.id) ? '#27ae60' : '#e74c3c')
                    : isSelected ? '#1a73e8' : el.tabIndex === -1 ? '#ccc' : '#ddd',
                  background: revealed
                    ? (quiz.domOrder.includes(el.id) ? '#f0fff4' : '#fff5f5')
                    : isSelected ? '#e8f0fe' : el.tabIndex === -1 ? '#f5f5f5' : '#fff',
                  color: el.tabIndex === -1 ? '#aaa' : '#333',
                  cursor: revealed || el.tabIndex === -1 ? 'default' : 'pointer',
                  fontWeight: 600,
                  position: 'relative',
                  fontSize: '0.85rem',
                  textDecoration: el.tabIndex === -1 ? 'line-through' : 'none',
                }}
              >
                {isSelected && !revealed && (
                  <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#1a73e8', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {pos + 1}
                  </span>
                )}
                {el.label}
              </button>
            );
          })}
        </div>

        {!revealed && (
          <button
            onClick={() => userOrder.length > 0 && setRevealed(true)}
            disabled={userOrder.length === 0}
            style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #333', background: userOrder.length > 0 ? '#333' : '#eee', color: userOrder.length > 0 ? '#fff' : '#aaa', cursor: userOrder.length > 0 ? 'pointer' : 'default', fontSize: '0.85rem' }}
          >
            Reveal answer →
          </button>
        )}

        {revealed && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>{isCorrect ? '✓ Correct!' : '✗ Not quite'}</span>
              <span style={{ fontSize: '0.85rem', color: '#555' }}>
                Tab order: {quiz.domOrder.map(id => quiz.elements.find(e => e.id === id)?.label.split(' ')[0]).join(' → ')}
              </span>
            </div>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#333', lineHeight: 1.6 }}>{quiz.explanation}</p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#777', fontStyle: 'italic' }}>Key insight: {quiz.gotcha}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Exercise1_TabOrderQuiz() {
  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 1: What's the Tab Order?</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        For each DOM structure, click elements in the order Tab would reach them.
        Predict before revealing. The CSS reorder case is the critical one.
      </p>
      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong> In which case does visual order NOT match tab order?
        Why does this create an accessibility failure for keyboard users?
      </div>
      {TAB_QUIZZES.map(quiz => <TabOrderQuiz key={quiz.id} quiz={quiz} />)}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Modal Focus Management Demo
//
// Fully working modal with all three requirements:
// 1. Focus moves IN on open
// 2. Focus TRAP while open (Tab/Shift+Tab cycle within)
// 3. Focus RETURNS to trigger on close
//
// Includes a visual "Focus tracker" indicator.
// ─────────────────────────────────────────────────────────────

function FocusTracker({ label }: { label: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.3rem 0.75rem',
      background: '#e8f5e9',
      border: '2px solid #27ae60',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: 600,
      color: '#1b5e20',
    }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
      Focus: {label}
    </div>
  );
}

function AccessibleModal({ isOpen, onClose, triggerRef }: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Rule 1: Move focus IN on open. Rule 3: Return focus on close.
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      // Cleanup = modal closed: return focus to trigger
      triggerRef.current?.focus() ?? previousFocus?.focus();
    };
  }, [isOpen, triggerRef]);

  // Rule 2: Trap focus while open
  useEffect(() => {
    if (!isOpen) return;

    function trapFocus(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          outline: 'none',
        }}
      >
        <h2 id="modal-title" style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Confirm Action</h2>
        <p style={{ margin: '0 0 1.25rem', color: '#555', fontSize: '0.9rem', lineHeight: 1.5 }}>
          This dialog traps focus within itself. Press Tab and Shift+Tab to cycle through the
          buttons below. Press Escape to close and return focus to the trigger button.
        </p>
        <input
          type="text"
          placeholder="Type something (focusable)"
          aria-label="Demo input"
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '1rem', boxSizing: 'border-box', fontSize: '0.9rem' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Confirm Delete
          </button>
        </div>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>
          Escape or click outside to close
        </p>
      </div>
    </div>,
    document.body
  );
}

function Exercise2_ModalFocusDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [focusLocation, setFocusLocation] = useState('Page content');
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function trackFocus() {
      const el = document.activeElement;
      if (!el || el === document.body) {
        setFocusLocation('Body (no focus)');
        return;
      }
      const label =
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        (el as HTMLElement).innerText?.trim()?.slice(0, 30) ||
        el.tagName.toLowerCase();
      setFocusLocation(label || 'unknown');
    }

    document.addEventListener('focusin', trackFocus);
    return () => document.removeEventListener('focusin', trackFocus);
  }, []);

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 2: Modal Focus Management</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Open the modal and keyboard through it. Three requirements: (1) focus moves IN on open,
        (2) focus is TRAPPED while open, (3) focus RETURNS to the trigger on close.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>What happens if you don't move focus into the modal on open? (try with a broken modal)</li>
          <li>Why does aria-modal="true" matter? What does it tell screen readers?</li>
          <li>What is the correct element to focus first when the modal opens?</li>
        </ol>
      </div>

      <div style={{ background: '#f0f4ff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #c5cae9' }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#3949ab' }}>
          Focus tracker
        </p>
        <FocusTracker label={focusLocation} />
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#777' }}>
          Tracks document.activeElement in real time
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          style={{
            padding: '0.6rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: '#1a73e8',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
          }}
        >
          Open Modal
        </button>
        <span style={{ fontSize: '0.85rem', color: '#555' }}>
          ← Focus is on this button before you open. It should return here on close.
        </span>
      </div>

      <AccessibleModal isOpen={isOpen} onClose={() => setIsOpen(false)} triggerRef={triggerRef} />

      <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem' }}>
        <strong>What the code does (3 rules):</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2.2, color: '#444' }}>
          <li><strong>Focus IN:</strong> <code>dialogRef.current?.focus()</code> on open (tabIndex={'{-1}'} on the dialog div)</li>
          <li><strong>Focus TRAP:</strong> keydown listener intercepts Tab/Shift+Tab to cycle within <code>focusable</code> list</li>
          <li><strong>Focus RETURN:</strong> useEffect cleanup calls <code>triggerRef.current?.focus()</code> when isOpen becomes false</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Skip Nav in Action
//
// Skip nav is visually hidden until focused.
// Appears on :focus, links to #main-content.
// Show this working interactively with simulated nav.
// ─────────────────────────────────────────────────────────────

function Exercise3_SkipNav() {
  const mainRef = useRef<HTMLDivElement>(null);
  const [skipNavActivated, setSkipNavActivated] = useState(false);

  function handleSkipNav(e: React.MouseEvent | React.KeyboardEvent) {
    if ('key' in e && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    mainRef.current?.focus();
    setSkipNavActivated(true);
    setTimeout(() => setSkipNavActivated(false), 2000);
  }

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 3: Skip Navigation Link</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Skip nav lets keyboard users jump past repeated navigation to main content.
        Click the "Skip to main content" link (or Tab to it and press Enter) to see it work.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Why does the &lt;main&gt; element need tabIndex={'{-1}'} for the skip link to work?</li>
          <li>Where in the DOM should the skip nav link be placed?</li>
          <li>Why is the skip nav hidden visually but NOT with aria-hidden or display:none?</li>
        </ol>
      </div>

      {/* Simulated page structure */}
      <div style={{ border: '2px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
        {/* Skip nav — normally sr-only, shown here as demo */}
        <div style={{ position: 'relative', background: '#1e1e1e', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="#demo-main"
            onClick={handleSkipNav}
            onKeyDown={handleSkipNav}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '4px',
              background: '#ffeb3b',
              color: '#333',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: '2px solid transparent',
              outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.border = '2px solid #fff'; }}
            onBlur={e => { e.currentTarget.style.border = '2px solid transparent'; }}
          >
            Skip to main content
          </a>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>
            ← In production this is visually hidden (position: absolute; left: -9999px) until :focus
          </span>
        </div>

        {/* Simulated nav */}
        <nav aria-label="Primary" style={{ background: '#2d2d2d', padding: '0.75rem 1rem', display: 'flex', gap: '1rem' }}>
          {['Home', 'Products', 'About', 'Blog', 'Contact', 'Pricing', 'Support'].map(item => (
            <a
              key={item}
              href="#"
              onClick={e => e.preventDefault()}
              style={{ color: '#bbb', textDecoration: 'none', fontSize: '0.85rem', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
              onFocus={e => { e.currentTarget.style.background = '#444'; e.currentTarget.style.color = '#fff'; }}
              onBlur={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#bbb'; }}
            >
              {item}
            </a>
          ))}
          <span style={{ marginLeft: 'auto', color: '#777', fontSize: '0.75rem', alignSelf: 'center' }}>
            Without skip nav: Tab through all 7 nav items before reaching main content
          </span>
        </nav>

        {/* Main content */}
        <div
          id="demo-main"
          ref={mainRef}
          tabIndex={-1}
          aria-label="Main content"
          style={{
            padding: '1.5rem',
            outline: skipNavActivated ? '3px solid #1a73e8' : 'none',
            outlineOffset: '-3px',
            background: skipNavActivated ? '#e8f0fe' : '#fff',
            transition: 'all 0.2s',
          }}
        >
          {skipNavActivated && (
            <div style={{ background: '#1a73e8', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'inline-block' }}>
              Focus jumped here — skip nav worked!
            </div>
          )}
          <h3 style={{ margin: '0 0 0.5rem' }}>Main Content Area</h3>
          <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>
            This is where keyboard users land after activating the skip link —
            bypassing all 7 navigation items above.
            The <code>tabIndex={'{-1}'}</code> on this div allows programmatic focus
            without adding it to the natural tab order.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '1rem', background: '#1e1e1e', borderRadius: '8px', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#d4d4d4' }}>
        <div style={{ color: '#9cdcfe' }}>{`// The pattern in code:`}</div>
        <div>{`<a href="#main-content" className="skip-nav">Skip to main content</a>`}</div>
        <div>{`<nav>...</nav>`}</div>
        <div>{`<main id="main-content" tabIndex={-1}>...</main>`}</div>
        <br />
        <div style={{ color: '#6a9955' }}>{`/* CSS — hidden until focused */`}</div>
        <div>{`.skip-nav { position: absolute; left: -9999px; }`}</div>
        <div>{`.skip-nav:focus { left: 0; top: 0; z-index: 999; }`}</div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Route Change Focus Simulator
//
// Two buttons: route change WITHOUT focus management
// and route change WITH focus management.
//
// Show where focus lands after each "navigation".
// ─────────────────────────────────────────────────────────────

interface FakePage {
  id: string;
  title: string;
  content: string;
}

const FAKE_PAGES: FakePage[] = [
  { id: 'home', title: 'Home', content: 'Welcome to the app. This is the home page.' },
  { id: 'settings', title: 'Settings', content: 'Manage your account preferences here.' },
  { id: 'profile', title: 'Profile', content: 'View and edit your public profile information.' },
];

function Exercise4_RouteChangeFocus() {
  const [currentPage, setCurrentPage] = useState<FakePage>(FAKE_PAGES[0]);
  const [mode, setMode] = useState<'broken' | 'fixed'>('broken');
  const [focusLog, setFocusLog] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function navigate(page: FakePage) {
    setCurrentPage(page);
    const msg = mode === 'fixed'
      ? `[Fixed] Navigated to "${page.title}" — focus moved to h1`
      : `[Broken] Navigated to "${page.title}" — focus stayed on nav button`;
    setFocusLog(prev => [msg, ...prev.slice(0, 6)]);

    if (mode === 'fixed') {
      // Focus moves to the h1 of the new page
      setTimeout(() => headingRef.current?.focus(), 0);
    }
    // In broken mode: focus stays wherever it was (the nav button)
  }

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 4: Route Change Focus Simulator</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        In a SPA, route changes happen in JavaScript. The browser does NOT reset focus.
        Without focus management, screen reader users get no signal that the page changed.
        Toggle between Broken and Fixed and "navigate" to feel the difference.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Why does a screen reader user need focus to move on route change?</li>
          <li>Why does the h1 need tabIndex={'{-1}'} for programmatic focus to work?</li>
          <li>Next.js App Router handles this automatically. React Router does not. What does that mean for your code?</li>
          <li>What's an alternative to focusing the h1 — describe the "route announcer" pattern.</li>
        </ol>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setMode('broken')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '2px solid', borderColor: mode === 'broken' ? '#e74c3c' : '#ddd', background: mode === 'broken' ? '#e74c3c' : '#fff', color: mode === 'broken' ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600 }}
        >
          Broken (no focus mgmt)
        </button>
        <button
          onClick={() => setMode('fixed')}
          style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '2px solid', borderColor: mode === 'fixed' ? '#27ae60' : '#ddd', background: mode === 'fixed' ? '#27ae60' : '#fff', color: mode === 'fixed' ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600 }}
        >
          Fixed (focus h1 on nav)
        </button>
      </div>

      <div style={{ border: `2px solid ${mode === 'broken' ? '#e74c3c' : '#27ae60'}`, borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem', transition: 'border-color 0.2s' }}>
        {/* Simulated nav bar */}
        <nav aria-label="App navigation" style={{ background: '#2d2d2d', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem' }}>
          {FAKE_PAGES.map(page => (
            <button
              key={page.id}
              onClick={() => navigate(page)}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '4px',
                border: 'none',
                background: currentPage.id === page.id ? '#1a73e8' : 'transparent',
                color: currentPage.id === page.id ? '#fff' : '#bbb',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: currentPage.id === page.id ? 700 : 400,
              }}
            >
              {page.title}
            </button>
          ))}
        </nav>

        {/* Simulated page content */}
        <div style={{ padding: '1.5rem', background: '#fff' }}>
          <h1
            ref={headingRef}
            tabIndex={-1}
            style={{
              margin: '0 0 0.75rem',
              fontSize: '1.3rem',
              outline: 'none',
              borderRadius: '4px',
              padding: '2px 4px',
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px #1a73e880'; }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            {currentPage.title}
          </h1>
          <p style={{ margin: '0 0 0.5rem', color: '#555', fontSize: '0.9rem' }}>{currentPage.content}</p>
          {mode === 'fixed' && (
            <div style={{ fontSize: '0.8rem', color: '#27ae60', fontWeight: 600 }}>
              Focus moved here (h1 has tabIndex={'{-1}'} + ref.current.focus())
            </div>
          )}
          {mode === 'broken' && (
            <div style={{ fontSize: '0.8rem', color: '#e74c3c' }}>
              Focus stayed on the nav button. Screen reader user doesn't know the page changed.
            </div>
          )}
        </div>
      </div>

      {/* Focus log */}
      {focusLog.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ padding: '0.5rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>
            Navigation log
          </div>
          {focusLog.map((entry, i) => (
            <div key={i} style={{ padding: '0.4rem 1rem', borderBottom: '1px solid #f5f5f5', fontSize: '0.83rem', color: entry.startsWith('[Fixed]') ? '#1b5e20' : '#b71c1c', background: i === 0 ? '#fffde7' : '#fff' }}>
              {entry}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#d4d4d4' }}>
        <div style={{ color: '#9cdcfe' }}>{`// Fixed pattern — focus the h1 on mount`}</div>
        <div>{`function SettingsPage() {`}</div>
        <div>{`  const headingRef = useRef<HTMLHeadingElement>(null);`}</div>
        <div>{`  useEffect(() => { headingRef.current?.focus(); }, []);`}</div>
        <div>{`  return <h1 tabIndex={-1} ref={headingRef}>Settings</h1>;`}</div>
        <div>{`}`}</div>
        <div style={{ color: '#6a9955', marginTop: '0.5rem' }}>{`// tabIndex={-1} = focusable by JS, not in tab order`}</div>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Focus Management in SPAs</h1>
    <div style={{ background: '#e3f2fd', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
      <strong>Core rule:</strong> SPAs don't reset focus on route change — you must do it. Modals
      require three things: focus IN, TRAP, and RETURN. Never outline: none globally.
      tabIndex={'{-1}'} = programmatically focusable, not in tab order.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_TabOrderQuiz />
      <hr />
      <Exercise2_ModalFocusDemo />
      <hr />
      <Exercise3_SkipNav />
      <hr />
      <Exercise4_RouteChangeFocus />
    </div>
  </div>
);

export default App;
