# Polymorphic Components with `as`

## Quick Reference

| Concept | Pattern |
|---|---|
| `as` prop type | `React.ElementType` |
| Component type parameter | `<C extends React.ElementType = "div">` |
| Props from element | `React.ComponentPropsWithoutRef<C>` |
| Exclude conflicts | `Omit<React.ComponentPropsWithoutRef<C>, keyof OwnProps>` |
| Full props type | `OwnProps & Omit<React.ComponentPropsWithoutRef<C>, keyof OwnProps>` |
| With ref | `React.ComponentPropsWithRef<C>` |

---

## What and why

A polymorphic component renders as different HTML elements (or other components) based on a prop — typically named `as`. Radix UI, Chakra UI, and most design systems use this pattern. The challenge in TypeScript is making the `as` prop narrow the rest of the valid HTML attributes automatically.

Without TypeScript, this is easy:

```jsx
function Box({ as: Component = "div", ...props }) {
  return <Component {...props} />;
}

<Box as="button" onClick={...} />   // fine at runtime
<Box as="a" href="..." />           // fine at runtime
```

With TypeScript, you need the type system to understand that when `as="a"`, the component should accept `href` but not `type="submit"`, and when `as="button"`, it should accept `type="submit"` but not `href`.

---

## The full pattern

```typescript
type PolymorphicProps<C extends React.ElementType> = {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, "as">;

function Box<C extends React.ElementType = "div">({
  as,
  ...props
}: PolymorphicProps<C>) {
  const Component = as ?? "div";
  return <Component {...props} />;
}
```

Usage:

```typescript
// Renders <div> — accepts div attributes
<Box className="container">...</Box>

// Renders <button> — accepts button attributes including onClick, type
<Box as="button" onClick={handleClick} type="submit">Submit</Box>

// Renders <a> — accepts anchor attributes including href
<Box as="a" href="/home">Go home</Box>

// TypeScript error: href is not valid on a div
<Box href="/home">...</Box>
```

The magic is `React.ComponentPropsWithoutRef<C>` — this extracts all valid props for whatever element or component `C` is. When `C` is `"a"`, it returns `React.AnchorHTMLAttributes<HTMLAnchorElement>`. When `C` is `"button"`, it returns `React.ButtonHTMLAttributes<HTMLButtonElement>`.

---

> **Check yourself:** What happens to the available props on `<Box>` when you pass `as="input"`? What props become available that weren't there before?

---

## Adding your own props

When the polymorphic component also has its own props (like a `variant` or `size`), you need to exclude them from the forwarded element props to avoid conflicts:

```typescript
type BoxOwnProps<C extends React.ElementType> = {
  as?: C;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

type BoxProps<C extends React.ElementType> = BoxOwnProps<C> &
  Omit<React.ComponentPropsWithoutRef<C>, keyof BoxOwnProps<C>>;

function Box<C extends React.ElementType = "div">({
  as,
  variant = "solid",
  size = "md",
  ...rest
}: BoxProps<C>) {
  const Component = as ?? "div";
  return (
    <Component
      className={`box box-${variant} box-${size}`}
      {...rest}
    />
  );
}
```

The `Omit<..., keyof BoxOwnProps<C>>` prevents the native element from having a conflicting `variant` or `size` prop — if `HTMLElement` ever had a `variant` attribute, yours would shadow it correctly rather than causing a type conflict.

---

## Default element type

```typescript
function Box<C extends React.ElementType = "div">({
  as,
  ...props
}: BoxProps<C>) { ... }
```

The `= "div"` default means `<Box>` (no `as` prop) types itself as a div component, accepting all div props. This is just a TypeScript default type parameter — at runtime, the `as ?? "div"` fallback still handles it.

---

> **Check yourself:** Why do you need `Omit<ComponentPropsWithoutRef<C>, keyof OwnProps>` instead of just intersecting `OwnProps & ComponentPropsWithoutRef<C>` directly?

---

## Handling refs: ComponentPropsWithRef

If the polymorphic component needs to forward refs, the ref type must also be polymorphic:

```typescript
type PolymorphicRef<C extends React.ElementType> =
  React.ComponentPropsWithRef<C>["ref"];

type BoxWithRefProps<C extends React.ElementType> = BoxOwnProps<C> &
  Omit<React.ComponentPropsWithRef<C>, keyof BoxOwnProps<C>>;

const Box = React.forwardRef(
  <C extends React.ElementType = "div">(
    { as, variant, size, ...rest }: BoxWithRefProps<C>,
    ref: PolymorphicRef<C>
  ) => {
    const Component = as ?? ("div" as React.ElementType);
    return <Component ref={ref} {...rest} />;
  }
) as <C extends React.ElementType = "div">(
  props: BoxWithRefProps<C> & { ref?: PolymorphicRef<C> }
) => React.ReactElement;
```

This is verbose. In practice, most teams either:
1. Skip polymorphic refs entirely (the `as` pattern is usually enough without refs)
2. Use a pre-built utility type from a library (`@radix-ui/react-polymorphic`, `ts-polymorphic-component`)
3. Accept the cast and document it

---

## The asChild pattern (Radix-style)

An alternative to `as` that avoids the complex generics entirely: the `asChild` prop. Instead of specifying the element type, you pass the element as a child and the component clones it, merging its own props:

```typescript
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

function Button({ asChild, children, ...props }: ButtonProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      className: `btn ${children.props.className ?? ""}`,
    });
  }
  return <button {...props}>{children}</button>;
}
```

Usage:

```typescript
// Renders an <a> with button styles, no generics needed
<Button asChild>
  <a href="/home">Go home</a>
</Button>
```

Trade-off: simpler types, but TypeScript doesn't validate that `children` is the right element type. Radix UI went this route precisely because the fully typed `as` pattern with refs becomes intractably complex.

---

> **Check yourself:** What's the difference in the TypeScript experience between the `as` prop pattern and the `asChild` pattern? When would you prefer each?

---

## Gotchas

**`React.ElementType` includes both strings and component types.** `ElementType` is `string | React.JSXElementConstructor<any>`. This means `as={MyCustomComponent}` also works — the prop types it accepts will be inferred as that component's props.

**TypeScript performance.** The `BoxProps<C>` type is computed fresh for every use of the component. On very large codebases, this can slow down the language server. If it's causing issues, consider widening the types slightly or using `React.HTMLAttributes<HTMLElement>` as a fallback.

**`Omit` vs `Exclude`.** `Omit` removes keys from an object type. `Exclude` removes members from a union. Use `Omit` here — you're removing keys from `ComponentPropsWithoutRef`.

---

## Interview Q&A

**Q: What is a polymorphic component and how do you type the `as` prop? (High)**

A polymorphic component renders as different elements based on an `as` prop. The `as` prop is typed as `C extends React.ElementType` — a type parameter. The rest of the component's props are `React.ComponentPropsWithoutRef<C>`, which TypeScript resolves to the correct attribute set for whatever element `C` is. Passing `as="a"` makes `href` valid; passing `as="button"` makes `type="submit"` valid.

---

**Q: Why do you use `ComponentPropsWithoutRef` instead of just `HTMLAttributes`? (High)**

`HTMLAttributes<HTMLElement>` is the base set of attributes — it works for divs and spans but misses element-specific props like `href` for anchors, `type` for buttons, or `src` for images. `ComponentPropsWithoutRef<C>` resolves to the exact prop set for whatever element `C` is, including element-specific attributes. That's what makes the `as` pattern truly type-safe.

---

**Q: Why do you need `Omit<ComponentPropsWithoutRef<C>, keyof OwnProps>`? (Medium)**

Without the `Omit`, if your component has a prop that shares a name with a native HTML attribute, TypeScript sees two definitions of that key and has to resolve the conflict (usually by widening to `never`). The `Omit` strips the conflicting key from the native props, so your custom prop definition wins cleanly.

---

**Q: What's the `asChild` pattern and when is it preferable to `as`? (Medium)**

`asChild` accepts the rendered element as a child instead of a type parameter — the parent component clones the child, merging props. It avoids complex generic types entirely, which is why Radix UI prefers it. The downside is that TypeScript doesn't validate that the child is the right element type. Use `asChild` when ref support and full type safety aren't critical; use `as` when you need TypeScript to check the forwarded props against the element type.

---

**Q: What is `React.ElementType`? (Low)**

It's `string | React.JSXElementConstructor<any>` — the type of valid values for JSX element names. It covers both intrinsic HTML elements (strings like `"div"`, `"button"`) and React components (function or class). Using it as the constraint on `C` means the `as` prop accepts both native elements and custom components.

---

## Self-Assessment

- [ ] I can write the full `PolymorphicProps<C>` type with `React.ElementType` and `ComponentPropsWithoutRef`
- [ ] I know why `Omit<..., keyof OwnProps>` is needed and what problem it solves
- [ ] I can explain the difference between `ComponentPropsWithoutRef` and `ComponentPropsWithRef`
- [ ] I can implement the `asChild` pattern as an alternative and explain its tradeoff
- [ ] I know what `React.ElementType` resolves to and why it accepts both strings and components
- [ ] I understand why adding refs to a polymorphic component gets complicated
