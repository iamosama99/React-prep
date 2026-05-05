# Fragments

## What Is This?

A Fragment is a React component that renders its children without adding any DOM node of its own. It's a wrapper that exists only in the virtual DOM, invisible in the real DOM output.

```jsx
function UserInfo({ name, email }) {
  return (
    <>
      <dt>Name</dt>
      <dd>{name}</dd>
      <dt>Email</dt>
      <dd>{email}</dd>
    </>
  );
}
```

The `<>...</>` is the shorthand syntax for `React.Fragment`. What the browser receives is just the four `<dt>` and `<dd>` elements — no wrapper div, no wrapper span. The Fragment itself produces zero DOM output.

---

## Why Fragments Exist

React requires that a component return a single root element. You can't return two sibling elements directly:

```jsx
// ❌ Syntax error — two adjacent elements, no single root
function UserInfo({ name, email }) {
  return (
    <dt>Name</dt>
    <dd>{name}</dd>
  );
}
```

This is a direct consequence of how JSX compiles. A function can only return one value. `return <dt>Name</dt><dd>{name}</dd>` is two `React.createElement` calls side by side — not a valid return statement. JSX has no way to express "return multiple things."

The obvious fix is to wrap in a `<div>`:

```jsx
return (
  <div>
    <dt>Name</dt>
    <dd>{name}</dd>
  </div>
);
```

But this is often wrong. In an HTML `<dl>` (definition list), `<dt>` and `<dd>` must be direct children. Wrapping them in a `<div>` produces invalid HTML and breaks the semantics. Same in `<table>` — `<tr>` must be a direct child of `<tbody>` or `<thead>`, not wrapped in a div.

Fragments give you the single root React requires without emitting a DOM node, so you can render structurally correct HTML.

This is the fundamental reason Fragments exist: **to satisfy React's single-root rule without polluting the DOM.**

---

## How Fragments Work — What They Compile To

The shorthand `<>...</>` compiles to:

```js
React.createElement(React.Fragment, null, ...children)
```

`React.Fragment` is a special type that React recognizes — it renders its children directly, with no wrapper element. When React processes the fiber tree and commits to the DOM, a Fragment node contributes no DOM output. Its children are placed directly wherever the Fragment was.

The long form `<React.Fragment>` is identical in behavior but allows props (specifically, the `key` prop):

```jsx
// Short form — no props, can't add key
<>...</>

// Long form — can accept key prop
<React.Fragment key={item.id}>...</React.Fragment>
```

This is the only time you need the long form: when the Fragment needs a `key` prop in a list.

---

## When to Use Fragments

### 1. Returning multiple siblings from a component

The most common case: your component needs to output several sibling elements:

```jsx
function StatusRow({ label, value, note }) {
  return (
    <>
      <td>{label}</td>
      <td>{value}</td>
      <td>{note}</td>
    </>
  );
}
```

No wrapper `<tr>` inside the component — the caller puts it inside `<tr>`:

```jsx
<tr>
  <StatusRow label="Status" value="Active" note="Since 2024" />
</tr>
```

### 2. Structurally constrained HTML

`<table>`, `<dl>`, `<ul>`, `<ol>`, `<select>` — these elements have strict rules about their direct children. Fragments let you group content from a component without breaking those rules:

```jsx
// dl with definition pairs extracted into a component
function Definition({ word, meaning }) {
  return (
    <>
      <dt>{word}</dt>
      <dd>{meaning}</dd>
    </>
  );
}

function Glossary({ terms }) {
  return (
    <dl>
      {terms.map(t => (
        <Definition key={t.id} word={t.word} meaning={t.meaning} />
      ))}
    </dl>
  );
}
```

### 3. Reducing unnecessary DOM nesting

Every `<div>` wrapper you add just to satisfy JSX's single-root requirement clutters the DOM, makes CSS harder (you may need extra selectors to pierce unnecessary wrappers), and occasionally causes layout problems with flexbox or grid. Fragments let you avoid all of that for grouping that's purely organizational.

### 4. Keyed fragments in lists

When list items are multi-element and you don't want a wrapper DOM node:

```jsx
{rows.map(row => (
  <React.Fragment key={row.id}>
    <dt>{row.term}</dt>
    <dd>{row.definition}</dd>
  </React.Fragment>
))}
```

---

## Fragments vs `null`

Both produce no DOM output, but they're semantically different:

- **`null`** — nothing renders, including children. Returning `null` from a component is a signal that the component intentionally renders nothing (e.g., it's hidden based on a condition).
- **`<></>` (empty Fragment)** — renders nothing because there are no children. An empty Fragment is unusual and mostly pointless — but it's not the same as `null`. A Fragment is a container for children; `null` is an absence.

In practice, you'll use `null` for "render nothing" and Fragments for "render children without a wrapper." They're not interchangeable.

---

## Gotchas

**The short form `<>` doesn't accept props.** This includes `key`. If you need to add any prop to a Fragment (even just `key` for a list), you must use `<React.Fragment>`. This trips people up when they forget to switch from shorthand in a list.

**Fragments don't accept any props except `key`.** Even with the long form, the only valid prop is `key`. There's no `className`, no `style`, no event handlers on a Fragment — it produces no DOM node to attach them to. If you need any of those, you need a real element.

**An empty Fragment `<></>` is a no-op.** It doesn't hurt anything, but it contributes nothing. You'll sometimes see it as a placeholder.

**Fragments don't affect CSS or layout.** A Fragment is invisible to the browser. CSS that targets "the parent of these elements" will target the Fragment's parent, not the Fragment itself. This is usually what you want, but be aware that adding or removing a Fragment wrapper has no CSS side effect — unlike adding or removing a `div`.

**React DevTools shows Fragments.** Even though Fragments produce no DOM, they appear in React DevTools as `<Fragment>` nodes. This helps you understand the component tree, but it means the virtual tree and the DOM tree look different. This is expected.

---

## Interview Questions

**Q: What is a React Fragment and why does it exist?**

Answer: A Fragment is a component that renders its children directly without emitting any DOM element. It exists to solve the mismatch between React's requirement that a component return a single root element (JSX is a function call, functions return one value) and the common need to return multiple sibling elements. Without Fragments, you'd wrap siblings in a `<div>`, which pollutes the DOM and breaks semantically structured HTML like tables and definition lists. `<>...</>` or `<React.Fragment>` satisfies the single-root constraint in JSX while contributing zero DOM output.

The trap: Saying Fragments are "just a shortcut for a div." They're the opposite — they're specifically for situations where a div would be wrong or unnecessary.

---

**Q: When do you need `<React.Fragment>` instead of `<>`?**

Answer: When you need to add a `key` prop — specifically in lists where the Fragment is the outermost element of each list item. The shorthand `<>` is syntactic sugar for `React.Fragment` with no props. Since props can't be passed to it, you must use the full `<React.Fragment key={...}>` when a key is needed. The `key` prop is the only prop Fragments accept — there's no `className`, `style`, or anything else, because Fragments have no DOM node to attach attributes to.

The trap: Not knowing the long form exists, or not knowing *when* it's needed. The key-in-a-list scenario is the canonical use case.

---

**Q: Does using a Fragment instead of a `div` affect performance?**

Answer: Yes, marginally — Fragments produce one fewer DOM node, which reduces DOM tree depth slightly. For most applications this is immeasurable. The more meaningful benefit is structural correctness: unnecessary divs can break CSS layouts (particularly flexbox and grid where direct child relationships matter), interfere with semantic HTML rules, and add DOM depth that CSS selectors have to pierce. Fragments are the right default when you genuinely don't need a DOM wrapper — not as a performance optimization, but as a correctness choice.

The trap: Saying "no performance difference at all." There is a small difference (one fewer DOM node), though it's rarely significant enough to be the primary reason to use Fragments.

---

*Next: Controlled vs Uncontrolled Inputs — Fragments are a structural concern: what the DOM looks like. Controlled vs uncontrolled inputs are a data-flow concern: who owns the value of a form field — React state, or the DOM itself. This distinction determines how you read, validate, and reset form data.*
