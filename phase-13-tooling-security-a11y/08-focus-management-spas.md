# Focus Management in SPAs

## Why SPAs Have a Focus Problem

In a traditional multi-page website, every navigation loads a new HTML document. The browser resets focus to the top of the page (`<body>`), and screen readers announce the new page title. Users know they've moved somewhere.

In a SPA, route changes happen in JavaScript. The URL changes, content is swapped, but the browser does nothing with focus. If a user activated a "Go to Settings" link, focus stays on that link — even though the link may no longer be in the DOM, or is now irrelevant to the new page. Screen reader users get no signal that anything happened.

---

## Route Change Focus Management

The standard pattern: on route change, move focus to a consistent, meaningful location. The two common approaches:

**1. Focus the `<h1>` of the new page**

```tsx
// Each page component focuses its own heading on mount
import { useEffect, useRef } from 'react';

function SettingsPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <h1 tabIndex={-1} ref={headingRef}>Settings</h1>
      {/* tabIndex={-1} allows programmatic focus without adding to tab order */}
      {/* ... */}
    </>
  );
}
```

**2. A skip-nav / route-announcer div at the top**

```tsx
// A single component placed at the app root
function RouteAnnouncer() {
  const location = useLocation();
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.focus();
    }
  }, [location.pathname]);

  return (
    <div
      ref={announcerRef}
      tabIndex={-1}
      className="sr-only" // visually hidden
      aria-live="assertive"
    >
      {/* Optionally announce the page name for screen readers */}
    </div>
  );
}
```

Next.js App Router does this automatically. React Router does not — you manage it.

---

## `tabIndex={-1}` vs `tabIndex={0}`

```
tabIndex={-1}  → element can receive programmatic focus (via .focus()) 
                 but is NOT in the natural tab order
tabIndex={0}   → element IS in the tab order at its natural DOM position
tabIndex={1+}  → avoid — creates a tab order separate from the DOM, very confusing
```

Use `tabIndex={-1}` on headings, containers, and any non-interactive element you need to focus programmatically. Never put positive `tabIndex` values on elements.

---

## Modal / Dialog Focus Management

Modals have the most complex focus requirements:

1. When the modal opens: move focus inside it (to the first focusable element or the dialog element itself)
2. While open: trap focus within the modal (Tab and Shift+Tab cycle only within it)
3. When closed: return focus to the element that opened it

```tsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, triggerRef, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the dialog on open
    dialogRef.current?.focus();

    // Return focus on close (captured before open)
    return () => {
      triggerRef.current?.focus();
    };
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" ref={dialogRef} tabIndex={-1}>
      {children}
      <button onClick={onClose}>Close</button>
    </div>,
    document.body
  );
}
```

In practice, use Radix UI, Headless UI, or the native `<dialog>` element — all handle focus trapping correctly, including edge cases (dynamically added focusable elements, nested modals).

---

## Skip Navigation Link

An often-overlooked pattern: a visually hidden link at the very top of the page that jumps to main content, allowing keyboard users to bypass repeated navigation.

```tsx
function SkipNav() {
  return (
    <a
      href="#main-content"
      className="skip-nav" // visible only on focus
    >
      Skip to main content
    </a>
  );
}

// In your CSS:
// .skip-nav {
//   position: absolute;
//   left: -9999px;
// }
// .skip-nav:focus {
//   left: 0;
//   top: 0;
//   z-index: 999;
// }

// In your page:
<SkipNav />
<nav>...</nav>
<main id="main-content" tabIndex={-1}>
  {/* tabIndex={-1} lets the href anchor receive focus */}
  ...
</main>
```

---

## Focus Indicators

Never remove focus outlines without providing an alternative. The CSS `outline: none` / `outline: 0` on `:focus` is one of the most common accessibility failures.

```css
/* Bad */
:focus { outline: none; }

/* Good — style the focus indicator, don't remove it */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}

/* :focus-visible only shows for keyboard navigation, not mouse clicks
   (modern browsers — use :focus as fallback for older browsers) */
```

---

> **Check yourself:** A user opens a dropdown menu with Enter, selects an item, and the dropdown closes. Where should focus go? Back to the trigger button that opened the dropdown. This is the standard return-focus-to-trigger pattern. If the selected item triggered a navigation, follow route change focus management instead.

---

## Self-Assessment

- [ ] I can explain why SPA route changes break focus for screen reader users
- [ ] I know two patterns for managing focus on route change
- [ ] I understand `tabIndex={-1}` vs `tabIndex={0}` and when to use each
- [ ] I can describe the three rules of modal focus management (in, trap, return)
- [ ] I know how to implement a skip nav link

---

## Interview Q&A

**Q: How do you manage focus when the route changes in a React SPA? `High`**

A: The browser doesn't reset focus on SPA navigation, so you must do it programmatically. The standard approach is to focus a consistent element on route change — either the `<h1>` of the new page (with `tabIndex={-1}`) or a visually-hidden announcer element at the top of the app. The element should have `tabIndex={-1}` so it can receive programmatic focus without being in the tab order. Next.js App Router handles this automatically; React Router does not.

---

**Q: What are the focus management requirements for a modal? `High`**

A: Three things: (1) When the modal opens, move focus inside it — typically to the first focusable element or the dialog container. (2) While open, trap focus so Tab and Shift+Tab cycle within the modal and don't reach elements behind it. (3) When the modal closes, return focus to the element that triggered it. Without step 3, keyboard users lose their position in the page.

---

**Q: What does tabIndex={-1} do? `Medium`**

A: It makes an element focusable via JavaScript (`element.focus()`) without adding it to the tab order. A user pressing Tab won't land on it, but `ref.current.focus()` works. Use it on non-interactive elements you need to focus programmatically — headings, container divs, announcer elements — so you can move focus to a meaningful location without disrupting normal keyboard navigation flow.

---

**Q: Why should you never do `:focus { outline: none }` globally? `Medium`**

A: Focus outlines are the primary visual indicator for keyboard users that an element is active. Removing them globally makes the interface unusable for keyboard navigation — users can't see where they are. The correct approach is to style the outline rather than remove it, or use `:focus-visible` to show the outline for keyboard navigation but not for mouse clicks (which is what users actually want — they want focus indicators when they're keyboarding, not a blue ring on every button they click).
