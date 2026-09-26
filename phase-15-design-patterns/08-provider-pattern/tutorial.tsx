// ============================================================
// Topic:   Provider Pattern
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — createSafeContext factory + ThemeProvider
//   Exercise 2 — split state/dispatch contexts and MEASURE the difference
//   Exercise 3 — composeProviders, provider order, scoping by nesting
//
// Note: the sandbox runs React 18, so we use <Ctx.Provider>. In React 19
// you'd write <Ctx value={…}> and could read with use(Ctx).
//
// Run: npm run tutorial provider-pattern
// ============================================================

import {
  Component, createContext, useCallback, useContext, useMemo, useReducer, useRef, useState,
  Dispatch, FC, ReactNode,
} from 'react';

// ─── Exercise 1: createSafeContext + ThemeProvider ───────────
//
// SITUATION
//   Every provider repeats: context + provider + guarded hook. Write the
//   boilerplate ONCE as a factory, then use it for a theme provider.
//
// BUILD
//   1. createSafeContext<T>(name): returns [Provider, useSafeContext]
//        - context default is null
//        - the hook throws  `use${name} must be used inside <${name}Provider>`
//          when there is no provider
//   2. ThemeProvider: real state (useState), toggle(), MEMOISED value
//   3. Click "Trigger misuse": a consumer is rendered OUTSIDE any provider.
//      The error boundary should show your descriptive message (not
//      "Cannot destructure property of null").

function createSafeContext<T>(name: string) {
  const Ctx = createContext<T | null>(null);
  Ctx.displayName = name;
  function useSafeContext(): T {
    const value = useContext(Ctx);
    // TODO 1: throw a descriptive error when value === null
    return value as T;
  }
  return [Ctx.Provider, useSafeContext] as const;
}

type Theme = 'light' | 'dark';
type ThemeValue = { theme: Theme; toggle: () => void };
const [ThemeCtxProvider, useTheme] = createSafeContext<ThemeValue>('Theme');

const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // TODO 2: const [theme, setTheme] = useState<Theme>('light');
  //         const value = useMemo(() => ({ theme, toggle: … }), [theme]);
  void useState; void useMemo;
  const value: ThemeValue = { theme: 'light', toggle: () => {} };   // stub: static
  return <ThemeCtxProvider value={value}>{children}</ThemeCtxProvider>;
};

const ThemedBox: FC = () => {
  const { theme, toggle } = useTheme();
  return (
    <div style={{ ...card, background: theme === 'dark' ? '#0f172a' : '#f8fafc', color: theme === 'dark' ? '#e2e8f0' : '#0f172a' }}>
      Current theme: <strong>{theme}</strong> <button onClick={toggle}>toggle</button>
    </div>
  );
};

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    return this.state.error
      ? <p style={{ color: '#b91c1c' }}>⚠ {this.state.error.message}</p>
      : this.props.children;
  }
}

function Exercise1() {
  const [misuse, setMisuse] = useState(false);
  return (
    <section>
      <h2>Exercise 1 — Safe Context</h2>
      <ThemeProvider>
        <ThemedBox />
        <ThemedBox />
      </ThemeProvider>
      <p style={muted}>Both boxes read the SAME provider, so toggling one changes both.</p>
      <button onClick={() => setMisuse(true)}>Trigger misuse (consumer with no provider)</button>
      {misuse && <ErrorBoundary><ThemedBox /></ErrorBoundary>}
    </section>
  );
}

// ─── Exercise 2: Split State and Dispatch ────────────────────
//
// SITUATION
//   AddTodoForm only WRITES. TodoList only READS. With one combined
//   context, AddTodoForm re-renders on every list change. The counters
//   make this visible.
//
// BUILD SplitTodosProvider
//   - useReducer(todosReducer, [])
//   - TWO contexts: TodosStateCtx (the list) and TodosDispatchCtx (dispatch)
//   - hooks useTodos() / useTodosDispatch() with null-guards
//
// SUCCESS
//   In the Split panel, adding a todo re-renders TodoList but NOT AddTodoForm.
//   In the Combined panel (given), both re-render.

type Todo = { id: number; text: string };
type TodoAction = { type: 'add'; text: string } | { type: 'clear' };

let nextId = 1;
function todosReducer(state: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'add': return [...state, { id: nextId++, text: action.text }];
    case 'clear': return [];
  }
}

// --- Combined (given, for comparison) ---
const CombinedCtx = createContext<{ todos: Todo[]; dispatch: Dispatch<TodoAction> } | null>(null);
const CombinedProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [todos, dispatch] = useReducer(todosReducer, []);
  const value = useMemo(() => ({ todos, dispatch }), [todos]);   // memoised, but changes with todos
  return <CombinedCtx.Provider value={value}>{children}</CombinedCtx.Provider>;
};

// --- Split (YOU) ---
const TodosStateCtx = createContext<Todo[] | null>(null);
const TodosDispatchCtx = createContext<Dispatch<TodoAction> | null>(null);

const SplitProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // TODO: const [todos, dispatch] = useReducer(todosReducer, []);
  //       nest TodosDispatchCtx.Provider around TodosStateCtx.Provider
  const noop: Dispatch<TodoAction> = () => {};
  return (
    <TodosDispatchCtx.Provider value={noop}>
      <TodosStateCtx.Provider value={[]}>{children}</TodosStateCtx.Provider>
    </TodosDispatchCtx.Provider>
  );
};

function useTodos(): Todo[] {
  const v = useContext(TodosStateCtx);
  if (!v) throw new Error('useTodos must be used inside <SplitProvider>');
  return v;
}
function useTodosDispatch(): Dispatch<TodoAction> {
  const v = useContext(TodosDispatchCtx);
  if (!v) throw new Error('useTodosDispatch must be used inside <SplitProvider>');
  return v;
}

function useRenderCount() {
  const r = useRef(0);
  r.current++;
  return r.current;
}

const CombinedForm: FC = () => {
  const c = useContext(CombinedCtx)!;
  const renders = useRenderCount();
  return <button onClick={() => c.dispatch({ type: 'add', text: 'todo' })}>Add (form renders: {renders})</button>;
};
const CombinedList: FC = () => {
  const c = useContext(CombinedCtx)!;
  const renders = useRenderCount();
  return <div style={muted}>list renders: {renders} · {c.todos.length} todos</div>;
};

const SplitForm: FC = () => {
  const dispatch = useTodosDispatch();
  const renders = useRenderCount();
  return <button onClick={() => dispatch({ type: 'add', text: 'todo' })}>Add (form renders: {renders})</button>;
};
const SplitList: FC = () => {
  const todos = useTodos();
  const renders = useRenderCount();
  return <div style={muted}>list renders: {renders} · {todos.length} todos</div>;
};

function Exercise2() {
  return (
    <section>
      <h2>Exercise 2 — Split Contexts</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...card, flex: 1 }}>
          <strong>Combined</strong>
          <CombinedProvider><CombinedForm /><CombinedList /></CombinedProvider>
        </div>
        <div style={{ ...card, flex: 1 }}>
          <strong>Split (yours)</strong>
          <SplitProvider><SplitForm /><SplitList /></SplitProvider>
        </div>
      </div>
    </section>
  );
}

// ─── Exercise 3: composeProviders, Order, and Scoping ────────
//
// SITUATION
//   The root is a pyramid of providers. Also, UserProvider builds its
//   greeting from LangCtx — so it must sit INSIDE the language provider.
//
// BUILD
//   composeProviders(...providers): returns a component that nests them so
//   the FIRST argument is the OUTERMOST. (reduceRight over the list.)
//
// EXPERIMENT
//   - Root A composes [LangFr, UserProvider, FlagsProvider] → "Bonjour".
//   - Root B composes [UserProvider, LangFr, FlagsProvider] → the user provider
//     is OUTSIDE the language provider → "Hello". Order is dependency order.
//   - The scoped box overrides the language for a subtree by nesting.

type WithChildren = { children: ReactNode };
type Lang = 'en' | 'fr';
const LangCtx = createContext<Lang>('en');
const UserCtx = createContext({ name: 'guest', greeting: '(no provider)' });
const FlagsCtx = createContext({ darkMode: false });

const LangFr: FC<WithChildren> = ({ children }) => <LangCtx.Provider value="fr">{children}</LangCtx.Provider>;
const UserProvider: FC<WithChildren> = ({ children }) => {
  const lang = useContext(LangCtx);
  const value = useMemo(() => ({ name: 'Ada', greeting: lang === 'fr' ? 'Bonjour' : 'Hello' }), [lang]);
  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
};
const FlagsProvider: FC<WithChildren> = ({ children }) => (
  <FlagsCtx.Provider value={{ darkMode: true }}>{children}</FlagsCtx.Provider>
);

function composeProviders(...providers: FC<WithChildren>[]): FC<WithChildren> {
  // TODO: return ({ children }) => providers.reduceRight((acc, P) => <P>{acc}</P>, children)
  void providers; void useCallback;
  return ({ children }) => <>{children}</>;
}

const RootA = composeProviders(LangFr, UserProvider, FlagsProvider);
const RootB = composeProviders(UserProvider, LangFr, FlagsProvider);

const Dashboard: FC<{ label: string }> = ({ label }) => {
  const lang = useContext(LangCtx);
  const user = useContext(UserCtx);
  const flags = useContext(FlagsCtx);
  return (
    <div style={card}>
      <strong>{label}</strong>
      <div>{user.greeting}, {user.name}! · lang={lang} · darkMode={String(flags.darkMode)}</div>
    </div>
  );
};

const ScopedLang: FC<{ lang: Lang; children: ReactNode }> = ({ lang, children }) => (
  <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>
);

function Exercise3() {
  return (
    <section>
      <h2>Exercise 3 — Compose &amp; Scope</h2>
      <RootA><Dashboard label="Root A — Lang outside User (expect Bonjour)" /></RootA>
      <RootB><Dashboard label="Root B — User outside Lang (expect Hello, lang=fr)" /></RootB>
      <RootA>
        <ScopedLang lang="en">
          <Dashboard label="Scoped override: lang=en, but User was built OUTSIDE the override" />
        </ScopedLang>
      </RootA>
    </section>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Try: add a ToastProvider that reads useTheme(). Where must it sit?

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 08 — Provider Pattern</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
  </div>
);

export default App;
