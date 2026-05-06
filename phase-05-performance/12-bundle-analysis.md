# Bundle Analysis

## What Is This?

Bundle analysis is the process of examining what's in your JavaScript bundle — which modules are included, how large each is, why each was included (the import chain), and whether any large dependencies can be eliminated, replaced, or deferred. The primary tool is a visual treemap that makes the size composition of your bundle immediately scannable.

The most common tools:
- **`webpack-bundle-analyzer`** — webpack plugin that opens an interactive treemap
- **`vite-bundle-visualizer`** / **`rollup-plugin-visualizer`** — equivalent for Vite/Rollup
- **`source-map-explorer`** — works with any source map, framework-agnostic
- **`bundlephobia.com`** — web tool to check npm package size before installing

---

## Why Does It Exist?

JavaScript bundle size directly impacts page load performance. Every kilobyte of JS the browser downloads must be:
1. Fetched over the network
2. Decompressed (gzip/brotli)
3. Parsed into an AST
4. Compiled to bytecode
5. Executed

Steps 3–5 happen on the main thread. A 1MB bundle parsed on a mid-range Android phone can block the main thread for 5–10 seconds. Parse and compile costs are independent of execution time — a large dependency you never call still pays the parse/compile cost just for being in the bundle.

Bundle analysis solves a specific problem: dependencies accumulate silently. You `npm install` a small utility, it depends on a massive library, and your bundle grows 300KB without any explicit decision. The treemap makes this visible.

---

## How It Works

### Setting up webpack-bundle-analyzer

```js
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static', // generates an HTML file
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  ],
};
```

Run your build: `npm run build`. Open `bundle-report.html` to see the treemap.

### Setting up rollup-plugin-visualizer (Vite)

```js
// vite.config.js
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### Reading the treemap

Each rectangle represents a module. Rectangle area ≈ module size. Rectangles inside a larger rectangle mean that module is part of that chunk. Hover for exact sizes. Sort by "stat size" (raw), "parsed size" (after bundling), or "gzip size" (what the browser actually downloads).

What to look for:
- **Unexpectedly large rectangles** — a date library that's 300KB when you only use `formatDate`
- **Duplicate modules** — the same library appearing twice in different chunks (version mismatch or missing deduplication)
- **Development-only code in production** — test utilities, source maps, large error messages
- **The whole library when you only import one function** — common with lodash, moment, and similar utility libraries

---

## Common Findings and Fixes

### Lodash / underscore — importing the whole library

```js
// Bad — imports entire lodash (70KB+):
import _ from 'lodash';
const result = _.groupBy(items, 'type');

// Good — imports only groupBy (a few KB):
import groupBy from 'lodash/groupBy';

// Best — use native equivalents when possible:
const result = Object.groupBy(items, item => item.type); // modern JS
```

### Moment.js — including all locales

Moment.js bundles all locale files by default (~600KB). Use `moment-locales-webpack-plugin` to include only the locales you need, or replace moment.js entirely with `date-fns` or `dayjs` (tree-shakable, locale-on-demand).

### Icon libraries — importing all icons

```js
// Bad — imports entire icon set (MB+):
import * as Icons from 'react-icons/fa';

// Good — imports only what you need:
import { FaBell, FaUser } from 'react-icons/fa';
```

### Large visualization libraries

Chart libraries (Recharts, Chart.js, D3) are typically 200–400KB. If charts are only shown on one route, code-split them:

```js
const ChartPage = lazy(() => import('./ChartPage'));
```

### Duplicate dependencies

Two versions of the same library in the bundle usually means two packages depend on different version ranges and the package manager installed both. Check with `npm dedupe` or `npm ls <package-name>`. Lock peer dependency ranges in your `package.json` to align versions.

---

## Analyzing Before Installing

Before adding a dependency, check its size:

```bash
# Using bundlephobia CLI:
npx bundlephobia lodash-es

# Or visit bundlephobia.com
```

Look at:
- **Bundle size** (stat) — raw JS
- **Minified + gzip** — what the browser downloads
- **Tree-shakable** — whether unused exports are eliminated (crucial for utility libraries)

A utility library that's 10KB but not tree-shakable forces you to load all 10KB even if you use one function. A 50KB tree-shakable library where you use 2KB of it loads 2KB.

---

## Build-time vs Runtime Costs

Bundle analysis reveals build-time composition — what JavaScript exists. It doesn't reveal:
- Which code actually executes on page load (Chrome Coverage tab for that)
- How long parsing/execution takes (Chrome Performance tab → "Scripting")
- Which chunks are on the critical path vs lazy-loaded

Combine bundle analysis (static: what's there) with the Coverage tab (dynamic: what runs) to find code that's both large and unused on initial load — prime candidates for code splitting.

---

## Gotchas

**1. Gzip size is what matters for network cost; parsed size is what matters for CPU cost.**

A library might gzip to 30KB (small download) but parse to 200KB of AST (significant CPU cost on initial load). Look at both numbers — they tell different parts of the story.

**2. `source-map-explorer` requires source maps to be generated.**

Source maps must be enabled in your build config to use source-map-explorer. In some CI setups, source maps are disabled for production builds to avoid exposing source code. Generate them to a separate artifact storage if needed.

**3. Dynamic imports are separate entries in the treemap.**

Code-split chunks appear as separate top-level entries. If your treemap shows 5 chunks and one of them is huge, that chunk is loaded lazily — it's less urgent than a huge main bundle. Prioritize main bundle reduction.

**4. Side-effect-free packages must declare themselves.**

For tree shaking to work, a package must set `"sideEffects": false` in its `package.json` (or list which files have side effects). If a library doesn't declare this, bundlers conservatively include everything. This is a library problem, not an app problem — but you can work around it by importing from sub-paths.

---

## Interview Questions

**Q (High): How would you investigate why your React app's bundle is larger than expected?**

Answer: Start with a bundle visualizer — `webpack-bundle-analyzer` for webpack, `rollup-plugin-visualizer` for Vite. Build with the plugin enabled and open the treemap. Look for: unexpectedly large rectangles (a single dependency consuming most of the bundle), duplicate modules (same package appearing twice), development-only code in production, and full library imports where you only need one function. The most common findings: lodash/underscore imported as a whole namespace, moment.js with all locales, icon libraries importing the entire icon set, and visualization libraries included in the main chunk when they should be code-split. Once you identify the large modules, check whether they're tree-shakable, whether a lighter alternative exists, or whether they should be lazy-loaded.

---

**Q (High): What is the difference between stat size, parsed size, and gzip size in bundle analysis? Which matters most?**

Answer: Stat size is the raw size of the file before any bundler transformation — the sum of module source sizes. Parsed size is the size of the bundled output after minification — what the browser actually receives before decompression. Gzip size (or brotli size) is the compressed size sent over the network — typically 70–80% smaller than parsed. For network cost, gzip size is what matters — it determines download time. For CPU cost (parse, compile, execute), parsed size matters — the browser parses the decompressed bytes. Both matter: a library might gzip well (cheap download) but still parse slowly (expensive CPU), particularly on low-end devices. Report both in performance discussions.

---

**Q (Medium): You've discovered that `moment.js` is 500KB of your 800KB bundle. What are your options?**

Answer: Three approaches, in order of effort. First, if you need the full moment.js API, use the `moment-locales-webpack-plugin` to strip unused locales — this can reduce moment's footprint from ~600KB to ~40KB by including only the locales your app needs. Second, migrate to `date-fns` or `dayjs` — both are tree-shakable, have similar APIs, and are an order of magnitude smaller. `date-fns` is particularly clean for tree-shaking since each function is its own module. Third, if moment is only used in a few admin pages, code-split those pages so moment is a lazy chunk, not in the main bundle. The right answer combines: replace with a lighter alternative where possible, and code-split the routes that use the date library anyway.

---

**Q (Low): What is `"sideEffects": false` in a package.json and why does it matter for bundle size?**

Answer: `"sideEffects": false` is a declaration in a library's `package.json` that tells bundlers "none of the files in this package have side effects — it's safe to remove any export that isn't imported." Without this flag, bundlers conservatively include every file that's imported, even if the specific export from that file is never used. With it, the bundler can tree-shake at the file level: if you `import { formatDate } from 'date-fns'`, only the `formatDate` module and its dependencies are bundled. If `"sideEffects": false` is absent, the bundler may include unrelated date-fns modules that were transitively imported. This flag is a library author's responsibility, but app developers can work around its absence by importing from specific sub-paths (`import formatDate from 'date-fns/formatDate'`) rather than the package root.

---

*Next: Tree Shaking — bundle analysis tells you what's in your bundle; tree shaking is the mechanism that removes what isn't needed. Understanding how tree shaking works explains why some code disappears from bundles and some doesn't.*
