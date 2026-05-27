// ============================================================
// Topic:   Typing Function Components
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 01-typing-function-components
//
// APPROACH:
//   Exercise 1 — FC vs plain typed function (contrast-and-run)
//   Exercise 2 — Wrapping a native HTML element (build)
//   Exercise 3 — forwardRef with proper type params (build)
//
// Run each exercise, then read the CHECK YOURSELF questions.
// ============================================================

import React, { useState, useRef, forwardRef } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '1rem', marginBottom: '0.5rem', background: '#fff',
};
const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 };
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13,
  marginBottom: 8, color: '#1e40af',
};
const err: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13,
  color: '#dc2626',
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — React.FC vs plain typed function
//
// The two components below are identical at runtime.
// In TypeScript, they behave very differently.
//
// OBSERVE:
//   1. FCCard is typed with React.FC — try passing children to it below.
//      TypeScript allows it silently even though the component ignores children.
//   2. PlainCard is typed the correct way — children are not in its Props type.
//      TypeScript errors if you try to pass children. The contract is honest.
//
// CHECK YOURSELF (before reading the note below):
//   • Why does React.FC accept children even though FCCard never renders them?
//   • FCCard returns a string from a branch — why does React.FC reject that?
//   • What two issues does React.FC have that plain typed functions don't?
// ─────────────────────────────────────────────────────────────

// ❌ React.FC version — two problems hidden inside this signature:
//    1. Implicit children (they're silently accepted even though unused)
//    2. Return type is ReactElement | null — can't return strings or arrays
const FCCard: React.FC<{ title: string }> = ({ title }) => {
  // Uncomment this line — React.FC blocks it:
  // if (!title) return 'No title provided';  // TS error: string not assignable to ReactElement | null
  return (
    <div style={card}>
      <strong>[React.FC]</strong> {title}
    </div>
  );
};

// ✅ Plain typed function — explicit contract, no hidden lies
type PlainCardProps = {
  title: string;
  // No children field → passing children is a compile error
};

function PlainCard({ title }: PlainCardProps): React.ReactNode {
  // This is fine — ReactNode includes strings, arrays, null, undefined
  if (!title) return 'No title provided';
  return (
    <div style={card}>
      <strong>[Plain function]</strong> {title}
    </div>
  );
}

// ─── A component that DOES accept children — type it explicitly ───
type SectionProps = {
  heading: string;
  children: React.ReactNode; // Explicit — clear contract
};

function Section({ heading, children }: SectionProps) {
  return (
    <div style={{ ...card, borderColor: '#c7d2fe' }}>
      <h4 style={{ margin: '0 0 8px' }}>{heading}</h4>
      {children}
    </div>
  );
}

function Exercise1() {
  return (
    <div>
      <p style={hint}>
        <strong>Notice:</strong> Hover over each component below in VS Code.
        FCCard shows <code>React.FC&lt;…&gt;</code> — its return type is narrow
        and it hides implicit children. PlainCard's signature is honest.
      </p>

      <FCCard title="FC component" />
      {/*
        Try uncommenting this — TypeScript allows it on FCCard (the type lie):
        <FCCard title="FC with children">Surprise children!</FCCard>

        Now try it on PlainCard — TypeScript correctly errors:
        <PlainCard title="Plain with children">This is a type error</PlainCard>
      */}

      <PlainCard title="Plain typed function" />

      <Section heading="Section uses explicit children">
        <p style={{ margin: 0 }}>Children are explicit in the props type — no surprise.</p>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Wrapping a native HTML element
//
// Build a `Button` component that:
//   • Accepts all valid <button> HTML attributes (onClick, type, disabled, aria-*, …)
//   • Adds two custom props: loading (boolean) and variant ("primary" | "danger" | "ghost")
//   • When loading is true, shows a spinner and disables the button
//
// The trick: extend React.ButtonHTMLAttributes<HTMLButtonElement>
// so callers get full native button type safety for free.
//
// TODO:
//   □ Fill in the ButtonProps type (intersection of HTMLAttributes + custom props)
//   □ Implement the component — spread ...rest onto the <button>
//   □ Try passing an invalid prop to <Button> — TypeScript should error
//
// CHECK YOURSELF:
//   • What type gives you all valid <button> attributes automatically?
//   • Why do you spread ...rest instead of listing every native prop manually?
//   • What would the type of `disabled` be if you didn't include it in ButtonProps?
// ─────────────────────────────────────────────────────────────

// TODO: replace this with a proper intersection type
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
};

function Button({
  loading = false,
  variant = 'primary',
  children,
  disabled,
  ...rest          // ← all valid <button> attributes pass through here
}: ButtonProps): React.ReactElement {
  const colors: Record<string, React.CSSProperties> = {
    primary: { background: '#3b82f6', color: '#fff' },
    danger:  { background: '#ef4444', color: '#fff' },
    ghost:   { background: 'transparent', color: '#374151', border: '1px solid #d1d5db' },
  };

  return (
    <button
      {...rest}                           // passes onClick, type, aria-*, data-*, etc.
      disabled={loading || disabled}
      style={{
        padding: '6px 16px', borderRadius: 6, border: 'none',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...colors[variant],
      }}
    >
      {loading ? '⏳ Loading…' : children}
    </button>
  );
}

function Exercise2() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    alert('Done!');
  };

  return (
    <div>
      <p style={hint}>
        These buttons pass all native <code>&lt;button&gt;</code> attributes through
        to the DOM. Try Cmd+click on <code>ButtonProps</code> to see what you get
        for free from <code>React.ButtonHTMLAttributes</code>.
      </p>

      <div style={row}>
        <Button onClick={handleSubmit} loading={loading} variant="primary">
          Submit (click to see loading)
        </Button>
        <Button variant="danger" onClick={() => alert('Danger!')}>
          Danger action
        </Button>
        <Button variant="ghost" disabled>
          Disabled ghost
        </Button>
        {/* TypeScript errors — href is not a valid button attribute: */}
        {/* <Button href="/home">Link button</Button> */}
      </div>

      <p style={{ fontSize: 13, marginTop: 8, color: '#6b7280' }}>
        <code>type</code>, <code>form</code>, <code>aria-label</code>,
        <code>data-testid</code> — all work. Hover over the Button calls to confirm.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — forwardRef with correct type parameter order
//
// Build a `TextInput` component that forwards its ref to the inner <input>.
// A parent can then call `inputRef.current.focus()` to programmatically focus it.
//
// The type signature is:
//   React.forwardRef<RefType, PropsType>((props, ref) => ...)
//                    ^^^^^^^^  ^^^^^^^^^
//                    Ref first, Props second — easy to reverse accidentally
//
// TODO:
//   □ Define InputProps (label, placeholder, value, onChange)
//   □ Wrap the component in forwardRef<HTMLInputElement, InputProps>
//   □ In the parent (Exercise3), create a ref and call .focus() on click
//
// CHECK YOURSELF:
//   • What happens at the call site if you accidentally reverse the type params?
//   • Why do we set displayName on the forwarded component?
//   • When would a parent need to forward a ref like this vs. just using state?
// ─────────────────────────────────────────────────────────────

type InputProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

// forwardRef<RefType, PropsType> — ref type comes FIRST
const TextInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, placeholder, value, onChange }, ref) => (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        {label}
      </span>
      <input
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%', boxSizing: 'border-box' }}
      />
    </label>
  )
);

TextInput.displayName = 'TextInput'; // Shows in React DevTools and error stacks

function Exercise3() {
  const [text, setText] = useState('');
  // The ref type must match the RefType in forwardRef<HTMLInputElement, …>
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p style={hint}>
        The "Focus input" button calls <code>inputRef.current?.focus()</code> —
        this only works because TextInput uses <code>forwardRef</code> and exposes
        the inner <code>&lt;input&gt;</code> element.
      </p>

      <TextInput
        ref={inputRef}
        label="Message"
        placeholder="Type something…"
        value={text}
        onChange={setText}
      />

      <div style={row}>
        <button
          onClick={() => inputRef.current?.focus()}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}
        >
          Focus input
        </button>
        <button
          onClick={() => inputRef.current?.select()}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer' }}
        >
          Select all text
        </button>
      </div>

      {text && (
        <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
          You typed: <em>{text}</em>
        </p>
      )}

      <div style={{ ...err, marginTop: 12 }}>
        <strong>What would break with reversed type params?</strong><br />
        <code>forwardRef&lt;InputProps, HTMLInputElement&gt;</code> would compile but
        the <code>ref</code> parameter would be typed as <code>ForwardedRef&lt;InputProps&gt;</code>
        — you could still pass it to <code>ref=&#123;…&#125;</code>, but TypeScript would
        report the wrong type on <code>inputRef.current</code> at the call site.
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Typing Function Components
      </h1>

      <h2>Exercise 1 — FC vs plain typed function</h2>
      <Exercise1 />

      <h2>Exercise 2 — Wrapping a native HTML element</h2>
      <Exercise2 />

      <h2>Exercise 3 — forwardRef with correct type params</h2>
      <Exercise3 />
    </div>
  );
}
