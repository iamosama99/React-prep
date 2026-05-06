# Code Splitting

## What Is This?

Code splitting is the practice of dividing your JavaScript bundle into smaller chunks that are loaded on demand, rather than delivering one large bundle on initial page load. In a React app, you typically split by route or by feature — the bundle for the dashboard is only loaded when the user navigates to the dashboard, not when they first land on the login page.

```js
// Without code splitting — everything in one bundle:
import Dashboard from './Dashboard';
import Profile from './Profile';
import Settings from './Settings';

// With code splitting — each is a separate chunk, loaded on demand:
const Dashboard = lazy(() => import('./Dashboard'));
const Profile   = lazy(() => import('./Profile'));
const Settings  = lazy(() => import('./Settings'));
```

---

## Why Does It Exist?

Modern React apps bundle all JavaScript together by default. A bundler like webpack or Vite processes the entire import graph and emits a single `.js` file. For small apps this is fine. For large apps this produces a bundle that can be several megabytes — and the browser must download, parse, and compile all of it before executing any JavaScript, including the code to show the initial page.

Code splitting attacks the first-load problem: by splitting the bundle, the browser only downloads the code it needs for the current view. The rest is fetched lazily, in the background or on demand. The result is a faster Time to Interactive (TTI) and First Contentful Paint (FCP).

---

## How It Works

### Dynamic import

The foundation of code splitting is the dynamic `import()` expression — a JavaScript standard that returns a Promise resolving to the module's exports:

```js
// Static import — bundler includes this in the main chunk:
import { heavyFunction } from './heavy';

// Dynamic import — bundler creates a separate chunk for './heavy':
const { heavyFunction } = await import('./heavy');
```

When a bundler (webpack, Vite, Rollup) encounters a dynamic `import()`, it knows to split everything reachable from that module into a separate chunk. The chunk is not included in the main bundle — it's fetched when the `import()` is first called.

### React.lazy + Suspense

`React.lazy` wraps a dynamic import and returns a lazily-loaded component. It must be used with `Suspense`, which renders a fallback while the chunk is loading:

```js
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
```

When `Dashboard` is first rendered, React detects that the component is lazy and hasn't been loaded yet. It throws a Promise (Suspense protocol), renders the fallback, and re-renders `Dashboard` once the Promise resolves (i.e., the chunk has loaded).

The `Suspense` boundary can be placed anywhere in the tree, at any granularity. Coarser boundaries show a single fallback for a whole page. Finer boundaries let parts of the UI load independently.

### Route-based splitting (React Router)

The most impactful and common split point is the route level:

```js
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const Home      = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings  = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings"  element={<Settings />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

Each route's code is fetched only when that route is first visited. The initial bundle only contains the router, shared components, and the Home page.

### Component-level splitting

You can split at any granularity, not just routes. Heavy modals, rich text editors, chart libraries, or admin panels that are conditionally rendered are good candidates:

```js
// The chart library isn't loaded until the user expands the chart panel
const ChartPanel = lazy(() => import('./ChartPanel'));

function Dashboard({ showChart }) {
  return (
    <div>
      <SummaryStats />
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <ChartPanel />
        </Suspense>
      )}
    </div>
  );
}
```

---

## Preloading

Loading a chunk only on navigation creates a waterfall: user clicks → React tries to render → chunk fetch starts → user waits. For routes that are very likely to be visited, you can preload the chunk ahead of time:

```js
// Preload on mouse hover — chunk fetches before the user clicks
const Dashboard = lazy(() => import('./Dashboard'));

function NavLink() {
  const prefetch = () => import('./Dashboard'); // starts fetch immediately

  return (
    <Link to="/dashboard" onMouseEnter={prefetch}>
      Dashboard
    </Link>
  );
}
```

React Router's data loaders (v6.4+) also support preloading route data and components simultaneously.

---

## Named Exports and React.lazy

`React.lazy` expects the dynamic import to resolve to a module with a **default export**. Named exports require a wrapper:

```js
// If Chart is a named export:
const Chart = lazy(() =>
  import('./charts').then(module => ({ default: module.Chart }))
);
```

This is a common trip-up — forgetting the default export wrapper causes a runtime error.

---

## Gotchas

**1. `React.lazy` only works with the default export.**

If the target module uses named exports, you need the `.then()` wrapper or a re-export file. This is the most common mistake when first using lazy loading.

**2. Suspense boundary must be an ancestor, not a sibling.**

The `Suspense` component must be above the lazy component in the tree, not alongside it:

```js
// Wrong — Suspense and Dashboard are siblings:
<>
  <Suspense fallback={<Spinner />} />
  <Dashboard />  {/* throws but no Suspense above it */}
</>

// Correct — Dashboard is a child of Suspense:
<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>
```

**3. Error handling for failed chunk loads.**

Network errors can cause a chunk fetch to fail. Without an error boundary around your lazy component, a failed load produces an unhandled error. Always wrap lazy routes with an error boundary:

```js
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Spinner />}>
    <Dashboard />
  </Suspense>
</ErrorBoundary>
```

**4. Splitting too aggressively creates waterfall fetches.**

If a route lazy-loads three components in sequence (A renders, fetches B, B renders, fetches C), you've created a loading waterfall. Prefer splitting at the route level (one chunk per page) over splitting every individual component. Fine-grained splits are worthwhile only for genuinely heavy components that aren't needed immediately.

**5. Shared dependencies between chunks are deduplicated by bundlers.**

If two chunks both use React, the bundler puts React in a shared chunk fetched alongside both. This is automatic in webpack and Vite — you don't need to do anything, but it's worth understanding why `vendor` chunks appear in your build output.

**6. SSR requires special handling.**

`React.lazy` doesn't work with server-side rendering out of the box — the server can't `import()` asynchronously in the render path. SSR frameworks like Next.js provide their own lazy loading APIs (`next/dynamic`) that handle server rendering of lazy components. React 18's Suspense for SSR enables streaming, which allows lazy components to be progressively sent to the client.

---

## Interview Questions

**Q (High): What is code splitting and why is it important for React performance?**

Answer: Code splitting divides the JavaScript bundle into smaller chunks that are loaded on demand. Without it, the browser downloads all of the app's JavaScript before executing any of it — including code for routes the user may never visit. This slows Time to Interactive on the initial page load. Code splitting solves this by only delivering the code needed for the current view. In React, the primary tools are dynamic `import()` (the bundler-level mechanism), `React.lazy` (the component-level wrapper), and `Suspense` (the loading fallback). The most impactful split point is the route: each page's code loads only when navigated to. The result is faster FCP and TTI, especially on slow connections.

---

**Q (High): How does `React.lazy` work internally?**

Answer: `React.lazy` takes a factory function that returns a Promise (the dynamic import). Internally, React stores this factory and tracks whether the Promise has resolved. When the lazy component is first rendered, React checks the status of the Promise. If it's pending, the component throws the Promise — this is the Suspense protocol. React catches the throw, renders the nearest `Suspense` fallback, and attaches a `.then` to the Promise. When the Promise resolves (module loaded), React re-renders the Suspense boundary with the actual component. If the Promise rejects (network error), the nearest error boundary catches it. The lazy component must default-export a React component — `React.lazy` can't handle named exports directly.

---

**Q (Medium): What's the difference between lazy loading a route vs lazy loading a component?**

Answer: Route-level splitting loads an entire page's worth of code only when that route is visited — the highest-impact split for most apps. Component-level splitting loads an individual component (a modal, a chart panel, a rich text editor) only when it's first rendered. Route-level splits are always worth doing; component-level splits are worth doing only for genuinely heavy components that aren't needed on initial render. Over-splitting creates waterfall fetches — each lazy component triggers a separate network request, and if they're rendered sequentially (parent needs to render before child lazy-loads), users see cascading spinners.

---

**Q (Medium): How would you handle the error case where a lazy-loaded chunk fails to fetch?**

Answer: Wrap the lazy component (and its `Suspense` boundary) in an error boundary. When `React.lazy`'s Promise rejects — due to a network failure or 404 — React propagates the error to the nearest error boundary. Without one, the error is unhandled and the component tree crashes. With an error boundary, you can show a retry UI or an error page. Additionally, you should consider adding a retry mechanism in the factory function — on mobile or flaky connections, a transient failure can often be recovered by refetching the chunk.

---

**Q (Low): Does `React.lazy` work with server-side rendering?**

Answer: Not directly. `React.lazy` relies on dynamic `import()`, which is asynchronous. Server rendering is traditionally synchronous — `renderToString` produces HTML in one pass and can't await a lazy import mid-render. React 18 with `renderToPipeableStream` (streaming SSR) does support Suspense on the server: lazy components are sent to the client progressively as their chunks load. However, most React SSR setups use framework-specific APIs — Next.js provides `next/dynamic` which handles both client-side code splitting and SSR fallbacks. Always check what your SSR framework supports before using `React.lazy` directly in a server-rendered app.

---

*Next: List Virtualization — code splitting reduces what you load; list virtualization reduces what you render. When a list has thousands of rows, rendering them all at once — even after fast loading — produces layout and paint bottlenecks.*
