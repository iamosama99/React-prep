// ============================================================
// Topic:   Tree Shaking
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. Tree shaking is a bundler operation — you
//   can't run it in the browser. These exercises make you simulate
//   the bundler's static analysis by hand: look at an import/export
//   graph and determine which exports survive the shake.
//
//   By the end, you'll instantly recognize tree-shaking killers in
//   code review: CJS, namespace imports, barrel files with side effects,
//   and dynamic property access patterns.
// ============================================================

import { useState } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const codeBlock = { fontFamily: 'monospace', fontSize: 12, background: '#1e293b', color: '#e2e8f0', padding: '12px 16px', borderRadius: 6, lineHeight: 1.7, margin: 0, whiteSpace: 'pre', overflowX: 'auto' };


// ─── Exercise 1: Shake the Module Graph by Hand ───────────────
//
// SITUATION
//   The bundler's tree-shaking algorithm is simple: start from entry points,
//   follow static imports, include only what's reachable. Anything not
//   reachable is eliminated. Your task is to simulate this manually.
//
//   Rules the bundler applies:
//   1. Only static `import`/`export` syntax is analyzable — `require()` is not.
//   2. Only named/default exports are individually eliminatable.
//      `export * from './foo'` re-exports everything — nothing is eliminated.
//   3. If a module has side effects (e.g., writes to globalThis), the bundler
//      must include the whole module even if you only import one thing.
//   4. `"sideEffects": false` in package.json tells the bundler all files
//      are side-effect free — enables file-level elimination.
//
// YOUR TASK
//   For each scenario, identify which functions/variables end up in the bundle
//   and which are eliminated. Then reveal the answer.

const SHAKE_SCENARIOS = [
  {
    id: 'A',
    title: 'ESM utility module',
    entryPoint: `// app.js (entry point)
import { add } from './math';
console.log(add(2, 3));`,
    moduleCode: `// math.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export const PI = 3.14159;`,
    bundled: ['add'],
    eliminated: ['subtract', 'multiply', 'PI'],
    explanation: 'Only `add` is imported. The bundler sees static `import { add }` and marks only `add` as reachable. `subtract`, `multiply`, and `PI` are never referenced from the entry point\'s import chain → eliminated.',
    shakeable: true,
  },
  {
    id: 'B',
    title: 'CJS module (CommonJS)',
    entryPoint: `// app.js
const { add } = require('./math');
console.log(add(2, 3));`,
    moduleCode: `// math.js
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
module.exports = { add, subtract };`,
    bundled: ['add', 'subtract', '(entire module.exports object)'],
    eliminated: [],
    explanation: '`require()` is a runtime function call — the bundler cannot statically determine which keys will be accessed. It must include the entire `module.exports` object. Even though you only destructure `add`, the bundler doesn\'t know you won\'t later do `require(\'./math\')[dynamicKey]`.',
    shakeable: false,
  },
  {
    id: 'C',
    title: 'Namespace import (`import *`)',
    entryPoint: `// app.js
import * as math from './math';
console.log(math.add(2, 3));`,
    moduleCode: `// math.js (ESM)
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }`,
    bundled: ['add', 'subtract', 'multiply'],
    eliminated: [],
    explanation: 'Even though math.js is ESM, `import *` creates a namespace object where any export could be accessed via `math[someKey]`. The bundler includes everything — it can\'t know which keys you\'ll access at runtime. Modern bundlers (Rollup, Vite) have limited namespace analysis but cannot eliminate safely.',
    shakeable: false,
  },
  {
    id: 'D',
    title: 'Re-export barrel file',
    entryPoint: `// app.js
import { Button } from './components';`,
    moduleCode: `// components/index.js (barrel)
export { Button } from './Button';
export { Modal } from './Modal';
export { Table } from './Table';
export { Tooltip } from './Tooltip';
// Button.jsx, Modal.jsx, Table.jsx, Tooltip.jsx are separate files`,
    bundled: ['Button (from Button.jsx)'],
    eliminated: ['Modal', 'Table', 'Tooltip (if "sideEffects": false)'],
    explanation: 'In a pure ESM setup with `"sideEffects": false`, the bundler can follow named re-exports and include only the `Button` module. Modal, Table, and Tooltip are never reachable from the entry. However, if `"sideEffects"` is not declared, the bundler must import ALL barrel file members conservatively (the other files might have side effects when imported).',
    shakeable: true,
  },
  {
    id: 'E',
    title: 'Module with side effects',
    entryPoint: `// app.js
import { trackClick } from './analytics';
trackClick('button');`,
    moduleCode: `// analytics.js
// SIDE EFFECT at module level:
window.__analytics = { version: '2.0', loaded: Date.now() };

export function trackClick(element) { /* ... */ }
export function trackPage(path) { /* ... */ }
export function trackError(err) { /* ... */ }`,
    bundled: ['trackClick', 'trackPage', 'trackError', 'window.__analytics assignment'],
    eliminated: [],
    explanation: 'The module-level assignment `window.__analytics = ...` is a side effect — it runs when the module is imported, regardless of which exports you use. The bundler must include the entire module to preserve this side effect. Even `trackPage` and `trackError` are included because they\'re in the same module and the module is already fully included.',
    shakeable: false,
  },
];

function ShakeScenario({ scenario }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          Scenario {scenario.id}: {scenario.title}
        </span>
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
          background: scenario.shakeable ? '#f0fdf4' : '#fef2f2',
          color: scenario.shakeable ? '#16a34a' : '#dc2626',
        }}>
          {scenario.shakeable ? '✅ tree-shakeable' : '❌ cannot shake'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Entry point:</div>
          <pre style={{ ...codeBlock, fontSize: 11 }}>{scenario.entryPoint}</pre>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Module:</div>
          <pre style={{ ...codeBlock, fontSize: 11 }}>{scenario.moduleCode}</pre>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#475569' }}>
          Predict: what survives the shake?
        </span>
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          style={{ ...btnStyle, padding: '4px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12 }}
        >
          Reveal answer
        </button>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 4 }}>✅ Bundled:</div>
              {scenario.bundled.map((item, i) => (
                <div key={i} style={{ fontFamily: 'monospace', color: '#166534' }}>• {item}</div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: scenario.eliminated.length > 0 ? '#fef2f2' : '#f1f5f9', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: scenario.eliminated.length > 0 ? '#b91c1c' : '#64748b', marginBottom: 4 }}>
                {scenario.eliminated.length > 0 ? '🗑 Eliminated:' : '(nothing eliminated)'}
              </div>
              {scenario.eliminated.map((item, i) => (
                <div key={i} style={{ fontFamily: 'monospace', color: '#991b1b', textDecoration: 'line-through' }}>• {item}</div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>{scenario.explanation}</p>
        </div>
      )}
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Shake the Module Graph by Hand</h2>
      <p style={hint}>
        Before revealing each answer, write down which exports you think survive.
        The pattern: can the bundler statically determine which exports are used?
      </p>
      {SHAKE_SCENARIOS.map(s => <ShakeScenario key={s.id} scenario={s} />)}
      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Tree shaking requirements checklist:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>✅ Static <code>import</code>/<code>export</code> syntax (no <code>require</code>)</li>
          <li>✅ Named exports (not <code>export default {'{ everything }'}</code>)</li>
          <li>✅ No namespace imports (<code>import *</code>)</li>
          <li>✅ No module-level side effects (no writes to globalThis, DOM, etc.)</li>
          <li>✅ <code>"sideEffects": false</code> in the library's package.json</li>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 2: Diagnose Real-World Shaking Failures ─────────
//
// SITUATION
//   In practice, tree shaking often fails silently — the bundler includes
//   code you expected to be eliminated, with no warning. These are the
//   most common failure modes you'll encounter in real codebases.
//
//   Each pattern below is something you might write today and not realize
//   it defeats tree shaking. Identify the problem and the fix.

const SHAKING_FAILURES = [
  {
    title: 'Dynamic property access',
    broken: `// You want to call different utils based on user input:
import * as utils from './utils';

function applyOperation(name, a, b) {
  return utils[name](a, b);  // ← dynamic key
}`,
    whyBroken: '`utils[name]` is a dynamic property access. The bundler cannot know at build time which exports will be accessed — `name` is only known at runtime. It must include all exports of utils. This is semantically equivalent to `import *`.',
    fixed: `// Option 1: explicit lookup map (tree-shakeable)
import { add, subtract, multiply } from './utils';

const OPERATIONS = { add, subtract, multiply };
function applyOperation(name, a, b) {
  return OPERATIONS[name]?.(a, b);
}

// Option 2: if truly dynamic, accept the cost — it's a design
// choice to support arbitrary operations vs fixed known ones.`,
  },
  {
    title: 'Re-exporting then using default',
    broken: `// lib/index.js (barrel)
export { parseDate } from './date';
export { formatCurrency } from './currency';
export { validateEmail } from './validation';

// consumer.js
import utils from 'lib';  // ← default import
utils.parseDate('2024-01-01');`,
    whyBroken: 'Default importing a barrel file is the same as `import *`. You get the entire aggregated namespace. The bundler includes all three modules. Also: the barrel file needs to have a `default` export for this to even work — mixing named re-exports with default consumption is a common mistake.',
    fixed: `// Use named imports — the bundler can trace exactly what's needed:
import { parseDate } from 'lib';

// Or skip the barrel file entirely:
import { parseDate } from 'lib/date';`,
  },
  {
    title: 'Library compiled to CJS (CommonJS)',
    broken: `// You're using a library that only ships CJS (no ESM build):
import { throttle } from 'underscore';  // underscore = CJS only`,
    whyBroken: 'Even with named import syntax, if the library\'s package.json points to a CJS file (e.g., `"main": "underscore.js"` with no `"module"` or `"exports"` field pointing to ESM), bundlers import the CJS module as a whole. Named destructuring on a CJS module is transpiled to property access after importing the entire module.',
    fixed: `// Option 1: use the ESM alternative
import { throttle } from 'lodash-es';  // lodash-es = ESM fork of lodash

// Option 2: sub-path import (works even for CJS because it imports
// only one file, not the barrel):
import throttle from 'underscore/throttle';
// (if underscore ships individual files — many do)

// Option 3: just implement the ~5-line utility yourself
// for something as simple as throttle, it's often not worth the dep`,
  },
  {
    title: 'CSS import in JS module',
    broken: `// Button.js
import './Button.css';  // ← side effect import
export function Button({ children }) { /* ... */ }
export function IconButton({ icon, children }) { /* ... */ }`,
    whyBroken: '`import \'./Button.css\'` is a side-effect import — it has no exported bindings. The bundler sees this as a module-level side effect and must include the entire Button.js module when this CSS import exists, even if only `Button` is used. If you only import `Button`, `IconButton` would still be included because the bundler can\'t tree-shake a module with side effects.',
    fixed: `// Option 1: declare no side effects in package.json
// { "sideEffects": ["*.css"] }  ← CSS files have side effects but JS does not

// Option 2: CSS Modules or CSS-in-JS — no separate CSS import needed
// Each component is fully self-contained

// Note: most modern bundlers (Vite, webpack 5) handle this well with
// proper sideEffects configuration in package.json`,
  },
];

function Exercise2() {
  const [revealed, setRevealed] = useState({});

  return (
    <section>
      <h2>Exercise 2 — Diagnose Real-World Shaking Failures</h2>
      <p style={hint}>
        Each pattern looks correct but defeats tree shaking. Identify the problem before revealing.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SHAKING_FAILURES.map((item, i) => (
          <div key={i} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>#{i + 1}: {item.title}</span>
              <button
                onClick={() => setRevealed(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{ ...btnStyle, padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12 }}
              >
                {revealed[i] ? 'Hide' : 'Reveal'}
              </button>
            </div>

            <pre style={{ ...codeBlock, marginBottom: 0 }}>{item.broken}</pre>

            {revealed[i] && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#7f1d1d' }}>
                  <strong>Why tree shaking fails:</strong> {item.whyBroken}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginBottom: 3 }}>✅ Fix:</div>
                  <pre style={{ ...codeBlock, background: '#0f2d1f', fontSize: 11 }}>{item.fixed}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Verifying tree shaking works:</strong> After changing an import pattern, run your build
        and check the bundle. With Vite: <code>vite build --reporter verbose</code> shows chunk contents.
        With webpack: use <code>optimization.usedExports: true</code> and check source maps.
        If a function you didn't import still appears in the bundle, tree shaking failed — trace the import chain.
      </div>
    </section>
  );
}


// ─── Exercise 3: sideEffects Field Simulation ─────────────────
//
// SITUATION
//   The `"sideEffects"` field in package.json is what enables aggressive
//   tree shaking at the file level (not just the export level). Most
//   library authors get this wrong or don't declare it at all.
//
//   Without `"sideEffects": false`:
//     - Bundler includes every file that's in the import chain, even if
//       you only use one export from it
//     - A barrel index that re-exports 50 components forces all 50 files
//       to be included when you import just 1
//
//   With `"sideEffects": false`:
//     - Bundler can eliminate entire files that contribute no used exports
//     - Barrel files become safe to use
//     - Named imports from root index just work efficiently
//
// YOUR TASK
//   Toggle the sideEffects setting below and observe how it changes which
//   files get included when the app only imports `<Button>`.

const COMPONENT_LIBRARY = [
  { file: 'index.js', exports: ['Button', 'Modal', 'Table', 'Tooltip', 'Input', 'Select'] },
  { file: 'Button.jsx', exports: ['Button'], hasSideEffect: false },
  { file: 'Modal.jsx', exports: ['Modal'], hasSideEffect: false },
  { file: 'Table.jsx', exports: ['Table'], hasSideEffect: false },
  { file: 'Tooltip.jsx', exports: ['Tooltip'], hasSideEffect: false },
  { file: 'Input.jsx', exports: ['Input'], hasSideEffect: false },
  { file: 'Select.jsx', exports: ['Select'], hasSideEffect: false },
];

function Exercise3() {
  const [sideEffectsFalse, setSideEffectsFalse] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Without sideEffects: false, all files in the import chain are included
  // because any of them might have module-level side effects
  const includedFiles = sideEffectsFalse
    ? ['index.js', 'Button.jsx']  // only what's needed to get Button
    : ['index.js', 'Button.jsx', 'Modal.jsx', 'Table.jsx', 'Tooltip.jsx', 'Input.jsx', 'Select.jsx'];

  return (
    <section>
      <h2>Exercise 3 — The "sideEffects" Package.json Field</h2>
      <p style={hint}>
        Your app does: <code>{'import { Button } from \'my-ui-lib\';'}</code>
        Toggle the library's <code>sideEffects</code> field and observe which files get bundled.
      </p>

      <div style={card}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              my-ui-lib/package.json:
            </div>
            <pre style={{ ...codeBlock, fontSize: 11 }}>
{`{
  "name": "my-ui-lib",
  "main": "./index.js",
  "module": "./index.esm.js",
  "sideEffects": ${sideEffectsFalse ? 'false' : '"not declared (bundler is conservative)"'}
}`}
            </pre>
            <button
              onClick={() => setSideEffectsFalse(v => !v)}
              style={{
                ...btnStyle, marginTop: 8, width: '100%',
                background: sideEffectsFalse ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${sideEffectsFalse ? '#86efac' : '#fca5a5'}`,
                color: sideEffectsFalse ? '#16a34a' : '#dc2626',
              }}
            >
              {sideEffectsFalse ? '✅ sideEffects: false' : '❌ sideEffects: not declared'}
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              Files bundled (for <code>import {'{ Button }'}</code>):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COMPONENT_LIBRARY.map(item => {
                const isIncluded = includedFiles.includes(item.file);
                const isNeeded = ['index.js', 'Button.jsx'].includes(item.file);
                return (
                  <div key={item.file} style={{
                    padding: '5px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isIncluded
                      ? (isNeeded ? '#f0fdf4' : '#fef2f2')
                      : '#f8fafc',
                    border: `1px solid ${isIncluded ? (isNeeded ? '#86efac' : '#fca5a5') : '#e2e8f0'}`,
                    opacity: isIncluded ? 1 : 0.5,
                    textDecoration: isIncluded ? 'none' : 'line-through',
                  }}>
                    <span>{item.file}</span>
                    <span style={{ fontSize: 10, color: isIncluded ? (isNeeded ? '#16a34a' : '#dc2626') : '#94a3b8' }}>
                      {isIncluded ? (isNeeded ? '✅ needed' : '❌ wasted') : '🗑 eliminated'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              Bundle includes: <strong style={{ color: includedFiles.length > 2 ? '#dc2626' : '#16a34a' }}>
                {includedFiles.length} / {COMPONENT_LIBRARY.length} files
              </strong>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAnswer(v => !v)}
          style={{ ...btnStyle, padding: '4px 12px', background: '#eff6ff', border: '1px solid #93c5fd', color: '#2563eb', fontSize: 12 }}
        >
          {showAnswer ? 'Hide explanation' : 'Show explanation'}
        </button>

        {showAnswer && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, fontSize: 12, color: '#1e40af', lineHeight: 1.7 }}>
            <strong>Without <code>sideEffects: false</code>:</strong> The bundler conservatively assumes any file
            might write to globals, register polyfills, or modify prototypes when imported.
            Since the barrel <code>index.js</code> re-exports all 6 components, the bundler imports
            all 6 source files to be safe — even though you only use Button.
            <br /><br />
            <strong>With <code>sideEffects: false</code>:</strong> The bundler knows every file in this library
            is pure — importing a file has no observable effects beyond its exports. It can eliminate
            Modal.jsx, Table.jsx, etc. because nothing in the reachable import chain references their exports.
            Only Button.jsx and index.js (as the entry for the named export) survive.
            <br /><br />
            <strong>Important:</strong> If the library has CSS imports in its JS files, those CSS files ARE side effects.
            Use <code>"sideEffects": ["*.css"]</code> to mark CSS as side-effectful while marking JS as pure.
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Checklist when adopting a new library:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Check <code>bundlephobia.com/package/[name]</code> — does it have tree shaking?</li>
          <li>Check the library's package.json: does it have <code>"module"</code> or <code>"exports"</code> pointing to ESM?</li>
          <li>Does it declare <code>"sideEffects": false</code>?</li>
          <li>After adding: build and diff the bundle size. Did only the used parts get included?</li>
        </ol>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 13 — Tree Shaking
      </h1>

      <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, marginBottom: 28, fontSize: 13, color: '#1e40af' }}>
        <strong>Goal:</strong> Develop the instinct to look at any import and immediately ask:
        "Can the bundler eliminate the unused parts of this?" The answer determines whether
        your users download 2KB or 200KB.
      </div>

      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
