// ============================================================
// Topic:   React Query / TanStack Query (v5)
// Phase:   6 — State Management
//
// REQUIRES: npm install @tanstack/react-query
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install @tanstack/react-query
//
// NOTE: Exercises use a local fake API (no network needed) so
// you can see caching behavior in isolation.
// ============================================================

import { useState } from 'react';
import {
  QueryClient, QueryClientProvider,
  useQuery, useMutation, useQueryClient,
} from '@tanstack/react-query';

// ─── Fake in-memory database ─────────────────────────────────
let db = {
  todos: [
    { id: 1, title: 'Read notes.md', done: true },
    { id: 2, title: 'Run Exercise 1', done: false },
    { id: 3, title: 'Complete all exercises', done: false },
  ],
  nextId: 4,
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const todosApi = {
  getAll:   async ()           => { await delay(700);  return [...db.todos]; },
  getById:  async (id)         => { await delay(400);  const t = db.todos.find(t => t.id === id); if (!t) throw new Error('Not found'); return { ...t }; },
  create:   async (todo)       => { await delay(600);  const n = { ...todo, id: db.nextId++ }; db.todos = [...db.todos, n]; return n; },
  toggle:   async (id)         => { await delay(400);  db.todos = db.todos.map(t => t.id === id ? { ...t, done: !t.done } : t); return db.todos.find(t => t.id === id); },
  delete:   async (id)         => { await delay(500);  db.todos = db.todos.filter(t => t.id !== id); return { id }; },
};

// ─── Single QueryClient — shared across all exercises ────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,       // don't retry on error in exercises
      staleTime: 5_000,   // 5 s — short so you can see background refetch behavior
    },
  },
});

// ─────────────────────────────────────────────────────────────
// Exercise 1 — useQuery: staleTime, isLoading vs isFetching
//
// TODO:
//   1. Implement useTodos() custom hook using useQuery.
//      queryKey: ['todos']
//      queryFn: todosApi.getAll
//      staleTime: 5000 (5 seconds)
//
//   2. In TodoList, destructure { data, isLoading, isFetching, isError, error }
//      from useTodos(). Show:
//        - A full spinner only when isLoading (no cached data yet)
//        - A small "refreshing…" badge when isFetching && !isLoading
//        - An error message when isError
//        - The todo list on success
//
//   3. Mount TodoList in a <QueryClientProvider client={queryClient}>.
//
//   4. Click "Remount" to unmount and remount TodoList. Observe:
//        - 1st mount: isLoading = true (no cache), spinner shown
//        - Remount within staleTime: isLoading = false (cache hit!), no spinner
//        - Remount after staleTime: isFetching = true (background refetch),
//          stale data shown immediately, spinner appears
//
// CHECK YOURSELF:
//   When is isLoading true and isFetching true simultaneously?
//   When is isLoading false but isFetching true?
// ─────────────────────────────────────────────────────────────

// TODO: implement this hook
function useTodos() {
  // return useQuery({ ... });
  return { data: undefined, isLoading: false, isFetching: false, isError: false, error: null };
}

function TodoList() {
  const { data: todos, isLoading, isFetching, isError, error } = useTodos();

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Todos</strong>
        {/* TODO: show a small badge when isFetching && !isLoading */}
        {isFetching && !isLoading && (
          <span style={{ fontSize: 11, color: '#6b7280' }}>↻ refreshing…</span>
        )}
      </div>

      {/* TODO: show spinner when isLoading */}
      {isLoading && <p style={{ color: '#6b7280' }}>⏳ Loading (first fetch — no cache)…</p>}
      {isError   && <p style={{ color: '#dc2626' }}>Error: {error?.message}</p>}

      {todos && (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {todos.map(todo => (
            <li key={todo.id} style={{ fontSize: 13, textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#111' }}>
              {todo.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Exercise1() {
  const [mounted, setMounted] = useState(true);
  return (
    <QueryClientProvider client={queryClient}>
      <p style={hint}>
        Implement <code>useTodos()</code>. Click "Remount" quickly after
        first load — no spinner (cache hit). Wait &gt;5s and remount —
        you'll see <em>stale data immediately + background refresh</em>.
      </p>
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => setMounted(false)}>Unmount</button>
        {' '}
        <button onClick={() => setMounted(true)}>Remount</button>
      </div>
      {mounted ? <div style={card}><TodoList /></div> : <div style={{ color: '#9ca3af', fontSize: 13 }}>TodoList unmounted</div>}
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — useMutation + query key invalidation
//
// TODO:
//   1. Implement useCreateTodo() using useMutation:
//        mutationFn: todosApi.create
//        onSuccess: invalidate ['todos'] so the list refetches
//
//   2. Implement useToggleTodo() using useMutation:
//        mutationFn: todosApi.toggle
//        onSuccess: invalidate ['todos']
//
//   3. Implement useDeleteTodo() using useMutation.
//        onSuccess: invalidate ['todos']
//
//   4. In TodoManager, wire up the form and buttons.
//
//   5. Observe: creating/toggling/deleting automatically updates
//      the list without any manual setState. The queryClient
//      handles re-fetching after invalidation.
//
// CHECK YOURSELF:
//   What does queryClient.invalidateQueries({ queryKey: ['todos'] }) do exactly?
//   Why does it matter that 'todos' is a prefix (not an exact match)?
// ─────────────────────────────────────────────────────────────

// TODO: implement these three mutation hooks
function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => {
      // TODO: qc.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: todosApi.toggle,
    onSuccess: () => {
      // TODO: invalidate
    },
  });
}

function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: todosApi.delete,
    onSuccess: () => {
      // TODO: invalidate
    },
  });
}

function TodoManager() {
  const { data: todos, isLoading } = useTodos();
  const [title, setTitle] = useState('');

  const { mutate: createTodo, isPending: creating } = useCreateTodo();
  const { mutate: toggleTodo }  = useToggleTodo();
  const { mutate: deleteTodo }  = useDeleteTodo();

  function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    createTodo({ title, done: false });
    setTitle('');
  }

  return (
    <div>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="New todo…" style={inputStyle} />
        <button type="submit" disabled={creating}>
          {creating ? 'Adding…' : 'Add'}
        </button>
      </form>

      {isLoading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>}
      <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
        {(todos ?? []).map(todo => (
          <li key={todo.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' }}>
            <span
              onClick={() => toggleTodo(todo.id)}
              style={{ cursor: 'pointer', textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#111', fontSize: 13 }}
            >
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)} style={{ fontSize: 11, padding: '1px 6px' }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Exercise2() {
  return (
    <QueryClientProvider client={queryClient}>
      <p style={hint}>
        Implement the three mutation hooks with <code>invalidateQueries</code> in
        <code>onSuccess</code>. Adding/toggling/deleting should immediately update
        the list — the mutation triggers the list to refetch.
      </p>
      <TodoManager />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Full optimistic update pattern
//
// Objective: clicking the checkbox on a todo updates the UI
// INSTANTLY — no spinner, no delay — and rolls back if the
// server fails.
//
// TODO:
//   1. Implement useOptimisticToggle() using useMutation with
//      onMutate / onError / onSettled hooks:
//
//      onMutate: async (id) => {
//        // a. cancel in-flight ['todos'] queries
//        await qc.cancelQueries({ queryKey: ['todos'] });
//        // b. snapshot current list
//        const prev = qc.getQueryData(['todos']);
//        // c. apply optimistic update
//        qc.setQueryData(['todos'], old => old.map(...toggle done...));
//        // d. return snapshot as context
//        return { prev };
//      }
//
//      onError: (err, id, context) => {
//        // rollback
//        qc.setQueryData(['todos'], context.prev);
//      }
//
//      onSettled: () => {
//        // always refetch to confirm server truth
//        qc.invalidateQueries({ queryKey: ['todos'] });
//      }
//
//   2. In OptimisticTodoList, use useOptimisticToggle.
//      Clicking the checkbox should be instant — no spinner visible.
//
//   3. Set SIMULATE_FAILURE = true below to see rollbacks:
//      toggle a todo — it flips immediately, then snaps back after
//      the (simulated) server error.
//
// CHECK YOURSELF:
//   Why does onMutate call cancelQueries BEFORE applying the update?
//   Why does onSettled refetch even when onMutate succeeded?
// ─────────────────────────────────────────────────────────────

// Toggle this to see rollback behavior
let SIMULATE_FAILURE = false;

const flakyToggle = async (id) => {
  await delay(800);
  if (SIMULATE_FAILURE) throw new Error('Server rejected the toggle (simulated)');
  return todosApi.toggle(id);
};

// TODO: implement with onMutate / onError / onSettled
function useOptimisticToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: flakyToggle,
    // TODO: onMutate, onError, onSettled
  });
}

function OptimisticTodoList() {
  const { data: todos, isLoading } = useTodos();
  const { mutate: toggle } = useOptimisticToggle();

  return (
    <div>
      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        Toggle <code>SIMULATE_FAILURE</code> at the top of Exercise 3 to see rollback.
        Currently: <strong style={{ color: SIMULATE_FAILURE ? '#dc2626' : '#15803d' }}>
          {SIMULATE_FAILURE ? 'failing (rollback mode)' : 'succeeding'}
        </strong>
      </p>
      {isLoading && <p style={{ color: '#6b7280' }}>Loading…</p>}
      <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
        {(todos ?? []).map(todo => (
          <li key={todo.id}
            onClick={() => toggle(todo.id)}
            style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}
          >
            <span style={{
              width: 16, height: 16, border: '2px solid #6b7280', borderRadius: 3,
              background: todo.done ? '#22c55e' : 'white',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#111' }}>
              {todo.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Exercise3() {
  return (
    <QueryClientProvider client={queryClient}>
      <p style={hint}>
        Implement <code>useOptimisticToggle</code>. Clicking a todo should
        flip it INSTANTLY. Then set <code>SIMULATE_FAILURE = true</code> and
        click — it flips then rolls back.
      </p>
      <OptimisticTodoList />
    </QueryClientProvider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a paginated todo list using useQuery with a page number
// in the query key: ['todos', 'page', pageNumber].
// Add a keepPreviousData option (placeholderData: keepPreviousData)
// so the current page stays visible while the next page loads.
// Add prev/next buttons. Demonstrate that going back to a page
// you've visited doesn't trigger a loading spinner.
function Playground() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Build a paginated list: queryKey includes page number, use
        <code>placeholderData: keepPreviousData</code> so you never see
        a blank list while paginating. Verify old pages are cached.
      </div>
    </QueryClientProvider>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card      = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 6, fontSize: 14 };
const hint      = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2        = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const inputStyle = { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, flex: 1 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>React Query / TanStack Query (v5)</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install @tanstack/react-query</code>
      </p>

      <h2 style={h2}>Exercise 1 — useQuery: staleTime, isLoading vs isFetching</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — useMutation + cache invalidation</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Full optimistic update with rollback</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
