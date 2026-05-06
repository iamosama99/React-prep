# Tree Shaking

## What Is This?

Tree shaking is a bundler optimization that removes unused code from the final bundle. The name comes from the metaphor: shake the dependency tree hard enough and the dead leaves (unused exports) fall out. The result is a bundle that contains only the code that's actually reachable from your application's entry points.

```js
// utils.js — exports three functions
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }

// app.js — only uses add
import { add } from './utils';
console.log(add(2, 3));

// After tree shaking, the bundle contains only `add`.
// subtract and multiply are eliminated.
```

---

## Why Does It Exist?

Libraries are designed to be general-purpose — they export dozens or hundreds of utilities. Your app uses a fraction of them. Without tree shaking, every library you install ships its entire surface area to every user of your app, whether you use it or not.

Tree shaking addresses this by analyzing the static import/export graph and eliminating anything that's not reachable from the app's entry point. The analysis is static — it happens at build time, not runtime — which means it can only work with imports that the bundler can reason about statically.

---

## How It Works

### The prerequisite: ES Modules

Tree shaking requires ES module syntax (`import` / `export`). It cannot work with CommonJS (`require` / `module.exports`).

**Why?** CommonJS is dynamic — the module loaded can depend on runtime values:

```js
// CommonJS — dynamic, cannot be analyzed statically:
const moduleId = getConfig().useNewModule ? './new' : './old';
const mod = require(moduleId); // bundler can't know which at build time

// ES Modules — static, analyzable at build time:
import { something } from './module'; // always this module, always this export
```

ES module imports are binding declarations — they're resolved at parse time, before any code runs. This makes the full dependency graph knowable to the bundler without executing any code.

### The process

1. **Build the module graph**: Starting from the entry point, the bundler follows every `import` statement and builds a graph of all modules and their exported/imported bindings.

2. **Mark reachable exports**: Starting from the entry, mark every exported binding that's actually imported somewhere in the graph as "used."

3. **Eliminate unused exports**: Any export that was never imported (and has no side effects) is dropped from the bundle.

4. **Minimize**: The remaining code is minified. Unused variable declarations, unreferenced functions, and now-dead code paths from removed exports are eliminated by the minifier.

```
Entry: app.js
  imports { add } from utils.js

utils.js exports:
  ✅ add     — imported by app.js
  ❌ subtract — not imported by anyone
  ❌ multiply — not imported by anyone

Result: bundle contains add, not subtract or multiply.
```

### The `"sideEffects"` field

The tricky case: code with **side effects**. A side effect is any top-level code that does something when the module is evaluated, regardless of whether any of its exports are imported:

```js
// side-effect.js
window.myLib = { version: '1.0' }; // side effect at module scope
export function noop() {}
```

Even if nobody imports `noop`, a bundler can't eliminate this module — evaluating it might change global state that other code depends on.

This is why library authors add `"sideEffects": false` to their `package.json`. It's a guarantee: "trust me, none of the modules in this package have side effects — you can safely eliminate any file none of my exports are imported from."

```json
// package.json
{
  "sideEffects": false
}
```

Or, more precisely:

```json
{
  "sideEffects": ["./src/polyfills.js", "*.css"]
}
```

This says: only these files have side effects. Everything else is safe to shake.

---

## What Defeats Tree Shaking

### 1. CommonJS modules

If you import from a CommonJS module, the bundler includes the entire module because it can't statically analyze what's exported:

```js
// CommonJS — all of 'big-library' is bundled:
const { specificThing } = require('big-library');

// ESM — only specificThing is bundled (if big-library supports ESM):
import { specificThing } from 'big-library';
```

Many libraries ship both CJS and ESM variants. Ensure your bundler is resolving the ESM version (check the `"module"` or `"exports"` field in the library's `package.json`).

### 2. Dynamic imports at the namespace level

```js
// Can't tree shake — imports everything:
import * as utils from './utils';
const fn = utils[dynamicKey];

// Can tree shake — bundler knows exactly what's used:
import { add, subtract } from './utils';
```

### 3. Missing or incorrect `"sideEffects"` declaration

Without `"sideEffects": false`, bundlers conservatively include any file that's referenced in an import chain, even if no exports are used.

### 4. `export default` with an object

```js
// Bad for tree shaking — exports everything as one blob:
export default {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
};

// Good for tree shaking — individual named exports:
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
```

Importing `{ add }` from the named-export version can be tree-shaken. Importing `defaultExport.add` from the default-object version includes the whole object.

### 5. Re-exporting barrels without named specifics

Barrel files (an `index.js` that re-exports everything) are convenient but can defeat tree shaking:

```js
// index.js — barrel file
export { add } from './math';
export { format } from './string';
export { fetchUser } from './api';
```

If a bundler can statically trace which re-exports are used, this is fine. But some bundler configurations or older tools treat barrel imports as "include everything." Large barrel files in component libraries (where `import { Button } from 'ui-lib'` pulls in all 200 components) are a known tree-shaking problem — one reason Tailwind, Shadcn, and others moved toward copy-paste component models.

---

## Tree Shaking in Practice

### Lodash — the classic example

```js
// Bad — no tree shaking possible (CJS), entire lodash included:
import _ from 'lodash';

// Better — tree-shakable with lodash-es:
import { groupBy } from 'lodash-es';

// Best — import from the direct module path (works with CJS lodash too):
import groupBy from 'lodash/groupBy';
```

`lodash-es` is the ESM build of lodash. `lodash/groupBy` is a direct file path that bypasses the main entry point entirely.

### date-fns

`date-fns` is designed for tree shaking — every function is its own file:

```js
import { format, parseISO } from 'date-fns';
// Only format and parseISO are bundled, plus their deps
```

### Icon libraries

```js
// react-icons — imports individual icons, tree-shakable:
import { FaBell } from 'react-icons/fa';
// Only FaBell is included
```

---

## Gotchas

**1. Tree shaking happens at export-level, not expression-level.**

Bundlers eliminate unused exports. They don't do arbitrary dead-code elimination inside a function — that's the minifier's job. If a used export calls an internal helper that calls another internal helper, all of them are included.

**2. `import()` (dynamic) is not tree-shaken.**

Dynamic imports create a separate chunk. The entire module graph reachable from the dynamic import is included in that chunk. Tree shaking only applies within a statically-analyzable subgraph.

**3. Polyfills are intentional side effects.**

`import 'core-js/stable'` is entirely side-effect-based — it patches global objects. Tree shaking would eliminate it, which is wrong. This is why polyfill packages list themselves as having side effects.

**4. CSS imports in JS have side effects.**

`import './styles.css'` is a side effect — it causes styles to be injected. These should always be listed in `"sideEffects"` to prevent accidental elimination.

**5. Bundler configuration must enable tree shaking.**

webpack only tree-shakes in production mode (where `optimization.usedExports: true` and `optimization.minimize: true` are set). Vite (Rollup-based) tree-shakes by default. In development mode with webpack, unused exports are present in the bundle (they're excluded with a comment, but the code is there).

---

## Interview Questions

**Q (High): What is tree shaking and why does it require ES modules?**

Answer: Tree shaking is a bundler optimization that statically analyzes the import/export graph and eliminates any exported code that isn't reachable from the application's entry point. It requires ES modules because ES module imports are static binding declarations, resolved at parse time before any code executes. The bundler can trace the entire dependency graph — which modules are imported, which exports are used — without running any code. CommonJS `require()` is dynamic: the module path can be a runtime expression, and the exported shape isn't statically knowable. Bundlers can't safely eliminate anything from a CommonJS module without risk of breaking runtime behavior.

The trap: Candidates who say "tree shaking is just dead code elimination" are imprecise. Dead code elimination (the minifier's job) removes unreachable code within a function. Tree shaking operates at the module and export level — it removes entire exported bindings that are never imported.

---

**Q (High): Why doesn't tree shaking eliminate everything from a large utility library like lodash?**

Answer: Classic lodash uses CommonJS. Bundlers can't tree-shake CJS — the entire package is included as a static chunk. Additionally, lodash's main entry point (`import _ from 'lodash'`) imports the whole namespace, making tree shaking impossible even in ESM. The solutions: (1) `lodash-es` — the ESM build of lodash, fully tree-shakable with named imports. (2) Sub-path imports — `import groupBy from 'lodash/groupBy'` bypasses the main entry and imports only the function's module and its deps. (3) Replace lodash with native alternatives — many lodash functions have direct equivalents in modern JavaScript.

---

**Q (Medium): What is `"sideEffects"` in `package.json` and how does it affect tree shaking?**

Answer: `"sideEffects": false` is a library author's declaration that no file in the package has module-level side effects — global mutations, ambient declarations, polyfills. Without it, bundlers conservatively include any file that appears in an import chain, even if none of its exports are imported, because evaluating the file might be necessary. With `"sideEffects": false`, bundlers know it's safe to skip any file whose exports are unused. You can also specify an array — `"sideEffects": ["*.css", "./polyfills.js"]` — to declare that specific files do have side effects while the rest don't. App authors can work around missing declarations by using sub-path imports instead of barrel-file imports.

---

**Q (Low): What's wrong with barrel files from a tree-shaking perspective?**

Answer: A barrel file (`index.js` that re-exports from many modules) concentrates the entire library surface into one import. Some bundler configurations, particularly webpack with certain settings, can't always trace which specific re-exports from a barrel are actually used — so they include the full barrel graph. This is the reason large component libraries (hundreds of components) can inflate a bundle significantly even when you only import one component. Modern bundlers (webpack 5, Rollup, Vite) handle barrel files better with `"sideEffects": false`, but the problem persists with older setups or complex re-export patterns. The modern trend toward direct sub-path imports or copy-paste component patterns (Shadcn, Radix primitives) avoids barrel files entirely.

---

*Next: Web Vitals in React — now that you understand how to optimize bundles, rendering, and loading, the final piece is how to measure the user-facing impact of these optimizations using the Core Web Vitals metric system.*
