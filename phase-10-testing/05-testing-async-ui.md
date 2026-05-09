# Testing Async UI

## Quick Reference

| Scenario | Query to use |
|---|---|
| Wait for element to appear | `await screen.findByRole(...)` |
| Wait for element to disappear | `await waitForElementToBeRemoved(() => screen.getByText("Loading"))` |
| Wait for complex assertion | `await waitFor(() => expect(...).toX())` |
| Async `act` (for hooks) | `await act(async () => { ... })` |
| Don't do | `await new Promise(resolve => setTimeout(resolve, 100))` — use `findBy` |

---

## The problem with async UI

Most real components are async — they fetch data, wait for timers, respond to delayed events. A synchronous `getBy` query throws immediately if the element isn't there yet. You need queries that wait.

```typescript
// WRONG — throws because the data hasn't loaded yet
render(<UserProfile userId={1} />);
expect(screen.getByText("Alice")).toBeInTheDocument();

// CORRECT — waits up to 1000ms (default timeout) for the element to appear
render(<UserProfile userId={1} />);
expect(await screen.findByText("Alice")).toBeInTheDocument();
```

RTL provides three ways to handle async UI: `findBy`, `waitFor`, and `waitForElementToBeRemoved`.

---

## findBy queries — the primary tool

Every `getBy*` query has a `findBy*` counterpart that's async. Under the hood, `findBy*` is `waitFor(() => getBy*(...))`.

```typescript
// findByRole — most common
const button = await screen.findByRole("button", { name: /submit/i });

// findByText
const heading = await screen.findByText(/welcome, alice/i);

// findByLabelText
const input = await screen.findByLabelText(/email address/i);

// Multiple elements
const items = await screen.findAllByRole("listitem");
```

`findBy` queries wait up to 1000ms by default, retrying every 50ms. You can configure both:

```typescript
await screen.findByText("Alice", {}, { timeout: 3000, interval: 100 });
```

---

> **Check yourself:** When would you use `findByRole` vs `waitFor(() => expect(screen.getByRole(...)).toX())`? Is there a meaningful difference for a simple "element appears" assertion?

---

## waitFor — for complex async assertions

`waitFor` is for assertions that can't be expressed as a single query, or for asserting that something does NOT change:

```typescript
// Multiple assertions that need to be true simultaneously
await waitFor(() => {
  expect(screen.getByRole("status")).toHaveTextContent("Saved");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

```typescript
// Assert a mock was called
await waitFor(() => {
  expect(mockSaveUser).toHaveBeenCalledWith({ name: "Alice" });
});
```

**Rules for `waitFor`:**
1. The callback must be synchronous (no `async` inside the callback)
2. RTL retries the entire callback until it doesn't throw, or the timeout expires
3. Side effects inside the callback may run multiple times — keep the callback pure (only assertions)

---

## waitForElementToBeRemoved — for disappearing UI

Loading spinners, toast notifications, modals that close — elements that are present then go away:

```typescript
test("loading spinner disappears after data loads", async () => {
  render(<UserList />);

  // Spinner appears immediately
  expect(screen.getByRole("progressbar")).toBeInTheDocument();

  // Wait for it to be removed
  await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));

  // Now the data should be there
  expect(screen.getByText("Alice")).toBeInTheDocument();
});
```

Note `queryBy` not `getBy` inside the callback — `queryBy` returns `null` instead of throwing when the element isn't found. `waitForElementToBeRemoved` waits until the callback returns `null` or `undefined`.

---

## Full async test example

```typescript
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

test("search results update when query changes", async () => {
  const user = userEvent.setup();
  render(<SearchPage />);

  const input = screen.getByRole("searchbox");
  await user.type(input, "react");

  // Wait for loading state to appear
  expect(await screen.findByRole("progressbar")).toBeInTheDocument();

  // Wait for loading state to disappear
  await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));

  // Results are now rendered
  expect(screen.getAllByRole("article")).toHaveLength(3);
});
```

---

> **Check yourself:** You render a component that shows a spinner while loading, then shows data. Write the test structure without looking — which queries do you use at each step?

---

## Common async pitfalls

**Not wrapping state updates in `act`.**

RTL wraps most of its utilities in `act` automatically. But if you're triggering a state update outside RTL's control (a manual `setTimeout` callback, a WebSocket message, a store update), React will warn that a state update happened outside `act`. The fix:

```typescript
import { act } from "@testing-library/react";

await act(async () => {
  // trigger the async state update here
  socket.emit("message", { text: "hello" });
  await flushPromises();
});
```

In practice, if you're using `userEvent` and `findBy/waitFor`, RTL handles `act` for you. You only need manual `act` for unusual update triggers.

**Using `setTimeout` waits in tests.**

```typescript
// NEVER DO THIS
await new Promise(resolve => setTimeout(resolve, 500));
expect(screen.getByText("Done")).toBeInTheDocument();
```

This is fragile (might still not be done after 500ms on a slow CI), adds real time to your test suite, and is unnecessary — `findBy` and `waitFor` handle the waiting properly.

**Asserting too early after an async interaction.**

```typescript
await user.click(submitButton);
// ❌ May run before the async submit handler resolves
expect(screen.getByText("Success")).toBeInTheDocument();

// ✓ Wait for the success message to appear
expect(await screen.findByText("Success")).toBeInTheDocument();
```

After `userEvent.click`, any async handlers kick off but haven't completed. Use `findBy` to wait for the result.

**Mixing sync and async queries in the same test.**

Don't use `getByRole` after an async operation and then switch to `findByRole` — be consistent. Once you've gone async (started with an await), keep using async queries for elements that depend on the async result.

---

## Testing error states

```typescript
test("shows error when API fails", async () => {
  server.use(
    http.get("/api/users/1", () =>
      HttpResponse.json({ message: "Server error" }, { status: 500 })
    )
  );

  render(<UserProfile userId={1} />);

  const errorMessage = await screen.findByRole("alert");
  expect(errorMessage).toHaveTextContent(/something went wrong/i);
});
```

The `role="alert"` is important — error messages should have that ARIA role so screen readers announce them immediately. Testing for `getByRole("alert")` validates both the message content and the accessibility markup.

---

## Timeout configuration

Default timeout for `findBy` and `waitFor` is 1000ms. You can configure globally:

```typescript
// jest.setup.ts or vitest.setup.ts
import { configure } from "@testing-library/react";

configure({ asyncUtilTimeout: 3000 });
```

Or per-query:

```typescript
await screen.findByText("Slow result", {}, { timeout: 5000 });
```

In CI, tests can be slower than local — set timeouts generously but not unrealistically (don't set 30s timeouts for operations that should complete in < 2s).

---

> **Check yourself:** Your async test flakes intermittently in CI — it passes locally but fails 1 in 10 runs. What are the likely causes, and what's the proper fix?

---

## Gotchas

**`queryBy` returns `null`, `getBy` throws.** When asserting an element is NOT present, always use `queryBy`:

```typescript
// getByRole throws if not found — this is correct for "element exists" assertions
expect(screen.getByRole("button")).toBeInTheDocument();

// queryByRole returns null — this is correct for "element doesn't exist" assertions
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
```

**`waitFor` inside `waitFor`.** Nesting `waitFor` calls doesn't work reliably. Flatten your assertions.

**Unhandled promise rejections.** If a component makes an API call that rejects and you're not asserting on the error, the test may pass but produce noisy warnings. Add error state handling or suppress with `server.use(...)` returning an error response.

---

## Interview Q&A

**Q: What's the difference between `getBy`, `findBy`, and `queryBy` queries? (High)**

`getBy` is synchronous and throws if the element isn't found. Use it when you know the element should already be there. `findBy` is async and retries until the element appears (or the timeout expires) — use it for elements that appear after async operations. `queryBy` is synchronous and returns `null` if not found instead of throwing — use it when asserting absence (`expect(screen.queryByRole("alert")).not.toBeInTheDocument()`).

---

**Q: When do you use `waitFor` vs `findBy`? (High)**

`findBy` is the cleaner option for "wait until this element appears." Use `waitFor` when your assertion is more complex than a single element query — multiple assertions that should be true simultaneously, assertions on mock function calls, or assertions that involve computed state. `findBy` is essentially `waitFor(() => getBy(...))` with cleaner syntax.

---

**Q: What is `waitForElementToBeRemoved` used for? (Medium)**

Testing that an element that was initially present disappears — loading spinners, close buttons after dismissal, toast notifications. It waits until the callback's return value is falsy (null or undefined). Use `queryBy` inside the callback, not `getBy`, since `getBy` would throw when the element is gone.

---

**Q: Why should you never use `setTimeout` delays in tests? (Medium)**

It adds real waiting time to the test suite (slow CI), is still racy (might be too short), and is unnecessary. `findBy` and `waitFor` retry automatically and complete as soon as the condition is met, making tests both correct and as fast as possible.

---

**Q: When do you need to manually wrap code in `act`? (Low)**

When a state update is triggered outside React's event system and outside RTL's utilities — for example, a WebSocket callback, a direct call to a Zustand store, or a `setTimeout` that updates state. RTL wraps `userEvent`, `findBy`, and `waitFor` in `act` automatically. You need manual `act` only for those unusual cases.

---

## Self-Assessment

- [ ] I know when to use `getBy`, `findBy`, and `queryBy` and the difference between them
- [ ] I can write a test that waits for data to load using `findBy` queries
- [ ] I can test that a loading spinner disappears with `waitForElementToBeRemoved`
- [ ] I know when `waitFor` is appropriate vs. just using a `findBy` query
- [ ] I avoid `setTimeout` delays in tests and use RTL async utilities instead
- [ ] I can test both success and error states of async data fetching
