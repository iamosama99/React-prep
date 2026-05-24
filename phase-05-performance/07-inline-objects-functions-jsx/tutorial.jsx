// ============================================================
// Topic:   Inline Objects and Functions in JSX
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises show reference instability
//   causing OBSERVABLE bugs: effects firing too often, memo failing,
//   and stale closures. Each exercise is broken — diagnose and fix.
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Exercise 1: useEffect Fires Every Render ─────────────────
//
// SITUATION
//   A <UserProfile> fetches user data whenever `userId` or `options`
//   changes. The effect has both as deps. `userId` is a string — stable.
//   But `options` is an object created in the render body — a NEW
//   reference on every render. So the effect fires on EVERY render,
//   even though the options data never actually changes.
//
//   Symptom: the fetch log keeps growing on every parent re-render,
//   not just when userId or options data changes.
//
// YOUR TASK
//   1. Click "Parent tick" several times. Watch fetch count climb.
//   2. Each click is a parent re-render. UserId and options data
//      haven't changed — but the effect fires anyway.
//   3. Apply one of the three fixes (commented in the code).
//   4. Verify: fetch only fires when userId actually changes.

let fetchCallCount = 0;

function simulateFetch(userId, options) {
  fetchCallCount++;
  console.log(`fetch #${fetchCallCount}: userId=${userId}, fields=${options.include.join(',')}`);
  return fetchCallCount;
}

function UserProfile({ userId }) {
  const [fetchCount, setFetchCount] = useState(0);

  // ❌ BUG: new object reference every render → effect fires every render
  const options = { include: ['name', 'email', 'avatar'] };

  // ✅ FIX 1 — hoist to module level (options never changes):
  // const options = USER_FETCH_OPTIONS; // defined below component

  // ✅ FIX 2 — useMemo (if options depended on props/state):
  // const options = useMemo(() => ({ include: ['name', 'email', 'avatar'] }), []);

  // ✅ FIX 3 — move object inside the effect (not a dep at all):
  // In the effect: fetchUser(userId, { include: ['name', 'email', 'avatar'] })
  // And remove options from the dep array entirely.

  useEffect(() => {
    const count = simulateFetch(userId, options);
    setFetchCount(count);
    // The effect fires because options is a new reference every render
    // even though { include: ['name', 'email', 'avatar'] } is semantically identical
  }, [userId, options]); // ← options is "new" every render

  return (
    <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 13 }}>
      <div>User: <strong>{userId}</strong></div>
      <div>Total fetch calls: <strong style={{ color: fetchCount > 2 ? '#dc2626' : '#16a34a' }}>{fetchCount}</strong></div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        (should only increment when userId changes, not on parent re-renders)
      </div>
    </div>
  );
}

// Module-level constant for Fix 1:
const USER_FETCH_OPTIONS = { include: ['name', 'email', 'avatar'] };

function Exercise1() {
  const [tick, setTick] = useState(0);
  const [userId, setUserId] = useState('user_1');

  return (
    <section>
      <h2>Exercise 1 — useEffect Fires Every Render (Unstable Object Dep)</h2>
      <p style={hint}>
        Click "Parent tick" — the fetch count should stay the same (userId hasn't changed).
        But it climbs. Find the unstable dep and fix it.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setTick(t => t + 1)}
          style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          Parent tick ({tick}) — userId unchanged
        </button>
        <button
          onClick={() => setUserId(u => u === 'user_1' ? 'user_2' : 'user_1')}
          style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
        >
          Change userId (fetch SHOULD fire)
        </button>
      </div>

      <UserProfile userId={userId} />

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The systematic fix process:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Look at each dep: is it a primitive or an object/array/function?</li>
          <li>For each non-primitive: where is it created? Is it re-created each render?</li>
          <li>Fix: hoist (if stable forever), useMemo (if computed), move inside effect (if only used there).</li>
        </ol>
      </div>
    </section>
  );
}


// ─── Exercise 2: Inline Function in List Row ──────────────────
//
// SITUATION
//   A product list with 50 rows. Each row is memoized and has a
//   "Delete" button. The parent generates `onClick={() => deleteItem(id)}`
//   inline for each row — a new function per row per render.
//   Memo never bails out. Every parent re-render re-renders all 50 rows.
//
//   This is the most impactful inline function problem in production:
//   N rows × new function per row = N unnecessary renders per parent update.
//
// YOUR TASK
//   1. Toggle "Show prices" (updates parent state). Watch all row renders climb.
//   2. Fix: change the row API so it receives the `onDelete` callback
//      and the `id` separately, and calls `onDelete(id)` internally.
//      Wrap `onDelete` with useCallback in the parent (no deps needed if
//      it doesn't close over state).
//   3. Verify: toggling "Show prices" no longer increments row render counts.

const ProductRow = memo(function ProductRow({ id, name, price, showPrice, onClick }) {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <span style={{ flex: 1 }}>{name}</span>
      {showPrice && <span style={{ color: '#64748b' }}>${price}</span>}
      <button
        onClick={onClick}
        style={{ padding: '2px 8px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}
      >
        Delete
      </button>
      <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 70 }}>renders: {count.current}</span>
    </div>
  );
});

const PRODUCTS = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`, name: `Product ${i + 1}`, price: (i + 1) * 9.99,
}));

function Exercise2() {
  const [products, setProducts] = useState(PRODUCTS);
  const [showPrice, setShowPrice] = useState(false);

  // ❌ PROBLEM: new function per product per render
  // const deleteItem = (id) => setProducts(prev => prev.filter(p => p.id !== id));

  // ✅ FIX: stable callback with useCallback
  // const deleteItem = useCallback((id) => setProducts(prev => prev.filter(p => p.id !== id)), []);
  // Then in the row: onClick={() => deleteItem(product.id)} is still unstable...
  // Better: pass onDelete={deleteItem} and id={product.id} separately, let row call onDelete(id)

  const deleteItem = (id) => setProducts(prev => prev.filter(p => p.id !== id));

  return (
    <section>
      <h2>Exercise 2 — Inline Function Per List Row</h2>
      <p style={hint}>
        Toggle "Show prices" — a parent state change unrelated to the rows.
        All rows re-render. Fix by stabilizing the delete callback.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setShowPrice(v => !v)}
          style={{ ...btnStyle, background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb' }}
        >
          Toggle prices (currently: {showPrice ? 'visible' : 'hidden'})
        </button>
      </div>

      <div style={card}>
        {products.map(product => (
          <ProductRow
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            showPrice={showPrice}
            // ❌ New function per row per render:
            onClick={() => deleteItem(product.id)}
            // ✅ FIX: pass onDelete={stableDeleteCallback} and let row call onDelete(id)
          />
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The right pattern for memoized list rows:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Pass a single stable <code>onDelete</code> callback (useCallback, no deps or stable deps)</li>
          <li>Pass the <code>id</code> as a separate prop</li>
          <li>In the row: <code>onClick={() =&gt; onDelete(id)}</code> — this arrow IS still new per render,
            but it only captures stable primitives, so it doesn't matter for memo (wait, it does —
            the row still gets a new onClick). Better: let the row use data delegation or event.target.</li>
          <li>Best pattern: pass <code>onDelete={stableCallback}</code> and <code>id={product.id}</code>,
            memo compares <code>onDelete</code> (stable) and <code>id</code> (primitive). Row uses
            <code>() =&gt; onDelete(id)</code> created inside ProductRow — this is fine since it only
            runs on actual click, not on each render of the parent.</li>
        </ol>
      </div>
    </section>
  );
}


// ─── Exercise 3: Context Value Object ─────────────────────────
//
// SITUATION
//   This is the highest-impact inline object problem in most apps.
//   A context provider creates its value as an object literal: `value={{ user, logout }}`.
//   New object reference on every App render → all consumers re-render on every App render.
//   Since App usually re-renders frequently (it's the root), this cascades everywhere.
//
//   Fix: useMemo the value object so it only changes when its contents actually change.
//
// YOUR TASK
//   1. Click "App re-render" — all three consumers re-render, even though
//      user and logout haven't changed.
//   2. Apply the useMemo fix to the context value.
//   3. Verify: only the component whose data actually changed re-renders.
//   4. BONUS: logout is also an inline function — what problem does this cause
//      even after memoizing the object?

import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

function UserDisplay() {
  const ctx = useContext(AuthContext);
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '5px 10px', background: '#eff6ff', borderRadius: 4, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <span>UserDisplay — {ctx.user.name}</span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>renders: {count.current}</span>
    </div>
  );
}

function LogoutButton() {
  const ctx = useContext(AuthContext);
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '5px 10px', background: '#f0fdf4', borderRadius: 4, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <button onClick={ctx.logout} style={{ fontSize: 12, padding: '2px 8px', background: 'none', border: '1px solid #86efac', borderRadius: 3, cursor: 'pointer' }}>
        Logout
      </button>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>renders: {count.current}</span>
    </div>
  );
}

function ThemeToggle() {
  const ctx = useContext(AuthContext);
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '5px 10px', background: '#fef3c7', borderRadius: 4, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <span>ThemeToggle — theme: {ctx.theme}</span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>renders: {count.current}</span>
    </div>
  );
}

function Exercise3() {
  const [appTick, setAppTick] = useState(0);
  const [user] = useState({ name: 'Alice', id: 'u1' });
  const [theme, setTheme] = useState('light');

  // ❌ PROBLEM: new object on every App render → all consumers re-render
  const contextValue = {
    user,
    logout: () => console.log('logging out'),  // ← also new function every render
    theme,
  };

  // ✅ FIX:
  // const logout = useCallback(() => console.log('logging out'), []);
  // const contextValue = useMemo(() => ({ user, logout, theme }), [user, logout, theme]);

  return (
    <section>
      <h2>Exercise 3 — Context Value Object (The Most Common Production Bug)</h2>
      <p style={hint}>
        "App re-render" simulates a root-level re-render. All consumers re-render even
        though user, logout, and theme haven't changed. Fix with useMemo.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setAppTick(t => t + 1)}
          style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          App re-render tick ({appTick})
        </button>
        <button
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          style={{ ...btnStyle, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}
        >
          Toggle theme (should re-render ThemeToggle only)
        </button>
      </div>

      <AuthContext.Provider value={contextValue}>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <UserDisplay />
          <LogoutButton />
          <ThemeToggle />
        </div>
      </AuthContext.Provider>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>After the fix:</strong> "App re-render" should increment no consumer renders
        (the context value object reference is stable). "Toggle theme" should increment
        only ThemeToggle (theme changed, so contextValue memo invalidates, all consumers
        re-render — you'd need separate contexts to isolate theme from user).
        <br /><br />
        <strong>Bonus:</strong> Even after useMemo, if <code>logout</code> is defined inline,
        useMemo sees a new dep each render and re-creates the object anyway. You need
        <code>useCallback</code> for logout to make useMemo actually stable.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 07 — Inline Objects &amp; Functions in JSX
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
