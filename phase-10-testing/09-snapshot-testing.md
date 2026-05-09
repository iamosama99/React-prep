# Snapshot Testing

## Quick Reference

| Concept | Notes |
|---|---|
| How it works | Serializes rendered output on first run; compares on subsequent runs |
| Create/update | `jest --updateSnapshot` or `jest -u` |
| Failing snapshot | Output changed — could be a bug or an intentional change |
| When useful | Detecting unexpected changes in output you don't want to manually assert |
| When harmful | Large snapshots, frequent updates, poor signals for actual regressions |
| RTL + Jest DOM | Prefer explicit assertions over snapshots for React components |
| Inline snapshots | `expect(value).toMatchInlineSnapshot()` — stored in the test file |

---

## What snapshot testing does

The first time you run a snapshot test, Jest serializes the output (a component's rendered HTML, a function's return value, an object) and writes it to a `.snap` file. On every subsequent run, it compares the new output to the stored snapshot. If they differ, the test fails.

```typescript
import { render } from "@testing-library/react";

test("Badge renders correctly", () => {
  const { container } = render(<Badge variant="success">Active</Badge>);
  expect(container).toMatchSnapshot();
});
```

First run — creates `__snapshots__/Badge.test.tsx.snap`:

```
exports[`Badge renders correctly 1`] = `
<div>
  <span
    class="badge badge-success"
  >
    Active
  </span>
</div>
`;
```

Future runs compare against this. Change `badge-success` to `badge badge--success` (a CSS rename), the test fails.

---

> **Check yourself:** A snapshot test fails. How do you decide whether to update the snapshot or treat the failure as a bug?

---

## The problem with component snapshots

Snapshot testing sounds appealing — "just render and compare, no manual assertions." In practice, component snapshots have a poor signal-to-noise ratio.

**Too easy to update without thinking.** When any change breaks a snapshot, the first instinct is `jest -u` to update all of them. After a routine styling refactor, you run `jest -u` on 40 snapshots and trust that nothing is wrong. But snapshot failures are supposed to be a signal — if you always update them automatically, they're just noise.

**Snapshots capture everything, including things you don't care about.** A class name change in a third-party library, an order change in HTML attributes, a whitespace difference — all break the snapshot. None of these represent actual regressions.

**Large snapshots are unreadable.** A 200-line HTML snapshot tells you something changed, not what meaningful behavior changed. Reviewing it in a PR means scrolling through a wall of serialized HTML looking for the actual change.

**They don't tell you what the component should do.** A snapshot is a description of what the output was, not what it should be. A test with explicit assertions (`expect(screen.getByRole("status")).toHaveTextContent("Active")`) tells the reader what's being verified.

---

## When snapshots are actually useful

Snapshots are valuable for:

**Serialized data structures.** If you're testing a function that generates a config object, a query AST, or an API response shape — something with a precise, stable structure that's hard to fully assert on with individual properties:

```typescript
test("generates the correct Webpack config", () => {
  expect(generateWebpackConfig({ mode: "production" })).toMatchSnapshot();
});
```

**Non-HTML output.** CSS-in-JS libraries (styled-components, Emotion) snapshot-test generated CSS. Parsing libraries snapshot-test ASTs. These have stable, machine-generated structures where snapshot testing is appropriate.

**Small, stable components.** A `<Spinner />` that renders a single element with predictable structure — a snapshot is a fast, low-cost way to catch accidental changes. The key: the snapshot must be small enough to review at a glance.

**Inline snapshots for small values:**

```typescript
test("formats currency correctly", () => {
  expect(formatCurrency(1234.56)).toMatchInlineSnapshot(`"$1,234.56"`);
});
```

Inline snapshots are stored in the test file, not a separate `.snap` file. They're better because: the expected value is visible in the test, reviewers see the change in the test diff (not in a `.snap` file), and they stay small by convention (you wouldn't inline a 200-line snapshot).

---

> **Check yourself:** You're reviewing a PR. The diff includes a change to a `__snapshots__` file with 150 lines changed. How much confidence do you have that the snapshot accurately represents a regression check?

---

## Keeping snapshots manageable

If you do use snapshots for components, keep them useful:

**Use `toMatchInlineSnapshot` for small outputs.** Inline keeps it visible in the test.

**Snapshot specific parts, not the full render:**

```typescript
// BAD — snapshots entire component tree including third-party internals
expect(container).toMatchSnapshot();

// BETTER — snapshot a specific value
const { container } = render(<StatusBadge status="active" />);
expect(container.firstChild).toMatchSnapshot();

// BEST — prefer explicit assertions
expect(screen.getByRole("status")).toHaveTextContent("Active");
expect(screen.getByRole("status")).toHaveClass("badge-success");
```

**Review snapshot updates the same as code changes.** If `jest -u` is part of your workflow, you've lost the test's value. Each snapshot update should be reviewed like any other code change.

**Delete obsolete snapshots.** Run `jest --ci` in CI (fails on new unreviewed snapshots) and `jest --updateSnapshot` only locally and deliberately.

---

## Explicit assertions beat snapshots for UI

For React components, prefer RTL assertions:

```typescript
// Instead of this — snapshot
expect(container).toMatchSnapshot();

// Do this — explicit assertions about what matters
expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
expect(screen.getByRole("status")).toHaveTextContent("3 items in cart");
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
```

The explicit test:
- Tells you exactly what it's checking
- Survives refactoring that doesn't change behavior
- Fails loudly with a clear message when the actual behavior breaks
- Doesn't fail when unrelated HTML attributes change

---

## The PR review problem

Snapshot changes in PRs are often dismissed without real review:
- 500-line snapshot file changes are impossible to review meaningfully
- Developers approve "looks fine" to unblock the PR
- Over time, snapshots diverge from any kind of meaningful intent

The irony: snapshot testing is meant to catch regressions, but the update workflow teaches reviewers to ignore the failures.

---

> **Check yourself:** A colleague says "I use snapshots so I don't have to write explicit assertions — it automatically catches regressions." What's the counterargument?

---

## What most teams do in 2025

- No component snapshots by default
- Inline snapshots for small, stable serialized values
- Explicit RTL assertions for all component behavior
- Snapshot testing for non-HTML output: config generation, API schemas, CSS-in-JS

If your codebase has inherited snapshot tests that generate noise, consider migrating them to explicit assertions — even partially. Delete snapshots for components and replace with `getByRole` / `toHaveTextContent` assertions.

---

## Gotchas

**Snapshots in CI.** Use `--ci` flag in CI: it fails if there are no matching snapshots (prevents accidentally committing un-reviewed snapshots from the first run).

**Snapshot serializers.** Third-party serializers like `jest-serializer-html` or `@testing-library/jest-dom` change how snapshots look. Make sure your team is using the same serializer version.

**Dynamic content in snapshots.** Timestamps, UUIDs, random values in snapshots → tests that fail every run. Mock these before snapshotting: `jest.spyOn(Date, "now").mockReturnValue(1735689600000)`.

---

## Interview Q&A

**Q: What is snapshot testing and what are its main drawbacks for React components? (High)**

Snapshot testing serializes a component's rendered output and compares future renders against it. The drawbacks: easy to mindlessly update (losing the regression signal), snapshots capture everything including irrelevant changes (class names, attribute ordering), large snapshots are unreadable in PR reviews, and they don't communicate what behavior is being tested. Explicit RTL assertions are almost always preferable for React component behavior.

---

**Q: When is snapshot testing actually valuable? (High)**

For serialized non-HTML output — config objects, query ASTs, generated CSS. For small, stable components where the full rendered structure is meaningful and reviewable. For inline snapshots that capture specific computed string values. Anywhere the output has a precise, stable structure that's tedious to assert on property-by-property.

---

**Q: What is an inline snapshot and when should you use it? (Medium)**

An inline snapshot stores the expected value directly in the test file: `expect(value).toMatchInlineSnapshot(\`"expected"\`)`. It's preferred over external `.snap` files because the expected value is visible in the test code, changes appear in the test diff during PR review, and it stays small by convention. Use for small, deterministic values like formatted strings or simple data structures.

---

**Q: How do you handle dynamic values (timestamps, IDs) in snapshots? (Medium)**

Mock them before the snapshot. Replace `Date.now()` with `jest.spyOn(Date, "now").mockReturnValue(fixedValue)`, and use seeded UUIDs or mock the UUID generator. Without mocking, every run produces a different snapshot and the test always fails.

---

**Q: What is the `--ci` flag for Jest snapshots? (Low)**

In CI mode, Jest fails if it encounters new snapshots that don't exist in the `.snap` file yet. Without `--ci`, Jest creates the snapshot on first run and the test passes — meaning un-reviewed snapshots can be committed accidentally. The `--ci` flag ensures snapshots are always reviewed before merging.

---

## Self-Assessment

- [ ] I can explain what snapshot testing does and how `.snap` files are created and updated
- [ ] I can articulate the three main problems with component snapshot testing
- [ ] I know when snapshot testing is genuinely useful (non-HTML output, inline for small values)
- [ ] I prefer explicit RTL assertions over snapshots for component behavior testing
- [ ] I know what inline snapshots are and when to use them over external `.snap` files
- [ ] I understand the `--ci` flag and why it matters for snapshot hygiene in CI
