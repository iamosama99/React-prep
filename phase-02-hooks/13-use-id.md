# useId

## What Is This?

`useId` is a hook that generates a stable, unique ID string that is consistent between server and client renders. The primary use case is creating accessible ARIA attribute values — specifically linking form elements to their labels and descriptions.

```javascript
function EmailField() {
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>Email</label>
      <input id={id} type="email" />
    </div>
  );
}
```

The ID is stable across re-renders and unique per component instance — two `EmailField` instances will each get different IDs.

## Why Does It Exist?

The problem is **SSR hydration mismatches** from dynamically generated IDs.

For accessible forms, you need to link a `<label>` to its `<input>` via `id`/`htmlFor`:

```html
<label for="email-123">Email</label>
<input id="email-123" type="email" />
```

The IDs need to be:
1. **Unique on the page** — two components can't share an ID
2. **Stable between renders** — the same component instance should always get the same ID
3. **Consistent between server and client** — the server renders the HTML, the client hydrates it; if the IDs differ, React throws a hydration error

The naive approaches all fail for SSR:

```javascript
// ❌ Different value every render — breaks stable IDs
const id = Math.random();

// ❌ Global counter — fine in client-only apps, but the counter
//    state on the server doesn't match the counter state after
//    client-side hydration (React renders components in different order)
let counter = 0;
function useId() {
  return ++counter;
}

// ❌ crypto.randomUUID() — different on server vs client, hydration error
const id = crypto.randomUUID();
```

`useId` generates IDs based on the component's **position in the React component tree** — the same structural position produces the same ID on both server and client, making hydration deterministic.

## How It Works

React tracks the position of every component in the fiber tree. `useId` uses this tree position to generate a deterministic string. Two components at different positions get different IDs. The same component at the same position (across SSR and hydration) gets the same ID.

The format in React 18+ is `":r{n}:"` where `{n}` is a base-32-encoded number. The colons prevent accidental matches with CSS selectors.

```javascript
const id = useId(); // ":r0:", ":r1:", ":r2:", etc.
```

### Multiple IDs from One Hook Call

If a component needs multiple unique IDs, don't call `useId` multiple times — call it once and derive suffixed IDs:

```javascript
function PasswordField() {
  const id = useId();

  return (
    <div>
      <label htmlFor={`${id}-input`}>Password</label>
      <input
        id={`${id}-input`}
        type="password"
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`}>
        Must be at least 8 characters.
      </p>
    </div>
  );
}
```

One `useId` call, three derived IDs. They're all guaranteed unique and stable.

## Common ARIA Patterns

### Label Association

```javascript
function FormField({ label, type = 'text' }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} />
    </div>
  );
}
```

### Input + Error Message

```javascript
function ValidatedInput({ label, errorMessage }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!errorMessage}
        aria-describedby={errorMessage ? errorId : undefined}
      />
      {errorMessage && <p id={errorId} role="alert">{errorMessage}</p>}
    </div>
  );
}
```

### Multiple Select Options

```javascript
function RadioGroup({ name, options }) {
  const baseId = useId();

  return (
    <fieldset>
      {options.map((option, i) => {
        const inputId = `${baseId}-${i}`;
        return (
          <div key={option.value}>
            <input type="radio" id={inputId} name={name} value={option.value} />
            <label htmlFor={inputId}>{option.label}</label>
          </div>
        );
      })}
    </fieldset>
  );
}
```

## What useId Is NOT For

### Not for List Keys

```javascript
// ❌ Don't use useId for list keys
function List({ items }) {
  return items.map(item => {
    const id = useId(); // Can't call hooks in loops!
    return <li key={id}>{item.name}</li>;
  });
}
```

Hooks can't be called conditionally or inside loops. Keys should come from your data. `useId` is for accessibility IDs on a component's own elements, not for dynamic list key generation.

### Not a UUID Generator

`useId` is a tree-position-based ID for DOM elements in the current document. Don't use it for:
- Database record IDs
- Keys in data structures
- Request tracking IDs

For those, use `crypto.randomUUID()` or a UUID library.

## Gotchas

### 1. The format includes colons — be aware of CSS selector usage

The ID format `:r0:` includes colons, which are valid in HTML IDs but need escaping in CSS selectors (`#\:r0\:`). Don't construct CSS selectors from `useId` IDs. Use `document.getElementById(id)` instead of `document.querySelector('#' + id)`.

### 2. IDs are not stable across component tree changes

`useId` is based on tree position. If you reorder components or conditionally render them, the IDs shift. For static form layouts this is fine. For highly dynamic UIs where the same logical component appears at different tree positions, IDs may change.

### 3. Only available from React 18

`useId` was introduced in React 18. For earlier versions, there are third-party SSR-safe alternatives (`@radix-ui/react-id`, `react-uid`).

## Interview Questions

**Q: Why does React need a special hook for generating IDs? Why not just use Math.random() or a counter?**

Strong answer: Both fail for server-side rendering. `Math.random()` generates different values on the server (HTML render) and on the client (hydration), causing a hydration mismatch — React throws a warning and may discard the server's HTML. A global counter sounds better but also fails: React renders components in a different order on the server versus client hydration, so the same counter values go to different components. `useId` avoids both problems by deriving the ID from the component's position in the fiber tree, which is deterministic and identical on server and client. Same tree position = same ID, every time.

The trap: Thinking global counters work fine. They work in client-only apps, but break the moment you add SSR or React Server Components.

---

**Q: If I need three unique IDs in one component, should I call `useId` three times?**

Strong answer: No — call it once and derive suffixed IDs. `useId` returns a base ID that's unique per component instance, and you extend it: `${id}-label`, `${id}-input`, `${id}-error`. This is the recommended pattern in the React docs. Calling `useId` multiple times per component is valid but unnecessary — you'd get three unique base IDs when you only need one. More importantly, suffixing from one base ID clearly signals that these IDs all belong to the same component instance, which aids debugging.

The trap: Either calling it once and reusing the same ID for multiple attributes (breaking uniqueness) or calling it once per element (valid but verbose and misleading).

---

*Next: [useSyncExternalStore](14-use-sync-external-store.md) — The correct way to subscribe to external state stores in concurrent React without tearing.*
