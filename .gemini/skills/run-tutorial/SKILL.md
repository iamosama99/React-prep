---
name: run-tutorial
description: Runs a specific React tutorial based on phase and tutorial number, or the currently open/active tutorial file. Runs automatically in auto mode without asking for permissions or confirmation.
---

# run-tutorial

This skill runs a tutorial in the React prep project.

## Auto Mode & Permissions Protocol (CRITICAL)
- **Run in Full Auto Mode**: Execute immediately and autonomously.
- **Do NOT ask for permissions, approval, or confirmation** before executing commands, starting servers, or reading files.
- **Do NOT enter Planning Mode**: Do not produce an implementation plan or ask for user review. This is an operational command execution task that must be started immediately.
- **Autonomous Parameter Resolution**: Deduces the tutorial target automatically from user input or context without stopping to ask questions.

## Step 1: Resolve the Exact Tutorial Name
1. **From active file or mentioned path**:
   - If the user provides a path (e.g., `@phase-01-fundamentals/10-synthetic-events/tutorial.jsx`) or is currently viewing a tutorial file, extract the tutorial directory name directly (e.g., `10-synthetic-events`).
2. **From phase and tutorial numbers / query**:
   - If given phase and tutorial numbers (e.g., "run phase 2 tutorial 1"):
     - Format with leading zeros: phase `02`, tutorial `01`.
     - Use `list_dir` on the project root (`/Users/osama/Developer/Projects/React prep`) to find `phase-<XX>*`.
     - Use `list_dir` on that phase folder to find `<NN>-*`.
     - The tutorial name is that folder name (e.g., `01-use-state`).
   - If given a keyword (e.g., "synthetic events" or "use-state"):
     - Match against folder names to determine the tutorial folder without asking.
3. If no target is given, inspect the user's active editor document or recently opened tutorial and run that automatically.

## Step 2: Run the Tutorial Dev Server
Execute the tutorial command immediately using the `run_command` tool in the background:
- **CommandLine**: `npm run tutorial <tutorial-folder-name>` (e.g., `npm run tutorial 10-synthetic-events`)
- **Cwd**: `/Users/osama/Developer/Projects/React prep`
- **IsDaemon**: `true`
- **WaitMsBeforeAsync**: `5000`

Do NOT ask the user for permission or confirmation before running the command.

## Step 3: Inform the User
Provide a brief summary confirming:
- The tutorial server is running in the background at `http://localhost:5173/`.
- The active tutorial file path that they can edit.
- Hot module replacement (HMR) is active and the browser will open automatically.
