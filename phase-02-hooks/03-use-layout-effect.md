# useLayoutEffect

## What Is This?

`useLayoutEffect` is identical to `useEffect` in signature and behavior — same dependency array, same cleanup functions — but it runs *synchronously* after DOM mutations and *before* the browser paints the screen.

```javascript
useLayoutEffect(() => {
  // Runs after DOM updates but BEFORE paint
  element.style.width = computedWidth;
}, [dependency]);
```

Think of it as `useEffect` that fires before you see the results on screen.

## Why Does It Exist?

Most side effects don't need to block painting. Fetching data, logging, setting up timers — these can happen after the screen updates. But some DOM operations *must* run before the browser paints, or users see flickering or jank.

Example: You want to measure a DOM element's width, then set its height based on that width. If you measure in a regular `useEffect` (which runs after paint), there's a brief moment where the DOM is painted without the correct height — flicker.

`useLayoutEffect` lets you make those measurements and mutations *before* the paint, preventing the flicker.

## How It Works

### The Timing

React's rendering model:

1. **Render phase**: Call component function, compute JSX.
2. **Commit phase**: Apply DOM mutations.
3. **useLayoutEffect**: Runs synchronously (blocks the browser).
4. **Paint**: Browser paints the screen.
5. **useEffect**: Runs asynchronously (doesn't block the browser).

So layout effects run in between commit and paint. They're synchronous — React waits for them to complete before letting the browser paint.

### Synchronous Measurement

```javascript
function Sidebar() {
  const [width, setWidth] = useState(null);
  const sidebarRef = useRef(null);
  
  useLayoutEffect(() => {
    // Measure BEFORE paint
    const rect = sidebarRef.current.getBoundingClientRect();
    setWidth(rect.width);
  }, []);
  
  return (
    <div ref={sidebarRef}>
      Width: {width}px
    </div>
  );
}
```

If you used `useEffect` here, React would paint the screen with `width: null`, then measure and update state, causing a re-render and flicker. With `useLayoutEffect`, the measurement happens before paint, so the screen shows the correct width immediately.

### Flicker Scenario (useEffect)

```javascript
useEffect(() => {
  // Runs AFTER paint
  const height = measure();
  element.style.height = height; // Triggers another render → repaint
}, []);

// Timeline:
// 1. Paint with no height
// 2. useEffect runs
// 3. DOM updated
// 4. Browser repaints
// Result: User sees flicker
```

### No Flicker (useLayoutEffect)

```javascript
useLayoutEffect(() => {
  // Runs BEFORE paint
  const height = measure();
  element.style.height = height;
}, []);

// Timeline:
// 1. useLayoutEffect runs, measures, updates DOM
// 2. Paint with correct height
// Result: No flicker
```

## Common Use Cases

### 1. Measuring Elements

```javascript
function ResponsiveText() {
  const [isMobile, setIsMobile] = useState(false);
  const textRef = useRef(null);
  
  useLayoutEffect(() => {
    const width = textRef.current.offsetWidth;
    setIsMobile(width < 600);
  }, []);
  
  return <div ref={textRef}>{isMobile ? 'Mobile' : 'Desktop'}</div>;
}
```

### 2. Setting Initial Scroll Position

```javascript
function ScrollToTop() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0); // Run before paint
  }, []);
  
  return <div>Content</div>;
}
```

If you used `useEffect`, the user might see the old scroll position briefly before jumping to top.

### 3. DOM Measurement-Based Styling

```javascript
function Dropdown() {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  
  useLayoutEffect(() => {
    // Position menu below trigger, account for viewport
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    
    const top = triggerRect.bottom;
    const left = triggerRect.left;
    
    // Adjust if menu goes off-screen
    if (left + menuRect.width > window.innerWidth) {
      menuRef.current.style.left = `${window.innerWidth - menuRect.width}px`;
    }
  }, [isOpen]);
  
  return (
    <>
      <button ref={triggerRef}>Menu</button>
      {isOpen && <Menu ref={menuRef} />}
    </>
  );
}
```

Measure and position before paint to avoid layout thrashing (measuring, calculating, painting, measuring again, etc.).

## Performance Implications

`useLayoutEffect` blocks the browser from painting. If your effect is expensive, it jank the UI. Use it sparingly.

```javascript
// ❌ BAD: Heavy computation blocks paint
useLayoutEffect(() => {
  for (let i = 0; i < 1000000; i++) {
    expensiveCalculation();
  }
}, []);

// ✅ GOOD: Fast measurement, defer expensive work
useLayoutEffect(() => {
  const width = measure(); // Quick
  setState(width); // Quick
}, []);

// ✅ GOOD: Do expensive work in useEffect (after paint)
useEffect(() => {
  for (let i = 0; i < 1000000; i++) {
    expensiveCalculation();
  }
}, []);
```

## Server-Side Rendering (SSR)

`useLayoutEffect` doesn't run on the server (only in the browser). If you need to run code in both, use `useEffect`. This is usually the right choice for SSR apps.

```javascript
// Runs on server and in browser
useEffect(() => {
  initializeData();
}, []);

// Runs only in browser (after hydration)
useLayoutEffect(() => {
  measureAndPosition();
}, []);
```

## Gotchas

### 1. useLayoutEffect runs before useEffect

```javascript
useLayoutEffect(() => {
  console.log('1. useLayoutEffect');
}, []);

useEffect(() => {
  console.log('2. useEffect');
}, []);

// Output:
// 1. useLayoutEffect
// 2. useEffect
```

Layout effects always run first.

### 2. It's synchronous — slow effects will jank

```javascript
useLayoutEffect(() => {
  // This takes 200ms
  const result = runHeavyCalculation();
  setData(result);
  // Browser is frozen for 200ms
}, []);
```

Users will see a stuttering/janky UI while the effect runs.

### 3. Easy to break server rendering

```javascript
useLayoutEffect(() => {
  element.style.width = window.innerWidth; // window is undefined on server
}, []);
```

This crashes if you forget to check for `typeof window`.

Better:

```javascript
useLayoutEffect(() => {
  if (typeof window !== 'undefined') {
    element.style.width = window.innerWidth;
  }
}, []);
```

### 4. Can't wait for async operations

```javascript
// ❌ Wrong
useLayoutEffect(async () => {
  await fetchData();
}, []);

// useLayoutEffect must return cleanup or nothing, not a promise
```

If you need to wait for async operations before measuring, that's a code smell. Rethink the design. Usually you measure synchronously, then do async work in `useEffect`.

### 5. Infinite loops still possible

```javascript
useLayoutEffect(() => {
  setState(value); // Triggers re-render
}, [value]); // Dependency on state
```

Every effect run updates state, which triggers the effect again.

## Interview Questions

**Q: When does `useLayoutEffect` run relative to painting?**

Strong answer: After React commits DOM mutations but *before* the browser paints the screen. It's synchronous — React waits for the effect to complete before allowing the paint to happen. This is different from `useEffect`, which runs *after* the paint.

Use `useLayoutEffect` when you need to make DOM measurements or mutations that, if they happened after paint, would cause visible flicker or jank.

The trap: Developers don't know this hook exists or don't understand the timing difference. They use `useEffect` for measurements, see flickering, and don't know why. Also, they forget that `useLayoutEffect` blocks the browser, so putting expensive code in it jank the UI.

---

**Q: Give an example where you'd use `useLayoutEffect` instead of `useEffect`.**

Strong answer: Measuring a DOM element and using that measurement to set a style, before the paint happens.

```javascript
function Component() {
  const ref = useRef(null);
  
  useLayoutEffect(() => {
    const width = ref.current.offsetWidth;
    ref.current.style.height = `${width * 2}px`; // Set height based on width
  }, []);
  
  return <div ref={ref}>Content</div>;
}
```

With `useEffect`, React would paint the element without the correct height, then measure, update, and repaint — causing visible flicker. With `useLayoutEffect`, the measurement and style update happen before the first paint, so the element appears correct immediately.

Another example: positioning a dropdown menu. You measure where the trigger button is, then position the menu relative to it. If you do this in `useEffect`, the menu might appear in the wrong place briefly before jumping to the correct position.

The trap: Overusing `useLayoutEffect`. Most effects should be `useEffect`. Only use layout effects when you have a real flicker problem that's caused by paint timing.

---

**Q: Why is `useLayoutEffect` bad for performance, and when should you avoid it?**

Strong answer: `useLayoutEffect` is synchronous — the browser can't paint until it completes. If your effect is slow, it blocks the UI thread and causes jank.

Avoid it when:
- You're doing expensive computations (can defer to `useEffect` or a Web Worker)
- You're fetching data (always use `useEffect`)
- You're setting up timers or listeners (use `useEffect`)

Use it only for:
- Quick DOM measurements (microseconds)
- Immediate style updates based on measurements
- Initialization that must happen before paint

```javascript
// ❌ Bad: Expensive computation blocks paint
useLayoutEffect(() => {
  const result = runExpensiveAlgorithm(); // 100ms
  setState(result);
}, []);

// ✅ Good: Fast measurement only
useLayoutEffect(() => {
  const width = element.offsetWidth; // ~1ms
  setState(width);
}, []);
```

The trap: Developers put all their logic in `useLayoutEffect` thinking it's the "more correct" hook, then wonder why the UI feels sluggish. It's a performance footgun if used wrong.

---

**Q: Does `useLayoutEffect` run on the server?**

Strong answer: No. It only runs in the browser after hydration. `useLayoutEffect` is inherently a browser API (it deals with DOM measurements and paint timing, which don't exist on the server).

If you're doing SSR, use `useEffect` for code that should run on both server and client. Use `useLayoutEffect` only for browser-specific measurements.

```javascript
// Runs on server and in browser
useEffect(() => { ... }, []);

// Runs only in browser
useLayoutEffect(() => { ... }, []);
```

The trap: Code that reads `window` or `document` in `useLayoutEffect` will crash on the server if you're not careful. You should guard it, though usually `useLayoutEffect` is safe on the server because it simply doesn't run.

---

**Q: What's the cleanup function do in `useLayoutEffect`?**

Strong answer: Same as in `useEffect` — it runs before the effect re-runs and before the component unmounts. It lets you undo whatever the effect did.

```javascript
useLayoutEffect(() => {
  element.style.width = computedWidth;
  
  return () => {
    element.style.width = ''; // Reset style on cleanup
  };
}, []);
```

The cleanup runs synchronously, just like the effect itself. It's called before the browser paints.

The trap: Same as `useEffect` — forgetting the cleanup function or not returning a function (returning something else causes an error).

---

*Next: [useInsertionEffect](04-use-insertion-effect.md) — The most specialized effect, for CSS-in-JS libraries.*
