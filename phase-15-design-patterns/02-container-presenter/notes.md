# Container–Presenter

## Quick Reference

| Role | Knows about | Doesn't know about | Typical shape |
|---|---|---|---|
| **Container** | Data sources, side effects, business rules, which handlers exist | How anything looks | Calls hooks, returns `<View {...props} />` — almost no markup |
| **Presenter** | Props → markup, styling, UI-only state (open/closed, hover) | Where data came from, what happens on submit | Pure function of props; trivially testable / storybook-able |
| **Boundary** | A typed props contract | — | `type ViewProps = { users: User[]; status: …; onRetry(): void }` |
| **Modern form** | A hook plays the container; the component stays thin | — | `const vm = useUsers(); return <UsersView {...vm} />` |

## Where You've Seen This Before

The *idea* — separate "what happens" from "what it looks like" — runs through several earlier topics. What this topic adds is the **explicit two-role vocabulary and the props-contract boundary**.

- Data flows down, events flow up; lifting state → [One-way data flow](../../phase-01-fundamentals/05-one-way-data-flow/notes.md)
- Logic extracted into a function that composes → [Custom hooks as the modern pattern](../../phase-04-component-patterns/05-custom-hooks-modern-pattern/notes.md) (the hook is the container's modern successor — see the comparison below)
- Presenters are the easy half to test → [RTL philosophy](../../phase-10-testing/01-rtl-philosophy/notes.md)
- Server Components as containers, Client Components as presenters → [Client vs server components](../../phase-11-modern-react/05-client-vs-server-components/notes.md)

**New here:** the pattern as a *design decision* — where exactly to draw the line, what the contract between the two looks like, and when the split is overkill.

## What Is This?

Container–Presenter (Dan Abramov's "smart and dumb components," 2015) splits a feature into two kinds of component:

- A **presenter** (a.k.a. presentational / view / dumb) is a pure rendering component. Everything it shows arrives as props; every user action it needs is a callback prop. It has no idea if the data came from REST, GraphQL, localStorage or a test fixture.
- A **container** (a.k.a. smart) owns the *how it works* side: fetching, state, derived values, event handlers with real consequences. It renders a presenter and feeds it props. It contains nearly no markup of its own.

```tsx
// Presenter — knows nothing except its props
type UserListViewProps = {
  users: User[];
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  onSelect: (id: number) => void;
};

function UserListView({ users, status, onRetry, onSelect }: UserListViewProps) {
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <button onClick={onRetry}>Retry</button>;
  return <ul>{users.map(u => <li key={u.id} onClick={() => onSelect(u.id)}>{u.name}</li>)}</ul>;
}

// Container — knows nothing about markup
function UserListContainer() {
  const { data, isLoading, isError, refetch } = useUsersQuery();
  const navigate = useNavigate();
  return (
    <UserListView
      users={data ?? []}
      status={isLoading ? 'loading' : isError ? 'error' : 'ready'}
      onRetry={refetch}
      onSelect={id => navigate(`/users/${id}`)}
    />
  );
}
```

> **Check yourself:** In the snippet, which component would you unit-test with hand-written props, and which would you test against a mocked network? Why is that a *benefit* of the split rather than a cost?

## Why Does It Exist?

The problem is **one component, two reasons to change**. When the API shape changes, the component changes. When the designer changes the layout, the same component changes. Two unrelated forces editing one file means merge conflicts, fear of touching it, and tests that must mock the network just to check that an empty list says "No users."

The split gives you:

1. **Independent testing.** Presenters are tested by rendering with props — no mocks, no providers. Containers are tested for "given this data, does it pass the right props / call the right handler?"
2. **Independent reuse.** The same `UserListView` can be driven by REST in production, fixtures in Storybook, and a websocket feed on an admin screen.
3. **Independent work.** A designer or another engineer can build the view against a typed props contract before the endpoint exists.
4. **Fewer render surprises.** Effects, subscriptions and derived state live in one place; the view is a pure function of props, so re-render behaviour is trivially predictable.

Why did it become *less* fashionable? Before hooks, the only way to share logic was HOCs (`connect(mapState)(View)`), which made containers awkward wrapper components. Hooks made it possible to put the logic *inside* the component without a class or wrapper. Abramov himself later noted he no longer recommends splitting as a rule — the point is the separation of concerns, not the two-file ritual.

> **Check yourself:** If hooks let one component hold both logic and markup cleanly, what does the explicit Presenter boundary still buy you that a custom hook alone doesn't?

## How It Works

### Step 1 — Recognise the smell

```tsx
// Everything in one place: fetch + loading flags + transform + markup
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => { setUsers(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
  if (loading) return <Spinner />;
  if (error) return <p>{error}</p>;
  return <ul>{sorted.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### Step 2 — Draw the line at the props contract

Ask: "what does the markup *need*?" Not "what do I have?" The presenter's props describe **view needs** (`status`, a sorted list, callbacks) rather than **data-layer shapes** (`response`, `axiosError`, `queryClient`). This is what keeps the presenter free of knowledge about where data came from.

### Step 3 — The container is thin glue

Business rules, sorting, mapping API → view model, permissions: all live here (or in a hook the container calls). The container's output should be one JSX element.

### Step 4 — Break big presenters down

A presenter can itself be a tree of smaller presenters (`UserListView` → `UserRow` → `Avatar`). Rule: presenters only call other presenters. The moment a nested component starts fetching, it's a container in disguise — treat it as one.

### The hook-as-container form

```tsx
function useUserList() {                       // logic — the "container"
  const { data, isLoading, isError, refetch } = useUsersQuery();
  const navigate = useNavigate();
  const sorted = useMemo(() => [...(data ?? [])].sort(byName), [data]);
  return {
    users: sorted,
    status: isLoading ? 'loading' as const : isError ? 'error' as const : 'ready' as const,
    onRetry: refetch,
    onSelect: (id: number) => navigate(`/users/${id}`),
  };
}

export function UserList() { return <UserListView {...useUserList()} />; }
```

Same separation, no extra wrapper *component* in the logic layer. The `UserListView` props contract is still the seam.

| | Container component | Hook as container |
|---|---|---|
| Extra tree node | Yes | No |
| Logic testable in isolation | Via rendering | `renderHook` |
| Feels like | The 2015 pattern | The 2020+ default |
| Best when | You want a hard, reviewable boundary (design-system view + app wiring) | You want minimal ceremony |

> **Check yourself:** A colleague's "presenter" calls `useQuery` inside a button subcomponent "just for the tooltip text." What has just happened to your architecture, and what are two ways to fix it?

## Container–Presenter in the Server Components Era

React Server Components (Phase 11) make the pattern structural. A Server Component can `await db.users.findMany()` — it is a container by construction. It passes plain serialisable props to a Client Component that owns interactivity — a presenter with UI state. The rule "presenters don't fetch" is now enforced by the runtime: client components *can't* `await` a database. If you've internalised Container–Presenter, RSC composition feels natural.

## When Not To Use It

- **One-off components** whose "logic" is a single `useState`. Splitting a 25-line component into two files is ceremony.
- **When the props contract would be huge.** If the presenter needs 15 props and 10 callbacks, the boundary is wrong — the presenter is probably two presenters, or a compound component wants to be born (Topic 4).
- **Highly interactive widgets** (drag surfaces, canvases) where view and behaviour are one cohesive thing. Extract behaviour into a hook; don't force a view/container rift.

## Gotchas

**The presenter is allowed UI state.** "Presenter = stateless" is a common oversimplification. A dropdown's `isOpen`, a tooltip's hover, an input's uncommitted draft are UI concerns and belong in the presenter. What it must not own is *application* state or data acquisition.

**Leaky contracts.** Passing `{...queryResult}` or a raw API DTO into the presenter couples it to the data layer. Map to view-shaped props in the container.

**Callback identity.** Containers that create inline handlers (`onSelect={id => …}`) hand the presenter a new function every render. If the presenter is memoised, that defeats `React.memo` — wrap with `useCallback` or stabilise inside the hook (Topic 12).

**Container hell.** Chains of Container → Container → Container each passing props down just re-create prop drilling. If a value is needed several layers deep, use Context (Topic 8) rather than another container.

**A presenter that grows a `useEffect` is a container in disguise.** The review rule of thumb: effects, subscriptions and network calls are red flags inside presenters.

**Naming is not the pattern.** Files named `FooContainer.tsx` and `FooView.tsx` that each still mix concerns give you the ritual without the benefit.

## Interview Questions

**Q (High): What is the Container–Presenter pattern and what problem does it solve?**

Answer: It separates a feature into a *container* that owns data, state and side effects and a *presenter* that renders UI purely from props. It solves the "two reasons to change" problem — layout changes and data/logic changes are decoupled. Presenters become trivially testable and reusable (same view for real data, fixtures, Storybook); containers concentrate the side effects so behaviour is easy to reason about. The seam is a typed props contract shaped by what the view needs.

The trap: Describing it as "smart vs dumb, because that's the rule." Explain the benefits: testing, reuse, independent change — and admit the cost (another component / boundary to maintain).

**Q (High): Does the pattern still matter now that we have hooks?**

Answer: The *separation of concerns* does; the *wrapper component* is optional. A custom hook is a lighter container — it holds fetching, derived data and handlers, and the component is a thin shell that spreads the hook's return value into a presenter. I still keep a distinct presenter with a typed props contract when I want Storybook stories, a design-system component with no data dependencies, or trivial unit tests. For a small one-off component I skip the split.

The trap: "Hooks made it obsolete." Or the opposite: dogmatically splitting every component. The senior answer is contextual.

**Q (High): What belongs in a presenter and what doesn't? Can it have state?**

Answer: Markup, styling, layout, accessibility attributes, and UI-only state (dropdown open, hover, focus, an uncommitted input draft). It shouldn't fetch, subscribe, read app-level state stores, or call business logic. The litmus test: could I render it in Storybook with just props and no providers? If yes, it's a presenter.

The trap: Saying "presenters must be stateless." That would make every accordion's `isOpen` a container concern, which is silly.

**Q (Medium): How do you test each half?**

Answer: Presenter: render with props for each view state (`loading`, `error`, empty, populated) and assert markup and callback calls — no mocking. Container (or hook): mock the data layer (MSW / query client) and assert that the right props reach the presenter and that handlers trigger the right side effects, often via `renderHook` for the hook form. Then a couple of integration tests render the container→presenter pair together. The split means most tests are fast and mock-free.

The trap: Only describing end-to-end tests, or mocking child components so heavily that nothing real is tested.

**Q (Medium): How does this pattern map onto Server and Client Components?**

Answer: Server Components are natural containers — they can fetch directly and pass serialisable data down. Client Components are natural presenters plus interactivity. The boundary (`'use client'`) enforces that presenters can't use server-only APIs. It's the same pattern with the runtime enforcing it, and it improves bundle size since container logic never ships to the browser.

The trap: Thinking RSC is unrelated to component-design patterns.

**Q (Medium): The presenter's props list keeps growing. What does that tell you?**

Answer: The boundary is in the wrong place or the presenter is doing too much. Options: split into smaller presenters each with a focused contract; group related props into a view-model object; move to compound components so the caller composes the parts; or use Context for values many descendants need. A 15-prop presenter is a smell in its own right.

The trap: "Just use an object prop / spread everything." That hides the smell without curing it.

**Q (Low): What was Dan Abramov's later position on this pattern?**

Answer: He said he no longer pushes the strict split — hooks give the same separation without the wrapper, and forcing the split can be premature. The value is separation of concerns, not a mandated file structure.

The trap: Quoting the original blog post as gospel.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can define container and presenter and state what each is *not* allowed to know
- [ ] Can refactor a fetch-and-render component into a container + presenter with a typed props contract
- [ ] Can explain the hook-as-container form and when a distinct presenter is still worth it
- [ ] Can name three reasons the split helps (testing, reuse, independent change) and two cases where it's overkill
- [ ] Can describe how RSC / Client Components map onto the pattern
- [ ] Can spot a "presenter in disguise" (effects/fetching inside a supposedly dumb component)

---
*Next: [State vs Refs, Controlled vs Uncontrolled](../03-state-vs-refs-inputs/notes.md) — once logic and UI are separated, the next question is who owns a value: React state, or the DOM itself.*
