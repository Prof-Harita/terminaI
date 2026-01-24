# CI hardening tasks (final bible)

**Purpose**: Give you a deterministic, low-maintenance CI system that stays
green locally and on GitHub Actions. This document is designed to be followed by
a less-capable agent step-by-step, with concrete verification at each step.

**Primary objective**: You can spend your time on product, not CI.

**Non-negotiable priorities**:

1. **Windows `npm ci` first**. If Windows cannot install deterministically, you
   do not have CI.
2. **Noise kill**. Docs/link drift must never mask “can we build and test?”
3. **Forbidden artifacts gate**. `.gitignore` is insufficient; CI must hard-fail
   forbidden binaries in PR diffs and in the repository.
4. **Linux hermetic native compilation** stays in plan, but it is not the first
   lever. Use Docker primarily as a prebuild factory and “golden environment”,
   not as a blanket replacement for Actions runners.

**How to use this document**:

- Execute tasks in order. Do not skip verification steps.
- Prefer small commits per task. Re-run CI after each commit.
- If you must deviate, document the deviation and the new invariant.

**References**:

- `docs-terminai/CI_Scorched_Earth_Roadmap.md` (strategy; this file
  operationalizes it and updates ordering)
- `docs-terminai/CI_tech_debt.md` (background; especially Windows parity
  guidance)
- `.github/workflows/ci.yml` (current gate; will be modified by these tasks)
- `scripts/verify-ci.sh` (local parity runner)

---

## Definitions and invariants

### Definition of “green deterministically”

- A fresh clone can run:
  - Linux: `npm ci && npm run preflight`
  - Windows: `npm ci && npm run build && npm test`
- GitHub Actions for a PR to `main` passes on required checks without retries.
- No one can accidentally commit platform-specific build outputs (human or bot).

### Invariants you must enforce

1. **One truth command**: `npm run preflight` is the canonical local+CI gate for
   Linux.
2. **Windows gate**: Windows must run an explicit deterministic sequence (at
   minimum `npm ci` + build + tests) on `windows-latest`.
3. **No tracked build outputs**:
   - Disallow committed artifacts (e.g., `packages/**/build/**`, `**/*.node`,
     `**/*.dll`, `**/*.exe`, `**/*.so`, `**/*.dylib`, `**/*.a`, `**/*.lib`,
     `**/*.o`, `**/*.obj`).
   - If they are already tracked, you must remove them from git history or at
     least from the branch state, and then enforce the rule.
4. **Noise gates cannot block core signal**:
   - Link checking, bundle-size, and similar “nice-to-have” checks must be
     non-blocking or must be path-filtered to only run when relevant.

---

## Phase 0: Restore CI signal (do this before deeper fixes)

### Task 0.1: Identify the “required checks” policy for merges

**Objective**: Make CI fail/succeed for the right reasons. Ensure that the
required checks for merging are only the strict code-health gates.

**Prerequisites**: None

**Actions**:

1. List required checks on `main` (if branch protection is enabled):
   - Use GitHub API:
     - `gh api repos/:owner/:repo/branches/main/protection --jq '.'`
2. Decide which checks must be required for merge:
   - Required: the aggregator job (typically the `ci` job in `ci.yml`)
   - Not required: link checker, CodeQL (unless policy demands), bundle size
     comments
3. If branch protection is not enabled, enable it and set required checks
   explicitly:
   - Use `gh api` to set branch protection and required checks (adapt to your
     repo):
     - `gh api -X PUT repos/:owner/:repo/branches/main/protection -f required_status_checks.strict=true -f enforce_admins=true`
     - Then set the required status checks contexts to the aggregator check
       name(s).

**Definition of done**:

- You can name the exact required checks (by check name) and document them in
  `docs-terminai/governance.md` or in this file.

---

### Task 0.2: Demote link checking so it does not block merges

**Objective**: Stop link checker failures (404s) from preventing you from
validating builds/tests.

**Files to inspect/modify**:

- `.github/workflows/ci.yml` (current `link_checker` job)
- Optionally `.github/workflows/links.yml` (if you move link checking out)

**Actions** (choose one path and implement it fully):

**Path A (recommended): run link checker only on docs changes**

1. Update `.github/workflows/ci.yml`:
   - Add a conditional to `link_checker` so it only runs when relevant paths
     change (docs/markdown).
   - If path filtering is hard in your current workflow, split link checker into
     a separate workflow that triggers on paths.
2. Ensure that the `ci` aggregator job does **not** require `link_checker` to
   succeed for a merge.

**Concrete implementation note**:

- GitHub Actions does not provide a simple built-in “files changed” boolean
  without an extra step.
- The most agent-proof approach is to move link checking into its own workflow:
  - `on: pull_request` with `paths: ['docs/**', 'docs-terminai/**', '**/*.md']`
  - `on: schedule` nightly
  - remove `link_checker` from `ci.yml` entirely (so it cannot block merges)

**Path B: run link checker on schedule only**

1. Remove `link_checker` from `ci.yml`.
2. Create a new workflow (for example `.github/workflows/links.yml`) that runs
   nightly and on manual dispatch.

**Verification**:

- Trigger CI for a PR with only code changes and confirm link checking does not
  run (or does not block).
- Trigger link checking intentionally with a docs-only PR (or run scheduled
  workflow) and confirm it still works.

---

### Task 0.3: Add a first-job “forbidden artifacts” gate (hard fail)

**Objective**: Prevent the “recursion loop” incident permanently by failing PRs
that contain forbidden binaries or build outputs.

**Key principle**: `.gitignore` is not enforcement. CI must block the PR.

**Files to add/modify**:

- Add a script: `scripts/ci/forbidden-artifacts.js` (or similar)
- Update `.github/workflows/ci.yml` to run it as the first job (before
  lint/build/tests)

**Actions**:

1. Implement the script to fail if:
   - Any forbidden file exists in the repository at checkout time, or
   - Any forbidden file is present in the PR diff (preferred), or both.
2. Start with these patterns (expand as needed):
   - Forbidden paths:
     - `packages/**/build/**`
     - `packages/**/dist/**` (if dist is generated; allowlist exceptions if
       required)
     - `packages/**/coverage/**`
   - Forbidden extensions:
     - `.node`, `.dll`, `.exe`, `.so`, `.dylib`, `.a`, `.lib`, `.o`, `.obj`
3. Add an allowlist mechanism for rare legitimate binaries (if any), and
   document it in the script.
4. Add the job to `.github/workflows/ci.yml` as a dependency for all other jobs.

**Suggested script behavior (agent-proof)**:

- For pull requests:
  - `git fetch origin main --depth=1`
  - scan `git diff --name-only origin/main...HEAD`
- For pushes:
  - scan `git ls-files`

**Error message requirements**:

- Print the exact offending paths.
- Print the exact remediation steps (for example `git rm --cached <path>` and
  “add to .gitignore”).

**Verification**:

- Create a throwaway branch/PR that adds a dummy forbidden file and confirm CI
  fails with a clear error message.
- Ensure normal PRs pass this job quickly.

---

### Task 0.4: Sanitize the repository state (remove currently tracked artifacts)

**Objective**: If forbidden artifacts are already tracked, you must remove them
or your new gate will either (a) fail forever, or (b) be forced to allowlist the
very thing you want to prevent.

**Known high-risk example** (verify on your current branch):

- `packages/cli/build/Release/terminai_native.node` (an ELF `.node` binary)
  should not be tracked.

**Actions**:

1. Inventory tracked artifacts:
   - `git ls-files | rg -n '^packages/cli/build/'`
   - Also search for `*.node`:
     - `git ls-files | rg -n '\\.node$'`
2. Remove them from the index:
   - `git rm -r --cached packages/cli/build`
   - Repeat for any other artifact directories.
3. Add `.gitignore` entries so they never reappear.
4. Commit and push.

**Verification**:

- `git ls-files | rg -n '^packages/cli/build/'` returns no results.
- `git ls-files | rg -n '\\.node$'` returns no results.
- `git ls-files | rg -n '\\.(dll|exe|so|dylib|a|lib|o|obj)$'` returns no
  results.
- Your forbidden-artifacts CI job passes on `main`.

---

## Phase 1: Fix Windows `npm ci` deterministically (P0)

### Task 1.1: Turn Windows install into a diagnostic incident

**Objective**: Make the Windows failure actionable by capturing the full,
precise failure logs.

**Files to modify**:

- `.github/workflows/ci.yml` (`windows_build` job)

**Actions**:

1. Add diagnostic steps before `npm ci`:
   - `node -v`
   - `npm -v`
   - `npm config list`
   - `git --version`
   - `python --version` and `python3 --version` (if present)
   - Print MSVC info if available (for example via `vswhere` if installed)
2. Run install with high verbosity:
   - `npm ci --verbose`
3. If `npm ci` fails, ensure the job prints:
   - the failing package name
   - the script being executed (install/postinstall/prepare)

**Verification**:

- Trigger CI and confirm the Windows job logs contain enough information to
  identify the failing package and step.

---

### Task 1.2: Eliminate “install-time” side effects in CI (especially `prepare`)

**Objective**: Make `npm ci` do only dependency installation. Anything else
should run as explicit CI steps.

**Why this matters**: If your root `package.json` runs heavyweight scripts
during `prepare`, Windows install can fail before you even build/test. This is a
common CI instability source.

**Files to inspect/modify**:

- `package.json` at repo root (`scripts.prepare`)
- Any install hooks that run during `npm ci` (root and workspaces)
- `.github/workflows/ci.yml`

**Actions**:

1. Decide what `prepare` should do:
   - Recommended: `prepare` only sets up local dev hooks (husky), and it must
     no-op in CI.
2. Implement a guarded prepare:
   - Replace `prepare` with a node script (for example
     `node scripts/prepare.js`) that:
     - exits early when `process.env.CI` is set
     - optionally exits early when `process.env.HUSKY === '0'`
3. Move any required “bundle” or “generate” steps into CI explicit steps after
   `npm ci`.

**Concrete implementation pattern**:

- Root `package.json`:
  - Replace `prepare: "husky && npm run bundle"` with
    `prepare: "node scripts/prepare.js"`
- New `scripts/prepare.js`:
  - If `CI=1`, print “Skipping prepare in CI” and exit 0.
  - Otherwise run husky (and only run bundle locally if you have a strong
    reason).
- Update CI:
  - Ensure `npm run bundle` (if needed) runs as an explicit workflow step after
    `npm ci`.

**Verification**:

- On Windows CI, `npm ci` completes without running bundle/generate steps
  implicitly.
- Linux CI still runs bundling explicitly where required.

---

### Task 1.3: Fix the Windows install failure at its true root cause

**Objective**: Make `npm ci` succeed on `windows-latest` with a fresh checkout.

**Decision tree (follow in order)**:

1. If failure is in a native module build (`node-gyp`):
   - Ensure Windows toolchain prerequisites are installed/configured in CI:
     - MSVC Build Tools
     - Python
     - Correct `msvs_version` (if needed)
   - Ensure your dependency versions are compatible with Node in `.nvmrc`.
2. If failure is in a postinstall/prepare script:
   - Make it CI-safe or CI-skipped.
   - Prefer explicit CI steps, not install-time work.
3. If failure is from path/OS assumptions:
   - Fix scripts that use bash-only syntax.
   - Fix path handling to be Windows-safe.
4. If failure is from dependency tree / lockfile corruption:
   - Recreate lockfile deterministically (document the exact Node/npm versions
     used).
   - Ensure `npm ci` works on both Linux and Windows with the same lockfile.

**Verification**:

- The Windows CI job passes `npm ci` on:
  - `pull_request` events
  - `push` to `main`
  - `workflow_dispatch`

---

### Task 1.4: Ensure Windows runs meaningful build+test (not just install)

**Objective**: Avoid a “green install but red product” situation.

**Actions**:

1. After Windows `npm ci`, run:
   - `npm run build`
   - `npm test --if-present` (or the exact Windows-safe test command you choose)
2. Ensure the Windows job does not silently skip critical tests.

**Verification**:

- Windows job proves at least:
  - TypeScript build succeeds
  - Core test suites execute (or are explicitly skipped with justification and
    tracking)

---

## Phase 2: Make the Linux gate hermetic (Docker as a controlled factory)

### Task 2.1: Add a golden Linux build image

**Objective**: Provide one stable Linux environment for native compilation and
reproducible builds.

**Files to add**:

- `docker/Dockerfile.ci`
- `docker/ci-run.sh` (optional wrapper)

**Actions**:

1. Create `docker/Dockerfile.ci` with:
   - Node version aligned with `.nvmrc`
   - Native build toolchain packages required for node-gyp
2. Add a wrapper script that:
   - mounts the repo
   - uses npm cache mounts if possible
   - runs `npm ci` and the required build/test commands

**Verification**:

- You can run locally on Linux:
  - `docker build -f docker/Dockerfile.ci -t terminai-ci .`
  - `docker run --rm -v \"$PWD:/app\" -w /app terminai-ci npm run preflight`

---

### Task 2.2: Decide Docker’s role (do not overuse it)

**Objective**: Keep maintenance low.

**Recommended policy**:

- PR gating runs on GitHub hosted runners (fast, cached).
- Docker is used for:
  - native-module prebuild production
  - release/nightly “golden environment” runs

**Actions**:

1. If you choose to run PR gates inside Docker, ensure you also:
   - implement caching (or accept slower CI)
   - document why Docker is worth the cost

**Verification**:

- CI duration is acceptable and stable.

---

## Phase 3: Native module strategy (stop rebuilding everywhere)

### Task 3.1: Choose the native distribution model

**Objective**: Prevent the “works on my machine” native loop permanently.

**Choose one**:

1. **Prebuilds (recommended)**:
   - CI builds `terminai_native` per platform and publishes artifacts for
     release.
   - Runtime prefers prebuilds; source compilation is dev-only fallback.
2. **Build-from-source always**:
   - CI installs toolchains on every platform and compiles in every PR.

**Verification**:

- You can explain how a contributor on any OS gets a working native module
  without committing artifacts.

---

### Task 3.2: Implement “no binary commits” as a layered policy

**Objective**: Make it impossible to commit build outputs accidentally.

**Actions**:

1. `.gitignore` for generated paths (still useful, but not sufficient).
2. Pre-commit hook (local developer experience).
3. CI forbidden-artifacts job (enforcement).
4. Optional: server-side branch protection requiring the forbidden-artifacts
   check.

**Verification**:

- A PR that attempts to add a `.node` file is blocked deterministically.

---

## Phase 4: Reduce policy drift gates (versions, docs, formatting)

### Task 4.1: Version alignment failures must be either automatic or release-only

**Objective**: Stop random PR failures from “version drift” while keeping
release safety.

**Actions** (choose one path):

**Path A (recommended): automatic regeneration gate**

1. Add a single script that:
   - synchronizes versions
   - rewrites required files
2. In CI, run the script and fail if it produces a diff:
   - `git diff --exit-code`

**Path B: enforce only on release**

1. Move version alignment checks out of PR gate.
2. Enforce them in release workflows.

**Verification**:

- PRs do not fail due to version drift unless the contributor truly broke a
  required invariant.

---

### Task 4.2: Settings docs must be deterministic

**Objective**: Prevent “Verify settings docs” failures that are caused by
nondeterministic generation.

**Actions**:

1. Ensure `npm run predocs:settings` and `npm run docs:settings -- --check` are
   deterministic.
2. If generation depends on environment, pin versions and normalize outputs.

**Verification**:

- Running the docs generation twice yields no diff.

---

## Phase 5: Test determinism and Windows parity (after CI is installable)

### Task 5.1: Fix flaky suites with strict teardown

**Objective**: Remove state leaks (for example `gemini.test.tsx` “phase already
active”).

**Actions**:

1. For each flaky file:
   - add `afterEach` that closes servers, resets singletons, clears env, and
     restores mocks
2. Add a “repeat test” job (optional) that runs a small critical subset multiple
   times to detect flake.

**Verification**:

- Run the critical suite 10 times without failure.

---

### Task 5.2: Fix Windows OS identity mismatch in tests

**Objective**: Stop tests from pretending they run on Linux while using Windows
paths.

**Reference**: `docs-terminai/CI_tech_debt.md` (Windows CI flakiness section).

**Actions**:

1. Remove tests that mock `os.platform()` without also normalizing filesystem
   behavior.
2. Use a virtual filesystem (for example `memfs`) when simulating another OS.
3. Prefer platform-agnostic path building in tests:
   - never hardcode `/home/user/...`
   - use `path.join(os.tmpdir(), ...)` or fixture helpers

**Verification**:

- The same tests pass on Linux and Windows without conditional skipping except
  where truly necessary.

---

## Phase 6: Workflow consolidation (optional, but recommended for long-term health)

### Task 6.1: Reduce workflow count to a maintainable core

**Objective**: Reduce workflow spaghetti and unknown interactions.

**Actions**:

1. Identify “core workflows”:
   - PR gatekeeper (CI)
   - Release
   - Nightly matrix
2. Move non-core workflows to:
   - scheduled runs
   - manual runs
   - or delete/archive

**Verification**:

- You can explain, in one paragraph, what runs on PR and why.

---

## Phase 7: Manual verification (do this last)

You should only do this phase after:

- Linux CI is green.
- Windows CI is green (install + build + tests).
- Forbidden artifacts gate is in place and the repo state is sanitized.

### Task 7.1: Windows developer machine readiness

**Objective**: Confirm you can develop on Windows without CI surprises.

**Actions**:

1. On a Windows machine, run:
   - `npm ci`
   - `npm run build`
   - `npm test`
2. If you ship native modules, verify the native path you expect is correct and
   does not require committed artifacts.

**Verification**:

- You can repeat the above after a clean checkout and get the same results.

---

## Completion criteria (final)

- PR gate passes on Linux + Windows deterministically.
- Link checking does not block code merges.
- Forbidden binaries/artifacts are blocked at CI level.
- The repo contains no tracked build outputs.
- Linux native compilation has a documented, reproducible golden environment
  (Docker) and a defined distribution strategy (ideally prebuilds).
