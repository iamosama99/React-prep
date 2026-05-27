// ============================================================
// Topic:   RTK Query
// Phase:   6 — State Management
//
// REQUIRES: npm install @reduxjs/toolkit react-redux
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install @reduxjs/toolkit react-redux
//
// NOTE: RTK Query normally hits a real API. These exercises use
// a local mock server (fakeDb below) so everything runs without
// a backend. The fetch logic is identical to production use.
// ============================================================

import { useState } from 'react';
import {
  createApi, fetchBaseQuery, configureStore
} from '@reduxjs/toolkit/query/react';
import { Provider } from 'react-redux';

// ─── Fake in-memory database ─────────────────────────────────
// Simulates real network responses with latency.
// Mutations update this object so subsequent queries see changes.
let fakeDb = {
  posts: [
    { id: 1, title: 'RTK Query basics', body: 'Queries and mutations explained.', authorId: 1 },
    { id: 2, title: 'Cache invalidation',  body: 'providesTags and invalidatesTags.', authorId: 2 },
    { id: 3, title: 'Optimistic updates', body: 'How to predict before server confirms.', authorId: 1 },
  ],
  nextId: 4,
};

// Wraps any operation in simulated network latency
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Custom baseQuery that reads from fakeDb instead of a real URL
const fakeBaseQuery = () => async ({ url, method = 'GET', body }) => {
  await delay(600);

  if (url === '/posts' && method === 'GET') {
    return { data: [...fakeDb.posts] };
  }
  if (url.match(/^\/posts\/(\d+)$/) && method === 'GET') {
    const id = Number(url.split('/').pop());
    const post = fakeDb.posts.find(p => p.id === id);
    return post ? { data: post } : { error: { status: 404, error: 'Not found' } };
  }
  if (url === '/posts' && method === 'POST') {
    const newPost = { ...body, id: fakeDb.nextId++ };
    fakeDb.posts = [...fakeDb.posts, newPost];
    return { data: newPost };
  }
  if (url.match(/^\/posts\/(\d+)$/) && method === 'PATCH') {
    const id = Number(url.split('/').pop());
    fakeDb.posts = fakeDb.posts.map(p => p.id === id ? { ...p, ...body } : p);
    const updated = fakeDb.posts.find(p => p.id === id);
    return updated ? { data: updated } : { error: { status: 404, error: 'Not found' } };
  }
  if (url.match(/^\/posts\/(\d+)$/) && method === 'DELETE') {
    const id = Number(url.split('/').pop());
    fakeDb.posts = fakeDb.posts.filter(p => p.id !== id);
    return { data: { id } };
  }
  return { error: { status: 400, error: `Unknown route: ${method} ${url}` } };
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — createApi: define endpoints and use query hooks
//
// TODO:
//   1. Define postsApi using createApi with the fakeBaseQuery.
//      Set reducerPath: 'postsApi' and tagTypes: ['Post'].
//
//   2. Add two query endpoints:
//      - getPosts:    GET /posts
//        providesTags: ['Post']
//      - getPostById: GET /posts/:id  (arg = post id)
//        providesTags: (result, error, id) => [{ type: 'Post', id }]
//
//   3. Export the hooks (useGetPostsQuery, useGetPostByIdQuery).
//
//   4. Create the store (configureStore) with postsApi.reducer and
//      postsApi.middleware.
//
//   5. In PostList: use useGetPostsQuery(). Show isLoading spinner,
//      isError message, and the list on success.
//      Observe: how many network requests fire when TWO components
//      use the same query simultaneously?
//
// CHECK YOURSELF:
//   What is the difference between isLoading and isFetching?
//   Demonstrate the difference in the UI (hint: navigate away and back).
// ─────────────────────────────────────────────────────────────

// TODO: define postsApi
// export const postsApi = createApi({
//   reducerPath: 'postsApi',
//   baseQuery: fakeBaseQuery(),
//   tagTypes: ['Post'],
//   endpoints: (builder) => ({
//     getPosts: builder.query({ ... }),
//     getPostById: builder.query({ ... }),
//   }),
// });
//
// export const { useGetPostsQuery, useGetPostByIdQuery } = postsApi;

// Placeholder — replace with the real postsApi hooks above
const useGetPostsQuery = () => ({ data: null, isLoading: false, isFetching: false, isError: false, error: null });
const useGetPostByIdQuery = (_id, _opts) => ({ data: null, isLoading: false });

// TODO: create store
// export const store = configureStore({
//   reducer: { [postsApi.reducerPath]: postsApi.reducer },
//   middleware: (get) => get().concat(postsApi.middleware),
// });
const store = configureStore({ reducer: { _placeholder: () => null } });

function PostList() {
  const [selectedId, setSelectedId] = useState(null);
  const { data: posts, isLoading, isFetching, isError, error } = useGetPostsQuery();

  if (isLoading) return <p style={{ color: '#6b7280' }}>⏳ Loading posts…</p>;
  if (isError)   return <p style={{ color: '#dc2626' }}>Error: {error?.error ?? 'unknown'}</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>Posts</strong>
        {isFetching && <span style={{ fontSize: 11, color: '#6b7280' }}>(refreshing in background…)</span>}
      </div>
      <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
        {(posts ?? []).map(post => (
          <li key={post.id}
            onClick={() => setSelectedId(post.id === selectedId ? null : post.id)}
            style={{ ...postRow, background: post.id === selectedId ? '#eff6ff' : 'white' }}
          >
            <strong>{post.title}</strong>
            {post.id === selectedId && <PostDetail id={post.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Uses getPostById — demonstrates deduplication: clicking a post
// that was already in the list doesn't fire a new network request.
function PostDetail({ id }) {
  const { data: post, isLoading } = useGetPostByIdQuery(id);
  if (isLoading) return <p style={{ color: '#6b7280', fontSize: 12 }}>Loading detail…</p>;
  return <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>{post?.body}</p>;
}

function Exercise1() {
  return (
    <Provider store={store}>
      <p style={hint}>
        Define postsApi with getPosts and getPostById. Click a post row
        to expand its detail. Open the Network tab — clicking the same
        post twice should NOT fire a second request (deduplication).
      </p>
      <PostList />
    </Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Mutations + tag-based cache invalidation
//
// TODO (extend postsApi from Exercise 1):
//   1. Add createPost mutation:
//        POST /posts
//        invalidatesTags: [{ type: 'Post', id: 'LIST' }]
//
//   2. Add deletePost mutation:
//        DELETE /posts/:id
//        invalidatesTags: (result, error, id) => [{ type: 'Post', id }]
//
//   3. Update getPosts to providesTags with both the LIST sentinel
//      AND individual item tags:
//        providesTags: (result) =>
//          result
//            ? [...result.map(({ id }) => ({ type: 'Post', id })),
//               { type: 'Post', id: 'LIST' }]
//            : [{ type: 'Post', id: 'LIST' }]
//
//   4. In CreatePostForm: use useCreatePostMutation().
//      After a successful create, observe the post list auto-refetch.
//
//   5. In PostList: add a delete button per item. Use useDeletePostMutation().
//      After delete, observe only that item's cache entry is invalidated
//      — NOT the whole list.
//
// CHECK YOURSELF:
//   Why does createPost use { type: 'Post', id: 'LIST' } but
//   deletePost uses { type: 'Post', id } (the specific id)?
//   What would happen if deletePost also invalidated 'LIST'?
// ─────────────────────────────────────────────────────────────

// TODO: add createPost and deletePost to postsApi
// export const { ..., useCreatePostMutation, useDeletePostMutation } = postsApi;

// Placeholder
const useCreatePostMutation = () => [async () => {}, { isLoading: false }];
const useDeletePostMutation = () => [async () => {}, { isLoading: false }];

function CreatePostForm() {
  const [title, setTitle] = useState('');
  const [body,  setBody]  = useState('');
  const [createPost, { isLoading }] = useCreatePostMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      // TODO: await createPost({ title, body, authorId: 1 }).unwrap()
      await createPost({ title, body, authorId: 1 });
      setTitle(''); setBody('');
    } catch (err) {
      console.error('Create failed:', err);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Post title" style={inputStyle} />
        <input value={body}  onChange={e => setBody(e.target.value)}
          placeholder="Post body" style={inputStyle} />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating…' : 'Create Post'}
        </button>
      </div>
      <span style={{ fontSize: 11, color: '#6b7280' }}>
        After creating, the post list should automatically refresh.
      </span>
    </form>
  );
}

function Exercise2() {
  return (
    <Provider store={store}>
      <p style={hint}>
        Add createPost and deletePost mutations with correct invalidatesTags.
        Creating a post should refetch the list. Deleting should only
        invalidate that specific post's cache entry.
      </p>
      <CreatePostForm />
      <PostList />
    </Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Optimistic updates with onQueryStarted
//
// TODO (extend postsApi from Exercise 2):
//   1. Add updatePost mutation:
//        PATCH /posts/:id  with { id, ...patch }
//
//   2. Implement onQueryStarted for optimistic update:
//        a. dispatch(postsApi.util.updateQueryData('getPostById', id, draft => {
//             Object.assign(draft, patch);
//           }))
//        b. Also update the list cache:
//           postsApi.util.updateQueryData('getPosts', undefined, draft => {
//             const item = draft.find(p => p.id === id);
//             if (item) Object.assign(item, patch);
//           })
//        c. await queryFulfilled — if it throws, call patchResult.undo()
//
//   3. In InlineEditor: click "Edit" to reveal an inline form.
//      Submitting should update the title immediately (optimistic)
//      without any loading spinner — the UI feels instant.
//      If the server fails (simulate by breaking the API call),
//      the title should snap back.
//
// CHECK YOURSELF:
//   Why does onQueryStarted also update the 'getPosts' cache?
//   What happens if you only update 'getPostById' and the list is
//   still open showing the old title?
// ─────────────────────────────────────────────────────────────

// TODO: add updatePost to postsApi with onQueryStarted
// export const { ..., useUpdatePostMutation } = postsApi;

const useUpdatePostMutation = () => [async () => {}, { isLoading: false }];

function InlineEditor({ post }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [updatePost, { isLoading }] = useUpdatePostMutation();

  async function handleSave() {
    try {
      // TODO: await updatePost({ id: post.id, title }).unwrap()
      await updatePost({ id: post.id, title });
      setEditing(false);
    } catch {
      // Rollback already handled by onQueryStarted's patchResult.undo()
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          style={{ ...inputStyle, width: 200 }} autoFocus />
        <button onClick={handleSave} disabled={isLoading}>Save</button>
        <button onClick={() => setEditing(false)}>Cancel</button>
      </span>
    );
  }

  return (
    <span>
      {post.title}
      <button onClick={() => setEditing(true)} style={{ marginLeft: 8, fontSize: 11 }}>Edit</button>
    </span>
  );
}

function OptimisticPostList() {
  const { data: posts, isLoading } = useGetPostsQuery();
  if (isLoading) return <p>Loading…</p>;
  return (
    <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
      {(posts ?? []).map(post => (
        <li key={post.id} style={postRow}>
          <InlineEditor post={post} />
        </li>
      ))}
    </ul>
  );
}

function Exercise3() {
  return (
    <Provider store={store}>
      <p style={hint}>
        Implement the <code>updatePost</code> mutation with optimistic update.
        Clicking "Edit" → typing → "Save" should update the title
        <em> instantly</em> — no spinner, no delay visible to the user.
      </p>
      <OptimisticPostList />
    </Provider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Add a usersApi alongside postsApi. Add a getUsers endpoint.
// Extend the posts to show author names by joining posts with users.
// Then: add a deleteUser mutation that also invalidates Post tags
// (because deleting a user should refresh the posts that reference them).
function Playground() {
  return (
    <Provider store={store}>
      <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Build a usersApi with getUsers. Extend each post to show an author
        name. Add a deleteUser mutation that invalidates both User and Post tags.
      </div>
    </Provider>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const hint      = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2        = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const postRow   = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 4, marginBottom: 4, cursor: 'pointer', fontSize: 14 };
const inputStyle = { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 620 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>RTK Query</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install @reduxjs/toolkit react-redux</code>
      </p>

      <h2 style={h2}>Exercise 1 — createApi + query hooks + deduplication</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Mutations + tag-based cache invalidation</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Optimistic update with onQueryStarted rollback</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
