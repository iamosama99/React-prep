# Streaming SSR

## Quick Reference

| Concept | What it is |
|---|---|
| Traditional SSR | Full HTML generated before any bytes sent — TTFB blocked on slowest data |
| Streaming SSR | Shell sent immediately, slow parts streamed as they resolve |
| `renderToPipeableStream` | Node.js streaming API (pipes to HTTP response) |
| `renderToReadableStream` | Web Streams API (Edge runtime compatible) |
| Suspense as streaming boundary | Each `<Suspense>` fallback is replaced by real content as it resolves |
| Shell | The synchronous portion of the page — rendered and sent first |

---

## Why Streaming SSR Exists

Classic SSR has a TTFB (Time to First Byte) problem: the server must wait for **all** data before it can send **any** HTML. If one query takes 800ms, the user waits 800ms for a blank page even though the header, navigation, and footer are ready in 5ms.

Streaming SSR sends the fast parts immediately and **streams** the slow parts as they arrive. The browser receives and renders the header instantly. A skeleton or spinner shows where the slow data will appear. When the data is ready, the server streams the real HTML inline — a small script swaps the skeleton for content without a full page reload.

The TTFB drops dramatically. The user sees something useful far sooner. The total load time may be the same, but perceived performance improves significantly.

---

## How It Works

Streaming SSR works by pairing React's `renderToPipeableStream` (or `renderToReadableStream`) with `<Suspense>` boundaries:

1. React renders synchronous parts of the tree → produces **shell HTML** → streams it immediately
2. Suspended parts show their `fallback` in the shell
3. As async work resolves (database calls, API fetches), React renders the real content and streams a chunk of HTML with an inline script that swaps the fallback for the real content
4. This continues until all Suspense boundaries have resolved

The browser never knows this is happening — it just receives a chunked HTTP response and progressively renders it.

---

## The APIs

### `renderToPipeableStream` (Node.js)

```tsx
import { renderToPipeableStream } from 'react-dom/server';
import { App } from './App';

function handler(req: Request, res: Response) {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/static/main.js'],

    onShellReady() {
      // Shell is ready — send status and start streaming
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      pipe(res);
    },

    onShellError(error) {
      // Shell itself failed — send fallback HTML
      res.statusCode = 500;
      res.send('<h1>Something went wrong</h1>');
    },

    onAllReady() {
      // All content is ready — useful for crawlers (non-streaming)
    },

    onError(error) {
      console.error(error);
    },
  });

  // Abort streaming after 10 seconds
  setTimeout(abort, 10_000);
}
```

`onShellReady` fires as soon as the synchronous shell is ready. `pipe(res)` starts the HTTP stream. Suspense boundaries resolve asynchronously and their chunks are written to the same response.

### `renderToReadableStream` (Edge / Web Streams)

```tsx
import { renderToReadableStream } from 'react-dom/server';

async function handler(request: Request): Promise<Response> {
  const stream = await renderToReadableStream(<App />, {
    bootstrapScripts: ['/main.js'],
  });

  // Optional: wait for all content (for crawlers)
  if (isCrawler(request)) {
    await stream.allReady;
  }

  return new Response(stream, {
    headers: { 'Content-Type': 'text/html' },
  });
}
```

`renderToReadableStream` returns a Web ReadableStream — compatible with the Fetch API Response, Cloudflare Workers, Deno, and other edge runtimes.

---

## Suspense as the Streaming Primitive

Without Suspense, streaming doesn't help much — the shell would be the entire page, and streaming would just be SSR with extra steps. Suspense lets you declare **which parts can be deferred**:

```tsx
export default function Page() {
  return (
    <html>
      <body>
        <Header />  {/* synchronous — in shell */}

        <Suspense fallback={<DashboardSkeleton />}>
          <Dashboard />  {/* async — streamed when ready */}
        </Suspense>

        <Suspense fallback={<FeedSkeleton />}>
          <ActivityFeed />  {/* async — streamed when ready */}
        </Suspense>

        <Footer />  {/* synchronous — in shell */}
      </body>
    </html>
  );
}
```

The browser receives `<Header>`, `<DashboardSkeleton>`, `<FeedSkeleton>`, and `<Footer>` immediately. As `Dashboard` and `ActivityFeed` resolve, React streams each replacement. They can resolve in any order — whichever is ready first streams first.

---

## Selective Hydration

React 18 streams not just HTML but also prioritizes **hydration**. When the full JS bundle loads, React starts hydrating the visible/ready parts. If the user clicks on something before it's hydrated, React prioritizes hydrating that component first — so clicks aren't lost, they're just slightly delayed.

This is transparent to your code but means interactive components become interactive as soon as possible, without waiting for the entire tree to hydrate.

---

## What Frameworks Manage for You

In Next.js (App Router), streaming is automatic:
- All `async` Server Components participate in streaming
- `loading.tsx` files create automatic Suspense boundaries around page content
- You don't write `renderToPipeableStream` manually

```
app/
  dashboard/
    page.tsx        ← async Server Component (streams)
    loading.tsx     ← shown immediately as fallback
```

The `loading.tsx` is essentially:

```tsx
<Suspense fallback={<Loading />}>
  <Page />
</Suspense>
```

---

> **Check yourself:** If a Suspense boundary's inner component throws an error (not a Promise), does streaming continue for other boundaries? Yes — each boundary is independent. The errored boundary catches its error (or passes it to the nearest Error Boundary), while other Suspense boundaries stream their content normally. Streaming is resilient to partial failures.

---

## Self-Assessment

- [ ] I can explain what TTFB problem streaming SSR solves
- [ ] I know the difference between `renderToPipeableStream` and `renderToReadableStream`
- [ ] I understand what "shell" means and when `onShellReady` fires
- [ ] I can describe how Suspense boundaries become streaming boundaries
- [ ] I know what selective hydration does and why it matters for interactivity

---

## Interview Q&A

**Q: What problem does streaming SSR solve compared to traditional SSR? `High`**

A: Traditional SSR blocks the entire response until all data is fetched and the full HTML tree is generated. If one database query takes 1 second, the user waits 1 second for a blank page. Streaming SSR sends the fast synchronous shell (header, nav, layout) immediately and streams slow sections as their data resolves. TTFB drops dramatically; users see meaningful content sooner even if total load time is similar.

---

**Q: How do Suspense boundaries enable streaming? `High`**

A: Each `<Suspense>` boundary divides the page into an independently streamable unit. The synchronous shell includes the boundary's `fallback`. When the async content inside resolves, React serializes that chunk of HTML and streams it to the browser with a small inline script that swaps the fallback for the real content. Multiple boundaries resolve independently and in any order.

---

**Q: What is the difference between `renderToPipeableStream` and `renderToReadableStream`? `Medium`**

A: `renderToPipeableStream` uses Node.js streams and pipes to a Node HTTP response — the traditional server environment. `renderToReadableStream` uses the Web Streams API (ReadableStream) and works in edge runtimes (Cloudflare Workers, Deno, Vercel Edge) that don't have Node.js streams. Same React features, different runtime target.

---

**Q: What is selective hydration? `Medium`**

A: With streaming SSR, different parts of the page arrive at different times and hydrate independently. React 18 prioritizes hydrating parts the user interacts with — if you click a button before its component has hydrated, React immediately hydrates that component first, then handles the click. User actions are queued rather than lost, and interactivity arrives as soon as possible for the parts users actually use first.

---

**Q: What does `onShellReady` vs `onAllReady` mean in `renderToPipeableStream`? `Low`**

A: `onShellReady` fires when the synchronous portion of the tree (above all Suspense boundaries) is ready to stream — this is when you start piping the response. `onAllReady` fires when the entire page, including all suspended content, is resolved. `onAllReady` is useful for crawlers and bots that can't handle streaming — you wait for everything before sending the response, giving them complete HTML.
