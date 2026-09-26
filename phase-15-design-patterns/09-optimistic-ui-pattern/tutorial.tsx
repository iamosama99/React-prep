// ============================================================
// Topic:   Optimistic UI
// Phase:   15 — React Design Patterns
// File:    tutorial.tsx
//
// The sandbox runs React 18, which has no useOptimistic. Exercise 1 has you
// build the same MODEL by hand — a self-expiring layer over real state — so
// you understand exactly what React 19's hook does for you. The code panel
// at the bottom shows the React 19 equivalent.
//
// HOW TO USE
//   Read notes.md first, then work top-to-bottom.
//   Exercise 1 — build useOptimisticLayer(state, reducer) → [shown, run]
//   Exercise 2 — an optimistic Like button with automatic rollback
//   Exercise 3 — optimistic add-to-list: temp ids, pending rows, failure + retry
//
// Run: npm run tutorial optimistic-ui
// ============================================================

import { useMemo, useRef, useState, FC } from 'react';

// ─── Exercise 1: The Layer ───────────────────────────────────
//
// SITUATION
//   shown = pendingUpdates.reduce(reducer, realState)
//   The layer exists only while async work is running, then it's discarded —
//   that expiry IS the rollback.
//
// BUILD  useOptimisticLayer<S, A>(state: S, reducer: (s: S, a: A) => S)
//   returns [shown, run] where
//     run(action, work): Promise<void>
//       1. push { id, action } onto a `pending` state array  (shown updates NOW)
//       2. await work()        — the caller updates REAL state in here on success
//       3. finally: remove that pending entry  (whether work resolved or threw)
//       4. errors must propagate to the caller (don't swallow them)
//   `shown` is useMemo(() => pending.reduce((s, p) => reducer(s, p.action), state), …)
//
// The stub has no layer, so nothing feels instant. Watch Exercises 2 and 3
// come alive when you implement this.

function useOptimisticLayer<S, A>(
  state: S,
  reducer: (s: S, a: A) => S,
): readonly [S, (action: A, work: () => Promise<void>) => Promise<void>] {
  // TODO 1: const [pending, setPending] = useState<{ id: number; action: A }[]>([]);
  //         const nextId = useRef(0);
  // TODO 2: const shown = useMemo(() => pending.reduce((s, p) => reducer(s, p.action), state), [pending, state, reducer]);
  // TODO 3: run = async (action, work) => { add pending; try { await work(); } finally { remove pending } }
  void useMemo; void useRef; void useState; void reducer;
  const run = async (_action: A, work: () => Promise<void>) => { await work(); };
  return [state, run] as const;
}

function Exercise1() {
  const [count, setCount] = useState(0);
  const [shown, run] = useOptimisticLayer<number, number>(count, (s, a) => s + a);
  return (
    <section>
      <h2>Exercise 1 — useOptimisticLayer</h2>
      <p>
        real: <strong>{count}</strong> · shown: <strong>{shown}</strong>{' '}
        <button
          onClick={() => run(1, async () => { await wait(1500); setCount(c => c + 1); })}
        >
          +1 (takes 1.5 s)
        </button>{' '}
        <button
          onClick={() => run(1, async () => { await wait(1500); throw new Error('nope'); }).catch(() => {})}
        >
          +1 (fails after 1.5 s)
        </button>
      </p>
      <p style={muted}>
        With your implementation: “shown” jumps immediately; on success real catches up; on
        failure “shown” falls back to real by itself. Rapid clicks stack in order.
      </p>
    </section>
  );
}

// ─── Exercise 2: Optimistic Like Button ──────────────────────
//
// SITUATION
//   The server takes ~1 s. The heart should flip instantly. If the server
//   rejects, it must flip back and the user must be told.
//
// BUILD  (use your useOptimisticLayer)
//   likeReducer(post, { type: 'toggle' })
//   onClick:
//     clear error → run({type:'toggle'}, async () => {
//        await api.toggleLike(post.liked);
//        setPost(p => likeReducer(p, { type: 'toggle' }));   // update REAL state on success
//     }) with try/catch → setError(message)
//
// TEST
//   Check "Fail the next request" then click: heart flips, then flips back,
//   and you see the error. Uncheck and click: it just works.

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

type Post = { likes: number; liked: boolean };
type LikeAction = { type: 'toggle' };

function likeReducer(p: Post, _a: LikeAction): Post {
  return p.liked ? { likes: p.likes - 1, liked: false } : { likes: p.likes + 1, liked: true };
}

let failNext = false;
const api = {
  async toggleLike(_currentlyLiked: boolean) {
    await wait(1000);
    if (failNext) { failNext = false; throw new Error('Server rejected the like'); }
  },
  async addTodo(text: string): Promise<{ id: string; text: string }> {
    await wait(1000);
    if (failNext || text.toLowerCase().includes('fail')) { failNext = false; throw new Error('Could not save todo'); }
    return { id: `srv-${Math.random().toString(36).slice(2, 7)}`, text };
  },
};

function Exercise2() {
  const [post, setPost] = useState<Post>({ likes: 10, liked: false });
  const [shown, run] = useOptimisticLayer(post, likeReducer);
  const [error, setError] = useState<string | null>(null);
  const [failing, setFailing] = useState(false);

  async function onClick() {
    setError(null);
    failNext = failing;
    // TODO: replace this pessimistic version with run({ type: 'toggle' }, async () => { … })
    try {
      await api.toggleLike(post.liked);
      setPost(p => likeReducer(p, { type: 'toggle' }));
    } catch (e) {
      setError((e as Error).message);
    }
    void run;
  }

  return (
    <section>
      <h2>Exercise 2 — Optimistic Like</h2>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <button onClick={onClick} style={{ fontSize: 22 }}>
          {shown.liked ? '♥' : '♡'} {shown.likes}
        </button>
        <span style={muted}>real: {post.liked ? '♥' : '♡'} {post.likes}</span>
      </div>
      <label style={{ display: 'block', marginTop: 8 }}>
        <input type="checkbox" checked={failing} onChange={e => setFailing(e.target.checked)} /> Fail the next request
      </label>
      {error && <p style={{ color: '#b91c1c' }}>⚠ {error} — your like was undone.</p>}
    </section>
  );
}

// ─── Exercise 3: Optimistic Add with Temp IDs ────────────────
//
// SITUATION
//   Adding a todo should appear instantly, marked "sending…", with a client
//   key that survives the switch to the real server id. If it fails, the
//   item disappears BUT the user's text is preserved with a Retry button.
//
// BUILD
//   addReducer: appends { …todo, pending: true }
//   add(text):
//     temp = { id: `temp-…`, clientKey: <stable unique>, text }
//     run({ type: 'add', todo: temp }, async () => {
//        const saved = await api.addTodo(text);
//        setTodos(t => [...t, { id: saved.id, clientKey: temp.clientKey, text: saved.text }]);
//     })  — catch → push { text, message } to `failed`
//   Render key={t.clientKey} (NOT t.id) so the row doesn't remount when the id changes.
//
// TEST  Add “Buy milk” (works). Add “please fail” (text includes "fail") → rolls
//       back and shows in the failed list; Retry re-runs add(text).

type Todo = { id: string; clientKey: string; text: string; pending?: boolean };
type AddAction = { type: 'add'; todo: Todo };
const addReducer = (s: Todo[], a: AddAction): Todo[] => [...s, { ...a.todo, pending: true }];

function Exercise3() {
  const [todos, setTodos] = useState<Todo[]>([{ id: 'srv-0', clientKey: 'k0', text: 'Seed todo' }]);
  const [shown, run] = useOptimisticLayer(todos, addReducer);
  const [failed, setFailed] = useState<{ text: string; message: string }[]>([]);
  const [text, setText] = useState('');
  const seq = useRef(1);

  async function add(t: string) {
    // TODO: replace this pessimistic version with the optimistic recipe above
    try {
      const saved = await api.addTodo(t);
      setTodos(ts => [...ts, { id: saved.id, clientKey: `k${seq.current++}`, text: saved.text }]);
    } catch (e) {
      setFailed(f => [...f, { text: t, message: (e as Error).message }]);
    }
    void run;
  }

  return (
    <section>
      <h2>Exercise 3 — Optimistic Add</h2>
      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) { void add(text.trim()); setText(''); } }}
      >
        <input value={text} onChange={e => setText(e.target.value)} placeholder='try “please fail”' />{' '}
        <button>Add</button>
      </form>
      <ul>
        {shown.map(t => (
          <li key={t.clientKey} style={{ opacity: t.pending ? 0.5 : 1, fontStyle: t.pending ? 'italic' : 'normal' }}>
            {t.text} {t.pending && <span style={muted}>sending…</span>}
          </li>
        ))}
      </ul>
      {failed.map((f, i) => (
        <div key={i} style={{ ...card, borderColor: '#fca5a5' }}>
          ⚠ “{f.text}” — {f.message}{' '}
          <button onClick={() => { setFailed(list => list.filter((_, j) => j !== i)); void add(f.text); }}>Retry</button>
        </div>
      ))}
    </section>
  );
}

// ─── React 19 equivalent (for reference) ─────────────────────
const REACT19 = `function Todos({ todos }: { todos: Todo[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    todos,
    (current: Todo[], todo: Todo) => [...current, { ...todo, pending: true }],
  );

  async function action(formData: FormData) {
    const text = String(formData.get('text'));
    addOptimistic({ id: crypto.randomUUID(), text });   // inside the form Action
    await saveTodo(text);                               // Server Action → revalidates 'todos'
  }                                                     // Action ends → layer discarded → real list shown

  return <form action={action}>…</form>;
}`;

// ─── App ─────────────────────────────────────────────────────
const muted = { color: '#64748b', fontSize: 13 } as const;
const card = { border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginTop: 8 } as const;

const App: FC = () => (
  <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>
    <h1>Phase 15 · 09 — Optimistic UI</h1>
    <Exercise1 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise2 />
    <hr style={{ margin: '32px 0' }} />
    <Exercise3 />
    <hr style={{ margin: '32px 0' }} />
    <h3>React 19 equivalent</h3>
    <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
      {REACT19}
    </pre>
  </div>
);

export default App;
