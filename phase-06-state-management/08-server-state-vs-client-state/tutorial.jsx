// ============================================================
// Topic:   Server State vs Client State
// Phase:   6 — State Management
//
// HOW TO RUN: Pure React — no extra installs.
//   npm run tutorial server-state-vs-client-state
//
// APPROACH:
//   Exercise 1 — classify pieces of state into the right layer
//   Exercise 2 — refactor "Redux for everything" into proper layers
//   Exercise 3 — move filter state from React state → URL state
// ============================================================

import { useState, useEffect, useReducer, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Classification: where does this state belong?
//
// For each piece of state listed below, classify it as:
//   CLIENT  — owned by the app, synchronous, never stale
//   SERVER  — owned by the server, async, can become stale
//   URL     — should survive refresh, be shareable, be bookmarkable
//
// TODO:
//   Change each classification from '?' to the correct value.
//   Then read the explanation — click to reveal after your guess.
//
// After classifying, answer: what TOOL would you use for each?
//   Client: useState / useReducer / Zustand / Redux slice
//   Server: React Query / RTK Query / SWR
//   URL:    useSearchParams / URLSearchParams
// ─────────────────────────────────────────────────────────────

const stateItems = [
  {
    description: 'Whether a modal is currently open',
    hint: 'Only this session needs to know. Doesn\'t survive refresh.',
    correct: 'CLIENT',
  },
  {
    description: 'The list of products from /api/products',
    hint: 'Lives on the server. Other users can change it. Can go stale.',
    correct: 'SERVER',
  },
  {
    description: 'The current step in a multi-step checkout wizard',
    hint: 'You probably DON\'T want this in the URL (leaks order state). Session-only.',
    correct: 'CLIENT',
  },
  {
    description: 'The active filter on a data table (e.g. "status=active")',
    hint: 'User should be able to share this URL with a colleague and see the same filter.',
    correct: 'URL',
  },
  {
    description: 'The authenticated user\'s profile data from /api/me',
    hint: 'Comes from the server. Can be updated by a settings save.',
    correct: 'SERVER',
  },
  {
    description: 'The text typed in a search box before the user hits Enter',
    hint: 'Ephemeral, in-progress UI state. Not saved anywhere yet.',
    correct: 'CLIENT',
  },
  {
    description: 'The current sort order of a table (e.g. "sort=price&dir=asc")',
    hint: 'User wants to bookmark this view. Back button should restore it.',
    correct: 'URL',
  },
  {
    description: 'A list of notifications fetched every 30 seconds',
    hint: 'Server owns it. Becomes stale. Needs background refetch.',
    correct: 'SERVER',
  },
  {
    description: 'Which rows are selected in a bulk-action table',
    hint: 'Only matters in this session. Doesn\'t need to survive refresh.',
    correct: 'CLIENT',
  },
  {
    description: 'The search query in the URL bar (?q=react+hooks)',
    hint: 'Intentionally put in the URL — shareable, bookmarkable.',
    correct: 'URL',
  },
];

const COLORS = { CLIENT: '#3b82f6', SERVER: '#10b981', URL: '#f59e0b', '?': '#9ca3af' };

function Exercise1() {
  const [answers, setAnswers] = useState(() => stateItems.map(() => '?'));
  const [revealed, setRevealed] = useState(() => stateItems.map(() => false));

  const score = answers.filter((a, i) => a === stateItems[i].correct).length;

  return (
    <div>
      <p style={hint}>
        Classify each piece of state. Click "Reveal" after your guess
        to see the correct answer and why. Score: {score}/{stateItems.length}
      </p>
      {stateItems.map((item, i) => (
        <div key={i} style={{ ...card, borderColor: answers[i] === '?' ? '#d1d5db' : COLORS[answers[i]] }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>{i + 1}. {item.description}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {['CLIENT', 'SERVER', 'URL'].map(type => (
              <button
                key={type}
                onClick={() => setAnswers(prev => { const a = [...prev]; a[i] = type; return a; })}
                style={{
                  fontSize: 12, padding: '2px 8px',
                  background: answers[i] === type ? COLORS[type] : 'white',
                  color: answers[i] === type ? 'white' : '#374151',
                  border: `1px solid ${COLORS[type]}`, borderRadius: 4,
                  fontWeight: answers[i] === type ? 'bold' : 'normal',
                }}
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => setRevealed(prev => { const r = [...prev]; r[i] = true; return r; })}
              style={{ fontSize: 12, padding: '2px 8px', marginLeft: 8 }}
            >
              Reveal
            </button>
          </div>
          {revealed[i] && (
            <div style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4,
              background: answers[i] === stateItems[i].correct ? '#dcfce7' : '#fee2e2',
            }}>
              {answers[i] === stateItems[i].correct ? '✓ Correct! ' : `✗ Should be ${stateItems[i].correct}. `}
              {item.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Refactor "Redux for everything" into proper layers
//
// The component below stores API data in a useReducer manually.
// It has ~50 lines of boilerplate for a single fetch endpoint.
// It also doesn't handle: stale data, background refresh,
// deduplication, or cache invalidation.
//
// TODO:
//   Part A: Count the things this implementation DOESN'T do.
//     Open the checklist and check off each missing behavior.
//
//   Part B: Write ServerStateVersion below that does the same
//     thing but using the minimal hooks pattern — no library,
//     just useEffect + useState — but properly structured.
//     Notice how it's already better: it isolates loading/error/data.
//
//   Part C: Answer the question at the bottom:
//     What would React Query add on top of what you wrote?
// ─────────────────────────────────────────────────────────────

// ── The anti-pattern: Redux-style server data management ─────
const FETCH_REQUEST = 'FETCH_REQUEST';
const FETCH_SUCCESS = 'FETCH_SUCCESS';
const FETCH_FAILURE = 'FETCH_FAILURE';
const FETCH_RESET   = 'FETCH_RESET';

function usersReducer(state, action) {
  switch (action.type) {
    case FETCH_REQUEST: return { ...state, loading: true,  error: null };
    case FETCH_SUCCESS: return { loading: false, error: null, data: action.payload };
    case FETCH_FAILURE: return { loading: false, error: action.error, data: null };
    case FETCH_RESET:   return { loading: false, error: null, data: null };
    default: return state;
  }
}

const fetchUsers = () => async (dispatch) => {
  dispatch({ type: FETCH_REQUEST });
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/users?_limit=3');
    const data = await res.json();
    dispatch({ type: FETCH_SUCCESS, payload: data });
  } catch (err) {
    dispatch({ type: FETCH_FAILURE, error: err.message });
  }
};

function ReduxForEverythingVersion() {
  const [state, dispatch] = useReducer(usersReducer, { loading: false, error: null, data: null });

  return (
    <div style={{ ...card, borderColor: '#f97316' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>❌ Anti-pattern: manual fetch reducer</strong>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>(~25 lines above, zero cache management)</span>
      </div>
      <button onClick={() => fetchUsers()(dispatch)} style={{ marginBottom: 8 }}>
        Fetch Users
      </button>
      {state.loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>}
      {state.error   && <p style={{ color: '#dc2626', fontSize: 13 }}>Error: {state.error}</p>}
      {state.data && (
        <ul style={{ paddingLeft: 18, fontSize: 13 }}>
          {state.data.map(u => <li key={u.id}>{u.name}</li>)}
        </ul>
      )}
    </div>
  );
}

// What does the anti-pattern NOT do?
const missingBehaviors = [
  'Cache results — fetching again always hits the network',
  'Deduplicate concurrent requests — two callers fire two fetches',
  'Background refetch when data is stale',
  'Garbage-collect unused data from memory',
  'Stale-while-revalidate — show old data while fetching new',
  'Polling on an interval',
  'Retry on network failure',
  'Cancel stale requests on unmount (memory leak risk)',
];

// TODO: write the "proper" client state version
// Use useEffect + useState but structure it as a reusable hook.
// This won't solve caching — it just shows the right structure.
function useUsers() {
  // TODO: replace with useState for data/loading/error
  // useEffect to fetch on mount
  // return { data, loading, error, refetch }
  return { data: null, loading: false, error: null, refetch: () => {} };
}

function ProperStructureVersion() {
  const { data, loading, error, refetch } = useUsers();

  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>✓ Better structure: isolated fetch hook</strong>
      </div>
      <button onClick={refetch} disabled={loading}>
        {loading ? 'Fetching…' : 'Fetch Users'}
      </button>
      {error && <p style={{ color: '#dc2626', fontSize: 13 }}>Error: {error}</p>}
      {data && (
        <ul style={{ paddingLeft: 18, fontSize: 13 }}>
          {data.map(u => <li key={u.id}>{u.name}</li>)}
        </ul>
      )}
    </div>
  );
}

function Exercise2() {
  const [checked, setChecked] = useState(() => missingBehaviors.map(() => false));
  const toggle = (i) => setChecked(prev => { const c = [...prev]; c[i] = !c[i]; return c; });

  return (
    <div>
      <p style={hint}>
        Part A: Check off every behavior the anti-pattern is missing.
        Part B: Implement <code>useUsers()</code> with the right structure.
        Part C: Which of these checked items would React Query handle automatically?
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 13 }}>What the anti-pattern is missing:</strong>
          {missingBehaviors.map((b, i) => (
            <label key={b} style={{ display: 'block', fontSize: 12, marginTop: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} style={{ marginRight: 6 }} />
              {b}
            </label>
          ))}
          <div style={{ fontSize: 12, marginTop: 8, fontWeight: 'bold' }}>
            Checked: {checked.filter(Boolean).length}/{missingBehaviors.length}
            {checked.filter(Boolean).length === missingBehaviors.length && ' ✓ React Query handles ALL of these.'}
          </div>
        </div>
      </div>

      <ReduxForEverythingVersion />
      <ProperStructureVersion />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — URL state: shareable, survives refresh
//
// A filter stored in React state is lost on refresh and can't
// be shared with a link. The same filter in the URL is free:
//   - bookmarkable
//   - shareable
//   - survives page refresh
//   - works with browser back button
//
// TODO:
//   1. FilteredList below uses React state for the filter.
//      Its render correctly shows the filtered list.
//      Problem: refresh the page → filter resets to 'all'.
//
//   2. Implement URLFilteredList that stores the filter in
//      window.location.search (no router library needed):
//        - Read: new URLSearchParams(window.location.search).get('filter') ?? 'all'
//        - Write: use history.pushState + window.dispatchEvent
//      You'll need to listen to the 'popstate' event too.
//
//   3. Verify: Set a filter, refresh the page — it persists.
//      Copy the URL and open in a new tab — same filter appears.
//
// CHECK YOURSELF:
//   Name three pieces of state that SHOULD be in the URL.
//   Name three that should NOT be in the URL and why.
// ─────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 1, name: 'Laptop',  status: 'active',  price: 999 },
  { id: 2, name: 'Mouse',   status: 'active',  price: 29 },
  { id: 3, name: 'Monitor', status: 'inactive',price: 399 },
  { id: 4, name: 'Keyboard',status: 'active',  price: 79 },
  { id: 5, name: 'Webcam',  status: 'inactive',price: 59 },
];

// BROKEN: filter is in React state — resets on refresh
function FilteredList() {
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all'
    ? MOCK_PRODUCTS
    : MOCK_PRODUCTS.filter(p => p.status === filter);

  return (
    <div style={{ ...card, borderColor: '#f97316' }}>
      <strong style={{ fontSize: 13 }}>❌ React state filter (lost on refresh)</strong>
      <FilterButtons filter={filter} onChange={setFilter} />
      <ProductTable products={visible} />
    </div>
  );
}

// TODO: implement this with URL state
function URLFilteredList() {
  // TODO: read filter from URL params
  // const params = new URLSearchParams(window.location.search);
  // const [filter, setFilter] = useState(params.get('filter') ?? 'all');
  //
  // useEffect: listen to 'popstate' to sync filter when user clicks back/forward
  //
  // function setURLFilter(newFilter) {
  //   const params = new URLSearchParams(window.location.search);
  //   params.set('filter', newFilter);
  //   history.pushState(null, '', '?' + params.toString());
  //   setFilter(newFilter);
  // }
  const [filter, setFilter] = useState('all'); // ← replace with URL-backed state

  const visible = filter === 'all'
    ? MOCK_PRODUCTS
    : MOCK_PRODUCTS.filter(p => p.status === filter);

  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      <strong style={{ fontSize: 13 }}>✓ URL filter (survives refresh — implement above)</strong>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        Current URL: <code>{window.location.search || '(no params yet)'}</code>
      </div>
      <FilterButtons filter={filter} onChange={setFilter} />
      <ProductTable products={visible} />
    </div>
  );
}

function FilterButtons({ filter, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 8, marginTop: 6 }}>
      {['all', 'active', 'inactive'].map(f => (
        <button key={f} onClick={() => onChange(f)}
          style={{ fontWeight: filter === f ? 'bold' : 'normal', fontSize: 12, padding: '2px 10px' }}>
          {f}
        </button>
      ))}
    </div>
  );
}

function ProductTable({ products }) {
  return (
    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f9fafb' }}>
          <th style={th}>Name</th>
          <th style={th}>Status</th>
          <th style={th}>Price</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id}>
            <td style={td}>{p.name}</td>
            <td style={td}><span style={{ color: p.status === 'active' ? '#15803d' : '#9ca3af' }}>{p.status}</span></td>
            <td style={td}>${p.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Set a filter in the ❌ version and refresh — it resets.
        Implement the ✓ version with URL state — refresh should keep the filter.
        Copy the URL after filtering and open it in a new tab.
      </p>
      <FilteredList />
      <URLFilteredList />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a "three-layer architecture" app from scratch:
//   SERVER state:  useEffect + fetch for a list of posts from
//                  jsonplaceholder.typicode.com/posts?_limit=5
//   CLIENT state:  selected post ID (useState)
//   URL state:     search query (?q=) that filters posts by title
//
// The three layers should be completely independent — changing
// the URL search doesn't refetch, selecting a post doesn't reset
// the search, and the data fetch doesn't depend on client state.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
      Build a three-layer app: server state (fetch posts), client state
      (selected post), URL state (search query). Each layer should be
      independent. Demonstrate that all three survive a URL copy+paste.
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 10, fontSize: 14 };
const hint = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2   = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const th   = { padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' };
const td   = { padding: '4px 8px', borderBottom: '1px solid #f3f4f6' };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 620 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Server State vs Client State</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Pure React — no library needed. The insight here is architectural.
      </p>

      <h2 style={h2}>Exercise 1 — Classify each piece of state into the right layer</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Refactor "Redux for everything" into proper layers</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Move filter state from React state to URL state</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
