// ============================================================
// Topic:   Babel & SWC
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: TRANSFORM VISUALIZER + CLASSIFIER + SCENARIO DECISIONS
//
// Neither Babel nor SWC run in the browser, but you CAN:
//   1. Visualize the JSX transform output (old vs new runtime)
//   2. Classify which tool handles each responsibility
//   3. Annotate a real .babelrc and .swcrc config
//   4. Choose Babel vs SWC for realistic scenarios
//
// Run: npm run tutorial 02-babel-swc
// ============================================================

import { useState, useCallback, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — JSX Transform Visualizer
//
// Toggle between Old Runtime and New Runtime.
// Click a JSX example to see exactly what Babel/SWC outputs.
// ─────────────────────────────────────────────────────────────

interface JSXExample {
  id: number;
  label: string;
  input: string;
  oldOutput: string;
  newOutput: string;
  note: string;
}

const JSX_EXAMPLES: JSXExample[] = [
  {
    id: 1,
    label: 'Simple element',
    input: `const el = <div className="foo">Hello</div>;`,
    oldOutput: `const el = React.createElement(
  'div',
  { className: 'foo' },
  'Hello'
);
// ^ React must be in scope for this to work`,
    newOutput: `import { jsx as _jsx } from 'react/jsx-runtime';
const el = _jsx('div', {
  className: 'foo',
  children: 'Hello'
});
// ^ import injected automatically — no manual React import needed`,
    note: 'The old runtime calls React.createElement directly, requiring React to be imported. The new runtime uses a separate react/jsx-runtime package that Babel/SWC auto-imports.',
  },
  {
    id: 2,
    label: 'Component with props',
    input: `const el = <Button variant="primary" onClick={handleClick}>
  Save
</Button>;`,
    oldOutput: `const el = React.createElement(
  Button,
  { variant: 'primary', onClick: handleClick },
  'Save'
);`,
    newOutput: `import { jsx as _jsx } from 'react/jsx-runtime';
const el = _jsx(Button, {
  variant: 'primary',
  onClick: handleClick,
  children: 'Save'
});`,
    note: 'Components (uppercase) are passed as the first argument directly — not as a string. The new runtime folds children into the props object instead of passing them as extra arguments.',
  },
  {
    id: 3,
    label: 'Multiple children (Fragment)',
    input: `const el = (
  <>
    <h1>Title</h1>
    <p>Body text</p>
  </>
);`,
    oldOutput: `const el = React.createElement(
  React.Fragment,
  null,
  React.createElement('h1', null, 'Title'),
  React.createElement('p', null, 'Body text')
);`,
    newOutput: `import {
  jsxs as _jsxs,
  Fragment as _Fragment
} from 'react/jsx-runtime';

const el = _jsxs(_Fragment, {
  children: [
    _jsx('h1', { children: 'Title' }),
    _jsx('p', { children: 'Body text' })
  ]
});
// jsxs is used when children is an array`,
    note: 'The new runtime uses _jsxs (plural) when children is a static array. Fragments become _Fragment imported from react/jsx-runtime.',
  },
  {
    id: 4,
    label: 'Conditional rendering',
    input: `const el = (
  <div>
    {isLoading ? <Spinner /> : <Content data={data} />}
  </div>
);`,
    oldOutput: `const el = React.createElement(
  'div',
  null,
  isLoading
    ? React.createElement(Spinner, null)
    : React.createElement(Content, { data: data })
);`,
    newOutput: `import { jsx as _jsx } from 'react/jsx-runtime';
const el = _jsx('div', {
  children: isLoading
    ? _jsx(Spinner, {})
    : _jsx(Content, { data: data })
});`,
    note: 'JSX expressions (ternaries, etc.) are just JavaScript. The compiled output is identical structurally — the only difference is React.createElement vs _jsx.',
  },
  {
    id: 5,
    label: 'Self-closing with spread',
    input: `const el = <input {...rest} type="text" disabled={false} />;`,
    oldOutput: `const el = React.createElement(
  'input',
  Object.assign({}, rest, { type: 'text', disabled: false })
);
// Older Babel used Object.assign for spread`,
    newOutput: `import { jsx as _jsx } from 'react/jsx-runtime';
const el = _jsx('input', {
  ...rest,
  type: 'text',
  disabled: false
});
// Modern output preserves spread syntax when target supports it`,
    note: 'Older Babel compiled JSX spread to Object.assign(). Modern targets keep the spread. The new JSX runtime also keeps spread — it targets environments that support it natively.',
  },
];

function Exercise1_JSXTransformVisualizer() {
  const [runtime, setRuntime] = useState<'old' | 'new'>('old');
  const [selectedId, setSelectedId] = useState<number>(1);

  const selected = JSX_EXAMPLES.find(e => e.id === selectedId)!;
  const output = runtime === 'old' ? selected.oldOutput : selected.newOutput;

  return (
    <section>
      <h2>Exercise 1: JSX Transform Visualizer</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Toggle between Old Runtime (pre-React 17) and New Runtime (React 17+).
        Click any JSX example to see exactly what Babel or SWC outputs.
      </p>

      {/* Runtime toggle */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.25rem', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ddd', width: 'fit-content' }}>
        {(['old', 'new'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRuntime(r)}
            style={{
              padding: '0.5rem 1.5rem', border: 'none',
              background: runtime === r ? '#1a1a2e' : '#fff',
              color: runtime === r ? '#fff' : '#333',
              cursor: 'pointer', fontWeight: runtime === r ? 700 : 400,
              fontSize: '0.9rem', transition: 'all 0.15s',
            }}
          >
            {r === 'old' ? 'Old Runtime (pre-React 17)' : 'New Runtime (React 17+)'}
          </button>
        ))}
      </div>

      {runtime === 'old' && (
        <div style={{ background: '#fff3e0', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', borderLeft: '3px solid #f57c00' }}>
          <strong>Old runtime:</strong> JSX compiles to <code>React.createElement(...)</code>.
          Since <code>React</code> is referenced in the output, every JSX file must have{' '}
          <code>import React from 'react'</code> — even if you never use React directly.
        </div>
      )}
      {runtime === 'new' && (
        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', borderLeft: '3px solid #2e7d32' }}>
          <strong>New runtime:</strong> Babel/SWC auto-injects{' '}
          <code>import {'{ jsx as _jsx }'} from 'react/jsx-runtime'</code>.
          No manual React import needed. Enable with: <code>{"runtime: 'automatic'"}</code> in your Babel/SWC config.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '1rem' }}>
        {/* Example picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {JSX_EXAMPLES.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid',
                borderColor: selectedId === e.id ? '#1a1a2e' : '#ddd',
                background: selectedId === e.id ? '#1a1a2e' : '#fff',
                color: selectedId === e.id ? '#fff' : '#333',
                cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left',
                fontWeight: selectedId === e.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >{e.label}</button>
          ))}
        </div>

        {/* Code panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input (you write)</div>
            <pre style={{
              background: '#1e1e1e', color: '#9cdcfe', padding: '1rem', borderRadius: '6px',
              fontSize: '0.8rem', margin: 0, overflowX: 'auto', lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>{selected.input}</pre>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Compiler output ({runtime === 'old' ? 'Old runtime' : 'New runtime'})
            </div>
            <pre style={{
              background: '#0d1117', color: '#7ee787', padding: '1rem', borderRadius: '6px',
              fontSize: '0.8rem', margin: 0, overflowX: 'auto', lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>{output}</pre>
          </div>
          <div style={{ background: '#f5f5f5', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.83rem', color: '#444', lineHeight: 1.6 }}>
            <strong>Note:</strong> {selected.note}
          </div>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why did every JSX file require <code>import React from 'react'</code> before React 17?</li>
          <li>What is <code>react/jsx-runtime</code> and why was it created?</li>
          <li>What Babel config option enables the new runtime? What about SWC?</li>
          <li>What is the difference between <code>_jsx</code> and <code>_jsxs</code> in the new runtime output?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — "Who Handles This?" Responsibility Sorter
//
// Ten tasks/descriptions. Click to categorise each as:
//   Babel/SWC | TypeScript (tsc) | Bundler (Webpack/Vite/Rollup)
//
// Then reveal the answer.
// ─────────────────────────────────────────────────────────────

type Responsibility = 'Babel/SWC' | 'TypeScript (tsc)' | 'Bundler';

interface ResponsibilityTask {
  id: number;
  description: string;
  answer: Responsibility;
  explanation: string;
}

const RESPONSIBILITY_TASKS: ResponsibilityTask[] = [
  {
    id: 1,
    description: 'Convert <div /> to React.createElement("div", null)',
    answer: 'Babel/SWC',
    explanation: 'JSX transform is Babel/SWC\'s core job. TypeScript can also do it (with "jsx": "react" in tsconfig), but in a Vite or Next.js project, Babel/SWC handles it so tsc can run type-checking separately without emitting.',
  },
  {
    id: 2,
    description: 'Catch that you passed a string where a number prop is expected',
    answer: 'TypeScript (tsc)',
    explanation: 'Type checking is exclusively tsc\'s job. Babel and SWC strip type annotations without reading them — they have no type checker and emit no type errors. This is by design: skipping type-checking is why they are fast.',
  },
  {
    id: 3,
    description: 'Remove TypeScript type annotations from .ts files',
    answer: 'Babel/SWC',
    explanation: 'Stripping types (without checking them) is one of the main things Babel (@babel/preset-typescript) and SWC do. They treat types as comments to be erased. tsc also strips types, but as part of type-checking + emit (slower).',
  },
  {
    id: 4,
    description: 'Tree-shake unused exports to reduce bundle size',
    answer: 'Bundler',
    explanation: 'Tree-shaking is the bundler\'s job (Rollup, Webpack, esbuild). The bundler analyzes the static import/export graph and removes exports that are never imported. Babel/SWC only transform individual files — they never see the whole graph.',
  },
  {
    id: 5,
    description: 'Transform optional chaining (?.) for browsers that don\'t support it',
    answer: 'Babel/SWC',
    explanation: '@babel/preset-env reads your browserslist targets and compiles a?.b to a === null || a === undefined ? undefined : a.b for browsers that lack optional chaining support. SWC does the same via its "target" config.',
  },
  {
    id: 6,
    description: 'Verify that all cases of a TypeScript discriminated union are handled',
    answer: 'TypeScript (tsc)',
    explanation: 'Exhaustiveness checking of union types is a TypeScript type-system feature. tsc analyzes control flow and reports an error if a switch statement doesn\'t cover all union members. Babel/SWC never see the types.',
  },
  {
    id: 7,
    description: 'Transform the @observable decorator in MobX to class property getters',
    answer: 'Babel/SWC',
    explanation: 'Decorator transforms are Babel plugins (@babel/plugin-proposal-decorators) or SWC equivalents. TypeScript can also emit experimental decorators, but for production decorator transforms in a React project, Babel/SWC handles it.',
  },
  {
    id: 8,
    description: 'Split the app into chunks so that /dashboard is loaded lazily',
    answer: 'Bundler',
    explanation: 'Code splitting based on dynamic import() points is done by the bundler. Webpack, Rollup (used by Vite), and esbuild analyze import() calls and create separate output chunks. Babel/SWC see only one file at a time.',
  },
  {
    id: 9,
    description: 'Generate .d.ts type declaration files for a published npm package',
    answer: 'TypeScript (tsc)',
    explanation: '.d.ts files are generated by tsc with "declaration": true in tsconfig. Babel and SWC strip types — they never emit .d.ts files. For library publishing, you always need tsc for .d.ts generation even if you use Babel/SWC for the build.',
  },
  {
    id: 10,
    description: 'Report an error when a React Hook is called inside an if statement',
    answer: 'TypeScript (tsc)',
    explanation: 'Actually — this is neither! This is eslint-plugin-react-hooks (rules-of-hooks). Neither the compiler nor the bundler understands React semantics. TypeScript might catch it as a type error in some cases, but the rules-of-hooks lint rule is what specifically enforces this.',
  },
];

const RESP_COLORS: Record<Responsibility, string> = {
  'Babel/SWC': '#a855f7',
  'TypeScript (tsc)': '#1a73e8',
  'Bundler': '#e67e22',
};

type RespGuessState = Record<number, { guess: Responsibility | null; revealed: boolean }>;

function Exercise2_ResponsibilitySorter() {
  const [states, setStates] = useState<RespGuessState>(() =>
    Object.fromEntries(RESPONSIBILITY_TASKS.map(t => [t.id, { guess: null, revealed: false }]))
  );
  const score = RESPONSIBILITY_TASKS.filter(t => states[t.id].revealed && states[t.id].guess === t.answer).length;
  const revealed = RESPONSIBILITY_TASKS.filter(t => states[t.id].revealed).length;

  return (
    <section>
      <h2>Exercise 2: Who Handles This? Responsibility Sorter</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each task, decide which tool is responsible. The categories are{' '}
        <span style={{ color: RESP_COLORS['Babel/SWC'], fontWeight: 600 }}>Babel/SWC</span>,{' '}
        <span style={{ color: RESP_COLORS['TypeScript (tsc)'], fontWeight: 600 }}>TypeScript (tsc)</span>, and{' '}
        <span style={{ color: RESP_COLORS['Bundler'], fontWeight: 600 }}>Bundler</span>.
      </p>

      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> answered so far
          {revealed === RESPONSIBILITY_TASKS.length && score < RESPONSIBILITY_TASKS.length && (
            <span style={{ color: '#c62828', marginLeft: '1rem' }}>
              Pay attention to Task 10 — it's a trap!
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {RESPONSIBILITY_TASKS.map(task => {
          const state = states[task.id];
          const isCorrect = state.guess === task.answer;
          return (
            <div key={task.id} style={{
              border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden',
              background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
              transition: 'background 0.3s',
            }}>
              <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#999', fontSize: '0.8rem', marginRight: '0.5rem' }}>#{task.id}</span>
                  <span style={{ fontSize: '0.92rem', color: '#222' }}>{task.description}</span>
                </div>
                {state.revealed && (
                  <span style={{
                    padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                    background: RESP_COLORS[task.answer], color: '#fff', whiteSpace: 'nowrap',
                  }}>{task.answer}</span>
                )}
              </div>

              <div style={{ padding: '0 1.25rem 0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {!state.revealed && (
                  <>
                    {(['Babel/SWC', 'TypeScript (tsc)', 'Bundler'] as Responsibility[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setStates(prev => ({ ...prev, [task.id]: { ...prev[task.id], guess: r } }))}
                        style={{
                          padding: '0.35rem 0.9rem', borderRadius: '6px', border: '2px solid',
                          borderColor: state.guess === r ? RESP_COLORS[r] : '#ddd',
                          background: state.guess === r ? RESP_COLORS[r] : '#fff',
                          color: state.guess === r ? '#fff' : '#333',
                          cursor: 'pointer', fontSize: '0.82rem',
                          fontWeight: state.guess === r ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >{r}</button>
                    ))}
                    {state.guess && (
                      <button
                        onClick={() => setStates(prev => ({ ...prev, [task.id]: { ...prev[task.id], revealed: true } }))}
                        style={{ padding: '0.35rem 0.9rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', marginLeft: 'auto' }}
                      >Reveal →</button>
                    )}
                  </>
                )}
                {state.revealed && (
                  <div style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.6 }}>
                    <span style={{ marginRight: '0.5rem' }}>{isCorrect ? '✓' : `✗ You chose: ${state.guess} —`}</span>
                    {task.explanation}
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
          <li>Both Babel/SWC and tsc can strip TypeScript. What is the key difference in HOW they do it?</li>
          <li>If Babel/SWC don't type-check, how do you catch type errors in CI?</li>
          <li>Why does a npm library still need tsc even if it uses SWC for its build?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Config Anatomy Quiz
//
// Click a highlighted part of a .babelrc or .swcrc config
// to see what that part does.
// ─────────────────────────────────────────────────────────────

interface ConfigAnnotation {
  key: string;
  label: string;
  configType: 'babel' | 'swc';
  explanation: string;
  example?: string;
}

const CONFIG_ANNOTATIONS: ConfigAnnotation[] = [
  {
    key: 'presets',
    label: 'presets',
    configType: 'babel',
    explanation: 'A preset is a curated bundle of Babel plugins. Instead of listing 20 individual plugins, you use @babel/preset-env (for modern JS downleveling), @babel/preset-typescript (strip types), and @babel/preset-react (JSX). Presets run in REVERSE order — last preset runs first.',
    example: '"presets": ["@babel/preset-env", "@babel/preset-typescript", "@babel/preset-react"]',
  },
  {
    key: 'targets',
    label: 'targets (preset-env)',
    configType: 'babel',
    explanation: '@babel/preset-env reads your target browser/Node.js versions and only applies transforms that are actually needed. Target "last 2 versions, >0.5%" and it won\'t compile optional chaining if all those browsers support it. This produces smaller, faster output.',
    example: '"targets": "> 0.5%, last 2 versions, not dead"',
  },
  {
    key: 'runtime-automatic',
    label: 'runtime: "automatic"',
    configType: 'babel',
    explanation: 'This tells @babel/preset-react to use the new JSX runtime introduced in React 17. Without this, JSX compiles to React.createElement (requiring React in scope). With "automatic", Babel injects the import from react/jsx-runtime automatically.',
    example: '["@babel/preset-react", { "runtime": "automatic" }]',
  },
  {
    key: 'plugins',
    label: 'plugins',
    configType: 'babel',
    explanation: 'Individual Babel plugins for transforms not covered by presets. Examples: @babel/plugin-proposal-decorators (class decorators), babel-plugin-styled-components (display names + SSR), babel-plugin-macros. Plugins run BEFORE presets, in order.',
    example: '"plugins": [["@babel/plugin-proposal-decorators", { "legacy": true }]]',
  },
  {
    key: 'jsc-parser-syntax',
    label: 'jsc.parser.syntax',
    configType: 'swc',
    explanation: 'Tells SWC what syntax to parse. "typescript" enables TypeScript parsing. The alternative is "ecmascript". Setting tsx: true (or jsx: true for ecmascript) enables JSX parsing within that syntax mode.',
    example: '"syntax": "typescript", "tsx": true',
  },
  {
    key: 'jsc-transform-react-runtime',
    label: 'jsc.transform.react.runtime',
    configType: 'swc',
    explanation: 'SWC\'s equivalent of Babel\'s runtime: "automatic". Set to "automatic" to enable the new JSX runtime (React 17+) so SWC injects the react/jsx-runtime import automatically instead of using React.createElement.',
    example: '"transform": { "react": { "runtime": "automatic" } }',
  },
  {
    key: 'jsc-target',
    label: 'jsc.target',
    configType: 'swc',
    explanation: 'Controls which JavaScript version SWC outputs. "es2017" means async/await is preserved (it\'s natively supported in ES2017). "es5" would compile async/await to generator functions. Match this to your actual deployment environment.',
    example: '"target": "es2017"  // or "es2020", "es5", "es2022"',
  },
  {
    key: 'module-type',
    label: 'module.type',
    configType: 'swc',
    explanation: 'Controls the output module system. "commonjs" outputs require()/module.exports (for Node.js, Jest). "es6" outputs import/export (for bundlers). "nodenext" is for modern Node.js with ESM support. In Next.js, this is managed automatically.',
    example: '"module": { "type": "commonjs" }  // for Jest/Node',
  },
];

function Exercise3_ConfigAnnotation() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [configView, setConfigView] = useState<'babel' | 'swc'>('babel');

  const selected = CONFIG_ANNOTATIONS.find(a => a.key === selectedKey);

  const babelConfig = `{
  "presets": [
    ["@babel/preset-env", {
      "targets": "> 0.5%, last 2 versions"
    }],
    "@babel/preset-typescript",
    ["@babel/preset-react", {
      "runtime": "automatic"
    }]
  ],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }]
  ]
}`;

  const swcConfig = `{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": true
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    },
    "target": "es2017"
  },
  "module": {
    "type": "commonjs"
  }
}`;

  const babelAnnotationMap: Record<string, { startToken: string; endToken?: string }> = {
    presets: { startToken: '"presets"' },
    targets: { startToken: '"targets"' },
    'runtime-automatic': { startToken: '"runtime": "automatic"' },
    plugins: { startToken: '"plugins"' },
  };

  const swcAnnotationMap: Record<string, string> = {
    'jsc-parser-syntax': '"syntax"',
    'jsc-transform-react-runtime': '"runtime": "automatic"',
    'jsc-target': '"target"',
    'module-type': '"type"',
  };

  const visibleAnnotations = CONFIG_ANNOTATIONS.filter(a => a.configType === configView);

  return (
    <section>
      <h2>Exercise 3: Config Anatomy Quiz</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Click any highlighted annotation button to see what that config key does.
        Switch between .babelrc and .swcrc to compare the two formats.
      </p>

      {/* Config toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ddd', width: 'fit-content' }}>
        {(['babel', 'swc'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setConfigView(t); setSelectedKey(null); }}
            style={{
              padding: '0.5rem 1.5rem', border: 'none',
              background: configView === t ? '#1a1a2e' : '#fff',
              color: configView === t ? '#fff' : '#333',
              cursor: 'pointer', fontWeight: configView === t ? 700 : 400,
              fontSize: '0.9rem', transition: 'all 0.15s',
            }}
          >{t === 'babel' ? '.babelrc' : '.swcrc'}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Config display */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {configView === 'babel' ? '.babelrc' : '.swcrc'}
          </div>
          <pre style={{
            background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '8px',
            fontSize: '0.79rem', lineHeight: 1.8, margin: 0, overflowX: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {configView === 'babel' ? babelConfig : swcConfig}
          </pre>
        </div>

        {/* Annotation buttons + explanation */}
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Click to explain</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {visibleAnnotations.map(a => (
              <button
                key={a.key}
                onClick={() => setSelectedKey(selectedKey === a.key ? null : a.key)}
                style={{
                  padding: '0.5rem 0.9rem', borderRadius: '6px', border: '2px solid',
                  borderColor: selectedKey === a.key ? '#1a1a2e' : '#ddd',
                  background: selectedKey === a.key ? '#1a1a2e' : '#fff',
                  color: selectedKey === a.key ? '#fff' : '#333',
                  cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left',
                  fontFamily: 'monospace', fontWeight: selectedKey === a.key ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >{a.label}</button>
            ))}
          </div>

          {selected ? (
            <div style={{
              background: '#f0f4ff', padding: '1rem', borderRadius: '8px',
              border: '1px solid #c7d2fe', fontSize: '0.85rem', lineHeight: 1.7,
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#3730a3', fontFamily: 'monospace' }}>
                {selected.label}
              </strong>
              <p style={{ margin: '0 0 0.5rem', color: '#333' }}>{selected.explanation}</p>
              {selected.example && (
                <code style={{
                  display: 'block', background: '#1e1e1e', color: '#9cdcfe',
                  padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.78rem',
                  whiteSpace: 'pre-wrap',
                }}>{selected.example}</code>
              )}
            </div>
          ) : (
            <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#888', lineHeight: 1.6 }}>
              Select an annotation above to see what it does.
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>In Babel, do plugins run before or after presets? Does order matter?</li>
          <li>What does setting <code>targets</code> in @babel/preset-env buy you?</li>
          <li>What is the <code>module.type: "commonjs"</code> SWC option for? When would you need it?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Babel vs SWC Decision Scenarios
//
// Five scenarios. Pick Babel or SWC, then reveal the answer.
// ─────────────────────────────────────────────────────────────

type Compiler = 'Babel' | 'SWC';

interface CompilerScenario {
  id: number;
  title: string;
  situation: string;
  answer: Compiler;
  reasoning: string;
  nuance?: string;
}

const COMPILER_SCENARIOS: CompilerScenario[] = [
  {
    id: 1,
    title: 'Slow Jest test suite',
    situation: 'Your Jest suite takes 45 seconds to start. You\'re using ts-jest, which runs tsc on every test file including full type-checking. Tests are functionally correct — it\'s purely a speed problem.',
    answer: 'SWC',
    reasoning: 'Switch to @swc/jest (or babel-jest with @babel/preset-typescript). Both skip type-checking and just strip types — which is all Jest needs. @swc/jest is the faster of the two. Type-check separately in CI with tsc --noEmit. Jest suites often go from 45s to <5s.',
    nuance: 'babel-jest is also valid if you already have Babel config and don\'t want to add SWC. @swc/jest is faster but either fixes the bottleneck.',
  },
  {
    id: 2,
    title: 'Next.js app with existing .babelrc',
    situation: 'A Next.js 14 app has a .babelrc with the styled-components plugin (babel-plugin-styled-components) for SSR style injection. The team is debating enabling SWC for speed.',
    answer: 'Babel',
    reasoning: 'If a .babelrc exists, Next.js automatically opts out of SWC and uses Babel. If you want SWC, you must either: (1) remove .babelrc and configure styled-components via SWC\'s built-in transform (@swc/plugin-styled-components), or (2) stay on Babel. Check if @swc/plugin-styled-components covers your usage first.',
    nuance: 'Next.js 13+ has a compiler.styledComponents option that works with SWC natively — you may not need the Babel plugin at all.',
  },
  {
    id: 3,
    title: 'New Vite app, no special transforms',
    situation: 'You\'re starting a new Vite React project. No decorators, no styled-components, no GraphQL fragments. Just TypeScript + React + CSS Modules.',
    answer: 'SWC',
    reasoning: 'For a standard Vite setup with no custom transforms, switch the default @vitejs/plugin-react to @vitejs/plugin-react-swc. It\'s a one-line config change and gives you noticeably faster HMR and build times. There\'s no downside in this scenario.',
    nuance: 'vite.config.ts: replace import react from "@vitejs/plugin-react" with import react from "@vitejs/plugin-react-swc".',
  },
  {
    id: 4,
    title: 'Babel plugin with no SWC port',
    situation: 'Your codebase uses a Babel plugin for GraphQL fragment colocating (babel-plugin-relay). This plugin has no SWC equivalent and the Relay team hasn\'t ported it yet.',
    answer: 'Babel',
    reasoning: 'Babel. SWC plugin ecosystem is smaller — some Babel plugins have no SWC equivalent. If you need a specific Babel plugin that isn\'t ported, you must stay on Babel. Don\'t break your GraphQL data fetching to get slightly faster builds.',
    nuance: 'You can use a hybrid approach in some setups: SWC for non-Relay files, Babel only for .graphql/relay-annotated files. Vite supports this via plugin ordering.',
  },
  {
    id: 5,
    title: 'CRA migration to Vite',
    situation: 'A Create React App project is being migrated to Vite. No custom Babel plugins. Standard TypeScript + React. The team wants maximum build speed with minimum config.',
    answer: 'SWC',
    reasoning: 'When migrating CRA to Vite with no custom Babel plugins, use @vitejs/plugin-react-swc. CRA used Babel by default, but there\'s no reason to continue once you\'re on Vite. SWC is faster, requires zero config for standard TypeScript + React, and is the modern default.',
    nuance: 'The Vite migration itself is the bigger lift — switching compiler plugin from Babel to SWC within Vite is just one import change.',
  },
];

function Exercise4_BabelVsSWC() {
  const [states, setStates] = useState<Record<number, { guess: Compiler | null; revealed: boolean }>>(() =>
    Object.fromEntries(COMPILER_SCENARIOS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const score = COMPILER_SCENARIOS.filter(s => states[s.id].revealed && states[s.id].guess === s.answer).length;
  const revealed = COMPILER_SCENARIOS.filter(s => states[s.id].revealed).length;

  return (
    <section>
      <h2>Exercise 4: Babel vs SWC Decision Scenarios</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Five scenarios. For each, decide whether to use Babel or SWC — and think through
        the specific reason before revealing.
      </p>
      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> answered so far
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {COMPILER_SCENARIOS.map(s => {
          const state = states[s.id];
          const isCorrect = state.guess === s.answer;
          return (
            <div key={s.id} style={{
              border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden',
              background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
              transition: 'background 0.3s',
            }}>
              <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>#{s.id} — {s.title}</strong>
                {state.revealed && (
                  <span style={{
                    padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                    background: s.answer === 'SWC' ? '#a855f7' : '#e67e22', color: '#fff',
                  }}>{s.answer}</span>
                )}
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <p style={{ margin: '0 0 1rem', color: '#333', lineHeight: 1.65 }}>{s.situation}</p>

                {!state.revealed && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(['Babel', 'SWC'] as Compiler[]).map(c => (
                      <button
                        key={c}
                        onClick={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], guess: c } }))}
                        style={{
                          padding: '0.4rem 1.4rem', borderRadius: '6px', border: '2px solid',
                          borderColor: state.guess === c ? (c === 'SWC' ? '#a855f7' : '#e67e22') : '#ddd',
                          background: state.guess === c ? (c === 'SWC' ? '#a855f7' : '#e67e22') : '#fff',
                          color: state.guess === c ? '#fff' : '#333',
                          cursor: 'pointer', fontWeight: state.guess === c ? 700 : 400,
                          fontSize: '0.95rem', transition: 'all 0.15s',
                        }}
                      >{c}</button>
                    ))}
                    {state.guess && (
                      <button
                        onClick={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], revealed: true } }))}
                        style={{ padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
                      >Reveal →</button>
                    )}
                  </div>
                )}

                {state.revealed && (
                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem' }}>
                      {isCorrect ? '✓ Correct' : `✗ You chose ${state.guess} — answer is ${s.answer}`}
                    </p>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.65 }}>
                      <strong>Why:</strong> {s.reasoning}
                    </p>
                    {s.nuance && (
                      <p style={{ margin: 0, fontSize: '0.83rem', color: '#777', fontStyle: 'italic' }}>
                        Nuance: {s.nuance}
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
          <li>Why is SWC 20–70x faster than Babel? Name the three architectural reasons.</li>
          <li>Why does Next.js fall back to Babel when it detects a .babelrc file?</li>
          <li>What is <code>tsc --noEmit</code> and when do you run it?</li>
        </ol>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Babel &amp; SWC</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> Babel and SWC run at build/compile time, not in the browser.
      These exercises simulate their output and build decision-making intuition.
      The key insight: <strong>neither tool type-checks your code</strong> — they only transform it.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_JSXTransformVisualizer />
      <hr />
      <Exercise2_ResponsibilitySorter />
      <hr />
      <Exercise3_ConfigAnnotation />
      <hr />
      <Exercise4_BabelVsSWC />
    </div>
  </div>
);

export default App;
