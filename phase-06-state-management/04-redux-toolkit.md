# Redux Toolkit

## What Redux Toolkit Is

Redux Toolkit (RTK) is the official, opinionated way to write Redux. It's not a different state management system — it's Redux with the boilerplate collapsed. Everything underneath is still actions, reducers, and a store; RTK just eliminates the ceremony.

The problems it solves:
- Writing action type constants, action creators, and reducers separately
- Manually composing `applyMiddleware`, devtools, and `combineReducers`
- Writing verbose spread operators to avoid mutation in reducers
- Configuring `thunk` middleware by default

---

## configureStore

`configureStore` replaces `createStore`. It wires up Redux DevTools, includes `redux-thunk` middleware by default, and calls `combineReducers` for you:

```js
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';
import userReducer from './userSlice';

const store = configureStore({
  reducer: {
    counter: counterReducer,
    user: userReducer,
  },
  // Optional: add extra middleware
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(myCustomMiddleware),
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

`getDefaultMiddleware()` returns the built-in middleware array (thunk + serializability checker + immutability checker in dev). Concatenate onto it rather than replacing it, or you lose the defaults.

---

## createSlice

`createSlice` is the core API. You give it a name, an initial state, and a `reducers` object — it generates action creators and action types automatically:

```js
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment(state) {
      state.value += 1; // mutation is fine — Immer handles it
    },
    decrement(state) {
      state.value -= 1;
    },
    incrementByAmount(state, action) {
      state.value += action.payload;
    },
    reset() {
      return { value: 0 }; // returning a new value also works
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;
export default counterSlice.reducer;
```

`counterSlice.actions.increment()` produces `{ type: 'counter/increment' }`. The type string is `${name}/${reducerName}` automatically.

---

## Immer Under the Hood

The mutation syntax inside `createSlice` reducers is safe because RTK uses **Immer** internally. Immer wraps your state in a Proxy. When your reducer "mutates" the proxy, Immer tracks the changes and produces a new immutable state object. Your code looks like mutation; the actual state is still never mutated.

```js
// This looks like mutation but Immer makes it safe
increment(state) {
  state.value += 1;
}

// Equivalent pure Redux (what you'd have to write without RTK)
function increment(state) {
  return { ...state, value: state.value + 1 };
}
```

For deeply nested state, the difference is dramatic:

```js
// RTK (Immer)
updateUserCity(state, action) {
  state.user.address.city = action.payload;
}

// Raw Redux
function updateUserCity(state, action) {
  return {
    ...state,
    user: {
      ...state.user,
      address: {
        ...state.user.address,
        city: action.payload,
      },
    },
  };
}
```

You can also return a new value explicitly (for when you want to replace the entire slice):

```js
reset() {
  return { value: 0 }; // Immer uses this new value instead of the draft
}
```

But never do both — either mutate the draft or return a new value. Doing both throws.

---

## createAsyncThunk

`createAsyncThunk` generates the three lifecycle action types for async operations (`pending`, `fulfilled`, `rejected`) and handles the dispatch logic:

```js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk(
  'user/fetchById',
  async (userId, thunkAPI) => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      return thunkAPI.rejectWithValue({ status: response.status });
    }
    return response.json(); // returned value becomes action.payload for 'fulfilled'
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false, error: null },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message;
      });
  },
});
```

`extraReducers` handles actions defined outside the slice (like the async thunk lifecycle actions). The `builder` pattern is type-safe and preferred over the object notation.

---

## createSelector (from Reselect)

RTK re-exports `createSelector` from Reselect for memoized selectors:

```js
import { createSelector } from '@reduxjs/toolkit';

const selectCart = state => state.cart;

// Memoized: only recomputes when cart items or discount changes
const selectCartTotal = createSelector(
  selectCart,
  cart => cart.items.reduce((sum, item) => sum + item.price * item.qty, 0)
);

// In component
const total = useSelector(selectCartTotal);
```

`createSelector` takes input selectors and a result function. It caches the last result — if the inputs haven't changed (by reference), it returns the cached value. This prevents `useSelector` from triggering a re-render when the computed value would be the same.

---

## Normalized State with createEntityAdapter

For collections, `createEntityAdapter` manages a normalized `{ ids: [], entities: {} }` structure with CRUD operations built in:

```js
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';

const usersAdapter = createEntityAdapter();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState({ loading: false }),
  reducers: {
    userAdded: usersAdapter.addOne,
    usersReceived: usersAdapter.setAll,
    userUpdated: usersAdapter.updateOne,
    userRemoved: usersAdapter.removeOne,
  },
});

// Adapter generates selectors
const usersSelectors = usersAdapter.getSelectors(state => state.users);
const allUsers = useSelector(usersSelectors.selectAll);
const userById = useSelector(state => usersSelectors.selectById(state, id));
```

Normalization avoids duplicated data, makes updates O(1) by id instead of O(n) array scans, and is the standard pattern for relational data in Redux.

---

## What RTK Doesn't Change

RTK is still Redux. The mental model is identical:
- Single store
- Immutable state
- Actions describe changes
- Reducers process them
- `useSelector` and `useDispatch` for components

All the Redux tradeoffs remain: explicit over implicit, verbose for complex async flows, more structure than smaller libraries. RTK removes the boilerplate burden but doesn't change the architecture.

---

## Interview Questions

**Q (High): How does RTK's mutation syntax in reducers stay compatible with Redux's immutability requirement?**

Answer: RTK uses Immer, which wraps the state in a Proxy when your reducer function runs. Any "mutation" you perform goes to the Proxy, which records what changed. When the reducer returns, Immer uses the recorded changes to produce a new plain object — your original state is never touched. From Redux's perspective, the reducer returned a new state object, which is what it expects. From your perspective, you wrote simple imperative assignments instead of nested spread operators. You can also return a new value explicitly to replace the entire slice state, but never both mutate and return — Immer throws if you do.

---

**Q (High): Explain `createAsyncThunk`. What does it generate?**

Answer: `createAsyncThunk` takes a string action type prefix and an async payload creator function. It generates three action creators: `pending` (dispatched when the async call starts), `fulfilled` (dispatched when it resolves, with the resolved value as `payload`), and `rejected` (dispatched on error, with the error as `payload` if you used `rejectWithValue`, otherwise `error`). When you dispatch the thunk, it dispatches `pending` immediately, runs the async function, then dispatches `fulfilled` or `rejected`. You handle these in `extraReducers` using the builder pattern. This replaces the manual `REQUEST/SUCCESS/FAILURE` action type triad from raw Redux.

---

**Q (Medium): When should you use `createSelector` vs a plain inline selector in `useSelector`?**

Answer: Use `createSelector` when the selector derives new data (filtering, mapping, reducing) rather than just accessing existing data. Inline selectors that create new arrays/objects on every call (`state => state.items.filter(...)`) cause `useSelector` to re-render on every store update, because the new array reference is never equal to the previous one. `createSelector` memoizes: if the input selectors return the same values as last time, the result function doesn't run and the cached result is returned — same reference, no re-render. For simple property access (`state => state.user.name`), a plain selector is fine.

---

**Q (Medium): What is `createEntityAdapter` and what problem does it solve?**

Answer: It manages a normalized data structure — `{ ids: string[], entities: { [id]: item } }` — for collections. It provides pre-built CRUD reducer functions (`addOne`, `setAll`, `updateOne`, `removeOne`, etc.) and memoized selectors (`selectAll`, `selectById`, `selectTotal`). It solves the problem of arrays as primary data containers: finding, updating, or deleting by ID in an array is O(n) and requires array spread + findIndex. In a normalized structure, it's O(1) map access. It also prevents duplicated data when the same entity appears in multiple queries.

---

*Next: RTK Query — data fetching, caching, and invalidation built directly into Redux Toolkit.*
