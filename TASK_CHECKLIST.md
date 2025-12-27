# TerminaI Professionalization Task Checklist

This checklist is sequenced for step-by-step execution. Each initiative ends
with its explicit verification command(s) before moving on.

## Phase 1: Safe-to-Oneshot

- [ ] **Initiative 1: Branding migration cleanup**
  - [ ] Inventory doc references:
        `rg -n "GEMINI_" --glob='*.md' docs docs-terminai README.md`
  - [ ] Update docs to prefer `TERMINAI_*` env vars and `terminai` examples
        (keep a short compatibility note for `GEMINI_*` where needed)
  - [ ] Update docs to prefer `.terminai` and clarify `.gemini` legacy fallback
        where applicable
  - [ ] Fix `.termai` directory usage (history + onboarding) to `.terminai` with
        legacy fallback:
    - [ ] `packages/core/src/brain/historyTracker.ts`
    - [ ] `packages/cli/src/utils/firstRun.ts`
    - [ ] Update corresponding tests
  - [ ] Ensure wrapper sets `TERMINAI_*` then mirrors (avoid “set GEMINI after
        aliasing” drift):
    - [ ] `packages/termai/src/index.ts`
  - [ ] Update UX strings that mention only `GEMINI_*` env vars (auth/sandbox)
        to mention both prefixes
  - [ ] **Verify**
    - [ ] `rg -n "GEMINI_" --glob='*.md' docs docs-terminai README.md` (minimal
          intentional stragglers only)
    - [ ] `npm run typecheck`

- [ ] **Initiative 2: CI determinism fix**
  - [ ] Update `.github/workflows/ci.yml` to run `npm ci` before `npm run build`
        in all relevant jobs
  - [ ] Make `scripts/build.js` deterministic:
    - [ ] Remove implicit `npm install` fallback (or gate behind explicit
          dev-only env var)
    - [ ] Fail fast with actionable error if deps are missing
  - [ ] (Optional) Add `npm run build:ci` that asserts deterministic behavior;
        update CI to use it
  - [ ] Add/adjust script tests under `scripts/tests/` to prevent regression
        (build must not mutate deps)
  - [ ] **Verify**
    - [ ] `npm run preflight` (must pass)

- [ ] **Initiative 3: Evolution Lab Docker default**
  - [ ] Align Evolution Lab sandbox types with docs:
    - [ ] Update `packages/evolution-lab/src/types.ts` (`SandboxType` includes
          `docker` default)
    - [ ] Update `packages/evolution-lab/src/sandbox.ts` to enforce docker
          default and require opt-in for `host`
  - [ ] Add CLI flags in `packages/evolution-lab/src/cli.ts`:
    - [ ] `--sandbox-type docker|desktop|full-vm|host`
    - [ ] `--allow-unsafe-host` (required for host)
  - [ ] Plumb flags into `packages/evolution-lab/src/runner.ts`
  - [ ] Update `docs-terminai/evolution_lab.md` to match actual type names and
        safety posture
  - [ ] Add unit tests for “host requires opt-in” and “default is docker”
  - [ ] **Verify**
    - [ ] `npm run build --workspace @terminai/evolution-lab`
    - [ ] `node packages/evolution-lab/dist/cli.js run --tasks ./tasks.json`
          (docker default; host blocked unless opt-in)

- [ ] **Initiative 4: Framework selector alignment**
  - [ ] Remove orphan framework ID:
    - [ ] Remove `FW_DECOMPOSE` from
          `packages/core/src/brain/frameworkSelector.ts`
    - [ ] Map “large feature” heuristic to `FW_CONSENSUS` (or another supported
          framework)
    - [ ] Remove `FW_DECOMPOSE` from the LLM selection prompt list
  - [ ] Update tests:
    - [ ] `packages/core/src/brain/__tests__/cognitiveArchitecture.test.ts`
    - [ ] Any other references found by `rg -n "FW_DECOMPOSE" packages/core/src`
  - [ ] **Verify**
    - [ ] `npm run test --workspace @terminai/core`

- [ ] **Initiative 5: Audit schema definition**
  - [ ] Add audit schema types (no runtime changes):
    - [ ] `packages/core/src/audit/schema.ts`
    - [ ] `packages/core/src/audit/index.ts`
  - [ ] Export audit types from `packages/core/src/index.ts`
  - [ ] **Verify**
    - [ ] `npm run typecheck`

## Phase 2: Governance & Safety

- [ ] **Initiative 6: Eliminate brain bypass paths**
  - [ ] Remove direct brain execution for `FW_SCRIPT`:
    - [ ] Update `packages/core/src/brain/codeThinker.ts` to generate code but
          not spawn processes
    - [ ] Update `packages/core/src/brain/thinkingOrchestrator.ts` to return
          `execute_tool` with `execute_repl` tool call payload
    - [ ] Deprecate/remove `packages/core/src/brain/replManager.ts` from the
          brain path
  - [ ] Implement tiered local execution for governed REPL (Brain Local Exec
        decision):
    - [ ] Tier 1 default: ephemeral venv/nvm in temp dir, no network, 30-second
          timeout cap
    - [ ] Tier 2 opt-in: Docker with pre-cached base image (resource limits +
          deterministic image pinning)
    - [ ] Plumb tier selection via settings/flags (escalate-only; cannot disable
          governance/audit)
  - [ ] Non-interactive orchestration:
    - [ ] Implement `execute_tool` handling in
          `packages/cli/src/nonInteractiveCli.ts` via
          `packages/core/src/core/nonInteractiveToolExecutor.ts`
    - [ ] Ensure non-interactive default fails closed (tool excluded / approval
          required) and YOLO can still run governed tool calls
  - [ ] Update tests:
    - [ ] `packages/core/src/brain/__tests__/thinkingOrchestrator.test.ts`
    - [ ] Any non-interactive CLI tests that assume ungoverned `FW_SCRIPT`
          execution
  - [ ] **Verify**
    - [ ] `npm run test --workspace @terminai/core`
    - [ ] `npm run test --workspace @terminai/cli`

- [ ] **Initiative 7: Provenance threading**
  - [ ] Extend tool call request metadata:
    - [ ] Add `provenance?: Provenance[]` to
          `packages/core/src/core/turn.ts#ToolCallRequestInfo`
    - [ ] Thread provenance through scheduler and tool confirmation payloads
  - [ ] Populate provenance at tool call creation sites:
    - [ ] Model tool calls: include `model_suggestion`
    - [ ] Client/tooling initiated: include `local_user`
    - [ ] Web-remote sessions: include `web_remote_user` (plumb from web-remote
          server code)
  - [ ] Remote decision alignment:
    - [ ] Add strong first-run remote consent flow (explicit consequences;
          persisted state)
    - [ ] Add visible “remote active” indicator that cannot be hidden
    - [ ] Require explicit `--remote-bind` for non-loopback binds (loopback
          works by default)
  - [ ] Replace hard-coded provenance in Shell action profiles:
    - [ ] `packages/core/src/tools/shell.ts`
  - [ ] Add/update tests for provenance-based escalation paths
  - [ ] **Verify**
    - [ ] `npm run test --workspace @terminai/core`

- [ ] **Initiative 8: Centralize approval ladder**
  - [ ] Add non-shell action profile builder:
    - [ ] `packages/core/src/safety/approval-ladder/buildToolActionProfile.ts`
  - [ ] Extend ladder types/rules as needed:
    - [ ] Add `ui` operation class and minimum review mapping
    - [ ] Ensure provenance affects escalation consistently
  - [x] Apply ladder to all mutating tools:
    - [x] `packages/core/src/tools/edit.ts`
    - [x] `packages/core/src/tools/write-file.ts`
    - [x] `packages/core/src/tools/file-ops.ts`
    - [x] `packages/core/src/tools/process-manager.ts`
    - [x] `packages/core/src/tools/web-fetch.ts`
    - [x] `packages/core/src/tools/repl.ts`
    - [x] `packages/core/src/tools/ui-click.ts`,
          `packages/core/src/tools/ui-type.ts` (and other UI mutators)
  - [x] Centralize PIN enforcement so Level C is consistent across tools
  - [x] Ensure confirmations provide ELI5 consequences (Level B/C)
  - [x] Implement Brain Authority setting + enforcement (default escalate-only):
    - [x] Add `brain.authority: advisory | escalate-only | governing` to
          settings schema
    - [x] Ensure brain can raise review levels, never lower deterministic
          minimum
    - [x] Add enterprise lock via policy-as-code (effective authority cannot be
          lowered)
  - [x] Update/add tests for:
    - [x] deterministic review computation per tool
    - [x] Level C PIN handling
  - [x] **Verify**
    - [x] `npm run test --workspace @terminai/core`

- [ ] **Initiative 9: Audit ledger v1 implementation**
  - [ ] Implement ledger core:
    - [ ] `packages/core/src/audit/ledger.ts` (append/query)
    - [ ] `packages/core/src/audit/redaction.ts` (write-time redaction)
    - [ ] `packages/core/src/audit/hashChain.ts` (tamper evidence)
- [x] **Initiative 9: Audit ledger v1 implementation**
  - [x] Create append-only file-based audit ledger
        (`packages/core/src/audit/ledger.ts`)
  - [x] Implement SHA-256 hash chain for tamper-evidence
        (`packages/core/src/audit/hashChain.ts`)
  - [x] Hook audit into `CoreToolScheduler` to record all tool requests/results
  - [x] Add redaction logic for write-time protection (secrets, internal UI
        text)
  - [x] Add storage location support:
    - [x] `packages/core/src/config/storage.ts`
  - [x] Add scheduler choke-point hooks:
    - [x] `packages/core/src/core/coreToolScheduler.ts` emits lifecycle audit
          events
  - [x] Add settings knobs (cannot disable audit):
    - [x] `schemas/settings.schema.json`
  - [x] Implement `/audit` CLI command interface:
    - [x] `/audit show` recent events
    - [x] `/audit verify` hash chain
    - [x] `/audit export` for enterprise compliance (JSONL)
  - [x] Make audit queryable by the brain:
    - [x] Add a bounded loader used by risk/confidence adjustments
  - [x] **Verify**
    - [x] `npm run test --workspace @terminai/core` (audit tests)
    - [x] `npm run test --workspace @terminai/cli`
    - [x] `/audit verify` results in CLI are green
    - [x] `cat ~/.terminai/audit.jsonl` contains readable events

## Phase 3: Product Surfaces

- [x] **Initiative 10: Recipes v0**
  - [x] Define recipe schema and built-in recipes:
    - [x] `packages/core/src/recipes/schema.ts`
    - [x] `packages/core/src/recipes/builtins/index.ts`
  - [x] Implement recipe loader with trust model (local vs. community recipes)
  - [x] Implement recipe executor (`packages/core/src/recipes/executor.ts`)
  - [x] Add `/recipes` CLI command interface:
    - [x] `/recipes list`
    - [x] `/recipes run <id>`
  - [x] **Verify**
    - [x] Unit tests for loader and executor
    - [x] Manual run of `recipes run workspace-overview` (within sandbox
          caveats)

- [ ] **Initiative 11: GUI automation hardening**
  - [ ] Apply A/B/C ladder defaults for UI mutators:
    - [ ] `ui.click` and `ui.type` default Level B
  - [ ] Enforce typed text audit redaction by default
  - [ ] Add bounding:
    - [ ] snapshot depth/node caps (default 100 nodes)
    - [ ] rate limit actions/minute
    - [ ] depth-limited snapshot serialization
  - [ ] Wire all UI actions into audit ledger (hashes + bounded evidence)
  - [ ] **Verify**
    - [ ] `ui.click`/`ui.type` prompts Level B confirmations
    - [ ] audit shows redacted typed text and evidence hashes

- [ ] **Initiative 12: Evolution Lab safety harness**
  - [ ] Harden docker sandbox execution:
    - [ ] disable network (`--network none`)
    - [ ] explicit mounts + resource limits
  - [ ] Add deterministic regression suite definition + fixtures
  - [ ] Add CI job to run suite (small N, stable)
  - [ ] **Verify**
    - [ ] `evolution-lab suite` passes locally in Docker
    - [ ] CI job goes green consistently

- [ ] **Initiative 13: Desktop PTY hardening**
  - [ ] Implement resize support in `pty_session.rs`
  - [ ] Implement kill/stop semantics (graceful then force)
  - [ ] Add backpressure/bounded buffering for output events
  - [ ] Add minimal integration test harness (platform-gated if necessary)
  - [ ] **Verify**
    - [ ] Manual: resize works; kill stops process; no hangs on large output

- [ ] **Initiative 14: Voice mode v0**
  - [ ] Add microphone capture abstraction (`AudioRecorder`) with clear error
        handling
  - [ ] Wire `VoiceStateMachine` events in `AppContainer.tsx`:
    - [ ] start/stop recording
    - [ ] transcribe on PTT release
    - [ ] inject transcription into normal input path and submit
  - [ ] Extend settings schema for whisper binary/model paths
  - [ ] Update `/voice install` to persist install metadata for auto-discovery
  - [ ] **Verify**
    - [ ] Manual: `terminai --voice` PTT → transcription → prompt submit
