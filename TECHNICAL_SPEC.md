# TerminaI Professionalization — Technical Specification (Phased)

This document specifies the 14 professionalization initiatives requested, mapped
to the current monorepo at `/home/profharita/Code/terminaI`.

Notes:

- Maintainer decisions are captured in `openquestions.md` and treated as binding
  constraints for all initiatives.
- The repo already ships environment-variable mirroring via
  `packages/core/src/utils/envAliases.ts` and applies it on CLI startup via
  `packages/cli/index.ts`.

---

## Initiative 1: Branding migration cleanup

### Summary

Complete the TerminaI branding migration without breaking compatibility: prefer
`TERMINAI_*` in docs and UX, keep `GEMINI_*` working via shims, and remove
lingering `.termai` directory usage by migrating to `.terminai` with fallback.
No behavioral “policy” or tool-logic changes beyond compatibility/migration.

Decision alignment: supports the “Upstream Relationship” posture by relying on a
shim layer and non-destructive fallbacks rather than breaking changes.

### Affected Files

- `docs/**/*.md` — Replace remaining `GEMINI_*` references with `TERMINAI_*`
  (keep a short compatibility note where relevant), prefer `terminai` in
  examples while noting `gemini` binary alias.
- `docs-terminai/**/*.md` — Ensure canonical env var names and directory names
  are consistent (`.terminai` primary; `.gemini` legacy).
- `README.md` — Align quickstart examples and env var references to `TERMINAI_*`
  and `terminai`.
- `packages/core/src/utils/envAliases.ts` — Confirm shim policy is documented
  and covers all `GEMINI_*` ↔ `TERMINAI_*` variables; add narrow doc comment +
  (optional) targeted tests for mirroring precedence.
- `packages/cli/index.ts` — Already imports env aliases; ensure no later code
  writes `GEMINI_*` in ways that conflict with docs (prefer writing `TERMINAI_*`
  where the CLI sets env vars).
- `packages/termai/src/index.ts` — Set `TERMINAI_SYSTEM_MD` and
  `TERMINAI_CLI_NO_RELAUNCH` (then mirror to `GEMINI_*` via
  `applyTerminaiEnvAliases()`), avoiding “set GEMINI after aliasing” drift.
- `packages/core/src/brain/historyTracker.ts` — Migrate history path from
  `.termai` to `.terminai` with fallback to legacy `.termai` (and keep
  bounded-size guarantees).
- `packages/core/src/brain/__tests__/historyTracker.test.ts` — Update expected
  legacy/current paths and migration behavior.
- `packages/cli/src/utils/firstRun.ts` — Migrate onboarding marker path from
  `.termai` to `.terminai` with fallback.
- `packages/cli/src/validateNonInterActiveAuth.ts` — Update error strings to
  mention both `TERMINAI_*` and `GEMINI_*` env vars (shim exists; UX should
  reflect that).
- `packages/cli/src/config/sandboxConfig.ts` — Ensure env-var mentions in error
  strings prefer `TERMINAI_SANDBOX*` while still accepting `GEMINI_SANDBOX*`.

### Interface Changes

None (documentation + compatibility shims + path migration only).

### Implementation Details

1. Docs sweep:
   - Replace `GEMINI_*` env var mentions with `TERMINAI_*` in TerminaI-authored
     docs.
   - Where upstream text is retained, add a one-line note: “`TERMINAI_*` is
     preferred; `GEMINI_*` is supported for compatibility.”
   - Replace `.gemini` directory references with `.terminai` and add “legacy
     `.gemini` is read/copied on first run” where applicable.
2. CLI/wrapper env var setting correctness:
   - In `packages/termai/src/index.ts`, set `TERMINAI_SYSTEM_MD` and
     `TERMINAI_CLI_NO_RELAUNCH` first, then call `applyTerminaiEnvAliases()` so
     `GEMINI_*` mirrors are consistent.
   - Audit CLI code paths that currently set `process.env['GEMINI_*']` (e.g.
     sandbox enabling) and prefer setting `TERMINAI_*` instead, relying on
     aliasing for backward compatibility.
3. `.termai` directory migration:
   - Introduce `.terminai` as canonical for history/onboarding markers.
   - On read: prefer `.terminai`, fall back to `.termai`.
   - On write: write to `.terminai` (optionally also mirror to `.termai` for one
     release if needed).
4. Keep the existing `.gemini` → `.terminai` migration in
   `packages/core/src/utils/paths.ts` unchanged; do not delete legacy
   directories.

### Migration Strategy

- Env vars: `TERMINAI_*` is canonical; `GEMINI_*` remains supported via
  `applyTerminaiEnvAliases()` (already applied at CLI entry).
- Filesystem state:
  - `.terminai` is canonical.
  - `.gemini` remains legacy and is copied on first run where implemented.
  - `.termai` remains legacy and is read as fallback for a deprecation window;
    writes move to `.terminai`.

### Testing Strategy

- Update unit tests that assert `.termai` paths
  (`packages/core/src/brain/__tests__/historyTracker.test.ts`).
- Add a focused test for env alias precedence (TERMINAI wins) if missing:
  - Prefer a new test at `packages/core/src/utils/envAliases.test.ts` that stubs
    `process.env` and validates mirroring directions.
- Run doc link checks only if CI already does (it does via `lychee`).

### Verification Criteria

- Command: `rg -n "GEMINI_" --glob='*.md' docs docs-terminai README.md`
  - Expected: only minimal intentional stragglers (e.g., explicitly documented
    compatibility notes); no primary guidance uses `GEMINI_*`.
- Command: `npm run typecheck`
  - Expected: passes.

### Dependencies

None.

### Estimated Effort

M — Many doc touchpoints + careful migration of `.termai` paths and test
updates; low algorithmic risk.

---

## Initiative 2: CI determinism fix

### Summary

Make CI builds deterministic and clearly fail/pass by eliminating implicit
installs during build and aligning CI step ordering to `npm ci` → build → test.
This reduces flaky CI, lockfile drift, and “works on my machine” divergence.

### Affected Files

- `.github/workflows/ci.yml` — Reorder jobs to run `npm ci` before
  `npm run build`; ensure caching stays valid; remove any implicit dependency
  mutation.
- `scripts/build.js` — Remove “auto-`npm install` if `node_modules` missing”;
  fail with actionable message (or gate behind explicit opt-in env var used only
  for local dev).
- `package.json` — Optionally add a CI-specific build script (e.g., `build:ci`)
  that asserts `node_modules` presence and refuses to mutate dependency state.
- `scripts/clean.js` / `scripts/check-lockfile.js` (if needed) — Ensure they do
  not interact poorly with the new CI ordering (no functional change required
  unless currently coupled).

### Interface Changes

None externally, but `npm run build` semantics become strict:

- In CI: build must not install dependencies.
- Locally: developers run `npm install` explicitly (or use an explicitly named
  convenience command).

### Implementation Details

1. CI ordering fix:
   - In each job currently doing `npm run build` before `npm ci`, swap the
     order.
   - Ensure the job that validates docs prerequisites still uses built artifacts
     after install.
2. Build script determinism:
   - Replace the `npm install` fallback in `scripts/build.js` with:
     - A hard failure if `node_modules` is missing, OR
     - An explicit opt-in env var (e.g. `TERMINAI_BUILD_ALLOW_INSTALL=1`) used
       only in local dev.
3. Ensure `npm run preflight` reflects the same order and is the “single source
   of truth” for CI-grade checks (it already is, but CI workflow should match
   it).

### Migration Strategy

- One release window: if local developer ergonomics require it, keep a separate
  command (e.g. `npm run build:bootstrap`) that performs `npm install` then
  build, but keep `npm run build` deterministic.

### Testing Strategy

- Add a small script-level test in `scripts/tests/` (existing vitest config at
  `scripts/tests/vitest.config.ts`) to validate:
  - When `node_modules` is missing, `scripts/build.js` exits non-zero with a
    clear message.
  - When present, it does not attempt installs.

### Verification Criteria

- Command: `npm run preflight`
  - Expected: exits 0 locally; CI runs the same ordering and goes green.

### Dependencies

None.

### Estimated Effort

S — Small code changes but touches CI workflow and build scripts; low
complexity.

---

## Initiative 3: Evolution Lab Docker default

### Summary

Make Evolution Lab safe-by-default by using Docker as the default sandbox type
(aligning code with `docs-terminai/evolution_lab.md`), and requiring an explicit
opt-in flag for unsafe host execution (currently represented as `host` in code).

Decision alignment: implements the “Safety Invariants” expectation that unsafe
execution requires explicit user opt-in, and supports the Moat MVP measurement
posture by standardizing a safe default harness.

### Affected Files

- `packages/evolution-lab/src/types.ts` — Introduce/standardize `SandboxType` to
  include `docker` as the default; deprecate ambiguous `headless` naming.
- `packages/evolution-lab/src/sandbox.ts` — Enforce “Docker default”;
  block/require explicit opt-in for host execution.
- `packages/evolution-lab/src/cli.ts` — Add flags for sandbox selection and
  unsafe-host opt-in:
  - `--sandbox-type docker|desktop|full-vm|host`
  - `--allow-unsafe-host` (required when `--sandbox-type host`)
- `packages/evolution-lab/src/runner.ts` — Ensure runner passes through sandbox
  config derived from CLI flags.
- `docs-terminai/evolution_lab.md` — Align “Sandbox Types” to actual
  `SandboxType` values and safety posture.

### Interface Changes

```typescript
// packages/evolution-lab/src/types.ts
export type SandboxType = 'docker' | 'desktop' | 'full-vm' | 'host';

export interface SandboxConfig {
  type: SandboxType;
  image: string;
  timeout: number;
  memoryLimit?: number;
  diskQuota?: number;
  // New: explicit opt-in for unsafe execution.
  allowUnsafeHost?: boolean;
}
```

### Implementation Details

1. Rename/standardize sandbox types:
   - Replace `headless` with `docker` (dockerized CLI-only sandbox).
   - Keep `host` to mean “exec on the host machine”.
2. Enforce safety contract:
   - In `SandboxController.create()`, if `type === 'host'` and
     `allowUnsafeHost !== true`, throw with a clear error:
     - “Host sandbox is unsafe and requires `--allow-unsafe-host`.”
3. Update defaults:
   - In `DEFAULT_CONFIG`, set `sandbox.type = 'docker'`.
4. CLI:
   - Add parsing/validation for new flags and map them into `DEFAULT_CONFIG`.

### Migration Strategy

- For any existing internal scripts that used `headless`, treat it as an alias
  for `docker` for one release window (implemented as a CLI-level alias), then
  remove.

### Testing Strategy

- Add unit tests (vitest) in
  `packages/evolution-lab/src/__tests__/sandbox.test.ts`:
  - Default config creates docker-backed sandbox (attempts to invoke docker
    command can be mocked).
  - Host sandbox refuses without `allowUnsafeHost`.

### Verification Criteria

- Command: `node packages/evolution-lab/dist/cli.js run --tasks ./tasks.json`
  - Expected: uses Docker by default (no host exec path), and refuses
    `--sandbox-type host` unless `--allow-unsafe-host`.

### Dependencies

- Initiative 12 (Evolution Lab safety harness) builds on these semantics.

### Estimated Effort

M — Requires type changes + CLI flag plumbing + safety gating + documentation
alignment.

---

## Initiative 4: Framework selector alignment

### Summary

Eliminate or implement `FW_DECOMPOSE` so framework selection cannot output an
orphaned/unsupported framework ID. For Phase 1 (low risk), remove `FW_DECOMPOSE`
from the selector and tests, mapping “large feature” requests to an existing
supported framework (preferably `FW_CONSENSUS`).

### Affected Files

- `packages/core/src/brain/frameworkSelector.ts` — Remove `FW_DECOMPOSE` from
  `FrameworkId` and selection logic; update LLM selection prompt to remove it.
- `packages/core/src/brain/__tests__/cognitiveArchitecture.test.ts` — Update
  expectation for large feature prompts.
- `packages/core/src/brain/__tests__/frameworkSelector.test.ts` — Ensure test
  suite reflects supported frameworks only.
- `packages/core/src/brain/thinkingOrchestrator.ts` — No logic change required
  if selector cannot output `FW_DECOMPOSE`, but keep switch exhaustive after
  type update.

### Interface Changes

```typescript
// packages/core/src/brain/frameworkSelector.ts
export type FrameworkId =
  | 'FW_DIRECT'
  | 'FW_CONSENSUS'
  | 'FW_SEQUENTIAL'
  | 'FW_REFLECT'
  | 'FW_SCRIPT';
```

### Implementation Details

1. Remove `FW_DECOMPOSE` from:
   - `FrameworkId` union.
   - `selectFrameworkHeuristic()` “large feature” branch: map to `FW_CONSENSUS`
     with updated reasoning.
   - `selectFrameworkWithLLM()` prompt list and any parsing assumptions.
2. Update tests to match the new mapping.

### Migration Strategy

None; this only removes an invalid output.

### Testing Strategy

- Update existing tests under `packages/core/src/brain/__tests__/`.

### Verification Criteria

- Command: `npm run test --workspace @terminai/core`
  - Expected: passes; no references to `FW_DECOMPOSE` remain.

### Dependencies

None.

### Estimated Effort

S — Small type/test update.

---

## Initiative 5: Audit schema definition

### Summary

Define a stable TypeScript audit schema (Level B structured log) as a foundation
for Phase 2’s audit ledger implementation. No runtime behavior changes in Phase
1; only types + exports.

Decision alignment: matches “Audit” (structured audit log Level B first;
non-disableable; designed for later hash-chain and export).

### Affected Files

- `packages/core/src/audit/schema.ts` (new) — Define audit event types,
  redaction hints, and normalized fields.
- `packages/core/src/audit/index.ts` (new) — Re-export audit types from a single
  entry.
- `packages/core/src/index.ts` — Export audit types for use by CLI and brain
  components.

### Interface Changes

```typescript
// packages/core/src/audit/schema.ts
export type AuditReviewLevel = 'A' | 'B' | 'C';

export type AuditEventType =
  | 'tool.requested'
  | 'tool.awaiting_approval'
  | 'tool.approved'
  | 'tool.denied'
  | 'tool.execution_started'
  | 'tool.execution_finished'
  | 'tool.execution_failed'
  | 'session.start'
  | 'session.end';

export type AuditProvenance =
  | 'local_user'
  | 'web_remote_user'
  | 'model_suggestion'
  | 'workspace_file'
  | 'web_content'
  | 'tool_output'
  | 'unknown';

export interface AuditActor {
  kind: 'user' | 'policy' | 'model' | 'system';
  id?: string;
}

export interface AuditRedactionHint {
  path: string; // JSONPointer-like path (e.g. "/tool/args/text")
  strategy: 'drop' | 'mask' | 'hash';
  reason: 'secret' | 'pii' | 'ui_typed_text' | 'large_payload' | 'unknown';
}

export interface AuditEventBase {
  version: 1;
  eventType: AuditEventType;
  timestamp: string; // ISO
  sessionId: string;
  traceId?: string;
  provenance: AuditProvenance[];
  reviewLevel?: AuditReviewLevel;
  actor?: AuditActor;
  redactions?: AuditRedactionHint[];
}

export interface AuditToolContext {
  callId: string;
  toolName: string;
  toolKind?: string;
  args?: Record<string, unknown>;
  result?: {
    success: boolean;
    errorType?: string;
    exitCode?: number;
    outputBytes?: number;
    metadata?: Record<string, unknown>;
  };
}

export type AuditEvent = AuditEventBase & {
  tool?: AuditToolContext;
};
```

### Implementation Details

1. Introduce `packages/core/src/audit/` folder with `schema.ts` and `index.ts`.
2. Keep schema strictly additive in Phase 1:
   - No writes, no runtime hooks, no config changes.
3. Ensure schema supports:
   - tool call lifecycle
   - approvals (including PIN requirement metadata)
   - provenance list
   - redaction hints (write-time + export-time)

### Migration Strategy

None (types only).

### Testing Strategy

- Type-only: ensure `npm run typecheck` passes.
- Optional: add a `tsd`-style test only if the repo already uses it (it does not
  today); otherwise skip.

### Verification Criteria

- Command: `npm run typecheck`
  - Expected: passes.

### Dependencies

- Initiative 9 depends on this schema for the ledger format.

### Estimated Effort

S — Additive typing work.

---

## Initiative 6: Eliminate brain bypass paths

### Summary

Eliminate ungoverned execution paths from the brain by removing `FW_SCRIPT`’s
direct process spawning (`REPLManager`) and routing any local code execution
through the existing governed `execute_repl` tool (CoreToolScheduler approvals +
audit hooks).

Decision alignment:

- “Brain Local Code Execution”: `FW_SCRIPT` may execute only via the governed
  REPL tool.
- “Brain Authority”: advisory/escalation-only by default (no hidden bypass
  execution).
- “Safety”: no hard blocks (users can override via explicit modes), but
  invariants are enforced deterministically and transparently.

### Affected Files

- `packages/core/src/brain/codeThinker.ts` — Stop executing code; instead return
  a structured proposal that can be executed via `execute_repl`.
- `packages/core/src/brain/thinkingOrchestrator.ts` — For `FW_SCRIPT`, return
  `suggestedAction: 'execute_tool'` plus a tool call request instead of
  `suggestedAction: 'done'`.
- `packages/core/src/brain/replManager.ts` — Remove from brain path (keep only
  if reused elsewhere; otherwise delete after migrations).
- `packages/cli/src/nonInteractiveCli.ts` — Implement handling for brain plan
  `execute_tool` by calling `executeToolCall` (CoreToolScheduler) instead of
  printing an ungoverned result.
- `packages/core/src/core/nonInteractiveToolExecutor.ts` — Extend (if needed) to
  accept “brain initiated” tool calls with provenance and audit context.
- `packages/core/src/tools/repl.ts` — Ensure REPL tool is review-gated (approval
  ladder integration), tiered-sandboxed (Tier 1/2), and audit-logged.
- `packages/core/src/computer/ComputerSessionManager.ts` — Implement Tier 1
  ephemeral environment setup (venv/nvm in temp dir) and enforce the 30-second
  default timeout cap.
- `packages/core/src/computer/PersistentShell.ts` — Ensure per-session env/cwd
  isolation supports ephemeral envs reliably.
- `packages/core/src/config/config.ts` and `schemas/settings.schema.json` — Add
  configuration for REPL sandbox tier defaults and limits (cannot disable
  governance/audit).
- `packages/core/src/brain/__tests__/thinkingOrchestrator.test.ts` — Update
  `FW_SCRIPT` expectation: no direct execution; instead returns tool call
  request.

### Interface Changes

```typescript
// packages/core/src/brain/thinkingOrchestrator.ts
import type { ToolCallRequestInfo } from '../core/turn.js';

export interface BrainExecutionPlan {
  frameworkId: string;
  approach: string;
  reasoning: string;
  suggestedAction:
    | 'execute_tool'
    | 'inject_prompt'
    | 'fallback_to_direct'
    | 'done';
  explanation: string;
  confidence: number;
  // New: for governed execution via CoreToolScheduler
  toolCall?: Pick<ToolCallRequestInfo, 'name' | 'args'>;
}
```

### Implementation Details

1. Change `CodeThinker.solve()`:
   - Generate `{ language, code, explanation }` as today.
   - Do not execute via spawn.
   - Return a `ReplToolParams` payload + a short explanation string.
2. Update orchestrator `FW_SCRIPT` branch:
   - Return `suggestedAction: 'execute_tool'`
   - Include
     `toolCall: { name: 'execute_repl', args: { language: 'python'|'node', code, timeout_ms } }`
3. Non-interactive handling:
   - If `execute_tool`, call `executeToolCall()` with:
     - tool name/args from `toolCall`
     - provenance indicating “brain requested” + inherited session provenance
   - Handle cases where the tool is excluded in non-interactive default:
     - If not allowed / requires approval, fall back to `inject_prompt`
       (guidance only) or return an explicit error message.
4. Remove the brain’s direct `REPLManager` invocation and ensure no other bypass
   exists.

5. Tiered sandboxing for local code execution (decision requirement):
   - **Tier 1 (default):** ephemeral environment in a temp dir, no network,
     30-second timeout.
     - Python: create a venv under a temp directory and run `python` from that
       venv.
     - Node: use an isolated temp directory; avoid global installs; prefer
       “no-install” execution for throwaway scripts.
     - Network: enforce “no network” deterministically (prefer OS sandboxing
       when available; otherwise use Docker for Tier 1 on platforms where
       network isolation cannot be guaranteed without new deps).
     - Timeout: cap at 30 seconds by default; configuration may tighten, not
       loosen.
   - **Tier 2 (opt-in):** Docker execution using a pre-cached base image.
     - Opt-in via settings/flag; deterministic image pinning + resource limits.
     - Intended for tasks requiring system dependencies/compilation.

### Migration Strategy

- Backward compatibility: there is no safe reason to keep direct bypass
  execution; “no hard blocks” is satisfied via explicit user override modes
  (e.g., `--approval-mode yolo`) rather than hidden bypasses.

### Testing Strategy

- Update unit tests:
  - `ThinkingOrchestrator` no longer returns “hello” from direct execution; it
    returns a tool call.
  - Add a test for non-interactive flow: when `--approval-mode yolo`, tool call
    can be executed; otherwise it is excluded and the brain falls back to
    `inject_prompt`.

### Verification Criteria

- Command: `npm run test --workspace @terminai/core`
  - Expected: passes; no usage of `REPLManager` from the orchestrator path.

### Dependencies

- Initiative 8 (centralized approval ladder) to ensure `execute_repl` is
  review-gated consistently.
- Initiative 9 (audit ledger) to ensure execution is captured centrally.

### Estimated Effort

M — Cross-cutting across brain + non-interactive CLI; needs careful tool
allowance behavior.

---

## Initiative 7: Provenance threading

### Summary

Thread provenance into action profiles and tool confirmations so the
deterministic ladder and audit ledger can consistently escalate review levels
for remote/untrusted sources. Provenance must apply across all action profiles,
not only Shell.

Decision alignment: implements “Remote” provenance escalation and provides the
attribution plumbing required for audit queryability and brain history-based
adjustments.

### Affected Files

- `packages/core/src/core/turn.ts` — Extend `ToolCallRequestInfo` to carry
  provenance metadata.
- `packages/core/src/core/coreToolScheduler.ts` — Preserve/propagate provenance
  through tool lifecycle events and into audit hooks.
- `packages/core/src/safety/approval-ladder/types.ts` — Keep provenance model
  aligned with audit provenance and add any missing categories.
- `packages/core/src/tools/shell.ts` — Replace hard-coded
  `provenance: ['model_suggestion']` with provenance from tool call context.
- `packages/core/src/tools/*` (mutators) — Ensure each mutating tool’s action
  profile builder consumes provenance.
- `packages/cli/src/nonInteractiveCli.ts` — Mark provenance for non-interactive
  and brain-initiated tool calls.
- `packages/cli/src/utils/webRemoteServer.ts` — When web-remote is active,
  ensure session/tool provenance includes `web_remote_user`.
- `packages/cli/src/config/config.ts` — Enforce remote defaults: loopback
  allowed by default; non-loopback requires explicit `--remote-bind`; plumb
  “remote active” state to UI for indicator.
- `packages/cli/src/gemini.tsx` and onboarding components — Add strong first-run
  consent for enabling remote features (decision requirement).
- `packages/cli/src/ui/AppContainer.tsx` (or a shared banner/status component) —
  Add a visible “remote active” indicator that cannot be hidden.
- `packages/core/src/hooks/hookRunner.ts` — Ensure both `GEMINI_PROJECT_DIR` and
  `TERMINAI_PROJECT_DIR` remain set; add provenance implications for hooks if
  hooks are remote-triggered.

### Interface Changes

```typescript
// packages/core/src/core/turn.ts
import type { Provenance } from '../safety/approval-ladder/types.js';

export interface ToolCallRequestInfo {
  callId: string;
  name: string;
  args: Record<string, unknown>;
  isClientInitiated: boolean;
  prompt_id: string;
  checkpoint?: string;
  traceId?: string;
  provenance?: Provenance[]; // New
}
```

### Implementation Details

1. Provenance model alignment:
   - Use `packages/core/src/safety/approval-ladder/types.ts#Provenance` as the
     shared internal vocabulary.
   - Map external sources to provenance:
     - interactive local CLI: `local_user` + `model_suggestion` (for model tool
       calls)
     - web-remote: add `web_remote_user`
     - web content ingestion (web_fetch): add `web_content`
     - tool output chaining: add `tool_output`
2. Populate provenance at creation time:
   - In `Turn.handlePendingFunctionCall()`, attach
     `provenance: ['model_suggestion', ...sessionProvenance]`.
   - For client-initiated tool calls (slash commands), use
     `['local_user', ...sessionProvenance]`.
3. Ensure provenance flows into deterministic action profiles (shell + others)
   and into audit ledger events.

4. Remote first-run consent + visible indicator (decision requirement):
   - Consent:
     - When remote is enabled via flags/settings on first run, display an
       explicit consent screen with ELI5 consequences; persist the consent
       result in `.terminai` user state.
     - Do not allow “silent enablement” of non-loopback binds; require explicit
       `--remote-bind` for non-loopback.
   - Indicator:
     - When remote is active, show a persistent indicator in the UI
       (banner/status line) that cannot be hidden, including bind host/port and
       whether it is loopback.

### Migration Strategy

- Default to conservative provenance when unknown (include `unknown`), which
  should only escalate, never downgrade.

### Testing Strategy

- Add/update tests:
  - Approval ladder: `computeMinimumReviewLevel` already has provenance rules;
    add tests ensuring provenance is actually threaded into tool confirmation
    objects for at least shell + one other tool.
  - Web-remote: unit test that tool calls created under web-remote mode include
    `web_remote_user` provenance.

### Verification Criteria

- Command: `npm run test --workspace @terminai/core`
  - Expected: passes; shell confirmation shows provenance-based reasons when
    applicable.

### Dependencies

- Initiative 8 (approval ladder centralization) to ensure provenance affects all
  mutators.
- Initiative 9 (audit ledger) to record provenance.

### Estimated Effort

L — Requires propagating a new field through multiple tool call creation paths
and updating affected tests.

---

## Initiative 8: Centralize approval ladder

### Summary

Extend the deterministic A/B/C approval ladder from Shell to all mutating tools
so governance is consistent across the entire execution surface (file tools,
REPL, process manager, web fetch, and GUI automation). This centralization
ensures there are no weaker tools that side-step governance.

Decision alignment:

- “Safety”: no hard blocks, but deterministic minimum review (A/B/C) is the last
  line of defense; Level C requires PIN; confirmations must show ELI5
  consequences.
- “Brain Authority”: brain may escalate required review levels but never lower
  deterministic minimums.
- “GUI Safety”: UI mutators default to Level B (implemented deterministically
  and configurable).

### Affected Files

- `packages/core/src/safety/approval-ladder/types.ts` — Potentially extend
  `OperationClass` to support GUI operations distinctly from “device” (so UI
  tools can be Level B by default).
- `packages/core/src/safety/approval-ladder/computeMinimumReviewLevel.ts` — Add
  rule(s) for GUI operations and unify reasoning strings.
- `packages/core/src/safety/approval-ladder/buildShellActionProfile.ts` — No
  functional change beyond provenance threading.
- `packages/core/src/safety/approval-ladder/buildToolActionProfile.ts` (new) —
  Build `ActionProfile` for non-shell tools based on tool name + params +
  resolved paths.
- `packages/core/src/tools/edit.ts` — Attach deterministic review metadata and
  enforce Level C PIN when required (delete/unsafe outside workspace cases).
- `packages/core/src/tools/write-file.ts` — Attach deterministic review
  metadata.
- `packages/core/src/tools/file-ops.ts` — Attach deterministic review metadata
  for delete/move/copy/recursive ops.
- `packages/core/src/tools/process-manager.ts` — Attach deterministic review
  metadata for process lifecycle changes.
- `packages/core/src/tools/web-fetch.ts` — Attach deterministic review metadata
  for network operations; escalate when provenance is untrusted.
- `packages/core/src/tools/repl.ts` — Attach deterministic review metadata for
  local code execution.
- `packages/core/src/tools/ui-*.ts` — Attach deterministic review metadata for
  UI mutators (click/type/key/scroll/focus/click_xy); keep snapshot/query mostly
  read-only.
- `packages/core/src/core/coreToolScheduler.ts` — Central enforcement for Level
  C PIN behavior (ensure non-shell tools cannot skip PIN requirement).
- `schemas/settings.schema.json` — Add `brain.authority` setting and any
  governance-related configuration needed for ladder defaults.
- `packages/core/src/config/config.ts` — Thread `brain.authority` into runtime
  config and ensure it can only escalate effective review.
- `packages/core/src/policy/config.ts` — Support enterprise lock semantics
  (effective authority cannot be lowered by user settings).
- `packages/cli/src/ui/components/messages/ToolConfirmationMessage.tsx` — Ensure
  review level, explanation, and PIN UX work consistently for all `exec`
  confirmations.

### Interface Changes

```typescript
// packages/core/src/safety/approval-ladder/types.ts
export type OperationClass =
  | 'read'
  | 'write'
  | 'delete'
  | 'privileged'
  | 'network'
  | 'process'
  | 'ui' // New: GUI automation
  | 'device'
  | 'unknown';
```

### Implementation Details

1. Add `buildToolActionProfile()`:
   - Inputs: `{ toolName, args, config, provenance }`
   - Output: `ActionProfile` with operations, touched paths, outsideWorkspace,
     parseConfidence.
2. Per-tool mapping (deterministic, conservative):
   - `edit_file` / `smart_edit_file` / `write_to_file`: `write` (+ `delete` if
     truncating/removing file, if detectable), touchedPaths includes target
     file.
   - `file_operations`:
     - `delete` → `delete`
     - `move`/`copy` with overwrite/recursive → `write` (+ `delete` for move)
     - `mkdir` → `write`
     - `list_tree` → `read`
   - `manage_processes` → `process`
   - `web_fetch` → `network`
   - `execute_repl` → `process` + `unknown` if language is shell; treat
     long/opaque code as `parseConfidence: low` to force C.
   - `ui.click`/`ui.type`/`ui.key`/`ui.scroll`/`ui.focus`/`ui.click_xy` → `ui`
     (at least B).
3. Central confirmation shaping:
   - For any tool with computed minimum level > A, ensure it produces a
     `ToolExecuteConfirmationDetails` that includes:
     - `reviewLevel`, `requiresPin`, `pinLength`, and `explanation`.
     - Ensure `explanation` is ELI5-style (short, explicit consequences; not
       buried in settings).
   - For tools that currently return no confirmation, the ladder may still
     require confirmation (e.g., write operations).
4. Enforce PIN:
   - Standardize PIN validation in one place (prefer in scheduler confirmation
     handling) so every tool obeys Level C requirements.

5. Brain authority contract (decision requirement):
   - Add `brain.authority` to settings and core config:
     - `advisory`: brain only provides suggestions.
     - `escalate-only` (default): brain may raise effective review above
       deterministic minimum but never lower it.
     - `governing`: brain may demand additional review more often (still a soft
       invariant via explicit user override modes).
   - Support enterprise locking via policy-as-code (policy engine enforces an
     “effective authority” that the user cannot lower).

### Migration Strategy

- Roll out tool-by-tool behind a temporary setting gate if needed (default
  enabled), but do not permit a “no ladder” mode for mutators long-term.

### Testing Strategy

- Unit tests for `buildToolActionProfile` for representative tool calls.
- Update existing tool tests to validate:
  - review level fields are set for mutators
  - Level A actions skip confirmation consistently
  - Level C requires PIN consistently across tools.

### Verification Criteria

- Command: `npm run test --workspace @terminai/core`
  - Expected: passes; deterministic review levels apply to non-shell mutators.

### Dependencies

- Initiative 7 (provenance threading) for provenance-based escalation.
- Initiative 9 (audit ledger) to record computed review levels and decisions.

### Estimated Effort

XL — Cross-cutting tool refactors + type changes + test updates; high surface
area.

---

## Initiative 9: Audit ledger v1 implementation

### Summary

Implement a non-disableable, structured audit ledger (Level B) with write-time
secret redaction, export-time generalized redaction, and Phase 2 tamper-evidence
via a hash chain. The ledger must be queryable by the brain and exportable for
enterprise.

Decision alignment: implements “Audit” (non-disableable, queryable by brain,
exportable; write-time redaction; hash-chain in Phase 2).

### Affected Files

- `packages/core/src/audit/schema.ts` — (from Initiative 5) becomes the
  canonical schema.
- `packages/core/src/audit/ledger.ts` (new) — Append-only JSONL writer, hash
  chain, and read/query APIs.
- `packages/core/src/audit/redaction.ts` (new) — Write-time secret redaction +
  redaction hint generation.
- `packages/core/src/audit/export.ts` (new) — Export pipeline with export-time
  redaction.
- `packages/core/src/audit/hashChain.ts` (new) — Hash computation utilities and
  verification.
- `packages/core/src/audit/index.ts` — Exports.
- `packages/core/src/core/coreToolScheduler.ts` — Emit audit events at scheduler
  choke points:
  - tool requested
  - awaiting approval
  - approval decision (including pin required/validated)
  - execution started/finished/failed/cancelled
- `packages/core/src/config/storage.ts` — Add stable audit storage locations
  (session-scoped and optionally global).
- `schemas/settings.schema.json` — Add `audit.*` configuration knobs (cannot
  disable audit, only tune verbosity/fields).
- `packages/cli/src/ui/commands/auditCommand.ts` (new) — Slash command `/audit`
  for summary + export.
- `packages/cli/src/ui/commands/auditCommand.test.ts` (new) — Validate command
  routing.
- `packages/core/src/brain/*` — Add a small query helper that returns the last N
  audit events for “history-based confidence adjustments.”

### Interface Changes

```typescript
// packages/core/src/audit/ledger.ts
import type { AuditEvent } from './schema.js';

export interface AuditWriteOptions {
  redactWriteTime: boolean; // always true in practice
}

export interface AuditQueryOptions {
  limit: number;
  since?: string; // ISO time
  toolName?: string;
  eventTypes?: string[];
}

export interface AuditExportOptions {
  format: 'jsonl' | 'json';
  redaction: 'enterprise' | 'debug';
}

export interface AuditLedger {
  append(event: AuditEvent): Promise<void>;
  query(opts: AuditQueryOptions): Promise<AuditEvent[]>;
  verifyHashChain(): Promise<{ ok: boolean; error?: string }>;
  export(opts: AuditExportOptions): Promise<string>; // returns exported content or path
}
```

### Implementation Details

1. Storage:
   - Session ledger: `${Storage.getGlobalLogsDir()}/audit/${sessionId}.jsonl`
     (or similar under `.terminai`), plus optional project temp mirror for quick
     access.
2. Event capture points (CoreToolScheduler):
   - On schedule validation success: `tool.requested`
   - When confirmation is required: `tool.awaiting_approval`
   - On approval: `tool.approved` (+ outcome)
   - On cancellation/deny: `tool.denied` / `tool.execution_failed`
   - On start: `tool.execution_started`
   - On finish: `tool.execution_finished` / `tool.execution_failed`
3. Redaction:
   - Write-time (required): remove/replace:
     - secrets in tool args (API keys, tokens, credentials)
     - `ui.type.text` unless explicitly configured otherwise (default redact)
     - large payloads (tool outputs) above configured thresholds (store hash +
       length)
   - Export-time:
     - “enterprise”: strip prompts, file diffs, outputs; keep metadata +
       hashes + decisions
     - “debug”: keep more fields but still redact secrets
4. Tamper evidence (hash chain):
   - Each event includes `prevHash` and
     `hash = sha256(prevHash + canonicalJson(eventSansHashFields))`.
   - Ledger includes a verification method and a `/audit verify` UI command
     path.
5. Queryability:
   - Provide `AuditLedger.query()` for the brain and CLI.
   - Add a small “recent audit context” loader for brain prompts (bounded to N
     events and bytes).

### Migration Strategy

- Audit cannot be disabled; initial rollout uses conservative payload logging:
  - log lifecycle + tool name + args hashes + review level + decision
  - gradually expand per-tool fields as safe

### Testing Strategy

- Core unit tests:
  - `hashChain` verification with synthetic events
  - redaction rules for common secret patterns + `ui.type.text`
  - scheduler integration test: executing a simple tool writes the expected
    lifecycle events
- CLI tests:
  - `/audit` command renders summary
  - `/audit export` produces a file or prints JSONL

### Verification Criteria

- Command: `npm run test --workspace @terminai/core`
  - Expected: passes.
- Command: `terminai /audit verify`
  - Expected: “OK” for current session ledger.

### Dependencies

- Initiative 5 (audit schema definition).
- Initiative 7 (provenance threading) and Initiative 8 (central approval ladder)
  to ensure audit captures provenance and review levels everywhere.

### Estimated Effort

XL — New subsystem + central scheduler hooks + settings + CLI surface + tests.

---

## Initiative 10: Recipes v0

### Summary

Implement “recipes” as a governed, reviewable, reusable playbook format with a
loader, execution engine, and a small set of built-in recipes (5–10). Recipes
can escalate review levels but never downgrade, and every recipe step must be
recorded in audit with recipe ID + version.

Decision alignment: implements “Recipes” (built-in + user first; community
confirmation on first load; escalation-only; audit records recipe ID + version).

### Affected Files

- `packages/core/src/recipes/schema.ts` (new) — Recipe format types (YAML/JSON
  schema).
- `packages/core/src/recipes/loader.ts` (new) — Load built-in and user recipes;
  apply trust model.
- `packages/core/src/recipes/executor.ts` (new) — Execute steps through
  CoreToolScheduler, enforce escalation-only.
- `packages/core/src/recipes/builtins/*` (new) — 5–10 built-in recipes.
- `packages/cli/src/ui/commands/recipesCommand.ts` (new) —
  `/recipes list|show|run`.
- `packages/cli/src/ui/commands/recipesCommand.test.ts` (new) — Command
  behavior.
- `schemas/settings.schema.json` — Add recipe settings:
  - `recipes.paths`, `recipes.allowCommunity`,
    `recipes.confirmCommunityOnFirstLoad`, etc.
- `packages/core/src/audit/schema.ts` — Ensure audit event schema includes
  `recipeId` and `recipeVersion` fields in tool context metadata.

### Interface Changes

```typescript
// packages/core/src/recipes/schema.ts
export interface RecipeStep {
  id: string;
  title: string;
  description?: string;
  toolCall?: { name: string; args: Record<string, unknown> };
  verify?: { toolCall: { name: string; args: Record<string, unknown> } };
  rollback?: { toolCall: { name: string; args: Record<string, unknown> } };
  escalatesReviewTo?: 'A' | 'B' | 'C'; // may only raise effective review
}

export interface Recipe {
  id: string;
  version: string;
  title: string;
  goal: string;
  steps: RecipeStep[];
}
```

### Implementation Details

1. Format:
   - YAML-first for human readability; JSON supported for programmatic
     generation.
2. Trust model:
   - Built-in recipes trusted.
   - User recipes trusted.
   - Community recipes require confirmation on first load (tracked in
     settings/state).
3. Execution:
   - Render preview of steps.
   - Each step executed via CoreToolScheduler so approvals and audit apply
     automatically.
   - Step can escalate review level; cannot reduce deterministic minimum.
4. Audit integration:
   - Each tool call includes recipe metadata:
     `{ recipeId, recipeVersion, stepId }`.

### Migration Strategy

None; new feature.

### Testing Strategy

- Loader tests:
  - built-in discovery
  - community trust gating
- Executor tests:
  - escalation-only behavior
  - audit metadata included per step

### Verification Criteria

- Command: `terminai /recipes list`
  - Expected: shows built-ins.
- Command: `terminai /recipes run <recipe-id>`
  - Expected: steps execute through scheduler; audit includes recipe metadata.

### Dependencies

- Initiative 8 (approval ladder) and Initiative 9 (audit ledger) are
  prerequisites for shipping recipes safely.

### Estimated Effort

L — New feature surface + loader/executor + audit integration.

---

## Initiative 11: GUI automation hardening

### Summary

Harden GUI automation tooling by applying A/B/C governance, bounding (rate
limits + snapshot bounds), and audit redaction (typed text redacted by default;
snapshots depth-limited). Ensure behavior matches the “GUI Automation Safety
Contract.”

Decision alignment: implements “GUI Safety” (Level B default for click/type;
typed text redaction by default; bounded snapshots).

### Affected Files

- `packages/core/src/tools/ui-*.ts` — Apply approval ladder requirements
  (default Level B for `ui.click`/`ui.type`) and include review metadata.
- `packages/core/src/gui/service/DesktopAutomationService.ts` — Enforce bounding
  (snapshot node limits, TTL correctness, post-action snapshot invalidation).
- `packages/core/src/gui/protocol/schemas.ts` — Default limits (e.g., `maxDepth`
  default + new `maxNodes`/`maxTextBytes` if added).
- `packages/core/src/tools/ui-tool-utils.ts` — Ensure output does not leak typed
  text; carry audit hashes consistently.
- `schemas/settings.schema.json` — Add `tools.guiAutomation.*` knobs:
  - review defaults per tool
  - snapshot bounds
  - typed text redaction default
  - max actions/minute
- `packages/core/src/audit/redaction.ts` — Ensure `ui.type` text is redacted at
  write-time.
- `packages/desktop-linux-atspi-sidecar/src/server.py` — Enforce snapshot
  depth/node limits at source when possible.
- `packages/desktop-windows-driver/src/main.rs` — Apply the same bounding +
  redaction semantics (even if capabilities are stubby today).

### Interface Changes

```typescript
// schemas/settings additions (conceptual)
tools: {
  guiAutomation: {
    enabled: boolean;
    minReviewLevel?: 'A' | 'B' | 'C';
    clickMinReviewLevel?: 'A' | 'B' | 'C'; // default 'B'
    typeMinReviewLevel?: 'A' | 'B' | 'C';  // default 'B'
    redactTypedTextByDefault?: boolean;    // default true
    snapshotMaxDepth?: number;             // default 10
    snapshotMaxNodes?: number;             // default 100
    maxActionsPerMinute?: number;          // default e.g. 60
  };
}
```

### Implementation Details

1. Governance:
   - `ui.click` and `ui.type` require Level B click-to-approve by default.
   - Allow configuration to escalate (never downgrade below deterministic
     minimum).
2. Redaction:
   - Always redact typed text in audit unless explicitly configured (default
     redact).
   - UI snapshots recorded by hash + bounded subset; avoid writing full text
     index by default.
3. Bounding:
   - Enforce snapshot limits (depth + node count) in the driver and again in
     core as a backstop.
   - Enforce action rate limits in `DesktopAutomationService` to prevent runaway
     loops.

### Migration Strategy

- Keep existing `tools.guiAutomation.enabled` gating; hardening adds additional
  safeguards when enabled.

### Testing Strategy

- Unit tests for redaction and bounding behavior in core.
- Driver-level tests where feasible (at least for the Linux sidecar).

### Verification Criteria

- Command: `terminai --version` (with GUI automation enabled in settings)
  - Expected: `ui.click`/`ui.type` show Level B confirmations; audit redacts
    typed text.

### Dependencies

- Initiative 8 (approval ladder) and Initiative 9 (audit ledger).

### Estimated Effort

XL — Cross-platform driver work + policy surfaces + audit integration.

---

## Initiative 12: Evolution Lab safety harness

### Summary

Ship an Evolution Lab “safety harness” that is Docker-default, deterministic,
and CI-usable. Add a small regression suite that validates governance invariants
(approval behavior, audit presence, bounded outputs) under controlled tasks.

Decision alignment: supports “Moat MVP (90 days)” by providing a deterministic
harness to measure governed brain + automation improvements.

### Affected Files

- `packages/evolution-lab/src/sandbox.ts` — Harden docker sandbox:
  - `--network none`
  - readonly mounts where possible
  - resource limits (CPU/mem)
  - deterministic timeout behavior
- `packages/evolution-lab/src/runner.ts` — Add deterministic “suite mode” and
  structured result capture.
- `packages/evolution-lab/src/cli.ts` — Add `suite` command (or `run --suite`).
- `packages/evolution-lab/src/suite.ts` (new) — Deterministic regression suite
  definition.
- `packages/evolution-lab/tasks/*.json` (new) — Fixed tasks for regression runs
  (offline, deterministic).
- `.github/workflows/ci.yml` — Add a small Evolution Lab job that runs the suite
  in Docker on Linux.

### Interface Changes

```typescript
// packages/evolution-lab/src/cli.ts
// Add:
// evolution-lab suite --count 10 --parallelism 2
```

### Implementation Details

1. Deterministic suite:
   - Prefer tasks that do not require external network.
   - Validate invariants:
     - audit ledger exists
     - approvals behave as expected under configured mode
     - tool outputs are bounded/truncated as configured
2. Docker safety:
   - Use `docker run --network none` and explicit volume mounts.
   - Ensure the runner uses a stable CLI build (copy bundled artifact into image
     or mount built dist).
3. CI:
   - Run only a small number of tasks to avoid flakiness; treat as regression
     gate.

### Migration Strategy

- Keep existing “adversary” generator for exploratory runs; suite is separate
  and stable.

### Testing Strategy

- Unit tests for suite evaluation logic.
- CI job as the primary verification.

### Verification Criteria

- Command: `npm run evolution -- --suite`
  - Expected: suite passes deterministically in Docker.

### Dependencies

- Initiative 3 (Docker default + unsafe host opt-in).
- Initiative 9 (audit ledger) if the suite asserts audit invariants.

### Estimated Effort

L — Moderate new work; complexity depends on Docker image strategy and CI
runtime constraints.

---

## Initiative 13: Desktop PTY hardening

### Summary

Harden the desktop PTY implementation to reach “operator-grade” parity targets
(Windows + Linux): resize + kill in Phase 1 scope, and add backpressure to
prevent hangs or memory growth.

Decision alignment: implements “PTY” (Windows + Linux parity target; Phase 1
minimum viable = resize + kill).

### Affected Files

- `packages/desktop/src-tauri/src/pty_session.rs` — Implement real resize and
  stop/kill semantics; add bounded buffering/backpressure.
- `packages/desktop/src-tauri/src/lib.rs` — Expose new Tauri commands/events for
  resize and kill; ensure session lifecycle cleanup.
- `packages/desktop/src-tauri/src/cli_bridge.rs` — If the bridge assumes fixed
  PTY size or lacks kill hooks, update accordingly.
- `packages/desktop/src-tauri/src/main.rs` — Wire command registration if
  needed.
- `packages/desktop/src-tauri/src/pty_session.rs` consumers — Update front-end
  event handling to support resize and termination.

### Interface Changes

```rust
// packages/desktop/src-tauri/src/lib.rs (conceptual)
#[tauri::command]
fn resize_pty_session(state: State<AppState>, session_id: String, rows: u16, cols: u16) -> Result<(), String>;

#[tauri::command]
fn kill_pty_session(state: State<AppState>, session_id: String, signal: Option<String>) -> Result<(), String>;
```

### Implementation Details

1. Resize:
   - Store the PTY master handle and call `resize(PtySize { rows, cols, ... })`.
2. Kill:
   - Store the spawned child handle returned by `spawn_command`.
   - Implement “graceful then forceful” termination:
     - send `SIGTERM`/platform equivalent
     - after timeout, `SIGKILL` (or ConPTY equivalent on Windows)
3. Backpressure:
   - Replace unbounded read→emit loop with a bounded channel or ring buffer.
   - Drop/merge chunks when over capacity and emit a “truncated output” marker.

### Migration Strategy

- Keep the current event names (`terminal-output-*`, `terminal-exit-*`) stable.
- Add new optional events for “output truncated” if needed.

### Testing Strategy

- Add Rust unit tests where possible for buffer bounding logic.
- Add a minimal integration test harness that spawns a PTY, writes output,
  resizes, and kills (platform-dependent; may be CI-gated).

### Verification Criteria

- Manual verification (desktop app):
  - Start session; resize window; confirm terminal resizes.
  - Kill session; confirm process exits and no zombie remains.

### Dependencies

- None strictly, but audit + governance improvements inform operator workflows.

### Estimated Effort

XL — Cross-platform PTY semantics are nuanced; Windows ConPTY parity is
significant.

---

## Initiative 14: Voice mode v0

### Summary

Wire speech-to-text into the existing push-to-talk voice state machine so voice
input produces text that enters the normal input path. Leverage
`StreamingWhisper` and the existing `/voice install` assets to support offline
STT via whisper.cpp.

### Affected Files

- `packages/cli/src/ui/AppContainer.tsx` — Bind `VoiceStateMachine` events:
  - `startRecording` / `stopRecording` / `transcribe` / `sendToLLM`
  - Update input buffer with transcription text and trigger the same send path
    as typed input.
- `packages/cli/src/voice/VoiceStateMachine.ts` — Minor adjustments if needed to
  carry partial/final transcription events distinctly.
- `packages/cli/src/voice/stt/StreamingWhisper.ts` — Provide clearer lifecycle
  control and error propagation; optionally support partials.
- `packages/cli/src/voice/stt/AudioRecorder.ts` (new) — Cross-platform
  microphone capture abstraction (initially best-effort with clear errors).
- `packages/cli/src/commands/voice/install.ts` — Ensure installed paths are
  discoverable (write a metadata file describing binary/model locations).
- `schemas/settings.schema.json` — Extend `voice.stt` with:
  - whisper binary path override
  - model path override
  - device/mic selection (if feasible)
- `packages/cli/src/voice/voiceController.ts` — Optionally introduce an STT
  controller parallel to TTS.

### Interface Changes

```typescript
// schemas/settings additions (conceptual)
voice: {
  stt: {
    provider: 'auto' | 'whispercpp' | 'none';
    whispercpp?: {
      binaryPath?: string;
      modelPath?: string;
    };
  };
}
```

### Implementation Details

1. Recording:
   - On `startRecording`: start audio capture into a buffer/stream (16kHz mono
     PCM recommended).
   - On `stopRecording`: stop capture and finalize the stream.
2. Transcription:
   - If provider is `whispercpp`/`auto` and whisper assets exist:
     - start `StreamingWhisper` with the installed model/binary path
     - feed audio chunks during recording
     - collect final transcription on release
3. Input path integration:
   - When transcription is final, insert text into the normal input buffer and
     submit as if typed (respecting existing confirmation/approval UX).
4. Safety:
   - Voice mode already disables YOLO; keep that invariant.
   - Ensure transcripts are treated as user input and recorded in audit as such
     (with optional redaction settings if needed later).

### Migration Strategy

- If no microphone capture dependency is available, fail gracefully with a clear
  message and keep TTS-only mode functional.

### Testing Strategy

- Unit tests:
  - `VoiceStateMachine` event wiring in `AppContainer` (mock recorder + mock
    whisper process).
  - `StreamingWhisper` already has tests; add one for lifecycle start/stop edge
    cases.

### Verification Criteria

- Manual verification:
  - Run `terminai --voice`, hold PTT, speak, release; confirm transcription
    populates prompt and is sent.
  - Run `/voice install` beforehand to ensure whisper binary/model is present.

### Dependencies

- None required, but audit ledger (Initiative 9) should ultimately record voice
  transcripts as user prompts (subject to enterprise export redaction).

### Estimated Effort

L — UI wiring + audio capture abstraction; cross-platform mic capture may
increase complexity.
