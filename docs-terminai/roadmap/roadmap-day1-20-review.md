# Prompt: Day 1–20 roadmap review (full-power, no sugarcoating)

**Use this prompt when the human returns after completing Days 01–20 in** `docs-terminai/roadmap/roadmap.md`.

You are reviewing whether the “regain power + measurement + CI floor” work is truly done, without capability regressions, and whether it’s safe/wise to proceed to ATS closures (Days 21+).

You must be brutally honest, evidence-based, and treat “power regressions” as P0.

Do **not** edit `docs-terminai/roadmap/roadmap.md` unless the user explicitly asks. If you need to propose additions/changes, write a separate doc or open issues.

---

## 1) Ask the human for these inputs (required)

1. **Repo state**
   - Branch name + commit SHA range (start SHA before Day 01 → current SHA).
   - Whether changes are merged to `main` or still on a branch.
2. **Platforms actually tested**
   - Linux distro + version, Windows version (and whether Windows tests ran on a real machine vs CI only).
3. **Verification outputs**
   - Linux: output (or log file) of `npm run preflight`.
   - Windows: output (or CI logs) of `npm ci`, `npm run build`, `npm test`.
4. **Runtime proof artifacts**
   - A short session transcript proving:
     - a basic `shell` command works (e.g., `echo hello`, `pwd`, list a directory)
     - python runs in the managed environment (and can import `terminai_apts`)
   - An audit export snippet showing runtime metadata attached to events (if implemented).
5. **CI proof artifacts**
   - Links to the relevant GitHub Actions runs (or pasted logs) for the CI days.
6. **If Windows AppContainer was enabled**
   - How it was enabled; console output indicating the tier; any broker/native module logs.

If any of the above are missing, pause and request them before concluding.

---

## 2) Review goals (what you must produce)

Deliver a review that includes:

1. **Pass/fail per day (Days 01–20)** with a one-paragraph justification each.
2. **List of blocking gaps** (must-fix before ATS Day 21).
3. **List of non-blocking gaps** (can fix during ATS closures).
4. **Power regression check**
   - Explicitly answer: “Did the runtime work nerf capability?” with evidence.
5. **Readiness call**
   - Clear “Go / No-Go” for starting Day 21 ATS closures.
6. **Top 10 next actions** (ordered) if No-Go, or “start with ATS‑01” guidance if Go.

---

## 3) How to run the review (repo-side checks you must perform)

Use the repo + tools to validate claims. At minimum:

- Confirm all Day 06 artifacts exist:
  - `scripts/verify-ats.sh` (or the chosen equivalent)
  - `docs-terminai/roadmap/scoreboard.md`
- Validate forbidden artifacts are not tracked:
  - `git ls-files | rg -n "\\.(node|dll|exe|so|dylib|a|lib|o|obj)$" || true`
  - `git ls-files | rg -n "^packages/.*/build/" || true`
- Grep for obvious runtime bypass patterns:
  - `rg -n "shell:\\s*true" packages/cli/src/runtime/windows -S`
  - `rg -n "executeWithRuntime\\(" packages/core/src/services/shellExecutionService.ts -n`
- Confirm MicroVM is still disabled unless explicitly implemented:
  - `rg -n "static async isAvailable\\(\\)" packages/microvm/src/MicroVMRuntimeContext.ts -n`

Run tests appropriate to the changes (don’t skip just because CI is green).

---

## 4) Day-by-day acceptance checklist (Days 01–20)

For each day, check **deliverable + definition of success** from `docs-terminai/roadmap/roadmap.md`.

### Day 01 — Runtime: restore shell power (bridge semantics)

Evidence required:

- Basic `shell` tool works reliably again in default tier.
- No regressions in quoting/spaces-in-paths for simple commands.
- A regression test exists that would have caught the break.

Code smell checks:

- `ShellExecutionService` routing to `runtimeContext.execute()` can silently change semantics. Validate the chosen contract is coherent.

### Day 02 — Runtime: T‑APTS install works from npm package (wheel-first)

Evidence required:

- In a non-monorepo install, managed python can import `terminai_apts`.
- No reliance on source-tree-only paths.
- Health check validates import (or fails fast with actionable guidance).

### Day 03 — Runtime: runtime tier visibility + health checks (fail fast)

Evidence required:

- Startup health check runs and fails fast if runtime is broken (not mid-task).
- User-visible runtime tier display exists (or logs provide clear tier).
- Audit events include runtime metadata (if claimed).

### Day 04 — Runtime: Windows broker execution must be broker-enforced

Evidence required:

- No uncontrolled host execution path when “isolated” tier is selected.
- If AppContainer is not production-ready, it is explicitly disabled with a clear message (do not pretend it’s secure).

Critical security checks:

- If any Windows broker code uses `shell: true`, call it out.
- If broker transport is open ACL, call it out.

### Day 05 — Tooling: large-output safety (no context floods)

Evidence required:

- `ls`/listing/search tools paginate or bound output.
- There is a test that prevents 5k+ filename dumps.

### Day 06 — Eval: ATS runner + scoreboard + daily routine lock-in

Evidence required:

- `scripts/verify-ats.sh` (or equivalent) exists and is usable.
- `docs-terminai/roadmap/scoreboard.md` exists and has a clear pass/fail grid per OS.
- Evidence capture instructions are practical (audit export, logs, artifacts).

### Day 07 — CI: required checks and merge signal

Evidence required:

- Clear statement of required checks for merge.
- Branch protection is configured or explicitly documented as not enabled.

### Day 08 — CI: demote link checking (non-blocking)

Evidence required:

- Code-only PRs are not blocked by link checking.
- Link checking still runs on docs changes or on a schedule.

### Day 09 — CI: forbidden artifacts gate (hard fail)

Evidence required:

- CI fails on a PR that introduces forbidden artifacts (clear error + remediation).

### Day 10 — CI: sanitize tracked artifacts (make gate pass on main)

Evidence required:

- No forbidden artifacts are tracked in git anymore.
- CI gate passes on `main`.

### Day 11 — CI: Windows `npm ci` incident logging

Evidence required:

- If Windows fails, logs are actionable (toolchain, node/npm/python versions, failing step).

### Day 12 — CI: eliminate install-time side effects (`prepare`)

Evidence required:

- `npm ci` doesn’t trigger heavyweight work implicitly (especially on Windows).
- CI runs heavy build steps explicitly (not via install hooks).

### Day 13 — CI: fix Windows install root cause (deterministic)

Evidence required:

- Clean Windows checkout passes `npm ci` deterministically.

### Day 14 — CI: Windows build+test must be meaningful

Evidence required:

- Windows CI runs build + tests and they are not trivially skipped.

### Day 15 — CI: golden Linux build image (hermetic factory)

Evidence required:

- Dockerfile (or equivalent) exists and can run Linux preflight deterministically.
- Clear local instructions exist and are validated once by the human.

### Day 16 — CI: native module distribution decision (no binary commits)

Evidence required:

- A decision is written and enforced: no `.node` committed to git.
- Contributors have a supported path to obtain native binaries (release artifacts, prebuild packages, etc.).

### Day 17 — CI: version alignment drift (auto or release-only)

Evidence required:

- Version drift is not causing noisy PR failures.

### Day 18 — CI: settings docs determinism

Evidence required:

- Running docs generation twice yields no diff.
- CI checks are stable (no flaky doc drift).

### Day 19 — CI: fix flaky suites (strict teardown)

Evidence required:

- The worst offenders are fixed (or quarantined with explicit rationale).
- Repeated runs don’t flake.

### Day 20 — CI: fix Windows OS identity mismatch in tests

Evidence required:

- Tests that assume Linux path/behavior are corrected, not skipped.
- Windows CI passes with the corrected tests.

---

## 5) Final gating criteria to start ATS Day 21+

Declare “Go” only if all are true:

1. **Shell power restored** (Day 01) with a regression test.
2. **T‑APTS is deterministic** (Day 02) and verified via import in managed python.
3. **Measurement exists** (Day 06): runner + scoreboard + evidence capture.
4. **Windows CI floor is credible** (Days 11–14 at minimum).
5. **No P0 security deception**
   - If AppContainer/MicroVM are not real, they must be labeled as such, not marketed as “secure runtime”.

If any are false, output “No-Go” and list exact blockers.

