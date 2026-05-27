// ============================================================
// Topic:   Snapshot Testing
// Phase:   10 — Testing
// File:    tutorial.tsx  (visual reference — run in browser)
//
// Run in browser:   npm run tutorial 09-snapshot-testing
// Run the tests:    npm test
// ============================================================

import { FC } from 'react'

// ─── Small, stable components — acceptable for snapshots ─────
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info'

export function StatusBadge({ variant, label }: { variant: BadgeVariant; label: string }) {
  const colors: Record<BadgeVariant, { bg: string; text: string }> = {
    success: { bg: '#d1fae5', text: '#065f46' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    error: { bg: '#fee2e2', text: '#991b1b' },
    info: { bg: '#dbeafe', text: '#1e40af' },
  }
  const { bg, text } = colors[variant]
  return (
    <span
      role="status"
      aria-label={label}
      style={{ background: bg, color: text, padding: '2px 10px', borderRadius: '999px', fontSize: '0.85rem' }}
    >
      {label}
    </span>
  )
}

// ─── Component with dynamic content — snapshot hazard ─────────
export function OrderCard({ order }: { order: { id: string; status: string; createdAt: Date } }) {
  return (
    <article aria-label={`Order ${order.id}`}>
      <h3>Order #{order.id}</h3>
      <StatusBadge variant={order.status === 'complete' ? 'success' : 'warning'} label={order.status} />
      {/* This timestamp changes every run — snapshot would always fail */}
      <time dateTime={order.createdAt.toISOString()}>
        {order.createdAt.toLocaleDateString()}
      </time>
    </article>
  )
}

// ─── Config generator — good snapshot target ──────────────────
export function generateBuildConfig(opts: { mode: 'dev' | 'prod'; sourcemap: boolean }) {
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

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  const badges: { variant: BadgeVariant; label: string }[] = [
    { variant: 'success', label: 'Complete' },
    { variant: 'warning', label: 'Pending' },
    { variant: 'error', label: 'Failed' },
    { variant: 'info', label: 'Processing' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Snapshot Testing</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        The exercises show when snapshots help and when they hurt.
        The core insight: prefer explicit assertions for component behavior,
        reserve snapshots for stable serialized data structures.
      </p>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>StatusBadge variants</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {badges.map(b => <StatusBadge key={b.variant} {...b} />)}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          Small, stable component. A focused snapshot is acceptable here —
          but explicit assertions are still better.
        </p>
      </section>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>OrderCard (timestamp problem)</h2>
        <OrderCard order={{ id: 'ORD-42', status: 'complete', createdAt: new Date() }} />
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#e55' }}>
          ⚠ The timestamp changes every run — a snapshot would fail every time.
          Fix: mock Date or use inline snapshot with static data.
        </p>
      </section>

      <section style={{ background: '#fffbe6', padding: '1.5rem', borderRadius: '8px' }}>
        <h2>When snapshots are appropriate</h2>
        <ul style={{ lineHeight: '2', margin: 0 }}>
          <li>✓ Config objects, ASTs, generated CSS</li>
          <li>✓ Inline snapshots for small string values</li>
          <li>✓ Non-HTML output with stable, precise structure</li>
          <li>✗ Component HTML — too easy to mindlessly update</li>
          <li>✗ Any value containing Date, UUID, or random data</li>
          <li>✗ Output bigger than ~10 lines (unreadable in PRs)</li>
        </ul>
      </section>
    </div>
  )
}

export default App
