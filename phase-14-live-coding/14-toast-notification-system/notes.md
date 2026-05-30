# Toast / Notification System

## Quick Reference

| Concept | Implementation |
|---|---|
| Toast shape | `{ id: string; message: string; type: 'success'\|'error'\|'info'\|'warning'; duration: number }` |
| ID generation | `crypto.randomUUID()` or `Date.now().toString()` |
| State management | `useReducer` with `ADD` and `REMOVE` actions |
| Global access | `React.createContext` + custom `useToast` hook |
| Render outside DOM | `ReactDOM.createPortal(toasts, document.body)` |
| Auto-dismiss | `useEffect` with `setTimeout` + cleanup |
| Positioning | `position: fixed; bottom: 1rem; right: 1rem` |
| Stack order | `flex-direction: column-reverse` for newest-on-top |

---

## Why This Matters

A toast system is a senior-level component design question. It tests:

- Context + Reducer architecture (not just useState)
- Portal rendering (why and how)
- useEffect cleanup (preventing memory leaks and stale callbacks)
- Global state API design (the `addToast` function signature)
- Composability — any component in the tree can trigger a toast

The specific patterns interviewers look for: `createPortal` (not just `position:fixed`), a reducer for the toast queue, and the auto-dismiss cleanup.

---

## Core Concepts

### 1. Architecture Overview

```
App
├── ToastProvider (manages toast state, renders portal)
│   ├── ToastContainer (portal into document.body)
│   │   ├── ToastItem (auto-dismiss timer)
│   │   └── ToastItem
│   └── {children}
│       ├── FormComponent → useToast() → addToast('Saved!', 'success')
│       └── ApiComponent → useToast() → addToast('Error!', 'error')
```

The key insight: `ToastProvider` wraps the app. Any child can call `useToast()` to get `addToast`. The toasts render in a portal outside the component tree.

---

### 2. Toast Data Shape

```tsx
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number; // ms, default 3000
}
```

---

### 3. Reducer

```tsx
type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast];
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}
```

**Why reducer instead of useState?**

With `useState`, you'd need to pass the setter around or write multiple update functions. The reducer provides a named, explicit interface: `ADD` and `REMOVE`. It also makes the state transitions self-documenting and easy to test.

---

### 4. Context + Custom Hook

```tsx
interface ToastContextValue {
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

**Why not expose `removeToast` from context?** The `removeToast` function is an implementation detail of the provider — it's called by `ToastItem` internally. The consumer API (`addToast`) is intentionally minimal. If you need to imperatively dismiss (e.g., dismiss on navigation), you can expose it, but it's optional.

---

### 5. Portal

```tsx
import { createPortal } from 'react-dom';

// Inside ToastProvider:
return (
  <>
    {children}
    {createPortal(
      <ToastContainer toasts={toasts} onRemove={removeToast} />,
      document.body
    )}
  </>
);
```

**Why portal?**

Without a portal, the toast container is a child of whatever component renders `ToastProvider`. If that ancestor has `overflow: hidden` or a CSS `transform` (which creates a new stacking context), the toast would be clipped or positioned relative to that ancestor instead of the viewport. Portaling into `document.body` guarantees it renders in its own stacking context at the top of the DOM.

**Gotcha:** `createPortal` renders the component in a different DOM node but it's still part of the React tree — context, event bubbling through React's synthetic event system, and refs all work normally.

---

### 6. Auto-Dismiss with useEffect Cleanup

```tsx
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration);
    return () => clearTimeout(timer); // cleanup: prevent firing after unmount
  }, [toast.duration, onRemove]);

  return (
    <div>
      {toast.message}
      <button onClick={onRemove} aria-label="Dismiss">×</button>
    </div>
  );
}
```

**Why return `clearTimeout` in the cleanup?**

If `onRemove` is called before the timer fires (user clicks dismiss), the component unmounts. Without the cleanup, the `setTimeout` would still fire after unmount and call `onRemove` with a stale reference — potentially causing a state update on an unmounted component or double-removing.

**Gotcha:** `onRemove` must be stable. Wrap it in `useCallback` in the provider, or the `useEffect` will re-run on every render, resetting the timer.

```tsx
const removeToast = useCallback((id: string) => {
  dispatch({ type: 'REMOVE', id });
}, []);
```

---

### 7. Positioning and Stacking

```tsx
// Toast container — fixed overlay
<div
  style={{
    position: 'fixed',
    bottom: '1rem',
    right: '1rem',
    display: 'flex',
    flexDirection: 'column-reverse', // newest toast on top
    gap: '0.5rem',
    zIndex: 9999,
    maxWidth: '400px',
    width: '100%',
    pointerEvents: 'none', // container doesn't block clicks below
  }}
>
  {toasts.map(toast => (
    <ToastItem
      key={toast.id}
      toast={toast}
      style={{ pointerEvents: 'all' }} // but individual toasts do respond to clicks
    />
  ))}
</div>
```

`flex-direction: column-reverse` means the last item in the array appears at the top of the stack visually. Since we push new toasts to the end of the array (`[...state, action.toast]`), new toasts appear at the top.

---

### 8. Type Color Mapping

```tsx
const TYPE_STYLES: Record<Toast['type'], { background: string; icon: string; color: string }> = {
  success: { background: '#d1fae5', icon: '✓', color: '#065f46' },
  error:   { background: '#fee2e2', icon: '✗', color: '#991b1b' },
  info:    { background: '#dbeafe', icon: 'ℹ', color: '#1e40af' },
  warning: { background: '#fef3c7', icon: '⚠', color: '#92400e' },
};
```

---

### 9. Animation (Optional Polish)

CSS entry animation using keyframes:

```tsx
// Using a style tag in index.html or global CSS:
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}

// Inline:
style={{ animation: 'slideIn 0.2s ease-out' }}
```

For exit animation, you need to defer removal — keep the toast in state but add a "removing" flag, play the exit animation, then remove after the animation duration.

---

## Common Interview Gotchas

**Gotcha:** Forgetting `useCallback` on `removeToast`. Without it, a new `removeToast` function is created on every render, causing each `ToastItem`'s `useEffect` to re-run and reset the timer on every provider re-render.

**Gotcha:** Not cleaning up the timer in `useEffect`. If the user manually dismisses before the timer fires, the timer still fires after unmount and tries to call `dispatch` with a stale id.

**Gotcha:** Using `useState` with array instead of `useReducer`. Not wrong, but reducers are the more composable pattern for queued state like this.

**Gotcha:** Forgetting `createPortal`. Toasts positioned with `position: fixed` only work relative to the viewport if none of their ancestors have CSS `transform`, `filter`, or `perspective` applied. Portaling avoids this entirely.

**Gotcha:** Exposing the raw `dispatch` from context. Always expose a typed `addToast(message, type, duration)` function — it hides the implementation detail (reducer) and provides a simpler API surface.

---

## Self-Assessment

- [ ] I can implement the `toastReducer` with ADD and REMOVE from memory
- [ ] I can set up the Context + custom `useToast` hook correctly
- [ ] I know why `createPortal` is better than just `position: fixed`
- [ ] I can implement the `useEffect` auto-dismiss with proper cleanup
- [ ] I know why `removeToast` must be stable (useCallback)
- [ ] I can position the toast container with `column-reverse` for correct stacking

---

## Interview Q&A

**Q: Why use Context + Reducer for a toast system? `High`**

A: Any component in the tree — form submissions, API calls, navigation handlers — might need to show a toast. Context makes the `addToast` function available anywhere without prop drilling. Reducer manages the toast queue predictably: each action (`ADD` or `REMOVE`) produces a new state deterministically, making it easy to reason about and test. Alternatives like a global singleton or event emitter work but lose React's reactivity benefits. `useState` with direct setter could work but becomes unwieldy if you add features like max-toast limits or deduplication.

---

**Q: Why use `createPortal` for toasts? `Medium`**

A: Toasts need to appear over everything in the UI regardless of where they're triggered. Without a portal, the toast container renders inside its React parent component's DOM subtree. If any ancestor has CSS `overflow: hidden`, `transform`, `filter`, or `will-change: transform`, the `position: fixed` toast would be positioned or clipped relative to that ancestor rather than the viewport. `createPortal(toasts, document.body)` renders the DOM nodes directly into `document.body`, outside any stacking context issues. The React tree relationship is preserved (context still works) but the DOM placement is correct.

---

**Q: How do you auto-dismiss a toast without a memory leak? `Medium`**

A: In the `ToastItem`'s `useEffect`, call `const timer = setTimeout(onRemove, duration)` and return `() => clearTimeout(timer)` as the cleanup function. The cleanup runs when the component unmounts (e.g., user clicks dismiss before the timer fires) or when the effect re-runs. Without cleanup, the timer fires after unmount and calls `onRemove` with a potentially stale closure, causing either a no-op or a spurious state update. Also: `onRemove` must be stable (wrapped in `useCallback` in the provider) so the `useEffect` dependency doesn't cause the timer to reset on every re-render.

---

**Q: How would you add a "max 5 toasts" limit? `Low`**

A: In the reducer's `ADD` case: if the current state already has 5 or more toasts, remove the oldest one before adding the new one. `case 'ADD': return [...state.slice(-4), action.toast]` — this keeps only the most recent 4 existing toasts plus the new one. Alternatively, reject the add entirely: `if (state.length >= 5) return state`. The slice approach (dropping oldest) gives a better UX — new notifications always show.

---

**Q: How would you deduplicate toasts so the same message doesn't appear twice? `Low`**

A: In the `ADD` case of the reducer: check if a toast with the same message (or same `type + message` combination) already exists. If it does, return the state unchanged or reset that toast's timer. For resetting the timer, you'd need to remove the existing toast and add the new one, which implicitly restarts its `useEffect` timer. `const exists = state.find(t => t.message === action.toast.message && t.type === action.toast.type); if (exists) return state.filter(t => t.id !== exists.id).concat(action.toast);`
