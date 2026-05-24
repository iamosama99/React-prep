// ============================================================
// Topic:   forwardRef
// Phase:   4 — Component Patterns
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   StackBlitz: stackblitz.com/new/react  |  Local: npm create vite@latest
// ============================================================

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

// ─── Exercise 1: Build a Design-System Input with forwardRef ─
//
// SITUATION
//   Your design system has a custom <Input> component. It wraps an <input>
//   with a label, an error message, and custom styling. A parent form needs
//   to programmatically focus the input (e.g., auto-focus on the first invalid
//   field when the user submits). Without forwardRef, the parent can't get
//   to the underlying <input> DOM node.
//
// YOUR TASK — Build Input using forwardRef:
//
//   Props (besides ref): label, error, id, ...rest (spread to <input>)
//   - The ref should attach to the INNER <input>, not the wrapper div
//   - Use named function syntax so DevTools shows "Input" not "ForwardRef"
//   - Set displayName explicitly for components defined as arrow functions
//     (with named function syntax inside forwardRef it's automatic)
//
// VERIFY:
//   1. Click "Focus email" — the email input should get focus
//   2. Click "Focus password" — password gets focus
//   3. Open React DevTools — component shows "Input", not "ForwardRef"
//   4. Check: ref.current === the actual <input> DOM node
//      (use ref.current.tagName in the console — should log "INPUT")

const Input = forwardRef(function Input({ label, error, id, ...rest }, ref) {
  // TODO: render:
  //   <div style wrapper>
  //     <label htmlFor={id}>{label}</label>
  //     <input
  //       id={id}
  //       ref={ref}   ← this is where the ref goes
  //       style={{ ... }}
  //       {...rest}
  //     />
  //     {error && <span style={{ color: '#dc2626', fontSize: 12 }}>{error}</span>}
  //   </div>
  return <div>Input stub — implement with forwardRef</div>;
});

function Exercise1() {
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    // Log what ref.current is — should be an <input> DOM node
    console.log('emailRef.current:', emailRef.current);
    console.log('tagName:', emailRef.current?.tagName); // "INPUT" when correct
  });

  return (
    <section>
      <h2>Exercise 1 — Input with forwardRef</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Click the focus buttons. The ref should target the inner <code>&lt;input&gt;</code>
        DOM node, not the wrapper div. Check DevTools — should show "Input", not "ForwardRef".
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button onClick={() => emailRef.current?.focus()}>Focus email</button>
        <button onClick={() => passwordRef.current?.focus()}>Focus password</button>
        <button onClick={() => { emailRef.current?.focus(); emailRef.current?.select?.(); }}>
          Focus + select email
        </button>
      </div>

      <form style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}
        onSubmit={e => e.preventDefault()}>
        <Input
          ref={emailRef}
          id="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
        />
        <Input
          ref={passwordRef}
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          error="Password must be at least 8 characters"
        />
        <button type="submit" style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '10px 16px', cursor: 'pointer' }}>
          Sign in
        </button>
      </form>
    </section>
  );
}


// ─── Exercise 2: useImperativeHandle — Custom Ref API ────────
//
// SITUATION
//   A <VideoPlayer> component needs to expose imperative controls (play, pause,
//   seek) to its parent. But you don't want to expose the raw <video> DOM node —
//   that would let callers manipulate internal implementation details.
//   useImperativeHandle lets you replace what .current points to with a
//   curated API object.
//
// YOUR TASK — Build VideoPlayer with useImperativeHandle:
//
//   The ref.current should expose ONLY: { play, pause, seek(time), getTime }
//   The raw <video> element should NOT be accessible from outside.
//
//   STEPS:
//   1. forwardRef to receive the caller's ref
//   2. Create an internal videoRef (useRef) for the actual <video> element
//   3. useImperativeHandle(ref, () => ({
//        play: () => videoRef.current.play(),
//        pause: () => videoRef.current.pause(),
//        seek: (time) => { videoRef.current.currentTime = time; },
//        getTime: () => videoRef.current.currentTime,
//      }), []);
//
// VERIFY:
//   - The play/pause/seek buttons work
//   - ref.current does NOT have a .tagName (it's your custom object, not DOM)
//   - ref.current.play() works from the console

const VideoPlayer = forwardRef(function VideoPlayer({ src, poster }, ref) {
  const videoRef = useRef(null);

  // TODO: useImperativeHandle to expose the curated API
  useImperativeHandle(ref, () => ({
    play:    () => { /* videoRef.current.play() */ },
    pause:   () => { /* videoRef.current.pause() */ },
    seek:    (time) => { /* videoRef.current.currentTime = time */ },
    getTime: () => 0, /* videoRef.current.currentTime */
  }), []);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      style={{ width: '100%', maxWidth: 400, borderRadius: 8, background: '#000' }}
      controls={false} // controls are external — controlled via ref
    />
  );
});

function Exercise2() {
  const playerRef = useRef(null);
  const [time, setTime] = useState(0);

  return (
    <section>
      <h2>Exercise 2 — useImperativeHandle: Custom Ref API</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        The parent controls the video via a curated ref API — not direct DOM access.
        Verify: <code>playerRef.current</code> has <code>play/pause/seek/getTime</code>
        but NOT <code>.tagName</code> or any DOM properties.
      </p>

      {/* Using a freely available video for demo */}
      <VideoPlayer
        ref={playerRef}
        src="https://www.w3schools.com/html/mov_bbb.mp4"
        poster="https://www.w3schools.com/html/pic_trulli.jpg"
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => playerRef.current?.play()}>▶ Play</button>
        <button onClick={() => playerRef.current?.pause()}>⏸ Pause</button>
        <button onClick={() => playerRef.current?.seek(5)}>↩ Seek to 5s</button>
        <button onClick={() => playerRef.current?.seek(0)}>⟲ Restart</button>
        <button onClick={() => setTime(playerRef.current?.getTime?.() ?? 0)}>
          📍 Get time
        </button>
        {time > 0 && <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>
          Current: {time.toFixed(2)}s
        </span>}
      </div>

      <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
        <strong>Check in console:</strong>{' '}
        <code>playerRef.current</code> should be <code>{'{ play, pause, seek, getTime }'}</code>
        — not a video DOM element. The internal <code>videoRef</code> is hidden.
      </div>
    </section>
  );
}


// ─── Exercise 3: HOC + forwardRef — Ref Forwarding Through a Wrapper ──
//
// SITUATION
//   You have a HOC `withLabel` that adds a label above any input component.
//   But when a caller puts a ref on the HOC-wrapped component, the ref
//   currently attaches to the HOC wrapper (a function component with no instance)
//   and .current is null.
//
// THE BUG (in BrokenWithLabel):
//   The HOC doesn't use forwardRef. A ref on <LabeledInputBroken ref={r}> is null.
//
// YOUR TASK:
//   Fix withLabel to properly forward refs to the wrapped component.
//   The ref should end up on the inner <input> DOM node (since Input itself
//   uses forwardRef and attaches to its <input>).
//
// VERIFY:
//   - After fixing: "Focus (broken)" button does nothing (null ref)
//   - "Focus (fixed)" button actually focuses the input
//   - DevTools shows "withLabel(Input)" in the component tree

function withLabelBroken(WrappedComponent) {
  // BUG: no forwardRef — ref placed on this HOC is lost
  function WithLabel({ label, ...props }) {
    return (
      <div>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>
          {label}
        </label>
        <WrappedComponent {...props} />
      </div>
    );
  }
  WithLabel.displayName = `withLabel(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithLabel;
}

function withLabel(WrappedComponent) {
  // TODO: wrap in forwardRef so the ref reaches WrappedComponent
  // const WithLabel = forwardRef(function WithLabel({ label, ...props }, ref) {
  //   return (
  //     <div>
  //       <label style={...}>{label}</label>
  //       <WrappedComponent ref={ref} {...props} />
  //     </div>
  //   );
  // });
  // WithLabel.displayName = `withLabel(${...})`;
  // return WithLabel;

  function WithLabel({ label, ...props }) {
    return (
      <div>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>
          {label}
        </label>
        <WrappedComponent {...props} />
      </div>
    );
  }
  WithLabel.displayName = `withLabel(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithLabel;
}

const LabeledInputBroken = withLabelBroken(Input);
const LabeledInput       = withLabel(Input);

function Exercise3() {
  const brokenRef = useRef(null);
  const fixedRef  = useRef(null);

  return (
    <section>
      <h2>Exercise 3 — Forwarding Refs Through a HOC</h2>
      <p style={{ fontSize: 13, color: '#64748b' }}>
        Both use a HOC that adds a label. The "broken" version loses the ref
        at the HOC boundary — clicking its focus button does nothing.
        Fix <code>withLabel</code> so refs pass through correctly.
      </p>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: 13, color: '#dc2626', marginTop: 0 }}>Broken (no forwardRef in HOC)</h4>
          <LabeledInputBroken
            ref={brokenRef}
            label="Username"
            id="username-broken"
            type="text"
            placeholder="johndoe"
          />
          <button
            onClick={() => brokenRef.current?.focus()}
            style={{ marginTop: 8 }}
          >
            Focus (broken) — ref is: {String(brokenRef.current)}
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <h4 style={{ fontSize: 13, color: '#16a34a', marginTop: 0 }}>Fixed (forwardRef in HOC)</h4>
          <LabeledInput
            ref={fixedRef}
            label="Username"
            id="username-fixed"
            type="text"
            placeholder="johndoe"
          />
          <button
            onClick={() => fixedRef.current?.focus()}
            style={{ marginTop: 8 }}
          >
            Focus (fixed) — ref is: {fixedRef.current ? '✅ input node' : '❌ null'}
          </button>
        </div>
      </div>
    </section>
  );
}


// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Phase 4 · 07 — forwardRef</h1>
      <Exercise1 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise2 />
      <hr style={{ margin: '32px 0' }} />
      <Exercise3 />
    </div>
  );
}
