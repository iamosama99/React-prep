# useReducer

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Reducer pattern | Pure function `(state, action) => newState` | All state transitions live in one testable place |
| `dispatch` | Sends an action object to the reducer | Decouples "what happened" from "how state changes" |
| Lazy initialization | Third arg `init` function called with second arg | Defers expensive initial-state computation |
| Not Redux | Local to the component; no middleware or global store | Useful at component scale; Redux adds architecture on top |

## What Is This?

`useReducer` is a React hook that manages state using a reducer function. Instead of calling `setState` with a new value, you call `dispatch` with an "action" that describes *what happened*. A pure function (the reducer) then decides how to update the state based on that action.

```javascript
const [state, dispatch] = useReducer(reducer, initialState);

// Update state by dispatching an action
dispatch({ type: 'increment' });
```

It's an alternative to `useState` for managing complex state logic — especially when the next state depends on the previous state, or when multiple related state values need to update together.

> **Check yourself:** What is the key difference between calling `setState(newValue)` and calling `dispatch({ type: 'increment' })`? What does this separation buy you?

## Why Does It Exist?

`useState` is perfect for simple, independent state values: a counter, a text input, a toggle. But when state logic gets complex, `useState` starts to struggle:

```javascript
// With useState — scattered logic, hard to follow
const [items, setItems] = useState([]);
const [selectedId, setSelectedId] = useState(null);
const [isEditing, setIsEditing] = useState(false);

function handleDelete(id) {
  setItems(items.filter(i => i.id !== id));
  if (selectedId === id) setSelectedId(null);
  if (isEditing) setIsEditing(false);
}

function handleSelect(id) {
  setSelectedId(id);
  setIsEditing(false);
}
```

The update logic is spread across multiple setter calls. If you need to add another state transition (like "undo"), you'd have to touch every handler.

`useReducer` centralizes all state transitions in one place:

```javascript
// With useReducer — all logic in one place
function reducer(state, action) {
  switch (action.type) {
    case 'delete':
      return {
        ...state,
        items: state.items.filter(i => i.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        isEditing: false,
      };
    case 'select':
      return { ...state, selectedId: action.id, isEditing: false };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
```

The reducer is a pure function that can be tested independently. The components just dispatch actions — they don't need to know *how* state changes.

## How It Works

### The API

```javascript
const [state, dispatch] = useReducer(reducer, initialState);
```

- `reducer`: A pure function `(state, action) => newState`
- `initialState`: The initial state value
- Returns: `[currentState, dispatchFunction]`

### The Reducer Function

A reducer takes the current state and an action, and returns the next state. It must be pure — no side effects, no mutations.

```javascript
function counterReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'reset':
      return { count: 0 };
    case 'set':
      return { count: action.value };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

const [state, dispatch] = useReducer(counterReducer, { count: 0 });

dispatch({ type: 'increment' });      // { count: 1 }
dispatch({ type: 'set', value: 42 }); // { count: 42 }
dispatch({ type: 'reset' });          // { count: 0 }
```

> **Check yourself:** Why does the `default` case throw an error instead of returning the current state? What bug does this catch?

### Action Objects

Actions are plain objects that describe *what happened*. By convention, they have a `type` property and optionally a `payload` (or specific fields):

```javascript
// Convention 1: type + specific fields
dispatch({ type: 'add_todo', text: 'Buy milk' });
dispatch({ type: 'toggle_todo', id: 42 });

// Convention 2: type + payload (Redux style)
dispatch({ type: 'ADD_TODO', payload: { text: 'Buy milk' } });
```

Both work. Pick a convention and be consistent.

### Dispatch is Stable

Unlike a function created with `useState`, the `dispatch` function returned by `useReducer` is **stable** — its reference never changes across renders. This makes it ideal for passing to memoized children or using in dependency arrays:

```javascript
const [state, dispatch] = useReducer(reducer, initialState);

// dispatch never changes → this effect never re-runs because of dispatch
useEffect(() => {
  socket.on('message', (msg) => dispatch({ type: 'new_message', msg }));
  return () => socket.off('message');
}, [dispatch]); // dispatch is stable — this is equivalent to []
```

> **Check yourself:** The `dispatch` function from `useReducer` has a stable identity. Does the `setState` function from `useState` also have a stable identity?

### Lazy Initialization

For expensive initial state, pass a third argument — an initializer function:

```javascript
function init(initialCount) {
  // Expensive computation, only runs once
  return { count: initialCount, history: [] };
}

const [state, dispatch] = useReducer(reducer, 0, init);
// init(0) is called once → { count: 0, history: [] }
```

The `init` function receives the second argument (`0` in this case) and returns the actual initial state. It only runs on mount, similar to lazy initialization in `useState`.

This is also useful for implementing a "reset" action:

```javascript
function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return init(action.initialCount); // Reuse the initializer
    // ...
  }
}
```

## useState vs useReducer

| Aspect | useState | useReducer |
|--------|----------|------------|
| **Best for** | Simple, independent values | Complex state with many transitions |
| **Update mechanism** | `setState(newValue)` or `setState(prev => next)` | `dispatch({ type, ...payload })` |
| **State transitions** | Spread across event handlers | Centralized in the reducer |
| **Testability** | Test the component | Test the reducer independently |
| **Setter stability** | Stable (setState reference doesn't change) | Stable (dispatch reference doesn't change) |
| **Number of values** | One per `useState` call | Can manage multiple related values in one object |
| **Learning curve** | Low | Medium (requires understanding actions + reducer pattern) |

### When to choose useReducer

- Multiple state values that change together
- The next state depends on the previous state in complex ways
- State transitions should be testable independently
- You want to pass `dispatch` instead of multiple callbacks
- You're implementing undo/redo, form validation, or workflow state

### When to prefer useState

- Simple, independent state (counter, toggle, text input)
- Only one or two state transitions
- The reducer boilerplate would add more complexity than it removes

> **Check yourself:** You have a form with 5 fields. Each field is independent — changing one never affects another. Would you use `useState` or `useReducer`? What if changing one field resets another?

## Real-World Use Cases

### 1. Complex Form State

```javascript
function formReducer(state, action) {
  switch (action.type) {
    case 'field_change':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: null }, // Clear error on change
        touched: { ...state.touched, [action.field]: true },
      };
    case 'validate':
      return { ...state, errors: validate(state.values) };
    case 'submit_start':
      return { ...state, isSubmitting: true, submitError: null };
    case 'submit_success':
      return { ...state, isSubmitting: false };
    case 'submit_error':
      return { ...state, isSubmitting: false, submitError: action.error };
    case 'reset':
      return initialFormState;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
```

### 2. Undo / Redo

```javascript
function undoReducer(state, action) {
  switch (action.type) {
    case 'set':
      return {
        past: [...state.past, state.present],
        present: action.value,
        future: [],
      };
    case 'undo':
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case 'redo':
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}
```

### 3. Data Fetching State Machine

```javascript
function fetchReducer(state, action) {
  switch (action.type) {
    case 'fetch_start':
      return { ...state, loading: true, error: null };
    case 'fetch_success':
      return { loading: false, data: action.data, error: null };
    case 'fetch_error':
      return { loading: false, data: null, error: action.error };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

const [state, dispatch] = useReducer(fetchReducer, {
  loading: false, data: null, error: null
});
```

### 4. useReducer + Context (Mini Redux)

```javascript
const TodoDispatchContext = createContext(null);
const TodoStateContext = createContext(null);

function TodoProvider({ children }) {
  const [todos, dispatch] = useReducer(todoReducer, []);

  return (
    <TodoStateContext.Provider value={todos}>
      <TodoDispatchContext.Provider value={dispatch}>
        {children}
      </TodoDispatchContext.Provider>
    </TodoStateContext.Provider>
  );
}

// Any component can dispatch without prop drilling
function AddTodo() {
  const dispatch = useContext(TodoDispatchContext);
  const [text, setText] = useState('');

  return (
    <form onSubmit={() => dispatch({ type: 'add', text })}>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  );
}
```

## Gotchas

### 1. The reducer must be pure — no mutations

```javascript
// ❌ Mutates state directly
function reducer(state, action) {
  state.count++; // MUTATION — this is a bug
  return state;  // Same reference → React won't re-render
}

// ✅ Returns a new object
function reducer(state, action) {
  return { ...state, count: state.count + 1 };
}
```

Mutating and returning the same object means `Object.is(oldState, newState)` is `true`, so React skips the re-render.

### 2. No side effects in the reducer

```javascript
// ❌ Side effect inside reducer
function reducer(state, action) {
  if (action.type === 'save') {
    fetch('/api/save', { method: 'POST', body: JSON.stringify(state) }); // Side effect!
    return { ...state, saved: true };
  }
}

// ✅ Side effects in event handlers or effects
function handleSave() {
  dispatch({ type: 'save_start' });
  fetch('/api/save', { method: 'POST', body: JSON.stringify(state) })
    .then(() => dispatch({ type: 'save_success' }))
    .catch(err => dispatch({ type: 'save_error', error: err }));
}
```

### 3. Missing default case

```javascript
// ❌ Silently returns undefined for unknown actions
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    // no default → returns undefined for unknown actions → crash
  }
}

// ✅ Throw on unknown actions (catches typos)
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}
```

### 4. useReducer is not Redux

`useReducer` gives you the reducer pattern locally. Redux adds:
- A global store accessible everywhere
- Middleware (thunks, sagas) for side effects
- DevTools with time-travel debugging
- Selector-based subscriptions (only re-render when your slice changes)

Don't confuse the two in an interview.

### 5. Overcomplicating simple state

```javascript
// ❌ Overkill: a simple boolean toggle doesn't need a reducer
function toggleReducer(state, action) {
  switch (action.type) {
    case 'toggle': return !state;
    default: throw new Error();
  }
}
const [isOpen, dispatch] = useReducer(toggleReducer, false);

// ✅ useState is simpler and clearer
const [isOpen, setIsOpen] = useState(false);
const toggle = () => setIsOpen(o => !o);
```

> **Check yourself:** You have a component with 3 boolean toggles (isOpen, isEditing, isLoading) that are independent of each other. Should you use `useReducer` or three `useState` calls? What changes your answer?

## Interview Questions

**Q (High): When would you choose `useReducer` over `useState`?**

Answer: When state transitions are complex — multiple related values that update together, when the next state depends on the previous state in non-trivial ways, or when you want testable state logic. The signal that `useState` is insufficient: you have multiple `setState` calls in the same handler that need to be coordinated, or state transitions are becoming hard to follow.

Real examples: form state with validation and submission, undo/redo, data fetching with loading/error/data states, workflow steps.

The trap: Saying `useReducer` should replace `useState` everywhere, or that it's only for Redux-style apps.

---

**Q (High): What must a reducer function guarantee?**

Answer: It must be a pure function:
1. Same inputs always produce the same output
2. No side effects (no API calls, no DOM manipulation, no random values)
3. No mutation of the state argument — always return a new object

Breaking any of these guarantees leads to bugs: skipped re-renders (if you mutate), unpredictable behavior (if impure), or state inconsistencies (if side effects fail).

The trap: Putting `fetch()` calls or `localStorage` writes inside the reducer.

---

**Q (High): Is `useReducer` the same as Redux?**

Answer: No. They share the reducer/dispatch pattern, but `useReducer` is:
- Local to a component (not a global store)
- No middleware support (no thunks, sagas)
- No devtools integration (no time-travel debugging)
- No selector-based subscriptions

Redux provides all of these on top of the reducer concept. `useReducer` is useful at component scale; Redux (or Zustand, Jotai) is for app-wide state management.

The trap: Equating `useReducer` with a full Redux implementation, or thinking they solve the same problems at the same scale.

---

**Q (High): How does `dispatch` stability benefit performance?**

Answer: The `dispatch` function returned by `useReducer` has a stable identity — its reference never changes across renders. This means you can safely pass it to memoized children or use it in dependency arrays without causing unnecessary re-renders or effect re-runs.

With `useState`, the `setState` function is also stable, but you often need to create wrapper functions that *are not* stable. With `useReducer`, you just pass `dispatch` directly — no wrapper needed.

The trap: Not knowing that `dispatch` is stable, and wrapping it in `useCallback` unnecessarily.

---

**Q (Medium): How does lazy initialization work in `useReducer`?**

Answer: Pass a third argument — an initializer function. React calls `init(initialArg)` on mount to produce the initial state.

```javascript
function init(count) { return { count, history: [] }; }
const [state, dispatch] = useReducer(reducer, 0, init);
// init(0) runs once → { count: 0, history: [] }
```

This defers expensive computation to mount time, similar to `useState(() => expensiveInit())`. It's also useful for implementing a "reset" action by re-using the initializer.

The trap: Confusing the second argument (passed to `init`) with the actual initial state.

---

**Q (Medium): How do you test a reducer?**

Answer: Since a reducer is a pure function, you test it by calling it directly with inputs and asserting outputs:

```javascript
test('increment increases count', () => {
  const state = { count: 5 };
  const result = reducer(state, { type: 'increment' });
  expect(result).toEqual({ count: 6 });
});

test('unknown action throws', () => {
  expect(() => reducer({ count: 0 }, { type: 'nope' })).toThrow();
});
```

No React rendering needed — this is one of the key benefits of the reducer pattern.

The trap: Thinking you need to mount a component to test state transitions.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write a minimal `useReducer` example with two action types from memory
- [ ] Can name the constraint a reducer must obey (pure function, no mutation)
- [ ] Can describe the scenario that signals `useReducer` is better than multiple `useState` calls
- [ ] Can clearly state how `useReducer` differs from Redux
- [ ] Can explain lazy initialization with the third argument
- [ ] Can write a unit test for a reducer function without React

---

*Next: [useImperativeHandle + forwardRef](../10-use-imperative-handle-forward-ref/notes.md) — the imperative escape hatch when a parent needs a child instance API.*
