---
description: Commit, resolve issues, push, and monitor until all CI checks pass
---

// turbo-all

# Push to Origin Workflow

Use this workflow when ready to push changes to `origin/main`. This workflow
handles everything from local quality checks through CI monitoring until all
GitHub checks are green.

**Scope**: Everything except releases (NPM publish and binary builds are handled
by `/release`)

## 1. Pre-Commit Validation

**Objective**: Catch issues locally before they reach CI.

### 1.1 Check Working Directory Status

```bash
git status --short
```

- **If no changes**: STOP and inform user "No changes to commit"
- **If changes exist**: Proceed to quality checks
- **Capture**: Note if there are untracked files that might need to be added

### 1.2 Run Local Quality Gates

```bash
npm run preflight
```

- ✅ **If passes**: Proceed to commit
- ❌ **If fails**: Jump to **Section 2: Issue Resolution**

## 2. Issue Resolution Loop

**Objective**: Fix all local quality issues before attempting to push.

### 2.1 Identify Failure Type

Parse the preflight output to categorize failures:

| Error Type        | Identification                   | Fix Strategy                             |
| ----------------- | -------------------------------- | ---------------------------------------- |
| **Lint errors**   | ESLint output with file:line:col | Run `npm run lint:fix`, review remaining |
| **Type errors**   | TypeScript errors with TS codes  | Fix type issues one by one               |
| **Test failures** | Jest/Vitest test failures        | Debug and fix failing tests              |
| **Build errors**  | Compilation failures             | Fix syntax/import errors                 |
| **Prettier**      | Formatting issues                | Run `npm run format`                     |

### 2.2 Auto-Fix What's Possible

```bash
# Fix linting
npm run lint:fix

# Fix formatting
npm run format

# Re-run preflight
npm run preflight
```

- ✅ **If now passes**: Proceed to commit
- ❌ **If still fails**: Report remaining issues to user and ask for guidance

### 2.3 Manual Fix Loop

For issues that can't be auto-fixed:

1. **Report** specific failures with file paths and error messages
2. **Analyze** the root cause
3. **Fix** the issues (edit files as needed)
4. **Verify** by re-running `npm run preflight`
5. **Repeat** until all checks pass

**Stop Condition**: Ask user if they want to:

- Continue fixing issues
- Commit with `--no-verify` (skip pre-commit hooks)
- Abort the push

## 3. Staging and Commit

**Objective**: Create a clean commit with all relevant changes.

### 3.1 Stage Changes

```bash
# Add all tracked files
git add -u

# Check for new files
git status --short | grep '^??'
```

- **If untracked files found**: Ask user which to include
- **Stage selected files**: `git add <files>`

### 3.2 Create Commit

```bash
git commit -m "<commit-message>"
```

**Commit Message Strategy**:

- **If user provided message**: Use it
- **If amending**: `git commit --amend --no-edit`
- **Otherwise**: Ask user for commit message with conventional commits format
  suggestion:
  - `feat: <description>` - New feature
  - `fix: <description>` - Bug fix
  - `chore: <description>` - Maintenance
  - `refactor: <description>` - Code restructuring
  - `test: <description>` - Test updates
  - `docs: <description>` - Documentation

## 4. Push to Origin

**Objective**: Push changes to remote and prepare for CI monitoring.

### 4.1 Execute Push

```bash
git push origin main
```

- ✅ **If successful**: Proceed to CI monitoring
- ❌ **If fails with "rejected - non-fast-forward"**:
  - Pull with rebase: `git pull --rebase origin main`
  - Resolve conflicts if any (ask user for guidance)
  - Retry push
- ❌ **If fails with permission error**: STOP and report auth issue

### 4.2 Capture Push Information

```bash
# Get the commit SHA that was just pushed
git rev-parse HEAD
```

Store this for CI monitoring.

## 5. CI Monitoring (Token-Efficient)

> [!IMPORTANT] **Agent Directive**: You MUST use the `gh` commands below for
> monitoring. DO NOT use the browser tool to check CI status. DO NOT assume CI
> is finished until you see a success/failure conclusion.

**Objective**: Monitor GitHub Actions until all checks pass, using minimal token
budget.

### 5.1 Get Triggered Workflows

Wait briefly for GitHub to register the push, then fetch workflows:

```bash
# Wait 5 seconds for GitHub to register the push
sleep 5

# Get all workflows triggered by the latest commit
gh run list --commit $(git rev-parse HEAD) --json databaseId,name,status,conclusion,workflowName
```

**Expected Workflows** (based on your repo):

- Main CI workflow (tests, lint, typecheck)
- Any other PR checks

### 5.2 Monitor Primary CI Workflow

```bash
# Watch the main CI workflow (adjust name if needed)
gh run watch -i 10 $(gh run list --workflow ci.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

**Monitoring Strategy** (token-efficient):

- Use `-i 10` for 10-second intervals (balance between responsiveness and token
  usage)
- Only watch one workflow at a time
- The `watch` command will exit when workflow completes

### 5.3 Check Workflow Results

```bash
# Get the conclusion of all runs for this commit
gh run list --commit $(git rev-parse HEAD) --json name,conclusion,status --jq '.[] | {name, conclusion, status}'
```

Parse results:

- ✅ **All workflows**: `conclusion: "success"` → Proceed to success
  notification
- ❌ **Any workflow**: `conclusion: "failure"` → Jump to **Section 6: CI Failure
  Handling**
- ⏳ **Any workflow**: `status: "in_progress"` → Continue monitoring next
  workflow

### 5.4 Multi-Workflow Monitoring

If multiple workflows are running, monitor them sequentially:

```bash
# Get all in-progress or queued workflows for this commit
gh run list --commit $(git rev-parse HEAD) --json databaseId,name,status --jq '.[] | select(.status == "in_progress" or .status == "queued") | .databaseId'
```

For each workflow ID, watch until completion, then move to next.

## 6. CI Failure Handling

**Objective**: Diagnose and fix CI failures, then retry.

### 6.1 Identify Failed Workflow

```bash
# Get failed workflows with URLs
gh run list --commit $(git rev-parse HEAD) --json name,conclusion,url --jq '.[] | select(.conclusion == "failure")'
```

### 6.2 Fetch Failure Logs (Token-Efficient)

```bash
# Get the specific failed job within the workflow
gh run view $(gh run list --commit $(git rev-parse HEAD) --json databaseId -q '.[0].databaseId') --log-failed
```

This only fetches logs for failed jobs, not the entire run.

### 6.3 Analyze and Fix

1. **Parse error messages** from logs
2. **Categorize failure**:
   - Lint errors → Fix locally and push again
   - Test failures → Fix tests and push again
   - Build errors → Fix build issues and push again
   - Flaky tests → Re-run workflow (see 6.4)
   - Infrastructure issues → Check GitHub status, wait and retry

3. **Fix issues locally**:
   - Make necessary code changes
   - Re-run `npm run preflight` to verify
   - Commit fixes: `git commit -am "fix: resolve CI issues"`
   - Return to **Section 4: Push to Origin**

### 6.4 Re-run Failed Workflow (for flaky tests)

```bash
# Re-run only failed jobs
gh run rerun $(gh run list --commit $(git rev-parse HEAD) --json databaseId -q '.[0].databaseId') --failed
```

Then return to **Section 5.2** to monitor the re-run.

## 7. Success Notification

**Objective**: Confirm all checks passed and provide summary.

### 7.1 Generate Summary

```bash
# Get final status of all workflows
gh run list --commit $(git rev-parse HEAD) --json name,conclusion,url,workflowName,updatedAt
```

### 7.2 Report to User

```
✅ Push Successful - All CI Checks Passed

📝 Commit: <commit-sha>
🌿 Branch: main
⏱️ Push Time: <timestamp>

✓ Workflows Passed:
  • <workflow-1-name>
  • <workflow-2-name>
  • <workflow-3-name>

🔗 View on GitHub: <commit-url>

🎯 Status: Ready for release (use /release when ready)
```

### 7.3 Cleanup

```bash
# Optional: Clean up any local artifacts
rm -rf node_modules/.cache
```

## 8. Token Optimization Tips

**For Agent Reference**: How to keep this workflow token-efficient.

### Use Targeted gh Commands

```bash
# ❌ Avoid: Fetching all workflow data
gh run list --limit 100

# ✅ Better: Fetch only what's needed for this commit
gh run list --commit $(git rev-parse HEAD) --limit 5

# ✅ Best: Use JQ to filter fields
gh run list --commit $(git rev-parse HEAD) --json databaseId,conclusion --jq '.[].conclusion'
```

### Batch Checks Instead of Polling

```bash
# ❌ Avoid: Polling every 2 seconds
while true; do gh run list; sleep 2; done

# ✅ Better: Use gh run watch with reasonable intervals
gh run watch -i 10 <run-id>

# ✅ Best: Check once after expected duration
sleep 60 && gh run view <run-id> --json conclusion
```

### Minimize Log Fetching

```bash
# ❌ Avoid: Full logs
gh run view <run-id> --log

# ✅ Better: Only failed jobs
gh run view <run-id> --log-failed

# ✅ Best: Specific job only
gh run view <run-id> --job <job-id> --log
```

## 9. Quick Reference

**Happy Path Command Sequence**:

```bash
# 1. Validate
npm run preflight

# 2. Commit
git add -u
git commit -m "feat: <description>"

# 3. Push
git push origin main

# 4. Monitor
export COMMIT_SHA=$(git rev-parse HEAD)
sleep 5
gh run watch -i 10 $(gh run list --commit $COMMIT_SHA --limit 1 --json databaseId -q '.[0].databaseId')

# 5. Verify
gh run list --commit $COMMIT_SHA --json conclusion --jq '.[].conclusion'
```

**Common Fix Patterns**:

```bash
# Auto-fix lint and format
npm run lint:fix && npm run format && npm run preflight

# Amend and force push (use carefully)
git commit --amend --no-edit && git push --force-with-lease

# Pull and rebase on rejection
git pull --rebase origin main && git push origin main
```

---

**Agent Notes**:

- Monitor CI status every 10 seconds (token-efficient balance)
- Only fetch logs for failed jobs, never full workflow logs
- Always scope `gh run list` to the specific commit with `--commit`
- Use `--limit` to cap results (usually 1-5 is sufficient)
- If stuck in monitoring loop >10 minutes, check for queued workflows
- Stop monitoring after 3 consecutive failures and ask user for guidance
