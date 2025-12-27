# TerminaI v0.21.0 — Codex Architectural Evaluation & 3–6 Month Execution Plan

Document date: 2025-12-26  
Codebase: `/home/profharita/Code/terminaI` (monorepo)

This report is a deep architectural analysis of TerminaI (a minimal,
compatibility-preserving fork of Google’s Gemini CLI), focused on
professionalization: stability, governance, auditability, and mergeable
evolution.

---

## Executive Summary

### What’s strongest today (high-leverage existing investments)

1. **Real tool execution scheduler with a cross-surface approval contract**
   - `CoreToolScheduler` is a genuine “execution spine”: validates tool calls,
     handles confirmation, executes tools, formats responses, and supports
     cancellation cascades.
   - It is used by the interactive CLI UI and by non-interactive flows through a
     single core entry.
   - Key anchors:
     - Scheduler approval gate and non-interactive restriction:
       `packages/core/src/core/coreToolScheduler.ts:865`,
       `packages/core/src/core/coreToolScheduler.ts:899`
     - CLI approval rendering (incl. PIN):
       `packages/cli/src/ui/components/messages/ToolConfirmationMessage.tsx:41`

2. **Deterministic Approval Ladder (A/B/C) wired into Shell execution**
   - Deterministic minimum review level computation exists and is integrated
     into Shell with an explicit PIN verification path (Level C).
   - Key anchors:
     - Deterministic ladder:
       `packages/core/src/safety/approval-ladder/computeMinimumReviewLevel.ts:40`
     - Shell integration + PIN: `packages/core/src/tools/shell.ts:150`,
       `packages/core/src/tools/shell.ts:190`

3. **Operator-grade shell execution in core (PTY + bounded output + safe
   cancellation)**
   - Shell execution is robust: PTY fallback, output truncation, binary
     detection, password prompt detection, and termination behavior.
   - Key anchors:
     - Shell execution service:
       `packages/core/src/services/shellExecutionService.ts:263`
     - Output truncation hooks in scheduler:
       `packages/core/src/core/coreToolScheduler.ts:1241`

4. **Provider architecture scaffolding exists (model routing + provider
   capabilities)**
   - There is an explicit provider configuration and capability surface, plus a
     model routing service.
   - Key anchors:
     - Provider config/types: `packages/core/src/core/providerTypes.ts:8`
     - Model router: `packages/core/src/routing/modelRouterService.ts:26`

5. **Remote relay crypto & pairing protocol (host-side) + cloud relay “dumb
   pipe” with rate limiting**
   - The relay design is plausibly “zero-trust” (E2EE, AAD, strict seq, pairing
     gate), and the cloud relay is intentionally content-blind with rate limits.
   - Key anchors:
     - Host relay logic: `packages/a2a-server/src/http/relay.ts:64`
     - Cloud relay rate limiting/heartbeat:
       `packages/cloud-relay/src/server.ts:22`

### Strategic framing (what is defensible vs “just upstream Gemini CLI”?)

Upstream already has “a CLI that can call tools”. TerminaI’s defensibility comes
from combining:

- **Governed autonomy you can audit** (deterministic review + provenance +
  action ledger) across _every execution surface_.
- **Repeatable operator workflows (“recipes”)** that encode playbooks with
  previews, verification, and rollback notes.
- **Desktop automation under governance** (accessibility-first, bounded, opt-in,
  review-gated, and logged) as a “universal operator” wedge.
- **A measurable cognitive layer (“brain”)** that improves success-rate/cost
  without becoming an untestable authority.

There is a tension to resolve explicitly:

- **Infrastructure lens**: stabilize governance/audit/PTY first, then ship
  differentiators.
- **Product lens**: ship differentiators (recipes + governed GUI + measurable
  brain) while hardening only the minimum infra needed to make them trustworthy.

This report recommends a **thin-slice “moat MVP”**: ship recipes + governed GUI
with audit evidence first, while fixing the few infra gaps that would otherwise
make those features unsafe or unreliable.

### The biggest professionalization blockers (highest to lowest priority)

1. **Governance consistency is not yet centralized**
   - The deterministic approval ladder exists, but it is applied unevenly (Shell
     is ahead).
   - Provenance-based escalation is specified but not reliably threaded into
     action profiles (e.g., Shell sets provenance as a TODO/hard-coded source).
   - Risk: “one bypass path” (a tool or remote path that performs side effects
     without consistent review + logging) becomes the failure mode that defines
     the product.

2. **Brain has active code paths that bypass the tool/approval system**
   - Non-interactive can execute local code via the `FW_SCRIPT` path
     (`REPLManager` spawns `python3`/`node`) without going through
     `CoreToolScheduler`, approvals, or audit.
   - Anchors:
     - Orchestrator invoked in non-interactive:
       `packages/cli/src/nonInteractiveCli.ts:259`
     - Script execution via REPL: `packages/core/src/brain/codeThinker.ts:24`,
       `packages/core/src/brain/replManager.ts:22`

3. **Auditability is incomplete for a governed operator**
   - There is JSONL session logging and telemetry, but not a unified “governance
     ledger” (tamper-evident, queryable, policy/approval-aware) spanning
     CLI/Desktop/A2A.
   - Risk: you can’t later prove “what happened, when, and under what approval
     and policy context” across all surfaces.
   - Anchors:
     - Local JSONL: `packages/core/src/core/logger.ts:309`
     - Retention pruning: `packages/cli/src/utils/logCleanup.ts:15`

4. **Evolution Lab is high-leverage but not safe-by-default**
   - The harness exists and is wired to session logs, but its “headless” sandbox
     executes tasks directly on the host (only changing `HOME`) — too risky for
     adversarial/system tasks.
   - Anchors:
     - Headless mode runs without Docker:
       `packages/evolution-lab/src/sandbox.ts:60`
     - Host exec path + env override:
       `packages/evolution-lab/src/sandbox.ts:131`

5. **Desktop PTY is currently not operator-grade**
   - Fixed PTY size, no effective resize, no reliable process lifecycle
     management/termination semantics, and no backpressure.
   - This will become the largest crash/support driver the moment users attempt
     real system repair workflows.
   - Anchor: `packages/desktop/src-tauri/src/pty_session.rs:12`

6. **Branding migration is partially resolved but still has naming seams**
   - Docs now prefer TERMINAI-prefixed env vars and `.terminai`; env aliasing
     bridges Terminai-prefixed ⇄ legacy Gemini-prefixed, but core code paths
     still reference legacy Gemini-prefixed env vars and some `.gemini` strings
     remain in UX copy/comments.
   - Anchors:
     - Env alias shim: `packages/core/src/utils/envAliases.ts:1`
     - Alias applied at CLI entry: `packages/cli/index.ts:12`
     - `.terminai` with legacy `.gemini` fallback:
       `packages/core/src/utils/paths.ts:13`
     - Non-interactive auth still checks the legacy Gemini API key env var
       (aliased): `packages/cli/src/validateNonInterActiveAuth.ts:23`

7. **CI/DX friction and partial test visibility**
   - CI currently builds in a way that can mutate dependency state
     (`npm install` inside build) before `npm ci` runs later.
   - CLI test suite explicitly excludes multiple tests; important UI/flow
     regressions may be invisible until late.
   - Anchors:
     - Build script auto-installs: `scripts/build.js:21`
     - CI ordering: `.github/workflows/ci.yml:139`,
       `.github/workflows/ci.yml:142`
     - CLI test exclusions: `packages/cli/vitest.config.ts:21`

### Guiding professionalization principles (aligned to project constraints)

- **Minimal fork**: prefer boundary layers, adapters, and configuration-driven
  overrides over large rewrites.
- **Safety first**: deterministic enforcement is the last line of defense; the
  model/brain may escalate caution but should not downgrade minimum review.
- **Opt-in remote**: remote features should be disabled by default; when
  enabled, they must increase review rigor and provenance scrutiny.
- **Bounded outputs**: avoid unbounded logs, memory growth, and token costs in
  all tool paths.
- **Upstream compatibility**: isolate divergence behind shims and narrow
  interfaces; avoid touching upstream code paths unless necessary.

---

## Meta-Evaluation (What This Analysis Should Be Accountable For)

**What the codebase already does well (and should be preserved)**

- Anchor-first architecture is possible because the execution spine is real and
  centralized (`CoreToolScheduler` + confirmation UX).
- Shell governance is already strong: deterministic minimum review + PIN +
  bounded output + cancellation.
- Minimal-fork posture is viable: many improvements can be achieved via shims
  and boundary layers rather than rewrites.

**Where deeper pressure is required (and what this report now emphasizes)**

- The brain is not just “future work”: it is already active (shell risk UX and
  non-interactive orchestration) and currently contains a bypass (`FW_SCRIPT`).
- Evolution Lab is the natural quality moat: without it, you cannot measure
  brain value or governance correctness empirically.
- GUI automation + recipes + voice are strategic surfaces; they must be treated
  as governed products, not experimental extras.
- Branding migration affects perceived professionalism and must be sequenced,
  not deferred indefinitely.

## Runtime Architecture (What Actually Runs)

### Primary entrypoints

- Wrapper sets system prompt path and disables relaunch, then imports CLI:
  - `packages/termai/src/index.ts:14`
- CLI entry calls `main()` and wraps fatal error handling:
  - `packages/cli/index.ts:15`
- Interactive vs non-interactive split in `main()`:
  - `packages/cli/src/gemini.tsx:305`

### Execution loop

**Interactive**

- Main UI stream management is in `useGeminiStream`.
- Tool calls are scheduled and executed through `useReactToolScheduler`, which
  wraps `CoreToolScheduler`.
- Anchors:
  - `packages/cli/src/ui/hooks/useGeminiStream.ts:104`
  - `packages/cli/src/ui/hooks/useReactToolScheduler.ts:171`

**Non-interactive**

- `runNonInteractive` loops over model streaming events and executes tools via
  `executeToolCall` (CoreToolScheduler).
- Anchors:
  - `packages/cli/src/nonInteractiveCli.ts:340`
  - `packages/core/src/core/nonInteractiveToolExecutor.ts:17`

**Tool execution**

- `CoreToolScheduler` validates → may await approval → executes tool → formats
  function responses.
- Anchors:
  - Validation/approval gating:
    `packages/core/src/core/coreToolScheduler.ts:865`
  - Shell-specific execution callback (PID):
    `packages/core/src/core/coreToolScheduler.ts:1194`

---

## Per-Area Analysis (Focused on Professionalization)

### 1) App Stability

**What’s solid**

- Cancellation is coherent: abort signal flows through tool execution and the
  scheduler can cancel all calls.
- Shell execution is robust and production-minded: PTY fallback, safe
  termination semantics, output truncation, binary detection,
  password/fullscreen prompts.

**Primary stability risks**

- Desktop PTY is a major mismatch with the “universal operator” promise; it will
  cause hangs/zombies/UX traps under real-world interactive ops.
- Some “brain” components fail open (acceptable as advisory prototypes,
  dangerous if treated as enforcement).

**Cleanup priorities**

- Define “operator-grade invariants” and enforce them centrally:
  - Every side-effecting action is bounded, cancelable, review-gated, and
    auditable.
  - No non-interactive hangs: no tool should block waiting for input without
    explicit interactive affordances.

---

### 2) CI/CD & Developer Experience

**Strengths**

- Broad CI coverage (lint, multi-node, multi-OS, E2E, deflake workflows).
- Dedicated deflake harness exists (`scripts/deflake.js:53`).

**Key problems**

- Build semantics in CI are not cleanly deterministic (auto-install inside
  build).
- Excluded UI tests create permanent blind spots unless treated as a tracked
  quality debt.

**Recommended approach**

- Separate “developer convenience build” from “CI deterministic build”
  explicitly.
- Convert excluded tests into a roadmap with re-enable criteria and owners.

---

### 3) Logging & Observability (vs Audit)

**What exists**

- Local per-session JSONL event logging via `Logger.logEventFull`.
- Retention pruning for logs.
- Large telemetry subsystem (with sanitization), but telemetry is not audit.

**What’s missing**

- A unified governance ledger that is:
  - action-centric (tool call + approval + policy decision + provenance +
    scope),
  - queryable (for support, compliance, and “why did it do that?”),
  - tamper-evident (hash chain or signed segments),
  - consistent across CLI/Desktop/A2A/Web-remote.

**Minimal-fork hook points**

- Two choke points can capture most governance truth without invasive rewrites:
  1. When a tool call enters `awaiting_approval` and when it is resolved.
  2. When a tool execution begins/ends (including PID, exit status, affected
     paths).
  - Scheduler anchors: `packages/core/src/core/coreToolScheduler.ts:882`,
    `packages/core/src/core/coreToolScheduler.ts:1225`

---

### 4) Cognitive Architecture (“Brain”)

**What is real + active today**

1. **Non-interactive runs the orchestrator before normal execution**
   - `runNonInteractive()` constructs `ThinkingOrchestrator` and calls
     `executeTask()` before it enters the normal streaming/tool loop.
   - If the orchestrator returns `inject_prompt`, non-interactive appends a
     “[Cognitive Strategy] …” message into the request.
   - Anchors:
     - Orchestrator invoked: `packages/cli/src/nonInteractiveCli.ts:259`
     - Prompt injection: `packages/cli/src/nonInteractiveCli.ts:287`
     - Orchestrator can short-circuit and return “done”:
       `packages/cli/src/nonInteractiveCli.ts:280`

2. **Shell tool uses risk assessment + routing**
   - Shell computes deterministic minimum review, then runs `assessRisk()` +
     `routeExecution()` to enrich confirmation copy and surface warnings.
   - This means the brain is not “dead code” — it already affects the user’s
     governance UX on the most important tool.
   - Anchors:
     - Brain evaluation in shell: `packages/core/src/tools/shell.ts:221`
     - Risk assessor (heuristic + optional LLM):
       `packages/core/src/brain/riskAssessor.ts:224`
     - Routing decision: `packages/core/src/brain/executionRouter.ts:24`

3. **Consensus = 5 advisors, parallel, timeouted**
   - `ConsensusOrchestrator` fans out to five advisor prompts (Enumerator,
     PatternMatcher, DepScanner, FallbackChain, CodeGenerator) with timeouts and
     early-return.
   - Anchors:
     - Advisors list: `packages/core/src/brain/consensus.ts:26`
     - Timeouts + early-return threshold:
       `packages/core/src/brain/consensus.ts:17`

4. **System spec injection is already in the system prompt**
   - Core prompt generation loads or scans a cached machine capability spec and
     injects it into the base prompt.
   - Anchors:
     - Prompt injection: `packages/core/src/core/prompts.ts:141`
     - Scanner: `packages/core/src/brain/systemSpec.ts:93`

5. **History exists and is used**
   - `historyTracker` maintains a local JSONL outcome log and can adjust risk
     confidence for “similar commands” (recent success/failure).
   - Anchors:
     - History file path uses `.termai` (brand leak):
       `packages/core/src/brain/historyTracker.ts:37`
     - Confidence adjustment logic:
       `packages/core/src/brain/historyTracker.ts:111`

**Critical risks / cleanup priorities**

- **Governance bypass via `FW_SCRIPT`**
  - The orchestrator’s `FW_SCRIPT` path executes model-generated code via
    `REPLManager` (writes a temp file and spawns `python3`/`node`).
  - This happens outside `CoreToolScheduler`, meaning no deterministic review,
    no provenance escalation, and no audit hooks.
  - Anchors:
    - `FW_SCRIPT` calls `CodeThinker.solve()`:
      `packages/core/src/brain/thinkingOrchestrator.ts:144`
    - REPL spawns processes and writes tmp files:
      `packages/core/src/brain/replManager.ts:22`

- **Framework selection mismatch**
  - The selector can output `FW_DECOMPOSE`, but the orchestrator doesn’t handle
    it explicitly (falls through).
  - Anchors:
    - Selector includes `FW_DECOMPOSE`:
      `packages/core/src/brain/frameworkSelector.ts:13`
    - Orchestrator switch coverage:
      `packages/core/src/brain/thinkingOrchestrator.ts:104`

- **Cost/latency budgets are not enforced centrally**
  - Some frameworks request `pro` tier (PAC verification, reflective critique)
    and consensus can fan out to multiple calls, but there is no global “brain
    budget” per request.
  - Anchors:
    - PAC verification uses pro tier: `packages/core/src/brain/pacLoop.ts:75`
    - Reflective critique uses pro tier:
      `packages/core/src/brain/reflectiveCritique.ts:33`

**Recommended positioning**

- Make the brain **advisory-first and measurable**: it can suggest strategy,
  diagnostics, and preview mode, but must never be an unreviewed execution
  surface.
- If local code execution is desired, route it through the existing tool system
  (e.g., REPL tool), so it is review-gated and auditable.

---

### 5) User Journeys & Testing

**Strengths**

- Large slash command surface with many tests and a consistent command
  processing architecture.
- Confirmation UX already supports PIN and multiple approval outcomes.

**Risks**

- “System operator” journeys depend on weakest-link governance; Shell is
  advanced, other mutators may lag.
- Some key UI tests are excluded, which weakens confidence in interactive flows.

**High-leverage missing piece: Evolution Lab as the regression gate**

- Evolution Lab is the right mechanism to empirically measure “governed
  autonomy” (success-rate, approval correctness, audit evidence) instead of
  relying on anecdote.
- Today, its “headless” sandbox type executes directly on the host and is not
  safe for adversarial/system tasks by default.
- Anchors:
  - Evolution Lab spec: `docs-terminai/evolution_lab.md:1`
  - Headless sandbox host execution: `packages/evolution-lab/src/sandbox.ts:60`

**Product surface gap: Recipes are documented but not implemented**

- The docs position recipes as a core “system operator” surface, but there is no
  core implementation/loader yet.
- Anchors:
  - Recipe concept doc: `docs-terminai/recipes.md:1`

**Voice mode status (today)**

- Voice mode is wired for **TTS** (spoken replies), including push-to-talk key
  handling and state machine transitions.
- STT implementation exists (`StreamingWhisper`), but it appears unintegrated
  (only referenced in tests).
- Anchors:
  - CLI voice flags: `packages/cli/src/config/config.ts:265`
  - Voice controller wiring (TTS): `packages/cli/src/ui/AppContainer.tsx:340`
  - PTT key handling: `packages/cli/src/ui/AppContainer.tsx:1570`
  - STT implementation file: `packages/cli/src/voice/stt/StreamingWhisper.ts:22`
  - STT referenced only in tests:
    `packages/cli/src/voice/stt/StreamingWhisper.test.ts:37`
  - Offline voice installer (network download):
    `packages/cli/src/commands/voice/install.ts:25`

---

### 6) UI Systems (CLI + Desktop)

**CLI**

- Strong tool lifecycle architecture: scheduler → tracked tool calls → UI
  renders confirmation/live output/results.
- Risk is complexity scaling: hundreds of components/hooks can encourage local
  fixes and regressions if tests remain excluded long-term.

**Desktop**

- PTY and CLI bridge are minimal and currently not suitable for high-reliability
  operation.
- Recommendation: Desktop should become a governed viewport over the same core
  scheduler/approval/audit primitives, not a parallel execution stack with
  weaker guarantees.

**GUI automation (opt-in, newly shipped MVP)**

- GUI automation is disabled by default and can be enabled via settings
  (`tools.guiAutomation.enabled`), which is the right default posture.
- The core service caches short-lived snapshots and refuses to operate unless
  explicitly enabled.
- Tools exist (`ui.click`, `ui.type`, `ui.snapshot`, etc.) and are wired through
  core like other tools — but they currently use generic confirmation semantics
  rather than the deterministic A/B/C ladder.
- Linux uses a Python AT-SPI sidecar spawned from a repo-relative path; Windows
  uses a Rust “driver” binary path that is currently stub-like.
- Anchors:
  - Enable toggle in CLI startup: `packages/cli/src/gemini.tsx:472`
  - Enabled gate in service:
    `packages/core/src/gui/service/DesktopAutomationService.ts:38`
  - Linux driver spawns python sidecar:
    `packages/core/src/gui/drivers/linuxAtspiDriver.ts:60`
  - AT-SPI sidecar RPC server:
    `packages/desktop-linux-atspi-sidecar/src/server.py:7`
  - Windows driver is stub snapshot:
    `packages/desktop-windows-driver/src/main.rs:148`
  - UI tool call wiring (example click):
    `packages/core/src/tools/ui-click.ts:35`

---

### 7) Integration: Gemini CLI Base ↔ TerminaI Fork

**Going well**

- `.terminai` directory exists; legacy `.gemini` is handled with a
  non-destructive migration/copy and fallback reads.
  - Anchor: `packages/core/src/utils/paths.ts:13`
- Provider capability scaffolding exists and can be grown incrementally.

**Ongoing costs**

- Significant coupling to `@google/genai` types remains widespread, which
  complicates provider neutrality and increases merge conflict likelihood.
- Many env vars and strings remain legacy Gemini-prefixed in code for
  compatibility; brand migration should be done with shims, not breakage
  (aliases now exist).
- There is a copied upstream chat implementation to patch behavior, increasing
  merge cost.

**Minimal-fork strategy**

- Introduce shims:
  - Prefer Terminai-prefixed env vars, fall back to legacy Gemini-prefixed (now
    implemented via env aliasing).
  - Centralize `@google/genai` imports behind a narrow module so
    provider-neutral work happens at a stable boundary.

**Concrete cleanup targets (low-risk professionalism wins)**

- Docs: update `.gemini` references to `.terminai` where you already support it.
  - Example: `docs-terminai/gui-automation.md:15`
- Auth env naming: keep `TERMINAI_API_KEY` preferred, with the legacy Gemini API
  key env var accepted via aliasing (already implemented).
  - Example env usage today: `packages/cli/src/validateNonInterActiveAuth.ts:23`
- Provider base URL naming: adopt `TERMINAI_BASE_URL` (legacy Terminai Gemini
  base URL env var remains supported).
- Storage/docstrings: scrub obvious `.gemini` path mentions in comments and UX
  copy to reduce user confusion.
  - Example: `packages/core/src/services/chatRecordingService.ts:110`

---

### 8) General Architecture (Boundaries, Security, Performance)

**Boundary pressure**

- `@terminai/core` exports a broad surface area, encouraging cross-layer
  coupling.
- `Config` constructs many services; it’s the main gravity well for future
  complexity.

**Security surface**

- Remote surfaces: web-remote, A2A server, relay protocol, MCP.
- Security posture has strong primitives (hashed tokens, loopback defaults, CORS
  allowlists, E2EE relay + pairing gate), but defaults and provenance escalation
  must be consistent and centralized.

---

## Dependency Map (Critical Path)

The next wave has a clear dependency order; trying to jump ahead increases risk
and fork divergence.

1. **Centralize governance primitives** (provenance → deterministic minimum
   review → consistent confirmations)
2. **Audit ledger v1** (approval + execution evidence at scheduler choke points)
3. **Eliminate bypass paths** (brain/side-channels must not execute outside
   tools)
4. **Evolution Lab “safety harness”** (small deterministic suite to
   regression-test governance/audit)
5. **Ship differentiated operator surfaces safely**
   - Recipes v0 (recipes run through tools so governance/audit are automatic)
   - GUI automation hardening (opt-in + bounded + review-gated)
6. **Desktop PTY hardening** (to make desktop an operator-grade surface)
7. **Remote governance hardening** (A2A/web-remote/relay)
8. **Provider boundary + long-horizon platformization** (reduce coupling without
   blowing mergeability)

---

## Effort Estimates (T-shirt sizing)

- Centralize approval ladder + provenance across all mutating tools: **L**
- Audit ledger v1 (schema + hooks + redaction + export): **L–XL**
- Eliminate brain bypass paths (`FW_SCRIPT` gating + framework alignment): **M**
- Evolution Lab “safety harness” (Docker default + deterministic suite): **M–L**
- Recipes v0 (format + loader + 5–10 recipes + validation): **L**
- GUI automation hardening (review ladder + bounding + packaging): **L–XL**
- Voice mode v0 (STT wiring + install alignment): **M**
- Desktop PTY hardening (resize/kill/backpressure/session lifecycle): **XL**
- Remote hardening (A2A replay protection, rate limits, safer defaults): **L**
- Branding migration cleanup (docs + env var shims + stragglers): **S–M**
- Reduce `@google/genai` coupling + provider neutrality: **XL** (incremental)

---

## Risk Assessment (What Could Go Wrong)

- **Weakest-link governance**: a single tool path that bypasses deterministic
  review or audit will become your defining incident.
- **Brain bypass incident**: if `FW_SCRIPT` (or any similar side-channel) can
  execute locally without tool approvals/audit, the “governed” story collapses.
- **Desktop PTY traps**: hangs, zombie processes, and inability to recover from
  interactive prompts will destroy trust quickly.
- **Remote defaults**: any “enabled by default” remote execution is a
  reputational and security risk. Remote must be opt-in with stronger
  review/provenance.
- **GUI automation risk**: click/type/snapshot are high-power operations; if
  they are not review-gated, bounded, and redacted, they will create avoidable
  incidents.
- **Recipe trust issues**: if recipes are not permissioned/signed/audited, “run
  a recipe” becomes the easiest supply-chain attack vector.
- **Evolution Lab safety**: if the harness runs tasks on host by default, it
  becomes too dangerous to use — and the project loses its best regression gate.
- **Fork divergence**: rewriting core loops for provider neutrality or “brain”
  authority will reduce mergeability; invest in boundaries and shims.
- **Test blind spots**: permanent exclusions can freeze UI correctness; treat
  them like production incidents with owners and deadlines.

---

## Open Questions (Expanded)

These must be answered (by maintainers/product) before committing to certain
architectural bets; otherwise teams will optimize in conflicting directions.

### 1) What is the formal definition of “audit trail” for TerminaI?

Decide which of these is required for v1 “governed operator” credibility:

- **A. Debug log**: best-effort text logs for troubleshooting.
- **B. Audit log**: structured, queryable evidence of actions + approvals.
- **C. Non-repudiable ledger**: tamper-evident chain (hash chain or signing)
  with export/verification.

Concrete decisions needed:

- What must be recorded: tool args? file diffs? command outputs? truncated
  outputs? environment metadata? policy decisions and reasons?
- What must be redacted (API keys, tokens, secrets, file contents) and at what
  layer (before write vs during export)?
- Retention and storage location expectations (per user, per workspace, per
  session).
- Is audit required for _all_ execution surfaces (CLI, desktop, A2A, relay) on
  day one?

### 2) What is the authority model for the “brain”?

Pick one (explicitly):

- **Advisory-only**: brain can suggest, plan, inject prompts, and request
  previews, but never changes minimum review requirements.
- **Governance assistant**: brain can escalate (require higher review or extra
  verification) but cannot downgrade deterministic minimums.
- **Governing component**: brain can block or enforce additional deterministic
  checks.

If you ever want (C), you must define:

- What parts must be deterministic vs model-based.
- How to test and prove non-regression (golden traces, scenario suites, property
  tests).
- How to bound cost and latency (no unbounded multi-call “thinking” in default
  paths).

### 3) What is “operator-grade PTY” in this project?

You need a spec for PTY semantics, otherwise desktop work will drift.

- Required behaviors: resize, child process tracking, kill/terminate, signal
  handling, input echo, password prompt routing, background tasks, log capture.
- Backpressure and output bounding strategy.
- Cross-platform parity targets: Linux/macOS/Windows expectations.
- Security integration: how approvals and policy decisions gate PTY operations.

### 4) What is the default stance for remote features?

Clear product/security stance needed:

- Is remote execution **disabled by default** everywhere, requiring explicit
  user enablement each session?
- If enabled on loopback: what additional friction exists for non-loopback
  binds?
- How is provenance labeled (“web remote user”) and how does that affect review
  level and tool allowlists?
- Are there different roles/scopes (read-only vs execute) for remote clients,
  and how are they enforced?

### 5) What is the desired upstream relationship over the next 6–12 months?

Compatibility has a cost; you must choose where you’ll accept divergence.

- What % of time is reserved for upstream merges?
- Is provider neutrality a near-term goal, or do you accept deeper Gemini
  coupling short-term to ship governance?
- What “hostile rebrand” changes are mandatory now vs later?

### 6) What are the non-negotiable safety invariants?

Examples that must be answered:

- Are there any actions that must be _impossible_ (hard deny), or is “everything
  possible with explicit confirmation” absolute?
- What is the minimum review behavior for actions outside workspace,
  device-level ops, privileged ops, and remote-sourced actions?
- Should “YOLO” mode be allowed at all, and if so under what explicit audit
  guarantees?

### 7) What is the “moat MVP” for the next 90 days?

Pick the primary wedge (and accept tradeoffs explicitly):

- Governance + audit as the moat (enterprise “governed operator”).
- Recipes as the moat (verified system operator playbooks).
- Desktop automation as the moat (universal operator wedge).
- Brain as the moat (measurable autonomy improvements).

Define how it will be measured (activation, retention, success-rate, audit
coverage, support ticket reduction).

### 8) What is the trust & permission model for recipes?

Decisions needed before implementing a recipe ecosystem:

- Where recipes live (built-in vs user vs shared/team) and how they are
  discovered.
- Whether recipes can request higher review levels (they should be able to
  escalate, never downgrade).
- Whether third-party recipes must be signed and how permissions are expressed.
- What must be recorded in the audit ledger for recipe execution (inputs,
  previews, approvals, outcomes).

### 9) What is the stance on “local code execution” inside the brain?

Given `FW_SCRIPT` can execute generated code via `REPLManager`, decide:

- Is this allowed at all? If yes, must it be routed through tool approvals?
- Is it disabled by default? Is it interactive-only? Is it sandboxed?
- What is the budget and the maximum blast radius (timeouts, fs/network access)?

### 10) What is the operator-grade safety contract for GUI automation?

- What is the minimum review level for UI actions (`ui.click`, `ui.type`)?
- What redaction is required for typed text and captured snapshots?
- What deterministic bounds exist (max actions/minute, max snapshot depth)?
- What are the platform parity expectations (Linux AT-SPI vs Windows UIA)?

---

## 3–6 Month Execution Plan (Initiatives → Key Tasks → Outcomes)

This plan is structured to minimize fork divergence while materially improving
reliability, governance, and differentiated product surfaces.

### Phase 1 (Weeks 0–6): “Governed Core + Moat Slice”

**Initiative 1: Provenance & Governance Centralization**

- Key tasks
  - Define a single provenance model (local user, web-remote user, workspace
    file, tool output, MCP server, etc.).
  - Thread provenance into action profiles and confirmation requests (remove
    TODO/hard-coded provenance in shell).
  - Extend deterministic minimum review computation to cover non-shell mutators
    (at least: file writes/edits, process manager, network fetch).
  - Ensure non-interactive mode consistently fails closed when confirmation is
    required (and provides actionable error output).
- Outcomes
  - One consistent “minimum review” rule system across major mutators.
  - Provenance reliably bumps review level for remote/untrusted sources.
  - Reduced risk of an execution bypass path.

**Initiative 2: Audit Ledger v1 (Action + Approval Evidence)**

- Key tasks
  - Define a stable audit event schema (tool call requested, awaiting approval,
    approval decision, execution started/ended, error).
  - Implement centralized hooks at scheduler boundaries so all tools inherit
    audit.
  - Add redaction/sanitization rules for audit payloads.
  - Add export tooling (read-only) and minimal UI access (e.g., `/audit`).
- Outcomes
  - Queryable evidence of “who approved what, what ran, and what happened”
    across interactive flows.
  - A foundation for “non-repudiable” extensions later (hash chain/signing).

**Initiative 3: Eliminate Brain Bypass Paths (Tool-Only Execution)**

- Key tasks
  - Disable or gate `FW_SCRIPT` execution so it cannot run outside tool
    approvals and audit.
  - Add a rule: “brain may only return guidance/tool suggestions, not spawn
    child processes.”
  - Align framework selection outputs to implemented frameworks (remove or
    implement `FW_DECOMPOSE`).
- Outcomes
  - No unreviewed execution surfaces outside `CoreToolScheduler`.
  - Safer iteration on cognitive features without increasing incident risk.

**Initiative 4: Evolution Lab “Safety Harness” (Small, Repeatable, CI-usable)**

- Key tasks
  - Make Docker sandbox the default (host execution should be opt-in).
  - Add a small deterministic suite focused on governance regressions: “approval
    required in non-interactive”, “audit events written”, “no bypass path”.
  - Produce a single report artifact format that links to representative logs.
- Outcomes
  - Empirical measurement of governed autonomy.
  - Faster, safer iteration across governance, brain, and GUI.

**Initiative 5: Branding Migration “Professionalism Pass”**

- Key tasks
  - Update docs to prefer `.terminai` and `TERMINAI_*`.
  - Complete env var aliasing coverage (Terminai overrides the legacy Gemini
    prefix) across tool/sandbox execution paths while keeping upstream
    compatibility.
  - Fix obvious stragglers that leak legacy names (e.g., `.termai` history
    path).
- Outcomes
  - Reduced user confusion/support load, without breaking legacy installs.

**Initiative 6: CI Determinism Baseline**

- Key tasks
  - Make CI builds deterministic: remove/disable implicit installs during CI
    builds; ensure `npm ci` is the only install step.
  - Establish one “preflight” path used locally and in CI for parity.
  - Track excluded UI tests as explicit quality debt with owners and re-enable
    criteria.
- Outcomes
  - Faster, more predictable CI and clearer UI correctness signals.

---

### Phase 2 (Weeks 6–12): “Operator Surfaces” (ship differentiated workflows safely)

**Initiative 7: System Operator Recipes v0**

- Key tasks
  - Implement a minimal recipe format + loader (built-in recipes shipped in repo
    first; user recipes later).
  - Define recipe step types that map to existing tools (shell, file tools, UI
    tools) so approvals/audit work automatically.
  - Ship 5–10 high-signal recipes (disk full triage, port in use, docker prune,
    wifi diagnostics) with verification + rollback notes.
  - Add validation tooling (schema + lint) and include in CI.
- Outcomes
  - A differentiated “system operator” UX that is reviewable and repeatable.
  - A natural contribution surface for the community.

**Initiative 8: GUI Automation Hardening (Governed by Default)**

- Key tasks
  - Ensure UI tools participate in deterministic review levels (at least B for
    click/type; C for higher-risk patterns like typing secrets).
  - Add output bounding for snapshots (depth/node limits) and consistent
    redaction rules (typed text, OCR/text index).
  - Package drivers in a shippable way (sidecar location/versioning; Windows
    driver not stub-only).
- Outcomes
  - GUI automation becomes a safe differentiator rather than a liability.

**Initiative 9: Voice Mode v0 (Complete the loop)**

- Key tasks
  - Wire STT into the interactive input path (push-to-talk → transcript → send).
  - Align install artifacts and runtime expectations (binary naming/path).
  - Add clear privacy defaults (offline-by-default; explicit consent for any
    network-based speech services).
- Outcomes
  - Voice becomes an actual interaction mode (not TTS-only).

**Initiative 10: Desktop PTY Hardening (Operator-Grade)**

- Key tasks
  - Implement resize and propagate terminal dimensions.
  - Track and control child processes (capture handles, support terminate/kill,
    prevent zombie sessions).
  - Add backpressure/throttling and bounded output capture consistent with core
    shell semantics.
  - Unify desktop execution with the same approval + audit primitives.
- Outcomes
  - Desktop becomes trustworthy for real system repair workflows.

**Initiative 11: Remote Governance Hardening (A2A + Web-Remote + Relay)**

- Key tasks
  - Ensure remote-origin actions are always tagged with provenance and are
    review-escalated deterministically.
  - Re-enable replay protection in A2A HTTP layer once body streaming conflicts
    are resolved.
  - Add explicit rate limiting and scope-based auth decisions (read-only vs
    execute) for remote.
  - Ensure audit captures remote identity/source context for every action.
- Outcomes
  - Remote control is safer-by-default and more supportable.

---

### Phase 3 (Weeks 12–24): “Platformization” (multi-provider + measured autonomy)

**Initiative 12: Provider Boundary & Reduced `@google/genai` Coupling
(Incremental)**

- Key tasks
  - Centralize `@google/genai` imports/types behind an internal adapter layer.
  - Gradually migrate internal modules to consume internal types rather than SDK
    types.
  - Mature OpenAI-compatible generator path and define a compatibility contract
    for tool calls/streaming.
- Outcomes
  - Lower merge conflict surface with upstream.
  - Clear path to multi-provider support without rewriting the engine.

**Initiative 13: Brain Integration (Advisory-First, Measurable)**

- Key tasks
  - Add orchestrator to interactive path as advisory-only: inject strategy
    prompts, recommend previews, never bypass deterministic review.
  - Introduce explicit budgets (max advisor calls, max pro-tier calls, timeouts)
    and metrics (success-rate, retries, time-to-completion, token cost).
  - Decide which sub-frameworks graduate from “prototype” to “supported”.
- Outcomes
  - Brain becomes a product feature (helpful, safe, measurable) rather than a
    parallel subsystem.

**Initiative 14: Expand Evolution Lab to “Real Surfaces”**

- Key tasks
  - Add GUI test suites gated on opt-in settings in a sandboxed desktop
    environment.
  - Add recipe execution regression tests (recipes as golden traces).
  - Add “bypass hunting” scenarios: ensure side effects cannot occur without
    passing through review + audit in any mode.
- Outcomes
  - Differentiators become measurable and regression-tested.

---

## Suggested Acceptance Criteria (“Definition of Done” per Phase)

**Phase 1 DoD**

- Any side-effecting tool call produces: (a) deterministic minimum review level,
  (b) consistent approval UX details, (c) audit events for approval + execution.
- Non-interactive has no “brain execution” path that can perform side effects
  outside tool approvals/audit.
- Evolution Lab can run a small deterministic suite in a sandbox and produce a
  report artifact.
- CI no longer runs implicit installs during builds.

**Phase 2 DoD**

- Recipes can be executed end-to-end with previews, approvals, and audit
  entries.
- GUI automation is opt-in and review-gated; snapshots/actions are bounded.
- Voice mode supports push-to-talk end-to-end (STT → send → TTS).
- Desktop can run interactive commands with resize, cancellation, and reliable
  shutdown.
- Remote paths enforce replay protection and scope/rate limiting; audit includes
  remote source context.

**Phase 3 DoD**

- Provider-neutral boundary exists and new provider integrations do not require
  touching core scheduler logic.
- Brain is integrated into interactive flow with bounded budgets and clear
  metrics; framework selection is consistent with implementation.

---

## Execution Checklist (Requested Verifications)

| #   | Initiative                   | Verification                                        | Result | Notes                                                                                                          |
| --- | ---------------------------- | --------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | Branding migration cleanup   | Search Markdown for legacy Gemini-prefixed env vars | PASS   | Only upstream dependency docs remain (`node_modules/@google/genai/README.md`); project docs are now clean.     |
| 2   | CI determinism fix           | `npm run preflight` and CI goes green               | PASS   | Preflight completed end-to-end; lint/shellcheck warnings remain but no errors.                                 |
| 3   | Evolution Lab Docker default | `npm run evolution` does not run on host            | PASS   | Added root `npm run evolution`; default sandbox now uses Docker unless explicitly set to `host`.               |
| 4   | Framework selector alignment | `npm run test -- frameworkSelector` passes          | PASS   | New `frameworkSelector.test.ts` added; workspace tests use `--passWithNoTests`.                                |
| 5   | Audit schema definition      | `npm run typecheck` passes                          | PASS   | `npm run typecheck` now builds core first; added `packages/api/src/index.ts` placeholder to satisfy TS inputs. |
