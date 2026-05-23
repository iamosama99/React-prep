// ============================================================
// Topic:   shouldComponentUpdate
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz or: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState, useContext, createContext } from 'react';

// ─── Shared styles ────────────────────────────────────────────
const S = {
  box:    { border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' },
  btn:    { margin: '0 6px 6px 0', padding: '4px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  note:   { fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' },
  count:  { fontWeight: 'bold', color: '#c55', fontSize: '1.1rem' },
  red:    { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#e55', color: '#fff', marginRight: 6 },
  green:  { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#5a5', color: '#fff', marginRight: 6 },
  yellow: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#b80', color: '#fff', marginRight: 6 },
};

// ─── Exercise 1 — Implement shouldComponentUpdate ─────────────
//
// Scenario: A product grid lives inside a page that also tracks a "theme" preference.
// The grid only cares about `products` — it should not re-render when only `theme` changes.
//
// The render count badges below tell you exactly how many times each component rendered.
// Without SCU, the grid re-renders every time the parent does (including theme changes).
//
// Your tasks:
//   [ ] Implement shouldComponentUpdate in ProductGridOptimized so it ONLY re-renders
//       when this.props.products has changed (reference comparison).
//       Return true to allow the render, false to skip it.
//
//   [ ] After implementing: click "Change theme" → optimized grid should NOT re-render.
//       Click "Update products" → both grids re-render (data actually changed).
//
// Questions to think through:
//   Q: What does React skip entirely when SCU returns false?
//      (hint: render, getSnapshotBeforeUpdate, componentDidUpdate are all skipped)
//   Q: Why is reference comparison (!==/===) enough here? When would it be wrong?

// ❌ No SCU — re-renders on every parent update
class ProductGrid extends React.Component {
  renderCount = 0;

  render() {
    this.renderCount++;
    return (
      <div style={{ ...S.box, borderColor: '#f99' }}>
        <span style={S.red}>No SCU</span>
        <span> render count: </span>
        <span style={S.count}>{this.renderCount}</span>
        <ul style={{ margin: '8px 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
          {this.props.products.map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <p style={S.note}>Theme: {this.props.theme} (this component shouldn't care)</p>
      </div>
    );
  }
}

// ✅ With SCU — TODO: implement shouldComponentUpdate
class ProductGridOptimized extends React.Component {
  renderCount = 0;

  shouldComponentUpdate(nextProps) {
    // TODO: return true only when products reference changed.
    //
    // return nextProps.products !== this.props.products;
    return true; // ← change this
  }

  render() {
    this.renderCount++;
    return (
      <div style={{ ...S.box, borderColor: '#8c8' }}>
        <span style={S.green}>With SCU</span>
        <span> render count: </span>
        <span style={S.count}>{this.renderCount}</span>
        <ul style={{ margin: '8px 0', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
          {this.props.products.map(p => <li key={p.id}>{p.name}</li>)}
        </ul>
        <p style={S.note}>Theme: {this.props.theme} (after fix, theme changes don't increment count)</p>
      </div>
    );
  }
}

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Widget A' },
  { id: 2, name: 'Widget B' },
  { id: 3, name: 'Widget C' },
];

function Exercise1() {
  const [theme, setTheme]       = useState('light');
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [updateCount, setUpdateCount] = useState(0);

  const changeTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const updateProducts = () => {
    setUpdateCount(c => c + 1);
    setProducts([
      ...INITIAL_PRODUCTS,
      { id: 10 + updateCount, name: `New Product ${updateCount + 1}` },
    ]);
  };

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button style={S.btn} onClick={changeTheme}>🎨 Change theme ({theme})</button>
        <button style={S.btn} onClick={updateProducts}>📦 Update products</button>
      </div>
      <ProductGrid          products={products} theme={theme} />
      <ProductGridOptimized products={products} theme={theme} />
    </div>
  );
}

// ─── Exercise 2 — The mutable state trap ──────────────────────
//
// shouldComponentUpdate relies on reference equality (===) to detect changes.
// If you mutate state directly instead of replacing it, the reference stays the same —
// SCU sees "no change" and silently skips the render even though data changed.
//
// The two buttons below use two different update strategies on the same component.
// One makes the list grow visually. The other doesn't — even though the data was "updated".
//
// Your tasks:
//   [ ] Read BOTH update handlers. Identify which one mutates, which one replaces.
//   [ ] Predict what happens before you click. Then click both buttons to verify.
//   [ ] Fix the MUTATE button so it produces a new array reference (immutable update).
//
// Rule: SCU (and PureComponent) REQUIRE immutability to work correctly.
//       Mutation isn't a style preference — it breaks correctness.

class TodoList extends React.Component {
  shouldComponentUpdate(nextProps) {
    // Correct SCU — only re-render when the todos reference changes
    return nextProps.todos !== this.props.todos;
  }

  render() {
    return (
      <div style={S.box}>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
          {this.props.todos.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <p style={S.note}>List has {this.props.todos.length} items</p>
      </div>
    );
  }
}

function Exercise2() {
  const [todos, setTodos] = useState(['Buy milk', 'Walk the dog']);

  const addImmutable = () => {
    // ✅ Creates a new array → new reference → SCU sees the change → re-renders
    setTodos(prev => [...prev, `Task ${prev.length + 1}`]);
  };

  const addMutant = () => {
    // ❌ Mutates the existing array → same reference → SCU returns false → no re-render!
    //    The data changed but the UI is frozen. This is a silent bug.
    setTodos(prev => {
      prev.push(`Task ${prev.length + 1}`); // mutation! ← fix this
      return prev;                           // same reference returned
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button style={S.btn} onClick={addImmutable}>✅ Add (immutable)</button>
        <button style={S.btn} onClick={addMutant}>❌ Add (mutate — broken)</button>
        <button style={S.btn} onClick={() => setTodos(['Buy milk', 'Walk the dog'])}>Reset</button>
      </div>
      <TodoList todos={todos} />
      <p style={S.note}>
        Click ❌ a few times — nothing happens in the UI. Fix <code>addMutant</code> by
        returning <code>{'[...prev, newItem]'}</code> instead of mutating.
      </p>
    </div>
  );
}

// ─── Exercise 3 — Precision SCU vs PureComponent ──────────────
//
// PureComponent does a shallow comparison of ALL props.
// Manual SCU lets you be selective — skip props that don't affect the output.
//
// Scenario: A DataTable receives `data`, `theme`, `className`, and `onRowClick`.
// Only `data` changes affect what's rendered. The others are stable or irrelevant.
//
// PureComponent: compares all 4 props → re-renders when any one changes.
// Manual SCU:    only compares `data` → skips re-renders for theme/className/onRowClick changes.
//
// Your tasks:
//   [ ] Implement shouldComponentUpdate in DataTableSCU to only watch `data`.
//   [ ] Click each button and compare render counts between the two versions.
//
// When would precision SCU beat PureComponent?
//   When a prop changes frequently but doesn't affect render output.
//   Example: an `onRowClick` function reference that changes every parent render
//   but PureComponent keeps re-rendering because it sees a new function reference.

class DataTablePure extends React.PureComponent {
  renderCount = 0;

  render() {
    this.renderCount++;
    return (
      <div style={{ ...S.box, borderColor: '#aaf' }}>
        <span style={{ ...S.yellow, background: '#77c' }}>PureComponent</span>
        <span> renders: </span><span style={S.count}>{this.renderCount}</span>
        <table style={{ width: '100%', marginTop: 8, fontSize: '0.85rem', borderCollapse: 'collapse' }}>
          <tbody>
            {this.props.data.map(row => (
              <tr key={row.id} onClick={() => this.props.onRowClick(row.id)}
                style={{ cursor: 'pointer' }}>
                <td style={{ padding: '2px 8px', borderBottom: '1px solid #eee' }}>{row.name}</td>
                <td style={{ padding: '2px 8px', borderBottom: '1px solid #eee', color: '#888' }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

class DataTableSCU extends React.Component {
  renderCount = 0;

  shouldComponentUpdate(nextProps) {
    // TODO: Only re-render when data reference changes.
    // Ignore changes to theme, className, onRowClick.
    //
    // return nextProps.data !== this.props.data;
    return true; // ← change this
  }

  render() {
    this.renderCount++;
    return (
      <div style={{ ...S.box, borderColor: '#5a5' }}>
        <span style={S.green}>Manual SCU (precision)</span>
        <span> renders: </span><span style={S.count}>{this.renderCount}</span>
        <table style={{ width: '100%', marginTop: 8, fontSize: '0.85rem', borderCollapse: 'collapse' }}>
          <tbody>
            {this.props.data.map(row => (
              <tr key={row.id} onClick={() => this.props.onRowClick(row.id)}
                style={{ cursor: 'pointer' }}>
                <td style={{ padding: '2px 8px', borderBottom: '1px solid #eee' }}>{row.name}</td>
                <td style={{ padding: '2px 8px', borderBottom: '1px solid #eee', color: '#888' }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

const ROWS = [
  { id: 1, name: 'Row Alpha',   value: 100 },
  { id: 2, name: 'Row Beta',    value: 200 },
  { id: 3, name: 'Row Gamma',   value: 300 },
];

function Exercise3() {
  const [data, setData]         = useState(ROWS);
  const [theme, setTheme]       = useState('light');
  const [className, setClass]   = useState('table');
  // Simulate a callback that changes reference every time (common real-world scenario)
  const [tick, setTick]         = useState(0);

  // This creates a new function reference on every parent render
  const handleRowClick = (id) => console.log('Row clicked:', id);

  return (
    <div>
      <div style={{ marginBottom: '0.75rem' }}>
        <button style={S.btn} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
          Change theme (irrelevant)
        </button>
        <button style={S.btn} onClick={() => setClass(c => c + '!')}>
          Change className (irrelevant)
        </button>
        <button style={S.btn} onClick={() => setTick(t => t + 1)}>
          Force parent re-render (onRowClick ref changes)
        </button>
        <button style={S.btn} onClick={() => setData(d => [...d, { id: d.length + 1, name: `Row ${d.length + 1}`, value: d.length * 100 }])}>
          Add data row (relevant)
        </button>
      </div>
      <p style={S.note}>
        PureComponent compares all props — including the new function ref for onRowClick.
        Manual SCU only watches data → ignores the noisy props.
      </p>
      <DataTablePure data={data} theme={theme} className={className} onRowClick={handleRowClick} />
      <DataTableSCU  data={data} theme={theme} className={className} onRowClick={handleRowClick} />
    </div>
  );
}

// ─── Playground — Context bypasses shouldComponentUpdate ──────
//
// This is a critical gotcha: if a component consumes a context value,
// context updates trigger a re-render regardless of what SCU returns.
// SCU only guards against prop- and state-driven re-renders.
//
// Observe:
//   [ ] Change the theme using the context button → the SCU component re-renders anyway
//   [ ] Then click "Change irrelevant prop" → SCU correctly blocks that one
//
// Key insight: memo/SCU ≠ immunity from ALL renders. Context always gets through.

const ThemeContext = createContext('light');

class ThemedWidget extends React.Component {
  static contextType = ThemeContext;
  renderCount = 0;

  shouldComponentUpdate(nextProps) {
    // Tries to block re-renders when only theme changes via prop
    const willUpdate = nextProps.data !== this.props.data;
    console.log(`SCU called → ${willUpdate ? 'render' : 'skip'}`);
    return willUpdate;
  }

  render() {
    this.renderCount++;
    return (
      <div style={{ ...S.box, background: this.context === 'dark' ? '#333' : '#fafafa',
                    color: this.context === 'dark' ? '#eee' : '#222' }}>
        <p>Theme from context: <strong>{this.context}</strong></p>
        <p>Data: <strong>{this.props.data}</strong></p>
        <p style={S.note}>Renders: {this.renderCount} — SCU cannot block context updates</p>
      </div>
    );
  }
}

function Playground() {
  const [theme, setTheme]     = useState('light');
  const [data, setData]       = useState('version 1');
  const [noise, setNoise]     = useState(0);

  return (
    <ThemeContext.Provider value={theme}>
      <div>
        <button style={S.btn} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
          Toggle context theme
        </button>
        <button style={S.btn} onClick={() => setData(d => d === 'version 1' ? 'version 2' : 'version 1')}>
          Change data (SCU allows)
        </button>
        <button style={S.btn} onClick={() => setNoise(n => n + 1)}>
          Change irrelevant prop (noise: {noise})
        </button>
        <ThemedWidget data={data} noise={noise} />
        <p style={S.note}>
          Changing the context theme re-renders even though SCU tries to block it.
          Check DevTools console for the SCU decision log.
        </p>
      </div>
    </ThemeContext.Provider>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 800 }}>
      <h1>shouldComponentUpdate</h1>

      <h2>Exercise 1 — Implement SCU</h2>
      <p style={S.note}>
        Implement <code>shouldComponentUpdate</code> in <code>ProductGridOptimized</code>.
        After the fix, "Change theme" should not increment its render count.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — The mutable state trap</h2>
      <p style={S.note}>
        Click "Add (mutate — broken)" and notice nothing changes in the list.
        Fix the mutation so SCU can detect the change.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Precision SCU vs PureComponent</h2>
      <p style={S.note}>
        PureComponent re-renders when any prop changes (including the function ref).
        Precision SCU only watches <code>data</code>.
      </p>
      <Exercise3 />

      <h2>Playground — Context bypasses SCU</h2>
      <Playground />
    </div>
  );
}
