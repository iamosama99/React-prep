# CSRF in SPA Contexts

## What is CSRF

Cross-Site Request Forgery tricks a user's browser into making a request to your API using the user's credentials — without the user's intent. The attacker doesn't need to see the response; they just need the action to happen.

Classic example: a forum post containing:
```html
<img src="https://bank.com/transfer?to=attacker&amount=1000" />
```
The browser loads the "image," which fires a GET request to `bank.com` with the user's cookies attached. If bank.com doesn't verify the request origin, the transfer executes.

---

## When CSRF Matters for SPAs

CSRF is **only relevant if your app uses cookies for authentication**. If you use `Authorization: Bearer <token>` headers with a token from localStorage/memory, CSRF is not a concern — a malicious site cannot set your custom headers.

| Auth method | CSRF risk |
|---|---|
| httpOnly session/refresh cookie | Yes |
| Bearer token in Authorization header | No |
| localStorage token + JS-set header | No |
| Cookie with `SameSite: strict` | Effectively no |
| Cookie with `SameSite: lax` | Mitigated for most vectors |

If you've read the authentication patterns topic: the recommended approach (refresh token in httpOnly cookie + access token in memory sent via Authorization header) means your state-changing API calls use the `Authorization` header, not the cookie — so they're CSRF-immune even without additional CSRF protection.

---

## SameSite Cookie Attribute

The most practical CSRF defense for modern apps. The browser enforces it natively.

```ts
// Server-side (express)
res.cookie('session', token, {
  sameSite: 'lax',   // recommended default
  httpOnly: true,
  secure: true,
});
```

**`SameSite: lax`** — Cookie is sent only when:
- The request is same-site, OR
- The request is a top-level navigation (address bar change) using a "safe" HTTP method (GET, HEAD)

It blocks the most dangerous CSRF vectors: cross-site POST forms, cross-site AJAX, and cross-site fetch. It does NOT block cross-site GET requests (hence the bank example above would still work for GET-based actions — GET should never cause side effects).

**`SameSite: strict`** — Cookie is never sent on cross-site requests, including top-level navigation. Clicking a link on another site to your app won't include the cookie. This breaks OAuth flows and external link sharing for authenticated pages.

**`SameSite: none`** — Always sent, including cross-site. Requires `Secure`. Used for third-party cookie scenarios (embedded widgets, auth flows across subdomains).

---

## CSRF Tokens

For apps that can't fully rely on `SameSite` (older browser support, complex multi-origin setups), CSRF tokens are the explicit mitigation.

**Synchronizer Token Pattern:**
```ts
// Server: generate a CSRF token and include it in the HTML or an API response
// (not in an httpOnly cookie — it needs to be readable by JS)

// In Next.js/Express, you might include it in initial page data:
// <meta name="csrf-token" content="{{ csrfToken }}">

// Client reads it and attaches it to mutation requests
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

async function postData(url: string, data: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken ?? '',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });
}

// Server validates: the token in the header must match the token in the session
```

**Double-Submit Cookie Pattern (stateless):**

```ts
// Server sets a readable CSRF cookie (not httpOnly)
res.cookie('csrf_token', randomToken, {
  sameSite: 'lax',
  secure: true,
  httpOnly: false, // must be readable by JS
});

// Client reads it and echoes it in a header
const csrfCookie = document.cookie
  .split('; ')
  .find(c => c.startsWith('csrf_token='))
  ?.split('=')[1];

fetch('/api/delete-account', {
  method: 'DELETE',
  headers: { 'X-CSRF-Token': csrfCookie },
  credentials: 'include',
});

// Server: verify the header value matches the cookie value
// An attacker from another origin can't read your cookie (same-origin policy)
// so they can't set the matching header — the attack fails
```

---

## CORS vs CSRF

These are often confused. They solve different problems.

| | CORS | CSRF |
|---|---|---|
| Problem | Restricts which origins can read responses | Prevents unauthorized state-changing requests |
| Enforced by | Browser (preflight + header check) | Server (token or SameSite) |
| Protects | Reading cross-origin data | Unauthorized mutations |
| Doesn't protect | Against CSRF (doesn't prevent request) | Against XSS |

CORS blocks cross-origin reads, not cross-origin requests. A cross-site POST still fires (the browser sends it); CORS just prevents the malicious page from reading the response. The mutation already happened. That's why CORS is not a CSRF defense.

**However:** CORS does block cross-site `fetch` with custom headers. Since a CSRF token is a custom header, requiring it implicitly prevents CSRF from cross-origin fetch calls — the preflight fails. But it doesn't help with simple requests (no-custom-header form submissions), which is why CSRF tokens or SameSite are still needed.

---

> **Check yourself:** You're building a REST API. Your front-end is at `app.example.com`, the API is at `api.example.com`. You use httpOnly cookies for auth. Do you need CSRF protection? Yes — they're different subdomains, but cookies can be scoped to `.example.com`. You need either `SameSite: lax` (browsers treat same-registrable-domain as "same-site") or a CSRF token. Check whether your cookie domain is `.example.com` or `api.example.com` — the former means same-site rules apply.

---

## Self-Assessment

- [ ] I can explain what CSRF is and why it only matters when using cookies for auth
- [ ] I know what each `SameSite` value does
- [ ] I understand the double-submit cookie pattern and why an attacker can't replicate it
- [ ] I can explain why CORS is not a CSRF defense
- [ ] I know when Bearer tokens eliminate the need for CSRF protection

---

## Interview Q&A

**Q: What is CSRF and when does it apply to SPAs? `High`**

A: CSRF is when an attacker tricks a browser into making a request to your API using the user's cookies. It only applies when authentication is cookie-based — because the browser automatically sends cookies on every request, including those triggered by malicious third-party pages. If you use token-based auth where the token is in an `Authorization` header set by JavaScript, CSRF doesn't apply — a cross-site request can't set custom headers.

---

**Q: How does `SameSite: lax` mitigate CSRF? `High`**

A: With `SameSite: lax`, the browser only sends the cookie when the request originates from the same site OR is a top-level navigation GET. Cross-site form submissions (POST), cross-site fetch/XMLHttpRequest calls, and cross-site iframes won't include the cookie. This eliminates the most common CSRF attack vectors without breaking OAuth login flows (which use top-level GET redirects).

---

**Q: Why doesn't CORS protect against CSRF? `Medium`**

A: CORS restricts which origins can read cross-origin responses — it doesn't prevent the request from being sent. A CSRF attack doesn't need to read the response; it just needs the mutation to happen. The server still receives and processes the request before CORS headers are checked. CORS is a client-side enforcement mechanism for response access, not a server-side gate for request execution.

---

**Q: What is the difference between the synchronizer token pattern and the double-submit cookie pattern? `Low`**

A: The synchronizer token pattern stores the CSRF token server-side (in the session) and validates the submitted token against it — it's stateful. The double-submit cookie pattern is stateless: the token is in a readable cookie, and the client echoes it in a header. The server just checks they match. The attacker can't replicate this because same-origin policy prevents them from reading your cookies to set the matching header.
