// ============================================================
// Topic:   Virtual DOM & Reconciliation
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Each exercise produces observable browser behavior — run it
//   and notice what happens before reading the explanation.
// ============================================================

import { useState } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const inputStyle = { padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 4, width: '100%', boxSizing: 'border-box' };

// ─── Exercise 1: Type Change → State Reset ────────────────────
//
// SITUATION
//   A wizard form has two steps. In "Step A" mode it renders <StepA />;
//   in "Step B" mode it renders <StepB />. Both look identical but are
//   different component types. A user fills in <StepA />, clicks Next,
//   comes back — and everything is gone.
//
// WHAT'S HAPPENING
//   React's first heuristic: if element type changes at the same tree
//   position, tear down the old subtree and build a fresh one.
//   StepA → StepB is a type change even though the DOM structure is the same.
//   React can't know if the new component's state is compatible — so it
//   resets everything.
//
// YOUR TASK
//   1. Type text into the input in the left panel. Click Toggle.
//      → Your text is GONE (type changed, component unmounted).
//   2. Type text in the right panel. Click Toggle.
//      → Your text SURVIVES (same type, only the prop changed).
//   3. Below each panel, explain WHY in the comment.
//
// BONUS FIX
//   Add a `key` prop to the left panel's component that changes on toggle.
//   Verify: it now also resets on toggle — same mechanism, intentional.

function StepA() {
  return <input style={inputStyle} placeholder="Step A — type something here" />;
}
function StepB() {
  return <input style={inputStyle} placeholder="Step B — type something here" />;
}
function StepSingle({ label }) {
  return <input style={inputStyle} placeholder={`${label} — type something here`} />;
}

function Exercise1() {
  const [isA, setIsA] = useState(true);

  return (
    <section>
      <h2>Exercise 1 — Type Change Destroys State</h2>
      <p style={hint}>Type in each input, then click Toggle. One clears, one doesn't.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            ❌ Different type each toggle
          </div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            <code>{isA ? '<StepA />' : '<StepB />'}</code> — renders as different component types
          </div>
          {/* WHY does this clear? Write your explanation as a comment below. */}
          {/* ANSWER: because React sees StepA → StepB as a type change at the same
               tree position. It unmounts StepA (destroying all DOM state) and mounts
               a brand new StepB. The internal DOM state (input text) is on the
               destroyed element — gone. */}
          {isA ? <StepA /> : <StepB />}
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginBottom: 8 }}>
            ✅ Same type, different prop
          </div>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            <code>&lt;StepSingle label="{isA ? 'Step A' : 'Step B'}" /&gt;</code>
          </div>
          {/* WHY does this preserve the text? Write your explanation as a comment. */}
          {/* ANSWER: StepSingle is the same type both times. React keeps the
               component instance, updates its props, and re-renders. The DOM node
               (the input element) is updated in-place — its value property is
               unchanged because React never touched it. */}
          <StepSingle label={isA ? 'Step A' : 'Step B'} />
        </div>
      </div>

      <button
        onClick={() => setIsA(v => !v)}
        style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        Toggle (currently: {isA ? 'A' : 'B'})
      </button>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Interview question:</strong> A colleague says "my component type never
        changes, so this heuristic doesn't matter for me." Can you name a common
        React pattern where this DOES happen accidentally?
        {/* Answer: defining a component inside another component's render function.
             Each render of the outer component creates a new function reference for
             the inner component. React sees a new type on every render and unmounts/
             remounts the inner component every time. */}
      </div>
    </section>
  );
}


// ─── Exercise 2: Index as Key — The Classic Footgun ──────────
//
// SITUATION
//   A task list with inline rename inputs. Each task has its own
//   input — the user's typed text is NOT stored in React state (uncontrolled).
//   When an item is deleted from the top, the remaining items shift positions.
//   With index-as-key, React maps old[0]→new[0] by POSITION — so position 0
//   keeps its DOM node and just updates the text content. The input on
//   that DOM node still shows whatever was typed before. Bug: text bleeds
//   from the deleted item onto the next one.
//
// YOUR TASK
//   1. Uncheck "Use stable IDs" checkbox.
//   2. Type "MY NOTE" into the FIRST input (Buy groceries).
//   3. Click Delete on the first item.
//   4. Observe: "MY NOTE" is now on "Walk the dog" — the deleted item's
//      text bled onto the next item.
//   5. Check "Use stable IDs" and repeat — bug is gone.
//   6. In the comment below: explain the mechanism in your own words.

const TASKS = [
  { id: 'a1', text: 'Buy groceries' },
  { id: 'a2', text: 'Walk the dog' },
  { id: 'a3', text: 'Write tests' },
];

function Exercise2() {
  const [tasks, setTasks] = useState(TASKS);
  const [useStableId, setUseStableId] = useState(false);

  const deleteFirst = () => setTasks(prev => prev.slice(1));
  const reset = () => setTasks(TASKS);

  return (
    <section>
      <h2>Exercise 2 — Index as Key: The Position Bug</h2>
      <p style={hint}>Type in the first input. Delete that item. See if your text transfers.</p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={useStableId}
          onChange={e => setUseStableId(e.target.checked)}
        />
        Use stable <code>task.id</code> as key (uncheck for the bug)
      </label>

      <div style={{ ...card, maxWidth: 380 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: useStableId ? '#16a34a' : '#dc2626', marginBottom: 12 }}>
          {useStableId ? '✅ key={task.id}' : '❌ key={index}'}
        </div>

        {tasks.map((task, index) => (
          <div
            key={useStableId ? task.id : index}
            style={{ display: 'flex', gap: 8, marginBottom: 8 }}
          >
            <input
              defaultValue={task.text}
              style={{ flex: 1, ...inputStyle }}
            />
            <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              pos: {index}
            </span>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={deleteFirst}
            disabled={tasks.length === 0}
            style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            Delete first item
          </button>
          <button
            onClick={reset}
            style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* YOUR EXPLANATION — fill in the blank:
        When using index as key:
          Deleting item[0] makes the old item[1] now occupy index 0.
          React matches old key=0 to new key=0 (same position).
          It UPDATE the existing DOM node's text content instead of swapping nodes.
          But the input's VALUE is not React-controlled — it stays as "MY NOTE"
          from the now-deleted item. DOM node identity was preserved incorrectly.

        With stable ID keys:
          React matches old key="a1" to new key="a1".
          "a1" was deleted — React finds no match → removes its DOM node.
          "a2" (key="a2") and "a3" map to their exact same DOM nodes.
          No bleed. The user's typed text stays with the correct item.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>When IS index-as-key acceptable?</strong> Only when the list is
        static (never reordered or prepended) AND items have no internal state.
        Pure display lists where nothing ever moves: fine. Any input, checkbox,
        or reorderable list: never.
      </div>
    </section>
  );
}


// ─── Exercise 3: Key as an Intentional Remount Trigger ────────
//
// SITUATION
//   A multi-field form. After the user submits, you want to reset the
//   entire form to blank. The naive approach: track every field in state
//   and reset each one after submit. The React trick: change the key —
//   React unmounts the old form instance and mounts a blank one.
//   Adding a new field later requires zero reset code.
//
// YOUR TASK
//   The form currently resets manually via individual setters in onSubmit.
//   Refactor it to use the key trick:
//   1. Add `const [formVersion, setFormVersion] = useState(0)` to Exercise3
//   2. Pass `key={formVersion}` to <ContactForm>
//   3. Replace the `onReset` prop + manual setters with
//      `setFormVersion(v => v + 1)` in the submit handler
//   4. Verify: the submission count (outside the form) is unaffected —
//      it lives above the key boundary and is never remounted.
//
// NOTE: this also demonstrates that the key trick is safe — only the
// component at the keyed position unmounts; the parent is untouched.

function ContactForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, email, message });
    // TODO: remove these and use the key trick in the parent instead
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        value={name} onChange={e => setName(e.target.value)}
        placeholder="Your name" style={inputStyle}
        required
      />
      <input
        value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Email address" style={inputStyle}
        type="email" required
      />
      <textarea
        value={message} onChange={e => setMessage(e.target.value)}
        placeholder="Message..." rows={3}
        style={{ ...inputStyle, resize: 'vertical' }}
        required
      />
      <button
        type="submit"
        style={{ padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        Send message
      </button>
    </form>
  );
}

function Exercise3() {
  const [submissions, setSubmissions] = useState([]);
  // TODO: add const [formVersion, setFormVersion] = useState(0)

  const handleSubmit = (data) => {
    setSubmissions(prev => [{ ...data, id: Date.now() }, ...prev]);
    // TODO: setFormVersion(v => v + 1) — triggers remount of ContactForm
  };

  return (
    <section>
      <h2>Exercise 3 — Key as Remount Trigger (Form Reset)</h2>
      <p style={hint}>
        Fill the form and submit. Then refactor: replace manual state resets
        with <code>key={'{formVersion}'}</code> on ContactForm.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Contact Form</div>
          {/* TODO: add key={formVersion} here */}
          <ContactForm onSubmit={handleSubmit} />
        </div>

        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Submissions ({submissions.length}) — lives outside the key boundary
          </div>
          {submissions.length === 0
            ? <p style={{ fontSize: 13, color: '#94a3b8' }}>No submissions yet.</p>
            : submissions.slice(0, 5).map(s => (
              <div key={s.id} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <strong>{s.name}</strong> — {s.email}
              </div>
            ))
          }
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 6, fontSize: 13 }}>
        <strong>After the refactor:</strong> Delete all three <code>set*()</code> calls
        in <code>ContactForm.handleSubmit</code>. Add a fourth field (phone number) —
        notice it requires <em>zero</em> reset code. The key change handles everything.
        The submission list counter still increments correctly — it's never remounted.
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 01 — Virtual DOM &amp; Reconciliation
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
