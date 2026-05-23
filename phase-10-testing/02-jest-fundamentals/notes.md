# Jest Fundamentals

## Quick Reference

| Concept | Syntax |
|---|---|
| Test file | `*.test.ts`, `*.spec.ts`, or `__tests__/` |
| Assertion | `expect(value).toBe(42)` |
| Mock function | `jest.fn()` / `vi.fn()` (Vitest) |
| Spy on method | `jest.spyOn(obj, "method")` |
| Mock module | `jest.mock("./module")` |
| Fake timers | `jest.useFakeTimers()` / `jest.runAllTimers()` |
| Before/after | `beforeEach`, `afterEach`, `beforeAll`, `afterAll` |

---

## The structure: describe, test, expect

Jest (and Vitest, which uses the same API) organizes tests in a three-layer hierarchy:

```typescript
describe("UserCard", () => {
  describe("when user is active", () => {
    test("shows the user name", () => {
      expect(getFullName("John", "Doe")).toBe("John Doe");
    });

    test("shows the active badge", () => {
      expect(isActive({ status: "active" })).toBe(true);
    });
  });
});
```

`describe` groups related tests. `test` (alias: `it`) is an individual test. `expect` creates an assertion.

Only `test` is required — `describe` is optional organizational sugar. Use it when a test file covers multiple behaviors of the same unit.

---

## Matchers

The most common matchers and when to use them:

```typescript
// Equality
expect(2 + 2).toBe(4);             // === comparison (primitives)
expect({ a: 1 }).toEqual({ a: 1 }); // deep equality (objects/arrays)
expect({ a: 1, b: 2 }).toMatchObject({ a: 1 }); // partial match

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(0.1 + 0.2).toBeCloseTo(0.3);   // floating point — don't use toBe
expect(5).toBeGreaterThan(3);
expect(3).toBeLessThanOrEqual(3);

// Strings
expect("hello world").toContain("world");
expect("foobar").toMatch(/foo/);

// Arrays
expect([1, 2, 3]).toContain(2);
expect([1, 2, 3]).toHaveLength(3);

// Functions (exceptions)
expect(() => JSON.parse("{bad}")).toThrow();
expect(() => validateAge(-1)).toThrow("Age must be positive");

// Async
await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: "Alice" });
await expect(fetchUser(999)).rejects.toThrow("Not found");
```

`toBe` uses `Object.is` — use it only for primitives. Use `toEqual` for objects and arrays.

---

> **Check yourself:** `expect({ id: 1 }).toBe({ id: 1 })` — does this pass? Why not? What matcher should you use instead?

---

## Mock functions: jest.fn()

Mock functions record calls, arguments, and return values. They're the foundation of testing functions that receive callbacks or interact with dependencies.

```typescript
const mockCallback = jest.fn();

mockCallback("hello");
mockCallback("world");

expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenCalledWith("hello");
expect(mockCallback).toHaveBeenLastCalledWith("world");
```

**Controlling return values:**

```typescript
const getUser = jest.fn();

// Always return the same value
getUser.mockReturnValue({ id: 1, name: "Alice" });

// Return different values on successive calls
getUser
  .mockReturnValueOnce({ id: 1, name: "Alice" })
  .mockReturnValueOnce({ id: 2, name: "Bob" });

// Return a resolved/rejected promise
getUser.mockResolvedValue({ id: 1 });
getUser.mockRejectedValue(new Error("Not found"));
```

**Inspecting calls:**

```typescript
expect(mockFn.mock.calls).toEqual([["arg1"], ["arg2"]]);
expect(mockFn.mock.results[0].value).toBe("returnValue");
```

---

## Spies: jest.spyOn

Spies wrap an existing method on an object, letting you track calls while preserving (or replacing) the original implementation:

```typescript
const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
// Now console.error does nothing, but you can assert on it

expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Warning"));

// Restore original implementation after the test
consoleSpy.mockRestore();
```

Common uses: suppress `console.error` in tests that test error boundaries, track `localStorage.setItem` calls, intercept `window.location.assign`.

---

> **Check yourself:** What's the difference between `jest.fn()` and `jest.spyOn(obj, "method")`? When would you use each?

---

## Module mocking: jest.mock

`jest.mock` replaces an entire module with a mock version. Jest hoists `jest.mock` calls to the top of the file (before imports), so the mock is active when the tested module imports its dependency.

```typescript
jest.mock("../api/userService");
import { fetchUser } from "../api/userService";

// fetchUser is now a jest.fn() — all methods on the module are mocked
const mockFetchUser = fetchUser as jest.MockedFunction<typeof fetchUser>;

test("loads user data", async () => {
  mockFetchUser.mockResolvedValue({ id: 1, name: "Alice" });

  render(<UserProfile userId={1} />);

  expect(await screen.findByText("Alice")).toBeInTheDocument();
});
```

**Partial mock:** Mock only specific exports:

```typescript
jest.mock("../utils/date", () => ({
  ...jest.requireActual("../utils/date"),  // keep the real implementations
  formatDate: jest.fn(() => "Jan 1, 2025"), // override just this one
}));
```

`jest.requireActual` gets the real module before mocking — useful when you only want to stub one function.

---

## Fake timers

For code that uses `setTimeout`, `setInterval`, `Date.now`, or `requestAnimationFrame`:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("calls callback after 1 second", () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);

  expect(callback).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1000);  // advance clock by exactly 1 second

  expect(callback).toHaveBeenCalledTimes(1);
});
```

**Key timer controls:**

```typescript
jest.advanceTimersByTime(ms);   // advance clock by ms milliseconds
jest.runAllTimers();            // run all pending timers (including chained)
jest.runOnlyPendingTimers();    // run only currently pending timers (not new ones)
jest.clearAllTimers();          // cancel all pending timers
```

**Mocking `Date.now`:**

```typescript
jest.setSystemTime(new Date("2025-01-01"));
// Date.now() returns 1735689600000
```

`jest.useFakeTimers()` with `{ now: new Date("2025-01-01") }` sets both the timer fake and the system time in one call.

---

## Setup and teardown

```typescript
describe("UserRepository", () => {
  let db: Database;

  beforeAll(async () => {
    db = await Database.connect(":memory:");
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.clear();
    await db.seed(testUsers);
  });

  afterEach(() => {
    jest.clearAllMocks();  // clear call history between tests
  });

  test("findById returns the user", async () => {
    const user = await db.findById(1);
    expect(user.name).toBe("Alice");
  });
});
```

- `beforeAll`/`afterAll` — run once per `describe` block. Use for expensive setup (connections, servers).
- `beforeEach`/`afterEach` — run before/after each test. Use for state resets.
- `jest.clearAllMocks()` clears call history but keeps the implementation. `jest.resetAllMocks()` also clears implementations. `jest.restoreAllMocks()` restores spied-on originals.

---

> **Check yourself:** You have a test that calls `setTimeout` internally. Without fake timers, how would you test the delayed behavior? What problem does `jest.useFakeTimers()` solve?

---

## TypeScript-specific: typing mocks

When using `jest.fn()` with TypeScript, the mock function type needs to match the real function's signature:

```typescript
import { fetchUser } from "./api";

jest.mock("./api");

const mockFetchUser = fetchUser as jest.MockedFunction<typeof fetchUser>;

// Now TypeScript knows the argument and return types
mockFetchUser.mockResolvedValue({ id: 1, name: "Alice" });
```

Alternatively with `jest-mock-extended` or `vi.mocked()` (Vitest):

```typescript
import { vi } from "vitest";
import { fetchUser } from "./api";

vi.mock("./api");

const mockFetchUser = vi.mocked(fetchUser);
mockFetchUser.mockResolvedValue({ id: 1, name: "Alice" });
```

---

## Gotchas

**`jest.mock` hoisting.** Jest transforms `jest.mock(...)` calls so they execute before imports — even if you write them after. This is why you can import mocked modules at the top of the file and have the mock be active. Variables declared in the test file are NOT hoisted, so `const x = jest.fn(); jest.mock("./thing", () => ({ fn: x }))` doesn't work — `x` is undefined at hoist time. Use `jest.fn()` inline inside the factory.

**`toBe` vs `toEqual`.** `toBe` is `Object.is` (strict equality). Two different object literals with the same content are NOT `toBe` equal. Use `toEqual` for deep equality.

**`toHaveBeenCalledWith` vs `toHaveBeenLastCalledWith`.** The first checks if ANY call had those args. The second checks only the most recent call. Know which one you need.

**Fake timers and `async/await`.** If your code uses `async/await` internally plus timers, you may need `jest.runAllTimersAsync()` (Jest 29+) or careful `Promise.resolve()` flushing — the interaction between fake timers and the microtask queue can be tricky.

---

## Interview Q&A

**Q: What's the difference between `jest.fn()`, `jest.spyOn()`, and `jest.mock()`? (High)**`jest.fn()` creates a standalone mock function unattached to anything. `jest.spyOn(obj, "method")` wraps an existing method, letting you track calls while optionally preserving or replacing the implementation. `jest.mock("./module")` replaces an entire module — every export becomes a jest mock function. Use `jest.fn()` for callbacks, `spyOn` for methods you want to track without fully replacing, `jest.mock` for module-level dependency replacement.

---

**Q: When should you use `toEqual` instead of `toBe`? (High)**

Use `toBe` for primitive values (numbers, strings, booleans, `null`, `undefined`) — it uses `Object.is`. Use `toEqual` for objects and arrays — it does a deep recursive equality check. Two object literals with identical contents are not `toBe` equal because they're different references in memory.

---

**Q: How do fake timers work and why do you need them? (Medium)**

Without fake timers, a test for a debounced function would either wait a real second (slow, fragile) or not test the delay at all. `jest.useFakeTimers()` replaces `setTimeout`/`setInterval`/`Date` with controllable replacements. `jest.advanceTimersByTime(1000)` advances the fake clock by 1000ms, triggering any callbacks scheduled in that window — no real waiting required.

---

**Q: What is `jest.requireActual` and when do you use it? (Medium)**

`jest.requireActual("./module")` returns the real (unmodified) module export, bypassing the mock. It's used inside `jest.mock` factory functions when you want to partially mock a module — keep most exports real, override just one or two.

---

**Q: Why does `jest.mock` get hoisted? (Low)**

Because imports are evaluated at the top of a module (ES module semantics). If `jest.mock` weren't hoisted, by the time it ran, the real module would already be imported. Jest's babel/transform hoists `jest.mock` calls before imports so the mock is in place when the module under test imports its dependencies.

---

## Self-Assessment

- [ ] I know when to use `toBe` vs `toEqual` and can explain why the distinction matters
- [ ] I can create mock functions with `jest.fn()`, control their return values, and assert on their calls
- [ ] I can use `jest.spyOn` to intercept and track method calls on real objects
- [ ] I can mock an entire module with `jest.mock` and understand why it's hoisted
- [ ] I can use fake timers to test time-dependent behavior without actual delays
- [ ] I understand the `beforeEach`/`afterEach` lifecycle and when to use each hook
