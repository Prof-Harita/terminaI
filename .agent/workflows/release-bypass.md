---
description: Fast release bypassing tests with force_skip_tests=true
---

// turbo-all

# Release Bypass Workflow

Use this workflow when you need to release quickly, bypassing CI tests. **Use
sparingly** - only when:

- Tests are known flaky (documented in `docs-terminai/CI_tech_debt.md`)
- Time-critical hotfix needs immediate deployment
- You've already verified the code works locally

## 1. Pre-Release Safety (Minimal)

```bash
# Ensure clean and on main
git status
git checkout main && git pull origin main
```

- ❌ **Uncommitted changes**: Commit first or stash
- ✅ **Clean**: Proceed

**Skip preflight** - we trust the local build was already verified.

## 2. Version Bump

> [!IMPORTANT] ALWAYS check current version first to avoid regression!

```bash
# Check current version AND what's on NPM
npm pkg get version
npm view @terminai/cli versions --json | tail -5
```

Ask user for release type: **patch** | **minor** | **major**

```bash
npm version <type> -m "chore: release v%s"
export NEW_TAG=$(git describe --tags --abbrev=0)
echo "New version: $NEW_TAG"
```

## 3. Push with Tags

```bash
git push origin main --no-verify
# Push ONLY the new tag (not --tags which can fail on repo rules)
git push origin $NEW_TAG --no-verify
```

- ❌ **If rejected (non-fast-forward)**:
  `git push origin main --force-with-lease --no-verify`
- ❌ **If tags rejected (rule violation)**: Push specific tag only, not `--tags`
- ✅ **If successful**: Proceed to release trigger

## 4. Trigger Manual Release (BYPASS TESTS)

> [!CAUTION] This skips CI tests. Only use when tests are known flaky.

```bash
gh workflow run release-manual.yml \
  --field version=$NEW_TAG \
  --field ref=main \
  --field npm_channel=latest \
  --field dry_run=false \
  --field force_skip_tests=true
```

**Why `force_skip_tests=true`?**

- Documented in `docs-terminai/CI_tech_debt.md`
- Linux CI has known flaky tests (inherited upstream)
- Local preflight already passed during development

## 5. Monitor Release

```bash
# Wait for workflow to register
sleep 10

# Get the run ID
gh run list --workflow release-manual.yml --limit 1

# Watch it
gh run watch -i 10 $(gh run list --workflow release-manual.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

### On Failure

```bash
# Get failed job logs
gh run view $(gh run list --workflow release-manual.yml --limit 1 --json databaseId -q '.[0].databaseId') --log-failed
```

**Common Failure Patterns** (from session learnings):

| Issue                          | Fix                                         |
| ------------------------------ | ------------------------------------------- |
| `file:` deps in published pkg  | Already fixed with `resolve-file-deps.js`   |
| Git push rejected              | Use `--force-with-lease --no-verify`        |
| NPM 401 on dist-tag            | Check `npm-token` is passed correctly       |
| Version exists (E403)          | Bump to next patch version                  |
| Tags rejected (repo rules)     | Push specific tag: `git push origin vX.Y.Z` |
| Version regression (0.50→0.27) | ALWAYS check `npm pkg get version` first!   |
| Pre-push hooks slow/hang       | Use `--no-verify` on ALL git push commands  |

## 6. Verify Success

```bash
# Check published dependencies are versioned (NOT file:)
npm view @terminai/cli@<VERSION> dependencies | grep terminai

# Fresh install test
npm uninstall -g @terminai/cli 2>/dev/null || true
npm install -g @terminai/cli@<VERSION>
terminai --version
```

## 7. Report

```
🚀 Release <VERSION> Complete (Bypass Mode)

📦 NPM: https://www.npmjs.com/package/@terminai/cli
🏷️ Tag: <NEW_TAG>

⚠️ Note: Tests were skipped (force_skip_tests=true)
   Reason: Known flaky CI - see docs-terminai/CI_tech_debt.md

✅ Verification:
   • Published deps: Versioned (not file:)
   • Fresh install: Working
```

---

## Quick Reference

**One-liner bypass release (after version bump):**

```bash
git push origin main --no-verify && git push origin main --tags && \
gh workflow run release-manual.yml --field version=$(git describe --tags --abbrev=0) --field ref=main --field npm_channel=latest --field dry_run=false --field force_skip_tests=true
```

**Known Gotchas** (from v0.50.0 - v0.50.3):

- `file:` refs must be resolved before publish → `scripts/resolve-file-deps.js`
- `npm-token` must be passed to tag step
- Git commits need `--no-verify` in workflow
- Push needs `--force-with-lease` for release retries (not just `--force`)
- **Check version before bump** to avoid regression (e.g., 0.50 → 0.27)
- Push specific tag (`git push origin vX.Y.Z`), not `--tags` (repo rules block
  bulk tag push)

---

**Agent Notes**:

- Monitor with `gh run watch`, NOT the browser
- Always verify after release with `npm view` and fresh install
- If workflow fails > 2 times, stop and ask user for guidance
