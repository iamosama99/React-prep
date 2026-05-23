// ============================================================
// Topic:   useDebugValue
// Phase:   2 — Hooks
// ============================================================
//
// useDebugValue is DevTools-only. Zero runtime effect.
// Use it inside CUSTOM hooks (not components) to label the hook's
// internal state in React DevTools.
//
// To see it work: open React DevTools → Components panel →
// click a component → look at the Hooks section.
// ============================================================

import { useState, useEffect, useDebugValue, useCallback } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Basic label — make a custom hook inspectable in DevTools.
//
// useOnlineStatus below works fine but shows up in DevTools as
// just "State: true/false" — hard to understand at a glance.
//
// Steps:
//   1. Add useDebugValue inside useOnlineStatus.
//      Pass a human-readable string: online ? 'online' : 'offline'
//   2. Open React DevTools → Components → find StatusBadge.
//   3. In the Hooks section, look for OnlineStatus hook.
//      It should show: "OnlineStatus: online" (or "offline").
//   4. Toggle offline in DevTools Network tab — the label updates.
//
// Rule: useDebugValue goes at the END of the custom hook (after
//       all state and effects are set up).

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // TODO: useDebugValue(isOnline ? 'online' : 'offline');

  return isOnline;
}

function StatusBadge() {
  const isOnline = useOnlineStatus();
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 16, margin: 0 }}>
        <span style={{ color: isOnline ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
          {isOnline ? '🟢 online' : '🔴 offline'}
        </span>
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        Open React DevTools → Components → StatusBadge → Hooks.
        You should see "OnlineStatus: online".
      </p>
    </div>
  );
}

function Exercise1() {
  return <StatusBadge />;
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Formatter function — defer expensive formatting to DevTools-open time.
//
// The second argument to useDebugValue is a formatter function.
// React only calls it when DevTools is actually open — preventing
// expensive string work from running in production.
//
// Build a useUser hook that fetches/caches user data.
// Use a formatter to show: "Alice (admin) — last seen 2m ago"
//
// Steps:
//   1. Add useDebugValue(user, formatUser) where:
//        formatUser(u) => u ? `${u.name} (${u.role}) — id: ${u.id}` : 'loading'
//   2. The formatter is lazy — it won't run unless DevTools is open.
//      This is important for hooks used in tight loops.
//   3. Open DevTools and verify the formatted label appears.

const FAKE_USER = { id: 42, name: 'Alice', role: 'admin' };

function useUser(userId) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setUser(FAKE_USER), 600); // simulate fetch
    return () => clearTimeout(timer);
  }, [userId]);

  // TODO: useDebugValue(user, u => u ? `${u.name} (${u.role}) — id: ${u.id}` : 'loading…');

  return user;
}

function UserCard() {
  const user = useUser(42);

  if (!user) return <div style={styles.box}>Loading user…</div>;
  return (
    <div style={styles.box}>
      <p style={{ margin: 0, fontSize: 14 }}>
        <strong>{user.name}</strong> ({user.role}) — ID: {user.id}
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        DevTools should show: "User: Alice (admin) — id: 42"
      </p>
    </div>
  );
}

function Exercise2() {
  return <UserCard />;
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Add useDebugValue to an existing useDebounce hook.
//
// useDebounce is a common custom hook that delays a value update.
// Without a debug label, DevTools shows two opaque "State" entries.
// With useDebugValue you can tell immediately:
//   "Debounce { live: 'react hooks', debounced: 'react', delay: 300 }"
//
// Steps:
//   1. Implement useDebounce(value, delay) — see the stub.
//   2. Add useDebugValue with a formatter that shows:
//        `live: "${value}" → debounced: "${debounced}" (${delay}ms)`
//   3. Use it in the search box below.
//   4. Confirm in DevTools that the label updates as you type.

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  // TODO: useDebugValue(
  //   { value, debounced, delay },
  //   ({ value: v, debounced: d, delay: ms }) =>
  //     `live: "${v}" → debounced: "${d}" (${ms}ms)`
  // );

  return debounced;
}

function DebouncedSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  return (
    <div style={styles.box}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to see debounce in DevTools…"
        style={{ padding: '4px 8px' }}
      />
      <p style={{ fontSize: 13, margin: 0 }}>
        Live: <code>{query}</code> |
        Debounced: <code>{debouncedQuery}</code>
      </p>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        DevTools → Hooks should show the formatted debounce label.
      </p>
    </div>
  );
}

function Exercise3() {
  return <DebouncedSearch />;
}

// ─── Playground ──────────────────────────────────────────────
// Prove: useDebugValue has ZERO runtime effect.
//
// The test below counts renders. Adding or removing useDebugValue
// must NOT change the render count or cause any extra work.

function useCounterWithDebug(initial = 0) {
  const [count, setCount] = useState(initial);

  // This line has zero runtime cost — only DevTools reads it
  useDebugValue(count, n => `counter is ${n > 0 ? 'positive' : n < 0 ? 'negative' : 'zero'}`);

  return [count, setCount];
}

function Playground() {
  const [count, setCount] = useCounterWithDebug(0);

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 14, margin: 0 }}>count: <strong>{count}</strong></p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setCount(c => c + 1)}>+1</button>
        <button onClick={() => setCount(c => c - 1)}>−1</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        DevTools shows: "Counter: positive/negative/zero"<br />
        The formatter runs ONLY when DevTools is open (lazy evaluation).
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1>useDebugValue</h1>

      <h2>Exercise 1 — Basic Label: Online Status</h2>
      <p style={styles.goal}>
        Add useDebugValue so DevTools shows "online" or "offline" next to the hook.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Formatter: Lazy User Label</h2>
      <p style={styles.goal}>
        Use the formatter argument so expensive formatting only runs in DevTools.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Add to useDebounce</h2>
      <p style={styles.goal}>
        Label useDebounce with live/debounced values so the hook is self-documenting.
      </p>
      <Exercise3 />

      <h2>Playground — Zero Runtime Cost</h2>
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
