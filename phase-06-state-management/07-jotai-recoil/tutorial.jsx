// ============================================================
// Topic:   Jotai (Atom-based State)
// Phase:   6 — State Management
//
// REQUIRES: npm install jotai
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install jotai
//
// NOTE: This file focuses on Jotai (the practical choice today).
// Recoil patterns are noted in comments for comparison.
//
// APPROACH:
//   Exercise 1 — base atoms: useAtom / useAtomValue / useSetAtom
//   Exercise 2 — derived atoms: auto-tracking dependencies
//   Exercise 3 — async atoms + Suspense integration
// ============================================================

import { Suspense, useRef } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ─── Shared utility ──────────────────────────────────────────
function useRenderCount() {
  const r = useRef(0); r.current += 1; return r.current;
}
function Badge({ label, count }) {
  return (
    <span style={{
      background: count === 1 ? '#bbf7d0' : '#fde68a',
      borderRadius: 4, padding: '1px 7px', fontSize: 12, marginLeft: 8,
    }}>
      {label}: {count}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Base atoms and the three read/write hooks
//
// Jotai's three hooks:
//   useAtom(a)       → [value, setter]   (like useState — read + write)
//   useAtomValue(a)  → value             (read-only — cheaper subscription)
//   useSetAtom(a)    → setter            (write-only — NEVER re-renders)
//
// TODO:
//   1. Create countAtom (initial value: 0) and nameAtom (initial: 'Alice').
//
//   2. CountDisplay: use useAtomValue — read-only, should re-render only
//      when countAtom changes.
//
//   3. NameDisplay: use useAtomValue for nameAtom.
//
//   4. IncrementButton: use useSetAtom(countAtom) — write-only.
//      Its render count should STAY AT 1 forever.
//
//   5. NameInput: use useAtom(nameAtom) for both read and write.
//
//   Add render counters and verify that:
//   - IncrementButton never re-renders (useSetAtom is write-only)
//   - NameDisplay never re-renders when count changes (separate atom)
//   - CountDisplay never re-renders when name changes (separate atom)
//
// CHECK YOURSELF:
//   Compare this to Redux: when count changes, which components re-render?
//   How is this different from a Zustand selector on the same store?
// ─────────────────────────────────────────────────────────────

// TODO: create atoms
const countAtom = atom(0);
const nameAtom  = atom('Alice');

function CountDisplay() {
  const renders = useRenderCount();
  // TODO: use useAtomValue
  const count = useAtomValue(countAtom);
  return (
    <div style={card}>
      Count: <strong>{count}</strong>
      <Badge label="CountDisplay" count={renders} />
    </div>
  );
}

function NameDisplay() {
  const renders = useRenderCount();
  // TODO: use useAtomValue — read only
  const name = useAtomValue(nameAtom);
  return (
    <div style={card}>
      Name: <strong>{name}</strong>
      <Badge label="NameDisplay" count={renders} />
    </div>
  );
}

// Write-only — should NEVER re-render after first mount
function IncrementButton() {
  const renders = useRenderCount();
  // TODO: use useSetAtom
  const setCount = useSetAtom(countAtom);
  return (
    <div style={card}>
      <button onClick={() => setCount(c => c + 1)}>Increment count</button>
      <Badge label="IncrementButton (should stay 1)" count={renders} />
    </div>
  );
}

function NameInput() {
  const renders = useRenderCount();
  // TODO: use useAtom (read + write)
  const [name, setName] = useAtom(nameAtom);
  return (
    <div style={card}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="type a name"
        style={inputStyle}
      />
      <Badge label="NameInput" count={renders} />
    </div>
  );
}

function Exercise1() {
  return (
    <div>
      <p style={hint}>
        After implementing the atoms, type in the name input and click Increment.
        Verify that IncrementButton stays at 1 render and CountDisplay doesn't
        re-render when name changes (and vice versa).
      </p>
      <CountDisplay />
      <NameDisplay />
      <IncrementButton />
      <NameInput />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Derived atoms (auto-dependency tracking)
//
// A derived atom calls get(anotherAtom) during its evaluation.
// Jotai tracks which atoms were accessed. The derived atom
// recomputes only when those dependencies change.
//
// This is like React's useMemo but without a dependency array —
// Jotai figures out the dependencies automatically.
//
// TODO:
//   1. Create a todosAtom (array of { id, text, done }).
//      Initialize with 3 todos (mix of done/undone).
//
//   2. Create activeTodosAtom — a derived (read-only) atom:
//        atom(get => get(todosAtom).filter(t => !t.done))
//
//   3. Create todoStatsAtom — a derived atom that returns:
//        { total, done, active, completionPct }
//
//   4. Create toggleTodoAtom — a WRITE-ONLY atom (write-only derived):
//        atom(null, (get, set, id) => {
//          set(todosAtom, get(todosAtom).map(...))
//        })
//
//   5. Verify: ActiveCount only re-renders when active count changes.
//      If you mark a done todo as undone, ActiveCount re-renders.
//      If you toggle a done todo to undone, StatsDisplay also re-renders.
//
// CHECK YOURSELF:
//   If activeTodosAtom depends on todosAtom, when does it recompute?
//   What is the equivalent of this pattern using createSelector in Redux?
// ─────────────────────────────────────────────────────────────

// TODO: create todosAtom
const todosAtom = atom([
  { id: 1, text: 'Learn Jotai atoms', done: true },
  { id: 2, text: 'Understand derived atoms', done: false },
  { id: 3, text: 'Build async atoms', done: false },
]);

// TODO: create derived atoms
const activeTodosAtom = atom((get) => get(todosAtom).filter((t) => !t.done));

const todoStatsAtom = atom((get) => {
  const todos = get(todosAtom);
  const done  = todos.filter(t => t.done).length;
  return {
    total: todos.length,
    done,
    active: todos.length - done,
    completionPct: todos.length ? Math.round((done / todos.length) * 100) : 0,
  };
});

// Write-only atom — toggles a todo's done state
// TODO: implement write side
const toggleTodoAtom = atom(null, (get, set, id) => {
  set(todosAtom, get(todosAtom).map(t =>
    t.id === id ? { ...t, done: !t.done } : t
  ));
});

function TodoStats() {
  const renders = useRenderCount();
  const stats = useAtomValue(todoStatsAtom);
  return (
    <div style={card}>
      Total: {stats.total} | Done: {stats.done} | Active: {stats.active} | {stats.completionPct}% complete
      <Badge label="Stats" count={renders} />
    </div>
  );
}

function ActiveTodoList() {
  const renders = useRenderCount();
  const activeTodos = useAtomValue(activeTodosAtom);
  const toggle      = useSetAtom(toggleTodoAtom);
  return (
    <div style={card}>
      <strong style={{ fontSize: 13 }}>Active todos ({activeTodos.length})</strong>
      <Badge label="ActiveList" count={renders} />
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
        {activeTodos.map(t => (
          <li key={t.id} style={{ fontSize: 13 }}>
            <button onClick={() => toggle(t.id)} style={{ marginRight: 6, fontSize: 11 }}>✓</button>
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AllTodoList() {
  const renders  = useRenderCount();
  const todos    = useAtomValue(todosAtom);
  const toggle   = useSetAtom(toggleTodoAtom);
  return (
    <div style={card}>
      <strong style={{ fontSize: 13 }}>All todos</strong>
      <Badge label="AllList" count={renders} />
      <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
        {todos.map(t => (
          <li key={t.id} style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#9ca3af' : '#111' }}>
            <button onClick={() => toggle(t.id)} style={{ marginRight: 6, fontSize: 11 }}>
              {t.done ? '↩' : '✓'}
            </button>
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Exercise2() {
  return (
    <div>
      <p style={hint}>
        Toggle todos and watch: TodoStats and ActiveTodoList re-render when
        done count changes. When you implement derived atoms correctly,
        both stay in sync automatically — no manual invalidation needed.
      </p>
      <TodoStats />
      <ActiveTodoList />
      <AllTodoList />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Async atoms + React Suspense
//
// Async atoms return Promises. When a component reads one whose
// Promise hasn't resolved yet, Jotai throws the Promise
// (Suspense protocol). The nearest <Suspense> boundary shows
// the fallback until the Promise resolves.
//
// No isLoading flags. No conditional rendering boilerplate.
// The component reads data as if it were synchronous.
//
// TODO:
//   1. Create userIdAtom (initial value: 1).
//
//   2. Create userAtom — an async derived atom:
//        atom(async (get) => {
//          const id = get(userIdAtom);
//          const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
//          return res.json();
//        })
//      When userIdAtom changes, userAtom re-fetches automatically.
//
//   3. In UserProfile, use useAtomValue(userAtom).
//      The component suspends while the Promise is pending.
//      Wrap it in <Suspense fallback={<Spinner />}>.
//
//   4. Add a UserPicker that reads userIdAtom and lets the user
//      switch between IDs 1–5. Each switch triggers a new fetch.
//
// CHECK YOURSELF:
//   What happens to the Suspense boundary when you switch user IDs?
//   How is this different from using useEffect + useState for loading?
//
// NOTE: This exercise needs network access. In StackBlitz this works
//       automatically. Locally ensure you have internet access.
// ─────────────────────────────────────────────────────────────

// TODO: create userIdAtom
const userIdAtom = atom(1);

// TODO: create async userAtom
const userAtom = atom(async (get) => {
  const id = get(userIdAtom);
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch user ${id}`);
  return res.json();
});

// This component suspends until userAtom resolves
function UserProfile() {
  // TODO: read from userAtom — will suspend while loading
  const user = useAtomValue(userAtom);
  return (
    <div style={card}>
      <strong>{user.name}</strong>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
        {user.email} · {user.company?.name}
      </div>
    </div>
  );
}

function UserPicker() {
  const [userId, setUserId] = useAtom(userIdAtom);
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
      {[1, 2, 3, 4, 5].map(id => (
        <button
          key={id}
          onClick={() => setUserId(id)}
          style={{ fontWeight: userId === id ? 'bold' : 'normal' }}
        >
          User {id}
        </button>
      ))}
    </div>
  );
}

// atomWithStorage from jotai/utils — persists to localStorage
const themeAtom = atomWithStorage('jotai-theme', 'light');

function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);
  return (
    <div style={{ ...card, background: theme === 'dark' ? '#1e293b' : 'white', color: theme === 'dark' ? '#f1f5f9' : '#111' }}>
      <strong>atomWithStorage demo</strong>: theme is {theme}
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} style={{ marginLeft: 8 }}>
        Toggle (persists to localStorage)
      </button>
    </div>
  );
}

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Implement userAtom as an async atom. Click the user buttons —
        the profile suspends while fetching. Notice: no isLoading, no
        conditional render. The Suspense boundary handles it.
      </p>
      <UserPicker />
      <Suspense fallback={<div style={card}>⏳ Fetching user…</div>}>
        <UserProfile />
      </Suspense>
      <ThemeToggle />
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a shopping cart with Jotai:
//   - cartItemsAtom: array of { id, name, qty, price }
//   - addItemAtom: write-only atom that appends an item
//   - cartTotalAtom: derived atom that sums qty * price
//   - itemCountAtom: derived atom that sums qty
//   Challenge: make addItemAtom increment qty if the item already exists
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
      Build a cart with atoms: cartItemsAtom, addItemAtom (write-only),
      cartTotalAtom (derived), itemCountAtom (derived).
      Challenge: addItem should increment qty if the item already exists.
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card      = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 6, fontSize: 14 };
const hint      = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2        = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const inputStyle = { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Jotai — Atom-based State</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install jotai</code>
      </p>

      <h2 style={h2}>Exercise 1 — Base atoms: useAtom / useAtomValue / useSetAtom</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Derived atoms with automatic dependency tracking</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Async atoms + React Suspense integration</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
