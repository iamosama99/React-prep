# user-event vs fireEvent

## Quick Reference

| Aspect | `fireEvent` | `userEvent` |
|---|---|---|
| What it does | Dispatches a single DOM event | Simulates real user interaction (multiple events) |
| Typing into input | `fireEvent.change(input, { target: { value: "text" } })` | `await userEvent.type(input, "text")` |
| Click | `fireEvent.click(button)` | `await userEvent.click(button)` |
| Async | Synchronous | Async — always `await` |
| Event count for typing | 1 event | keydown + keypress + input + keyup per character |
| Preferred for | Low-level, simple event dispatch | Most real-world interaction tests |
| Version note | Always available | `@testing-library/user-event` v14+ with setup |

---

## Why the difference matters

`fireEvent.change(input, { target: { value: "hello" } })` fires one `change` event and manually patches `target.value`. It looks like typing, but the DOM only sees one event. Real users generate a sequence: `keydown`, `keypress`, `input` event (which React listens to via `onChange`), `keyup` — for every single character. Validation libraries, IME inputs, custom key handlers, and `onBeforeInput` all depend on the full event sequence.

`userEvent.type(input, "hello")` fires the full event sequence for each character, including:
- Focus on the element
- `keydown` for 'h'
- `keypress` for 'h'
- `input` (React onChange fires here)
- `keyup` for 'h'
- ... and so on for 'e', 'l', 'l', 'o'

Tests written with `userEvent` catch bugs that `fireEvent` would miss — like a form that rejects pasted content, or a keyboard handler that intercepts certain key combinations.

---

> **Check yourself:** You have a custom input that prevents the 'e' character (like a number input that disables 'e' for scientific notation). Would `fireEvent.change(input, { target: { value: "1e5" } })` catch a bug in that handler? What about `userEvent.type(input, "1e5")`?

---

## Setting up userEvent v14

In `@testing-library/user-event` v14, the recommended pattern uses `userEvent.setup()`:

```typescript
import userEvent from "@testing-library/user-event";

test("user can fill in the login form", async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), "alice@example.com");
  await user.type(screen.getByLabelText(/password/i), "secret123");
  await user.click(screen.getByRole("button", { name: /log in/i }));

  expect(await screen.findByText(/welcome, alice/i)).toBeInTheDocument();
});
```

`userEvent.setup()` creates a user session that shares clipboard state, pointer state, and keyboard state across multiple interactions — important for tests with drag-and-drop, copy-paste, or modifier keys held across events.

The simpler v13-style `await userEvent.type(element, text)` still works in v14 but creates a fresh session for each call, losing shared state.

---

## Common userEvent methods

```typescript
const user = userEvent.setup();

// Typing
await user.type(element, "hello world");

// Clear then type (use this for re-entering a value)
await user.clear(input);
await user.type(input, "new value");

// Click, double-click, right-click
await user.click(button);
await user.dblClick(element);
await user.pointer({ keys: "[MouseRight]", target: element });

// Keyboard — pressing specific keys
await user.keyboard("{Enter}");
await user.keyboard("{Escape}");
await user.keyboard("{Tab}");
await user.keyboard("{ArrowDown}");
await user.keyboard("[ShiftLeft>]a[/ShiftLeft]");  // Shift+A

// Selecting from a <select>
await user.selectOptions(select, "option-value");
await user.deselectOptions(multiselect, "option-value");

// Checkbox and radio
await user.click(checkbox);  // toggles
// For more reliable check/uncheck:
if (!checkbox.checked) await user.click(checkbox);

// Hover
await user.hover(element);
await user.unhover(element);

// Tab navigation
await user.tab();  // moves focus to next focusable element

// Paste
await user.paste("pasted text");
```

---

## When fireEvent is still appropriate

`fireEvent` has legitimate uses:

**Testing custom event dispatch.** If you're testing a component that dispatches a custom DOM event and you want to trigger that event in a test, `fireEvent` is the right tool.

**Testing event properties that userEvent doesn't expose.** For example, testing how a component responds to drag events with specific `dataTransfer` data.

**Performance-sensitive tests.** For a test that simply checks a UI update triggered by any value change, `fireEvent.change` is faster than typing character-by-character.

**Testing at the DOM level, not user behavior.** Some unit tests deliberately test a specific event handler in isolation.

```typescript
// Appropriate use of fireEvent — testing a specific drag-over handler
fireEvent.dragOver(dropZone, {
  dataTransfer: {
    types: ["text/plain"],
  },
});
expect(dropZone).toHaveClass("drag-active");
```

---

> **Check yourself:** You're testing a search input that debounces API calls. Does `fireEvent.change` or `userEvent.type` better reflect what a user actually does? Why?

---

## Special keys and keyboard interactions

For keyboard interactions, `userEvent.keyboard` uses a key descriptor syntax:

```typescript
const user = userEvent.setup();

// Press Enter key
await user.keyboard("{Enter}");

// Press Escape
await user.keyboard("{Escape}");

// Tab through form
await user.tab();

// Hold Shift while pressing Tab (shift-tab / reverse tab)
await user.tab({ shift: true });

// Type a keyboard shortcut: Ctrl+K
await user.keyboard("{Control>}k{/Control}");

// On Mac: Cmd+K
await user.keyboard("{Meta>}k{/Meta}");
```

Testing focus movement with `userEvent.tab()` validates actual tab order — a real accessibility concern.

---

## The await requirement

Every `userEvent` method is async and must be awaited:

```typescript
// WRONG — test moves on before interactions complete
userEvent.type(input, "hello");
userEvent.click(button);
expect(...);

// CORRECT
await userEvent.type(input, "hello");
await userEvent.click(button);
expect(...);
```

Missing `await` is the most common `userEvent` bug. The test might appear to pass because the assertion runs before the interaction fires all its events, or the assertion might see an intermediate state.

---

## Gotchas

**`userEvent.type` on a disabled input does nothing.** Real users can't type into disabled elements. `fireEvent.change` bypasses this check. If you want to test that a disabled input rejects input, `userEvent` will simply not type and the assertion will pass trivially — verify the input remains empty.

**Existing content isn't cleared.** `userEvent.type(input, "world")` on an input with existing value "hello" results in "helloworld". Use `userEvent.clear(input)` first, or `userEvent.tripleClick(input)` then type (triple-click selects all).

**Special characters need escaping.** Curly braces `{` and `}` are syntax in the key descriptor. To type a literal `{`, use `{{`. Brackets `[` and `]` similarly: `[[`.

**Pointer events.** Some complex interactions (drag-and-drop, custom pointer handlers) use `user.pointer(...)`. The API is different from `user.click` — check the docs for pointer press/move/release sequences.

---

## Interview Q&A

**Q: Why is `userEvent` preferred over `fireEvent` for most tests? (High)**

`userEvent` simulates real user behavior — a full event sequence (keydown, keypress, input, keyup) per character typed, focus movement, clipboard operations. `fireEvent.change` dispatches a single synthetic event and manually patches `target.value`, bypassing all intermediate events. Custom key handlers, validation on intermediate keystrokes, IME inputs, and `onBeforeInput` handlers are all invisible to `fireEvent` but tested by `userEvent`.

---

**Q: What does `userEvent.setup()` do that direct `userEvent.type()` calls don't? (Medium)**

`userEvent.setup()` creates a persistent user session with shared state — clipboard, pointer position, held modifier keys — across multiple interactions in a test. Direct calls create a fresh session for each interaction, losing state between them. This matters for tests with copy-paste, drag-and-drop, or modifier key sequences.

---

**Q: When is `fireEvent` still the right choice? (Medium)**

When testing custom DOM events, drag events with specific `dataTransfer` payloads, or when deliberately testing a specific event handler in isolation. Also acceptable for simple performance-sensitive tests where the full event sequence isn't the point.

---

**Q: What happens if you forget to `await` a `userEvent` call? (Medium)**

The interaction fires asynchronously. Your assertion runs before all events have been dispatched, so you might test against an intermediate or pre-interaction state. The test may appear to pass if the assertion condition is already true, giving a false positive.

---

**Q: How do you clear an input before typing a new value? (Low)**

`await user.clear(input)` followed by `await user.type(input, "newValue")`. Or `await user.tripleClick(input)` (which selects all) before typing. Without clearing first, typed text appends to the existing value.

---

## Self-Assessment

- [ ] I can explain why `userEvent` fires more events than `fireEvent` for typing
- [ ] I know the `userEvent.setup()` pattern for v14 and why it matters
- [ ] I can `await` all `userEvent` calls correctly
- [ ] I know the common `userEvent` methods: `type`, `click`, `clear`, `tab`, `keyboard`, `selectOptions`
- [ ] I know when `fireEvent` is still the appropriate choice
- [ ] I understand that `userEvent.type` doesn't clear existing content automatically
