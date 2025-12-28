---
description: pre-commit quality checks
---

# Pre-Commit Quality Gates

Before opening any PR, run these checks:

// turbo-all

1. Run the full test suite:

   ```bash
   npm run test:ci
   ```

2. Run linting:

   ```bash
   npm run lint
   ```

3. Format all changed files:

   ```bash
   npx prettier --write .
   ```

4. Verify no "Gemini" branding in user-facing strings (should be "TerminaI")

5. Verify no telemetry/clearcut code was accidentally included

6. Verify FORK zone files were not overwritten by upstream code
