// ============================================================
// Topic:   Utility Types in Component APIs
// Phase:   9 — TypeScript with React
//
// HOW TO RUN:
//   npm run tutorial 09-utility-types
//
// APPROACH:
//   Exercise 1 — ComponentPropsWithoutRef + Omit: wrapping an existing component
//   Exercise 2 — Partial, Omit, Record: sculpting form/update payload types
//   Exercise 3 — ReturnType, NonNullable, Extract, Exclude: real-world compositions
//
// These utility types are the difference between copy-pasting prop definitions
// and building types that stay in sync automatically as your codebase evolves.
// ============================================================

import React, { useState, createContext, useContext, useCallback } from 'react';

// ─── Shared styles ───────────────────────────────────────────
const card: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '0.5rem',
};
const hint: React.CSSProperties = {
  background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 6, padding: '0.6rem 0.8rem', fontSize: 13, marginBottom: 8, color: '#1e40af',
};
const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', boxSizing: 'border-box', marginTop: 4,
};
const label12: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151' };

// ─────────────────────────────────────────────────────────────
// Exercise 1 — ComponentPropsWithoutRef + Omit: wrapping a component
//
// You're building LoadingButton on top of an existing Button.
// WRONG approach: manually copy Button's props into LoadingButton.
//   Problem: when Button gains a new prop, LoadingButton silently falls behind.
//
// CORRECT approach: React.ComponentPropsWithoutRef<typeof Button>
//   Gets ALL of Button's props automatically.
//   Future Button props flow through to LoadingButton for free.
//
// The Omit pattern: when LoadingButton re-defines a prop Button already has
// (like adding a better-typed `onClick`), use Omit to prevent the conflict.
//
// Also: Pick to expose a subset of another component's props in a config type.
//
// CHECK YOURSELF:
//   • What does ComponentPropsWithoutRef<typeof Button> return?
//   • Why use ComponentPropsWithoutRef instead of ComponentProps?
//   • If Button adds a `tooltip` prop tomorrow, does LoadingButton get it? Why?
// ─────────────────────────────────────────────────────────────

// ── The base Button ──────────────────────────────────────────────────────
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

function Button({ variant = 'primary', size = 'md', leftIcon, rightIcon, children, style, ...rest }: ButtonProps) {
  const bg = { primary: '#3b82f6', secondary: '#6b7280', danger: '#ef4444' }[variant];
  const pad = { sm: '3px 10px', md: '6px 14px', lg: '9px 20px' }[size];
  const fs  = { sm: 12, md: 14, lg: 16 }[size];

  return (
    <button
      {...rest}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad, fontSize: fs, borderRadius: 6, border: 'none', background: bg, color: '#fff', cursor: rest.disabled ? 'not-allowed' : 'pointer', opacity: rest.disabled ? 0.6 : 1, ...style }}
    >
      {leftIcon}{children}{rightIcon}
    </button>
  );
}

// ── LoadingButton — extends Button without copying props ─────────────────
//
// ComponentPropsWithoutRef<typeof Button> = all of ButtonProps minus the ref.
// We add our own `loading` prop and extend it.
//
type LoadingButtonProps =
  React.ComponentPropsWithoutRef<typeof Button> & {
    loading?: boolean;
    loadingText?: string;
  };

function LoadingButton({ loading = false, loadingText, children, disabled, ...rest }: LoadingButtonProps) {
  return (
    <Button
      {...rest}
      disabled={loading || disabled}
      leftIcon={loading ? <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> : rest.leftIcon}
    >
      {loading ? (loadingText ?? 'Loading…') : children}
    </Button>
  );
}

// ── Pick for a config subset ─────────────────────────────────────────────
//
// Expose only visual props for a theme config — not behavior props
type ButtonTheme = Pick<ButtonProps, 'variant' | 'size'>;
//  → { variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md' | 'lg' }

// ── Omit to replace a prop with a better signature ───────────────────────
//
// The native HTMLButtonElement.onChange is overly generic.
// Replace it with a cleaner version for this component:
type SpecialInput = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;  // string instead of ChangeEvent
};

function CleanInput({ value, onChange, ...rest }: SpecialInput) {
  return (
    <input
      {...rest}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

function Exercise1() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const theme: ButtonTheme = { variant: 'secondary', size: 'sm' };

  return (
    <div>
      <p style={hint}>
        <code>LoadingButton</code> gets ALL of <code>Button</code>'s props for free.
        Add a new prop to <code>Button</code> — <code>LoadingButton</code> inherits it automatically.
        <br />
        <code>CleanInput</code> replaces the native <code>onChange</code> with a cleaner
        <code> (value: string) =&gt; void</code> via <code>Omit</code>.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        <div style={card}>
          <strong style={{ fontSize: 13 }}>LoadingButton (extends Button via ComponentPropsWithoutRef)</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <LoadingButton
              variant="primary"
              loading={loading}
              loadingText="Saving…"
              onClick={async () => { setLoading(true); await new Promise(r => setTimeout(r, 1500)); setLoading(false); }}
            >
              Save changes
            </LoadingButton>
            {/* All Button props (variant, size, leftIcon, rightIcon) flow through */}
            <LoadingButton variant="secondary" size="sm" rightIcon="→">
              Next step
            </LoadingButton>
            <LoadingButton variant="danger" disabled>
              Delete
            </LoadingButton>
          </div>
        </div>

        <div style={card}>
          <strong style={{ fontSize: 13 }}>CleanInput (Omit replaces onChange)</strong>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
            <code>onChange</code> receives a <code>string</code>, not a <code>ChangeEvent</code>
          </p>
          <CleanInput
            value={name}
            onChange={setName}  // directly: (value: string) => void
            placeholder="Type here — onChange gets the string directly"
          />
          {name && <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Value: "{name}"</p>}
        </div>

        <div style={card}>
          <strong style={{ fontSize: 13 }}>Pick — ButtonTheme subset</strong>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
            <code>Pick&lt;ButtonProps, 'variant' | 'size'&gt;</code> = only the visual shape, no behavior
          </p>
          <pre style={{ fontSize: 12, background: '#f8fafc', padding: '8px 10px', borderRadius: 6, margin: 0 }}>
            {JSON.stringify(theme, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 2 — Partial, Omit, Record: sculpting form/update types
//
// Real-world scenario: a user edit form.
//   • User has readonly fields (id, createdAt) — can't be edited
//   • User has role — can be changed only by admins
//   • The form shows a subset of editable fields
//   • Validation errors map from field name to error message
//   • An update payload is all editable fields, all optional (PATCH semantics)
//
// Compositions shown:
//   Partial<Omit<User, "id" | "createdAt">>      — editable fields, all optional
//   Partial<Record<keyof EditableFields, string>> — errors map
//   Required<Partial<...>>                         — enforces all fields present
//
// CHECK YOURSELF:
//   • What is Partial<T> equivalent to as a mapped type?
//   • Why not just write all fields with `?:` manually?
//   • If User adds a `phone` field, what automatically gains it?
// ─────────────────────────────────────────────────────────────

type User = {
  id: string;
  name: string;
  email: string;
  bio: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
};

// Remove readonly and non-editable fields
type EditableUser = Omit<User, 'id' | 'createdAt'>;
//  → { name: string; email: string; bio: string; role: ... }

// For PATCH: caller only sends what changed
type UserUpdatePayload = Partial<Omit<User, 'id' | 'createdAt'>>;
//  → { name?: string; email?: string; bio?: string; role?: ... }

// Validation errors: each editable field maps to an optional error string
type UserFormErrors = Partial<Record<keyof EditableUser, string>>;
//  → { name?: string; email?: string; bio?: string; role?: string }

function useUserForm(initial: EditableUser) {
  const [values, setValues] = useState<EditableUser>(initial);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [dirty, setDirty]   = useState(false);

  const update = <K extends keyof EditableUser>(key: K, value: EditableUser[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
    setDirty(true);
  };

  const validate = (): boolean => {
    const e: UserFormErrors = {};
    if (!values.name.trim())                      e.name  = 'Name is required';
    if (!values.email.includes('@'))              e.email = 'Invalid email';
    if (values.bio.length > 160)                  e.bio   = 'Bio max 160 chars';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Returns only changed fields
  const getDiff = (original: EditableUser): UserUpdatePayload => {
    const diff: UserUpdatePayload = {};
    (Object.keys(values) as Array<keyof EditableUser>).forEach(key => {
      if (values[key] !== original[key]) {
        (diff as Record<string, unknown>)[key] = values[key];
      }
    });
    return diff;
  };

  return { values, errors, dirty, update, validate, getDiff };
}

const sampleUser: User = {
  id: 'u_1', name: 'Alice Chen', email: 'alice@example.com',
  bio: 'TypeScript enthusiast and React developer.', role: 'editor', createdAt: '2023-01-15',
};

function Exercise2() {
  const { values, errors, dirty, update, validate, getDiff } = useUserForm({
    name: sampleUser.name, email: sampleUser.email,
    bio: sampleUser.bio, role: sampleUser.role,
  });
  const [submitted, setSubmitted] = useState<UserUpdatePayload | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setSubmitted(getDiff({ name: sampleUser.name, email: sampleUser.email, bio: sampleUser.bio, role: sampleUser.role }));
    }
  };

  const field = (key: keyof EditableUser, label: string, node: React.ReactNode) => (
    <div>
      <label style={label12}>{label}</label>
      {node}
      {errors[key] && <p style={{ color: '#dc2626', fontSize: 11, margin: '2px 0 0' }}>{errors[key]}</p>}
    </div>
  );

  return (
    <div>
      <p style={hint}>
        <code>UserUpdatePayload = Partial&lt;Omit&lt;User, 'id' | 'createdAt'&gt;&gt;</code>
        — only changed fields are sent. <code>UserFormErrors</code> uses{' '}
        <code>Record&lt;keyof EditableUser, string&gt;</code> to ensure error keys
        stay in sync with the form fields automatically.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        {field('name', 'Name', (
          <input value={values.name} onChange={e => update('name', e.target.value)} style={inputStyle} />
        ))}
        {field('email', 'Email', (
          <input type="email" value={values.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
        ))}
        {field('bio', 'Bio', (
          <div>
            <textarea value={values.bio} onChange={e => update('bio', e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            <p style={{ fontSize: 11, color: values.bio.length > 160 ? '#dc2626' : '#9ca3af', margin: '2px 0 0' }}>
              {values.bio.length}/160
            </p>
          </div>
        ))}
        {field('role', 'Role', (
          <select value={values.role} onChange={e => update('role', e.target.value as User['role'])} style={{ ...inputStyle, display: 'block' }}>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        ))}

        <button type="submit" disabled={!dirty}
          style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: dirty ? '#3b82f6' : '#94a3b8', color: '#fff', cursor: dirty ? 'pointer' : 'not-allowed' }}>
          Save (sends only changed fields)
        </button>
      </form>

      {submitted !== null && (
        <div style={{ ...card, marginTop: 12, borderColor: Object.keys(submitted).length > 0 ? '#86efac' : '#d1d5db' }}>
          <strong style={{ fontSize: 13 }}>
            {Object.keys(submitted).length > 0 ? '📤 Payload sent (changed fields only):' : 'No changes — nothing to send'}
          </strong>
          {Object.keys(submitted).length > 0 && (
            <pre style={{ fontSize: 12, margin: '6px 0 0' }}>{JSON.stringify(submitted, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise 3 — ReturnType, NonNullable, Extract, Exclude
//
// Three mini-demos of utility types you'll reach for in practice:
//
// A) ReturnType<typeof hook> — derive a context type from a hook's return.
//    The context type stays in sync with the hook automatically.
//
// B) NonNullable<T> — remove null/undefined from a field's type.
//    Useful when a prop comes from a nullable source but the component
//    requires it to be non-null. Changes to the source propagate automatically.
//
// C) Extract and Exclude — filter union members.
//    Useful for creating subsets of variant types without duplication.
//
// CHECK YOURSELF:
//   • If useAuth gains a new `permissions` field, does AuthContext update automatically?
//   • If User.avatar changes to `string | null | undefined`, what happens to AvatarSrc?
//   • What's the difference between Exclude and Omit? (hint: unions vs object keys)
// ─────────────────────────────────────────────────────────────

// ─── A) ReturnType — context synced with hook ──────────────────────────

function useAuth() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const login = useCallback((name: string) => setUser({ name, role: 'user' }), []);
  const logout = useCallback(() => setUser(null), []);
  // Add a new field here — AuthContext updates automatically
  return { user, login, logout };
}

// ReturnType<typeof useAuth> tracks the hook's shape without manual maintenance
type AuthContext = ReturnType<typeof useAuth>;
//  → { user: { name: string; role: string } | null; login: (name: string) => void; logout: () => void }

const authCtx = createContext<AuthContext | null>(null);
function useAuthContext() {
  const ctx = useContext(authCtx);
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <authCtx.Provider value={auth}>{children}</authCtx.Provider>;
}

// ─── B) NonNullable — props derived from nullable source ──────────────

type Profile = {
  id: string;
  name: string;
  avatar: string | null;   // might not have one
};

// AvatarImage only renders when an avatar exists — enforce it in the type
type AvatarSrc = NonNullable<Profile['avatar']>;
//  → string  (null removed)
// If Profile.avatar becomes string | null | undefined, AvatarSrc becomes string too — no manual update needed

function AvatarImage({ src, name }: { src: AvatarSrc; name: string }) {
  // src is `string` — NonNullable guarantees it's not null
  return (
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1d4ed8', overflow: 'hidden' }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           : name[0]?.toUpperCase()}
    </div>
  );
}

// ─── C) Extract + Exclude — filter union members ──────────────────────

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link' | 'destructive';

// Only interactive variants (not link or destructive)
type SafeVariant = Exclude<ButtonVariant, 'link' | 'destructive'>;
//  → 'solid' | 'outline' | 'ghost'

// Only the "link-like" variants (extract only those that match the union member)
type LinkLikeVariant = Extract<ButtonVariant, 'link' | 'ghost'>;
//  → 'link' | 'ghost'

// HTMLElement filtering — elements that accept a value attribute
type ValueElement = Extract<HTMLInputElement | HTMLSelectElement | HTMLDivElement, { value: string }>;
//  → HTMLInputElement | HTMLSelectElement (div doesn't have .value)

function Exercise3() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authLog, setAuthLog] = useState<string[]>([]);

  const authValue: AuthContext = {
    user: loggedIn ? { name: 'Alice', role: 'admin' } : null,
    login: (name) => { setLoggedIn(true); setAuthLog(l => [...l, `Logged in as ${name}`]); },
    logout: () => { setLoggedIn(false); setAuthLog(l => [...l, 'Logged out']); },
  };

  return (
    <authCtx.Provider value={authValue}>
      <div>
        <p style={hint}>
          Three standalone utility type demos. Each solves a maintenance problem:
          types stay in sync with their sources automatically.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={card}>
            <strong style={{ fontSize: 13 }}>A) ReturnType — context mirrors hook</strong>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
              <code>AuthContext = ReturnType&lt;typeof useAuth&gt;</code>
            </p>
            <AuthWidget onLog={msg => setAuthLog(l => [...l, msg])} />
            {authLog.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>
                {authLog.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>

          <div style={card}>
            <strong style={{ fontSize: 13 }}>B) NonNullable — avatar is always a string</strong>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>
              <code>AvatarSrc = NonNullable&lt;Profile['avatar']&gt;</code> = <code>string</code>
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <AvatarImage src="https://i.pravatar.cc/48?u=alice" name="Alice" />
              <AvatarImage src="https://i.pravatar.cc/48?u=bob" name="Bob" />
              {/* TypeScript error — null is not assignable to AvatarSrc (string): */}
              {/* <AvatarImage src={null} name="Charlie" /> */}
            </div>
          </div>

          <div style={card}>
            <strong style={{ fontSize: 13 }}>C) Extract + Exclude — variant subsets</strong>
            <div style={{ display: 'grid', gap: 6, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
              <div>
                <code>ButtonVariant</code>:{' '}
                <span style={{ color: '#374151' }}>'solid' | 'outline' | 'ghost' | 'link' | 'destructive'</span>
              </div>
              <div>
                <code>SafeVariant = Exclude&lt;…, 'link' | 'destructive'&gt;</code>:{' '}
                <span style={{ color: '#16a34a' }}>'solid' | 'outline' | 'ghost'</span>
              </div>
              <div>
                <code>LinkLikeVariant = Extract&lt;…, 'link' | 'ghost'&gt;</code>:{' '}
                <span style={{ color: '#7c3aed' }}>'link' | 'ghost'</span>
              </div>
            </div>
            <VariantPicker />
          </div>
        </div>
      </div>
    </authCtx.Provider>
  );
}

function AuthWidget({ onLog }: { onLog: (msg: string) => void }) {
  const { user, login, logout } = useAuthContext();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {user ? (
        <>
          <span style={{ fontSize: 13 }}>👤 {user.name} ({user.role})</span>
          <button onClick={() => { logout(); onLog('logged out'); }}
            style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 12 }}>
            Log out
          </button>
        </>
      ) : (
        <button onClick={() => { login('Alice'); onLog('logged in as Alice'); }}
          style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
          Log in as Alice
        </button>
      )}
    </div>
  );
}

function VariantPicker() {
  const [active, setActive] = useState<SafeVariant>('solid');
  const safeVariants: SafeVariant[] = ['solid', 'outline', 'ghost'];

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
      {safeVariants.map(v => (
        <button
          key={v}
          onClick={() => setActive(v)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: active === v ? '2px solid #3b82f6' : '1px solid #d1d5db',
            background: active === v ? '#eff6ff' : 'white',
            color: active === v ? '#1d4ed8' : '#374151',
          }}
        >
          {v}
        </button>
      ))}
      <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center', marginLeft: 4 }}>
        active: <strong>{active}</strong>
      </span>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        Utility Types in Component APIs
      </h1>

      <h2>Exercise 1 — ComponentPropsWithoutRef, Omit, Pick</h2>
      <Exercise1 />

      <h2>Exercise 2 — Partial, Omit, Record: form sculpting</h2>
      <Exercise2 />

      <h2>Exercise 3 — ReturnType, NonNullable, Extract, Exclude</h2>
      <Exercise3 />
    </div>
  );
}
