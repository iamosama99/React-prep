# Suspense for Data Fetching

## Quick Reference

| Concept | Mechanism |
|---|---|
| How a component suspends | Throws a Promise during render |
| What React does | Catches the throw, renders `fallback`, re-renders when Promise resolves |
| Error handling | Combine with an Error Boundary above the Suspense boundary |
| Nested Suspense | Inner boundaries catch before outer ones — fine-grained loading states |
| Waterfall risk | Sequential suspensions; fix with `Promise.all` or parallel data loading |

---

## Why Suspense for Data Fetching Exists

Before Suspense, every data-fetching component had to manage three states manually: loading, error, and data. This logic was repetitive and scattered across the component tree. More importantly, orchestrating **multiple loading states** was messy — do you show a spinner for each piece? One spinner for all? `isLoading && !isError && data` conditions proliferated.

Suspense inverts this. Instead of each component managing its own loading UI, you declare loading boundaries in your JSX tree. Components just render — if their data isn't ready yet, they suspend, and React automatically shows the boundary's fallback.

The result is cleaner component code and more predictable loading UX.

---

## The Mechanism: Throwing Promises

The protocol React uses is simple: during render, if a component throws a **Promise**, React treats it as a suspension. React walks up the tree to find the nearest `<Suspense>` boundary, renders its `fallback`, and subscribes to the thrown Promise. When the Promise resolves, React re-renders the suspended subtree.

```tsx
// What a suspense-compatible cache looks like internally
const cache = new Map<string, { status: string; result: any; promise: Promise<any> }>();

function fetchUser(id: string) {
  if (!cache.has(id)) {
    const entry: any = { status: 'pending' };
    entry.promise = fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => { entry.status = 'success'; entry.result = data; })
      .catch(err => { entry.status = 'error'; entry.result = err; });
    cache.set(id, entry);
  }

  const entry = cache.get(id)!;
  if (entry.status === 'pending') throw entry.promise;  // suspend
  if (entry.status === 'error') throw entry.result;     // error boundary
  return entry.result;                                  // data ready
}

function UserProfile({ id }: { id: string }) {
  const user = fetchUser(id); // might throw — that's fine
  return <div>{user.name}</div>;
}
```

You almost never write this cache yourself — React Query, SWR, and Next.js handle it for you.

> **Check yourself:** Why does the resource need to be cached outside the component? Because React may call `render` multiple times while a component is suspended. If the fetch was created inside the component, each render would start a new fetch. The cached pending Promise ensures React always gets the same Promise back and only fetches once.

---

## Usage Pattern

```tsx
import { Suspense } from 'react';

function App() {
  return (
    <ErrorBoundary fallback={<p>Something went wrong</p>}>
      <Suspense fallback={<p>Loading user...</p>}>
        <UserProfile id="42" />
      </Suspense>
    </ErrorBoundary>
  );
}
```

The `<ErrorBoundary>` catches thrown errors (non-Promise throws). The `<Suspense>` catches thrown Promises. You typically nest them: ErrorBoundary above, Suspense below.

---

## Nested Boundaries

Multiple boundaries give you granular loading states:

```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<FeedSkeleton />}>
    <Feed />
  </Suspense>
  <Suspense fallback={<SidebarSkeleton />}>
    <Sidebar />
  </Suspense>
</Suspense>
```

`Feed` and `Sidebar` load in parallel and show their own skeletons. The outer boundary only shows `<PageSkeleton />` if `Header` suspends. This matches exactly how the UX designer drew the loading states.

---

## The Waterfall Problem

Sequential Suspense creates a waterfall — each component waits for the previous one to resolve before it even starts fetching:

```
UserProfile suspends → resolves → renders UserPosts
UserPosts suspends   → resolves → renders Comments
```

3 round trips, no parallelism. The fix: **start all fetches before rendering** and let them resolve in parallel.

```tsx
// ✅ Framework pattern: loader starts all fetches in parallel
async function loader() {
  const [user, posts] = await Promise.all([
    fetchUser(id),
    fetchPosts(id),
  ]);
  return { user, posts };
}
```

Or use a "render-as-you-fetch" approach where the fetch is initiated at the same time as the navigation, not inside the component's render.

---

## Suspense + React 18 Streaming

In a server-rendered app, Suspense boundaries double as **streaming boundaries**. React sends the HTML for the non-suspended parts first (the shell), then streams each suspended subtree's HTML as it resolves, along with a small script to swap the skeleton for the real content.

This gives fast TTFB (time to first byte) without blocking on slow data.

---

## `React.lazy` vs Data Suspense

| | `React.lazy` | Data Suspense |
|---|---|---|
| Suspends on | Code chunk download | Data fetch |
| Works in React 17? | Yes | No (officially) |
| Framework support needed? | No | Yes (or a compatible library) |
| Use case | Code splitting | Server data loading |

Both use the same mechanism (thrown Promise). `React.lazy` is just the built-in library for one specific case.

> **Check yourself:** What happens if a component inside a `<Suspense>` boundary throws a regular `Error` (not a Promise)? React looks for the nearest Error Boundary, not the Suspense boundary — they handle different throw types. If there's no Error Boundary, the error propagates up and eventually crashes the app.

---

## Self-Assessment

- [ ] I can explain the thrown-Promise mechanism without hand-waving
- [ ] I understand why the cache must live outside the component
- [ ] I know how to combine `<Suspense>` with an `<ErrorBoundary>`
- [ ] I can describe the waterfall problem and how to prevent it
- [ ] I know the difference between `React.lazy` Suspense and data Suspense

---

## Interview Q&A

**Q: How does Suspense for data fetching work mechanically? `High`**

A: During render, if a component throws a Promise, React catches it, finds the nearest Suspense boundary, renders its `fallback`, and subscribes to the thrown Promise. When the Promise resolves, React re-renders the suspended subtree. The component code reads data synchronously — the complexity of the async wait is handled by the framework or cache layer, not by the component.

---

**Q: What is the waterfall problem with Suspense? `High`**

A: When nested components each fetch their own data, the fetches happen sequentially — each component can't start until its parent resolves. Three nested fetches become three serial round trips. The fix is to initiate all fetches in parallel before rendering begins (in a loader function, or by kicking off fetches at the call site before navigating). React Query and Next.js loaders are both designed to enable this.

---

**Q: Why must a Suspense-compatible resource cache its Promise outside the component? `Medium`**

A: React calls render multiple times while a component is suspended. If the fetch were created inside the component, each render call would start a new request. The cache guarantees that the same Promise is returned every time, so React knows the request is already in flight and can subscribe to its resolution without duplicating work.

---

**Q: How does Suspense interact with Error Boundaries? `Medium`**

A: They're complementary. Suspense catches thrown Promises (pending state). Error Boundaries catch thrown errors (failure state). Typically you nest them: Error Boundary as the outer wrapper, Suspense inside it. When a suspended fetch rejects, React re-renders the component — which now throws an Error rather than a Promise — and the Error Boundary catches it.

---

**Q: What is "render as you fetch" and how does it avoid waterfalls? `Low`**

A: "Render as you fetch" means starting the data fetch at the moment of navigation — not inside the component during render. The component renders immediately and suspends if the data isn't ready, but since the fetch started earlier, it resolves sooner. Combined with parallel fetches (Promise.all), this eliminates both waterfalls and the delay caused by waiting for the component tree to even start rendering before fetching.
