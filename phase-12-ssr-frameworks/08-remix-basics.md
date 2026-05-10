# Remix Basics

## Quick Reference

| Concept | Remix equivalent |
|---|---|
| Data loading | `loader` function (server-only) |
| Form mutations | `action` function (server-only) |
| Read loader data | `useLoaderData()` |
| Read action result | `useActionData()` |
| Pending state | `useNavigation()` |
| Form component | `<Form>` — progressive enhancement built in |
| Nested routes | Each segment has its own loader + UI + `<Outlet>` |

---

## Why Remix Exists

Remix was built around a single core philosophy: **the web platform is good, use it**. Most of what React apps do with complex client-side state management, optimistic updates, loading states, and error handling is work that the browser already knows how to do — if you use HTML forms and server responses correctly.

Remix's bet is that if you structure your app around the request/response cycle (loaders for GET, actions for POST) and use proper HTML forms, you get:
- Progressive enhancement for free (works without JS)
- Automatic pending UI (the browser handles form state)
- Automatic revalidation after mutations (no cache invalidation bugs)
- Simple mental model (no client-side cache)

The comparison to Next.js: Next.js gives you CSR, SSR, SSG, and ISR with granular control. Remix is primarily SSR — you can't opt into static generation as a first-class feature. The payoff is a dramatically simpler data model.

---

## Loaders

A `loader` is a server-side function that runs before the route renders. It's the only way to load data in Remix.

```tsx
// app/routes/dashboard.tsx
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { requireUser } from '~/lib/auth.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser(request); // throws redirect if not authenticated
  const stats = await getDashboardStats(user.id);

  return json({ user, stats });
}

export default function Dashboard() {
  const { user, stats } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <Stats data={stats} />
    </div>
  );
}
```

The `loader` has full access to the `Request` object — cookies, headers, URL params. It never runs in the browser. Remix calls it on every navigation to this route.

---

## Actions

An `action` handles form submissions (POST, PUT, PATCH, DELETE). It's the server-side mutation handler.

```tsx
// app/routes/profile.edit.tsx
import { json, redirect } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import type { ActionFunctionArgs } from '@remix-run/node';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;

  if (!name || name.length < 2) {
    return json({ error: 'Name must be at least 2 characters' }, { status: 400 });
  }

  await updateUserName(name);
  return redirect('/profile'); // POST → redirect → GET
}

export default function EditProfile() {
  const actionData = useActionData<typeof action>();

  return (
    <Form method="post">
      <input name="name" />
      {actionData?.error && <p className="error">{actionData.error}</p>}
      <button type="submit">Save</button>
    </Form>
  );
}
```

After a successful action, Remix automatically revalidates all loaders on the page — no manual cache invalidation.

---

## `<Form>` — Progressive Enhancement

Remix's `<Form>` component is a thin wrapper over a native HTML form. With JavaScript:
- Intercepts the submit, makes a `fetch` to the action
- Shows pending state via `useNavigation()`
- Handles redirect and revalidation

Without JavaScript:
- Falls back to standard browser form submission
- Full page reload, server handles it identically

```tsx
<Form method="post" action="/comments">
  <textarea name="content" />
  <button type="submit">Post</button>
</Form>
```

This is progressive enhancement built into the framework, not bolted on.

---

## `useNavigation()`

Tracks the current navigation state — including pending form submissions:

```tsx
import { useNavigation } from '@remix-run/react';

function SubmitButton() {
  const navigation = useNavigation();
  const isPending = navigation.state !== 'idle';

  return (
    <button type="submit" disabled={isPending}>
      {isPending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

`navigation.state`:
- `'idle'` — no navigation in progress
- `'loading'` — navigating to a new route (loader running)
- `'submitting'` — form submission (action running)

---

## Nested Routes and Layouts

Remix nested routing is fundamentally tied to data loading. Each route segment has its own `loader` and its own UI. Parent routes use `<Outlet>` to render children.

```
app/
  routes/
    _layout.tsx              ← wraps all children, has own loader
    _layout.dashboard.tsx    ← /dashboard, has own loader
    _layout.dashboard.users.tsx ← /dashboard/users, has own loader
```

```tsx
// _layout.tsx — root layout
export async function loader() {
  const user = await getCurrentUser();
  return json({ user });
}

export default function Layout() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div>
      <Nav user={user} />
      <Outlet /> {/* renders nested route */}
    </div>
  );
}
```

```tsx
// _layout.dashboard.tsx
export async function loader() {
  const stats = await getDashboardStats();
  return json({ stats });
}

export default function Dashboard() {
  const { stats } = useLoaderData<typeof loader>();
  return (
    <div>
      <Stats data={stats} />
      <Outlet />
    </div>
  );
}
```

All loaders at every level of the route hierarchy **run in parallel** before any component renders. No waterfall — this is Remix's solution to the data waterfall problem.

---

## Error Handling

Each route can export an `ErrorBoundary` component that catches both loader/action errors and render errors for that segment:

```tsx
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <h1>{error.status}: {error.statusText}</h1>;
  }

  return <h1>Unexpected error</h1>;
}
```

---

## Remix vs Next.js: When to Use Which

| | Remix | Next.js App Router |
|---|---|---|
| Data model | Request/response, loaders/actions | React Server Components, Server Actions |
| Static generation | Limited (via Vite build) | First-class (SSG, ISR) |
| Edge deployment | Yes (multiple adapters) | Yes (Vercel Edge) |
| Progressive enhancement | First-class | Via `<form action={serverAction}>` |
| Complexity | Simpler mental model | More rendering mode choices |
| Best for | Content that changes per-request, mutations-heavy apps | Apps needing SSG, ISR, or RSC benefits |

---

> **Check yourself:** After a Remix action redirects to a new route, what happens to the loaders? Remix automatically revalidates all loaders on the page. You don't need to manually invalidate a cache or call a refetch function. The POST → redirect → GET pattern ensures the page always shows fresh data after a mutation, by design.

---

## Self-Assessment

- [ ] I can write a `loader` with auth, data fetching, and type-safe `useLoaderData`
- [ ] I can write an `action` that validates input, returns an error, or redirects
- [ ] I understand how `<Form>` provides progressive enhancement
- [ ] I know how `useNavigation()` gives pending state for form submissions
- [ ] I can explain how nested routes run loaders in parallel (no waterfall)

---

## Interview Q&A

**Q: What is Remix's core mental model for data flow? `High`**

A: Remix maps to the HTTP request/response cycle. `loader` functions handle GETs — they run on the server before the route renders and return data via `json()`. `action` functions handle POSTs — they process form submissions, then redirect. After an action, Remix automatically revalidates all loaders. This is the POST → redirect → GET pattern baked into the framework.

---

**Q: How does Remix prevent data waterfalls? `High`**

A: All loaders at every level of the route hierarchy (parent layout, child route) run in parallel on every navigation. When you navigate to `/dashboard/users`, Remix calls the root layout loader, the dashboard loader, and the users loader simultaneously. React renders after all resolve. No component waits for its parent to fetch before it can start its own fetch.

---

**Q: What makes Remix's `<Form>` different from a plain HTML form? `High`**

A: With JavaScript, `<Form>` intercepts the submit, makes a `fetch` request to the route's `action`, handles redirects, and revalidates loaders — without a full page reload. Without JavaScript, it falls back to native form submission — the server handles it identically and returns a redirect. The same action function works in both cases. This is progressive enhancement without extra code.

---

**Q: How does Remix handle error boundaries differently from React's default? `Medium`**

A: Each route can export an `ErrorBoundary` component that catches errors from that route's loader, action, and component render. The error is contained to that route segment — parent routes stay rendered and functional. `isRouteErrorResponse()` distinguishes HTTP errors (thrown `Response` objects with status codes) from unexpected JavaScript errors.

---

**Q: How does Remix's automatic revalidation compare to cache invalidation in React Query? `Medium`**

A: Remix revalidates all loaders after every action automatically — you don't choose what to invalidate. This is simpler but less granular: even unrelated loaders revalidate. React Query requires explicit cache invalidation (`invalidateQueries`) — more control but more opportunity to miss an invalidation. Remix's approach makes it nearly impossible to show stale data after a mutation; the cost is potentially extra server fetches.
