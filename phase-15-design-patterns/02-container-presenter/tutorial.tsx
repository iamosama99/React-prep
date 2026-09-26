// ============================================================
// Topic:   Container–Presenter
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — split a bloated component into container + presenter
//   Exercise 2 — catch a "presenter in disguise" and fix it
//   Exercise 3 — map DTO → view model, keep the presenter memo-friendly
//
// Run: npm run tutorial container-presenter
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef, memo, FC } from 'react';

// ─── Shared fake API ─────────────────────────────────────────
type User = { id: number; name: string; email: string };
const USERS: User[] = [
  { id: 3, name: 'Chidi Okafor', email: 'chidi@example.com' },
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com' },
];

let failNext = false;
function fetchUsers(): Promise<User[]> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (failNext) {
        failNext = false;
        reject(new Error('Network down'));
      } else resolve(USERS);
    }, 700),
  );
}

// ─── Exercise 1: Split the bloated component ─────────────────
//
// SITUATION
//   BloatedUserList (below, read-only) fetches, tracks loading/error,
//   sorts, and renders — four concerns, one component. To test the
//   "error" state you'd have to mock the network.
//
// BUILD
//   1. UserListView  — presenter. Pure function of UserListViewProps.
//      Render each status: loading / error (with Retry) / ready (sorted list,
//      clicking a row calls onSelect). Highlight the selected row.
//      Bonus: give each row its own expanded/collapsed email (UI state
//      that legitimately lives in the presenter).
//   2. useUserList   — the container logic as a hook.
//      Fetch on mount (ignore results after unmount), expose status,
//      sorted users, errorMessage, onRetry, selectedId, onSelect.
//   3. UserListContainer is already written: <UserListView {...useUserList()} />
//
// PROOF THAT IT WORKED
//   The four "fixture" panels render the presenter with hand-written
//   props — no network, no waiting. That's the payoff of the split.

type Status = 'loading' | 'error' | 'ready';

type UserListViewProps = {
  users: User[];
  status: Status;
  errorMessage?: string;
  selectedId: number | null;
  onRetry: () => void;
  onSelect: (id: number) => void;
};

// Original (read-only — this is the smell)
const BloatedUserList: FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchUsers()
      .then(u => { setUsers(u); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
  if (loading) return <em>Loading…</em>;
  if (error) return <span style={{ color: '#b91c1c' }}>{error}</span>;
  return <ul>{sorted.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};

// TODO 1 — presenter
const UserListView: FC<UserListViewProps> = ({ users, status, errorMessage, selectedId, onRetry, onSelect }) => {
  void users; void status; void errorMessage; void selectedId; void onRetry; void onSelect;
  return <div style={muted}>UserListView stub — render loading / error / ready here</div>;
};

// TODO 2 — container logic
function useUserList(): UserListViewProps {
  // useState for users, status, errorMessage, selectedId
  // useEffect: fetch on mount; guard against setState after unmount
  // sort by name (use useMemo so the array identity is stable between renders)
  // onRetry: reset to 'loading' and fetch again (extract a `load` function)
  return {
    users: [],
    status: 'loading',
    selectedId: null,
    onRetry: () => {},
    onSelect: () => {},
  };
}

const UserListContainer: FC = () => <UserListView {...useUserList()} />;

function Exercise1() {
  const [key, setKey] = useState(0);
  const noop = () => {};
  const fixtures: { label: string; props: UserListViewProps }[] = [
    { label: 'loading', props: { users: [], status: 'loading', selectedId: null, onRetry: noop, onSelect: noop } },
    { label: 'error', props: { users: [], status: 'error', errorMessage: 'Network down', selectedId: null, onRetry: noop, onSelect: noop } },
    { label: 'empty', props: { users: [], status: 'ready', selectedId: null, onRetry: noop, onSelect: noop } },
    { label: 'ready + selected', props: { users: USERS, status: 'ready', selectedId: 1, onRetry: noop, onSelect: noop } },
  ];
  return (
    <section>
      <h2>Exercise 1 — Split It</h2>
      <div style={card}>
        <strong>Container (real fake-network)</strong>{' '}
        <button onClick={() => { failNext = true; setKey(k => k + 1); }}>Remount, make it fail</button>{' '}
        <button onClick={() => setKey(k => k + 1)}>Remount, succeed</button>
        <div style={{ marginTop: 8 }}><UserListContainer key={key} /></div>
      </div>
      <div style={card}>
        <strong>Presenter fixtures (no network, instant)</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
          {fixtures.map(f => (
            <div key={f.label} style={{ border: '1px dashed #cbd5e1', padding: 8, borderRadius: 6 }}>
              <div style={{ ...muted, marginBottom: 4 }}>{f.label}</div>
              <UserListView {...f.props} />
            </div>
          ))}
        </div>
      </div>
      <details style={card}>
        <summary>The original bloated version, for comparison</summary>
        <BloatedUserList />
      </details>
    </section>
  );
}

// ─── Exercise 2: The Presenter in Disguise ───────────────────
//
// SITUATION
//   ProductCardBad is described as "just a card". But it fetches its own
//   data, so you can't render it without the network, can't show a
//   fixture in Storybook, and every card on a page triggers a request.
//
// YOUR TASK
//   1. Implement ProductCardView: props { product: Product | null; onAdd(): void }
//      Pure. Render a skeleton when product is null.
//   2. Implement ProductCardContainer({ id }) — fetches with fetchProduct,
//      renders ProductCardView, and increments the cart via onAdd.
//   3. Watch "network requests so far". Rendering the fixture row (which uses
//      ProductCardView with hard-coded props) must NOT increase it.

type Product = { id: number; title: string; price: number };
let requests = 0;
function fetchProduct(id: number): Promise<Product> {
  requests++;
  return new Promise(res =>
    setTimeout(() => res({ id, title: `Widget #${id}`, price: 10 * id + 0.99 }), 400),
  );
}

const ProductCardBad: FC<{ id: number }> = ({ id }) => {
  const [p, setP] = useState<Product | null>(null);
  useEffect(() => { fetchProduct(id).then(setP); }, [id]);
  return <div style={card}>{p ? `${p.title} — $${p.price}` : 'loading…'}</div>;
};

// TODO 1
const ProductCardView: FC<{ product: Product | null; onAdd: () => void }> = ({ product, onAdd }) => {
  void product; void onAdd;
  return <div style={card}>ProductCardView stub</div>;
};

// TODO 2
const ProductCardContainer: FC<{ id: number; onAdd: () => void }> = ({ id, onAdd }) => {
  void id;
  return <ProductCardView product={null} onAdd={onAdd} />;
};

function Exercise2() {
  const [cart, setCart] = useState(0);
  const [, refresh] = useState(0);
  return (
    <section>
      <h2>Exercise 2 — Presenter in Disguise</h2>
      <p style={muted}>
        Cart: {cart} · network requests so far: <strong>{requests}</strong>{' '}
        <button onClick={() => refresh(n => n + 1)}>refresh count</button>
      </p>
      <h4>Anti-pattern (fetches inside)</h4>
      <ProductCardBad id={1} />
      <h4>Fixtures with ProductCardView — zero requests</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        <ProductCardView product={null} onAdd={() => {}} />
        <ProductCardView product={{ id: 9, title: 'Fixture', price: 1 }} onAdd={() => setCart(c => c + 1)} />
      </div>
      <h4>Container + presenter</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        {[2, 3].map(id => <ProductCardContainer key={id} id={id} onAdd={() => setCart(c => c + 1)} />)}
      </div>
    </section>
  );
}

// ─── Exercise 3: View Model + Memo-Friendly Presenter ────────
//
// SITUATION
//   The API speaks snake_case DTOs. The presenter should never see them —
//   it needs view-shaped data. Also, the presenter is React.memo'd; a
//   careless container hands it new array/function identities on every
//   render, so an UNRELATED parent re-render re-renders the list.
//
// YOUR TASK
//   1. toMemberVM(dto): { id, fullName, badge: 'active' | 'inactive' }
//   2. useMembers(): keep DTOs in state; return
//        members (useMemo — stable identity) and onRemove (useCallback).
//   3. Click "Unrelated re-render". The presenter's render count must NOT
//      increase. With the stub it climbs every click — find out why.

type MemberDTO = { id: number; first_name: string; last_name: string; is_active: boolean };
type MemberVM = { id: number; fullName: string; badge: 'active' | 'inactive' };

const INITIAL_DTOS: MemberDTO[] = [
  { id: 1, first_name: 'Ada', last_name: 'Lovelace', is_active: true },
  { id: 2, first_name: 'Alan', last_name: 'Turing', is_active: false },
  { id: 3, first_name: 'Grace', last_name: 'Hopper', is_active: true },
];

function toMemberVM(dto: MemberDTO): MemberVM {
  // TODO 1
  return { id: dto.id, fullName: '?', badge: 'inactive' };
}

const MemberListView = memo(function MemberListView(props: {
  members: MemberVM[];
  onRemove: (id: number) => void;
}) {
  const renders = useRef(0);
  renders.current++;
  return (
    <div style={card}>
      <div style={muted}>presenter renders: <strong>{renders.current}</strong></div>
      <ul>
        {props.members.map(m => (
          <li key={m.id}>
            {m.fullName} <em>({m.badge})</em>{' '}
            <button onClick={() => props.onRemove(m.id)}>remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
});

function useMembers() {
  const [dtos, setDtos] = useState(INITIAL_DTOS);
  // TODO 2: useMemo(() => dtos.map(toMemberVM), [dtos]) — and useCallback for onRemove
  const members = dtos.map(toMemberVM);
  const onRemove = (id: number) => setDtos(d => d.filter(x => x.id !== id));
  return { members, onRemove };
}

function Exercise3() {
  const [unrelated, setUnrelated] = useState(0);
  const vm = useMembers();
  return (
    <section>
      <h2>Exercise 3 — View Model &amp; Stable Props</h2>
      <button onClick={() => setUnrelated(n => n + 1)}>Unrelated re-render ({unrelated})</button>
      <MemberListView {...vm} />
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: make UserListView accept a `renderEmpty` prop for a custom empty state.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 02 — Container–Presenter</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
