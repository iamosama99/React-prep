// ============================================================
// Topic:   ESLint + Prettier
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: LIVE DEMO + VIOLATION FINDER + CLASSIFIER + DEBUGGER
//
// ESLint and Prettier run at dev/CI time, not in the browser.
// But you CAN:
//   1. Build a live demo of stale closure bugs (exhaustive-deps)
//   2. Identify rules-of-hooks violations in real code snippets
//   3. Classify which tool owns each concern
//   4. Spot and fix broken ESLint config setups
//
// Run: npm run tutorial 03-eslint-prettier
// ============================================================

import { useState, useEffect, useRef, useCallback, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Stale Closure Detective (exhaustive-deps live demo)
//
// A counter component with a useEffect that logs the count.
// Toggle between "Missing dep" and "Correct dep" to see
// the actual behavioural difference.
//
// The stale closure bug is visceral: you increment, you click
// "log it" and the wrong value appears.
// ─────────────────────────────────────────────────────────────

function BuggyCounter() {
  const [count, setCount] = useState(0);
  const [logOutput, setLogOutput] = useState<string[]>([]);

  // This callback captures `count` at mount time (0) and never updates.
  // The ESLint error: react-hooks/exhaustive-deps — 'count' is missing.
  const logCount = useCallback(() => {
    setLogOutput(prev => [...prev, `Logged count: ${count} (actual state: seen externally)`]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // count intentionally missing for the demo

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }}
        >+1</button>
        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Count: {count}</span>
        <button
          onClick={logCount}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #e53935', cursor: 'pointer', background: '#e53935', color: '#fff' }}
        >Log count (buggy)</button>
      </div>
      {logOutput.length > 0 && (
        <div style={{ background: '#1e1e1e', padding: '0.75rem 1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#f44336' }}>
          {logOutput.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      <div style={{ background: '#fff3e0', padding: '0.5rem 0.75rem', borderRadius: '5px', fontSize: '0.82rem', color: '#e65100', borderLeft: '3px solid #f57c00' }}>
        <strong>ESLint error:</strong> React Hook useCallback received a function whose dependencies are unknown.
        Pass an inline function instead. <code>react-hooks/exhaustive-deps</code>
        — 'count' is missing from deps.
      </div>
    </div>
  );
}

function FixedCounter() {
  const [count, setCount] = useState(0);
  const [logOutput, setLogOutput] = useState<string[]>([]);

  // count is in the dep array — the callback re-creates whenever count changes.
  // Now logCount always closes over the current count value.
  const logCount = useCallback(() => {
    setLogOutput(prev => [...prev, `Logged count: ${count} (correct!)`]);
  }, [count]); // count listed — no stale closure

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', background: '#fff' }}
        >+1</button>
        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Count: {count}</span>
        <button
          onClick={logCount}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '1px solid #27ae60', cursor: 'pointer', background: '#27ae60', color: '#fff' }}
        >Log count (correct)</button>
      </div>
      {logOutput.length > 0 && (
        <div style={{ background: '#1e1e1e', padding: '0.75rem 1rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#4caf50' }}>
          {logOutput.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      <div style={{ background: '#e8f5e9', padding: '0.5rem 0.75rem', borderRadius: '5px', fontSize: '0.82rem', color: '#1b5e20', borderLeft: '3px solid #2e7d32' }}>
        <strong>ESLint: no error.</strong> <code>count</code> is in the dependency array — callback always sees the current value.
      </div>
    </div>
  );
}

// The useEffect version for the interval demo
function IntervalDemo() {
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState<'buggy' | 'fixed'>('buggy');
  const [intervalLogs, setIntervalLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    setIntervalLogs([]);

    if (mode === 'buggy') {
      // Stale closure: count is 0 forever inside this interval
      const id = setInterval(() => {
        setIntervalLogs(prev => [
          ...prev.slice(-4),
          `Interval sees count: 0 (stale!) — actual count: [increments don't show here]`,
        ]);
      }, 1000);
      return () => clearInterval(id);
    } else {
      // Correct: useEffect re-runs whenever count changes, clearing old interval
      const id = setInterval(() => {
        setIntervalLogs(prev => [...prev.slice(-4), `Interval sees count: ${count} (correct!)`]);
      }, 1000);
      return () => clearInterval(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, ...(mode === 'fixed' ? [count] : [])]);

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
      <strong style={{ display: 'block', marginBottom: '0.75rem' }}>setInterval + stale closure demo</strong>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={() => setMode('buggy')}
          style={{ padding: '0.35rem 0.9rem', borderRadius: '5px', border: '2px solid', borderColor: mode === 'buggy' ? '#e53935' : '#ddd', background: mode === 'buggy' ? '#e53935' : '#fff', color: mode === 'buggy' ? '#fff' : '#333', cursor: 'pointer', fontSize: '0.85rem' }}
        >Buggy ([] deps)</button>
        <button
          onClick={() => setMode('fixed')}
          style={{ padding: '0.35rem 0.9rem', borderRadius: '5px', border: '2px solid', borderColor: mode === 'fixed' ? '#27ae60' : '#ddd', background: mode === 'fixed' ? '#27ae60' : '#fff', color: mode === 'fixed' ? '#fff' : '#333', cursor: 'pointer', fontSize: '0.85rem' }}
        >Fixed ([count] deps)</button>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ padding: '0.35rem 0.9rem', borderRadius: '5px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
        >+1 ({count})</button>
        <button
          onClick={() => setRunning(r => !r)}
          style={{ padding: '0.35rem 0.9rem', borderRadius: '5px', border: '1px solid #1a73e8', background: running ? '#e53935' : '#1a73e8', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
        >{running ? 'Stop' : 'Start interval'}</button>
      </div>
      {intervalLogs.length > 0 && (
        <div style={{ background: '#1e1e1e', padding: '0.6rem 1rem', borderRadius: '5px', fontFamily: 'monospace', fontSize: '0.8rem', color: mode === 'buggy' ? '#f44336' : '#4caf50' }}>
          {intervalLogs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
      <p style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>
        {mode === 'buggy'
          ? 'Buggy: interval captures count=0 at setup. Incrementing count has no effect inside the interval.'
          : 'Fixed: interval re-creates when count changes. It always sees the current count.'}
      </p>
    </div>
  );
}

function Exercise1_StaleClosureDetective() {
  const [showFix, setShowFix] = useState(false);

  return (
    <section>
      <h2>Exercise 1: Stale Closure Detective (exhaustive-deps)</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The <code>exhaustive-deps</code> ESLint rule prevents stale closure bugs —
        where a callback or effect captures an old value and never sees updates.
        Click "+1" several times, then click "Log count" to see the difference.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — before clicking anything:</strong> What value do you think "Log count (buggy)"
        will print after you click +1 three times? Why?
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e53935', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Buggy (missing dep)
          </div>
          <BuggyCounter />
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#27ae60', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fixed (correct dep)
          </div>
          <FixedCounter />
        </div>
      </div>

      {/* Code diff */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '4px' }}>Buggy code</div>
          <pre style={{ background: '#1e1e1e', color: '#f44336', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.78rem', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{`const logCount = useCallback(() => {
  console.log(count);
}, []); // ❌ count missing from deps
// ESLint: react-hooks/exhaustive-deps`}</pre>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '4px' }}>Fixed code</div>
          <pre style={{ background: '#1e1e1e', color: '#4caf50', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.78rem', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{`const logCount = useCallback(() => {
  console.log(count);
}, [count]); // ✅ count in deps
// ESLint: no error`}</pre>
        </div>
      </div>

      <IntervalDemo />

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is a stale closure? Explain it in one sentence without using the word "closure".</li>
          <li>The fix adds <code>count</code> to the dep array. What does React do when <code>count</code> changes?</li>
          <li>When is it acceptable to use <code>// eslint-disable-next-line react-hooks/exhaustive-deps</code>?</li>
          <li>Could you fix the interval bug with a ref instead of adding to deps? What would that look like?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Rules of Hooks Violation Finder
//
// Six code snippets. Each either violates rules-of-hooks or is OK.
// Classify each, then reveal which rule fired and the fix.
// ─────────────────────────────────────────────────────────────

type HookVerdict = 'VIOLATION' | 'OK';

interface HookSnippet {
  id: number;
  title: string;
  code: string;
  verdict: HookVerdict;
  rule?: string;
  explanation: string;
  fix?: string;
}

const HOOK_SNIPPETS: HookSnippet[] = [
  {
    id: 1,
    title: 'Hook inside an if statement',
    code: `function Toggle({ show }: { show: boolean }) {
  if (show) {
    const [value, setValue] = useState('');
    // use value...
  }
  return <div />;
}`,
    verdict: 'VIOLATION',
    rule: 'react-hooks/rules-of-hooks',
    explanation: 'Hooks must be called at the top level — not inside conditionals. React tracks hooks by call order. If "show" is false on one render and true on the next, the hook call order changes, causing "Rendered more hooks than previous render" crash.',
    fix: 'Move useState to the top level. Use the value conditionally: const [value, setValue] = useState(""); return show ? <input value={value} ... /> : <div />;',
  },
  {
    id: 2,
    title: 'Conditional logic AFTER the hook call',
    code: `function Profile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  if (!user) return <Skeleton />;
  return <div>{user.name}</div>;
}`,
    verdict: 'OK',
    explanation: 'The hooks are at the top level and always called. Early returns AFTER the hooks are fine — the hooks have already been called in the correct order. This is the standard "loading state" pattern.',
  },
  {
    id: 3,
    title: 'Hook inside a nested function',
    code: `function SearchBar() {
  const handleSearch = (query: string) => {
    const [results, setResults] = useState([]);
    // try to use state inside event handler
    setResults([query]);
  };
  return <input onChange={e => handleSearch(e.target.value)} />;
}`,
    verdict: 'VIOLATION',
    rule: 'react-hooks/rules-of-hooks',
    explanation: 'Hooks can only be called directly from a React function component or a custom hook — not from nested functions, event handlers, or callbacks. useState inside handleSearch is called on every keystroke, not at render time.',
    fix: 'Move useState to the top of SearchBar. handleSearch then updates state via setResults which it closes over.',
  },
  {
    id: 4,
    title: 'Hook in a class component method',
    code: `class UserCard extends React.Component {
  fetchData() {
    const [data, setData] = useState(null); // inside class method
    return data;
  }
  render() {
    return <div>{this.fetchData()}</div>;
  }
}`,
    verdict: 'VIOLATION',
    rule: 'react-hooks/rules-of-hooks',
    explanation: 'Hooks can only be called from function components and custom hooks. Class components do not support hooks at all — React\'s hook system is tied to the fiber reconciler\'s function component mechanism.',
    fix: 'Convert UserCard to a function component, or use a render prop/HOC pattern to inject hook-based data into a class component.',
  },
  {
    id: 5,
    title: 'Hook inside a loop',
    code: `function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, i) => {
        const [selected, setSelected] = useState(false);
        return (
          <li key={i} onClick={() => setSelected(!selected)}>
            {item} {selected ? '✓' : ''}
          </li>
        );
      })}
    </ul>
  );
}`,
    verdict: 'VIOLATION',
    rule: 'react-hooks/rules-of-hooks',
    explanation: 'Hooks inside loops violate the rules because the number of hook calls must be the same on every render. If items.length changes, the hook call count changes — React cannot maintain stable state for each item.',
    fix: 'Extract each list item into its own component (e.g., <ListItem item={item} />) and put useState inside that component.',
  },
  {
    id: 6,
    title: 'Custom hook with internal hooks',
    code: `function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return width;
}

function Header() {
  const width = useWindowWidth();
  return <div>Width: {width}</div>;
}`,
    verdict: 'OK',
    explanation: 'Custom hooks (functions starting with "use") can call other hooks — that\'s their purpose. React treats useWindowWidth as a hook and tracks its internal hooks as part of the component\'s hook chain. This is the correct abstraction pattern.',
  },
];

type HookGuessState = Record<number, { guess: HookVerdict | null; revealed: boolean }>;

function Exercise2_RulesOfHooksViolationFinder() {
  const [states, setStates] = useState<HookGuessState>(() =>
    Object.fromEntries(HOOK_SNIPPETS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const score = HOOK_SNIPPETS.filter(s => states[s.id].revealed && states[s.id].guess === s.verdict).length;
  const revealed = HOOK_SNIPPETS.filter(s => states[s.id].revealed).length;

  return (
    <section>
      <h2>Exercise 2: Rules of Hooks Violation Finder</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Six code snippets. For each: is this a rules-of-hooks violation or valid React?
        Think about WHY the rules exist — it'll make the answer obvious.
      </p>
      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> answered so far
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {HOOK_SNIPPETS.map(snippet => {
          const state = states[snippet.id];
          const isCorrect = state.guess === snippet.verdict;
          return (
            <div key={snippet.id} style={{
              border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden',
              background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
              transition: 'background 0.3s',
            }}>
              <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>#{snippet.id} — {snippet.title}</strong>
                {state.revealed && (
                  <span style={{
                    padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                    background: snippet.verdict === 'VIOLATION' ? '#e53935' : '#27ae60', color: '#fff',
                  }}>{snippet.verdict}</span>
                )}
              </div>

              <div style={{ padding: '1rem 1.25rem' }}>
                <pre style={{
                  background: '#1e1e1e', color: '#d4d4d4', padding: '0.75rem 1rem', borderRadius: '6px',
                  fontSize: '0.78rem', margin: '0 0 0.75rem', lineHeight: 1.7,
                  overflowX: 'auto', whiteSpace: 'pre-wrap',
                }}>{snippet.code}</pre>

                {!state.revealed && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {(['VIOLATION', 'OK'] as HookVerdict[]).map(v => (
                      <button
                        key={v}
                        onClick={() => setStates(prev => ({ ...prev, [snippet.id]: { ...prev[snippet.id], guess: v } }))}
                        style={{
                          padding: '0.4rem 1.2rem', borderRadius: '6px', border: '2px solid',
                          borderColor: state.guess === v ? (v === 'VIOLATION' ? '#e53935' : '#27ae60') : '#ddd',
                          background: state.guess === v ? (v === 'VIOLATION' ? '#e53935' : '#27ae60') : '#fff',
                          color: state.guess === v ? '#fff' : '#333',
                          cursor: 'pointer', fontWeight: state.guess === v ? 700 : 400,
                          transition: 'all 0.15s', fontSize: '0.9rem',
                        }}
                      >{v}</button>
                    ))}
                    {state.guess && (
                      <button
                        onClick={() => setStates(prev => ({ ...prev, [snippet.id]: { ...prev[snippet.id], revealed: true } }))}
                        style={{ padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
                      >Reveal →</button>
                    )}
                  </div>
                )}

                {state.revealed && (
                  <div>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem' }}>
                      {isCorrect ? '✓ Correct' : `✗ Incorrect — answer is ${snippet.verdict}`}
                    </p>
                    {snippet.rule && (
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: '#777', fontFamily: 'monospace' }}>
                        ESLint rule: {snippet.rule}
                      </p>
                    )}
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.65 }}>
                      {snippet.explanation}
                    </p>
                    {snippet.fix && (
                      <p style={{ margin: 0, fontSize: '0.83rem', color: '#1b5e20', fontStyle: 'italic' }}>
                        Fix: {snippet.fix}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>WHY must hooks always be called in the same order? What does React use hook call order for?</li>
          <li>Custom hooks start with "use" — what does that naming convention actually do (practically)?</li>
          <li>If you need per-item state in a list, what is the correct pattern?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — ESLint vs Prettier Responsibility Classifier
//
// Twelve concerns. Click to assign each to ESLint, Prettier,
// or "Neither — this is a bundler/runtime concern".
// ─────────────────────────────────────────────────────────────

type LintTool = 'ESLint' | 'Prettier' | 'Neither (bundler/runtime)';

interface LintConcern {
  id: number;
  description: string;
  answer: LintTool;
  explanation: string;
}

const LINT_CONCERNS: LintConcern[] = [
  {
    id: 1,
    description: 'Enforce maximum line length (e.g. max 100 chars)',
    answer: 'Prettier',
    explanation: 'printWidth in .prettierrc. Prettier owns all formatting including line length. ESLint has a max-len rule but it MUST be disabled by eslint-config-prettier to avoid conflicts.',
  },
  {
    id: 2,
    description: 'Flag variables that are declared but never used',
    answer: 'ESLint',
    explanation: 'no-unused-vars (or @typescript-eslint/no-unused-vars for TS). This is a code quality concern, not formatting. Prettier has no concept of "is this variable used?".',
  },
  {
    id: 3,
    description: 'Enforce 2-space indentation',
    answer: 'Prettier',
    explanation: 'tabWidth: 2 in .prettierrc. Prettier owns indentation. ESLint\'s indent rule is disabled by eslint-config-prettier because they conflict — Prettier wins.',
  },
  {
    id: 4,
    description: 'Catch a missing dependency in a useEffect callback',
    answer: 'ESLint',
    explanation: 'react-hooks/exhaustive-deps from eslint-plugin-react-hooks. This requires understanding React semantics — which variables are reactive, which are refs, etc. Prettier formats code without understanding it.',
  },
  {
    id: 5,
    description: 'Add or remove trailing semicolons',
    answer: 'Prettier',
    explanation: 'semi: true/false in .prettierrc. Prettier enforces consistent semicolon style by reprinting the code. ESLint has a semi rule but eslint-config-prettier disables it.',
  },
  {
    id: 6,
    description: 'Prevent calling a hook inside an if statement',
    answer: 'ESLint',
    explanation: 'react-hooks/rules-of-hooks from eslint-plugin-react-hooks. This requires static analysis of control flow — understanding that a useState call inside an if-block violates the rules.',
  },
  {
    id: 7,
    description: 'Enforce trailing commas in function arguments',
    answer: 'Prettier',
    explanation: 'trailingComma: "all" in .prettierrc. Prettier controls trailing comma style. ESLint\'s comma-dangle rule is disabled by eslint-config-prettier.',
  },
  {
    id: 8,
    description: 'Tree-shake unused exports from the final bundle',
    answer: 'Neither (bundler/runtime)',
    explanation: 'Tree-shaking is the bundler\'s job (Rollup, Webpack, esbuild). ESLint can flag unused imports at the file level, but removing unused exports from the final bundle requires the bundler to analyze the whole dependency graph.',
  },
  {
    id: 9,
    description: 'Flag <img> elements without an alt attribute',
    answer: 'ESLint',
    explanation: 'jsx-a11y/alt-text from eslint-plugin-jsx-a11y. Accessibility rules are code quality concerns enforced by ESLint. Prettier formats code — it doesn\'t know what attributes are required for accessibility.',
  },
  {
    id: 10,
    description: 'Convert TypeScript enums to JavaScript at build time',
    answer: 'Neither (bundler/runtime)',
    explanation: 'TypeScript enum compilation is done by the TypeScript compiler (tsc) or a transpiler like Babel/SWC. ESLint and Prettier operate on source code — they don\'t emit JavaScript output.',
  },
  {
    id: 11,
    description: 'Enforce single quotes instead of double quotes in strings',
    answer: 'Prettier',
    explanation: 'singleQuote: true in .prettierrc. Prettier owns quote style. ESLint\'s quotes rule is disabled by eslint-config-prettier — you should not configure it.',
  },
  {
    id: 12,
    description: 'Prevent calling console.log in production code',
    answer: 'ESLint',
    explanation: 'no-console rule in ESLint. This is a code quality rule — it catches debugging statements left in production code. Typically configured as "warn" or "error" for production files.',
  },
];

type LintGuessState = Record<number, { guess: LintTool | null; revealed: boolean }>;

const LINT_COLORS: Record<LintTool, string> = {
  ESLint: '#1a73e8',
  Prettier: '#e91e8c',
  'Neither (bundler/runtime)': '#757575',
};

function Exercise3_ResponsibilityClassifier() {
  const [states, setStates] = useState<LintGuessState>(() =>
    Object.fromEntries(LINT_CONCERNS.map(c => [c.id, { guess: null, revealed: false }]))
  );
  const score = LINT_CONCERNS.filter(c => states[c.id].revealed && states[c.id].guess === c.answer).length;
  const revealed = LINT_CONCERNS.filter(c => states[c.id].revealed).length;

  return (
    <section>
      <h2>Exercise 3: ESLint vs Prettier Responsibility Classifier</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Twelve concerns. Assign each to{' '}
        <span style={{ color: LINT_COLORS['ESLint'], fontWeight: 600 }}>ESLint</span>,{' '}
        <span style={{ color: LINT_COLORS['Prettier'], fontWeight: 600 }}>Prettier</span>, or{' '}
        <span style={{ color: LINT_COLORS['Neither (bundler/runtime)'], fontWeight: 600 }}>Neither</span>.
        The boundary between ESLint and Prettier is a common interview question.
      </p>
      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> answered so far
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '1rem' }}>
        {LINT_CONCERNS.map(concern => {
          const state = states[concern.id];
          const isCorrect = state.guess === concern.answer;
          return (
            <div key={concern.id} style={{
              border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden',
              background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
              transition: 'background 0.3s',
            }}>
              <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#bbb', fontSize: '0.78rem', marginRight: '0.5rem' }}>#{concern.id}</span>
                  <span style={{ fontSize: '0.9rem', color: '#222' }}>{concern.description}</span>
                </div>
                {state.revealed && (
                  <span style={{
                    padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                    background: LINT_COLORS[concern.answer], color: '#fff', whiteSpace: 'nowrap',
                  }}>{concern.answer}</span>
                )}
              </div>

              <div style={{ padding: '0 1.25rem 0.7rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {!state.revealed && (
                  <>
                    {(['ESLint', 'Prettier', 'Neither (bundler/runtime)'] as LintTool[]).map(tool => (
                      <button
                        key={tool}
                        onClick={() => setStates(prev => ({ ...prev, [concern.id]: { ...prev[concern.id], guess: tool } }))}
                        style={{
                          padding: '0.3rem 0.8rem', borderRadius: '5px', border: '2px solid',
                          borderColor: state.guess === tool ? LINT_COLORS[tool] : '#ddd',
                          background: state.guess === tool ? LINT_COLORS[tool] : '#fff',
                          color: state.guess === tool ? '#fff' : '#333',
                          cursor: 'pointer', fontSize: '0.8rem',
                          fontWeight: state.guess === tool ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >{tool}</button>
                    ))}
                    {state.guess && (
                      <button
                        onClick={() => setStates(prev => ({ ...prev, [concern.id]: { ...prev[concern.id], revealed: true } }))}
                        style={{ padding: '0.3rem 0.8rem', borderRadius: '5px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', marginLeft: 'auto' }}
                      >Reveal →</button>
                    )}
                  </>
                )}
                {state.revealed && (
                  <div style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.6 }}>
                    <span style={{ marginRight: '0.5rem' }}>{isCorrect ? '✓' : `✗ You chose: ${state.guess} —`}</span>
                    {concern.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is <code>eslint-config-prettier</code> and why must it be last in the config array?</li>
          <li>ESLint and Prettier both have a "quotes" rule. Why do they conflict, and how do you resolve it?</li>
          <li>Can Prettier detect a bug? Can ESLint fix indentation? Explain the boundary.</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Broken Config Debugger
//
// Four broken ESLint config setups. For each, identify
// the problem and understand the fix.
// ─────────────────────────────────────────────────────────────

interface BrokenConfig {
  id: number;
  title: string;
  symptom: string;
  code: string;
  problem: string;
  fix: string;
  fixCode: string;
}

const BROKEN_CONFIGS: BrokenConfig[] = [
  {
    id: 1,
    title: 'eslint-config-prettier not last',
    symptom: 'ESLint keeps changing indentation that Prettier already formatted. Running both on save causes an infinite loop of changes.',
    code: `// eslint.config.js
export default [
  js.configs.recommended,
  prettierConfig,    // ← prettier is 2nd
  {
    rules: {
      indent: ['error', 2],   // ← this overrides prettier!
      'max-len': ['warn', 100],
    },
  },
];`,
    problem: 'eslint-config-prettier must be LAST in the array so it can override and disable all previous formatting rules. Here it\'s placed second, and then the rules block (3rd) re-adds formatting rules (indent, max-len) that conflict with Prettier.',
    fix: 'Move prettierConfig to the last position in the array. Remove all formatting rules (indent, max-len, quotes, semi, comma-dangle) from the rules object — let Prettier own them.',
    fixCode: `export default [
  js.configs.recommended,
  {
    rules: {
      // code quality only — no formatting rules
      'no-unused-vars': 'error',
    },
  },
  prettierConfig, // ← must be last
];`,
  },
  {
    id: 2,
    title: 'Missing eslint-plugin-react-hooks',
    symptom: 'The team\'s codebase has conditional hook calls and missing useEffect deps. No ESLint errors are reported for them.',
    code: `// eslint.config.js
export default [
  js.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      // 'react-hooks': reactHooksPlugin, ← missing!
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      // hooks rules never configured
    },
  },
  prettierConfig,
];`,
    problem: 'eslint-plugin-react-hooks is not installed or not added to the plugins object. Without it, the rules-of-hooks and exhaustive-deps rules don\'t exist in ESLint\'s registry. No errors = silent bugs.',
    fix: 'Install the plugin (npm install -D eslint-plugin-react-hooks) and add it to plugins + spread its recommended rules.',
    fixCode: `import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // ...
  {
    plugins: {
      'react-hooks': reactHooksPlugin,  // ← add plugin
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      // includes rules-of-hooks + exhaustive-deps
    },
  },
  prettierConfig,
];`,
  },
  {
    id: 3,
    title: 'parserOptions.project missing for typed rules',
    symptom: 'Running ESLint with @typescript-eslint/no-floating-promises throws: "Parsing error: "parserOptions.project" has been set for @typescript-eslint/parser."',
    code: `export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // project: './tsconfig.json' ← missing!
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // These rules require type information
    },
  },
];`,
    problem: 'Some @typescript-eslint rules require type information from the TypeScript compiler (they need to know the actual types of expressions, not just the syntax). Without parserOptions.project pointing to tsconfig.json, the parser can\'t load type info and these rules fail.',
    fix: 'Add parserOptions.project pointing to your tsconfig.json. Be aware this slows ESLint down because it invokes the TS compiler. Only enable typed rules if you need them.',
    fixCode: `languageOptions: {
  parser: tsParser,
  parserOptions: {
    project: './tsconfig.json', // ← required for typed rules
    tsconfigRootDir: import.meta.dirname,
  },
},`,
  },
  {
    id: 4,
    title: 'rules-of-hooks disabled in file-level comment',
    symptom: 'A developer added a file-level disable comment to silence a hooks warning. Now conditional hooks in the file have no ESLint protection.',
    code: `/* eslint-disable react-hooks/rules-of-hooks */
// This file "had to" call hooks conditionally

import { useState } from 'react';

function DataTable({ editable }: { editable: boolean }) {
  if (editable) {
    const [draft, setDraft] = useState(''); // no ESLint error — rule disabled
  }
  return <table />;
}`,
    problem: 'File-level eslint-disable comments for rules-of-hooks are almost always wrong. The rule was disabled to silence a warning instead of fixing the root issue (conditional hook call). This breaks React\'s hook invariant and will cause "Rendered more hooks than previous render" crashes at runtime.',
    fix: 'Never disable rules-of-hooks. Fix the code instead: move useState to the top level, then use editable conditionally in the render output.',
    fixCode: `function DataTable({ editable }: { editable: boolean }) {
  const [draft, setDraft] = useState(''); // ✅ always at top

  if (!editable) return <table />;

  return (
    <table>
      <input value={draft} onChange={e => setDraft(e.target.value)} />
    </table>
  );
}
// The only valid disable is a specific line with a comment explaining why`,
  },
];

function Exercise4_BrokenConfigDebugger() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 4: Broken Config Debugger</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Four broken ESLint configurations. Read the symptom, find the problem in the config,
        then reveal the issue and fix.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
        {BROKEN_CONFIGS.map(config => (
          <div key={config.id} style={{
            border: '2px solid #f5f5f5', borderRadius: '10px', overflow: 'hidden',
          }}>
            <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>#{config.id} — {config.title}</strong>
              {!revealed[config.id] && (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [config.id]: true }))}
                  style={{ padding: '0.35rem 0.9rem', borderRadius: '5px', border: '1px solid #e53935', background: '#fff', color: '#e53935', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >Show problem + fix →</button>
              )}
            </div>

            <div style={{ padding: '1rem 1.25rem' }}>
              {/* Symptom */}
              <div style={{ background: '#fff3e0', padding: '0.6rem 0.9rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem', borderLeft: '3px solid #f57c00' }}>
                <strong>Symptom:</strong> {config.symptom}
              </div>

              {/* Broken code */}
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Broken config</div>
              <pre style={{
                background: '#1e1e1e', color: '#d4d4d4', padding: '0.75rem 1rem', borderRadius: '6px',
                fontSize: '0.78rem', margin: '0 0 0.75rem', lineHeight: 1.7,
                overflowX: 'auto', whiteSpace: 'pre-wrap',
              }}>{config.code}</pre>

              {/* Revealed problem + fix */}
              {revealed[config.id] && (
                <div>
                  <div style={{ background: '#fce4ec', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem', lineHeight: 1.65 }}>
                    <strong style={{ color: '#c62828' }}>Problem:</strong> {config.problem}
                  </div>
                  <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.85rem', lineHeight: 1.65 }}>
                    <strong style={{ color: '#1b5e20' }}>Fix:</strong> {config.fix}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed code</div>
                  <pre style={{
                    background: '#0d1117', color: '#7ee787', padding: '0.75rem 1rem', borderRadius: '6px',
                    fontSize: '0.78rem', margin: 0, lineHeight: 1.7,
                    overflowX: 'auto', whiteSpace: 'pre-wrap',
                  }}>{config.fixCode}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is the correct order of items in an ESLint flat config array? Why does order matter?</li>
          <li>Why do some @typescript-eslint rules require <code>parserOptions.project</code> when others don't?</li>
          <li>A coworker adds <code>/* eslint-disable */</code> to silence a warning. What questions do you ask before merging?</li>
          <li>What is lint-staged, and why does it run ESLint only on staged files?</li>
        </ol>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>ESLint + Prettier</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> ESLint and Prettier run at dev/CI time, not in the browser.
      Exercise 1 shows the actual bug they prevent (stale closures) running live.
      Exercises 2–4 build the pattern recognition and config knowledge interviewers probe.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_StaleClosureDetective />
      <hr />
      <Exercise2_RulesOfHooksViolationFinder />
      <hr />
      <Exercise3_ResponsibilityClassifier />
      <hr />
      <Exercise4_BrokenConfigDebugger />
    </div>
  </div>
);

export default App;
