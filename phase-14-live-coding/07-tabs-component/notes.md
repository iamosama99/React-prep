# Tabs Component

## Quick Reference

| Concern | Implementation |
|---|---|
| ARIA: tab container | `role="tablist"` |
| ARIA: each tab button | `role="tab"`, `aria-selected`, `aria-controls="panel-id"`, `id="tab-id"` |
| ARIA: each panel | `role="tabpanel"`, `aria-labelledby="tab-id"`, `id="panel-id"`, `tabIndex={0}` |
| Keyboard: ArrowLeft/Right | Switch AND focus the adjacent tab (roving tabindex) |
| Keyboard: Home/End | Jump to first/last tab |
| Keyboard: Tab | Move from tablist into active panel (not other tabs) |
| Roving tabindex | Active tab: `tabIndex={0}`. All others: `tabIndex={-1}` |
| Rendering: lazy | Only mount active panel — faster initial render |
| Rendering: eager | Mount all panels, use `hidden` attribute — preserves scroll/form state |

---

## Why This Matters

Tabs are ubiquitous in UIs, and the ARIA tablist pattern is one of the most tested accessible component patterns. Interviewers ask for tabs because:

1. The ARIA pattern is specific and requires knowing the right roles and attributes
2. Roving tabindex is a technique that appears repeatedly (tabs, toolbars, menus)
3. The keyboard behavior is non-obvious: arrow keys navigate tabs, Tab jumps to the panel
4. Controlled vs. uncontrolled is a relevant design choice to discuss

---

## Core Concepts

### Data Shape

```tsx
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', content: <Overview /> },
  { id: 'specs', label: 'Specs', content: <Specs /> },
  { id: 'reviews', label: 'Reviews', content: <Reviews /> },
];
```

### Uncontrolled (self-managing) vs Controlled

```tsx
// Uncontrolled — tabs own the state
function Tabs({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  // ...
}

// Controlled — parent owns the state (allows external control)
function Tabs({ tabs, activeId, onChange }: { tabs: Tab[]; activeId: string; onChange: (id: string) => void }) {
  // ...
}
```

Uncontrolled is simpler and works for most cases. Controlled is needed when the parent needs to respond to tab changes or initialize to a specific tab based on URL/props.

### The Roving Tabindex Pattern

In a tablist, only one tab is in the natural tab order at a time. Arrow keys move between tabs within the list. Tab moves focus OUT of the tablist into the active panel.

```tsx
// Tab button props:
tabIndex={activeId === tab.id ? 0 : -1}
// Active tab: tabIndex 0 = in tab order
// Other tabs: tabIndex -1 = focusable programmatically but not via Tab key
```

When arrow keys change the active tab, you must also programmatically focus the new tab:
```tsx
const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

function goToTab(index: number) {
  setActiveId(tabs[index].id);
  tabRefs.current[index]?.focus(); // Move DOM focus to match
}
```

### Keyboard Handler

```tsx
function handleKeyDown(e: React.KeyboardEvent, index: number) {
  const count = tabs.length;
  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      goToTab((index + 1) % count);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      goToTab((index - 1 + count) % count);
      break;
    case 'Home':
      e.preventDefault();
      goToTab(0);
      break;
    case 'End':
      e.preventDefault();
      goToTab(count - 1);
      break;
    // Tab and Shift+Tab are NOT intercepted — they move to the panel naturally
  }
}
```

### Full ARIA Structure

```tsx
<div>
  {/* Tablist */}
  <div role="tablist" aria-label="Product information">
    {tabs.map((tab, i) => (
      <button
        key={tab.id}
        id={`tab-${tab.id}`}
        role="tab"
        aria-selected={activeId === tab.id}
        aria-controls={`panel-${tab.id}`}
        tabIndex={activeId === tab.id ? 0 : -1}
        ref={el => { tabRefs.current[i] = el; }}
        onClick={() => setActiveId(tab.id)}
        onKeyDown={e => handleKeyDown(e, i)}
      >
        {tab.label}
      </button>
    ))}
  </div>

  {/* Panels */}
  {tabs.map(tab => (
    <div
      key={tab.id}
      id={`panel-${tab.id}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab.id}`}
      tabIndex={0}           // Panel is focusable — Tab from tablist lands here
      hidden={activeId !== tab.id}  // hidden attribute: accessible + hides visually
    >
      {tab.content}
    </div>
  ))}
</div>
```

### Lazy vs Eager Rendering

```tsx
// Lazy — only mount active panel (default)
{tabs.find(t => t.id === activeId)?.content}
// Pro: faster initial render
// Con: resets scroll, form state, and re-runs effects on every tab switch

// Eager — mount all panels, show/hide with `hidden`
{tabs.map(tab => (
  <div key={tab.id} hidden={activeId !== tab.id}>
    {tab.content}
  </div>
))}
// Pro: preserves scroll position, form state, mounted component state
// Con: renders all content upfront (use Suspense to defer expensive panels)
```

---

## Common Interview Gotchas

1. **Intercepting Tab key in the tablist**: Don't intercept Tab — it should naturally move focus to the active panel. Only arrow keys navigate within the tablist.

2. **Not focusing the tab after arrow key navigation**: Setting `activeId` re-renders with new `tabIndex={0}` on the active tab, but the browser's focus doesn't follow state — you must call `.focus()` explicitly.

3. **Forgetting `tabIndex={0}` on panels**: Without it, Tab from the tablist would skip over the panel entirely and move to whatever comes after the tabs section.

4. **Using the wrong `hidden` attribute**: HTML `hidden` is equivalent to `display: none` but is also understood by accessibility APIs (screen readers ignore hidden content). `visibility: hidden` or `opacity: 0` are NOT accessible — the content remains in the tab order.

5. **Not linking tabs to panels with `aria-controls` / `aria-labelledby`**: These form the accessible relationship. Screen readers announce "Tab X — controls Panel X" using these IDs.

---

## Self-Assessment

- [ ] I know all four ARIA attributes needed on a tab button
- [ ] I know all three ARIA attributes needed on a tab panel
- [ ] I understand roving tabindex: which tab gets tabIndex 0, which get -1
- [ ] I know which keys navigate within the tablist (arrows) vs. move out (Tab)
- [ ] I remember to call `.focus()` when changing tabs with arrow keys
- [ ] I can explain lazy vs. eager rendering and when to use each

---

## Interview Q&A

**Q: What ARIA attributes does a tabs component need? `High`**

A: The tablist container gets `role="tablist"`. Each tab button gets `role="tab"`, `aria-selected` (true/false), `aria-controls` pointing to its panel's ID, and its own `id`. Each panel gets `role="tabpanel"`, `aria-labelledby` pointing to its tab's ID, its own `id`, and `tabIndex={0}` so it's reachable by Tab from the tablist. This gives screen readers full context: "Tab 1 of 3, selected, controls Panel 1" and announces the panel when focus enters it.

---

**Q: How do arrow keys work in a tablist, and why don't you intercept the Tab key? `High`**

A: Arrow keys navigate between tabs within the tablist AND move DOM focus — both `activeId` updates and `tabRefs.current[newIndex].focus()` are called. The Tab key is left alone: pressing Tab while on a tab button moves focus into the active panel, because the panel has `tabIndex={0}`. This is the intended keyboard flow: Tab gets you into/out of the tab widget; arrow keys navigate within the tabs; Tab again exits through the panel content. Intercepting Tab would break this flow and trap keyboard users.

---

**Q: What is the roving tabindex pattern? `High`**

A: Roving tabindex is a pattern for managing focus within a widget that contains multiple focusable items (like a tablist, toolbar, or menu). Only one item in the widget has `tabIndex={0}` at a time — the currently active/selected item. All others have `tabIndex={-1}`. This means Tab moves focus IN and OUT of the widget as a single unit, while arrow keys move focus WITHIN the widget. As the selection changes via arrow keys, you update which element has `tabIndex={0}` and call `.focus()` on it programmatically.

---

**Q: What is the difference between lazy and eager tab panel rendering? `Medium`**

A: Lazy rendering only mounts the active panel in the DOM (`activeId === tab.id ? content : null`). It's efficient — inactive content is not rendered — but switching tabs re-mounts the panel, resetting scroll position, form input state, and re-running useEffect hooks. Eager rendering mounts all panels at once but hides inactive ones with the `hidden` attribute (`hidden={activeId !== tab.id}`). Inactive panels remain mounted in the DOM, preserving all state, but with the cost of rendering all content upfront. Use lazy for performance-sensitive cases; use eager when preserving panel state matters (e.g., a tab with a form the user is filling out).

---

**Q: Why use the HTML `hidden` attribute instead of `display: none` in CSS for inactive panels? `Low`**

A: They produce the same visual result (`hidden` sets `display: none` in the browser's default stylesheet), but the HTML `hidden` attribute is semantically meaningful to accessibility tools — screen readers know the content is intentionally hidden and skip it. Additionally, `hidden` is easy to toggle with a simple boolean prop (`hidden={!isActive}`), and it avoids inline styles or CSS class management. One caveat: if your CSS gives `display: flex` or another `display` value to the panel, it will override `hidden`. In that case, explicitly setting `display: none` in CSS or using the `visibility` approach may be needed.
