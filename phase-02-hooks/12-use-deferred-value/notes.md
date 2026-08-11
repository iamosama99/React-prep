# useDeferredValue

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useDeferredValue | Returns a lower-priority copy of a value | Keeps fast UI responsive while expensive renders lag behind |
| Deferred rendering | React renders with the old value first, updates when idle | Prevents expensive recalculations from blocking input |
| vs useTransition | useDeferredValue wraps a value; useTransition wraps a state update | Choose based on whether you own the state update |
| Not a debounce | Updates are not delayed by time, only by render priority | Misunderstanding this leads to wrong tool choice |

## What Is This?

`useDeferredValue` is a React hook that returns a "deferred" copy of a value. The deferred copy lags behind the original during urgent updates — React continues showing the old value while rendering the new one in the background.

```javascript
const deferredQuery = useDeferredValue(query);
```

When `query` changes, `deferredQuery` doesn't update immediately. React first processes the urgent update (the input change), then processes the deferred value in a lower-priority render. This keeps the input responsive while expensive work (like filtering a huge list) catches up.

> **Check yourself:** After `query` changes, does `deferredQuery` still hold the old value? For how long?

## Why Does It Exist?

The problem: a rapidly changing value drives an expensive render. Every keystroke in a search box triggers a re-render of a 50,000-item list. The browser thread is blocked rendering the list, so the input feels sluggish.

```javascript
// ❌ Every keystroke immediately renders the full list
function Search() {
  const [query, setQuery] = useState('');
  const filtered = expensiveFilter(items, query); // Blocks on every render

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <HeavyList items={filtered} />
    </>
  );
}
```

`useDeferredValue` lets you tell React: "This value is fine to be stale for a moment while you finish more urgent work."

```javascript
// ✅ Input stays responsive — list uses a lagging value
function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => expensiveFilter(items, deferredQuery),
    [items, deferredQuery]
  );

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <HeavyList items={filtered} />
    </>
  );
}
```

## How It Works

### The Mechanism

When the original value changes:

1. React renders the component with the **old** deferred value (immediate, no delay).
2. React schedules a **background render** with the new deferred value.
3. If another urgent update arrives (user types again), React may **abandon** the background render and restart with the newest value.
4. When the background render completes, `deferredQuery` catches up to `query`.

This means:
- The input (`query`) is always up to date — no lag.
- The list (`deferredQuery`) may be a few renders behind — intentionally stale.

### Timeline Example

```
User types "a":
  query = "a", deferredQuery = "" (stale) → input shows "a", list shows all items
  background render: deferredQuery = "a" → list updates

User types "ab" before background completes:
  query = "ab", deferredQuery = "" (still stale) → background render with "a" abandoned
  background render: deferredQuery = "ab" → list updates

User types "abc":
  query = "abc", deferredQuery = "ab" (catching up)
  background render: deferredQuery = "abc" → list updates
```

> **Check yourself:** During the background render, what value does `deferredQuery` hold? What does `query` hold?

### Combining with useMemo

`useDeferredValue` works best when combined with `useMemo`. The deferred value prevents re-running the expensive computation until React has time:

```javascript
const deferredQuery = useDeferredValue(query);

// Only recomputes when deferredQuery actually changes
const filtered = useMemo(
  () => items.filter(item => item.name.includes(deferredQuery)),
  [items, deferredQuery]
);
```

Without `useMemo`, the filter would still run on every render (even with the old deferred value), partially defeating the purpose.

### Detecting Stale State

You can detect when the deferred value is stale by comparing it to the original:

```javascript
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;

return (
  <div style={{ opacity: isStale ? 0.6 : 1, transition: 'opacity 0.2s' }}>
    <ResultsList items={filtered} />
  </div>
);
```

This is the equivalent of `isPending` in `useTransition` — but you compute it yourself.

> **Check yourself:** `useTransition` gives you `isPending` directly. With `useDeferredValue`, how do you determine if the value is still catching up?

## useDeferredValue vs useTransition

| Aspect | useDeferredValue | useTransition |
|--------|-----------------|--------------|
| **Wraps** | A value | A state update |
| **Returns** | The deferred value | `[isPending, startTransition]` |
| **When to use** | You receive a value (e.g., from props) | You own the state setter |
| **Pending indicator** | Compare `value !== deferredValue` | `isPending` boolean |
| **Mental model** | "Give me a lagging copy" | "Mark this update as non-urgent" |

**Decision tree:**
- Can you wrap the `setState` call? → Use `useTransition`
- The value comes from props or you can't modify the setter? → Use `useDeferredValue`

```javascript
// You own the setter → useTransition
const [isPending, startTransition] = useTransition();
function handleChange(e) {
  setQuery(e.target.value); // urgent
  startTransition(() => setFilteredResults(filter(e.target.value))); // non-urgent
}

// You receive the value → useDeferredValue
function FilteredList({ searchTerm }) {
  const deferredTerm = useDeferredValue(searchTerm);
  const results = useMemo(() => filter(items, deferredTerm), [items, deferredTerm]);
  return <List items={results} />;
}
```

## useDeferredValue vs Debounce vs Throttle

| Aspect | useDeferredValue | Debounce | Throttle |
|--------|-----------------|----------|----------|
| **Based on** | Render priority | Time delay | Time interval |
| **Update happens** | When React is idle | After user stops (e.g., 300ms) | At regular intervals (e.g., every 100ms) |
| **Intermediate results** | Yes (shows stale, then updates) | No (waits for silence) | Yes (at throttle interval) |
| **Device-adaptive** | Yes (faster device = faster updates) | No (fixed delay) | No (fixed interval) |
| **Best for** | Expensive renders | API calls / network requests | Scroll/resize handlers |

A key advantage of `useDeferredValue`: it adapts to device speed. On a fast computer, the deferred value catches up almost instantly. On a slow device, it lags more — but the input stays responsive either way.

> **Check yourself:** Why is debounce better for API calls but `useDeferredValue` better for expensive renders?

## Common Use Cases

### 1. Search with Heavy Filtering

```javascript
function ProductSearch({ products }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const filtered = useMemo(
    () => products.filter(p => p.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [products, deferredQuery]
  );

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <p>{filtered.length} results</p>
        <ProductGrid items={filtered} />
      </div>
    </div>
  );
}
```

### 2. Child Component Can't Control Parent State

```javascript
// Parent sets the value — child can't modify the setter
function Parent() {
  const [color, setColor] = useState('#000000');
  return (
    <>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} />
      <HeavyPreview color={color} />
    </>
  );
}

// Child uses useDeferredValue because it doesn't own the setter
function HeavyPreview({ color }) {
  const deferredColor = useDeferredValue(color);

  const visualization = useMemo(
    () => generateComplexVisualization(deferredColor),
    [deferredColor]
  );

  return <canvas>{visualization}</canvas>;
}
```

### 3. Autocomplete Suggestions

```javascript
function Autocomplete({ suggestions }) {
  const [input, setInput] = useState('');
  const deferredInput = useDeferredValue(input);

  const matches = useMemo(
    () => suggestions.filter(s => s.startsWith(deferredInput)).slice(0, 10),
    [suggestions, deferredInput]
  );

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <ul>
        {matches.map(match => <li key={match}>{match}</li>)}
      </ul>
    </div>
  );
}
```

## Gotchas

### 1. The deferred value is intentionally stale

```javascript
const deferredQuery = useDeferredValue(query);
// deferredQuery may not equal query — that's the point!
// Your UI must handle showing slightly outdated content gracefully
```

### 2. Without useMemo, the benefit is reduced

```javascript
// ❌ Still runs the expensive filter on every render
const deferredQuery = useDeferredValue(query);
const filtered = items.filter(item => item.includes(deferredQuery));
// deferredQuery may be stale, but filter still runs during the urgent render

// ✅ Combined with useMemo — filter only runs when deferredQuery updates
const filtered = useMemo(
  () => items.filter(item => item.includes(deferredQuery)),
  [items, deferredQuery]
);
```

### 3. Not for critical synchronous state

```javascript
// ❌ Form submission should use the current value, not a deferred one
const deferredFormData = useDeferredValue(formData);
submitForm(deferredFormData); // Might submit stale data!

// ✅ Use the real value for critical operations
submitForm(formData);
```

### 4. Not a replacement for debounce in all cases

```javascript
// For API calls, debounce is still better
// useDeferredValue doesn't prevent the call — it just defers the render
const deferredQuery = useDeferredValue(query);
useEffect(() => {
  fetch(`/api/search?q=${deferredQuery}`); // Still makes many requests!
}, [deferredQuery]);

// ✅ Use debounce for network requests
const debouncedQuery = useDebounce(query, 300);
useEffect(() => {
  fetch(`/api/search?q=${debouncedQuery}`);
}, [debouncedQuery]);
```

### 5. Requires React 18+ with createRoot

Like `useTransition`, `useDeferredValue` only works with concurrent rendering enabled via `createRoot`.

## Interview Questions

**Q (High): When should you use `useDeferredValue` instead of `useTransition`?**

Answer: Use `useDeferredValue` when you receive a value (e.g., as a prop) and can't control the state setter. Use `useTransition` when you own the `setState` call and can wrap it in `startTransition`.

Example: A parent component passes a search query as a prop. The child can't modify how the parent sets the query, but it can defer its own rendering by using `useDeferredValue(query)`.

The trap: Thinking they're interchangeable. They serve the same goal (non-urgent updates) but from different angles — one wraps the update, the other wraps the value.

---

**Q (High): How is `useDeferredValue` different from debouncing?**

Answer: Debounce delays updates by a fixed time — no update happens until the user stops typing for N milliseconds. `useDeferredValue` starts the update immediately but at lower render priority — React may show intermediate results and adapts to device speed.

Debounce is time-based and best for reducing network requests. `useDeferredValue` is priority-based and best for keeping renders responsive. Debounce never shows intermediate results during the delay; deferred values may show partial progress.

The trap: Describing `useDeferredValue` as "React's debounce." It's fundamentally different in mechanism and use case.

---

**Q (Medium): What kind of UI problem does `useDeferredValue` solve?**

Answer: It solves cases where a fast-changing value (like typed input) drives an expensive render (like filtering a large list). The input stays responsive because it uses the current value, while the expensive render uses a deferred (slightly stale) value that updates when React has time.

The key: the UI must gracefully handle showing stale content. Dimming the results or showing a subtle loading indicator while the deferred value catches up.

The trap: Saying it's for all performance problems. It specifically helps with expensive renders, not network latency or computational bottlenecks outside React.

---

**Q (Medium): How do you know when the deferred value is stale?**

Answer: Compare the original value to the deferred value. If they're different, the deferred value hasn't caught up yet:

```javascript
const isStale = query !== deferredQuery;
```

This is the `useDeferredValue` equivalent of `isPending` from `useTransition`.

The trap: Not providing any visual feedback when the value is stale, making the UI feel unresponsive.

---

**Q (Medium): Why should `useDeferredValue` be combined with `useMemo`?**

Answer: `useDeferredValue` gives you a stale value, but without `useMemo`, any derived computation still runs on every render — even when the deferred value hasn't changed. `useMemo` ensures the expensive computation only runs when the deferred value actually updates.

The trap: Using `useDeferredValue` without `useMemo` and wondering why the UI is still slow.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what "deferred" means in terms of render priority, not time delay
- [ ] Can write a minimal example using `useDeferredValue` with `useMemo` from memory
- [ ] Can name the key difference between `useDeferredValue` and `useTransition`
- [ ] Can explain why `useDeferredValue` is not a debounce
- [ ] Can detect stale state by comparing original and deferred values
- [ ] Can name one gotcha — what happens if the deferred value is used for critical form state

---

*Next: [useId](../13-use-id/notes.md) — stable, SSR-safe IDs are the next building block for accessible components.*
