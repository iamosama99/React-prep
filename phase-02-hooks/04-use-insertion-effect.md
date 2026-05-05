# useInsertionEffect

## What Is This?

`useInsertionEffect` is the most specialized effect in React. It runs *before* all other effects, at the exact moment when React inserts DOM nodes into the page, *before* `useLayoutEffect` and `useEffect`.

```javascript
useInsertionEffect(() => {
  // Runs before other effects
  // Inject CSS, set up theme system, etc.
}, []);
```

It's meant for one specific use case: **CSS-in-JS libraries** that need to inject styles before any effects read the DOM or measure elements. You probably won't use this directly unless you're building a design system or CSS-in-JS library.

## Why Does It Exist?

CSS-in-JS libraries (like Emotion, Styled Components, Vanilla Extract) generate CSS dynamically and inject it into the page. The problem: if a regular effect measures an element, it needs the final styles already applied. If styles are injected after the effect runs, the measurements will be wrong.

Timeline without `useInsertionEffect`:

```
1. DOM nodes inserted
2. useLayoutEffect runs, measures element (but styles aren't applied yet!)
3. useEffect runs
4. CSS-in-JS library injects styles
5. Element reflows with correct styles
```

The measurement in step 2 is wrong because the styles aren't applied.

With `useInsertionEffect`:

```
1. DOM nodes inserted
2. useInsertionEffect runs, injects styles
3. useLayoutEffect runs, measures element (styles are applied!)
4. useEffect runs
```

Now measurements see the final styles.

## How It Works

Signature and API are identical to `useEffect`:

```javascript
useInsertionEffect(() => {
  // Setup code
  
  return () => {
    // Cleanup code
  };
}, [dependencies]);
```

But the timing is special:

```javascript
useInsertionEffect(() => {
  console.log('1. useInsertionEffect');
}, []);

useLayoutEffect(() => {
  console.log('2. useLayoutEffect');
}, []);

useEffect(() => {
  console.log('3. useEffect');
}, []);

// Output:
// 1. useInsertionEffect
// 2. useLayoutEffect
// 3. useEffect
```

All effects run synchronously. `useInsertionEffect` can be thought of as "before the DOM is even visible to other JavaScript code."

## CSS-in-JS Use Case (Real World)

A CSS-in-JS library using `useInsertionEffect`:

```javascript
// Inside a CSS-in-JS library
useInsertionEffect(() => {
  // Generate and inject CSS
  const css = generateStyles(props);
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  
  // Cleanup: remove styles when component unmounts
  return () => {
    style.remove();
  };
}, [props]);
```

Now when user code runs `useLayoutEffect` to measure elements, the styles are already applied.

## Gotchas

### 1. Can't access refs

```javascript
// ❌ Won't work
const ref = useRef(null);
useInsertionEffect(() => {
  console.log(ref.current); // null — DOM isn't ready yet
}, []);
```

`useInsertionEffect` runs before DOM nodes are "ready" in the normal sense. Refs don't point to anything yet.

### 2. Can't read DOM properties

```javascript
// ❌ Won't work
useInsertionEffect(() => {
  const width = document.getElementById('main').offsetWidth; // Might be 0 or undefined
}, []);
```

The DOM is inserted, but the browser hasn't laid it out yet. Measurements are unreliable. (That's what `useLayoutEffect` is for.)

### 3. Can't setState

```javascript
// ❌ Problematic
useInsertionEffect(() => {
  setState(value); // Might trigger a re-render during commit phase
}, []);
```

Calling `setState` inside `useInsertionEffect` can cause issues because you're mutating state during React's commit phase. React hasn't finished committing the current render yet.

Actually, React *allows* it, but it's a code smell. If you need to update state based on some initialization, that logic should probably be in a regular `useLayoutEffect` or `useEffect`.

### 4. Most developers should never use it

This hook is an implementation detail for library authors, not application code. If you're building a web app, you should never need it. If you find yourself reaching for it, you're probably solving the problem wrong.

### 5. No widespread browser support yet (early 2026)

`useInsertionEffect` is relatively new. It's stable in modern React, but if you're targeting older browsers, check support. In practice, this mainly matters for library authors who need to support a wide range of environments.

## When to Use

- **Yes:** You're building a CSS-in-JS library and need to inject styles before other effects run
- **Yes:** You're building a design system that needs to set up global state before components render
- **No:** You're building a regular React app
- **No:** You want to do anything other than inject CSS or set up global state
- **No:** You need to access the DOM (use `useLayoutEffect` instead)

## How It's Different From useLayoutEffect

| Aspect | useInsertionEffect | useLayoutEffect |
|--------|-------------------|-----------------|
| **When** | Before DOM is visible to other effects | After DOM is painted but before user sees it |
| **Access DOM** | ❌ No (browser hasn't laid it out) | ✅ Yes |
| **Measure elements** | ❌ No | ✅ Yes |
| **Inject styles** | ✅ Yes | ❌ Not the right tool |
| **Read refs** | ❌ No | ✅ Yes |
| **Normal use case** | Library code only | App code |

## Interview Questions

**Q: What's `useInsertionEffect` for, and when would you use it?**

Strong answer: `useInsertionEffect` runs before `useLayoutEffect` and `useEffect`. It's designed for CSS-in-JS libraries that need to inject styles before other effects run and measure the DOM.

If an effect measures an element, it needs the final CSS already applied. With `useInsertionEffect`, the library injects styles first, then measurements in other effects see the correct values.

Most developers won't use this directly. It's a library author's tool. If you're building a web app, you should never need it.

The trap: Beginners think `useInsertionEffect` is for initialization code. It's not — it's specifically for CSS injection. Also, they try to access the DOM or read refs inside it, which doesn't work because the browser hasn't laid out the DOM yet.

---

**Q: Why can't you measure elements in `useInsertionEffect`?**

Strong answer: Because the browser hasn't laid out the DOM yet. At the point when `useInsertionEffect` runs, React has inserted DOM nodes, but the browser hasn't calculated their sizes, positions, or styles. So `offsetWidth`, `getBoundingClientRect()`, etc. will return stale or 0 values.

That's what `useLayoutEffect` is for — it runs after the browser has calculated layout, so measurements are accurate.

Timeline:
1. React inserts DOM nodes
2. `useInsertionEffect` runs (browser hasn't laid out yet)
3. Browser calculates layout
4. `useLayoutEffect` runs (measurements are accurate)
5. Browser paints
6. `useEffect` runs

The trap: Developers confuse the effects' purposes and try to measure in `useInsertionEffect`, then wonder why they get 0 or old values.

---

**Q: How is `useInsertionEffect` different from injecting styles in a `<style>` tag?**

Strong answer: `useInsertionEffect` injects styles at the exact right moment in React's render cycle — before other effects run. A static `<style>` tag in your HTML always loads, even if you don't need it. Dynamic injection via `useInsertionEffect` lets libraries inject styles on-demand, per-component.

Also, `useInsertionEffect` allows cleanup — when the component unmounts, the effect cleanup can remove the styles from the page. A static `<style>` tag stays forever.

For CSS-in-JS libraries that want to inject scoped, component-specific styles without bloating the initial HTML, `useInsertionEffect` is the right tool.

The trap: This is mostly relevant to library code. App developers writing HTML usually just use `<style>` or `<link>` tags. Understanding `useInsertionEffect` is more about appreciating how modern CSS-in-JS libraries work than about writing it yourself.

---

**Q: Can you access refs in `useInsertionEffect`?**

Strong answer: No. Refs won't be populated yet. `useInsertionEffect` runs at a point in the React lifecycle where DOM nodes have been inserted, but the browser hasn't laid them out, and React's internal state for refs hasn't fully settled.

Use `useLayoutEffect` or `useEffect` to access refs.

The trap: Developers new to `useInsertionEffect` try to access refs and get confused when they're null or undefined.

---

*Next: [useRef](05-use-ref.md) — Accessing DOM directly AND storing mutable values across renders.*
