# Nested Routes & Layouts

## Quick Reference

| Pattern | Key mechanism | What it produces |
|---|---|---|
| Layout route | Route with `element` but no `path` | Wraps children without adding a URL segment |
| Nested URL route | Route with `path` inside parent `path` | Appends segment: parent `/app` + child `settings` → `/app/settings` |
| Render slot | `<Outlet>` in parent element | Where the matched child renders |
| Default child | `index` route | Renders when parent path matches exactly |

---

## What Is This?

Nested routing lets you compose routes as a tree that mirrors your UI's layout tree. A parent route defines a layout — header, sidebar, nav — and each child route fills in the content area via `<Outlet>`. The URL structure reflects the nesting: `/dashboard/settings` tells you immediately that settings lives inside the dashboard section.

React Router v6 made nested routes a first-class concept. The entire match process works on the tree, finding the deepest matching route and rendering all ancestors' elements from top to bottom, each one providing an `<Outlet>` for the next.

---

## Why Does It Exist?

Without nested routing you face a painful choice: duplicate layout code in every route component, or build a custom "which layout should I show" conditional in a wrapper. Neither scales. Nested routes solve this by letting the route config itself encode which layout wraps which content.

It also keeps the URL meaningful. `/dashboard/settings` communicates a hierarchy — you're in dashboard, specifically in settings. That hierarchy can be navigated (the back button or breadcrumbs work naturally) and can be deep-linked.

---

## How It Works

### Basic nesting

Routes nest by placing `<Route>` elements as children of other `<Route>` elements:

```jsx
<Routes>
  <Route path="/dashboard" element={<DashboardLayout />}>
    <Route index element={<DashboardHome />} />
    <Route path="stats" element={<Stats />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>
```

When the URL is `/dashboard/stats`:
1. `DashboardLayout` renders
2. Inside it, wherever `<Outlet>` is placed, `Stats` renders

The child path `"stats"` is relative — it automatically prefixes with the parent's path. The full URL is `/dashboard/stats`.

`DashboardLayout` looks like this:

```jsx
function DashboardLayout() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>
        <Outlet />  {/* Stats or Settings renders here */}
      </main>
    </div>
  );
}
```

### Layout routes (pathless routes)

A layout route has `element` but no `path`. It adds a wrapping component without contributing a URL segment. This is how you apply shared layouts to routes that don't share a URL prefix.

```jsx
<Routes>
  {/* Routes inside AppShell get the nav/footer layout */}
  <Route element={<AppShell />}>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Route>

  {/* No AppShell for auth pages */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
</Routes>
```

`AppShell` renders `<Outlet>` and Home/About both get the shell, but Login/Register don't.

### Multi-level nesting

You can go as deep as needed:

```jsx
<Route path="/app" element={<AppLayout />}>
  <Route path="users" element={<UsersLayout />}>
    <Route index element={<UserList />} />
    <Route path=":id" element={<UserDetail />}>
      <Route index element={<UserOverview />} />
      <Route path="edit" element={<UserEdit />} />
    </Route>
  </Route>
</Route>
```

URL `/app/users/42/edit` renders:
- `AppLayout` (with Outlet)
  - `UsersLayout` (with Outlet)
    - `UserDetail` (with Outlet)
      - `UserEdit`

Each level must have `<Outlet>` in its JSX or the child won't appear.

### Index routes in nested trees

At every level you can have an index route — the default for when that level's path matches exactly but no child does:

```jsx
<Route path="/app" element={<AppLayout />}>
  <Route index element={<AppHome />} />        {/* /app */}
  <Route path="settings" element={<Settings />} />  {/* /app/settings */}
</Route>
```

Without the index route, navigating to `/app` renders `AppLayout` with an empty `<Outlet>`.

> **Check yourself:** You have a layout route (no path) wrapping several routes. If you navigate to one of those routes, what renders inside the layout's `<Outlet>`?

### Data router setup (createBrowserRouter)

In v6.4+, you define routes as objects:

```jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <AppHome /> },
      { path: 'settings', element: <Settings /> },
      {
        path: 'users',
        element: <UsersLayout />,
        children: [
          { index: true, element: <UserList /> },
          { path: ':id', element: <UserDetail /> },
        ],
      },
    ],
  },
]);

function Root() {
  return <RouterProvider router={router} />;
}
```

The structure is the same; the format is objects instead of JSX. This enables loaders and actions at each level.

---

## The Outlet Context

`<Outlet>` accepts a `context` prop, passing data down to the rendered child without a separate Context Provider:

```jsx
function DashboardLayout() {
  const user = useCurrentUser();
  return (
    <div>
      <Outlet context={{ user }} />
    </div>
  );
}

function Settings() {
  const { user } = useOutletContext();
  return <p>Settings for {user.name}</p>;
}
```

This is useful for layout → child data handoff but should be used sparingly — most shared data belongs in proper context or loaders.

> **Check yourself:** What happens if a parent route's element doesn't include `<Outlet>` but has child routes defined?

---

## Gotchas

**Forgetting `<Outlet>` renders nothing.** The single most common mistake. Define child routes, navigate to them, see only the parent layout. Check that the parent element has `<Outlet>`.

**Relative paths are relative to the matched path, not the component's location in the tree.** A `path="edit"` inside a `path=":id"` route becomes `/:id/edit`. Always think about the full URL when debugging why a route isn't matching.

**Index routes don't render alongside children.** An index route only renders when no child path matches. If you navigate to `/dashboard/stats`, the index route for `/dashboard` does not render — `Stats` does.

**Missing `/*` on parent breaks child matching.** In the component-based setup (`<Routes>`), if you write `<Route path="/app" element={<AppLayout />}>` and `AppLayout` itself contains another `<Routes>`, the inner routes won't match unless the parent route is `path="/app/*"`. The `/*` tells the router to pass the rest of the path to the nested `<Routes>`. In object-based setup with `children`, this is handled automatically.

**Layout routes do not contribute a URL segment but do contribute a render layer.** Two routes at the same URL path inside different layout routes still render different outer shells.

---

## Interview Questions

**Q (High): What is a layout route and how does it differ from a normal route?**

Answer: A layout route is a `<Route>` with an `element` but no `path`. It wraps its child routes in a shared UI shell without adding a segment to the URL. Normal routes match a URL segment and render their element when that segment is active. Layout routes always render as long as one of their children matches — they're structural, not URL-based. The mechanism is the same (`<Outlet>` in the element, children in the config), but because there's no path, navigating between sibling children doesn't unmount and remount the layout — it just replaces the Outlet content. This is ideal for persistent navigation, sidebars, and context providers that should stay alive across child route transitions.

The trap: Thinking layout routes require a path like `/` or `/app`. They can be completely pathless and multiple layout routes can be siblings at the same level.

---

**Q (High): What happens if a parent route renders without `<Outlet>` in its element?**

Answer: Child routes simply don't render. The router resolves the full match (both parent and child), calls the parent's element, but has nowhere to place the child's output. No error is thrown. The user sees only the parent layout with a missing content area. This is the most common debugging scenario with nested routes — everything is correctly configured but the Outlet was omitted.

The trap: Assuming the router will throw a helpful error. It's silent — you just get a blank content area.

---

**Q (High): What is an index route and what problem does it solve?**

Answer: An index route renders when the parent path matches exactly but no sibling child path matches. It's the default view at a given URL. Without it, navigating to `/dashboard` when you have children at `/dashboard/stats` and `/dashboard/settings` gives you the layout shell with an empty outlet. The index route fills that gap with a meaningful default — typically a summary, a redirect, or a landing page for that section. It's declared with `index` instead of `path`.

The trap: Confusing it with `path="/"`. An index route's effective URL is whatever its parent's path is.

---

**Q (Medium): What is the difference between nesting routes with `<Routes>/<Route>` JSX vs. the object config with `createBrowserRouter`?**

Answer: The URL matching behavior and nesting semantics are identical. The object config enables features that JSX doesn't: route-level `loader` and `action` functions, `errorElement`, `shouldRevalidate`, and `lazy` for code splitting. It also means the router can initiate data loading before rendering, which eliminates waterfall fetches. With JSX-based routing, data loading happens in effects after the component renders. For most modern apps the object config is preferable. JSX is fine for simple routing without server-side data needs.

The trap: Saying JSX and object config are "completely equivalent." They're not once you add data loading.

---

**Q (Medium): How do you pass data from a layout route to its children without prop drilling?**

Answer: Two approaches. First, `<Outlet context={value}>` + `useOutletContext()` in the child — lightweight, no extra setup, but couples the child to the parent. Second, a proper React context provider inside the layout route's element — the context wraps `<Outlet>` and any child can consume it independently. The outlet context approach is fine for small, tightly coupled parent/child relationships. Use a real React context when multiple children need the data or when the data has a lifecycle of its own (auth state, theme, etc.).

---

**Q (Low): In the JSX-based setup, when do you need `path="/app/*"` with the wildcard vs `path="/app"`?**

Answer: You need `/*` when the parent route element contains its own nested `<Routes>` component. Without `/*`, the router's matching stops at the parent's exact path — it won't pass the remaining URL segments to an inner `<Routes>`. With `/*`, the parent matches any URL that starts with `/app/` and the inner `<Routes>` can match the rest. In the object-based `createBrowserRouter` config with the `children` array, this is handled automatically — no `/*` needed. The footgun exists only in the JSX-in-components style.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain what a layout route is and why it has no path
- [ ] Can write a three-level nested route config from memory including an index route at the top level
- [ ] Can explain what happens when a parent element is missing `<Outlet>`
- [ ] Can explain the difference between a layout route and a route with `path="/"`
- [ ] Can describe what `<Outlet context={...}>` does and when you'd use `useOutletContext()`
- [ ] Know when `path="foo/*"` is needed vs. when `children` in the object config handles it automatically

---
*Next: Dynamic Routes & Params — the URL as data: `:param` segments, `useParams`, and `useSearchParams` for query strings.*
