# Code Review: Initiatives 1–10

**Date:** 2025-12-27 **Reviewer:** Gemini (Antigravity Agent) **Scope:**
Initiatives 1–10 (Phase 1 & 2) **Reference:** `implementation_summary.md`,
`TASK_CHECKLIST.md`

## Summary

The codebase shows a high degree of compliance with the technical specifications
for Initiatives 1–10. **9 out of 10 initiatives are fully implemented and
verified.**

**Critical Finding:** Initiative 3 (Evolution Lab) has significant gaps
regarding sandbox hardening and the regression suite interface, which were
specified in the implementation summary but are absent in the code.

---

## Detailed Findings

### Initiative 1: Branding Migration

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/utils/paths.ts` correctly implements
  `.terminai` as the primary config directory with a transparent fallback to
  `.gemini`.
- **Verified:** `packages/core/src/policy/config.ts` uses updated branding
  strings.

### Initiative 2: CI Determinism

**Status:** ✅ **PASS**

- **Verified:** `.github/workflows/ci.yml` consistently uses `npm ci` before
  builds (`lint`, `test_linux`, `test_windows`).
- **Verified:** `scripts/build.js` enforces `npm ci` logic by default in CI
  environments.

### Initiative 3: Evolution Lab

**Status:** ❌ **FAIL / GAPS DETECTED**

- **Spec Violation (Hardening):** `packages/evolution-lab/src/sandbox.ts` starts
  Docker containers but **misses the required `--network none` flag**. The specs
  explicitly mandated network isolation for safety using this flag.
  - _File:_ `packages/evolution-lab/src/sandbox.ts:94-109`
- **Spec Violation (CLI):** `implementation_summary.md` requires a `suite`
  command (or `run --suite`) for deterministic regression testing.
  `packages/evolution-lab/src/cli.ts` **does not implement this command**. It
  only supports `adversary`, `run`, `aggregate`, and `full`.
  - _File:_ `packages/evolution-lab/src/cli.ts`
- **Risk:** Without network isolation, sandbox execution is not fully contained,
  posing a security risk. Without the `suite` command, deterministic regression
  testing is not accessible as specified.

### Initiative 4: Framework Selector

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/brain/frameworkSelector.ts` has removed
  `FW_DECOMPOSE` and implements the correct heuristics for `FW_DIRECT`,
  `FW_SEQUENTIAL`, `FW_CONSENSUS`, `FW_REFLECT`, and `FW_SCRIPT` (via heuristics
  and LLM).

### Initiative 5: Audit Schema

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/index.ts` exports `audit/index.js`, which
  exports the schema.

### Initiative 6: Brain Bypass Removal

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/brain/thinkingOrchestrator.ts` correctly
  routes `FW_SCRIPT` to `scripted.solve()` and generates a `REPL` tool call.
- **Verified:** `packages/core/src/policy/policy-engine.ts` implements
  "fail-closed" logic for non-interactive modes (`ASK_USER` -> `DENY`), ensuring
  governed execution.

### Initiative 7: Provenance Threading

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/core/coreToolScheduler.ts` correctly threads
  provenance from `request` to `toolInvocation` via
  `attachInvocationProvenance`.
- **Verified:** `packages/core/src/recipes/executor.ts` initializes provenance
  for recipe-initiated actions.

### Initiative 8: Central Approval Ladder

**Status:** ✅ **PASS**

- **Verified:** Structure exists in `packages/core/src/safety/approval-ladder`.
- **Verified:** `measure-review-level` logic is integrated into tool
  confirmation flows (`coreToolScheduler.ts`).

### Initiative 9: Audit Ledger v1

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/audit/ledger.ts` implements a hash-chained
  ledger (`verifyHashChain`) with redaction (`redactEvent`) and query
  capabilities.

### Initiative 10: Recipes v0

**Status:** ✅ **PASS**

- **Verified:** `packages/core/src/recipes/loader.ts` implements the trust store
  (`trustedCommunityRecipes`) and confirmation logic.
- **Verified:** `packages/core/src/recipes/executor.ts` handles review
  escalation (`requestedReviewLevel`).

---

## Recommendations

1.  **Immediate Fix (I3):** Update `packages/evolution-lab/src/sandbox.ts` to
    include `'--network', 'none'` in the docker run arguments (unless explicitly
    unsafe host mode is requested, though the spec implies the container itself
    should be isolated).
2.  **Immediate Fix (I3):** Implement the `suite` command in
    `packages/evolution-lab/src/cli.ts` to run the deterministic regression
    suite as defined in the spec.
3.  **General:** Proceed with Initiatives 11–14 once I3 gaps are addressed.
