# Hydration

## Quick Reference

| Concept | What it means |
|---|---|
| Hydration | Attaching React event handlers to server-rendered HTML |
| Mismatch error | Server HTML differs from what client would render — React warns/throws |
| `suppressHydrationWarning` | Silences mismatch warnings for intentional differences (e.g., timestamps) |
| Selective hydration | React 18 hydrates parts of the page independently as they arrive |
| Partial hydration | Only some components hydrate — Islands Architecture |
| `hydrateRoot` | React 18's hydration API (replaces `ReactDOM.hydrate`) |

---

## Why Hydration Exists

SSR gives you fast initial HTML — the user sees content immediately. But that HTML is inert: no event handlers, no React state, no interactivity. To make it interactive, React needs to "attach" to the DOM. This attachment process is **hydration**.

Hydration is fundamentally different from a client-render. In a client-render, React creates DOM nodes from scratch. In hydration, React **walks the existing DOM** and attaches its event system to the nodes that are already there — without re-creating them. This is what makes SSR efficient: the browser doesn't re-parse and repaint the whole page, just subscribes to events.

---

## How Hydration Works

```tsx
// Server — generates HTML
import { renderToPipeableStream } from 'react-dom/server';
renderToPipeableStream(<App />, { bootstrapScripts: ['/bundle.js'] });

// Client — hydrates the existing HTML
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root')!, <App />);
```

React walks the server-rendered HTML and your React component tree **in lockstep**. For each DOM node it expects from the component tree, it checks that the corresponding server HTML matches. Event listeners are attached as React walks. Once complete, the page is fully interactive.

---

## Hydration Mismatches

A mismatch happens when the HTML the server rendered and the HTML React would render on the client differ. React detects this during hydration, logs a warning, and in severe cases **replaces the server HTML with a client render** — defeating the purpose of SSR.

```
Warning: Text content did not match.
  Server: "2026-05-09"
  Client: "2026-05-10"
```

**Common causes:**

1. **Timestamps / "now" values** — server renders the time when it processes the request; client renders the time when JS runs (always different)

2. **`window`/`document` checks** — code that branches based on browser APIs runs differently on server (where `window` is undefined) vs client

3. **Random values** — `Math.random()` produces different values on server and client

4. **User-agent / screen size** — server doesn't know the client's viewport

5. **Locale-dependent output** — date/number formatting that differs by environment

---

## Fixing Mismatches

### `suppressHydrationWarning`

For intentional mismatches (like timestamps that can't be server-accurate):

```tsx
<span suppressHydrationWarning>{new Date().toLocaleString()}</span>
```

This silences the warning for this element only. React still uses the server HTML — it just doesn't warn. Use sparingly.

### Defer rendering until mounted

For content that must be client-only:

```tsx
'use client';
import { useState, useEffect } from 'react';

function ClientOnlyContent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // matches server output

  return <div>{window.innerWidth}px wide</div>;
}
```

The server renders `null` (matching `!mounted`). After hydration, `useEffect` fires, `mounted` becomes true, and the real content renders client-side.

### `dynamic` with `ssr: false` (Next.js)

```tsx
import dynamic from 'next/dynamic';

const ClientOnlyChart = dynamic(() => import('./Chart'), { ssr: false });
```

The component is excluded from SSR entirely. The server renders nothing; the client renders after JS loads.

---

## React 18: Selective Hydration

In React 18 with streaming SSR, different parts of the page arrive at different times. React hydrates them **independently** and **in priority order**:

- Parts that arrived in the initial shell hydrate first
- Streamed parts hydrate as they arrive
- If the user interacts with an unhydrated part, React **prioritizes hydrating that part immediately** — the click/keypress is queued and replayed once hydrated

This means users can interact with the page before full hydration — interactions on fast-to-hydrate components work immediately while slow subtrees finish hydrating in the background.

---

## Partial Hydration (Islands Architecture)

Beyond React 18's selective hydration, some frameworks (Astro, Fresh) implement "Islands Architecture": most of the page is static HTML with no React runtime. Only designated interactive "islands" are hydrated. The rest is pure HTML — zero JS overhead.

React's RSC model moves toward this: Server Components ship zero JS (no hydration needed), only Client Components hydrate.

---

## The Cost of Hydration

Hydration is not free:

1. **Download** — the full component bundle must be downloaded before hydration starts
2. **Parse and compile** — JS engine parses and JIT-compiles the bundle
3. **Execute** — React walks the entire tree, diffing against the DOM

On low-end mobile devices, hydration of a large page can take 1–3 seconds. During this time, the page looks interactive (server HTML is visible) but isn't — clicks may be lost or delayed. This gap between "looks interactive" (Time to First Contentful Paint) and "is interactive" (Time to Interactive) is one of the core problems RSC and streaming SSR are designed to reduce.

> **Check yourself:** Why can't React just skip the tree-walking step during hydration and trust that the server HTML is correct? Because React needs to attach internal references (fiber nodes, event handlers, state) to each DOM node. It can't do this without walking the tree. The diff is a side effect of that walk — but it's also a correctness check that catches server/client inconsistencies before they cause silent bugs.

---

## Self-Assessment

- [ ] I can explain what hydration does (attaches event handlers, doesn't repaint)
- [ ] I know the most common causes of hydration mismatches
- [ ] I know three ways to fix or suppress mismatches
- [ ] I understand what selective hydration is in React 18
- [ ] I can explain why there's a gap between FCP and TTI (Time to Interactive)

---

## Interview Q&A

**Q: What is hydration and why is it necessary? `High`**

A: Hydration is the process of attaching React's event system to server-rendered HTML. The server sends fully-formed HTML for fast initial display, but that HTML has no event listeners. The client downloads the JS bundle, React walks the existing DOM in parallel with the component tree, attaches listeners to each node, and initializes React state. After hydration, the page is fully interactive without re-painting the DOM.

---

**Q: What causes a hydration mismatch and what are the consequences? `High`**

A: A mismatch happens when the HTML the server rendered differs from what React would render on the client. Common causes: timestamps, `Math.random()`, browser-only APIs (`window.innerWidth`), or locale-dependent formatting. In React 18, mismatches cause a warning and React falls back to a client render for the mismatched subtree — discarding the server HTML and re-rendering from scratch, negating the SSR benefit for that part.

---

**Q: How do you handle content that is intentionally different between server and client? `High`**

A: Three options: (1) `suppressHydrationWarning` on the element — silences the warning, keeps server HTML until first re-render; (2) use `useEffect` + `useState(false)` to render `null` on server and the real content after mount; (3) Next.js `dynamic(..., { ssr: false })` to exclude the component from SSR entirely. Choose based on whether the initial server render is useful to show.

---

**Q: What is selective hydration in React 18? `Medium`**

A: React 18 hydrates parts of the page independently as they arrive via streaming SSR. If the user clicks on an unhydrated component, React immediately prioritizes hydrating that component, queues the click, and replays it. This eliminates "dead" interactions during the hydration phase — components become interactive as soon as their code loads, without waiting for the entire tree to hydrate.

---

**Q: What is the gap between FCP and TTI, and how does it relate to hydration? `Medium`**

A: FCP (First Contentful Paint) is when the user sees content — with SSR, this happens as soon as the server HTML arrives. TTI (Time to Interactive) is when the page responds to user input — this requires hydration to complete. On large pages with heavy JS, this gap can be seconds. During the gap, the page looks interactive but isn't — clicks may be lost. Streaming SSR + selective hydration + RSC (reducing JS sent) all narrow this gap.
