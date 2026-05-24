// ============================================================
// Topic:   React.memo Deep Dive
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. Each exercise shows memo FAILING silently —
//   the component is wrapped in memo but still re-renders. Your job
//   is to diagnose the root cause and fix it.
// ============================================================

import { useState, useContext, createContext, useRef, useMemo, useCallback, memo } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };

function RenderBadge({ count }) {
  const prev = useRef(count);
  const isNew = count !== prev.current;
  prev.current = count;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 10, fontSize: 11,
      background: isNew ? '#fee2e2' : '#f1f5f9',
      color: isNew ? '#dc2626' : '#64748b',
      transition: 'background 0.3s',
    }}>
      renders: {count}
    </span>
  );
}


// ─── Exercise 1: Memo Fails — Inline Object Prop ─────────────
//
// SITUATION
//   A <DataTable> component is expensive to render. You've wrapped it
//   in React.memo hoping it won't re-render when the parent updates.
//   But it STILL re-renders on every click. Why?
//
//   The parent passes `style={{ background: '#fff', padding: 12 }}`
//   directly in JSX. This creates a NEW object on every parent render.
//   React.memo does a shallow comparison with Object.is — two different
//   objects with identical content are NOT equal. Memo sees "changed prop"
//   and renders anyway.
//
// YOUR TASK
//   1. Click "Parent tick" several times. Notice DataTable re-renders every time.
//   2. Identify: which prop is the culprit?
//   3. Fix it: choose the right strategy from the three options commented below.
//   4. After fixing, verify DataTable no longer re-renders on parent ticks.

const DataTable = memo(function DataTable({ data, style }) {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ ...style, borderRadius: 6, border: '1px solid #e2e8f0', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <strong>DataTable ({data.length} rows)</strong>
        <RenderBadge count={count.current} />
      </div>
      {data.slice(0, 3).map(row => (
        <div key={row.id} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
          {row.name}
        </div>
      ))}
    </div>
  );
});

const TABLE_DATA = [
  { id: 1, name: 'Alice Johnson' },
  { id: 2, name: 'Bob Smith' },
  { id: 3, name: 'Carol White' },
];

function Exercise1() {
  const [tick, setTick] = useState(0);

  // ❌ PROBLEM: new object reference on every render
  const tableStyle = { background: '#ffffff', padding: 12 };

  // ✅ FIX OPTION 1 — hoist to module level (simplest, zero cost):
  // const tableStyle = TABLE_STYLE; // defined outside the component

  // ✅ FIX OPTION 2 — useMemo (if style depends on props/state):
  // const tableStyle = useMemo(() => ({ background: '#ffffff', padding: 12 }), []);

  return (
    <section>
      <h2>Exercise 1 — Memo Fails: Inline Object Prop</h2>
      <p style={hint}>
        DataTable is wrapped in memo. Click "Parent tick" — does DataTable
        re-render? Diagnose why, then fix it.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => setTick(t => t + 1)}
          style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
        >
          Parent tick ({tick}) — DataTable's data and style are unchanged
        </button>
      </div>

      <div style={card}>
        {/* TODO: Fix — DataTable should NOT re-render on parent ticks */}
        <DataTable data={TABLE_DATA} style={tableStyle} />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Diagnosis steps:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Which prop is an object/array/function? → <code>style</code></li>
          <li>Is it created in the parent's render body? → Yes (<code>{'{ background: ... }'}</code>)</li>
          <li>Is it the same value each render? → Yes conceptually, but different reference.</li>
          <li>Fix: hoist to module-level constant (never changes) or useMemo (if dynamic).</li>
        </ol>
      </div>
    </section>
  );
}

// Module-level constant for Option 1 fix reference:
const TABLE_STYLE = { background: '#ffffff', padding: 12 };


// ─── Exercise 2: Memo Fails — Inline Function Prop ───────────
//
// SITUATION
//   A <SearchInput> component is memoized. The parent passes an
//   onChange handler defined as an inline arrow function. New function
//   reference on every parent render → memo always fails.
//
//   The fix is useCallback. But there's a subtlety: if the useCallback
//   itself has a dep that's unstable (another inline function), the
//   stability chain breaks. You must stabilize the ENTIRE chain.
//
// YOUR TASK
//   1. Click "Parent tick" — SearchInput re-renders despite memo.
//   2. Fix onChange with useCallback. Verify: no more re-renders.
//   3. BONUS: There's a second bug. The onSearch callback inside
//      handleChange calls `onSearch` which comes from props. If the
//      parent passes `onSearch` as an inline function, your useCallback
//      is still unstable. Find it and fix the chain.

const SearchInput = memo(function SearchInput({ onChange, placeholder }) {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        onChange={onChange}
        placeholder={placeholder}
        style={{ flex: 1, padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}
      />
      <RenderBadge count={count.current} />
    </div>
  );
});

function Exercise2() {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // ❌ PROBLEM: new function on every render
  const handleChange = (e) => setQuery(e.target.value);

  // ✅ FIX:
  // const handleChange = useCallback((e) => setQuery(e.target.value), []);
  // setQuery from useState is always stable — no deps needed

  // ❌ BONUS BUG: if onSearch were a prop passed as inline function:
  // const handleChange = useCallback((e) => {
  //   setQuery(e.target.value);
  //   onSearch(e.target.value); // ← if onSearch is unstable, handleChange is unstable too
  // }, [onSearch]); // ← dep chain broken if onSearch is recreated each render

  return (
    <section>
      <h2>Exercise 2 — Memo Fails: Inline Function Prop</h2>
      <p style={hint}>
        SearchInput is wrapped in memo. Click "Parent tick" — why does it still re-render?
        Fix it, then watch the render badge freeze on parent ticks.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setTick(t => t + 1)}
          style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
        >
          Parent tick ({tick}) — search props are unchanged
        </button>
      </div>

      <div style={card}>
        <SearchInput onChange={handleChange} placeholder="Type to search..." />
        {query && <div style={{ fontSize: 13, marginTop: 8, color: '#64748b' }}>Query: "{query}"</div>}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The stability chain rule:</strong> Every dep in a useCallback must itself
        be stable. If you fix <code>handleChange</code> with useCallback but its dep
        is an unstable function, <code>handleChange</code> is still recreated every render.
        Stability must hold all the way up the chain.
      </div>
    </section>
  );
}


// ─── Exercise 3: Memo Fails — JSX Children ───────────────────
//
// SITUATION
//   A memoized <Panel> is passed JSX as children. Each render of
//   the parent creates new React element objects for those children.
//   Memo's shallow comparison sees new references → renders anyway.
//
//   This is a subtle and common trap. It looks like you've correctly
//   memoized the panel, but the children prop defeats the optimization.
//
// YOUR TASK
//   1. Click "Parent tick" — Panel re-renders despite memo.
//   2. Inspect: what is the `children` prop? (A React element — a new object each render.)
//   3. Fix: memoize the children content in the parent with useMemo.
//   4. Verify Panel stops re-rendering on parent ticks.
//
// BONUS QUESTION
//   If Panel also calls useContext internally — will it still re-render
//   when the context value changes, even after the children fix?
//   (Hint: check the notes.md gotchas section)

const Panel = memo(function Panel({ title, children }) {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <RenderBadge count={count.current} />
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
});

function ExpensiveContent() {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ fontSize: 13, color: '#475569' }}>
      ExpensiveContent — renders: {count.current}
    </div>
  );
}

function Exercise3() {
  const [tick, setTick] = useState(0);

  // ❌ PROBLEM: <ExpensiveContent /> is a new object on every render
  const content = <ExpensiveContent />;

  // ✅ FIX:
  // const content = useMemo(() => <ExpensiveContent />, []);
  // Now the same React element object is passed every time → Panel's
  // children prop is stable → memo bails out.

  return (
    <section>
      <h2>Exercise 3 — Memo Fails: JSX Children Prop</h2>
      <p style={hint}>
        Panel is memo'd. But JSX children are React elements — new object
        references every render. Memo sees "changed children" and renders anyway.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setTick(t => t + 1)}
          style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
        >
          Parent tick ({tick}) — Panel's content hasn't changed
        </button>
      </div>

      <div style={card}>
        {/* TODO: fix — Panel should not re-render on parent ticks */}
        <Panel title="Stats Panel">
          {content}
        </Panel>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Bonus answer:</strong> Yes — if Panel calls useContext, context changes
        bypass memo entirely. memo only intercepts parent-triggered renders. Context
        changes go directly to consumers, skipping the prop comparison.
        <br /><br />
        <strong>The full memo checklist:</strong>
        <ol style={{ marginTop: 6, paddingLeft: 18 }}>
          <li>All object props stable? (useMemo or module-level constant)</li>
          <li>All function props stable? (useCallback)</li>
          <li>JSX children stable? (useMemo or move to stable parent)</li>
          <li>No context subscriptions that change? (memo doesn't help there)</li>
        </ol>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 05 — React.memo Deep Dive
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
