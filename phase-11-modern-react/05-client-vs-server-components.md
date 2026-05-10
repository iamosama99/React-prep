# Client vs Server Components

## Quick Reference

| | Server Component | Client Component |
|---|---|---|
| Directive | None (default) | `'use client'` at top of file |
| Runs on | Server only | Server (SSR) + browser |
| Hooks | ✗ | ✓ |
| Event handlers | ✗ | ✓ |
| Browser APIs | ✗ | ✓ |
| Direct data access | ✓ | ✗ |
| Zero client JS | ✓ | ✗ |

---

## The Mental Model

Think of the component tree as having two zones separated by a **boundary**:

```
[ Server Zone ]
  └─ Layout (SC)
       └─ Sidebar (SC)
       └─ ArticlePage (SC)
            └─ [ Client Zone — starts here ]
                 └─ LikeButton (CC) ← 'use client'
                      └─ Tooltip (CC) ← inherits client zone
```

**Server Zone** — components without `'use client'`. Run only on server. Zero client JS.

**Client Zone** — starts at the first `'use client'` file. Everything below that point (all its imports and children that aren't explicitly server-rendered and passed as props) is client JS.

The key rule: **the boundary is one-directional**. Server components can render client components. Client components cannot render server components by importing them — but a parent server component can pass a server-rendered subtree into a client component via `children` or a slot prop.

---

## The `'use client'` Directive

```tsx
'use client'; // must be the very first line, before imports

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

`'use client'` is a **module boundary marker**, not a per-component switch. Every component in this file becomes a Client Component. Every module imported by this file is also pulled into the client bundle (unless it's imported conditionally or in a separate entry point).

---

## Composing Server and Client Components

### Pattern 1: Server renders shell, client handles interaction

```tsx
// app/product/[id]/page.tsx — Server Component
import { AddToCartButton } from '@/components/AddToCartButton'; // Client Component

async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id); // server-side DB call

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} price={product.price} />
    </div>
  );
}
```

The static parts (name, description) are Server Component output — zero JS. Only the button is interactive and shipped as client JS.

### Pattern 2: Pass server-rendered content into a client component via `children`

```tsx
// ClientWrapper.tsx
'use client';
import { useState } from 'react';

export function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}>Toggle</button>
      {open && children}
    </div>
  );
}
```

```tsx
// page.tsx — Server Component
import { Collapsible } from './ClientWrapper';

export default async function Page() {
  const data = await fetchExpensiveData();

  return (
    <Collapsible>
      <ServerRenderedContent data={data} /> {/* Server Component */}
    </Collapsible>
  );
}
```

`<ServerRenderedContent>` is rendered on the server and passed as the RSC payload (serialized data). `<Collapsible>` never imports or knows about `ServerRenderedContent` — it just receives React nodes as children. This is how you pass server output into a client shell.

---

## Decision Guide: When to Use Each

| Requirement | Use |
|---|---|
| Fetch data from database/filesystem | Server Component |
| Use `useState`, `useReducer` | Client Component |
| Use `useEffect` | Client Component |
| Handle user events (click, change) | Client Component |
| Access `window`, `localStorage`, `document` | Client Component |
| Import server-only secrets/credentials | Server Component |
| Render based on auth session server-side | Server Component |
| Animated or interactive UI | Client Component |
| Large static content (markdown, reports) | Server Component |

---

## Common Mistakes

**Moving too much to client.** A form with one interactive input doesn't need to be a Client Component — only the input and submit button do. Extract just the interactive parts.

**Putting `'use client'` at the top of every file.** Defeats the point. Start every component as a Server Component; only add `'use client'` when you actually need hooks or events.

**Trying to import a Server Component inside a Client Component.** The bundler will error or silently promote the server component to a client one. Pass server output via `children` instead.

**Passing non-serializable props across the boundary.** Functions can't be passed from Server to Client components as props (they can't be serialized in the RSC payload). If you need a callback, define it in the Client Component.

> **Check yourself:** You have a `<UserAvatar>` that just renders a `<img>` tag. It has no state, no events, no hooks. Should it be a Server Component or Client Component? Server Component — there's no reason to ship its code to the browser. It can fetch the user's avatar URL directly if needed and renders pure markup.

---

## Context in RSC

Server Components **cannot consume** context (no `useContext`). But a Client Component provider can still wrap server-rendered children:

```tsx
// theme-provider.tsx
'use client';
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>
);
```

```tsx
// layout.tsx — Server Component
import { ThemeProvider } from './theme-provider';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
```

Server components inside `{children}` render on the server; they just can't read the context value. Only Client Components in the tree can call `useContext(ThemeContext)`.

---

## Self-Assessment

- [ ] I can explain what `'use client'` does (module boundary, not per-component)
- [ ] I know the direction of the import rule (SC → CC allowed, CC → SC not allowed)
- [ ] I understand how to pass server-rendered output into a Client Component via `children`
- [ ] I can make a correct SC vs CC decision for a given component requirement
- [ ] I know why context can be provided by a Client Component but not consumed by a Server Component

---

## Interview Q&A

**Q: What does `'use client'` mean and what does it affect? `High`**

A: `'use client'` is a module boundary marker, not a component-level switch. It tells the bundler that this file and everything it imports is client-side code. All components in the file become Client Components. Everything below this boundary is included in the client JavaScript bundle and hydrated in the browser.

---

**Q: Can a Client Component render a Server Component? `High`**

A: Not by importing it directly — the import would pull the server module into the client bundle. But a parent Server Component can pass a server-rendered subtree into a Client Component as `children`. The client component receives serialized React nodes (already rendered by the server) and can render them without knowing they came from the server. This is the standard pattern for interactive shells around server-rendered content.

---

**Q: How do you decide which components should be server vs client? `High`**

A: Start everything as a Server Component (the default). Reach for `'use client'` only when you need: hooks (`useState`, `useEffect`, etc.), event handlers, browser APIs, or third-party libraries that rely on those. Extract only the interactive parts to minimize client JS — the containing layout, data-fetching, and static rendering stay on the server.

---

**Q: Why can Server Components not consume React context? `Medium`**

A: Hooks, including `useContext`, require a React client runtime with a fiber tree and dispatcher. Server Components run as plain async functions on the server — there's no React renderer managing their execution context. You can wrap server-rendered children with a Client Component context provider; only Client Components in the tree can read that context.

---

**Q: What happens if you accidentally import a heavy library in a Client Component? `Low`**

A: The library is included in the client JS bundle and shipped to every user. This can significantly increase bundle size and time-to-interactive. The fix: move the import to a Server Component (which ships zero JS), or use dynamic import with `{ ssr: false }` to defer loading. Tools like `@next/bundle-analyzer` can catch this.
