# Generic Components

## Quick Reference

| Concept | Example |
|---|---|
| Generic component syntax | `function Select<T>(props: SelectProps<T>) {}` |
| TSX file ambiguity fix | `<T,>` — trailing comma prevents parser confusion with JSX |
| Generic props interface | `interface Props<T> { items: T[]; value: T; onChange: (v: T) => void }` |
| Constraint on T | `<T extends object>`, `<T extends { id: string }>` |
| Inferred T at call site | Caller passes `items={users}` — T infers as `User` |

---

## Why generic components exist

Most TypeScript components work on concrete types: a `UserCard` takes a `User`, done. But some components are structural — their logic is about rendering a list, managing selection, or coordinating layout, not about the domain type of the data. For these, generic components let callers bring their own type while TypeScript checks the consistency between props.

A non-generic select:

```typescript
type SelectProps = {
  items: string[];
  value: string;
  onChange: (value: string) => void;
};
```

This works until you need to select objects instead of strings. You either duplicate the component or lose type safety by widening to `unknown[]`. The generic version handles both:

```typescript
interface SelectProps<T> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;
}

function Select<T>(props: SelectProps<T>) {
  const { items, value, onChange, getLabel, getKey } = props;
  return (
    <select
      value={getKey(value)}
      onChange={(e) => {
        const selected = items.find(item => getKey(item) === e.target.value);
        if (selected !== undefined) onChange(selected);
      }}
    >
      {items.map(item => (
        <option key={getKey(item)} value={getKey(item)}>
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}
```

At the call site, TypeScript infers `T` from `items`:

```typescript
// T inferred as User — all other props must match User
<Select
  items={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getLabel={(u) => u.name}
  getKey={(u) => u.id}
/>
```

If `value` is typed as `string` but `items` is `User[]`, TypeScript errors — the inference catches the mismatch.

---

> **Check yourself:** In the `Select<T>` example, what does TypeScript infer for `T` when you pass `items={[1, 2, 3]}`? What would happen if you also passed `value="hello"` in the same call?

---

## The trailing comma in TSX files

In `.tsx` files, `<T>` is ambiguous — the parser might think it's a JSX opening tag. Solutions:

```typescript
// Option 1: trailing comma (most common)
function identity<T,>(value: T): T {
  return value;
}

// Option 2: extends constraint (doubles as a lint-level constraint)
function identity<T extends unknown>(value: T): T {
  return value;
}

// Option 3: rename to avoid the ambiguity (fine but less idiomatic)
function identity<TValue>(value: TValue): TValue {
  return value;
}
```

Trailing comma is the community standard for generic components in `.tsx` files. It's pure syntax disambiguation — it doesn't change the type at all.

---

## Constraining T

Sometimes T must have a specific shape to make the component's logic work. Add an `extends` constraint:

```typescript
interface ListProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T extends { id: string }>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

The `extends { id: string }` means TypeScript requires any `T` passed to this component to have an `id: string` property. You can use `item.id` safely inside the component, and callers get an error if they pass items without `id`.

---

## Table component: a complete generic example

```typescript
type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

interface TableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
}

function Table<T extends { id: string | number }>({ data, columns }: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            {columns.map(col => (
              <td key={String(col.key)}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Usage — TypeScript checks that column keys exist on the row type:

```typescript
<Table
  data={users}
  columns={[
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "createdAt",
      header: "Joined",
      render: (v) => new Date(v as string).toLocaleDateString(),
    },
  ]}
/>
```

Passing `key: "nonExistentField"` is a TypeScript error because `keyof User` doesn't include it.

---

> **Check yourself:** If you add a `defaultValue?: T` prop to `SelectProps<T>`, what type does TypeScript infer for `defaultValue` when `T` is `User`?

---

## Generic components with forwardRef

The combination of generics and `forwardRef` is awkward — `forwardRef` doesn't thread generics. The workaround:

```typescript
type ListRef = {
  scrollToTop: () => void;
};

interface ListProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

// forwardRef with generics — use a function cast
function ListInner<T extends { id: string }>(
  { items, renderItem }: ListProps<T>,
  ref: React.ForwardedRef<ListRef>
) {
  const containerRef = React.useRef<HTMLUListElement>(null);

  React.useImperativeHandle(ref, () => ({
    scrollToTop: () => containerRef.current?.scrollTo(0, 0),
  }));

  return (
    <ul ref={containerRef}>
      {items.map(item => <li key={item.id}>{renderItem(item)}</li>)}
    </ul>
  );
}

// Cast because React.forwardRef loses the generic
const List = React.forwardRef(ListInner) as <T extends { id: string }>(
  props: ListProps<T> & { ref?: React.ForwardedRef<ListRef> }
) => React.ReactElement;
```

The cast is unavoidable — `React.forwardRef`'s overloads don't pass generics through. Most teams accept this as a known TypeScript limitation and document the cast.

---

> **Check yourself:** Why does TypeScript need the trailing comma in `<T,>` inside a `.tsx` file? What does the parser think it sees without it?

---

## Gotchas

**Don't overuse generics.** A component that renders a list of strings doesn't need `<T>`. Add generics when the type parameter genuinely flows through multiple props and callers need TypeScript to check their consistency.

**Inference can fail.** If TypeScript can't infer `T` from any of the props you pass, you'll get an `unknown` type or an error. Make sure at least one prop lets TypeScript infer `T` — usually the primary data prop (`items`, `value`, `data`).

**`keyof T` in column/cell components.** Using `keyof T` for column keys is powerful but can create complex nested generic types. If the component starts requiring four or five type parameters, consider whether a simpler non-generic API with a `renderCell` function is clearer.

---

## Interview Q&A

**Q: How do you write a generic component in TypeScript? (High)**

Define the type parameter on the function with `<T,>` (trailing comma in `.tsx` to avoid JSX parser ambiguity), then use `T` in the props interface. TypeScript infers `T` at the call site from the props passed — typically the primary data prop. Add an `extends` constraint when the component's internal logic requires a specific shape.

---

**Q: Why do you need a trailing comma in `<T,>` in a `.tsx` file? (High)**

Without the trailing comma, `<T>` is ambiguous — the TSX parser might interpret it as a JSX opening tag rather than a generic type parameter. The comma makes the parser context unambiguous. It has no effect on the type — it's purely a syntax disambiguation.

---

**Q: How do you constrain a generic type parameter in a component? (Medium)**

Use `extends`: `function Foo<T extends { id: string }>(...)`. This means any `T` must satisfy that shape. TypeScript checks this at the call site and allows safe access to constrained properties inside the component.

---

**Q: How does TypeScript infer `T` at the call site? (Medium)**

From the props — TypeScript looks at the actual values passed for props typed as `T` (like `items: T[]`) and infers `T` from those. If you pass `items={users}` and `users` is `User[]`, TypeScript infers `T = User` and then checks that all other `T`-typed props (like `value`) are also `User`.

---

**Q: What's the problem with using `forwardRef` on a generic component? (Low)**

`React.forwardRef`'s type signatures don't propagate generic type parameters. The result of calling `forwardRef(genericFunction)` loses the generic. The workaround is a type cast on the resulting component: `as <T extends ...>(props: ...) => ReactElement`. This is a known TypeScript limitation, not a bug in your code.

---

## Self-Assessment

- [ ] I can write a generic functional component with a proper `<T,>` type parameter
- [ ] I know why the trailing comma is needed in `.tsx` files and can explain it
- [ ] I can add an `extends` constraint to require a specific shape on `T`
- [ ] I can implement the canonical `Select<T>` or `Table<T>` generic component pattern
- [ ] I understand how TypeScript infers `T` at the call site
- [ ] I know the `forwardRef` + generics workaround and why it's necessary
