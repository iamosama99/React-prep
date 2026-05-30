// ============================================================
// Topic:   Toast / Notification System
// Phase:   14 — Live Coding Round Patterns
// File:    tutorial.tsx
//
// Exercise type: BUILD FROM SCRATCH
//
// Instructions:
//   1. Read notes.md first.
//   2. Exercise 1: single toast (no context, no portal).
//   3. Exercise 2: full system with Context + Reducer + Portal.
//   4. Compare against the Reference Implementation at the bottom.
//
// Run: npm run tutorial 14-toast-notification-system
// ============================================================

import {
  useState,
  useEffect,
  useRef,
  useReducer,
  useContext,
  useCallback,
  createContext,
  FC,
} from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

const TYPE_STYLES: Record<ToastType, { background: string; icon: string; color: string; border: string }> = {
  success: { background: '#d1fae5', icon: '✓', color: '#065f46', border: '#a7f3d0' },
  error:   { background: '#fee2e2', icon: '✗', color: '#991b1b', border: '#fca5a5' },
  info:    { background: '#dbeafe', icon: 'ℹ', color: '#1e40af', border: '#93c5fd' },
  warning: { background: '#fef3c7', icon: '⚠', color: '#92400e', border: '#fde68a' },
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 1 — Single Toast (No Context, No Portal)
//
// A simple self-contained toast — one at a time, no queue.
// Good for understanding the auto-dismiss pattern before
// adding the complexity of context and portal.
//
// TODO in showToast:
//   1. Clear any existing timer (clearTimeout(timerRef.current))
//   2. setToast({ message, type })
//   3. Set a new timer: setTimeout(() => setToast(null), 3000)
//   4. Store the timer: timerRef.current = timer
//
// The toast should render at fixed position, bottom-right.
// ─────────────────────────────────────────────────────────────

function SingleToastDemo() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function showToast(message: string, type: ToastType) {
    // TODO: clear old timer, set toast, set new auto-dismiss timer
    // clearTimeout(timerRef.current);
    // setToast({ message, type });
    // timerRef.current = setTimeout(() => setToast(null), 3000);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => showToast('File saved successfully', 'success')} style={triggerBtnStyle}>
          Show Success
        </button>
        <button onClick={() => showToast('Failed to connect to server', 'error')} style={triggerBtnStyle}>
          Show Error
        </button>
        <button onClick={() => showToast('Your session expires in 5 minutes', 'info')} style={triggerBtnStyle}>
          Show Info
        </button>
        <button onClick={() => showToast('Disk space is running low', 'warning')} style={triggerBtnStyle}>
          Show Warning
        </button>
      </div>

      {/* TODO: render the toast at fixed position bottom-right
          Show only when toast !== null
          Include a dismiss button (onClick: setToast(null))
      */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: TYPE_STYLES[toast.type].background,
            color: TYPE_STYLES[toast.type].color,
            border: `1px solid ${TYPE_STYLES[toast.type].border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '360px',
            zIndex: 9999,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{TYPE_STYLES[toast.type].icon}</span>
          <span style={{ flex: 1, fontSize: '0.9rem' }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.1rem', padding: '0 0.2rem' }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

const triggerBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  border: '1px solid #ddd',
  borderRadius: '6px',
  cursor: 'pointer',
  background: '#fff',
  fontSize: '0.85rem',
};

// ─────────────────────────────────────────────────────────────
// EXERCISE 2 — Full Toast System (Context + Reducer + Portal)
//
// Build the production-grade version:
//   1. toastReducer: ADD appends, REMOVE filters
//   2. ToastContext: exposes { addToast }
//   3. useToast: custom hook that reads ToastContext
//   4. ToastProvider: manages state, renders portal
//   5. ToastItem: auto-dismiss with useEffect + cleanup
//
// TODO items are marked below. Fill them in.
// ─────────────────────────────────────────────────────────────

// 1. Reducer
type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    // TODO: case 'ADD': return [...state, action.toast]
    // TODO: case 'REMOVE': return state.filter(t => t.id !== action.id)
    default:
      return state;
  }
}

// 2. Context
interface ToastContextValue {
  addToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// 3. Custom hook
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  // TODO: throw if ctx is null (provider not found)
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// 4. Individual toast item (handles auto-dismiss)
function ToastItem2({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    // TODO: setTimeout(onRemove, toast.duration) with clearTimeout cleanup
    // const timer = setTimeout(onRemove, toast.duration);
    // return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  const styles = TYPE_STYLES[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        background: styles.background,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        maxWidth: '360px',
        width: '100%',
        pointerEvents: 'all',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{styles.icon}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={onRemove}
        aria-label="Dismiss notification"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2rem', padding: '0 0.2rem', flexShrink: 0, opacity: 0.7 }}
      >
        ×
      </button>
    </div>
  );
}

// 5. Provider
function ToastProvider2({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  // TODO: wrap in useCallback to keep stable reference
  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  // TODO: wrap in useCallback
  const addToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    // TODO: generate a unique id (crypto.randomUUID() or Date.now().toString())
    // TODO: dispatch({ type: 'ADD', toast: { id, message, type, duration } })
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* TODO: createPortal with toast list */}
      {/* createPortal(
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          display: 'flex',
          flexDirection: 'column-reverse',  // newest on top
          gap: '0.5rem',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {toasts.map(toast => (
            <ToastItem2
              key={toast.id}
              toast={toast}
              onRemove={() => removeToast(toast.id)}
            />
          ))}
        </div>,
        document.body
      ) */}
    </ToastContext.Provider>
  );
}

// Consumer component to test the context
function ToastTriggers() {
  const { addToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => addToast('Profile saved!', 'success')} style={triggerBtnStyle}>Success</button>
        <button onClick={() => addToast('Failed to upload file', 'error')} style={triggerBtnStyle}>Error</button>
        <button onClick={() => addToast('New version available', 'info')} style={triggerBtnStyle}>Info</button>
        <button onClick={() => addToast('Subscription expires tomorrow', 'warning')} style={triggerBtnStyle}>Warning</button>
        <button onClick={() => addToast('This one lasts 8 seconds', 'info', 8000)} style={triggerBtnStyle}>8s duration</button>
      </div>
      <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>
        Click multiple times quickly — each toast should stack and auto-dismiss independently.
      </p>
    </div>
  );
}

function Exercise2Demo() {
  return (
    <ToastProvider2>
      <ToastTriggers />
    </ToastProvider2>
  );
}

// ─────────────────────────────────────────────────────────────
// REFERENCE IMPLEMENTATION
//
// Complete toast system with:
//   - Reducer with ADD/REMOVE
//   - Context + useToast hook
//   - createPortal for safe DOM placement
//   - useCallback for stable removeToast
//   - Auto-dismiss with proper cleanup
//   - Entry animation (CSS)
//   - Max 5 toasts (oldest dropped)
//   - role="alert" + aria-live for screen readers
//
// Read this AFTER attempting the exercises.
// ─────────────────────────────────────────────────────────────

// Re-use the same reducer/types — reference has the same shape.

const RefToastContext = createContext<{ addToast: (m: string, t: ToastType, d?: number) => void } | null>(null);

function useRefToast() {
  const ctx = useContext(RefToastContext);
  if (!ctx) throw new Error('useRefToast must be used within RefToastProvider');
  return ctx;
}

function refToastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      // Keep at most 5 toasts — drop the oldest when over the limit
      return [...state.slice(-4), action.toast];
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

function RefToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  const styles = TYPE_STYLES[toast.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: '0.75rem 1.25rem',
        borderRadius: '10px',
        background: styles.background,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        maxWidth: '380px',
        width: '100%',
        pointerEvents: 'all',
        animation: 'toastSlideIn 0.2s ease-out',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>
        {styles.icon}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{toast.message}</span>
        <div
          style={{
            height: '3px',
            background: styles.color,
            opacity: 0.25,
            borderRadius: '2px',
            marginTop: '0.5rem',
            animation: `toastProgress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
      <button
        onClick={onRemove}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: styles.color,
          fontSize: '1.25rem',
          padding: '0',
          flexShrink: 0,
          opacity: 0.6,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function RefToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(refToastReducer, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    dispatch({ type: 'ADD', toast: { id: crypto.randomUUID(), message, type, duration } });
  }, []);

  return (
    <RefToastContext.Provider value={{ addToast }}>
      {/* CSS keyframes injected inline via a style tag in the portal */}
      {children}
      {createPortal(
        <>
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translateX(110%); opacity: 0; }
              to   { transform: translateX(0);   opacity: 1; }
            }
            @keyframes toastProgress {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
          <div
            role="region"
            aria-label="Notifications"
            style={{
              position: 'fixed',
              bottom: '1rem',
              right: '1rem',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: '0.5rem',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            {toasts.map(toast => (
              <RefToastItem
                key={toast.id}
                toast={toast}
                onRemove={() => removeToast(toast.id)}
              />
            ))}
          </div>
        </>,
        document.body
      )}
    </RefToastContext.Provider>
  );
}

function RefToastTriggers() {
  const { addToast } = useRefToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => addToast('Changes saved!', 'success')} style={{ ...triggerBtnStyle, borderColor: '#a7f3d0', color: '#065f46' }}>Success</button>
        <button onClick={() => addToast('Connection lost', 'error')} style={{ ...triggerBtnStyle, borderColor: '#fca5a5', color: '#991b1b' }}>Error</button>
        <button onClick={() => addToast('New message from Alice', 'info')} style={{ ...triggerBtnStyle, borderColor: '#93c5fd', color: '#1e40af' }}>Info</button>
        <button onClick={() => addToast('Low storage: 500MB left', 'warning')} style={{ ...triggerBtnStyle, borderColor: '#fde68a', color: '#92400e' }}>Warning</button>
        <button onClick={() => addToast('This lasts 8 seconds', 'info', 8000)} style={triggerBtnStyle}>8s</button>
        <button onClick={() => { addToast('One', 'success'); addToast('Two', 'info'); addToast('Three', 'warning'); addToast('Four', 'error'); addToast('Five', 'success'); addToast('Six (should drop oldest)', 'info'); }} style={triggerBtnStyle}>
          Flood 6 toasts
        </button>
      </div>
      <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>
        Progress bar shows remaining time. Max 5 toasts — flooding drops the oldest.
        Slide-in animation from the right.
      </p>
    </div>
  );
}

function ReferenceDemo() {
  return (
    <RefToastProvider>
      <RefToastTriggers />
    </RefToastProvider>
  );
}

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => (
  <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
    <h1>Toast / Notification System</h1>
    <p style={{ color: '#666', marginBottom: '2rem' }}>
      Build a toast system from scratch. Exercise 1 covers the auto-dismiss pattern.
      Exercise 2 builds the production architecture: Context + Reducer + Portal.
    </p>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

      <section>
        <h2>Exercise 1 — Single Toast (No Context, No Portal)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in <code>showToast</code>: clear old timer, set state, set new 3-second auto-dismiss timer.
          The toast renders at fixed position bottom-right. One at a time — new toast replaces old one.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <SingleToastDemo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Click any button — a toast appears bottom-right and disappears after 3 seconds.
          Clicking another button before it disappears should replace it (with a fresh 3-second timer).
          The dismiss × button should remove it immediately.
        </div>
      </section>

      <hr />

      <section>
        <h2>Exercise 2 — Full System (Context + Reducer + Portal)</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Fill in the TODOs: the reducer cases, <code>addToast</code> dispatch, the portal render in
          <code> ToastProvider2</code>, and the <code>useEffect</code> in <code>ToastItem2</code>.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <Exercise2Demo />
        </div>
        <div style={{ background: '#fffde7', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Check:</strong> Multiple toasts should stack (newest on top). Each dismisses after its duration.
          The × button should dismiss immediately. Inspect the DOM — toasts should be a direct child of{' '}
          <code>{'<body>'}</code>, not inside the app div.
        </div>
      </section>

      <hr />

      <section>
        <h2>Reference Implementation</h2>
        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Full solution with slide-in animation, progress bar, max-5-toast limit, <code>useCallback</code> for
          stable callbacks, and proper ARIA. Read this only after attempting the exercises.
        </p>
        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
          <ReferenceDemo />
        </div>
        <div style={{ background: '#e8f5e9', padding: '0.75rem 1rem', borderRadius: '6px', marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Key decisions in the reference:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li><code>removeToast</code> wrapped in <code>useCallback</code> — stable reference prevents useEffect re-running</li>
            <li>Max 5 toasts: <code>state.slice(-4)</code> drops the oldest before adding new one</li>
            <li>Progress bar animates from 100% to 0% using <code>toastProgress</code> keyframe</li>
            <li>Slide-in from right: <code>translateX(110%) → translateX(0)</code></li>
            <li><code>{'<style>'}</code> tag injected into the portal for the keyframe CSS</li>
            <li><code>role="alert"</code> + <code>aria-live="polite"</code> on each toast for screen readers</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
);

export default App;
