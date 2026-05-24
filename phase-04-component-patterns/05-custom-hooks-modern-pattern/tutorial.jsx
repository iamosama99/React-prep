// ============================================================
// Topic:   Custom Hooks as the Modern Pattern
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Exercise 1: useToggle — Tuple Return + Stability ────────
//
// SITUATION
//   Toggle behavior (open/closed, on/off, show/hide) appears everywhere in UI.
//   Writing useState + a toggle function inline every time is repetitive and
//   error-prone (forgetting to use the functional updater form, for example).
//
// YOUR TASK — Build useToggle(initialValue = false)
//
//   RETURN SHAPE: tuple [on, toggle]   ← why tuple? so callers can alias:
//     const [menuOpen, toggleMenu] = useToggle();
//     const [modalOpen, toggleModal] = useToggle();
//
//   REQUIREMENTS:
//   1. `on` is a boolean
//   2. `toggle` is a stable function (useCallback) — callers may put it in
//      dependency arrays. Without useCallback, every render creates a new
//      function identity → infinite loops in effects that depend on it.
//   3. The toggle MUST use the functional updater form: setOn(v => !v)
//      (not setOn(!on) — that closes over stale state in concurrent mode)
//
//   SELF-CHECK: add toggle to a useEffect dependency array — it should not
//   cause the effect to re-run repeatedly. That's your stability test.

function useToggle(initialValue = false) {
  // TODO: implement
  // const [on, setOn] = useState(initialValue);
  // const toggle = useCallback(() => setOn(v => !v), []);
  // return [on, toggle];
  return [false, () => {}]; // stub
}

function Exercise1() {
  const [menuOpen, toggleMenu] = useToggle(false);
  const [termsAccepted, toggleTerms] = useToggle(false);

  // Stability test — toggle must NOT re-run this effect repeatedly
  useEffect(() => {
    // This effect should run exactly ONCE (on mount).
    // If toggleMenu isn't stable, it re-runs every render.
    console.log('Effect ran — this should print once only');
  }, [toggleMenu]);

  return (
    <section>
      <h2>Exercise 1 — useToggle</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Check the console — "Effect ran" should print exactly once, not on every toggle.
        That confirms toggle is referentially stable.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 200 }}>
          <button onClick={toggleMenu} style={{ marginBottom: 8 }}>
            {menuOpen ? '✕ Close menu' : '☰ Open menu'}
          </button>
          {menuOpen && (
            <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
              <li>Dashboard</li>
              <li>Profile</li>
              <li>Settings</li>
            </ul>
          )}
        </div>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 200 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={termsAccepted} onChange={toggleTerms} />
            I accept the terms
          </label>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: termsAccepted ? '#16a34a' : '#64748b' }}>
            {termsAccepted ? '✅ Terms accepted' : 'Please accept to continue'}
          </p>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 2: useFetch — enabled option + cleanup ─────────
//
// SITUATION
//   Data fetching is one of the most common hook use cases, but most naive
//   implementations have two correctness bugs:
//   1. No way to conditionally skip the fetch (you can't put a hook in an if)
//   2. No cleanup — if the component unmounts mid-request, the setState call
//      still fires, causing "Can't perform a React state update on an unmounted
//      component" warnings (or in React 18: silent staleness bugs)
//
// YOUR TASK — Build useFetch(url, options)
//
//   SIGNATURE: useFetch(url, { enabled = true } = {})
//   RETURNS: { data, loading, error }
//
//   REQUIREMENTS:
//   1. When enabled=false, don't fetch (skip the effect body early)
//      This is the hook-safe way to conditionally run side effects
//   2. Use an `isCancelled` flag in the cleanup to prevent setState after unmount
//      (StrictMode will double-invoke this — your flag makes it safe)
//   3. Re-fetch whenever `url` changes (url is a dependency)
//   4. Reset to loading state when url changes (don't show stale data)
//
//   OBJECT RETURN (not tuple) — because three values with distinct names
//   scale better than a positional array.

function useFetch(url, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO:
    // if (!enabled) return;    ← skip the fetch
    // let isCancelled = false; ← flag for cleanup
    // setLoading(true);
    // setData(null);
    // setError(null);
    //
    // fetch(url)
    //   .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    //   .then(d => { if (!isCancelled) { setData(d); setLoading(false); } })
    //   .catch(e => { if (!isCancelled) { setError(e.message); setLoading(false); } });
    //
    // return () => { isCancelled = true; };
  }, [url, enabled]);

  return { data, loading, error };
}

function Exercise2() {
  const [userId, setUserId] = useState(1);
  const [fetchEnabled, setFetchEnabled] = useState(true);

  const { data, loading, error } = useFetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`,
    { enabled: fetchEnabled }
  );

  return (
    <section>
      <h2>Exercise 2 — useFetch with enabled option + cleanup</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Toggle "enabled" to pause/resume fetching without violating Rules of Hooks.
        Change userId to trigger a new fetch — the old in-flight request is cancelled.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={fetchEnabled}
            onChange={e => setFetchEnabled(e.target.checked)}
          />
          Fetch enabled
        </label>
        <button onClick={() => setUserId(id => Math.max(1, id - 1))} disabled={userId <= 1}>← Prev user</button>
        <button onClick={() => setUserId(id => Math.min(10, id + 1))} disabled={userId >= 10}>Next user →</button>
        <span style={{ fontSize: 13, alignSelf: 'center' }}>User ID: {userId}</span>
      </div>

      {!fetchEnabled && (
        <p style={{ color: '#92400e', background: '#fef3c7', padding: 8, borderRadius: 6, fontSize: 13 }}>
          Fetching paused — enabled=false. No hook rule violated.
        </p>
      )}
      {loading && <p>⏳ Loading user {userId}…</p>}
      {error && <p style={{ color: '#dc2626' }}>❌ Error: {error}</p>}
      {data && (
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, maxWidth: 360 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: '#64748b' }}>{data.email}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{data.company?.name}</p>
        </div>
      )}
    </section>
  );
}


// ─── Exercise 3: useDebounce — Production Quality ─────────────
//
// SITUATION
//   A search input fires a fetch on every keystroke. With a fast typist that's
//   10 requests per second — most of them wasted. You need to wait until the
//   user stops typing for 300ms before firing.
//
// YOUR TASK — Build useDebounce(value, delay)
//
//   SIGNATURE: useDebounce(value, delay = 300)
//   RETURNS: debouncedValue (same type as value, just delayed)
//
//   HOW IT WORKS:
//   - When value changes, start a timer for `delay` ms
//   - If value changes again before the timer fires, cancel the old timer
//     and start a new one (debounce = "reset on each change")
//   - When the timer fires, update debouncedValue
//   - Cleanup: cancel the timer on unmount (or before the next effect)
//
//   Then compose it with useFetch:
//     const debouncedQuery = useDebounce(searchQuery, 400);
//     const { data } = useFetch(url, { enabled: debouncedQuery.length > 1 });
//   This is hooks composing naturally — no nesting, no callbacks.
//
// SELF-CHECK: Type quickly in the search box. Requests should only fire
//   ~400ms after you stop typing, not on every keystroke.
//   Open the Network tab to verify.

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // TODO:
    // const timer = setTimeout(() => setDebouncedValue(value), delay);
    // return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function Exercise3() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  // Compose useDebounce + useFetch — two hooks, no nesting
  const { data: results, loading } = useFetch(
    `https://jsonplaceholder.typicode.com/users?q=${debouncedQuery}`,
    { enabled: debouncedQuery.length > 1 }
  );

  return (
    <section>
      <h2>Exercise 3 — useDebounce (Composed with useFetch)</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Type in the search box. Requests fire only after 400ms of inactivity.
        Watch the Network tab — you should see far fewer requests than keystrokes.
      </p>

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search users… (type fast!)"
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', width: 280, fontSize: 14 }}
        />
        <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8' }}>
          Live: "{query}" | Debounced: "{debouncedQuery}"
        </span>
      </div>

      {loading && <p style={{ fontSize: 13, color: '#64748b' }}>⏳ Searching…</p>}
      {results && Array.isArray(results) && results.length === 0 && (
        <p style={{ fontSize: 13 }}>No results for "{debouncedQuery}"</p>
      )}
      {results && Array.isArray(results) && results.map(u => (
        <div key={u.id} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
          {u.name} — <span style={{ color: '#64748b' }}>{u.email}</span>
        </div>
      ))}

      <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
        <strong>Composition benefit:</strong> useDebounce + useFetch are two independent hooks
        called in sequence. Compare this to the Exercise 3 render-prop version of
        combining multiple providers — this is flat, readable, and type-safe.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 05 — Custom Hooks as the Modern Pattern</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
