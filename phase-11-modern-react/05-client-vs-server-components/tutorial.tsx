// ============================================================
// Topic:   Client vs Server Components
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: REFACTORING + COMPOSITION PATTERNS
//
// Focus: the 'use client' boundary as a module marker,
// minimizing client JS, and the three composition patterns
// that make SC/CC trees work together.
//
// Run: npm run tutorial 05-client-vs-server-components
// ============================================================

import { useState, createContext, useContext, FC, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Identify 'use client' over-use
//
// A common mistake: adding 'use client' to everything.
// This exercise shows what gets pulled into the client bundle
// when you do that — and how to fix it.
// ─────────────────────────────────────────────────────────────

// Scenario: a blog post page in Next.js App Router
// The developer added 'use client' to everything "to be safe"

// ❌ Over-clientified tree (what NOT to do)
const OVER_CLIENTIFIED_CODE = `
// ALL of these have 'use client' — most don't need it:

'use client'
export function BlogLayout({ children }) {
  // No hooks, no events — but 'use client' pulls ALL imports
  // (including the markdown parser, syntax highlighter, etc.) into the bundle
  return <main>{children}</main>
}

'use client'
export function AuthorBio({ author }) {
  // Pure markup — no interactivity needed
  return <div><img src={author.avatar} /><p>{author.name}</p></div>
}

'use client'
export function PostContent({ mdx }) {
  // Renders MDX — server-only library (heavy) now in client bundle!
  return <div dangerouslySetInnerHTML={{ __html: mdx }} />
}

// Only this ONE needs 'use client':
'use client'
export function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(v=>!v)}>{liked ? '♥' : '♡'}</button>
}
`

// ✓ Correct version: only LikeButton is a CC
const CORRECT_CODE = `
// NO 'use client' on server-only components:

// BlogLayout.tsx — SC (no directive needed, default in App Router)
export function BlogLayout({ children }) {
  return <main>{children}</main>
}

// AuthorBio.tsx — SC
export function AuthorBio({ author }) {
  return <div><img src={author.avatar} /><p>{author.name}</p></div>
}

// PostContent.tsx — SC (MDX library never reaches client bundle)
export async function PostContent({ slug }) {
  const { content } = await getPost(slug) // server-only call
  return <article dangerouslySetInnerHTML={{ __html: content }} />
}

// LikeButton.tsx — CC (only file that needs 'use client')
'use client'
export function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false)
  return <button onClick={() => setLiked(v=>!v)}>{liked ? '♥' : '♡'}</button>
}
`

function Exercise1_OverUseOfUseClient() {
  const [view, setView] = useState<'bad' | 'good'>('bad')
  return (
    <section>
      <h2>Exercise 1: 'use client' over-use</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Toggle between the over-clientified and correct versions.
        How many components actually need 'use client'?
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('bad')}
          style={{ background: view === 'bad' ? '#e55' : '#eee', color: view === 'bad' ? '#fff' : '#333', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
        >
          ❌ Over-clientified
        </button>
        <button
          onClick={() => setView('good')}
          style={{ background: view === 'good' ? '#2a2' : '#eee', color: view === 'good' ? '#fff' : '#333', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
        >
          ✓ Correct
        </button>
      </div>
      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.5rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6' }}>
        {view === 'bad' ? OVER_CLIENTIFIED_CODE : CORRECT_CODE}
      </pre>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Impact:</strong> In the over-clientified version, the MDX library, markdown parser,
        and syntax highlighter all ship to the client. Could add 100-300KB+ to the bundle.
        In the correct version: zero. They run only on the server.
      </div>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: answer these questions</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>What is 'use client' really marking? (A module boundary, not a component type)</li>
          <li>In the over-clientified version, does BlogLayout NEED useState or event handlers? No — so why is it CC?</li>
          <li>The MDX library is "heavy" — why does making PostContent a CC make it a bundle problem?</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Context provider around SC children (runnable)
//
// Server Components can't CONSUME context (no useContext).
// But a CC context provider CAN wrap SC content as children.
// The SC children don't read the context — only CCs in the tree do.
// ─────────────────────────────────────────────────────────────
type Theme = 'light' | 'dark'
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | null>(null)

function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 'use client' would be here in a real file
  const [theme, setTheme] = useState<Theme>('light')
  const toggle = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), [])
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

function ThemeToggle() {
  // 'use client' — this is a CC that consumes the context
  const ctx = useContext(ThemeCtx)
  if (!ctx) return null
  return (
    <button
      onClick={ctx.toggle}
      style={{
        position: 'fixed', top: '1rem', right: '1rem',
        background: ctx.theme === 'dark' ? '#444' : '#ddd',
        border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: 'pointer',
      }}
    >
      {ctx.theme === 'dark' ? '☀ Light' : '🌙 Dark'}
    </button>
  )
}

// Simulated SC (pure markup — no hooks, no events)
function StaticArticle({ title, body }: { title: string; body: string }) {
  return (
    <article style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '8px', marginTop: '0.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>{body}</p>
    </article>
  )
}

function Exercise2_ContextWithSCChildren() {
  return (
    <section>
      <h2>Exercise 2: Context Provider + SC Children</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        ThemeProvider is a CC. StaticArticle simulates a SC (pure markup).
        The SC is passed as children — it doesn't consume the context, but
        the ThemeToggle CC in the tree does.
      </p>
      <ThemeProvider>
        <ThemeToggle />
        <StaticArticle
          title="Understanding RSC"
          body="Server Components run on the server and ship zero JS. Only Client Components need 'use client'."
        />
        <StaticArticle
          title="The children pattern"
          body="Pass SC output into CC via children. The CC receives serialized React nodes, not server code."
        />
      </ThemeProvider>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ul style={{ lineHeight: '2', margin: '0.5rem 0 0' }}>
          <li>In a real Next.js app: add <code>useContext(ThemeCtx)</code> inside StaticArticle.
            It would throw: "useContext is only available in Client Components."</li>
          <li>The SC can receive the theme as a serializable <em>prop</em> from the provider if needed —
            but it can't call useContext itself.</li>
          <li>Why does this make sense? SCs run on the server where there's no React context runtime.</li>
        </ul>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — The decision flowchart
//
// A practical decision tool for every component you write.
// ─────────────────────────────────────────────────────────────
function Exercise3_DecisionFlowchart() {
  const [answers, setAnswers] = useState({ hooks: '', events: '', browserApi: '', heavyLib: '' })

  const toggle = (key: keyof typeof answers, val: string) => {
    setAnswers(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))
  }

  const needsCC = answers.hooks === 'yes' || answers.events === 'yes' || answers.browserApi === 'yes'
  const shouldBeSC = !needsCC

  return (
    <section>
      <h2>Exercise 3: Decision Flowchart</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Answer these questions for a component you're designing. The verdict updates automatically.
      </p>
      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
        {[
          { key: 'hooks', q: 'Does it use useState, useEffect, useRef, or custom hooks?' },
          { key: 'events', q: 'Does it attach event handlers (onClick, onChange, etc.)?' },
          { key: 'browserApi', q: 'Does it access window, document, localStorage, or navigator?' },
          { key: 'heavyLib', q: 'Does it import a heavy library (markdown parser, chart lib, etc.)?' },
        ].map(({ key, q }) => (
          <div key={key} style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>{q}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['yes', 'no'].map(val => (
                <button
                  key={val}
                  onClick={() => toggle(key as keyof typeof answers, val)}
                  style={{
                    padding: '0.3rem 1rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer',
                    background: answers[key as keyof typeof answers] === val ? (val === 'yes' ? '#ffd' : '#dfd') : '#fff',
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{
          marginTop: '1rem', padding: '1rem', borderRadius: '8px',
          background: shouldBeSC ? '#e8f5e9' : '#e3f2fd',
          border: `2px solid ${shouldBeSC ? '#4caf50' : '#2196f3'}`,
        }}>
          <strong style={{ fontSize: '1.1rem' }}>
            {shouldBeSC
              ? '✓ Server Component — no client directive needed'
              : '→ Client Component — add \'use client\' directive'}
          </strong>
          {!shouldBeSC && answers.heavyLib === 'yes' && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#555' }}>
              Tip: Can you extract just the interactive parts into a separate CC and keep the
              heavy library import in a SC wrapper? Minimize what's CC.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
    <h1>Client vs Server Components</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      The key skill: minimize the client zone. Start everything as SC,
      reach for 'use client' only when absolutely necessary.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_OverUseOfUseClient />
      <hr />
      <Exercise2_ContextWithSCChildren />
      <hr />
      <Exercise3_DecisionFlowchart />
    </div>
  </div>
)

export default App
