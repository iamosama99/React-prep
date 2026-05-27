// ============================================================
// Exercises: user-event vs fireEvent
//
// Run: npm test  |  Watch: npm run test:watch
//
// The key insight: fireEvent dispatches ONE synthetic event.
// userEvent simulates the FULL browser event sequence.
// Some components depend on that sequence — these exercises show when.
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect } from 'vitest'
import { useState, KeyboardEvent, ClipboardEvent } from 'react'

// ─── Components Under Test ─────────────────────────────────────

function NumberInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'e' || e.key === 'E') e.preventDefault()
  }
  return (
    <input
      type="text"
      aria-label="Enter a number"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

function TagInput() {
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
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
  }

  return (
    <div>
      <label htmlFor="tag-input">Tags</label>
      <div role="list" aria-label="Added tags">
        {tags.map(tag => (
          <span key={tag} role="listitem">{tag}</span>
        ))}
      </div>
      <input
        id="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  )
}

function FocusTracker() {
  const [focused, setFocused] = useState<string | null>(null)
  return (
    <form aria-label="Focus test form">
      <output>focused: {focused ?? 'none'}</output>
      <label>First name<input type="text" onFocus={() => setFocused('first-name')} /></label>
      <label>Last name<input type="text" onFocus={() => setFocused('last-name')} /></label>
      <label>Email<input type="email" onFocus={() => setFocused('email')} /></label>
      <button type="submit" onFocus={() => setFocused('submit')}>Submit</button>
    </form>
  )
}

// Controlled wrapper so state updates drive re-renders (required for controlled components)
function ControlledNumberInput() {
  const [val, setVal] = useState('')
  return <NumberInput value={val} onChange={setVal} />
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The fireEvent blind spot
//
// fireEvent.change patches target.value and fires ONE event.
// The onKeyDown handler never fires, so the 'e' filter is invisible.
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: fireEvent misses key handlers', () => {
  test('fireEvent.change bypasses the "e" key block — value IS set (false confidence)', () => {
    render(<ControlledNumberInput />)
    const input = screen.getByRole('textbox', { name: /enter a number/i })

    // fireEvent.change patches target.value and fires a change event.
    // The onKeyDown for 'e' NEVER fires — the block is invisible.
    fireEvent.change(input, { target: { value: '1e5' } })

    // This passes! But it's a false green.
    // The test gives you confidence that '1e5' is "accepted" — keydown was never tested.
    // In a real browser, typing 'e' would trigger keydown → preventDefault → no change.
    // Here, fireEvent skips keydown entirely and sets the value directly.
    expect(input).toHaveValue('1e5')
    // Takeaway: fireEvent tests "did onChange fire with this value?" — NOT "did key filtering work?"
  })

  test('userEvent.type fires keydown — the "e" block actually works', async () => {
    const user = userEvent.setup()
    render(<ControlledNumberInput />)
    const input = screen.getByRole('textbox', { name: /enter a number/i })

    // userEvent.type fires: focus → keydown → keypress → input → keyup for EACH character.
    // When 'e' is typed: keydown fires, e.preventDefault() is called → no input event.
    // Only '1' and '5' produce input events → onChange fires for those only.
    await user.type(input, '1e5')

    // The 'e' keydown is prevented — the input event never fires for 'e'.
    // Result: '15' (the '1' and '5' go through; 'e' is blocked).
    expect(input).toHaveValue('15')
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — userEvent.type vs userEvent.keyboard
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: TagInput — Enter key and paste', () => {
  test('typing text and pressing Enter adds a tag', async () => {
    const user = userEvent.setup()
    render(<TagInput />)

    const input = screen.getByLabelText('Tags')

    // TODO: Type "react" into the input, then press Enter
    // Hint: await user.type(input, 'react')
    //       await user.keyboard('{Enter}')
    expect(true).toBe(true) // replace

    // TODO: Assert a listitem with text "react" now exists
    // Hint: screen.getByRole('listitem') or screen.getAllByRole('listitem')
    expect(true).toBe(true) // replace
  })

  test('typing multiple tags in sequence', async () => {
    const user = userEvent.setup()
    render(<TagInput />)
    const input = screen.getByLabelText('Tags')

    // TODO: Add 3 tags: 'react', 'typescript', 'testing'
    // Each: type the word, then press Enter
    expect(true).toBe(true) // replace

    // TODO: Assert there are 3 listitems
    expect(true).toBe(true) // replace
  })

  test('paste is blocked — pasted text does not appear', async () => {
    const user = userEvent.setup()
    render(<TagInput />)
    const input = screen.getByLabelText('Tags')

    // Focus the input first, then paste
    await user.click(input)

    // userEvent.paste() fires a real paste event — the handler calls e.preventDefault()
    // The pasted text should NOT appear in the input
    await user.paste('react')

    // TODO: Assert the input is still empty (paste was blocked)
    expect(true).toBe(true) // replace
  })

  test('fireEvent vs paste — fireEvent does NOT fire the paste event', () => {
    render(<TagInput />)
    const input = screen.getByLabelText('Tags')

    // fireEvent.change directly sets the value — bypasses the paste handler entirely
    fireEvent.change(input, { target: { value: 'reac,typescript' } })

    // The paste handler never fires — the value IS set
    // This is a false green: the paste-block appears to work but is untested
    expect(input).toHaveValue('reac,typescript')
    // Takeaway: to test event handlers (keydown, paste, focus), use userEvent.
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — userEvent.setup() for shared state
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: userEvent.setup() — shared session state', () => {
  test('keyboard state persists across multiple interactions', async () => {
    // userEvent.setup() creates a single user session.
    // Pointer position, clipboard, and modifier keys are shared between calls.
    const user = userEvent.setup()
    render(<TagInput />)
    const input = screen.getByLabelText('Tags')

    // Type 'react', then use keyboard shortcut to submit
    await user.click(input)
    await user.type(input, 'react')
    await user.keyboard('{Enter}')

    // Without setup(), each call creates a fresh session — modifier keys and
    // clipboard would be reset between interactions.
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  test('Tab navigation moves focus through form fields in DOM order', async () => {
    const user = userEvent.setup()
    render(<FocusTracker />)

    // Tab from the first field through the form
    // Each tab press moves focus to the next focusable element.
    const output = screen.getByRole('status').closest('output') ?? screen.getByText(/focused:/)

    // TODO: Focus the form and then tab twice.
    // After the first tab: first name input is focused.
    // After the second tab: last name input is focused.
    //
    // Hint: To start tabbing, click the first input, then user.tab()
    // The output element shows which field is focused.

    // Example structure:
    // const firstNameInput = screen.getByLabelText(/first name/i)
    // await user.click(firstNameInput)
    // await user.tab()
    // // Now last name should be focused
    // expect(screen.getByLabelText(/last name/i)).toHaveFocus()

    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — await is mandatory
//
// Every userEvent call is async. Missing await is the #1 bug.
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: Always await userEvent', () => {
  test('demonstrates the missing-await problem (this test has a bug)', async () => {
    render(<TagInput />)
    const input = screen.getByLabelText('Tags')

    // WRONG: no await — the type interaction hasn't finished when we assert
    // userEvent.type(input, 'react')  // ← missing await
    // expect(input).toHaveValue('react')  // ← races against async interaction

    // CORRECT: always await
    const user = userEvent.setup()
    await user.click(input)
    await user.type(input, 'vue')

    // TODO: assert the input value is 'vue'
    expect(input).toHaveValue('vue')
  })

  test('userEvent.type does NOT clear existing value', async () => {
    const user = userEvent.setup()

    function StatefulInput() {
      const [v, setV] = useState('hello')
      return <input aria-label="demo" value={v} onChange={e => setV(e.target.value)} />
    }
    render(<StatefulInput />)
    const input = screen.getByRole('textbox')

    // userEvent.type APPENDS to existing value — it doesn't clear first
    await user.type(input, ' world')

    // TODO: what is the value now?
    expect(input).toHaveValue('hello world')

    // To replace: await user.clear(input) first, then type
    await user.clear(input)
    await user.type(input, 'fresh start')
    expect(input).toHaveValue('fresh start')
  })
})
