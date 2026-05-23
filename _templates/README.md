# Tutorial Templates

Base templates for `tutorial.jsx` and `tutorial.tsx` stub files generated for each topic.

## Files

| File | Used for |
|---|---|
| `tutorial-js.jsx` | Phases 1–8 (plain JavaScript / JSX) |
| `tutorial-ts.tsx` | Phases 9–13 (TypeScript / TSX) |

## How to use a tutorial file

Each topic folder contains two files:

- `notes.md` — concept explanation, mental models, interview Q&A
- `tutorial.jsx` or `tutorial.tsx` — three exercises + a free playground

**Recommended workflow:**

1. Read `notes.md` fully before opening the tutorial file.
2. Work through **Exercise 1 → 2 → 3** in order:
   - Exercise 1: core mechanic (simplest implementation)
   - Exercise 2: edge case or common gotcha
   - Exercise 3: production-style composable pattern
3. Use the **Playground** section for free-form experimentation.

## Running tutorial files

### Option A — Shared sandbox (recommended)

The project has a pre-configured Vite + React app in `sandbox/` with dependencies
already installed. Run this from the **project root**:

```bash
npm run tutorial <name>
```

The script finds the matching tutorial, copies it into the sandbox, and opens
the browser at `localhost:5173` automatically. Vite hot-reloads on every save.

---

### What to put in `<name>`

Every tutorial file lives at a path like this:

```
phase-02-hooks / 01-use-state / tutorial.jsx
└─── phase ───┘ └── topic ───┘
```

`<name>` is a **case-insensitive substring match** against that path. Anything
that appears anywhere in `phase-XX-{phase}/NN-{topic-slug}/` is valid — you
don't need to type the full path, just enough to identify one tutorial uniquely.

#### The reliable patterns

| Pattern | Example | When to use |
|---|---|---|
| **Topic keyword** | `use-state`, `fiber`, `fragments` | Best default — keywords from the topic slug are usually unique across all 134 tutorials |
| **Number + keyword** | `01-jsx`, `02-use-effect`, `09-reducer` | When a bare keyword might be ambiguous (e.g. `effect` matches three topics) |
| **Phase + keyword** | `phase-02/use-state`, `hooks/use-state` | When you want to be explicit about which phase |
| **Full topic slug** | `01-jsx-react-createelement` | Always unique — copy-paste from the folder name |

#### What tends to be ambiguous

| What you type | Why it hits multiple topics |
|---|---|
| `01` | Every phase has a topic 01 — 14 matches |
| `02` | Same — one per phase |
| `hooks` | Matches the phase name `phase-02-hooks` — loads all 18 hook tutorials |
| `effect` | Matches `use-effect`, `use-layout-effect`, `use-insertion-effect` — 3 matches |
| `component` | Appears in phase names and topic slugs across several phases |

When a query matches multiple tutorials, the script prints them all and exits
without loading anything. Just look at the list and add one more word:

```bash
npm run tutorial effect             # ✗ ambiguous — 3 matches
npm run tutorial use-effect         # ✓ unique
npm run tutorial layout-effect      # ✓ also unique
```

#### Can't remember the name?

Run any nonsense word — the "no matches" error prints all 134 tutorial paths:

```bash
npm run tutorial list
```

---

### Quick reference — every topic by searchable name

```
# Phase 1 — Fundamentals
npm run tutorial 01-jsx                         → JSX & React.createElement
npm run tutorial function-vs-class              → Function vs class components
npm run tutorial props-children                 → Props, children, defaultProps
npm run tutorial state-and-immutability         → State & immutability
npm run tutorial one-way-data-flow              → One-way data flow
npm run tutorial conditional-rendering         → Conditional rendering
npm run tutorial lists-and-keys                → Lists & keys
npm run tutorial fragments                      → Fragments
npm run tutorial controlled-vs-uncontrolled-inputs  → Controlled vs uncontrolled inputs
npm run tutorial synthetic-events              → Synthetic events

# Phase 2 — Hooks
npm run tutorial use-state                      → useState
npm run tutorial use-effect                     → useEffect
npm run tutorial use-layout-effect             → useLayoutEffect
npm run tutorial use-insertion-effect          → useInsertionEffect
npm run tutorial use-ref                        → useRef
npm run tutorial use-memo                       → useMemo
npm run tutorial use-callback                   → useCallback
npm run tutorial use-context                    → useContext
npm run tutorial use-reducer                    → useReducer
npm run tutorial use-imperative-handle         → useImperativeHandle + forwardRef
npm run tutorial use-transition                → useTransition
npm run tutorial use-deferred-value            → useDeferredValue
npm run tutorial use-id                         → useId
npm run tutorial use-sync-external-store       → useSyncExternalStore
npm run tutorial use-debug-value               → useDebugValue
npm run tutorial rules-of-hooks                → Rules of hooks
npm run tutorial stale-closure                 → Stale closure problem
npm run tutorial common-custom-hooks           → Common custom hooks

# Phase 3 — Class Components & Legacy
npm run tutorial lifecycle-methods             → Lifecycle methods
npm run tutorial get-derived-state             → getDerivedStateFromProps
npm run tutorial should-component-update       → shouldComponentUpdate
npm run tutorial pure-component-vs-react-memo  → PureComponent vs React.memo
npm run tutorial component-did-catch           → componentDidCatch & error boundaries
npm run tutorial this-binding                  → this binding in class methods

# Phase 4 — Component Patterns
npm run tutorial composition-over-inheritance  → Composition over inheritance
npm run tutorial compound-components           → Compound components
npm run tutorial render-props                  → Render props
npm run tutorial hocs                          → HOCs
npm run tutorial custom-hooks-modern-pattern   → Custom hooks as the modern pattern
npm run tutorial controlled-vs-uncontrolled-design  → Controlled vs uncontrolled design
npm run tutorial forward-ref                   → forwardRef
npm run tutorial react-children                → React.Children utilities
npm run tutorial portals                        → Portals
npm run tutorial strict-mode                   → StrictMode
npm run tutorial polymorphic-components        → Polymorphic components
npm run tutorial slot-pattern                  → Slot pattern / asChild

# Phase 5 — Performance
npm run tutorial virtual-dom                   → Virtual DOM & reconciliation
npm run tutorial fiber-architecture            → Fiber architecture
npm run tutorial render-vs-commit              → Render vs commit phase
npm run tutorial what-causes-rerenders         → What causes re-renders
npm run tutorial react-memo-deep-dive          → React.memo deep dive
npm run tutorial avoiding-rerenders            → Avoiding re-renders without memo
npm run tutorial inline-objects                → Inline objects/functions in JSX
npm run tutorial automatic-batching            → Automatic batching (React 18)
npm run tutorial code-splitting                → Code splitting
npm run tutorial list-virtualization           → List virtualization
npm run tutorial profiler-api                  → Profiler API & DevTools
npm run tutorial bundle-analysis               → Bundle analysis
npm run tutorial tree-shaking                  → Tree shaking
npm run tutorial web-vitals                    → Web vitals in React
npm run tutorial concurrent-rendering          → Concurrent rendering

# Phase 6 — State Management
npm run tutorial context-api-limitations       → Context API limitations
npm run tutorial context-optimization          → Context optimization
npm run tutorial redux-core                    → Redux core
npm run tutorial redux-toolkit                 → Redux Toolkit
npm run tutorial rtk-query                     → RTK Query
npm run tutorial zustand                        → Zustand
npm run tutorial jotai-recoil                  → Jotai / Recoil
npm run tutorial server-state-vs-client        → Server state vs client state
npm run tutorial react-query-tanstack          → React Query / TanStack Query
npm run tutorial swr                            → SWR
npm run tutorial optimistic-updates            → Optimistic updates
npm run tutorial cache-invalidation            → Cache invalidation strategies
npm run tutorial state-machines                → State machines (XState)

# Phase 7 — Routing
npm run tutorial react-router-v6-basics        → React Router v6 basics
npm run tutorial nested-routes                 → Nested routes & layouts
npm run tutorial dynamic-routes                → Dynamic routes & params
npm run tutorial programmatic-navigation       → Programmatic navigation
npm run tutorial protected-routes              → Protected routes
npm run tutorial lazy-loaded-routes            → Lazy-loaded routes
npm run tutorial data-loaders-actions          → Data loaders & actions
npm run tutorial url-state-vs-component-state  → URL state vs component state

# Phase 8 — Forms
npm run tutorial controlled-form-patterns      → Controlled form patterns
npm run tutorial form-validation               → Form validation strategies
npm run tutorial react-hook-form               → React Hook Form
npm run tutorial formik                         → Formik
npm run tutorial schema-validation             → Schema validation (Zod / Yup)
npm run tutorial multi-step-wizard             → Multi-step wizard forms
npm run tutorial file-uploads                  → File uploads
npm run tutorial debounced-search              → Debounced search inputs

# Phase 9 — TypeScript (uses .tsx)
npm run tutorial typing-function-components    → Typing function components
npm run tutorial typing-usestate               → Typing useState & useReducer
npm run tutorial typing-refs                   → Typing refs
npm run tutorial typing-event-handlers         → Typing event handlers
npm run tutorial generic-components            → Generic components
npm run tutorial polymorphic-components-as     → Polymorphic components with as
npm run tutorial discriminated-union           → Discriminated union props
npm run tutorial typing-custom-hooks           → Typing custom hooks
npm run tutorial utility-types                 → Utility types

# Phase 10 — Testing (uses .tsx)
npm run tutorial rtl-philosophy                → RTL philosophy
npm run tutorial jest-fundamentals             → Jest fundamentals
npm run tutorial user-event-vs-fireevent       → user-event vs fireEvent
npm run tutorial mocking-modules               → Mocking modules & APIs
npm run tutorial testing-async                 → Testing async UI
npm run tutorial testing-custom-hooks          → Testing custom hooks
npm run tutorial integration-unit-e2e          → Integration vs unit vs E2E
npm run tutorial e2e-playwright                → E2E with Playwright/Cypress
npm run tutorial snapshot-testing             → Snapshot testing

# Phase 11 — Modern React (uses .tsx)
npm run tutorial react-18-changes              → React 18 changes
npm run tutorial concurrent-rendering-model    → Concurrent rendering model
npm run tutorial suspense-data-fetching        → Suspense for data fetching
npm run tutorial server-components-rsc         → Server components (RSC)
npm run tutorial client-vs-server-components   → Client vs server components
npm run tutorial server-actions                → Server actions
npm run tutorial streaming-ssr                 → Streaming SSR
npm run tutorial use-hook                      → use() hook

# Phase 12 — SSR & Meta-Frameworks (uses .tsx)
npm run tutorial csr-ssr-ssg-isr               → CSR vs SSR vs SSG vs ISR
npm run tutorial hydration                      → Hydration
npm run tutorial nextjs-app-router             → Next.js App Router
npm run tutorial nextjs-pages-router           → Next.js Pages Router
npm run tutorial data-fetching-nextjs          → Data fetching in Next.js
npm run tutorial middleware-edge               → Middleware & edge runtime
npm run tutorial seo-metadata                  → SEO & metadata
npm run tutorial remix-basics                  → Remix basics

# Phase 13 — Tooling, Security, a11y (uses .tsx)
npm run tutorial webpack-vite-turbopack        → Webpack vs Vite vs Turbopack
npm run tutorial babel-swc                     → Babel & SWC
npm run tutorial eslint-prettier               → ESLint + Prettier
npm run tutorial xss-in-react                  → XSS in React
npm run tutorial authentication-patterns       → Authentication patterns
npm run tutorial csrf-spa                      → CSRF in SPA contexts
npm run tutorial aria-roles                    → ARIA roles & labels
npm run tutorial focus-management              → Focus management in SPAs
npm run tutorial keyboard-navigation           → Keyboard navigation
npm run tutorial screen-reader                 → Screen reader testing
```

---

### Option B — StackBlitz (no local setup needed)

| Phase | Link |
|---|---|
| Phases 1–8 (JSX) | [stackblitz.com/new/react](https://stackblitz.com/new/react) |
| Phases 9–13 (TSX) | [stackblitz.com/new/react-ts](https://stackblitz.com/new/react-ts) |

Open the link, paste the tutorial file content into `src/App.jsx` (or `App.tsx`),
and click Run. Useful when you don't have access to your local machine.

## Creating a tutorial for a new Phase 14 topic

Copy the appropriate template, then replace the three placeholder strings:

| Placeholder | Example replacement |
|---|---|
| `TOPIC_NAME` | `useDebounce` |
| `PHASE_NUM` | `14` |
| `PHASE_NAME` | `Live Coding Patterns` |

Save the file as `phase-14-live-coding/NN-slug/tutorial.jsx`.
