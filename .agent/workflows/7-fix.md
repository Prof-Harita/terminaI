---
description: fix outstanding issues from code review
---

# Fix: Execute Outstanding Tasks

You are entering **fix mode**. The goal is to address all issues identified
during review.

## Prerequisites

- Completed `/review` with outstanding tasks identified
- Or explicit list of issues to fix

## Prioritization

Fix in this order:

1. **🚨 Critical** — Blockers, bugs, security issues
2. **⚠️ Important** — Should-fix quality issues
3. **💡 Suggestions** — Nice-to-have improvements (only if time permits)

## Fix Process

// turbo-all

For each issue:

1. **Locate**: Find the file and line

2. **Understand**: Confirm you understand the issue

3. **Fix**: Make the minimal change needed
   - Don't refactor unrelated code
   - Don't add features
   - Fix only what was flagged

4. **Verify**: Run related tests:

   ```bash
   npm test -- [relevant-test-file]
   ```

5. **Mark complete**: Update the outstanding tasks list

## After Each Fix

Brief status update:

```
✅ Fixed: [issue description] in [file.ts]
```

## After All Fixes

1. Run full test suite:

   ```bash
   npm run test:ci
   ```

2. Run linting:

   ```bash
   npm run lint
   ```

3. If any failures, report and address

4. Commit your fixes:

   ```bash
   git add .
   git commit -m "fix: [description of fixes]"
   ```

5. Suggest running `/final-review` for integrated verification
