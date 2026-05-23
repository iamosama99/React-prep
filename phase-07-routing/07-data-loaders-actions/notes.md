# Data Loaders & Actions (v6.4+)

## Quick Reference

| Concept | API | Purpose |
|---|---|---|
| Route data loading | `loader: ({ params, request }) => data` | Fetch before render, no waterfall |
| Read loader data | `useLoaderData()` | Access loader's return value in component |
| Form submission | `action: ({ params, request }) => result` | Handle mutation, return redirect or data |
| Read action result | `useActionData()` | Access action's return value after submit |
| Redirect from server | `return redirect('/path')` | Navigation from loader/action |
| Error in route | `errorElement: <ErrorPage />` | Renders when loader/action throws |
| Background fetches | `useFetcher()` | Mutations + loads without navigation |
| Deferred data | `defer({ fast, slow: slowPromise })` + `<Await>` | Stream slow data while fast renders |

---

## What Is This?

React Router v6.4 introduced a data layer inspired by Remix — loaders and actions. Loaders fetch data before a route renders. Actions handle form submissions and mutations. Together they eliminate the pattern of useEffect-based data fetching triggered by component mount, replacing it with route-level data orchestration.

This isn't just a style change. The router runs loaders in parallel for all matched routes before rendering any of them, eliminating the waterfall where a parent component renders, mounts, fires an effect to load data, then the child renders and fires its own effect.

---

## Why Does It Exist?

The standard React data fetching pattern is:
1. Route renders
2. Component mounts
3. `useEffect` fires
4. Fetch happens
5. State updates
6. Component re-renders with data

This has three problems. First, the user sees a loading state on every navigation — the component must render (at least a skeleton) before data can be requested. Second, waterfall: parent loads → renders children → children load → render grandchildren. Third, the data fetching code is scattered across component bodies, making it hard to coordinate parallel requests.

Loaders solve all three: they run before the component renders, they run in parallel for all matched routes, and they live in the route config — colocated with the route definition, not scattered in component bodies.

---

## How It Works

### Setup

Data loaders require `createBrowserRouter` — they're not available with `<BrowserRouter>`:

```jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'users',
        element: <UserList />,
        loader: usersLoader,
      },
      {
        path: 'users/:id',
        element: <UserDetail />,
        loader: userLoader,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### Loaders

A loader is an async function that receives `{ params, request }` and returns data. The router awaits it before rendering the route's element.

```jsx
async function usersLoader() {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Response('Failed', { status: 500 });
  return response.json();
}

async function userLoader({ params }) {
  const user = await fetchUser(params.id);
  if (!user) throw new Response('Not Found', { status: 404 });
  return user;
}
```

The component reads loader data with `useLoaderData()`:

```jsx
function UserList() {
  const users = useLoaderData();
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

function UserDetail() {
  const user = useLoaderData();
  return <h1>{user.name}</h1>;
}
```

No `useState`, no `useEffect`, no loading states — the data is there when the component renders.

> **Check yourself:** When the user navigates from `/users` to `/users/42`, what happens before either component renders?

### Parallel loading

When navigating to `/users/42`, the router runs all loaders for all matched routes simultaneously: the root layout's loader, the users section's loader, and the user detail's loader all fire at the same time. The page renders when all of them resolve. This is fundamentally different from the useEffect pattern where each level loads after its parent renders.

### Actions

An action handles form submissions and mutations. It receives `{ params, request }` where `request` is the raw `Request` object containing the form data.

```jsx
async function createUserAction({ request }) {
  const formData = await request.formData();
  const name = formData.get('name');
  const email = formData.get('email');

  const errors = validateUser({ name, email });
  if (errors) return errors;  // return validation errors — component reads with useActionData()

  await createUser({ name, email });
  return redirect('/users');  // redirect on success
}

const router = createBrowserRouter([
  {
    path: 'users/new',
    element: <NewUser />,
    action: createUserAction,
  },
]);
```

### The `<Form>` component

React Router's `<Form>` (capital F) submits to the route's action instead of the server:

```jsx
import { Form, useActionData } from 'react-router-dom';

function NewUser() {
  const errors = useActionData();  // set when action returns without redirecting

  return (
    <Form method="post">
      <input name="name" />
      {errors?.name && <span>{errors.name}</span>}
      <input name="email" />
      {errors?.email && <span>{errors.email}</span>}
      <button type="submit">Create</button>
    </Form>
  );
}
```

When the form submits, the action runs, then:
- If it returns `redirect('/users')`, the router navigates
- If it returns validation errors, `useActionData()` returns them and the page re-renders

After an action completes, the router re-runs all active loaders to refresh the data — automatic revalidation.

### Error handling

When a loader or action throws, the nearest `errorElement` renders instead of the route's normal element:

```jsx
{
  path: 'users/:id',
  element: <UserDetail />,
  loader: userLoader,
  errorElement: <UserError />,
}

function UserError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <h2>User not found</h2>;
  }
  return <h2>Something went wrong</h2>;
}
```

`useRouteError()` gives you the thrown value. `isRouteErrorResponse(error)` returns true when the thrown value is a `Response` object (the pattern `throw new Response('msg', { status: 404 })`).

### redirect

`redirect` creates a `Response` with a `Location` header — the router intercepts it:

```jsx
import { redirect } from 'react-router-dom';

// In a loader
loader: async () => {
  const user = await getUser();
  if (!user) return redirect('/login');
  return user;
};
```

This is more explicit than throwing — it returns a redirect rather than an error.

> **Check yourself:** What is the difference between returning `redirect('/login')` and throwing `redirect('/login')` from a loader?

### useFetcher

`useFetcher` lets you submit forms or call loaders without navigating — background mutations and loads:

```jsx
function LikeButton({ postId }) {
  const fetcher = useFetcher();
  const isLiking = fetcher.state !== 'idle';

  return (
    <fetcher.Form method="post" action={`/posts/${postId}/like`}>
      <button type="submit" disabled={isLiking}>
        {isLiking ? 'Liking...' : 'Like'}
      </button>
    </fetcher.Form>
  );
}
```

`fetcher.state` is `"idle" | "loading" | "submitting"`. After submission, the router revalidates relevant loaders automatically.

### Deferred data

For slow data that shouldn't block the page render, use `defer`:

```jsx
import { defer, Await } from 'react-router-dom';
import { Suspense } from 'react';

async function dashboardLoader() {
  return defer({
    fastData: await getFastData(),          // awaited — blocks navigation
    slowData: getSlowData(),                // not awaited — streamed after render
  });
}

function Dashboard() {
  const { fastData, slowData } = useLoaderData();

  return (
    <div>
      <FastSection data={fastData} />
      <Suspense fallback={<Spinner />}>
        <Await resolve={slowData}>
          {(data) => <SlowSection data={data} />}
        </Await>
      </Suspense>
    </div>
  );
}
```

`defer` lets you send the page immediately with some data while the slow parts stream in. `<Await>` handles the pending and error states for the deferred value.

---

## Gotchas

**Data routers only — not `<BrowserRouter>`.** Loaders, actions, `errorElement`, and `defer` require `createBrowserRouter`. If your app uses `<BrowserRouter>`, none of this works.

**After an action, all loaders revalidate by default.** This is usually the right behavior (mutations invalidate data) but can cause excessive refetching. Use `shouldRevalidate` on routes to opt out.

**`useLoaderData()` always has data when the component renders.** The loader runs first. No null-check needed — if the loader can return null/undefined, that's what you get, but the component won't render before the loader resolves.

**Form submissions without `<Form>` don't trigger actions.** Only React Router's `<Form>` or `useFetcher().Form` triggers route actions. Native HTML `<form>` submits to the server URL. `fetch()` in a handler doesn't trigger an action either — if you want manual submission, use `fetcher.submit()`.

**Throwing vs returning in loaders/actions matters.** Returning `redirect()` is a normal response — the router follows it. Throwing `redirect()` also works but treats it as an exceptional case. Throwing an error triggers `errorElement`. Throwing a Response with a 4xx/5xx status triggers `errorElement` with `isRouteErrorResponse` true.

---

## Interview Questions

**Q (High): What problem do loaders solve that `useEffect`-based data fetching doesn't?**

Answer: Three problems. First, waterfall: with useEffect, data fetching is triggered by component mount. Parent renders → mounts → fetches → re-renders with data → child renders → mounts → fetches. Every level adds a round trip. Loaders run in parallel for all matched routes simultaneously before any component renders. Second, loading states: with useEffect you must handle loading UI in every component; with loaders the data is present when the component mounts — no loading state needed. Third, data co-location: fetch logic is scattered across component bodies; loaders sit in the route config alongside the route definition, making it obvious what data a route needs.

The trap: "You can just use React Query." You can, and it's a valid choice. But the point is the architecture difference — loader-based fetching is parallel and declarative; effect-based fetching is sequential and imperative by default.

---

**Q (High): What is the purpose of `errorElement` in a route definition?**

Answer: `errorElement` renders when the route's `loader` or `action` throws (or when any component in the route throws during render). It replaces the route's normal element with an error UI. The error component calls `useRouteError()` to access the thrown value — if it's a `Response`, `isRouteErrorResponse()` returns true and you can check `error.status` to show different UI for 404, 401, 500, etc. Error boundaries propagate: if a child route's loader throws, and the child has no `errorElement`, the nearest ancestor `errorElement` renders. This lets you have a single root-level error page for uncaught errors while individual routes handle their own specific error cases.

---

**Q (High): When would you use `useFetcher` instead of `<Form>`?**

Answer: `useFetcher` is for mutations or data loads that shouldn't trigger a navigation. The canonical cases: liking a post (no page change), deleting an item in a list (page stays), auto-saving a draft, type-ahead search (load results without navigating). `<Form>` is for navigational submissions — submit a new order and go to the confirmation page, submit login and go to dashboard. `useFetcher` also gives you `fetcher.state` for pending UI and `fetcher.data` for the action result without causing a page transition. After a fetcher submission, the router still revalidates loaders, so the page data updates automatically.

---

**Q (Medium): What is `defer` and when would you use it?**

Answer: `defer` lets you return a mix of resolved and unresolved data from a loader. Awaited values block the navigation (the route won't render until they resolve). Unawaited Promises are deferred — they're passed to the component as Promises, and `<Await>` in the component renders their pending/error/resolved states via `<Suspense>`. Use `defer` when part of a page's data loads quickly (render it immediately) but another part is slow (let it stream in). Example: a dashboard where the user's name loads in 100ms but their analytics loads in 2 seconds — defer the analytics, await the name.

---

**Q (Medium): What happens after an action completes?**

Answer: The router automatically revalidates all active loaders — it re-runs every loader for every currently rendered route. This refreshes the page data to reflect the mutation. You don't need to manually invalidate or refetch. If you want to skip revalidation for a specific route after certain actions, add a `shouldRevalidate` function to that route returning false. The revalidation happens before the next render, so the user sees updated data immediately after the action completes.

---

**Q (Low): What is the difference between returning and throwing `redirect()` in a loader?**

Answer: Both navigate the user, but the intent is different. Returning `redirect()` is the expected path — for example, an auth check that sends unauthenticated users to login. Throwing `redirect()` treats the redirect as an exceptional/error condition — it propagates through the error handling pipeline. In practice both work the same way in most cases, but throwing can trigger error logging in some setups. The React Router docs recommend returning `redirect()` for expected redirects and throwing for unexpected error conditions (throw `new Response('Not found', { status: 404 })` rather than `throw redirect()`).

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write a route with a `loader` and a component that reads the data with `useLoaderData()`
- [ ] Can write a route `action` that handles a form submission, validates, and returns either errors or a redirect
- [ ] Can explain why loaders eliminate data fetch waterfalls vs. `useEffect`
- [ ] Can explain when to use `useFetcher` vs `<Form>` (navigational vs background)
- [ ] Can explain what `errorElement` renders for and how to inspect the error type with `useRouteError()`
- [ ] Can explain the `defer` + `<Await>` pattern and when to use it

---
*Next: URL State vs Component State — the decision framework for when a value belongs in the URL vs. React state.*
