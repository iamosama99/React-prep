// ============================================================
// Topic:   Implement useState from Scratch
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH (conceptual simulation)
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement the minimal useState using the hooks array model.
//   3. Exercise 2: Add updater function support.
//   4. Exercise 3: Observe why hooks can't be in conditionals.
//   5. Compare against the Reference Implementation below.
//
// Run: npm run tutorial 03-implement-use-state-scratch
// ============================================================

import { useState, useEffect, useRef, useCallback, FC } from 'react';

// ── Context ───────────────────────────────────────────────────
// We can't actually replace React's useState in this file.
// Instead, we build a SIMULATION that:
//   1. Implements the hooks-array model in pure JS
//   2. Visualizes the internal state of the hooks[] array
//   3. Runs a mini "component" function using our custom useState
//   4. Shows exactly what happens when you break the rules of hooks
//
// This is what interviewers want to see you reason through.

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Implement a minimal useState using the hooks array model.
//
// The model:
//   - hooks[] stores the state for each useState call, indexed by order
//   - hookIndex tracks which slot the current useState call gets
//   - hookIndex is reset to 0 before every render
//   - setState captures the slot index in a closure so it always writes to the right slot

// ── Mini React Runtime ────────────────────────────────────────
// This is the infrastructure for our simulation.
// You implement useState_Exercise below — this runtime calls your implementation.

type Listener = () => void;

class MiniReact {
  hooks: unknown[] = [];
  hookIndex: number = 0;
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(l => l());
  }

  resetIndex() {
    this.hookIndex = 0;
  }

  getSnapshot(): { hooks: unknown[]; hookIndex: number } {
    return {
      hooks: [...this.hooks],
      hookIndex: this.hookIndex,
    };
  }
}

const runtime = new MiniReact();

// ── Your Task: Implement this useState ───────────────────────
function useState_Exercise<T>(initialValue: T): [T, (valueOrUpdater: T | ((prev: T) => T)) => void] {
  const currentIndex = runtime.hookIndex;
  runtime.hookIndex++;

  // TODO 1: If hooks[currentIndex] is undefined, initialize it to initialValue
  //         (This is the "first render" case)

  // TODO 2: Define a setter function that:
  //         a) Computes the new value (handle both direct value and updater function)
  //         b) Updates hooks[currentIndex] with the new value
  //         c) Calls runtime.notifyListeners() to trigger a re-render

  // TODO 3: Return [current value, setter]

  // Remove these placeholders when you implement:
  void currentIndex;
  void initialValue;
  return [initialValue, () => {}];
}

// ── Mini Component using our custom useState ──────────────────
// This runs inside our simulation runtime, NOT React's rendering.
// It calls useState_Exercise (your implementation) directly.

function miniCounter(): { count: number; name: string; setCount: (v: number | ((p: number) => number)) => void; setName: (v: string) => void } {
  const [count, setCount] = useState_Exercise(0);
  const [name, setName] = useState_Exercise('Alice');
  return { count: count as number, name: name as string, setCount, setName };
}

// ── Simulation Visualizer ─────────────────────────────────────
function Exercise1_HooksArraySimulation() {
  const [snapshot, setSnapshot] = useState<{ hooks: unknown[]; hookIndex: number }>({ hooks: [], hookIndex: 0 });
  const [renderCount, setRenderCount] = useState(0);
  const [componentState, setComponentState] = useState<{ count: number; name: string; setCount: (v: number | ((p: number) => number)) => void; setName: (v: string) => void } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const mounted = useRef(false);

  const runMiniRender = useCallback(() => {
    runtime.resetIndex(); // Critical: reset before render
    const result = miniCounter(); // Run the "component function"
    setComponentState(result);
    setSnapshot(runtime.getSnapshot());
    setRenderCount(c => c + 1);
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      runMiniRender(); // Initial render
    }
    return runtime.subscribe(() => {
      runMiniRender();
      setLog(l => [`Render triggered by setState at ${new Date().toLocaleTimeString()}`, ...l].slice(0, 6));
    });
  }, [runMiniRender]);

  const hookSlots = snapshot.hooks.length > 0 ? snapshot.hooks : [undefined, undefined];

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: Hooks Array Model</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        The <code>miniCounter()</code> function calls <code>useState_Exercise</code> twice.
        Clicking the buttons below calls the setters you implement.
        Watch the <code>hooks[]</code> array update in real time.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement useState_Exercise above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>After implementing, the buttons below should update the hooks[] array.</li>
          <li>Notice that hookIndex is reset to 0 before every render call.</li>
          <li>The setter closes over <code>currentIndex</code> — why does this work across renders?</li>
        </ul>
      </div>

      {/* Hooks array visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', color: '#d4d4d4', fontSize: '0.85rem' }}>
          <div style={{ color: '#608b4e', marginBottom: '0.5rem' }}>// hooks[] array (internal state)</div>
          <div style={{ color: '#9cdcfe' }}>const hooks = [</div>
          {hookSlots.map((val, i) => (
            <div key={i} style={{ marginLeft: '1rem' }}>
              <span style={{ color: '#b5cea8' }}>{i}</span>
              <span style={{ color: '#d4d4d4' }}>: </span>
              <span style={{ color: val !== undefined ? '#ce9178' : '#808080' }}>
                {val !== undefined ? JSON.stringify(val) : 'undefined'}
              </span>
              {i < hookSlots.length - 1 && <span style={{ color: '#d4d4d4' }}>,</span>}
            </div>
          ))}
          <div style={{ color: '#9cdcfe' }}>];</div>
          <div style={{ marginTop: '0.5rem', color: '#608b4e' }}>// rendered {renderCount} times</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>hooks[0] → count</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#333' }}>
              {componentState ? componentState.count : '?'}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => componentState?.setCount(c => (c as number) - 1)}
                style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
              >
                −
              </button>
              <button
                onClick={() => componentState?.setCount(c => (c as number) + 1)}
                style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
              >
                +
              </button>
              <button
                onClick={() => componentState?.setCount(10)}
                style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                set(10)
              </button>
            </div>
          </div>
          <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>hooks[1] → name</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>
              {componentState ? componentState.name : '?'}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Alice', 'Bob', 'Carol'].map(n => (
                <button
                  key={n}
                  onClick={() => componentState?.setName(n)}
                  style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {log.length > 0 && (
        <div style={{ background: '#f9f9f9', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#555' }}>
          {log.map((entry, i) => <div key={i}>{entry}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Demonstrate the updater function pattern.
//
// useState(value) vs useState(prev => value):
//   Direct: `setCount(count + 1)` — uses `count` from the closure (can be stale)
//   Updater: `setCount(prev => prev + 1)` — always gets the latest value
//
// This exercise visualizes the difference when setState is called multiple times
// in a single event handler.

function Exercise2_UpdaterFunction() {
  const [directCount, setDirectCount] = useState(0);
  const [updaterCount, setUpdaterCount] = useState(0);
  const [log, setLog] = useState<{ method: string; result: number; expected: number }[]>([]);

  function addLog(method: string, result: number, expected: number) {
    setLog(l => [{ method, result, expected }, ...l].slice(0, 8));
  }

  function directMultiUpdate() {
    // All three calls use the same `directCount` from the closure
    // In React, if batched, only the last update wins
    const before = directCount;
    setDirectCount(directCount + 1);
    setDirectCount(directCount + 1);
    setDirectCount(directCount + 1);
    // Expected +3, but because all three read the same stale `before` value...
    setTimeout(() => addLog('direct ×3', directCount + 1, before + 3), 50);
  }

  function updaterMultiUpdate() {
    // Each call receives the LATEST value as prev
    const before = updaterCount;
    setUpdaterCount(prev => prev + 1);
    setUpdaterCount(prev => prev + 1);
    setUpdaterCount(prev => prev + 1);
    setTimeout(() => addLog('updater ×3', updaterCount + 3, before + 3), 50);
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: Updater Function Pattern</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Click each button to call setState three times in one event handler.
        The direct form can give surprising results when React batches updates.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>Before clicking — predict the behavior:</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>Direct form: <code>setCount(count + 1)</code> called 3 times — what does count become?</li>
          <li>Updater form: <code>setCount(prev =&gt; prev + 1)</code> called 3 times — what does count become?</li>
          <li>When does the stale closure matter in real applications?</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#ffebee', padding: '1rem', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
          <div style={{ fontSize: '0.8rem', color: '#b71c1c', marginBottom: '0.5rem' }}>Direct form: setCount(count + 1)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#c62828', marginBottom: '0.75rem' }}>{directCount}</div>
          <button
            onClick={directMultiUpdate}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#c62828', color: '#fff', cursor: 'pointer', width: '100%' }}
          >
            +1 +1 +1 (direct)
          </button>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>Calls setCount(count+1) three times</div>
        </div>

        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
          <div style={{ fontSize: '0.8rem', color: '#1b5e20', marginBottom: '0.5rem' }}>Updater: setCount(prev =&gt; prev + 1)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#2e7d32', marginBottom: '0.75rem' }}>{updaterCount}</div>
          <button
            onClick={updaterMultiUpdate}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', width: '100%' }}
          >
            +1 +1 +1 (updater)
          </button>
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>Calls setCount(p =&gt; p+1) three times</div>
        </div>
      </div>

      {log.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '0.5rem 0.75rem', background: '#f9f9f9', fontSize: '0.8rem', fontWeight: 600, color: '#555' }}>
            Update log (most recent first)
          </div>
          {log.map((entry, i) => (
            <div key={i} style={{
              padding: '0.5rem 0.75rem',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: '1rem',
              fontSize: '0.85rem',
              background: i === 0 ? '#fffde7' : '#fff',
            }}>
              <span style={{ fontFamily: 'monospace', color: '#555' }}>{entry.method}</span>
              <span>Result: <strong>{entry.result}</strong></span>
              <span style={{ color: '#888' }}>Expected: {entry.expected}</span>
              {entry.result !== entry.expected && (
                <span style={{ color: '#c62828', fontWeight: 600 }}>MISMATCH</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Exercise 3 ───────────────────────────────────────────────
// Goal: Visualize WHY hooks can't be in conditionals.
//
// This exercise shows the hooks array shifting when a conditional
// skips a useState call, corrupting subsequent hook reads.

function Exercise3_WhyNoConditionals() {
  const [showConditional, setShowConditional] = useState(false);

  // Simulate what WOULD happen if a useState were in a conditional:
  const corruptionExample = [
    {
      render: 'Render 1 (showConditional = false)',
      hookCalls: [
        { index: 0, name: 'useState(0) → count', value: 0 },
        { index: 1, name: 'useState("") → text', value: '""' },
      ],
    },
    {
      render: 'Render 2 (showConditional = true — conditional useState fires!)',
      hookCalls: [
        { index: 0, name: 'useState("new") → extra (conditional)', value: '"new"', isConditional: true },
        { index: 1, name: 'useState(0) → count reads slot 1', value: '"" ← WAS text, now count!', isCorrupted: true },
        { index: 2, name: 'useState("") → text reads slot 2', value: 'undefined ← uninitialized!', isCorrupted: true },
      ],
    },
  ];

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 3: Why Conditionals Break Hooks</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Simulates what would happen if a useState were conditionally called.
        Toggle the condition below and watch the hook slot indices shift.
      </p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: '8px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>showConditional:</span>
        <button
          onClick={() => setShowConditional(v => !v)}
          style={{
            padding: '0.35rem 1rem',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: showConditional ? '#c62828' : '#27ae60',
            background: showConditional ? '#c62828' : '#27ae60',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          {showConditional ? 'true' : 'false'}
        </button>
        <span style={{ fontSize: '0.8rem', color: '#666' }}>
          (In real React, this would throw "Rendered more/fewer hooks than expected")
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {corruptionExample.map((renderScenario, ri) => {
          const isActive = ri === 0 ? !showConditional : showConditional;
          return (
            <div key={ri} style={{
              border: `2px solid ${isActive ? '#1a73e8' : '#eee'}`,
              borderRadius: '8px',
              opacity: isActive ? 1 : 0.5,
              transition: 'all 0.2s',
            }}>
              <div style={{
                padding: '0.5rem 1rem',
                background: isActive ? '#e3f2fd' : '#f9f9f9',
                borderRadius: '6px 6px 0 0',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isActive ? '#1a73e8' : '#888',
              }}>
                {isActive ? '▶ ' : ''}
                {renderScenario.render}
              </div>
              <div style={{ padding: '0.75rem 1rem' }}>
                {renderScenario.hookCalls.map((call, ci) => (
                  <div key={ci} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '6px',
                    marginBottom: '0.3rem',
                    background: call.isConditional ? '#fff3e0' : call.isCorrupted ? '#ffebee' : '#f9f9f9',
                  }}>
                    <span style={{
                      background: call.isConditional ? '#e65100' : call.isCorrupted ? '#c62828' : '#1a73e8',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      [{call.index}]
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#333', flex: 1 }}>{call.name}</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: call.isCorrupted ? '#c62828' : '#555',
                      fontWeight: call.isCorrupted ? 700 : 400,
                    }}>
                      = {call.value}
                    </span>
                    {call.isCorrupted && <span style={{ fontSize: '0.75rem', color: '#c62828', fontWeight: 700 }}>CORRUPT!</span>}
                    {call.isConditional && <span style={{ fontSize: '0.75rem', color: '#e65100', fontWeight: 700 }}>CONDITIONAL</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
        <strong>Key insight:</strong> React uses the call ORDER to match state to hooks, not names.
        When a conditional adds or removes a hook call, every subsequent hook reads from the wrong slot.
        The ESLint rule <code>react-hooks/rules-of-hooks</code> catches this statically.
        React 19 (experimental) is exploring labeled hooks to remove this constraint.
      </div>
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────
// The complete mini-React useState — annotated for clarity.

function createMiniReact() {
  const hooks: unknown[] = [];
  let hookIndex = 0;
  let renderCallback: (() => void) | null = null;

  function useState<T>(initialValue: T): [T, (valueOrUpdater: T | ((prev: T) => T)) => void] {
    const index = hookIndex;
    hookIndex++;

    // Initialize slot on first render
    if (hooks[index] === undefined) {
      hooks[index] = initialValue;
    }

    function setState(valueOrUpdater: T | ((prev: T) => T)) {
      const currentValue = hooks[index] as T;
      const newValue = typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (prev: T) => T)(currentValue)
        : valueOrUpdater;
      hooks[index] = newValue;
      renderCallback?.(); // Trigger re-render
    }

    return [hooks[index] as T, setState];
  }

  function render<T>(component: () => T, onRender: (result: T) => void) {
    renderCallback = () => {
      hookIndex = 0; // CRITICAL: reset before every render
      onRender(component());
    };
    hookIndex = 0;
    onRender(component());
  }

  return { useState, render, hooks };
}

function ReferenceDemo() {
  const [output, setOutput] = useState<string[]>([]);
  const miniReact = useRef(createMiniReact());

  function runSimulation() {
    const logs: string[] = [];
    let renderNum = 0;

    function MyComponent() {
      const [count, setCount] = miniReact.current.useState(0);
      const [name, setName] = miniReact.current.useState('Alice');
      logs.push(`Render ${++renderNum}: count=${count}, name=${name}`);
      return { setCount, setName };
    }

    miniReact.current.render(MyComponent, ({ setCount, setName }) => {
      logs.push(`hooks[] = [${miniReact.current.hooks.join(', ')}]`);
      if (renderNum === 1) {
        logs.push('--- Calling setCount(42) ---');
        setCount(42);
      } else if (renderNum === 2) {
        logs.push('--- Calling setName("Bob") ---');
        setName('Bob');
      } else if (renderNum === 3) {
        logs.push('--- Calling setCount(prev => prev + 1) ---');
        setCount(c => (c as number) + 1);
      }
    });

    setOutput(logs);
  }

  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>createMiniReact() — Annotated Implementation</h3>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
        Click to run a simulation of 3 renders through a mini React runtime with a custom useState.
      </p>
      <button
        onClick={runSimulation}
        style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', background: '#27ae60', color: '#fff', cursor: 'pointer', marginBottom: '1rem' }}
      >
        Run Simulation
      </button>
      {output.length > 0 && (
        <pre style={{ margin: 0, padding: '1rem', background: '#1e1e1e', borderRadius: '8px', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.7, overflow: 'auto' }}>
          {output.join('\n')}
        </pre>
      )}
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Can you explain the hooks array model to an interviewer in under 2 minutes?',
    'Do you reset hookIndex to 0 before every render?',
    'Does your setter close over the slot index (not the value)?',
    'Do you handle both setState(value) and setState(prev => value)?',
    'Can you explain WHY conditional hooks corrupt subsequent hook reads?',
    'Do you know the difference between the array model and React\'s actual fiber linked list?',
    'Can you explain why hooks work in custom hooks but not in regular functions?',
  ];

  return (
    <div style={{ background: '#fffde7', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f9a825' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Interview Checklist</h3>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '0.9rem' }}>
            <span style={{ fontFamily: 'monospace', color: '#f57f17', marginRight: '0.5rem' }}>□</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Implement useState from Scratch</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Understand React's hook system at a mechanistic level.
      Implement the hooks array model, observe the updater function pattern,
      and see exactly why conditional hooks break.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Exercise1_HooksArraySimulation />
      <Exercise2_UpdaterFunction />
      <Exercise3_WhyNoConditionals />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
