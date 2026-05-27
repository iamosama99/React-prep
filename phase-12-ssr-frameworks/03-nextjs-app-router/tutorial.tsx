// ============================================================
// Topic:   Next.js App Router
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: CODE READING + ARCHITECTURE DECISIONS
//
// The App Router can't run in Vite. Instead, these exercises:
//   1. Master all 7 file conventions with an interactive quiz
//   2. Design a real app directory structure for given requirements
//   3. Configure segment-level rendering (dynamic, revalidate, runtime)
//   4. Understand Parallel + Intercepting Routes
//
// Run: npm run tutorial 03-nextjs-app-router
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — File Convention Mastery
//
// The App Router's power comes from its file system conventions.
// 7 special files, each with a distinct purpose.
//
// YOUR TASK:
//   Read each description. Select the file it describes.
//   Reveal to verify + see the canonical implementation.
// ─────────────────────────────────────────────────────────────

interface Convention {
  id: number;
  description: string;
  behavior: string;
  answer: string;
  usage: string;
  implementation: string;
  gotcha?: string;
}

const CONVENTIONS: Convention[] = [
  {
    id: 1,
    description: 'Makes a route segment publicly accessible. Without this file, the directory exists but returns a 404.',
    behavior: 'Renders the unique UI for this URL. Receives params and searchParams as props.',
    answer: 'page.tsx',
    usage: 'Every route that should return HTML needs this file.',
    implementation: `// app/products/[id]/page.tsx
interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function ProductPage({ params }: Props) {
  const product = await fetchProduct(params.id);
  return <ProductDisplay product={product} />;
}`,
    gotcha: 'Only page.tsx, layout.tsx, and route.ts are publicly accessible — other files in app/ (components, utils) are colocated but private.',
  },
  {
    id: 2,
    description: 'Shared UI that wraps all routes within its segment. Receives a children prop. Does NOT re-mount when navigating between child routes.',
    behavior: 'Persists across navigations within its subtree. Can be async — its data fetch runs once per mount, not per navigation.',
    answer: 'layout.tsx',
    usage: 'Headers, sidebars, navigation, shared providers, auth wrappers.',
    implementation: `// app/dashboard/layout.tsx
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser(); // runs ONCE per mount
  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <main>{children}</main>
    </div>
  );
}`,
    gotcha: 'Layouts don\'t receive searchParams — they\'re not re-rendered on search param changes. Only pages receive searchParams.',
  },
  {
    id: 3,
    description: 'Automatically creates a Suspense boundary around the page. Shown instantly while the async page component fetches data.',
    behavior: 'The exported component is used as the Suspense fallback. Next.js wraps page.tsx in <Suspense fallback={<Loading />}> automatically.',
    answer: 'loading.tsx',
    usage: 'Skeleton UIs, spinners, content placeholders while async pages load.',
    implementation: `// app/dashboard/loading.tsx
// Auto-used as: <Suspense fallback={<DashboardLoading />}>
//                 <Page />
//               </Suspense>

export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-32 bg-gray-200 rounded" />
    </div>
  );
}`,
    gotcha: 'loading.tsx wraps only the page — not the layout. The layout renders immediately; the loading state appears inside the layout shell.',
  },
  {
    id: 4,
    description: 'An error boundary for the segment. Catches errors thrown by the page, nested layouts, or Server Components in the subtree. MUST be a Client Component.',
    behavior: 'Receives error and reset props. reset() re-renders the segment. Parent layout stays mounted — only the failed segment shows the error UI.',
    answer: 'error.tsx',
    usage: 'Graceful error recovery without full page crashes. Scoped per segment.',
    implementation: `// app/dashboard/error.tsx
'use client'; // REQUIRED — Error Boundaries must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error); // log to Sentry etc.
  }, [error]);

  return (
    <div>
      <h2>Something went wrong in the dashboard</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}`,
    gotcha: 'error.tsx does NOT catch errors in the layout at the same level — only in the page and children. To catch layout errors, place error.tsx in the parent.',
  },
  {
    id: 5,
    description: 'Rendered when notFound() is called in a Server Component, or when a dynamic segment has no match and dynamicParams = false.',
    behavior: 'Returns a 404 status code with a custom UI instead of the default Next.js 404 page.',
    answer: 'not-found.tsx',
    usage: 'Custom 404 pages per route segment.',
    implementation: `// app/blog/[slug]/not-found.tsx
import Link from 'next/link';

export default function BlogPostNotFound() {
  return (
    <div>
      <h2>Post not found</h2>
      <Link href="/blog">← Back to blog</Link>
    </div>
  );
}

// In page.tsx — trigger it:
import { notFound } from 'next/navigation';

export default async function BlogPost({ params }) {
  const post = await fetchPost(params.slug);
  if (!post) notFound(); // renders not-found.tsx with 404 status
  return <PostContent post={post} />;
}`,
  },
  {
    id: 6,
    description: 'Like layout.tsx but RE-MOUNTS on every navigation within its subtree. State is reset, effects re-run on each route change.',
    behavior: 'Same children prop as layout. Key difference: unmounts and remounts on navigation, while layout persists.',
    answer: 'template.tsx',
    usage: 'Rarely needed. Use when you need fresh state per navigation: page-view analytics, entry animations, forms that reset between pages.',
    implementation: `// app/dashboard/template.tsx
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  // Fires on EVERY navigation — component remounts
  useEffect(() => {
    analytics.page(path);
  }, [path]);

  return <>{children}</>;
}`,
    gotcha: 'layout.tsx vs template.tsx: layout persists (state survives), template remounts (state resets). When in doubt, use layout.',
  },
  {
    id: 7,
    description: 'Creates an HTTP API endpoint at the file\'s URL path. Handles HTTP methods (GET, POST, PUT, DELETE). No UI — not a React component.',
    behavior: 'Exports named functions matching HTTP methods. Uses the Web Request/Response API. Cannot coexist with page.tsx in the same directory.',
    answer: 'route.ts',
    usage: 'API endpoints, webhooks, server-sent events, auth callbacks.',
    implementation: `// app/api/products/[id]/route.ts
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const product = await db.products.findById(params.id);
  if (!product) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const updated = await db.products.update(params.id, body);
  return Response.json(updated);
}`,
    gotcha: 'route.ts replaces Pages Router pages/api/ files. They\'re equivalent — route.ts is the App Router version.',
  },
];

const FILES = ['page.tsx', 'layout.tsx', 'loading.tsx', 'error.tsx', 'not-found.tsx', 'template.tsx', 'route.ts'];

function Exercise1_FileConventions() {
  const [states, setStates] = useState<Record<number, { guess: string | null; revealed: boolean }>>(() =>
    Object.fromEntries(CONVENTIONS.map(c => [c.id, { guess: null, revealed: false }]))
  );

  function guess(id: number, file: string) {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], guess: file } }));
  }
  function reveal(id: number) {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], revealed: true } }));
  }

  const score = CONVENTIONS.filter(c => states[c.id].revealed && states[c.id].guess === c.answer).length;
  const revealedCount = CONVENTIONS.filter(c => states[c.id].revealed).length;

  return (
    <section>
      <h2>Exercise 1: File Convention Mastery (7 files)</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Read each description. Select the file it describes. Reveal to see the full implementation.
        The implementation details are interview-level answers — read them carefully.
      </p>
      {revealedCount > 0 && (
        <div style={{ margin: '0.5rem 0 1rem', padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealedCount}</strong> revealed
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {CONVENTIONS.map(conv => {
          const st = states[conv.id];
          const isCorrect = st.guess === conv.answer;
          return (
            <div key={conv.id} style={{
              border: '1px solid #ddd',
              borderRadius: '10px',
              overflow: 'hidden',
              background: st.revealed ? (isCorrect ? '#f0fff4' : '#fff8f8') : '#fff',
            }}>
              <div style={{ padding: '0.75rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>#{conv.id}</strong>
                {st.revealed && (
                  <span style={{ fontSize: '0.85rem', color: isCorrect ? '#27ae60' : '#e55' }}>
                    {isCorrect ? '✓ Correct' : `✗ Answer: ${conv.answer}`}
                  </span>
                )}
              </div>
              <div style={{ padding: '1rem' }}>
                <p style={{ margin: '0 0 0.4rem', color: '#333', lineHeight: 1.6 }}>{conv.description}</p>
                <p style={{ margin: '0 0 0.75rem', color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>{conv.behavior}</p>

                {!st.revealed ? (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {FILES.map(f => (
                      <button
                        key={f}
                        onClick={() => guess(conv.id, f)}
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: st.guess === f ? '#1a73e8' : '#ddd',
                          background: st.guess === f ? '#e8f0fe' : '#fff',
                          color: st.guess === f ? '#1a73e8' : '#333',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {f}
                      </button>
                    ))}
                    {st.guess && (
                      <button
                        onClick={() => reveal(conv.id)}
                        style={{
                          padding: '0.3rem 0.9rem',
                          borderRadius: '4px',
                          border: 'none',
                          background: '#333',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          marginLeft: 'auto',
                        }}
                      >
                        Reveal →
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#555' }}>
                      <strong>Use for:</strong> {conv.usage}
                    </div>
                    <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0' }}>
                      {conv.implementation}
                    </pre>
                    {conv.gotcha && (
                      <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#fff9c4', borderRadius: '6px', fontSize: '0.8rem', color: '#5d4037' }}>
                        <strong>⚠ Gotcha:</strong> {conv.gotcha}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Route Architecture Design
//
// Given requirements for a SaaS dashboard app, design the
// app/ directory structure. Then reveal and compare.
// ─────────────────────────────────────────────────────────────

const REQUIREMENTS = `SaaS App — Requirements:
• Public routes: / (homepage), /pricing, /about
• Auth routes: /login, /register — different layout (no sidebar, centered card)
• App routes: /dashboard, /dashboard/analytics, /dashboard/settings
  — authenticated, share a sidebar nav
• Each app route shows a loading skeleton while data fetches
• /dashboard/settings has 3 sub-tabs: /general, /billing, /team
• API endpoint: /api/webhooks (receives Stripe webhook POSTs)`;

const DIRECTORY_STRUCTURE = `app/
├── layout.tsx                    ← root layout (html, body, global providers)
├── page.tsx                      ← / (homepage)
│
├── (marketing)/                  ← route GROUP — no URL segment
│   ├── layout.tsx                ← marketing layout (public header, footer)
│   ├── pricing/
│   │   └── page.tsx              ← /pricing
│   └── about/
│       └── page.tsx              ← /about
│
├── (auth)/                       ← route GROUP — no URL segment
│   ├── layout.tsx                ← auth layout (centered card, no sidebar)
│   ├── login/
│   │   └── page.tsx              ← /login
│   └── register/
│       └── page.tsx              ← /register
│
├── dashboard/
│   ├── layout.tsx                ← dashboard layout (sidebar + auth guard)
│   ├── page.tsx                  ← /dashboard
│   ├── loading.tsx               ← skeleton for all /dashboard/* pages
│   ├── error.tsx                 ← error boundary for all /dashboard/* pages
│   ├── analytics/
│   │   ├── page.tsx              ← /dashboard/analytics
│   │   └── loading.tsx           ← analytics-specific skeleton (overrides parent)
│   └── settings/
│       ├── layout.tsx            ← settings layout (tab bar: General|Billing|Team)
│       ├── page.tsx              ← /dashboard/settings → redirect to /general
│       ├── general/
│       │   └── page.tsx          ← /dashboard/settings/general
│       ├── billing/
│       │   └── page.tsx          ← /dashboard/settings/billing
│       └── team/
│           └── page.tsx          ← /dashboard/settings/team
│
└── api/
    └── webhooks/
        └── route.ts              ← POST /api/webhooks (Stripe handler)`;

const DESIGN_NOTES = [
  {
    point: 'Route Groups (marketing) and (auth)',
    explanation: 'Parenthesized folders organize routes without affecting URLs. /login and /pricing both have different layouts without those names appearing in the URL. Without route groups, you\'d have to conditionally render layouts in a single root layout.',
  },
  {
    point: 'dashboard/loading.tsx covers all /dashboard/* routes',
    explanation: 'loading.tsx propagates to all nested routes that don\'t have their own. So /dashboard, /dashboard/analytics, /dashboard/settings/billing all use the dashboard skeleton — unless overridden (like analytics/loading.tsx for a more specific UI).',
  },
  {
    point: 'settings/layout.tsx for the tab bar',
    explanation: 'The tab bar (General | Billing | Team) is shared across all three settings pages. layout.tsx renders once and PERSISTS as you navigate between tabs — no remount, so scroll position and open accordions survive navigation. This is impossible to achieve cleanly in the Pages Router.',
  },
  {
    point: 'route.ts for the Stripe webhook',
    explanation: 'Webhooks are POST-only, return no HTML. route.ts is the right choice. In the Pages Router, this would be pages/api/webhooks.ts. The App Router equivalent has access to the Web Request/Response API natively.',
  },
];

function Exercise2_RouteArchitecture() {
  const [showStructure, setShowStructure] = useState(false);
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 2: Route Architecture Design</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Read the requirements. Mentally (or physically) sketch the <code>app/</code> directory.
        Then reveal the reference structure and design decisions.
      </p>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.8, marginBottom: '1rem', overflow: 'auto' }}>
        {REQUIREMENTS}
      </pre>

      <button
        onClick={() => setShowStructure(s => !s)}
        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', marginBottom: '1rem' }}
      >
        {showStructure ? 'Hide structure' : 'Reveal directory structure →'}
      </button>

      {showStructure && (
        <>
          <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '1.25rem', borderRadius: '8px', fontSize: '0.8rem', overflow: 'auto', lineHeight: 1.8, marginBottom: '1rem' }}>
            {DIRECTORY_STRUCTURE}
          </pre>

          <h3 style={{ margin: '1.25rem 0 0.75rem', fontSize: '1rem' }}>Design Decisions — click each</h3>
          {DESIGN_NOTES.map((note, i) => (
            <div key={i} style={{ border: '1px solid #ddd', borderRadius: '8px', marginBottom: '0.5rem', overflow: 'hidden' }}>
              <button
                onClick={() => setShowNotes(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: showNotes[i] ? '#e8f0fe' : '#fafafa',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Why: {note.point}</strong>
                <span>{showNotes[i] ? '▲' : '▼'}</span>
              </button>
              {showNotes[i] && (
                <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: '#fff', borderTop: '1px solid #eee' }}>
                  {note.explanation}
                </div>
              )}
            </div>
          ))}

          <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
            <strong>TODO:</strong>
            <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
              <li>Where do you put global React Query / Redux providers? Root <code>layout.tsx</code> or <code>(marketing)/layout.tsx</code>? Why?</li>
              <li>Navigating from <code>/dashboard/settings/general</code> to <code>/dashboard/settings/billing</code>:
                which layouts re-render? Which remount? (root layout: no, dashboard layout: no, settings layout: no — it persists)</li>
              <li>Could you handle the /dashboard auth guard in <code>middleware.ts</code> instead of in the layout? What are the tradeoffs?
                (Middleware runs before cache — better for redirects. Layout runs after render — better for showing loading state during auth check.)</li>
            </ol>
          </div>
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Segment Config: Control Rendering Behavior
//
// Four scenario-based challenges. Read the requirement,
// decide which export fixes it, then reveal the full solution.
// ─────────────────────────────────────────────────────────────

interface ConfigScenario {
  id: number;
  requirement: string;
  context: string;
  answer: string;
  code: string;
  explanation: string;
}

const CONFIG_SCENARIOS: ConfigScenario[] = [
  {
    id: 1,
    requirement: 'The /dashboard page reads the user\'s cookie for personalization. Every request must be fresh — no caching at all.',
    context: 'app/dashboard/page.tsx',
    answer: "export const dynamic = 'force-dynamic';",
    code: `// app/dashboard/page.tsx
export const dynamic = 'force-dynamic';
// Equivalent to: every fetch uses cache: 'no-store'
// Equivalent to: Pages Router getServerSideProps

export default async function DashboardPage() {
  const user = await getCurrentUser(); // reads cookies
  return <Dashboard user={user} />;
}`,
    explanation: "'force-dynamic' opts the entire segment out of static generation. Equivalent to getServerSideProps in the Pages Router. Use when you need request-level data (cookies, headers) or when using a DB client directly (no fetch call to add cache options to).",
  },
  {
    id: 2,
    requirement: 'The /blog listing page fetches posts from a CMS. Posts update at most once per hour. You want CDN caching but don\'t want a full redeploy on content updates.',
    context: 'app/blog/page.tsx',
    answer: 'export const revalidate = 3600;',
    code: `// app/blog/page.tsx
export const revalidate = 3600; // ISR: regenerate after 1 hour

export default async function BlogListPage() {
  const posts = await fetch('https://cms.example.com/posts')
    .then(r => r.json());
  return <PostList posts={posts} />;
}`,
    explanation: "'revalidate = 3600' configures ISR at the segment level. The page is statically generated at build time and regenerated in the background after 3600 seconds. Equivalent to return { revalidate: 3600 } in Pages Router getStaticProps.",
  },
  {
    id: 3,
    requirement: 'An API route /api/geo reads the user\'s IP and returns their country. Must respond in <5ms globally — Node.js cold start latency is unacceptable.',
    context: 'app/api/geo/route.ts',
    answer: "export const runtime = 'edge';",
    code: `// app/api/geo/route.ts
export const runtime = 'edge'; // V8, no Node.js, runs close to users

export async function GET(request: Request) {
  // Edge runtime has geo data on Vercel via headers
  const country = request.headers.get('x-vercel-ip-country') ?? 'unknown';
  return Response.json({ country });
}`,
    explanation: "'runtime = 'edge'' deploys to the Edge Runtime — V8 without Node.js APIs, geographically close to users (~1ms cold start vs 100ms+ for Node). Cannot use Node.js APIs (fs, net, pg) — only Web APIs and HTTP-based services.",
  },
  {
    id: 4,
    requirement: '/blog/[slug] pre-renders 100 popular posts at build time. Unknown slugs should be generated on first request (not 404). Old pages regenerate every hour.',
    context: 'app/blog/[slug]/page.tsx',
    answer: 'export const revalidate = 3600; export const dynamicParams = true;',
    code: `// app/blog/[slug]/page.tsx
export const revalidate = 3600;
export const dynamicParams = true; // default: unknown paths → generate on demand

export async function generateStaticParams() {
  const top100 = await fetchTopPosts({ limit: 100 });
  return top100.map(p => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }) {
  const post = await fetchPost(params.slug);
  if (!post) notFound();
  return <PostContent post={post} />;
}`,
    explanation: "dynamicParams = true (default) means paths NOT in generateStaticParams are generated on first request and cached as ISR pages. This is the App Router equivalent of fallback: 'blocking' in Pages Router getStaticPaths. Setting dynamicParams = false returns 404 for unknown slugs.",
  },
];

function Exercise3_SegmentConfig() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 3: Segment Config Decisions</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Each scenario has a rendering requirement. Think: which segment config export solves this?
        Then reveal the full implementation and explanation.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {CONFIG_SCENARIOS.map(scenario => (
          <div key={scenario.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
              <code style={{ fontSize: '0.8rem', color: '#555' }}>{scenario.context}</code>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ margin: '0 0 0.75rem', color: '#333', lineHeight: 1.6 }}>
                <strong>Requirement:</strong> {scenario.requirement}
              </p>
              {!revealed[scenario.id] ? (
                <>
                  <div style={{ background: '#1e1e2e', color: '#888', padding: '0.5rem 0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    // What do you export from this file?
                  </div>
                  <button
                    onClick={() => setRevealed(prev => ({ ...prev, [scenario.id]: true }))}
                    style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Reveal answer →
                  </button>
                </>
              ) : (
                <>
                  <div style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.5rem 0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    {scenario.answer}
                  </div>
                  <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                    {scenario.code}
                  </pre>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: '#f0f4ff', padding: '0.75rem', borderRadius: '6px' }}>
                    {scenario.explanation}
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
// EXERCISE 4 — Parallel Routes + Intercepting Routes
//
// These are the most advanced App Router patterns.
// Instagram-style modal navigation — same URL renders differently
// depending on navigation context.
// ─────────────────────────────────────────────────────────────

const PARALLEL_ROUTES_CODE = `// app/layout.tsx — @modal is a "slot"
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode; // receives @modal/... content
}) {
  return (
    <>
      {children}
      {modal}  {/* null normally, modal overlay when intercepted */}
    </>
  );
}

// app/@modal/(.)photo/[id]/page.tsx
// (.) = same directory level intercept
// Renders as a MODAL when navigating from the feed
export default function PhotoModal({ params }) {
  return (
    <Modal>
      <Photo id={params.id} />
    </Modal>
  );
}

// app/photo/[id]/page.tsx
// Renders as a FULL PAGE when:
//   - navigating directly (paste URL, page refresh)
//   - JS is disabled
export default function PhotoPage({ params }) {
  return <Photo id={params.id} />;
}`;

const INTERCEPTING_PATTERNS = [
  { pattern: '(.)', description: 'Same directory level', example: 'app/feed/@modal/(.)photo — intercepts /photo' },
  { pattern: '(..)', description: 'One level up', example: 'app/@modal/(..)settings — intercepts /settings' },
  { pattern: '(...)', description: 'Root level', example: 'app/@modal/(...)auth/login — intercepts /auth/login' },
];

function Exercise4_ParallelRoutes() {
  const [showCode, setShowCode] = useState(false);
  const [scenario, setScenario] = useState<'internal' | 'direct'>('internal');

  return (
    <section>
      <h2>Exercise 4: Parallel Routes & Intercepting Routes</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The most powerful App Router patterns. Same URL, different rendering depending on how you arrive.
      </p>

      {/* Visual explanation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setScenario('internal')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: scenario === 'internal' ? '#1a73e8' : '#ddd',
            background: scenario === 'internal' ? '#e8f0fe' : '#fff',
            color: scenario === 'internal' ? '#1a73e8' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Click from feed
        </button>
        <button
          onClick={() => setScenario('direct')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: scenario === 'direct' ? '#27ae60' : '#ddd',
            background: scenario === 'direct' ? '#e8f5e9' : '#fff',
            color: scenario === 'direct' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Direct URL / refresh
        </button>
      </div>

      <div style={{ padding: '1.25rem', border: '2px solid', borderColor: scenario === 'internal' ? '#1a73e8' : '#27ae60', borderRadius: '10px', marginBottom: '1.25rem' }}>
        {scenario === 'internal' ? (
          <div>
            <strong style={{ color: '#1a73e8' }}>Internal navigation: user clicks photo in feed</strong>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ flex: 1, background: '#f5f5f5', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>URL: /photo/123</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ background: '#e8f0fe', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                    📷 Feed (stays visible)
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', color: '#fff', textAlign: 'center' }}>
                    🖼 Modal overlay: PhotoModal<br />
                    <code style={{ fontSize: '0.75rem' }}>@modal/(.)photo/[id]/page.tsx</code>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, fontSize: '0.85rem', color: '#555' }}>
                <p><strong>What files render:</strong></p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 2 }}>
                  <li><code>layout.tsx</code> (children=feed, modal=PhotoModal)</li>
                  <li><code>@modal/(.)photo/[id]/page.tsx</code> → modal slot</li>
                </ul>
                <p>Back button closes modal, URL returns to feed.</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <strong style={{ color: '#27ae60' }}>Direct URL: user pastes /photo/123 in browser</strong>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ flex: 1, background: '#f5f5f5', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>URL: /photo/123</strong>
                <div style={{ marginTop: '0.5rem', background: '#e8f5e9', padding: '0.75rem', borderRadius: '4px' }}>
                  🖼 Full photo page: PhotoPage<br />
                  <code style={{ fontSize: '0.75rem' }}>photo/[id]/page.tsx</code>
                </div>
              </div>
              <div style={{ flex: 1, fontSize: '0.85rem', color: '#555' }}>
                <p><strong>What files render:</strong></p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 2 }}>
                  <li><code>photo/[id]/page.tsx</code> → full page</li>
                  <li>No feed. No modal overlay.</li>
                </ul>
                <p>Same URL, completely different layout. Intercepting only happens during client navigation.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Intercepting Route Matchers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {INTERCEPTING_PATTERNS.map(({ pattern, description, example }) => (
            <div key={pattern} style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <code style={{ fontWeight: 700, color: '#8e44ad', fontSize: '0.95rem', minWidth: '40px' }}>{pattern}</code>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#333' }}>{description}</div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>{example}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowCode(s => !s)}
        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#8e44ad', color: '#fff', cursor: 'pointer', marginBottom: '1rem' }}
      >
        {showCode ? 'Hide implementation' : 'Show full implementation →'}
      </button>

      {showCode && (
        <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6 }}>
          {PARALLEL_ROUTES_CODE}
        </pre>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>The implicit <code>children</code> is also a slot. How many slots can a layout receive? (Unlimited — each @folder is a slot)</li>
          <li>When does the intercept NOT apply? (Direct navigation, page refresh — the modal slot gets the default.tsx content or null)</li>
          <li>What's a real use case beyond photo modals? (Shopping cart drawer, login modal, notification panel, split-pane editors)</li>
          <li>How does this compare to using a modal via React state in the Pages Router? What problems does it solve?
            (URL-shareable modal, proper back button behavior, refresh safety, no flash on reload)</li>
        </ol>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Next.js App Router</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> The App Router requires a full Next.js project. These exercises build
      deep understanding of the file conventions, routing architecture, and configuration options
      through code reading and decision-making — the same skills interviewers test.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_FileConventions />
      <hr />
      <Exercise2_RouteArchitecture />
      <hr />
      <Exercise3_SegmentConfig />
      <hr />
      <Exercise4_ParallelRoutes />
    </div>
  </div>
);

export default App;
