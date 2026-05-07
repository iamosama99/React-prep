# useId

## Quick Reference

| Concept | What it is | Why it matters |
|---|---|---|
| useId | Generates a stable, unique string ID per component instance | Avoids hydration mismatches between server and client |
| SSR-safe | ID is deterministic and reproducible across server and client | Math.random and counters break hydration |
| Not for list keys | IDs are not stable across remounts or reordering | Using it for keys causes subtle bugs |
| Accessibility use | Links labels to inputs via `htmlFor` / `id` pairs | Required for screen readers and ARIA |

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

> **Check yourself:** Why does Math.random break SSR hydration when used to generate element IDs?

## Gotchas
- Do not use useId for keys, since IDs are not guaranteed stable across remounts or list order changes.
- Avoid concatenating it with values that can change if you need a truly stable reference.
- It should only be called at the top level of the component.
- It is not a replacement for semantic IDs that need to be shared across unrelated components unless they are already in the same render tree.

> **Check yourself:** Can you name the one thing useId must never be used for, and explain why?

## Interview Questions


**Q (Medium): Why is useId better than Math.random for IDs?**
Answer: Because Math.random generates different values on the server and client, causing hydration mismatch. useId produces deterministic IDs that are stable across SSR and client hydration.
The trap: saying it only exists to avoid duplicate IDs in the same viewport.


---

**Q (Low): Can useId be used for list keys?**
Answer: no, because keys need to be stable across reorders and should be based on stable identity. useId is fine for static element associations but not for dynamic list key semantics.
The trap: using it to generate keys for array items.
---

## Self-Assessment

Before moving on, check off each item you can answer WITHOUT looking at the file.

- [ ] Can explain what hydration mismatch is and why it happens with Math.random
- [ ] Can write a label-input pair using useId from memory
- [ ] Can state the one use case useId must never be used for and why
- [ ] Can name why useId is deterministic across server and client renders

---

*Next: useSyncExternalStore — subscribe to external stores safely in concurrent React.*
