// ============================================================
// Topic:   E2E with Playwright & Cypress
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// Run in browser:   npm run tutorial 08-e2e-playwright-cypress
//
// The Playwright exercises are in: exercises.spec.ts
// To run them: npx playwright test (requires Playwright installed)
// Install: npx playwright install
//
// E2E tests run against a REAL browser + server.
// These components show what you'd be testing in that real browser.
// ============================================================

import { useState, FC } from 'react'

// ─── What the E2E tests would target ────────────────────────
// A minimal login + dashboard flow — the kind of critical path
// that justifies the cost of an E2E test.

type User = { name: string; email: string }

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email === 'alice@example.com' && password === 'password') {
      onLogin({ name: 'Alice Chen', email })
    } else {
      setError('Invalid credentials')
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Login form">
      <h1>Sign in</h1>
      {error && <p role="alert">{error}</p>}
      <label>
        Email
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      <button type="submit">Log in</button>
    </form>
  )
}

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [count, setCount] = useState(0)

  return (
    <div aria-label="Dashboard">
      <header>
        <h1>Welcome, {user.name}</h1>
        <button onClick={onLogout}>Log out</button>
      </header>
      <main>
        <p>You are logged in as {user.email}</p>
        <section aria-label="Widget">
          <h2>Counter Widget</h2>
          <output>{count}</output>
          <button onClick={() => setCount(c => c + 1)}>Increment</button>
        </section>
      </main>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  const [user, setUser] = useState<User | null>(null)

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      {!user ? (
        <div>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            E2E exercises target this login flow. Use credentials:
            <code> alice@example.com</code> / <code>password</code>
          </p>
          <LoginPage onLogin={setUser} />
        </div>
      ) : (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      )}

      <hr style={{ margin: '2rem 0' }} />

      <section style={{ background: '#fffbe6', padding: '1rem', borderRadius: '8px' }}>
        <h2>E2E vs Integration cheatsheet</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {['', 'E2E (Playwright)', 'Integration (RTL + MSW)'].map(h => (
                <th key={h} style={{ padding: '0.4rem', border: '1px solid #ddd', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Browser', 'Real Chromium/Firefox/WebKit', 'jsdom (simulated)'],
              ['Network', 'Real HTTP (or intercepted)', 'MSW (intercepted)'],
              ['Auth cookies', '✓ Real', '✗ Simulated'],
              ['Speed', '5–30s per test', '20–200ms per test'],
              ['Flakiness', 'Higher', 'Lower'],
              ['Best for', 'Critical user flows', 'Feature behavior'],
            ].map(([label, ...cols]) => (
              <tr key={label}>
                <td style={{ padding: '0.4rem', border: '1px solid #ddd', fontWeight: 'bold' }}>{label}</td>
                {cols.map((c, i) => (
                  <td key={i} style={{ padding: '0.4rem', border: '1px solid #ddd' }}>{c}</td>
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
