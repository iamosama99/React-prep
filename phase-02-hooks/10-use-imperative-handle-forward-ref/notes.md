# useImperativeHandle + forwardRef

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| `forwardRef` | Wrapper that passes the parent's `ref` into a child function component | Without it, functional components silently ignore the `ref` prop |
| `useImperativeHandle` | Customizes what the forwarded ref exposes to the parent | Parent gets a controlled API instead of the raw DOM node |
| Object returned | The value assigned to the parent's `ref.current` | Parent can call `.focus()`, `.reset()`, etc. without DOM coupling |
| Escape hatch only | Use only for genuine imperative needs | Overusing it breaks declarative patterns |

## What Is This?

`useImperativeHandle` is a hook that lets you control what a parent sees when it accesses a ref on your component. Instead of the parent getting the raw DOM node, you can expose a custom object with specific methods.

It's always used with `forwardRef`, which is the mechanism that passes a parent's `ref` into a functional component.

```javascript
const FancyInput = forwardRef(function FancyInput(props, ref) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; },
  }));

  return <input ref={inputRef} {...props} />;
});

// Parent:
const ref = useRef(null);
<FancyInput ref={ref} />
ref.current.focus(); // Works — calls the custom focus method
ref.current.clear(); // Works — calls the custom clear method
```

> **Check yourself:** After `useImperativeHandle` runs, what does `ref.current` point to — the `<input>` DOM node, or the custom object?

## Why Does It Exist?

### The forwardRef Problem

By default, you can't pass a `ref` to a functional component:

```javascript
function MyInput(props) {
  return <input />;
}

const ref = useRef(null);
<MyInput ref={ref} />; // ⚠️ Warning: Function components cannot be given refs
```

React strips `ref` from props (just like `key`). It's not available in `props.ref`. To accept a ref, you must wrap the component in `forwardRef`:

```javascript
const MyInput = forwardRef(function MyInput(props, ref) {
  return <input ref={ref} />;
});

const ref = useRef(null);
<MyInput ref={ref} />; // ✅ ref.current = <input> DOM node
```

### The useImperativeHandle Problem

`forwardRef` alone exposes the entire DOM node to the parent. But sometimes you want to:
- Expose only specific methods (like `focus` and `scrollIntoView`)
- Hide the raw DOM node to prevent unintended manipulation
- Add logic around imperative actions (like validation before clearing)

`useImperativeHandle` lets you define exactly what the parent can do:

```javascript
useImperativeHandle(ref, () => ({
  // Parent can only call these methods — no direct DOM access
  focus: () => inputRef.current.focus(),
  selectAll: () => inputRef.current.select(),
}));
```

> **Check yourself:** Why would you want to hide the raw DOM node from the parent? What could go wrong if the parent has full DOM access?

## How It Works

### The API

```javascript
useImperativeHandle(ref, createHandle, [deps]);
```

- `ref`: The forwarded ref from `forwardRef`
- `createHandle`: A function that returns the object to assign to `ref.current`
- `deps` (optional): Dependency array — recreate the handle when deps change

### Full Example: Custom Video Player

```javascript
const VideoPlayer = forwardRef(function VideoPlayer({ src, poster }, ref) {
  const videoRef = useRef(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current.play(),
    pause: () => videoRef.current.pause(),
    seek: (time) => { videoRef.current.currentTime = time; },
    getCurrentTime: () => videoRef.current.currentTime,
    getDuration: () => videoRef.current.duration,
  }));

  return (
    <video ref={videoRef} src={src} poster={poster} />
  );
});

// Parent:
function MediaPage() {
  const playerRef = useRef(null);

  return (
    <>
      <VideoPlayer ref={playerRef} src="/video.mp4" />
      <button onClick={() => playerRef.current.play()}>Play</button>
      <button onClick={() => playerRef.current.pause()}>Pause</button>
      <button onClick={() => playerRef.current.seek(0)}>Restart</button>
    </>
  );
}
```

The parent gets a clean API (`play`, `pause`, `seek`) without knowing the component uses a `<video>` element internally.

### Dependencies

Like other hooks, `useImperativeHandle` accepts a dependency array:

```javascript
useImperativeHandle(ref, () => ({
  validate: () => {
    // Uses `rules` from props — needs to update when rules change
    return rules.every(rule => rule(inputRef.current.value));
  },
}), [rules]); // Recreate handle when rules change
```

If you omit the dependency array, the handle is recreated on every render. If you pass `[]`, it's created once.

## Common Use Cases

### 1. Form Controls with Custom API

```javascript
const FormField = forwardRef(function FormField({ label, validate }, ref) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    getValue: () => inputRef.current.value,
    validate: () => {
      const value = inputRef.current.value;
      const err = validate?.(value);
      setError(err);
      return !err;
    },
    reset: () => {
      inputRef.current.value = '';
      setError(null);
    },
  }), [validate]);

  return (
    <div>
      <label>{label}</label>
      <input ref={inputRef} />
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
});

// Parent: validate all fields before submit
function Form() {
  const nameRef = useRef(null);
  const emailRef = useRef(null);

  const handleSubmit = () => {
    const nameValid = nameRef.current.validate();
    const emailValid = emailRef.current.validate();
    if (nameValid && emailValid) {
      // submit...
    } else {
      // focus first invalid field
      if (!nameValid) nameRef.current.focus();
      else if (!emailValid) emailRef.current.focus();
    }
  };

  return (
    <>
      <FormField ref={nameRef} label="Name" validate={v => v ? null : 'Required'} />
      <FormField ref={emailRef} label="Email" validate={v => v.includes('@') ? null : 'Invalid'} />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}
```

### 2. Scrollable Container

```javascript
const ScrollableList = forwardRef(function ScrollableList({ items }, ref) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToTop: () => containerRef.current.scrollTo({ top: 0, behavior: 'smooth' }),
    scrollToBottom: () => {
      const el = containerRef.current;
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    },
    scrollToItem: (index) => {
      const item = containerRef.current.children[index];
      item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  }));

  return (
    <div ref={containerRef} style={{ height: 300, overflowY: 'auto' }}>
      {items.map((item, i) => <div key={i}>{item}</div>)}
    </div>
  );
});
```

### 3. Modal with Open/Close API

```javascript
const Modal = forwardRef(function Modal({ children }, ref) {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(o => !o),
    isOpen: () => isOpen,
  }), [isOpen]);

  if (!isOpen) return null;
  return <div className="modal-overlay"><div className="modal">{children}</div></div>;
});

// Parent:
const modalRef = useRef(null);
<button onClick={() => modalRef.current.open()}>Open Modal</button>
<Modal ref={modalRef}><p>Modal content</p></Modal>
```

## When to Use (and When Not To)

### ✅ Use when:
- A parent needs imperative control (focus, scroll, play/pause)
- You want to hide internal DOM structure from the parent
- You're building reusable form controls or media components
- The alternative (lifting state) would be awkward or create too much coupling

### ❌ Don't use when:
- You can solve the problem declaratively (pass props instead)
- You're using it to avoid lifting state (that's usually better solved with state lifting)
- You're exposing the same API as the raw DOM node (just forward the ref directly)

> **Check yourself:** A junior developer uses `useImperativeHandle` to expose a `setText` method. Could this be solved with a `value` prop instead? Which approach is more "React-like"?

## Gotchas

### 1. Forgetting forwardRef

```javascript
// ❌ useImperativeHandle does nothing — ref is never forwarded
function MyComponent(props, ref) {
  useImperativeHandle(ref, () => ({ focus: () => {} }));
  return <input />;
}

// ✅ Must wrap with forwardRef
const MyComponent = forwardRef(function MyComponent(props, ref) {
  useImperativeHandle(ref, () => ({ focus: () => {} }));
  return <input />;
});
```

### 2. Exposing too much

```javascript
// ❌ Exposes everything — might as well just forward the ref
useImperativeHandle(ref, () => inputRef.current);

// ✅ Expose only what the parent needs
useImperativeHandle(ref, () => ({
  focus: () => inputRef.current.focus(),
}));
```

### 3. Stale handle from missing dependencies

```javascript
// ❌ Missing `items` dep — scrollToItem always uses stale items
useImperativeHandle(ref, () => ({
  scrollToItem: (id) => {
    const index = items.findIndex(i => i.id === id);
    // ...
  },
}), []); // items not in deps!

// ✅ Include items
useImperativeHandle(ref, () => ({
  scrollToItem: (id) => {
    const index = items.findIndex(i => i.id === id);
    // ...
  },
}), [items]);
```

### 4. Using imperative patterns where declarative patterns work

```javascript
// ❌ Imperative: parent controls visibility via ref
modalRef.current.open();

// ✅ Declarative: parent controls visibility via props
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

React is declarative. Use `useImperativeHandle` only when the declarative approach is genuinely awkward (focus management, scroll position, media playback).

### 5. The handle object is not reactive

```javascript
useImperativeHandle(ref, () => ({
  isOpen: () => isOpen, // Returns a snapshot, not a live binding
}), [isOpen]);

// Parent:
ref.current.isOpen(); // Returns the value from when the handle was created
```

If the parent needs a reactive value, use props or callbacks instead.

## Interview Questions

**Q (High): When should you use `useImperativeHandle`?**

Answer: When a component must expose imperative methods to its parent, like `focus()`, `scrollIntoView()`, `play()`, or `reset()`. It's an escape hatch for cases where declarative props can't solve the problem — typically DOM-level actions that don't map to React's data-flow model.

Real-world examples: custom form controls that expose `validate()` and `reset()`, media players that expose `play()` and `seek()`, scrollable containers that expose `scrollToItem()`.

The trap: Using it to avoid lifting state or to expose state setters. If you can solve the problem with props, do that instead.

---

**Q (High): What is the role of `forwardRef` in this pattern?**

Answer: `forwardRef` makes the parent's ref available as the second argument to the child function component. Without it, the `ref` prop is silently stripped by React (just like `key`) and never reaches the child. `useImperativeHandle` then customizes what that forwarded ref exposes.

The sequence: `forwardRef` receives the ref → `useImperativeHandle` defines what `ref.current` contains → parent accesses `ref.current.method()`.

The trap: Confusing `forwardRef` with `useRef`, or thinking `forwardRef` alone exposes custom methods (it only forwards the ref — `useImperativeHandle` customizes it).

---

**Q (Medium): What does `ref.current` point to after `useImperativeHandle` runs?**

Answer: The custom object returned by `useImperativeHandle`'s factory function — *not* the raw DOM node. The parent only sees whatever you return from the factory.

```javascript
useImperativeHandle(ref, () => ({ focus: () => inputRef.current.focus() }));
// ref.current = { focus: [Function] }
// NOT ref.current = <input> DOM node
```

The trap: Assuming `ref.current` is the DOM node and trying to access DOM properties like `ref.current.value` or `ref.current.style`.

---

**Q (Medium): Can you use `useImperativeHandle` without `forwardRef`?**

Answer: Technically you can call it, but the `ref` parameter would be `undefined` or `null`, making it useless. `useImperativeHandle` requires a valid ref to assign the handle to, and `forwardRef` is the standard way to receive one.

The trap: Not understanding why the imperative handle "doesn't work" when `forwardRef` is missing — no error is thrown, it just silently does nothing.

---

**Q (Low): Should you expose the raw DOM node or a custom API?**

Answer: Prefer a custom API when possible. Exposing the raw DOM node gives the parent full access to manipulate the child's internals, which breaks encapsulation. A custom API communicates exactly what operations are supported and hides implementation details.

Exception: simple wrapper components where the parent legitimately needs DOM access (like a styled input wrapper). In that case, just forward the ref directly without `useImperativeHandle`.

The trap: Always using `useImperativeHandle` when simple ref forwarding would suffice.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can write a `forwardRef` + `useImperativeHandle` example that exposes a `focus()` method from memory
- [ ] Can explain what `ref.current` points to after `useImperativeHandle` sets it (the custom object, not the DOM node)
- [ ] Can state the consequence of using `useImperativeHandle` without `forwardRef`
- [ ] Can name the kind of use case that justifies `useImperativeHandle` versus lifting state
- [ ] Can articulate why React prefers declarative patterns and when imperative patterns are acceptable

---

*Next: [useTransition](../11-use-transition/notes.md) — for marking updates as non-urgent in concurrent rendering.*
