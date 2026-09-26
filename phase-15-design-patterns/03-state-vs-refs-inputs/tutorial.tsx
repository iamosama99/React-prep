// ============================================================
// Topic:   State vs Refs, Controlled vs Uncontrolled
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — refs beyond the DOM: usePrevious + useLatest
//   Exercise 2 — one signup form, three ownership models
//   Exercise 3 — useControllableState: a dual-mode component
//
// Run: npm run tutorial state-vs-refs
// ============================================================

import { useState, useEffect, useRef, useCallback, FC, FormEvent } from 'react';

// ─── Exercise 1: Refs Beyond the DOM ─────────────────────────
//
// SITUATION
//   Two things a function component can't do with state alone:
//     (a) remember the PREVIOUS value of something
//     (b) let a long-lived callback (setInterval) read the LATEST value
//         without tearing down and re-creating the interval
//
// BUILD
//   1. usePrevious<T>(value): T | undefined
//        Store the value in a ref in an effect (so during render the ref
//        still holds the value from the previous render).
//   2. useLatest<T>(value): MutableRefObject<T>
//        One ref object for the component's lifetime; update .current
//        after every render.
//
// OBSERVE
//   Both intervals below are created ONCE (deps = []).
//     - "stale" reads `count` from its closure  → stuck at 0. That's the bug.
//     - "latest" reads latest.current           → follows the count.
//   With the stubs, BOTH are stale. After your implementation, only the left is.

function usePrevious<T>(value: T): T | undefined {
  // TODO: const ref = useRef<T>(); useEffect(() => { ref.current = value; }); return ref.current;
  void value;
  return undefined;
}

function useLatest<T>(value: T): { current: T } {
  // TODO: create a ref once, and assign ref.current = value in an effect
  //       (the stub returns a NEW object each render, so old closures keep old values)
  return { current: value };
}

function Exercise1() {
  const [count, setCount] = useState(0);
  const prev = usePrevious(count);
  const latest = useLatest(count);
  const [staleLog, setStaleLog] = useState<string[]>([]);
  const [latestLog, setLatestLog] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setStaleLog(l => [`sees count=${count}`, ...l].slice(0, 4)); // closes over the FIRST render's count
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setLatestLog(l => [`sees count=${latest.current}`, ...l].slice(0, 4));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section>
      <h2>Exercise 1 — usePrevious &amp; useLatest</h2>
      <button onClick={() => setCount(c => c + 1)}>count: {count}</button>{' '}
      <span style={muted}>previous render's count: <strong>{String(prev)}</strong></span>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <div style={{ ...card, flex: 1 }}>
          <strong>Interval reading the closure</strong>
          {staleLog.map((l, i) => <div key={i} style={muted}>{l}</div>)}
        </div>
        <div style={{ ...card, flex: 1 }}>
          <strong>Interval reading useLatest</strong>
          {latestLog.map((l, i) => <div key={i} style={muted}>{l}</div>)}
        </div>
      </div>
    </section>
  );
}

// ─── Exercise 2: Three Ownership Models ──────────────────────
//
// SITUATION
//   The same signup form, three ways. Each shows a render counter so
//   you can SEE the cost of who owns the value.
//     A. Controlled      (given — the baseline)
//     B. Uncontrolled    (YOU: FormData on submit + form.reset())
//     C. Hybrid          (YOU: uncontrolled inputs, but the password field
//                          reports strength into state via onInput)
//
// SUCCESS CRITERIA
//   B: typing in any field does NOT increase the render count. Submit shows
//      the collected values, then clears the form via reset().
//   C: typing in email doesn't re-render; typing in password re-renders only
//      to update the strength label.

function strength(pw: string): 'empty' | 'weak' | 'ok' | 'strong' {
  if (!pw) return 'empty';
  if (pw.length < 6) return 'weak';
  return /\d/.test(pw) && /[A-Z]/.test(pw) && pw.length >= 10 ? 'strong' : 'ok';
}

const FormShell: FC<{ title: string; renders: number; children: React.ReactNode; result: string | null }> = ({
  title, renders, children, result,
}) => (
  <div style={{ ...card, flex: 1, minWidth: 220 }}>
    <strong>{title}</strong> <span style={muted}>· renders: {renders}</span>
    {children}
    {result && <pre style={{ ...muted, whiteSpace: 'pre-wrap' }}>{result}</pre>}
  </div>
);

const ControlledSignup: FC = () => {
  const renders = useRef(0);
  renders.current++;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);
  return (
    <FormShell title="A. Controlled" renders={renders.current} result={result}>
      <form
        onSubmit={e => { e.preventDefault(); setResult(JSON.stringify({ email, password })); setEmail(''); setPassword(''); }}
        style={col}
      >
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        <span style={muted}>strength: {strength(password)}</span>
        <button>Sign up</button>
      </form>
    </FormShell>
  );
};

const UncontrolledSignup: FC = () => {
  const renders = useRef(0);
  renders.current++;
  const [result, setResult] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO 1: const data = Object.fromEntries(new FormData(e.currentTarget));
    //         setResult(JSON.stringify(data));
    //         e.currentTarget.reset();
    void setResult;
  }

  return (
    <FormShell title="B. Uncontrolled" renders={renders.current} result={result}>
      <form onSubmit={onSubmit} style={col}>
        {/* names are how FormData finds the fields; defaultValue (NOT value) */}
        <input name="email" defaultValue="" placeholder="email" />
        <input name="password" defaultValue="" placeholder="password" type="password" />
        <button>Sign up</button>
      </form>
    </FormShell>
  );
};

const HybridSignup: FC = () => {
  const renders = useRef(0);
  renders.current++;
  const [pwStrength, setPwStrength] = useState<ReturnType<typeof strength>>('empty');
  const [result, setResult] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO 2a: same FormData collection as B, then reset() and setPwStrength('empty')
    void setResult;
  }

  return (
    <FormShell title="C. Hybrid" renders={renders.current} result={result}>
      <form onSubmit={onSubmit} style={col}>
        <input name="email" defaultValue="" placeholder="email" />
        <input
          name="password"
          defaultValue=""
          type="password"
          placeholder="password"
          // TODO 2b: onInput={e => setPwStrength(strength(e.currentTarget.value))}
        />
        <span style={muted}>strength: {pwStrength}</span>
        <button>Sign up</button>
      </form>
    </FormShell>
  );
};

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Who Owns the Value?</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <ControlledSignup />
        <UncontrolledSignup />
        <HybridSignup />
      </div>
    </section>
  );
}

// ─── Exercise 3: useControllableState ────────────────────────
//
// SITUATION
//   <Switch> should work in both styles:
//     <Switch defaultValue />                          uncontrolled
//     <Switch value={on} onChange={setOn} />           controlled
//   You'll build the shared hook.
//
// BUILD
//   useControllableState<T>({ value, defaultValue, onChange }): [T, (v: T) => void]
//     - isControlled = value !== undefined
//     - internal state seeded from defaultValue
//     - setter: update internal state ONLY when uncontrolled;
//               ALWAYS call onChange
//     - dev warning: if isControlled flips between renders, console.warn
//       (track the initial mode in a ref)
//
// TEST
//   The "external" buttons drive the controlled switch. The uncontrolled
//   one ignores them. The last panel deliberately flips modes — you should
//   see a console warning.

function useControllableState<T>(opts: {
  value?: T;
  defaultValue: T;
  onChange?: (v: T) => void;
}): [T, (v: T) => void] {
  const { value, defaultValue, onChange } = opts;
  const [internal, setInternal] = useState(defaultValue);
  // TODO: compute isControlled, the current value, and a stable setter (useCallback)
  // TODO: warn in dev when isControlled changes after first render
  void internal; void setInternal; void value; void onChange; void useCallback;
  return [defaultValue, () => {}];
}

const Switch: FC<{ value?: boolean; defaultValue?: boolean; onChange?: (v: boolean) => void; label: string }> = ({
  value, defaultValue = false, onChange, label,
}) => {
  const [on, setOn] = useControllableState<boolean>({ value, defaultValue, onChange });
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      style={{
        padding: '6px 14px', borderRadius: 999, border: '1px solid #94a3b8',
        background: on ? '#22c55e' : '#e2e8f0', color: on ? '#fff' : '#334155',
      }}
    >
      {label}: {on ? 'ON' : 'OFF'}
    </button>
  );
};

function Exercise3() {
  const [on, setOn] = useState(false);
  const [flip, setFlip] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  return (
    <section>
      <h2>Exercise 3 — Dual-Mode Component</h2>
      <div style={card}>
        <strong>Controlled</strong> <span style={muted}>(parent state: {String(on)})</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Switch label="Controlled" value={on} onChange={v => { setOn(v); setLog(l => [`onChange(${v})`, ...l].slice(0, 4)); }} />
          <button onClick={() => setOn(true)}>external ON</button>
          <button onClick={() => setOn(false)}>external OFF</button>
        </div>
        {log.map((l, i) => <div key={i} style={muted}>{l}</div>)}
      </div>
      <div style={card}>
        <strong>Uncontrolled</strong>
        <div style={{ marginTop: 8 }}><Switch label="Uncontrolled" defaultValue={true} /></div>
      </div>
      <div style={card}>
        <strong>Mode flip (bug — check the console)</strong>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <Switch label="Flipper" value={flip ? true : undefined} />
          <button onClick={() => setFlip(f => !f)}>toggle `value` prop between undefined ↔ true</button>
        </div>
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add a character counter to the uncontrolled textarea using a ref + debounced state.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 } as const;
const col = { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 03 — State vs Refs, Controlled vs Uncontrolled</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
