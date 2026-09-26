// ============================================================
// Topic:   Pub-Sub vs Observer
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — Observer: createStore + useStore (useSyncExternalStore)
//   Exercise 2 — Pub-Sub: a typed event bus + useBusEvent, toast center
//   Exercise 3 — Pub-Sub across tabs: useBroadcast (BroadcastChannel)
//
// Run: npm run tutorial pub-sub
// ============================================================

import {
  useCallback, useEffect, useRef, useState, useSyncExternalStore, FC,
} from 'react';

// ─── Exercise 1: Observer — a Store React Can Subscribe To ───
//
// SITUATION
//   Two components (and a plain button OUTSIDE React's state) must share a
//   counter. The store is the SUBJECT; components are OBSERVERS.
//
// BUILD
//   1. createStore<T>(initial): Store<T>
//        - getState()
//        - setState(next | updater): update, then notify every listener
//        - subscribe(listener): add; return an unsubscribe function
//        - listenerCount(): for leak-spotting
//   2. useStore(store): T  — via useSyncExternalStore(store.subscribe, store.getState)
//
// OBSERVE
//   - Both Counter components update when EITHER button (or the outside button) is pressed.
//   - "listeners" goes up when components mount, back to 0 when unmounted (no leaks).

type Store<T> = {
  getState: () => T;
  setState: (next: T | ((s: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  listenerCount: () => number;
};

function createStore<T>(initial: T): Store<T> {
  const state = initial;
  // TODO: `let state`, `const listeners = new Set<() => void>()`, and the four methods
  return {
    getState: () => state,
    setState: () => {},
    subscribe: () => () => {},
    listenerCount: () => 0,
  };
}

function useStore<T>(store: Store<T>): T {
  // TODO: return useSyncExternalStore(store.subscribe, store.getState);
  void useSyncExternalStore;
  return store.getState();
}

const counterStore = createStore(0);

const Counter: FC<{ name: string }> = ({ name }) => {
  const count = useStore(counterStore);
  const renders = useRef(0);
  renders.current++;
  return (
    <div style={{ ...card, flex: 1 }}>
      <strong>{name}</strong>: {count} <span style={muted}>(renders: {renders.current})</span>{' '}
      <button onClick={() => counterStore.setState(c => c + 1)}>+1</button>
    </div>
  );
};

function Exercise1() {
  const [mounted, setMounted] = useState(true);
  const [, tick] = useState(0);
  return (
    <section>
      <h2>Exercise 1 — Store (Observer)</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        {mounted && <Counter name="Counter A" />}
        {mounted && <Counter name="Counter B" />}
      </div>
      <p>
        <button onClick={() => counterStore.setState(c => c + 10)}>+10 from outside React state</button>{' '}
        <button onClick={() => setMounted(m => !m)}>{mounted ? 'Unmount' : 'Mount'} counters</button>{' '}
        <span style={muted}>
          listeners: <strong>{counterStore.listenerCount()}</strong>{' '}
          <button onClick={() => tick(n => n + 1)}>refresh</button>
        </span>
      </p>
    </section>
  );
}

// ─── Exercise 2: Pub-Sub — a Typed Event Bus ─────────────────
//
// SITUATION
//   A toast must be triggerable from ANYWHERE — including code that isn't a
//   component. Publishers and subscribers should share only an event contract.
//
// BUILD
//   1. createEventBus<E>():
//        on(event, handler) → returns unsubscribe
//        emit(event, payload) — iterate over a COPY of the handler set
//        listenerCount(event)
//   2. useBusEvent(bus, event, handler):
//        keep `handler` in a ref (latest-ref); subscribe ONCE per [bus, event];
//        return the unsubscribe from the effect (cleanup)
//
// OBSERVE
//   - Emit from the buttons and from the "non-React" setTimeout: ToastHost shows them.
//   - Unmount the host: listenerCount('toast') returns to 0.
//   - Emit BEFORE the host mounts: it's lost (no replay). Discuss the fix.

type Events = {
  toast: { message: string; kind: 'info' | 'error' };
  'cart:add': { sku: string };
};

type Bus<E extends Record<string, unknown>> = {
  on: <K extends keyof E>(event: K, handler: (payload: E[K]) => void) => () => void;
  emit: <K extends keyof E>(event: K, payload: E[K]) => void;
  listenerCount: (event: keyof E) => number;
};

function createEventBus<E extends Record<string, unknown>>(): Bus<E> {
  // TODO: const handlers = new Map<keyof E, Set<(payload: never) => void>>();
  return {
    on: () => () => {},
    emit: () => {},
    listenerCount: () => 0,
  };
}

function useBusEvent<E extends Record<string, unknown>, K extends keyof E>(
  bus: Bus<E>,
  event: K,
  handler: (payload: E[K]) => void,
) {
  // TODO 1: const latest = useRef(handler); useEffect(() => { latest.current = handler; });
  // TODO 2: useEffect(() => bus.on(event, p => latest.current(p)), [bus, event]);
  void bus; void event; void handler; void useEffect;
}

const bus = createEventBus<Events>();

const ToastHost: FC = () => {
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: string }[]>([]);
  const seq = useRef(0);
  useBusEvent(bus, 'toast', ({ message, kind }) => {
    const id = seq.current++;
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500);
  });
  return (
    <div style={{ minHeight: 60 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ ...card, background: t.kind === 'error' ? '#fee2e2' : '#e0f2fe' }}>{t.message}</div>
      ))}
    </div>
  );
};

const CartStats: FC = () => {
  const [count, setCount] = useState(0);
  useBusEvent(bus, 'cart:add', () => setCount(c => c + 1));
  return <div style={muted}>CartStats heard {count} “cart:add” events</div>;
};

function Exercise2() {
  const [host, setHost] = useState(true);
  const [, tick] = useState(0);
  return (
    <section>
      <h2>Exercise 2 — Event Bus (Pub-Sub)</h2>
      <p>
        <button onClick={() => bus.emit('toast', { message: 'Saved!', kind: 'info' })}>emit info toast</button>{' '}
        <button onClick={() => bus.emit('toast', { message: 'Upload failed', kind: 'error' })}>emit error toast</button>{' '}
        <button onClick={() => bus.emit('cart:add', { sku: 'A1' })}>emit cart:add</button>{' '}
        <button onClick={() => setTimeout(() => bus.emit('toast', { message: 'From a plain setTimeout', kind: 'info' }), 500)}>
          emit from non-React code
        </button>
      </p>
      <div style={card}>
        <button onClick={() => setHost(h => !h)}>{host ? 'Unmount' : 'Mount'} ToastHost</button>{' '}
        <span style={muted}>
          toast listeners: <strong>{bus.listenerCount('toast')}</strong>{' '}
          <button onClick={() => tick(n => n + 1)}>refresh</button>
        </span>
        {host && <ToastHost />}
      </div>
      <CartStats />
    </section>
  );
}

// ─── Exercise 3: Pub-Sub Across Tabs ─────────────────────────
//
// SITUATION
//   Same-origin tabs need to hear each other (login/logout, "new message").
//   BroadcastChannel is Pub-Sub delivered by the browser.
//
// BUILD  useBroadcast<T>(name, onMessage): (msg: T) => void
//   - feature-detect: if typeof BroadcastChannel === 'undefined' do nothing
//   - in an effect keyed on [name]: create the channel, set onmessage → latest.current(e.data),
//     keep it in a ref, return a cleanup that CLOSES the channel
//   - return a stable `post(msg)` that posts on the channel
//   - the poster does NOT receive its own message — the UI appends its own
//     messages locally
//
// TEST  Open this page in TWO browser tabs and send from one.

type ChatMsg = { from: string; text: string };

function useBroadcast<T>(name: string, onMessage: (msg: T) => void): (msg: T) => void {
  // TODO: latest-ref for onMessage; channel ref; effect creating/closing the channel
  void name; void onMessage; void useCallback;
  return () => {};
}

const me = `tab-${Math.random().toString(36).slice(2, 6)}`;

function Exercise3() {
  const [log, setLog] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const post = useBroadcast<ChatMsg>('p15-11-chat', msg => setLog(l => [...l, msg]));

  function send() {
    if (!text.trim()) return;
    const msg = { from: me, text: text.trim() };
    setLog(l => [...l, msg]);     // local echo — the channel won't deliver to us
    post(msg);
    setText('');
  }

  return (
    <section>
      <h2>Exercise 3 — BroadcastChannel</h2>
      <p style={muted}>This tab is <strong>{me}</strong>. Open a second tab of this page and chat.</p>
      <div style={{ ...card, minHeight: 80 }}>
        {log.length === 0 && <span style={muted}>no messages yet</span>}
        {log.map((m, i) => (
          <div key={i}><strong style={{ color: m.from === me ? '#0369a1' : '#9a3412' }}>{m.from}</strong>: {m.text}</div>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} style={{ marginTop: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="say something…" />{' '}
        <button>Send</button>
      </form>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: make ToastHost replay missed events by keeping a small buffer inside the bus.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 11 — Pub-Sub vs Observer</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
