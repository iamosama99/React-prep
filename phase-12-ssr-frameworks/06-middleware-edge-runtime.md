# Middleware & Edge Runtime

## Quick Reference

| Concept | Detail |
|---|---|
| Middleware file location | `middleware.ts` at project root (same level as `app/`) |
| When it runs | Before every matched request — before routing, before caching |
| Runtime | Edge runtime only (not Node.js) |
| Can do | Read/modify request headers, redirect, rewrite, return responses |
| Cannot do | Use Node.js APIs, connect to databases directly, import heavy libraries |
| `matcher` config | Controls which paths trigger middleware |

---

## Why Middleware Exists

Every web request has a moment before the framework routes it to a page — that's where middleware lives. You want to authenticate users before they reach the page, redirect them before they see a flash of the wrong content, or run A/B testing logic before React renders anything.

In Next.js, middleware runs at the **edge** — as close to the user as possible geographically, in a lightweight V8 runtime without Node.js APIs. Because it runs before routing and before the cache is consulted, it's the perfect layer for:
- Authentication gates
- Locale/region redirects
- A/B testing (rewrite to different page variants)
- Bot detection
- Request logging before handler

---

## Basic Structure

```typescript
// middleware.ts — at the project root
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse | void {
  const { pathname, searchParams } = request.nextUrl;

  // Redirect unauthenticated users
  const token = request.cookies.get('session')?.value;
  if (!token && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow request to proceed
  return NextResponse.next();
}

// Which paths trigger this middleware
export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

---

## `matcher` Configuration

Without a matcher, middleware runs on every single request — including `_next/static`, `favicon.ico`, image optimization routes. The matcher filters this:

```typescript
export const config = {
  matcher: [
    // Match /dashboard and all sub-paths
    '/dashboard/:path*',

    // Exclude static files and API routes from matching
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',

    // Regex-based matching
    {
      source: '/blog/:slug*',
      has: [{ type: 'header', key: 'x-custom-header' }], // conditional
    },
  ],
};
```

---

## Common Middleware Patterns

### Auth guard

```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get('session-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Optionally: verify token is valid (light check only — no DB)
  // Heavy auth belongs in the route handler/server component
  return NextResponse.next();
}
```

Middleware can check for the existence of an auth cookie but can't verify a JWT signature requiring crypto operations that exceed the edge runtime's limits, and definitely can't query a database. Verification happens in the route itself.

### Locale redirect

```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = detectLocale(request); // from Accept-Language header

  if (!pathname.startsWith(`/${locale}`)) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }
}
```

### A/B testing via rewrite

```typescript
export function middleware(request: NextRequest) {
  const bucket = request.cookies.get('ab-bucket')?.value ?? assignBucket();
  const url = request.nextUrl.clone();

  if (bucket === 'B') {
    url.pathname = url.pathname.replace('/home', '/home-v2');
    const response = NextResponse.rewrite(url);
    response.cookies.set('ab-bucket', 'B');
    return response;
  }

  return NextResponse.next();
}
```

Rewrite changes the URL the server handles without changing the browser URL — users on bucket B see `/home-v2` content at the `/home` URL.

### Modifying request headers

```typescript
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // Pass modified headers to the page/api handler
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
```

Pages/API routes can then read `x-pathname` from the request headers — useful for passing context from middleware without a redirect.

---

## Edge Runtime

The Edge Runtime is a stripped-down JavaScript environment based on V8 (the engine behind Chrome and Node.js), but without Node.js APIs:

**Available:**
- Web APIs: `fetch`, `Request`, `Response`, `Headers`, `URL`
- `crypto` (Web Crypto API)
- `TextEncoder` / `TextDecoder`
- Limited `setTimeout` / `setInterval`

**Not available:**
- `fs`, `path`, `os` — no filesystem
- `net`, `http` — no raw TCP
- Most Node.js built-ins
- Large npm packages that rely on Node.js internals

**Why use it?** Edge functions run in Cloudflare, Vercel Edge Network, etc. — geographically close to users. Cold starts are ~1ms (vs 100ms+ for serverless Node functions). They scale infinitely. For lightweight auth checks and redirects, the latency benefit is real.

### Using Edge Runtime for a Route Handler

```typescript
// app/api/fast-route/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  return Response.json({ hello: 'world' });
}
```

---

## `NextResponse` API

```typescript
// Redirect (302 by default)
NextResponse.redirect(new URL('/login', request.url));
NextResponse.redirect(new URL('/login', request.url), { status: 301 });

// Rewrite — browser URL unchanged, server handles different URL
NextResponse.rewrite(new URL('/home-v2', request.url));

// Continue to the matched route, optionally modifying headers
NextResponse.next({
  request: { headers: modifiedHeaders },
});

// Return a response directly from middleware
return new NextResponse('Forbidden', { status: 403 });
```

---

> **Check yourself:** Can middleware access a database to verify a session token? Generally no — the edge runtime doesn't support database clients that use TCP connections (`pg`, `mysql2`). The exception: HTTP-based databases (PlanetScale's HTTP API, Upstash Redis, Supabase REST API) work in edge contexts because they use `fetch`. For session verification, use a self-contained JWT that can be verified with the Web Crypto API without a database round trip.

---

## Self-Assessment

- [ ] I know where `middleware.ts` lives and when it runs relative to routing and cache
- [ ] I can configure a `matcher` to target specific paths
- [ ] I know what the edge runtime can and cannot do (no Node.js, no TCP databases)
- [ ] I can implement an auth redirect, locale redirect, and A/B test with rewrites
- [ ] I understand the difference between `NextResponse.redirect` and `NextResponse.rewrite`

---

## Interview Q&A

**Q: What is Next.js middleware and when does it run? `High`**

A: Middleware is code in `middleware.ts` that runs on every matched request before routing, before page rendering, and before the cache is consulted. It runs in the Edge Runtime — lightweight V8 without Node.js APIs, deployed close to users. Use it for authentication checks, locale redirects, A/B testing rewrites, and request header injection.

---

**Q: Why can't middleware query a database? `High`**

A: Middleware runs in the Edge Runtime, which uses Web APIs only — no Node.js built-ins, no TCP networking. Most database clients (PostgreSQL, MySQL) use raw TCP connections. The workaround: use HTTP-based database APIs (Upstash Redis, PlanetScale's HTTP driver) or verify session tokens via JWT (self-contained, verifiable with Web Crypto API without a DB round trip). Heavy auth logic belongs in route handlers or server components.

---

**Q: What is the difference between `redirect` and `rewrite` in middleware? `High`**

A: `redirect` sends a 302 (or 301) response — the browser navigates to the new URL, which changes the address bar. `rewrite` tells Next.js to serve a different page internally while keeping the browser URL unchanged. Rewrite is used for A/B testing (serve `/home-v2` at the `/home` URL) or feature flags without exposing implementation details in the URL.

---

**Q: What are the advantages of the Edge Runtime over serverless Node.js functions? `Medium`**

A: Cold start time — edge functions start in ~1ms vs 100ms+ for serverless. Geographic distribution — edge functions run in the region closest to the user. Infinite scaling. The tradeoff: no Node.js APIs, limited memory, no TCP connections. Edge is ideal for lightweight work (auth checks, redirects, header manipulation). Serverless Node is better for anything needing the full Node.js ecosystem.

---

**Q: How does middleware interact with Next.js caching? `Low`**

A: Middleware runs before the cache is consulted. A rewrite in middleware can change which cached response is served. A redirect bypasses caching entirely — the user goes to a new URL. Headers added via `NextResponse.next({ request: { headers } })` are passed to the route handler but don't affect the cache key by default. You can set `Vary` headers or use `revalidateTag` in the handler if cache keying matters.
