// ============================================================
// Topic:   One-Way Data Flow
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

import { useState, useEffect } from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// LIFTING STATE UP — Two siblings that must share the same value
//
// SCENARIO:
//   You have a color picker and a color preview panel. The preview should always
//   show whatever color the picker has selected. They're siblings — neither is
//   the parent of the other.
//
// THE PROBLEM:
//   Siblings cannot communicate directly in one-way flow. There is no
//   "sibling channel" in React. So where does the selected color live?
//
// WHAT TO BUILD:
//   ColorPicker — a row of colored buttons (use the COLORS array below)
//     Props: selectedColor (string), onSelect (function)
//     Renders: a button for each color; the selected one has a border/ring
//     Calls onSelect(color) when a button is clicked
//     Does NOT own any state — it's purely driven by props
//
//   ColorPreview — shows the selected color
//     Props: color (string)
//     Renders: a 200x100px div with background set to the color prop
//     Does NOT own any state either
//
//   Exercise1 — the common ancestor that owns the state
//     Owns: selectedColor state (start with 'tomato')
//     Passes selectedColor + onSelect down to ColorPicker
//     Passes color down to ColorPreview
//
// VERIFY:
//   - Clicking a color updates both the picker highlight AND the preview
//   - Neither ColorPicker nor ColorPreview calls useState
//   - Data flows down; intent flows up through the callback

const COLORS = ['tomato', 'steelblue', 'mediumseagreen', 'goldenrod', 'mediumpurple'];

function ColorPicker({ selectedColor, onSelect }) {
  // TODO: render a button per color
  return <div>ColorPicker — implement me</div>;
}

function ColorPreview({ color }) {
  // TODO: render the preview box
  return <div>ColorPreview — implement me</div>;
}

function Exercise1() {
  // TODO: own the state here; wire up ColorPicker and ColorPreview
  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      <ColorPicker selectedColor={null} onSelect={() => {}} />
      <ColorPreview color="transparent" />
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// THE COPY-PROP-TO-STATE ANTIPATTERN — Watch the divergence happen live
//
// This exercise has two parts: first reproduce the bug, then understand it.
//
// PART A — The buggy component (already implemented below):
//   BuggyNameDisplay receives a `name` prop. On mount, it copies name into
//   local state. The local state is what actually renders.
//
//   The parent (Exercise2) changes the name prop after 3 seconds.
//   PREDICTION: after 3 seconds, does BuggyNameDisplay update? ___
//
//   Run it and observe. Write your answer:
//   "BuggyNameDisplay does / does not update because ___"
//
// PART B — Implement the correct version:
//   CorrectNameDisplay receives `name` prop and renders it directly.
//   No local state. No copying.
//   After 3 seconds, it should update automatically. Why?
//   Write the reason as a comment inside the component.
//
// KEY INSIGHT: useState(prop) reads the prop ONCE on mount.
// After that, local state and the prop are completely independent.
// The prop can change — local state won't know.

// Already implemented — observe the bug
function BuggyNameDisplay({ name }) {
  const [localName, setLocalName] = useState(name); // copies prop into state
  return (
    <div style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: 4 }}>
      Buggy: <strong>{localName}</strong>
      <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>
        (copied from prop on mount — won't update when prop changes)
      </small>
    </div>
  );
}

// TODO: implement this correctly — no local state, just render the prop
function CorrectNameDisplay({ name }) {
  // TODO: render name directly
  // Comment: this updates automatically when the prop changes because ___
  return <div>CorrectNameDisplay — implement me</div>;
}

function Exercise2() {
  const [name, setName] = useState('Osama');

  // Changes the name prop after 3 seconds — already wired up
  useEffect(() => {
    const timer = setTimeout(() => setName('Ali'), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Parent's current name prop: <strong>{name}</strong> (changes to "Ali" after 3s)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <BuggyNameDisplay name={name} />
        <CorrectNameDisplay name={name} />
      </div>
    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// SCOREBOARD — Full one-way flow with sibling coordination
//
// Build a two-player scoreboard. This exercises the complete pattern:
// state in the common ancestor, data down, callbacks up, derived values inline.
//
// COMPONENTS TO BUILD:
//
// PlayerScore — displays one player's name and score
//   Props: name (string), score (number), onIncrement, onDecrement, onReset
//   Renders:
//     - Player name as a label
//     - Score as a large number
//     - Three buttons: +1, −1, Reset (calls the respective callback)
//     - Decrement button disabled when score is 0
//
// ScoreGap — shows who is winning
//   Props: scoreA (number), scoreB (number), nameA (string), nameB (string)
//   Renders ONE of:
//     - "Tied!" — if scores are equal
//     - "{winnerName} leads by {gap}" — otherwise
//   Use a ternary or early return — your choice
//   This component owns no state — it's purely derived from props
//
// Exercise3 — owns all state
//   State: scoreA and scoreB (both start at 0)
//   Renders PlayerScore for each player + ScoreGap between them
//   Also renders a "Reset All" button that sets both scores back to 0
//
// VERIFY:
//   - Increment/decrement/reset work independently for each player
//   - ScoreGap updates live as scores change
//   - Neither PlayerScore nor ScoreGap holds any state
//   - "Reset All" resets both simultaneously (one render, not two)

function PlayerScore({ name, score, onIncrement, onDecrement, onReset }) {
  // TODO: implement
  return <div>PlayerScore — implement me</div>;
}

function ScoreGap({ scoreA, scoreB, nameA, nameB }) {
  // TODO: implement — purely derived from props, no state
  return <div>ScoreGap — implement me</div>;
}

function Exercise3() {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  function resetAll() {
    // TODO: reset both scores in one update
    // Hint: two setters in one handler — React batches them
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <PlayerScore
          name="Player A"
          score={scoreA}
          onIncrement={() => setScoreA(s => s + 1)}
          onDecrement={() => setScoreA(s => Math.max(0, s - 1))}
          onReset={() => setScoreA(0)}
        />
        <PlayerScore
          name="Player B"
          score={scoreB}
          onIncrement={() => setScoreB(s => s + 1)}
          onDecrement={() => setScoreB(s => Math.max(0, s - 1))}
          onReset={() => setScoreB(0)}
        />
      </div>
      <ScoreGap scoreA={scoreA} scoreB={scoreB} nameA="Player A" nameB="Player B" />
      <button onClick={resetAll} style={{ marginTop: '1rem' }}>
        Reset All
      </button>
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. Prop drilling smell
//    Add a "theme" value (dark/light) to Exercise3's parent.
//    Pass it down through Exercise3 → PlayerScore without PlayerScore using it.
//    Notice the coupling. Then ask: how would Context fix this?
//
// 2. The sibling-to-sibling myth
//    Try creating an event emitter or module-level variable shared between two
//    sibling components. Does React re-render when it changes? (No.)
//    This shows why sibling communication must go through a parent.
//
// 3. Pure component behavior
//    Add a console.log to PlayerScore's render. Change only scoreA.
//    Does PlayerScore for Player B still log? (Yes — parent re-rendered.)
//    Wrap PlayerScore in React.memo — does it still log for B? (No.)
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>One-Way Data Flow</h1>

      <h2>Exercise 1 — Lifting state up: color picker + preview</h2>
      <Exercise1 />

      <h2>Exercise 2 — Copy-prop-to-state antipattern</h2>
      <Exercise2 />

      <h2>Exercise 3 — Scoreboard: full one-way flow</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
