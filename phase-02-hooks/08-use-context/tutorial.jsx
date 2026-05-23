// ============================================================
// Topic:   useContext
// Phase:   2 — Hooks
// ============================================================
//
// Three things to master:
//   1. Create → Provide → Consume (the basic pattern)
//   2. The "all consumers re-render" problem (the gotcha)
//   3. Split contexts to fix it (the production pattern)
// ============================================================

import { useState, useContext, createContext, useMemo, useRef, memo } from 'react';

// ─── Shared helper ────────────────────────────────────────────
function RenderBadge({ label }) {
  const count = useRef(0);
  count.current++;
  return (
    <span style={{
      fontSize: 11,
      background: count.current > 1 ? '#ff9800' : '#4caf50',
      color: '#fff', borderRadius: 10, padding: '1px 8px',
    }}>
      {label} renders: {count.current}
    </span>
  );
}

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Create → Provide → Consume without prop drilling.
//
// The tree below has 4 levels: App → Section → Article → Byline.
// The "author" prop is needed only in Byline, but without context
// it must be passed through Section and Article (prop drilling).
//
// Steps:
//   1. Create an AuthorContext with createContext(null).
//   2. Provide it in Exercise1 by wrapping Section in
//      <AuthorContext.Provider value={author}>.
//   3. In Byline, consume it with useContext(AuthorContext).
//      Remove all the manual prop passing in Section and Article.
//   4. Add a "Change author" button to prove re-render propagates.
//
// Success: Byline shows the author name; Section and Article
//          no longer need an `author` prop at all.

// TODO: const AuthorContext = createContext(null);

function Byline(/* remove: { author } */) {
  // TODO: const author = useContext(AuthorContext);
  const author = '(not connected yet)';
  return (
    <p style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>
      Written by <strong>{author}</strong>
    </p>
  );
}

function Article(/* remove: { author } */) {
  return (
    <div style={{ padding: '0.5rem', background: '#fafafa', borderRadius: 4 }}>
      <p style={{ margin: '0 0 4px' }}>Article content…</p>
      <Byline /* remove: author={author} */ />
    </div>
  );
}

function Section(/* remove: { author } */) {
  return (
    <div style={{ border: '1px solid #eee', padding: '0.5rem', borderRadius: 6 }}>
      <h4 style={{ margin: '0 0 8px' }}>Section heading</h4>
      <Article /* remove: author={author} */ />
    </div>
  );
}

function Exercise1() {
  const [author, setAuthor] = useState('Alice');
  const authors = ['Alice', 'Bob', 'Carol'];

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {authors.map(a => (
          <button
            key={a}
            onClick={() => setAuthor(a)}
            style={{ fontWeight: author === a ? 'bold' : 'normal' }}
          >
            {a}
          </button>
        ))}
      </div>
      {/* TODO: wrap Section in <AuthorContext.Provider value={author}> */}
      <Section /* remove: author={author} */ />
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: The "all consumers re-render" problem.
//
// When a Provider's value changes, EVERY consumer re-renders —
// even if that consumer only reads part of the value.
//
// This exercise shows the bug, then fixes it by splitting contexts.
//
// Part A — observe the bug:
//   Click "Toggle dark mode" → both consumers re-render (expected).
//   Click "Increment count" → both consumers re-render (BUG!
//   CountDisplay doesn't care about `dark`, ThemeDisplay doesn't
//   care about `count`, but BOTH re-render because it's one object).
//
// Part B — fix by splitting into two contexts:
//   Create ThemeContext (for dark) and CountContext (for count).
//   After the fix, toggling dark should only re-render ThemeDisplay,
//   and incrementing count should only re-render CountDisplay.

// BUG: one combined context — all consumers re-render on any change
const CombinedContext = createContext({ dark: false, count: 0 });

function ThemeDisplay() {
  const { dark } = useContext(CombinedContext);
  return (
    <div style={{ padding: 8, background: dark ? '#333' : '#f5f5f5', borderRadius: 4 }}>
      <RenderBadge label="ThemeDisplay" />
      <p style={{ margin: 0, color: dark ? '#fff' : '#333', fontSize: 13 }}>
        Theme: {dark ? 'Dark 🌙' : 'Light ☀️'}
      </p>
    </div>
  );
}

function CountDisplay() {
  const { count } = useContext(CombinedContext);
  return (
    <div style={{ padding: 8, background: '#e3f2fd', borderRadius: 4 }}>
      <RenderBadge label="CountDisplay" />
      <p style={{ margin: 0, fontSize: 13 }}>Count: <strong>{count}</strong></p>
    </div>
  );
}

function Exercise2() {
  const [dark, setDark] = useState(false);
  const [count, setCount] = useState(0);

  // BUG: single value object — any change re-renders all consumers
  const value = { dark, count };
  // TODO Part B: split into two providers with separate contexts

  return (
    <CombinedContext.Provider value={value}>
      <div style={styles.box}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setDark(d => !d)}>Toggle dark mode</button>
          <button onClick={() => setCount(c => c + 1)}>Increment count</button>
        </div>
        <p style={{ fontSize: 12, color: '#888' }}>
          After splitting contexts: each consumer should only re-render
          when ITS data changes.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemeDisplay />
          <CountDisplay />
        </div>
      </div>
    </CombinedContext.Provider>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Production pattern — encapsulated context with a custom hook.
//
// In real apps you never export the raw context object. Instead you:
//   1. Create the context in a module (not exported)
//   2. Export a Provider component that owns the state
//   3. Export a custom hook (useAuth, useTheme, etc.) that
//      throws a useful error if used outside the Provider
//
// Complete the AuthProvider and useAuth hook below, then wire up
// the Login / Dashboard components that consume it.
//
// useAuth() must throw: "useAuth must be used inside <AuthProvider>"
// if called outside the provider (test this in Playground).

const AuthContext = createContext(null);

// TODO: implement AuthProvider
// function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const login  = useCallback(name => setUser({ name }), []);
//   const logout = useCallback(() => setUser(null), []);
//   const value  = useMemo(() => ({ user, login, logout }), [user, login, logout]);
//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// TODO: implement useAuth with guard
// function useAuth() {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
//   return ctx;
// }

function LoginForm() {
  // TODO: const { login } = useAuth();
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
        style={{ padding: '4px 8px' }}
      />
      <button onClick={() => { /* TODO: login(name) */ }}>
        Login
      </button>
    </div>
  );
}

function Dashboard() {
  // TODO: const { user, logout } = useAuth();
  return (
    <div style={{ padding: 8, background: '#e8f5e9', borderRadius: 4 }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        Welcome, <strong>(not connected)</strong>!
      </p>
      <button onClick={() => { /* TODO: logout() */ }}>Logout</button>
    </div>
  );
}

function Exercise3() {
  // TODO: const { user } = useAuth();
  const user = null;

  return (
    // TODO: wrap with <AuthProvider>
    <div style={styles.box}>
      {user ? <Dashboard /> : <LoginForm />}
    </div>
    // </AuthProvider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Test: what value does a consumer get when there is NO provider above it?
//
// Steps:
//   1. useContext returns the DEFAULT VALUE passed to createContext().
//   2. Uncomment OrphanConsumer below and observe what it shows.
//   3. This is useful for testing components in isolation.

const ColorContext = createContext('blue'); // default value

function OrphanConsumer() {
  const color = useContext(ColorContext);
  return (
    <p style={{ color, fontSize: 14, fontWeight: 'bold' }}>
      Color from context (no provider): {color}
    </p>
  );
}

function Playground() {
  return (
    <div style={styles.box}>
      {/* No Provider wrapping OrphanConsumer — reads the default */}
      <OrphanConsumer />
      <p style={{ fontSize: 12, color: '#888' }}>
        The consumer reads 'blue' from the createContext default,
        not from any Provider.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>useContext</h1>

      <h2>Exercise 1 — Create → Provide → Consume</h2>
      <p style={styles.goal}>
        Eliminate prop drilling by threading `author` through context.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — All Consumers Re-render (fix by splitting)</h2>
      <p style={styles.goal}>
        Split CombinedContext into two so each consumer only re-renders when its data changes.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Encapsulated Auth Context (production pattern)</h2>
      <p style={styles.goal}>
        Implement AuthProvider + useAuth with a guard error.
      </p>
      <Exercise3 />

      <h2>Playground — Default Value (no provider)</h2>
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
