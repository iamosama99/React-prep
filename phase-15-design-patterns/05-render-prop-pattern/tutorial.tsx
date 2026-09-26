// ============================================================
// Topic:   Render Props (as a Design Pattern)
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — Mouse: both spellings (render / children-as-function)
//   Exercise 2 — Async: render-prop adapter over a hook; flatten the pyramid
//   Exercise 3 — List<T>: renderItem extension points + the memo trap
//
// Run: npm run tutorial render-prop-pattern
// ============================================================

import { useState, useEffect, useRef, useCallback, memo, FC, ReactNode } from 'react';

// ─── Exercise 1: Mouse — Two Spellings ───────────────────────
//
// SITUATION
//   You want "track the pointer inside this box" as reusable logic, and
//   the caller decides what to draw with the coordinates.
//
// BUILD
//   <Mouse render={pos => …} />           and       <Mouse>{pos => …}</Mouse>
//   - Renders a box (given styles below) that tracks onMouseMove
//     relative to the box (use e.currentTarget.getBoundingClientRect()).
//   - Holds { x, y } state, starts at { x: 0, y: 0 }.
//   - Calls `render` if provided, else `children` (a function).
//
// Two consumers below: a numeric readout and a dot that follows the cursor.

type Pos = { x: number; y: number };
type MouseProps = {
  render?: (pos: Pos) => ReactNode;
  children?: (pos: Pos) => ReactNode;
};

const boxStyle = {
  position: 'relative', height: 140, border: '2px dashed #94a3b8', borderRadius: 8, background: '#f8fafc',
} as const;

const Mouse: FC<MouseProps> = ({ render, children }) => {
  // TODO 1: const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  // TODO 2: onMouseMove → setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  // TODO 3: call render?.(pos) ?? children?.(pos) inside the box <div style={boxStyle} …>
  void render; void children; void useState;
  return <div style={boxStyle}><span style={muted}>Mouse stub</span></div>;
};

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Mouse</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Mouse render={({ x, y }) => <p style={{ margin: 8 }}>x: {Math.round(x)}, y: {Math.round(y)}</p>} />
        </div>
        <div style={{ flex: 1 }}>
          <Mouse>
            {({ x, y }) => (
              <div
                style={{
                  position: 'absolute', left: x - 8, top: y - 8, width: 16, height: 16,
                  borderRadius: '50%', background: '#f97316', pointerEvents: 'none',
                }}
              />
            )}
          </Mouse>
        </div>
      </div>
    </section>
  );
}

// ─── Exercise 2: Async — Render Prop over a Hook ─────────────
//
// SITUATION
//   Async data logic is duplicated everywhere. You'll write it ONCE as a
//   hook, expose a render-prop adapter for JSX call sites, then see how
//   hooks flatten the "callback pyramid".
//
// BUILD
//   1. useAsync<T>(fn: () => Promise<T>, deps): { data, loading, error, reload }
//        - loading true on start of every load
//        - ignore results from stale loads (a `cancelled` flag in the effect)
//   2. <Async<T> load={fn} deps={[…]}>{state => …}</Async> — TWO lines, calls the hook
//   3. Rewrite `FlatDashboard` with two useAsync calls (compare to PyramidDashboard)

type AsyncState<T> = { data: T | null; loading: boolean; error: Error | null; reload: () => void };

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const api = {
  user: async (): Promise<{ name: string; city: string }> => { await wait(500); return { name: 'Ada', city: 'London' }; },
  weather: async (city: string): Promise<{ city: string; temp: number }> => {
    await wait(500);
    return { city, temp: city === 'London' ? 14 : 22 };
  },
};

function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  // TODO: state for data/loading/error, a `tick` state to support reload(),
  //       useEffect that calls fn(), guards with `cancelled`, and cleans up
  void fn; void deps; void useEffect; void useCallback;
  return { data: null, loading: true, error: null, reload: () => {} };
}

function Async<T>({ load, deps = [], children }: {
  load: () => Promise<T>; deps?: unknown[]; children: (s: AsyncState<T>) => ReactNode;
}) {
  // TODO: two lines — const state = useAsync(load, deps); return <>{children(state)}</>;
  void load; void deps; void children;
  return null;
}

// Given: three nested render props → the pyramid
const PyramidDashboard: FC = () => (
  <Async load={api.user}>
    {user => (
      <Async load={() => api.weather(user.data?.city ?? '')} deps={[user.data?.city]}>
        {weather => (
          <p style={{ margin: 0 }}>
            {user.loading ? 'loading user…' : `Hi ${user.data?.name}`} ·{' '}
            {weather.loading ? 'loading weather…' : `${weather.data?.temp}°C in ${weather.data?.city}`}
          </p>
        )}
      </Async>
    )}
  </Async>
);

// TODO 3: rewrite with two hook calls (no nesting, no JSX callbacks)
const FlatDashboard: FC = () => {
  return <p style={muted}>FlatDashboard stub</p>;
};

function Exercise2() {
  const [key, setKey] = useState(0);
  return (
    <section>
      <h2>Exercise 2 — Async</h2>
      <button onClick={() => setKey(k => k + 1)}>Remount both</button>
      <div style={card}><strong>Pyramid (render props)</strong><PyramidDashboard key={`p${key}`} /></div>
      <div style={card}><strong>Flat (hooks)</strong><FlatDashboard key={`f${key}`} /></div>
    </section>
  );
}

// ─── Exercise 3: List<T> — Extension Points & the Memo Trap ──
//
// SITUATION
//   List owns iteration; callers own per-item UI via `renderItem`,
//   and an empty state via `renderEmpty`. It is React.memo'd.
//   Passing an inline renderItem defeats the memo.
//
// BUILD
//   1. ListInner<T>: map items → renderItem(item, index) inside <ul>,
//      keyed by getKey(item); when items is empty, return renderEmpty().
//   2. In StablePanel, make renderItem STABLE so the "renders" counter of
//      the memoised List does NOT climb when the parent re-renders.
//      (hint: module-level function, or useCallback)
//
// OBSERVE
//   Click "Parent re-render". InlinePanel's count climbs. StablePanel's
//   must stay put after your fix.

type ListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  label: string;
};

function ListInner<T>({ items, getKey, renderItem, renderEmpty, label }: ListProps<T>) {
  const renders = useRef(0);
  renders.current++;
  // TODO 1: if items.length === 0, render renderEmpty?.() ?? 'Nothing here'
  //         else render a <ul> with an <li key={getKey(item)}> per item using renderItem
  void getKey; void renderItem; void renderEmpty; void items;
  return <div style={muted}>{label}: List stub · renders: <strong>{renders.current}</strong></div>;
}
const List = memo(ListInner) as typeof ListInner;

type Todo = { id: number; text: string };
const TODOS: Todo[] = [{ id: 1, text: 'Write tests' }, { id: 2, text: 'Ship' }];
const getTodoKey = (t: Todo) => t.id;

const InlinePanel: FC = () => (
  <List
    label="inline"
    items={TODOS}
    getKey={getTodoKey}
    renderItem={t => <strong>{t.text}</strong>}   // new function every render
  />
);

const StablePanel: FC = () => {
  // TODO 2: create ONE stable renderItem (useCallback with [] deps, or a module-level const)
  const renderItem = (t: Todo) => <strong>{t.text}</strong>;
  return <List label="stable" items={TODOS} getKey={getTodoKey} renderItem={renderItem} />;
};

function Exercise3() {
  const [n, setN] = useState(0);
  return (
    <section>
      <h2>Exercise 3 — List&lt;T&gt;</h2>
      <button onClick={() => setN(x => x + 1)}>Parent re-render ({n})</button>
      <div style={card}><InlinePanel /></div>
      <div style={card}><StablePanel /></div>
      <div style={card}>
        <List<Todo> label="empty" items={[]} getKey={getTodoKey} renderItem={t => t.text} renderEmpty={() => <em>No todos 🎉</em>} />
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add a `renderHeader` slot to List that receives the item count.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 12 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 05 — Render Props</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
