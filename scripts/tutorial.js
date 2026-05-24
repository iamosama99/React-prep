#!/usr/bin/env node
/**
 * Tutorial runner — points the sandbox at a tutorial file and starts Vite.
 *
 * Usage (from project root):
 *   npm run tutorial 01
 *   npm run tutorial use-state
 *   npm run tutorial 02-use-effect
 *   npm run tutorial phase-09-typescript/01
 *
 * HOW IT WORKS
 *   Instead of copying the tutorial file into the sandbox, this script
 *   writes a one-line re-export file at sandbox/src/tutorial.jsx (or .tsx)
 *   that points back to the real file in its phase folder.
 *
 *   App.jsx is a static shell:  export { default } from './tutorial'
 *
 *   You always edit the original file in its phase folder.
 *   Vite follows the import chain and hot-reloads on every save.
 */

import { readdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { resolve, join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT     = resolve(__dirname, '..');
const SANDBOX  = join(ROOT, 'sandbox');
const SRC      = join(SANDBOX, 'src');
const SKIP     = new Set(['node_modules', 'sandbox', '.git', '_templates', 'scripts']);

// ─── 1. Parse query ────────────────────────────────────────────────────────────

const query = process.argv[2];

if (!query) {
  console.log('\nUsage:  npm run tutorial <topic>\n');
  console.log('Examples:');
  console.log('  npm run tutorial 01               # topic 01 in any phase');
  console.log('  npm run tutorial use-state        # matches "use-state" anywhere');
  console.log('  npm run tutorial 02-use-effect    # more specific match');
  console.log('  npm run tutorial phase-09/01      # fully qualified\n');
  process.exit(1);
}

// ─── 2. Find all tutorial files ────────────────────────────────────────────────

function findTutorials(dir) {
  const results = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTutorials(fullPath));
    } else if (entry.name === 'tutorial.jsx' || entry.name === 'tutorial.tsx') {
      results.push(fullPath);
    }
  }
  return results;
}

const allTutorials = findTutorials(ROOT);

// ─── 3. Match against query ────────────────────────────────────────────────────

const q = query.toLowerCase().replace(/\\/g, '/');

// Score each path: prefer matches in the topic folder name over phase name
function score(p) {
  const rel = p.replace(ROOT + '/', '').toLowerCase();
  const parts = rel.split('/');
  // parts = ['phase-XX-name', 'NN-topic-name', 'tutorial.jsx']
  const topicPart = parts[1] ?? '';
  if (topicPart.includes(q)) return 2; // matched topic folder — best
  if (rel.includes(q))       return 1; // matched somewhere in path
  return 0;
}

const matches = allTutorials.filter(p => score(p) > 0);

if (matches.length === 0) {
  console.error(`\n✗  No tutorial found matching "${query}"\n`);
  console.log('Available tutorials:\n');
  allTutorials.forEach(p => console.log(' ', p.replace(ROOT + '/', '')));
  process.exit(1);
}

// If multiple matches, prefer higher score, then fewer characters (more specific path)
matches.sort((a, b) => score(b) - score(a) || a.length - b.length);

if (matches.length > 1) {
  const top = score(matches[0]);
  const tied = matches.filter(p => score(p) === top);
  if (tied.length > 1) {
    console.error(`\n✗  Multiple tutorials match "${query}". Be more specific:\n`);
    tied.forEach(p => console.log(' ', p.replace(ROOT + '/', '')));
    process.exit(1);
  }
}

const tutorialFile = matches[0];
const ext          = extname(tutorialFile); // '.jsx' or '.tsx'
const relativePath = tutorialFile.replace(ROOT + '/', '');

// ─── 4. Install sandbox deps if needed ─────────────────────────────────────────

if (!existsSync(join(SANDBOX, 'node_modules'))) {
  console.log('\n📦 First run — installing sandbox dependencies...\n');
  execSync('npm install', { cwd: SANDBOX, stdio: 'inherit' });
}

// ─── 5. Write the tutorial pointer file ────────────────────────────────────────
//
//  sandbox/src/tutorial.jsx  (or .tsx)  →  one-line re-export pointing at the
//  real tutorial file.  App.jsx is a static shell that imports from ./tutorial.
//
//  Vite resolves the re-export chain and watches all files in the graph, so
//  saving the real tutorial file triggers HMR automatically.

// Remove any leftover pointer from a previous session (different extension)
for (const e of ['.jsx', '.tsx']) {
  const old = join(SRC, `tutorial${e}`);
  if (existsSync(old)) unlinkSync(old);
}

// Relative import path from sandbox/src → actual tutorial file
// (forward slashes so the generated import works on all platforms)
const importPath = relative(SRC, tutorialFile).replace(/\\/g, '/');

const pointerFile = join(SRC, `tutorial${ext}`);
writeFileSync(
  pointerFile,
  `// Auto-generated by \`npm run tutorial\` — do not edit.\n` +
  `// Edit the real file: ${relativePath}\n` +
  `export { default } from '${importPath}';\n`,
);

// ─── 6. Start Vite ────────────────────────────────────────────────────────────

console.log(`\n📂  ${relativePath}`);
console.log(`✏️   Edit that file directly — Vite will hot-reload on every save.\n`);
console.log(`🚀  Starting dev server — browser will open automatically\n`);

const vite = spawn('npm', ['run', 'dev'], {
  cwd:   SANDBOX,
  stdio: 'inherit',
  shell: true,
});

vite.on('exit', code => process.exit(code ?? 0));
