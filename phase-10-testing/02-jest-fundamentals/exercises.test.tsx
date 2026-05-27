// ============================================================
// Exercises: Jest / Vitest Fundamentals
//
// Run: npm test (from project root)
// Watch: npm run test:watch
//
// These exercises cover the core Jest API without any DOM.
// Pure functions, mock functions, spies, fake timers.
// ============================================================

import { describe, test, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Functions Under Test ─────────────────────────────────────
// Identical to tutorial.tsx — self-contained for test isolation.

function calculateTotal(items: { price: number; qty: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

function applyDiscount(total: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new RangeError('Discount must be between 0 and 100')
  }
  return parseFloat((total * (1 - discountPercent / 100)).toFixed(2))
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Matchers
//
// The right matcher communicates intent AND catches the right bugs.
// Learn when each one applies.
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: Matchers', () => {
  // ── 1a: toBe vs toEqual ──────────────────────────────────────
  test('toBe works for primitives but not objects', () => {
    // These pass — primitives use Object.is
    expect(calculateTotal([{ price: 10, qty: 2 }])).toBe(20)
    expect(formatCurrency(9.99)).toBe('$9.99')

    // TODO: Two different object literals with the same content are NOT toBe equal.
    // This would FAIL: expect({ id: 1 }).toBe({ id: 1 })
    // Fix: use toEqual for deep structural equality.
    // Write a test here that compares two objects with toEqual:
    // expect({ price: 10, qty: 2 }).toEqual(???)
    expect(true).toBe(true) // replace with real assertion
  })

  // ── 1b: toMatchObject — partial shape ─────────────────────────
  test('toMatchObject checks a subset of properties', () => {
    const cartItem = { name: 'TypeScript Book', price: 29.99, qty: 2, inStock: true }

    // TODO: Assert that cartItem has { price: 29.99, qty: 2 }
    // using toMatchObject (the extra properties are irrelevant to the assertion)
    expect(true).toBe(true) // replace

    // This is useful when a function returns a large object and
    // you only care about specific fields.
  })

  // ── 1c: toBeCloseTo — floating-point arithmetic ───────────────
  test('floating-point totals need toBeCloseTo, not toBe', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE 754 — toBe would fail
    const items = [{ price: 0.1, qty: 1 }, { price: 0.2, qty: 1 }]

    // TODO: use toBeCloseTo instead of toBe
    // expect(calculateTotal(items)).toBeCloseTo(???, 2)  // 2 decimal places
    expect(true).toBe(true) // replace

    // Also true for currency: $9.99 * 3 = $29.97 but floats can drift.
  })

  // ── 1d: toThrow — wrapping the call ───────────────────────────
  test('applyDiscount throws for out-of-range discounts', () => {
    // COMMON MISTAKE: expect(applyDiscount(100, -1)).toThrow()
    // This throws BEFORE expect() gets to evaluate — the test crashes.
    // You must wrap the call in a function:

    // TODO: Fix this — wrap in an arrow function
    // expect(() => applyDiscount(100, -1)).toThrow(RangeError)
    // expect(() => applyDiscount(100, 150)).toThrow('Discount must be between 0 and 100')
    expect(true).toBe(true) // replace

    // Note: passing a string to toThrow checks that the message CONTAINS that string.
    // Passing a class checks that the thrown error IS an instance of that class.
  })

  // ── 1e: resolves / rejects — async matchers ───────────────────
  test('async functions use resolves/rejects matchers', async () => {
    // fetchUser makes a real network call — we mock fetch in later exercises.
    // For now, just understand the syntax:

    // For a function that resolves:
    // await expect(somePromise).resolves.toEqual({ id: 1 })

    // For a function that rejects:
    // await expect(someFailingPromise).rejects.toThrow('Not found')

    // TODO: Write a test for a simple async utility:
    async function delay(ms: number): Promise<string> {
      return new Promise(resolve => setTimeout(() => resolve(`done after ${ms}ms`), ms))
    }
    // (With real timers this takes 10ms — acceptable for a unit test)
    await expect(delay(10)).resolves.toBe('done after 10ms')
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Mock Functions (vi.fn)
//
// Mock functions let you test that callbacks are called correctly
// without writing real implementations.
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: Mock functions with vi.fn()', () => {
  test('records how many times it was called', () => {
    const onItemAdded = vi.fn()

    // Simulating adding 3 items to a cart
    onItemAdded({ id: 1, name: 'Book' })
    onItemAdded({ id: 2, name: 'Pen' })
    onItemAdded({ id: 3, name: 'Notebook' })

    // TODO: assert it was called 3 times
    expect(true).toBe(true) // replace: expect(onItemAdded).toHaveBeenCalledTimes(?)
  })

  test('records what arguments it was called with', () => {
    const onDiscount = vi.fn()

    onDiscount(100, 20)  // apply 20% to $100
    onDiscount(50, 10)   // apply 10% to $50

    // TODO: assert it was called with (100, 20) at some point
    // Hint: toHaveBeenCalledWith checks ANY call, not just the last
    expect(true).toBe(true) // replace

    // TODO: assert the LAST call was (50, 10)
    // Hint: toHaveBeenLastCalledWith
    expect(true).toBe(true) // replace
  })

  test('controlling return values', () => {
    const getPrice = vi.fn()

    // TODO: Make getPrice return 29.99 for the first call, 49.99 for the second
    // Hint: mockReturnValueOnce chains
    // getPrice.mockReturnValueOnce(29.99).mockReturnValueOnce(49.99)

    // Then assert:
    // expect(getPrice()).toBe(29.99)
    // expect(getPrice()).toBe(49.99)
    expect(true).toBe(true) // replace
  })

  test('mock resolves a promise', async () => {
    type User = { id: number; name: string }
    const fetchUser = vi.fn<() => Promise<User>>()

    // TODO: Make fetchUser resolve with { id: 1, name: 'Alice' }
    // Hint: mockResolvedValue (not mockReturnValue — that would return the Promise object)
    fetchUser.mockResolvedValue({ id: 1, name: 'Alice' })

    const result = await fetchUser()
    // TODO: Assert result equals { id: 1, name: 'Alice' }
    expect(true).toBe(true) // replace
  })

  test('mock inspects the raw call record', () => {
    const processOrder = vi.fn()

    processOrder('order-1', { total: 99.99, items: 3 })
    processOrder('order-2', { total: 49.50, items: 1 })

    // Direct call record access (less common but useful for complex assertions)
    // TODO: verify processOrder.mock.calls[0][0] is 'order-1'
    expect(processOrder.mock.calls[0][0]).toBe('order-1')

    // TODO: verify the second call's total using mock.calls
    // expect(processOrder.mock.calls[1][1].total).toBe(???)
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Spies (vi.spyOn)
//
// Spies wrap EXISTING methods — you track them without replacing
// their whole module. Always restore after the test.
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: Spies with vi.spyOn()', () => {
  test('spy on console.error to suppress and track it', () => {
    // Error boundaries call console.error — we want to suppress it in tests
    // but also verify it was called.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Simulate code that calls console.error
    console.error('Something went wrong', { code: 500 })

    // TODO: assert console.error was called
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // TODO: assert it was called with a message containing 'wrong'
    // Hint: toHaveBeenCalledWith(expect.stringContaining('wrong'), ...)
    expect(true).toBe(true) // replace

    // Always restore spies — otherwise the mock bleeds into other tests
    consoleSpy.mockRestore()
  })

  test('spy on Date to freeze time', () => {
    // Code that uses Date.now() — spy to make it deterministic
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2025-01-01').getTime())

    const timestamp = Date.now()

    // TODO: assert timestamp equals the mocked value
    expect(timestamp).toBe(new Date('2025-01-01').getTime())

    dateSpy.mockRestore()
  })

  test('spy preserves the original implementation by default', () => {
    // Without mockImplementation, the spy wraps the real method
    const mathSpy = vi.spyOn(Math, 'max')

    const result = Math.max(3, 7, 2) // real Math.max still runs

    expect(result).toBe(7)
    expect(mathSpy).toHaveBeenCalledWith(3, 7, 2)

    mathSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Fake Timers
//
// Test time-dependent code without actually waiting.
// The fake clock is fully controlled by you.
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: Fake timers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('debounce does not fire immediately', () => {
    const callback = vi.fn()
    const debounced = debounce(callback, 500)

    debounced('first call')

    // The callback should NOT have been called yet
    expect(callback).not.toHaveBeenCalled()

    // TODO: advance the clock by 499ms — still should not fire
    // vi.advanceTimersByTime(499)
    // expect(callback).not.toHaveBeenCalled()
    expect(true).toBe(true) // replace
  })

  test('debounce fires exactly once after the delay', () => {
    const callback = vi.fn()
    const debounced = debounce(callback, 500)

    debounced('call 1')
    debounced('call 2')
    debounced('call 3')

    // Three rapid calls — only the last one should fire

    // TODO: advance the clock by 500ms
    // vi.advanceTimersByTime(500)

    // TODO: assert callback was called exactly once
    // TODO: assert it was called with 'call 3' (the last value)
    expect(true).toBe(true) // replace
  })

  test('debounce resets the timer on each call', () => {
    const callback = vi.fn()
    const debounced = debounce(callback, 300)

    debounced('a')
    vi.advanceTimersByTime(200) // 200ms elapsed, no fire
    debounced('b')              // resets the timer
    vi.advanceTimersByTime(200) // 200ms after 'b', still no fire (total 400ms but reset!)

    expect(callback).not.toHaveBeenCalled()

    // TODO: advance the remaining 100ms to complete the 300ms window
    // vi.advanceTimersByTime(100)
    // expect(callback).toHaveBeenCalledWith('b')
    expect(true).toBe(true) // replace
  })

  test('vi.runAllTimers fires all pending timers', () => {
    const first = vi.fn()
    const second = vi.fn()

    setTimeout(first, 100)
    setTimeout(second, 500)

    // TODO: use vi.runAllTimers() to fire everything at once
    // then assert both were called
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 5 — Setup & Teardown with beforeEach/afterEach
//
// Understand when each lifecycle hook fires and what to put in it.
// ─────────────────────────────────────────────────────────────
describe('Exercise 5: Test lifecycle', () => {
  // A simple in-memory "database"
  let db: Map<number, { name: string }>

  // beforeEach runs before EVERY test in this describe block
  beforeEach(() => {
    db = new Map()
    db.set(1, { name: 'Alice' })
    db.set(2, { name: 'Bob' })
  })

  // afterEach: clear mocks so call history doesn't bleed between tests
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('finds a user by id', () => {
    expect(db.get(1)).toEqual({ name: 'Alice' })
  })

  test('can add a new user and the DB is fresh (not from previous test)', () => {
    db.set(3, { name: 'Carol' })
    expect(db.size).toBe(3)
  })

  test('DB starts fresh — previous test adding Carol is gone', () => {
    // beforeEach re-creates the db with only Alice and Bob
    // TODO: assert db.size is 2
    expect(true).toBe(true) // replace
  })

  // The difference between clear/reset/restore:
  test('clearAllMocks vs resetAllMocks vs restoreAllMocks (comment exercise)', () => {
    const spy = vi.fn().mockReturnValue('original')

    // vi.clearAllMocks() — clears call history, keeps the implementation
    // After clear: spy.mock.calls is [], but spy() still returns 'original'

    // vi.resetAllMocks() — clears call history AND removes mockReturnValue
    // After reset: spy.mock.calls is [], spy() returns undefined

    // vi.restoreAllMocks() — like reset, plus restores spied-on originals
    // Use when you have vi.spyOn() calls — restores the original method

    // TODO: call spy twice, then clearAllMocks, then assert call count is 0
    // but spy() still returns its value
    spy()
    spy()
    expect(spy).toHaveBeenCalledTimes(2)
    vi.clearAllMocks()
    // TODO: verify call count is now 0
    expect(true).toBe(true) // replace: expect(spy).toHaveBeenCalledTimes(0)
  })
})
