// ============================================================
// Topic:   Compound Components
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Each exercise builds on the previous one.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState, useContext, createContext, useCallback } from 'react';

// ─── Exercise 1: Build an Accordion with Context ─────────────
//
// SITUATION
//   You need an Accordion. The config-props approach would look like:
//     <Accordion items={[{ title: 'Q1', content: '...' }]} />
//   This fails the moment a caller wants to: put an icon next to a title,
//   render a badge showing new content, or rearrange the items. You'd need
//   a new prop for each customization. Compound components give callers
//   full control over structure while the parent manages the open/closed state.
//
// BUILD THIS API:
//   <Accordion defaultOpen="q1">
//     <Accordion.Item value="q1">
//       <Accordion.Trigger>What is composition?</Accordion.Trigger>
//       <Accordion.Panel>Building UI by combining components via props/children.</Accordion.Panel>
//     </Accordion.Item>
//     <Accordion.Item value="q2">
//       <Accordion.Trigger>Why avoid inheritance?</Accordion.Trigger>
//       <Accordion.Panel>It creates tight coupling and conflates UI structure.</Accordion.Panel>
//     </Accordion.Item>
//   </Accordion>
//
// ARCHITECTURE (follow this order):
//   1. Create AccordionContext (createContext(null)) — keep it private, don't export
//   2. Create a guard hook: useAccordionContext() — throws if ctx is null
//   3. Accordion (root) — holds openItem state, wraps children in Provider
//   4. Accordion.Item  — provides each item's `value` via a second context (ItemContext)
//   5. Accordion.Trigger — reads both contexts; on click, toggles the item
//   6. Accordion.Panel  — renders children only when its value matches openItem
//
// NOTES
//   - Only one item open at a time (clicking an open item closes it)
//   - Trigger should show ▶ when closed, ▼ when open
//   - Use dot notation: Accordion.Item = ..., Accordion.Trigger = ..., etc.

// Private contexts — do NOT export these
const AccordionContext = createContext(null);
const AccordionItemContext = createContext(null);

// TODO: write the guard hook
function useAccordionContext() {
  // const ctx = useContext(AccordionContext);
  // if (!ctx) throw new Error('<Accordion.Trigger> / <Accordion.Panel> must be inside <Accordion>');
  // return ctx;
}

function Accordion({ defaultOpen = null, children }) {
  // TODO: useState for openItem (initialized to defaultOpen)
  // TODO: wrap children in AccordionContext.Provider with { openItem, setOpenItem }
  return <div>Accordion stub</div>;
}

Accordion.Item = function AccordionItem({ value, children }) {
  // TODO: wrap children in AccordionItemContext.Provider with { value }
  // Add some bottom border or spacing between items
  return <div>AccordionItem stub</div>;
};

Accordion.Trigger = function AccordionTrigger({ children }) {
  // TODO: read AccordionContext (via useAccordionContext) + AccordionItemContext
  // const { openItem, setOpenItem } = useAccordionContext();
  // const { value } = useContext(AccordionItemContext);
  // const isOpen = openItem === value;
  // onClick: if isOpen → setOpenItem(null), else → setOpenItem(value)
  // Render a button (full-width, flex, space-between) showing children + ▶/▼
  return <button>AccordionTrigger stub</button>;
};

Accordion.Panel = function AccordionPanel({ children }) {
  // TODO: read both contexts; return null if openItem !== this item's value
  // When open, render a div with padding around children
  return <div>AccordionPanel stub</div>;
};

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Accordion with Context</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        The caller controls layout and content. The Accordion manages which item is open.
        Notice: the caller can add anything between/inside items — icons, badges, dividers —
        without any new props on Accordion.
      </p>
      <Accordion defaultOpen="q1">
        <Accordion.Item value="q1">
          <Accordion.Trigger>
            <span>❓</span> What is composition over inheritance?
          </Accordion.Trigger>
          <Accordion.Panel>
            Building UI by combining components via props/children, rather than extending
            base classes. Components own structure; callers own content.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="q2">
          <Accordion.Trigger>
            <span>🧩</span> What are compound components?
          </Accordion.Trigger>
          <Accordion.Panel>
            A group of components sharing implicit state via Context, giving callers
            inversion of control over layout while the parent keeps state encapsulated.
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="q3">
          {/* The caller can add arbitrary content between trigger and panel */}
          <div style={{ padding: '4px 0', fontSize: 12, color: '#94a3b8' }}>🆕 New</div>
          <Accordion.Trigger>Why is Context better than cloneElement?</Accordion.Trigger>
          <Accordion.Panel>
            cloneElement only works one level deep. If children are wrapped in a div,
            the injected props never reach the target. Context works at any depth.
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </section>
  );
}


// ─── Exercise 2: Add Controlled Mode ─────────────────────────
//
// SITUATION
//   Your Accordion from Exercise 1 is uncontrolled — it owns its state.
//   But now a caller needs to:
//   - Open a specific item from a "Jump to answer" button outside the Accordion
//   - Close all items when a form submits
//   This requires the caller to own the state. Add controlled mode.
//
// EXTEND YOUR Accordion to support this API:
//   Controlled:   <Accordion value={openItem} onChange={setOpenItem}>
//   Uncontrolled: <Accordion defaultOpen="q1">    (same as Exercise 1)
//
// THE DUAL-MODE RULE (same as native inputs):
//   isControlled = value !== undefined
//   When controlled: read from props.value, don't update internal state
//   When uncontrolled: read from internal state
//   Always call onChange (so the caller can observe changes in either mode)
//
// HINT: You'll update only the Accordion root function.
//   The sub-components (Item, Trigger, Panel) need zero changes.
//
// DEMO BELOW: shows both modes side by side.

function ControlledAccordion({ value, onChange, children }) {
  // TODO: implement the controlled variant of Accordion
  // isControlled = value !== undefined
  // the "active" value = isControlled ? value : internalState
  // setter: if not controlled → update internal state; always call onChange?.(newValue)
  //
  // This is a separate component for the exercise, but in production you'd
  // merge it into Accordion by adding value/onChange props.
  return <div>ControlledAccordion stub</div>;
}

// Make sure sub-components still work (they read from AccordionContext)
ControlledAccordion.Item    = Accordion.Item;
ControlledAccordion.Trigger = Accordion.Trigger;
ControlledAccordion.Panel   = Accordion.Panel;

function Exercise2() {
  const [openItem, setOpenItem] = useState('b');

  return (
    <section>
      <h2>Exercise 2 — Controlled Mode</h2>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h4 style={{ marginTop: 0, color: '#64748b', fontSize: 13 }}>
            Controlled (caller owns state)
          </h4>
          {/* External controls — only possible in controlled mode */}
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => setOpenItem('a')}>Open A</button>
            <button onClick={() => setOpenItem('b')}>Open B</button>
            <button onClick={() => setOpenItem(null)}>Close all</button>
          </div>
          <ControlledAccordion value={openItem} onChange={setOpenItem}>
            <ControlledAccordion.Item value="a">
              <ControlledAccordion.Trigger>Item A</ControlledAccordion.Trigger>
              <ControlledAccordion.Panel>
                This panel is controlled. The buttons above drive the state.
              </ControlledAccordion.Panel>
            </ControlledAccordion.Item>
            <ControlledAccordion.Item value="b">
              <ControlledAccordion.Trigger>Item B (starts open)</ControlledAccordion.Trigger>
              <ControlledAccordion.Panel>
                State lives in the parent — the Accordion just renders what it's told.
              </ControlledAccordion.Panel>
            </ControlledAccordion.Item>
          </ControlledAccordion>
        </div>

        <div style={{ flex: 1, minWidth: 250 }}>
          <h4 style={{ marginTop: 0, color: '#64748b', fontSize: 13 }}>
            Uncontrolled (Accordion owns state)
          </h4>
          {/* Same sub-components, different root mode */}
          <Accordion defaultOpen="x">
            <Accordion.Item value="x">
              <Accordion.Trigger>Item X (starts open)</Accordion.Trigger>
              <Accordion.Panel>Fully self-managed. No state in the parent needed.</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="y">
              <Accordion.Trigger>Item Y</Accordion.Trigger>
              <Accordion.Panel>Click triggers and state management is internal.</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 3: Guard Hook + Sub-component Misuse ───────────
//
// SITUATION
//   A teammate used your Accordion sub-components outside an Accordion root.
//   Without a guard, this fails silently — the component renders but with no
//   state backing it. Your guard hook already throws, but there's a subtlety:
//   the error should clearly identify WHICH sub-component was misused.
//
// YOUR TASK
//   The broken usage below should produce a clear, actionable error.
//   Currently it might silently render nothing or crash with an unhelpful message.
//
//   Fix the guard in useAccordionContext() so the error says:
//   "<Accordion.Trigger> must be rendered inside <Accordion>"
//   (You can customize the message based on a `componentName` arg.)
//
//   Then intentionally trigger the error and look at the console —
//   the message should tell you exactly what went wrong.
//
// BONUS
//   Wrap the broken usage in an ErrorBoundary so it doesn't crash the whole page.
//   A minimal ErrorBoundary class component is provided below.

class ErrorBoundary extends Error {}
// ^ Not a React error boundary — fix this:
// A proper ErrorBoundary is a class component with static getDerivedStateFromError().
// TODO: Replace the line above with a real ErrorBoundary class component.
//   It should render: <p style={{color:'red'}}>⚠️ {this.state.error.message}</p>
//   when an error is caught, instead of crashing.

function BrokenUsage() {
  // This is intentionally wrong — Trigger is used outside any Accordion
  return (
    <div>
      <p style={{ color: '#dc2626', fontSize: 13 }}>
        ⬇ This Accordion.Trigger is outside any &lt;Accordion&gt; — it should throw a helpful error:
      </p>
      {/* TODO: wrap this in your ErrorBoundary to catch the error gracefully */}
      <Accordion.Trigger>I have no Accordion parent</Accordion.Trigger>
    </div>
  );
}

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Guard Hook + Error on Misuse</h2>
      <BrokenUsage />
      <hr style={{ margin: '16px 0' }} />
      <p style={{ fontSize: 13, color: '#64748b' }}>
        After fixing the guard and the ErrorBoundary, the error above should be
        caught and displayed as a readable message — not a blank screen or a
        cryptic "Cannot read properties of null".
      </p>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 02 — Compound Components</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
