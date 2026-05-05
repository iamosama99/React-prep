# Synthetic Events

## What Is This?

When a user clicks a button, types in an input, or submits a form, the browser fires a native DOM event. React doesn't pass that raw native event to your handler — it wraps it in a **SyntheticEvent**: a cross-browser-consistent wrapper that normalizes the native event's API across different browsers.

```jsx
function Button() {
  function handleClick(event) {
    // `event` here is a SyntheticEvent, not a raw MouseEvent
    console.log(event.type);         // 'click'
    console.log(event.target);       // the DOM node that was clicked
    event.preventDefault();          // works exactly like the native version
    event.stopPropagation();         // also works
    console.log(event.nativeEvent);  // the real underlying browser event
  }

  return <button onClick={handleClick}>Click me</button>;
}
```

The SyntheticEvent has the same interface as the native event — same properties, same methods — so in most cases you don't think about the distinction. It's a transparent wrapper. But understanding why it exists and how it works explains some behaviors that otherwise seem surprising.

---

## Why React Has Its Own Event System

**Browser inconsistency was the original reason.** Older browsers (IE especially) had incompatible event APIs. The event object had different property names. `event.target` wasn't always right — you'd sometimes need `event.srcElement`. `addEventListener` vs `attachEvent`. Bubbling worked differently. React's synthetic event layer smoothed over all of that, giving you one consistent API regardless of which browser was running your code.

This is less relevant today — modern browsers are much more consistent. But the synthetic event system exists for another reason too:

**Event delegation.** React doesn't attach your event listeners directly to each DOM node. Instead, it attaches a single listener at the root (document root in React 17+, the React root container in React 18+). When any DOM event bubbles up to that root listener, React looks at which component was the source, finds the matching handler in the fiber tree, and calls it — passing a SyntheticEvent.

This is more efficient at scale: instead of thousands of individual event listeners (one per button, one per input), there's one listener at the top. Adding and removing components doesn't add or remove event listeners from the DOM — just the fiber tree changes. React can control the entire event dispatch lifecycle, ensuring consistent behavior for batching, synthetic event creation, and future features.

---

## How React's Event System Works

1. User interacts with a DOM element
2. Browser fires a native event, which bubbles up through the DOM tree
3. React's single root listener intercepts the event at the root
4. React identifies which fiber component was the target
5. React creates a SyntheticEvent wrapping the native event
6. React calls the corresponding event handler in the component tree (e.g., `onClick`)
7. The SyntheticEvent is passed to your handler

From your perspective as the developer, step 6 and 7 are all you see: your handler gets called with an event object. The rest is React's internal machinery.

---

## Event Pooling — The Old Behavior (Pre-React 17)

This is important historical context that still appears in older codebases.

Before React 17, React "pooled" synthetic events. After your event handler finished, React would "nullify" the event object — set all its properties to null — and return it to a pool for reuse. This was a memory optimization: instead of creating a new event object for every event, React reused pooled objects.

The consequence: you couldn't access event properties asynchronously:

```jsx
// This was broken in React <17
function handleChange(event) {
  setTimeout(() => {
    console.log(event.target.value); // null! Event was nullified
  }, 1000);
}
```

The workaround was `event.persist()` — which removed the event from the pool and kept it alive:

```jsx
function handleChange(event) {
  event.persist(); // keep the event alive
  setTimeout(() => {
    console.log(event.target.value); // now works
  }, 1000);
}
```

**React 17 removed event pooling entirely.** Synthetic events are now regular objects — they're garbage collected like any other JavaScript object when they go out of scope. `event.persist()` still exists (as a no-op) to avoid breaking old code, but you don't need it anymore.

If you see `event.persist()` in a codebase, it was written for React 16 or earlier. In React 17+, it does nothing.

---

## Event Delegation Change in React 17

Another significant change in React 17: **React moved event delegation from `document` to the React root container.**

Before React 17, React attached its single root listener to `document`. In React 17+, it attaches to the root DOM node you passed to `ReactDOM.render` or `ReactDOM.createRoot`.

Why does this matter? If you're running multiple React apps on the same page (e.g., migrating from an older React version to a newer one), they now have separate event listeners that don't interfere with each other. Before this change, both apps' events bubbled to the same `document` listener, causing conflicts.

It also means `document.addEventListener(...)` event listeners attached outside React now interact with React events differently. If you stop propagation at the document level, it no longer stops React's event handlers. If a React handler calls `e.stopPropagation()`, the event stops at the React root, not at the document. Code that depended on the old interaction model (e.g., click-outside-to-close a dropdown by catching clicks at `document`) may need adjustment.

---

## The SyntheticEvent API

The interface mirrors native events exactly, so you don't need to memorize a different API:

```jsx
function Form() {
  function handleSubmit(e) {
    e.preventDefault();         // prevents page reload on form submit — same as native
    e.stopPropagation();        // prevents bubbling — same as native
    console.log(e.target);      // the form DOM node
    console.log(e.currentTarget); // same as target here — the element with the handler
    console.log(e.type);        // 'submit'
    console.log(e.nativeEvent); // the underlying native SubmitEvent
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

For input events:

```jsx
function Input() {
  function handleChange(e) {
    console.log(e.target.value);   // the input's current value
    console.log(e.target.checked); // for checkboxes
    console.log(e.target.type);    // 'text', 'checkbox', etc.
  }

  return <input onChange={handleChange} />;
}
```

---

## React's Event Names — camelCase, Not Lowercase

In HTML, event attributes are lowercase: `onclick`, `onsubmit`, `onchange`.

In React JSX, they're camelCase: `onClick`, `onSubmit`, `onChange`.

This is consistent with the fact that JSX attributes map to JavaScript property names (same reason for `className` instead of `class`). The DOM event handler property is `element.onClick` — camelCase. JSX mirrors that.

```jsx
// HTML
<button onclick="handleClick()">...</button>

// React JSX
<button onClick={handleClick}>...</button>
```

The value is also different: HTML uses a string with a function call. React takes a function reference.

---

## Passive Event Listeners

Native DOM events can be *passive* — a hint to the browser that the handler won't call `preventDefault()`, allowing the browser to optimize scrolling behavior. React's synthetic event system doesn't use passive listeners by default for all events.

For `touchstart` and `touchmove`, passive listeners are important for smooth scrolling on mobile. React's event handlers for these are passive by default in modern React (to avoid blocking scrolling). But if you call `e.preventDefault()` inside them (e.g., to prevent scroll during a drag), it won't work from React handlers — the browser ignores `preventDefault()` on passive listeners.

The workaround: attach the event listener directly to the DOM node via `useEffect` with `{ passive: false }`:

```jsx
useEffect(() => {
  const el = containerRef.current;
  const handler = (e) => {
    e.preventDefault(); // now works — this is a native non-passive listener
  };
  el.addEventListener('touchmove', handler, { passive: false });
  return () => el.removeEventListener('touchmove', handler);
}, []);
```

This is one of the few cases where you need to reach past React's event system to a native listener.

---

## Capture Phase Events

By default, React attaches handlers to the bubble phase (events bubbling up the DOM tree). To handle events in the capture phase (events trickling down before reaching the target), append `Capture` to the event name:

```jsx
<div onClickCapture={handleCaptureClick}>
  <button onClick={handleBubbleClick}>Click</button>
</div>
```

When the button is clicked:
1. `handleCaptureClick` fires first (capture phase, on the way down)
2. `handleBubbleClick` fires second (bubble phase, on the way up)

Capture phase handlers are rarely needed in application code — they're more common in utilities like dropdown close-on-outside-click, global hotkey listeners, or analytics that need to intercept events before any component handles them.

---

## Gotchas

**`event.persist()` is a no-op in React 17+.** Don't write it in new code. If you see it, it was written for React 16 or earlier. You can access event properties asynchronously in React 17+ without it.

**React's `onChange` fires on every keystroke, unlike the native `change` event.** The native `change` event fires on blur (when the user leaves the field). React's `onChange` maps to the native `input` event (fires on every keystroke). This is the more useful behavior for controlled inputs, but if you're used to native behavior, the frequency will surprise you. If you specifically need blur behavior, use React's `onBlur` event.

**`e.stopPropagation()` stops React's synthetic event bubbling, not native event bubbling.** Because React uses event delegation (one listener at the root), calling `stopPropagation` on a synthetic event doesn't stop the native event from bubbling up the real DOM. The native event still travels all the way to React's root listener — React just doesn't fire handlers above the component that stopped propagation.

**Returning `false` from an event handler does not prevent default or stop propagation.** In vanilla JavaScript, `return false` in an inline handler does both. In React, it does nothing. You must explicitly call `e.preventDefault()` and/or `e.stopPropagation()`.

**`document` listeners and React 17+ event delegation interact differently.** After React 17, React's synthetic events stop at the root container, not the document. If you have native `document.addEventListener` handlers expecting to catch events that React also handles, calling `e.stopPropagation()` in a React handler no longer prevents them from firing. The event already bubbled to the root before React processed it.

---

## Interview Questions

**Q: What is a SyntheticEvent in React?**

Answer: A SyntheticEvent is React's cross-browser wrapper around native DOM events. It normalizes browser inconsistencies so you get a consistent interface regardless of the browser. The SyntheticEvent has the same API as native events — `e.target`, `e.preventDefault()`, `e.stopPropagation()`, etc. — so in most cases you don't notice the difference. React creates one for each handled event and passes it to your handler. You can always access the underlying native event via `e.nativeEvent` if you need something React doesn't expose.

The trap: Saying "it's just a native event." The distinction matters because the synthetic event layer is how React normalizes browser inconsistencies and how it integrates with its delegation model. Also, not knowing `e.nativeEvent` gives you the underlying native event.

---

**Q: What was event pooling in React, and why was it removed?**

Answer: Event pooling was a React optimization before React 17: after your event handler returned, React would nullify the synthetic event object's properties and return the object to a pool for reuse on the next event. This prevented garbage collection overhead by reusing objects. The downside was that asynchronous code couldn't access event properties after the handler finished — `e.target.value` would be null by the time a `setTimeout` ran. The workaround was `event.persist()`, which removed the event from the pool. React 17 removed pooling entirely — synthetic events are now regular JavaScript objects that get garbage collected normally. `event.persist()` still exists as a no-op to avoid breaking old code.

The trap: Not knowing it was removed. Many resources still explain event pooling as current behavior. Knowing it was removed in React 17 signals you keep up with React's evolution.

---

**Q: Why does React use event delegation instead of attaching listeners directly to elements?**

Answer: Event delegation attaches a single listener at a root level (in React 17+, the React root container) rather than individual listeners on each DOM element. When any event bubbles up to the root, React intercepts it, looks up which fiber component triggered it, and calls the correct handler. This is more efficient at scale — a list of 1,000 items has one root listener, not 1,000 button listeners. It also means event listeners don't need to be attached and detached when components mount and unmount — only the fiber tree changes. React maintains full control over the event lifecycle, which enables consistent batching, synthetic event creation, and future capabilities like concurrent rendering.

The trap: Saying React delegates to `document`. In React 17, it delegates to the React root container, not document — an intentional change to support multiple React versions on the same page.

---

**Q: What's the difference between React's `onChange` and the native HTML `change` event?**

Answer: The native `change` event fires when the element loses focus and its value has changed since it gained focus — on blur, after editing. React's `onChange` fires on every input modification, equivalent to the native `input` event — keystroke by keystroke. React made this choice deliberately: `onChange` synced with every keystroke is the correct behavior for controlled inputs, where you want state to reflect the current input value at all times. If you need blur-only behavior in React, use `onBlur`. The naming mismatch (`onChange` mapping to native `input`) is a design choice React made for ergonomics, not a bug.

The trap: Assuming React's `onChange` is identical to native `change`. The frequency difference matters — it affects when validation runs and when state updates.

---

**Q: Why doesn't `return false` prevent default behavior in React event handlers?**

Answer: In vanilla JavaScript, returning `false` from an inline HTML handler (like `<button onclick="return false">`) was a shortcut that called `preventDefault()` and `stopPropagation()`. React doesn't support this convention — event handlers in React are regular JavaScript functions called by React, not inline HTML attributes evaluated by the browser. Returning `false` from a React handler just discards the return value; React doesn't interpret it. You must explicitly call `e.preventDefault()` to prevent default behavior and `e.stopPropagation()` to stop bubbling.

The trap: Thinking `return false` works in React handlers because it works in vanilla JS. This produces silent failures — the default behavior isn't prevented and the developer wonders why.

---

**Q: How do you handle a `touchmove` event and call `preventDefault()` in React?**

Answer: You can't do it from a React synthetic event handler, because React registers touch event handlers as passive by default (a browser optimization for scroll performance). Calling `e.preventDefault()` on a passive listener is silently ignored by the browser. To actually prevent the default scroll behavior during a drag or gesture, you must attach a native event listener directly to the DOM node via `useEffect`, with `{ passive: false }`: `element.addEventListener('touchmove', handler, { passive: false })`. Remember to remove it in the effect's cleanup. This is one of the few cases where you need to bypass React's event system and attach a native listener directly.

The trap: Not knowing this limitation exists. Trying to `e.preventDefault()` in a React `onTouchMove` handler and wondering why scrolling still happens.

---

*Next: useState — Phase 1 has covered the conceptual foundation: what JSX is, how components work, how data flows through props and state, and how the DOM interacts with React's event system. Phase 2 starts the deep dive into hooks. useState is the most fundamental hook — it's also a richer topic than it first appears, with important mechanics around closures, batching, and initialization that every senior engineer should understand precisely.*
