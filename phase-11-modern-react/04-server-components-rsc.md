# Server Components (RSC)

## Quick Reference

| Property | Server Components | Client Components |
|---|---|---|
| Where they run | Server only | Browser (and server during SSR) |
| JS shipped to client | Zero | Yes |
| Can use hooks | No | Yes |
| Can read files/DB directly | Yes | No |
| Can be async | Yes | No (not yet) |
| Default in Next.js App Router | Yes | Opt-in with `'use client'` |

---

## Why Server Components Exist

Traditional SSR (including Next.js Pages Router) works like this:
1. Server runs component code to generate HTML
2. That same component code is **also sent to the client** for hydration
3. The client downloads and parses all that JavaScript before the page becomes interactive

This means you pay for every component twice: once in CPU on the server, once in bytes shipped to the browser. Libraries imported by server-only code (markdown parsers, database clients, heavy utility libraries) are bundled into the client JS bundle even though the client never needs them.

React Server Components break this. A Server Component runs **only on the server**. Its output is a serialized representation (not HTML — more like a JSON description of the React tree) that is sent to the client. The client receives the rendered UI without receiving the component code or its dependencies. Zero JavaScript shipped for server components.

---

## What Server Components Can and Cannot Do

**Can do:**
- `async/await` directly in the component
- Read from databases, file systems, environment variables
- Import server-only packages (they never reach the client bundle)
- Render client components (by including them in their JSX)
- Access request headers, cookies (in framework-specific ways)

**Cannot do:**
- Use any hook (`useState`, `useEffect`, etc.) — hooks require a client runtime
- Attach event handlers (`onClick`, `onChange`)
- Use browser APIs (`window`, `document`, `localStorage`)
- Use context (they can provide it, but not consume it via `useContext`)

```tsx
// app/user/[id]/page.tsx — this is a Server Component by default in Next.js
import { db } from '@/lib/database'; // server-only — never reaches client bundle

async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.users.findById(params.id); // direct DB call, no API route needed

  return (
    <main>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
      <LikeButton userId={user.id} /> {/* Client Component */}
    </main>
  );
}

export default UserPage;
```

The `db` import is never included in the client bundle. The `user` data is fetched at render time on the server. Only `<LikeButton>` (which needs `onClick`) becomes client-side JS.

---

## Async Components

One of the biggest ergonomic wins: Server Components can be `async` functions. No `useEffect`, no loading state, no error handling boilerplate — just `await`:

```tsx
async function ProductList() {
  const products = await fetchProducts(); // direct async call in render

  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>{p.name} — ${p.price}</li>
      ))}
    </ul>
  );
}
```

If this component is wrapped in a `<Suspense>` boundary, React will show the fallback while the async work completes.

---

## The RSC Wire Format

Server Components don't send HTML — they send a **React tree description** (sometimes called the RSC payload or flight format). It's a serialized format that includes:

- Which components rendered
- Their props (must be serializable — no functions, no class instances)
- Slots where Client Components should be hydrated

The client's React runtime interprets this format and builds the component tree, merging server-rendered content with client components. This is why you can pass Server Component output as `children` to a Client Component — the server-rendered JSX arrives as serialized data, not as code.

---

## Props Must Be Serializable

Because RSC data crosses a process boundary (server → client wire format), all props passed from Server Components to Client Components must be **serializable**:

```tsx
// ✅ Serializable — strings, numbers, objects, arrays, JSX
<ClientComponent name="Alice" count={5} data={{ x: 1 }} />

// ✅ JSX is serializable as part of the RSC payload
<ClientComponent header={<ServerHeader />} />

// ❌ Not serializable — functions can't cross the wire
<ClientComponent onClick={() => console.log('hi')} />
// (functions defined in Client Components and passed down are fine — different flow)
```

---

## Server-Only Packages

The `server-only` npm package throws a build error if it's imported in a Client Component:

```tsx
import 'server-only'; // ensures this module never reaches the client bundle
import { getSecret } from './secrets';
```

Similarly, `client-only` prevents a module from being imported in Server Components.

---

## Common Misconceptions

**"Server Components are just SSR."** No — SSR generates HTML on the server but ships the component JS to the client for hydration. Server Components ship zero JS for the component itself. SSR and RSC are orthogonal; Next.js uses both together.

**"Server Components replace API routes."** Partially — for read operations, a Server Component can query the database directly. But you still need API routes or Server Actions for mutations from the browser.

**"Server Components are slower."** Generally the opposite — they eliminate round trips (client → API → database) and eliminate hydration cost for static UI.

> **Check yourself:** Can a Server Component import a Client Component? Yes — and this is the normal pattern. The Server Component renders the Client Component's "slot" in the RSC payload; the client hydrates only the Client Component part. Can a Client Component import a Server Component? No — once you're in client code, you can't go back to server-only rendering. The only way to pass Server Component output into a Client Component is via `children` props passed from a parent Server Component.

---

## Self-Assessment

- [ ] I can explain what "zero JS shipped" means and why it's true for Server Components
- [ ] I know which capabilities are unavailable in Server Components (hooks, events, browser APIs)
- [ ] I understand why Server Component props must be serializable
- [ ] I know the direction of the import boundary: Server → Client is fine, Client → Server is not
- [ ] I can distinguish RSC from SSR clearly

---

## Interview Q&A

**Q: What are React Server Components and what problem do they solve? `High`**

A: Server Components run exclusively on the server and send a serialized tree description (not HTML, not component code) to the client. The client receives the rendered output without receiving the component's JavaScript or its dependencies. This eliminates the bundle cost of server-only code (database clients, heavy utilities) and avoids the extra API round trip between the client and data source.

---

**Q: What can't you do in a Server Component? `High`**

A: You can't use hooks, attach event handlers, use browser APIs, or consume React context. These all require a client-side runtime. You also can't use class components. The constraint is absolute — if you need interactivity, you extract that piece into a Client Component and pass it as a child.

---

**Q: What is the RSC wire format and why does it matter? `Medium`**

A: The RSC wire format (sometimes called the "flight" format) is a serialized description of the React tree — not HTML, not JavaScript. It tells the client how to construct the component tree, including placeholders where Client Components should hydrate. Because it's a data format (not code), server-only modules are never included. Props must be serializable (JSON-compatible values, JSX) — functions can't cross this boundary.

---

**Q: How do Server Components interact with Suspense? `Medium`**

A: Async Server Components integrate naturally with Suspense. Wrap an async Server Component in a `<Suspense>` boundary; React shows the fallback while the `await` in the server component resolves. With streaming SSR, React sends the HTML shell immediately and streams each resolved Suspense boundary's HTML as it completes — the user sees progressively more content rather than waiting for the slowest query.

---

**Q: Can a Client Component import a Server Component? `Low`**

A: No. Once you cross into client code, you can't pull in server-only modules — the build system enforces this. The valid pattern is the inverse: a Server Component renders a Client Component and passes server-rendered output as `children`. The children arrive in the RSC payload as serialized data, so the Client Component can render them without knowing they came from the server.
