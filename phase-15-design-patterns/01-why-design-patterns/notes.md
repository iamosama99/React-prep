# Why React Needs Design Patterns

## Quick Reference

| Code smell you notice | Pattern that answers it | Covered in |
|---|---|---|
| Component fetches, transforms, *and* renders | Container–Presenter / custom hook | Topics 2, 7 |
| Prop soup: `title`, `body`, `footer`, `showHeader`… | Compound components / slots | Topics 4, 14 |
| Same stateful logic copy-pasted into 3 components | Custom hook | Topic 7 |
| Prop drilling through 5 layers | Provider (Context) | Topic 8 |
| `if (type === 'a') … else if (type === 'b')` growing in a hook | Strategy | Topic 15 |
| Component talks to 6 hooks + feature flags + permissions | Facade | Topic 16 |
| One thrown error blanks the whole screen | Error boundary | Topic 17 |

## Where You've Seen This Before

This topic is the map, not new mechanics. Everything in the crash-course section below is Phase 1 and Phase 2 material — if any line feels unfamiliar, jump back:

- Components, props, `children`, immutability → [Phase 1: Props](../../phase-01-fundamentals/03-props-children-defaultprops/notes.md), [State & immutability](../../phase-01-fundamentals/04-state-and-immutability/notes.md)
- `useState` / `useEffect` / cleanup → [useState](../../phase-02-hooks/01-use-state/notes.md), [useEffect](../../phase-02-hooks/02-use-effect/notes.md)
- Composition as the default reuse tool → [Composition over inheritance](../../phase-04-component-patterns/01-composition-over-inheritance/notes.md)

**What's new in this pass:** you're going to stop asking "how does this API work?" and start asking "*what smell is this code showing, and which named solution fits?*" That is the question a senior interviewer is really probing when they say "how would you structure this?"

## What Is This?

A design pattern is a **named, reusable solution to a structural problem that keeps recurring**. The name is half the value — "use a compound component" compresses a paragraph of design discussion into four words that every senior engineer on the team can act on.

React itself is deliberately small: components, props, state, effects, context, refs. It gives you *primitives* and no architecture. Nothing in the library stops you writing a 600-line component that fetches, validates, formats, checks permissions, and renders a table. It will run fine. Patterns are the community's accumulated answers to "what do I do when the primitives, used naively, stop scaling?"

```tsx
// Works. Doesn't scale. Every concern is welded to every other concern.
function Dashboard() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const user = useContext(AuthContext);

  useEffect(() => { /* fetch, set loading/error */ }, []);

  const visible = data.filter(r => user.canSee(r)).sort(byDate);
  if (loading) return <Spinner />;
  if (error) return <ErrorMsg error={error} />;
  return <table>{/* 80 lines of markup */}</table>;
}
```

> **Check yourself:** Name three separate reasons this component would have to change. Each one is a "responsibility." What does it tell you that one small component has three?

## Why Does It Exist?

### The recurring problem: reusing *stateful logic*

React's history is largely a story of one problem being answered four times.

| Era | Mechanism | What was wrong |
|---|---|---|
| 2013 | Mixins (`createClass`) | Implicit name collisions, hidden dependencies, removed |
| 2015–17 | Higher-order components | Wrapper hell, prop-name clashes, hard to type ([Phase 4: HOCs](../../phase-04-component-patterns/04-hocs/notes.md)) |
| 2016–18 | Render props | Callback nesting, indentation pyramids ([Phase 4: Render props](../../phase-04-component-patterns/03-render-props/notes.md)) |
| 2019+ | Custom hooks | Composable, no extra tree nodes, plain functions |

Each of those was a *pattern* invented before the language of the library caught up. Hooks didn't obsolete the idea of patterns — they moved the best answer to one specific problem. The other problems (rigid component APIs, failure containment, structuring big components) still need patterns.

### Why teams need the vocabulary

A codebase with 40 engineers doesn't fail because someone wrote a `useEffect` incorrectly. It fails because there are 40 different ways to fetch data, 12 different modal implementations, and nobody can predict where logic lives. Patterns are **shared expectations**: if I say "that's a container," you know it owns data, and you know where to look for the markup.

> **Check yourself:** Hooks replaced HOCs and render props for sharing logic. Does that mean HOCs and render props are "wrong"? What would you say to a candidate who claims they are?

## How It Works — A 10-Minute React Refresher

Seven ideas carry the entire library. Every pattern in this phase is a way of arranging them.

**1. A component is a function from props + state to UI description.** It should be *pure* during render — same inputs, same output, no side effects in the body.

**2. Props flow down, events flow up.** Data moves parent → child via props; children ask for changes by calling functions the parent passed. This one-way flow is why you can trace any value to its owner.

**3. State is memory that survives re-renders.** Calling `setState` schedules a re-render; the component function runs again with the new value. State updates are *immutable* — you produce a new object, you don't edit the old one — because React detects change by `Object.is` reference comparison.

**4. Effects synchronise with the outside world.** `useEffect` is not "run code after render"; it is "keep something external (network, subscription, DOM API) in sync with these values." The cleanup function is half of the contract.

**5. Refs are memory that does *not* trigger re-renders.** Use them for DOM nodes and mutable values you don't want to display (timer IDs, previous values). See Topic 3.

**6. Context broadcasts a value to a subtree without threading props.** Every consumer re-renders when the value changes. See Topic 8.

**7. Re-rendering is cheap; unnecessary work is not.** A parent re-render re-renders all children by default. Memoisation is an opt-out, and it's a tool for *measured* problems. See Topics 12–13.

```tsx
import { useState, useEffect } from 'react';

type User = { id: number; name: string };

function UserList({ query }: { query: string }) {
  const [users, setUsers] = useState<User[]>([]);          // 3. state

  useEffect(() => {                                         // 4. effect
    const ctrl = new AbortController();
    fetch(`/api/users?q=${query}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(setUsers)
      .catch(() => {});
    return () => ctrl.abort();                              // cleanup is part of the contract
  }, [query]);

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}       {/* 1. pure UI from data; stable key */}
    </ul>
  );
}
```

> **Check yourself:** In the snippet above, which line would break the "state is immutable" rule if you changed `setUsers(data)` to `users.push(...data); setUsers(users)`? Why would the UI not update?

## The Pattern Map

This table is your roadmap for the rest of Phase 15. Read it as a decision aid, not a syllabus.

| Question you're asking | Reach for |
|---|---|
| "How do I keep fetching logic out of my markup?" | Container–Presenter → then custom hook |
| "Who owns this input's value — React or the DOM?" | Controlled vs uncontrolled |
| "Callers need to arrange the pieces themselves" | Compound components, slots |
| "I need to share logic *and* let the caller decide the UI" | Render props (legacy) → custom hook |
| "Every component needs the same wrapper behaviour" | HOC |
| "Deep tree needs the same value" | Provider |
| "The UI should feel instant before the server replies" | Optimistic UI |
| "Consumers must be able to override internal transitions" | State reducer |
| "Unrelated components must react to the same event" | Pub-Sub |
| "Behaviour varies by type/plan/flag" | Strategy |
| "Component is drowning in hooks and services" | Facade |
| "A failure must not take the whole page down" | Error boundary + Suspense |

## The Cost Side: When Patterns Hurt

Patterns are not free, and a senior answer always includes the cost.

- **Indirection.** Every pattern adds a hop between "what the user sees" and "where the logic is."
- **Premature abstraction.** Extracting a `useThing` after the *first* use guesses at the shape of the abstraction. The **rule of three** — duplicate twice, abstract on the third — lets the real shape emerge.
- **Wrong abstraction.** A shared component with eight boolean props isn't reuse; it's coupling wearing a costume. Duplication is cheaper than the wrong abstraction.
- **Pattern-itis.** Using a Facade, a Strategy, and a State Reducer on a 40-line form is resume-driven development.

The default move is always the simplest one: split the component, extract a hook, pass `children`. Reach for a named pattern when the smell is recurring and you can say which specific pain it removes.

## Gotchas

**Patterns are answers to smells, not goals.** "We should use the Provider pattern" is a bad opening sentence; "prop drilling through six layers is hurting us" is a good one.

**Hooks didn't kill every older pattern.** HOCs still win when you need to wrap a *component* (error boundaries, `React.memo`, `forwardRef`, route guards). Render props still win when the child must receive values at render time to decide its own subtree (virtualised lists, headless UI). The claim "HOCs are dead" is a junior tell.

**Naming a pattern isn't the same as understanding it.** Interviewers will ask "what problem does it solve, and when would you *not* use it?" — the second half filters candidates.

**Over-splitting is a smell too.** Twelve tiny files for one feature makes tracing harder than one 150-line file with clear sections.

## Interview Questions

**Q (High): Why do React apps need design patterns at all — doesn't the framework handle structure for you?**

Answer: React provides primitives (components, state, effects, context) but no architecture. It's un-opinionated about where logic lives, how state is shared, or how components expose APIs. That flexibility is why large codebases drift into inconsistency. Patterns are the community's named solutions to recurring structural problems — separating logic from UI, sharing stateful logic, exposing flexible component APIs, containing failures — and the names give a team a shared vocabulary so design discussions and code reviews are faster and more predictable.

The trap: Answering "to write cleaner code" with nothing concrete. Name the actual problems — reuse of stateful logic, rigid component APIs, prop drilling, failure containment.

**Q (High): How has the answer to "how do I reuse stateful logic?" changed over React's history, and why?**

Answer: Mixins → HOCs → render props → custom hooks. Mixins had implicit collisions and were removed with ES6 classes. HOCs solved reuse by wrapping components but created wrapper hell, prop-name collisions, and typing pain. Render props made data flow explicit but produced callback nesting. Hooks let you extract logic into ordinary functions that compose by calling each other, with no extra nodes in the tree. Each step addressed the specific weakness of the last.

The trap: Saying "hooks replaced everything." HOCs and render props still have valid niches (wrapping components, headless render-time control).

**Q (High): How do you decide when to introduce a pattern vs keep the code simple?**

Answer: Start simple — split a component, extract a hook. Introduce a named pattern when a specific pain recurs: the same logic in three places (custom hook), the same prop being drilled through many layers (Provider), a component API that keeps sprouting props to cover new layouts (compound/slots). I follow the rule of three for abstractions, and I can state what the pattern costs — indirection, a learning curve, and the risk of the wrong abstraction.

The trap: Pattern name-dropping with no cost analysis. A candidate who can't say when *not* to use a pattern hasn't understood it.

**Q (Medium): A component is 500 lines. Walk me through refactoring it without rewriting it.**

Answer: First, identify responsibilities: data acquisition, derived data, UI state, markup. Extract data acquisition and derived data into a custom hook (or a container). Extract repeated markup into presentational components. Move fixed layout pieces to children/slots. Add tests around the extracted hook. Don't touch behaviour — each step should be a mechanical extraction that keeps the UI identical, so the diff is reviewable.

The trap: Proposing a rewrite or a new state library as step one. Refactoring is incremental extraction with the tests green between steps.

**Q (Medium): Name a smell for which a pattern is the *wrong* answer.**

Answer: A slow list. That's a performance problem: measure with the Profiler, then virtualise or memoise. A design pattern won't fix it. Another: a single component with three booleans — usually a state-modelling problem (a discriminated union or `useReducer`), not a "Strategy."

The trap: Treating every problem as a pattern-shaped nail.

**Q (Low): Are React design patterns the same as the GoF patterns?**

Answer: Some map (Observer/Pub-Sub, Strategy, Facade, Provider ≈ dependency injection), but most React patterns are idioms shaped by the render model — one-way data flow, immutability, components as functions — rather than object-oriented class hierarchies. GoF-style inheritance-heavy patterns generally don't apply; React prefers composition.

The trap: Forcing GoF vocabulary onto everything, or dismissing it entirely. Strategy and Facade are genuinely useful in hook-based code.

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.

- [ ] Can define "design pattern" and explain why React specifically needs them (primitives, no architecture)
- [ ] Can narrate mixins → HOC → render props → hooks and name the weakness each step fixed
- [ ] Can map at least six code smells to the pattern that answers them
- [ ] Can state the rule of three and the "wrong abstraction" risk
- [ ] Can list the seven refresher ideas (pure render, one-way flow, immutable state, effects as sync, refs, context, re-render cost)
- [ ] Can name a case where a HOC or render prop is still the better tool than a hook

---
*Next: [Container–Presenter](../02-container-presenter/notes.md) — the first and most fundamental separation: keep the component that *knows things* apart from the component that *shows things*.*
