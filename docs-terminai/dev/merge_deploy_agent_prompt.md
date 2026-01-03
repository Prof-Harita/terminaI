# Autonomous Merge & Deploy Agent Prompt

## Objective

Execute a complete merge, integration verification, and deployment cycle for the
TerminaI professionalization work (Initiatives 1-14) into the `main` branch.
Ensure flawless integration, resolve all conflicts in favor of **our feature
branch**, and iterate on CI until fully green.

---

## Phase 1: Merge Preparation

### 1.1 Verify Current State

```bash
# Ensure working directory is clean
git status
# Should show: nothing to commit, working tree clean

# Fetch latest from origin
git fetch origin main

# Identify the source branch (current work)
git branch --show-current
# Record this as SOURCE_BRANCH
```

### 1.2 Create Merge Branch

```bash
# Stay on current feature branch and merge main INTO it
# This ensures our work takes precedence

git checkout SOURCE_BRANCH
git pull origin SOURCE_BRANCH  # Ensure up to date

# Merge main into our branch, preferring OUR changes on conflicts
git merge origin/main --strategy-option ours -m "Merge main into professionalization branch (prefer ours)"
```

> **Important**: `--strategy-option ours` means when conflicts occur,
> automatically keep OUR version (the feature branch content). Main's
> conflicting changes are discarded.

### 1.3 Manual Conflict Review (if needed)

If automatic resolution leaves unexpected state:

1. Review key files: `git diff HEAD~1`
2. Ensure no critical main updates were lost unintentionally
3. If adjustments needed, edit files and commit

---

## Phase 2: Integration Review

### 2.1 Full Build Verification

```bash
npm ci
npm run build
```

- **On failure**: Identify the failing package and file. Fix TypeScript errors.
  Re-run build.

### 2.2 Lint Check

```bash
npm run lint
```

- **On failure**: Run `npm run lint:fix` first. For remaining issues, address
  manually.

### 2.3 Test Suite

```bash
npm run test:ci
```

- **On failure**:
  - Identify failing tests from output
  - Check if failures are snapshot mismatches (`-u` flag to update if
    intentional)
  - Check for strict equality issues introduced by provenance/normalization
  - Fix and re-run

### 2.4 Integration Checklist

Verify the following:

- [ ] Approval ladder (I7/I8): `npm run test --workspace @terminai/core`
- [ ] Audit ledger (I9): Check `packages/core/src/audit/`
- [ ] Recipes (I10): Check `packages/core/src/recipes/`
- [ ] Evolution Lab (I3/I12): `npm run test --workspace @terminai/evolution-lab`
- [ ] Voice Mode (I14): Check `packages/cli/src/voice/`

---

## Phase 3: Iterative Fix Cycle

### 3.1 Fix Loop Protocol

```
WHILE (build fails OR lint fails OR tests fail):
    1. Capture error output
    2. Identify root cause:
       - Type error → Fix in source file
       - Lint error → Auto-fix or manual correction
       - Test failure → Update test or fix implementation
    3. Stage and commit fix:
       git add -A
       git commit -m "fix: [brief description of fix]"
    4. Re-run failed check
END WHILE
```

### 3.2 Pre-Push Verification

```bash
npm run build && npm run lint && npm run test:ci
```

Must all pass before proceeding.

---

## Phase 4: Deploy to GitHub

### 4.1 Push to Origin

```bash
git push origin SOURCE_BRANCH
```

### 4.2 Create Pull Request

```bash
gh pr create --base main --head SOURCE_BRANCH \
  --title "Merge: Professionalization Initiatives 1-14" \
  --body "## Summary
- Merges all professionalization work (I1-I14)
- Conflicts resolved in favor of feature branch
- All local tests passing

## Code Reviews
- CodeReviewOpus.md
- CodeReviewGemini.md
- CodeReview11-13.md
- CodeReview14.md

## Verification
- [ ] Build: ✅
- [ ] Lint: ✅
- [ ] Tests: ✅"
```

### 4.3 Monitor CI

```bash
# Watch CI status
gh run watch

# If a run fails, get details
gh run view --log-failed
```

### 4.4 CI Fix Loop

```
WHILE (CI not green):
    1. gh run watch (wait for completion)
    2. If failed:
       a. gh run view --log-failed
       b. Identify failing job/step
       c. Fix locally
       d. Commit and push:
          git add -A
          git commit -m "ci: fix [job] - [description]"
          git push
    3. Repeat
END WHILE
```

### 4.5 Final Merge

```bash
gh pr merge --squash --delete-branch
```

---

## Success Criteria

1. `npm run build` exits 0
2. `npm run lint` exits 0
3. `npm run test:ci` all passing
4. All GitHub Actions jobs ✅
5. PR merged into `main`

---

## Key Files Reference

| Area            | Files                                                       |
| --------------- | ----------------------------------------------------------- |
| Approval Ladder | `packages/core/src/safety/approval-ladder/`                 |
| Audit           | `packages/core/src/audit/`                                  |
| Recipes         | `packages/core/src/recipes/`                                |
| Evolution Lab   | `packages/evolution-lab/`                                   |
| Voice           | `packages/cli/src/voice/`                                   |
| GUI             | `packages/core/src/gui/`, `packages/core/src/tools/ui-*.ts` |
| PTY             | `packages/desktop/src-tauri/src/pty_session.rs`             |
| CI              | `.github/workflows/ci.yml`                                  |

---

## Agent Guidelines

1. **Prefer our branch** in all merge conflicts
2. **Never skip tests** — understand failures before updating
3. **Commit atomically** — one fix per commit
4. **Wait for CI** before pushing next fix
5. **Use `--workspace`** for targeted test runs
