// ============================================================
// Topic:   Testing Async UI
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// Run in browser:   npm run tutorial 05-testing-async-ui
// Run the tests:    npm test
// ============================================================

import { useState, useEffect, FC, useRef } from 'react'

// ─── SearchResults: loading → results | error ─────────────────
// The three async states that every data-fetching component has.

type Result = { id: number; title: string; excerpt: string }

export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Search failed: ${res.status}`)
        return res.json() as Promise<Result[]>
      })
      .then(data => { if (!cancelled) { setResults(data); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [query])

  return (
    <section aria-label="Search results">
      {loading && <div role="progressbar" aria-label="Loading results">Searching...</div>}
      {error && <div role="alert">{error}</div>}
      {!loading && !error && results.length === 0 && query && (
        <p>No results for "{query}"</p>
      )}
      {results.map(r => (
        <article key={r.id}>
          <h3>{r.title}</h3>
          <p>{r.excerpt}</p>
        </article>
      ))}
    </section>
  )
}

// ─── Notification: appears then auto-dismisses ────────────────
export function Notification({ message, duration = 3000 }: { message: string; duration?: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!visible) return null
  return <div role="status" aria-live="polite">{message}</div>
}

// ─── SaveButton: optimistic save with delay ───────────────────
export function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleClick() {
    setState('saving')
    try {
      await onSave()
      setState('saved')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
    }
  }

  const labels = { idle: 'Save', saving: 'Saving...', saved: 'Saved ✓', error: 'Failed — retry?' }

  return (
    <button onClick={handleClick} disabled={state === 'saving'} aria-busy={state === 'saving'}>
      {labels[state]}
    </button>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [showNotif, setShowNotif] = useState(false)

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1>Testing Async UI</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Three patterns for async state: data loading, auto-dismissing notifications,
        and button state transitions. Each needs different RTL async utilities.
      </p>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>SearchResults</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Loads from /api/search — will error in this demo (no real API).</p>
        <input
          type="search"
          aria-label="Search query"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type and press Enter..."
          onKeyDown={e => e.key === 'Enter' && setSubmitted(query)}
        />
        {submitted && <SearchResults query={submitted} />}
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Notification (auto-dismisses after 3s)</h2>
        <button onClick={() => setShowNotif(v => !v)}>Toggle notification</button>
        {showNotif && <Notification message="Changes saved!" duration={3000} />}
      </section>

      <section style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>SaveButton</h2>
        <SaveButton onSave={() => new Promise(resolve => setTimeout(resolve, 800))} />
      </section>

      <section style={{ background: '#fffbe6', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
        <h2>Async query cheatsheet</h2>
        <ul style={{ lineHeight: '2', margin: 0 }}>
          <li><strong>findByRole</strong> — wait for element to APPEAR (most common)</li>
          <li><strong>waitForElementToBeRemoved</strong> — wait for element to DISAPPEAR</li>
          <li><strong>waitFor</strong> — retry complex assertions until they pass</li>
          <li><strong>queryBy</strong> — returns null (not throw) → use for "not present" assertions</li>
          <li>Never use <code>setTimeout</code> in tests — always use the above utilities</li>
        </ul>
      </section>
    </div>
  )
}

export default App
