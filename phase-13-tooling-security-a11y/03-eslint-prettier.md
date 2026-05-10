# ESLint + Prettier Setup

## Quick Reference

| Tool | Job | Fixable? |
|---|---|---|
| ESLint | Find code problems (bugs, bad patterns) | Partially |
| Prettier | Format code (spacing, line length, quotes) | Always |
| eslint-plugin-react-hooks | Enforce Hooks rules | Some |
| eslint-plugin-jsx-a11y | Catch accessibility issues | Some |

---

## ESLint vs Prettier — Who Does What

These two tools overlap in one area: formatting. ESLint has formatting rules (max-len, indent, quotes). Prettier also controls all of those. Running both without coordination causes conflicts — they fight over the same code.

**The right mental model:**
- **Prettier** owns all formatting — whitespace, line breaks, quotes, trailing commas
- **ESLint** owns code quality — logic errors, unused variables, hooks rule violations, import order

The bridge is `eslint-config-prettier`: it disables all ESLint rules that would conflict with Prettier. Install it and put it last in `extends` so it overrides anything that came before.

```bash
npm install -D eslint prettier eslint-config-prettier \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

---

## ESLint Config (Flat Config — ESLint 9+)

ESLint 9 introduced the flat config format (`eslint.config.js`). Legacy `.eslintrc` still works but is deprecated.

```js
// eslint.config.js
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // not needed with new JSX runtime
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  prettierConfig, // must be last — disables conflicting formatting rules
];
```

---

## The React Hooks Plugin Rules

`eslint-plugin-react-hooks` enforces two rules that prevent entire classes of bugs:

### rules-of-hooks

Enforces that Hooks are only called at the top level (not inside conditionals, loops, or nested functions) and only from React functions.

```tsx
// ESLint error: react-hooks/rules-of-hooks
function BadComponent({ show }: { show: boolean }) {
  if (show) {
    const [count, setCount] = useState(0); // ❌ conditional hook call
  }
}

// Correct
function GoodComponent({ show }: { show: boolean }) {
  const [count, setCount] = useState(0); // ✅ always called
  if (!show) return null;
}
```

### exhaustive-deps

Enforces that all variables used inside `useEffect`, `useCallback`, or `useMemo` are listed in the dependency array.

```tsx
function Component({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  // ESLint error: react-hooks/exhaustive-deps — userId is used but not listed
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, []); // ❌ stale closure bug

  // Correct
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]); // ✅
}
```

`exhaustive-deps` has an escape hatch: `// eslint-disable-next-line react-hooks/exhaustive-deps`. Use it only when you genuinely need to break the rule (e.g., a ref, a stable function from a library). Never use it to silence the warning without understanding why the dep array is incomplete.

---

## Prettier Config

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Run Prettier separately from ESLint. Don't use `eslint --fix` to format — let Prettier own formatting via its own CLI or editor integration.

---

## Pre-commit Hook with lint-staged

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,json,md,css}": "prettier --write"
  }
}
```

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

This runs ESLint + Prettier only on staged files, not the whole project, so the hook is fast (<5s for most changes).

---

> **Check yourself:** A teammate is getting ESLint errors from Prettier (indent conflicts). What's wrong and how do you fix it? They're missing `eslint-config-prettier` — or it's not last in `extends`. Add it last so it overrides all conflicting rules.

---

## Self-Assessment

- [ ] I can explain why Prettier and ESLint both exist and what each does
- [ ] I know how `eslint-config-prettier` prevents conflicts
- [ ] I understand what `rules-of-hooks` prevents and why conditional hooks break React
- [ ] I understand what `exhaustive-deps` prevents (stale closures)
- [ ] I know how to set up lint-staged for pre-commit hooks

---

## Interview Q&A

**Q: What is the difference between ESLint and Prettier? `High`**

A: ESLint analyzes code for bugs, anti-patterns, and rule violations — it understands code semantics. Prettier is a formatter that enforces consistent style (line length, indentation, quotes) by reprinting code from the AST. They overlap on formatting rules, which causes conflicts. The standard solution is `eslint-config-prettier`, which disables ESLint's formatting rules so Prettier can own that entirely.

---

**Q: What does the `exhaustive-deps` ESLint rule catch? `High`**

A: It catches missing dependencies in `useEffect`, `useCallback`, and `useMemo`. If you reference a variable inside the callback but don't list it in the dependency array, the callback captures a stale version of that variable — it won't see updated values after re-renders. The rule enforces that the dependency array reflects every reactive value used inside the callback, preventing stale closure bugs.

---

**Q: When is it acceptable to disable `exhaustive-deps`? `Medium`**

A: In narrow, well-understood cases: when you hold a ref (refs are stable and intentionally excluded from deps), when you're calling a function that's intentionally not reactive (like a logging function), or when you deliberately want to run an effect only once and have confirmed the values inside won't go stale. The disable comment should always be accompanied by a comment explaining why — it's a signal that this code needs extra scrutiny.

---

**Q: What is `eslint-plugin-jsx-a11y`? `Low`**

A: A static analysis plugin that catches accessibility issues in JSX. It flags things like images without `alt` attributes, interactive elements that aren't keyboard-accessible, incorrect ARIA role usage, and missing `for`/`htmlFor` on labels. It's static analysis, so it can't catch runtime issues (e.g., whether `aria-label` text is actually useful), but it eliminates a whole class of common a11y mistakes at lint time.
