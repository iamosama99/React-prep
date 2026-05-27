// ============================================================
// Topic:   Schema Validation: Zod & Yup
// Phase:   8 — Forms
//
// REQUIRES: npm install zod yup react-hook-form @hookform/resolvers
//
// APPROACH:
//   Exercise 1 — Zod schema playground: write rules, parse test inputs, see results
//   Exercise 2 — cross-field validation (password confirm) in both Zod and Yup
//   Exercise 3 — attach a zodResolver to React Hook Form (schema = only source of truth)
// ============================================================

import { useState } from 'react';
import { z } from 'zod';
import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 2 };
const errorStyle = { color: '#dc2626', fontSize: 12, margin: '2px 0 0' };

// ─── Exercise 1 ──────────────────────────────────────────────
// SCHEMA PLAYGROUND — write the schema, parse test inputs, read the result
//
// This exercise is NOT a form — it's a live validator.
// You define the schema, then the UI lets you paste raw data (as JSON)
// and immediately shows you what Zod's safeParse produces.
//
// TODO — complete signupSchema:
//   □ email:    z.string().email('Invalid email')
//   □ password: z.string().min(8, 'Min 8 characters').max(64)
//   □ age:      z.number().min(18, 'Must be 18+').optional()
//   □ role:     z.enum(['viewer', 'editor', 'admin'])
//
// THEN run the playground — paste these test inputs into the textarea:
//   Valid:   { "email": "a@b.com", "password": "secret123", "role": "admin" }
//   Invalid: { "email": "notanemail", "password": "short", "role": "god" }
//   Missing: { "email": "a@b.com" }
//
// WHAT TO NOTICE:
//   - success: false gives you an array of { path, message } issues
//   - Each issue tells you exactly which field failed and why
//   - safeParse never throws — failures are data you inspect, not exceptions

const signupSchema = z.object({
  // TODO: define the four fields
});

function Exercise1() {
  const [raw, setRaw] = useState('{ "email": "a@b.com", "password": "secret123", "role": "admin" }');
  const [result, setResult] = useState(null);

  function handleParse() {
    try {
      const parsed = JSON.parse(raw);
      const outcome = signupSchema.safeParse(parsed);
      setResult(outcome);
    } catch {
      setResult({ success: false, error: { issues: [{ path: [], message: 'Invalid JSON' }] } });
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="rawInput" style={{ fontWeight: 600 }}>
          Paste JSON to validate:
        </label>
        <textarea
          id="rawInput"
          rows={4}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
        />
      </div>

      <button type="button" onClick={handleParse} style={{ justifySelf: 'start' }}>
        Run safeParse()
      </button>

      {result && (
        <div style={{
          background: result.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
          borderRadius: 4,
          padding: 12,
        }}>
          <strong style={{ color: result.success ? '#15803d' : '#dc2626' }}>
            {result.success ? '✓ Valid' : '✗ Invalid'}
          </strong>

          {result.success && (
            <pre style={{ fontSize: 12, margin: '8px 0 0' }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}

          {!result.success && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13 }}>
              {result.error.issues.map((issue, i) => (
                <li key={i}>
                  <strong>{issue.path.join('.') || '(root)'}</strong>: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exercise 2 ──────────────────────────────────────────────
// CROSS-FIELD VALIDATION — password confirmation in Zod and Yup
//
// This is the classic multi-field rule: "password" must equal "confirm".
// Each library has a different mechanism. Build both side by side.
//
// PART A — Zod:
//   □ Create zodPasswordSchema:
//       password: z.string().min(8, 'Min 8 characters')
//       confirm:  z.string()
//       Then chain .refine(data => data.password === data.confirm, {
//         message: 'Passwords do not match',
//         path: ['confirm'],   ← attach the error to the confirm field
//       })
//
// PART B — Yup:
//   □ Create yupPasswordSchema:
//       password: Yup.string().min(8, 'Min 8 characters').required()
//       confirm:  Yup.string()
//         .oneOf([Yup.ref('password')], 'Passwords do not match')
//         .required('Required')
//
// Both forms below are identical in UI — you're comparing ONLY the schema APIs.
//
// WHAT TO NOTICE:
//   - Zod: .refine() on the object level — you see both fields at once
//   - Yup: Yup.ref('password') cross-references a sibling field
//   - Both attach the error to the `confirm` field so the UX is identical

// TODO: define zodPasswordSchema
const zodPasswordSchema = z.object({
  password: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
  // TODO: .refine(...)
});

// TODO: define yupPasswordSchema
const yupPasswordSchema = Yup.object({
  password: Yup.string().min(8, 'Min 8 characters').required('Required'),
  confirm: Yup.string().required('Required'),
  // TODO: .oneOf([Yup.ref('password')], 'Passwords do not match')
});

function PasswordFormZod() {
  const [fields, setFields] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState([]);
  const [ok, setOk] = useState(false);

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setOk(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const result = zodPasswordSchema.safeParse(fields);
    if (result.success) {
      setErrors([]);
      setOk(true);
    } else {
      setErrors(result.error.issues);
      setOk(false);
    }
  }

  const getError = (name) => errors.find(i => i.path[0] === name)?.message;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
      <div>
        <label>Password</label>
        <input type="password" name="password" value={fields.password} onChange={handleChange} style={inputStyle} />
        {getError('password') && <p style={errorStyle}>{getError('password')}</p>}
      </div>
      <div>
        <label>Confirm password</label>
        <input type="password" name="confirm" value={fields.confirm} onChange={handleChange} style={inputStyle} />
        {getError('confirm') && <p style={errorStyle}>{getError('confirm')}</p>}
      </div>
      <button type="submit">Set password (Zod)</button>
      {ok && <p style={{ color: '#15803d', fontSize: 13 }}>✓ Passwords match!</p>}
    </form>
  );
}

function PasswordFormYup() {
  const [fields, setFields] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [ok, setOk] = useState(false);

  function handleChange(e) {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setOk(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await yupPasswordSchema.validate(fields, { abortEarly: false });
      setErrors({});
      setOk(true);
    } catch (err) {
      const errs = {};
      err.inner.forEach(e => { errs[e.path] = e.message; });
      setErrors(errs);
      setOk(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
      <div>
        <label>Password</label>
        <input type="password" name="password" value={fields.password} onChange={handleChange} style={inputStyle} />
        {errors.password && <p style={errorStyle}>{errors.password}</p>}
      </div>
      <div>
        <label>Confirm password</label>
        <input type="password" name="confirm" value={fields.confirm} onChange={handleChange} style={inputStyle} />
        {errors.confirm && <p style={errorStyle}>{errors.confirm}</p>}
      </div>
      <button type="submit">Set password (Yup)</button>
      {ok && <p style={{ color: '#15803d', fontSize: 13 }}>✓ Passwords match!</p>}
    </form>
  );
}

function Exercise2() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <h3 style={{ margin: '0 0 8px' }}>Zod (.refine)</h3>
        <PasswordFormZod />
      </div>
      <div>
        <h3 style={{ margin: '0 0 8px' }}>Yup (Yup.ref)</h3>
        <PasswordFormYup />
      </div>
    </div>
  );
}

// ─── Exercise 3 ──────────────────────────────────────────────
// zodResolver + React Hook Form — schema is the only source of rules
//
// When you pass a resolver to useForm, there are NO inline rules
// in register() calls. The schema handles all validation.
//
// TODO:
//   □ Complete registrationSchema below with Zod
//   □ Pass zodResolver(registrationSchema) as the resolver in useForm
//   □ All register() calls should have NO rules — just the field name
//   □ Errors still come from formState.errors[field].message as usual
//
// Rules to encode in the schema:
//   username → min 3 chars, no spaces (use .refine)
//   email    → valid email format
//   password → min 8 chars
//   confirm  → must equal password (object-level .refine with path: ['confirm'])
//
// WHAT TO NOTICE:
//   - The register() calls are clean — no rules, just field names
//   - Change a rule → update the schema, nothing else
//   - The schema could be shared with a backend API endpoint

const registrationSchema = z.object({
  username: z.string()
    .min(3, 'Min 3 characters'),
    // TODO: .refine(v => !/\s/.test(v), 'No spaces allowed')
  email: z.string(),
    // TODO: .email('Invalid email')
  password: z.string(),
    // TODO: .min(8, 'Min 8 characters')
  confirm: z.string(),
})
// TODO: .refine(data => data.password === data.confirm, {
//   message: 'Passwords do not match',
//   path: ['confirm'],
// });

function Exercise3() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    // TODO: resolver: zodResolver(registrationSchema),
  });

  function onValid(data) {
    console.log('Registration data:', data);
    alert(`Account created for ${data.username}!`);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onValid)} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label htmlFor="reg-username">Username</label>
        {/* No rules in register() — the schema handles everything */}
        <input id="reg-username" {...register('username')} style={inputStyle} />
        {errors.username && <p style={errorStyle}>{errors.username.message}</p>}
      </div>

      <div>
        <label htmlFor="reg-email">Email</label>
        <input id="reg-email" type="email" {...register('email')} style={inputStyle} />
        {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" type="password" {...register('password')} style={inputStyle} />
        {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
      </div>

      <div>
        <label htmlFor="reg-confirm">Confirm password</label>
        <input id="reg-confirm" type="password" {...register('confirm')} style={inputStyle} />
        {errors.confirm && <p style={errorStyle}>{errors.confirm.message}</p>}
      </div>

      <button type="submit">Create account</button>
    </form>
  );
}

// ─── Playground ──────────────────────────────────────────────
// Ideas:
//   - Try z.string().transform(s => s.trim()) — the form submits the trimmed value
//   - Try z.coerce.number() — accepts "42" (string from input) and coerces to number
//   - Write an async .refine that simulates a username-availability check
//     (you'll need parseAsync / safeParseAsync instead of safeParse)
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1.5rem', maxWidth: 600 }}>
      <h1>Schema Validation: Zod & Yup</h1>

      <h2>Exercise 1 — Zod Schema Playground</h2>
      <Exercise1 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 2 — Cross-Field Validation</h2>
      <Exercise2 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Exercise 3 — zodResolver + React Hook Form</h2>
      <Exercise3 />

      <hr style={{ margin: '2rem 0' }} />

      <h2>Playground</h2>
      <Playground />
    </div>
  );
}
