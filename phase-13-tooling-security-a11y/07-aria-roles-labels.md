# ARIA Roles & Labels

## What ARIA Is and Isn't

ARIA (Accessible Rich Internet Applications) is a set of HTML attributes that communicate semantics to assistive technologies — primarily screen readers. ARIA does not change how an element looks or behaves. It only changes what the accessibility tree exposes.

**The first rule of ARIA:** Use semantic HTML instead of ARIA when possible. A `<button>` is better than `<div role="button">` because it comes with keyboard support, focus, and correct semantics for free. ARIA should fill gaps that HTML can't fill.

---

## The Accessibility Tree

Every browser maintains an accessibility tree in parallel with the DOM. Screen readers query this tree, not the visual layout. ARIA attributes modify entries in this tree.

```tsx
// DOM
<div class="btn" onclick={handleClick}>Submit</div>

// Accessibility tree sees: a generic div — not interactive, no label
// Screen reader says nothing useful, Tab key skips it

// With ARIA
<div role="button" tabIndex={0} aria-label="Submit form" onClick={handleClick}>Submit</div>

// Accessibility tree sees: button named "Submit form"
// Better — but still missing keyboard event handling for Enter/Space
// Semantic HTML is almost always preferable:
<button onClick={handleClick}>Submit</button>
```

---

## Landmark Roles

Landmark roles define the structure of the page. Screen reader users navigate between landmarks to jump to content quickly (like sighted users scan visually).

```tsx
// Prefer semantic HTML — these elements carry implicit ARIA landmark roles
<header>          {/* role="banner" (when top-level) */}
<nav>             {/* role="navigation" */}
<main>            {/* role="main" */}
<aside>           {/* role="complementary" */}
<footer>          {/* role="contentinfo" (when top-level) */}
<section aria-label="Results"> {/* role="region" — only landmark with a label */}
<form aria-label="Search">    {/* role="form" — only landmark with a label */}

// If you can't use semantic HTML (e.g., a div-based layout):
<div role="main">...</div>
<div role="navigation" aria-label="Primary">...</div>
```

**Label your landmarks when there are multiple of the same type:**
```tsx
// Without labels, screen reader says "navigation" twice — unhelpful
<nav aria-label="Primary">...</nav>
<nav aria-label="Breadcrumb">...</nav>
```

---

## Common ARIA Attributes

### aria-label

Provides an accessible name when there's no visible text to use.

```tsx
// Icon button — no visible text
<button aria-label="Close dialog">
  <XIcon aria-hidden={true} /> {/* hide decorative icon from a11y tree */}
</button>

// Search input with icon instead of label
<input type="search" aria-label="Search products" />
```

### aria-labelledby

Points to another element's ID to use as the accessible name. Preferred over `aria-label` because the visible text also serves as the label.

```tsx
<h2 id="dialog-title">Confirm Delete</h2>
<div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
  {/* screen reader announces the dialog as "Confirm Delete, dialog" */}
</div>
```

### aria-describedby

Points to an element that provides additional description (not the name). Announced after the primary label.

```tsx
<input
  type="password"
  aria-describedby="password-hint"
  aria-label="Password"
/>
<p id="password-hint">Must be at least 8 characters</p>
{/* Screen reader: "Password, edit text. Must be at least 8 characters." */}
```

### aria-hidden

Removes an element from the accessibility tree entirely. Use for decorative content.

```tsx
<span aria-hidden="true">★★★★☆</span>
<span className="sr-only">4 out of 5 stars</span>
```

**Never use `aria-hidden` on a focusable element** — the element will still receive focus but screen readers won't announce it, creating a "ghost" element.

### aria-expanded

Communicates collapsed/expanded state for dropdowns, accordions, disclosures.

```tsx
<button
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  Options
</button>
<ul id="dropdown-menu" hidden={!isOpen} role="menu">
  ...
</ul>
```

### aria-live

Announces dynamic content changes without moving focus. Critical for notifications, status updates, loading states.

```tsx
// Polite: waits for the user to finish what they're doing
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Assertive: interrupts immediately — for errors or critical alerts
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

`aria-atomic="true"` means the entire region is announced when any part changes, not just the changed part.

```tsx
// Practical pattern: status announcer component
function LiveAnnouncer({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only" // visually hidden but in the DOM
    >
      {message}
    </div>
  );
}
```

---

## Widget Roles

For interactive components that don't have a semantic HTML equivalent.

```tsx
// Tab list
<div role="tablist" aria-label="Account sections">
  <button role="tab" aria-selected={activeTab === 'profile'} aria-controls="profile-panel" id="profile-tab">
    Profile
  </button>
  <button role="tab" aria-selected={activeTab === 'billing'} aria-controls="billing-panel" id="billing-tab">
    Billing
  </button>
</div>
<div role="tabpanel" id="profile-panel" aria-labelledby="profile-tab" tabIndex={0}>
  {/* Profile content */}
</div>
```

---

> **Check yourself:** You've built a custom select dropdown using divs. What ARIA do you need? At minimum: `role="combobox"` on the input, `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"` on the list, `role="option"` on items, `aria-selected` on the active item. This is why using `<select>` or a tested library (Radix UI, Headless UI) is almost always better — you get this for free.

---

## Self-Assessment

- [ ] I know the first rule of ARIA and when to use semantic HTML instead
- [ ] I can name the landmark roles and their semantic HTML equivalents
- [ ] I know the difference between `aria-label` and `aria-labelledby` (and when to prefer each)
- [ ] I understand what `aria-live` does and the difference between polite and assertive
- [ ] I know what `aria-hidden` does and when not to use it

---

## Interview Q&A

**Q: What is ARIA and when should you use it? `High`**

A: ARIA is a set of HTML attributes that communicate semantics to assistive technologies. It modifies what the accessibility tree exposes — not visual appearance or behavior. Use it when semantic HTML doesn't cover your use case: custom interactive widgets, dynamic content announcements (`aria-live`), supplemental descriptions (`aria-describedby`). The first rule of ARIA is to prefer native HTML elements — `<button>`, `<nav>`, `<dialog>` — because they carry correct semantics and behavior for free.

---

**Q: What is the difference between aria-label and aria-labelledby? `High`**

A: `aria-label` provides an accessible name as a string directly in the attribute. `aria-labelledby` points to one or more element IDs whose text content becomes the accessible name. Prefer `aria-labelledby` when a visible label already exists on the page — it ensures the programmatic label matches what sighted users see. `aria-label` is for cases where no visible label exists (icon-only buttons, standalone inputs).

---

**Q: What does aria-live do and when would you use "assertive" vs "polite"? `High`**

A: `aria-live` marks a region that screen readers monitor for changes, announcing updates without the user navigating to that element. `polite` waits until the user is idle before announcing — use this for non-critical updates (form validation success, data loaded). `assertive` interrupts the user immediately — use only for critical, time-sensitive messages like errors. Overusing `assertive` is annoying and disorienting for screen reader users.

---

**Q: What is `aria-hidden` and what's the danger of misusing it? `Medium`**

A: `aria-hidden="true"` removes an element and its subtree from the accessibility tree. Screen readers ignore it. It's correct for decorative elements (icons, decorative images). The danger: applying `aria-hidden` to a focusable element (a button, link, or input). The element still receives keyboard focus but isn't announced — the user lands on an element they can't understand. Always check that `aria-hidden` elements and their descendants are not focusable.
