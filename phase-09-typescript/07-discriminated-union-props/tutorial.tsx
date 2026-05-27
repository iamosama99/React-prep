// ============================================================
// Topic:   Discriminated Union Props
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 07-discriminated-union-props
//
// APPROACH:
//   Exercise 1 — Flat props vs discriminated union: refactor an Alert (contrast)
//   Exercise 2 — The never technique: blocking props on wrong variants (build)
//   Exercise 3 — Boolean discriminants: mutually exclusive flag props (build)
//
// Core insight: TypeScript narrows the props type inside conditional branches,
// giving type-safe access to variant-specific fields without assertions.
// ============================================================

import React, { useState } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Flat props vs discriminated union: Alert component
//
// An Alert component supports four variants:
//   • success — shows a green icon, optional close button
//   • error   — shows a red icon, REQUIRES an onRetry action
//   • warning — shows a yellow icon, optional details string
//   • info    — shows a blue icon, no special props
//
// FLAT APPROACH: All props optional — callers can pass any combination.
//   TypeScript can't enforce that onRetry is required for error alerts
//   or that passing onRetry on a success alert makes no sense.
//
// DISCRIMINATED UNION APPROACH: Each variant carries exactly its own fields.
//   TypeScript enforces the contract at compile time.
//   Inside the component, after checking `variant === "error"`,
//   props.onRetry is narrowed to `() => void` (not optional).
//
// OBSERVE:
//   1. In the flat version, hover over onRetry in the 'error' branch —
//      it's (() => void) | undefined. You need `?.` even though it should be required.
//   2. In the union version, after `props.variant === 'error'`,
//      props.onRetry is () => void — required, no undefined.
//
// CHECK YOURSELF:
//   • In the flat version, what stops a caller from passing onRetry with variant="info"?
//   • After `if (props.variant === 'error')` in the union version, what is props.details?
//   • What makes a good discriminant? Why can't the discriminant be just `string`?
// ─────────────────────────────────────────────────────────────

// ── Flat — everything optional, no enforcement ────────────────────────────
type FlatAlertProps = {
  variant: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;      // optional on all variants
  onRetry?: () => void;      // should be required for 'error', but can't enforce
  details?: string;          // should be for 'warning' only, but can't enforce
};

const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const colors = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#b45309' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
};

function FlatAlert({ variant, message, onClose, onRetry, details }: FlatAlertProps) {
  const c = colors[variant];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span>{icons[variant]}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: c.text, fontSize: 14 }}>{message}</p>
        {details && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{details}</p>}
        {/* onRetry is (() => void) | undefined — need optional chaining even in 'error' */}
        {variant === 'error' && <button onClick={onRetry} style={{ marginTop: 6, padding: '3px 10px', borderRadius: 4, border: '1px solid currentColor', cursor: 'pointer', fontSize: 12, color: c.text, background: 'transparent' }}>Retry</button>}
      </div>
      {onClose && <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
    </div>
  );
}

// ── Discriminated union — each variant is a separate type ─────────────────

type BaseAlert = {
  message: string;
  onClose?: () => void;
};

type AlertProps =
  | (BaseAlert & { variant: 'success' })
  | (BaseAlert & { variant: 'error'; onRetry: () => void })  // onRetry is REQUIRED
  | (BaseAlert & { variant: 'warning'; details?: string })   // details only here
  | (BaseAlert & { variant: 'info' });

function Alert(props: AlertProps) {
  const c = colors[props.variant];

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span>{icons[props.variant]}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: c.text, fontSize: 14 }}>{props.message}</p>

        {/* TypeScript narrows here: */}
        {props.variant === 'warning' && props.details && (
          // After this check, props is { variant: 'warning'; details?: string; ... }
          // props.details is string (not undefined) — we just checked it
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{props.details}</p>
        )}
        {props.variant === 'error' && (
          // After this check, props is { variant: 'error'; onRetry: () => void; ... }
          // props.onRetry is () => void — NOT optional, no ?. needed
          <button onClick={props.onRetry} style={{ marginTop: 6, padding: '3px 10px', borderRadius: 4, border: '1px solid currentColor', cursor: 'pointer', fontSize: 12, color: c.text, background: 'transparent' }}>Retry</button>
        )}
      </div>
      {props.onClose && <button onClick={props.onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
    </div>
  );
}

function Exercise1() {
  const [visible, setVisible] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  return (
    <div>
      <p style={hint}>
        Hover over <code>onRetry</code> in the flat version's error branch — it's optional.
        Hover in the union version — it's required and TypeScript knows it.
        Also try: in the flat version, passing <code>onRetry</code> on a success alert
        compiles fine (wrong!). In the union version it errors.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={card}>
          <strong style={{ fontSize: 13, color: '#dc2626' }}>❌ Flat props (loose)</strong>
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            <FlatAlert variant="success" message="Profile saved successfully!" onClose={() => {}} />
            {/* This compiles fine but makes no semantic sense: */}
            <FlatAlert variant="success" message="Oops — onRetry on a success?" onRetry={() => alert('???')} />
            <FlatAlert variant="error" message="Network error" onRetry={() => setRetryCount(c => c + 1)} />
            {retryCount > 0 && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Retried {retryCount}x</p>}
          </div>
        </div>

        <div style={card}>
          <strong style={{ fontSize: 13, color: '#16a34a' }}>✅ Discriminated union (strict)</strong>
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            {visible && <Alert variant="success" message="Profile saved!" onClose={() => setVisible(false)} />}
            {/* TypeScript error — onRetry not valid on success:
            <Alert variant="success" message="..." onRetry={() => {}} /> */}
            <Alert variant="error" message="Network error — please retry" onRetry={() => setRetryCount(c => c + 1)} />
            <Alert variant="warning" message="Session expires soon" details="You will be logged out in 5 minutes" />
            <Alert variant="info" message="New features available in v2.0" />
            {/* TypeScript error — onRetry not valid on info:
            <Alert variant="info" message="..." onRetry={() => {}} /> */}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — The never technique
//
// A MediaCard that accepts EITHER a video OR an image — not both.
//   • Image: requires src + alt, no videoUrl
//   • Video: requires videoUrl, no src or alt
//
// `prop?: never` explicitly blocks a prop on a variant.
// Without it, object spread could bypass the missing-key check.
//
// Example: if you omit `videoUrl?: never` from ImageVariant,
//   you could spread an object that has videoUrl and TypeScript misses it.
// With `never`, even spreads are caught.
//
// CHECK YOURSELF:
//   • What is the `never` type? Why can no value satisfy it?
//   • Without `videoUrl?: never`, could an image card accidentally get a videoUrl?
//   • Try spreading: const videoProps = { videoUrl: '...' }; <MediaCard type="image" {...videoProps} />
//     What happens with and without the never fields?
// ─────────────────────────────────────────────────────────────

type MediaBase = {
  title: string;
  caption?: string;
};

type ImageCard = MediaBase & {
  type: 'image';
  src: string;
  alt: string;
  videoUrl?: never;   // explicitly blocked — no value (not even undefined) is valid
};

type VideoCard = MediaBase & {
  type: 'video';
  videoUrl: string;
  src?: never;        // blocked on video
  alt?: never;        // blocked on video
};

type MediaCardProps = ImageCard | VideoCard;

function MediaCard(props: MediaCardProps) {
  return (
    <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
      {props.type === 'image' ? (
        // props is narrowed to ImageCard — src and alt are string (not optional)
        <div style={{ width: '100%', height: 120, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
          🖼️
        </div>
      ) : (
        // props is narrowed to VideoCard — videoUrl is string
        <div style={{ width: '100%', height: 120, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
          ▶️
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        <strong style={{ fontSize: 14 }}>{props.title}</strong>
        {props.type === 'image' && (
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>alt: "{props.alt}"</p>
        )}
        {props.type === 'video' && (
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>src: {props.videoUrl}</p>
        )}
        {props.caption && <p style={{ fontSize: 12, color: '#374151', margin: '4px 0 0' }}>{props.caption}</p>}
      </div>
    </div>
  );
}

function Exercise2() {
  return (
    <div>
      <p style={hint}>
        <code>videoUrl?: never</code> on the image variant and <code>src?: never</code> on the
        video variant prevent callers from mixing the wrong props. Try adding both to a single usage.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MediaCard
          type="image"
          src="/photos/hero.jpg"
          alt="Product hero image"
          title="Product Shot"
          caption="2024 lineup"
        />
        {/* TypeScript error:
        <MediaCard type="image" src="..." alt="..." videoUrl="..." /> */}

        <MediaCard
          type="video"
          videoUrl="https://example.com/demo.mp4"
          title="Product Demo"
          caption="3 min overview"
        />
        {/* TypeScript error:
        <MediaCard type="video" videoUrl="..." src="..." alt="..." /> */}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Boolean discriminants: mutually exclusive flags
//
// Sometimes the variants aren't string-discriminated but flag-based.
// A Tooltip that can be:
//   • Controlled: caller manages open state — requires open + onOpenChange
//   • Uncontrolled: component manages its own state — optional defaultOpen
//
// The discriminant here is a boolean (`controlled: true | false`).
// The union prevents callers from passing controlled-only props in
// uncontrolled mode, and vice versa.
//
// CHECK YOURSELF:
//   • After `if (props.controlled)`, what is the type of props.onOpenChange?
//   • Can a caller pass `open={true}` without also passing `controlled: true`?
//   • What's the type of `props.open` before any narrowing?
// ─────────────────────────────────────────────────────────────

type TooltipProps = (
  | { controlled: true; open: boolean; onOpenChange: (open: boolean) => void }
  | { controlled?: false; defaultOpen?: boolean }
) & {
  content: string;
  children: React.ReactNode;
};

function Tooltip(props: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(props.controlled ? false : (props.defaultOpen ?? false));

  const isOpen = props.controlled
    ? props.open                 // controlled: props.open is boolean (required)
    : uncontrolledOpen;

  const toggle = () => {
    if (props.controlled) {
      props.onOpenChange(!props.open);  // onOpenChange is () => void (required)
    } else {
      setUncontrolledOpen(v => !v);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onClick={toggle}
        style={{ cursor: 'pointer', borderBottom: '2px dashed #818cf8', paddingBottom: 1 }}
      >
        {props.children}
      </span>
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', padding: '6px 10px', borderRadius: 6,
          fontSize: 12, whiteSpace: 'nowrap', marginBottom: 6, zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {props.content}
          <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>
            ({props.controlled ? 'controlled' : 'uncontrolled'})
          </span>
        </div>
      )}
    </div>
  );
}

function Exercise3() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p style={hint}>
        Click each tooltip. The uncontrolled version manages its own state.
        The controlled version is driven by parent state — the parent owns <code>open</code>.
        TypeScript prevents mixing props between modes.
      </p>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '20px 0' }}>
        {/* Uncontrolled — no open prop allowed */}
        <Tooltip content="I manage my own state" defaultOpen={false}>
          Uncontrolled tooltip
        </Tooltip>

        {/* Controlled — requires both open and onOpenChange */}
        <Tooltip controlled={true} open={open} onOpenChange={setOpen} content="Parent controls me">
          Controlled tooltip
        </Tooltip>

        {/* TypeScript errors:
        <Tooltip controlled={true} content="...">No open/onOpenChange</Tooltip>
        <Tooltip open={true} content="...">Missing controlled: true</Tooltip>
        <Tooltip controlled={false} open={true} content="...">open not in uncontrolled variant</Tooltip>
        */}
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
        Controlled tooltip is: <strong>{open ? 'open' : 'closed'}</strong>
        {' '}(parent state = {String(open)})
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Discriminated Union Props
      </h1>

      <h2>Exercise 1 — Flat vs discriminated: Alert variants</h2>
      <Exercise1 />

      <h2>Exercise 2 — The <code>never</code> technique: MediaCard</h2>
      <Exercise2 />

      <h2>Exercise 3 — Boolean discriminants: Tooltip modes</h2>
      <Exercise3 />
    </div>
  );
}
