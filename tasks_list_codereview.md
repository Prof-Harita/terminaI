# Code Review Action Items: Initiatives 1–10

**Generated:** 2025-12-27  
**Sources:** CodeReviewOpus.md (Opus Review) + CodeReviewGemini.md (Gemini
Review)  
**Branch:** `professionalization/execute-all`  
**Status:** Ready for execution

---

## Critical Path (Blocking Merge)

### 🔴 CRIT-1: Fix CLI Test Failures

**Severity:** BLOCKING  
**Initiative:** N/A (Regression from I7 Provenance Threading)  
**Source:** Opus Review

**Issue:**

- 10 test failures in `packages/cli/src/ui/hooks/useToolScheduler.test.ts`
- Snapshot mismatches due to provenance field addition
- Tests expect `"callId": "run1"` but receive `"callId": "run2"`
- Missing `provenance: ['unknown']` in expected snapshots

**Required Actions:**

1. [ ] Update snapshots: `cd packages/cli && npm run test -- -u`
2. [ ] **Manually verify** updated snapshots are correct (not masking
       regressions)
3. [ ] Re-run tests to confirm all pass:
       `npm run test --workspace @terminai/cli`

**Acceptance Criteria:**

- All CLI tests pass
- Snapshot changes are reviewed and approved
- No functional regressions introduced

**Files to Modify:**

- `packages/cli/src/ui/hooks/__snapshots__/useToolScheduler.test.ts.snap`
  (auto-generated)

---

### 🔴 CRIT-2: Evolution Lab Network Isolation

**Severity:** BLOCKING (Security)  
**Initiative:** I3 (Evolution Lab Docker Default)  
**Source:** Gemini Review

**Issue:**

- `packages/evolution-lab/src/sandbox.ts` missing `--network none` flag for
  Docker containers
- Spec explicitly mandates network isolation for sandbox safety
- Current implementation allows network access from sandboxed code

**Required Actions:**

1. [ ] Add `--network none` to Docker run arguments in `startDockerContainer()`
2. [ ] Test sandbox execution with network-dependent code (should fail)
3. [ ] Update documentation to reflect network isolation

**Acceptance Criteria:**

- Docker containers run with `--network none`
- Sandboxed code cannot make network requests
- Tests verify network isolation

**Files to Modify:**

- `packages/evolution-lab/src/sandbox.ts` (lines 94-109)

**Implementation:**

```typescript
const args = [
  'run',
  '-d',
  '--rm',
  '--network',
  'none', // ADD THIS LINE
  '--name',
  `evolution-${id.slice(0, 8)}`,
  // ... rest of args
];
```

---

### 🔴 CRIT-3: Evolution Lab Suite Command

**Severity:** BLOCKING (Spec Compliance)  
**Initiative:** I3 (Evolution Lab Docker Default)  
**Source:** Gemini Review

**Issue:**

- `packages/evolution-lab/src/cli.ts` missing `suite` command
- `implementation_summary.md` requires deterministic regression suite interface
- Only `adversary`, `run`, `aggregate`, and `full` commands implemented

**Required Actions:**

1. [ ] Implement `suite` subcommand in Evolution Lab CLI
2. [ ] Suite should run deterministic regression tests
3. [ ] Add tests for suite command
4. [ ] Update README with suite command usage

**Acceptance Criteria:**

- `evolution-lab suite` command exists
- Runs deterministic regression test suite
- Documented in Evolution Lab README

**Files to Modify:**

- `packages/evolution-lab/src/cli.ts`
- `packages/evolution-lab/README.md`

---

## High Priority (Pre-Merge)

### ⚠️ HIGH-1: Verify Non-Interactive REPL Handling

**Severity:** HIGH  
**Initiative:** I6 (Eliminate Brain Bypass Paths)  
**Source:** Opus Review (Minor Gap)

**Issue:**

- `packages/cli/src/nonInteractiveCli.ts` needs verification of `execute_tool`
  handling for REPL
- Implementation summary claims this is addressed, but no line-level
  verification performed

**Required Actions:**

1. [ ] Review `nonInteractiveCli.ts` REPL tool execution path
2. [ ] Verify brain orchestrator returns `execute_tool` action
3. [ ] Confirm governance applies to REPL execution
4. [ ] Add test case for non-interactive REPL execution

**Acceptance Criteria:**

- Non-interactive mode correctly handles `FW_SCRIPT` → REPL tool call
- Governance policy applies (no bypass)
- Test coverage for this path

**Files to Review:**

- `packages/cli/src/nonInteractiveCli.ts`
- `packages/core/src/brain/thinkingOrchestrator.ts` (FW_SCRIPT case)

---

### ⚠️ HIGH-2: Update Task Checklist

**Severity:** MEDIUM  
**Initiative:** I8 (Centralize Approval Ladder)  
**Source:** Opus Review (Minor Observation)

**Issue:**

- `TASK_CHECKLIST.md` line 121 shows brain.authority schema item unchecked
- Code shows implementation is complete
- Checklist out of sync with actual state

**Required Actions:**

1. [ ] Review `TASK_CHECKLIST.md` for Initiative 8
2. [ ] Mark brain.authority items as `[x]` completed
3. [ ] Verify all other I8 items are correctly marked

**Acceptance Criteria:**

- Checklist accurately reflects code state
- All completed items marked `[x]`

**Files to Modify:**

- `TASK_CHECKLIST.md` (line 121 and surrounding)

---

## Medium Priority (Post-Merge Improvements)

### 📋 MED-1: Docker Availability Pre-Check

**Severity:** LOW  
**Initiative:** I3 (Evolution Lab Docker Default)  
**Source:** Opus Review (Residual Risk)

**Issue:**

- Evolution Lab doesn't pre-check Docker availability
- Fails at runtime with unclear error if Docker unavailable

**Required Actions:**

1. [ ] Add Docker availability check on Evolution Lab initialization
2. [ ] Provide clear error message if Docker not found
3. [ ] Suggest installation instructions in error message

**Acceptance Criteria:**

- Clear error message if Docker unavailable
- Helpful guidance for user

**Files to Modify:**

- `packages/evolution-lab/src/sandbox.ts` (constructor or `create()`)

---

### 📋 MED-2: Document Sandbox EPERM Limitation

**Severity:** LOW  
**Initiative:** I10 (Recipes v0)  
**Source:** Opus Review

**Issue:**

- Manual CLI testing of `/recipes run` blocked by sandbox EPERM
- Limitation not documented
- Users may encounter this issue

**Required Actions:**

1. [ ] Add note to `docs-terminai/evolution_lab.md` about EPERM limitation
2. [ ] Document workarounds if any exist
3. [ ] Consider adding to FAQ

**Acceptance Criteria:**

- Limitation documented
- Users understand constraints

**Files to Create/Modify:**

- `docs-terminai/evolution_lab.md` (or create if doesn't exist)

---

### 📋 MED-3: Hash Chain Concurrent Write Testing

**Severity:** LOW  
**Initiative:** I9 (Audit Ledger v1)  
**Source:** Opus Review (Testing Gap)

**Issue:**

- Single-file JSONL audit ledger may have race conditions
- No explicit test for concurrent writes
- Unlikely in practice but worth verifying

**Required Actions:**

1. [ ] Add stress test for concurrent audit writes
2. [ ] Verify hash chain integrity under concurrent load
3. [ ] Document thread-safety guarantees (or lack thereof)

**Acceptance Criteria:**

- Concurrent write behavior is tested
- Thread-safety stance documented

**Files to Modify:**

- `packages/core/src/audit/__tests__/ledger.test.ts` (add concurrent test)

---

## Low Priority (Future Enhancements)

### 💡 LOW-1: Remote Provenance E2E Test

**Severity:** LOW  
**Initiative:** I7 (Provenance Threading)  
**Source:** Opus Review (Testing Gap)

**Issue:**

- No end-to-end test for remote provenance escalation
- Unit tests cover components individually
- E2E test would increase confidence

**Required Actions:**

1. [ ] Create E2E test for web_remote_user → elevated review
2. [ ] Test full flow: provenance detection → ladder → approval
3. [ ] Document expected behavior

**Acceptance Criteria:**

- E2E test exists and passes
- Provenance escalation verified end-to-end

**Files to Create:**

- New test file in `packages/core/src/__tests__/e2e/` or similar

---

## Summary Statistics

| Priority               | Count | Status                       |
| ---------------------- | ----- | ---------------------------- |
| 🔴 Critical (Blocking) | 3     | **MUST FIX BEFORE MERGE**    |
| ⚠️ High (Pre-Merge)    | 2     | Recommended before merge     |
| 📋 Medium (Post-Merge) | 3     | Can be addressed after merge |
| 💡 Low (Future)        | 1     | Nice-to-have enhancements    |

**Total Action Items:** 9

---

## Verification Checklist

Before merging, ensure:

- [ ] All Critical items (CRIT-1, CRIT-2, CRIT-3) are completed
- [ ] CLI tests pass: `npm run test --workspace @terminai/cli`
- [ ] Core tests pass: `npm run test --workspace @terminai/core`
- [ ] Build succeeds: `npm run build`
- [ ] Evolution Lab sandbox is network-isolated
- [ ] Evolution Lab suite command exists and works
- [ ] Snapshot changes are reviewed and approved

**Sign-off:**

- Code Review: ****\*\*****\_****\*\***** Date: \***\*\_\*\***
- Testing: ****\*\*****\_****\*\***** Date: \***\*\_\*\***
- Security: ****\*\*****\_****\*\***** Date: \***\*\_\*\***

---

_Generated from CodeReviewOpus.md + CodeReviewGemini.md_  
_Last Updated: 2025-12-27_
