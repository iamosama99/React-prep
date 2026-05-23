// ============================================================
// Topic:   Conditional Rendering
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

import { useState } from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// PATTERN GALLERY — Use the RIGHT pattern for each scenario
//
// Six slots. Each has a specific rendering scenario. Your job:
// pick the most readable pattern for that scenario and implement it.
// The goal is to have a feel for when each pattern is appropriate.
//
// Scenario A — Early return (guard clause):
//   Component: <UserGreeting user={user} />
//   If user is null, return null.
//   Otherwise render: <p>Welcome back, {user.name}!</p>
//   Use an early return — not a ternary.
//
// Scenario B — Ternary (if/else inline):
//   Component: <ToggleLabel isOn={bool} />
//   Render: <span className="badge">Online</span>  OR  <span className="badge">Offline</span>
//   One line, inline. Use a ternary on the className AND the text.
//
// Scenario C — Short-circuit && (show or nothing):
//   Component: <Notifications count={number} />
//   Show <span>{count} new</span> only when count > 0.
//   Use &&. Make sure the condition is a boolean (not a raw number).
//
// Scenario D — Variable (multi-branch, keeps JSX clean):
//   Component: <PriorityBadge priority={'low'|'medium'|'high'} />
//   low → "🟢 Low", medium → "🟡 Medium", high → "🔴 High"
//   Assign the content to a variable using if/else before the return.
//
// Scenario E — Lookup object (enum → element):
//   Component: <StatusIcon status={'loading'|'success'|'error'} />
//   Map the status string to an emoji or short label using an object literal.
//   Return the matching element. Add a default for unknown statuses.
//
// Scenario F — || for fallback:
//   Component: <DisplayName name={string | ''} />
//   Render the name, but fall back to "Anonymous" if name is falsy.
//   Then try it with ?? and notice the difference when name is an empty string.

function UserGreeting({ user }) {
  // TODO: early return if !user, then render the greeting
  return null;
}

function ToggleLabel({ isOn }) {
  // TODO: ternary for className and text
  return <span>implement me</span>;
}

function Notifications({ count }) {
  // TODO: && with a boolean condition
  return <div>implement me</div>;
}

function PriorityBadge({ priority }) {
  // TODO: variable + if/else before return
  return <span>implement me</span>;
}

function StatusIcon({ status }) {
  // TODO: lookup object
  return <span>implement me</span>;
}

function DisplayName({ name }) {
  // TODO: || fallback, then try ?? — what's different?
  return <span>implement me</span>;
}

function Exercise1() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div><strong>A (early return):</strong> <UserGreeting user={null} /> / <UserGreeting user={{ name: 'Osama' }} /></div>
      <div><strong>B (ternary):</strong> <ToggleLabel isOn={true} /> / <ToggleLabel isOn={false} /></div>
      <div><strong>C (&&):</strong> <Notifications count={0} /> / <Notifications count={5} /></div>
      <div><strong>D (variable):</strong> <PriorityBadge priority="low" /> / <PriorityBadge priority="high" /></div>
      <div><strong>E (lookup):</strong> <StatusIcon status="loading" /> / <StatusIcon status="success" /> / <StatusIcon status="error" /></div>
      <div><strong>F (|| vs ??):</strong> <DisplayName name="" /> / <DisplayName name="Osama" /></div>
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// THE 0 BUG + MOUNT vs HIDE — Two classic gotchas in one exercise
//
// PART A — The 0 bug:
//   The Inbox below has a bug: when messages is empty, it renders "0" instead of nothing.
//   1. Run the app and confirm you see "0" in the UI.
//   2. Identify the line causing it (look at the && condition).
//   3. Fix it by coercing the condition to a boolean.
//   4. Write a comment explaining WHY 0 renders but false doesn't.
//
// PART B — Mount vs hide (state lifecycle):
//   There are two "modal" panels below:
//     - ConditionalModal uses {isOpen && <Modal />} — unmounts on close
//     - CssModal uses style={{ display: isOpen ? '' : 'none' }} — stays mounted
//
//   Modal is a simple form with a text input.
//
//   DO THIS:
//     1. Open both panels. Type different text into each input.
//     2. Close both. Reopen both.
//     3. PREDICTION: which panel preserves your typed text? ___
//     4. Run it and verify.
//
//   Write in a comment WHY one preserves state and the other doesn't.

// ── PART A: Fix the bug in this component ──

function Inbox({ messages }) {
  return (
    <div>
      <h4>Inbox</h4>
      {/* BUG: renders "0" when messages is empty — fix the condition */}
      {messages.length && (
        <ul>
          {messages.map(m => <li key={m}>{m}</li>)}
        </ul>
      )}
      {messages.length === 0 && <p style={{ color: '#94a3b8' }}>No messages ✓</p>}
    </div>
  );
}

// ── PART B: Modal with a text input — do not change this ──
function Modal({ label }) {
  return (
    <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{label}</p>
      <input placeholder="Type something here..." style={{ width: '100%' }} />
    </div>
  );
}

function Exercise2() {
  const [messages] = useState([]); // empty — triggers the bug
  const [isOpenA, setIsOpenA] = useState(false);
  const [isOpenB, setIsOpenB] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Part A */}
      <Inbox messages={messages} />

      {/* Part B */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Conditional (unmount/remount)</p>
          <button onClick={() => setIsOpenA(v => !v)}>{isOpenA ? 'Close' : 'Open'}</button>
          {/* This unmounts Modal when closed */}
          {isOpenA && <Modal label="Conditional Modal" />}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>CSS hide (stays mounted)</p>
          <button onClick={() => setIsOpenB(v => !v)}>{isOpenB ? 'Close' : 'Open'}</button>
          {/* This keeps Modal in the tree, just hidden */}
          <div style={{ display: isOpenB ? '' : 'none' }}>
            <Modal label="CSS Modal" />
          </div>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
        Type in both inputs → close both → reopen both. Which one remembers your text?
      </p>
    </div>
  );
}
// EXPLANATION: the conditional modal does / does not preserve state because ___


// ─── Exercise 3 ──────────────────────────────────────────────
// ASYNC STATE UI — Loading / error / empty / data — the real-world pattern
//
// Build a DataView component that handles all four states of an async operation.
// This is the pattern you write for every data-fetching component.
//
// States: 'idle' | 'loading' | 'error' | 'empty' | 'data'
//
// WHAT TO BUILD:
//
// DataView — receives `status` and `data` props, renders accordingly:
//   idle:    <p>Press "Fetch" to load data.</p>
//   loading: <p>Loading…</p>  (or a spinner emoji)
//   error:   <p style red>Failed to load. Try again.</p>
//   empty:   <p>No results found.</p>
//   data:    <ul> with each item from data[] as a <li>
//
//   Use the PATTERN that makes the most sense here:
//   an early-return chain (guard clauses), or a lookup object, or a switch.
//   Pick one and comment why you chose it.
//
// Exercise3 — controls the state transitions:
//   "Fetch" button simulates an API call:
//     sets status to 'loading'
//     after 1.5s, randomly resolves to 'data' (with items) or 'error' or 'empty'
//   "Reset" button sets status back to 'idle'
//
// ALREADY PROVIDED: the simulation logic below — you only implement DataView.

const MOCK_RESULTS = [
  ['TypeScript', 'React', 'Next.js', 'Tailwind'],
  [],             // triggers 'empty' state
  null,           // triggers 'error' state
];

function DataView({ status, data }) {
  // TODO: implement this component
  // Hint: think about which pattern fits a 5-way branch best
  return <div>DataView — implement me (status: {status})</div>;
}

function Exercise3() {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState([]);

  function handleFetch() {
    setStatus('loading');
    setTimeout(() => {
      const result = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      if (result === null) {
        setStatus('error');
      } else if (result.length === 0) {
        setStatus('empty');
        setData([]);
      } else {
        setStatus('data');
        setData(result);
      }
    }, 1500);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={handleFetch} disabled={status === 'loading'}>
          Fetch Data
        </button>
        <button onClick={() => { setStatus('idle'); setData([]); }}>
          Reset
        </button>
      </div>
      <DataView status={status} data={data} />
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. The "0" variants
//    Try: {0 && <span>shown</span>}  — renders "0"
//    Try: {'' && <span>shown</span>} — renders nothing (empty string is falsy and invisible)
//    Try: {false && <span>shown</span>} — renders nothing
//    Only 0 (and other numbers) render visibly as falsy values.
//
// 2. Nested ternary readability
//    Write a ternary for 3 states (loading/error/data) inline in JSX.
//    Notice when it becomes unreadable. Then extract it to a variable.
//    The rule: > 2 branches → extract.
//
// 3. Effect during conditional render
//    Add a useEffect to Modal that logs on mount and "cleanup" on unmount.
//    Toggle the conditional modal — watch the logs.
//    Toggle the CSS modal — notice the effect does NOT unmount/remount.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>Conditional Rendering</h1>

      <h2>Exercise 1 — Pattern gallery: right tool for each case</h2>
      <Exercise1 />

      <h2>Exercise 2 — The 0 bug + mount vs CSS hide</h2>
      <Exercise2 />

      <h2>Exercise 3 — Async state UI: loading / error / empty / data</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
