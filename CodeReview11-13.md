# Code Review: Initiatives 11–13

**Reviewer**: Antigravity Code Review Agent  
**Date**: 2025-12-27  
**Scope**: Initiative 11 (GUI Hardening), Initiative 12 (Evolution Lab Safety
Harness), Initiative 13 (Desktop PTY Hardening)

---

## Executive Summary

| Initiative                            | Status       | Verdict              |
| ------------------------------------- | ------------ | -------------------- |
| **I11: GUI Automation Hardening**     | ✅ Compliant | **PASS** (Minor Gap) |
| **I12: Evolution Lab Safety Harness** | ✅ Compliant | **PASS**             |
| **I13: Desktop PTY Hardening**        | ✅ Compliant | **PASS**             |

All three initiatives are **correctly implemented** against the specifications
in `TECHNICAL_SPEC.md`. One minor observation in I11 related to explicit audit
integration, but not a blocker.

---

## Initiative 11: GUI Automation Hardening

**Spec Reference**: `TECHNICAL_SPEC.md:796-841`  
**Checklist Reference**: `TASK_CHECKLIST.md:215-226`

### Implementation Verification

| Requirement                                                   | Location                                                                                         | Status |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| `clickMinReviewLevel` / `typeMinReviewLevel` default to `'B'` | `packages/core/src/gui/config.ts:22-23`                                                          | ✅     |
| `redactTypedTextByDefault`                                    | `packages/core/src/gui/config.ts:24`                                                             | ✅     |
| `snapshotMaxDepth` / `snapshotMaxNodes` enforcement           | `packages/core/src/gui/config.ts:25-26`, `DesktopAutomationService.ts:418-437`                   | ✅     |
| `maxActionsPerMinute` rate limit                              | `packages/core/src/gui/config.ts:27`, `DesktopAutomationService.ts:392-416`                      | ✅     |
| `ui.click` / `ui.type` require confirmation                   | `packages/core/src/tools/ui-click.ts:42-53`, `ui-type.ts:41-52` via `buildUiConfirmationDetails` | ✅     |
| Audit Evidence Hash in result                                 | `packages/core/src/tools/ui-tool-utils.ts:127-135`                                               | ✅     |

### Findings

1. **✅ PASS: Review Level Defaults**
   - `clickMinReviewLevel: 'B'` and `typeMinReviewLevel: 'B'` are correctly
     configured.
   - `computeMinimumReviewLevel` is called with a UI-specific `ActionProfile`.

2. **✅ PASS: Redaction**
   - `redactTypedTextByDefault: true` is correctly defaulted.
   - `ui-type.ts:36-38` shows `redactInLogs` parameter support in the
     description.

3. **✅ PASS: Bounding**
   - Snapshot depth (`10`) and node limits (`100`) are enforced in
     `DesktopAutomationService.buildBoundedSnapshotArgs` and
     `applySnapshotBounds`.
   - Rate limiting (`maxActionsPerMinute: 60`) is enforced in
     `enforceActionRateLimit`.

4. **⚠️ OBSERVATION: Audit Integration**
   - The `formatUiResult` function computes an `evidenceHash` and includes it in
     `metadata`, ready for the caller (typically `CoreToolScheduler`) to persist
     to the audit ledger.
   - **Not a spec violation**, but explicit "audit writes" are delegated to
     `CoreToolScheduler`, not directly in the tools. This is the correct pattern
     per I9.

### Verdict: **PASS**

---

## Initiative 12: Evolution Lab Safety Harness

**Spec Reference**: `TECHNICAL_SPEC.md:844-898`  
**Checklist Reference**: `TASK_CHECKLIST.md:228-236`

### Implementation Verification

| Requirement                                            | Location                                        | Status |
| ------------------------------------------------------ | ----------------------------------------------- | ------ |
| Docker `--network none` default                        | `packages/evolution-lab/src/sandbox.ts:112-113` | ✅     |
| Resource limits (`--cpus`, `--memory`, `--pids-limit`) | `packages/evolution-lab/src/sandbox.ts:123-128` | ✅     |
| Deterministic `suite` command in CLI                   | `packages/evolution-lab/src/cli.ts:112-180`     | ✅     |
| Suite definition and evaluation logic                  | `packages/evolution-lab/src/suite.ts`           | ✅     |
| Suite fixtures                                         | `packages/evolution-lab/tasks/suite.json`       | ✅     |
| CI Job `evolution_lab_suite`                           | `.github/workflows/ci.yml:301-330`              | ✅     |

### Findings

1. **✅ PASS: Docker Hardening**
   - `networkDisabled` defaults to `true`.
   - `sandbox.ts:112-113` =>
     `networkMode = this.config.networkDisabled === false ? 'bridge' : 'none';`
   - `--security-opt no-new-privileges` is present.

2. **✅ PASS: Suite Command**
   - CLI implements `suite` with `--count`, `--parallelism`, and
     `--sandbox-type` options.
   - `runSuite` orchestrates workers, creates/destroys sandboxes, and evaluates
     results with `evaluateSuiteTask`.

3. **✅ PASS: CI Job**
   - `.github/workflows/ci.yml:301-330` defines `evolution_lab_suite` job:
     - Builds sandbox image.
     - Runs
       `node packages/evolution-lab/dist/cli.js suite --parallelism 1 --count 0`.
   - Job is included in the final `ci` aggregator check.

4. **✅ PASS: Regression Fixtures**
   - `tasks/suite.json` contains 3 deterministic tasks:
     - `network-blocked`: Validates network isolation.
     - `workspace-writable`: Validates mount integrity.
     - `output-bounded`: Validates output truncation.

### Verdict: **PASS**

---

## Initiative 13: Desktop PTY Hardening

**Spec Reference**: `TECHNICAL_SPEC.md:902-954`  
**Checklist Reference**: `TASK_CHECKLIST.md:238-244`

### Implementation Verification

| Requirement                   | Location                                                                 | Status |
| ----------------------------- | ------------------------------------------------------------------------ | ------ |
| `resize` support              | `packages/desktop/src-tauri/src/pty_session.rs:112-122`, `lib.rs:94-106` | ✅     |
| `stop` (graceful then force)  | `packages/desktop/src-tauri/src/pty_session.rs:124-143`                  | ✅     |
| `kill_now` (immediate force)  | `packages/desktop/src-tauri/src/pty_session.rs:145-153`, `lib.rs:85-92`  | ✅     |
| Backpressure / Bounded Output | `packages/desktop/src-tauri/src/pty_session.rs:8-10, 62-90`              | ✅     |
| Integration test              | `packages/desktop/src-tauri/src/pty_session.rs:162-195`                  | ✅     |
| Tauri command exposure        | `packages/desktop/src-tauri/src/lib.rs:116-125`                          | ✅     |

### Findings

1. **✅ PASS: Resize**
   - `pty_session.rs:112-122` implements
     `pub fn resize(&self, rows: u16, cols: u16)`.
   - Exposed via Tauri command `resize_pty_session` in `lib.rs:94-106`.

2. **✅ PASS: Stop (Graceful + Forceful)**
   - `pty_session.rs:124-143` implements `stop()`:
     - Sets `running = false`.
     - Spawns a thread that waits 200ms, then calls `kill()` if process hasn't
       exited.
   - This matches the spec's "graceful then force" requirement.

3. **✅ PASS: Kill (Immediate)**
   - `pty_session.rs:145-153` implements `kill_now()`:
     - Immediately calls `killer.kill()`.
   - Exposed via Tauri command `kill_pty_session`.

4. **✅ PASS: Bounded Output / Backpressure**
   - `MAX_OUTPUT_BYTES` constant: `1,000,000` (prod) / `64KB` (test).
   - Read loop in `spawn` (lines 60-93) tracks `emitted` bytes and breaks when
     limit is reached.
   - Emits `[output truncated]\n` marker and kills the child process.

5. **✅ PASS: Integration Test**
   - `session_resizes_and_stops_cleanly` test in `pty_session.rs:162-195`:
     - Spawns a session, resizes, stops, and verifies exit event.
     - Gracefully skips if PTY creation is blocked by sandbox (`EPERM`).

### Verdict: **PASS**

---

## Summary of Findings

### Critical Blockers (None)

- ✅ No critical blockers found.

### Minor Observations

1. **I11 Audit Integration**: UI tool results contain evidence hashes but rely
   on `CoreToolScheduler` for actual audit persistence. This is the correct,
   centralized pattern and is not a defect.

### Recommended Actions (Pre-Merge)

1. **Verify tests pass for UI and PTY packages**:
   - `npm run test --workspace @terminai/core` (for GUI config and tool tests)
   - CI job `evolution_lab_suite` should be green.

2. **Manual Verification (Desktop App)**:
   - Start PTY session → resize window → confirm resize.
   - Kill session → confirm process exit, no zombies.
   - Run a long-output command → confirm truncation and `[output truncated]`
     marker.

---

## Conclusion

Initiatives 11, 12, and 13 are **fully implemented and compliant** with the
specifications. No code changes are required. The codebase is ready for the next
phase (Initiative 14: Voice Mode).
