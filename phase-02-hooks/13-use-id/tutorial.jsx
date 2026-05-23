// ============================================================
// Topic:   useId
// Phase:   2 — Hooks
// ============================================================
//
// The problem it solves:
//   DOM accessibility requires matching id/htmlFor pairs on
//   label↔input.  Hard-coding IDs breaks when the same component
//   renders multiple times.  Math.random breaks SSR hydration.
//   useId generates a stable, SSR-safe, unique-per-instance ID.
// ============================================================

import { useId, useState } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Why Math.random is wrong for IDs — and what useId fixes.
//
// The Broken column uses Math.random() to generate IDs.
// The Fixed column uses useId().
//
// Steps:
//   1. Run the app — notice the Broken column shows duplicate label
//      behavior: clicking the label for "Email" might focus the wrong field.
//      (In a real SSR app it would also throw a hydration warning.)
//   2. Observe how many times the Broken component renders:
//      Every re-render creates NEW random IDs, breaking the associations.
//   3. Add a "Force re-render" button and click it — the Broken form
//      gets new IDs on every render (click a label, it may miss).
//   4. The Fixed form always has the same IDs for its instance.
//
// Complete the FixedForm by replacing `randomId` with useId().

function BrokenForm() {
  // ❌ New IDs on every render — SSR mismatch, accessibility broken
  const nameId  = 'name-'  + Math.random().toString(36).slice(2, 7);
  const emailId = 'email-' + Math.random().toString(36).slice(2, 7);

  return (
    <div style={styles.form}>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#f44336' }}>
        ❌ Math.random IDs (change every render)
      </p>
      <label htmlFor={nameId} style={styles.label}>
        Name
        <input id={nameId} style={styles.input} placeholder="Alice" />
      </label>
      <label htmlFor={emailId} style={styles.label}>
        Email
        <input id={emailId} style={styles.input} placeholder="alice@example.com" />
      </label>
      <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
        name ID: <code>{nameId}</code><br />
        email ID: <code>{emailId}</code>
      </p>
    </div>
  );
}

function FixedForm() {
  // TODO: const id = useId();
  // Derive field IDs: `${id}-name`, `${id}-email`
  const id = 'fixed-placeholder'; // replace with useId()
  const nameId  = `${id}-name`;
  const emailId = `${id}-email`;

  return (
    <div style={styles.form}>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#4caf50' }}>
        ✅ useId (stable across renders)
      </p>
      <label htmlFor={nameId} style={styles.label}>
        Name
        <input id={nameId} style={styles.input} placeholder="Alice" />
      </label>
      <label htmlFor={emailId} style={styles.label}>
        Email
        <input id={emailId} style={styles.input} placeholder="alice@example.com" />
      </label>
      <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
        name ID: <code>{nameId}</code><br />
        email ID: <code>{emailId}</code>
      </p>
    </div>
  );
}

function Exercise1() {
  const [, forceRender] = useState(0);

  return (
    <div style={styles.box}>
      <button onClick={() => forceRender(n => n + 1)}>
        Force re-render (watch Broken IDs change; Fixed stays stable)
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <BrokenForm />
        <FixedForm />
      </div>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Multiple instances of the same component — each gets unique IDs.
//
// If three <ContactCard /> components render on the same page,
// they must all have DIFFERENT IDs.  useId handles this automatically
// because it's per-component-instance.
//
// Steps:
//   1. Implement ContactCard using useId() to generate IDs for
//      its name / phone / email fields.
//   2. Render three <ContactCard /> below.
//   3. Inspect the rendered HTML (DevTools → Elements).
//      Each card's inputs must have distinct id attributes.
//   4. Click any label — it must focus only THAT card's field.
//
// Bonus: add an ARIA description field using id from the same useId call.
//   <span id={`${id}-desc`}>Primary contact</span>
//   <input aria-describedby={`${id}-desc`} ... />

function ContactCard({ title }) {
  // TODO: const id = useId();
  const id = title.toLowerCase().replace(/\s/g, '-'); // bad practice — use useId() instead

  return (
    <div style={styles.form}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', fontSize: 13 }}>{title}</p>
      <label htmlFor={`${id}-name`} style={styles.label}>
        Name
        <input id={`${id}-name`} style={styles.input} />
      </label>
      <label htmlFor={`${id}-phone`} style={styles.label}>
        Phone
        <input id={`${id}-phone`} style={styles.input} />
      </label>
      <label htmlFor={`${id}-email`} style={styles.label}>
        Email
        <input id={`${id}-email`} style={styles.input} />
      </label>
    </div>
  );
}

function Exercise2() {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
        Three instances of ContactCard — all must have unique IDs.
        Click any label to confirm it focuses only THAT card's field.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <ContactCard title="Primary Contact" />
        <ContactCard title="Secondary Contact" />
        <ContactCard title="Emergency Contact" />
      </div>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: useId for ARIA attributes — accessible accordion.
//
// An accordion requires:
//   <button aria-controls={panelId} aria-expanded={open}>Toggle</button>
//   <div id={panelId} role="region" aria-labelledby={buttonId}>…</div>
//
// Both IDs must be stable and unique per accordion instance.
// Multiple accordions on the page must not share IDs.
//
// Steps:
//   1. Add useId() to generate a base ID.
//   2. Derive: buttonId = `${id}-btn`, panelId = `${id}-panel`
//   3. Wire up aria-controls, aria-expanded, aria-labelledby.
//   4. Render two <Accordion /> instances and verify both work
//      independently in screen reader mode (or inspect HTML).

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  // TODO: const id = useId();
  const id = 'accordion'; // ← WRONG for multiple instances — replace with useId()
  const buttonId = `${id}-btn`;
  const panelId  = `${id}-panel`;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
      <button
        id={buttonId}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 14px',
          background: '#f5f5f5', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', fontSize: 14,
        }}
      >
        {title}
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          style={{ padding: '10px 14px', fontSize: 13 }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Exercise3() {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
        Inspect the HTML — both accordions must have UNIQUE button and panel IDs.
        Currently they share 'accordion-btn'/'accordion-panel' (bug).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Accordion title="What is useId?">
          <p style={{ margin: 0 }}>
            useId generates a stable, unique string ID per component instance.
            It's SSR-safe and deterministic.
          </p>
        </Accordion>
        <Accordion title="When should I use it?">
          <p style={{ margin: 0 }}>
            Whenever you need to associate DOM elements: label↔input,
            aria-controls↔panel, aria-describedby↔description.
          </p>
        </Accordion>
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// What useId must NEVER be used for: list keys.
//
// Keys must be stable across reorders. useId changes per instance
// (remounts get new IDs). Using it as a key causes subtle bugs.
//
// Steps:
//   1. Observe: if you shuffle the list below using useId as key,
//      React remounts components (losing local state).
//   2. The correct approach: use stable data IDs or indices as keys.

const LIST = [
  { id: 'a', label: 'First' },
  { id: 'b', label: 'Second' },
  { id: 'c', label: 'Third' },
];

function ListItemBad({ label }) {
  const id = useId(); // ← never use as a key
  return <li style={{ fontSize: 13 }}>{label} — id: {id}</li>;
}

function Playground() {
  const [reversed, setReversed] = useState(false);
  const items = reversed ? [...LIST].reverse() : LIST;

  return (
    <div style={styles.box}>
      <button onClick={() => setReversed(r => !r)}>Reverse list</button>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        ❌ Using useId as key (do not do this):
      </p>
      <ul style={{ margin: 0 }}>
        {items.map(item => (
          // BUG: using useId() RESULT as key is impossible — useId
          // is called inside the component, not at this level.
          // The lesson: list keys should be stable data IDs (item.id).
          <ListItemBad key={item.id} label={item.label} />
        ))}
      </ul>
      <p style={{ fontSize: 12, color: '#4caf50', margin: 0 }}>
        ✅ Correct: key={'{item.id}'} uses the stable data identifier.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 720 }}>
      <h1>useId</h1>

      <h2>Exercise 1 — Math.random vs useId</h2>
      <p style={styles.goal}>
        Replace Math.random with useId in FixedForm. IDs stay stable on re-render.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Multiple Instances, Unique IDs</h2>
      <p style={styles.goal}>
        Each ContactCard gets its own ID namespace — no collisions.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — ARIA Attributes on Accordion</h2>
      <p style={styles.goal}>
        Wire aria-controls / aria-expanded / aria-labelledby with useId.
      </p>
      <Exercise3 />

      <h2>Playground — Never Use useId as a List Key</h2>
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
  form: {
    border: '1px solid #eee', borderRadius: 6,
    padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8,
  },
  label: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 },
  input: { padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13 },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
