// ============================================================
// Topic:   Infinite Scroll
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement infinite scroll with IntersectionObserver.
//   3. Exercise 2: Add error handling + retry logic.
//   4. Compare your solution against the Reference Implementation below.
//
// Run: npm run tutorial 05-infinite-scroll
// ============================================================

import { useState, useEffect, useRef, useCallback, FC } from 'react';

// ── Mock API ──────────────────────────────────────────────────
// No real network calls needed. This simulates paginated data.

interface Item {
  id: number;
  title: string;
  category: string;
  color: string;
}

const CATEGORIES = ['Technology', 'Science', 'Art', 'Sports', 'Music'];
const COLORS = ['#e3f2fd', '#e8f5e9', '#fff3e0', '#f3e5f5', '#fce4ec'];

function generateItems(page: number, perPage = 8): Item[] {
  return Array.from({ length: perPage }, (_, i) => {
    const id = (page - 1) * perPage + i + 1;
    const catIdx = id % CATEGORIES.length;
    return {
      id,
      title: `Item #${id} — ${CATEGORIES[catIdx]}`,
      category: CATEGORIES[catIdx],
      color: COLORS[catIdx],
    };
  });
}

const TOTAL_PAGES = 5;

// Set errorPage to a page number (e.g., 3) to simulate an error on that page.
// Set to null for no errors.
let errorPageGlobal: number | null = null;

function fetchPage(page: number): Promise<{ items: Item[]; hasMore: boolean }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (errorPageGlobal !== null && page === errorPageGlobal) {
        reject(new Error(`Server error on page ${page}`));
      } else {
        resolve({
          items: generateItems(page),
          hasMore: page < TOTAL_PAGES,
        });
      }
    }, 800); // 800ms simulated latency
  });
}

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Implement infinite scroll using IntersectionObserver.
//
// Requirements:
//   - Load page 1 on mount
//   - Show a loading indicator while fetching
//   - Render a sentinel <div ref={sentinelRef}> at the bottom
//   - IntersectionObserver watches the sentinel
//   - When sentinel is visible AND !isLoading AND hasMore: load the next page
//   - Append new items (don't replace them)
//   - Disconnect the observer in useEffect cleanup
//   - Show "No more items" when hasMore is false

function InfiniteList_Exercise() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // TODO 1: Implement loadMore
  //   - Guard: if isLoading || !hasMore, return early
  //   - setIsLoading(true)
  //   - fetchPage(page), then append items, update hasMore, setPage(p => p + 1)
  //   - setIsLoading(false) in finally
  const loadMore = useCallback(async () => {
    // TODO 1: implement
    void page;
  }, [isLoading, hasMore, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // TODO 2: Load page 1 on mount
  useEffect(() => {
    // TODO 2: call loadMore() once on mount
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // TODO 3: Set up IntersectionObserver on sentinelRef
  //   - Create the observer in a useEffect
  //   - Observe sentinelRef.current
  //   - When entry.isIntersecting and !isLoading and hasMore: call loadMore()
  //   - Return () => observer.disconnect() from the effect
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // TODO 3: implement IntersectionObserver
    void sentinel;
    void loadMore;
  }, [loadMore, isLoading, hasMore]);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: IntersectionObserver Infinite Scroll</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Scroll the list below. When the sentinel at the bottom becomes visible, the next page loads.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement InfiniteList_Exercise above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>What prevents multiple fetches from firing simultaneously?</li>
          <li>Where exactly do you place the sentinel element?</li>
          <li>What happens to the observer when the component unmounts?</li>
        </ul>
      </div>

      <div style={{ height: '350px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
        {isLoading && <LoadingRow />}
        {!hasMore && items.length > 0 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
            All {items.length} items loaded
          </div>
        )}
        <div ref={sentinelRef} style={{ height: '1px' }} />
      </div>

      <StatusBar items={items} page={page} hasMore={hasMore} isLoading={isLoading} error={null} />
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Add error handling and retry.
//
// New requirements:
//   - Simulate errors: toggle errorPage to a specific page number
//   - On error: show an error message with a "Retry" button
//   - Retry should attempt the SAME page (don't increment page on error)
//   - Reset error state when retry starts

function InfiniteListWithRetry_Exercise() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [errorPage, setErrorPage] = useState<number | null>(null);

  // Keep global in sync
  useEffect(() => {
    errorPageGlobal = errorPage;
  }, [errorPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPage(page);
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(p => p + 1); // Only increment on success
    } catch (err) {
      // TODO 4: Set error state (don't increment page — retry should retry the same page)
      void err;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(entries => {
      // TODO 5: Only fire if: entry.isIntersecting AND !isLoading AND hasMore AND !error
      if (entries[0].isIntersecting && !isLoading && hasMore && !error) {
        loadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isLoading, hasMore, error]);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: Error Handling + Retry</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Set an error page to simulate a failure. Click Retry to re-attempt the same page.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement error state in loadMore above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>Why should page NOT increment on error?</li>
          <li>Should the IntersectionObserver fire when error is set? (Add !error guard)</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.85rem', alignSelf: 'center', color: '#555' }}>Simulate error on page:</span>
        {[null, 2, 3, 4].map(p => (
          <button
            key={String(p)}
            onClick={() => {
              setErrorPage(p);
              setItems([]);
              setPage(1);
              setHasMore(true);
              setError(null);
            }}
            style={{
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: errorPage === p ? '#c62828' : '#ddd',
              background: errorPage === p ? '#ffebee' : '#fff',
              color: errorPage === p ? '#c62828' : '#333',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {p === null ? 'No errors' : `Page ${p}`}
          </button>
        ))}
      </div>

      <div style={{ height: '350px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
        {isLoading && <LoadingRow />}
        {error && (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ color: '#c62828', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</div>
            {/* TODO 6: Add a Retry button that calls loadMore() */}
            <button style={{ padding: '0.4rem 1.25rem', borderRadius: '6px', border: '1px solid #c62828', background: '#c62828', color: '#fff', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}
        {!hasMore && !error && items.length > 0 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
            All {items.length} items loaded
          </div>
        )}
        <div ref={sentinelRef} style={{ height: '1px' }} />
      </div>

      <StatusBar items={items} page={page} hasMore={hasMore} isLoading={isLoading} error={error} />
    </div>
  );
}

// ── Shared UI Components ──────────────────────────────────────
function ItemCard({ item }: { item: Item }) {
  return (
    <div style={{
      padding: '0.75rem 1rem',
      borderBottom: '1px solid #f0f0f0',
      background: item.color,
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <span style={{
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: '#555',
        whiteSpace: 'nowrap',
      }}>
        #{item.id}
      </span>
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#666' }}>{item.category}</div>
      </div>
    </div>
  );
}

function LoadingRow() {
  return (
    <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
      <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #ddd', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatusBar({ items, page, hasMore, isLoading, error }: { items: Item[]; page: number; hasMore: boolean; isLoading: boolean; error: string | null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
      {[
        { label: 'items loaded', value: items.length, color: '#333' },
        { label: 'next page', value: page, color: '#333' },
        { label: 'hasMore', value: String(hasMore), color: hasMore ? '#27ae60' : '#888' },
        { label: 'isLoading', value: String(isLoading), color: isLoading ? '#e67e22' : '#888' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ background: '#f9f9f9', padding: '0.5rem', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#888' }}>{label}</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color }}>{value}</div>
        </div>
      ))}
      {error && (
        <div style={{ gridColumn: '1 / -1', background: '#ffebee', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#c62828' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────

function InfiniteList_Reference() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPage(page);
      setItems(prev => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(p => p + 1); // Only advance on success
    } catch (err) {
      setError((err as Error).message);
      // page stays the same — retry will retry the same page
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page]);

  // Load first page on mount
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observe sentinel — load more when it enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        // Guard: isIntersecting + not loading + more to load + no error
        if (entries[0].isIntersecting && !isLoading && hasMore && !error) {
          loadMore();
        }
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect(); // cleanup: prevent callbacks after unmount
  }, [loadMore, isLoading, hasMore, error]);

  return (
    <div>
      <div style={{ height: '350px', overflowY: 'auto', border: '2px solid #27ae60', borderRadius: '6px' }}>
        {items.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
        {isLoading && <LoadingRow />}
        {error && (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ color: '#c62828', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</div>
            <button
              onClick={() => { setError(null); loadMore(); }}
              style={{ padding: '0.4rem 1.25rem', borderRadius: '6px', border: 'none', background: '#c62828', color: '#fff', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}
        {!hasMore && !error && items.length > 0 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
            All {items.length} items loaded — {TOTAL_PAGES} pages
          </div>
        )}
        {/* Sentinel — always last, invisible, watched by IntersectionObserver */}
        <div ref={sentinelRef} style={{ height: '1px' }} />
      </div>
      <StatusBar items={items} page={page} hasMore={hasMore} isLoading={isLoading} error={error} />
    </div>
  );
}

function ReferenceDemo() {
  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>Full IntersectionObserver Infinite Scroll</h3>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
        Features: IO sentinel, load guard, error/retry, page tracking, cleanup on unmount.
        {' '}<strong>errorPageGlobal is OFF for this demo</strong> — set it in Exercise 2 to test errors.
      </p>
      <InfiniteList_Reference />
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Did you check !isLoading && hasMore before calling loadMore in the IO callback?',
    'Did you place the sentinel AFTER the items and loading indicator?',
    'Did you call observer.disconnect() in the useEffect cleanup?',
    'Does page only increment on successful fetches (not on error)?',
    'Does the Retry button retry the SAME page (page value unchanged)?',
    'Can you explain why IntersectionObserver is better than a scroll event listener?',
    'Can you explain the sentinel pattern and why it\'s better than observing the last item?',
  ];

  return (
    <div style={{ background: '#fffde7', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f9a825' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Interview Checklist</h3>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: '0.9rem' }}>
            <span style={{ fontFamily: 'monospace', color: '#f57f17', marginRight: '0.5rem' }}>□</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Infinite Scroll</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Implement infinite scroll using the IntersectionObserver API.
      Build the basic version first, then add robust error handling and retry.
      Complete both exercises before reading the reference.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <InfiniteList_Exercise />
      <InfiniteListWithRetry_Exercise />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
