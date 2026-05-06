# useReducer

## What Is This?
useReducer is a React hook that manages state using a reducer function and a dispatch action pattern. It is an alternative to useState when state logic is more complex or when the next state depends on the previous state in non-trivial ways.

## Why Does It Exist?
useState is ideal for simple state updates, but complex state transitions quickly become hard to read with multiple setState calls. useReducer centralizes update logic in a reducer, making state transitions explicit and easier to test.

## How It Works
useReducer takes a reducer function and initial state:

```js
const [state, dispatch] = useReducer(reducer, initialState)
```

A reducer is a pure function:

```js
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return {count: state.count + 1}
    case 'reset':
      return initialState
    default:
      throw new Error('Unknown action')
  }
}
```

Calling `dispatch({type: 'increment'})` schedules React to run the reducer and update state.

### Lazy initialization
You can pass a third argument to useReducer for lazy init:

```js
const [state, dispatch] = useReducer(reducer, initialArg, init)
```

That is useful when computing the initial state is expensive.

## When to use it
- multiple state values that change together
- derived state based on action type
- state updates that should be centralized for clarity
- complex forms, workflow state, or undo/redo logic

## When to prefer useState
- simple independent pieces of state
- local component state without many branches
- when reducer boilerplate adds more complexity than value

## Gotchas
- The reducer should be pure and must not mutate state.
- Action objects should be descriptive and consistent.
- useReducer is not the same thing as Redux; there is no middleware, global store, or dispatch debugging unless you add it.
- Don’t place side effects inside the reducer; perform them in effects or event handlers.

## Interview Questions
**Q (High): When would you choose useReducer over useState?**
Answer: choose useReducer when state transitions are complex, when multiple values update together, or when you want a single place to reason about state changes. useState is better for simple independent values.
The trap: saying useReducer is only for Redux-style apps or that it should replace useState everywhere.

**Q (Medium): Is useReducer the same as Redux?**
Answer: no. They share a reducer/dispath pattern, but useReducer is local to a component and does not include middleware, action logging, or a global store. Redux is a state management library with additional architecture on top of the reducer concept.
The trap: equating useReducer with a full Redux implementation.

---
*Next: useImperativeHandle + forwardRef — the imperative escape hatch when a parent needs a child instance API.*
