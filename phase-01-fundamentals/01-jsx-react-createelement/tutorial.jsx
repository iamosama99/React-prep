// ============================================================
// Topic:   JSX & React.createElement
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
// ============================================================
//
// How to run:
//   StackBlitz: https://stackblitz.com/new/react  (paste this as App.jsx)
//   Local Vite:  npm create vite@latest my-app -- --template react
//
// Workflow: read notes.md first, then work top-to-bottom.
// Each exercise targets one concept — keep notes.md open alongside this.
// ============================================================

import React, { useState } from 'react';
// ^ React is imported explicitly so you can call React.createElement() directly in
//   Exercise 1. In real production code you wouldn't need it (the new JSX transform
//   auto-injects the runtime import), but seeing the call is the whole point here.


// ─── Exercise 1 ──────────────────────────────────────────────
// THE MECHANIC — Write React.createElement by hand
//
// JSX is syntactic sugar. Every <tag> compiles to:
//   React.createElement(type, props, ...children)
// That call returns a plain JS object — a React element. Not a DOM node.
//
// WHAT TO DO:
//
//   Step A — Write the createElement equivalent for each JSX element below.
//             Store your answer in the matching `byHand_*` variable.
//
//   Step B — Open the browser console. The pairs are logged side-by-side.
//             Your byHand version should look identical to the JSX version.
//             Pay attention to the shape: { type, props, key, ref }.
//
//   Step C — Write the createElement equivalent for jsx_3 (the nested one).
//             Hint: children can themselves be createElement calls.
//             Work from the outermost element inward.
//
// Signature: React.createElement(type, props, ...children)
//   type     — string ('p', 'div') for DOM elements, or a component function
//   props    — object of attributes, or null if there are none
//   children — any number of strings, numbers, or nested elements

function Exercise1() {
  // --- Pair 1: element with no props, one text child ---
  const jsx_1 = <p>Hello</p>;
  const byHand_1 = null; // TODO: React.createElement(...)

  // --- Pair 2: element with two props and one text child ---
  const jsx_2 = <button className="btn" type="submit">Save</button>;
  const byHand_2 = null; // TODO: React.createElement(...)

  // --- Pair 3 (Step C): nested structure — requires nesting createElement calls ---
  const jsx_3 = (
    <div className="card">
      <h2>Profile</h2>
      <p>React engineer</p>
    </div>
  );
  const byHand_3 = null; // TODO: React.createElement(...)

  console.log('Pair 1 | jsx:    ', jsx_1);
  console.log('Pair 1 | byHand: ', byHand_1);
  console.log('Pair 2 | jsx:    ', jsx_2);
  console.log('Pair 2 | byHand: ', byHand_2);
  console.log('Pair 3 | jsx:    ', jsx_3);
  console.log('Pair 3 | byHand: ', byHand_3);

  return (
    <section>
      <p>Open DevTools console — each pair should log as identical objects.</p>
      <p>
        Notice: neither call touches the DOM. These are just plain JS objects.
        React only touches the DOM during the commit phase.
      </p>
    </section>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// GOTCHA HUNT — Find and fix 5 JSX bugs
//
// This component has 5 bugs covering the most common JSX mistakes.
// Some are commented out to keep the file compilable — your job is to
// rewrite those as correct JSX in the space provided.
//
// RULES:
//   1. Read through ALL the code before touching anything.
//   2. Identify each bug on paper (or in your head) first.
//   3. Then fix them one by one.
//
// WHAT CORRECT LOOKS LIKE when all 5 are fixed:
//   ✓ A label with no console warning about unknown DOM props
//   ✓ Nothing rendered when notifications is empty (not the number "0")
//   ✓ A working text input field
//   ✓ The GreetUser component actually called — a greeting appears
//   ✓ A paragraph that reads "Welcome back, Osama"

function GreetUser({ name }) {
  return <span>Hello, {name}!</span>;
}

function Exercise2() {
  const [notifications] = useState([]);
  const name = 'Osama';

  return (
    <div>

      {/* Bug 1 — This logs a console warning about an unknown DOM prop. What's wrong? */}
      <label class="form-label">Email address</label>

      {/* Bug 2 — When notifications is empty, this renders "0" instead of nothing. Why?
          Hint: trace what value `notifications.length && ...` evaluates to when length is 0. */}
      {notifications.length && (
        <ul>
          {notifications.map(n => <li key={n}>{n}</li>)}
        </ul>
      )}

      {/* Bug 3 — The line below is a JSX syntax error (void elements must be self-closed).
          It's in a comment so the file compiles. Identify the rule, then write the fix below.

          Buggy:   <input type="text" placeholder="Search...">
      */}
      {/* ↓ Write the corrected JSX here (replace this comment): */}

      {/* Bug 4 — GreetUser won't be called. React will try to render an unknown HTML element
          instead. Why? Fix just the tag name. */}
      <greetUser name={name} />

      {/* Bug 5 — This is a JSX syntax error because it uses a statement inside {}.
          It's in a comment so the file compiles. Identify the rule, then write the fix below.
          Use a ternary or template literal — your choice.

          Buggy:   <p>{if (name) { `Welcome back, ${name}` }}</p>
      */}
      {/* ↓ Write the corrected JSX here (replace this comment): */}

    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// BUILD IT — Implement UserCard to a spec
//
// Build a UserCard component from scratch. The sample data and
// render call are already wired up — you only write the component body.
//
// SPEC:
//   Props: name (string), role (string), isOnline (boolean), skills (string[])
//
//   □ Status dot: a small inline circle before the name.
//       Green (#22c55e) when online, grey (#94a3b8) when offline.
//       Use inline style={{ ... }} — no external CSS needed.
//
//   □ Skills list: render each skill as an <li> using .map().
//       Each <li> needs a key. Use the skill string — they're unique here.
//
//   □ Wrap the header section and the skills section in a Fragment (<>...</>).
//       The goal: UserCard adds zero wrapper elements to the DOM.
//
//   □ Use className (not class) wherever you'd normally write a class attribute.
//
// HOW TO VERIFY:
//   - Inspect in DevTools: the UserCard component should add no wrapper element
//   - Console has zero warnings (no missing keys, no unknown props)
//   - Change isOnline to false in sampleUser below and confirm the dot turns grey

function UserCard({ name, role, isOnline, skills }) {
  // TODO: implement this component
  return null;
}

const sampleUser = {
  name: 'Osama',
  role: 'Senior Frontend Engineer',
  isOnline: true,
  skills: ['React', 'TypeScript', 'Next.js'],
};

function Exercise3() {
  return (
    <UserCard
      name={sampleUser.name}
      role={sampleUser.role}
      isOnline={sampleUser.isOnline}
      skills={sampleUser.skills}
    />
  );
}


// ─── Playground ──────────────────────────────────────────────
// Free-form area. Suggestions:
//   - Try the interview Q from notes.md: what does {0 && <Spinner />} render?
//     Write a Spinner stub and test it live.
//   - Inspect a deeply nested JSX tree in the console and trace the children array.
//   - Try rendering <mycard /> (lowercase) — what shows up in DevTools?
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '640px' }}>
      <h1>JSX & React.createElement</h1>

      <h2>Exercise 1 — Write createElement by hand</h2>
      <Exercise1 />

      <h2>Exercise 2 — Fix the 5 bugs</h2>
      <Exercise2 />

      <h2>Exercise 3 — Build UserCard from scratch</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
