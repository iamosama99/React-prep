// ============================================================
// Topic:   Props, props.children, and defaultProps
// Phase:   1 — Fundamentals Refresher
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import { useState } from 'react';


// ─── Exercise 1 ──────────────────────────────────────────────
// THE COMPONENT API — Design a Button that takes many prop types
//
// Build a Button component that accepts:
//   □ label      (string)   — the button text
//   □ variant    (string)   — 'primary' | 'secondary' | 'danger'
//                             default: 'primary'
//   □ disabled   (boolean)  — default: false
//   □ onClick    (function) — called when clicked
//   □ icon       (element)  — a React element rendered BEFORE the label,
//                             optional (no default needed)
//
// Style rules (inline styles are fine):
//   primary:   background #3b82f6, white text
//   secondary: background #f1f5f9, dark text
//   danger:    background #ef4444, white text
//   disabled:  opacity 0.5, cursor not-allowed
//
// DEFAULTS: use JavaScript default parameter syntax in the function signature.
//           Do NOT use Button.defaultProps — that's deprecated for function components.
//
// After building Button, use it in Exercise1's return to render 4 variants:
//   1. <Button label="Save" onClick={...} />                  — defaults apply
//   2. <Button label="Cancel" variant="secondary" onClick={...} />
//   3. <Button label="Delete" variant="danger" onClick={...} />
//   4. <Button label="Can't touch this" disabled />           — disabled, onClick omitted
//
// WHAT TO VERIFY:
//   - Button 1 uses primary styles without being told
//   - Button 4 is visually dimmed and unclickable
//   - No console warnings about unknown DOM props or missing keys

function Button({ label, variant = 'primary', disabled = false, onClick, icon }) {
  // TODO: implement this component
  return <button>{label}</button>;
}

function Exercise1() {
  const [lastClicked, setLastClicked] = useState(null);
  const log = (name) => setLastClicked(name);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {/* TODO: render 4 Button variants here */}
      </div>
      {lastClicked && (
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Last clicked: <strong>{lastClicked}</strong>
        </p>
      )}
    </div>
  );
}


// ─── Exercise 2 ──────────────────────────────────────────────
// children IN ACTION — Build composable layout components
//
// Build two wrapper components that use props.children:
//
// Card — renders children inside a styled box:
//   □ White background, 1px #e2e8f0 border, 16px padding, 8px border-radius
//   □ Accepts children — renders whatever is passed inside
//   □ No additional props needed
//
// Section — renders a titled section:
//   □ Accepts title (string) and children
//   □ Renders: <h3>{title}</h3> followed by children
//   □ Default title: 'Untitled Section'
//
// Then demonstrate them in Exercise2's return:
//   <Card>
//     <Section title="User Info">
//       <p>Name: Osama</p>
//       <p>Role: Senior Engineer</p>
//     </Section>
//     <Section>   {/* ← uses default title */}
//       <p>No title provided — default title should appear here</p>
//     </Section>
//   </Card>
//
// WHAT TO VERIFY:
//   - Inspect DevTools: Card adds exactly one div, Section adds exactly one h3 + its children
//   - The second Section shows "Untitled Section" without being told
//   - You never pass children as a named prop — JSX populates it automatically

function Card({ children }) {
  // TODO: implement
  return <div>{children}</div>;
}

function Section({ title = 'Untitled Section', children }) {
  // TODO: implement
  return <div>{children}</div>;
}

function Exercise2() {
  // TODO: use Card and Section to build the nested structure described above
  return <div>Exercise 2 — implement the Card + Section composition</div>;
}


// ─── Exercise 3 ──────────────────────────────────────────────
// THE CALLBACK CONTRACT — read-only props + upward communication
//
// This exercise traces the entire data flow from parent to child and back.
//
// WHAT TO BUILD:
//   A TagManager component that manages a list of tags.
//   The list lives in the parent (Exercise3) as state.
//   Two child components consume and interact with it.
//
// Components to implement:
//
// TagList — displays the current tags
//   Props: tags (string[]), onRemove (function called with the tag string to remove)
//   Renders: each tag as a small pill with a "×" button that calls onRemove(tag)
//   Style the pill however you like — background #e0f2fe, text #0369a1 works nicely
//
// TagInput — adds a new tag
//   Props: onAdd (function called with the new tag string)
//   Has its OWN local state for the input field (it owns the draft, not the list)
//   On submit (Enter key or button click): calls onAdd(inputValue), clears local input
//   Do not accept duplicate tags — if the tag already exists, clear without adding
//   Hint: the parent's `tags` array is NOT passed here — TagInput doesn't need it
//         The parent's onAdd handler will decide whether to actually add the tag
//
// Exercise3 — owns the tags state
//   □ Initial tags: ['React', 'TypeScript', 'Next.js']
//   □ onAdd: add only if not already in the list
//   □ onRemove: filter out the removed tag
//   □ Renders TagList and TagInput side by side
//
// WHAT TO VERIFY:
//   - Tags can be added and removed
//   - Duplicates are rejected (either in TagInput, or the parent ignores them — your call)
//   - TagInput never reaches into the parent's state directly — it only calls onAdd
//   - TagList never calls setTags directly — it only calls onRemove
//   - The data flow is: tags (down) → TagList, onRemove (down) → TagList calls it up

function TagList({ tags, onRemove }) {
  // TODO: implement
  return <div>TagList — implement me</div>;
}

function TagInput({ onAdd }) {
  const [value, setValue] = useState('');
  // TODO: implement the input + submit logic
  return <div>TagInput — implement me</div>;
}

function Exercise3() {
  const [tags, setTags] = useState(['React', 'TypeScript', 'Next.js']);

  function handleAdd(tag) {
    // TODO: add tag if not already in the list
  }

  function handleRemove(tag) {
    // TODO: filter out the removed tag
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      <div>
        <h4 style={{ margin: '0 0 0.5rem' }}>Current Tags</h4>
        <TagList tags={tags} onRemove={handleRemove} />
      </div>
      <div>
        <h4 style={{ margin: '0 0 0.5rem' }}>Add Tag</h4>
        <TagInput onAdd={handleAdd} />
      </div>
    </div>
  );
}


// ─── Playground ──────────────────────────────────────────────
// Suggested experiments:
//
// 1. null default trap
//    Add variant={null} to your Button — does it use the 'primary' default?
//    It won't — null bypasses default parameters. Fix it with `variant ?? 'primary'`
//    in the function body and observe the difference.
//
// 2. Spreading props onto native elements
//    Add an isAdmin prop to Exercise3's parent and spread all props onto a <div>:
//    <div {...props} />
//    Open DevTools console — see the "unknown prop" warning.
//    Fix by destructuring and excluding non-DOM props before spreading.
//
// 3. key and ref visibility
//    Add key="test" and ref={someRef} to any component.
//    Inside the component, log props.key and props.ref.
//    Both will be undefined — React intercepts them before your component sees them.
function Playground() {
  return <div>Experiment here</div>;
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: '720px' }}>
      <h1>Props, props.children, and defaultProps</h1>

      <h2>Exercise 1 — Button with a typed prop API</h2>
      <Exercise1 />

      <h2>Exercise 2 — Composable layout with children</h2>
      <Exercise2 />

      <h2>Exercise 3 — The callback contract: tags manager</h2>
      <Exercise3 />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
