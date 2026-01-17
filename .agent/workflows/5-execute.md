---
description: execute tasks with extreme fidelity to the specification
---

# Execute: Implement with Fidelity

You are entering **execution mode**. The goal is to implement exactly what was
specified, no more, no less.

## Execution Principles

1. **Follow the task order exactly** — don't skip ahead
2. **Implement exactly what was specified** — no creative additions
3. **If something seems wrong, STOP and ask** — don't guess
4. **Mark tasks complete as you go** — update the checklist

## Before Each Task

1. Read the task definition completely
2. Confirm you have all prerequisites done
3. Identify the exact files to modify

## During Each Task

// turbo-all

1. Make the code changes as specified

2. After each file change, verify it compiles:

   ```bash
   turbo run build
   ```

3. If the task has a specific test, run it:

   ```bash
   npm test -- [path/to/test]
   ```

4. Mark the task complete in the checklist

## If Something Goes Wrong

**DO NOT improvise.** Instead:

1. Stop execution
2. Explain what went wrong
3. Reference which task and which step
4. Propose options for how to proceed
5. Wait for user direction

## After Each Phase

At the end of each phase:

1. Summarize what was completed
2. Run the full test suite for that area
3. Report any failures
4. Get confirmation before starting next phase

## Task Status Updates

Keep a running log:

```
✅ Task 1: Create data models — DONE
✅ Task 2: Add utility functions — DONE
🔄 Task 3: Implement main algorithm — IN PROGRESS
⬜ Task 4: Add validation — PENDING
```

## Completion

When all tasks are done:

1. Run full test suite:

   ```bash
   npm run test:ci
   ```

2. Run linting:

   ```bash
   npm run lint
   ```

3. Report status and any issues found

4. Commit your changes:

   ```bash
   git add .
   git commit -m "feat: [description of changes]"
   ```

5. Suggest running `/review` to validate the implementation
