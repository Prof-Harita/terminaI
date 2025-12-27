# TermAI — Canonical Implementation Checklist (Execution-Ready)

This file is the **single source of truth** for execution. It is designed to be
“Codex Max-proof”: accurate to this repo, sequenced, and testable.

## 0. Guardrails (Minimal Fork + Safety)

- Prefer **config/prompt overrides** over invasive rewrites.
- Preserve upstream safety and confirmation UX (policy engine + tool
  confirmations remain authoritative).
- Any “always-on” behavior (watchers, voice, web-remote) must be **opt-in** and
  disabled by default.
- Keep outputs bounded (ring buffers, truncation) to avoid runaway memory/token
  usage.

## 1. Current State (Already Done in Repo)

- [x] Default system prompt identity is TermAI + “General Terminal Tasks”
      workflows (`packages/core/src/core/prompts.ts`).
- [x] Initial environment context is TermAI-branded + includes a compact
      Node-derived system snapshot
      (`packages/core/src/utils/environmentContext.ts`).
- [x] Prompt tests assert TermAI identity/workflows
      (`packages/core/src/core/prompts.test.ts`).

## 2. Next Sprint Plan (Pick One P0 Slice and Ship)

Recommended execution order for the next agent run:

1. **P0: Process Manager Tool** (named long-running sessions; the core enabler).
2. **P0: Agent Control Tool** built on Process Manager (spawn/manage external
   agent CLIs).
3. **P1: Awareness + proactive alerts** (opt-in; observe/report first).
4. **P2: Web-remote** (opt-in; authenticated; threat-modelled).
5. **P2: Voice excellence** (opt-in; interruption; background notifications).

Definition of done for a sprint:

- A single capability is usable from the CLI, has at least one unit test, and
  has a clear manual verification recipe.

Non-optional scope note:

- P0 (Process Manager + Agent Control) and P1 (opt-in Awareness) are the
  intended next phases and should be treated as committed scope unless blocked
  by safety/reliability constraints.

## Phase 1 — Prompt/Context Hardening (Small Follow-ups)

- [ ] Provide an optional TermAI prompt override file and instructions
      (preferred minimal fork path):
  - [ ] Add `docs/termai-system.md` (example TermAI system prompt to use with
        `TERMINAI_SYSTEM_MD`).
  - [ ] Update docs/README with: `TERMINAI_SYSTEM_MD=... gemini` usage.
- [ ] Add a regression test: “enabling CodebaseInvestigator does not reintroduce
      Software Engineering Tasks wording”.

## Phase 2 — P0: Process Manager Tool (Persistent Orchestration)

### 2.1 Scope (What to Build)

- Named process sessions that TermAI can start and control:
  - start a process (PTY when enabled; fallback when not)
  - list sessions
  - read/tail recent output (bounded)
  - send input / signals (e.g., Ctrl+C)
  - stop/restart (with confirmation)

### 2.2 File Targets (Repo-Accurate)

- [x] Create new tool: `packages/core/src/tools/process-manager.ts`
- [x] Register tool in `packages/core/src/config/config.ts` inside
      `createToolRegistry()` using `registerCoreTool(...)`
- [x] Add tool name constant to `packages/core/src/tools/tool-names.ts` (and
      tests if required)
- [x] Add unit tests:
  - [x] `packages/core/src/tools/process-manager.test.ts`
  - [x] Mock `ShellExecutionService` or spawn a trivial process (`node -e`)
        depending on existing test patterns

### 2.3 Tool API (Make It Hard To Misuse)

- [x] Tool operations should be explicit and typed, e.g.:
  - `start`: `{ name, command, cwd?, env?, background?: true }`
  - `list`: `{}`
  - `status`: `{ name }`
  - `read`: `{ name, lines?: number }`
  - `send`: `{ name, text }` (for stdin)
  - `signal`: `{ name, signal }` (SIGINT/SIGTERM)
  - `stop`: `{ name, signal?: SIGTERM }`
- [x] All outputs must be bounded:
  - [x] store last N lines or last M bytes per session
  - [x] expose `read(lines=N)` to retrieve bounded output

### 2.4 Safety/Policy Requirements

- [x] `stop`/`signal`/`restart` must request confirmation using existing
      confirmation flows (similar to shell tool).
- [x] Default signals should be graceful first (`SIGINT`/`SIGTERM`), with
      explicit escalation to `SIGKILL`.
- [x] No implicit background processes: must be explicit from the model/user.

### 2.5 Acceptance Tests (Manual)

- [ ] From interactive `gemini`, ask:
  - [ ] “Start `npm run dev` as `devserver` and tell me when it’s ready.”
  - [ ] “Show me the last 50 lines from `devserver`.”
  - [ ] “Send Ctrl+C to `devserver`.”
  - [ ] “List running sessions.”

## Phase 3 — P0: Agent Control Tool (Built on Process Manager)

### 3.1 Scope

- Control external agent CLIs (e.g., `claude`, `aider`) as managed sessions:
  - spawn agent
  - send prompt/instructions
  - read recent output
  - stop agent

### 3.2 File Targets

- [ ] Create `packages/core/src/tools/agent-control.ts`
- [ ] Register in `packages/core/src/config/config.ts`
- [ ] Implement on top of Process Manager sessions (do not duplicate process
      management)
- [ ] Add `packages/core/src/tools/agent-control.test.ts`

### 3.3 Safety

- [ ] Spawning external agents must be explicit and confirmable (especially if
      they can modify files).
- [ ] Prefer a restrictive default allowlist for agent commands (e.g., known
      binaries) to avoid arbitrary process spawning through this tool.

## Phase 4 — P1: Awareness + Proactive Alerts (Opt-in)

### 4.1 Scope

- Watchers emit events; alerts are optional and non-destructive.

### 4.2 File Targets

- [ ] `packages/core/src/awareness/systemWatcher.ts`
- [ ] `packages/core/src/awareness/processWatcher.ts` (TermAI-managed sessions)
- [ ] `packages/core/src/awareness/gitWatcher.ts`

### 4.3 CLI Integration (Repo-Accurate)

- [ ] Add a CLI flag in `packages/cli/src/config/config.ts` (yargs): `--watch`
      (and optionally `--no-proactive` / `--quiet`).
- [ ] Wire the mode in `packages/cli/src/gemini.tsx`:
  - [ ] Start watchers only when `--watch` is enabled.
  - [ ] Render/report alerts without interrupting workflows by default.

### 4.4 Acceptance

- [ ] Without `--watch`, no polling occurs.
- [ ] With `--watch`, events can be queried (“what did you notice recently?”)
      and never auto-run destructive commands.

## Phase 5 — P2: Web-Remote (Opt-in, Security First)

### 5.1 Non-negotiable security requirements

- [x] Auth required; no anonymous access.
- [x] Bind to localhost by default.
- [x] CORS origin allowlist.
- [x] Explicit CLI warning that this exposes local execution.

### 5.2 Implementation (Done)

- [x] Add auth + CORS + replay guard middleware in
      `packages/a2a-server/src/http/*` and install in
      `packages/a2a-server/src/http/app.ts`.
- [x] Store token verifier under `~/.gemini/` via
      `packages/a2a-server/src/persistence/remoteAuthStore.ts`.
- [x] Add CLI flags + server wiring in `packages/cli/src/config/config.ts`,
      `packages/cli/src/utils/webRemoteServer.ts`,
      `packages/cli/src/gemini.tsx`.
- [x] Add tests: `packages/a2a-server/src/http/auth.test.ts`,
      `packages/a2a-server/src/http/cors.test.ts`,
      `packages/a2a-server/src/http/replay.test.ts`,
      `packages/cli/src/utils/webRemoteServer.test.ts`,
      `packages/cli/src/config/config.test.ts`,
      `packages/a2a-server/src/http/app.test.ts`.

## Phase 6 — P2: Voice Mode (Opt-in)

### 6.1 Flags + settings schema (Done)

- [x] Add `--voice` flags (yargs in `packages/cli/src/config/config.ts`) and
      schema in `packages/cli/src/config/settingsSchema.ts`.

### 6.2 Spoken reply + TTS scaffolding (Done)

- [x] Spoken reply derivation: `packages/cli/src/voice/spokenReply.ts` + tests.
- [x] TTS provider selection + controller: `packages/cli/src/voice/tts/auto.ts`,
      `packages/cli/src/voice/voiceController.ts` + tests.

### 6.3 UI wiring (Pending)

### 6.3 UI wiring (Done)

- [x] Wire voice mode in `packages/cli/src/gemini.tsx` +
      `packages/cli/src/ui/AppContainer.tsx`.
- [x] Push-to-talk key interrupts TTS; default spoken replies <= 30 words.

## Phase 7 — Verification & CI Hygiene

### 7.1 Automated checks (run before merging)

- [ ] `npm run format`
- [ ] `npm run lint:ci`
- [ ] `npm run typecheck`
- [ ] `npm run test:ci`

### 7.2 Minimal manual flows (MVP regression)

- [ ] “What’s eating my CPU?” (inspect, summarize, suggest next steps).
- [ ] “How much disk do I have?” (df/du summary).
- [ ] “Kill PID X” (confirm, stop, report).
- [ ] “What’s the weather in Austin?” (web search/fetch).

## Phase 8 — Fork Hygiene

- [ ] Keep diffs small; avoid renames unless necessary.
- [ ] Prefer feature flags/env toggles for risky or always-on features.
- [ ] Document TermAI launch via `TERMINAI_SYSTEM_MD` so upstream merges stay
      clean.
