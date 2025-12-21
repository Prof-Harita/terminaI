# Outstanding Tasks

## From Horizon 1
- [ ] Task E.1: Ollama Model Integration (original status: ❌ Not implemented - Deferred)
- [ ] Task E.2: Model Fallback Strategies (original status: ❌ Not implemented - Deferred)

## From Frontend
- [ ] Task 1: Wire AuthScreen to App.tsx (original status: ❌ Not implemented)
- [ ] Task 2: Wire EmbeddedTerminal to Layout (original status: ⚠️ Partial - Component exists and has SudoPrompt wired, but not integrated into App)
- [ ] Task 3: Wire SplitLayout to App (original status: ❌ Not implemented)
- [ ] Task 5: Wire Output Detection to CLI Process (original status: ❌ Not implemented - `useCliProcess.ts` ignores TUI output)
- [ ] Task 7: Sync Settings Store with CLI (original status: ❌ Not implemented)
- [ ] Task 8: Refactor App.tsx to Use useKeyboardShortcuts (original status: ❌ Not implemented)
- [ ] Task 9: Test Production Build (original status: ❌ Not implemented)
- [ ] Task 10: Integrate ProgressBar in MessageBubble (original status: ❌ Not implemented)

## From Brain
> Note: Extensive code exists in `packages/core/src/brain/` and is hooked into `shell.ts`, but files are untracked and failing typecheck.
- [ ] Task A.1: Dimension Scorer (original status: ⚠️ Partial - Code exists, failing typecheck)
- [ ] Task A.2: LLM-Based Assessment (original status: ⚠️ Partial - Code exists, failing typecheck)
- [ ] Task B.1: Step Parser (original status: ⚠️ Partial - Code exists, unverified)
- [ ] Task C.1: Strategy Router (original status: ⚠️ Partial - Code exists, unverified)
- [ ] Task D.1: Confidence Handler (original status: ⚠️ Partial - Code exists, unverified)
- [ ] Task E.1: Environment Classifier (original status: ⚠️ Partial - Code exists, unverified)
- [ ] Task F.1: Outcome Logger (original status: ⚠️ Partial - Code exists, unverified)

## Integration Gaps (NEW)
- [ ] INTg-1: **Missing Dependency**: `packages/core` and `packages/a2a-server` have `import type { GenerativeModel } from '@google/genai'` errors. `npm install @google/genai` needed.
- [ ] INTg-2: **Broken Import**: `packages/cli/src/ui/AppContainer.tsx` cannot find `sessionNotifier` export from `@google/gemini-cli-core`.
- [ ] INTg-3: **Output Parsing**: `useCliProcess.ts` does not call `detectOutputType`, meaning TUI transitions (Gap 2) will never trigger.
- [ ] INTg-4: **PTY Trigger**: `start_pty_session` is not actually called by the frontend logic when interactive commands run.

## Conflicts to Resolve
- [ ] CONFLICT-1: `tasks_brain.md` lists all tasks as "Not Started", but full implementation exists in `packages/core/src/brain/`.
- [ ] CONFLICT-2: `tasks_frontend.md` claims `VoiceOrb.tsx` is missing, but it exists in `packages/desktop/src/components/VoiceOrb.tsx`.
- [ ] CONFLICT-3: `tasks_frontend.md` claims SudoPrompt is not wired, but `EmbeddedTerminal.tsx` correctly imports and renders it.
