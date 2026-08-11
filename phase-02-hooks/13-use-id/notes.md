# useId

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useId | Generates a stable, unique string ID per component instance | Avoids hydration mismatches between server and client |
| SSR-safe | ID is deterministic and reproducible across server and client | Math.random and counters break hydration |
| Not for list keys | IDs are not stable across remounts or reordering | Using it for keys causes subtle bugs |
| Accessibility use | Links labels to inputs via `htmlFor` / `id` pairs | Required for screen readers and ARIA |

## What Is This?

`useId` is a React hook that generates a unique, stable string ID. The ID is unique to the component instance and consistent between server and client renders, making it safe for SSR (server-side rendering).

```javascript
function EmailField() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input id={id} type="email" />
    </>
  );
}
```

The generated ID looks something like `:r1:` or `:r2:`. It's not meant to be human-readable — it's meant to be unique and deterministic.

> **Check yourself:** What does the generated ID string actually look like? Is it predictable?

## Why Does It Exist?

### The Hydration Problem

In SSR, React renders your component on the server to HTML, then "hydrates" it on the client (attaches event handlers to the existing DOM). If the server and client generate different IDs, React detects a mismatch and either shows a warning or re-renders from scratch — both are bad.

Common approaches that break SSR:

```javascript
// ❌ Math.random: different on server vs client
const id = `field-${Math.random()}`;

// ❌ Incrementing counter: different order on server vs client
let counter = 0;
function useUniqueId() {
  return `field-${counter++}`; // Server might count differently
}

// ❌ Date.now: different timestamps
const id = `field-${Date.now()}`;
```

All of these generate different values on the server and client, causing hydration mismatches.

### Why Accessibility Needs IDs

HTML accessibility requires linking labels to inputs, descriptions to elements, and ARIA attributes to their targets. This requires unique `id` values:

```html
<!-- Screen reader knows this label describes this input -->
<label for="email-field">Email</label>
<input id="email-field" type="email" />

<!-- ARIA describes the input using the hint -->
<input aria-describedby="email-hint" />
<span id="email-hint">We'll never share your email.</span>
```

`useId` generates IDs that are both accessible and SSR-safe.

## How It Works

### Basic Usage

```javascript
function PasswordField() {
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>Password</label>
      <input id={id} type="password" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`}>Must be at least 8 characters.</p>
    </div>
  );
}
```

### Multiple IDs from One Call

You don't need to call `useId` multiple times. Use string concatenation to derive related IDs:

```javascript
function FormField({ label, hint }) {
  const id = useId();

  return (
    <div>
      <label htmlFor={`${id}-input`}>{label}</label>
      <input id={`${id}-input`} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <p id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}
```

One `useId` call per component is usually enough. Derive variants by appending suffixes.

> **Check yourself:** If a component needs 3 related IDs (for a label, input, and error message), how many `useId` calls do you need?

### How React Generates Deterministic IDs

React's ID generation is based on the component's position in the component tree (its "path" through the fiber tree). Because the tree structure is the same on server and client, the IDs match.

```
Server:  Component at path [root → App → Form → Field] → :r3:
Client:  Component at path [root → App → Form → Field] → :r3:
```

The IDs are deterministic because they're derived from tree position, not from runtime values like `Math.random()` or execution order.

### Multiple Instances

Each component instance gets its own unique ID:

```javascript
function App() {
  return (
    <form>
      <EmailField /> {/* id = :r1: */}
      <EmailField /> {/* id = :r2: */}
      <EmailField /> {/* id = :r3: */}
    </form>
  );
}
```

## Common Use Cases

### 1. Accessible Form Fields

```javascript
function TextField({ label, error, ...inputProps }) {
  const id = useId();

  return (
    <div>
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        id={`${id}-input`}
        aria-invalid={!!error}
        aria-errormessage={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span id={`${id}-error`} role="alert" style={{ color: 'red' }}>
          {error}
        </span>
      )}
    </div>
  );
}
```

### 2. Checkbox Groups

```javascript
function CheckboxGroup({ label, options, selected, onChange }) {
  const groupId = useId();

  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((option, i) => {
        const optionId = `${groupId}-${i}`;
        return (
          <div key={option.value}>
            <input
              type="checkbox"
              id={optionId}
              checked={selected.includes(option.value)}
              onChange={() => onChange(option.value)}
            />
            <label htmlFor={optionId}>{option.label}</label>
          </div>
        );
      })}
    </fieldset>
  );
}
```

### 3. ARIA Relationships

```javascript
function Tooltip({ children, content }) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span
      aria-describedby={isOpen ? id : undefined}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <span id={id} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
```

### 4. Accordion / Disclosure Widgets

```javascript
function Accordion({ items }) {
  const id = useId();
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div>
      {items.map((item, i) => {
        const headingId = `${id}-heading-${i}`;
        const panelId = `${id}-panel-${i}`;
        const isOpen = openIndex === i;

        return (
          <div key={i}>
            <h3>
              <button
                id={headingId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                {item.title}
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headingId}
              hidden={!isOpen}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## Gotchas

### 1. Never use useId for list keys

```javascript
// ❌ Wrong: useId generates a stable ID per component instance,
// but keys need to be tied to data identity, not component position
function TodoList({ todos }) {
  const id = useId();
  return todos.map((todo, i) => (
    <li key={`${id}-${i}`}>{todo.text}</li> // ❌ Don't use for keys!
  ));
}

// ✅ Use data-derived keys
function TodoList({ todos }) {
  return todos.map(todo => (
    <li key={todo.id}>{todo.text}</li> // ✅ Stable, data-based key
  ));
}
```

Keys must be tied to the *data* identity so React can track items across reorders. `useId` is tied to *component position*, which doesn't survive reordering.

### 2. Don't use useId for CSS selectors

```javascript
// ❌ Problematic: useId generates IDs with colons (e.g., ":r1:")
// which need escaping in CSS selectors
const id = useId(); // ":r1:"
document.querySelector(`#${id}`); // Fails — colon is invalid in selector

// ✅ If you need CSS-safe IDs, transform the value
const cssId = id.replace(/:/g, '-'); // "-r1-"
```

### 3. useId must be called at the top level

```javascript
// ❌ Inside a condition
function Component({ showField }) {
  if (showField) {
    const id = useId(); // Breaks rules of hooks!
  }
}

// ✅ Always at top level
function Component({ showField }) {
  const id = useId(); // Always called
  if (!showField) return null;
  return <input id={id} />;
}
```

### 4. Don't concatenate with changing values if you need stability

```javascript
// ⚠️ If `type` changes, the derived ID changes
const id = useId();
const fieldId = `${id}-${type}`; // Changes when type changes

// This is usually fine for ARIA — but be aware that
// the ID changes when type changes
```

### 5. IDs are unique per component instance, not globally unique forever

If a component unmounts and remounts, it may get a different ID. Don't store `useId` values in external systems expecting permanent uniqueness.

## Interview Questions

**Q (High): Why is `useId` better than `Math.random()` for generating IDs?**

Answer: Because `Math.random()` generates different values on the server and client, causing hydration mismatches. `useId` generates deterministic IDs based on the component's position in the tree, so the server and client produce identical IDs.

Hydration mismatch means React detects that the server HTML doesn't match the client render. This causes a warning in development and can force a full client-side re-render in production, negating the benefits of SSR.

The trap: Saying `useId` is only about avoiding duplicate IDs. The real reason is SSR hydration safety.

---

**Q (High): Can `useId` be used for list keys?**

Answer: No. List keys must be stable across reorders and should be derived from the data's identity (like a database ID). `useId` generates IDs based on component tree position — if items are reordered, the IDs don't follow the data, causing React to misidentify which items changed.

```javascript
// ❌ Wrong: ID follows position, not data
todos.map((todo, i) => <li key={`${id}-${i}`}>{todo.text}</li>);

// ✅ Right: Key follows data
todos.map(todo => <li key={todo.id}>{todo.text}</li>);
```

The trap: Using `useId` to generate keys because "it gives unique IDs."

---

**Q (Medium): How does `useId` ensure the same ID on server and client?**

Answer: React generates IDs based on the component's position in the component tree (fiber tree path). Since the tree structure is the same on server and client, the generated IDs match. This is unlike `Math.random()` (non-deterministic), counters (execution-order dependent), or timestamps (time-dependent).

The trap: Thinking IDs are randomly generated and just "happen to match" on server and client.

---

**Q (Medium): How do you generate multiple related IDs from a single `useId` call?**

Answer: Append suffixes to the base ID:

```javascript
const id = useId();
const inputId = `${id}-input`;
const labelId = `${id}-label`;
const errorId = `${id}-error`;
```

One `useId` call per component is sufficient. Derived IDs are still unique because the base ID is unique.

The trap: Calling `useId` multiple times in the same component (it works, but it's unnecessary).

---

**Q (Low): What does a `useId` value look like?**

Answer: It's a string like `:r1:`, `:r2:`, `:ra:`, etc. The format is an implementation detail that may change. The colons make it invalid for CSS selectors without escaping, but it works perfectly for HTML `id` attributes, `htmlFor`, and ARIA attributes.

The trap: Relying on the specific format of the generated ID.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what hydration mismatch is and why it happens with `Math.random()`
- [ ] Can write a label-input pair using `useId` from memory
- [ ] Can state the one use case `useId` must never be used for (list keys) and why
- [ ] Can derive multiple related IDs from a single `useId` call
- [ ] Can name why `useId` is deterministic across server and client renders

---

*Next: [useSyncExternalStore](../14-use-sync-external-store/notes.md) — subscribe to external stores safely in concurrent React.*
