---
name: guide-exercise
description: Guides the user step-by-step through a coding exercise in the React tutorial without writing the code for them. Use this whenever the user asks for guidance, hints, or step-by-step check-ins on a specific exercise.
---

# guide-exercise

This skill is invoked when the user asks to be guided through a specific React exercise step-by-step, with hints, without the AI writing any code.

## Protocol for Guiding the User

### Step 1: Read the Exercise Specifications
1. Identify the file the user is currently working on (e.g., `tutorial.jsx`).
2. Use the `view_file` tool to read the entire exercise prompt and the current template code.
3. Break down the exercise into sequential, manageable steps.

### Step 2: Present the First Step and Hints
1. Write a response that is encouraging and outlines the overall goal of the exercise.
2. Present **only the first step** to the user. Do not overwhelm them with all steps at once.
3. Provide clear, conceptual hints (e.g., React syntax, styling rules, or props to use) to help them write the code.
4. **CRITICAL**: Do NOT write the code for them. Let them edit the file.
5. End your response with a clear call-to-action asking them to let you know once they've finished this step.

### Step 3: Review Progress and Provide the Next Hint
1. When the user says "done" or indicates they've finished, review the diff or read the file.
2. If there are any bugs, issues, or omissions, explain them clearly as hints (e.g., "Take a look at the border style - does it match the 1px #e2e8f0 requirement?"). Let them fix it before moving on.
3. If their code is correct, congratulate them, summarize what they did, and present the **next step** with its hints.
4. Repeat this process until all parts of the exercise are complete.
