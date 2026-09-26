# Custom Hook Pattern

## Quick Reference

| Idea | What it means | Why it matters |
|---|---|---|
| Custom hook | A function named `useX` that calls other hooks | Reuses *logic*, not *state* |
| Each call is isolated | Two components calling `useToggle()` get two independent states | Hooks share code, not values — sharing values needs Context / a store |
| API shape | Params in, `[value, actions]` or `{ … }` out | The return shape is the contract you'll live with |
| Rules of Hooks | Top level only, React functions only | Hook order *is* the identity of its state |
| Where it wins | Logic reuse, flat composition, easy testing (`renderHook`) | Replaced HOCs and render props for logic |

## Where You've Seen This Before

- Custom hooks as the modern reuse mechanism, extraction rules, testing → [Phase 4: Custom hooks as the modern pattern](../../phase-04-component-patterns/05-custom-hooks-modern-pattern/notes.md)
- The Rules of Hooks and why order matters → [Phase 2: Rules of hooks](../../phase-02-hooks/16-rules-of-hooks/notes.md)
- `useDebounce`, `useLocalStorage`, `usePrevious`… a catalogue → [Phase 2: Common custom hooks](../../phase-02-hooks/18-common-custom-hooks/notes.md)
- Building `useFetch` / `useDebounce` under interview conditions → [Phase 14: useDebounce & useThrottle](../../phase-14-live-coding/01-use-debounce-throttle/notes.md), [useFetch](../../phase-14-live-coding/02-use-fetch/notes.md)
- Testing them → [Testing custom hooks](../../phase-10-testing/06-testing-custom-hooks/notes.md)

**New here:** the pattern's *architecture story* (why hooks succeeded where mixins/HOCs/render props strained), **API-design rules for hooks you'd ship to a team** (return shape, stable identities, options objects, SSR safety), and a set of anti-patterns that get flagged in senior reviews.

## What Is This?

A custom hook is an ordinary function whose name starts with `use` and which calls other hooks. That's the entire definition — there's no registration and no special API. The `use` prefix is a contract with the linter: "treat calls to me like hook calls."

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn(v => !v), []);
  return [on, toggle] as const;
}

function Sidebar() { const [open, toggle] = useToggle(); … }
function Modal()   { const [open, toggle] = useToggle(); … }   // completely independent state
```

The critical mental model: **a custom hook shares logic, never state.** Every component that calls it gets its own copy of the hook's `useState`s, effects and refs, keyed by *call order inside that component*. If two components need the *same* value, that's a job for Context, a store, or lifting state up.

> **Check yourself:** `Sidebar` calls `useToggle()` and toggles it. Does `Modal`'s `open` change? What would you introduce if it *should*?

## Why Does It Exist?

Reuse of stateful logic had failed three times before hooks (mixins, HOCs, render props — see [Topic 1](../01-why-design-patterns/notes.md)). Each stacked structure onto the component tree to share something that isn't structural. Hooks made the observation that **logic isn't UI, so it shouldn't live in the tree**:

| | HOC | Render prop | Custom hook |
|---|---|---|---|
| Extra tree nodes | Yes | Yes | **No** |
| Naming collisions | Props | None | None |
| Composition | Nested wrapping | Nested callbacks | **Call in sequence** |
| Types | Generic gymnastics | Function types | **Plain function types** |
| Data source visible at use site | No | Yes | **Yes** |

Because hooks are plain function calls, they compose the way functions do: a hook can call other hooks, share arguments with them, and return a combination.

## How It Works

### Why the Rules exist

React stores each component's hook state in a linked list on the fiber, matched **by call order**. The Nth `useState` in this render is the Nth in the last. Conditional calls or calls inside loops change the order, and state attaches to the wrong slot. So: only call hooks at the top level of a component or another hook — and only from React functions. `eslint-plugin-react-hooks` enforces this, including for your own `useX` functions, which is exactly why the naming convention exists.

### Designing the API

**Return shape**

| Return | Use when | Example |
|---|---|---|
| Tuple `[value, setValue]` | 1–2 values; callers will rename | `useState`, `useToggle`, `useLocalStorage` |
| Object `{ a, b, c }` | 3+ values, or callers pick a subset | `useFetch` → `{ data, error, loading, refetch }` |
| Single value | Derived or read-only | `useOnlineStatus()`, `useMediaQuery()` |

Tuples need `as const` in TypeScript or they widen to arrays.

**Parameters** — one or two positional parameters, then an options object: `useFetch(url, { retries: 3, enabled })`. Don't grow a signature past that.

**Stable identities** — return functions wrapped in `useCallback` and objects/arrays in `useMemo` so consumers can put them in dependency arrays or pass them to memoised children without triggering churn.

**Naming** — hooks describe *what they give you* (`useOnlineStatus`), not *how* (`useAddEventListenerForOnline`). Avoid lifecycle-flavoured names like `useOnMount`; they push callers back toward thinking in lifecycles.

**Cleanup** — anything a hook subscribes to, schedules or allocates must be cleaned up in the effect return.

**SSR safety** — never read `window`/`localStorage` during render; use lazy initial state guarded by `typeof window`, an effect, or `useSyncExternalStore` with a server snapshot.

### A real one: `useLocalStorage`

```tsx
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch { return initial; }            // corrupted JSON, private mode, quota
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / private mode */ }
  }, [key, value]);

  useEffect(() => {                         // other tabs
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === window.localStorage && e.key === key && e.newValue !== null) {
        try { setValue(JSON.parse(e.newValue) as T); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, setValue] as const;
}
```

Details worth noticing: **lazy initialiser** (`useState(() => …)`) so `localStorage` is read once, not each render; **try/catch** around both directions; the **`storage` event fires only in *other* tabs**, so two instances in the *same* tab don't sync by default — to fix, dispatch a custom event on write, or build the hook on `useSyncExternalStore` (Phase 2) with a shared subscription.

### Another: `useClipboard`

```tsx
function useClipboard(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    } catch { setCopied(false); return false; }   // permission denied / insecure context
  }, [resetMs]);

  useEffect(() => () => clearTimeout(timer.current), []);   // no state update after unmount
  return { copy, copied } as const;
}
```

The timer id lives in a ref (no re-render on change — [Topic 3](../03-state-vs-refs-inputs/notes.md)), previous timers are cleared, and unmount cleans up.

> **Check yourself:** Why is `timer` a ref and not state? What bug appears if you forget the unmount cleanup? What if `copy` isn't wrapped in `useCallback` and a consumer lists it in an effect's dependency array?

### Hooks compose into higher-level hooks

```tsx
function useSearch(query: string) {
  const debounced = useDebounce(query, 300);           // hook
  const { data, loading } = useFetch<Item[]>(`/api/search?q=${debounced}`);   // hook
  return { results: data ?? [], loading };
}
```

This is the payoff — small, single-purpose hooks assembled into feature-level hooks. The next patterns in this phase (State reducer, Strategy, Facade, `useForm`) are all *shapes for composing hooks*.

## Gotchas

**"Custom hooks share state."** They don't. This is the #1 misconception. Shared values need Context ([Topic 8](../08-provider-pattern/notes.md)) or an external store.

**Unstable return values.** Returning `{ copy, copied }` builds a new object every render; returning inline arrow functions changes identity each time. If consumers use them in dependency arrays they'll re-run effects constantly. Memoise what's meant to be depended on.

**Hooks that are just one `useState`.** `useIsOpen()` wrapping `useState(false)` adds indirection without meaning. Extract when there's *logic* (an effect, a cleanup, derived state, an invariant), not because you can.

**Missing cleanup.** Subscriptions, timers, `AbortController`s. Strict Mode's double-invoke exposes this in dev: effect → cleanup → effect. If your hook breaks in Strict Mode, it's wrong.

**Stale closures.** A hook that captures a callback in a long-lived listener reads the callback from the render it was created in. Use the latest-ref pattern ([Topic 3](../03-state-vs-refs-inputs/notes.md)) or `useEffectEvent` (stable in React 19.2).

**Reading browser globals during render.** Breaks SSR and hydration. Guard, defer to an effect, or use `useSyncExternalStore` with `getServerSnapshot`.

**Conditional hook calls "just this once".** Never. Put the condition *inside* the hook (`enabled` option) instead.

**Hidden singletons.** A hook that quietly reads/writes module-level variables to "share state" behaves inconsistently under SSR and tests. Use an explicit store with `useSyncExternalStore`.

**Naming without `use`.** The linter can't enforce the rules for `getThing()` that internally calls `useState`.

**Returning JSX from a hook.** Usually a sign it should be a component (or a compound-component part).

## Interview Questions

**Q (High): What is a custom hook, and does it share state between components?**

Answer: A function starting with `use` that calls other hooks, letting you extract and reuse *logic*. It does not share state: each call creates its own state, refs and effects, tied to the calling component and to the call order within it. If multiple components need the *same* state, that requires Context, a store (`useSyncExternalStore`, Zustand), or lifting state up.

The trap: Saying "yes, that's the point of reuse." Reuse of *logic* is not sharing of *values*.

**Q (High): Why did hooks replace HOCs and render props for logic reuse?**

Answer: HOCs and render props extract logic by adding structure to the tree — wrapper components or callback nesting — leading to wrapper hell, prop-name collisions, indirection and typing pain. Hooks extract logic into plain functions called *inside* the component: no extra nodes, values are named by the caller, composition is just calling hooks in sequence, and typing is ordinary function typing. HOCs and render props still fit cases that require wrapping the component boundary or render-time control.

The trap: "Because they're new/simpler" without stating structural reasons.

**Q (High): Why do the Rules of Hooks exist?**

Answer: React stores hook state in a per-component list matched by call order. The Nth hook call reads the Nth slot. If a hook is called conditionally or in a loop, the order can change between renders, so state and effects attach to the wrong slots. The rules — top level only, only from components or other hooks — guarantee a stable order. The lint rule enforces them, and it recognises custom hooks by the `use` prefix.

The trap: "It's just a convention." It's a hard requirement of the implementation.

**Q (High): Walk me through designing `useLocalStorage`.**

Answer: Lazy `useState` initialiser reading storage once with try/catch and a `typeof window` guard for SSR. An effect writing on change (with try/catch for quota/private mode). A `storage` event listener to sync other tabs — noting the event doesn't fire in the originating tab, so same-tab sync needs a custom event or `useSyncExternalStore`. Return `[value, setValue] as const`; accept a functional updater by reusing `setState`. Consider a `serializer` option and stable identities.

The trap: Reading `localStorage` in render (SSR crash), forgetting try/catch, and assuming the storage event syncs same-tab instances.

**Q (Medium): Tuple or object — how do you pick the return shape?**

Answer: Tuple when there are one or two values and callers benefit from renaming (`const [open, toggle] = useToggle()`), following `useState`. Object for three or more values or when callers usually need a subset (`const { data, error } = useFetch()`), so ordering isn't a positional trap. In TypeScript use `as const` for tuples so they don't widen to arrays.

The trap: Returning a 5-element tuple where callers must remember positions.

**Q (Medium): How do you make a custom hook safe for SSR?**

Answer: Never touch `window`, `document`, `localStorage` or `matchMedia` during render on the server. Use lazy initial state with a `typeof window` guard, do the browser work in effects, or build on `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` so the server and hydration use a consistent snapshot. Also keep ids stable with `useId`, not random values.

The trap: Wrapping the whole hook in `if (typeof window !== 'undefined')` — a conditional hook call.

**Q (Medium): When shouldn't you extract a custom hook?**

Answer: When there's no logic to name — a hook that just re-exports `useState` — or when the abstraction is guessed from one use. I prefer the rule of three, extract when the pattern is clear, and name the hook after the capability it provides.

The trap: "Always extract logic from components." Over-extraction scatters code without adding meaning.

**Q (Low): How do you test a custom hook?**

Answer: `renderHook` from React Testing Library: render, read `result.current`, wrap state-changing calls in `act`, use `rerender` with new props, and `unmount` to test cleanup. For hooks tightly coupled to UI, test through a small component instead.

The trap: Testing implementation details (mocking `useState`) rather than observable behaviour.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain why two components calling the same custom hook don't share state
- [ ] Can explain the Rules of Hooks from the linked-list/call-order model
- [ ] Can write `useLocalStorage` with lazy init, try/catch, SSR guard and cross-tab sync
- [ ] Can write `useClipboard` with a ref-based timer and unmount cleanup
- [ ] Can justify tuple vs object returns and when to stabilise identities
- [ ] Can name five custom-hook anti-patterns and the fix for each

---
*Next: [Provider Pattern](../08-provider-pattern/notes.md) — the answer to the question this topic left open: when components genuinely need to share the same state, not just the same logic.*
