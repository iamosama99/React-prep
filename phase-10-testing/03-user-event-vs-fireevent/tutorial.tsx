// ============================================================
// Topic:   user-event vs fireEvent
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// These components are the TEST TARGETS in exercises.test.tsx.
// The key behaviors exercised: key filtering, paste blocking,
// tab focus order, and character-by-character validation.
//
// Run in browser:   npm run tutorial 03-user-event-vs-fireevent
// Run the tests:    npm test
// ============================================================

import { useState, FC, KeyboardEvent, ClipboardEvent, useRef } from 'react'

// ─── Component 1: NumberInput ────────────────────────────────
// Blocks the 'e' key (prevents scientific notation like "1e5").
// fireEvent.change bypasses this — userEvent.type catches it.

export function NumberInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault() // the key filter under test
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label="Enter a number"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

// ─── Component 2: TagInput ───────────────────────────────────
// Adds a tag when user presses Enter or comma.
// Paste is blocked (prevents multiple tags in one paste).

export function TagInput() {
  const [tags, setTags] = useState<string[]>([])
  const [input, setInput] = useState('')

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = input.trim()
      if (trimmed && !tags.includes(trimmed)) {
        setTags(prev => [...prev, trimmed])
        setInput('')
      }
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault() // paste is blocked — must type manually
  }

  return (
    <div>
      <label htmlFor="tag-input">Tags (press Enter or comma to add)</label>
      <div role="list" aria-label="Added tags">
        {tags.map(tag => (
          <span key={tag} role="listitem" style={{ marginRight: '0.5rem', background: '#e0f0ff', padding: '2px 8px', borderRadius: '999px' }}>
            {tag}
          </span>
        ))}
      </div>
      <input
        id="tag-input"
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="Type a tag..."
      />
    </div>
  )
}

// ─── Component 3: FocusTracker ───────────────────────────────
// Tab-navigable form — tests use userEvent.tab() to move focus.

export function FocusTracker() {
  const [focused, setFocused] = useState<string | null>(null)

  const track = (name: string) => () => setFocused(name)

  return (
    <form aria-label="Focus test form">
      <p>Currently focused: <strong>{focused ?? 'none'}</strong></p>
      <label>
        First name
        <input type="text" onFocus={track('first-name')} />
      </label>
      <label>
        Last name
        <input type="text" onFocus={track('last-name')} />
      </label>
      <label>
        Email
        <input type="email" onFocus={track('email')} />
      </label>
      <button type="submit" onFocus={track('submit')}>Submit</button>
    </form>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  const [numVal, setNumVal] = useState('')

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>user-event vs fireEvent</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Three components with interaction behaviors that <strong>fireEvent can't test accurately</strong>.
        Open <code>exercises.test.tsx</code> to see why.
      </p>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>NumberInput — blocks 'e'</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Try typing "1e5" — the 'e' should be swallowed.</p>
        <NumberInput value={numVal} onChange={setNumVal} />
        <p>Value: <code>{numVal || '(empty)'}</code></p>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>TagInput — Enter adds tags, paste blocked</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Type "react" → Enter. Try pasting — it's blocked.</p>
        <TagInput />
      </section>

      <section style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>FocusTracker — Tab navigation</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Tab through the form fields and watch the focus indicator.</p>
        <FocusTracker />
      </section>

      <section style={{ background: '#fffbe6', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
        <h2>Why this matters</h2>
        <ul style={{ lineHeight: '2', margin: 0 }}>
          <li><code>fireEvent.change(input, {'{'} target: {'{'} value: '1e5' {'}'} {'}'})</code> bypasses onKeyDown — the 'e' block is invisible</li>
          <li><code>userEvent.type(input, '1e5')</code> fires keydown → the 'e' is actually prevented</li>
          <li><code>userEvent.keyboard('{'{'}Enter{'}'})</code> fires the full key event sequence</li>
          <li><code>userEvent.tab()</code> moves real focus through the DOM</li>
          <li><code>userEvent.paste(...)</code> fires a real paste event — the block is testable</li>
        </ul>
      </section>
    </div>
  )
}

export default App
