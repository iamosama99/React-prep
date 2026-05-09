# Typing Custom Hooks

## Quick Reference

| Concept | Pattern |
|---|---|
| Tuple return | `return [value, setValue] as const` |
| Typed tuple return | `: [boolean, React.Dispatch<React.SetStateAction<boolean>>]` |
| Generic state | `function useToggle<T>(initial: T)` |
| Object return | No `as const` needed — object props are individually typed |
| Return type annotation | Add explicit return type on complex hooks for call-site clarity |

---

## The fundamental problem with tuple returns

TypeScript infers array literals as arrays, not tuples. This breaks the API of hooks that return `[value, setter]` pairs:

```typescript
function useToggle(initial: boolean) {
  const [on, setOn] = React.useState(initial);
  const toggle = () => setOn(prev => !prev);

  // TypeScript infers this as: (boolean | (() => void))[]
  // NOT as: [boolean, () => void]
  return [on, toggle];
}

const [isOpen, toggleOpen] = useToggle(false);
// isOpen: boolean | (() => void) — WRONG
// toggleOpen: boolean | (() => void) — WRONG
```

The caller can't use `isOpen` as a boolean because TypeScript widened it to the array element union type.

---

## Fix 1: `as const`

```typescript
function useToggle(initial: boolean) {
  const [on, setOn] = React.useState(initial);
  const toggle = () => setOn(prev => !prev);

  return [on, toggle] as const;
  // Type: readonly [boolean, () => void]
}

const [isOpen, toggleOpen] = useToggle(false);
// isOpen: boolean ✓
// toggleOpen: () => void ✓
```

`as const` freezes the inference — TypeScript treats the literal array as a readonly tuple with exact types for each position. The `readonly` is usually fine for destructuring.

---

## Fix 2: explicit return type annotation

```typescript
function useToggle(initial: boolean): [boolean, () => void] {
  const [on, setOn] = React.useState(initial);
  const toggle = () => setOn(prev => !prev);
  return [on, toggle];
}
```

Explicit annotation is more readable at the call site (TypeScript shows the exact tuple type on hover) and catches internal implementation errors — if your hook accidentally returns something that doesn't match the declared type, TypeScript errors inside the hook rather than at the call site.

---

> **Check yourself:** What is the inferred type of `return [count, setCount, reset]` from a hook? How would you fix it with `as const`? How would you fix it with an explicit return type?

---

## Generic hooks

When the managed value's type should be caller-controlled:

```typescript
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [stored, setStored] = React.useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStored(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write errors
    }
  };

  return [stored, setValue];
}

// T inferred as User from initialValue
const [user, setUser] = useLocalStorage<User>("user", defaultUser);
```

The explicit `<User>` type parameter tells TypeScript what `T` is, ensuring `user` is typed as `User` and `setUser` only accepts `User` arguments.

---

## Object return: no tuple issues

When a hook returns an object, TypeScript infers each field's type correctly — no `as const` needed:

```typescript
type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = React.useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = React.useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as T;
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message });
    }
  }, [url]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// T inferred from explicit type parameter at call site
const { data, loading, error, refetch } = useFetch<Post[]>("/api/posts");
```

Object returns are preferred when a hook returns three or more values — destructuring by name is clearer than by position.

---

> **Check yourself:** `useFetch<Post[]>` — what is the type of `data` after destructuring? What about `loading`?

---

## Typing hooks that return refs

When a hook returns a ref, the caller needs the DOM ref type to attach it to JSX:

```typescript
function useAutoFocus(condition: boolean): React.RefObject<HTMLInputElement> {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (condition && ref.current) {
      ref.current.focus();
    }
  }, [condition]);

  return ref;
}

function SearchModal({ isOpen }: { isOpen: boolean }) {
  const inputRef = useAutoFocus(isOpen);
  return <input ref={inputRef} />;
}
```

Return the specific ref type — `React.RefObject<HTMLInputElement>`, not the wider `React.RefObject<HTMLElement>` — so JSX attribute checking works correctly.

---

## Hooks that accept callbacks

When a hook accepts callbacks, type them precisely to avoid the loose `Function` type:

```typescript
function useEventListener<K extends keyof WindowEventMap>(
  eventType: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void {
  const savedHandler = React.useRef(handler);

  React.useLayoutEffect(() => {
    savedHandler.current = handler;
  });

  React.useEffect(() => {
    const listener = (event: WindowEventMap[K]) => savedHandler.current(event);
    window.addEventListener(eventType, listener, options);
    return () => window.removeEventListener(eventType, listener, options);
  }, [eventType, options]);
}

// TypeScript infers event as KeyboardEvent when eventType is "keydown"
useEventListener("keydown", (event) => {
  console.log(event.key);
});
```

`keyof WindowEventMap` constrains `eventType` to valid event names. `WindowEventMap[K]` maps the event name to the correct DOM event type — `"keydown"` maps to `KeyboardEvent`, `"click"` to `MouseEvent`, etc. The callback is typed with the correct event type automatically.

---

> **Check yourself:** Why do you need `as const` (or an explicit return type) when returning a tuple from a custom hook? What does TypeScript infer without it?

---

## Explicit return type as documentation

For complex hooks, an explicit return type is documentation as much as it is type enforcement:

```typescript
type UseFormReturn<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (onSubmit: (values: T) => void) => React.FormEventHandler;
  reset: () => void;
};

function useForm<T extends Record<string, unknown>>(initial: T): UseFormReturn<T> {
  // ...implementation
}
```

A consumer of `useForm` can read the return type and know exactly what they're getting without reading the implementation. This is especially valuable for hooks that are shared across teams.

---

## Gotchas

**Avoid `as any` in hook internals.** Hook implementations often deal with dynamic data (localStorage, API responses). Cast with `as T` rather than `as any` — `any` escapes the type system entirely; `as T` at least preserves the connection to the generic parameter.

**`useCallback` inside hooks needs the same care.** The function returned by `useCallback` has its type inferred. If the inferred type is too wide, annotate the callback's parameters explicitly.

**Conditional hook returns.** If a hook might return `null` or `undefined`, be explicit: `function useOptional(): User | null`. Don't rely on callers noticing the optionality from implicit inference.

---

## Interview Q&A

**Q: Why do you need `as const` on array returns from custom hooks? (High)**

Without `as const`, TypeScript infers an array literal as an array type (e.g., `(boolean | (() => void))[]`), not a tuple. Every destructured element gets the union type, making them unusable as their specific types. `as const` tells TypeScript to infer a readonly tuple, giving each position its precise type. The alternative is an explicit return type annotation.

---

**Q: When would you prefer an object return over a tuple return from a custom hook? (High)**

When the hook returns three or more values, or when positional ordering would be non-obvious to the caller. Object returns let callers destructure by name — `const { data, loading, error } = useFetch(url)` is clearer than `const [data, loading, error] = useFetch(url)`. Tuples work well for two-value hooks that follow the `[value, setter]` convention (mirroring `useState`).

---

**Q: How do you make a custom hook generic? (Medium)**

Add a type parameter to the function: `function useStorage<T>(key: string, initial: T)`. TypeScript can infer `T` from the arguments (inferring from `initial`) or the caller can provide it explicitly (`useStorage<User>("user", defaultUser)`). Use `T` in the return type to preserve the type through the hook.

---

**Q: How would you type a hook that returns a DOM ref? (Medium)**

Return `React.RefObject<HTMLSpecificElement>` — the specific element type (not the wide `HTMLElement`) so JSX checks the ref against the element it's attached to. Inside the hook, initialize with `useRef<HTMLSpecificElement>(null)` and return that ref directly.

---

**Q: What's the purpose of annotating a hook's return type explicitly, beyond letting TypeScript infer it? (Low)**

Explicit return types are documentation — callers can see the hook's contract without reading the implementation. They also act as an implementation check — if the hook's internal logic diverges from the declared return type, TypeScript errors at the hook definition rather than at every call site, making bugs easier to locate.

---

## Self-Assessment

- [ ] I know why `return [a, b]` infers an array union, not a tuple, and the two ways to fix it
- [ ] I can write a generic hook and choose between type param inference vs. explicit type argument
- [ ] I know when to return an object vs. a tuple from a custom hook
- [ ] I can type a hook that returns a DOM ref
- [ ] I can type a hook that accepts callbacks using mapped event types
- [ ] I understand when explicit return type annotations add value beyond inference
