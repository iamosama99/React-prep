# Keyboard Navigation

## Why This Matters

Keyboard navigation is required for users who can't use a mouse: motor disabilities, power users, people with temporary injuries, screen reader users (who primarily use keyboard). WCAG 2.1 Success Criterion 2.1.1 requires all functionality to be operable via keyboard.

The bar for senior engineers isn't "know that keyboard nav matters" — it's knowing the specific patterns, when to implement them, and the gotchas.

---

## The Tab Order

Tab moves focus forward through interactive elements. Shift+Tab moves backward. The order is determined by DOM order by default.

```tsx
// ✅ DOM order matches visual order — correct
<button>First</button>
<button>Second</button>
<button>Third</button>

// ❌ Visual order differs from DOM order (CSS reorder via flex/grid)
// This is a common bug: display: flex + order: changes visual position
// but Tab follows DOM order, not visual order
<div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
  <button>Visually last, but first in Tab order</button>
  <button>Visually first, but last in Tab order</button>
</div>
```

Keep DOM order and visual order in sync. If you reorder with CSS, reorder the DOM too.

---

## Interactive Element Requirements

Native interactive elements (`<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`) handle keyboard out of the box. Custom interactive elements need explicit handling.

```tsx
// Correct: button handles Enter, Space, focus, click
<button onClick={handleAction}>Do something</button>

// Custom interactive element — needs everything manually
<div
  role="button"
  tabIndex={0}
  onClick={handleAction}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // prevent page scroll on Space
      handleAction();
    }
  }}
>
  Do something
</div>
```

Don't do this if you can use `<button>`. The native element is always better.

---

## Escape to Close

Any overlay (modal, popover, dropdown, tooltip, combobox list) should close on Escape. This is a WCAG requirement and user expectation.

```tsx
useEffect(() => {
  if (!isOpen) return;

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isOpen, onClose]);
```

After closing, return focus to the trigger element (covered in focus management).

---

## Arrow Key Navigation

For composite widgets — menus, tab lists, listboxes, toolbars — arrow keys move between items. Tab moves the user out of the widget entirely. This is the "roving tabindex" pattern.

**Why:** A menu with 20 items shouldn't require 20 Tab presses. Arrow keys navigate within the widget; Tab exits it.

```tsx
function Menu({ items }: { items: MenuItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = (index + 1) % items.length;
        setActiveIndex(next);
        itemRefs.current[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = (index - 1 + items.length) % items.length;
        setActiveIndex(prev);
        itemRefs.current[prev]?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        setActiveIndex(0);
        itemRefs.current[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = items.length - 1;
        setActiveIndex(last);
        itemRefs.current[last]?.focus();
        break;
      }
    }
  }

  return (
    <ul role="menu">
      {items.map((item, index) => (
        <li key={item.id} role="none">
          <button
            role="menuitem"
            ref={el => { itemRefs.current[index] = el; }}
            tabIndex={index === activeIndex ? 0 : -1} // roving tabindex
            onKeyDown={(e) => handleKeyDown(e, index)}
            onClick={item.action}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

**Roving tabindex:** Only the active item has `tabIndex={0}`. All others have `tabIndex={-1}`. When the user Tabs into the widget, only the active item is reachable. Arrow keys move focus and update which item has `tabIndex={0}`.

---

## Tab Key Patterns by Widget

| Widget | Tab behavior | Arrow key behavior |
|---|---|---|
| Modal | Cycles within modal | — |
| Menu | Exits menu | Up/Down through items |
| Tablist | Exits tablist | Left/Right between tabs |
| Listbox | Exits listbox | Up/Down through options |
| Toolbar | Exits toolbar | Left/Right between controls |
| Grid | Moves between cells (if interactive) | Moves between cells |

---

## Keyboard Shortcut Conflicts

Custom keyboard shortcuts should use modifier keys (Ctrl, Alt, Meta) to avoid overriding browser shortcuts or screen reader commands.

```tsx
useEffect(() => {
  function handleShortcut(e: KeyboardEvent) {
    // ❌ Just '/' — intercepts browser find-in-page or screen reader shortcuts
    if (e.key === '/') openSearch();

    // ✅ Ctrl+K — standard pattern used by many apps, avoids OS conflicts
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  }

  document.addEventListener('keydown', handleShortcut);
  return () => document.removeEventListener('keydown', handleShortcut);
}, []);
```

Don't intercept single-character keys without a modifier — screen readers use them for navigation commands.

---

## Testing Keyboard Navigation

Manual test procedure:
1. Unplug your mouse
2. Tab through the entire flow you built
3. Verify every interactive element is reachable
4. Verify Tab order matches visual order
5. Verify Escape closes all overlays
6. Verify arrow keys work in composite widgets
7. Verify focus is visible throughout

Automated tools (axe-core, Jest + `@testing-library/user-event`) can catch missing `tabIndex` and ARIA role mismatches but can't fully test keyboard interaction flows.

---

> **Check yourself:** You've built a custom autocomplete. What keyboard interactions do you need? Arrow Down/Up to navigate suggestions, Enter to select, Escape to dismiss the list, Tab to move out of the input. The input should have `aria-expanded`, `aria-haspopup="listbox"`, `aria-autocomplete`, and `aria-activedescendant` pointing to the currently highlighted option.

---

## Self-Assessment

- [ ] I understand why DOM order must match visual order for Tab navigation
- [ ] I know what the "roving tabindex" pattern is and when to use it
- [ ] I know which widgets use arrow key navigation (and which don't)
- [ ] I know how to implement Escape-to-close and return focus to the trigger
- [ ] I understand why single-character keyboard shortcuts can conflict with screen readers

---

## Interview Q&A

**Q: What is the roving tabindex pattern and why is it used? `High`**

A: In a composite widget (menu, tablist, toolbar), only one item should be in the natural tab order at a time — the others have `tabIndex={-1}`. Arrow keys move focus between items and update which item has `tabIndex={0}`. This means a user pressing Tab into a 20-item menu lands on one item and presses Tab again to exit — they use arrow keys to navigate within. Without this, users must Tab through every item to reach the next focusable element outside the widget.

---

**Q: Why should overlays close on Escape? `High`**

A: It's a universal expectation established by decades of desktop UI conventions and codified in WCAG 2.1 SC 1.4.13 (for components that appear on hover/focus) and multiple ARIA authoring practices. Users — especially screen reader users and keyboard users — need a predictable way to dismiss overlays and return to their prior context. Escape is that universal dismiss key. If an overlay doesn't close on Escape, keyboard users may become trapped.

---

**Q: When should you use arrow keys vs Tab for navigation? `Medium`**

A: Tab navigates between distinct, independent interactive elements across the page. Arrow keys navigate within a composite widget — a group of items that logically belong together (menu items, tabs, list options, radio buttons in a group). If you're building a widget where the user would naturally expect arrow key navigation (like a dropdown menu), implement it. If your component is a simple group of independent buttons, Tab is correct.

---

**Q: What problem does CSS visual reordering create for keyboard users? `Medium`**

A: CSS properties like `flex-direction: row-reverse`, `order`, and CSS Grid placement can make the visual order differ from the DOM order. Tab follows the DOM order, not the visual order. A user tabbing through the page lands on elements in a sequence that contradicts what they see — which is disorienting and potentially unusable. WCAG 2.1 SC 1.3.2 (Meaningful Sequence) requires that the reading and focus order match the visual presentation. Fix by reordering the DOM to match the intended visual order, rather than relying purely on CSS reordering.
