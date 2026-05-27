// ============================================================
// Topic:   Remix Basics
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: SIMULATION + PATTERN RECOGNITION + COMPARISON
//
// Remix can't run in Vite, but you CAN simulate the key behaviors:
//   1. The loader/action/revalidation cycle (CRUD with simulated server)
//   2. Parallel loaders vs waterfall (visual timing)
//   3. Progressive enhancement form vs onSubmit comparison
//   4. Remix vs Next.js mental model matrix
//
// Run: npm run tutorial 08-remix-basics
// ============================================================

import { useState, useEffect, useRef, useTransition, FC, FormEvent } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The Loader/Action/Revalidation Cycle
//
// Remix's data model:
//   GET  → loader runs → returns json → useLoaderData()
//   POST → action runs → returns json or redirect
//          After action: all loaders on the page REVALIDATE
//
// This simulation makes that cycle real and tangible.
// The "server" here is just an in-memory array — the important
// part is observing the automatic revalidation.
// ─────────────────────────────────────────────────────────────

interface Comment {
  id: number;
  text: string;
  author: string;
  timestamp: string;
}

// ─── Simulated server ────────────────────────────────────────
let commentStore: Comment[] = [
  { id: 1, text: 'Great article on SSR!', author: 'Alice', timestamp: '09:15:00' },
  { id: 2, text: 'The ISR explanation is super clear.', author: 'Bob', timestamp: '09:23:00' },
];
let nextId = 3;

async function simulatedLoader(): Promise<Comment[]> {
  await new Promise(r => setTimeout(r, 300)); // simulate network
  return [...commentStore];
}

async function simulatedAction(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await new Promise(r => setTimeout(r, 600)); // simulate server processing

  const text = (formData.get('comment') as string)?.trim();
  const author = (formData.get('author') as string)?.trim();

  if (!text) return { error: 'Comment text is required' };
  if (!author) return { error: 'Author name is required' };
  if (text.length < 5) return { error: 'Comment must be at least 5 characters' };

  commentStore = [...commentStore, {
    id: nextId++,
    text,
    author,
    timestamp: new Date().toLocaleTimeString(),
  }];

  return { ok: true };
}

async function simulatedDeleteAction(formData: FormData): Promise<{ ok: boolean }> {
  await new Promise(r => setTimeout(r, 400));
  const id = parseInt(formData.get('id') as string);
  commentStore = commentStore.filter(c => c.id !== id);
  return { ok: true };
}

// ─── Remix-style hook simulation ─────────────────────────────
function useLoaderData() {
  const [data, setData] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const loadCountRef = useRef(0);

  async function load() {
    loadCountRef.current += 1;
    const thisLoad = loadCountRef.current;
    setLoading(true);
    const result = await simulatedLoader();
    if (thisLoad === loadCountRef.current) { // avoid stale updates
      setData(result);
      setLoading(false);
    }
  }

  // Initial load (simulates loader running on first navigation)
  useEffect(() => { load(); }, []);

  return { data, loading, revalidate: load };
}

function Exercise1_LoaderActionCycle() {
  const { data: comments, loading, revalidate } = useLoaderData();
  const [isPending, startTransition] = useTransition();
  const [actionData, setActionData] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [revalidationCount, setRevalidationCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setActionData(null);
      const result = await simulatedAction(formData);
      setActionData(result);

      if (result.ok) {
        formRef.current?.reset();
        // ← KEY: Remix automatically revalidates loaders after every action
        setRevalidationCount(c => c + 1);
        await revalidate();
      }
    });
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    const formData = new FormData();
    formData.set('id', String(id));
    await simulatedDeleteAction(formData);
    setDeletingId(null);
    // ← Revalidates after delete too
    setRevalidationCount(c => c + 1);
    await revalidate();
  }

  return (
    <section>
      <h2>Exercise 1: The Loader → Action → Revalidation Cycle</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        This simulates Remix's data model. The loader fetches data. The action mutates it.
        After every action, the loader AUTOMATICALLY re-runs — no manual cache invalidation.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Remix code for reference */}
        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#555' }}>In Remix, this would look like:</h3>
          <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '8px', fontSize: '0.72rem', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>{`// app/routes/comments.tsx
import { json, redirect } from '@remix-run/node';
import { useLoaderData, Form, useNavigation } from '@remix-run/react';

export async function loader() {
  const comments = await db.comments.findAll();
  return json({ comments });
}

export async function action({ request }) {
  const formData = await request.formData();
  const text = formData.get('comment');
  if (!text) return json({ error: 'Required' }, { status: 400 });

  await db.comments.create({ text });
  return redirect('/comments'); // triggers loader revalidation
}

export default function CommentsPage() {
  const { comments } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isPending = navigation.state !== 'idle';

  return (
    <div>
      {comments.map(c => <Comment key={c.id} data={c} />)}
      <Form method="post">
        <textarea name="comment" />
        <button disabled={isPending}>Post</button>
      </Form>
    </div>
  );
}`}
          </pre>
        </div>

        {/* Live simulation */}
        <div>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#555' }}>
            Live simulation:
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#27ae60', fontWeight: 400 }}>
              {revalidationCount > 0 && `🔄 Revalidated ${revalidationCount}× after actions`}
            </span>
          </h3>

          {/* Comments list */}
          <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', marginBottom: '0.75rem', minHeight: '120px' }}>
            {loading && comments.length === 0 ? (
              <div style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem' }}>Loading from server...</div>
            ) : (
              <div style={{ position: 'relative' }}>
                {loading && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #1a73e8 50%, transparent 100%)', animation: 'loading-bar 0.8s ease infinite' }} />
                )}
                {comments.map(comment => (
                  <div key={comment.id} style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    opacity: deletingId === comment.id ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>{comment.text}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#888' }}>
                        {comment.author} · {comment.timestamp}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId !== null}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#ccc', fontSize: '0.9rem', padding: '0 0.25rem',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action form */}
          <form ref={formRef} onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '8px', border: '1px solid #eee' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <input
                name="author"
                placeholder="Your name"
                defaultValue="You"
                disabled={isPending}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: '0.4rem' }}
              />
              <textarea
                name="comment"
                placeholder="Add a comment..."
                disabled={isPending}
                rows={2}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            {actionData?.error && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#e55' }}>✗ {actionData.error}</p>
            )}
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '0.4rem 1.25rem', borderRadius: '4px', border: 'none',
                background: isPending ? '#aaa' : '#1a73e8', color: '#fff', cursor: isPending ? 'default' : 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {isPending ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes loading-bar { 0% { opacity: 1 } 50% { opacity: 0.3 } 100% { opacity: 1 } }`}</style>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO — observe and answer:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Post a comment. Notice the revalidation counter incrementing. In Remix, this is <em>automatic</em> —
            you never write <code>refetch()</code> or <code>invalidateQueries()</code>. Why?
            (Remix uses POST → redirect → GET pattern. After any action, the loader re-runs.)</li>
          <li>Delete a comment. The list updates. What if you had a header showing comment count?
            In Remix, ALL loaders on the page revalidate after an action — the header would update too.</li>
          <li>In real Remix, validation happens in the <code>action</code> on the <strong>server</strong>. Why is this important?
            (Client-side validation is bypassable. Server validation is the real gate.)</li>
          <li>What's the Remix equivalent of React Query's <code>invalidateQueries()</code>?
            (There isn't one — you don't need it. Actions trigger automatic revalidation.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Parallel Loaders: No Waterfall by Design
//
// In Remix, ALL loaders at every level of the route hierarchy
// run IN PARALLEL before any component renders.
// This is fundamentally different from useEffect-based fetching.
//
// Visualize the difference: Remix parallel vs useEffect waterfall.
// ─────────────────────────────────────────────────────────────

type LoaderScenario = 'remix' | 'useeffect';

interface LoaderStatus {
  name: string;
  started: number;
  finished: number | null;
  color: string;
  description: string;
}

function useParallelLoaderSim(scenario: LoaderScenario, running: boolean) {
  const [statuses, setStatuses] = useState<LoaderStatus[]>([]);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const startRef = useRef(0);

  const LOADERS = [
    { name: 'Layout loader (getCurrentUser)', duration: 300, color: '#1a73e8', description: 'Fetches the authenticated user from session' },
    { name: 'Dashboard loader (getDashboardStats)', duration: 700, color: '#27ae60', description: 'Fetches analytics and KPIs' },
    { name: 'Users loader (getUserList)', duration: 500, color: '#8e44ad', description: 'Fetches the users table' },
  ];

  useEffect(() => {
    if (!running) { setStatuses([]); setTotalMs(null); return; }

    startRef.current = Date.now();
    setTotalMs(null);

    if (scenario === 'remix') {
      // Remix: ALL loaders start simultaneously
      setStatuses(LOADERS.map(l => ({ name: l.name, started: 0, finished: null, color: l.color, description: l.description })));

      Promise.all(LOADERS.map(loader =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            const finished = Date.now() - startRef.current;
            setStatuses(prev => prev.map(s => s.name === loader.name ? { ...s, finished } : s));
            resolve();
          }, loader.duration);
        })
      )).then(() => setTotalMs(Date.now() - startRef.current));

    } else {
      // useEffect: loaders fire sequentially (parent first, then child after mount)
      let chain = Promise.resolve<void>(undefined);
      LOADERS.forEach(loader => {
        chain = chain.then(() => new Promise<void>(resolve => {
          const started = Date.now() - startRef.current;
          setStatuses(prev => [...prev, { name: loader.name, started, finished: null, color: loader.color, description: loader.description }]);
          setTimeout(() => {
            const finished = Date.now() - startRef.current;
            setStatuses(prev => prev.map(s => s.name === loader.name ? { ...s, finished } : s));
            resolve();
          }, loader.duration);
        }));
      });
      chain.then(() => setTotalMs(Date.now() - startRef.current));
    }
  }, [running, scenario]);

  return { statuses, totalMs };
}

function Exercise2_ParallelLoaders() {
  const [scenario, setScenario] = useState<LoaderScenario>('useeffect');
  const [running, setRunning] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const { statuses, totalMs } = useParallelLoaderSim(scenario, running);

  function run() {
    setRunning(false);
    setTimeout(() => { setRunKey(k => k + 1); setRunning(true); }, 50);
  }

  useEffect(() => {
    if (totalMs !== null) setRunning(false);
  }, [totalMs]);

  const MAX_MS = 1600;

  return (
    <section>
      <h2>Exercise 2: Parallel Loaders — Remix's Superpower</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Remix runs ALL loaders at every route level simultaneously.
        useEffect-based fetching is inherently sequential (parent renders → child mounts → child fetches).
        See the timing difference live.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setScenario('useeffect')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: scenario === 'useeffect' ? '#e55' : '#ddd',
            background: scenario === 'useeffect' ? '#fee' : '#fff',
            color: scenario === 'useeffect' ? '#c00' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ❌ useEffect waterfall
        </button>
        <button
          onClick={() => setScenario('remix')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: scenario === 'remix' ? '#27ae60' : '#ddd',
            background: scenario === 'remix' ? '#e8f5e9' : '#fff',
            color: scenario === 'remix' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ✓ Remix parallel loaders
        </button>
        <button
          onClick={run}
          disabled={running}
          style={{
            padding: '0.4rem 1.5rem', borderRadius: '6px', border: 'none',
            background: running ? '#aaa' : '#1a73e8',
            color: '#fff', cursor: running ? 'default' : 'pointer', fontSize: '0.85rem',
          }}
        >
          {running ? 'Running...' : 'Run →'}
        </button>
      </div>

      <div key={runKey} style={{ background: '#fafafa', padding: '1.25rem', borderRadius: '8px', border: '1px solid #eee', marginBottom: '1rem' }}>
        {statuses.length === 0 ? (
          <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>Click "Run" to start the simulation.</p>
        ) : (
          <>
            {statuses.map(s => {
              const endMs = s.finished ?? (Date.now() - (Date.now() - Date.now()));
              const startPct = (s.started / MAX_MS) * 100;
              const widthPct = Math.min(((( s.finished ?? (Date.now() - Date.now())) - s.started) / MAX_MS) * 100, 100 - startPct);

              return (
                <div key={s.name} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
                    <span style={{ color: '#333' }}>{s.name}</span>
                    <span style={{ color: '#888' }}>
                      {s.finished
                        ? `${s.started}ms → ${s.finished}ms`
                        : `${s.started}ms → ...`}
                    </span>
                  </div>
                  <div style={{ height: '12px', background: '#eee', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute',
                      left: `${startPct}%`,
                      width: `${Math.max(s.finished ? ((s.finished - s.started) / MAX_MS) * 100 : 5, 2)}%`,
                      height: '100%',
                      background: s.color,
                      borderRadius: '6px',
                      opacity: s.finished ? 1 : 0.6,
                    }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '1px' }}>{s.description}</div>
                </div>
              );
            })}
            {totalMs !== null && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem 1rem',
                background: scenario === 'remix' ? '#e8f5e9' : '#fee',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: scenario === 'remix' ? '#27ae60' : '#c00',
              }}>
                Total: ~{totalMs}ms — {scenario === 'remix' ? `${MAX_MS - totalMs}ms saved vs waterfall` : 'run Remix version to compare'}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.78rem' }}>
        <pre style={{ background: '#1e1e2e', color: '#fc8888', padding: '0.75rem', borderRadius: '6px', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>{`// ❌ useEffect waterfall
// Parent renders → mounts → useEffect runs → loads user
// Child renders only after parent mount
// Child's useEffect runs → loads dashboard
// Grandchild renders → loads users
// Sequential: 300 + 700 + 500 = 1500ms total`}</pre>
        <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.75rem', borderRadius: '6px', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>{`// ✅ Remix: all loaders start at once
// When you navigate to /dashboard/users:
// Remix calls ALL loaders simultaneously:
//   - root layout loader (300ms)
//   - dashboard layout loader (700ms)
//   - users route loader (500ms)
// Parallel: max(300, 700, 500) = 700ms total`}</pre>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>With 3 loaders (300/700/500ms): useEffect waterfall total = <strong>1500ms</strong>, Remix parallel = <strong>700ms</strong>. Formula?
            (Waterfall: sum. Parallel: max of all durations.)</li>
          <li>Does Remix's App Router (not Next.js) have the same parallel loader behavior?
            (Yes — App Router runs RSC data fetches in parallel within each layout level)</li>
          <li>What happens to the parallel loaders if the user navigates AWAY while they're loading?
            (Remix cancels the in-flight requests. No state updates on unmounted components.)</li>
          <li>In React Query with a nested component tree, how would you solve the waterfall problem?
            (Prefetch in parent and pass data down, or use a parent component to trigger all queries before rendering children.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Progressive Enhancement: Form vs onSubmit
//
// Remix's <Form> provides progressive enhancement — the form
// works BEFORE JavaScript loads. This is impossible with onSubmit.
//
// This exercise demonstrates the difference and explains when
// progressive enhancement matters in production.
// ─────────────────────────────────────────────────────────────

const REMIX_FORM_CODE = `// ✅ Remix <Form> — progressive enhancement
import { Form, useNavigation } from '@remix-run/react';
import { redirect } from '@remix-run/node';

// Server action:
export async function action({ request }) {
  const formData = await request.formData();
  const email = formData.get('email');
  await newsletter.subscribe(email);
  return redirect('/subscribed'); // works for both JS and no-JS
}

// Component:
export default function NewsletterPage() {
  const navigation = useNavigation();
  const isPending = navigation.state !== 'idle';

  return (
    <Form method="post">
      {/*
        With JS:    Remix intercepts submit → fetch POST → no page reload
        Without JS: Browser submits form → server runs action → redirect
        BOTH paths work. Same action function handles both.
      */}
      <input type="email" name="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Subscribing...' : 'Subscribe'}
      </button>
    </Form>
  );
}`;

const ONSUBMIT_CODE = `// ❌ onSubmit handler — no progressive enhancement
import { useState, FormEvent } from 'react';

// No server action — everything is client-side
export default function NewsletterPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // ← this PREVENTS the native form submit!
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await fetch('/api/newsletter', {
      method: 'POST',
      body: JSON.stringify({ email: formData.get('email') }),
    });
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" required />
      <button type="submit" disabled={loading}>Subscribe</button>
    </form>
  );
  // Without JS: e.preventDefault is never called, but the form has no
  // action= attribute, so it submits to the current URL with no handler.
  // The form does NOT work without JS.
}`;

const PE_SCENARIOS = [
  { scenario: 'Slow 3G connection — JS not yet loaded', remix: '✓ Native form submits to server action, works', onsubmit: '✗ Form submits to current URL with no handler — broken' },
  { scenario: 'JavaScript bundle error at runtime', remix: '✓ Form continues to work via native submit', onsubmit: '✗ handleSubmit never runs — form does nothing' },
  { scenario: 'Core form interaction (login, checkout, newsletter)', remix: '✓ Use <Form> — critical path should be JS-independent', onsubmit: '⚠ Works with JS, but why take the risk?' },
  { scenario: 'Highly interactive search with real-time suggestions', remix: '→ Use client state + debounced fetch here instead', onsubmit: '→ This isn\'t a traditional form submit — onSubmit is fine' },
];

function Exercise3_ProgressiveEnhancement() {
  const [view, setView] = useState<'remix' | 'onsubmit'>('remix');
  const [showScenarios, setShowScenarios] = useState(false);

  return (
    <section>
      <h2>Exercise 3: Progressive Enhancement — Form vs onSubmit</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Remix's <code>{'<Form>'}</code> provides progressive enhancement: the form works before
        JavaScript loads, by using the browser's native form submission as a fallback.
        <code>onSubmit</code> handlers call <code>e.preventDefault()</code> — breaking the native fallback.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('remix')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'remix' ? '#27ae60' : '#ddd',
            background: view === 'remix' ? '#e8f5e9' : '#fff',
            color: view === 'remix' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ✓ Remix {'<Form>'}
        </button>
        <button
          onClick={() => setView('onsubmit')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'onsubmit' ? '#e55' : '#ddd',
            background: view === 'onsubmit' ? '#fee' : '#fff',
            color: view === 'onsubmit' ? '#c00' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ❌ onSubmit handler
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: view === 'remix' ? '#a9dc76' : '#fc8888', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.8, marginBottom: '1rem' }}>
        {view === 'remix' ? REMIX_FORM_CODE : ONSUBMIT_CODE}
      </pre>

      <button
        onClick={() => setShowScenarios(s => !s)}
        style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem' }}
      >
        {showScenarios ? 'Hide' : 'Show →'} scenario comparison
      </button>

      {showScenarios && (
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Scenario</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd', color: '#27ae60', fontWeight: 600 }}>Remix {'<Form>'}</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd', color: '#c00', fontWeight: 600 }}>onSubmit handler</th>
              </tr>
            </thead>
            <tbody>
              {PE_SCENARIOS.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #eee', color: '#333' }}>{row.scenario}</td>
                  <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #eee', color: row.remix.startsWith('✓') ? '#27ae60' : '#888' }}>{row.remix}</td>
                  <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #eee', color: row.onsubmit.startsWith('✗') ? '#c00' : '#888' }}>{row.onsubmit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why does <code>e.preventDefault()</code> break progressive enhancement?
            (It prevents the browser's native form submit, which is the only fallback when JS isn't running.)</li>
          <li>When JS IS loaded, how does Remix's <code>{'<Form>'}</code> differ from a native form submit?
            (Remix intercepts the submit event, makes a fetch() POST, updates the UI without a full page reload.)</li>
          <li>Next.js App Router has a similar feature. What is it? When does progressive enhancement apply?
            (Server Actions + <code>{'<form action={serverAction}>'}</code> — same pattern: native submit without JS, fetch with JS.)</li>
          <li>Is progressive enhancement always worth the extra thought? When would you NOT bother?
            (Not needed for: dashboards, apps that require JS anyway, real-time features. Worth it for: login, checkout, newsletter — core user paths where you want 100% reliability.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Remix vs Next.js Decision Matrix
//
// Both are production-ready frameworks. The choice between them
// is not about which is "better" — it's about which fits
// your project's characteristics.
//
// This exercise develops the nuanced judgment needed for
// architecture discussions in senior engineering interviews.
// ─────────────────────────────────────────────────────────────

interface FrameworkQuestion {
  question: string;
  remix: string;
  nextjs: string;
  winner: 'remix' | 'nextjs' | 'tie';
  explanation: string;
}

const FRAMEWORK_QUESTIONS: FrameworkQuestion[] = [
  {
    question: 'Your app is a blog with 10,000 posts. You want posts pre-rendered for SEO and instant load times.',
    remix: 'Limited static generation — Remix is SSR-first. You can prerender with Vite build but it\'s not first-class.',
    nextjs: 'First-class SSG with getStaticProps (Pages Router) or fetch with cache: force-cache (App Router). ISR for auto-refresh.',
    winner: 'nextjs',
    explanation: 'Next.js wins for static-heavy content. SSG and ISR are core features, not afterthoughts. Remix\'s strength is in request-response data flow, not static generation.',
  },
  {
    question: 'Your app is a project management tool — lots of forms, mutations, optimistic updates. Users care about reliability of their data operations.',
    remix: 'Loaders/actions provide a clean mental model for mutations. Automatic revalidation prevents stale data. <Form> gives progressive enhancement.',
    nextjs: 'Server Actions achieve similar results but with more configuration. The App Router model is newer and less battle-tested for mutation-heavy apps.',
    winner: 'remix',
    explanation: 'Remix wins for mutation-heavy apps. The POST → redirect → GET pattern and automatic revalidation are designed exactly for this use case. Less client-side state management complexity.',
  },
  {
    question: 'Your team is experienced with React Query and client-side data management. You need to migrate from CRA to a framework.',
    remix: 'Remix\'s mental model (loaders as the only data source) conflicts with React Query. You\'d mostly replace RQ with loaders.',
    nextjs: 'Pages Router works seamlessly with React Query — getServerSideProps for initial data, RQ for client-side updates. App Router + RQ is also possible.',
    winner: 'nextjs',
    explanation: 'Next.js wins when you want to keep React Query. The Pages Router especially fits: server-side initial data via getServerSideProps + RQ for subsequent client-side fetches. Remix encourages replacing RQ with loaders.',
  },
  {
    question: 'An e-commerce checkout flow where resilience is critical — it must work even if JavaScript fails to load.',
    remix: 'Built-in progressive enhancement via <Form>. The entire checkout can work with native form submits if JS fails.',
    nextjs: 'Server Actions + <form action={serverAction}> provides the same PE. Available in App Router.',
    winner: 'tie',
    explanation: 'Both support progressive enhancement now. Remix has had it longer and it\'s more central to the framework\'s philosophy. Next.js App Router Server Actions are newer but equivalent. Team familiarity wins.',
  },
  {
    question: 'A dashboard that renders different content per user, with complex personalization and no SEO needs.',
    remix: 'SSR-first is perfect — loaders run per-request, personalization is natural. No wasted static generation.',
    nextjs: 'Dynamic rendering via force-dynamic or getServerSideProps works. But the architecture has more options than needed for this case.',
    winner: 'tie',
    explanation: 'Both handle per-request SSR equally well. Next.js has more overhead from its multi-mode architecture. Remix\'s simpler "everything is SSR" model is less configuration for this use case. Tie — choose based on team preference.',
  },
];

function Exercise4_FrameworkComparison() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const WINNER_COLORS = {
    remix: '#e67e22',
    nextjs: '#000',
    tie: '#27ae60',
  };
  const WINNER_LABELS = {
    remix: 'Remix wins',
    nextjs: 'Next.js wins',
    tie: 'Either works',
  };

  return (
    <section>
      <h2>Exercise 4: Remix vs Next.js — When to Choose What</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The right framework depends on your project's characteristics. Read each scenario.
        Think about which fits better before revealing the analysis.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {FRAMEWORK_QUESTIONS.map((q, i) => (
          <div key={i} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#333', flex: 1, lineHeight: 1.6 }}>{q.question}</p>
              {!revealed[i] ? (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [i]: true }))}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Reveal →
                </button>
              ) : (
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '20px',
                  background: WINNER_COLORS[q.winner], color: '#fff',
                  fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {WINNER_LABELS[q.winner]}
                </span>
              )}
            </div>
            {revealed[i] && (
              <div style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.83rem' }}>
                  <div style={{ background: '#fff7ef', padding: '0.6rem', borderRadius: '6px', borderLeft: '3px solid #e67e22' }}>
                    <strong style={{ color: '#e67e22' }}>Remix:</strong>
                    <p style={{ margin: '0.25rem 0 0', color: '#555', lineHeight: 1.5 }}>{q.remix}</p>
                  </div>
                  <div style={{ background: '#f5f5f5', padding: '0.6rem', borderRadius: '6px', borderLeft: '3px solid #555' }}>
                    <strong style={{ color: '#333' }}>Next.js:</strong>
                    <p style={{ margin: '0.25rem 0 0', color: '#555', lineHeight: 1.5 }}>{q.nextjs}</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', background: '#f0f4ff', padding: '0.75rem', borderRadius: '6px', lineHeight: 1.6 }}>
                  <strong>Analysis:</strong> {q.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <strong>The interview-ready framing:</strong>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li><strong>Choose Remix</strong> when: mutation-heavy apps, progressive enhancement is critical, you want a simpler mental model (everything is SSR, loaders/actions)</li>
          <li><strong>Choose Next.js</strong> when: mixed static/dynamic needs, you need ISR, team already knows it, Pages Router compatibility matters</li>
          <li><strong>Choose neither from scratch</strong>: when your team knows one well — framework expertise matters more than the "best" choice in most cases</li>
        </ul>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Remix Basics</h1>
    <div style={{ background: '#fff3e0', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> Remix requires its own runtime — it can't run in Vite. These exercises
      simulate the key behaviors: the loader/action/revalidation cycle, parallel loaders,
      and progressive enhancement. Exercise 1's CRUD is fully interactive with a real simulated server.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_LoaderActionCycle />
      <hr />
      <Exercise2_ParallelLoaders />
      <hr />
      <Exercise3_ProgressiveEnhancement />
      <hr />
      <Exercise4_FrameworkComparison />
    </div>
  </div>
);

export default App;
