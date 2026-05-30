# Autocomplete / Typeahead

## Quick Reference

| Concern | Implementation |
|---|---|
| Debounce input | 300ms delay — don't filter/fetch on every keystroke |
| Filter | Case-insensitive: `items.filter(i => i.toLowerCase().includes(query.toLowerCase()))` |
| Keyboard: ArrowDown/Up | Move `activeIndex`, wrap at boundaries |
| Keyboard: Enter | Select `filteredItems[activeIndex]` |
| Keyboard: Escape | Close dropdown, reset `activeIndex` |
| Click outside | `mousedown` listener on `document`, check `!containerRef.contains(e.target)` |
| Highlight match | Split on query, wrap match segment in `<mark>` |
| Race conditions (async) | `AbortController` — same pattern as `useFetch` |
| ARIA: input | `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-autocomplete="list"`, `aria-activedescendant` |
| ARIA: list | `role="listbox"` |
| ARIA: each option | `role="option"`, `aria-selected` |

---

## Why This Matters

Autocomplete is the highest-frequency UI component question in live coding rounds. It combines:

- State management (query, isOpen, selectedValue, activeIndex)
- Performance (debounce)
- User interaction (keyboard, mouse, click-outside)
- Accessibility (ARIA combobox pattern)
- Edge cases (empty results, loading, error)

A complete implementation touches almost every React skill an interviewer cares about. Even if you're not asked for the full ARIA version, knowing the structure impresses interviewers.

---

## Core Concepts

### Component State

```tsx
const [query, setQuery] = useState('');
const [isOpen, setIsOpen] = useState(false);
const [activeIndex, setActiveIndex] = useState(-1);  // -1 = nothing active
const [selected, setSelected] = useState<string | null>(null);
const debouncedQuery = useDebounce(query, 300);       // for async; skip for sync filter
```

### Filtering (Synchronous)

```tsx
const filtered = useMemo(
  () => ITEMS.filter(item =>
    item.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8), // limit to 8 results
  [query]
);
```

Open the dropdown when `query` is non-empty and `filtered.length > 0`.

### Keyboard Navigation

```tsx
function handleKeyDown(e: React.KeyboardEvent) {
  if (!isOpen) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault(); // prevent page scroll
      setActiveIndex(i => (i + 1) % filtered.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
      break;
    case 'Enter':
      if (activeIndex >= 0) {
        selectItem(filtered[activeIndex]);
      }
      break;
    case 'Escape':
      setIsOpen(false);
      setActiveIndex(-1);
      break;
  }
}
```

### Click Outside to Close

```tsx
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleMouseDown(e: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', handleMouseDown);
  return () => document.removeEventListener('mousedown', handleMouseDown);
}, []);
```

Use `mousedown` (not `click`) so the handler fires before the blur event on the input. Using `click` can cause the list to close before the option's `onClick` fires.

### Highlight Matching Text

```tsx
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff176', padding: 0 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}
```

### ARIA Combobox Pattern

```tsx
<input
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-autocomplete="list"
  aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
  value={query}
  onChange={e => setQuery(e.target.value)}
  onKeyDown={handleKeyDown}
/>
<ul role="listbox" id="suggestions-list">
  {filtered.map((item, i) => (
    <li
      key={item}
      id={`option-${i}`}
      role="option"
      aria-selected={i === activeIndex}
      onMouseDown={() => selectItem(item)}  // mousedown, not onClick!
    >
      <HighlightedText text={item} query={query} />
    </li>
  ))}
</ul>
```

---

## Common Interview Gotchas

1. **Using `onClick` on options instead of `onMouseDown`**: The input loses focus on mousedown, firing `onBlur` which may close the dropdown before `onClick` fires. Use `onMouseDown` + `e.preventDefault()` on the option to keep focus on the input.

2. **Not resetting `activeIndex` when the query changes**: If you have item 2 active and type another character, filtered results change — activeIndex 2 may now point to a different item. Reset to -1 on query change.

3. **Forgetting to wrap at boundaries**: ArrowDown on the last item should go to index 0. ArrowUp on index 0 should go to the last item. Use modulo arithmetic.

4. **No `aria-activedescendant`**: Screen readers need to know which option is "active" (focused via keyboard) even when DOM focus stays on the input. The `aria-activedescendant` value must match the active option's `id`.

5. **Showing dropdown with empty query**: Only open the dropdown when there's a query to filter on (or show a "type to search" message).

---

## Self-Assessment

- [ ] I can build a functional autocomplete with filtering in under 10 minutes
- [ ] I can add keyboard navigation (ArrowDown/Up/Enter/Escape) correctly
- [ ] I know why `onMouseDown` is used instead of `onClick` for list items
- [ ] I can implement click-outside using `mousedown` on document
- [ ] I know the ARIA combobox pattern: roles and required attributes
- [ ] I can highlight the matching portion of each result

---

## Interview Q&A

**Q: How do you prevent the dropdown from closing when clicking an option? `High`**

A: Use `onMouseDown` on the option instead of `onClick`, and call `e.preventDefault()`. The sequence of events when clicking an option: `mousedown` → `blur` (on input) → `click`. If closing the dropdown on `blur`, the list disappears before `onClick` fires. `onMouseDown` fires first. Calling `e.preventDefault()` cancels the focus-stealing behavior, keeping focus on the input so the item's handler can process normally.

---

**Q: What ARIA pattern does a typeahead/autocomplete use? `High`**

A: The combobox pattern. The input element gets `role="combobox"`, `aria-expanded` (true/false based on dropdown state), `aria-haspopup="listbox"`, `aria-autocomplete="list"`, and `aria-activedescendant` pointing to the ID of the currently keyboard-focused option. The dropdown list gets `role="listbox"`. Each option gets `role="option"` and `aria-selected`. This allows screen readers to announce the number of results, which option is highlighted, and when the dropdown opens/closes.

---

**Q: How do you handle the race condition if each keystroke fires an async API call? `High`**

A: Same pattern as `useFetch` — use `AbortController`. In the `useEffect` that triggers on the debounced query, create a new `AbortController` each time, pass `signal` to `fetch()`, and return `() => controller.abort()` from the effect. When the debounced query changes, the cleanup aborts the previous fetch before the new one starts, ensuring only the latest request can update the results list.

---

**Q: Why debounce the search input instead of filtering on every keystroke? `Medium`**

A: For a synchronous in-memory filter over a small dataset, you don't need to debounce — filtering is fast. But if the filter triggers an API call, debouncing is essential. Without debouncing, every keystroke fires a new network request. A user typing "react" would fire 5 requests: "r", "re", "rea", "reac", "react" — all but the last are wasted. 300ms debounce means only one request fires after the user stops typing.

---

**Q: How do you implement the "highlighted match" feature? `Medium`**

A: Find the position of the query string within each result using `indexOf`. Split the result string into three parts: before the match, the match itself, and after the match. Wrap the match portion in a `<mark>` element with a highlight background. Be careful to do the search case-insensitively (`toLowerCase()`) but display the original casing. This technique is O(n) per item and works without regex, avoiding regex special character issues.
