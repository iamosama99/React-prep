# Conditional Rendering

## What Is This?

Conditional rendering is how you control what a component shows based on state, props, or any other runtime value. In React, you don't have a special directive like `v-if` or `ng-if` — you use plain JavaScript to decide what JSX to return. The patterns are idiomatic JavaScript expressions, not framework-specific syntax.

The result: React's conditional rendering is both simpler and more powerful than template directives. You have the full expressiveness of JavaScript — early returns, ternaries, switch statements, short-circuit evaluation, IIFEs — and you choose what fits the situation.

---

## Why Conditional Rendering Works the Way It Does

Because JSX compiles to `React.createElement(...)` function calls, and function calls take expressions as arguments. You can't put `if` statements inside a function call. So all the conditional patterns you use inside JSX must be *expressions* — code that evaluates to a value.

This is the single rule behind all conditional rendering patterns. Every technique described below is just a different expression that produces either a React element (render something) or a falsy non-renderable value (render nothing).

React renders `false`, `null`, `undefined` as nothing. Everything else — elements, strings, numbers — renders. That's the foundation.

---

## The Patterns — All of Them

### 1. Early return — cleanest for whole-component conditions

If the entire component should show nothing (or something completely different) based on a condition, return early from the function:

```jsx
function UserProfile({ user }) {
  if (!user) return null;
  if (user.banned) return <BannedMessage />;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}
```

This is the cleanest pattern when a condition determines the entire output. The JSX at the bottom stays uncluttered because all the edge cases are handled above it. Think of it like guard clauses.

### 2. Ternary — for inline if/else

When you need either A or B inside JSX:

```jsx
function StatusBadge({ isOnline }) {
  return (
    <span className={isOnline ? 'badge-green' : 'badge-grey'}>
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}
```

Ternaries are expressions, so they work anywhere inside JSX. They're best when both branches are short. Deeply nested ternaries become unreadable fast — extract to a variable or function at that point.

```jsx
// When the branches get complex, extract before rendering
function renderStatus(status) {
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <ErrorMessage />;
  return <Content />;
}

function Page({ status }) {
  return <div>{renderStatus(status)}</div>;
}
```

### 3. Short-circuit `&&` — for "show if true, show nothing if false"

When you want to render something or nothing (no else branch):

```jsx
function Inbox({ messages }) {
  return (
    <div>
      <h1>Inbox</h1>
      {messages.length > 0 && <MessageList messages={messages} />}
    </div>
  );
}
```

`condition && <Element />` evaluates to `<Element />` if condition is truthy, or the condition's value if falsy. When the condition is `false`, `null`, or `undefined`, React renders nothing.

**The 0 gotcha — this is important.** If the condition evaluates to `0` (a number), React renders `0`:

```jsx
// Bug: renders "0" when messages is empty
{messages.length && <MessageList messages={messages} />}
// messages.length is 0 → 0 && ... → 0 → React renders the number zero

// Correct: force a boolean
{messages.length > 0 && <MessageList messages={messages} />}
{!!messages.length && <MessageList messages={messages} />}
```

`0` is the only falsy value that React renders visibly. `false`, `null`, `undefined` are all invisible. Always make your `&&` conditions a boolean when the left side could be a number.

### 4. `||` for fallbacks

Less common but useful — render the left side if truthy, otherwise the right:

```jsx
function UserName({ name }) {
  return <span>{name || 'Anonymous'}</span>;
}
```

Replaced in most cases by nullish coalescing (`??`), which only falls back on `null`/`undefined` instead of all falsy values:

```jsx
function UserName({ name }) {
  return <span>{name ?? 'Anonymous'}</span>;
  // '' (empty string) with || renders 'Anonymous'
  // '' (empty string) with ?? renders '' — preserves intentional empty strings
}
```

Use `??` when `''` and `0` are valid values you want to preserve.

### 5. Variables — for multi-branch logic that you want to keep outside JSX

When the condition is complex, assign the element to a variable before the return:

```jsx
function Alert({ type, message }) {
  let icon;
  if (type === 'success') icon = <CheckIcon />;
  else if (type === 'warning') icon = <WarningIcon />;
  else if (type === 'error') icon = <ErrorIcon />;
  else icon = <InfoIcon />;

  return (
    <div className={`alert alert-${type}`}>
      {icon}
      <p>{message}</p>
    </div>
  );
}
```

This keeps the JSX clean. The logic is still in the same function, just above the return. Useful when the branches produce meaningfully different subtrees.

### 6. Switch + lookup objects — for multiple discrete states

When you're switching on a string enum:

```jsx
const VIEWS = {
  loading: <Spinner />,
  error: <ErrorMessage />,
  empty: <EmptyState />,
};

function DataView({ status, data }) {
  if (VIEWS[status]) return VIEWS[status];
  return <DataGrid data={data} />;
}
```

Or a switch:

```jsx
function renderView(status) {
  switch (status) {
    case 'loading': return <Spinner />;
    case 'error': return <ErrorMessage />;
    case 'empty': return <EmptyState />;
    default: return null;
  }
}
```

Lookup objects are slightly cleaner for pure display logic. Switch is more appropriate when each branch has complex logic, not just a return value.

### 7. Immediately Invoked Function Expression (IIFE) — for logic inside JSX

You can call a function inline in JSX. Rarely needed now that you can extract to variables or helper functions, but occasionally useful:

```jsx
function ComplexList({ items, filterType }) {
  return (
    <ul>
      {(() => {
        const filtered = items.filter(item => item.type === filterType);
        if (filtered.length === 0) return <li>No results</li>;
        return filtered.map(item => <li key={item.id}>{item.name}</li>);
      })()}
    </ul>
  );
}
```

The `(() => { ... })()` is a function defined and immediately called. The return value of the function is what gets rendered. This is the JSX equivalent of "I need statements inside an expression context." Usually, extracting to a separate function is cleaner.

---

## Showing and Hiding vs Mounting and Unmounting

There's an important distinction between two ways of "hiding" a component:

**Conditional rendering (unmount/mount):**
```jsx
{isVisible && <Modal />}
```
When `isVisible` becomes `false`, `Modal` is removed from the tree entirely. Its state is destroyed. When `isVisible` becomes `true` again, `Modal` is mounted fresh — new instance, initial state.

**CSS display (keep mounted):**
```jsx
<Modal style={{ display: isVisible ? 'block' : 'none' }} />
// or
<Modal className={isVisible ? '' : 'hidden'} />
```
`Modal` stays in the tree. React still renders it. Its state is preserved. Only the CSS hides it visually.

Which one you want depends on the use case:

- Use conditional rendering when you want to reset state on close (a form that should clear when the modal closes), when the component is expensive to render and you want to avoid paying the cost when it's hidden, or when the component runs side effects (`useEffect`) you don't want running while hidden.

- Use CSS hiding when you need to preserve state across open/close (a half-filled form), when mounting/unmounting is visually jarring, or when the component has expensive setup (like a canvas or WebGL context) you don't want to pay repeatedly.

---

## Gotchas

**`0` renders, `false` doesn't.** Already covered above, but worth repeating: `{count && <Component />}` renders `0` when count is 0. Always coerce numbers to booleans in `&&` conditions.

**`null` and `undefined` are safe to render, but they don't exist in the React tree.** Returning `null` from a component, or having a child evaluate to `null`, renders nothing. The component still exists — its lifecycle runs, effects run — it just produces no DOM output. This is different from not rendering the component at all.

**Conditional rendering based on changing conditions can cause unnecessary remounting.** If a condition changes frequently and you're conditionally rendering components that have heavy setup (subscriptions, animations, network requests), each toggle destroys and recreates everything. Either use CSS hiding, or design the component to be lightweight to mount.

**Avoid conditions that cause the element type to change.** React uses the element type (string for DOM, function reference for components) to decide whether to unmount/remount or update. If the same position in the tree switches between `<TypeA>` and `<TypeB>`, React unmounts TypeA and mounts TypeB fresh. This is expected behavior, but it means any shared state between them doesn't transfer. This is often what you want — but be aware of it.

**Logic in render should be pure.** Conditional rendering logic runs during the render phase. It should not have side effects — no `console.log` with analytics calls, no direct DOM mutations, no data fetching. Pure computation only. Side effects belong in event handlers or `useEffect`.

---

## Interview Questions

**Q: Why can't you use an `if` statement directly inside JSX?**

Answer: Because JSX curly braces can only contain expressions — code that evaluates to a value. `if` is a statement; it controls flow but doesn't produce a value. Under the hood, JSX compiles to `React.createElement(type, props, children)` function calls, and the children slot is a function argument — it must be an expression. Alternatives that *are* expressions: ternary (`condition ? a : b`), short-circuit (`condition && element`), and IIFE (`(() => { if... })()`) are all expressions and work inside JSX. The `if` itself can still be used — just move it *outside* the JSX, in the function body above the return, and assign the result to a variable.

The trap: Thinking `if` is banned from function components entirely. It's only banned inside the JSX markup itself. Outside of the return statement, `if` is perfectly valid.

---

**Q: `{items.length && <List items={items} />}` renders an unintended "0" when items is empty. Why, and how do you fix it?**

Answer: Because `0 && anything` short-circuits and returns `0` — the number, not `false`. React renders numbers (including `0`) as text nodes in the DOM. `false`, `null`, and `undefined` render nothing, but `0` renders the character zero. The fix is to coerce the condition to a boolean: `{items.length > 0 && <List />}` or `{!!items.length && <List />}` or `{Boolean(items.length) && <List />}`. The deeper lesson: `&&` in JSX is a conditional expression, not a conditional statement — it returns the actual value of the left operand when falsy. Use `> 0` or `!!` to ensure you're always branching on a boolean.

The trap: Thinking all falsy values in JSX render nothing. Only `false`, `null`, `undefined`, and empty string (`''`) render nothing. The number `0` renders visibly.

---

**Q: What is the difference between conditional rendering and using CSS to hide an element?**

Answer: Conditional rendering (`{condition && <Component />}`) removes the component from the React tree when the condition is false. The component unmounts — its state is destroyed, effects run their cleanup, and the DOM nodes are removed. When the condition becomes true again, the component remounts fresh. CSS hiding (`display: none`) keeps the component in the tree — it continues to render, its state is preserved, and effects continue running, but it's visually invisible. The choice depends on use case: conditional rendering is appropriate when you want to reset state on close, avoid running effects while hidden, or skip rendering cost for expensive components. CSS hiding is appropriate when you need to preserve state across visibility toggles, or when mounting/unmounting is expensive enough to avoid.

The trap: Conflating "hidden" with "unmounted." They have fundamentally different implications for state and lifecycle.

---

**Q: What is a guard clause pattern in React, and why is it useful?**

Answer: A guard clause is an early return from the component function before the main render when a precondition isn't met. Instead of wrapping the entire JSX in a conditional, you handle the edge case at the top and return early: `if (!user) return null;`, `if (isLoading) return <Spinner />;`. The main return at the bottom is then clean and focused on the happy path. This mirrors the guard clause pattern in general programming — fail fast, reduce nesting, keep the primary logic readable. It's especially valuable when multiple conditions can each independently change the entire output.

The trap: Writing one deeply nested ternary or a massive `&&` chain instead of early returns. Interviewers appreciate seeing guard clauses because they signal familiarity with readable conditional logic.

---

**Q: How would you render different UI based on a string status value like `'loading'`, `'error'`, `'success'`?**

Answer: Multiple patterns work, with different tradeoffs. An if/else chain above the return is the simplest. A switch statement works well when each case has logic beyond just returning a JSX element. A lookup object — `const views = { loading: <Spinner />, error: <Error />, success: <Data /> }` — is concise when each case just returns a component with no extra logic. I'd reach for the lookup object for pure display mapping, a switch for cases that need processing, and an if/else chain when conditions are complex or overlapping. The goal is clarity — whichever makes the intent most obvious to a reader.

The trap: Hard-coding a solution without acknowledging tradeoffs. The question is testing whether you know multiple approaches and can reason about when to use each.

---

*Next: Lists & Keys — conditional rendering decides *whether* to render something. Lists and keys decide how to render *collections* of things — the reconciliation implications of mapping data to elements, and why the key prop is architecturally significant, not just a warning to suppress.*
