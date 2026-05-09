# Typing useState & useReducer

## Quick Reference

| Concept | Pattern |
|---|---|
| Inferred state | `useState(0)` — TypeScript infers `number` |
| Explicit type param | `useState<User \| null>(null)` |
| Nullable init | `useState<string \| null>(null)` not `useState(null)` |
| Reducer action type | Discriminated union: `{ type: "increment" } \| { type: "set"; value: number }` |
| Dispatch type | `React.Dispatch<Action>` |
| Reducer function type | `(state: State, action: Action) => State` |

---

## useState: when TypeScript infers and when it doesn't

TypeScript infers the state type from the initial value. Pass a number, get `number`. Pass an object literal, get that object's shape. Most of the time this just works:

```typescript
const [count, setCount] = useState(0);        // number
const [name, setName] = useState("");         // string
const [open, setOpen] = useState(false);      // boolean
```

**Where inference breaks down: nullable initial state.**

```typescript
// BAD — TypeScript infers `null`, then setUser(fetchedUser) is a type error
const [user, setUser] = useState(null);

// GOOD — explicit union type
const [user, setUser] = useState<User | null>(null);
```

When the initial value doesn't contain enough information about the eventual type, provide the type parameter explicitly.

**Object state with partial initial shape:**

```typescript
type Filter = {
  query: string;
  page: number;
  sortBy: "name" | "date" | "score";
};

const [filter, setFilter] = useState<Filter>({
  query: "",
  page: 1,
  sortBy: "date",
});
```

Here inference would work because all fields are present, but the explicit `<Filter>` is good documentation and catches typos in the initial value.

---

> **Check yourself:** `useState(null)` — what type does TypeScript infer for the state variable? Why is that almost always wrong?

---

## Functional updates stay typed

The functional update form is fully typed:

```typescript
const [items, setItems] = useState<string[]>([]);

// prev is inferred as string[] — no annotation needed
setItems(prev => [...prev, "new item"]);
```

TypeScript knows `prev` is `string[]` because it matches the state type. You don't annotate the callback parameter.

---

## useReducer: the right way to model complex state

`useReducer` is where TypeScript really earns its keep. The discriminated union action type turns exhaustive action handling from a convention into a compile-time guarantee.

```typescript
type State = {
  status: "idle" | "loading" | "success" | "error";
  data: string[] | null;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: string[] }
  | { type: "FETCH_ERROR"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { status: "loading", data: null, error: null };
    case "FETCH_SUCCESS":
      return { status: "success", data: action.payload, error: null };
    case "FETCH_ERROR":
      return { status: "error", data: null, error: action.payload };
    default:
      // TypeScript narrows `action` to `never` here if all cases are handled
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, {
  status: "idle",
  data: null,
  error: null,
});
```

The `default` branch narrowing `action` to `never` is your exhaustiveness check. If you add a new action type to the union but forget a `case`, the `default` branch becomes reachable with a non-`never` type — TypeScript errors. This is the same pattern as exhaustive switch in Redux Toolkit slices.

---

> **Check yourself:** What happens at the `default` branch of a reducer `switch` if you have covered all action types in the discriminated union? What does TypeScript tell you?

---

## Discriminated union state

For state that has fundamentally different shapes depending on status, a discriminated union is cleaner than a flat object with nullable fields:

```typescript
// FLAT — nullable fields obscure which combinations are valid
type State = {
  status: "idle" | "loading" | "success" | "error";
  data: User[] | null;
  error: Error | null;
};

// DISCRIMINATED — each status carries exactly the fields it needs
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User[] }
  | { status: "error"; error: Error };
```

With the discriminated version, after checking `state.status === "success"`, TypeScript narrows the type so that `state.data` is `User[]` — no nullability assertion needed.

```typescript
function UserList({ state }: { state: State }) {
  if (state.status === "loading") return <Spinner />;
  if (state.status === "error") return <ErrorMsg message={state.error.message} />;
  if (state.status === "success") return <List items={state.data} />;  // state.data is User[]
  return null;
}
```

---

## Passing dispatch as a prop

When you need to pass `dispatch` to a child component, the type is `React.Dispatch<Action>`:

```typescript
type Action =
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "reset"; value: number };

type ControlsProps = {
  dispatch: React.Dispatch<Action>;
};

function Controls({ dispatch }: ControlsProps) {
  return (
    <>
      <button onClick={() => dispatch({ type: "increment" })}>+</button>
      <button onClick={() => dispatch({ type: "decrement" })}>-</button>
    </>
  );
}
```

`React.Dispatch<Action>` is just `(action: Action) => void`. TypeScript ensures you can only call it with valid action shapes.

---

> **Check yourself:** You have `useReducer` with three action types. You add a fourth action type but forget to add a `case` in the switch. How does TypeScript alert you, and where?

---

## Gotchas

**`useState<T>(undefined)` vs `useState<T | undefined>(undefined)`.** Both let you set undefined, but the former makes `undefined` invisible to TypeScript — it still types the state as `T` while letting it be set to `undefined`. Use `useState<T | undefined>(undefined)` to be honest.

**Lazy initializer is typed too.** The function passed to `useState` must return the state type:

```typescript
const [data, setData] = useState<Record<string, number>>(() => {
  const saved = localStorage.getItem("data");
  return saved ? JSON.parse(saved) : {};
});
```

**Reducer outside the component.** Define the reducer function outside the component body. TypeScript can fully check the reducer in isolation, and you can test it as a pure function without rendering anything.

---

## Interview Q&A

**Q: When do you need to provide an explicit type parameter to `useState`? (High)**

When the initial value doesn't fully represent the possible state. The most common case: `useState(null)` gives you `null` state forever — you need `useState<User | null>(null)` to tell TypeScript the state can become a `User`. The general rule: if the state type is a union and the initial value is only one member of that union, provide the type parameter.

---

**Q: How do you type the actions for useReducer? (High)**

A discriminated union where each member has a literal `type` field: `{ type: "INCREMENT" } | { type: "SET_VALUE"; payload: number }`. In the switch statement, TypeScript narrows the `action` type to the matching union member for each `case`, giving you type-safe access to the payload. The `default` branch narrows to `never` if all cases are covered — that's your exhaustiveness guarantee.

---

**Q: What's the advantage of discriminated union state over a flat state object? (Medium)**

In a flat object, nullable fields (`data: User[] | null`, `error: Error | null`) are independent — TypeScript doesn't know that `data` is non-null exactly when `status === "success"`. With a discriminated union, each status variant carries exactly the fields it needs. After narrowing on `status`, TypeScript knows exactly which fields are available without null checks.

---

**Q: How do you type `dispatch` when passing it to a child component? (Medium)**

`React.Dispatch<Action>` where `Action` is the discriminated union type. This is equivalent to `(action: Action) => void`. The child can only call dispatch with valid action shapes — TypeScript errors if the action type string or payload doesn't match the union.

---

**Q: What's the `never` narrowing at a reducer's default branch? (Low)**

If every member of the action discriminated union has a matching `case`, the `default` branch becomes unreachable. TypeScript narrows `action` to `never` there, meaning "no value can reach this point." If you add a new action type without a corresponding `case`, the default becomes reachable with that new type — TypeScript errors at the `return state` inside `default` because you're treating a non-`never` value as handled.

---

## Self-Assessment

- [ ] I know when TypeScript infers `useState` state correctly vs. when I need an explicit type param
- [ ] I can write a typed `useReducer` with a discriminated union action type
- [ ] I understand the `never` exhaustiveness check at the `default` branch
- [ ] I can model async-fetching state as a discriminated union instead of a flat object
- [ ] I can type `dispatch` when passing it to a child component
- [ ] I can use the lazy initializer form of `useState` with proper types
