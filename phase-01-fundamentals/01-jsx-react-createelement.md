# JSX & React.createElement

## What Is This?

JSX is the HTML-looking syntax you write inside JavaScript files in React. It looks like this:

```jsx
const element = <button className="btn">Save</button>;
```

But here's the thing — **the browser has no idea what JSX is.** It's not HTML, it's not a browser feature, and it's not even valid JavaScript as-is. It's a syntax extension that a compiler (Babel or SWC) transforms into real JavaScript *before* your code ever runs.

What it gets transformed into is a call to `React.createElement`:

```js
const element = React.createElement('button', { className: 'btn' }, 'Save');
```

And that call returns a **plain JavaScript object** — not a DOM node, not HTML, just a JS object:

```js
{
  type: 'button',
  props: {
    className: 'btn',
    children: 'Save'
  },
  key: null,
  ref: null
}
```

This object is called a **React element**. It's a lightweight *description* of what you want on screen. React takes this description and, through its reconciliation process, figures out what to actually do to the real DOM. The JSX you write is just a convenient way to produce these description objects.

---

## Why Does JSX Exist?

Before JSX, writing React meant writing `React.createElement(...)` calls directly. Here's what even a simple UI looked like:

```js
React.createElement(
  'div',
  { className: 'card' },
  React.createElement('h2', null, 'Hello'),
  React.createElement('p', null, 'Welcome to React'),
  React.createElement(
    'button',
    { onClick: handleClick },
    'Click me'
  )
)
```

That is genuinely hard to read and maintain. The HTML-like syntax of JSX makes component structure visible at a glance — it mirrors the shape of the UI. This is the entire reason JSX exists: **developer ergonomics**. It's purely a compile-time convenience. At runtime, there is no JSX anywhere.

This is an important mental shift: *JSX is for humans. `React.createElement` is for machines.*

---

## The Compilation Pipeline — How It Actually Works

When you run `npm run dev` or `npm run build`, here's what happens to your JSX before it reaches the browser:

```
Your .jsx file
     ↓
Compiler (Babel or SWC) reads the file
     ↓
Every JSX expression is replaced with React.createElement(...)
     ↓
Valid JavaScript is output
     ↓
Browser runs it
```

So the mental model is: **JSX is a macro.** Every `<SomeTag ...>` you write is just shorthand for a function call. The compiler does the substitution mechanically before any execution happens.

### The signature of React.createElement

```js
React.createElement(type, props, ...children)
```

- `type` — a string like `'div'` for native elements, or a component function/class for custom components
- `props` — an object of attributes/props, or `null` if there are none
- `...children` — any number of child elements or strings

When `type` is a string, React creates a DOM element. When `type` is a function, React *calls* that function and uses what it returns. This is what makes component composition work — a component tree is just nested `React.createElement` calls where some types are strings and some are functions.

---

## The Old vs New JSX Transform — Why `import React` Disappeared

For most of React's history (pre-2020), every file that used JSX had to have this at the top:

```js
import React from 'react';
```

Why? Because Babel was transforming JSX into `React.createElement(...)`. That means `React` had to be in scope — without it, you'd get a `React is not defined` runtime error. This was confusing because you never *appeared* to use `React` directly in your code, yet it was a hard requirement.

**React 17 introduced the new JSX transform.** The compiler now automatically imports a helper from `react/jsx-runtime` instead of calling `React.createElement` directly. You don't write the import, the compiler injects it. The result:

```js
// What the compiler emits now (you never write this)
import { jsx as _jsx } from 'react/jsx-runtime';

const element = _jsx('button', { className: 'btn', children: 'Save' });
```

All modern tooling — Vite, Next.js, Create React App 4+ — ships with this enabled by default. So in any project created in the last few years, you don't need `import React` unless you're actually using something from React (hooks, `React.memo`, etc.).

When you see `import React from 'react'` on every file in an older codebase, you now know exactly why it's there.

---

## Why `className` Instead of `class` — and the Full Rule

JSX *looks* like HTML, but it compiles to JavaScript object literals. And in a JavaScript object, `class` is a problem:

```js
// This is illegal JavaScript — 'class' is a reserved keyword
{ class: 'btn' }

// This works but is ugly
{ 'class': 'btn' }
```

So React chose to use the **DOM property names** instead of HTML attribute names. In the DOM, you set a class with `element.className`, not `element.class`. Hence, `className`.

Same logic for `for` → `htmlFor`. `for` is reserved for `for` loops, and the DOM property is `label.htmlFor`.

The general rule: **JSX attributes map to DOM property names, not HTML attribute names.** In practice, the only ones you'll hit frequently are `className` and `htmlFor`. Everything else is the same.

---

## Expressions Inside JSX — What You Can and Can't Put in `{}`

Curly braces `{}` in JSX let you embed JavaScript. But here's the constraint: **only expressions are allowed, not statements.**

An *expression* is any code that produces a value — a variable, a function call, a ternary, arithmetic, a template literal, `&&`.

A *statement* is code that performs an action but doesn't produce a value — `if`, `for`, `while`, `switch`.

Why this restriction? Because JSX compiles to a function call, and a function argument must be an expression. `React.createElement('p', null, SOMETHING)` — that SOMETHING must be a value, not a control flow statement.

```jsx
// ✅ All valid — these are expressions
<p>{user.name}</p>
<p>{isLoggedIn ? 'Welcome' : 'Please log in'}</p>
<p>{items.map(item => <li key={item.id}>{item.name}</li>)}</p>
<p>{isAdmin && <AdminBadge />}</p>

// ❌ Invalid — 'if' is a statement
<p>{if (isLoggedIn) { 'Welcome' }}</p>
```

---

## React Element vs React Component — The Distinction That Matters

These two terms get used interchangeably by juniors, and that's worth correcting:

- A **React element** is the plain JS object describing what to render: `{ type: 'button', props: {...}, key: null, ref: null }`. It's *data*. Immutable, cheap to create, created by `React.createElement`.

- A **React component** is a function (or class) that accepts props and *returns* React elements. It's *logic*.

When you write `<MyButton label="Save" />`, the compiler produces `React.createElement(MyButton, { label: 'Save' })`. React then *calls* `MyButton({ label: 'Save' })` to get back elements. The component is the factory; elements are what it produces.

This distinction matters practically because:
- React decides *when* to call your component function (not you)
- React can call it multiple times (re-renders)
- An element is just data until React processes it — creating elements is not the same as rendering

---

## Gotchas

**`0` renders, but `false`, `null`, and `undefined` don't.** All four are "falsy" in JavaScript, but React treats them differently when used as children. `false`, `null`, and `undefined` render nothing. `0` renders the character zero.

This is the source of a very common bug:

```jsx
// Bug: renders "0" when items is an empty array
{items.length && <List items={items} />}

// Fixed: coerce to boolean
{items.length > 0 && <List items={items} />}
{!!items.length && <List items={items} />}
```

**Self-closing tags are mandatory.** `<br>` is fine HTML. `<br>` in JSX is a syntax error. You must write `<br />`. Same for `<input />`, `<img />`, etc.

**Adjacent elements must have a single root.** `React.createElement` takes one `type` — you can't return two siblings directly. This is the entire reason Fragments exist:

```jsx
// ❌ Syntax error — two roots
return <h1>Title</h1><p>Body</p>;

// ✅ Wrapped in a Fragment
return <><h1>Title</h1><p>Body</p></>;
```

**`key` and `ref` are not props.** They look like props in JSX syntax, but React intercepts them before they reach your component. Inside your component, `props.key` is always `undefined`.

**JSX requires a capital letter for custom components.** `<myButton />` and `<MyButton />` mean completely different things. Lowercase `<myButton />` compiles to `React.createElement('myButton', ...)` — React treats it as an unknown HTML element. Uppercase `<MyButton />` compiles to `React.createElement(MyButton, ...)` — React treats it as a component.

---

## Interview Questions

**Q: What does JSX compile to, and what does the output look like?**

Strong answer: JSX is syntactic sugar that Babel or SWC transforms into `React.createElement(type, props, ...children)` calls before the code runs. Each call returns a plain JavaScript object — a React element — with `type`, `props`, `key`, and `ref` fields. This object is a description of what to render, not an actual DOM node. React processes these descriptions later during reconciliation to determine what DOM changes to make.

The trap: Saying "JSX compiles to HTML" or thinking it produces DOM nodes directly. It produces JavaScript objects. The DOM is only touched during the commit phase, not when elements are created.

---

**Q: Why did you previously need `import React from 'react'` in every JSX file, and why don't you need it anymore?**

Strong answer: The old JSX transform compiled JSX to `React.createElement(...)`, so `React` had to be in scope. If you forgot the import, you'd get a runtime error even though you never called React directly. React 17 introduced a new transform that compiles JSX to calls imported automatically from `react/jsx-runtime`. The compiler injects that import itself. Modern tooling uses this by default, so the manual import is no longer needed for JSX — only for hooks and other named exports.

The trap: Saying "you always need it" (wrong in modern projects) or "you never need it" (wrong — you still need it to use hooks, `React.memo`, `React.lazy`, etc.).

---

**Q: Why is it `className` in JSX instead of `class`?**

Strong answer: Because `class` is a reserved keyword in JavaScript, and JSX attributes compile to JavaScript object property names. React chose to match DOM property names rather than HTML attribute names — in the DOM, you set a class via `element.className`. The same principle gives us `htmlFor` instead of `for` (since `for` is reserved for loops). This is not a React convention — it's a consequence of JSX being JavaScript.

The trap: "It's just how React works." The real reason reveals an understanding that JSX is JavaScript, not HTML.

---

**Q: Why can't you use `if` statements inside JSX curly braces?**

Strong answer: Because JSX curly braces can only contain *expressions* — code that evaluates to a value. `if` is a *statement* — it controls flow but doesn't produce a value. Under the hood, `{someContent}` becomes an argument to `React.createElement`, and function arguments must be expressions. You can achieve the same result with a ternary (`condition ? a : b`) or short-circuit evaluation (`condition && a`), both of which are expressions.

The trap: Thinking this is an arbitrary restriction. Once you understand that JSX compiles to function calls, the expression-only rule is a direct consequence of JavaScript semantics.

---

**Q: What's the difference between a React element and a React component?**

Strong answer: A React *element* is the plain JS object produced by `React.createElement` — it's immutable data describing what to render, like `{ type: 'button', props: { children: 'Save' } }`. A React *component* is a function (or class) that accepts props and returns elements. When you write `<MyButton />`, React has a reference to the `MyButton` function — it calls that function to get elements back. Elements are the output; components are the factories.

The trap: Using these terms interchangeably. The distinction matters in practice — React decides when to call your component (not you), and understanding that elements are just data helps explain why creating elements doesn't immediately touch the DOM.

---

**Q: What is the JSX expression `{0 && <Spinner />}` going to render, and why?**

Strong answer: It renders `0`. In JavaScript, `0 && anything` short-circuits and returns `0` — not `false`. React renders `false`, `null`, and `undefined` as nothing, but it *does* render numbers, including `0`. So you get the number zero appearing in your UI. The fix is to coerce the condition to a boolean: `{count > 0 && <Spinner />}` or `{Boolean(count) && <Spinner />}`.

The trap: Assuming all falsy values behave the same in JSX. They don't. `0` is the only falsy value that renders.

---

**Q: What happens when React sees a lowercase tag vs an uppercase tag in JSX?**

Strong answer: Lowercase tags (`<div>`, `<button>`, `<mycomponent>`) compile to `React.createElement('div', ...)` — a string as the type. React treats string types as native DOM elements. Uppercase tags (`<MyComponent>`) compile to `React.createElement(MyComponent, ...)` — the variable as the type. React treats function/class types as components and calls them. This is why custom components must start with a capital letter: if you write `<myComponent />`, React won't call your function — it'll try to render an unknown HTML element called `mycomponent`.

The trap: Thinking the capital letter convention is just a style rule. It's semantic — it determines how React treats the type.

---

**Q: Why can't you return two adjacent elements from a component without a wrapper?**

Strong answer: Because `React.createElement` takes a single root `type`. A component must return a single element, which can have many children. When you need sibling elements without a DOM wrapper, you use a Fragment — `<>...</>` or `<React.Fragment>` — which compiles to `React.createElement(React.Fragment, null, ...)`. Fragments render nothing in the DOM; they're a purely virtual grouping mechanism.

The trap: Not knowing what a Fragment compiles to. A strong answer names `React.Fragment` as the type and explains that it renders to nothing in the DOM.

---

*Next: Function vs Class Components — now that you know JSX produces element objects and that React calls functions to render components, the logical next question is: what are those functions, how do they differ from classes, and why did the ecosystem move from one to the other?*
