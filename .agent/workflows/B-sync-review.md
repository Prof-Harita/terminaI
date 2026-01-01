---
description: weekly upstream sync review process
---

# Saturday Morning Sync Review

// turbo-all

1. Find Jules' upstream sync PR:

   ```bash
   gh pr list --author "app/google-labs-jules"
   ```

2. View the PR details and classification file

3. Verify Jules' classification against `docs-terminai/FORK_ZONES.md`:
   - CORE commits should be safe to merge
   - FORK commits should be reimplemented, not merged directly
   - IRRELEVANT commits should be skipped

4. If FORK reimplementations exist, spot-check one for correct branding
   (TerminaI, not Gemini)

5. Verify CI is green on the PR

6. If all looks good, approve and merge:

   ```bash
   gh pr review <PR_NUMBER> --approve -b "LGTM. Merging upstream sync."
   gh pr merge <PR_NUMBER> --squash --delete-branch
   ```

7. Verify the linked issue was auto-closed
