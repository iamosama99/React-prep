// ============================================================
// Topic:   Performance Patterns I — Re-renders & Memoisation
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — restructure (no memo!): colocate state, then lift content up
//   Exercise 2 — repair the identity chain so React.memo actually works
//   Exercise 3 — derive instead of sync; write useDebouncedCallback
//
// Every component shows a render counter — use it, don't guess.
//
// Run: npm run tutorial performance-rerender
// ============================================================

import {
  memo, useCallback, useEffect, useMemo, useRef, useState, FC, ReactNode,
} from 'react';

function useRenderCount() {
  const r = useRef(0);
  r.current++;
  return r.current;
}

// ─── Exercise 1: Restructure, Don't Memoise ──────────────────
//
// SITUATION
//   ExpensiveTree is (pretend) heavy. In BuggyPage a colour picker's state
//   lives in the same component, so dragging the picker re-renders the tree.
//
// BUILD
//   A. ColocatedPage — move the colour state into a small <ColorSection>
//      component so Page itself never re-renders when the colour changes.
//   B. ChildrenPage — write <ColorScope>{children}</ColorScope> that owns the
//      colour state and renders `children` untouched. Compose:
//        <ColorScope><ExpensiveTree /></ColorScope>
//
// SUCCESS  After you change the colour, ExpensiveTree's counter stays at 1
//          in both A and B (it climbs in the buggy panel).

const ExpensiveTree: FC<{ label: string }> = ({ label }) => {
  const renders = useRenderCount();
  return <div style={card}>ExpensiveTree ({label}) — renders: <strong>{renders}</strong></div>;
};

const ColorInput: FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <label>
    colour: <input type="color" value={value} onChange={e => onChange(e.target.value)} />
  </label>
);

const BuggyPage: FC = () => {
  const [color, setColor] = useState('#0ea5e9');
  return (
    <div>
      <ColorInput value={color} onChange={setColor} />
      <p style={{ color }}>The quick brown fox</p>
      <ExpensiveTree label="buggy" />
    </div>
  );
};

// TODO A: extract ColorSection (owns the state; renders input + paragraph)
const ColocatedPage: FC = () => {
  const [color, setColor] = useState('#0ea5e9');
  return (
    <div>
      <ColorInput value={color} onChange={setColor} />
      <p style={{ color }}>The quick brown fox</p>
      <ExpensiveTree label="colocated" />
    </div>
  );
};

// TODO B: implement ColorScope (state + picker + <div style={{ color }}>{children}</div>)
const ColorScope: FC<{ children: ReactNode }> = ({ children }) => <div>{children}</div>;
const ChildrenPage: FC = () => (
  <div>
    <ColorScope>
      <ExpensiveTree label="children-as-props" />
    </ColorScope>
  </div>
);

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Restructure</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div style={card}><strong>Buggy</strong><BuggyPage /></div>
        <div style={card}><strong>A. Colocated</strong><ColocatedPage /></div>
        <div style={card}><strong>B. Children</strong><ChildrenPage /></div>
      </div>
    </section>
  );
}

// ─── Exercise 2: Repair the Identity Chain ───────────────────
//
// SITUATION
//   Row is React.memo'd, yet every row re-renders on EVERY parent render.
//   Something in its props changes identity each time.
//
// YOUR TASK
//   Fix RowList so that:
//     - clicking "Unrelated re-render" re-renders ZERO rows
//     - selecting a row re-renders only the previously selected row and the new one
//   Hints: what are the two props that are new every render? Which can become a
//   primitive? Which needs useCallback?

type Item = { id: number; name: string };
const ITEMS: Item[] = ['Ada', 'Grace', 'Alan', 'Linus', 'Margaret', 'Dennis'].map((name, i) => ({ id: i + 1, name }));

const Row = memo(function Row(props: {
  item: Item;
  onSelect: (id: number) => void;
  style: { fontWeight: number };
}) {
  const renders = useRenderCount();
  return (
    <li
      onClick={() => props.onSelect(props.item.id)}
      style={{ ...props.style, cursor: 'pointer', listStyle: 'none', padding: '2px 0' }}
    >
      {props.item.name} <span style={muted}>· renders {renders}</span>
    </li>
  );
});

function Exercise2() {
  const [selected, setSelected] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  // TODO: change Row's props (e.g. `bold: boolean` instead of `style`) and stabilise onSelect
  return (
    <section>
      <h2>Exercise 2 — Identity Chain</h2>
      <button onClick={() => setTick(t => t + 1)}>Unrelated re-render ({tick})</button>
      <ul style={{ paddingLeft: 0 }}>
        {ITEMS.map(item => (
          <Row
            key={item.id}
            item={item}
            onSelect={id => setSelected(id)}
            style={{ fontWeight: selected === item.id ? 700 : 400 }}
          />
        ))}
      </ul>
    </section>
  );
}

// ─── Exercise 3: Derive, Don't Sync — and Debounce ───────────
//
// SITUATION
//   SearchBad keeps `filtered` in state, synced by an effect: two renders per
//   keystroke, and one frame where the list is stale. Rebuild it properly.
//
// BUILD
//   1. useDebouncedCallback(fn, delay): returns a stable debounced function with .cancel()
//        - timer id in a ref, latest fn in a ref, cleanup on unmount
//   2. SearchGood:
//        - `text` state for the input (instant)
//        - `query` state updated via the debounced callback (300 ms after the last keystroke)
//        - `results` DERIVED with useMemo from [query]; no effect, no state for it
//
// SUCCESS  Type quickly: SearchGood's "filter runs" increments once, after you
//          pause. SearchBad's climbs on every keystroke.

const BIG = Array.from({ length: 3000 }, (_, i) => `item-${i}-${['alpha', 'beta', 'gamma', 'delta'][i % 4]}`);

const SearchBad: FC = () => {
  const renders = useRenderCount();
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(BIG.slice(0, 5));
  const runs = useRef(0);
  useEffect(() => {
    runs.current++;
    setFiltered(BIG.filter(s => s.includes(query)).slice(0, 5));
  }, [query]);
  return (
    <div style={card}>
      <strong>Bad: effect-synced state</strong>
      <div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="type…" /></div>
      <div style={muted}>renders: {renders} · filter runs: {runs.current}</div>
      <div style={muted}>{filtered.join(', ')}</div>
    </div>
  );
};

function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  // TODO: timer ref + latest ref + unmount cleanup; return Object.assign(debounced, { cancel })
  void delay; void useCallback; void useMemo;
  return Object.assign((...args: A) => fn(...args), { cancel: () => {} });
}

const SearchGood: FC = () => {
  const renders = useRenderCount();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const runs = useRef(0);

  const commit = useDebouncedCallback((q: string) => setQuery(q), 300);

  // TODO: results = useMemo(() => { runs.current++; return BIG.filter(...).slice(0, 5) }, [query])
  const results: string[] = BIG.slice(0, 5);

  return (
    <div style={card}>
      <strong>Good: debounced query + derived results</strong>
      <div>
        <input
          value={text}
          onChange={e => { setText(e.target.value); commit(e.target.value); }}
          placeholder="type…"
        />
      </div>
      <div style={muted}>renders: {renders} · filter runs: {runs.current}</div>
      <div style={muted}>{results.join(', ')}</div>
    </div>
  );
};

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Derive &amp; Debounce</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
        <SearchBad />
        <SearchGood />
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: replace the debounce with useDeferredValue(text) and compare how typing feels.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 12 — Performance Patterns I</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
