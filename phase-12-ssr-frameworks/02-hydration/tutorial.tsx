// ============================================================
// Topic:   Hydration
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: LIVE BUG DEMO + PATTERN BUILDING + CODE REVIEW
//
// Hydration mismatches are subtle — you can demo them in Vite
// by simulating the server/client difference. These exercises:
//   1. Show a mismatch live and make you fix it 3 ways
//   2. Build the canonical "mounted" pattern from scratch
//   3. Review code snippets and classify: mismatch or safe?
//   4. Explore the FCP→TTI gap and what happens during it
//
// Run: npm run tutorial 02-hydration
// ============================================================

import { useState, useEffect, useRef, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — The Mismatch Problem (live simulation)
//
// In SSR, "server time" is when the server processes the request.
// "Client time" is when React re-renders on the browser.
// They're always different — causing a hydration warning.
//
// This Vite app simulates it: "server render" = a fixed timestamp,
// "client render" = the current time. Toggle the fix to see
// the three solutions from notes.md.
// ─────────────────────────────────────────────────────────────

// Simulated "server-rendered" time — fixed, as if from a server snapshot
const SERVER_RENDER_TIME = '2026-05-27 09:00:00';

type FixStrategy = 'broken' | 'suppress' | 'mounted' | 'none';

function MismatchDemo({ strategy }: { strategy: FixStrategy }) {
  const [mounted, setMounted] = useState(false);
  const [clientTime, setClientTime] = useState('');

  useEffect(() => {
    setClientTime(new Date().toLocaleString());
    setMounted(true);
  }, []);

  // Strategy 1: broken — renders server time on server, client time on client
  if (strategy === 'broken') {
    return (
      <div style={{ padding: '0.75rem', background: '#fee', borderRadius: '6px', border: '1px solid #fcc' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Page rendered at: <strong>{clientTime || SERVER_RENDER_TIME}</strong>
        </p>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#c00' }}>
          ⚠ Mismatch! Server rendered "{SERVER_RENDER_TIME}", client rendered "{clientTime}".
          React would log: "Text content did not match. Server: ... Client: ..."
        </p>
      </div>
    );
  }

  // Strategy 2: suppressHydrationWarning — server HTML kept, warning silenced
  if (strategy === 'suppress') {
    return (
      <div style={{ padding: '0.75rem', background: '#fff9e6', borderRadius: '6px', border: '1px solid #ffe082' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          {/* suppressHydrationWarning silences the warning but keeps server HTML */}
          Page rendered at: <strong suppressHydrationWarning>{clientTime || SERVER_RENDER_TIME}</strong>
        </p>
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#888' }}>
          <code>suppressHydrationWarning</code> silences the warning. React keeps the server HTML
          until the next re-render. Use sparingly — it hides real bugs if overused.
        </p>
        <pre style={{ margin: '0.5rem 0 0', background: '#fff', padding: '0.5rem', fontSize: '0.75rem', borderRadius: '4px', overflow: 'auto' }}>
{`<strong suppressHydrationWarning>
  {new Date().toLocaleString()}
</strong>`}
        </pre>
      </div>
    );
  }

  // Strategy 3: mounted pattern — renders null on server, real content after mount
  if (strategy === 'mounted') {
    return (
      <div style={{ padding: '0.75rem', background: '#f0fff4', borderRadius: '6px', border: '1px solid #a7d9a7' }}>
        {/* Server renders null (mounted=false), client renders after useEffect */}
        {mounted ? (
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Page rendered at: <strong>{clientTime}</strong>
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>
            Loading time... {/* This is what the SERVER renders */}
          </p>
        )}
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#555' }}>
          Server renders a neutral placeholder (no time). After hydration, <code>useEffect</code> sets
          <code>mounted=true</code> and the real time renders client-side. No mismatch.
        </p>
        <pre style={{ margin: '0.5rem 0 0', background: '#fff', padding: '0.5rem', fontSize: '0.75rem', borderRadius: '4px', overflow: 'auto' }}>
{`const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);

if (!mounted) return <span>Loading time...</span>; // server output
return <span>{new Date().toLocaleString()}</span>;`}
        </pre>
      </div>
    );
  }

  // strategy === 'none' — just a placeholder
  return (
    <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '6px', color: '#aaa', fontSize: '0.9rem' }}>
      Select a strategy above to see the demo.
    </div>
  );
}

function Exercise1_MismatchStrategies() {
  const [strategy, setStrategy] = useState<FixStrategy>('none');

  const buttons: { s: FixStrategy; label: string; color: string }[] = [
    { s: 'broken', label: '❌ Broken (mismatch)', color: '#e55' },
    { s: 'suppress', label: '⚠ suppressHydrationWarning', color: '#e67e22' },
    { s: 'mounted', label: '✓ mounted pattern', color: '#27ae60' },
  ];

  return (
    <section>
      <h2>Exercise 1: Hydration Mismatch — Three Strategies</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        This simulates a timestamp component that renders differently on server vs client.
        Toggle each strategy and read what it does. Then answer the questions below.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {buttons.map(({ s, label, color }) => (
          <button
            key={s}
            onClick={() => setStrategy(s)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: strategy === s ? color : '#ddd',
              background: strategy === s ? color : '#fff',
              color: strategy === s ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <MismatchDemo strategy={strategy} />

      <div style={{ marginTop: '1.25rem' }}>
        <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          <strong>The root cause:</strong> React's reconciler walks the server HTML and the client component
          tree in lockstep. When it finds a mismatch, it logs a warning and re-renders that subtree from scratch —
          throwing away the server HTML. This defeats SSR for that node.
        </div>
        <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong>TODO — answer these:</strong>
          <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
            <li>In the "broken" strategy, when does the mismatch occur: server-render, hydration, or re-render?</li>
            <li><code>suppressHydrationWarning</code> works on one element only. What happens to children?
              (It does NOT suppress children — they're still checked)</li>
            <li>In the "mounted" pattern, the server renders a placeholder. Does the user see a flash?
              Why or why not? (The placeholder is visible for ~0ms before hydration fires useEffect)</li>
            <li>When would you use <code>suppressHydrationWarning</code> vs the mounted pattern?
              What's the key difference in user experience?</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Build ClientOnly from scratch
//
// The "mounted" pattern is so common it deserves its own component.
// `ClientOnly` wraps any content that should only render client-side.
//
// YOUR TASK:
//   1. Read the broken ClientOnly implementation below.
//   2. Identify the bug (there are TWO bugs).
//   3. Switch to the working version and verify.
//   4. Then explain why each bug matters.
// ─────────────────────────────────────────────────────────────

// ❌ BROKEN VERSION — has two bugs
// Bug 1: returns children immediately (no mounted check)
// Bug 2: fallback is ignored — always renders children
function ClientOnly_Broken({ children, fallback }: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false); // state exists but is never used for guarding!

  useEffect(() => {
    setMounted(true);
  }, []);

  // BUG: mounted is never checked — children always render
  // This means server and client render the same thing...
  // unless children uses browser APIs (then it crashes on the server)
  return <>{mounted ? children : (fallback ?? children)}</>; // also renders children when !mounted if no fallback
}

// ✓ WORKING VERSION
function ClientOnly({ children, fallback = null }: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // On server: mounted=false → render fallback (or null)
  // After hydration: mounted=true → render real children
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

// Content that uses browser-only APIs (would crash on the server)
function BrowserOnlyContent() {
  return (
    <div style={{ padding: '0.75rem', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #a5d6a7' }}>
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        <strong>Client-only data:</strong><br />
        Screen: {window.innerWidth}×{window.innerHeight}px<br />
        Language: {navigator.language}<br />
        Online: {navigator.onLine ? 'Yes' : 'No'}
      </p>
    </div>
  );
}

function Exercise2_ClientOnlyPattern() {
  const [useWorking, setUseWorking] = useState(false);

  return (
    <section>
      <h2>Exercise 2: Build a ClientOnly Wrapper</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        The <code>ClientOnly</code> wrapper renders <code>null</code> (or a fallback) on the server
        and the real content only after hydration. This prevents crashes from browser-only APIs.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fee', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
          <strong>❌ Broken implementation</strong>
          <pre style={{ background: '#fff', padding: '0.75rem', borderRadius: '4px', marginTop: '0.75rem', overflow: 'auto', lineHeight: 1.6 }}>{`function ClientOnly_Broken({ children, fallback }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // BUG 1: when fallback is provided but mounted=false,
  //        this renders fallback correctly...
  // BUG 2: but when NO fallback is given, it renders
  //        children BEFORE mount (server crash risk)
  return <>{mounted ? children
    : (fallback ?? children)}</>;
}`}
          </pre>
          <p style={{ margin: '0.5rem 0 0', color: '#c00', fontSize: '0.8rem' }}>
            The subtle bug: <code>(fallback ?? children)</code> — if fallback is undefined,
            it falls through to children. Children might call window.XXX → server crash.
          </p>
        </div>
        <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
          <strong>✓ Correct implementation</strong>
          <pre style={{ background: '#fff', padding: '0.75rem', borderRadius: '4px', marginTop: '0.75rem', overflow: 'auto', lineHeight: 1.6 }}>{`function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Explicit guard: never renders children before mount
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}`}
          </pre>
          <p style={{ margin: '0.5rem 0 0', color: '#2a7', fontSize: '0.8rem' }}>
            <code>if (!mounted) return fallback</code> — children are <em>never evaluated</em>
            before mount. Even if children call <code>window.X</code>, it's only executed client-side.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <button
          onClick={() => setUseWorking(false)}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: !useWorking ? '#e55' : '#ddd',
            background: !useWorking ? '#fee' : '#fff',
            color: !useWorking ? '#c00' : '#333',
            cursor: 'pointer',
          }}
        >
          Broken
        </button>
        <button
          onClick={() => setUseWorking(true)}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '6px',
            border: '2px solid',
            borderColor: useWorking ? '#27ae60' : '#ddd',
            background: useWorking ? '#e8f5e9' : '#fff',
            color: useWorking ? '#27ae60' : '#333',
            cursor: 'pointer',
          }}
        >
          Working
        </button>
      </div>

      <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#555' }}>
          Rendering BrowserOnlyContent (uses window.innerWidth, navigator.language) with{' '}
          <strong>{useWorking ? 'ClientOnly (working)' : 'ClientOnly_Broken'}</strong>:
        </p>
        {useWorking ? (
          <ClientOnly fallback={
            <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '6px', color: '#888', fontSize: '0.9rem' }}>
              Loading browser info...
            </div>
          }>
            <BrowserOnlyContent />
          </ClientOnly>
        ) : (
          <ClientOnly_Broken fallback={
            <div style={{ padding: '0.75rem', background: '#f5f5f5', borderRadius: '6px', color: '#888', fontSize: '0.9rem' }}>
              Loading browser info...
            </div>
          }>
            <BrowserOnlyContent />
          </ClientOnly_Broken>
        )}
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>In a real Next.js SSR render, the broken version would crash the server. Why doesn't it crash here?
            (Vite only runs client-side — there's no actual server render)</li>
          <li>Extend <code>ClientOnly</code> to accept a <code>ssr</code> prop: when <code>ssr={false}</code>,
            it renders <code>null</code> on server. When <code>ssr={true}</code>, it renders children always.
            When would <code>ssr={true}</code> be useful?</li>
          <li>What is Next.js's built-in alternative to writing this pattern manually?
            (Answer: <code>dynamic(import('./Component'), {'{'} ssr: false {'}'})</code>)</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Mismatch Code Review
//
// Read each code snippet. Decide: will this cause a hydration
// warning, and why? Then reveal the verdict.
//
// These cover the most common real-world mismatch patterns.
// ─────────────────────────────────────────────────────────────

interface ReviewItem {
  id: number;
  code: string;
  label: string;
  verdict: 'MISMATCH' | 'SAFE';
  explanation: string;
}

const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 1,
    label: 'Math.random() in JSX',
    code: `function Avatar() {
  // Random color chosen for this user's avatar
  const color = '#' + Math.floor(Math.random() * 0xffffff)
    .toString(16).padStart(6, '0');
  return <div style={{ background: color }}>AB</div>;
}`,
    verdict: 'MISMATCH',
    explanation: 'Math.random() produces a different value on every call — guaranteed different between server render and client hydration. The color will differ → mismatch warning → client re-renders with a different color. Fix: generate the color from a stable seed (userId hash), or generate it client-side only with the mounted pattern.',
  },
  {
    id: 2,
    label: 'window.localStorage check',
    code: `function ThemeToggle() {
  const [dark, setDark] = useState(
    // Reads localStorage — only available in browser
    typeof window !== 'undefined'
      ? localStorage.getItem('theme') === 'dark'
      : false
  );
  return <button onClick={() => setDark(d => !d)}>Toggle</button>;
}`,
    verdict: 'SAFE',
    explanation: 'The typeof window check correctly returns false on the server → initial state is false for both server and client. After hydration, the client can read localStorage. The initial HTML matches (both start with false/light mode). Note: this means the user might see a flash of light mode on a dark-mode preference — the "flash of unstyled content" problem. A more robust solution uses a blocking script to set the class before React renders.',
  },
  {
    id: 3,
    label: 'Date.now() in render',
    code: `function LastUpdated() {
  return (
    <p>
      Last updated: {new Date(Date.now()).toLocaleDateString()}
    </p>
  );
}`,
    verdict: 'MISMATCH',
    explanation: 'Date.now() is called during render. The server renders at request time; the client renders during hydration (milliseconds to seconds later). The dates might match on the same calendar day, but the time portion will differ. And on a slow network, even the date could differ. Fix: pass the date as a prop from the server (the server knows the "true" time for this render), or use suppressHydrationWarning if staleness is acceptable.',
  },
  {
    id: 4,
    label: 'User-agent based rendering',
    code: `function MobileLayout({ children }: { children: React.ReactNode }) {
  const isMobile = typeof navigator !== 'undefined'
    && /iPhone|Android/i.test(navigator.userAgent);

  return isMobile
    ? <div className="mobile-layout">{children}</div>
    : <div className="desktop-layout">{children}</div>;
}`,
    verdict: 'MISMATCH',
    explanation: 'The server doesn\'t have navigator, so isMobile=false and it renders desktop layout. The client has navigator — if the user IS on mobile, it renders the mobile layout. Different HTML → mismatch. Better approach: server-side user agent detection via the request headers (the server knows the user agent from the HTTP request). Or: use CSS media queries instead of JS-based layout switching.',
  },
  {
    id: 5,
    label: 'Static list from props',
    code: `function ProductList({ products }: { products: Product[] }) {
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>{p.name} — ${'{p.price}'}</li>
      ))}
    </ul>
  );
}`,
    verdict: 'SAFE',
    explanation: 'The products array comes from props — the same data is passed during SSR and hydration (the server-rendered props are serialized into the HTML and passed to the client). The render output is deterministic given the same props. No random values, no browser APIs, no time-dependent output. This is the happy path — pure data rendering always hydrates cleanly.',
  },
  {
    id: 6,
    label: 'Component with useId()',
    code: `import { useId } from 'react';

function LabeledInput({ label }: { label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  );
}`,
    verdict: 'SAFE',
    explanation: 'React\'s useId() hook generates IDs that are STABLE and CONSISTENT between server and client renders. This is exactly why useId() exists — never use Math.random() or a counter for element IDs in SSR. React\'s implementation generates the same ID for the same component position in the tree on both server and client.',
  },
];

function Exercise3_CodeReview() {
  const [states, setStates] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 3: Mismatch Code Review</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each snippet: decide if it causes a hydration mismatch before revealing.
        These cover the 6 most common patterns you'll encounter in real codebases.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {REVIEW_ITEMS.map(item => (
          <div key={item.id} style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.6rem 1rem',
              background: '#fafafa',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <strong>#{item.id}: {item.label}</strong>
              {states[item.id] && (
                <span style={{
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: item.verdict === 'MISMATCH' ? '#e55' : '#27ae60',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  {item.verdict}
                </span>
              )}
            </div>
            <div style={{ padding: '0.75rem 1rem' }}>
              <pre style={{ background: '#1e1e2e', color: '#cdd6f4', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', overflow: 'auto', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                {item.code}
              </pre>
              {!states[item.id] ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setStates(prev => ({ ...prev, [item.id]: true }))}
                    style={{ padding: '0.35rem 1rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fee', color: '#c00', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Mismatch →
                  </button>
                  <button
                    onClick={() => setStates(prev => ({ ...prev, [item.id]: true }))}
                    style={{ padding: '0.35rem 1rem', borderRadius: '6px', border: '1px solid #ddd', background: '#e8f5e9', color: '#27ae60', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Safe →
                  </button>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', lineHeight: 1.6, background: item.verdict === 'MISMATCH' ? '#fff5f5' : '#f0fff4', padding: '0.75rem', borderRadius: '6px' }}>
                  <strong>{item.verdict === 'MISMATCH' ? '⚠ Mismatch:' : '✓ Safe:'}</strong> {item.explanation}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — The FCP → TTI Gap
//
// After SSR, the page LOOKS interactive (FCP) but ISN'T interactive
// until hydration completes (TTI). This gap is the root of "dead clicks."
//
// This exercise simulates that gap — the button looks clickable
// but is unresponsive during "hydration." You can feel the problem.
// Then explore the React 18 selective hydration solution.
// ─────────────────────────────────────────────────────────────

type HydrationPhase = 'pre-hydration' | 'hydrating' | 'hydrated';

function SimulatedSSRPage({ phase }: { phase: HydrationPhase }) {
  const [clicks, setClicks] = useState<string[]>([]);
  const queuedClicksRef = useRef<string[]>([]);

  // Simulate React 18's behavior: queue clicks during hydration and replay
  function handleClick(name: string) {
    if (phase === 'hydrating') {
      // React 18 QUEUES this — we simulate that
      queuedClicksRef.current.push(name);
      setClicks(prev => [...prev, `${name} (queued — replayed after hydration)`]);
    } else {
      setClicks(prev => [...prev, `${name} (responded instantly)`]);
    }
  }

  const isInteractive = phase === 'hydrated';

  return (
    <div style={{
      border: `2px solid ${phase === 'pre-hydration' ? '#ddd' : phase === 'hydrating' ? '#e67e22' : '#27ae60'}`,
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.6rem 1rem',
        background: phase === 'pre-hydration' ? '#fafafa' : phase === 'hydrating' ? '#fff3e0' : '#f0fff4',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: phase === 'hydrating' ? '#e67e22' : '#555' }}>
          {phase === 'pre-hydration' && '⬜ Pre-hydration — HTML visible, React not attached'}
          {phase === 'hydrating' && '⏳ Hydrating — React is walking the tree, not fully attached yet'}
          {phase === 'hydrated' && '✅ Fully hydrated — fully interactive'}
        </span>
      </div>

      <div style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', color: '#333' }}>Product Page</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {['Add to Cart', 'Wishlist', 'Share', 'Compare'].map(name => (
            <button
              key={name}
              onClick={() => handleClick(name)}
              disabled={phase === 'pre-hydration'}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: isInteractive ? '#1a73e8' : phase === 'hydrating' ? '#f0a04b' : '#ddd',
                color: isInteractive ? '#fff' : phase === 'hydrating' ? '#fff' : '#999',
                cursor: phase === 'pre-hydration' ? 'not-allowed' : 'pointer',
                position: 'relative',
              }}
            >
              {name}
              {phase === 'hydrating' && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '12px', height: '12px', background: '#e67e22', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
              )}
            </button>
          ))}
        </div>

        {phase === 'hydrating' && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#e67e22' }}>
            ⚠ Buttons look clickable (orange = visible but not yet fully hydrated).
            React 18 queues your click and replays it after hydration.
          </p>
        )}

        {clicks.length > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#f5f5f5', borderRadius: '6px', fontSize: '0.8rem' }}>
            <strong>Click log:</strong>
            {clicks.map((c, i) => <div key={i} style={{ marginTop: '2px' }}>→ {c}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Exercise4_HydrationGap() {
  const [phase, setPhase] = useState<HydrationPhase>('pre-hydration');

  const PHASE_ORDER: HydrationPhase[] = ['pre-hydration', 'hydrating', 'hydrated'];

  function advance() {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) {
      setPhase(PHASE_ORDER[idx + 1]);
    }
  }
  function reset() {
    setPhase('pre-hydration');
  }

  return (
    <section>
      <h2>Exercise 4: The FCP → TTI Gap (simulated)</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        After SSR, the page looks rendered (FCP) but React hasn't attached event handlers yet.
        Step through the phases to understand what happens during this gap.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <button
          onClick={advance}
          disabled={phase === 'hydrated'}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            background: phase === 'hydrated' ? '#ccc' : '#1a73e8',
            color: '#fff',
            cursor: phase === 'hydrated' ? 'default' : 'pointer',
          }}
        >
          {phase === 'pre-hydration' ? 'Start Hydration →' : phase === 'hydrating' ? 'Complete Hydration →' : '✓ Hydrated'}
        </button>
        <button
          onClick={reset}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      <SimulatedSSRPage phase={phase} />

      <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
        <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px' }}>
          <strong>React 18 selective hydration:</strong>
          <p style={{ margin: '0.5rem 0 0', lineHeight: 1.6 }}>
            React 18 prioritizes hydrating components the user interacts with.
            If you click a button that's not yet hydrated, React immediately
            hydrates that component first, queues the click, then replays it.
            You never lose the click — you just get it slightly delayed.
          </p>
        </div>
        <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px' }}>
          <strong>TODO — answer:</strong>
          <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
            <li>On a slow mobile device, this gap can be 1–3 seconds. What would the user experience?</li>
            <li>How does RSC (React Server Components) reduce the size of this gap?
              (Server Components ship zero JS — less to download + parse = faster TTI)</li>
            <li>What does "streaming SSR" do to the FCP? To the TTI?</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Hydration</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> Real hydration runs inside Next.js with <code>hydrateRoot()</code> on the client.
      These exercises simulate the key behaviors: mismatches, the mounted pattern, and the FCP→TTI gap.
      The patterns you build here are directly applicable to production SSR apps.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_MismatchStrategies />
      <hr />
      <Exercise2_ClientOnlyPattern />
      <hr />
      <Exercise3_CodeReview />
      <hr />
      <Exercise4_HydrationGap />
    </div>
  </div>
);

export default App;
