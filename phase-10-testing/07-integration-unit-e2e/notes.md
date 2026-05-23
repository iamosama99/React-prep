# Integration vs Unit vs E2E Testing

## Quick Reference

| Level | Scope | Tools | Speed | Cost |
|---|---|---|---|---|
| Unit | One function/hook in isolation | Jest, Vitest | Very fast | Low |
| Integration | Component + real children + mocked network | RTL + MSW | Fast | Medium |
| E2E | Full app in real browser, real/test API | Playwright, Cypress | Slow | High |

---

## The testing trophy (not the pyramid)

The traditional testing pyramid says: many unit tests, fewer integration, very few E2E. React's ecosystem, specifically Kent C. Dodds who wrote RTL, replaced this with the **testing trophy**:

```
    /-------\
   /   E2E   \        ← Small — verify critical user flows
  /___________\
 /             \
/ Integration   \     ← Large — most tests live here
/_______________\
/               \
/     Unit        \   ← Small — for pure logic and utilities
/_________________\
       Static         ← TypeScript, ESLint (always free)
```

The insight: integration tests give the best return on investment for React apps. They test real rendering, real component interactions, real state management — but still mock the network. They're fast enough to run on every save and give high confidence.

Unit tests are great for pure logic — a `formatDate` utility, a `useDebounce` hook, a Redux reducer. They're not worth writing for every React component that just renders some props.

E2E tests verify the system works end-to-end but are expensive to maintain and slow to run. Reserve them for critical paths.

---

## Unit tests: when they're worth it

Unit tests make sense when:

- The logic is pure and has no UI expression (`calculateTax(income, deductions)`)
- The logic has many edge cases that would be tedious to test through a component
- You're testing a custom hook in isolation (`useDebounce`, `useLocalStorage`)
- You're testing a Redux reducer or Zustand store action

```typescript
// Good unit test candidate — pure logic with many edge cases
describe("calculateDiscount", () => {
  test("applies percentage discount", () => {
    expect(calculateDiscount(100, { type: "percent", value: 20 })).toBe(80);
  });

  test("never returns negative price", () => {
    expect(calculateDiscount(10, { type: "percent", value: 150 })).toBe(0);
  });

  test("rounds to 2 decimal places", () => {
    expect(calculateDiscount(9.99, { type: "percent", value: 10 })).toBeCloseTo(8.99);
  });
});
```

Unit tests are NOT worth it for:
- Components that just render props (`<Badge variant="success">Active</Badge>`)
- Container components — test them at the integration level
- Mock-heavy tests that test the mock rather than the code

---

> **Check yourself:** You have a `validateEmailDomain` utility function with 12 edge cases. Should you write 12 unit tests or test it through the signup form? Why?

---

## Integration tests: the sweet spot

Integration tests in React context means: render a component with its real children, use a real store or context, mock the network (usually MSW), and interact through the UI.

```typescript
test("user can add an item to cart and see the total update", async () => {
  const user = userEvent.setup();

  render(
    <Provider store={createTestStore()}>
      <ProductPage productId="abc" />
    </Provider>
  );

  const product = await screen.findByRole("article", { name: /blue widget/i });
  const addButton = within(product).getByRole("button", { name: /add to cart/i });

  await user.click(addButton);

  expect(await screen.findByRole("status", { name: /cart/i })).toHaveTextContent("1 item");
  expect(screen.getByText(/\$24\.99/)).toBeInTheDocument();
});
```

This test doesn't know or care:
- Which child component renders the add button
- Whether the cart count is managed by Redux, Context, or Zustand
- The implementation of the `addToCart` action

It tests the observable behavior. Refactoring any of those implementation details keeps the test green. That's the value.

---

## Integration vs unit: the right lens

Ask: *can a user observe this behavior?*

- `calculateTax` returns the correct value → No user observes this directly. Unit test.
- Clicking "Add to cart" updates the cart count → User observes this. Integration test.
- The `useCartItems` hook returns the right array → Intermediate. Test it through the component that renders the cart, OR write a `renderHook` test if the hook has complex async logic worth isolating.

---

> **Check yourself:** A developer wants to write a unit test that mounts `<ProductCard>` and checks that `props.onAddToCart` is called when the button is clicked. Is this a good unit test? What's the alternative?

---

## E2E tests: the critical path

E2E tests run a real browser against a real (or staging) API. They're the only tests that verify:
- The whole request/response cycle works
- Auth tokens and cookies are handled correctly
- Real network conditions
- Browser-specific behavior (focus, clipboard, file downloads)

But they're expensive: slow (minutes vs. milliseconds), flaky (network, timing), and brittle (UI label changes break them). You can't run them on every keystroke.

Reserve E2E for:
- Critical business flows: sign up, login, checkout, core feature activation
- Flows where correctness matters more than speed of feedback
- Regression tests for bugs that slipped through unit/integration testing

```
// E2E test structure (Playwright)
test("user can complete checkout", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Card number").fill("4242424242424242");
  // ... fill shipping, billing
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
});
```

---

## Test isolation and shared state

Integration tests need isolated state. Don't share stores, global variables, or API state between tests. Each test should set up its own initial state and tear it down cleanly.

```typescript
// Good — creates a fresh store for each test
function renderWithProviders(ui: React.ReactElement, initialState = {}) {
  const store = configureStore({ reducer: rootReducer, preloadedState: initialState });
  return render(<Provider store={store}>{ui}</Provider>);
}

// Bad — reusing a global store across tests
const globalStore = configureStore({ reducer: rootReducer });
// Each test mutates globalStore — order-dependent failures
```

For MSW, `afterEach(() => server.resetHandlers())` ensures no test's handler overrides leak into the next test.

---

## The cost calculation

Before writing a test, know what you're paying for:

| Test type | Write time | Run time | Maintenance |
|---|---|---|---|
| Unit (pure function) | Low | < 1ms | Low — logic changes break it, refactors don't |
| Unit (component) | Medium | < 5ms | High — implementation changes break it |
| Integration | Medium | 20-200ms | Low — behavior changes break it, refactors don't |
| E2E | High | 5-30s | High — any visible change can break selectors |

Integration tests have the best cost-to-value ratio for UI code. This is why the trophy is wide in the middle.

---

> **Check yourself:** Your team has 500 unit tests that mock all dependencies and 50 integration tests that mock only the network. A major refactor renames several internal functions. Which tests break? Which is a better signal that the refactor broke something?

---

## Gotchas

**Integration doesn't mean "test everything together."** You still mock the network, third-party services, file system, etc. "Integration" means the components integrate with each other and the real state management — not that everything integrates with real infrastructure.

**Unit tests for components are often low-value.** A test that renders `<Button variant="primary">` and checks it has the right class is testing implementation details. If you rename the class, the test breaks, but the button still looks and works the same. That's a false alarm.

**Don't measure coverage, measure confidence.** High test coverage with unit tests that mock everything can give 80% coverage and zero confidence. Fewer, well-targeted integration tests give higher confidence.

---

## Interview Q&A

**Q: What is the testing trophy and how does it differ from the testing pyramid? (High)**

The pyramid says: many unit tests, fewer integration, very few E2E. The trophy says: many integration tests, fewer unit tests (only for pure logic), few E2E tests (critical paths only), and relies heavily on static analysis (TypeScript, ESLint). The insight is that for React UIs, integration tests — which render components with real state but mocked networks — give the best confidence-to-maintenance ratio.

---

**Q: Where do most of your tests should live in a React app? (High)**

Integration tests — rendering components with their real children, real state management, and mocked network layer (MSW). They test observable user behavior rather than implementation details, survive refactors, and run fast enough for continuous testing.

---

**Q: When is a unit test the right choice for React? (Medium)**

For pure logic with no UI expression: utility functions, custom hooks, reducers. Especially when there are many edge cases that would be tedious to test through a component. Not for simple UI components that just render props — those belong in integration tests.

---

**Q: When do E2E tests justify their cost? (Medium)**

For critical user flows where correctness is paramount: authentication, payment, core feature activation. Also for regression tests on specific bugs that slipped through lower-level testing. The rule of thumb: if the business stops when this breaks, it's worth an E2E test.

---

**Q: What does "test isolation" mean for integration tests? (Low)**

Each test creates its own isolated state — a fresh store instance, clean MSW handlers, no shared globals between tests. This prevents test order dependencies where test B fails only because test A left the store in a particular state. `beforeEach` setup and `afterEach` teardown should fully reset all shared state.

---

## Self-Assessment

- [ ] I can explain the testing trophy and why it inverts the pyramid for UI testing
- [ ] I know when to write unit tests vs. integration tests for React code
- [ ] I can explain why integration tests survive refactors better than unit tests
- [ ] I know when E2E tests are worth the cost
- [ ] I can explain test isolation and why global state between tests causes problems
- [ ] I can articulate the cost/value tradeoff of each testing level
