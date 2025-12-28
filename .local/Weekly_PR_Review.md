# Saturday Morning Sync Review

> **Time required:** ~8 minutes  
> **Trigger:** Saturday 9 AM CST (after Jules' overnight work)

---

## Step 1: Find Jules' PR

```bash
gh pr list --author "app/google-labs-jules"
```

Open it:

```bash
gh pr view <PR_NUMBER> --web
```

---

## Step 2: Read Release Notes (1 min)

Jules creates `.upstream/patches/YYYY-MM-DD/release_notes.md`.

Skim for:

- What upstream features are coming in
- Any breaking changes flagged
- Security fixes (these are always priority)

---

## Step 3: Check Classification (2 min)

Look at `classification.md`:

| Check      | Question                         |
| ---------- | -------------------------------- |
| CORE       | Are these truly safe to merge?   |
| FORK       | Did Jules reimplement correctly? |
| IRRELEVANT | Anything important missed?       |

---

## Step 4: Spot-Check FORK Reimplementations (3 min)

If Jules reimplemented FORK intent, do a quick sanity check:

- Does the code still have "TerminaI" branding? (not "Gemini")
- Does the logger still use JSONL pattern?
- Does `terminai.tsx` look correct?

```bash
gh pr diff <PR_NUMBER> --name-only | grep -E "terminai|logger"
```

If files touched, review those diffs.

---

## Step 5: Verify CI Green

Check the PR checks. All must be green:

- Tests pass
- Lint passes
- Build succeeds

---

## Step 6: Approve & Merge

```bash
gh pr review <PR_NUMBER> --approve -b "LGTM. Merging upstream sync."
gh pr merge <PR_NUMBER> --squash --delete-branch
```

---

## Step 7: Verify Issue Closed

The PR should have "Fixes #XX" which auto-closes the sync issue.

```bash
gh issue list --label upstream-sync
```

Should show no open issues (or close manually if needed).

---

## If Issues Found

Don't merge. Add comments to PR explaining what needs fixing.

Options:

1. **Minor fix:** Do it yourself, push, then merge
2. **Needs Jules:** Comment and wait for Monday

---

## Quick Reference

```bash
# List Jules' PRs
gh pr list --author "app/google-labs-jules"

# View PR
gh pr view <NUM> --web

# Check diff
gh pr diff <NUM>
gh pr diff <NUM> --name-only

# Approve & merge
gh pr review <NUM> --approve
gh pr merge <NUM> --squash --delete-branch
```
