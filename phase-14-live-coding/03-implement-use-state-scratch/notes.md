# Implement useState from Scratch

## Quick Reference

| Concept | Detail |
|---|---|
| Hook storage | Array of slots (`hooks[]`) indexed by order of call |
| Hook index | Global `hookIndex` reset to `0` before each render |
| Why hooks can't be in conditionals | Conditional calls shift the index — subsequent hooks read wrong slots |
| Updater function | `setState(prev => prev + 1)` — called with current value, returns new value |
| Re-render trigger | `setState` calls the render function to re-invoke the component |
| React's actual implementation | Linked list on the fiber node, not a global array |
| Key insight | Hook order must be identical across every render call |

---

## Why This Matters

This is a "how does React work under the hood" question. Interviewers ask it to separate candidates who understand React's design from those who just use it. Being able to implement a minimal `useState` demonstrates:

1. You understand the "rules of hooks" at a mechanistic level, not just as a lint rule
2. You can reason about mutable state without React's abstractions
3. You understand closures — the setter function closes over `currentIndex`
4. You understand the render loop — `setState` must trigger a re-render

Even if you never implement this in production, being able to explain it fluently in an interview signals deep React expertise.

---

## Core Concepts

### The Hooks Array Model

React maintains state between renders. For a simple mental model, imagine:

```tsx
const hooks: unknown[] = [];  // One slot per useState call, in call order
let hookIndex = 0;            // Which slot we're currently initializing/reading
```

Each `useState` call gets the next slot:

```tsx
function useState<T>(initialValue: T): [T, (v: T | ((p: T) => T)) => void] {
  const index = hookIndex; // Capture the index for this particular hook
  hookIndex++;             // Advance for the next useState call

  // First render: initialize the slot
  if (hooks[index] === undefined) {
    hooks[index] = initialValue;
  }

  const setState = (valueOrUpdater: T | ((prev: T) => T)) => {
    const newValue = typeof valueOrUpdater === 'function'
      ? (valueOrUpdater as (prev: T) => T)(hooks[index] as T)
      : valueOrUpdater;
    hooks[index] = newValue;
    rerender(); // Trigger a new render cycle
  };

  return [hooks[index] as T, setState];
}
```

### The Render Loop

Every render call must reset `hookIndex` to zero before calling the component function. This ensures each `useState` call gets the same slot it got last time:

```tsx
function rerender() {
  hookIndex = 0; // Critical — reset before each render
  const element = MyComponent();
  // ... update the DOM
}
```

### Why Conditionals Break Hooks

Consider a component with two `useState` calls:

```tsx
// Render 1: hookIndex resets to 0
const [name, setName] = useState('Alice');   // index 0
const [count, setCount] = useState(0);       // index 1

// Render 2 (after some condition changes):
if (someCondition) {
  const [name, setName] = useState('Alice'); // index 0 ← fine
}
const [count, setCount] = useState(0);       // index 1 if condition is true
                                              // index 0 if condition is false! WRONG
```

If `someCondition` is `false` on render 2, `count` reads from index 0 (which has `'Alice'`). Every subsequent hook is now reading from the wrong slot — silent corruption.

### Updater Function Pattern

```tsx
// Stale closure risk:
setCount(count + 1); // `count` is captured at render time — can be stale in async code

// Safer — always receives the current value:
setCount(prev => prev + 1); // React calls this with the latest value from the hook slot
```

This matters when multiple state updates are batched or when the state update is triggered from inside a closure that was created before a re-render.

### React's Actual Implementation

React doesn't use a global array — it uses a *linked list* stored on the component's fiber node. Each hook cell is an object `{ memoizedState, queue, next }`. The `next` pointer links to the next hook's cell. `hookIndex` becomes a pointer traversal through this linked list. The constraint is the same: calls must be in the same order on every render.

---

## Common Interview Gotchas

1. **Forgetting to reset `hookIndex` before render**: If you don't reset, the index keeps incrementing across renders and every hook reads garbage.

2. **Closures and stale state**: The setter closes over `index`, not the value. This is intentional — `hooks[index]` is always read fresh from the array when the setter runs.

3. **Not handling the updater function**: Many candidates only handle `setState(newValue)` and forget `setState(prev => newValue)`. Always check `typeof valueOrUpdater === 'function'`.

4. **Infinite render loops**: If your render function unconditionally calls `setState`, you get infinite re-renders. Always trigger renders only from event handlers or effects.

---

## Self-Assessment

- [ ] I can implement a minimal `useState` from scratch using an array of slots
- [ ] I can explain mechanistically why hooks can't be called conditionally
- [ ] I know the difference between `setState(value)` and `setState(prev => value)`
- [ ] I can explain what the `hookIndex` reset does and why it's critical
- [ ] I can explain how React's actual implementation (fiber linked list) differs from the array mental model

---

## Interview Q&A

**Q: Why can't you call hooks inside conditionals or loops? `High`**

A: React tracks hook state by the order in which hooks are called. On every render, the Nth `useState` call reads from the Nth slot in the internal storage. If you put a `useState` inside an `if` block, that slot might be skipped on some renders — shifting all subsequent hooks to read from the wrong slot. React has a lint rule for this, and in development mode it will throw if it detects a different number of hooks between renders. The fundamental constraint is that call order must be stable across every render of a given component.

---

**Q: What is the difference between `setState(value)` and `setState(prev => value)`? `High`**

A: Both update state, but the updater form is safer when updates are asynchronous or batched. The direct form (`setState(count + 1)`) closes over `count` at the time the closure was created. If multiple updates are queued before the component re-renders, each one uses the same stale `count` — you get one increment instead of many. The updater form (`setState(prev => prev + 1)`) receives the most recent queued value as `prev`, so chained updates accumulate correctly. The rule of thumb: use the updater form when your new state depends on the previous state.

---

**Q: How does React actually store hook state internally? `Medium`**

A: React stores hook state in a linked list on the component's fiber node. Each hook corresponds to one node in the list: `{ memoizedState: T, queue: UpdateQueue, next: Hook | null }`. On each render, React walks this list in order, matching each hook call to its corresponding node. The order must be identical across renders — this is why the linked list is traversed sequentially rather than using a key-based lookup. The global array model is an accurate simplification of this mechanism.

---

**Q: How would you implement `useReducer` once you understand `useState`? `Medium`**

A: `useReducer` is essentially `useState` with a reducer function. Instead of storing the value directly, you store `{ state, dispatch }`. The `dispatch` function takes an action, passes it to the reducer along with the current state, and stores the result. In terms of the hooks array model: the slot stores the current state value, and `dispatch` closes over the slot index and the reducer function to compute and store the next state before triggering a re-render.

---

**Q: Why can't you call hooks from a regular JavaScript function? `Low`**

A: Hooks depend on the "current rendering context" — React needs to know which component's fiber is currently being rendered so it can read/write the correct hook slots. React sets a global "current fiber" pointer before calling a component's render function and clears it after. Calling a hook outside a component (or outside another hook) means this pointer is null, so React throws: "Invalid hook call." This is also why hooks can't be called in event handlers directly (though you can call setters from event handlers, since setters capture the slot index via closure and don't need the rendering context).
