# State Machines (XState)

## The Problem With Boolean State

The instinct when adding a new state to a component is to add a new boolean:

```js
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [isRetrying, setIsRetrying] = useState(false);
```

Four booleans = sixteen theoretical combinations. But only four are valid: loading, error, success, retrying. The other twelve are impossible states — `isLoading && isSuccess`, `isError && isSuccess`, etc. Yet the code doesn't prevent them. A bug that sets two booleans to true simultaneously produces UI that's never been tested and never should be reachable.

State machines make impossible states impossible. Instead of four booleans, you have one `status` that can only be one of four values at a time.

---

## What a State Machine Is

A finite state machine has:
- A finite set of **states** (only one active at a time)
- **Events** that trigger **transitions** between states
- Optional **actions** (side effects that run on entry, exit, or transition)
- An **initial state**
- Optional **final states**

The key property: you can't be in two states simultaneously, and you can only transition to states that are valid from the current state. Illegal state combinations are structurally impossible.

---

## Without XState: useReducer as a State Machine

You don't need XState to use the state machine pattern. `useReducer` with explicit state values and a reducer that only handles valid transitions is a state machine:

```js
const initialState = { status: 'idle', data: null, error: null };

function fetchReducer(state, event) {
  switch (state.status) {
    case 'idle':
      if (event.type === 'FETCH') return { status: 'loading', data: null, error: null };
      return state;

    case 'loading':
      if (event.type === 'SUCCESS') return { status: 'success', data: event.data, error: null };
      if (event.type === 'ERROR') return { status: 'error', data: null, error: event.error };
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

function DataComponent() {
  const [state, dispatch] = useReducer(fetchReducer, initialState);

  // Events not valid in the current state are silently ignored
  // There's no way to reach status: 'loading' AND status: 'success' simultaneously
}
```

The outer `switch` is the current state, the inner `if`s are valid events in that state. Anything else returns the current state unchanged — invalid transitions are no-ops.

---

## XState

XState is a full state machine and statechart library. It goes beyond `useReducer` by supporting: nested states (hierarchical statecharts), parallel states, delayed transitions, activities (ongoing effects), actor model (spawning child machines), and visual visualization.

**Basic XState v5 machine:**

```js
import { createMachine, assign } from 'xstate';
import { useMachine } from '@xstate/react';

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    data: null,
    error: null,
  },
  states: {
    idle: {
      on: {
        FETCH: 'loading',
      },
    },
    loading: {
      invoke: {
        src: 'fetchData',           // service defined at use time
        onDone: {
          target: 'success',
          actions: assign({ data: ({ event }) => event.output }),
        },
        onError: {
          target: 'error',
          actions: assign({ error: ({ event }) => event.error }),
        },
      },
    },
    success: {
      on: {
        FETCH: 'loading',           // allow refetch
      },
    },
    error: {
      on: {
        RETRY: 'loading',
      },
    },
  },
});

function DataComponent() {
  const [state, send] = useMachine(fetchMachine, {
    actors: {
      fetchData: () => fetch('/api/data').then(r => r.json()),
    },
  });

  if (state.matches('loading')) return <Spinner />;
  if (state.matches('error')) return <Error message={state.context.error.message} />;
  if (state.matches('success')) return <Data data={state.context.data} />;

  return <button onClick={() => send({ type: 'FETCH' })}>Load</button>;
}
```

---

## Hierarchical States

Statecharts extend state machines with nested states. A state can contain its own sub-states, inheriting transitions from parent states:

```js
const authMachine = createMachine({
  initial: 'unauthenticated',
  states: {
    unauthenticated: {
      on: { LOGIN: 'authenticating' },
    },
    authenticating: {
      on: {
        SUCCESS: 'authenticated',
        FAILURE: 'unauthenticated',
      },
    },
    authenticated: {
      initial: 'idle',
      // From any sub-state of 'authenticated', LOGOUT goes back to 'unauthenticated'
      on: { LOGOUT: 'unauthenticated' },
      states: {
        idle: {
          on: { FETCH_PROFILE: 'loadingProfile' },
        },
        loadingProfile: {
          on: {
            PROFILE_LOADED: 'viewingProfile',
            PROFILE_ERROR: 'idle',
          },
        },
        viewingProfile: {
          on: { CLOSE: 'idle' },
        },
      },
    },
  },
});
```

The `LOGOUT` event at the `authenticated` level is inherited by all sub-states. This eliminates repetition — you don't need to add `LOGOUT` to every nested state.

---

## When State Machines Beat Booleans

Use a state machine when:

1. **Multiple booleans should be mutually exclusive** — if you ever check `if (isLoading && !isError)`, you're already thinking in states.
2. **Transitions have rules** — not all events should be valid in all states. A "submit" button shouldn't work while already submitting.
3. **Sequences matter** — the order of steps matters, not just the current values.
4. **You have "impossible" states** — combinations of booleans that your logic assumes can't happen but the types don't prevent.
5. **The flow is complex enough to warrant visualization** — XState has a visualizer that renders the machine as a diagram.

Don't use it for:
- Simple toggle state — one boolean, one `useState`
- Form state — React Hook Form or Formik handle this better
- Server state — React Query or RTK Query handle this
- Any state where the overhead of defining the machine exceeds the benefit

---

## XState Without the Library (The Pattern)

The state machine mental model is more valuable than the library. The pattern:

1. Define an explicit set of states (strings, not booleans)
2. Define events
3. Write a reducer that dispatches on `[currentState][event]` — ignore events not valid in the current state
4. Use the state string to drive UI (no combined boolean checks)

```js
// Instead of:
if (!isLoading && !isError && data) return <Result />;

// Write:
if (state.status === 'success') return <Result />;
```

This is always clearer. The machine-based approach is not about XState specifically — it's about modeling state as explicit, named phases rather than derived combinations of flags.

---

## Interview Questions

**Q (High): What problem does the state machine pattern solve that booleans don't?**

Answer: Multiple booleans can be in combinations that are logically impossible in your domain but are not prevented by the code. `isLoading && isSuccess` is false in your mental model but nothing stops the code from reaching it. When it does — due to a bug, a race condition, or a missed state reset — the UI enters an untested, undefined state. A state machine uses a single status value that can only be one thing at a time: `'idle' | 'loading' | 'success' | 'error'`. Impossible combinations are impossible structurally. Additionally, state machines let you define which transitions are valid in which states — events that arrive in the wrong state are simply ignored, preventing entire classes of state-management bugs.

---

**Q (High): When would you reach for XState vs a plain `useReducer`?**

Answer: A plain `useReducer` with explicit state values handles most cases well: it's the state machine pattern without the library overhead. Reach for XState when: the state has hierarchy (states within states — e.g., an `authenticated` super-state containing `viewingProfile`, `editingProfile` sub-states); you need parallel states (two independent state machines running simultaneously); you want to invoke async services declaratively inside the machine rather than imperatively in `useEffect`; or the machine is complex enough that visual documentation (XState's Visualizer) would help onboard team members. XState's actor model also helps when machines need to communicate. For a simple async fetch flow, `useReducer` with explicit status strings is sufficient and requires no additional dependency.

---

**Q (Medium): What is a "hierarchical state" and what problem does it solve?**

Answer: A hierarchical state (statechart) is a state that contains nested sub-states. This allows parent states to define transitions that are inherited by all their children. For example, an `authenticated` state might contain `idle`, `loading`, and `error` sub-states. By defining `LOGOUT → unauthenticated` at the `authenticated` level, all three sub-states inherit that transition without repeating it. This solves the combinatorial explosion of flat state machines: in a flat machine you'd need to add `LOGOUT` handling to every single state that can occur while authenticated. Hierarchical states let you express "while in any of these states, this event behaves the same way" once.

---

*End of Phase 6: State Management. 13 topics covering Context limitations and optimization, Redux core and RTK, server state management with React Query and SWR, optimistic updates, cache invalidation, and state machines.*
