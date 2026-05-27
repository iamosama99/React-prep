// ============================================================
// Topic:   Typing Custom Hooks
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 08-typing-custom-hooks
//
// APPROACH:
//   Exercise 1 — Tuple return: the widening bug + two fixes (observe + fix)
//   Exercise 2 — Generic useLocalStorage<T> (build)
//   Exercise 3 — useFetch<T>: object return + discriminated union state (build)
//
// The most common mistake: returning [a, b] from a hook and having TypeScript
// widen both to a union type instead of treating them as a tuple.
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const errBox: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, color: '#dc2626', marginBottom: 8,
};
const codeTag = (color = '#334155'): React.CSSProperties => ({
  fontFamily: 'monospace', fontSize: 12, background: '#f1f5f9',
  padding: '1px 5px', borderRadius: 3, color,
});

// ─────────────────────────────────────────────────────────────
// Exercise 1 — The tuple return widening problem
//
// TypeScript infers array literals as arrays, not tuples.
//   return [on, toggle]
//   → TypeScript sees: (boolean | (() => void))[]
//   → Both elements have the union type — useless
//
// TWO FIXES:
//   Fix A: `as const` — makes TypeScript infer a readonly tuple
//   Fix B: explicit return type annotation — declares the exact tuple type
//
// OBSERVE:
//   1. The broken version: hover over `count` and `increment` — they're both
//      `number | (() => void)`. You can't use them as their real types.
//   2. Fix A (as const): hover again — count is number, increment is () => void.
//   3. Fix B (explicit type): same result, but the declared type is visible
//      in hover text (cleaner for shared hooks).
//
// CHECK YOURSELF:
//   • Without as const, what is the exact inferred return type of the broken hook?
//   • What does `readonly` on the tuple mean for the caller?
//   • When would you prefer an explicit return type over `as const`?
// ─────────────────────────────────────────────────────────────

// ── Broken — tuple widened to array ───────────────────────────────────────
function useCounterBroken(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset     = () => setCount(initial);

  // TypeScript infers: (number | (() => void))[]
  // Every destructured element gets the union type — all three are the same!
  return [count, increment, decrement, reset];
}

// ── Fix A — as const ────────────────────────────────────────────────────
function useCounterConst(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset     = () => setCount(initial);

  // `as const` → readonly [number, () => void, () => void, () => void]
  return [count, increment, decrement, reset] as const;
}

// ── Fix B — explicit return type annotation ─────────────────────────────
function useCounterTyped(initial = 0): [number, () => void, () => void, () => void] {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset     = () => setCount(initial);

  // TypeScript checks the return against the declared type
  return [count, increment, decrement, reset];
}

function Exercise1() {
  // Broken — TypeScript gives each a union type
  const brokenResult = useCounterBroken(0);
  // brokenResult[0] is number | (() => void) — can't use as number!

  // Fix A — as const
  const [countA, incrementA, decrementA, resetA] = useCounterConst(0);
  // countA is number ✓, incrementA is () => void ✓

  // Fix B — explicit return type
  const [countB, incrementB, decrementB, resetB] = useCounterTyped(0);
  // countB is number ✓ — same result, but the type is declared at the hook

  const btnStyle = (color = '#3b82f6'): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 6, border: 'none',
    background: color, color: '#fff', cursor: 'pointer', fontSize: 14,
  });

  return (
    <div>
      <p style={hint}>
        All three counters look the same at runtime. The difference is what TypeScript
        knows about the return values. Hover over <code>brokenResult[0]</code> to see
        the widened type, then hover over <code>countA</code> or <code>countB</code>.
      </p>

      <div style={errBox}>
        <strong>Broken version:</strong>{' '}
        <span style={codeTag('#dc2626')}>brokenResult[0]</span> is{' '}
        <span style={codeTag('#dc2626')}>number | (() =&gt; void)</span> — TypeScript
        can't know it's the counter. You'd have to cast to use it.
        <br />
        {/* We cast here just to render it — in real code this would be a bug */}
        <span style={{ fontSize: 12 }}>Value (cast to number to render): {brokenResult[0] as number}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...card, borderColor: '#86efac' }}>
          <strong style={{ color: '#16a34a', fontSize: 13 }}>Fix A — as const</strong>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
            Hover: <code style={codeTag()}>countA</code> is <code style={codeTag()}>number</code>
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={decrementA} style={btnStyle('#6b7280')}>−</button>
            <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{countA}</span>
            <button onClick={incrementA} style={btnStyle()}>+</button>
            <button onClick={resetA} style={{ ...btnStyle('#e5e7eb'), color: '#374151' }}>reset</button>
          </div>
        </div>

        <div style={{ ...card, borderColor: '#86efac' }}>
          <strong style={{ color: '#16a34a', fontSize: 13 }}>Fix B — explicit type</strong>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
            Hover: <code style={codeTag()}>countB</code> is <code style={codeTag()}>number</code>
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={decrementB} style={btnStyle('#6b7280')}>−</button>
            <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{countB}</span>
            <button onClick={incrementB} style={btnStyle()}>+</button>
            <button onClick={resetB} style={{ ...btnStyle('#e5e7eb'), color: '#374151' }}>reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Generic useLocalStorage<T>
//
// A hook that persists state to localStorage.
// The type parameter T lets callers bring their own type.
// TypeScript infers T from the initial value at the call site,
// or the caller can provide it explicitly.
//
// Key patterns:
//   • Generic hook: function useLocalStorage<T>(key: string, initial: T)
//   • Lazy initializer for useState: () => T (reads from storage on first render)
//   • Return type: [T, (value: T) => void] (explicit, not inferred)
//   • JSON.parse result is `unknown` — must cast to T
//
// CHECK YOURSELF:
//   • What is T when you call useLocalStorage('count', 0)?
//   • What is T when you call useLocalStorage<Theme>('theme', { dark: false })?
//   • Why does the lazy initializer (() => T) matter for localStorage reads?
// ─────────────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    // Lazy initializer — runs once on mount, not on every render
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStored(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('useLocalStorage write failed:', e);
    }
  }, [key]);

  return [stored, setValue];
  // No `as const` needed: explicit return type [T, (value: T) => void] handles it
}

type UserPrefs = {
  theme: 'light' | 'dark';
  fontSize: number;
  compact: boolean;
};

const defaultPrefs: UserPrefs = { theme: 'light', fontSize: 14, compact: false };

function Exercise2() {
  // T inferred as string from initial value
  const [name, setName] = useLocalStorage('tutorial-name', '');
  // name: string ✓

  // T explicitly provided — could also be inferred from defaultPrefs
  const [prefs, setPrefs] = useLocalStorage<UserPrefs>('tutorial-prefs', defaultPrefs);
  // prefs: UserPrefs ✓

  return (
    <div>
      <p style={hint}>
        Values persist across page refreshes — check localStorage in DevTools.
        Hover over <code>name</code> to confirm it's <code>string</code>, and
        <code> prefs</code> to confirm it's <code>UserPrefs</code>.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={card}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Name (T = string, persisted to localStorage)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name…"
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%', boxSizing: 'border-box' }}
          />
          {name && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Stored: "{name}" — reload page to verify it persists</p>}
        </div>

        <div style={card}>
          <strong style={{ fontSize: 13 }}>Preferences (T = UserPrefs)</strong>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={prefs.theme === 'dark'}
                onChange={e => setPrefs({ ...prefs, theme: e.target.checked ? 'dark' : 'light' })} />
              Dark mode
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              Font size: {prefs.fontSize}px
              <input type="range" min={10} max={24} value={prefs.fontSize}
                onChange={e => setPrefs({ ...prefs, fontSize: +e.target.value })} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={prefs.compact}
                onChange={e => setPrefs({ ...prefs, compact: e.target.checked })} />
              Compact mode
            </label>
          </div>
          <div style={{
            marginTop: 10, padding: 8, borderRadius: 6,
            background: prefs.theme === 'dark' ? '#1e293b' : '#f8fafc',
            color: prefs.theme === 'dark' ? '#e2e8f0' : '#374151',
            fontSize: prefs.fontSize, lineHeight: prefs.compact ? 1.2 : 1.6,
          }}>
            Preview text at {prefs.fontSize}px in {prefs.theme} mode{prefs.compact ? ' (compact)' : ''}.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — useFetch<T>: object return + discriminated union state
//
// A hook that fetches data and returns an object (not a tuple).
// Object returns are preferred when there are 3+ values — naming beats position.
//
// Patterns shown:
//   • Generic T for the data type
//   • Discriminated union state inside the hook (not exposed to caller)
//   • Object return: { data, loading, error, refetch }
//   • ReturnType inference: the returned shape is self-documenting
//
// CHECK YOURSELF:
//   • After `!loading && !error`, what is the type of `data`?
//   • Why return an object instead of a 4-element tuple here?
//   • When should the explicit return type be declared vs. inferred?
// ─────────────────────────────────────────────────────────────

type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// The returned shape — usable with ReturnType<typeof useFetch> at the call site
type UseFetchReturn<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

function useFetch<T>(url: string): UseFetchReturn<T> {
  const [state, setState] = useState<FetchState<T>>({ status: 'idle' });

  const fetchData = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as T;
      setState({ status: 'success', data: json });
    } catch (err) {
      setState({ status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Map internal discriminated state to a flat, convenient object for callers
  return {
    data:    state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error:   state.status === 'error' ? state.error : null,
    refetch: fetchData,
  };
}

// Demo: JSONPlaceholder API
type Post = { userId: number; id: number; title: string; body: string };
type JsonUser = { id: number; name: string; email: string; company: { name: string } };

function PostsList() {
  const { data: posts, loading, error, refetch } = useFetch<Post[]>(
    'https://jsonplaceholder.typicode.com/posts?_limit=5'
  );

  if (loading) return <p style={{ color: '#6b7280', fontSize: 13 }}>⏳ Loading posts…</p>;
  if (error)   return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>Error: {error}</p>
      <button onClick={refetch} style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 12 }}>Retry</button>
    </div>
  );

  // After the guards, TypeScript knows `posts` could still be null
  // (the hook returns null when not in success state — but we handled those above)
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
      {posts?.map(post => (
        <li key={post.id} style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 13 }}>
          <strong style={{ fontSize: 12, color: '#6b7280' }}>#{post.id}</strong>{' '}
          {post.title}
        </li>
      ))}
    </ul>
  );
}

function UserCard() {
  const { data: user, loading, error } = useFetch<JsonUser>(
    'https://jsonplaceholder.typicode.com/users/1'
  );

  if (loading) return <p style={{ color: '#6b7280', fontSize: 13 }}>⏳ Loading user…</p>;
  if (error)   return <p style={{ color: '#dc2626', fontSize: 13 }}>Error: {error}</p>;
  if (!user)   return null;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4338ca' }}>
        {user.name[0]}
      </div>
      <div>
        <strong style={{ fontSize: 14 }}>{user.name}</strong>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{user.email} · {user.company.name}</p>
      </div>
    </div>
  );
}

function Exercise3() {
  const [showPosts, setShowPosts] = useState(false);

  return (
    <div>
      <p style={hint}>
        <code>useFetch&lt;T&gt;</code> returns an object — destructure by name, not position.
        T is inferred from the explicit type parameter at the call site.
        The internal state uses a discriminated union; callers see a clean flat object.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={card}>
          <strong style={{ fontSize: 13 }}>User — T = JsonUser</strong>
          <div style={{ marginTop: 8 }}><UserCard /></div>
        </div>

        <div style={card}>
          <strong style={{ fontSize: 13 }}>Posts — T = Post[]</strong>
          <div style={{ marginTop: 6, marginBottom: 8 }}>
            <button
              onClick={() => setShowPosts(v => !v)}
              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13 }}
            >
              {showPosts ? 'Hide' : 'Show'} posts
            </button>
          </div>
          {showPosts && <PostsList />}
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Typing Custom Hooks
      </h1>

      <h2>Exercise 1 — Tuple return: the widening trap</h2>
      <Exercise1 />

      <h2>Exercise 2 — Generic useLocalStorage&lt;T&gt;</h2>
      <Exercise2 />

      <h2>Exercise 3 — useFetch&lt;T&gt;: object return</h2>
      <Exercise3 />
    </div>
  );
}
