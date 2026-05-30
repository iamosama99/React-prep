// ============================================================
// Topic:   Authentication Patterns
// Phase:   13 — Tooling, Security & A11y
// File:    tutorial.tsx
//
// Exercise type: ATTACK SIMULATOR + SEQUENCE PUZZLE + CODE REVIEW + AUTH CONTEXT BUILD
//
// Run: npm run tutorial 05-authentication-patterns
// ============================================================

import { useState, useEffect, useCallback, FC, createContext, useContext, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Token Storage Risk Matrix
//
// Three storage options: localStorage, memory, httpOnly cookie.
// For each, simulate XSS and CSRF attacks.
// Key insight: no single option defeats both threats.
// ─────────────────────────────────────────────────────────────

type StorageType = 'localStorage' | 'memory' | 'httpOnlyCookie';
type AttackType = 'xss' | 'csrf';
type AttackResult = 'compromised' | 'protected' | 'partial';

interface StorageOption {
  id: StorageType;
  label: string;
  description: string;
  xss: AttackResult;
  xssExplanation: string;
  csrf: AttackResult;
  csrfExplanation: string;
  recommendation: string;
}

const STORAGE_OPTIONS: StorageOption[] = [
  {
    id: 'localStorage',
    label: 'localStorage',
    description: 'Token stored with localStorage.setItem("token", jwt)',
    xss: 'compromised',
    xssExplanation: 'Any JavaScript running on the page — including injected attacker code or a compromised third-party script — can call localStorage.getItem("token") and exfiltrate the token to a remote server. Once stolen, the attacker has full session access until the token expires.',
    csrf: 'protected',
    csrfExplanation: 'CSRF requires the browser to automatically send credentials. localStorage is not automatically attached to requests. The attacker would need to read the token value first — which requires XSS. So localStorage is immune to pure CSRF, but vulnerable to XSS which is often easier to achieve.',
    recommendation: 'Never store auth tokens in localStorage. XSS is a realistic threat on modern apps that load third-party scripts. The CSRF immunity does not compensate for XSS exposure.',
  },
  {
    id: 'memory',
    label: 'Memory (module variable)',
    description: 'Token stored as: let accessToken: string | null = null',
    xss: 'partial',
    xssExplanation: 'Memory is safer than localStorage but not immune. If an attacker achieves XSS, they can execute arbitrary code in the same page context — meaning they can call your module\'s exported functions or read the variable if it\'s reachable. The token is NOT accessible from browser DevTools storage tabs or other tabs, which limits persistence. Use with short TTL (15 min).',
    csrf: 'protected',
    csrfExplanation: 'An in-memory token cannot be automatically sent by the browser in cross-site requests. The attacker can\'t trigger a request that includes the token unless they have code execution on the page (XSS). Memory variables are not transmitted as cookies, so CSRF does not apply.',
    recommendation: 'Good choice for short-lived access tokens (15-minute TTL). Pair with an httpOnly refresh token cookie. The access token is lost on page refresh — restore it by calling /api/auth/refresh on mount.',
  },
  {
    id: 'httpOnlyCookie',
    label: 'httpOnly Cookie',
    description: 'Server sets: Set-Cookie: session=token; HttpOnly; Secure; SameSite=lax',
    xss: 'protected',
    xssExplanation: 'document.cookie does not expose httpOnly cookies. JavaScript has no API to read them. Even if an attacker achieves XSS, they cannot directly steal the token. They can still make authenticated requests FROM the victim\'s browser (since the browser attaches the cookie automatically), but they cannot exfiltrate the token itself to use elsewhere.',
    csrf: 'partial',
    csrfExplanation: 'The browser automatically attaches cookies to same-site AND (without protection) cross-site requests. A malicious page can trigger a POST to your API and the browser sends the cookie. With SameSite: lax, cross-site POST/AJAX is blocked. With SameSite: strict, all cross-site is blocked but OAuth flows break. Mitigated, not eliminated.',
    recommendation: 'Best choice for refresh tokens and session tokens. Use SameSite: lax as a baseline. Add a CSRF token (double-submit cookie pattern) for extra protection on state-changing endpoints.',
  },
];

const RESULT_COLORS: Record<AttackResult, string> = {
  compromised: '#c0392b',
  protected: '#27ae60',
  partial: '#e67e22',
};

const RESULT_LABELS: Record<AttackResult, string> = {
  compromised: 'Compromised',
  protected: 'Protected',
  partial: 'Partial risk',
};

interface SimState {
  xssRevealed: boolean;
  csrfRevealed: boolean;
}

const Exercise1_TokenStorageRiskMatrix: FC = () => {
  const [simState, setSimState] = useState<Record<StorageType, SimState>>({
    localStorage: { xssRevealed: false, csrfRevealed: false },
    memory: { xssRevealed: false, csrfRevealed: false },
    httpOnlyCookie: { xssRevealed: false, csrfRevealed: false },
  });

  function reveal(storage: StorageType, attack: AttackType) {
    setSimState(prev => ({
      ...prev,
      [storage]: { ...prev[storage], [`${attack}Revealed`]: true },
    }));
  }

  return (
    <section>
      <h2>Exercise 1: Token Storage Risk Matrix</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each storage type, simulate an XSS attack and a CSRF attack. See what the attacker can access.
        The goal: understand why no single option eliminates both risks.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {STORAGE_OPTIONS.map(option => {
          const state = simState[option.id];
          return (
            <div key={option.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                <strong style={{ fontSize: '1rem' }}>{option.label}</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#666', fontFamily: 'monospace' }}>{option.description}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* XSS */}
                <div style={{ padding: '1rem', borderRight: '1px solid #eee', borderBottom: state.xssRevealed ? 'none' : undefined }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#555', marginBottom: '0.5rem' }}>XSS Attack</div>
                  {!state.xssRevealed ? (
                    <button
                      onClick={() => reveal(option.id, 'xss')}
                      style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid #c0392b', background: '#fff5f5', color: '#c0392b', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      Simulate XSS Attack →
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '20px', background: RESULT_COLORS[option.xss], color: '#fff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {RESULT_LABELS[option.xss]}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#444', lineHeight: 1.6 }}>{option.xssExplanation}</p>
                    </div>
                  )}
                </div>
                {/* CSRF */}
                <div style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#555', marginBottom: '0.5rem' }}>CSRF Attack</div>
                  {!state.csrfRevealed ? (
                    <button
                      onClick={() => reveal(option.id, 'csrf')}
                      style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: '2px solid #8e44ad', background: '#f9f0ff', color: '#8e44ad', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      Simulate CSRF Attack →
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '20px', background: RESULT_COLORS[option.csrf], color: '#fff', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {RESULT_LABELS[option.csrf]}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#444', lineHeight: 1.6 }}>{option.csrfExplanation}</p>
                    </div>
                  )}
                </div>
              </div>
              {state.xssRevealed && state.csrfRevealed && (
                <div style={{ padding: '0.75rem 1.25rem', background: '#f8f9fa', borderTop: '1px solid #eee', fontSize: '0.82rem', color: '#555' }}>
                  <strong>Recommendation:</strong> {option.recommendation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Which storage type protects against XSS but is vulnerable to CSRF? Which protects against CSRF but not XSS?</li>
          <li>The recommended pattern is: access token in memory + refresh token in httpOnly cookie. Why does this combination work better than either alone?</li>
          <li>If an attacker achieves XSS on your app, can they steal an httpOnly cookie? What CAN they do?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Auth Flow Sequence Puzzle
//
// Eight steps of the refresh token pattern — scrambled.
// Click to reorder them, then reveal the correct sequence.
// ─────────────────────────────────────────────────────────────

interface Step {
  id: number;
  text: string;
  detail: string;
  correctOrder: number;
}

const AUTH_STEPS: Step[] = [
  {
    id: 1,
    text: 'User submits login form (email + password)',
    detail: 'The front-end POSTs credentials to /api/auth/login with Content-Type: application/json.',
    correctOrder: 1,
  },
  {
    id: 2,
    text: 'Server validates credentials and issues tokens',
    detail: 'Server verifies password hash, generates a short-lived access JWT (15 min) and a long-lived refresh token (7 days).',
    correctOrder: 2,
  },
  {
    id: 3,
    text: 'Server stores refresh token in httpOnly cookie',
    detail: 'Set-Cookie: refresh_token=<value>; HttpOnly; Secure; SameSite=lax; Max-Age=604800. JS cannot read this.',
    correctOrder: 3,
  },
  {
    id: 4,
    text: 'Client receives access token in JSON response body and stores it in memory',
    detail: 'let accessToken = data.accessToken — a module-level variable, NOT localStorage. Lost on page refresh.',
    correctOrder: 4,
  },
  {
    id: 5,
    text: 'Client sends API requests with Authorization: Bearer <accessToken> header',
    detail: 'fetch("/api/data", { headers: { Authorization: `Bearer ${accessToken}` } }). CSRF-immune — not a cookie.',
    correctOrder: 5,
  },
  {
    id: 6,
    text: 'Access token expires — client detects 401 response',
    detail: 'After 15 minutes, the server rejects the access token. The client must refresh before retrying.',
    correctOrder: 6,
  },
  {
    id: 7,
    text: 'Client calls /api/auth/refresh with credentials: "include"',
    detail: 'fetch("/api/auth/refresh", { credentials: "include" }) — this sends the httpOnly refresh cookie. The server validates it and issues a new access token.',
    correctOrder: 7,
  },
  {
    id: 8,
    text: 'On app mount, restore session by calling /api/auth/me',
    detail: 'When the page loads fresh, the access token is gone (memory). Call /api/auth/me with credentials: "include" — if the refresh cookie is valid, the server responds with user info (or call /refresh first to get a new access token).',
    correctOrder: 8,
  },
];

const SCRAMBLED_ORDER = [3, 8, 1, 6, 4, 2, 7, 5];

const Exercise2_AuthSequencePuzzle: FC = () => {
  const [order, setOrder] = useState<number[]>(SCRAMBLED_ORDER);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const stepMap = Object.fromEntries(AUTH_STEPS.map(s => [s.id, s]));

  function handleClick(id: number) {
    if (revealed) return;
    if (selected === null) {
      setSelected(id);
    } else if (selected === id) {
      setSelected(null);
    } else {
      // Swap
      setOrder(prev => {
        const next = [...prev];
        const a = next.indexOf(selected);
        const b = next.indexOf(id);
        [next[a], next[b]] = [next[b], next[a]];
        return next;
      });
      setSelected(null);
    }
  }

  const correctOrder = AUTH_STEPS.sort((a, b) => a.correctOrder - b.correctOrder).map(s => s.id);
  const isCorrect = order.every((id, i) => id === correctOrder[i]);

  return (
    <section>
      <h2>Exercise 2: Auth Flow Sequence Puzzle</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The steps of the refresh-token auth pattern are scrambled. Click a step to select it, then click another to swap.
        Get the sequence right, then reveal explanations.
      </p>

      <div style={{ background: '#e8f0fe', padding: '0.6rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem', color: '#1a73e8' }}>
        <strong>How to use:</strong> Click a step to select it (highlights in blue), then click another step to swap them.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {order.map((id, i) => {
          const step = stepMap[id];
          const isSelected = selected === id;
          const isCorrectPosition = !revealed || step.correctOrder === i + 1;
          return (
            <div
              key={id}
              onClick={() => handleClick(id)}
              style={{
                padding: '0.75rem 1rem',
                border: '2px solid',
                borderColor: isSelected ? '#1a73e8' : revealed ? (isCorrectPosition ? '#27ae60' : '#c0392b') : '#ddd',
                borderRadius: '8px',
                background: isSelected ? '#e8f0fe' : revealed ? (isCorrectPosition ? '#f0fff4' : '#fff5f5') : '#fff',
                cursor: revealed ? 'default' : 'pointer',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                minWidth: '1.75rem',
                height: '1.75rem',
                borderRadius: '50%',
                background: isSelected ? '#1a73e8' : '#e0e0e0',
                color: isSelected ? '#fff' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.82rem',
                flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#333' }}>{step.text}</div>
                {revealed && (
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.25rem', lineHeight: 1.55 }}>{step.detail}</div>
                )}
              </div>
              {revealed && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isCorrectPosition ? '#27ae60' : '#c0392b', whiteSpace: 'nowrap' }}>
                  {isCorrectPosition ? '✓' : `→ step ${step.correctOrder}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={() => setRevealed(true)}
          style={{ padding: '0.5rem 1.5rem', borderRadius: '7px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
        >
          Reveal correct order + explanations
        </button>
        {revealed && (
          <span style={{ fontSize: '0.88rem', color: isCorrect ? '#27ae60' : '#c0392b', fontWeight: 600 }}>
            {isCorrect ? '✓ You had it right!' : 'Check the highlighted corrections above.'}
          </span>
        )}
        <button
          onClick={() => { setOrder(SCRAMBLED_ORDER); setRevealed(false); setSelected(null); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Reset
        </button>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why does step 8 (restore session on mount) matter even though it's "last"? What would happen without it?</li>
          <li>The access token is lost on page refresh. Why is that actually desirable from a security perspective?</li>
          <li>Step 7 uses <code>credentials: 'include'</code>. What happens if you forget this flag on a cross-origin API?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Auth Code Review: Spot the Bug
//
// Five code snippets with auth anti-patterns.
// Identify the problem in each before revealing the explanation.
// ─────────────────────────────────────────────────────────────

interface CodeIssue {
  id: number;
  title: string;
  code: string;
  problem: string;
  fix: string;
}

const CODE_ISSUES: CodeIssue[] = [
  {
    id: 1,
    title: 'Storing JWT in localStorage',
    code: `async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { token } = await res.json();
  localStorage.setItem('auth_token', token); // ← problem here
}`,
    problem: 'localStorage is readable by any JavaScript on the page. A single XSS vulnerability — even in a third-party analytics script you loaded — lets an attacker call localStorage.getItem("auth_token") and exfiltrate it. With a refresh token in localStorage, the attacker has indefinite session access.',
    fix: 'Store the access token in a module-level variable (memory). Store the refresh token in an httpOnly cookie (server-side). Never put any auth token in localStorage.',
  },
  {
    id: 2,
    title: 'Missing credentials: "include" on cross-origin fetch',
    code: `// Front-end at https://app.example.com
// API at https://api.example.com (cross-origin)

async function fetchUser() {
  const res = await fetch('https://api.example.com/me', {
    headers: { Authorization: \`Bearer \${accessToken}\` },
    // missing: credentials: 'include'
  });
  return res.json();
}`,
    problem: 'When the API is on a different origin, fetch() does not send cookies by default. Without credentials: "include", the httpOnly refresh cookie is not sent. This means session-restore on mount and token refresh calls will silently fail — the server sees no cookie and returns 401.',
    fix: 'Add credentials: "include" to any cross-origin fetch call that needs to send or receive cookies. Same-origin requests send cookies by default. The API server must also set Access-Control-Allow-Credentials: true and a specific (not wildcard) Access-Control-Allow-Origin.',
  },
  {
    id: 3,
    title: 'Reading user from localStorage on mount',
    code: `function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null; // ← problem here
  });

  useEffect(() => {
    // No session verification on mount
  }, []);

  return { user };
}`,
    problem: 'localStorage data is never verified server-side on mount. An attacker who can write to localStorage (e.g., via XSS) can inject a fake user object with admin: true. The UI will treat them as authenticated — and if the app renders admin UI based on this, the attacker sees it. Even without an attack, this pattern can display stale/expired session data.',
    fix: 'Always verify session with a server call on mount: fetch("/api/auth/me", { credentials: "include" }). The server is the source of truth. Rendering admin UI based solely on client-side state is a frontend-only auth check — never rely on it alone.',
  },
  {
    id: 4,
    title: 'Frontend-only role check without server verification',
    code: `function AdminPanel() {
  const { user } = useAuth();

  // Role checked only on the frontend
  if (user?.role !== 'admin') {
    return <p>Access denied</p>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Fetches /api/admin/users — server doesn't check role */}
      <AdminUserList />
    </div>
  );
}`,
    problem: 'Frontend role checks are purely cosmetic — they control what the UI renders, not what the API allows. If the API endpoint /api/admin/users does not verify the user\'s role server-side, any authenticated user can call it directly (e.g., from curl or browser DevTools). The frontend check prevents accidental access, not intentional access.',
    fix: 'Every protected API endpoint must verify authorization server-side. The frontend check is for UX (don\'t show the admin link to non-admins) — never treat it as a security boundary. The API must return 403 for unauthorized requests regardless of what the frontend shows.',
  },
  {
    id: 5,
    title: 'JWT logged to console',
    code: `async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  const { accessToken, user } = await res.json();

  console.log('Login successful:', { user, accessToken }); // ← problem here

  setAccessToken(accessToken);
  setUser(user);
}`,
    problem: 'Browser console output is readable by anyone with DevTools access. In shared/kiosk machines, browser extensions can capture console output. Crash reporting tools (Sentry, LogRocket) often capture console.log calls — sending JWTs to a third-party logging service. A logged JWT is effectively exfiltrated.',
    fix: 'Never log sensitive tokens, credentials, or PII. Log only non-sensitive data: console.log("Login successful:", { userId: user.id }). Audit existing logs — search for console.log calls that include "token", "password", "secret", or "auth" in your codebase.',
  },
];

type IssueState = Record<number, { revealed: boolean }>;

const Exercise3_AuthCodeReview: FC = () => {
  const [states, setStates] = useState<IssueState>(() =>
    Object.fromEntries(CODE_ISSUES.map(c => [c.id, { revealed: false }]))
  );

  function reveal(id: number) {
    setStates(prev => ({ ...prev, [id]: { revealed: true } }));
  }

  const revealedCount = Object.values(states).filter(s => s.revealed).length;

  return (
    <section>
      <h2>Exercise 3: Auth Code Review — Spot the Bug</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Each snippet has an authentication anti-pattern. Identify the problem before revealing.
        These patterns appear regularly in real codebases — you will encounter them in interviews too.
      </p>

      {revealedCount > 0 && (
        <div style={{ margin: '0.5rem 0 1rem', padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.85rem' }}>
          Revealed: <strong>{revealedCount}/{CODE_ISSUES.length}</strong>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {CODE_ISSUES.map(issue => {
          const state = states[issue.id];
          return (
            <div key={issue.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden', background: state.revealed ? '#fffaf0' : '#fff' }}>
              <div style={{ padding: '0.75rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
                <strong>#{issue.id} — {issue.title}</strong>
              </div>
              <pre style={{ margin: 0, padding: '1rem 1.25rem', background: '#1e1e1e', color: '#d4d4d4', fontSize: '0.8rem', lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {issue.code}
              </pre>
              <div style={{ padding: '0.75rem 1.25rem' }}>
                {!state.revealed ? (
                  <button
                    onClick={() => reveal(issue.id)}
                    style={{ padding: '0.4rem 1.25rem', borderRadius: '6px', border: '2px solid #e67e22', background: '#fff8f0', color: '#e67e22', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Reveal problem + fix →
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ background: '#fff5f5', border: '1px solid #f5b7b1', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#c0392b', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Problem</div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#444', lineHeight: 1.6 }}>{issue.problem}</p>
                    </div>
                    <div style={{ background: '#f0fff4', border: '1px solid #a9dfbf', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#27ae60', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Fix</div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#444', lineHeight: 1.6 }}>{issue.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Implement the AuthContext
//
// A skeleton AuthContext with 5 clearly marked TODOs.
// A mini "demo app" shows a login form + user info + logout.
// A reference implementation is revealed on demand.
// ─────────────────────────────────────────────────────────────

// ── Mock server (simulates API responses) ──
const MOCK_DB: Record<string, { id: string; name: string; email: string; role: string }> = {
  'user@example.com': { id: 'u1', name: 'Alice Smith', email: 'user@example.com', role: 'user' },
  'admin@example.com': { id: 'u2', name: 'Bob Jones', email: 'admin@example.com', role: 'admin' },
};

async function mockApiLogin(email: string, password: string): Promise<{ user: typeof MOCK_DB[string] } | null> {
  await new Promise(r => setTimeout(r, 600));
  if (password === 'password123' && MOCK_DB[email]) return { user: MOCK_DB[email] };
  return null;
}

async function mockApiMe(): Promise<typeof MOCK_DB[string] | null> {
  await new Promise(r => setTimeout(r, 300));
  // Simulate: cookie exists from last "login" — return persisted user
  const stored = sessionStorage.getItem('__mock_session__');
  return stored ? JSON.parse(stored) : null;
}

// ── AuthContext types ──
interface User { id: string; name: string; email: string; role: string; }
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  // TODO 1: Initialize state — user starts null, isLoading starts true
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO 2: Restore session on mount — call /api/auth/me (here: mockApiMe)
  // Without this, page refresh always shows logged-out state
  useEffect(() => {
    mockApiMe()
      .then(u => setUser(u))
      .finally(() => setIsLoading(false));
  }, []);

  // TODO 3: login — POST credentials, server sets httpOnly cookie (here: mock)
  // Store the returned user. Throw on invalid credentials.
  const login = useCallback(async (email: string, password: string) => {
    const result = await mockApiLogin(email, password);
    if (!result) throw new Error('Invalid email or password');
    sessionStorage.setItem('__mock_session__', JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  // TODO 4: logout — call /api/auth/logout, clear user from state
  const logout = useCallback(() => {
    sessionStorage.removeItem('__mock_session__');
    setUser(null);
  }, []);

  // TODO 5: Provide value — isLoading prevents flash of unauthenticated UI
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <p style={{ color: '#888', fontSize: '0.9rem' }}>Restoring session...</p>;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: '320px' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        style={{ padding: '0.5rem 0.75rem', borderRadius: '5px', border: '1px solid #ddd', fontSize: '0.9rem' }}
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        style={{ padding: '0.5rem 0.75rem', borderRadius: '5px', border: '1px solid #ddd', fontSize: '0.9rem' }}
      />
      {error && <p style={{ margin: 0, color: '#c0392b', fontSize: '0.82rem' }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>
      <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>
        Try: user@example.com / password123 or admin@example.com / password123
      </p>
    </form>
  );
}

function UserDashboard() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div style={{ background: '#f0fff4', border: '1px solid #a9dfbf', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user.name}</div>
          <div style={{ fontSize: '0.82rem', color: '#666' }}>{user.email}</div>
          <span style={{ display: 'inline-block', marginTop: '0.25rem', padding: '0.15rem 0.6rem', borderRadius: '20px', background: user.role === 'admin' ? '#8e44ad' : '#1a73e8', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
            {user.role}
          </span>
        </div>
        <button
          onClick={logout}
          style={{ padding: '0.35rem 0.9rem', borderRadius: '5px', border: '1px solid #c0392b', background: '#fff', color: '#c0392b', cursor: 'pointer', fontSize: '0.82rem' }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function AuthApp() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p style={{ color: '#888', fontSize: '0.9rem' }}>Checking session...</p>;
  return user ? <UserDashboard /> : <LoginForm />;
}

const Exercise4_AuthContextBuild: FC = () => {
  const [showRef, setShowRef] = useState(false);

  return (
    <section>
      <h2>Exercise 4: Implement the AuthContext</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The AuthContext below is fully implemented. Study the 5 TODOs — each one is a key pattern.
        The demo app below it uses the context. Observe the loading state, session restore, and logout.
      </p>

      <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1.25rem', borderRadius: '8px', fontSize: '0.78rem', lineHeight: 1.7, overflowX: 'auto', marginBottom: '1.25rem' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`// TODO 1: user starts null (unknown), isLoading starts true (don't show UI yet)
const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);

// TODO 2: Restore session on mount — CRITICAL for UX
// Without this, every page refresh shows the login screen, then flickers to logged-in.
// With it, you show a loading spinner until the server confirms the session.
useEffect(() => {
  fetch('/api/auth/me', { credentials: 'include' })
    .then(r => r.ok ? r.json() : null)
    .then(setUser)
    .finally(() => setIsLoading(false));
}, []);

// TODO 3: login — server sets the httpOnly cookie in Set-Cookie header.
// The client only needs to store the user object returned in the response body.
const login = async (email: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // so server can set the httpOnly cookie
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const { user } = await res.json();
  setUser(user);
};

// TODO 4: logout — invalidate server session, clear local state.
// Order matters: clear local state last in case the server call fails.
const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  setUser(null);
};

// TODO 5: The isLoading guard prevents the flash of unauthenticated UI.
// Render children only after session check resolves.
return (
  <AuthContext.Provider value={{ user, isLoading, login, logout }}>
    {children}
  </AuthContext.Provider>
);`}</pre>
      </div>

      {/* Live demo */}
      <div style={{ border: '2px solid #1a73e8', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.6rem 1.25rem', background: '#e8f0fe', fontWeight: 600, fontSize: '0.88rem', color: '#1a73e8' }}>
          Live demo — AuthProvider wrapping a mini app
        </div>
        <div style={{ padding: '1.25rem' }}>
          <AuthProvider>
            <AuthApp />
          </AuthProvider>
        </div>
      </div>

      <button
        onClick={() => setShowRef(v => !v)}
        style={{ padding: '0.5rem 1.25rem', borderRadius: '7px', border: '1px solid #888', background: '#fff', cursor: 'pointer', fontSize: '0.88rem', marginBottom: '1rem' }}
      >
        {showRef ? '▲ Hide' : '▼ Show'} reference implementation notes
      </button>

      {showRef && (
        <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', fontSize: '0.82rem', color: '#444', lineHeight: 1.7 }}>
          <strong>Key implementation notes:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
            <li><strong>isLoading = true initially</strong> — prevents showing the login form for a split-second before the session check resolves (the "flash of unauthenticated UI" problem).</li>
            <li><strong>credentials: 'include'</strong> — required on cross-origin fetches to send/receive cookies. On same-origin, it's the default.</li>
            <li><strong>Session restore useEffect has [] deps</strong> — runs once on mount, not on re-renders.</li>
            <li><strong>login throws on failure</strong> — lets the calling component catch and display the error message without the context needing to know about UI state.</li>
            <li><strong>logout clears state after server call</strong> — if the server call fails, the UI remains logged in (consistent state). Some apps clear state first for speed — acceptable tradeoff.</li>
            <li><strong>useAuth throws if called outside provider</strong> — better than returning null and causing confusing downstream errors.</li>
          </ul>
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Log in, then refresh the page (or click "reset" if available). Does the session persist? Why or why not in this demo vs a real app?</li>
          <li>What is the "flash of unauthenticated UI" problem and how does <code>isLoading</code> solve it?</li>
          <li>If you wanted to protect a route (only logged-in users can see it), where would you add that check — in the route component or in the AuthProvider?</li>
        </ol>
      </div>
    </section>
  );
};

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Authentication Patterns</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Topic:</strong> Where to store auth tokens, why localStorage is wrong for JWTs, the XSS vs CSRF
      tradeoff between storage options, the refresh-token pattern, and how to build an AuthContext that
      restores session on mount and prevents flash of unauthenticated UI.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_TokenStorageRiskMatrix />
      <hr />
      <Exercise2_AuthSequencePuzzle />
      <hr />
      <Exercise3_AuthCodeReview />
      <hr />
      <Exercise4_AuthContextBuild />
    </div>
  </div>
);

export default App;
