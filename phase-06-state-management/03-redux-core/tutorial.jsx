// ============================================================
// Topic:   Redux Core
// Phase:   6 — State Management
//
// HOW TO RUN: Pure React — NO external libraries needed.
//   npm run tutorial redux-core
//
// APPROACH: You will build Redux from scratch using the exact
// same patterns Redux uses internally. This makes the architecture
// concrete — you'll understand *why* Redux is designed the way it
// is, not just *how* to use it.
//
// Exercise 1: Write a pure reducer and test it.
// Exercise 2: Build a minimal createStore (getState/dispatch/subscribe).
// Exercise 3: Add thunk middleware support and write an async thunk.
// ============================================================

import { useState, useEffect, useRef, useReducer } from 'react';

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Write a pure reducer
//
// A reducer is just: (state, action) => newState
// No side effects. No mutation. Deterministic output.
//
// Build a counter reducer that handles these action types:
//   'counter/increment'         — adds 1 (or action.payload if provided)
//   'counter/decrement'         — subtracts 1 (or action.payload)
//   'counter/incrementByAmount' — adds action.payload
//   'counter/reset'             — returns initialState
//
// Then use useReducer to drive the UI below.
//
// TODO: implement counterReducer.
// ─────────────────────────────────────────────────────────────

const counterInitialState = { count: 0 };

// TODO: replace this stub with a real reducer
function counterReducer(state = counterInitialState, action) {
  switch (action.type) {
    // case 'counter/increment':
    // case 'counter/decrement':
    // case 'counter/incrementByAmount':
    // case 'counter/reset':
    default:
      return state;
  }
}

// Action creators — mirrors what Redux action creators look like
const counterActions = {
  increment:         ()       => ({ type: 'counter/increment' }),
  decrement:         ()       => ({ type: 'counter/decrement' }),
  incrementByAmount: (amount) => ({ type: 'counter/incrementByAmount', payload: amount }),
  reset:             ()       => ({ type: 'counter/reset' }),
};

function Exercise1() {
  const [state, dispatch] = useReducer(counterReducer, counterInitialState);

  return (
    <div>
      <p style={hint}>
        Implement <code>counterReducer</code> above. The reducer tests below
        call it directly — no React involved — to verify it's a pure function.
      </p>

      <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 12 }}>
        {state.count}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => dispatch(counterActions.decrement())}>− 1</button>
        <button onClick={() => dispatch(counterActions.increment())}>+ 1</button>
        <button onClick={() => dispatch(counterActions.incrementByAmount(5))}>+ 5</button>
        <button onClick={() => dispatch(counterActions.incrementByAmount(10))}>+ 10</button>
        <button onClick={() => dispatch(counterActions.reset())}>Reset</button>
      </div>

      <ReducerTests />
    </div>
  );
}

// Calls the reducer directly — verifies it works as a pure function.
// All rows should be green when your reducer is correct.
function ReducerTests() {
  const tests = [
    {
      label: 'increment from 0 → 1',
      result:   counterReducer({ count: 0 }, counterActions.increment()).count,
      expected: 1,
    },
    {
      label: 'decrement from 5 → 4',
      result:   counterReducer({ count: 5 }, counterActions.decrement()).count,
      expected: 4,
    },
    {
      label: 'incrementByAmount(7) from 0 → 7',
      result:   counterReducer({ count: 0 }, counterActions.incrementByAmount(7)).count,
      expected: 7,
    },
    {
      label: 'reset from 99 → 0',
      result:   counterReducer({ count: 99 }, counterActions.reset()).count,
      expected: 0,
    },
    {
      label: 'unknown action returns state unchanged',
      result:   counterReducer({ count: 42 }, { type: 'UNKNOWN' }).count,
      expected: 42,
    },
    {
      label: 'original state is NOT mutated by increment',
      result: (() => {
        const s = { count: 3 };
        counterReducer(s, counterActions.increment());
        return s.count; // must still be 3
      })(),
      expected: 3,
    },
  ];

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 8 }}>
      <strong style={{ fontSize: 13 }}>Pure function tests (no React):</strong>
      {tests.map(({ label, result, expected }) => (
        <div key={label} style={{ fontSize: 12, marginTop: 3, color: result === expected ? '#15803d' : '#dc2626' }}>
          {result === expected ? '✓' : '✗'} {label}
          {result !== expected && <> (got <code>{JSON.stringify(result)}</code>, expected <code>{expected}</code>)</>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Build a minimal Redux store from scratch
//
// Redux's createStore is ~50 lines. Build the essential parts:
//
//   createStore(reducer)
//     → { getState(), dispatch(action), subscribe(listener) }
//
// Rules:
//   - getState() returns current state
//   - dispatch(action) → runs reducer, updates state, notifies listeners
//   - subscribe(listener) → registers a callback; returns an unsubscribe fn
//   - On creation, dispatch a dummy init action so the reducer sets
//     its default initialState
//
// Then implement useStore(store) hook — subscribes to the store
// and forces a re-render when state changes.
//
// TODO: implement createStore and useStore below.
// ─────────────────────────────────────────────────────────────

// TODO: implement this
function createStore(reducer) {
  let state;
  const listeners = [];

  function getState() {
    // TODO: return current state
    throw new Error('TODO: implement getState');
  }

  function dispatch(action) {
    // TODO: run reducer, update state, call all listeners
    throw new Error('TODO: implement dispatch');
  }

  function subscribe(listener) {
    // TODO: add listener, return unsubscribe function
    throw new Error('TODO: implement subscribe');
  }

  // Initialize state by dispatching a dummy action
  // dispatch({ type: '@@INIT' });

  return { getState, dispatch, subscribe };
}

// TODO: implement this hook
// Connects a component to the store — re-renders when state changes.
function useStore(store) {
  const [state, setState] = useState(() => {
    try { return store.getState(); } catch { return null; }
  });

  useEffect(() => {
    // TODO: subscribe to store; return unsubscribe as cleanup
  }, [store]);

  return state;
}

// Module-level store — like Redux's singleton store
const counterStore = createStore(counterReducer);

function Exercise2() {
  const state = useStore(counterStore);

  return (
    <div>
      <p style={hint}>
        Implement <code>createStore</code> and <code>useStore</code>.
        The counter below should work exactly like Exercise 1 but using
        your hand-built store instead of React's <code>useReducer</code>.
      </p>

      <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 12 }}>
        {state?.count ?? '—'}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => counterStore.dispatch(counterActions.decrement())}>− 1</button>
        <button onClick={() => counterStore.dispatch(counterActions.increment())}>+ 1</button>
        <button onClick={() => counterStore.dispatch(counterActions.incrementByAmount(5))}>+ 5</button>
        <button onClick={() => counterStore.dispatch(counterActions.reset())}>Reset</button>
      </div>

      <StoreTests />
    </div>
  );
}

function StoreTests() {
  const [results, setResults] = useState([]);

  function runTests() {
    const store = createStore(counterReducer);
    const tests = [];

    try {
      const s0 = store.getState();
      tests.push({ label: 'getState() returns initial state', pass: s0 !== undefined && s0 !== null });

      store.dispatch(counterActions.increment());
      store.dispatch(counterActions.increment());
      tests.push({ label: 'dispatch(increment) × 2 → count is 2', pass: store.getState().count === 2 });

      let fired = 0;
      const unsub = store.subscribe(() => { fired++; });
      store.dispatch(counterActions.increment());
      tests.push({ label: 'subscribe listener fires on dispatch', pass: fired === 1 });

      unsub();
      store.dispatch(counterActions.increment());
      tests.push({ label: 'unsubscribe() stops listener', pass: fired === 1 });

      store.dispatch(counterActions.reset());
      tests.push({ label: 'reset returns count to 0', pass: store.getState().count === 0 });

    } catch (err) {
      tests.push({ label: `Error: ${err.message}`, pass: false });
    }

    setResults(tests);
  }

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
      <button onClick={runTests} style={{ marginBottom: 8 }}>Run store tests</button>
      {results.map(({ label, pass }) => (
        <div key={label} style={{ fontSize: 12, marginTop: 3, color: pass ? '#15803d' : '#dc2626' }}>
          {pass ? '✓' : '✗'} {label}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Thunk middleware
//
// Plain dispatch only accepts objects: dispatch({ type: '...' })
// Thunk middleware intercepts the call and handles functions:
//   - typeof action === 'function' → call it with (dispatch, getState)
//   - otherwise → pass through to the real dispatch
//
// TODO:
//   1. Implement applyThunkMiddleware(store).
//      It replaces store.dispatch with an enhanced version.
//
//   2. Implement fetchInitialCount — an async thunk that:
//        a. dispatches { type: 'counter/setLoading', payload: true }
//           (add this case to counterReducer2 below)
//        b. awaits mockApi.getInitialCount()
//        c. dispatches incrementByAmount with the result
//        d. dispatches { type: 'counter/setLoading', payload: false }
//
//   3. Implement incrementAfterDelay(ms) — dispatches increment
//      after a given delay.
//
// CHECK YOURSELF:
//   Why can a thunk dispatch another thunk? Trace the call chain.
// ─────────────────────────────────────────────────────────────

// Mock API — 1 second delay, returns count: 42
const mockApi = {
  getInitialCount: () =>
    new Promise(resolve => setTimeout(() => resolve({ count: 42 }), 1000)),
};

// Extended reducer that also handles a loading flag
function counterReducer2(state = { count: 0, loading: false }, action) {
  switch (action.type) {
    case 'counter/increment':         return { ...state, count: state.count + 1 };
    case 'counter/decrement':         return { ...state, count: state.count - 1 };
    case 'counter/incrementByAmount': return { ...state, count: state.count + action.payload };
    case 'counter/reset':             return { count: 0, loading: false };
    // TODO: add 'counter/setLoading' case
    default: return state;
  }
}

// TODO: implement this
function applyThunkMiddleware(store) {
  const originalDispatch = store.dispatch;

  store.dispatch = (action) => {
    if (typeof action === 'function') {
      // TODO: call the thunk with (dispatch, getState)
      throw new Error('TODO: call thunk with (store.dispatch, store.getState)');
    }
    return originalDispatch(action);
  };

  return store;
}

// Create a thunk-enabled store
const thunkedStore = applyThunkMiddleware(createStore(counterReducer2));

// TODO: implement this async thunk
const fetchInitialCount = () => async (dispatch, _getState) => {
  // TODO: set loading, fetch, dispatch incrementByAmount, clear loading
  console.log('TODO: implement fetchInitialCount');
};

// TODO: implement this thunk factory
const incrementAfterDelay = (ms) => (dispatch) =>
  new Promise(resolve =>
    setTimeout(() => {
      // TODO: dispatch increment, then resolve
      resolve();
    }, ms)
  );

function Exercise3() {
  const state = useStore(thunkedStore);
  const [busy, setBusy] = useState(false);

  async function handleFetch() {
    setBusy(true);
    await thunkedStore.dispatch(fetchInitialCount());
    setBusy(false);
  }

  async function handleDelayed() {
    setBusy(true);
    await thunkedStore.dispatch(incrementAfterDelay(800));
    setBusy(false);
  }

  return (
    <div>
      <p style={hint}>
        Implement <code>applyThunkMiddleware</code> and the two thunks.
        Watch the "Loading…" state appear and disappear for the fetch.
      </p>

      <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 4 }}>
        {state?.loading ? '⏳ Loading…' : (state?.count ?? '—')}
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        loading: {String(state?.loading ?? '—')}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={handleFetch} disabled={busy || state?.loading}>
          Fetch initial count (async, 1 s)
        </button>
        <button onClick={handleDelayed} disabled={busy}>
          Increment after 800 ms
        </button>
        <button onClick={() => thunkedStore.dispatch(counterActions.reset())}>
          Reset (sync)
        </button>
      </div>

      <details style={{ fontSize: 12, color: '#6b7280' }}>
        <summary style={{ cursor: 'pointer' }}>Thunk middleware in ~8 lines (expand after implementing)</summary>
        <pre style={{ background: '#f3f4f6', padding: 8, borderRadius: 4, marginTop: 6 }}>{`
const orig = store.dispatch;
store.dispatch = (action) => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return orig(action);
};
        `.trim()}</pre>
      </details>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a todos + filter combo using a manual combineReducers:
//   - todosReducer: handles 'todos/add', 'todos/toggle', 'todos/remove'
//   - filterReducer: handles 'filter/set' → 'all' | 'active' | 'completed'
//   - combineReducers(slices): calls each reducer with its slice of state
//   - selector: getVisibleTodos(state) filters by state.filter
//   Use createStore from Exercise 2 to power a todo-list UI.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
      Build a todos + filter reducer pair with a manual combineReducers.
      Write a getVisibleTodos(state) selector and power a simple todo UI
      with your createStore from Exercise 2.
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const hint = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2   = { fontSize: 15, marginTop: 28, marginBottom: 6 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Redux Core (built from scratch)</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        No Redux library. Build the same patterns Redux uses internally so the
        architecture becomes concrete before you use the real thing.
      </p>

      <h2 style={h2}>Exercise 1 — Pure reducer + unit tests</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Build createStore (getState / dispatch / subscribe)</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Thunk middleware for async dispatch</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
