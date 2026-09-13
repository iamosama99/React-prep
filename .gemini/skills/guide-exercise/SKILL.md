---
name: guide-exercise
description: Guides the user step-by-step through a coding exercise in the React tutorial without writing the code for them. Runs automatically in auto mode without asking for permissions or confirmation.
---

# guide-exercise

This skill guides the user through a specific React exercise step-by-step with hints, without the AI writing any solution code.

## Auto Mode & Permissions Protocol (CRITICAL)
- **Run in Full Auto Mode**: Execute immediately and autonomously.
- **Do NOT ask for permissions, approval, or confirmation** before reading files, checking git diffs, or reviewing progress.
- **Do NOT enter Planning Mode**: Do not create an implementation plan or ask for user review. Guide the user directly and immediately.
- **Autonomous Context Resolution**: Automatically inspect the user's active document or cursor position to identify the target exercise without asking clarifying questions unless completely ambiguous.

## Protocol for Guiding the User

### Step 1: Read the Exercise Specifications Autonomously
1. Identify the file the user is currently working on from their active editor or prompt (e.g., `tutorial.jsx`).
2. Identify the target exercise number from the user's prompt or current cursor location.
3. Use the `view_file` tool to read the exercise prompt and current template code immediately without asking permission.
4. Break down the exercise into sequential, manageable steps mentally.

### Step 2: Present the First Step and Hints
1. Provide an encouraging greeting and outline the overall goal of the exercise.
2. Present **only the first step** to the user (do not overwhelm them with all steps at once).
3. Provide clear, conceptual hints (e.g., React syntax, API behavior, event handling, or props).
4. **CRITICAL**: Do NOT write the code for them. Let the user write and edit the file.
5. End with a simple call-to-action asking them to let you know once they've finished this step.

### Step 3: Review Progress and Provide the Next Hint
1. When the user says "done", "next", or indicates they finished, inspect their changes immediately (using `view_file` on the file or checking the diff). Do NOT ask permission to inspect the file.
2. If there are any bugs, issues, or omissions, explain them clearly as hints to guide the user to fix them.
3. If their code is correct, congratulate them, briefly summarize what they did right, and present the **next step** with hints.
4. Repeat this process until all parts of the exercise are complete.
