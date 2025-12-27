# TermAI — Sequenced Implementation Tasks (v2, Execution-Ready)

This file consolidates:

1. All **outstanding** work items from `tasks.md` (expanded with concrete
   file/test targets).
2. A new **front-loaded** phase to harden prompts + core tooling for “terminal
   love” use cases (web info, search, file management, concise operator advice).
3. All **outstanding** expansion items from `tasks_diff.md` (scoped and
   sequenced as deferred phases).

## 0. Guardrails (Non‑Negotiable)

- Minimal fork: prefer prompt/config over invasive rewrites.
- Safety first: upstream confirmation/policy remains authoritative.
- Opt‑in by default for “always‑on” and “remote” features.
- Bounded outputs/state: ring buffers, truncation, no unbounded logs.
- Cross‑platform: keep macOS/Linux/Windows behavior explicit and tested.

## 1. Current State (Already Done in Repo)

- TermAI identity + “General Terminal Tasks” prompt exists
  (`packages/core/src/core/prompts.ts`).
- Startup system snapshot injection exists
  (`packages/core/src/utils/environmentContext.ts`).
- PTY-backed shell execution + streaming exists
  (`packages/core/src/services/shellExecutionService.ts`).
- Process sessions tool exists (`packages/core/src/tools/process-manager.ts`).
- Web-remote security gate exists (`packages/a2a-server/src/http/*`,
  `packages/cli/src/utils/webRemoteServer.ts`).
- Voice spoken-reply + TTS scaffolding exists (`packages/cli/src/voice/*`) and
  is wired into the UI.

## 2. Phase 0 — Prompt + Core Tooling Hardening (P0, do this first)

Goal: make TermAI reliably great at the terminal tasks people actually do daily:
web info, search, file management, and concise operator advice—_before_ adding
more surfaces.

### 2.1 Prompt Packaging + “No Drift” Tests (from `tasks.md`, expanded)

- [x] Add TermAI prompt override file for minimal-fork launch:
  - [x] Add `docs/termai-system.md` (example TermAI system prompt to use with
        `TERMINAI_SYSTEM_MD`).
  - [x] Update `README.md` with a dedicated “TermAI prompt override” section
        showing `TERMINAI_SYSTEM_MD=... gemini`.
  - [x] Add a short pointer in `docs/get-started/index.md` (or most appropriate
        get-started page) to `TERMINAI_SYSTEM_MD` usage.
- [x] Add regression test: “enabling CodebaseInvestigator does not reintroduce
      Software Engineering Tasks wording”.
  - Target: `packages/core/src/core/prompts.test.ts`
  - Assertion: prompt contains “General Terminal Tasks” and does **not** contain
    “Software Engineering Tasks”.

### 2.2 Tooling Hardening: Web (latest online info, Google search)

Scope: make web tools predictable, safe, and resilient (including
network-restricted environments).

- [x] Add/extend unit tests for `WebSearchTool` citation insertion correctness:
  - Target: `packages/core/src/tools/web-search.test.ts`
  - Cases: empty response; sources present; UTF‑8 byte index insertion does not
    corrupt text; stable “Sources:” list formatting.
- [x] Add/extend unit tests for `WebFetchTool` URL parsing and safety:
  - Target: `packages/core/src/tools/web-fetch.test.ts`
  - Cases: malformed URL detection; unsupported protocol; multiple URLs; GitHub
    blob → raw conversion; private IP / localhost rejection behavior (if
    applicable).
- [ ] Ensure web tool UX stays concise and bounded:
  - Targets: `packages/core/src/tools/web-search.ts`,
    `packages/core/src/tools/web-fetch.ts`
  - Requirements: bounded output; actionable error messages; no secrets in logs;
    consistent `ToolErrorType`.
- [x] Add a TermAI “online info” recipe section (docs-only, no code) covering
      safe patterns:
  - Targets: `docs/tools/web-fetch.md`, `docs/tools/web-search.md` (or add a
    small TermAI appendix page and link from these)
  - Examples: weather, “latest CVEs”, “latest release notes” with citations and
    minimal output.

### 2.3 Tooling Hardening: Search (grep/glob/ripgrep) and Navigation

Scope: make “find things” reliable across multi-workspace repos with bounded
outputs.

- [ ] Add regression tests for multi-workspace behavior and boundary
      enforcement:
  - Targets: `packages/core/src/tools/grep.test.ts`,
    `packages/core/src/tools/glob.test.ts`
  - Cases: `dir_path` within workspace; `dir_path` outside workspace rejected;
    multi-root path prefixing stable; ignore rules respected.
- [x] Add a “best practice” doc section for searching large repos efficiently:
  - Targets: `docs/tools/file-system.md` and/or `docs/tools/shell.md`
  - Include: prefer `grep`/`glob` tools for structured results; prefer `rg` via
    shell when appropriate with quiet flags; avoid huge outputs (redirect to
    temp).

### 2.4 Tooling Hardening: Edit / Manage / Organize Files (missing primitives)

Repo reality: we have read/write/edit tools, but “organize files” is currently
mostly a shell task. To make file management safer and more cross-platform (and
reduce shell injection risks), add a minimal, workspace-scoped file ops tool.

- [x] Add `FileOpsTool` (workspace-scoped, safe defaults):
  - [x] Create `packages/core/src/tools/file-ops.ts`
  - [x] Add tool name constant in `packages/core/src/tools/tool-names.ts` (+
        `packages/core/src/tools/tool-names.test.ts`)
  - [x] Register in `packages/core/src/config/config.ts` (inside
        `createToolRegistry()` via existing `registerCoreTool(...)`)
  - [x] Add unit tests: `packages/core/src/tools/file-ops.test.ts`
  - Operations (explicit + typed, bounded output):
    - `mkdir`: `{ path, parents?: boolean }`
    - `move`: `{ from, to, overwrite?: boolean }`
    - `copy`: `{ from, to, overwrite?: boolean }`
    - `delete`: `{ path, recursive?: boolean }`
    - `list_tree`: `{ path?, maxDepth?, maxEntries? }` (bounded, for “organize
      my folder” workflows)
  - Safety rules:
    - Reject paths outside workspace.
    - Require confirmation for `delete`, `move` with overwrite, and recursive
      operations.
    - Never follow symlinks by default; treat them carefully and explicitly.

### 2.5 “Operator Recipes” (concise advice, repeatable terminal wins)

Goal: users love the terminal for repeatable tasks; make those “first-class”
without adding heavy engines yet.

- [x] Add a TermAI “Operator Recipes” page with concrete prompts and expected
      behavior:
  - Target: `docs/termai-operator-recipes.md` (new) and link it from `README.md`
    and `docs/index.md` (or the most appropriate docs hub).
  - Must include: search files, summarize logs, free disk space safely, identify
    CPU hogs, compress large files, organize a downloads folder.
  - Include a “safe pattern” section: preview → explain → confirm → execute →
    recap.
- [x] Add a small set of example custom commands (docs-only) that wrap common
      recipes:
  - Target: `docs/cli/custom-commands.md` (append examples) or `docs/examples/`
    (new examples)
  - Examples: “disk triage”, “cpu triage”, “repo search”, “log tail and
    summarize”.

---

## 3. Phase 1 — Process Orchestration: Manual Acceptance + UX Polish (from `tasks.md`)

### 3.1 Manual Acceptance (must be written down and reproducible)

- [ ] From interactive `gemini`, verify:
  - [ ] “Start `npm run dev` as `devserver` and tell me when it’s ready.”
  - [ ] “Show me the last 50 lines from `devserver`.”
  - [ ] “Send Ctrl+C to `devserver`.” (via `signal` SIGINT or PTY input as
        applicable)
  - [ ] “List running sessions.”
- [x] Document the manual verification recipe and expected outcomes:
  - Target: `DEPLOY.md` (append) or a new `docs/termai-process-manager.md`
    (preferred if docs architecture wants it)

---

## 4. Phase 2 — P0: Agent Control Tool (outstanding from `tasks.md`)

### 4.1 Scope

- Control external agent CLIs (e.g., `claude`, `aider`) as managed sessions:
  - spawn agent
  - send prompt/instructions
  - read recent output
  - stop agent

### 4.2 Implementation Tasks

- [x] Create `packages/core/src/tools/agent-control.ts`
- [x] Register in `packages/core/src/config/config.ts`
- [x] Implement on top of Process Manager sessions (do not duplicate process
      management)
- [x] Add `packages/core/src/tools/agent-control.test.ts`

### 4.3 Safety Requirements

- [x] Spawning external agents must be explicit and confirmable (especially if
      they can modify files).
- [x] Prefer a restrictive default allowlist for agent commands (e.g., known
      binaries) to avoid arbitrary process spawning through this tool.
- [x] Ensure agent-control cannot silently bypass workspace trust boundaries or
      approval mode constraints.

---

## 5. Phase 3 — P1: Awareness + Proactive Alerts (Opt‑in) (outstanding from `tasks.md`)

### 5.1 Core Watchers (new files)

- [ ] `packages/core/src/awareness/systemWatcher.ts` (CPU/mem/disk snapshots,
      throttled)
- [ ] `packages/core/src/awareness/processWatcher.ts` (TermAI-managed sessions
      status)
- [ ] `packages/core/src/awareness/gitWatcher.ts` (dirty state, branch drift,
      recent commits)

### 5.2 CLI Wiring (opt-in only)

- [ ] Add CLI flag in `packages/cli/src/config/config.ts` (yargs): `--watch`
      (and optionally `--no-proactive` / `--quiet`)
- [ ] Wire mode in `packages/cli/src/gemini.tsx`:
  - [ ] Start watchers only when `--watch` is enabled.
  - [ ] Render/report alerts without interrupting workflows by default.

### 5.3 Acceptance

- [ ] Without `--watch`, no polling occurs.
- [ ] With `--watch`, events can be queried (“what did you notice recently?”)
      and never auto-run destructive commands.

---

## 6. Phase 4 — Web‑Remote Expansion (outstanding from `tasks_diff.md`)

Note: `tasks.md` considers Phase 5 web-remote security gate “done”. This phase
adds **optional** product surfaces on top, keeping security-first defaults.

### 6.1 Real-time streaming transport (only if HTTP streaming proves insufficient)

- [ ] Add WebSocket endpoint for real-time chat streaming
  - Targets: `packages/a2a-server/src/http/app.ts` (route),
    `packages/a2a-server/src/http/*` (auth/cors/replay reuse), and new tests
    under `packages/a2a-server/src/http/`
  - Acceptance: auth required; origin allowlist enforced; confirmations
    preserved end-to-end; no secrets in logs.

### 6.2 Minimal Web Client (static, mobile-friendly)

- [ ] Create `packages/web-client/` directory:
  - [ ] `packages/web-client/index.html`
  - [ ] `packages/web-client/style.css`
  - [ ] `packages/web-client/app.js`
  - [ ] `packages/web-client/voice.js` (optional; browser STT/TTS, stays opt-in)
- [ ] Features:
  - [ ] Text chat with streaming responses
  - [ ] Voice input via browser microphone (Web Speech API) (opt-in)
  - [ ] Voice output via browser TTS (opt-in)
  - [ ] Mobile-responsive design
- [ ] Server integration:
  - Target: serve behind auth from `packages/a2a-server` (prefer same-origin
    `/ui`) OR document strict CORS allowlisting.

### 6.3 Tunnel Setup Helper (optional, must be explicit and scary-labeled)

- [ ] Create `scripts/tunnel.sh`:
  - [ ] Auto-detect: cloudflared, ngrok, or tailscale
  - [ ] Generate tunnel URL
  - [ ] Print QR code for mobile access
- [ ] Add `gemini --serve` (or dedicated subcommand) to start:
  - [ ] A2A server on localhost:8080 (or configurable port)
  - [ ] Optionally starts tunnel
  - [ ] Prints access URL

### 6.4 Web Client Deployment (optional)

- [ ] GitHub Action to deploy `packages/web-client/` to:
  - [ ] Cloudflare Pages (preferred)
  - [ ] Or Vercel / Netlify as backup
- [ ] Configure with environment variable for user tunnel URL

---

## 7. Phase 5 — Voice Excellence Expansion (outstanding from `tasks_diff.md`)

Note: voice scaffolding exists; this phase targets “natural” voice UX (still
opt-in).

### 7.1 Voice interruption by user speech (not only keypress)

- [ ] Detect user speech during TTS playback
- [ ] Immediately stop TTS
- [ ] Process new input without losing context

### 7.2 Background voice notifications

- [ ] "Let me know when the build finishes" — TermAI continues listening
- [ ] Non-blocking notifications spoken in background
- [ ] "What was that alert?" — recalls last spoken notification

### 7.3 Natural clarification (conversation control)

- [ ] "Wait, what I meant was..."
- [ ] "Actually, can you first..."
- [ ] Context stack: push/pop conversation threads

---

## 8. Phase 6 — Memory Learning + Forget (outstanding from `tasks_diff.md`)

Goal: keep memory local and minimal; reuse existing `memoryTool` + hierarchical
`GEMINI.md` mechanisms.

- [ ] Record user corrections: "Use yarn, not npm"
- [ ] Record repeated patterns: "You always run `npm test` after edits"
- [ ] Inject learned preferences into prompt/context via existing memory
      channels (global memory + hierarchical `GEMINI.md`)
- [ ] Add `/forget` command to clear specific memories
  - Must map cleanly onto existing memory format; require confirmation for
    destructive memory edits.

---

## 9. Phase 7 — Workflow Automation Engine (outstanding from `tasks_diff.md`)

### 9.1 Workflow definition + storage

- [ ] Create workflow format (YAML or JSON) with validation
- [ ] Store workflows in `.termai/workflows/` (workspace-scoped) or
      `~/.termai/workflows/` (global)

### 9.2 Workflow runner

- [ ] Create `packages/core/src/workflows/engine.ts`
  - [ ] Parse and validate workflow definitions
  - [ ] Execute with checkpoints (resume on failure)
  - [ ] Support parallel steps (bounded)
- [ ] Create `WorkflowTool` to trigger by name: "Run deploy-staging"
  - Ensure confirmations/policy remain authoritative.

---

## 10. Phase 8 — Persona + Explicit Verbosity Controls (outstanding from `tasks_diff.md`)

### 10.1 Persona (optional; keep predictable)

- [ ] Create `packages/core/src/persona/termai.ts`
  - [ ] Response style: concise, slightly witty, confident
  - [ ] Error handling: never apologetic, always solution-focused
  - [ ] Celebration: brief acknowledgment of success
- [ ] Integrate persona hints into system prompt (must not break
      safety/conciseness rules)

### 10.2 Adaptable verbosity (must remain deterministic)

- [ ] Detect user expertise level over time (optional; keep local and bounded)
- [ ] Adjust explanations: detailed for beginners, terse for experts
- [ ] `--verbose` and `--quiet` flags for explicit control (if missing, add; if
      present, document)

---

## 11. Phase 9 — Distribution + Install (outstanding from `tasks_diff.md`)

- [ ] Create separate `termai` npm package or fork naming
- [ ] `npx termai` should work
- [ ] Include a `system.md` (or `docs/termai-system.md`) with the package
- [ ] Installation script (optional, security-sensitive):
  - [ ] One-liner: `curl -fsSL termai.sh | bash` (only if explicitly desired;
        must be transparent + reviewable)
  - [ ] Handles: Node.js check, npm install, alias setup
  - [ ] Post-install: Auth flow if needed

### 11.1 Docs polish for distribution

- [ ] README with demo GIF
- [ ] Quickstart guide
- [ ] “What can TermAI do?” examples page
- [ ] Comparison: TermAI vs gemini-cli vs warp vs fig

---

## 12. Verification & CI Hygiene (outstanding from `tasks.md`)

### 12.1 Automated checks (run before merging)

- [ ] `npm run format`
- [ ] `npm run lint:ci`
- [ ] `npm run typecheck`
- [ ] `npm run test:ci`

### 12.2 Minimal manual flows (MVP regression)

- [ ] “What’s eating my CPU?” (inspect, summarize, suggest next steps).
- [ ] “How much disk do I have?” (df/du summary).
- [ ] “Kill PID X” (confirm, stop, report).
- [ ] “What’s the weather in Austin?” (web search/fetch).

---

## 13. Fork Hygiene (outstanding from `tasks.md`)

- [ ] Keep diffs small; avoid renames unless necessary.
- [ ] Prefer feature flags/env toggles for risky or always-on features.
- [ ] Document TermAI launch via `TERMINAI_SYSTEM_MD` so upstream merges stay
      clean.
