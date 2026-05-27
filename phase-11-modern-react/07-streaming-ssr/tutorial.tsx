// ============================================================
// Topic:   Streaming SSR
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: VISUALIZATION + SIMULATION
//
// Real streaming SSR requires a server runtime (Node.js / Edge).
// These exercises simulate it in the browser to make the mental
// model concrete and observable:
//   1. The TTFB problem: all-at-once vs streaming
//   2. Shell vs deferred content — which parts stream first
//   3. Suspense boundaries as streaming units
//   4. renderToPipeableStream code reading
//
// Run: npm run tutorial 07-streaming-ssr
// ============================================================

import { Suspense, useState, useEffect, FC, Component } from 'react'

// ─── Shared: simulated async data ─────────────────────────────
function fakeFetch<T>(data: T, delayMs: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), delayMs))
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The TTFB problem: why streaming SSR exists
//
// Traditional SSR waits for ALL data before sending ANY bytes.
// If one query takes 1200ms, the user sees a blank page for 1200ms.
// Streaming SSR sends the shell (fast parts) immediately.
// The slow parts arrive as their data resolves — independently.
// ─────────────────────────────────────────────────────────────

// Simulates "all data must be ready before first byte" — traditional SSR
function TraditionalSSRSimulation() {
  const [state, setState] = useState<'waiting' | 'ready'>('waiting')
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Date.now() - start)
    }, 50)
    // Simulates slowest query: 1400ms before anything renders
    const timeout = setTimeout(() => {
      setState('ready')
      setRunning(false)
      clearInterval(interval)
    }, 1400)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [running])

  return (
    <div style={{ border: '2px solid #e55', borderRadius: '8px', padding: '1rem', flex: 1 }}>
      <p style={{ color: '#e55', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
        <strong>❌ Traditional SSR</strong>
      </p>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>
        Server waits for ALL data before sending any bytes.
        User sees nothing until the slowest query finishes.
      </p>

      {!running && state === 'waiting' && (
        <button
          onClick={() => { setRunning(true); setState('waiting'); setElapsed(0) }}
          style={{ padding: '0.4rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ▶ Simulate request
        </button>
      )}

      {running && (
        <div>
          <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#888', margin: 0 }}>
              ⏳ Server waiting for ALL data… ({elapsed}ms)
            </p>
            <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '0.25rem 0 0' }}>
              User sees a blank page
            </p>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <QueryRow label="Header (static)" delay={0} startTime={Date.now() - elapsed} />
            <QueryRow label="User data (50ms)" delay={50} startTime={Date.now() - elapsed} />
            <QueryRow label="Posts (400ms)" delay={400} startTime={Date.now() - elapsed} />
            <QueryRow label="Recommendations (1400ms)" delay={1400} startTime={Date.now() - elapsed} />
          </div>
        </div>
      )}

      {!running && state === 'ready' && (
        <div>
          <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: '#333', margin: 0 }}>
              ✓ All data ready! First byte sent at <strong>1400ms</strong>
            </p>
            <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.25rem 0 0' }}>
              The header, user data, and posts all waited for recommendations
            </p>
          </div>
          <button
            onClick={() => { setState('waiting'); setElapsed(0) }}
            style={{ padding: '0.3rem 0.75rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}

function QueryRow({ label, delay, startTime }: { label: string; delay: number; startTime: number }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const remaining = delay - (Date.now() - startTime)
    const t = setTimeout(() => setDone(true), Math.max(0, remaining))
    return () => clearTimeout(t)
  }, [delay, startTime])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0' }}>
      <span style={{ width: '12px', textAlign: 'center' }}>{done ? '✓' : '⏳'}</span>
      <span style={{ color: done ? '#2a2' : '#888' }}>{label}</span>
    </div>
  )
}

// Simulates streaming SSR with independent Suspense boundaries
// Each part streams as soon as its data is ready
type StreamSection = 'header' | 'user' | 'posts' | 'recs'
function StreamingSSRSimulation() {
  const [ready, setReady] = useState<Set<StreamSection>>(new Set())
  const [running, setRunning] = useState(false)
  const [firstByteMs, setFirstByteMs] = useState<number | null>(null)

  function start() {
    setReady(new Set())
    setFirstByteMs(null)
    setRunning(true)
    const startTime = Date.now()

    // Header is in the shell — available immediately
    setReady(new Set<StreamSection>(['header']))
    setFirstByteMs(Date.now() - startTime)

    setTimeout(() => setReady(r => new Set([...r, 'user' as StreamSection])), 50)
    setTimeout(() => setReady(r => new Set([...r, 'posts' as StreamSection])), 400)
    setTimeout(() => {
      setReady(r => new Set([...r, 'recs' as StreamSection]))
      setRunning(false)
    }, 1400)
  }

  return (
    <div style={{ border: '2px solid #2a7', borderRadius: '8px', padding: '1rem', flex: 1 }}>
      <p style={{ color: '#2a7', margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
        <strong>✓ Streaming SSR</strong>
      </p>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>
        Shell sent immediately. Each section streams when its data resolves.
        User sees meaningful content at ~0ms TTFB.
      </p>

      {!running && ready.size === 0 && (
        <button
          onClick={start}
          style={{ padding: '0.4rem 1rem', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ▶ Simulate request
        </button>
      )}

      {(running || ready.size > 0) && (
        <div>
          {firstByteMs !== null && (
            <p style={{ fontSize: '0.8rem', color: '#2a7', margin: '0 0 0.5rem' }}>
              ⚡ First byte at <strong>{firstByteMs}ms</strong> — shell delivered!
            </p>
          )}
          <StreamedSection label="Header (shell)" streamed={ready.has('header')} />
          <StreamedSection label="User data (50ms)" streamed={ready.has('user')} />
          <StreamedSection label="Posts (400ms)" streamed={ready.has('posts')} />
          <StreamedSection label="Recommendations (1400ms)" streamed={ready.has('recs')} />
          {!running && ready.size === 4 && (
            <button
              onClick={() => setReady(new Set())}
              style={{ marginTop: '0.5rem', padding: '0.3rem 0.75rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StreamedSection({ label, streamed }: { label: string; streamed: boolean }) {
  return (
    <div style={{
      marginBottom: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '4px',
      background: streamed ? '#e8f5e9' : '#f5f5f5',
      transition: 'background 0.3s',
      fontSize: '0.8rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      <span>{streamed ? '✓' : '⌛'}</span>
      <span style={{ color: streamed ? '#2a2' : '#888' }}>{label}</span>
      {!streamed && <span style={{ fontSize: '0.75rem', color: '#aaa' }}>(skeleton shown)</span>}
    </div>
  )
}

function Exercise1_TTFBProblem() {
  return (
    <section>
      <h2>Exercise 1: The TTFB Problem</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Run both simulations. Traditional SSR waits for the slowest query (1400ms) before
        sending any bytes. Streaming SSR sends the shell immediately — TTFB is near-zero.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <TraditionalSSRSimulation />
        <StreamingSSRSimulation />
      </div>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Key insight:</strong> Streaming SSR doesn't make data <em>arrive faster</em> —
        the total time to full page is the same. It makes the user <em>see something useful sooner</em>.
        TTFB determines when the browser starts rendering; streaming SSR minimizes it.
      </div>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: answer these questions</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>If the slowest query takes 2000ms, what is the TTFB difference between the two approaches?</li>
          <li>Why does streaming improve <em>perceived</em> performance even when total load time is the same?</li>
          <li>What is a "shell" in the context of streaming SSR?
            (The synchronous HTML — header, nav, layout skeleton — sent before any Suspense resolves)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Shell vs deferred content: what goes where
//
// The "shell" is everything that can render synchronously.
// Each <Suspense> boundary marks a deferred chunk.
// Understanding what belongs in the shell vs what gets streamed
// is the key decision in a streaming SSR page architecture.
// ─────────────────────────────────────────────────────────────

type ContentState<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'success'; value: T }

function createStreamResource<T>(fn: () => Promise<T>) {
  let state: ContentState<T> = {
    status: 'pending',
    promise: fn().then(v => { state = { status: 'success', value: v as T } }),
  }
  return {
    read(): T {
      if (state.status === 'pending') throw state.promise
      return state.value
    },
  }
}

// Shell content — no async, renders synchronously
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: '2px solid #2196f3', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#2196f3', padding: '0.5rem 1rem', color: '#fff', fontSize: '0.85rem' }}>
        <strong>Shell</strong> — sent at TTFB (synchronous, no data needed)
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ background: '#e3f2fd', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
          📦 Header (static markup — always in shell)
        </div>
        <div style={{ background: '#e3f2fd', padding: '0.5rem 0.75rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
          📦 Navigation (static — always in shell)
        </div>
        {children}
        <div style={{ background: '#e3f2fd', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.75rem', fontSize: '0.8rem' }}>
          📦 Footer (static markup — always in shell)
        </div>
      </div>
    </div>
  )
}

// Deferred section — renders when data resolves, then streams to browser
const userDataResource = createStreamResource(() =>
  fakeFetch({ name: 'Alice Chen', role: 'Engineer' }, 600)
)

const feedResource = createStreamResource(() =>
  fakeFetch(
    ['Shipped new feature', 'Code review done', 'Sprint planning tomorrow'],
    1200
  )
)

function UserDataSection() {
  const user = userDataResource.read()
  return (
    <div style={{ background: '#e8f5e9', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem' }}>
      <span style={{ color: '#2a7', marginRight: '0.5rem' }}>🌊 Streamed chunk (600ms):</span>
      Welcome back, <strong>{user.name}</strong> ({user.role})
    </div>
  )
}

function FeedSection() {
  const items = feedResource.read()
  return (
    <div style={{ background: '#f3e5f5', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem' }}>
      <span style={{ color: '#7b1fa2', marginRight: '0.5rem' }}>🌊 Streamed chunk (1200ms):</span>
      Activity: {items.join(' · ')}
    </div>
  )
}

function Exercise2_ShellVsDeferred() {
  return (
    <section>
      <h2>Exercise 2: Shell vs Deferred Content</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Blue sections are in the shell — sent immediately. Green and purple sections
        are behind Suspense boundaries — they stream in as data resolves (600ms and 1200ms).
        Watch them appear independently.
      </p>
      <PageShell>
        <Suspense fallback={
          <div style={{ background: '#f5f5f5', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', color: '#888' }}>
            ⌛ Loading user data… (skeleton shown in shell)
          </div>
        }>
          <UserDataSection />
        </Suspense>
        <div style={{ height: '0.5rem' }} />
        <Suspense fallback={
          <div style={{ background: '#f5f5f5', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem', color: '#888' }}>
            ⌛ Loading activity feed… (skeleton shown in shell)
          </div>
        }>
          <FeedSection />
        </Suspense>
      </PageShell>

      <div style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6' }}>
        <p style={{ color: '#89b4fa', margin: '0 0 0.5rem' }}>// Next.js App Router equivalent:</p>
        <pre style={{ margin: 0 }}>{`export default function DashboardPage() {
  return (
    <>
      <Header />  {/* shell */}
      <Nav />     {/* shell */}

      <Suspense fallback={<UserSkeleton />}>
        <UserData />  {/* streams at 600ms */}
      </Suspense>

      <Suspense fallback={<FeedSkeleton />}>
        <ActivityFeed />  {/* streams at 1200ms */}
      </Suspense>

      <Footer />  {/* shell */}
    </>
  )
}

// loading.tsx creates Suspense automatically:
// <Suspense fallback={<Loading />}><Page /></Suspense>`}</pre>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: design decisions</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Which components belong in the shell vs behind a Suspense?
            (Shell: static markup, navigation, layout; Suspense: anything that needs async data)</li>
          <li>What happens if a component throws an Error inside a Suspense boundary?
            (It propagates to the nearest Error Boundary — other Suspense boundaries still stream)</li>
          <li>What does <code>loading.tsx</code> do in Next.js App Router?
            (Creates an automatic Suspense boundary around the page with that file as the fallback)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Independent vs coupled Suspense boundaries
//
// One boundary that wraps everything = all content waits for slowest.
// Independent boundaries = each section resolves on its own schedule.
// The layout choice determines whether streaming helps you.
// ─────────────────────────────────────────────────────────────

const fastResource = createStreamResource(() =>
  fakeFetch({ text: 'Fast data (300ms)' }, 300)
)
const mediumResource = createStreamResource(() =>
  fakeFetch({ text: 'Medium data (700ms)' }, 700)
)
const slowResource = createStreamResource(() =>
  fakeFetch({ text: 'Slow data (1300ms)' }, 1300)
)

function FastSection() {
  const d = fastResource.read()
  return <p style={{ color: '#2a2', margin: '0.25rem 0', fontSize: '0.85rem' }}>✓ {d.text}</p>
}
function MediumSection() {
  const d = mediumResource.read()
  return <p style={{ color: '#2a2', margin: '0.25rem 0', fontSize: '0.85rem' }}>✓ {d.text}</p>
}
function SlowSection() {
  const d = slowResource.read()
  return <p style={{ color: '#2a2', margin: '0.25rem 0', fontSize: '0.85rem' }}>✓ {d.text}</p>
}

function CoupledDemo() {
  // Single boundary = all three wait for slowest (1300ms)
  return (
    <Suspense fallback={<p style={{ color: '#888', fontSize: '0.85rem' }}>⌛ Loading everything… (waits 1300ms)</p>}>
      <FastSection />
      <MediumSection />
      <SlowSection />
    </Suspense>
  )
}

function IndependentDemo() {
  // Independent boundaries = each section appears as soon as ready
  return (
    <>
      <Suspense fallback={<p style={{ color: '#888', fontSize: '0.85rem' }}>⌛ Loading fast…</p>}>
        <FastSection />
      </Suspense>
      <Suspense fallback={<p style={{ color: '#888', fontSize: '0.85rem' }}>⌛ Loading medium…</p>}>
        <MediumSection />
      </Suspense>
      <Suspense fallback={<p style={{ color: '#888', fontSize: '0.85rem' }}>⌛ Loading slow…</p>}>
        <SlowSection />
      </Suspense>
    </>
  )
}

function Exercise3_IndependentBoundaries() {
  return (
    <section>
      <h2>Exercise 3: Independent vs Coupled Suspense Boundaries</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Left: one Suspense wraps all three — fast and medium data waits for slow data (1300ms).
        Right: independent boundaries — each section appears as soon as its data is ready.
        Both fetch in parallel — the difference is when each section becomes visible.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ border: '2px solid #e55', borderRadius: '8px', padding: '1rem' }}>
          <p style={{ color: '#e55', margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
            <strong>❌ Coupled boundary</strong>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.75rem' }}>
            All three wait for the slowest
          </p>
          <CoupledDemo />
        </div>
        <div style={{ border: '2px solid #2a7', borderRadius: '8px', padding: '1rem' }}>
          <p style={{ color: '#2a7', margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
            <strong>✓ Independent boundaries</strong>
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.75rem' }}>
            Each appears as soon as ready
          </p>
          <IndependentDemo />
        </div>
      </div>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Rule:</strong> One Suspense boundary per independently-loading piece of UI.
        Group sections that logically appear together (e.g., a chart with its legend).
        Separate sections that users benefit from seeing immediately (e.g., main content before sidebar).
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — renderToPipeableStream: the server API
//
// This is the Node.js API that makes streaming SSR possible.
// You won't write it in every project (Next.js handles it),
// but understanding it demystifies what the framework does.
// ─────────────────────────────────────────────────────────────

const RENDER_TO_PIPEABLE = `// server.ts — Express / Node.js HTTP handler
import { renderToPipeableStream } from 'react-dom/server'
import { App } from './App'

app.get('*', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(
    <App url={req.url} />,
    {
      bootstrapScripts: ['/static/main.js'],

      onShellReady() {
        // Shell is ready — start sending bytes immediately
        // Shell = all synchronous content above Suspense boundaries
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        pipe(res)  // ← streams shell now, async chunks later
      },

      onShellError(error) {
        // The synchronous shell itself failed to render
        // (not a Suspense error — those are isolated)
        res.statusCode = 500
        res.end('<html><body><h1>Something went wrong</h1></body></html>')
      },

      onAllReady() {
        // ALL content (including all Suspense) has resolved.
        // Useful for bots/crawlers that need the full HTML before parsing.
        // For streaming to humans: use onShellReady instead.
      },

      onError(error, errorInfo) {
        console.error(error, errorInfo.componentStack)
        // Log but don't crash — isolated Suspense errors continue streaming
      },
    }
  )

  // Safety valve: abort after 10 seconds
  // Aborted Suspense boundaries use their fallback HTML permanently
  setTimeout(abort, 10_000)
})`

const EDGE_RUNTIME = `// route.ts — Edge Runtime (Cloudflare Workers, Vercel Edge)
import { renderToReadableStream } from 'react-dom/server'
import { App } from './App'

export async function GET(request: Request) {
  // renderToReadableStream returns a Web ReadableStream
  const stream = await renderToReadableStream(<App />, {
    bootstrapScripts: ['/main.js'],
  })

  // For search engine crawlers: wait for complete HTML
  const userAgent = request.headers.get('user-agent') ?? ''
  if (isBotUA(userAgent)) {
    await stream.allReady
  }

  return new Response(stream, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Difference from renderToPipeableStream:
// - Returns Web ReadableStream (not Node.js stream)
// - Works anywhere the Fetch API works: Deno, CF Workers, Bun
// - No pipe() — pass the stream directly to Response`

function Exercise4_RenderToPipeableStream() {
  const [view, setView] = useState<'node' | 'edge'>('node')

  return (
    <section>
      <h2>Exercise 4: renderToPipeableStream API</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        This is the server-side API that powers streaming SSR. Next.js and other frameworks
        call this for you — but understanding it removes the magic. Compare Node.js vs Edge runtimes.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('node')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: view === 'node' ? '#2a7ae2' : '#eee',
            color: view === 'node' ? '#fff' : '#333',
          }}
        >
          Node.js (renderToPipeableStream)
        </button>
        <button
          onClick={() => setView('edge')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: view === 'edge' ? '#7b1fa2' : '#eee',
            color: view === 'edge' ? '#fff' : '#333',
          }}
        >
          Edge (renderToReadableStream)
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.5rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6' }}>
        {view === 'node' ? RENDER_TO_PIPEABLE : EDGE_RUNTIME}
      </pre>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem' }}>
        <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>onShellReady</strong>
          <p style={{ margin: '0.25rem 0 0' }}>
            Fires when synchronous content is ready. Start streaming to users here.
            Called before any Suspense boundaries resolve.
          </p>
        </div>
        <div style={{ background: '#f3e5f5', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>onAllReady</strong>
          <p style={{ margin: '0.25rem 0 0' }}>
            Fires when everything, including all Suspense, is resolved.
            Use this for bots/crawlers that need complete HTML.
          </p>
        </div>
        <div style={{ background: '#fff3e0', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>onShellError</strong>
          <p style={{ margin: '0.25rem 0 0' }}>
            Fires if the synchronous shell itself fails to render.
            Must respond with a fallback HTML document.
          </p>
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>abort()</strong>
          <p style={{ margin: '0.25rem 0 0' }}>
            Stops streaming after a timeout. Unresolved Suspense boundaries
            render their fallback HTML permanently.
          </p>
        </div>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: answer these questions</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>When does <code>onShellReady</code> fire relative to Suspense boundaries resolving?
            (Before them — shell is synchronous content only)</li>
          <li>Why do bots/crawlers need <code>await stream.allReady</code> instead of streaming?
            (Crawlers can't process chunked responses correctly — they need complete HTML)</li>
          <li>In Next.js App Router, what do you write instead of <code>renderToPipeableStream</code>?
            (Nothing — it's automatic for any async Server Component; <code>loading.tsx</code> creates the Suspense boundary)</li>
          <li>What does <code>abort()</code> do to a Suspense boundary that hasn't resolved yet?
            (Its fallback HTML is permanently emitted — no more streaming for that boundary)</li>
        </ol>
      </details>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Streaming SSR</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> Real streaming SSR runs on a Node.js or Edge server. These exercises simulate
      the timing and Suspense behavior in the browser so you can observe the model. The Suspense
      composition (Exercises 2 & 3) is fully real — it works exactly the same in streaming SSR.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_TTFBProblem />
      <hr />
      <Exercise2_ShellVsDeferred />
      <hr />
      <Exercise3_IndependentBoundaries />
      <hr />
      <Exercise4_RenderToPipeableStream />
    </div>
  </div>
)

export default App
