# React Router v6 Basics

## Quick Reference

| Concept | API | Purpose |
|---|---|---|
| Router setup | `createBrowserRouter` + `RouterProvider` | Wires history API into React tree |
| Declarative route match | `<Routes><Route>` | Picks one matching branch to render |
| Child slot | `<Outlet>` | Where the matched child route renders inside a parent |
| Navigation | `<Link>` / `<NavLink>` | Client-side link without full-page reload |
| Active styling | `NavLink` `className`/`style` callback | Receives `{ isActive }` to style current link |

---

## What Is This?

React Router is a client-side routing library. It maps the browser's current URL to a React component tree, then updates that tree whenever the URL changes — all without a full-page reload.

v6 was a major rewrite from v5. The API surface shrank significantly: `<Switch>` became `<Routes>`, `exact` was dropped (all paths match exactly by default), and relative paths started working intuitively. v6.4 added a second setup style — data routers — which is where the library is heading.

```jsx
// Minimal v6 setup
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
```

> **Check yourself:** What does `<Routes>` do that `<Route>` on its own does not?

---

## Why Does It Exist?

SPAs don't navigate the way traditional websites do. When the user clicks a link, the browser's default behavior is to make a full HTTP request for the new URL. React Router intercepts that, updates the URL using the History API (pushState), and re-renders the right components — giving the illusion of page navigation while staying on the same HTML document.

The v6 redesign addressed real v5 pain points:
- `exact` was a footgun — most devs wanted exact matching anyway, so it became the default
- `<Switch>` had an implicit "first match wins" behavior that was confusing to nest
- Relative paths didn't work in v5, causing widespread copy-paste of absolute paths
- `<Outlet>` made layout routes a first-class concept instead of a workaround

---

## How It Works

### Router types

`BrowserRouter` uses the HTML5 History API — clean URLs like `/users/42`. This requires your server to serve the same `index.html` for all paths (the server never sees a real file at `/users/42`).

`HashRouter` puts the path after a `#` — `/users/42` becomes `/#/users/42`. The hash part never reaches the server, so it works on static hosts without server config. Almost no one uses this for new apps.

`MemoryRouter` keeps history in memory, not the browser URL. Used in tests and React Native.

`createBrowserRouter` (v6.4+) is the data router setup — same history behavior as `BrowserRouter` but enables loaders, actions, and `RouterProvider`. Prefer this for new apps.

### Route matching

`<Routes>` looks at the current URL and finds the best-matching `<Route>`. "Best match" means most specific — `/users/42` beats `/users/:id` which beats `/*`. In v5 you had to think about this ordering; in v6 the algorithm handles it.

All paths in v6 match exactly by default. `/users` does **not** match `/users/42`. To match any prefix you add `/*` explicitly.

### Outlet

`<Outlet>` is where child routes render. A parent route renders its own layout, and wherever you place `<Outlet>` the matched child route's element appears.

```jsx
function AppLayout() {
  return (
    <div>
      <Nav />
      <main>
        <Outlet /> {/* matched child renders here */}
      </main>
    </div>
  );
}

// Route config
<Route element={<AppLayout />}>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
</Route>
```

### Index routes

An index route renders when its parent path matches but no child path matches. It fills the `<Outlet>` with a default view.

```jsx
<Route path="/dashboard" element={<DashboardLayout />}>
  <Route index element={<DashboardHome />} />  {/* /dashboard */}
  <Route path="stats" element={<Stats />} />    {/* /dashboard/stats */}
</Route>
```

### Link and NavLink

`<Link to="/users">` renders an `<a>` tag but intercepts the click to prevent the default browser navigation and calls `history.pushState` instead.

`<NavLink>` is `<Link>` with active state awareness. Its `className` and `style` props accept a function that receives `{ isActive, isPending }`:

```jsx
<NavLink
  to="/dashboard"
  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
>
  Dashboard
</NavLink>
```

> **Check yourself:** What happens if you render `<Route path="/users">` outside of a `<Routes>` wrapper?

---

## v6 vs v5 Cheat Sheet

| v5 | v6 |
|---|---|
| `<Switch>` | `<Routes>` |
| `exact` prop | Not needed — exact by default |
| `<Redirect to="...">` | `<Navigate to="...">` |
| `useHistory()` | `useNavigate()` |
| `<Route component={C}>` | `<Route element={<C />}>` |
| Manual ordering for specificity | Algorithm handles it |

---

## Gotchas

**Paths are relative by default.** In v6 nested `<Route path="profile">` inside `<Route path="/users/:id">` produces `/users/:id/profile`. This is correct behavior but surprises people coming from v5 absolute paths.

**`<Routes>` must contain `<Route>` children directly.** You cannot put arbitrary JSX between them. Fragments don't work as wrappers inside `<Routes>`.

**No partial matching without `*`.** `/users` will never match `/users/42` unless the route is `/users/*`. Forgetting `/*` on parent routes breaks nested route rendering.

**`<Link>` outside a router throws.** Any component using React Router hooks/components must be inside a router provider. A common mistake is mounting the router inside a component that is itself outside the router.

**`<NavLink>` matches on prefix by default.** `<NavLink to="/">` is always active unless you add `end` prop, because every URL starts with `/`.

```jsx
<NavLink to="/" end>Home</NavLink>  {/* only active on exactly "/" */}
```

---

## Interview Questions

**Q (High): What is the difference between `<BrowserRouter>` and `createBrowserRouter` / `RouterProvider`?**

Answer: Both use the HTML5 History API under the hood, so the URL behavior is identical. The difference is capability. `BrowserRouter` is the classic component-based setup: you nest `<Routes>/<Route>` inside it and use hooks for data fetching. `createBrowserRouter` + `RouterProvider` is the data router setup introduced in v6.4. It enables `loader` and `action` functions on routes, `useLoaderData`, `useFetcher`, `defer`, and `errorElement` — a Remix-inspired model where the router itself orchestrates data fetching rather than leaving it to effects. For new apps with complex data needs, prefer the data router. For simple SPAs the classic setup is fine.

The trap: Weaker candidates say "they're basically the same." The distinction matters: data routers unlock parallel data loading at the route level, which eliminates waterfall fetches without any extra code.

---

**Q (High): Why did v6 drop the `exact` prop?**

Answer: Because v5's default (prefix matching) was almost never what developers actually wanted. With prefix matching, `<Route path="/users">` would also match `/users/42`, which caused subtle double-renders and forced everyone to add `exact` defensively. v6 inverted the default: all paths match exactly unless you explicitly add `/*` to opt into prefix matching. This made the common case simpler and the exception explicit.

The trap: Candidates who say "you can still use `exact` in v6." You can't — it was removed entirely. If you need prefix matching, use `/*`.

---

**Q (High): What does `<Outlet>` do and why is it needed?**

Answer: `<Outlet>` is a placeholder that renders whatever child route matched at the current URL. Without it, parent route components have no way to render their children — the parent and child would be independent render trees. With `<Outlet>`, you define a layout component once (nav, sidebar, footer) and every child route renders inside it without the layout having to know about any of its children. It's what makes nested routing actually composable.

The trap: Thinking `<Outlet>` is just for aesthetic layouts. It's also how you scope context, error boundaries, and data loading to a route subtree.

---

**Q (Medium): What is an index route and when do you use it?**

Answer: An index route has `index` instead of `path`. It renders when its parent path matches exactly but none of the sibling routes match. It's the default child. You use it when a parent layout route needs a "home" view — for example, `/dashboard` shows `<DashboardHome>` while `/dashboard/settings` shows `<Settings>`. Without an index route, `<Outlet>` renders nothing when you're on exactly `/dashboard`.

The trap: Confusing index routes with a `path="/"` route. An index route's effective path is whatever its parent's path is, not `/`.

---

**Q (Medium): How does React Router intercept clicks on `<Link>` without a special browser API?**

Answer: `<Link>` renders a normal `<a>` tag. It attaches an onClick handler that calls `event.preventDefault()` — suppressing the default browser navigation — then calls `history.pushState(null, '', href)` to update the URL without a page load, then triggers a React re-render with the new location. Because `pushState` doesn't fire a `popstate` event, the router listens internally and propagates the location change to all consumers. The `popstate` event (fired on back/forward button) is handled separately.

---

**Q (Medium): What is the difference between `<Link>` and `<NavLink>`?**

Answer: `<NavLink>` is a `<Link>` that knows whether it's active. It receives `{ isActive, isPending }` in its `className` and `style` callbacks, letting you style the currently-matching link. A link is "active" when the current URL matches its `to` prop. `<NavLink to="/">` is special — it would always be active since every URL starts with `/`, so you add the `end` prop to require an exact match. Use `<NavLink>` in navigation menus; use `<Link>` everywhere else.

---

**Q (Low): What is the difference between `MemoryRouter` and `BrowserRouter`?**

Answer: `MemoryRouter` stores navigation history as an array in JavaScript memory rather than using the browser's History API. The URL in the address bar never changes. It's used in environments where there is no browser URL bar (React Native, Electron), in tests where you want isolation, or in embedded widgets where you don't want the host page's URL to change. `BrowserRouter` is for real web apps where the URL should reflect application state.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the difference between `BrowserRouter` and `createBrowserRouter` in one sentence
- [ ] Can write a route config with at least one nested layout and one index route from memory
- [ ] Can explain why `exact` was removed in v6 and what `/*` does instead
- [ ] Can explain what `<Outlet>` is and why a layout route doesn't work without it
- [ ] Can explain the `NavLink` `end` prop and when you need it
- [ ] Can name the v5 → v6 API renames: Switch→Routes, Redirect→Navigate, useHistory→useNavigate

---
*Next: Nested Routes & Layouts — Outlet is introduced here; the next file goes deep on how to compose multi-level layout trees with it.*
