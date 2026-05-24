// ============================================================
// Topic:   Polymorphic Components
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { forwardRef, useRef } from 'react';

// ─── Exercise 1: The `as` Prop — Core Mechanism ───────────────
//
// SITUATION
//   Your design system needs a <Text> component for typography.
//   It should render as h1, h2, h3, p, span, label, or li — depending on
//   semantic context — while keeping font size, line height, and color tokens
//   applied consistently.
//   Without polymorphism: separate <H1>, <H2>, <Paragraph>, <Label> components
//   with duplicated token logic. With polymorphism: one <Text>, caller picks the element.
//
// YOUR TASK — Build <Text>:
//   Props: as (default 'p'), size ('sm'|'md'|'lg'|'xl'|'2xl'), weight ('normal'|'medium'|'bold'),
//          color ('default'|'muted'|'danger'|'success'), children, className, ...rest
//
//   CRITICAL CONVENTION: destructure `as` as `Component` (with capital C)
//     const { as: Component = 'p', ... } = props;
//   JSX treats lowercase tags as DOM elements and capitalized names as components.
//   `<as>` → React looks for an HTML element called "as" (undefined → errors)
//   `<Component>` → React treats it as a component reference (correct)
//
//   SIZE_STYLES + COLOR_STYLES lookup tables are provided. Use them.
//   Spread {...rest} so callers can pass any native HTML attributes.
//
// VERIFY:
//   - <Text as="h1" size="2xl"> renders an actual h1 in the DOM
//   - <Text as="span" color="muted"> renders a span with muted color
//   - DevTools shows the correct element type in the DOM tree

const SIZE_STYLES = {
  sm:  { fontSize: 12, lineHeight: 1.5 },
  md:  { fontSize: 14, lineHeight: 1.6 },
  lg:  { fontSize: 16, lineHeight: 1.6 },
  xl:  { fontSize: 20, lineHeight: 1.4 },
  '2xl': { fontSize: 28, lineHeight: 1.3 },
};

const WEIGHT_STYLES = {
  normal: 400,
  medium: 500,
  bold:   700,
};

const COLOR_STYLES = {
  default: '#1e293b',
  muted:   '#64748b',
  danger:  '#dc2626',
  success: '#16a34a',
};

function Text({
  as: Component = 'p',   // ← CRITICAL: capitalize when destructuring
  size = 'md',
  weight = 'normal',
  color = 'default',
  children,
  style: extraStyle,
  ...rest
}) {
  // TODO: combine SIZE_STYLES[size], WEIGHT_STYLES[weight], COLOR_STYLES[color]
  // into a single style object, then render:
  //   <Component style={combinedStyle} {...rest}>{children}</Component>
  //
  // Don't forget: add `margin: 0` to remove default browser margins on h1/p tags.
  return (
    <Component style={{ margin: 0, ...extraStyle }} {...rest}>
      {children} <span style={{ fontSize: 11, color: '#94a3b8' }}>(stub — implement SIZE/COLOR logic)</span>
    </Component>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — The `as` Prop + Capitalization Convention</h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, maxWidth: 600 }}>
        All of these use the same &lt;Text&gt; component. Inspect the DOM — each
        renders the correct HTML element. The capitalization of `Component` in the
        destructuring is what makes JSX treat it as a component reference.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Text as="h1" size="2xl" weight="bold">This is an h1 heading (size 2xl)</Text>
        <Text as="h2" size="xl" weight="medium">This is an h2 heading (size xl)</Text>
        <Text as="p" size="lg">This is a paragraph at size lg.</Text>
        <Text as="p" size="md" color="muted">Muted paragraph — supporting text.</Text>
        <Text as="span" size="sm" color="danger">⚠ Error message as a span</Text>

        <div>
          <Text as="label" size="sm" weight="medium" color="default" htmlFor="demo-input">
            Label text (renders as label, htmlFor works):
          </Text>
          <br />
          <input id="demo-input" style={{ marginTop: 4 }} placeholder="The label is associated with this" />
        </div>

        <ul style={{ padding: '0 0 0 20px' }}>
          <Text as="li" size="md">List item one</Text>
          <Text as="li" size="md">List item two</Text>
          <Text as="li" size="md" color="success">✓ Completed item</Text>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 2: Polymorphic + forwardRef ─────────────────────
//
// SITUATION
//   Your <Button> component from the design system needs to:
//   1. Default to rendering as a <button> element
//   2. Render as an <a> when navigation is needed (semantic HTML)
//   3. Render as a React Router <Link> for client-side navigation
//   4. Forward refs to the underlying element for focus management and testing
//
// YOUR TASK — Build <Button> with forwardRef + `as` prop:
//
//   Props: as (default 'button'), variant ('primary'|'secondary'|'ghost'|'danger'),
//          size ('sm'|'md'|'lg'), disabled, children, ...rest
//
//   IMPORTANT — forwardRef + generics:
//     const Button = forwardRef(function Button({ as: Component = 'button', ... }, ref) {
//       return <Component ref={ref} ... />;
//     });
//
//   ACCESSIBILITY REMINDER (from notes.md Gotchas):
//     <Button as="a"> is semantically a LINK. Screen readers announce it as "link".
//     Keyboard users expect Enter (not Space) to activate it.
//     Only use `as="a"` when the action IS navigation. For actions, keep `as="button"`.
//
// VERIFY:
//   1. The ref test buttons show the correct element type (BUTTON or A)
//   2. DevTools: refs show the underlying DOM node, not the React component

const BUTTON_VARIANT = {
  primary:   { background: '#3b82f6', color: 'white',    border: 'none' },
  secondary: { background: '#f1f5f9', color: '#1e293b',  border: '1px solid #e2e8f0' },
  ghost:     { background: 'transparent', color: '#475569', border: '1px solid transparent' },
  danger:    { background: '#dc2626', color: 'white',    border: 'none' },
};

const BUTTON_SIZE = {
  sm: { padding: '4px 12px',  fontSize: 13, borderRadius: 5 },
  md: { padding: '8px 16px',  fontSize: 14, borderRadius: 6 },
  lg: { padding: '12px 24px', fontSize: 16, borderRadius: 8 },
};

const Button = forwardRef(function Button(
  { as: Component = 'button', variant = 'primary', size = 'md', disabled, children, style: extraStyle, ...rest },
  ref
) {
  // TODO: compose styles from BUTTON_VARIANT[variant] + BUTTON_SIZE[size]
  // Render: <Component ref={ref} disabled={Component === 'button' ? disabled : undefined} style={...} {...rest}>
  // Note: `disabled` is a valid attribute on <button> but not on <a> or custom components
  return (
    <Component ref={ref} style={{ cursor: 'pointer', fontFamily: 'inherit', ...extraStyle }} {...rest}>
      {children}
    </Component>
  );
});

function Exercise2() {
  const buttonRef = useRef(null);
  const linkRef   = useRef(null);

  return (
    <section>
      <h2>Exercise 2 — Polymorphic Button + forwardRef</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {/* Default: renders as <button> */}
        <Button variant="primary" size="md" onClick={() => alert('Action!')}>
          Primary Action
        </Button>

        {/* Navigation: renders as <a> — semantically a link */}
        <Button as="a" href="#exercise3" variant="secondary" size="md">
          Navigate (link)
        </Button>

        {/* Would be React Router Link in a real app */}
        {/* <Button as={Link} to="/dashboard" variant="ghost">Dashboard</Button> */}

        <Button variant="danger" size="sm">Delete</Button>
        <Button variant="ghost" size="lg">Ghost large</Button>
      </div>

      <h4 style={{ fontSize: 13, marginBottom: 8 }}>Ref test (forwardRef verification):</h4>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Button ref={buttonRef} variant="secondary" size="sm">Button ref target</Button>
        <Button as="a" href="#" ref={linkRef} variant="secondary" size="sm">Anchor ref target</Button>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => alert(`buttonRef.current.tagName = ${buttonRef.current?.tagName}`)}
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          Check button tagName (expect: BUTTON)
        </button>
        <button
          onClick={() => alert(`linkRef.current.tagName = ${linkRef.current?.tagName}`)}
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          Check link tagName (expect: A)
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Accessibility note:</strong> The "Navigate (link)" button renders as{' '}
        <code>&lt;a&gt;</code>. Screen readers announce it as a "link", not a "button".
        Keyboard users press Enter to follow it. This is CORRECT when the intent is navigation.
        Do NOT use <code>as="a"</code> when the action is not navigation.
      </div>
    </section>
  );
}


// ─── Exercise 3: When NOT to Use Polymorphism ─────────────────
//
// SITUATION
//   Polymorphism adds complexity. The `as` prop with full TypeScript generics
//   is genuinely hard to type correctly (notes.md covered this). Use it only
//   when you have enough variation to justify it.
//
// THIS EXERCISE IS A DESIGN DECISION EXERCISE (no code to write)
//   Read the three scenarios below and decide: polymorphic component or not?
//   Write your reasoning in the comments.
//
// SCENARIO A — <StatusBadge>
//   Renders a small colored chip with a label: "Active", "Inactive", "Pending".
//   Different statuses have different colors. The element is always a <span>.
//   → Polymorphic or not? Why?
//
// SCENARIO B — <MediaCard>
//   A card that sometimes links to an article (should be <a>),
//   sometimes is just a display card (should be <div>),
//   and sometimes navigates client-side (should be React Router <Link>).
//   → Polymorphic or not? Why?
//
// SCENARIO C — <Icon>
//   Renders an SVG icon. Always an SVG. The caller passes a `name` prop.
//   → Polymorphic or not? Why?

function StatusBadge({ status }) {
  const styles = {
    active:   { background: '#dcfce7', color: '#16a34a' },
    inactive: { background: '#f1f5f9', color: '#64748b' },
    pending:  { background: '#fef9c3', color: '#92400e' },
  };
  // Always renders as <span> — no polymorphism needed
  return (
    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500, ...styles[status] }}>
      {status}
    </span>
  );
  // REASONING (fill in): Not polymorphic because ____________
}

function MediaCard({ as: Component = 'div', children, href, to }) {
  // Polymorphic — the element type changes the semantics meaningfully
  // `as="a"` for external links, `as={Link}` for internal, `as="div"` for display
  return (
    <Component
      href={href}
      to={to}
      style={{
        display: 'block',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        cursor: href || to ? 'pointer' : 'default',
      }}
    >
      {children}
    </Component>
  );
  // REASONING (fill in): Polymorphic because ____________
}

function Exercise3() {
  return (
    <section id="exercise3">
      <h2>Exercise 3 — When NOT to Use Polymorphism</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Read each component. In the comments, explain whether it should be
        polymorphic and why. Think about: does the element type change
        meaningfully? Is there enough variation to justify the complexity?
      </p>

      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, marginBottom: 8 }}>Scenario A — StatusBadge (always span):</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusBadge status="active" />
          <StatusBadge status="inactive" />
          <StatusBadge status="pending" />
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
          Your reasoning: Is `as` needed here? What would be lost without it?
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 13, marginBottom: 8 }}>Scenario B — MediaCard (element varies):</h4>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <MediaCard as="div" style={{ maxWidth: 180 }}>
            <div style={{ padding: '8px 12px', background: '#f8fafc' }}>📄 Display card (div)</div>
          </MediaCard>
          <MediaCard as="a" href="https://react.dev" style={{ maxWidth: 180 }}>
            <div style={{ padding: '8px 12px', background: '#eff6ff' }}>🔗 Link card (a)</div>
          </MediaCard>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
          Your reasoning: Why is `as` the right choice here?
        </p>
      </div>

      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
        <strong>Rule of thumb (from notes.md):</strong>{' '}
        Use polymorphic components when you have multiple meaningful variations
        of the rendered element. If you only have one or two variations,
        just build separate components — polymorphism's complexity isn't worth it.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 11 — Polymorphic Components</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
