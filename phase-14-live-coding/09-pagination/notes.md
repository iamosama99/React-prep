# Pagination

## Quick Reference

| Concept | Formula / Pattern |
|---|---|
| Total pages | `Math.ceil(totalItems / itemsPerPage)` |
| Slice for page N | `items.slice((page - 1) * perPage, page * perPage)` |
| Disable Prev | `currentPage === 1` |
| Disable Next | `currentPage === totalPages` |
| ARIA nav | `<nav aria-label="Pagination">` |
| Active page | `aria-current="page"` on the active button |
| Ellipsis type | `type PageItem = number \| 'ellipsis'` |

---

## Why This Matters

Pagination tests three skills interviewers care about simultaneously:

1. **Math** — deriving totalPages, slice offsets, clamping page numbers
2. **Algorithm** — the ellipsis sequence is a compact but tricky problem
3. **UX details** — disabling buttons, ARIA, keyboard accessibility, edge cases (1 page, last page)

The ellipsis algorithm specifically is a common "implement this helper function" ask because it looks simple but has several edge cases interviewers use to probe how methodical you are.

---

## Core Concepts

### 1. Key Derived Values

```tsx
const totalPages = Math.ceil(totalItems / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
const visibleItems = items.slice(startIndex, endIndex);
```

Always use `Math.ceil` for totalPages — if you have 47 items and 5 per page, you need 10 pages (not 9.4).

---

### 2. The Ellipsis Algorithm

The goal: show pages 1, totalPages, and a window around currentPage. Insert `'ellipsis'` in the gaps.

```
current = 5, total = 10  →  [1, '...', 4, 5, 6, '...', 10]
current = 2, total = 10  →  [1, 2, 3, '...', 10]
current = 9, total = 10  →  [1, '...', 8, 9, 10]
current = 1, total = 5   →  [1, 2, 3, 4, 5]   (no ellipsis needed)
```

**Step-by-step implementation:**

```tsx
type PageItem = number | 'ellipsis';

function getPageNumbers(current: number, total: number): PageItem[] {
  if (total <= 1) return [1];

  // Step 1: Build the set of page numbers to always show
  const pageSet = new Set<number>();
  pageSet.add(1);
  pageSet.add(total);
  // Window: current-1, current, current+1 (clamped to valid range)
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
    pageSet.add(i);
  }

  // Step 2: Sort
  const sorted = Array.from(pageSet).sort((a, b) => a - b);

  // Step 3: Insert 'ellipsis' between non-consecutive numbers
  const result: PageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
}
```

**Gotcha:** When the gap between two consecutive shown pages is exactly 2 (e.g., pages 3 and 5), inserting an ellipsis for page 4 is worse than just showing page 4. Handle this edge case by checking if the gap is more than 1:

```tsx
// If the gap is exactly 2, show the page instead of '...'
// e.g., [1, '...', 3] → just show [1, 2, 3] instead
```

A cleaner approach: check if `sorted[i] - sorted[i-1] === 2` and insert the missing page instead of an ellipsis. This avoids a `...` that hides only one number.

```tsx
for (let i = 0; i < sorted.length; i++) {
  if (i > 0) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap === 2) {
      result.push(sorted[i] - 1); // show the single missing page
    } else if (gap > 2) {
      result.push('ellipsis');
    }
  }
  result.push(sorted[i]);
}
```

---

### 3. Rendering Ellipsis

The `PageItem` union type lets you handle both cases cleanly:

```tsx
{pages.map((page, i) =>
  page === 'ellipsis' ? (
    <span key={`ellipsis-${i}`} aria-hidden="true" style={{ padding: '0 0.5rem' }}>
      …
    </span>
  ) : (
    <button
      key={page}
      onClick={() => onPageChange(page)}
      aria-current={page === currentPage ? 'page' : undefined}
      disabled={page === currentPage}
      style={{ fontWeight: page === currentPage ? 700 : 400 }}
    >
      {page}
    </button>
  )
)}
```

**Gotcha:** The ellipsis `<span>` should have `aria-hidden="true"` — it's visual decoration. Screen readers will announce the page numbers directly.

---

### 4. ARIA

```tsx
<nav aria-label="Pagination">
  <button
    disabled={currentPage === 1}
    onClick={() => onPageChange(currentPage - 1)}
    aria-label="Previous page"
  >
    ← Prev
  </button>

  {/* page buttons with aria-current="page" on the active one */}

  <button
    disabled={currentPage === totalPages}
    onClick={() => onPageChange(currentPage + 1)}
    aria-label="Next page"
  >
    Next →
  </button>
</nav>
```

Key ARIA attributes:
- `<nav aria-label="Pagination">` — landmark, distinct from other navs on the page
- `aria-current="page"` — marks the currently active page
- `disabled` — use the real `disabled` attribute, not `aria-disabled`, for buttons you want to be inert (disabled buttons are automatically skipped by screen readers)

**Gotcha:** `aria-current` takes a string value (`"page"`) not a boolean. Pass `undefined` for inactive pages — passing `aria-current={false}` is technically valid but verbose.

---

### 5. Controlled vs Uncontrolled

**Controlled** — parent manages `currentPage`:

```tsx
// Parent:
const [page, setPage] = useState(1);
<Pagination currentPage={page} totalItems={100} itemsPerPage={10} onPageChange={setPage} />
```

**Uncontrolled** — pagination manages its own state (simpler but can't sync to URL):

```tsx
function Pagination({ totalItems, itemsPerPage }: { totalItems: number; itemsPerPage: number }) {
  const [currentPage, setCurrentPage] = useState(1);
  // ...
}
```

Controlled is almost always the right choice because page state usually needs to:
- Sync to URL query params (`?page=3`)
- Trigger server-side data fetching
- Be reset when filters change

---

### 6. Edge Cases

| Edge case | Behavior |
|---|---|
| `totalPages === 1` | Show only page 1. No Prev/Next needed (or disable both). |
| `currentPage === 1` | Disable Prev button |
| `currentPage === totalPages` | Disable Next button |
| `totalItems === 0` | Show nothing or "No results" — `totalPages` will be 0 or NaN without guard |

Guard for zero items:

```tsx
if (totalItems === 0) return null; // or return <p>No results</p>
const totalPages = Math.ceil(totalItems / itemsPerPage); // safe now
```

---

## Common Interview Gotchas

**Gotcha:** Off-by-one on the slice. Page 1 → indices 0..4. Page 2 → indices 5..9. Formula: `(page - 1) * perPage` for start, `page * perPage` for end. Don't use `page * perPage - perPage` (same thing but harder to read).

**Gotcha:** Forgetting `Math.min` on the end index. `items.slice(0, 50)` on a 47-item array is fine (slice doesn't throw), but being explicit with `Math.min(startIndex + perPage, totalItems)` shows attention to detail.

**Gotcha:** Using a string for `aria-current` — it's `aria-current="page"` not `aria-current={true}`.

**Gotcha:** The ellipsis key. If you use `key="ellipsis"` and there are two ellipsis elements (one before the window, one after), React will warn about duplicate keys. Use `key={\`ellipsis-${i}\`}` with the index.

**Gotcha:** Inserting an ellipsis when the gap is only one page (e.g., `[1, ..., 3]`). Show the actual page instead.

---

## Self-Assessment

- [ ] I can derive totalPages, startIndex, endIndex from first principles in under 30 seconds
- [ ] I can implement `getPageNumbers` with ellipsis from memory
- [ ] I know to check for gap === 2 and show the page directly instead of '...'
- [ ] I can wire up `<nav aria-label="Pagination">` and `aria-current="page"` correctly
- [ ] I know when to disable Prev/Next buttons (not just style them differently)
- [ ] I can handle the edge case of totalItems === 0

---

## Interview Q&A

**Q: Walk me through the ellipsis algorithm. `High`**

A: I build the set of page numbers to always show — page 1, totalPages, and currentPage minus-one through currentPage plus-one clamped to valid range. Then I sort the set and iterate, inserting `'ellipsis'` between non-consecutive numbers. One edge case: if the gap between two shown pages is exactly 2, I insert the single missing page instead of an ellipsis (you'd never show `[1, ..., 3]` when you can just show `[1, 2, 3]`). The result type is `(number | 'ellipsis')[]` which I use to conditionally render a span or button.

---

**Q: What ARIA does pagination need? `Medium`**

A: Wrap the whole thing in `<nav aria-label="Pagination">` to create a landmark — the label distinguishes it from other navs on the page. The active page button gets `aria-current="page"`. Use the real `disabled` attribute (not `aria-disabled`) on Prev/Next when at the boundary — disabled buttons are fully inert and skipped in the tab order by screen readers. The ellipsis spans should have `aria-hidden="true"` since they're decorative.

---

**Q: Controlled vs uncontrolled — which do you use and why? `Low`**

A: Controlled almost always. Page number is rarely local state — it almost always needs to sync to URL query params for shareable links and back-button support, and it needs to reset to page 1 when search filters change. With controlled pagination, the parent that owns the data also owns the page number, so a filter change can `setPage(1)` alongside updating the filter state. Uncontrolled is fine only for a completely isolated "local" list with no URL or external state concerns.

---

**Q: What happens if totalItems is 0? `Low`**

A: `Math.ceil(0 / itemsPerPage)` is 0, so `totalPages` is 0. Without a guard, you'd render a Next button pointing to page 1 of 0 and a Prev button disabled on page 1 of 0. The clean solution is to return `null` or a "No results" message if `totalItems === 0` before calculating anything. Guard at the top of the component.

---

**Q: How do you sync pagination to the URL? `Medium`**

A: Read `currentPage` from the URL search params (`useSearchParams` in React Router, `searchParams` in Next.js App Router) instead of `useState`. Wrap `onPageChange` to update the search param: `router.push({ search: \`?page=\${page}\` })`. This gives you free back/forward navigation, shareable links, and bookmarkable paginated views. Reset to page 1 on filter changes by updating both the filter and the page param simultaneously.
