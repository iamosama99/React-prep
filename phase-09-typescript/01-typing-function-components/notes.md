# Typing Function Components

## Quick Reference

| Concept | Preferred pattern |
|---|---|
| Component type | `function Foo(props: Props): JSX.Element` |
| `React.FC` | Avoid — implicit `children`, constrained return type |
| `children` | `React.ReactNode` (widest safe type) |
| No children | Omit `children` from props type entirely |
| Wraps native element | `React.ButtonHTMLAttributes<HTMLButtonElement> & CustomProps` |
| forwardRef | `React.forwardRef<RefType, PropsType>((props, ref) => ...)` |

---

## Why FC lost the debate

`React.FC<Props>` was the canonical pattern for years. The Create React App template dropped it in 2020. Two problems drove the change:

**Implicit children.** `React.FC` injects `children?: ReactNode` into every component's props, whether or not the component uses children. That's a type lie — it says your component accepts children when it doesn't. On a large team, that gap between the type and the runtime is subtle and hard to trace.

**Return type.** `FC` constrains the return to `ReactElement | null`. Plain functions can return `ReactNode` — which includes strings, arrays, numbers, and in React 18, `undefined`. `FC` blocks those valid return shapes.

The fix is just a typed function:

```typescript
type Props = {
  title: string;
  subtitle?: string;
};

function PageHeader({ title, subtitle }: Props): JSX.Element {
  return (
    <header>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
```

TypeScript infers the return type automatically. Add an explicit `: JSX.Element` if you want the compiler to catch mismatches at the function boundary rather than at the call site.

---

## Typing children

`React.ReactNode` is the widest type for anything renderable — it's the union of `ReactElement | string | number | boolean | null | undefined | ReactFragment | ReactPortal`. Use it as the default for `children`:

```typescript
type CardProps = {
  children: React.ReactNode;
  className?: string;
};

function Card({ children, className }: CardProps) {
  return <div className={className}>{children}</div>;
}
```

**Stricter options when you have a real contract:**

```typescript
// Exactly one React element — no strings, no arrays
type IconButtonProps = {
  icon: React.ReactElement;
  label: string;
};

// Specific element type — must be a <MenuItem>
type MenuProps = {
  children: React.ReactElement<MenuItemProps> | React.ReactElement<MenuItemProps>[];
};

// No children at all — omit the field and TypeScript errors if you try to pass any
type AvatarProps = {
  src: string;
  alt: string;
  // no children field — <Avatar>anything</Avatar> is a compile error
};
```

---

> **Check yourself:** Why does using `React.FC` on every component create a type safety hole, even if it seems harmless? Try to name both issues before re-reading.

---

## Wrapping native HTML elements

A common pattern: you build a `Button` that wraps `<button>` and needs to pass through all valid button attributes plus your custom props.

```typescript
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost";
};

function Button({ loading, variant = "primary", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`btn btn-${variant}`}
      disabled={loading || disabled}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}
```

`React.ButtonHTMLAttributes<HTMLButtonElement>` gives you every valid `<button>` prop — `onClick`, `type`, `form`, `aria-*`, `data-*` — all typed correctly. No manual maintenance required.

The pattern generalizes: `React.AnchorHTMLAttributes<HTMLAnchorElement>`, `React.InputHTMLAttributes<HTMLInputElement>`, etc. Or use `React.HTMLAttributes<HTMLElement>` when you don't care about the specific element type.

---

## forwardRef components

When a component needs to expose a ref to its caller, the type parameters are `<RefType, PropsType>` — in that order:

```typescript
type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const LabeledInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, value, onChange }, ref) => (
    <label>
      {label}
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
);

LabeledInput.displayName = "LabeledInput";
```

The common mistake is reversing the type parameters — `<PropsType, RefType>` compiles but assigns types to the wrong things. The `ref` parameter's type is `React.ForwardedRef<RefType>`, which is a union of `RefCallback<T> | RefObject<T> | null` — you don't need to handle that manually.

---

> **Check yourself:** What is the correct order of type parameters for `React.forwardRef`? What happens at runtime if you get them backwards?

---

## Components that render nothing

```typescript
function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="error-banner">{error}</div>;
}
```

Returning `null` is fine — it's always been part of the JSX return type. In React 18+, returning `undefined` is valid at runtime, but TypeScript's JSX types still expect `null` in most configs. Return `null`, not `undefined`, to avoid config-dependent type errors.

---

> **Check yourself:** You're building a `Tooltip` wrapper component. It needs to accept any valid HTML `div` attribute and also a `content` prop for the tooltip text. How would you write the props type?

---

## Gotchas

**`JSX.Element` vs `React.ReactNode`:** `JSX.Element` is the same as `React.ReactElement` — a single element. `React.ReactNode` is the superset that includes primitives, null, arrays. Use `ReactNode` for `children`, `ReactElement` or `JSX.Element` for single-element constraints.

**Implicit `undefined` from optional props:** TypeScript will narrow `subtitle?: string` as `string | undefined` inside the function body. This is usually what you want — just be deliberate about it.

**Generic components:** Can't use the `React.FC<Props>` pattern for generic components since `FC` doesn't thread generic type parameters through properly. Plain function syntax handles generics cleanly (see Topic 5).

---

## Interview Q&A

**Q: Why did the community stop using `React.FC`? (High)**

Two reasons. First, `React.FC` injects `children?: ReactNode` into every component's props regardless of whether it accepts children — that misrepresents the component's contract. Second, it constrains the return type to `ReactElement | null`, which is narrower than what plain typed functions support (strings, arrays, `undefined` in React 18). The idiomatic replacement is a plain typed function: `function Foo(props: Props): JSX.Element`.

*Interviewer trap:* "Isn't implicit children harmless?" No — it means callers can pass children to a component that ignores them and TypeScript won't warn. In a large codebase, that's a silent contract violation.

---

**Q: How do you type a component's `children` prop? (High)**

`React.ReactNode` for the general case. It covers everything React can render: elements, strings, numbers, nulls, arrays, portals. Narrow it when you have a real constraint — `React.ReactElement` for exactly one element, a specific element type for compound-component children. Omit the prop entirely to forbid children.

---

**Q: How do you type a component that wraps a native HTML element? (Medium)**

Use `React.ButtonHTMLAttributes<HTMLButtonElement>` (or the equivalent for the element type) intersected with your custom props. Destructure your custom props, spread the rest onto the native element. This gives you full type coverage of all valid HTML attributes for free.

---

**Q: How do you forward a ref with proper TypeScript types? (Medium)**

`React.forwardRef<RefType, PropsType>((props, ref) => ...)`. The order matters — ref type first, props type second. Set `displayName` on the result for DevTools.

---

**Q: What's the difference between `JSX.Element` and `React.ReactNode`? (Medium)**

`JSX.Element` (same as `React.ReactElement`) is a single rendered element. `React.ReactNode` is wider — it includes everything JSX can render: elements, strings, numbers, booleans, null, undefined, arrays, fragments. Use `ReactNode` for `children` typing; use `ReactElement` when you need to enforce that exactly one element is passed.

---

## Self-Assessment

- [ ] I can write a typed function component without `React.FC` and explain why
- [ ] I know the two problems with `React.FC` and can articulate them in an interview
- [ ] I can type `children` as `ReactNode`, `ReactElement`, or absent — and know when to use each
- [ ] I can type a component that wraps a native HTML element using `HTMLAttributes`
- [ ] I can set up `forwardRef` with both type parameters in the correct order
- [ ] I can type a component that conditionally renders nothing
