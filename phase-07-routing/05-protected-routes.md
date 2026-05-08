# Protected Routes

## Quick Reference

| Pattern | Mechanism | When to use |
|---|---|---|
| Redirect guard | `<Navigate to="/login" replace />` in route element | Simple auth check |
| Outlet-based guard | Layout route wraps protected children | Multiple routes share one guard |
| Redirect-back | Pass `location` in state to login | Preserve intended destination |
| Role/permission guard | Same pattern with extra condition check | RBAC / feature flags |

---

## What Is This?

A protected route is a route that requires a condition to be met before the user can access it. The most common condition is authentication — "are you logged in?" — but it also covers authorization (roles, permissions) and feature access. If the condition isn't met, the user is redirected to a login page, an error page, or somewhere else appropriate.

There's no special React Router API for this. It's a composition pattern built from the tools already covered: layout routes, `<Outlet>`, and `<Navigate>`.

---

## Why Does It Exist?

Without protected routes, any user who knows a URL can navigate there directly. SPAs must enforce access control on the client side (in addition to server-side enforcement) because the user's browser has all the JavaScript. Client-side protection isn't a security guarantee — the server must also validate — but it prevents UI exposure and provides proper user flows (redirect to login, then back to destination).

---

## How It Works

### The basic pattern

The simplest protected route wraps a single component:

```jsx
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Usage
<Route
  path="/dashboard"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
/>
```

But this gets repetitive if you have many protected routes.

### The Outlet-based layout route (preferred)

Use a layout route that guards all its children at once:

```jsx
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;  // all children render here if authenticated
}

// Route config — no path, just a guard
<Routes>
  <Route path="/login" element={<Login />} />

  <Route element={<RequireAuth />}>  {/* layout route — no path */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
</Routes>
```

`RequireAuth` has no path so it doesn't add a URL segment. It renders `<Outlet>` only if authenticated. All three protected routes share the same guard without repetition.

### Redirect-back pattern

After redirecting to login, send the user back to where they were trying to go:

```jsx
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // location object is passed as navigation state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // Fall back to /dashboard if there's no "from" in state
  const from = location.state?.from?.pathname ?? '/dashboard';

  async function handleSubmit(e) {
    e.preventDefault();
    await login(credentials);
    navigate(from, { replace: true });
  }

  return <LoginForm onSubmit={handleSubmit} />;
}
```

The `replace: true` on both navigations keeps the history stack clean — back from `/dashboard` takes you to wherever you were before trying to access the protected route, not back through the login page.

> **Check yourself:** Why is `replace: true` used when navigating to `/login`, and again when navigating to `from` after login?

### Role-based access

Extend the guard to check roles or permissions:

```jsx
function RequireRole({ allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}

// Route config
<Route element={<RequireRole allowedRoles={['admin', 'moderator']} />}>
  <Route path="/admin" element={<AdminPanel />} />
</Route>
```

### Object config (createBrowserRouter)

In the data router, you can wrap routes in the same way using the `children` array:

```jsx
createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,  // layout with no path
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
]);
```

You can also add auth logic in a `loader`:

```jsx
{
  path: '/dashboard',
  element: <Dashboard />,
  loader: async () => {
    const user = await getUser();
    if (!user) throw redirect('/login');
    return user;
  },
}
```

`redirect` (from `react-router-dom`) creates a `Response` with a `Location` header — the router intercepts it and performs the navigation before rendering. This is the server-side equivalent of the component-level guard and runs before any component renders.

> **Check yourself:** What is the difference between checking auth in a component (`<Navigate>` on render) vs. checking in a loader (`throw redirect()`)?

---

## Gotchas

**Client-side protection is never sufficient alone.** The browser can be devtools'd, localStorage can be manipulated, and the user could fake auth state. All protected endpoints must also validate auth server-side. Client-side protection is UX, not security.

**A flash of protected content can occur.** If auth state loads asynchronously (from an API call), there's a moment where `isAuthenticated` is undefined and the component might render the protected content before the check completes. Guard against this with a loading state:

```jsx
function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
```

**`location.state` is undefined after page refresh.** If a user bookmarks a URL and opens it fresh, `location.state` is null. Always provide a fallback destination:
```jsx
const from = location.state?.from?.pathname ?? '/dashboard';
```

**`<Navigate>` has a render cycle before redirecting.** For protected routes, this means the component body runs briefly before the redirect fires. Don't trigger expensive effects or mutations in components whose guard hasn't been checked yet.

**Avoid storing auth state in sessionStorage/localStorage as the source of truth.** These are readable from JavaScript and can be spoofed. Use httpOnly cookies for the token and derive auth state from an API call. The client-side guard is for UX, not for keeping tokens safe.

---

## Interview Questions

**Q (High): How do you implement protected routes in React Router v6?**

Answer: The idiomatic v6 pattern is a layout route with no path that renders `<Outlet>` only when the user is authenticated:

```jsx
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
```

This component wraps all protected routes in the route config as their parent. It has no URL segment of its own — it's purely a behavioral wrapper. The `<Navigate>` with `state={{ from: location }}` enables the login page to redirect the user back to where they were headed.

The trap: Implementing a separate guard wrapper per route (`<PrivateRoute>` wrapping each `element`). That pattern works but is verbose. The layout route approach is idiomatic v6 and scales to any number of protected routes with one component.

---

**Q (High): Why is `replace: true` important in auth redirects?**

Answer: Without `replace`, every redirect pushes a new entry onto the history stack. After login, the history contains: `/protected-page` → `/login` → `/protected-page`. Pressing back from the final destination goes back to `/login`, which then immediately redirects forward to `/protected-page` again — an infinite loop. With `replace: true` on both redirects, the auth intermediaries are overwritten and the user's back navigation is clean.

---

**Q (Medium): What is the difference between guarding a route in a component vs. in a loader?**

Answer: A component guard (`<Navigate>` on render) fires after the component has started rendering — the component body and its children may briefly execute before the redirect fires. A loader guard (`throw redirect('/login')`) fires before any component renders — the browser never sees the protected component at all. Loader guards are preferable when using the data router because they're cleaner and avoid content flash, but they require the `createBrowserRouter` setup. For the JSX-based setup or when auth state is asynchronous in a way that loaders don't cleanly handle, the component guard is the right tool.

---

**Q (Medium): How do you handle the case where auth state is loading asynchronously?**

Answer: Add an `isLoading` state to your auth hook and render a spinner while it's loading:
```jsx
if (isLoading) return <FullPageSpinner />;
if (!isAuthenticated) return <Navigate to="/login" ... />;
return <Outlet />;
```
Without this, there are two failure modes: render the protected content briefly (if the initial state defaults to authenticated), or redirect to login briefly (if it defaults to unauthenticated). Neither is acceptable. The spinner holds the UI in a neutral state until the decision can be made.

---

**Q (Low): What are the security implications of client-side route protection?**

Answer: Client-side protection is purely a UX concern. It prevents authenticated UI from appearing to unauthenticated users and provides the right redirect flow, but it cannot prevent a determined attacker from accessing protected API endpoints — they bypass the UI entirely. The actual security boundary is the server: every API call, every data query, every mutation must validate the user's identity and authorization before executing. The React Router guard ensures the user sees the right UI flow; the server ensures the user can only see and do what they're permitted to.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can write a `RequireAuth` layout route from memory (no path, Outlet on success, Navigate on failure)
- [ ] Can implement the full redirect-back-after-login pattern including both `replace: true` navigations
- [ ] Can explain why a loading state is necessary before the auth check
- [ ] Can extend the pattern for role-based access (checking user.role)
- [ ] Can explain why client-side route protection is insufficient from a security standpoint

---
*Next: Lazy-Loaded Routes — combining `React.lazy` with the router for route-based code splitting.*
