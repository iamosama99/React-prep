// ============================================================
// Topic:   SWR
// Phase:   6 — State Management
//
// REQUIRES: npm install swr
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install swr
//
// APPROACH:
//   Exercise 1 — useSWR basics: key = fetcher arg, conditional fetch
//   Exercise 2 — useSWRMutation + manual cache update (mutate)
//   Exercise 3 — Side-by-side: same feature in SWR vs React Query syntax
// ============================================================

import { useState } from 'react';
import useSWR, { SWRConfig, useSWRConfig } from 'swr';
import useSWRMutation from 'swr/mutation';

// ─── Fake in-memory database ─────────────────────────────────
let db = {
  users: [
    { id: 1, name: 'Alice Chen',  email: 'alice@example.com',  role: 'admin'  },
    { id: 2, name: 'Bob Smith',   email: 'bob@example.com',    role: 'viewer' },
    { id: 3, name: 'Carol Davis', email: 'carol@example.com',  role: 'editor' },
  ],
  nextId: 4,
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// SWR's fetcher receives the key (URL-like string) as its argument
const fetcher = async (url) => {
  await delay(600);
  if (url === '/users') return [...db.users];
  const match = url.match(/^\/users\/(\d+)$/);
  if (match) {
    const user = db.users.find(u => u.id === Number(match[1]));
    if (!user) throw new Error(`User ${match[1]} not found`);
    return { ...user };
  }
  throw new Error(`Unknown endpoint: ${url}`);
};

// Mutation fetchers (url, { arg }) pattern for useSWRMutation
async function createUser(url, { arg }) {
  await delay(700);
  const newUser = { ...arg, id: db.nextId++ };
  db.users = [...db.users, newUser];
  return newUser;
}

async function updateUser(url, { arg }) {
  await delay(500);
  const { id, ...patch } = arg;
  db.users = db.users.map(u => u.id === id ? { ...u, ...patch } : u);
  const updated = db.users.find(u => u.id === id);
  if (!updated) throw new Error('User not found');
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — useSWR basics: key doubles as fetcher argument
//
// Key insight: in SWR the key IS passed to the fetcher.
// So useSWR('/users', fetcher) calls fetcher('/users').
// This couples the cache key to the URL, which is simpler
// but less flexible than React Query's separate queryKey/queryFn.
//
// TODO:
//   1. Complete UserList — use useSWR('/users', fetcher).
//      Show loading state, error state, and the list.
//
//   2. Complete UserDetail — use useSWR(`/users/${id}`, fetcher).
//      But only when id is not null: pass `null` as the key to skip.
//      SWR doesn't fetch when the key is null (conditional fetching).
//
//   3. Wrap both in <SWRConfig value={{ fetcher }}> so you don't
//      need to pass fetcher to every useSWR call.
//
//   4. Click a user row to select it. Observe: UserDetail fetches
//      for that ID. Click the same row again — no new request
//      (cached). Click a different user — new request.
//
// CHECK YOURSELF:
//   How does SWR's key differ from React Query's queryKey?
//   What does passing null as the key do, and why is this useful?
// ─────────────────────────────────────────────────────────────

function UserList({ selectedId, onSelect }) {
  // TODO: use useSWR('/users', fetcher)
  // const { data, error, isLoading } = useSWR('/users');
  const data = null, error = null, isLoading = false; // ← replace with useSWR

  if (isLoading) return <p style={{ color: '#6b7280' }}>⏳ Loading users…</p>;
  if (error)     return <p style={{ color: '#dc2626' }}>Error: {error.message}</p>;

  return (
    <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
      {(data ?? []).map(user => (
        <li key={user.id}
          onClick={() => onSelect(user.id === selectedId ? null : user.id)}
          style={{
            ...row,
            background: user.id === selectedId ? '#eff6ff' : 'white',
            borderColor: user.id === selectedId ? '#93c5fd' : '#e5e7eb',
          }}
        >
          <strong>{user.name}</strong>
          <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>{user.role}</span>
          {user.id === selectedId && <UserDetail id={user.id} />}
        </li>
      ))}
    </ul>
  );
}

function UserDetail({ id }) {
  // TODO: use useSWR(id ? `/users/${id}` : null)
  // Null key = skip the fetch (conditional fetching pattern)
  const data = null, isLoading = false; // ← replace with useSWR

  if (isLoading) return <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Loading…</p>;
  if (!data) return null;

  return (
    <div style={{ fontSize: 12, color: '#555', marginTop: 4, paddingTop: 4, borderTop: '1px solid #f3f4f6' }}>
      {data.email} — {data.role}
    </div>
  );
}

function Exercise1() {
  const [selectedId, setSelectedId] = useState(null);
  return (
    // TODO: wrap in SWRConfig to set the global fetcher
    // <SWRConfig value={{ fetcher }}>
    <div>
      <p style={hint}>
        Implement useSWR in UserList and UserDetail. Click a user row to
        expand it. Click the same user twice — second time should be instant
        (cached). Open Network tab to verify deduplication.
      </p>
      <UserList selectedId={selectedId} onSelect={setSelectedId} />
    </div>
    // </SWRConfig>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — useSWRMutation + manual cache update with mutate()
//
// useSWRMutation is the write counterpart to useSWR.
//   const { trigger, isMutating } = useSWRMutation(key, fn)
//   await trigger(arg)  // arg is passed to fn as fn(url, { arg })
//
// After a mutation succeeds, you often want to update the cache.
// Two approaches:
//   A. Call mutate('/users') to trigger a refetch (simple, extra request)
//   B. Call mutate('/users', optimisticData, { revalidate: false })
//      to update the cache directly without a refetch
//
// TODO:
//   1. Implement CreateUserForm using useSWRMutation('/users', createUser).
//      After success, call mutate('/users') to refetch the list.
//
//   2. Implement inline edit for a user using useSWRMutation.
//      After a successful update, use mutate to update BOTH:
//        - The list cache: /users
//        - The individual user cache: /users/${id}
//      without triggering a refetch (optimisticData pattern).
//
// CHECK YOURSELF:
//   What's the difference between mutate('/users') with no data
//   vs mutate('/users', newData, { revalidate: false })?
// ─────────────────────────────────────────────────────────────

function CreateUserForm() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const { mutate } = useSWRConfig();

  // TODO: use useSWRMutation('/users', createUser)
  // const { trigger, isMutating } = useSWRMutation('/users', createUser);
  const isMutating = false;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      // TODO: await trigger({ name, email, role: 'viewer' })
      // Then: mutate('/users') to refetch the list
      console.log('TODO: trigger create user mutation');
      setName(''); setEmail('');
    } catch (err) {
      console.error('Create failed:', err);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
      <input value={name}  onChange={e => setName(e.target.value)}  placeholder="Name"  style={inputStyle} />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
      <button type="submit" disabled={isMutating}>
        {isMutating ? 'Creating…' : 'Add User'}
      </button>
    </form>
  );
}

function Exercise2() {
  const [selectedId, setSelectedId] = useState(null);
  return (
    <SWRConfig value={{ fetcher }}>
      <p style={hint}>
        Implement <code>useSWRMutation</code> in CreateUserForm.
        After creating, <code>mutate('/users')</code> should refetch the list automatically.
      </p>
      <CreateUserForm />
      <UserList selectedId={selectedId} onSelect={setSelectedId} />
    </SWRConfig>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Side-by-side syntax comparison: SWR vs React Query
//
// This exercise shows the same feature written both ways.
// You don't need to implement anything — READ the code and answer:
//
//   1. What is the key difference between SWR's key and React Query's queryKey?
//      (Think about how the fetcher receives its arguments)
//
//   2. How do you do conditional fetching in each?
//      (When userId might be null/undefined)
//
//   3. How do you invalidate after a mutation in each?
//
//   4. Which would you choose for a Next.js project? Why?
//   5. Which would you choose for a large app that already uses Redux?
//
// The code below is READ-ONLY reference. Answer the questions
// in comments at the bottom of this exercise.
// ─────────────────────────────────────────────────────────────

// ── SWR version ──────────────────────────────────────────────
const SWR_EXAMPLES = `
// --- SWR ---
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

// Key IS the fetcher argument
const { data } = useSWR('/api/users', fetcher);

// Conditional: null key skips the fetch
const { data } = useSWR(userId ? \`/api/users/\${userId}\` : null, fetcher);

// Mutation + invalidate
const { trigger } = useSWRMutation('/api/users', createFn);
const { mutate }  = useSWRConfig();
await trigger(newUser);
mutate('/api/users'); // trigger refetch
`;

// ── React Query version ───────────────────────────────────────
const RQ_EXAMPLES = `
// --- React Query ---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Key and queryFn are separate
const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

// Conditional: enabled option
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  enabled: !!userId,
});

// Mutation + invalidate
const qc = useQueryClient();
const { mutate } = useMutation({
  mutationFn: createUser,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
});
mutate(newUser);
`;

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Read both snippets. Then answer the five questions in comments below
        this exercise in the file.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 13 }}>SWR</strong>
          <pre style={pre}>{SWR_EXAMPLES.trim()}</pre>
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 13 }}>React Query (v5)</strong>
          <pre style={pre}>{RQ_EXAMPLES.trim()}</pre>
        </div>
      </div>

      {/* TODO: answer these five questions as comments in the file */}
      <div style={{ ...card, marginTop: 12, background: '#fffbeb', borderColor: '#fbbf24' }}>
        <strong style={{ fontSize: 13 }}>Answer these before moving on:</strong>
        <ol style={{ fontSize: 13, paddingLeft: 20, marginTop: 6 }}>
          <li>Key difference between SWR key and React Query queryKey?</li>
          <li>How does each handle conditional fetching?</li>
          <li>How does each handle cache invalidation after mutation?</li>
          <li>Which would you choose for a Next.js app and why?</li>
          <li>Which would you choose for an app already using Redux?</li>
        </ol>
      </div>

      {/* ANSWERS (fill these in):
      1.
      2.
      3.
      4.
      5.
      */}
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a "live search" with SWR:
//   - Text input for a query string
//   - useSWR that fetches only when query.length >= 2
//     (use null key when too short — conditional fetching)
//   - Fake API: filter db.users by name containing the query
//   - Configure dedupingInterval: 300 so fast typing doesn't
//     fire a request per keypress
function Playground() {
  return (
    <SWRConfig value={{ fetcher }}>
      <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Build a live search: useSWR with a key that includes the query string.
        Skip the fetch (null key) when query is less than 2 chars.
        Set <code>dedupingInterval: 300</code> to debounce rapid typing.
      </div>
    </SWRConfig>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card      = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 6, fontSize: 14 };
const hint      = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2        = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const row       = { padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 4, marginBottom: 4, cursor: 'pointer', fontSize: 14 };
const inputStyle = { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 };
const pre       = { background: '#f3f4f6', padding: 10, borderRadius: 4, fontSize: 11, overflow: 'auto', margin: '4px 0', fontFamily: 'monospace', lineHeight: 1.5 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 680 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>SWR</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install swr</code>
      </p>

      <h2 style={h2}>Exercise 1 — useSWR basics: key as fetcher arg, conditional fetch</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — useSWRMutation + manual cache invalidation</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — SWR vs React Query syntax comparison</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
