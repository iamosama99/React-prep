// ============================================================
// Topic:   Facade Pattern
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — write useCheckout(): a facade over seven subsystems
//   Exercise 2 — a NON-hook facade: analytics that hides two vendors
//   Exercise 3 — turn a leaky hook into an intent-named, stable facade
//
// Run: npm run tutorial facade-pattern
// ============================================================

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  Dispatch, FC, memo, ReactNode, SetStateAction, useRef,
} from 'react';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const money = (n: number) => `$${n.toFixed(2)}`;

// ─── Exercise 1: useCheckout ─────────────────────────────────
//
// SITUATION
//   CheckoutMessy (below, read-only) wires seven subsystems itself. Build the
//   facade so the view depends on ONE hook and none of the subsystems.
//
// BUILD  useCheckout(): Checkout
//   lines        items mapped to { id, label, price: money(price) }
//   total        money(subtotal + tax)
//   blockedReason  first matching rule (else null):
//                    cart empty              → 'Your cart is empty'
//                    guest && !expressFlag   → 'Sign in to check out'
//                    !can('purchase')        → 'Your account cannot place orders'
//   canPurchase  blockedReason === null
//   status       'idle' | 'submitting' | 'success' | 'error'   (ONE enum, from the mutation state)
//   error        message | null
//   submit()     track('checkout_started') → await order.mutateAsync → clear cart →
//                track('checkout_completed');   on failure → track('checkout_failed')
//   Return a memoised object; submit via useCallback.
//
// TEST  Flip the scenario switches and compare the Messy and Facade panels — they
//       should behave identically. Check the analytics log.

type CartItem = { id: string; name: string; price: number };
type Scenario = { guest: boolean; expressFlag: boolean; canPurchase: boolean; failOrder: boolean };
type World = {
  scenario: Scenario;
  setScenario: Dispatch<SetStateAction<Scenario>>;
  items: CartItem[];
  setItems: Dispatch<SetStateAction<CartItem[]>>;
  log: string[];
  pushLog: (line: string) => void;
};

const SEED_ITEMS: CartItem[] = [
  { id: 'kb', name: 'Keyboard', price: 120 },
  { id: 'ms', name: 'Mouse', price: 45.5 },
];

const WorldCtx = createContext<World | null>(null);
function useWorld(): World {
  const w = useContext(WorldCtx);
  if (!w) throw new Error('WorldCtx missing');
  return w;
}

const WorldProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [scenario, setScenario] = useState<Scenario>({ guest: false, expressFlag: false, canPurchase: true, failOrder: false });
  const [items, setItems] = useState<CartItem[]>(SEED_ITEMS);
  const [log, setLog] = useState<string[]>([]);
  const pushLog = useCallback((line: string) => setLog(l => [line, ...l].slice(0, 6)), []);
  const value = useMemo(() => ({ scenario, setScenario, items, setItems, log, pushLog }), [scenario, items, log, pushLog]);
  return <WorldCtx.Provider value={value}>{children}</WorldCtx.Provider>;
};

// --- the "subsystems" (each is a hook with its own shape) ---
const useCart = () => {
  const { items, setItems } = useWorld();
  return { items, clear: useCallback(() => setItems([]), [setItems]) };
};
const useAuth = () => {
  const { scenario } = useWorld();
  return { user: scenario.guest ? null : { name: 'Ada' }, isGuest: scenario.guest };
};
const usePermissions = (_user: { name: string } | null) => {
  const { scenario } = useWorld();
  return { can: (_action: string) => scenario.canPurchase };
};
const useFlags = () => ({ expressCheckout: useWorld().scenario.expressFlag });
const useTax = (items: CartItem[]) => ({ tax: Math.round(items.reduce((s, i) => s + i.price, 0) * 0.08 * 100) / 100 });
const useAnalytics = () => useWorld().pushLog;
const usePlaceOrder = () => {
  const { scenario } = useWorld();
  const [state, setState] = useState<{ pending: boolean; error: Error | null; success: boolean }>({ pending: false, error: null, success: false });
  const fail = scenario.failOrder;
  const mutateAsync = useCallback(async (_payload: { items: CartItem[] }) => {
    setState({ pending: true, error: null, success: false });
    await wait(700);
    if (fail) {
      const error = new Error('Payment declined');
      setState({ pending: false, error, success: false });
      throw error;
    }
    setState({ pending: false, error: null, success: true });
  }, [fail]);
  return { mutateAsync, isPending: state.pending, isError: !!state.error, isSuccess: state.success, error: state.error };
};

// --- the messy original (read-only; this is the smell) ---
const CheckoutMessy: FC = () => {
  const { items, clear } = useCart();
  const { isGuest, user } = useAuth();
  const { can } = usePermissions(user);
  const { expressCheckout } = useFlags();
  const { tax } = useTax(items);
  const track = useAnalytics();
  const order = usePlaceOrder();

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const blocked =
    items.length === 0 ? 'Your cart is empty'
      : isGuest && !expressCheckout ? 'Sign in to check out'
        : !can('purchase') ? 'Your account cannot place orders' : null;

  async function submit() {
    track('[messy] checkout_started');
    try {
      await order.mutateAsync({ items });
      clear();
      track('[messy] checkout_completed');
    } catch { track('[messy] checkout_failed'); }
  }

  return (
    <div style={card}>
      <strong>Messy (7 subsystems in the component)</strong>
      <ul>{items.map(i => <li key={i.id}>{i.name} — {money(i.price)}</li>)}</ul>
      <div>Total: {money(subtotal + tax)}</div>
      <button disabled={!!blocked || order.isPending} onClick={submit}>{order.isPending ? 'Paying…' : 'Pay'}</button>
      {blocked && <p role="alert" style={{ color: '#b91c1c' }}>{blocked}</p>}
      {order.isError && <p style={{ color: '#b91c1c' }}>{order.error?.message}</p>}
      {order.isSuccess && <p style={{ color: '#15803d' }}>Paid ✓</p>}
    </div>
  );
};

// --- the facade you write ---
type CheckoutStatus = 'idle' | 'submitting' | 'success' | 'error';
type Checkout = {
  lines: { id: string; label: string; price: string }[];
  total: string;
  canPurchase: boolean;
  blockedReason: string | null;
  status: CheckoutStatus;
  error: string | null;
  submit: () => Promise<void>;
};

function useCheckout(): Checkout {
  // TODO: call the seven subsystem hooks (same as CheckoutMessy), derive everything above,
  //       memoise the result, wrap submit in useCallback.
  void useMemo; void useCart; void useAuth; void usePermissions; void useFlags; void useTax; void useAnalytics; void usePlaceOrder;
  return {
    lines: [], total: money(0), canPurchase: false,
    blockedReason: '(implement useCheckout)', status: 'idle', error: null, submit: async () => {},
  };
}

// --- the view: imports NONE of the subsystem hooks ---
const CheckoutView: FC = () => {
  const c = useCheckout();
  return (
    <div style={card}>
      <strong>Facade (view knows only useCheckout)</strong>
      <ul>{c.lines.map(l => <li key={l.id}>{l.label} — {l.price}</li>)}</ul>
      <div>Total: {c.total}</div>
      <button disabled={!c.canPurchase || c.status === 'submitting'} onClick={c.submit}>
        {c.status === 'submitting' ? 'Paying…' : 'Pay'}
      </button>
      {c.blockedReason && <p role="alert" style={{ color: '#b91c1c' }}>{c.blockedReason}</p>}
      {c.status === 'error' && <p style={{ color: '#b91c1c' }}>{c.error}</p>}
      {c.status === 'success' && <p style={{ color: '#15803d' }}>Paid ✓</p>}
    </div>
  );
};

const ScenarioControls: FC = () => {
  const { scenario, setScenario, setItems, log } = useWorld();
  const toggle = (k: keyof Scenario) => (
    <label style={{ marginRight: 12 }}>
      <input type="checkbox" checked={scenario[k]} onChange={e => setScenario(s => ({ ...s, [k]: e.target.checked }))} /> {k}
    </label>
  );
  return (
    <div style={card}>
      {toggle('guest')}{toggle('expressFlag')}{toggle('canPurchase')}{toggle('failOrder')}
      <button onClick={() => setItems(SEED_ITEMS)}>reset cart</button> <button onClick={() => setItems([])}>empty cart</button>
      <div style={muted}>analytics: {log.length ? log.join(' · ') : '—'}</div>
    </div>
  );
};

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — useCheckout</h2>
      <WorldProvider>
        <ScenarioControls />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <CheckoutMessy />
          <CheckoutView />
        </div>
      </WorldProvider>
    </section>
  );
}

// ─── Exercise 2: A Non-Hook Facade (Analytics) ───────────────
//
// SITUATION
//   Two vendors with different shapes. No component should import either.
//   Write createAnalytics(vendorName) → { track, identify }.
//
//   vendor A:  capture(event, properties)          setUser(id, traits)
//   vendor B:  event({ name, data, ts })           identify(userId, plan)
//
// BUILD
//   - track(name, props?): strip `undefined` values and any key named 'password',
//       then call the right vendor call. Vendor B needs ts: Date.now().
//   - identify(user: { id, plan }) → each vendor's identify call
//   - NEVER throw: wrap vendor calls in try/catch (telemetry must not break the UI);
//       report swallowed failures through `onError` (given)
//
// TEST  Switch vendors; click the buttons — the CALLERS don't change.
//       Turn on "vendor outage": clicking must not crash; the facade reports the swallow.

type Props = Record<string, unknown>;
type Sink = (line: string) => void;
let outage = false;
let sink: Sink = () => {};

const vendorA = {
  capture(event: string, properties: Props) {
    if (outage) throw new Error('vendor A down');
    sink(`A.capture ${event} ${JSON.stringify(properties)}`);
  },
  setUser(id: string, traits: Props) {
    if (outage) throw new Error('vendor A down');
    sink(`A.setUser ${id} ${JSON.stringify(traits)}`);
  },
};
const vendorB = {
  event(payload: { name: string; data: Props; ts: number }) {
    if (outage) throw new Error('vendor B down');
    sink(`B.event ${payload.name} ${JSON.stringify(payload.data)} @${payload.ts % 100000}`);
  },
  identify(userId: string, plan: string) {
    if (outage) throw new Error('vendor B down');
    sink(`B.identify ${userId} plan=${plan}`);
  },
};

type Analytics = {
  track: (name: string, props?: Props) => void;
  identify: (user: { id: string; plan: string }) => void;
};

function createAnalytics(vendor: 'a' | 'b', onError: (e: unknown) => void): Analytics {
  // TODO: implement sanitize(props), and track/identify for BOTH vendors with try/catch → onError
  void vendor; void onError; void vendorA; void vendorB;
  return { track: () => {}, identify: () => {} };
}

function Exercise2() {
  const [vendor, setVendor] = useState<'a' | 'b'>('a');
  const [lines, setLines] = useState<string[]>([]);
  const [down, setDown] = useState(false);
  const add = useCallback((l: string) => setLines(x => [l, ...x].slice(0, 8)), []);
  // module-level fakes are updated in an effect, not during render
  useEffect(() => { sink = add; }, [add]);
  useEffect(() => { outage = down; }, [down]);

  const analytics = useMemo(() => createAnalytics(vendor, e => add(`⚠ swallowed: ${(e as Error).message}`)), [vendor, add]);

  return (
    <section>
      <h2>Exercise 2 — Analytics Facade</h2>
      <p>
        <label><input type="radio" checked={vendor === 'a'} onChange={() => setVendor('a')} /> vendor A</label>{' '}
        <label><input type="radio" checked={vendor === 'b'} onChange={() => setVendor('b')} /> vendor B</label>{' '}
        <label><input type="checkbox" checked={down} onChange={e => setDown(e.target.checked)} /> vendor outage</label>
      </p>
      {/* These call sites never mention a vendor */}
      <button onClick={() => analytics.identify({ id: 'u1', plan: 'pro' })}>identify</button>{' '}
      <button onClick={() => analytics.track('add_to_cart', { sku: 'A1', coupon: undefined })}>track add_to_cart</button>{' '}
      <button onClick={() => analytics.track('login', { email: 'a@b.c', password: 'hunter2' })}>track login (has password!)</button>
      <div style={{ ...card, minHeight: 70 }}>
        {lines.length === 0 && <span style={muted}>no events yet</span>}
        {lines.map((l, i) => <div key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>{l}</div>)}
      </div>
    </section>
  );
}

// ─── Exercise 3: From Leaky to Intent-Named ──────────────────
//
// SITUATION
//   useProfileLeaky() returns the raw query and mutation. ProfileCardLeaky
//   now knows about isLoading/isError/isPending and library shapes. Also the
//   memoised SaveButton re-renders needlessly.
//
// BUILD  useProfile(): { name, initials, status, canSave, save }
//   name      display name ('' while loading)
//   initials  derived from name ("Ada Lovelace" → "AL")
//   status    'loading' | 'error' | 'ready' | 'saving'   (ONE enum)
//   canSave   status === 'ready'
//   save(name: string): Promise<void>  — STABLE identity (useCallback)
//   Return a memoised object.
//
// SUCCESS  Click "unrelated re-render": SaveButton's render counter must not move.

type Profile = { name: string };
type ProfileWorld = { profile: Profile | null; setProfile: (p: Profile) => void };
const ProfileCtx = createContext<ProfileWorld | null>(null);

const ProfileWorldProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile | null>(null);
  useEffect(() => { const t = setTimeout(() => setProfileState({ name: 'Ada Lovelace' }), 500); return () => clearTimeout(t); }, []);
  const setProfile = useCallback((p: Profile) => setProfileState(p), []);
  const value = useMemo(() => ({ profile, setProfile }), [profile, setProfile]);
  return <ProfileCtx.Provider value={value}>{children}</ProfileCtx.Provider>;
};

function useProfileQuery() {
  const w = useContext(ProfileCtx)!;
  return { data: w.profile, isLoading: w.profile === null, isError: false };
}
function useUpdateProfile() {
  const w = useContext(ProfileCtx)!;
  const [isPending, setPending] = useState(false);
  const mutate = useCallback(async (name: string) => {
    setPending(true);
    await wait(600);
    w.setProfile({ name });
    setPending(false);
  }, [w.setProfile]);   // eslint-disable-line react-hooks/exhaustive-deps
  return { mutate, isPending };
}

// The leaky version (read-only)
function useProfileLeaky() {
  return { query: useProfileQuery(), mutation: useUpdateProfile() };
}
const ProfileCardLeaky: FC = () => {
  const { query, mutation } = useProfileLeaky();
  return (
    <div style={card}>
      <strong>Leaky</strong>
      <div>
        {query.isLoading ? 'loading…' : query.data?.name}{' '}
        <button disabled={query.isLoading || mutation.isPending} onClick={() => mutation.mutate('Ada L.')}>
          {mutation.isPending ? 'saving…' : 'shorten name'}
        </button>
      </div>
    </div>
  );
};

type ProfileFacade = {
  name: string;
  initials: string;
  status: 'loading' | 'error' | 'ready' | 'saving';
  canSave: boolean;
  save: (name: string) => Promise<void>;
};

function useProfile(): ProfileFacade {
  // TODO: compose useProfileQuery + useUpdateProfile; derive name/initials/status/canSave;
  //       save = useCallback(name => mutation.mutate(name), [mutation.mutate]); memoise the result
  void useCallback; void useMemo;
  return { name: '', initials: '?', status: 'loading', canSave: false, save: async () => {} };
}

const SaveButton = memo(function SaveButton({ onSave, disabled }: { onSave: () => void; disabled: boolean }) {
  const renders = useRef(0);
  renders.current++;
  return (
    <button disabled={disabled} onClick={onSave}>
      shorten name <span style={muted}>(SaveButton renders: {renders.current})</span>
    </button>
  );
});

const ProfileCard: FC = () => {
  const p = useProfile();
  const onSave = useCallback(() => { void p.save('Ada L.'); }, [p.save]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={card}>
      <strong>Facade</strong>
      <div>
        <span style={{ background: '#e0f2fe', borderRadius: 999, padding: '2px 8px', marginRight: 6 }}>{p.initials}</span>
        {p.status === 'loading' ? 'loading…' : p.name} <span style={muted}>({p.status})</span>{' '}
        <SaveButton onSave={onSave} disabled={!p.canSave} />
      </div>
    </div>
  );
};

function Exercise3() {
  const [n, setN] = useState(0);
  return (
    <section>
      <h2>Exercise 3 — Leaky → Facade</h2>
      <button onClick={() => setN(x => x + 1)}>unrelated re-render ({n})</button>
      <ProfileWorldProvider>
        <ProfileCardLeaky />
        <ProfileCard />
      </ProfileWorldProvider>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add `retry()` to useCheckout that only exists (is non-null) when status === 'error'.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 16 — Facade Pattern</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
