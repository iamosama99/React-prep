# Dynamic Routes & Params

## Quick Reference

| Need | API | Example |
|---|---|---|
| URL segment as variable | `:paramName` in path | `path="/users/:id"` |
| Read URL params | `useParams()` | `const { id } = useParams()` |
| Read/write query string | `useSearchParams()` | `const [params, setParams] = useSearchParams()` |
| Wildcard / catch-all | `*` in path | `path="/files/*"` |
| Optional segment | Route-level workaround | Two sibling routes: one with, one without |

---

## What Is This?

Dynamic routes are routes where part of the URL is a variable — a placeholder that matches any value and makes that value available to your component. Instead of defining separate routes for `/users/1`, `/users/2`, `/users/42`, you define `/users/:id` once and let the `:id` parameter carry whatever the URL contains.

This is the mechanism behind virtually every detail page, profile page, and item editor in any SPA.

```jsx
<Route path="/users/:id" element={<UserDetail />} />

function UserDetail() {
  const { id } = useParams();
  // id === "42" when URL is /users/42
}
```

---

## Why Does It Exist?

URLs are the primary addressable unit of the web. A blog post, a user profile, a product — each one needs a stable URL that can be bookmarked, shared, and deep-linked. Hardcoding a route per entity is obviously impossible. Dynamic segments let the route describe a *pattern* (users/:id) rather than a specific URL, collapsing an unbounded set of URLs into a single route definition.

Query strings (search params) handle a different shape of variability: filter values, pagination, sort order, search terms. These are optional, can appear in any combination, and typically don't imply a navigation hierarchy — they're more like function arguments than URL segments.

---

## How It Works

### URL params with `useParams`

The `:paramName` syntax in a route's path creates a named capture. `useParams()` returns an object of all captured values for the current route and its ancestors.

```jsx
<Route path="/orgs/:orgId/repos/:repoId" element={<RepoDetail />} />

function RepoDetail() {
  const { orgId, repoId } = useParams();
  return <h1>{orgId} / {repoId}</h1>;
}
```

If the current URL is `/orgs/facebook/repos/react`, `orgId === "facebook"` and `repoId === "react"`.

Everything `useParams` returns is a string. If you need a number, parse it: `const id = Number(useParams().id)`. Invalid IDs (NaN) should be handled explicitly.

### Query strings with `useSearchParams`

Query strings are everything after the `?`: `/users?page=2&sort=name`. They're not part of the route path — any route can have any query string. `useSearchParams()` works like `useState` but backed by the URL:

```jsx
function UserList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1');
  const sort = searchParams.get('sort') ?? 'name';

  function nextPage() {
    setSearchParams({ page: page + 1, sort });
  }

  return (
    <div>
      <button onClick={nextPage}>Next</button>
      {/* render users */}
    </div>
  );
}
```

`setSearchParams` replaces the entire query string. To update a single param while preserving others:

```jsx
function updateSort(newSort) {
  setSearchParams(prev => {
    prev.set('sort', newSort);
    return prev;
  });
}
```

The functional form receives the current `URLSearchParams` object, which you mutate and return.

> **Check yourself:** If you call `setSearchParams({ page: 2 })` and the current URL has `?page=1&sort=name&filter=active`, what does the new URL look like?

### Multiple params

Params accumulate from the entire matched route tree. A child route has access to params from its parent routes too:

```jsx
<Route path="/projects/:projectId" element={<ProjectLayout />}>
  <Route path="tasks/:taskId" element={<TaskDetail />} />
</Route>

function TaskDetail() {
  const { projectId, taskId } = useParams(); // both available
}
```

### Wildcard / splat routes

`*` at the end of a path matches anything. The captured value is available as `params['*']`:

```jsx
<Route path="/files/*" element={<FileExplorer />} />

function FileExplorer() {
  const params = useParams();
  const filePath = params['*']; // "docs/readme.md" for /files/docs/readme.md
}
```

Wildcards are also used for 404 pages:

```jsx
<Route path="*" element={<NotFound />} />
```

This catches any URL that didn't match anything else. Put it last in your route list (though in v6 the algorithm would pick more specific routes anyway).

### Reading params without hooks (loaders)

In the data router setup, `loader` functions receive params directly — you don't need hooks:

```jsx
{
  path: '/users/:id',
  element: <UserDetail />,
  loader: ({ params }) => fetchUser(params.id),
}
```

The component then calls `useLoaderData()` rather than `useParams()` + a fetch in an effect.

> **Check yourself:** `useParams()` returns all params as strings. What do you need to do before using a param as a number in a database query?

---

## useLocation

`useLocation()` returns the full location object: `{ pathname, search, hash, state, key }`. Useful when you need the raw query string or the full path:

```jsx
function MyComponent() {
  const location = useLocation();
  console.log(location.search); // "?page=2&sort=name"
  console.log(location.pathname); // "/users"
}
```

---

## Gotchas

**Params are always strings.** `useParams()` returns `{ id: "42" }`, not `{ id: 42 }`. Using the raw string in arithmetic or strict equality against a number will produce wrong results silently.

**`setSearchParams` with a plain object replaces all params.** `setSearchParams({ page: 2 })` deletes any existing params that aren't in the new object. Use the functional form to preserve others.

**Optional segments don't exist natively.** React Router v6 doesn't support `path="/users/:id?"`. The workaround is two sibling routes:
```jsx
<Route path="/users/:id" element={<UserDetail />} />
<Route path="/users" element={<UserList />} />
```
(v7 added optional segments with `?` suffix.)

**Params from ancestor routes require the full tree to be mounted.** `useParams()` in a deeply nested component only sees params from the currently matched route tree. If you render a component outside the matched route (e.g., portal), it won't have access to the route's params.

**URL decoding is automatic.** `useParams()` returns decoded values — `/users/John%20Doe` gives `{ name: "John Doe" }`. Don't double-decode.

**`useSearchParams` doesn't debounce.** Every call to `setSearchParams` is a navigation event that pushes a new history entry. If you're updating on every keystroke in a search input, that fills the history stack. Debounce the update or use `replace: true`:
```jsx
setSearchParams(params, { replace: true });
```

---

## Interview Questions

**Q (High): What does `useParams()` return and what are its limitations?**

Answer: `useParams()` returns an object mapping param names to their current URL values, all as strings. It reads from the nearest matched `<Route>` in the current component's ancestry. Its limitations: all values are strings (you must parse numbers/booleans), it only returns params for the currently matched route tree, and it does not handle query strings (that's `useSearchParams`). Optional params aren't supported natively in v6 either — you need sibling routes or upgrade to v7.

The trap: Treating param values as numbers directly. Strict equality `params.id === 42` is always false; you need `Number(params.id) === 42`.

---

**Q (High): How does `useSearchParams` work and how is it different from `useParams`?**

Answer: `useSearchParams` returns `[searchParams, setSearchParams]` where `searchParams` is a `URLSearchParams` object and `setSearchParams` updates the query string and triggers a re-render. It's the URL-backed equivalent of `useState`. The key differences from `useParams`: search params are not part of the route path — they're optional and can appear on any route — and they represent key/value pairs that can be combined in any way. `useParams` reads from the route pattern; `useSearchParams` reads from the `?key=value` portion. The `setSearchParams` function re-navigates by default (pushes history), so for frequent updates pass `{ replace: true }` or use the functional form to preserve existing params.

---

**Q (High): Why would you use a wildcard route `path="*"` and where should it be placed?**

Answer: A wildcard route catches any URL that didn't match any other route — the 404 handler. In v6, the matching algorithm picks the most specific match first, so the wildcard is only reached when nothing else matched. You don't need to worry about placement order in v6 (unlike v5's `<Switch>` where the wildcard had to be last), but by convention it's placed last for readability. A wildcard can also appear in a scoped position: `/admin/*` catches all unknown admin URLs within the admin section without affecting other route subtrees.

---

**Q (Medium): A user navigates to `/products?page=2&category=shoes`. You want to update just the `page` param to 3 while keeping `category`. How do you do it?**

Answer: Use the functional form of `setSearchParams`:
```jsx
setSearchParams(prev => {
  prev.set('page', '3');
  return prev;
});
```
The `prev` argument is the current `URLSearchParams` object. Mutate it in place and return it. Using the object form `setSearchParams({ page: 3 })` would discard `category`.

The trap: Assuming you can pass a partial update object to `setSearchParams` the same way you'd partially update state with spread. It doesn't work that way — the object form replaces all params.

---

**Q (Medium): How do you read route params in a data router loader without using hooks?**

Answer: The `loader` function receives `{ params, request }` as its argument. `params` is the same object that `useParams()` would return in the component:
```js
loader: ({ params }) => {
  return fetchUser(params.id);
}
```
This is preferable to hooks for data fetching because loaders run before the component renders — the data is ready by the time the component mounts, eliminating the loading-state shimmer that useEffect-based fetching causes.

---

**Q (Low): What happens when two routes have params with the same name at different levels?**

Answer: The child route's param wins. If you have `/orgs/:id` with a child `/orgs/:id/repos/:id`, the inner `:id` shadows the outer one. This is a naming collision — the outer param becomes inaccessible through `useParams`. The solution is to use distinct param names: `:orgId` and `:repoId`.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write a nested route with two params (e.g., `:projectId` + `:taskId`) and access both in the child component
- [ ] Can explain why `useParams` returns strings and what to do before using a param as a number
- [ ] Can write a `useSearchParams` update that preserves existing params while changing one
- [ ] Can explain the difference between URL params and search params (query strings)
- [ ] Can explain the `{ replace: true }` option for `setSearchParams` and when to use it
- [ ] Know how to set up a 404 catch-all route with `path="*"`

---
*Next: Programmatic Navigation — `useNavigate` for imperative redirects, replace vs push, and carrying state through navigations.*
