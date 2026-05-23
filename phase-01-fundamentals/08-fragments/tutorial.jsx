// ============================================================
// Topic:   Fragments
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import React from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// DOM SURGERY — Fix a broken table using Fragment
//
// The component below renders a table of skills. Each row is a separate
// SkillRow component. But there is a structural bug: SkillRow wraps its
// two <td> elements in a <div>, which produces invalid HTML inside <tr>.
//
// TASK:
//   1. Open DevTools → Elements tab. Find the <tbody> and look at the children.
//      You'll see: <tr><div><td>...</td><td>...</td></div></tr>
//      That's invalid — <div> is not a valid child of <tr>.
//   2. Fix SkillRow by wrapping the two <td> elements in <> </> instead of <div>.
//   3. Inspect again — the <div> should be gone; <td> should be direct children of <tr>.
//
// EXPLAIN (write as a comment below SkillRow):
//   Why does <div> produce invalid HTML here, and why does <> fix it?
//   What does <> compile to?

const SKILLS = [
  { name: 'React', level: 'Expert' },
  { name: 'TypeScript', level: 'Advanced' },
  { name: 'Node.js', level: 'Intermediate' },
  { name: 'Next.js', level: 'Advanced' },
];

// TODO: fix the wrapper — replace <div> with <>
function SkillRow({ name, level }) {
  return (
    <div>
      <td style={{ padding: '0.4rem 1rem 0.4rem 0' }}>{name}</td>
      <td style={{ padding: '0.4rem 1rem 0.4rem 0', color: '#64748b' }}>{level}</td>
    </div>
  );
}
// EXPLANATION: ___

function Exercise1() {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Skill</th>
          <th style={{ textAlign: 'left' }}>Level</th>
        </tr>
      </thead>
      <tbody>
        {SKILLS.map(skill => (
          <tr key={skill.name}>
            <SkillRow name={skill.name} level={skill.level} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// GLOSSARY — Definition list with keyed Fragments
//
// Build a glossary using a <dl> (definition list).
// The HTML spec requires that <dt> and <dd> are direct children of <dl>.
// Each term-definition pair must come from a TermEntry component.
//
// WHAT TO BUILD:
//
// TermEntry — renders one term/definition pair
//   Props: term (string), definition (string)
//   Must return <dt> and <dd> as siblings — NO wrapper element allowed.
//   Use the shorthand Fragment <> ... </> here.
//   Verify in DevTools: <dl> children should be <dt><dd><dt><dd>... with no wrappers.
//
// Glossary — renders all terms using TermEntry in a map
//   Props: terms (array of { id, term, definition })
//   Maps terms → <React.Fragment key={t.id}> <TermEntry ... /> </React.Fragment>
//
//   WHY React.Fragment here instead of <> ?
//   Write the answer as a comment below Glossary.
//
// Exercise2 — renders <Glossary terms={TERMS} />

const TERMS = [
  { id: 1, term: 'React element', definition: 'A plain JS object describing what to render — the output of React.createElement.' },
  { id: 2, term: 'React component', definition: 'A function or class that accepts props and returns React elements.' },
  { id: 3, term: 'Reconciliation', definition: 'The process React uses to diff two element trees and determine the minimal DOM updates.' },
  { id: 4, term: 'Fiber', definition: "React's internal data structure that represents a unit of work in the component tree." },
];

// TODO: implement TermEntry — two siblings, no wrapper
function TermEntry({ term, definition }) {
  return (
    // Use <> here — no key needed because TermEntry isn't in the direct map
    <>
      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>{/* TODO */}</dt>
      <dd style={{ marginLeft: '1.5rem', color: '#475569' }}>{/* TODO */}</dd>
    </>
  );
}

// TODO: implement Glossary — use React.Fragment with key in the map
function Glossary({ terms }) {
  return (
    <dl>
      {terms.map(t => (
        // TODO: <React.Fragment key={t.id}> <TermEntry ... /> </React.Fragment>
        null
      ))}
    </dl>
  );
}
// WHY React.Fragment (not <>) in the map: ___

function Exercise2() {
  return <Glossary terms={TERMS} />;
}


// ─── Exercise 3 ──────────────────────────────────────────────
// NULL vs FRAGMENT — Know the difference
//
// This exercise is a diagnosis: look at each component and label it correctly.
// Then fix two of them.
//
// For each component below, answer:
//   A) What does it render in the DOM? (DOM nodes / nothing)
//   B) Does it exist in the React tree? (yes = lifecycle runs / no = component not called)
//   C) Is this the correct choice for the described use case?
//
// After labeling, fix the two marked with [FIX ME].

// Returns null — renders nothing, lifecycle still runs (effects would fire)
function HiddenWithNull() {
  return null;
}

// Returns an empty Fragment — renders nothing, but is a valid "container with no children"
function EmptyFragment() {
  return <></>;
}

// [FIX ME] — Should render nothing when isHidden is true, render children when false.
// Currently always renders the children. Add a null early return.
function Hider({ isHidden, children }) {
  // TODO: if isHidden, return null
  return <>{children}</>;
}

// [FIX ME] — Should return TWO table cells without a DOM wrapper.
// Currently wraps in a span — which is invalid inside <tr>.
function TwoColumns({ a, b }) {
  return (
    <span>
      <td>{a}</td>
      <td>{b}</td>
    </span>
  );
}

function Exercise3() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <strong>HiddenWithNull:</strong> <HiddenWithNull />
        <span style={{ color: '#94a3b8' }}> ← What rendered? ___</span>
      </div>
      <div>
        <strong>EmptyFragment:</strong> <EmptyFragment />
        <span style={{ color: '#94a3b8' }}> ← What rendered? ___</span>
      </div>
      <div>
        <strong>Hider (isHidden=true):</strong>
        <Hider isHidden={true}><span style={{ color: 'red' }}>This should be hidden</span></Hider>
        <span style={{ color: '#94a3b8' }}> ← Should show nothing after fix</span>
      </div>
      <div>
        <strong>TwoColumns (inside a table row):</strong>
        <table><tbody><tr><TwoColumns a="Alpha" b="Beta" /></tr></tbody></table>
        <span style={{ color: '#94a3b8' }}> ← Should be two direct td children of tr after fix</span>
      </div>
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. Verify the compilation
//    In any component, replace <></> with React.createElement(React.Fragment, null, ...)
//    They should behave identically — <> is just shorthand.
//
// 2. Fragment with unsupported prop
//    Try: <React.Fragment className="test">...</React.Fragment>
//    What happens? (warning or error — Fragments accept only key)
//
// 3. DevTools comparison
//    Render a list with div wrappers, then with Fragment wrappers.
//    In React DevTools, both show Fragment nodes. In the real DOM (Elements tab),
//    the Fragment version has no extra nodes. This is the key distinction.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '640px' }}>
      <h1>Fragments</h1>

      <h2>Exercise 1 — Fix a broken table with Fragment</h2>
      <Exercise1 />

      <h2>Exercise 2 — Glossary with keyed Fragments</h2>
      <Exercise2 />

      <h2>Exercise 3 — null vs Fragment: diagnosis + fix</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
