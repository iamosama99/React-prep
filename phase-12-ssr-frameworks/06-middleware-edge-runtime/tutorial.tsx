// ============================================================
// Topic:   Middleware & Edge Runtime
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: WRITE THE CODE + BUG HUNT + DECISION MAKING
//
// Middleware is one of those things that's easy to get subtly
// wrong. These exercises build the precise understanding needed:
//
//   1. Write an auth middleware from scratch (with TODOs)
//   2. Bug hunt — find errors in 4 broken middleware snippets
//   3. Redirect vs Rewrite decision tool
//   4. Edge Runtime capability quiz — what can/can't run at the edge
//
// Run: npm run tutorial 06-middleware-edge-runtime
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Write Auth Middleware from Requirements
//
// Given a spec, write the full middleware implementation.
// This covers: matchers, cookie checks, redirect with from param,
// and header injection — the four most common middleware tasks.
// ─────────────────────────────────────────────────────────────

const MIDDLEWARE_SPEC = `Requirement: Auth + Locale Middleware

The app has two sections:
  • /dashboard/* — requires authentication. Redirect to /login?from=<path> if no session cookie.
  • /api/* — protected APIs. Return 401 JSON if no session token.
  • /public/* — always accessible, no auth check.

Additionally:
  • Inject an X-Request-ID header (UUID) on every request for request tracing.
  • Run on all paths EXCEPT: _next/static, _next/image, favicon.ico

DO NOT:
  • Verify the JWT signature in middleware (too heavy for edge)
  • Query the database (edge runtime has no TCP connections)
  • Run on static asset paths`;

const MIDDLEWARE_STUB = `// middleware.ts — at the project root (next to app/ or pages/)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // TODO 1: Inject X-Request-ID header on every request
  //   - Use crypto.randomUUID() (available in edge runtime)
  //   - Pass it via NextResponse.next({ request: { headers } })

  // TODO 2: Skip auth for /public/* paths
  //   - If pathname starts with '/public', call NextResponse.next()

  // TODO 3: Check auth for /dashboard/* paths
  //   - Read cookie: request.cookies.get('session')?.value
  //   - If no cookie: redirect to /login?from=<current pathname>
  //   - Use NextResponse.redirect(new URL(..., request.url))

  // TODO 4: Check auth for /api/* paths
  //   - Read header: request.headers.get('Authorization')
  //   - If no auth header: return 401 JSON response
  //   - return new NextResponse(JSON.stringify({ error: 'Unauthorized' }),
  //       { status: 401, headers: { 'Content-Type': 'application/json' } })

  // TODO 5: Allow all other requests through
}

// TODO 6: Configure the matcher
//   - Match all paths EXCEPT: _next/static, _next/image, favicon.ico
export const config = {
  matcher: [
    // TODO: write the negative lookahead regex
  ],
};`;

const MIDDLEWARE_SOLUTION = `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Step 1: Build the X-Request-ID header for ALL requests
  const requestId = crypto.randomUUID(); // Web Crypto API — available at edge
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Step 2: /public/* — always allow through
  if (pathname.startsWith('/public')) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Step 3: /dashboard/* — check for session cookie
  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get('session')?.value;
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname); // remember where they were going
      return NextResponse.redirect(loginUrl);
    }
    // Cookie exists — let the route handler do full JWT verification
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Step 4: /api/* — check for Authorization header
  if (pathname.startsWith('/api')) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
        }
      );
    }
  }

  // Step 5: All other paths — pass through with headers
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Match all paths EXCEPT Next.js internals and static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
    // Or more explicit:
    // '/dashboard/:path*',
    // '/api/:path*',
  ],
};`;

const MIDDLEWARE_KEY_POINTS = [
  { point: 'crypto.randomUUID()', explanation: 'Available in the Edge Runtime via the Web Crypto API. Works without importing anything. Not available: require("crypto") — that\'s Node.js.' },
  { point: 'NextResponse.next({ request: { headers } })', explanation: 'The correct way to pass modified headers to the downstream route/page. The modified headers are visible to Server Components and Route Handlers in req.headers.' },
  { point: 'Checking cookie existence vs verifying JWT', explanation: 'Middleware only checks if the cookie EXISTS (lightweight). Full JWT verification (with signature check) happens in the route handler or server component — it needs crypto operations that may be too slow or complex for the edge.' },
  { point: 'loginUrl.searchParams.set("from", pathname)', explanation: 'Preserves where the user was going. After login, the login page reads ?from= and redirects there. UX detail that matters in production.' },
  { point: 'matcher regex: /((?!_next/static|_next/image|favicon\\.ico).*)', explanation: 'Negative lookahead excludes Next.js internals. Without this, middleware runs on static file requests — wasteful and potentially breaking.' },
];

function Exercise1_WriteMiddleware() {
  const [view, setView] = useState<'spec' | 'stub' | 'solution'>('spec');
  const [revealedPoints, setRevealedPoints] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 1: Write Auth Middleware from Scratch</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Read the spec. Write the implementation in your head or on paper.
        Then compare with the reference and review the key points.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['spec', 'stub', 'solution'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid',
              borderColor: view === v ? '#1a73e8' : '#ddd',
              background: view === v ? '#e8f0fe' : '#fff',
              color: view === v ? '#1a73e8' : '#333',
              cursor: 'pointer', fontSize: '0.85rem',
              textTransform: 'capitalize',
            }}
          >
            {v === 'spec' ? '1. Requirements' : v === 'stub' ? '2. Stub (TODOs)' : '3. Solution'}
          </button>
        ))}
      </div>

      {view === 'spec' && (
        <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.8, overflow: 'auto' }}>
          {MIDDLEWARE_SPEC}
        </pre>
      )}
      {view === 'stub' && (
        <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', lineHeight: 1.8, overflow: 'auto' }}>
          {MIDDLEWARE_STUB}
        </pre>
      )}
      {view === 'solution' && (
        <>
          <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', lineHeight: 1.8, overflow: 'auto', marginBottom: '1rem' }}>
            {MIDDLEWARE_SOLUTION}
          </pre>

          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>Key Implementation Points</h3>
          {MIDDLEWARE_KEY_POINTS.map((kp, i) => (
            <div key={i} style={{ border: '1px solid #eee', borderRadius: '8px', marginBottom: '0.5rem', overflow: 'hidden' }}>
              <button
                onClick={() => setRevealedPoints(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{
                  width: '100%', padding: '0.6rem 1rem', border: 'none',
                  background: revealedPoints[i] ? '#e8f0fe' : '#fafafa',
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <code style={{ fontSize: '0.85rem' }}>{kp.point}</code>
                <span style={{ color: '#888' }}>{revealedPoints[i] ? '▲' : '▼'}</span>
              </button>
              {revealedPoints[i] && (
                <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: '#fff', borderTop: '1px solid #eee' }}>
                  {kp.explanation}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why does middleware run BEFORE the cache is consulted? What does this mean for performance?
            (Middleware can redirect before Next.js even checks if a cached page exists — no wasted cache lookup)</li>
          <li>If the session cookie exists but is expired, where should you validate that?
            (In the route handler / server component — middleware is too early and edge runtime can't do DB lookups)</li>
          <li>Can middleware modify the response body? (Not directly — use a Route Handler for custom responses.
            Middleware can only modify headers, redirect, or rewrite the path.)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Bug Hunt: Find the Middleware Errors
//
// Four broken middleware patterns. Each has a specific,
// subtle bug. Find it before revealing the explanation.
// ─────────────────────────────────────────────────────────────

interface Bug {
  id: number;
  title: string;
  code: string;
  bugDescription: string;
  fix: string;
  fixCode: string;
}

const BUGS: Bug[] = [
  {
    id: 1,
    title: 'Middleware runs on ALL paths including static assets',
    code: `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

// ❌ No matcher config — runs on EVERY request
// including _next/static/*, _next/image/*, favicon.ico`,
    bugDescription: 'Missing matcher config. Without it, middleware runs on static file requests — every CSS file, font, and image goes through auth middleware. This adds latency to ALL assets and can interfere with Next.js internals.',
    fix: 'Add a matcher that excludes Next.js internals.',
    fixCode: `export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};`,
  },
  {
    id: 2,
    title: 'Redirect creates an infinite loop',
    code: `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    // ❌ Redirects to /login — but /login also matches this middleware!
    // /login → no token → redirect to /login → infinite loop
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'], // matches /login too!
};`,
    bugDescription: "The redirect target (/login) also matches the middleware. User with no session hits /login → middleware checks for token → no token → redirect to /login → repeat. This causes a 'too many redirects' browser error.",
    fix: 'Exclude /login (and other public routes) from the auth check.',
    fixCode: `export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value;

  // Only protect /dashboard and /api, not /login
  if (!token && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api')
  )) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}`,
  },
  {
    id: 3,
    title: 'Using Node.js APIs in Edge Runtime',
    code: `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken'; // ❌ Node.js package
import { createClient } from '@supabase/supabase-js'; // ❌ uses fetch, but...

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  if (token) {
    // ❌ jsonwebtoken uses Node.js crypto — not available at edge
    const payload = verify(token, process.env.JWT_SECRET!);

    // ❌ Creating a new Supabase client in middleware
    //   is also problematic — connection overhead per request
    const supabase = createClient(url, key);
  }

  return NextResponse.next();
}`,
    bugDescription: "'jsonwebtoken' uses Node.js's 'crypto' module internally — it throws at runtime in the Edge Runtime. The fix: use the 'jose' library, which uses the Web Crypto API and works in all runtimes (Edge, Node, browsers).",
    fix: "Use 'jose' instead of 'jsonwebtoken' for Edge-compatible JWT operations.",
    fixCode: `import { jwtVerify } from 'jose'; // Edge-compatible JWT

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      // payload is now the decoded JWT — no Node.js needed
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}`,
  },
  {
    id: 4,
    title: 'Modifying response headers incorrectly',
    code: `// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ❌ Mutating response.headers directly
  // This DOES NOT pass the header to the downstream route handler
  response.headers.set('x-user-id', '123');

  // ❌ Also broken: modifying request headers on the response object
  response.headers.set('x-custom', 'value'); // sets on RESPONSE, not request

  return response;
}`,
    bugDescription: "Setting headers on the response object affects what the BROWSER receives, not what the server-side route handler sees. To pass headers to Server Components or Route Handlers, you must pass them in the request via NextResponse.next({ request: { headers } }).",
    fix: 'Pass modified headers via the request option, not on the response.',
    fixCode: `export function middleware(request: NextRequest) {
  // Clone and modify the REQUEST headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', '123');
  requestHeaders.set('x-custom', 'value');

  // Pass modified headers to downstream (Server Components, Route Handlers)
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
  // Now: headers.get('x-user-id') works in Server Components
}`,
  },
];

function Exercise2_BugHunt() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 2: Middleware Bug Hunt</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Each snippet has a specific, subtle bug. Identify the bug before revealing.
        These are all real mistakes made in production Next.js apps.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {BUGS.map(bug => (
          <div key={bug.id} style={{ border: '1px solid #ffccbc', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', background: '#fff3e0', borderBottom: '1px solid #ffccbc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Bug #{bug.id}: {bug.title}</strong>
              {!revealed[bug.id] && (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [bug.id]: true }))}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: 'none', background: '#e67e22', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Find the bug →
                </button>
              )}
            </div>
            <div style={{ padding: '0.75rem 1rem' }}>
              <pre style={{ background: '#1e1e2e', color: '#fc8888', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0' }}>
                {bug.code}
              </pre>
              {revealed[bug.id] && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: '#fff3e0', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#5d4037', lineHeight: 1.6 }}>
                    <strong>🐛 The bug:</strong> {bug.bugDescription}
                  </div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#333' }}><strong>Fix:</strong> {bug.fix}</p>
                  <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.75rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: '0' }}>
                    {bug.fixCode}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Redirect vs Rewrite Decision Tool
//
// redirect: browser URL changes (302)
// rewrite: browser URL stays the same, server serves different content
//
// Six scenarios — choose the right NextResponse method.
// ─────────────────────────────────────────────────────────────

interface MethodScenario {
  id: number;
  scenario: string;
  answer: 'redirect' | 'rewrite' | 'next';
  explanation: string;
  code: string;
}

const METHOD_SCENARIOS: MethodScenario[] = [
  {
    id: 1,
    scenario: 'Unauthenticated user tries to access /dashboard. You want them to go to /login and see the /login URL in their address bar.',
    answer: 'redirect',
    explanation: 'Redirect — the user must see /login in the URL bar (they need to know they\'re on the login page). redirect sends a 302 and the browser navigates to the new URL.',
    code: `return NextResponse.redirect(new URL('/login', request.url));
// Browser: URL bar shows /login`,
  },
  {
    id: 2,
    scenario: 'A/B test: 50% of users accessing /home should see a new version (/home-v2) without knowing about the alternate URL.',
    answer: 'rewrite',
    explanation: 'Rewrite — the browser stays on /home. Next.js internally serves /home-v2 content. The user (and analytics tools reading the URL) see /home — no implementation leak.',
    code: `const bucket = request.cookies.get('ab')?.value ?? 'A';
if (bucket === 'B') {
  const url = request.nextUrl.clone();
  url.pathname = '/home-v2';
  return NextResponse.rewrite(url);
  // Browser: URL stays /home, content is /home-v2
}`,
  },
  {
    id: 3,
    scenario: "User visits /products/old-slug — this product was renamed. The canonical URL is /products/new-slug. You want search engines to update their index.",
    answer: 'redirect',
    explanation: 'Redirect with status 301 (permanent) — this tells search engines to update their index and transfer link equity to the new URL. A 302 would not update SEO indexing.',
    code: `if (pathname === '/products/old-slug') {
  return NextResponse.redirect(
    new URL('/products/new-slug', request.url),
    { status: 301 } // permanent redirect — SEO signals
  );
}`,
  },
  {
    id: 4,
    scenario: "Feature flag: if a user has 'beta' in their cookie, serve /features/new-checkout at /checkout. Other users see the current /checkout as normal.",
    answer: 'rewrite',
    explanation: 'Rewrite — same URL (/checkout) for all users, different content. The beta user doesn\'t see \'new-checkout\' in the URL. This is the cleanest way to roll out features — URL stays stable, backend serves different content.',
    code: `const isBeta = request.cookies.get('beta')?.value === 'true';
if (isBeta) {
  const url = request.nextUrl.clone();
  url.pathname = '/features/new-checkout';
  return NextResponse.rewrite(url);
}
return NextResponse.next();`,
  },
  {
    id: 5,
    scenario: 'Bot detection: request has no User-Agent header. You want to immediately return a 403 without rendering any React at all.',
    answer: 'next',
    explanation: 'Neither redirect nor rewrite — return a direct Response with a 403 status. Middleware can short-circuit and return any Response, not just redirects or rewrites. This is faster than rendering a 403 page.',
    code: `const ua = request.headers.get('user-agent');
if (!ua) {
  return new NextResponse('Forbidden', { status: 403 });
  // No React rendering — response returned directly from middleware
}`,
  },
  {
    id: 6,
    scenario: 'i18n: user visits /about but their Accept-Language header prefers Spanish. You want the URL to change to /es/about.',
    answer: 'redirect',
    explanation: 'Redirect — the URL should change so the user can bookmark the localized version and share it. The canonical localized URL is /es/about, not /about. A rewrite would hide the locale in the URL, breaking bookmarks and sharing.',
    code: `const lang = request.headers.get('accept-language')?.startsWith('es') ? 'es' : 'en';
if (!pathname.startsWith(\`/\${lang}\`)) {
  return NextResponse.redirect(
    new URL(\`/\${lang}\${pathname}\`, request.url)
  );
}`,
  },
];

const METHOD_COLORS: Record<'redirect' | 'rewrite' | 'next', string> = {
  redirect: '#1a73e8',
  rewrite: '#8e44ad',
  next: '#27ae60',
};

function Exercise3_RedirectVsRewrite() {
  const [guesses, setGuesses] = useState<Record<number, { guess: string | null; revealed: boolean }>>(() =>
    Object.fromEntries(METHOD_SCENARIOS.map(s => [s.id, { guess: null, revealed: false }]))
  );

  function guess(id: number, method: string) {
    setGuesses(prev => ({ ...prev, [id]: { ...prev[id], guess: method } }));
  }
  function reveal(id: number) {
    setGuesses(prev => ({ ...prev, [id]: { ...prev[id], revealed: true } }));
  }

  const score = METHOD_SCENARIOS.filter(s => guesses[s.id].revealed && guesses[s.id].guess === s.answer).length;
  const revealedCount = METHOD_SCENARIOS.filter(s => guesses[s.id].revealed).length;

  return (
    <section>
      <h2>Exercise 3: Redirect vs Rewrite — 6 Scenarios</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
        <div style={{ border: `2px solid ${METHOD_COLORS.redirect}`, borderRadius: '8px', padding: '0.75rem' }}>
          <strong style={{ color: METHOD_COLORS.redirect }}>NextResponse.redirect()</strong>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
            Browser URL changes. Sends 302 (or 301). User sees the new URL.
            Use for: auth, canonical URLs, i18n.
          </p>
        </div>
        <div style={{ border: `2px solid ${METHOD_COLORS.rewrite}`, borderRadius: '8px', padding: '0.75rem' }}>
          <strong style={{ color: METHOD_COLORS.rewrite }}>NextResponse.rewrite()</strong>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
            Browser URL unchanged. Server serves different content internally.
            Use for: A/B tests, feature flags, internal routing.
          </p>
        </div>
        <div style={{ border: `2px solid ${METHOD_COLORS.next}`, borderRadius: '8px', padding: '0.75rem' }}>
          <strong style={{ color: METHOD_COLORS.next }}>new NextResponse() / next()</strong>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
            Return a response directly (like 403) or pass through.
            Use for: bot blocking, custom headers, early returns.
          </p>
        </div>
      </div>

      {revealedCount > 0 && (
        <div style={{ margin: '0 0 1rem', padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealedCount}</strong> revealed
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {METHOD_SCENARIOS.map(scenario => {
          const st = guesses[scenario.id];
          const isCorrect = st.guess === scenario.answer;
          return (
            <div key={scenario.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              background: st.revealed ? (isCorrect ? '#f0fff4' : '#fff8f8') : '#fff',
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: st.revealed ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#333', flex: 1, paddingRight: '1rem', lineHeight: 1.6 }}>
                  <strong>#{scenario.id}:</strong> {scenario.scenario}
                </p>
                {st.revealed && (
                  <span style={{ fontSize: '0.8rem', color: isCorrect ? '#27ae60' : '#e55', whiteSpace: 'nowrap' }}>
                    {isCorrect ? '✓ Correct' : `✗ Ans: ${scenario.answer}`}
                  </span>
                )}
              </div>
              <div style={{ padding: '0.75rem 1rem' }}>
                {!st.revealed ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(['redirect', 'rewrite', 'next'] as const).map(method => (
                      <button
                        key={method}
                        onClick={() => guess(scenario.id, method)}
                        style={{
                          padding: '0.35rem 1rem',
                          borderRadius: '6px',
                          border: '2px solid',
                          borderColor: st.guess === method ? METHOD_COLORS[method] : '#ddd',
                          background: st.guess === method ? METHOD_COLORS[method] : '#fff',
                          color: st.guess === method ? '#fff' : '#333',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {method === 'next' ? 'new NextResponse()' : `.${method}()`}
                      </button>
                    ))}
                    {st.guess && (
                      <button
                        onClick={() => reveal(scenario.id)}
                        style={{ padding: '0.35rem 0.9rem', borderRadius: '6px', border: 'none', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', marginLeft: 'auto' }}
                      >
                        Reveal →
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#333', lineHeight: 1.6 }}>
                      {scenario.explanation}
                    </p>
                    <pre style={{ background: '#1e1e2e', color: '#a9dc76', padding: '0.6rem', borderRadius: '6px', fontSize: '0.78rem', overflow: 'auto', lineHeight: 1.6, margin: 0 }}>
                      {scenario.code}
                    </pre>
                  </>
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
// EXERCISE 4 — Edge Runtime Capability Quiz
//
// What can and can't run in the Edge Runtime?
// These distinctions matter when designing middleware and edge routes.
// ─────────────────────────────────────────────────────────────

interface CapabilityItem {
  name: string;
  category: string;
  verdict: 'available' | 'unavailable';
  explanation: string;
}

const CAPABILITIES: CapabilityItem[] = [
  { name: 'fetch() — HTTP requests', category: 'Networking', verdict: 'available', explanation: 'fetch is a Web API — fully available. This is how edge functions call APIs, databases with HTTP drivers (Upstash, PlanetScale HTTP), and external services.' },
  { name: 'Node.js fs module', category: 'File System', verdict: 'unavailable', explanation: 'The Edge Runtime has no filesystem access. No node:fs, no path manipulation, no reading local files. Everything must come through network calls.' },
  { name: 'crypto.randomUUID()', category: 'Web APIs', verdict: 'available', explanation: 'Web Crypto API is available. Use crypto.randomUUID() for IDs, crypto.subtle for encryption. Note: NOT Node.js require("crypto") — that\'s different.' },
  { name: 'PostgreSQL via pg library', category: 'Databases', verdict: 'unavailable', explanation: 'pg (and mysql2, mongodb) use raw TCP connections — not available in the Edge Runtime. Use HTTP-based database clients: Supabase REST, PlanetScale HTTP driver, Neon serverless driver, Upstash Redis.' },
  { name: 'Upstash Redis (HTTP)', category: 'Databases', verdict: 'available', explanation: 'Upstash\'s Redis client uses fetch under the hood — fully edge-compatible. Same for PlanetScale\'s serverless driver and Neon\'s HTTP driver. The key: they use HTTP, not TCP.' },
  { name: 'TextEncoder / TextDecoder', category: 'Web APIs', verdict: 'available', explanation: 'Encoding APIs are Web Standard — available in all modern runtimes including Edge.' },
  { name: 'process.env', category: 'Environment', verdict: 'available', explanation: 'Environment variables are accessible via process.env in the Edge Runtime. But only variables prefixed with NEXT_PUBLIC_ are available on the client — others are server/edge-only.' },
  { name: 'setTimeout with long delays', category: 'Timing', verdict: 'unavailable', explanation: 'Edge functions have strict execution time limits (~25-30s on Vercel). setTimeout works for short delays but long-running work is not suitable for edge functions.' },
  { name: 'WebSocket connections', category: 'Networking', verdict: 'unavailable', explanation: 'WebSockets require persistent connections — incompatible with the edge function request/response model. Use separate WebSocket infrastructure (Ably, Pusher, Liveblocks).' },
  { name: 'JSON.parse / JSON.stringify', category: 'Standard JS', verdict: 'available', explanation: 'Standard JavaScript — works everywhere. No surprises here.' },
];

function Exercise4_EdgeCapabilities() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  const filtered = CAPABILITIES.filter(c =>
    filter === 'all' || c.verdict === filter
  );

  return (
    <section>
      <h2>Exercise 4: Edge Runtime Capability Quiz</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each item, decide: available in Edge Runtime, or not? Click to reveal the truth.
        Understanding these boundaries prevents subtle production bugs.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['all', 'available', 'unavailable'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.35rem 0.9rem', borderRadius: '6px', border: '2px solid',
              borderColor: filter === f ? '#1a73e8' : '#ddd',
              background: filter === f ? '#e8f0fe' : '#fff',
              color: filter === f ? '#1a73e8' : '#333',
              cursor: 'pointer', fontSize: '0.8rem',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : f === 'available' ? '✓ Available' : '✗ Unavailable'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map((item, i) => {
          const idx = CAPABILITIES.indexOf(item);
          const isRevealed = revealed[idx];
          return (
            <div
              key={idx}
              style={{
                border: '1px solid',
                borderColor: isRevealed ? (item.verdict === 'available' ? '#a5d6a7' : '#ffcdd2') : '#ddd',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
              onClick={() => setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }))}
            >
              <div style={{
                padding: '0.6rem 1rem',
                background: isRevealed ? (item.verdict === 'available' ? '#f0fff4' : '#fff5f5') : '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: '#e8e8e8',
                    color: '#555',
                  }}>
                    {item.category}
                  </span>
                  <code style={{ fontSize: '0.85rem' }}>{item.name}</code>
                </div>
                {isRevealed && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: item.verdict === 'available' ? '#27ae60' : '#e55',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    {item.verdict === 'available' ? '✓ Available' : '✗ Unavailable'}
                  </span>
                )}
              </div>
              {isRevealed && (
                <div style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: '#fff', borderTop: '1px solid #eee' }}>
                  {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>The mental model:</strong> Edge Runtime = V8 engine + Web APIs only.
        If an API exists in the browser (fetch, crypto, TextEncoder, URL, Request, Response) — it works at the edge.
        If it requires OS access (fs, net, tcp, child_process) — it doesn't.
        The heuristic: "Does this run in a browser Service Worker?" If yes, it works at the edge.
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Middleware & Edge Runtime</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> Middleware runs in Next.js before routing — it can't be demoed in Vite.
      These exercises develop the precise understanding you need: what middleware can/can't do,
      common bugs, and when to use redirect vs rewrite.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_WriteMiddleware />
      <hr />
      <Exercise2_BugHunt />
      <hr />
      <Exercise3_RedirectVsRewrite />
      <hr />
      <Exercise4_EdgeCapabilities />
    </div>
  </div>
);

export default App;
