// ============================================================
// Exercises: E2E with Playwright
//
// To run these exercises, Playwright must be installed:
//   npm install -D @playwright/test
//   npx playwright install chromium
//
// Run: npx playwright test phase-10-testing/08-e2e-playwright-cypress/
//
// These exercises assume a running dev server:
//   npm run tutorial 08-e2e-playwright-cypress
// Set baseURL in playwright.config.ts to http://localhost:5173
//
// Note: E2E tests are different in nature from unit/integration.
// They're slow (seconds per test), run against a real browser,
// and test critical paths — not every feature. Write sparingly.
// ============================================================

import { test, expect, Page } from '@playwright/test'

// ─── Page Object (Exercise 4 pattern) ────────────────────────
class LoginPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/') }

  async fillEmail(email: string) {
    await this.page.getByLabel('Email').fill(email)
  }

  async fillPassword(password: string) {
    await this.page.getByLabel('Password').fill(password)
  }

  async submit() {
    await this.page.getByRole('button', { name: /log in/i }).click()
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  errorMessage() {
    return this.page.getByRole('alert')
  }
}

class DashboardPage {
  constructor(private page: Page) {}

  heading() { return this.page.getByRole('heading', { level: 1 }) }
  logoutButton() { return this.page.getByRole('button', { name: /log out/i }) }
  counter() { return this.page.getByRole('status') }
  incrementButton() { return this.page.getByRole('button', { name: /increment/i }) }
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Basic navigation and interaction
//
// Playwright auto-waits for elements to be actionable.
// No need for explicit waits before interactions.
// ─────────────────────────────────────────────────────────────
test.describe('Exercise 1: Login flow', () => {
  test('shows the login form on initial load', async ({ page }) => {
    await page.goto('/')

    // TODO: assert the login form is visible
    // Hint: expect(page.getByRole('form', { name: /login form/i })).toBeVisible()
    // Or: expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
  })

  test('successful login navigates to the dashboard', async ({ page }) => {
    await page.goto('/')

    // TODO: fill in the email field with 'alice@example.com'
    // Hint: await page.getByLabel('Email').fill('alice@example.com')

    // TODO: fill in the password field

    // TODO: click the Log in button

    // TODO: assert the dashboard heading says "Welcome, Alice Chen"
    // Hint: await expect(page.getByRole('heading', { level: 1 })).toContainText('Alice Chen')
  })

  test('invalid credentials shows an error', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /log in/i }).click()

    // TODO: assert the error alert is visible with 'Invalid credentials' text
    // Playwright auto-waits for the element to be visible
    // Hint: await expect(page.getByRole('alert')).toHaveText(/invalid credentials/i)
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Auto-waiting and dashboard interactions
//
// Playwright waits for elements to be visible, enabled, and stable.
// No explicit waits needed for standard interactions.
// ─────────────────────────────────────────────────────────────
test.describe('Exercise 2: Dashboard after login', () => {
  // Helper to log in before each test (raw, not Page Object yet)
  async function loginAs(page: Page, email: string, password: string) {
    await page.goto('/')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: /log in/i }).click()
    // Auto-wait for the dashboard to appear
    await page.getByRole('heading', { name: /welcome/i }).waitFor()
  }

  test('clicking increment updates the counter', async ({ page }) => {
    await loginAs(page, 'alice@example.com', 'password')

    // Counter starts at 0
    await expect(page.getByRole('status')).toHaveText('0')

    // TODO: click the increment button 3 times
    // TODO: assert the counter shows 3
  })

  test('log out returns to the login page', async ({ page }) => {
    await loginAs(page, 'alice@example.com', 'password')

    // TODO: click the Log out button
    // TODO: assert the login form is visible again
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Network interception
//
// page.route() intercepts HTTP requests before they leave the browser.
// Use this to: test error states, avoid external calls, make tests deterministic.
// ─────────────────────────────────────────────────────────────
test.describe('Exercise 3: Network interception', () => {
  test('intercept and mock a slow API response', async ({ page }) => {
    // Intercept any /api/* call and delay it by 200ms
    await page.route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 200)) // artificial delay
      await route.continue()
    })

    // In a real app: this would test that a loading state appears during slow requests
    await page.goto('/')
    // Your assertions here...
  })

  test('intercept to simulate API error', async ({ page }) => {
    // TODO: use page.route to return a 500 error for /api/auth
    // Then attempt login and assert the error state appears
    //
    // Hint:
    // await page.route('**/api/auth', (route) => {
    //   route.fulfill({ status: 500, body: 'Server error' })
    // })
    //
    // Note: our tutorial app doesn't hit /api/auth, but in a real app this
    // pattern lets you test error states without corrupting test data.
  })

  test('block analytics calls (do not track in tests)', async ({ page }) => {
    // TODO: abort all requests to /api/analytics or third-party analytics URLs
    // Hint: await page.route('**/analytics/**', route => route.abort())
    //
    // This prevents tests from polluting analytics data.
    await page.goto('/')
  })
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Page Object Model
//
// Page Objects encapsulate locators and actions for a page.
// When a selector changes, you fix ONE place, not every test.
// ─────────────────────────────────────────────────────────────
test.describe('Exercise 4: Page Object Model', () => {
  test('login flow using Page Objects', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    await loginPage.goto()
    await loginPage.login('alice@example.com', 'password')

    // TODO: use dashboardPage.heading() to assert the welcome message
    // await expect(dashboardPage.heading()).toContainText('Alice Chen')
  })

  test('invalid login using Page Object error method', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login('wrong@example.com', 'bad')

    // TODO: use loginPage.errorMessage() to assert the error
    // await expect(loginPage.errorMessage()).toBeVisible()
  })

  // When Page Objects are worth it:
  // - Multiple tests share the same locators
  // - A label change breaks ONE place (the Page Object), not 10 tests
  //
  // When they're overkill:
  // - Small test suite with 5 tests
  // - Locators only used in one test each
  //
  // Rule: add a Page Object when you find yourself copy-pasting the same locator.
})

// ─────────────────────────────────────────────────────────────
// EXERCISE 5 — What NOT to test in E2E
//
// E2E tests are expensive — save them for critical flows.
// These scenarios should be integration tests, NOT E2E.
// ─────────────────────────────────────────────────────────────
test.describe('Exercise 5: E2E scope decisions (discussion)', () => {
  // ✓ Worth E2E: login, signup, checkout, auth token persistence across refresh
  // ✗ NOT worth E2E (use integration): form validation, error states,
  //   data display, filtering, most UI interactions

  // The cost calculation:
  // E2E: 5–30 seconds per test, flaky (network/timing), brittle (selectors)
  // Integration: 20–200ms per test, reliable, survives refactors

  // If you can test it with RTL + MSW, you should.
  // E2E only for: "what if the entire stack is wrong?"

  test('critical path: the one test worth an E2E', async ({ page }) => {
    // The ONE thing E2E proves that integration can't:
    // Real auth cookies, real network, real browser — the FULL stack.
    await page.goto('/')
    await page.getByLabel('Email').fill('alice@example.com')
    await page.getByLabel('Password').fill('password')
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page.getByRole('heading', { name: /welcome.*alice/i })).toBeVisible()
  })
})
