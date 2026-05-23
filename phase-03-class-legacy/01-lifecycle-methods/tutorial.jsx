// ============================================================
// Topic:   Lifecycle Methods
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz or: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState } from 'react';

// ─── Shared styles ────────────────────────────────────────────
const S = {
  box:   { border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' },
  btn:   { margin: '0 6px 6px 0', padding: '4px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  note:  { fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' },
  red:   { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#e55', color: '#fff', marginRight: 6 },
  green: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#5a5', color: '#fff', marginRight: 6 },
};

// ─── Exercise 1 — Mount / Unmount ────────────────────────────
//
// Build a Timer class component that makes the lifecycle sequence visible in the UI.
//
// Your tasks:
//   [ ] componentDidMount  — start a setInterval that increments seconds every 1 s;
//                            store the id on this.timer so you can cancel it later.
//                            Then push 'componentDidMount' into this.state.events.
//   [ ] componentWillUnmount — call clearInterval(this.timer) to stop the ticker.
//                              Also console.log('unmounted — interval cleared').
//
// After implementing, toggle the button and observe:
//   • Events append AFTER the first render (componentDidMount fires post-commit)
//   • Clicking "Unmount" stops the counter immediately — cleanup worked
//   • Re-mounting starts fresh at 0 s — it's a brand-new instance
//
// Hook equivalent:   useEffect(() => { ... return cleanup; }, [])

class Timer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      seconds: 0,
      events: ['① constructor'],
    };
    // render() and getDerivedStateFromProps happen next (before componentDidMount)
  }

  componentDidMount() {
    // TODO: start the interval and push '④ componentDidMount' into events.
    //
    // this.timer = setInterval(() => {
    //   this.setState(s => ({ seconds: s.seconds + 1 }));
    // }, 1000);
    // this.setState(s => ({ events: [...s.events, '④ componentDidMount'] }));
  }

  componentWillUnmount() {
    // TODO: clear the interval and log to console.
    //
    // clearInterval(this.timer);
    // console.log('componentWillUnmount — interval cleared');
  }

  render() {
    const { seconds, events } = this.state;
    return (
      <div style={S.box}>
        <p>⏱ <strong>{seconds}s</strong> elapsed</p>
        <p style={S.note}>② getDerivedStateFromProps → ③ render happen between events [1] and [4]</p>
        <ol style={{ fontSize: '0.85rem', margin: '4px 0', paddingLeft: '1.2rem' }}>
          {events.map((e, i) => <li key={i}>{e}</li>)}
        </ol>
      </div>
    );
  }
}

function Exercise1() {
  const [mounted, setMounted] = useState(true);
  return (
    <div>
      <button style={S.btn} onClick={() => setMounted(m => !m)}>
        {mounted ? '🗑 Unmount Timer' : '▶ Mount Timer'}
      </button>
      {mounted && <Timer />}
      <p style={S.note}>Open DevTools → Console to see the unmount log.</p>
    </div>
  );
}

// ─── Exercise 2 — componentDidUpdate with a guard ────────────
//
// When a userId prop changes the component should re-fetch user data.
// The naive implementation causes an INFINITE LOOP. Find the bug, then fix it.
//
// The two versions below are identical — your task is to add the guard to FIXED.
//
// Your task:
//   [ ] In UserProfileFixed.componentDidUpdate, add:
//         if (prevProps.userId !== this.props.userId) { ... }
//       so that fetchUser only runs when the userId actually changed.
//
// After the fix, click the user buttons. Observe:
//   ❌ BUGGY  → fetch count climbs uncontrollably (infinite loop)
//   ✅ FIXED  → fetch count increases by exactly 1 per user switch

const FAKE_USERS = {
  1: { name: 'Alice', role: 'Engineer' },
  2: { name: 'Bob',   role: 'Designer' },
  3: { name: 'Carol', role: 'Manager'  },
};

// ❌ Buggy — no guard in componentDidUpdate
class UserProfileBuggy extends React.Component {
  state = { user: null, fetchCount: 0 };

  componentDidMount() {
    this.fetchUser(this.props.userId);
  }

  componentDidUpdate(/* prevProps */) {
    // Bug: no guard → this fires after every setState below → infinite loop
    this.fetchUser(this.props.userId);
  }

  fetchUser(id) {
    const user = FAKE_USERS[id];
    this.setState(s => ({ user, fetchCount: s.fetchCount + 1 }));
  }

  render() {
    const { user, fetchCount } = this.state;
    return (
      <div style={{ ...S.box, borderColor: '#f99' }}>
        <span style={S.red}>BUGGY</span>
        {user ? `${user.name} — ${user.role}` : 'Loading…'}
        {'  '}
        <span style={{ color: '#e55', fontSize: '0.82rem' }}>
          fetched {fetchCount}× (should be 1 per user)
        </span>
      </div>
    );
  }
}

// ✅ Fixed — TODO: add the guard
class UserProfileFixed extends React.Component {
  state = { user: null, fetchCount: 0 };

  componentDidMount() {
    this.fetchUser(this.props.userId);
  }

  componentDidUpdate(prevProps) {
    // TODO: add the guard here so fetchUser only runs when userId changed.
    //
    // if (prevProps.userId !== this.props.userId) {
    //   this.fetchUser(this.props.userId);
    // }
  }

  fetchUser(id) {
    const user = FAKE_USERS[id];
    this.setState(s => ({ user, fetchCount: s.fetchCount + 1 }));
  }

  render() {
    const { user, fetchCount } = this.state;
    return (
      <div style={{ ...S.box, borderColor: '#8c8' }}>
        <span style={S.green}>FIXED</span>
        {user ? `${user.name} — ${user.role}` : 'Loading…'}
        {'  '}
        <span style={{ color: '#5a5', fontSize: '0.82rem' }}>
          fetched {fetchCount}× (should match number of user switches)
        </span>
      </div>
    );
  }
}

function Exercise2() {
  const [userId, setUserId] = useState(1);
  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        {[1, 2, 3].map(id => (
          <button key={id} style={{ ...S.btn, fontWeight: userId === id ? 'bold' : 'normal' }}
            onClick={() => setUserId(id)}>
            User {id}
          </button>
        ))}
      </div>
      <UserProfileBuggy userId={userId} />
      <UserProfileFixed userId={userId} />
    </div>
  );
}

// ─── Exercise 3 — getSnapshotBeforeUpdate: scroll preservation ─
//
// A chat list where new messages are prepended (top). When a message arrives,
// the naive version jumps the user's viewport. The snapshot version doesn't.
//
// getSnapshotBeforeUpdate runs AFTER render but BEFORE React mutates the DOM.
// Its return value is passed as the 3rd argument to componentDidUpdate.
//
// The WithSnap version is complete — read it, understand it.
// Your tasks:
//   [ ] Add a comment explaining WHY the snapshot read must happen before the DOM update
//   [ ] Trace through: what value does scrollHeight - scrollTop represent?
//   [ ] Answer: where does `snapshot` come from in componentDidUpdate's signature?
//
// To observe the difference:
//   1. Scroll both lists down a bit
//   2. Click "+ Add message"
//   3. BUGGY list jumps up; snapshot list stays where you were

class ChatListNoSnap extends React.Component {
  render() {
    return (
      <div style={{ height: 130, overflowY: 'auto', ...S.box, borderColor: '#f99' }}>
        <span style={S.red}>No snapshot</span>
        {this.props.messages.map(m => (
          <div key={m.id} style={{ padding: '2px 0', fontSize: '0.82rem' }}>{m.text}</div>
        ))}
      </div>
    );
  }
}

class ChatListWithSnap extends React.Component {
  listRef = React.createRef();

  getSnapshotBeforeUpdate(prevProps) {
    // A new message was prepended — read the scroll state BEFORE the DOM updates.
    // After the DOM update, scrollHeight will be larger and scrollTop will have shifted.
    if (prevProps.messages.length < this.props.messages.length) {
      const list = this.listRef.current;
      return list.scrollHeight - list.scrollTop; // distance from bottom
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // snapshot = the value returned above (or null if no new messages)
    if (snapshot !== null) {
      const list = this.listRef.current;
      // Restore the same distance-from-bottom so the view doesn't jump
      list.scrollTop = list.scrollHeight - snapshot;
    }
  }

  render() {
    return (
      <div ref={this.listRef} style={{ height: 130, overflowY: 'auto', ...S.box, borderColor: '#8c8' }}>
        <span style={S.green}>With snapshot</span>
        {this.props.messages.map(m => (
          <div key={m.id} style={{ padding: '2px 0', fontSize: '0.82rem' }}>{m.text}</div>
        ))}
      </div>
    );
  }
}

function Exercise3() {
  const [messages, setMessages] = useState(
    Array.from({ length: 20 }, (_, i) => ({ id: i, text: `Old message ${i + 1}` }))
  );
  const addMessage = () => {
    const id = Date.now();
    setMessages(prev => [
      { id, text: `🆕 New — ${new Date().toLocaleTimeString()}` },
      ...prev,
    ]);
  };
  return (
    <div>
      <p style={S.note}>
        Step 1: scroll both lists down. Step 2: add a message. Observe the jump difference.
      </p>
      <button style={S.btn} onClick={addMessage}>+ Add message at top</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <ChatListNoSnap messages={messages} />
        <ChatListWithSnap messages={messages} />
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// A complete lifecycle logger. Open DevTools → Console and click the buttons
// to see every phase fire in sequence.
//
// Study the console output, then try:
//   [ ] Add shouldComponentUpdate — return false and see what's skipped
//   [ ] What happens if you call setState inside componentDidUpdate with NO guard?
//   [ ] Add getDerivedStateFromProps and put a console.log inside it — how often does it fire?

class LifecycleLogger extends React.Component {
  static getDerivedStateFromProps(props, state) {
    // Fires on EVERY render — mount and update
    if (props.value !== state.prevValue) {
      return { doubled: props.value * 2, prevValue: props.value };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = { doubled: props.value * 2, prevValue: props.value };
    console.log('%c[1] constructor', 'color: #888');
  }

  componentDidMount() {
    console.log('%c[4] componentDidMount', 'color: green');
  }

  componentDidUpdate(prevProps, prevState) {
    console.log('%c[u] componentDidUpdate', 'color: blue', { prevProps, props: this.props });
  }

  componentWillUnmount() {
    console.log('%c[x] componentWillUnmount', 'color: red');
  }

  render() {
    console.log('%c[r] render', 'color: #aaa');
    return (
      <div style={S.box}>
        <p>props.value: <strong>{this.props.value}</strong></p>
        <p>derived (×2): <strong>{this.state.doubled}</strong></p>
        <p style={S.note}>Watch the DevTools Console for the sequence.</p>
      </div>
    );
  }
}

// Lifecycle → Hook equivalents (reference)
//   constructor               → useState initial value / useRef
//   getDerivedStateFromProps  → setState during render (functional equivalent, rare)
//   componentDidMount         → useEffect(() => { ... }, [])
//   componentDidUpdate        → useEffect(() => { ... }, [dep])
//   componentWillUnmount      → useEffect(() => { return cleanup; }, [])
//   getSnapshotBeforeUpdate   → useLayoutEffect (partial equivalent)
//   shouldComponentUpdate     → React.memo / useMemo / useCallback

function Playground() {
  const [value, setValue] = useState(3);
  const [mounted, setMounted] = useState(true);
  return (
    <div>
      <button style={S.btn} onClick={() => setValue(v => v + 1)}>Increment value</button>
      <button style={S.btn} onClick={() => setMounted(m => !m)}>
        {mounted ? 'Unmount' : 'Mount'}
      </button>
      {mounted && <LifecycleLogger value={value} />}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 800 }}>
      <h1>Lifecycle Methods</h1>

      <h2>Exercise 1 — Mount &amp; Unmount</h2>
      <p style={S.note}>
        Implement <code>componentDidMount</code> (start interval) and{' '}
        <code>componentWillUnmount</code> (clear it) in the <code>Timer</code> class.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — componentDidUpdate Guard</h2>
      <p style={S.note}>
        Add the <code>if (prevProps.userId !== this.props.userId)</code> guard to the
        FIXED version. Watch the fetch count stop climbing.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — getSnapshotBeforeUpdate</h2>
      <p style={S.note}>
        Read the WithSnap implementation. Scroll down in both lists, then add a message.
      </p>
      <Exercise3 />

      <h2>Playground — Full Lifecycle Logger</h2>
      <Playground />
    </div>
  );
}
