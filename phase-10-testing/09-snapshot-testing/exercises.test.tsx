// ============================================================
// Exercises: Snapshot Testing
//
// Run: npm test  |  Watch: npm run test:watch
//
// First run: creates .snap files.
// Subsequent runs: compares against them.
// Update: npx vitest run --reporter=verbose -u
//
// The goal: understand when to use snapshots and when explicit
// RTL assertions are strictly better.
// ============================================================

import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'

// ─── Components Under Test ─────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'error' | 'info'

function StatusBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  const colors: Record<BadgeVariant, string> = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
  }
  return (
    <span role="status" aria-label={label} className={`badge ${colors[variant]}`}>
      {label}
    </span>
  )
}

function OrderCard({ order }: { order: { id: string; status: string; createdAt: Date } }) {
  return (
    <article aria-label={`Order ${order.id}`}>
      <h3>Order #{order.id}</h3>
      <StatusBadge variant={order.status === 'complete' ? 'success' : 'warning'} label={order.status} />
      <time dateTime={order.createdAt.toISOString()}>
        {order.createdAt.toLocaleDateString()}
      </time>
    </article>
  )
}

function generateBuildConfig(opts: { mode: 'dev' | 'prod'; sourcemap: boolean }) {
  return {
    mode: opts.mode,
    output: {
      filename: opts.mode === 'prod' ? '[name].[contenthash].js' : '[name].js',
      path: opts.mode === 'prod' ? '/dist' : '/build',
    },
    devtool: opts.sourcemap ? 'source-map' : false,
    optimize: opts.mode === 'prod',
    plugins: opts.mode === 'prod' ? ['MinifyPlugin', 'TreeShakePlugin'] : [],
  }
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — What a snapshot captures
//
// Run this test once. Look at the generated __snapshots__/ file.
// What does it contain? Is it readable? What would happen if
// StatusBadge gets an extra wrapper div?
// ─────────────────────────────────────────────────────────────
describe('Exercise 1: What snapshots capture (observe, then refactor)', () => {
  test('StatusBadge full snapshot — observe what gets captured', () => {
    const { container } = render(<StatusBadge variant="success" label="Complete" />)

    // Run this once, look at the .snap file it creates.
    // Then make a trivial change: rename 'badge-success' to 'badge badge--success'.
    // The snapshot fails — but the component looks IDENTICAL to a user.
    // That's the problem.
    expect(container.firstChild).toMatchSnapshot()
  })

  // TODO: Now write this component's test WITHOUT snapshots.
  // Use RTL explicit assertions instead.
  // What are the two things that actually matter here?
  // 1. The element is accessible (has the right role and name)
  // 2. The label text is correct
  test('StatusBadge explicit assertions — better than snapshot', () => {
    render(<StatusBadge variant="success" label="Complete" />)

    // TODO: assert the badge has role="status" with the correct accessible name
    // Hint: getByRole('status', { name: 'Complete' })
    expect(true).toBe(true) // replace

    // TODO: assert the text content is "Complete"
    expect(true).toBe(true) // replace

    // This test will NOT break if you rename a CSS class.
    // It WILL break if the badge text changes or the role disappears.
    // That's the right sensitivity.
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Dynamic content breaks snapshots
//
// Timestamps, random IDs, and Date.now() change every run.
// The snapshot fails every time. The fix: mock before snapshotting.
// ─────────────────────────────────────────────────────────────
describe('Exercise 2: Dynamic content — mock before snapshotting', () => {
  afterEach(() => vi.restoreAllMocks())

  test('snapshot with Date.now() — fails every run WITHOUT mocking', () => {
    // This order has a real Date — the snapshot would fail every run.
    // Watch: if you run this test twice, the dates will differ.
    // const order = { id: 'ORD-1', status: 'complete', createdAt: new Date() }

    // FIX: freeze time so the snapshot is stable.
    const FIXED_DATE = new Date('2025-01-15T10:00:00.000Z')
    vi.spyOn(global, 'Date').mockImplementation(() => FIXED_DATE as unknown as Date)

    const order = { id: 'ORD-1', status: 'complete', createdAt: new Date() }
    const { container } = render(<OrderCard order={order} />)

    // Now the snapshot is stable — the date is always 2025-01-15
    expect(container.firstChild).toMatchSnapshot()
  })

  // Better approach: don't snapshot dynamic-content components at all.
  // Use explicit assertions on the parts you care about.
  test('OrderCard explicit assertions — no mocking needed', () => {
    const FIXED = new Date('2025-01-15T10:00:00.000Z')
    render(<OrderCard order={{ id: 'ORD-42', status: 'complete', createdAt: FIXED }} />)

    // TODO: assert the article has the correct accessible name
    // TODO: assert the badge shows "complete" with success styling (role="status")
    // TODO: assert the time element exists
    expect(true).toBe(true) // replace (3 assertions)
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Inline snapshots: visible in the test file
//
// Inline snapshots are stored IN the test file (not a .snap file).
// They stay small by convention and are visible in PR diffs.
// Use for: small computed strings, formatted values, short data.
// ─────────────────────────────────────────────────────────────
describe('Exercise 3: Inline snapshots', () => {
  test('formatCurrency inline snapshot', () => {
    function formatCurrency(n: number) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
    }

    // Run once — Vitest writes the expected value inline.
    // Future runs compare against it.
    // The value is visible here in the test, not in a separate file.
    expect(formatCurrency(1234.56)).toMatchInlineSnapshot(`"$1,234.56"`)
    expect(formatCurrency(0)).toMatchInlineSnapshot(`"$0.00"`)
    expect(formatCurrency(-50)).toMatchInlineSnapshot(`"-$50.00"`)
  })

  test('build config inline snapshot — good use case', () => {
    // Config objects are stable, machine-generated, and tedious to assert property-by-property.
    // A snapshot captures the full shape in one assertion.
    const config = generateBuildConfig({ mode: 'prod', sourcemap: true })

    // Run once to capture the shape. Edit the function — snapshot catches the regression.
    expect(config).toMatchInlineSnapshot(`
      {
        "devtool": "source-map",
        "mode": "prod",
        "optimize": true,
        "output": {
          "filename": "[name].[contenthash].js",
          "path": "/dist",
        },
        "plugins": [
          "MinifyPlugin",
          "TreeShakePlugin",
        ],
      }
    `)
  })

  test('TODO: write your own inline snapshot for dev mode config', () => {
    // TODO: call generateBuildConfig({ mode: 'dev', sourcemap: false })
    // and write an inline snapshot.
    // First run: leave toMatchInlineSnapshot() empty — Vitest fills it in.
    // Then read it — does the shape make sense?
    expect(true).toBe(true) // replace
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Migrate a bad snapshot to explicit assertions
//
// This is the most important exercise. Given a large snapshot test,
// convert it to the explicit assertions that actually matter.
// ─────────────────────────────────────────────────────────────
describe('Exercise 4: Migrate from snapshot to explicit assertions', () => {
  // This test uses a full container snapshot — it will break on any
  // markup change, even ones that don't affect user-visible behavior.
  test('BAD: full container snapshot (breaks on any markup change)', () => {
    const { container } = render(
      <>
        <StatusBadge variant="success" label="Active" />
        <StatusBadge variant="error" label="Inactive" />
      </>
    )
    // Run once. Now rename a CSS class → snapshot fails. But the UI is unchanged.
    // This is the noise that trains reviewers to blindly approve snapshot updates.
    expect(container).toMatchSnapshot()
  })

  // TODO: Rewrite the above test using only explicit assertions.
  // What are the behaviors that actually matter?
  // - Both badges render
  // - Each has the correct accessible name
  // - Each shows the right label text
  // That's 3 assertions, not a 20-line HTML snapshot.
  test('GOOD: explicit assertions for the same test', () => {
    render(
      <>
        <StatusBadge variant="success" label="Active" />
        <StatusBadge variant="error" label="Inactive" />
      </>
    )

    // TODO: get all status badges and assert there are 2
    // TODO: assert the first one has accessible name "Active"
    // TODO: assert the second one has accessible name "Inactive"
    expect(true).toBe(true) // replace (3 assertions)
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 5 — The --ci flag mental model
//
// In CI, Vitest with --reporter=verbose and snapshot tests will:
// - Pass if all snapshots match
// - FAIL if there's a new (unreviewed) snapshot
//
// The purpose: prevent accidentally committing un-reviewed snapshots.
// Every snapshot update should be a deliberate, reviewed change.
// ─────────────────────────────────────────────────────────────
describe('Exercise 5: Snapshot hygiene', () => {
  test('snapshot update workflow (read and reflect)', () => {
    // Correct snapshot update workflow:
    // 1. A test fails because output changed
    // 2. You visually inspect the diff — is the change intentional?
    // 3. If yes: npx vitest run -u (updates the snapshot)
    // 4. Commit the .snap file change along with the component change
    // 5. In PR review: reviewer sees the .snap diff and validates it
    //
    // Warning sign: if you're running -u without reading the diff,
    // the snapshot is no longer providing any safety — it's just noise.
    //
    // Anti-pattern: having -u in a pre-commit hook or CI script.
    // That means snapshots never actually catch regressions.
    expect(true).toBe(true) // reflection only
  })
})
