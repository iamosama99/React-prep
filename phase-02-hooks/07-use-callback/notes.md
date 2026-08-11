# useCallback

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Stable function reference | Returns the same function object when deps unchanged | Prevents memoized children from re-rendering unnecessarily |
| `useMemo(() => fn, deps)` equivalence | `useCallback` is syntactic sugar over `useMemo` | Conceptually the same; `useCallback` is more readable for functions |
| Deps must be complete | Every external value referenced by the callback | Missing deps = stale closure inside the callback |
| Not a performance panacea | Adds overhead if child isn't memoized | Only useful when stable identity actually prevents renders |

## What Is This?

`useCallback` is a hook that returns a memoized version of a callback function. It gives you back the *same* function object across renders, as long as the dependency values haven't changed.

```javascript
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []); // No deps that change → same function forever
```

Every time React re-renders your component, all functions defined inside it are recreated. `useCallback` prevents this recreation when the dependencies haven't changed.

> **Check yourself:** If you define a function inside a component *without* `useCallback`, is it the same function object on the next render? How would you verify this?

## Why Does It Exist?

In React, functions are recreated on every render. This is usually fine — JavaScript creates functions quickly. But it becomes a problem when:

1. **Memoized children break**: A child wrapped in `React.memo` compares props by reference. If the parent passes a new function reference every render, `React.memo` sees "different props" and re-renders the child anyway.

2. **Effect dependencies break**: If a function is used as a dependency in `useEffect`, a new function reference on every render causes the effect to re-run unnecessarily.

3. **Other hooks break**: Hooks like `useMemo` that depend on a function reference will recalculate if the function changes.

`useCallback` exists to give you a stable function identity when that identity matters for downstream optimizations.

## How It Works

### The Mechanism

`useCallback` takes a function and a dependency array:

```javascript
const memoizedFn = useCallback(fn, deps);
```

On mount, React stores the function. On subsequent renders, React compares dependencies using `Object.is()`. If nothing changed, React returns the *stored* function (same reference). If any dependency changed, React stores and returns the *new* function.

### The useMemo Equivalence

`useCallback` is literally syntactic sugar for `useMemo`:

```javascript
// These produce the exact same result
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

const handleClick = useMemo(() => {
  return () => {
    doSomething(a, b);
  };
}, [a, b]);
```

The difference: `useCallback` memoizes the function itself. `useMemo` memoizes the *return value* of the factory. When the factory returns a function, they're equivalent.

> **Check yourself:** What does `useMemo(() => fn, deps)` return — the function `fn`, or the result of calling `fn()`?

### When Dependencies Change

```javascript
function SearchForm({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback(() => {
    onSearch(query);
  }, [query, onSearch]); // New function when query or onSearch changes

  return <MemoizedButton onClick={handleSubmit} />;
}
```

When `query` changes, `handleSubmit` gets a new reference because the callback needs to close over the new `query` value. When `query` stays the same, `MemoizedButton` receives the same function reference and skips re-rendering.

## The Full Chain: When useCallback Actually Helps

`useCallback` only helps when there's a complete memoization chain. All three conditions must be true:

1. The callback is wrapped in `useCallback`
2. The child receiving the callback is wrapped in `React.memo`
3. The callback's dependencies haven't changed

```javascript
// ✅ Full chain — useCallback actually prevents child re-render
const MemoizedChild = memo(function Child({ onClick }) {
  return <button onClick={onClick}>Click</button>;
});

function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // Stable reference

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Counter: {count}</button>
      <MemoizedChild onClick={handleClick} /> {/* Doesn't re-render */}
    </>
  );
}
```

```javascript
// ❌ Broken chain — useCallback is wasted
function PlainChild({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}

function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Counter: {count}</button>
      <PlainChild onClick={handleClick} /> {/* Re-renders anyway! */}
    </>
  );
}
```

> **Check yourself:** In the broken chain above, what would you need to change about `PlainChild` to make `useCallback` useful?

## Common Use Cases

### 1. Stable Callbacks for Memoized Children

```javascript
const MemoizedList = memo(function ItemList({ items, onItemClick }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

function App() {
  const [items, setItems] = useState(initialItems);

  const handleItemClick = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []); // Stable: uses functional updater, no external deps

  return <MemoizedList items={items} onItemClick={handleItemClick} />;
}
```

### 2. Stable Dependencies for useEffect

```javascript
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);

  const fetchMessages = useCallback(() => {
    return fetch(`/api/rooms/${roomId}/messages`)
      .then(res => res.json());
  }, [roomId]);

  useEffect(() => {
    fetchMessages().then(data => setMessages(data));
  }, [fetchMessages]); // Only re-runs when roomId changes

  return <MessageList messages={messages} />;
}
```

Without `useCallback`, `fetchMessages` would be a new function every render, causing the effect to re-run on every render.

### 3. Debounced Event Handlers

```javascript
function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');

  const debouncedSearch = useCallback(
    debounce((value) => {
      onSearch(value);
    }, 300),
    [onSearch]
  );

  const handleChange = (e) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return <input value={query} onChange={handleChange} />;
}
```

### 4. Stable Callbacks in Context Providers

```javascript
function TodoProvider({ children }) {
  const [todos, setTodos] = useState([]);

  const addTodo = useCallback((text) => {
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
  }, []);

  const toggleTodo = useCallback((id) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  }, []);

  const value = useMemo(() => ({
    todos, addTodo, toggleTodo
  }), [todos, addTodo, toggleTodo]);

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}
```

Notice how `useCallback` + `useMemo` work together: callbacks are stabilized individually, then the context value object is stabilized as a whole.

## useCallback vs Inline Functions

| Aspect | Inline function | useCallback |
|--------|----------------|-------------|
| **New reference each render** | ✅ Yes | Only when deps change |
| **Overhead** | None | Dependency comparison + storage |
| **When to use** | Child is not memoized | Child IS memoized and receives this as a prop |
| **Readability** | Simpler | More verbose |
| **Default choice** | ✅ Start here | Add only when needed |

> **Check yourself:** A junior developer wraps every event handler in `useCallback`. What would you tell them?

## Gotchas

### 1. useCallback without React.memo is pointless

```javascript
// ❌ Wasted: Child isn't memoized
const handleClick = useCallback(() => doSomething(), []);
return <Child onClick={handleClick} />; // Child re-renders anyway
```

If the child isn't wrapped in `React.memo`, React re-renders it regardless of prop identity. The `useCallback` adds overhead with no benefit.

### 2. Stale closures from missing dependencies

```javascript
const [count, setCount] = useState(0);

// ❌ Missing `count` — callback always sees count = 0
const logCount = useCallback(() => {
  console.log(count);
}, []);

// ✅ Include count — but now the reference changes on every count update
const logCount = useCallback(() => {
  console.log(count);
}, [count]);
```

Every value referenced inside the callback must appear in the dependency array. Otherwise, the callback closes over a stale value.

### 3. Dependencies that change on every render defeat the purpose

```javascript
// ❌ `options` is a new object every render → deps always change
const options = { sort: 'asc' };
const fetchData = useCallback(() => {
  return loadData(options);
}, [options]); // New reference every render!

// ✅ Memoize the dependency too
const options = useMemo(() => ({ sort: 'asc' }), []);
const fetchData = useCallback(() => {
  return loadData(options);
}, [options]);
```

### 4. Functional updaters reduce dependency needs

```javascript
// ❌ Needs `count` as dependency — reference changes on every increment
const increment = useCallback(() => {
  setCount(count + 1);
}, [count]);

// ✅ Functional updater — no dependency on `count`
const increment = useCallback(() => {
  setCount(c => c + 1);
}, []); // Empty deps → stable forever
```

Using the functional updater form of `setState` lets you remove state values from the dependency array, making the callback more stable.

### 5. Over-memoization harms readability

```javascript
// ❌ Over-memoized: event handler only used by an unmemoized <button>
const handleClick = useCallback(() => {
  setOpen(true);
}, []);

return <button onClick={handleClick}>Open</button>;

// ✅ Just use inline — simpler, equally fast
return <button onClick={() => setOpen(true)}>Open</button>;
```

## Interview Questions

**Q (High): When should you use `useCallback`?**

Answer: Use it when you need a stable function reference — typically when passing callbacks to children wrapped in `React.memo`, or when the function is used as a dependency in `useEffect` or other hooks. It's not needed for every event handler.

The key insight: `useCallback` doesn't make your function "faster." It preserves identity so that downstream memoization works. Without `React.memo` on the child (or without the function being a hook dependency), `useCallback` adds overhead with no benefit.

The trap: Saying `useCallback` is needed for every event handler or that it prevents re-renders by itself. It only preserves identity — something else has to use that identity for optimization.

---

**Q (High): Why does `useCallback` sometimes not help performance?**

Answer: Because it adds its own overhead — React must store the function, store the dependency array, and compare dependencies on every render. If the child isn't memoized with `React.memo`, or if the dependencies change frequently (making the callback reference change anyway), `useCallback` is a net loss.

The break-even point depends on the child's render cost. If the child is cheap to render, the cost of memoization may exceed the cost of just re-rendering. Profile first.

The trap: Assuming memoizing every function makes the tree faster. The React team recommends defaulting to no memoization.

---

**Q (High): How is `useCallback` related to `useMemo`?**

Answer: `useCallback(fn, deps)` is exactly equivalent to `useMemo(() => fn, deps)`. Both return a memoized value keyed by dependencies. The difference is readability: `useCallback` signals "I'm memoizing a function," while `useMemo` signals "I'm memoizing a computed value."

The trap: Thinking they serve fundamentally different purposes. They're the same mechanism with different ergonomics.

---

**Q (High): You have a component with `useCallback`, but the child still re-renders. What's wrong?**

Answer: Most likely one of:
1. The child is not wrapped in `React.memo`.
2. Another prop passed to the child changes (breaking memoization).
3. The `useCallback` dependencies include a value that changes every render (inline object, unstable reference).
4. The child consumes context that changes.

Debugging: Check all four. Use React DevTools Profiler to see which props triggered the re-render.

The trap: Assuming `useCallback` alone prevents re-renders. It's just one link in a chain.

---

**Q (Medium): How do functional updaters help with `useCallback` stability?**

Answer: When a callback uses `setCount(count + 1)`, it must include `count` in its dependency array, meaning the function reference changes on every count update. Using the functional updater `setCount(c => c + 1)` removes `count` from the closure, so the dependency array can be empty and the function reference stays stable forever.

```javascript
// Deps include count → reference changes on every increment
const inc = useCallback(() => setCount(count + 1), [count]);

// No deps → reference never changes
const inc = useCallback(() => setCount(c => c + 1), []);
```

The trap: Not knowing about functional updaters and always including state in dependencies.

---

**Q (Medium): Should you wrap every event handler in `useCallback`?**

Answer: No. Most event handlers are passed directly to native elements (`<button>`, `<input>`), which aren't memoized and re-render anyway. `useCallback` only helps when the handler is passed to a `React.memo`-wrapped component or used as a dependency in another hook.

The React team's guidance: start without memoization, measure, and add `useCallback` only where profiling shows a real benefit.

The trap: Premature optimization. Wrapping every handler adds boilerplate and complexity without measurable benefit.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why `useCallback` is essentially `useMemo(() => fn, deps)` and what that means practically
- [ ] Can describe the exact condition where `useCallback` actually prevents a child re-render (child must also be `React.memo`-wrapped)
- [ ] Can identify when `useCallback` adds overhead without benefit
- [ ] Can explain the stale-closure risk when dependencies are omitted from the array
- [ ] Can demonstrate how functional updaters reduce the need for dependencies
- [ ] Can name the three conditions required for `useCallback` to prevent a child re-render

---

*Next: [useContext](../08-use-context/notes.md) — the provider-consumer pattern is the next step after stable callback and value identity.*
