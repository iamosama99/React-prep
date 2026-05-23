# Typing Refs

## Quick Reference

| Use case | Pattern |
|---|---|
| DOM ref (always attached) | `useRef<HTMLDivElement>(null)` |
| Mutable instance variable | `useRef<number>(0)` |
| Ref potentially unset | `useRef<HTMLInputElement \| null>(null)` |
| Access DOM element | `ref.current` is `HTMLDivElement \| null` — check before use |
| Mutable var access | `ref.current` is `number` — no null check needed |
| ForwardedRef | `React.ForwardedRef<HTMLButtonElement>` |

---

## Two completely different uses of useRef

`useRef` does double duty. The two uses have different type signatures and different semantics:

**Use 1 — DOM access.** You attach the ref to a JSX element via the `ref` attribute. Before the component mounts, `current` is `null`. After mount, it's the DOM node.

```typescript
const divRef = useRef<HTMLDivElement>(null);

// current is HTMLDivElement | null
useEffect(() => {
  if (divRef.current) {
    divRef.current.scrollIntoView();
  }
}, []);

return <div ref={divRef}>...</div>;
```

**Use 2 — Mutable instance variable.** No DOM attachment. You use it as a stable container for a value that should survive renders without causing re-renders.

```typescript
const timerRef = useRef<number>(0);

// current is number — no null check needed
const start = () => {
  timerRef.current = window.setTimeout(callback, 1000);
};

const clear = () => {
  clearTimeout(timerRef.current);
};
```

The distinction isn't just semantic — it affects the type. When you initialize with `null`, TypeScript types `current` as `T | null`. When you initialize with a real value, `current` is just `T`.

---

> **Check yourself:** `useRef<HTMLInputElement>(null)` vs `useRef<HTMLInputElement | null>(null)` — what's different about the type of `current` in each case, and which one is a readonly ref?

---

## The readonly subtlety

TypeScript ships two overloads of `useRef` in `@types/react`:

```typescript
// Overload 1 — initial value matches T exactly: mutable ref
function useRef<T>(initialValue: T): MutableRefObject<T>;

// Overload 2 — initial value is null, T is not null: read-only .current
function useRef<T>(initialValue: T | null): RefObject<T>;
```

This means:
- `useRef<HTMLDivElement>(null)` → matches overload 2 → `RefObject<HTMLDivElement>` → `.current` is readonly
- `useRef<HTMLDivElement | null>(null)` → matches overload 1 (because `null` is included in `T`) → `MutableRefObject<HTMLDivElement | null>` → `.current` is writable

For DOM refs, overload 2 is the right choice. You shouldn't be manually reassigning `.current` — React manages that for you. The readonly type prevents accidental misuse.

For mutable instance variables, overload 1 is correct because you intentionally write to `.current`.

---

## Common DOM element types

```typescript
useRef<HTMLInputElement>(null)        // <input>
useRef<HTMLButtonElement>(null)       // <button>
useRef<HTMLDivElement>(null)          // <div>
useRef<HTMLFormElement>(null)         // <form>
useRef<HTMLTextAreaElement>(null)     // <textarea>
useRef<HTMLSelectElement>(null)       // <select>
useRef<HTMLCanvasElement>(null)       // <canvas>
useRef<HTMLVideoElement>(null)        // <video>
useRef<HTMLAnchorElement>(null)       // <a>
```

The general rule: `HTML${PascalCaseName}Element`. When in doubt, hover over the `ref` attribute in a JSX element in your editor and read the inferred type.

---

> **Check yourself:** You call `inputRef.current.focus()` without a null check. TypeScript errors. What's the exact error, and what are the two ways to fix it?

---

## Accessing current safely

For DOM refs, `current` is nullable until the component mounts. Three patterns for accessing it:

```typescript
// Option 1: explicit null guard
if (inputRef.current) {
  inputRef.current.focus();
}

// Option 2: optional chaining
inputRef.current?.focus();

// Option 3: non-null assertion — only when you are certain the ref is attached
// Use this in effects (which run after mount) when the element is always present
inputRef.current!.focus();
```

The non-null assertion (`!`) is a TypeScript escape hatch that removes null/undefined from the type. It's appropriate inside `useEffect` when the element is unconditionally rendered — by the time the effect runs, the element exists. It's not appropriate in event handlers that could fire before mount (edge cases with portals, deferred rendering, etc.).

---

## Callback refs

When you need more control — like knowing when a ref is attached or detached — use a callback ref. TypeScript types the `ref` attribute as accepting `RefCallback<T>`:

```typescript
function MeasuredBox() {
  const [height, setHeight] = React.useState(0);

  const measuredRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setHeight(node.getBoundingClientRect().height);
    }
  }, []);

  return <div ref={measuredRef}>Content — height: {height}px</div>;
}
```

The callback receives `T | null` — `null` when the element unmounts. TypeScript enforces this parameter type when you assign the callback to a JSX `ref` attribute.

---

## Typed refs with forwardRef

When a ref is forwarded through `forwardRef`, the `ref` parameter inside the render function has type `React.ForwardedRef<T>`, which is:

```typescript
type ForwardedRef<T> = ((instance: T | null) => void) | MutableRefObject<T | null> | null;
```

You don't call the ref yourself — you just attach it. But if you're building something custom (like a focus manager that combines its own ref with a forwarded ref), you need to handle all three union members:

```typescript
function mergeRefs<T>(...refs: React.ForwardedRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref !== null) {
        ref.current = node;
      }
    }
  };
}
```

---

> **Check yourself:** You're inside `useEffect`. Is it safe to use `inputRef.current!` (non-null assertion) to access the DOM node? What about inside a click handler?

---

## Gotchas

**`useRef` vs `createRef`.** `createRef` creates a new ref object on every render. `useRef` returns the same object across renders. Only `useRef` is correct in function components. TypeScript doesn't prevent you from calling `createRef` inside a function component — the types look the same — but you'd recreate the ref on every render, losing the attached DOM node.

**Stale refs don't cause this problem.** Unlike state and effects, refs are always current. A function that closes over a ref will always read the latest `.current`. That's exactly why refs are useful as the escape hatch from stale closure problems.

**Type widening for generic containers.** If you want a ref that can hold different types over its lifetime:

```typescript
const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
```

TypeScript will require you to narrow before calling type-specific methods.

---

## Interview Q&A

**Q: What's the difference between `useRef<T>(null)` and `useRef<T | null>(null)`? (High)**

`useRef<T>(null)` matches the DOM-ref overload — it returns `RefObject<T>` where `.current` is readonly (`T | null`). `useRef<T | null>(null)` matches the mutable-ref overload — it returns `MutableRefObject<T | null>` where `.current` is writable. Use the first for DOM refs (React controls `.current`), the second for mutable instance variables where you write to `.current` yourself.

---

**Q: When is it safe to use the non-null assertion (`!`) on a ref's `.current`? (High)**

Inside `useEffect` and `useLayoutEffect`, when the referenced element is unconditionally rendered. By the time an effect fires, React has committed the DOM, so the ref is definitely attached. It's less safe in event handlers — if an element can be conditionally rendered, the handler could theoretically fire when the element isn't mounted. Use optional chaining (`?.`) or an explicit null guard there.

---

**Q: When would you use a callback ref instead of `useRef`? (Medium)**

When you need to react to the ref being attached or detached — for example, to measure an element's dimensions immediately after mount, or to run setup/teardown logic when the element appears. A callback ref receives the node (or `null` on unmount), so you can trigger effects in response.

---

**Q: What's the TypeScript type of the `ref` parameter inside a `forwardRef` render function? (Medium)**

`React.ForwardedRef<T>`, which is `((instance: T | null) => void) | React.MutableRefObject<T | null> | null`. It's a union because the caller might pass a ref object, a callback ref, or null. You normally just pass it to the JSX `ref` attribute without touching it, but if you need to combine it with your own ref (for a component that also needs internal DOM access), you need a `mergeRefs` utility that handles all three cases.

---

**Q: Why is `createRef` wrong inside a function component? (Low)**

`createRef` creates a new `{ current: null }` object every time it's called. In a function component, every render creates a new ref and loses the previously attached DOM node. `useRef` returns the same object across all renders of a component instance.

---

## Self-Assessment

- [ ] I can distinguish the two overloads of `useRef` and know when each applies
- [ ] I know why `useRef<T>(null)` gives a readonly `current` and when that matters
- [ ] I can list common HTML element types used with `useRef`
- [ ] I know when the non-null assertion `!` on `ref.current` is safe vs. risky
- [ ] I can write a typed callback ref
- [ ] I understand `React.ForwardedRef<T>` and what a `mergeRefs` utility needs to handle
