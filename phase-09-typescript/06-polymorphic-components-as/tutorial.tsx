// ============================================================
// Topic:   Polymorphic Components with `as`
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 06-polymorphic-components-as
//
// APPROACH:
//   Exercise 1 — Build Box<C> step by step: naive → type-safe (build)
//   Exercise 2 — Add own props + Omit to avoid key conflicts (extend)
//   Exercise 3 — asChild pattern: the Radix alternative (contrast)
//
// The pattern lets one component render as any element — <Box as="a">,
// <Box as="button"> — and TypeScript validates the correct prop set for each.
// ============================================================

import React, { useState } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const sectionCard: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const badgeStyle: React.CSSProperties = {
  display: 'inline-block', background: '#e0f2fe', color: '#0369a1',
  borderRadius: 4, padding: '1px 7px', fontSize: 11, marginLeft: 6,
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Building Box<C> step by step
//
// Step 1 (naive): `as?: React.ElementType` — works but TypeScript can't
//   validate props because ElementType is too wide.
//
// Step 2 (typed): `C extends React.ElementType` as a type parameter +
//   React.ComponentPropsWithoutRef<C> — TypeScript resolves the exact
//   prop set for whatever element C is.
//
// The magic: React.ComponentPropsWithoutRef<C>
//   C = "a"      → React.AnchorHTMLAttributes<HTMLAnchorElement>
//   C = "button" → React.ButtonHTMLAttributes<HTMLButtonElement>
//   C = "input"  → React.InputHTMLAttributes<HTMLInputElement>
//
// CHECK YOURSELF:
//   • In the naive version, can you pass href to <NaiveBox as="button">?
//     What about in the typed version?
//   • What is React.ElementType? (hint: look at the union it represents)
//   • Why does the default type parameter (= "div") matter for callers?
// ─────────────────────────────────────────────────────────────

// ── Naive — works at runtime, but TypeScript can't validate props ────────
type NaiveBoxProps = {
  as?: React.ElementType;   // too wide — accepts any element, can't narrow props
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
} & Record<string, unknown>; // hack: accept anything — defeats the purpose

function NaiveBox({ as: Component = 'div', ...props }: NaiveBoxProps) {
  return <Component {...props} />;
}

// ── Typed — TypeScript resolves props based on C ────────────────────────
type BoxProps<C extends React.ElementType> = {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, 'as'>;
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//   This resolves to the EXACT prop set for element C.
//   When C="a", you get href, target, download, rel, etc.
//   When C="button", you get type, form, formAction, etc.

function Box<C extends React.ElementType = 'div'>({
  as,
  ...props
}: BoxProps<C>) {
  const Component = (as ?? 'div') as React.ElementType;
  return <Component {...props} />;
}

function Exercise1() {
  return (
    <div>
      <p style={hint}>
        The typed <code>Box</code> validates props based on the <code>as</code> value.
        Hover over each usage to see TypeScript's resolved prop type.
        The commented-out lines show what TypeScript would reject.
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={sectionCard}>
          <strong style={{ fontSize: 13 }}>Naive Box — no type safety</strong>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* These all compile — TypeScript can't check anything */}
            <NaiveBox as="button" style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}>Button</NaiveBox>
            {/* @ts-expect-error would NOT appear here — NaiveBox accepts anything */}
            <NaiveBox as="a" href="/example" style={{ color: '#3b82f6' }}>Link</NaiveBox>
          </div>
        </div>

        <div style={sectionCard}>
          <strong style={{ fontSize: 13 }}>Typed Box — props validated per element</strong>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Default "div" — accepts div attributes */}
            <Box style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: 6 }}>
              div (default)
            </Box>

            {/* as="button" — accepts button attributes like type */}
            <Box
              as="button"
              type="button"
              onClick={() => alert('button clicked')}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
            >
              button
            </Box>

            {/* as="a" — accepts anchor attributes like href */}
            <Box
              as="a"
              href="https://typescriptlang.org"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#3b82f6', padding: '6px 0' }}
            >
              anchor with href
            </Box>

            {/* These would be TypeScript errors: */}
            {/* <Box as="button" href="/home">Error: href not valid on button</Box> */}
            {/* <Box as="a" type="submit">Error: type="submit" not valid on anchor</Box> */}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Adding own props: variant, size, and the Omit pattern
//
// When Box has its own props (like `variant`, `size`), you need to prevent
// conflicts with native HTML attributes that happen to share the same name.
//
// The pattern: Omit<ComponentPropsWithoutRef<C>, keyof OwnProps>
//   This strips any native attribute that shares a name with your custom prop.
//   Without the Omit, TypeScript sees two definitions of the same key
//   and resolves the conflict — usually to `never`, making the prop unusable.
//
// CHECK YOURSELF:
//   • What would happen if you removed the Omit and both types defined `size`?
//   • Try passing as="a" with variant="ghost" — which props are available?
//   • Can you pass href on the ghost link? What about type="submit"?
// ─────────────────────────────────────────────────────────────

type ButtonOwnProps<C extends React.ElementType> = {
  as?: C;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

type ButtonPolyProps<C extends React.ElementType> =
  ButtonOwnProps<C> &
  Omit<React.ComponentPropsWithoutRef<C>, keyof ButtonOwnProps<C>>;
  // ^^^^
  // Removes any native prop that conflicts with our custom props.
  // Without this: if HTMLElement had a `size` attribute, TypeScript
  // would see two `size` definitions and widen to `never`.

const variantStyles: Record<string, React.CSSProperties> = {
  solid:   { background: '#3b82f6', color: '#fff', border: 'none' },
  outline: { background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6' },
  ghost:   { background: 'transparent', color: '#374151', border: '1px solid #e5e7eb' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '3px 10px', fontSize: 12 },
  md: { padding: '6px 14px', fontSize: 14 },
  lg: { padding: '9px 20px', fontSize: 16 },
};

function PolyButton<C extends React.ElementType = 'button'>({
  as,
  variant = 'solid',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonPolyProps<C>) {
  const Component = (as ?? 'button') as React.ElementType;
  return (
    <Component
      {...rest}
      disabled={loading || (disabled as boolean | undefined)}
      style={{
        borderRadius: 6,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        textDecoration: 'none',
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {loading ? '⏳' : null}
      {children}
    </Component>
  );
}

function Exercise2() {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <p style={hint}>
        <code>PolyButton</code> renders as <code>button</code>, <code>a</code>, or any element.
        TypeScript ensures you only pass props valid for the chosen element.
        The <code>Omit</code> prevents our <code>size</code> prop from conflicting with
        any native element attribute named <code>size</code>.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Renders as <button> — has type, onClick, disabled, etc. */}
        <PolyButton
          variant="solid"
          size="md"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 1000));
            setLoading(false);
          }}
        >
          Submit
          <span style={badgeStyle}>button</span>
        </PolyButton>

        {/* Renders as <a> — has href, target, rel, download, etc. */}
        <PolyButton
          as="a"
          variant="outline"
          size="md"
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
        >
          React Docs
          <span style={badgeStyle}>a</span>
        </PolyButton>

        <PolyButton variant="ghost" size="sm" disabled>
          Disabled
        </PolyButton>

        <PolyButton variant="solid" size="lg">
          Large
        </PolyButton>

        {/* These would be TypeScript errors: */}
        {/* <PolyButton as="button" href="/home">Error: href not on button</PolyButton> */}
        {/* <PolyButton as="a" type="submit">Error: type="submit" not on anchor</PolyButton> */}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — The asChild pattern: Radix-style alternative
//
// Instead of <Button as="a" href="...">, Radix UI uses:
//   <Button asChild><a href="...">Link</a></Button>
//
// The component clones the child element, merging its own props.
// This completely avoids the complex generic types.
//
// Trade-offs:
//   ✅ Much simpler type system — no generics at all
//   ✅ Composes naturally with any element or component
//   ❌ TypeScript can't validate the child's prop types
//   ❌ No compile-time check that the child is the right element
//   ❌ Merging logic (cloneElement) can be surprising
//
// OBSERVE:
//   1. Hover over the asChild Button usage — no generic, no element check
//   2. Both render an <a> with button styles — identical DOM output
//   3. The as version validates href at compile time; asChild version doesn't
//
// CHECK YOURSELF:
//   • When would you choose asChild over as?
//   • What could go wrong if you pass a non-element as the child of asChild?
//   • Why does Radix UI prefer asChild despite the type tradeoffs?
// ─────────────────────────────────────────────────────────────

type AsChildButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
};

function AsChildButton({ asChild = false, variant = 'solid', children, ...props }: AsChildButtonProps) {
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 6, padding: '6px 14px', fontSize: 14,
    cursor: 'pointer', textDecoration: 'none',
    ...variantStyles[variant],
  };

  if (asChild && React.isValidElement(children)) {
    // Merge our styles into the child element
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      style: {
        ...style,
        ...(children.props as Record<string, unknown>).style,
      },
    });
  }

  return <button {...props} style={style}>{children}</button>;
}

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Both buttons look the same but use different patterns.
        The <code>as</code> version checks props at compile time.
        The <code>asChild</code> version is simpler but less type-safe.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* as prop — TypeScript validates href is valid on "a" */}
        <PolyButton
          as="a"
          variant="solid"
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
        >
          as="a" version
          <span style={badgeStyle}>href checked ✓</span>
        </PolyButton>

        {/* asChild — no generic, child's props not validated by the component */}
        <AsChildButton asChild variant="outline">
          <a href="https://typescriptlang.org" target="_blank" rel="noreferrer">
            asChild version
            <span style={badgeStyle}>href not checked</span>
          </a>
        </AsChildButton>

        {/* Normal button usage of AsChildButton */}
        <AsChildButton variant="ghost" onClick={() => alert('clicked!')}>
          Normal button
        </AsChildButton>
      </div>

      <div style={{ ...sectionCard, marginTop: 12, fontSize: 13 }}>
        <strong>When to use each:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li><strong>as prop</strong> — when prop-type safety matters and you can accept the generic complexity</li>
          <li><strong>asChild</strong> — when composing with arbitrary third-party components (like a router <code>Link</code>) and the child's types are already checked elsewhere</li>
        </ul>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Polymorphic Components with <code>as</code>
      </h1>

      <h2>Exercise 1 — Box&lt;C&gt;: naive vs type-safe</h2>
      <Exercise1 />

      <h2>Exercise 2 — Own props + Omit for conflict prevention</h2>
      <Exercise2 />

      <h2>Exercise 3 — asChild: the Radix-style alternative</h2>
      <Exercise3 />
    </div>
  );
}
