// ============================================================
// Topic:   State Reducer Pattern
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — AUTHOR: useCounter with an exposed stateReducer
//   Exercise 2 — AUTHOR + CONSUMER: useToggle, then "only 4 toggles"
//   Exercise 3 — CONSUMER: reducer enhancers (HOFs) on a given useSelection
//
// Run: npm run tutorial state-reducer
// ============================================================

import { useReducer, useState, useCallback, FC } from 'react';

// ─── Exercise 1: useCounter (author's side) ──────────────────
//
// SITUATION
//   You ship useCounter. Consumers want: a cap, no negatives, wrap-around.
//   Rather than three props, expose ONE extension point.
//
// BUILD
//   1. counterReducer(state, action) — increment/decrement by action.step, reset to action.initial
//   2. useCounter({ initial = 0, step = 1, stateReducer = counterReducer })
//        - useReducer(stateReducer, { count: initial })
//        - returns { count, increment, decrement, reset } — callbacks via useCallback
//   3. useCounter.reducer = counterReducer   (export the default so consumers can delegate)
//
// The consumer reducers below are already written — they should start working
// once your hook is right.

type CounterState = { count: number };
type CounterAction =
  | { type: 'increment'; step: number }
  | { type: 'decrement'; step: number }
  | { type: 'reset'; initial: number };
type CounterReducer = (s: CounterState, a: CounterAction) => CounterState;

function counterReducer(state: CounterState, action: CounterAction): CounterState {
  // TODO 1: switch on action.type (pure — return NEW objects)
  void action;
  return state;
}

function useCounter({
  initial = 0,
  step = 1,
  stateReducer = counterReducer,
}: { initial?: number; step?: number; stateReducer?: CounterReducer } = {}) {
  // TODO 2: const [state, dispatch] = useReducer(stateReducer, { count: initial });
  //         increment/decrement/reset = useCallback(() => dispatch({ … }), [step, initial])
  void useReducer; void useCallback; void stateReducer; void step;
  return { count: initial, increment: () => {}, decrement: () => {}, reset: () => {} };
}
useCounter.reducer = counterReducer;

// Consumer-side reducers (given)
const capAtFive: CounterReducer = (s, a) =>
  a.type === 'increment' && s.count + a.step > 5 ? s : useCounter.reducer(s, a);

const noNegatives: CounterReducer = (s, a) => {
  const next = useCounter.reducer(s, a);
  return next.count < 0 ? s : next;
};

const wrapAround: CounterReducer = (s, a) => {
  const next = useCounter.reducer(s, a);
  return next.count > 5 ? { count: 0 } : next.count < 0 ? { count: 5 } : next;
};

const CounterDemo: FC<{ title: string; hint: string; stateReducer?: CounterReducer }> = ({ title, hint, stateReducer }) => {
  const { count, increment, decrement, reset } = useCounter({ step: 2, stateReducer });
  return (
    <div style={{ ...card, flex: 1, minWidth: 200 }}>
      <strong>{title}</strong>
      <div style={muted}>{hint}</div>
      <div style={{ fontSize: 28, margin: '8px 0' }}>{count}</div>
      <button onClick={decrement}>−2</button> <button onClick={increment}>+2</button> <button onClick={reset}>reset</button>
    </div>
  );
};

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — useCounter</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <CounterDemo title="Default" hint="no override" />
        <CounterDemo title="Capped" hint="ignores increments past 5" stateReducer={capAtFive} />
        <CounterDemo title="No negatives" hint="ignores decrements below 0" stateReducer={noNegatives} />
        <CounterDemo title="Wrap-around" hint="6→0, −1→5" stateReducer={wrapAround} />
      </div>
    </section>
  );
}

// ─── Exercise 2: useToggle — Author, then Consumer ───────────
//
// PART A (author)  toggleReducer + useToggle({ initialOn, stateReducer })
//   actions: 'toggle' | 'on' | 'off' | 'reset'  (reset carries initialState)
//   export useToggle.reducer and useToggle.types
//
// PART B (consumer)  In LimitedToggle, write a stateReducer that IGNORES the
//   'toggle' action once the user has toggled 4 times. The click count lives in
//   the consumer's own state — note that this makes the reducer a closure over
//   changing consumer state (identity changes every render; that's fine).
//   Then show the "Limit reached" message when clicks >= 4.

type ToggleState = { on: boolean };
type ToggleAction =
  | { type: 'toggle' }
  | { type: 'on' }
  | { type: 'off' }
  | { type: 'reset'; initialState: ToggleState };
type ToggleReducer = (s: ToggleState, a: ToggleAction) => ToggleState;

function toggleReducer(state: ToggleState, action: ToggleAction): ToggleState {
  // TODO A1: implement all four action types
  void action;
  return state;
}

function useToggle({ initialOn = false, stateReducer = toggleReducer }: { initialOn?: boolean; stateReducer?: ToggleReducer } = {}) {
  // TODO A2: useReducer(stateReducer, { on: initialOn }); toggle/on/off/reset callbacks
  void stateReducer;
  return { on: initialOn, toggle: () => {}, setOn: () => {}, setOff: () => {}, reset: () => {} };
}
useToggle.reducer = toggleReducer;
useToggle.types = { toggle: 'toggle', on: 'on', off: 'off', reset: 'reset' } as const;

const LimitedToggle: FC = () => {
  const [clicks, setClicks] = useState(0);

  // TODO B: replace with a reducer that returns `state` for 'toggle' when clicks >= 4,
  //         and delegates to useToggle.reducer otherwise
  const stateReducer: ToggleReducer = (s, a) => useToggle.reducer(s, a);

  const { on, toggle, reset } = useToggle({ stateReducer });
  return (
    <div style={card}>
      <button onClick={() => { toggle(); setClicks(c => c + 1); }} style={{ minWidth: 80 }}>
        {on ? 'ON' : 'OFF'}
      </button>{' '}
      <button onClick={() => { reset(); setClicks(0); }}>reset</button>
      <div style={muted}>clicks: {clicks} {clicks >= 4 && <strong style={{ color: '#b91c1c' }}>— limit reached, toggle is frozen</strong>}</div>
    </div>
  );
};

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — useToggle</h2>
      <LimitedToggle />
    </section>
  );
}

// ─── Exercise 3: Reducer Enhancers (consumer's side) ─────────
//
// SITUATION
//   useSelection (given, complete) lets you pass a stateReducer. Real apps
//   need MANY small rules ("max 3", "keep at least one"). Instead of one
//   giant reducer, write each rule as an ENHANCER — a higher-order function
//   from reducer to reducer — and combine them.
//
//   type Enhancer = (next: SelReducer) => SelReducer
//
// BUILD
//   maxN(n): Enhancer       → ignore a 'toggle' that would ADD item n+1
//   requireOne: Enhancer    → ignore a 'toggle' that would REMOVE the last selected
//                             item, and ignore 'clear'
//   applyEnhancers(base, ...enhancers) → base wrapped by each enhancer
//                             (first enhancer is OUTERMOST → it sees the action first)
//
// TEST   Use the three panels: only maxN(3); only requireOne; both.

type SelState = { selected: string[] };
type SelAction = { type: 'toggle'; id: string } | { type: 'clear' };
type SelReducer = (s: SelState, a: SelAction) => SelState;
type Enhancer = (next: SelReducer) => SelReducer;

const selectionReducer: SelReducer = (s, a) => {
  switch (a.type) {
    case 'toggle':
      return s.selected.includes(a.id)
        ? { selected: s.selected.filter(x => x !== a.id) }
        : { selected: [...s.selected, a.id] };
    case 'clear':
      return { selected: [] };
  }
};

function useSelection(stateReducer: SelReducer = selectionReducer, initial: string[] = []) {
  const [state, dispatch] = useReducer(stateReducer, { selected: initial });
  return {
    selected: state.selected,
    toggle: (id: string) => dispatch({ type: 'toggle', id }),
    clear: () => dispatch({ type: 'clear' }),
  };
}

// TODO 1
const maxN = (n: number): Enhancer => next => {
  void n;
  return next;
};

// TODO 2
const requireOne: Enhancer = next => next;

// TODO 3: fold enhancers around the base reducer
function applyEnhancers(base: SelReducer, ...enhancers: Enhancer[]): SelReducer {
  void enhancers;
  return base;
}

const ITEMS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

const SelectionDemo: FC<{ title: string; reducer: SelReducer; initial?: string[] }> = ({ title, reducer, initial }) => {
  const { selected, toggle, clear } = useSelection(reducer, initial);
  return (
    <div style={{ ...card, flex: 1, minWidth: 220 }}>
      <strong>{title}</strong>
      <div style={{ margin: '8px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ITEMS.map(i => (
          <button key={i} onClick={() => toggle(i)} style={{ background: selected.includes(i) ? '#bae6fd' : undefined }}>
            {i}
          </button>
        ))}
      </div>
      <div style={muted}>selected ({selected.length}): {selected.join(', ') || '—'}</div>
      <button onClick={clear}>clear</button>
    </div>
  );
};

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Enhancers</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SelectionDemo title="maxN(3)" reducer={applyEnhancers(selectionReducer, maxN(3))} />
        <SelectionDemo title="requireOne" reducer={applyEnhancers(selectionReducer, requireOne)} initial={['Apple']} />
        <SelectionDemo title="both" reducer={applyEnhancers(selectionReducer, maxN(3), requireOne)} initial={['Apple']} />
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add the `changes` variant — run the default reducer first and hand the consumer
// { ...action, changes } so their override can be `({ ...changes, extra })`.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 10 — State Reducer</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
