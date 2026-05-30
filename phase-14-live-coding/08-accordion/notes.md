# Accordion

## Quick Reference

| Concept | Single-Expand | Multi-Expand |
|---|---|---|
| State shape | `openId: string \| null` | `openIds: Set<string>` |
| Toggle logic | `setOpenId(prev => prev === id ? null : id)` | Add/delete from set |
| ARIA on trigger | `aria-expanded={isOpen}` + `aria-controls="panel-id"` | Same |
| ARIA on panel | `id="panel-id"` + optional `role="region"` | Same |
| Element | `<button>` inside `<h3>` | Same |
| Animation | CSS `max-height` transition or grid-template-rows trick | Same |

---

## Why This Matters

Accordion is the most common live-coding question for intermediate React interviews because it tests:

- State design decisions (single vs multi)
- Controlled vs uncontrolled component patterns
- Accessibility fundamentals (ARIA, semantic HTML, keyboard nav)
- CSS animation without a library

Interviewers watch how quickly you get the ARIA right, whether you use a real `<button>` vs a `<div onClick>`, and whether you know the controlled/uncontrolled distinction.

---

## Core Concepts

### 1. State Design

**Single-expand** — only one item open at a time (like a FAQ):

```tsx
const [openId, setOpenId] = useState<string | null>(null);

function toggle(id: string) {
  setOpenId(prev => prev === id ? null : id);
}
```

**Multi-expand** — multiple items can be open simultaneously:

```tsx
const [openIds, setOpenIds] = useState<Set<string>>(new Set());

function toggle(id: string) {
  setOpenIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}
```

**Gotcha:** Don't mutate the Set — always create a `new Set(prev)` before modifying. React checks reference equality, so mutating the existing Set won't trigger a re-render.

---

### 2. Controlled vs Uncontrolled

**Uncontrolled** — the accordion manages its own state. The parent doesn't know which item is open.

```tsx
function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // ...
}
```

**Controlled** — the parent owns state and passes it down. Useful when you need to programmatically open an item, sync to URL, or share state across components.

```tsx
function Accordion({ items, openId, onToggle }: {
  items: AccordionItem[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  // no local state — fully controlled
}
```

**Gotcha:** The standard React pattern is to support both via a `defaultOpenId` prop (uncontrolled initial value) alongside optional `openId`/`onToggle` props (controlled). If both are provided, controlled wins.

---

### 3. ARIA Pattern

The correct semantic structure:

```tsx
<div> {/* accordion root */}
  <h3>
    <button
      id="btn-1"
      aria-expanded={isOpen}           // true | false — not "true"/"false"
      aria-controls="panel-1"          // points to the panel's id
      onClick={() => toggle(item.id)}
    >
      {item.title}
    </button>
  </h3>
  <div
    id="panel-1"                       // matches aria-controls
    role="region"                      // optional but recommended for panels with real content
    aria-labelledby="btn-1"           // points back to the button
    hidden={!isOpen}                   // or use CSS — not both
  >
    {item.content}
  </div>
</div>
```

**Why `<button>` inside `<h3>`?**

- `<h3>` gives the item structural meaning in the document outline. Screen readers announce it as a heading.
- The nested `<button>` makes it keyboard-accessible out of the box — Enter and Space work automatically. A `<div onClick>` requires `tabIndex={0}`, `role="button"`, and manual `onKeyDown` handling.

**Gotcha:** `aria-expanded` must be a boolean (`true`/`false`), not a string. Some code incorrectly passes `aria-expanded="true"` which still works but is not ideal.

---

### 4. CSS Animation

**Option A — max-height transition (simple, has a quirk):**

```css
.panel {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease;
}

.panel.open {
  max-height: 500px; /* must be >= actual height */
}
```

```tsx
<div
  style={{
    overflow: 'hidden',
    maxHeight: isOpen ? '500px' : '0',
    transition: 'max-height 0.3s ease',
  }}
>
```

**Quirk:** The animation speed is based on the max-height value, not the actual content height. If content is 50px tall but max-height is 500px, the animation takes the full duration to reach 500px — so opening feels fast but the timing is inconsistent.

**Option B — CSS Grid trick (smoother, no magic number):**

```css
.panel-wrapper {
  display: grid;
  grid-template-rows: 0fr;  /* collapsed */
  transition: grid-template-rows 0.3s ease;
}

.panel-wrapper.open {
  grid-template-rows: 1fr;  /* expanded */
}

.panel-inner {
  overflow: hidden; /* required for 0fr to clip */
}
```

```tsx
<div style={{
  display: 'grid',
  gridTemplateRows: isOpen ? '1fr' : '0fr',
  transition: 'grid-template-rows 0.3s ease',
}}>
  <div style={{ overflow: 'hidden' }}>
    {item.content}
  </div>
</div>
```

This animates from 0 to the actual content height — no magic number, smooth timing.

---

### 5. Keyboard Navigation (Out of the Box)

Because the trigger is a `<button>`:

- **Tab** — moves focus between buttons
- **Enter / Space** — activates the button (open/close)
- **No extra code needed** for basic keyboard support

For enhanced accordion navigation (per WAI-ARIA spec), you can add arrow key support to move between accordion headers — but this is rarely required in interviews.

---

### 6. Chevron Rotation Animation

A common polish touch — rotate the chevron icon when the panel is open:

```tsx
<span
  style={{
    display: 'inline-block',
    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.3s ease',
    marginRight: '0.5rem',
  }}
>
  ▼
</span>
```

---

## Common Interview Gotchas

**Gotcha:** Using `<div onClick>` instead of `<button>`. This misses keyboard accessibility, focus management, and requires extra ARIA attributes. Always use `<button>` for interactive elements.

**Gotcha:** Forgetting `aria-controls` and `aria-expanded`. Without these, screen readers can't announce the relationship between the button and the panel.

**Gotcha:** Mutating the Set directly in multi-expand mode. `new Set(prev)` is required for React to detect the state change.

**Gotcha:** Setting `display: none` vs CSS animation — `display: none` removes the element from the accessibility tree, while `max-height: 0; overflow: hidden` keeps it in the DOM (screen readers can still find it even when hidden). Use `hidden` attribute or `display:none` when you actually want to hide from screen readers too.

**Gotcha:** The `aria-expanded` boolean value on the button must match the actual visual state. If the panel is visible, `aria-expanded` must be `true`.

---

## Self-Assessment

- [ ] I can implement single-expand accordion without notes in under 5 minutes
- [ ] I can add `aria-expanded`, `aria-controls`, `id` wiring from memory
- [ ] I understand why `<button>` inside `<h3>` is the correct semantic structure
- [ ] I can explain the max-height animation quirk and the CSS grid alternative
- [ ] I know the state shape difference between single-expand and multi-expand
- [ ] I can implement the Set-based multi-expand toggle without mutating state
- [ ] I can animate a chevron icon with CSS `transform` + `transition`

---

## Interview Q&A

**Q: What ARIA attributes does an accordion need? `High`**

A: The trigger (which must be a real `<button>`, not a div) needs `aria-expanded` set to a boolean — `true` when the panel is open, `false` when closed — and `aria-controls` pointing to the panel's `id`. The panel optionally gets `role="region"` and `aria-labelledby` pointing back to the button's `id`. This gives screen readers the full relationship: "this button controls that region, and the region is currently expanded/collapsed." The heading wrapper (`<h3>`) gives the item structural meaning in the document outline.

---

**Q: How do you animate an accordion open and close without JavaScript? `Medium`**

A: The most common approach is a CSS `max-height` transition — set `max-height: 0; overflow: hidden` when collapsed and `max-height: <large-value>` when open. The tradeoff is that the large value is a magic number, and if the content is much shorter, the animation timing feels off because it's based on the full distance from 0 to the max. A smoother alternative is the CSS grid trick: set `grid-template-rows: 0fr` (collapsed) and `grid-template-rows: 1fr` (open) on the wrapper, with `overflow: hidden` on the inner div. This animates from 0 to the actual content height — no magic number needed.

---

**Q: What is the state shape difference between single-expand and multi-expand accordion? `Medium`**

A: Single-expand uses `openId: string | null` — at most one item's ID is stored. Toggle logic is `setOpenId(prev => prev === id ? null : id)`. Multi-expand uses `openIds: Set<string>` — any number of IDs can be in the set. Toggle logic creates a new Set from the previous one and either adds or deletes the ID. The key invariant in multi-expand: never mutate the Set directly — always `new Set(prev)` first so React detects the reference change.

---

**Q: How would you make the accordion controlled? `Medium`**

A: Move the state to the parent component and pass `openId` and `onToggle` as props. The accordion component no longer calls `useState` — it reads `openId` from props and calls `onToggle` on click. This is useful when you need to sync the open state to a URL parameter, programmatically open a specific item (e.g., scroll-to-section), or share the state with a sibling component. The uncontrolled version (internal state) is simpler and fine for most cases.

---

**Q: Why is `<button>` inside `<h3>` better than `<h3 onClick>`? `Low`**

A: Two separate concerns. `<h3>` provides document structure — screen readers use heading levels to build a navigation outline of the page. The `<button>` provides the interactive affordance — it's focusable by default, activated by Enter/Space, announced as "button" by screen readers, and supports `aria-expanded`. A plain `<h3 onClick>` is not keyboard accessible (not in the tab order), not announced as interactive, and would require `tabIndex={0}`, `role="button"`, and manual `onKeyDown` to approximate button behavior. The nested structure `<h3><button></button></h3>` gives you both for free.
