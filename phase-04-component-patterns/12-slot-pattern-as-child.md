# Slot Pattern / asChild

## What Is This?

The slot pattern is a mechanism for merging a component's behavior and props onto a child element instead of rendering its own wrapper element. When a component has `asChild` mode, it doesn't render its own DOM element — it takes the single child you pass it and merges its props, event handlers, and ref onto that child.

```jsx
// Without asChild — Button renders a <button>
<Button onClick={handleSave}>Save</Button>
// DOM: <button class="btn" onclick="...">Save</button>

// With asChild — Button merges onto the <a> you pass
<Button asChild>
  <a href="/save">Save</a>
</Button>
// DOM: <a href="/save" class="btn" onclick="...">Save</a>
```

The `Button` contributes its `className`, `onClick`, `disabled` handling, and any other props. The child `<a>` contributes its element type and its own props. The result is a single DOM element with both sets of props merged.

The `Slot` component is the implementation primitive that makes `asChild` work. Radix UI open-sourced it; shadcn/ui includes it; it's the pattern driving most modern headless component libraries.

## Why Does It Exist?

The polymorphic `as` prop (previous topic) solves the same problem but has a TypeScript generics problem that becomes genuinely complex when combined with `forwardRef`.

`asChild` sidesteps the generics problem entirely: the caller writes the actual element in JSX, so TypeScript already knows its type from the JSX itself. No generics needed on the component.

Additionally, `asChild` is clearer at the call site. With `as`:
```jsx
<Button as={Link} to="/signup">Sign Up</Button>
```
The element is hidden inside a prop value. With `asChild`:
```jsx
<Button asChild>
  <Link to="/signup">Sign Up</Link>
</Button>
```
The element is visible as JSX. You immediately see the rendered element.

The pattern was introduced by Radix UI around 2022 and has rapidly become the standard approach in the React design system ecosystem.

## How It Works

### The `Slot` Component

```jsx
import React from 'react';

function Slot({ children, ...slotProps }) {
  if (!React.isValidElement(children)) {
    return null; // or throw — there must be exactly one element child
  }
  
  return React.cloneElement(children, {
    ...mergeProps(slotProps, children.props),
    ref: mergeRefs(slotProps.ref, children.props.ref),
  });
}
```

The core is `React.cloneElement` — clone the child element and inject the merged props. But the merging isn't naive — you can't just spread one set of props over the other because some props (like event handlers) need to be combined, not overwritten.

### Prop Merging

The tricky part is event handlers. If both the `Slot` and the child have an `onClick`, you want both to fire — not one to override the other:

```jsx
function mergeProps(slotProps, childProps) {
  const merged = { ...childProps, ...slotProps }; // slotProps take precedence for most props
  
  // But event handlers should be chained, not overwritten
  for (const key in childProps) {
    if (
      typeof slotProps[key] === 'function' &&
      typeof childProps[key] === 'function' &&
      key.startsWith('on') // event handlers
    ) {
      merged[key] = (...args) => {
        childProps[key]?.(...args);
        slotProps[key]?.(...args);
      };
    }
  }
  
  // className should be merged too
  if (slotProps.className || childProps.className) {
    merged.className = [slotProps.className, childProps.className]
      .filter(Boolean)
      .join(' ');
  }
  
  return merged;
}
```

The convention (which Radix follows) is that the child's handler fires first, then the slot's handler. This way, the child can call `event.preventDefault()` before the parent's handler runs.

### Ref Merging

Both the Slot and the child can have refs. Both need to receive the DOM node:

```jsx
function mergeRefs(...refs) {
  return (node) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    });
  };
}
```

### Using `Slot` in a Component

```jsx
function Button({ asChild = false, className, children, ...props }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component className={`btn ${className || ''}`} {...props}>
      {children}
    </Component>
  );
}
```

When `asChild` is false, `Component` is `'button'` — a normal button. When `asChild` is true, `Component` is `Slot` — which merges its props onto its child. The component's own code doesn't need to change; it just renders `<Component>` either way.

### Full Example

```jsx
const Slot = /* implementation above */;

function Trigger({ asChild = false, onClick, children, ...rest }) {
  const Component = asChild ? Slot : 'button';
  
  return (
    <Component
      onClick={onClick}
      {...rest}
    >
      {children}
    </Component>
  );
}

// Without asChild — renders <button>
<Trigger onClick={openModal}>Open</Trigger>

// With asChild — merges onto <a>
<Trigger asChild onClick={openModal}>
  <a href="#modal">Open</a>
</Trigger>
// Result: <a href="#modal" onclick="[merged]">Open</a>
// Both onClick handlers fire (href is from the child, onClick from Trigger)
```

## The Real Radix Implementation

Radix UI's `@radix-ui/react-slot` package is more complete — it handles:

- `SlotClone` for when children are themselves rendered with `Slot` (nested asChild)
- Fragments and single-element enforcement
- Stable ref merging
- `style` merging (similar to className)

The package is small enough to read in an hour and is the canonical reference for this pattern. `shadcn/ui` copies it directly into `src/lib/utils.ts` for projects to own.

## TypeScript Benefits

The TypeScript benefit is the main motivation. Compare:

```typescript
// Polymorphic with `as` — complex generics
function Button<E extends ElementType = 'button'>({
  as,
  ...
}: ButtonProps<E>) { ... }

// asChild — no generics needed
function Button({ asChild, className, children, ...props }: {
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) { ... }
```

The `asChild` version's type only covers `HTMLButtonElement` props. When the caller passes `asChild`, TypeScript doesn't know about `<a>` props — but the caller writes `<a href="...">` directly in JSX, and TypeScript checks `<a>`'s props there. The checking happens at the right place (where the element is written) rather than through complex inference chains.

## Common Patterns in the Wild

**shadcn/ui Button:**
```jsx
<Button asChild>
  <Link href="/dashboard">Dashboard</Link>
</Button>
```

**Radix's NavigationMenu Trigger:**
```jsx
<NavigationMenu.Trigger asChild>
  <button className="custom-trigger">Products</button>
</NavigationMenu.Trigger>
```

**Radix's Dialog Trigger:**
```jsx
<Dialog.Trigger asChild>
  <Button variant="outline">Edit Profile</Button>
</Dialog.Trigger>
```

This last one is interesting: `Dialog.Trigger` renders a button by default, but with `asChild` it merges onto your custom `<Button>` — which itself might render a `<button>`. Radix handles this double-application of slot behavior with its `SlotClone` mechanism.

## Gotchas

**`asChild` requires exactly one child element.** If you pass zero children, a string, or multiple children, the Slot implementation doesn't know what to merge onto. Most implementations throw in this case. The error message matters — make it clear.

**Deeply nested asChild can behave unexpectedly.** If a component uses `asChild` and its child also uses `asChild` (like the Dialog.Trigger + Button example), the Slot logic needs to handle passing through properly. The Radix implementation handles this; naive implementations don't.

**`className` merging conflicts with Tailwind's override patterns.** If both the Slot and the child have Tailwind classes, they're all concatenated. Conflicting utilities (e.g., both `text-red-500` and `text-blue-500`) result in whichever appears last in Tailwind's generated CSS winning — not necessarily the one you wrote last. Libraries like `clsx` + `tailwind-merge` (`cn()` in shadcn/ui) handle this.

**Event handler order matters.** The convention is child fires first, slot fires second. This means the child's handler can call `event.preventDefault()` to cancel the slot's action. If you need the slot's handler to fire first and potentially prevent the child's, you need a different merging order.

**`style` objects need deep merge.** Naively spreading `{ ...childStyle, ...slotStyle }` overwrites all of the child's styles with the slot's styles. You need to spread both: `{ ...childStyle, ...slotStyle }` is fine for top-level style properties, but if you have conflicting properties (both set `color`), the slot wins — make sure this is the intended behavior.

## Interview Questions

**Q (High): What is the `asChild` pattern and how does it differ from the `as` polymorphic prop?**

Answer: Both let callers control the rendered element. With `as`, the caller passes the element type as a prop (`as={Link}`), and the component renders it internally with the correct props. With `asChild`, the caller renders the element themselves as a child, and the component merges its props onto that child using a `Slot` primitive. `asChild` is simpler to type in TypeScript — no generics needed, since the element type is known from the caller's JSX — and makes the rendered element visible at the call site. The trade-off is that `asChild` requires exactly one element child and needs a Slot implementation that correctly merges props, event handlers, refs, and classNames.

The trap: Describing them as identical. The merging mechanism and TypeScript story are meaningfully different.

**Q (High): Why do event handlers need special merging logic in a Slot implementation?**

Answer: Both the parent component (Slot provider) and the child element can have handlers for the same event. A naive prop spread (`{ ...childProps, ...slotProps }`) means slotProps' `onClick` overwrites childProps' `onClick` — one handler is silently dropped. The correct behavior is to chain them: when both have `onClick`, call the child's first, then the slot's. This ordering lets the child call `event.preventDefault()` or `event.stopPropagation()` before the slot's logic runs, giving the child the final say. The same applies to `onFocus`, `onBlur`, `onChange`, and any other event handler.

The trap: Not knowing that naive spreading drops handlers — this is the most common bug in ad-hoc Slot implementations.

**Q (Medium): What happens when you use `asChild` and the child element is itself a component that uses `asChild`?**

Answer: The outer Slot clones the child component element, merging in its props. The child component then renders with those merged props and internally creates another Slot that clones *its* child. This works if both Slot implementations are compatible — specifically, if the inner Slot sees the merged props from the outer Slot plus its own props and merges them all together. Radix handles this with a `SlotClone` mechanism that detects nested slots and chains the prop merging. A naive `cloneElement` implementation won't — the outer slot's props will be lost when the inner Slot does its own merge.

The trap: Assuming it just works. Nesting asChild requires explicit support in the Slot implementation.

**Q (Low): How does `className` merging work in Slot, and what problem does this cause with Tailwind?**

Answer: Slot typically merges classNames by concatenating them with a space: `[slotClass, childClass].filter(Boolean).join(' ')`. In plain CSS this is fine — both sets of classes apply. In Tailwind, conflicting utility classes (e.g., `text-sm` from the slot and `text-lg` from the child) are both present in the output, and whichever appears later in Tailwind's generated CSS wins — regardless of JSX order. This is unpredictable. The solution is `tailwind-merge` (`twMerge`), which detects conflicting Tailwind utilities and keeps only the last one in DOM order. This is why shadcn/ui's `cn()` utility is `clsx` + `tailwind-merge` rather than just string concatenation.

---
*Next: Phase 5 — Performance & Internals. Starting with Virtual DOM & Reconciliation — the mechanism that makes everything we've built so far work efficiently.*
