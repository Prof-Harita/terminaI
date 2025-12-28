# Master Prompt: Weekly Upstream PR Review

> **Purpose:** Guide a weekly review session of Jules' upstream sync PR  
> **Trigger:** Every Saturday (or upon Jules PR creation)  
> **Estimated Time:** ~15-20 minutes

---

## Pre-Requisites

Before executing this prompt:

1. Ensure an open upstream sync PR from `google-labs-jules[bot]` exists.
2. Have access to the following reference documents:
   - [FORK_ZONES.md](../docs-terminai/FORK_ZONES.md) — Classification rules
   - [upstream_maintenance.md](../docs-terminai/upstream_maintenance.md) —
     Strategy overview

---

## Step 1: Find the Latest PR

Automatically get the most recent upstream sync PR from Jules:

```bash
# Get the latest Jules PR number (open PRs only)
LATEST_PR=$(gh pr list --author "app/google-labs-jules" --state open --json number --jq '.[0].number')
echo "Latest Jules PR: #$LATEST_PR"

# Open in browser
gh pr view $LATEST_PR --web
```

If no open PR exists, check all recent PRs:

```bash
gh pr list --author "app/google-labs-jules" --state all --limit 5
```

---

## Step 2: Validate Jules' Classification

Jules creates a classification in `.upstream/patches/<DATE>/classification.md`.

Review each section against [FORK_ZONES.md](../docs-terminai/FORK_ZONES.md):

| Zone              | Criteria                                 | Action if Misclassified           |
| ----------------- | ---------------------------------------- | --------------------------------- |
| 🟢 **CORE**       | General features, security, tools, utils | Should be safe to merge           |
| 🟡 **FORK**       | Files we've diverged (logger, voice)     | Create issue for reimplementation |
| ⚪ **IRRELEVANT** | Telemetry, themes, Google-specific       | Confirm skip, no further action   |

### Questions to Ask:

1. Are all CORE commits truly safe to merge? Any breaking changes?
2. Are FORK commits properly flagged? Do we need to adapt their intent?
3. Are any important updates classified as IRRELEVANT by mistake?

---

## Step 3: Inspect Changed Files

Jules also creates `commits.txt` and `files.txt` in the patches directory.

For a quick overview:

```bash
gh pr diff <PR_NUMBER> --name-only
```

For the full diff:

```bash
gh pr diff <PR_NUMBER>
```

---

## Step 4: Run Tests (if merging CORE)

If the PR contains CORE changes you intend to merge:

```bash
npm run test:ci
npm run lint
```

---

## Step 5: Approve or Request Changes

### If classification is correct:

1. Mark PR as "Ready for Review" (if draft).
2. Approve via:
   ```bash
   gh pr review <PR_NUMBER> --approve -b "Classification verified. Merging CORE changes."
   ```
3. Merge with:
   ```bash
   gh pr merge <PR_NUMBER> --squash
   ```

### If classification has issues:

1. Comment on the PR with specific corrections.
2. Close the PR without merging (or request Jules to re-analyze if possible).

---

## Step 6: Update Absorption Log

After merging, record the absorbed commits:

```bash
# Add entry to .upstream/absorption-log.md
echo "| $(date +%Y-%m-%d) | v<upstream_version> | Merged <N> CORE commits | PR #<PR_NUMBER> |" >> .upstream/absorption-log.md
git add .upstream/absorption-log.md
git commit -m "chore: update absorption log for $(date +%Y-%m-%d)"
git push
```

---

## Step 7: Close the Tracking Issue

Jules links the sync issue in the PR description (e.g., "Fixes #15"). Verify the
issue is auto-closed upon merge. If not:

```bash
gh issue close <ISSUE_NUMBER>
```

---

## Success Checklist

- [ ] Opened and reviewed the PR
- [ ] Validated classification against FORK_ZONES.md
- [ ] Ran tests for CORE changes (if applicable)
- [ ] Approved or requested changes
- [ ] Merged the PR (if approved)
- [ ] Updated `.upstream/absorption-log.md`
- [ ] Verified tracking issue is closed

---

## Quick Reference Commands

```bash
# List Jules PRs
gh pr list --author "app/google-labs-jules"

# View PR
gh pr view <PR_NUMBER>
gh pr view <PR_NUMBER> --web

# Diff
gh pr diff <PR_NUMBER>
gh pr diff <PR_NUMBER> --name-only

# Approve & Merge
gh pr review <PR_NUMBER> --approve
gh pr merge <PR_NUMBER> --squash

# Close issue
gh issue close <ISSUE_NUMBER>
```
