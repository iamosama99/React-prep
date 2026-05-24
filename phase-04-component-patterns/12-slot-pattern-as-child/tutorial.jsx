// ============================================================
// Topic:   Slot Pattern / asChild
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { Children, isValidElement, cloneElement, forwardRef, useRef, useState } from 'react';

// ─── Exercise 1: Naive Slot — Spot the Bug ───────────────────
//
// SITUATION
//   A Slot component merges its props onto its single child element.
//   The simplest implementation uses cloneElement with a spread.
//   But naive prop merging has a critical bug with event handlers —
//   one handler silently overwrites the other.
//
// PART A — Implement NaiveSlot (the buggy version):
//   function NaiveSlot({ children, ...slotProps }) {
//     if (!isValidElement(children)) return null;
//     return cloneElement(children, { ...children.props, ...slotProps });
//   }
//
//   This looks correct — it merges slotProps onto the child.
//   But what happens when both slotProps and children.props have an onClick?
//   The spread means slotProps.onClick silently overwrites children.props.onClick.
//
// PART B — Observe the bug:
//   The demo below has both a parent onClick (from the Slot) and a child onClick
//   (on the <button>). With NaiveSlot, only ONE fires.
//   The console shows you which one was lost.
//
// PART C — Identify the fix needed:
//   Don't implement the fix yet (that's Exercise 2). Just write a comment
//   explaining WHY naive spreading doesn't work for event handlers, and what
//   the correct behavior should be.

function NaiveSlot({ children, ...slotProps }) {
  // TODO: implement the naive version (intentionally buggy for event handlers)
  // if (!isValidElement(children)) return null;
  // return cloneElement(children, { ...children.props, ...slotProps });
  return children; // stub — replace with cloneElement
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Naive Slot: Spot the Event Handler Bug</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Both the Slot and the child button have <code>onClick</code> handlers.
        Open the console. With the naive implementation, one handler is silently
        dropped. Which one? Why? (Answer in a comment in your code.)
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ fontSize: 13, marginTop: 0 }}>No Slot (both handlers work)</h4>
          <button
            onClick={() => console.log('🔵 CHILD clicked (no slot)')}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Direct button (check console)
          </button>
        </div>

        <div>
          <h4 style={{ fontSize: 13, marginTop: 0 }}>With NaiveSlot (one handler lost)</h4>
          <NaiveSlot onClick={() => console.log('🔴 SLOT onClick fired')}>
            <button
              onClick={() => console.log('🟢 CHILD onClick fired')}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Slotted button (check console — which fires?)
            </button>
          </NaiveSlot>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            After implementing NaiveSlot: click and check which console.log fires.
            {/* Your answer: The ___ handler is lost because ___ */}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>The bug:</strong> <code>{`{ ...children.props, ...slotProps }`}</code> means
        slotProps.onClick overwrites children.props.onClick. The child's handler is lost.
        The fix (Exercise 2): chain both handlers — call child's first, then slot's.
      </div>
    </section>
  );
}


// ─── Exercise 2: Correct Slot with mergeProps ─────────────────
//
// SITUATION
//   Now you'll build the correct Slot implementation.
//   The key insight: event handlers (props starting with "on") must be CHAINED,
//   not overwritten. Both handlers should run — child's fires first (so the child
//   can call event.preventDefault() before the slot's logic runs).
//
// YOUR TASK — Implement mergeProps(slotProps, childProps):
//   Rules:
//   1. For most props: slotProps wins (it's the component's own behavior)
//   2. For event handlers (key starts with "on" and both values are functions):
//      chain them: childHandler fires first, slotHandler fires second
//   3. For className: concatenate both (slotProps.className + ' ' + childProps.className)
//   4. style: spread both ({ ...childProps.style, ...slotProps.style })
//             slotProps.style wins for conflicting properties
//
// Then build Slot using mergeProps:
//   function Slot({ children, ...slotProps }) {
//     if (!isValidElement(children)) return null;
//     return cloneElement(children, mergeProps(slotProps, children.props));
//   }
//
// VERIFY:
//   Both handlers fire. Child's fires first (check console timestamps).
//   ClassNames are concatenated (not overwritten).

function mergeProps(slotProps, childProps) {
  // Start: childProps as base, slotProps override most things
  const merged = { ...childProps, ...slotProps };

  // TODO: chain event handlers
  // for (const key in childProps) {
  //   if (
  //     key.startsWith('on') &&
  //     typeof slotProps[key] === 'function' &&
  //     typeof childProps[key] === 'function'
  //   ) {
  //     merged[key] = (...args) => {
  //       childProps[key](...args);  // child fires first
  //       slotProps[key](...args);   // slot fires second
  //     };
  //   }
  // }

  // TODO: merge className
  // if (slotProps.className || childProps.className) {
  //   merged.className = [childProps.className, slotProps.className].filter(Boolean).join(' ');
  // }

  // TODO: merge style
  // if (slotProps.style || childProps.style) {
  //   merged.style = { ...childProps.style, ...slotProps.style };
  // }

  return merged;
}

// Also merge refs (both parent and child may need the DOM node)
function mergeRefs(...refs) {
  return (node) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    });
  };
}

const Slot = forwardRef(function Slot({ children, ...slotProps }, ref) {
  if (!isValidElement(children)) {
    console.error('Slot requires exactly one React element child');
    return null;
  }

  // Merge refs too (both the Slot's forwarded ref and the child's own ref)
  const mergedRef = mergeRefs(ref, children.props.ref);

  return cloneElement(children, {
    ...mergeProps(slotProps, children.props),
    ref: mergedRef,
  });
});

function Exercise2() {
  const slotRef = useRef(null);

  return (
    <section>
      <h2>Exercise 2 — Correct Slot with mergeProps</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Implement <code>mergeProps</code> above. After doing so, both handlers
        should fire (check console). The child's className and style should also
        be preserved and merged.
      </p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ fontSize: 13, marginTop: 0 }}>Event handler chaining</h4>
          <Slot
            onClick={() => console.log('🔴 SLOT onClick (fires second)')}
            className="slot-class"
            style={{ outline: '2px dashed #3b82f6', outlineOffset: 2 }}
          >
            <button
              onClick={(e) => {
                console.log('🟢 CHILD onClick (fires first)');
                // Note: calling e.preventDefault() here would stop the slot's handler
              }}
              className="child-class"
              style={{ padding: '8px 16px', cursor: 'pointer', background: '#f0fdf4' }}
            >
              Click me — both handlers should fire
            </button>
          </Slot>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Console should show: 🟢 child first, then 🔴 slot
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 13, marginTop: 0 }}>Ref merging</h4>
          <Slot ref={slotRef}>
            <button style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Ref target
            </button>
          </Slot>
          <button
            onClick={() => {
              console.log('slotRef.current:', slotRef.current);
              alert(`slotRef.current.tagName = ${slotRef.current?.tagName}`);
            }}
            style={{ marginTop: 8, display: 'block', fontSize: 12 }}
          >
            Check ref (expect: BUTTON)
          </button>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 3: Button with asChild ─────────────────────────
//
// SITUATION
//   Now you'll wire up the full asChild pattern — just like shadcn/ui's Button.
//   The Button component renders a <button> by default. When asChild={true},
//   it renders a Slot instead — merging its styles and handlers onto whatever
//   element the caller passes as a child.
//
// YOUR TASK — Build Button with asChild support:
//
//   function Button({ asChild = false, variant, size, onClick, children, ...props }) {
//     const Component = asChild ? Slot : 'button';
//     return (
//       <Component className={`btn btn--${variant}`} onClick={onClick} {...props}>
//         {children}
//       </Component>
//     );
//   }
//
//   When asChild=false: renders <button class="btn btn--primary" onClick={...}>
//   When asChild=true:  Slot merges className + onClick onto the child element
//
// VERIFY all three usages below work correctly after implementation.
//
// KEY INSIGHT: The Button component's code doesn't change between the two modes.
//   It just changes `Component`. The Slot handles the merging transparently.
//   This is why asChild is elegant — it doesn't add complexity to the component itself.

const VARIANT_STYLES_EX3 = {
  primary:   { background: '#3b82f6', color: 'white',   border: 'none', borderRadius: 6, cursor: 'pointer' },
  secondary: { background: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' },
  danger:    { background: '#dc2626', color: 'white',   border: 'none', borderRadius: 6, cursor: 'pointer' },
};

function ButtonEx3({ asChild = false, variant = 'primary', children, style: extraStyle, ...props }) {
  const Component = asChild ? Slot : 'button';

  const buttonStyle = {
    padding: '8px 16px',
    fontSize: 14,
    fontFamily: 'inherit',
    ...VARIANT_STYLES_EX3[variant],
    ...extraStyle,
  };

  // TODO: render <Component style={buttonStyle} {...props}>{children}</Component>
  return (
    <Component style={buttonStyle} {...props}>
      {children}
    </Component>
  );
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Button with asChild</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        Three usages: default button, navigation link (asChild), and external link (asChild).
        In the DOM: first renders a &lt;button&gt;, second and third render the child element type.
        Click each and inspect the DOM node type.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
        {/* Default — renders <button> */}
        <ButtonEx3 variant="primary" onClick={() => alert('Action!')}>
          Save document
        </ButtonEx3>

        {/* asChild + <a> — button styles on a link */}
        <ButtonEx3 asChild variant="secondary">
          <a href="#exercise1" onClick={() => console.log('Link navigating')}>
            Go to Exercise 1 ↑
          </a>
        </ButtonEx3>

        {/* asChild + <a> external link with danger styles */}
        <ButtonEx3 asChild variant="danger">
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            react.dev ↗
          </a>
        </ButtonEx3>
      </div>

      <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
        <strong>What to verify:</strong>
        <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
          <li>Inspect DOM: first button is a <code>&lt;button&gt;</code>, second two are <code>&lt;a&gt;</code></li>
          <li>All have the correct background/color styles (merged from ButtonEx3)</li>
          <li>The <code>onClick</code> on the second one fires (handler chaining)</li>
          <li>TypeScript note: the <code>href</code> is typed correctly because you write{' '}
              <code>&lt;a href=...&gt;</code> — TypeScript checks it there, not through generics</li>
        </ul>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#eff6ff', borderRadius: 6, fontSize: 13 }}>
        <strong>vs the `as` approach:</strong> With <code>as="a"</code>, you'd write{' '}
        <code>{'<ButtonEx3 as="a" href="...">text</ButtonEx3>'}</code> and need generics to
        type <code>href</code>. With <code>asChild</code>, you write{' '}
        <code>{'<ButtonEx3 asChild><a href="...">text</a></ButtonEx3>'}</code> — TypeScript
        already knows <code>&lt;a&gt;</code>'s props. No generics needed.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 12 — Slot Pattern / asChild</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
