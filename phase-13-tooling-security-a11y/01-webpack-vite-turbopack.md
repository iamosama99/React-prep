# Webpack vs Vite vs Turbopack

## Quick Reference

| Tool | Dev server | Prod build | Language | Key idea |
|---|---|---|---|---|
| Webpack | Bundle-based | Yes | JS/Node | Bundle everything, then serve |
| Vite | Native ESM | Rollup | JS/Node | Serve unbundled in dev, bundle for prod |
| Turbopack | Incremental | In progress | Rust | Incremental computation, Rust speed |

---

## Why This Matters

Build tooling is one of those areas senior engineers are expected to have opinions on, not just pass-through knowledge. Interviewers want to know whether you understand the tradeoffs or just ran `npm create vite`.

---

## Webpack

Webpack is the original JavaScript bundler. It parses your entire dependency graph, runs loaders, and outputs one or more bundles. In dev mode it does the same thing — which is why cold starts on large apps take 10–30 seconds.

**How it works:**
1. Entry point → traverse all imports → build a dependency graph
2. Run loaders (Babel for JS, css-loader for CSS, etc.)
3. Emit bundle(s)

```js
// webpack.config.js
module.exports = {
  entry: './src/index.tsx',
  output: { filename: 'bundle.js', path: path.resolve(__dirname, 'dist') },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
};
```

**Strengths:**
- Mature ecosystem (thousands of plugins and loaders)
- Fine-grained control over code splitting, chunk naming, asset handling
- Battle-tested in production at scale

**Weaknesses:**
- Slow cold starts in dev — it bundles everything before serving anything
- Config complexity is notoriously high
- HMR (Hot Module Replacement) updates can be slow on large graphs

---

## Vite

Vite (French for "fast") takes a fundamentally different approach for development: it doesn't bundle at all. Instead, it leverages native ES modules in the browser. The browser requests files directly; Vite serves them individually, only transforming what's requested.

**How dev mode works:**
1. Browser requests `/src/main.tsx`
2. Vite transforms it on-demand (esbuild for TS/JSX stripping, very fast)
3. Browser imports from the response, triggers more requests for dependencies
4. Each module is cached; unchanged files are served instantly

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

**Strengths:**
- Near-instant cold starts (no upfront bundling)
- HMR updates are scoped to the changed module only — typically <50ms
- Simple config for the common case

**Weaknesses:**
- Dev/prod parity gap: dev uses native ESM, prod uses Rollup bundles — subtle behavioral differences possible
- Very large dependency trees can cause the browser to make hundreds of requests in dev
- Rollup-based prod builds are slightly slower than esbuild-only solutions

**Pre-bundling:** Vite pre-bundles `node_modules` with esbuild on first run, converting CJS to ESM and merging small packages. This is why the first dev start takes a moment, and subsequent ones don't.

---

## Turbopack

Turbopack is Vercel's Rust-based successor to Webpack, designed around **incremental computation**. Instead of re-computing the full bundle on change, it tracks which parts of the computation graph are affected and only recomputes those.

**Key idea:** Turbopack uses a task graph where each node is a deterministic function of its inputs. On change, only nodes with changed inputs are re-executed. Think of it like a build cache with surgical invalidation.

**Status (as of 2025):**
- Stable for Next.js dev server (`next dev --turbo`)
- Production builds: available in Next.js 15+ (experimental stabilizing)
- Standalone use outside Next.js: not yet available

**Performance claims:** Vercel benchmarks show 10x faster HMR than Webpack and 700x faster cold starts on large Next.js apps. Take vendor benchmarks with a grain of salt, but the Rust-native architecture does eliminate major JS event loop bottlenecks.

---

## HMR Comparison

Hot Module Replacement is where the dev experience difference is most felt.

| | Webpack HMR | Vite HMR | Turbopack HMR |
|---|---|---|---|
| Scope of update | Full module subgraph | Single changed module | Affected subgraph only |
| Typical speed (small change) | 500ms–2s | <50ms | ~10ms |
| React state preservation | Via react-refresh | Via react-refresh | Via react-refresh |

---

## When to Use What

**Vite:** New projects, Remix, SvelteKit, Vue. Any project that doesn't need Webpack's ecosystem depth. This is the correct default in 2025.

**Webpack:** Legacy projects already on Webpack. Projects with complex asset pipelines, Module Federation, or custom loaders that don't have Vite equivalents.

**Turbopack:** Next.js projects, especially large ones where Webpack dev speed is painful. Enable with `next dev --turbo`.

---

> **Check yourself:** Your team has a large React SPA currently on Webpack with a 45-second cold start. What's the migration path? Vite is the pragmatic move — it drops in with `@vitejs/plugin-react` and most Webpack config has direct Vite equivalents. The main risk is the dev/prod parity gap: run your full test suite in both environments before switching. If you're on Next.js, enable Turbopack instead and skip the migration entirely.

---

## Self-Assessment

- [ ] I can explain why Vite's dev server is faster than Webpack's without saying "it uses esbuild"
- [ ] I know what Vite pre-bundling is and why it exists
- [ ] I understand the dev/prod parity risk with Vite
- [ ] I can describe what "incremental computation" means for Turbopack
- [ ] I know when Webpack is still the right choice

---

## Interview Q&A

**Q: Why is Vite faster than Webpack in development? `High`**

A: Webpack bundles the entire dependency graph before the dev server can serve anything — cold start time scales with app size. Vite skips bundling entirely in dev. It serves source files as native ES modules directly to the browser, transforming them individually on-demand with esbuild. Esbuild is 10–100x faster than Babel/tsc for transforms because it's written in Go with parallelism. The browser handles module resolution; Vite only processes what's actually requested.

---

**Q: What is the dev/prod parity issue with Vite? `Medium`**

A: In dev, Vite serves files as native ES modules without bundling. In production, it uses Rollup to create optimized bundles. These two environments handle edge cases differently — for example, the order of side effects in circular dependencies, CJS interop behavior, and how CSS is loaded. A bug that only reproduces in production (but not Vite dev) is often a parity gap issue. Running `vite build && vite preview` before deploying catches most of these.

---

**Q: What makes Turbopack different from just "using Rust"? `Low`**

A: The Rust implementation helps, but the architectural difference is the incremental computation model. Turbopack tracks a fine-grained task graph where each transformation is a pure function of its inputs. When a file changes, only tasks whose inputs changed are re-run — everything else is served from cache. Webpack, even in watch mode, re-processes the affected module subgraph without this level of granularity.

---

**Q: Would you ever choose Webpack for a new project in 2025? `Medium`**

A: Only with a specific reason. Module Federation — Webpack's micro-frontend architecture — has no stable Vite equivalent, so large micro-frontend setups may still warrant Webpack. Extremely complex asset pipelines with custom loaders that don't have Vite plugins are another reason. Otherwise, Vite is the default and Webpack is the legacy choice.
