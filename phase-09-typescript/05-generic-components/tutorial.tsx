// ============================================================
// Topic:   Generic Components
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 05-generic-components
//
// APPROACH:
//   Exercise 1 — Select<T>: the canonical generic dropdown (build)
//   Exercise 2 — List<T extends { id: string }>: constrained generics (build)
//   Exercise 3 — Table<T>: keyof T for type-safe columns (build)
//
// The trailing comma in <T,> is REQUIRED in .tsx files.
// Without it, the parser sees a JSX opening tag, not a type parameter.
// ============================================================

import React, { useState } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};

// ─────────────────────────────────────────────────────────────
// Exercise 1 — Select<T>: the canonical generic dropdown
//
// A non-generic Select only works for one type.
// The generic version works for strings, numbers, objects — anything.
// TypeScript checks that value and items have the same type T,
// and that getLabel/getKey return the right thing for T.
//
// The trailing comma in function Select<T,> is purely syntactic —
// it disambiguates from JSX in .tsx files. No effect on the type.
//
// OBSERVE:
//   1. Pass items={numbers} and value={selectedNumber} — T infers as number.
//   2. Pass items={users} and value={selectedUser} — T infers as User.
//   3. Try passing value={selectedNumber} when items is users — TypeScript errors.
//
// CHECK YOURSELF:
//   • What does TypeScript infer for T when you pass items={['a','b','c']}?
//   • Why does getKey need to return a string even when T is a number?
//   • Why can't React.FC<Props> be used for generic components?
// ─────────────────────────────────────────────────────────────

interface SelectProps<T> {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (item: T) => string;
  getKey: (item: T) => string;  // must return string for <option key> and value matching
  placeholder?: string;
}

// <T,> — the trailing comma is essential in .tsx files
function Select<T,>({ items, value, onChange, getLabel, getKey, placeholder }: SelectProps<T>) {
  const currentKey = getKey(value);

  return (
    <select
      value={currentKey}
      onChange={(e) => {
        const found = items.find(item => getKey(item) === e.target.value);
        if (found !== undefined) onChange(found);
      }}
      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%' }}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {items.map(item => (
        <option key={getKey(item)} value={getKey(item)}>
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}

// ─── Demo data ───────────────────────────────────────────────
type Language = { code: string; name: string; paradigm: string };
type Priority  = { level: number; label: string; color: string };

const languages: Language[] = [
  { code: 'ts', name: 'TypeScript', paradigm: 'Multi-paradigm' },
  { code: 'rs', name: 'Rust',       paradigm: 'Systems'        },
  { code: 'py', name: 'Python',     paradigm: 'Multi-paradigm' },
  { code: 'go', name: 'Go',         paradigm: 'Concurrent'     },
];

const priorities: Priority[] = [
  { level: 1, label: 'Low',      color: '#6b7280' },
  { level: 2, label: 'Medium',   color: '#f59e0b' },
  { level: 3, label: 'High',     color: '#ef4444' },
  { level: 4, label: 'Critical', color: '#7c3aed' },
];

function Exercise1() {
  const [lang, setLang]   = useState<Language>(languages[0]);
  const [prio, setPrio]   = useState<Priority>(priorities[1]);

  return (
    <div>
      <p style={hint}>
        One <code>Select&lt;T&gt;</code> component works for both <em>Language</em> and{' '}
        <em>Priority</em> objects. TypeScript infers T separately for each usage —
        try passing the wrong value type and watch it error.
      </p>

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={card}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Language — T inferred as <code>Language</code>
          </label>
          {/* TypeScript infers T = Language from items={languages} */}
          <Select
            items={languages}
            value={lang}
            onChange={setLang}
            getLabel={l => l.name}
            getKey={l => l.code}
          />
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, marginBottom: 0 }}>
            Selected: <strong>{lang.name}</strong> — {lang.paradigm}
          </p>
        </div>

        <div style={card}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Priority — T inferred as <code>Priority</code>
          </label>
          {/* TypeScript infers T = Priority — getLabel and getKey must accept Priority */}
          <Select
            items={priorities}
            value={prio}
            onChange={setPrio}
            getLabel={p => p.label}
            getKey={p => String(p.level)}   // T is Priority — p.level is number
          />
          <p style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
            Selected: <span style={{ color: prio.color, fontWeight: 700 }}>{prio.label}</span>
          </p>
        </div>

        {/* This would be a TypeScript error — value and items types don't match:
        <Select
          items={languages}
          value={prio}   ← Type 'Priority' is not assignable to type 'Language'
          onChange={setPrio}
          getLabel={l => l.name}
          getKey={l => l.code}
        /> */}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — List<T extends { id: string }>: constrained generics
//
// A generic list that:
//   • Uses item.id as the React key (requires the id constraint)
//   • Accepts a renderItem callback for custom rendering
//   • Has an optional onSelect callback
//
// The `extends { id: string }` constraint:
//   • Lets the component use item.id safely inside its implementation
//   • Forces callers to pass data that has an id field
//   • TypeScript checks this at the call site
//
// CHECK YOURSELF:
//   • What error would you get if you passed an array without `id` fields?
//   • Can T be a type that has id plus extra fields? Try it.
//   • What would the type of `item` be inside renderItem for each usage below?
// ─────────────────────────────────────────────────────────────

interface ListProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onSelect?: (item: T) => void;
  emptyMessage?: string;
}

function List<T extends { id: string }>({
  items,
  renderItem,
  onSelect,
  emptyMessage = 'Nothing here.',
}: ListProps<T>) {
  if (items.length === 0) {
    return <p style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>{emptyMessage}</p>;
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
      {items.map((item, index) => (
        // item.id is safe — T extends { id: string }
        <li
          key={item.id}
          onClick={() => onSelect?.(item)}
          style={{ cursor: onSelect ? 'pointer' : 'default' }}
        >
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

type Repo = { id: string; name: string; stars: number; lang: string };
type TodoItem = { id: string; text: string; done: boolean };

const repos: Repo[] = [
  { id: '1', name: 'react',      stars: 220000, lang: 'JavaScript' },
  { id: '2', name: 'typescript', stars: 98000,  lang: 'TypeScript' },
  { id: '3', name: 'vite',       stars: 64000,  lang: 'TypeScript' },
];

const todos: TodoItem[] = [
  { id: 't1', text: 'Type the List component', done: true  },
  { id: 't2', text: 'Add an extends constraint', done: true  },
  { id: 't3', text: 'Use keyof T in a Table',   done: false },
];

function Exercise2() {
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  return (
    <div>
      <p style={hint}>
        Same <code>List&lt;T&gt;</code> component renders both repos and todos.
        The <code>extends &#123; id: string &#125;</code> constraint lets the
        component use <code>item.id</code> as a key without any type assertion.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <strong style={{ fontSize: 13 }}>Repos — T = Repo</strong>
          <div style={{ marginTop: 8 }}>
            <List
              items={repos}
              onSelect={setSelectedRepo}
              renderItem={(repo) => (
                // `repo` is narrowed to Repo here — repo.stars is number
                <div style={{ padding: '6px 8px', borderRadius: 6, background: selectedRepo?.id === repo.id ? '#eff6ff' : '#f8fafc', fontSize: 13 }}>
                  <strong>{repo.name}</strong>
                  <span style={{ float: 'right', color: '#6b7280' }}>⭐ {(repo.stars / 1000).toFixed(0)}k</span>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>{repo.lang}</div>
                </div>
              )}
            />
          </div>
          {selectedRepo && (
            <p style={{ fontSize: 12, marginTop: 6, marginBottom: 0, color: '#1e40af' }}>
              Selected: {selectedRepo.name}
            </p>
          )}
        </div>

        <div style={card}>
          <strong style={{ fontSize: 13 }}>Todos — T = TodoItem</strong>
          <div style={{ marginTop: 8 }}>
            <List
              items={todos}
              emptyMessage="All done!"
              renderItem={(todo) => (
                // `todo` is narrowed to TodoItem — todo.done is boolean
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 13 }}>
                  <span>{todo.done ? '✅' : '⬜'}</span>
                  <span style={{ textDecoration: todo.done ? 'line-through' : 'none', color: todo.done ? '#9ca3af' : '#111' }}>
                    {todo.text}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </div>

      {/* This would be a TypeScript error — no id field:
      <List
        items={[{ name: 'Alice' }, { name: 'Bob' }]}  ← missing id
        renderItem={(item) => <span>{item.name}</span>}
      /> */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — Table<T>: keyof T for type-safe columns
//
// A data table where:
//   • Column keys are typed as `keyof T` — TypeScript errors if you pass
//     a column key that doesn't exist on the data type
//   • Each column can have an optional render function for custom formatting
//
// This is one of the most practical generic component patterns.
// The column definition type `Column<T>` is itself generic — it threads T
// through to ensure key is a real field and render receives the right types.
//
// CHECK YOURSELF:
//   • What happens if you add { key: "nonExistent", header: "Oops" } to columns?
//   • What is the type of `value` inside the render function for the "stars" column?
//   • How would you add a sortable column feature? What type would `onSort` be?
// ─────────────────────────────────────────────────────────────

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
};

interface TableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  caption?: string;
}

function Table<T extends { id: string | number }>({ data, columns, caption }: TableProps<T>) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      {caption && <caption style={{ textAlign: 'left', fontWeight: 600, marginBottom: 4, captionSide: 'top' }}>{caption}</caption>}
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          {columns.map(col => (
            <th key={String(col.key)} style={{ padding: '8px 10px', textAlign: col.align ?? 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 600, fontSize: 12, color: '#374151' }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
            {columns.map(col => (
              <td key={String(col.key)} style={{ padding: '8px 10px', textAlign: col.align ?? 'left' }}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Package = {
  id: string;
  name: string;
  version: string;
  downloads: number;
  updated: string;
};

const packages: Package[] = [
  { id: 'react',       name: 'react',       version: '18.3.1',  downloads: 24000000, updated: '2024-04' },
  { id: 'typescript',  name: 'typescript',  version: '5.6.0',   downloads: 12000000, updated: '2024-09' },
  { id: 'react-query', name: '@tanstack/react-query', version: '5.59.0', downloads: 3200000, updated: '2024-10' },
  { id: 'zod',         name: 'zod',         version: '3.23.8',  downloads: 7100000,  updated: '2024-07' },
];

function Exercise3() {
  return (
    <div>
      <p style={hint}>
        Column <code>key</code> is typed as <code>keyof Package</code>. Add a column
        with <code>key: "nonExistent"</code> and TypeScript immediately errors.
        The <code>render</code> callback receives the correctly-typed cell value.
      </p>

      <div style={{ ...card, overflowX: 'auto' }}>
        <Table
          data={packages}
          caption="npm packages"
          columns={[
            { key: 'name',      header: 'Package' },
            { key: 'version',   header: 'Version' },
            {
              key: 'downloads',
              header: 'Downloads/wk',
              align: 'right',
              // value is T[keyof T] = Package[keyof Package] = string | number
              render: (value) => {
                const n = value as number;
                return n >= 1_000_000
                  ? `${(n / 1_000_000).toFixed(1)}M`
                  : `${(n / 1_000).toFixed(0)}k`;
              },
            },
            {
              key: 'updated',
              header: 'Last update',
              render: (value) => <span style={{ color: '#6b7280' }}>{value as string}</span>,
            },
            // TypeScript error if you add this:
            // { key: 'nonExistent', header: 'Oops' }
          ]}
        />
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Generic Components
      </h1>

      <h2>Exercise 1 — Select&lt;T&gt;: type-safe dropdown</h2>
      <Exercise1 />

      <h2>Exercise 2 — List&lt;T extends &#123; id &#125;&gt;: constrained generics</h2>
      <Exercise2 />

      <h2>Exercise 3 — Table&lt;T&gt;: keyof T for columns</h2>
      <Exercise3 />
    </div>
  );
}
