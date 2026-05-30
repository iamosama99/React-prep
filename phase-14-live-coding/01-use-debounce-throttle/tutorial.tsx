// ============================================================
// Topic:   useDebounce & useThrottle
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement useDebounce — fill in the TODOs.
//   3. Exercise 2: Implement useThrottle — fill in the TODOs.
//   4. Compare your solution against the Reference Implementation below.
//
// Run: npm run tutorial 01-use-debounce-throttle
// ============================================================

import { useState, useEffect, useRef, FC } from 'react';

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Implement useDebounce<T>(value: T, delay: number): T
//
// The hook returns a "debounced" version of `value`.
// It only updates after `delay` ms have passed with no new value.
//
// Rules:
//   - Use useRef for the timer ID (NOT useState)
//   - Return a cleanup function from useEffect that clears the timer
//   - The returned value should start as the initial value immediately
//
// Test it: type fast in the input below.
// The "debounced value" should only update after you STOP typing.

function useDebounce_Exercise<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // TODO 1: Create a timer with setTimeout that sets debouncedValue after `delay` ms
    // TODO 2: Return a cleanup function that clears the timer
    //         (hint: clearTimeout(timerId))

    // Remove this placeholder when you implement:
    void delay;
  }, [value, delay]);

  return debouncedValue;
}

function Exercise1_Debounce() {
  const [input, setInput] = useState('');
  const debouncedInput = useDebounce_Exercise(input, 500);
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: useDebounce</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Type fast. The "debounced" value should only update 500ms after you stop.
      </p>
      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement useDebounce_Exercise above before continuing</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>Why useRef for the timer ID, not useState?</li>
          <li>What happens without the cleanup function?</li>
          <li>What does the debounced value equal on the very first render?</li>
        </ul>
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type something quickly..."
        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
      />

      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Live value (updates instantly)</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1rem', minHeight: '1.5rem', color: '#333' }}>
            {input || <span style={{ color: '#ccc' }}>empty</span>}
          </div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Debounced value (500ms delay)</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1rem', minHeight: '1.5rem', color: '#2e7d32' }}>
            {debouncedInput || <span style={{ color: '#ccc' }}>empty</span>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#888' }}>
        Component re-rendered {renderCount.current} times
      </div>
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Implement useThrottle<T>(value: T, interval: number): T
//
// The hook returns a "throttled" version of `value`.
// It emits the value at most once per `interval` ms.
//
// Rules:
//   - Use useRef for lastUpdated timestamp (Date.now())
//   - If enough time has passed: update immediately
//   - If not enough time: schedule an update for when the interval expires
//   - Clean up any pending timer

function useThrottle_Exercise<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdated.current;

    if (elapsed >= interval) {
      // TODO 3: Enough time has passed — update throttledValue and lastUpdated.current immediately
    } else {
      // TODO 4: Not enough time — schedule an update for when the interval completes
      //         remaining time = interval - elapsed
      // TODO 5: Return cleanup that clears the timer
    }
  }, [value, interval]);

  return throttledValue;
}

function Exercise2_SideBySide() {
  const [input, setInput] = useState('');
  const debounced = useDebounce_Exercise(input, 400);
  const throttled = useThrottle_Exercise(input, 400);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: useThrottle (side-by-side comparison)</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        400ms delay/interval. Type continuously and observe: debounce waits for silence; throttle emits periodically.
      </p>
      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement useThrottle_Exercise above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>How does throttle behavior differ from debounce when you type continuously?</li>
          <li>What is the difference in the update pattern when you stop typing suddenly?</li>
        </ul>
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type continuously to see the difference..."
        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
      />

      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Live</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', minHeight: '1.5rem' }}>{input || '—'}</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#388e3c', marginBottom: '4px' }}>Debounced (400ms)</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', minHeight: '1.5rem', color: '#388e3c' }}>{debounced || '—'}</div>
        </div>
        <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#1565c0', marginBottom: '4px' }}>Throttled (400ms)</div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', minHeight: '1.5rem', color: '#1565c0' }}>{throttled || '—'}</div>
        </div>
      </div>
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────
// Stop here and attempt both exercises first.
// Only read the reference after you have working implementations.
// ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // useRef is used for the timer ID — not useState — because changing the timer ID
    // should NOT trigger a re-render. It's an implementation detail.
    const timerId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel the previous timer if value or delay changes before it fires.
    // This runs BEFORE the next effect AND on unmount.
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debouncedValue;
}

function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastUpdated.current;

    if (elapsed >= interval) {
      // Enough time has passed — emit immediately
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      // Not enough time — schedule update for when interval expires
      const remaining = interval - elapsed;
      const timerId = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, remaining);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

function ReferenceDemo() {
  const [input, setInput] = useState('');
  const [log, setLog] = useState<{ type: string; value: string; time: string }[]>([]);
  const debounced = useDebounce(input, 400);
  const throttled = useThrottle(input, 400);
  const prevDebounced = useRef(debounced);
  const prevThrottled = useRef(throttled);

  useEffect(() => {
    if (debounced !== prevDebounced.current) {
      prevDebounced.current = debounced;
      setLog(l => [{ type: 'debounce', value: debounced as string, time: new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...l].slice(0, 12));
    }
  }, [debounced]);

  useEffect(() => {
    if (throttled !== prevThrottled.current) {
      prevThrottled.current = throttled;
      setLog(l => [{ type: 'throttle', value: throttled as string, time: new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...l].slice(0, 12));
    }
  }, [throttled]);

  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>Working Implementation with Event Log</h3>
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type here to generate events..."
        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '1rem' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#f0f0f0', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#666' }}>Live</div>
          <div style={{ fontFamily: 'monospace' }}>{input || '—'}</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#388e3c' }}>Debounced (400ms)</div>
          <div style={{ fontFamily: 'monospace', color: '#388e3c' }}>{debounced as string || '—'}</div>
        </div>
        <div style={{ background: '#e3f2fd', padding: '0.75rem', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.75rem', color: '#1565c0' }}>Throttled (400ms)</div>
          <div style={{ fontFamily: 'monospace', color: '#1565c0' }}>{throttled as string || '—'}</div>
        </div>
      </div>

      {log.length > 0 && (
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
          {log.map((entry, i) => (
            <div key={i} style={{
              padding: '0.4rem 0.75rem',
              borderBottom: '1px solid #f5f5f5',
              display: 'flex',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}>
              <span style={{
                padding: '1px 8px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                background: entry.type === 'debounce' ? '#e8f5e9' : '#e3f2fd',
                color: entry.type === 'debounce' ? '#388e3c' : '#1565c0',
              }}>
                {entry.type}
              </span>
              <span style={{ color: '#666', fontFamily: 'monospace' }}>{entry.time}</span>
              <span style={{ fontFamily: 'monospace' }}>"{entry.value}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Did you use useRef for the timer ID (not useState)?',
    'Did you return a cleanup function from useEffect that calls clearTimeout?',
    'Does the hook return the initial value synchronously on first render?',
    'Is delay/interval in the useEffect dependency array?',
    'For useThrottle: do you use useRef for the lastUpdated timestamp?',
    'For useThrottle: do you also clean up the scheduled timer?',
    'Can you explain the visual difference between debounce and throttle on a timeline?',
    'Do you know when to reach for each — debounce for search, throttle for scroll/resize?',
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
    <h1>useDebounce &amp; useThrottle</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Two of the most frequently asked custom hook implementations in React interviews.
      Complete the exercises before reading the reference implementation.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Exercise1_Debounce />
      <Exercise2_SideBySide />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
