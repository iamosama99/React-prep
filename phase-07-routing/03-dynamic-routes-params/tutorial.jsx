// ============================================================
// Topic:   Dynamic Routes & Params
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial dynamic-routes-params
//
// APPROACH: Three progressive exercises.
//   Exercise 1 — useParams with multiple param segments.
//   Exercise 2 — The setSearchParams gotcha (object form vs functional form)
//                shown as a live bug you fix with a toggle.
//   Exercise 3 — Full production filter/sort/search/paginate pattern
//                where every piece of UI state lives in the URL.
// ============================================================

import { useState } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, useParams, useSearchParams, useLocation,
} from 'react-router-dom';

// ─── Shared utilities ─────────────────────────────────────────
function URLBar() {
  const { pathname, search } = useLocation();
  return <div style={s.urlBar}>📍 {pathname}{search}</div>;
}

// ─────────────────────────────────────────────────────────────
// Exercise 1 — useParams: multiple params, type coercion trap
//
// Scenario: GitHub-style repo viewer.
//   /orgs/:orgId/repos/:repoId
//
// useParams() returns ALL params from the matched route tree.
// Child routes inherit ancestor params — both :orgId and :repoId
// are visible in RepoDetail even though it only defines :repoId.
//
// OBSERVE:
//   Click different repos and watch :orgId + :repoId update in the table.
//   Both params are strings — the table shows why that matters.
//
// TODO #1 — String trap:
//   In RepoDetail, both nextIdBad and nextIdGood are shown.
//   Without Number(), adding 1 concatenates the string.
//   For numeric IDs (e.g., /users/:id), always parse before arithmetic.
//
// TODO #2 — Param shadowing:
//   Change both ":orgId" and ":repoId" in the route paths to ":id".
//   Navigate to a repo. Which :id wins in useParams()?
//   The innermost :id shadows the outer — the outer is inaccessible.
//   Fix: use distinct, descriptive param names at each level.
//
// CHECK YOURSELF:
//   URL: /orgs/facebook/repos/react
//   What does useParams() return inside RepoDetail?
//   Answer: { orgId: "facebook", repoId: "react" } — all strings.
// ─────────────────────────────────────────────────────────────

const repos = {
  facebook: ['react', 'jest', 'relay'],
  vercel:   ['next.js', 'swr', 'turborepo'],
};

function OrgList() {
  return (
    <div style={s.panel}>
      <div style={s.panelTitle}>Organizations</div>
      {Object.keys(repos).map(org => (
        <Link key={org} to={`/orgs/${org}`} style={s.listItem}>
          🏢 {org}
        </Link>
      ))}
    </div>
  );
}

function OrgLayout() {
  const { orgId } = useParams();
  return (
    <div style={{ ...s.panel, marginTop: 8 }}>
      <div style={s.panelTitle}>
        <Link to="/orgs" style={s.backLink}>← Orgs</Link>
        {' / '}
        {orgId}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(repos[orgId] ?? []).map(repo => (
          <Link key={repo} to={`/orgs/${orgId}/repos/${repo}`} style={s.chip}>
            📦 {repo}
          </Link>
        ))}
      </div>
    </div>
  );
}

function RepoDetail() {
  // Both params available — React Router accumulates from the full matched tree
  const params = useParams(); // { orgId: "...", repoId: "..." }

  // For demo: pretend repoId is a numeric ID like "42"
  const fakeNumericId = '42';
  const nextIdBad  = fakeNumericId + 1;           // "421" — string concat!
  const nextIdGood = Number(fakeNumericId) + 1;   // 43   — correct

  return (
    <div style={{ ...s.panel, marginTop: 8 }}>
      <div style={s.panelTitle}>
        <Link to={`/orgs/${params.orgId}`} style={s.backLink}>
          ← {params.orgId}
        </Link>
        {' / '}
        📦 {params.repoId}
      </div>

      <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <tr><td style={s.td}>params.orgId</td><td style={s.td}><code>"{params.orgId}"</code></td></tr>
          <tr><td style={s.td}>params.repoId</td><td style={s.td}><code>"{params.repoId}"</code></td></tr>
          <tr><td style={s.td}>typeof params.orgId</td><td style={s.td}><code>"{typeof params.orgId}"</code> ← always string</td></tr>
          <tr style={{ background: '#fff1f2' }}>
            <td style={s.td}>"42" + 1 (❌)</td>
            <td style={s.td}><code>"{nextIdBad}"</code> — string concatenation!</td>
          </tr>
          <tr style={{ background: '#f0fdf4' }}>
            <td style={s.td}>Number("42") + 1 (✅)</td>
            <td style={s.td}><code>{nextIdGood}</code> — parsed first</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Exercise1() {
  return (
    <MemoryRouter initialEntries={['/orgs']} initialIndex={0}>
      <URLBar />
      <Routes>
        <Route path="/orgs" element={<OrgList />} />
        <Route path="/orgs/:orgId" element={<OrgLayout />} />
        {/*
          :repoId defined here; :orgId inherited from the URL match above.
          useParams() inside RepoDetail sees BOTH.
        */}
        <Route path="/orgs/:orgId/repos/:repoId" element={<RepoDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — useSearchParams: the object-form trap
//
// BROKEN (toggle on): setSearchParams({ page: nextPage })
//   Replaces the entire query string. Going from:
//     ?category=shoes&sort=price&page=1
//   to clicking Next Page gives:
//     ?page=2   ← category and sort are gone!
//
// FIXED (toggle off): setSearchParams(prev => { prev.set(...); return prev; })
//   Receives the current URLSearchParams, mutates in-place, returns it.
//   All other params are preserved.
//
// OBSERVE:
//   1. Turn on "Broken mode".
//   2. Click "shoes" category filter — note the URL.
//   3. Click "Next Page" — watch category disappear from the URL.
//   4. Turn off broken mode — Next Page now preserves all params.
//
// TODO:
//   The "Reset All" button uses setParams({}) — object form intentionally.
//   This is one case where you WANT to clear everything. Makes sense?
//
// CHECK YOURSELF:
//   setSearchParams({ page: 2 }) when URL is ?page=1&sort=name&filter=active
//   What is the new URL?
//   Answer: ?page=2 — sort and filter are silently deleted.
// ─────────────────────────────────────────────────────────────

function SearchParamsDemo() {
  const [params, setParams] = useSearchParams({ category: 'all', sort: 'name', page: '1' });
  const [broken, setBroken] = useState(false);

  const category = params.get('category') ?? 'all';
  const sort      = params.get('sort')     ?? 'name';
  const page      = Number(params.get('page') ?? '1');

  function setCategory(cat) {
    if (broken) {
      setParams({ category: cat }); // ❌ drops sort and page
    } else {
      setParams(prev => { prev.set('category', cat); prev.set('page', '1'); return prev; });
    }
  }

  function nextPage() {
    if (broken) {
      setParams({ page: String(page + 1) }); // ❌ drops category and sort
    } else {
      setParams(prev => { prev.set('page', String(page + 1)); return prev; });
    }
  }

  const categories = ['all', 'shoes', 'clothing', 'electronics'];
  const sorts      = ['name', 'price'];

  return (
    <div>
      <URLBar />
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={broken} onChange={e => setBroken(e.target.checked)} />
        <span style={{ color: broken ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
          {broken ? '❌ Broken: setParams(object) — drops other params' : '✅ Fixed: setParams(fn) — preserves other params'}
        </span>
      </label>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={s.label}>Category</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ ...s.btn, background: category === cat ? '#3b82f6' : '#e2e8f0', color: category === cat ? '#fff' : '#1e293b' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={s.label}>Sort</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {sorts.map(so => (
              <button key={so} onClick={() => setParams(prev => { prev.set('sort', so); return prev; })}
                style={{ ...s.btn, background: sort === so ? '#8b5cf6' : '#e2e8f0', color: sort === so ? '#fff' : '#1e293b' }}>
                {so}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setParams(prev => { prev.set('page', String(Math.max(1, page - 1))); return prev; })} style={s.btn} disabled={page <= 1}>←</button>
        <span style={{ fontSize: 13 }}>Page {page}</span>
        <button onClick={nextPage} style={s.btn}>Next Page →</button>
        <button onClick={() => setParams({})} style={{ ...s.btn, marginLeft: 16, color: '#ef4444' }}>Reset all</button>
      </div>

      <p style={{ fontSize: 12, color: '#555', margin: '8px 0 0', background: broken ? '#fff1f2' : '#f0fdf4', padding: '6px 10px', borderRadius: 4 }}>
        {broken
          ? '⚠️ Click a category, then click Next Page. Watch the category param vanish from the URL.'
          : '✅ Click a category, then click Next Page. Category stays in the URL.'}
      </p>
    </div>
  );
}

function Exercise2() {
  return (
    <MemoryRouter initialEntries={['/?category=shoes&sort=price&page=1']} initialIndex={0}>
      <SearchParamsDemo />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Production: full URL-backed filter UI
//
// ALL state lives in the URL:
//   /products?category=shoes&sort=price&q=air&page=2
//
// Push vs replace strategy:
//   filter changes → { replace: true }  (no history entry per click)
//   page changes   → push (default)     (back button restores prev page)
//   search submit  → push               (new search = distinct history entry)
//   reset          → { replace: true }  (clearing is not a "visit")
//
// Two-state pattern for the search input:
//   Draft (keystroke by keystroke) → local component state
//   Committed (on submit)          → URL search params
//
// OBSERVE:
//   1. Apply a filter and change the page — use the back button.
//      You return to the previous PAGE, not the previous filter state.
//   2. Type in the search box — URL stays unchanged until you press Enter.
//   3. Refresh (the MemoryRouter resets, but in a real BrowserRouter
//      the URL would persist and the filters would survive refresh).
//
// CHECK YOURSELF:
//   Why is { replace: true } correct for filter clicks but not page clicks?
// ─────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 1, name: 'Air Max 90',    category: 'shoes',       price: 120 },
  { id: 2, name: 'Running Pro',   category: 'shoes',       price: 85  },
  { id: 3, name: 'Cotton Tee',    category: 'clothing',    price: 29  },
  { id: 4, name: 'Slim Jeans',    category: 'clothing',    price: 69  },
  { id: 5, name: 'Wireless Buds', category: 'electronics', price: 199 },
  { id: 6, name: 'Smart Watch',   category: 'electronics', price: 249 },
  { id: 7, name: 'Canvas High',   category: 'shoes',       price: 65  },
  { id: 8, name: 'Fleece Hoodie', category: 'clothing',    price: 55  },
];

const PAGE_SIZE = 3;

function ProductList() {
  const [params, setParams] = useSearchParams();
  // Draft: typing doesn't update the URL on every keystroke
  const [searchDraft, setSearchDraft] = useState(params.get('q') ?? '');

  const category = params.get('category') ?? 'all';
  const sort      = params.get('sort')     ?? 'name';
  const query     = params.get('q')        ?? '';
  const page      = Math.max(1, Number(params.get('page') ?? '1'));

  // Filter → sort → paginate
  const filtered = MOCK_PRODUCTS
    .filter(p => category === 'all' || p.category === category)
    .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // replace: true → no history entry per filter change
  function setFilter(key, val) {
    setParams(prev => { prev.set(key, val); prev.set('page', '1'); return prev; }, { replace: true });
  }

  // push (default) → back button restores previous page
  function goToPage(p) {
    setParams(prev => { prev.set('page', String(p)); return prev; });
  }

  // Submit → push (new history entry for new search)
  function submitSearch(e) {
    e.preventDefault();
    setParams(prev => { prev.set('q', searchDraft); prev.set('page', '1'); return prev; });
  }

  const categories = ['all', 'shoes', 'clothing', 'electronics'];

  return (
    <div>
      <URLBar />

      {/* Search: draft in state, committed query in URL */}
      <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={searchDraft}
          onChange={e => setSearchDraft(e.target.value)}
          placeholder="Search… (press Enter to commit to URL)"
          style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
        <button type="submit" style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>Search</button>
        {query && (
          <button type="button" onClick={() => { setSearchDraft(''); setParams(prev => { prev.delete('q'); return prev; }, { replace: true }); }}
            style={{ ...s.btn, color: '#ef4444' }}>Clear</button>
        )}
      </form>

      {/* Category + sort */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter('category', cat)}
            style={{ ...s.btn, background: category === cat ? '#3b82f6' : '#e2e8f0', color: category === cat ? '#fff' : '#1e293b' }}>
            {cat}
          </button>
        ))}
        <button onClick={() => setFilter('sort', sort === 'name' ? 'price' : 'name')}
          style={{ ...s.btn, marginLeft: 'auto' }}>
          Sort: {sort} ↕
        </button>
      </div>

      {/* Results */}
      {paged.length === 0
        ? <div style={{ padding: 12, color: '#888', fontSize: 13 }}>No products match.</div>
        : paged.map(p => (
            <div key={p.id} style={{ ...s.card, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{p.name}</span>
              <span style={{ color: '#64748b', fontSize: 13 }}>{p.category}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>${p.price}</span>
            </div>
          ))
      }

      {/* Pagination — push so back restores previous page */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
        <button onClick={() => goToPage(page - 1)} disabled={page <= 1} style={s.btn}>←</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => goToPage(p)}
            style={{ ...s.btn, background: p === page ? '#3b82f6' : '#e2e8f0', color: p === page ? '#fff' : '#1e293b' }}>
            {p}
          </button>
        ))}
        <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} style={s.btn}>→</button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{filtered.length} results</span>
      </div>
    </div>
  );
}

function Exercise3() {
  return (
    <MemoryRouter initialEntries={['/?category=all&sort=name&page=1']} initialIndex={0}>
      <ProductList />
    </MemoryRouter>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Add a wildcard route to Exercise 1's router:
//   /files/*  → FileExplorer that reads useParams()['*']
//   e.g., /files/docs/readme.md → '*' === "docs/readme.md"
//
// Then in Exercise 3: debounce the search update.
// Currently the search only commits on Enter. Change it to also
// commit automatically after 300ms of no typing, using { replace: true }.
// Hint: useEffect + clearTimeout.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      (1) Add /files/* wildcard route to Exercise 1 — display useParams()['*'] in FileExplorer.
      {' '}(2) Add a debounced auto-commit to Exercise 3's search input (300ms, replace: true).
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  urlBar:    { fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', padding: '4px 10px', marginBottom: 8, borderRadius: 4 },
  panel:     { border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 },
  panelTitle:{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 },
  listItem:  { display: 'block', color: '#38bdf8', textDecoration: 'none', padding: '4px 0', fontSize: 14 },
  chip:      { background: '#e2e8f0', borderRadius: 20, padding: '3px 10px', textDecoration: 'none', color: '#1e293b', fontSize: 13 },
  backLink:  { color: '#64748b', textDecoration: 'none', fontSize: 13 },
  btn:       { padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12 },
  label:     { fontSize: 12, color: '#64748b', marginBottom: 4 },
  card:      { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0' },
  td:        { padding: '4px 8px', borderBottom: '1px solid #e2e8f0', fontSize: 13 },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 660 }}>
      <h1 style={t.h1}>Dynamic Routes & Params</h1>
      <p style={t.meta}>
        Exercise 1: useParams — multi-segment, string trap.
        Exercise 2: setSearchParams — object vs functional form.
        Exercise 3: full production filter UI in the URL.
      </p>

      <h2 style={t.h2}>Exercise 1 — useParams: multi-segment params + string-type trap</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — setSearchParams: object form drops params (toggle to see)</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — Production: filter · sort · search · paginate in the URL</h2>
      <Exercise3 />

      <h2 style={t.h2}>Playground</h2>
      <Playground />
    </div>
  );
}

const t = {
  h1:   { fontSize: 20, marginBottom: 4 },
  h2:   { fontSize: 15, marginTop: 28, marginBottom: 6 },
  meta: { color: '#666', fontSize: 13, marginBottom: 20 },
};
