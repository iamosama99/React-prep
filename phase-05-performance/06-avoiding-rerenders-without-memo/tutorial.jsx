// ============================================================
// Topic:   Avoiding Re-renders Without Memo
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises are REFACTORING exercises.
//   Each one starts with a broken structure and you restructure it
//   without touching React.memo. The structural fix is always simpler
//   and more robust than memo.
// ============================================================

import { useState, useRef } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };

function RenderBadge({ name, count }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 10, fontSize: 11,
      background: count > 1 ? '#fef2f2' : '#f1f5f9',
      color: count > 1 ? '#dc2626' : '#64748b',
    }}>
      {name}: {count} renders
    </span>
  );
}


// ─── Exercise 1: Push State Down ──────────────────────────────
//
// SITUATION
//   A dashboard has an expensive static chart AND a live ticker that
//   updates every second. Both live inside <Dashboard>. Every tick
//   re-renders Dashboard and its children — including the expensive chart.
//
//   The BEFORE version: tick state lives in Dashboard, causing
//   ExpensiveChart (which has nothing to do with the tick) to re-render
//   on every second.
//
//   The AFTER version: push the tick state DOWN into its own <LiveTicker>
//   component. Now when the tick updates, only LiveTicker re-renders.
//   ExpensiveChart is a sibling — it's outside the re-render blast radius.
//
// YOUR TASK
//   1. Click "Start ticker" in the BEFORE version. Observe ExpensiveChart
//      re-rendering every second (watch the render count climb).
//   2. Click "Start ticker" in the AFTER version. ExpensiveChart's count
//      stays at 1 — it never re-renders after mount.
//   3. Complete the AFTER version by implementing <LiveTicker> that owns
//      its own interval state.
//
// NOTE: The fix requires ZERO memo, ZERO useCallback, ZERO useMemo.
//       Just structural colocation of state and UI.

function ExpensiveChart({ count }) {
  const renderCount = useRef(0);
  renderCount.current++;
  // Simulate some work
  const data = Array.from({ length: 10 }, (_, i) => ({ x: i, y: Math.sin(i + count) }));
  return (
    <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Sales Chart</span>
        <RenderBadge name="chart" count={renderCount.current} />
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, background: '#3b82f6', height: `${Math.abs(d.y) * 38 + 2}px`, borderRadius: '2px 2px 0 0' }} />
        ))}
      </div>
    </div>
  );
}

// ─── BEFORE: tick state in parent — cascades to ExpensiveChart ───

function DashboardBefore() {
  const renderCount = useRef(0);
  renderCount.current++;

  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const toggleTicker = () => {
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
      setRunning(true);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <RenderBadge name="Dashboard" count={renderCount.current} />
        <button onClick={toggleTicker} style={{ ...btnStyle, background: running ? '#fef2f2' : '#f0fdf4', border: '1px solid #e2e8f0' }}>
          {running ? 'Stop' : 'Start'} ticker
        </button>
      </div>
      {/* ❌ State lives HERE — every tick re-renders Dashboard → ExpensiveChart */}
      <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 4, fontSize: 13, marginBottom: 10 }}>
        Ticker: {tick}s <span style={{ fontSize: 11, color: '#94a3b8' }}>(state owned by DashboardBefore)</span>
      </div>
      <ExpensiveChart count={tick} />
    </div>
  );
}

// ─── AFTER: tick state pushed down into LiveTicker ────────────

function LiveTicker() {
  // TODO: Move tick state and interval logic here.
  // DashboardAfter should only contain <LiveTicker /> and <ExpensiveChart />
  // LiveTicker should render the tick count display and control button.
  // ExpensiveChart should receive a STABLE prop (not tick — it doesn't need to change).
  return (
    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 4, fontSize: 13 }}>
      TODO: implement LiveTicker (move tick state here)
    </div>
  );
}

function DashboardAfter() {
  return (
    <div>
      {/* ✅ LiveTicker owns its own state — DashboardAfter never re-renders */}
      <LiveTicker />
      {/* ExpensiveChart gets a stable prop — it renders once on mount, never again */}
      <ExpensiveChart count={0} />
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Push State Down</h2>
      <p style={hint}>
        Watch the chart's render count as the ticker runs.
        In the BEFORE version it grows. In the AFTER version it stays at 1.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>
            ❌ BEFORE: state in parent → chart re-renders every tick
          </div>
          <DashboardBefore />
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 10 }}>
            ✅ AFTER: push state into LiveTicker → chart never re-renders
          </div>
          <DashboardAfter />
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The insight:</strong> Re-renders propagate DOWNWARD from the component that owns the changing state.
        Move the state as close to what uses it as possible. Siblings of the state-owner are immune.
      </div>
    </section>
  );
}


// ─── Exercise 2: Children as Props ───────────────────────────
//
// SITUATION
//   A <ColorPicker> wraps ExpensiveReport inside it. When the user
//   picks a color, ColorPicker re-renders — and so does ExpensiveReport,
//   even though it has nothing to do with colors.
//
//   We CAN'T push state down because ColorPicker needs to wrap
//   ExpensiveReport (to apply the color style). But we CAN lift the
//   expensive content UP to a stable ancestor and pass it as children.
//
//   Key insight: `<ExpensiveReport />` is a React element — an object
//   created in the render of whoever writes that JSX. If App writes it
//   and App doesn't re-render on color changes, the same element object
//   is passed as children every time ColorPicker re-renders.
//   React sees the same reference → skips reconciling ExpensiveReport.
//
// YOUR TASK
//   1. In the BEFORE version, pick different colors. Watch ExpensiveReport
//      re-render on every color change.
//   2. Restructure to the AFTER pattern (children as props).
//      In App/Exercise2: <ColorPicker><ExpensiveReport /></ColorPicker>
//      In ColorPicker: render {children} instead of <ExpensiveReport />
//   3. Now color changes no longer re-render ExpensiveReport.

function ExpensiveReport() {
  const count = useRef(0);
  count.current++;
  return (
    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Quarterly Report</span>
        <RenderBadge name="report" count={count.current} />
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        {['Q1: $1.2M', 'Q2: $1.8M', 'Q3: $2.1M', 'Q4: $2.4M'].map(line => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

// ─── BEFORE: ExpensiveReport is a child of ColorPicker ────────
function ColorPickerBefore({ children }) {
  const count = useRef(0);
  count.current++;

  const [color, setColor] = useState('#3b82f6');
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ padding: 14, borderRadius: 8, border: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <RenderBadge name="ColorPicker" count={count.current} />
        <div style={{ display: 'flex', gap: 6 }}>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #1e293b' : '2px solid transparent', cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
      {/* ❌ ExpensiveReport rendered HERE — re-renders when color changes */}
      <ExpensiveReport />
    </div>
  );
}

// ─── AFTER: ExpensiveReport passed as children from stable parent ────
function ColorPickerAfter({ children }) {
  const count = useRef(0);
  count.current++;

  const [color, setColor] = useState('#3b82f6');
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ padding: 14, borderRadius: 8, border: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <RenderBadge name="ColorPicker" count={count.current} />
        <div style={{ display: 'flex', gap: 6 }}>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #1e293b' : '2px solid transparent', cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
      {/* ✅ Render children — created by stable parent, same reference each re-render */}
      {children}
    </div>
  );
}

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Children as Props</h2>
      <p style={hint}>
        Pick colors in each panel. In BEFORE, the report re-renders on every
        color change. In AFTER, the report renders once and never again.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>
            ❌ BEFORE: report inside ColorPicker
          </div>
          <ColorPickerBefore />
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 10 }}>
            ✅ AFTER: report as stable children from above
          </div>
          {/* ✅ <ExpensiveReport /> is created here — this Exercise2 component
               never re-renders on color changes. Same element object every time. */}
          <ColorPickerAfter>
            <ExpensiveReport />
          </ColorPickerAfter>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Why this works:</strong> <code>&lt;ExpensiveReport /&gt;</code> is a React
        element — a plain JS object created by the component that <em>writes</em> that JSX.
        Exercise2 creates it. Exercise2 never re-renders on color changes (color state is inside
        ColorPickerAfter). So the same object reference is passed as <code>children</code> on
        every ColorPickerAfter re-render. React sees the same reference → skips reconciling
        ExpensiveReport entirely. No memo needed.
      </div>
    </section>
  );
}


// ─── Exercise 3: Design Decision — Memo vs Structure ─────────
//
// SITUATION
//   Three real-world scenarios. For each: decide whether the right fix
//   is structural (push state down / children as props) or React.memo.
//   Write your reasoning in the provided comment.
//
// There's no code to run — this is a design exercise.
// After writing your reasoning, compare to the explanation at the bottom.

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — When to Restructure vs When to Use memo</h2>
      <p style={hint}>
        Read each scenario. Write which fix you'd use and why.
        Then check the explanation at the bottom.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...card, borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scenario A</div>
          <p style={{ fontSize: 13, margin: '0 0 8px', color: '#475569' }}>
            A <code>&lt;Navbar&gt;</code> re-renders every time the parent's fetch completes
            (parent holds data state). Navbar is pure display — it only shows the current
            user's name, which never changes during a session. It's cheap to render.
          </p>
          {/* YOUR ANSWER:
              Structural fix: if Navbar doesn't need data at all, push data state down
              into the components that do need it, making Navbar a sibling instead of
              a descendant. Alternatively, since Navbar is CHEAP to render, memo overhead
              may exceed the render cost — leave it as-is and don't optimize.

              Rule: profile first. Cheap components don't need memo. Only optimize when
              a profiler shows the component is on the hot path and its renders are expensive.
          */}
          <div style={{ fontSize: 12, padding: '6px 10px', background: '#eff6ff', borderRadius: 4 }}>
            Write your fix decision here (structural? memo? neither?) and why.
          </div>
        </div>

        <div style={{ ...card, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scenario B</div>
          <p style={{ fontSize: 13, margin: '0 0 8px', color: '#475569' }}>
            A <code>&lt;SearchResultsPage&gt;</code> has a search input (state changes on
            every keystroke) and a <code>&lt;ResultsList&gt;</code> that renders 50 complex
            cards. ResultsList only needs to update when the search results data changes —
            not on every individual keystroke during typing.
          </p>
          {/* YOUR ANSWER:
              Both structural AND memo:
              1. Push search input state into its own <SearchBox> component (or use
                 useTransition — topic 15) so keystrokes don't cascade to ResultsList.
              2. OR wrap ResultsList in React.memo and pass a stable `results` array
                 (don't recreate it on every keystroke — debounce or useMemo the filter).

              The structural fix (push state down / useTransition) is more robust because
              it doesn't require stabilizing every prop of ResultsList. Memo is a good
              secondary line of defense once the structure is right.
          */}
          <div style={{ fontSize: 12, padding: '6px 10px', background: '#fef3c7', borderRadius: 4 }}>
            Write your fix decision here.
          </div>
        </div>

        <div style={{ ...card, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Scenario C</div>
          <p style={{ fontSize: 13, margin: '0 0 8px', color: '#475569' }}>
            A <code>&lt;Modal&gt;</code> component that wraps its children with a backdrop
            and close button. Modal's open/close state changes frequently. Its children
            (an expensive form) should not re-render when the modal opens and closes —
            it should only render when actually visible.
          </p>
          {/* YOUR ANSWER:
              Children as props: the expensive form is passed as children from a stable
              ancestor. When Modal's own state (open/close) changes, it re-renders, but
              the children prop (the form element) is the same reference from the stable
              parent. React bails out on the form subtree.

              This is the same pattern as Exercise 2. The form doesn't need to be in
              Modal's render — it comes from outside.

              Note: if the modal is actually unmounted when closed (not just hidden),
              none of this matters — the children aren't rendered at all when closed.
              This pattern matters most when the modal is hidden via CSS but stays
              mounted.
          */}
          <div style={{ fontSize: 12, padding: '6px 10px', background: '#d1fae5', borderRadius: 4 }}>
            Write your fix decision here.
          </div>
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
        Phase 5 · 06 — Avoiding Re-renders Without Memo
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
