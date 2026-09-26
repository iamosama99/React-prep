// ============================================================
// Topic:   Performance Patterns II — Splitting, Virtualisation, Concurrency
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — three reconciliation bugs (component identity & keys)
//   Exercise 2 — virtualise a 10,000-row list from scratch
//   Exercise 3 — keep typing responsive: useDeferredValue vs useTransition
//   Exercise 4 — lazy chunk with prefetch-on-hover
//
// (The React Compiler needs a build plugin, so it isn't runnable in this
//  sandbox — see notes.md. Everything below runs on React 18.)
//
// Run: npm run tutorial performance-advanced
// ============================================================

import {
  Suspense, lazy, memo, useDeferredValue, useState, useTransition, FC, UIEvent,
} from 'react';

// ─── Exercise 1: Reconciliation Bugs ─────────────────────────
//
// SITUATION
//   React matches trees by TYPE and KEY. Wrong identity → unmount/remount →
//   lost state and wasted work. Each bug has an observable symptom.
//   Fix all three.
//
//   (a) Type a note, click "bump": the text vanishes. (component defined inside)
//   (b) Same symptom, different cause. (unstable key)
//   (c) Type notes in rows, click "Reverse": labels move, notes don't.
//       (index keys on a reorderable list)

function NestedDefinitionBug() {
  const [n, setN] = useState(0);
  // TODO (a): this creates a NEW component type every render — hoist Field to module scope
  const Field = () => <input placeholder="type a note, then bump" />;
  return (
    <div style={card}>
      <strong>(a) Component defined inside a component</strong>
      <div><button onClick={() => setN(x => x + 1)}>bump ({n})</button> <Field /></div>
    </div>
  );
}

function RandomKeyBug() {
  const [n, setN] = useState(0);
  return (
    <div style={card}>
      <strong>(b) Unstable key</strong>
      <div>
        <button onClick={() => setN(x => x + 1)}>bump ({n})</button>{' '}
        {/* TODO (b): a key that changes every render forces a remount */}
        <input key={Math.random()} placeholder="type a note, then bump" />
      </div>
    </div>
  );
}

function IndexKeyBug() {
  const [rows, setRows] = useState([
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Grace' },
    { id: 'c', name: 'Alan' },
  ]);
  return (
    <div style={card}>
      <strong>(c) Index keys on a reorderable list</strong>
      <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
        {/* TODO (c): key={i} attaches the input's DOM state to the POSITION, not the row */}
        {rows.map((r, i) => (
          <li key={i}>{r.name} <input placeholder="note" /></li>
        ))}
      </ul>
      <button onClick={() => setRows(r => [...r].reverse())}>Reverse</button>
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Reconciliation</h2>
      <NestedDefinitionBug />
      <RandomKeyBug />
      <IndexKeyBug />
    </section>
  );
}

// ─── Exercise 2: Virtualisation from Scratch ─────────────────
//
// SITUATION
//   10,000 rows. Rendering them all means 10,000 DOM nodes. Render only
//   what's visible (plus overscan) and fake the rest with a tall spacer.
//
// BUILD  useWindow({ count, itemHeight, height, overscan = 3 })
//   - scrollTop state
//   - start = max(0, floor(scrollTop / itemHeight) - overscan)
//   - end   = min(count, ceil((scrollTop + height) / itemHeight) + overscan)
//   - totalHeight = count * itemHeight; offsetY = start * itemHeight
//   - onScroll handler that updates scrollTop from e.currentTarget.scrollTop
//
// SUCCESS  The counter under the list shows ~20 rows in the DOM out of 10,000,
//          and scrolling shows the right rows (row numbers match).

const COUNT = 10_000;
const ITEM_H = 28;
const VIEW_H = 280;

type WindowOpts = { count: number; itemHeight: number; height: number; overscan?: number };

function useWindow({ count, itemHeight, height, overscan = 3 }: WindowOpts) {
  // TODO: replace this static stub with the real calculation
  void height; void overscan;
  return {
    start: 0,
    end: Math.min(count, 20),
    totalHeight: count * itemHeight,
    offsetY: 0,
    onScroll: (_e: UIEvent<HTMLDivElement>) => {},
  };
}

function Exercise2() {
  const { start, end, totalHeight, offsetY, onScroll } = useWindow({
    count: COUNT, itemHeight: ITEM_H, height: VIEW_H,
  });
  const rows = [];
  for (let i = start; i < end; i++) {
    rows.push(
      <div key={i} style={{ height: ITEM_H, lineHeight: `${ITEM_H}px`, borderBottom: '1px solid #f1f5f9', paddingLeft: 8 }}>
        Row #{i + 1}
      </div>,
    );
  }
  return (
    <section>
      <h2>Exercise 2 — Virtual List</h2>
      <div style={{ height: VIEW_H, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 6 }} onScroll={onScroll}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>{rows}</div>
        </div>
      </div>
      <p style={muted}>DOM rows rendered: <strong>{end - start}</strong> of {COUNT.toLocaleString()}</p>
    </section>
  );
}

// ─── Exercise 3: Keep Typing Responsive ──────────────────────
//
// SITUATION
//   SlowList takes ~100 ms to render. In Baseline, every keystroke waits for it,
//   so typing stutters. Concurrency lets React render the list at LOWER
//   priority and interrupt it when you type again.
//
// BUILD
//   A. DeferredPanel   — useDeferredValue(query) feeds the list; dim the list while stale.
//   B. TransitionPanel — separate `text` (urgent) and `filter` (non-urgent) state;
//                        setFilter inside startTransition; show `isPending`.
//
// TEST  Type quickly in each. Baseline lags per key; A and B keep the input
//       snappy while the list catches up.

function busy(ms: number) {
  const t = performance.now();
  while (performance.now() - t < ms) { /* simulate expensive render */ }
}

const SlowRow: FC<{ label: string; highlight: boolean }> = ({ label, highlight }) => {
  busy(0.4);
  return <li style={{ background: highlight ? '#fef08a' : undefined }}>{label}</li>;
};

// memo matters: without it the list also re-renders for the URGENT value
const SlowList = memo(function SlowList({ query }: { query: string }) {
  const items = Array.from({ length: 250 }, (_, i) => `Item ${i}`);
  return (
    <ul style={{ columns: 3, margin: 0 }}>
      {items.map(l => <SlowRow key={l} label={l} highlight={!!query && l.toLowerCase().includes(query.toLowerCase())} />)}
    </ul>
  );
});

const BaselinePanel: FC = () => {
  const [query, setQuery] = useState('');
  return (
    <div style={card}>
      <strong>Baseline</strong>
      <div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="type 'item 1'…" /></div>
      <SlowList query={query} />
    </div>
  );
};

const DeferredPanel: FC = () => {
  const [query, setQuery] = useState('');
  // TODO A: const deferred = useDeferredValue(query); const stale = deferred !== query;
  void useDeferredValue;
  return (
    <div style={card}>
      <strong>A. useDeferredValue</strong>
      <div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="type 'item 1'…" /></div>
      <div style={{ opacity: 1 }}><SlowList query={query} /></div>
    </div>
  );
};

const TransitionPanel: FC = () => {
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('');
  // TODO B: const [isPending, startTransition] = useTransition();
  //         onChange: setText(v) immediately; startTransition(() => setFilter(v))
  void useTransition;
  return (
    <div style={card}>
      <strong>B. useTransition</strong>
      <div>
        <input value={text} onChange={e => { setText(e.target.value); setFilter(e.target.value); }} placeholder="type 'item 1'…" />
      </div>
      <SlowList query={filter} />
    </div>
  );
};

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Concurrency</h2>
      <BaselinePanel />
      <DeferredPanel />
      <TransitionPanel />
    </section>
  );
}

// ─── Exercise 4: Lazy Chunk + Prefetch on Hover ──────────────
//
// SITUATION
//   HeavyChart is "a big chunk" (simulated 1.2 s download). Loading it only
//   when first shown is good; starting the download when the user HOVERS the
//   button is better.
//
// BUILD
//   1. prefetchChart(): calls loadChart() at most once (cache the promise in a
//      module variable) and returns it.
//   2. LazyChart = lazy(prefetchChart)   — so lazy and prefetch share one download.
//   3. onMouseEnter / onFocus on the button call prefetchChart().
//   4. Suspense fallback = a skeleton with the SAME height as the chart (avoid layout shift).
//
// TEST  Reload the page (lazy caches after the first load). Hover the button
//       for a second BEFORE clicking: the chart should appear instantly.

const HeavyChart: FC = () => (
  <svg width="100%" height="120" viewBox="0 0 200 120" role="img" aria-label="bar chart">
    {[30, 80, 55, 100, 70].map((h, i) => (
      <rect key={i} x={10 + i * 38} y={120 - h} width="28" height={h} fill="#38bdf8" />
    ))}
  </svg>
);

const loadChart = () => new Promise<{ default: FC }>(resolve => setTimeout(() => resolve({ default: HeavyChart }), 1200));

let chartPromise: ReturnType<typeof loadChart> | null = null;
function prefetchChart() {
  // TODO 1: chartPromise ??= loadChart(); return chartPromise;
  return loadChart();
}
const LazyChart = lazy(loadChart);   // TODO 2: lazy(prefetchChart)
void chartPromise;

function Exercise4() {
  const [show, setShow] = useState(false);
  return (
    <section>
      <h2>Exercise 4 — Lazy + Prefetch</h2>
      <button onClick={() => setShow(true)}>Show chart</button>
      {/* TODO 3: onMouseEnter={prefetchChart} onFocus={prefetchChart} on the button above */}
      <div style={{ ...card, minHeight: 120 }}>
        {show && (
          <Suspense fallback={<div style={{ height: 120, background: '#e2e8f0', borderRadius: 6 }}>loading chart…</div>}>
            <LazyChart />
          </Suspense>
        )}
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: memoise the rows in Exercise 2 and see whether it matters (measure!).

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 13 — Performance Patterns II</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise4 />
  </div>
);

export default App;
