// ============================================================
// Topic:   State & Immutability
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


// ─── Exercise 1 ──────────────────────────────────────────────
// THE SNAPSHOT TRAP — Why three setCount calls only increment once
//
// PART A — Predict, then verify:
//   Three buttons each call setCount differently.
//   Write your prediction as a comment BEFORE running the app.
//
//   Button 1 — "Buggy: +3 (direct)"
//     calls setCount(count + 1) THREE times in one handler
//     Prediction: count goes up by ___?
//
//   Button 2 — "Fixed: +3 (functional)"
//     calls setCount(prev => prev + 1) THREE times
//     Prediction: count goes up by ___?
//
//   Button 3 — "Async +1 after 1s (stale)"
//     captures count now, fires setCount(count + 1) after 1 second
//     Rapidly click Button 2 a few times DURING that second.
//     Prediction: what value does the async update set count to?
//
// PART B — write your explanation below:
// WHY BUTTON 1 ONLY INCREMENTS BY 1:
// TODO: explain here using the word "snapshot"

function Exercise1() {
  const [count, setCount] = useState(0);

  function handleBuggyTriple() {
    // TODO: call setCount(count + 1) three times (intentionally wrong)
  }

  function handleFixedTriple() {
    // TODO: call setCount(prev => prev + 1) three times
  }

  function handleAsyncIncrement() {
    // TODO: after 1000ms, call setCount(count + 1) using the captured snapshot
  }

  return (
    <div>
      <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 1rem' }}>
        {count}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={handleBuggyTriple}>Buggy: +3 (direct)</button>
        <button onClick={handleFixedTriple}>Fixed: +3 (functional)</button>
        <button onClick={handleAsyncIncrement}>Async +1 after 1s (stale)</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
        Write your predictions first, then run.
      </p>
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// MUTATION AUTOPSY — See the silent failure, then fix it
//
// PART A — Reproduce the mutation bug (already set up below):
//   The "Mark Done (Buggy)" button does:
//     tasks[0].done = true;   // mutates in place
//     setTasks(tasks);         // same reference → React sees no change → no re-render
//
//   Click "Mark Done (Buggy)". Does the checkbox update? ___
//   Then click "Add Task". Does it show checked now? Why? ___
//
// PART B — Implement three correct immutable operations:
//
//   toggleDone(id)   — flip done for the matching task
//                      Use: tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
//
//   removeTask(id)   — remove the matching task
//                      Use: tasks.filter(t => t.id !== id)
//
//   addTask()        — append a new task from the newText input
//                      id: Date.now(), text: newText, done: false

function Exercise2() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Read notes.md', done: false },
    { id: 2, text: 'Complete tutorial', done: false },
    { id: 3, text: 'Review interview questions', done: false },
  ]);
  const [newText, setNewText] = useState('');

  // Buggy mutation — observe it, don't fix it
  function markFirstDoneBuggy() {
    tasks[0].done = true;
    setTasks(tasks);
  }

  function toggleDone(id) {
    // TODO
  }

  function removeTask(id) {
    // TODO
  }

  function addTask() {
    if (!newText.trim()) return;
    // TODO — append new task immutably, then setNewText('')
  }

  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map(task => (
          <li key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleDone(task.id)}
            />
            <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
              {task.text}
            </span>
            <button onClick={() => removeTask(task.id)} style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="New task..."
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <button onClick={addTask}>Add Task</button>
      </div>
      <button
        onClick={markFirstDoneBuggy}
        style={{ marginTop: '0.75rem', color: '#ef4444', fontSize: '0.8rem' }}
      >
        Mark first done (Buggy — observe the silent failure)
      </button>
    </div>
  );
}


// ─── Exercise 3 ──────────────────────────────────────────────
// SHOPPING CART — Immutable updates on objects + arrays in a real scenario
//
// The cart holds items: [{ id, name, price, qty }]
// Implement all operations using immutable patterns only.
//
//   increaseQty(id)  — increment qty by 1  →  map + spread
//
//   decreaseQty(id)  — decrement qty; if it hits 0, remove the item
//                      Hint: map to decrement first, then filter out qty === 0
//
//   removeItem(id)   — remove item entirely  →  filter
//
// Derived values — compute from cart, do NOT store in state:
//   totalItems  = sum of all qty
//   totalPrice  = sum of (price * qty), toFixed(2)
//
// VERIFY:
//   - Totals update live on every click
//   - An item disappears when its qty hits 0
//   - Rapid clicking doesn't desync the totals

const INITIAL_CART = [
  { id: 1, name: 'React Fundamentals Course', price: 49.99, qty: 1 },
  { id: 2, name: 'TypeScript Handbook', price: 29.99, qty: 2 },
  { id: 3, name: 'System Design Interview', price: 39.99, qty: 1 },
];

function Exercise3() {
  const [cart, setCart] = useState(INITIAL_CART);

  function increaseQty(id) {
    // TODO
  }

  function decreaseQty(id) {
    // TODO — remove the item if qty would reach 0
  }

  function removeItem(id) {
    // TODO
  }

  // TODO: derive from cart, not from state
  const totalItems = 0;
  const totalPrice = '0.00';

  return (
    <div>
      {cart.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Your cart is empty.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0' }}>Item</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem 0' }}>{item.name}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => decreaseQty(item.id)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => increaseQty(item.id)}>+</button>
                  </div>
                </td>
                <td>${(item.price * item.qty).toFixed(2)}</td>
                <td>
                  <button onClick={() => removeItem(item.id)} style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                    remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{totalItems} items</strong> — Total: <strong>${totalPrice}</strong>
        </div>
        <button onClick={() => setCart([])} disabled={cart.length === 0}>
          Clear Cart
        </button>
      </div>
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. Lazy initialization
//    Replace useState(INITIAL_CART) with useState(() => INITIAL_CART).
//    Log inside to verify it only runs once across all re-renders.
//
// 2. Object.is edge cases
//    setCart(cart)    — does it re-render? (No — same reference)
//    setCart([...cart]) — does it re-render? (Yes — new reference, same content)
//
// 3. Replace vs merge
//    In Exercise2, call setTasks({ length: 0 }) — notice useState replaces entirely.
//    Unlike class-era this.setState, there is no automatic merge. Always spread.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>State & Immutability</h1>

      <h2>Exercise 1 — The snapshot trap</h2>
      <Exercise1 />

      <h2>Exercise 2 — Mutation autopsy: task list</h2>
      <Exercise2 />

      <h2>Exercise 3 — Shopping cart with immutable array ops</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
