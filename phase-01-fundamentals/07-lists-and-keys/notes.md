# Lists & Keys

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| `key` prop | Stable identifier on each list item | Lets React match items by identity across renders, not by position |
| Positional matching (no key) | React assumes item at index N is the same item across renders | Breaks when items are added/removed/reordered — wrong state sticks to wrong items |
| Stable key | Same item always gets the same key across renders | Random or index keys break identity matching when the list changes |
| Key-based reset | Giving any component a new `key` forces a full unmount + remount | Cleanest way to reset a component's state when navigating between entities |

## What Is This?

When you render a collection of data — a list of comments, a table of users, a grid of products — you use JavaScript's `Array.map()` to transform each item into a React element:

```jsx
function UserList({ users }) {
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

The `key` prop on `<li>` is what this topic is really about. It looks like a small detail, but it's the mechanism React uses to track individual items across re-renders. Get it wrong, and React makes incorrect assumptions that produce subtle, hard-to-debug bugs — wrong components re-using old state, animations playing on the wrong item, inputs keeping the wrong value.

> **Check yourself:** What problem does the `key` prop solve? What does React do without it when items are removed from the middle of a list?

---

## Why Keys Exist — The Reconciliation Problem

When React re-renders a component that produces a list, it needs to figure out how the new list relates to the previous one. Did items move? Were items added or removed? Which items changed and which stayed the same?

Without keys, React compares lists by *position*. The first element in the new list is matched with the first element in the old list. The second with the second. And so on.

This works fine if you only ever add items at the end of the list. But consider a list of 3 items and you remove the first:

```
Before: [A, B, C]
After:  [B, C]
```

Positional matching says:
- Position 1: old=A, new=B → update A to look like B
- Position 2: old=B, new=C → update B to look like C
- Position 3: old=C, new=nothing → remove C

React just modified two existing DOM nodes and removed one. The result looks right visually. But the DOM node that was rendering A is now rendering B — it got *mutated*, not replaced. Any component state attached to that position is still there, now showing wrong data.

With keys, React matches by identity, not position:

```
Before: [A(key=1), B(key=2), C(key=3)]
After:  [B(key=2), C(key=3)]
```

Now React says:
- key=1 (A): was in the old list, not in the new list → remove it
- key=2 (B): moved from position 2 to position 1 → move the DOM node
- key=3 (C): moved from position 3 to position 2 → move the DOM node

No mutation. No wrong state. React correctly identifies what happened — A was removed, B and C shifted up — and makes the minimal correct DOM changes.

**This is the entire reason keys exist**: to let React identity-match list items across renders so it can correctly determine what changed.

---

## What Makes a Good Key

A good key has three properties:

**1. Stable** — the key for a given item must be the same across renders. If the key changes between renders, React thinks the old item was removed and a new item was added — it unmounts and remounts, destroying state. A random number like `Math.random()` as a key is a disaster: every render is a new key, every render destroys and recreates every item.

**2. Unique among siblings** — keys only need to be unique within the list, not globally. You can use `id: 1` in one list and `id: 1` in another — they're in different parts of the tree. But within a single list, all keys must be unique. Duplicate keys confuse React's matching.

**3. Derived from the data** — the best key is a natural, permanent identifier from your data: a database ID, a UUID, a slug. If your data has a unique, stable identifier, use it.

```jsx
// Good — stable, unique ID from the data
{users.map(user => <UserCard key={user.id} user={user} />)}

// Good — composite key if combination is unique
{items.map(item => <Row key={`${item.categoryId}-${item.itemId}`} item={item} />)}

// Bad — index (sometimes fine, see below)
{users.map((user, index) => <UserCard key={index} user={user} />)}

// Terrible — new random key every render
{users.map(user => <UserCard key={Math.random()} user={user} />)}
```

> **Check yourself:** What are the three properties of a good key? Why is `Math.random()` a disaster as a key, and what specifically happens on every re-render when you use it?

---

## When Index as Key Is Acceptable

Using the array index as key is often warned against, but the warning is context-dependent. It's **acceptable when all three of these are true**:

1. The list is **static** — items are never reordered, inserted at the middle, or removed
2. Items have **no state** — no inputs, no animations, no local state of their own
3. No **stable unique ID** exists in the data

An example: rendering a static list of navigation links read from config. The list never changes, there's no state on the items, and there's no natural ID. Index is fine here.

It's **not acceptable** when:
- Items can be reordered (drag-and-drop, sorting)
- Items can be added at the beginning or middle
- List items contain inputs, animated elements, or any stateful child components

The core problem: when items reorder with index keys, React matches old item at index 0 with new item at index 0. The DOM node from the old item (with its associated state) now displays the new item's data. A text input at index 0 will keep whatever value the old item had.

---

## Keys as an Identity Reset Mechanism

Keys are not just for lists. You can use a key on any component to tell React "this is a completely different instance, throw away the old one and start fresh."

```jsx
function ProfilePage({ userId }) {
  return <UserForm key={userId} userId={userId} />;
}
```

When `userId` changes, the key changes, and React unmounts the old `UserForm` completely and mounts a brand new one. All state is reset. Without the key, React would update the existing `UserForm` with the new `userId` prop — and any local form state (draft edits, validation errors) would persist from the previous user's form.

This is a much cleaner solution than `useEffect(() => { resetState() }, [userId])`. The key approach: change the identity, get a fresh component. The effect approach: component remounts anyway but you're manually resetting state after the fact with an extra render cycle.

Use cases for key-based resets:
- Forms that should reset when you navigate to a "new" entity
- Animations that should restart when content changes
- Any component whose state lifecycle should be tied to an identity in the data

---

## Keys in Fragments

If your list items need to be wrapped in a Fragment to avoid adding an extra DOM node, you need the long-form Fragment syntax to attach the key:

```jsx
function DefinitionList({ terms }) {
  return (
    <dl>
      {terms.map(term => (
        // <> shorthand doesn't accept props — use React.Fragment with key
        <React.Fragment key={term.id}>
          <dt>{term.word}</dt>
          <dd>{term.definition}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
```

`<>` is syntactic sugar for `React.Fragment` with no props. Since keys are props, you can't add them to `<>`. When you need a keyed Fragment, you must write `<React.Fragment key={...}>` explicitly.

---

## Nested Lists

With nested lists, keys only need to be unique within their own level:

```jsx
function CategoryList({ categories }) {
  return (
    <ul>
      {categories.map(cat => (
        <li key={cat.id}>
          <h3>{cat.name}</h3>
          <ul>
            {cat.items.map(item => (
              <li key={item.id}>{item.name}</li>
              // item.id only needs to be unique within cat.items, not globally
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
```

---

## Performance Note

Keys help React avoid unnecessary DOM work by correctly identifying what changed. But the main benefit is *correctness*, not raw performance. Even without keys, React would update the DOM — it would just do it wrong (mutating nodes that should have been removed/recreated). Keys don't make React faster on average; they make it correct.

The actual performance benefit is that with stable keys on unchanged items, React can bail out of re-rendering those list items if they're wrapped in `React.memo` (covered in Phase 5). But that's a separate optimization — the keys themselves are about identity, not speed.

---

## Gotchas

**React doesn't throw when keys are missing — it warns, and silently behaves incorrectly.** The missing-key warning in the console is easy to dismiss, but the bugs it flags are real. Input state staying on the wrong item, animations playing wrong, components keeping stale state — these are the consequences. Take the warning seriously.

**Keys are not available inside the component.** You can't read `props.key` — React strips it before passing props. If you need to pass a database ID both as a key and as data inside the component, pass it twice: `<Item key={item.id} id={item.id} {...item} />`.

**Key must be a string or number.** Technically, React accepts bigints too, but symbols, objects, and functions are not valid keys. Use IDs, slugs, or composed strings.

**The key is on the outermost element returned from map.** If you wrap list items in a component, the key goes on the component, not on whatever DOM element the component returns internally:

```jsx
// Correct — key is on the component React is managing in the list
{items.map(item => <ItemCard key={item.id} item={item} />)}

// Wrong — ItemCard has no key; React can't track it
{items.map(item => <ItemCard item={item} />)}
```

**Reordering a list of inputs without stable keys causes value bleed.** This is the most painful real-world consequence. If you have a list of `<input>` fields and you sort or rearrange the list using index keys, the input values stay in their original DOM positions while the labels shift. The user sees "Name" next to the value that was previously under "Email." Stable data-derived keys prevent this entirely.

---

## Interview Questions


**Q (High): What is the `key` prop and why does React require it on list items?**

Answer: The `key` prop is a stable identifier that React uses to match elements across renders. Without it, React matches list items by position — the first new item is assumed to be the same as the first old item. This breaks when items are added, removed, or reordered: React incorrectly mutates existing DOM nodes rather than adding, removing, or moving them. With keys, React matches by identity regardless of position, so it can correctly determine what actually changed — moved items keep their DOM nodes and state, removed items are unmounted, new items are created fresh.

The trap: "It's just for performance." Keys are primarily about correctness. The bugs from wrong or missing keys are subtle and hard to find — state attaches to the wrong items, inputs keep stale values, animations misfire.

---

**Q (High): Why is using array index as a key problematic, and when is it acceptable?**

Answer: When you use index as a key, React maps DOM nodes to positions in the array, not to items by identity. When items are added at the beginning or middle, or reordered, the index of each item changes — but React still matches old key 0 to new key 0. The DOM node that was rendering the old item at index 0 is now repurposed for the new item at index 0. Any component state at that position (input values, open/closed state, animations) persists incorrectly. It's acceptable when the list is static (no additions, removals, or reordering), items have no local state (no inputs, no animations), and no natural unique ID exists in the data. If all three hold, index keys are harmless.

The trap: Saying index keys are always wrong. They're fine in specific constrained cases. The interviewer is testing whether you understand *why* they're wrong, not just that they are.

---

**Q (High): How can you use a `key` prop outside of a list to reset a component's state?**

Answer: Changing a component's key forces React to unmount the old instance and mount a completely fresh one. Any state the component held is destroyed. This is useful when a component's lifecycle should be tied to an identity from data — for example, a user profile form that should reset completely when you navigate from one user's profile to another. `<UserForm key={userId} />` means "every distinct userId is a distinct component instance." When userId changes, the old form is thrown away and a new one starts with fresh state. This is cleaner than `useEffect(() => { resetState() }, [userId])`, which resets state after an extra render cycle and can cause flickering.

The trap: Not knowing this technique exists. It solves a common class of bugs (stale state from a previous entity leaking into a new entity's view) in one line.

---

**Q (Medium): Why can't you use `Math.random()` as a key?**

Answer: Because `Math.random()` generates a new value on every render. Every render, every item gets a new key — which means React thinks every item was removed and a new one added. It unmounts and remounts every component in the list on every parent re-render. This defeats the purpose of keys entirely, plus it's a performance catastrophe for large lists and causes state to reset on every render. A key must be *stable* — the same item must have the same key across renders so React can recognize it as the same item.

The trap: Thinking any unique value is a good key. Uniqueness is necessary but not sufficient — the key also has to be stable.

---

**Q (Medium): You have a list where items can be reordered by drag-and-drop. What key strategy do you use?**

Answer: Always use a stable, data-derived identifier — a database ID, a UUID, or any other field that uniquely identifies the item and doesn't change when the item's position changes. This is exactly the scenario where index keys break completely: after a drag, every item has a new index, so React would rematch all keys to wrong positions and corrupt any state attached to list items. With stable IDs, React correctly identifies each item's new position and moves the DOM nodes accordingly. If your data doesn't have natural IDs, generate them once at creation time — `crypto.randomUUID()` on item creation, not on render.

The trap: Reaching for index keys because they seem easier. Drag-and-drop is precisely the use case where index keys fail most visibly.

---
**Q (Low): Are keys global or scoped to a list?**

Answer: Keys are scoped to the immediate siblings within a parent. Two separate lists can both have an item with `key="1"` — that's not a conflict. React only compares keys within the same parent container. Keys only need to be unique among their siblings, not across the entire component tree.

The trap: Thinking keys need to be globally unique. They don't. The constraint is sibling-unique, not globally unique.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what React does without keys when an item is removed from the middle of a list — the exact mutation sequence
- [ ] Can name the three properties of a good key (stable, sibling-unique, data-derived) and explain each
- [ ] Can state the three conditions under which index keys are acceptable, and give one example where they'd fail
- [ ] Can write a `<React.Fragment key={...}>` pattern for a keyed list item that returns two sibling elements
- [ ] Can explain the key-based reset pattern and why it's cleaner than a `useEffect` reset

---

*Next: Fragments — lists need a wrapper element to be valid JSX, but sometimes that wrapper shouldn't be a real DOM node. Fragments solve the "I need a root but I don't want a DOM element" problem — and understanding what they compile to clarifies why they exist.*
