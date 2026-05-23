// ============================================================
// Topic:   getDerivedStateFromProps
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz or: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState, useMemo } from 'react';

// ─── Shared styles ────────────────────────────────────────────
const S = {
  box:   { border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' },
  btn:   { margin: '0 6px 6px 0', padding: '4px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  note:  { fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' },
  input: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginRight: 8, width: 220 },
  red:   { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#e55', color: '#fff', marginRight: 6 },
  green: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#5a5', color: '#fff', marginRight: 6 },
};

// ─── Exercise 1 — Implement the guarded getDerivedStateFromProps ──────────
//
// Scenario: An email input inside a settings form. The parent passes a userId
// (identifying which user's settings we're editing) and a defaultEmail.
// The input should:
//   • Sync to the new defaultEmail when userId changes (user switches)
//   • Let the user edit the email freely when they're on the same userId
//
// The tricky part: getDerivedStateFromProps runs before EVERY render — including
// renders triggered by the user typing. So a naive implementation overwrites
// the user's edits on every keystroke.
//
// Your tasks:
//   [ ] Implement getDerivedStateFromProps using the "store prevUserId in state" pattern.
//       Return the new email (and prevUserId) only when userId has actually changed.
//       Return null otherwise.
//
//   [ ] After implementing, test it:
//       - Type in the email box → your edits should survive (no overwrite)
//       - Click "Switch to User 2" → email resets to that user's default
//       - Type again → edits survive until you switch users again

const USER_DATA = {
  1: { email: 'alice@example.com', name: 'Alice' },
  2: { email: 'bob@example.com',   name: 'Bob'   },
};

class EmailInput extends React.Component {
  // State tracks the current email value AND the previous userId for comparison
  state = {
    email: this.props.defaultEmail,
    prevUserId: this.props.userId,
  };

  static getDerivedStateFromProps(props, state) {
    // TODO: Compare props.userId to state.prevUserId.
    // If they differ → a new user was loaded → return the new email and prevUserId.
    // If they're the same → the user is just typing → return null (don't overwrite).
    //
    // if (props.userId !== state.prevUserId) {
    //   return {
    //     email: props.defaultEmail,
    //     prevUserId: props.userId,
    //   };
    // }
    // return null;
    return null; // ← remove this line when you implement above
  }

  render() {
    const { name } = this.props;
    const { email } = this.state;
    return (
      <div style={S.box}>
        <p style={{ margin: '0 0 6px' }}>Editing: <strong>{name}</strong></p>
        <input
          style={S.input}
          value={email}
          onChange={e => this.setState({ email: e.target.value })}
          placeholder="Email address"
        />
        <p style={S.note}>
          Type freely. Switch users. Does the edit survive? Does the switch reset correctly?
        </p>
      </div>
    );
  }
}

function Exercise1() {
  const [userId, setUserId] = useState(1);
  const user = USER_DATA[userId];
  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        {[1, 2].map(id => (
          <button key={id} style={{ ...S.btn, fontWeight: userId === id ? 'bold' : 'normal' }}
            onClick={() => setUserId(id)}>
            Switch to User {id}
          </button>
        ))}
      </div>
      <EmailInput
        key={undefined}             // ← deliberately NOT using a key here (see Exercise 3)
        userId={userId}
        defaultEmail={user.email}
        name={user.name}
      />
    </div>
  );
}

// ─── Exercise 2 — Spot and fix the antipattern ───────────────
//
// The most common misuse of getDerivedStateFromProps is unconditional mirroring:
// always returning { value: props.value } regardless of what the user typed.
//
// The two forms below are identical in appearance.
// The BROKEN one uses an unconditional return — the user's edits are clobbered
// the moment the parent re-renders (e.g. because an unrelated state change happened).
//
// Your task:
//   [ ] Understand why BROKEN breaks: type something, then click "Trigger parent re-render".
//       Your edit disappears. Why?
//   [ ] Fix the BROKEN form by adding the prevValue guard.
//
// Key insight: getDerivedStateFromProps fires on EVERY render — not just when props change.
//             An unconditional return overwrites any state the user set locally.

// ❌ Antipattern — unconditional mirroring
class FormBroken extends React.Component {
  state = { value: this.props.value, prevValue: this.props.value };

  static getDerivedStateFromProps(props, state) {
    // BUG: always returns — overwrites user edits every time the parent re-renders
    return { value: props.value };
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#f99' }}>
        <span style={S.red}>BROKEN — edits get clobbered</span>
        <br /><br />
        <input
          style={S.input}
          value={this.state.value}
          onChange={e => this.setState({ value: e.target.value })}
          placeholder="Type something…"
        />
        <p style={S.note}>
          Type here, then click "Trigger re-render". Your text disappears.
        </p>
      </div>
    );
  }
}

// ✅ Fixed — TODO: add the prevValue guard so user edits survive
class FormFixed extends React.Component {
  state = { value: this.props.value, prevValue: this.props.value };

  static getDerivedStateFromProps(props, state) {
    // TODO: only return a new value when props.value actually changed.
    // Compare props.value to state.prevValue (which you store as the "last seen" prop value).
    //
    // if (props.value !== state.prevValue) {
    //   return { value: props.value, prevValue: props.value };
    // }
    // return null;
    return { value: this.props?.value }; // ← this is wrong — static, no `this`. Fix this.
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#8c8' }}>
        <span style={S.green}>FIXED — add the guard above</span>
        <br /><br />
        <input
          style={S.input}
          value={this.state.value}
          onChange={e => this.setState({ value: e.target.value })}
          placeholder="Type something…"
        />
        <p style={S.note}>
          After fixing: type here, trigger re-render → your text should survive.
        </p>
      </div>
    );
  }
}

function Exercise2() {
  const [noise, setNoise] = useState(0); // causes parent re-render when incremented
  const [propValue, setPropValue] = useState('initial@value.com');
  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button style={S.btn} onClick={() => setNoise(n => n + 1)}>
          🔄 Trigger parent re-render (noise: {noise})
        </button>
        <button style={S.btn} onClick={() => setPropValue('new@prop.com')}>
          Change prop value → "new@prop.com"
        </button>
      </div>
      <FormBroken value={propValue} />
      <FormFixed  value={propValue} />
    </div>
  );
}

// ─── Exercise 3 — key prop reset vs getDerivedStateFromProps ──
//
// React team's advice: "Almost never use getDerivedStateFromProps."
// The most common alternative for resetting state when an identity changes: the `key` prop.
//
// When a component's `key` changes, React unmounts the old one and mounts a fresh instance.
// State is automatically reset — no getDerivedStateFromProps needed.
//
// This exercise shows both approaches side by side for the same problem:
// "When the selected user changes, reset the email input to their default."
//
// Study the two approaches, then answer the questions in comments below.

// Approach A: key prop (full unmount/remount)
function EmailInputFunctional({ defaultEmail, name }) {
  const [email, setEmail] = useState(defaultEmail);
  return (
    <div style={{ ...S.box, borderColor: '#88f' }}>
      <span style={{ ...S.green, background: '#77c' }}>key-based reset</span>
      <p style={{ margin: '6px 0' }}>Editing: <strong>{name}</strong></p>
      <input
        style={S.input}
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <p style={S.note}>Unmounts and remounts entirely when key changes → fresh state.</p>
    </div>
  );
}

// Approach B: getDerivedStateFromProps (surgical state update, keep instance alive)
class EmailInputDerived extends React.Component {
  state = { email: this.props.defaultEmail, prevUserId: this.props.userId };

  static getDerivedStateFromProps(props, state) {
    if (props.userId !== state.prevUserId) {
      return { email: props.defaultEmail, prevUserId: props.userId };
    }
    return null;
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#fa5' }}>
        <span style={{ ...S.green, background: '#d80' }}>getDerivedStateFromProps reset</span>
        <p style={{ margin: '6px 0' }}>Editing: <strong>{this.props.name}</strong></p>
        <input
          style={S.input}
          value={this.state.email}
          onChange={e => this.setState({ email: e.target.value })}
        />
        <p style={S.note}>Keeps the same instance alive; only resets email.</p>
      </div>
    );
  }
}

function Exercise3() {
  const [userId, setUserId] = useState(1);
  const user = USER_DATA[userId];

  // Questions to think through:
  // Q1: What does the key prop approach lose that getDerivedStateFromProps keeps?
  //     (Hint: focus state, animation progress, scroll position of the component)
  //
  // Q2: If this component had 5 state fields and you only wanted to reset 2 of them
  //     when userId changes, which approach would you use and why?
  //
  // Q3: If you add a ref to measure the DOM node's width, which approach preserves
  //     the measurement across user switches?

  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        {[1, 2].map(id => (
          <button key={id} style={{ ...S.btn, fontWeight: userId === id ? 'bold' : 'normal' }}
            onClick={() => setUserId(id)}>
            User {id}
          </button>
        ))}
      </div>
      <p style={S.note}>
        Type in each input, then switch users. Both reset — but differently.
      </p>
      {/* key changes → entire component unmounts, fresh state */}
      <EmailInputFunctional key={userId} defaultEmail={user.email} name={user.name} />
      {/* instance stays alive → getDerivedStateFromProps surgically resets email */}
      <EmailInputDerived userId={userId} defaultEmail={user.email} name={user.name} />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// The functional equivalent of getDerivedStateFromProps.
//
// React allows calling setState during render (before returning JSX) as long as
// it's conditional. This triggers a synchronous re-render before the browser paints.
// It looks strange but is the official functional equivalent.
//
// Study this pattern, then try:
//   [ ] What happens if you remove the `if` guard and always call setPrevId?
//   [ ] Add a console.log inside the if — how many times does it fire?
//   [ ] Why is useMemo usually a better choice for derived values?

function EmailInputHook({ userId, defaultEmail, name }) {
  const [email, setEmail]   = useState(defaultEmail);
  const [prevId, setPrevId] = useState(userId);

  // Functional equivalent of getDerivedStateFromProps
  // React allows setState calls during render — they're batched and synchronous
  if (prevId !== userId) {
    setPrevId(userId);      // update the "previous" tracker
    setEmail(defaultEmail); // reset email to new default
  }

  return (
    <div style={S.box}>
      <p style={{ margin: '0 0 6px' }}>Editing: <strong>{name}</strong></p>
      <input
        style={S.input}
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email address"
      />
      <p style={S.note}>
        This is the functional equivalent of getDerivedStateFromProps — and just as rare and
        awkward. Prefer a key prop or useMemo where possible.
      </p>
    </div>
  );
}

function Playground() {
  const [userId, setUserId] = useState(1);
  const user = USER_DATA[userId];
  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        {[1, 2].map(id => (
          <button key={id} style={{ ...S.btn, fontWeight: userId === id ? 'bold' : 'normal' }}
            onClick={() => setUserId(id)}>
            User {id}
          </button>
        ))}
      </div>
      <EmailInputHook userId={userId} defaultEmail={user.email} name={user.name} />
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 800 }}>
      <h1>getDerivedStateFromProps</h1>

      <h2>Exercise 1 — Implement the guard</h2>
      <p style={S.note}>
        Implement <code>getDerivedStateFromProps</code> with the <code>prevUserId</code> pattern.
        User edits should survive parent re-renders. Switching users should reset the email.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Spot and fix the antipattern</h2>
      <p style={S.note}>
        Type in both inputs, then click "Trigger parent re-render". Fix the BROKEN version.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — key prop vs getDerivedStateFromProps</h2>
      <p style={S.note}>
        Both approaches reset state on user switch. When would you choose one over the other?
      </p>
      <Exercise3 />

      <h2>Playground — Functional equivalent</h2>
      <Playground />
    </div>
  );
}
