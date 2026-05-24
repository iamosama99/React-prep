// ============================================================
// Topic:   Profiler API & DevTools Profiler
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises instrument components with
//   the <Profiler> API to measure render performance. You'll interpret
//   actualDuration vs baseDuration to verify whether memoization works.
// ============================================================

import { Profiler, useState, useMemo, memo, useRef } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Shared profiler log ─────────────────────────────────────
function ProfilerLog({ entries }) {
  if (entries.length === 0) return (
    <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>No renders recorded yet.</div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entries.slice(-6).map((e, i) => (
        <div key={i} style={{
          fontSize: 12, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 3,
          background: e.actualDuration > 10 ? '#fef2f2' : '#f0fdf4',
          color: e.actualDuration > 10 ? '#dc2626' : '#166534',
        }}>
          [{e.id}] {e.phase} — actual: <strong>{e.actualDuration.toFixed(2)}ms</strong>
          {' '}base: {e.baseDuration.toFixed(2)}ms
          {' '}<span style={{ color: '#64748b' }}>
            (saved: {Math.max(0, e.baseDuration - e.actualDuration).toFixed(2)}ms)
          </span>
        </div>
      ))}
    </div>
  );
}


// ─── Exercise 1: Instrument with the Profiler Component ──────
//
// SITUATION
//   The <Profiler> component fires an onRender callback on every commit
//   within its subtree. It provides timing data you can use to:
//   - Measure actualDuration (what React actually spent rendering)
//   - Measure baseDuration (estimated cost with zero memoization)
//   - Track phase: "mount" vs "update"
//   - Set thresholds: log slow renders to your monitoring service
//
//   The gap between baseDuration and actualDuration tells you how much
//   work your memoization saved.
//
// YOUR TASK
//   1. Click "Tick (no memo)" several times. Watch the profiler log.
//      actualDuration ≈ baseDuration — memoization saves nothing.
//   2. Click "Tick (with memo)" several times. Watch the log.
//      actualDuration << baseDuration — memo is saving the render cost.
//   3. Answer: what does it mean when actualDuration ≈ baseDuration?
//      What does a large gap mean?

function ExpensiveSubtree({ value }) {
  // Simulates an expensive-ish render with multiple child components
  const items = Array.from({ length: 50 }, (_, i) => `Row ${i}: ${value}`);
  return (
    <div style={{ height: 80, overflow: 'hidden', fontSize: 10, color: '#94a3b8' }}>
      {items.slice(0, 5).map((item, i) => <div key={i}>{item}</div>)}
      <div>... {items.length - 5} more rows</div>
    </div>
  );
}

const MemoizedSubtree = memo(ExpensiveSubtree);

function Exercise1() {
  const [tick, setTick] = useState(0);
  const [useMemoization, setUseMemoization] = useState(false);
  const [profilerEntries, setProfilerEntries] = useState([]);

  const stableValue = 'stable-data'; // never changes

  const onRender = (id, phase, actualDuration, baseDuration) => {
    setProfilerEntries(prev => [...prev, { id, phase, actualDuration, baseDuration }]);
  };

  return (
    <section>
      <h2>Exercise 1 — Instrumenting with the Profiler Component</h2>
      <p style={hint}>
        Click the tick buttons and watch the profiler log. Notice how memo
        affects the gap between actualDuration and baseDuration.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => { setUseMemoization(false); setTick(t => t + 1); }}
          style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          Tick without memo (tick: {tick})
        </button>
        <button
          onClick={() => { setUseMemoization(true); setTick(t => t + 1); }}
          style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
        >
          Tick with memo (tick: {tick})
        </button>
        <button
          onClick={() => setProfilerEntries([])}
          style={{ ...btnStyle, background: '#f1f5f9', border: '1px solid #e2e8f0' }}
        >
          Clear log
        </button>
      </div>

      <Profiler id="ExpensiveSection" onRender={onRender}>
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {useMemoization ? '✅ With memo' : '❌ Without memo'} — subtree value: "{stableValue}"
          </div>
          {useMemoization
            ? <MemoizedSubtree value={stableValue} />
            : <ExpensiveSubtree value={stableValue} />
          }
        </div>
      </Profiler>

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Profiler log:</div>
        <ProfilerLog entries={profilerEntries} />
      </div>

      {/* ANSWERS:
          actualDuration ≈ baseDuration → memoization is saving nothing.
          Every component in the subtree re-rendered. Possible causes:
          - No memo wrapping
          - Memo is failing (unstable props)
          - Context changes bypassing memo

          Large gap (actualDuration << baseDuration) → memo is working.
          baseDuration represents full-tree render cost; actualDuration
          represents what actually ran. The difference = time saved by memo bailouts.

          Use case for Profiler in production:
          onRender((id, phase, actualDuration) => {
            if (actualDuration > 50) {
              analytics.track('slow_render', { component: id, phase, duration: actualDuration });
            }
          });
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Interpret the numbers:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><strong>actualDuration ≈ baseDuration</strong>: memo is doing nothing (or not applied)</li>
          <li><strong>actualDuration ≪ baseDuration</strong>: memo is working — skipping expensive subtrees</li>
          <li><strong>phase = "mount"</strong>: first render (always equals baseDuration — no bailouts possible)</li>
          <li><strong>phase = "update"</strong>: re-render — this is where memo helps</li>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 2: Nested Profilers for Surgical Measurement ───
//
// SITUATION
//   A real dashboard has multiple sections. You want to know WHICH
//   section is the bottleneck. Nest multiple <Profiler> components
//   to get per-section timing data.
//
//   Each nested Profiler fires independently. You can measure the whole
//   app AND specific subsections simultaneously.
//
// YOUR TASK
//   1. Click "Trigger update" to see all sections profile.
//   2. Add a slow section (simulate with the toggle).
//   3. Identify from the profiler log which section is the bottleneck.
//   4. Answer: if nested Profiler A fires AND parent Profiler B fires,
//      does A's time count toward B's actualDuration?

function ProfiledSection({ id, label, slowMode, color, onRender }) {
  const items = slowMode
    ? Array.from({ length: 200 }, (_, i) => `${label} item ${i}`)
    : Array.from({ length: 5 }, (_, i) => `${label} item ${i}`);

  return (
    <Profiler id={id} onRender={onRender}>
      <div style={{ padding: '8px 12px', background: color, borderRadius: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
          {label} {slowMode && <span style={{ color: '#dc2626' }}>(slow)</span>}
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {items.slice(0, 3).join(' | ')} {items.length > 3 ? `+${items.length - 3} more` : ''}
        </div>
      </div>
    </Profiler>
  );
}

function Exercise2() {
  const [tick, setTick] = useState(0);
  const [slowSection, setSlowSection] = useState(null);
  const [entries, setEntries] = useState([]);

  const addEntry = (id, phase, actualDuration, baseDuration) => {
    setEntries(prev => [...prev, { id, phase, actualDuration, baseDuration }]);
  };

  return (
    <section>
      <h2>Exercise 2 — Nested Profilers for Per-Section Timing</h2>
      <p style={hint}>
        Each section has its own Profiler. Identify the bottleneck by looking at
        which section's actualDuration is highest.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setEntries([]); setTick(t => t + 1); }}
          style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
        >
          Trigger update
        </button>
        <select
          value={slowSection || ''}
          onChange={e => setSlowSection(e.target.value || null)}
          style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}
        >
          <option value="">No slow section</option>
          <option value="header">Slow: Header</option>
          <option value="sidebar">Slow: Sidebar</option>
          <option value="main">Slow: Main Content</option>
        </select>
      </div>

      {/* Outer profiler measures the whole dashboard */}
      <Profiler id="Dashboard" onRender={addEntry}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 12 }}>
          <ProfiledSection id="header" label="Header" slowMode={slowSection === 'header'} color="#eff6ff" onRender={addEntry} />
          <ProfiledSection id="sidebar" label="Sidebar" slowMode={slowSection === 'sidebar'} color="#f0fdf4" onRender={addEntry} />
          <ProfiledSection id="main" label="Main Content" slowMode={slowSection === 'main'} color="#fef3c7" onRender={addEntry} />
          <ProfiledSection id="footer" label="Footer" slowMode={false} color="#faf5ff" onRender={addEntry} />
        </div>
      </Profiler>

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Section profiler log (last render):</div>
        <ProfilerLog entries={entries} />
      </div>

      {/* ANSWER: Does A's time count toward B's actualDuration?
          YES — nested Profiler timings are additive. If Section A takes 5ms and
          is inside Dashboard, Dashboard's actualDuration includes those 5ms.
          The parent Profiler always reports the total time for its subtree,
          which includes all nested subtrees. The nested Profiler gives you
          the breakdown; the parent gives you the total.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Production monitoring pattern:</strong>
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '10px 14px', borderRadius: 4, fontSize: 12, marginTop: 8 }}>{`function onRender(id, phase, actualDuration) {
  // Only log slow renders to avoid noise
  if (phase === 'update' && actualDuration > 50) {
    analytics.track('slow_render', {
      component: id,
      durationMs: actualDuration,
    });
  }
}`}</pre>
      </div>
    </section>
  );
}


// ─── Exercise 3: Verify Memoization is Actually Working ──────
//
// SITUATION
//   You've added React.memo and think your performance problem is solved.
//   But how do you VERIFY that memo is actually bailing out and not just
//   adding overhead without benefit?
//
//   The Profiler tells you:
//   - actualDuration: what React spent (low = memo working)
//   - baseDuration: cost if no memo (high = the subtree is expensive)
//   If actualDuration ≈ baseDuration after adding memo, memo is NOT working.
//
// YOUR TASK
//   1. Start with no memo. Note the actualDuration on updates.
//   2. Enable memo. Note the actualDuration. Should be near zero (bailout).
//   3. Break memo by enabling the "unstable prop" — actualDuration climbs again.
//   4. Diagnose: the unstable prop is defeating memo. Fix it.
//   5. This replicates the real workflow: profile → optimize → verify.

const ExpensiveTable = memo(function ExpensiveTable({ data, style }) {
  const rows = Array.from({ length: 30 }, (_, i) => data[i % data.length]);
  return (
    <div style={{ ...style, fontSize: 12, overflow: 'hidden', height: 100 }}>
      {rows.slice(0, 5).map((row, i) => (
        <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #f8fafc', color: '#475569' }}>
          {row.name}: ${row.price}
        </div>
      ))}
      <div style={{ color: '#94a3b8' }}>...{rows.length - 5} more</div>
    </div>
  );
});

const STABLE_DATA = Array.from({ length: 20 }, (_, i) => ({ name: `Product ${i}`, price: (i * 4.99).toFixed(2) }));
const STABLE_STYLE = { background: '#f8fafc', padding: '6px 10px', borderRadius: 4 };

function Exercise3() {
  const [tick, setTick] = useState(0);
  const [useMemoWrap, setUseMemoWrap] = useState(false);
  const [unstableProp, setUnstableProp] = useState(false);
  const [entries, setEntries] = useState([]);

  const tableStyle = unstableProp
    ? { background: '#f8fafc', padding: '6px 10px', borderRadius: 4 } // ← new object every render
    : STABLE_STYLE; // ← stable reference

  const onRender = (id, phase, actualDuration, baseDuration) => {
    setEntries(prev => [...prev, { id, phase, actualDuration, baseDuration }]);
  };

  return (
    <section>
      <h2>Exercise 3 — Verify Memoization is Working via Profiler</h2>
      <p style={hint}>
        Profile the table in each state. Verify memo via actualDuration.
        Then break memo with an unstable prop and diagnose it.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setEntries([]); setTick(t => t + 1); }}
          style={{ ...btnStyle, background: '#3b82f6', color: 'white' }}
        >
          Tick (trigger parent re-render) — #{tick + 1}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={useMemoWrap} onChange={e => setUseMemoWrap(e.target.checked)} />
          Use React.memo
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: useMemoWrap ? 1 : 0.4 }}>
          <input type="checkbox" checked={unstableProp} onChange={e => setUnstableProp(e.target.checked)} disabled={!useMemoWrap} />
          Unstable style prop (defeats memo)
        </label>
      </div>

      <Profiler id="TableSection" onRender={onRender}>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            {useMemoWrap ? '✅ React.memo applied' : '❌ No memo'}
            {useMemoWrap && unstableProp && ' — ⚠️ Memo defeated by unstable prop'}
          </div>
          {useMemoWrap
            ? <ExpensiveTable data={STABLE_DATA} style={tableStyle} />
            : <ExpensiveTable.__proto__ === Function.prototype
                ? <ExpensiveTable data={STABLE_DATA} style={tableStyle} />
                : null
            }
          {!useMemoWrap && <ExpensiveTable data={STABLE_DATA} style={tableStyle} />}
        </div>
      </Profiler>

      <div style={{ marginTop: 12, ...card }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Profiler readings:</div>
        <ProfilerLog entries={entries} />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The verification workflow:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Profile WITHOUT memo → record baseDuration (baseline cost)</li>
          <li>Add memo → re-profile → actualDuration should drop significantly</li>
          <li>If actualDuration ≈ baseDuration still → memo is not working → check props</li>
          <li>Find the unstable prop (objects, functions, JSX) → stabilize it → re-verify</li>
        </ol>
        This cycle — profile → optimize → verify — is the correct workflow.
        Never add memo without profiling first AND verifying it worked after.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 11 — Profiler API &amp; DevTools
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
