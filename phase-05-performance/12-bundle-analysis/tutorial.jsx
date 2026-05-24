// ============================================================
// Topic:   Bundle Analysis
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. Bundle analysis is a build-time concern —
//   there's nothing to click in DevTools. Instead, these exercises
//   train the skill of reading import patterns and predicting their
//   bundle impact. Each exercise presents code choices and asks you
//   to reason about what ships to the browser and why.
// ============================================================

import { useState, useCallback } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const codeBlock = { fontFamily: 'monospace', fontSize: 12, background: '#1e293b', color: '#e2e8f0', padding: '12px 16px', borderRadius: 6, lineHeight: 1.7 };
const bad = { color: '#f87171' };
const good = { color: '#86efac' };
const dim = { color: '#94a3b8' };


// ─── Exercise 1: Import Pattern Audit ────────────────────────
//
// SITUATION
//   You're handed a PR that adds 5 utility imports. Each import style
//   has a radically different bundle impact. Your job: classify each
//   import as "safe" (tree-shakeable) or "costly" (pulls in more than needed).
//
//   The mental model:
//   - Namespace import (`import * as X`) pulls in ALL exports of a module.
//   - Default-of-barrel import (`import _ from 'lodash'`) is the whole library.
//   - Named import from ESM (`import { cloneDeep } from 'lodash-es'`) is tree-shakeable.
//   - Sub-path import (`import cloneDeep from 'lodash/cloneDeep'`) bypasses barrel entirely.
//   - Dynamic import (`import(...)`) creates a separate chunk — zero cost to main bundle.
//
// YOUR TASK
//   For each import, predict: ✅ tree-shakeable, ❌ pulls entire library,
//   or ⚠️ it depends. Then reveal the answer and bundle simulation.

const IMPORT_PATTERNS = [
  {
    id: 1,
    code: `import _ from 'lodash';
const result = _.groupBy(items, 'category');`,
    label: 'lodash default import',
    verdict: 'costly',
    estimatedKb: 72,
    explanation: 'Default import of lodash pulls the entire ~72KB (gzipped) library into your main bundle. The bundler cannot tree-shake CJS modules — lodash uses module.exports, so it\'s all-or-nothing.',
    fix: `import groupBy from 'lodash/groupBy';  // ~1KB
// or: import { groupBy } from 'lodash-es'; // tree-shakeable ESM fork`,
  },
  {
    id: 2,
    code: `import * as dateFns from 'date-fns';
const formatted = dateFns.format(new Date(), 'dd/MM/yyyy');`,
    label: 'date-fns namespace import',
    verdict: 'costly',
    estimatedKb: 26,
    explanation: 'Namespace imports (`import *`) force the bundler to include ALL exports because you might access any of them at runtime. Even though date-fns is ESM, `* as X` defeats tree shaking — the bundler can\'t know which properties you\'ll use.',
    fix: `import { format } from 'date-fns';  // ~2KB — bundler now knows you only use format`,
  },
  {
    id: 3,
    code: `import { format } from 'date-fns';
const formatted = format(new Date(), 'dd/MM/yyyy');`,
    label: 'date-fns named import',
    verdict: 'safe',
    estimatedKb: 2,
    explanation: 'Named import from an ESM library with `"sideEffects": false` in package.json. The bundler sees exactly which exports you use and includes only the transitive closure of `format`. This is the correct pattern.',
    fix: null,
  },
  {
    id: 4,
    code: `import { Button, Input, Modal, Table, Tooltip }
  from '@mui/material';`,
    label: 'MUI named imports (v5+)',
    verdict: 'safe',
    estimatedKb: 35,
    explanation: 'MUI v5 ships as ESM with proper tree-shaking support. Named imports only pull in the requested components and their dependencies. Each component is ~5–15KB. Total depends on what you import — but you\'re not pulling in all 100+ components.',
    fix: `// In older MUI v4, you needed:
import Button from '@mui/material/Button';  // sub-path
// In MUI v5+, named imports from root are fine.`,
  },
  {
    id: 5,
    code: `const { default: Chart } = await import('chart.js');
// inside an onClick handler`,
    label: 'dynamic import (async)',
    verdict: 'safe',
    estimatedKb: 0,
    explanation: 'Dynamic import creates a separate chunk. chart.js (~180KB) is excluded from the main bundle entirely and only downloaded when the user triggers the import. The main bundle cost is zero — just the tiny async wrapper.',
    fix: null,
  },
];

function ImportPatternAudit() {
  const [revealed, setRevealed] = useState({});

  const reveal = (id) => setRevealed(prev => ({ ...prev, [id]: true }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {IMPORT_PATTERNS.map(p => (
        <div key={p.id} style={{ ...card, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>#{p.id} — {p.label}</span>
            {!revealed[p.id] && (
              <button
                onClick={() => reveal(p.id)}
                style={{ ...btnStyle, padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12 }}
              >
                Reveal
              </button>
            )}
            {revealed[p.id] && (
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: p.verdict === 'safe' ? '#f0fdf4' : '#fef2f2',
                color: p.verdict === 'safe' ? '#16a34a' : '#dc2626',
                border: `1px solid ${p.verdict === 'safe' ? '#86efac' : '#fca5a5'}`,
              }}>
                {p.verdict === 'safe' ? '✅ tree-shakeable' : '❌ costly'}
              </span>
            )}
          </div>

          <pre style={{ ...codeBlock, margin: '0 0 8px' }}>{p.code}</pre>

          {revealed[p.id] && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: '#475569' }}>
                  Estimated contribution to main bundle:
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.ceil(p.estimatedKb / 10) }).map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 16, borderRadius: 2,
                      background: p.estimatedKb > 30 ? '#ef4444' : p.estimatedKb > 5 ? '#f59e0b' : '#22c55e',
                    }} />
                  ))}
                  {p.estimatedKb === 0 && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>separate chunk</span>}
                  {p.estimatedKb > 0 && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>~{p.estimatedKb}KB</span>}
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#475569', margin: '0 0 6px', lineHeight: 1.6 }}>
                {p.explanation}
              </p>

              {p.fix && (
                <div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginBottom: 2 }}>✅ Better pattern:</div>
                  <pre style={{ ...codeBlock, margin: 0, background: '#0f2d1f', fontSize: 11 }}>{p.fix}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Import Pattern Audit</h2>
      <p style={hint}>
        For each import, predict whether it's tree-shakeable before revealing. The bar shows the estimated KB contribution to your main bundle.
      </p>

      <ImportPatternAudit />

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Pattern summary:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><code>import X from 'library'</code> — CJS: whole library. ESM with tree-shaking: just the default export (but most libs have one default = all)</li>
          <li><code>import * as X</code> — always costly; prevents static analysis</li>
          <li><code>import {'{ fn }'} from 'esm-library'</code> — safe if library has <code>"sideEffects": false</code></li>
          <li><code>import fn from 'library/fn'</code> — sub-path; always safe regardless of CJS/ESM</li>
          <li><code>import(...)</code> — dynamic; always a separate chunk</li>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 2: Bundle Composition Reasoning ─────────────────
//
// SITUATION
//   Given a component file that does several things, you need to reason
//   about what ends up in the main bundle vs separate chunks. This is
//   exactly what you do when reading a bundle analyzer treemap:
//   you identify why each module is there and whether it should be.
//
//   A bundle analyzer treemap shows:
//   - Each box = one module (or group of modules)
//   - Box area = file size (parsed or gzip)
//   - Color = chunk it belongs to
//   - Hover/click = import chain that caused it to be included
//
// YOUR TASK
//   Read each "app file" below. For each, decide: what's in the main
//   bundle vs what could be a separate chunk? Then click to see the
//   analysis and the recommended refactor.

const BUNDLE_SCENARIOS = [
  {
    id: 'A',
    title: 'Admin dashboard with charts',
    code: `// Dashboard.jsx
import { BarChart, LineChart, PieChart } from 'recharts';  // ~150KB
import { DataTable } from './DataTable';
import { AdminHeader } from './AdminHeader';

export function Dashboard({ data }) {
  return (
    <>
      <AdminHeader />
      <BarChart data={data.bars} />
      <LineChart data={data.lines} />
      <DataTable rows={data.rows} />
    </>
  );
}`,
    mainBundleKb: 200,
    problem: 'recharts (~150KB) is a static import — it ships in the main bundle even for users who never visit the admin dashboard. If Dashboard is a route that only admins see, all users pay the recharts cost.',
    solution: `// Split recharts out with React.lazy:
const LazyDashboard = lazy(() => import('./Dashboard'));

// Dashboard.jsx remains the same — the lazy wrapper
// creates a separate chunk at build time.
// recharts is included only in that chunk, not main.`,
    saving: '~150KB from main bundle',
  },
  {
    id: 'B',
    title: 'Form with validation library',
    code: `// ContactForm.jsx
import { useForm } from 'react-hook-form';    // ~10KB — fine
import * as yup from 'yup';                   // ~40KB — costly pattern
import { yupResolver } from '@hookform/resolvers/yup';

const schema = yup.object({ email: yup.string().email() });

export function ContactForm() {
  const { register, handleSubmit } = useForm({
    resolver: yupResolver(schema)
  });
  // ...
}`,
    mainBundleKb: 55,
    problem: '`import * as yup` pulls all of yup (~40KB). Yup is ESM but the namespace import defeats tree shaking — the bundler must include everything because you might use any export at runtime.',
    solution: `// Use named imports instead:
import { object, string } from 'yup';  // ~15KB — only what you use

const schema = object({ email: string().email() });`,
    saving: '~25KB from main bundle',
  },
  {
    id: 'C',
    title: 'Markdown editor with syntax highlighting',
    code: `// Editor.jsx
import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';    // ~120KB
import hljs from 'highlight.js';                // ~200KB — entire library
import 'highlight.js/styles/github.css';

export function Editor({ value, onChange }) {
  return <MDEditor value={value} onChange={onChange} />;
}`,
    mainBundleKb: 330,
    problem: 'Two issues: (1) MDEditor is synchronously imported — if the editor is behind a tab or modal, all users pay 120KB upfront. (2) highlight.js is the full library with ALL language grammars. Only 1–3 grammars are ever needed.',
    solution: `// Lazy load the editor:
const MDEditor = lazy(() => import('@uiw/react-md-editor'));

// Import only needed grammars:
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('javascript', javascript);
// ~8KB vs ~200KB`,
    saving: '~310KB from main bundle',
  },
];

function BundleScenario({ scenario }) {
  const [revealed, setRevealed] = useState(false);

  const barWidth = Math.min(100, (scenario.mainBundleKb / 350) * 100);
  const barColor = scenario.mainBundleKb > 200 ? '#ef4444' : scenario.mainBundleKb > 80 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Scenario {scenario.id}: {scenario.title}</span>
        <button
          onClick={() => setRevealed(v => !v)}
          style={{ ...btnStyle, padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12 }}
        >
          {revealed ? 'Hide' : 'Analyze'}
        </button>
      </div>

      <pre style={{ ...codeBlock, margin: '0 0 12px', fontSize: 11 }}>{scenario.code}</pre>

      <div style={{ marginBottom: revealed ? 12 : 0 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
          Main bundle contribution: ~{scenario.mainBundleKb}KB
        </div>
        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${barWidth}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
      </div>

      {revealed && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#7f1d1d' }}>
            <strong>Problem:</strong> {scenario.problem}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginBottom: 3 }}>✅ Recommended fix:</div>
            <pre style={{ ...codeBlock, margin: 0, fontSize: 11, background: '#0f2d1f' }}>{scenario.solution}</pre>
          </div>
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            💾 Potential saving: {scenario.saving}
          </div>
        </div>
      )}
    </div>
  );
}

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Bundle Composition Reasoning</h2>
      <p style={hint}>
        Read each file. Identify the bundle problem before clicking "Analyze".
        Think: what's the bundle cost, why, and what would you change?
      </p>

      {BUNDLE_SCENARIOS.map(s => <BundleScenario key={s.id} scenario={s} />)}

      <div style={{ padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The bundle analysis workflow:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Run <code>npx vite-bundle-visualizer</code> (or webpack-bundle-analyzer). Open the treemap.</li>
          <li>Find the largest boxes. For each: does this belong in the main bundle?</li>
          <li>Find the import chain: click a module → see what imported it → trace to your code.</li>
          <li>Apply fixes in priority order: dynamic import, sub-path import, ESM fork, alternative library.</li>
          <li>Re-run and compare. Check that the module is no longer in the main bundle chunk.</li>
        </ol>
      </div>
    </section>
  );
}


// ─── Exercise 3: Duplicate Detection ──────────────────────────
//
// SITUATION
//   One of the most insidious bundle problems: the same package included twice.
//   This happens when two packages depend on different VERSIONS of the same library
//   (e.g., react-query v3 AND react-query v4 both in the tree because two packages
//   pin different versions). The bundler cannot de-duplicate across versions.
//
//   How duplicates appear in the treemap:
//   - Two boxes with the same name but different paths
//     e.g., node_modules/react-query AND node_modules/some-lib/node_modules/react-query
//   - Or different package names that do the same thing (two date libraries, two HTTP clients)
//
// YOUR TASK
//   Read the dependency audit below. Identify which packages are duplicated or
//   redundant, and what the correct resolution is. Then reveal the analysis.

const DEPENDENCY_AUDIT = [
  {
    packages: ['moment (v2.29.4) — 231KB', 'date-fns (v2.30.0) — 26KB'],
    route: 'calendar feature uses date-fns; legacy reporting module uses moment',
    problem: 'Two date libraries. moment is 231KB vs date-fns 26KB. Both do the same job.',
    fix: 'Migrate the legacy reporting module to date-fns. Remove moment entirely. Save ~231KB.',
  },
  {
    packages: ['axios (v1.4.0) — 14KB', 'node-fetch polyfill (v3.3.0) — 8KB', 'ky (v0.33.0) — 4KB'],
    route: 'three different teams added their preferred HTTP client',
    problem: 'Three HTTP clients in the same app. Each handles fetch/XHR in slightly different ways. All do the same thing.',
    fix: 'Standardize on one (native fetch + polyfill for old browsers, or axios). Remove the others. Save ~18KB.',
  },
  {
    packages: ['lodash (v4.17.21) — 72KB', 'lodash (v4.17.19) — 72KB'],
    route: 'your app uses v4.17.21; some-ui-library@2 depends on v4.17.19',
    problem: 'Same package, different patch versions. npm resolves these as separate installs. Both land in the bundle.',
    fix: 'Force a single version with package.json resolutions: `"lodash": "4.17.21"`. Or use sub-path imports to eliminate lodash from your own code — if some-ui-library is the only thing using lodash, only that code pays the cost.',
  },
];

function Exercise3() {
  const [revealed, setRevealed] = useState({});

  return (
    <section>
      <h2>Exercise 3 — Duplicate and Redundant Package Detection</h2>
      <p style={hint}>
        Each scenario shows a package audit — multiple packages doing the same job,
        or the same package included twice. Identify the problem and fix before revealing.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEPENDENCY_AUDIT.map((item, i) => (
          <div key={i} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Found in bundle:</div>
                {item.packages.map((p, j) => (
                  <div key={j} style={{ fontSize: 12, fontFamily: 'monospace', color: '#dc2626', marginBottom: 2 }}>📦 {p}</div>
                ))}
              </div>
              <button
                onClick={() => setRevealed(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{ ...btnStyle, padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12, flexShrink: 0, marginLeft: 8 }}
              >
                {revealed[i] ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
              <em>Context: {item.route}</em>
            </div>
            {revealed[i] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div style={{ padding: '8px 12px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#7f1d1d' }}>
                  <strong>Problem:</strong> {item.problem}
                </div>
                <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#14532d' }}>
                  <strong>Fix:</strong> {item.fix}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Finding duplicates in the real treemap:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Search the treemap for a package name — if it appears in two different paths, it's duplicated.</li>
          <li>Run <code>npm ls lodash</code> (or <code>yarn why lodash</code>) to see who depends on each version.</li>
          <li>Use <code>bundlephobia.com</code> before adding any new dependency to check if you already have something that does the same thing.</li>
          <li>Audit for "utility" packages that overlap: moment/date-fns/dayjs, axios/ky/fetch, lodash/ramda — each team reaching for their preference creates duplicates at scale.</li>
        </ul>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 12 — Bundle Analysis
      </h1>

      <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, marginBottom: 28, fontSize: 13, color: '#1e40af' }}>
        <strong>Note:</strong> Bundle analysis is a build-time skill. These exercises train the mental
        model — recognizing bad import patterns in code review, before the bundle analyzer even runs.
        In real projects, run <code>npx vite-bundle-visualizer</code> after building to verify.
      </div>

      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
