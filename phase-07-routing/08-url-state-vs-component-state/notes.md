# URL State vs Component State

## Quick Reference

| State belongs in URL when... | State belongs in component when... |
|---|---|
| User should be able to bookmark or share it | It's ephemeral UI interaction (hover, focus, open/close) |
| Browser back/forward should restore it | It resets on navigation intentionally |
| It describes what the user is looking at | It describes transient visual feedback |
| Multiple components read the same value | It's local to one component |

---

## What Is This?

Every piece of UI state needs a home: either the browser's URL (address bar) or React's component state (or a store). They're not interchangeable. Putting the wrong kind of state in the wrong place creates subtle bugs — filters that reset on refresh, back-button navigation that doesn't restore the previous view, deep links that arrive at the wrong state.

The decision is about durability, shareability, and navigability. The URL is the web's universal state container — it survives page refresh, can be copied and shared, and integrates with the browser's history model.

---

## Why This Distinction Matters

URL state and component state have fundamentally different lifecycles:

- **URL state** persists across page refreshes, is part of the browser's history stack, can be bookmarked, shared by link, and read without JavaScript running
- **Component state** lives in React's memory for the duration of a component's lifetime — it resets when the component unmounts or the page refreshes

Putting UI filters in component state means a user who shares the URL with filtered results shares an unfiltered page. Putting a modal's open/close state in the URL means the back button closes the modal instead of going to the previous page — likely not what you want.

---

## How to Decide

Ask these questions:

**1. Should a refreshed page look the same?**
Search filters, table pagination, selected items, sort order — yes. Modal open, tooltip visible, input focus — no.

**2. Can/should this be shared via URL?**
"Here's my filtered product view" — yes. "I had an error message visible" — no.

**3. Does the back button have meaningful behavior here?**
Going back to the previous search/filter state — yes, useful. Going back to "that accordion was expanded" — no, distracting.

**4. Do multiple components need this value?**
If yes, it often belongs in a shared layer. Whether that layer is the URL, context, or a store depends on the above criteria.

---

## URL State in Practice

### useSearchParams for query string state

```jsx
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? 'all';
  const page = Number(searchParams.get('page') ?? '1');
  const sort = searchParams.get('sort') ?? 'relevance';

  function setCategory(cat) {
    setSearchParams(prev => {
      prev.set('category', cat);
      prev.set('page', '1');  // reset pagination when filter changes
      return prev;
    });
  }

  // URL becomes: /products?category=shoes&page=1&sort=relevance
}
```

Now `/products?category=shoes&sort=price` is a shareable, bookmarkable URL that recreates the exact same filtered view.

### Using replace vs push for filter changes

Filter changes typically shouldn't add to history — you don't want 20 history entries from adjusting sliders:

```jsx
setSearchParams(prev => {
  prev.set('minPrice', value);
  return prev;
}, { replace: true });
```

But pagination might want history entries so back takes you to the previous page:

```jsx
setSearchParams({ page: nextPage });  // push — back button restores
```

The rule: does back to "before this change" make sense? If yes, push. If no, replace.

### URL params for navigation identity

`:id` segments (URL params) are always the right place for the identity of what you're viewing. `/users/42` — the `42` is URL state. The component needs this to fetch the right data, and the URL communicates to the user exactly what they're looking at.

> **Check yourself:** A user on `/products?category=shoes` refreshes the page. What do they see if category is URL state? What do they see if it's component state?

---

## Component State in Practice

### Ephemeral UI state

```jsx
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  // isOpen in component state — resetting on navigation is correct
}

function DataTable() {
  const [hoveredRow, setHoveredRow] = useState(null);
  // hover state is always ephemeral
}
```

These states are meaningless outside the current render. Sharing a URL with a dropdown open is odd. Back-button behavior on hover state is wrong.

### Form input state during editing

A form being filled out is usually component state — you don't want every keystroke in a search box to push to history. But the submitted search query probably belongs in the URL.

```jsx
function SearchBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get('q') ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    setSearchParams({ q: inputValue });  // committed query → URL
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}  // draft → component state
      />
    </form>
  );
}
```

Draft (typing) → component state. Committed (submitted) → URL state.

---

## The Modal Dilemma

Modals are a classic edge case. Two valid approaches:

**Modal as component state** (common):
```jsx
const [showModal, setShowModal] = useState(false);
```
Simple. Back button doesn't close it. Can't deep-link to "modal open." Fine for most cases.

**Modal as URL state** (when deep-linking matters):
```jsx
const [searchParams, setSearchParams] = useSearchParams();
const isOpen = searchParams.has('modal');

function openModal() {
  setSearchParams(prev => { prev.set('modal', '1'); return prev; });
}
```
Or as a route: `/users/42/edit` with the edit form as a route renders in a modal — back button closes the modal, URL is shareable, browser history is meaningful.

Choose URL-based modals when the modal represents a distinct navigable state (editing, viewing detail). Choose component-state modals for confirmations, alerts, and menus that don't represent a distinct view.

> **Check yourself:** A user opens a product detail page in a modal by clicking a row in a table. They want to share the product link with a colleague. Should the modal open state be in the URL?

---

## Syncing URL State with Component State

Sometimes you need local draft state that syncs to the URL on commit:

```jsx
function Filters() {
  const [params, setParams] = useSearchParams();
  // Initialize local state from URL
  const [localFilters, setLocalFilters] = useState({
    category: params.get('category') ?? 'all',
    minPrice: params.get('minPrice') ?? '',
  });

  function applyFilters() {
    setParams(localFilters);  // commit to URL on "Apply" click
  }

  // Local changes don't hit URL until Apply
}
```

This pattern is common for filter panels with an "Apply" button — responsive to user input without spamming history.

---

## Gotchas

**Search params are strings.** Just like URL params, everything is a string. Parse numbers and booleans before use: `Number(params.get('page'))`, `params.get('active') === 'true'`.

**`setSearchParams` replaces all params unless you use the functional form.** `setSearchParams({ category: 'shoes' })` loses `?sort=price`. Use `setSearchParams(prev => { prev.set(...); return prev; })`.

**URL state is public.** Don't put sensitive information in the URL — it appears in browser history, server logs, and referrer headers. Filter values are fine; auth tokens are not.

**Encoding:** `URLSearchParams` handles encoding automatically. Values with spaces, special characters, slashes — they're encoded and decoded correctly.

**Stale URL state on mount.** If a user has a bookmarked URL with old filter values (e.g., a deleted category), your app must handle the mismatch gracefully — fall back to defaults, show an empty state, or redirect.

---

## Interview Questions

**Q (High): How do you decide whether a piece of state belongs in the URL or in component state?**

Answer: The test is: does this state need to survive page refresh, be shareable by URL, or be restorable via the browser back button? If any answer is yes, it belongs in the URL. Filters, pagination, sort order, search queries, selected items, active tab — these describe "what the user is looking at" and should be in the URL. Open/closed for dropdowns and modals, hover states, in-progress form input, animation state — these are ephemeral UI mechanics that either make no sense in a URL or would produce confusing back-button behavior. A practical follow-up question: can a user paste this URL to a colleague and get the same view? If yes, URL state. If no, component state.

The trap: Putting everything in the URL "to be safe." URL state pushes to history, affects back-button behavior, and is visible in browser history and server logs. Over-using it creates a noisy history stack and navigation behavior users don't expect.

---

**Q (High): A user is on a product list page with category and sort filters applied. They navigate to a product detail page and press back. What should happen, and how do you implement it?**

Answer: They should return to the product list with their filters preserved. This requires the filters to be in the URL (`?category=shoes&sort=price`) rather than in component state. With URL state, the back button literally restores the previous URL — no additional implementation needed. React Router re-renders the component with the old search params, and `useSearchParams()` returns them. With component state, the filters would reset to defaults because the component unmounts on navigation and remounts fresh on back. This is the core argument for URL state on navigation-affecting values — the browser's history mechanism handles the restore automatically.

---

**Q (Medium): How would you implement a search input that updates the URL on submit but not on every keystroke?**

Answer: Keep a local `inputValue` state for the in-progress text (component state), and commit to `searchParams` on form submit (URL state). Initialize `inputValue` from the URL param on mount so refreshing shows the current search. The two-state pattern is: draft (component) → committed (URL). The `setSearchParams` call on submit pushes a new history entry so back restores the previous search query.

---

**Q (Medium): When should filter changes use `replace: true` vs the default push?**

Answer: Replace when the filter change shouldn't create a distinct history entry — rapid slider adjustments, toggling individual facets in a facet list. If you push on every change, the user needs to press back 20 times to get back to their previous page. Push when the filter change represents a meaningful "state" the user might want to navigate back to — changing from one category to another, submitting a new search, paginating to a specific page. The guiding question is: is "undo this filter change" via the back button useful? If yes, push. If no, replace.

---

**Q (Low): What are the security implications of storing data in URL state?**

Answer: URL state is visible in: the browser's address bar, the browser's history, server access logs (from the Referer header when navigating to external sites), and any browser extensions. Don't put auth tokens, session IDs, PII, or sensitive business data in the URL. Filters, sort order, search terms, and pagination are fine. Note that even for innocuous data, there's a privacy consideration: browsing history with filter values might reveal purchase patterns or health-related searches. This rarely matters for internal tools but matters more for consumer-facing apps.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the three-question test for URL vs component state (refresh, share, back button)
- [ ] Can implement a filter component that reads from and writes to `useSearchParams`
- [ ] Can explain the two-state pattern: draft in component state, committed value in URL
- [ ] Can explain when to use `replace: true` vs push for `setSearchParams` calls
- [ ] Can explain the modal dilemma and when each approach is appropriate
- [ ] Know that URL state is always strings and understand the parsing requirements

---
*Next: Phase 8 — Forms. Building on the router's `<Form>` and action patterns, going deep on controlled/uncontrolled form design, validation, React Hook Form, and multi-step wizards.*
