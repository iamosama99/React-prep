# Discriminated Union Props

## Quick Reference

| Concept | Pattern |
|---|---|
| Discriminated union props | `type Props = VariantA \| VariantB` — distinct by a literal discriminant |
| Exclusive props | If A has `href`, B should not — union enforces this |
| `never` to block props | `{ href: never }` — explicitly excludes a prop from a variant |
| Narrowing in component | Spread into `if (props.variant === "link")` then access `props.href` |
| Common props | Extract into a shared base type, then intersect |

---

## The problem: props that only make sense together

Some props are logically entangled. A `Button` component that can render as either a `<button>` or an `<a>` tag needs `href` when it's a link and `type`/`onClick` when it's a button — but `href` is nonsensical on a `<button>` and `type="submit"` is nonsensical on an `<a>`. A flat props type can't express this:

```typescript
// BAD — allows nonsensical combinations
type ButtonProps = {
  variant: "button" | "link";
  href?: string;      // only valid when variant="link"
  type?: "submit" | "button" | "reset";  // only valid when variant="button"
  onClick?: () => void;
  children: React.ReactNode;
};

// TypeScript is fine with this, but it's semantically wrong:
<Button variant="button" href="/home" type="submit">Bad</Button>
```

---

## The solution: discriminated union props

```typescript
type BaseProps = {
  children: React.ReactNode;
  className?: string;
};

type ButtonVariant = BaseProps & {
  variant: "button";
  type?: "submit" | "button" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  href?: never;  // explicitly excluded
};

type LinkVariant = BaseProps & {
  variant: "link";
  href: string;
  type?: never;   // explicitly excluded
  onClick?: never;
};

type ButtonProps = ButtonVariant | LinkVariant;
```

Now TypeScript enforces the correct shape:

```typescript
// ✓ Valid
<Button variant="button" type="submit">Submit</Button>
<Button variant="link" href="/home">Go home</Button>

// ✗ Error: href is not valid on variant="button"
<Button variant="button" href="/home">Bad</Button>

// ✗ Error: href is required for variant="link"
<Button variant="link">Bad</Button>
```

---

> **Check yourself:** Without the `href?: never` on `ButtonVariant`, could a caller pass `href` on `variant="button"` and TypeScript would still error? Try to reason through it before re-reading.

---

## Implementing the component

```typescript
function Button(props: ButtonProps) {
  const { variant, children, className } = props;

  if (variant === "link") {
    // props is now narrowed to LinkVariant — href is string, not undefined
    return (
      <a href={props.href} className={className}>
        {children}
      </a>
    );
  }

  // props is narrowed to ButtonVariant here
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      className={className}
    >
      {children}
    </button>
  );
}
```

After the `variant === "link"` check, TypeScript narrows `props` to `LinkVariant`, which means `props.href` is `string` (not `string | undefined | never`) — no assertion needed.

---

## The `never` technique for exclusive props

`never` is the empty type — no value can be assigned to it. Using `href?: never` in `ButtonVariant` means `href` is technically allowed as a key but no value (including `undefined`) can be assigned to it in TypeScript. In practice: if a caller tries to pass `href` on a `variant="button"` component, TypeScript errors.

Without `never`:

```typescript
type ButtonVariant = BaseProps & {
  variant: "button";
  // no href field
};
```

This is almost as good, but there's a subtle difference: with no `href` field, a caller could spread an object that includes `href` and TypeScript might not catch it. The `href?: never` is the stricter version that closes that gap.

---

## No discriminant? Use mutually exclusive flags

Sometimes the variants are flag-based rather than string-discriminated:

```typescript
// Two mutually exclusive loading states
type LoadingProps =
  | { isLoading: true; data?: never }
  | { isLoading?: false; data: User[] };

function UserList(props: LoadingProps) {
  if (props.isLoading) {
    return <Spinner />;
  }
  // data is User[] here — not null or undefined
  return <List items={props.data} />;
}
```

---

## Real-world example: Icon component

```typescript
type IconOwnProps = {
  size?: number;
  className?: string;
};

type IconFromName = IconOwnProps & {
  name: string;
  svg?: never;
};

type IconFromSvg = IconOwnProps & {
  svg: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  name?: never;
};

type IconProps = IconFromName | IconFromSvg;

function Icon(props: IconProps) {
  const { size = 24, className } = props;

  if (props.svg) {
    const SvgComponent = props.svg;
    return <SvgComponent width={size} height={size} className={className} />;
  }

  return <img src={`/icons/${props.name}.svg`} width={size} height={size} className={className} />;
}
```

---

> **Check yourself:** After `if (props.isLoading)` in the `UserList` example, what is the type of `props.data`? Before the check, what is it?

---

## Combining with generic types

Discriminated union props can also be generic:

```typescript
type FieldProps<T extends string | number> =
  | { type: "text"; value: string; onChange: (v: string) => void }
  | { type: "number"; value: number; onChange: (v: number) => void; min?: number; max?: number };
```

This is less common — usually discriminated union props and generics live in separate layers of the API.

---

## Gotchas

**Discriminant must be a literal type.** `variant: string` doesn't work as a discriminant — TypeScript can't narrow on it because it could be any string. The discriminant must be a literal (`"button"`, `"link"`) or a literal union.

**`never` vs omitting the key.** Omitting a key allows the prop to be accidentally included via object spread. `prop?: never` is the explicit form that blocks it. Both work for direct JSX usage; `never` is stricter for spread scenarios.

**Too many variants gets unwieldy.** A union of 6 variants with shared base props becomes hard to read. Consider whether a different abstraction (separate components, compound components) is clearer than a 6-variant union.

**Narrowing only works inside the component.** The caller doesn't need to narrow — TypeScript checks their props at the call site against the full union. The narrowing is internal to the component implementation.

---

## Interview Q&A

**Q: What is a discriminated union prop type and when do you use it? (High)**

A discriminated union prop type is a TypeScript union where each member has a literal discriminant (like `variant: "button" | "link"`). You use it when some props are only valid for certain component variants — like `href` only making sense when `variant="link"`. TypeScript narrows the props type inside conditional branches based on the discriminant, giving type-safe access to variant-specific props.

---

**Q: What does `href?: never` accomplish in a props type? (High)**

It explicitly blocks the `href` prop on that variant. `never` is the empty type — no value satisfies it, including `undefined`. Without `never`, the key is simply absent, which is usually sufficient for direct JSX usage but can be bypassed by object spread. With `never`, TypeScript errors on any attempt to pass `href`, even via spread.

---

**Q: How does TypeScript narrow inside a component with discriminated union props? (Medium)**

After checking `props.variant === "link"`, TypeScript narrows `props` from the full union `ButtonVariant | LinkVariant` to just `LinkVariant`. All props exclusive to `LinkVariant` (like `href: string`) are now accessible without optional chaining or non-null assertion.

---

**Q: How do you model mutually exclusive boolean flags with TypeScript? (Medium)**

Use a discriminated union where the flag itself is the discriminant: `{ isLoading: true; data?: never } | { isLoading?: false; data: T[] }`. This prevents callers from passing `isLoading: true` and `data` simultaneously, and narrows `data` inside conditional branches.

---

**Q: What makes a good discriminant? (Low)**

It should be a literal type (string, number, or boolean literal) — not just `string`. Each union member should have a unique value for the discriminant. TypeScript uses the discriminant value to fully narrow the union in a switch/if, so it must be deterministic.

---

## Self-Assessment

- [ ] I can write a discriminated union props type for a component with multiple variants
- [ ] I understand what `prop?: never` does and how it differs from omitting the key
- [ ] I can implement the narrowing pattern inside a component to access variant-specific props
- [ ] I know why the discriminant must be a literal type, not just `string`
- [ ] I can model mutually exclusive boolean flags using a discriminated union
- [ ] I can explain when to use this pattern vs. separate components
