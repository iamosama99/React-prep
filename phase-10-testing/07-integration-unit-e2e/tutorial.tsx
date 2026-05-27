// ============================================================
// Topic:   Integration vs Unit vs E2E Testing
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// Run in browser:   npm run tutorial 07-integration-unit-e2e
// Run the tests:    npm test
// ============================================================

import { useState, FC, createContext, useContext, useCallback } from 'react'

// ─── Business Logic (pure functions → unit tests) ─────────────
export type CartItem = { id: string; name: string; price: number; qty: number }

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

export function applyPromoCode(subtotal: number, code: string): number {
  const discounts: Record<string, number> = {
    SAVE10: 0.1,
    SAVE20: 0.2,
    HALFOFF: 0.5,
  }
  const discount = discounts[code.toUpperCase()]
  if (!discount) throw new Error(`Invalid promo code: ${code}`)
  return parseFloat((subtotal * (1 - discount)).toFixed(2))
}

export function calculateTax(amount: number, taxRate = 0.08): number {
  return parseFloat((amount * taxRate).toFixed(2))
}

export function calculateTotal(subtotal: number, tax: number, shipping = 5.99): number {
  return parseFloat((subtotal + tax + shipping).toFixed(2))
}

// ─── State Management (integration tests) ─────────────────────
type CartState = {
  items: CartItem[]
  promoCode: string | null
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string) => void
  applyCode: (code: string) => void
  clearCode: () => void
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState<string | null>(null)

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const applyCode = useCallback((code: string) => setPromoCode(code), [])
  const clearCode = useCallback(() => setPromoCode(null), [])

  return (
    <CartContext.Provider value={{ items, promoCode, addItem, removeItem, applyCode, clearCode }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}

// ─── UI Components (integration-tested as a unit) ─────────────
const PRODUCTS: Omit<CartItem, 'qty'>[] = [
  { id: 'book-1', name: 'React Deep Dive', price: 49.99 },
  { id: 'book-2', name: 'TypeScript Guide', price: 39.99 },
  { id: 'book-3', name: 'Testing Workshop', price: 29.99 },
]

export function ProductList() {
  const { addItem } = useCart()
  return (
    <ul aria-label="Products">
      {PRODUCTS.map(p => (
        <li key={p.id}>
          <span>{p.name}</span>
          <span>${p.price}</span>
          <button onClick={() => addItem(p)} aria-label={`Add ${p.name} to cart`}>
            Add to cart
          </button>
        </li>
      ))}
    </ul>
  )
}

export function CartSummary() {
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
    } catch (e) {
      setCodeError((e as Error).message)
    }
  }

  return (
    <section aria-label="Cart summary">
      <h2>Cart ({items.length} items)</h2>
      {items.length === 0 && <p>Your cart is empty</p>}
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.name} × {item.qty} = ${(item.price * item.qty).toFixed(2)}
            <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>×</button>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          aria-label="Promo code"
          value={codeInput}
          onChange={e => setCodeInput(e.target.value.toUpperCase())}
          placeholder="SAVE10"
        />
        <button onClick={handleApplyCode}>Apply code</button>
        {promoCode && <button onClick={clearCode}>Remove code</button>}
        {codeError && <p role="alert">{codeError}</p>}
      </div>
      <dl>
        <dt>Subtotal</dt><dd>${subtotal.toFixed(2)}</dd>
        {promoCode && <><dt>Discount ({promoCode})</dt><dd>-${(subtotal - discounted).toFixed(2)}</dd></>}
        <dt>Tax (8%)</dt><dd>${tax}</dd>
        <dt>Shipping</dt><dd>$5.99</dd>
        <dt><strong>Total</strong></dt><dd><strong>${total}</strong></dd>
      </dl>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <CartProvider>
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Integration vs Unit vs E2E</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        One feature — a shopping cart — tested at all three levels in <code>exercises.test.tsx</code>.
        Unit tests cover the pure math functions. Integration tests cover the full cart interaction.
        The Playwright spec covers the critical checkout flow.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h2>Products</h2>
          <ProductList />
        </div>
        <div>
          <CartSummary />
        </div>
      </div>
    </div>
  </CartProvider>
)

export default App
