# Slot Pattern (Named Slots for Layout)

## Quick Reference

| Style | Looks like | The caller controls | Layout controls |
|---|---|---|---|
| **Prop slots** | `<Card header={<Title/>} footer={<Actions/>} />` | Content of each region | Position, wrapper, styling |
| **Child slots** | `<Layout><Layout.Header/>…<Layout.Sidebar/></Layout>` | Content *and* (accidentally) source order | Where each part *actually* renders |
| **Function slots** | `<Panel header={({ open }) => …} />` | Content that depends on internal state | The state and when to call it |
| **`asChild` / `Slot`** | `<Button asChild><a href>…</a></Button>` | Which element renders | Props/behaviour merged onto it — see Phase 4 |
| **Fallback / empty** | Missing slot → default or no wrapper | — | Skips empty wrappers, keeps semantics clean |

## Where You've Seen This Before

Two different things get called "slot" — don't mix them up:

1. **Layout slots** (this topic): named regions in a component (Vue's `<slot name="header">`, Web Components' `<slot>`).
2. **`asChild` / Radix `Slot`**: a *prop-merging* primitive that renders your element with the component's props → fully covered in [Phase 4: Slot pattern / asChild](../../phase-04-component-patterns/12-slot-pattern-as-child/notes.md).

Related ground:

- Composition over inheritance — `children` and prop-passing of elements → [Phase 4: Composition over inheritance](../../phase-04-component-patterns/01-composition-over-inheritance/notes.md)
- Inspecting children (`Children.toArray`, `isValidElement`) and why it's fragile → [React.Children utilities](../../phase-04-component-patterns/08-react-children-utilities/notes.md)
- Compound components as the alternative → [Topic 4](../04-compound-component-pattern/notes.md)
- Semantic landmarks a layout should emit → [ARIA roles & labels](../../phase-13-tooling-security-a11y/07-aria-roles-labels/notes.md)

**New here:** slots as a *layout-design* tool — the four styles, how a layout can **enforce placement regardless of the order callers write things**, empty-slot handling, and a clear rule for slots vs compound components.

## What Is This?

A **slot** is a named region of a component that the caller fills with content. The component owns *where* the region sits, its wrapper element, spacing and semantics; the caller owns *what goes in it*.

```tsx
<PageLayout
  header={<NavBar />}
  sidebar={<Filters />}
  footer={<Legal />}
>
  <ProductGrid />        {/* default slot: children */}
</PageLayout>
```

Compare with a props soup (`title`, `showFooter`, `footerText`, `footerLinks`) — slots replace *data configuration* with *content injection*. `PageLayout` doesn't know what a `NavBar` is; it only knows there is a header region.

> **Check yourself:** What does `PageLayout` still control in the example above, even though the caller supplied all the content? Give three things.

## Why Does It Exist?

**Fixed structure, variable content.** Cards, page shells, dialogs, dashboards, list items, and app frames have a stable skeleton (header / body / footer, sidebar / main) but content varies wildly per use. Slots let you standardise the skeleton in one place — spacing, responsive behaviour, landmarks, focus order — while staying content-agnostic.

**Avoiding prop explosion.** Without slots you either accept ever more props (`headerIcon`, `headerBadge`, `headerActions`) or force everyone to rebuild the layout. A slot is one prop that accepts *anything*.

**Empty-region intelligence.** Because the layout owns the wrappers, it can skip a `<footer>` entirely when no footer content is given — no empty box with padding.

## How It Works

### 1. Prop slots — the simplest, most common

```tsx
type CardProps = {
  media?: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;                     // the default slot
};

function Card({ media, header, actions, footer, children }: CardProps) {
  return (
    <article className="card">
      {media && <div className="card__media">{media}</div>}
      {(header || actions) && (
        <header className="card__header">
          <div>{header}</div>
          <div>{actions}</div>
        </header>
      )}
      <div className="card__body">{children}</div>
      {footer && <footer className="card__footer">{footer}</footer>}
    </article>
  );
}
```

`ReactNode` accepts elements, strings, arrays and `null`. The `&&` guards implement **empty-slot handling**. Note the falsy trap: `0` renders "0" — guard with `!= null` or Boolean when a slot may be numeric.

### 2. Child slots — callers write markup, layout decides placement

```tsx
<Layout>
  <Layout.Footer>© 2026</Layout.Footer>      {/* written first … */}
  <Layout.Main>…</Layout.Main>
  <Layout.Header>…</Layout.Header>           {/* … but renders on top */}
</Layout>
```

The layout scans `children`, sorts elements into named buckets by their **type**, and renders them where *it* wants:

```tsx
function extractSlots(children: ReactNode, markers: Record<string, ComponentType<any>>) {
  const slots: Record<string, ReactNode> = {};
  const rest: ReactNode[] = [];
  Children.forEach(children, child => {
    const name = isValidElement(child)
      ? Object.keys(markers).find(k => child.type === markers[k])
      : undefined;
    if (name) slots[name] = child; else rest.push(child);
  });
  return { slots, rest };
}
```

This is where slots differ from compound components: **the layout, not the caller, decides order.** In a compound component the caller's JSX order *is* the visual order.

Limits of child-scanning (all from Phase 4's `React.Children` warning): it only sees **direct children**, so a slot wrapped in a `<div>`, a Fragment, or a HOC (whose type isn't the marker) is silently not found; `child.type` identity breaks across hot reloads/bundle duplicates unless you use a stable marker (`displayName` or a static symbol). For anything beyond simple layouts, prefer **prop slots** — they're explicit, typed, and can't be silently missed.

### 3. Function slots — content that needs the component's state

```tsx
type PanelProps = {
  header: ReactNode | ((s: { open: boolean; toggle: () => void }) => ReactNode);
  children: ReactNode;
};

function Panel({ header, children }: PanelProps) {
  const [open, setOpen] = useState(true);
  const toggle = () => setOpen(o => !o);
  return (
    <section>
      <div>{typeof header === 'function' ? header({ open, toggle }) : header}</div>
      {open && <div>{children}</div>}
    </section>
  );
}

<Panel header={({ open, toggle }) => <button onClick={toggle}>{open ? '▾' : '▸'} Details</button>}>…</Panel>
```

Function slots are render props ([Topic 5](../05-render-prop-pattern/notes.md)) scoped to one region. Accept `ReactNode | function` so simple cases stay simple.

### 4. Semantics come with the layout

A well-designed layout emits the right elements: `<header>`, `<nav>`, `<aside>`, `<main>`, `<footer>` (or `role`s), one `<main>` per page, headings in order. Callers filling slots inherit correct landmarks for free — one of the strongest arguments for slots over ad-hoc `div` composition.

### 5. Slots vs compound components

| | Slots | Compound components |
|---|---|---|
| Shared state between parts | Rarely / none | Central — the point |
| Who decides render **order** | The layout | The caller |
| Discovery mechanism | Props (explicit) or child scanning (fragile) | Context (robust) |
| Best for | Page shells, cards, list items, app frames | Tabs, accordions, menus, selects, modals |
| Typing | Trivial (`ReactNode`) | Requires typed context + dot-notation |
| Danger | Silent misses when scanning children | Parts used outside the root |

Rule of thumb: **if parts must coordinate state → compound; if they're just named regions → slots.** They compose: a compound `Card.Root` can expose slot props too.

> **Check yourself:** You're building `<Dialog>` with a title, body and buttons, and the title must be linked via `aria-labelledby` to the dialog. Slots or compound? What if the layout should show a close "×" only when a `title` slot exists?

## Gotchas

**Falsy values render.** `{footer && …}` with `footer = 0` renders `0`. Use explicit `footer != null`/`Boolean(footer)` when slots may be numbers.

**`Children.count` lies about emptiness.** `null`, `false`, and `undefined` still count as children in some cases; use `Children.toArray(children).length` (which filters them) to test emptiness.

**Fragments hide slots.** `Children.forEach` doesn't flatten fragments, so `<><Layout.Header/><Layout.Main/></>` yields one child (the fragment). Flatten manually or document that slots must be direct children.

**Type-identity matching.** `child.type === Layout.Header` fails through HOCs, `memo` wrappers and duplicated module instances. Prefer prop slots, or mark parts with a static field and match on that.

**Duplicates.** Two `<Layout.Header>` children — last wins? throw? render both? Decide and document.

**Slot content re-renders with the layout.** Slots are created by the caller, so they don't re-render when the layout's own state changes (element identity is stable) — which is usually *good* and is the "lift content up" trick from [Topic 12](../12-performance-rerender-patterns/notes.md). Function slots, however, re-run on every layout render.

**Over-slotting.** Ten slots means a layout too general to enforce anything. If everything is a slot, you've built `div`.

**Don't confuse with `asChild`.** That's a different mechanism (prop merging onto one child element) — [Phase 4](../../phase-04-component-patterns/12-slot-pattern-as-child/notes.md).

## Interview Questions

**Q (High): What is the slot pattern and when do you use it?**

Answer: A component defines named regions and the caller supplies content for each — via props typed `ReactNode` (`header`, `footer`), `children` for the default slot, or marker child components. The component controls placement, wrappers, spacing and semantics; the caller controls content. It's used for layouts, cards, dialogs and app shells where the skeleton is fixed but the contents vary, and it replaces an ever-growing set of data props with a single content-injection prop per region.

The trap: Confusing it with `asChild`/Radix `Slot`, or describing only "passing JSX as props" without the ownership split.

**Q (High): Slots vs compound components — how do you choose?**

Answer: Compound components share state through context and let the caller arrange parts; slots are named regions in a layout the component arranges itself, usually with no shared state. If parts coordinate (active tab, open panel), use compound. If it's "this content goes there," use slots. They combine: compound roots can expose slot props for simple regions.

The trap: Saying they're the same or that one always beats the other.

**Q (Medium): How do you implement child-based slots and what can go wrong?**

Answer: Iterate `Children`, match each element's `type` against marker components (`Layout.Header`), and route to named buckets; leftover children go to the default slot. It lets callers write slots in any order while the layout fixes placement. Failure modes: only direct children are seen (wrappers and fragments hide slots), `type` matching breaks across HOCs/memo/duplicate modules, and duplicates are ambiguous. For robustness prefer prop slots or match on a static marker and document constraints.

The trap: Not mentioning fragments/wrappers, or presenting `React.Children` scanning as reliable.

**Q (Medium): How do you handle an empty slot?**

Answer: The layout owns the wrapper, so it renders it only when there is content — e.g. `footer != null && <footer>…</footer>` — avoiding empty padded boxes and empty landmarks. Be careful with falsy values like `0` (`{0 && …}` renders `0`) and use `Children.toArray(children).length` when detecting empty children since it strips `null`/`false`. Optionally provide a fallback default for the slot.

The trap: Using `&&` with numeric slots, or `Children.count` for emptiness.

**Q (Medium): When do you need a function slot?**

Answer: When the slot content depends on state the layout owns (`open`, `selected`, `isPending`) — e.g. a collapsible panel's header needs to render a toggle. Accept `ReactNode | ((state) => ReactNode)` so simple cases don't need a function. It's a render prop scoped to one region.

The trap: Reaching for a function slot when a compound component with context would let parts read the state directly.

**Q (Low): How do slots affect re-rendering?**

Answer: Slot content is created by the caller, so if the layout re-renders due to its own state, the elements passed in are the same references and React can skip re-rendering them — the same principle as lifting content up with `children`. Function slots are re-invoked every layout render, so keep them cheap or memoise their output.

The trap: Assuming slots always cause the content to re-render.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can distinguish layout slots from `asChild`/Radix `Slot`
- [ ] Can build a `Card` with prop slots, a default `children` slot, and empty-slot handling
- [ ] Can write `extractSlots` for child-based slots and list its four failure modes
- [ ] Can write a function slot accepting `ReactNode | ((state) => ReactNode)`
- [ ] Can choose slots vs compound components for three example components
- [ ] Can explain why slot content isn't re-rendered when the layout re-renders

---
*Next: [Strategy Pattern](../15-strategy-pattern/notes.md) — from choosing where content goes to choosing how behaviour varies: replacing growing if/else chains with interchangeable strategies.*
