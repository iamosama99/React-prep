// ============================================================
// Topic:   Autocomplete / Typeahead
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement basic autocomplete (click only, no ARIA, no keyboard).
//   3. Exercise 2: Add keyboard navigation and full ARIA combobox pattern.
//   4. Compare your solution against the Reference Implementation below.
//
// Run: npm run tutorial 04-autocomplete-typeahead
// ============================================================

import { useState, useEffect, useRef, useMemo, useCallback, FC } from 'react';

// ── Dataset ───────────────────────────────────────────────────
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
  'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada',
  'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
  'Denmark', 'Egypt', 'Ethiopia', 'Finland', 'France',
  'Germany', 'Ghana', 'Greece', 'Hungary', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Japan', 'Jordan', 'Kenya', 'South Korea',
  'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Romania', 'Russia', 'Saudi Arabia',
  'South Africa', 'Spain', 'Sweden', 'Switzerland', 'Thailand',
  'Turkey', 'Ukraine', 'United Kingdom', 'United States', 'Vietnam',
];

const MAX_RESULTS = 8;

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Basic autocomplete — filter + click to select.
// No keyboard navigation. No ARIA. No click-outside.
//
// Requirements:
//   - Input controls query state
//   - Filter COUNTRIES (case-insensitive) on query
//   - Show dropdown when query is non-empty and matches exist
//   - Click an item to select it, set query to the selected value, close dropdown
//   - Clear button (×) resets query and selected
//   - Limit results to MAX_RESULTS items

function BasicAutocomplete() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // TODO 1: Compute filtered items (case-insensitive, limit to MAX_RESULTS)
  const filtered: string[] = []; // Replace with your implementation

  // TODO 2: Open dropdown when query is non-empty and filtered.length > 0

  function selectItem(item: string) {
    // TODO 3: Set query to item, set selected, close dropdown
    void item;
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    // TODO 4: Update query, open dropdown if results exist
    void e;
  }

  function clearInput() {
    // TODO 5: Reset query, selected, close dropdown
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: Basic Autocomplete</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Type a country name. Click a result to select it. No keyboard nav yet.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement BasicAutocomplete above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>What is the filtering logic? (toLowerCase + includes)</li>
          <li>When should the dropdown open vs. close?</li>
          <li>Why does clicking a list item sometimes close the dropdown before the click registers?</li>
        </ul>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={handleInputChange}
            placeholder="Type a country..."
            style={{
              width: '100%',
              padding: '0.6rem 2rem 0.6rem 0.75rem',
              fontSize: '1rem',
              boxSizing: 'border-box',
              borderRadius: '6px',
              border: '1px solid #ccc',
            }}
          />
          {query && (
            <button
              onClick={clearInput}
              style={{
                position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.1rem', padding: '0.25rem',
              }}
              aria-label="Clear"
            >
              ×
            </button>
          )}
        </div>

        {isOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', border: '1px solid #ccc', borderTop: 'none',
            borderRadius: '0 0 6px 6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100, maxHeight: '250px', overflowY: 'auto',
          }}>
            {/* TODO 6: Render filtered items. Each item is a <div> that calls selectItem on click */}
            {filtered.length === 0 && (
              <div style={{ padding: '0.75rem 1rem', color: '#999', fontSize: '0.9rem' }}>No results</div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ marginTop: '1rem', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem', color: '#2e7d32' }}>
          Selected: <strong>{selected}</strong>
        </div>
      )}
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Add keyboard navigation and full ARIA combobox pattern.
//
// Requirements:
//   - ArrowDown/Up: move activeIndex (wrap around)
//   - Enter: select the active item
//   - Escape: close dropdown, reset activeIndex to -1
//   - Click outside (mousedown on document) to close
//   - ARIA: role="combobox", aria-expanded, aria-haspopup="listbox", aria-activedescendant
//   - ARIA: role="listbox" on list, role="option" aria-selected on each item
//   - Use onMouseDown (not onClick) on items to avoid losing focus
//
// Also add: highlighted text (matching portion wrapped in <mark>)

function HighlightedText({ text, query }: { text: string; query: string }) {
  // TODO 7: Split text into [before, match, after] based on query
  //         Wrap the matching part in <mark> with yellow highlight
  //         Handle case where query is empty or not found
  return <span>{text}</span>; // Replace with your implementation
}

function AccessibleAutocomplete() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(
    () => COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_RESULTS),
    [query]
  );

  // TODO 8: Add click-outside handler using mousedown on document
  //         Check !containerRef.current?.contains(e.target as Node) before closing

  function selectItem(item: string) {
    setQuery(item);
    setSelected(item);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        // TODO 9: Move activeIndex down, wrap at end
        e.preventDefault();
        break;
      case 'ArrowUp':
        // TODO 10: Move activeIndex up, wrap at start
        e.preventDefault();
        break;
      case 'Enter':
        // TODO 11: If activeIndex >= 0, select filtered[activeIndex]
        e.preventDefault();
        break;
      case 'Escape':
        // TODO 12: Close dropdown, reset activeIndex
        break;
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: Accessible Autocomplete</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Keyboard navigation (↑↓ Enter Escape) + ARIA combobox pattern + click outside to close.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — complete the TODOs in AccessibleAutocomplete</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>Why use onMouseDown instead of onClick on list items?</li>
          <li>What is aria-activedescendant used for?</li>
          <li>Reset activeIndex when query changes — or the arrow keys point to wrong items.</li>
        </ul>
      </div>

      <div ref={containerRef} style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          // TODO 13: Add role="combobox", aria-expanded, aria-haspopup="listbox",
          //           aria-autocomplete="list", aria-controls, aria-activedescendant
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length > 0);
            setActiveIndex(-1); // Reset on query change
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a country (keyboard navigation enabled)..."
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem',
            fontSize: '1rem',
            boxSizing: 'border-box',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        />

        {isOpen && filtered.length > 0 && (
          <ul
            ref={listRef}
            // TODO 14: Add role="listbox", id="autocomplete-list"
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', border: '1px solid #ccc', borderTop: 'none',
              borderRadius: '0 0 6px 6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100, maxHeight: '250px', overflowY: 'auto',
              margin: 0, padding: 0, listStyle: 'none',
            }}
          >
            {filtered.map((item, i) => (
              <li
                key={item}
                id={`option-${i}`}
                // TODO 15: Add role="option", aria-selected
                onMouseDown={e => {
                  e.preventDefault(); // Prevent input blur
                  selectItem(item);
                }}
                style={{
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  background: i === activeIndex ? '#e3f2fd' : '#fff',
                  borderBottom: '1px solid #f5f5f5',
                  fontSize: '0.9rem',
                }}
              >
                <HighlightedText text={item} query={query} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div style={{ marginTop: '1rem', padding: '0.6rem 1rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem', color: '#2e7d32' }}>
          Selected: <strong>{selected}</strong>
        </div>
      )}
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────

function HighlightedText_Ref({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const idx = lower.indexOf(queryLower);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff176', padding: 0 }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

function Autocomplete_Reference() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(
    () => COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_RESULTS),
    [query]
  );

  const selectItem = useCallback((item: string) => {
    setQuery(item);
    setSelected(item);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => (i + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0) selectItem(filtered[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const listId = 'ref-autocomplete-list';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `ref-option-${activeIndex}` : undefined}
          value={query}
          onChange={e => {
            const val = e.target.value;
            setQuery(val);
            setIsOpen(val.length > 0);
            setActiveIndex(-1);
            if (val === '') setSelected(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a country..."
          style={{
            width: '100%',
            padding: '0.6rem 2rem 0.6rem 0.75rem',
            fontSize: '1rem',
            boxSizing: 'border-box',
            borderRadius: '6px',
            border: '2px solid #27ae60',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSelected(null); setIsOpen(false); inputRef.current?.focus(); }}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '1.1rem' }}
            aria-label="Clear"
          >×</button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', border: '2px solid #27ae60', borderTop: 'none',
            borderRadius: '0 0 6px 6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100, maxHeight: '250px', overflowY: 'auto',
            margin: 0, padding: 0, listStyle: 'none',
          }}
        >
          {filtered.map((item, i) => (
            <li
              key={item}
              id={`ref-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={e => { e.preventDefault(); selectItem(item); }}
              style={{
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                background: i === activeIndex ? '#e8f5e9' : '#fff',
                borderBottom: '1px solid #f5f5f5',
                fontSize: '0.9rem',
              }}
            >
              <HighlightedText_Ref text={item} query={query} />
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#e8f5e9', borderRadius: '6px', fontSize: '0.9rem', color: '#2e7d32' }}>
          Selected: <strong>{selected}</strong>
        </div>
      )}
    </div>
  );
}

function ReferenceDemo() {
  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>Full Accessible Autocomplete</h3>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
        Features: keyboard navigation, ARIA combobox, click-outside, text highlighting, clear button.
        Try: type "un", use ↑↓ arrows, press Enter, press Escape.
      </p>
      <Autocomplete_Reference />
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Did you reset activeIndex when the query changes?',
    'Did you use onMouseDown (not onClick) on list items to prevent input blur?',
    'Did you add aria-expanded, aria-haspopup, aria-autocomplete to the input?',
    'Did you add aria-activedescendant pointing to the active option\'s id?',
    'Did you add role="listbox" and role="option" to list elements?',
    'Does ArrowDown on the last item wrap to the first? ArrowUp on first → last?',
    'Did you handle click-outside using mousedown on document?',
    'Did you highlight the matching text in each result?',
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
    <h1>Autocomplete / Typeahead</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Build a complete autocomplete component from scratch.
      Start with click-only filtering, then add keyboard navigation and ARIA.
      Complete both exercises before reading the reference.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <BasicAutocomplete />
      <AccessibleAutocomplete />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
