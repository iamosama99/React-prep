// ============================================================
// Topic:   Keyboard Navigation
// Phase:   13 — Tooling, Security, A11y
// File:    tutorial.tsx
//
// Exercise type: LIVE INTERACTIVE DEMOS + QUIZ + PATTERN COMPARISON
//
// Run: npm run tutorial 09-keyboard-navigation
// ============================================================

import { useState, useRef, useEffect, useCallback, Fragment, FC } from 'react';

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Roving Tabindex Live Demo
//
// A fully working keyboard-navigable menu using the roving tabindex
// pattern. Arrow Up/Down, Home/End, Tab to exit.
// State inspector shows which items have tabIndex={0} vs -1.
// ─────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  'New File',
  'Open File',
  'Save',
  'Save As',
  'Print',
  'Export PDF',
];

function Exercise1_RovingTabindex() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastAction, setLastAction] = useState('Tab into the menu to start');
  const [hasFocus, setHasFocus] = useState(false);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveTo = useCallback((index: number, reason: string) => {
    setActiveIndex(index);
    setLastAction(reason);
    itemRefs.current[index]?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = (index + 1) % MENU_ITEMS.length;
        moveTo(next, `ArrowDown → moved to index ${next} ("${MENU_ITEMS[next]}")`);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = (index - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
        moveTo(prev, `ArrowUp → moved to index ${prev} ("${MENU_ITEMS[prev]}")`);
        break;
      }
      case 'Home': {
        e.preventDefault();
        moveTo(0, `Home → jumped to first item ("${MENU_ITEMS[0]}")`);
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = MENU_ITEMS.length - 1;
        moveTo(last, `End → jumped to last item ("${MENU_ITEMS[last]}")`);
        break;
      }
      case 'Tab': {
        // Tab exits the widget — do NOT prevent default
        setLastAction('Tab pressed → exited menu (focus moved to next element)');
        break;
      }
    }
  }

  const tabIndexValues = MENU_ITEMS.map((_, i) => (i === activeIndex ? 0 : -1));

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 1: Roving Tabindex Live Demo</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        This is a fully keyboard-navigable menu using the roving tabindex pattern.
        Tab into the menu, then use Arrow Down/Up to navigate, Home/End to jump,
        and Tab to exit. Watch the state inspector update in real time.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Why does only the active item have tabIndex={'{0}'}? Why not all of them?</li>
          <li>A menu with 20 items: how many Tab presses to exit? (roving vs not)</li>
          <li>Why must ArrowDown call e.preventDefault()? What does the browser do otherwise?</li>
          <li>When the menu first receives Tab focus, which item should be active?</li>
        </ol>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* The menu */}
        <div>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.82rem', color: '#777' }}>
            Tab here to enter the menu below
          </div>
          <ul
            role="menu"
            aria-label="File menu"
            style={{ listStyle: 'none', padding: 0, margin: 0, border: '2px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
          >
            {MENU_ITEMS.map((item, index) => (
              <li key={item} role="none">
                <button
                  role="menuitem"
                  ref={el => { itemRefs.current[index] = el; }}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onKeyDown={e => handleKeyDown(e, index)}
                  onFocus={() => { setActiveIndex(index); setLastAction(`Focused "${item}" (index ${index})`); }}
                  onClick={() => setLastAction(`Clicked "${item}"`)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.6rem 1rem',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: '1px solid #f0f0f0',
                    background: index === activeIndex && hasFocus ? '#e8f0fe' : '#fff',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#333',
                    fontFamily: 'system-ui',
                    outline: index === activeIndex && hasFocus ? '2px solid #1a73e8' : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#777' }}>
            Tab here to exit →&nbsp;
            <button style={{ fontSize: '0.82rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
              Next focusable element
            </button>
          </div>
        </div>

        {/* State inspector */}
        <div>
          <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '1rem', fontSize: '0.82rem', fontFamily: 'monospace', color: '#d4d4d4' }}>
            <div style={{ color: '#9cdcfe', marginBottom: '0.5rem' }}>// State inspector</div>
            <div>activeIndex: <span style={{ color: '#ce9178' }}>{activeIndex}</span></div>
            <div style={{ marginTop: '0.5rem', color: '#9cdcfe' }}>// tabIndex values</div>
            {MENU_ITEMS.map((item, i) => (
              <div key={item} style={{ color: tabIndexValues[i] === 0 ? '#4ec9b0' : '#858585' }}>
                [{i}] {item.padEnd(12)} tabIndex=<span style={{ color: tabIndexValues[i] === 0 ? '#4ec9b0' : '#ce9178' }}>{tabIndexValues[i]}</span>
                {tabIndexValues[i] === 0 && <span style={{ color: '#dcdcaa' }}> ← active</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '0.75rem', background: '#f0f4ff', border: '1px solid #c5cae9', borderRadius: '6px', padding: '0.6rem 0.75rem', fontSize: '0.82rem' }}>
            <strong>Last action:</strong> {lastAction}
          </div>

          <div style={{ marginTop: '0.75rem', background: '#fafafa', borderRadius: '6px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#555', border: '1px solid #eee' }}>
            <strong>Keyboard shortcuts:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', marginTop: '0.25rem' }}>
              {[['↓ Arrow Down', 'Next item'], ['↑ Arrow Up', 'Prev item'], ['Home', 'First item'], ['End', 'Last item'], ['Tab', 'Exit menu']].map(([key, desc]) => (
                <div key={key} style={{ display: 'contents' }}>
                  <span style={{ fontFamily: 'monospace', color: '#1a73e8' }}>{key}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Widget Keyboard Interaction Map Quiz
//
// A table: 5 widgets x 3 behaviors. Click rows to reveal.
// ─────────────────────────────────────────────────────────────

interface WidgetRow {
  widget: string;
  tabBehavior: string;
  arrowBehavior: string;
  escapeBehavior: string;
  why: string;
}

const WIDGET_MAP: WidgetRow[] = [
  {
    widget: 'Modal / Dialog',
    tabBehavior: 'Cycles within modal (trapped)',
    arrowBehavior: 'Not applicable (not a composite widget)',
    escapeBehavior: 'Closes dialog, returns focus to trigger',
    why: 'Modals are focus-trapped containers. Arrow keys don\'t navigate between the dialog\'s interactive elements — Tab does.',
  },
  {
    widget: 'Menu (dropdown)',
    tabBehavior: 'Exits the menu entirely',
    arrowBehavior: 'Up/Down moves between menu items',
    escapeBehavior: 'Closes menu, returns focus to trigger button',
    why: 'Arrow keys navigate the list; Tab is intentionally "exit." This avoids forcing users to arrow through every item to leave.',
  },
  {
    widget: 'Tablist',
    tabBehavior: 'Exits the tablist to the tabpanel',
    arrowBehavior: 'Left/Right moves between tabs (roving tabindex)',
    escapeBehavior: 'No specific behavior (tabs stay open)',
    why: 'Horizontal widget → left/right arrows. Tab moves to the selected panel content, not the next tab — because the tablist is one focusable unit.',
  },
  {
    widget: 'Listbox (select)',
    tabBehavior: 'Exits the listbox',
    arrowBehavior: 'Up/Down navigates options',
    escapeBehavior: 'Closes listbox (if expandable), reverts selection',
    why: 'Same pattern as Menu but for selection. Options wrap at boundaries. Enter selects. Space also selects in some implementations.',
  },
  {
    widget: 'Toolbar',
    tabBehavior: 'Exits the toolbar',
    arrowBehavior: 'Left/Right between toolbar controls',
    escapeBehavior: 'Not required (toolbar stays visible)',
    why: 'Toolbars are horizontal — left/right arrows, like a tablist. Tab moves past the entire toolbar as a single focusable group.',
  },
];

function Exercise2_WidgetKeyboardMap() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const allRevealed = WIDGET_MAP.every(row => revealed[row.widget]);

  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 2: Widget Keyboard Interaction Map</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        For each widget, think about the keyboard behavior before revealing.
        The pattern is consistent: Tab exits, arrows navigate within, Escape closes overlays.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong> Cover the answers and say aloud what Tab,
        Arrow, and Escape do for each widget. The key question: why do menus use arrow keys
        instead of Tab for item navigation?
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#e8eaf6' }}>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #c5cae9', minWidth: '120px' }}>Widget</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #c5cae9' }}>Tab behavior</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #c5cae9' }}>Arrow key behavior</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #c5cae9' }}>Escape behavior</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', borderBottom: '2px solid #c5cae9', minWidth: '80px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {WIDGET_MAP.map((row, i) => (
              <Fragment key={row.widget}>
                <tr style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#333', verticalAlign: 'top' }}>{row.widget}</td>
                  {revealed[row.widget] ? (
                    <>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#333', verticalAlign: 'top' }}>{row.tabBehavior}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#333', verticalAlign: 'top' }}>{row.arrowBehavior}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#333', verticalAlign: 'top' }}>{row.escapeBehavior}</td>
                    </>
                  ) : (
                    <>
                      {[0, 1, 2].map(j => (
                        <td key={j} style={{ padding: '0.6rem 0.75rem', color: '#ccc', fontStyle: 'italic', verticalAlign: 'top' }}>
                          — think first —
                        </td>
                      ))}
                    </>
                  )}
                  <td style={{ padding: '0.6rem 0.75rem', verticalAlign: 'top' }}>
                    {!revealed[row.widget] && (
                      <button
                        onClick={() => setRevealed(prev => ({ ...prev, [row.widget]: true }))}
                        style={{ padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #1a73e8', background: '#e8f0fe', color: '#1a73e8', cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      >
                        Reveal →
                      </button>
                    )}
                  </td>
                </tr>
                {revealed[row.widget] && (
                  <tr key={`${row.widget}-why`} style={{ background: '#f0fff4', borderBottom: '1px solid #c8e6c9' }}>
                    <td colSpan={5} style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#2e7d32', fontStyle: 'italic' }}>
                      <strong>Why:</strong> {row.why}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {allRevealed && (
        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.85rem', color: '#1b5e20' }}>
          <strong>The pattern:</strong> Tab navigates between independent interactive elements.
          Arrow keys navigate within composite widgets. Escape dismisses overlays.
          This prevents users from Tab-ping through every item in a 20-item menu — one Tab to enter, arrows to navigate, one Tab to exit.
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 3 — Escape-to-Close + Focus Return Pattern
//
// A working dropdown menu. Opens on click/Enter/Space.
// Closes on Escape (returns focus to trigger).
// Also closes on click outside.
// Plus: a "broken" version without Escape handling.
// ─────────────────────────────────────────────────────────────

const DROPDOWN_OPTIONS = ['Edit', 'Duplicate', 'Archive', 'Delete'];

function WorkingDropdown({ broken = false }: { broken?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setFocusedIndex(0);
    setTimeout(() => optionRefs.current[0]?.focus(), 0);
  }, []);

  // Escape to close — the broken version skips this
  useEffect(() => {
    if (!isOpen || broken) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, broken]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  function handleMenuKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = (index + 1) % DROPDOWN_OPTIONS.length;
        setFocusedIndex(next);
        optionRefs.current[next]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = (index - 1 + DROPDOWN_OPTIONS.length) % DROPDOWN_OPTIONS.length;
        setFocusedIndex(prev);
        optionRefs.current[prev]?.focus();
        break;
      }
    }
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      isOpen ? close() : open();
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        onClick={() => isOpen ? close() : open()}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          border: '2px solid',
          borderColor: broken ? '#e74c3c' : '#1a73e8',
          background: broken ? '#fff5f5' : '#e8f0fe',
          color: broken ? '#e74c3c' : '#1a73e8',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}
      >
        Actions {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          aria-label="Item actions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            listStyle: 'none',
            padding: '4px 0',
            margin: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 100,
            minWidth: '140px',
          }}
        >
          {DROPDOWN_OPTIONS.map((opt, i) => (
            <li key={opt} role="none">
              <button
                role="menuitem"
                ref={el => { optionRefs.current[i] = el; }}
                tabIndex={focusedIndex === i ? 0 : -1}
                onClick={() => { setSelectedAction(opt); close(); }}
                onKeyDown={e => handleMenuKeyDown(e, i)}
                onFocus={() => setFocusedIndex(i)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.45rem 0.9rem',
                  border: 'none',
                  background: focusedIndex === i ? '#e8f0fe' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'system-ui',
                  fontSize: '0.9rem',
                  color: opt === 'Delete' ? '#e74c3c' : '#333',
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}

      {broken && isOpen && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#c62828', whiteSpace: 'nowrap', zIndex: 101 }}>
          Press Escape... nothing happens. Keyboard user is trapped.
        </div>
      )}

      {selectedAction && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#555' }}>
          Last action: <strong>{selectedAction}</strong>
        </div>
      )}
    </div>
  );
}

function Exercise3_EscapeToClose() {
  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 3: Escape-to-Close + Focus Return</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Any overlay must close on Escape. Focus must return to the trigger.
        Compare the broken version (no Escape) with the fixed version.
        Open each, navigate with arrow keys, then press Escape.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ border: '2px solid #e74c3c', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e74c3c', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Broken — no Escape handling
          </div>
          <WorkingDropdown broken />
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#c62828', lineHeight: 1.5 }}>
            <strong>What's broken:</strong> Escape does nothing. User must click elsewhere or Tab blindly.
            Keyboard users can become trapped in overlays without Escape.
          </div>
        </div>

        <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#27ae60', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Fixed — Escape closes + focus returns
          </div>
          <WorkingDropdown />
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#2e7d32', lineHeight: 1.5 }}>
            <strong>What's correct:</strong> Escape closes menu AND returns focus to trigger.
            Arrow keys navigate. Click outside also closes.
          </div>
        </div>
      </div>

      <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#d4d4d4', marginBottom: '1rem' }}>
        <div style={{ color: '#9cdcfe' }}>{`// Escape handler pattern`}</div>
        <div>{`useEffect(() => {`}</div>
        <div>{`  if (!isOpen) return;`}</div>
        <div>{`  function handleKeyDown(e: KeyboardEvent) {`}</div>
        <div>{`    if (e.key === 'Escape') { e.preventDefault(); close(); }`}</div>
        <div>{`  }`}</div>
        <div>{`  document.addEventListener('keydown', handleKeyDown);`}</div>
        <div>{`  return () => document.removeEventListener('keydown', handleKeyDown);`}</div>
        <div>{`}, [isOpen, close]);`}</div>
        <div style={{ color: '#6a9955', marginTop: '0.5rem' }}>{`// close() calls triggerRef.current?.focus() — focus RETURNS to trigger`}</div>
      </div>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Why must the Escape listener be on document, not the menu element?</li>
          <li>After closing the menu, why return focus to the trigger specifically?</li>
          <li>The trigger uses aria-haspopup="menu". What does this tell screen readers?</li>
          <li>What happens to the event listener when isOpen becomes false?</li>
        </ol>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// EXERCISE 4 — DOM vs Visual Order Trap Demo
//
// Two versions: broken (CSS row-reverse, DOM != visual)
// and fixed (DOM reordered to match visual).
// Tab through each and see the tab stop numbers.
// ─────────────────────────────────────────────────────────────

const TOOLBAR_BUTTONS = [
  { id: 'bold', label: 'Bold', icon: 'B' },
  { id: 'italic', label: 'Italic', icon: 'I' },
  { id: 'underline', label: 'Underline', icon: 'U' },
  { id: 'link', label: 'Link', icon: '⎘' },
  { id: 'image', label: 'Image', icon: '⬜' },
];

function VisualOrderDemo({ broken }: { broken: boolean }) {
  const [focused, setFocused] = useState<string | null>(null);
  const [tabLog, setTabLog] = useState<string[]>([]);
  const counterRef = useRef(0);

  // Broken: DOM is B-I-U-⎘-⬜ (natural order), CSS reverses display to ⬜-⎘-U-I-B
  // Fixed: DOM is ⬜-⎘-U-I-B (reversed), CSS reverses display back to ⬜-⎘-U-I-B (correct!)
  const domButtons = broken
    ? [...TOOLBAR_BUTTONS]
    : [...TOOLBAR_BUTTONS].reverse();

  function getDomOrder(id: string) {
    return broken
      ? TOOLBAR_BUTTONS.findIndex(b => b.id === id) + 1
      : TOOLBAR_BUTTONS.length - TOOLBAR_BUTTONS.findIndex(b => b.id === id);
  }

  return (
    <div style={{ border: `2px solid ${broken ? '#e74c3c' : '#27ae60'}`, borderRadius: '8px', padding: '1rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: broken ? '#e74c3c' : '#27ae60', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
        {broken ? 'Broken — DOM order differs from visual order' : 'Fixed — DOM order matches visual order'}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'row-reverse', marginBottom: '0.75rem' }}>
        {domButtons.map(btn => (
          <button
            key={btn.id}
            aria-label={btn.label}
            onFocus={() => {
              setFocused(btn.id);
              counterRef.current += 1;
              const stop = counterRef.current;
              setTabLog(prev => [`Tab stop ${stop}: ${btn.label}`, ...prev].slice(0, 5));
            }}
            onBlur={() => setFocused(null)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: focused === btn.id ? '#1a73e8' : '#ddd',
              background: focused === btn.id ? '#e8f0fe' : '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {btn.icon}
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: broken ? '#e74c3c' : '#27ae60',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}>
              {getDomOrder(btn.id)}
            </span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.5rem' }}>
        <strong>Badge = tab stop order.</strong>{' '}
        {broken
          ? 'Visual left-to-right: ⬜⎘UIB — but Tab visits: B(1)→I(2)→U(3)→⎘(4)→⬜(5) — OPPOSITE!'
          : 'Visual left-to-right: ⬜⎘UIB — Tab visits: ⬜(1)→⎘(2)→U(3)→I(4)→B(5) — MATCHES!'}
      </div>

      {tabLog.length > 0 && (
        <div style={{ fontSize: '0.78rem', color: '#555', fontFamily: 'monospace', background: '#f9f9f9', borderRadius: '4px', padding: '0.4rem 0.6rem' }}>
          {[...tabLog].reverse().map((entry, i) => (
            <div key={i}>{entry}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Exercise4_DomVsVisualOrder() {
  return (
    <section>
      <h2 style={{ marginBottom: '0.25rem' }}>Exercise 4: DOM vs Visual Order</h2>
      <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Both toolbars use CSS flex-direction: row-reverse. The broken one has DOM left-to-right;
        the fixed one reverses the DOM so Tab order matches the visual. Tab through each — watch
        where focus lands vs what you see.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — answer without looking:</strong>
        <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
          <li>Which WCAG success criterion does mismatched DOM/visual order violate?</li>
          <li>Why is "using CSS order: property" not a fix for the tab order problem?</li>
          <li>Besides flex-direction, name two other CSS techniques that can cause this mismatch.</li>
        </ol>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        <VisualOrderDemo broken />
        <VisualOrderDemo broken={false} />
      </div>

      <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#d4d4d4' }}>
        <div style={{ color: '#6a9955' }}>{`// Broken: CSS reverses visual but DOM stays natural`}</div>
        <div>{`<div style={{ flexDirection: 'row-reverse' }}>`}</div>
        <div>{`  <button>Bold</button>     {/* Tab stop 1 — visually LAST */}`}</div>
        <div>{`  <button>Image</button>    {/* Tab stop 5 — visually FIRST */}`}</div>
        <div>{`</div>`}</div>
        <br />
        <div style={{ color: '#4ec9b0' }}>{`// Fixed: DOM reversed so Tab order matches visual`}</div>
        <div>{`<div style={{ flexDirection: 'row-reverse' }}>`}</div>
        <div>{`  <button>Image</button>    {/* DOM last → displayed first ✓ Tab stop 1 */}`}</div>
        <div>{`  <button>Bold</button>     {/* DOM first → displayed last ✓ Tab stop 5 */}`}</div>
        <div>{`</div>`}</div>
      </div>

      <div style={{ background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
        <strong>The rule:</strong> If you reorder visually with CSS, reorder the DOM too.
        WCAG 2.1 SC 1.3.2 (Meaningful Sequence) and SC 2.4.3 (Focus Order) require that
        focus order matches the meaningful presentation order.
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Keyboard Navigation</h1>
    <div style={{ background: '#e3f2fd', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
      <strong>Core rules:</strong> Tab moves between independent elements. Arrow keys navigate
      within composite widgets (menus, tablists, toolbars). Escape closes all overlays and returns
      focus to the trigger. Keep DOM order and visual order in sync.
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <Exercise1_RovingTabindex />
      <hr />
      <Exercise2_WidgetKeyboardMap />
      <hr />
      <Exercise3_EscapeToClose />
      <hr />
      <Exercise4_DomVsVisualOrder />
    </div>
  </div>
);

export default App;
