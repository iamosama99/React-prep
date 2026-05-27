// ============================================================
// Topic:   Concurrent Rendering Model
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: PROGRESSIVE BUILD
// Start with a broken (jank) UI, add concurrent features step
// by step, observe how the model changes the experience.
//
// Run: npm run tutorial 02-concurrent-rendering-model
// ============================================================

import {
  useState,
  useTransition,
  useDeferredValue,
  startTransition,
  FC,
  memo,
} from 'react'

// ─── Shared: simulate expensive rendering ────────────────────
// This component burns CPU to simulate a heavy list render.
// It makes the "before/after concurrent" difference visible.

const ITEM_COUNT = 2000

const ExpensiveList = memo(function ExpensiveList({ query }: { query: string }) {
  // Simulate render work proportional to the list size
  const start = performance.now()
  while (performance.now() - start < 100) { /* spin 100ms */ }

  const items = Array.from({ length: ITEM_COUNT }, (_, i) => `Item ${i + 1}`)
    .filter(item => item.toLowerCase().includes(query.toLowerCase()))

  return (
    <ul style={{ maxHeight: '200px', overflow: 'auto', fontSize: '0.8rem', padding: '0.5rem', border: '1px solid #ddd' }}>
      {items.slice(0, 50).map(item => (
        <li key={item}>{item}</li>
      ))}
      {items.length > 50 && <li style={{ color: '#888' }}>...and {items.length - 50} more</li>}
    </ul>
  )
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The problem: synchronous render blocks input
//
// Type fast. The input can't keep up because every keystroke
// synchronously triggers the 100ms ExpensiveList render.
// React 17's model: every setState = run to completion.
// ─────────────────────────────────────────────────────────────
function Exercise1_SyncJank() {
  const [query, setQuery] = useState('')

  return (
    <section>
      <h2>Exercise 1: Synchronous jank (the problem)</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Type quickly in this input. The input freezes every keystroke because
        the ExpensiveList render (100ms) blocks the browser from updating the input.
        This is what React 17 does for every state update.
      </p>
      <input
        type="search"
        aria-label="sync search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type fast..."
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
      />
      <ExpensiveList query={query} />
      <p style={{ fontSize: '0.85rem', color: '#e55', marginTop: '0.5rem' }}>
        ❌ Input updates feel delayed. Every character waits for the full list render.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Fix with useTransition: separate urgent from non-urgent
//
// startTransition marks the list update as low-priority.
// The input gets its own urgent update lane.
// Result: input is always instant, list follows when ready.
// ─────────────────────────────────────────────────────────────
function Exercise2_WithTransition() {
  const [inputValue, setInputValue] = useState('')   // urgent — drives input display
  const [listQuery, setListQuery] = useState('')      // non-urgent — drives list
  const [isPending, startTransitionFn] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // Urgent: input display updates instantly (SyncLane)
    setInputValue(value)
    // Non-urgent: list update goes into TransitionLane
    // React can interrupt this to handle new keystrokes
    startTransitionFn(() => {
      setListQuery(value)
    })
  }

  return (
    <section>
      <h2>Exercise 2: useTransition (the fix)</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Same expensive list, but now the input update is marked urgent and
        the list update is a transition. Type fast — the input is instant.
      </p>
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          aria-label="transition search"
          value={inputValue}
          onChange={handleChange}
          placeholder="Type fast — input stays responsive..."
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        {isPending && (
          <span style={{
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            fontSize: '0.75rem', color: '#888',
          }}>
            updating...
          </span>
        )}
      </div>
      <ExpensiveList query={listQuery} />
      <p style={{ fontSize: '0.85rem', color: '#2a2', marginTop: '0.5rem' }}>
        ✓ Input is instant. List update is interruptible — each new keystroke
        cancels the previous transition and starts fresh with the latest value.
      </p>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: experiment</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Remove startTransitionFn — observe the jank returns</li>
          <li>Add it back — observe the responsiveness</li>
          <li>The isPending indicator: what does it enable that a simple loading spinner can't?</li>
          <li>What if you wrap setInputValue in startTransition too? (bad idea — try it)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — useDeferredValue: defer a derived value
//
// Alternative to useTransition when you can't wrap the setter.
// The deferred copy lags behind the live value by one render,
// giving you the previous value while the new one computes.
// ─────────────────────────────────────────────────────────────
function Exercise3_DeferredValue() {
  const [query, setQuery] = useState('')
  // useDeferredValue returns the OLD value while the new one is "in transition"
  // The memo of ExpensiveList re-renders only when deferredQuery changes
  const deferredQuery = useDeferredValue(query)

  // Is the display stale? (live query ≠ deferred query)
  const isStale = query !== deferredQuery

  return (
    <section>
      <h2>Exercise 3: useDeferredValue</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Same effect as useTransition but applied to the value instead of the setter.
        Use when you don't control the code that calls setState.
      </p>
      <input
        type="search"
        aria-label="deferred search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type..."
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
      />
      <div style={{ opacity: isStale ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {isStale && (
          <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 0.25rem' }}>
            (showing stale results while updating...)
          </p>
        )}
        <ExpensiveList query={deferredQuery} />
      </div>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: understand the difference from useTransition</summary>
        <ul style={{ lineHeight: '2' }}>
          <li>useTransition: you control WHEN the low-priority update happens (wrap the setter)</li>
          <li>useDeferredValue: you control WHAT value is deferred (the consumer side)</li>
          <li>Both produce the same user experience here. The choice is about WHERE you have control.</li>
          <li>If the setState is inside a 3rd party component, only useDeferredValue works.</li>
        </ul>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Priority lanes: observe the order of updates
//
// React processes updates by priority. Sync events (clicks) get
// SyncLane (highest). Transitions get TransitionLane (low).
// If a sync update arrives mid-transition, the transition is dropped.
// ─────────────────────────────────────────────────────────────
function Exercise4_PriorityLanes() {
  const [syncUpdate, setSyncUpdate] = useState('—')
  const [transitionUpdate, setTransitionUpdate] = useState('—')
  const [isPending, startTrans] = useTransition()

  function triggerBoth() {
    // Sync (high-priority) — this commits first
    setSyncUpdate(`sync @ ${Date.now()}`)

    // Transition (low-priority) — this commits after sync work
    startTrans(() => {
      // Simulate expensive work in the transition
      const start = performance.now()
      while (performance.now() - start < 150) { /* spin */ }
      setTransitionUpdate(`transition @ ${Date.now()}`)
    })
  }

  return (
    <section>
      <h2>Exercise 4: Priority Lanes</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Click the button — both sync and transition updates fire.
        The sync update commits immediately. The transition finishes after.
        Open React DevTools Profiler to see the two separate commit phases.
      </p>
      <button onClick={triggerBoth}>Trigger both updates</button>
      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#f0f0f0', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>Sync (SyncLane)</strong>
          <p style={{ fontSize: '0.85rem' }}>{syncUpdate}</p>
        </div>
        <div style={{ background: isPending ? '#fff3cd' : '#f0f0f0', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>Transition (TransitionLane) {isPending ? '⏳' : ''}</strong>
          <p style={{ fontSize: '0.85rem' }}>{transitionUpdate}</p>
        </div>
      </div>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: verify your understanding</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Why does the sync update always appear before the transition update,
            even though startTrans was called after setSyncUpdate?</li>
          <li>If you click the button rapidly 5 times, how many transition renders happen?
            (Hint: each new click interrupts the previous transition)</li>
          <li>What would happen if React had no priority system? (No startTransition, no lanes)
            How would the UI feel on a slow device?</li>
        </ol>
      </details>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
    <h1>Concurrent Rendering Model</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      These exercises make concurrency <em>visible</em>. The slow rendering is artificial
      (100ms CPU spin) so you can feel the difference. In a real app with 1000-item lists,
      the same pattern applies.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_SyncJank />
      <hr />
      <Exercise2_WithTransition />
      <hr />
      <Exercise3_DeferredValue />
      <hr />
      <Exercise4_PriorityLanes />
    </div>
  </div>
)

export default App
