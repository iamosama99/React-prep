// ============================================================
// Topic:   useFetch
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement basic useFetch (no abort) — fill in TODOs.
//   3. Exercise 2: Add AbortController to fix the race condition.
//   4. Compare your solution against the Reference Implementation below.
//
// Run: npm run tutorial 02-use-fetch
// ============================================================

import { useState, useEffect, useCallback, FC } from 'react';

// ── Types ────────────────────────────────────────────────────
interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Implement basic useFetch<T>(url: string).
//
// State machine: idle → loading → success | error
//
// Requirements:
//   - loading starts as false, goes true when fetch begins, false when done
//   - data starts null, gets set on success
//   - error starts null, gets set on failure (as a string message)
//   - Re-fetch when url changes
//   - Check res.ok — a 404 still resolves the promise, so you must throw manually
//
// IMPORTANT: This version has a race condition. Exercise 2 fixes it.

function useFetch_Exercise1<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO 1: setLoading(true) and reset error to null

    // TODO 2: fetch(url), check res.ok, parse JSON as T, call setData
    //   Hint: fetch(url).then(res => { if (!res.ok) throw ...; return res.json(); })

    // TODO 3: catch errors, call setError(err.message)

    // TODO 4: finally, setLoading(false)

    void url; // remove this when you implement
  }, [url]);

  return { data, loading, error };
}

const TODO_URLS = [
  'https://jsonplaceholder.typicode.com/todos/1',
  'https://jsonplaceholder.typicode.com/todos/2',
  'https://jsonplaceholder.typicode.com/todos/3',
];

const ERROR_URL = 'https://jsonplaceholder.typicode.com/todos/99999'; // 404

function Exercise1_BasicFetch() {
  const [urlIndex, setUrlIndex] = useState(0);
  const { data, loading, error } = useFetch_Exercise1<Todo>(TODO_URLS[urlIndex]);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: Basic useFetch (no abort)</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Fetch a todo from jsonplaceholder. Switch URLs to see re-fetching in action.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement useFetch_Exercise1 above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>Why doesn't fetch() reject on a 404? How do you handle it?</li>
          <li>What should error state look like when loading succeeds?</li>
          <li>Try the "Error URL" — does your error state update correctly?</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {TODO_URLS.map((url, i) => (
          <button
            key={i}
            onClick={() => setUrlIndex(i)}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: urlIndex === i ? '#1a73e8' : '#ddd',
              background: urlIndex === i ? '#1a73e8' : '#fff',
              color: urlIndex === i ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Todo #{i + 1}
          </button>
        ))}
        <button
          onClick={() => setUrlIndex(TODO_URLS.length)}
          style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: urlIndex === TODO_URLS.length ? '#e53935' : '#ddd',
            background: urlIndex === TODO_URLS.length ? '#e53935' : '#fff',
            color: urlIndex === TODO_URLS.length ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Error URL (404)
        </button>
      </div>

      <StateDisplay
        url={urlIndex < TODO_URLS.length ? TODO_URLS[urlIndex] : ERROR_URL}
        loading={loading}
        error={error}
        data={data}
      />
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Add AbortController to prevent the race condition.
//
// The race condition: if the user switches URLs quickly, 3 fetches fire.
// If response 2 arrives after response 3, stale data overwrites fresh data.
//
// Fix:
//   - Create a new AbortController at the start of each effect
//   - Pass { signal: controller.signal } to fetch()
//   - In the catch block: if error.name === 'AbortError', return early (don't setError)
//   - Return () => controller.abort() from the effect
//
// Simulate the race condition: use the "Fast Switch" button to switch
// URLs rapidly and compare the behavior with/without abort.

function useFetch_Exercise2<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO 5: Create a new AbortController here

    setLoading(true);
    setError(null);

    // TODO 6: Pass { signal: controller.signal } to fetch()
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json() as Promise<T>;
      })
      .then(json => setData(json))
      .catch(err => {
        // TODO 7: Check if error.name === 'AbortError' — if so, return early
        setError((err as Error).message);
      })
      .finally(() => setLoading(false));

    // TODO 8: Return a cleanup function that calls controller.abort()
  }, [url]);

  return { data, loading, error };
}

const POST_URLS = Array.from({ length: 5 }, (_, i) =>
  `https://jsonplaceholder.typicode.com/posts/${i + 1}`
);

function Exercise2_WithAbort() {
  const [urlIndex, setUrlIndex] = useState(0);
  const { data, loading, error } = useFetch_Exercise2<Post>(POST_URLS[urlIndex]);
  const [abortEvents, setAbortEvents] = useState<string[]>([]);

  function fastSwitch() {
    // Rapidly switch through all URLs — triggers the race condition without abort,
    // or demonstrates correct behavior with abort
    setAbortEvents([]);
    let i = 0;
    const interval = setInterval(() => {
      setUrlIndex(i % POST_URLS.length);
      i++;
      if (i >= POST_URLS.length) {
        clearInterval(interval);
        setAbortEvents(prev => [...prev, `Switched through ${POST_URLS.length} URLs rapidly`]);
      }
    }, 80);
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: Add AbortController</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Click "Fast Switch" to rapidly cycle through URLs. With abort, only the last result shows.
        Without abort, you may see stale data flash.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — add AbortController to useFetch_Exercise2 above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>When the effect cleanup runs, what does controller.abort() do to the pending fetch?</li>
          <li>Why should AbortError NOT be shown to the user as an error message?</li>
          <li>Is it safe to call setLoading(false) in finally after an abort?</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {POST_URLS.map((_, i) => (
          <button
            key={i}
            onClick={() => setUrlIndex(i)}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: urlIndex === i ? '#8e44ad' : '#ddd',
              background: urlIndex === i ? '#8e44ad' : '#fff',
              color: urlIndex === i ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Post #{i + 1}
          </button>
        ))}
        <button
          onClick={fastSwitch}
          style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '6px',
            border: '2px solid #e67e22',
            background: '#e67e22',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          Fast Switch (race condition test)
        </button>
      </div>

      {abortEvents.length > 0 && (
        <div style={{ background: '#fff3e0', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', color: '#e65100' }}>
          {abortEvents.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      <StateDisplay
        url={POST_URLS[urlIndex]}
        loading={loading}
        error={error}
        data={data}
      />
    </div>
  );
}

// ── Shared Display Component ──────────────────────────────────
function StateDisplay({ url, loading, error, data }: { url: string; loading: boolean; error: string | null; data: unknown }) {
  return (
    <div>
      <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#888', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
        {url}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ padding: '0.6rem', borderRadius: '6px', background: loading ? '#fff3e0' : '#f5f5f5', border: '1px solid #eee', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>loading</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: loading ? '#e65100' : '#999' }}>{String(loading)}</div>
        </div>
        <div style={{ padding: '0.6rem', borderRadius: '6px', background: error ? '#ffebee' : '#f5f5f5', border: '1px solid #eee', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>error</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: error ? '#c62828' : '#999', fontSize: '0.8rem' }}>{error ?? 'null'}</div>
        </div>
        <div style={{ padding: '0.6rem', borderRadius: '6px', background: data ? '#e8f5e9' : '#f5f5f5', border: '1px solid #eee', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>data</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: data ? '#2e7d32' : '#999' }}>{data ? 'loaded' : 'null'}</div>
        </div>
      </div>
      {data && (
        <pre style={{ margin: 0, padding: '0.75rem', background: '#f9f9f9', borderRadius: '6px', fontSize: '0.8rem', overflow: 'auto', maxHeight: '160px', border: '1px solid #eee' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────
// Full useFetch with abort, generics, loading/error/data, and refetch.

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json() as Promise<T>;
      })
      .then(json => setData(json))
      .catch(err => {
        // AbortError is expected behavior when URL changes — don't surface it
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
        }
      })
      .finally(() => {
        // finally still runs after abort — safe because setLoading(false) is idempotent
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [url, fetchKey]);

  const refetch = useCallback(() => setFetchKey(k => k + 1), []);

  return { data, loading, error, refetch };
}

function ReferenceDemo() {
  const [urlIndex, setUrlIndex] = useState(0);
  const { data, loading, error, refetch } = useFetch<Todo>(TODO_URLS[urlIndex]);

  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>Full useFetch with Abort + Refetch</h3>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
        Includes: AbortController, res.ok check, AbortError handling, refetch function.
        Inspect the implementation above to compare with your exercise solutions.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {TODO_URLS.map((_, i) => (
          <button
            key={i}
            onClick={() => setUrlIndex(i)}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: urlIndex === i ? '#27ae60' : '#ddd',
              background: urlIndex === i ? '#27ae60' : '#fff',
              color: urlIndex === i ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Todo #{i + 1}
          </button>
        ))}
        <button
          onClick={refetch}
          disabled={loading}
          style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '6px',
            border: '2px solid #555',
            background: loading ? '#ccc' : '#555',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Refetch
        </button>
      </div>

      <StateDisplay url={TODO_URLS[urlIndex]} loading={loading} error={error} data={data} />
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Did you check res.ok and throw an error for 4xx/5xx responses?',
    'Did you create a new AbortController inside the useEffect (not outside)?',
    'Did you handle AbortError separately — not showing it to the user?',
    'Did you return () => controller.abort() as the useEffect cleanup?',
    'Did you reset error to null at the start of each new fetch?',
    'Can you explain what the race condition is and demonstrate it occurring?',
    'Can you add a refetch function using a fetchKey counter?',
  ];

  return (
    <div style={{ background: '#fffde7', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f9a825' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Interview Checklist</h3>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '0.9rem' }}>
            <span style={{ fontFamily: 'monospace', color: '#f57f17', marginRight: '0.5rem' }}>□</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>useFetch</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Build the canonical data-fetching hook from scratch.
      Start with the basic version, then add the race condition fix.
      Complete both exercises before reading the reference implementation.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Exercise1_BasicFetch />
      <Exercise2_WithAbort />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
