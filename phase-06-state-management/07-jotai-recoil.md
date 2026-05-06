# Jotai and Recoil

## The Atom Model

Both Jotai and Recoil are built on the **atom** abstraction: a small, independent unit of state that components can subscribe to individually. A component subscribes to an atom and re-renders only when that atom's value changes — not when unrelated atoms change.

This is the opposite of Redux's single store model. Instead of one centralized state tree that you slice with selectors, you have many small state atoms that you compose into larger derived values.

---

## Recoil

Recoil was built by Facebook. It requires a `RecoilRoot` provider at the root of your app.

**Atoms:**

```js
import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';

const countAtom = atom({
  key: 'count',      // unique string key — required, used for DevTools and persistence
  default: 0,
});

function Counter() {
  const [count, setCount] = useRecoilState(countAtom); // read + write
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function CountDisplay() {
  const count = useRecoilValue(countAtom); // read only — cleaner for display components
  return <span>{count}</span>;
}

function ResetButton() {
  const setCount = useSetRecoilState(countAtom); // write only — never re-renders
  return <button onClick={() => setCount(0)}>Reset</button>;
}
```

**Selectors** — derived state:

```js
import { selector } from 'recoil';

const doubledCountSelector = selector({
  key: 'doubledCount',
  get: ({ get }) => {
    const count = get(countAtom);
    return count * 2;
  },
});

function DoubledDisplay() {
  const doubled = useRecoilValue(doubledCountSelector);
  return <span>{doubled}</span>;
}
```

Selectors are automatically memoized. They re-run only when their atom dependencies change. A component subscribing to a selector re-renders only when the selector's output changes — not on every atom change.

**Async selectors:**

```js
const userSelector = selector({
  key: 'user',
  get: async ({ get }) => {
    const userId = get(userIdAtom);
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  },
});

// Use with Suspense
function UserProfile() {
  const user = useRecoilValue(userSelector); // suspends until resolved
  return <span>{user.name}</span>;
}
```

---

## Jotai

Jotai is a leaner, more minimal take on the atom model, also by Daishi Kato (Zustand). No string keys, no required provider (a `Provider` is optional for scoping), and a simpler API surface.

**Atoms:**

```js
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

const countAtom = atom(0); // just a value, no key string needed

function Counter() {
  const [count, setCount] = useAtom(countAtom); // same API as useState
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function CountDisplay() {
  const count = useAtomValue(countAtom); // read-only
  return <span>{count}</span>;
}
```

**Derived atoms** (the Jotai equivalent of selectors):

```js
const doubledAtom = atom(get => get(countAtom) * 2); // read-only derived atom

// Read + write derived atom
const trimmedNameAtom = atom(
  (get) => get(nameAtom).trim(),
  (get, set, value) => set(nameAtom, value.trim())
);
```

**Async atoms:**

```js
const userAtom = atom(async (get) => {
  const id = get(userIdAtom);
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

// Works with React Suspense automatically
function UserProfile() {
  const user = useAtomValue(userAtom);
  return <span>{user.name}</span>;
}
```

**`atomWithStorage`** for persistence (from `jotai/utils`):

```js
import { atomWithStorage } from 'jotai/utils';

const themeAtom = atomWithStorage('theme', 'light');
// reads from localStorage on init, writes to localStorage on change
```

---

## Jotai vs Recoil: Key Differences

| | Jotai | Recoil |
|---|---|---|
| String keys | Not required | Required (`key` field) |
| Provider | Optional | Required (`RecoilRoot`) |
| Bundle size | Smaller (~3kb) | Larger (~20kb+) |
| Async | Async atoms (Suspense) | Async selectors (Suspense) |
| Maintenance | Active | Reduced activity since ~2023 |
| TypeScript | First-class | Good but more verbose |

Recoil was influential but its development slowed significantly after the Facebook team moved on. Jotai is the practical choice for new projects that want the atom model.

---

## Atom Model vs Single Store

The atom model shines when:
- State is highly granular — many independent pieces, not a monolithic tree
- Components have fine-grained subscriptions (each subscribes to its own atoms)
- Derived state is complex and benefits from automatic dependency tracking
- You want React Suspense-compatible async state without manual loading flags

It's awkward when:
- You need a global action log (atoms have no action dispatch concept)
- You need middleware-style side effect management
- The team is used to Redux's explicit state transitions and wants auditability

---

## Interview Questions

**Q (High): What is an atom and how is it different from Redux state?**

Answer: An atom is an independent unit of state — a single value that components can subscribe to individually. In Redux, all state lives in a single store and you use selectors to access slices of it; every subscribed component is notified when any part of the store changes (then filtered by selector comparison). With atoms, state is fragmented by design: each atom is a separate subscription channel. A component subscribing to `countAtom` is completely unaffected by changes to `nameAtom`. This gives you granular subscriptions without writing selectors, and enables derived state through dependency graphs rather than a single normalized tree.

---

**Q (High): How do Jotai/Recoil derived atoms/selectors work? When do they recompute?**

Answer: A derived atom or selector declares dependencies by calling `get(someAtom)` during its evaluation. The library tracks which atoms were accessed. When any dependency changes, the derived atom recomputes. Consumers of the derived atom re-render only if the derived atom's output changes. This creates an automatic dependency graph — you don't declare dependencies manually like you do with `useMemo` deps arrays. Importantly, if a dependency changes but the derived output remains the same (e.g., a filter that still returns the same items), no re-render occurs. This makes complex derived state efficient without manual memoization wiring.

---

**Q (Medium): Why would you choose Jotai over Recoil today?**

Answer: Jotai is smaller (~3kb vs ~20kb+), requires no string keys (Recoil's keys are required and must be globally unique — a source of bugs in large codebases), and doesn't require a Provider. Recoil's development has significantly slowed since the core team's priorities shifted post-Facebook; the library has accumulated unresolved issues. Jotai has active maintenance, better TypeScript support, and a cleaner API for the same atom paradigm. For new projects wanting the atom model, Jotai is the practical choice.

---

**Q (Medium): How does the atom model integrate with React Suspense?**

Answer: Async atoms and selectors return Promises. When a component reads an async atom whose Promise hasn't resolved yet, Jotai/Recoil throw the Promise (the Suspense protocol). The nearest `<Suspense>` boundary catches it and renders the fallback until the Promise resolves. When it resolves, the atom updates and the component renders with the data — no `isLoading` flags, no conditional rendering boilerplate. This makes async data fetching feel like synchronous state access. The component declares what data it needs; Suspense handles the loading state transparently.

---

*Next: Server state vs client state — why they have fundamentally different lifecycles and why trying to manage both with one tool is a mistake.*
