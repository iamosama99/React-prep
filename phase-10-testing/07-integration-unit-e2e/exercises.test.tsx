// ============================================================
// Exercises: Integration vs Unit vs E2E Testing
//
// Run: npm test  |  Watch: npm run test:watch
//
// This file covers unit tests and integration tests.
// See exercises.spec.ts for the Playwright E2E exercises.
//
// The testing trophy in action:
//   Unit: calculateSubtotal, applyPromoCode, calculateTotal
//   Integration: ProductList + CartSummary + CartContext together
//   E2E: Full checkout flow (separate spec file)
// ============================================================

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect } from 'vitest'
import { useState, createContext, useContext, useCallback } from 'react'

// ─── Pure Functions ────────────────────────────────────────────
type CartItem = { id: string; name: string; price: number; qty: number }

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

function applyPromoCode(subtotal: number, code: string): number {
  const discounts: Record<string, number> = { SAVE10: 0.1, SAVE20: 0.2, HALFOFF: 0.5 }
  const discount = discounts[code.toUpperCase()]
  if (!discount) throw new Error(`Invalid promo code: ${code}`)
  return parseFloat((subtotal * (1 - discount)).toFixed(2))
}

function calculateTax(amount: number, taxRate = 0.08): number {
  return parseFloat((amount * taxRate).toFixed(2))
}

function calculateTotal(subtotal: number, tax: number, shipping = 5.99): number {
  return parseFloat((subtotal + tax + shipping).toFixed(2))
}

// ─── Context + Components ─────────────────────────────────────
type CartState = {
  items: CartItem[]
  promoCode: string | null
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string) => void
  applyCode: (code: string) => void
  clearCode: () => void
}

const CartContext = createContext<CartState | null>(null)

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === item.id)
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
  }, [])
  const removeItem = useCallback((id: string) => setItems(prev => prev.filter(i => i.id !== id)), [])
  const applyCode = useCallback((code: string) => setPromoCode(code), [])
  const clearCode = useCallback(() => setPromoCode(null), [])
  return <CartContext.Provider value={{ items, promoCode, addItem, removeItem, applyCode, clearCode }}>{children}</CartContext.Provider>
}

function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}

const PRODUCTS: Omit<CartItem, 'qty'>[] = [
  { id: 'book-1', name: 'React Deep Dive', price: 49.99 },
  { id: 'book-2', name: 'TypeScript Guide', price: 39.99 },
  { id: 'book-3', name: 'Testing Workshop', price: 29.99 },
]

function ProductList() {
  const { addItem } = useCart()
  return (
    <ul aria-label="Products">
      {PRODUCTS.map(p => (
        <li key={p.id}>
          <span>{p.name}</span>
          <button onClick={() => addItem(p)} aria-label={`Add ${p.name} to cart`}>Add to cart</button>
        </li>
      ))}
    </ul>
  )
}

function CartSummary() {
  const { items, promoCode, removeItem, applyCode, clearCode } = useCart()
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const subtotal = calculateSubtotal(items)
  const discounted = promoCode ? applyPromoCode(subtotal, promoCode) : subtotal
  const tax = calculateTax(discounted)
  const total = calculateTotal(discounted, tax)

  function handleApplyCode() {
    try {
      applyPromoCode(subtotal, codeInput)
      applyCode(codeInput)
      setCodeError(null)
    } catch (e) { setCodeError((e as Error).message) }
  }

  return (
    <section aria-label="Cart summary">
      <h2>Cart ({items.length} items)</h2>
      {items.length === 0 && <p>Your cart is empty</p>}
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.name} × {item.qty}
            <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>×</button>
          </li>
        ))}
      </ul>
      <div>
        <input type="text" aria-label="Promo code" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} />
        <button onClick={handleApplyCode}>Apply code</button>
        {promoCode && <button onClick={clearCode}>Remove code</button>}
        {codeError && <p role="alert">{codeError}</p>}
      </div>
      <dl>
        <dt>Total</dt><dd aria-label="order total">${total}</dd>
      </dl>
    </section>
  )
}

function ShopApp() {
  return (
    <CartProvider>
      <ProductList />
      <CartSummary />
    </CartProvider>
  )
}

// ─────────────────────────────────────────────────────────────
// UNIT TESTS — pure functions with no rendering
//
// These are worth writing because:
// - They have many edge cases (edge cases are cheap to test as units)
// - The logic is pure: no DOM, no async, no mocking needed
// - They're the foundation that the integration tests build on
// ─────────────────────────────────────────────────────────────
describe('Unit: calculateSubtotal', () => {
  test('sums price × qty for all items', () => {
    const items: CartItem[] = [
      { id: '1', name: 'A', price: 10, qty: 2 },
      { id: '2', name: 'B', price: 5, qty: 3 },
    ]
    expect(calculateSubtotal(items)).toBe(35)
  })

  test('returns 0 for an empty cart', () => {
    expect(calculateSubtotal([])).toBe(0)
  })

  test('handles qty of 1 correctly', () => {
    expect(calculateSubtotal([{ id: '1', name: 'A', price: 29.99, qty: 1 }])).toBe(29.99)
  })
})

describe('Unit: applyPromoCode', () => {
  test('SAVE10 applies 10% discount', () => {
    expect(applyPromoCode(100, 'SAVE10')).toBe(90)
  })

  test('is case-insensitive', () => {
    // TODO: test that 'save10' works the same as 'SAVE10'
    expect(true).toBe(true) // replace
  })

  test('throws for an invalid code', () => {
    // TODO: assert that applyPromoCode(100, 'INVALID') throws
    // Remember: wrap in arrow function!
    expect(true).toBe(true) // replace
  })

  test('HALFOFF applies 50% discount', () => {
    // TODO: test HALFOFF on a $200 subtotal → should be $100
    expect(true).toBe(true) // replace
  })
})

describe('Unit: calculateTotal', () => {
  test('adds subtotal + tax + shipping', () => {
    expect(calculateTotal(100, 8, 5.99)).toBe(113.99)
  })

  test('uses 5.99 as default shipping', () => {
    // TODO: call calculateTotal(100, 8) without shipping arg and verify
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// INTEGRATION TESTS — components + context together
//
// These tests don't know or care about:
// - Which component holds which state
// - Whether it's Redux, Context, or useState
// - Internal function names or component structure
//
// They test: can the user add items and see the cart update?
// ─────────────────────────────────────────────────────────────
describe('Integration: Shopping cart', () => {
  test('cart starts empty', () => {
    render(<ShopApp />)
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByText('Cart (0 items)')).toBeInTheDocument()
  })

  test('clicking "Add to cart" adds the item to the cart', async () => {
    const user = userEvent.setup()
    render(<ShopApp />)

    await user.click(screen.getByRole('button', { name: /add react deep dive/i }))

    // TODO: assert the cart shows "1 items" (or "Cart (1 items)")
    expect(true).toBe(true) // replace

    // TODO: assert "React Deep Dive" appears in the cart list
    expect(true).toBe(true) // replace
  })

  test('adding the same item twice increments quantity', async () => {
    const user = userEvent.setup()
    render(<ShopApp />)

    const addBtn = screen.getByRole('button', { name: /add react deep dive/i })
    await user.click(addBtn)
    await user.click(addBtn)

    // TODO: assert "React Deep Dive × 2" appears
    expect(true).toBe(true) // replace
  })

  test('removing an item removes it from the cart', async () => {
    const user = userEvent.setup()
    render(<ShopApp />)

    await user.click(screen.getByRole('button', { name: /add react deep dive/i }))
    // Scope to cart section — product list also shows the same name
    const cart = screen.getByRole('region', { name: /cart summary/i })
    expect(within(cart).getByText(/react deep dive/i)).toBeInTheDocument()

    // TODO: click the remove button for "React Deep Dive"
    // Hint: getByRole('button', { name: /remove react deep dive/i })
    expect(true).toBe(true) // replace

    // TODO: assert the cart shows "Your cart is empty"
    expect(true).toBe(true) // replace
  })

  test('applying a valid promo code shows discount info', async () => {
    const user = userEvent.setup()
    render(<ShopApp />)

    // Add an item first (promo code on empty cart may throw)
    await user.click(screen.getByRole('button', { name: /add react deep dive/i }))

    const input = screen.getByRole('textbox', { name: /promo code/i })
    await user.type(input, 'SAVE10')
    await user.click(screen.getByRole('button', { name: /apply code/i }))

    // TODO: assert no error alert
    // TODO: assert "Remove code" button appears
    expect(true).toBe(true) // replace
  })

  test('applying an invalid promo code shows an error', async () => {
    const user = userEvent.setup()
    render(<ShopApp />)

    await user.click(screen.getByRole('button', { name: /add react deep dive/i }))

    const input = screen.getByRole('textbox', { name: /promo code/i })
    await user.type(input, 'BADCODE')
    await user.click(screen.getByRole('button', { name: /apply code/i }))

    // TODO: assert the error alert appears with relevant text
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// REFLECTION EXERCISE — classify these tests
//
// Read each scenario and decide: unit, integration, or E2E?
// Then write the appropriate test for each.
// ─────────────────────────────────────────────────────────────
describe('Classification exercise', () => {
  test('validateEmailDomain — unit or integration?', () => {
    // Scenario: a pure function that validates email domains
    // It has 8 edge cases. Should you test via the signup form or as a unit?
    //
    // Answer: UNIT — pure logic with many edge cases.
    // Testing all 8 through the form = 8 full component renders + user interactions.
    // Testing as a unit = 8 calls, no DOM, instant.
    //
    // The form only needs ONE integration test: "valid email submits, invalid shows error".

    function validateEmailDomain(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('+')
    }

    expect(validateEmailDomain('alice@example.com')).toBe(true)
    expect(validateEmailDomain('alice+tag@example.com')).toBe(false)
    expect(validateEmailDomain('notanemail')).toBe(false)
  })

  test('ProductCard "Add to cart" button — unit or integration?', () => {
    // Scenario: test that clicking "Add to cart" on a ProductCard calls onAddToCart.
    //
    // A unit test that mounts ProductCard and checks onAddToCart(vi.fn()) is called:
    // - Tests the mock, not real behavior
    // - Doesn't verify the cart actually updates
    // - Survives refactors that change HOW the cart is updated
    //
    // An integration test that renders ProductCard + CartContext and verifies the
    // cart count increments:
    // - Tests the observable behavior
    // - Survives implementation refactors
    // - Gives more confidence
    //
    // Verdict: INTEGRATION — the behavior crosses component boundaries.
    expect(true).toBe(true) // reflection only
  })
})
