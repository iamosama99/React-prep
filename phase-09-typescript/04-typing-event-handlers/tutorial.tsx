// ============================================================
// Topic:   Typing Event Handlers
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 04-typing-event-handlers
//
// APPROACH:
//   Exercise 1 — Inline vs extracted handlers: when TypeScript infers vs. needs help
//   Exercise 2 — e.target vs e.currentTarget: the most common type trap
//   Exercise 3 — Multi-input form + keyboard shortcuts (React.*EventHandler aliases)
//
// The golden rule: inline handlers get inference for free.
// Extracted handlers always need an explicit annotation on the event parameter.
// ============================================================

import React, { useState, useRef } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', boxSizing: 'border-box', marginTop: 4,
};
const label: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 2,
};
const errorStyle: React.CSSProperties = {
  color: '#dc2626', fontSize: 12, marginTop: 2,
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Inline vs extracted handlers
//
// TypeScript INFERS the event type when the handler is inline.
// TypeScript NEEDS you to annotate the event type when the handler is extracted.
//
// The annotation pattern is always:
//   React.<EventKind>Event<HTMLElementType>
//
// Common pairs:
//   onChange on <input>     → React.ChangeEvent<HTMLInputElement>
//   onChange on <select>    → React.ChangeEvent<HTMLSelectElement>
//   onChange on <textarea>  → React.ChangeEvent<HTMLTextAreaElement>
//   onClick on <button>     → React.MouseEvent<HTMLButtonElement>
//   onSubmit on <form>      → React.FormEvent<HTMLFormElement>
//   onKeyDown on <input>    → React.KeyboardEvent<HTMLInputElement>
//
// The *Handler aliases are clean for prop typing:
//   React.ChangeEventHandler<HTMLInputElement>  ≡  (e: React.ChangeEvent<HTMLInputElement>) => void
//   React.MouseEventHandler<HTMLButtonElement>  ≡  (e: React.MouseEvent<HTMLButtonElement>) => void
//
// CHECK YOURSELF:
//   • Hover over `e` in the inline handler — what does TypeScript infer?
//   • What error appears if you remove the annotation from `handleChange`?
//   • What is React.ChangeEventHandler<HTMLInputElement> equivalent to?
// ─────────────────────────────────────────────────────────────

// ─── Extracted handlers must be annotated ────────────────────

// ✅ Annotated — e has full type information
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log('Input value:', e.target.value);
  //                          ^^^^^^^^^^^^^^ string — typed correctly
}

function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
  console.log('Selected:', e.target.value);
}

function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  console.log('Submitted:', Object.fromEntries(data));
}

// Using the *Handler alias for prop typing
type SearchProps = {
  // Clean alternative to (event: React.ChangeEvent<HTMLInputElement>) => void
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

function SearchInput({ onChange, onKeyDown }: SearchProps) {
  return <input onChange={onChange} onKeyDown={onKeyDown} placeholder="Search…" style={inputStyle} />;
}

function Exercise1() {
  const [value, setValue] = useState('');

  return (
    <div>
      <p style={hint}>
        Extracted handlers need annotation. Inline handlers get inference for free.
        Open the console (F12) to see each handler log its typed event data.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={label}>Name (extracted handler, annotated)</label>
          {/* `handleChange` is a standalone function — it must be annotated */}
          <input name="name" onChange={handleChange} style={inputStyle} />
        </div>

        <div>
          <label style={label}>Language (inline handler — inferred)</label>
          {/* Inline: TypeScript infers e as React.ChangeEvent<HTMLSelectElement> */}
          <select name="lang" onChange={(e) => console.log(e.target.value)} style={{ ...inputStyle, display: 'block' }}>
            <option value="ts">TypeScript</option>
            <option value="js">JavaScript</option>
            <option value="rs">Rust</option>
          </select>
        </div>

        <div>
          <label style={label}>Message (React.*Handler alias in props)</label>
          <SearchInput
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') console.log('Enter pressed, value:', e.currentTarget.value); }}
          />
          {value && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Live: "{value}"</p>}
        </div>

        <button type="submit" style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>
          Submit (check console)
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — e.target vs e.currentTarget: the key distinction
//
// This trips up most TypeScript developers.
//
//   e.currentTarget — the element the handler is ATTACHED TO
//                     → always typed as the generic parameter (e.g. HTMLDivElement)
//
//   e.target        — the element that ACTUALLY FIRED the event (may be a child)
//                     → typed as EventTarget (wide base type, no element methods)
//
// In this exercise, clicking anywhere on the card fires a click handler
// on the outer div. Try clicking the inner button — notice:
//   • e.currentTarget is the div (where the handler is attached)
//   • e.target is the button that was actually clicked
//
// This also shows WHERE to read values: always prefer currentTarget.
// TypeScript enforces this by typing e.target as EventTarget (no .value, etc.)
//
// CHECK YOURSELF:
//   • Why does TypeScript type e.target as EventTarget instead of the element?
//   • When would you intentionally use e.target? (hint: event delegation)
//   • For input onChange, why is e.target.value safe even though target is EventTarget?
//     (hint: look at what React.ChangeEvent's target field is actually typed as)
// ─────────────────────────────────────────────────────────────

function Exercise2() {
  const [log, setLog] = useState<Array<{ label: string; value: string }>>([]);

  const addLog = (label: string, value: string) =>
    setLog(prev => [{ label, value }, ...prev].slice(0, 6));

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // ✅ currentTarget is always the div — fully typed as HTMLDivElement
    const ct = e.currentTarget;
    addLog('currentTarget.tagName', ct.tagName); // "DIV"
    addLog('currentTarget.id',      ct.id);      // "click-card"

    // ⚠️ target could be any child — TypeScript types it as EventTarget
    // To access element-specific properties, narrow it:
    const t = e.target as HTMLElement;
    addLog('target.tagName', t.tagName); // "BUTTON" or "SPAN" etc.
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // For ChangeEvent, React narrows the target type for you:
    // e.target is typed as EventTarget & HTMLInputElement — so .value is safe
    addLog('input e.target.value', e.target.value);
    addLog('input e.target.name',  e.target.name);
    //                              ^^^^^^^ Because: ChangeEvent<T>["target"] = EventTarget & T
  };

  return (
    <div>
      <p style={hint}>
        Click the card, the button, or the label below. The log shows which element
        is <code>currentTarget</code> (always the card div) vs <code>target</code>
        (whatever you actually clicked).
      </p>

      <div
        id="click-card"
        onClick={handleCardClick}
        style={{ ...card, borderColor: '#818cf8', cursor: 'pointer', userSelect: 'none' }}
      >
        <strong style={{ display: 'block', marginBottom: 8, pointerEvents: 'none' }}>
          Click anywhere in this card →
        </strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={e => e.stopPropagation()}
            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #818cf8', cursor: 'pointer' }}>
            Inner button (stops propagation)
          </button>
          <span style={{ padding: '4px 12px', borderRadius: 6, background: '#ede9fe' }}>
            Inner span (lets event bubble)
          </span>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={label}>Input (ChangeEvent — target.value is typed)</label>
        <input name="demo" onChange={handleInputChange} placeholder="Type here…" style={inputStyle} />
      </div>

      {log.length > 0 && (
        <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', borderRadius: 6, padding: 10 }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: i === 0 ? '#1e40af' : '#6b7280' }}>
              {l.label}: <strong>{l.value || '(empty)'}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Multi-input form + keyboard shortcuts
//
// Two patterns shown together:
//
// A) A single onChange handler for multiple inputs using `name` attribute.
//    TypeScript can't prove e.target.name is a keyof FormState — but we can
//    cast it. This is acceptable because we control the input names.
//
// B) Keyboard shortcut with modifier key.
//    e.key is a string ("Enter", "Escape", "k", …)
//    e.metaKey / e.ctrlKey are booleans
//    Combine them for Cmd+K / Ctrl+K shortcuts.
//
// CHECK YOURSELF:
//   • Why is `e.target.name as keyof FormState` a reasonable type assertion here?
//   • Why is e.key preferred over e.keyCode? (hint: deprecated, number vs string)
//   • What's the difference between e.metaKey (Mac ⌘) and e.ctrlKey (Windows Ctrl)?
// ─────────────────────────────────────────────────────────────

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

function Exercise3() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '', remember: false });
  const [submitted, setSubmitted] = useState<LoginForm | null>(null);
  const [shortcutLog, setShortcutLog] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  // ─── A) Single handler for multiple text inputs ───────────
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // e.target.name is `string` — we assert it's a key of LoginForm
    // Safe because we control what `name` attributes we put on inputs
    const key = e.target.name as keyof LoginForm;
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  // ─── Checkbox is separate — e.target.checked, not .value ─────────
  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, remember: e.target.checked }));
  };

  // ─── B) Keyboard shortcut: Cmd+K focuses the email input ──────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isCommandK = (e.metaKey || e.ctrlKey) && e.key === 'k';
    const isEscape   = e.key === 'Escape';

    if (isCommandK) {
      e.preventDefault();
      emailRef.current?.focus();
      setShortcutLog('⌘K pressed — focused email input');
    } else if (isEscape) {
      setShortcutLog('Escape pressed — clear shortcut');
      (document.activeElement as HTMLElement)?.blur();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted({ ...form });
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <p style={hint}>
        Press <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> anywhere in this section to focus the email field.
        One <code>onChange</code> handler drives all text inputs via <code>e.target.name</code>.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={label} htmlFor="email">Email</label>
          {/* Both inputs use the same handleTextChange — distinguished by name */}
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleTextChange}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={label} htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleTextChange}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            name="remember"
            checked={form.remember}
            onChange={handleCheck}
          />
          Remember me (uses e.target.checked, not .value)
        </label>

        <button type="submit" style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}>
          Log in
        </button>
      </form>

      {shortcutLog && (
        <p style={{ marginTop: 8, fontSize: 13, color: '#7c3aed', fontFamily: 'monospace' }}>
          Shortcut: {shortcutLog}
        </p>
      )}

      {submitted && (
        <div style={{ ...card, marginTop: 12, borderColor: '#86efac' }}>
          <strong style={{ color: '#16a34a' }}>Submitted:</strong>
          <pre style={{ margin: '6px 0 0', fontSize: 12 }}>{JSON.stringify(submitted, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Typing Event Handlers
      </h1>

      <h2>Exercise 1 — Inline vs extracted handlers</h2>
      <Exercise1 />

      <h2>Exercise 2 — e.target vs e.currentTarget</h2>
      <Exercise2 />

      <h2>Exercise 3 — Multi-input form & keyboard shortcuts</h2>
      <Exercise3 />
    </div>
  );
}
