---
name: run-tutorial
description: Runs a specific React tutorial based on phase and tutorial number. Use this whenever the user asks to start, run, or open a tutorial.
---

# run-tutorial

This skill helps you run a tutorial in the React prep project when the user specifies a phase and a tutorial number (e.g., "run phase 2 tutorial 1").

## Step 1: Find the exact tutorial name
1. You are given a phase number (e.g., "2" or "02") and a tutorial number (e.g., "1" or "01").
2. Format them to have leading zeros: phase `02`, tutorial `01`.
3. Use the `list_dir` tool on the project root directory (`/Users/osama/Developer/Projects/React prep`) to find the folder matching `phase-<XX>*` (e.g., `phase-02-hooks`).
4. Use the `list_dir` tool on that phase folder to find the tutorial folder matching `<NN>-*` (e.g., `01-use-state`).
5. The exact tutorial name is the name of that tutorial folder (e.g., `01-use-state`).

## Step 2: Run the tutorial command
Use the `run_command` tool to execute the tutorial runner script.
- **CommandLine**: `npm run tutorial <tutorial-folder-name>` (e.g., `npm run tutorial 01-use-state`)
- **Cwd**: `/Users/osama/Developer/Projects/React prep`
- **WaitMsBeforeAsync**: `5000` (since it starts a Vite dev server and will stay running in the background, give it a few seconds to initialize)

## Step 3: Inform the User
Tell the user that the tutorial has been successfully started, the Vite server is running in the background, and the browser should open automatically. Let them know they can edit the tutorial file directly in the phase folder and Vite will hot-reload their changes.
