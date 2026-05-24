// ============================================================
// Topic:   URL State vs Component State
// Phase:   7 — Routing
//
// HOW TO RUN:
//   npm run tutorial url-state-vs-component-state
//
// APPROACH: Side-by-side comparison exercises.
//   This topic is about JUDGMENT — knowing which bucket state belongs in.
//   Each exercise isolates one decision point and lets you observe
//   the concrete consequence of choosing wrong.
//
//   Exercise 1 — The refresh test: component state resets, URL state survives.
//   Exercise 2 — Two-state pattern: draft (component) → committed (URL).
//   Exercise 3 — The modal dilemma: when component state is fine
//                vs when URL state is the right call.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  MemoryRouter,
  Routes, Route,
  Link, NavLink, useSearchParams, useLocation, useNavigate,
} from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// The 3-question test (keep this in mind throughout):
//
//   1. Should a refreshed page look the same?
//      If YES → URL state.
//   2. Can/should this be shared via URL?
//      If YES → URL state.
//   3. Does the back button have meaningful behavior here?
//      If YES → URL state.
//
//   If all three are NO → component state.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Exercise 1 — The refresh test: URL state survives, component state doesn't
//
// Same product filter UI, two implementations:
//   Version A — filters in component state (useState)
//   Version B — filters in URL search params (useSearchParams)
//
// "Simulate Refresh" clears component state (component unmounts
// and remounts, losing all useState) but preserves URL state
// (the URL stays the same → useSearchParams() reads it on remount).
//
// OBSERVE:
//   1. In both panels: set category=shoes, sort=price.
//   2. Click "Simulate Refresh".
//   3. Version A resets to defaults — filter is gone.
//   4. Version B keeps the filters — URL preserved the state.
//
// Additional consequence: sharing.
//   Copy the URL from Version B — it includes ?category=shoes&sort=price.
//   A colleague opens it and sees the same filtered view.
//   Version A's filters are invisible to the URL — not shareable.
//
// CHECK YOURSELF:
//   A user sets a filter, navigates to a product detail page, and presses Back.
//   In Version A: what do they see? In Version B?
//   A: filters reset (component unmounted). B: filters restored (URL intact).
// ─────────────────────────────────────────────────────────────

const PRODUCTS = [
  { id: 1, name: 'Air Max',    category: 'shoes',       price: 120 },
  { id: 2, name: 'Running Pro',category: 'shoes',       price: 85  },
  { id: 3, name: 'Cotton Tee', category: 'clothing',    price: 29  },
  { id: 4, name: 'Smart Watch',category: 'electronics', price: 249 },
  { id: 5, name: 'Canvas High',category: 'shoes',       price: 65  },
];

const CATS  = ['all', 'shoes', 'clothing', 'electronics'];
const SORTS = ['name', 'price'];

// Version A: filters in component state (useState)
function FilterPanelStateVersion({ label, color }) {
  const [category, setCategory] = useState('all');
  const [sort, setSort]         = useState('name');

  const filtered = PRODUCTS
    .filter(p => category === 'all' || p.category === category)
    .sort((a, b) => sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name));

  return (
    <div style={{ ...s.panel, borderColor: color }}>
      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 8 }}>{label}</div>

      <div style={{ marginBottom: 8 }}>
        <div style={s.label}>Category</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ ...s.btn, background: category === c ? color : '#e2e8f0', color: category === c ? '#fff' : '#1e293b' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={s.label}>Sort</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {SORTS.map(so => (
            <button key={so} onClick={() => setSort(so)}
              style={{ ...s.btn, background: sort === so ? color : '#e2e8f0', color: sort === so ? '#fff' : '#1e293b' }}>
              {so}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        State: category={category}, sort={sort}
        <br />
        (Not in URL — won't survive "refresh")
      </div>

      {filtered.map(p => (
        <div key={p.id} style={s.card}>{p.name} — ${p.price}</div>
      ))}
    </div>
  );
}

// Version B: filters in URL search params
function FilterPanelURLVersion({ label, color }) {
  const [params, setParams] = useSearchParams({ category: 'all', sort: 'name' });
  const { pathname, search } = useLocation();

  const category = params.get('category') ?? 'all';
  const sort      = params.get('sort')     ?? 'name';

  function setFilter(key, val) {
    setParams(prev => { prev.set(key, val); return prev; }, { replace: true });
  }

  const filtered = PRODUCTS
    .filter(p => category === 'all' || p.category === category)
    .sort((a, b) => sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name));

  return (
    <div style={{ ...s.panel, borderColor: color }}>
      <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 8 }}>{label}</div>

      <div style={{ marginBottom: 8 }}>
        <div style={s.label}>Category</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setFilter('category', c)}
              style={{ ...s.btn, background: category === c ? color : '#e2e8f0', color: category === c ? '#fff' : '#1e293b' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={s.label}>Sort</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {SORTS.map(so => (
            <button key={so} onClick={() => setFilter('sort', so)}
              style={{ ...s.btn, background: sort === so ? color : '#e2e8f0', color: sort === so ? '#fff' : '#1e293b' }}>
              {so}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', marginBottom: 6, background: '#f1f5f9', padding: '3px 6px', borderRadius: 3 }}>
        URL: {pathname}{search}
      </div>

      {filtered.map(p => (
        <div key={p.id} style={s.card}>{p.name} — ${p.price}</div>
      ))}
    </div>
  );
}

function Exercise1() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <MemoryRouter initialEntries={['/?category=all&sort=name']} initialIndex={0}>
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          style={{ ...s.btn, background: '#f59e0b', color: '#fff', fontWeight: 600 }}
        >
          🔄 Simulate Refresh (remounts components, URL stays)
        </button>
        <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>
          Set filters in both panels first, then click
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* key prop forces full remount on "refresh" — simulates page reload */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <FilterPanelStateVersion
            key={`state-${refreshKey}`}
            label="VERSION A — filters in useState (resets on refresh)"
            color="#ef4444"
          />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <FilterPanelURLVersion
            key={`url-${refreshKey}`}
            label="VERSION B — filters in useSearchParams (survives refresh)"
            color="#22c55e"
          />
        </div>
      </div>
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Two-state pattern: draft in component, committed in URL
//
// Problem with committing every keystroke to the URL:
//   Each setSearchParams() call is a navigation event.
//   Typing "shoes" = 5 history entries. User presses Back 5 times.
//
// Solution: two-state pattern
//   inputValue → component state  (draft, updates on every keystroke)
//   q param    → URL state        (committed, updates only on submit)
//
// Initialize from URL on mount so refresh/back restores the last search.
//
// OBSERVE:
//   1. Type in the search box — URL doesn't change.
//   2. Press Enter — URL updates, product list filters.
//   3. Clear the input — URL clears (X button).
//   4. Toggle "Every keystroke → URL" to see the bad pattern:
//      type slowly and watch the URL change on every character.
//      Press Back many times — each character is a history entry.
//
// CHECK YOURSELF:
//   After submitting a search, should setSearchParams use push or replace?
//   Answer: push — a new search is a meaningful history entry the user
//   might want to Back to (their previous search).
// ─────────────────────────────────────────────────────────────

function SearchBar() {
  const [params, setParams] = useSearchParams();
  const committedQuery = params.get('q') ?? '';

  // Draft lives in component state — NOT committed to URL on every keystroke
  const [inputValue, setInputValue] = useState(committedQuery);
  const [eagerMode, setEagerMode]   = useState(false);

  // Sync draft when the URL query changes from outside (e.g. Back button)
  useEffect(() => {
    setInputValue(committedQuery);
  }, [committedQuery]);

  function commitSearch(val) {
    // push → new history entry so Back restores the previous search
    setParams(prev => { prev.set('q', val); prev.set('page', '1'); return prev; });
  }

  function handleChange(e) {
    const val = e.target.value;
    setInputValue(val);
    if (eagerMode) {
      // ❌ BAD: every keystroke = history entry
      commitSearch(val);
    }
    // ✅ GOOD (default): URL unchanged until Enter
  }

  function handleSubmit(e) {
    e.preventDefault();
    commitSearch(inputValue);
  }

  const filteredProducts = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(committedQuery.toLowerCase())
  );

  const { search } = useLocation();

  return (
    <div>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={eagerMode} onChange={e => setEagerMode(e.target.checked)} />
        <span style={{ color: eagerMode ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
          {eagerMode
            ? '❌ Eager mode: every keystroke updates the URL (history spam!)'
            : '✅ Two-state pattern: draft in state, committed to URL on Enter'}
        </span>
      </label>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={inputValue}
          onChange={handleChange}
          placeholder="Search products… (press Enter)"
          style={{ flex: 1, ...s.inputField }}
        />
        <button type="submit" style={{ ...s.btn, background: '#3b82f6', color: '#fff' }}>Search</button>
        {inputValue && (
          <button type="button" onClick={() => { setInputValue(''); commitSearch(''); }}
            style={{ ...s.btn, color: '#ef4444' }}>✕</button>
        )}
      </form>

      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: 3, marginBottom: 8 }}>
        URL: {search || '(no params)'}
        {'  ·  '}
        Input draft: "{inputValue}"
        {'  ·  '}
        Committed: "{committedQuery}"
      </div>

      <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
        {eagerMode
          ? '⚠️ Type slowly — each character pushes a history entry. Back through them.'
          : 'Type as fast as you want — URL only updates on Enter.'}
      </div>

      {filteredProducts.map(p => (
        <div key={p.id} style={s.card}>{p.name} — ${p.price} ({p.category})</div>
      ))}
    </div>
  );
}

function Exercise2() {
  return (
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <SearchBar />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — The modal dilemma: two approaches, two trade-offs
//
// SCENARIO: A product list with a detail modal.
//
// Version A — Modal as component state:
//   ✅ Simple — one useState(null)
//   ✅ Back button doesn't close the modal (expected behavior for most modals)
//   ❌ Can't deep-link to "product X modal open"
//   ❌ Sharing the URL shares a closed-modal view
//   USE FOR: confirmations, alerts, menus, secondary actions
//
// Version B — Modal as URL state (?modal=id):
//   ✅ Back button closes the modal (browser history is meaningful)
//   ✅ URL is shareable — colleague opens /products?modal=1 and sees the modal
//   ✅ Refresh keeps the modal open
//   ❌ More code — URL management
//   USE FOR: detail views, editing, actions the user would want to share/bookmark
//
// OBSERVE:
//   Toggle between versions. In both: open a modal, then click Back
//   (the ← Back button in the demo).
//   Version A: Back does nothing to the modal (it's component state).
//   Version B: Back closes the modal (the URL param is gone from history).
//
//   Also: in Version B, notice the URL changes when the modal opens.
//   You could copy/paste that URL and share the modal state.
//
// CHECK YOURSELF:
//   A "Delete Confirmation" dialog — should it be URL state or component state?
//   Answer: component state — you don't want to share or bookmark a delete dialog.
//           The back button navigating away from a delete confirm is also confusing.
// ─────────────────────────────────────────────────────────────

function VersionAModal({ product, onClose }) {
  if (!product) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>📦 {product.name}</div>
        <div style={{ fontSize: 13, color: '#555' }}>
          <div>Category: {product.category}</div>
          <div>Price: ${product.price}</div>
          <div style={{ marginTop: 8, color: '#ef4444', fontSize: 12 }}>
            Not in URL — Back button won't close this. Not shareable.
          </div>
        </div>
        <button onClick={onClose} style={{ ...s.btn, marginTop: 12 }}>Close</button>
      </div>
    </div>
  );
}

function ProductListVersionA() {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 12, color: '#ef4444', background: '#fff1f2', padding: '4px 8px', borderRadius: 4, marginBottom: 8 }}>
        Modal in component state — back button does nothing to it
      </div>
      {PRODUCTS.map(p => (
        <div key={p.id} style={{ ...s.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          onClick={() => setSelectedProduct(p)}>
          <span>{p.name}</span>
          <span style={{ color: '#3b82f6', fontSize: 12 }}>View →</span>
        </div>
      ))}
      <VersionAModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}

function ProductListVersionB() {
  const [params, setParams]   = useSearchParams();
  const navigate              = useNavigate();
  const selectedId            = params.get('modal') ? Number(params.get('modal')) : null;
  const selectedProduct       = PRODUCTS.find(p => p.id === selectedId) ?? null;
  const { pathname, search }  = useLocation();

  function openModal(product) {
    // push → closing with Back is meaningful
    setParams(prev => { prev.set('modal', String(product.id)); return prev; });
  }

  function closeModal() {
    setParams(prev => { prev.delete('modal'); return prev; }, { replace: true });
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#22c55e', background: '#f0fdf4', padding: '4px 8px', borderRadius: 4, marginBottom: 4 }}>
        Modal in URL — back button closes it. URL is shareable.
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '3px 6px', borderRadius: 3, marginBottom: 8 }}>
        {pathname}{search || '(no params)'}
      </div>
      {PRODUCTS.map(p => (
        <div key={p.id} style={{ ...s.card, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          onClick={() => openModal(p)}>
          <span>{p.name}</span>
          <span style={{ color: '#3b82f6', fontSize: 12 }}>View →</span>
        </div>
      ))}
      {selectedProduct && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>📦 {selectedProduct.name}</div>
            <div style={{ fontSize: 13, color: '#555' }}>
              <div>Category: {selectedProduct.category}</div>
              <div>Price: ${selectedProduct.price}</div>
              <div style={{ marginTop: 8, color: '#22c55e', fontSize: 12 }}>
                In URL — Back closes this. URL is shareable.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={closeModal} style={s.btn}>Close</button>
              <button onClick={() => navigate(-1)} style={s.btn}>← Back (closes via history)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Exercise3() {
  const [version, setVersion] = useState('A');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['A', 'B'].map(v => (
          <button key={v} onClick={() => setVersion(v)}
            style={{ ...s.btn, background: version === v ? '#3b82f6' : '#e2e8f0', color: version === v ? '#fff' : '#1e293b' }}>
            Version {v}: {v === 'A' ? 'component state' : 'URL state'}
          </button>
        ))}
      </div>

      <MemoryRouter
        key={version} // Reset router when switching versions
        initialEntries={['/']}
        initialIndex={0}
      >
        {version === 'A' ? <ProductListVersionA /> : <ProductListVersionB />}
      </MemoryRouter>

      <div style={{ marginTop: 12, fontSize: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '8px 10px' }}>
        <strong>Decision guide:</strong>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'left' }}>State type</th>
              <th style={s.th}>Refresh?</th>
              <th style={s.th}>Share?</th>
              <th style={s.th}>Back?</th>
              <th style={s.th}>Storage</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Filters/sort/page', '✅', '✅', '✅', 'URL (searchParams)'],
              ['Current route/id', '✅', '✅', '✅', 'URL (path param)'],
              ['Detail modal (shareable)', '✅', '✅', '✅', 'URL (?modal=id)'],
              ['Confirmation dialog', '❌', '❌', '❌', 'useState'],
              ['Hover / focus / tooltip', '❌', '❌', '❌', 'useState'],
              ['In-progress form draft', '❌', '❌', '❌', 'useState'],
            ].map(([type, refresh, share, back, store]) => (
              <tr key={type}>
                <td style={s.td}>{type}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{refresh}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{share}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{back}</td>
                <td style={{ ...s.td, color: store.startsWith('URL') ? '#059669' : '#3b82f6' }}>{store}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a data table with these pieces, each in the right state location:
//   • Column sort: click header to sort — URL state (shareable, back-button)
//   • Column visibility: checkboxes to show/hide columns — localStorage (persists,
//     but not shareable) — this is a THIRD option between component and URL state
//   • Row hover highlight: component state (ephemeral)
//   • "Are you sure?" delete confirm: component state (not shareable)
//   • Selected rows for bulk action: component state (session-only interaction)
//   • Pagination: URL state (back button, shareable page link)
//
// The interesting question: column visibility. Why NOT URL state?
//   It's a personal preference, not a view of the data. Sharing a URL
//   with hidden columns forces your preference on the recipient.
//   localStorage persists the user's own preference without polluting the URL.
function Playground() {
  return (
    <div style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>
      Build a data table with column sort (URL), column visibility (localStorage),
      row hover (component state), delete confirm (component state),
      and pagination (URL). Notice each storage location is chosen for different reasons.
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────
const s = {
  panel:      { border: '2px solid', borderRadius: 6, padding: 10, marginBottom: 8 },
  card:       { background: '#f8fafc', borderRadius: 4, padding: '6px 10px', border: '1px solid #e2e8f0', marginBottom: 4, fontSize: 13 },
  btn:        { padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 12 },
  label:      { fontSize: 12, color: '#64748b', marginBottom: 4 },
  inputField: { padding: '5px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 13, display: 'block' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:      { background: '#fff', borderRadius: 8, padding: 20, minWidth: 260, maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  td:         { padding: '4px 8px', borderBottom: '1px solid #e2e8f0', fontSize: 12 },
  th:         { padding: '4px 8px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, background: '#f8fafc' },
};

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 680 }}>
      <h1 style={t.h1}>URL State vs Component State</h1>
      <p style={t.meta}>
        The three-question test: refresh? share? back button? All YES = URL. All NO = component state.
        Edge cases need judgment.
      </p>

      <h2 style={t.h2}>Exercise 1 — The refresh test: side-by-side comparison</h2>
      <Exercise1 />

      <h2 style={t.h2}>Exercise 2 — Two-state pattern: draft in component, committed in URL</h2>
      <Exercise2 />

      <h2 style={t.h2}>Exercise 3 — The modal dilemma: when each approach wins</h2>
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
