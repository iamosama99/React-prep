# Polymorphic Components

## What Is This?

A polymorphic component can render as different HTML elements or React components depending on a prop — typically called `as`. The component's styles, behavior, and accessibility semantics come from the component, but the underlying element is determined by the caller.

```jsx
<Button as="a" href="/signup">Sign Up</Button>
// Renders: <a href="/signup" class="btn">Sign Up</a>

<Button as={Link} to="/signup">Sign Up</Button>
// Renders: <Link to="/signup" class="btn">Sign Up</Link>

<Button>Click Me</Button>
// Renders: <button class="btn">Click Me</button>
```

The `Button` component provides visual and behavioral consistency. The `as` prop controls the DOM element or component — and therefore the semantics, the available props, and how the browser treats it.

## Why Does It Exist?

**The semantic HTML problem.** A "button-looking" element should be a `<button>` when it triggers an action, an `<a>` when it navigates, and sometimes a custom element (like React Router's `<Link>`) for client-side navigation. Separate `<Button>`, `<ButtonLink>`, and `<RouterButton>` components that share styles leads to duplicated styling, inconsistent APIs, and divergence over time.

**The design system problem.** Design systems define tokens — text sizes, spacing, color roles. A `<Text>` component might need to render as `h1`, `h2`, `p`, `span`, `label`, or `li`. Creating `<H1>`, `<H2>`, `<Paragraph>`, `<Span>`, `<Label>` components separately means duplicating all the typography logic.

Polymorphic components solve both: one component, multiple element targets, the caller decides which.

## How It Works (JavaScript)

```jsx
const defaultElement = 'button';

function Button({ as: Component = defaultElement, children, className, ...rest }) {
  return (
    <Component className={`btn ${className || ''}`} {...rest}>
      {children}
    </Component>
  );
}
```

The convention is to capitalize the `as` prop when you destructure it (renaming it to `Component`) so JSX knows to treat it as a component reference, not a string tag name.

This handles:
- `<Button as="a" href="...">` → `as` is the string `"a"` → `<a href="..." class="btn">`
- `<Button as={Link} to="...">` → `as` is the `Link` component → `<Link to="..." class="btn">`
- `<Button>` → `as` defaults to `"button"` → `<button class="btn">`

### Merging Props

The `{...rest}` spread passes all other props to the underlying element. This means props valid for `<a>` (`href`, `target`) will pass through when `as="a"`, and props valid for `<Link>` (`to`) will pass through when `as={Link}`. The component doesn't need to know about element-specific props — it just forwards them.

### With forwardRef

A complete, production-level polymorphic component also forwards refs:

```jsx
const Button = React.forwardRef(function Button(
  { as: Component = 'button', children, className, ...rest },
  ref
) {
  return (
    <Component ref={ref} className={`btn ${className || ''}`} {...rest}>
      {children}
    </Component>
  );
});
```

## TypeScript: Where It Gets Interesting

In plain JavaScript, the implementation above works perfectly. In TypeScript, the challenge is making the type system understand that the props available depend on which element is passed as `as`.

When `as="a"`, `href` should be a valid prop. When `as="button"`, `href` should be an error. When `as={Link}`, the component's own props should be available.

This requires generics:

```jsx
import { ComponentPropsWithoutRef, ElementType } from 'react';

type ButtonOwnProps<E extends ElementType = 'button'> = {
  as?: E;
  children?: React.ReactNode;
};

type ButtonProps<E extends ElementType = 'button'> =
  ButtonOwnProps<E> & Omit<ComponentPropsWithoutRef<E>, keyof ButtonOwnProps<E>>;

function Button<E extends ElementType = 'button'>({
  as,
  children,
  ...rest
}: ButtonProps<E>) {
  const Component = as ?? 'button';
  return <Component {...(rest as any)}>{children}</Component>;
}
```

- `ElementType` covers both string tag names (`'a'`, `'button'`) and component types
- `ComponentPropsWithoutRef<E>` gives you the correct prop interface for the element type `E`
- `Omit<..., keyof ButtonOwnProps<E>>` prevents our own props from conflicting with the element's props
- The generic `E` flows from the `as` prop through to the full type

The TypeScript implementation is notoriously tricky, which is why Radix UI introduced the `asChild` pattern as an alternative.

## The `asChild` Pattern (Alternative)

Radix UI popularized an approach that avoids polymorphic generics entirely. Instead of `as`, you pass `asChild` and nest your element:

```jsx
<Button asChild>
  <a href="/signup">Sign Up</a>
</Button>
```

When `asChild` is true, the `Button` merges its props and behavior onto the child element instead of rendering its own element. The caller explicitly writes the element they want, and the component wraps it.

This has advantages:
- TypeScript is straightforward — the child's type is known
- The rendered element is visible at the call site
- No complex generic machinery needed

The implementation uses `React.cloneElement` (or more recently, a `Slot` primitive from Radix). This is the subject of the next topic.

## When to Use Polymorphic Components

- Design system primitives where semantic elements vary (Typography, Box, Button)
- Navigation elements where the underlying mechanism varies (`<a>` vs `<Link>` vs `<button>`)
- Layout components (`<Box as="section">`) where the block element changes meaning without changing styling

When *not* to use them: when you only have one or two variations — just build separate components. Polymorphism adds complexity; use it when the number of variations makes alternatives worse.

## Gotchas

**Prop conflicts between your own props and element props.** If you have a `size` prop and the underlying `<input>` also has a `size` attribute, you need to explicitly handle the conflict with `Omit`. In JavaScript this is a silent bug — wrong `size` value silently passed to the element.

**Accessibility semantics change with the element.** `<Button as="a">` looks like a button but is semantically a link. Screen readers announce it as a link. Keyboard users expect Enter to follow it (like a link), not Space to activate it (like a button). These semantic differences matter — don't use `as="a"` when you want button behavior. Use `as="a"` only when the rendered element's semantics match the intent.

**TypeScript inference breaks with complex generics.** Even with the correct type definition, some patterns involving generic polymorphic components and `forwardRef` together have historically broken TypeScript's inference. There are known workarounds (casting, explicit generic annotation) but they're verbose. This is partly why Radix chose `asChild`.

**`as` as a string renders a custom HTML element.** If someone passes `as="my-element"`, React renders a custom element. This may or may not be intentional — you might want to constrain `as` to valid HTML elements or known components.

## Interview Questions

**Q (High): What is a polymorphic component and what problem does it solve?**

Answer: A polymorphic component renders as different HTML elements or components depending on an `as` prop, while providing consistent styling and behavior. It solves the problem of semantic HTML variation — a "button" component should render as `<button>` for actions, `<a>` for navigation, and a router's `<Link>` for client-side navigation. Without polymorphism, you'd duplicate the button styles and API across multiple components. With `as`, one component covers all cases and the caller picks the appropriate semantic element.

The trap: Framing it only as a styling convenience. The semantic HTML and accessibility implications are the real reason it matters.

**Q (High): Why is typing a polymorphic component in TypeScript difficult?**

Answer: The available props depend on which element `as` points to — when `as="a"`, `href` should be valid; when `as="button"`, it should be a type error. This requires making the component generic over the element type, using `ComponentPropsWithoutRef<E>` to derive the correct prop interface, and `Omit` to prevent prop name conflicts between the component's own props and element-native props. The generic inference also needs to flow through `forwardRef`, which adds another layer. Getting all of this correct together is complex enough that many teams prefer the `asChild` pattern (which avoids generics) for TypeScript projects.

The trap: Just saying "it uses generics" — explain specifically why it's hard and what the solution is.

**Q (Medium): What's the difference between the `as` pattern and Radix's `asChild` pattern?**

Answer: With `as`, the component internally renders `<Component {...props} />` where `Component` is the value of `as`. The prop types are derived from `as` via TypeScript generics. With `asChild`, the caller renders the actual element as a child (`<Button asChild><a href="...">text</a></Button>`), and the component merges its props onto that child element using `cloneElement` or a Slot primitive. The `asChild` pattern makes TypeScript easier (the child's type is known from the JSX), makes the rendered element visible at the call site, but requires an extra element in the JSX and a Slot implementation. Both patterns achieve the same result; `asChild` trades some JSX verbosity for type safety.

---
*Next: Slot Pattern / asChild — diving deep into the implementation behind Radix's `asChild`, how Slot merges props, and why it's becoming the dominant pattern in modern component libraries.*
