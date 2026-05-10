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

- [ ] [JSX & React.createElement](phase-01-fundamentals/01-jsx-react-createelement.md) — how JSX compiles, why className not class
- [ ] [Function vs class components](phase-01-fundamentals/02-function-vs-class-components.md) — when each is used, modern preference
- [ ] [Props, props.children, defaultProps](phase-01-fundamentals/03-props-children-defaultprops.md) — data flow, prop drilling problems
- [ ] [State & immutability](phase-01-fundamentals/04-state-and-immutability.md) — why you can't mutate, spread vs structuredClone
- [ ] [One-way data flow](phase-01-fundamentals/05-one-way-data-flow.md) — unidirectional binding, lifting state up
- [ ] [Conditional rendering patterns](phase-01-fundamentals/06-conditional-rendering.md) — &&, ternary, early returns, gotchas with 0
- [ ] [Lists & keys](phase-01-fundamentals/07-lists-and-keys.md) — why index-as-key breaks, stable IDs
- [ ] [Fragments](phase-01-fundamentals/08-fragments.md) — `<></>` vs `<Fragment>`, when keys needed
- [ ] [Controlled vs uncontrolled inputs](phase-01-fundamentals/09-controlled-vs-uncontrolled-inputs.md) — value+onChange vs defaultValue+ref
- [ ] [Synthetic events](phase-01-fundamentals/10-synthetic-events.md) — event pooling history, delegation in React

---

## Phase 2 — Hooks

> Single biggest topic for senior interviews. Expect deep follow-ups.

- [ ] [useState](phase-02-hooks/01-use-state.md) — functional updates, lazy init, batching
- [ ] [useEffect](phase-02-hooks/02-use-effect.md) — deps array, cleanup, race conditions, double-fire in StrictMode
- [ ] [useLayoutEffect](phase-02-hooks/03-use-layout-effect.md) — sync DOM mutations before paint
- [ ] [useInsertionEffect](phase-02-hooks/04-use-insertion-effect.md) — CSS-in-JS library use case
- [ ] [useRef](phase-02-hooks/05-use-ref.md) — DOM access AND mutable instance variable
- [x] [useMemo](phase-02-hooks/06-use-memo.md) — referential equality, when memoization hurts
- [x] [useCallback](phase-02-hooks/07-use-callback.md) — stable function refs, parent-child re-render chain
- [x] [useContext](phase-02-hooks/08-use-context.md) — provider pattern, re-render limitations
- [x] [useReducer](phase-02-hooks/09-use-reducer.md) — complex state, when to prefer over useState
- [x] [useImperativeHandle + forwardRef](phase-02-hooks/10-use-imperative-handle-forward-ref.md) — exposing methods to parent
- [x] [useTransition](phase-02-hooks/11-use-transition.md) — non-urgent state updates, isPending UI
- [x] [useDeferredValue](phase-02-hooks/12-use-deferred-value.md) — debounced rendering for expensive lists
- [x] [useId](phase-02-hooks/13-use-id.md) — SSR-safe unique IDs for a11y
- [x] [useSyncExternalStore](phase-02-hooks/14-use-sync-external-store.md) — subscribing to external stores safely
- [x] [useDebugValue](phase-02-hooks/15-use-debug-value.md) — DevTools labels for custom hooks
- [x] [Rules of hooks](phase-02-hooks/16-rules-of-hooks.md) — why top-level only, ESLint plugin internals
- [x] [Stale closure problem](phase-02-hooks/17-stale-closure-problem.md) — common cause of bugs, ref escape hatch
- [x] [Common custom hooks](phase-02-hooks/18-common-custom-hooks.md) — useDebounce, useFetch, usePrevious, useOnClickOutside, useLocalStorage, useIntersectionObserver

---

## Phase 3 — Class Components & Legacy

> Still asked in 2026. Many codebases haven't fully migrated.

- [x] [Lifecycle methods](phase-03-class-legacy/01-lifecycle-methods.md) — mount/update/unmount phases
- [x] [getDerivedStateFromProps](phase-03-class-legacy/02-get-derived-state-from-props.md) — why it replaced componentWillReceiveProps
- [x] [shouldComponentUpdate](phase-03-class-legacy/03-should-component-update.md) — manual render skipping
- [x] [PureComponent vs React.memo](phase-03-class-legacy/04-pure-component-vs-react-memo.md) — shallow comparison
- [x] [componentDidCatch & error boundaries](phase-03-class-legacy/05-component-did-catch-error-boundaries.md) — why must be class, where to place
- [x] [this binding in class methods](phase-03-class-legacy/06-this-binding-class-methods.md) — arrow methods vs constructor binding

---

## Phase 4 — Component Patterns

> Senior-level expectation: pick the right pattern for the problem.

- [ ] [Composition over inheritance](phase-04-component-patterns/01-composition-over-inheritance.md) — React's first principle
- [ ] [Compound components](phase-04-component-patterns/02-compound-components.md) — shared implicit state via context
- [ ] [Render props](phase-04-component-patterns/03-render-props.md) — function-as-children, when still useful
- [ ] [HOCs](phase-04-component-patterns/04-hocs.md) — wrapping hell, when to prefer hooks
- [ ] [Custom hooks as the modern pattern](phase-04-component-patterns/05-custom-hooks-modern-pattern.md) — why hooks replaced most HOCs/render props
- [ ] [Controlled vs uncontrolled component design](phase-04-component-patterns/06-controlled-vs-uncontrolled-design.md) — giving callers the choice
- [ ] [forwardRef](phase-04-component-patterns/07-forward-ref.md) — passing refs through wrappers
- [ ] [React.Children utilities](phase-04-component-patterns/08-react-children-utilities.md) — map, toArray, only, cloneElement
- [ ] [Portals](phase-04-component-patterns/09-portals.md) — modals, tooltips, escaping overflow:hidden
- [ ] [StrictMode](phase-04-component-patterns/10-strict-mode.md) — double-invocation, deprecated API warnings
- [ ] [Polymorphic components](phase-04-component-patterns/11-polymorphic-components.md) — the `as` prop pattern with TypeScript
- [ ] [Slot pattern / asChild](phase-04-component-patterns/12-slot-pattern-as-child.md) — Radix-style component composition

---

## Phase 5 — Performance & Internals

> Heavy focus area. Expect questions on diffing, memoization tradeoffs, and bundle size.

- [ ] [Virtual DOM & reconciliation](phase-05-performance/01-virtual-dom-reconciliation.md) — diffing algorithm, O(n) heuristic
- [ ] [Fiber architecture](phase-05-performance/02-fiber-architecture.md) — why it replaced stack reconciler
- [ ] [Render vs commit phase](phase-05-performance/03-render-vs-commit-phase.md) — two-phase rendering model
- [ ] [What causes re-renders](phase-05-performance/04-what-causes-rerenders.md) — state, props, context, parent renders
- [ ] [React.memo deep dive](phase-05-performance/05-react-memo-deep-dive.md) — shallow comparison, custom equality fn
- [ ] [Avoiding re-renders without memo](phase-05-performance/06-avoiding-rerenders-without-memo.md) — composition trick, children-as-prop
- [ ] [Inline objects/functions in JSX](phase-05-performance/07-inline-objects-functions-jsx.md) — why they break memo
- [ ] [Automatic batching (React 18)](phase-05-performance/08-automatic-batching-react-18.md) — why setState in promises now batches
- [ ] [Code splitting](phase-05-performance/09-code-splitting.md) — React.lazy + Suspense, route-based splits
- [ ] [List virtualization](phase-05-performance/10-list-virtualization.md) — react-window for 10k+ rows
- [ ] [Profiler API & DevTools profiler](phase-05-performance/11-profiler-api-devtools.md) — flame graphs, ranked view
- [ ] [Bundle analysis](phase-05-performance/12-bundle-analysis.md) — webpack-bundle-analyzer, source-map-explorer
- [ ] [Tree shaking](phase-05-performance/13-tree-shaking.md) — ESM, sideEffects flag
- [ ] [Web vitals in React](phase-05-performance/14-web-vitals-react.md) — LCP, INP, CLS measurement
- [ ] [Concurrent rendering](phase-05-performance/15-concurrent-rendering.md) — interruptible renders, time slicing

---

## Phase 6 — State Management

> Know tradeoffs, not just one library. Picking the right tool is the actual interview signal.

- [x] [Context API limitations](phase-06-state-management/01-context-api-limitations.md) — every consumer re-renders on any change
- [x] [Context optimization](phase-06-state-management/02-context-optimization.md) — splitting providers, selector libraries
- [x] [Redux core](phase-06-state-management/03-redux-core.md) — store, reducers, actions, middleware
- [x] [Redux Toolkit](phase-06-state-management/04-redux-toolkit.md) — createSlice, Immer, modern Redux
- [x] [RTK Query](phase-06-state-management/05-rtk-query.md) — data fetching with Redux
- [x] [Zustand](phase-06-state-management/06-zustand.md) — minimal API, no provider needed
- [x] [Jotai / Recoil](phase-06-state-management/07-jotai-recoil.md) — atom-based, granular subscriptions
- [x] [Server state vs client state](phase-06-state-management/08-server-state-vs-client-state.md) — why one tool can't do both well
- [x] [React Query / TanStack Query](phase-06-state-management/09-react-query-tanstack.md) — caching, refetching, stale-while-revalidate
- [x] [SWR](phase-06-state-management/10-swr.md) — alternative to React Query, key differences
- [x] [Optimistic updates](phase-06-state-management/11-optimistic-updates.md) — rollback on failure pattern
- [x] [Cache invalidation strategies](phase-06-state-management/12-cache-invalidation-strategies.md) — tags, query keys, manual refetch
- [x] [State machines (XState)](phase-06-state-management/13-state-machines-xstate.md) — when explicit states beat booleans

---

## Phase 7 — Routing

> React Router v6/v7 patterns. Often combined with code-splitting questions.

- [x] [React Router v6 basics](phase-07-routing/01-react-router-v6-basics.md) — Routes, Route, Outlet, Link
- [x] [Nested routes & layouts](phase-07-routing/02-nested-routes-layouts.md) — Outlet pattern
- [x] [Dynamic routes & params](phase-07-routing/03-dynamic-routes-params.md) — useParams, useSearchParams
- [x] [Programmatic navigation](phase-07-routing/04-programmatic-navigation.md) — useNavigate, replace vs push
- [x] [Protected routes](phase-07-routing/05-protected-routes.md) — auth guards, redirect patterns
- [x] [Lazy-loaded routes](phase-07-routing/06-lazy-loaded-routes.md) — route-based code splitting
- [x] [Data loaders & actions (v6.4+)](phase-07-routing/07-data-loaders-actions.md) — Remix-style data fetching in routes
- [x] [URL state vs component state](phase-07-routing/08-url-state-vs-component-state.md) — when to push state into the URL

---

## Phase 8 — Forms

> Common live coding round. Expect to build a multi-step form with validation.

- [x] [Controlled form patterns](phase-08-forms/01-controlled-form-patterns.md) — single onChange handler, name attribute
- [x] [Form validation strategies](phase-08-forms/02-form-validation-strategies.md) — on-change, on-blur, on-submit
- [x] [React Hook Form](phase-08-forms/03-react-hook-form.md) — uncontrolled by default, ref-based, fast
- [x] [Formik](phase-08-forms/04-formik.md) — older but still common, Field/Form/ErrorMessage
- [x] [Schema validation: Zod / Yup](phase-08-forms/05-schema-validation-zod-yup.md) — resolver pattern, type inference
- [x] [Multi-step / wizard forms](phase-08-forms/06-multi-step-wizard-forms.md) — state preservation across steps
- [x] [File uploads](phase-08-forms/07-file-uploads.md) — FormData, drag-drop, progress UI
- [x] [Debounced search inputs](phase-08-forms/08-debounced-search-inputs.md) — useDeferredValue or useDebounce hook

---

## Phase 9 — TypeScript with React

> Almost always tested at 4+ YOE. Generic components separate juniors from seniors.

- [ ] [Typing function components](phase-09-typescript/01-typing-function-components.md) — FC vs explicit props type, children typing
- [ ] [Typing useState & useReducer](phase-09-typescript/02-typing-usestate-usereducer.md) — discriminated union state, action types
- [ ] [Typing refs](phase-09-typescript/03-typing-refs.md) — useRef\<HTMLDivElement\>(null), nullability
- [ ] [Typing event handlers](phase-09-typescript/04-typing-event-handlers.md) — ChangeEvent, MouseEvent, FormEvent
- [ ] [Generic components](phase-09-typescript/05-generic-components.md) — \<T,\>(...) syntax, Select\<T\> example
- [ ] [Polymorphic components with `as`](phase-09-typescript/06-polymorphic-components-as.md) — ElementType, ComponentPropsWithoutRef
- [ ] [Discriminated union props](phase-09-typescript/07-discriminated-union-props.md) — e.g. Button: variant=primary | link with href
- [ ] [Typing custom hooks](phase-09-typescript/08-typing-custom-hooks.md) — tuple returns, generic state
- [ ] [Utility types](phase-09-typescript/09-utility-types.md) — Pick, Omit, Partial in component APIs

---

## Phase 10 — Testing

> Senior expectation: test user behavior, not implementation details.

- [ ] [React Testing Library philosophy](phase-10-testing/01-rtl-philosophy.md) — queries by role > by testid
- [ ] [Jest fundamentals](phase-10-testing/02-jest-fundamentals.md) — matchers, mocks, spies, fake timers
- [ ] [user-event vs fireEvent](phase-10-testing/03-user-event-vs-fireevent.md) — why user-event is preferred
- [ ] [Mocking modules & APIs](phase-10-testing/04-mocking-modules-apis.md) — jest.mock, MSW for network
- [ ] [Testing async UI](phase-10-testing/05-testing-async-ui.md) — findBy queries, waitFor
- [ ] [Testing custom hooks](phase-10-testing/06-testing-custom-hooks.md) — renderHook from RTL
- [ ] [Integration vs unit vs E2E](phase-10-testing/07-integration-unit-e2e.md) — the testing trophy
- [ ] [E2E with Playwright/Cypress](phase-10-testing/08-e2e-playwright-cypress.md) — when E2E is worth the cost
- [ ] [Snapshot testing pros/cons](phase-10-testing/09-snapshot-testing.md) — why most teams limit them

---

## Phase 11 — Modern React (RSC, Concurrent)

> Hot topic in 2026 interviews, especially at Next.js shops. Many candidates fumble this.

- [x] [React 18 changes summary](phase-11-modern-react/01-react-18-changes.md) — automatic batching, concurrent, Suspense for data
- [x] [Concurrent rendering model](phase-11-modern-react/02-concurrent-rendering-model.md) — interruptible, prioritized work
- [x] [Suspense for data fetching](phase-11-modern-react/03-suspense-data-fetching.md) — throwing promises, boundaries
- [x] [Server components (RSC)](phase-11-modern-react/04-server-components-rsc.md) — zero JS shipped, server-only deps
- [x] [Client vs server components](phase-11-modern-react/05-client-vs-server-components.md) — 'use client' boundary rules
- [x] [Server actions](phase-11-modern-react/06-server-actions.md) — 'use server', form actions, mutations
- [x] [Streaming SSR](phase-11-modern-react/07-streaming-ssr.md) — renderToPipeableStream, Suspense streaming
- [x] [use() hook](phase-11-modern-react/08-use-hook.md) — reading promises and context conditionally

---

## Phase 12 — SSR & Meta-Frameworks

> Next.js dominates. Know rendering modes cold.

- [x] [CSR vs SSR vs SSG vs ISR](phase-12-ssr-frameworks/01-csr-ssr-ssg-isr.md) — tradeoffs, when to pick each
- [x] [Hydration](phase-12-ssr-frameworks/02-hydration.md) — what it does, common mismatch errors
- [x] [Next.js App Router](phase-12-ssr-frameworks/03-nextjs-app-router.md) — file conventions, layouts, loading.tsx
- [x] [Next.js Pages Router](phase-12-ssr-frameworks/04-nextjs-pages-router.md) — getServerSideProps, getStaticProps, getStaticPaths
- [x] [Data fetching in Next.js](phase-12-ssr-frameworks/05-data-fetching-nextjs.md) — fetch caching, revalidate, no-store
- [x] [Middleware & edge runtime](phase-12-ssr-frameworks/06-middleware-edge-runtime.md) — auth at the edge
- [x] [SEO & metadata](phase-12-ssr-frameworks/07-seo-metadata.md) — generateMetadata, OG tags, sitemaps
- [x] [Remix basics](phase-12-ssr-frameworks/08-remix-basics.md) — loaders/actions, nested routing

---

## Phase 13 — Tooling, Security, a11y

> Expect at least one question from each of these areas.

- [x] [Webpack vs Vite vs Turbopack](phase-13-tooling-security-a11y/01-webpack-vite-turbopack.md) — dev server speed, HMR, prod builds
- [x] [Babel & SWC](phase-13-tooling-security-a11y/02-babel-swc.md) — JSX transform, new vs old runtime
- [x] [ESLint + Prettier setup](phase-13-tooling-security-a11y/03-eslint-prettier.md) — react-hooks plugin rules
- [x] [XSS in React](phase-13-tooling-security-a11y/04-xss-in-react.md) — dangerouslySetInnerHTML risks
- [x] [Authentication patterns](phase-13-tooling-security-a11y/05-authentication-patterns.md) — JWT in storage vs httpOnly cookies
- [x] [CSRF in SPA contexts](phase-13-tooling-security-a11y/06-csrf-spa.md) — when it matters
- [x] [ARIA roles & labels](phase-13-tooling-security-a11y/07-aria-roles-labels.md) — landmark roles, aria-live
- [x] [Focus management in SPAs](phase-13-tooling-security-a11y/08-focus-management-spas.md) — route changes, modals, focus trap
- [x] [Keyboard navigation](phase-13-tooling-security-a11y/09-keyboard-navigation.md) — tab order, escape to close, arrow keys
- [x] [Screen reader testing](phase-13-tooling-security-a11y/10-screen-reader-testing.md) — NVDA/VoiceOver basics

---

## Phase 14 — Live Coding Round Patterns

> These are the actual components you'll be asked to build. Practice each one.

- [ ] [Build a useDebounce hook](phase-14-live-coding/01-use-debounce-throttle.md) — and useThrottle
- [ ] [Build a useFetch hook](phase-14-live-coding/02-use-fetch.md) — with loading, error, refetch
- [ ] [Implement useState from scratch](phase-14-live-coding/03-implement-use-state-scratch.md) — closure-based, deep React knowledge signal
- [ ] [Autocomplete / typeahead](phase-14-live-coding/04-autocomplete-typeahead.md) — debounced API, keyboard nav, a11y
- [ ] [Infinite scroll](phase-14-live-coding/05-infinite-scroll.md) — IntersectionObserver pattern
- [ ] [Modal / dialog](phase-14-live-coding/06-modal-dialog.md) — portal, focus trap, escape to close
- [ ] [Tabs component](phase-14-live-coding/07-tabs-component.md) — compound component, ARIA roles
- [ ] [Accordion](phase-14-live-coding/08-accordion.md) — controlled vs uncontrolled, single/multi expand
- [ ] [Pagination](phase-14-live-coding/09-pagination.md) — client-side and server-side variants
- [ ] [Star rating](phase-14-live-coding/10-star-rating.md) — hover preview, half-stars
- [ ] [OTP input](phase-14-live-coding/11-otp-input.md) — auto-focus, paste handling
- [ ] [Recursive comments / file tree](phase-14-live-coding/12-recursive-comments-file-tree.md) — recursive component pattern
- [ ] [Drag and drop list](phase-14-live-coding/13-drag-and-drop-list.md) — HTML5 DnD or dnd-kit
- [ ] [Toast / notification system](phase-14-live-coding/14-toast-notification-system.md) — context + portal + queue
