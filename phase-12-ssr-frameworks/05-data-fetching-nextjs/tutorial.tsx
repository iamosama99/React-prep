// ============================================================
// Topic:   Data Fetching in Next.js
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: LIVE SIMULATION + DECISION MAKING
//
// The App Router's caching/deduplication model and the waterfall
// problem are best understood by seeing them in action.
//
//   1. Waterfall race — watch sequential vs parallel fetches run
//   2. Cache option decision matrix — match scenario to cache strategy
//   3. Suspense streaming simulation — independent loading states
//   4. Tag-based revalidation flow — trace the invalidation lifecycle
//
// Run: npm run tutorial 05-data-fetching-nextjs
// ============================================================

import { useState, useEffect, useRef, Suspense, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The Waterfall Race: Sequential vs Parallel
//
// A waterfall happens when fetch B can't start until fetch A finishes.
// In React Server Components, this is easy to cause accidentally.
//
// Run both strategies and see the timing difference live.
// ─────────────────────────────────────────────────────────────

type FetchStatus = { name: string; started: number; finished: number | null; color: string };

function useFetchSimulation(strategy: 'sequential' | 'parallel', running: boolean) {
  const [statuses, setStatuses] = useState<FetchStatus[]>([]);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Simulated fetch durations in ms
  const FETCHES = [
    { name: 'fetchUser()', duration: 400, color: '#1a73e8' },
    { name: 'fetchCart()', duration: 600, color: '#e67e22' },
    { name: 'fetchRecommendations()', duration: 800, color: '#8e44ad' },
  ];

  useEffect(() => {
    if (!running) return;

    setStatuses([]);
    setTotalTime(null);
    startTimeRef.current = Date.now();

    if (strategy === 'sequential') {
      // Sequential: each fetch starts only after the previous finishes
      let chain = Promise.resolve();
      FETCHES.forEach(fetch => {
        chain = chain.then(() => {
          const started = Date.now() - startTimeRef.current;
          setStatuses(prev => [...prev, { name: fetch.name, started, finished: null, color: fetch.color }]);

          return new Promise<void>(resolve => {
            setTimeout(() => {
              const finished = Date.now() - startTimeRef.current;
              setStatuses(prev =>
                prev.map(s => s.name === fetch.name ? { ...s, finished } : s)
              );
              resolve();
            }, fetch.duration);
          });
        });
      });
      chain.then(() => {
        setTotalTime(Date.now() - startTimeRef.current);
      });
    } else {
      // Parallel: all fetches start simultaneously
      const allStarted = Date.now() - startTimeRef.current;
      setStatuses(FETCHES.map(f => ({ name: f.name, started: allStarted, finished: null, color: f.color })));

      Promise.all(FETCHES.map(fetch =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            const finished = Date.now() - startTimeRef.current;
            setStatuses(prev =>
              prev.map(s => s.name === fetch.name ? { ...s, finished } : s)
            );
            resolve();
          }, fetch.duration);
        })
      )).then(() => {
        setTotalTime(Date.now() - startTimeRef.current);
      });
    }
  }, [running, strategy]);

  return { statuses, totalTime };
}

function WaterfallChart({ statuses, maxMs }: { statuses: FetchStatus[]; maxMs: number }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {statuses.map(s => {
        const endMs = s.finished ?? (Date.now() - (Date.now() - now));
        const startPct = (s.started / maxMs) * 100;
        const widthPct = Math.min(((endMs - s.started) / maxMs) * 100, 100 - startPct);

        return (
          <div key={s.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
              <code>{s.name}</code>
              <span style={{ color: '#888' }}>
                {s.finished
                  ? `${s.started}ms → ${s.finished}ms (${s.finished - s.started}ms)`
                  : `${s.started}ms → running...`}
              </span>
            </div>
            <div style={{ height: '12px', background: '#f0f0f0', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                left: `${startPct}%`,
                width: `${widthPct}%`,
                height: '100%',
                background: s.color,
                borderRadius: '6px',
                transition: 'width 0.05s',
                opacity: s.finished ? 1 : 0.7,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SEQUENTIAL_CODE = `// ❌ Sequential — each await blocks the next
async function DashboardPage() {
  const user = await fetchUser();         // starts at 0ms, ends at 400ms
  const cart = await fetchCart();         // starts at 400ms, ends at 1000ms
  const recs = await fetchRecommendations(); // starts at 1000ms, ends at 1800ms
  // Total: 1800ms (sum of all)

  return <Dashboard user={user} cart={cart} recs={recs} />;
}`;

const PARALLEL_CODE = `// ✅ Parallel — all start simultaneously
async function DashboardPage() {
  // Start all three without awaiting
  const [user, cart, recs] = await Promise.all([
    fetchUser(),             // starts at 0ms
    fetchCart(),             // starts at 0ms
    fetchRecommendations(),  // starts at 0ms
  ]);
  // Total: 800ms (slowest fetch)

  return <Dashboard user={user} cart={cart} recs={recs} />;
}`;

function Exercise1_WaterfallRace() {
  const [strategy, setStrategy] = useState<'sequential' | 'parallel'>('sequential');
  const [running, setRunning] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const MAX_MS = 2000;
  const { statuses, totalTime } = useFetchSimulation(strategy, running);

  function run() {
    setRunning(false);
    setTimeout(() => {
      setRunKey(k => k + 1);
      setRunning(true);
    }, 50);
  }

  useEffect(() => {
    if (totalTime !== null) {
      setRunning(false);
    }
  }, [totalTime]);

  return (
    <section>
      <h2>Exercise 1: The Waterfall Problem — See It Live</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Sequential awaits create a waterfall — each fetch waits for the previous.
        Run both strategies and observe the timing difference.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStrategy('sequential')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: strategy === 'sequential' ? '#e55' : '#ddd',
            background: strategy === 'sequential' ? '#fee' : '#fff',
            color: strategy === 'sequential' ? '#c00' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ❌ Sequential (waterfall)
        </button>
        <button
          onClick={() => setStrategy('parallel')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: strategy === 'parallel' ? '#27ae60' : '#ddd',
            background: strategy === 'parallel' ? '#e8f5e9' : '#fff',
            color: strategy === 'parallel' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ✓ Parallel (Promise.all)
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
            <WaterfallChart statuses={statuses} maxMs={MAX_MS} />
            {totalTime !== null && (
              <div style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: strategy === 'sequential' ? '#fee' : '#e8f5e9',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: strategy === 'sequential' ? '#c00' : '#27ae60',
              }}>
                Total: {totalTime}ms — {strategy === 'sequential' ? `${totalTime}ms wasted waiting (try parallel!)` : `saved ~${1800 - totalTime}ms vs sequential`}
              </div>
            )}
          </>
        )}
      </div>

      {/* Code comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <pre style={{ background: '#1e1e2e', color: '#fc8888', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>
          {SEQUENTIAL_CODE}
        </pre>
        <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>
          {PARALLEL_CODE}
        </pre>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>With 3 fetches of 400/600/800ms: sequential total = <strong>1800ms</strong>, parallel total = <strong>800ms</strong>.
            What is the general formula for each? (Sequential: sum. Parallel: max.)</li>
          <li>When does <code>Promise.all</code> fail? What happens if one fetch throws?
            (The entire Promise.all rejects — use Promise.allSettled to get partial results)</li>
          <li>The Suspense streaming alternative: start all promises without await, pass them to child components.
            What's the benefit over <code>Promise.all</code>?
            (Components stream independently — user sees user panel before recs panel, no single wait)</li>
          <li>In Next.js App Router, if <code>fetchUser()</code> is called in both layout.tsx and page.tsx,
            does it make 2 HTTP requests? (No — Next.js deduplicates identical fetch calls within one render pass)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Cache Option Decision Matrix
//
// The App Router's fetch cache options control whether data is
// served from cache or fetched fresh. Match each scenario to the
// correct cache option.
// ─────────────────────────────────────────────────────────────

interface CacheScenario {
  id: number;
  scenario: string;
  dataType: string;
  answer: string;
  code: string;
  explanation: string;
}

const CACHE_SCENARIOS: CacheScenario[] = [
  {
    id: 1,
    scenario: 'Global site configuration (theme colors, feature flags) — set by the admin team once a month. All users see the same data. Should be as fast as possible.',
    dataType: 'Never changes between deploys',
    answer: "cache: 'force-cache'",
    code: `const config = await fetch('https://api.example.com/site-config', {
  cache: 'force-cache', // cached indefinitely (default for static pages)
});
// Fetched once at build time, served from cache forever.
// Only re-fetched on next build or explicit revalidation.`,
    explanation: "'force-cache' means: use the cached response if available. At build time the response is stored. All users get the same cached config until you revalidate or rebuild. This is the fastest option — pure CDN-speed for static data.",
  },
  {
    id: 2,
    scenario: 'A user\'s notification count in the header. Shows a red badge with the number of unread notifications. Must always be accurate when the page loads.',
    dataType: 'User-specific, must be fresh per request',
    answer: "cache: 'no-store'",
    code: `const notifications = await fetch(
  \`https://api.example.com/users/\${userId}/notifications\`,
  {
    cache: 'no-store', // never cache — always fresh
  }
);
// Also: this single 'no-store' fetch makes the entire
// route segment dynamic (can't be statically generated).`,
    explanation: "'no-store' means: never cache, always fetch fresh. Use for user-specific data, session-dependent data, or anything where stale data is unacceptable. This is the App Router equivalent of getServerSideProps — the component renders fresh on every request.",
  },
  {
    id: 3,
    scenario: 'A list of featured products on the homepage. Products are updated by the marketing team every few hours via a CMS. You want near-instant TTFB but don\'t want a full redeploy for every content change.',
    dataType: 'Shared across users, changes a few times per day',
    answer: "next: { revalidate: 3600 }",
    code: `const featured = await fetch('https://cms.example.com/featured-products', {
  next: { revalidate: 3600 }, // ISR: stale-while-revalidate after 1 hour
});
// Cached at build time. After 3600 seconds, the next request
// serves the stale data AND triggers background regeneration.
// The request after THAT gets the fresh data.`,
    explanation: "'next: { revalidate: N }' is ISR at the individual fetch level. The response is cached and regenerated in the background every N seconds. Same stale-while-revalidate behavior as ISR pages — but granular to this specific fetch call.",
  },
  {
    id: 4,
    scenario: 'A blog post was just published in the CMS and you want the production site to show it immediately — without waiting for the revalidation window to expire.',
    dataType: 'On-demand: invalidate when content changes, not on a timer',
    answer: "next: { tags: ['posts'] } + revalidateTag('posts')",
    code: `// When fetching:
const posts = await fetch('https://cms.example.com/posts', {
  next: { tags: ['posts'] }, // tag this response for targeted invalidation
});

// In a Server Action or Route Handler (triggered by CMS webhook):
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  // CMS calls this webhook when a post is published
  const { event } = await request.json();
  if (event === 'post.published') {
    revalidateTag('posts'); // invalidate ALL fetches tagged 'posts'
  }
  return Response.json({ ok: true });
}`,
    explanation: "Tag-based on-demand revalidation: tag fetches with a key, then call revalidateTag() to invalidate them precisely when data changes. This is more accurate than time-based ISR — you invalidate exactly when content changes (from a CMS webhook), not on a fixed timer.",
  },
];

function Exercise2_CacheOptionDecisions() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 2: Cache Option Decision Matrix</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each scenario, decide which fetch cache option to use. Think before revealing.
        The right choice depends on: how often does data change? Is it user-specific? Can it be stale?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {CACHE_SCENARIOS.map(s => (
          <div key={s.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
              <strong>Scenario #{s.id}:</strong> {s.scenario}
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#888' }}>Data: {s.dataType}</p>
            </div>
            <div style={{ padding: '1rem' }}>
              {!revealed[s.id] ? (
                <>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {[
                      "cache: 'force-cache'",
                      "cache: 'no-store'",
                      "next: { revalidate: 3600 }",
                      "next: { tags: ['posts'] } + revalidateTag('posts')",
                    ].map(opt => (
                      <code
                        key={opt}
                        onClick={() => setRevealed(prev => ({ ...prev, [s.id]: true }))}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '4px',
                          background: '#1e1e2e',
                          color: '#a9dc76',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          border: '2px solid transparent',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#a9dc76')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                      >
                        {opt}
                      </code>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Click your answer to reveal →</p>
                </>
              ) : (
                <>
                  <div style={{ background: '#1e1e2e', padding: '0.6rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#a9dc76', fontSize: '0.8rem' }}>✓ Answer: </strong>
                    <code style={{ color: '#a9dc76', fontSize: '0.8rem' }}>{s.answer}</code>
                  </div>
                  <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', overflow: 'auto', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                    {s.code}
                  </pre>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: '#f0f4ff', padding: '0.75rem', borderRadius: '6px' }}>
                    {s.explanation}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Suspense Streaming: Independent Loading States
//
// Instead of Promise.all (user waits for ALL data), you can
// start promises without awaiting and pass them to child
// components. Each child suspends independently.
//
// This simulation shows the UX difference:
//   - Promise.all: entire page waits for slowest fetch
//   - Streaming: each section appears as its data arrives
// ─────────────────────────────────────────────────────────────

function useFetchWithDelay<T>(data: T, delayMs: number, running: boolean): T | null {
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    if (!running) { setResult(null); return; }
    const t = setTimeout(() => setResult(data), delayMs);
    return () => clearTimeout(t);
  }, [running, delayMs]);

  return result;
}

function Skeleton({ width, height, label }: { width?: string; height?: string; label: string }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '3px' }}>{label} loading...</div>
      <div style={{
        width: width ?? '100%',
        height: height ?? '20px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '4px',
      }} />
    </div>
  );
}

type StreamingStrategy = 'promise-all' | 'suspense';

function Exercise3_SuspenseStreaming() {
  const [strategy, setStrategy] = useState<StreamingStrategy>('promise-all');
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [finishTime, setFinishTime] = useState<number | null>(null);

  // Simulated data fetches with different delays
  const user = useFetchWithDelay({ name: 'Alice Chen', role: 'Admin' }, 300, running);
  const analytics = useFetchWithDelay({ visits: 12450, bounceRate: '32%' }, 900, running);
  const notifications = useFetchWithDelay([
    { id: 1, text: 'New signup: Bob D.' },
    { id: 2, text: 'Stripe payment received' },
  ], 600, running);

  const allDone = user !== null && analytics !== null && notifications !== null;

  useEffect(() => {
    if (allDone && finishTime === null && running) {
      setFinishTime(Date.now() - startTime);
      setRunning(false);
    }
  }, [allDone, finishTime, running, startTime]);

  function start() {
    setFinishTime(null);
    setStartTime(Date.now());
    setRunning(false);
    setTimeout(() => setRunning(true), 50);
  }

  // For promise-all: show all or nothing
  const promiseAllReady = strategy === 'promise-all' && allDone;
  const streamingMode = strategy === 'suspense';

  return (
    <section>
      <h2>Exercise 3: Suspense Streaming — Independent Loading States</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Compare: Promise.all (wait for all) vs streaming Suspense (each section appears independently).
        Delays: User=300ms, Notifications=600ms, Analytics=900ms.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStrategy('promise-all')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: strategy === 'promise-all' ? '#e67e22' : '#ddd',
            background: strategy === 'promise-all' ? '#fff3e0' : '#fff',
            color: strategy === 'promise-all' ? '#e67e22' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Promise.all (waits for slowest)
        </button>
        <button
          onClick={() => setStrategy('suspense')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: strategy === 'suspense' ? '#27ae60' : '#ddd',
            background: strategy === 'suspense' ? '#e8f5e9' : '#fff',
            color: strategy === 'suspense' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Suspense streaming (independent)
        </button>
        <button
          onClick={start}
          disabled={running}
          style={{
            padding: '0.4rem 1.5rem', borderRadius: '6px', border: 'none',
            background: running ? '#aaa' : '#1a73e8',
            color: '#fff', cursor: running ? 'default' : 'pointer', fontSize: '0.85rem',
          }}
        >
          {running ? 'Running...' : 'Run simulation →'}
        </button>
      </div>

      {/* Add shimmer keyframes */}
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>

      <div style={{ border: '2px solid #ddd', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ padding: '0.6rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Dashboard UI</strong>
          {finishTime && <span style={{ fontSize: '0.8rem', color: '#27ae60', fontWeight: 700 }}>✓ Fully loaded in {finishTime}ms</span>}
        </div>
        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* User panel */}
          <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</h4>
            {(streamingMode ? user !== null : promiseAllReady)
              ? <div style={{ fontSize: '0.9rem' }}><strong>{user?.name}</strong><br /><span style={{ color: '#666' }}>{user?.role}</span></div>
              : running ? <Skeleton height="40px" label="User" /> : <div style={{ color: '#ccc', fontSize: '0.85rem' }}>Not started</div>
            }
          </div>

          {/* Notifications panel */}
          <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notifications</h4>
            {(streamingMode ? notifications !== null : promiseAllReady)
              ? <div>{notifications?.map(n => <div key={n.id} style={{ fontSize: '0.85rem', padding: '0.25rem 0', borderBottom: '1px solid #f5f5f5' }}>🔔 {n.text}</div>)}</div>
              : running ? <Skeleton height="60px" label="Notifications" /> : <div style={{ color: '#ccc', fontSize: '0.85rem' }}>Not started</div>
            }
          </div>

          {/* Analytics panel */}
          <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fff', gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analytics (slowest — 900ms)</h4>
            {(streamingMode ? analytics !== null : promiseAllReady)
              ? <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                  <div><strong>{analytics?.visits.toLocaleString()}</strong><br /><span style={{ color: '#666', fontSize: '0.8rem' }}>Total visits</span></div>
                  <div><strong>{analytics?.bounceRate}</strong><br /><span style={{ color: '#666', fontSize: '0.8rem' }}>Bounce rate</span></div>
                </div>
              : running ? <Skeleton height="50px" label="Analytics" /> : <div style={{ color: '#ccc', fontSize: '0.85rem' }}>Not started</div>
            }
          </div>
        </div>
      </div>

      {/* Code comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
        <pre style={{ background: '#1e1e2e', color: '#fc8888', padding: '0.75rem', borderRadius: '6px', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>{`// ❌ Promise.all — wait for all
async function DashboardPage() {
  const [user, notifs, analytics] =
    await Promise.all([
      fetchUser(),        // 300ms
      fetchNotifs(),      // 600ms
      fetchAnalytics(),   // 900ms
    ]);
  // Nothing renders until 900ms
  return <Dashboard ... />;
}`}</pre>
        <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.75rem', borderRadius: '6px', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>{`// ✅ Streaming — each streams independently
async function DashboardPage() {
  // Start all without await
  const userP = fetchUser();    // 300ms
  const notifsP = fetchNotifs();// 600ms
  const analyticsP = fetchAnalytics();// 900ms

  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserPanel promise={userP} /> {/* shows at 300ms */}
      </Suspense>
      <Suspense fallback={<NotifSkeleton />}>
        <NotifPanel promise={notifsP} /> {/* shows at 600ms */}
      </Suspense>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPanel promise={analyticsP} /> {/* shows at 900ms */}
      </Suspense>
    </>
  );
}`}</pre>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>With Promise.all (900ms) vs streaming: when does the user see the User panel in each strategy?
            (Promise.all: 900ms. Streaming: 300ms — 600ms earlier!)</li>
          <li>In the streaming approach, do all three fetches run in parallel or sequentially?
            (Parallel — all three start immediately, there's no await)</li>
          <li>Next.js App Router's <code>loading.tsx</code> uses Suspense under the hood. How?
            (It wraps <code>page.tsx</code> in <code>{'<Suspense fallback={<Loading />}>'}</code> automatically)</li>
          <li>Can you use the streaming approach with the Pages Router?
            (No — getServerSideProps must complete before the page renders. Streaming is an App Router + RSC feature.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Tag-Based Revalidation Flow
//
// On-demand revalidation is more precise than time-based ISR.
// Trace the exact lifecycle of a tag-based invalidation.
// ─────────────────────────────────────────────────────────────

const REVALIDATION_STEPS = [
  {
    id: 1,
    phase: 'Tag the fetch',
    code: `// In the Server Component — tag what you fetch
const posts = await fetch('https://cms.example.com/posts', {
  next: { tags: ['posts', 'blog'] },
  // Multiple tags are allowed
});`,
    explanation: 'At build time or first render, the fetched response is cached and associated with the tag "posts". Any future revalidateTag("posts") call will invalidate this specific cached response.',
  },
  {
    id: 2,
    phase: 'Content changes in CMS',
    code: `// CMS editor publishes a new post
// CMS sends a webhook POST to your API:
// POST https://your-app.com/api/cms-webhook
// { "event": "post.published", "data": { ... } }`,
    explanation: 'The content change happens externally. Without on-demand revalidation, you\'d have to wait for the next time-based ISR window (e.g., 1 hour) for users to see the change.',
  },
  {
    id: 3,
    phase: 'Webhook triggers revalidation',
    code: `// app/api/cms-webhook/route.ts
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const body = await request.json();

  // Optional: verify webhook signature (important in production)
  // if (!verifySignature(body, request.headers)) return 403

  if (body.event === 'post.published') {
    revalidateTag('posts'); // invalidates all fetches tagged 'posts'
  }

  return Response.json({ ok: true });
}`,
    explanation: 'revalidateTag("posts") marks the cached response as stale. The actual re-fetch happens on the next request, not immediately. This is still stale-while-revalidate — the very next visitor triggers the regeneration.',
  },
  {
    id: 4,
    phase: 'First request after invalidation',
    code: `// 1. User requests /blog — next.js serves STALE cached page
//    (the old list without the new post)
// 2. Simultaneously, Next.js starts background regeneration:
//    fetchPosts() is called again (fresh data, no cache)
// 3. The new HTML is stored as the fresh cached response`,
    explanation: 'Same stale-while-revalidate behavior as time-based ISR — the first visitor after invalidation gets the stale page AND triggers regeneration. The very next visitor gets the fresh page with the new post.',
  },
  {
    id: 5,
    phase: 'Second request — fresh data',
    code: `// 1. User requests /blog
// 2. Next.js serves the FRESH cached page (now includes the new post)
// 3. Response time: near-instant (served from CDN cache)
// 4. All subsequent requests serve from cache until
//    the next revalidateTag('posts') call or revalidate interval expires`,
    explanation: 'The user sees the new post. All the benefits of ISR (CDN speed, no server compute per request) with the precision of on-demand invalidation (the update appears within one request cycle of the webhook, not after a timer).',
  },
];

function Exercise4_RevalidationFlow() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  return (
    <section>
      <h2>Exercise 4: Tag-Based Revalidation — Trace the Lifecycle</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        On-demand revalidation with <code>revalidateTag()</code> lets you invalidate cache precisely
        when content changes — without a fixed timer. Click each step to trace the full lifecycle.
      </p>

      <div style={{ position: 'relative', marginTop: '1rem' }}>
        {/* Timeline line */}
        <div style={{ position: 'absolute', left: '20px', top: '30px', bottom: '30px', width: '2px', background: '#ddd' }} />

        {REVALIDATION_STEPS.map((step, i) => (
          <div
            key={step.id}
            style={{ position: 'relative', marginBottom: '1rem', paddingLeft: '52px' }}
          >
            {/* Step circle */}
            <div
              onClick={() => setCurrentStep(currentStep === i ? null : i)}
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: currentStep === i ? '#1a73e8' : currentStep !== null && currentStep > i ? '#27ae60' : '#fff',
                border: '2px solid',
                borderColor: currentStep === i ? '#1a73e8' : currentStep !== null && currentStep > i ? '#27ae60' : '#ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 700,
                color: currentStep === i || (currentStep !== null && currentStep > i) ? '#fff' : '#666',
                fontSize: '0.9rem',
                zIndex: 1,
                transition: 'all 0.2s',
              }}
            >
              {currentStep !== null && currentStep > i ? '✓' : step.id}
            </div>

            {/* Content */}
            <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setCurrentStep(currentStep === i ? null : i)}>
              <div style={{
                padding: '0.6rem 1rem',
                background: currentStep === i ? '#e8f0fe' : '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <strong style={{ fontSize: '0.9rem' }}>Step {step.id}: {step.phase}</strong>
                <span style={{ color: '#888', fontSize: '0.8rem' }}>{currentStep === i ? '▲' : '▼'}</span>
              </div>
              {currentStep === i && (
                <div style={{ padding: '0.75rem 1rem' }}>
                  <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                    {step.code}
                  </pre>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: '#f0f4ff', padding: '0.75rem', borderRadius: '6px' }}>
                    {step.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is the minimum time between a CMS publish and a user seeing the new post?
            (~2 requests: the first triggers regeneration, the second serves fresh data)</li>
          <li>Can you use <code>revalidateTag</code> in a Server Action (not just a Route Handler)?
            (Yes — works anywhere you call server-side code)</li>
          <li>What happens if two different fetches use the same tag?
            (Both are invalidated by one <code>revalidateTag</code> call)</li>
          <li>How does this compare to React Query's <code>invalidateQueries</code>?
            (revalidateTag: server-side cache, no client state. invalidateQueries: client-side cache, re-fetches in the browser. Both solve "invalidate when data changes" but at different layers.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Data Fetching in Next.js</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> App Router data fetching requires Next.js — these exercises simulate the
      key behaviors (waterfall timing, cache strategy decisions, streaming loading states) in Vite.
      The code patterns shown are directly usable in production Next.js App Router projects.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_WaterfallRace />
      <hr />
      <Exercise2_CacheOptionDecisions />
      <hr />
      <Exercise3_SuspenseStreaming />
      <hr />
      <Exercise4_RevalidationFlow />
    </div>
  </div>
);

export default App;
