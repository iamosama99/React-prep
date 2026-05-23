// ============================================================
// Topic:   Function vs Class Components
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState, useEffect } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// SIDE BY SIDE — Build the same component both ways
//
// Build a counter that:
//   □ Shows a number starting at 0
//   □ Has an "+1" button that increments it
//   □ Syncs document.title to "Count: N" whenever the count changes
//
// You must implement BOTH versions:
//   - ClassCounter  — extends React.Component, uses this.state, this.setState,
//                     componentDidMount + componentDidUpdate for the title sync
//   - FunctionCounter — uses useState + useEffect
//
// WHAT TO NOTICE after both are working:
//   - ClassCounter: document.title logic is split across two lifecycle methods
//   - FunctionCounter: setup + sync live in one useEffect
//   - Both render identically in the browser — same visual output, different internals
//
// TODO: implement ClassCounter (class component)
class ClassCounter extends React.Component {
  // hint: constructor(props) { super(props); this.state = { count: 0 }; }

  render() {
    return <div>ClassCounter — implement me</div>;
  }
}

// TODO: implement FunctionCounter (function component)
function FunctionCounter() {
  return <div>FunctionCounter — implement me</div>;
}

function Exercise1() {
  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <div>
        <h3>Class Component</h3>
        <ClassCounter />
      </div>
      <div>
        <h3>Function Component</h3>
        <FunctionCounter />
      </div>
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// THE ASYNC CAPTURE BUG — Snapshot vs Instance
//
// This is the most important behavioral difference between the two paradigms.
// Read this scenario carefully before implementing:
//
//   Scenario:
//     1. A "Follow" button is rendered for a user (e.g., "@userA").
//     2. When clicked, it schedules an alert AFTER A 3-SECOND DELAY.
//     3. In that 3-second window, the parent switches to a DIFFERENT USER ("@userB").
//     4. When the alert fires, which user does it name?
//
// WHAT TO IMPLEMENT:
//   Both ClassFollowButton and FunctionFollowButton receive a `username` prop.
//   On click, each schedules: setTimeout(() => alert(`Followed ${username}`), 3000)
//
//   The parent (Exercise2) already has the user-switching logic below.
//   You only need to implement the two button components.
//
// WHAT TO PREDICT before running:
//   - Which version alerts "@userB" (the current user at alert time)?
//   - Which version alerts "@userA" (the user that was clicked)?
//   Write your prediction in a comment, then run it to verify.
//
// WHY IT MATTERS: interviews ask "what is the difference between function and class
// components?" — the snapshot/instance model is the correct deep answer.

// TODO: implement ClassFollowButton (class component)
class ClassFollowButton extends React.Component {
  // Use a class field arrow function for the handler so `this` is bound:
  // handleClick = () => { ... }
  render() {
    return <button>Follow {this.props.username} (class)</button>;
  }
}

// TODO: implement FunctionFollowButton (function component)
function FunctionFollowButton({ username }) {
  return <button>Follow {username} (function)</button>;
}

// ── Parent that switches users after the button is clicked ──
// Already implemented — don't change this
function Exercise2() {
  const users = ['@userA', '@userB', '@userC'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const username = users[currentIndex];

  return (
    <div>
      <p>
        Current user: <strong>{username}</strong>
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        <ClassFollowButton username={username} />
        <FunctionFollowButton username={username} />
      </div>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Step 1: Click a Follow button. Step 2: Immediately click "Switch User" before 3 seconds. Step 3: See which name appears in the alert.
      </p>
      <button
        onClick={() => setCurrentIndex(i => (i + 1) % users.length)}
        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: 4 }}
      >
        Switch User →
      </button>
    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// THE ONE CLASS LEFT — Write an ErrorBoundary
//
// As of 2026, the only thing that still requires a class component is an ErrorBoundary.
// There is no hooks equivalent for getDerivedStateFromError / componentDidCatch.
//
// WHAT TO IMPLEMENT:
//   Complete the ErrorBoundary class component below.
//   It must:
//     □ Hold state: { hasError: false }
//     □ static getDerivedStateFromError() — return { hasError: true }
//     □ componentDidCatch(error, info) — log the error + info to the console
//     □ render() — if hasError, show a styled fallback div with the message
//                  "Something went wrong. Please refresh."
//                  Otherwise, render this.props.children
//
// BuggyComponent is already written below — it throws on mount.
// Wrap it in <ErrorBoundary> in Exercise3 and confirm the fallback appears.
//
// INTERVIEW NOTE: Interviewers ask "is there anything hooks can't do?"
// This is the answer. Know it cold.

class ErrorBoundary extends React.Component {
  // TODO: implement this class
  render() {
    return this.props.children;
  }
}

// Already implemented — don't change this
function BuggyComponent() {
  throw new Error('I crashed intentionally!');
}

function Exercise3() {
  const [showBuggy, setShowBuggy] = useState(false);

  return (
    <div>
      <button onClick={() => setShowBuggy(true)}>
        Mount the buggy component
      </button>
      {showBuggy && (
        <ErrorBoundary>
          <BuggyComponent />
        </ErrorBoundary>
      )}
      {!showBuggy && (
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
          Click the button — ErrorBoundary should catch the crash and show fallback UI.
        </p>
      )}
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. PureComponent vs React.memo
//    Build a parent that re-renders every second. Give it a child that
//    logs "rendered" on each render. Wrap the child in React.memo.
//    Does it still log? Now try the class version with PureComponent.
//
// 2. this binding gotcha
//    Write a class component where handleClick is a regular method (not arrow function).
//    Pass it as onClick={this.handleClick} — does it crash? Why?
//    Then fix it two ways: .bind() in constructor, and arrow class field.
//
// 3. Wrapper hell vs hooks
//    Write two HOCs (withA, withB) that each inject a prop via render.
//    Apply both to a component. Inspect the DevTools tree depth.
//    Now rewrite using two custom hooks — notice the tree stays flat.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>Function vs Class Components</h1>

      <h2>Exercise 1 — Same counter, both paradigms</h2>
      <Exercise1 />

      <h2>Exercise 2 — The async capture bug</h2>
      <Exercise2 />

      <h2>Exercise 3 — The one class left: ErrorBoundary</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
