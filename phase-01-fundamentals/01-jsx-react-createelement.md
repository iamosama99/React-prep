# JSX & React.createElement

This topic is a litmus test for whether you understand what React *is* or just what it *does*. A mid-level candidate explains the syntax. A senior explains the compilation step, why the abstraction exists, and what happens when things go wrong at the boundary between JSX and the runtime — without needing to look anything up.

## How JSX Actually Works

JSX is not a browser feature, a special string format, or React-specific syntax. It is syntactic sugar that a compiler — Babel or SWC — transforms into function calls before your code ever runs. When you write this:

```jsx
const element = <button className="btn" onClick={handleClick}>Save</button>;
```

the compiler rewrites it as:

```js
const element = React.createElement(
  'button',
  { className: 'btn', onClick: handleClick },
  'Save'
);
```

`React.createElement` returns a plain JavaScript object — a *React element* — that describes what you want on screen:

```js
{
  type: 'button',
  props: {
    className: 'btn',
    onClick: handleClick,
    children: 'Save'
  },
  key: null,
  ref: null
}
```

This object is not a DOM node. It is a lightweight description — a virtual DOM node — that React uses later during reconciliation to decide what to actually change in the real DOM. The createElement call is just building that description.

When the `type` is a string like `'button'`, React knows to create a native DOM element. When `type` is a function or class, React knows to call that function (or instantiate that class) to get another element back. That recursion is what builds the component tree.

## The JSX Transform: Old vs New Runtime

For years, every file using JSX had to import React at the top — `import React from 'react'` — because Babel was transforming JSX into `React.createElement(...)`, and `React` had to be in scope for that to work. Forgetting the import was a rite of passage bug.

React 17 introduced the *new JSX transform*. With it, the compiler imports a helper from `react/jsx-runtime` automatically, and you no longer need to import React just to use JSX. Modern tooling (Vite, Create React App 4+, Next.js) ships with this enabled by default. You still need to import React if you use hooks, `React.memo`, or other named exports — but not for JSX alone.

Interviewers sometimes ask why older codebases have `import React from 'react'` on every file. This is the answer.

## Why `className` Instead of `class`

JSX looks like HTML but it compiles to JavaScript. Since `class` is a reserved keyword in JavaScript (used for class declarations), you can't use it as a property name in a plain object without quoting it — and the JSX transform produces plain objects. React chose `className` to match the DOM property name (`element.className`) rather than the HTML attribute name (`class`).

Same logic applies to `htmlFor` instead of `for` (`for` is also reserved — used in `for` loops).

This is a minor thing, but interviewers ask it because the answer reveals whether you understand that JSX is JavaScript, not HTML.

## Expressions in JSX

Anything inside `{}` in JSX is evaluated as a JavaScript expression and passed as a prop or child:

```jsx
const name = 'Osama';
const el = <p>Hello, {name.toUpperCase()}</p>;
// compiles to:
// React.createElement('p', null, 'Hello, ', name.toUpperCase())
```

Statements (like `if` or `for`) don't work inside `{}` because they are not expressions — they don't produce a value. That's why conditional rendering uses the ternary operator or `&&`, not if/else.

## Gotchas

**Self-closing tags are required.** In HTML, `<br>` and `<input>` don't need closing tags. In JSX, all elements must be closed: `<br />`, `<input />`. The compiler will error otherwise.

**Adjacent elements need a wrapper.** `React.createElement` takes a single root `type`. You can't return two sibling elements without a parent — which is why Fragments exist.

**JavaScript expressions, not statements.** You cannot write `{if (x) return <A />}` inside JSX. You can write `{x ? <A /> : null}` or `{x && <A />}`.

**`false`, `null`, `undefined`, and `0` behave differently.** `null`, `undefined`, and `false` render nothing. But `0` renders the number zero. `{count && <Spinner />}` will render `0` when `count` is 0, which is a classic bug. Always coerce to boolean: `{count > 0 && <Spinner />}` or `{!!count && <Spinner />}`.

**Keys and refs are not props.** `key` and `ref` are special attributes handled by React itself. They never appear in `props` inside the component.

## Interview Questions

**Q: What does JSX compile to?**

Strong answer: JSX is syntactic sugar for `React.createElement(type, props, ...children)` calls. The compiler (Babel/SWC) performs this transformation before the code runs. The result is a plain JavaScript object — a React element — that describes what to render. It has `type`, `props`, `key`, and `ref` fields.

The trap: Saying "JSX compiles to HTML" or describing it as a template language. JSX has nothing to do with HTML at runtime; it produces JS objects. The DOM doesn't enter the picture until React processes those objects during reconciliation.

---

**Q: Why do you need `import React from 'react'` in older files that use JSX, but not in newer ones?**

Strong answer: The old JSX transform compiled JSX to `React.createElement(...)` calls, so `React` had to be in scope. React 17 introduced a new JSX transform that imports from `react/jsx-runtime` automatically — the compiler injects that import. Modern tooling uses this by default, so the manual import is no longer needed for JSX alone.

The trap: Saying "you always need to import React." In 2026 with the new transform, you only need it for hooks and other named exports, not for JSX itself.

---

**Q: Why is it `className` instead of `class`?**

Strong answer: `class` is a reserved keyword in JavaScript. JSX compiles to JavaScript objects, and using `class` as a property key would require quoting. React chose to match the DOM property name `element.className` rather than the HTML attribute. Same pattern: `htmlFor` instead of `for`.

The trap: Saying "it's just a React convention." The reason is that JSX is JavaScript, not HTML, and reserved keywords can't be unquoted property names.

---

**Q: Can you write any JavaScript inside JSX curly braces?**

Strong answer: Only *expressions* — code that produces a value. Not statements like `if`, `for`, `while`, or `switch`. This is because the curly brace content becomes an argument to `React.createElement`, which expects a value, not a statement. You can use ternary operators, `&&`, immediately-invoked functions, or array methods like `map` — anything that evaluates to a value.

The trap: Thinking you can use `if` inside JSX curly braces directly. This comes up in live coding rounds when candidates try to write `{if (x) <Foo />}`.

---

**Q: What is a React element vs a React component?**

Strong answer: A React *element* is the plain JavaScript object returned by `React.createElement` — it describes what to render. A React *component* is a function (or class) that accepts props and returns elements. When you write `<MyButton />`, React calls `MyButton(props)` to get back elements. The element tree is static data; the component is the logic that produces it.

The trap: Treating them as synonyms. This confusion surfaces in error messages — "React element expected" — and in questions about when React re-runs component logic versus when it just compares elements.

---

*Next: Function vs Class Components — now that you know JSX produces element descriptions, the next question is what gets called to produce them, and why the industry moved from classes to functions.*
