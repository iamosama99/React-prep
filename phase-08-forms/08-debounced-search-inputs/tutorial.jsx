// ============================================================
// Topic:   Debounced Search Inputs
// Phase:   8 — Forms
//
// APPROACH:
//   Exercise 1 — implement useDebounce from scratch, wire to local search
//   Exercise 2 — reproduce the race condition bug, then fix it
//   Exercise 3 — AbortController cancellation + aria-live accessibility
// ============================================================

import { useState, useEffect, useRef } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// BUILD useDebounce — implement the hook from scratch
//
// A debounce hook delays updating a value until N ms after the last change.
// Every new value resets the timer — only the final value after a pause fires.
//
// TODO — implement useDebounce(value, delay):
//   □ useState(value) as the initial debounced value
//   □ useEffect that sets a timeout: after `delay` ms, setDebounced(value)
//   □ Cleanup function: clearTimeout(id)  ← this is what collapses rapid changes
//   □ Dependency array: [value, delay]
//   □ Return the debounced value
//
// Then wire it to LocalSearch below:
//   □ Call useDebounce(query, 400) to get debouncedQuery
//   □ Filter FRUITS only when debouncedQuery changes (useEffect with [debouncedQuery])
//
// WHAT TO NOTICE:
//   - Type quickly: the list doesn't update until you PAUSE for 400ms
//   - The input itself stays responsive on every keystroke (query state updates immediately)
//   - Add console.log('filtering...') inside the effect — it fires much less than the input changes

const FRUITS = [
  'Apple', 'Apricot', 'Avocado', 'Banana', 'Blueberry', 'Cherry',
  'Coconut', 'Date', 'Fig', 'Grape', 'Guava', 'Kiwi', 'Lemon',
  'Lime', 'Lychee', 'Mango', 'Melon', 'Orange', 'Papaya', 'Peach',
  'Pear', 'Pineapple', 'Plum', 'Pomegranate', 'Raspberry', 'Strawberry',
];

// TODO: implement this hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // TODO: set a timeout that sets debounced to value after delay ms
    // TODO: return a cleanup that clears the timeout
  }, [value, delay]);

  return debounced;
}

function Exercise1() {
  const [query, setQuery] = useState('');

  // TODO: const debouncedQuery = useDebounce(query, 400);
  const debouncedQuery = query; // remove this line after implementing the hook

  const [results, setResults] = useState(FRUITS);

  useEffect(() => {
    // TODO: replace `query` with `debouncedQuery` below
    const q = query.toLowerCase().trim();
    setResults(q ? FRUITS.filter(f => f.toLowerCase().includes(q)) : FRUITS);
  }, [query]); // TODO: change dependency to debouncedQuery

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="ex1-search">Search fruits (debounced 400ms)</label>
        <input
          id="ex1-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type to filter…"
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4 }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
        {results.length} result{results.length !== 1 ? 's' : ''}
        {debouncedQuery !== query && (
          <span style={{ marginLeft: 8, color: '#9ca3af', fontSize: 12 }}>
            (debouncing…)
          </span>
        )}
      </p>

      <ul style={{ margin: 0, paddingLeft: 20, columns: 2 }}>
        {results.map(f => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// RACE CONDITION — see the bug, then fix it with the cancelled flag
//
// This exercise uses a fake async search that introduces artificial delays
// to simulate slow network responses. Different queries have different delays,
// which causes older requests to arrive AFTER newer ones.
//
// PART A — observe the bug:
//   The component below is already wired with useDebounce + useEffect,
//   but it's MISSING the race condition guard.
//   Type "ap" (300ms delay) → quickly type "apple" (800ms delay).
//   Watch the results area — "apple" results may flash, then get overwritten
//   by the "ap" results (which arrived late).
//
// PART B — add the fix:
//   TODO: inside the useEffect:
//     let cancelled = false;
//     // ...after fetch resolves:
//     if (!cancelled) setResults(data);
//     if (!cancelled) setLoading(false);
//     return () => { cancelled = true; };
//
// WHAT TO NOTICE before fixing:
//   - Open the console — log the query when each response arrives
//   - The results area shows stale data when a slow request overtakes a fast one
// WHAT TO NOTICE after fixing:
//   - The cancelled flag silences stale responses — they resolve but do nothing
//   - The cleanup runs when the effect re-fires (query changed), marking old fetches stale

const FAKE_DB = {
  '':         FRUITS,
  'ap':       ['Apple', 'Apricot'],
  'apple':    ['Apple'],
  'b':        ['Banana', 'Blueberry'],
  'banana':   ['Banana'],
  'mango':    ['Mango'],
  'c':        ['Cherry', 'Coconut'],
};

// Fake async fetch with per-query delays to force race conditions
function fakeFetch(query) {
  const delays = { 'ap': 300, 'apple': 800, 'b': 500, 'banana': 100, 'c': 200 };
  const delay = delays[query] ?? 400;
  const results = FAKE_DB[query] ?? FRUITS.filter(f => f.toLowerCase().includes(query));
  console.log(`[fetch] "${query}" will resolve in ${delay}ms`);
  return new Promise(resolve => setTimeout(() => {
    console.log(`[resolve] "${query}" → ${results.length} results`);
    resolve(results);
  }, delay));
}

function Exercise2() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState(FRUITS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // MISSING: let cancelled = false;

    setLoading(true);
    fakeFetch(debouncedQuery.toLowerCase().trim()).then(data => {
      // BUG: no guard — stale responses overwrite fresh results
      setResults(data);
      setLoading(false);
    });

    // MISSING: return () => { cancelled = true; };
  }, [debouncedQuery]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, color: '#b45309', fontWeight: 600, fontSize: 13 }}>
        ⚠ Open the console. Type "ap" then quickly type "apple" — observe race condition.
        Then add the cancelled flag to fix it.
      </p>

      <div>
        <label htmlFor="ex2-search">Search (async, artificial delays)</label>
        <input
          id="ex2-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Try: ap, apple, b, banana…"
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4 }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: loading ? '#9ca3af' : '#6b7280' }}>
        {loading ? 'Loading…' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
      </p>

      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {results.map(f => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// AbortController + ARIA — proper cancellation + accessibility
//
// The cancelled flag ignores stale responses but doesn't cancel the network request.
// AbortController actually terminates the in-flight request.
//
// TODO — replace the cancelled flag with AbortController:
//   const controller = new AbortController();
//   fetch(url, { signal: controller.signal })
//     .then(r => r.json())
//     .then(data => { setResults(data); setLoading(false); })
//     .catch(err => {
//       if (err.name !== 'AbortError') {
//         setLoading(false);
//         // handle real errors
//       }
//       // AbortError is expected — ignore it
//     });
//   return () => controller.abort();
//
// The exercise uses a real public API: https://www.fruityvice.com/api/fruit/all
// (falls back to FRUITS list if the API is down)
//
// TODO — add ARIA accessibility:
//   □ aria-live="polite" on the results count paragraph
//     (screen reader announces result count changes)
//   □ aria-busy={loading} on the results container
//   □ type="search" on the input (announces as search field to screen readers)
//
// WHAT TO NOTICE:
//   - Check the Network tab: old requests show as "cancelled" when you type fast
//   - AbortError is filtered in the catch — it's not a real error
//   - aria-live means screen reader users hear "5 results" without navigating to it

function Exercise3() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    // TODO: replace this with AbortController pattern
    let cancelled = false;
    setLoading(true);

    // Using the local FRUITS list as a stand-in for a real API response
    const filtered = FRUITS.filter(f =>
      f.toLowerCase().includes(debouncedQuery.toLowerCase().trim())
    );

    // Simulate async network delay
    const id = setTimeout(() => {
      if (!cancelled) {
        setResults(filtered);
        setLoading(false);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(id);
      // TODO: controller.abort() goes here
    };
  }, [debouncedQuery]);

  const resultCount = results.length;
  const statusText = loading
    ? 'Searching…'
    : debouncedQuery.trim()
      ? `${resultCount} result${resultCount !== 1 ? 's' : ''}`
      : 'Start typing to search';

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="ex3-search">Search fruits</label>
        <input
          id="ex3-search"
          type="search"   // screen readers announce this as a search field
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search…"
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 4 }}
        />
      </div>

      {/* TODO: add aria-live="polite" here — screen readers will announce changes */}
      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
        {statusText}
      </p>

      {/* TODO: add aria-busy={loading} here */}
      <ul style={{ margin: 0, paddingLeft: 20, minHeight: 24 }}>
        {results.map(f => <li key={f}>{f}</li>)}
      </ul>

      {!loading && debouncedQuery.trim() && resultCount === 0 && (
        <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>
          No results for "{debouncedQuery}"
        </p>
      )}
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas:
//   - Implement useThrottle (fires at most once per N ms) and compare it
//     with useDebounce — which is better for a scroll position tracker?
//   - Use useDeferredValue instead of useDebounce for the local fruit filter
//     and observe: the input stays responsive even during slow renders
//   - Combine debounce + AbortController + a real API like:
//     fetch(`https://www.fruityvice.com/api/fruit/${name}`, { signal })
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 480 }}>
      <h1>Debounced Search Inputs</h1>

      <h2>Exercise 1 — Build useDebounce from Scratch</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Race Condition Bug & Fix</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — AbortController + ARIA</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
