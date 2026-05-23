# Redux Core

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Unidirectional flow | UI → dispatch(action) → reducer → new state → re-render | Every state change is traceable and reproducible |
| Pure reducer | `(state, action) => newState` with no side effects or mutation | Enables time-travel debugging and trivial unit tests |
| Middleware | Sits between `dispatch` and the reducer; can inspect, delay, or transform actions | Enables async (thunk), logging, and custom side effects |
| `useSelector` | Subscribes a component to a slice of the store; re-renders only when that slice changes | Fine-grained subscriptions unlike Context |

## The Mental Model

Redux is a predictable state container built on three constraints: (1) the entire app state lives in a single store, (2) state is read-only — you change it by dispatching an action, (3) changes happen through pure reducer functions. These aren't arbitrary rules; they're what makes every state transition traceable, testable, and replayable.

The data flow is strictly unidirectional:

```
UI event → dispatch(action) → reducer(currentState, action) → newState → re-render
```

Nothing ever mutates state directly. Every change is a described intent (action) processed by a pure function (reducer). This is what enables time-travel debugging — you can replay any sequence of actions to reconstruct any historical state.

---

## Store

The store holds the state tree, exposes `getState()`, accepts `dispatch(action)`, and allows `subscribe(listener)` for change notifications.

```js
import { createStore } from 'redux';

const store = createStore(rootReducer);

store.getState(); // current state
store.dispatch({ type: 'INCREMENT' }); // trigger state change
store.subscribe(() => console.log(store.getState())); // listen for changes
```

In a React app, `react-redux` bridges the store to components. You rarely call `store.subscribe` directly — `useSelector` and `useDispatch` handle it.

---

## Actions

Actions are plain objects with a `type` property. That's the only requirement. By convention, `type` is a string constant, often namespaced:

```js
const INCREMENT = 'counter/increment';
const DECREMENT = 'counter/decrement';

const action = { type: INCREMENT, payload: 5 };
```

**Action creators** are functions that return action objects:

```js
const increment = (amount) => ({ type: INCREMENT, payload: amount });

store.dispatch(increment(5));
```

They're optional but valuable for consistency — a single place where an action's shape is defined.

---

## Reducers

A reducer is a pure function: `(state, action) => newState`. It must not mutate state, perform side effects, or call non-deterministic functions (Date, Math.random).

```js
const initialState = { count: 0, loading: false };

function counterReducer(state = initialState, action) {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, count: state.count + (action.payload ?? 1) };
    case 'counter/decrement':
      return { ...state, count: state.count - (action.payload ?? 1) };
    case 'counter/reset':
      return initialState;
    default:
      return state; // always return current state for unknown actions
  }
}
```

Two rules: never mutate `state` directly, always return something from `default` (the current state, not `undefined`).

**Combining reducers** splits state management by domain:

```js
import { combineReducers } from 'redux';

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
  cart: cartReducer,
});
```

Each slice reducer receives only its own slice of state, not the whole store. `combineReducers` handles the composition.

> **Check yourself:** What are the two rules every reducer must follow, and what happens at the `default` case if you return `undefined`?

---

## Middleware

Middleware sits between `dispatch` and the reducer. It receives every dispatched action, can inspect it, transform it, delay it, swallow it, or dispatch more actions, then passes it along (or not).

The middleware signature is a curried function:

```js
const myMiddleware = store => next => action => {
  // Do something before passing action to next middleware/reducer
  console.log('dispatching', action);
  const result = next(action); // pass to next middleware or reducer
  console.log('next state', store.getState());
  return result;
};
```

Apply middleware with `applyMiddleware`:

```js
import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from '@redux-devtools/extension';

const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(thunk, logger))
);
```

---

## Redux Thunk

By default, `dispatch` only accepts plain objects. Redux Thunk is middleware that intercepts functions: if you dispatch a function instead of an object, Thunk calls it with `(dispatch, getState)`.

```js
// Without thunk: dispatch only accepts plain objects
store.dispatch({ type: 'FETCH_USER_SUCCESS', payload: user });

// With thunk: dispatch can accept functions for async work
const fetchUser = (id) => async (dispatch, getState) => {
  dispatch({ type: 'FETCH_USER_REQUEST' });
  try {
    const user = await api.getUser(id);
    dispatch({ type: 'FETCH_USER_SUCCESS', payload: user });
  } catch (err) {
    dispatch({ type: 'FETCH_USER_FAILURE', error: err.message });
  }
};

store.dispatch(fetchUser(42));
```

This is the original async pattern in Redux. RTK Query largely replaces this for data fetching, but understanding it is fundamental.

---

## react-redux: Connecting Components

The `Provider` component makes the store available to the entire tree via Context:

```js
import { Provider } from 'react-redux';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

**`useSelector`** subscribes to the store and returns a value. It re-renders only when the selector's return value changes:

```js
import { useSelector } from 'react-redux';

function Counter() {
  const count = useSelector(state => state.counter.count);
  return <span>{count}</span>;
}
```

`useSelector` uses strict equality by default. If your selector returns a new object or array on every call, the component re-renders on every dispatch. Keep selectors simple or use `shallowEqual`:

```js
import { shallowEqual } from 'react-redux';

const { name, email } = useSelector(
  state => ({ name: state.user.name, email: state.user.email }),
  shallowEqual
);
```

**`useDispatch`** returns the store's dispatch function:

```js
import { useDispatch } from 'react-redux';

function Counter() {
  const dispatch = useDispatch();
  return (
    <button onClick={() => dispatch({ type: 'counter/increment' })}>
      Increment
    </button>
  );
}
```

> **Check yourself:** You write `useSelector(state => ({ name: state.user.name, email: state.user.email }))`. Does this cause unnecessary re-renders? How do you fix it?

---

## Why the Architecture

The constraints feel bureaucratic until you work in a large codebase. When all state changes are described as serializable action objects:

- You can log every state transition in production
- You can replay a sequence of actions to reproduce a bug exactly
- DevTools can show you every action dispatched and the state before/after each one
- Time-travel debugging becomes possible — step backward and forward through history
- Tests are clean: `expect(reducer(state, action)).toEqual(expectedState)`

For small apps, this is overhead. For large teams or complex flows (multi-step wizards, undo/redo, offline-first sync), the constraints pay for themselves.

---

## Interview Questions


**Q (High): Explain the Redux data flow. Why is it unidirectional?**

Answer: The flow: component dispatches an action → middleware processes it (logging, async, etc.) → the action reaches the reducer → reducer returns new state → store updates → subscribed components re-render via `useSelector`. It's unidirectional because state only flows one way: from store to component. Components can't mutate state directly; they can only describe intent via actions. This makes state transitions traceable (every change comes from a dispatched action), testable (reducers are pure functions), and debuggable (serializable actions enable time-travel DevTools).

---

**Q (High): What makes a reducer "pure" and why does Redux require it?**

Answer: A pure function has no side effects and returns the same output for the same inputs. For reducers: no mutation of the `state` argument, no async calls, no `Date.now()` or `Math.random()`, no access to external state. Redux requires this because the entire debugging model depends on it: given any historical state and the sequence of actions that followed, you can reconstruct every intermediate state by replaying the reducers. If reducers have side effects or non-determinism, that replay is broken. Pure reducers also make unit tests trivial — just call the function with an action and assert on the output.

---

**Q (High): How does Redux Thunk work? What problem does it solve?**

Answer: By default, `store.dispatch` only accepts plain objects. Thunk is middleware that intercepts the dispatch call before it reaches the reducer. If the dispatched value is a function, Thunk calls it with `(dispatch, getState)` instead of passing it to the reducer. If it's a plain object, Thunk passes it through unchanged. This solves async operations: you dispatch a function that starts an async process, then dispatches real actions when the async work completes. The component doesn't know or care about the async details — it just calls `dispatch(fetchUser(id))` like any other action.

---
**Q (Medium): `useSelector` triggers a re-render. When does it not, and when does it unnecessarily?**

Answer: `useSelector` re-renders when its return value changes by strict equality (`Object.is`). It does not re-render if the same primitive value is returned or if the same object reference is returned. It unnecessarily re-renders when the selector creates a new object or array on every call — e.g., `state => state.ids.filter(...)` — because `filter` always returns a new array. Fixes: use `shallowEqual` as the second argument, memoize the selector with `createSelector` from Reselect (which caches the result and only recomputes when inputs change), or write selectors that return primitives or stable references.

---

**Q (Medium): What does `combineReducers` actually do?**

Answer: It creates a root reducer that calls each slice reducer with its own slice of state and the action, then assembles the results back into the full state object. Each slice reducer only ever sees its own piece of state — it can't read other slices. This enforces domain isolation. On initialization (first dispatch with `undefined` state), each slice reducer falls through to its default parameter and returns its initial state. `combineReducers` then assembles those into the initial full state.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can draw the Redux unidirectional data flow from memory (UI → dispatch → middleware → reducer → store → re-render)
- [ ] Can write a minimal reducer with `switch`, correct `default`, and no state mutation
- [ ] Can explain what Redux Thunk intercepts and what it enables
- [ ] Can explain why `useSelector` with an object return causes unnecessary re-renders and name two fixes
- [ ] Can state the three core Redux constraints and the debugging benefit each one enables

---

*Next: Redux Toolkit — createSlice, Immer integration, and why you should never write raw Redux again.*
