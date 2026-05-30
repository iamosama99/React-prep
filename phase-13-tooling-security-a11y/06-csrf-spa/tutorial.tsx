// ============================================================
// Topic:   CSRF in SPA Contexts
// Phase:   13 — Tooling, Security & A11y
// File:    tutorial.tsx
//
// Exercise type: SCENARIO CARDS + SAMESITE TABLE + STEP WALKTHROUGH + CORS/CSRF UNTANGLER
//
// Run: npm run tutorial 06-csrf-spa
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — "Does CSRF Apply Here?"
//
// Six scenario cards. Pick "CSRF Risk" or "No CSRF Risk".
// Reveal the explanation. Key: CSRF only matters with cookies.
// ─────────────────────────────────────────────────────────────

type CsrfVerdict = 'risk' | 'mitigated' | 'none';

interface Scenario {
  id: number;
  title: string;
  detail: string;
  verdict: CsrfVerdict;
  explanation: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'App uses localStorage access token in Authorization header',
    detail: 'fetch("/api/action", { headers: { Authorization: `Bearer ${token}` } })',
    verdict: 'none',
    explanation: 'CSRF is not applicable. A cross-site request cannot set a custom Authorization header — same-origin policy blocks it. The browser only auto-attaches cookies, not JS-managed headers. A malicious page triggering a fetch to your API simply cannot include the token.',
  },
  {
    id: 2,
    title: 'App uses httpOnly session cookie, no SameSite attribute',
    detail: 'Set-Cookie: session=abc123; HttpOnly; Secure (no SameSite set)',
    verdict: 'risk',
    explanation: 'Without SameSite, the browser sends the cookie on ALL cross-origin requests — including form submissions from evil.com. An attacker can embed a form on their page that POSTs to your API, and the browser automatically includes the session cookie. Classic CSRF vulnerability.',
  },
  {
    id: 3,
    title: 'App uses httpOnly cookie with SameSite: lax',
    detail: 'Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=lax',
    verdict: 'mitigated',
    explanation: 'SameSite: lax blocks cross-site POST/AJAX requests, which covers the most dangerous CSRF vectors. However, cross-site top-level GET navigation still sends the cookie — so if your app has any GET endpoints that cause side effects (they shouldn\'t!), those are still vulnerable. For well-designed APIs (GET = read-only), lax is effective.',
  },
  {
    id: 4,
    title: 'App uses httpOnly cookie with SameSite: strict',
    detail: 'Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=strict',
    verdict: 'none',
    explanation: 'SameSite: strict means the cookie is never sent on any cross-site request — including top-level navigation. Clicking a link from an email to your app won\'t include the cookie (user appears logged out). This is the strongest protection but breaks OAuth flows and link sharing for authenticated pages. Usually too strict for most SPAs.',
  },
  {
    id: 5,
    title: 'App sends auth token as a URL query parameter',
    detail: 'GET /api/data?auth_token=eyJhbGc...',
    verdict: 'risk',
    explanation: 'Tokens in URL query parameters are a different problem: they appear in server logs, browser history, and Referer headers when the user navigates to another site. An attacker on a linked page can read the token from the Referer header. This is not CSRF — it\'s token leakage. But it\'s equally bad. Never put auth tokens in URLs.',
  },
  {
    id: 6,
    title: 'App uses HTTP Basic Auth (Authorization: Basic ... header)',
    detail: 'Client sends Authorization: Basic base64(user:pass) on every request',
    verdict: 'none',
    explanation: 'Basic Auth credentials are sent as an Authorization header set by the browser — not as a cookie. Cross-site requests do not automatically include Authorization headers. An attacker-controlled page cannot trigger a request that includes Basic Auth credentials. No CSRF risk.',
  },
];

const VERDICT_STYLES: Record<CsrfVerdict, { bg: string; color: string; label: string }> = {
  risk: { bg: '#c0392b', color: '#fff', label: 'CSRF Risk' },
  mitigated: { bg: '#e67e22', color: '#fff', label: 'Mitigated' },
  none: { bg: '#27ae60', color: '#fff', label: 'No CSRF Risk' },
};

type GuessState = Record<number, { guess: CsrfVerdict | null; revealed: boolean }>;

const Exercise1_DoesCsrfApply: FC = () => {
  const [states, setStates] = useState<GuessState>(() =>
    Object.fromEntries(SCENARIOS.map(s => [s.id, { guess: null, revealed: false }]))
  );

  const revealed = SCENARIOS.filter(s => states[s.id].revealed).length;
  const correct = SCENARIOS.filter(s => states[s.id].revealed && states[s.id].guess === s.verdict).length;

  return (
    <section>
      <h2>Exercise 1: Does CSRF Apply Here?</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each scenario, decide whether the app is at CSRF risk. Pick your answer, then reveal the explanation.
        Remember: CSRF only applies when the browser auto-sends authentication credentials.
      </p>

      {revealed > 0 && (
        <div style={{ margin: '0.5rem 0 1rem', padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.85rem' }}>
          Score: <strong>{correct}/{revealed}</strong> revealed so far
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {SCENARIOS.map(s => {
          const state = states[s.id];
          const isCorrect = state.guess === s.verdict;
          return (
            <div
              key={s.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '10px',
                overflow: 'hidden',
                background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
                transition: 'background 0.3s',
              }}
            >
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                <strong style={{ fontSize: '0.9rem' }}>#{s.id} — {s.title}</strong>
                <p style={{ margin: '0.25rem 0 0', fontFamily: 'monospace', fontSize: '0.78rem', color: '#555' }}>{s.detail}</p>
              </div>
              <div style={{ padding: '0.75rem 1.25rem' }}>
                {!state.revealed ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(['risk', 'mitigated', 'none'] as CsrfVerdict[]).map(v => (
                      <button
                        key={v}
                        onClick={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], guess: v } }))}
                        style={{
                          padding: '0.35rem 1rem',
                          borderRadius: '6px',
                          border: '2px solid',
                          borderColor: state.guess === v ? VERDICT_STYLES[v].bg : '#ddd',
                          background: state.guess === v ? VERDICT_STYLES[v].bg : '#fff',
                          color: state.guess === v ? VERDICT_STYLES[v].color : '#333',
                          cursor: 'pointer',
                          fontWeight: state.guess === v ? 700 : 400,
                          fontSize: '0.83rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        {VERDICT_STYLES[v].label}
                      </button>
                    ))}
                    {state.guess && (
                      <button
                        onClick={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], revealed: true } }))}
                        style={{ padding: '0.35rem 1rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.83rem', marginLeft: 'auto' }}
                      >
                        Reveal →
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', background: VERDICT_STYLES[s.verdict].bg, color: VERDICT_STYLES[s.verdict].color, fontSize: '0.78rem', fontWeight: 700 }}>
                        {VERDICT_STYLES[s.verdict].label}
                      </span>
                      <span style={{ fontSize: '0.88rem' }}>
                        {isCorrect ? '✓ Correct' : `✗ You picked ${VERDICT_STYLES[state.guess!].label}`}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#444', lineHeight: 1.65 }}>{s.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>What is the common thread across all "No CSRF Risk" scenarios? What do they share?</li>
          <li>The notes say: using access token in memory + Authorization header = CSRF-immune. Why? Trace through exactly why a cross-site attacker can't replicate this.</li>
          <li>SameSite: lax still allows cross-site GET requests to include the cookie. Why is this generally acceptable? What rule must your API follow to make it safe?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — SameSite Behavior Visualizer
//
// Fill in each cell of the matrix: is the cookie sent?
// Then reveal the correct answers with explanations.
// ─────────────────────────────────────────────────────────────

type SameSiteValue = 'lax' | 'strict' | 'none';
type RequestType = 'sameSite' | 'crossSiteGetNav' | 'crossSiteAjax' | 'crossSitePost';

interface MatrixCell {
  sameSite: SameSiteValue;
  reqType: RequestType;
  sent: boolean;
  explanation: string;
}

const MATRIX_CELLS: MatrixCell[] = [
  // Lax
  { sameSite: 'lax', reqType: 'sameSite', sent: true, explanation: 'Same-site requests always send the cookie for all SameSite values.' },
  { sameSite: 'lax', reqType: 'crossSiteGetNav', sent: true, explanation: 'Lax allows cross-site top-level navigation (address bar change, link click) using safe methods (GET/HEAD). This is why clicking a link from Google to your app logs you in.' },
  { sameSite: 'lax', reqType: 'crossSiteAjax', sent: false, explanation: 'Lax blocks cross-site fetch/XHR — this is the primary CSRF protection. A malicious page cannot make an AJAX call to your API with the cookie attached.' },
  { sameSite: 'lax', reqType: 'crossSitePost', sent: false, explanation: 'Lax blocks cross-site form POST submissions — the classic CSRF attack vector. An attacker cannot submit a form from evil.com to your API with the victim\'s cookie.' },
  // Strict
  { sameSite: 'strict', reqType: 'sameSite', sent: true, explanation: 'Same-site requests always send the cookie.' },
  { sameSite: 'strict', reqType: 'crossSiteGetNav', sent: false, explanation: 'Strict never sends the cookie cross-site — even top-level navigation. Clicking a link in an email to your app won\'t include the cookie. The user appears logged out until they navigate internally.' },
  { sameSite: 'strict', reqType: 'crossSiteAjax', sent: false, explanation: 'Strict blocks all cross-site requests including AJAX. Maximum CSRF protection.' },
  { sameSite: 'strict', reqType: 'crossSitePost', sent: false, explanation: 'Strict blocks all cross-site form submissions. Maximum CSRF protection.' },
  // None
  { sameSite: 'none', reqType: 'sameSite', sent: true, explanation: 'Same-site requests always send the cookie.' },
  { sameSite: 'none', reqType: 'crossSiteGetNav', sent: true, explanation: 'None sends the cookie everywhere. Required for third-party scenarios — embedded widgets, auth flows across subdomains.' },
  { sameSite: 'none', reqType: 'crossSiteAjax', sent: true, explanation: 'None sends the cookie on all cross-site AJAX. CSRF protection is your responsibility — CSRF tokens are required here. Requires the Secure flag (HTTPS-only).' },
  { sameSite: 'none', reqType: 'crossSitePost', sent: true, explanation: 'None sends the cookie on all cross-site form posts. CSRF tokens are mandatory. Requires the Secure flag.' },
];

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  sameSite: 'Same-site request',
  crossSiteGetNav: 'Cross-site GET (link/nav)',
  crossSiteAjax: 'Cross-site fetch/XHR',
  crossSitePost: 'Cross-site form POST',
};

const SAMESITE_COLORS: Record<SameSiteValue, string> = {
  lax: '#1a73e8',
  strict: '#27ae60',
  none: '#e67e22',
};

const Exercise2_SameSiteVisualizer: FC = () => {
  const [userAnswers, setUserAnswers] = useState<Partial<Record<string, boolean | null>>>({});
  const [revealed, setRevealed] = useState<Partial<Record<string, boolean>>>({});
  const [showAll, setShowAll] = useState(false);

  const cellKey = (ss: SameSiteValue, rt: RequestType) => `${ss}:${rt}`;

  function handleGuess(ss: SameSiteValue, rt: RequestType, value: boolean) {
    setUserAnswers(prev => ({ ...prev, [cellKey(ss, rt)]: value }));
  }

  function handleReveal(ss: SameSiteValue, rt: RequestType) {
    setRevealed(prev => ({ ...prev, [cellKey(ss, rt)]: true }));
  }

  const reqTypes: RequestType[] = ['sameSite', 'crossSiteGetNav', 'crossSiteAjax', 'crossSitePost'];
  const sameSiteValues: SameSiteValue[] = ['lax', 'strict', 'none'];

  function getCell(ss: SameSiteValue, rt: RequestType) {
    return MATRIX_CELLS.find(c => c.sameSite === ss && c.reqType === rt)!;
  }

  const allRevealed = MATRIX_CELLS.every(c => revealed[cellKey(c.sameSite, c.reqType)] || showAll);

  return (
    <section>
      <h2>Exercise 2: SameSite Behavior Visualizer</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each cell: does the browser send the cookie? Click "Sent" or "Blocked", then reveal.
        After filling in a row, click the row header to see all explanations at once.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '620px' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.6rem 0.75rem', background: '#f5f5f5', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '0.8rem', color: '#555', width: '120px' }}>SameSite</th>
              {reqTypes.map(rt => (
                <th key={rt} style={{ padding: '0.6rem 0.5rem', background: '#f5f5f5', textAlign: 'center', borderBottom: '2px solid #ddd', fontSize: '0.78rem', color: '#555' }}>
                  {REQUEST_TYPE_LABELS[rt]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sameSiteValues.map(ss => (
              <tr key={ss}>
                <td style={{ padding: '0.75rem', verticalAlign: 'top', borderBottom: '1px solid #eee' }}>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '20px', background: SAMESITE_COLORS[ss], color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                    {ss}
                  </span>
                </td>
                {reqTypes.map(rt => {
                  const key = cellKey(ss, rt);
                  const cell = getCell(ss, rt);
                  const isRevealed = revealed[key] || showAll;
                  const userGuess = userAnswers[key];
                  const isCorrect = userGuess === cell.sent;

                  return (
                    <td key={rt} style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'top', borderBottom: '1px solid #eee', background: isRevealed ? (cell.sent ? '#f0fff4' : '#fff5f5') : '#fff', transition: 'background 0.2s' }}>
                      {!isRevealed ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleGuess(ss, rt, true)}
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid',
                                borderColor: userGuess === true ? '#27ae60' : '#ddd',
                                background: userGuess === true ? '#27ae60' : '#fff',
                                color: userGuess === true ? '#fff' : '#555',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >Sent</button>
                            <button
                              onClick={() => handleGuess(ss, rt, false)}
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid',
                                borderColor: userGuess === false ? '#c0392b' : '#ddd',
                                background: userGuess === false ? '#c0392b' : '#fff',
                                color: userGuess === false ? '#fff' : '#555',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                              }}
                            >Blocked</button>
                          </div>
                          {userGuess !== undefined && userGuess !== null && (
                            <button
                              onClick={() => handleReveal(ss, rt)}
                              style={{ padding: '0.15rem 0.5rem', borderRadius: '3px', border: '1px solid #888', background: '#fff', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              →
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: cell.sent ? '#27ae60' : '#c0392b' }}>
                            {cell.sent ? '✓ Sent' : '✗ Blocked'}
                          </span>
                          {userGuess !== undefined && userGuess !== null && (
                            <span style={{ fontSize: '0.7rem', color: isCorrect ? '#27ae60' : '#c0392b' }}>
                              {isCorrect ? 'correct' : 'wrong'}
                            </span>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#555', textAlign: 'left', lineHeight: 1.5, marginTop: '0.25rem' }}>
                            {cell.explanation}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setShowAll(v => !v)}
        style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', borderRadius: '7px', border: '1px solid #888', background: '#fff', cursor: 'pointer', fontSize: '0.88rem' }}
      >
        {showAll ? 'Hide all answers' : 'Reveal all answers'}
      </button>

      {allRevealed && (
        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
          <strong>Pattern summary:</strong> Lax = safe for cross-site navigation, blocks mutations.
          Strict = maximum protection, breaks link flows. None = always sent, needs Secure + CSRF tokens.
          For most SPAs: <strong>SameSite: lax</strong> is the right default.
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why does SameSite: strict break OAuth flows? Trace the OAuth redirect sequence to find the breakage point.</li>
          <li>SameSite: none requires the Secure flag. Why? (Hint: think about what happens on HTTP with a "send everywhere" cookie.)</li>
          <li>Your API has GET /api/user/delete?confirm=true — a state-changing GET endpoint. Why does SameSite: lax NOT protect this?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Double-Submit Cookie Pattern Walkthrough
//
// An animated step-by-step trace of the double-submit pattern.
// Click "Next Step" to advance. See why an attacker on evil.com fails.
// ─────────────────────────────────────────────────────────────

interface WalkthroughStep {
  title: string;
  actor: 'server' | 'client' | 'attacker' | 'browser';
  description: string;
  code?: string;
  highlight?: string;
}

const STEPS: WalkthroughStep[] = [
  {
    title: 'Server sets two cookies on login',
    actor: 'server',
    description: 'After authentication, the server sets two cookies. The session cookie is httpOnly (JS can\'t read it). The CSRF token cookie is readable by JS — that\'s intentional.',
    code: `Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=lax
Set-Cookie: csrf_token=xK9mP2qR; Secure; SameSite=lax
// ↑ No HttpOnly — JS must be able to read this one`,
    highlight: 'The session cookie is the auth credential. The csrf_token is a random value used to prove same-origin intent.',
  },
  {
    title: 'Client reads the CSRF token from document.cookie',
    actor: 'client',
    description: 'On your app (app.example.com), JavaScript reads the csrf_token cookie. This works because it\'s not httpOnly. The httpOnly session cookie is invisible — document.cookie does not show it.',
    code: `const csrfToken = document.cookie
  .split('; ')
  .find(c => c.startsWith('csrf_token='))
  ?.split('=')[1];
// csrfToken = 'xK9mP2qR'`,
    highlight: 'Your app can read this cookie. An attacker on evil.com cannot — same-origin policy blocks cross-origin cookie reading.',
  },
  {
    title: 'Client includes CSRF token in request header',
    actor: 'client',
    description: 'Every state-changing request includes the CSRF token in a custom header. The browser auto-attaches both cookies to the request.',
    code: `fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken, // ← echoed from cookie
  },
  credentials: 'include',
  body: JSON.stringify({ to: 'bob', amount: 100 }),
});
// Browser auto-adds: Cookie: session=abc123; csrf_token=xK9mP2qR`,
    highlight: 'The request now carries both the session cookie (automatic) and the CSRF token in a header (explicit).',
  },
  {
    title: 'Server validates: header must match cookie',
    actor: 'server',
    description: 'The server receives the request and compares the X-CSRF-Token header value against the csrf_token cookie value. If they match, the request is from your own frontend (only your frontend could read the cookie to put it in the header).',
    code: `// Express middleware
function csrfCheck(req, res, next) {
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies.csrf_token;
  if (!headerToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF check failed' });
  }
  next();
}`,
    highlight: 'This is the core check: header value === cookie value. Simple but effective.',
  },
  {
    title: 'Attacker on evil.com tries to replicate the attack',
    actor: 'attacker',
    description: 'The attacker embeds a form or fetch on evil.com that POSTs to api.example.com. The browser auto-sends the cookies (session + csrf_token). But the attacker cannot read document.cookie on app.example.com — same-origin policy prevents it. So they cannot set the X-CSRF-Token header to match.',
    code: `// On evil.com — what the attacker tries:
fetch('https://api.example.com/transfer', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': '???', // ← attacker doesn't know this value
  },
  credentials: 'include', // browser sends session+csrf_token cookies
  body: JSON.stringify({ to: 'attacker', amount: 1000 }),
});
// Server: header 'undefined' !== cookie 'xK9mP2qR' → 403 Forbidden`,
    highlight: 'The attacker can send the cookies (browser does it automatically) but cannot read them to construct the matching header. The attack fails.',
  },
];

const ACTOR_STYLES: Record<WalkthroughStep['actor'], { bg: string; color: string; label: string }> = {
  server: { bg: '#1a73e8', color: '#fff', label: 'Server' },
  client: { bg: '#27ae60', color: '#fff', label: 'Your App (client)' },
  browser: { bg: '#8e44ad', color: '#fff', label: 'Browser' },
  attacker: { bg: '#c0392b', color: '#fff', label: 'Attacker (evil.com)' },
};

const Exercise3_DoubleSubmitWalkthrough: FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  function next() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(v => v + 1);
    } else {
      setCompleted(true);
    }
  }

  function reset() {
    setCurrentStep(0);
    setCompleted(false);
  }

  return (
    <section>
      <h2>Exercise 3: Double-Submit Cookie Pattern — Step by Step</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Walk through the double-submit CSRF token pattern. Click "Next Step" to advance.
        Understand WHY an attacker on evil.com cannot replicate the attack.
      </p>

      {/* Step progress */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: '40px',
              height: '6px',
              borderRadius: '3px',
              background: i <= currentStep ? (i === STEPS.length - 1 ? '#c0392b' : '#1a73e8') : '#e0e0e0',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Current step */}
      {!completed && (
        <div style={{ border: '2px solid', borderColor: ACTOR_STYLES[STEPS[currentStep].actor].bg, borderRadius: '10px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.75rem 1.25rem', background: ACTOR_STYLES[STEPS[currentStep].actor].bg, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
              {currentStep + 1}
            </span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{STEPS[currentStep].title}</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '0.15rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
              {ACTOR_STYLES[STEPS[currentStep].actor].label}
            </span>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.65 }}>
              {STEPS[currentStep].description}
            </p>
            {STEPS[currentStep].code && (
              <pre style={{ margin: '0 0 1rem', padding: '1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.78rem', lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {STEPS[currentStep].code}
              </pre>
            )}
            {STEPS[currentStep].highlight && (
              <div style={{ background: '#fffde7', border: '1px solid #fdd835', padding: '0.6rem 0.9rem', borderRadius: '6px', fontSize: '0.82rem', color: '#555' }}>
                <strong>Key point:</strong> {STEPS[currentStep].highlight}
              </div>
            )}
          </div>
        </div>
      )}

      {/* All steps summary after completion */}
      {completed && (
        <div style={{ border: '2px solid #27ae60', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem', background: '#f0fff4' }}>
          <div style={{ fontWeight: 700, color: '#27ae60', marginBottom: '1rem', fontSize: '1rem' }}>
            ✓ Complete — The double-submit cookie pattern in 5 steps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ display: 'inline-block', background: ACTOR_STYLES[step.actor].bg, color: '#fff', borderRadius: '50%', width: '1.5rem', height: '1.5rem', textAlign: 'center', lineHeight: '1.5rem', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div>
                  <strong style={{ fontSize: '0.85rem' }}>{step.title}</strong>
                  <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.5rem', borderRadius: '10px', background: ACTOR_STYLES[step.actor].bg, color: '#fff', fontSize: '0.7rem' }}>
                    {ACTOR_STYLES[step.actor].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {!completed && (
          <button
            onClick={next}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '7px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {currentStep < STEPS.length - 1 ? `Next Step (${currentStep + 2}/${STEPS.length}) →` : 'Complete →'}
          </button>
        )}
        <button
          onClick={reset}
          style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Restart
        </button>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1.25rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>The csrf_token cookie must NOT be httpOnly. Why? What breaks if you add HttpOnly to it?</li>
          <li>This is called the "double-submit" pattern. What exactly is being double-submitted and why does it prove same-origin intent?</li>
          <li>How is the double-submit pattern different from the synchronizer token pattern? Which requires server-side state?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — CORS vs CSRF Untangler
//
// Six statements. Sort each into: CORS | CSRF | Neither/Both wrong.
// Then see the insight explaining why CORS is NOT a CSRF defense.
// ─────────────────────────────────────────────────────────────

type Category = 'cors' | 'csrf' | 'neither';

interface Statement {
  id: number;
  text: string;
  answer: Category;
  explanation: string;
}

const STATEMENTS: Statement[] = [
  {
    id: 1,
    text: 'Prevents cross-origin pages from reading your API response',
    answer: 'cors',
    explanation: 'CORS (Access-Control-Allow-Origin header) controls which origins can read cross-origin responses. The browser blocks response access if the origin is not allowed.',
  },
  {
    id: 2,
    text: 'Prevents cross-origin pages from sending requests that modify state',
    answer: 'csrf',
    explanation: 'CSRF protection (SameSite cookies or CSRF tokens) prevents unauthorized state-changing requests. Note: CORS does NOT prevent the request from being sent — it only prevents reading the response.',
  },
  {
    id: 3,
    text: 'Enforced by setting Access-Control-Allow-Origin in the server response',
    answer: 'cors',
    explanation: 'CORS is enforced via Access-Control-Allow-Origin (and related) headers. The browser checks these headers and enforces the policy client-side. The server sets the policy; the browser enforces it.',
  },
  {
    id: 4,
    text: 'Mitigated by SameSite cookie attribute or CSRF tokens',
    answer: 'csrf',
    explanation: 'CSRF is mitigated by SameSite cookies (browser-native enforcement) or CSRF tokens (application-level token check). CORS settings have no effect on CSRF — they solve different problems.',
  },
  {
    id: 5,
    text: 'Preflight OPTIONS request is part of this mechanism',
    answer: 'cors',
    explanation: 'CORS preflight: the browser sends an OPTIONS request first to ask if the cross-origin actual request is allowed. If not allowed, the browser blocks the actual request. Only applies to "non-simple" requests (custom headers, methods other than GET/HEAD/POST with certain content types).',
  },
  {
    id: 6,
    text: 'A malicious <img> tag pointing to an API endpoint can trigger this attack',
    answer: 'csrf',
    explanation: 'The classic CSRF example: <img src="https://bank.com/transfer?to=attacker&amount=1000"> fires a GET to bank.com with the victim\'s cookies. CORS doesn\'t help — simple GET requests don\'t trigger CORS preflight. The image tag attack works regardless of CORS settings.',
  },
];

const CATEGORY_STYLES: Record<Category, { bg: string; color: string; label: string }> = {
  cors: { bg: '#1a73e8', color: '#fff', label: 'CORS' },
  csrf: { bg: '#c0392b', color: '#fff', label: 'CSRF' },
  neither: { bg: '#888', color: '#fff', label: 'Neither' },
};

type SortState = Record<number, { guess: Category | null; revealed: boolean }>;

const Exercise4_CorsVsCsrfUntangler: FC = () => {
  const [states, setStates] = useState<SortState>(() =>
    Object.fromEntries(STATEMENTS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const [insightVisible, setInsightVisible] = useState(false);

  const revealed = STATEMENTS.filter(s => states[s.id].revealed).length;
  const correct = STATEMENTS.filter(s => states[s.id].revealed && states[s.id].guess === s.answer).length;

  return (
    <section>
      <h2>Exercise 4: CORS vs CSRF Untangler</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Sort each statement into CORS or CSRF. They are frequently confused in interviews.
        After revealing all, read the key insight at the bottom.
      </p>

      {revealed > 0 && (
        <div style={{ margin: '0.5rem 0 1rem', padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.85rem' }}>
          Score: <strong>{correct}/{revealed}</strong> revealed
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {STATEMENTS.map(s => {
          const state = states[s.id];
          const isCorrect = state.guess === s.answer;
          return (
            <div
              key={s.id}
              style={{
                border: '1px solid',
                borderColor: state.revealed ? (isCorrect ? '#a9dfbf' : '#f5b7b1') : '#ddd',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff5f5') : '#fff',
                transition: 'all 0.2s',
              }}
            >
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.88rem', color: '#333', fontWeight: 500 }}>
                "{s.text}"
              </p>
              {!state.revealed ? (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['cors', 'csrf', 'neither'] as Category[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], guess: cat } }))}
                      style={{
                        padding: '0.3rem 0.9rem',
                        borderRadius: '6px',
                        border: '2px solid',
                        borderColor: state.guess === cat ? CATEGORY_STYLES[cat].bg : '#ddd',
                        background: state.guess === cat ? CATEGORY_STYLES[cat].bg : '#fff',
                        color: state.guess === cat ? CATEGORY_STYLES[cat].color : '#444',
                        cursor: 'pointer',
                        fontWeight: state.guess === cat ? 700 : 400,
                        fontSize: '0.82rem',
                        transition: 'all 0.15s',
                      }}
                    >
                      {CATEGORY_STYLES[cat].label}
                    </button>
                  ))}
                  {state.guess && (
                    <button
                      onClick={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], revealed: true } }))}
                      style={{ padding: '0.3rem 0.9rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', marginLeft: 'auto' }}
                    >
                      Reveal →
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', background: CATEGORY_STYLES[s.answer].bg, color: CATEGORY_STYLES[s.answer].color, fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {CATEGORY_STYLES[s.answer].label}
                  </span>
                  <div>
                    {!isCorrect && (
                      <div style={{ fontSize: '0.78rem', color: '#c0392b', marginBottom: '0.25rem' }}>
                        ✗ You picked {CATEGORY_STYLES[state.guess!].label}
                      </div>
                    )}
                    {isCorrect && (
                      <div style={{ fontSize: '0.78rem', color: '#27ae60', marginBottom: '0.25rem' }}>✓ Correct</div>
                    )}
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#444', lineHeight: 1.6 }}>{s.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key insight */}
      <button
        onClick={() => setInsightVisible(v => !v)}
        style={{ padding: '0.5rem 1.5rem', borderRadius: '7px', border: '2px solid #1a73e8', background: insightVisible ? '#1a73e8' : '#fff', color: insightVisible ? '#fff' : '#1a73e8', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', marginBottom: '1rem' }}
      >
        {insightVisible ? '▲ Hide' : '▼ Show'} Key Insight: Why CORS is Not a CSRF Defense
      </button>

      {insightVisible && (
        <div style={{ border: '2px solid #1a73e8', borderRadius: '10px', padding: '1.25rem', background: '#e8f0fe' }}>
          <h3 style={{ margin: '0 0 0.75rem', color: '#1a73e8', fontSize: '1rem' }}>Why CORS is Not a CSRF Defense</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.7 }}>
            CORS blocks cross-origin <strong>reads</strong>. CSRF attacks don't need to read — they just need the mutation to happen.
          </p>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.7 }}>
            When a CSRF attack fires (e.g., an img tag or form submit), the browser <strong>sends the request</strong> with the victim's cookies — the server processes it — and the action happens. Only after that does the browser check CORS headers to decide whether to show the response to the originating page. By then, the damage is done.
          </p>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#333', lineHeight: 1.7 }}>
            CORS preflight (OPTIONS request) does block cross-origin requests with custom headers. Since CSRF tokens are custom headers, requiring them implicitly prevents CSRF from cross-origin <code>fetch()</code> calls. But CORS does NOT block:
          </p>
          <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.5rem', fontSize: '0.85rem', color: '#444', lineHeight: 1.9 }}>
            <li>Simple GET requests (image loads, link clicks) — no preflight</li>
            <li>Simple POST with standard content types (application/x-www-form-urlencoded) — no preflight, classic CSRF vector</li>
          </ul>
          <div style={{ background: '#fff', border: '1px solid #c5cae9', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
            <strong>The one-sentence answer:</strong> CORS is a client-side mechanism to control response access; CSRF attacks exploit automatic credential attachment — they don't need to read the response. Completely different layers.
          </div>
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>An interviewer says: "We have CORS enabled on our API, so we don't need CSRF protection." How do you respond?</li>
          <li>A simple POST with Content-Type: application/x-www-form-urlencoded doesn't trigger a CORS preflight. Why not? (Hint: read about "simple requests" in the CORS spec.)</li>
          <li>You're building a new SPA using access tokens in memory + Authorization headers. Do you need a CORS configuration? Do you need CSRF protection? Explain both.</li>
        </ol>
      </div>
    </section>
  );
};

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>CSRF in SPA Contexts</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Topic:</strong> CSRF only matters when authentication is cookie-based. Understand the SameSite
      attribute and its three modes, the double-submit cookie pattern, and why CORS does not protect
      against CSRF. The recommended SPA pattern (access token in memory + Authorization header) sidesteps
      CSRF entirely.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_DoesCsrfApply />
      <hr />
      <Exercise2_SameSiteVisualizer />
      <hr />
      <Exercise3_DoubleSubmitWalkthrough />
      <hr />
      <Exercise4_CorsVsCsrfUntangler />
    </div>
  </div>
);

export default App;
