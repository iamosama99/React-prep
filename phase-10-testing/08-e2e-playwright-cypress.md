# E2E with Playwright & Cypress

## Quick Reference

| Aspect | Playwright | Cypress |
|---|---|---|
| Browser support | Chromium, Firefox, WebKit (Safari) | Chromium, Firefox, Electron |
| Architecture | Node process controls browser via CDP | Runs inside the browser |
| Parallelism | Native, across files | Parallelism on paid plan |
| Speed | Fast — headless, parallel | Slower on large suites |
| Network mocking | `page.route(...)` | `cy.intercept(...)` |
| Component testing | `@playwright/experimental-ct-react` | `cy.mount()` (built-in) |
| Auto-wait | Yes — waits for elements to be actionable | Yes — built-in retry |
| Community/ecosystem | Growing fast, Microsoft-backed | Older, larger ecosystem |
| TypeScript | First-class | First-class |

---

## What E2E tests actually do

Unit and integration tests run in Node with a simulated DOM (jsdom). E2E tests run in a real browser — Chrome, Firefox, Safari — against a running server. The user journey is simulated by the test runner controlling the browser programmatically.

This means:
- Real network requests go out (to a test server or staging)
- Real browser rendering, layout, scrolling
- Real clipboard, file system, authentication cookies
- Real JS execution environment including browser extensions

The confidence gain is real — but so is the cost.

---

## Playwright basics

```typescript
import { test, expect } from "@playwright/test";

test("user can search for products", async ({ page }) => {
  await page.goto("/");

  // Find by accessible role and name — same philosophy as RTL
  await page.getByRole("searchbox", { name: /search/i }).fill("react hooks");
  await page.getByRole("button", { name: /search/i }).click();

  // Wait for results — Playwright auto-waits for elements to be visible
  await expect(page.getByRole("article").first()).toBeVisible();
  await expect(page.getByText(/results for/i)).toContainText("react hooks");
});
```

Playwright's locator API closely mirrors RTL's query philosophy — `getByRole`, `getByLabel`, `getByText`. This is intentional: tests that are readable in Playwright are readable in RTL, and both test accessible attributes.

---

## Playwright locators

```typescript
// By role (preferred)
page.getByRole("button", { name: /submit/i })

// By label (forms)
page.getByLabel("Email address")

// By placeholder
page.getByPlaceholder("Search...")

// By text
page.getByText("Welcome back")

// By test id
page.getByTestId("product-card")

// Chaining — within a specific element
page.getByRole("article", { name: "Product 1" }).getByRole("button", { name: /add/i })
```

The priority order matches RTL's. Playwright added `getByRole`, `getByLabel`, etc. in v1.27 specifically to align with accessible testing practices.

---

> **Check yourself:** A Playwright test clicks a button by its `data-testid`. When is that acceptable? What would make it better?

---

## Auto-waiting

Both Playwright and Cypress automatically wait for elements to be actionable before interacting with them. "Actionable" means visible, enabled, stable (not animating), and receiving pointer events.

```typescript
// Playwright — no explicit wait needed
// This waits until the button is visible, enabled, and stable
await page.getByRole("button", { name: /submit/i }).click();
```

No `await page.waitForSelector(...)` before every click. Playwright handles the waiting internally. You only add explicit waits for non-actionability conditions:

```typescript
// Waiting for a specific text to appear
await expect(page.getByText("Order confirmed")).toBeVisible();

// Waiting for a network request to complete
await page.waitForResponse("**/api/orders");

// Waiting for URL change
await page.waitForURL("/order-confirmation");
```

---

## Network interception

```typescript
// Intercept and mock a specific route
await page.route("**/api/users/1", (route) => {
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: 1, name: "Alice" }),
  });
});

// Let real requests through but modify them
await page.route("**/api/analytics/**", (route) => {
  route.abort(); // block analytics requests in tests
});
```

This is useful for:
- Testing error states (return 500 from a mocked route)
- Avoiding external service calls (analytics, payment processors)
- Making tests deterministic regardless of test data in the DB

---

## Cypress basics

```typescript
describe("Product search", () => {
  it("shows results for a query", () => {
    cy.visit("/");

    cy.findByRole("searchbox", { name: /search/i }).type("react");
    cy.findByRole("button", { name: /search/i }).click();

    cy.findAllByRole("article").should("have.length.greaterThan", 0);
  });
});
```

Cypress uses a jQuery-like chainable API. `cy.findBy*` queries come from `@testing-library/cypress` — the same accessible query philosophy.

```typescript
// Network interception
cy.intercept("GET", "/api/users/*", { fixture: "user.json" }).as("getUser");

cy.visit("/profile/1");
cy.wait("@getUser");

cy.findByText("Alice").should("be.visible");
```

Cypress's `cy.intercept` is powerful: you can match by method + URL, respond with fixtures, delay responses to test loading states, and alias the request to `cy.wait` on it.

---

## Authentication in E2E tests

Testing authenticated flows without typing credentials on every test:

**Playwright approach — `storageState`:**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    storageState: "playwright/.auth/user.json",
  },
});

// auth.setup.ts — run once, save the auth state
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("/dashboard");

  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
```

After setup, all tests start with the auth cookies/localStorage already set. You don't log in on every test.

**Cypress approach — `cy.session()`:**

```typescript
// cypress/support/commands.ts
Cypress.Commands.add("login", (email, password) => {
  cy.session([email, password], () => {
    cy.request("POST", "/api/auth/login", { email, password })
      .its("body.token")
      .then((token) => {
        localStorage.setItem("auth_token", token);
      });
  });
});

// In tests
beforeEach(() => {
  cy.login("user@example.com", "password");
});
```

`cy.session` caches the session across tests and only re-runs the setup when the cache is invalidated.

---

> **Check yourself:** Why do E2E tests need special handling for authentication? What makes login via the UI on every test problematic?

---

## Page Object Model

For large test suites, Page Objects encapsulate the locators and actions for a page:

```typescript
// pages/LoginPage.ts
import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByRole("button", { name: "Log in" }).click();
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL("/dashboard");
  }
}

// In test
test("user can log in", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("alice@example.com", "password");
  await loginPage.expectRedirectToDashboard();
});
```

Page Objects reduce duplication when locators change — you update one place instead of every test.

---

## When E2E is worth the cost

E2E tests are expensive:
- Slow (seconds per test, not milliseconds)
- Flaky (network timing, animation timing, CI resource contention)
- Brittle (a label change or layout shift can break a selector)

Write E2E tests for:
- **Critical business flows:** authentication, checkout, signup, core feature activation
- **Cross-service integration:** flows that require multiple real services to cooperate
- **Bugs that slipped through integration testing:** if a bug reached production and wasn't caught below, add an E2E regression test

Don't write E2E tests for:
- Every happy path in the app (too much maintenance)
- Features already covered by thorough integration tests
- Error state handling (network mocking at integration level is faster and more reliable)

---

## Gotchas

**Flakiness from timing.** Animation, network latency, and render timing cause flaky tests. Use `waitFor`, `waitForResponse`, `expect(...).toBeVisible()` — not arbitrary `page.waitForTimeout(500)`.

**Test isolation.** E2E tests that share database state can fail based on test order. Seed the database with known state before each test (or test suite), and clean up after.

**Cross-browser gaps.** Playwright runs against real WebKit (Safari) and Firefox. Cypress doesn't support WebKit. If your app has Safari-specific bugs, Playwright catches them.

**`data-testid` vs accessible locators.** Both tools support both. Accessible locators (`getByRole`, `getByLabel`) are more robust — they don't break when you rename internal attributes, and they validate accessibility by design.

---

## Interview Q&A

**Q: What's the key difference between Playwright and Cypress architectures? (Medium)**

Cypress runs JavaScript inside the browser alongside the tested application — it has full access to the DOM but is limited to one browser tab and can't easily test cross-domain scenarios. Playwright controls the browser from an external Node process via Chrome DevTools Protocol (or equivalent), supporting multiple tabs, cross-domain flows, and three browser engines (Chromium, Firefox, WebKit/Safari).

---

**Q: What is auto-waiting and why does it matter? (Medium)**

Both Playwright and Cypress automatically retry locating and interacting with elements until they are visible, enabled, and stable. Without auto-waiting, tests need explicit `waitForSelector`, `waitForVisible` calls before every action — verbose and often still racy. Auto-waiting makes tests shorter and more reliable because the tool handles the timing, not the test author.

---

**Q: How do you handle authentication in E2E tests without logging in on every test? (Medium)**

Playwright uses `storageState` — you authenticate once in a setup file, save the auth state (cookies, localStorage) to a file, and configure tests to load that state before starting. This bypasses the UI login for all tests. Cypress has `cy.session()` which similarly caches session state and only re-authenticates when invalidated.

---

**Q: When do you use network interception in E2E tests? (Low)**

To test error states (mock a 500 response), to block external services (analytics, payment processors), or to make tests deterministic when the test database doesn't have predictable data. It's a middle ground — more realistic than module mocking, less brittle than depending on test data in a real database.

---

**Q: What is the Page Object Model and when is it worth implementing? (Low)**

A design pattern where each page (or complex component) is represented as a class that encapsulates locators and actions. Tests call methods like `loginPage.login(email, pass)` instead of duplicating `page.getByLabel("Email").fill(email)` everywhere. Worth it when multiple tests share the same locators — a single label change then only breaks one place.

---

## Self-Assessment

- [ ] I can explain the architectural difference between Playwright and Cypress
- [ ] I know the Playwright locator API and its RTL-aligned query methods
- [ ] I understand what auto-waiting does and why it replaces explicit waits
- [ ] I can set up network interception in both Playwright (`page.route`) and Cypress (`cy.intercept`)
- [ ] I can implement authentication caching to avoid login on every test
- [ ] I know when E2E tests are worth writing vs. relying on integration tests
- [ ] I understand the Page Object Model and when it adds value
