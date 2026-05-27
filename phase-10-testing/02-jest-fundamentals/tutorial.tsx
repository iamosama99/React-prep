// ============================================================
// Topic:   Jest / Vitest Fundamentals
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// This file demonstrates the FUNCTIONS you will write tests for.
// Open exercises.test.tsx to work through the test stubs.
//
// Run in browser:   npm run tutorial 02-jest-fundamentals
// Run the tests:    npm test (from project root)
// ============================================================

import { useState, FC } from 'react'

// ─── Pure Functions (tested in exercises.test.tsx) ───────────

export function calculateTotal(items: { price: number; qty: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

export function applyDiscount(total: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new RangeError('Discount must be between 0 and 100')
  }
  return parseFloat((total * (1 - discountPercent / 100)).toFixed(2))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// ─── App: Visual Demo ────────────────────────────────────────
const CART_ITEMS = [
  { name: 'TypeScript Handbook', price: 29.99, qty: 2 },
  { name: 'React Deep Dive', price: 49.99, qty: 1 },
  { name: 'Testing Workshop', price: 39.99, qty: 3 },
]

const App: FC = () => {
  const [discount, setDiscount] = useState(0)
  const [debounced, setDebounced] = useState(0)
  const [raw, setRaw] = useState(0)

  const total = calculateTotal(CART_ITEMS)
  const discounted = applyDiscount(total, discount)
  const debouncedUpdate = debounce((val: unknown) => setDebounced(val as number), 600)

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '680px', margin: '0 auto' }}>
      <h1>Jest/Vitest Fundamentals — Function Reference</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        The functions below are tested in <code>exercises.test.tsx</code>.
        Each exercise targets a specific concept: matchers, mocks, spies, fake timers.
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2>calculateTotal + applyDiscount</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {['Item', 'Price', 'Qty', 'Subtotal'].map(h => (
                <th key={h} style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #ddd' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CART_ITEMS.map(item => (
              <tr key={item.name}>
                {[item.name, `$${item.price}`, item.qty, formatCurrency(item.price * item.qty)].map((v, i) => (
                  <td key={i} style={{ padding: '0.5rem', border: '1px solid #ddd' }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Subtotal: {formatCurrency(total)}</span>
          <label>
            Discount %:{' '}
            <input
              type="number" min={0} max={100} value={discount}
              onChange={e => setDiscount(Number(e.target.value))}
              style={{ width: '60px' }}
            />
          </label>
          <strong>Final: {formatCurrency(discounted)}</strong>
        </div>
      </section>

      <section style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>debounce — tested with fake timers</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Type rapidly — the debounced value only updates 600ms after you stop.
          In tests, <code>vi.useFakeTimers()</code> + <code>vi.advanceTimersByTime(600)</code>
          skips the real wait entirely.
        </p>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '1rem' }}>
          <label>
            Input:{' '}
            <input type="number" value={raw} onChange={e => {
              setRaw(Number(e.target.value))
              debouncedUpdate(Number(e.target.value))
            }} />
          </label>
          <span>Raw: <strong>{raw}</strong></span>
          <span>Debounced (600ms): <strong>{debounced}</strong></span>
        </div>
      </section>

      <section style={{ background: '#fffbe6', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>Key Concepts for exercises.test.tsx</h2>
        <ul style={{ lineHeight: '2', margin: 0 }}>
          <li><strong>toBe</strong> — strict equality (Object.is). Primitives only.</li>
          <li><strong>toEqual</strong> — deep equality. Objects and arrays.</li>
          <li><strong>toMatchObject</strong> — partial object shape match.</li>
          <li><strong>toBeCloseTo</strong> — floating-point: <code>expect(0.1+0.2).toBeCloseTo(0.3)</code></li>
          <li><strong>toThrow</strong> — must wrap in arrow fn: <code>expect(()=&gt;fn()).toThrow()</code></li>
          <li><strong>vi.fn()</strong> — standalone mock; records all calls.</li>
          <li><strong>vi.spyOn(obj, 'method')</strong> — wraps an existing method.</li>
          <li><strong>vi.useFakeTimers()</strong> — controls setTimeout/Date.</li>
          <li><strong>vi.advanceTimersByTime(ms)</strong> — jumps the fake clock.</li>
        </ul>
      </section>
    </div>
  )
}

export default App
