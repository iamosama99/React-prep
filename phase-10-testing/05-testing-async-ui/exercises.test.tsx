// ============================================================
// Exercises: Testing Async UI
//
// Run: npm test  |  Watch: npm run test:watch
//
// Master the async utilities: findBy, waitFor, waitForElementToBeRemoved.
// Understand when each one applies and what goes wrong without them.
// ============================================================

import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { useState, useEffect } from 'react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// ─── Types ────────────────────────────────────────────────────
type Result = { id: number; title: string; excerpt: string }

// ─── Components ───────────────────────────────────────────────
function SearchResults({ query }: { query: string }) {
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
      {!loading && !error && results.length === 0 && query && <p>No results for "{query}"</p>}
      {results.map(r => (
        <article key={r.id}>
          <h3>{r.title}</h3>
          <p>{r.excerpt}</p>
        </article>
      ))}
    </section>
  )
}

function Notification({ message, duration = 3000 }: { message: string; duration?: number }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])
  if (!visible) return null
  return <div role="status" aria-live="polite">{message}</div>
}

function SaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function handleClick() {
    setState('saving')
    try { await onSave(); setState('saved') }
    catch { setState('error') }
  }
  const labels = { idle: 'Save', saving: 'Saving...', saved: 'Saved ✓', error: 'Failed — retry?' }
  return (
    <button onClick={handleClick} disabled={state === 'saving'} aria-busy={state === 'saving'}>
      {labels[state]}
    </button>
  )
}

// ─── MSW Server ───────────────────────────────────────────────
const FAKE_RESULTS: Result[] = [
  { id: 1, title: 'React Testing Best Practices', excerpt: 'Write tests that give confidence.' },
  { id: 2, title: 'Understanding RTL', excerpt: 'Test from the user perspective.' },
  { id: 3, title: 'Async Patterns in Tests', excerpt: 'findBy, waitFor, and more.' },
]

const server = setupServer(
  http.get('/api/search', () => HttpResponse.json(FAKE_RESULTS))
)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — getBy vs findBy: understand the difference
//
// getBy = sync, throws immediately if not found
// findBy = async, retries until found or times out
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: getBy vs findBy', () => {
  test('getBy throws immediately — data has not loaded yet', () => {
    render(<SearchResults query="react" />)

    // This FAILS because the fetch hasn't completed yet.
    // getByRole throws synchronously — it doesn't wait.
    expect(() => screen.getByRole('article')).toThrow()

    // But the loading indicator IS there synchronously:
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('findBy waits — data appears after the fetch completes', async () => {
    render(<SearchResults query="react" />)

    // findBy polls every 50ms up to 1000ms (default)
    const articles = await screen.findAllByRole('article')
    expect(articles).toHaveLength(FAKE_RESULTS.length)
  })

  test('queryBy returns null (does not throw) — use for absence assertions', async () => {
    render(<SearchResults query="react" />)

    await screen.findAllByRole('article') // wait for load to complete

    // Loading indicator should be gone — queryBy returns null when not found
    // getByRole would throw here, which is wrong for an "it's not there" assertion
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — findBy with different queries
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: findBy variants', () => {
  test('findByRole with name option finds a specific article heading', async () => {
    render(<SearchResults query="testing" />)

    // TODO: Use findByRole to find the heading 'React Testing Best Practices'
    // Hint: role is 'heading', use { name: /react testing/i }
    expect(true).toBe(true) // replace
  })

  test('findAllByRole returns all matching elements', async () => {
    render(<SearchResults query="patterns" />)

    // TODO: Use findAllByRole('article') and assert the count
    expect(true).toBe(true) // replace
  })

  test('findByText waits for text content', async () => {
    render(<SearchResults query="understanding" />)

    // TODO: Use findByText to find the excerpt text (partial match with regex)
    // Hint: findByText(/test from the user/i)
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — waitFor for complex assertions
//
// waitFor is for assertions that aren't just "element exists"
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: waitFor', () => {
  test('waitFor retries until all assertions pass', async () => {
    render(<SearchResults query="react" />)

    // Multiple assertions that must ALL be true at the same time
    await waitFor(() => {
      // Loading is done
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      // Results are shown
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0)
      // No error
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  test('waitFor on a mock function call', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SaveButton onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /save/i }))

    // After clicking, the save is async — we wait for onSave to have been called
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })
  })

  test('SaveButton text transitions: Save → Saving... → Saved ✓', async () => {
    let resolvePromise!: () => void
    const onSave = () => new Promise<void>(resolve => { resolvePromise = resolve })
    const user = userEvent.setup()

    render(<SaveButton onSave={onSave} />)
    const btn = screen.getByRole('button', { name: /^save$/i })

    await user.click(btn)

    // Immediately after click: saving
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()

    // Resolve the promise — transitions to saved
    resolvePromise()

    // TODO: wait for the button to show "Saved ✓"
    // Hint: await screen.findByRole('button', { name: /saved/i })
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — waitForElementToBeRemoved
//
// The specialist for "element was there, now it should be gone"
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: waitForElementToBeRemoved', () => {
  test('loading spinner disappears after data loads', async () => {
    render(<SearchResults query="react" />)

    // Spinner is present initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // Wait for it to be removed — cleaner than polling
    // The callback must use queryBy (returns null) not getBy (throws when gone)
    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'))

    // Now results should be there
    expect(screen.getAllByRole('article')).toHaveLength(FAKE_RESULTS.length)
  })

  test('Notification auto-dismisses (with fake timers)', async () => {
    vi.useFakeTimers()
    render(<Notification message="Saved!" duration={3000} />)

    // The notification is present
    expect(screen.getByRole('status')).toHaveTextContent('Saved!')

    // Advance the fake clock — the timeout fires
    vi.advanceTimersByTime(3000)

    // TODO: wait for the notification to be removed
    // Note: we need to wait even with fake timers because React needs to
    // process the state update. waitForElementToBeRemoved handles this.
    // Hint: await waitForElementToBeRemoved(() => screen.queryByRole('status'))
    expect(true).toBe(true) // replace

    vi.useRealTimers()
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 5 — Testing error states
//
// Override MSW to return errors and assert on the error UI.
// ─────────────────────────────────────────────────────────────
describe('Exercise 5: Async error states', () => {
  test('shows error alert when search API returns 500', async () => {
    // Override the default handler for this test
    server.use(
      http.get('/api/search', () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 })
      )
    )

    render(<SearchResults query="react" />)

    // TODO: wait for the error alert and check its content
    // Hint: const alert = await screen.findByRole('alert')
    //       expect(alert).toHaveTextContent(/search failed: 500/i)
    expect(true).toBe(true) // replace
  })

  test('no error shown on successful search (negative assertion)', async () => {
    render(<SearchResults query="react" />)
    await screen.findAllByRole('article')

    // TODO: assert there is NO error alert in the DOM
    // Remember: use queryByRole, not getByRole
    expect(true).toBe(true) // replace
  })

  test('SaveButton shows error text on rejected save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()

    render(<SaveButton onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    // TODO: wait for the error state button text
    expect(true).toBe(true) // replace: await screen.findByRole('button', { name: /failed/i })
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 6 — Anti-patterns to avoid
// ─────────────────────────────────────────────────────────────
describe('Exercise 6: Anti-patterns', () => {
  test('NEVER use setTimeout delays in tests — this is the wrong way', async () => {
    render(<SearchResults query="react" />)

    // ❌ WRONG: arbitrary time-based wait — fragile and slow
    // await new Promise(resolve => setTimeout(resolve, 500))
    // expect(screen.getAllByRole('article')).toHaveLength(3)

    // ✓ CORRECT: findBy waits exactly as long as needed, no more
    const articles = await screen.findAllByRole('article')
    expect(articles).toHaveLength(FAKE_RESULTS.length)

    // findBy completes as soon as the elements appear — no wasted time.
  })

  test('asserting too early after async action gives false positives', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SaveButton onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    // ❌ Wrong: the async save hasn't completed yet — this might see 'Saving...'
    // expect(screen.getByRole('button')).toHaveTextContent('Saved ✓')

    // ✓ Correct: wait for the specific text to appear
    expect(await screen.findByRole('button', { name: /saved/i })).toBeInTheDocument()
  })
})
