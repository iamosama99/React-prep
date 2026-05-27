// ============================================================
// Topic:   Testing Custom Hooks
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// Run in browser:   npm run tutorial 06-testing-custom-hooks
// Run the tests:    npm test
// ============================================================

import { useState, useEffect, useCallback, useRef, createContext, useContext, FC } from 'react'

// ─── Hooks you will test in exercises.test.tsx ────────────────

// Hook 1: useCounter — simple state + actions
export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial)
  const increment = useCallback(() => setCount(c => c + 1), [])
  const decrement = useCallback(() => setCount(c => c - 1), [])
  const reset = useCallback(() => setCount(initial), [initial])
  return { count, increment, decrement, reset }
}

// Hook 2: useDebounce — deferred value update
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// Hook 3: useLocalStorage — persists to localStorage
export function useLocalStorage<T>(key: string, initialValue: T) {
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

// Hook 4: useWindowKeyDown — cleanup on unmount
export function useWindowKeyDown(key: string, handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => { if (e.key === key) handler(e) }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, handler])
}

// Hook 5: useTheme — context-dependent hook
type Theme = 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const toggle = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), [])
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  const counter = useCounter(0)
  const [input, setInput] = useState('')
  const debounced = useDebounce(input, 500)
  const [name, setName] = useLocalStorage('tutorial-name', 'Anonymous')
  useWindowKeyDown('Escape', () => setInput(''))

  return (
    <ThemeProvider>
      <AppContent
        counter={counter}
        input={input}
        setInput={setInput}
        debounced={debounced}
        name={name}
        setName={setName}
      />
    </ThemeProvider>
  )
}

type AppContentProps = {
  counter: ReturnType<typeof useCounter>
  input: string
  setInput: (v: string) => void
  debounced: string
  name: string
  setName: (v: string | ((prev: string) => string)) => void
}

function AppContent({ counter, input, setInput, debounced, name, setName }: AppContentProps) {
  const { theme, toggle } = useTheme()

  const style = {
    fontFamily: 'system-ui',
    padding: '2rem',
    maxWidth: '640px',
    margin: '0 auto',
    background: theme === 'dark' ? '#1a1a2e' : '#fff',
    color: theme === 'dark' ? '#e0e0e0' : '#333',
    minHeight: '100vh',
  }

  return (
    <div style={style}>
      <h1>Testing Custom Hooks</h1>
      <p style={{ color: theme === 'dark' ? '#aaa' : '#666', marginBottom: '2rem' }}>
        Five hooks to test in <code>exercises.test.tsx</code>. Each one
        targets a different testing challenge: state, timers, localStorage,
        cleanup, and context dependencies.
      </p>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #555', borderRadius: '8px' }}>
        <h2>useCounter</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={counter.decrement}>−</button>
          <strong style={{ fontSize: '1.5rem' }}>{counter.count}</strong>
          <button onClick={counter.increment}>+</button>
          <button onClick={counter.reset}>Reset</button>
        </div>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #555', borderRadius: '8px' }}>
        <h2>useDebounce (500ms)</h2>
        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Press Escape to clear (useWindowKeyDown)</p>
        <input
          type="text"
          aria-label="debounce input"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: '100%', padding: '0.5rem' }}
        />
        <p>Live: <code>{input}</code></p>
        <p>Debounced (500ms): <code>{debounced}</code></p>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #555', borderRadius: '8px' }}>
        <h2>useLocalStorage</h2>
        <input
          type="text"
          aria-label="stored name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '0.5rem' }}
        />
        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
          Stored in localStorage key "tutorial-name". Refresh the page — value persists.
        </p>
      </section>

      <section style={{ padding: '1rem', border: '1px solid #555', borderRadius: '8px' }}>
        <h2>useTheme (context-dependent)</h2>
        <p>Current theme: <strong>{theme}</strong></p>
        <button onClick={toggle}>Toggle theme</button>
      </section>
    </div>
  )
}

export default App
