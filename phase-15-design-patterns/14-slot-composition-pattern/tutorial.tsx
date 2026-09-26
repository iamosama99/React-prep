// ============================================================
// Topic:   Slot Pattern (Named Slots for Layout)
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — Card with prop slots and empty-slot handling
//   Exercise 2 — Layout with child slots: callers write them in ANY order
//   Exercise 3 — Panel with a function slot and empty-body detection
//
// (This is about LAYOUT slots. For the Radix-style asChild/Slot merge, see Phase 4.)
//
// Run: npm run tutorial slot-composition
// ============================================================

import {
  Children, isValidElement, useState, ComponentType, FC, ReactNode,
} from 'react';

// ─── Exercise 1: Card with Prop Slots ────────────────────────
//
// SITUATION
//   Cards appear everywhere with different combinations of: media, header,
//   actions, footer, plus body content. Stop adding props like `showFooter`;
//   accept CONTENT instead.
//
// BUILD  Card({ media?, header?, actions?, footer?, children })
//   - <article> wrapper
//   - media  → <div> above the header, only when provided
//   - header/actions → ONE <header> row (header on the left, actions right),
//                      rendered only if at least one of them is provided
//   - children → body
//   - footer → <footer>, only when provided
//   - GOTCHA: `footer={0}` (a numeric slot) must still render "0" — use `!= null`, not `&&` on the value
//
// The three demos should render three DIFFERENT structures with no empty boxes.

type CardProps = {
  media?: ReactNode;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

const Card: FC<CardProps> = ({ media, header, actions, footer, children }) => {
  // TODO: implement the regions with empty-slot handling
  void media; void header; void actions; void footer;
  return <article style={card}>{children}</article>;
};

function Exercise1() {
  return (
    <section>
      <h2>Exercise 1 — Prop Slots</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <Card
          media={<div style={{ height: 60, background: 'linear-gradient(90deg,#38bdf8,#a78bfa)' }} />}
          header={<strong>Full card</strong>}
          actions={<button>Edit</button>}
          footer={<span style={muted}>Updated 2 min ago</span>}
        >
          Every slot filled.
        </Card>
        <Card header={<strong>Header only</strong>}>No media, no footer, no actions → no empty boxes.</Card>
        <Card footer={0}>Numeric footer slot (should show “0”).</Card>
      </div>
    </section>
  );
}

// ─── Exercise 2: Child Slots with Enforced Placement ─────────
//
// SITUATION
//   Callers write <Layout.Header>, <Layout.Sidebar>, <Layout.Main>,
//   <Layout.Footer> in ANY order. The layout must put them in the right
//   places. Anything else goes to the main area.
//
// BUILD  extractSlots(children, markers)
//   - iterate with Children.forEach
//   - if the child is a valid element whose `type` matches a marker → slots[name] = child
//   - otherwise push to `rest`
//   returns { slots, rest }
//   BONUS: flatten Fragments so <><Layout.Header/></> still works
//          (child.type === Fragment → recurse into child.props.children)
//
// Then Layout (given) renders each slot in its region and SKIPS empty regions.

type SlotName = 'header' | 'sidebar' | 'main' | 'footer';
type Marker = FC<{ children: ReactNode }>;

const Header: Marker = ({ children }) => <>{children}</>;
const Sidebar: Marker = ({ children }) => <>{children}</>;
const Main: Marker = ({ children }) => <>{children}</>;
const Footer: Marker = ({ children }) => <>{children}</>;
const MARKERS: Record<SlotName, ComponentType<{ children: ReactNode }>> = {
  header: Header, sidebar: Sidebar, main: Main, footer: Footer,
};

function extractSlots(children: ReactNode, markers: typeof MARKERS) {
  const slots: Partial<Record<SlotName, ReactNode>> = {};
  const rest: ReactNode[] = [];
  // TODO: Children.forEach(children, child => { … })
  void isValidElement; void markers;
  Children.forEach(children, child => rest.push(child));
  return { slots, rest };
}

function LayoutRoot({ children }: { children: ReactNode }) {
  const { slots, rest } = extractSlots(children, MARKERS);
  const mainContent = slots.main ?? (rest.length ? Children.toArray(rest) : null);
  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
      {slots.header != null && <header style={{ ...region, background: '#e0f2fe' }}>{slots.header}</header>}
      <div style={{ display: 'flex' }}>
        {slots.sidebar != null && <aside style={{ ...region, width: 140, background: '#f1f5f9' }}>{slots.sidebar}</aside>}
        {mainContent != null && <main style={{ ...region, flex: 1 }}>{mainContent}</main>}
      </div>
      {slots.footer != null && <footer style={{ ...region, background: '#fef9c3' }}>{slots.footer}</footer>}
    </div>
  );
}

const Layout = Object.assign(LayoutRoot, { Header, Sidebar, Main, Footer });

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Child Slots</h2>
      <p style={muted}>Written in scrambled order — header must still be on top, footer at the bottom.</p>
      <Layout>
        <Layout.Footer>© 2026 Acme</Layout.Footer>
        <Layout.Main>The main content goes here.</Layout.Main>
        <Layout.Sidebar>Filters</Layout.Sidebar>
        <Layout.Header>Site header</Layout.Header>
      </Layout>
      <p style={muted}>Only main + header (no empty sidebar/footer regions):</p>
      <Layout>
        <Layout.Main>Just content</Layout.Main>
        <Layout.Header>Header</Layout.Header>
      </Layout>
      <p style={muted}>Loose children (no markers) fall into main:</p>
      <Layout>
        <p style={{ margin: 0 }}>A loose paragraph.</p>
      </Layout>
    </section>
  );
}

// ─── Exercise 3: Function Slot + Empty Body ──────────────────
//
// SITUATION
//   The Panel's header must render a toggle that depends on the Panel's OWN
//   `open` state, so the header slot may be a function. Also, if there is no
//   body content at all, don't render the (empty) body wrapper or the toggle state.
//
// BUILD  Panel({ header, children })
//   - state: open (default true), toggle()
//   - header: ReactNode | ((s: { open: boolean; toggle: () => void }) => ReactNode)
//       → resolve with typeof header === 'function'
//   - body: render only when open AND Children.toArray(children).length > 0
//   (Children.toArray strips null/false/undefined — that's the emptiness test)

type PanelState = { open: boolean; toggle: () => void };
type PanelProps = { header: ReactNode | ((s: PanelState) => ReactNode); children?: ReactNode };

const Panel: FC<PanelProps> = ({ header, children }) => {
  // TODO: implement open state and resolve the function slot
  void useState; void children;
  return <section style={card}>{typeof header === 'function' ? '(function header — resolve it)' : header}</section>;
};

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Function Slots</h2>
      <Panel
        header={({ open, toggle }) => (
          <button onClick={toggle}>{open ? '▾' : '▸'} Details (function slot)</button>
        )}
      >
        The body only shows while open.
      </Panel>
      <Panel header={<strong>Static header slot</strong>}>Body content</Panel>
      <Panel header={<strong>No body at all</strong>}>{false}{null}</Panel>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: give Layout a `sidebarPosition="right"` prop — the layout, not the caller, decides.

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;
const region = { padding: 12 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
    <h1>Phase 15 · 14 — Slot Pattern</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
