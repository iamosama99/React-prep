# CSR vs SSR vs SSG vs ISR

## Quick Reference

| Mode | HTML generated | When | Best for |
|---|---|---|---|
| CSR | In browser | Every request (client) | Authenticated dashboards, apps behind login |
| SSR | On server | Every request (server) | Dynamic, personalized, SEO-critical pages |
| SSG | At build time | Once | Marketing sites, docs, blogs (rarely changing) |
| ISR | At build + on-demand | First request after expiry | High-traffic content that changes occasionally |

---

## Why These Modes Exist

The web started with SSR — servers generated HTML for every request. Then SPAs made CSR the default — servers sent a blank HTML shell and JS did everything. CSR solved interactivity but broke SEO and initial load performance. The industry course-corrected, but not by going back to pure SSR — instead, frameworks added SSG and ISR to give you options for different data characteristics.

The right rendering mode depends on two axes:
1. **How often does the content change?** (real-time vs. rarely)
2. **Is it personalized?** (same for everyone vs. user-specific)

---

## CSR — Client-Side Rendering

The server sends a nearly empty HTML file + JavaScript. The browser downloads JS, runs it, and React renders the UI.

```html
<!-- What the server sends -->
<html>
  <body>
    <div id="root"></div>
    <script src="/bundle.js"></script>
  </body>
</html>
```

**When to use:**
- Authenticated apps where SEO doesn't matter (user dashboards, admin panels, SaaS apps behind login)
- Highly interactive UIs where server round trips add latency
- Apps where data is user-specific and can't be cached

**Problems:**
- Bad SEO — crawlers see an empty page before JS executes
- Slow Time to First Contentful Paint (FCP) — user sees blank page until JS loads and runs
- Vulnerable to JS bundle size: every KB delays first render

---

## SSR — Server-Side Rendering

The server runs React on every request, generates full HTML, sends it to the browser. The browser displays the HTML immediately, then hydrates.

```tsx
// Next.js Pages Router
export async function getServerSideProps(context) {
  const data = await fetchData(context.params.id);
  return { props: { data } };
}

// Next.js App Router — async Server Component is SSR by default
export default async function Page({ params }: Props) {
  const data = await fetchData(params.id);
  return <PageContent data={data} />;
}
```

**When to use:**
- Personalized pages that can't be cached (user-specific content, auth-dependent UI)
- SEO-critical pages with real-time data (news, prices, inventory)
- Pages that need request-level data (cookies, headers, IP geolocation)

**Problems:**
- Every request hits the server — high load, latency tied to server response time
- More expensive to host than static files
- Hydration cost — client still downloads and parses all the React JS

---

## SSG — Static Site Generation

React runs **at build time**. The output is static HTML files deployed to a CDN. No server needed per request.

```tsx
// Next.js Pages Router
export async function getStaticProps() {
  const posts = await fetchAllPosts();
  return { props: { posts } };
}

export async function getStaticPaths() {
  const posts = await fetchAllPosts();
  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: false, // 404 for unknown paths
  };
}
```

**When to use:**
- Marketing pages, landing pages (rarely change)
- Documentation (generated from source files)
- Blog posts (update on deploy)
- Product catalog that changes on a fixed schedule

**Problems:**
- Stale content — site must be rebuilt and redeployed to show changes
- Large sites take long to build — 100k pages × 100ms = 2.8 hours
- Not suitable for user-specific or real-time content

---

## ISR — Incremental Static Regeneration

SSG extended with automatic background regeneration. Pages are generated statically at build time, but also **regenerated on-demand** after a time interval. Stale content is served while the new version is generated in the background (stale-while-revalidate).

```tsx
// Next.js Pages Router
export async function getStaticProps() {
  const product = await fetchProduct();
  return {
    props: { product },
    revalidate: 60, // regenerate page after 60 seconds
  };
}

// Next.js App Router — fetch with revalidation
async function ProductPage({ params }) {
  const product = await fetch(`/api/products/${params.id}`, {
    next: { revalidate: 60 },
  }).then(r => r.json());
  return <Product data={product} />;
}
```

**When to use:**
- Large sites where full rebuilds are too slow
- Content that changes occasionally but not in real-time (product pages, blog posts with view counts)
- High-traffic pages where you want CDN caching but can tolerate slightly stale data

**Behavior:** First request after the revalidation window serves the stale page **and** triggers background regeneration. The next request gets the fresh page.

---

## Comparison Table

| | CSR | SSR | SSG | ISR |
|---|---|---|---|---|
| TTFB | Instant (empty shell) | Server latency | Near-instant (CDN) | Near-instant (CDN) |
| FCP | Slow (JS must run) | Fast | Fast | Fast |
| SEO | Poor | Excellent | Excellent | Excellent |
| Data freshness | Always fresh | Always fresh | Stale until rebuild | Fresh within revalidation window |
| Server load | Low (CDN serves) | High | None | Low |
| Personalization | Yes | Yes | No | No |
| Cost | Low | High | Lowest | Low |

---

> **Check yourself:** A product page shows price and inventory. The price changes a few times a day; inventory can change any second. Which rendering mode? ISR for price (revalidate: 3600 handles "a few times a day"). For real-time inventory you have two options: SSR the whole page, or use ISR for the static content and CSR (client-side fetch) just for inventory. Hybrid approaches are valid.

---

## Self-Assessment

- [ ] I can explain the difference between when HTML is generated in each mode
- [ ] I know when to choose SSR vs SSG vs ISR based on content characteristics
- [ ] I understand the TTFB vs data freshness tradeoff for each mode
- [ ] I can describe what `revalidate` does in ISR (stale-while-revalidate)
- [ ] I know why CSR has poor SEO and when that's acceptable

---

## Interview Q&A

**Q: What is the difference between SSR and SSG? `High`**

A: SSR generates HTML on the server for every request — the data is always fresh but every request costs server compute. SSG generates HTML once at build time — the HTML is served from a CDN (nearly instant TTFB) but content is stale until the next build. SSR is for dynamic/personalized content; SSG is for content that rarely changes and is the same for every user.

---

**Q: What is ISR and what problem does it solve? `High`**

A: ISR (Incremental Static Regeneration) adds time-based background regeneration to static pages. After a `revalidate` interval, the next request serves the cached (stale) page while triggering a background regeneration. The request after that gets the fresh page. ISR solves the staleness problem of SSG without the per-request server cost of SSR — ideal for content that changes occasionally.

---

**Q: When would you choose CSR over SSR? `High`**

A: For content that is user-specific and behind authentication — dashboards, admin panels, user account pages. These pages can't be cached (different per user) and don't need to be indexed by crawlers. The JS bundle cost of CSR is acceptable because users have already loaded it on login.

---

**Q: What is the "stale-while-revalidate" pattern in ISR? `Medium`**

A: When the revalidation window expires, the next request receives the existing cached (stale) page immediately — no delay — while React simultaneously regenerates the page in the background. The following request receives the fresh version. Users always get a fast response; they may occasionally see content that's one revalidation window old.

---

**Q: How does SSG handle pages not known at build time? `Low`**

A: With `fallback: true` or `fallback: 'blocking'` in `getStaticPaths`. `fallback: true` serves a loading state client-side while generating the page. `fallback: 'blocking'` SSR's the page on first request, then caches it. `fallback: false` returns a 404 for unknown paths. In the App Router, this is controlled by `dynamicParams = true/false` on the route segment.
