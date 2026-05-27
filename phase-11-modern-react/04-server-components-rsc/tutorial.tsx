// ============================================================
// Topic:   Server Components (RSC)
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: CODE READING + ARCHITECTURE DECISIONS
//
// RSC requires a framework (Next.js App Router) — you can't demo
// it in a Vite app. Instead, these exercises are about:
//   1. Reading real RSC code and understanding what it does
//   2. Identifying what's wrong and why
//   3. Making the SC vs CC split decision
//   4. Simulating the children-as-prop pattern (works in Vite)
//
// Run: npm run tutorial 04-server-components-rsc
// ============================================================

import { useState, FC } from 'react'

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Read and annotate: SC or CC?
//
// For each component below, decide: should it be a Server Component
// or a Client Component in a Next.js App Router codebase?
// Mark your reasoning.
// ─────────────────────────────────────────────────────────────

// Component A: renders static product information
// Input: product data fetched from a DB
// Output: product name, price, description, image alt text
//
// Q: SC or CC?
// A: SC — no hooks, no events, no browser APIs. Zero JS shipped.
//    Benefit: can query DB directly, no API round trip.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProductInfo_A(/* would be async in RSC */) {
  // In Next.js App Router:
  // async function ProductInfo({ params }: { params: { id: string } }) {
  //   const product = await db.products.findById(params.id)
  //   return <article><h1>{product.name}</h1><p>{product.price}</p></article>
  // }
  return (
    <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
      <p><strong>Component A: ProductInfo</strong></p>
      <p style={{ fontSize: '0.85rem' }}>
        ✓ <strong>Server Component</strong> — renders static product data. No hooks, no events.
        Direct DB access on the server. Zero bytes shipped to client.
      </p>
    </div>
  )
}

// Component B: an Add to Cart button
// Input: productId
// Output: a button that onClick calls addToCart(productId)
//
// Q: SC or CC?
// A: CC — has onClick event handler. Needs useState for loading state.
//    Mark with 'use client' at the file top.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AddToCart_B({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false) // ← needs CC
  return (
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <p><strong>Component B: AddToCart</strong></p>
      <p style={{ fontSize: '0.85rem' }}>
        ✓ <strong>Client Component</strong> — needs useState and onClick.
        Add 'use client' directive. This is the smallest possible CC slice.
      </p>
      <button onClick={() => setAdded(true)} disabled={added}>
        {added ? 'Added ✓' : `Add ${productId} to cart`}
      </button>
    </div>
  )
}

// Component C: a UserAvatar — renders an <img> with user's photo URL
// Input: src, alt, size
// No state, no events, no hooks
//
// Q: SC or CC?
// COMMON MISTAKE: making it CC "just in case" or because it's a UI component
// A: SC — it's pure markup. Zero reason to ship its code to the browser.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UserAvatar_C({ src, alt, size = 40 }: { src: string; alt: string; size?: number }) {
  return (
    <div style={{ background: '#fff3e0', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <p><strong>Component C: UserAvatar</strong></p>
      <p style={{ fontSize: '0.85rem' }}>
        ✓ <strong>Server Component</strong> — pure markup, no interactivity.
        Common mistake: adding 'use client' because it "feels like a UI component."
        If it doesn't need hooks, events, or browser APIs: keep it on the server.
      </p>
    </div>
  )
}

// Component D: a CollapsibleSection with expand/collapse toggle
//
// Q: SC or CC?
// A: CC — needs useState for open/close. But the CONTENT inside can be SC!
//    Pattern: CC for the shell, SC as children prop.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CollapsibleSection_D({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: '#f3e5f5', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <p><strong>Component D: CollapsibleSection</strong></p>
      <p style={{ fontSize: '0.85rem' }}>
        ✓ <strong>Client Component</strong> — needs useState for toggle.
        But! The children can be Server Components passed from a parent SC:
        <code>{'<CollapsibleSection><ServerComponent /></CollapsibleSection>'}</code>
      </p>
      <button onClick={() => setOpen(o => !o)}>{open ? 'Collapse' : 'Expand'}</button>
      {open && children}
    </div>
  )
}

function Exercise1_ClassifyComponents() {
  return (
    <section>
      <h2>Exercise 1: SC vs CC Classification</h2>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Read each component below. Decide SC or CC before reading the answer.
        Then verify your reasoning matches.
      </p>
      <ProductInfo_A />
      <AddToCart_B productId="prod-123" />
      <UserAvatar_C src="/avatar.png" alt="Alice" />
      <CollapsibleSection_D>
        <p style={{ fontSize: '0.85rem', padding: '0.5rem' }}>This content could be SC</p>
      </CollapsibleSection_D>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Decision rule:</strong> Start every component as SC (default in App Router).
        Only add 'use client' when you actually need: hooks, event handlers, or browser APIs.
        Minimize the client zone — the smaller it is, the less JS ships.
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Fix the broken import direction
//
// The rule: SC → CC is fine. CC → SC is NOT allowed.
// A Client Component cannot import a Server Component.
// The correct pattern: pass SC output as children from a parent SC.
// ─────────────────────────────────────────────────────────────
function Exercise2_ImportBoundary() {
  return (
    <section>
      <h2>Exercise 2: Import Boundary Rule</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Read the broken patterns below. Identify WHY each is wrong.
        Then read the fix.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ background: '#fee', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
          <p><strong>❌ BROKEN: CC imports SC</strong></p>
          <pre style={{ background: '#fff', padding: '0.5rem', overflow: 'auto', fontSize: '0.8rem' }}>{`// ClientWidget.tsx
'use client'
// ERROR: importing a server module into client code
// pulls server-only deps into the client bundle
import { UserCard } from './UserCard' // SC

export function Widget() {
  return <UserCard /> // ← broken
}`}</pre>
          <p>Why broken: the bundler sees this import from a 'use client' file
          and includes UserCard's server-only deps (db, fs) in the client bundle,
          OR throws a build error.</p>
        </div>

        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
          <p><strong>✓ FIX: Pass SC output as children</strong></p>
          <pre style={{ background: '#fff', padding: '0.5rem', overflow: 'auto', fontSize: '0.8rem' }}>{`// page.tsx (Server Component)
import { Widget } from './ClientWidget'
import { UserCard } from './UserCard' // SC

export default function Page() {
  return (
    // SC renders CC, passes SC as children
    <Widget>
      <UserCard />
    </Widget>
  )
}

// ClientWidget.tsx
'use client'
export function Widget({ children }) {
  return <div>{children}</div> // ← receives SC output
}`}</pre>
          <p>Why this works: UserCard is rendered by the SERVER before being
          passed as serialized data. Widget receives React nodes, not code.</p>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO: Explain this in your own words.</strong><br/>
        Why can a Server Component's output appear inside a Client Component as children,
        even though Client Components can't import Server Components?
        (Answer: children are passed as already-rendered RSC payload data — serialized React nodes,
        not as code. The Client Component doesn't import or execute the server module.)
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — The children-as-prop pattern (runnable in Vite)
//
// This simulates the pattern where a CC receives SC content as children.
// In a real RSC app, the "server data" would be truly server-rendered.
// Here we simulate it with static props to demonstrate the composition.
// ─────────────────────────────────────────────────────────────

// Simulated "server rendered" content — in RSC this would be an async SC
function ServerRenderedContent({ product }: { product: { name: string; price: number; desc: string } }) {
  return (
    <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>{product.name}</h3>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#666' }}>{product.desc}</p>
      <strong>${product.price}</strong>
    </div>
  )
}

// CC: interactive shell — in RSC this would have 'use client'
function InteractiveShell({ children }: { children: React.ReactNode }) {
  const [inCart, setInCart] = useState(false)
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#f5f5f5', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          {expanded ? '▼' : '▶'} Details
        </button>
        <button
          onClick={() => setInCart(v => !v)}
          style={{ background: inCart ? '#2a2' : '#1a73e8', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
        >
          {inCart ? '✓ In Cart' : 'Add to Cart'}
        </button>
      </div>
      {expanded && (
        <div style={{ padding: '1rem' }}>
          {children}  {/* ← server-rendered content flows in here */}
        </div>
      )}
    </div>
  )
}

function Exercise3_ChildrenPattern() {
  const product = { name: 'React Deep Dive', price: 49.99, desc: 'Comprehensive guide to React internals and patterns.' }

  return (
    <section>
      <h2>Exercise 3: The Children Pattern (simulated)</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        InteractiveShell is a CC (handles clicks, state).
        ServerRenderedContent is simulated SC (would be server-only in RSC).
        The parent passes SC output as children to the CC — the CC never imports the SC.
      </p>
      <InteractiveShell>
        <ServerRenderedContent product={product} />
      </InteractiveShell>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: '2' }}>
          <li>Add a second product and pass its ServerRenderedContent as children to a second InteractiveShell.</li>
          <li>The two shells are independent CCs. The two content blocks are SCs. Zero server code reaches the client.</li>
          <li>In real RSC: ServerRenderedContent could query the DB directly and call heavy server-only libraries.
            None of that code ships to the browser.</li>
        </ol>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Props serialization rule
//
// All props passed from SC to CC must be serializable.
// Functions (except Server Actions) cannot cross the boundary.
// ─────────────────────────────────────────────────────────────
function Exercise4_SerializableProps() {
  return (
    <section>
      <h2>Exercise 4: Props Must Be Serializable</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The RSC wire format (flight format) serializes the component tree as data.
        Functions can't be serialized — they can't cross the server→client boundary.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
        <div style={{ background: '#fee', padding: '1rem', borderRadius: '8px' }}>
          <p><strong>❌ Not serializable</strong></p>
          <pre style={{ background: '#fff', padding: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>{`// page.tsx (SC)
<Button
  onClick={() => console.log('hi')}
/>
// Error: Functions cannot be passed from
// Server to Client Components as props`}</pre>
          <p>Functions are code — they can't travel over the wire as JSON.</p>
        </div>

        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
          <p><strong>✓ Serializable</strong></p>
          <pre style={{ background: '#fff', padding: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>{`// page.tsx (SC)
<ProductCard
  name="TypeScript Guide"  // string ✓
  price={39.99}            // number ✓
  tags={['ts', 'react']}   // array ✓
  meta={{ sku: 'TG-01' }}  // object ✓
/>

// The onClick handler lives inside the
// CC itself — it's never passed as a prop`}</pre>
          <p>Strings, numbers, arrays, plain objects, JSX: all serializable.</p>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Exception: Server Actions.</strong> These ARE functions defined with 'use server'
        that CAN be passed to Client Components — because the framework replaces them with
        an RPC reference (a URL + identifier), not the actual function code.
        <code style={{ display: 'block', marginTop: '0.5rem' }}>
          {'<Form action={submitAction} />  // Server Action: a serializable RPC reference, not a function'}
        </code>
      </div>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Server Components (RSC)</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> RSC requires Next.js App Router — this Vite app can't run real Server Components.
      These exercises focus on understanding the mental model through code reading,
      architecture decisions, and simulated patterns. The children-as-prop exercise (Ex 3) is fully runnable.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_ClassifyComponents />
      <hr />
      <Exercise2_ImportBoundary />
      <hr />
      <Exercise3_ChildrenPattern />
      <hr />
      <Exercise4_SerializableProps />
    </div>
  </div>
)

export default App
