# Portals

## What Is This?

A portal renders a React component's output into a different DOM node than the one React normally uses — while keeping the component in its original position in the React component tree.

```jsx
import { createPortal } from 'react-dom';

function Modal({ children, isOpen }) {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content">{children}</div>
    </div>,
    document.body  // render into <body>, not into the component's normal container
  );
}
```

The modal's JSX appears inside `<body>` in the DOM, but in the React tree, the `Modal` component is wherever the caller put it. This is not the same as moving components around — the component hierarchy is unchanged.

## Why Does It Exist?

**The overflow and z-index problem.** CSS `overflow: hidden` and stacking contexts are scoped to the DOM subtree. If you render a modal or tooltip inside a `<div>` with `overflow: hidden`, the modal will be clipped. If you render a dropdown inside a component with `z-index: 1`, elements with `z-index: 2` elsewhere on the page will cover it regardless of how high you set the dropdown's z-index, because z-index only competes within the same stacking context.

The standard solution has always been to render these overlays at the `<body>` level — above the entire application's stacking context. Portals let you do this while keeping the React component hierarchy intact.

**Without portals, you'd have to lift the overlay to the root.** Before portals, you'd render modals in the root component and pass open/close state down via props or a global store. The component that *triggers* the modal would be far from the component that *renders* it, making the code harder to follow.

Portals let the trigger and the modal coexist logically in the same part of the component tree, even though they render in different parts of the DOM.

## How It Works

```jsx
createPortal(children, domNode, key?)
```

- `children`: any renderable React content
- `domNode`: the DOM element to render into (must already exist in the document)
- `key` (React 18+): optional key for the portal, useful when rendering multiple portals from the same component

Under the hood, React maintains two trees: the virtual component tree and the DOM output. `createPortal` inserts a fork — the virtual tree continues normally, but the DOM output goes to `domNode` instead of the current container.

### Event bubbling through the React tree

This is the most surprising and important behavior of portals: **events bubble through the React component tree, not the DOM tree**.

```jsx
function App() {
  const [clicked, setClicked] = useState(false);
  
  return (
    <div onClick={() => setClicked(true)}> {/* React parent */}
      <Modal>
        <button>Click me</button> {/* Renders in document.body (DOM) */}
      </Modal>
    </div>
  );
}
```

Even though the button is inside `<body>` in the DOM, clicking it will trigger the `onClick` on the `<div>` in the React tree — because React's synthetic event system bubbles through the *component* hierarchy, not the DOM hierarchy. This is intentional and expected: the portal is a child in React's eyes.

This has a practical implication: if you have an "outside click" handler on `document` to close a dropdown, it will fire for clicks *inside* the dropdown if the event bubbles to the DOM root. You need to handle this with `event.stopPropagation()` or by checking if the click target is inside the portal's DOM node.

## Common Use Cases

### Modals

```jsx
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  
  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </>,
    document.getElementById('modal-root')
  );
}
```

Having a dedicated `<div id="modal-root">` in `index.html` is a common pattern — it keeps all modals in a predictable DOM location.

### Tooltips and Popovers

```jsx
function Tooltip({ anchorRef, content, visible }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  useLayoutEffect(() => {
    if (anchorRef.current && visible) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + window.scrollY, left: rect.left });
    }
  }, [anchorRef, visible]);
  
  if (!visible) return null;
  
  return createPortal(
    <div className="tooltip" style={{ position: 'absolute', ...position }}>
      {content}
    </div>,
    document.body
  );
}
```

Rendering into `document.body` with `position: absolute` + computed coordinates puts the tooltip above all stacking contexts.

### Notifications / Toasts

```jsx
const toastRoot = document.getElementById('toast-root');

function Toast({ message }) {
  return createPortal(
    <div className="toast">{message}</div>,
    toastRoot
  );
}
```

### Server-Side Rendering Considerations

`createPortal` requires a DOM node — it doesn't work in SSR where `document` doesn't exist. The standard approach:

```jsx
function Modal({ children, isOpen }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!isOpen || !mounted) return null;
  
  return createPortal(children, document.body);
}
```

The `mounted` flag ensures the portal only renders after hydration, when `document` is available. Without this, you'll get a hydration mismatch error in Next.js and similar SSR frameworks.

## Portals and Context

Context works across portal boundaries. A Context provided above the portal in the React tree is accessible inside the portal's children:

```jsx
<ThemeContext.Provider value="dark">
  <div>
    <Modal>
      {/* useContext(ThemeContext) here returns "dark" */}
      <ThemedButton />
    </Modal>
  </div>
</ThemeContext.Provider>
```

Even though `<ThemedButton>` renders inside `document.body` in the DOM, it's a descendant of the Provider in the React tree. Context reads from the component hierarchy, not the DOM hierarchy.

## Gotchas

**Portal DOM node must exist before React renders.** If you pass a DOM node that doesn't exist yet, you'll get an error. Pre-create portal containers in `index.html`, or use `useState` + `useEffect` to create them dynamically.

**`document` doesn't exist in SSR.** Guard portal usage with a mounted state (as shown above) or check `typeof document !== 'undefined'`.

**Events bubble through React tree, not DOM.** "Outside click" patterns that check `document.addEventListener('click')` will fire for inside-portal clicks if the portal is appended to `document.body`, because all clicks on `body` reach `document`. Use `ref.current.contains(event.target)` checks instead.

**Accessibility: focus trap.** When a modal is open, keyboard focus can escape into the rest of the page below the portal, because the DOM position is separate from the logical position. You need to implement a focus trap — see the focus management topic (Phase 13). Libraries like `focus-trap-react` and Radix's Dialog component handle this automatically.

**Portals don't affect CSS inheritance.** The portal's content is in a different DOM location, so it doesn't inherit CSS from the original container (font, color, custom properties scoped to the original subtree). This is usually what you want for modals, but can be surprising for tooltips that should inherit the parent's styles.

**z-index doesn't solve stacking contexts.** Even if you render into `document.body`, if the body has a stacking context (e.g., `transform: translate(0)` anywhere in the DOM ancestry), the portal's z-index competes within that context. Render into the highest element you control.

## Interview Questions

**Q (High): What is a React portal and when would you use it?**

Answer: A portal renders a component's output into a different DOM node while keeping the component in its normal position in the React tree. You use it when CSS layout constraints prevent proper rendering at the natural DOM location — specifically `overflow: hidden` clipping and stacking context isolation. The primary use cases are modals, dropdowns, tooltips, and toasts: UI elements that need to visually escape their container and appear above the rest of the page, but whose behavior (Context access, event handling, prop sourcing) should remain tied to where they logically belong in the component hierarchy.

The trap: "It's for rendering components outside React's control." No — portals are fully inside React's tree. Only the DOM output changes.

**Q (High): Events in a portal bubble through the React tree, not the DOM tree. Why does this matter in practice?**

Answer: It matters for "click outside to close" patterns. If you implement this as `document.addEventListener('click', closeDropdown)` and return `false` inside the portal to stop propagation, the DOM event still reaches `document` — the portal is in `document.body`. You need to check `event.target` against the portal's DOM node using `.contains()`. Conversely, it means parent components in the React tree correctly receive events from portal children — a `<div onClick={handler}>` wrapping a Modal will still fire `handler` when something inside the modal is clicked, which is usually the expected behavior.

The trap: Not knowing the distinction between DOM bubbling and React synthetic event bubbling.

**Q (Medium): How do you handle portal rendering during server-side rendering?**

Answer: `createPortal` needs a DOM node — `document` doesn't exist on the server. The solution is to defer portal rendering until after hydration using a mounted state. Initialize `mounted` as `false`, set it to `true` in a `useEffect` (which only runs client-side), and don't render the portal until `mounted` is true. This means portals render a `null` on the server and the first client render, then appear after hydration. Hydration is consistent (null on both sides) and the portal appears on the first client-only paint.

The trap: Using `typeof window !== 'undefined'` instead of `useEffect`. The `typeof window` check may be evaluated correctly in SSR environments but can still cause hydration mismatches.

**Q (Medium): Does Context work across a portal boundary?**

Answer: Yes. Context reads from the React component tree, not the DOM tree. A Provider above the portal in the component hierarchy will make its value available to all descendants, including those rendered inside the portal's target DOM node. This is one of the key design benefits of portals — the modal or dropdown gets access to theme, auth context, translations, etc. exactly as if it were rendered in place.

---
*Next: StrictMode — how React's development-only safety net works and what double-invocation of effects actually tells you.*
