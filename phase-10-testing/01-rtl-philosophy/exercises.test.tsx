// ============================================================
// Exercises: React Testing Library Philosophy
//
// Run: npm test (from project root)
// Watch: npm run test:watch
//
// Work through each exercise in order. Each builds on the last.
// Replace test.todo() with actual test implementations.
// ============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'

// ─── Component Under Test ─────────────────────────────────────
// Defined here so the test file is self-contained.

interface User {
  name: string
  email: string
  bio: string
  isFollowing: boolean
}

function UserProfileCard({
  user,
  onEdit,
  onFollowToggle,
}: {
  user: User
  onEdit: () => void
  onFollowToggle: (following: boolean) => void
}) {
  return (
    <article aria-label={`${user.name}'s profile`}>
      <h2>{user.name}</h2>
      <p>
        <a href={`mailto:${user.email}`}>{user.email}</a>
      </p>
      <p className="bio">{user.bio}</p>
      <div role="group" aria-label="Profile actions">
        <button onClick={onEdit}>Edit profile</button>
        <button
          onClick={() => onFollowToggle(!user.isFollowing)}
          aria-pressed={user.isFollowing}
        >
          {user.isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      </div>
    </article>
  )
}

// ─── An inaccessible form (for contrast) ─────────────────────
function BadLoginForm() {
  return (
    <div className="login-form">
      <div className="label-text">Email</div>
      <input type="text" className="email-input" />
      <div className="label-text">Password</div>
      <input type="password" className="pass-input" />
      <div className="btn submit-btn" data-testid="submit-btn">
        Log in
      </div>
    </div>
  )
}

// ─── An accessible form ────────────────────────────────────────
function GoodLoginForm({ onLogin }: { onLogin: (e: React.FormEvent) => void }) {
  return (
    <form onSubmit={onLogin} aria-label="Login form">
      <label>
        Email
        <input type="email" name="email" />
      </label>
      <label>
        Password
        <input type="password" name="password" />
      </label>
      <button type="submit">Log in</button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Spot the fragile query, fix it
//
// Each test below has a comment showing a BAD query approach.
// Your job: write the same test using the CORRECT RTL query.
// Think: what query would a screen reader use to find this element?
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: Query priority — fix the fragile tests', () => {
  const alice: User = {
    name: 'Alice Chen',
    email: 'alice@example.com',
    bio: 'Senior frontend engineer',
    isFollowing: false,
  }

  // BAD: document.querySelector('.bio') breaks on any class rename.
  // TODO: Use getByText() to find the bio text instead.
  test.todo('shows the user bio')

  // BAD: getByTestId('submit-btn') — works on BadLoginForm but tests nothing meaningful.
  // TODO: On GoodLoginForm, use getByRole to find the submit button.
  // The button's accessible name comes from its text content.
  test.todo('GoodLoginForm has a submit button findable by role')

  // OBSERVATION: Try this on BadLoginForm — it fails because a <div> is not a button.
  // Notice what getByRole enforces: not just "element exists" but "element IS a button".
  test('BadLoginForm — getByRole("button") finds nothing', () => {
    render(<BadLoginForm />)
    // This should throw — the submit div has no button role
    expect(() => screen.getByRole('button')).toThrow()
    // But getByTestId finds the same element just fine:
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
    // Key insight: getByTestId passes even for inaccessible elements.
    // getByRole validates semantic correctness.
  })

  // TODO: Find the email link using getByRole.
  // Hint: <a href="mailto:..."> has role "link". Use { name: /alice/i }.
  test.todo('shows the email as a link')

  // TODO: Find the user name using getByRole.
  // Hint: <h2> has role "heading". Add { level: 2 } to be specific.
  test.todo('shows the user name as a heading')
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Write tests that validate behavior, not internals
//
// Good RTL tests never assert on: state variables, CSS classes,
// internal function names, component structure.
// They assert on: what a user can SEE and DO.
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: Behavior-based assertions', () => {
  const bob: User = {
    name: 'Bob Kim',
    email: 'bob@example.com',
    bio: 'Product designer',
    isFollowing: false,
  }

  // TODO: Write a test that verifies the Follow button exists when isFollowing=false.
  // Use getByRole with the { name } option.
  test.todo('shows a "Follow" button when not already following')

  // TODO: Write a test that verifies the Unfollow button exists when isFollowing=true.
  test.todo('shows an "Unfollow" button when already following')

  // TODO: Write a test that verifies clicking "Edit profile" calls onEdit.
  // Use vi.fn() for the callback. Use userEvent.click.
  // Assert: expect(mockFn).toHaveBeenCalledTimes(1)
  test.todo('calls onEdit exactly once when Edit profile is clicked')

  // TODO: Write a test that verifies the button's aria-pressed attribute.
  // When isFollowing=false: aria-pressed should be "false".
  // When isFollowing=true: aria-pressed should be "true".
  // Hint: expect(btn).toHaveAttribute('aria-pressed', 'false')
  test.todo('Follow button has correct aria-pressed attribute')
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Write tests that survive refactoring
//
// A test that ONLY breaks when user-facing behavior changes is a
// good test. A test that breaks when you rename a variable or
// move a div is a maintenance burden.
//
// Try changing UserProfileCard's internal structure (e.g., wrap
// the buttons in an extra <div>) and notice which tests still pass.
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: Refactor-resistant tests', () => {
  // This test uses getByRole — it will survive ANY structural refactor
  // that preserves the button's accessible name.
  test('Edit profile button is accessible regardless of DOM structure', () => {
    const onEdit = vi.fn()
    render(
      <UserProfileCard
        user={{ name: 'Carol', email: 'c@c.com', bio: 'QA', isFollowing: false }}
        onEdit={onEdit}
        onFollowToggle={() => {}}
      />
    )
    // This finds the button by its role + accessible name.
    // It doesn't care if it's inside a div, span, article, or section.
    const editBtn = screen.getByRole('button', { name: /edit profile/i })
    expect(editBtn).toBeInTheDocument()
  })

  // TODO: Write a test that re-renders the component (use rerender from render())
  // to simulate following → unfollowing behavior.
  //
  // Pattern:
  //   const { rerender } = render(<UserProfileCard user={{...isFollowing: false}} ... />)
  //   expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument()
  //   rerender(<UserProfileCard user={{...isFollowing: true}} ... />)
  //   expect(screen.getByRole('button', { name: /unfollow/i })).toBeInTheDocument()
  //
  // This test validates the UI contract: correct button text for each state.
  test.todo('button text updates when isFollowing prop changes')

  // BONUS: This is a bad test pattern. Can you see why?
  // It tests implementation detail: the className of an element.
  // Try refactoring the component to remove the className — this test breaks,
  // but the UI is identical to a user. That's the red flag.
  test('BAD PATTERN — do not copy this style', () => {
    render(
      <UserProfileCard
        user={{ name: 'Dave', email: 'd@d.com', bio: 'Dev', isFollowing: false }}
        onEdit={() => {}}
        onFollowToggle={() => {}}
      />
    )
    // This will break if you ever rename 'bio' to 'biography' or 'description'
    expect(document.querySelector('.bio')).toHaveTextContent('Dev')
    // Compare: the accessible version below won't break on rename:
    // expect(screen.getByText('Dev')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Choose the right query for the context
//
// For each scenario, there's exactly one "best" query from RTL's
// priority list. Pick it, write the assertion.
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: Right tool for the job', () => {
  test('getByLabelText — finding a form input by its label', () => {
    render(<GoodLoginForm onLogin={(e) => e.preventDefault()} />)
    // TODO: Use getByLabelText to find the email input.
    // The label text is "Email". Assert it's in the document.
    // This is the preferred query for form inputs — it validates accessibility.
    // TODO: uncomment and complete:
    // const emailInput = screen.getByLabelText(/email/i)
    // expect(emailInput).toBeInTheDocument()
    expect(true).toBe(true) // remove this placeholder
  })

  test('getByRole with accessible name — the most specific form', () => {
    render(
      <UserProfileCard
        user={{ name: 'Eve', email: 'e@e.com', bio: 'Engineer', isFollowing: false }}
        onEdit={() => {}}
        onFollowToggle={() => {}}
      />
    )
    // TODO: The article has aria-label="Eve's profile".
    // Use getByRole('article', { name: /eve's profile/i }) to find it.
    // Assert toBeInTheDocument().
    expect(true).toBe(true) // remove this placeholder
  })

  test('queryByRole — correct way to assert absence', () => {
    render(
      <UserProfileCard
        user={{ name: 'Frank', email: 'f@f.com', bio: 'Manager', isFollowing: false }}
        onEdit={() => {}}
        onFollowToggle={() => {}}
      />
    )
    // When isFollowing=false, there should be NO "Unfollow" button.
    // Use queryByRole (not getByRole) to assert absence — getByRole throws on miss.
    // TODO: complete this:
    // expect(screen.queryByRole('button', { name: /unfollow/i })).not.toBeInTheDocument()
    expect(true).toBe(true) // remove this placeholder
  })
})
