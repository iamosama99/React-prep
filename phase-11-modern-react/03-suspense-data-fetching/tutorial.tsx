// ============================================================
// Topic:   Suspense for Data Fetching
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: MECHANISM BUILD
// You implement the thrown-Promise mechanism yourself,
// then use it with nested Suspense boundaries, then fix a waterfall.
//
// Run: npm run tutorial 03-suspense-data-fetching
// ============================================================

import { Suspense, useState, FC, Component } from 'react'

// ─── The thrown-Promise mechanism ─────────────────────────────
// This is what React Query / SWR implement for you.
// Understanding it removes the magic.

type ResourceStatus<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'success'; value: T }
  | { status: 'error'; reason: unknown }

export function createResource<T>(promiseFn: () => Promise<T>) {
  let state: ResourceStatus<T> = {
    status: 'pending',
    promise: promiseFn().then(
      value => { state = { status: 'success', value } },
      reason => { state = { status: 'error', reason } }
    ),
  }

  return {
    read(): T {
      if (state.status === 'pending') throw state.promise  // suspend
      if (state.status === 'error') throw state.reason     // error boundary
      return state.value                                   // data ready
    },
  }
}

// ─── Fake async data source ───────────────────────────────────
function fakeFetch<T>(data: T, delayMs: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), delayMs))
}

type User = { id: number; name: string; role: string }
type Post = { id: number; title: string; preview: string }
type Comment = { id: number; author: string; text: string }

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Build a minimal Suspense-compatible component
//
// The resource is created OUTSIDE the component (see the notes).
// The component calls resource.read() synchronously.
// React catches the thrown Promise and shows the fallback.
// ─────────────────────────────────────────────────────────────
// The resource must be created at module scope (or in a parent)
// so it survives re-renders. If it were created inside the component,
// each render would start a new fetch and loop forever.
const userResource = createResource<User>(() =>
  fakeFetch({ id: 1, name: 'Alice Chen', role: 'Senior Engineer' }, 1200)
)

function UserProfile() {
  const user = userResource.read() // may throw Promise (suspends) or Error
  return (
    <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
      <h3>{user.name}</h3>
      <p>{user.role}</p>
    </div>
  )
}

function Exercise1_BasicSuspense() {
  return (
    <section>
      <h2>Exercise 1: Basic Suspense</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The UserProfile component calls <code>resource.read()</code> which throws a Promise
        if data isn't ready. React catches it, shows the fallback, and re-renders when resolved.
      </p>
      <Suspense fallback={<p style={{ color: '#888' }}>⏳ Loading user profile...</p>}>
        <UserProfile />
      </Suspense>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: understand what happens</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Open the createResource function above. Trace through what state starts as.</li>
          <li>Call resource.read() mentally: status is 'pending' → what does it return? (throws the promise)</li>
          <li>After 1200ms: status becomes 'success'. React re-renders. read() returns the value.</li>
          <li>What would happen if you called createResource inside the component? (see notes.md)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Nested Suspense Boundaries
//
// Each boundary resolves independently.
// Fast data (Posts, 400ms) shows before slow data (Comments, 1800ms).
// The outer boundary only catches what the inner ones don't cover.
// ─────────────────────────────────────────────────────────────
const postsResource = createResource<Post[]>(() =>
  fakeFetch(
    [
      { id: 1, title: 'Testing React 18', preview: 'Deep dive into concurrent features...' },
      { id: 2, title: 'Suspense Patterns', preview: 'How frameworks integrate with Suspense...' },
    ],
    400
  )
)

const commentsResource = createResource<Comment[]>(() =>
  fakeFetch(
    [
      { id: 1, author: 'Bob', text: 'Great article!' },
      { id: 2, author: 'Carol', text: 'Very helpful.' },
    ],
    1800
  )
)

function PostList() {
  const posts = postsResource.read()
  return (
    <ul style={{ padding: 0 }}>
      {posts.map(post => (
        <li key={post.id} style={{ marginBottom: '0.5rem', listStyle: 'none', padding: '0.5rem', background: '#f0f0f0', borderRadius: '4px' }}>
          <strong>{post.title}</strong>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>{post.preview}</p>
        </li>
      ))}
    </ul>
  )
}

function CommentList() {
  const comments = commentsResource.read()
  return (
    <ul style={{ padding: 0 }}>
      {comments.map(c => (
        <li key={c.id} style={{ marginBottom: '0.5rem', listStyle: 'none', borderLeft: '3px solid #ddd', paddingLeft: '0.75rem' }}>
          <strong>{c.author}:</strong> {c.text}
        </li>
      ))}
    </ul>
  )
}

function Exercise2_NestedBoundaries() {
  return (
    <section>
      <h2>Exercise 2: Nested Boundaries (independent resolution)</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Posts load in 400ms. Comments in 1800ms. Each has its own boundary.
        Watch them appear independently — no waiting for the slowest.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <h3>Posts (400ms)</h3>
          <Suspense fallback={<p style={{ color: '#888' }}>⏳ Loading posts...</p>}>
            <PostList />
          </Suspense>
        </div>
        <div>
          <h3>Comments (1800ms)</h3>
          <Suspense fallback={<p style={{ color: '#888' }}>⏳ Loading comments...</p>}>
            <CommentList />
          </Suspense>
        </div>
      </div>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: experiment with boundary placement</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Move both PostList and CommentList inside a SINGLE Suspense boundary.
            What changes? (Both wait for the slowest one — waterfall behavior)</li>
          <li>Why does wrapping them in one boundary make the UX worse even though
            the data loads in parallel?</li>
          <li>Rule: one Suspense boundary per independently-loading piece of UI.</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — The Waterfall Problem
//
// Sequential Suspense = 3 round trips in series.
// Each component can't even START fetching until the parent resolves.
// ─────────────────────────────────────────────────────────────

// Waterfall: each resource waits for the previous to resolve before mounting
// (simulated by creating resources lazily inside components)
function createLazyResource<T>(data: T, delay: number) {
  return createResource<T>(() => fakeFetch(data, delay))
}

// ❌ Waterfall: each fetch starts only when the parent renders
function WaterfallLevel3() {
  const r3 = createLazyResource({ text: 'Comments loaded' }, 600)
  const result = r3.read()
  return <p style={{ color: '#2a2' }}>✓ Level 3: {result.text}</p>
}

function WaterfallLevel2() {
  const r2 = createLazyResource({ text: 'Posts loaded' }, 600)
  const result = r2.read()
  return (
    <>
      <p style={{ color: '#2a2' }}>✓ Level 2: {result.text}</p>
      <Suspense fallback={<p style={{ color: '#888' }}>⏳ Level 3 loading...</p>}>
        <WaterfallLevel3 />
      </Suspense>
    </>
  )
}

function WaterfallLevel1() {
  const r1 = createLazyResource({ text: 'User loaded' }, 600)
  const result = r1.read()
  return (
    <>
      <p style={{ color: '#2a2' }}>✓ Level 1: {result.text}</p>
      <Suspense fallback={<p style={{ color: '#888' }}>⏳ Level 2 loading...</p>}>
        <WaterfallLevel2 />
      </Suspense>
    </>
  )
}

// ✓ Parallel: all resources start immediately
const parallelR1 = createResource(() => fakeFetch({ text: 'User loaded' }, 600))
const parallelR2 = createResource(() => fakeFetch({ text: 'Posts loaded' }, 600))
const parallelR3 = createResource(() => fakeFetch({ text: 'Comments loaded' }, 600))

function ParallelAll() {
  const r1 = parallelR1.read()
  const r2 = parallelR2.read()
  const r3 = parallelR3.read()
  return (
    <>
      <p style={{ color: '#2a2' }}>✓ {r1.text}</p>
      <p style={{ color: '#2a2' }}>✓ {r2.text}</p>
      <p style={{ color: '#2a2' }}>✓ {r3.text}</p>
    </>
  )
}

function Exercise3_Waterfall() {
  return (
    <section>
      <h2>Exercise 3: Waterfall vs Parallel</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <p style={{ color: '#e55', fontSize: '0.85rem' }}>
            ❌ Waterfall: 3 × 600ms = 1800ms total
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>
            Each fetch starts after the previous renders
          </p>
          <Suspense fallback={<p style={{ color: '#888' }}>⏳ Level 1 loading...</p>}>
            <WaterfallLevel1 />
          </Suspense>
        </div>
        <div>
          <p style={{ color: '#2a2', fontSize: '0.85rem' }}>
            ✓ Parallel: 1 × 600ms total
          </p>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>
            All fetches start at module load time
          </p>
          <Suspense fallback={<p style={{ color: '#888' }}>⏳ Loading all...</p>}>
            <ParallelAll />
          </Suspense>
        </div>
      </div>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: fix the waterfall pattern</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>In the waterfall version: Level2 doesn't even START fetching until Level1 renders.
            That's the cascade — every 600ms of delay is serial.</li>
          <li>The parallel fix: move all createResource calls to module scope (outside components).
            Fetches start immediately when the JS loads.</li>
          <li>In a framework (Next.js, Remix): loaders and Server Components handle this.
            You don't manually hoist resources — the framework kicks off all fetches in parallel
            before rendering the component tree.</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Error Boundaries alongside Suspense
//
// Suspense catches thrown Promises. Error Boundaries catch thrown Errors.
// They work as a pair: Error Boundary wraps Suspense.
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ color: '#e55', background: '#fee', padding: '0.75rem', borderRadius: '8px' }}>
          {this.props.fallback}: {this.state.message}
        </div>
      )
    }
    return this.props.children
  }
}

const failingResource = createResource<User>(() =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('User not found')), 800))
)

function FailingComponent() {
  const user = failingResource.read() // will throw Error after 800ms
  return <p>{user.name}</p>
}

function Exercise4_ErrorBoundary() {
  return (
    <section>
      <h2>Exercise 4: Error Boundary + Suspense</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The component below fetches data that fails. The Error Boundary catches the thrown Error.
        Without the Error Boundary, the error would crash the whole tree.
      </p>
      <ErrorBoundary fallback="Data failed to load">
        <Suspense fallback={<p style={{ color: '#888' }}>⏳ Loading (will fail in 800ms)...</p>}>
          <FailingComponent />
        </Suspense>
      </ErrorBoundary>
      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: understand the throw types</summary>
        <ul style={{ lineHeight: '2' }}>
          <li>When resource.read() throws a <strong>Promise</strong>: Suspense boundary catches it → shows fallback</li>
          <li>When resource.read() throws an <strong>Error</strong>: Error Boundary catches it → shows error UI</li>
          <li>Standard pattern: ErrorBoundary (outer) → Suspense (inner)</li>
          <li>Without ErrorBoundary: the thrown error propagates up and crashes the nearest non-caught tree</li>
        </ul>
      </details>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Suspense for Data Fetching</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      You're implementing the mechanism from scratch (createResource) and seeing it
      in progressively more realistic scenarios. The delays are real — watch the
      loading states appear and resolve in sequence.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_BasicSuspense />
      <hr />
      <Exercise2_NestedBoundaries />
      <hr />
      <Exercise3_Waterfall />
      <hr />
      <Exercise4_ErrorBoundary />
    </div>
  </div>
)

export default App
