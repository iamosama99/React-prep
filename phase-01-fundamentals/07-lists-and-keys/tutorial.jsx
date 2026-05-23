// ============================================================
// Topic:   Lists & Keys
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import { useState } from 'react';
import React from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// KEY CORRUPTION DEMO — See the state-bleed bug, then fix it
//
// This is the most important exercise in this topic. It shows the exact bug
// that wrong keys cause — input values sticking to the wrong items after reordering.
//
// SETUP (already provided):
//   A list of person objects each with a name. Each is rendered as an input
//   pre-filled with their name. There are "Move to top" buttons.
//
// PART A — Run with INDEX keys (buggy):
//   The list uses (person, index) => <PersonRow key={index} ... />
//   1. Type into 2-3 inputs to modify them.
//   2. Click "Move to top" on one of the lower items.
//   3. OBSERVE: do the input values follow their person, or do they stay in position?
//   4. Write your observation as a comment below.
//
// PART B — Fix with ID keys:
//   Change key={index} to key={person.id} in the map call.
//   Repeat steps 1-3 above.
//   OBSERVE: input values now follow their person correctly. Why?
//
// PersonRow — already implemented — renders one input per person
//   Props: name (string), onMoveToTop (function)

const INITIAL_PEOPLE = [
  { id: 'a1', name: 'Osama' },
  { id: 'b2', name: 'Sara' },
  { id: 'c3', name: 'Khalid' },
  { id: 'd4', name: 'Lina' },
];

// Already implemented — do not change
function PersonRow({ name, onMoveToTop }) {
  return (
    <li style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem', alignItems: 'center' }}>
      <input defaultValue={name} style={{ width: 140 }} />
      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({name})</span>
      <button onClick={onMoveToTop} style={{ fontSize: '0.75rem' }}>Move to top</button>
    </li>
  );
}

function Exercise1() {
  const [people, setPeople] = useState(INITIAL_PEOPLE);

  function moveToTop(id) {
    setPeople(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === 0) return prev;
      const item = prev[idx];
      return [item, ...prev.filter(p => p.id !== id)];
    });
  }

  return (
    <div>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Step 1: Type in some inputs to change them. Step 2: Move an item to the top. Step 3: Do the values follow their person?
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {people.map((person, index) => (
          // TODO PART A: key={index}  — observe the bug
          // TODO PART B: key={person.id} — confirm the fix
          <PersonRow
            key={index}
            name={person.name}
            onMoveToTop={() => moveToTop(person.id)}
          />
        ))}
      </ul>
      {/* OBSERVATION: with index keys, reordering causes ___
          with id keys, reordering causes ___ */}
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// KEY-BASED RESET — Use key as an identity reset mechanism
//
// SCENARIO:
//   You have a UserForm component that allows editing a user's bio.
//   The user navigates between different people (switching userId).
//   The form should reset completely when a different user is selected.
//
// PART A — The broken version (no key):
//   Select "Osama", type something in the bio field.
//   Switch to "Sara". Does the bio reset? ___
//   Why doesn't it? Write your answer as a comment below.
//
// PART B — Fix with key:
//   Add key={selectedId} to the <UserForm> element in Exercise2's return.
//   Now switch users. Does the bio reset? ___
//   Why does the key fix this? Write your answer as a comment below.
//
// PART C (bonus): What would the alternative fix look like?
//   useEffect(() => { setBio('') }, [userId]) — add a comment explaining
//   why the key approach is cleaner (no extra render, no flicker).

const USERS = [
  { id: 1, name: 'Osama', role: 'Senior Frontend Engineer' },
  { id: 2, name: 'Sara', role: 'Backend Lead' },
  { id: 3, name: 'Khalid', role: 'Product Manager' },
];

// Already implemented — this is the form that should reset on user change
function UserForm({ userId }) {
  const user = USERS.find(u => u.id === userId);
  const [bio, setBio] = useState('');

  return (
    <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <p style={{ margin: '0 0 0.5rem' }}>
        Editing: <strong>{user?.name}</strong> — {user?.role}
      </p>
      <textarea
        value={bio}
        onChange={e => setBio(e.target.value)}
        placeholder={`Write ${user?.name}'s bio...`}
        rows={3}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function Exercise2() {
  const [selectedId, setSelectedId] = useState(1);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {USERS.map(u => (
          <button
            key={u.id}
            onClick={() => setSelectedId(u.id)}
            style={{
              fontWeight: selectedId === u.id ? 'bold' : 'normal',
              background: selectedId === u.id ? '#dbeafe' : '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '4px 12px',
              borderRadius: 4,
            }}
          >
            {u.name}
          </button>
        ))}
      </div>

      {/* TODO PART A: no key — observe stale state
          TODO PART B: add key={selectedId} — confirm reset */}
      <UserForm userId={selectedId} />

      {/* WHY NO KEY → stale bio: ___
          WHY KEY FIXES IT: ___ */}
    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// TODO LIST — Full CRUD with correct key usage throughout
//
// Build a functional todo list. This exercises the full key lifecycle:
// add (new items at the end), complete (toggle), delete (filter), and
// stable ID generation.
//
// DATA SHAPE: { id: string, text: string, done: boolean }
//   Generate IDs with crypto.randomUUID() or Date.now().toString()
//
// COMPONENTS:
//
// TodoItem — one row in the list
//   Props: todo ({ id, text, done }), onToggle(id), onDelete(id)
//   Renders:
//     □ checkbox (checked = done) that calls onToggle when changed
//     □ text with line-through style when done
//     □ delete button that calls onDelete
//
// TodoList — renders the full list
//   Props: todos[], onToggle(id), onDelete(id)
//   Maps todos → <TodoItem key={todo.id} ... />
//   If todos is empty, render <p>All done! 🎉</p>
//
// AddTodoForm — controlled input + submit
//   Props: onAdd(text)
//   Has local state for the input value
//   On submit: calls onAdd(inputValue), clears the input
//   Validate: trim whitespace, reject empty strings
//
// Exercise3 — owns todos state + orchestrates everything
//   Renders AddTodoForm + a count + TodoList
//   Count should show: "{remaining} of {total} remaining"
//   (remaining = items where done is false)
//
// KEY RULE: Always use todo.id as the key. Never use index.
// Test: add 3 todos, check the first, delete the second.
//       The remaining items and their checked states should be correct.

function TodoItem({ todo, onToggle, onDelete }) {
  // TODO: implement
  return <li>TodoItem — implement me</li>;
}

function TodoList({ todos, onToggle, onDelete }) {
  // TODO: implement — map with key={todo.id}
  return <ul>TodoList — implement me</ul>;
}

function AddTodoForm({ onAdd }) {
  const [text, setText] = useState('');
  // TODO: implement controlled input + submit
  return <div>AddTodoForm — implement me</div>;
}

function Exercise3() {
  const [todos, setTodos] = useState([
    { id: '1', text: 'Finish this exercise', done: false },
    { id: '2', text: 'Review notes.md', done: true },
  ]);

  function handleAdd(text) {
    // TODO: append new todo with stable unique ID
  }

  function handleToggle(id) {
    // TODO: flip the done property for the matching todo
  }

  function handleDelete(id) {
    // TODO: remove the matching todo
  }

  const remaining = 0; // TODO: derive from todos
  const total = todos.length;

  return (
    <div>
      <AddTodoForm onAdd={handleAdd} />
      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0' }}>
        {remaining} of {total} remaining
      </p>
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. Math.random() as key
//    Replace key={todo.id} with key={Math.random()} in TodoList.
//    Check a todo item. Watch what happens on the next render.
//    Inputs should reset on every render — the ultimate key bug.
//
// 2. Keyed Fragment
//    Modify TodoItem to return <React.Fragment key={todo.id}><li>...</li><li>meta</li></React.Fragment>
//    Notice you must use the long form React.Fragment — <> doesn't accept key.
//
// 3. Keys scoped to siblings
//    Create two separate lists that both use id=1.
//    Verify there's no conflict — keys are sibling-scoped, not global.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '640px' }}>
      <h1>Lists & Keys</h1>

      <h2>Exercise 1 — Key corruption: index vs id keys</h2>
      <Exercise1 />

      <h2>Exercise 2 — Key-based component reset</h2>
      <Exercise2 />

      <h2>Exercise 3 — Todo list with full CRUD</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
