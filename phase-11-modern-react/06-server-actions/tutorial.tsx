// ============================================================
// Topic:   Server Actions
// Phase:   11 — Modern React
// File:    tutorial.tsx
//
// Exercise type: SIMULATION + PATTERN RECOGNITION
//
// Server Actions require Next.js App Router — you can't run
// real 'use server' functions in Vite. Instead, these exercises:
//   1. Simulate the RPC pattern so you can feel the UX model
//   2. Show exactly what Server Actions look like in Next.js
//   3. Demonstrate the security model through a bypass scenario
//   4. Build muscle memory for form + pending + error state
//
// Run: npm run tutorial 06-server-actions
// ============================================================

import { useState, useTransition, createContext, useContext, FC, FormEvent } from 'react'

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The RPC pattern: a form that calls a "server function"
//
// A Server Action is an async function that runs on the server.
// You call it like a normal function — the framework handles the HTTP.
// This exercise simulates that: the "action" has a deliberate delay
// and returns either success data or an error object.
// ─────────────────────────────────────────────────────────────

// Simulated server-side validation + mutation
// In Next.js this would have 'use server' at the top and run on the server.
async function simulatedUpdateUsername(formData: FormData): Promise<{ error?: string; success?: string }> {
  const username = (formData.get('username') as string)?.trim()

  // Simulate network + server processing time
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Validation (would happen on the SERVER — not bypassable)
  if (!username) return { error: 'Username is required' }
  if (username.length < 3) return { error: 'Username must be at least 3 characters' }
  if (username.includes(' ')) return { error: 'Username cannot contain spaces' }
  if (username === 'admin') return { error: 'That username is reserved' }

  return { success: `Username updated to "${username}" ✓` }
}

function Exercise1_RPCPattern() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const res = await simulatedUpdateUsername(formData)
      setResult(res)
      if (res.success) form.reset()
    })
  }

  return (
    <section>
      <h2>Exercise 1: The Server Action Pattern (simulated)</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        In Next.js App Router, you'd pass the action directly to{' '}
        <code>{'<form action={updateUsername}>'}</code>. React intercepts the submit,
        serializes the FormData, and calls your 'use server' function via RPC.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
          <p style={{ margin: '0 0 0.5rem', color: '#89b4fa' }}>// actions/user.ts — Next.js</p>
          <pre style={{ margin: 0, lineHeight: '1.6' }}>{`'use server'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateUsername(fd: FormData) {
  const session = await auth() // server-only!
  if (!session) throw new Error('Unauthorized')

  const username = fd.get('username') as string

  if (!username || username.length < 3)
    return { error: 'Username too short' }

  await db.users.update({ id: session.userId,
    data: { username } })
  revalidatePath('/profile')
  return { success: true }
}`}</pre>
        </div>
        <div style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
          <p style={{ margin: '0 0 0.5rem', color: '#89b4fa' }}>// ProfileForm.tsx — Client Component</p>
          <pre style={{ margin: 0, lineHeight: '1.6' }}>{`'use client'
import { updateUsername } from '@/actions/user'
import { useActionState } from 'react'

export function ProfileForm() {
  const [state, formAction, isPending] =
    useActionState(updateUsername, null)

  return (
    // action= wires the Server Action to the form
    <form action={formAction}>
      {state?.error && <p>{state.error}</p>}
      <input name="username" />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  )
}`}</pre>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#333' }}>
          <strong>Try the simulated action:</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input
                name="username"
                placeholder="Enter new username"
                disabled={isPending}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '0.5rem 1.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: isPending ? '#aaa' : '#1a73e8', color: '#fff',
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
          {result?.error && (
            <p style={{ color: '#e55', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              ✗ {result.error}
            </p>
          )}
          {result?.success && (
            <p style={{ color: '#2a2', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {result.success}
            </p>
          )}
        </form>
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
          Try: short name, "admin", spaces, valid name. Observe the 1-second pending state.
        </p>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: answer these questions</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>In the real Next.js version, where does the validation run? (Server — not bypassable)</li>
          <li>Why is <code>useTransition</code> used here instead of just <code>useState(loading)</code>?
            (Transitions are interruptible; more importantly, useActionState gives you both)</li>
          <li>What is RPC? Draw the request flow: form submit → browser → framework POST → server fn → response</li>
          <li>What would happen if you called a Server Action from an <code>onClick</code> handler instead of a form?
            (Still works — just loses progressive enhancement)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — useFormStatus: pending state from inside the form
//
// useFormStatus reads the nearest parent <form>'s pending state.
// It MUST be in a component that is a CHILD of the form — not the
// component that renders the form. This is a common mistake.
// ─────────────────────────────────────────────────────────────

// Simulated form status context (mirrors how useFormStatus works)
const FormStatusCtx = createContext<{ pending: boolean }>({ pending: false })

// This mirrors 'useFormStatus' from 'react-dom'
function useSimulatedFormStatus() {
  return useContext(FormStatusCtx)
}

// ✓ This is a child of the form — it can read the form's pending state
function SubmitButton() {
  const { pending } = useSimulatedFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        padding: '0.5rem 2rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
        background: pending ? '#aaa' : '#2a7ae2', color: '#fff',
        transition: 'background 0.2s',
      }}
    >
      {pending ? (
        <span>⏳ Submitting…</span>
      ) : (
        <span>Submit</span>
      )}
    </button>
  )
}

async function simulatedContactAction(data: { name: string; message: string }) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  if (!data.message.trim()) return { error: 'Message is required' }
  return { success: `Message sent from ${data.name}!` }
}

function Exercise2_UseFormStatus() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      const res = await simulatedContactAction({
        name: fd.get('name') as string,
        message: fd.get('message') as string,
      })
      setResult(res)
      if (res.success) form.reset()
    })
  }

  return (
    <section>
      <h2>Exercise 2: useFormStatus — pending state in a child</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>useFormStatus</code> from <code>react-dom</code> lets a child component read
        whether the parent form is pending. The SubmitButton below reads{' '}
        <code>pending</code> from context — this is how the real hook works.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>Key rule:</strong> <code>useFormStatus()</code> must be called in a component
        that is rendered <em>inside</em> the <code>{'<form>'}</code>. You cannot call it in the same
        component that renders the form.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#fee', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
          <strong>❌ Wrong placement</strong>
          <pre style={{ background: '#fff', padding: '0.5rem', marginTop: '0.5rem', overflow: 'auto' }}>{`function ContactForm() {
  // ❌ useFormStatus here reads
  // the PARENT form, not this form
  const { pending } = useFormStatus()

  return (
    <form action={sendMessage}>
      <input name="msg" />
      <button disabled={pending}>
        Send
      </button>
    </form>
  )
}`}</pre>
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
          <strong>✓ Correct placement</strong>
          <pre style={{ background: '#fff', padding: '0.5rem', marginTop: '0.5rem', overflow: 'auto' }}>{`// SubmitButton.tsx — child component
function SubmitButton() {
  // ✓ Inside the form → reads THIS form
  const { pending } = useFormStatus()
  return (
    <button disabled={pending}>
      {pending ? 'Sending…' : 'Send'}
    </button>
  )
}

function ContactForm() {
  return (
    <form action={sendMessage}>
      <input name="msg" />
      <SubmitButton /> {/* ✓ child */}
    </form>
  )
}`}</pre>
        </div>
      </div>

      <FormStatusCtx.Provider value={{ pending: isPending }}>
        <form
          onSubmit={handleSubmit}
          style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              Your name
            </label>
            <input
              name="name"
              defaultValue="Alice"
              disabled={isPending}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
              Message
            </label>
            <textarea
              name="message"
              rows={3}
              disabled={isPending}
              placeholder="Write your message..."
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <SubmitButton />
            {result?.success && <span style={{ color: '#2a2', fontSize: '0.85rem' }}>✓ {result.success}</span>}
            {result?.error && <span style={{ color: '#e55', fontSize: '0.85rem' }}>✗ {result.error}</span>}
          </div>
        </form>
      </FormStatusCtx.Provider>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: understand the design</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Why can't you call <code>useFormStatus</code> in the component that owns the form?
            (It reads the PARENT form via context; there's no parent form in the form's own render scope)</li>
          <li>What does <code>useFormStatus</code> return besides <code>pending</code>?
            (Also: <code>data</code> (the FormData), <code>method</code>, <code>action</code>)</li>
          <li>Can you use <code>useFormStatus</code> without a Server Action? (Yes — any form, even <code>onSubmit</code>)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Security: server validation is the last line of defense
//
// Client-side validation improves UX but is always bypassable.
// A Server Action is a POST endpoint — anyone can call it.
// The validation inside the action is what actually protects the system.
// ─────────────────────────────────────────────────────────────

// What a malicious request looks like:
const BYPASS_DEMO = `// Attacker bypasses your form entirely:
fetch('/api/update-profile', {
  method: 'POST',
  body: JSON.stringify({ role: 'admin', userId: '1' }),
  headers: { 'Content-Type': 'application/json' },
})
// If the action doesn't re-validate: attacker becomes admin.`

// What the secure server action looks like:
const SECURE_ACTION = `// actions/profile.ts
'use server'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  displayName: z.string().min(1).max(50),
})

export async function updateProfile(formData: FormData) {
  // 1. Authenticate — read identity from server session, NEVER from formData
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  // 2. Validate — schema check on the server
  const parsed = schema.safeParse({
    displayName: formData.get('displayName'),
  })
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 3. Authorize — check the user can do THIS specific action
  if (session.user.id !== formData.get('userId')) {
    throw new Error('Forbidden')
  }

  await db.users.update({ id: session.user.id,
    data: parsed.data })
}`

function Exercise3_SecurityModel() {
  const [view, setView] = useState<'bypass' | 'secure'>('bypass')

  return (
    <section>
      <h2>Exercise 3: Security — Server Actions are POST endpoints</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Server Actions are HTTP endpoints. Any client can call them with arbitrary data.
        Your form's client-side validation doesn't protect you — the server action must
        validate, authenticate, and authorize every call.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('bypass')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: view === 'bypass' ? '#e55' : '#eee', color: view === 'bypass' ? '#fff' : '#333',
          }}
        >
          ❌ Bypass attack
        </button>
        <button
          onClick={() => setView('secure')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: view === 'secure' ? '#2a7' : '#eee', color: view === 'secure' ? '#fff' : '#333',
          }}
        >
          ✓ Secure action
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.5rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6' }}>
        {view === 'bypass' ? BYPASS_DEMO : SECURE_ACTION}
      </pre>

      <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Three security layers every Server Action needs:</strong>
        <ol style={{ lineHeight: '2', margin: '0.5rem 0 0' }}>
          <li><strong>Authentication:</strong> Read identity from the server session — never from form data</li>
          <li><strong>Input validation:</strong> Schema-check all inputs on the server (Zod, etc.)</li>
          <li><strong>Authorization:</strong> Verify the authenticated user has permission for THIS specific resource</li>
        </ol>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: think through the attack vectors</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>If you read <code>userId</code> from <code>formData.get('userId')</code> to identify who to update,
            what can an attacker do? (Send any userId — update any user's profile)</li>
          <li>If your form validates "max 50 chars" client-side but the action doesn't, what happens?
            (Attacker sends 10000 chars — storage bomb or truncation bugs)</li>
          <li>Why does Next.js add CSRF protection for Server Actions automatically?
            (Server Actions accept POST from any origin; framework adds an origin check)</li>
        </ol>
      </details>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Progressive enhancement: form works without JS
//
// When you pass a Server Action to <form action={...}>, React
// enables progressive enhancement: the form works even before
// JavaScript loads (or if it fails to load).
//
// This exercise shows what that looks like and when it matters.
// ─────────────────────────────────────────────────────────────

const PROGRESSIVE_FORM = `// page.tsx (Server Component)
// The form works WITHOUT JavaScript — progressive enhancement.
import { subscribeAction } from './actions'

export default function NewsletterPage() {
  return (
    <form action={subscribeAction}>
      {/*
        With JS: React intercepts submit → RPC call → no page reload
        Without JS: browser submits standard POST → server runs action → page reloads
        Both work because the <form> has a real action= attribute.
      */}
      <input
        type="email"
        name="email"
        required
        placeholder="your@email.com"
      />
      <button type="submit">Subscribe</button>
    </form>
  )
}

// actions.ts
'use server'
export async function subscribeAction(formData: FormData) {
  const email = formData.get('email') as string
  await newsletter.subscribe(email)
  redirect('/subscribed') // works for both JS and no-JS flows
}`

const EVENT_HANDLER_FORM = `// This pattern does NOT get progressive enhancement:
'use client'
import { subscribeAction } from './actions'

export function NewsletterForm() {
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // ← prevents the no-JS fallback!
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    await subscribeAction(fd) // still calls the Server Action
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" />
      <button type="submit">Subscribe</button>
    </form>
  )
  // Works with JS. Without JS: form submits to current URL with no handler.
}`

function Exercise4_ProgressiveEnhancement() {
  const [view, setView] = useState<'progressive' | 'handler'>('progressive')

  return (
    <section>
      <h2>Exercise 4: Progressive Enhancement — forms without JS</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Passing a Server Action directly to <code>{'<form action={fn}>'}</code> enables progressive
        enhancement: the form works before JavaScript loads. Using an <code>onSubmit</code> handler
        loses this benefit. Compare the two approaches.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('progressive')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: view === 'progressive' ? '#2a7ae2' : '#eee',
            color: view === 'progressive' ? '#fff' : '#333',
          }}
        >
          ✓ Progressive enhancement
        </button>
        <button
          onClick={() => setView('handler')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
            background: view === 'handler' ? '#e55' : '#eee',
            color: view === 'handler' ? '#fff' : '#333',
          }}
        >
          ⚠ Event handler
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.5rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: '1.6' }}>
        {view === 'progressive' ? PROGRESSIVE_FORM : EVENT_HANDLER_FORM}
      </pre>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>When does progressive enhancement matter?</strong>
        <ul style={{ lineHeight: '2', margin: '0.5rem 0 0' }}>
          <li>Slow 3G: the form is interactive before JS finishes loading (HTML is small, JS is large)</li>
          <li>JavaScript errors: if your bundle has a runtime error, forms still work</li>
          <li>Core user flows (login, checkout, newsletter): make them JS-independent</li>
          <li>Not every form needs it — interactive dashboards or real-time search don't benefit</li>
        </ul>
      </div>

      <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
        <summary>TODO: answer these questions</summary>
        <ol style={{ lineHeight: '2' }}>
          <li>Why does <code>e.preventDefault()</code> break progressive enhancement?
            (It prevents the native form submit that would work without JS)</li>
          <li>In the progressive enhancement version, what happens when JS <em>is</em> loaded?
            (React intercepts the submit → RPC call, no full page reload)</li>
          <li>What does <code>redirect()</code> do in a Server Action?
            (Throws a special error the framework catches — works for both JS and no-JS flows)</li>
          <li>Does every Server Action need to be used in a form?
            (No — you can call them directly from onClick handlers for non-form mutations)</li>
        </ol>
      </details>
    </section>
  )
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
    <h1>Server Actions</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> Server Actions require Next.js App Router — this Vite app simulates the patterns.
      The UX model (pending state, validation, progressive enhancement) is fully demonstrable.
      The 'use server' directive and actual server-side execution require a real RSC framework.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      <Exercise1_RPCPattern />
      <hr />
      <Exercise2_UseFormStatus />
      <hr />
      <Exercise3_SecurityModel />
      <hr />
      <Exercise4_ProgressiveEnhancement />
    </div>
  </div>
)

export default App
