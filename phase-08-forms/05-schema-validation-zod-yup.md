# Schema Validation: Zod & Yup

## Quick Reference

| | Zod | Yup |
|---|---|---|
| Type inference | Yes — schema infers TypeScript type | No — types must be written separately |
| Bundle size | ~14 kB | ~18 kB |
| API style | Method chains, immutable | Method chains, mutable |
| Error format | Array of `{ path, message }` | Object tree matching shape |
| RHF resolver | `@hookform/resolvers/zod` | `@hookform/resolvers/yup` |
| Formik integration | Via plugin | Native (`validationSchema`) |
| Async validation | `z.string().refine(async fn)` | `.test('name', 'msg', async fn)` |

---

## Why Schema Validation Libraries

Writing validation inline (`if (!value) return 'Required'`) doesn't scale. With 10 fields and 3 rules each, you have 30 branches to maintain, no reusability, and no type inference. A schema library lets you declare the shape of valid data once and derive both validation logic and TypeScript types from that declaration.

---

## Zod

Zod is the modern default for TypeScript projects. The schema is the type — you never write a separate interface.

### Basic Schema

```ts
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters').max(64),
  age: z.number().min(18, 'Must be 18+').optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
});

// TypeScript type derived from the schema — no duplication
type SignupData = z.infer<typeof signupSchema>;
// { email: string; password: string; age?: number; role: 'viewer' | 'editor' | 'admin' }
```

### Parsing and Safe Parsing

```ts
// Throws ZodError if invalid
const data = signupSchema.parse(rawInput);

// Returns { success, data } | { success: false, error } — never throws
const result = signupSchema.safeParse(rawInput);
if (!result.success) {
  console.log(result.error.issues); // Array of { path, message }
}
```

Use `safeParse` at runtime boundaries so validation failures become data, not exceptions.

---

> **Check yourself:** What does `z.infer<typeof schema>` give you, and why is this better than writing a separate TypeScript interface alongside the schema?

---

### Transformations and Preprocessing

Zod transforms run after successful parsing, not before validation.

```ts
const numericString = z.string().transform(Number); // '42' → 42
const trimmed = z.string().trim().toLowerCase(); // ' Hello ' → 'hello'

// Preprocess for coercion before type checking
const coercedDate = z.preprocess(
  v => (typeof v === 'string' ? new Date(v) : v),
  z.date()
);
```

### Cross-Field Validation (Refinements)

```ts
const passwordSchema = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine(data => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'], // attach error to the confirm field
  });
```

`.refine()` on the object level lets you write cross-field rules. The `path` option controls which field receives the error in the error map.

### Async Refinements

```ts
const usernameSchema = z.string().refine(
  async name => {
    const taken = await checkUsername(name);
    return !taken;
  },
  { message: 'Username already taken' }
);

// Must use parseAsync / safeParseAsync
const result = await usernameSchema.safeParseAsync(input);
```

---

## Yup

Yup predates Zod and is deeply integrated with Formik. Its API is nearly identical but doesn't infer TypeScript types.

### Basic Schema

```js
import * as Yup from 'yup';

const schema = Yup.object({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(8, 'Min 8 characters').required('Required'),
  age: Yup.number().min(18, 'Must be 18+').optional(),
  role: Yup.string().oneOf(['viewer', 'editor', 'admin']).required(),
});
```

### Cross-Field Validation

Yup uses `Yup.ref()` to reference sibling fields:

```js
Yup.object({
  password: Yup.string().min(8).required(),
  confirm: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required(),
});
```

### Async Validation

```js
Yup.string().test('unique-email', 'Email taken', async value => {
  if (!value) return true;
  const taken = await checkEmail(value);
  return !taken;
});
```

---

> **Check yourself:** How do you validate that two password fields match in Zod vs Yup? What mechanism does each use?

---

## Resolver Pattern with React Hook Form

Both libraries integrate with RHF via the `@hookform/resolvers` package. The resolver adapts the library's parse output to RHF's internal error format.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register('email')} />
      {errors.email && <p>{errors.email.message}</p>}

      <input type="password" {...register('password')} />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

No inline rules in `register()`. The schema is the single source of validation. RHF's `FormData` generic ensures the `handleSubmit` callback receives the correct type.

---

## Zod in Formik

Formik doesn't natively support Zod, but the integration is a one-liner with `zod-formik-adapter`:

```js
import { toFormikValidationSchema } from 'zod-formik-adapter';

<Formik validationSchema={toFormikValidationSchema(zodSchema)} ...>
```

Or write the adapter manually with `safeParse`:

```js
async validate(values) {
  const result = zodSchema.safeParse(values);
  if (result.success) return {};
  return result.error.issues.reduce((acc, issue) => {
    acc[issue.path.join('.')] = issue.message;
    return acc;
  }, {});
}
```

---

## Choosing Between Zod and Yup

**Choose Zod when:**
- TypeScript is in use — the inferred types eliminate duplication
- You're starting a new project
- You want transforms and coercions built into the schema

**Choose Yup when:**
- The codebase already uses Yup (especially with Formik)
- The team has established Yup patterns
- You need Formik's native `validationSchema` integration without an adapter

---

## Self-Assessment

- [ ] I can write a Zod schema covering strings, numbers, enums, and optional fields
- [ ] I know how to use `z.infer` to derive a TypeScript type from a schema
- [ ] I can write cross-field validation (e.g., password confirmation) in both Zod and Yup
- [ ] I can attach a resolver to React Hook Form
- [ ] I understand when to use `parse` vs `safeParse`
- [ ] I can explain the key difference between Zod and Yup to an interviewer

---

## Interview Q&A

**Q: Why use a schema library instead of writing validation inline? (High)**

A: Schema libraries give you a single declaration of data shape and rules that serves as both validation logic and (in Zod's case) TypeScript type inference. Inline validation scatters rules across handlers and components, can't be reused between the frontend form and backend endpoint, and offers no type safety. With a schema, you change a rule in one place and it takes effect everywhere the schema is used.

---

**Q: What does `z.infer<typeof schema>` do? (High)**

A: It extracts the TypeScript type that the Zod schema produces after successful parsing. If the schema says `z.string().email()`, the inferred type is `string`. For objects, it produces the correct interface. This means the type and the runtime validation are always in sync — you can't have a type that disagrees with the schema.

---

**Q: How do you handle cross-field validation in Zod — e.g., confirming a password? (Medium)**

A: Call `.refine()` on the object schema rather than on an individual field, because you need access to multiple values. Return `false` from the refine callback when the values don't match, and use the `path` option to direct the error to the specific field you want to highlight (e.g., `['confirm']`).

---

**Q: What is the difference between `parse` and `safeParse` in Zod? (Medium)**

A: `parse` throws a `ZodError` when validation fails — use it when you can let the exception propagate (e.g., in a server-side handler with an error boundary). `safeParse` never throws — it returns `{ success: true, data }` or `{ success: false, error }`. Use `safeParse` in client-side forms where you want validation failures to be data you inspect and act on, not exceptions you have to catch.

---

**Q: How do you do async validation (like a uniqueness check) in Zod? (Low)**

A: Use `.refine(async fn)` on the schema and call `parseAsync` / `safeParseAsync` instead of `parse`. The refine callback returns a Promise that resolves to `true` (valid) or `false` (invalid). In an RHF form with a resolver, the zodResolver handles the async call automatically when `handleSubmit` triggers validation.
