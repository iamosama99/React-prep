// ============================================================
// Topic:   Typing useState & useReducer
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 02-typing-usestate-usereducer
//
// APPROACH:
//   Exercise 1 — useState with nullable initial state (fix the type hole)
//   Exercise 2 — Discriminated union state vs flat state (observe narrowing)
//   Exercise 3 — useReducer with exhaustiveness check (build a cart)
// ============================================================

import React, { useState, useReducer, useEffect } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const tag = (color: string): React.CSSProperties => ({
  display: 'inline-block', background: color, borderRadius: 4,
  padding: '1px 8px', fontSize: 12, color: '#fff', marginRight: 4,
});

// ─────────────────────────────────────────────────────────────
// Exercise 1 — useState with nullable initial state
//
// A common mistake: calling useState(null) when the state will eventually
// hold a real object. TypeScript infers the type as `null` — permanently.
// The fix is an explicit type parameter: useState<User | null>(null).
//
// This component simulates fetching a user after mount.
//
// OBSERVE:
//   1. Hover over `user` in each version — compare the inferred types.
//   2. In the BROKEN version, setUser(fetchedUser) would be a type error
//      because TypeScript infers the state as `null`, not `User | null`.
//   3. In the FIXED version, `user` can be either value — and TypeScript
//      narrows correctly when you check `if (user)`.
//
// CHECK YOURSELF:
//   • What does TypeScript infer for the state type when you call useState(null)?
//   • When does inference work fine vs. when do you need an explicit type param?
//   • What's the type of `user.name` after the `if (!user)` guard below?
// ─────────────────────────────────────────────────────────────

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
};

// Simulates an API response
function fakeUserFetch(): Promise<User> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' }), 800)
  );
}

// ❌ BROKEN — don't write it this way
// const [user, setUser] = useState(null);
//   → TypeScript infers: const user: null
//   → setUser(fetchedUser) is a type error!
//   → You can NEVER set state to anything other than null

// ✅ FIXED — explicit union type
function Exercise1() {
  const [user, setUser] = useState<User | null>(null);
  //                              ^^^^^^^^^^^^
  //                              Without this, TypeScript infers `null` forever

  const [loading, setLoading] = useState(true);
  //                             ^— inference works fine here: boolean is the full state

  useEffect(() => {
    fakeUserFetch().then((data) => {
      setUser(data);     // ✅ allowed — data is User, state is User | null
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={card}>⏳ Fetching user…</div>;
  }

  if (!user) {
    // TypeScript knows: user is null here
    return <div style={card}>No user found.</div>;
  }

  // TypeScript knows: user is User (not null) here — no ! needed
  return (
    <div style={card}>
      <p style={{ margin: '0 0 4px' }}>
        <strong>{user.name}</strong> — {user.email}
      </p>
      <span style={tag(user.role === 'admin' ? '#7c3aed' : '#0891b2')}>{user.role}</span>

      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 0 }}>
        After the <code>if (!user)</code> guard, TypeScript narrows{' '}
        <code>user</code> from <code>User | null</code> to just <code>User</code>.
        <br />
        <code>user.name</code> is safe — no optional chaining or assertions needed.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Discriminated union state vs flat state
//
// When modeling async fetch state, you have two choices:
//
//   FLAT:  { status, data, error } — data and error are always nullable;
//          TypeScript can't know which are defined when
//
//   UNION: { status: "idle" } | { status: "loading" } | { status: "success"; data }
//          | { status: "error"; error } — after checking status, TypeScript knows
//          exactly which fields are available
//
// OBSERVE:
//   1. In FlatVersion, hover over `state.data` — it's `Post[] | null` everywhere.
//      You need a null check even after verifying status === 'success'.
//   2. In UnionVersion, after `if (state.status === 'success')`,
//      hover over `state.data` — TypeScript narrows it to `Post[]` with no null.
//
// CHECK YOURSELF:
//   • In the union version, what is `state.error` inside the 'success' branch?
//   • Why can't you access `state.data` directly in the 'error' branch?
//   • What's the compile-time advantage of discriminated state?
// ─────────────────────────────────────────────────────────────

type Post = { id: number; title: string; body: string };

// ── Flat state — null fields everywhere ──────────────────────
type FlatState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: Post[] | null;    // null in all states except success
  error: string | null;   // null in all states except error
};

function FlatVersion() {
  const [state, setState] = useState<FlatState>({ status: 'idle', data: null, error: null });

  const load = () => {
    setState({ status: 'loading', data: null, error: null });
    setTimeout(() => {
      setState({ status: 'success', data: [{ id: 1, title: 'Hello', body: 'World' }], error: null });
    }, 700);
  };

  return (
    <div style={{ ...card, borderColor: '#fca5a5' }}>
      <strong style={{ color: '#dc2626' }}>❌ Flat state</strong>
      <p style={{ fontSize: 12, margin: '4px 0 8px', color: '#6b7280' }}>
        Hover over <code>state.data</code> — it's <code>Post[] | null</code> even after
        checking <code>status === 'success'</code>. TypeScript can't narrow it.
      </p>
      {state.status === 'idle' && <button onClick={load}>Load posts</button>}
      {state.status === 'loading' && <span>Loading…</span>}
      {state.status === 'success' && (
        // state.data is Post[] | null here — we still need `?.`
        <ul>{state.data?.map(p => <li key={p.id}>{p.title}</li>)}</ul>
      )}
      {state.status === 'error' && <span style={{ color: '#dc2626' }}>{state.error}</span>}
    </div>
  );
}

// ── Discriminated union state — each status carries its own fields ────
type UnionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Post[] }   // data exists ONLY here
  | { status: 'error'; error: string };   // error exists ONLY here

function UnionVersion() {
  const [state, setState] = useState<UnionState>({ status: 'idle' });

  const load = () => {
    setState({ status: 'loading' });
    setTimeout(() => {
      setState({ status: 'success', data: [{ id: 1, title: 'Hello from union state!', body: '' }] });
    }, 700);
  };

  return (
    <div style={{ ...card, borderColor: '#86efac' }}>
      <strong style={{ color: '#16a34a' }}>✅ Discriminated union state</strong>
      <p style={{ fontSize: 12, margin: '4px 0 8px', color: '#6b7280' }}>
        Hover over <code>state.data</code> inside the success branch — it's{' '}
        <code>Post[]</code> (not nullable). TypeScript narrows it automatically.
      </p>
      {state.status === 'idle' && <button onClick={load}>Load posts</button>}
      {state.status === 'loading' && <span>Loading…</span>}
      {state.status === 'success' && (
        // state.data is Post[] — no null check needed!
        <ul>{state.data.map(p => <li key={p.id}>{p.title}</li>)}</ul>
      )}
      {state.status === 'error' && (
        <span style={{ color: '#dc2626' }}>{state.error}</span>
      )}
    </div>
  );
}

function Exercise2() {
  return (
    <div>
      <p style={hint}>
        Both versions behave identically at runtime. The union version gives you
        better type narrowing — no null checks needed inside each status branch.
      </p>
      <FlatVersion />
      <UnionVersion />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — useReducer with exhaustiveness check
//
// Build a shopping cart. The discriminated union action type turns
// exhaustive action handling from a convention into a compile-time guarantee.
//
// Key patterns demonstrated:
//   1. Discriminated union Action type — TypeScript narrows inside each case
//   2. The `default: action satisfies never` pattern — if you add a new action
//      type without a matching case, TypeScript errors HERE (at the reducer)
//      not silently at the call site
//   3. React.Dispatch<Action> — the correct type when passing dispatch as a prop
//
// CHECK YOURSELF:
//   • In the FETCH_SUCCESS case, what is action.payload's type?
//   • Try adding a new action type to Action but no case in the reducer.
//     Where exactly does TypeScript error? What does it say?
//   • What is `React.Dispatch<Action>` equivalent to as a function type?
// ─────────────────────────────────────────────────────────────

type CartItem = { id: string; name: string; price: number; qty: number };

type CartState = {
  items: CartItem[];
  total: number;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'qty'> }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_QTY'; id: string; qty: number }
  | { type: 'CLEAR_CART' };
  // TODO: Try adding | { type: 'APPLY_DISCOUNT'; percent: number }
  //       Then add the case in the reducer. Watch where TS errors first.

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // action is narrowed to { type: 'ADD_ITEM'; payload: Omit<CartItem, 'qty'> }
      const existing = state.items.find(i => i.id === action.payload.id);
      const updatedItems = existing
        ? state.items.map(i => i.id === action.payload.id ? { ...i, qty: i.qty + 1 } : i)
        : [...state.items, { ...action.payload, qty: 1 }];
      return { items: updatedItems, total: updatedItems.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'REMOVE_ITEM': {
      // action is narrowed — action.id is string
      const items = state.items.filter(i => i.id !== action.id);
      return { items, total: items.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'UPDATE_QTY': {
      const items = state.items.map(i =>
        i.id === action.id ? { ...i, qty: Math.max(1, action.qty) } : i
      );
      return { items, total: items.reduce((s, i) => s + i.price * i.qty, 0) };
    }
    case 'CLEAR_CART':
      return { items: [], total: 0 };
    default:
      // `action` is narrowed to `never` here when all cases are covered.
      // If you add a new action type without a case, this line errors:
      //   "Type 'X' does not satisfy the expected type 'never'"
      action satisfies never;
      return state;
  }
}

// ─── CartControls — receives dispatch as a prop ───────────────
// React.Dispatch<CartAction> is exactly (action: CartAction) => void
type CartControlsProps = {
  dispatch: React.Dispatch<CartAction>; // ← correct type for dispatch as prop
};

const CATALOG = [
  { id: 'a', name: 'TypeScript Handbook', price: 29 },
  { id: 'b', name: 'React Patterns',      price: 35 },
  { id: 'c', name: 'Clean Code',          price: 22 },
];

function CartControls({ dispatch }: CartControlsProps) {
  return (
    <div>
      <strong style={{ fontSize: 13 }}>Catalog</strong>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
        {CATALOG.map(item => (
          <button
            key={item.id}
            onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13 }}
          >
            + {item.name} (${item.price})
          </button>
        ))}
      </div>
    </div>
  );
}

function Exercise3() {
  const [cart, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <div>
      <p style={hint}>
        The reducer's <code>default</code> branch uses <code>action satisfies never</code> —
        TypeScript errors there if you add a new action type without a matching case.
        Try it: add <code>| &#123; type: 'APPLY_DISCOUNT'; percent: number &#125;</code> to{' '}
        <code>CartAction</code> and watch where the error appears.
      </p>

      {/* CartControls gets dispatch — typed as React.Dispatch<CartAction> */}
      <CartControls dispatch={dispatch} />

      {cart.items.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 12 }}>Cart is empty. Add something!</p>
      ) : (
        <div style={{ ...card, marginTop: 12 }}>
          {cart.items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 14 }}>{item.name}</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>${item.price} ×</span>
              <input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => dispatch({ type: 'UPDATE_QTY', id: item.id, qty: +e.target.value })}
                style={{ width: 48, padding: '2px 6px', borderRadius: 4, border: '1px solid #d1d5db', textAlign: 'center' }}
              />
              <button
                onClick={() => dispatch({ type: 'REMOVE_ITEM', id: item.id })}
                style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', color: '#dc2626', fontSize: 13 }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Total: ${cart.total.toFixed(2)}</strong>
            <button
              onClick={() => dispatch({ type: 'CLEAR_CART' })}
              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13 }}
            >
              Clear cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Typing useState & useReducer
      </h1>

      <h2>Exercise 1 — useState with nullable initial state</h2>
      <Exercise1 />

      <h2>Exercise 2 — Discriminated union vs flat state</h2>
      <Exercise2 />

      <h2>Exercise 3 — useReducer with exhaustiveness check</h2>
      <Exercise3 />
    </div>
  );
}
