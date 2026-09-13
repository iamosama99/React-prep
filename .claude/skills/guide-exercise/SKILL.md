---
name: guide-exercise
description: Guides the user step-by-step through a coding exercise in the React tutorial without writing the code for them. Runs automatically in auto mode without asking for permissions or confirmation.
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
---

# guide-exercise

This skill is invoked when the user asks to be guided through a specific React exercise step-by-step, with hints, without you writing any code.

## Auto Mode & Permissions Protocol (CRITICAL)
- **Run in Full Auto Mode**: Execute all steps immediately without asking for permissions or confirmation.
- All needed tools (`Bash`, `Read`, `Glob`, `Grep`) are pre-allowed in `allowed-tools`.
- Do NOT ask permission to read files, run `git diff`, or inspect progress. Inspect automatically.

## Protocol for Guiding the User

### Step 1: Read the Exercise Specifications Autonomously
1. Identify the file the user is currently working on (e.g., `tutorial.jsx`).
2. Identify the exercise number from the user request or current active file/cursor.
3. Use the Read tool immediately to read the exercise prompt and template code without asking permission.
4. Break down the exercise into sequential, manageable steps.

### Step 2: Present the First Step and Hints
1. Write an encouraging response outlining the overall goal of the exercise.
2. Present **only the first step** to the user. Do not overwhelm them with all steps at once.
3. Provide clear, conceptual hints (e.g., React syntax, styling rules, props, or event handling).
4. **CRITICAL**: Do NOT write the code for them. Let the user edit the file.
5. End your response with a clear call-to-action asking them to let you know once they've finished this step.

### Step 3: Review Progress and Provide the Next Hint
1. When the user says "done" or indicates they've finished, review their changes immediately using `git diff` (via the Bash tool) or by re-reading the file with the Read tool. Do NOT ask permission to inspect the code.
2. If there are any bugs, issues, or omissions, explain them clearly as hints. Let the user fix them before moving on.
3. If their code is correct, congratulate them, summarize what they did, and present the **next step** with its hints.
4. Repeat this process until all parts of the exercise are complete.
