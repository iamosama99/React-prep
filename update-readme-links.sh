#!/usr/bin/env bash
# update-readme-links.sh
# Converts phase-XX/slug.md paths to phase-XX/slug/notes.md in
# README.md and CONTEXT.md. Idempotent — already-updated paths
# won't double-transform (group 2 excludes '/', so 'slug/notes'
# won't match).

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Group 1: phase dir  Group 2: slug (no slashes allowed → idempotent)
SED_PATTERN='s|(phase-[0-9]+-[^/]+)/([^)` /]+)\.md|\1/\2/notes.md|g'

echo "Updating README.md..."
sed -i '' -E "$SED_PATTERN" "$REPO_ROOT/README.md"

echo "Updating CONTEXT.md..."
sed -i '' -E "$SED_PATTERN" "$REPO_ROOT/CONTEXT.md"

git add "$REPO_ROOT/README.md" "$REPO_ROOT/CONTEXT.md"
echo "Done. Both files updated and staged."
