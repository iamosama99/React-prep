// ============================================================
// Topic:   Webpack vs Vite vs Turbopack
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: SCENARIO DECISIONS + SIMULATION + MENTAL MODEL
//
// You can't run real bundlers here, but you CAN:
//   1. Build intuition for how each tool processes a file change
//   2. Choose the right tool for realistic project scenarios
//   3. Simulate HMR behaviour across the three tools
//   4. Identify dev/prod parity risks in Vite
//
// Run: npm run tutorial 01-webpack-vite-turbopack
// ============================================================

import { useState, useEffect, useRef, useCallback, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Build Pipeline Stage Classifier
//
// Eight scenarios describing what happens when a file changes.
// For each, decide: which tool is being described, and why?
//
// Think first — then click a button to lock in your answer,
// then Reveal to see the reasoning.
// ─────────────────────────────────────────────────────────────

type Tool = 'Webpack' | 'Vite' | 'Turbopack';

interface PipelineScenario {
  id: number;
  description: string;
  question: string;
  answer: Tool;
  reasoning: string;
  detail: string;
}

const PIPELINE_SCENARIOS: PipelineScenario[] = [
  {
    id: 1,
    description: 'You save a Button.tsx component. The dev server reflects the change in ~40ms. The rest of the app is untouched.',
    question: 'Which tool? Why is only one module re-processed?',
    answer: 'Vite',
    reasoning: 'Vite serves native ES modules. Each module is its own file. On save, Vite re-transforms only the changed file and sends an HMR update invalidating that single module. The browser re-requests just that file.',
    detail: 'HMR scope: single changed module. Speed: <50ms typical.',
  },
  {
    id: 2,
    description: 'You start the dev server on a 200,000-line React app. You wait 28 seconds before the first page loads.',
    question: 'Which tool forces this full upfront work?',
    answer: 'Webpack',
    reasoning: 'Webpack must build the entire dependency graph and run all loaders before it can serve anything. The dev server doesn\'t start until the full bundle is emitted. Cold start time scales with app size.',
    detail: 'Webpack bundles everything first, then serves. Large apps = long cold starts.',
  },
  {
    id: 3,
    description: 'You save a deeply nested utility function. The HMR update completes in ~10ms and React state in unrelated components is preserved.',
    question: 'Which tool achieves ~10ms HMR at this scale?',
    answer: 'Turbopack',
    reasoning: 'Turbopack tracks a fine-grained task graph. Each transform is a pure function of its inputs. On change, only nodes with changed inputs are re-executed. Rust native speed + incremental computation = ~10ms in Next.js benchmarks.',
    detail: 'Turbopack incremental task graph: only the affected subgraph reruns.',
  },
  {
    id: 4,
    description: 'First dev server start takes 4 seconds. You restart — it starts in <1 second. You didn\'t change any npm packages.',
    question: 'Which tool does this pre-bundling optimisation? What did it do on the first run?',
    answer: 'Vite',
    reasoning: 'Vite pre-bundles node_modules with esbuild on first run: it converts CJS packages to ESM and merges small packages to reduce browser request count. Results are cached in node_modules/.vite. Subsequent starts use the cache.',
    detail: 'Pre-bundle cache lives at node_modules/.vite. Cleared when package.json changes.',
  },
  {
    id: 5,
    description: 'You add a new npm package that only ships as CommonJS. The dev server crashes with "require is not defined" in the browser console.',
    question: 'Which tool + scenario causes this, and what is the fix?',
    answer: 'Vite',
    reasoning: 'Vite dev serves native ESM. CJS packages must be pre-bundled to ESM. If Vite missed a CJS package (rare but possible), the browser sees a require() call. Fix: add the package to optimizeDeps.include in vite.config.ts.',
    detail: 'vite.config.ts: optimizeDeps: { include: ["package-name"] }',
  },
  {
    id: 6,
    description: 'Your app works perfectly in dev. After `npm run build` + deploy, one feature silently breaks — a circular import now resolves in a different order.',
    question: 'Which tool has this dev/prod parity gap?',
    answer: 'Vite',
    reasoning: 'Vite dev uses native ESM (module evaluation order is live). Vite prod uses Rollup bundling (evaluation order can differ for circular imports). The same code can behave differently. Fix: run `vite build && vite preview` before every deploy.',
    detail: 'Dev: native ESM. Prod: Rollup bundle. Circular deps evaluate in different order.',
  },
  {
    id: 7,
    description: 'A team writes a custom asset pipeline — SVG files are compiled to React components, with special transforms per directory. They need to chain 4 custom loaders.',
    question: 'Which tool has the most mature ecosystem for complex custom loaders?',
    answer: 'Webpack',
    reasoning: 'Webpack has thousands of loaders and plugins, a mature plugin API, and decades of complex asset pipeline use. Vite plugins cover common cases but the ecosystem is smaller. This is one of the few remaining reasons to choose Webpack for a new project.',
    detail: 'Webpack loader ecosystem: unmatched for niche transforms. Vite plugin API: growing but smaller.',
  },
  {
    id: 8,
    description: 'A Next.js app has 30-second cold starts in dev. No custom Webpack config, no special loaders. The team wants faster HMR without migrating off Next.js.',
    question: 'What is the right move and which tool does it use?',
    answer: 'Turbopack',
    reasoning: 'Turbopack is built into Next.js. Enable it with `next dev --turbo`. No migration needed — same Next.js project, just a faster dev engine. Turbopack is the correct answer when you\'re already on Next.js and Webpack is the bottleneck.',
    detail: 'next dev --turbo — one flag, no migration, incremental Rust-native computation.',
  },
];

type PipelineGuessState = Record<number, { guess: Tool | null; revealed: boolean }>;

const TOOL_COLORS: Record<Tool, string> = {
  Webpack: '#1a73e8',
  Vite: '#a855f7',
  Turbopack: '#e67e22',
};

function PipelineCard({ scenario, state, onGuess, onReveal }: {
  scenario: PipelineScenario;
  state: { guess: Tool | null; revealed: boolean };
  onGuess: (t: Tool) => void;
  onReveal: () => void;
}) {
  const isCorrect = state.guess === scenario.answer;
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '10px',
      overflow: 'hidden',
      background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
      transition: 'background 0.3s',
    }}>
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #eee', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Scenario #{scenario.id}</strong>
        {state.revealed && (
          <span style={{
            padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
            background: TOOL_COLORS[scenario.answer], color: '#fff',
          }}>
            {scenario.answer}
          </span>
        )}
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <p style={{ margin: '0 0 0.5rem', color: '#333', lineHeight: 1.6 }}>{scenario.description}</p>
        <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem', fontStyle: 'italic' }}>{scenario.question}</p>

        {!state.revealed && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['Webpack', 'Vite', 'Turbopack'] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => onGuess(t)}
                style={{
                  padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid',
                  borderColor: state.guess === t ? TOOL_COLORS[t] : '#ddd',
                  background: state.guess === t ? TOOL_COLORS[t] : '#fff',
                  color: state.guess === t ? '#fff' : '#333',
                  cursor: 'pointer', fontWeight: state.guess === t ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >{t}</button>
            ))}
            {state.guess && (
              <button
                onClick={onReveal}
                style={{
                  padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid #333',
                  background: '#333', color: '#fff', cursor: 'pointer', marginLeft: 'auto',
                }}
              >Reveal →</button>
            )}
          </div>
        )}

        {state.revealed && (
          <div>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#333' }}>
              {isCorrect ? '✓ Correct' : `✗ You chose ${state.guess} — answer is ${scenario.answer}`}
            </p>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#444', lineHeight: 1.6 }}>
              <strong>Why:</strong> {scenario.reasoning}
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', fontFamily: 'monospace', background: '#f5f5f5', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
              {scenario.detail}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Exercise1_PipelineClassifier() {
  const [states, setStates] = useState<PipelineGuessState>(() =>
    Object.fromEntries(PIPELINE_SCENARIOS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const score = PIPELINE_SCENARIOS.filter(s => states[s.id].revealed && states[s.id].guess === s.answer).length;
  const revealed = PIPELINE_SCENARIOS.filter(s => states[s.id].revealed).length;

  return (
    <section>
      <h2>Exercise 1: Build Pipeline Stage Classifier</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Each scenario describes observable dev-server behaviour. Identify which tool is responsible
        and why. Think through the architecture before guessing.
      </p>
      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> answered so far
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {PIPELINE_SCENARIOS.map(s => (
          <PipelineCard
            key={s.id}
            scenario={s}
            state={states[s.id]}
            onGuess={t => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], guess: t } }))}
            onReveal={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], revealed: true } }))}
          />
        ))}
      </div>
      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is the fundamental architectural difference between Webpack dev mode and Vite dev mode?</li>
          <li>What does Vite pre-bundling do and where is its cache stored?</li>
          <li>Why can the same code behave differently in Vite dev vs Vite prod?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — "Which Tool for This Project?"
//
// Six project situations. Pick the right tool and reveal reasoning.
// ─────────────────────────────────────────────────────────────

interface ProjectScenario {
  id: number;
  title: string;
  situation: string;
  constraints: string[];
  answer: Tool;
  reasoning: string;
  nuance?: string;
}

const PROJECT_SCENARIOS: ProjectScenario[] = [
  {
    id: 1,
    title: 'Legacy CRA Migration',
    situation: 'A CRA (Create React App) app with 3 custom Babel plugins: decorators, styled-components, and a GraphQL fragment colocator. Cold starts take 40 seconds. Team wants it faster.',
    constraints: ['Must keep all 3 Babel plugins', 'No time to rewrite styled-components to CSS modules', 'GraphQL plugin has no SWC port yet'],
    answer: 'Vite',
    reasoning: 'Vite is the right migration target. Vite supports custom Babel plugins via @vitejs/plugin-react (pass babelOptions). The GraphQL fragment plugin and styled-components plugin both have Vite equivalents or can run through Vite\'s Babel integration. Cold starts drop to near-instant.',
    nuance: 'If the Babel plugins were truly incompatible with Vite, staying on Webpack is better than breaking the build.',
  },
  {
    id: 2,
    title: 'Greenfield Marketing + Dashboard',
    situation: 'New project in 2025: marketing site + authenticated dashboard, both in one React repo. No legacy constraints. Team of 4.',
    constraints: ['No existing tooling investment', 'Want fast HMR', 'Standard TypeScript + React + CSS Modules'],
    answer: 'Vite',
    reasoning: 'Vite is the correct default for any new React project in 2025. Near-instant cold starts, <50ms HMR, simple config. This is the greenfield scenario where Vite wins cleanly with no tradeoffs.',
    nuance: 'If this were a Next.js project (for SSR/SSG), Turbopack would be the dev server choice automatically.',
  },
  {
    id: 3,
    title: 'Large Next.js App — Slow Cold Starts',
    situation: 'Next.js 14 app, 180k lines of code, Webpack dev server. Engineers wait 35–45 seconds per cold start. HMR is 1.5–3s.',
    constraints: ['Must stay on Next.js (SSR + API routes required)', 'No custom webpack.config loaders', 'All standard plugins (styled-components via SWC transform)'],
    answer: 'Turbopack',
    reasoning: 'This is exactly Turbopack\'s use case. Enable with `next dev --turbo`. No migration, no config rewrite. Vercel benchmarks show 10x faster HMR. The team stays on Next.js — they just flip one flag.',
    nuance: 'Turbopack prod builds are in Next.js 15+ experimental. Use for dev now; wait for stable prod.',
  },
  {
    id: 4,
    title: 'Micro-frontend Platform',
    situation: 'A platform team builds a host app that dynamically loads independently deployed micro-frontends at runtime. Each team ships their own bundle.',
    constraints: ['Module Federation is the chosen architecture', 'Runtime bundle sharing across teams', 'React shared across all micro-frontends'],
    answer: 'Webpack',
    reasoning: 'Webpack Module Federation is the only mature, battle-tested solution for runtime bundle sharing. Vite has experimental Module Federation plugins, but they\'re not production-stable. This is one of the few cases in 2025 where Webpack is still the right choice for a new project.',
    nuance: 'Watch Vite Module Federation — it\'s improving rapidly. Re-evaluate in 6–12 months.',
  },
  {
    id: 5,
    title: 'Open Source Component Library',
    situation: 'A team publishes a React component library to npm. They want to build ESM + CJS outputs with TypeScript declarations. No dev server needed.',
    constraints: ['Must output both ESM and CJS for consumers', 'TypeScript .d.ts files required', 'Tree-shaking must work for consumers'],
    answer: 'Vite',
    reasoning: 'Vite library mode (build.lib) is purpose-built for this. One config produces ESM + CJS outputs with proper externalization of React. Rollup (Vite\'s prod bundler) has excellent tree-shaking. tsc handles .d.ts generation separately.',
    nuance: 'Webpack can do this too, but the config is significantly more complex.',
  },
  {
    id: 6,
    title: 'Existing Webpack 4 — No Migration Budget',
    situation: 'A large enterprise app on Webpack 4. Custom loaders for SVG icons, GLSL shaders, and legacy Flash-era assets. No budget or time for migration.',
    constraints: ['Custom loaders with no Vite equivalents', 'Team unfamiliar with Vite or Turbopack', 'Production stability is paramount'],
    answer: 'Webpack',
    reasoning: 'Webpack. No migration needed — the custom loaders work, production is stable. Upgrade from v4 to v5 for the speed improvement and then add persistent caching (cache: { type: "filesystem" }). This reduces Webpack cold starts by 80%+ on repeat runs.',
    nuance: 'cache: { type: "filesystem" } in webpack.config.js is the highest-ROI Webpack perf change.',
  },
];

type ProjectGuessState = Record<number, { guess: Tool | null; revealed: boolean }>;

function ProjectCard({ scenario, state, onGuess, onReveal }: {
  scenario: ProjectScenario;
  state: { guess: Tool | null; revealed: boolean };
  onGuess: (t: Tool) => void;
  onReveal: () => void;
}) {
  const isCorrect = state.guess === scenario.answer;
  return (
    <div style={{
      border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden',
      background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
      transition: 'background 0.3s',
    }}>
      <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
        <strong>#{scenario.id} — {scenario.title}</strong>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        <p style={{ margin: '0 0 0.5rem', color: '#333', lineHeight: 1.6 }}>{scenario.situation}</p>
        <ul style={{ margin: '0 0 1rem', paddingLeft: '1.25rem', color: '#666', fontSize: '0.88rem' }}>
          {scenario.constraints.map((c, i) => <li key={i}>{c}</li>)}
        </ul>

        {!state.revealed && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['Webpack', 'Vite', 'Turbopack'] as Tool[]).map(t => (
              <button
                key={t}
                onClick={() => onGuess(t)}
                style={{
                  padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid',
                  borderColor: state.guess === t ? TOOL_COLORS[t] : '#ddd',
                  background: state.guess === t ? TOOL_COLORS[t] : '#fff',
                  color: state.guess === t ? '#fff' : '#333',
                  cursor: 'pointer', fontWeight: state.guess === t ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >{t}</button>
            ))}
            {state.guess && (
              <button
                onClick={onReveal}
                style={{ padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
              >Reveal →</button>
            )}
          </div>
        )}

        {state.revealed && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ padding: '0.3rem 1rem', borderRadius: '20px', background: TOOL_COLORS[scenario.answer], color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}>
                {scenario.answer}
              </span>
              <span style={{ fontSize: '1rem' }}>
                {isCorrect ? '✓ Correct' : `✗ You chose ${state.guess}`}
              </span>
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.6 }}>
              <strong>Why:</strong> {scenario.reasoning}
            </p>
            {scenario.nuance && (
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#777', fontStyle: 'italic' }}>
                Nuance: {scenario.nuance}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Exercise2_ToolSelector() {
  const [states, setStates] = useState<ProjectGuessState>(() =>
    Object.fromEntries(PROJECT_SCENARIOS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const score = PROJECT_SCENARIOS.filter(s => states[s.id].revealed && states[s.id].guess === s.answer).length;
  const revealed = PROJECT_SCENARIOS.filter(s => states[s.id].revealed).length;

  return (
    <section>
      <h2>Exercise 2: Which Tool for This Project?</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Six project situations. Choose the right build tool for each. The nuances matter — there
        are legitimate reasons to pick each tool.
      </p>
      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> answered so far
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {PROJECT_SCENARIOS.map(s => (
          <ProjectCard
            key={s.id}
            scenario={s}
            state={states[s.id]}
            onGuess={t => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], guess: t } }))}
            onReveal={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], revealed: true } }))}
          />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — HMR Mental Model Simulator
//
// Click "Simulate file change" on any tool to watch the
// processing steps animate in, one by one.
// Compare the scope, depth, and timing across tools.
// ─────────────────────────────────────────────────────────────

interface HMRStep {
  label: string;
  duration: number; // ms this step takes in the simulation
  detail: string;
}

const HMR_STEPS: Record<Tool, HMRStep[]> = {
  Webpack: [
    { label: '1. Detect file change (watcher)', duration: 50, detail: 'chokidar detects the save' },
    { label: '2. Invalidate module in graph', duration: 100, detail: 'mark module + dependents as stale' },
    { label: '3. Re-run loaders on changed file', duration: 300, detail: 'babel-loader → ts-loader re-transpile' },
    { label: '4. Re-run loaders on dependents', duration: 600, detail: 'rebuild affected module subgraph' },
    { label: '5. Emit new bundle chunk', duration: 900, detail: 'write updated chunk to memory' },
    { label: '6. Send HMR update to browser', duration: 950, detail: 'browser applies the new module' },
  ],
  Vite: [
    { label: '1. Detect file change (watcher)', duration: 10, detail: 'chokidar detects the save' },
    { label: '2. Invalidate module in cache', duration: 15, detail: 'mark only this module as stale' },
    { label: '3. Send HMR update signal to browser', duration: 25, detail: 'browser receives invalidation message' },
    { label: '4. Browser re-requests changed module', duration: 35, detail: 'browser fetches /src/Button.tsx' },
    { label: '5. Vite transforms on-demand (esbuild)', duration: 45, detail: 'esbuild strips TS/JSX — very fast' },
    { label: '6. Module applied, state preserved', duration: 50, detail: 'react-refresh patches component in place' },
  ],
  Turbopack: [
    { label: '1. Detect file change (watcher)', duration: 5, detail: 'Rust watcher detects the save' },
    { label: '2. Look up affected task graph nodes', duration: 8, detail: 'find all tasks whose inputs changed' },
    { label: '3. Re-run only affected tasks (parallel)', duration: 12, detail: 'Rust parallelises across CPU cores' },
    { label: '4. Cache everything else unchanged', duration: 13, detail: 'untouched nodes served from cache instantly' },
    { label: '5. Send precise HMR update to browser', duration: 15, detail: 'minimal delta sent to browser' },
    { label: '6. Module applied, state preserved', duration: 18, detail: 'react-refresh patches component in place' },
  ],
};

function HMRColumn({ tool }: { tool: Tool }) {
  const [running, setRunning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const steps = HMR_STEPS[tool];
  const totalMs = steps[steps.length - 1].duration;
  const isComplete = completedSteps.length === steps.length;

  function simulate() {
    // Clear any existing timers
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    setCompletedSteps([]);
    setRunning(true);

    steps.forEach((step, idx) => {
      const t = setTimeout(() => {
        setCompletedSteps(prev => [...prev, idx]);
        if (idx === steps.length - 1) setRunning(false);
      }, step.duration);
      timerRefs.current.push(t);
    });
  }

  useEffect(() => {
    return () => timerRefs.current.forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      flex: 1, minWidth: '220px',
      border: `2px solid ${TOOL_COLORS[tool]}`,
      borderRadius: '10px', overflow: 'hidden',
    }}>
      <div style={{ padding: '0.75rem 1rem', background: TOOL_COLORS[tool], color: '#fff' }}>
        <strong style={{ fontSize: '1rem' }}>{tool}</strong>
        <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.9 }}>
          HMR time: ~{totalMs}ms
        </div>
      </div>

      <div style={{ padding: '0.75rem 1rem' }}>
        {steps.map((step, idx) => (
          <div
            key={idx}
            style={{
              padding: '0.4rem 0.6rem',
              marginBottom: '0.35rem',
              borderRadius: '5px',
              fontSize: '0.78rem',
              background: completedSteps.includes(idx) ? '#e8f5e9' : '#f5f5f5',
              borderLeft: completedSteps.includes(idx) ? `3px solid ${TOOL_COLORS[tool]}` : '3px solid #ddd',
              transition: 'all 0.2s',
              color: completedSteps.includes(idx) ? '#222' : '#aaa',
            }}
          >
            <div style={{ fontWeight: completedSteps.includes(idx) ? 600 : 400 }}>{step.label}</div>
            {completedSteps.includes(idx) && (
              <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '2px' }}>{step.detail}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '0.5rem 1rem 1rem' }}>
        <button
          onClick={simulate}
          disabled={running}
          style={{
            width: '100%', padding: '0.5rem', borderRadius: '6px', border: 'none',
            background: running ? '#ccc' : TOOL_COLORS[tool],
            color: '#fff', cursor: running ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '0.85rem',
            transition: 'background 0.2s',
          }}
        >
          {running ? 'Simulating...' : isComplete ? 'Run again' : 'Simulate change'}
        </button>
      </div>
    </div>
  );
}

function Exercise3_HMRSimulator() {
  return (
    <section>
      <h2>Exercise 3: HMR Mental Model Simulator</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Click "Simulate change" on each tool to see exactly which steps run on a file save.
        The animation is proportional to relative HMR time. Compare what each tool re-processes.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {(['Webpack', 'Vite', 'Turbopack'] as Tool[]).map(tool => (
          <HMRColumn key={tool} tool={tool} />
        ))}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Webpack re-processes dependent modules. Why does Vite not need to?</li>
          <li>Turbopack's key claim is "incremental computation." What does that mean precisely — what is the unit of caching?</li>
          <li>All three use react-refresh for state preservation. What would happen without it?</li>
          <li>Vite HMR sends an invalidation signal first, then the browser re-requests. Webpack sends the new bundle. What's the practical difference?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Dev/Prod Parity Risk Detector
//
// Four code snippets. For each: does Vite dev and Vite prod
// behave the same? If not — what's the difference and why?
//
// The goal: understand when `vite build && vite preview` is
// critical to run before deploying.
// ─────────────────────────────────────────────────────────────

interface ParityScenario {
  id: number;
  title: string;
  code: string;
  question: string;
  hasRisk: boolean;
  devBehavior: string;
  prodBehavior: string;
  explanation: string;
  fix?: string;
}

const PARITY_SCENARIOS: ParityScenario[] = [
  {
    id: 1,
    title: 'Circular Import — Side Effect Order',
    code: `// utils/logger.ts
import { appConfig } from './config';
export const log = (msg: string) => console.log(appConfig.prefix, msg);

// utils/config.ts
import { log } from './logger';
export const appConfig = { prefix: '[App]' };
log('Config initialized');   // side effect`,
    question: 'Does this circular import behave the same in Vite dev vs Vite prod?',
    hasRisk: true,
    devBehavior: 'DEV: Native ESM — module evaluation order can differ per-request depending on which module the browser requests first. May work by accident.',
    prodBehavior: 'PROD: Rollup bundles and inlines modules. It must pick an evaluation order — may choose differently than the browser, causing appConfig to be undefined when log() first runs.',
    explanation: 'Circular imports with side effects are the #1 Vite dev/prod parity bug. The evaluation order is undefined behavior in both environments but can produce different results because the underlying module systems differ.',
    fix: 'Remove the circular dependency. Use a dedicated initialization module with no circular imports.',
  },
  {
    id: 2,
    title: 'CJS Package: default import',
    code: `// Using a CJS-only npm package
import moment from 'moment';  // CJS package

const formatted = moment().format('YYYY-MM-DD');`,
    question: 'Does this CJS default import work the same in dev and prod?',
    hasRisk: true,
    devBehavior: 'DEV: Vite pre-bundles moment with esbuild, converting CJS to ESM. The default import works.',
    prodBehavior: 'PROD: Rollup handles CJS interop differently. In some edge cases, the default export resolves to the module object rather than the function — `moment` becomes undefined or an object.',
    explanation: 'CJS default import interop is a known Vite parity risk. esbuild (dev pre-bundle) and Rollup (prod) handle CJS->ESM conversion slightly differently. `esModuleInterop` settings matter.',
    fix: 'Use: import * as moment from "moment" or switch to a native ESM alternative like date-fns.',
  },
  {
    id: 3,
    title: 'CSS Module: camelCase vs kebab-case',
    code: `/* Button.module.css */
.button-primary { background: blue; }
.buttonSecondary { background: green; }

// Button.tsx
import styles from './Button.module.css';
const el = (
  <div>
    <button className={styles['button-primary']}>A</button>
    <button className={styles.buttonSecondary}>B</button>
  </div>
);`,
    question: 'Is CSS module access consistent between dev and prod?',
    hasRisk: false,
    devBehavior: 'DEV: Vite transforms CSS modules, both kebab and camelCase access work as expected.',
    prodBehavior: 'PROD: Same behavior — Rollup CSS module transform matches dev. This is one area where Vite has good parity.',
    explanation: 'CSS modules are one area where Vite dev/prod parity is reliable. The same PostCSS + CSS module transform runs in both environments. No risk here — but kebab-case property access must use bracket notation.',
    fix: 'No fix needed. Just note that styles["button-primary"] (bracket) is required for kebab-case class names.',
  },
  {
    id: 4,
    title: 'Dynamic Import with Variable Path',
    code: `// Loading locale files dynamically
const locale = getUserLocale(); // returns 'en' | 'fr' | 'de'

const messages = await import(\`./locales/\${locale}.json\`);`,
    question: 'Does this dynamic import with a template literal work the same in dev and prod?',
    hasRisk: true,
    devBehavior: 'DEV: Works fine — Vite resolves the template literal path on-demand when the import() executes.',
    prodBehavior: 'PROD: Rollup must statically analyze the import at build time to know which files to include in the bundle. A fully dynamic path can cause Rollup to miss some locale files or throw a build error. Rollup may warn about "dynamic import".',
    explanation: 'Dynamic imports with runtime-computed paths are a build-time analysis challenge. Rollup (prod) needs to know all possible values at build time to include them in the bundle. Vite dev doesn\'t have this constraint.',
    fix: 'Use a known pattern: import(`./locales/${locale}.json`) with only a limited set of values, or use import.meta.glob to statically declare all locale files: const modules = import.meta.glob("./locales/*.json").',
  },
];

function Exercise4_ParityDetector() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [guesses, setGuesses] = useState<Record<number, boolean | null>>({});

  function handleGuess(id: number, hasRisk: boolean) {
    setGuesses(prev => ({ ...prev, [id]: hasRisk }));
  }

  function handleReveal(id: number) {
    setRevealed(prev => ({ ...prev, [id]: true }));
  }

  return (
    <section>
      <h2>Exercise 4: Dev/Prod Parity Risk Detector</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Vite dev (native ESM) and Vite prod (Rollup bundle) can behave differently.
        For each snippet: does it have a dev/prod parity risk? Decide first, then reveal.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
        {PARITY_SCENARIOS.map(s => {
          const guess = guesses[s.id];
          const isRevealed = revealed[s.id];
          const isCorrect = guess === s.hasRisk;

          return (
            <div key={s.id} style={{
              border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden',
              background: isRevealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
              transition: 'background 0.3s',
            }}>
              <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>#{s.id} — {s.title}</strong>
                {isRevealed && (
                  <span style={{
                    padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                    background: s.hasRisk ? '#e53935' : '#27ae60', color: '#fff',
                  }}>
                    {s.hasRisk ? 'RISK' : 'SAFE'}
                  </span>
                )}
              </div>

              <div style={{ padding: '1rem 1.25rem' }}>
                <pre style={{
                  background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px',
                  fontSize: '0.78rem', overflowX: 'auto', lineHeight: 1.6, margin: '0 0 1rem',
                  whiteSpace: 'pre-wrap',
                }}>
                  {s.code}
                </pre>

                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontStyle: 'italic', color: '#555' }}>{s.question}</p>

                {!isRevealed && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => handleGuess(s.id, true)}
                      style={{
                        padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid',
                        borderColor: guess === true ? '#e53935' : '#ddd',
                        background: guess === true ? '#e53935' : '#fff',
                        color: guess === true ? '#fff' : '#333', cursor: 'pointer',
                        transition: 'all 0.15s', fontWeight: guess === true ? 700 : 400,
                      }}
                    >Has parity risk</button>
                    <button
                      onClick={() => handleGuess(s.id, false)}
                      style={{
                        padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid',
                        borderColor: guess === false ? '#27ae60' : '#ddd',
                        background: guess === false ? '#27ae60' : '#fff',
                        color: guess === false ? '#fff' : '#333', cursor: 'pointer',
                        transition: 'all 0.15s', fontWeight: guess === false ? 700 : 400,
                      }}
                    >Dev = Prod (safe)</button>
                    {guess !== null && guess !== undefined && (
                      <button
                        onClick={() => handleReveal(s.id)}
                        style={{ padding: '0.4rem 1.1rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
                      >Reveal →</button>
                    )}
                  </div>
                )}

                {isRevealed && (
                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: '#333' }}>
                      {isCorrect ? '✓ Correct' : `✗ Incorrect`}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: '#e3f2fd', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                        <strong>Dev (native ESM):</strong>
                        <p style={{ margin: '0.25rem 0 0', color: '#333' }}>{s.devBehavior}</p>
                      </div>
                      <div style={{ background: '#fce4ec', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                        <strong>Prod (Rollup):</strong>
                        <p style={{ margin: '0.25rem 0 0', color: '#333' }}>{s.prodBehavior}</p>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#444', lineHeight: 1.6 }}>
                      <strong>Why:</strong> {s.explanation}
                    </p>
                    {s.fix && (
                      <p style={{ margin: 0, fontSize: '0.83rem', color: '#2e7d32', fontStyle: 'italic' }}>
                        Fix: {s.fix}
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
          <li>What single command should you always run before deploying a Vite app to catch parity issues?</li>
          <li>Why does the same circular import behave differently in dev vs prod?</li>
          <li>What is <code>import.meta.glob</code> and when should you use it instead of a template-literal dynamic import?</li>
        </ol>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Webpack vs Vite vs Turbopack</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> You can't run real bundlers here. These exercises build the mental models
      and decision-making intuition that interviewers probe. The simulations use timed animations to
      make HMR timing differences tangible.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_PipelineClassifier />
      <hr />
      <Exercise2_ToolSelector />
      <hr />
      <Exercise3_HMRSimulator />
      <hr />
      <Exercise4_ParityDetector />
    </div>
  </div>
);

export default App;
