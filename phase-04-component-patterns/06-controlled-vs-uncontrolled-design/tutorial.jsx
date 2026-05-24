// ============================================================
// Topic:   Controlled vs Uncontrolled Component Design
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState, useCallback, useRef } from 'react';

// ─── Exercise 1: Spot the Bug — Wrong Controlled Check ───────
//
// SITUATION
//   The <Disclosure> component below has a subtle bug in how it detects
//   whether it's in controlled mode. This is one of the most common mistakes
//   when implementing the dual-mode pattern.
//
// THE BUG
//   The current check is:  const isControlled = !!open;
//   This is WRONG. Why?
//     - When a caller passes open={false} (a valid controlled "closed" state),
//       !!open evaluates to false → the component thinks it's uncontrolled.
//     - The component then reads from its own internal state instead of the
//       prop — so the caller can't control it when it should be closed.
//
// YOUR TASK
//   1. Read through the broken Disclosure and identify all places the bug manifests.
//   2. Fix the check to:  const isControlled = open !== undefined;
//   3. Verify with the controlled demo: the external "Force Close" button
//      should close the disclosure even when open=false is passed.
//
// EXTRA GOTCHA to fix:
//   The `toggle` function currently mutates internal state even in controlled mode.
//   Fix it: in controlled mode, only call onOpenChange — don't touch internal state.

function BrokenDisclosure({ open, onOpenChange, defaultOpen = false, children, label }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // BUG: !!open is false when open={false}, which means isControlled
  // is false when the caller passes open={false} — wrong!
  const isControlled = !!open; // ← fix this line

  const isOpen = isControlled ? open : internalOpen;

  const toggle = useCallback(() => {
    // BUG: always updates internal state, even in controlled mode
    setInternalOpen(v => !v); // ← fix: only do this when !isControlled
    onOpenChange?.(!isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={toggle}
        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {label} {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && <div style={{ padding: '12px 16px' }}>{children}</div>}
    </div>
  );
}

function FixedDisclosure({ open, onOpenChange, defaultOpen = false, children, label }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // TODO: fix the controlled check
  const isControlled = !!open; // ← change this

  const isOpen = isControlled ? open : internalOpen;

  const toggle = useCallback(() => {
    const next = !isOpen;
    // TODO: only update internal state when NOT controlled
    setInternalOpen(next);
    onOpenChange?.(next);
  }, [isOpen, isControlled, onOpenChange]);

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={toggle}
        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {label} {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && <div style={{ padding: '12px 16px' }}>{children}</div>}
    </div>
  );
}

function Exercise1() {
  const [controlledOpen, setControlledOpen] = useState(true);

  return (
    <section>
      <h2>Exercise 1 — Spot the Bug: Wrong Controlled Check</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Both columns use controlled mode with <code>open={'{controlledOpen}'}</code>.
        Click "Force Close" — the Fixed version should respond; the Broken one won't
        (because <code>open={'{false}'}</code> makes it think it's uncontrolled).
      </p>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setControlledOpen(true)} style={{ marginRight: 8 }}>Force Open</button>
        <button onClick={() => setControlledOpen(false)}>Force Close</button>
        <span style={{ marginLeft: 12, fontSize: 13, color: '#64748b' }}>
          Controlled value: {String(controlledOpen)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h4 style={{ fontSize: 13, color: '#dc2626', marginTop: 0 }}>Broken (!!open check)</h4>
          <BrokenDisclosure
            open={controlledOpen}
            onOpenChange={setControlledOpen}
            label="Section A"
          >
            Content A — watch what happens when you "Force Close"
          </BrokenDisclosure>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h4 style={{ fontSize: 13, color: '#16a34a', marginTop: 0 }}>Fixed (open !== undefined)</h4>
          <FixedDisclosure
            open={controlledOpen}
            onOpenChange={setControlledOpen}
            label="Section B"
          >
            Content B — "Force Close" works correctly here
          </FixedDisclosure>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 2: Build useControllable ───────────────────────
//
// SITUATION
//   Every component that supports dual-mode (Accordion, Select, Modal, DatePicker)
//   needs the same boilerplate: detect controlled vs uncontrolled, pick the right
//   value, conditionally update internal state, always fire the callback.
//   This logic is worth extracting into a reusable hook.
//
// YOUR TASK — Build useControllable(controlledValue, onChange, defaultValue)
//
//   RETURNS: [value, setValue]  ← feels like useState to the consumer
//
//   RULES:
//   1. isControlled = controlledValue !== undefined
//   2. value = isControlled ? controlledValue : internalValue
//   3. setValue:
//       - Supports functional updates: setValue(v => !v) like useState
//       - When !isControlled: update internal state
//       - Always call onChange?.(nextValue)  ← callers listen in either mode
//   4. Wrap setValue in useCallback with the right dependencies
//      (hint: isControlled, value, onChange must be deps)
//
// Then use it to build a clean Modal that supports both modes.
// The sub-components below work with either mode — only the root changes.

function useControllable(controlledValue, onChange, defaultValue) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;

  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback((next) => {
    // TODO: resolve functional updates (next might be a function)
    // const nextValue = typeof next === 'function' ? next(value) : next;
    // if (!isControlled) setInternalValue(nextValue);
    // onChange?.(nextValue);
  }, [isControlled, value, onChange]);

  return [value, setValue];
}

function Modal({ open, defaultOpen = false, onOpenChange, title, children }) {
  const [isOpen, setIsOpen] = useControllable(open, onOpenChange, defaultOpen);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', zIndex: 100,
    }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={() => setIsOpen(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {children}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setIsOpen(false)}>Close</button>
          <button style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Exercise2() {
  const [controlledOpen, setControlledOpen] = useState(false);

  return (
    <section>
      <h2>Exercise 2 — Build useControllable</h2>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>Uncontrolled (Modal owns state)</h4>
          <Modal defaultOpen={false} title="Uncontrolled Modal">
            <p>This modal manages its own open/close state.</p>
            <p>The parent doesn't know if it's open — and doesn't need to.</p>
          </Modal>
          {/* Need a trigger since modal starts closed */}
          <p style={{ fontSize: 13, color: '#64748b' }}>
            ↑ Modal starts closed (defaultOpen=false) — once useControllable works,
            add a trigger button here that directly calls setIsOpen(true).
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>Controlled (parent owns state)</h4>
          <button onClick={() => setControlledOpen(true)}>Open modal</button>
          <Modal
            open={controlledOpen}
            onOpenChange={setControlledOpen}
            title="Controlled Modal"
          >
            <p>This modal's open state lives in the parent component.</p>
            <p>The parent can open/close it programmatically — e.g., after an API call.</p>
          </Modal>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
            State: {controlledOpen ? '🟢 open' : '⚫ closed'} (controlled by parent)
          </p>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 3: Mode-Switching Warning ──────────────────────
//
// SITUATION
//   A classic bug: a caller passes open={user?.preferences?.theme} and
//   during a loading state, `user` is null — so `open` accidentally becomes
//   undefined. The component silently flips from controlled to uncontrolled.
//   This is always a bug, and you should warn in development.
//
// YOUR TASK
//   Extend useControllable (or write useControllableWithWarning) to detect
//   when the component switches from controlled to uncontrolled or vice versa.
//   Use a useRef to remember the initial mode.
//
//   IMPLEMENTATION:
//     const wasControlledRef = useRef(isControlled);
//     if (process.env.NODE_ENV !== 'production') {
//       if (wasControlledRef.current !== isControlled) {
//         console.warn('Component changed from controlled to uncontrolled (or vice versa)...');
//       }
//       wasControlledRef.current = isControlled; // keep ref in sync
//     }
//
//   Then use the demo below to trigger the warning:
//   Click "Simulate loading bug" → the value prop becomes undefined → warning fires.
//
// WHAT TO LOOK FOR in the console:
//   A clear warning message explaining the mode switch, on the render where
//   `open` changes from a boolean to undefined.

function useControllableWithWarning(controlledValue, onChange, defaultValue, componentName = 'Component') {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;

  // TODO: add the mode-switch warning using useRef
  // const wasControlledRef = useRef(isControlled);
  // if (process.env.NODE_ENV !== 'production') { ... }

  const value = isControlled ? controlledValue : internalValue;

  const setValue = useCallback((next) => {
    const nextValue = typeof next === 'function' ? next(value) : next;
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  }, [isControlled, value, onChange]);

  return [value, setValue];
}

function MonitoredDisclosure({ open, onOpenChange, label, children }) {
  const [isOpen, setIsOpen] = useControllableWithWarning(open, onOpenChange, false, 'Disclosure');

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
      <button
        onClick={() => setIsOpen(v => !v)}
        style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: '#f8fafc', border: 'none', cursor: 'pointer' }}
      >
        {label} {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && <div style={{ padding: '12px 16px' }}>{children}</div>}
    </div>
  );
}

function Exercise3() {
  const [simulateBug, setSimulateBug] = useState(false);
  // When simulateBug is true, open becomes undefined (like user?.pref?.open when user is null)
  const openValue = simulateBug ? undefined : true;

  return (
    <section>
      <h2>Exercise 3 — Mode-Switching Warning</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Click "Simulate loading bug" to make the <code>open</code> prop become <code>undefined</code>
        (simulating what happens when a caller passes <code>user?.pref?.open</code> during loading).
        After implementing the warning, check the console — you should see a descriptive message.
      </p>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setSimulateBug(b => !b)}>
          {simulateBug ? '✅ Restore controlled value' : '⚠️ Simulate loading bug (set open=undefined)'}
        </button>
        <span style={{ marginLeft: 12, fontSize: 13, color: '#64748b' }}>
          open = {String(openValue)} ({openValue !== undefined ? 'controlled' : 'uncontrolled — BUG!'})
        </span>
      </div>

      <MonitoredDisclosure
        open={openValue}
        onOpenChange={() => {}}
        label="I should always be controlled"
      >
        This panel is meant to always be controlled externally.
        When open becomes undefined, something has gone wrong.
      </MonitoredDisclosure>

      <p style={{ fontSize: 12, color: '#94a3b8' }}>
        After adding the warning: the console will clearly say when the mode switches,
        making this bug trivial to find during development.
      </p>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 06 — Controlled vs Uncontrolled Design</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
