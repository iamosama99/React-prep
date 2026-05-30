// ============================================================
// Topic:   Accordion
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: implement BasicAccordion (fill in the TODOs).
//   3. Exercise 2: add ARIA + CSS animation to AccessibleAccordion.
//   4. Exercise 3: implement multi-expand mode.
//   5. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 08-accordion
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// Shared data
// ─────────────────────────────────────────────────────────────

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

const ITEMS: AccordionItem[] = [
  {
    id: '1',
    title: 'What is React?',
    content:
      'A JavaScript library for building user interfaces, developed by Meta. It uses a component-based architecture and a virtual DOM to efficiently update the UI.',
  },
  {
    id: '2',
    title: 'What are hooks?',
    content:
      'Functions introduced in React 16.8 that let you use state, effects, context, and other React features inside function components — no class components required.',
  },
  {
    id: '3',
    title: 'What is JSX?',
    content:
      'A syntax extension to JavaScript that looks like HTML. Babel transforms it to React.createElement() calls. It is not required but makes component code much more readable.',
  },
  {
    id: '4',
    title: 'What is the virtual DOM?',
    content:
      'An in-memory representation of the real DOM. React diffs the new virtual DOM against the previous one and applies only the necessary changes to the real DOM — a process called reconciliation.',
  },
];

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Basic Accordion, Single-Expand, No ARIA
//
// Goal: get the open/close logic right first.
//
// TODO:
//   1. When a header div is clicked, toggle openId.
//      - If the clicked item is already open, close it (set to null).
//      - If a different item is open, switch to the new one.
//   2. Render each item's title in a clickable div (we'll upgrade
//      to <button> in Exercise 2).
//   3. Only render item.content when item.id === openId.
// ─────────────────────────────────────────────────────────────

function BasicAccordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  // TODO: implement toggle
  function toggle(id: string) {
    // setOpenId(prev => prev === id ? null : id);
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {items.map(item => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} style={{ borderBottom: '1px solid #eee' }}>
            {/* TODO: make this div clickable — call toggle(item.id) on click */}
            <div
              style={{
                padding: '1rem',
                cursor: 'pointer',
                fontWeight: 600,
                background: isOpen ? '#f5f5f5' : '#fff',
                userSelect: 'none',
              }}
            >
              {/* TODO: show ▶ when closed, ▼ when open — add a span before the title */}
              {item.title}
            </div>
            {/* TODO: only render this when isOpen */}
            <div style={{ padding: '0 1rem 1rem', color: '#555', lineHeight: 1.6 }}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Accessible Accordion: ARIA + CSS Animation
//
// Upgrade the basic version with:
//   - <button> inside <h3> (semantic structure)
//   - aria-expanded, aria-controls, id wiring
//   - CSS max-height animation for the panel
//   - Chevron rotation animation
//
// The structure ARIA requires:
//   <h3>
//     <button id="btn-{id}" aria-expanded={isOpen} aria-controls="panel-{id}">
//       {title}
//     </button>
//   </h3>
//   <div id="panel-{id}" role="region" aria-labelledby="btn-{id}">
//     {content}
//   </div>
// ─────────────────────────────────────────────────────────────

function AccessibleAccordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {items.map(item => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} style={{ borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0 }}>
              <button
                id={`btn-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`panel-${item.id}`}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  background: isOpen ? '#f5f5f5' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {item.title}
                {/* TODO: add a chevron span with rotation animation
                    Hint: style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                */}
                <span>▼</span>
              </button>
            </h3>
            <div
              id={`panel-${item.id}`}
              role="region"
              aria-labelledby={`btn-${item.id}`}
              style={{
                // TODO: add CSS max-height animation
                // overflow: 'hidden',
                // maxHeight: isOpen ? '300px' : '0',
                // transition: 'max-height 0.3s ease',
              }}
            >
              <div style={{ padding: '1rem', color: '#555', lineHeight: 1.6 }}>
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Multi-Expand Mode
//
// Change the state from `openId: string | null` to
// `openIds: Set<string>` so multiple panels can be open at once.
//
// Key rules:
//   - Never mutate the Set — always new Set(prev) first
//   - Toggle: if id is in the set, delete it; otherwise add it
// ─────────────────────────────────────────────────────────────

function MultiAccordion({ items }: { items: AccordionItem[] }) {
  // TODO: change state to Set<string>
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  // TODO: implement toggle using Set
  function toggle(id: string) {
    // setOpenIds(prev => {
    //   const next = new Set(prev);
    //   next.has(id) ? next.delete(id) : next.add(id);
    //   return next;
    // });
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {items.map(item => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} style={{ borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0 }}>
              <button
                id={`multi-btn-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`multi-panel-${item.id}`}
                onClick={() => toggle(item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem',
                  background: isOpen ? '#f0f9ff' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {item.title}
                <span style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  display: 'inline-block',
                }}>
                  ▼
                </span>
              </button>
            </h3>
            {/* TODO: show/hide content based on isOpen using CSS animation */}
            <div
              id={`multi-panel-${item.id}`}
              role="region"
              aria-labelledby={`multi-btn-${item.id}`}
            >
              <div style={{ padding: '1rem', color: '#555', lineHeight: 1.6 }}>
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete accordion with:
//   - ARIA (aria-expanded, aria-controls, id wiring)
//   - CSS grid-template-rows animation (no magic max-height number)
//   - Chevron rotation
//   - Single vs multi-expand toggle at the top
//   - Keyboard accessible (via native <button>)
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

function ReferenceAccordion({ items, multi = false }: { items: AccordionItem[]; multi?: boolean }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (multi) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        // Single-expand: clear all, then add (or clear if already open)
        if (next.has(id)) {
          next.clear();
        } else {
          next.clear();
          next.add(id);
        }
      }
      return next;
    });
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {items.map(item => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id} style={{ borderBottom: '1px solid #eee' }}>
            <h3 style={{ margin: 0 }}>
              <button
                id={`ref-btn-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`ref-panel-${item.id}`}
                onClick={() => toggle(item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '1rem 1.25rem',
                  background: isOpen ? '#f0f9ff' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#1a1a1a',
                  transition: 'background 0.2s',
                }}
              >
                {item.title}
                {/* Chevron: rotates 180deg when open */}
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    color: '#666',
                    fontSize: '0.85rem',
                  }}
                >
                  ▼
                </span>
              </button>
            </h3>

            {/*
              CSS Grid trick: grid-template-rows transitions from 0fr to 1fr.
              - No magic max-height number required
              - Animates to the actual content height
              - Inner div needs overflow:hidden for 0fr to clip
            */}
            <div
              id={`ref-panel-${item.id}`}
              role="region"
              aria-labelledby={`ref-btn-${item.id}`}
              style={{
                display: 'grid',
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s ease',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1.25rem 1.25rem', color: '#555', lineHeight: 1.7, borderTop: '1px solid #f0f0f0' }}>
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Accordion</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Build an accessible accordion from scratch. Work through the exercises top to bottom,
      then compare with the reference implementation.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — Basic Accordion (Single-Expand, No ARIA)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in the TODOs: toggle logic, clickable header, conditional content render, open indicator.
        </p>
        <BasicAccordion items={ITEMS} />
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Clicking a header should open that panel and close any previously open one.
          Clicking the open header again should close it.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2 — Accessible Accordion (ARIA + Animation)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Add the CSS animation to the panel and make the chevron rotate.
          The button/ARIA structure is already provided — study it.
        </p>
        <AccessibleAccordion items={ITEMS} />
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Inspect the button in DevTools — it should have <code>aria-expanded="true/false"</code>
          and <code>aria-controls</code> pointing to the panel. The panel should slide open/close smoothly.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 3 — Multi-Expand Mode</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Change the state to <code>Set&lt;string&gt;</code> and implement the toggle so multiple panels can be open at once.
          Remember: never mutate the Set directly.
        </p>
        <MultiAccordion items={ITEMS} />
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Opening item 1 then item 2 should leave both open. Clicking an open item should close only that one.
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Full implementation with CSS grid animation, chevron rotation, single/multi toggle. Read this only after attempting the exercises.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Single-Expand</h3>
            <ReferenceAccordion items={ITEMS} multi={false} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Multi-Expand</h3>
            <ReferenceAccordion items={ITEMS} multi={true} />
          </div>
        </div>

        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>CSS <code>grid-template-rows: 0fr → 1fr</code> — no magic max-height number, animates to actual content height</li>
            <li>Inner div needs <code>overflow: hidden</code> for the 0fr clip to work</li>
            <li>Single-expand is implemented using the same Set — just clear before add</li>
            <li>Chevron has <code>aria-hidden="true"</code> — it's decorative, the button label describes the action</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
