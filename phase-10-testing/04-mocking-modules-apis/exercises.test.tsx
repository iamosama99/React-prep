// ============================================================
// Exercises: Mocking Modules & APIs
//
// Run: npm test  |  Watch: npm run test:watch
//
// Two strategies for mocking API calls:
//   Exercise 1-2: vi.mock() — replace the function at module level
//   Exercise 3-4: MSW — intercept at the network level
//
// Note on MSW: The server setup below works with msw v2 (bundled in dev deps).
// ============================================================

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { useState, useEffect } from 'react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// ─── Types ────────────────────────────────────────────────────
type User = { id: number; name: string; email: string; role: 'admin' | 'user' }

// ─── Fake api module (represents a real api.ts in your codebase) ──
// In a real project, you'd import from '@/api' and vi.mock('@/api').
// Here we define it inline and show the mocking pattern directly.

const api = {
  async fetchUser(id: number): Promise<User> {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  async updateUserRole(id: number, role: User['role']): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
}

// Date utils — partially mocked in Exercise 2
const dateUtils = {
  getCurrentDate: () => new Date(),
  formatDateRelative(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  },
}

// ─── Components ───────────────────────────────────────────────
function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.fetchUser(userId)
      .then(data => { if (!cancelled) { setUser(data); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <p role="status">Loading user...</p>
  if (error) return <p role="alert">{error}</p>
  return (
    <article aria-label={`${user?.name}'s card`}>
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
      <span aria-label="role badge">{user?.role}</span>
    </article>
  )
}

function LastModified({ date }: { date: Date }) {
  return <time dateTime={date.toISOString()}>{dateUtils.formatDateRelative(date)}</time>
}

// ─── MSW Server setup ─────────────────────────────────────────
// Default handlers — success cases. Individual tests override for errors.
const defaultHandlers = [
  http.get('/api/users/:id', ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json({
      id,
      name: id === 1 ? 'Alice Chen' : 'Bob Kim',
      email: id === 1 ? 'alice@example.com' : 'bob@example.com',
      role: id === 1 ? 'admin' : 'user',
    } satisfies User)
  }),
  http.patch('/api/users/:id', async ({ params, request }) => {
    const id = Number(params.id)
    const body = await request.json() as Partial<User>
    return HttpResponse.json({
      id, name: 'Alice Chen', email: 'alice@example.com', role: body.role ?? 'user',
    } satisfies User)
  }),
]

const server = setupServer(...defaultHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers()) // clear test-specific overrides
afterAll(() => server.close())

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Module mock with vi.spyOn (function-level mock)
//
// Instead of vi.mock() which needs module hoisting, we spy on
// object methods directly — same mental model, works inline.
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: Spy-based module mock', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('UserCard displays user name when fetch succeeds', async () => {
    // TODO: spy on api.fetchUser and make it resolve with test data
    // Hint: vi.spyOn(api, 'fetchUser').mockResolvedValue({ id: 1, name: 'Alice Chen', email: 'alice@example.com', role: 'admin' })

    render(<UserCard userId={1} />)

    // Loading state appears immediately
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)

    // TODO: wait for the name to appear
    // Hint: await screen.findByRole('heading', { name: 'Alice Chen' })
    expect(true).toBe(true) // replace
  })

  test('UserCard shows error when fetch rejects', async () => {
    // TODO: spy on api.fetchUser and make it reject
    // Hint: vi.spyOn(api, 'fetchUser').mockRejectedValue(new Error('HTTP 500'))

    render(<UserCard userId={99} />)

    // TODO: wait for the error message (role="alert")
    // Hint: const alert = await screen.findByRole('alert')
    //       expect(alert).toHaveTextContent(/HTTP 500/i)
    expect(true).toBe(true) // replace
  })

  test('fetchUser is called with the correct userId', async () => {
    const spy = vi.spyOn(api, 'fetchUser').mockResolvedValue({
      id: 42, name: 'Carol', email: 'carol@example.com', role: 'user',
    })

    render(<UserCard userId={42} />)
    await screen.findByRole('heading', { name: 'Carol' })

    // TODO: assert fetchUser was called with 42
    expect(true).toBe(true) // replace: expect(spy).toHaveBeenCalledWith(42)
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Partial mock (keep real, override one)
//
// You want getCurrentDate() to return a fixed date, but
// formatDateRelative() should use the real implementation.
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: Partial mock — spy on one, keep the rest', () => {
  afterEach(() => vi.restoreAllMocks())

  test('formatDateRelative says "just now" for the current date', () => {
    // TODO: spy on dateUtils.getCurrentDate to return a fixed Date
    // Freeze time so the test is deterministic.
    // Hint: const fixedDate = new Date('2025-01-15T12:00:00Z')
    //       vi.spyOn(dateUtils, 'getCurrentDate').mockReturnValue(fixedDate)
    //
    // Also mock Date.now() so formatDateRelative calculation is consistent:
    //       vi.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime())

    // Then render and assert "just now":
    // render(<LastModified date={dateUtils.getCurrentDate()} />)
    // expect(screen.getByRole('time')).toHaveTextContent('just now')
    expect(true).toBe(true) // replace
  })

  test('formatDateRelative uses the REAL implementation (not mocked)', () => {
    // The key: we only mocked getCurrentDate, not formatDateRelative.
    // The real formatDateRelative should still work correctly.
    const oneHourAgo = new Date(Date.now() - 61 * 60 * 1000)
    render(<LastModified date={oneHourAgo} />)
    expect(screen.getByRole('time')).toHaveTextContent('1h ago')
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — MSW: test success state at the network level
//
// MSW intercepts the real fetch() call inside the component.
// No need to mock fetchUser at all — the component works normally,
// the response is just controlled.
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: MSW — success and loading states', () => {
  test('UserCard renders user data from MSW-intercepted response', async () => {
    // The default MSW handler returns Alice for userId=1.
    // No mocking needed — just render and wait.
    render(<UserCard userId={1} />)

    // Loading state appears immediately
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i)

    // TODO: wait for Alice's name to appear
    // The MSW handler returns her name — same as a real API response
    expect(true).toBe(true) // replace: await screen.findByRole('heading', { name: 'Alice Chen' })
  })

  test('UserCard renders the role badge', async () => {
    render(<UserCard userId={1} />)

    // TODO: wait for the role badge to appear and verify its text
    // Hint: await screen.findByRole(?, { name: 'role badge' })
    //       MSW returns role: 'admin' for id=1
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — MSW: override handlers for error/edge cases
//
// server.use() adds a temporary override that server.resetHandlers()
// (in afterEach) removes. This keeps error tests isolated.
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: MSW — override for error states', () => {
  test('UserCard shows error when API returns 500', async () => {
    // Override the default handler for this specific test
    server.use(
      http.get('/api/users/:id', () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
      )
    )

    render(<UserCard userId={1} />)

    // TODO: wait for the error alert and verify its content
    // Hint: const alert = await screen.findByRole('alert')
    //       expect(alert).toHaveTextContent(/HTTP 500/i)
    expect(true).toBe(true) // replace
  })

  test('UserCard shows error when API returns 404', async () => {
    // TODO: add a server.use() override that returns 404 for any /api/users/:id
    // Then render <UserCard userId={999} /> and assert the error message
    expect(true).toBe(true) // replace
  })

  test('default handler is restored after this test block', async () => {
    // afterEach calls server.resetHandlers() — the 500 override from previous
    // tests is gone. This test should see Alice again.
    render(<UserCard userId={1} />)
    const heading = await screen.findByRole('heading')
    expect(heading).toHaveTextContent('Alice Chen')
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 5 — clearAllMocks vs resetAllMocks cleanup
//
// Understand which reset method to call and when.
// ─────────────────────────────────────────────────────────────
describe('Exercise 5: Mock cleanup strategy', () => {
  test('clearAllMocks clears call history but preserves implementation', () => {
    const spy = vi.spyOn(api, 'fetchUser').mockResolvedValue({
      id: 1, name: 'Alice', email: 'alice@example.com', role: 'user',
    })

    // Two calls
    void api.fetchUser(1)
    void api.fetchUser(2)
    expect(spy).toHaveBeenCalledTimes(2)

    vi.clearAllMocks()
    // Call history cleared, but the mockResolvedValue implementation remains
    expect(spy).toHaveBeenCalledTimes(0)
    // spy() still has the mock implementation — calling it still returns the mocked value

    spy.mockRestore()
  })

  test('resetAllMocks clears BOTH call history AND implementation', () => {
    const spy = vi.spyOn(api, 'fetchUser').mockResolvedValue({
      id: 1, name: 'Alice', email: 'alice@example.com', role: 'user',
    })

    void api.fetchUser(1)
    vi.resetAllMocks()

    // TODO: what is spy.getMockImplementation() after reset?
    // It should be undefined — the mockResolvedValue is gone.
    expect(spy.getMockImplementation()).toBeUndefined()

    spy.mockRestore()
  })
})
