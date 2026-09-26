// ============================================================
// Topic:   Compound Components (as a Design Pattern)
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — Modal: kill the prop soup
//   Exercise 2 — Stepper: a family that survives arbitrary wrappers
//   Exercise 3 — Tabs: accessibility ids, keyboard nav, dual-mode root
//
// Run: npm run tutorial compound-component-pattern
// ============================================================

import {
  createContext, useContext, useState, useMemo, useId, useCallback,
  FC, ReactNode, KeyboardEvent,
} from 'react';

// ─── Shared helper (given): dual-mode state from Topic 3 ─────
function useControllableState<T>(opts: { value?: T; defaultValue: T; onChange?: (v: T) => void }): [T, (v: T) => void] {
  const [internal, setInternal] = useState(opts.defaultValue);
  const isControlled = opts.value !== undefined;
  const current = isControlled ? (opts.value as T) : internal;
  const { onChange } = opts;
  const set = useCallback((next: T) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  }, [isControlled, onChange]);
  return [current, set];
}

// ─── Exercise 1: Modal — Kill the Prop Soup ──────────────────
//
// SITUATION
//   ModalSoup (given) takes title/body/footerButtons/... props. It can't do:
//     - an icon INSIDE the title
//     - a checkbox in the footer next to the buttons
//     - a second body section
//   Each would be another prop. Rebuild it as a compound component.
//
// BUILD (context = { open, setOpen, titleId })
//   useModalContext(part)   throws `<Modal.${part}> must be rendered inside <Modal>`
//   Modal (root)            open state (defaultOpen prop), useId for titleId, memoised value
//   Modal.Trigger           <button> that opens
//   Modal.Content           renders nothing when closed; when open renders an overlay +
//                           role="dialog" aria-modal aria-labelledby={titleId}
//   Modal.Header            <h2 id={titleId}>
//   Modal.Body / Footer     simple styled divs
//   Modal.Close             <button> that closes
//   Export with Object.assign so the dot-notation is typed.
//
// The two demos below use ONLY your parts — the caller arranges everything.

type ModalCtx = { open: boolean; setOpen: (v: boolean) => void; titleId: string };
const ModalContext = createContext<ModalCtx | null>(null);

function useModalContext(part: string): ModalCtx {
  const ctx = useContext(ModalContext);
  // TODO 1: throw a descriptive error when ctx is null (mention `part`)
  void part;
  return ctx as ModalCtx;
}

function ModalRoot({ children, defaultOpen = false }: { children: ReactNode; defaultOpen?: boolean }) {
  // TODO 2: const [open, setOpen] = useState(defaultOpen); const titleId = useId();
  //         memoise { open, setOpen, titleId } and wrap children in ModalContext.Provider
  void children; void defaultOpen; void ModalContext; void useMemo; void useId;
  return <div style={muted}>ModalRoot stub — children are not rendered yet</div>;
}

function ModalTrigger({ children }: { children: ReactNode }) {
  // TODO 3: button → setOpen(true)
  void children; void useModalContext;
  return null;
}
function ModalContent({ children }: { children: ReactNode }) {
  // TODO 4: null when closed; overlay + dialog container (role, aria-modal, aria-labelledby) when open
  void children;
  return null;
}
function ModalHeader({ children }: { children: ReactNode }) {
  // TODO 5: <h2 id={titleId}>
  void children;
  return null;
}
function ModalBody({ children }: { children: ReactNode }) {
  return <div style={{ margin: '12px 0' }}>{children}</div>;
}
function ModalFooter({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>{children}</div>;
}
function ModalClose({ children }: { children: ReactNode }) {
  // TODO 6: button → setOpen(false)
  void children;
  return null;
}

const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger,
  Content: ModalContent,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalClose,
});

// The overlay/dialog chrome, for you to use in Modal.Content
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
  display: 'grid', placeItems: 'center', zIndex: 10,
} as const;
const dialogStyle = { background: '#fff', borderRadius: 10, padding: 20, minWidth: 320, maxWidth: 480 } as const;
void overlayStyle; void dialogStyle;

// The prop-soup version — read it, feel the rigidity
const ModalSoup: FC<{ title: string; body: string; buttons: string[] }> = ({ title, body, buttons }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open soup modal</button>
      {open && (
        <div style={overlayStyle}>
          <div style={dialogStyle} role="dialog" aria-modal="true">
            <h2>{title}</h2>
            <p>{body}</p>
            {buttons.map(b => <button key={b} onClick={() => setOpen(false)}>{b}</button>)}
          </div>
        </div>
      )}
    </>
  );
};

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Modal</h2>
      <div style={card}><ModalSoup title="Delete?" body="Sure?" buttons={['Cancel', 'Delete']} /></div>

      <div style={card}>
        <Modal>
          <Modal.Trigger>Open simple modal</Modal.Trigger>
          <Modal.Content>
            <Modal.Header>Delete “Apollo”?</Modal.Header>
            <Modal.Body>This can’t be undone.</Modal.Body>
            <Modal.Footer>
              <Modal.Close>Cancel</Modal.Close>
              <Modal.Close>Delete</Modal.Close>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      </div>

      <div style={card}>
        <Modal>
          <Modal.Trigger>Open complex modal (impossible with the soup)</Modal.Trigger>
          <Modal.Content>
            <Modal.Header>⚠️ Publish 3 drafts?</Modal.Header>
            <Modal.Body>Subscribers will be emailed immediately.</Modal.Body>
            <Modal.Body><em>Second section:</em> scheduled posts are unaffected.</Modal.Body>
            <Modal.Footer>
              <label style={{ marginRight: 'auto', fontSize: 13 }}>
                <input type="checkbox" /> Don’t ask again
              </label>
              <Modal.Close>Later</Modal.Close>
              <Modal.Close>Publish</Modal.Close>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      </div>
    </section>
  );
}

// ─── Exercise 2: Stepper — Survives Wrapper Elements ─────────
//
// SITUATION
//   A wizard where the layout is up to the caller: indicator on the left,
//   panels on the right, buttons at the bottom — all inside grids and divs.
//   A cloneElement implementation would die at the first <div>.
//
// BUILD (context = { step, count, next, prev, goTo })
//   Stepper({ count, children })   step state starting at 0; next/prev clamp to [0, count-1]
//   Stepper.Indicator              renders `count` dots; the current one is highlighted;
//                                  clicking a dot calls goTo(i)
//   Stepper.Panel({ step })        renders children only when step matches
//   Stepper.Prev / Stepper.Next    buttons; disabled at the ends
//
// Check: the demo puts parts inside nested <div>s and a CSS grid.

type StepperCtx = { step: number; count: number; next: () => void; prev: () => void; goTo: (i: number) => void };
const StepperContext = createContext<StepperCtx | null>(null);

function useStepperContext(part: string): StepperCtx {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error(`<Stepper.${part}> must be rendered inside <Stepper>`);
  return ctx;
}

function StepperRoot({ count, children }: { count: number; children: ReactNode }) {
  // TODO 1: step state; next/prev clamped; goTo; memoised context value; Provider
  void count; void children; void StepperContext;
  return <div style={muted}>Stepper stub</div>;
}

function StepperIndicator() {
  // TODO 2: use useStepperContext('Indicator'); map Array.from({ length: count })
  void useStepperContext;
  return null;
}
function StepperPanel({ step, children }: { step: number; children: ReactNode }) {
  // TODO 3
  void step; void children;
  return null;
}
function StepperPrev({ children }: { children: ReactNode }) {
  // TODO 4
  void children;
  return null;
}
function StepperNext({ children }: { children: ReactNode }) {
  // TODO 5
  void children;
  return null;
}

const Stepper = Object.assign(StepperRoot, {
  Indicator: StepperIndicator, Panel: StepperPanel, Prev: StepperPrev, Next: StepperNext,
});

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Stepper</h2>
      <div style={card}>
        <Stepper count={3}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16 }}>
            <div><div><Stepper.Indicator /></div></div>
            <div>
              <div>
                <Stepper.Panel step={0}>Step 1 — Account details</Stepper.Panel>
                <Stepper.Panel step={1}>Step 2 — Choose a plan</Stepper.Panel>
                <Stepper.Panel step={2}>Step 3 — Confirm and pay</Stepper.Panel>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Stepper.Prev>← Back</Stepper.Prev>
                <Stepper.Next>Next →</Stepper.Next>
              </div>
            </div>
          </div>
        </Stepper>
      </div>
    </section>
  );
}

// ─── Exercise 3: Tabs — A11y Ids, Keyboard, Dual Mode ────────
//
// SITUATION
//   The root and list are written (dual-mode via useControllableState,
//   baseId via useId). You write the two parts that carry the semantics.
//
// BUILD
//   Tabs.Trigger({ value })
//     - role="tab", id={`${baseId}-tab-${value}`}, aria-controls={`${baseId}-panel-${value}`}
//     - aria-selected, tabIndex = selected ? 0 : -1  (roving tabindex)
//     - onClick sets the value
//     - ArrowRight / ArrowLeft move focus AND selection to the next / previous tab.
//       Find siblings with:
//         e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')
//   Tabs.Panel({ value })
//     - role="tabpanel", id / aria-labelledby matching the trigger; hidden unless selected
//
// TEST
//   Left demo is uncontrolled. Right demo is controlled by parent buttons.

type TabsCtx = { value: string; setValue: (v: string) => void; baseId: string };
const TabsContext = createContext<TabsCtx | null>(null);
function useTabsContext(part: string): TabsCtx {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<Tabs.${part}> must be rendered inside <Tabs>`);
  return ctx;
}

function TabsRoot(props: { value?: string; defaultValue?: string; onValueChange?: (v: string) => void; children: ReactNode }) {
  const [value, setValue] = useControllableState<string>({
    value: props.value, defaultValue: props.defaultValue ?? '', onChange: props.onValueChange,
  });
  const baseId = useId();
  const ctx = useMemo(() => ({ value, setValue, baseId }), [value, setValue, baseId]);
  return <TabsContext.Provider value={ctx}>{props.children}</TabsContext.Provider>;
}

function TabsList({ children }: { children: ReactNode }) {
  return <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0' }}>{children}</div>;
}

function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useTabsContext('Trigger');
  const selected = ctx.value === value;
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    // TODO 2: ArrowRight / ArrowLeft → find the tab siblings, compute the next index (wrap around),
    //         focus() it and call ctx.setValue with ITS value (store the value in a data-value attribute)
    void e;
  }
  return (
    <button
      // TODO 1: role="tab", id, aria-controls, aria-selected, tabIndex, data-value, onClick, onKeyDown
      onKeyDown={onKeyDown}
      style={{ padding: '6px 12px', border: 'none', background: selected ? '#e0f2fe' : 'transparent' }}
    >
      {children}
    </button>
  );
}

function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useTabsContext('Panel');
  // TODO 3: role="tabpanel", id / aria-labelledby matching TabsTrigger, hidden when not selected
  void ctx; void value;
  return <div style={{ padding: 12 }}>{children}</div>;
}

const Tabs = Object.assign(TabsRoot, { List: TabsList, Trigger: TabsTrigger, Panel: TabsPanel });

function Exercise3() {
  const [tab, setTab] = useState('b');
  return (
    <section>
      <h2>Exercise 3 — Tabs</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <strong>Uncontrolled</strong>
          <Tabs defaultValue="a">
            <Tabs.List>
              <Tabs.Trigger value="a">Overview</Tabs.Trigger>
              <Tabs.Trigger value="b">Specs</Tabs.Trigger>
              <Tabs.Trigger value="c">Reviews</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Panel value="a">Overview content</Tabs.Panel>
            <Tabs.Panel value="b">Specs content</Tabs.Panel>
            <Tabs.Panel value="c">Reviews content</Tabs.Panel>
          </Tabs>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <strong>Controlled</strong> <span style={muted}>(parent value: {tab})</span>
          <div style={{ margin: '6px 0' }}>
            {['a', 'b', 'c'].map(v => <button key={v} onClick={() => setTab(v)}>jump to {v}</button>)}
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <Tabs.List>
              <Tabs.Trigger value="a">One</Tabs.Trigger>
              <Tabs.Trigger value="b">Two</Tabs.Trigger>
              <Tabs.Trigger value="c">Three</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Panel value="a">First</Tabs.Panel>
            <Tabs.Panel value="b">Second</Tabs.Panel>
            <Tabs.Panel value="c">Third</Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add `Modal.Description` wired to aria-describedby, or a registration-based Stepper.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 04 — Compound Components</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
