# useReducer

## What Is This?

`useReducer` is an alternative to `useState` for managing state that involves multiple sub-values or where the next state depends on complex logic. It follows the reducer pattern: instead of calling a setter function directly, you dispatch action objects, and a pure reducer function computes the next state.

```javascript
const [state, dispatch] = useReducer(reducer, initialState);

// Trigger a state change
dispatch({ type: 'increment' });

// The reducer decides what the new state looks like
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'decrement':
      return { ...state, count: state.count - 1 };
    default:
      return state;
  }
}
```

## Why Does It Exist?

`useState` is excellent for isolated, simple values. But components with complex state have a scaling problem:

```javascript
// Multiple useState calls for related state — the transitions aren't coordinated
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

// A fetch operation has to update multiple pieces of state consistently:
setLoading(true);
setError(null);  // Easy to forget
// ...then on success:
setLoading(false);
setData(result);
```

There's nothing preventing you from accidentally leaving `loading: true` while also setting `data`. The state transitions are scattered across the component with no single source of truth about what combinations are valid.

`useReducer` centralizes all state transitions in one place — the reducer. Every possible state change is an explicit, named action. The reducer enforces the logic of what combinations are valid. This makes state transitions:

- **Predictable**: given the same state and action, the reducer always returns the same result
- **Testable**: a pure function with no side effects — unit test it independently
- **Debuggable**: log actions and state to trace exactly what happened

The pattern is lifted from Redux, but `useReducer` is built-in and scoped to a single component (or shared via context).

## How It Works

### The Signature

```javascript
const [state, dispatch] = useReducer(reducer, initialArg, init?);
```

- `reducer`: a pure function `(state, action) => newState`
- `initialArg`: the initial state value (or the argument passed to `init`)
- `init` (optional): a function for lazy initialization — `init(initialArg)` is called once to compute the initial state

### Dispatch Is Stable

`dispatch` is a stable reference — it never changes between renders, the same way `useState`'s setter is stable. This is important: you can put `dispatch` in `useEffect` dep arrays, pass it to children, and include it in `useCallback` without worrying about stale references. It's always the same function.

### State Updates Are Batched

Just like `useState`, multiple `dispatch` calls within a single event handler are batched in React 18 — only one re-render happens.

### Lazy Initialization

```javascript
function init(initialCount) {
  return { count: initialCount };
}

const [state, dispatch] = useReducer(reducer, 0, init);
// state = { count: 0 }
```

The third argument `init` is useful when computing the initial state is expensive or requires transformation. It also enables resetting state to the initial computation:

```javascript
case 'reset':
  return init(action.payload); // Reset to computed initial state
```

## Modeling Complex State

The power of `useReducer` is in how it models state as a finite set of valid configurations.

### Fetch State Machine

```javascript
const initialState = { status: 'idle', data: null, error: null };

function fetchReducer(state, action) {
  switch (action.type) {
    case 'fetch/start':
      return { status: 'loading', data: null, error: null };
    case 'fetch/success':
      return { status: 'success', data: action.payload, error: null };
    case 'fetch/error':
      return { status: 'error', data: null, error: action.payload };
    case 'fetch/reset':
      return initialState;
    default:
      return state;
  }
}

function DataComponent() {
  const [state, dispatch] = useReducer(fetchReducer, initialState);

  async function fetchData() {
    dispatch({ type: 'fetch/start' });
    try {
      const data = await api.getData();
      dispatch({ type: 'fetch/success', payload: data });
    } catch (err) {
      dispatch({ type: 'fetch/error', payload: err.message });
    }
  }

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'error') return <Error message={state.error} />;
  if (state.status === 'success') return <Data value={state.data} />;
  return <button onClick={fetchData}>Load</button>;
}
```

Notice: it's impossible to get into `{ status: 'loading', data: someData }` because the reducer explicitly resets `data` to null on start. The transitions enforce valid states.

### Multi-Field Form State

```javascript
const initialFormState = {
  values: { email: '', password: '' },
  errors: {},
  isSubmitting: false,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'field/change':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: undefined }, // Clear error on change
      };
    case 'submit/start':
      return { ...state, isSubmitting: true, errors: {} };
    case 'submit/fail':
      return { ...state, isSubmitting: false, errors: action.errors };
    case 'submit/success':
      return initialFormState;
    default:
      return state;
  }
}
```

All form logic lives in one reducer. Testing it means unit-testing a pure function with no component involved.

## useReducer + Context: The Redux-Without-Redux Pattern

This combination is the closest you can get to Redux without a library. Useful for medium-complexity global state:

```javascript
const StoreContext = createContext(null);
const DispatchContext = createContext(null);

function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <DispatchContext.Provider value={dispatch}>
      <StoreContext.Provider value={state}>
        {children}
      </StoreContext.Provider>
    </DispatchContext.Provider>
  );
}

// Separate contexts: components that only dispatch never re-render on state changes
function ActionButton() {
  const dispatch = useContext(DispatchContext);
  return <button onClick={() => dispatch({ type: 'increment' })}>+</button>;
}

function Counter() {
  const { count } = useContext(StoreContext);
  return <span>{count}</span>;
}
```

`dispatch` is stable, so `DispatchContext` never triggers a re-render. Only `StoreContext` consumers re-render when state changes.

## useState vs useReducer

| Scenario | Prefer |
|----------|--------|
| Single, independent value | `useState` |
| Multiple values that update together | `useReducer` |
| Next state depends on previous via complex logic | `useReducer` |
| State transitions need to be testable | `useReducer` |
| State has a finite set of valid configurations | `useReducer` |
| Sharing state transitions across components | `useReducer` + context |

The threshold isn't a hard line — some people write reducers for 3 booleans, others use multiple `useState` calls for 10 fields. The heuristic: if you're writing state updates that must stay consistent with each other, a reducer is cleaner.

## Gotchas

### 1. Returning the same state reference bails out

```javascript
case 'update':
  state.count = 5; // Mutating — same reference
  return state; // React bails out: no re-render!
```

Like `useState`, returning the same reference causes React to bail out. Always return a new object for the update to be reflected.

### 2. Dispatching inside the reducer is undefined behavior

The reducer must be pure. No side effects, no API calls, no `dispatch`. If you need to dispatch another action as a consequence of an action, do it in the event handler, not the reducer.

### 3. dispatch is stable but the reducer is closed over

`dispatch` never changes. But the reducer you define inside the component body has access to component props and state via closure. If your reducer references props, those are stale if you're not careful. Prefer keeping reducers outside the component and passing any external data via the action payload.

```javascript
// ❌ Reducer defined inside component, potentially closes over stale props
function Component({ userId }) {
  function reducer(state, action) {
    if (action.type === 'submit') {
      return { ...state, submittedBy: userId }; // userId from closure — might be stale
    }
    return state;
  }
}

// ✅ Pass data through the action
function Component({ userId }) {
  function reducer(state, action) {
    if (action.type === 'submit') {
      return { ...state, submittedBy: action.userId };
    }
    return state;
  }

  const handleSubmit = () => dispatch({ type: 'submit', userId });
}
```

### 4. The action type convention

`type` is a convention, not a requirement. The action can be any value — a string, a number, an object. But `{ type: string, payload?: any }` is the universal pattern (borrowed from Redux) and makes actions self-describing.

## Interview Questions

**Q: When would you choose `useReducer` over `useState`?**

Strong answer: When state involves multiple related values that must update together in a coordinated way, or when the number of distinct state transitions is large enough that scattered `setState` calls become hard to reason about. The canonical example is async fetch state — you need `{ status, data, error }` to always be consistent, and a reducer enforces that `status: 'loading'` always resets `data` and `error`. A reducer also separates the *what happened* (an action) from the *what the new state is* (the computation), which makes the logic testable without mounting a component. The threshold isn't a fixed number of state variables — it's whether coordinated transitions and named operations would make the code clearer.

The trap: "Use useReducer when you have more than 3 state variables." That's a rule of thumb, not a principle. The real criterion is whether state transitions need to be coordinated and named.

---

**Q: How does `useReducer` compare to Redux?**

Strong answer: Same core pattern — reducer, actions, dispatch — but `useReducer` is scoped to a component instance, while Redux is a singleton store outside React. Redux adds: (1) a global store accessible from anywhere, (2) middleware for side effects (Thunk, Saga), (3) DevTools with time-travel debugging, (4) `useSelector` for efficient fine-grained subscriptions. `useReducer` + context gives you most of the pattern with none of the tooling overhead, which is appropriate for medium-complexity component trees. For app-wide state with frequent updates and many consumers, Redux Toolkit's `useSelector` is far more efficient than context (which re-renders all consumers on any state change). The choice is scale + tooling needs, not philosophical preference.

The trap: "useReducer is just mini-Redux." The architectural difference (scoped vs global, no selector-based subscriptions) matters a lot at scale.

---

**Q: Why is `dispatch` a stable reference but the state value isn't?**

Strong answer: `dispatch` is created once when `useReducer` is first called and never changes — React holds a stable reference to it on the component's fiber. State, by contrast, is a new value each time a dispatch causes a state change, because the reducer returns a new object (immutability means you never mutate the state in place). The practical implication: you can safely include `dispatch` in `useEffect` dependency arrays and `useCallback` deps without worrying about it causing unnecessary re-runs. It's stable by design — React knew that components would need to pass dispatch around, and a stable reference avoids memoization overhead.

The trap: Thinking `dispatch` needs to be in `useMemo` or `useCallback` deps. It doesn't — it's already stable.

---

**Q: Can you dispatch actions from within the reducer?**

Strong answer: No. The reducer must be a pure function — it takes state and action and returns new state, with no side effects. Dispatching from a reducer would be a side effect and would violate purity. It would also be circular: a dispatch triggers a reducer run, which triggers another dispatch, which triggers another reducer run. If you need to dispatch multiple actions in response to a single user event, do that in the event handler: call `dispatch` twice. If you need side effects after a state transition (like a network call after `status` changes to `submitted`), use a `useEffect` that watches the relevant piece of state.

The trap: Conflating the Redux pattern of "action triggers side effects via middleware" with the reducer itself. In React, side effects after dispatching live in event handlers or effects, never in the reducer.

---

*Next: [useImperativeHandle + forwardRef](10-use-imperative-handle-forward-ref.md) — Exposing a controlled API from a component to its parent via refs, and why you should reach for this pattern sparingly.*
