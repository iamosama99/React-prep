// ============================================================
// Topic:   Optimistic Updates
// Phase:   6 — State Management
//
// REQUIRES: npm install @tanstack/react-query
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install @tanstack/react-query
//
// APPROACH: Three exercises of increasing complexity.
//   Exercise 1 — Like button: instant toggle, rollback on failure
//   Exercise 2 — Add item with temp ID (server generates real ID)
//   Exercise 3 — Concurrent mutations: the snapshot interference problem
// ============================================================

import { useState, useRef } from 'react';
import {
  QueryClient, QueryClientProvider,
  useQuery, useMutation, useQueryClient,
} from '@tanstack/react-query';

// ─── Fake in-memory API ───────────────────────────────────────
let db = {
  posts: [
    { id: 1, title: 'Learning React Query', likes: 12, likedByMe: false },
    { id: 2, title: 'Optimistic Updates',   likes: 7,  likedByMe: false },
    { id: 3, title: 'State Machines',       likes: 19, likedByMe: true  },
  ],
  nextId: 4,
};

const delay  = (ms)  => new Promise(r => setTimeout(r, ms));
let failNextLike = false; // toggle to simulate server failure

const api = {
  getPosts:   async ()     => { await delay(500); return [...db.posts]; },
  likePost:   async (id)   => {
    await delay(700);
    if (failNextLike) { failNextLike = false; throw new Error('Server rejected the like'); }
    db.posts = db.posts.map(p => p.id === id ? { ...p, likes: p.likes + (p.likedByMe ? -1 : 1), likedByMe: !p.likedByMe } : p);
    return db.posts.find(p => p.id === id);
  },
  addPost:    async (post) => {
    await delay(900);
    const newPost = { ...post, id: db.nextId++, likes: 0, likedByMe: false };
    db.posts = [...db.posts, newPost];
    return newPost;
  },
};

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } });

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Like button: instant UI update, rollback on failure
//
// The four steps of every optimistic update:
//   1. SNAPSHOT current state
//   2. APPLY predicted outcome immediately
//   3. AWAIT server response
//   4. CONFIRM (do nothing) or ROLLBACK to snapshot
//
// TODO: implement useLikePost() with the full pattern:
//   onMutate: async (id) => {
//     await qc.cancelQueries({ queryKey: ['posts'] })     // 1. cancel in-flight
//     const prev = qc.getQueryData(['posts'])              // 2. snapshot
//     qc.setQueryData(['posts'], old =>                    // 3. apply optimistic
//       old.map(p => p.id === id
//         ? { ...p, likes: p.likes + (p.likedByMe ? -1 : 1), likedByMe: !p.likedByMe }
//         : p
//       )
//     )
//     return { prev }                                      // 4. return for rollback
//   }
//   onError: (err, id, context) => {
//     qc.setQueryData(['posts'], context.prev)             // rollback
//   }
//   onSettled: () => {
//     qc.invalidateQueries({ queryKey: ['posts'] })        // sync with server
//   }
//
// VERIFY:
//   Like a post — heart updates INSTANTLY, no spinner.
//   Set failNextLike = true below, then like — it flips then rolls back.
//   Notice there's no loading indicator during the 700ms server call.
//
// CHECK YOURSELF:
//   Why do we call cancelQueries BEFORE applying the optimistic update?
//   Why do we refetch in onSettled even when the server succeeded?
// ─────────────────────────────────────────────────────────────

// Set to true to trigger the next like to fail (then it resets itself)
// failNextLike = true;  // ← uncomment to test rollback

function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.likePost,
    // TODO: implement onMutate, onError, onSettled
  });
}

function PostCard({ post }) {
  const { mutate: like } = useLikePost();

  return (
    <div style={card}>
      <span style={{ flex: 1, fontSize: 13 }}>{post.title}</span>
      <button
        onClick={() => like(post.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
          color: post.likedByMe ? '#ef4444' : '#9ca3af',
        }}
        title={post.likedByMe ? 'Unlike' : 'Like'}
      >
        ♥ {post.likes}
      </button>
    </div>
  );
}

function PostList() {
  const { data: posts, isLoading } = useQuery({ queryKey: ['posts'], queryFn: api.getPosts });
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading…</p>;
  return (
    <div>
      {(posts ?? []).map(p => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

function Exercise1() {
  return (
    <QueryClientProvider client={qc}>
      <p style={hint}>
        Implement <code>useLikePost</code> with onMutate/onError/onSettled.
        Clicking ♥ should be <em>instant</em> — no spinner, no delay visible.
        Set <code>failNextLike = true</code> at the top of this exercise to see rollback.
      </p>
      <PostList />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Add item with temp ID
//
// When adding a new post, the server generates the real ID.
// The client can't know the real ID ahead of time.
//
// Strategy: apply optimistically with a temporary ID like
//   `temp-${Date.now()}`, then on success REPLACE the temp
//   entry with the server's real response.
//
// TODO:
//   1. Implement useAddPost() with this optimistic pattern:
//      onMutate: async (newPost) => {
//        await qc.cancelQueries({ queryKey: ['posts'] })
//        const prev = qc.getQueryData(['posts'])
//        const tempId = `temp-${Date.now()}`
//        qc.setQueryData(['posts'], old => [
//          ...old,
//          { ...newPost, id: tempId, likes: 0, likedByMe: false, _pending: true }
//        ])
//        return { prev, tempId }
//      }
//      onSuccess: (savedPost, _vars, context) => {
//        // Replace the temp entry with the server's real post
//        qc.setQueryData(['posts'], old =>
//          old.map(p => p.id === context.tempId ? savedPost : p)
//        )
//      }
//      onError: (_err, _vars, context) => {
//        qc.setQueryData(['posts'], context.prev)
//      }
//      onSettled: () => {
//        qc.invalidateQueries({ queryKey: ['posts'] })
//      }
//
//   2. In AddPostForm, show the new post immediately with a
//      "pending" style (opacity 0.5, "saving…" indicator).
//      After server confirms, it becomes a real post.
//
// VERIFY:
//   Type a title and click Add — it appears instantly with a
//   grey "(saving…)" indicator. After 900ms it becomes solid.
// ─────────────────────────────────────────────────────────────

function useAddPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addPost,
    // TODO: implement onMutate (temp ID), onSuccess (swap), onError (rollback), onSettled
  });
}

function AddPostForm() {
  const [title, setTitle] = useState('');
  const { mutate: addPost } = useAddPost();

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    addPost({ title });
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="New post title…" style={inputStyle} />
      <button type="submit">Add Post</button>
    </form>
  );
}

function PostListWithPending() {
  const { data: posts, isLoading } = useQuery({ queryKey: ['posts'], queryFn: api.getPosts });
  const { mutate: like } = useLikePost();
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading…</p>;
  return (
    <div>
      {(posts ?? []).map(p => (
        <div key={p.id} style={{ ...card, opacity: p._pending ? 0.5 : 1 }}>
          <span style={{ flex: 1, fontSize: 13 }}>
            {p.title}
            {p._pending && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>saving…</span>}
          </span>
          {!p._pending && (
            <button onClick={() => like(p.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: p.likedByMe ? '#ef4444' : '#9ca3af' }}>
              ♥ {p.likes}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Exercise2() {
  return (
    <QueryClientProvider client={qc}>
      <p style={hint}>
        Implement <code>useAddPost</code>. New posts appear immediately with
        "(saving…)". After the server responds (900ms), they become solid
        with a real ID from the database.
      </p>
      <AddPostForm />
      <PostListWithPending />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Concurrent mutations: the snapshot interference problem
//
// PROBLEM: If the user likes post A, then quickly likes post B
// before post A's request returns:
//   - Mutation A's onMutate snapshots state [original]
//   - Mutation B's onMutate snapshots state [A optimistic]
//   - Mutation A's request fails → rollback to [original]
//     This overwrites mutation B's optimistic update!
//   - Mutation B's request returns → onSettled invalidates
//     But the UI briefly showed an incorrect state
//
// OBSERVE the bug:
//   1. Set SLOW_LIKES = true below (slows likes to 2s each)
//   2. Quickly like post 1, then like post 2 (before post 1 returns)
//   3. Set FAIL_FIRST_LIKE = true and watch: liking post 1 optimistically
//      updates, then liking post 2 appears correct, then post 1 fails
//      and its rollback ALSO un-likes post 2 briefly.
//
// SOLUTION: Use onSettled as the primary consistency mechanism.
//   onSettled invalidates and refetches regardless of success/failure.
//   This guarantees eventual correctness even if rollbacks interfere.
//
// TODO:
//   1. Uncomment SLOW_LIKES and FAIL_FIRST_LIKE to observe the problem.
//   2. Change onError to NOT rollback (comment it out) — observe:
//      with onSettled doing invalidation, the UI still reaches
//      the correct server state eventually without the glitch.
//   3. Write down WHY relying only on onSettled (no rollback) is safer
//      for concurrent mutations, and when rollback IS still valuable.
// ─────────────────────────────────────────────────────────────

let SLOW_LIKES       = false; // set true to slow likes to 2 seconds
let FAIL_FIRST_LIKE  = false; // set true to fail the next like
let likeCallCount    = 0;

const slowFlakyLike = async (id) => {
  likeCallCount++;
  await delay(SLOW_LIKES ? 2000 : 700);
  if (FAIL_FIRST_LIKE && likeCallCount === 1) {
    FAIL_FIRST_LIKE = false; likeCallCount = 0;
    throw new Error('First like failed (simulated)');
  }
  db.posts = db.posts.map(p => p.id === id ? { ...p, likes: p.likes + (p.likedByMe ? -1 : 1), likedByMe: !p.likedByMe } : p);
  return db.posts.find(p => p.id === id);
};

function useLikePostConcurrent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: slowFlakyLike,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const prev = queryClient.getQueryData(['posts']);
      queryClient.setQueryData(['posts'], (old = []) =>
        old.map(p => p.id === id
          ? { ...p, likes: p.likes + (p.likedByMe ? -1 : 1), likedByMe: !p.likedByMe }
          : p)
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      // TODO: try commenting this out — does the UI still reach correct state?
      queryClient.setQueryData(['posts'], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

function ConcurrentPostList() {
  const { data: posts, isLoading, isFetching } = useQuery({ queryKey: ['posts'], queryFn: api.getPosts });
  const { mutate: like } = useLikePostConcurrent();
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading…</p>;
  return (
    <div>
      {isFetching && <p style={{ fontSize: 11, color: '#6b7280' }}>↻ syncing with server…</p>}
      {(posts ?? []).map(p => (
        <div key={p.id} style={card}>
          <span style={{ flex: 1, fontSize: 13 }}>{p.title}</span>
          <button onClick={() => like(p.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: p.likedByMe ? '#ef4444' : '#9ca3af' }}>
            ♥ {p.likes}
          </button>
        </div>
      ))}
    </div>
  );
}

function Exercise3() {
  return (
    <QueryClientProvider client={qc}>
      <p style={hint}>
        Set <code>SLOW_LIKES = true</code> and quickly like multiple posts.
        Then set <code>FAIL_FIRST_LIKE = true</code> to see snapshot interference.
        Experiment with removing the rollback — observe that onSettled alone
        still achieves eventual correctness.
      </p>
      <div style={{ ...card, background: '#fffbeb', borderColor: '#fbbf24', fontSize: 12 }}>
        <strong>Flags (edit in code above):</strong><br />
        SLOW_LIKES: {String(SLOW_LIKES)} | FAIL_FIRST_LIKE: {String(FAIL_FIRST_LIKE)}
      </div>
      <ConcurrentPostList />
    </QueryClientProvider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build an optimistic reorder: a drag-and-drop (or up/down buttons)
// that reorders a list. The challenge: snapshot the ENTIRE list,
// apply the reorder immediately, and roll back the entire order
// if the server rejects it. Think about what happens with
// concurrent reorders from two browser tabs.
function Playground() {
  return (
    <QueryClientProvider client={qc}>
      <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Build optimistic reordering: up/down buttons move an item in the list
        immediately. onMutate snapshots the whole list. onError restores it.
        Think: what breaks if two reorders happen before either resolves?
      </div>
    </QueryClientProvider>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card      = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 };
const hint      = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2        = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const inputStyle = { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, flex: 1 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Optimistic Updates</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install @tanstack/react-query</code>
      </p>

      <h2 style={h2}>Exercise 1 — Like button: instant toggle, rollback on failure</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Add item with temporary ID</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Concurrent mutations: snapshot interference</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
