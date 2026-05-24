// ============================================================
// Topic:   Web Vitals in React
// Phase:   5 — Performance & Internals
//
// HOW TO USE
//   Read notes.md first. These exercises make each Core Web Vital
//   OBSERVABLE and then show the React fix:
//
//   Exercise 1: CLS — observe elements jumping as content loads;
//     fix with explicit dimensions and layout reservations.
//   Exercise 2: INP — feel interaction lag from a heavy synchronous
//     render; fix with useTransition to keep input responsive.
//   Exercise 3: LCP — understand the connection between code splitting
//     and LCP, and when lazy loading hurts vs helps.
// ============================================================

import { useState, useTransition, useRef, useEffect, lazy, Suspense } from 'react';

const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#f8fafc' };
const hint = { fontSize: 12, color: '#64748b', marginBottom: 8 };
const btnStyle = { padding: '7px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };


// ─── Exercise 1: CLS — Cumulative Layout Shift ────────────────
//
// SITUATION
//   CLS measures unexpected layout movement. Score ≤ 0.1 is "good".
//   React-specific causes:
//   1. Images without width/height — browser doesn't reserve space;
//      image loads → page jumps down.
//   2. Dynamic content injected above existing content — "You have 3 items
//      in your cart" banner appears → everything below shifts.
//   3. Fonts loading late — text reflows as font metrics change (FOUT).
//
//   Each layout shift = fraction_of_viewport × distance_fraction.
//   One 200px shift of content that fills 50% of viewport ≈ 0.1 (poor).
//
// WHAT YOU'LL SEE
//   The "bad" version loads three "images" (colored boxes) without reserving
//   space. Each load event causes the content below to jump.
//   The "fixed" version reserves space upfront — no shift.
//
// YOUR TASK
//   1. Click "Load images (bad — no dimensions)". Watch the "text content"
//      jump each time a new image loads. Feel how disorienting this is.
//   2. Click "Load images (fixed — explicit dimensions)". No jump.
//   3. Answer: in React, how do you reserve image space before the src loads?

function FakeImage({ src, width, height, reserveSpace, delay, label }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate image load
      setLoaded(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (reserveSpace) {
    // ✅ Space reserved: the container always takes up the declared dimensions
    return (
      <div style={{
        width: width || '100%', height: height || 160,
        background: loaded ? src : '#e2e8f0',
        borderRadius: 6, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#94a3b8', transition: 'background 0.3s',
      }}>
        {!loaded && `⏳ ${label}`}
        {loaded && <span style={{ color: '#fff', fontWeight: 600, fontSize: 12 }}>{label}</span>}
      </div>
    );
  }

  // ❌ No space reserved: takes zero height until loaded
  if (!loaded) return null;
  return (
    <div style={{
      width: '100%', height: 160,
      background: src,
      borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 8,
    }}>
      {label} (loaded)
    </div>
  );
}

const IMAGE_DATA = [
  { src: '#3b82f6', delay: 600, label: 'Hero image' },
  { src: '#8b5cf6', delay: 1200, label: 'Product photo' },
  { src: '#10b981', delay: 1800, label: 'Avatar' },
];

function Exercise1() {
  const [mode, setMode] = useState(null); // null | 'bad' | 'good'
  const [key, setKey] = useState(0);

  const reset = (nextMode) => {
    setMode(null);
    setKey(k => k + 1);
    setTimeout(() => setMode(nextMode), 50);
  };

  return (
    <section>
      <h2>Exercise 1 — CLS: Cumulative Layout Shift</h2>
      <p style={hint}>
        Watch the text paragraph below the images. In the "bad" version it jumps each time an image loads.
        In the "fixed" version, space is reserved — no movement.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => reset('bad')}
          style={{ ...btnStyle, background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}
        >
          Load images (bad — no dimensions reserved)
        </button>
        <button
          onClick={() => reset('good')}
          style={{ ...btnStyle, background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}
        >
          Load images (fixed — explicit width/height)
        </button>
      </div>

      <div key={key} style={{ ...card, minHeight: 220 }}>
        {mode === 'bad' && (
          <div>
            {IMAGE_DATA.map((img, i) => (
              <FakeImage key={i} {...img} reserveSpace={false} />
            ))}
            <div style={{ padding: '12px', background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
              ⚠️ This paragraph keeps jumping as images load above it.
              On a slow connection, users will try to click something and
              hit a different element as the layout shifts — a UX disaster.
            </div>
          </div>
        )}

        {mode === 'good' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {IMAGE_DATA.map((img, i) => (
                <FakeImage key={i} {...img} reserveSpace={true} width={undefined} height={100} />
              ))}
            </div>
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 6, fontSize: 13 }}>
              ✅ This paragraph stays put. Images are loading but their space is already
              reserved. Gray placeholder → colored image, no layout movement.
            </div>
          </div>
        )}

        {!mode && (
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
            Click a button above to simulate image loading
          </div>
        )}
      </div>

      {/* ANSWERS:
          Q: How do you prevent CLS from images in React?
          A: 1. Always set width and height attributes on <img> tags.
                The browser uses these to reserve space before the image loads.
                aspect-ratio CSS can also work for responsive images.
             2. Use a placeholder div with the same dimensions as a loading state.
             3. For dynamic content (notifications, banners), insert below existing
                content instead of above it — users don't see content they've
                already scrolled past shift.
             4. Font-related CLS: use font-display: swap in @font-face and/or
                size-adjust to minimize reflow when the web font loads.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>React CLS fixes:</strong>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Always pass <code>width</code> and <code>height</code> to <code>&lt;img&gt;</code> — even for responsive images (CSS overrides the values but the aspect ratio is preserved)</li>
          <li>Use <code>aspect-ratio</code> CSS property on image containers: <code>{'aspect-ratio: 16/9'}</code></li>
          <li>For dynamic banners/notifications: append below existing content, or use <code>position: fixed</code></li>
          <li>Use skeleton screens (same dimensions as the real content) instead of nothing</li>
        </ul>
      </div>
    </section>
  );
}


// ─── Exercise 2: INP — Interaction to Next Paint ──────────────
//
// SITUATION
//   INP measures the time from a user interaction (click, keypress)
//   to when the browser paints the response. Threshold: ≤ 200ms is good.
//
//   The React connection: a state update triggered by an interaction
//   causes a synchronous render. If that render is expensive (e.g.,
//   filtering 5000 items, re-rendering a complex tree), the browser
//   cannot paint until the render completes. The user's click feels "stuck".
//
//   Fix: useTransition marks the expensive state update as non-urgent.
//   The input update (urgent) paints immediately. The expensive render
//   (non-urgent) happens later, showing isPending while it works.
//
// WHAT YOU'LL SEE
//   Type in the search boxes. The "bad" version freezes the input
//   while filtering 8,000 items. The "fixed" version keeps the input
//   responsive — you see your keystrokes immediately.
//
// YOUR TASK
//   1. Type fast in the "Bad (synchronous)" box. Notice the input lag.
//   2. Type fast in the "Fixed (useTransition)" box. Notice input stays responsive.
//   3. Compare the "renders" count — same work, different priority.

function fakeExpensiveFilter(query, items) {
  // Simulates expensive filtering — busy-loop to make it observable
  // In real apps this is usually a long item list + complex render tree
  const start = performance.now();
  while (performance.now() - start < 60) {
    // Spin for ~60ms per keystroke — enough to feel sluggish
  }
  if (!query) return items.slice(0, 20);
  return items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20);
}

const ITEMS = Array.from({ length: 8000 }, (_, i) => ({
  id: i,
  name: `${['React', 'Redux', 'TypeScript', 'GraphQL', 'Node', 'CSS', 'HTML', 'Vue', 'Angular', 'Svelte'][i % 10]} Item ${i + 1}`,
}));

function BadSearch() {
  const [query, setQuery] = useState('');
  const renderCount = useRef(0);
  renderCount.current++;

  // ❌ Every keystroke runs the expensive filter synchronously
  // Input lag = filter duration (60ms × characters typed)
  const results = fakeExpensiveFilter(query, ITEMS);

  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>
        ❌ Bad: synchronous render on every keystroke
      </div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type fast here..."
        style={{ width: '100%', padding: '7px 10px', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff5f5', outline: 'none' }}
      />
      <div style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>
        renders: {renderCount.current} | results: {results.length}
      </div>
      <div style={{ height: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
        {results.map(item => (
          <div key={item.id} style={{ padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #f8fafc' }}>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function GoodSearch() {
  const [query, setQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const renderCount = useRef(0);
  renderCount.current++;

  const handleChange = (e) => {
    const value = e.target.value;
    // ✅ Urgent update: input value updates immediately (high priority)
    setQuery(value);
    // ✅ Non-urgent update: expensive filter marked as transition
    startTransition(() => {
      setDeferredQuery(value);
    });
  };

  // Only runs with the deferred query — doesn't block input
  const results = fakeExpensiveFilter(deferredQuery, ITEMS);

  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 6 }}>
        ✅ Fixed: useTransition keeps input urgent
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Type fast here..."
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #86efac', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#f0fdf4', outline: 'none' }}
        />
        {isPending && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#3b82f6' }}>
            ⏳ updating
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>
        renders: {renderCount.current} | results: {results.length}{isPending ? ' (stale)' : ''}
      </div>
      <div style={{ height: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 4, opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
        {results.map(item => (
          <div key={item.id} style={{ padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #f8fafc' }}>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — INP: Interaction to Next Paint</h2>
      <p style={hint}>
        Type quickly in both search boxes. The left (bad) feels sluggish — each keystroke blocks painting.
        The right (fixed) stays responsive — the input paints immediately, results catch up.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <BadSearch />
        <GoodSearch />
      </div>

      {/* ANSWERS:
          Why does the bad version feel sluggish?
          Each keystroke triggers setQuery → React renders synchronously →
          fakeExpensiveFilter runs (60ms busy loop) → then browser paints.
          60ms per keystroke = input appears ~60ms after you press each key.
          At 100ms+, users perceive the input as broken.

          Why does the good version stay responsive?
          setQuery is urgent → input re-renders immediately (near 0ms) → browser paints input.
          startTransition(() => setDeferredQuery(value)) schedules the expensive work
          as interruptible. React can yield to new input events, restart the filter with
          the latest query, and show isPending in the meantime.
      */}

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>useTransition pattern for INP:</strong>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li>Identify which state update drives the expensive render (the search results, not the input)</li>
          <li>Split into two state values: one for the urgent UI (input), one for the deferred computation</li>
          <li>Wrap the deferred update in <code>startTransition</code></li>
          <li>Show <code>isPending</code> as a loading indicator so users see something is happening</li>
          <li>Fade the stale results with <code>opacity: isPending ? 0.6 : 1</code> — visual feedback without hiding content</li>
        </ol>
      </div>
    </section>
  );
}


// ─── Exercise 3: LCP — Lazy Loading Tradeoffs ─────────────────
//
// SITUATION
//   LCP (Largest Contentful Paint) measures when the main content appears.
//   Code splitting (React.lazy) helps LCP by reducing main bundle size —
//   the browser starts rendering sooner because it downloads less JS.
//
//   BUT: lazy loading the LCP element itself HURTS LCP. If the hero section
//   or main content area is behind a Suspense boundary, it doesn't appear
//   until the chunk downloads — which is SLOWER than if it were in the main bundle.
//
//   Rule of thumb:
//   ✅ Lazy-load routes and features the user hasn't accessed yet
//   ❌ Never lazy-load what's visible on first paint (hero, nav, main content)
//
// YOUR TASK
//   Read the three scenarios below. For each, decide: does lazy loading
//   this component help or hurt LCP? Then reveal the analysis.

const LCP_SCENARIOS = [
  {
    id: 'A',
    label: 'Hero section (above the fold, always visible on load)',
    code: `// ❌ BAD: lazy loading the hero
const HeroSection = lazy(() => import('./HeroSection'));

function HomePage() {
  return (
    <Suspense fallback={<div className="hero-skeleton" />}>
      <HeroSection />  {/* This IS the LCP element */}
    </Suspense>
  );
}`,
    verdict: 'hurts',
    explanation: 'The hero section IS the LCP candidate — it\'s the largest visible element on first load. Lazy loading it means: download main bundle → parse → render skeleton → request HeroSection chunk → download → parse → render hero. That\'s a waterfall. LCP is measured when the hero actually appears, not the skeleton. This could add 500ms–2000ms to LCP on a slow connection.',
    fix: `// ✅ Import HeroSection statically — it's needed immediately
import HeroSection from './HeroSection';

function HomePage() {
  return <HeroSection />;  // part of main bundle, renders immediately
}`,
  },
  {
    id: 'B',
    label: '"Settings" modal (opens only when user clicks a button)',
    code: `// ✅ GOOD: lazy loading a modal
const SettingsModal = lazy(() => import('./SettingsModal'));

function App() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Settings</button>
      {open && (
        <Suspense fallback={<Spinner />}>
          <SettingsModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}`,
    verdict: 'helps',
    explanation: 'The settings modal is never part of first paint — it only renders after a user click. Keeping it in the main bundle means everyone pays its cost (30–100KB?) on every page load even if they never open it. Lazy loading removes it from the main bundle, reducing initial parse time → smaller main bundle → faster LCP for the actual LCP element.',
    fix: null,
  },
  {
    id: 'C',
    label: 'Product image gallery (below the fold on mobile)',
    code: `// Inline import — is this right?
import ProductGallery from './ProductGallery';

function ProductPage() {
  return (
    <div>
      <ProductTitle />       {/* above fold — LCP candidate */}
      <ProductPrice />       {/* above fold */}
      <ProductGallery />     {/* below fold on mobile, above fold on desktop */}
    </div>
  );
}`,
    verdict: 'depends',
    explanation: 'This is a judgment call. If the gallery is the LCP element on desktop (large hero image), it should be in the main bundle. If it\'s genuinely below the fold on most devices, lazy loading saves main bundle bytes. The key insight: LCP is measured on real devices at the 75th percentile. On your users\' actual viewport sizes, what is the LCP element? Use Chrome DevTools → Lighthouse → LCP indicator to find out, then decide.',
    fix: `// If you decide to lazy-load, use an Intersection Observer pattern:
// Only load the chunk when the gallery enters the viewport.
// react-intersection-observer or a manual useEffect + IntersectionObserver.
// This gives the best of both: no main bundle cost + loads before user scrolls to it.`,
  },
];

function Exercise3() {
  const [revealed, setRevealed] = useState({});

  const verdictColor = {
    helps: '#16a34a',
    hurts: '#dc2626',
    depends: '#d97706',
  };

  const verdictBg = {
    helps: '#f0fdf4',
    hurts: '#fef2f2',
    depends: '#fefce8',
  };

  return (
    <section>
      <h2>Exercise 3 — LCP: When Lazy Loading Helps vs Hurts</h2>
      <p style={hint}>
        For each component, decide before revealing: does lazy-loading it improve or hurt LCP?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LCP_SCENARIOS.map(scenario => (
          <div key={scenario.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Scenario {scenario.id}: {scenario.label}
              </span>
              <button
                onClick={() => setRevealed(prev => ({ ...prev, [scenario.id]: !prev[scenario.id] }))}
                style={{ ...btnStyle, padding: '3px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12, flexShrink: 0, marginLeft: 8 }}
              >
                {revealed[scenario.id] ? 'Hide' : 'Reveal'}
              </button>
            </div>

            <pre style={{ fontFamily: 'monospace', fontSize: 11, background: '#1e293b', color: '#e2e8f0', padding: '12px 16px', borderRadius: 6, margin: '0 0 8px', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>
              {scenario.code}
            </pre>

            {revealed[scenario.id] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                  background: verdictBg[scenario.verdict],
                  color: verdictColor[scenario.verdict],
                }}>
                  {scenario.verdict === 'helps' && '✅ HELPS LCP — lazy loading this is correct'}
                  {scenario.verdict === 'hurts' && '❌ HURTS LCP — do NOT lazy load this'}
                  {scenario.verdict === 'depends' && '⚠️ DEPENDS — needs real-user data to decide'}
                </div>
                <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.6 }}>
                  {scenario.explanation}
                </p>
                {scenario.fix && (
                  <div>
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginBottom: 3 }}>
                      {scenario.verdict === 'hurts' ? '✅ Fix — use static import instead:' : '💡 If you need to lazy-load:'}
                    </div>
                    <pre style={{ fontFamily: 'monospace', fontSize: 11, background: '#0f2d1f', color: '#e2e8f0', padding: '10px 14px', borderRadius: 6, margin: 0, lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>
                      {scenario.fix}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fef9c3', borderRadius: 6, fontSize: 13 }}>
        <strong>Web Vitals quick reference for React apps:</strong>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Metric</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Good</th>
              <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #e2e8f0' }}>React fix</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['LCP', '≤ 2.5s', 'Reduce main bundle size via code splitting; statically import LCP elements'],
              ['CLS', '≤ 0.1', 'width/height on images; skeleton screens; insert dynamic content below fold'],
              ['INP', '≤ 200ms', 'useTransition for expensive renders; avoid blocking the main thread during events'],
            ].map(([metric, good, fix]) => (
              <tr key={metric}>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{metric}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', color: '#16a34a' }}>{good}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #e2e8f0', color: '#475569' }}>{fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 860, margin: '0 auto', lineHeight: 1.5 }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 12 }}>
        Phase 5 · 14 — Web Vitals in React
      </h1>
      <Exercise1 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise2 />
      <hr style={{ margin: '40px 0', borderColor: '#e2e8f0' }} />
      <Exercise3 />
    </div>
  );
}
