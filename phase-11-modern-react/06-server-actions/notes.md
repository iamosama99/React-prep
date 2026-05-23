# Server Actions

## Quick Reference

| Concept | Detail |
|---|---|
| Directive | `'use server'` at top of file or inside an async function |
| Execution | Always runs on the server — never in the browser |
| Transport | RPC-style: browser calls it like a function, framework serializes to POST |
| Use cases | Form submissions, mutations, any write operation |
| Progressive enhancement | Form works without JS if action is a Server Action |
| Security | Never trust client-provided data; validate and authorize on the server |

---

## Why Server Actions Exist

Before Server Actions, a browser mutation had three layers:
1. A client-side event handler (`onClick`, `onSubmit`)
2. A `fetch` call to an API route
3. The API route handler that did the actual work

Server Actions collapse this into one: you write an `async` function that runs on the server, and call it from the client like a regular function. The framework handles the HTTP transport transparently.

This isn't magic — it's RPC (Remote Procedure Call). Under the hood, calling a Server Action triggers a POST request to a framework-managed endpoint. The arguments are serialized (must be serializable — same rules as RSC props), sent to the server, the function runs, and the result is returned. But from the code's perspective, it looks like a local function call.

---

## Defining Server Actions

### Option 1: File-level directive (all exports are actions)

```tsx
// app/actions/user.ts
'use server';

import { db } from '@/lib/database';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function updateUsername(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  const username = formData.get('username') as string;

  if (!username || username.length < 3) {
    return { error: 'Username must be at least 3 characters' };
  }

  await db.users.update({ where: { id: session.userId }, data: { username } });
  revalidatePath('/profile');
}
```

### Option 2: Inline in a Server Component

```tsx
// app/profile/page.tsx — Server Component
async function ProfilePage() {
  async function handleUpdate(formData: FormData) {
    'use server'; // inline — only this function is a Server Action
    const name = formData.get('name') as string;
    await updateUserName(name);
    revalidatePath('/profile');
  }

  return (
    <form action={handleUpdate}>
      <input name="name" />
      <button type="submit">Save</button>
    </form>
  );
}
```

---

## Wiring to a Form

The cleanest integration: pass a Server Action directly to a `<form>`'s `action` attribute. This works **without JavaScript** (progressive enhancement) — the browser submits a standard form POST, the server runs the action, and the page reloads.

```tsx
<form action={updateUsername}>
  <input name="username" placeholder="New username" />
  <button type="submit">Update</button>
</form>
```

With JS loaded, React intercepts the submit, serializes the `FormData`, and calls the action as an RPC call — no full page reload.

---

## `useFormStatus` and `useFormState` / `useActionState`

For client-side feedback during a Server Action submission:

```tsx
'use client';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

`useFormStatus` must be inside a child of the `<form>` — it reads the form's submission state via context.

For tracking the action's return value (e.g., error messages):

```tsx
'use client';
import { useActionState } from 'react'; // React 19 / Next.js 14+

function ProfileForm({ updateAction }: { updateAction: (prev: any, fd: FormData) => Promise<any> }) {
  const [state, formAction, isPending] = useActionState(updateAction, null);

  return (
    <form action={formAction}>
      {state?.error && <p className="error">{state.error}</p>}
      <input name="username" />
      <button type="submit" disabled={isPending}>Save</button>
    </form>
  );
}
```

---

## Calling Server Actions from Event Handlers

Server Actions aren't limited to forms — you can call them programmatically:

```tsx
'use client';
import { likePost } from '@/app/actions/posts';

function LikeButton({ postId }: { postId: string }) {
  async function handleClick() {
    await likePost(postId); // RPC call to server
  }

  return <button onClick={handleClick}>Like</button>;
}
```

---

## Security: Never Trust Client Data

Server Actions are just POST endpoints. Any client can call them with arbitrary data. You **must** validate and authorize inside the action itself:

```tsx
'use server';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const parsed = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  await db.posts.create({
    data: { ...parsed.data, authorId: session.user.id },
  });

  revalidatePath('/posts');
}
```

Never derive the user's identity from form data — always read it from the authenticated session on the server.

---

## Cache Invalidation After Mutations

After a Server Action mutates data, you need to tell Next.js to invalidate cached data:

```tsx
import { revalidatePath, revalidateTag } from 'next/cache';

// Invalidate all pages at this path
revalidatePath('/dashboard');

// Invalidate all fetches tagged with this key
revalidateTag('user-posts');
```

---

## What Server Actions Are Not

- Not a replacement for all API routes — streaming responses, webhooks, OAuth callbacks, third-party integrations still need route handlers
- Not automatically safe — you still own validation and authorization
- Not only for Next.js — the RSC spec defines them, but Next.js is the primary implementation today

> **Check yourself:** Why does a Server Action defined inline in a Server Component still need `'use server'`? Because the framework must statically analyze which functions are Server Actions to create the POST endpoints and client-side stubs. The `'use server'` directive is the marker that triggers this analysis. Without it, the function is just a regular closure.

---

## Self-Assessment

- [ ] I can define a Server Action with both the file-level and inline directive
- [ ] I know how to wire a Server Action to a `<form>` for progressive enhancement
- [ ] I understand what `useFormStatus` and `useActionState` do and where each lives
- [ ] I can write a secure Server Action with auth checks and Zod validation
- [ ] I know how to invalidate cache after a mutation with `revalidatePath`/`revalidateTag`

---

## Interview Q&A

**Q: What are Server Actions and how do they work under the hood? `High`**

A: Server Actions are async functions marked with `'use server'` that always run on the server. When called from the client, the framework serializes the arguments, sends a POST request to a framework-managed endpoint, runs the function on the server, and returns the result. From the developer's perspective it looks like a local function call, but it's an RPC call over HTTP.

---

**Q: Why can you pass a Server Action directly to a `<form action>`? `High`**

A: Because React (in an RSC-capable framework) treats a function in the `action` prop as an RPC reference. Without JavaScript, the browser submits a standard form POST and the framework routes it to the action. With JavaScript loaded, React intercepts the submit and makes the RPC call directly — no full page reload. This is progressive enhancement built in.

---

**Q: What security considerations are unique to Server Actions? `High`**

A: Server Actions are POST endpoints — any client can call them with arbitrary data. You must: (1) authenticate the user inside the action (not from form data), (2) validate all inputs with a schema (Zod, etc.), (3) authorize that the authenticated user has permission for the specific resource. Never derive user identity from client-provided data.

---

**Q: What is `useFormStatus` and where must it be rendered? `Medium`**

A: `useFormStatus` is a Client Component hook that reads the pending state of the nearest parent `<form>`. It must be rendered inside a component that is a child of the `<form>` — not in the same component that renders the form. Typically used in a `<SubmitButton>` component to show a loading state and disable the button during submission.

---

**Q: How do you invalidate cached data after a Server Action mutation? `Medium`**

A: Use `revalidatePath(path)` to invalidate all cached data for a specific URL path, or `revalidateTag(tag)` to invalidate all fetches that were tagged with a specific cache tag. Both are imported from `next/cache` and must be called inside a Server Action or Route Handler. They schedule a cache purge — the next request to that path fetches fresh data.
