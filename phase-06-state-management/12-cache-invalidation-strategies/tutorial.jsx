// ============================================================
// Topic:   Cache Invalidation Strategies
// Phase:   6 — State Management
//
// REQUIRES: npm install @tanstack/react-query
//
// HOW TO RUN (StackBlitz):
//   stackblitz.com/new/react  →  npm install @tanstack/react-query
//
// APPROACH:
//   Exercise 1 — invalidateQueries vs setQueryData: choose the right strategy
//   Exercise 2 — polling: background refresh that stops at a terminal state
//   Exercise 3 — simulated push (WebSocket): external event updates the cache
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  QueryClient, QueryClientProvider,
  useQuery, useMutation, useQueryClient,
} from '@tanstack/react-query';

// ─── Fake in-memory data ─────────────────────────────────────
let db = {
  articles: [
    { id: 1, title: 'Intro to React', views: 100, tags: ['react', 'basics'] },
    { id: 2, title: 'Advanced Hooks',  views: 200, tags: ['react', 'hooks']  },
    { id: 3, title: 'Redux Patterns',  views: 150, tags: ['redux']           },
  ],
  jobs: [
    { id: 'job-1', status: 'queued',     progress: 0,   result: null },
  ],
  nextArticleId: 4,
};

// Push notifications queue — Exercise 3 simulates external events
const pushEvents = [];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const articlesApi = {
  getAll:     async ()          => { await delay(400); return [...db.articles]; },
  getById:    async (id)        => { await delay(300); const a = db.articles.find(a => a.id === id); if (!a) throw new Error('Not found'); return { ...a }; },
  create:     async (a)         => { await delay(600); const n = { ...a, id: db.nextArticleId++, views: 0 }; db.articles = [...db.articles, n]; return n; },
  update:     async ({ id, ...p }) => { await delay(500); db.articles = db.articles.map(a => a.id === id ? { ...a, ...p } : a); return db.articles.find(a => a.id === id); },
  delete:     async (id)        => { await delay(400); db.articles = db.articles.filter(a => a.id !== id); return { id }; },
  incrementViews: async (id)    => { await delay(300); db.articles = db.articles.map(a => a.id === id ? { ...a, views: a.views + 1 } : a); return db.articles.find(a => a.id === id); },
};

const jobsApi = {
  getStatus: async (id) => {
    await delay(800);
    const job = db.jobs.find(j => j.id === id);
    return job ?? { id, status: 'not_found' };
  },
  startJob: async (id) => {
    await delay(200);
    db.jobs = db.jobs.map(j => j.id === id ? { ...j, status: 'running', progress: 0 } : j);
    // Simulate job progressing over time
    let progress = 0;
    const tick = setInterval(() => {
      progress += 25;
      db.jobs = db.jobs.map(j => j.id === id ? { ...j, progress, status: progress >= 100 ? 'done' : 'running', result: progress >= 100 ? 'Report generated!' : null } : j);
      if (progress >= 100) clearInterval(tick);
    }, 1500);
    return { started: true };
  },
};

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 10_000 } } });

// ─────────────────────────────────────────────────────────────
// Exercise 1 — invalidateQueries vs setQueryData
//
// Two strategies for keeping the cache in sync after a mutation:
//
//   A. invalidateQueries({ queryKey: ['articles'] })
//      → marks entries stale → triggers a refetch
//      → always correct but costs a network round trip
//
//   B. setQueryData(['articles'], updater)
//      → writes directly into the cache → no round trip
//      → only works when the mutation response contains the full updated data
//
// TODO:
//   1. useCreateArticle — use strategy A (invalidate the list)
//      The mutation returns the new article. Add it directly to the
//      list cache with setQueryData AND invalidate the list.
//      Why both? setQueryData for instant update; invalidate to
//      eventually confirm with the server.
//
//   2. useUpdateArticle — use strategy B (setQueryData only)
//      The server returns the full updated article.
//      Use setQueryData(['articles', id], updated) to update the
//      detail cache directly without a refetch.
//      Also update the list: setQueryData(['articles'], old => old.map(...))
//
//   3. useDeleteArticle — use strategy A (invalidate list)
//      You can't setQueryData a deleted item back into existence.
//
//   4. useIncrementViews — use strategy B
//      Server returns the updated article with new view count.
//      Update ['articles', id] directly.
//
// OBSERVE: Strategy B updates are instant. Strategy A updates show
//          a brief "refreshing…" indicator while refetching.
//
// CHECK YOURSELF:
//   When should you use setQueryData instead of invalidateQueries?
//   Why would you often use BOTH in the same onSuccess handler?
// ─────────────────────────────────────────────────────────────

function useArticles() {
  return useQuery({ queryKey: ['articles'], queryFn: articlesApi.getAll });
}

function useArticle(id) {
  return useQuery({
    queryKey: ['articles', id],
    queryFn: () => articlesApi.getById(id),
    enabled: !!id,
  });
}

// TODO: implement these mutation hooks with the correct strategy
function useCreateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.create,
    onSuccess: (newArticle) => {
      // Strategy: setQueryData to add immediately + invalidate to confirm
      // TODO: queryClient.setQueryData(['articles'], old => old ? [...old, newArticle] : [newArticle]);
      // TODO: queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

function useUpdateArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.update,
    onSuccess: (updated) => {
      // Strategy: setQueryData only — no refetch needed (server returned full data)
      // TODO: queryClient.setQueryData(['articles', updated.id], updated);
      // TODO: queryClient.setQueryData(['articles'], old => old?.map(a => a.id === updated.id ? updated : a));
    },
  });
}

function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.delete,
    onSuccess: (_, id) => {
      // Strategy: invalidate — can't predict what the list looks like after delete
      // TODO: queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

function useIncrementViews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: articlesApi.incrementViews,
    onSuccess: (updated) => {
      // Strategy: setQueryData — update view count in-place, no full refetch
      // TODO: update ['articles', updated.id] and the list entry
    },
  });
}

function ArticleTable() {
  const { data: articles, isLoading, isFetching } = useArticles();
  const [editId, setEditId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [createTitle, setCreateTitle] = useState('');

  const { mutate: create,    isPending: creating }    = useCreateArticle();
  const { mutate: update,    isPending: updating }    = useUpdateArticle();
  const { mutate: del,       isPending: deleting }    = useDeleteArticle();
  const { mutate: incViews }                           = useIncrementViews();

  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading…</p>;

  return (
    <div>
      <form onSubmit={e => { e.preventDefault(); if (createTitle) { create({ title: createTitle, tags: [] }); setCreateTitle(''); } }}
        style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input value={createTitle} onChange={e => setCreateTitle(e.target.value)}
          placeholder="New article title…" style={inputStyle} />
        <button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create (invalidate)'}</button>
      </form>

      {isFetching && <p style={{ fontSize: 11, color: '#6b7280' }}>↻ refreshing list…</p>}

      {(articles ?? []).map(a => (
        <div key={a.id} style={card}>
          {editId === a.id ? (
            <form onSubmit={e => { e.preventDefault(); update({ id: a.id, title: newTitle }); setEditId(null); }}
              style={{ display: 'flex', gap: 6, flex: 1 }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} style={inputStyle} autoFocus />
              <button type="submit" disabled={updating}>Save (setQueryData)</button>
              <button type="button" onClick={() => setEditId(null)}>Cancel</button>
            </form>
          ) : (
            <>
              <span style={{ flex: 1, fontSize: 13 }}>{a.title}</span>
              <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>{a.views} views</span>
              <button onClick={() => incViews(a.id)} style={{ fontSize: 11 }}>+view</button>
              <button onClick={() => { setEditId(a.id); setNewTitle(a.title); }} style={{ fontSize: 11 }}>Edit</button>
              <button onClick={() => del(a.id)} disabled={deleting} style={{ fontSize: 11, color: '#dc2626' }}>Delete</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Exercise1() {
  return (
    <QueryClientProvider client={qc}>
      <p style={hint}>
        Implement the four mutation hooks. Create uses invalidate (watch the
        list refetch). Update/IncrementViews use setQueryData (instant, no spinner).
        Delete uses invalidate. Compare the UX between the two strategies.
      </p>
      <ArticleTable />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Polling: background refresh until terminal state
//
// Some data changes independently of user actions (job status,
// prices, build pipelines). Polling refetches on an interval.
// The key is to STOP polling when a terminal condition is met.
//
// TODO:
//   1. useJobStatus(id): use useQuery with refetchInterval.
//      refetchInterval can be a function: (query) => {
//        if (query.state.data?.status === 'done') return false; // stop
//        return 2000; // poll every 2s
//      }
//
//   2. When status is 'done', refetchInterval returns false
//      and polling stops automatically.
//
//   3. Click "Start job" → watch the progress bar fill over ~6 seconds.
//      The polling query drives the progress update.
//
// CHECK YOURSELF:
//   What happens if you use a fixed refetchInterval (e.g. 2000) and
//   don't stop it when the job is done? What's the cost?
// ─────────────────────────────────────────────────────────────

function useJobStatus(id) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getStatus(id),
    // TODO: add refetchInterval that stops when status === 'done'
    // refetchInterval: (query) => query.state.data?.status === 'done' ? false : 2000,
  });
}

function JobStatusMonitor() {
  const jobId = 'job-1';
  const { data: job, isFetching } = useJobStatus(jobId);
  const qc2 = useQueryClient();

  async function startJob() {
    // Reset job state first
    db.jobs = [{ id: jobId, status: 'queued', progress: 0, result: null }];
    qc2.invalidateQueries({ queryKey: ['job', jobId] });
    await jobsApi.startJob(jobId);
  }

  const status   = job?.status ?? 'unknown';
  const progress = job?.progress ?? 0;
  const done     = status === 'done';

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <button onClick={startJob} disabled={status === 'running'}>
          {status === 'running' ? 'Running…' : 'Start Job'}
        </button>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          Status: <strong style={{ color: done ? '#15803d' : '#111' }}>{status}</strong>
          {isFetching && <span style={{ marginLeft: 6 }}>↻</span>}
        </span>
      </div>

      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, width: '100%', overflow: 'hidden' }}>
        <div style={{
          background: done ? '#22c55e' : '#3b82f6',
          height: '100%', width: `${progress}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
        {progress}% {done && `— ${job.result}`}
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
        {done
          ? '✓ Polling stopped (terminal state reached)'
          : 'Polling every 2s (implement refetchInterval to see)'}
      </div>
    </div>
  );
}

function Exercise2() {
  return (
    <QueryClientProvider client={qc}>
      <p style={hint}>
        Implement <code>refetchInterval</code> in <code>useJobStatus</code>.
        Click Start Job and watch the progress bar fill. Once "done", polling
        should stop automatically — the status stays done without more requests.
      </p>
      <JobStatusMonitor />
    </QueryClientProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Simulated push: external event updates the cache
//
// Real-time apps (chat, live dashboards) use WebSockets or
// Server-Sent Events. React Query doesn't know about sockets —
// you call setQueryData or invalidateQueries from the event handler.
//
// This exercise simulates WebSocket messages using setInterval.
// Every 3 seconds, a "server push" increments a random article's
// views by a random amount. Your job: wire up the event handler
// to update the cache when the push arrives.
//
// TODO:
//   1. Complete usePushListener() — it starts an interval that
//      calls onPushEvent(event) every 3 seconds.
//      Each event: { type: 'views_updated', articleId, newViews }
//
//   2. In onPushEvent, update the cache:
//        queryClient.setQueryData(['articles'], old =>
//          old?.map(a => a.id === event.articleId
//            ? { ...a, views: event.newViews } : a)
//        )
//        queryClient.setQueryData(['articles', event.articleId], old =>
//          old ? { ...old, views: event.newViews } : old
//        )
//
//   3. Watch the view counts update in real-time without any user action.
//      No spinner — the cache is updated directly.
//
// CHECK YOURSELF:
//   Why is setQueryData preferred over invalidateQueries for WebSocket events?
//   What happens if you use invalidateQueries instead — what's the difference?
// ─────────────────────────────────────────────────────────────

function usePushListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate a push event from the server
      const articles = queryClient.getQueryData(['articles']);
      if (!articles?.length) return;
      const target   = articles[Math.floor(Math.random() * articles.length)];
      const newViews = target.views + Math.floor(Math.random() * 10) + 1;
      const event    = { type: 'views_updated', articleId: target.id, newViews };

      // TODO: handle the event — update both the list cache and the detail cache
      console.log('Push event received:', event);
      // queryClient.setQueryData(['articles'], old => old?.map(...));
      // queryClient.setQueryData(['articles', event.articleId], old => ...);
    }, 3000);

    return () => clearInterval(interval);
  }, [queryClient]);
}

function LiveArticleTable() {
  usePushListener(); // starts the simulated push listener
  const { data: articles, isLoading } = useArticles();

  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading…</p>;

  return (
    <div>
      <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
        View counts update every ~3s via simulated push events.
        After implementing usePushListener, counts update without any spinner.
      </p>
      {(articles ?? []).map(a => (
        <div key={a.id} style={card}>
          <span style={{ flex: 1, fontSize: 13 }}>{a.title}</span>
          <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 'bold' }}>
            {a.views} views
          </span>
        </div>
      ))}
    </div>
  );
}

function Exercise3() {
  return (
    <QueryClientProvider client={qc}>
      <p style={hint}>
        Implement the push handler in <code>usePushListener</code>.
        View counts should silently update every 3 seconds — no refetch spinner,
        no loading state, just direct cache writes from the simulated push.
      </p>
      <LiveArticleTable />
    </QueryClientProvider>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Build a "smart invalidation" pattern:
//   - A post has: title, content, tags[], commentCount
//   - Editing title/content → setQueryData for the post detail
//     (server returns full updated post)
//   - Adding a comment → invalidate ['posts', id, 'comments']
//     AND update the commentCount in the post via setQueryData
//   - Deleting a tag → invalidate ['posts', id] AND the tag index
//     query ['tags', tagName, 'posts'] if it exists
//   Think: for each mutation, choose the cheapest correct strategy.
function Playground() {
  return (
    <QueryClientProvider client={qc}>
      <div style={{ color: '#888', fontStyle: 'italic', fontSize: 14 }}>
        Design "smart invalidation" for a blog post editor.
        For each mutation, choose between setQueryData vs invalidateQueries.
        Minimize network requests while maintaining correctness.
      </div>
    </QueryClientProvider>
  );
}

// ─── Shared styles ───────────────────────────────────────────
const card      = { padding: 8, border: '1px solid #d1d5db', borderRadius: 4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 };
const hint      = { margin: '0 0 8px', color: '#555', fontSize: 13 };
const h2        = { fontSize: 15, marginTop: 28, marginBottom: 6 };
const inputStyle = { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, flex: 1 };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Cache Invalidation Strategies</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
        Requires: <code>npm install @tanstack/react-query</code>
      </p>

      <h2 style={h2}>Exercise 1 — invalidateQueries vs setQueryData: choose the right tool</h2>
      <Exercise1 />

      <h2 style={h2}>Exercise 2 — Polling that stops at a terminal state</h2>
      <Exercise2 />

      <h2 style={h2}>Exercise 3 — Simulated push: external events update the cache</h2>
      <Exercise3 />

      <h2 style={h2}>Playground</h2>
      <Playground />
    </div>
  );
}
