# Cognitive Architecture v2: Outstanding Tasks & Bug Fixes

> **Post-implementation review of Gemini Flash's work**  
> **Reviewer:** Claude Sonnet  
> **Date:** 2025-12-25

---

## Summary

**Overall Quality:** Good scaffolding with clean types and builds  
**Issues Found:** 10 (5 bugs, 5 enhancement gaps)  
**Tests:** Pass (basic coverage only)

---

## P0: Critical Bugs

### Bug 1.1: DepScanner Ignores Task Context

- **File:** `packages/core/src/brain/advisors/depScanner.ts`
- **Issue:** Returns hardcoded "Use Chrome" or "Use Pandoc" regardless of task
- **Expected:** Should analyze task + system spec to filter approaches
- **Fix:** Add task analysis or call LLM to match deps to task

### Bug 1.2: StepBackEvaluator is a Stub

- **File:** `packages/core/src/brain/stepBackEvaluator.ts`
- **Issue:** `handleStepBack()` just returns a string, doesn't re-route to
  framework selector
- **Expected:** Should call `ConsensusOrchestrator` with remaining approaches
- **Fix:** Implement actual re-routing logic

### Bug 1.3: PAC Loop Doesn't Use Success Criteria

- **File:** `packages/core/src/brain/pacLoop.ts`
- **Issue:** `_goal` and `_successCriteria` params are unused (prefixed with
  `_`)
- **Expected:** Should verify output against criteria, potentially using LLM
- **Fix:** Implement verification step in `execute()`

---

## P1: Missing Integrations

### Task 2.1: Hook Framework Selector into Main Pipeline

- **Issue:** Framework selector exists but isn't called from main CLI flow
- **Location:** Need to find tool execution entry point
- **Action:** Add `selectFrameworkHeuristic()` call before tool execution

### Task 2.2: Hook System Spec into Session Init

- **Issue:** System spec scanner exists but isn't called on CLI start
- **Location:** CLI initialization code
- **Action:**
  - Call `loadSystemSpec()` on start
  - If null or stale, call `scanSystemSync()` + `saveSystemSpec()`
  - Inject into system prompt

### Task 2.3: Inject System Spec into LLM Prompts

- **Issue:** `formatSystemSpecForPrompt()` exists but isn't used in main prompts
- **Location:** System prompt builder (likely `packages/cli/` or
  `packages/core/`)
- **Action:** Add system spec section to base system prompt

---

## P2: Enhancement Gaps

### Gap 3.1: REPLManager Uses sync execSync

- **File:** `packages/core/src/brain/replManager.ts`
- **Issue:** Uses `execSync` which blocks; long scripts freeze CLI
- **Fix:** Switch to `spawn` or `exec` with promise wrapper

### Gap 3.2: No Timeout on Advisor LLM Calls

- **Files:** All advisors in `packages/core/src/brain/advisors/`
- **Issue:** LLM calls have no timeout; hung calls block forever
- **Fix:** Add abort signal / timeout to `model.generateContent()`

### Gap 3.3: Advisors Don't Pass System Spec to LLM

- **Files:** `enumerator.ts`, `patternMatcher.ts`, others
- **Issue:** LLM prompts don't include system capabilities
- **Fix:** Inject `formatSystemSpecForPrompt(systemSpec)` into advisor prompts

### Gap 3.4: Missing Error Handling in JSON Parsing

- **Files:** All modules with `JSON.parse(jsonMatch[0])`
- **Issue:** Silently fails to fallback on malformed JSON
- **Fix:** Add logging for parse failures to aid debugging

---

## P3: Test Coverage Gaps

### Test 4.1: No Tests for Individual Advisors

- **Missing:** Unit tests for each advisor
- **Action:** Create `__tests__/advisors/` with mocked LLM responses

### Test 4.2: No Integration Test for Full Consensus Flow

- **Missing:** E2E test: task → framework selection → advisors → synthesis
- **Action:** Add to `cognitiveArchitecture.test.ts`

### Test 4.3: No Test for PAC Loop Step-Back

- **Missing:** Test that 2 failures triggers step-back
- **Action:** Add test with mock executor that fails twice

---

## Execution Order

```
P0.1 (DepScanner)   → P0.2 (StepBack)   → P0.3 (PAC Loop)
        ↓                    ↓                  ↓
P1.1 (Framework hook) → P1.2 (Session init) → P1.3 (Prompt inject)
        ↓
P2.* (Async, timeouts, logging)
        ↓
P3.* (Test coverage)
```

---

## Verification After Fixes

```bash
# Build
npm run build

# Tests
npm test packages/core/src/brain/

# Manual E2E
cd ~/Code/terminaI && npm run go
# Ask: "convert test.docx to pdf"
# Expected: Uses consensus → mammoth+chrome → success
```
