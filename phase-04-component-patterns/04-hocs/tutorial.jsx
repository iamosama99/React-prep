// ============================================================
// Topic:   Higher-Order Components (HOCs)
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState, useEffect, useRef, forwardRef } from 'react';

// ─── Exercise 1: Write a Correct HOC ─────────────────────────
//
// SITUATION
//   You need a withLoadingSpinner HOC that adds loading-state rendering
//   to any component. While `isLoading` is true, it shows a spinner.
//   When done, it renders the wrapped component normally.
//
// YOUR TASK — Implement withLoadingSpinner correctly:
//
//   RULE 1: Pass ALL props through to WrappedComponent (don't swallow them)
//   RULE 2: Set displayName so DevTools shows "withLoadingSpinner(UserProfile)"
//           not just "WithLoadingSpinner"
//   RULE 3: The HOC accepts `isLoading` as a prop — it consumes it and
//           does NOT pass it down (it's the HOC's own prop)
//   RULE 4: Define the HOC at MODULE LEVEL, not inside any render function
//           (see Exercise 2 for why this matters)
//
// FORMAT: function withLoadingSpinner(WrappedComponent) { ... }

function withLoadingSpinner(WrappedComponent) {
  // TODO: inner component function
  //   - Destructure isLoading from props (consume it here, don't pass it down)
  //   - If isLoading: render a spinner div (simple CSS spinner or text "Loading…")
  //   - Else: return <WrappedComponent {...rest} />
  //   Set displayName before returning.
  function WithLoadingSpinner({ isLoading, ...rest }) {
    return <div>HOC stub — implement me</div>;
  }

  WithLoadingSpinner.displayName = `withLoadingSpinner(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithLoadingSpinner;
}

// ── Target component (do not modify) ────────────────────────
function UserProfile({ name, role, bio }) {
  return (
    <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, maxWidth: 320 }}>
      <h3 style={{ margin: '0 0 4px' }}>{name}</h3>
      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: 13 }}>{role}</p>
      <p style={{ margin: 0, fontSize: 14 }}>{bio}</p>
    </div>
  );
}

// Apply the HOC at module level (not inside a component)
const UserProfileWithLoading = withLoadingSpinner(UserProfile);

function Exercise1() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <section>
      <h2>Exercise 1 — Correct HOC Structure</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Open React DevTools — you should see "withLoadingSpinner(UserProfile)" in the tree.
        The spinner should show for 2 seconds, then the profile appears.
      </p>
      <UserProfileWithLoading
        isLoading={loading}
        name="Osama"
        role="Senior Engineer"
        bio="Building scalable React apps and teaching patterns."
      />
    </section>
  );
}


// ─── Exercise 2: Debug a Broken HOC ──────────────────────────
//
// SITUATION
//   The code below has FOUR bugs — all classic HOC footguns.
//   Your job: find every bug, explain why it's a problem, and fix it.
//
// THE FOUR BUGS (one per numbered comment):
//
//   BUG 1 — HOC created inside render
//     Defined inside ParentComponent. Every render creates a new component
//     type, causing <UserCard> to unmount and remount instead of update.
//     Symptoms: child resets its state, input loses focus, flicker.
//
//   BUG 2 — displayName not set
//     DevTools shows "WithHighlight" with no context of what it wraps.
//     This makes debugging compound HOC stacks nearly impossible.
//
//   BUG 3 — Prop swallowed (not passed through)
//     The `highlight` prop is consumed but `...rest` is missing —
//     the wrapped component never receives any of its own props.
//
//   BUG 4 — Ref not forwarded
//     The HOC wraps the component but doesn't use forwardRef.
//     A ref placed on <HighlightedCard> attaches to WithHighlight (a function
//     component with no instance), not to the inner <div> in UserCard.
//
// TODO: Fix all four bugs in the corrected version below.

// ── Broken version (read-only — study the bugs) ──────────────
function BrokenParentComponent() {
  const [count, setCount] = useState(0);

  // BUG 1: HOC created inside render — new component type every render
  function withHighlightBroken(WrappedComponent) {
    function WithHighlight({ highlight, ...rest }) { // BUG 3 would be: ({ highlight }) { — missing ...rest
      return (
        <div style={{ outline: highlight ? '2px solid #3b82f6' : 'none' }}>
          <WrappedComponent {...rest} /> {/* BUG 3 fixed here, but BUG 1 makes this moot */}
        </div>
      );
      // BUG 2: no displayName set
      // BUG 4: no forwardRef — ref would point to WithHighlight, not the inner component
    }
    return WithHighlight;
  }

  // This is recreated on every render — React sees a NEW component type each time
  const HighlightedCard = withHighlightBroken(function UserCard({ name }) {
    return <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>{name}</div>;
  });

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Trigger re-render ({count})</button>
      <HighlightedCard name="Osama" highlight={count % 2 === 0} />
      <p style={{ fontSize: 12, color: '#dc2626' }}>
        Watch: clicking the button unmounts/remounts the card (state resets, input loses focus).
        That's Bug 1. Open DevTools to see the tree thrash.
      </p>
    </div>
  );
}

// ── Your fixed version goes here ─────────────────────────────

// TODO: Fix BUG 1 — move the HOC to module level (outside any component)
// TODO: Fix BUG 2 — set displayName correctly
// TODO: Fix BUG 3 — ensure all props pass through to WrappedComponent
// TODO: Fix BUG 4 — wrap with forwardRef so refs reach the inner component

function withHighlight(WrappedComponent) {
  // Fixed implementation here
  function WithHighlight({ highlight, ...rest }) {
    return <div>withHighlight stub — fix the four bugs</div>;
  }
  // Fix displayName
  // Fix forwardRef
  return WithHighlight;
}

function SimpleCard({ name, style: cardStyle }, ref) {
  return (
    <div
      ref={ref}
      style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, ...cardStyle }}
    >
      {name}
    </div>
  );
}
const SimpleCardRef = forwardRef(SimpleCard);
const HighlightedCard = withHighlight(SimpleCardRef);

function Exercise2() {
  const [count, setCount] = useState(0);
  const cardRef = useRef(null);

  return (
    <section>
      <h2>Exercise 2 — Debug a Broken HOC (4 Bugs)</h2>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div>
          <h4 style={{ fontSize: 13, color: '#dc2626', marginTop: 0 }}>Broken (observe the thrash)</h4>
          <BrokenParentComponent />
        </div>
        <div>
          <h4 style={{ fontSize: 13, color: '#16a34a', marginTop: 0 }}>Fixed</h4>
          <button onClick={() => setCount(c => c + 1)} style={{ marginBottom: 8 }}>
            Trigger re-render ({count})
          </button>
          <HighlightedCard
            ref={cardRef}
            name="Osama"
            highlight={count % 2 === 0}
          />
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
            After fixing: card does NOT remount on re-render.
            Ref: {cardRef.current ? '✅ attached to inner div' : '❌ null (forwardRef not working yet)'}
          </p>
        </div>
      </div>
    </section>
  );
}


// ─── Exercise 3: Auth Guard HOC ──────────────────────────────
//
// SITUATION
//   You need to protect certain pages in your app. Any component wrapped
//   with withAuth should:
//   - Show a spinner while auth state is loading
//   - Redirect to /login (simulate by showing a "Login required" message)
//     if the user is not authenticated
//   - Render the wrapped component normally if authenticated
//
//   This is one of the remaining LEGITIMATE uses of HOCs — wrapping a
//   component you want to enhance at definition time, where the enhancement
//   is orthogonal to the component's own purpose.
//
// YOUR TASK — Implement withAuth(WrappedComponent, redirectPath = '/login')
//   - It reads from a fake useAuth hook (provided below)
//   - It handles three states: loading, unauthenticated, authenticated
//   - It passes all original props through to WrappedComponent when authenticated
//   - It sets displayName correctly
//
// BONUS — Why not a hook here?
//   After implementing, think about this: could you use a `useAuth` hook directly
//   inside each protected component instead? What would change? Why is the HOC
//   still a reasonable choice for route-level guards?

// Fake auth hook — simulate loading then resolving
function useAuth() {
  const [state, setState] = useState({ loading: true, user: null });
  useEffect(() => {
    const t = setTimeout(() => {
      // Toggle this to test authenticated vs unauthenticated:
      setState({ loading: false, user: { name: 'Osama', role: 'admin' } });
      // setState({ loading: false, user: null }); // unauthenticated
    }, 1500);
    return () => clearTimeout(t);
  }, []);
  return state;
}

function withAuth(WrappedComponent, redirectPath = '/login') {
  function WithAuth(props) {
    const { loading, user } = useAuth();

    // TODO:
    // if loading → return spinner / "Checking auth…" message
    // if !user  → return a "Login required" message (simulate redirect)
    //             show: <p>🔒 Please <a href={redirectPath}>log in</a> to access this page.</p>
    // else      → return <WrappedComponent {...props} user={user} />
    //             (inject `user` as an extra prop so the component can use it)

    return <div>withAuth stub — implement me</div>;
  }

  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithAuth;
}

// Protected page (receives `user` injected by the HOC)
function AdminDashboard({ user, title }) {
  return (
    <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, maxWidth: 360 }}>
      <h3 style={{ margin: '0 0 8px' }}>👑 {title}</h3>
      <p style={{ margin: 0, fontSize: 14 }}>
        Welcome, <strong>{user?.name}</strong> ({user?.role})
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
        This content is only visible to authenticated users.
      </p>
    </div>
  );
}

const ProtectedDashboard = withAuth(AdminDashboard);

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Auth Guard HOC</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Loading state lasts 1.5s. Toggle the user in useAuth to test
        authenticated vs unauthenticated. In DevTools, verify displayName shows
        "withAuth(AdminDashboard)".
      </p>
      <ProtectedDashboard title="Admin Dashboard" />
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 04 — Higher-Order Components</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
