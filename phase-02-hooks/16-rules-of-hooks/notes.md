# Rules of Hooks

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Call order stability | React tracks hooks by the order they are called | Any change in call order breaks state association |
| Top-level only | Hooks cannot be inside conditions, loops, or nested functions | Guards call order stability across renders |
| Function components and custom hooks only | Hooks cannot be called in class components or plain functions | Hooks depend on React's render context |
| ESLint plugin | `eslint-plugin-react-hooks` enforces both rules statically | Catches violations before runtime |

## What Is This?

The "Rules of Hooks" are two constraints that React enforces on how hooks are called. They're not style guidelines — they're fundamental requirements that, if violated, cause React to corrupt your component's state.

**Rule 1:** Only call hooks at the top level. Don't call hooks inside loops, conditions, or nested functions.

**Rule 2:** Only call hooks from React function components or custom hooks. Don't call hooks from regular JavaScript functions.

```javascript
// ✅ Correct — hooks at the top level
function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  useEffect(() => { /* ... */ }, []);
}

// ❌ Wrong — hook inside a condition
function Component({ show }) {
  if (show) {
    const [count, setCount] = useState(0); // VIOLATION
  }
}
```

> **Check yourself:** If you remove the `if` statement and always call the hook, but conditionally *use* the result, is that okay?

## Why Do These Rules Exist?

### The Linked List Mental Model

React doesn't track hooks by name. It tracks them by **call order** — a numbered list:

```javascript
function Component() {
  const [name, setName] = useState('');     // Hook slot #1
  const [age, setAge] = useState(0);        // Hook slot #2
  useEffect(() => { /* ... */ }, []);       // Hook slot #3
  const ref = useRef(null);                 // Hook slot #4
}
```

React builds an internal linked list of hook states during the first render:

```
Slot #1 → { state: '' }
Slot #2 → { state: 0 }
Slot #3 → { effect: fn, deps: [] }
Slot #4 → { ref: { current: null } }
```

On every subsequent render, React walks through this list in order, matching each `useState` / `useEffect` / `useRef` call to its slot. First hook call → slot #1, second → slot #2, etc.

### What Happens When the Order Changes

```javascript
function Component({ showName }) {
  // Render 1: showName = true
  if (showName) {
    const [name, setName] = useState('');   // Slot #1 ✅
  }
  const [age, setAge] = useState(0);        // Slot #2 ✅
  useEffect(() => { /* ... */ }, []);       // Slot #3 ✅

  // Render 2: showName = false
  // useState('') is SKIPPED — not called
  const [age, setAge] = useState(0);        // Slot #1 ← WRONG! Gets name's state ('')
  useEffect(() => { /* ... */ }, []);       // Slot #2 ← WRONG! Gets age's state (0)
  // Slot #3 is never read → leaked state
}
```

When the condition changes from `true` to `false`, one fewer hook is called. React doesn't know that — it just matches calls to slots by position. Now `age` reads from slot #1 (which stored `name`'s value), and the effect reads from slot #2 (which stored `age`'s value). Everything is corrupted.

> **Check yourself:** Imagine you have hooks A, B, C on the first render, but only B, C on the second render. What state does B get? What state does C get?

### Why "Top Level" Specifically

"Top level" means the hook call executes on *every* render, unconditionally. This guarantees the call count and order are identical across all renders:

```javascript
// ✅ Top level — always called, always in the same order
function Component({ showName }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  useEffect(() => { /* ... */ }, []);

  // Conditionally USE the value, not conditionally CALL the hook
  return (
    <div>
      {showName && <span>{name}</span>}
      <span>{age}</span>
    </div>
  );
}
```

## Common Violations and Fixes

### 1. Hook Inside a Condition

```javascript
// ❌ Violation: hook call count changes between renders
function Component({ isAdmin }) {
  if (isAdmin) {
    const [adminData, setAdminData] = useState(null);
  }
}

// ✅ Fix: always call the hook, conditionally use the value
function Component({ isAdmin }) {
  const [adminData, setAdminData] = useState(null);
  // Only use adminData when isAdmin is true
}
```

### 2. Hook Inside a Loop

```javascript
// ❌ Violation: hook call count depends on array length
function Component({ items }) {
  items.forEach(item => {
    const [selected, setSelected] = useState(false); // WRONG
  });
}

// ✅ Fix: use a single state for all items
function Component({ items }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
}
```

### 3. Hook After Early Return

```javascript
// ❌ Violation: hooks after return may not be called
function Component({ data }) {
  if (!data) return <Loading />;

  const [processed, setProcessed] = useState(null); // Skipped when data is null!
  useEffect(() => { /* ... */ }, [data]);            // Also skipped!
}

// ✅ Fix: all hooks before any return
function Component({ data }) {
  const [processed, setProcessed] = useState(null);
  useEffect(() => { /* ... */ }, [data]);

  if (!data) return <Loading />;
  return <Display data={processed} />;
}
```

### 4. Hook Inside a Nested Function

```javascript
// ❌ Violation: hook called from an event handler, not during render
function Component() {
  function handleClick() {
    const [value, setValue] = useState(0); // WRONG — not during render
  }
}

// ✅ Fix: hooks at the top level of the component
function Component() {
  const [value, setValue] = useState(0);

  function handleClick() {
    setValue(v => v + 1); // Use the setter, not a new hook
  }
}
```

### 5. Hook Inside forEach/map

```javascript
// ❌ Violation
function Component({ items }) {
  const refs = items.map(() => useRef(null)); // Dynamic number of hooks!
}

// ✅ Fix: use a single ref that holds an array
function Component({ items }) {
  const refsMap = useRef(new Map());
}
```

> **Check yourself:** You have a component that renders a list of items. Each item needs its own `ref`. How do you handle this without violating the rules?

## Custom Hooks Follow the Same Rules

Custom hooks are just functions that call hooks. The rules apply inside them too:

```javascript
// ❌ Violation inside a custom hook
function useConditionalEffect(condition, callback) {
  if (condition) {
    useEffect(callback); // WRONG — conditional hook call
  }
}

// ✅ Fix: call the hook unconditionally, make the effect conditional
function useConditionalEffect(condition, callback) {
  useEffect(() => {
    if (condition) {
      callback();
    }
  }, [condition, callback]); // Always called — condition checked inside
}
```

## The ESLint Plugin

`eslint-plugin-react-hooks` provides two rules that catch violations automatically:

```json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

- **`rules-of-hooks`**: Catches conditional/loop/nested hook calls
- **`exhaustive-deps`**: Catches missing dependencies in `useEffect`, `useMemo`, `useCallback`

Both are enabled by default in Create React App and most React starter templates.

### What the Plugin Catches

```javascript
// ❌ Plugin reports: "React Hook useState is called conditionally"
if (condition) {
  const [value, setValue] = useState(0);
}

// ❌ Plugin reports: "React Hook useEffect is called in a loop"
for (const item of items) {
  useEffect(() => { /* ... */ }, [item]);
}

// ❌ Plugin reports: "React Hook useState is called in a function that is not a component or custom hook"
function helperFunction() {
  const [value, setValue] = useState(0); // Not a component, not a hook
}
```

> **Check yourself:** How does the ESLint plugin know whether a function is a component or a custom hook? (Hint: it's about naming conventions.)

## Why Not "by Name"?

You might wonder: why doesn't React track hooks by name instead of call order? Several reasons:

1. **Multiple calls to the same hook**: You might call `useState` three times — React can't distinguish them by name.
2. **Performance**: Named hooks would require a registry lookup on every call. Call order is O(1) — just increment an index.
3. **Simplicity**: The linked-list approach is simple to implement and understand. Named hooks would need a completely different internal architecture.

The tradeoff: you get a simpler, faster system that requires two rules.

## Gotchas

### 1. The error message is cryptic

When you violate the rules, React may throw:
```
Rendered more hooks than during the previous render.
```
or:
```
Rendered fewer hooks than during the previous render.
```

This means the hook call count changed — usually because of a conditional hook call.

### 2. Class components can't use hooks

```javascript
// ❌ Hooks don't work in class components
class MyComponent extends React.Component {
  render() {
    const [count, setCount] = useState(0); // CRASH
  }
}
```

### 3. Regular functions can't use hooks

```javascript
// ❌ Not a component, not a custom hook
function calculateTotal(items) {
  const cached = useMemo(() => items.reduce(...), [items]); // WRONG
  return cached;
}

// ✅ Make it a custom hook (prefix with "use")
function useCalculateTotal(items) {
  return useMemo(() => items.reduce(...), [items]);
}
```

The `use` prefix is how React (and the ESLint plugin) identifies custom hooks.

### 4. Dynamic hook counts can't be fixed with arrays

```javascript
// ❌ This clever trick still violates the rules
function Component({ count }) {
  const states = [];
  for (let i = 0; i < count; i++) {
    states.push(useState(0)); // Dynamic number of hooks!
  }
}
```

Even if `count` rarely changes, the rules require *guaranteed* identical call order on every render.

## Interview Questions

**Q (High): Why must hooks be called at the top level?**

Answer: Because React tracks hook state by call order, not by name. On every render, React matches each hook call to an internal state slot by position (first call → slot #1, second → slot #2, etc.). If hooks are called inside conditions, loops, or nested functions, the call count or order can change between renders, causing React to match hooks to the wrong state slots.

The consequence: state corruption. A `useState` call might read state that belongs to a `useEffect`, or vice versa. The component behaves unpredictably.

The trap: Saying it's a style rule or convention. It's a fundamental requirement of React's hook implementation. Violating it corrupts state.

---

**Q (High): What does React use internally to track hooks?**

Answer: A linked list of state entries, indexed by call position. Each hook call on the first render creates a new entry. On subsequent renders, React walks the list in order, matching each hook call to its entry. The first `useState` call reads the first entry, the second reads the second, etc.

This is why call order must be identical on every render — React has no other way to know which state belongs to which hook.

The trap: Thinking React uses hook names, variable names, or some form of registration. It's purely positional.

---

**Q (High): Show an example of a rules-of-hooks violation and fix it.**

Answer:

```javascript
// ❌ Violation: hook after early return
function UserProfile({ userId }) {
  if (!userId) return <p>Select a user</p>;

  const [user, setUser] = useState(null); // Skipped when userId is null!
  useEffect(() => { fetchUser(userId); }, [userId]);

  return <div>{user?.name}</div>;
}

// ✅ Fix: all hooks before any return
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (userId) fetchUser(userId);
  }, [userId]);

  if (!userId) return <p>Select a user</p>;
  return <div>{user?.name}</div>;
}
```

The trap: Thinking early returns are safe as long as "no state changes." The issue is that hook *calls* are skipped, not just hook *usage*.

---

**Q (Medium): Can you call hooks inside a custom hook?**

Answer: Yes. Custom hooks are the standard way to extract reusable hook logic. They follow the same rules: hooks inside them must be at the top level and called unconditionally. The `use` prefix is required so React and the ESLint plugin can identify them as hooks.

```javascript
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}
```

The trap: Thinking custom hooks are exempt from the rules.

---

**Q (Medium): How does the ESLint plugin know which functions are components vs regular functions?**

Answer: By naming convention. Functions that start with an uppercase letter are treated as components. Functions that start with `use` (lowercase) are treated as custom hooks. Regular functions with lowercase names that aren't prefixed with `use` are flagged if they call hooks.

The trap: Naming a custom hook without the `use` prefix (like `getAuthState`) and wondering why hooks don't work inside it.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can state both rules of hooks from memory without prompting
- [ ] Can explain why conditional hook calls break React's internals (linked list model)
- [ ] Can write an example of an invalid hook call and fix it
- [ ] Can explain why the rules also apply inside custom hooks
- [ ] Can name the ESLint plugin and its two rules
- [ ] Can explain why React uses call order instead of names to track hooks

---

*Next: [Stale closure problem](../17-stale-closure-problem/notes.md) — a common bug pattern once hook rules are understood.*
