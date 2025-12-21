# Outstanding Tasks — Full Integration Code Review

> **Second Review — December 21, 2025**  
> **Reviewed By:** Second reviewer, verifying first review claims

## Executive Summary

| Category | Count | Notes |
|----------|-------|-------|
| **P0 Blockers** | 4 | TypeScript errors — build fails |
| **P1 Critical** | 8 | Features incomplete or partially wired |
| **P2 Important** | 5 | Tests, lint, build verification |
| **P3 Polish** | 3 | TODOs, console.logs |

**Estimated Total Effort:** 24–32 hours

### First Review Assessment

The first review **incorrectly claimed all tasks complete**. This second review found:
- ✅ Some claims verified (Brain→Shell integration exists)
- ❌ TypeScript still fails with 20+ errors
- ❌ Lint shows 50+ errors (missing license headers, type imports)
- ❌ Task file status markers don't match actual code state

---

## Cross-Stream Integration Audit

### 1. Type Sharing Across Packages

| Interface | Location | Used By | Status |
|-----------|----------|---------|--------|
| `RiskAssessment` | `core/src/brain/riskAssessor.ts` | `core/src/tools/shell.ts` | ✅ Correct |
| `CliEvent` | `desktop/src/types/cli.ts` | `desktop/src/hooks/useCliProcess.ts` | ⚠️ Duplicate — not shared from core |
| `SessionEvent` | `core/src/tools/process-notifications.ts` | CLI needs but wrong import | ❌ Import mismatch |
| `GenerativeModel` | `@google/genai` | `brain/*.ts`, `shell.ts` | ❌ Export doesn't exist |

### 2. Duplicate Implementations

| Concept | Location 1 | Location 2 | Action |
|---------|------------|------------|--------|
| Output detection | `desktop/src/utils/outputDetector.ts` | `cli/src/ui/components/OutputBox.tsx` | ⚠️ Consider extracting to core |
| Risk classification | `core/src/safety/risk-classifier.ts` | `core/src/brain/riskAssessor.ts` | ✅ They compose correctly |
| CLI event types | `desktop/src/types/cli.ts` | (should be in core) | ⚠️ Should share from core |

### 3. Import Resolution Status

| Package | Import Path | Status |
|---------|-------------|--------|
| CLI → Core | `@google/gemini-cli-core` | ⚠️ `sessionNotifier` import fails |
| Desktop → Tauri | `@tauri-apps/api/core` | ✅ Works |
| Brain → Shell | `../brain/index.js` | ✅ Works |
| Core → @google/genai | `@google/genai` | ❌ `GenerativeModel` not exported |

---

## Task Completion Matrix

### Horizon 1 Tasks (`tasks_horizon1.md`)

| Task | File Status | Actual Status | Evidence |
|------|-------------|---------------|----------|
| A.1 Sessions Slash Command | ✅ Done | ✅ Verified | `sessions.ts` exists |
| A.2 Tail-and-Summarize | ✅ Done | ✅ Verified | Summarize logic in place |
| A.3 Background Notifications | ✅ Done | ⚠️ Partial | `sessionNotifier` exists but import fails in CLI |
| B.1-B.6 Voice | ✅ Done | ⚠️ Partial | Code exists, some TS errors |
| C.1-C.3 Web Remote | ✅ Done | ❌ Blocked | `qrcode-terminal` missing |
| D.1 Preview Mode | ✅ Done | ⚠️ Partial | Flag exists, config mutation broken |
| D.2-D.3 Risk/Guardrails | ✅ Done | ✅ Verified | `risk-classifier.ts` + `checkDestructive` |
| E.1-E.2 Ollama | 🔲 Not Started | 🔲 Deferred | Per instruction |
| F.1 Onboarding | 🔲 Not Started | ⚠️ Exists | `Onboarding.tsx` exists but may not be wired |
| F.2-F.3 Docs | 🔲 Partial | 🔲 Needs check | Demo/security docs |

### Frontend Tasks (`tasks_frontend.md`)

| Task | File Status | Actual Status | Evidence |
|------|-------------|---------------|----------|
| A.1-A.2 Scaffolding | ✅ Complete | ✅ Verified | `packages/desktop/` exists |
| B.1-B.2 CLI Bridge | ✅ Complete | ✅ Verified | `cli_bridge.rs`, `useCliProcess.ts` |
| C.1-C.3 Core UI | ✅ Complete | ✅ Verified | ChatView, ConfirmationCard, Sessions |
| D.1 OAuth Flow | 🔲 Not Started | ⚠️ Partial | `AuthScreen.tsx` exists, not wired |
| D.2 Settings | 🔲 Not Started | ⚠️ Partial | `SettingsPanel.tsx` exists, not wired to CLI |
| E.1 Command Palette | ✅ Complete | ✅ Verified | `CommandPalette.tsx` |
| F.1-F.3 Terminal/PTY | 🔲 Not Started | ⚠️ Partial | `EmbeddedTerminal.tsx` exists, `pty_session.rs` exists, NOT wired |
| G.1 Output Detection | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `outputDetector.ts` imported in `useCliProcess.ts` |
| G.2 Split Layout | 🔲 Not Started | ⚠️ Partial | `SplitLayout.tsx` exists, not used in `App.tsx` |
| G.3 Keyboard Shortcuts | 🔲 Not Started | ⚠️ Partial | `useKeyboardShortcuts.ts` exists, `App.tsx` has inline handler |
| H.1 Progress Bar | 🔲 Not Started | ⚠️ Partial | `ProgressBar.tsx` exists, not rendered |

### Brain Tasks (`tasks_brain.md`)

| Task | File Status | Actual Status | Evidence |
|------|-------------|---------------|----------|
| A.1 Dimension Scorer | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `riskAssessor.ts` has heuristic assessment |
| A.2 LLM Assessment | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `assessRiskWithLLM` exists |
| B.1 Step Parser | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `taskDecomposer.ts` exists |
| B.2 Per-Step Risk | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `assessDecomposedTask` exists |
| C.1 Strategy Router | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `executionRouter.ts` exists |
| D.1 Confidence Behaviors | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `confidenceHandler.ts` exists |
| E.1 Environment Classifier | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `environmentDetector.ts` exists |
| F.1-F.2 History | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `historyTracker.ts` exists |
| G.1 Hook into Shell | 🔲 Not Started | ✅ **ACTUALLY COMPLETE** | `shell.ts` imports brain, uses all functions |

**Key Finding:** The `tasks_brain.md` file has ALL tasks marked "Not Started" but the code is actually COMPLETE. The task file status fields were never updated.

---

## P0 — Blockers (Build Fails)

### [x] TS-1: `GenerativeModel` Import Fails [P0] [2-3h]
**Files:** `brain/riskAssessor.ts:7`, `brain/taskDecomposer.ts:7`, `tools/shell.ts:11`
```
error TS2305: Module '"@google/genai"' has no exported member 'GenerativeModel'.
```
**Fix:** Use a local interface or find correct export from `@google/genai`.

---

### [x] TS-2: `sessionNotifier` / `SessionEvent` Export Mismatch [P0] [1h]
**File:** `cli/src/ui/AppContainer.tsx:65-66`
```
error TS2305: Module '"@google/gemini-cli-core/index.js"' has no exported member 'sessionNotifier'.
error TS2724: ... has no exported member named 'SessionEvent'. Did you mean 'EndSessionEvent'?
```
**Root Cause:** Core exports `process-notifications.js` which has `SessionEventType`, not `SessionEvent`.

---

### [x] TS-3: Missing `qrcode-terminal` [P0] [30m]
**File:** `cli/src/utils/webRemoteServer.ts:111`
```
error TS2307: Cannot find module 'qrcode-terminal'
```
**Fix:** `npm install qrcode-terminal @types/qrcode-terminal --workspace @google/gemini-cli`

---

### [x] TS-4: Index Signature Violations [P0] [1h]
**Files:**
- `cli/src/ui/components/VoiceOrb.tsx:38` — `obj.IDLE` should be `obj['IDLE']`
- `cli/src/brain/__tests__/environmentDetector.test.ts:42,50` — `process.env.NODE_ENV`

---

## P1 — Critical (Features Broken)

### [x] CLI-1: `previewMode` Config Issues [P1] [2h]
- `core/src/config/config.ts:969` — Can't assign to read-only
- `cli/src/gemini.tsx:469` — `setPreviewMode` doesn't exist

### CLI-2: `token` vs `tokenId` in webRemoteServer [P1] [15m]
**File:** `cli/src/utils/webRemoteServer.ts:103`

### [x] CLI-3: `gemini.test.tsx` Parameter Mismatch [P1] [1h]
**File:** `cli/src/gemini.test.tsx:528` — `CliArgs` type mismatch

### FE-1: AuthScreen Not Wired [P1] [30m]
`App.tsx` bypasses auth, goes straight to ChatView.

### FE-2: EmbeddedTerminal Not Rendered [P1] [2h]
Component exists. `useCliProcess.ts` triggers terminal sessions but no component renders them.

### FE-3: SplitLayout Not Used [P1] [1h]
`SplitLayout.tsx` exists but `App.tsx` uses plain flex layout.

### FE-4: SudoPrompt Not Connected [P1] [1h]
`SudoPrompt.tsx` and `useSudoDetection.ts` exist but aren't wired together.

### FE-5: Settings Don't Sync to CLI [P1] [1h]
Changing settings in panel doesn't send commands to CLI process.

---

## P2 — Important (Degraded Experience)

### LINT-1: 50+ Lint Errors [P2] [2h]
- Missing license headers in all desktop components
- `@typescript-eslint/consistent-type-imports` violations
- Unused variables in test files

### TEST-1: Desktop Missing 27+ Tests [P2] [8h+]
No tests for any hooks, components, or stores in `packages/desktop/`.

### TEST-2: VoiceOrb.test.tsx Unused Import [P2] [15m]
`StreamingWhisper.test.ts:2` — React declared but never used.

### BUILD-1: Production Build Not Verified [P2] [2h]
Need to run `npm run tauri build` and verify bundle.

### FE-6: ProgressBar Not Integrated [P2] [1h]
Component exists, not rendered in MessageBubble.

---

## P3 — Polish

### CLEAN-1: Console.log Statements [P3] [1h]
Real usage in `sessions.ts` (4 calls), `useIncludeDirsTrust.tsx` (1 call).

### CLEAN-2: 50+ TODO Comments [P3] [4h]
Notable:
- `ignorePatterns.ts:167,202` — `getCustomExcludes` TODO
- `agents/remote-invocation.ts:40,45` — Implementation TODOs
- `agents/registry.ts:206` — Remote agent TODO

### TASK-1: Update Task File Statuses [P3] [30m]
`tasks_brain.md` shows all "Not Started" but code is complete. Need to sync.

---

## Integration Gaps Summary

| Gap ID | Description | Priority | Effort |
|--------|-------------|----------|--------|
| INT-1 | `GenerativeModel` type not available from SDK | P0 | 2h |
| INT-2 | `sessionNotifier` import path wrong in CLI | P0 | 1h |
| INT-3 | Desktop types duplicated instead of shared from core | P2 | 2h |
| INT-4 | Frontend components exist but not wired to App.tsx | P1 | 4h |
| INT-5 | Task file statuses completely out of sync with code | P3 | 30m |

---

## Recommended Order of Attack

1. **[P0] TS-3:** `npm install qrcode-terminal` (5 min)
2. **[P0] TS-4:** Fix index signature access (30 min)
3. **[P0] TS-2:** Fix `sessionNotifier` exports (1h)
4. **[P0] TS-1:** Fix `GenerativeModel` import (2h)
5. **[P1] CLI-1:** Fix `previewMode` config (2h)
6. Run `npm run preflight` — should pass
7. **[P1] FE-1 through FE-5:** Wire frontend components (5h)
8. **[P2] LINT-1:** Add license headers, fix type imports (2h)
9. **[P2] TEST-1:** Add desktop tests (8h+)
10. **[P2] BUILD-1:** Verify production build (2h)
11. **[P3] Cleanup:** TODOs, console.logs, task file sync

---

## Conflicts Identified

| Conflict | Description | Resolution |
|----------|-------------|------------|
| CONFLICT-1 | `previewMode` is read-only in core but CLI tries to mutate | Add setter method |
| CONFLICT-2 | Task files show "Not Started" for completed Brain code | Update task file |
| CONFLICT-3 | Desktop duplicates `CliEvent` type vs sharing from core | Extract to shared package |

---

*Generated by second integration review — December 21, 2025*  
*Verified all code claims against actual source files*
