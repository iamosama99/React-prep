# Lazy-Loaded Routes

## Quick Reference

| Concept | API | Effect |
|---|---|---|
| Lazy import | `React.lazy(() => import('./Page'))` | Dynamic import — separate chunk |
| Render boundary | `<Suspense fallback={<Spinner />}>` | Shows fallback while chunk loads |
| v6.4+ route lazy | `lazy: () => import('./Page')` on route object | Defers load until route is matched |
| Error boundary | `errorElement` or `<ErrorBoundary>` | Catches chunk load failures |

---

## What Is This?

Route-based code splitting means shipping a separate JavaScript chunk per route rather than one giant bundle. When the user lands on the app, they download only what's needed to render the current route. When they navigate to another route, that route's chunk loads on demand.

In practice this means: the `/dashboard` page code doesn't load when the user is on `/settings`, and vice versa. For large apps, this can cut initial load time significantly.

---

## Why Does It Exist?

By default, Vite and webpack bundle everything into one file (or a few). Every component, every page, every library import — all concatenated together. For a small app this is fine. For a large app with 50 routes, the user loading `/login` also downloads the code for the admin panel, the analytics dashboard, the settings page, and everything else. They'll never use most of it.

Dynamic imports (`import()`) were added to the JavaScript spec (and to bundlers) to solve this. They return a Promise that, when resolved, gives you the module. Bundlers automatically split the import into a separate chunk. `React.lazy` wraps this pattern for React components.

---

## How It Works

### React.lazy + Suspense

```jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

`React.lazy(() => import('./pages/Dashboard'))` creates a lazy component. When React first tries to render it, it throws a Promise. `<Suspense>` catches that Promise, shows the fallback, and when the Promise resolves (chunk loaded), re-renders the tree with the real component.

The dynamic import is the code-splitting signal to the bundler. Every `import('./path')` call becomes a separate chunk.

> **Check yourself:** Where must `<Suspense>` be placed relative to lazy components? Can it be in a different component than the lazy component?

### Per-route Suspense vs global Suspense

A single `<Suspense>` at the top works but shows one spinner for everything. Per-route Suspense gives finer-grained loading states:

```jsx
<Routes>
  <Route
    path="/dashboard"
    element={
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    }
  />
  <Route
    path="/settings"
    element={
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    }
  />
</Routes>
```

### v6.4+ lazy route property

In the data router, routes can declare a `lazy` function instead of `element`. The function runs when the route is first matched:

```jsx
const router = createBrowserRouter([
  {
    path: '/dashboard',
    lazy: async () => {
      const module = await import('./pages/Dashboard');
      return { Component: module.default };
    },
  },
  {
    path: '/settings',
    lazy: async () => {
      const { Settings } = await import('./pages/Settings');
      return { Component: Settings };
    },
  },
]);
```

The `lazy` function returns an object that can include any route properties: `Component`, `loader`, `action`, `errorElement`. This is more powerful than `React.lazy` + `Suspense` because the loader can also be deferred until the route is matched — you ship both the UI code and the data fetching code in a single chunk.

You still need `<Suspense>` in the component tree if using `React.lazy`, but with the v6.4 `lazy` property, React Router handles the loading state via `<RouterProvider>`'s loading indicators.

### Prefetching

By default, chunks load when the user navigates. To prefetch before navigation:

```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'));

function NavLink() {
  function prefetch() {
    // Trigger the import on hover — chunk starts loading before click
    import('./pages/Dashboard');
  }

  return (
    <Link to="/dashboard" onMouseEnter={prefetch}>
      Dashboard
    </Link>
  );
}
```

The browser will cache the chunk. If the user then clicks, the import is already resolved.

> **Check yourself:** A user navigates to `/dashboard` for the first time. Describe the sequence of events from click to content rendering.

### Error handling for lazy routes

Network failures can cause chunk loading to fail. Wrap lazy routes in an error boundary:

```jsx
<Route
  path="/dashboard"
  element={
    <ErrorBoundary fallback={<ChunkLoadError />}>
      <Suspense fallback={<Spinner />}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  }
/>
```

In v6.4+ data routers, `errorElement` on the route handles this:

```jsx
{
  path: '/dashboard',
  lazy: () => import('./pages/Dashboard').then(m => ({ Component: m.default })),
  errorElement: <RouteError />,
}
```

---

## Bundle Strategy

Not every split is worth the network overhead. Practical rules:

- **Always split:** page-level components, admin sections, authenticated-only pages, heavy third-party libraries (chart.js, PDF renderer, map library)
- **Usually don't split:** small shared components, layout components, utilities
- **Verify with bundle analyzer:** what webpack-bundle-analyzer or `vite build --reporter` show you tells you where the weight actually is

---

## Gotchas

**`React.lazy` only works with default exports.** `lazy(() => import('./Foo'))` imports the default export. For named exports, extract in the import: `lazy(() => import('./Foo').then(m => ({ default: m.NamedExport })))`.

**`<Suspense>` must be an ancestor, not a sibling.** The lazy component throws a Promise; `<Suspense>` catches it. If there's no `<Suspense>` ancestor, React throws an error.

**Chunk load failures are not caught by `<Suspense>`.** `<Suspense>` only handles the loading state. A failed import throws an error, which requires an error boundary. Both are needed for resilient lazy routes.

**Slow navigation can appear broken.** If a chunk takes 2+ seconds to load and there's no loading indicator, users may click again or think the app froze. Always show feedback during chunk loading.

**Lazy imports in component bodies re-evaluate every render.** Put `React.lazy(...)` at the module level (outside components), not inside a render function or hook. Otherwise a new lazy component is created on every render.

```jsx
// Wrong — new lazy component on every render
function App() {
  const Dashboard = lazy(() => import('./Dashboard')); // BAD
  return <Dashboard />;
}

// Correct — created once at module scope
const Dashboard = lazy(() => import('./Dashboard'));
function App() {
  return <Dashboard />;
}
```

---

## Interview Questions

**Q (High): How does `React.lazy` work with code splitting?**

Answer: `React.lazy` takes a function that returns a dynamic `import()`. Bundlers (Vite, webpack) treat every `import()` as a split point, emitting the imported module as a separate chunk. `React.lazy` wraps that import into a lazy component. When React first tries to render the lazy component, if the chunk hasn't loaded yet, it throws a special Promise. `<Suspense>` catches the thrown Promise, shows its fallback UI, and re-renders when the Promise resolves. This mechanism is called Suspense-based lazy loading. The chunk download is triggered by the first render attempt — it's on-demand, not prefetched.

The trap: Thinking the bundler splits based on route config. It doesn't — it splits based on `import()` calls. React Router doesn't know about chunks. The dynamic import is what creates the chunk.

---

**Q (High): Why must `<Suspense>` wrap a `React.lazy` component and what happens if it doesn't?**

Answer: When a lazy component's chunk hasn't loaded, it throws a Promise as part of React's Suspense protocol. `<Suspense>` is the component in the tree designed to catch that thrown Promise and display a fallback. If there's no `<Suspense>` ancestor, the thrown Promise bubbles up to React's error handling, which treats it as an unhandled error and crashes the component tree. `<Suspense>` can be a distant ancestor — it doesn't need to be an immediate parent — as long as it's above the lazy component in the tree.

---

**Q (Medium): What is the difference between `React.lazy` + `<Suspense>` and the v6.4 `lazy` route property?**

Answer: `React.lazy` + `<Suspense>` is React-native code splitting — it splits the component and handles the loading state via the Suspense protocol. It doesn't know about route loaders or actions. The v6.4 `lazy` route property is router-aware — the deferred object can include a `Component`, a `loader`, an `action`, and `errorElement`. This means both the UI code and the data fetching logic for a route can be bundled together and deferred until the route is actually navigated to. The router also integrates the loading state into its own pending navigation state, so you can show loading indicators without `<Suspense>`. For data-heavy apps, the v6.4 approach is more holistic.

---

**Q (Medium): What happens when a lazy chunk fails to load?**

Answer: The dynamic `import()` returns a rejected Promise. `<Suspense>` only handles the pending state — it doesn't catch errors. The rejected Promise propagates as a thrown error, which is caught by the nearest error boundary. Without an error boundary, it will propagate to React's root error handler and unmount the app. For lazy routes, wrap each route in an error boundary or use `errorElement` in the data router config. A common recoverable error UI is a "Failed to load page — click to retry" message that calls `window.location.reload()`.

---

**Q (Low): How would you prefetch a lazy route to reduce perceived navigation latency?**

Answer: Call the dynamic import function ahead of the navigation — the browser will download and cache the chunk. Common approaches: prefetch on hover over the `<Link>` (the user has signaled intent), prefetch on route mount if you can predict the next destination, or prefetch all routes after the initial paint using `requestIdleCallback`. Since the imported chunk is cached by the module system, calling `import('./Dashboard')` multiple times only triggers one network request.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write a lazy-loaded route from memory: `React.lazy`, `Suspense` wrapping, and the `<Route>` config
- [ ] Can explain what happens mechanically when React encounters a lazy component whose chunk hasn't loaded
- [ ] Can explain why `React.lazy` calls must be at module scope, not inside components
- [ ] Know what to add when a chunk fails to load (error boundary)
- [ ] Know the difference between v6.4 `lazy` route property and `React.lazy` + `Suspense`
- [ ] Know why `React.lazy` only works with default exports and the workaround for named exports

---
*Next: Data Loaders & Actions — the v6.4 Remix-style data layer that replaces useEffect-based fetching.*
