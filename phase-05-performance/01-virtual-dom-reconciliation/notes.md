# Virtual DOM & Reconciliation

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Virtual DOM | In-memory JS object tree mirroring the UI | Makes "re-render everything" conceptually cheap |
| Reconciliation | Diff algorithm between two VDOM trees | Produces minimal real DOM mutations |
| Same-type heuristic | Different type → tear down subtree | Enables O(n) diff; causes unexpected state resets |
| Keys | Identity markers for list children | Prevents position-based matching bugs in reorderable lists |
| Renderer/reconciler split | Reconciler produces mutations; renderer applies them | Same algorithm targets DOM, native, terminal, etc. |

## What Is This?

The Virtual DOM is an in-memory representation of your UI — a plain JavaScript object tree that mirrors the structure of the real DOM. When your component renders, React doesn't write to the DOM directly. It builds a virtual tree first, compares it to the previous one, figures out the minimum set of real DOM changes needed, and only then touches the browser.

```js
// What JSX compiles to — a plain object, not a DOM node
const vnode = {
  type: 'div',
  props: {
    className: 'card',
    children: [
      { type: 'h1', props: { children: 'Hello' } },
      { type: 'p',  props: { children: 'World'  } }
    ]
  }
};
```

Reconciliation is the algorithm React uses to diff two virtual trees and produce a minimal list of DOM mutations.

> **Check yourself:** What is the VDOM actually made of, and at what point in a render does React touch the real DOM?

---

## Why Does It Exist?

### The pre-React problem

Before React, you either hand-wrote DOM manipulation (`document.querySelector`, `.innerHTML`, `.appendChild`) or used jQuery to do it slightly more conveniently. Both approaches have the same fundamental problem: the programmer is responsible for keeping the DOM in sync with application state. As state gets complex, so does the synchronization logic — and bugs multiply.

The obvious alternative — re-render the whole DOM from scratch every time state changes — is too slow. A full DOM reconstruction triggers layout, paint, and compositing for every pixel on screen, even if only one word changed. Browsers are fast at JavaScript but expensive at layout.

React's answer: keep a cheap, in-memory tree (the VDOM), diff two snapshots of it in JavaScript, and batch the minimal set of real DOM operations. JavaScript object diffing is orders of magnitude cheaper than DOM mutation, so you get the conceptual simplicity of "re-render everything" with the performance of surgical DOM updates.

### Why not just compare strings?

An earlier idea was to serialize the whole UI to an HTML string and diff the strings. React's tree diff is far smarter — it understands component identity, key-based reordering, and component lifecycle, none of which are visible in a flat HTML string.

---

## How It Works

### Step 1 — Render produces a new virtual tree

Every time state or props change, React calls your render function (or function component body). The output is a new VDOM tree — a nested structure of React elements (plain objects).

```js
function Card({ title, body }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  );
}
// After JSX compilation, this produces something like:
// { type: 'div', props: { className: 'card', children: [...] } }
```

This is *cheap*. You're just allocating objects. No layout, no paint.

### Step 2 — Diffing (the reconciliation algorithm)

React compares the new virtual tree against the previous one. The naïve tree diff algorithm is O(n³) — React uses heuristics to reduce it to O(n):

**Heuristic 1: Same type → update. Different type → replace.**

If a node changes type (e.g. `<div>` becomes `<span>`), React tears down the entire subtree and builds a new one from scratch — no attempt to salvage children. This is intentional: if the element type changed, the DOM structure probably changed too, and incremental patching would be more complex than it's worth.

```js
// Before:
<div className="card">...</div>

// After — type changed, entire subtree is destroyed and rebuilt:
<section className="card">...</section>
```

**Heuristic 2: Keys identify children across re-renders.**

For lists, React needs to match old children to new children. Without keys, it matches by position: child[0] old → child[0] new, child[1] old → child[1] new, etc. This breaks when you prepend or reorder.

With keys, React matches by identity. A keyed child that moved position gets its DOM node moved, not destroyed and recreated.

```js
// Without keys — prepending destroys all existing DOM nodes and recreates:
[<li>B</li>, <li>C</li>]
// → [<li>A</li>, <li>B</li>, <li>C</li>]
// React sees: [0]=B→A, [1]=C→B, [2]=new C — mutates all three

// With keys — React sees A is new, B and C just moved:
[<li key="b">B</li>, <li key="c">C</li>]
// → [<li key="a">A</li>, <li key="b">B</li>, <li key="c">C</li>]
// React: insert A, move B, move C — only one DOM insertion
```

**Heuristic 3: Components of the same type preserve their instance.**

When a component stays the same type at the same position in the tree, React keeps the existing component instance (its state, refs, and effect state) and just passes new props. If the type changes, the old instance is unmounted (cleanup runs) and a brand-new instance is mounted.

```js
// CounterA stays mounted — state preserved:
{flag ? <CounterA /> : <CounterA />}

// CounterA unmounts, CounterB mounts — state reset:
{flag ? <CounterA /> : <CounterB />}
```

### Step 3 — Commit phase

After diffing, React has a list of mutations: create this node, update this attribute, remove that node, move this child. The commit phase applies these mutations to the real DOM synchronously. This is where `useLayoutEffect` fires (synchronously after DOM mutation, before paint) and `useEffect` fires (asynchronously after paint).

> **Check yourself:** What are the two core heuristics that make reconciliation O(n) instead of O(n³)? What does each one trade off?

---

## The O(n) Diff in Practice

The two heuristics together make reconciliation fast:

- React never compares across levels of the tree — only sibling-to-sibling and parent-to-child.
- When a type mismatch is found, the entire subtree is discarded — React doesn't recurse into it looking for salvageable children.
- Keys make list reconciliation a hash-lookup rather than a nested-loop comparison.

The result: a single pass through the tree, O(n) where n is the number of nodes.

---

## VDOM Is an Implementation Detail

React's VDOM is not in the spec. It's not what makes React React — it's one strategy React uses to efficiently update the DOM. React Native doesn't have a DOM at all; it uses the same reconciler to drive native views. This is possible because the VDOM is just an abstraction layer between your component tree and the output target.

The reconciler (the diff algorithm) is a separate package from the renderer (`react-dom`, `react-native`). This separation is why React can target multiple platforms from the same component code.

> **Check yourself:** Why can React Native use the same reconciliation algorithm despite having no DOM? What is the architectural separation that makes this possible?

---

## Gotchas

**1. Changing component type at the same tree position resets all state.**

This catches people off-guard when they conditionally render two components of different types:

```js
// Every time `isEditing` flips, the component unmounts and remounts.
// State, focus, scroll position — all reset.
{isEditing ? <EditForm /> : <DisplayCard />}
```

This is correct React behavior, but it surprises people who expect the DOM to be preserved.

**2. Index as key is a footgun for reorderable lists.**

Using index as key means React maps old[0]→new[0] by position, not identity. If you reorder or prepend items, React updates every node in the list even though the data didn't change — and worse, it can corrupt component state (e.g., an input field that held its own value).

```js
// Bad — index as key on reorderable list:
items.map((item, i) => <Row key={i} data={item} />)

// Good — stable, unique ID from data:
items.map(item => <Row key={item.id} data={item} />)
```

**3. Keys must be unique among siblings, not globally.**

A key only needs to be unique within its parent's children list. The same key value can appear in different lists.

**4. The VDOM is not free.**

Allocating and diffing virtual trees has a cost. It's much cheaper than DOM mutation, but it's not zero. At very high component counts (thousands of nodes diffed on every render), the VDOM diffing itself can become a bottleneck. This is part of why React introduced Fiber (incremental rendering) and why tools like Solid.js and Svelte compile away the VDOM entirely.

**5. Keys on non-list elements can force remounts.**

You can use `key` on any element, not just list items. Changing a key is a way to force React to destroy and recreate a component — useful for resetting a component's state without conditional rendering tricks. But doing it accidentally (e.g., generating keys with `Math.random()`) destroys and recreates the component on every render.

```js
// Intentional reset trick — key change forces unmount/remount:
<FileUploader key={uploadId} />

// Bug — random key means remount on every render:
<Item key={Math.random()} />
```

**6. React compares element types by reference.**

If you define a component inside another component's render, each render creates a new function reference. React sees a type change on every render and unmounts/remounts the inner component every time.

```js
// Bug — Inner is redefined on every render of Outer:
function Outer() {
  function Inner() { return <div /> } // new reference every render
  return <Inner />; // unmounts and remounts every render
}

// Fix — define Inner outside Outer:
function Inner() { return <div /> }
function Outer() { return <Inner />; }
```

---

## Interview Questions

**Q (High): What is the Virtual DOM and why does React use it?**

Answer: The Virtual DOM is an in-memory JavaScript object tree that represents the current UI. On every render, React produces a new virtual tree, diffs it against the previous one using its reconciliation algorithm, and applies only the resulting minimal set of mutations to the real DOM. It exists to bridge two requirements that are otherwise in conflict: the developer wants to express UI as a function of state (conceptually re-rendering everything on every change), while the browser is slow at DOM mutation. JavaScript object diffing is cheap; DOM layout and paint are expensive. The VDOM buys you the declarative mental model without the full re-render cost.

The trap: Weaker answers treat the VDOM as a performance silver bullet. Interviewers push back with "isn't object allocation also costly?" — the answer is yes, and that's why frameworks like Solid.js eliminate the VDOM. The VDOM is a good trade-off for typical component trees, not a universally superior architecture.

---

**Q (High): Walk me through what happens when `setState` is called.**

Answer: React schedules a re-render for that component. During the render phase, the component function runs and returns a new virtual tree. React diffs this tree against the previous one using the reconciliation algorithm — same-type nodes are updated, different-type nodes are replaced, keyed children are matched by identity. The diff produces a list of mutations. In the commit phase, React applies those mutations to the real DOM synchronously. `useLayoutEffect` fires synchronously before the browser has a chance to paint. `useEffect` fires asynchronously after the paint.

The trap: Many candidates skip the render/commit phase distinction. The interviewer often follows up with "so when does the DOM actually update?" — you need to know that render (diffing) and commit (DOM mutation) are separate phases, and that effects fire at different points in this pipeline.

---

**Q (High): Why are keys important in lists? What goes wrong without them?**

Answer: Without keys, React matches old children to new children by position. If you prepend an item to a list, React sees old[0]→new[0], old[1]→new[1], etc. — it mutates every existing DOM node and creates one new one, even though the existing items didn't change. With stable keys, React performs a hash-lookup: it finds items that moved and moves their DOM nodes, inserts genuinely new items, and removes deleted ones. This is both faster and correct — without keys, component state tied to list items (like input values) can end up attached to the wrong item after a reorder.

The trap: Candidates often say "keys help React be more efficient" without explaining the position-vs-identity distinction. The follow-up is always "what's wrong with using array index as a key?" — which requires knowing that index-as-key is equivalent to no key at all for any list that can be reordered or prepended.

---

**Q (Medium): How does changing a component's type at the same tree position affect its state?**

Answer: React uses element type as the primary identity signal. If a component at a given position changes type — even if the new component is functionally identical — React unmounts the old instance entirely and mounts a brand-new one. All state, refs, and effect cleanup from the old instance are gone. This is by design: React cannot know whether the new component's state shape is compatible with the old one's. The practical implication is that `{flag ? <A /> : <B />}` will always reset state when `flag` changes, even if A and B look the same. To preserve state across a type change, you'd need to lift the state up.

The trap: Candidates sometimes say "the state is preserved if the shape is the same." It's not. The key follow-up is "how would you preserve state across this conditional?" — lifting state or using a single component with conditional rendering internally.

---

**Q (Medium): How can you force a component to remount without changing its position in the tree?**

Answer: Change its `key` prop. When React sees a key change at the same tree position, it treats it as a different element and destroys the old instance, creating a new one. This is an intentional escape hatch — useful for resetting a form after submission, for example, without restructuring your JSX. The anti-pattern is generating keys randomly (e.g., `key={Math.random()}`), which remounts on every render.

The trap: Candidates who haven't used this pattern often say "you can't — you'd need to unmount the parent." Knowing that `key` is a universal remount trigger (not just a list optimization) is a sign of React depth.

---

**Q (Medium): What are the two core heuristics of React's O(n) reconciliation algorithm?**

Answer: First, if the element type changes, tear down the entire subtree and rebuild — no attempt to reuse children. Second, use keys to match children by identity rather than position in lists. Together, these reduce what would be an O(n³) tree diff to O(n): React only compares nodes at the same tree level and same position, and uses key lookups (O(1)) instead of nested comparisons for lists.

The trap: Candidates often state the heuristics without understanding the tradeoff they encode. The follow-up is "what's the cost of heuristic 1?" — the answer is that changing a wrapper element type (e.g., `div` to `section`) destroys all children, even if the children haven't changed. This can cause subtle performance issues or state resets if done carelessly.

---

**Q (Low): React Native doesn't have a DOM. How can it use the same reconciliation algorithm?**

Answer: The reconciler (the diff algorithm) is decoupled from the renderer (the thing that translates mutations into real output). `react-reconciler` produces a list of mutations — create, update, delete — against a virtual tree. `react-dom` takes those mutations and applies them to DOM nodes. `react-native` takes those same mutations and applies them to native views via the bridge. The VDOM abstraction layer means the reconciler never needs to know what it's rendering to. This is also how `react-three-fiber`, Ink (terminal), and other renderers work — same reconciler, different commit-phase implementations.

The trap: Candidates conflate "Virtual DOM" with "React's architecture." The VDOM is one part of React's architecture — the reconciler. The renderer is a separate, swappable layer.

---

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what the Virtual DOM is and why React uses it instead of directly mutating the DOM
- [ ] Can describe the two O(n) heuristics and name the tradeoff each one encodes
- [ ] Can explain why using array index as a key is dangerous for reorderable lists
- [ ] Can name what happens to component state when element type changes at the same tree position
- [ ] Can explain why `React.lazy` and React Native can share the same reconciler
- [ ] Can describe the intentional "key as remount trigger" pattern and its anti-pattern

---

*Next: Fiber Architecture — reconciliation explains *what* React diffs; Fiber explains *how* React schedules and interrupts that work to keep UIs responsive.*
