// ============================================================
// Topic:   `this` Binding in Class Methods
// Phase:   3 — Class Components and Legacy
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz or: npm create vite@latest my-app -- --template react
// ============================================================

import React, { useState, useCallback } from 'react';

// ─── Shared styles ────────────────────────────────────────────
const S = {
  box:   { border: '1px solid #ddd', borderRadius: 6, padding: '1rem', marginBottom: '0.75rem', background: '#fafafa' },
  btn:   { margin: '0 6px 6px 0', padding: '4px 12px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc' },
  note:  { fontSize: '0.82rem', color: '#666', marginTop: '0.5rem' },
  count: { fontWeight: 'bold', color: '#c55', fontSize: '1.1rem' },
  red:   { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#e55', color: '#fff', marginRight: 6 },
  green: { display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#5a5', color: '#fff', marginRight: 6 },
  yellow:{ display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#b80', color: '#fff', marginRight: 6 },
  purple:{ display: 'inline-block', padding: '1px 7px', borderRadius: 3, fontSize: '0.75rem', background: '#77c', color: '#fff', marginRight: 6 },
  error: { background: '#fff0f0', border: '1px solid #f99', borderRadius: 6, padding: '0.75rem', fontSize: '0.85rem', color: '#c55' },
};

// ─── Exercise 1 — The problem, then all three solutions ───────
//
// The root cause: JavaScript's `this` is set at CALL TIME by the receiver.
// When you pass `this.handleClick` to an onClick prop, the method is detached
// from the instance. When the browser fires the event, there's no receiver →
// `this` is undefined in strict mode → `this.setState` throws TypeError.
//
// There are exactly three standard solutions. Each works, each has trade-offs.
// This exercise shows the BROKEN version first, then all three fixes.
//
// Your tasks:
//   [ ] Read the broken version. Understand WHY it throws (dynamic `this`).
//   [ ] Implement CounterConstructorBind using Solution 1 (constructor binding).
//   [ ] Implement CounterClassField using Solution 2 (class field arrow function).
//   [ ] CounterInlineArrow is already complete — observe its render count issue in Exercise 2.
//
// Key mental model:
//   Regular method: `this` depends on HOW it's called (dynamic, set at call time)
//   Arrow function: `this` depends on WHERE it's defined (lexical, set at definition time)

// ❌ BROKEN — this is undefined when the button is clicked
class CounterBroken extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    // No binding! When onClick fires, `this` inside handleClick is undefined.
  }

  handleClick() {
    // TypeError: Cannot read properties of undefined (reading 'setState')
    // `this` is undefined here because the method was called without a receiver.
    this.setState(s => ({ count: s.count + 1 }));
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#f99' }}>
        <span style={S.red}>BROKEN</span>
        <p>Count: {this.state.count}</p>
        <button style={S.btn} onClick={this.handleClick}>
          Increment (throws TypeError)
        </button>
        <p style={S.note}>Open DevTools → Console to see the TypeError.</p>
      </div>
    );
  }
}

// ✅ Solution 1 — Constructor binding (.bind in constructor)
// Pros: Explicit. Zero cost per render. No Babel plugins needed.
// Cons: Must manually bind every method. Verbose for many methods.
class CounterConstructorBind extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    // TODO: Bind handleClick so `this` always refers to this instance.
    //
    // this.handleClick = this.handleClick.bind(this);
    //
    // .bind(this) returns a NEW function with `this` permanently set to the instance.
    // By assigning it back to this.handleClick, the instance property shadows
    // the prototype method — the bound version is what onClick receives.
  }

  handleClick() {
    this.setState(s => ({ count: s.count + 1 }));
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#8c8' }}>
        <span style={S.green}>Solution 1: Constructor bind</span>
        <p>Count: {this.state.count}</p>
        <button style={S.btn} onClick={this.handleClick}>Increment</button>
        <p style={S.note}>
          Binding happens once in the constructor. The same bound function reference
          is reused on every render — stable for PureComponent.
        </p>
      </div>
    );
  }
}

// ✅ Solution 2 — Class field arrow function
// Pros: Clean. No explicit bind list. Most common modern pattern.
// Cons: Function lives on the INSTANCE (not prototype). Each instance gets its own copy.
class CounterClassField extends React.Component {
  state = { count: 0 };

  // TODO: Define handleClick as a class field arrow function so `this` is lexically captured.
  //
  // handleClick = () => {
  //   this.setState(s => ({ count: s.count + 1 }));
  // };
  //
  // Arrow functions capture `this` from their surrounding scope at DEFINITION TIME.
  // Since this runs inside the class instance setup, `this` is always the instance.

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#aaf' }}>
        <span style={S.purple}>Solution 2: Class field arrow</span>
        <p>Count: {this.state?.count ?? '???'}</p>
        <button style={S.btn} onClick={this.handleClick}>Increment</button>
        <p style={S.note}>
          Lexically captures `this`. Cleaner than constructor binding.
          handleClick lives on the INSTANCE, not the prototype.
        </p>
      </div>
    );
  }
}

// ✅ Solution 3 — Inline arrow function in JSX (complete — study for Exercise 2)
// Pros: Works. Easy to pass arguments: onClick={() => this.handleClick(item.id)}
// Cons: NEW function created on every render → breaks PureComponent (see Exercise 2)
class CounterInlineArrow extends React.Component {
  state = { count: 0 };

  handleClick() {
    this.setState(s => ({ count: s.count + 1 }));
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#fa5' }}>
        <span style={S.yellow}>Solution 3: Inline arrow (JSX)</span>
        <p>Count: {this.state.count}</p>
        {/* The arrow function wraps handleClick, so `this` inside it is the instance */}
        <button style={S.btn} onClick={() => this.handleClick()}>Increment</button>
        <p style={S.note}>
          New function created on EVERY render. Breaks PureComponent optimization.
          See Exercise 2 for the impact.
        </p>
      </div>
    );
  }
}

function Exercise1() {
  return (
    <div>
      <p style={S.note}>
        Click the BROKEN button first to see the error, then implement Solutions 1 and 2.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <CounterBroken />
        <CounterConstructorBind />
        <CounterClassField />
        <CounterInlineArrow />
      </div>
    </div>
  );
}

// ─── Exercise 2 — Inline arrow breaks PureComponent ───────────
//
// When you pass `onClick={() => this.handleClick()}` to a PureComponent child,
// the child receives a NEW function reference on every parent render.
// PureComponent's shallow comparison sees `prevProps.onClick !== nextProps.onClick`
// (different function objects) and re-renders — defeating the optimization.
//
// This exercise makes the render count VISIBLE so you can see the difference.
//
// Your tasks:
//   [ ] Click "Increment parent noise" (doesn't affect the button label/data).
//     - InlineArrow version: child re-renders every time (render count climbs)
//     - StableRef version: child does NOT re-render (render count stays put)
//   [ ] Understand WHY: stable reference (constructor bind or class field) passes
//       the SAME function object across renders → PureComponent short-circuits.
//
// The rule: if a child uses PureComponent or React.memo, its callbacks must have
// stable references. Inline arrows defeat both.

// The PureComponent child that should be optimized
class ButtonChild extends React.PureComponent {
  renderCount = 0;
  render() {
    this.renderCount++;
    return (
      <div style={{ ...S.box, margin: 0 }}>
        <button style={S.btn} onClick={this.props.onClick}>{this.props.label}</button>
        <p style={{ ...S.note, margin: 0 }}>
          child renders: <span style={S.count}>{this.renderCount}</span>
        </p>
      </div>
    );
  }
}

// ❌ Passes a new inline arrow on every parent render → PureComponent still re-renders
class ParentInlineArrow extends React.Component {
  state = { data: 0, noise: 0 };

  handleDataClick() {
    this.setState(s => ({ data: s.data + 1 }));
  }

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#f99' }}>
        <span style={S.red}>Inline arrow → PureComponent re-renders anyway</span>
        <p style={S.note}>noise: {this.state.noise} | data: {this.state.data}</p>
        <button style={S.btn} onClick={() => this.setState(s => ({ noise: s.noise + 1 }))}>
          Increment parent noise
        </button>
        <ButtonChild
          label={`Data: ${this.state.data}`}
          onClick={() => this.handleDataClick()}  // ← new fn every render
        />
      </div>
    );
  }
}

// ✅ Passes a stable reference → PureComponent correctly skips noise-driven renders
class ParentStableRef extends React.Component {
  state = { data: 0, noise: 0 };

  // Class field arrow — created once per instance, stable reference
  handleDataClick = () => {
    this.setState(s => ({ data: s.data + 1 }));
  };

  handleNoise = () => {
    this.setState(s => ({ noise: s.noise + 1 }));
  };

  render() {
    return (
      <div style={{ ...S.box, borderColor: '#8c8' }}>
        <span style={S.green}>Stable ref → PureComponent correctly skips</span>
        <p style={S.note}>noise: {this.state.noise} | data: {this.state.data}</p>
        <button style={S.btn} onClick={this.handleNoise}>
          Increment parent noise
        </button>
        <ButtonChild
          label={`Data: ${this.state.data}`}
          onClick={this.handleDataClick}  // ← same fn reference every render
        />
      </div>
    );
  }
}

function Exercise2() {
  return (
    <div>
      <p style={S.note}>
        Click "Increment parent noise" in each. Watch the child render count.
        BROKEN: count climbs even when data hasn't changed.
        FIXED: count only increments when you click the data button.
      </p>
      <ParentInlineArrow />
      <ParentStableRef />
    </div>
  );
}

// ─── Exercise 3 — Multi-method form ───────────────────────────
//
// Real components often have many methods. This exercise builds a form
// with four event handlers to practice choosing a binding strategy at scale.
//
// The form below is broken — none of the handlers are bound.
//
// Your task:
//   [ ] Choose ONE binding strategy for ALL handlers and apply it consistently.
//       Recommendation: class field arrows (cleanest for multiple methods).
//       Alternative: constructor binding (more traditional).
//       Avoid: inline arrows (there's a PureComponent child you'd break).
//
// After binding, the form should:
//   - Update name/email fields as you type
//   - Toggle the "terms agreed" checkbox
//   - Submit and show a summary
//
// Gotcha to watch for: `.bind()` returns a new function. Forgetting to ASSIGN
// the return value is a silent bug: `this.handle.bind(this)` does nothing.
// Correct: `this.handle = this.handle.bind(this)`.

class ContactForm extends React.Component {
  state = {
    name: '',
    email: '',
    agreed: false,
    submitted: null,
  };

  // TODO: Choose a binding strategy and apply it to ALL four handlers below.
  //
  // Option A — class field arrows (add = () => { } syntax):
  //   handleNameChange = (e) => { ... }
  //   handleEmailChange = (e) => { ... }
  //   handleToggleAgree = () => { ... }
  //   handleSubmit = () => { ... }
  //
  // Option B — constructor binding (add to constructor):
  //   constructor(props) {
  //     super(props);
  //     this.handleNameChange  = this.handleNameChange.bind(this);
  //     this.handleEmailChange = this.handleEmailChange.bind(this);
  //     this.handleToggleAgree = this.handleToggleAgree.bind(this);
  //     this.handleSubmit      = this.handleSubmit.bind(this);
  //   }

  handleNameChange(e) {
    this.setState({ name: e.target.value });
  }

  handleEmailChange(e) {
    this.setState({ email: e.target.value });
  }

  handleToggleAgree() {
    this.setState(s => ({ agreed: !s.agreed }));
  }

  handleSubmit() {
    const { name, email, agreed } = this.state;
    if (!name || !email) return alert('Fill in all fields');
    if (!agreed) return alert('You must agree to the terms');
    this.setState({ submitted: { name, email } });
  }

  render() {
    const { name, email, agreed, submitted } = this.state;
    const fieldStyle = { padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, width: '100%', marginBottom: 8 };

    if (submitted) {
      return (
        <div style={S.box}>
          <p><strong>✓ Submitted</strong></p>
          <p>Name: {submitted.name}</p>
          <p>Email: {submitted.email}</p>
          <button style={S.btn} onClick={() => this.setState({ submitted: null, name: '', email: '', agreed: false })}>
            Reset
          </button>
        </div>
      );
    }

    return (
      <div style={S.box}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: '0.85rem' }}>Name</label>
          <input style={fieldStyle} value={name} onChange={this.handleNameChange} placeholder="Your name" />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: '0.85rem' }}>Email</label>
          <input style={fieldStyle} value={email} onChange={this.handleEmailChange} placeholder="your@email.com" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', marginBottom: 8 }}>
          <input type="checkbox" checked={agreed} onChange={this.handleToggleAgree} />
          I agree to the terms
        </label>
        <button style={S.btn} onClick={this.handleSubmit}>Submit</button>
        <p style={S.note}>
          Without binding, each handler throws: "Cannot read properties of undefined".
          Apply your chosen strategy to all four methods.
        </p>
      </div>
    );
  }
}

function Exercise3() {
  return (
    <div>
      <p style={S.note}>
        The form has 4 unbound handlers. Pick a binding strategy (class field arrows
        recommended) and apply it consistently to all of them.
      </p>
      <ContactForm />
    </div>
  );
}

// ─── Playground — Functional components have no `this` problem ─
//
// This is the same counter and form, implemented as functional components.
// Notice: no binding, no constructor, no `this` anywhere.
//
// Closures replace `this`:
//   • State setters from useState are stable references (no binding needed)
//   • Event handlers close over the values they need directly
//
// The only `this`-adjacent issue in functional components is stale closures —
// where a handler captures an OLD value of a variable. But that's solved by
// functional updates (setState(prev => ...)) or useRef, not binding.
//
// Try to correlate each class solution to its functional equivalent:
//   Constructor bind   ≈ naming a stable function from useState/useCallback
//   Class field arrow  ≈ defining a function inside the component (auto-captures)
//   Inline arrow in JSX ≈ same as class: new function each render (use useCallback to stabilize)

function FnCounter() {
  const [count, setCount] = useState(0);
  // No binding — the closure captures `setCount` directly
  // setCount is already a stable reference from useState
  return (
    <div style={S.box}>
      <span style={S.green}>Functional — no binding needed</span>
      <p>Count: {count}</p>
      <button style={S.btn} onClick={() => setCount(c => c + 1)}>Increment</button>
      <p style={S.note}>
        setCount is always the same reference. Closures capture what they need.
        No `this`. No bind. No class field syntax required.
      </p>
    </div>
  );
}

// useCallback is the functional equivalent of "stabilize a callback reference"
// — the hook-world answer to "I need a stable function ref for a memoized child"
function FnParentWithCallback() {
  const [data, setData]   = useState(0);
  const [noise, setNoise] = useState(0);

  // Stable reference — same function object across renders (unless dep changes)
  const handleDataClick = useCallback(() => {
    setData(d => d + 1);
  }, []); // empty deps → stable forever

  return (
    <div style={S.box}>
      <span style={S.green}>useCallback — functional equivalent of class field arrow</span>
      <p style={S.note}>noise: {noise} | data: {data}</p>
      <button style={S.btn} onClick={() => setNoise(n => n + 1)}>Noise</button>
      {/* MemoChild receives handleDataClick — same ref → no re-render from noise */}
      <MemoChild onClick={handleDataClick} label={`Data: ${data}`} />
    </div>
  );
}

const MemoChild = React.memo(function MemoChild({ onClick, label }) {
  const renderCount = React.useRef(0);
  renderCount.current++;
  return (
    <div style={{ background: '#f0fff0', borderRadius: 4, padding: '4px 8px', marginTop: 8 }}>
      <button style={S.btn} onClick={onClick}>{label}</button>
      <span style={S.note}> child renders: {renderCount.current}</span>
    </div>
  );
});

function Playground() {
  return (
    <div>
      <FnCounter />
      <FnParentWithCallback />
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 900 }}>
      <h1>`this` Binding in Class Methods</h1>

      <h2>Exercise 1 — The problem &amp; all three solutions</h2>
      <p style={S.note}>
        Click BROKEN to see the TypeError. Then implement Solutions 1 (constructor bind)
        and 2 (class field arrow). Solution 3 is already complete — study it.
      </p>
      <Exercise1 />

      <h2>Exercise 2 — Inline arrow breaks PureComponent</h2>
      <p style={S.note}>
        Click "Increment parent noise" in each version. Watch child render counts.
        Inline arrow creates a new function every render → PureComponent gives up.
      </p>
      <Exercise2 />

      <h2>Exercise 3 — Multi-method form</h2>
      <p style={S.note}>
        The form has 4 unbound handlers. Pick one binding strategy and apply it to all.
        Filling in any field currently throws a TypeError.
      </p>
      <Exercise3 />

      <h2>Playground — Functional components (no `this` needed)</h2>
      <Playground />
    </div>
  );
}
