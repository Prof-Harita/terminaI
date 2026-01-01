# Outstanding Desktop ↔ CLI Parity Gaps (Code-Based Assessment)

**Date**: 2025-12-31

## Executive Summary

**No, we are not yet at true parity** between Desktop and CLI in terms of _agent
behavior_.

What appears to be in good shape now:

- **Tool visibility / streaming UX parity**: Desktop now understands
  `a2a-server` SSE event shapes (`status-update`, `artifact-update`) and does
  not drop tool updates when `parts[].kind` is omitted.
- **Workspace override drift**: Desktop no longer forces `/tmp` as the workspace
  override in the settings sync path; `a2a-server` now defaults workspace to
  `process.cwd()` when no override is present.

What is still not at parity:

- **Runtime config construction**: CLI uses the shared `ConfigBuilder` path
  (policy engine, provider selection, model resolution, sandbox,
  includeDirectories, etc.). `a2a-server` still constructs a `Config` manually
  with a much smaller parameter surface area and several different defaults.
- **Environment loading / trust gating**: CLI’s settings pipeline does not call
  `dotenv.config({ override: true })` globally. `a2a-server` does (on startup),
  which can materially change auth/provider behavior.
- **Desktop sidecar startup defaults**: there is still a `/tmp` fallback in
  Desktop sidecar bootstrap, and Rust still has a default `CliBridge::spawn()`
  that hardcodes `/tmp`.

**Bottom line**: Desktop is likely “operational” and much closer to CLI than
before, but there are still several **behavior-changing divergences** that can
change tool availability, approval behavior, and even which model/provider is
used.

---

## How parity is evaluated

Parity means that for the same:

- repo contents and workspace directory
- settings files (`system-defaults`, `system`, `user`, `workspace`)
- trust state
- env vars

…the system should produce the same:

- `Config` (effective configuration)
- tool allow/deny behavior + approvals
- model/provider/auth selection
- memory/context loading
- execution results and visible tool traces

---

## Critical Gaps (Behavior-Changing)

### G-1: `a2a-server` does **not** use `ConfigBuilder` (config interpretation divergence)

- **Where**:
  - CLI: `packages/cli/src/config/config.ts` uses
    `new ConfigBuilder(sessionId).build({ overrides })`.
  - A2A: `packages/a2a-server/src/config/config.ts` manually builds
    `ConfigParameters` and `new Config(...)`.
- **Why it matters**:
  - CLI constructs:
    - `policyEngineConfig` (and policy brain authority)
    - `providerConfig` (Gemini/OpenAI-compatible/Anthropic)
    - CLI-resolved `model` including `--model` and OpenAI-compatible forcing
      model
    - `sandbox`/repl docker image
    - `includeDirectories`, memory load options
    - a large set of behavior toggles (hooks, tool truncation,
      summarizeToolOutput, prompt completion, etc.)
  - A2A currently sets only a subset:
    - model = `PREVIEW_GEMINI_MODEL` or `DEFAULT_GEMINI_MODEL` (not `*_AUTO`)
    - approvalMode from `GEMINI_YOLO_MODE` env only
    - does not set policyEngineConfig
    - does not set providerConfig
    - does not set sandbox config
- **Impact**: **High**
  - Different approval behavior
  - Different tool gating behavior
  - Different model/provider selection
  - Different safety/policy enforcement
- **Ease**: **Medium**
  - The shared builder already exists in Core
    (`packages/core/src/config/builder.ts`).
  - A2A should call the same builder with A2A-specific overrides.

### G-2: Environment loading semantics diverge (A2A uses `override: true`)

- **Where**:
  - A2A startup: `packages/a2a-server/src/http/app.ts` calls `loadEnvironment()`
    before loading settings.
  - A2A `loadEnvironment()`: `packages/a2a-server/src/config/config.ts` uses
    `dotenv.config({ override: true })`.
- **CLI behavior**:
  - In current CLI config flow, the config pipeline does not appear to call
    `dotenv.config({ override: true })` globally.
  - Historically CLI used trust-gated `.env` loading and excluded env var logic;
    that nuance is not reflected in A2A’s current startup behavior.
- **Impact**: **High**
  - Can change auth selection (`GEMINI_API_KEY`, OAuth, CCPA)
  - Can change provider (`GEMINI_MODEL`, OpenAI-compatible env)
  - Can change tool behavior and safety defaults
- **Ease**: **Medium**
  - Align A2A to the same trust-aware `.env` behavior used by the shared
    settings pipeline.
  - At minimum: avoid `override: true` unless CLI does the same.

### G-3: Model default mismatch (`*_AUTO` vs concrete model)

- **Where**:
  - CLI builder defaults to `PREVIEW_GEMINI_MODEL_AUTO` /
    `DEFAULT_GEMINI_MODEL_AUTO`.
  - A2A config uses `PREVIEW_GEMINI_MODEL` / `DEFAULT_GEMINI_MODEL`.
- **Impact**: **High**
  - Auto model selection impacts both quality and cost and may alter tool usage.
- **Ease**: **Easy**
  - Use the same default constants and resolution logic as CLI.

### G-4: Approval mode selection differs (settings-based vs env-based)

- **Where**:
  - Core `ConfigBuilder`: approvalMode defaults to YOLO unless
    `settings.security?.disableYoloMode`.
  - CLI further uses CLI args `--approval-mode` / `--yolo`.
  - A2A uses `GEMINI_YOLO_MODE` env and otherwise defaults to
    `ApprovalMode.DEFAULT`.
- **Impact**: **High**
  - This directly changes tool approval prompts and safety.
- **Ease**: **Medium**
  - A2A needs the same decision function as CLI/builder.

---

## High / Medium Gaps (User-Visible Divergences)

### G-5: Desktop sidecar bootstrap still has a `/tmp` fallback

- **Where**:
  - `packages/desktop/src/hooks/useSidecar.ts`:
    - `invoke('get_current_dir').catch(() => '/tmp')`
- **Impact**: **Medium**
  - If `get_current_dir` fails for any reason, Desktop will silently run agent
    rooted in `/tmp`.
- **Ease**: **Easy**
  - Remove fallback or surface error and require explicit selection.

### G-6: Rust `CliBridge::spawn()` hardcodes `/tmp`

- **Where**:
  - `packages/desktop/src-tauri/src/cli_bridge.rs`:
    - `pub fn spawn(...) { Self::spawn_web_remote(app, "/tmp".to_string()) }`
- **Impact**: **Medium**
  - Any call path that uses `start_cli` instead of `spawn_cli_backend` will run
    under `/tmp`.
- **Ease**: **Easy**
  - Remove or rework the legacy `spawn()` method.

### G-7: CORS/allowed-origins env var aliasing may be inconsistent

- **Where**:
  - CLI web remote server sets both:
    - `TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS`
    - `GEMINI_WEB_REMOTE_ALLOWED_ORIGINS`
  - A2A reads `GEMINI_WEB_REMOTE_ALLOWED_ORIGINS` only.
- **Impact**: **Medium**
  - Desktop/clients may behave differently depending on which env var is set.
- **Ease**: **Easy**
  - Apply `TERMINAI_*` alias support everywhere, consistently (project rule).

### G-8: A2A config does not pass through many ConfigParameters used by CLI

Examples of missing/likely divergent fields (non-exhaustive):

- `policyEngineConfig`
- `providerConfig` details for OpenAI-compatible
- `sandbox` / repl docker image
- `includeDirectories`, `loadMemoryFromIncludeDirectories`
- `previewMode`
- `eventEmitter`
- `ptyInfo`
- CLI’s `shellExecutionConfig`, `shellToolInactivityTimeout`
- `modelConfigServiceConfig`

- **Impact**: **Medium to High** (depends which features you rely on)
- **Ease**: **Medium**
  - This goes away if A2A uses the same `ConfigBuilder` path with overrides.

---

## Low Gaps (Mostly UX / Feature Surface)

### G-9: Desktop UI feature surface differs from CLI

Even if agent behavior were identical, Desktop does not necessarily expose:

- all CLI commands
- session resume/list/delete
- extension management UI

- **Impact**: **Low to Medium**
- **Ease**: **Hard** (product work)

---

## Recommended Fix Order (Minimal risk)

1. **Unify `a2a-server` config construction onto `ConfigBuilder`**
   - Goal: A2A produces the same `Config` as CLI for the same inputs.
2. **Normalize environment loading**
   - Remove `dotenv.config({ override: true })` unless CLI does it.
   - Ensure trust gating is consistent.
3. **Remove remaining `/tmp` fallbacks** in Desktop sidecar bootstrap + Rust
   legacy spawn.
4. **Add automated parity tests**
   - Config snapshot parity test: CLI vs A2A
   - Golden SSE trace parity test (tool calls, approvals, outputs)

---

## Suggested Parity Test Additions (Verification)

- **Config parity snapshot**:
  - Create a fixed fixture workspace with settings files.
  - Build config via CLI path and A2A path.
  - Compare a stable subset of `ConfigParameters` (normalize non-deterministic
    fields).

- **E2E tool trace parity**:
  - Run a known prompt that triggers `read_file`, `grep_search`, and
    `run_terminal_command`.
  - Assert the same tool names/args and that outputs are rendered in Desktop.

---

## Conclusion

- **Tool visibility parity**: substantially improved.
- **True behavioral parity** (agent config + policy + provider/model +
  env/trust): **not yet achieved**.

The single biggest remaining blocker is **`a2a-server` not using the same
`ConfigBuilder` pipeline** as CLI.
