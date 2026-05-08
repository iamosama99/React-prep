# Programmatic Navigation

## Quick Reference

| Need | API | Notes |
|---|---|---|
| Navigate after an action | `navigate('/path')` | Pushes to history stack |
| Replace current entry | `navigate('/path', { replace: true })` | Back button skips the replaced entry |
| Go back / forward | `navigate(-1)` / `navigate(1)` | Mirrors `history.back()` |
| Pass data without URL | `navigate('/path', { state: {...} })` | Read with `useLocation().state` |
| Declarative redirect | `<Navigate to="/path" />` | Renders redirect as JSX (not a hook) |
| Current location | `useLocation()` | `{ pathname, search, hash, state, key }` |

---

## What Is This?

Programmatic navigation means redirecting the user from JavaScript logic rather than from a link the user clicks. After a form submits successfully, after login, after deleting a record — the app decides where to go next, not the user. `useNavigate()` is the v6 hook that does this. The v5 equivalent was `useHistory()`.

```jsx
function LoginForm() {
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    await login(credentials);
    navigate('/dashboard');  // user is redirected after login
  }
}
```

---

## Why Does It Exist?

Clicking a `<Link>` covers user-initiated navigation. But many real navigation flows are triggered by events: a successful API call, an expired session, a completed multi-step wizard, a confirmation dialog. These don't have a natural link element — the destination depends on runtime data. `useNavigate` exposes the same history manipulation that `<Link>` uses internally, but as a function you can call anywhere in your component logic.

---

## How It Works

### useNavigate

`useNavigate()` returns a `navigate` function. Call it with a path string to push a new entry onto the history stack:

```jsx
const navigate = useNavigate();
navigate('/users/42');
```

Or pass a delta to move through history:

```jsx
navigate(-1);  // same as browser back button
navigate(1);   // same as browser forward button
navigate(-2);  // go back two steps
```

### push vs replace

By default `navigate()` pushes a new history entry. That means the user can press the browser's back button to return. Sometimes that's wrong — if you redirect after login, you don't want the back button to return to the login page. Use `{ replace: true }`:

```jsx
// After login — replace so back doesn't re-show the login page
navigate('/dashboard', { replace: true });

// After 404 — no point keeping the invalid URL in history
navigate('/not-found', { replace: true });
```

### Passing state

You can carry arbitrary data through a navigation without putting it in the URL. The data lives in the browser's history entry and is accessible via `useLocation().state`:

```jsx
// Navigating
navigate('/users/42', { state: { from: 'email-link', timestamp: Date.now() } });

// Receiving
function UserDetail() {
  const location = useLocation();
  const referralSource = location.state?.from;
}
```

Navigation state is not visible in the URL (can't be bookmarked or shared) and disappears if the user directly navigates to that URL. Use it for ephemeral context like "where did this navigation come from" or "what was the previous search query."

> **Check yourself:** A user is on `/login` and your code calls `navigate('/dashboard')`. The user then presses the browser back button. Where do they end up — `/login` or the page before `/login`?

### useLocation

`useLocation()` returns the current location object:

```jsx
const location = useLocation();
// {
//   pathname: '/users/42',
//   search: '?tab=posts',
//   hash: '#comments',
//   state: { from: '/dashboard' },
//   key: 'ax7f3'
// }
```

Useful for reading navigation state, building "go back" logic, or knowing the full current URL.

### The `<Navigate>` component

`<Navigate>` is the declarative equivalent — it's a component that, when rendered, immediately redirects. Most useful in JSX for conditional redirects:

```jsx
function ProtectedPage({ isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <PageContent />;
}
```

Under the hood `<Navigate>` calls `navigate()` in a `useEffect`. Don't use it in event handlers — use `navigate()` there. `<Navigate>` is for conditional render-time redirects.

> **Check yourself:** When would you choose `<Navigate>` over `navigate()`? When would you choose the opposite?

---

## Redirect After Login (Common Pattern)

The canonical auth redirect pattern: when an unauthenticated user hits a protected route, redirect them to `/login` and remember where they wanted to go. After login, redirect them there.

```jsx
// ProtectedRoute component
function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Pass the current path as state so login can redirect back
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// LoginPage
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  async function handleLogin(credentials) {
    await login(credentials);
    navigate(from, { replace: true });
  }
}
```

The `replace: true` on both navigations prevents the history stack from growing with intermediate auth pages.

---

## Gotchas

**`navigate()` outside a Router context throws.** Like all React Router hooks, `useNavigate` requires a router ancestor. If you call it from a utility function or service layer, you're outside the React tree — pass the navigate function as an argument or put it in context.

**`navigate(-1)` can take you off-site.** If the user opened your app directly (no history before it), `navigate(-1)` exits the SPA and goes to whatever was in the browser history before. Guard this:
```jsx
function BackButton() {
  const navigate = useNavigate();
  // Only go back if there's something to go back to
  return (
    <button onClick={() => navigate(-1)}>Back</button>
  );
}
```

**Location state is session-only.** If the user refreshes the page or opens a new tab to the same URL, `location.state` is null. Any logic that depends on it must handle the null case.

**`<Navigate>` causes an extra render cycle.** It triggers inside render (via effect), so you may see a brief flash of the protected content before the redirect fires. For auth guards, it's often better to check auth state before rendering anything at all.

**`navigate()` in `useEffect` can cause infinite loops.** If the effect's dependency array includes something that the navigation changes (like a route param), you can get a redirect loop. Be deliberate about when exactly you call `navigate()`.

---

## Interview Questions

**Q (High): When would you use `{ replace: true }` with `navigate()`?**

Answer: When you don't want the redirected-from page to appear in the history stack. The canonical cases: after login (so back doesn't take you back to the login page), after form submission (so back doesn't re-submit), after a session timeout redirect, and after a 404 redirect. In each case, the intermediate URL is not meaningful to the user as a "back" destination. With push (default), the user can back-navigate there; with replace, that entry is overwritten and back takes them somewhere sensible.

The trap: Using replace everywhere "just to be safe." Replace should be deliberate — it removes entries from history that the user may legitimately want to go back to.

---

**Q (High): How do you pass the user's intended destination through a login redirect?**

Answer: Store it in navigation state on the redirect. In the auth guard, pass the current location object as state when redirecting to login:
```jsx
<Navigate to="/login" state={{ from: location }} replace />
```
In the login handler, read it back and use it as the post-login destination:
```jsx
const from = location.state?.from?.pathname ?? '/dashboard';
navigate(from, { replace: true });
```
Navigation state is invisible in the URL, persists through the login flow, and disappears on page refresh — appropriate for ephemeral routing context.

The trap: Putting the intended destination in the URL as a query param (e.g., `?redirect=/dashboard`). This works but the URL becomes ugly and the value is visible. It's also a potential open redirect vulnerability if not validated.

---

**Q (Medium): What is the difference between `<Navigate>` and calling `navigate()` imperatively?**

Answer: `<Navigate>` is a component that redirects when it renders — it's for conditional render-time redirects in JSX (the "if not authenticated, show a redirect" pattern). `navigate()` from `useNavigate()` is a function you call in event handlers, async callbacks, and effects — any imperative code path. You can't use `<Navigate>` in a click handler because you're not in render at that point. You shouldn't use `navigate()` directly in JSX return because that would cause a render-time side effect. Both ultimately call the same underlying history API.

---

**Q (Medium): Why can `navigate(-1)` be problematic and how do you guard against it?**

Answer: `navigate(-1)` delegates to the browser's history stack, which extends beyond your SPA. If a user arrives at your app with a fresh tab (no history), or if they navigated to the current page directly, `navigate(-1)` will leave your app entirely and go to whatever the browser had before — another website or the new tab page. You can guard it by checking `window.history.length > 1` or by always providing a fallback path. A more robust pattern is to track "can go back" via your own app's navigation state rather than relying on the browser's history count.

---

**Q (Low): How does navigation state differ from URL state (search params)?**

Answer: Navigation state travels through the history API as metadata attached to a history entry — it's never in the URL, never bookmarkable, and is gone on page refresh. Search params are part of the URL, survive refresh, can be shared via link, and affect browser history in their own right. Use navigation state for ephemeral context that shouldn't be in the URL: "came from this source," "pre-filled form data from the previous step." Use search params for persistent, shareable UI state: filters, pagination, sort order. A useful test: "would I want the user to be able to bookmark or share this state?" If yes, URL. If no, navigation state — or component state.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can explain the difference between push and replace navigation and name two scenarios for each
- [ ] Can implement the "redirect to intended destination after login" pattern from memory
- [ ] Can explain when to use `<Navigate>` vs `navigate()` — render-time vs imperative
- [ ] Can explain what `useLocation().state` is and why it disappears on page refresh
- [ ] Know the risk of `navigate(-1)` when there's no prior history

---
*Next: Protected Routes — auth guards built on Navigate and Outlet, plus redirect-back patterns.*
