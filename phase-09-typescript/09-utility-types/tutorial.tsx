// ============================================================
// Topic:   Utility Types in Component APIs
// Phase:   9 — TypeScript with React
// File:    tutorial.tsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react-ts) or a local
//      Vite app: npm create vite@latest my-app -- --template react-ts
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo, FC } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// Goal: Implement the simplest possible demonstration of Utility Types in Component APIs
//       with explicit TypeScript types.
//
// TODO: Replace this stub with your implementation.
const Exercise1: FC = () => {
  return <div>Exercise 1 — Utility Types in Component APIs (stub)</div>;
};

// ─── Exercise 2 ──────────────────────────────────────────────
// Goal: Handle a realistic TypeScript edge case for Utility Types in Component APIs.
//       Check notes.md "Check yourself" prompts for hints.
//
// TODO: Replace this stub with your implementation.
const Exercise2: FC = () => {
  return <div>Exercise 2 — TypeScript edge case (stub)</div>;
};

// ─── Exercise 3 ──────────────────────────────────────────────
// Goal: Build a small, fully-typed composable unit using Utility Types in Component APIs
//       in a pattern you'd write in a production TypeScript codebase.
//
// TODO: Replace this stub with your implementation.
const Exercise3: FC = () => {
  return <div>Exercise 3 — production pattern (stub)</div>;
};

// ─── Playground ──────────────────────────────────────────────
const Playground: FC = () => {
  return <div>Playground — experiment here</div>;
};

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>Utility Types in Component APIs</h1>
      <h2>Exercise 1</h2><Exercise1 />
      <h2>Exercise 2</h2><Exercise2 />
      <h2>Exercise 3</h2><Exercise3 />
      <h2>Playground</h2><Playground />
    </div>
  );
};

export default App;
