// ============================================================
// Topic:   CSR vs SSR vs SSG vs ISR
// Phase:   12 — SSR and Meta-Frameworks
// File:    tutorial.tsx
//
// Exercise type: SCENARIO DECISIONS + INTERACTIVE SIMULATION
//
// You can't demo real SSR/SSG in a Vite app, but you CAN:
//   1. Build intuition for picking the right rendering mode
//   2. Simulate the stale-while-revalidate behavior of ISR
//   3. Reason through tradeoffs on a realistic product
//
// Run: npm run tutorial 01-csr-ssr-ssg-isr
// ============================================================

import { useState, useEffect, useRef, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Scenario Classifier
//
// Given a real-world page description, choose the right
// rendering mode and verify your reasoning.
//
// HOW TO USE:
//   Read each card. Think first. Then click a button.
//   The card reveals the answer and WHY.
// ─────────────────────────────────────────────────────────────

type RenderingMode = 'CSR' | 'SSR' | 'SSG' | 'ISR';

interface Scenario {
  id: number;
  title: string;
  description: string;
  details: string[];
  answer: RenderingMode;
  reasoning: string;
  tradeoff?: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'Banking Dashboard',
    description: 'Shows account balances, recent transactions, and spending charts for the logged-in user.',
    details: ['Data is 100% user-specific', 'Always behind authentication', 'No SEO needed', 'Balances must be real-time'],
    answer: 'CSR',
    reasoning: 'Behind auth = no public indexing. Every user sees different data = can\'t cache. CSR is ideal: the HTML shell is served instantly, React fetches user data after login. No SSR server cost needed.',
    tradeoff: 'If you needed the balance in a shared notification (e.g., email with balance), you\'d use SSR for that endpoint.',
  },
  {
    id: 2,
    title: 'Documentation Site',
    description: 'Technical docs for an open-source library. 200+ pages of markdown rendered to HTML.',
    details: ['Content changes only on new library releases', 'Same HTML for every visitor', 'SEO is critical', 'Fast load time matters'],
    answer: 'SSG',
    reasoning: 'Content is identical for all users, changes only on new releases (deploy), and SEO is essential. SSG generates all 200 pages at build time. CDN serves them globally — near-instant TTFB, perfect SEO, zero server compute per request.',
    tradeoff: 'If docs had personalization (highlighting features you haven\'t tried), you\'d layer CSR on top of the static shell.',
  },
  {
    id: 3,
    title: 'E-commerce Product Page',
    description: 'Shows product name, images, price ($12.99), and inventory count (updates every few minutes).',
    details: ['1M+ product pages', 'Price rarely changes', 'Inventory can change frequently', 'SEO matters for product discovery'],
    answer: 'ISR',
    reasoning: 'ISR with revalidate: 60 is perfect. The page is statically cached (fast CDN, great SEO). After 60s, the next request triggers background regeneration — stale inventory for at most 60s is acceptable. Full rebuild of 1M pages would take hours.',
    tradeoff: 'If real-time inventory is required, use ISR for the static content + a client-side fetch just for stock count.',
  },
  {
    id: 4,
    title: 'News Article Page',
    description: 'Breaking news: live updates, comments count changes every second, personalized related articles.',
    details: ['Breaking news content changes as story develops', 'Comments update in real time', 'Related articles are personalized per user', 'SEO critical for news discovery'],
    answer: 'SSR',
    reasoning: 'Real-time breaking news + per-user personalization means the page can\'t be safely cached. SSR generates fresh HTML on every request. The related articles are user-specific (needs request context). SEO is served because the HTML is fully formed.',
    tradeoff: 'For the comments section, hybrid: SSR the article, CSR the comments with polling/websocket.',
  },
  {
    id: 5,
    title: 'Marketing Landing Page',
    description: 'Homepage for a SaaS product. Hero text, features, pricing, testimonials. Updated by marketing team monthly.',
    details: ['Same for every visitor', 'Updated via CMS maybe once a month', 'SEO and Core Web Vitals are top priority', 'Must load fast on mobile'],
    answer: 'SSG',
    reasoning: 'Pure SSG. The content never changes between deploys. CDN-served static HTML = perfect Lighthouse score. When marketing updates copy in the CMS, a webhook triggers a new build and deploy. No server cost per request.',
  },
  {
    id: 6,
    title: 'Hotel Search Results',
    description: 'User searches "hotels in Paris, Aug 10–15" — shows availability and live pricing from 50+ hotels.',
    details: ['Results are unique to each search query', 'Prices and availability change constantly', 'SEO matters for generic search terms', 'Can\'t cache per-user results'],
    answer: 'SSR',
    reasoning: 'Search results are uniquely generated per query (dates, location, guests). Prices change constantly — caching would show wrong prices. SSR generates fresh HTML per request. The URL is indexable (/search?destination=paris) giving some SEO benefit.',
    tradeoff: 'Expensive — every search hits the server. A hybrid approach: SSG for the generic /search page shell, CSR for the actual results.',
  },
];

type GuessState = Record<number, { guess: RenderingMode | null; revealed: boolean }>;

const MODE_COLORS: Record<RenderingMode, string> = {
  CSR: '#1a73e8',
  SSR: '#e67e22',
  SSG: '#27ae60',
  ISR: '#8e44ad',
};

function ScenarioCard({ scenario, state, onGuess, onReveal }: {
  scenario: Scenario;
  state: { guess: RenderingMode | null; revealed: boolean };
  onGuess: (mode: RenderingMode) => void;
  onReveal: () => void;
}) {
  const isCorrect = state.guess === scenario.answer;

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '10px',
      overflow: 'hidden',
      background: state.revealed ? (isCorrect ? '#f0fff4' : '#fff8f0') : '#fff',
      transition: 'background 0.3s',
    }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', background: '#fafafa' }}>
        <strong>#{scenario.id} — {scenario.title}</strong>
      </div>
      <div style={{ padding: '1.25rem' }}>
        <p style={{ margin: '0 0 0.75rem', color: '#333' }}>{scenario.description}</p>
        <ul style={{ margin: '0 0 1rem', paddingLeft: '1.25rem', color: '#666', fontSize: '0.9rem' }}>
          {scenario.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>

        {/* Mode buttons */}
        {!state.revealed && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {(['CSR', 'SSR', 'SSG', 'ISR'] as RenderingMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onGuess(mode)}
                style={{
                  padding: '0.4rem 1.2rem',
                  borderRadius: '6px',
                  border: '2px solid',
                  borderColor: state.guess === mode ? MODE_COLORS[mode] : '#ddd',
                  background: state.guess === mode ? MODE_COLORS[mode] : '#fff',
                  color: state.guess === mode ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontWeight: state.guess === mode ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {mode}
              </button>
            ))}
            {state.guess && (
              <button
                onClick={onReveal}
                style={{
                  padding: '0.4rem 1.2rem',
                  borderRadius: '6px',
                  border: '2px solid #333',
                  background: '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Reveal →
              </button>
            )}
          </div>
        )}

        {/* Revealed answer */}
        {state.revealed && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{
                padding: '0.3rem 1rem',
                borderRadius: '20px',
                background: MODE_COLORS[scenario.answer],
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>
                {scenario.answer}
              </span>
              <span style={{ fontSize: '1.1rem' }}>
                {isCorrect ? '✓ Correct' : `✗ You chose ${state.guess} — answer is ${scenario.answer}`}
              </span>
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#333', lineHeight: 1.6 }}>
              <strong>Why:</strong> {scenario.reasoning}
            </p>
            {scenario.tradeoff && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#777', fontStyle: 'italic' }}>
                💡 Nuance: {scenario.tradeoff}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Exercise1_ScenarioClassifier() {
  const [states, setStates] = useState<GuessState>(() =>
    Object.fromEntries(SCENARIOS.map(s => [s.id, { guess: null, revealed: false }]))
  );
  const score = SCENARIOS.filter(s => states[s.id].revealed && states[s.id].guess === s.answer).length;
  const revealed = SCENARIOS.filter(s => states[s.id].revealed).length;

  function handleGuess(id: number, mode: RenderingMode) {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], guess: mode } }));
  }
  function handleReveal(id: number) {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], revealed: true } }));
  }

  return (
    <section>
      <h2>Exercise 1: Rendering Mode Classifier</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        For each scenario: choose the best rendering mode, then reveal the answer.
        Think before clicking — the reasoning matters more than the answer.
      </p>
      {revealed > 0 && (
        <div style={{ margin: '0.75rem 0', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem' }}>
          Score: <strong>{score}/{revealed}</strong> revealed so far
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {SCENARIOS.map(s => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            state={states[s.id]}
            onGuess={mode => handleGuess(s.id, mode)}
            onReveal={() => handleReveal(s.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Performance Timeline: TTFB / FCP / Data Freshness
//
// Each rendering mode has a different profile.
// This exercise makes you reason about WHERE time is spent.
//
// SELECT a mode and observe how the timeline changes.
// Then answer the questions below.
// ─────────────────────────────────────────────────────────────

interface TimelineData {
  label: string;
  ttfb: number;       // ms — lower is better
  fcp: number;        // ms after TTFB — time from first byte to first paint
  tti: number;        // ms after FCP — time from first paint to interactive
  freshness: string;
  seo: string;
  cost: string;
  description: string;
}

const TIMELINES: Record<RenderingMode, TimelineData> = {
  CSR: {
    label: 'CSR',
    ttfb: 30,
    fcp: 800,
    tti: 200,
    freshness: 'Always fresh (client fetches on demand)',
    seo: 'Poor — crawler sees empty HTML',
    cost: 'Low (CDN serves static shell)',
    description: 'TTFB is instant (CDN) but FCP is slow — browser must download + run JS before any content appears.',
  },
  SSR: {
    label: 'SSR',
    ttfb: 300,
    fcp: 100,
    tti: 400,
    freshness: 'Always fresh (generated per request)',
    seo: 'Excellent — full HTML immediately',
    cost: 'High (every request hits server)',
    description: 'TTFB is slower (server must render first), but FCP is fast — browser paints the server HTML immediately. Hydration adds TTI gap.',
  },
  SSG: {
    label: 'SSG',
    ttfb: 30,
    fcp: 80,
    tti: 300,
    freshness: 'Stale until next build/deploy',
    seo: 'Excellent — full HTML immediately',
    cost: 'Lowest (pure CDN, no server compute)',
    description: 'Best of all worlds for static content. Near-instant TTFB from CDN + fast FCP from pre-built HTML. Tradeoff: data can only change on deploy.',
  },
  ISR: {
    label: 'ISR',
    ttfb: 35,
    fcp: 85,
    tti: 310,
    freshness: 'Fresh within revalidation window (e.g., 60s)',
    seo: 'Excellent — full HTML immediately',
    cost: 'Low (CDN + occasional background regeneration)',
    description: 'Like SSG but with automatic background regeneration. CDN serves the cached page; after the revalidation interval, next request triggers a background rebuild.',
  },
};

function TimelineBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' }}>
        <span>{label}</span>
        <span style={{ color: '#888' }}>{value}ms</span>
      </div>
      <div style={{ height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '5px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function Exercise2_PerformanceTimelines() {
  const [selected, setSelected] = useState<RenderingMode>('CSR');
  const data = TIMELINES[selected];
  const maxMs = 900;

  return (
    <section>
      <h2>Exercise 2: Performance Profile by Rendering Mode</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Select a rendering mode to see its performance profile. Understand WHERE time is spent
        and what the tradeoffs are.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['CSR', 'SSR', 'SSG', 'ISR'] as RenderingMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setSelected(mode)}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '2px solid',
              borderColor: selected === mode ? MODE_COLORS[mode] : '#ddd',
              background: selected === mode ? MODE_COLORS[mode] : '#fff',
              color: selected === mode ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: selected === mode ? 700 : 400,
              fontSize: '1rem',
              transition: 'all 0.15s',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* Timelines */}
        <div style={{ background: '#fafafa', padding: '1.25rem', borderRadius: '10px', border: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 1rem', color: MODE_COLORS[selected] }}>{selected} — Timing</h3>
          <TimelineBar label="Time to First Byte (TTFB)" value={data.ttfb} max={maxMs} color={MODE_COLORS[selected]} />
          <TimelineBar label="First Contentful Paint (+ms after TTFB)" value={data.fcp} max={maxMs} color={MODE_COLORS[selected]} />
          <TimelineBar label="Time to Interactive (+ms after FCP)" value={data.tti} max={maxMs} color={MODE_COLORS[selected]} />
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#555', lineHeight: 1.6, margin: '1rem 0 0' }}>
            {data.description}
          </p>
        </div>

        {/* Characteristics */}
        <div style={{ background: '#fafafa', padding: '1.25rem', borderRadius: '10px', border: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 1rem', color: MODE_COLORS[selected] }}>{selected} — Characteristics</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <tbody>
              {[
                ['Data Freshness', data.freshness],
                ['SEO', data.seo],
                ['Infrastructure Cost', data.cost],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', fontWeight: 600, color: '#555', width: '40%', verticalAlign: 'top' }}>{k}</td>
                  <td style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee', color: '#333', verticalAlign: 'top' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Why does CSR have near-instant TTFB but slow FCP? Where is the time going?</li>
          <li>Why does SSR have slower TTFB than SSG, even though both serve full HTML?</li>
          <li>SSG and ISR have nearly identical timelines. What's the actual difference between them?</li>
          <li>Why is there always a TTI gap after FCP in SSR/SSG/ISR? What happens during that gap?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Simulate ISR: the stale-while-revalidate cycle
//
// ISR serves the STALE page immediately, then regenerates
// in the background. The NEXT request gets the fresh version.
//
// This simulation makes that cycle tangible:
//   - Click "Visit page" to simulate requests
//   - After the revalidation window, see stale-while-revalidate in action
//   - Count how many requests got stale vs fresh data
// ─────────────────────────────────────────────────────────────

interface PageVersion {
  requestNum: number;
  timestamp: string;
  servedContent: string;
  status: 'cached' | 'stale-served-regenerating' | 'fresh';
}

function Exercise3_ISRSimulation() {
  const REVALIDATE_SECONDS = 8; // short for demo purposes
  const [lastBuiltAt, setLastBuiltAt] = useState<Date>(() => new Date());
  const [currentCacheContent, setCurrentCacheContent] = useState<string>('Build #1 — Products list (prices from build time)');
  const [requestLog, setRequestLog] = useState<PageVersion[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const requestCountRef = useRef(0);

  function getTimeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    return `${secs}s ago`;
  }

  function isStale(): boolean {
    return (Date.now() - lastBuiltAt.getTime()) / 1000 > REVALIDATE_SECONDS;
  }

  async function visitPage() {
    requestCountRef.current += 1;
    const thisRequest = requestCountRef.current;
    setRequestCount(thisRequest);

    const stale = isStale();
    const timestamp = new Date().toLocaleTimeString();

    if (!stale) {
      // Serve from cache — fresh
      setRequestLog(prev => [{
        requestNum: thisRequest,
        timestamp,
        servedContent: currentCacheContent,
        status: 'cached',
      }, ...prev]);
    } else if (!isRegenerating) {
      // Serve stale AND start background regeneration
      const staleContent = currentCacheContent;
      setIsRegenerating(true);

      setRequestLog(prev => [{
        requestNum: thisRequest,
        timestamp,
        servedContent: staleContent + ' ← STALE (regenerating in background...)',
        status: 'stale-served-regenerating',
      }, ...prev]);

      // Simulate 2-second background regeneration
      setTimeout(() => {
        const newContent = `Build #${thisRequest + 1} — Products list (prices from ${new Date().toLocaleTimeString()})`;
        setCurrentCacheContent(newContent);
        setLastBuiltAt(new Date());
        setIsRegenerating(false);
      }, 2000);
    } else {
      // Still regenerating — serve the same stale content
      setRequestLog(prev => [{
        requestNum: thisRequest,
        timestamp,
        servedContent: currentCacheContent + ' ← STALE (still regenerating...)',
        status: 'stale-served-regenerating',
      }, ...prev]);
    }
  }

  const secondsSinceLastBuild = Math.floor((Date.now() - lastBuiltAt.getTime()) / 1000);
  const windowRemaining = Math.max(0, REVALIDATE_SECONDS - secondsSinceLastBuild);

  const STATUS_COLORS: Record<PageVersion['status'], string> = {
    'cached': '#27ae60',
    'stale-served-regenerating': '#e67e22',
    'fresh': '#1a73e8',
  };

  return (
    <section>
      <h2>Exercise 3: ISR — Stale-While-Revalidate in Action</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        This simulates an ISR page with <strong>revalidate: {REVALIDATE_SECONDS}s</strong>.
        Click "Visit Page" to simulate requests. After {REVALIDATE_SECONDS} seconds, the next
        request will be served the stale page while regeneration happens in the background.
      </p>

      {/* Status panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
        <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cache Age</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: windowRemaining > 0 ? '#27ae60' : '#e67e22' }}>
            {secondsSinceLastBuild}s
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888' }}>window: {REVALIDATE_SECONDS}s</div>
        </div>
        <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cache Status</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: windowRemaining > 0 ? '#27ae60' : '#e67e22' }}>
            {isRegenerating ? '⚙️ Regenerating...' : windowRemaining > 0 ? '✓ Fresh' : '⚠ Stale'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#888' }}>
            {windowRemaining > 0 ? `expires in ${windowRemaining}s` : `expired ${Math.abs(windowRemaining)}s ago`}
          </div>
        </div>
        <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '8px', border: '1px solid #eee', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cached Content</div>
          <div style={{ fontSize: '0.75rem', color: '#333', lineHeight: 1.4 }}>{currentCacheContent}</div>
        </div>
      </div>

      <button
        onClick={visitPage}
        disabled={isRegenerating && isStale()}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          borderRadius: '8px',
          border: 'none',
          background: '#8e44ad',
          color: '#fff',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        Visit Page (Request #{requestCount + 1})
      </button>

      {/* Request log */}
      {requestLog.length > 0 && (
        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
          {requestLog.map((req, i) => (
            <div key={i} style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              background: i === 0 ? '#fffde7' : '#fff',
            }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: '12px',
                background: STATUS_COLORS[req.status],
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                marginTop: '2px',
              }}>
                {req.status === 'cached' ? 'HIT' : req.status === 'stale-served-regenerating' ? 'STALE' : 'FRESH'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>Request #{req.requestNum} at {req.timestamp}</div>
                <div style={{ fontSize: '0.85rem', color: '#333' }}>{req.servedContent}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fffde7', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — observe and answer:</strong>
        <ol style={{ margin: '0.5rem 0 0', lineHeight: 2.2 }}>
          <li>Click "Visit Page" several times within the first {REVALIDATE_SECONDS}s. All requests should hit the cache. Why?</li>
          <li>Wait {REVALIDATE_SECONDS}+ seconds, then click. What does the FIRST request get? What about the SECOND?</li>
          <li>This is "stale-while-revalidate." The first post-expiry request is the "trigger" — users never wait. Explain why this matters for UX.</li>
          <li>In Next.js, what is the exact code to set a 60-second ISR revalidation window in the App Router?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — Hybrid Architecture: real products mix modes
//
// Real applications don't use ONE rendering mode.
// A product page might be ISR for the shell, CSR for inventory,
// SSG for the blog sidebar.
//
// Read this architecture for an e-commerce app and fill in
// the blanks — which mode for each section and why.
// ─────────────────────────────────────────────────────────────

interface PageSection {
  name: string;
  description: string;
  data: string;
  answer: RenderingMode;
  explanation: string;
}

const PAGE_SECTIONS: PageSection[] = [
  {
    name: 'Product name, images, description',
    description: 'Static product content — rarely changes, same for all users',
    data: 'DB: products table, read-only',
    answer: 'ISR',
    explanation: 'ISR (revalidate: 3600) — product info changes occasionally (new photos, desc edits). CDN-served for speed + SEO. Rebuilt automatically when content changes.',
  },
  {
    name: 'Real-time inventory count',
    description: '"Only 3 left!" — updates as orders come in',
    data: 'DB: inventory table, changes every few seconds',
    answer: 'CSR',
    explanation: 'CSR — fetched client-side via /api/inventory/:id on component mount. Inventory is too dynamic for any server caching. This is a small isolated data point, so CSR overhead is minimal.',
  },
  {
    name: 'Personalized "You might also like"',
    description: 'Product recommendations based on the user\'s browsing history',
    data: 'ML model + user history — unique per user',
    answer: 'CSR',
    explanation: 'CSR — completely user-specific, can\'t be cached. Fetch after hydration with the user\'s ID from the client session.',
  },
  {
    name: 'Product reviews section',
    description: 'Average rating + 10 most recent reviews. New reviews trickle in.',
    data: 'DB: reviews table, up to a few new per hour',
    answer: 'ISR',
    explanation: 'ISR (revalidate: 300) — reviews don\'t need to be real-time. Serving a review that\'s 5 minutes old is fine. Background regeneration keeps it reasonably fresh without per-request server cost.',
  },
  {
    name: 'Related blog posts',
    description: '"How to use this product" — editorial content that changes rarely',
    data: 'CMS: posts table, updated maybe monthly',
    answer: 'SSG',
    explanation: 'SSG — blog post relationships are defined at build time and rarely change. Pure static HTML, zero compute per request. Rebuilt on CMS deploy webhooks.',
  },
];

function Exercise4_HybridArchitecture() {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <section>
      <h2>Exercise 4: Hybrid Architecture — One Page, Multiple Modes</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        A single e-commerce product page has different sections with different data characteristics.
        For each section, decide the rendering mode and click to verify.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {PAGE_SECTIONS.map((section, i) => (
          <div key={i} style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            background: revealed[i] ? '#f9f9f9' : '#fff',
          }}>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: revealed[i] ? '1px solid #eee' : 'none' }}>
              <div style={{ flex: 1 }}>
                <strong>{section.name}</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#666' }}>{section.description}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#999' }}>Data: {section.data}</p>
              </div>
              {!revealed[i] && (
                <button
                  onClick={() => setRevealed(prev => ({ ...prev, [i]: true }))}
                  style={{ padding: '0.35rem 0.9rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  Reveal mode →
                </button>
              )}
              {revealed[i] && (
                <span style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  background: MODE_COLORS[section.answer],
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}>
                  {section.answer}
                </span>
              )}
            </div>
            {revealed[i] && (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#555', lineHeight: 1.6 }}>
                {section.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem', fontSize: '0.85rem' }}>
        <strong>The key insight:</strong> "What rendering mode should I use?" is not a per-app decision —
        it's a per-section decision. Most production pages are hybrids:
        a cached static shell (SSG/ISR) with islands of CSR for personalized/real-time data.
        This is why Next.js gives you all four modes in one codebase.
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>CSR vs SSR vs SSG vs ISR</h1>
    <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem' }}>
      <strong>Note:</strong> You can't run real SSR/SSG/ISR in a Vite app — these exercises build
      the decision-making intuition and let you simulate the behavior that matters most (ISR's
      stale-while-revalidate cycle). The real implementations live in Next.js/Remix.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_ScenarioClassifier />
      <hr />
      <Exercise2_PerformanceTimelines />
      <hr />
      <Exercise3_ISRSimulation />
      <hr />
      <Exercise4_HybridArchitecture />
    </div>
  </div>
);

export default App;
