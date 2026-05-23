# useEffect

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| Dependency array | Controls when the effect re-runs | Missing deps → stale data; extra deps → unnecessary runs |
| Cleanup function | Returned function React calls before re-run or unmount | Prevents listener pile-up and memory leaks |
| Runs after paint | Effect fires after DOM is committed and browser paints | Safe for DOM reads; use `useLayoutEffect` for pre-paint mutations |
| Race condition | Older async response arriving after a newer one | Must cancel stale requests in cleanup |
| StrictMode double-invoke | Dev only: effect → cleanup → effect | Surfaces bugs where cleanup doesn't fully undo the effect |

## What Is This?

`useEffect` lets you perform side effects in a functional component — anything that reaches beyond the component itself: fetching data, updating the DOM directly, subscribing to external systems, logging, etc.

```javascript
useEffect(() => {
  // Side effect code runs here
  document.title = `Count: ${count}`;
}, [count]); // dependency array
```

It runs *after* the component renders. You control when it runs by specifying dependencies.

> **Check yourself:** What are the three different behaviors you get by varying the dependency array — no array, empty array, and array with values?

## Why Does It Exist?

Functional components are just functions: input (props, state) → output (JSX). But real applications need to *do things* — fetch from servers, set up timers, listen to events. Side effects are unavoidable.

In class components, you had lifecycle methods (`componentDidMount`, `componentDidUpdate`, `componentWillUnmount`) to handle this. `useEffect` is the functional equivalent, but more flexible: one hook can replace all three lifecycle methods, and dependencies let you fine-tune *exactly* when effects run.

The name "effect" comes from functional programming: a pure function has no effects (same input always produces same output). An effect is anything impure — anything observable outside the function.

## How It Works

### The Timing Model

React's render-and-commit cycle:

1. **Render phase**: Call your component function, compute the new JSX.
2. **Commit phase**: Update the DOM (or don't, if nothing changed).
3. **Effects run**: *After* the commit, React calls your effect functions.

This is important: effects run *after* the DOM is painted. If you need to update the DOM *before* the paint, use `useLayoutEffect` instead (see [useLayoutEffect](03-use-layout-effect.md)).

### Dependency Array

The dependency array tells React when to *re-run* the effect:

```javascript
// No dependency array: runs after EVERY render
useEffect(() => {
  console.log('I run after every render');
});

// Empty array: runs once, after first render (mount)
useEffect(() => {
  console.log('I run once');
}, []);

// With dependencies: runs when any dependency changes
useEffect(() => {
  console.log('count changed to:', count);
}, [count]);

// Multiple dependencies
useEffect(() => {
  console.log('count or user changed');
}, [count, user]);
```

React compares dependencies using `Object.is()`. If *any* dependency changed since the last render, the effect runs again.

### Cleanup Functions

Effects can return a cleanup function. React calls it before re-running the effect, and when the component unmounts:

```javascript
useEffect(() => {
  const handleResize = () => console.log('resized');
  window.addEventListener('resize', handleResize);
  
  // Cleanup: remove the listener
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**Why cleanup matters:** Without it, listeners pile up. If your effect runs 10 times and adds a listener each time, you have 10 listeners for the same event. Cleanup prevents memory leaks.

> **Check yourself:** When exactly does the cleanup function run — only on unmount, or at other times too?

### Conditional Re-runs

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]); // Re-run only when userId changes
  
  return <div>{user?.name}</div>;
}
```

This fetches user data when the component mounts, and again if `userId` changes. Without the dependency array, it would fetch after *every* render — probably a bug.

## Race Conditions

With async effects, you can run into race conditions:

```javascript
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

Scenario:
1. Component mounts with `userId=1`. Fetch starts.
2. User changes props to `userId=2`. New fetch starts.
3. Fetch for user 2 completes first. Sets user data.
4. Fetch for user 1 completes. Overwrites user data with user 1.
5. Screen shows user 1, but `userId` is 2. Bug.

**Fix:** Cancel the old request:

```javascript
useEffect(() => {
  let cancelled = false;
  
  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (!cancelled) setUser(data); // Only set if not cancelled
    });
  
  return () => {
    cancelled = true; // Cleanup: mark this effect as cancelled
  };
}, [userId]);
```

Or use `AbortController`:

```javascript
useEffect(() => {
  const controller = new AbortController();
  
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setUser(data));
  
  return () => controller.abort(); // Cancel the fetch
}, [userId]);
```

This is a *critical* pattern in production code. Race conditions are subtle bugs that show up in slow networks or after the user rapidly changes parameters.

## Double Invocation in StrictMode

In development, React 18+ intentionally runs effects twice if you're in `<StrictMode>`:

```javascript
// In development with StrictMode:
// 1. Effect runs
// 2. Cleanup function runs
// 3. Effect runs again

// In production: Effect runs once, cleanup runs on unmount/re-run
```

This helps catch bugs where your effect doesn't clean up properly. If your effect isn't idempotent (running it twice causes problems), it'll surface in development.

Example bug caught by double-invocation:

```javascript
useEffect(() => {
  let count = 0;
  const timer = setInterval(() => {
    count++;
    console.log(count);
  }, 1000);
  
  return () => clearInterval(timer);
}, []);

// StrictMode: Creates timer, clears it, creates timer again
// Each timer increments independently
// Without proper cleanup, you'd have multiple timers running
```

## Gotchas

### 1. Infinite loops

```javascript
const [count, setCount] = useState(0);

useEffect(() => {
  setCount(count + 1); // Sets count
}, [count]); // When count changes, effect runs again → infinite loop
```

Every effect run updates `count`, triggering the dependency, running the effect again.

### 2. Stale closures in effects

```javascript
const [count, setCount] = useState(0);

useEffect(() => {
  const timer = setTimeout(() => {
    console.log(count); // Logs the count from when the effect was created
  }, 1000);
}, []);

// If you increment count and wait, it still logs 0
```

The effect closure captures the `count` value from the render it was created in. Update `count` and the logged value doesn't change.

**Fix:** Add `count` to dependencies:

```javascript
useEffect(() => {
  const timer = setTimeout(() => {
    console.log(count); // Logs current count
  }, 1000);
}, [count]); // Re-creates effect when count changes
```

### 3. Missing dependencies

```javascript
function Component({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, []); // ❌ Missing userId! Effect runs once, never refetches
}
```

The effect closes over `userId`, but doesn't declare it as a dependency. ESLint should catch this (enable `exhaustive-deps` rule).

### 4. useEffect is not a replacement for componentDidMount

```javascript
function Component() {
  useEffect(() => {
    console.log('ran');
  }); // No dependency array
  
  // Logs "ran" after EVERY render, not just mount
}
```

If you want mount-only behavior, use empty dependency array.

### 5. Returning non-functions from effects

```javascript
useEffect(() => {
  return 'cleanup'; // ❌ Returns a string, not a function
}, []);

// React will try to call 'cleanup' as a function on unmount → error
```

Must return a function or nothing.

### 6. Async effects

```javascript
// ❌ Can't make the effect function async
useEffect(async () => {
  const data = await fetch(...);
}, []);
```

The effect function can't be async (it must return a cleanup function or nothing, not a promise). Instead:

```javascript
// ✅ Define async function inside the effect
useEffect(() => {
  const fetchData = async () => {
    const data = await fetch(...);
    setData(data);
  };
  fetchData();
}, []);
```

Or use a library like React Query that handles this pattern.

## Interview Questions

**Q (High): When does `useEffect` run relative to rendering?**

Answer: Effects run *after* the DOM has been committed (painted to screen). React's order is: render phase (compute JSX) → commit phase (update DOM) → effects run. This is why DOM mutations in effects are safe — the DOM is already updated and visible.

If you need to update the DOM *before* it's painted, use `useLayoutEffect` instead, which runs synchronously after DOM updates but before paint.

The trap: Developers think effects run before renders, or that they're synchronous. They're asynchronous and run *after* the render is committed. Also, effects don't block the browser from painting — they run in the background after painting.

---

**Q (High): What's the dependency array for, and what happens if you omit it?**

Answer: The dependency array tells React when to re-run the effect. If a dependency changes, the effect re-runs. If you omit the array, the effect runs after *every* render. If you pass an empty array, it runs once after mount.

```javascript
useEffect(() => { ... });           // Every render
useEffect(() => { ... }, []);       // Once at mount
useEffect(() => { ... }, [count]); // When count changes
```

React compares dependencies using `Object.is()`. If *any* dependency changed, the effect runs.

The trap: Missing dependencies. If your effect uses `userId` but doesn't list it in dependencies, the effect closes over a stale `userId` value. ESLint's `exhaustive-deps` rule catches this. Also, developers sometimes add unnecessary dependencies, causing effects to run more often than needed, which can hurt performance.

---

**Q (High): How do you handle race conditions in async effects?**

Answer: When you have an async operation (like a fetch), it can complete out of order. If you fetch user 1, then user 2, and user 2's response arrives first, you set state to user 2. Then user 1's response arrives and overwrites it. The UI shows user 1 even though the current props are for user 2.

Fix it by canceling old requests:

```javascript
useEffect(() => {
  let cancelled = false;
  
  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(data => {
      if (!cancelled) setUser(data); // Only update if not cancelled
    });
  
  return () => { cancelled = true; }; // Cleanup: cancel this effect
}, [userId]);
```

Or use `AbortController`:

```javascript
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setUser(data));
  
  return () => controller.abort();
}, [userId]);
```

This ensures that when the effect re-runs (because `userId` changed), the old request is canceled before the new one starts.

The trap: Beginners don't realize race conditions exist in their code. They work fine on fast networks or with slow manual testing, but fail in the wild. Senior engineers expect this question and have a robust answer ready.

---

**Q (High): What's the cleanup function for, and when does it run?**

Answer: The function returned from an effect is the cleanup. React calls it:
1. Before re-running the effect (if it re-runs)
2. When the component unmounts

It's for undoing whatever the effect did — removing event listeners, canceling timers, closing connections, etc.

```javascript
useEffect(() => {
  const listener = () => console.log('resized');
  window.addEventListener('resize', listener);
  
  return () => window.removeEventListener('resize', listener);
}, []);
```

Without cleanup, listeners pile up. With it, only one listener is ever active.

The trap: Developers forget to return a cleanup function or return something that's not a function. Also, they don't realize cleanup runs *before* effects re-run, not just on unmount. If an effect runs three times, cleanup runs before the second and third runs (plus on unmount).

---

**Q (High): What's "double invocation" in StrictMode, and why does React do it?**

Answer: In development with `<StrictMode>`, React intentionally runs effects twice: mount the effect, run the cleanup, then mount the effect again. It does this to catch bugs where the effect isn't properly idempotent or the cleanup doesn't fully undo the effect.

```javascript
// Development with StrictMode:
// 1. Effect runs
// 2. Cleanup runs
// 3. Effect runs again

// Production: Effect runs once, cleanup only on unmount/re-run
```

This surfaces bugs early. If your effect has side effects that shouldn't happen twice, you'd see it break in development before shipping.

Example: If your effect increments a global counter and doesn't cleanup properly, StrictMode would increment it twice, showing the bug.

The trap: Developers see double-invocation in development and panic, thinking there's a bug. It's intentional. They should use it to improve their code, not disable StrictMode. Also, not all hooks have this double-invocation behavior — only effects (and layout effects, and insertion effects).

---

**Q (High): Can you make the effect function itself async?**

Answer: No. The effect function must return a cleanup function or nothing. If you make it async, it returns a promise, and React won't use that promise for cleanup.

```javascript
// ❌ Wrong
useEffect(async () => {
  const data = await fetch(...);
}, []);

// ✅ Right
useEffect(() => {
  const fetchData = async () => {
    const data = await fetch(...);
  };
  fetchData();
}, []);
```

The reason: if effects were async, React would have to wait for the promise to settle before unmounting or re-running the effect. That breaks the timing model and can cause memory leaks.

The trap: Developers see async/await and think they can use it in effects. They can't use it on the effect function itself, but they can define an async function *inside* the effect and call it.

---

**Q (Medium): You have a component that fetches data on mount. How do you prevent fetching again if the component re-renders but the dependency hasn't changed?**

Answer: Use an empty dependency array. This runs the effect only once, on mount:

```javascript
useEffect(() => {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => setData(data));
}, []); // Empty array = run once
```

Without the dependency array, it would fetch after every render. With `[someValue]`, it would fetch whenever `someValue` changes.

The trap: Forgetting the dependency array entirely, or including unnecessary dependencies that cause the effect to re-run more often than intended. Also, if the data depends on props (like `userId`), you *must* include it in dependencies, or the effect closes over a stale value.

---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can recite the three dependency-array variants and what each means for when the effect runs
- [ ] Can write a fetch effect with a `cancelled` flag or `AbortController` to handle race conditions from memory
- [ ] Can explain exactly when the cleanup function runs (not just "on unmount")
- [ ] Can explain why the effect function cannot be `async` and show the correct pattern
- [ ] Can describe what StrictMode double-invocation is and why React does it intentionally

---

*Next: [useLayoutEffect](03-use-layout-effect.md) — Synchronous effects that run before the browser paints.*
