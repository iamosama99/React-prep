# Data Fetching in Next.js

## Quick Reference

| Pattern | Where | Caching behavior |
|---|---|---|
| `fetch` with `cache: 'force-cache'` | Server Component | Cached indefinitely (default at build) |
| `fetch` with `cache: 'no-store'` | Server Component | Never cached — fresh on every request |
| `fetch` with `next: { revalidate: N }` | Server Component | ISR — cached, revalidated after N seconds |
| `fetch` with `next: { tags: ['x'] }` | Server Component | Tag-based on-demand revalidation |
| `unstable_noStore()` | Server Component | Opts function out of static rendering |
| Route Segment Config | Page/Layout | Sets default behavior for whole segment |

---

## How the App Router Extends `fetch`

Next.js extends the native Web `fetch` API on the server. It intercepts `fetch` calls made in Server Components and applies its caching layer. The same URL fetched multiple times in one render pass is automatically deduplicated — only one actual HTTP request is made.

This means you can call `fetchUser()` in a layout and `fetchUser()` in a page (for different data shapes) without worrying about double-fetching — Next.js deduplicates by URL + options.

---

## Caching Options

### Cached indefinitely (default for static pages)

```tsx
// This is the same as no cache option — statically cached at build time
const data = await fetch('https://api.example.com/config', {
  cache: 'force-cache',
});
```

At build time, the response is stored. All users get the same cached response until you rebuild or revalidate.

### Never cache — always fresh

```tsx
// Fresh data on every request (SSR behavior)
const data = await fetch('https://api.example.com/user-feed', {
  cache: 'no-store',
});
```

Equivalent to `getServerSideProps` in the Pages Router. Making any `no-store` fetch in a component makes that segment dynamic.

### Time-based revalidation (ISR)

```tsx
// Cached, but stale-while-revalidate after 60 seconds
const products = await fetch('https://api.example.com/products', {
  next: { revalidate: 60 },
});
```

The response is cached. After 60 seconds, the next request triggers background regeneration.

### Tag-based on-demand revalidation

```tsx
// Tag the fetch for targeted invalidation
const posts = await fetch('https://api.example.com/posts', {
  next: { tags: ['posts'] },
});

// In a Server Action or Route Handler:
import { revalidateTag } from 'next/cache';
revalidateTag('posts'); // invalidates all fetches tagged 'posts'
```

On-demand revalidation lets you invalidate cache precisely when content changes — instead of waiting for a time window.

---

## `unstable_noStore()`

A function-level alternative to `cache: 'no-store'` on individual fetches. Call it at the top of any server function to opt the **entire function** out of static rendering:

```tsx
import { unstable_noStore as noStore } from 'next/cache';

async function UserDashboard() {
  noStore(); // this component is always dynamic
  const user = await getCurrentUser(); // doesn't use fetch, uses a db client
  return <Dashboard user={user} />;
}
```

Useful when you're using a database client directly (not `fetch`) and still need to signal dynamic behavior to Next.js.

---

## Route Segment Config

Instead of configuring each `fetch`, you can set defaults at the segment level. Export these from `page.tsx`, `layout.tsx`, or `route.ts`:

```tsx
// Force the entire segment to be dynamic (no caching)
export const dynamic = 'force-dynamic';

// Force the entire segment to be static
export const dynamic = 'force-static';

// Set revalidation interval for all fetches in this segment
export const revalidate = 3600;

// Use Edge runtime instead of Node.js
export const runtime = 'edge';

// Control whether unmatched dynamic params return 404
export const dynamicParams = true; // default: generate on demand
```

`dynamic = 'force-dynamic'` is equivalent to adding `cache: 'no-store'` to every fetch in the segment.

---

## Data Fetching Patterns

### Parallel fetching (avoid waterfall)

```tsx
async function DashboardPage() {
  // ✅ Both start in parallel
  const [user, analytics] = await Promise.all([
    fetchUser(),
    fetchAnalytics(),
  ]);

  return <Dashboard user={user} analytics={analytics} />;
}
```

vs sequential (waterfall):

```tsx
// ❌ analytics doesn't start until user resolves
const user = await fetchUser();
const analytics = await fetchAnalytics();
```

### Streaming parallel with Suspense

```tsx
// ✅ Start both fetches, stream each independently
async function DashboardPage() {
  const userPromise = fetchUser();     // no await
  const analyticsPromise = fetchAnalytics(); // no await

  return (
    <>
      <Suspense fallback={<UserSkeleton />}>
        <UserPanel promise={userPromise} />
      </Suspense>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsPanel promise={analyticsPromise} />
      </Suspense>
    </>
  );
}
```

Both fetches start immediately and stream their UI as they resolve — no waterfall, independent skeletons.

### Colocated data fetching

In the App Router, fetch where you need the data — not in a parent that passes props down:

```tsx
// ✅ Each component fetches its own data
async function ProductPage({ params }) {
  return (
    <div>
      <ProductInfo id={params.id} />   {/* fetches product data */}
      <ReviewList productId={params.id} /> {/* fetches reviews */}
    </div>
  );
}

async function ProductInfo({ id }) {
  const product = await fetchProduct(id);
  return <h1>{product.name}</h1>;
}
```

The same URL fetched multiple times is deduplicated by Next.js automatically.

---

## Fetch Deduplication

Within a single render pass, Next.js deduplicates identical `fetch` calls:

```tsx
// layout.tsx
const user = await fetch('/api/user'); // makes HTTP request

// page.tsx (nested in the same render)
const user = await fetch('/api/user'); // returns cached result — no second request
```

This eliminates the need to prop-drill or use context just to avoid double-fetching. Each component can fetch what it needs; the infrastructure handles deduplication.

---

> **Check yourself:** If a Server Component uses `cache: 'no-store'` for one fetch, does the entire page become dynamic? The component containing that fetch becomes dynamic — it's excluded from static generation. Whether the whole page is dynamic depends on whether the component is in the page's render tree. A deeply nested component with `no-store` makes the entire route segment dynamic.

---

## Self-Assessment

- [ ] I know the four main `fetch` cache options and what each does
- [ ] I understand tag-based revalidation with `next: { tags }` and `revalidateTag()`
- [ ] I can write a parallel fetch with `Promise.all` and explain why it avoids waterfall
- [ ] I know what `unstable_noStore()` does and when to use it over `cache: 'no-store'`
- [ ] I understand fetch deduplication and why it enables colocated data fetching

---

## Interview Q&A

**Q: How does Next.js App Router caching differ from the Pages Router? `High`**

A: The Pages Router caches at the route level via `getStaticProps` + `revalidate`. The App Router caches at the individual `fetch` call level — you control caching per request with `cache` and `next.revalidate` options. Multiple fetches in the same component tree can have different caching strategies. Next.js also deduplicates identical fetches within a render pass automatically.

---

**Q: What is `revalidateTag` and how does it enable on-demand ISR? `High`**

A: You tag a `fetch` with `next: { tags: ['posts'] }`. Later, when content changes (e.g., from a CMS webhook or a Server Action), you call `revalidateTag('posts')`. Next.js invalidates all cached responses with that tag, so the next request fetches fresh data. This is more precise than time-based revalidation — you invalidate exactly when content changes, not on a fixed interval.

---

**Q: How do you avoid waterfall data fetching in the App Router? `High`**

A: Two approaches: (1) `Promise.all([fetch1(), fetch2()])` — both fetches run in parallel, page renders after both resolve; (2) Start both Promises without `await` and pass them to separate child components that each call `use(promise)`, wrapped in independent `<Suspense>` boundaries — both fetch in parallel and stream their UI independently as they resolve. The second approach gives better streaming UX.

---

**Q: What does `dynamic = 'force-dynamic'` in Route Segment Config do? `Medium`**

A: It makes the entire segment (page/layout) opt out of static generation — equivalent to `getServerSideProps` in the Pages Router. Every request runs the component and all its fetches fresh, with no caching. It's useful when you need request-time data (cookies, headers) or when `cache: 'no-store'` is scattered throughout the segment and you want a single authoritative setting.

---

**Q: What is fetch deduplication and why does it matter for component-colocated data fetching? `Medium`**

A: Next.js automatically deduplicates identical `fetch` calls (same URL + options) within a single render pass. If a layout and a page both `fetch('/api/user')`, only one HTTP request is made. This eliminates the need to pass data down via props or context to avoid double-fetching. Components can each fetch exactly the data they need, and the infrastructure ensures efficiency.
