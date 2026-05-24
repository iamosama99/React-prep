// ============================================================
// Topic:   Portals
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
//
// IMPORTANT: For portals to work, your HTML needs a portal target.
//   In index.html, add inside <body>:
//     <div id="modal-root"></div>
//     <div id="toast-root"></div>
//   Without this, createPortal will throw "Target container is not a DOM element."
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Exercise 1: Modal that Escapes overflow:hidden ───────────
//
// SITUATION
//   The card below has `overflow: hidden` — everything inside it is clipped.
//   A "modal" rendered as a child of that card would be clipped too.
//   A portal solves this by rendering into document.getElementById('modal-root')
//   (at the <body> level), while keeping the component logically inside the card.
//
// YOUR TASK — Build <Modal> using createPortal:
//
//   Props: isOpen, onClose, title, children
//
//   STEP 1: Return null when !isOpen (no portal at all)
//   STEP 2: Use createPortal(JSX, document.getElementById('modal-root'))
//   STEP 3: Structure:
//     - Backdrop: full-screen overlay with onClick={onClose} (closes on click-outside)
//     - Dialog: centered box with title + children + Close button
//       - Add role="dialog" aria-modal="true" aria-labelledby="modal-title"
//       - Stop propagation on the dialog div so clicking inside doesn't close it
//
//   STEP 4: Focus trap (simplified version):
//     - When the modal opens, focus the close button automatically
//     - Use a ref on the close button + useEffect to call .focus()
//
// VERIFY:
//   1. The modal renders ABOVE the clipped container (not clipped by overflow:hidden)
//   2. Clicking the backdrop closes it; clicking inside the dialog doesn't
//   3. In the DOM inspector, the modal is inside #modal-root, not inside .clipped-card

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  // TODO: use createPortal to render into document.getElementById('modal-root')
  // const modalContent = (
  //   <div  /* backdrop */ onClick={onClose} style={{ position: 'fixed', inset: 0, ... }}>
  //     <div  /* dialog */ role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
  //       <h2 id="modal-title">{title}</h2>
  //       {children}
  //       <button onClick={onClose}>Close</button>
  //     </div>
  //   </div>
  // );
  // return createPortal(modalContent, document.getElementById('modal-root'));

  // Stub — renders inline (not in a portal yet — this will be clipped)
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ background: 'white', padding: 24, borderRadius: 12, maxWidth: 360 }}>
        <h3 style={{ margin: '0 0 12px' }}>{title}</h3>
        {children}
        <button onClick={onClose} style={{ marginTop: 12 }}>Close</button>
      </div>
    </div>
  );
}

function Exercise1() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section>
      <h2>Exercise 1 — Modal Escaping overflow:hidden</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        The blue card below has <code>overflow: hidden</code>. Without a portal,
        the modal is clipped. With a portal, it renders into #modal-root at body level
        and appears above everything. Check the DOM: the modal should be in #modal-root.
      </p>

      {/* This container clips everything inside it */}
      <div style={{
        border: '3px solid #3b82f6',
        borderRadius: 12,
        padding: 24,
        maxWidth: 400,
        overflow: 'hidden', // ← the problem
        position: 'relative',
        height: 120,
        background: '#eff6ff',
      }}>
        <p style={{ margin: '0 0 12px', fontWeight: 'bold', color: '#1d4ed8' }}>
          📦 Card with overflow: hidden
        </p>
        <button onClick={() => setIsOpen(true)}>Open Modal</button>

        {/* Modal rendered as a child of the clipped card */}
        {/* Before portal: clipped. After portal: escapes to #modal-root */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Escaped Modal">
          <p>If you see this without clipping, the portal works!</p>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Inspect the DOM — this dialog should be inside #modal-root at body level,
            NOT inside the blue card.
          </p>
        </Modal>
      </div>
    </section>
  );
}


// ─── Exercise 2: The Event Bubbling Gotcha ───────────────────
//
// SITUATION
//   A common pattern for closing dropdowns/modals: listen for clicks on the
//   document and close if the click was "outside" the component. But with
//   portals, this breaks in a non-obvious way.
//
//   PROBLEM: React events bubble through the REACT tree, not the DOM tree.
//   A click inside a portal (which renders into document.body) still bubbles
//   through React to the portal's parent components. So a document-level
//   click listener fires for every click — including inside the portal.
//
// THE DEMO BELOW has two dropdown implementations:
//
//   BrokenDropdown: listens on `document` for clicks to close. Since the portal
//     content is in document.body, ALL clicks (including inside the dropdown)
//     reach document → the dropdown closes immediately after opening.
//
//   FixedDropdown: uses a ref + event.target check:
//     document.addEventListener('click', (e) => {
//       if (!dropdownRef.current?.contains(e.target)) close();
//     })
//     This only closes when the click is OUTSIDE the dropdown's DOM node.
//
// YOUR TASK: Implement FixedDropdown using the ref.contains() approach.

function DropdownPortal({ children, targetRef }) {
  if (!targetRef?.current) return null;
  const rect = targetRef.current.getBoundingClientRect();

  return createPortal(
    <div style={{
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      minWidth: 180,
      zIndex: 1000,
    }}>
      {children}
    </div>,
    document.body
  );
}

function BrokenDropdown() {
  const [open, setOpen] = useState(false);
  const buttonRef = { current: null };

  useEffect(() => {
    if (!open) return;
    // BUG: this fires for clicks INSIDE the dropdown too
    // because all clicks bubble to document
    const handler = () => setOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  return (
    <div>
      <button ref={r => { buttonRef.current = r; }} onClick={() => setOpen(true)}>
        Broken dropdown ▼
      </button>
      {open && (
        <DropdownPortal targetRef={buttonRef}>
          <div style={{ padding: 8 }}>
            <p style={{ margin: '0 0 4px', padding: '8px 12px', fontSize: 13 }}>Edit</p>
            <p style={{ margin: 0, padding: '8px 12px', fontSize: 13 }}>Delete</p>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
}

import { useRef } from 'react';

function FixedDropdown() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      // TODO: check if the click was outside BOTH the button AND the dropdown
      // if (!buttonRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
      //   setOpen(false);
      // }
      //
      // For now, the bug is still here — fix it above:
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div>
      <button ref={buttonRef} onClick={() => setOpen(o => !o)}>
        Fixed dropdown ▼
      </button>
      {open && (
        <DropdownPortal targetRef={buttonRef}>
          <div ref={dropdownRef} style={{ padding: 8 }}>
            <p style={{ margin: '0 0 4px', padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>✏️ Edit</p>
            <p style={{ margin: 0, padding: '8px 12px', fontSize: 13, color: '#dc2626', cursor: 'pointer' }}>🗑 Delete</p>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
}

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — The Event Bubbling Gotcha</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Both dropdowns render their content via a portal into document.body.
        The broken one uses <code>document.addEventListener('click', close)</code>
        — it closes immediately because the click on the button itself reaches document.
        The fixed one uses <code>ref.contains(e.target)</code> to only close
        when clicking truly outside.
      </p>
      <div style={{ display: 'flex', gap: 32, paddingBottom: 200 }}>
        <div>
          <h4 style={{ fontSize: 13, color: '#dc2626', marginTop: 0 }}>Broken</h4>
          <BrokenDropdown />
          <p style={{ fontSize: 12, color: '#dc2626' }}>Closes immediately — can't interact</p>
        </div>
        <div>
          <h4 style={{ fontSize: 13, color: '#16a34a', marginTop: 0 }}>Fixed</h4>
          <FixedDropdown />
          <p style={{ fontSize: 12, color: '#16a34a' }}>Stays open; closes on outside click</p>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 3: SSR Guard + Context Across Portal ────────────
//
// SITUATION
//   Two things you need to know about portals in real apps:
//
//   PROBLEM 1 — SSR: createPortal requires a DOM node. In Next.js / SSR
//   environments, `document` doesn't exist on the server. A naive portal
//   causes hydration mismatch errors.
//
//   PROBLEM 2 — Context: Does a Context provider above a portal still provide
//   its value to components INSIDE the portal? (Spoiler: yes — because Context
//   reads from the React component tree, not the DOM tree.)
//
// YOUR TASK
//
//   PART A — Add SSR guard to Modal2:
//     - Add: const [mounted, setMounted] = useState(false);
//     - Add: useEffect(() => setMounted(true), []);
//     - Change: if (!isOpen || !mounted) return null;
//     This ensures the portal only renders client-side (after hydration).
//
//   PART B — Prove Context works across portal boundaries:
//     - A ThemeContext is provided ABOVE the modal in the React tree
//     - A component INSIDE the modal reads from that context
//     - Even though the modal renders in #modal-root (different DOM location),
//       the context value should be available
//
// VERIFY: toggle the theme — the component inside the modal should update.

const ThemeContext = createContext('light');

function ThemedBadge() {
  const theme = useContext(ThemeContext);
  return (
    <div style={{
      padding: '6px 12px',
      background: theme === 'dark' ? '#1e293b' : '#f1f5f9',
      color: theme === 'dark' ? 'white' : '#1e293b',
      borderRadius: 6,
      fontSize: 13,
      display: 'inline-block',
    }}>
      Theme from Context: <strong>{theme}</strong>
    </div>
  );
}

function Modal2({ isOpen, onClose, title, children }) {
  // TODO (Part A): add the mounted guard
  // const [mounted, setMounted] = useState(false);
  // useEffect(() => setMounted(true), []);
  // if (!isOpen || !mounted) return null;

  if (!isOpen) return null;

  const content = (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 100 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin: '0 0 16px' }}>{title}</h3>
        {children}
        <button onClick={onClose} style={{ marginTop: 16, display: 'block' }}>Close</button>
      </div>
    </div>
  );

  const target = document.getElementById('modal-root');
  return target ? createPortal(content, target) : content;
}

import { useContext } from 'react';

function Exercise3() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={theme}>
      <section>
        <h2>Exercise 3 — SSR Guard + Context Across Portal Boundary</h2>
        <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
          The ThemeContext.Provider wraps this section. The modal renders in #modal-root
          (different DOM location) but still reads the correct theme value —
          because Context tracks the React tree, not the DOM tree.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setIsOpen(true)}>Open modal</button>
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            Toggle theme (current: {theme})
          </button>
        </div>

        <p style={{ fontSize: 13 }}>Context badge outside modal: <ThemedBadge /></p>

        <Modal2 isOpen={isOpen} onClose={() => setIsOpen(false)} title="Context Across Portal">
          <p style={{ fontSize: 14 }}>
            This content is in a portal (different DOM node), but the Theme Context
            is still accessible:
          </p>
          <ThemedBadge />
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            Toggle the theme while this modal is open — the badge updates.
            That's because Context flows through the React tree, not the DOM.
          </p>
        </Modal2>
      </section>
    </ThemeContext.Provider>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 09 — Portals</h1>
      <p style={{ fontSize: 13, background: '#fef9c3', padding: 12, borderRadius: 6 }}>
        ⚠️ Add <code>&lt;div id="modal-root"&gt;&lt;/div&gt;</code> to your index.html &lt;body&gt;
        for portals to work. Without it, createPortal throws.
      </p>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
