# State & Immutability

## What Is This?

**State** is data that a component owns and can change. When state changes, React re-renders the component — recalculates what the UI should look like with the new data and updates the screen accordingly.

That sentence sounds simple, but there are two things packed into it that are worth unpacking before going further:

1. *Owns* — the component holds the state, not its parent, not a global variable. The component is the source of truth for that data.
2. *Can change* — unlike props, which are handed to the component from outside and can never be modified, state is something the component controls and mutates over time.

The canonical hook for state in function components is `useState`:

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

`count` is the current value. `setCount` is the function you call to change it. When `setCount` runs, React schedules a re-render, calls `Counter` again, and `count` now holds the new value.

**Immutability** is the rule that you must never modify state in place — you must always create a new value and hand it to the setter. You don't do `count = count + 1`. You don't do `user.name = 'New Name'`. You always produce a new object or value and pass it to the state setter.

This isn't a suggestion. It's a hard requirement. Breaking it breaks React's ability to detect changes, compare old and new state, and schedule re-renders correctly. Understanding *why* is the entire substance of this topic.

---

## Why Immutability — The Mechanism That Demands It

React decides whether to re-render based on whether state *changed*. But how does it check? It uses **reference equality** — it compares the previous value and the new value with `===`.

For primitives, this is straightforward:
- `5 === 5` → same, no re-render
- `5 === 6` → different, re-render

For objects and arrays, `===` compares references (memory addresses), not content:

```js
const a = { name: 'Osama' };
const b = { name: 'Osama' };

a === b // false — different objects in memory, even with identical content

const c = a;
c === a // true — same reference
```

This is the key insight. If you mutate an object in place:

```js
// Wrong — mutating in place
const [user, setUser] = useState({ name: 'Osama', role: 'engineer' });

user.name = 'Ali'; // you changed the content, but the reference is still the same
setUser(user);     // React sees: old reference === new reference → no change → no re-render
```

React compares the old `user` reference to the new `user` reference. They're the same object — you just changed a property on it. From React's perspective, nothing changed. The UI silently doesn't update.

This is the "mutation breaks things silently" problem. You changed data, the screen didn't change, and there's no error to tell you why.

The fix is to always produce a *new* reference:

```js
// Correct — new object
setUser({ ...user, name: 'Ali' }); // new object, new reference → React sees a change → re-render
```

Spread creates a new object. The references are different. React detects the change. Re-render happens. UI updates.

---

## How useState Works Under the Hood

When React calls your function component, how does it remember state between calls? The function is called fresh each time — local variables are gone when the function returns.

React stores state *outside* the function, in a data structure attached to the component's position in the fiber tree (the internal representation of the component tree). When you call `useState(0)`, React:

1. Looks up the current fiber for this component
2. Reads the state stored at hook slot #1 (the first `useState` call)
3. Returns the current value and a setter that can update that slot

When you call `setCount(5)`, React:
1. Updates the value in the fiber's hook slot
2. Schedules a re-render for this component
3. When re-rendering, calls the function again — this time `useState(0)` returns `5` (the 0 is just the *initial* value, ignored after the first render)

This is why hooks must always be called in the same order — React uses *position* to identify which hook is which. If you call hooks conditionally, the positions shift, and React reads the wrong state for the wrong hook. (This is the basis for the first Rule of Hooks.)

---

## Reading State — The Snapshot Model

Here's something that trips people up: state is a *snapshot* per render, not a live reference to the latest value.

When your function runs, `count` is whatever count was at the start of that render. It doesn't update mid-render, and it doesn't reflect changes that happened in the same batch.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return <button onClick={handleClick}>{count}</button>;
}
```

You might expect clicking this to increment by 3. It increments by 1. Because `count` is read from the snapshot at the start of the render — it's `0` for all three calls. So all three calls are `setCount(0 + 1)` — they all set state to 1.

If you need to update state based on the *previous* state (especially in rapid succession), use the **functional update form**:

```jsx
setCount(prev => prev + 1);
setCount(prev => prev + 1);
setCount(prev => prev + 1);
```

Each function receives the most recent committed (or pending) value, not the snapshot. React queues these and applies them in sequence: 0 → 1 → 2 → 3. You get an increment of 3.

The rule: **if the new state depends on the previous state, always use the functional form.**

---

## Updating Objects and Arrays in State

Because you can't mutate, updating nested data requires spreading or copying.

### Objects

```jsx
const [user, setUser] = useState({ name: 'Osama', role: 'engineer', age: 31 });

// Change just the name — copy the rest
setUser(prev => ({ ...prev, name: 'Ali' }));

// Nested objects need nested spreads
const [settings, setSettings] = useState({
  theme: { mode: 'dark', color: 'blue' },
  notifications: true,
});

// Change just the nested theme mode
setSettings(prev => ({
  ...prev,
  theme: { ...prev.theme, mode: 'light' }
}));
```

Each spread creates a new object. Each level you change needs a new object. Levels you don't change can keep their references (that's fine — they haven't changed).

If you have deeply nested state that's painful to update this way, that's usually a signal to flatten the structure or reach for Immer (which lets you write mutating-style code that produces new references behind the scenes).

### Arrays

Arrays need new references too. Avoid `push`, `pop`, `splice`, `sort`, `reverse` — all of these mutate in place.

```jsx
const [items, setItems] = useState([1, 2, 3]);

// Add an item — use spread into a new array
setItems(prev => [...prev, 4]);

// Remove an item — use filter (returns a new array)
setItems(prev => prev.filter(item => item !== 2));

// Update an item — use map (returns a new array)
setItems(prev => prev.map(item => item === 2 ? 20 : item));

// Insert at position
setItems(prev => [...prev.slice(0, 2), 99, ...prev.slice(2)]);
```

`map`, `filter`, `slice`, and spread all return new arrays. `push`, `pop`, `splice`, `sort` mutate the original. Stick to the former when updating state.

---

## State Initialization

### Initial value is read only once

The argument to `useState` is only used on the first render:

```jsx
function Component({ defaultCount }) {
  const [count, setCount] = useState(defaultCount);
  // If `defaultCount` prop changes later, `count` won't change — the initial value is frozen
}
```

This surprises people. If you want state that resets when a prop changes, you need `useEffect` or a key prop (covered in later topics).

### Lazy initialization — for expensive initial values

If computing the initial state is expensive, don't do it on every render:

```jsx
// Wrong — this function runs on every render, result is discarded after first
const [data, setData] = useState(expensiveComputation());

// Correct — pass the function itself, React calls it only once
const [data, setData] = useState(() => expensiveComputation());
```

The difference: `useState(expensiveComputation())` calls the function, then passes the result. The function runs every render. `useState(() => expensiveComputation())` passes the function reference — React calls it only on the first render.

---

## When to Use State vs Props vs Something Else

The mental model for deciding:

- **Props** — data that comes from outside this component, controlled by the parent, read-only
- **State** — data this component owns, changes over time, causes re-renders
- **Derived values** — if a value can be computed from state or props, don't put it in state; compute it inline. More state = more sync work = more bugs

A common mistake is storing derived data in state:

```jsx
// Wrong — productCount is derived from products, no need to store it
const [products, setProducts] = useState([]);
const [productCount, setProductCount] = useState(0); // keep in sync manually?

// Correct — derive it
const [products, setProducts] = useState([]);
const productCount = products.length; // always in sync, zero effort
```

If you find yourself updating two state variables simultaneously (always together, never independently), they're probably derived from a single source or should be one object.

---

## Batching — Multiple State Updates in One Render

React batches state updates that happen in the same event handler into a single re-render:

```jsx
function handleClick() {
  setCount(c => c + 1);  // doesn't re-render yet
  setName('Ali');         // doesn't re-render yet
  setVisible(true);       // doesn't re-render yet
  // React re-renders once here, after the handler completes
}
```

Before React 18, batching only happened inside React event handlers. Updates inside `setTimeout`, `Promise.then`, or native event listeners ran separately and caused multiple re-renders. React 18 introduced **automatic batching** — now all updates are batched everywhere by default. This is generally a free performance win, but it means you can't rely on seeing an intermediate render between two `setState` calls in the same async context.

If you ever need to opt out (rare), `flushSync` from `react-dom` forces synchronous rendering:

```jsx
import { flushSync } from 'react-dom';

flushSync(() => setCount(c => c + 1));
// DOM is updated here before continuing
flushSync(() => setName('Ali'));
```

---

## Gotchas

**Mutating state and then calling the setter doesn't fix the mutation.** Some people mutate the state object, realize the problem, then call the setter with the mutated object hoping that kicks off a re-render. Even if the re-render happens (because something else triggers it), you've now broken the immutability contract — previous renders that closed over the old state reference will see the mutation too, because it's the same object. Once you mutate, the problem is bigger than just a missed re-render.

**`useState`'s setter does not merge — it replaces.** Unlike `this.setState` in class components, the function component setter replaces the entire state value. With objects:

```jsx
const [user, setUser] = useState({ name: 'Osama', role: 'engineer' });

// Wrong — loses `role`
setUser({ name: 'Ali' });
// user is now { name: 'Ali' } — role is gone

// Correct
setUser(prev => ({ ...prev, name: 'Ali' }));
```

`this.setState` in class components *merged* the new object into existing state. `useState`'s setter does not. This is one of the migration gotchas from class to function components.

**Calling the setter with the current value may skip a re-render.** React uses `Object.is` to compare the previous and new value. If they're the same (`Object.is(prev, next)` is true), React bails out without re-rendering. For primitives, that means `setCount(count)` is a no-op. For objects, it means two different objects with the same shape will still trigger a re-render (different references), while the same reference will not.

**State updates are asynchronous — you can't read the new value on the next line.** After calling `setCount(5)`, `count` is still the old value for the rest of this render's execution:

```jsx
setCount(5);
console.log(count); // still the old value — state hasn't updated yet
```

The new value appears in the *next render*. If you need to use the new value immediately in the same handler, store it in a local variable first.

**React doesn't update state in the middle of rendering.** All state updates are deferred — React finishes the current render, then applies updates and re-renders. You cannot `useState` inside a `for` loop or if statement (Rules of Hooks), and calling a setter mid-render (directly in the function body outside of event handlers) causes an infinite render loop.

---

## Interview Questions

**Q (High): What is state in React, and how is it different from props?**

Answer: State is data that a component owns and can change over time. Props are data passed in from a parent — read-only inside the component, owned by the caller. The key distinction is *ownership*: props are what you're given, state is what you hold. When state changes, React re-renders the component. When props change (parent re-renders with new values), the component also re-renders — but the component can't initiate that change itself. State is for internal, mutable data; props are for external, immutable data.

The trap: Saying "state is for dynamic data, props are for static data." Props change too — they just change when the parent says so. The real distinction is ownership and write access.

---

**Q (High): Why must you never mutate state directly in React? What happens if you do?**

Answer: React uses reference equality (`===`) to detect state changes. If you mutate an object in place — `user.name = 'Ali'` — the object's reference doesn't change. When you pass the same reference to `setUser`, React compares old and new: they're the same reference, so it concludes nothing changed, and no re-render happens. The UI silently stays stale. Even if a re-render happens later for another reason, you've now corrupted the snapshot model — any previous render's closures that captured the old state reference will see the mutated value, because it's the same object. You break time-travel debugging, you break `React.memo`'s shallow comparison, and you break predictability generally. The fix is to always produce a new reference for any changed value.

The trap: Thinking React throws an error. It doesn't. Silent breakage is harder to debug than a crash.

---

**Q (High): What is the functional update form of `useState`, and when should you use it?**

Answer: Instead of `setCount(count + 1)`, you pass a function: `setCount(prev => prev + 1)`. The function receives the most recent committed (or pending) state, not the closure's snapshot. You must use this form when the new state depends on the previous state, especially when multiple updates happen in the same synchronous batch, or when the update happens inside a closure that might be stale (like a `setTimeout` or event listener that captured an old value). The classic failure case: calling `setCount(count + 1)` three times in one handler increments by 1, not 3, because all three calls read the same snapshot. The functional form queues each update on top of the last: 0 → 1 → 2 → 3.

The trap: Using `setCount(count + 1)` everywhere and only switching to the functional form when debugging a bug. The safer default is to always use the functional form when the next value is derived from the previous one.

---

**Q (High): Why does calling `useState`'s setter not merge the object, like `this.setState` did in class components?**

Answer: `this.setState` in class components did a shallow merge of the update object into `this.state`. This was a convenience, but it came with its own problems — it was implicit behavior, and deep properties still weren't merged. `useState`'s setter is a full replacement: whatever you pass becomes the new state. This is more predictable and explicit. The cost is that you have to manually spread when updating objects: `setUser(prev => ({ ...prev, name: 'Ali' }))`. It's slightly more verbose, but the behavior is unambiguous. This is one of the most common gotchas when migrating from class to function components.

The trap: Doing `setUser({ name: 'Ali' })` and wondering why role and other fields disappeared.

---

**Q (Medium): What is lazy initialization in `useState`, and why does it matter?**

Answer: `useState` accepts either a value or a function as its argument. If you pass a function — `useState(() => expensiveComputation())` — React calls it only on the first render to get the initial value. If you pass a value directly — `useState(expensiveComputation())` — the computation runs on *every render*, even though React only uses the result on the first. For lightweight computations, this is harmless. For something expensive — reading from localStorage, parsing large data, computing a complex initial structure — you'd be paying the cost on every render for no reason. Lazy initialization is how you avoid that: pass the initializer function, not its result.

The trap: Forgetting the `() =>` and wondering why a supposedly-one-time operation is slow every render.

---

**Q (High): State update after `useState`'s setter is called — when does the new value appear?**

Answer: Not immediately. State updates are asynchronous — they're scheduled and applied on the next render. After calling `setCount(5)`, reading `count` on the very next line still gives you the old value. The function doesn't suspend or wait — it returns immediately, and React queues the update for when it's ready to re-render. The new value appears when the component function is called again for the next render. If you need to work with the new value immediately in the same synchronous execution, store it in a local variable: `const newCount = count + 1; setCount(newCount); doSomethingWith(newCount)`.

The trap: Reading state right after setting it and assuming you'll see the new value.

---

**Q (High): What is automatic batching in React 18, and what changed from React 17?**

Answer: Batching is React's optimization of grouping multiple state updates together and applying them in a single re-render. In React 17 and earlier, batching only applied inside React synthetic event handlers. Updates inside `setTimeout`, `Promise.then`, or native DOM event listeners each triggered their own re-render — meaning three `setState` calls inside a `setTimeout` caused three re-renders. React 18 extended batching to cover all contexts by default, including async code. This means three updates inside a `setTimeout` or `await` block now produce one re-render instead of three. It's a free performance improvement, but code that relied on seeing intermediate renders between async `setState` calls may behave differently.

The trap: Not knowing this changed at all, or claiming "batching has always applied everywhere." The async-context change is what's new in React 18.

---

**Q (Medium): If two state variables always change together, is that a problem?**

Answer: It's a signal — probably yes. If you always update `firstName` and `lastName` together, they should probably be one `{ firstName, lastName }` state object. Keeping them separate means you have to keep them in sync manually — if you forget one setter, you have inconsistent state. Combining related state makes the relationship explicit and removes the sync burden. The opposite problem is combining *unrelated* state: `{ count, name, isOpen }` in one object means any change to any field forces you to spread the whole thing and risks accidentally clobbering fields. The rule: group state that changes together, separate state that changes independently.

The trap: Thinking more state variables is always cleaner. Related state grouped in one object is often easier to reason about and harder to corrupt.

---

**Q (Medium): Can you derive a value from state without putting it in state?**

Answer: Yes — and you should. If a value can be computed from existing state or props, computing it inline is always better than storing a derived copy. Storing derived state means you have two sources of truth for the same information: you must update both simultaneously, and if you ever forget to sync them, they drift apart. Derived values computed inline are always in sync by definition. A common example: if you have `items` in state, `items.length` is not a candidate for state — it's computed for free from the array. If you have `firstName` and `lastName`, `fullName` is derived. Only put data in state that has no other source of truth.

The trap: Not recognizing derived state. The test: "could I delete this state variable and recompute it from other state?" If yes, it's derived — remove the state.

---

**Q (Medium): What is Object.is and how does React use it in state comparison?**

Answer: `Object.is` is JavaScript's strict equality check with two edge case fixes over `===`: `Object.is(NaN, NaN)` returns `true` (while `NaN === NaN` returns `false`), and `Object.is(+0, -0)` returns `false` (while `+0 === -0` returns `true`). React uses `Object.is` to compare previous and new state after you call a setter. If they're the same by this comparison, React bails out without re-rendering — no DOM update, no child component re-renders. This is the basis for the "mutation breaks things" problem: mutating an object and passing the same reference means `Object.is(old, new)` is `true`, so React skips the re-render.

The trap: Not knowing React uses `Object.is` and describing the check as just `===`. The NaN and ±0 edge cases rarely matter in practice, but knowing `Object.is` specifically shows you understand the mechanism.

---

*Next: One-Way Data Flow — state and props both participate in React's data flow model. One-way flow is the architectural rule that makes state changes predictable: data moves down the tree as props, change requests move back up through callbacks. Understanding this constraint is what makes lifting state up and the broader patterns of state management click.*
