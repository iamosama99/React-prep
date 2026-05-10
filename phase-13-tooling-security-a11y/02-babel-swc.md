# Babel & SWC

## Quick Reference

| | Babel | SWC |
|---|---|---|
| Language | JavaScript | Rust |
| Speed | Baseline | 20–70x faster |
| Ecosystem | Massive (plugins) | Growing |
| Type-checking | No (strips types) | No (strips types) |
| JSX transform | Old + new runtime | New runtime |

---

## What These Tools Actually Do

Neither Babel nor SWC type-checks your code — that's TypeScript's job (`tsc`). Both are **transpilers**: they parse source code and output transformed source code. Their main jobs in a React project:

1. **Strip TypeScript types** — output plain JS
2. **Transform JSX** — convert `<div />` to function calls
3. **Downlevel syntax** — convert modern JS to target browser support
4. **Apply plugins** — decorators, styled-components, etc.

Type checking is a separate process. The reason Babel/SWC are fast is they skip it entirely.

---

## Babel

Babel was the industry standard for almost a decade. It's a plugin-based transform pipeline: each plugin is an AST (Abstract Syntax Tree) visitor that reads and rewrites nodes.

**How it works:**
1. Parse source → AST
2. Run plugins (each traverses the AST)
3. Generate output source from modified AST

```json
// .babelrc
{
  "presets": [
    ["@babel/preset-env", { "targets": "> 0.5%, last 2 versions" }],
    "@babel/preset-typescript",
    ["@babel/preset-react", { "runtime": "automatic" }]
  ],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }]
  ]
}
```

**Presets vs plugins:** A preset is a curated bundle of plugins. `@babel/preset-env` figures out which syntax transforms your targets need, based on browserslist data.

---

## JSX Transform: Old vs New Runtime

This is a question interviewers sometimes ask because it has a visible effect — the old runtime required React to be imported in every file that used JSX.

**Old runtime (before React 17):**

```tsx
// What you write
const el = <div className="foo">Hello</div>;

// What Babel outputs (old runtime)
const el = React.createElement('div', { className: 'foo' }, 'Hello');
// ^ This is why you had to `import React from 'react'` in every file
```

**New runtime (React 17+):**

```tsx
// What you write
const el = <div className="foo">Hello</div>;

// What Babel outputs (new runtime)
import { jsx as _jsx } from 'react/jsx-runtime';
const el = _jsx('div', { className: 'foo', children: 'Hello' });
// ^ Babel injects the import automatically — no manual React import needed
```

To enable new runtime in Babel:
```json
["@babel/preset-react", { "runtime": "automatic" }]
```

To enable in SWC:
```json
{ "jsc": { "transform": { "react": { "runtime": "automatic" } } } }
```

---

## SWC

SWC (Speedy Web Compiler) is a Rust-based compiler that does what Babel does but 20–70x faster. It's now the default compiler in Next.js (replaced Babel in Next.js 12).

```json
// .swcrc
{
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
}
```

**Why so much faster?** Rust compiles to native machine code, runs without a GC pause, and SWC parallelizes file processing across CPU cores. Babel runs in a single-threaded Node.js process with GC overhead.

**Plugin ecosystem:** SWC supports plugins written in Rust (via WASM). The ecosystem is much smaller than Babel's, so if you have a specialized Babel plugin (styled-components, GraphQL, etc.) you need to verify SWC support before migrating.

---

## When Each Is Used

**Babel:**
- Projects with custom Babel plugins not yet ported to SWC
- Older Create React App projects (still uses Babel by default)
- When you need a specific transform that only exists as a Babel plugin

**SWC:**
- Next.js projects (default since v12, no config needed)
- Vite with `@vitejs/plugin-react-swc` (replaces the default Babel plugin)
- Any project where build/test speed is painful and Babel plugin requirements are standard

**esbuild (honorable mention):** Vite uses esbuild for dependency pre-bundling and in some transform contexts. esbuild is also Rust-adjacent (written in Go) and similarly fast, but its plugin API is more limited than SWC's.

---

> **Check yourself:** Your Jest suite is slow. `ts-jest` is running TypeScript transforms at type-checking speed. What do you switch to? `@swc/jest` or `babel-jest` with `@babel/preset-typescript` (both skip type-checking, which is the bottleneck). Type-check separately in CI with `tsc --noEmit`.

---

## Self-Assessment

- [ ] I can explain what Babel and SWC do (and what they don't do — no type checking)
- [ ] I know the difference between old and new JSX runtime and why the old one required `import React`
- [ ] I know why SWC is faster than Babel
- [ ] I know where SWC is used by default (Next.js)
- [ ] I know when Babel is still necessary

---

## Interview Q&A

**Q: Why do you still need to import React in older codebases that use JSX? `High`**

A: With the old JSX transform (pre-React 17), Babel compiles `<div />` to `React.createElement('div', null)`. Since `React` is referenced in the output, it must be in scope. With the new automatic runtime introduced in React 17, Babel injects `import { jsx } from 'react/jsx-runtime'` automatically, so you no longer need to manually import React in JSX files.

---

**Q: Does Babel or SWC type-check your TypeScript? `High`**

A: No. Both strip TypeScript type annotations and output plain JavaScript. They don't run the TypeScript type checker. Type errors are silent at transform time. Type checking is done separately by `tsc --noEmit`, which is why you run it in CI as a separate step from the build.

---

**Q: What is `@babel/preset-env` doing? `Medium`**

A: It reads your `targets` (a browserslist query like `"> 0.5%, last 2 versions"`) and determines which JavaScript syntax transforms are needed for those browsers. For example, if your targets don't support optional chaining, it compiles `a?.b` to `a === null ? undefined : a.b`. It avoids transforms that aren't needed — so targeting modern browsers produces smaller, faster output.

---

**Q: Next.js switched from Babel to SWC in v12. What's the practical impact? `Medium`**

A: Cold build and Fast Refresh times dropped significantly — the Next.js team reported 17x faster builds and 5x faster Fast Refresh. For most projects, the migration is transparent. The only issue arises if you had a custom `.babelrc` with specialized plugins. If Next.js detects a `.babelrc`, it falls back to Babel, opting you out of SWC. The workaround is to either replace your custom Babel plugins with SWC equivalents or accept the Babel fallback.
