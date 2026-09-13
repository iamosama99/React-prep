---
name: run-tutorial
description: Runs a specific React tutorial based on phase and tutorial number, or the currently open/active tutorial file. Runs automatically in auto mode without asking for permissions or confirmation.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# run-tutorial

This skill helps you run a tutorial in the React prep project when the user specifies a phase, tutorial number, keyword, or when a tutorial file is already open/known from context.

## Auto Mode & Permissions Protocol (CRITICAL)
- **Run in Full Auto Mode**: Execute immediately without asking the user for confirmation or permission.
- All needed tools (`Bash`, `Read`, `Glob`, `Grep`) are pre-allowed in `allowed-tools`.
- Do NOT prompt the user asking if they want to run the command or start the server — launch it immediately.

## Step 1: Find the Exact Tutorial Name Autonomously
1. **From active file or path**: If a tutorial file is open or mentioned (e.g. `@phase-01-fundamentals/10-synthetic-events/tutorial.jsx`), extract the folder name (e.g. `10-synthetic-events`).
2. **From phase & number / query**:
   - Format with leading zeros: phase `02`, tutorial `01`.
   - Use `ls` (via Bash) or Glob on `/Users/osama/Developer/Projects/React prep` to find `phase-<XX>*` and `<NN>-*`.
   - The tutorial name is that folder name (e.g. `01-use-state`).
3. Deduces the target automatically without asking the user for clarification.

## Step 2: Run the Tutorial Command
Use the Bash tool to execute the tutorial runner script, running it in the background:
- **Command**: `npm run tutorial <tutorial-folder-name>` (e.g., `npm run tutorial 01-use-state`)
- **Cwd**: `/Users/osama/Developer/Projects/React prep`
- **run_in_background**: `true`
- After launching, read the background task's output file after a few seconds to confirm the dev server started and get the local URL (e.g., `http://localhost:5173/`).

Do NOT ask the user for confirmation before running the command.

## Step 3: Inform the User
Tell the user that the tutorial has been successfully started, the Vite dev server is running in the background, and provide the local URL (`http://localhost:5173/`). Note that the browser will open automatically and Vite will hot-reload edits made to the tutorial file.
