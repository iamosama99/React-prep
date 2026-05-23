// ============================================================
// Topic:   Rules of Hooks
// Phase:   2 — Hooks
// ============================================================
//
// There are exactly TWO rules:
//   1. Only call hooks at the TOP LEVEL of a function
//      (not inside conditions, loops, or nested functions)
//   2. Only call hooks from REACT FUNCTION COMPONENTS
//      or other CUSTOM HOOKS (not plain JS functions)
//
// WHY: React tracks hooks by call ORDER. If the order changes
//      between renders, React mismatches state to the wrong hook.
//
// These exercises are "find the bug → fix it" format.
// ============================================================

import { useState, useEffect, useRef } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Conditional hook call — find 3 bugs, explain each, fix them.
//
// Each BugN component below has a hooks rule violation.
// Steps:
//   1. Read each component.
//   2. Identify the violation (mark it with a // BUG: comment).
//   3. Rewrite the component so it follows the rules but preserves intent.
//   4. Write a brief // WHY: comment explaining what React would do wrong.
//
// IMPORTANT: these components will ERROR in React (hooks call order
// changes). Fixing them makes them run correctly.

// Bug 1: hook inside an if-block
function Bug1({ isLoggedIn }) {
  // BUG: useState is called conditionally — call order changes
  //      when isLoggedIn flips between renders.
  if (isLoggedIn) {
    const [name, setName] = useState('');
    return <input value={name} onChange={e => setName(e.target.value)} />;
  }
  return <p>Please log in</p>;

  // TODO: Fix — move useState above the if-block unconditionally.
  // The condition only affects WHAT YOU RENDER, not whether hooks run.
  //
  // Fixed skeleton:
  // function Bug1({ isLoggedIn }) {
  //   const [name, setName] = useState('');   ← always called
  //   if (isLoggedIn) return <input ... />;
  //   return <p>Please log in</p>;
  // }
}

// Bug 2: hook inside a for-loop
function Bug2({ items }) {
  const refs = [];
  for (let i = 0; i < items.length; i++) {
    // BUG: useRef called in a loop — count changes if items.length changes
    refs.push(useRef(null));
  }
  return (
    <ul>
      {items.map((item, i) => (
        <li key={item} ref={refs[i]}>{item}</li>
      ))}
    </ul>
  );

  // TODO: Fix — create ONE ref that holds an array, or use a different approach.
  // Option A: const refsRef = useRef([]);
  //           refsRef.current[i] = el  (via callback ref pattern)
}

// Bug 3: hook inside a nested function
function Bug3({ value }) {
  function computeDouble() {
    // BUG: useState is inside a nested function — it's not called
    //      during the component's render, it's called inside a helper.
    const [doubled] = useState(value * 2);
    return doubled;
  }

  return <p>Double: {computeDouble()}</p>;

  // TODO: Fix — move useState to the top level of Bug3.
  // The value can be derived with useMemo or just plain math.
  // function Bug3({ value }) {
  //   const doubled = value * 2;  ← no hook needed here at all
  //   return <p>Double: {doubled}</p>;
  // }
}

function Exercise1() {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
        Each component below has a hooks violation. Read the source,
        find the bug, add a BUG: comment, and fix it.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Uncomment one at a time — they error until fixed */}
        {/* <Bug1 isLoggedIn={true} /> */}
        {/* <Bug2 items={['a', 'b', 'c']} /> */}
        {/* <Bug3 value={5} /> */}
        <p style={{ fontSize: 12, color: '#888' }}>
          Uncomment each BugN above (one at a time) to see it error,
          then fix it and confirm it renders correctly.
        </p>
      </div>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Early return before a hook call — a subtle violation.
//
// Components that return early (for loading/error states) must
// still call all hooks BEFORE the early return.
//
// Find the bug, explain it, and fix it.

function UserProfile({ userId }) {
  // BUG: early return happens BEFORE the useEffect below.
  // On the second render, userId might be valid, so useEffect runs.
  // But on the first render (if !userId), it doesn't.
  // React sees: render 1 → 0 hooks; render 2 → 1 hook → MISMATCH.
  if (!userId) return <p>No user selected</p>;

  const [user, setUser] = useState(null); // ← called conditionally!

  useEffect(() => {
    setTimeout(() => setUser({ name: 'Alice' }), 300);
  }, [userId]);

  if (!user) return <p>Loading…</p>;
  return <p>User: <strong>{user.name}</strong></p>;
}

// TODO: Fix UserProfile — move ALL hooks above the early returns.
// Rule: hooks first, conditional rendering after.
//
// Fixed skeleton:
// function UserProfile({ userId }) {
//   const [user, setUser] = useState(null);   ← unconditional
//   useEffect(() => { ... }, [userId]);       ← unconditional
//   if (!userId) return <p>No user selected</p>;
//   if (!user)   return <p>Loading…</p>;
//   return <p>User: {user.name}</p>;
// }

function Exercise2() {
  const [userId, setUserId] = useState(null);

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setUserId(null)}>No user</button>
        <button onClick={() => setUserId(42)}>User 42</button>
      </div>
      {/* This will error until you fix UserProfile */}
      {/* <UserProfile userId={userId} /> */}
      <p style={{ fontSize: 12, color: '#888' }}>
        Uncomment UserProfile, observe the error, fix it by moving
        all hooks above the early return.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Hooks in the right place — build a rule-compliant component
//        that has multiple hooks AND conditional rendering.
//
// Build a DataPanel component that:
//   1. Has 3 state variables: loading, error, data
//   2. Has a useEffect that fetches data (fake) when `url` prop changes
//   3. Has a useRef for an abort controller
//   4. Renders: loading spinner | error message | data table
//
// All 3 hooks (useState ×3 or object, useEffect, useRef) must be
// called at the TOP LEVEL in every render, regardless of which
// UI branch is shown.
//
// This is the standard "data fetching component" pattern you'll
// write constantly in production.

function DataPanel({ url }) {
  // TODO: declare ALL hooks here (top level, unconditional)
  // const [loading, setLoading] = useState(true);
  // const [error,   setError]   = useState(null);
  // const [data,    setData]    = useState(null);
  // const abortRef = useRef(null);
  //
  // useEffect(() => {
  //   setLoading(true);
  //   setError(null);
  //   abortRef.current?.abort();
  //   const controller = new AbortController();
  //   abortRef.current = controller;
  //   // fake fetch
  //   const id = setTimeout(() => {
  //     if (!controller.signal.aborted) {
  //       setData([{ id: 1, value: `Data from ${url}` }]);
  //       setLoading(false);
  //     }
  //   }, 500);
  //   return () => { clearTimeout(id); controller.abort(); };
  // }, [url]);
  //
  // Conditional rendering AFTER all hooks:
  // if (loading) return <p>Loading…</p>;
  // if (error)   return <p>Error: {error}</p>;
  // return <ul>{data.map(d => <li key={d.id}>{d.value}</li>)}</ul>;

  return <p style={{ color: '#999' }}>Implement DataPanel — keep all hooks at top level</p>;
}

function Exercise3() {
  const [url, setUrl] = useState('/api/posts');
  const endpoints = ['/api/posts', '/api/users', '/api/comments'];

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {endpoints.map(ep => (
          <button
            key={ep}
            onClick={() => setUrl(ep)}
            style={{ fontWeight: url === ep ? 'bold' : 'normal' }}
          >
            {ep}
          </button>
        ))}
      </div>
      <DataPanel url={url} />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Use this to answer: "Why do hooks depend on call order?"
//
// React internally keeps a linked list of hook states per component.
// On render 1: [State0=0, State1='', Effect0=fn]
// On render 2: React expects the SAME NUMBER in the SAME ORDER.
//
// Simulate what React does — walk the hook states in order.
// When a conditional removes a hook, the next hook reads the
// WRONG state slot.

function Playground() {
  const [show, setShow] = useState(true);

  // Simulate: what if count's hook shifts position?
  const countSlot = show ? useState(0) : null; // ← illegal pattern illustrated
  const [name, setName] = useState('');

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13 }}>
        This playground is for reading — don't run the conditional hook above.
      </p>
      <p style={{ fontSize: 12, color: '#555' }}>
        Imagine render 1: hook list = [show=true, count=0, name='']<br />
        Render 2 (show=false): hook list = [show=false, name='']<br />
        React thinks name is at slot 1. But slot 1 stored count=0.<br />
        → name gets the value 0. show=false "eats" the count slot.
        This is the exact corruption the rules prevent.
      </p>
      <p style={{ fontSize: 12, color: '#888' }}>
        The ESLint plugin <code>eslint-plugin-react-hooks</code> catches
        ALL these violations statically before you even run the code.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>Rules of Hooks</h1>

      <h2>Exercise 1 — Find & Fix 3 Violations</h2>
      <p style={styles.goal}>
        Identify each BugN, add BUG: + WHY: comments, then rewrite correctly.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Early Return Before a Hook</h2>
      <p style={styles.goal}>
        Move all hooks above the early return in UserProfile.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Rule-Compliant Multi-Hook Component</h2>
      <p style={styles.goal}>
        Build DataPanel with 3 hooks at top level + conditional rendering after.
      </p>
      <Exercise3 />

      <h2>Playground — Why Call Order Matters</h2>
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
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
