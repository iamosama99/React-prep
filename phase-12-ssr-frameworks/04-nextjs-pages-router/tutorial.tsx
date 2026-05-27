// ============================================================
// Topic:   Next.js Pages Router
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: WRITE THE CODE (with annotated stubs)
//
// The Pages Router TypeScript APIs are something you should be able
// to write from memory. These exercises give you stubs with TODOs
// and reveal the complete reference implementation.
//
//   1. Write getServerSideProps: auth, redirect, 404, typed props
//   2. Write getStaticProps + getStaticPaths: ISR + fallback options
//   3. Implement per-page layouts in _app.tsx
//   4. Diagnose the getInitialProps problem
//
// Run: npm run tutorial 04-nextjs-pages-router
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Write getServerSideProps from memory
//
// This is the #1 most asked Pages Router question in interviews.
// You must be able to:
//   - Type it correctly (GetServerSideProps<Props>)
//   - Access cookies, params, query from context
//   - Return props, redirect, or notFound
//   - Use InferGetServerSidePropsType on the component
//
// Read the stub. Fill in the TODOs. Then reveal the reference.
// ─────────────────────────────────────────────────────────────

const GSSP_STUB = `// pages/orders/[id].tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

// TODO 1: Define the Props interface
//   - order: { id: string; total: number; status: string; createdAt: string }
//   - user: { name: string; email: string }
interface Props {
  // ... your types here
}

// TODO 2: Export a typed getServerSideProps
//   - Type it as GetServerSideProps<Props>
//   - The function receives a context parameter — destructure:
//     { params, req, res, query } from context
//   - Steps:
//     a. Get session from cookie: req.cookies['session-token']
//        If no token → redirect to /login with 302
//     b. Verify session (pretend verifySession returns a User or null)
//        If null → redirect to /login
//     c. Fetch the order by params.id
//        If order not found → return { notFound: true }
//     d. Check that order.userId === user.id
//        If unauthorized → return { notFound: true } (don't leak 403)
//     e. Return { props: { order, user } }
export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  // TODO: implement above steps
};

// TODO 3: Type the component using InferGetServerSidePropsType
export default function OrderDetailPage({
  order,
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div>
      {/* TODO: render order.id, order.total, order.status */}
    </div>
  );
}`;

const GSSP_SOLUTION = `// pages/orders/[id].tsx
import type {
  GetServerSideProps,
  InferGetServerSidePropsType,
  GetServerSidePropsContext,
} from 'next';

interface Order {
  id: string;
  userId: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Props {
  order: Order;
  user: User;
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { params, req } = context;

  // Step 1: Check for session cookie
  const token = req.cookies['session-token'];
  if (!token) {
    return {
      redirect: {
        destination: \`/login?from=/orders/\${params!.id}\`,
        permanent: false, // 302, not 301
      },
    };
  }

  // Step 2: Verify session (server-only — never exposed to client)
  const user = await verifySession(token);
  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Step 3: Fetch the order
  const order = await db.orders.findById(params!.id as string);
  if (!order) {
    return { notFound: true }; // renders 404 page
  }

  // Step 4: Authorization — is this the user's order?
  if (order.userId !== user.id) {
    return { notFound: true }; // 404 not 403 — don't confirm the order exists
  }

  // Step 5: Return props
  return {
    props: {
      order,
      user: { id: user.id, name: user.name, email: user.email },
    },
  };
};

// InferGetServerSidePropsType: extracts Props from the function type
// → eliminates duplication, stays in sync automatically
export default function OrderDetailPage({
  order,
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div>
      <h1>Order #{order.id}</h1>
      <p>Status: {order.status}</p>
      <p>Total: \${order.total.toFixed(2)}</p>
      <p>Placed by: {user.name}</p>
    </div>
  );
}`;

const GSSP_RETURN_SHAPES = [
  { shape: 'return { props: { data } }', effect: 'Normal — passes props to component' },
  { shape: 'return { redirect: { destination: "/login", permanent: false } }', effect: '302 redirect. permanent: true = 301 (cached by browser/CDN)' },
  { shape: 'return { notFound: true }', effect: 'Renders the 404 page with 404 status code' },
];

function Exercise1_GetServerSideProps() {
  const [showSolution, setShowSolution] = useState(false);
  const [view, setView] = useState<'stub' | 'solution'>('stub');

  return (
    <section>
      <h2>Exercise 1: Write getServerSideProps — Auth + Redirect + 404</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        This is the most commonly tested Pages Router API. Read the stub, mentally implement
        each TODO, then reveal the reference to compare.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('stub')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'stub' ? '#1a73e8' : '#ddd',
            background: view === 'stub' ? '#e8f0fe' : '#fff',
            color: view === 'stub' ? '#1a73e8' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Your task (stub)
        </button>
        <button
          onClick={() => { setView('solution'); setShowSolution(true); }}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'solution' ? '#27ae60' : '#ddd',
            background: view === 'solution' ? '#e8f5e9' : '#fff',
            color: view === 'solution' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Reference solution
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: view === 'stub' ? '#cdd6f4' : '#a9dc76', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6 }}>
        {view === 'stub' ? GSSP_STUB : GSSP_SOLUTION}
      </pre>

      {/* Return shapes reference */}
      <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', border: '1px solid #eee' }}>
        <strong style={{ fontSize: '0.9rem' }}>getServerSideProps return shapes (memorize these):</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {GSSP_RETURN_SHAPES.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
              <code style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.2rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                {s.shape}
              </code>
              <span style={{ color: '#555' }}>{s.effect}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why do we return <code>notFound: true</code> for the unauthorized case instead of a 403 redirect?
            (Don't leak that the resource exists — attacker learns nothing)</li>
          <li>What does <code>InferGetServerSidePropsType</code> give us vs manually typing the props?
            (Type safety that stays in sync — if Props changes, the component type changes automatically)</li>
          <li><code>permanent: false</code> vs <code>permanent: true</code> — what's the caching difference?
            (false = 302, not cached by browsers/CDNs. true = 301, cached — user's browser won't even hit the server next time)</li>
          <li>Can you access <code>searchParams</code> in getServerSideProps? What's the property called?
            (It's <code>context.query</code> — includes both dynamic params and query string params)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Write getStaticProps + getStaticPaths
//
// Static data fetching with ISR and the three fallback options.
// The fallback behavior is a very common interview question.
// ─────────────────────────────────────────────────────────────

const GSP_STUB = `// pages/blog/[slug].tsx
import type {
  GetStaticProps,
  GetStaticPaths,
  InferGetStaticPropsType,
} from 'next';

interface Post {
  slug: string;
  title: string;
  content: string;
  publishedAt: string;
}

interface Props {
  post: Post;
}

// TODO 1: Write getStaticPaths
//   - Fetch all published post slugs from the CMS
//   - Return { paths: [...], fallback: 'blocking' }
//   - 'blocking' means: unknown slugs are SSR'd on first request,
//     then cached as static (no fallback UI needed)
export const getStaticPaths: GetStaticPaths = async () => {
  // TODO: implement
};

// TODO 2: Write getStaticProps
//   - Fetch the post by slug from params
//   - If post not found: return { notFound: true }
//   - Return props WITH revalidate: 3600 (ISR — regenerate hourly)
//   - Type it as GetStaticProps<Props>
export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  // TODO: implement
};

// TODO 3: Type the component with InferGetStaticPropsType
export default function BlogPost({
  post
}: InferGetStaticPropsType<typeof getStaticProps>) {
  // TODO: render post.title, post.content, post.publishedAt
}`;

const GSP_SOLUTION = `// pages/blog/[slug].tsx
import type {
  GetStaticProps,
  GetStaticPaths,
  InferGetStaticPropsType,
} from 'next';
import { useRouter } from 'next/router';

interface Post {
  slug: string;
  title: string;
  content: string;
  publishedAt: string;
}

interface Props {
  post: Post;
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Fetch slugs for all published posts at build time
  const posts = await cms.fetchPublishedPosts();

  return {
    paths: posts.map(p => ({
      params: { slug: p.slug },
    })),

    // 'blocking': unknown slugs are SSR'd on first request,
    //   then cached statically. No loading state needed.
    // 'true': unknown slugs show a loading UI (router.isFallback)
    //   while being generated in the background.
    // false: unknown slugs return 404 immediately.
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = params!.slug as string;
  const post = await cms.fetchPostBySlug(slug);

  // Handles both: slug not in CMS + dynamically-requested unknown slug
  if (!post) {
    return { notFound: true };
  }

  return {
    props: { post },
    revalidate: 3600, // ISR: regenerate at most once per hour
  };
};

export default function BlogPost({
  post,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();

  // Only needed with fallback: true — show a skeleton while generating
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}`;

const FALLBACK_OPTIONS = [
  {
    value: 'false',
    behavior: 'Unknown paths return 404 immediately',
    useCase: 'Small sites where all paths are known at build time. /docs, /about.',
    loadingState: 'None needed — page either exists or 404s',
    color: '#e55',
  },
  {
    value: 'true',
    behavior: 'Unknown paths render immediately with router.isFallback=true (you show a skeleton). Page generates in background. Next request gets the static version.',
    useCase: 'Large sites where you want a loading UX during generation. E-commerce with millions of products.',
    loadingState: 'Required: check router.isFallback and render a skeleton/spinner',
    color: '#e67e22',
  },
  {
    value: "'blocking'",
    behavior: 'Unknown paths are SSR\'d on first request (user waits). The result is cached as a static page. Next request is instant (static).',
    useCase: 'When a loading state would be jarring. Blog posts, docs — better to wait for the full page than show a skeleton.',
    loadingState: 'None — user waits (blocking) for first render',
    color: '#27ae60',
  },
];

function Exercise2_GetStaticProps() {
  const [view, setView] = useState<'stub' | 'solution'>('stub');
  const [showFallback, setShowFallback] = useState(false);

  return (
    <section>
      <h2>Exercise 2: Write getStaticProps + getStaticPaths (ISR + fallback)</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The most common static data fetching pattern in the Pages Router.
        The <code>fallback</code> option is the most frequently asked-about detail.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('stub')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'stub' ? '#1a73e8' : '#ddd',
            background: view === 'stub' ? '#e8f0fe' : '#fff',
            color: view === 'stub' ? '#1a73e8' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Your task (stub)
        </button>
        <button
          onClick={() => setView('solution')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'solution' ? '#27ae60' : '#ddd',
            background: view === 'solution' ? '#e8f5e9' : '#fff',
            color: view === 'solution' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Reference solution
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: view === 'stub' ? '#cdd6f4' : '#a9dc76', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, marginBottom: '1rem' }}>
        {view === 'stub' ? GSP_STUB : GSP_SOLUTION}
      </pre>

      <button
        onClick={() => setShowFallback(s => !s)}
        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#e67e22', color: '#fff', cursor: 'pointer', marginBottom: '1rem' }}
      >
        {showFallback ? 'Hide' : 'Show →'} fallback option comparison
      </button>

      {showFallback && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {FALLBACK_OPTIONS.map(opt => (
            <div key={opt.value} style={{ border: `2px solid ${opt.color}`, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '0.5rem 1rem', background: opt.color, color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>
                fallback: {opt.value}
              </div>
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 0.4rem' }}><strong>Behavior:</strong> {opt.behavior}</p>
                <p style={{ margin: '0 0 0.4rem' }}><strong>Use case:</strong> {opt.useCase}</p>
                <p style={{ margin: 0, color: '#666' }}><strong>Loading state:</strong> {opt.loadingState}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>If you omit <code>revalidate</code> from <code>getStaticProps</code>, is it pure SSG or ISR?
            (Pure SSG — page only regenerates on <code>next build</code>)</li>
          <li>Do you need <code>getStaticPaths</code> if your page is not dynamic (e.g., <code>pages/about.tsx</code>)?
            (No — only dynamic routes with <code>getStaticProps</code> need it)</li>
          <li>With <code>fallback: 'blocking'</code> and <code>revalidate: 3600</code>: a totally new slug arrives.
            What happens on the 1st request? The 2nd? After 3600 seconds?
            (1st: SSR, generates + caches. 2nd: static, instant. After 3600s: serves stale, regenerates.)</li>
          <li>What is the App Router equivalent of <code>getStaticPaths</code>?
            (<code>generateStaticParams()</code> in the page segment)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Per-Page Layouts in _app.tsx
//
// The Pages Router doesn't have nested layouts built in.
// The idiomatic workaround: attach a getLayout function to each page.
// _app.tsx reads it and wraps the component.
//
// Understand this pattern — it comes up in interviews about
// "how do you share layout in the Pages Router?"
// ─────────────────────────────────────────────────────────────

const APP_WITHOUT_LAYOUT = `// pages/_app.tsx — WITHOUT per-page layouts
// Problem: every page must manually include its own layout wrapper.
// If you add a sidebar to DashboardPage, it only renders for that one page.
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}`;

const APP_WITH_LAYOUT = `// pages/_app.tsx — WITH per-page layouts
import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';

// Extend NextPage to include a getLayout function
export type NextPageWithLayout<P = {}> = NextPage<P> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  // Read getLayout from the page component, or default to identity
  const getLayout = Component.getLayout ?? ((page) => page);

  return getLayout(<Component {...pageProps} />);
}

// ─── Usage in a page ─────────────────────────────────────────

// pages/dashboard/index.tsx
import type { NextPageWithLayout } from '../_app';
import DashboardLayout from '@/components/DashboardLayout';

const DashboardPage: NextPageWithLayout = () => {
  return <h1>Dashboard</h1>;
};

// Attach the layout function to the page component
DashboardPage.getLayout = function getLayout(page) {
  return (
    <DashboardLayout>
      {page}
    </DashboardLayout>
  );
};

export default DashboardPage;

// pages/settings.tsx — different layout
const SettingsPage: NextPageWithLayout = () => <h1>Settings</h1>;

SettingsPage.getLayout = function getLayout(page) {
  return (
    <DashboardLayout>
      <SettingsLayout>{page}</SettingsLayout>
    </DashboardLayout>
  );
};`;

function Exercise3_PerPageLayouts() {
  const [view, setView] = useState<'without' | 'with'>('without');

  return (
    <section>
      <h2>Exercise 3: Per-Page Layouts in _app.tsx</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The Pages Router has no built-in nested layouts. The idiomatic pattern
        is to attach a <code>getLayout</code> function to each page component.
        Read both versions and understand the difference.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('without')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'without' ? '#e55' : '#ddd',
            background: view === 'without' ? '#fee' : '#fff',
            color: view === 'without' ? '#c00' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ❌ Without per-page layouts
        </button>
        <button
          onClick={() => setView('with')}
          style={{
            padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
            borderColor: view === 'with' ? '#27ae60' : '#ddd',
            background: view === 'with' ? '#e8f5e9' : '#fff',
            color: view === 'with' ? '#27ae60' : '#333',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ✓ With getLayout pattern
        </button>
      </div>

      <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6 }}>
        {view === 'without' ? APP_WITHOUT_LAYOUT : APP_WITH_LAYOUT}
      </pre>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
        <div style={{ background: '#fee', padding: '1rem', borderRadius: '8px' }}>
          <strong>❌ Without getLayout</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Every page wraps itself in its own layout</li>
            <li>Shared layout state (e.g., open sidebar) resets on navigation</li>
            <li>No way to prevent layout remount between pages</li>
          </ul>
        </div>
        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
          <strong>✓ With getLayout</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Each page declaratively defines its own layout</li>
            <li><code>_app.tsx</code> applies it once — layout persists</li>
            <li>Different pages can have different layouts</li>
          </ul>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>In the App Router, this problem doesn't exist. Why? (Layouts are built into the file system — <code>layout.tsx</code> persists automatically)</li>
          <li>What does <code>Component.getLayout ?? ((page) =&gt; page)</code> do for pages without a layout?
            (The identity function — they render without any wrapping layout)</li>
          <li>Can you nest layouts? (e.g., DashboardLayout wrapping SettingsLayout?) Yes — show how in the code above.</li>
          <li>Where do global providers (React Query, Redux) go in _app.tsx? Inside or outside <code>getLayout</code>?
            (Outside — providers are global, they shouldn't be per-layout)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Diagnose getInitialProps
//
// getInitialProps is legacy. Understanding WHY it's problematic
// is a key interview differentiator — many senior devs don't know.
// ─────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    title: 'Runs on both server AND client',
    code: `// getInitialProps — dual execution
MyPage.getInitialProps = async ({ req }) => {
  if (req) {
    // First request: runs on SERVER (req exists)
    const data = await db.query('SELECT ...');  // server-only DB client
    return { data };
  } else {
    // Client navigation: runs in BROWSER (req is undefined)
    // ⚠ But the db client is in the bundle! It was imported above.
    // ⚠ This crashes or leaks server-only code to the client.
    const data = await fetch('/api/data').then(r => r.json());
    return { data };
  }
};`,
    verdict: 'The function\'s module is included in BOTH the server and client bundles. Any imports at the top of the file (database clients, secret keys) end up in the browser bundle — a security and performance problem.',
  },
  {
    title: 'Disables automatic static optimization',
    code: `// Any page with getInitialProps:
// → Next.js cannot statically optimize it
// → Even a simple page with no data becomes fully dynamic

const AboutPage = () => <div>About us — no dynamic data</div>;
// ❌ This disables SSG for the ENTIRE app if in _app.tsx:
AboutPage.getInitialProps = async () => ({ prop: 'value' });

// ✓ getStaticProps does NOT disable optimization for other pages:
export const getStaticProps: GetStaticProps = async () => ({
  props: { prop: 'value' },
});`,
    verdict: 'Especially dangerous in _app.tsx — using getInitialProps there disables automatic static optimization for every single page in the app. Pages become SSR by default instead of SSG.',
  },
  {
    title: 'Cannot use it with App Router',
    code: `// getInitialProps in pages/_app.tsx is problematic already.
// In the App Router, it simply doesn't exist.
// The correct replacement depends on your use case:

// SSR (per-request data) → getServerSideProps
// SSG (build-time data) → getStaticProps + revalidate
// Client-side data → useEffect + fetch / React Query

// getInitialProps was a transitional API from Next.js 1.0.
// It predates the clean separation of server/client data fetching.`,
    verdict: 'getInitialProps predates the architecture that made Next.js production-ready. getServerSideProps and getStaticProps are strictly server-only — they\'re never shipped to the browser.',
  },
];

function Exercise4_GetInitialProps() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 4: getInitialProps — Diagnose the Problems</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        You'll encounter <code>getInitialProps</code> in legacy codebases.
        Understanding its problems — not just that it's "legacy" — is the senior-level answer.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {PROBLEMS.map((problem, i) => (
          <div key={i} style={{ border: '1px solid #ffccbc', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', background: '#fff3e0', borderBottom: '1px solid #ffccbc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Problem {i + 1}: {problem.title}</strong>
              {!revealed[i] && (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [i]: true }))}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: 'none', background: '#e67e22', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Explain why →
                </button>
              )}
            </div>
            <div style={{ padding: '0.75rem 1rem' }}>
              <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0' }}>
                {problem.code}
              </pre>
              {revealed[i] && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff3e0', borderRadius: '6px', fontSize: '0.85rem', color: '#5d4037', lineHeight: 1.6 }}>
                  <strong>Why it's a problem:</strong> {problem.verdict}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <strong>The interview-ready answer to "Why avoid getInitialProps?":</strong>
        <p style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          "getInitialProps runs on both the server and client — which means all server-side dependencies
          (DB clients, secrets) get shipped to the client bundle. It also disables Next.js's automatic
          static optimization for the page (and all pages if used in _app.tsx).
          <code>getServerSideProps</code> and <code>getStaticProps</code> are strictly server-only —
          their code is never included in the browser bundle, and they enable proper SSG/ISR."
        </p>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Next.js Pages Router</h1>
    <div style={{ background: '#fff3e0', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> The Pages Router is the pre-RSC Next.js architecture powering most existing
      production codebases. These exercises are focused on writing the TypeScript APIs from memory —
      the skill you need for both new features and maintaining legacy codebases.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_GetServerSideProps />
      <hr />
      <Exercise2_GetStaticProps />
      <hr />
      <Exercise3_PerPageLayouts />
      <hr />
      <Exercise4_GetInitialProps />
    </div>
  </div>
);

export default App;
