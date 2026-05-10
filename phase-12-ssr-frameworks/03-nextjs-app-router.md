# Next.js App Router

## Quick Reference

| File convention | Purpose |
|---|---|
| `page.tsx` | Unique UI for a route — makes the segment publicly accessible |
| `layout.tsx` | Shared UI that wraps `children` — persists across navigations |
| `loading.tsx` | Suspense fallback for the segment — shown while page loads |
| `error.tsx` | Error boundary for the segment — `'use client'` required |
| `not-found.tsx` | Rendered when `notFound()` is called |
| `template.tsx` | Like layout but remounts on every navigation |
| `route.ts` | API endpoint (Route Handler) — no UI |

---

## Why the App Router Exists

The Pages Router (`pages/`) was built before React Server Components and concurrent features existed. It bolted SSR on through `getServerSideProps`, which runs separately from the component and must pass all data as props. The architecture made composition difficult: you couldn't colocate data fetching with the component that used it, shared layouts couldn't fetch their own data, and nested layouts caused multiple waterfall fetches.

The App Router is a ground-up redesign for RSC. Data fetching lives inside the component (`async/await` directly). Layouts are React components that persist across navigations. Streaming is built in via Suspense. Every component is a Server Component by default.

---

## Directory Structure

```
app/
  layout.tsx          ← root layout (required) — wraps entire app
  page.tsx            ← renders at /
  dashboard/
    layout.tsx        ← wraps all /dashboard/* routes
    page.tsx          ← renders at /dashboard
    loading.tsx       ← shown while /dashboard page loads
    error.tsx         ← catches errors in /dashboard subtree
    settings/
      page.tsx        ← renders at /dashboard/settings
  api/
    users/
      route.ts        ← API endpoint at /api/users
```

---

## `layout.tsx`

Layouts wrap their segment's page and all child segments. They **persist across navigations** within their segment — the layout component is not remounted when navigating between children. This is a key performance win: the layout can hold state, and shared UI (sidebars, headers) isn't destroyed and recreated on navigation.

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

Layouts can be async Server Components:

```tsx
export default async function DashboardLayout({ children }) {
  const user = await getCurrentUser(); // runs once, persists while navigating children
  return (
    <div>
      <Sidebar user={user} />
      {children}
    </div>
  );
}
```

---

## `loading.tsx`

Creates an automatic `<Suspense>` boundary around the page. Shown while the page's async Server Component (or any nested suspending component) is loading.

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
```

This is equivalent to wrapping `page.tsx` in `<Suspense fallback={<DashboardSkeleton />}>` — Next.js does it automatically.

---

## `error.tsx`

An Error Boundary for the segment. Must be a Client Component because Error Boundaries are class-based (or use the new `'use client'` hook-based API):

```tsx
// app/dashboard/error.tsx
'use client';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong in the dashboard</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

`reset` re-renders the segment, triggering a re-fetch of its data.

---

## Route Groups

Parenthesized folders are "route groups" — they organize routes without affecting the URL path:

```
app/
  (marketing)/
    layout.tsx   ← marketing-specific layout
    page.tsx     ← renders at /
    about/
      page.tsx   ← renders at /about
  (app)/
    layout.tsx   ← app-specific layout (e.g., authenticated)
    dashboard/
      page.tsx   ← renders at /dashboard
```

`(marketing)` and `(app)` don't appear in URLs. This lets you have different layouts for different sections without nesting routes.

---

## Parallel Routes

Multiple pages rendered simultaneously in the same layout — useful for modals, split-pane UIs, dashboards with independent sections:

```
app/
  @modal/
    (.)photo/[id]/
      page.tsx   ← intercepted photo route (modal)
  photo/
    [id]/
      page.tsx   ← photo detail page (full page)
  layout.tsx     ← receives { children, modal } props
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

---

## Intercepting Routes

Intercept a route to render it differently in one context vs. another (e.g., a photo opens as a modal when clicked from a feed, but renders as a full page when navigated directly):

```
(.)  — same level
(..) — one level up
(...) — root level
```

---

## Dynamic Segments

```
app/
  blog/
    [slug]/
      page.tsx   ← /blog/hello-world → params.slug = 'hello-world'
    [...slug]/
      page.tsx   ← /blog/a/b/c → params.slug = ['a', 'b', 'c']
    [[...slug]]/
      page.tsx   ← optional catch-all, matches /blog too
```

---

## Segment Config Options

Export these from any `page.tsx`, `layout.tsx`, or `route.ts` to control rendering behavior:

```tsx
// Makes the segment dynamic (no caching)
export const dynamic = 'force-dynamic';

// Enables ISR — revalidate every 60 seconds
export const revalidate = 60;

// Generates static params at build time
export async function generateStaticParams() {
  const posts = await fetchAllPosts();
  return posts.map(p => ({ slug: p.slug }));
}
```

---

> **Check yourself:** What's the difference between `layout.tsx` and `template.tsx`? Layout persists across navigations — the component is not remounted. Template remounts on every navigation — state is reset, effects re-run. Use template when you need fresh component state on each navigation (e.g., page-view tracking, animations that should replay).

---

## Self-Assessment

- [ ] I know what each of the seven file conventions does
- [ ] I understand why layouts persist but templates remount
- [ ] I can create a route group and explain how it affects the URL
- [ ] I know when to use parallel routes vs. nested routes
- [ ] I can configure a segment for SSR, SSG, or ISR with the segment config exports

---

## Interview Q&A

**Q: How does the App Router differ from the Pages Router architecturally? `High`**

A: The App Router is built around React Server Components. Data fetching happens inside components via `async/await`, not in separate `getServerSideProps` functions. Layouts are React components that persist across navigations (no remount). Streaming is built in via automatic Suspense boundaries (`loading.tsx`). Every component is a Server Component by default, with opt-in client components via `'use client'`.

---

**Q: Why do layouts persist across navigations and why does that matter? `High`**

A: Layouts don't unmount when navigating between their child routes. The layout component instance, its state, and its DOM nodes are reused. This means a sidebar that's open stays open when you navigate between dashboard pages. It also means a layout's async data fetch (`const user = await getCurrentUser()`) only runs once per layout mount, not on every navigation — a significant performance improvement.

---

**Q: What does `loading.tsx` do and how does it work? `High`**

A: `loading.tsx` creates an automatic `<Suspense>` boundary around the page component. Next.js wraps `page.tsx` in `<Suspense fallback={<Loading />}>`. While the async Server Component fetches data and renders, React shows the loading fallback. Once the page resolves, React streams the real content and replaces the fallback — without a full page reload.

---

**Q: What are route groups and when would you use them? `Medium`**

A: Route groups are directories in parentheses (e.g., `(marketing)`) that organize routes without adding a URL segment. Use them when you need different layouts for different sections of the app (e.g., a marketing layout with a navigation bar vs. an authenticated app layout with a sidebar) without those sections appearing as URL path segments.

---

**Q: What is the difference between `generateStaticParams` and `getStaticPaths`? `Medium`**

A: Both generate static routes for dynamic segments at build time. `getStaticPaths` is Pages Router — it returns `{ paths: [...], fallback }` and runs with `getStaticProps`. `generateStaticParams` is App Router — it returns an array of param objects and works with async Server Components and the `dynamicParams` route config. The App Router version is simpler and colocated with the component.
