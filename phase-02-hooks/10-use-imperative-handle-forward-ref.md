# useImperativeHandle + forwardRef

## What Is This?

`useImperativeHandle` is a hook that lets a component customize what a parent sees when it holds a ref to that component. Instead of the parent getting direct access to the component's underlying DOM node, the component exposes a controlled, intentional API.

```javascript
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => {
      inputRef.current.value = '';
    },
  }));

  return <input ref={inputRef} />;
});

// Parent usage:
const ref = useRef(null);
<FancyInput ref={ref} />
ref.current.focus(); // Calls the custom focus method
```

The parent gets `{ focus, clear }`, not the raw `<input>` DOM element. The component decides what to expose.

## Why Does It Exist?

### First: Why forwardRef?

When you pass `ref` to a function component, React ignores it — refs aren't regular props and don't flow through the component's `props` object. A ref attached to a function component silently does nothing.

`forwardRef` solves this by explicitly opting the component into ref forwarding. It gives the component a second argument — the ref passed by the parent — which the component can then attach to a DOM element or use with `useImperativeHandle`.

```javascript
// ❌ ref is silently ignored
const Input = ({ ref, ...props }) => <input ref={ref} />;

// ✅ ref is explicitly forwarded to the DOM element
const Input = forwardRef((props, ref) => <input ref={ref} />);
```

### Then: Why useImperativeHandle?

`forwardRef` alone passes the ref straight to a DOM node. That works fine for simple wrappers. But sometimes you want to:

1. **Expose a higher-level API** — `modal.open()` instead of `modal.style.display = 'flex'`
2. **Restrict access** — prevent the parent from manipulating the DOM directly, only allow specific operations
3. **Compose multiple refs** — the component has multiple internal refs but exposes a single unified API

`useImperativeHandle` sits between the parent's ref and the component's internals, acting as a public API surface.

## How It Works

```javascript
useImperativeHandle(ref, () => ({
  // Everything returned here is what ref.current becomes
  methodOne: () => {},
  methodTwo: () => {},
}), [deps]); // Optional deps — like useEffect, controls when the object is recreated
```

React calls the factory function and assigns the returned object to `ref.current`. From the parent's perspective, `ref.current` is exactly what the factory returns — nothing more.

The deps array behaves like `useEffect` — the factory re-runs when deps change. If your methods close over state or props, include them in deps.

### Under the Hood

```javascript
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null); // Internal ref to the actual DOM node
  const [value, setValue] = useState('');

  useImperativeHandle(ref, () => ({
    // Parent gets this object
    focus: () => inputRef.current.focus(),
    getValue: () => value,
    reset: () => setValue(''),
  }), [value]); // Recreate when value changes so getValue is fresh

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
});
```

The parent's `ref.current` now has three methods. The parent has zero access to the `<input>` DOM node or to `inputRef` — those are internal.

## Practical Use Cases

### Video / Media Player API

```javascript
const VideoPlayer = forwardRef((props, ref) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useImperativeHandle(ref, () => ({
    play: () => {
      videoRef.current.play();
      setIsPlaying(true);
    },
    pause: () => {
      videoRef.current.pause();
      setIsPlaying(false);
    },
    seek: (time) => {
      videoRef.current.currentTime = time;
    },
  }));

  return <video ref={videoRef} src={props.src} />;
});
```

An external orchestrator (e.g., a playlist manager) can control playback without reaching into the DOM.

### Modal / Dialog

```javascript
const Modal = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  if (!isOpen) return null;

  return (
    <div className="modal">
      {props.children}
      <button onClick={() => setIsOpen(false)}>Close</button>
    </div>
  );
});

// Usage: programmatic control from parent
const modalRef = useRef(null);
<Modal ref={modalRef} />
<button onClick={() => modalRef.current.open()}>Open Modal</button>
```

### Form with Custom Validation Trigger

```javascript
const Form = forwardRef((props, ref) => {
  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    validate: () => {
      const newErrors = validate(props.values);
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    reset: () => setErrors({}),
  }));

  return (
    <form>
      {/* ... */}
    </form>
  );
});

// Wizard that validates each step before advancing
const isValid = formRef.current.validate();
if (isValid) goToNextStep();
```

## When to Reach for This (and When Not To)

`useImperativeHandle` is an **escape hatch** — the React docs say so explicitly. It's for cases where the imperative pattern genuinely makes the most sense: media playback, focus management, scroll control. These are inherently imperative operations.

For most things, stay declarative:

```javascript
// ❌ Imperative: parent controls child's open/close state through a ref
modalRef.current.open();

// ✅ Declarative: parent passes a prop, child reacts to it
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

The declarative approach is more predictable, easier to test, works with SSR, and doesn't require the parent to hold a ref. Reach for `useImperativeHandle` when:

1. You're wrapping an inherently imperative API (HTML5 media, canvas, animation libraries)
2. You need to expose a higher-level operation that involves coordinating multiple DOM calls
3. You're building a design system where consumers must be prevented from accessing internal DOM structure

Don't use it to avoid passing props.

## React 19 Note

In React 19, `ref` becomes a regular prop — `forwardRef` is no longer needed. You can just write:

```javascript
function Input({ ref, ...props }) {
  useImperativeHandle(ref, () => ({
    focus: () => { /* ... */ },
  }));
  return <input {...props} />;
}
```

`forwardRef` still works in React 19 for backwards compatibility, but it's deprecated. For React 16–18, `forwardRef` is required.

## Gotchas

### 1. Don't expose the raw DOM node

If you use `useImperativeHandle`, the whole point is to control what the parent sees. Returning `inputRef.current` from the factory defeats the purpose:

```javascript
// ❌ Defeats the point — just use forwardRef without useImperativeHandle
useImperativeHandle(ref, () => inputRef.current);
```

### 2. Methods are stale if deps are wrong

```javascript
useImperativeHandle(ref, () => ({
  getValue: () => value, // Closes over value
}), []); // ❌ Missing value in deps — getValue returns stale value
```

Any method that closes over state or props needs those values in the deps array.

### 3. Calling methods before the component mounts

```javascript
useEffect(() => {
  ref.current.focus(); // Safe — effect runs after mount
}, []);

// ❌ Not safe — called during render, before useImperativeHandle runs
console.log(ref.current.focus());
```

`useImperativeHandle` runs during the commit phase (after the component mounts). Don't call methods during render.

### 4. useImperativeHandle doesn't work without forwardRef (pre-React 19)

If you use `useImperativeHandle` with a ref that wasn't forwarded via `forwardRef`, the ref object is just the default ref — `useImperativeHandle` has nothing to write to.

## Interview Questions

**Q: What problem does `forwardRef` solve, and when do you need it?**

Strong answer: By default, React doesn't pass `ref` through function components. If a parent attaches a ref to a function component, the ref is silently unused. `forwardRef` explicitly opts the component into ref forwarding — it receives the parent's ref as a second argument, which it can then attach to a DOM element (for direct DOM access) or use with `useImperativeHandle` (for a custom API). You need it whenever a component acts as a wrapper and the consumer needs to control the underlying DOM element — a `TextInput` wrapper where the parent needs to call `.focus()`, a `ScrollableList` where the parent needs to `.scrollTo()` a position, or any UI library component that wraps a native element.

The trap: Not knowing it exists and wondering why ref.current is always null. Or not knowing about React 19 making it obsolete.

---

**Q: What does `useImperativeHandle` actually do? When would you use it over plain `forwardRef`?**

Strong answer: `useImperativeHandle` replaces what `ref.current` points to with a custom object. Where plain `forwardRef` gives the parent direct access to a DOM node, `useImperativeHandle` gives the parent a controlled API. Use plain `forwardRef` when the parent legitimately needs raw DOM access (focus, measurement, scroll). Use `useImperativeHandle` when you want to expose higher-level operations (`modal.open()` instead of `div.style.display`), when you want to hide internal DOM structure from consumers, or when you need to expose a combined API across multiple internal DOM nodes. It's an escape hatch — most of the time, passing props and callbacks is the right approach.

The trap: Using `useImperativeHandle` to avoid passing props. The React model is declarative; imperative refs are for when the DOM's inherent imperativism can't be abstracted away.

---

**Q: Why does a function component need `forwardRef` at all? Why can't you just do `({ ref }) => ...`?**

Strong answer: In React, `ref` is a reserved prop name — like `key`, it's handled specially by React and doesn't appear in the `props` object. React strips `ref` out before passing props to the component. `forwardRef` is the explicit mechanism that tells React "this component knows what to do with the ref, pass it through." In React 19, this restriction was lifted — `ref` is now a regular prop and `forwardRef` is unnecessary. In React 16–18, you must use `forwardRef` or the ref is silently swallowed.

The trap: Trying `props.ref` and being confused when it's undefined. Understanding that React handles `ref` specially is the foundation.

---

*Next: [useTransition](11-use-transition.md) — Marking state updates as non-urgent so the UI stays responsive during expensive transitions.*
