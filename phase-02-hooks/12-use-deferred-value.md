# useDeferredValue

## What Is This?

`useDeferredValue` is a hook that lets you defer showing a new version of a value until more urgent work has finished. You give it a value; it returns a "deferred" copy that may lag behind — showing the previous value while React renders the expensive UI driven by the new one in the background.

```javascript
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);

  // This component re-renders immediately with the new query
  // but deferredQuery stays the old value until React has time to update it
  return <ExpensiveList filter={deferredQuery} />;
}
```

`query` updates instantly on every keystroke. `deferredQuery` lags behind — it only catches up when React isn't busy with more urgent work. `ExpensiveList` renders the stale filtered list until React can get around to rendering the new one.

## Why Does It Exist?

The problem: expensive derived UI that you can't avoid re-rendering, but also can't afford to re-render synchronously on every update.

The classic example is a search input that filters a large list. The input value must update instantly (users hate laggy inputs). But re-rendering 10,000 list items on every keystroke is expensive. You want:

- Input: always responsive, always shows current value
- List: shows the latest affordable result — slightly behind is acceptable

Before `useDeferredValue`, the common solutions were:

1. **Debouncing**: delay updating the list query by N ms. Works, but has latency — even on a fast machine, you wait the full debounce delay.
2. **`startTransition`**: requires you to control where the state update happens. Doesn't help if the value comes from outside (a prop or context).

`useDeferredValue` solves the second case: you receive a value you don't control (a prop, a context value), and you want to defer the expensive rendering it drives.

## How It Works

`useDeferredValue` uses concurrent rendering to do the deferred render in the background:

1. When `value` changes, React immediately renders with the new value in components that use `value` directly (e.g., the input).
2. Simultaneously, React starts a low-priority concurrent render for components that use `deferredValue`.
3. If a new value arrives before the deferred render finishes, React discards the in-progress render and starts fresh with the newest value.
4. When the deferred render completes, React commits it.

This is not a timer or a delay. The deferred value catches up as fast as React's concurrent scheduler allows.

### Detecting Stale State for Visual Feedback

Since the deferred value is behind, you can detect when it's stale and show a loading indicator:

```javascript
function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {/* Dim the results while the deferred render is pending */}
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <SearchResults query={deferredQuery} />
      </div>
    </>
  );
}
```

When `isStale` is true, the user sees dimmed results (still the previous query's results) while the new results render in background.

### Pairing with React.memo

For `useDeferredValue` to actually skip re-renders when the deferred value hasn't changed, the expensive component must be wrapped in `React.memo`:

```javascript
const SearchResults = React.memo(function SearchResults({ query }) {
  // Expensive render: filters 10,000 items
  const results = items.filter(item => item.includes(query));
  return <ul>{results.map(item => <li key={item}>{item}</li>)}</ul>;
});

function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* deferredQuery is stable when you're typing fast,
          so React.memo can bail out of re-rendering SearchResults */}
      <SearchResults query={deferredQuery} />
    </>
  );
}
```

Without `React.memo`, every time the parent renders (e.g., `query` state changes), `SearchResults` would re-render anyway even if `deferredQuery` is the same as last render.

## useDeferredValue vs useTransition

| | `useTransition` | `useDeferredValue` |
|--|--|--|
| **What you control** | The state *update* | A *value* you receive |
| **How you use it** | Wrap `setState` in `startTransition` | Wrap a value in `useDeferredValue` |
| **isPending feedback** | Yes, explicit `isPending` boolean | No — must compare `value !== deferredValue` |
| **When to use** | You control when the update happens | You receive a value from outside (prop, context) |

They're complementary. If you dispatch a state update yourself, use `useTransition`. If you receive a prop or context value and want to defer the expensive rendering it drives, use `useDeferredValue`.

## useDeferredValue vs Debouncing

Debouncing delays an update by a fixed time interval. `useDeferredValue` defers based on available rendering capacity.

- On a fast machine with no other work happening: the deferred value catches up almost instantly (no artificial delay)
- On a slow machine or during heavy load: it waits longer — but adapts to actual conditions rather than an arbitrary timer
- Rapid updates: React discards in-progress renders for stale values, so you never process intermediate states unnecessarily

This makes `useDeferredValue` better than debouncing for rendering concerns — the list always updates as fast as the device allows, not after an arbitrary fixed delay. For network requests (you want to debounce API calls), debouncing is still the right tool.

## Gotchas

### 1. The initial render always uses the provided value

On first render, `deferredValue === value`. There's no initial lag. The difference only appears when `value` changes.

### 2. Objects and arrays need stable references

```javascript
// ❌ New array on every render — useDeferredValue sees a "new" value every time
const deferredFilters = useDeferredValue([filter1, filter2]);

// ✅ Memoize the array so reference only changes when filters actually change
const filters = useMemo(() => [filter1, filter2], [filter1, filter2]);
const deferredFilters = useDeferredValue(filters);
```

`useDeferredValue` compares by reference (like `useEffect` deps). If you pass a new array every render, it's always "changed" and never deferred.

### 3. Doesn't reduce network requests

`useDeferredValue` is a rendering optimization. If your expensive operation is a network call, it won't reduce how many calls you make. Debounce the API call; use `useDeferredValue` for the resulting render.

### 4. React.memo is required for the optimization to kick in

Already covered above, but worth repeating: the deferred value being the same as last render only *skips* the re-render if the component is memoized. Without `React.memo`, the parent's render always triggers the child's render.

## Interview Questions

**Q: What does `useDeferredValue` actually defer?**

Strong answer: It defers the rendering of components that use the deferred value, not the value update itself. The state holding the original value updates immediately. The deferred copy of that value updates in a background concurrent render at lower priority. From the user's perspective: the input (using the real value) is always responsive, while the expensive list (using the deferred value) may temporarily show stale results while rendering in the background. Once the background render completes, it commits and the list catches up.

The trap: Thinking it delays the state update. The state updates immediately — what's deferred is when the expensive downstream rendering sees the new value.

---

**Q: When would you use `useDeferredValue` instead of `useTransition`?**

Strong answer: When you don't control where the state update happens. `useTransition` requires you to wrap a `setState` call in `startTransition` — you must own the update. `useDeferredValue` is for values you receive from outside: a prop from a parent, a value from context, or a URL param. You take that value, pass it through `useDeferredValue`, and use the deferred copy to drive your expensive child component. The value's source component is unaffected — it keeps updating at full speed.

The trap: Using `useTransition` even for values coming from props, which would require awkward workarounds. Understanding the ownership distinction is the key to picking the right tool.

---

**Q: How is `useDeferredValue` different from debouncing?**

Strong answer: Debouncing adds an artificial fixed delay — the list updates after X milliseconds regardless of device speed. `useDeferredValue` is adaptive: it renders the deferred content as fast as the device allows, with no minimum delay. On a fast machine with nothing else happening, the deferred value can catch up in the same frame. On a slow machine under load, it waits longer — automatically. Additionally, `useDeferredValue` can throw away partially-completed renders if the value changes again before they finish, which a debounced `setState` doesn't do. For reducing API calls, debouncing is still the right tool. For rendering optimization only, `useDeferredValue` is strictly better.

The trap: "Use debouncing for performance." Debouncing is a network optimization. `useDeferredValue` is a rendering optimization. They solve different (though related) problems.

---

*Next: [useId](13-use-id.md) — Generating stable, SSR-safe unique IDs for accessibility attributes without the hydration mismatch problems of Math.random or counters.*
