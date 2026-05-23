// ============================================================
// Topic:   useDeferredValue
// Phase:   2 — Hooks
// ============================================================
//
// useDeferredValue vs useTransition:
//   useTransition  — you OWN the state setter, wrap the update
//   useDeferredValue — you receive a value from OUTSIDE (props,
//                      or you can't touch the setter) → defer a copy
//
// Both are priority-based, not time-based. Neither is a debounce.
// ============================================================

import { useState, useDeferredValue, useMemo, useTransition, memo } from 'react';

// ─── Shared: large list ───────────────────────────────────────
const ALL_ITEMS = Array.from({ length: 8_000 }, (_, i) => ({
  id: i,
  text: `${['React', 'Hook', 'State', 'Effect', 'Render'][i % 5]} item ${i}`,
}));

function slowFilter(items, query) {
  const start = performance.now();
  while (performance.now() - start < 40) {} // ~40ms artificial cost
  return items.filter(i => i.text.toLowerCase().includes(query.toLowerCase()));
}

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Core mechanic — the deferred copy lags behind the live value.
//
// The input value (`query`) updates immediately on every keystroke.
// The deferred copy (`deferredQuery`) is intentionally stale for a moment,
// so the expensive filter only re-runs at lower priority.
//
// Steps:
//   1. Connect useDeferredValue:
//        const deferredQuery = useDeferredValue(query);
//   2. Pass deferredQuery to the memoized filter, NOT query.
//   3. Add a visual "stale" indicator: when query !== deferredQuery,
//      show "⏳ Updating…" and dim the list.
//   4. Type quickly — the input is always snappy; the list catches up.
//
// Success: typed characters appear instantly; the list updates
//          slightly behind without blocking input.

const FilteredList = memo(function FilteredList({ filter }) {
  const items = useMemo(() => slowFilter(ALL_ITEMS, filter), [filter]);
  return (
    <ul style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, margin: 0, padding: '0 0 0 1rem' }}>
      {items.slice(0, 15).map(i => <li key={i.id}>{i.text}</li>)}
      {items.length > 15 && <li style={{ color: '#999' }}>…and {items.length - 15} more</li>}
    </ul>
  );
});

function Exercise1() {
  const [query, setQuery] = useState('');
  // TODO: const deferredQuery = useDeferredValue(query);
  const deferredQuery = query; // stub — replace with useDeferredValue

  const isStale = query !== deferredQuery;

  return (
    <div style={styles.box}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to filter 8k items…"
        style={{ padding: '4px 8px' }}
      />
      {/* TODO: show stale indicator when isStale is true */}
      {isStale && (
        <p style={{ fontSize: 12, color: '#999', margin: 0 }}>⏳ Updating…</p>
      )}
      <div style={{ opacity: isStale ? 0.5 : 1, transition: 'opacity 200ms' }}>
        <FilteredList filter={deferredQuery} />
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        Live query: "<strong>{query}</strong>" |
        Deferred: "<strong>{deferredQuery}</strong>"
      </p>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: When to use useDeferredValue vs useTransition.
//
// Rule of thumb:
//   You OWN the setter → useTransition (wrap the dispatch)
//   You DON'T own the setter / value comes as a prop → useDeferredValue
//
// SearchResults below receives `query` as a prop from a parent
// that you cannot modify (imagine it's a third-party component).
// You must defer the expensive work inside SearchResults itself.
//
// Steps:
//   1. Inside SearchResults, add useDeferredValue(query).
//   2. Use the deferred value for the expensive filter.
//   3. Show the stale indicator based on prop query !== deferred.
//
// If you OWNED the state, you'd use useTransition in the parent.
// Since you don't, useDeferredValue is the correct tool.

function SearchResults({ query }) {
  // TODO: const deferredQuery = useDeferredValue(query);
  // Use deferredQuery for the expensive filter below

  const results = useMemo(() => slowFilter(ALL_ITEMS, query), [query]);
  // ↑ BUG: using query directly makes it block; use deferredQuery

  return (
    <div style={{ opacity: 1 /* TODO: dim when stale */ }}>
      <p style={{ fontSize: 12, margin: 0 }}>
        {results.length} results for "<strong>{query}</strong>"
      </p>
      <ul style={{ maxHeight: 100, overflowY: 'auto', fontSize: 11, margin: '4px 0 0', padding: '0 0 0 1rem' }}>
        {results.slice(0, 10).map(i => <li key={i.id}>{i.text}</li>)}
      </ul>
    </div>
  );
}

function Exercise2() {
  const [query, setQuery] = useState('');

  return (
    <div style={styles.box}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Parent owns the query state…"
        style={{ padding: '4px 8px' }}
      />
      <SearchResults query={query} />
      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
        SearchResults receives query as a prop. It must use useDeferredValue
        internally — it can't wrap the parent's setState in startTransition.
      </p>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: Prove it's NOT a debounce.
//
// A debounce delays firing until input settles.
// useDeferredValue fires on every update — just at lower priority.
//
// This exercise logs both approaches so you can SEE the difference.
//
// Steps:
//   1. Complete the debounce implementation (300ms).
//   2. Complete the deferred version using useDeferredValue.
//   3. Type at medium speed (2 chars/second) and watch the logs.
//   4. Observations:
//      Debounce log:  fires once after you STOP typing
//      Deferred log:  fires after EVERY keystroke (but later)
//
// Write a comment: in what scenario would debounce be BETTER
// than useDeferredValue?  (Hint: network requests)

function Exercise3() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // TODO: implement debounceQuery using useEffect + setTimeout(300)
  const [debounceQuery, setDebounceQuery] = useState('');

  return (
    <div style={styles.box}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to compare timing…"
        style={{ padding: '4px 8px' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div style={{ background: '#fff3e0', padding: 8, borderRadius: 4 }}>
          <strong>Debounce (300ms)</strong>
          <p style={{ margin: '4px 0 0' }}>
            current: <code>{debounceQuery || '(empty)'}</code>
          </p>
          <p style={{ margin: 0, color: '#888', fontSize: 11 }}>
            Updates once after you STOP typing
          </p>
        </div>
        <div style={{ background: '#e8f5e9', padding: 8, borderRadius: 4 }}>
          <strong>useDeferredValue</strong>
          <p style={{ margin: '4px 0 0' }}>
            current: <code>{deferredQuery || '(empty)'}</code>
          </p>
          <p style={{ margin: 0, color: '#888', fontSize: 11 }}>
            Updates after every keystroke — just later
          </p>
        </div>
      </div>
      {/*
        TODO: Write a comment below.
        "Use debounce (not useDeferredValue) when: ___"
        Think about: what happens if useDeferredValue triggers
        a network request on every keystroke?
      */}
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Edge case: using useDeferredValue for critical form state.
//
// DO NOT defer values that must always be in sync — like a
// controlled password input or a payment amount.
//
// Steps:
//   1. The deferred value lags behind the real value.
//   2. If you show the deferred value as "confirmed amount",
//      the user could submit the wrong amount.
//   3. Write a comment: name two kinds of state that should
//      NEVER be deferred.

function Playground() {
  const [amount, setAmount] = useState('');
  const deferredAmount = useDeferredValue(amount); // ❌ dangerous for financial state

  return (
    <div style={styles.box}>
      <label style={{ fontSize: 14 }}>
        Payment amount ($)
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ padding: '4px 8px', marginLeft: 8 }}
        />
      </label>
      <p style={{ fontSize: 13 }}>
        Live amount: <strong>${amount || '0'}</strong>
      </p>
      <p style={{ fontSize: 13, color: '#f44336' }}>
        Deferred (could be stale!): <strong>${deferredAmount || '0'}</strong>
      </p>
      <p style={{ fontSize: 12, color: '#888' }}>
        If these differ during a submit, the user pays the wrong amount.
        {/*
          TODO: List two types of state you must NEVER defer:
          1. ___
          2. ___
        */}
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 680 }}>
      <h1>useDeferredValue</h1>

      <h2>Exercise 1 — Core Mechanic: Stale Copy with Visual Indicator</h2>
      <p style={styles.goal}>
        Defer deferredQuery; dim the list and show "Updating…" while stale.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — When to Choose useDeferredValue over useTransition</h2>
      <p style={styles.goal}>
        You don't own the setter → defer the value inside SearchResults.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — It's Not a Debounce</h2>
      <p style={styles.goal}>
        Implement both. Compare timing. Write when debounce is actually better.
      </p>
      <Exercise3 />

      <h2>Playground — Never Defer Critical State</h2>
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
  goal: { fontSize: 13, color: '#555', marginTop: 0 },
};
