# Implementation Tasks: Days 7-20 (CI Hardening)

**See also:** `docs-terminai/plans/days-7-20-ci-hardening-spec.md`

## Implementation Checklist

### Phase 0: CI Hygiene (Days 7-10)

- [ ] **Day 7**: Required Checks Policy
  - [ ] Identify and document required checks
  - [ ] Update branch protection rules (if admin) or document request
- [ ] **Day 8**: Demote Link Checking
  - [ ] Create `scripts/check-links.sh` (optional) or identify verify step
  - [ ] Modify `ci.yml` or create `links.yml` to run only on docs/schedule
  - [ ] Remove link checker from "Required" aggregate job
- [ ] **Day 9**: Forbidden Artifacts Gate
  - [ ] Create `scripts/ci/forbidden-artifacts.js` (detects binaries/builds in
        index/diff)
  - [ ] Add `forbidden_artifacts` job to `ci.yml` (runs first)
  - [ ] Verify failure with dummy PR
- [ ] **Day 10**: Sanitize Repo
  - [ ] Run `git rm --cached` on any existing forbidden artifacts
  - [ ] Commit removal
  - [ ] Verify `forbidden_artifacts` job passes on main

### Phase 1: Windows Parity (Days 11-14)

- [ ] **Day 11**: Diagnostic Logging
  - [ ] Update `ci.yml` Windows job to use `--verbose`
  - [ ] Add `npm config list`, `node -v` debugging steps
- [ ] **Day 12**: Safe Prepare
  - [ ] Create `scripts/prepare.js` (detects `CI` env var)
  - [ ] Update `package.json` `prepare` script to use `scripts/prepare.js`
- [ ] **Day 13**: Fix Windows Install
  - [ ] Diagnose actual root cause (likely `node-gyp` or path issues)
  - [ ] Apply fix (install build tools in CI, or fix path separators)
  - [ ] Verify `npm ci` passes deterministically on Windows
- [ ] **Day 14**: Windows Full Cycle
  - [ ] Add `npm run build` to Windows CI job
  - [ ] Add `npm test` to Windows CI job
  - [ ] Verify green run

### Phase 2: Hermetic Build (Day 15)

- [ ] **Day 15**: Docker Build Image
  - [ ] Create `docker/Dockerfile.ci`
  - [ ] Create `docker/ci-run.sh`
  - [ ] Verify local run matches CI behavior

### Phase 3: Native Modules & Versioning (Days 16-18)

- [ ] **Day 16**: Native Distribution
  - [ ] Document strategy (e.g., Prebuilds via GitHub Releases)
  - [ ] Update `.gitignore` and `forbidden-artifacts.js` if needed to enforce
- [ ] **Day 17**: Version Drift
  - [ ] Create `scripts/sync-versions.js` (or ensure existing works)
  - [ ] Add CI check `npm run sync-versions && git diff --exit-code`
- [ ] **Day 18**: Docs Determinism
  - [ ] Fix any nondeterministic output in settings docs generator
  - [ ] Add CI check for docs drift

### Phase 4: Stability (Days 19-20)

- [ ] **Day 19**: Fix Flaky Tests
  - [ ] Identify top 3 flaky tests
  - [ ] Add proper teardown (`afterEach`)
  - [ ] Verify stability
- [ ] **Day 20**: Windows Test Identity
  - [ ] Fix tests assuming Linux paths/`os.eol`
  - [ ] Enable previously skipped Windows tests

---

## Detailed Task Breakdown

### Day 7: Required Checks Policy

**Objective:** Ensure merges are blocked by the right signals.

**Files to modify:**

- `docs-terminai/governance.md` (or creating `docs-terminai/COMMIT_POLICY.md`)

**Detailed steps:**

1. List current checks using
   `gh api repos/:owner/:repo/branches/main/protection`.
2. Document strictly required checks: `ci` (the aggregator),
   `forbidden_artifacts`.
3. Document non-blocking checks: `link_checker`, `codeql`.

### Day 9: Forbidden Artifacts Gate

**Objective:** Hard fail on binary commits.

**Files to modify:**

- `scripts/ci/forbidden-artifacts.js` (NEW)
- `.github/workflows/ci.yml`

**Code Snippets:**

`scripts/ci/forbidden-artifacts.js`:

```javascript
const { execSync } = require('child_process');
const forbiddenExtensions = [
  '.node',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.o',
  '.obj',
  '.lib',
  '.a',
];
// ... implementation scanning git diff ...
```

**Definition of Done:**

- [ ] `node scripts/ci/forbidden-artifacts.js` fails if I
      `touch bad.exe && git add bad.exe`
- [ ] CI fails rapidly if a binary is pushed.

### Day 12: Implementation of Safe Prepare

**Objective:** Prevent `npm ci` from running build, lint, or husky in CI.

**Files to modify:**

- `package.json`
- `scripts/prepare.js` (NEW)

**Detailed steps:**

1. Move current `prepare` command string to `scripts/prepare.js` logic.
2. `scripts/prepare.js` checks `if (process.env.CI) process.exit(0);`.
3. Update `package.json`: `"prepare": "node scripts/prepare.js"`.

**Definition of Done:**

- [ ] `CI=1 npm run prepare` does nothing.
- [ ] `npm run prepare` (locally) installs husky.

### Day 15: Golden Docker Image

**Objective:** Reproducible Linux environment.

**Files to modify:**

- `docker/Dockerfile.ci`
- `docker/ci-run.sh`

**Code Snippets:**

`docker/Dockerfile.ci`:

```dockerfile
FROM node:20-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
```

**Definition of Done:**

- [ ] `docker build -f docker/Dockerfile.ci -t terminai-ci .` succeeds.
- [ ] `docker run -v $(pwd):/app terminai-ci npm test` succeeds.
