// ============================================================
// Topic:   The `use()` Hook
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: BUILD + MECHANISM COMPARISON
//
// `use()` is a React 19 API — it's not available in React 18.
// These exercises:
//   1. Show what use() does and the mechanism it builds on
//   2. Demonstrate the same patterns using createResource (React 18)
//      so you can observe the behavior right now
//   3. Compare use() vs the older patterns side by side
//   4. Highlight the key new capability: conditional context reading
//
// The mental model transfers directly — use() is a cleaner API
// for the same thrown-Promise mechanism you already understand.
//
// Run: npm run tutorial 08-use-hook
// ============================================================

import {
  Suspense,
  useState,
  createContext,
  useContext,
  useCallback,
  useRef,
  FC,
  Component,
} from 'react'

// ─── Shared: createResource (React 18 equivalent of use()) ────
// This is what use(promise) does under the hood.
// Understanding this makes use() completely transparent.

type ResourceStatus<T> =
  | { status: 'pending'; promise: Promise<void> }
  | { status: 'success'; value: T }
  | { status: 'error'; reason: unknown }

function createResource<T>(promiseFn: () => Promise<T>) {
  let state: ResourceStatus<T> = {
    status: 'pending',
    promise: promiseFn().then(
      value => { state = { status: 'success', value } },
      reason => { state = { status: 'error', reason } }
    ),
  }
  return {
    read(): T {
      if (state.status === 'pending') throw state.promise
      if (state.status === 'error') throw state.reason
      return state.value
    },
  }
}

function fakeFetch<T>(data: T, delayMs: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), delayMs))
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — use(promise) vs createResource: the same mechanism
//
// use(promise) in React 19 is essentially createResource().read()
// in a single step. The thrown-Promise mechanism is identical.
// This exercise shows both patterns side by side.
// ─────────────────────────────────────────────────────────────

type Post = { title: string; preview: string; author: string }

// React 18 pattern: createResource at module scope
const postResource = createResource<Post>(() =>
  fakeFetch(
    { title: 'React 19 Deep Dive', preview: 'Everything that changed.', author: 'Alice' },
    900
  )
)

function PostCard_React18() {
  const post = postResource.read() // throws Promise if pending, throws Error if rejected
  return (
    <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 0.25rem' }}>{post.title}</h3>
      <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: '#666' }}>{post.preview}</p>
      <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>by {post.author}</p>
    </div>
  )
}

const REACT19_USE_CODE = `// React 19 — use() replaces createResource().read()

// 'use client'
import { use, Suspense } from 'react'

type Post = { title: string; preview: string; author: string }

// The promise is passed as a prop from a Server Component
// (or created in a parent and memoized — same rules as createResource)
function PostCard({ postPromise }: { postPromise: Promise<Post> }) {
  // use() suspends if the promise is pending
  // use() throws if the promise rejects (caught by ErrorBoundary)
  const post = use(postPromise)

  return (
    <div>
      <h3>{post.title}</h3>
      <p>{post.preview}</p>
      <p>by {post.author}</p>
    </div>
  )
}

// Server Component (or parent):
function Page() {
  // Promise created outside PostCard — stable across renders
  const postPromise = fetchPost('react-19') // starts immediately

  return (
    <Suspense fallback={<p>Loading post…</p>}>
      <PostCard postPromise={postPromise} />
    </Suspense>
  )
}`

function Exercise1_UseVsCreateResource() {
  return (
    <section>
      <h2>Exercise 1: use(promise) — what it does and what it builds on</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>use(promise)</code> is syntactic sugar over the thrown-Promise mechanism.
        The component below uses <code>createResource().read()</code> (React 18) — the exact
        same behavior as <code>use(promise)</code> in React 19. Observe the suspension.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Running in this app (React 18):
          </p>
          <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <code>createResource().read()</code> ← same mechanism as <code>use()</code>
          </div>
          <Suspense fallback={<p style={{ color: '#888', fontSize: '0.85rem' }}>⏳ Loading post… (900ms)</p>}>
            <PostCard_React18 />
          </Suspense>
        </div>
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            React 19 equivalent:
          </p>
          <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', lineHeight: '1.5', overflow: 'auto', margin: 0 }}>
            {REACT19_USE_CODE}
          </pre>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>What use() adds:</strong>
        <ul style={{ lineHeight: '2', margin: '0.5rem 0 0' }}>
          <li>Cleaner API — no wrapper object, just <code>use(promise)</code></li>
          <li>Works with any Promise — no need for the resource wrapper</li>
          <li>Can be called <strong>conditionally</strong> (unlike all other hooks)</li>
          <li>Reads Context too: <code>use(ThemeCtx)</code> ≡ <code>useContext(ThemeCtx)</code> but conditional</li>
        </ul>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: verify your understanding</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Trace through <code>createResource</code>: what does <code>read()</code> return when status is 'pending'?
            (Throws the Promise — React catches it, shows fallback)</li>
          <li>What would happen if <code>postResource = createResource(...)</code> was INSIDE <code>PostCard_React18</code>?
            (Infinite re-render loop — new resource created every render, always pending)</li>
          <li>In the React 19 version, the promise is created in the parent and passed as a prop.
            Why does this avoid the infinite loop?
            (The promise is created once in the parent — stable across PostCard re-renders)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Conditional use(): the key differentiator
//
// Every other hook must be called unconditionally at the top level.
// use() CAN be called inside conditionals — it's not tracked in
// the fiber hooks chain the same way.
//
// This is useful when fetching only when certain conditions are met.
// ─────────────────────────────────────────────────────────────

// Resources created at module scope — stable references
type UserProfile = { name: string; bio: string; postsCount: number }
const guestResource = createResource<UserProfile>(() =>
  fakeFetch({ name: 'Guest User', bio: 'Not logged in', postsCount: 0 }, 100)
)
const memberResource = createResource<UserProfile>(() =>
  fakeFetch({ name: 'Alice Chen', bio: 'Senior Engineer at Acme', postsCount: 47 }, 600)
)

// In React 18, we achieve conditional fetching by choosing which resource to read
// In React 19: if (!isLoggedIn) return <GuestView />; const user = use(memberPromise)
function ProfileBanner_React18({ isLoggedIn }: { isLoggedIn: boolean }) {
  // Conditionally read different resources based on login state
  const profile = isLoggedIn ? memberResource.read() : guestResource.read()

  return (
    <div style={{
      padding: '1rem', borderRadius: '8px',
      background: isLoggedIn ? '#e8f5e9' : '#f5f5f5',
      border: `1px solid ${isLoggedIn ? '#4caf50' : '#ddd'}`,
    }}>
      <strong>{profile.name}</strong>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>{profile.bio}</p>
      {isLoggedIn && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#888' }}>
          {profile.postsCount} posts published
        </p>
      )}
    </div>
  )
}

const CONDITIONAL_USE_CODE = `// React 19 — use() called conditionally

'use client'
import { use } from 'react'

type Props = {
  isLoggedIn: boolean
  userPromise: Promise<User> // only needed when logged in
}

function ProfileBanner({ isLoggedIn, userPromise }: Props) {
  if (!isLoggedIn) {
    // ← Early return BEFORE use() is called
    return <GuestBanner />
  }

  // ← use() called only when isLoggedIn is true
  // This is ILLEGAL with useState, useEffect, useContext
  // but LEGAL with use()
  const user = use(userPromise)

  return (
    <div>
      <strong>{user.name}</strong>
      <p>{user.bio}</p>
    </div>
  )
}`

function Exercise2_ConditionalUse() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <section>
      <h2>Exercise 2: Conditional use() — the key differentiator</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Toggle login state. A different resource is read based on the condition.
        In React 19, <code>use()</code> can be called inside an <code>if</code> block —
        this is illegal for all other hooks. The profile updates without re-mounting.
      </p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={() => setIsLoggedIn(v => !v)}
          style={{
            padding: '0.5rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
            background: isLoggedIn ? '#e55' : '#2a7ae2', color: '#fff',
          }}
        >
          {isLoggedIn ? '→ Log out' : '→ Log in'}
        </button>
        <span style={{ fontSize: '0.85rem', color: '#666' }}>
          Status: <strong>{isLoggedIn ? 'Logged in (member data, 600ms)' : 'Logged out (guest data, 100ms)'}</strong>
        </span>
      </div>

      <Suspense fallback={<p style={{ color: '#888', fontSize: '0.85rem' }}>⏳ Loading profile…</p>}>
        <ProfileBanner_React18 isLoggedIn={isLoggedIn} />
      </Suspense>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6', marginTop: '1rem' }}>
        {CONDITIONAL_USE_CODE}
      </pre>

      <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Why other hooks can't do this:</strong>
        <ul style={{ lineHeight: '2', margin: '0.5rem 0 0' }}>
          <li><code>useState</code>, <code>useEffect</code>, <code>useRef</code>: tracked by call order in the fiber.
            Conditional calls break the call-order contract — React can't match state to the right hook.</li>
          <li><code>use()</code>: treated differently by React — not tracked in the sequential hooks chain.
            It's a read primitive, not a state registration.</li>
          <li><code>useContext()</code>: also cannot be conditional. <code>use(ctx)</code> is its conditional-capable replacement.</li>
        </ul>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — use(context): conditional context reading
//
// use(Context) is equivalent to useContext(Context) but can be
// called conditionally. This matters when a component only needs
// context in some code paths — e.g., theme for some variants only.
// ─────────────────────────────────────────────────────────────

type Theme = { primary: string; background: string; text: string }

const themes: Record<string, Theme> = {
  blue: { primary: '#1a73e8', background: '#e3f2fd', text: '#0d47a1' },
  green: { primary: '#2e7d32', background: '#e8f5e9', text: '#1b5e20' },
  purple: { primary: '#7b1fa2', background: '#f3e5f5', text: '#4a148c' },
}

const ThemeContext = createContext<Theme>(themes.blue)

// useContext version — must be at top level (unconditional)
function Button_WithUseContext({ variant, label }: { variant: 'primary' | 'ghost'; label: string }) {
  // useContext called unconditionally — even for ghost buttons that don't need it
  const theme = useContext(ThemeContext)

  if (variant === 'ghost') {
    return (
      <button style={{ background: 'transparent', border: '1px solid #ddd', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
        {label} (ghost — theme read but unused)
      </button>
    )
  }

  return (
    <button style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
      {label} (themed: {theme.primary})
    </button>
  )
}

const CONDITIONAL_CONTEXT_CODE = `// React 19 — use(Context) conditionally

'use client'
import { use } from 'react'
import { ThemeContext } from './ThemeContext'

function Button({ variant, label }: { variant: 'primary' | 'ghost'; label: string }) {
  if (variant === 'ghost') {
    // ← Early return. Context NOT read for ghost buttons.
    // In real code: saves a context subscription for the ghost case.
    return <button className="ghost">{label}</button>
  }

  // ← use(Context) only called for non-ghost variants
  // Equivalent to useContext(ThemeContext) but can be conditional
  const theme = use(ThemeContext)

  return (
    <button style={{ background: theme.primary, color: '#fff' }}>
      {label}
    </button>
  )
}

// Same component using useContext — cannot be conditional:
function Button_Old({ variant, label }: ...) {
  // ❌ Must be here even if variant === 'ghost' — hooks can't be conditional
  const theme = useContext(ThemeContext)

  if (variant === 'ghost') return <button className="ghost">{label}</button>
  return <button style={{ background: theme.primary }}>{label}</button>
}`

function Exercise3_ConditionalContext() {
  const [themeName, setThemeName] = useState<keyof typeof themes>('blue')
  const theme = themes[themeName]

  return (
    <section>
      <h2>Exercise 3: use(Context) — conditional context reading</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>use(ThemeContext)</code> is equivalent to <code>useContext(ThemeContext)</code>
        but can be called inside conditions. The live demo uses <code>useContext</code>
        (available in React 18). The code panel shows the React 19 conditional version.
      </p>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem' }}>Theme:</span>
        {(Object.keys(themes) as (keyof typeof themes)[]).map(t => (
          <button
            key={t}
            onClick={() => setThemeName(t)}
            style={{
              padding: '0.3rem 0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
              background: themeName === t ? themes[t].primary : '#eee',
              color: themeName === t ? '#fff' : '#333',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <ThemeContext.Provider value={theme}>
        <div style={{ background: theme.background, padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button_WithUseContext variant="primary" label="Save changes" />
          <Button_WithUseContext variant="primary" label="Publish" />
          <Button_WithUseContext variant="ghost" label="Cancel" />
          <Button_WithUseContext variant="ghost" label="Discard" />
        </div>
      </ThemeContext.Provider>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6', marginTop: '1rem' }}>
        {CONDITIONAL_CONTEXT_CODE}
      </pre>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: think about when conditional context matters</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>In this component, does reading ThemeContext unconditionally cause a bug? (No — just slightly wasteful)</li>
          <li>When would conditional context reading matter significantly?
            (When context subscriptions are expensive, or when you want to clearly express "this variant doesn't need theme")</li>
          <li>Is there any case where <code>use(ctx)</code> returns something different than <code>useContext(ctx)</code>? (No — same value, same subscription, just callable conditionally)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Parallel data fetching with Promise-as-prop
//
// The most powerful RSC + use() pattern:
// A Server Component starts multiple fetches (no await),
// passes each Promise as a prop to a child CC.
// Each child uses use(promise) and suspends independently.
// Result: parallel fetches, independent resolution, no waterfall.
// ─────────────────────────────────────────────────────────────

// Simulated parallel resources — created at module scope (stable)
type DashUser = { name: string; avatar: string; notificationsCount: number }
type DashStats = { activeSessions: number; deployments: number; uptime: string }
type DashActivity = { events: string[] }

const userPromise_Ex4 = createResource<DashUser>(() =>
  fakeFetch({ name: 'Alice Chen', avatar: '👩‍💻', notificationsCount: 3 }, 500)
)
const statsPromise_Ex4 = createResource<DashStats>(() =>
  fakeFetch({ activeSessions: 12, deployments: 47, uptime: '99.97%' }, 800)
)
const activityPromise_Ex4 = createResource<DashActivity>(() =>
  fakeFetch({
    events: ['Deployed v2.3.1', 'Merged PR #142', 'Fixed critical bug', 'Updated dependencies'],
  }, 1100)
)

function UserPanel() {
  const user = userPromise_Ex4.read()
  return (
    <div style={{ padding: '0.75rem', background: '#e8f5e9', borderRadius: '8px', fontSize: '0.85rem' }}>
      <span style={{ fontSize: '1.5rem' }}>{user.avatar}</span>
      <p style={{ margin: '0.25rem 0 0' }}><strong>{user.name}</strong></p>
      <p style={{ margin: '0.15rem 0 0', color: '#555' }}>🔔 {user.notificationsCount} notifications</p>
    </div>
  )
}

function StatsPanel() {
  const stats = statsPromise_Ex4.read()
  return (
    <div style={{ padding: '0.75rem', background: '#e3f2fd', borderRadius: '8px', fontSize: '0.85rem' }}>
      <p style={{ margin: 0 }}><strong>Sessions:</strong> {stats.activeSessions}</p>
      <p style={{ margin: '0.25rem 0 0' }}><strong>Deployments:</strong> {stats.deployments}</p>
      <p style={{ margin: '0.25rem 0 0' }}><strong>Uptime:</strong> {stats.uptime}</p>
    </div>
  )
}

function ActivityPanel() {
  const activity = activityPromise_Ex4.read()
  return (
    <div style={{ padding: '0.75rem', background: '#f3e5f5', borderRadius: '8px', fontSize: '0.85rem' }}>
      <strong>Recent activity:</strong>
      <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
        {activity.events.map((e, i) => <li key={i} style={{ color: '#555' }}>{e}</li>)}
      </ul>
    </div>
  )
}

const PARALLEL_FETCH_CODE = `// Server Component (page.tsx) — Next.js App Router

import { Suspense } from 'react'
import { UserPanel } from './UserPanel'  // 'use client'
import { StatsPanel } from './StatsPanel' // 'use client'
import { ActivityPanel } from './ActivityPanel' // 'use client'

export default function DashboardPage() {
  // All three fetches START HERE — no await!
  // They run in PARALLEL from the moment the SC renders.
  const userPromise = fetchUser()     // → 500ms
  const statsPromise = fetchStats()   // → 800ms
  const activityPromise = fetchActivity() // → 1100ms

  return (
    <div className="dashboard">
      {/* Each panel gets its own Suspense boundary */}
      {/* Each resolves independently — no waterfall */}

      <Suspense fallback={<UserSkeleton />}>
        <UserPanel promise={userPromise} />      {/* shows at 500ms */}
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel promise={statsPromise} />    {/* shows at 800ms */}
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityPanel promise={activityPromise} /> {/* shows at 1100ms */}
      </Suspense>
    </div>
  )
}

// Client Component (UserPanel.tsx)
'use client'
import { use } from 'react'

export function UserPanel({ promise }: { promise: Promise<User> }) {
  const user = use(promise)  // ← suspends until resolved
  return <div>{user.name}</div>
}`

function Exercise4_ParallelDataFetching() {
  return (
    <section>
      <h2>Exercise 4: Parallel Data Fetching with Promise-as-Prop</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Three panels load independently — 500ms, 800ms, 1100ms. Each has its own Suspense
        boundary, so each appears as soon as its data is ready. This is the RSC + use() pattern:
        start fetches in the Server Component (no await), pass Promises as props to Client Components.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <Suspense fallback={
          <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.85rem', color: '#888' }}>
            ⌛ User (500ms)…
          </div>
        }>
          <UserPanel />
        </Suspense>
        <Suspense fallback={
          <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.85rem', color: '#888' }}>
            ⌛ Stats (800ms)…
          </div>
        }>
          <StatsPanel />
        </Suspense>
        <Suspense fallback={
          <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.85rem', color: '#888' }}>
            ⌛ Activity (1100ms)…
          </div>
        }>
          <ActivityPanel />
        </Suspense>
      </div>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: '1.6' }}>
        {PARALLEL_FETCH_CODE}
      </pre>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
        <div style={{ background: '#fee', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>❌ Waterfall pattern (avoid)</strong>
          <pre style={{ background: '#fff', padding: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>{`// Server Component
const user = await fetchUser()    // 500ms
const stats = await fetchStats()  // + 800ms
const activity = await fetchActivity() // + 1100ms
// Total: 2400ms (serial)`}</pre>
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '8px' }}>
          <strong>✓ Parallel pattern</strong>
          <pre style={{ background: '#fff', padding: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>{`// Server Component
const userPromise = fetchUser()    // starts now
const statsPromise = fetchStats()  // starts now
const activityPromise = fetchActivity() // starts now
// Total: 1100ms (parallel)`}</pre>
        </div>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: master the pattern</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>In the Server Component, why do we NOT await the promises?
            (await would serialize them — each waits for the previous; no await starts them all immediately)</li>
          <li>Why must the Promise be created in the SERVER component, not the CLIENT component?
            (Client component re-renders — new Promise on every render → infinite suspension loop)</li>
          <li>Compare this to <code>Promise.all</code>: what's the UX difference?
            (<code>Promise.all</code> waits for ALL before showing ANY; Promise-as-prop with independent Suspense shows each as it resolves)</li>
          <li>What happens if one of the promises rejects?
            (That panel's Error Boundary catches it; other panels continue loading normally)</li>
        </ol>
      </details>
    </section>
  )
}

// ─── Summary ─────────────────────────────────────────────────
function UseSummary() {
  return (
    <section style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
      <h2 style={{ marginTop: 0 }}>use() Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
        <div>
          <strong>What use() does:</strong>
          <ul style={{ lineHeight: '2', marginTop: '0.25rem' }}>
            <li><code>use(promise)</code> → suspends until resolved, throws on rejection</li>
            <li><code>use(Context)</code> → reads context value (like useContext)</li>
            <li>Can be called <strong>conditionally</strong> — unique among hooks</li>
            <li>Available in React 19 (not 18)</li>
          </ul>
        </div>
        <div>
          <strong>React 18 equivalent:</strong>
          <ul style={{ lineHeight: '2', marginTop: '0.25rem' }}>
            <li><code>createResource().read()</code> — same thrown-Promise mechanism</li>
            <li><code>useContext(ctx)</code> — equivalent but unconditional</li>
            <li>Mental model identical — use() is a cleaner API for the same behavior</li>
          </ul>
        </div>
      </div>
      <div style={{ background: '#fffde7', padding: '0.75rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Interview answer for "What does use() do?"</strong><br />
        <em>"use() is a React 19 hook that reads a Promise or Context value inside a component.
        For Promises: it suspends the component if the Promise is pending and throws if it rejects —
        the same thrown-Promise mechanism as createResource. For Context: it's equivalent to useContext
        but can be called conditionally. The key difference from other hooks is that use() can be called
        inside if/for blocks — React doesn't track it in the sequential hooks chain."</em>
      </div>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>The <code>use()</code> Hook</h1>
    <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>React version note:</strong> <code>use()</code> was released in React 19 (Dec 2024).
      This project uses React 18.3 — exercises use <code>createResource().read()</code> which is the
      identical underlying mechanism. The React 19 syntax is shown in code panels.
      The mental model transfers 1:1.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_UseVsCreateResource />
      <hr />
      <Exercise2_ConditionalUse />
      <hr />
      <Exercise3_ConditionalContext />
      <hr />
      <Exercise4_ParallelDataFetching />
      <hr />
      <UseSummary />
    </div>
  </div>
)

export default App
