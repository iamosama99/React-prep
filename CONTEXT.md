# Project Context — React Interview Prep

> Hand this file to any new conversation to continue exactly where we left off.

---

## What This Project Is

A personal React interview prep repository for a **senior frontend engineer**. The goal is to cover 148 topics across 14 phases, one topic at a time, at the learner's pace. Quality over speed — there is no rush.

Topics are generated as individual markdown files. Each file is a standalone, self-contained reference on that topic — written to build genuine understanding, not to memorize facts.

---

## Who You're Teaching

- Senior frontend engineer level — use correct terminology freely, don't oversimplify
- Prefers intuitive understanding over rote knowledge: reasoning and "why" matter as much as "what"
- Wants to connect the dots between concepts — each topic should feel like a logical step from the last
- No caps on length, no caps on number of interview questions — go as deep as the topic warrants
- Code examples: **plain JavaScript for Phases 1–8**, **TypeScript from Phase 9 onwards**

---

## How to Continue

When the user says **"next"**, generate the next topic in sequence (see progress tracker below).
When the user names a **specific topic**, jump directly to it.

Write the topic as a markdown file and save it to the correct path (listed per topic below).
After writing, commit it with `git add <file> && git commit`.

---

## Content Format — Follow This For Every Topic

Each topic file must follow this structure. Do not skip sections that apply. There is no length limit.

```
# [Topic Name]

## Quick Reference

A small table (2–5 rows) or tight bullet list placed immediately after the title.
Maps the core concept → mechanism → practical implication at a glance.
A reader returning after weeks should be able to re-anchor in under 10 seconds
without re-reading the whole file.

Example shape:
| You write / see | What it actually is | Why it matters |
|---|---|---|
| JSX | Babel/SWC → React.createElement() | Browser never sees JSX |

Keep it to 2–5 rows. One idea per row. No prose.

## What Is This?
Plain explanation of what the concept IS. Before any mechanics. Make it feel grounded.
One or two short paragraphs. A code snippet here is fine if it helps orient.

> **Check yourself:** [A tight question about the just-covered concept — forces the
> reader to actively recall before moving on. Think before scrolling.]

## Why Does It Exist?
The problem it solves. The history if relevant. Why the API is designed this way.
If the reason is self-evident, keep this short. If it's non-obvious or historically
interesting, go deep. Build the reasoning — nothing should feel arbitrary.

## How It Works
The mechanism. Internals where relevant. Mental models. Step-by-step if clarifying.
Use code to show the mechanism, not just the API.

> **Check yourself:** [A question that tests mechanical understanding — not just
> naming, but reasoning about cause and effect.]

## [Other sections as needed — use judgment]
E.g.: "The Old vs New Approach", "Side-by-Side Comparison", "In Production",
"Common Patterns", "Edge Cases". Name them for what they actually cover.
Only create a section if it genuinely adds value. No filler sections.
Each major section may have its own Check yourself prompt if the section introduces
a new idea worth testing. Target 2–3 prompts per file total; don't pad.

## Gotchas
The real ones. The ones that trip people up in interviews or production.
No padding. If there are two, write two. If there are six, write six.
Every gotcha that is interview-worthy must also appear as a Q&A entry below —
don't list it here and then omit it from the interview section.

## Interview Questions

Each question has an importance label: `High` (core concept, asked in almost every
senior interview on this topic), `Medium` (common but less universal), or `Low`
(edge case, rarely tested in typical senior interviews).

ORDER QUESTIONS from most to least important: High → Medium → Low.
Study time is finite — the High questions are asked in nearly every senior
interview, so they should be encountered and drilled first.

**Q (Medium): [Question text]**

Answer: [What a senior engineer would say. Be complete — this is the reference answer.]

The trap: [What the interviewer is watching for. What weaker candidates say or miss.]

[Repeat for every question the topic genuinely warrants. No artificial cap.]

---

## Self-Assessment

Before moving on, check off each item you can do WITHOUT looking at the file.
Leave unchecked anything you'd need to read to answer — that's what to revisit.

- [ ] [Concrete capability: "Can explain X in one sentence without notes"]
- [ ] [Concrete capability: "Can write a minimal code example from memory"]
- [ ] [Concrete capability: "Can name the gotcha and explain why it happens"]
- [ ] [Add 2–4 more items specific to the topic — aim for 4–6 total]

---
*Next: [Next topic name] — [One sentence on why it follows naturally from this one.]*
```

---

## Style Rules

- Start every topic with **what it is**, then **why it exists**, then **how it works**
- Use plain language but exact terminology — never dumb down, never use vague words when a precise term exists
- Build reasoning from first principles — every constraint, API choice, and gotcha should feel logical
- Write the "how it works" sections as a senior engineer explaining over coffee, not as documentation
- Connect concepts to each other — reference prior topics when relevant, set up the next topic at the end
- Never pad. If a section doesn't apply, don't invent content to fill it
- Interview questions: write as many as the topic genuinely warrants. Include the answer AND the trap

---

## Repository Structure

```
/Users/osama/Developer/Projects/React prep/
├── CONTEXT.md                    ← this file
├── README.md                     ← full topic index with checkboxes
├── package.json                  ← root scripts: { "tutorial": "node scripts/tutorial.js" }
├── .gitignore
├── scripts/
│   └── tutorial.js               ← runner: finds tutorial file, copies to sandbox, starts Vite
├── sandbox/                      ← shared Vite + React app (deps already installed)
│   ├── src/App.jsx               ← gets replaced each run; edit this file while in the browser
│   ├── src/main.jsx
│   ├── src/index.css
│   ├── vite.config.js
│   ├── tsconfig.json             ← handles .tsx tutorials (phases 9+)
│   └── package.json
├── _templates/                   ← tutorial stub templates for new topics
├── phase-01-fundamentals/        # JS examples
├── phase-02-hooks/               # JS examples
├── phase-03-class-legacy/        # JS examples
├── phase-04-component-patterns/  # JS examples
├── phase-05-performance/         # JS examples
├── phase-06-state-management/    # JS examples
├── phase-07-routing/             # JS examples
├── phase-08-forms/               # JS examples
├── phase-09-typescript/          # TS examples ← switch to TS here
├── phase-10-testing/             # TS examples
├── phase-11-modern-react/        # TS examples
├── phase-12-ssr-frameworks/      # TS examples
├── phase-13-tooling-security-a11y/ # TS examples
└── phase-14-live-coding/         # TS examples
```

**Running a tutorial:**

```bash
# From the project root — browser opens automatically at localhost:5173
npm run tutorial use-state
npm run tutorial 01-jsx
npm run tutorial 03-props

# If query matches multiple topics, be more specific
npm run tutorial phase-02/use-state
```

Edit `sandbox/src/App.jsx` (or `.tsx`) directly while the server is running — Vite hot-reloads on save. The file is a copy of the tutorial; the original in its phase folder is untouched.

---

## Progress Tracker

Legend: ✅ Done | ✅ Not started | 👉 **Next up**

### Phase 1 — Fundamentals Refresher (10 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | JSX & React.createElement | `phase-01-fundamentals/01-jsx-react-createelement/notes.md` | ✅ |
| 2 | Function vs class components | `phase-01-fundamentals/02-function-vs-class-components/notes.md` | ✅ |
| 3 | Props, props.children, defaultProps | `phase-01-fundamentals/03-props-children-defaultprops/notes.md` | ✅ |
| 4 | State & immutability | `phase-01-fundamentals/04-state-and-immutability/notes.md` | ✅ |
| 5 | One-way data flow | `phase-01-fundamentals/05-one-way-data-flow/notes.md` | ✅ |
| 6 | Conditional rendering patterns | `phase-01-fundamentals/06-conditional-rendering/notes.md` | ✅ |
| 7 | Lists & keys | `phase-01-fundamentals/07-lists-and-keys/notes.md` | ✅ |
| 8 | Fragments | `phase-01-fundamentals/08-fragments/notes.md` | ✅ |
| 9 | Controlled vs uncontrolled inputs | `phase-01-fundamentals/09-controlled-vs-uncontrolled-inputs/notes.md` | ✅ |
| 10 | Synthetic events | `phase-01-fundamentals/10-synthetic-events/notes.md` | ✅ |

### Phase 2 — Hooks (18 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | useState | `phase-02-hooks/01-use-state/notes.md` | ✅ |
| 2 | useEffect | `phase-02-hooks/02-use-effect/notes.md` | ✅ |
| 3 | useLayoutEffect | `phase-02-hooks/03-use-layout-effect/notes.md` | ✅ |
| 4 | useInsertionEffect | `phase-02-hooks/04-use-insertion-effect/notes.md` | ✅ |
| 5 | useRef | `phase-02-hooks/05-use-ref/notes.md` | ✅ |
| 6 | useMemo | `phase-02-hooks/06-use-memo/notes.md` | ✅ |
| 7 | useCallback | `phase-02-hooks/07-use-callback/notes.md` | ✅ |
| 8 | useContext | `phase-02-hooks/08-use-context/notes.md` | ✅ |
| 9 | useReducer | `phase-02-hooks/09-use-reducer/notes.md` | ✅ |
| 10 | useImperativeHandle + forwardRef | `phase-02-hooks/10-use-imperative-handle-forward-ref/notes.md` | ✅ |
| 11 | useTransition | `phase-02-hooks/11-use-transition/notes.md` | ✅ |
| 12 | useDeferredValue | `phase-02-hooks/12-use-deferred-value/notes.md` | ✅ |
| 13 | useId | `phase-02-hooks/13-use-id/notes.md` | ✅ |
| 14 | useSyncExternalStore | `phase-02-hooks/14-use-sync-external-store/notes.md` | ✅ |
| 15 | useDebugValue | `phase-02-hooks/15-use-debug-value/notes.md` | ✅ |
| 16 | Rules of hooks | `phase-02-hooks/16-rules-of-hooks/notes.md` | ✅ |
| 17 | Stale closure problem | `phase-02-hooks/17-stale-closure-problem/notes.md` | ✅ |
| 18 | Common custom hooks | `phase-02-hooks/18-common-custom-hooks/notes.md` | ✅ |

### Phase 3 — Class Components & Legacy (6 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Lifecycle methods | `phase-03-class-legacy/01-lifecycle-methods/notes.md` | ✅ |
| 2 | getDerivedStateFromProps | `phase-03-class-legacy/02-get-derived-state-from-props/notes.md` | ✅ |
| 3 | shouldComponentUpdate | `phase-03-class-legacy/03-should-component-update/notes.md` | ✅ |
| 4 | PureComponent vs React.memo | `phase-03-class-legacy/04-pure-component-vs-react-memo/notes.md` | ✅ |
| 5 | componentDidCatch & error boundaries | `phase-03-class-legacy/05-component-did-catch-error-boundaries/notes.md` | ✅ |
| 6 | this binding in class methods | `phase-03-class-legacy/06-this-binding-class-methods/notes.md` | ✅ |

### Phase 4 — Component Patterns (12 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Composition over inheritance | `phase-04-component-patterns/01-composition-over-inheritance/notes.md` | ✅ |
| 2 | Compound components | `phase-04-component-patterns/02-compound-components/notes.md` | ✅ |
| 3 | Render props | `phase-04-component-patterns/03-render-props/notes.md` | ✅ |
| 4 | HOCs | `phase-04-component-patterns/04-hocs/notes.md` | ✅ |
| 5 | Custom hooks as the modern pattern | `phase-04-component-patterns/05-custom-hooks-modern-pattern/notes.md` | ✅ |
| 6 | Controlled vs uncontrolled component design | `phase-04-component-patterns/06-controlled-vs-uncontrolled-design/notes.md` | ✅ |
| 7 | forwardRef | `phase-04-component-patterns/07-forward-ref/notes.md` | ✅ |
| 8 | React.Children utilities | `phase-04-component-patterns/08-react-children-utilities/notes.md` | ✅ |
| 9 | Portals | `phase-04-component-patterns/09-portals/notes.md` | ✅ |
| 10 | StrictMode | `phase-04-component-patterns/10-strict-mode/notes.md` | ✅ |
| 11 | Polymorphic components | `phase-04-component-patterns/11-polymorphic-components/notes.md` | ✅ |
| 12 | Slot pattern / asChild | `phase-04-component-patterns/12-slot-pattern-as-child/notes.md` | ✅ |

### Phase 5 — Performance & Internals (15 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Virtual DOM & reconciliation | `phase-05-performance/01-virtual-dom-reconciliation/notes.md` | ✅ |
| 2 | Fiber architecture | `phase-05-performance/02-fiber-architecture/notes.md` | ✅ |
| 3 | Render vs commit phase | `phase-05-performance/03-render-vs-commit-phase/notes.md` | ✅ |
| 4 | What causes re-renders | `phase-05-performance/04-what-causes-rerenders/notes.md` | ✅ |
| 5 | React.memo deep dive | `phase-05-performance/05-react-memo-deep-dive/notes.md` | ✅ |
| 6 | Avoiding re-renders without memo | `phase-05-performance/06-avoiding-rerenders-without-memo/notes.md` | ✅ |
| 7 | Inline objects/functions in JSX | `phase-05-performance/07-inline-objects-functions-jsx/notes.md` | ✅ |
| 8 | Automatic batching (React 18) | `phase-05-performance/08-automatic-batching-react-18/notes.md` | ✅ |
| 9 | Code splitting | `phase-05-performance/09-code-splitting/notes.md` | ✅ |
| 10 | List virtualization | `phase-05-performance/10-list-virtualization/notes.md` | ✅ |
| 11 | Profiler API & DevTools profiler | `phase-05-performance/11-profiler-api-devtools/notes.md` | ✅ |
| 12 | Bundle analysis | `phase-05-performance/12-bundle-analysis/notes.md` | ✅ |
| 13 | Tree shaking | `phase-05-performance/13-tree-shaking/notes.md` | ✅ |
| 14 | Web vitals in React | `phase-05-performance/14-web-vitals-react/notes.md` | ✅ |
| 15 | Concurrent rendering | `phase-05-performance/15-concurrent-rendering/notes.md` | ✅ |

### Phase 6 — State Management (13 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Context API limitations | `phase-06-state-management/01-context-api-limitations/notes.md` | ✅ |
| 2 | Context optimization | `phase-06-state-management/02-context-optimization/notes.md` | ✅ |
| 3 | Redux core | `phase-06-state-management/03-redux-core/notes.md` | ✅ |
| 4 | Redux Toolkit | `phase-06-state-management/04-redux-toolkit/notes.md` | ✅ |
| 5 | RTK Query | `phase-06-state-management/05-rtk-query/notes.md` | ✅ |
| 6 | Zustand | `phase-06-state-management/06-zustand/notes.md` | ✅ |
| 7 | Jotai / Recoil | `phase-06-state-management/07-jotai-recoil/notes.md` | ✅ |
| 8 | Server state vs client state | `phase-06-state-management/08-server-state-vs-client-state/notes.md` | ✅ |
| 9 | React Query / TanStack Query | `phase-06-state-management/09-react-query-tanstack/notes.md` | ✅ |
| 10 | SWR | `phase-06-state-management/10-swr/notes.md` | ✅ |
| 11 | Optimistic updates | `phase-06-state-management/11-optimistic-updates/notes.md` | ✅ |
| 12 | Cache invalidation strategies | `phase-06-state-management/12-cache-invalidation-strategies/notes.md` | ✅ |
| 13 | State machines (XState) | `phase-06-state-management/13-state-machines-xstate/notes.md` | ✅ |

### Phase 7 — Routing (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | React Router v6 basics | `phase-07-routing/01-react-router-v6-basics/notes.md` | ✅ |
| 2 | Nested routes & layouts | `phase-07-routing/02-nested-routes-layouts/notes.md` | ✅ |
| 3 | Dynamic routes & params | `phase-07-routing/03-dynamic-routes-params/notes.md` | ✅ |
| 4 | Programmatic navigation | `phase-07-routing/04-programmatic-navigation/notes.md` | ✅ |
| 5 | Protected routes | `phase-07-routing/05-protected-routes/notes.md` | ✅ |
| 6 | Lazy-loaded routes | `phase-07-routing/06-lazy-loaded-routes/notes.md` | ✅ |
| 7 | Data loaders & actions (v6.4+) | `phase-07-routing/07-data-loaders-actions/notes.md` | ✅ |
| 8 | URL state vs component state | `phase-07-routing/08-url-state-vs-component-state/notes.md` | ✅ |

### Phase 8 — Forms (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Controlled form patterns | `phase-08-forms/01-controlled-form-patterns/notes.md` | ✅ |
| 2 | Form validation strategies | `phase-08-forms/02-form-validation-strategies/notes.md` | ✅ |
| 3 | React Hook Form | `phase-08-forms/03-react-hook-form/notes.md` | ✅ |
| 4 | Formik | `phase-08-forms/04-formik/notes.md` | ✅ |
| 5 | Schema validation: Zod / Yup | `phase-08-forms/05-schema-validation-zod-yup/notes.md` | ✅ |
| 6 | Multi-step / wizard forms | `phase-08-forms/06-multi-step-wizard-forms/notes.md` | ✅ |
| 7 | File uploads | `phase-08-forms/07-file-uploads/notes.md` | ✅ |
| 8 | Debounced search inputs | `phase-08-forms/08-debounced-search-inputs/notes.md` | ✅ |

### Phase 9 — TypeScript with React (9 topics) — TS examples start here

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Typing function components | `phase-09-typescript/01-typing-function-components/notes.md` | ✅ |
| 2 | Typing useState & useReducer | `phase-09-typescript/02-typing-usestate-usereducer/notes.md` | ✅ |
| 3 | Typing refs | `phase-09-typescript/03-typing-refs/notes.md` | ✅ |
| 4 | Typing event handlers | `phase-09-typescript/04-typing-event-handlers/notes.md` | ✅ |
| 5 | Generic components | `phase-09-typescript/05-generic-components/notes.md` | ✅ |
| 6 | Polymorphic components with `as` | `phase-09-typescript/06-polymorphic-components-as/notes.md` | ✅ |
| 7 | Discriminated union props | `phase-09-typescript/07-discriminated-union-props/notes.md` | ✅ |
| 8 | Typing custom hooks | `phase-09-typescript/08-typing-custom-hooks/notes.md` | ✅ |
| 9 | Utility types | `phase-09-typescript/09-utility-types/notes.md` | ✅ |

### Phase 10 — Testing (9 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | React Testing Library philosophy | `phase-10-testing/01-rtl-philosophy/notes.md` | ✅ |
| 2 | Jest fundamentals | `phase-10-testing/02-jest-fundamentals/notes.md` | ✅ |
| 3 | user-event vs fireEvent | `phase-10-testing/03-user-event-vs-fireevent/notes.md` | ✅ |
| 4 | Mocking modules & APIs | `phase-10-testing/04-mocking-modules-apis/notes.md` | ✅ |
| 5 | Testing async UI | `phase-10-testing/05-testing-async-ui/notes.md` | ✅ |
| 6 | Testing custom hooks | `phase-10-testing/06-testing-custom-hooks/notes.md` | ✅ |
| 7 | Integration vs unit vs E2E | `phase-10-testing/07-integration-unit-e2e/notes.md` | ✅ |
| 8 | E2E with Playwright/Cypress | `phase-10-testing/08-e2e-playwright-cypress/notes.md` | ✅ |
| 9 | Snapshot testing pros/cons | `phase-10-testing/09-snapshot-testing/notes.md` | ✅ |

### Phase 11 — Modern React: RSC & Concurrent (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | React 18 changes summary | `phase-11-modern-react/01-react-18-changes/notes.md` | ✅ |
| 2 | Concurrent rendering model | `phase-11-modern-react/02-concurrent-rendering-model/notes.md` | ✅ |
| 3 | Suspense for data fetching | `phase-11-modern-react/03-suspense-data-fetching/notes.md` | ✅ |
| 4 | Server components (RSC) | `phase-11-modern-react/04-server-components-rsc/notes.md` | ✅ |
| 5 | Client vs server components | `phase-11-modern-react/05-client-vs-server-components/notes.md` | ✅ |
| 6 | Server actions | `phase-11-modern-react/06-server-actions/notes.md` | ✅ |
| 7 | Streaming SSR | `phase-11-modern-react/07-streaming-ssr/notes.md` | ✅ |
| 8 | use() hook | `phase-11-modern-react/08-use-hook/notes.md` | ✅ |

### Phase 12 — SSR & Meta-Frameworks (8 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | CSR vs SSR vs SSG vs ISR | `phase-12-ssr-frameworks/01-csr-ssr-ssg-isr/notes.md` | ✅ |
| 2 | Hydration | `phase-12-ssr-frameworks/02-hydration/notes.md` | ✅ |
| 3 | Next.js App Router | `phase-12-ssr-frameworks/03-nextjs-app-router/notes.md` | ✅ |
| 4 | Next.js Pages Router | `phase-12-ssr-frameworks/04-nextjs-pages-router/notes.md` | ✅ |
| 5 | Data fetching in Next.js | `phase-12-ssr-frameworks/05-data-fetching-nextjs/notes.md` | ✅ |
| 6 | Middleware & edge runtime | `phase-12-ssr-frameworks/06-middleware-edge-runtime/notes.md` | ✅ |
| 7 | SEO & metadata | `phase-12-ssr-frameworks/07-seo-metadata/notes.md` | ✅ |
| 8 | Remix basics | `phase-12-ssr-frameworks/08-remix-basics/notes.md` | ✅ |

### Phase 13 — Tooling, Security, a11y (10 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Webpack vs Vite vs Turbopack | `phase-13-tooling-security-a11y/01-webpack-vite-turbopack/notes.md` | ✅ |
| 2 | Babel & SWC | `phase-13-tooling-security-a11y/02-babel-swc/notes.md` | ✅ |
| 3 | ESLint + Prettier setup | `phase-13-tooling-security-a11y/03-eslint-prettier/notes.md` | ✅ |
| 4 | XSS in React | `phase-13-tooling-security-a11y/04-xss-in-react/notes.md` | ✅ |
| 5 | Authentication patterns | `phase-13-tooling-security-a11y/05-authentication-patterns/notes.md` | ✅ |
| 6 | CSRF in SPA contexts | `phase-13-tooling-security-a11y/06-csrf-spa/notes.md` | ✅ |
| 7 | ARIA roles & labels | `phase-13-tooling-security-a11y/07-aria-roles-labels/notes.md` | ✅ |
| 8 | Focus management in SPAs | `phase-13-tooling-security-a11y/08-focus-management-spas/notes.md` | ✅ |
| 9 | Keyboard navigation | `phase-13-tooling-security-a11y/09-keyboard-navigation/notes.md` | ✅ |
| 10 | Screen reader testing | `phase-13-tooling-security-a11y/10-screen-reader-testing/notes.md` | ✅ |

### Phase 14 — Live Coding Round Patterns (14 topics)

| # | Topic | File | Status |
|---|-------|------|--------|
| 1 | Build a useDebounce hook | `phase-14-live-coding/01-use-debounce-throttle/notes.md` | ✅ |
| 2 | Build a useFetch hook | `phase-14-live-coding/02-use-fetch/notes.md` | ✅ |
| 3 | Implement useState from scratch | `phase-14-live-coding/03-implement-use-state-scratch/notes.md` | ✅ |
| 4 | Autocomplete / typeahead | `phase-14-live-coding/04-autocomplete-typeahead/notes.md` | ✅ |
| 5 | Infinite scroll | `phase-14-live-coding/05-infinite-scroll/notes.md` | ✅ |
| 6 | Modal / dialog | `phase-14-live-coding/06-modal-dialog/notes.md` | ✅ |
| 7 | Tabs component | `phase-14-live-coding/07-tabs-component/notes.md` | ✅ |
| 8 | Accordion | `phase-14-live-coding/08-accordion/notes.md` | ✅ |
| 9 | Pagination | `phase-14-live-coding/09-pagination/notes.md` | ✅ |
| 10 | Star rating | `phase-14-live-coding/10-star-rating/notes.md` | ✅ |
| 11 | OTP input | `phase-14-live-coding/11-otp-input/notes.md` | ✅ |
| 12 | Recursive comments / file tree | `phase-14-live-coding/12-recursive-comments-file-tree/notes.md` | ✅ |
| 13 | Drag and drop list | `phase-14-live-coding/13-drag-and-drop-list/notes.md` | ✅ |
| 14 | Toast / notification system | `phase-14-live-coding/14-toast-notification-system/notes.md` | ✅ |

---

## How to Update This File

After each topic is completed:
1. Change its status from ⬜ to ✅ in the progress tracker above
2. Move the 👉 **Next** marker to the following topic
3. Commit: `git add CONTEXT.md && git commit -m "Update progress: [topic name] done"`
