---
description: Risk-weighted push with issue triage before correction
---

// turbo-all

# Push Bypass Workflow (Risk-Weighted)

Use this workflow to push while maintaining measured safety gates.
**Philosophy**: Triage all issues first, then apply risk-weighted fixes.

## 1. Check Working Directory

```bash
git status --short
```

## 2. Full Issue Discovery (Run Once, Report All)

Run all checks in **report-only mode** to capture issues before acting:

```bash
# Run lint (don't fix yet) and capture issues
npm run lint 2>&1 | tee /tmp/lint-issues.txt

# Run build and capture issues
npm run build:packages 2>&1 | tee /tmp/build-issues.txt

# Run tests and capture issues
npm run test:ci 2>&1 | tee /tmp/test-issues.txt
```

### 2.1 Summarize All Issues

**Present to user in a structured table:**

| Category  | Count | Action                              |
| --------- | ----- | ----------------------------------- |
| **Lint**  | N     | ✅ Fix 100% (auto-fix + manual)     |
| **Build** | N     | ✅ Fix 100% (critical, blocks push) |
| **Test**  | N     | ⚖️ Risk-Weighted (see triage below) |

## 3. Fix Lint & Build (100% Resolution)

These are non-negotiable and must be fully resolved:

```bash
# Auto-fix lint/format
npm run lint:fix
npm run format

# Verify build passes
npm run build:packages
```

- ❌ **If still fails**: STOP - report remaining issues for manual fix
- ✅ **If passes**: Proceed to test triage

## 4. Test Failure Triage (Risk-Weighted)

Consult `docs-terminai/CI_tech_debt.md` for known flaky patterns.

### 4.1 Classify Each Test Failure

| Failure Type              | Indicators                                      | Action                                       |
| ------------------------- | ----------------------------------------------- | -------------------------------------------- |
| **Windows Path Mismatch** | `os.platform`, `path.join`, `C:\Users` in stack | ⏭️ SKIP - Known flaky (tracked in tech debt) |
| **Timeout / Flaky**       | Same test passes locally on retry               | ⏭️ SKIP - Re-run in CI                       |
| **Real Bug**              | Consistent failure, logic error                 | ⛔ FIX before push                           |
| **New Test Failure**      | Introduced by current changes                   | ⛔ FIX before push                           |

### 4.2 Decision Flow

```
For each test failure:
  IF matches known flaky pattern (Windows path, timeout):
    → Log it, continue (CI will handle or we accept flake)
  ELSE IF failure is new (not in tech debt):
    → STOP, fix before push (this is a real bug)
  ELSE:
    → Ask user for guidance
```

## 5. Stage and Commit

```bash
git add -A
git commit -m "<message>" --no-verify
```

## 6. Push

```bash
git push origin main
```

- ❌ **If rejected**: `git pull --rebase origin main && git push origin main`

## 7. CI Monitoring

```bash
sleep 5
gh run watch -i 10 $(gh run list --commit $(git rev-parse HEAD) --limit 1 --json databaseId -q '.[0].databaseId')
```

### On CI Failure

```bash
gh run view $(gh run list --commit $(git rev-parse HEAD) --json databaseId -q '.[0].databaseId') --log-failed
```

Apply same triage logic:

- **Known flaky (Windows)**: Re-run with `gh run rerun <id> --failed`
- **Real issue**: Fix locally, amend, push

## 8. Success

```
✅ Push Successful (Risk-Weighted)

📝 Commit: <sha>
✅ Fixed: Lint (100%), Build (100%)
⚖️ Deferred: Test flakes (Windows path mismatch)

CI Status: Monitoring...
```

---

## Known Flaky Patterns (from Tech Debt)

Reference: `docs-terminai/CI_tech_debt.md`

| Pattern                               | Root Cause                            | Safe to Skip?  |
| ------------------------------------- | ------------------------------------- | -------------- |
| `ThemeManager` Windows failures       | OS Identity Mismatch                  | ✅ Yes         |
| `PolicyEngine` path assertions        | Linux mock on Windows runner          | ✅ Yes         |
| `path.startsWith('/home')` on Windows | Mocked Linux paths vs real Windows FS | ✅ Yes         |
| Timeout in integration tests          | Runner resource contention            | ✅ Yes (retry) |

---

## Quick Reference

**One-liner (after triage confirms green):**

```bash
npm run lint:fix && npm run format && npm run build:packages && \
git add -A && git commit -m "<message>" --no-verify && git push origin main
```
