# Modal / Dialog

## Quick Reference

| Concern | Implementation |
|---|---|
| Portal | `createPortal(children, document.body)` — escapes parent stacking context |
| Focus on open | `dialogRef.current?.focus()` in useEffect when `isOpen` becomes true |
| Focus return on close | Save `document.activeElement` before opening, restore in cleanup |
| Focus trap | `querySelectorAll` focusable elements, intercept Tab/Shift+Tab at boundaries |
| Escape to close | `keydown` listener on `document` when modal is open |
| Backdrop click | `onClick={onClose}` on overlay, `e.stopPropagation()` on modal content |
| Scroll lock | `document.body.style.overflow = 'hidden'` on open, restore on close |
| ARIA | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to `<h2>` id, `tabIndex={-1}` on dialog div |

---

## Why This Matters

The modal is a foundational UI pattern that every senior React developer must be able to implement correctly. Interviewers use it to test:

1. `createPortal` — understanding of the React/DOM boundary
2. Focus management — the three focus requirements (in/trap/return)
3. Event handling — escape key, backdrop click
4. ARIA — the dialog pattern
5. Side effects — scroll lock, cleanup

The gap between a basic modal (portal + open/close) and a correct modal (focus management + ARIA) is exactly where seniority shows. Junior candidates implement the basic version. Senior candidates implement all three focus requirements without being prompted.

---

## Core Concepts

### Why createPortal?

```tsx
// Problem: parent has `overflow: hidden` or a z-index stacking context
<div style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}>
  <Modal /> {/* This modal is CLIPPED by parent overflow:hidden */}
</div>

// Solution: render to document.body, outside all parent constraints
createPortal(<ModalContent />, document.body);
```

Even though the portal renders to `document.body` in the DOM, it remains in the React component tree — context, events, and refs all work normally.

### Basic Modal Structure

```tsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}           // backdrop click closes
    >
      <div
        style={{ background: '#fff', borderRadius: '8px', padding: '2rem', maxWidth: '500px', width: '90%' }}
        onClick={e => e.stopPropagation()}  // prevent backdrop click
      >
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}
```

### Three Focus Management Requirements

**Requirement 1: Move focus IN on open**
```tsx
const dialogRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus();
  }
}, [isOpen]);
```
The dialog div needs `tabIndex={-1}` to be programmatically focusable without appearing in the tab order.

**Requirement 2: Return focus on close**
```tsx
// Save reference BEFORE opening
const triggerRef = useRef<HTMLElement | null>(null);

function openModal() {
  triggerRef.current = document.activeElement as HTMLElement;
  setIsOpen(true);
}

// In the focus effect cleanup:
useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus();
    return () => {
      triggerRef.current?.focus(); // Restore on close
    };
  }
}, [isOpen]);
```

**Requirement 3: Trap focus inside the modal**
```tsx
const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

useEffect(() => {
  if (!isOpen) return;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

### Scroll Lock

```tsx
useEffect(() => {
  if (isOpen) {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }
}, [isOpen]);
```

### ARIA Pattern

```tsx
<div
  ref={dialogRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabIndex={-1}
>
  <h2 id="modal-title">{title}</h2>
  {/* content */}
</div>
```

- `role="dialog"` — announces to screen readers that this is a dialog
- `aria-modal="true"` — tells screen readers to treat content outside as inert
- `aria-labelledby` — links the dialog to its title for announcement
- `tabIndex={-1}` — allows programmatic focus without tab-order inclusion

---

## Common Interview Gotchas

1. **Not using `tabIndex={-1}` on the dialog**: Without it, `focus()` on the dialog div does nothing. Elements must have `tabIndex` to receive programmatic focus (unless they're natively focusable like buttons/inputs).

2. **Restoring focus to `document.body`**: If you don't save the trigger element reference, you restore focus to the body — the user's keyboard position is lost. Always save `document.activeElement` before opening.

3. **Using `onClick` for backdrop close but forgetting `stopPropagation`**: Clicking the modal content bubbles up to the overlay's `onClick`, closing the modal unexpectedly. Always call `e.stopPropagation()` on the inner content div.

4. **Using `return null` vs `display: none` for closed state**: Returning `null` means the DOM is completely removed, which triggers the focus management effects correctly. `display: none` keeps the DOM, which can cause issues with focus management.

5. **Not cleaning up the scroll lock**: If the component unmounts while the modal is open (e.g., route change), `overflow: hidden` stays on the body forever. The useEffect cleanup handles this.

---

## Self-Assessment

- [ ] I can implement a portal-based modal from scratch
- [ ] I know all three focus management requirements and can implement each
- [ ] I know the ARIA dialog pattern: role, aria-modal, aria-labelledby, tabIndex
- [ ] I can implement a focus trap using `querySelectorAll` and Tab interception
- [ ] I remember to clean up: scroll lock, event listeners, focus restoration
- [ ] I know why `createPortal` is necessary and what problem it solves

---

## Interview Q&A

**Q: Why do you need `createPortal` for a modal? `High`**

A: To escape the CSS stacking context and `overflow: hidden` constraints of parent elements. If a modal is rendered inside a `position: relative` parent with `overflow: hidden`, the modal gets clipped. Even with high `z-index`, it can't escape a parent's stacking context. `createPortal` renders the modal's DOM nodes as a direct child of `document.body`, outside all parent constraints, while keeping it in the React component tree — context and event propagation still work normally.

---

**Q: What are the three focus management requirements for an accessible modal? `High`**

A: First, move focus into the modal when it opens — programmatically call `focus()` on the dialog container or the first focusable element inside it. Second, trap focus while the modal is open — intercept `Tab` and `Shift+Tab` key events and cycle focus within the modal's focusable elements, preventing focus from reaching content behind the modal. Third, return focus to the trigger element when the modal closes — save a reference to `document.activeElement` before opening and restore it when closing. Failing any of these makes the modal unusable for keyboard users and screen reader users.

---

**Q: How do you implement a focus trap? `High`**

A: Query all focusable elements inside the dialog using a selector like `'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'`. Add a `keydown` listener to the document. When `Tab` is pressed and focus is on the last focusable element, call `e.preventDefault()` and move focus to the first. When `Shift+Tab` is pressed and focus is on the first element, move to the last. Remove the listener in the useEffect cleanup. Also listen for `Escape` in the same handler to close the modal.

---

**Q: What is `aria-modal="true"` and why isn't it enough on its own for focus trapping? `Medium`**

A: `aria-modal="true"` on a dialog tells screen readers that the content outside the dialog should be treated as inert — they shouldn't browse to it. This works for screen readers but does nothing for keyboard users navigating with Tab. A sighted keyboard user can still Tab out of the modal into background content. You need both `aria-modal="true"` (for screen readers) and a programmatic focus trap (for keyboard users). For full accessibility, you can also add the `inert` attribute to the rest of the page's content when the modal is open, which handles both cases at once.

---

**Q: How do you handle scroll lock and why is it necessary? `Medium`**

A: When a modal is open, the page behind it should not scroll — it's disorienting and can move content that the user was reading. Set `document.body.style.overflow = 'hidden'` when the modal opens. Critically, save the original value first (it might already be set to something) and restore it in the useEffect cleanup. The cleanup runs both when `isOpen` becomes false and when the component unmounts, so the lock is always released even if the component is removed from the tree while the modal is open.
