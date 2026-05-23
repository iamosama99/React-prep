# Tutorial Templates

Base templates for `tutorial.jsx` and `tutorial.tsx` stub files generated for each topic.

## Files

| File | Used for |
|---|---|
| `tutorial-js.jsx` | Phases 1–8 (plain JavaScript / JSX) |
| `tutorial-ts.tsx` | Phases 9–13 (TypeScript / TSX) |

## How to use a tutorial file

Each topic folder contains two files:

- `notes.md` — concept explanation, mental models, interview Q&A
- `tutorial.jsx` or `tutorial.tsx` — three exercises + a free playground

**Recommended workflow:**

1. Read `notes.md` fully before opening the tutorial file.
2. Work through **Exercise 1 → 2 → 3** in order:
   - Exercise 1: core mechanic (simplest implementation)
   - Exercise 2: edge case or common gotcha
   - Exercise 3: production-style composable pattern
3. Use the **Playground** section for free-form experimentation.

## Running tutorial files

### Option A — StackBlitz (no install, fastest)

| Phase | Link |
|---|---|
| Phases 1–8 (JSX) | [stackblitz.com/new/react](https://stackblitz.com/new/react) |
| Phases 9–13 (TSX) | [stackblitz.com/new/react-ts](https://stackblitz.com/new/react-ts) |

Paste the tutorial file content into `src/App.jsx` (or `App.tsx`) and click Run.

### Option B — Local Vite app

```bash
# JSX (phases 1–8)
npm create vite@latest sandbox -- --template react

# TSX (phases 9–13)
npm create vite@latest sandbox -- --template react-ts

cd sandbox
npm install
# Paste the tutorial file content into src/App.jsx (or App.tsx)
npm run dev
```

## Creating a tutorial for a new Phase 14 topic

Copy the appropriate template, then replace the three placeholder strings:

| Placeholder | Example replacement |
|---|---|
| `TOPIC_NAME` | `useDebounce` |
| `PHASE_NUM` | `14` |
| `PHASE_NAME` | `Live Coding Patterns` |

Save the file as `phase-14-live-coding/NN-slug/tutorial.jsx`.
