// ============================================================
// Topic:   Pagination
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: implement SimplePagination (no ellipsis).
//   3. Exercise 2: implement getPageNumbers (ellipsis algorithm).
//   4. Exercise 3: wire up FullPagination with ARIA.
//   5. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 09-pagination
// ============================================================

import { useState, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// Shared types and data
// ─────────────────────────────────────────────────────────────

interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// 47 items — chosen so the last page has only 2 items (good edge case)
const ALL_ITEMS = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1,
  label: `Item ${i + 1}`,
  category: ['Alpha', 'Beta', 'Gamma'][i % 3],
}));

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Simple Pagination (no ellipsis)
//
// Render all page numbers in a row without any truncation.
// Good for a small number of pages.
//
// TODO:
//   1. Calculate totalPages from totalItems and itemsPerPage.
//   2. Render a Prev button, disabled when currentPage === 1.
//   3. Render a button for each page (1 through totalPages).
//      - Highlight the active page (bold, different background).
//   4. Render a Next button, disabled when currentPage === totalPages.
// ─────────────────────────────────────────────────────────────

function SimplePagination({ totalItems, itemsPerPage, currentPage, onPageChange }: PaginationProps) {
  // TODO: calculate totalPages
  const totalPages = 1; // replace this

  if (totalItems === 0) return <p style={{ color: '#888' }}>No items</p>;

  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
      {/* TODO: Prev button */}
      <button disabled>← Prev</button>

      {/* TODO: page number buttons */}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            background: page === currentPage ? '#3b82f6' : '#fff',
            color: page === currentPage ? '#fff' : '#333',
            cursor: 'pointer',
            fontWeight: page === currentPage ? 700 : 400,
          }}
        >
          {page}
        </button>
      ))}

      {/* TODO: Next button */}
      <button disabled>Next →</button>
    </div>
  );
}

// Demo wrapper for Exercise 1
function SimplePaginationDemo() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const visibleItems = ALL_ITEMS.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
        {visibleItems.map(item => (
          <li
            key={item.id}
            style={{
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.9rem',
            }}
          >
            <span>{item.label}</span>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>{item.category}</span>
          </li>
        ))}
      </ul>
      <SimplePagination
        totalItems={ALL_ITEMS.length}
        itemsPerPage={ITEMS_PER_PAGE}
        currentPage={page}
        onPageChange={setPage}
      />
      <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, ALL_ITEMS.length)} of {ALL_ITEMS.length}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Ellipsis Algorithm
//
// Implement getPageNumbers to produce the truncated page list.
//
// Examples:
//   getPageNumbers(5, 10)  → [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
//   getPageNumbers(2, 10)  → [1, 2, 3, 'ellipsis', 10]
//   getPageNumbers(9, 10)  → [1, 'ellipsis', 8, 9, 10]
//   getPageNumbers(1, 5)   → [1, 2, 3, 4, 5]
//   getPageNumbers(3, 5)   → [1, 2, 3, 4, 5]
//   getPageNumbers(1, 1)   → [1]
//
// Algorithm:
//   1. Build a Set with: 1, totalPages, current-1, current, current+1 (clamped)
//   2. Sort the set into an array
//   3. Walk the array: if gap > 2, insert 'ellipsis'; if gap === 2, insert the missing page
//
// TODO: fill in the function body
// ─────────────────────────────────────────────────────────────

type PageItem = number | 'ellipsis';

function getPageNumbers(current: number, total: number): PageItem[] {
  if (total <= 1) return total === 1 ? [1] : [];

  // TODO: Step 1 — build the set of always-shown pages
  const pageSet = new Set<number>();
  // pageSet.add(1);
  // pageSet.add(total);
  // for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
  //   pageSet.add(i);
  // }

  // TODO: Step 2 — sort
  const sorted = Array.from(pageSet).sort((a, b) => a - b);

  // TODO: Step 3 — insert ellipsis / missing pages
  const result: PageItem[] = [];
  // for (let i = 0; i < sorted.length; i++) {
  //   if (i > 0) {
  //     const gap = sorted[i] - sorted[i - 1];
  //     if (gap === 2) result.push(sorted[i] - 1);
  //     else if (gap > 2) result.push('ellipsis');
  //   }
  //   result.push(sorted[i]);
  // }

  return result;
}

// Quick unit test — run in the browser console or add assertions
function runGetPageNumbersTests() {
  const tests: Array<{ current: number; total: number; expected: PageItem[] }> = [
    { current: 5, total: 10, expected: [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10] },
    { current: 2, total: 10, expected: [1, 2, 3, 'ellipsis', 10] },
    { current: 9, total: 10, expected: [1, 'ellipsis', 8, 9, 10] },
    { current: 1, total: 5,  expected: [1, 2, 3, 4, 5] },
    { current: 3, total: 5,  expected: [1, 2, 3, 4, 5] },
    { current: 1, total: 1,  expected: [1] },
  ];

  let passed = 0;
  tests.forEach(({ current, total, expected }) => {
    const result = getPageNumbers(current, total);
    const ok = JSON.stringify(result) === JSON.stringify(expected);
    if (ok) passed++;
    console.log(
      `${ok ? '✓' : '✗'} getPageNumbers(${current}, ${total})`,
      ok ? '' : `\n  got:      ${JSON.stringify(result)}\n  expected: ${JSON.stringify(expected)}`,
    );
  });
  console.log(`\n${passed}/${tests.length} tests passed`);
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Full Pagination with ARIA
//
// Wire up getPageNumbers into a full pagination component.
// The structure and styling are provided — fill in the TODOs.
// ─────────────────────────────────────────────────────────────

function FullPagination({ totalItems, itemsPerPage, currentPage, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pages = getPageNumbers(currentPage, totalPages);

  const btnStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.75rem',
    borderRadius: '4px',
    border: `1px solid ${active ? '#3b82f6' : '#ddd'}`,
    background: active ? '#3b82f6' : '#fff',
    color: active ? '#fff' : disabled ? '#bbb' : '#333',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: active ? 700 : 400,
    fontSize: '0.9rem',
  });

  return (
    // TODO: wrap in <nav aria-label="Pagination">
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* TODO: Prev button — disabled when currentPage === 1 */}
      <button
        // disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={btnStyle(false, currentPage === 1)}
        aria-label="Previous page"
      >
        ← Prev
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          // TODO: render ellipsis span with aria-hidden="true"
          <span key={`ellipsis-${i}`} style={{ padding: '0 0.4rem', color: '#888' }}>…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            // TODO: add aria-current="page" when this page === currentPage
            style={btnStyle(page === currentPage, false)}
          >
            {page}
          </button>
        )
      )}

      {/* TODO: Next button — disabled when currentPage === totalPages */}
      <button
        // disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={btnStyle(false, currentPage === totalPages)}
        aria-label="Next page"
      >
        Next →
      </button>
    </div>
  );
}

// Demo wrapper for Exercises 2+3
function FullPaginationDemo() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const visibleItems = ALL_ITEMS.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button
          onClick={runGetPageNumbersTests}
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: '#f9f9f9' }}
        >
          Run getPageNumbers tests (check console)
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
        {visibleItems.map(item => (
          <li key={item.id} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>{item.label}</span>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>{item.category}</span>
          </li>
        ))}
      </ul>
      <FullPagination
        totalItems={ALL_ITEMS.length}
        itemsPerPage={ITEMS_PER_PAGE}
        currentPage={page}
        onPageChange={p => setPage(Math.max(1, Math.min(Math.ceil(ALL_ITEMS.length / ITEMS_PER_PAGE), p)))}
      />
      <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, ALL_ITEMS.length)} of {ALL_ITEMS.length}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete pagination with:
//   - Correct getPageNumbers with gap=2 handled
//   - ARIA: nav, aria-current, aria-label on prev/next
//   - Disabled prev/next
//   - Clean derivation of totalPages, start/end index
//   - Edge case: 0 items
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

function refGetPageNumbers(current: number, total: number): PageItem[] {
  if (total <= 0) return [];
  if (total === 1) return [1];

  const pageSet = new Set<number>();
  pageSet.add(1);
  pageSet.add(total);
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
    pageSet.add(i);
  }

  const sorted = Array.from(pageSet).sort((a, b) => a - b);
  const result: PageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap === 2) result.push(sorted[i] - 1); // show missing page instead of '...'
      else if (gap > 2) result.push('ellipsis');
    }
    result.push(sorted[i]);
  }
  return result;
}

function ReferencePagination({ totalItems, itemsPerPage, currentPage, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pages = refGetPageNumbers(currentPage, totalPages);

  const activeStyle: React.CSSProperties = {
    padding: '0.4rem 0.75rem', borderRadius: '4px',
    border: '1px solid #3b82f6', background: '#3b82f6', color: '#fff',
    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
  };
  const inactiveStyle: React.CSSProperties = {
    padding: '0.4rem 0.75rem', borderRadius: '4px',
    border: '1px solid #ddd', background: '#fff', color: '#333',
    fontWeight: 400, fontSize: '0.9rem', cursor: 'pointer',
  };
  const disabledStyle: React.CSSProperties = {
    ...inactiveStyle, color: '#bbb', cursor: 'not-allowed',
  };

  return (
    <nav aria-label="Pagination" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={currentPage === 1 ? disabledStyle : inactiveStyle}
        aria-label="Previous page"
      >
        ← Prev
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} aria-hidden="true" style={{ padding: '0 0.4rem', color: '#888' }}>
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
            style={page === currentPage ? activeStyle : inactiveStyle}
          >
            {page}
          </button>
        )
      )}

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={currentPage === totalPages ? disabledStyle : inactiveStyle}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}

function ReferencePaginationDemo() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(ALL_ITEMS.length / ITEMS_PER_PAGE);
  const visibleItems = ALL_ITEMS.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const safePage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)));

  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
        {visibleItems.map(item => (
          <li key={item.id} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span>{item.label}</span>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>{item.category}</span>
          </li>
        ))}
      </ul>
      <ReferencePagination
        totalItems={ALL_ITEMS.length}
        itemsPerPage={ITEMS_PER_PAGE}
        currentPage={page}
        onPageChange={safePage}
      />
      <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, ALL_ITEMS.length)} of {ALL_ITEMS.length} • Page {page} of {totalPages}
      </p>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Pagination</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Build pagination from scratch — first without ellipsis, then with the full ellipsis algorithm.
      47 items at 5 per page = 10 pages, which exercises all ellipsis cases.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — Simple Pagination (All Pages, No Ellipsis)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in the TODOs: totalPages calculation, active page highlight, disabled Prev/Next.
          Don't worry about ellipsis yet — show all 10 page buttons.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <SimplePaginationDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Prev should be disabled on page 1. Next should be disabled on page 10.
          Active page should be visually distinct. Items should update when you navigate.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2+3 — Ellipsis Algorithm + ARIA</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Implement <code>getPageNumbers</code> and wire it into <code>FullPagination</code>.
          Click the test button to verify your algorithm against the expected outputs.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <FullPaginationDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key test cases to verify manually:</strong>
          Navigate to page 5 — should see <code>[1, ..., 4, 5, 6, ..., 10]</code>.
          Navigate to page 2 — should see <code>[1, 2, 3, ..., 10]</code>.
          Navigate to page 9 — should see <code>[1, ..., 8, 9, 10]</code>.
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Complete solution with correct ellipsis algorithm, ARIA, and all edge cases handled.
          Read this only after attempting the exercises.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <ReferencePaginationDemo />
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Gap of exactly 2: insert the missing page number, not an ellipsis</li>
            <li><code>aria-current="page"</code> on the active page button</li>
            <li>Real <code>disabled</code> attribute (not just styling) on Prev/Next</li>
            <li>Ellipsis spans have <code>aria-hidden="true"</code></li>
            <li>Unique keys: <code>ellipsis-{'{i}'}</code> not <code>ellipsis</code></li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
