// ============================================================
// Topic:   PureComponent vs React.memo
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// Goal: Implement the simplest possible demonstration of PureComponent vs React.memo.
//       Focus on the core mechanic — no extra features yet.
//
// TODO: Replace this stub with your implementation.
function Exercise1() {
  return <div>Exercise 1 — PureComponent vs React.memo (stub)</div>;
}

// ─── Exercise 2 ──────────────────────────────────────────────
// Goal: Handle a realistic edge case or common gotcha for PureComponent vs React.memo.
//       Check notes.md "Check yourself" prompts for hints.
//
// TODO: Replace this stub with your implementation.
function Exercise2() {
  return <div>Exercise 2 — edge case (stub)</div>;
}

// ─── Exercise 3 ──────────────────────────────────────────────
// Goal: Build a small composable unit that uses PureComponent vs React.memo in a
//       pattern you'd actually write in a production codebase.
//
// TODO: Replace this stub with your implementation.
function Exercise3() {
  return <div>Exercise 3 — production pattern (stub)</div>;
}

// ─── Playground ──────────────────────────────────────────────
// Free-form area. Use this to run quick experiments, try
// variations from the notes, or reproduce interview questions.
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>PureComponent vs React.memo</h1>
      <h2>Exercise 1</h2><Exercise1 />
      <h2>Exercise 2</h2><Exercise2 />
      <h2>Exercise 3</h2><Exercise3 />
      <h2>Playground</h2><Playground />
    </div>
  );
}
