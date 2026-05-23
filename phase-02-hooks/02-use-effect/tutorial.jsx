// ============================================================
// Topic:   useEffect
// Phase:   2 — Hooks
// ============================================================
//
// How to run:
//   Paste into https://stackblitz.com/new/react
//   or: npm create vite@latest my-app -- --template react
// ============================================================

import { useState, useEffect } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Cleanup functions — preventing listener pile-up.
//
// The component below adds a resize listener every render but
// NEVER removes it.  After a few re-renders you have many
// duplicate listeners firing for one event.
//
// Steps:
//   1. Click "Force re-render" three times, then resize the window.
//      Open the console — you'll see the log fire multiple times.
//   2. Return a cleanup function from the effect to remove the
//      listener before the next effect run and on unmount.
//   3. Verify: after clicking "Force re-render" ten times, the
//      log fires only ONCE per resize.
//
// Bonus: also display the current window width in the UI
//        (store it in state — update it inside the handler).

function Exercise1() {
  const [, forceRender] = useState(0);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => {
      // TODO: update `width` state here
      console.log('window resized — width:', window.innerWidth);
    };

    window.addEventListener('resize', handler);

    // BUG: no cleanup — handler accumulates with every re-render.
    // TODO: return () => window.removeEventListener('resize', handler);
  });   // ← intentionally no dep array for this exercise

  return (
    <div style={styles.box}>
      <p>Window width: <strong>{width}px</strong></p>
      <button onClick={() => forceRender(n => n + 1)}>
        Force re-render (then resize window &amp; watch console)
      </button>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Race condition — async fetch can arrive out of order.
//
// This UserCard fetches a user by ID.  Switch users fast and
// the older response can overwrite the newer one, showing the
// wrong user.
//
// Steps:
//   1. Run the app.  Click user buttons slowly — looks fine.
//   2. Rapidly click different users — sometimes the wrong name
//      appears briefly (harder to see locally; trust the pattern).
//   3. Fix the race condition using ONE of these approaches:
//      Option A — cancelled flag:
//        let cancelled = false;
//        fetch(...).then(data => { if (!cancelled) setUser(data); });
//        return () => { cancelled = true; };
//      Option B — AbortController:
//        const controller = new AbortController();
//        fetch(..., { signal: controller.signal })
//        return () => controller.abort();
//   4. Confirm: switching users rapidly always shows the correct one.
//
// Note: the fake API below simulates variable network delay.

const FAKE_USERS = {
  1: { name: 'Alice', role: 'Engineer' },
  2: { name: 'Bob',   role: 'Designer' },
  3: { name: 'Carol', role: 'Manager' },
};

function fakeApi(id) {
  // Random delay 100–800 ms to simulate out-of-order responses
  const delay = 100 + Math.random() * 700;
  return new Promise(resolve =>
    setTimeout(() => resolve(FAKE_USERS[id]), delay)
  );
}

function Exercise2() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // BUG: no cancellation — stale response can win the race.
    fakeApi(userId).then(data => {
      setUser(data);
      setLoading(false);
    });
    // TODO: add cancellation and return cleanup
  }, [userId]);

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3].map(id => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            style={{ fontWeight: userId === id ? 'bold' : 'normal' }}
          >
            User {id}
          </button>
        ))}
      </div>
      {loading
        ? <p>Loading…</p>
        : <p><strong>{user?.name}</strong> — {user?.role}</p>
      }
      <p style={{ fontSize: 12, color: '#888' }}>
        Switch users rapidly to trigger the race condition.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Async effects — why the effect function itself cannot be async.
//
// The component below tries to use async/await directly on the
// effect function.  This is wrong: an async function returns a
// Promise, not a cleanup function.
//
// Steps:
//   1. Observe the current broken pattern.
//   2. Fix it by defining an async function INSIDE the effect
//      and calling it immediately (the "IIFE" or named-function pattern).
//   3. Add an AbortController so navigating away (unmounting)
//      doesn't try to setState on an unmounted component.
//   4. Add a loading state and error state so the UI reflects all
//      three possible statuses: loading / success / error.
//
// Success: the component shows "Loading…", then the fetched data,
//          and shows an error message if the fetch fails.
//
// Tip: to test error handling, temporarily change the URL to
//      something invalid.

function Exercise3() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // BUG: cannot make the effect function itself async.
  // An async function returns a Promise; React expects undefined or
  // a cleanup function.
  useEffect(async () => {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);
  // TODO: rewrite using an inner async function or IIFE pattern.
  // TODO: add error handling (try/catch).
  // TODO: add AbortController for cleanup.

  if (loading) return <div style={styles.box}>Loading…</div>;
  if (error)   return <div style={styles.box}>Error: {error}</div>;

  return (
    <div style={styles.box}>
      <p>Title: <strong>{data?.title}</strong></p>
      <p>Done: {data?.completed ? '✅' : '❌'}</p>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Use this to observe StrictMode double-invocation.
//
// In development with <StrictMode> React runs:
//   effect → cleanup → effect
//
// Steps:
//   1. Add a console.log inside the effect and inside the cleanup.
//   2. Run the app — see the effect fire TWICE in dev (once in prod).
//   3. This is intentional — it surfaces bugs where cleanup is incomplete.

function Playground() {
  const [show, setShow] = useState(true);

  return (
    <div style={styles.box}>
      <button onClick={() => setShow(s => !s)}>
        {show ? 'Unmount' : 'Mount'} the effect demo
      </button>
      {show && <StrictModeDemo />}
    </div>
  );
}

function StrictModeDemo() {
  useEffect(() => {
    console.log('⬆️  effect ran');
    return () => console.log('⬇️  cleanup ran');
  }, []);

  return <p style={{ fontSize: 13, color: '#555' }}>
    Watch the console — you should see the effect run twice in dev
    (⬆️ ⬇️ ⬆️) thanks to StrictMode.
  </p>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>useEffect</h1>

      <h2>Exercise 1 — Cleanup (listener pile-up)</h2>
      <p style={styles.goal}>
        Add a cleanup function so the resize handler doesn't accumulate.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Race Condition</h2>
      <p style={styles.goal}>
        Fix the fetch so fast user-switching always shows the correct user.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Async Effect Pattern</h2>
      <p style={styles.goal}>
        Rewrite the async effect correctly: inner async fn + error handling + cleanup.
      </p>
      <Exercise3 />

      <h2>Playground — StrictMode Double-Invoke</h2>
      <Playground />
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ddd',
    borderRadius: 6,
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
