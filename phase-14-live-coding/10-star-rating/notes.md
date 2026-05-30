# Star Rating

## Quick Reference

| Concept | Implementation |
|---|---|
| State | `selected: number` (0–5) + `hovered: number \| null` |
| Display value | `hovered ?? selected` |
| Fill condition | `star <= displayValue` |
| Hover setup | `onMouseEnter` per star, `onMouseLeave` on container |
| ARIA pattern | `role="radiogroup"` + each star is `role="radio"` |
| Keyboard | Arrow keys on the container (single tabstop) |
| Read-only | No event handlers, just render the selected value |

---

## Why This Matters

Star rating appears constantly in React live coding rounds because it looks deceptively simple but touches several non-obvious decisions:

- Two-state design (hover preview vs. committed selection)
- Event bubbling: `onMouseLeave` on the container vs. on each star
- ARIA radiogroup pattern (mutually exclusive selection)
- Keyboard accessibility with arrow keys
- Read-only vs. interactive modes

A candidate who reaches for a library or fumbles the hover logic immediately signals limited experience. Knowing the two-state pattern cold is a strong signal.

---

## Core Concepts

### 1. Two-State Design

The key insight is that you need **two separate pieces of state**:

```tsx
const [selected, setSelected] = useState(0); // committed: changes on click
const [hovered, setHovered] = useState<number | null>(null); // preview: changes on hover

// Display uses hovered when available, falls back to selected
const displayValue = hovered ?? selected;
```

**Why not just one state?** If you update `selected` on hover, you lose the user's actual rating when they move the mouse away. The `selected` state represents "what the user has clicked", while `hovered` represents "what the user is previewing right now."

---

### 2. Event Handler Placement

**Critical:** Place `onMouseLeave` on the **container**, not on individual stars.

```tsx
// CORRECT — container handles leave
<div onMouseLeave={() => setHovered(null)}>
  {[1, 2, 3, 4, 5].map(star => (
    <span
      key={star}
      onMouseEnter={() => setHovered(star)}
      onClick={() => setSelected(star)}
    >
      {star <= displayValue ? '★' : '☆'}
    </span>
  ))}
</div>
```

**Why container for leave?** If you put `onMouseLeave` on each star, it fires every time the cursor moves between adjacent stars (leaving star 2, entering star 3 triggers star 2's leave event). This causes flickering. The container's `onMouseLeave` only fires when the cursor actually leaves the entire rating widget.

---

### 3. Star Display Logic

```tsx
const displayValue = hovered ?? selected;

// For a 5-star rating:
{[1, 2, 3, 4, 5].map(star => (
  <span
    key={star}
    style={{
      color: star <= displayValue ? '#f59e0b' : '#d1d5db',
      fontSize: '2rem',
      cursor: 'pointer',
    }}
    onMouseEnter={() => setHovered(star)}
    onClick={() => setSelected(star)}
  >
    {star <= displayValue ? '★' : '☆'}
  </span>
))}
```

**Gotcha:** Use `star <= displayValue` not `star < displayValue`. Rating 3 means stars 1, 2, and 3 are filled — so the condition is `star <= 3`.

---

### 4. ARIA Pattern: radiogroup

Mutually exclusive selection → use the radio group pattern:

```tsx
<div
  role="radiogroup"
  aria-label="Product rating"
>
  {[1, 2, 3, 4, 5].map(star => (
    <span
      key={star}
      role="radio"
      aria-checked={star === selected}
      aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
      tabIndex={-1}  // not in tab order — container gets tabIndex={0}
    >
      {star <= displayValue ? '★' : '☆'}
    </span>
  ))}
</div>
```

**Why radiogroup?** A star rating is semantically like a radio group: exactly one value is selected from a set of mutually exclusive options. `aria-checked` on each "radio" tells screen readers which option is currently selected.

**Gotcha:** `aria-checked` on `role="radio"` is a boolean attribute — pass `{star === selected}` not `{star === selected ? 'true' : 'false'}`.

---

### 5. Keyboard Accessibility

Make the container the single tab stop and handle arrow keys inside it:

```tsx
<div
  role="radiogroup"
  aria-label="Product rating"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
```

```tsx
function handleKeyDown(e: React.KeyboardEvent) {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      e.preventDefault();
      setSelected(prev => Math.min(5, prev + 1));
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      e.preventDefault();
      setSelected(prev => Math.max(0, prev - 1));
      break;
    case 'Home':
      e.preventDefault();
      setSelected(1);
      break;
    case 'End':
      e.preventDefault();
      setSelected(5);
      break;
  }
}
```

**Why one tab stop?** WAI-ARIA roving tabindex pattern — the widget itself gets focus (one tab stop), and arrow keys navigate within it. This matches how native `<input type="radio">` groups work (tab moves to the group, arrows change selection within it).

---

### 6. Read-Only Mode

A read-only rating (e.g., displaying average product rating):

```tsx
function ReadOnlyStarRating({ value }: { value: number }) {
  const rounded = Math.round(value); // or use partial fill with CSS

  return (
    <div
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          aria-hidden="true"
          style={{ color: star <= rounded ? '#f59e0b' : '#d1d5db', fontSize: '1.5rem' }}
        >
          {star <= rounded ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}
```

**Key differences from interactive version:**
- `role="img"` instead of `role="radiogroup"` — it's a display, not an input
- `aria-label` on the container describes the value in words
- `aria-hidden="true"` on each star — screen readers read the container label, not individual stars
- No event handlers, no tabIndex

---

### 7. Half-Star Display

Half stars are complex to implement properly with text characters. Use CSS and a clip-path or background gradient instead:

```tsx
// Conceptual approach for a 3.7 out of 5 display:
const fullStars = Math.floor(value);    // 3
const remainder = value - fullStars;    // 0.7
const hasHalfStar = remainder >= 0.5;  // true

// Render fullStars as ★, optionally one half-star (★ with 50% fill), remainder as ☆
```

This is rarely asked in live coding rounds but worth mentioning to show awareness.

---

## Common Interview Gotchas

**Gotcha:** Putting `onMouseLeave` on each star instead of the container. This causes the hover state to flicker as the user moves between stars.

**Gotcha:** Using `star < displayValue` instead of `star <= displayValue`. A rating of 3 should fill 3 stars, not 2.

**Gotcha:** Forgetting that `hovered ?? selected` — the nullish coalescing operator — specifically handles `null` and `undefined` but NOT `0`. If `selected === 0` (no rating), `hovered ?? selected` correctly returns 0 when not hovering. Using `||` instead would fail for `selected === 0` since `0 || 0` returns 0 but `hovered || selected` when hovered is null would be `null || 0 = 0` which is fine — but `hovered || selected` when selected is 0 and hovered is 3 gives 3, which is correct... actually `??` is the more explicit and correct choice here.

**Gotcha:** Not preventing default on arrow keys. Arrow keys scroll the page by default. Always call `e.preventDefault()` for handled keyboard events.

**Gotcha:** Making each star `tabIndex={0}` individually. This creates 5 tab stops. Use the roving tabindex pattern — container gets `tabIndex={0}`, stars get `tabIndex={-1}`.

---

## Self-Assessment

- [ ] I can explain the two-state design (selected + hovered) without looking at notes
- [ ] I know why `onMouseLeave` goes on the container, not each star
- [ ] I can wire up `role="radiogroup"` + `role="radio"` + `aria-checked` from memory
- [ ] I can implement the keyboard handler (ArrowRight, ArrowLeft, Home, End)
- [ ] I know the difference between the interactive and read-only ARIA patterns
- [ ] I can implement BasicStarRating in under 4 minutes from scratch

---

## Interview Q&A

**Q: How do you handle the hover preview in a star rating? `High`**

A: Two pieces of state: `selected` (committed on click, persists) and `hovered` (preview, null when not hovering). The display fills stars up to `hovered ?? selected` — when hovering, show the hovered value; when not hovering, show the selected value. Mouse events: `onMouseEnter` on each star sets `hovered` to that star's number; `onMouseLeave` on the container (not individual stars) resets `hovered` to null. The container placement for `onMouseLeave` is critical — if you put it on each star, it fires between adjacent stars and causes flickering.

---

**Q: What ARIA pattern does a star rating use? `Medium`**

A: The radio group pattern — since a star rating is mutually exclusive selection from a fixed set, it maps semantically to radio buttons. The container gets `role="radiogroup"` with an `aria-label` describing what's being rated. Each star gets `role="radio"` with `aria-checked={star === selected}` and `aria-label="N stars"`. The container gets `tabIndex={0}` and keyboard events; individual stars get `tabIndex={-1}`. For a read-only display rating, use `role="img"` on the container with `aria-label="3.5 out of 5 stars"` and `aria-hidden="true"` on each star character.

---

**Q: How do you make it keyboard accessible? `Medium`**

A: One tab stop — the container gets `tabIndex={0}` and handles `onKeyDown`. Arrow Right/Up increments the rating (max 5), Arrow Left/Down decrements (min 0 or min 1 depending on whether "no rating" is valid), Home sets to 1, End sets to 5. Call `preventDefault` on each handled key to prevent page scrolling. This matches the WAI-ARIA roving tabindex pattern for radio groups — the group gets focus, arrow keys change selection within it.

---

**Q: What's the difference between the interactive and read-only ARIA patterns? `Low`**

A: Interactive: `role="radiogroup"` with `tabIndex={0}` for keyboard focus, each star has `role="radio"` and `aria-checked`. Read-only: `role="img"` on the container with a descriptive `aria-label` like "4 out of 5 stars", each star has `aria-hidden="true"`. The read-only version is treated as a single image — screen readers announce the label, not five separate elements. Don't give a read-only rating `tabIndex` or keyboard events.
