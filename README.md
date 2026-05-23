# React Interview Prep

Senior frontend engineer interview preparation — 148 topics across 14 phases.

---

## How This Works

Every topic starts with **what it is and why it exists** before going anywhere near mechanics. The goal is that nothing feels arbitrary — every API choice, every constraint, every gotcha has a reason, and that reason is explained.

Language is plain but terminology is exact. Mental models are built from first principles so that when you're in an interview and the question takes an unexpected angle, you can *reason your way* to the right answer rather than recall a memorized one.

**Workflow:** One topic at a time, at your pace. Say "next" to continue in sequence or name any topic to jump to it.

**Code examples:** Plain JavaScript for Phases 1–8. TypeScript from Phase 9 onwards.

**Interview question labels:** Each question is tagged with its importance for senior React interviews — `High` (core concept, expect it every time), `Medium` (common but less universal), `Low` (edge case, rarely tested). Questions are ordered High → Medium → Low within each file — most important first.

### Every topic file contains

| Section | Purpose |
|---|---|
| **Quick Reference** | 2–5 row table at the top — re-anchor in 10 seconds after weeks away |
| **Check yourself prompts** | Inline active recall questions after major sections — 2–3 per file |
| **Self-Assessment checklist** | End-of-file checklist — marks what you own vs. what you'd still need to look up |
| **Interview Q&A** | Full reference answers + the interviewer trap, ordered easy → hard |

---

## Project Structure

Each topic lives in its own subfolder with two files:

```
phase-02-hooks/
  01-use-state/
    notes.md        ← concept explanation, Q&A, and interview prep
    tutorial.jsx    ← three exercises + free playground
  02-use-effect/
    notes.md
    tutorial.jsx
```

Phases 1–8 use `.jsx`; phases 9–13 use `.tsx` (TypeScript).

**Study workflow per topic:**
1. Read `notes.md` — understand the concept, internals, and interview traps
2. Open `tutorial.jsx` / `tutorial.tsx` — complete Exercise 1 → 2 → 3, then experiment in the Playground
3. Run the tutorial in [StackBlitz](https://stackblitz.com/new/react) (JSX) or [StackBlitz TS](https://stackblitz.com/new/react-ts) (TSX) — paste the file into `src/App.jsx`

See [`_templates/README.md`](_templates/README.md) for full instructions on running tutorial files locally.

---

## Progress

| Phase | Topics | Area |
|-------|--------|------|
| [Phase 1](#phase-1--fundamentals-refresher) | 10 | Fundamentals refresher |
| [Phase 2](#phase-2--hooks) | 18 | Hooks (every single one) |
| [Phase 3](#phase-3--class-components--legacy) | 6 | Class components & legacy |
| [Phase 4](#phase-4--component-patterns) | 12 | Component patterns |
| [Phase 5](#phase-5--performance--internals) | 15 | Performance & internals |
| [Phase 6](#phase-6--state-management) | 13 | State management |
| [Phase 7](#phase-7--routing) | 8 | Routing |
| [Phase 8](#phase-8--forms) | 8 | Forms |
| [Phase 9](#phase-9--typescript-with-react) | 9 | TypeScript with React |
| [Phase 10](#phase-10--testing) | 9 | Testing |
| [Phase 11](#phase-11--modern-react-rsc--concurrent) | 8 | Modern React (RSC, concurrent) |
| [Phase 12](#phase-12--ssr--meta-frameworks) | 8 | SSR & meta-frameworks |
| [Phase 13](#phase-13--tooling-security-a11y) | 10 | Tooling, security, a11y |
| [Phase 14](#phase-14--live-coding-round-patterns) | 14 | Live coding round patterns |
| **Total** | **148** | |

---

## Phase 1 — Fundamentals Refresher

> Quick warmup. Asked in screening rounds even at senior level.

- [x] [JSX & React.createElement](phase-01-fundamentals/01-jsx-react-createelement/notes.md) — how JSX compiles, why className not class
- [x] [Function vs class components](phase-01-fundamentals/02-function-vs-class-components/notes.md) — when each is used, modern preference
- [x] [Props, props.children, defaultProps](phase-01-fundamentals/03-props-children-defaultprops/notes.md) — data flow, prop drilling problems
- [x] [State & immutability](phase-01-fundamentals/04-state-and-immutability/notes.md) — why you can't mutate, spread vs structuredClone
- [x] [One-way data flow](phase-01-fundamentals/05-one-way-data-flow/notes.md) — unidirectional binding, lifting state up
- [x] [Conditional rendering patterns](phase-01-fundamentals/06-conditional-rendering/notes.md) — &&, ternary, early returns, gotchas with 0
- [x] [Lists & keys](phase-01-fundamentals/07-lists-and-keys/notes.md) — why index-as-key breaks, stable IDs
- [x] [Fragments](phase-01-fundamentals/08-fragments/notes.md) — `<></>` vs `<Fragment>`, when keys needed
- [x] [Controlled vs uncontrolled inputs](phase-01-fundamentals/09-controlled-vs-uncontrolled-inputs/notes.md) — value+onChange vs defaultValue+ref
- [x] [Synthetic events](phase-01-fundamentals/10-synthetic-events/notes.md) — event pooling history, delegation in React

---

## Phase 2 — Hooks

> Single biggest topic for senior interviews. Expect deep follow-ups.

- [x] [useState](phase-02-hooks/01-use-state/notes.md) — functional updates, lazy init, batching
- [x] [useEffect](phase-02-hooks/02-use-effect/notes.md) — deps array, cleanup, race conditions, double-fire in StrictMode
- [x] [useLayoutEffect](phase-02-hooks/03-use-layout-effect/notes.md) — sync DOM mutations before paint
- [x] [useInsertionEffect](phase-02-hooks/04-use-insertion-effect/notes.md) — CSS-in-JS library use case
- [x] [useRef](phase-02-hooks/05-use-ref/notes.md) — DOM access AND mutable instance variable
- [x] [useMemo](phase-02-hooks/06-use-memo/notes.md) — referential equality, when memoization hurts
- [x] [useCallback](phase-02-hooks/07-use-callback/notes.md) — stable function refs, parent-child re-render chain
- [x] [useContext](phase-02-hooks/08-use-context/notes.md) — provider pattern, re-render limitations
- [x] [useReducer](phase-02-hooks/09-use-reducer/notes.md) — complex state, when to prefer over useState
- [x] [useImperativeHandle + forwardRef](phase-02-hooks/10-use-imperative-handle-forward-ref/notes.md) — exposing methods to parent
- [x] [useTransition](phase-02-hooks/11-use-transition/notes.md) — non-urgent state updates, isPending UI
- [x] [useDeferredValue](phase-02-hooks/12-use-deferred-value/notes.md) — debounced rendering for expensive lists
- [x] [useId](phase-02-hooks/13-use-id/notes.md) — SSR-safe unique IDs for a11y
- [x] [useSyncExternalStore](phase-02-hooks/14-use-sync-external-store/notes.md) — subscribing to external stores safely
- [x] [useDebugValue](phase-02-hooks/15-use-debug-value/notes.md) — DevTools labels for custom hooks
- [x] [Rules of hooks](phase-02-hooks/16-rules-of-hooks/notes.md) — why top-level only, ESLint plugin internals
- [x] [Stale closure problem](phase-02-hooks/17-stale-closure-problem/notes.md) — common cause of bugs, ref escape hatch
- [x] [Common custom hooks](phase-02-hooks/18-common-custom-hooks/notes.md) — useDebounce, useFetch, usePrevious, useOnClickOutside, useLocalStorage, useIntersectionObserver

---

## Phase 3 — Class Components & Legacy

> Still asked in 2026. Many codebases haven't fully migrated.

- [x] [Lifecycle methods](phase-03-class-legacy/01-lifecycle-methods/notes.md) — mount/update/unmount phases
- [x] [getDerivedStateFromProps](phase-03-class-legacy/02-get-derived-state-from-props/notes.md) — why it replaced componentWillReceiveProps
- [x] [shouldComponentUpdate](phase-03-class-legacy/03-should-component-update/notes.md) — manual render skipping
- [x] [PureComponent vs React.memo](phase-03-class-legacy/04-pure-component-vs-react-memo/notes.md) — shallow comparison
- [x] [componentDidCatch & error boundaries](phase-03-class-legacy/05-component-did-catch-error-boundaries/notes.md) — why must be class, where to place
- [x] [this binding in class methods](phase-03-class-legacy/06-this-binding-class-methods/notes.md) — arrow methods vs constructor binding

---

## Phase 4 — Component Patterns

> Senior-level expectation: pick the right pattern for the problem.

- [x] [Composition over inheritance](phase-04-component-patterns/01-composition-over-inheritance/notes.md) — React's first principle
- [x] [Compound components](phase-04-component-patterns/02-compound-components/notes.md) — shared implicit state via context
- [x] [Render props](phase-04-component-patterns/03-render-props/notes.md) — function-as-children, when still useful
- [x] [HOCs](phase-04-component-patterns/04-hocs/notes.md) — wrapping hell, when to prefer hooks
- [x] [Custom hooks as the modern pattern](phase-04-component-patterns/05-custom-hooks-modern-pattern/notes.md) — why hooks replaced most HOCs/render props
- [x] [Controlled vs uncontrolled component design](phase-04-component-patterns/06-controlled-vs-uncontrolled-design/notes.md) — giving callers the choice
- [x] [forwardRef](phase-04-component-patterns/07-forward-ref/notes.md) — passing refs through wrappers
- [x] [React.Children utilities](phase-04-component-patterns/08-react-children-utilities/notes.md) — map, toArray, only, cloneElement
- [x] [Portals](phase-04-component-patterns/09-portals/notes.md) — modals, tooltips, escaping overflow:hidden
- [x] [StrictMode](phase-04-component-patterns/10-strict-mode/notes.md) — double-invocation, deprecated API warnings
- [x] [Polymorphic components](phase-04-component-patterns/11-polymorphic-components/notes.md) — the `as` prop pattern with TypeScript
- [x] [Slot pattern / asChild](phase-04-component-patterns/12-slot-pattern-as-child/notes.md) — Radix-style component composition

---

## Phase 5 — Performance & Internals

> Heavy focus area. Expect questions on diffing, memoization tradeoffs, and bundle size.

- [x] [Virtual DOM & reconciliation](phase-05-performance/01-virtual-dom-reconciliation/notes.md) — diffing algorithm, O(n) heuristic
- [x] [Fiber architecture](phase-05-performance/02-fiber-architecture/notes.md) — why it replaced stack reconciler
- [x] [Render vs commit phase](phase-05-performance/03-render-vs-commit-phase/notes.md) — two-phase rendering model
- [x] [What causes re-renders](phase-05-performance/04-what-causes-rerenders/notes.md) — state, props, context, parent renders
- [x] [React.memo deep dive](phase-05-performance/05-react-memo-deep-dive/notes.md) — shallow comparison, custom equality fn
- [x] [Avoiding re-renders without memo](phase-05-performance/06-avoiding-rerenders-without-memo/notes.md) — composition trick, children-as-prop
- [x] [Inline objects/functions in JSX](phase-05-performance/07-inline-objects-functions-jsx/notes.md) — why they break memo
- [x] [Automatic batching (React 18)](phase-05-performance/08-automatic-batching-react-18/notes.md) — why setState in promises now batches
- [x] [Code splitting](phase-05-performance/09-code-splitting/notes.md) — React.lazy + Suspense, route-based splits
- [x] [List virtualization](phase-05-performance/10-list-virtualization/notes.md) — react-window for 10k+ rows
- [x] [Profiler API & DevTools profiler](phase-05-performance/11-profiler-api-devtools/notes.md) — flame graphs, ranked view
- [x] [Bundle analysis](phase-05-performance/12-bundle-analysis/notes.md) — webpack-bundle-analyzer, source-map-explorer
- [x] [Tree shaking](phase-05-performance/13-tree-shaking/notes.md) — ESM, sideEffects flag
- [x] [Web vitals in React](phase-05-performance/14-web-vitals-react/notes.md) — LCP, INP, CLS measurement
- [x] [Concurrent rendering](phase-05-performance/15-concurrent-rendering/notes.md) — interruptible renders, time slicing

---

## Phase 6 — State Management

> Know tradeoffs, not just one library. Picking the right tool is the actual interview signal.

- [x] [Context API limitations](phase-06-state-management/01-context-api-limitations/notes.md) — every consumer re-renders on any change
- [x] [Context optimization](phase-06-state-management/02-context-optimization/notes.md) — splitting providers, selector libraries
- [x] [Redux core](phase-06-state-management/03-redux-core/notes.md) — store, reducers, actions, middleware
- [x] [Redux Toolkit](phase-06-state-management/04-redux-toolkit/notes.md) — createSlice, Immer, modern Redux
- [x] [RTK Query](phase-06-state-management/05-rtk-query/notes.md) — data fetching with Redux
- [x] [Zustand](phase-06-state-management/06-zustand/notes.md) — minimal API, no provider needed
- [x] [Jotai / Recoil](phase-06-state-management/07-jotai-recoil/notes.md) — atom-based, granular subscriptions
- [x] [Server state vs client state](phase-06-state-management/08-server-state-vs-client-state/notes.md) — why one tool can't do both well
- [x] [React Query / TanStack Query](phase-06-state-management/09-react-query-tanstack/notes.md) — caching, refetching, stale-while-revalidate
- [x] [SWR](phase-06-state-management/10-swr/notes.md) — alternative to React Query, key differences
- [x] [Optimistic updates](phase-06-state-management/11-optimistic-updates/notes.md) — rollback on failure pattern
- [x] [Cache invalidation strategies](phase-06-state-management/12-cache-invalidation-strategies/notes.md) — tags, query keys, manual refetch
- [x] [State machines (XState)](phase-06-state-management/13-state-machines-xstate/notes.md) — when explicit states beat booleans

---

## Phase 7 — Routing

> React Router v6/v7 patterns. Often combined with code-splitting questions.

- [x] [React Router v6 basics](phase-07-routing/01-react-router-v6-basics/notes.md) — Routes, Route, Outlet, Link
- [x] [Nested routes & layouts](phase-07-routing/02-nested-routes-layouts/notes.md) — Outlet pattern
- [x] [Dynamic routes & params](phase-07-routing/03-dynamic-routes-params/notes.md) — useParams, useSearchParams
- [x] [Programmatic navigation](phase-07-routing/04-programmatic-navigation/notes.md) — useNavigate, replace vs push
- [x] [Protected routes](phase-07-routing/05-protected-routes/notes.md) — auth guards, redirect patterns
- [x] [Lazy-loaded routes](phase-07-routing/06-lazy-loaded-routes/notes.md) — route-based code splitting
- [x] [Data loaders & actions (v6.4+)](phase-07-routing/07-data-loaders-actions/notes.md) — Remix-style data fetching in routes
- [x] [URL state vs component state](phase-07-routing/08-url-state-vs-component-state/notes.md) — when to push state into the URL

---

## Phase 8 — Forms

> Common live coding round. Expect to build a multi-step form with validation.

- [x] [Controlled form patterns](phase-08-forms/01-controlled-form-patterns/notes.md) — single onChange handler, name attribute
- [x] [Form validation strategies](phase-08-forms/02-form-validation-strategies/notes.md) — on-change, on-blur, on-submit
- [x] [React Hook Form](phase-08-forms/03-react-hook-form/notes.md) — uncontrolled by default, ref-based, fast
- [x] [Formik](phase-08-forms/04-formik/notes.md) — older but still common, Field/Form/ErrorMessage
- [x] [Schema validation: Zod / Yup](phase-08-forms/05-schema-validation-zod-yup/notes.md) — resolver pattern, type inference
- [x] [Multi-step / wizard forms](phase-08-forms/06-multi-step-wizard-forms/notes.md) — state preservation across steps
- [x] [File uploads](phase-08-forms/07-file-uploads/notes.md) — FormData, drag-drop, progress UI
- [x] [Debounced search inputs](phase-08-forms/08-debounced-search-inputs/notes.md) — useDeferredValue or useDebounce hook

---

## Phase 9 — TypeScript with React

> Almost always tested at 4+ YOE. Generic components separate juniors from seniors.

- [x] [Typing function components](phase-09-typescript/01-typing-function-components/notes.md) — FC vs explicit props type, children typing
- [x] [Typing useState & useReducer](phase-09-typescript/02-typing-usestate-usereducer/notes.md) — discriminated union state, action types
- [x] [Typing refs](phase-09-typescript/03-typing-refs/notes.md) — useRef\<HTMLDivElement\>(null), nullability
- [x] [Typing event handlers](phase-09-typescript/04-typing-event-handlers/notes.md) — ChangeEvent, MouseEvent, FormEvent
- [x] [Generic components](phase-09-typescript/05-generic-components/notes.md) — \<T,\>(...) syntax, Select\<T\> example
- [x] [Polymorphic components with `as`](phase-09-typescript/06-polymorphic-components-as/notes.md) — ElementType, ComponentPropsWithoutRef
- [x] [Discriminated union props](phase-09-typescript/07-discriminated-union-props/notes.md) — e.g. Button: variant=primary | link with href
- [x] [Typing custom hooks](phase-09-typescript/08-typing-custom-hooks/notes.md) — tuple returns, generic state
- [x] [Utility types](phase-09-typescript/09-utility-types/notes.md) — Pick, Omit, Partial in component APIs

---

## Phase 10 — Testing

> Senior expectation: test user behavior, not implementation details.

- [x] [React Testing Library philosophy](phase-10-testing/01-rtl-philosophy/notes.md) — queries by role > by testid
- [x] [Jest fundamentals](phase-10-testing/02-jest-fundamentals/notes.md) — matchers, mocks, spies, fake timers
- [x] [user-event vs fireEvent](phase-10-testing/03-user-event-vs-fireevent/notes.md) — why user-event is preferred
- [x] [Mocking modules & APIs](phase-10-testing/04-mocking-modules-apis/notes.md) — jest.mock, MSW for network
- [x] [Testing async UI](phase-10-testing/05-testing-async-ui/notes.md) — findBy queries, waitFor
- [x] [Testing custom hooks](phase-10-testing/06-testing-custom-hooks/notes.md) — renderHook from RTL
- [x] [Integration vs unit vs E2E](phase-10-testing/07-integration-unit-e2e/notes.md) — the testing trophy
- [x] [E2E with Playwright/Cypress](phase-10-testing/08-e2e-playwright-cypress/notes.md) — when E2E is worth the cost
- [x] [Snapshot testing pros/cons](phase-10-testing/09-snapshot-testing/notes.md) — why most teams limit them

---

## Phase 11 — Modern React (RSC, Concurrent)

> Hot topic in 2026 interviews, especially at Next.js shops. Many candidates fumble this.

- [x] [React 18 changes summary](phase-11-modern-react/01-react-18-changes/notes.md) — automatic batching, concurrent, Suspense for data
- [x] [Concurrent rendering model](phase-11-modern-react/02-concurrent-rendering-model/notes.md) — interruptible, prioritized work
- [x] [Suspense for data fetching](phase-11-modern-react/03-suspense-data-fetching/notes.md) — throwing promises, boundaries
- [x] [Server components (RSC)](phase-11-modern-react/04-server-components-rsc/notes.md) — zero JS shipped, server-only deps
- [x] [Client vs server components](phase-11-modern-react/05-client-vs-server-components/notes.md) — 'use client' boundary rules
- [x] [Server actions](phase-11-modern-react/06-server-actions/notes.md) — 'use server', form actions, mutations
- [x] [Streaming SSR](phase-11-modern-react/07-streaming-ssr/notes.md) — renderToPipeableStream, Suspense streaming
- [x] [use() hook](phase-11-modern-react/08-use-hook/notes.md) — reading promises and context conditionally

---

## Phase 12 — SSR & Meta-Frameworks

> Next.js dominates. Know rendering modes cold.

- [x] [CSR vs SSR vs SSG vs ISR](phase-12-ssr-frameworks/01-csr-ssr-ssg-isr/notes.md) — tradeoffs, when to pick each
- [x] [Hydration](phase-12-ssr-frameworks/02-hydration/notes.md) — what it does, common mismatch errors
- [x] [Next.js App Router](phase-12-ssr-frameworks/03-nextjs-app-router/notes.md) — file conventions, layouts, loading.tsx
- [x] [Next.js Pages Router](phase-12-ssr-frameworks/04-nextjs-pages-router/notes.md) — getServerSideProps, getStaticProps, getStaticPaths
- [x] [Data fetching in Next.js](phase-12-ssr-frameworks/05-data-fetching-nextjs/notes.md) — fetch caching, revalidate, no-store
- [x] [Middleware & edge runtime](phase-12-ssr-frameworks/06-middleware-edge-runtime/notes.md) — auth at the edge
- [x] [SEO & metadata](phase-12-ssr-frameworks/07-seo-metadata/notes.md) — generateMetadata, OG tags, sitemaps
- [x] [Remix basics](phase-12-ssr-frameworks/08-remix-basics/notes.md) — loaders/actions, nested routing

---

## Phase 13 — Tooling, Security, a11y

> Expect at least one question from each of these areas.

- [x] [Webpack vs Vite vs Turbopack](phase-13-tooling-security-a11y/01-webpack-vite-turbopack/notes.md) — dev server speed, HMR, prod builds
- [x] [Babel & SWC](phase-13-tooling-security-a11y/02-babel-swc/notes.md) — JSX transform, new vs old runtime
- [x] [ESLint + Prettier setup](phase-13-tooling-security-a11y/03-eslint-prettier/notes.md) — react-hooks plugin rules
- [x] [XSS in React](phase-13-tooling-security-a11y/04-xss-in-react/notes.md) — dangerouslySetInnerHTML risks
- [x] [Authentication patterns](phase-13-tooling-security-a11y/05-authentication-patterns/notes.md) — JWT in storage vs httpOnly cookies
- [x] [CSRF in SPA contexts](phase-13-tooling-security-a11y/06-csrf-spa/notes.md) — when it matters
- [x] [ARIA roles & labels](phase-13-tooling-security-a11y/07-aria-roles-labels/notes.md) — landmark roles, aria-live
- [x] [Focus management in SPAs](phase-13-tooling-security-a11y/08-focus-management-spas/notes.md) — route changes, modals, focus trap
- [x] [Keyboard navigation](phase-13-tooling-security-a11y/09-keyboard-navigation/notes.md) — tab order, escape to close, arrow keys
- [x] [Screen reader testing](phase-13-tooling-security-a11y/10-screen-reader-testing/notes.md) — NVDA/VoiceOver basics

---

## Phase 14 — Live Coding Round Patterns

> These are the actual components you'll be asked to build. Practice each one.

- [ ] [Build a useDebounce hook](phase-14-live-coding/01-use-debounce-throttle/notes.md) — and useThrottle
- [ ] [Build a useFetch hook](phase-14-live-coding/02-use-fetch/notes.md) — with loading, error, refetch
- [ ] [Implement useState from scratch](phase-14-live-coding/03-implement-use-state-scratch/notes.md) — closure-based, deep React knowledge signal
- [ ] [Autocomplete / typeahead](phase-14-live-coding/04-autocomplete-typeahead/notes.md) — debounced API, keyboard nav, a11y
- [ ] [Infinite scroll](phase-14-live-coding/05-infinite-scroll/notes.md) — IntersectionObserver pattern
- [ ] [Modal / dialog](phase-14-live-coding/06-modal-dialog/notes.md) — portal, focus trap, escape to close
- [ ] [Tabs component](phase-14-live-coding/07-tabs-component/notes.md) — compound component, ARIA roles
- [ ] [Accordion](phase-14-live-coding/08-accordion/notes.md) — controlled vs uncontrolled, single/multi expand
- [ ] [Pagination](phase-14-live-coding/09-pagination/notes.md) — client-side and server-side variants
- [ ] [Star rating](phase-14-live-coding/10-star-rating/notes.md) — hover preview, half-stars
- [ ] [OTP input](phase-14-live-coding/11-otp-input/notes.md) — auto-focus, paste handling
- [ ] [Recursive comments / file tree](phase-14-live-coding/12-recursive-comments-file-tree/notes.md) — recursive component pattern
- [ ] [Drag and drop list](phase-14-live-coding/13-drag-and-drop-list/notes.md) — HTML5 DnD or dnd-kit
- [ ] [Toast / notification system](phase-14-live-coding/14-toast-notification-system/notes.md) — context + portal + queue
