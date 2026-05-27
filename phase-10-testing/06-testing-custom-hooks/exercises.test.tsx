// ============================================================
// Exercises: Testing Custom Hooks
//
// Run: npm test  |  Watch: npm run test:watch
//
// renderHook is the primary tool — it creates a minimal React component
// just to host the hook and gives you result.current for assertions.
// ============================================================

import {
  renderHook,
  act,
  waitFor,
} from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react'

// ─── Hooks Under Test ─────────────────────────────────────────

function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = useCallback(() => setCount(c => c + 1), [])
  const decrement = useCallback(() => setCount(c => c - 1), [])
  const reset = useCallback(() => setCount(initial), [initial])
  return { count, increment, decrement, reset }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function useWindowKeyDown(key: string, handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => { if (e.key === key) handler(e) }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, handler])
}

function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStored(prev => {
      const next = value instanceof Function ? value(prev) : value
      window.localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])
  return [stored, setValue] as const
}

type Theme = 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null)

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const toggle = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), [])
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — renderHook basics + act for state updates
//
// result.current is a live reference — always read it after act().
// Wrap any state-updating call in act().
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: renderHook + act (useCounter)', () => {
  test('starts at the initial value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  test('increments the count', () => {
    const { result } = renderHook(() => useCounter(0))

    // MUST wrap state-updating call in act()
    // Without act(): React warns about state update outside act, result.current may be stale
    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })

  test('decrements below zero is allowed', () => {
    const { result } = renderHook(() => useCounter(0))

    act(() => { result.current.decrement() })

    // TODO: assert count is -1
    expect(true).toBe(true) // replace
  })

  test('multiple state updates in one act()', () => {
    const { result } = renderHook(() => useCounter(0))

    act(() => {
      result.current.increment()
      result.current.increment()
      result.current.increment()
    })

    // All three updates are batched in one act() call
    // TODO: assert count is 3
    expect(true).toBe(true) // replace
  })

  test('reset brings count back to the initial value', () => {
    const { result } = renderHook(() => useCounter(5))

    act(() => {
      result.current.increment()
      result.current.increment()
    })
    expect(result.current.count).toBe(7)

    // TODO: call reset and assert count returns to 5
    expect(true).toBe(true) // replace
  })

  test('result.current is a live reference — do NOT capture before act()', () => {
    const { result } = renderHook(() => useCounter(0))

    // ❌ WRONG pattern (demonstrates the gotcha):
    // const captured = result.current  // captures the OLD reference
    // act(() => result.current.increment())
    // expect(captured.count).toBe(1)   // FAILS — captured is stale

    // ✓ CORRECT: always read from result.current AFTER act()
    act(() => result.current.increment())
    expect(result.current.count).toBe(1) // reads live value
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — rerender: hook behavior when props change
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: rerender with changing props (useDebounce)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('initially returns the starting value', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  test('value does not update immediately after prop change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })

    // Still 'first' — the timer hasn't fired yet
    expect(result.current).toBe('first')
  })

  test('value updates after the delay passes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    // TODO: advance the timer by 300ms (inside act)
    // Hint: act(() => vi.advanceTimersByTime(300))
    expect(true).toBe(true) // replace

    // TODO: assert result.current is 'updated'
    expect(true).toBe(true) // replace
  })

  test('rapid updates only fire once at the end (debounce behavior)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )

    rerender({ value: 'ab' })
    act(() => vi.advanceTimersByTime(100))
    rerender({ value: 'abc' })
    act(() => vi.advanceTimersByTime(100))
    rerender({ value: 'abcd' })

    // Only 200ms total — not yet fired
    expect(result.current).toBe('a')

    // TODO: advance 300ms more (the final debounce window)
    // and assert result.current is 'abcd'
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Cleanup: testing useEffect teardown
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: unmount cleanup (useWindowKeyDown)', () => {
  test('adds event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const handler = vi.fn()

    renderHook(() => useWindowKeyDown('Escape', handler))

    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    addSpy.mockRestore()
  })

  test('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const handler = vi.fn()

    const { unmount } = renderHook(() => useWindowKeyDown('Escape', handler))

    unmount()

    // TODO: assert removeEventListener was called with 'keydown'
    expect(true).toBe(true) // replace

    removeSpy.mockRestore()
  })

  test('handler fires when the correct key is pressed', () => {
    const handler = vi.fn()
    renderHook(() => useWindowKeyDown('Escape', handler))

    // Simulate a keydown event on window
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('handler does NOT fire for other keys', () => {
    const handler = vi.fn()
    renderHook(() => useWindowKeyDown('Escape', handler))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))

    // TODO: assert handler was never called
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Context-dependent hook: the wrapper option
//
// useTheme throws if rendered outside ThemeProvider.
// The wrapper option wraps the hook in the provider.
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: Hooks with context (useTheme)', () => {
  test('throws without a provider', () => {
    // renderHook without a wrapper — useTheme will throw
    expect(() => renderHook(() => useTheme())).toThrow('useTheme must be inside ThemeProvider')
  })

  test('returns the initial theme with wrapper', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    })

    expect(result.current.theme).toBe('light')
  })

  test('toggle changes the theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

    act(() => {
      result.current.toggle()
    })

    // TODO: assert theme is now 'dark'
    expect(true).toBe(true) // replace
  })

  test('toggling twice returns to the original theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

    act(() => { result.current.toggle() })
    act(() => { result.current.toggle() })

    // TODO: assert theme is back to 'light'
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 5 — Async hooks: waitFor for state that updates async
// ─────────────────────────────────────────────────────────────
describe('Exercise 5: useLocalStorage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  test('starts with the initial value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  test('updates the value and persists to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage<string>('test-key', ''))

    act(() => {
      result.current[1]('hello')
    })

    expect(result.current[0]).toBe('hello')
    // TODO: also assert that localStorage.getItem('test-key') returns '"hello"'
    // (JSON-serialized string)
    expect(true).toBe(true) // replace
  })

  test('reads existing localStorage value on init', () => {
    // Seed localStorage before the hook is mounted
    localStorage.setItem('test-key', JSON.stringify('pre-existing'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    // TODO: assert the hook reads 'pre-existing' (not 'default')
    expect(true).toBe(true) // replace
  })

  test('when to test a hook via component vs renderHook', () => {
    // For useLocalStorage: renderHook is the right choice because
    // the value is an abstract data store — there's no natural UI to test through.
    //
    // For useDebounce on a search input: testing through the search component is
    // equally valid — the rendered output (filtered list) IS the observable behavior.
    //
    // Rule of thumb:
    // - renderHook: pure data/logic hooks, or when intermediate states matter
    // - Component: when the hook's behavior is fully expressed through the UI
    expect(true).toBe(true) // conceptual exercise — read and reflect
  })
})
