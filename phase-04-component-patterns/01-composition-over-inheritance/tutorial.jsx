// ============================================================
// Topic:   Composition Over Inheritance
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Each exercise is self-contained — render <App /> to see all three.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState } from 'react';

// ─── Exercise 1: Containment + Specialization ────────────────
//
// SITUATION
//   A designer hands you three alert variants — Info (blue), Warning (yellow),
//   Error (red). A naive approach builds three separate components.
//   Your job: build ONE <Alert> and derive the three variants by configuration.
//
// STEP 1 — Build <Alert>
//   Props: variant ('info' | 'warning' | 'error'), title, children
//   - Use the VARIANT_STYLES lookup to drive colors (not if/else chains).
//   - Render: a container div with a 4px left border + matching background,
//     a <strong> for the title, then children below it.
//
// STEP 2 — Specialize via props (no class hierarchy, no copy-paste)
//   Build <InfoAlert>, <WarningAlert>, <ErrorAlert> as one-liners that
//   preset `variant` and forward everything else.
//   Each adds ZERO logic — just named presets.
//
// SELF-CHECK after finishing:
//   Can you add a "success" variant by only touching VARIANT_STYLES and
//   creating <SuccessAlert>? That's the power of this pattern.

const VARIANT_STYLES = {
  info:    { borderColor: '#3b82f6', background: '#eff6ff' },
  warning: { borderColor: '#f59e0b', background: '#fffbeb' },
  error:   { borderColor: '#ef4444', background: '#fef2f2' },
};

function Alert({ variant = 'info', title, children }) {
  // TODO: look up styles from VARIANT_STYLES[variant]
  // Render a div with:
  //   borderLeft: `4px solid ${styles.borderColor}`
  //   background: styles.background
  //   padding, borderRadius (8px), marginBottom (12px)
  // Then a <strong>{title}</strong> and a <p style={{ margin: '4px 0' }}>{children}</p>
  return <div>Alert stub — implement me</div>;
}

function InfoAlert(props)    { /* TODO: one line */ }
function WarningAlert(props) { /* TODO: one line */ }
function ErrorAlert(props)   { /* TODO: one line */ }

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Containment + Specialization</h2>
      <InfoAlert title="Did you know?">
        React prefers composition because it maps directly to JSX nesting.
      </InfoAlert>
      <WarningAlert title="Heads up">
        Named slot props get unwieldy past 3–4 slots — switch to compound components.
      </WarningAlert>
      <ErrorAlert title="Something went wrong">
        Introspecting <code>children</code> with cloneElement only works one level deep.
      </ErrorAlert>
    </section>
  );
}


// ─── Exercise 2: Named Slot Props ────────────────────────────
//
// SITUATION
//   A dashboard needs four distinct zones: topbar, sidebar, main, statusBar.
//   A single `children` prop won't work because the COMPONENT owns how the
//   zones are laid out in the DOM, while the CALLER owns what goes in each zone.
//
// YOUR TASK — Build <DashboardLayout>
//   Props: topbar, sidebar, main, statusBar  (all ReactNode)
//   Layout (use inline flex/grid — no external CSS needed):
//
//     ┌────────────────────────────┐
//     │          topbar            │
//     ├──────────┬─────────────────┤
//     │ sidebar  │      main       │
//     ├──────────┴─────────────────┤
//     │         statusBar          │
//     └────────────────────────────┘
//
// THINK ABOUT after finishing:
//   - Why can't the caller use one `children` to fill four distinct zones?
//   - If you needed a fifth zone (e.g., rightPanel), would you keep adding props
//     or switch to compound components? What's the tipping point?

function DashboardLayout({ topbar, sidebar, main, statusBar }) {
  // TODO: compose the four slots into the layout above
  // Hint — outer wrapper: display flex + flexDirection column, height 400px, border
  //         middle row: display flex, flex 1
  //         sidebar: width 160px, borderRight, overflowY auto
  //         main: flex 1, overflowY auto
  return <div>DashboardLayout stub — implement me</div>;
}

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Named Slot Props</h2>
      <DashboardLayout
        topbar={
          <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: '#1e293b', color: 'white' }}>
            <strong>MyApp</strong>
            <span>Logout</span>
          </nav>
        }
        sidebar={
          <ul style={{ listStyle: 'none', padding: '16px', margin: 0 }}>
            <li style={{ marginBottom: 8 }}>📊 Dashboard</li>
            <li style={{ marginBottom: 8 }}>👥 Users</li>
            <li style={{ marginBottom: 8 }}>⚙️ Settings</li>
          </ul>
        }
        main={
          <div style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Welcome back</h3>
            <p>Your dashboard is ready. Named slots let the caller control content
               while this component owns the layout structure.</p>
          </div>
        }
        statusBar={
          <footer style={{ textAlign: 'center', padding: 8, background: '#f1f5f9', fontSize: 12 }}>
            © 2025 MyApp — All rights reserved
          </footer>
        }
      />
    </section>
  );
}


// ─── Exercise 3: Refactor from Inheritance Mindset ───────────
//
// SITUATION
//   A colleague wrote the code below with an "inheritance mindset" — they
//   duplicated the card shell in two places and copy-pasted badge rendering.
//   Your job: refactor into a composable design that looks identical.
//
// THE PROBLEMS IN THE ORIGINAL CODE (study before starting):
//   1. <OriginalUserCard> and <OriginalProductCard> duplicate the card shell
//      (border, borderRadius, padding) — a style change requires two edits.
//   2. <PremiumUserCard> reimplements <OriginalUserCard> from scratch.
//   3. Badge styling is scattered in both card components.
//
// YOUR TASK — Refactor into:
//   <Card>  — generic shell (containment: accepts children, no opinions on content)
//   <Badge> — shared label chip (accepts children + color prop)
//   <UserCard>    — uses <Card> + <Badge> (no shell duplication)
//   <ProductCard> — uses <Card> + <Badge> (no shell duplication)
//   <PremiumUserCard> — should be ONE LINE that just presets isPremium=true
//
// VERIFY: Output of the "Refactor" section must look identical to "Original".

// ── Original (read-only — do not edit) ──────────────────────
function OriginalUserCard({ name, role, isPremium }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 8, maxWidth: 300 }}>
      {isPremium && (
        <span style={{ background: '#7c3aed', color: 'white', borderRadius: 4, padding: '2px 8px', fontSize: 12, display: 'inline-block', marginBottom: 6 }}>
          PREMIUM
        </span>
      )}
      <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{name}</p>
      <p style={{ margin: '4px 0', color: '#64748b', fontSize: 14 }}>{role}</p>
    </div>
  );
}
function OriginalProductCard({ name, price, onSale }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 8, maxWidth: 300 }}>
      {onSale && (
        <span style={{ background: '#dc2626', color: 'white', borderRadius: 4, padding: '2px 8px', fontSize: 12, display: 'inline-block', marginBottom: 6 }}>
          SALE
        </span>
      )}
      <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{name}</p>
      <p style={{ margin: '4px 0', color: '#64748b', fontSize: 14 }}>${price}</p>
    </div>
  );
}

// ── Your refactored versions go here ────────────────────────
function Card({ children }) {
  // TODO: one div with the shared shell styles
  // border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
  // marginBottom: 8, maxWidth: 300
  return <div>Card stub</div>;
}

function Badge({ children, color = '#7c3aed' }) {
  // TODO: a span with background=color, white text, borderRadius 4,
  //       padding '2px 8px', fontSize 12, display inline-block, marginBottom 6
  return <span>Badge stub</span>;
}

function UserCard({ name, role, isPremium = false }) {
  // TODO: <Card> wrapping conditionally <Badge color="#7c3aed">PREMIUM</Badge>
  //       + the name/role paragraphs
  return <div>UserCard stub</div>;
}

function ProductCard({ name, price, onSale = false }) {
  // TODO: <Card> wrapping conditionally <Badge color="#dc2626">SALE</Badge>
  //       + the name/price paragraphs
  return <div>ProductCard stub</div>;
}

function PremiumUserCard(props) {
  // TODO: exactly one line — UserCard with isPremium preset to true
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Refactor from Inheritance Mindset</h2>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <h4 style={{ color: '#64748b', fontSize: 13 }}>Original (target)</h4>
          <OriginalUserCard name="Osama" role="Senior Engineer" />
          <OriginalUserCard name="Layla" role="Designer" isPremium />
          <OriginalProductCard name="Wireless Headphones" price={99} />
          <OriginalProductCard name="Laptop Stand" price={45} onSale />
        </div>
        <div>
          <h4 style={{ color: '#64748b', fontSize: 13 }}>Your Refactor (must match)</h4>
          <UserCard name="Osama" role="Senior Engineer" />
          <UserCard name="Layla" role="Designer" isPremium />
          <ProductCard name="Wireless Headphones" price={99} />
          <ProductCard name="Laptop Stand" price={45} onSale />
          {/* PremiumUserCard = zero extra code */}
          <PremiumUserCard name="Ahmed" role="Product Manager" />
        </div>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 01 — Composition Over Inheritance</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
