# Testing Custom Hooks

## Quick Reference

| Concept | Pattern |
|---|---|
| Render a hook | `const { result } = renderHook(() => useMyHook())` |
| Access current value | `result.current` |
| Trigger state update | `act(() => { result.current.doSomething() })` |
| Async updates | `await act(async () => { ... })` |
| With providers | `renderHook(() => useMyHook(), { wrapper: MyProvider })` |
| Test in a component | Sometimes simpler than `renderHook` for complex hooks |

---

## Why renderHook exists

Hooks can't be called outside a component. `renderHook` is a minimal React component that RTL renders internally just to host the hook — you get back a `result` object that reflects the hook's current return value, and utilities to trigger updates.

```typescript
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

test("starts at the initial value", () => {
  const { result } = renderHook(() => useCounter(5));

  expect(result.current.count).toBe(5);
});
```

`result.current` is the hook's current return value. It updates in-place — you don't need to re-destructure after each action.

---

## Triggering updates

Any function call that causes a state update inside the hook must be wrapped in `act`:

```typescript
test("increments the counter", () => {
  const { result } = renderHook(() => useCounter(0));

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

test("multiple updates in one act", () => {
  const { result } = renderHook(() => useCounter(0));

  act(() => {
    result.current.increment();
    result.current.increment();
    result.current.increment();
  });

  expect(result.current.count).toBe(3);
});
```

Without `act`, React may warn that a state update happened outside its lifecycle, and `result.current` might not reflect the latest state.

---

> **Check yourself:** Why does calling `result.current.increment()` outside `act` sometimes appear to work but still generate warnings? What guarantee does `act` provide?

---

## Testing async hooks

For hooks with async operations (data fetching, async state updates):

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useFetch } from "./useFetch";
import { server } from "../mocks/server";
import { http, HttpResponse } from "msw";

test("fetches and returns data", async () => {
  server.use(
    http.get("/api/users/1", () =>
      HttpResponse.json({ id: 1, name: "Alice" })
    )
  );

  const { result } = renderHook(() => useFetch<User>("/api/users/1"));

  // Initially loading
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBeNull();

  // Wait for the fetch to complete
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toEqual({ id: 1, name: "Alice" });
  expect(result.current.error).toBeNull();
});
```

`waitFor` retries the callback until it doesn't throw — it waits for `loading` to become `false`, then the assertions on `data` run in the same synchronous block.

---

## Hooks with changing props (rerender)

`renderHook` returns a `rerender` function that lets you change the hook's arguments:

```typescript
test("refetches when url changes", async () => {
  const { result, rerender } = renderHook(({ url }) => useFetch(url), {
    initialProps: { url: "/api/users/1" },
  });

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual({ id: 1, name: "Alice" });

  // Change the prop
  rerender({ url: "/api/users/2" });

  // Should start loading again
  expect(result.current.loading).toBe(true);

  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual({ id: 2, name: "Bob" });
});
```

---

> **Check yourself:** You're testing a hook that accepts a callback as an argument. The callback changes on every render (a new inline function). How do you test that the hook handles this correctly without a `useCallback` on the consumer side?

---

## Hooks that require providers

Many hooks use context — `useTheme`, `useAuth`, `useStore`. The hook will throw (or return `undefined`) if rendered outside its provider. Pass the provider as a `wrapper`:

```typescript
import { ThemeProvider } from "./ThemeContext";

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider initialTheme="dark">{children}</ThemeProvider>;
}

test("useTheme returns the current theme", () => {
  const { result } = renderHook(() => useTheme(), {
    wrapper: ThemeWrapper,
  });

  expect(result.current.theme).toBe("dark");
});
```

For multiple providers (common in real apps), compose them in the wrapper:

```typescript
function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

## Testing cleanup (useEffect with teardown)

`renderHook` returns `unmount` for testing cleanup:

```typescript
test("removes event listener on unmount", () => {
  const addSpy = jest.spyOn(window, "addEventListener");
  const removeSpy = jest.spyOn(window, "removeEventListener");

  const { unmount } = renderHook(() => useWindowKeyDown("Escape", jest.fn()));

  expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

  unmount();

  expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

  addSpy.mockRestore();
  removeSpy.mockRestore();
});
```

---

## When to test hooks vs. testing through a component

`renderHook` is not always the right tool. Consider testing through a component when:

1. **The hook's behavior is fully expressed through the component's UI.** A `useSearch` hook that filters a list — just test the rendered list. You don't need to inspect `result.current.filteredItems`.

2. **The hook uses context that's easiest to provide through a rendered component.** Setting up providers is identical either way, but rendering a full component gives you RTL's event utilities naturally.

3. **The hook orchestrates multiple things together.** A `useCheckout` hook that manages form state, validation, and API calls — test it through the `<CheckoutForm>` component, not in isolation.

`renderHook` shines for:
- Pure logic hooks with no UI expression (e.g., `useLocalStorage`, `useDebounce`)
- Hooks with multiple states worth asserting directly (loading → loaded → error)
- Hooks where the rendering overhead is a distraction

---

> **Check yourself:** You have a `useDebounce` hook. Would you test it with `renderHook` + fake timers, or by rendering a component that uses it? What does each approach validate?

---

## Testing with fake timers

For hooks that use `setTimeout` or `setInterval`:

```typescript
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("returns the debounced value after the delay", () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: "initial" } }
  );

  expect(result.current).toBe("initial");

  rerender({ value: "updated" });
  expect(result.current).toBe("initial"); // still debouncing

  act(() => {
    jest.advanceTimersByTime(500);
  });

  expect(result.current).toBe("updated");
});
```

`jest.advanceTimersByTime` inside `act` ensures React processes the resulting state updates before you assert.

---

## Gotchas

**`result.current` is a live reference.** It always reflects the current return value of the hook. Don't capture it before `act` and then check it after — by the time you check, it has already updated.

```typescript
const { result } = renderHook(() => useCounter(0));

// ❌ Captures the value before act
const current = result.current;
act(() => result.current.increment());
expect(current.count).toBe(1); // Still 0 — you captured the old reference

// ✓ Always read from result.current
act(() => result.current.increment());
expect(result.current.count).toBe(1);
```

**`act` is required for state updates.** Calling a hook function that triggers `setState` without wrapping in `act` produces a warning and may give stale `result.current` values.

**Async `act` for promises.** If a hook action returns a promise or triggers async side effects, use `await act(async () => { ... })`.

---

## Interview Q&A

**Q: What is `renderHook` and why do you need it? (High)**

Hooks can't be called outside a React component. `renderHook` mounts a minimal host component to run the hook, and returns `result` — an object whose `.current` property always reflects the hook's latest return value. Without it, you'd have to write a custom test component for every hook you want to test in isolation.

---

**Q: Why must state-updating calls be wrapped in `act`? (High)**

`act` tells React to flush all pending state updates and effects before returning. Without it, React batches or defers updates, and `result.current` may not reflect the latest state when your assertion runs. It also prevents the "state update outside act" warning, which appears when React updates happen after a test has "finished" from React's perspective.

---

**Q: When would you choose to test a hook through a component rather than with `renderHook`? (Medium)**

When the hook's behavior is naturally expressed through UI — a list filtering hook, a form hook. Testing through the component validates the full loop (hook → render → user sees result) and uses RTL's query/interaction model naturally. Use `renderHook` for pure logic hooks where UI output is a distraction, or when you need to assert on intermediate states that don't have UI representations.

---

**Q: How do you test a hook that uses context? (Medium)**

Pass a `wrapper` option to `renderHook`: `renderHook(() => useMyHook(), { wrapper: MyProvider })`. The wrapper renders the hook inside the provider. For multiple providers, compose them into a single wrapper component.

---

**Q: How do you test a hook with `setTimeout` inside? (Medium)**

Use `jest.useFakeTimers()` in `beforeEach` and `jest.useRealTimers()` in `afterEach`. Advance the fake clock inside `act(() => jest.advanceTimersByTime(ms))` — the `act` wrapper ensures React processes state updates triggered by the timer before you assert.

---

## Self-Assessment

- [ ] I can use `renderHook` to test a custom hook without writing a test component
- [ ] I know that state-updating calls must be wrapped in `act` and can explain why
- [ ] I can use `waitFor` to test async hooks
- [ ] I can use `rerender` to test hook behavior when props change
- [ ] I can test a context-dependent hook with the `wrapper` option
- [ ] I can test a hook with timers using `jest.useFakeTimers()` + `act`
- [ ] I know when to prefer testing a hook through its UI instead of with `renderHook`
