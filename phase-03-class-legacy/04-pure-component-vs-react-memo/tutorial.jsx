// ============================================================
// Topic:   PureComponent vs React.memo
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz or: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState, useMemo, useCallback, useContext, createContext } from 'react';

// ─── Shared styles ────────────────────────────────────────────
const S = {
  box:    { border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' },
  btn:    { margin: '0 6px 6px 0', padding: '4px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  note:   { fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' },
  count:  { fontWeight: 'bold', color: '#c55', fontSize: '1.1rem' },
  grid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  red:    { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#e55', color: '#fff', marginRight: 6 },
  green:  { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#5a5', color: '#fff', marginRight: 6 },
  yellow: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#b80', color: '#fff', marginRight: 6 },
  purple: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#77c', color: '#fff', marginRight: 6 },
};

// ─── Exercise 1 — Side-by-side render count comparison ────────
//
// Four versions of the same "user card" component, each with a different
// optimization strategy. A single parent with two unrelated state fields
// (userName that the card cares about, and tick that it doesn't).
//
// Observe the render counts as you click each button:
//   • "Increment noise" → should NOT cause the card to re-render (if optimized)
//   • "Update name"     → should cause all cards to re-render (prop changed)
//
// The render counter is stored on the instance (class) or in a ref (function) so
// it survives renders without triggering more.
//
// Your tasks:
//   [ ] Predict which buttons cause re-renders for each version BEFORE clicking.
//   [ ] After observing, explain why PureComponent also guards state changes
//       (hint: it compares both props AND state, unlike React.memo which only does props).
//   [ ] Note the boolean inversion:
//         SCU returns false  → skip render ("props not equal means render")
//         memo comparator returns true → skip render ("props equal means skip")

// 1a. Regular class component — re-renders on everything
class UserCardComponent extends React.Component {
  renderCount = 0;
  render() {
    this.renderCount++;
    return (
      <div style={S.box}>
        <span style={S.red}>Component</span>
        <p>👤 {this.props.name}</p>
        <p>renders: <span style={S.count}>{this.renderCount}</span></p>
      </div>
    );
  }
}

// 1b. PureComponent — shallow-compares props AND state
class UserCardPure extends React.PureComponent {
  renderCount = 0;
  render() {
    this.renderCount++;
    return (
      <div style={S.box}>
        <span style={S.yellow}>PureComponent</span>
        <p>👤 {this.props.name}</p>
        <p>renders: <span style={S.count}>{this.renderCount}</span></p>
      </div>
    );
  }
}

// 1c. Regular function component — re-renders on everything
function UserCardFn({ name }) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={S.box}>
      <span style={S.red}>Function</span>
      <p>👤 {name}</p>
      <p>renders: <span style={S.count}>{renderCount.current}</span></p>
    </div>
  );
}

// 1d. React.memo — shallow-compares props only
const UserCardMemo = React.memo(function UserCardMemo({ name }) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={S.box}>
      <span style={S.green}>React.memo</span>
      <p>👤 {name}</p>
      <p>renders: <span style={S.count}>{renderCount.current}</span></p>
    </div>
  );
});

function Exercise1() {
  const [name, setName] = useState('Alice');
  const [noise, setNoise] = useState(0); // parent-only state — cards shouldn't care

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button style={S.btn} onClick={() => setNoise(n => n + 1)}>
          🔊 Increment noise (parent re-renders, prop unchanged)
        </button>
        <button style={S.btn} onClick={() => setName(n => n === 'Alice' ? 'Bob' : 'Alice')}>
          📝 Update name (actual prop change)
        </button>
      </div>
      <p style={S.note}>noise = {noise} — irrelevant to the cards, but causes parent to re-render</p>
      <div style={S.grid}>
        <UserCardComponent name={name} />
        <UserCardPure      name={name} />
        <UserCardFn        name={name} />
        <UserCardMemo      name={name} />
      </div>
    </div>
  );
}

// ─── Exercise 2 — The inline prop problem ─────────────────────
//
// React.memo uses shallow equality (===). If any prop is an object, array, or function
// created INLINE in JSX, it gets a new reference on every parent render.
// The memo comparison always sees "not equal" → re-renders every time.
//
// This exercise shows the broken pattern and asks you to fix it.
//
// Your tasks:
//   [ ] Click "Parent re-render" in the BROKEN section — observe the card re-renders
//       even though nothing relevant changed.
//   [ ] Fix the BROKEN version by stabilizing the references:
//         • user object    → useMemo
//         • onClick fn     → useCallback
//         • tags array     → useMemo
//   [ ] Verify: after the fix, "Parent re-render" should NOT increment the render count.

// The memoized card — only re-renders when props are shallowly different
const ProfileCardMemo = React.memo(function ProfileCard({ user, onClick, tags }) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={S.box}>
      <p>👤 {user.name} — {user.role}</p>
      <p>Tags: {tags.join(', ')}</p>
      <button style={S.btn} onClick={onClick}>Action</button>
      <p>renders: <span style={S.count}>{renderCount.current}</span></p>
    </div>
  );
});

// ❌ Broken parent — creates new references inline on every render
function ParentBroken() {
  const [noise, setNoise] = useState(0);

  return (
    <div style={{ ...S.box, borderColor: '#f99' }}>
      <span style={S.red}>BROKEN — inline props defeat memo</span>
      <br /><br />
      <button style={S.btn} onClick={() => setNoise(n => n + 1)}>
        Parent re-render (noise: {noise})
      </button>
      <ProfileCardMemo
        user={{ name: 'Alice', role: 'Engineer' }}     // ← new object every render
        onClick={() => console.log('clicked')}          // ← new function every render
        tags={['react', 'typescript', 'senior']}        // ← new array every render
      />
    </div>
  );
}

// ✅ Fixed parent — TODO: stabilize all three references
function ParentFixed() {
  const [noise, setNoise] = useState(0);

  // TODO: Stabilize user, onClick, and tags so ProfileCardMemo doesn't re-render
  // unnecessarily.
  //
  // const user     = useMemo(() => ({ name: 'Alice', role: 'Engineer' }), []);
  // const onClick  = useCallback(() => console.log('clicked'), []);
  // const tags     = useMemo(() => ['react', 'typescript', 'senior'], []);

  const user    = { name: 'Alice', role: 'Engineer' };     // ← fix: useMemo
  const onClick = () => console.log('clicked');             // ← fix: useCallback
  const tags    = ['react', 'typescript', 'senior'];        // ← fix: useMemo

  return (
    <div style={{ ...S.box, borderColor: '#8c8' }}>
      <span style={S.green}>FIXED — stabilize the references above</span>
      <br /><br />
      <button style={S.btn} onClick={() => setNoise(n => n + 1)}>
        Parent re-render (noise: {noise})
      </button>
      <ProfileCardMemo
        user={user}
        onClick={onClick}
        tags={tags}
      />
    </div>
  );
}

function Exercise2() {
  return (
    <div>
      <ParentBroken />
      <ParentFixed />
    </div>
  );
}

// ─── Exercise 3 — Custom comparator ───────────────────────────
//
// React.memo's default is shallow comparison. When a prop's reference changes but
// its logical content is the same, you can write a custom comparator to prevent
// the re-render.
//
// Scenario: A tag list component receives an array of strings. The parent creates
// a new array reference on every render (from filtering/sorting), but if the
// STRING CONTENTS are identical, the UI output is identical — no need to re-render.
//
// Default memo: new array ref → always re-renders (even with same strings).
// Custom comparator: compares array CONTENTS → skips render when strings match.
//
// Your tasks:
//   [ ] Implement the custom comparator for TagListCustom.
//       It should return true (skip re-render) when the arrays contain
//       the same strings in the same order.
//   [ ] Click "New array, same tags" and observe:
//       Default memo re-renders. Custom comparator skips it.
//   [ ] Click "Different tags" — both should re-render.
//
// Note the boolean semantics:
//   comparator returns true  → props are "equal" → SKIP re-render
//   comparator returns false → props "changed"   → DO re-render
//   (This is the OPPOSITE of shouldComponentUpdate's boolean meaning)

// Default memo — shallow comparison (array ref changes → always re-renders)
const TagListDefault = React.memo(function TagListDefault({ tags }) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={{ ...S.box, borderColor: '#aaf' }}>
      <span style={S.purple}>Default memo (shallow)</span>
      <p>Tags: {tags.join(', ')}</p>
      <p>renders: <span style={S.count}>{renderCount.current}</span></p>
    </div>
  );
});

// Custom comparator memo — compares array CONTENTS
const TagListCustom = React.memo(
  function TagListCustom({ tags }) {
    const renderCount = React.useRef(0);
    renderCount.current++;
    return (
      <div style={{ ...S.box, borderColor: '#5a5' }}>
        <span style={S.green}>Custom comparator (content)</span>
        <p>Tags: {tags.join(', ')}</p>
        <p>renders: <span style={S.count}>{renderCount.current}</span></p>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // TODO: Return true if tag arrays have the same contents (skip re-render).
    // Return false if they differ (allow re-render).
    //
    // Hint: Check length first. Then compare each element at the same index.
    //
    // if (prevProps.tags.length !== nextProps.tags.length) return false;
    // return prevProps.tags.every((tag, i) => tag === nextProps.tags[i]);
    return false; // ← change this (currently: always re-render, same as no memo)
  }
);

function Exercise3() {
  const [version, setVersion] = useState(0);
  const [useDifferent, setDifferent] = useState(false);

  // Creates a new array reference each click, but contents may be same or different
  const tags = useDifferent
    ? ['vue', 'svelte', 'angular']
    : ['react', 'typescript', 'senior']; // same strings, new array ref each render

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button style={S.btn} onClick={() => { setDifferent(false); setVersion(v => v + 1); }}>
          🔄 New array, same tags
        </button>
        <button style={S.btn} onClick={() => { setDifferent(true); setVersion(v => v + 1); }}>
          🔀 Different tags
        </button>
      </div>
      <p style={S.note}>
        "New array, same tags" → default memo re-renders (new ref); custom skips it (same content).
      </p>
      <div style={S.grid}>
        <TagListDefault tags={tags} />
        <TagListCustom  tags={tags} />
      </div>
    </div>
  );
}

// ─── Playground — The children prop breaking memo ─────────────
//
// A commonly missed gotcha: JSX children become the `children` prop.
// JSX creates new React element objects on every render.
// So <MemoWrapper><SomeChild /></MemoWrapper> ALWAYS re-renders MemoWrapper
// because `children` is a new element object each time.
//
// Observe:
//   [ ] Click "Parent re-render" → MemoWrapper re-renders despite memoization
//   [ ] How would you fix this? (pass children as a stable component reference,
//       or restructure so the memoized component has no children)
//
// Context bypass demo:
//   [ ] The Context section shows that even memoized components re-render on context changes.

const ThemeCtx = createContext('light');

const MemoWrapper = React.memo(function MemoWrapper({ children, title }) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={S.box}>
      <span style={S.green}>MemoWrapper</span>
      <p>{title}</p>
      <p style={S.note}>renders: {renderCount.current} (watch this climb despite memo)</p>
      {children}
    </div>
  );
});

const MemoWithContext = React.memo(function MemoWithContext({ label }) {
  const theme = useContext(ThemeCtx);
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={{ ...S.box, background: theme === 'dark' ? '#333' : '#fafafa', color: theme === 'dark' ? '#eee' : '#222' }}>
      <span style={S.green}>Memoized + useContext</span>
      <p>{label} — theme: <strong>{theme}</strong></p>
      <p style={S.note}>renders: {renderCount.current} (context bypasses memo)</p>
    </div>
  );
});

function Playground() {
  const [noise, setNoise]   = useState(0);
  const [theme, setTheme]   = useState('light');

  return (
    <ThemeCtx.Provider value={theme}>
      <div>
        <div style={{ marginBottom: '0.75rem' }}>
          <button style={S.btn} onClick={() => setNoise(n => n + 1)}>
            Parent re-render (noise: {noise})
          </button>
          <button style={S.btn} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            Toggle context theme
          </button>
        </div>

        {/* Children prop breaks memo — SomeChild is a new element each parent render */}
        <MemoWrapper title="Children prop defeats memo:">
          <p style={{ fontSize: '0.85rem' }}>I'm the children — new element every render 👆</p>
        </MemoWrapper>

        {/* Context bypasses memo — useContext subscribes to the provider directly */}
        <MemoWithContext label="Context update bypasses props guard" />

        <p style={S.note}>
          Fixes: avoid passing children to memoized components, or use stable element refs.
          For context: memoization cannot help — use context selector patterns (zustand/jotai) instead.
        </p>
      </div>
    </ThemeCtx.Provider>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 900 }}>
      <h1>PureComponent vs React.memo</h1>

      <h2>Exercise 1 — Side-by-side render counts</h2>
      <p style={S.note}>
        Predict which components re-render before clicking. Check your predictions.
        Note: PureComponent guards both props AND state; React.memo guards props only.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Fix the inline prop problem</h2>
      <p style={S.note}>
        Click "Parent re-render" in BROKEN → memo does nothing. Fix with{' '}
        <code>useMemo</code> / <code>useCallback</code>.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Custom comparator</h2>
      <p style={S.note}>
        Implement the custom comparator so "New array, same tags" doesn't re-render.
        Note the boolean inversion vs <code>shouldComponentUpdate</code>.
      </p>
      <Exercise3 />

      <h2>Playground — Children &amp; Context bypasses</h2>
      <Playground />
    </div>
  );
}
