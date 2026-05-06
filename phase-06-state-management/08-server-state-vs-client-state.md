# Server State vs Client State

## The Fundamental Split

Most React state management discussions treat all state the same way. The insight that changed the field: **server state and client state have completely different properties and need different tools**.

**Client state** is owned by the application. It lives in memory, only the current browser session knows about it, and the application has full, immediate control over it. Examples: which modal is open, the current step in a wizard, the user's input before they've saved it, selected items in a table.

**Server state** is owned by the server. The application has a local copy that may be stale. Other users, other browser tabs, or background processes can change it at any time. The application must fetch it, cache it, keep it fresh, and handle loading/error states. Examples: the user's profile data, a list of orders, the content of a document.

---

## Why One Tool Can't Do Both Well

The operations on each type are fundamentally different:

| | Client State | Server State |
|---|---|---|
| Source of truth | Your app | Server/database |
| Staleness | Never stale — you control all changes | Can become stale at any time |
| Loading/error states | Not applicable | Always applicable |
| Persistence | Session-lifetime only | Persists on server |
| Sharing | Via state management | Via URL or cache key |
| Synchronization | Synchronous | Asynchronous (fetch, network) |
| Updates | Immediate, synchronous | Fire-and-forget → wait → confirm |

Trying to manage server state with a client state tool (like putting API responses into Redux with no cache management) means you manually build what React Query or RTK Query provide: staleness checks, background refetching, deduplication, loading states, error states, cache invalidation. You get all the complexity with none of the infrastructure.

---

## The "Redux for Everything" Anti-Pattern

The pattern that dominated 2016-2020:

```js
// Action types
const FETCH_USERS_REQUEST = 'FETCH_USERS_REQUEST';
const FETCH_USERS_SUCCESS = 'FETCH_USERS_SUCCESS';
const FETCH_USERS_FAILURE = 'FETCH_USERS_FAILURE';

// Action creators
const fetchUsers = () => async dispatch => {
  dispatch({ type: FETCH_USERS_REQUEST });
  try {
    const users = await api.getUsers();
    dispatch({ type: FETCH_USERS_SUCCESS, payload: users });
  } catch (err) {
    dispatch({ type: FETCH_USERS_FAILURE, error: err.message });
  }
};

// Reducer
function usersReducer(state = { data: null, loading: false, error: null }, action) {
  switch (action.type) {
    case FETCH_USERS_REQUEST: return { ...state, loading: true, error: null };
    case FETCH_USERS_SUCCESS: return { ...state, loading: false, data: action.payload };
    case FETCH_USERS_FAILURE: return { ...state, loading: false, error: action.error };
    default: return state;
  }
}
```

This is 30+ lines of boilerplate per endpoint. Multiply by the number of API calls in the app. And it still doesn't handle: cache invalidation, background refetching, deduplication of concurrent requests, stale-while-revalidate, optimistic updates with rollback, or garbage collection of unused cache entries.

React Query and RTK Query handle all of that. The boilerplate above collapses to:

```js
const { data, isLoading, isError } = useQuery({ queryKey: ['users'], queryFn: api.getUsers });
```

---

## What Belongs Where

**Put in client state (useState, Zustand, Redux, Context):**
- UI state: modal open/closed, active tab, sidebar collapsed
- Form state before submission (controlled inputs)
- Selection state: which rows are selected in a table
- Navigation state not in the URL
- In-progress operations: step in a multi-step wizard
- Settings/preferences stored locally
- Undo/redo history
- Drag-and-drop in-progress state

**Put in server state (React Query, RTK Query, SWR):**
- Any data that came from an API
- Data that other users or sessions can modify
- Data with a meaningful TTL (it becomes stale)
- Data that needs background refetching
- Paginated or infinite-scrolling data
- Data that should be shared between tabs

**The edge cases:**
- User preferences saved to a server? Server state while fetching, client state while editing, then mutated back to server.
- An optimistic update? Client-state lookahead layered over server state — the server state library manages it.

---

## The Architecture That Falls Out

Once you accept the split, your state architecture simplifies:

```
Server state:  React Query / RTK Query  (fetching, caching, sync)
Client state:  useState / Zustand       (UI, forms, local interactions)
URL state:     React Router params      (shareable navigation state)
```

Most apps don't need a large client state store. After moving server data out of Redux and into React Query, many teams find their Redux store shrinks by 80%. What's left is genuinely local: a few UI flags, maybe some cross-page wizard state.

---

## URL as State

A frequently underused state location: the URL. The URL is persistent, shareable, survives refreshes, and works with the browser back button. State that should live in the URL:

- Current page/route
- Search query
- Active filters
- Sort order
- Selected item ID (for navigation)
- Modal open/closed (for deep linking)

```js
// Bad: filter state in React state — not shareable, lost on refresh
const [filter, setFilter] = useState('active');

// Better: filter state in URL — shareable, survives refresh, bookmarkable
const [searchParams, setSearchParams] = useSearchParams();
const filter = searchParams.get('filter') ?? 'active';
```

If a user wants to share "the current view" with a colleague, URL state lets them — React state doesn't.

---

## Interview Questions

**Q (High): What is the difference between server state and client state? Why does it matter for library selection?**

Answer: Client state is owned by the application — it only exists in the current session, the app has full synchronous control over it, and it never becomes stale because no external system can change it. UI flags, form inputs, selection state. Server state is owned by a remote source — the application has a cached copy that may be outdated at any moment. It needs fetching, loading/error handling, staleness management, deduplication, and invalidation. These properties require fundamentally different tools: client state needs a synchronous reactive container (useState, Zustand, Redux slice), server state needs a caching layer with background refetch and invalidation semantics (React Query, RTK Query). Mixing them — storing API responses in Redux with manual thunks — means you build the caching infrastructure by hand without the library's optimizations.

---

**Q (High): A coworker stores all API responses in Redux with loading/error flags in every reducer. What would you change and why?**

Answer: Move API data to React Query or RTK Query. Server data stored in Redux with hand-written thunks doesn't handle cache invalidation, background refetching, deduplication of concurrent requests, or stale-while-revalidate — you'd need to build all of that yourself. Every new endpoint requires ~30 lines of action types, action creators, and reducer cases. React Query collapses that to a single `useQuery` call and handles all the async lifecycle automatically. What remains in Redux (or Zustand) is genuinely client-owned state: UI flags, selected items, in-progress forms. Most teams doing this migration find their Redux store shrinks dramatically.

---

**Q (Medium): Give examples of what belongs in URL state vs React state vs server state.**

Answer: URL state — filter, sort, search query, active tab when you want deep linking, selected item ID for navigation. This state should survive a page refresh and be shareable. React/client state — modal open/closed (unless you need deep linking to modals), drag-in-progress, multi-step wizard progress, controlled form input before submission. This is ephemeral and session-specific. Server state — anything fetched from an API: user data, product catalog, orders. This has a server as its source of truth, becomes stale, and needs a caching layer.

---

*Next: React Query / TanStack Query — the definitive server state management library.*
