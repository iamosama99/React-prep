// ============================================================
// Topic:   Redux Toolkit
// Phase:   6 — State Management
//
// REQUIRES: npm install @reduxjs/toolkit react-redux
//
// HOW TO RUN (StackBlitz — fastest):
//   1. Go to stackblitz.com/new/react
//   2. npm install @reduxjs/toolkit react-redux
//   3. Paste this file as src/App.jsx
//
// HOW TO RUN (local):
//   npm create vite@latest rtk-exercises -- --template react
//   cd rtk-exercises
//   npm install @reduxjs/toolkit react-redux
//   Replace src/App.jsx with this file
//
// APPROACH: Three exercises that build a real RTK application
// from scratch. Each one focuses on one core RTK concept.
// ============================================================

import { useState, useEffect } from 'react';
import { configureStore, createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

// ─────────────────────────────────────────────────────────────
// Exercise 1 — createSlice: synchronous state with Immer
//
// Create a counter slice using createSlice. RTK uses Immer
// internally, so you can "mutate" the state draft directly.
//
// TODO:
//   1. Fill in the four reducers: increment, decrement,
//      incrementByAmount, reset.
//   2. Export the action creators and the reducer.
//   3. Create the store with configureStore.
//   4. In Counter component, use useSelector to read count
//      and useDispatch to dispatch actions.
//
// VERIFY: Buttons update the count. Open Redux DevTools and
//         see every dispatched action and state before/after.
//
// CHECK YOURSELF:
//   What string does incrementByAmount(5) produce as action.type?
//   Why can you write `state.value += 1` without spreading?
// ─────────────────────────────────────────────────────────────

// TODO: implement counterSlice
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    // increment(state) { ... }
    // decrement(state) { ... }
    // incrementByAmount(state, action) { ... }
    // reset(state) { ... }
  },
});

// TODO: export action creators
// export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;

// ─── Store ───────────────────────────────────────────────────
// TODO: uncomment and add the counter reducer once the slice is done
const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
    // todos: todosSlice.reducer,   ← add in Exercise 2
  },
});

function Counter() {
  const dispatch = useDispatch();
  // TODO: select state.counter.value
  const count = useSelector((state) => state.counter?.value ?? 0);

  // Extract action creators to use below
  const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;

  return (
    <div>
      <div style={{ fontSize: 36, fontWeight: 'bold', marginBottom: 12 }}>{count}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => dispatch(decrement())}>− 1</button>
        <button onClick={() => dispatch(increment())}>+ 1</button>
        <button onClick={() => dispatch(incrementByAmount(5))}>+ 5</button>
        <button onClick={() => dispatch(reset())}>Reset</button>
      </div>
      <ActionTypeDisplay slice={counterSlice} />
    </div>
  );
}

// Shows the action types that createSlice generated — helps you see
// the "name/reducer" naming convention.
function ActionTypeDisplay({ slice }) {
  return (
    <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
      <strong>Generated action types:</strong>
      {Object.entries(slice.actions).map(([key, creator]) => (
        <div key={key} style={{ fontFamily: 'monospace' }}>
          {key}() → type: "{creator().type}"
        </div>
      ))}
    </div>
  );
}

function Exercise1() {
  return (
    <Provider store={store}>
      <p style={hint}>
        Implement counterSlice. The action type display at the bottom shows
        what strings createSlice generates automatically.
      </p>
      <Counter />
    </Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — createAsyncThunk: the request lifecycle
//
// createAsyncThunk generates three action types automatically:
//   'todos/fetchAll/pending'
//   'todos/fetchAll/fulfilled'
//   'todos/fetchAll/rejected'
//
// TODO:
//   1. Implement fetchTodos using createAsyncThunk.
//      The payload creator should fetch from the mock API below.
//      Use thunkAPI.rejectWithValue on failure.
//
//   2. Create todosSlice. initialState: { items: [], status: 'idle', error: null }
//      Handle the three lifecycle cases in extraReducers using builder.addCase.
//
//   3. Add todosSlice.reducer to configureStore above (uncomment the line).
//
//   4. In TodoList, use useSelector to read items and status.
//      Show a spinner when status === 'loading', error when 'failed',
//      and the list when 'succeeded'.
//
// CHECK YOURSELF:
//   What does rejectWithValue() change about the rejected action?
//   Why use builder.addCase(fetchTodos.pending, ...) rather than
//   checking action.type === 'todos/fetchAll/pending' manually?
// ─────────────────────────────────────────────────────────────

// Mock API — simulate network latency + occasional failure
let fetchCallCount = 0;
const fakeTodosApi = {
  getAll: () =>
    new Promise((resolve, reject) =>
      setTimeout(() => {
        fetchCallCount++;
        // Fail every 3rd fetch so you can test error handling
        if (fetchCallCount % 3 === 0) {
          reject(new Error('Network error (simulated every 3rd fetch)'));
        } else {
          resolve([
            { id: 1, title: 'Learn RTK', done: true },
            { id: 2, title: 'Write createSlice exercises', done: false },
            { id: 3, title: 'Master createAsyncThunk', done: false },
          ]);
        }
      }, 900)
    ),
};

// TODO: implement fetchTodos
// const fetchTodos = createAsyncThunk('todos/fetchAll', async (_, thunkAPI) => { ... });

// TODO: implement todosSlice
// const todosSlice = createSlice({
//   name: 'todos',
//   initialState: { items: [], status: 'idle', error: null },
//   reducers: {},
//   extraReducers(builder) {
//     builder
//       .addCase(fetchTodos.pending, ...)
//       .addCase(fetchTodos.fulfilled, ...)
//       .addCase(fetchTodos.rejected, ...);
//   },
// });

function TodoList() {
  const dispatch = useDispatch();
  // TODO: select state.todos.items, state.todos.status, state.todos.error
  const items  = useSelector((s) => s.todos?.items  ?? []);
  const status = useSelector((s) => s.todos?.status ?? 'idle');
  const error  = useSelector((s) => s.todos?.error  ?? null);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        {/* TODO: dispatch fetchTodos() */}
        <button onClick={() => dispatch({ type: '@@TODO: dispatch fetchTodos' })}>
          Fetch todos
        </button>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          status: <code>{status}</code>
          {' '}(fails every 3rd fetch to test error state)
        </span>
      </div>

      {status === 'loading' && <p style={{ color: '#6b7280' }}>⏳ Loading…</p>}
      {status === 'failed'  && <p style={{ color: '#dc2626' }}>✗ {error}</p>}
      {status === 'succeeded' && (
        <ul style={{ paddingLeft: 20 }}>
          {items.map(todo => (
            <li key={todo.id} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
              {todo.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Exercise2() {
  return (
    <Provider store={store}>
      <p style={hint}>
        Implement <code>fetchTodos</code> and <code>todosSlice</code>.
        Click "Fetch todos" — it will fail on every 3rd click so you can
        test both the fulfilled and rejected paths.
      </p>
      <TodoList />
    </Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — createSelector: memoized derived state
//
// PROBLEM: the selector below creates a new array on every call,
// causing re-renders even when the todo list didn't change.
//
// TODO:
//   1. Add a 'filter' field to todosSlice's initialState: 'all'.
//   2. Add a setFilter reducer that sets it.
//   3. Add a filterSlice or extend todosSlice (your call).
//   4. Replace the broken inline selector below with a memoized
//      createSelector that computes activeTodos and completedTodos.
//   5. Add filter buttons that dispatch setFilter.
//
// WHY:
//   The bad selector: state => state.todos.items.filter(...)
//   returns a NEW array every call → component re-renders on every
//   dispatch, even unrelated ones.
//
//   createSelector memoizes: if items and filter didn't change,
//   it returns the cached array — same reference, no re-render.
//
// CHECK YOURSELF:
//   When does createSelector recompute? When does it return the cached value?
// ─────────────────────────────────────────────────────────────

// BAD: creates a new array every call
// const selectActiveTodos = state => state.todos.items.filter(t => !t.done);

// TODO: fix with createSelector
// const selectAllTodos    = state => state.todos?.items ?? [];
// const selectFilter      = state => state.todos?.filter ?? 'all';
//
// const selectVisibleTodos = createSelector(
//   [selectAllTodos, selectFilter],
//   (items, filter) => {
//     // return filtered items based on filter value
//   }
// );

// Stats selector — computes counts, not just filtering
// TODO: implement selectTodoStats using createSelector
// const selectTodoStats = createSelector(
//   selectAllTodos,
//   (items) => ({
//     total: items.length,
//     done:  items.filter(t => t.done).length,
//     active: items.filter(t => !t.done).length,
//   })
// );

function FilteredTodoList() {
  const dispatch = useDispatch();
  // TODO: replace with selectVisibleTodos and selectTodoStats
  const items = useSelector((s) => s.todos?.items ?? []);
  // const stats = useSelector(selectTodoStats);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {/* TODO: add filter buttons that dispatch setFilter */}
        <button onClick={() => dispatch({ type: '@@TODO: setFilter', payload: 'all' })}>All</button>
        <button onClick={() => dispatch({ type: '@@TODO: setFilter', payload: 'active' })}>Active</button>
        <button onClick={() => dispatch({ type: '@@TODO: setFilter', payload: 'completed' })}>Completed</button>
      </div>
      {/* TODO: show selectTodoStats */}
      <ul style={{ paddingLeft: 20 }}>
        {items.map(todo => (
          <li key={todo.id} style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Exercise3() {
  return (
    <Provider store={store}>
      <p style={hint}>
        First run Exercise 2 to populate the todos, then filter them here.
        Open React DevTools Profiler and notice that FilteredTodoList
        re-renders <em>less often</em> once you swap to the memoized selector.
      </p>
      <TodoList />
      <hr style={{ margin: '12px 0' }} />
      <FilteredTodoList />
    </Provider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a shopping cart slice using createEntityAdapter.
// The adapter gives you: addOne, removeOne, updateOne, setAll,
// and pre-built selectors (selectAll, selectById, selectTotal).
// Add a cartSlice that tracks items by id.
function Playground() {
  return (
    <Provider store={store}>
      <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Build a <code>cartSlice</code> using <code>createEntityAdapter</code>.
        Use <code>adapter.addOne</code> / <code>adapter.removeOne</code> as
        reducers. Display the cart with <code>selectAll</code> and
        <code>selectTotal</code> selectors.
      </div>
    </Provider>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const hint = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2   = { fontSize: 15, marginTop: 28, marginBottom: 6 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Redux Toolkit</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install @reduxjs/toolkit react-redux</code>
      </p>

      <h2 style={h2}>Exercise 1 — createSlice with Immer mutation syntax</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — createAsyncThunk + extraReducers lifecycle</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — createSelector for memoized derived state</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
