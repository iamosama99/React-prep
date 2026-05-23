# Next.js Pages Router

## Quick Reference

| Function | Runs on | When | Use for |
|---|---|---|---|
| `getServerSideProps` | Server | Every request | SSR — dynamic, personalized data |
| `getStaticProps` | Server | Build time (+ revalidate) | SSG / ISR — content that can be cached |
| `getStaticPaths` | Server | Build time | Required with dynamic SSG routes |
| `getInitialProps` | Server + client | Every navigation | Legacy — avoid |

---

## Why the Pages Router Still Matters

The Pages Router is the pre-RSC Next.js architecture that powers the majority of existing Next.js apps. In 2026, most production Next.js codebases you'll encounter use it — the App Router is roughly 2 years old and migration is non-trivial. Interviewers at companies with existing Next.js apps will expect you to know both.

The Pages Router's key constraint: **data fetching functions run separately from the component tree**. They receive the request context and return props. The component is stateless with respect to the fetch — it just receives what `getServerSideProps` gives it. This is a fundamentally different model from the App Router's async components.

---

## `pages/` Directory Structure

```
pages/
  _app.tsx          ← wraps every page — global providers, CSS
  _document.tsx     ← customizes the HTML shell — fonts, lang attribute
  index.tsx         ← renders at /
  about.tsx         ← renders at /about
  blog/
    index.tsx       ← renders at /blog
    [slug].tsx      ← renders at /blog/:slug
    [...catch].tsx  ← catch-all: /blog/a/b/c
  api/
    users.ts        ← API route at /api/users
```

---

## `getServerSideProps`

Runs on **every request**, server-side. Used when data is user-specific or must be fresh on every page load.

```tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

interface Props {
  user: { name: string; email: string };
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { params, req, res, query, resolvedUrl } = context;

  // Access cookies for auth
  const session = await getSessionFromCookie(req.cookies);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const user = await db.users.findById(session.userId);

  return { props: { user } };
};

export default function ProfilePage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <div>{user.name}</div>;
}
```

**Return shapes:**
```tsx
// Normal: pass props to the component
return { props: { data } };

// Redirect the user
return { redirect: { destination: '/login', permanent: false } };

// Show 404
return { notFound: true };
```

---

## `getStaticProps`

Runs at **build time** (and on re-validation for ISR). Data is embedded in the HTML — no server compute per request.

```tsx
import type { GetStaticProps, InferGetStaticPropsType } from 'next';

interface Props {
  posts: Array<{ id: string; title: string; excerpt: string }>;
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const posts = await fetchPublishedPosts();

  return {
    props: { posts },
    revalidate: 3600, // ISR: regenerate at most once per hour
  };
};

export default function BlogIndex({
  posts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <ul>
      {posts.map(p => <li key={p.id}>{p.title}</li>)}
    </ul>
  );
}
```

Omit `revalidate` for pure SSG — page only regenerates on `next build`.

---

## `getStaticPaths`

Required for **dynamic routes** that use `getStaticProps`. Tells Next.js which paths to pre-render.

```tsx
import type { GetStaticPaths, GetStaticProps } from 'next';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await fetchAllPosts();

  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),

    // false: 404 for unknown paths
    // true: generate on demand (shows fallback component while generating)
    // 'blocking': SSR the first request, then cache (no fallback UI needed)
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await fetchPostBySlug(params!.slug as string);
  if (!post) return { notFound: true };
  return { props: { post }, revalidate: 60 };
};
```

**`fallback` values:**
- `false` — unknown paths return 404
- `true` — unknown paths render the fallback UI client-side while Next.js generates the page in the background
- `'blocking'` — unknown paths are SSR'd on the first request, then cached; no fallback UI needed

---

## `_app.tsx`

Wraps every page. Use it for global providers, global CSS, and layout that applies to all pages:

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import '../styles/globals.css';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
```

`Component` is the current page. `pageProps` are the props returned by `getServerSideProps` or `getStaticProps`.

For per-page layouts:

```tsx
export default function App({ Component, pageProps }: AppProps) {
  const getLayout = (Component as any).getLayout ?? ((page: React.ReactNode) => page);
  return getLayout(<Component {...pageProps} />);
}

// In a page:
DashboardPage.getLayout = (page: React.ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
);
```

---

## `_document.tsx`

Customizes the HTML shell. Runs only on the server. Use for `lang` attribute, fonts, third-party scripts that must be in `<head>`:

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

Don't add `<html>` or `<body>` tags to `_app.tsx` — that belongs in `_document.tsx`.

---

## API Routes

Files in `pages/api/` are serverless functions, not pages:

```tsx
// pages/api/users/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const user = await getUser(id as string);
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(user);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

---

> **Check yourself:** Why is `getInitialProps` considered legacy and what's wrong with it? `getInitialProps` runs on both the server (first request) and the client (subsequent navigations) — it merges SSR and client-side data fetching into one function. This causes the server bundle to be shipped to the client (defeating SSR performance benefits) and makes the function harder to reason about. Use `getServerSideProps` or `getStaticProps` instead.

---

## Self-Assessment

- [ ] I can write `getServerSideProps` with auth, redirects, and 404 handling
- [ ] I know the difference between `getStaticProps` with and without `revalidate`
- [ ] I know the three `fallback` options for `getStaticPaths` and when to use each
- [ ] I understand what `_app.tsx` is for and how to implement per-page layouts
- [ ] I know why `getInitialProps` is avoided in modern Next.js

---

## Interview Q&A

**Q: What is the difference between `getServerSideProps` and `getStaticProps`? `High`**

A: `getServerSideProps` runs on every request at runtime — always fresh data, but every page view costs server compute. `getStaticProps` runs at build time and the result is cached as static HTML on the CDN — near-instant TTFB, but data can be stale. Add `revalidate` to `getStaticProps` for ISR — pages regenerate in the background after the interval.

---

**Q: When do you need `getStaticPaths`? `High`**

A: Whenever you have a dynamic route (e.g., `[slug].tsx`) with `getStaticProps`. Next.js needs to know which values of `slug` to pre-render at build time. `getStaticPaths` provides that list. The `fallback` option controls what happens for paths not in the list: 404, client-side generation, or server-side generation on first request.

---

**Q: What is `_app.tsx` responsible for? `Medium`**

A: `_app.tsx` wraps every page component. It's where you put global providers (React Query, Redux, theme), global CSS imports, and layout wrappers. The `Component` prop is the current page; `pageProps` are the props returned by its data-fetching function. Per-page layouts are typically implemented here by reading a `getLayout` function from the page component.

---

**Q: What does `fallback: true` vs `fallback: 'blocking'` do in `getStaticPaths`? `Medium`**

A: Both generate unknown paths on demand. `fallback: true` renders immediately with a fallback UI (the page component must handle `router.isFallback === true`) while Next.js generates the static page in the background. `fallback: 'blocking'` SSR's the first request and caches the result — no fallback UI needed, but the user waits for the server. Use `'blocking'` when a fallback state would be jarring to users.

---

**Q: Why is `getInitialProps` avoided? `Low`**

A: `getInitialProps` runs on both server and client, which means all the server-side code (db clients, secrets) must also be included in the client bundle. It defeats SSR's purpose of keeping server code server-only. It also opts the entire app out of Next.js's automatic static optimization. `getServerSideProps` and `getStaticProps` are strictly server-only and enable proper static optimization.
