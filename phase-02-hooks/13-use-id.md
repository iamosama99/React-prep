# useId

## What Is This?
useId is a React hook that generates a stable unique ID for a component. It is designed to be safe for server rendering and hydration, avoiding ID mismatches between server and client.

## Why Does It Exist?
Unique IDs are required for accessibility attributes, form labels, and ARIA associations. Generating IDs with Math.random or incrementing counters can break SSR hydration because the server and client may generate different values.

## How It Works
useId returns a string that is stable for the lifetime of the component:

```js
const id = useId()
return <label htmlFor={id}>Name<input id={id} /></label>
```

On the server, the ID is generated in a way that can be replayed during client hydration. On the client, the same ID is reused after hydration.

## Gotchas
- Do not use useId for keys, since IDs are not guaranteed stable across remounts or list order changes.
- Avoid concatenating it with values that can change if you need a truly stable reference.
- It should only be called at the top level of the component.
- It is not a replacement for semantic IDs that need to be shared across unrelated components unless they are already in the same render tree.

## Interview Questions
**Q: Why is useId better than Math.random for IDs?**
Answer: Because Math.random generates different values on the server and client, causing hydration mismatch. useId produces deterministic IDs that are stable across SSR and client hydration.
The trap: saying it only exists to avoid duplicate IDs in the same viewport.

**Q: Can useId be used for list keys?**
Answer: no, because keys need to be stable across reorders and should be based on stable identity. useId is fine for static element associations but not for dynamic list key semantics.
The trap: using it to generate keys for array items.

---
*Next: useSyncExternalStore — subscribe to external stores safely in concurrent React.*
