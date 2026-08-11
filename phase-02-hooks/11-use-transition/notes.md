# useTransition

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Non-urgent update | State change wrapped in `startTransition` | React can interrupt it to keep urgent UI responsive |
| `isPending` | Boolean that is `true` while the transition renders | Use it to show a spinner or dim stale content |
| Scheduler hint only | Not debounce; React still processes the update | Update will complete, just at lower priority |
| Concurrent mode feature | Only meaningful with concurrent rendering enabled | Needs React 18+ with `createRoot` |

## What Is This?

`useTransition` is a React hook for marking state updates as non-urgent. It returns an `isPending` boolean and a `startTransition` function. Updates wrapped in `startTransition` are processed at a lower priority — React can interrupt them if a more urgent update (like typing) comes in.

```javascript
const [isPending, startTransition] = useTransition();

function handleTabChange(tab) {
  startTransition(() => {
    setActiveTab(tab); // Non-urgent: React can interrupt this render
  });
}
```

It's part of React 18's concurrent features, designed to keep UIs responsive during expensive renders.

> **Check yourself:** If you wrap a state update in `startTransition`, does the update still happen? Or is it cancelled?

## Why Does It Exist?

Modern UIs often combine fast interactions with expensive rendering:
- Typing in a search box → filtering 10,000 items
- Clicking a tab → rendering a complex data view
- Navigating → loading a new route with heavy components

Without transitions, React treats all state updates equally. If filtering 10,000 items takes 200ms, the input feels sluggish because React blocks the thread to complete the render before accepting new input.

`useTransition` tells React: "This update is less urgent. If the user types again, drop the stale render and start over with the new input."

### The Before/After

```javascript
// ❌ Without transition: typing feels sluggish
function handleChange(e) {
  setQuery(e.target.value);          // Urgent: update the input
  setFilteredList(filter(e.target.value)); // Also urgent: blocks input
}

// ✅ With transition: input stays snappy
function handleChange(e) {
  setQuery(e.target.value);          // Urgent: update the input immediately
  startTransition(() => {
    setFilteredList(filter(e.target.value)); // Non-urgent: can be interrupted
  });
}
```

## How It Works

### The Mechanism

When you call `startTransition(() => setState(...))`:

1. React marks the state update as a "transition" (non-urgent).
2. React continues processing urgent updates first (user input, clicks).
3. When the main thread is idle, React renders the transition update.
4. If a new urgent update arrives during the transition render, React *abandons* the stale transition render and starts a new one.

This is fundamentally different from debouncing:

| Aspect | Debounce | startTransition |
|--------|----------|-----------------|
| **Mechanism** | Delays the update by time | Renders at lower priority |
| **User types fast** | No update until they stop | Update starts immediately, but can be interrupted |
| **Responsiveness** | Input is always responsive | Input is always responsive |
| **Completion** | Runs once after delay | May run multiple times (interrupted and restarted) |
| **When to use** | Network requests, API calls | Expensive renders, tab switches |

> **Check yourself:** A user types 5 characters rapidly. With debounce (300ms), how many renders happen? With `startTransition`, how many renders happen? Which approach shows intermediate results?

### isPending

`isPending` is `true` from when you call `startTransition` until the transition render completes:

```javascript
const [isPending, startTransition] = useTransition();

return (
  <>
    <input onChange={e => {
      setQuery(e.target.value);
      startTransition(() => setResults(search(e.target.value)));
    }} />

    {isPending ? (
      <div className="stale" style={{ opacity: 0.6 }}>
        <Spinner /> Loading...
      </div>
    ) : (
      <ResultsList results={results} />
    )}
  </>
);
```

Common UI patterns for `isPending`:
- Show a spinner or skeleton
- Dim/fade stale content (reduce opacity)
- Show a loading bar
- Disable interactive elements

> **Check yourself:** Is `isPending` the same as a loading state for network requests? What's the difference?

### startTransition (standalone)

React also exports a standalone `startTransition` from `'react'` for use outside components:

```javascript
import { startTransition } from 'react';

// In a callback, library code, or event handler
startTransition(() => {
  setState(newValue);
});
```

The standalone version doesn't give you `isPending`. Use the hook version when you need the pending state.

## Common Use Cases

### 1. Tab Switching with Heavy Content

```javascript
function TabPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isPending, startTransition] = useTransition();

  function handleTabClick(tab) {
    startTransition(() => {
      setActiveTab(tab); // Tab content may be expensive to render
    });
  }

  return (
    <div>
      <nav>
        {['overview', 'analytics', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={activeTab === tab ? 'active' : ''}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'analytics' && <HeavyAnalytics />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  );
}
```

### 2. Search with Expensive Filtering

```javascript
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value) {
    setQuery(value); // Urgent: keep input responsive

    startTransition(() => {
      // Non-urgent: filter 50,000 items
      const filtered = allItems.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
    });
  }

  return (
    <div>
      <input value={query} onChange={e => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <ItemList items={results} />
    </div>
  );
}
```

### 3. Route Transitions

```javascript
function Router() {
  const [currentRoute, setCurrentRoute] = useState('/home');
  const [isPending, startTransition] = useTransition();

  function navigate(path) {
    startTransition(() => {
      setCurrentRoute(path);
    });
  }

  return (
    <div>
      <nav>
        <a onClick={() => navigate('/home')}>Home</a>
        <a onClick={() => navigate('/dashboard')}>Dashboard</a>
      </nav>
      {isPending && <LoadingBar />}
      <Routes currentRoute={currentRoute} />
    </div>
  );
}
```

### 4. Separating Urgent and Non-Urgent Updates

```javascript
function ColorPicker() {
  const [inputColor, setInputColor] = useState('#000000');
  const [previewColor, setPreviewColor] = useState('#000000');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setInputColor(e.target.value); // Urgent: update picker immediately

    startTransition(() => {
      setPreviewColor(e.target.value); // Non-urgent: re-render heavy preview
    });
  }

  return (
    <>
      <input type="color" value={inputColor} onChange={handleChange} />
      <HeavyColorPreview color={previewColor} isPending={isPending} />
    </>
  );
}
```

## useTransition vs useDeferredValue

Both are concurrent features for non-urgent updates, but they work differently:

| Aspect | useTransition | useDeferredValue |
|--------|--------------|-----------------|
| **Wraps** | A state update (`startTransition(() => setState(...))`) | A value (`useDeferredValue(value)`) |
| **Control** | You control when the transition starts | React controls when the value updates |
| **Use when** | You own the state setter | You receive the value as a prop |
| **isPending** | ✅ Returns `isPending` | ❌ No pending indicator (compare old vs new value) |
| **Mental model** | "Mark this update as non-urgent" | "Give me a lagging copy of this value" |

```javascript
// useTransition: you own the setter
const [isPending, startTransition] = useTransition();
startTransition(() => setQuery(value));

// useDeferredValue: you receive the value, can't control the setter
const deferredQuery = useDeferredValue(query);
```

> **Check yourself:** If you receive a frequently-changing prop and can't modify how it's set, which hook should you use — `useTransition` or `useDeferredValue`?

## Gotchas

### 1. Only state updates can be transitions

```javascript
// ❌ Can't wrap non-React operations
startTransition(() => {
  domElement.style.color = 'red'; // Not a state update — no effect
});

// ✅ Must wrap a setState call
startTransition(() => {
  setColor('red'); // React state update
});
```

### 2. The update inside startTransition must be synchronous

```javascript
// ❌ Async inside startTransition
startTransition(async () => {
  const data = await fetchData(); // ❌ React loses track after await
  setResults(data);
});

// ✅ Set state synchronously, fetch in an effect
startTransition(() => {
  setSearchTerm(value); // Synchronous
});
// Then use useEffect to fetch based on searchTerm
```

### 3. isPending is not a network loading state

```javascript
// ❌ Misleading: isPending tracks render priority, not network requests
const [isPending, startTransition] = useTransition();
startTransition(() => {
  fetch('/api/data').then(data => setData(data)); // isPending won't track this
});

// isPending is about render scheduling, not async operations
```

### 4. Wrapping everything in startTransition makes the UI feel slow

```javascript
// ❌ Everything is non-urgent → nothing feels responsive
startTransition(() => {
  setInputValue(e.target.value); // This should be urgent!
  setResults(filter(e.target.value));
});

// ✅ Split urgent and non-urgent
setInputValue(e.target.value); // Urgent: update input immediately
startTransition(() => {
  setResults(filter(e.target.value)); // Non-urgent: can lag
});
```

### 5. Requires React 18+ with createRoot

```javascript
// ❌ Legacy render mode — transitions have no effect
ReactDOM.render(<App />, document.getElementById('root'));

// ✅ Concurrent mode — transitions work
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

## Interview Questions

**Q (High): What is the difference between `useTransition` and `useDeferredValue`?**

Answer: `useTransition` wraps a *state update* — you call `startTransition(() => setState(...))` to mark it as non-urgent. It returns `isPending` so you can show loading UI. `useDeferredValue` wraps a *value* — it returns a lower-priority copy of the value that lags behind the original.

Use `useTransition` when you own the state setter. Use `useDeferredValue` when you receive a value as a prop and can't control how it's set.

The trap: Saying they're interchangeable or that `useTransition` is just for showing spinners. They address the same problem (non-urgent updates) but from different angles.

---

**Q (High): How is `startTransition` different from debouncing?**

Answer: Debounce delays the update by a fixed time (e.g., 300ms). `startTransition` starts the update immediately but at lower priority — React can interrupt and restart it if a more urgent update arrives.

Key differences: debounce shows no intermediate results during the delay; transitions may show partial renders. Debounce is time-based; transitions are priority-based. Debounce is good for reducing network requests; transitions are good for keeping the UI responsive during expensive renders.

The trap: Thinking `startTransition` delays the update. It doesn't — it renders immediately, just at lower priority.

---

**Q (High): When should you use `useTransition`?**

Answer: When you have a state update that triggers an expensive render, and you want to keep the UI responsive during that render. Common cases: filtering large lists while typing, switching between tabs with heavy content, route transitions with complex page loads.

The key indicator: the user does something fast (types, clicks) but the resulting render is slow. Split the fast part (urgent) from the slow part (transition).

The trap: Using `startTransition` for every state update, or expecting it to fix all performance problems. It's a scheduling hint, not a magic performance booster.

---

**Q (Medium): What does `isPending` represent?**

Answer: `isPending` is `true` from when `startTransition` is called until the transition render completes. It represents whether React is still working on the non-urgent update. Use it to show loading indicators (spinners, skeleton screens, reduced opacity).

Important: `isPending` tracks *render scheduling*, not network requests or async operations. It's `true` while the transition is rendering, not while a fetch is in progress.

The trap: Using `isPending` as a general loading state for API calls. It's specifically for render-level transitions.

---

**Q (Medium): Can `startTransition` contain async code?**

Answer: The function passed to `startTransition` must be synchronous. React needs to identify state updates synchronously to mark them as transitions. If you `await` inside `startTransition`, React loses track of the state updates after the `await`.

```javascript
// ❌ Wrong
startTransition(async () => {
  const data = await fetch(...);
  setData(data); // React doesn't know this is a transition
});

// ✅ Right: set state synchronously, handle async in effects
startTransition(() => {
  setSearchTerm(value);
});
```

The trap: Trying to use `startTransition` for async data fetching patterns.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain the difference between `startTransition` and debouncing in one concrete sentence
- [ ] Can describe what `isPending` represents and give an appropriate UI pattern for it
- [ ] Can state the key condition: the update inside `startTransition` can be interrupted by React
- [ ] Can contrast `useTransition` with `useDeferredValue` at a high level
- [ ] Can explain why the function inside `startTransition` must be synchronous
- [ ] Can name the React 18 requirement (`createRoot`) for transitions to work

---

*Next: [useDeferredValue](../12-use-deferred-value/notes.md) — deferring a value is the natural complement to deferring an update.*
