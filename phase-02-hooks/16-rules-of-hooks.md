# Rules of Hooks

## What Is This?

React enforces two rules for using hooks:

1. **Only call hooks at the top level** — never inside conditionals, loops, or nested functions
2. **Only call hooks from React function components or custom hooks** — never from regular JavaScript functions, class components, or event listeners

These aren't stylistic guidelines. Violating them breaks React in ways that are hard to debug. Understanding *why* these rules exist reveals the implementation that makes hooks work.

## Why Do These Rules Exist?

Hooks don't have names. When you call `useState`, React doesn't know which piece of state you're referring to by name — it knows by **order**. React tracks hooks for a component as an ordered linked list:

```
Render 1:
  Hook 1: useState(0)     → { value: 0, setter: fn }
  Hook 2: useState('')    → { value: '', setter: fn }
  Hook 3: useEffect(fn)   → { effect: fn }
```

On every render, React expects hooks to be called in exactly the same order. It walks the linked list in sequence, matching each `useState`/`useEffect`/etc. call to the corresponding stored state:

```
Render 2 (must match render 1 exactly):
  Hook 1: useState(0)  → reads stored { value: 0 } ✅
  Hook 2: useState('')  → reads stored { value: '' } ✅
  Hook 3: useEffect(fn) → reads stored { effect: fn } ✅
```

If you call a hook inside a condition, the number of hooks called can change between renders. React loses track of which stored state belongs to which hook call:

```javascript
// ❌ Conditional hook call
function Component({ isLoggedIn }) {
  const [name, setName] = useState('');

  if (isLoggedIn) {
    useEffect(() => { /* ... */ }); // Hook 2 on some renders, absent on others
  }

  const [email, setEmail] = useState(''); // Hook 2 or 3 depending on isLoggedIn
}
```

```
Render 1 (isLoggedIn = true):
  Hook 1: useState('')   → { value: '' }
  Hook 2: useEffect(fn)  → { effect: fn }
  Hook 3: useState('')   → { value: '' }

Render 2 (isLoggedIn = false):
  Hook 1: useState('')   → reads Hook 1 state ✅
  Hook 2: useState('')   → reads Hook 2 state ← but this is stored as a useEffect! ❌
```

The email state variable now reads from the slot that was the effect in the previous render. Complete state corruption.

## The Mechanics

### React's Hook Storage

Internally, React stores hook state on the component's **fiber node** — a lightweight object that represents a component instance. Each fiber has a linked list called `memoizedState`. Each node in the list corresponds to one hook call, in order.

```
Fiber for <MyComponent>
  memoizedState: → [useState node] → [useEffect node] → [useState node] → null
```

React maintains a pointer to the "current hook" as it walks through a render. When you call `useState`, React reads from the current node and advances the pointer. The pointer always starts at the head of the list and walks forward in sequence. There's no lookup by name — only by position.

### What Happens on First Render vs Subsequent Renders

On first render: React is in "mount" mode. Every hook call creates a new node and appends it to the list.

On subsequent renders: React is in "update" mode. Every hook call reads from the existing node (in order) and may update it. The linked list is not rebuilt — it's walked.

If a conditional hook causes the list to be shorter on one render than another, React walks off the end of the list and either reads `undefined` or throws.

## The ESLint Plugin

`eslint-plugin-react-hooks` has two rules:

**`react-hooks/rules-of-hooks`**: Statically analyzes your code and warns if hooks are called conditionally, in loops, or outside of React functions. This catches violations before runtime.

**`react-hooks/exhaustive-deps`**: Ensures that all values referenced inside `useEffect`, `useMemo`, `useCallback` etc. are listed in their dependency arrays. Catches stale closure bugs.

Both rules should be errors, not warnings, in any React project. They are included in `eslint-config-react-app` (CRA), Vite's React plugin, and most standard React ESLint configurations.

## Common Violations

### Conditional Hook Calls

```javascript
// ❌ Conditional
if (user.isPremium) {
  const premiumData = usePremiumData(); // Violates Rule 1
}

// ✅ Move the condition inside the hook or inside the returned value
const premiumData = usePremiumData(); // Always call it
if (user.isPremium) {
  // Use premiumData here
}
```

If the hook itself should only do work conditionally, put the condition inside the hook:

```javascript
function usePremiumData(enabled) {
  useEffect(() => {
    if (!enabled) return; // Condition inside the hook — safe
    fetchPremiumData();
  }, [enabled]);
}
```

### Hooks in Loops

```javascript
// ❌ Number of hook calls changes with items.length
for (const item of items) {
  const data = useItemData(item.id); // Rule 1 violation
}

// ✅ Create a separate component for each item
function ItemList({ items }) {
  return items.map(item => <Item key={item.id} id={item.id} />);
}

function Item({ id }) {
  const data = useItemData(id); // Hook called once per component instance
  return <div>{data}</div>;
}
```

This is a common pattern: when you want to call a hook for each item in a list, extract an `Item` component. Each `Item` instance has its own fiber with its own hook state.

### Hooks Outside React Functions

```javascript
// ❌ Regular function
function computeSomething() {
  const [state, setState] = useState(0); // Rule 2 violation
}

// ❌ Class component
class MyClass extends React.Component {
  render() {
    const [state] = useState(0); // Rule 2 violation
  }
}

// ✅ Only in function components and custom hooks
function MyComponent() {
  const [state, setState] = useState(0); // ✅
}

function useCustomHook() {
  const [state, setState] = useState(0); // ✅ Custom hook
}
```

## Early Returns

Early returns are a special case of the conditional rule:

```javascript
// ❌ Hooks after an early return — violates Rule 1
function Component({ user }) {
  if (!user) return null; // Early return on first render

  const [name, setName] = useState(user.name); // Not called when user is null
}

// ✅ All hooks before any early returns
function Component({ user }) {
  const [name, setName] = useState(user?.name ?? ''); // Always called

  if (!user) return null; // Early return after hooks
}
```

All hook calls must happen unconditionally before any return statement.

## Custom Hooks Are Exempt From Rule 2 (But Not Rule 1)

Custom hooks (functions whose names start with `use`) are allowed to call hooks — that's their defining characteristic. Rule 2 allows hooks in custom hooks precisely because custom hooks are part of React's hook system. But Rule 1 still applies inside custom hooks:

```javascript
function useCustomHook(condition) {
  // ❌ Still violates Rule 1 — even inside a custom hook
  if (condition) {
    useState(0);
  }
}
```

## Why the `use` Prefix Convention

The `use` prefix is how the ESLint plugin identifies custom hooks. If your function starts with `use`, the linter applies Rule 1 to its body and Rule 2 to calls of it. If it doesn't start with `use`, the linter treats it as a regular function and won't flag hook calls inside it — and won't warn when it's called from a regular function.

The convention also communicates to readers that the function uses hooks and may cause re-renders. Don't name a hook `getUser` or `fetchData` — name it `useUser` or `useFetchData`.

## Interview Questions

**Q: Why can't hooks be called conditionally?**

Strong answer: React tracks hook state as an ordered linked list on the component's fiber node. Every hook call maps to a position in that list. On every render, hooks must be called in exactly the same order so that React can match each call to its stored state. If you call a hook conditionally, the number of entries in the list changes between renders, and React loses track of which stored state belongs to which hook. The result is that a `useState` call reads the stored value from the wrong slot — potentially reading another hook's state entirely. The ESLint `rules-of-hooks` plugin catches this statically before it causes runtime corruption.

The trap: Saying "it's a React rule" without explaining the linked list mechanism. Interviewers want to hear that you understand *why*, not just *what*.

---

**Q: How do you conditionally use a hook?**

Strong answer: You don't conditionally call the hook — you call it unconditionally and put the condition inside. For `useEffect`, add the condition inside the effect body. For `useState` or `useReducer`, initialize with a safe default and handle the null case in the rendering logic. If the hook is a custom hook you control, add an `enabled` parameter and let the hook conditionally do work internally. The common pattern for data-fetching hooks is: `const data = useFetch(url, { enabled: isReady })` — the hook is always called, but it only fetches when `enabled` is true.

The trap: "You can use a ternary." A ternary like `condition ? useState(a) : useState(b)` still calls `useState` conditionally — one branch has it, one doesn't. The count of hook calls must be identical on every render, not just the type.

---

**Q: What does the `use` prefix convention accomplish beyond naming style?**

Strong answer: Two things: (1) The ESLint `react-hooks` plugin uses the `use` prefix to identify custom hooks and apply the rules of hooks to their bodies and to call sites. Without the prefix, the linter treats the function as a regular function and won't warn about rule violations inside it or when it's called outside React. (2) It signals to readers that the function has hook semantics — it may cause re-renders, it must be called from React contexts, and its call order matters. A function named `getUser` that internally calls `useState` is a footgun: readers don't know it has these constraints. `useUser` makes the contract explicit.

The trap: "It's just naming convention." The ESLint enforcement makes it functionally significant, not just stylistic.

---

*Next: [Stale Closure Problem](17-stale-closure-problem.md) — The most common source of subtle bugs in hooks: why your effect or callback is seeing old state, and how to fix it.*
