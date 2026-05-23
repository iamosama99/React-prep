// ============================================================
// Topic:   useReducer
// Phase:   2 — Hooks
// ============================================================
//
// useReducer shines when:
//   - Multiple state values change together based on an action
//   - You want all transitions in ONE testable pure function
//   - State logic would be a mess of setX / setY calls
//
// Pattern: dispatch({ type: 'ACTION', payload }) → reducer → new state
// ============================================================

import { useReducer } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Replace useState with useReducer — understand the mechanics.
//
// A counter has three operations: increment, decrement, reset.
// Currently written with useState.  Rewrite it with useReducer.
//
// Steps:
//   1. Write a reducer function:
//        function counterReducer(state, action) { ... }
//      Handle action.types: 'increment', 'decrement', 'reset'.
//      State shape: { count: number }
//   2. Replace useState with:
//        const [state, dispatch] = useReducer(counterReducer, { count: 0 })
//   3. Change each button to dispatch the correct action.
//   4. Add a 'set' action that accepts action.payload as the new count.
//      Add an input + "Set" button to test it.
//
// Important: the reducer must be a PURE function — no mutations,
//            always return a new object.

function Exercise1() {
  // TODO: replace with useReducer
  // const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  // Temporary useState placeholder so the UI renders
  const [count, setCount] = [0, () => {}]; // replace me

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
        {count}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { /* dispatch({ type: 'increment' }) */ }}>+1</button>
        <button onClick={() => { /* dispatch({ type: 'decrement' }) */ }}>−1</button>
        <button onClick={() => { /* dispatch({ type: 'reset' }) */ }}>Reset</button>
      </div>
      {/* TODO: add <input> + "Set" button for the 'set' action */}
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: Shopping cart — multiple related values that change together.
//
// This is the canonical "switch from useState to useReducer" example.
// A cart has items, each with { id, name, price, qty }.
//
// Implement a cartReducer that handles:
//   'add'      — add a product to cart (or increment qty if already there)
//   'remove'   — remove a product by id
//   'increment'— increase qty by 1
//   'decrement'— decrease qty by 1 (min 1)
//   'clear'    — empty the cart
//
// The UI is wired up — you only need to implement the reducer and
// connect it via useReducer.
//
// Success: all 5 operations update the cart correctly.
//          The total price is computed from state, not stored separately.

const PRODUCTS = [
  { id: 1, name: 'React T-shirt', price: 25 },
  { id: 2, name: 'JS Mug',        price: 12 },
  { id: 3, name: 'Hook Sticker',  price: 3  },
];

// TODO: implement cartReducer
// function cartReducer(state, action) {
//   switch (action.type) {
//     case 'add': ...
//     case 'remove': ...
//     case 'increment': ...
//     case 'decrement': ...
//     case 'clear': return [];
//     default: throw new Error('Unknown action: ' + action.type);
//   }
// }

const initialCart = [];

function Exercise2() {
  // TODO: const [cart, dispatch] = useReducer(cartReducer, initialCart);
  const cart = []; // placeholder
  const dispatch = () => {};

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div style={styles.box}>
      {/* Product list */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRODUCTS.map(p => (
          <button
            key={p.id}
            onClick={() => dispatch({ type: 'add', payload: p })}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            Add {p.name} (${p.price})
          </button>
        ))}
      </div>

      {/* Cart */}
      {cart.length === 0
        ? <p style={{ fontSize: 13, color: '#999' }}>Cart is empty</p>
        : (
          <>
            {cart.map(item => (
              <div key={item.id} style={styles.cartRow}>
                <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                <button onClick={() => dispatch({ type: 'decrement', payload: item.id })}>−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13 }}>{item.qty}</span>
                <button onClick={() => dispatch({ type: 'increment', payload: item.id })}>+</button>
                <span style={{ minWidth: 48, textAlign: 'right', fontSize: 13 }}>
                  ${(item.price * item.qty).toFixed(2)}
                </span>
                <button onClick={() => dispatch({ type: 'remove', payload: item.id })}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold' }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button onClick={() => dispatch({ type: 'clear' })}>Clear cart</button>
          </>
        )
      }
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Undo / Redo — only possible cleanly with useReducer.
//
// Build a simple text editor that supports undo/redo.
// State shape: { past: string[], present: string, future: string[] }
//
// Actions:
//   'type'  — user typed; push present to past, set new present,
//              clear future
//   'undo'  — pop from past, push present to future
//   'redo'  — pop from future, push present to past
//
// This would be nearly impossible to implement cleanly with useState.
// The reducer makes all transitions explicit and testable.
//
// Success: type some words, undo them one by one, redo them.

const editorInitial = { past: [], present: '', future: [] };

// TODO: implement editorReducer
// function editorReducer(state, action) { ... }

function Exercise3() {
  // TODO: const [state, dispatch] = useReducer(editorReducer, editorInitial);
  const state = editorInitial; // placeholder
  const dispatch = () => {};

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return (
    <div style={styles.box}>
      <textarea
        value={state.present}
        onChange={e => dispatch({ type: 'type', payload: e.target.value })}
        placeholder="Type something…"
        style={{ resize: 'vertical', minHeight: 80, padding: 8, fontSize: 14 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => dispatch({ type: 'undo' })}
          disabled={!canUndo}
        >
          ↩ Undo ({state.past.length})
        </button>
        <button
          onClick={() => dispatch({ type: 'redo' })}
          disabled={!canRedo}
        >
          Redo ({state.future.length}) ↪
        </button>
      </div>
      <details style={{ fontSize: 12, color: '#888' }}>
        <summary>State debug</summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Prove: what happens when a reducer mutates state directly?
//
// Steps:
//   1. Change the reducer to mutate state in-place:
//        case 'add': state.count++; return state; // ← mutation!
//   2. Click the button — React does NOT re-render.
//      Same reference → Object.is bailout → no update.
//   3. This proves why reducers must return NEW objects.

function mutatingReducer(state, action) {
  switch (action.type) {
    case 'add':
      // TODO: try mutating here and observe React doesn't re-render
      return { ...state, count: state.count + 1 }; // correct form
    default:
      return state;
  }
}

function Playground() {
  const [state, dispatch] = useReducer(mutatingReducer, { count: 0 });

  return (
    <div style={styles.box}>
      <p>count: <strong>{state.count}</strong></p>
      <button onClick={() => dispatch({ type: 'add' })}>Add</button>
      <p style={{ fontSize: 12, color: '#888' }}>
        Try making mutatingReducer mutate state in-place — React won't re-render.
        That's why the reducer rule "no mutations, always return new state" exists.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 640 }}>
      <h1>useReducer</h1>

      <h2>Exercise 1 — Counter: Rewrite useState as useReducer</h2>
      <p style={styles.goal}>
        Write a reducer with increment / decrement / reset / set actions.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Shopping Cart (add / remove / qty / clear)</h2>
      <p style={styles.goal}>
        Implement cartReducer with 5 actions. All state in one reducer.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Undo / Redo Text Editor</h2>
      <p style={styles.goal}>
        Use past/present/future state shape. Only clean with useReducer.
      </p>
      <Exercise3 />

      <h2>Playground — Mutation Bug</h2>
      <Playground />
    </div>
  );
}

const styles = {
  box: {
    border: '1px solid #ddd', borderRadius: 6,
    padding: '0.75rem 1rem', marginBottom: '0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  cartRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    borderBottom: '1px solid #eee', paddingBottom: 4,
  },
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
