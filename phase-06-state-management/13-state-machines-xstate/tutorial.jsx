// ============================================================
// Topic:   State Machines
// Phase:   6 — State Management
//
// HOW TO RUN: Pure React — no extra installs.
//   npm run tutorial state-machines-xstate
//
// NOTE: All three exercises use only useReducer — no XState library.
// The state machine PATTERN is the point, not the library.
// XState instructions appear in Exercise 3's Playground extension.
//
// APPROACH:
//   Exercise 1 — Refactor boolean soup into a useReducer state machine
//   Exercise 2 — Extend the machine with retry and cancel transitions
//   Exercise 3 — Hierarchical states: shared transitions at the parent level
// ============================================================

import { useState, useEffect, useReducer } from 'react';

// Mock API
const delay = (ms) => new Promise(r => setTimeout(r, ms));
let fetchFailCount = 0;
const mockApi = {
  fetchData: async () => {
    await delay(1200);
    fetchFailCount++;
    // Fail every 3rd fetch to let you test error/retry flow
    if (fetchFailCount % 3 === 0) throw new Error('Network error (simulated every 3rd fetch)');
    return { items: ['Apple', 'Banana', 'Cherry', 'Date'], fetchedAt: new Date().toLocaleTimeString() };
  },
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Refactor boolean soup → useReducer state machine
//
// The BROKEN component below uses 4 boolean flags. This creates
// 2^4 = 16 theoretical state combinations. Only 4 are valid.
// The other 12 are impossible but the code doesn't prevent them.
//
// PART A: count the impossible states
//   Read BooleanSoupVersion and list 3 impossible flag combinations
//   that the code doesn't prevent but that would produce broken UI.
//
// PART B: implement the state machine version
//   Replace the 4 booleans with a single status: 'idle' | 'loading' | 'success' | 'error'
//
//   The reducer must follow the state machine pattern:
//     switch (state.status) {         ← current state (outer switch)
//       case 'idle':
//         if (event.type === 'FETCH') return { status: 'loading', ... }
//         return state;               ← invalid events are ignored
//       case 'loading':
//         if (event.type === 'SUCCESS') ...
//         if (event.type === 'ERROR')   ...
//         return state;
//       ...
//     }
//
// TODO: complete fetchReducer and FetchMachineVersion below.
// ─────────────────────────────────────────────────────────────

// ── BROKEN: boolean soup ─────────────────────────────────────
function BooleanSoupVersion() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError,   setIsError]   = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [data,      setData]      = useState(null);

  async function handleFetch() {
    setIsLoading(true);
    setIsError(false);
    setIsSuccess(false);
    try {
      const result = await mockApi.fetchData();
      setData(result);
      setIsSuccess(true);
      // BUG: isLoading is still true until this next line — a race window exists
      setIsLoading(false);
    } catch {
      setIsError(true);
      setIsLoading(false);
    }
  }

  return (
    <div style={{ ...card, borderColor: '#f97316' }}>
      <strong style={{ fontSize: 13 }}>❌ Boolean soup (4 booleans = 16 possible combinations)</strong>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
        isLoading:{String(isLoading)} isError:{String(isError)} isSuccess:{String(isSuccess)}
      </div>
      <button onClick={handleFetch} disabled={isLoading}>
        {isLoading ? 'Loading…' : 'Fetch'}
      </button>
      {isError   && <p style={{ color: '#dc2626', fontSize: 13 }}>Error: network error</p>}
      {isSuccess && data && (
        <ul style={{ paddingLeft: 18, fontSize: 13 }}>
          {data.items.map(i => <li key={i}>{i}</li>)}
        </ul>
      )}
    </div>
  );
}

// ── TODO: state machine version ───────────────────────────────
const fetchInitialState = { status: 'idle', data: null, error: null };

// TODO: implement this reducer
// Outer switch on state.status, inner if on event.type.
// Invalid events (e.g., SUCCESS while idle) must return state unchanged.
function fetchReducer(state = fetchInitialState, event) {
  switch (state.status) {
    case 'idle':
      // if (event.type === 'FETCH') return { status: 'loading', data: null, error: null };
      return state;

    case 'loading':
      // if (event.type === 'SUCCESS') return { status: 'success', data: event.data, error: null };
      // if (event.type === 'ERROR')   return { status: 'error',   data: null, error: event.error };
      return state;

    case 'success':
      // if (event.type === 'FETCH') return { status: 'loading', data: state.data, error: null };
      return state;

    case 'error':
      // if (event.type === 'RETRY') return { status: 'loading', data: null, error: null };
      return state;

    default:
      return state;
  }
}

function FetchMachineVersion() {
  const [state, dispatch] = useReducer(fetchReducer, fetchInitialState);

  async function handleFetch() {
    dispatch({ type: 'FETCH' });
    try {
      const data = await mockApi.fetchData();
      dispatch({ type: 'SUCCESS', data });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message });
    }
  }

  return (
    <div style={{ ...card, borderColor: '#22c55e' }}>
      <strong style={{ fontSize: 13 }}>✓ State machine (1 status = 4 valid states only)</strong>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        status: <strong>{state.status}</strong>
      </div>

      {/* UI driven entirely by status — no boolean combinations */}
      {state.status === 'idle'    && <button onClick={handleFetch}>Fetch</button>}
      {state.status === 'loading' && <p style={{ color: '#6b7280', fontSize: 13 }}>⏳ Loading…</p>}
      {state.status === 'error'   && (
        <div>
          <p style={{ color: '#dc2626', fontSize: 13 }}>✗ {state.error}</p>
          {/* TODO: add a Retry button that dispatches { type: 'RETRY' }
               and then calls handleFetch() */}
        </div>
      )}
      {state.status === 'success' && state.data && (
        <div>
          <ul style={{ paddingLeft: 18, fontSize: 13 }}>
            {state.data.items.map(i => <li key={i}>{i}</li>)}
          </ul>
          <button onClick={handleFetch} style={{ fontSize: 11, marginTop: 4 }}>
            Refetch
          </button>
        </div>
      )}

      <ImpossibleStateTests state={state} />
    </div>
  );
}

// Verifies that impossible states can't be reached.
function ImpossibleStateTests({ state }) {
  const tests = [
    {
      label: 'status is one of the four valid values',
      pass: ['idle', 'loading', 'success', 'error'].includes(state.status),
    },
    {
      label: 'data is null when status is error',
      pass: state.status !== 'error' || state.data === null,
    },
    {
      label: 'error is null when status is success',
      pass: state.status !== 'success' || state.error === null,
    },
    {
      label: 'data and error are not both non-null',
      pass: !(state.data !== null && state.error !== null),
    },
  ];

  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 8 }}>
      <strong style={{ fontSize: 12 }}>Impossible state guards:</strong>
      {tests.map(({ label, pass }) => (
        <div key={label} style={{ fontSize: 11, color: pass ? '#15803d' : '#dc2626', marginTop: 2 }}>
          {pass ? '✓' : '✗'} {label}
        </div>
      ))}
    </div>
  );
}

function Exercise1() {
  return (
    <div>
      <p style={hint}>
        Part A: List 3 impossible boolean combinations before implementing.
        Part B: Implement fetchReducer. The tests below it should stay green
        regardless of what you click.
      </p>
      <BooleanSoupVersion />
      <FetchMachineVersion />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Extend the machine: CANCEL transition
//
// A real fetch flow needs more transitions:
//   - CANCEL: while loading, user cancels → go back to idle
//             (or to the last successful state if data exists)
//   - A loading state that carries the previous data (for refetch UX)
//
// The key insight: by adding CANCEL, we also make it impossible
// to trigger a cancel from idle or success — those states
// simply don't have a CANCEL transition, so the event is a no-op.
//
// TODO:
//   1. Extend fetchReducer2 (copy of fetchReducer) to handle CANCEL
//      in the 'loading' state:
//        case 'loading':
//          if (event.type === 'CANCEL') return { status: 'idle', data: state.data, error: null }
//          // or: return { status: 'success', data: state.data, error: null }
//          // if there was previous data, go back to success, not idle
//
//   2. Add an AbortController so the actual fetch is cancelled:
//        const abortController = new AbortController();
//        // pass signal to fetch: fetch(url, { signal })
//        // store ref to call abort() on CANCEL
//
//   3. Add a Cancel button in FetchMachineV2 — only visible when
//      status === 'loading'. Clicking it dispatches CANCEL.
//
//   4. Verify: clicking Cancel from idle or success does nothing.
//      Clicking Cancel from loading returns to the right state.
//
// CHECK YOURSELF:
//   What happens if you dispatch CANCEL while in the 'success' state?
//   Why is this correct behavior for a state machine?
// ─────────────────────────────────────────────────────────────

const fetchInitialState2 = { status: 'idle', data: null, error: null };

// TODO: extend fetchReducer with CANCEL in the 'loading' case
function fetchReducer2(state = fetchInitialState2, event) {
  switch (state.status) {
    case 'idle':
      if (event.type === 'FETCH') return { status: 'loading', data: state.data, error: null };
      return state;

    case 'loading':
      if (event.type === 'SUCCESS') return { status: 'success', data: event.data, error: null };
      if (event.type === 'ERROR')   return { status: 'error', data: null, error: event.error };
      // TODO: add CANCEL case here
      return state;

    case 'success':
      if (event.type === 'FETCH') return { status: 'loading', data: state.data, error: null };
      return state;

    case 'error':
      if (event.type === 'RETRY') return { status: 'loading', data: null, error: null };
      return state;

    default:
      return state;
  }
}

function FetchMachineV2() {
  const [state, dispatch] = useReducer(fetchReducer2, fetchInitialState2);
  const abortRef = { current: null };

  async function handleFetch() {
    // TODO: create AbortController, store in abortRef.current
    dispatch({ type: 'FETCH' });
    try {
      // TODO: pass signal to fetch
      const data = await mockApi.fetchData();
      dispatch({ type: 'SUCCESS', data });
    } catch (err) {
      if (err.name === 'AbortError') return; // cancelled — machine already transitioned
      dispatch({ type: 'ERROR', error: err.message });
    }
  }

  function handleCancel() {
    // TODO: call abortRef.current?.abort() then dispatch CANCEL
    dispatch({ type: 'CANCEL' });
  }

  function handleRetry() {
    dispatch({ type: 'RETRY' });
    handleFetch();
  }

  return (
    <div style={{ ...card, borderColor: '#6366f1' }}>
      <strong style={{ fontSize: 13 }}>State machine with CANCEL transition</strong>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        status: <strong>{state.status}</strong>
        {state.data && state.status !== 'success' && ' (has previous data)'}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {(state.status === 'idle' || state.status === 'success') &&
          <button onClick={handleFetch}>Fetch</button>}
        {state.status === 'loading' && (
          <>
            <span style={{ fontSize: 13, color: '#6b7280' }}>⏳ Loading…</span>
            {/* TODO: show Cancel button that calls handleCancel() */}
            <button onClick={handleCancel}>Cancel</button>
          </>
        )}
        {state.status === 'error' && (
          <>
            <span style={{ color: '#dc2626', fontSize: 13 }}>✗ {state.error}</span>
            <button onClick={handleRetry}>Retry</button>
          </>
        )}
      </div>

      {state.status === 'success' && state.data && (
        <ul style={{ paddingLeft: 18, fontSize: 13, marginTop: 6 }}>
          {state.data.items.map(i => <li key={i}>{i}</li>)}
        </ul>
      )}
    </div>
  );
}

function Exercise2() {
  return (
    <div>
      <p style={hint}>
        Implement CANCEL in fetchReducer2. Click Fetch, then immediately
        Cancel — status should return to idle (or success if data exists).
        Try dispatching CANCEL from idle or success — it should be a no-op.
      </p>
      <FetchMachineV2 />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Hierarchical states
//
// A flat machine repeats common transitions in every state.
// Hierarchical states (statecharts) let parent states define
// transitions that ALL their children inherit.
//
// Scenario: an "authenticated" super-state contains sub-states:
//   idle, loadingProfile, viewingProfile
//
// The LOGOUT transition is the same from ALL sub-states.
// In a flat machine you'd add LOGOUT to every sub-state.
// In a hierarchical machine you define it once at the parent level.
//
// TODO:
//   1. Implement authReducer using nested switch statements:
//      outer switch on state.phase (unauthenticated / authenticating / authenticated)
//      inner switch on state.subState (only when phase === 'authenticated')
//
//   2. Handle these events:
//      unauthenticated: LOGIN → authenticating
//      authenticating:  SUCCESS → authenticated/idle, FAILURE → unauthenticated
//      authenticated (any sub-state): LOGOUT → unauthenticated (inherited transition)
//      authenticated/idle: LOAD_PROFILE → authenticated/loadingProfile
//      authenticated/loadingProfile: LOADED → authenticated/viewingProfile, ERROR → idle
//      authenticated/viewingProfile: CLOSE → authenticated/idle
//
//   3. In AuthUI, render a different view for each phase/subState combination.
//
// OBSERVE: LOGOUT works regardless of which sub-state you're in.
//          You never have to add LOGOUT to each sub-state individually.
//
// CHECK YOURSELF:
//   In the flat machine, how many states would need LOGOUT?
//   What does this grow to as you add more sub-states?
// ─────────────────────────────────────────────────────────────

const authInitialState = { phase: 'unauthenticated', subState: null, profile: null, error: null };

// TODO: implement hierarchical reducer
function authReducer(state = authInitialState, event) {
  switch (state.phase) {
    case 'unauthenticated':
      if (event.type === 'LOGIN') return { ...state, phase: 'authenticating' };
      return state;

    case 'authenticating':
      if (event.type === 'SUCCESS') return { phase: 'authenticated', subState: 'idle', profile: null, error: null };
      if (event.type === 'FAILURE') return { phase: 'unauthenticated', subState: null, profile: null, error: event.error };
      return state;

    case 'authenticated':
      // ── INHERITED TRANSITION — applies to ALL sub-states ──────
      if (event.type === 'LOGOUT') return authInitialState;

      // ── Sub-state transitions ──────────────────────────────────
      switch (state.subState) {
        case 'idle':
          // TODO: LOAD_PROFILE → loadingProfile
          return state;

        case 'loadingProfile':
          // TODO: LOADED → viewingProfile (with profile data), ERROR → idle
          return state;

        case 'viewingProfile':
          // TODO: CLOSE → idle
          return state;

        default:
          return state;
      }

    default:
      return state;
  }
}

// Mock profile fetch
const fetchProfile = () =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (Math.random() < 0.3) reject(new Error('Profile fetch failed'));
      else resolve({ name: 'Alice Chen', email: 'alice@example.com', role: 'Senior Engineer' });
    }, 1000)
  );

function AuthUI() {
  const [state, dispatch] = useReducer(authReducer, authInitialState);

  async function handleLoadProfile() {
    dispatch({ type: 'LOAD_PROFILE' });
    try {
      const profile = await fetchProfile();
      dispatch({ type: 'LOADED', profile });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err.message });
    }
  }

  // Simulate async login
  async function handleLogin() {
    dispatch({ type: 'LOGIN' });
    await delay(800);
    dispatch({ type: 'SUCCESS' });
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
        phase: <strong>{state.phase}</strong>
        {state.subState && <> / subState: <strong>{state.subState}</strong></>}
      </div>

      {state.phase === 'unauthenticated' && (
        <button onClick={handleLogin}>Login</button>
      )}
      {state.phase === 'authenticating' && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>⏳ Authenticating…</p>
      )}
      {state.phase === 'authenticated' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {/* LOGOUT works from ANY sub-state — defined once at the parent level */}
            <button onClick={() => dispatch({ type: 'LOGOUT' })}>Logout (works from any sub-state)</button>
          </div>

          {state.subState === 'idle' && (
            <button onClick={handleLoadProfile}>Load Profile</button>
          )}
          {state.subState === 'loadingProfile' && (
            <p style={{ color: '#6b7280', fontSize: 13 }}>⏳ Loading profile…</p>
          )}
          {state.subState === 'viewingProfile' && state.profile && (
            <div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <strong>{state.profile.name}</strong> — {state.profile.email}
              </div>
              <button onClick={() => dispatch({ type: 'CLOSE' })}>Close Profile</button>
            </div>
          )}
          {state.error && (
            <p style={{ color: '#dc2626', fontSize: 13 }}>
              ✗ {state.error}
              <button onClick={() => dispatch({ type: 'LOAD_PROFILE' })} style={{ marginLeft: 8, fontSize: 11 }}>
                Retry
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Implement the sub-state transitions in authReducer. LOGOUT is already
        defined at the 'authenticated' level — verify it works from ALL sub-states.
        Add LOAD_PROFILE / LOADED / ERROR / CLOSE transitions.
      </p>
      <AuthUI />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// If you want to try XState:
//   npm install xstate @xstate/react
//   Rewrite fetchReducer2 (Exercise 2) as an XState machine:
//
// import { createMachine, assign } from 'xstate';
// import { useMachine } from '@xstate/react';
//
// const fetchMachine = createMachine({
//   id: 'fetch', initial: 'idle',
//   context: { data: null, error: null },
//   states: {
//     idle:    { on: { FETCH: 'loading' } },
//     loading: {
//       invoke: { src: 'fetchData', onDone: { target: 'success', actions: assign({ data: ({ event }) => event.output }) },
//                                   onError: { target: 'error',   actions: assign({ error: ({ event }) => event.error }) } },
//       on: { CANCEL: 'idle' },
//     },
//     success: { on: { FETCH: 'loading' } },
//     error:   { on: { RETRY: 'loading' } },
//   },
// });
//
// Then use: const [state, send] = useMachine(fetchMachine, { actors: { fetchData: mockApi.fetchData } });
// Compare: what does XState add over the useReducer version?
//   - invoke: async services without useEffect
//   - Visualizer: see the machine as a diagram (stately.ai/viz)
//   - Guaranteed correct transitions (library enforces the machine)
function Playground() {
  return (
    <div>
      <p style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Extend Exercise 3 with a "parallel" state: a notifications sub-system
        that runs independently of the auth flow. A user can receive notifications
        whether they're in idle, loadingProfile, or viewingProfile.
        How do you model this with nested reducers?
      </p>
      <p style={{ color: '#888', fontStyle: 'italic', fontSize: 14, marginTop: 8 }}>
        Then, if you want to go further: port Exercise 2's fetch machine to XState
        (install <code>xstate @xstate/react</code>) and compare what the library
        adds vs the plain useReducer version.
      </p>
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card = { padding: 10, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 10, fontSize: 14 };
const hint = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2   = { fontSize: 15, marginTop: 28, marginBottom: 6 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 580 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>State Machines</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Pure React — no XState needed. The pattern matters more than the library.
      </p>

      <h2 style={h2}>Exercise 1 — Boolean soup → useReducer state machine</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Extend the machine: CANCEL transition</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Hierarchical states: inherited transitions</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
