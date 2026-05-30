// ============================================================
// Topic:   Modal / Dialog
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement a basic modal with portal + open/close.
//   3. Exercise 2: Add all three focus management requirements + ARIA.
//   4. Compare your solution against the Reference Implementation below.
//
// Run: npm run tutorial 06-modal-dialog
// ============================================================

import { useState, useEffect, useRef, FC } from 'react';
import { createPortal } from 'react-dom';

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Basic modal — createPortal + open/close.
//
// Requirements:
//   - Render modal content into document.body using createPortal
//   - Clicking the backdrop (overlay div) calls onClose
//   - Clicking modal content does NOT close it (stopPropagation)
//   - "Close" button calls onClose
//   - Return null when !isOpen (don't render to DOM)
//   - Basic styling: fixed overlay, centered white box
//
// NOT required in Exercise 1:
//   - Focus management
//   - ARIA
//   - Escape key
//   - Scroll lock

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal_Exercise1({ isOpen, onClose, title, children }: ModalProps) {
  // TODO 1: Return null if !isOpen

  return createPortal(
    // TODO 2: Render an overlay div with onClick={onClose}
    //         Inside it, render a modal content div with onClick={e => e.stopPropagation()}
    //         Include: title <h2>, {children}, and a Close button
    <div>
      <h2>{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>,
    document.body
  );
}

function Exercise1_BasicModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: Basic Modal (Portal)</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Renders via createPortal into document.body. Backdrop click closes. No focus management yet.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement Modal_Exercise1 above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>Why createPortal instead of regular rendering?</li>
          <li>Why stopPropagation on the inner content div?</li>
          <li>What does the overlay look like? (position: fixed, inset: 0, rgba background)</li>
        </ul>
      </div>

      <button
        onClick={() => setIsOpen(true)}
        style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
      >
        Open Modal
      </button>

      <Modal_Exercise1 isOpen={isOpen} onClose={() => setIsOpen(false)} title="Basic Modal">
        <p>This is the modal content. Click the backdrop or the Close button to close.</p>
        <p>Without focus management, Tab can reach elements behind this modal.</p>
      </Modal_Exercise1>
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Add all three focus management requirements and ARIA.
//
// Requirements:
//   1. Move focus IN: Focus dialogRef.current on open (needs tabIndex={-1})
//   2. Return focus on close: Save trigger element before open, restore on close
//   3. Trap focus: Intercept Tab/Shift+Tab to cycle within the modal
//   4. Escape: Close the modal (add to the trap handler)
//   5. ARIA: role="dialog", aria-modal="true", aria-labelledby={titleId}, tabIndex={-1}
//   6. Scroll lock: document.body.style.overflow = 'hidden' on open, restore on close

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface AccessibleModalProps extends ModalProps {
  triggerRef: React.RefObject<HTMLElement | null>;
}

function Modal_Exercise2({ isOpen, onClose, title, children, triggerRef }: AccessibleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'modal-title-ex2';

  // TODO 3: Move focus into modal on open, return focus on close
  useEffect(() => {
    if (!isOpen) return;
    // TODO 3a: focus dialogRef.current
    // TODO 3b: return cleanup that restores focus to triggerRef.current
  }, [isOpen, triggerRef]);

  // TODO 4: Focus trap + Escape to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      // TODO 4a: query all focusable elements within dialogRef.current
      // TODO 4b: if Tab on last element → preventDefault, focus first
      // TODO 4c: if Shift+Tab on first element → preventDefault, focus last
      void e;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // TODO 5: Scroll lock
  useEffect(() => {
    if (!isOpen) return;
    // TODO 5a: Save document.body.style.overflow, set to 'hidden'
    // TODO 5b: Return cleanup that restores the original value
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        // TODO 6: Add role="dialog", aria-modal="true", aria-labelledby={titleId}, tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '480px',
          width: '90%',
          outline: 'none', // visually hide focus ring on dialog container
        }}
      >
        <h2 id={titleId} style={{ margin: '0 0 1rem' }}>{title}</h2>
        {children}
        <button
          onClick={onClose}
          style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}

function Exercise2_AccessibleModal() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: Accessible Modal</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        All three focus requirements + ARIA + Escape + scroll lock.
        Use only keyboard to open/navigate/close — it should all work.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement Modal_Exercise2 above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>What is the FOCUSABLE_SELECTOR used for in the focus trap?</li>
          <li>Why does dialogRef.current need tabIndex=&#123;-1&#125;?</li>
          <li>What does Shift+Tab on the first focusable element do?</li>
        </ul>
      </div>

      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none', background: '#8e44ad', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
      >
        Open Accessible Modal
      </button>

      <Modal_Exercise2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Accessible Modal"
        triggerRef={triggerRef as React.RefObject<HTMLElement | null>}
      >
        <p>Focus should be inside this modal. Tab should cycle through: input → checkbox → Close → (back to input).</p>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          Name:
          <input type="text" placeholder="Type something..." style={{ display: 'block', width: '100%', padding: '0.4rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
          <input type="checkbox" />
          I agree to the terms
        </label>
      </Modal_Exercise2>
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────

function Modal_Reference({ isOpen, onClose, title, children, triggerRef }: AccessibleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'modal-title-ref';

  // Requirement 1: Move focus in on open
  // Requirement 3: Return focus to trigger on close (cleanup)
  useEffect(() => {
    if (!isOpen) return;
    // Small delay to ensure the portal is rendered
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      // Restore focus to the element that opened the modal
      (triggerRef?.current as HTMLElement | null)?.focus();
    };
  }, [isOpen, triggerRef]);

  // Requirement 2: Focus trap + Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab on first element → jump to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on last element → jump to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1} // Allows programmatic focus without tab-order inclusion
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#888', padding: '0.25rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#27ae60', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReferenceDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>Full Accessible Modal</h3>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
        Features: portal, focus-in, focus-trap, focus-return, Escape, scroll lock, ARIA dialog pattern.
        Open with keyboard, Tab through all elements, close with Escape — all should work perfectly.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none', background: '#27ae60', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
        >
          Open Reference Modal
        </button>
        <div style={{ fontSize: '0.85rem', color: '#555', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>Try: Tab cycles through fields → Close → (wraps back)</div>
          <div>Try: Escape closes. Focus returns to this button.</div>
        </div>
      </div>

      <Modal_Reference
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Reference Implementation"
        triggerRef={triggerRef as React.RefObject<HTMLElement | null>}
      >
        <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
          This is a fully accessible modal. Focus is trapped here while it's open.
          Try pressing Tab repeatedly — it cycles through all interactive elements.
        </p>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          First name:
          <input type="text" placeholder="Alice" style={{ display: 'block', width: '100%', padding: '0.4rem 0.6rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }} />
        </label>
        <label style={{ display: 'block', marginBottom: '0.75rem' }}>
          Email:
          <input type="email" placeholder="alice@example.com" style={{ display: 'block', width: '100%', padding: '0.4rem 0.6rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" />
          Send me updates
        </label>
      </Modal_Reference>
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Did you use createPortal to render into document.body?',
    'Did you add tabIndex={-1} to the dialog container so it can receive focus?',
    'Did you focus the dialog (or first focusable element) on open?',
    'Did you save the trigger element BEFORE opening and restore focus on close?',
    'Does the focus trap handle both Tab AND Shift+Tab correctly at boundaries?',
    'Did you handle the Escape key to close the modal?',
    'Did you add role="dialog", aria-modal="true", aria-labelledby?',
    'Did you implement scroll lock and restore the original overflow on cleanup?',
  ];

  return (
    <div style={{ background: '#fffde7', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f9a825' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Interview Checklist</h3>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '0.9rem' }}>
            <span style={{ fontFamily: 'monospace', color: '#f57f17', marginRight: '0.5rem' }}>□</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Modal / Dialog</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Build a production-quality accessible modal from scratch.
      Start with the portal basics, then add all three focus management requirements and ARIA.
      Complete both exercises before reading the reference.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Exercise1_BasicModal />
      <Exercise2_AccessibleModal />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
