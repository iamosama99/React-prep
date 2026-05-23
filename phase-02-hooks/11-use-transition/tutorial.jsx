// ============================================================
// Topic:   useTransition
// Phase:   2 — Hooks
// ============================================================
//
// Core insight: startTransition is a scheduler HINT, not a debounce.
//   - The update WILL happen — just at lower priority.
//   - Urgent updates (typing) stay snappy while the heavy render catches up.
//   - isPending = true while the transition is in progress.
//
// Requires React 18+ with createRoot (concurrent mode).
// ============================================================

import { useState, useTransition, useMemo, memo } from 'react';

// ─── Shared: large list ───────────────────────────────────────
const ALL_ITEMS = Array.from({ length: 10_000 }, (_, i) => ({
  id: i,
  label: `Item ${i} — ${['react', 'hooks', 'state', 'effect', 'memo'][i % 5]}`,
}));

function slowFilter(items, query) {
  // Artificially slow to make the difference visible (~50ms)
  const start = performance.now();
  while (performance.now() - start < 50) {}
  return items.filter(i => i.label.includes(query));
}

// ─── Exercise 1 ──────────────────────────────────────────────
// TOPIC: Feel the difference — with vs without startTransition.
//
// Type into BOTH inputs.  The left one feels sluggish (every
// keystroke blocks while filtering 10k items).  The right one
// stays responsive because the filter update is wrapped in
// startTransition.
//
// Steps:
//   1. Run the app. Type quickly in the left input — notice lag.
//   2. Type in the right input — the typed characters appear
//      instantly even while results are still computing.
//   3. Implement startTransition in the right panel:
//        const [isPending, startTransition] = useTransition();
//        setQuery(value);                   ← urgent (input always snappy)
//        startTransition(() => setFilter(value)); ← low priority
//   4. Show a dimmed overlay or spinner on the list while isPending.

function SlowPanel({ label, useTransitionHook = false }) {
  const [query, setQuery]   = useState('');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;
    if (useTransitionHook) {
      // TODO: setQuery immediately (urgent), setFilter in startTransition
      setQuery(value);
      setFilter(value); // BUG: not wrapped — change this to startTransition
    } else {
      setQuery(value);
      setFilter(value);
    }
  }

  const results = useMemo(() => slowFilter(ALL_ITEMS, filter), [filter]);

  return (
    <div style={{ flex: 1, border: `2px solid ${useTransitionHook ? '#4caf50' : '#f44336'}`, borderRadius: 6, padding: '0.5rem' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold', color: useTransitionHook ? '#4caf50' : '#f44336' }}>
        {label}
      </p>
      <input
        value={query}
        onChange={handleChange}
        placeholder="Filter 10k items…"
        style={{ width: '100%', padding: '4px 8px', marginBottom: 8 }}
      />
      {/* TODO (right panel): show isPending state visually */}
      {isPending && useTransitionHook && (
        <p style={{ fontSize: 12, color: '#999', margin: '0 0 4px' }}>⏳ Updating…</p>
      )}
      <div style={{ opacity: isPending && useTransitionHook ? 0.5 : 1 }}>
        <p style={{ fontSize: 12, margin: '0 0 4px' }}>{results.length} results</p>
        <ul style={{ maxHeight: 100, overflowY: 'auto', fontSize: 11, margin: 0, padding: '0 0 0 1rem' }}>
          {results.slice(0, 10).map(r => <li key={r.id}>{r.label}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Exercise1() {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
        Type quickly in both inputs — notice the left lags, the right stays snappy.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <SlowPanel label="❌ Without useTransition" useTransitionHook={false} />
        <SlowPanel label="✅ With useTransition"    useTransitionHook={true}  />
      </div>
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// TOPIC: isPending — what to show while the transition is processing.
//
// Build a tab switcher where each tab loads a "heavy" component.
// Clicking a tab starts a transition, and while isPending is true,
// display a subtle loading indicator WITHOUT hiding the old content.
//
// This is the recommended UX pattern:
//   - Don't hide current content (avoid jarring blank flashes)
//   - Dim old content slightly + show a spinner
//   - New content appears when ready
//
// Steps:
//   1. Add useTransition and wrap setActiveTab in startTransition.
//   2. While isPending: dim the content (opacity 0.6) and show "Loading…"
//      badge on the tab bar.
//   3. Observe: clicking a tab never causes a blank screen.

const TABS = ['Home', 'Profile', 'Settings'];

function HeavyContent({ tab }) {
  // Simulate a slow component render
  const start = performance.now();
  while (performance.now() - start < 80) {}

  return (
    <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: 6, minHeight: 80 }}>
      <p style={{ margin: 0, fontSize: 14 }}>{tab} content (took ~80ms to render)</p>
    </div>
  );
}

function Exercise2() {
  const [activeTab, setActiveTab] = useState('Home');
  const [isPending, startTransition] = useTransition();

  function handleTabClick(tab) {
    // TODO: wrap setActiveTab in startTransition
    setActiveTab(tab);
  }

  return (
    <div style={styles.box}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            style={{
              padding: '4px 12px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              background: activeTab === tab ? '#3f51b5' : '#eee',
              color: activeTab === tab ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
        {/* TODO: show isPending badge here */}
        {isPending && <span style={{ fontSize: 12, color: '#999' }}>Loading…</span>}
      </div>
      {/* TODO: add opacity: isPending ? 0.6 : 1 to dim old content */}
      <HeavyContent tab={activeTab} />
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// TOPIC: startTransition vs debounce — they solve different problems.
//
// Both make UI feel more responsive, but for different reasons:
//   Debounce — delays firing the update until input settles (time-based)
//   startTransition — fires immediately but at lower render priority
//
// Proof: add a 300ms debounce to the left panel.
//        With fast typing, debounce skips many keystrokes.
//        With startTransition (right panel), every keystroke is
//        processed — just at lower priority.
//
// Steps:
//   1. Left panel: implement a 300ms debounce using useEffect + setTimeout.
//   2. Right panel: use startTransition (already set up).
//   3. Type at medium speed (1-2 chars/second) into both.
//      Debounce: skips characters while typing, then updates.
//      Transition: shows ALL characters immediately, list updates later.

function DebouncedPanel() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');

  // TODO: implement debounce — after 300ms of no typing, setFilter(query)
  // useEffect(() => {
  //   const id = setTimeout(() => setFilter(query), 300);
  //   return () => clearTimeout(id);
  // }, [query]);

  const results = useMemo(() => slowFilter(ALL_ITEMS, filter), [filter]);

  return (
    <div style={{ flex: 1, border: '2px solid #ff9800', borderRadius: 6, padding: '0.5rem' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold', color: '#ff9800' }}>
        Debounce (300ms delay)
      </p>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Debounced filter…"
        style={{ width: '100%', padding: '4px 8px', marginBottom: 8 }}
      />
      <p style={{ fontSize: 12, margin: 0 }}>Filtering: "{filter}" → {results.length} results</p>
    </div>
  );
}

function TransitionPanel() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ flex: 1, border: '2px solid #4caf50', borderRadius: 6, padding: '0.5rem' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold', color: '#4caf50' }}>
        useTransition (priority-based)
      </p>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          startTransition(() => setFilter(e.target.value));
        }}
        placeholder="Transition filter…"
        style={{ width: '100%', padding: '4px 8px', marginBottom: 8 }}
      />
      <p style={{ fontSize: 12, margin: 0, opacity: isPending ? 0.5 : 1 }}>
        {isPending ? '⏳ ' : ''}Filtering: "{filter}" → {results.length} results
      </p>
    </div>
  );
}

const resultsCache = {};
function TransitionPanel2() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  const results = useMemo(() => slowFilter(ALL_ITEMS, filter), [filter]);

  return (
    <div style={{ flex: 1, border: '2px solid #4caf50', borderRadius: 6, padding: '0.5rem' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold', color: '#4caf50' }}>
        useTransition (priority-based)
      </p>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          startTransition(() => setFilter(e.target.value));
        }}
        placeholder="Transition filter…"
        style={{ width: '100%', padding: '4px 8px', marginBottom: 8 }}
      />
      <p style={{ fontSize: 12, margin: 0, opacity: isPending ? 0.5 : 1 }}>
        {isPending ? '⏳ ' : ''}Filtering: "{filter}" → {results.length} results
      </p>
    </div>
  );
}

function Exercise3() {
  return (
    <div style={styles.box}>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
        Type at medium speed. Debounce skips chars; transition processes all.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <DebouncedPanel />
        <TransitionPanel2 />
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Verify: isPending is a scheduler signal, NOT a loading flag.
//
// isPending becomes false as soon as the transition render commits.
// It is NOT for async operations like fetching — use loading state for that.
//
// Steps:
//   1. Click "Start transition" — isPending becomes true briefly.
//   2. Notice it resolves when the render is done (very fast).
//   3. Add a console.log to confirm isPending cycles true → false.

function Playground() {
  const [show, setShow] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div style={styles.box}>
      <p style={{ fontSize: 13 }}>
        isPending: <strong style={{ color: isPending ? '#f44336' : '#4caf50' }}>
          {isPending ? 'true (transitioning…)' : 'false'}
        </strong>
      </p>
      <button onClick={() => startTransition(() => setShow(s => !s))}>
        {show ? 'Hide' : 'Show'} heavy content (via transition)
      </button>
      {show && <HeavyContent tab="Playground" />}
      <p style={{ fontSize: 12, color: '#888' }}>
        isPending is a render-priority signal — not for network requests.
        For async loading, use a separate loading state.
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 720 }}>
      <h1>useTransition</h1>

      <h2>Exercise 1 — Feel the Difference: With vs Without</h2>
      <p style={styles.goal}>
        Wrap setFilter in startTransition on the right panel — typing stays instant.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — isPending: Dim Old Content, No Blank Flash</h2>
      <p style={styles.goal}>
        Show a loading indicator and dim content while the tab transition renders.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Transition vs Debounce</h2>
      <p style={styles.goal}>
        Implement debounce on the left. Compare: debounce skips; transition doesn't.
      </p>
      <Exercise3 />

      <h2>Playground — isPending is Not a Fetch Flag</h2>
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
