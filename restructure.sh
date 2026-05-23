#!/usr/bin/env bash
# restructure.sh — moves all 134 topic .md files into subfolders
# and creates tutorial stub files (.jsx for phases 1-8, .tsx for 9-13).
# Idempotent: skips any topic folder that already exists.
# Uses git mv to preserve history.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

make_jsx_stub() {
  local topic_name="$1" phase_num="$2" phase_name="$3" dest="$4"
  cat > "$dest" <<STUBEOF
// ============================================================
// Topic:   ${topic_name}
// Phase:   ${phase_num} — ${phase_name}
// File:    tutorial.jsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react) or a local
//      Vite app: npm create vite@latest my-app -- --template react
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// Goal: Implement the simplest possible demonstration of ${topic_name}.
//       Focus on the core mechanic — no extra features yet.
//
// TODO: Replace this stub with your implementation.
function Exercise1() {
  return <div>Exercise 1 — ${topic_name} (stub)</div>;
}

// ─── Exercise 2 ──────────────────────────────────────────────
// Goal: Handle a realistic edge case or common gotcha for ${topic_name}.
//       Check notes.md "Check yourself" prompts for hints.
//
// TODO: Replace this stub with your implementation.
function Exercise2() {
  return <div>Exercise 2 — edge case (stub)</div>;
}

// ─── Exercise 3 ──────────────────────────────────────────────
// Goal: Build a small composable unit that uses ${topic_name} in a
//       pattern you'd actually write in a production codebase.
//
// TODO: Replace this stub with your implementation.
function Exercise3() {
  return <div>Exercise 3 — production pattern (stub)</div>;
}

// ─── Playground ──────────────────────────────────────────────
// Free-form area. Use this to run quick experiments, try
// variations from the notes, or reproduce interview questions.
function Playground() {
  return <div>Playground — experiment here</div>;
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>${topic_name}</h1>
      <h2>Exercise 1</h2><Exercise1 />
      <h2>Exercise 2</h2><Exercise2 />
      <h2>Exercise 3</h2><Exercise3 />
      <h2>Playground</h2><Playground />
    </div>
  );
}
STUBEOF
}

make_tsx_stub() {
  local topic_name="$1" phase_num="$2" phase_name="$3" dest="$4"
  cat > "$dest" <<STUBEOF
// ============================================================
// Topic:   ${topic_name}
// Phase:   ${phase_num} — ${phase_name}
// File:    tutorial.tsx
//
// Instructions
//   1. Read notes.md for the concept before touching this file.
//   2. Complete each exercise in order — each builds on the last.
//   3. Use the Playground at the bottom to experiment freely.
//   4. Run in StackBlitz (stackblitz.com/new/react-ts) or a local
//      Vite app: npm create vite@latest my-app -- --template react-ts
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo, FC } from 'react';

// ─── Exercise 1 ──────────────────────────────────────────────
// Goal: Implement the simplest possible demonstration of ${topic_name}
//       with explicit TypeScript types.
//
// TODO: Replace this stub with your implementation.
const Exercise1: FC = () => {
  return <div>Exercise 1 — ${topic_name} (stub)</div>;
};

// ─── Exercise 2 ──────────────────────────────────────────────
// Goal: Handle a realistic TypeScript edge case for ${topic_name}.
//       Check notes.md "Check yourself" prompts for hints.
//
// TODO: Replace this stub with your implementation.
const Exercise2: FC = () => {
  return <div>Exercise 2 — TypeScript edge case (stub)</div>;
};

// ─── Exercise 3 ──────────────────────────────────────────────
// Goal: Build a small, fully-typed composable unit using ${topic_name}
//       in a pattern you'd write in a production TypeScript codebase.
//
// TODO: Replace this stub with your implementation.
const Exercise3: FC = () => {
  return <div>Exercise 3 — production pattern (stub)</div>;
};

// ─── Playground ──────────────────────────────────────────────
const Playground: FC = () => {
  return <div>Playground — experiment here</div>;
};

// ─── App ─────────────────────────────────────────────────────
const App: FC = () => {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>${topic_name}</h1>
      <h2>Exercise 1</h2><Exercise1 />
      <h2>Exercise 2</h2><Exercise2 />
      <h2>Exercise 3</h2><Exercise3 />
      <h2>Playground</h2><Playground />
    </div>
  );
};

export default App;
STUBEOF
}

declare -a PHASES=(
  "phase-01-fundamentals|1|Fundamentals Refresher|jsx"
  "phase-02-hooks|2|Hooks|jsx"
  "phase-03-class-legacy|3|Class Components and Legacy|jsx"
  "phase-04-component-patterns|4|Component Patterns|jsx"
  "phase-05-performance|5|Performance and Internals|jsx"
  "phase-06-state-management|6|State Management|jsx"
  "phase-07-routing|7|Routing|jsx"
  "phase-08-forms|8|Forms|jsx"
  "phase-09-typescript|9|TypeScript with React|tsx"
  "phase-10-testing|10|Testing|tsx"
  "phase-11-modern-react|11|Modern React RSC Concurrent|tsx"
  "phase-12-ssr-frameworks|12|SSR and Meta-Frameworks|tsx"
  "phase-13-tooling-security-a11y|13|Tooling Security A11y|tsx"
)

total_moved=0; total_skipped=0

for entry in "${PHASES[@]}"; do
  IFS='|' read -r phase_dir phase_num phase_name ext <<< "$entry"
  [ -d "$REPO_ROOT/$phase_dir" ] || { echo "WARNING: $phase_dir not found — skipping"; continue; }
  echo ""; echo "=== $phase_dir (.$ext) ==="

  for md_file in "$REPO_ROOT/$phase_dir"/*.md; do
    [ -f "$md_file" ] || continue
    slug=$(basename "$md_file" .md)
    topic_dir="$REPO_ROOT/$phase_dir/$slug"
    notes_dest="$topic_dir/notes.md"
    tutorial_dest="$topic_dir/tutorial.${ext}"
    topic_name=$(grep -m1 "^# " "$md_file" | sed 's/^# //')
    [ -z "$topic_name" ] && topic_name="$slug"

    if [ -d "$topic_dir" ]; then
      echo "  SKIP (exists): $slug/"; ((total_skipped++)); continue
    fi

    echo "  Moving: $phase_dir/$slug.md → $phase_dir/$slug/notes.md"
    mkdir -p "$topic_dir"
    git mv "$md_file" "$notes_dest"

    if [ "$ext" = "tsx" ]; then
      make_tsx_stub "$topic_name" "$phase_num" "$phase_name" "$tutorial_dest"
    else
      make_jsx_stub "$topic_name" "$phase_num" "$phase_name" "$tutorial_dest"
    fi
    git add "$tutorial_dest"
    ((total_moved++))
  done
done

echo ""
echo "========================================"
echo "Done. Moved: $total_moved  Skipped: $total_skipped"
echo "Next: run ./update-readme-links.sh"
echo "========================================"
