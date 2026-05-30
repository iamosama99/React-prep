// ============================================================
// Topic:   Tabs Component
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md before starting.
//   2. Exercise 1: Implement basic tabs (click only, no ARIA, lazy render).
//   3. Exercise 2: Add full ARIA tablist pattern + keyboard navigation.
//   4. Exercise 3: Explore lazy vs. eager rendering trade-offs.
//   5. Compare your solution against the Reference Implementation below.
//
// Run: npm run tutorial 07-tabs-component
// ============================================================

import { useState, useRef, useEffect, FC } from 'react';

// ── Types ─────────────────────────────────────────────────────
interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

// ── Dataset ───────────────────────────────────────────────────
const DEMO_TABS: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <div>
        <h3 style={{ marginTop: 0 }}>Product Overview</h3>
        <p>This is the overview tab. It contains a summary of the product — key features, target audience, and value proposition.</p>
        <ul>
          <li>Feature A: Fast and reliable</li>
          <li>Feature B: Easy to configure</li>
          <li>Feature C: Great support</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'specs',
    label: 'Specifications',
    content: (
      <div>
        <h3 style={{ marginTop: 0 }}>Technical Specs</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <tbody>
            {[['Dimensions', '10 × 8 × 2 cm'], ['Weight', '240g'], ['Battery', '5000 mAh'], ['Connectivity', 'Wi-Fi 6, Bluetooth 5.2']].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee', fontWeight: 600, color: '#555', width: '40%' }}>{k}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 'reviews',
    label: 'Reviews',
    content: (
      <div>
        <h3 style={{ marginTop: 0 }}>Customer Reviews</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[{ name: 'Alice', rating: 5, text: 'Excellent product! Highly recommended.' }, { name: 'Bob', rating: 4, text: 'Good value for money. Minor issues with setup.' }, { name: 'Carol', rating: 5, text: 'Best in class. Will buy again.' }].map(r => (
            <div key={r.name} style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong>{r.name}</strong>
                <span style={{ color: '#f9a825' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#555' }}>{r.text}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'faq',
    label: 'FAQ',
    content: (
      <div>
        <h3 style={{ marginTop: 0 }}>Frequently Asked Questions</h3>
        {[['Does it come with a warranty?', 'Yes, 2-year manufacturer warranty included.'], ['Is international shipping available?', 'We ship to 50+ countries. Rates vary by location.']].map(([q, a]) => (
          <div key={q} style={{ marginBottom: '1rem' }}>
            <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{q}</p>
            <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>{a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

// ── Exercise 1 ───────────────────────────────────────────────
// Goal: Basic tabs — click to switch, lazy render of active panel.
//
// Requirements:
//   - State: activeId (starts at tabs[0].id)
//   - Tab buttons: clicking sets activeId
//   - Only render the active tab's content (lazy)
//   - Style the active tab differently from inactive tabs
//   - No ARIA, no keyboard navigation yet

function BasicTabs({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);

  return (
    <div>
      {/* TODO 1: Render tab button list */}
      {/* Each button should: set activeId on click, be visually distinct when active */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #eee', marginBottom: '1rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              // TODO 1: setActiveId(tab.id)
              void tab;
            }}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none',
              // TODO 2: Style active vs inactive tabs differently
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TODO 3: Render only the active tab's content (lazy — not all panels) */}
      <div style={{ padding: '0.5rem 0' }}>
        {/* Replace with active tab content */}
        <div style={{ color: '#999', fontSize: '0.9rem' }}>(implement: render active tab content here)</div>
      </div>
    </div>
  );
}

function Exercise1_BasicTabs() {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 1: Basic Tabs</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Click tabs to switch. Only the active panel renders.
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement BasicTabs above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>How do you find the active tab's content? (tabs.find)</li>
          <li>What inline styles distinguish the active tab button from inactive ones?</li>
          <li>After implementing, switch to the Reviews tab and back. Does it reset to top? (lazy behavior)</li>
        </ul>
      </div>

      <BasicTabs tabs={DEMO_TABS} />
    </div>
  );
}

// ── Exercise 2 ───────────────────────────────────────────────
// Goal: Full ARIA tablist pattern + keyboard navigation.
//
// Requirements:
//   - role="tablist" on the tab container div
//   - Each button: role="tab", aria-selected, aria-controls, id
//   - Each panel: role="tabpanel", aria-labelledby, id, tabIndex={0}, hidden attribute
//   - Keyboard: ArrowRight → next tab (wrap), focus it; ArrowLeft → prev tab (wrap)
//   - Keyboard: Home → first tab; End → last tab
//   - Keyboard: Tab moves OUT of tablist into the active panel (don't intercept Tab)
//   - Roving tabindex: active tab gets tabIndex={0}, others get tabIndex={-1}

function AccessibleTabs({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function goToTab(index: number) {
    setActiveId(tabs[index].id);
    // TODO 4: focus tabRefs.current[index] after setting active ID
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const count = tabs.length;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        // TODO 5: Go to (index + 1) % count
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // TODO 6: Go to (index - 1 + count) % count
        break;
      case 'Home':
        e.preventDefault();
        // TODO 7: Go to 0
        break;
      case 'End':
        e.preventDefault();
        // TODO 8: Go to count - 1
        break;
      // Do NOT intercept Tab/Shift+Tab — let them move focus naturally
    }
  }

  return (
    <div>
      <div
        // TODO 9: Add role="tablist", aria-label="Product information"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            // TODO 10: Add role="tab", aria-selected, aria-controls
            // TODO 11: Add tabIndex (0 if active, -1 if not)
            ref={el => { tabRefs.current[i] = el; }}
            onClick={() => setActiveId(tab.id)}
            onKeyDown={e => handleKeyDown(e, i)}
            style={{
              padding: '0.6rem 1.2rem',
              border: 'none',
              borderBottom: activeId === tab.id ? '2px solid #1a73e8' : '2px solid transparent',
              background: 'transparent',
              color: activeId === tab.id ? '#1a73e8' : '#555',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeId === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels — all rendered (eager), hidden when inactive */}
      {tabs.map(tab => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          // TODO 12: Add role="tabpanel", aria-labelledby, tabIndex={0}, hidden
          style={{ padding: '1rem 0.25rem' }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

function Exercise2_AccessibleTabs() {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 2: ARIA Tablist + Keyboard Navigation</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Arrow keys navigate tabs. Tab moves into the panel. All panels are mounted (eager render).
      </p>

      <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>TODO — implement AccessibleTabs above</strong>
        <ul style={{ margin: '0.5rem 0 0', lineHeight: 1.8 }}>
          <li>What is the difference in tabIndex between the active and inactive tabs?</li>
          <li>Why do arrow keys also call .focus()? Isn't setState enough?</li>
          <li>What attribute hides the inactive panels from both visually and from accessibility tree?</li>
        </ul>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#555', margin: '0 0 1rem' }}>
        Keyboard test: focus a tab button → ArrowRight/Left navigate tabs → Tab enters the panel → Shift+Tab returns to the tablist.
      </p>

      <AccessibleTabs tabs={DEMO_TABS} />
    </div>
  );
}

// ── Exercise 3 ───────────────────────────────────────────────
// Goal: Observe the difference between lazy and eager rendering.

function LazyVsEagerDemo() {
  const [mode, setMode] = useState<'lazy' | 'eager'>('lazy');
  const [activeId, setActiveId] = useState(DEMO_TABS[0].id);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [switchCount, setSwitchCount] = useState(0);

  function switchTab(id: string) {
    setActiveId(id);
    setSwitchCount(c => c + 1);
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Exercise 3: Lazy vs. Eager Rendering</h3>
      <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.9rem' }}>
        Type something in an input below, then switch tabs and come back.
        In lazy mode the input resets (unmounted). In eager mode it persists (stays mounted, just hidden).
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['lazy', 'eager'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '0.4rem 1.2rem',
              borderRadius: '6px',
              border: '2px solid',
              borderColor: mode === m ? '#1a73e8' : '#ddd',
              background: mode === m ? '#1a73e8' : '#fff',
              color: mode === m ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: mode === m ? 700 : 400,
              textTransform: 'capitalize',
            }}
          >
            {m} render
          </button>
        ))}
        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center' }}>Tab switches: {switchCount}</span>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #eee', marginBottom: '1rem' }}>
        {DEMO_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderBottom: activeId === tab.id ? '2px solid #1a73e8' : '2px solid transparent',
              background: 'transparent',
              color: activeId === tab.id ? '#1a73e8' : '#555',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: activeId === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: '6px' }}>
        <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '0.4rem' }}>
          Type here (then switch tabs and come back):
        </label>
        {mode === 'lazy' ? (
          // Lazy: only mount active — input resets on remount
          <input
            key={activeId} // Force remount when tab changes to make the reset visible
            value={inputValues[activeId] || ''}
            onChange={e => setInputValues(prev => ({ ...prev, [activeId]: e.target.value }))}
            placeholder={`Input for ${activeId} tab...`}
            style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem' }}
          />
        ) : (
          // Eager: all mounted, only active visible — input state preserved
          DEMO_TABS.map(tab => (
            <input
              key={tab.id}
              hidden={tab.id !== activeId}
              value={inputValues[tab.id] || ''}
              onChange={e => setInputValues(prev => ({ ...prev, [tab.id]: e.target.value }))}
              placeholder={`Input for ${tab.id} tab...`}
              style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '0.9rem', display: tab.id !== activeId ? 'none' : 'block' }}
            />
          ))
        )}
      </div>

      <div style={{ background: '#e3f2fd', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', lineHeight: 1.7 }}>
        <strong>Mode: {mode}</strong>
        <br />
        {mode === 'lazy'
          ? 'Lazy: Only the active panel is mounted. Switching tabs unmounts + remounts the panel — resets all state (scroll, form inputs, running timers). Each render is fresh.'
          : 'Eager: All panels are mounted at once, inactive ones get the hidden attribute. State survives tab switches. Tradeoff: upfront render cost for all panels (use Suspense to defer expensive ones).'}
      </div>
    </div>
  );
}

// ── Reference Implementation ─────────────────────────────────

function AccessibleTabs_Reference({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function goToTab(index: number) {
    if (index < 0 || index >= tabs.length) return;
    setActiveId(tabs[index].id);
    // setState alone doesn't move DOM focus — must call .focus() explicitly
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const count = tabs.length;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        goToTab((index + 1) % count);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        goToTab((index - 1 + count) % count);
        break;
      case 'Home':
        e.preventDefault();
        goToTab(0);
        break;
      case 'End':
        e.preventDefault();
        goToTab(count - 1);
        break;
      // Tab and Shift+Tab: no interception — moves to active panel naturally
    }
  }

  // Update refs array when tabs change
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs]);

  return (
    <div>
      {/* Tablist */}
      <div
        role="tablist"
        aria-label="Product information"
        style={{ display: 'flex', gap: 0, borderBottom: '2px solid #eee' }}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            id={`ref-tab-${tab.id}`}
            role="tab"
            aria-selected={activeId === tab.id}
            aria-controls={`ref-panel-${tab.id}`}
            tabIndex={activeId === tab.id ? 0 : -1}
            ref={el => { tabRefs.current[i] = el; }}
            onClick={() => setActiveId(tab.id)}
            onKeyDown={e => handleKeyDown(e, i)}
            style={{
              padding: '0.6rem 1.25rem',
              border: 'none',
              borderBottom: activeId === tab.id ? '3px solid #27ae60' : '3px solid transparent',
              background: 'transparent',
              color: activeId === tab.id ? '#27ae60' : '#555',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeId === tab.id ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels — all rendered (eager), hidden when inactive */}
      {tabs.map(tab => (
        <div
          key={tab.id}
          id={`ref-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`ref-tab-${tab.id}`}
          tabIndex={0}
          hidden={activeId !== tab.id}
          style={{ padding: '1rem 0.25rem', outline: 'none' }}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

function ReferenceDemo() {
  return (
    <div style={{ border: '2px solid #27ae60', borderRadius: '8px', padding: '1.5rem', background: '#f9fff9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ background: '#27ae60', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>REFERENCE</span>
        <h3 style={{ margin: 0 }}>Full Accessible Tabs</h3>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.9rem' }}>
        Features: role=tablist/tab/tabpanel, aria-selected, aria-controls, aria-labelledby,
        roving tabindex, ArrowLeft/Right/Home/End navigation, Tab into panel.
      </p>
      <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#555' }}>
        Keyboard test: Tab to a tab → ArrowRight cycles tabs + focuses them → Tab enters the panel → Shift+Tab returns to the tablist's active tab.
      </p>
      <AccessibleTabs_Reference tabs={DEMO_TABS} />
    </div>
  );
}

// ── Interview Checklist ───────────────────────────────────────
function InterviewChecklist() {
  const items = [
    'Did you add role="tablist" to the tab button container?',
    'Did you add role="tab", aria-selected, aria-controls, id to each button?',
    'Did you add role="tabpanel", aria-labelledby, id, tabIndex={0} to each panel?',
    'Did you use roving tabindex: tabIndex={0} on active, tabIndex={-1} on others?',
    'Do arrow keys both change activeId AND call .focus() on the new tab?',
    'Did you NOT intercept Tab/Shift+Tab (only arrow keys, Home, End)?',
    'Do you use the hidden attribute (not display:none in CSS) for inactive panels?',
    'Can you explain the trade-off between lazy (unmount) and eager (hidden) rendering?',
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
    <h1>Tabs Component</h1>
    <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
      Build a fully accessible tabs component from scratch.
      Start with basic click-switching, add the ARIA tablist pattern and keyboard navigation,
      then explore lazy vs. eager rendering trade-offs.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Exercise1_BasicTabs />
      <Exercise2_AccessibleTabs />
      <LazyVsEagerDemo />
      <hr style={{ border: 'none', borderTop: '2px dashed #ccc' }} />
      <ReferenceDemo />
      <InterviewChecklist />
    </div>
  </div>
);

export default App;
