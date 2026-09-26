// ============================================================
// Topic:   Custom Hook Pattern
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — useLocalStorage: lazy init, try/catch, cross-tab sync
//   Exercise 2 — useClipboard: ref-based timer, cleanup, stable callback
//   Exercise 3 — useToggle: stable handlers, and "hooks share logic, not state"
//
// Run: npm run tutorial custom-hook-pattern
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo, memo, FC } from 'react';

// ─── Exercise 1: useLocalStorage ─────────────────────────────
//
// SITUATION
//   Persist a piece of state across reloads, without crashing when
//   storage is unavailable or the stored JSON is corrupt.
//
// BUILD  useLocalStorage<T>(key, initial): readonly [T, Dispatch<SetStateAction<T>>]
//   1. Lazy initial state: read + JSON.parse in try/catch; fall back to `initial`.
//      (Guard with `typeof window === 'undefined'` — SSR-safe.)
//   2. Effect: write JSON.stringify(value) on change (try/catch).
//   3. Effect: listen to window 'storage' events; when e.key === key and
//      e.newValue is non-null, update state (try/catch JSON.parse).
//      Clean up the listener.
//   4. BONUS: two instances in the SAME tab don't sync (the storage event fires
//      only in OTHER tabs). Fix with a custom window event dispatched on write.
//
// TEST
//   - Change the theme, reload the page: it persists.
//   - "Corrupt storage" writes invalid JSON then remounts — no crash, falls back.
//   - Open the page in a second tab and change the theme there: this tab follows (step 3).

const LS_KEY = 'p15-07-theme';

function useLocalStorage<T>(key: string, initial: T) {
  // TODO: replace this in-memory stub with the real implementation
  const [value, setValue] = useState<T>(initial);
  void key; void useEffect;
  return [value, setValue] as const;
}

const ThemePicker: FC = () => {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(LS_KEY, 'light');
  return (
    <div style={{ ...card, background: theme === 'dark' ? '#0f172a' : '#f8fafc', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }}>
      <strong>ThemePicker</strong> — theme: {theme}{' '}
      <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>toggle</button>
    </div>
  );
};

const ThemeBadge: FC = () => {
  const [theme] = useLocalStorage<'light' | 'dark'>(LS_KEY, 'light');
  return <div style={card}>ThemeBadge (separate hook instance) sees: <strong>{theme}</strong></div>;
};

function Exercise1() {
  const [mountKey, setMountKey] = useState(0);
  return (
    <section>
      <h2>Exercise 1 — useLocalStorage</h2>
      <button
        onClick={() => { window.localStorage.setItem(LS_KEY, '{not json'); setMountKey(k => k + 1); }}
      >
        Corrupt storage + remount
      </button>{' '}
      <button onClick={() => { window.localStorage.removeItem(LS_KEY); setMountKey(k => k + 1); }}>
        Clear storage + remount
      </button>
      <ThemePicker key={`a${mountKey}`} />
      <ThemeBadge key={`b${mountKey}`} />
      <p style={muted}>
        Two hook instances, same key: the badge is a separate copy of the hook — it only follows
        the picker after a reload (or after you do the BONUS in step 4).
      </p>
    </section>
  );
}

// ─── Exercise 2: useClipboard ────────────────────────────────
//
// SITUATION
//   A "Copy" button that says "Copied!" for a moment.
//
// BUILD  useClipboard(resetMs = 1500): { copy(text): Promise<boolean>, copied: boolean }
//   - copy: await navigator.clipboard.writeText(text); on success setCopied(true),
//     clear any previous timer, start a new timer that sets copied back to false.
//     On failure (no permission / insecure context) → setCopied(false), return false.
//   - The timer id lives in a REF (not state).
//   - Unmount cleanup clears the timer.
//   - `copy` must be stable (useCallback) — the Memo'd button below counts renders.

function useClipboard(resetMs = 1500) {
  const [copied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  // TODO 1: copy = useCallback(async (text: string) => { … }, [resetMs])
  // TODO 2: useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async (text: string): Promise<boolean> => { void text; void resetMs; void useCallback; return false; };
  void timer;
  return { copy, copied } as const;
}

const CopyButton = memo(function CopyButton({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  const renders = useRef(0);
  renders.current++;
  return (
    <button onClick={onCopy}>
      {copied ? '✓ Copied!' : 'Copy'} <span style={muted}>(renders: {renders.current})</span>
    </button>
  );
});

function Exercise2() {
  const { copy, copied } = useClipboard(1500);
  const [n, setN] = useState(0);
  const snippet = 'npm run tutorial custom-hook-pattern';
  const onCopy = useCallback(() => { void copy(snippet); }, [copy]);
  return (
    <section>
      <h2>Exercise 2 — useClipboard</h2>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 10, borderRadius: 6 }}>{snippet}</pre>
      <CopyButton onCopy={onCopy} copied={copied} />{' '}
      <button onClick={() => setN(x => x + 1)}>Unrelated re-render ({n})</button>
      <p style={muted}>
        After step 1, the CopyButton's render count should only rise when `copied` flips —
        NOT when you click "Unrelated re-render" (needs a stable `copy`).
      </p>
    </section>
  );
}

// ─── Exercise 3: useToggle — Stable Handlers, Isolated State ──
//
// SITUATION
//   A tiny hook with a real API decision: what does it return?
//
// BUILD  useToggle(initial = false): readonly [boolean, Handlers]
//   Handlers = { toggle, set(v), setTrue, setFalse } — ALL stable across renders,
//   and the handlers OBJECT itself should be stable too (useMemo).
//
// OBSERVE
//   1. The memo'd <ToggleButton> counts renders; with unstable handlers it
//      re-renders on every unrelated parent render.
//   2. Two panels each call useToggle(). Opening one must NOT open the other —
//      hooks share logic, not state.

type Handlers = { toggle: () => void; set: (v: boolean) => void; setTrue: () => void; setFalse: () => void };

function useToggle(initial = false): readonly [boolean, Handlers] {
  // TODO: const [on, setOn] = useState(initial);
  //       const handlers = useMemo(() => ({ toggle: () => setOn(v => !v), set: setOn,
  //                                         setTrue: () => setOn(true), setFalse: () => setOn(false) }), []);
  //       return [on, handlers] as const;
  const handlers: Handlers = { toggle: () => {}, set: () => {}, setTrue: () => {}, setFalse: () => {} };
  return [initial, handlers] as const;
}

const ToggleButton = memo(function ToggleButton({ onClick, label }: { onClick: () => void; label: string }) {
  const renders = useRef(0);
  renders.current++;
  return <button onClick={onClick}>{label} <span style={muted}>(renders: {renders.current})</span></button>;
});

const Panel: FC<{ name: string }> = ({ name }) => {
  const [open, { toggle }] = useToggle(false);
  return (
    <div style={card}>
      <ToggleButton onClick={toggle} label={`${name}: ${open ? 'open' : 'closed'}`} />
    </div>
  );
};

function Exercise3() {
  const [n, setN] = useState(0);
  return (
    <section>
      <h2>Exercise 3 — useToggle</h2>
      <button onClick={() => setN(x => x + 1)}>Unrelated parent re-render ({n})</button>
      <Panel name="Panel A" />
      <Panel name="Panel B" />
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: compose useDebounce + a fake search into useSearch(query).

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 07 — Custom Hook Pattern</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
