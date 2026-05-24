// ============================================================
// Topic:   React.Children Utilities
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { Children, isValidElement, cloneElement, useState } from 'react';

// ─── Exercise 1: Children.toArray + Children.count ───────────
//
// SITUATION
//   You're building two components:
//     <LimitedList max={3}> — shows first N children, hides the rest behind
//       an expandable "+N more" button
//     <Stepper> — a wizard-style component that shows N steps with a dot
//       indicator (the component needs to know how many steps there are)
//
//   Both need to work safely with any type of children (single, multiple,
//   null, fragments) — using .map() directly on children would crash.
//
// YOUR TASK
//
//   BUILD <LimitedList max={3}>
//     - Use React.Children.toArray(children) to safely get an array
//     - Render only the first `max` items by default
//     - Show a button: "+ N more" if there are more items than max
//     - Clicking it expands to show all
//
//   BUILD <Stepper>
//     - Use React.Children.count(children) to get the total step count
//     - Render step dots at the top (• for inactive, filled circle for active)
//     - Track current step index with useState
//     - Show Previous / Next buttons to navigate
//     - Only render the current step's child content
//
// NOTICE: React.Children.toArray auto-adds keys. React.Children.count handles
//   null/undefined/string/single-element without crashing.

function LimitedList({ children, max = 3 }) {
  const [expanded, setExpanded] = useState(false);

  // TODO: const all = Children.toArray(children);
  //       const visible = expanded ? all : all.slice(0, max);
  //       const hiddenCount = all.length - max;

  return (
    <div>
      <p style={{ fontSize: 13, color: '#64748b' }}>LimitedList stub — implement me</p>
      {children}
    </div>
  );
}

function Stepper({ children }) {
  const [step, setStep] = useState(0);

  // TODO: const count = Children.count(children);
  //       const all = Children.toArray(children);
  //       Render: dots row + all[step] + Prev/Next buttons

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      <p style={{ fontSize: 13, color: '#64748b' }}>Stepper stub — implement me</p>
      {children}
    </div>
  );
}

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Children.toArray + Children.count</h2>

      <h4 style={{ marginBottom: 8 }}>LimitedList (max=3):</h4>
      <LimitedList max={3}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>🐶 Dogs</div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>🐱 Cats</div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>🐦 Birds</div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>🐠 Fish</div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>🐇 Rabbits</div>
        <div style={{ padding: '8px 12px' }}>🦎 Reptiles</div>
      </LimitedList>

      <h4 style={{ marginTop: 24, marginBottom: 8 }}>Stepper:</h4>
      <Stepper>
        <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px' }}>Step 1: Account Info</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Enter your name and email.</p>
        </div>
        <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px' }}>Step 2: Preferences</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Choose your notification settings.</p>
        </div>
        <div style={{ padding: 16, background: '#fef9c3', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px' }}>Step 3: Confirm</h3>
          <p style={{ margin: 0, fontSize: 14 }}>Review your choices and submit.</p>
        </div>
      </Stepper>
    </section>
  );
}


// ─── Exercise 2: The Depth Limitation of cloneElement ────────
//
// SITUATION
//   The broken <RadioGroup> below uses the legacy React.Children.map +
//   cloneElement pattern to inject `checked` and `onChange` into each RadioOption.
//   It works when RadioOption is a direct child — but breaks the moment a caller
//   wraps items in a <div> or <React.Fragment>.
//
// YOUR TASK
//   1. Read through RadioGroupBroken — understand how it injects props.
//   2. Run the "Wrapped" usage and observe: the RadioOptions don't respond.
//      That's because cloneElement targets the <div>, not the RadioOption inside.
//   3. Write RadioGroupFixed using Context instead:
//      - Create RadioGroupContext (createContext(null))
//      - RadioGroupFixed provides { selected, setSelected } via Context
//      - RadioOptionFixed reads from context directly (no injected props needed)
//   4. Verify that wrapping RadioOptionFixed in a <div> still works.
//
// THIS IS THE CORE ARGUMENT for why Context replaced cloneElement:
//   Context doesn't care about DOM depth — it works at any level.

const RadioGroupContext = createContext(null);

// Import createContext (not imported above — fix the import):
import { createContext, useContext } from 'react';

// ── Broken: cloneElement approach (read-only) ────────────────
function RadioOptionBroken({ value, label, checked, onChange }) {
  // These props are injected by cloneElement — only works if direct child
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer' }}>
      <input
        type="radio"
        checked={checked ?? false}
        onChange={() => onChange?.(value)}
      />
      {label}
    </label>
  );
}

function RadioGroupBroken({ children, value: selected, onChange }) {
  return (
    <div role="radiogroup" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      {Children.map(children, child => {
        if (!isValidElement(child)) return child;
        // cloneElement injects props — but only into direct children
        return cloneElement(child, {
          checked: child.props.value === selected,
          onChange,
        });
      })}
    </div>
  );
}

// ── Fixed: Context approach (your implementation) ────────────
function RadioOptionFixed({ value, label }) {
  // TODO: read selected + setSelected from RadioGroupContext
  // const { selected, setSelected } = useContext(RadioGroupContext);
  // const checked = selected === value;
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer' }}>
      <input type="radio" checked={false} onChange={() => {}} />
      {label} <span style={{ fontSize: 11, color: '#94a3b8' }}>(stub)</span>
    </label>
  );
}

function RadioGroupFixed({ children, defaultValue = null }) {
  const [selected, setSelected] = useState(defaultValue);
  // TODO: provide { selected, setSelected } via RadioGroupContext.Provider
  return (
    <div role="radiogroup" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
      {children}
    </div>
  );
}

function Exercise2() {
  const [directValue, setDirectValue] = useState('a');
  const [wrappedValue, setWrappedValue] = useState('a');

  return (
    <section>
      <h2>Exercise 2 — cloneElement Depth Limitation</h2>
      <p style={{ fontSize: 13, color: '#64748b', maxWidth: 600 }}>
        The "Wrapped" column puts options inside a div. cloneElement injects into
        the div — the RadioOptions never receive the props. Context ignores depth.
      </p>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Direct children — cloneElement works here */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>Broken (cloneElement) — Direct children</h4>
          <RadioGroupBroken value={directValue} onChange={setDirectValue}>
            <RadioOptionBroken value="a" label="Option A" />
            <RadioOptionBroken value="b" label="Option B" />
            <RadioOptionBroken value="c" label="Option C" />
          </RadioGroupBroken>
          <p style={{ fontSize: 12, color: '#16a34a' }}>✅ Works — direct children</p>
        </div>

        {/* Wrapped in a div — cloneElement breaks here */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: 13, color: '#dc2626', marginTop: 0 }}>Broken (cloneElement) — Wrapped in div</h4>
          <RadioGroupBroken value={wrappedValue} onChange={setWrappedValue}>
            <div> {/* caller added a wrapper */}
              <RadioOptionBroken value="a" label="Option A" />
              <RadioOptionBroken value="b" label="Option B" />
            </div>
            <RadioOptionBroken value="c" label="Option C (direct)" />
          </RadioGroupBroken>
          <p style={{ fontSize: 12, color: '#dc2626' }}>❌ Fails — props injected into div, not RadioOption</p>
        </div>

        {/* Fixed with Context — works at any depth */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: 13, color: '#16a34a', marginTop: 0 }}>Fixed (Context) — Wrapped in div</h4>
          <RadioGroupFixed defaultValue="a">
            <div> {/* same wrapper — Context still works */}
              <RadioOptionFixed value="a" label="Option A" />
              <RadioOptionFixed value="b" label="Option B" />
            </div>
            <RadioOptionFixed value="c" label="Option C (direct)" />
          </RadioGroupFixed>
          <p style={{ fontSize: 12, color: '#16a34a' }}>✅ Works at any depth</p>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 3: Children.only + cloneElement for Tooltip ────
//
// SITUATION
//   You're building a <Tooltip> component. It wraps exactly one child element
//   and adds tooltip behavior to it — specifically, it:
//     1. Clones the child and injects aria-describedby + onMouseEnter/onMouseLeave
//     2. Uses React.Children.only to throw a helpful error if more than one
//        child is passed (Tooltip semantically requires exactly one target)
//
//   This is one of the LEGITIMATE current uses of React.Children.only:
//   enforcing a single-child constraint with a useful error message.
//
// YOUR TASK — Build <Tooltip content="…">
//   - Children.only(children) to assert exactly one child
//   - isValidElement(child) guard before cloneElement
//   - Inject { 'aria-describedby': tooltipId, onMouseEnter, onMouseLeave }
//   - Show/hide the tooltip box based on hover state
//   - Position the tooltip above the child element (simple absolute positioning)
//
// BONUS: Try passing two children to <Tooltip> — Children.only should throw.
//   Wrap it in an ErrorBoundary if you want to see the error without crashing.

function Tooltip({ content, children }) {
  const [visible, setVisible] = useState(false);
  const tooltipId = 'tooltip-1'; // simplified — in production generate unique IDs

  // Step 1: Assert exactly one child
  // const child = Children.only(children); // throws if not exactly one

  // Step 2: Guard and clone
  // if (!isValidElement(child)) return child;
  // const cloned = cloneElement(child, {
  //   'aria-describedby': visible ? tooltipId : undefined,
  //   onMouseEnter: () => setVisible(true),
  //   onMouseLeave: () => setVisible(false),
  // });

  // TODO: render the cloned child + the tooltip box (position: relative wrapper)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children} {/* replace with cloned */}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: 'white',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'nowrap',
            marginBottom: 4,
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Children.only + cloneElement for Tooltip</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Hover over the buttons. The tooltip should appear above each one.
        The child receives its aria-describedby injected — no prop drilling needed on the caller's side.
      </p>

      <div style={{ display: 'flex', gap: 24, paddingTop: 32, flexWrap: 'wrap' }}>
        <Tooltip content="Creates a new workspace">
          <button style={{ padding: '8px 16px' }}>New workspace</button>
        </Tooltip>

        <Tooltip content="Download a CSV of all your data">
          <button style={{ padding: '8px 16px' }}>Export data</button>
        </Tooltip>

        <Tooltip content="Permanently delete — cannot be undone">
          <button style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6 }}>
            Delete account
          </button>
        </Tooltip>
      </div>

      <div style={{ marginTop: 32, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Try this:</strong> Pass two children to a Tooltip —
        <code>{` <Tooltip><button>A</button><button>B</button></Tooltip>`}</code>
        It should throw: "React.Children.only expected to receive a single React element child."
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>Phase 4 · 08 — React.Children Utilities</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
