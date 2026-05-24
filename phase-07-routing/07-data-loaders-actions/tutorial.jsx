// ============================================================
// Topic:   Data Loaders & Actions (v6.4+)
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial data-loaders-actions
//
// APPROACH: Three complete mini-apps, each using createMemoryRouter.
//   All data fetching uses mock async functions with deliberate delays
//   so you can observe when loading happens relative to rendering.
//
//   Exercise 1 — Loaders: parallel loading, no loading state in components.
//   Exercise 2 — Actions: form → validate → error or redirect.
//   Exercise 3 — useFetcher: background mutation without navigation.
//   Playground  — defer + <Await>: stream slow data while fast renders.
//
// KEY INSIGHT:
//   With loaders, data is GUARANTEED to exist when the component renders.
//   No null checks, no loading spinners in components, no waterfalls.
// ============================================================

import { useState, useRef, Suspense } from 'react';
import {
  createMemoryRouter, RouterProvider,
  useLoaderData, useActionData, useNavigation,
  useFetcher, useRouteError, isRouteErrorResponse,
  Form, redirect, Link, NavLink, Outlet, Await,
  // Note: `defer` was removed in react-router v7.
  // In v7 you return an object with a mix of resolved values and
  // unresolved Promises directly — no wrapper needed.
  // <Await> still works the same way.
} from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// Mock API — simulates real fetch with deliberate delays
// ─────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms));

let mockUsers = [
  { id: 1, name: 'Alice',   email: 'alice@example.com',   role: 'admin' },
  { id: 2, name: 'Bob',     email: 'bob@example.com',     role: 'user'  },
  { id: 3, name: 'Carol',   email: 'carol@example.com',   role: 'mod'   },
];
let nextId = 4;

const api = {
  getUsers: async ()     => { await delay(300); return [...mockUsers]; },
  getUser:  async (id)   => { await delay(200); return mockUsers.find(u => u.id === Number(id)) ?? null; },
  create:   async (data) => { await delay(400); const u = { id: nextId++, ...data }; mockUsers.push(u); return u; },
  delete:   async (id)   => { await delay(300); mockUsers = mockUsers.filter(u => u.id !== Number(id)); },
  getStats: async ()     => { await delay(2000); return { dau: 1420, mau: 38000, revenue: 84200 }; }, // slow!
};

function validate(name, email) {
  const errors = {};
  if (!name?.trim())  errors.name  = 'Name is required';
  if (!email?.trim()) errors.email = 'Email is required';
  else if (!email.includes('@')) errors.email = 'Email must contain @';
  return Object.keys(errors).length ? errors : null;
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Loaders: parallel loading, no component loading state
//
// Compare:
//   useEffect pattern (sequential waterfall):
//     Mount parent → effect fires → fetch users → re-render
//     → mount child → effect fires → fetch user detail → re-render
//     = 2 round trips before final render
//
//   Loader pattern (parallel):
//     Navigate → router runs ALL matched loaders simultaneously
//     → all data ready → render parent + child together
//     = 1 round trip (both loaders run in parallel)
//
// OBSERVE:
//   Click a user link. Notice there's no intermediate loading state
//   INSIDE the components — they render with data already there.
//   The loading state appears in the nav bar (useNavigation().state).
//
// TODO:
//   Add console.log() at the top of both loaders and at the top of
//   both components. Navigate between users and observe the order:
//   Loaders fire → loaders complete → components render.
//   (No component renders before its loader resolves.)
//
// CHECK YOURSELF:
//   What do you call useLoaderData() on — the return value of await,
//   or the Promise? Answer: the resolved value — the loader is awaited
//   by the router before the component mounts.
// ─────────────────────────────────────────────────────────────

async function usersLoader() {
  const users = await api.getUsers();
  return users; // component gets this directly via useLoaderData()
}

async function userLoader({ params }) {
  const user = await api.getUser(params.userId);
  if (!user) {
    // Throwing a Response triggers errorElement
    throw new Response('User not found', { status: 404 });
  }
  return user;
}

function UsersLayout() {
  const users = useLoaderData();         // ← data ready, no loading state needed
  const navigation = useNavigation();    // ← global nav state for pending indicator

  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
          USERS {navigation.state !== 'idle' && <span style={{ color: '#f59e0b' }}>⏳ Loading…</span>}
        </div>
        {users.map(u => (
          <NavLink
            key={u.id}
            to={`/users/${u.id}`}
            style={({ isActive }) => ({
              ...s.sidebarLink,
              background: isActive ? '#e0f2fe' : 'transparent',
              color: isActive ? '#0369a1' : '#374151',
            })}
          >
            {u.name}
          </NavLink>
        ))}
        <Link to="/users/new" style={{ ...s.sidebarLink, color: '#059669', marginTop: 12 }}>
          + New User
        </Link>
      </aside>
      <main style={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

function UserDetail() {
  const user = useLoaderData(); // ← guaranteed to have data — loader ran first
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{user.name}</h3>
      <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <tr><td style={s.td}>ID</td><td style={s.td}>{user.id}</td></tr>
          <tr><td style={s.td}>Email</td><td style={s.td}>{user.email}</td></tr>
          <tr><td style={s.td}>Role</td><td style={s.td}>{user.role}</td></tr>
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 12, color: '#555', background: '#f8fafc', padding: '6px 8px', borderRadius: 4 }}>
        No loading state — data was fetched by the loader before this rendered.
      </div>
    </div>
  );
}

function UserDetailError() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div style={{ color: '#ef4444', fontSize: 14, padding: 8 }}>
      {is404 ? '🚫 User not found' : '⚠️ Something went wrong'}
    </div>
  );
}

function SelectUser() {
  return (
    <div style={{ color: '#64748b', fontSize: 14, padding: 8 }}>
      ← Select a user from the list
    </div>
  );
}

const ex1Router = createMemoryRouter([
  {
    path: '/',
    element: <div style={{ padding: 8 }}><Link to="/users" style={s.link}>Go to Users →</Link></div>,
  },
  {
    path: '/users',
    element: <UsersLayout />,
    loader: usersLoader,
    children: [
      { index: true, element: <SelectUser /> },
      {
        path: ':userId',
        element: <UserDetail />,
        loader: userLoader,
        errorElement: <UserDetailError />,
      },
    ],
  },
], { initialEntries: ['/users'], initialIndex: 0 });

function Exercise1() {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
      <RouterProvider router={ex1Router} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Actions: form → validate → error or redirect
//
// React Router's <Form> (capital F) submits to the route's action.
// action({ request }) receives the raw Request — read it with
// request.formData().
//
// Action return values:
//   return errors    → useActionData() returns them, page re-renders
//   return redirect  → router navigates, loaders revalidate
//   throw            → errorElement renders
//
// After ANY action completes, all active loaders revalidate.
// The user list updates automatically after creating a user.
//
// OBSERVE:
//   1. Submit empty form → validation errors appear inline.
//   2. Submit bad email → email error appears.
//   3. Submit valid data → redirected to /ex2/users, list updates.
//   4. Try to submit again — notice loaders ran again (user count updated).
//
// CHECK YOURSELF:
//   After a successful action + redirect, who triggers the loader revalidation?
//   Answer: the router does it automatically after every action completes.
// ─────────────────────────────────────────────────────────────

async function newUserAction({ request }) {
  const formData = await request.formData();
  const name  = formData.get('name');
  const email = formData.get('email');
  const role  = formData.get('role') ?? 'user';

  const errors = validate(name, email);
  if (errors) return errors; // action data — useActionData() reads this

  await api.create({ name: name.trim(), email: email.trim(), role });
  return redirect('/ex2/users'); // success → navigate + revalidate loaders
}

async function ex2UsersLoader() {
  return await api.getUsers();
}

function NewUserForm() {
  const errors     = useActionData(); // validation errors from action
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>New User</h3>
      {/* <Form> (capital F) → submits to action, no full page reload */}
      <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={s.formLabel}>Name</label>
          <input name="name" style={{ ...s.input, borderColor: errors?.name ? '#ef4444' : '#cbd5e1' }} placeholder="Alice" />
          {errors?.name && <div style={s.fieldError}>{errors.name}</div>}
        </div>
        <div>
          <label style={s.formLabel}>Email</label>
          <input name="email" style={{ ...s.input, borderColor: errors?.email ? '#ef4444' : '#cbd5e1' }} placeholder="alice@example.com" />
          {errors?.email && <div style={s.fieldError}>{errors.email}</div>}
        </div>
        <div>
          <label style={s.formLabel}>Role</label>
          <select name="role" style={s.input}>
            <option value="user">user</option>
            <option value="mod">mod</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting}
          style={{ ...s.btn, background: isSubmitting ? '#94a3b8' : '#3b82f6', color: '#fff', padding: '6px 16px' }}>
          {isSubmitting ? 'Creating…' : 'Create User'}
        </button>
      </Form>
    </div>
  );
}

function Ex2UserList() {
  const users = useLoaderData();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Users ({users.length})</strong>
        <Link to="/ex2/users/new" style={{ ...s.btn, textDecoration: 'none', color: '#059669' }}>+ New</Link>
      </div>
      {users.map(u => (
        <div key={u.id} style={s.card}>{u.name} — {u.email} <span style={{ color: '#64748b', fontSize: 12 }}>({u.role})</span></div>
      ))}
    </div>
  );
}

const ex2Router = createMemoryRouter([
  {
    path: '/ex2/users',
    element: <Ex2UserList />,
    loader: ex2UsersLoader,
  },
  {
    path: '/ex2/users/new',
    element: <NewUserForm />,
    action: newUserAction,
  },
], { initialEntries: ['/ex2/users'], initialIndex: 0 });

function Exercise2() {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
      <RouterProvider router={ex2Router} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — useFetcher: background mutation without navigation
//
// useFetcher is for mutations that DON'T navigate:
//   Like/unlike a post, delete an item in a list,
//   auto-save a draft, inline form submission.
//
// fetcher.state: 'idle' | 'loading' | 'submitting'
// fetcher.data:  the action's return value (if any)
//
// After a fetcher action, the router revalidates active loaders —
// the list updates automatically without any extra state management.
//
// OBSERVE:
//   1. Click "Delete" on a user. The row disappears and the list refreshes.
//      The URL doesn't change — no navigation occurred.
//   2. Watch the button go to "Deleting…" while the request is in flight.
//   3. Check the fetcher.state transitions in the table below each user.
//
// CONTRAST with <Form>:
//   <Form method="post"> → submits + navigates (or shows action result at same URL)
//   fetcher.Form         → submits + stays put + revalidates loaders
//
// CHECK YOURSELF:
//   useFetcher triggers an action. Does it navigate the user?
//   Answer: No — fetcher mutations happen in the background.
//   The page stays at the current URL.
// ─────────────────────────────────────────────────────────────

async function deleteUserAction({ params }) {
  await api.delete(params.userId);
  return { ok: true };
}

async function ex3UsersLoader() {
  return await api.getUsers();
}

function DeleteButton({ userId }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== 'idle';

  return (
    <fetcher.Form method="post" action={`/ex3/users/${userId}/delete`} style={{ display: 'inline' }}>
      <button
        type="submit"
        disabled={isDeleting}
        style={{ ...s.btn, color: '#ef4444', borderColor: '#fca5a5' }}
      >
        {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
    </fetcher.Form>
  );
}

function Ex3UserList() {
  const users      = useLoaderData();
  const navigation = useNavigation();

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        Users ({users.length})
        {navigation.state !== 'idle' && <span style={{ color: '#f59e0b', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>⏳ revalidating…</span>}
      </div>
      {users.map(u => (
        <div key={u.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: 14 }}>{u.name}</strong>
            <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>{u.email}</span>
          </div>
          {/* DeleteButton uses useFetcher — no navigation, just mutation */}
          <DeleteButton userId={u.id} />
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 12, color: '#555', background: '#f8fafc', padding: '6px 8px', borderRadius: 4 }}>
        Delete fires a background action. URL stays at /ex3/users.
        Loader revalidates automatically after each delete.
      </div>
    </div>
  );
}

const ex3Router = createMemoryRouter([
  {
    path: '/ex3/users',
    element: <Ex3UserList />,
    loader: ex3UsersLoader,
  },
  {
    path: '/ex3/users/:userId/delete',
    action: deleteUserAction,
  },
], { initialEntries: ['/ex3/users'], initialIndex: 0 });

function Exercise3() {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
      <RouterProvider router={ex3Router} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Playground — defer + <Await>: stream slow data
//
// defer() lets you return some data immediately (blocking) and
// some data as an unresolved Promise (streaming).
//
// The page renders with fastData right away.
// slowData (2s) streams in after the page is visible.
// <Await> handles the pending + resolved states via <Suspense>.
//
// OBSERVE:
//   Navigate to /dashboard — the user header renders instantly.
//   The stats section shows a skeleton for 2 seconds, then the numbers.
//   Without defer, the entire page would wait 2s before rendering.
//
// CHECK YOURSELF:
//   Which data in defer blocks navigation (user waits at current page)?
//   Answer: awaited values — fastData: await getUser() blocks.
//   Unawaited values (slowData: getStats()) don't block.
// ─────────────────────────────────────────────────────────────

async function dashboardLoader() {
  // fastData: awaited → navigation waits for this (300ms)
  const user = await api.getUser(1);
  // slowData: NOT awaited → page renders immediately, data streams in (2000ms)
  // In v7 you return an object containing a mix of resolved values and
  // unresolved Promises — no defer() wrapper needed (removed in v7).
  // In v6.4 this was: return defer({ user, stats });
  const stats = api.getStats(); // Promise, not resolved

  return { user, stats }; // v7: just return the mix directly
}

function StatsSection({ statsPromise }) {
  return (
    <Suspense fallback={
      <div style={{ ...s.card, color: '#94a3b8', fontStyle: 'italic' }}>
        ⏳ Loading analytics… (simulated 2s)
      </div>
    }>
      <Await resolve={statsPromise} errorElement={<div style={{ color: '#ef4444' }}>Failed to load stats</div>}>
        {(stats) => (
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              ['DAU',     stats.dau.toLocaleString()],
              ['MAU',     stats.mau.toLocaleString()],
              ['Revenue', `$${stats.revenue.toLocaleString()}`],
            ].map(([label, val]) => (
              <div key={label} style={{ ...s.card, flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </Await>
    </Suspense>
  );
}

function DashboardPage() {
  const { user, stats } = useLoaderData();
  return (
    <div style={{ padding: 12 }}>
      {/* user is resolved (fastData) — available immediately */}
      <div style={{ ...s.card, marginBottom: 8 }}>
        <strong>👋 Welcome, {user?.name}</strong>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
          User data loaded in ~300ms (blocked navigation briefly, then rendered).
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
        Analytics (deferred — renders independently):
      </div>
      {/* stats is a Promise (slowData) — <Await> + <Suspense> handle it */}
      <StatsSection statsPromise={stats} />
    </div>
  );
}

const playgroundRouter = createMemoryRouter([
  {
    path: '/',
    element: <Link to="/dashboard" style={s.link}>Go to Dashboard →</Link>,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
    loader: dashboardLoader,
  },
], { initialEntries: ['/'], initialIndex: 0 });

function Playground() {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
      <RouterProvider router={playgroundRouter} />
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  layout:     { display: 'flex', minHeight: 200 },
  sidebar:    { width: 140, borderRight: '1px solid #e2e8f0', padding: '8px 0', flexShrink: 0 },
  sidebarLink:{ display: 'block', padding: '4px 12px', fontSize: 13, textDecoration: 'none', borderRadius: 4 },
  main:       { flex: 1, padding: 12, minWidth: 0 },
  card:       { background: '#f8fafc', borderRadius: 4, padding: '8px 12px', border: '1px solid #e2e8f0', marginBottom: 4, fontSize: 14 },
  td:         { padding: '4px 8px', borderBottom: '1px solid #e2e8f0', fontSize: 13 },
  btn:        { padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12 },
  input:      { display: 'block', width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' },
  formLabel:  { display: 'block', fontSize: 12, color: '#374151', marginBottom: 3, fontWeight: 500 },
  fieldError: { color: '#ef4444', fontSize: 12, marginTop: 2 },
  link:       { color: '#38bdf8', textDecoration: 'none', fontSize: 14, padding: 12, display: 'block' },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 680 }}>
      <h1 style={t.h1}>Data Loaders & Actions (v6.4+)</h1>
      <p style={t.meta}>
        Each exercise is a separate createMemoryRouter. Mock API adds
        realistic delays so you can observe the loader/render order.
      </p>

      <h2 style={t.h2}>Exercise 1 — Loaders: parallel data, no loading state in components</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — Actions: validate → errors or redirect + auto-revalidation</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — useFetcher: delete without navigation</h2>
      <Exercise3 />

      <h2 style={t.h2}>Playground — Deferred data + {'<Await>'}: stream slow data</h2>
      <Playground />
    </div>
  );
}

const t = {
  h1:   { fontSize: 20, marginBottom: 4 },
  h2:   { fontSize: 15, marginTop: 28, marginBottom: 6 },
  meta: { color: '#666', fontSize: 13, marginBottom: 20 },
};
