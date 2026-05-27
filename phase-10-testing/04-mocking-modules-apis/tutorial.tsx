// ============================================================
// Topic:   Mocking Modules & APIs
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// Run in browser:   npm run tutorial 04-mocking-modules-apis
// Run the tests:    npm test
// ============================================================

import { useState, useEffect, FC } from 'react'

// ─── The "api" module that exercises.test.tsx will mock ───────
// In production, this hits the real API.
// In tests, it's replaced with controlled fakes.

export type User = {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

// In a real codebase this would be in a separate api.ts file.
// Here it's inline for the browser demo.
export async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch user: HTTP ${res.status}`)
  return res.json()
}

export async function updateUserRole(id: number, role: User['role']): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to update role: HTTP ${res.status}`)
  return res.json()
}

// ─── Date utilities (partially mocked in Exercise 2) ─────────
export function getCurrentDate(): Date {
  return new Date()
}

export function formatDateRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

// ─── UserCard component (the thing being tested) ─────────────
export function UserCard({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchUser(userId)
      .then(data => { if (!cancelled) { setUser(data); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [userId])

  if (loading) return <p role="status">Loading user...</p>
  if (error) return <p role="alert">{error}</p>
  if (!user) return null

  return (
    <article aria-label={`${user.name}'s card`}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span aria-label="role badge">{user.role}</span>
    </article>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Mocking Modules & APIs</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        <code>UserCard</code> fetches from <code>/api/users/:id</code>. In this browser demo
        it will show a loading error (no real API). In <code>exercises.test.tsx</code>,
        you'll intercept that fetch two ways: module mock and MSW.
      </p>

      <section style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>UserCard (fetches from /api/users/1)</h2>
        <UserCard userId={1} />
      </section>

      <section style={{ background: '#fffbe6', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>Two mocking strategies</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {['', 'Module mock (vi.mock)', 'MSW (network level)'].map(h => (
                <th key={h} style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #ddd' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['What it fakes', 'The function that calls fetch', 'The actual HTTP response'],
              ['Catches wrong URL?', '✗ No', '✓ Yes'],
              ['Catches wrong method?', '✗ No', '✓ Yes'],
              ['Works with any HTTP library?', '✗ Must mock each', '✓ Yes'],
              ['Setup cost', 'Low', 'Medium'],
              ['Best for', 'Unit tests', 'Integration tests'],
            ].map(([label, ...values]) => (
              <tr key={label}>
                <td style={{ padding: '0.5rem', border: '1px solid #ddd', fontWeight: 'bold' }}>{label}</td>
                {values.map((v, i) => (
                  <td key={i} style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default App
