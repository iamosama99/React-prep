# Compound Components (as a Design Pattern)

## Quick Reference

| Smell | Pattern move | Result |
|---|---|---|
| `<Modal title body footer showHeader headerIcon … />` — prop soup | `<Modal><Modal.Header/><Modal.Body/><Modal.Footer/></Modal>` | Caller controls structure; API stops growing |
| Sub-parts need shared state (open, active tab, selected) | Root owns state, shares it via a **private Context** | No prop threading, works at any depth |
| Parts are meaningless alone | Expose as `Parent.Child` (dot notation) | Family relationship visible at the call site |
| Sub-part used outside its root | Guard hook throws a named error | Misuse fails loudly, not silently |
| Need both quick-start and full control | Root supports `value`/`defaultValue`/`onChange` | Same component for prototypes and forms |

## Where You've Seen This Before

The mechanics are fully covered — do not re-derive them here:

- Context-based compound components, `cloneElement` limits, dual-mode root, dot notation, private context + guard hook → [Phase 4: Compound components](../../phase-04-component-patterns/02-compound-components/notes.md)
- Building `Tabs` under interview conditions → [Phase 14: Tabs component](../../phase-14-live-coding/07-tabs-component/notes.md)
- The controlled/uncontrolled root → [Topic 3](../03-state-vs-refs-inputs/notes.md) (`useControllableState`)
- Accessibility roles the parts must carry → [ARIA roles & labels](../../phase-13-tooling-security-a11y/07-aria-roles-labels/notes.md)

**New here:** the *design decision* — recognising prop soup, choosing between compound components, slots (Topic 14) and render props (Topic 5), typing the dot-notation API in TypeScript, wiring accessibility IDs between parts, and the **registration** variant for parts that must know about each other (roving focus).

## What Is This?

Compound components are a family of components that only make sense together and share hidden state — like `<select>` and `<option>`. The **root owns state and behaviour**; the **parts own presentation and position**. The caller decides which parts appear and where.

```tsx
<Modal>
  <Modal.Trigger>Delete project</Modal.Trigger>
  <Modal.Content>
    <Modal.Header><WarningIcon /> Delete “Apollo”?</Modal.Header>
    <Modal.Body>This can’t be undone.</Modal.Body>
    <Modal.Footer>
      <Modal.Close>Cancel</Modal.Close>
      <Button variant="danger" onClick={remove}>Delete</Button>
    </Modal.Footer>
  </Modal.Content>
</Modal>
```

Nobody passed `title=` or `footerButtons=`; the JSX *is* the configuration. That's why this is described as **inversion of control over structure**.

> **Check yourself:** In the example above, which pieces of state does `Modal` own, and which pieces does the caller own? Where does `remove` live and why does that matter?

## Why Does It Exist?

The single-component API grows by accretion:

```tsx
<Modal
  title="Delete?"
  body="This can’t be undone."
  footerButtons={[{ label: 'Cancel', variant: 'ghost' }, { label: 'Delete', variant: 'danger' }]}
  showHeader
  headerIcon="warning"
  footerAlign="right"
  closeOnOverlay={false}
/>
```

Every new requirement ("put a checkbox in the footer", "no header on mobile", "second body section") adds a prop or a render-callback prop, and the surface area and internal branching grow without bound. It also can't express anything the author didn't foresee. That's **prop soup**, and it is the trigger smell for this pattern.

Compound components trade a *bigger surface for the author* (several exported parts) for a *smaller, more learnable surface for the caller* (they already know how to compose JSX). They give you the flexibility of HTML composition with encapsulated behaviour.

> **Check yourself:** Compound components make the caller's JSX longer. When is that a good trade and when is it a bad one?

## How It Works — The Design Decisions

The Context mechanics are in Phase 4. What's worth deciding deliberately:

### 1. Root vs part: where does state live?

The root owns *shared, cross-part state* (open, active value, selected id). A part owns *local presentation state* only. If two sibling parts need to coordinate, that coordination goes through the root's context — never through a shared module variable.

### 2. Typing the dot-notation API

```tsx
type ModalContextValue = { open: boolean; setOpen: (v: boolean) => void; titleId: string };
const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(part: string) {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error(`<Modal.${part}> must be rendered inside <Modal>`);
  return ctx;
}

function ModalRoot({ children, defaultOpen = false }: { children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();
  const value = useMemo(() => ({ open, setOpen, titleId }), [open, titleId]);
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

function ModalHeader({ children }: { children: React.ReactNode }) {
  const { titleId } = useModalContext('Header');
  return <h2 id={titleId}>{children}</h2>;
}
// … Trigger, Content, Body, Footer, Close

export const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger, Content: ModalContent, Header: ModalHeader,
  Body: ModalBody, Footer: ModalFooter, Close: ModalClose,
});
```

`Object.assign` returns a correctly typed intersection (`typeof ModalRoot & { Header: … }`) and declares the whole API in one place. Assigning statics afterwards (`ModalRoot.Header = ModalHeader`) does type-check when `ModalRoot` is a plain function declaration or `const` arrow, but it's a type error as soon as the root is wrapped (`memo(...)`, `forwardRef(...)`) because those return an exotic component type with no `Header` property. Pass the *part name* into the guard so the error tells the developer exactly which part was misused.

### 3. Wiring accessibility between parts

Parts often need to point at each other (`aria-labelledby`, `aria-controls`). The root generates IDs with `useId` and shares them via context; the parts apply them. The caller never sees an ID and can't get it wrong.

```tsx
<div role="dialog" aria-modal="true" aria-labelledby={titleId}>…</div>
```

### 4. When parts must *know about each other*: registration

Sometimes the root needs to know how many parts exist or their order — roving-focus tabs, menu keyboard navigation, "step 2 of 5". With `cloneElement` you'd inspect `children`, which breaks the moment someone wraps a part in a `<div>`. The robust alternative is **registration**: each part registers itself with the root via context in an effect, and the root keeps an ordered list in a ref/state.

```tsx
function Tab({ value }: { value: string }) {
  const { register } = useTabsContext('Tab');
  useEffect(() => register(value), [register, value]);   // register returns an unregister cleanup
}
```

For simple cases you can skip registration and query the DOM (`e.currentTarget.parentElement?.querySelectorAll('[role="tab"]')`) inside the key handler — good enough for arrow-key navigation, and no state needed.

### 5. Controlled + uncontrolled

Put `value` / `defaultValue` / `onChange` on the **root**, backed by `useControllableState` ([Topic 3](../03-state-vs-refs-inputs/notes.md)). Parts should never care which mode is active.

> **Check yourself:** A teammate wraps `<Modal.Close>` in a `<div className="actions">`. With a `cloneElement` implementation it silently stops working. With registration or plain Context, why does it keep working?

## Choosing Between the Composition Patterns

| | Compound components | Slots (Topic 14) | Render props (Topic 5) | Config props |
|---|---|---|---|---|
| Caller controls | Structure *and* order | Which content goes in named regions | What renders, at render time, given values | Data only |
| Shared state | Implicit via context | Usually none | Explicit — passed to the function | None |
| Best for | Modals, tabs, menus, accordions, selects | Layouts, cards, page shells | Headless behaviour where child needs values | Simple, closed components |
| Cost | More exports; needs a root | Fixed layout; less dynamic | Callback nesting | Prop soup at scale |

Rule of thumb: **if the parts share state, compound; if they're just named regions, slots; if the child needs live values to decide its own subtree, render prop (or a hook).**

## Gotchas

**The Context object must be private.** Exporting it lets callers read/write internals and freezes your implementation into a public API.

**Unstable context value.** `value={{ open, setOpen }}` builds a new object every render and re-renders every part. Memoise (`useMemo`) or split into state and dispatch contexts (Phase 6: Context optimisation).

**Silent misuse.** `createContext(defaultValue)` with a non-null default lets parts render outside their root and quietly do nothing. Use `null` + a guard that throws.

**Server Components.** Context needs a Client Component. Compound components are inherently `'use client'`; put the boundary on the file that defines the root and parts.

**Over-flexibility.** Because callers can arrange anything, they can also produce invalid structures (`Modal.Footer` before `Modal.Header`). Decide whether you care (docs, lint) or enforce with dev-only checks.

**Dot notation and tree-shaking.** `Object.assign` couples all parts to the root; a bundler can't drop unused parts. If bundle size matters in a design system, also export parts as named exports.

**Prop-drilling through parts is a smell.** If parts need many props from the root, you've re-invented prop soup inside the family. Push it into context.

## Interview Questions

**Q (High): When would you choose compound components over a props-based API, and what does it cost?**

Answer: When the component has several distinct regions the caller may need to arrange, add to, or omit — modals, tabs, menus, accordions — and when those regions share state. The trigger smell is prop soup: a growing pile of `title`, `footer`, `showX` props and render callbacks. Compound components invert control so the caller composes structure with JSX, while the root encapsulates behaviour. Costs: more exports and documentation, more surface area for the author, possible misuse (parts outside the root or in invalid order), Context (client-only in RSC), and a slightly longer call site.

The trap: Answering only "cleaner syntax." Tie it to inversion of control and name the cost.

**Q (High): Why use Context instead of `React.Children.map` + `cloneElement` to share state?**

Answer: `cloneElement` injects props only into *direct* children, so any wrapper element (`<div>`, fragment, conditional component) breaks the link; it also chokes on non-element children and forces every part to declare the injected props. Context reaches any descendant at any depth, doesn't inspect children, and leaves the parts' public props clean.

The trap: Not naming the concrete failure — "children wrapped in a div."

**Q (High): How do you type compound components in TypeScript, and what's the catch with `Modal.Header = ModalHeader`?**

Answer: Define each part as its own function, then export `Object.assign(Root, { Header, Body, … })` — the result is typed as `typeof Root & { Header: …; … }` in one expression. Assigning statics afterwards is allowed by TypeScript for plain function/arrow roots, but breaks the moment the root is wrapped in `memo` or `forwardRef` (the exotic component type has no such property), and it spreads the public API across several statements. I also give the guard hook a `part` argument so thrown errors identify the misused part.

The trap: Using `any` or casting to satisfy the compiler.

**Q (Medium): How do parts get accessibility IDs (e.g. `aria-labelledby`) right?**

Answer: The root generates IDs with `useId` and provides them via context; the header applies `id={titleId}` and the dialog container applies `aria-labelledby={titleId}`. This works across the SSR/client boundary (stable IDs) and the caller can't mismatch them. Tabs do the same with `aria-controls` / `aria-labelledby` per trigger/panel pair derived from a shared prefix plus the `value`.

The trap: Hand-writing ids in call sites or using `Math.random()` (hydration mismatch).

**Q (Medium): The root needs to know how many parts there are, or their order. How?**

Answer: Registration. Each part registers itself with the root through context in an effect (returning an unregister cleanup), so the root keeps an ordered collection regardless of wrapper elements. For simple keyboard navigation you can skip state and query the DOM from the event handler. Inspecting `children` via `React.Children` is the fragile option — it can't see through wrappers or conditionals.

The trap: Reaching for `React.Children.toArray(children).length` and not realising it doesn't see nested parts.

**Q (Medium): Compound components vs slots — how do you choose?**

Answer: Compound components share state and let callers arrange parts anywhere; slots are named regions in a fixed layout (Card's `header`, `footer`) with little or no shared state. If parts must coordinate (active tab, open state), compound. If it's "put this content there," slots. They compose: a compound `Card` can also expose slots.

The trap: Treating them as competing — most design systems use both.

**Q (Low): Why must the root memoise its context value?**

Answer: Context consumers re-render whenever the provided value changes identity. An inline object literal changes identity every render, re-rendering every part even if nothing they read changed. `useMemo` (or splitting state and dispatch contexts) limits renders to real changes.

The trap: Assuming React compares context objects shallowly. It uses `Object.is`.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can describe prop soup and rewrite a config-props modal as a compound component
- [ ] Can write the typed skeleton: private context, guard with part name, `Object.assign` export
- [ ] Can explain how `useId` links header and dialog (or tab and panel) without the caller's help
- [ ] Can explain registration and when it beats `React.Children` inspection
- [ ] Can choose correctly between compound, slot and render-prop for three example components
- [ ] Can name four gotchas (private context, unstable value, silent misuse, RSC boundary)

---
*Next: [Render Props](../05-render-prop-pattern/notes.md) — compound components share state between parts of one widget; render props share state between a logic provider and *any* UI you choose.*
