// ============================================================
// Topic:   React 18 Changes Summary
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: OBSERVATION + BUILD
// Each exercise lets you see a React 18 feature in action and
// then extend it. The point is muscle memory, not just reading.
//
// Run: npm run tutorial 01-react-18-changes
// ============================================================

import {
  useState,
  useTransition,
  useDeferredValue,
  useId,
  useEffect,
  FC,
  flushSync,
} from 'react'
import { flushSync as flushSyncDom } from 'react-dom'

// ─── Utility: artificial CPU work ───────────────────────────
function slowFilter(items: string[], query: string): string[] {
  // Burn CPU to simulate an expensive filter — makes transitions visible
  const start = performance.now()
  while (performance.now() - start < 80) { /* spin */ }
  return items.filter(i => i.toLowerCase().includes(query.toLowerCase()))
}

const ALL_ITEMS = Array.from({ length: 200 }, (_, i) => `Item ${i + 1} — React 18 Feature`)

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Automatic Batching
//
// In React 17, state updates in setTimeout/Promise each caused
// separate renders. In React 18 (with createRoot), they batch.
//
// Observe: the render count below. With batching it should be 1.
// Without: each setState triggers a render = 3 total.
// ─────────────────────────────────────────────────────────────
function Exercise1_AutoBatching() {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)
  const [c, setC] = useState(0)
  const [renderCount, setRenderCount] = useState(0)

  // Count renders via useState trick (useEffect would double-count in StrictMode)
  const renders = (() => { renderCount; return renderCount + 1 })()

  function updateAllInTimeout() {
    setTimeout(() => {
      // React 18: all three are BATCHED → one re-render
      setA(x => x + 1)
      setB(x => x + 1)
      setC(x => x + 1)
    }, 0)
  }

  function updateWithFlushSync() {
    // flushSync forces each update to flush synchronously → 2 renders
    flushSyncDom(() => setA(x => x + 1))
    flushSyncDom(() => setB(x => x + 1))
    // The third still batches with nothing else
    setC(x => x + 1)
  }

  return (
    <section>
      <h2>Exercise 1: Automatic Batching</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        React 18 batches ALL state updates — including those in setTimeout and Promise callbacks.
        Watch the render count: "Batched update" increments it by 1, "flushSync" increments by more.
      </p>
      <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <p>a={a}, b={b}, c={c}</p>
        <p>Renders this session: <strong>{renders}</strong></p>
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={updateAllInTimeout}>
          Batched update (setTimeout)
        </button>
        <button onClick={updateWithFlushSync}>
          Force sync with flushSync
        </button>
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#888' }}>
        TODO: Open React DevTools Profiler. Click "Batched update" and count how many
        renders fire. Should be exactly 1 per click, regardless of how many setStates run.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — StrictMode Double-Mount Detection
//
// React 18 StrictMode mounts → unmounts → remounts every component in dev.
// This surfaces effects that don't clean up properly.
//
// Observe: the counter below increments because the subscription
// isn't cleaned up. It would double-fire in production after a navigation.
// Fix: add the cleanup function.
// ─────────────────────────────────────────────────────────────
function Exercise2_StrictMode() {
  const [count, setCount] = useState(0)
  const [cleanedUp, setCleanedUp] = useState(false)

  // ❌ Missing cleanup — fires twice in StrictMode
  useEffect(() => {
    const handler = () => setCount(c => c + 1)
    window.addEventListener('click', handler)
    // TODO: add return () => window.removeEventListener('click', handler)
    // Without this: StrictMode mounts → unmounts (removes nothing!) → remounts.
    // Result: two listeners attached, each click increments twice.
  }, [])

  // ✓ Has cleanup — fires exactly once
  useEffect(() => {
    if (!cleanedUp) return
    const handler = () => {} // harmless handler for demo
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler) // ← cleanup
  }, [cleanedUp])

  return (
    <section>
      <h2>Exercise 2: StrictMode Double-Mount</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Click anywhere on the page. Because the effect has no cleanup, the listener
        fires twice (StrictMode mounted then remounted without removing it).
        Fix: add the cleanup return to the first useEffect.
      </p>
      <p>Window click count: <strong>{count}</strong></p>
      <p style={{ color: '#e55', fontSize: '0.85rem' }}>
        ⚠ Expected: 1 per click. If you see 2: the cleanup is missing.
        In production, React Native navigation and Offscreen API would also trigger this.
      </p>
      <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '1rem' }}>
        TODO: Add the return statement to the first useEffect above.
        The count should then increment by exactly 1 per click.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — useId for accessible form elements
//
// useId generates stable IDs that are consistent between server
// and client renders (no hydration mismatch).
//
// Observe: the IDs are stable across renders and unique per instance.
// ─────────────────────────────────────────────────────────────
function AccessibleField({ label, type = 'text' }: { label: string; type?: string }) {
  // TODO: replace the hard-coded 'field-1' with useId()
  // useId() generates ':r0:', ':r1:', etc. — stable and SSR-safe
  const id = 'field-1' // ← replace this with useId()

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={id} style={{ display: 'block', marginBottom: '0.25rem' }}>
        {label}
      </label>
      <input id={id} type={type} style={{ padding: '0.4rem', width: '100%' }} />
      <p style={{ fontSize: '0.8rem', color: '#888' }}>Generated ID: <code>{id}</code></p>
    </div>
  )
}

function Exercise3_UseId() {
  return (
    <section>
      <h2>Exercise 3: useId</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Both fields below currently share the same hard-coded id "field-1".
        Replace with useId() — each instance gets a unique, stable ID.
        This matters for <code>htmlFor/id</code> linkage and SSR hydration.
      </p>
      <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px' }}>
        <AccessibleField label="Email address" type="email" />
        <AccessibleField label="Phone number" type="tel" />
      </div>
      <p style={{ fontSize: '0.85rem', color: '#555' }}>
        After fixing: inspect the elements. Each input should have a unique id.
        Clicking either label should focus the CORRECT input (not both).
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — useTransition: defer non-urgent updates
//
// Without transition: typing triggers the heavy filter synchronously.
// The input freezes — you can't type faster than the filter runs.
// With transition: the input updates instantly, the list defers.
// ─────────────────────────────────────────────────────────────
function Exercise4_WithoutTransition() {
  const [query, setQuery] = useState('')
  const filtered = slowFilter(ALL_ITEMS, query)

  return (
    <div>
      <p style={{ color: '#e55', fontSize: '0.85rem' }}>❌ Without transition: input freezes while filtering</p>
      <input
        type="text"
        aria-label="search (no transition)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to filter (notice the lag)..."
        style={{ width: '100%', padding: '0.5rem' }}
      />
      <p style={{ fontSize: '0.85rem', color: '#666' }}>
        {filtered.length} results
      </p>
    </div>
  )
}

function Exercise4_WithTransition() {
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [filteredQuery, setFilteredQuery] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)            // urgent: input updates immediately
    startTransition(() => {
      setFilteredQuery(value)  // non-urgent: can be interrupted
    })
  }

  const filtered = slowFilter(ALL_ITEMS, filteredQuery)

  return (
    <div>
      <p style={{ color: '#2a2', fontSize: '0.85rem' }}>✓ With transition: input stays responsive</p>
      <input
        type="text"
        aria-label="search (with transition)"
        value={query}
        onChange={handleChange}
        placeholder="Type to filter (should feel smooth)..."
        style={{ width: '100%', padding: '0.5rem' }}
      />
      {isPending && <p style={{ color: '#888', fontSize: '0.85rem' }}>Filtering...</p>}
      <p style={{ fontSize: '0.85rem', color: '#666' }}>
        {filtered.length} results
      </p>
      <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.5rem' }}>
        TODO: Remove the startTransition wrapper and observe the difference.
        Then add it back. See how isPending provides the "Filtering..." indicator.
      </p>
    </div>
  )
}

function Exercise4_UseTransition() {
  return (
    <section>
      <h2>Exercise 4: useTransition</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Type the same text in both inputs. The top one freezes the input;
        the bottom one stays responsive because the expensive filter is deferred.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Exercise4_WithoutTransition />
        <Exercise4_WithTransition />
      </div>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>React 18 Changes</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Four exercises covering the most important React 18 changes.
      Each is hands-on: observe the default behavior, then modify the code to fix or enhance it.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Exercise1_AutoBatching />
      <hr />
      <Exercise2_StrictMode />
      <hr />
      <Exercise3_UseId />
      <hr />
      <Exercise4_UseTransition />
    </div>
  </div>
)

export default App
