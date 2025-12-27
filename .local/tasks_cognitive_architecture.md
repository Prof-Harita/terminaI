# Cognitive Architecture Implementation Tasks

> **For:** Gemini Flash Agentic Execution  
> **Spec:** `.local/COGNITIVE_ARCHITECTURE_SPEC.md`

---

## Phase 0: P0 Bug Fixes

### Task 0.1: Fix Shell Crash on Interactive Events

- **File:** `packages/core/src/tools/shell.ts`
- **Action:** Add handlers for `interactive:password` and
  `interactive:fullscreen` in the switch statement at line ~504
- **Verification:** `npm test packages/core/src/tools/shell.test.ts`
- **Status:** ✅ DONE

---

## Phase 1: System Specification Layer

### Task 1.1: Create SystemSpec Data Types

- **File:** `packages/core/src/brain/systemSpec.ts` (NEW)
- **Action:** Define `SystemSpec` interface as per spec section 2.2
- **Exports:** `SystemSpec`, `RuntimeInfo`, `BinaryInfo`
- **Status:** ✅ DONE

### Task 1.2: Implement System Scanner

- **File:** `packages/core/src/brain/systemSpec.ts`
- **Action:** Implement `scanSystem(): Promise<SystemSpec>` that:
  - Detects OS via `os.platform()`, `os.release()`
  - Detects shell via `$SHELL` env
  - Probes runtimes: `node --version`, `python3 --version`, etc.
  - Probes binaries: `which google-chrome libreoffice pandoc docker`
  - Checks sudo: `sudo -n true`
- **Verification:** Unit test with mocked `child_process`
- **Status:** ✅ DONE

### Task 1.3: Implement Spec Persistence

- **File:** `packages/core/src/brain/systemSpec.ts`
- **Action:**
  - `saveSystemSpec(spec: SystemSpec): void` → write to
    `~/.terminai/system-spec.json`
  - `loadSystemSpec(): SystemSpec | null` → read from cache
  - `isSpecStale(spec: SystemSpec): boolean` → check if >24h old
- **Verification:** Unit test file I/O
- **Status:** ✅ DONE

### Task 1.4: Create LLM Prompt Formatter

- **File:** `packages/core/src/brain/systemSpecPrompt.ts` (NEW)
- **Action:** `formatSystemSpecForPrompt(spec: SystemSpec): string`
- **Output format:**
  ```
  ## System Capabilities
  - OS: Ubuntu 22.04 (x64)
  - Shell: bash 5.1
  - Runtimes: Node 20.10, Python 3.11
  - Available: git, curl, google-chrome, npm, pip
  - Missing: libreoffice, pandoc, docker
  - Sudo: available
  ```
- **Status:** ✅ DONE

### Task 1.5: Integrate into System Prompt

- **File:** `packages/core/src/config/systemPrompt.ts` (or equivalent)
- **Action:** Inject `formatSystemSpecForPrompt()` output into base system
  prompt
- **Verification:** Manual test - check system prompt includes capabilities
- **Status:** ✅ DONE

---

## Phase 2: Framework Selector

### Task 2.1: Define Framework Types

- **File:** `packages/core/src/brain/frameworkSelector.ts` (NEW)
- **Action:**
  ```typescript
  type FrameworkId =
    | 'FW_DIRECT'
    | 'FW_CONSENSUS'
    | 'FW_SEQUENTIAL'
    | 'FW_DECOMPOSE'
    | 'FW_REFLECT'
    | 'FW_SCRIPT';
  ```
- **Status:** ✅ DONE

### Task 2.2: Implement Heuristic Classifier

- **File:** `packages/core/src/brain/frameworkSelector.ts`
- **Action:** Implement keyword/pattern-based classification:
  - `isTrivialTask(request)` → single command keywords
  - `isDebuggingTask(request)` → "why", "failing", "broken", "error"
  - `isLargeFeature(request)` → "build", "implement", "create...with"
  - `isSafetyCritical(request)` → "migration", "refactor", "delete"
  - `isDataProcessing(request)` → "parse", "extract", "calculate"
- **Status:** ✅ DONE

### Task 2.3: Implement LLM-Assisted Fallback

- **File:** `packages/core/src/brain/frameworkSelector.ts`
- **Action:** When heuristics uncertain, call LLM with framework selection
  prompt
- **Verification:** Unit test with mock LLM responses
- **Status:** ✅ DONE

---

## Phase 3: Consensus Framework (FW_CONSENSUS)

### Task 3.1: Create Advisor Interface

- **File:** `packages/core/src/brain/advisors/types.ts` (NEW)
- **Action:**
  ```typescript
  interface AdvisorProposal {
    approach: string;
    reasoning: string;
    estimatedTime: 'fast' | 'medium' | 'slow';
    requiredDeps: string[];
    confidence: number; // 0-100
  }
  interface Advisor {
    name: string;
    propose(task: string, systemSpec: SystemSpec): Promise<AdvisorProposal>;
  }
  ```
- **Status:** ✅ DONE

### Task 3.2: Implement Enumerator Advisor

- **File:** `packages/core/src/brain/advisors/enumerator.ts` (NEW)
- **Prompt:** "List ALL possible approaches to: {task}"
- **Output:** Array of approaches
- **Status:** ✅ DONE

### Task 3.3: Implement Pattern Matcher Advisor

- **File:** `packages/core/src/brain/advisors/patternMatcher.ts` (NEW)
- **Prompt:** "What's the industry best practice for: {task}?"
- **Status:** ✅ DONE

### Task 3.4: Implement Dep Scanner Advisor

- **File:** `packages/core/src/brain/advisors/depScanner.ts` (NEW)
- **Action:** Filter approaches by `systemSpec.binaries` and
  `systemSpec.runtimes`
- **Status:** ✅ DONE

### Task 3.5: Implement Fallback Chain Advisor

- **File:** `packages/core/src/brain/advisors/fallbackChain.ts` (NEW)
- **Prompt:** "Rank these approaches by robustness and speed: {approaches}"
- **Status:** ✅ DONE

### Task 3.6: Implement Code Generator Advisor

- **File:** `packages/core/src/brain/advisors/codeGenerator.ts` (NEW)
- **Prompt:** "Could we solve {task} faster by writing a script? If yes, provide
  the script."
- **Status:** ✅ DONE

### Task 3.7: Implement Consensus Orchestrator

- **File:** `packages/core/src/brain/consensus.ts` (NEW)
- **Action:**
  1. Call all 5 advisors in parallel
  2. Synthesize results: pick fastest viable approach
  3. Return selected approach with reasoning
- **Status:** ✅ DONE

---

## Phase 4: PAC Loop

### Task 4.1: Implement Plan-Act-Check Loop

- **File:** `packages/core/src/brain/pacLoop.ts` (NEW)
- **Action:**
  ```typescript
  async function executePAC(
    goal: string,
    successCriteria: string,
    executor: ToolExecutor,
  ): Promise<PACResult> {
    // Plan: Set sub-goal
    // Act: Execute tool(s)
    // Check: Verify against criteria
    // If fail 2x: trigger step-back
  }
  ```
- **Status:** ✅ DONE

### Task 4.2: Implement Step-Back Evaluator

- **File:** `packages/core/src/brain/stepBackEvaluator.ts` (NEW)
- **Action:**
  - Track consecutive failures per goal
  - After 2 failures: return to FW_CONSENSUS with remaining approaches
- **Status:** ✅ DONE

---

## Phase 5: Remaining Frameworks

### Task 5.1: Implement Sequential Thinking (FW_SEQUENTIAL)

- **File:** `packages/core/src/brain/sequentialThinking.ts` (NEW)
- **Loop:** Hypothesize → Test → Observe → Refine
- **Status:** ✅ DONE

### Task 5.2: Implement Reflective Critique (FW_REFLECT)

- **File:** `packages/core/src/brain/reflectiveCritique.ts` (NEW)
- **Loop:** Generate → Critique → Refine → Test
- **Status:** ✅ DONE

### Task 5.3: Implement Code Thinker (FW_SCRIPT)

- **File:** `packages/core/src/brain/codeThinker.ts` (NEW)
- **Action:** Generate and execute throwaway Python/Node scripts
- **Status:** ✅ DONE

### Task 5.4: Implement REPL Manager

- **File:** `packages/core/src/brain/replManager.ts` (NEW)
- **Action:** Manage persistent Python/Node REPL for session
- **Status:** ✅ DONE

---

## Phase 6: Integration & Testing

### Task 6.1: Update Brain Index

- **File:** `packages/core/src/brain/index.ts`
- **Action:** Re-export all new modules
- **Status:** ✅ DONE

### Task 6.2: Integration Tests

- **File:** `packages/core/src/brain/__tests__/cognitiveArchitecture.test.ts`
  (NEW)
- **Tests:**
  - SystemSpec scanning
  - Framework selection
  - Consensus flow
  - PAC loop with step-back
- **Status:** ✅ DONE

### Task 6.3: E2E Validation

- **Test case:** "Convert test.docx to pdf"
- **Expected:** Uses FW_CONSENSUS → selects mammoth+Chrome → succeeds
- **Status:** ✅ DONE

---

## Execution Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
                              ↑
                         (Core value delivered here)
```
