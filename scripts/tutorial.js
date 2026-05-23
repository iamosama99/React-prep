#!/usr/bin/env node
/**
 * Tutorial runner — copies a tutorial file into the sandbox and starts Vite.
 *
 * Usage (from project root):
 *   npm run tutorial 01
 *   npm run tutorial use-state
 *   npm run tutorial 02-use-effect
 *   npm run tutorial phase-09-typescript/01
 */

import { readdirSync, statSync, copyFileSync, existsSync, unlinkSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { resolve, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT     = resolve(__dirname, '..');
const SANDBOX  = join(ROOT, 'sandbox');
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

// ─── 5. Copy tutorial into sandbox ─────────────────────────────────────────────

// Remove any previous App.jsx / App.tsx
for (const e of ['.jsx', '.tsx']) {
  const old = join(SANDBOX, 'src', `App${e}`);
  if (existsSync(old)) unlinkSync(old);
}

const dest = join(SANDBOX, 'src', `App${ext}`);
copyFileSync(tutorialFile, dest);

// ─── 6. Start Vite ────────────────────────────────────────────────────────────

console.log(`\n📂  ${relativePath}`);
console.log(`🚀  Starting dev server — browser will open automatically\n`);

const vite = spawn('npm', ['run', 'dev'], {
  cwd:   SANDBOX,
  stdio: 'inherit',
  shell: true,
});

vite.on('exit', code => process.exit(code ?? 0));
