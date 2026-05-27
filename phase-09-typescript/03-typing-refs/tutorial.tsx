// ============================================================
// Topic:   Typing Refs
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 03-typing-refs
//
// APPROACH:
//   Exercise 1 — DOM ref: useRef<HTMLElement>(null) + safe access (build)
//   Exercise 2 — Mutable instance variable: useRef<T>(value) (observe diff)
//   Exercise 3 — Callback ref for dynamic measurement (build)
//
// The two uses of useRef have DIFFERENT type signatures and semantics.
// This tutorial makes that distinction concrete.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const mono: React.CSSProperties = {
  fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9',
  padding: '2px 6px', borderRadius: 4, color: '#334155',
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — DOM ref: useRef<HTMLElement>(null)
//
// A SearchModal that:
//   • Focuses the search input automatically when it opens
//   • Scrolls back to the top when results change
//
// The TYPE matters here:
//   useRef<HTMLInputElement>(null)
//     → matches overload 2 → RefObject<HTMLInputElement>
//     → .current is READONLY (T | null) — React manages it
//
//   useRef<HTMLInputElement | null>(null)
//     → matches overload 1 → MutableRefObject<HTMLInputElement | null>
//     → .current is writable — you can reassign it manually
//
// For DOM refs, always use the FIRST form. React owns the .current.
//
// CHECK YOURSELF:
//   • Why is useRef<HTMLInputElement>(null) preferred over useRef<HTMLInputElement|null>(null)?
//   • Inside useEffect, is it safe to use inputRef.current! (non-null assertion)? Why?
//   • What would happen if you called inputRef.current!.focus() in a click handler
//     that could run before the component mounts?
// ─────────────────────────────────────────────────────────────

function Exercise1() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<string[]>([]);

  // ✅ useRef<HTMLInputElement>(null) — DOM ref, .current is readonly
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const allItems = ['TypeScript', 'React', 'Vite', 'Tailwind', 'Zustand', 'React Query', 'Zod', 'Vitest'];

  // Focus the input when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Safe: effects run AFTER mount, so current is definitely the DOM node
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Scroll to top when results change
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [results]);

  // Update results when query changes
  useEffect(() => {
    setResults(
      query.trim()
        ? allItems.filter(i => i.toLowerCase().includes(query.toLowerCase()))
        : allItems
    );
  }, [query]);

  if (!isOpen) {
    return (
      <div style={card}>
        <button onClick={() => setIsOpen(true)} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>
          Open search (⌘K)
        </button>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
          Click to open — input auto-focuses via <code style={mono}>inputRef.current?.focus()</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{ ...card, borderColor: '#818cf8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Search</strong>
        <button onClick={() => { setIsOpen(false); setQuery(''); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>
          ✕
        </button>
      </div>

      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to filter…"
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #c7d2fe', boxSizing: 'border-box' }}
      />

      <ul ref={listRef} style={{ maxHeight: 160, overflowY: 'auto', margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
        {results.length === 0
          ? <li style={{ fontSize: 13, color: '#9ca3af', padding: '4px 0' }}>No results</li>
          : results.map(r => (
              <li key={r} style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {r}
              </li>
            ))
        }
      </ul>

      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 0 }}>
        Hover: <code style={mono}>inputRef.current</code> is{' '}
        <code style={mono}>HTMLInputElement | null</code> (readonly — React owns it).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Mutable instance variable: useRef<T>(initialValue)
//
// A stopwatch using refs for the timer ID and start time.
// These are NOT state — changing them must NOT trigger a re-render.
//
// KEY DIFFERENCE:
//   useRef<number>(0)       → MutableRefObject<number> → current is `number` (no null)
//   useRef<number | null>(null) → MutableRefObject<number | null> → current could be null
//
// For mutable instance variables where you provide an initial value,
// use the FIRST form — no null check needed when reading.
//
// Why not useState here?
//   - setInterval ID and startTime don't affect the display directly
//   - Changing them shouldn't re-render the component
//   - Refs are the right tool: mutable, stable across renders, no re-renders
//
// CHECK YOURSELF:
//   • Why do we use useRef for intervalId instead of useState?
//   • What would break if you used useState<number>(0) for the interval ID?
//   • Hover over intervalRef.current — it's `number`, not `number | null`. Why?
// ─────────────────────────────────────────────────────────────

function Exercise2() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  // ✅ Mutable instance variable — NOT state, no re-render on change
  const intervalRef = useRef<number>(0);    // stores the setInterval return value
  const startRef    = useRef<number>(0);    // stores Date.now() at start
  const lapRef      = useRef<number>(0);    // accumulated time before pauses

  const start = () => {
    startRef.current = Date.now();
    // current is `number` — no null check needed
    intervalRef.current = window.setInterval(() => {
      setElapsed(lapRef.current + (Date.now() - startRef.current));
    }, 50);
    setRunning(true);
  };

  const stop = () => {
    clearInterval(intervalRef.current); // no null check — it's always a number
    lapRef.current = elapsed;
    setRunning(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = 0;
    lapRef.current = 0;
    setElapsed(0);
    setRunning(false);
  };

  const fmt = (ms: number) => {
    const s  = Math.floor(ms / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${s}.${String(cs).padStart(2, '0')}`;
  };

  return (
    <div style={card}>
      <p style={hint}>
        <code style={mono}>intervalRef</code> and <code style={mono}>startRef</code> use{' '}
        <code style={mono}>useRef&lt;number&gt;(0)</code> — current is always a number,
        never null. No null checks when reading or writing.
      </p>

      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 48, fontFamily: 'monospace', letterSpacing: 2 }}>
          {fmt(elapsed)}s
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {!running
          ? <button onClick={start} style={{ padding: '6px 20px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer' }}>Start</button>
          : <button onClick={stop}  style={{ padding: '6px 20px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer' }}>Stop</button>
        }
        <button onClick={reset} style={{ padding: '6px 20px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Reset</button>
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 10, marginBottom: 0 }}>
        Stopwatch uses 3 refs, 2 state values. The refs don't cause re-renders
        when updated — only <code style={mono}>elapsed</code> (state) does.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Callback ref for dynamic measurement
//
// A callback ref fires whenever the DOM node is attached OR detached.
// This is the right tool when you need to react to when an element appears.
//
// The callback signature: (node: T | null) => void
//   • node is the element when mounting
//   • node is null when unmounting
//
// When useRef is NOT enough:
//   - useRef doesn't notify you when .current changes
//   - A useEffect with ref in the deps array doesn't work — refs aren't reactive
//   - Callback refs ARE reactive to attachment/detachment
//
// CHECK YOURSELF:
//   • Why can't you measure element dimensions with useRef in a useEffect?
//     (Hint: the effect runs once — what if the element conditionally renders?)
//   • What is the parameter type for a callback ref on a <div>?
//   • When does the callback receive `null` instead of the DOM element?
// ─────────────────────────────────────────────────────────────

// A component that measures its own height using a callback ref
function ResizableTextArea() {
  const [text, setText] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // ✅ Callback ref — fires on mount (node = element) and unmount (node = null)
  const measuredRef = useCallback((node: HTMLTextAreaElement | null) => {
    if (node !== null) {
      // Element just mounted — measure it
      const { width, height } = node.getBoundingClientRect();
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    } else {
      // Element just unmounted
      setDimensions(null);
    }
  }, []); // stable callback — no deps needed, won't re-run on every render

  return (
    <div>
      <textarea
        ref={measuredRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Resize me (drag the corner) or type to expand…"
        style={{ width: '100%', minHeight: 80, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', resize: 'both', boxSizing: 'border-box' }}
      />
      {dimensions && (
        <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
          Measured on mount: {dimensions.width} × {dimensions.height}px
        </p>
      )}
    </div>
  );
}

// A component that toggles its visibility — shows callback ref receiving null on unmount
function TogglableBox() {
  const [visible, setVisible] = useState(true);
  const [log, setLog] = useState<string[]>([]);

  const trackRef = useCallback((node: HTMLDivElement | null) => {
    const ts = new Date().toLocaleTimeString();
    if (node !== null) {
      setLog(prev => [...prev, `${ts} — mounted (node = <div>)`]);
    } else {
      setLog(prev => [...prev, `${ts} — unmounted (node = null)`]);
    }
  }, []);

  return (
    <div>
      <button
        onClick={() => setVisible(v => !v)}
        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', marginBottom: 8 }}
      >
        {visible ? 'Hide box' : 'Show box'}
      </button>

      {visible && (
        <div ref={trackRef} style={{ ...card, borderColor: '#818cf8', marginBottom: 8 }}>
          I report when I mount/unmount via callback ref
        </div>
      )}

      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>
        {log.slice(-4).map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Callback refs receive the node on mount and <code style={mono}>null</code> on unmount.
        Toggle the box and watch the log — a plain <code style={mono}>useRef</code> would
        never notify you of these lifecycle events.
      </p>
      <div style={{ ...card, marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>Measure on mount</strong>
        <div style={{ marginTop: 8 }}>
          <ResizableTextArea />
        </div>
      </div>
      <div style={card}>
        <strong style={{ fontSize: 13 }}>Track mount / unmount lifecycle</strong>
        <div style={{ marginTop: 8 }}>
          <TogglableBox />
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Typing Refs
      </h1>

      <h2>Exercise 1 — DOM ref: focus & scroll</h2>
      <Exercise1 />

      <h2>Exercise 2 — Mutable instance variable: stopwatch</h2>
      <Exercise2 />

      <h2>Exercise 3 — Callback ref: measure on mount</h2>
      <Exercise3 />
    </div>
  );
}
