# Screen Reader Testing

## The Reality

Automated accessibility tools catch about 30–40% of issues. The rest require manual testing with a real screen reader. Senior engineers are expected to know how to run at least a basic screen reader check — not to be a full WCAG auditor, but to catch obvious problems before shipping.

---

## The Major Screen Readers

| Screen Reader | Platform | Browser | Market share |
|---|---|---|---|
| NVDA | Windows | Firefox, Chrome | ~41% |
| JAWS | Windows | Chrome, IE | ~40% |
| VoiceOver | macOS, iOS | Safari | ~9% |
| TalkBack | Android | Chrome | ~6% |

For web dev testing: **VoiceOver on macOS** is the most accessible (built-in, free, no install). **NVDA on Windows** is free and what most screen reader users actually use. Test on both if you can.

---

## VoiceOver Basics (macOS)

**Turn on/off:** `Cmd + F5` (or System Settings → Accessibility → VoiceOver)

**Essential keyboard commands:**

| Action | Key |
|---|---|
| Start VoiceOver | Cmd + F5 |
| VO modifier key | Caps Lock (or Ctrl + Option) |
| Next element | Tab |
| Read next item | VO + Right Arrow |
| Activate (click) | VO + Space |
| Jump to next heading | VO + Cmd + H |
| Jump to next landmark | VO + Cmd + L |
| Open rotor | VO + U |
| Stop reading | Ctrl |

**The rotor** (VO + U) is the most useful tool for testing — it shows a categorized list of headings, landmarks, links, form controls, and tables on the page. Spin through it to check your page structure at a glance.

---

## NVDA Basics (Windows, free)

**Turn on/off:** `Ctrl + Alt + N` (or from desktop icon)  
**NVDA modifier:** Insert

| Action | Key |
|---|---|
| Next focusable element | Tab |
| Next element in browse mode | Arrow Down |
| Next heading | H |
| Next landmark | D |
| Next link | K |
| List all headings | Insert + F7 |
| Toggle browse/focus mode | Insert + Space |

**Browse mode vs focus mode:** NVDA's browse mode lets you navigate by element type (H for headings, K for links). When you enter an interactive element (input, combobox), NVDA switches to focus mode automatically, passing keystrokes to the element instead.

---

## What to Test

### Heading structure

Screen reader users often navigate pages via headings, using them as a table of contents. Test that:
- There is one `<h1>` per page
- Headings are in order (h1 → h2 → h3, no skipping levels)
- Headings describe their section (not just "Section 1")

```tsx
// Check with VoiceOver rotor or NVDA heading list
// Bad: no headings, or headings used for styling rather than structure
<p className="big-bold-text">Welcome</p>  // not a heading

// Good
<h1>Welcome to the Dashboard</h1>
<h2>Recent Activity</h2>
<h3>Today</h3>
```

### Landmark regions

Navigate with VO + Cmd + L (landmarks) and verify:
- Page has `<main>` for primary content
- `<nav>` regions are labeled if there are multiple
- No `<div>` soup where landmarks should be

### Forms

Every input must have an accessible name. Check with rotor → Form Controls.

```tsx
// Screen reader says: "Edit text" — no label, useless
<input type="text" placeholder="Email" />

// Screen reader says: "Email, edit text, required"
<label htmlFor="email">Email</label>
<input id="email" type="text" required aria-describedby="email-hint" />
<span id="email-hint">We'll never share your email</span>
```

### Error messages

Errors must be announced to screen reader users, not just shown visually.

```tsx
// ❌ Error appears visually but screen reader doesn't know about it
<input type="email" />
<p className="error-text">Invalid email</p>

// ✅ Error is associated with the input and announced
<input
  type="email"
  aria-describedby="email-error"
  aria-invalid={hasError}
/>
<p id="email-error" role="alert">
  {hasError ? 'Invalid email address' : null}
</p>
```

`role="alert"` is equivalent to `aria-live="assertive"` — it announces when content appears without moving focus.

### Images

Every `<img>` needs either an `alt` attribute (describing the image) or `alt=""` for decorative images.

```tsx
// Informative image — alt describes what it conveys
<img src="chart.png" alt="Sales increased 23% in Q3 compared to Q2" />

// Decorative image — empty alt, screen reader skips it
<img src="divider.png" alt="" />

// Icon in a labeled button — hide the icon, label the button
<button aria-label="Delete item">
  <TrashIcon aria-hidden={true} />
</button>
```

### Dynamic content

When content updates without page reload (loading states, notifications, filter results), verify that screen reader users are notified.

```tsx
function SearchResults({ query, results, isLoading }: Props) {
  return (
    <div>
      {/* This updates dynamically — announce it */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading
          ? 'Loading results...'
          : `${results.length} results for "${query}"`}
      </div>

      {isLoading ? <Spinner /> : results.map(r => <ResultCard key={r.id} result={r} />)}
    </div>
  );
}
```

---

## Automated Testing Tools

**axe-core** (used by browser devtools + testing libraries):

```tsx
// Jest + axe — catches issues in component tests
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button is accessible', async () => {
  const { container } = render(<MyButton onClick={jest.fn()}>Submit</MyButton>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Browser devtools:**
- Chrome: DevTools → Accessibility panel shows the accessibility tree
- Chrome/Firefox: axe DevTools extension for point-and-click audits
- Lighthouse → Accessibility score (uses axe under the hood)

**Limitation:** Automated tools can't test whether `aria-label` text is actually meaningful, whether focus order makes sense, or whether dynamic announcements are timely and clear.

---

> **Check yourself:** You added a "loading" spinner component. What do screen reader users experience without extra work? Nothing — the spinner is a visual `<div>` with a CSS animation. The content they were reading is gone, but there's no announcement that something is loading. Add an `aria-live="polite"` region that announces "Loading..." when the spinner appears and announces the result count when it disappears.

---

## Self-Assessment

- [ ] I know how to turn on VoiceOver (macOS) and navigate by headings/landmarks
- [ ] I know what the VoiceOver rotor is and how to use it for testing
- [ ] I can test the four most important areas: headings, forms, images, dynamic content
- [ ] I know how to connect error messages to inputs with `aria-describedby` and `aria-invalid`
- [ ] I know how to use `jest-axe` for automated a11y assertions in tests

---

## Interview Q&A

**Q: How do you test for accessibility? `High`**

A: Two levels: automated and manual. Automated: integrate `jest-axe` in component tests for regression prevention, run Lighthouse or axe browser extension for page-level audits. Manual: turn on VoiceOver (or NVDA) and navigate the flow I built — check headings with the rotor, verify form inputs announce labels, verify errors are announced, verify dynamic updates are announced via aria-live, verify focus management on overlays and route changes. Automated tools catch about 30–40% of issues; the rest require a real screen reader.

---

**Q: How do you make form error messages accessible? `High`**

A: Two things: associate the error with the input, and announce it dynamically. For association: `aria-describedby` pointing to the error element's ID, so screen readers read the error after the input's label. For announcement: `role="alert"` on the error element, so the error is announced immediately when it appears without the user needing to navigate to it. Also set `aria-invalid="true"` on the input when there's an error — some screen readers announce "invalid" before reading the input.

---

**Q: What is browse mode in NVDA and how does it affect your component testing? `Medium`**

A: NVDA's browse mode lets users navigate by pressing single-character shortcuts (H for headings, K for links) and arrow keys to read content sequentially — like scanning a document. NVDA automatically switches to "focus mode" when the user enters an interactive element, passing keystrokes to the application. Your composite widgets (menus, tabs) must handle focus mode correctly — arrow key navigation, Escape to exit back to browse mode, etc. A widget that works fine with Tab/click may break when NVDA is in browse mode if ARIA roles and keyboard handlers aren't correct.

---

**Q: What's the most important thing automated a11y tools can't catch? `Low`**

A: Whether the experience is actually usable. Tools verify structural correctness — an `<img>` has an `alt`, an input has a label, ARIA roles are valid. They can't evaluate whether the `alt` text actually describes the image, whether the focus order makes sense, whether `aria-live` announcements are timely, whether error messages are clear, or whether a custom widget is actually navigable with a screen reader. Automated tools prevent regressions; manual testing catches usability issues.
