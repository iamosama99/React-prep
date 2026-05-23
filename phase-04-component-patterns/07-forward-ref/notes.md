# forwardRef

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| `forwardRef` | Wrapper that passes a caller's `ref` as a second arg to the render function | Without it, refs on function components silently do nothing (pre-React 19) |
| `ref` is not a prop | React intercepts `ref` before the component function runs | Explains why `props.ref` is always `undefined` in `forwardRef` render |
| `useImperativeHandle` | Replaces what `.current` points to with a custom object | Lets you expose a curated API instead of the raw DOM node |
| `displayName` | A string set on the `forwardRef` wrapper for DevTools | Without it DevTools shows the generic `ForwardRef` label |
| React 19 change | `ref` becomes a normal prop in React 19 | `forwardRef` is deprecated for function components but still works |

## What Is This?

`React.forwardRef` lets a component accept a `ref` and pass it to a DOM element or child component inside it. Without it, refs attached to function components point to nothing — function components don't have instances, so there's nowhere for the ref to attach.

```jsx
const Input = React.forwardRef(function Input({ label, ...props }, ref) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  );
});

// Now the caller can get a ref to the underlying <input>
const inputRef = useRef(null);
<Input label="Email" ref={inputRef} />
// inputRef.current is the <input> DOM node
```

The `ref` is passed as a second argument to the render function — it does not appear in `props`.

## Why Does It Exist?

**The problem:** `ref` is not a prop. React intercepts it before the component function runs. If you write:

```jsx
function Input({ ref, ...props }) { // ref will be undefined
  return <input ref={ref} {...props} />;
}
```

The `ref` is silently dropped. You'd need `forwardRef` to receive it.

**Why React doesn't just make `ref` a prop:** `ref` has to be handled before the component renders to set up the ref object's connection to the underlying node. If it were a prop, the component would need to run first, then the ref would be attached — but what is it attached to? The component, the DOM element, some child? Making it explicit via `forwardRef` forces the component author to declare exactly where the ref goes.

**When you need it:** Any component that wraps a DOM element and should give callers access to that element needs `forwardRef`. This is common for:
- Design system primitives (`Button`, `Input`, `Select`, `Textarea`)
- Any component where focus management matters
- Components where callers might call imperative methods via `useImperativeHandle`

## How It Works

```jsx
const FancyInput = React.forwardRef(function FancyInput(props, ref) {
  // props: normal props (ref is not in here)
  // ref: the ref object or callback ref from the caller
  return <input ref={ref} className="fancy" {...props} />;
});
```

Internally, `forwardRef` creates a special component object with a `$$typeof` of `REACT_FORWARD_REF_TYPE`. React's reconciler recognizes this type and passes the ref as the second argument to the render function, instead of attaching it to the component boundary.

### displayName for DevTools

`forwardRef` returns a component with a `displayName` property. Without setting it, DevTools shows `ForwardRef`. You should set it:

```jsx
const Input = React.forwardRef(function Input(props, ref) {
  return <input ref={ref} {...props} />;
});
// displayName is automatically set to "Input" from the function name

// Or set it explicitly for components defined as arrow functions:
const Input = React.forwardRef((props, ref) => <input ref={ref} {...props} />);
Input.displayName = 'Input';
```

### Combining with useImperativeHandle

When you want to expose a *custom* imperative API on a component's ref (rather than the raw DOM node), combine `forwardRef` with `useImperativeHandle`:

```jsx
const VideoPlayer = React.forwardRef(function VideoPlayer({ src }, ref) {
  const videoRef = useRef(null);
  
  useImperativeHandle(ref, () => ({
    play: () => videoRef.current.play(),
    pause: () => videoRef.current.pause(),
    seek: (time) => { videoRef.current.currentTime = time; },
  }), []);
  
  return <video ref={videoRef} src={src} />;
});

// Caller gets { play, pause, seek } — not the raw <video> element
const playerRef = useRef(null);
<VideoPlayer ref={playerRef} src={video.url} />
playerRef.current.play();
```

This is covered deeply in Phase 2 (useImperativeHandle) — the key point here is that `forwardRef` is always the enabler.

### Combining with HOCs

When you HOC-wrap a component that uses `forwardRef`, the HOC must pass the ref through. That's why HOCs need `React.forwardRef` in their implementation:

```jsx
function withLogging(WrappedComponent) {
  const WithLogging = React.forwardRef((props, ref) => {
    // ref is forwarded to the wrapped component
    return <WrappedComponent ref={ref} {...props} />;
  });
  WithLogging.displayName = `withLogging(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithLogging;
}
```

Without this, a `ref` on `<LoggedInput>` would be lost.

> **Check yourself:** If a HOC wraps a `forwardRef` component but the HOC itself does NOT use `forwardRef`, what happens to a `ref` placed on the HOC-wrapped component?

## Callback Refs

`ref` doesn't have to be a `useRef` object. It can be a callback function — `forwardRef` handles both:

```jsx
// Object ref
const myRef = useRef(null);
<Input ref={myRef} />

// Callback ref
<Input ref={(node) => {
  if (node) {
    console.log('mounted', node);
  } else {
    console.log('unmounted');
  }
}} />
```

When you do `<input ref={ref} />` inside your component, React handles both cases — if `ref` is a ref object, it sets `.current`; if it's a function, it calls it with the node.

## React 19 Changes

In React 19, `ref` is passed as a prop — no more `forwardRef` needed:

```jsx
// React 19 — ref is just a prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// Caller works the same way
<Input ref={myRef} />
```

`forwardRef` still works but is deprecated for function components. For class components (which have instances), `ref` was always handled differently and is unchanged.

You'll see `forwardRef` throughout existing codebases for years to come — it's not going away immediately — but new code in React 19+ can skip it.

> **Check yourself:** What exactly changes in React 19 regarding `ref`? Is `forwardRef` removed, deprecated, or unchanged?

## Gotchas

**`ref` is not in `props` inside `forwardRef`.** If you try to read `props.ref`, it will be undefined. The ref is the second argument. This trips up developers who expect it to behave like a prop.

**Without `forwardRef`, refs on function components silently do nothing (pre-React 19).** There's no error — the `ref` prop is just ignored. This makes it easy to ship broken ref behavior without knowing it.

**`forwardRef` adds a component layer in DevTools.** You'll see `ForwardRef(Input)` or just `Input` (if displayName is set). Always set `displayName` or use named function syntax.

**Avoid using refs when props are sufficient.** If a parent wants to call `focus()` on an input, consider whether you can instead pass an `autoFocus` prop or lift the state. Refs are an escape hatch for imperative behavior — every ref creates implicit coupling between parent and child implementation details.

**The ref forwarding target doesn't have to be a DOM element.** You can forward a ref to a child class component (which has an instance) or to another `forwardRef` component. It's ref-all-the-way-down if needed.

## Interview Questions



**Q (High): Why do function components require `forwardRef` to accept a `ref` prop (in React < 19)?**

Answer: React intercepts the `ref` prop before the component function runs. Function components don't have instances — unlike class components, there's no object for the ref to point to by default. `forwardRef` creates a special component type that React recognizes, causing the reconciler to pass the `ref` as a second argument to the render function rather than trying to attach it to the component boundary. Without `forwardRef`, the ref is silently dropped. In React 19, `ref` becomes a normal prop and `forwardRef` is no longer needed.

The trap: "Just put ref in the props destructuring." That doesn't work pre-React 19 — `ref` won't be there.

---



**Q (High): What happens to a ref when a component using `forwardRef` is wrapped in a HOC that doesn't use `forwardRef`?**

Answer: The ref is lost. It attaches to the HOC wrapper component, which is a function component with no instance — so `.current` is null. The inner component never receives it. Every HOC that wraps a component which needs to forward refs must itself be wrapped in `React.forwardRef` and explicitly pass the ref through to the wrapped component. This is one of the non-obvious maintenance costs of HOC composition — you must audit every wrapper when refs are involved.

The trap: Assuming `{...props}` passes the ref. It doesn't — ref is not in props.


---

**Q (Medium): When would you use `forwardRef` together with `useImperativeHandle`?**

Answer: When you want to expose a curated imperative API on the ref rather than the raw DOM node. For example, a `VideoPlayer` component might expose `{ play, pause, seek }` instead of the raw `<video>` element. `forwardRef` receives the caller's ref; `useImperativeHandle` replaces what `.current` points to with your custom object. This is the right pattern when the component's implementation details (which DOM elements it uses internally) should be hidden from callers. You give callers just enough imperative control without exposing the internal structure.

The trap: Always forwarding the raw DOM ref. Sometimes the abstraction should stay intact — expose a capability, not an element.

---



**Q (Medium): How does `forwardRef` change in React 19?**

Answer: In React 19, `ref` is passed as a regular prop to function components, so `forwardRef` is unnecessary — you just destructure `ref` from props and pass it wherever you want. `forwardRef` still works (it's not removed) but is deprecated for function components. Class components are unaffected since they have instances. The practical impact: new code can be simpler, but existing codebases will still have `forwardRef` everywhere for the foreseeable future, so you need to understand both APIs.

The trap: Saying "forwardRef is being removed." It's deprecated for new function component code, not removed.
---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain why `ref` is not a prop and what happens to it without `forwardRef` (pre-React 19)
- [ ] Can write a `forwardRef` component from memory with correct named-function syntax and `displayName`
- [ ] Can explain when `useImperativeHandle` is the right pairing with `forwardRef` and what it changes about `.current`
- [ ] Can explain the React 19 change precisely — deprecated vs removed, what changes at the call site
- [ ] Can explain why a HOC that doesn't use `forwardRef` breaks refs on its wrapped component

---
*Next: React.Children Utilities — the API for introspecting and manipulating `children` programmatically, often paired with compound components and the cloneElement pattern.*
