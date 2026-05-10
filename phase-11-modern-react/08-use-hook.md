# The `use()` Hook

## Quick Reference

| Feature | Detail |
|---|---|
| Purpose | Read a Promise or Context value inside a component |
| Can call conditionally | Yes — unlike other hooks |
| Works in Server Components | Promises yes, Context no (Server Components can't consume context) |
| Works in Client Components | Yes — both Promises and Context |
| Throws on rejection | Yes — use with Error Boundary |
| Suspends on pending | Yes — use with Suspense boundary |

---

## Why `use()` Exists

Before `use()`, two rules were absolute:
1. You must call hooks at the top level — no conditionals, no loops
2. You read context with `useContext(ctx)` and Promises with `await` (only in server components or `useEffect`)

`use()` breaks both constraints in a controlled way. It's a **read primitive** — it reads a value from a Promise or a Context, and it can be called conditionally because React treats it differently from other hooks.

---

## Reading a Promise

The primary use case: pass a Promise to `use()` and read its resolved value. If the Promise is still pending, the component suspends (same mechanism as Suspense for data fetching). If the Promise rejects, it throws — caught by an Error Boundary.

```tsx
'use client';
import { use, Suspense } from 'react';

interface User {
  id: string;
  name: string;
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved
  return <p>{user.name}</p>;
}

// Parent creates the promise and passes it down
function Page() {
  const userPromise = fetchUser('42'); // Promise created outside component

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

The Promise must be **created outside** the component (or memoized). If you create it inside the component body, a new Promise is created every render — `use()` would re-suspend every time.

---

## Conditional Usage

This is the key difference from `useContext`: `use()` can be called inside conditionals and loops:

```tsx
function Component({ shouldFetch, dataPromise }: Props) {
  if (!shouldFetch) {
    return <p>Nothing to show</p>;
  }

  // Legal — `use` can be called conditionally
  const data = use(dataPromise);
  return <p>{data.value}</p>;
}
```

This is possible because `use()` is not tracked in the hooks fiber chain the same way `useState` and `useEffect` are. React handles it specially.

---

## Reading Context

`use()` also replaces `useContext()` — with the added benefit of being callable conditionally:

```tsx
'use client';
import { use } from 'react';
import { ThemeContext } from './ThemeContext';

function ThemedButton({ variant }: { variant?: 'primary' | 'ghost' }) {
  if (variant === 'ghost') {
    // Only read theme for non-ghost buttons
    return <button className="ghost">Ghost</button>;
  }

  const theme = use(ThemeContext); // conditionally called — legal with `use`
  return <button style={{ background: theme.primary }}>Primary</button>;
}
```

Equivalent to `useContext(ThemeContext)` but without the "must be at top level" constraint.

---

## Server Component Pattern: Promise as Prop

One of the most useful RSC patterns — start a fetch in a Server Component, pass the Promise to a child for `use()`. This enables parallel data fetching without awaiting:

```tsx
// app/dashboard/page.tsx — Server Component
import { Suspense } from 'react';
import { UserCard } from './UserCard';
import { StatsPanel } from './StatsPanel';

export default function DashboardPage() {
  // Both fetches start in parallel — no await here
  const userPromise = fetchUser();
  const statsPromise = fetchStats();

  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserCard promise={userPromise} />
      </Suspense>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel promise={statsPromise} />
      </Suspense>
    </div>
  );
}

// UserCard.tsx — Client Component
'use client';
import { use } from 'react';

export function UserCard({ promise }: { promise: Promise<User> }) {
  const user = use(promise);
  return <div>{user.name}</div>;
}
```

Both fetches run in parallel. Each `<Suspense>` boundary resolves independently. No waterfall.

---

## Error Handling

When a Promise passed to `use()` rejects, the component re-renders with the rejection as a thrown error. Wrap with an Error Boundary:

```tsx
<ErrorBoundary fallback={<p>Failed to load</p>}>
  <Suspense fallback={<p>Loading...</p>}>
    <ComponentUsingUse promise={maybeRejectingPromise} />
  </Suspense>
</ErrorBoundary>
```

---

## `use()` vs `await` in Server Components

| | `use()` | `await` |
|---|---|---|
| Works in Client Components | Yes | No |
| Works in Server Components | Yes | Yes |
| Conditional calls | Yes | Yes (it's just code) |
| Suspends via boundary | Yes | Yes (via Suspense) |
| Preferred in | Client Components | Server Components |

In Server Components, `await` is usually clearer. `use()` shines in Client Components where `await` isn't available in the component body.

---

> **Check yourself:** Why must the Promise passed to `use()` be created outside the component (or memoized)? Because a new Promise object created inside the component body is a different reference on every render. When React re-renders after a suspension, it calls render again — if a new Promise is created, React suspends again, creates another render, another Promise, and so on: an infinite suspend loop. The Promise must be stable across renders.

---

## Self-Assessment

- [ ] I understand that `use()` can be called conditionally, unlike other hooks
- [ ] I know that the Promise passed to `use()` must be created outside (or memoized) to avoid infinite suspension
- [ ] I can use `use()` to read Context — and know it's equivalent to `useContext` but more flexible
- [ ] I understand the Server Component pattern of passing a Promise as a prop for parallel data fetching
- [ ] I know that `use()` on a rejected Promise throws — requires an Error Boundary

---

## Interview Q&A

**Q: What does the `use()` hook do and how is it different from other hooks? `High`**

A: `use()` reads a value from a Promise or a Context. Unlike all other hooks, it can be called conditionally and inside loops. For Promises: if pending, the component suspends; if rejected, it throws; if resolved, it returns the value. For Context: it's equivalent to `useContext()` but without the top-level-only constraint.

---

**Q: Why must a Promise passed to `use()` be created outside the component? `High`**

A: React may call the component's render function multiple times while suspended. If the Promise is created inside render, each call produces a new Promise — React suspends on it, re-renders, creates another new Promise, and loops forever. The Promise must be stable (created in a parent, a module scope, or memoized) so React always suspends on the same Promise and knows when it resolves.

---

**Q: How does passing a Promise as a prop enable parallel data fetching? `Medium`**

A: A Server Component can start multiple fetches simultaneously (without `await`) and pass each Promise to a different child component. Each child uses `use(promise)` and suspends independently. Wrapping each child in its own `<Suspense>` boundary means they resolve in parallel — whichever data arrives first shows first, without either waiting for the other.

---

**Q: When would you use `use(context)` instead of `useContext(context)`? `Low`**

A: When you need to read context conditionally — for example, only reading a theme context when rendering a specific variant, or only reading user context when a prop indicates the user is logged in. `useContext` must be called unconditionally at the top level. `use` can be called inside an `if` branch, making it the right tool when context reading is optional.
