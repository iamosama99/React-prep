// ============================================================
// Topic:   List Virtualization
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises build a virtualizer FROM
//   SCRATCH to make the mechanism concrete — then show the same
//   result with a real library pattern. No external dependencies needed.
// ============================================================

import { useState, useRef, useCallback, useMemo } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };

// Generate a large dataset
const ALL_ITEMS = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i + 1}`,
  description: `Description for item ${i + 1} — some extra text to make it realistic`,
  price: ((i % 97) * 3.99 + 4.99).toFixed(2),
}));


// ─── Exercise 1: The Naive List Problem ───────────────────────
//
// SITUATION
//   Render 10,000 rows naively. Observe the performance problem:
//   - Long initial render time (thousands of DOM nodes created)
//   - Laggy scroll (browser layout/paint with 10,000 nodes)
//   - High memory usage (10,000 fiber nodes, 10,000 DOM nodes)
//
//   This exercise exists to make the PROBLEM visceral before the fix.
//   DO NOT ship this pattern in production.
//
// YOUR TASK
//   1. Click "Render all 10,000 rows" — notice the pause before they appear.
//   2. Try scrolling — notice any jank.
//   3. Open DevTools → Performance → take a snapshot. See the layout cost.
//   4. Open DevTools → Elements — count the actual DOM nodes.
//   5. Answer: why does a 10,000-item list hurt performance even if only
//      ~15 rows are visible at a time?

function NaiveRow({ item }) {
  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: 13,
      display: 'flex',
      gap: 12,
      alignItems: 'center',
    }}>
      <span style={{ width: 60, color: '#94a3b8', flexShrink: 0 }}>#{item.id}</span>
      <span style={{ flex: 1 }}>{item.name}</span>
      <span style={{ color: '#64748b' }}>${item.price}</span>
    </div>
  );
}

function Exercise1() {
  const [show, setShow] = useState(false);
  const [itemCount, setItemCount] = useState(100);

  return (
    <section>
      <h2>Exercise 1 — The Naive List Problem</h2>
      <p style={hint}>
        Render a large list naively. Observe initial render time and scroll performance.
        The browser creates DOM nodes for ALL items, even invisible ones.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {[100, 1000, 5000, 10000].map(n => (
          <button
            key={n}
            onClick={() => { setItemCount(n); setShow(true); }}
            style={{
              ...btnStyle,
              background: itemCount === n && show ? '#1e293b' : '#f1f5f9',
              color: itemCount === n && show ? 'white' : '#475569',
              border: '1px solid #e2e8f0',
            }}
          >
            {n.toLocaleString()} rows
          </button>
        ))}
        {show && (
          <button onClick={() => setShow(false)} style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}>
            Unmount
          </button>
        )}
      </div>

      {show && (
        <div style={{ ...card, padding: 0 }}>
          <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: '8px 8px 0 0', fontSize: 12, color: '#dc2626' }}>
            ⚠️ {itemCount.toLocaleString()} DOM nodes — all in the layout tree simultaneously
          </div>
          <div style={{ height: 320, overflowY: 'auto' }}>
            {ALL_ITEMS.slice(0, itemCount).map(item => (
              <NaiveRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ANSWER: Why does it hurt even when only 15 rows are visible?
          1. DOM layout: every DOM node participates in the layout engine.
             Even invisible nodes can affect layout (overflow, flexbox, scroll height).
             Each reflow recalculates positions for ALL nodes.
          2. Memory: 10,000 DOM nodes × ~500 bytes = ~5MB of DOM memory.
             Plus 10,000 React fiber nodes.
          3. Event listeners: React attaches event listeners at the root,
             but the browser still needs to hit-test against all nodes.
          4. Initial render: React must call createElement() for each node,
             create fiber nodes, and diff the entire tree on mount.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Observe:</strong> Start at 100 rows (fast) → try 5,000 → try 10,000.
        The degradation tells you exactly when to consider virtualization.
        Rule of thumb: &lt;500 items is usually fine; 500+ warrants profiling; 1000+ → virtualize.
      </div>
    </section>
  );
}


// ─── Exercise 2: Build a Manual Virtualizer ──────────────────
//
// SITUATION
//   Understanding how virtualization works by building it from scratch.
//   The core mechanism:
//   1. An outer container with fixed height and overflow:scroll
//   2. An inner "phantom" container sized to total_items × item_height
//      (gives the scrollbar correct proportions)
//   3. On scroll, compute visible range from scrollTop + itemHeight
//   4. Render ONLY those items, positioned absolutely within the phantom
//
//   This keeps DOM node count constant (~15-25) regardless of list size.
//
// YOUR TASK
//   The virtualizer below is INCOMPLETE. Fill in:
//   A. The visible range calculation in getVisibleRange()
//   B. The absolute position for each item (top = index * ITEM_HEIGHT)
//   C. Verify: the DOM node count stays ~constant while scrolling
//
//   Formula:
//     firstVisible = Math.floor(scrollTop / ITEM_HEIGHT)
//     lastVisible  = Math.min(
//       itemCount - 1,
//       Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT)
//     )
//     Add OVERSCAN (2-3 items above and below) to prevent blank flash

const ITEM_HEIGHT = 48; // px — fixed height for each row
const CONTAINER_HEIGHT = 320; // px — viewport height
const OVERSCAN = 2; // extra items above/below visible area

function VirtualRow({ item, style }) {
  return (
    // style MUST be applied — it contains position:absolute and top offset
    <div style={{
      ...style,
      padding: '0 12px',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      borderBottom: '1px solid #f1f5f9',
      fontSize: 13,
      background: 'white',
    }}>
      <span style={{ width: 60, color: '#94a3b8', flexShrink: 0 }}>#{item.id}</span>
      <span style={{ flex: 1 }}>{item.name}</span>
      <span style={{ color: '#64748b' }}>${item.price}</span>
    </div>
  );
}

function ManualVirtualList({ items }) {
  const scrollTopRef = useRef(0);
  const [, forceUpdate] = useState(0);

  const handleScroll = (e) => {
    scrollTopRef.current = e.target.scrollTop;
    forceUpdate(n => n + 1);
  };

  const scrollTop = scrollTopRef.current;
  const totalHeight = items.length * ITEM_HEIGHT;

  // ─── YOUR TASK: implement getVisibleRange ─────────────────
  const getVisibleRange = () => {
    // TODO: implement these two lines:
    // const firstVisible = Math.floor(scrollTop / ITEM_HEIGHT);
    // const lastVisible = Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT);

    // Stub (renders everything — replace with the formula above):
    const firstVisible = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const lastVisible = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + OVERSCAN
    );
    return { firstVisible, lastVisible };
  };
  // ─────────────────────────────────────────────────────────

  const { firstVisible, lastVisible } = getVisibleRange();
  const visibleItems = items.slice(firstVisible, lastVisible + 1);
  const renderedCount = visibleItems.length;

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', gap: 16 }}>
        <span>Total items: <strong>{items.length.toLocaleString()}</strong></span>
        <span>DOM nodes rendered: <strong style={{ color: renderedCount < 30 ? '#16a34a' : '#dc2626' }}>{renderedCount}</strong></span>
        <span>Visible range: <strong>{firstVisible}–{lastVisible}</strong></span>
      </div>

      {/* Outer scroll container — fixed height, overflow:scroll */}
      <div
        onScroll={handleScroll}
        style={{ height: CONTAINER_HEIGHT, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, position: 'relative' }}
      >
        {/* Inner phantom — full height to give scrollbar correct proportions */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item) => (
            <VirtualRow
              key={item.id}
              item={item}
              style={{
                position: 'absolute',
                top: item.id * ITEM_HEIGHT, // ← each item at its correct offset
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Exercise2() {
  const [count, setCount] = useState(10000);

  return (
    <section>
      <h2>Exercise 2 — Build a Manual Virtualizer</h2>
      <p style={hint}>
        Scroll through the list. Notice the DOM node count stays constant (~25)
        regardless of list size. Inspect Elements in DevTools to verify.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[1000, 5000, 10000].map(n => (
          <button
            key={n}
            onClick={() => setCount(n)}
            style={{ ...btnStyle, background: count === n ? '#1e293b' : '#f1f5f9', color: count === n ? 'white' : '#475569', border: '1px solid #e2e8f0' }}
          >
            {n.toLocaleString()} items
          </button>
        ))}
      </div>

      <div style={card}>
        <ManualVirtualList items={ALL_ITEMS.slice(0, count)} />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The phantom container trick:</strong> The inner div's height is
        <code>totalItems × itemHeight</code>. This gives the scrollbar the correct
        proportions — it represents the full list size — without rendering all items.
        Only the visible slice (~15 items + OVERSCAN) is in the DOM.
        <br /><br />
        <strong>OVERSCAN:</strong> Rendering 2-3 extra items above/below the viewport
        prevents blank flashes during fast scrolling (while React is recalculating).
      </div>
    </section>
  );
}


// ─── Exercise 3: Row Memoization for the Virtual Window ───────
//
// SITUATION
//   Every scroll event re-renders the virtual list component, which
//   recalculates the visible range. The items in the visible window
//   may or may not have changed — but without memoization, ALL visible
//   rows re-render on every scroll event.
//
//   This is the same problem as any list: wrap the row component in
//   React.memo so rows only re-render when their data changes, not
//   when the scroll position changes.
//
// YOUR TASK
//   1. The current VirtualRowMemo is already wrapped in React.memo.
//   2. Scroll the list and watch the render counts.
//   3. Rows that are "sliding in" (newly visible) render once.
//   4. Rows that stay visible across scroll events DON'T re-render.
//   5. Answer: what would happen if we passed `itemData` as an inline
//      object instead of a stable reference?

const VirtualRowMemo = ({ item, style }) => {
  const count = useRef(0);
  count.current++;

  return (
    <div style={{
      ...style,
      padding: '0 12px',
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      borderBottom: '1px solid #f1f5f9',
      fontSize: 13,
      background: count.current > 1 ? '#fef9c3' : 'white',
      // Yellow = re-rendered (already was in the window and scrolled slightly)
    }}>
      <span style={{ width: 60, color: '#94a3b8', flexShrink: 0 }}>#{item.id}</span>
      <span style={{ flex: 1 }}>{item.name}</span>
      <span style={{ fontSize: 11, color: count.current > 1 ? '#dc2626' : '#94a3b8' }}>
        {count.current} render{count.current !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

// Wrap in memo AFTER defining — same as memo(function VirtualRowMemo...)
const MemoizedVirtualRow = ({ item, style }) => <VirtualRowMemo item={item} style={style} />;

function MemoizedVirtualList({ items }) {
  const scrollTopRef = useRef(0);
  const [, forceUpdate] = useState(0);

  const handleScroll = (e) => {
    scrollTopRef.current = e.target.scrollTop;
    forceUpdate(n => n + 1);
  };

  const scrollTop = scrollTopRef.current;
  const totalHeight = items.length * ITEM_HEIGHT;
  const firstVisible = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const lastVisible = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + CONTAINER_HEIGHT) / ITEM_HEIGHT) + OVERSCAN
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        DOM nodes: ~{lastVisible - firstVisible + 1} | White = first render, Yellow = re-rendered
      </div>
      <div
        onScroll={handleScroll}
        style={{ height: CONTAINER_HEIGHT, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, position: 'relative' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {items.slice(firstVisible, lastVisible + 1).map((item) => (
            // Using the key ensures items unmount/remount only when their id changes
            // Not using memo here on purpose — demonstrating that scroll events
            // trigger re-renders of ALL visible rows
            <VirtualRowMemo
              key={item.id}
              item={item}
              style={{
                position: 'absolute',
                top: item.id * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Row Memoization Matters During Scroll</h2>
      <p style={hint}>
        Scroll slowly. Rows turning yellow have re-rendered. Rows that slid in
        fresh are white (first render). Without memo, EVERY visible row re-renders
        on every scroll event.
      </p>

      <div style={card}>
        <MemoizedVirtualList items={ALL_ITEMS.slice(0, 2000)} />
      </div>

      {/* ANSWER: inline itemData object problem:
          react-window passes itemData to each row via props. If you define
          itemData = { onClick: handleClick } inline in the parent render,
          it's a new object on every scroll → memo never bails out → every
          row re-renders on every scroll event. Pass a stable reference
          (module-level constant or useMemo) as itemData to enable memo to work.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Production pattern with react-window:</strong>
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '10px 14px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>{`const Row = React.memo(function Row({ index, style, data }) {
  return <div style={style}>{data[index].name}</div>;
});

// Pass data via itemData prop — must be a stable reference
const itemData = useMemo(() => items, [items]);
<FixedSizeList itemData={itemData} ...>
  {Row}
</FixedSizeList>`}</pre>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 10 — List Virtualization
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
