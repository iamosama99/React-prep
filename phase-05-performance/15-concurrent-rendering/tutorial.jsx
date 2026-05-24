// ============================================================
// Topic:   Concurrent Rendering
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. Concurrent rendering is React's ability to
//   interleave render work with the browser, making urgent updates
//   (input, clicks) never blocked by slower background renders.
//
//   These exercises make the difference TACTILE:
//   Exercise 1: Feel the blocking → useTransition fix
//   Exercise 2: useDeferredValue — same effect for derived values
//   Exercise 3: Understand lanes by observing priority separation
// ============================================================

import { useState, useTransition, useDeferredValue, useRef, memo, startTransition } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Shared: expensive render simulation ────────────────────────
// A slow list that takes ~80ms to render each item batch.
// In real apps this is usually a complex tree or heavy computation.

function slowRender(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) { /* spin */ }
}

const SlowItem = memo(function SlowItem({ text, highlight }) {
  // Simulate expensive per-item render
  slowRender(0.5); // 0.5ms per item × 200 items = ~100ms total
  return (
    <div style={{
      padding: '5px 10px',
      fontSize: 12,
      borderBottom: '1px solid #f1f5f9',
      background: highlight ? '#fef9c3' : 'transparent',
      fontWeight: highlight ? 600 : 'normal',
    }}>
      {text}
    </div>
  );
});

const ALL_ITEMS = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  text: `${['React', 'TypeScript', 'Node', 'GraphQL', 'CSS', 'Testing', 'Webpack', 'Vite', 'Redux', 'Zustand'][i % 10]} concept #${i + 1}`,
}));


// ─── Exercise 1: Feel the Blocking, Apply useTransition ───────
//
// SITUATION
//   You have a search input and a list of 200 items. Each item is
//   "slow" to render (~0.5ms). 200 items = ~100ms total render time.
//   When you type, React needs to re-render all filtered items.
//   That 100ms render blocks the browser from painting your keystroke.
//
//   Without useTransition:
//   - type character → setQuery → render 200 items (~100ms) → paint input
//   - Your character appears ~100ms after you pressed the key. Sluggish.
//
//   With useTransition:
//   - type character → setQuery (urgent) → paint input immediately
//   - startTransition(() => setFilter(query)) → interruptible render
//   - If you type again before the transition completes, React DISCARDS
//     the in-progress render and starts fresh with the new query.
//   - Result: input always feels instant.
//
// YOUR TASK
//   1. Type in the "Without" box quickly — feel the character lag.
//   2. Type in the "With" box quickly — input stays responsive.
//   3. Add "show pending" behavior: fade the list while isPending=true.
//   4. Answer: what does React do with in-progress transition work when
//      a new urgent update arrives?

function SearchWithoutTransition() {
  const [query, setQuery] = useState('');
  const renderCount = useRef(0);
  renderCount.current++;

  // ❌ Every keystroke synchronously re-filters and re-renders all items
  const filtered = query
    ? ALL_ITEMS.filter(item => item.text.toLowerCase().includes(query.toLowerCase()))
    : ALL_ITEMS;

  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: '#dc2626', marginBottom: 6 }}>
        ❌ Without useTransition
      </div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type fast..."
        style={{
          width: '100%', padding: '8px 10px', fontSize: 13,
          border: '2px solid #fca5a5', borderRadius: 6, outline: 'none',
          boxSizing: 'border-box', background: '#fff5f5',
        }}
      />
      <div style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 6px' }}>
        render #{renderCount.current} | {filtered.length} results
      </div>
      <div style={{ height: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        {filtered.map(item => (
          <SlowItem
            key={item.id}
            text={item.text}
            highlight={query && item.text.toLowerCase().includes(query.toLowerCase())}
          />
        ))}
      </div>
    </div>
  );
}

function SearchWithTransition() {
  const [query, setQuery] = useState('');         // urgent — always current
  const [filter, setFilter] = useState('');       // deferred — drives expensive render
  const [isPending, startTransition] = useTransition();
  const renderCount = useRef(0);
  renderCount.current++;

  const handleChange = (e) => {
    const value = e.target.value;
    // ✅ Urgent update: input value paints immediately
    setQuery(value);
    // ✅ Non-urgent: the expensive list re-render is a transition
    startTransition(() => {
      setFilter(value);
    });
  };

  const filtered = filter
    ? ALL_ITEMS.filter(item => item.text.toLowerCase().includes(filter.toLowerCase()))
    : ALL_ITEMS;

  return (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: '#16a34a', marginBottom: 6 }}>
        ✅ With useTransition
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Type fast..."
          style={{
            width: '100%', padding: '8px 10px', fontSize: 13,
            border: `2px solid ${isPending ? '#93c5fd' : '#86efac'}`, borderRadius: 6, outline: 'none',
            boxSizing: 'border-box', background: isPending ? '#eff6ff' : '#f0fdf4',
          }}
        />
        {isPending && (
          <span style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: '#3b82f6', fontWeight: 600,
          }}>
            ⏳ updating
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 6px' }}>
        render #{renderCount.current} | {filtered.length} results{isPending ? ' (pending...)' : ''}
      </div>
      <div style={{
        height: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6,
        opacity: isPending ? 0.5 : 1, transition: 'opacity 0.15s',
      }}>
        {filtered.map(item => (
          <SlowItem
            key={item.id}
            text={item.text}
            highlight={filter && item.text.toLowerCase().includes(filter.toLowerCase())}
          />
        ))}
      </div>
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — useTransition: Urgent vs Non-Urgent Updates</h2>
      <p style={hint}>
        Type quickly in both boxes. Left: each keystroke blocks the next until the list renders.
        Right: input always paints instantly; the list catches up (shown with opacity fade).
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <SearchWithoutTransition />
        <SearchWithTransition />
      </div>

      {/* ANSWERS:
          Q: What does React do with in-progress transition work when a new urgent update arrives?
          A: React ABANDONS the in-progress transition render and discards the work.
             It processes the urgent update (new keypress) first, then restarts the transition
             with the latest state. This is why you need two state values: `query` (always
             shows what you typed) and `filter` (might lag behind). If you used only one
             value with startTransition, the input would show the old value until the
             transition commits — which defeats the purpose.

          Q: Why does the "without" version lag?
          A: React renders synchronously by default. All 200 SlowItems must finish rendering
             before React can commit anything (including the input value). The 100ms render
             cost is felt as input lag. useTransition makes this work "interruptible" —
             React can abandon it if a new urgent update comes in.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>useTransition API:</strong>
        <pre style={{ fontFamily: 'monospace', fontSize: 12, background: '#1e293b', color: '#e2e8f0', padding: '10px 14px', borderRadius: 6, margin: '8px 0 8px', lineHeight: 1.7 }}>
{`const [isPending, startTransition] = useTransition();

// Urgent state (always current):
setState(value);

// Non-urgent state (interruptible, can be abandoned):
startTransition(() => {
  setExpensiveState(value);
});

// isPending = true while transition is in-flight
// Use it to: fade stale content, show spinner, keep buttons enabled`}
        </pre>
        <strong>Two-state pattern is always needed:</strong> One state for the UI element you
        control (input value), one for the derived expensive computation. Without the split,
        the input value itself would be "stale" during the transition.
      </div>
    </section>
  );
}


// ─── Exercise 2: useDeferredValue ─────────────────────────────
//
// SITUATION
//   useDeferredValue is the complement to useTransition.
//   Use useTransition when you OWN the state (you call setState).
//   Use useDeferredValue when you RECEIVE a value (from props or parent state)
//   and need to defer reactions to it.
//
//   Example: a parent component sets `query` state. You receive `query`
//   as a prop and use it to filter/render an expensive list. You don't
//   own `query`, so you can't wrap its setter in startTransition.
//   Solution: const deferredQuery = useDeferredValue(query)
//   Then drive your expensive render from deferredQuery.
//
//   Behavior:
//   - During an urgent render, deferredQuery lags behind query
//   - React renders the component twice: once with old deferredQuery
//     (fast, urgent — shows stale list), once with new deferredQuery
//     (slow, deferred — updates list when scheduler has time)
//   - `deferredQuery !== query` means a deferred render is pending
//
// YOUR TASK
//   1. Observe the "deferred" indicator: when query ≠ deferredQuery,
//      the list is stale (being updated in background).
//   2. Type quickly — input stays responsive because deferredQuery lags.
//   3. Answer: what's the difference between useDeferredValue and useTransition?
//      When would you use one vs the other?

function ExpensiveResultList({ query }) {
  // This component receives query from a parent — it doesn't own the state
  // It can't wrap anything in startTransition
  // Solution: defer the value it reacts to
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const renderCount = useRef(0);
  renderCount.current++;

  const filtered = deferredQuery
    ? ALL_ITEMS.filter(item => item.text.toLowerCase().includes(deferredQuery.toLowerCase()))
    : ALL_ITEMS;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          render #{renderCount.current} | showing results for: "<strong>{deferredQuery || '(all)'}</strong>"
          {isStale && <span style={{ color: '#3b82f6', marginLeft: 6 }}>⏳ (stale — updating)</span>}
        </div>
      </div>
      <div style={{
        height: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6,
        opacity: isStale ? 0.5 : 1, transition: 'opacity 0.15s',
      }}>
        {filtered.map(item => (
          <SlowItem
            key={item.id}
            text={item.text}
            highlight={deferredQuery && item.text.toLowerCase().includes(deferredQuery.toLowerCase())}
          />
        ))}
      </div>
    </div>
  );
}

function Exercise2() {
  const [query, setQuery] = useState('');

  return (
    <section>
      <h2>Exercise 2 — useDeferredValue: Defer What You Receive</h2>
      <p style={hint}>
        The input is in the parent. The expensive list is in a child that receives query as a prop.
        useDeferredValue inside the child keeps the list from blocking the input.
      </p>

      <div style={card}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
            Parent controls query (urgent). Child defers it:
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type fast — the input is in the parent..."
            style={{
              width: '100%', padding: '8px 10px', fontSize: 13,
              border: '2px solid #86efac', borderRadius: 6, outline: 'none',
              boxSizing: 'border-box', background: '#f0fdf4',
            }}
          />
          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
            Current query: "<strong>{query}</strong>" (always up to date in parent)
          </div>
        </div>

        {/* Child receives query as prop — uses useDeferredValue internally */}
        <ExpensiveResultList query={query} />
      </div>

      {/* ANSWERS:
          useTransition vs useDeferredValue:
          - useTransition: you OWN the state. Wrap the setState call.
            Returns [isPending, startTransition].
            Best for: form inputs where you control both the input state AND the filter state.

          - useDeferredValue: you RECEIVE a value (prop or context).
            Wrap the received value to get a deferred copy.
            Returns the deferred value (no isPending — detect staleness via value !== deferredValue).
            Best for: child components receiving expensive props from parents you don't control.

          Both achieve the same end result: input stays responsive, expensive render runs later.
          The choice depends on where in the component tree you own the state.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Choosing between useTransition and useDeferredValue:</strong>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Scenario</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Use</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['You own the state setter (same component)', 'useTransition — wrap startTransition around the setter call'],
              ['Receiving value as prop from parent', 'useDeferredValue — defer inside the child'],
              ['Need isPending indicator', 'useTransition — returns isPending explicitly'],
              ['Detecting staleness from deferred value', 'useDeferredValue — compare value !== deferredValue'],
            ].map(([scenario, use], i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0' }}>{scenario}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// ─── Exercise 3: Priority Separation — See the Lanes ─────────
//
// SITUATION
//   React 18's concurrent scheduler assigns priorities (called "lanes") to
//   every state update. The scheduler runs higher-priority work first,
//   yielding to the browser between units of work.
//
//   Priorities (high to low):
//   1. Discrete events (click, keypress) — paint immediately
//   2. Continuous events (mouse move, scroll) — paint soon
//   3. Default renders — normal batch
//   4. Transitions (startTransition) — run in background, interruptible
//   5. Idle — runs when nothing else is queued
//
//   You can observe priority separation: click a button (high priority)
//   while a transition is running (low priority). React interrupts the
//   transition and handles your click first. The click effect appears
//   before the transition even finishes.
//
// YOUR TASK
//   1. Click "Start slow transition" — it begins rendering a 300-item list
//      (marked as a transition, so it runs as background work).
//   2. While it's running (isPending=true), click "High priority click".
//   3. Observe: the high-priority click is handled immediately. The counter
//      updates before the transition list finishes rendering.
//   4. Answer: what does React do with the in-progress transition render?

const BIG_ITEMS = Array.from({ length: 300 }, (_, i) => ({
  id: i,
  text: `Deferred item ${i + 1} — rendered in transition`,
}));

function SlowListItem({ text }) {
  slowRender(0.3); // 0.3ms × 300 = ~90ms total
  return (
    <div style={{ padding: '4px 8px', fontSize: 11, borderBottom: '1px solid #f8fafc', color: '#475569' }}>
      {text}
    </div>
  );
}

function Exercise3() {
  const [showList, setShowList] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isPending, startTransitionFn] = useTransition();
  const transitionStarted = useRef(false);

  const handleStartTransition = () => {
    transitionStarted.current = true;
    startTransitionFn(() => {
      setShowList(true);
    });
  };

  const handleHighPriorityClick = () => {
    // ✅ This is a regular state update — high priority
    // React processes this before the transition even though the transition started first
    setClickCount(v => v + 1);
  };

  return (
    <section>
      <h2>Exercise 3 — Priority Separation: Transitions Are Interruptible</h2>
      <p style={hint}>
        Start the slow transition, then quickly click the high-priority button.
        The counter increments IMMEDIATELY even while the list render is in progress.
      </p>

      <div style={card}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleStartTransition}
            disabled={isPending || showList}
            style={{
              ...btnStyle,
              background: isPending ? '#fef3c7' : '#f0fdf4',
              border: `1px solid ${isPending ? '#fcd34d' : '#86efac'}`,
              color: isPending ? '#92400e' : '#16a34a',
              opacity: showList && !isPending ? 0.5 : 1,
            }}
          >
            {isPending ? '⏳ Rendering 300 items (transition in progress)...' : showList ? 'List rendered' : 'Start slow transition (300 items)'}
          </button>

          <button
            onClick={handleHighPriorityClick}
            style={{ ...btnStyle, background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb' }}
          >
            High priority click ({clickCount})
          </button>
        </div>

        {isPending && (
          <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: 6, fontSize: 12, marginBottom: 8, color: '#92400e' }}>
            ⏳ Transition is running (background render). Click the blue button now — it should respond instantly!
          </div>
        )}

        {clickCount > 0 && (
          <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 12, marginBottom: 8, color: '#1e40af', fontWeight: 600 }}>
            ✅ High-priority click registered: {clickCount} time{clickCount !== 1 ? 's' : ''} — this updated immediately
          </div>
        )}

        {showList && !isPending && (
          <div style={{ height: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            {BIG_ITEMS.map(item => (
              <SlowListItem key={item.id} text={item.text} />
            ))}
          </div>
        )}

        {!showList && !isPending && (
          <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
            List will appear here after transition completes
          </div>
        )}
      </div>

      {/* ANSWERS:
          Q: What does React do with the in-progress transition render when a high-priority
             update comes in?
          A: React abandons ("tears down") the in-progress transition render. It processes
             the high-priority click synchronously, commits it (the counter increments and
             paints), then RESTARTS the transition render from scratch with the latest state.
             This "restart from scratch" is what makes React's concurrent model correct —
             there's no partial state visible to users. But it means transition work can be
             done multiple times if many urgent updates interrupt it. For expensive work that
             shouldn't be redone, use useMemo inside the transitioned component.

          Q: How does React know which updates are "high priority"?
          A: React tags every state update with a "lane" (priority level) based on how it was
             triggered:
             - Event handlers (click, keypress) → SyncLane (highest)
             - startTransition → TransitionLane (lower priority)
             - Default renders → DefaultLane (normal)
             The scheduler checks the lane before deciding what to work on next.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>What concurrent rendering is NOT:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>It's not multithreading — React still runs on the main thread. "Concurrent" means interleaved, not parallel.</li>
          <li>It's not automatic — you opt specific updates into it with startTransition/useDeferredValue.</li>
          <li>It's not free — transitions that get interrupted are rendered twice (or more). Don't use it for cheap renders.</li>
          <li>It's not needed for every state update — only for expensive renders triggered by interactions.</li>
        </ul>
        <div style={{ marginTop: 10 }}>
          <strong>The rule:</strong> If a user interaction triggers a render that takes {'>'} 50ms,
          split it into urgent (input) and non-urgent (result). The urgent part uses regular setState;
          the non-urgent uses startTransition. Everything else stays the same.
        </div>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 15 — Concurrent Rendering
      </h1>

      <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, marginBottom: 28, fontSize: 13, color: '#1e40af' }}>
        <strong>How to get the most out of this topic:</strong> Open DevTools Performance tab,
        record a trace while using the "Without useTransition" search in Exercise 1. You'll see
        one long "Render" task per keystroke. Then record the "With" version — you'll see short
        urgent renders followed by interruptible longer ones, with yields visible between them.
      </div>

      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
