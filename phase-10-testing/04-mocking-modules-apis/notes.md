# Mocking Modules & APIs

## Quick Reference

| Approach | When to use |
|---|---|
| `jest.mock("./module")` | Mock an entire local module |
| `jest.mock("library")` | Mock a third-party package |
| `jest.spyOn(obj, "method")` | Mock one method on an object |
| MSW (Mock Service Worker) | Mock HTTP requests at the network level |
| `jest.requireActual` | Partial mock — keep most real, override one |
| `vi.mock` / `vi.spyOn` | Vitest equivalents (same API) |

---

## Why mocking matters

Tests for UI components should test the UI, not the network. A test that actually calls your API is slow, flaky (network issues), and has external side effects (writes data, sends emails). Mocking replaces the dependency with a controlled fake so the test focuses on what the component does with the response.

There are two levels of mocking for API calls:
1. **Module mocking** — replace the function that makes the request
2. **Network mocking (MSW)** — intercept the actual HTTP request

Both are valid. The tradeoff is fidelity vs. isolation.

---

## jest.mock for local modules

The most basic form — mock everything in a module:

```typescript
jest.mock("../services/userService");
import { getUser, updateUser } from "../services/userService";

const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;

test("UserProfile fetches and displays user data", async () => {
  mockGetUser.mockResolvedValue({ id: 1, name: "Alice", email: "alice@example.com" });

  render(<UserProfile userId={1} />);

  expect(await screen.findByText("Alice")).toBeInTheDocument();
  expect(mockGetUser).toHaveBeenCalledWith(1);
});
```

When you call `jest.mock("../services/userService")`, Jest replaces every export with `jest.fn()`. The TypeScript cast `as jest.MockedFunction<typeof getUser>` gives you proper typing on `.mockResolvedValue`, `.mockReturnValue`, etc.

---

## Partial module mocking

Keep the real implementation for most exports, override specific ones:

```typescript
jest.mock("../utils/dates", () => ({
  ...jest.requireActual("../utils/dates"),
  getCurrentDate: jest.fn(() => new Date("2025-01-01")),
}));

import { getCurrentDate, formatDate } from "../utils/dates";

// formatDate uses the real implementation
// getCurrentDate always returns 2025-01-01
```

`jest.requireActual` returns the un-mocked module — spread it first, then override the functions you need to control.

---

> **Check yourself:** You have a module with 10 utility functions. You want to mock one of them for a specific test file. What's the approach, and why can't you just `jest.mock()` the entire module without `jest.requireActual`?

---

## Mocking third-party packages

Same syntax, just use the package name:

```typescript
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

import { useNavigate } from "react-router-dom";

const mockNavigate = jest.fn();
(useNavigate as jest.Mock).mockReturnValue(mockNavigate);

test("redirects to login on logout", async () => {
  const user = userEvent.setup();
  render(<Dashboard />);

  await user.click(screen.getByRole("button", { name: /log out/i }));

  expect(mockNavigate).toHaveBeenCalledWith("/login");
});
```

---

## MSW — Mock Service Worker

MSW intercepts actual HTTP requests at the network level — the component calls `fetch`, the request is intercepted before it leaves the browser/Node, and MSW returns a controlled response. This is significantly closer to production than module mocking.

**Setup:**

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id, name: "Alice", email: "alice@example.com" });
  }),

  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 99, ...body }, { status: 201 });
  }),
];
```

```typescript
// src/mocks/server.ts (Node/Jest environment)
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```typescript
// jest.setup.ts (or vitest.setup.ts)
import { server } from "./src/mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**In tests — override handlers for specific scenarios:**

```typescript
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

test("shows error message when API fails", async () => {
  server.use(
    http.get("/api/users/1", () => {
      return HttpResponse.json({ message: "Server error" }, { status: 500 });
    })
  );

  render(<UserProfile userId={1} />);

  expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
});
```

`server.use(...)` adds a one-time override. `afterEach(() => server.resetHandlers())` clears it so it doesn't affect other tests.

---

> **Check yourself:** What is the key difference between mocking the fetch function with `jest.mock` vs. using MSW? When would you choose MSW?

---

## MSW vs module mocking: tradeoffs

| | Module mock | MSW |
|---|---|---|
| Fidelity | Mock the function that calls `fetch` | Mock the actual HTTP response |
| Tests what | The component uses the function correctly | The component handles real HTTP responses |
| Setup cost | Low — one `jest.mock` call | Higher — server setup, handler files |
| Catches HTTP-level bugs | No — e.g., wrong URL, wrong HTTP method | Yes |
| Works with `fetch`, `axios`, `ky` | Has to mock each separately | Yes — intercepts all |
| Reusable across component/integration tests | No | Yes — same handlers in browser and Node |

For unit tests where you control the API module, module mocking is fine. For integration tests that exercise the actual fetch/request chain, MSW is the right tool.

---

## Mocking global browser APIs

```typescript
// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock window.location (can't reassign directly in jsdom)
delete (window as any).location;
window.location = { href: "", assign: jest.fn(), reload: jest.fn() } as any;

// Mock IntersectionObserver (common in tests for virtualized lists)
const mockObserver = {
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
};
window.IntersectionObserver = jest.fn(() => mockObserver) as any;
```

These are usually set up in a `jest.setup.ts` file or in individual test files as needed.

---

## Clearing and resetting mocks

Three levels of mock reset, with distinct behaviors:

```typescript
jest.clearAllMocks();    // clears call history, does NOT reset return values or implementations
jest.resetAllMocks();   // clears call history AND resets return values/implementations
jest.restoreAllMocks(); // like resetAllMocks but also restores spies to original implementation
```

Typical pattern:

```typescript
afterEach(() => {
  jest.clearAllMocks(); // start each test with a clean call history
});
```

Call `jest.restoreAllMocks()` when you've used `jest.spyOn` and want the original methods back. Call `jest.resetAllMocks()` when you want to ensure no `.mockReturnValue` bleeds between tests.

---

> **Check yourself:** `afterEach(() => jest.clearAllMocks())` vs `afterEach(() => jest.resetAllMocks())` — what's the difference? Which would you use if a mock's `mockReturnValue` needs to persist across all tests in a file?

---

## Gotchas

**MSW v1 vs v2.** The API changed significantly in MSW v2. In v1, handlers use `rest.get(url, (req, res, ctx) => res(ctx.json(...)))`. In v2, they use `http.get(url, () => HttpResponse.json(...))`. Many tutorials still show the v1 syntax. Always check which version you're on.

**`jest.mock` factory function limitations.** Variables defined outside the factory function are not in scope inside it — due to hoisting. Only use `jest.fn()`, `jest.requireActual()`, or inline values inside the factory. Accessing module-scope variables inside `() => ({...})` will throw a "Cannot access before initialization" error.

**Dynamic import mocking.** `jest.mock` doesn't automatically work with dynamic `import()`. You need to use `jest.mock` and await the dynamic import, or use Vitest's module mocking utilities which handle this differently.

---

## Interview Q&A

**Q: What's the difference between module mocking and MSW for API testing? (High)**

Module mocking replaces the function that makes the HTTP call — `jest.mock("./api")` turns `fetchUser` into a jest.fn(). MSW intercepts the actual HTTP request at the network level, letting `fetch` or `axios` run normally until the request is caught. Module mocking tests that the component calls the right function with the right arguments. MSW tests that the component correctly handles HTTP responses — it catches bugs like wrong URLs, wrong HTTP methods, or header mismatches that module mocks wouldn't catch.

---

**Q: How do you do a partial module mock? (High)**

Use `jest.mock("module", () => ({ ...jest.requireActual("module"), functionToMock: jest.fn() }))`. `jest.requireActual` returns the real module, which you spread as the base. Then you override just the specific exports you need to control.

---

**Q: How do you set up MSW for unit/integration tests in a Node environment? (Medium)**

Create handlers with `http.get/post/put/delete(url, handler)`, set up a server with `setupServer(...handlers)`, then in your test setup: `beforeAll(() => server.listen())`, `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`. Override handlers per-test with `server.use(...)`.

---

**Q: What's the difference between `jest.clearAllMocks()`, `jest.resetAllMocks()`, and `jest.restoreAllMocks()`? (Medium)**

`clearAllMocks` only clears call history. `resetAllMocks` clears call history and removes custom return values/implementations set via `mockReturnValue`. `restoreAllMocks` does everything `resetAllMocks` does, plus restores methods that were spied on with `jest.spyOn` back to their original implementations.

---

**Q: Why can't you use a file-scope variable inside a `jest.mock` factory function? (Low)**

`jest.mock` is hoisted before imports and before variable declarations are initialized. By the time the factory function runs, variables declared with `const`/`let` haven't been initialized yet. Only `jest.fn()`, `jest.requireActual()`, and inline literals are safely usable inside a factory.

---

## Self-Assessment

- [ ] I can mock an entire module and type the mocked functions correctly
- [ ] I can do a partial mock that keeps most real implementations
- [ ] I can set up MSW with handlers for GET and POST routes
- [ ] I can override MSW handlers for error scenarios in specific tests
- [ ] I know when to prefer MSW over module mocking and vice versa
- [ ] I know the difference between `clearAllMocks`, `resetAllMocks`, and `restoreAllMocks`
