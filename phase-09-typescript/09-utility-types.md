# Utility Types in Component APIs

## Quick Reference

| Utility type | What it does | React use case |
|---|---|---|
| `Partial<T>` | All props optional | Override/patch props |
| `Required<T>` | All props required | Remove optionals |
| `Pick<T, K>` | Subset of props | Re-export a narrower API |
| `Omit<T, K>` | All props except K | Remove from native element props |
| `Record<K, V>` | Object with key/value types | Error maps, config objects |
| `React.ComponentProps<C>` | All props of a component | Forwarding/wrapping components |
| `React.ComponentPropsWithRef<C>` | Same + ref | When you forward the ref |
| `React.ComponentPropsWithoutRef<C>` | Same - ref | Polymorphic components |
| `ReturnType<F>` | Return type of a function | Inferring hook return types |

---

## Pick and Omit — the most used pair

`Pick` and `Omit` are for sculpting prop types from existing ones.

**Pick:** Extract a subset of keys.

```typescript
type ButtonProps = {
  size: "sm" | "md" | "lg";
  variant: "solid" | "outline";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
};

// Only expose size and variant in a theme-config object
type ButtonTheme = Pick<ButtonProps, "size" | "variant">;
// { size: "sm" | "md" | "lg"; variant: "solid" | "outline" }
```

**Omit:** Remove specific keys.

```typescript
// Remove children so this can be reused without requiring children
type ButtonWithoutChildren = Omit<ButtonProps, "children">;

// Remove the ref from native element props for polymorphic components
type DivPropsNoRef = React.ComponentPropsWithoutRef<"div">;
// Equivalent to Omit<React.ComponentPropsWithRef<"div">, "ref">
```

The most common pattern is `Omit` on native element props to strip keys your component controls:

```typescript
type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;  // string, not ChangeEvent
};
```

You've replaced the native `onChange: (e: ChangeEvent) => void` with a cleaner `onChange: (value: string) => void`. Callers don't deal with the event at all.

---

> **Check yourself:** What's the difference between `Omit<T, "children">` and just not having a `children` field? When does the distinction matter?

---

## Partial and Required

`Partial<T>` makes every field optional. `Required<T>` makes every field required.

```typescript
type Config = {
  timeout: number;
  retries: number;
  headers: Record<string, string>;
};

// For a "merge with defaults" pattern
function createConfig(overrides: Partial<Config>): Config {
  return { timeout: 5000, retries: 3, headers: {}, ...overrides };
}

// For testing — ensure all fields are provided
type StrictConfig = Required<Config>;
```

In React, `Partial` is common for "update" or "patch" props:

```typescript
type User = {
  id: string;
  name: string;
  email: string;
};

// Only pass the fields you want to change
function updateUser(id: string, updates: Partial<Omit<User, "id">>) {
  // ...
}
```

---

## ComponentProps, ComponentPropsWithRef, ComponentPropsWithoutRef

These are the most React-specific utility types — they extract props from existing components.

```typescript
// Get all props accepted by a component
type ButtonProps = React.ComponentProps<typeof Button>;

// Get props from a native element
type DivProps = React.ComponentProps<"div">;   // same as HTMLAttributes<HTMLDivElement>

// Without the ref (for polymorphic components or wrappers that don't forward ref)
type DivPropsNoRef = React.ComponentPropsWithoutRef<"div">;

// With the ref (for wrapper components that do forward ref)
type DivPropsWithRef = React.ComponentPropsWithRef<"div">;
```

Real use case — wrapping an existing component and extending its props:

```typescript
import { Button } from "some-ui-library";

type ExtendedButtonProps = React.ComponentPropsWithoutRef<typeof Button> & {
  loading?: boolean;
};

function LoadingButton({ loading, children, disabled, ...rest }: ExtendedButtonProps) {
  return (
    <Button {...rest} disabled={loading || disabled}>
      {loading ? <Spinner /> : children}
    </Button>
  );
}
```

This pattern automatically picks up any future props added to `Button` without manual maintenance.

---

> **Check yourself:** You're wrapping a third-party `Modal` component. You want to accept all of its props plus a `onConfirm` callback. How do you write the props type?

---

## Record for structured prop collections

```typescript
// Status colors — keys are status strings, values are color strings
type StatusColors = Record<"success" | "warning" | "error" | "info", string>;

const statusColors: StatusColors = {
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};

// Form validation errors — keys are field names
type FormErrors<T> = Partial<Record<keyof T, string>>;

function Form<T extends Record<string, unknown>>({
  errors,
}: {
  errors: FormErrors<T>;
}) {
  // ...
}
```

`Record<K, V>` is especially clean when the keys come from an existing type via `keyof`.

---

## ReturnType for inferring hook outputs

When you need to use the return type of a hook somewhere without repeating it manually:

```typescript
function useAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const login = async (email: string, password: string) => { /* ... */ };
  const logout = () => setUser(null);
  return { user, login, logout };
}

// Extract the type without repeating the structure
type AuthContext = ReturnType<typeof useAuth>;
// { user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void }

const AuthContext = React.createContext<AuthContext | null>(null);
```

`ReturnType` keeps the context type in sync with the hook automatically — change the hook, context type updates.

---

## Extract and Exclude on unions

Less common in component APIs but useful for variant types:

```typescript
type ButtonVariant = "solid" | "outline" | "ghost" | "link";

// Only the interactive (non-link) variants
type InteractiveVariant = Exclude<ButtonVariant, "link">;
// "solid" | "outline" | "ghost"

// Only the visual variants
type VisualVariant = Extract<ButtonVariant, "solid" | "ghost">;
// "solid" | "ghost"
```

---

## NonNullable for removing null/undefined

When you have a prop that might be null upstream but should be non-null by the time a component receives it:

```typescript
type User = {
  id: string;
  avatar: string | null;
};

type AvatarProps = {
  // This component only renders when avatar exists — enforce it in types
  src: NonNullable<User["avatar"]>;  // string
};
```

`NonNullable<T>` removes `null` and `undefined` from a type. It's cleaner than writing `string` manually because it stays in sync with the source type.

---

> **Check yourself:** If `User.avatar` changes from `string | null` to `string | null | undefined`, what happens to `AvatarProps.src` if you used `NonNullable<User["avatar"]>`? What if you had written `string` manually?

---

## Combining utility types

Real component APIs often need several utility types composed:

```typescript
type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  createdAt: Date;
};

// A form for editing a user — only editable fields, all optional
type EditUserFormProps = {
  initial: Partial<Omit<User, "id" | "createdAt" | "role">>;
  onSave: (updates: Partial<Omit<User, "id" | "createdAt">>) => void;
};
```

Reading composed utility types: work from the inside out. `Omit<User, "id" | "createdAt">` removes those fields. `Partial<...>` makes the remainder optional. The result is the editable fields, none required.

---

## Gotchas

**`Pick` and `Omit` are shallow.** They operate on the top-level keys of an object type. Nested types are copied as-is — they don't deeply pick or omit. For deep manipulation, you need recursive mapped types (which is rarely necessary in component APIs).

**`Partial` doesn't go deep either.** `Partial<Config>` makes top-level keys optional. Nested objects remain as required. Use `DeepPartial` from libraries like `ts-toolbelt` if you need recursive optionality.

**`ComponentProps` vs `ComponentPropsWithoutRef`.** For native HTML elements, `ComponentProps<"div">` includes the `ref` prop. If you spread those props onto a native element without forwarding a ref, the `ref` in the spread is ignored silently — a runtime bug. Prefer `ComponentPropsWithoutRef` when you're not forwarding refs.

---

## Interview Q&A

**Q: How do you use `Omit` in component APIs? (High)**

Two main uses. First: strip keys from native HTML element props that your component owns — `Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">` — so you can redefine them with a cleaner signature. Second: remove props from a base type to create a derived type — `Omit<User, "id" | "createdAt">` for an update payload.

---

**Q: What's `React.ComponentPropsWithoutRef<C>` used for? (High)**

Extracting the full prop set for a given element or component, minus the `ref`. This is the foundation of polymorphic components (`as` prop pattern) and of wrapper components that extend a third-party component's props. It updates automatically when the wrapped component's props change.

---

**Q: When would you use `ReturnType<typeof someHook>`? (Medium)**

When you need to use a hook's return type in another type — typically when creating a React context that mirrors a hook's return value. `ReturnType<typeof useAuth>` keeps the context type in sync with the hook's return shape automatically; if the hook gains a new field, the context type gains it too.

---

**Q: What's the difference between `Partial<T>` and making all fields optional manually? (Medium)**

Functionally the same, but `Partial<T>` stays in sync with `T`. If `T` adds a new required field, `Partial<T>` automatically makes it optional in derived types. Manual optionality requires updating every derived type by hand — a maintenance burden in larger codebases.

---

**Q: What does `NonNullable<T>` do and when is it useful in component props? (Low)**

`NonNullable<T>` removes `null` and `undefined` from a type. In component props, it's useful when a prop comes from a type that's nullable in its source (like `User.avatar: string | null`) but the component should only receive non-null values. Using `NonNullable<User["avatar"]>` instead of `string` means the prop type automatically updates if the source type changes.

---

## Self-Assessment

- [ ] I can use `Pick` and `Omit` to sculpt prop types from existing types
- [ ] I can use `Omit` to replace a native event handler with a cleaner abstraction
- [ ] I know what `React.ComponentPropsWithoutRef<C>` returns and when to use it
- [ ] I can use `ReturnType<typeof hook>` to derive a context type from a hook
- [ ] I can combine `Partial`, `Omit`, and `Pick` to model form/update payloads
- [ ] I understand the shallow nature of `Partial` and `Omit` and when that matters
