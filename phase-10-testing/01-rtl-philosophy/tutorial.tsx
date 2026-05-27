// ============================================================
// Topic:   React Testing Library Philosophy
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// This file is the COMPONENT you will write tests for.
// Open exercises.test.tsx and work through the test stubs there.
//
// Run in browser:   npm run tutorial 01-rtl-philosophy
// Run the tests:    npm test (from project root after npm install)
// ============================================================

import { useState, FC } from 'react'

// ─── The Component Under Test ────────────────────────────────
// A UserProfileCard that needs to be tested.
// Notice: it uses semantic HTML and ARIA attributes throughout.
// Your tests should query it the same way a screen reader would.

interface User {
  name: string
  email: string
  bio: string
  isFollowing: boolean
}

interface UserProfileCardProps {
  user: User
  onEdit: () => void
  onFollowToggle: (following: boolean) => void
}

export function UserProfileCard({ user, onEdit, onFollowToggle }: UserProfileCardProps) {
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

// ─── Accessible vs Inaccessible Comparison ────────────────────
// These two forms have the same visual output but VERY different testability.
// See which queries work on each.

export function BadLoginForm() {
  return (
    <div className="login-form">
      <div className="field">
        <div className="label-text">Email</div>
        <input type="text" className="email-input" />
      </div>
      <div className="field">
        <div className="label-text">Password</div>
        <input type="password" className="pass-input" />
      </div>
      <div className="btn submit-btn" data-testid="submit-btn">
        Log in
      </div>
    </div>
  )
}

export function GoodLoginForm({ onLogin }: { onLogin: (e: React.FormEvent) => void }) {
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

// ─── App: Visual Reference ────────────────────────────────────
const App: FC = () => {
  const [isFollowing, setIsFollowing] = useState(false)
  const [editClicked, setEditClicked] = useState(false)

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>RTL Philosophy — Visual Reference</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        This is the component you'll write tests for in <code>exercises.test.tsx</code>.
        Notice how every interactive element has an accessible name. That's what makes
        <code> getByRole</code> possible.
      </p>

      <section>
        <h2>UserProfileCard</h2>
        <UserProfileCard
          user={{
            name: 'Alice Chen',
            email: 'alice@example.com',
            bio: 'Senior frontend engineer. Likes testing.',
            isFollowing,
          }}
          onEdit={() => setEditClicked(true)}
          onFollowToggle={setIsFollowing}
        />
        {editClicked && (
          <p style={{ color: 'green', marginTop: '0.5rem' }}>✓ onEdit was called</p>
        )}
        {isFollowing && (
          <p style={{ color: 'blue', marginTop: '0.5rem' }}>✓ Following Alice</p>
        )}
      </section>

      <hr style={{ margin: '2rem 0' }} />

      <section>
        <h2>Accessible vs Inaccessible Forms</h2>
        <p style={{ color: '#e55' }}>
          ❌ Bad form — try to query the submit button with getByRole("button")
        </p>
        <BadLoginForm />

        <p style={{ color: '#2a2', marginTop: '1.5rem' }}>
          ✓ Good form — getByRole("button", &#123; name: /log in/i &#125;) works
        </p>
        <GoodLoginForm onLogin={(e) => e.preventDefault()} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      <section style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>
        <h2>Query Priority Reminder</h2>
        <ol style={{ lineHeight: '2' }}>
          <li><strong>getByRole</strong> — first choice for any interactive element</li>
          <li><strong>getByLabelText</strong> — first choice for form inputs</li>
          <li><strong>getByPlaceholderText</strong> — fallback for inputs without labels</li>
          <li><strong>getByText</strong> — for non-interactive text</li>
          <li><strong>getByTestId</strong> — last resort only</li>
        </ol>
      </section>
    </div>
  )
}

export default App
