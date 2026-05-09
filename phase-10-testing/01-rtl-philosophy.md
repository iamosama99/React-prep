# React Testing Library Philosophy

## Quick Reference

| Principle | What it means |
|---|---|
| Test behavior, not implementation | Query by role/label, not class or state variable name |
| Queries priority | `getByRole` > `getByLabelText` > `getByText` > `getByTestId` |
| No enzyme-style shallow render | RTL renders the full component tree |
| Avoid testing internals | Don't assert on `useState` values or component method calls |
| `screen` queries | Prefer `screen.getByRole(...)` over the destructured form |

---

## The core idea

React Testing Library exists because of one conviction: **tests that resemble how a user interacts with your app give you more confidence than tests that resemble the implementation**. A test that breaks when you rename a CSS class or refactor state is a test that adds maintenance cost without adding safety. A test that breaks when a button stops being clickable is a test worth having.

The guiding question for every RTL test: *"Can a user do what I'm testing?"* Not *"does this internal state variable have this value?"*

This leads directly to the query priority order.

---

## Query priority: accessible name over DOM structure

RTL exposes multiple ways to find elements. They're ordered by how accessible and meaningful they are:

**Tier 1 — Queries everyone (humans and assistive tech) can use:**

- `getByRole` — finds by ARIA role + accessible name. This is the primary query. Buttons, headings, links, checkboxes, textboxes all have roles.
- `getByLabelText` — finds form elements by their `<label>`. If you're building accessible forms, most inputs are findable this way.
- `getByPlaceholderText` — placeholder is not a label, but it's user-visible. Use as fallback for inputs without labels.
- `getByText` — finds by visible text content. Good for non-interactive elements.

**Tier 2 — Semantic HTML attributes:**

- `getByDisplayValue` — current value of an input/select/textarea.
- `getByAltText` — images by alt text.
- `getByTitle` — elements with `title` attribute.

**Tier 3 — Test ids:**

- `getByTestId` — finds by `data-testid` attribute. Last resort. The fact that an element has a `data-testid` is invisible to real users; a test based on it can pass even when the element is inaccessible or mislabeled.

---

> **Check yourself:** You're testing a login form. The submit button has no visible label — only an icon. What's the right RTL query and what do you need to add to the component?

---

## getByRole is almost always the right choice

Roles come from HTML semantics and explicit ARIA. Every `<button>` has role `button`. Every `<input type="checkbox">` has role `checkbox`. Every `<h1>`–`<h6>` has role `heading`. Anchor tags with `href` have role `link`.

```typescript
import { render, screen } from "@testing-library/react";

test("submit button is present", () => {
  render(<LoginForm />);
  // No class names, no test IDs — just the user-visible role and name
  expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
});
```

The `{ name: /log in/i }` option matches the button's accessible name — its text content, or its `aria-label`, or the text of its `aria-labelledby` target. A regex is case-insensitive and matches partial text.

This test will break if:
- The button is removed
- The button's accessible name changes away from "log in"

It will NOT break if:
- You rename a CSS class
- You refactor from `useState` to `useReducer`
- You change the internal component tree as long as the rendered button is the same

---

## `screen` vs. destructured queries

Two styles:

```typescript
// Old style — destructure from render
const { getByRole } = render(<MyComponent />);
getByRole("button");

// Modern style — use screen
render(<MyComponent />);
screen.getByRole("button");
```

`screen` is preferred because it doesn't require you to pass the query around, and `screen.debug()` lets you print the rendered DOM at any point without modifying the test structure. The RTL docs recommend `screen` for all new tests.

---

## What RTL does NOT do

**No shallow rendering.** RTL always renders the full tree. This means child components run, hooks execute, effects fire. There's no Enzyme-style `.shallow()` that renders one level deep. If you need to isolate a component from its children, mock the children.

**No access to component internals.** You can't call RTL to read a component's state variable or call an internal function. The only interface is the rendered DOM — just like a real user.

**No implementation assertions.** Tests like "confirm `setState` was called with X" are not what RTL is for. Asserting on the user-visible result is.

---

> **Check yourself:** Your test passes but another developer changes the submit button from a `<button>` to a `<div onClick>`. What happens to the test? What does this reveal about which query you should use?

---

## The testing philosophy in practice

A login form test should check:
1. The form renders with an email input and a password input
2. Submitting with valid credentials calls `onLogin`
3. Submitting with invalid credentials shows an error message

It should NOT check:
1. The `email` state variable is updated on each keystroke
2. The `isSubmitting` flag becomes `true` during the request
3. `useReducer` was called

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("shows error on invalid credentials", async () => {
  const onLogin = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
  render(<LoginForm onLogin={onLogin} />);

  await userEvent.type(screen.getByLabelText(/email/i), "bad@email.com");
  await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/invalid credentials/i);
});
```

Every query here maps to something a user can perceive or interact with. The test will survive any internal refactor that preserves the user-facing behavior.

---

> **Check yourself:** Why does RTL avoid shallow rendering? What problem with Enzyme-style tests is it trying to solve?

---

## Gotchas

**Multiple matches.** If `getByRole("button")` matches more than one button, it throws. Either narrow with `{ name: ... }` or use `getAllByRole` and check length.

**Hidden elements.** By default, `getByRole` ignores elements hidden from the accessibility tree (via `display: none`, `visibility: hidden`, or `aria-hidden`). Pass `{ hidden: true }` to override.

**`getByText` and HTML nesting.** `getByText("Submit")` looks for an element where the text content matches. If the text is split across children (e.g., `<button><span>Submit</span></button>`), it still works because RTL computes the accessible name recursively.

**`waitFor` vs `findBy`.** `findByRole(...)` is `waitFor(() => getByRole(...))` — async waiting built into the query. Prefer `findBy` for async assertions. `waitFor` is for more complex assertions involving multiple elements.

---

## Interview Q&A

**Q: What is the core philosophy of React Testing Library? (High)**

Test what the user sees and does, not how the component is implemented internally. This means querying elements by accessible role and name (not CSS classes or internal state), interacting through user-event (not direct function calls), and asserting on visible output (not state variables or implementation details).

---

**Q: What's the query priority order in RTL and why? (High)**

`getByRole` > `getByLabelText` > `getByText` > `getByTestId`. The priority follows how meaningful the query is for accessibility: `getByRole` tests both functionality and accessibility at once (it only works if the element has the right role and accessible name). `getByTestId` is last because it tests nothing about accessibility or real user interaction — it's an arbitrary marker invisible to real users.

---

**Q: Why is `getByRole` the preferred query? (High)**

Because it validates two things simultaneously: the element exists AND it has the correct ARIA role and accessible name. If you change a `<button>` to a `<div onClick>`, `getByRole("button")` fails. `getByTestId("submit-btn")` would pass. `getByRole` enforces semantic HTML and accessibility by design.

---

**Q: What does it mean that RTL doesn't support shallow rendering? (Medium)**

RTL always renders the complete component tree — hooks execute, effects run, child components render. Shallow rendering (Enzyme's model) lets you render just one component in isolation, but the resulting tests can pass while the actual rendering breaks. Full-tree rendering means tests catch real integration failures.

---

**Q: When is `getByTestId` appropriate? (Medium)**

When there's genuinely no semantic or accessible way to find an element — for example, a custom UI element with no ARIA role, no label, and no meaningful text. Even then, prefer adding an `aria-label` or a role first. `data-testid` is a last resort, not a first choice.

---

## Self-Assessment

- [ ] I can explain RTL's core philosophy and why it emerged as an alternative to Enzyme
- [ ] I know the query priority order and can justify why `getByRole` is first
- [ ] I can use `getByRole` with the `name` option to find specific elements
- [ ] I prefer `screen.getByRole(...)` over destructured queries
- [ ] I know what RTL doesn't do (shallow rendering, internals access) and why
- [ ] I understand the difference between `findBy` (async) and `getBy` (sync) queries
