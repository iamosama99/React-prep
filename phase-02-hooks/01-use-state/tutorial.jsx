// ============================================================
// Topic:   useState
// Phase:   2 — Hooks
// ============================================================
//
// How to run:
//   Paste this file into https://stackblitz.com/new/react
//   or: npm create vite@latest my-app -- --template react
// ============================================================

import { useState, useEffect } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Functional updater — the right tool when new state
//        depends on old state.
//
// The bug below produces the wrong count when you click fast.
//
// Steps:
//   1. Run the app and click "Increment ×3" once.
//      You'll see the count goes to 1 instead of 3.
//   2. Understand WHY it's wrong (read the comment).
//   3. Fix it using the functional updater form  setCount(prev => prev + 1)
//      so all three increments chain correctly.
//
// Success: clicking "Increment ×3" once always adds exactly 3.
//
// Bonus: add a "Reset" button that sets count back to 0.

function Exercise1() {
  const [count, setCount] = useState(0);

  function tripleIncrement() {
    // BUG: all three calls close over the same stale `count` value.
    // If count is 5, each call schedules setCount(6), not 6→7→8.
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return (
    <div style={styles.box}>
      <p>Count: <strong>{count}</strong></p>
      <button onClick={tripleIncrement}>Increment ×3</button>
      {/* TODO: add a Reset button */}
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Object state — useState does NOT merge like class setState.
//
// The form below has a bug: typing in "name" wipes out "email"
// and vice versa.
//
// Steps:
//   1. Run the app, type something in Name, then type in Email.
//      Notice the Name field clears when you touch Email.
//   2. Fix the setter so it spreads existing fields before overriding.
//   3. Add a third field: "role" (a <select> with options
//      'Engineer', 'Designer', 'Manager').
//
// Success: all three fields are independent and persist while you
//          edit the others.

function Exercise2() {
  const [form, setForm] = useState({ name: '', email: '' });

  function handleChange(field, value) {
    // BUG: this replaces the whole object, losing the other field.
    setForm({ [field]: value });
  }

  return (
    <div style={styles.box}>
      <label style={styles.label}>
        Name
        <input
          value={form.name}
          onChange={e => handleChange('name', e.target.value)}
        />
      </label>
      <label style={styles.label}>
        Email
        <input
          value={form.email}
          onChange={e => handleChange('email', e.target.value)}
        />
      </label>
      {/* TODO: add Role <select> here */}
      <pre style={{ fontSize: 12 }}>{JSON.stringify(form, null, 2)}</pre>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Lazy initialization — compute initial state only once,
//        not on every render.
//
// Build a counter whose initial value is loaded from localStorage.
// When the counter changes, persist it back to localStorage.
//
// Requirements:
//   a) Initial state reads localStorage (key: 'ex3-count').
//      Use lazy init so JSON.parse runs ONCE, not every render.
//   b) An effect writes the count back to localStorage whenever it changes.
//   c) Buttons: Increment, Decrement, Reset (resets to 0, also clears storage).
//
// Success: refresh the page — the count survives.
//
// Hint for (a):
//   useState(() => JSON.parse(localStorage.getItem('ex3-count')) ?? 0)
//              ↑ function form — React calls this only on mount

function Exercise3() {
  // TODO: replace with lazy initialization from localStorage
  const [count, setCount] = useState(0);

  // TODO: add a useEffect that persists count to localStorage

  return (
    <div style={styles.box}>
      <p>Count (persisted): <strong>{count}</strong></p>
      {/* TODO: Increment / Decrement / Reset buttons */}
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Use this area to answer the "Check yourself" questions from notes.md
//
//  Q1: After setCount(5), what does console.log(count) show?
//  Q2: Call setState({ name: 'Alice' }) twice — how many re-renders?
//  Q3: What is Object.is bailout?  Try setState(5) twice.
//
// Experiment freely — nothing here is graded.

function Playground() {
  const [value, setValue] = useState(0);

  return (
    <div style={styles.box}>
      <p>value = {value}</p>
      <button onClick={() => {
        setValue(42);
        // What does console.log(value) print here — and why?
        console.log('value after setValue(42):', value);
      }}>
        Set to 42 &amp; log
      </button>
      <button onClick={() => setValue(42)}>Set to 42 again (bailout?)</button>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1>useState</h1>

      <h2>Exercise 1 — Functional Updater</h2>
      <p style={styles.goal}>
        Fix tripleIncrement so clicking once always adds exactly 3.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Object State (no auto-merge)</h2>
      <p style={styles.goal}>
        Fix the form so editing one field doesn't wipe out the others.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Lazy Initialization + localStorage</h2>
      <p style={styles.goal}>
        Persist the counter to localStorage using lazy init and useEffect.
      </p>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const styles = {
  box: {
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 14,
  },
  goal: {
    fontSize: 13,
    color: '#555',
    marginTop: 0,
  },
};
