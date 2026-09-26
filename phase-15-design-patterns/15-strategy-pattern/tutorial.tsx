// ============================================================
// Topic:   Strategy Pattern (and Hook Factories)
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — replace an if/else chain with a typed strategy table
//   Exercise 2 — reproduce and fix the "dynamic hook selection" bug
//   Exercise 3 — hook factory + Context-injected strategy
//
// Run: npm run tutorial strategy-pattern
// ============================================================

import {
  Component, createContext, useContext, useMemo, useReducer, useRef, useState,
  FC, ReactNode,
} from 'react';

// ─── Exercise 1: A Typed Strategy Table ──────────────────────
//
// SITUATION
//   priceOldWay() is the smell: every new plan edits one growing function.
//   Replace it with a table of strategies. The checks run automatically.
//
// BUILD  PRICING: Record<Plan, PricingStrategy>  (keep `satisfies`-style exhaustiveness:
//        removing a plan from the union must produce a type error until you add it)
//   free        → 0
//   pro         → seats × 12
//   team        → max(5, seats) × 9
//   enterprise  → seats > 100 ? seats × 6 : seats × 8
//
// BONUS  Add a 'student' plan: seats × 3, capped at 5 seats. You should only
//        touch the Plan union and the table — not usePrice or the UI.

type Plan = 'free' | 'pro' | 'team' | 'enterprise';
type PricingStrategy = { label: string; price: (seats: number) => number };

function priceOldWay(plan: Plan, seats: number): number {
  if (plan === 'free') return 0;
  else if (plan === 'pro') return seats * 12;
  else if (plan === 'team') return Math.max(5, seats) * 9;
  else return seats > 100 ? seats * 6 : seats * 8;
}

const PRICING: Record<Plan, PricingStrategy> = {
  // TODO: implement each strategy's price()
  free: { label: 'Free', price: () => 0 },
  pro: { label: 'Pro', price: () => 0 },
  team: { label: 'Team', price: () => 0 },
  enterprise: { label: 'Enterprise', price: () => 0 },
};

function usePrice(plan: Plan, seats: number) {
  return useMemo(() => PRICING[plan].price(seats), [plan, seats]);
}

const PLAN_CHECKS: { plan: Plan; seats: number; expected: number }[] = [
  { plan: 'free', seats: 50, expected: 0 },
  { plan: 'pro', seats: 10, expected: 120 },
  { plan: 'team', seats: 2, expected: 45 },
  { plan: 'team', seats: 20, expected: 180 },
  { plan: 'enterprise', seats: 50, expected: 400 },
  { plan: 'enterprise', seats: 200, expected: 1200 },
];

function Exercise1() {
  const [plan, setPlan] = useState<Plan>('pro');
  const [seats, setSeats] = useState(10);
  const price = usePrice(plan, seats);
  return (
    <section>
      <h2>Exercise 1 — Strategy Table</h2>
      <div style={card}>
        <select value={plan} onChange={e => setPlan(e.target.value as Plan)}>
          {(Object.keys(PRICING) as Plan[]).map(p => <option key={p} value={p}>{PRICING[p].label}</option>)}
        </select>{' '}
        seats: <input type="number" min={1} value={seats} onChange={e => setSeats(Number(e.target.value))} style={{ width: 70 }} />
        <div style={{ fontSize: 24, margin: '8px 0' }}>${price} / month</div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {PLAN_CHECKS.map((c, i) => {
          const got = PRICING[c.plan].price(c.seats);
          const legacy = priceOldWay(c.plan, c.seats);
          const ok = got === c.expected && got === legacy;
          return (
            <li key={i} style={{ color: ok ? '#15803d' : '#b91c1c' }}>
              {ok ? '✓' : '✗'} {c.plan} × {c.seats} → expected {c.expected}, got {got}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Exercise 2: Dynamic Hook Selection ──────────────────────
//
// SITUATION
//   Payment strategies need React behaviour, so each is a HOOK with a
//   DIFFERENT internal shape (useState vs useReducer + useRef).
//
//   PaymentPanelBuggy picks the hook from a table by `method`. Switch the
//   method while mounted → "Rendered more/fewer hooks" (or silently mixed state).
//
// YOUR TASK
//   Make PaymentPanelFixed survive switching. Two options:
//     (A) key the inner component by method so each strategy gets its own instance
//     (B) map method → COMPONENT (StripeCard / PayPalButton) instead of → hook
//   Implement (A) in the TODO; try (B) as a stretch.
//
//   The ErrorBoundary below shows the crash and lets you reset.

type Method = 'stripe' | 'paypal';

function useStripe() {
  const [status, setStatus] = useState('idle');
  return { name: 'Stripe', status, pay: () => setStatus('paid via Stripe') };
}

function usePayPal() {
  const [status, dispatch] = useReducer((_s: string, a: string) => a, 'idle');
  const clicks = useRef(0);
  return {
    name: 'PayPal',
    status,
    pay: () => { clicks.current++; dispatch(`paid via PayPal (#${clicks.current})`); },
  };
}

const PAYMENT_HOOKS = { stripe: useStripe, paypal: usePayPal } as const;

const PanelBody: FC<{ method: Method }> = ({ method }) => {
  const usePayment = PAYMENT_HOOKS[method];   // a DIFFERENT hook per method
  const payment = usePayment();
  return (
    <div style={card}>
      <strong>{payment.name}</strong> — status: {payment.status}{' '}
      <button onClick={payment.pay}>Pay</button>
    </div>
  );
};

const PaymentPanelBuggy: FC<{ method: Method }> = ({ method }) => <PanelBody method={method} />;

const PaymentPanelFixed: FC<{ method: Method }> = ({ method }) => {
  // TODO (A): render <PanelBody key={method} method={method} /> so a method change remounts
  return <PanelBody method={method} />;
};

class ErrorBoundary extends Component<{ children: ReactNode; label: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ ...card, borderColor: '#fca5a5' }}>
        <div style={{ color: '#b91c1c' }}>💥 {this.props.label}: {this.state.error.message}</div>
        <button onClick={() => this.setState({ error: null })}>reset</button>
      </div>
    );
  }
}

function Exercise2() {
  const [method, setMethod] = useState<Method>('stripe');
  return (
    <section>
      <h2>Exercise 2 — Hook Order</h2>
      <p>
        Method:{' '}
        <button onClick={() => setMethod('stripe')}>Stripe</button>{' '}
        <button onClick={() => setMethod('paypal')}>PayPal</button>{' '}
        <span style={muted}>(click Pay first, then switch)</span>
      </p>
      <h4>Buggy</h4>
      <ErrorBoundary label="Buggy"><PaymentPanelBuggy method={method} /></ErrorBoundary>
      <h4>Fixed</h4>
      <ErrorBoundary label="Fixed"><PaymentPanelFixed method={method} /></ErrorBoundary>
    </section>
  );
}

// ─── Exercise 3: Hook Factory + Context Strategy ─────────────
//
// SITUATION
//   Discounts vary. Strategies are pure (given). Two ways to consume them:
//
//   A. HOOK FACTORY — createUseDiscount(strategy) returns a real hook.
//      Components choose which one to call AT AUTHORING TIME
//      (BlackFridayCart calls useBlackFriday). Created at MODULE scope.
//   B. CONTEXT — <DiscountProvider strategy> injects a strategy; the consumer
//      calls useCartTotal(cart) and never knows which one it got. Safe to
//      switch at runtime because the hook body never changes.
//
// BUILD
//   1. createUseDiscount(strategy): returns useDiscount(cart) →
//        { total: strategy.apply(cart) (memoised), label: strategy.label, saved: subtotal − total }
//   2. useCartTotal(cart): reads the strategy from DiscountContext (throw if none)
//        and returns the same { total, label, saved } shape (memoised)

type CartItem = { name: string; price: number };
type Cart = { items: CartItem[]; loyaltyYears: number };
type DiscountStrategy = { label: string; apply: (cart: Cart) => number };

const subtotal = (c: Cart) => c.items.reduce((s, i) => s + i.price, 0);

const DISCOUNTS = {
  none: { label: 'No discount', apply: subtotal },
  blackFriday: { label: 'Black Friday −30%', apply: (c: Cart) => subtotal(c) * 0.7 },
  loyalty: { label: 'Loyalty −2%/yr (max 20%)', apply: (c: Cart) => subtotal(c) * (1 - Math.min(0.2, 0.02 * c.loyaltyYears)) },
} satisfies Record<string, DiscountStrategy>;
type DiscountKey = keyof typeof DISCOUNTS;

type DiscountResult = { total: number; label: string; saved: number };

function createUseDiscount(strategy: DiscountStrategy) {
  // TODO 1: return function useDiscount(cart: Cart): DiscountResult { … useMemo … }
  void strategy; void useMemo;
  return function useDiscount(_cart: Cart): DiscountResult {
    return { total: 0, label: '(implement createUseDiscount)', saved: 0 };
  };
}

// Created at MODULE scope — never inside a component
const useBlackFriday = createUseDiscount(DISCOUNTS.blackFriday);
const useLoyalty = createUseDiscount(DISCOUNTS.loyalty);

const DiscountContext = createContext<DiscountStrategy | null>(null);
const DiscountProvider: FC<{ strategy: DiscountStrategy; children: ReactNode }> = ({ strategy, children }) => (
  <DiscountContext.Provider value={strategy}>{children}</DiscountContext.Provider>
);

function useCartTotal(cart: Cart): DiscountResult {
  // TODO 2: const strategy = useContext(DiscountContext); throw if null;
  //         return useMemo(() => ({ total, label, saved }), [strategy, cart])
  void useContext;
  return { total: 0, label: '(implement useCartTotal)', saved: 0 };
}

const CART: Cart = {
  items: [{ name: 'Keyboard', price: 120 }, { name: 'Monitor', price: 380 }],
  loyaltyYears: 4,
};

const money = (n: number) => `$${n.toFixed(2)}`;

const BlackFridayCart: FC = () => {
  const d = useBlackFriday(CART);
  return <div style={card}><strong>Hook factory A</strong>: {d.label} → {money(d.total)} <span style={muted}>(saved {money(d.saved)})</span></div>;
};
const LoyaltyCart: FC = () => {
  const d = useLoyalty(CART);
  return <div style={card}><strong>Hook factory B</strong>: {d.label} → {money(d.total)} <span style={muted}>(saved {money(d.saved)})</span></div>;
};

const CartSummary: FC = () => {
  const d = useCartTotal(CART);
  return <div style={card}>{d.label} → <strong>{money(d.total)}</strong> <span style={muted}>(saved {money(d.saved)})</span></div>;
};

function Exercise3() {
  const [key, setKey] = useState<DiscountKey>('none');
  return (
    <section>
      <h2>Exercise 3 — Hook Factory &amp; Context</h2>
      <p style={muted}>Subtotal: {money(subtotal(CART))} · loyalty years: {CART.loyaltyYears}</p>
      <BlackFridayCart />
      <LoyaltyCart />
      <div style={card}>
        <strong>Context-injected strategy</strong> — switch at runtime:{' '}
        <select value={key} onChange={e => setKey(e.target.value as DiscountKey)}>
          {(Object.keys(DISCOUNTS) as DiscountKey[]).map(k => <option key={k} value={k}>{DISCOUNTS[k].label}</option>)}
        </select>
        <DiscountProvider strategy={DISCOUNTS[key]}>
          <CartSummary />
        </DiscountProvider>
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: implement stretch (B) from Exercise 2 — map method → component instead of hook.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 15 — Strategy Pattern</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
