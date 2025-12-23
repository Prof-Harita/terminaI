# tasks_roadmapv2.md — TerminaI v0.21.0 (Sovereign System Operator Execution Plan)

## 0) Architectural Assessment (Current Master)

### Codebase shape (what exists, not what we wish existed)

- **Monorepo remains upstream-shaped**: root `package.json` is still
  `@google/gemini-cli`, `bin.gemini`,
  `repository=https://github.com/google-gemini/gemini-cli.git`.
- **Core runtime is upstream**: `packages/core` is `@google/gemini-cli-core` and
  is the real “engine”: tool registry, shell tool, policy engine, routing,
  hooks, telemetry, etc.
- **CLI is upstream**: `packages/cli` is `@google/gemini-cli` (Ink UI) that
  imports core.
- **A2A server exists but inherits upstream coupling**: `packages/a2a-server` is
  `@google/gemini-cli-a2a-server` and depends on core; it is not yet a sovereign
  protocol/SDK surface.
- **TerminaI additions are bolted on, not integrated**:
  - `packages/desktop` (Tauri + React) adds a **local PTY** and a **CLI
    bridge**.
  - `packages/termai` provides the `terminai` binary, but it is **just a
    wrapper** that resolves and imports `@google/gemini-cli/dist/index.js`.

### Where upstream ends vs. TerminaI begins (hard boundary map)

**Upstream Gemini CLI surface (still dominant):**

- Root workspace config: `/package.json`, `/scripts/*`, most `/docs/*`, most
  `.github/workflows/*` naming, and the `@google/*` package topology.
- Engine: `/packages/core/**`.
- UI + entrypoint: `/packages/cli/**`.
- IDE companion: `/packages/vscode-ide-companion/**`.

**TerminaI “System Operator” extensions (real differentiators, but currently not
sovereign):**

- Desktop overlay + PTY bridge: `/packages/desktop/**`.
- Wrapper entrypoint: `/packages/termai/**`.
- A2A direction exists, but is not yet a moat: `/packages/a2a-server/**`.
- Policy engine exists (`/packages/core/src/policy/**`) but **does not gate the
  desktop PTY**; this is a safety/brand contradiction.

### Primary technical reality

TerminaI is currently a **Gemini CLI fork + wrapper + desktop shell**. If you
ship “System Operator” without hardening PTY + policy + audit, you are shipping
an ungoverned local root terminal with AI branding.

---

## 1) Phase 1 — Reality Check Audits

### 1.1 Moat Audit — Rust PTY (`packages/desktop/src-tauri/src/pty_session.rs`)

**Verdict**: not robust enough for real system repairs.

**Why (specific defects):**

- Fixed PTY size (`24x80`) and `resize()` is a no-op → interactive TUI apps
  (apt, top, vim, installers) will misbehave.
- No child process handle captured → cannot send signals, cannot kill/terminate,
  cannot retrieve exit status.
- `stop()` only flips a boolean; the reader thread can remain blocked on
  `read()` forever → leaks + hangs.
- No backpressure / throttling: raw output is emitted as fast as read loop runs
  → UI can be flooded.
- Error handling is lossy (`Err(_) => break`) and emits exit without reason/exit
  code.
- No explicit close of master writer/reader on shutdown.

**Bottom line**: current PTY is a demo stream pipe, not an operator-grade
subsystem.

### 1.2 Dependency Audit — hard coupling to `@google/genai`

**Observed coupling**: `@google/genai` is imported directly in **116 files**.

- `packages/core`: **95** files
- `packages/cli`: **20** files
- `packages/a2a-server`: **1** file

**High-leverage coupling choke points (must be abstracted first):**

- Core content generation and client flow:
  - `packages/core/src/core/contentGenerator.ts`
  - `packages/core/src/core/client.ts`
  - `packages/core/src/core/geminiChat.ts`
  - `packages/core/src/core/baseLlmClient.ts`
- Tool schema / function calling types:
  - `packages/core/src/tools/tools.ts`
  - `packages/core/src/tools/tool-registry.ts`
  - `packages/core/src/policy/policy-engine.ts` (uses `FunctionCall` from
    `@google/genai`)
- Peripheral but pervasive type usage:
  - `packages/core/src/utils/partUtils.ts`, `tokenCalculation.ts`,
    `environmentContext.ts`, telemetry converters

**Reality**: full provider-neutral abstraction is a **Month 2** refactor. For
launch, Gemini remains the engine; we only need **TerminaI identity** (user
agent, storage paths, command name) and user-facing branding.

---

## 2) Phase 2 — Uber-Prioritization (Home Run Framework)

### Tier definitions

- **[H] Launch Home Runs (Pre-Launch)**: Without these, TerminaI is a re-skinned
  upstream CLI.
- **[H-Defensiveness] The Moat (Pre-Launch)**: Makes cloning hard: policy
  gating + audit + A2A protocol + robust PTY.
- **[M] Fast Follows (Post-Launch)**: Valuable, but not blocking sovereign
  launch.
- **[L] Nice to Have (Month 2)**: Polish and long-tail.

### 2.1 Re-sorted roadmap (surgical)

#### [H] Launch Home Runs (Pre-Launch)

1. **Sovereign Shell command** (`terminai` first-class, non-breaking aliasing;
   Gemini stays as the engine).
2. **Bulletproof identity + migration** (copy legacy `~/.gemini` →
   `~/.terminai`, dual-read fallback, branded user agent).
3. **PTY Hardening + Policy gating** (desktop PTY must obey the same
   approval/policy ladder as shell tools).
4. **Black Box Audit Log** (show what just happened: policy decision + command +
   outcome, locally).

#### [H-Defensiveness] The Moat (Pre-Launch)

6. **A2A protocol hardened and documented** (JSON-RPC/SSE, auth handshake,
   policy proxying).
7. **Recipe Pack as “System Operator” product surface** (built-in governed
   system workflows).

#### [M] Fast Follows (Post-Launch)

8. **Desktop governance dashboard** (policy feed, audit browser, approval
   queue).
9. **Recipe authoring UX + library expansion** (more governed workflows, not
   more refactors).
10. **Install UX** (one-line installer, platform scripts) once names are final.

#### [L] Nice to Have (Month 2)

11. **Provider Abstraction Layer** (remove core’s direct `@google/genai`
    dependency) — **major structural change**.
12. **Additional providers** (Ollama/Anthropic) — only after [L11].
13. **Local-first safety classifier toggle** — only after [L11].
14. **SEO/docs marketing backlog** (case studies, theme showcases, SEO) — not a
    launch blocker.

**Kill list (explicit distractions to de-prioritize now):**

- SEO optimization, theme showcases, hypothetical case studies.
- Any UI dashboards before policy+audit correctness.
- Any “provider-neutral refactor” work before the broadcast MVP (command alias +
  governed PTY + audit log).

---

## 3) Phase 3 — Blueprints (Zero Ambiguity) for Every [H] Task

### [H1] Sovereign Shell Command (non-breaking alias & append)

**Goal**: users type `terminai` (not `gemini`) and everything works **without
breaking** existing upstream wiring. This is an **alias & append** change: keep
the Gemini engine and existing package topology; make `terminai` the primary
command surface.

**Target files**

- `/packages/termai/package.json`
- `/packages/termai/src/index.ts`
- `/package.json` (workspace bin, name, repository)
- `/packages/cli/package.json` and `/packages/cli/index.ts`

**Logic change**

- Keep `packages/termai` as the _launcher package_ (do not delete workspaces).
- Make `packages/termai` a practical “symlink” to the real CLI by delegating
  execution to the existing CLI entrypoint:
  - `packages/termai/src/index.ts` should resolve and `import()`/`require()` the
    CLI’s `dist/index.js` (Gemini engine), and **pass through argv unchanged**.
  - Set an explicit brand flag before delegation:
    - `process.env.TERMINAI_BRAND = '1'` (used by core for user agent + paths).
    - optionally set `process.title = 'terminai'`.
- Root `package.json` and/or `packages/termai/package.json` must expose
  `bin.terminai`.
- Keep `bin.gemini` as a compatibility alias (optional) but ensure help/version
  banners prefer **TerminaI**.

**Scrubbing list**

- Strings shown to users: `Gemini CLI`, `gemini` (command),
  `google-gemini/gemini-cli` (repo URL).
- Env vars to introduce: `TERMINAI_*` equivalents; keep `GEMINI_*` as fallback
  only where required for backward compatibility.

**Verification**

- `npm -w packages/cli test`
- `node packages/termai/dist/index.js --version` (or `terminai --version` after
  packaging)

---

### [H2] Non-Breaking Rebrand + Migration (paths + user agent)

**Goal**: remove Google/Gemini identity from runtime behavior and on-disk
artifacts.

**Target files (minimum viable set)**

- Root + package identity:
  - `/package.json`
  - `/packages/core/package.json`
  - `/packages/cli/package.json`
  - `/packages/a2a-server/package.json`
- Storage and naming constants:
  - `/packages/core/src/utils/paths.ts` (currently `GEMINI_DIR = '.gemini'`)
  - `/packages/core/src/core/contentGenerator.ts` (currently
    `userAgent = GeminiCLI/...`)
  - `/packages/core/src/services/chatRecordingService.ts` (references
    `~/.gemini/...`)
  - `/packages/core/src/tools/memoryTool.ts` (GEMINI.md defaults)
  - `/packages/core/src/services/fileDiscoveryService.ts` (GeminiIgnoreParser /
    `.geminiignore`)

**Logic change**

- Change default dirs:
  - `.gemini/` → `.terminai/`
  - session artifacts under `~/.terminai/` (or per-project under
    `.terminai/tmp/<hash>`).
- **Migration must be copy-only (bulletproof, non-breaking):**
  - On first run (or when `~/.terminai` is missing), if `~/.gemini` exists:
    - **copy** `~/.gemini` → `~/.terminai` (recursive) and leave `~/.gemini`
      untouched.
    - never `rename()`/move legacy data.
  - Always **write new artifacts only** to `~/.terminai/*`.
  - Always **read with fallback**: prefer `~/.terminai/*`, but if missing, read
    from `~/.gemini/*`.
  - Keep legacy filenames as fallback inputs (e.g. `.geminiignore`), but
    introduce TerminaI-first names for new writes.
- Update user agent and telemetry prefixes to `TerminaI/<version>`.

**Alias & Append (no deep refactors):**

- Do **not** remove `@google/genai` imports.
- Do **not** rename runtime classes.
- Only update:
  - user-visible strings/banners,
  - user agent string,
  - storage path constants,
  - and legacy fallback reads.

**Scrubbing list**

- Filenames: `GEMINI.md`, `.geminiignore`, `gemini*` file names.
- Strings: `GeminiCLI`, `gemini-cli`, `GEMINI_DIR`, `gemini`.
- URLs: `https://github.com/google-gemini/gemini-cli` references in CLI
  validation output.

**Verification**

- `npm run test -w packages/core`
- `npm run test -w packages/cli`
- Manual:
  - run CLI once and confirm it creates `~/.terminai/`.
  - confirm legacy `~/.gemini/` remains intact.
  - confirm removing `~/.terminai` still allows reading from `~/.gemini`
    (fallback).

---

### [H4] PTY Hardening + Governance Gating (desktop PTY must obey policy + audit)

**Goal**: local PTY is safe-by-default, policy-governed, and auditable.

**Target files**

- Rust PTY:
  - `packages/desktop/src-tauri/src/pty_session.rs`
  - `packages/desktop/src-tauri/src/lib.rs`
- Desktop terminal UI:
  - `packages/desktop/src/components/EmbeddedTerminal.tsx`
  - `packages/desktop/src/hooks/useSudoDetection.ts` (if present)
- Governance integration targets (core):
  - `packages/core/src/policy/policy-engine.ts`
  - `packages/core/src/core/coreToolScheduler.ts` (audit hooks later)

**Logic change**

- PTY correctness:
  - Capture the child handle from `pair.slave.spawn_command(cmd)` (store it in
    the session).
  - Implement `resize(rows, cols)` using `portable_pty::MasterPty::resize`:
    - Store the PTY master in the session
      (`Box<dyn portable_pty::MasterPty + Send>`).
    - Call
      `master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })`.
  - Implement `stop()` that **terminates the child** and **unblocks the reader**
    (closing master, kill, join).
  - Emit structured exit event including exit code / signal.
  - Add backpressure/throttle (chunking + rate limit) to prevent UI flood.
- Governance gating (must-have):
  - Before spawning a PTY command, run the same policy decision logic used for
    shell tools.
  - Record PTY commands into the audit log (see [H5]).
  - Do not allow “raw PTY” to bypass YOLO gating.

**Scrubbing list**

- Event names should be stable and namespaced: `terminal-output-*`,
  `terminal-exit-*` → `terminai:pty:*` (or similar).

**Verification**

- Rust: `cargo test --manifest-path packages/desktop/src-tauri/Cargo.toml` (add
  tests as needed)
- Desktop: `npm -w packages/desktop run build`
- Manual:
  - Run `sudo -k; sudo ls` inside PTY and verify prompt handling + exit status.
  - Resize terminal and verify interactive TUI apps redraw correctly.

---

### [H5] Black Box Audit Log (non-repudiable)

**Goal**: every tool/PTY action is recorded with tamper evidence.

**Target files**

- New:
  - `packages/core/src/persistence/auditLog.ts`
  - `packages/core/src/tools/export-audit.ts`
- Hook points:
  - `packages/core/src/core/coreToolScheduler.ts`
  - `packages/core/src/utils/shell-permissions.ts` (or equivalent gating layer)
  - `packages/cli/src/ui/hooks/slashCommandProcessor.ts` (add `/audit`)

**Logic change**

- Implement SQLite audit DB (local) with an explicit schema (minimum viable, but
  complete):

```sql
CREATE TABLE IF NOT EXISTS audit_session (
  session_id TEXT PRIMARY KEY,
  started_at_ms INTEGER NOT NULL,
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  cwd TEXT,
  git_repo_root TEXT,
  user_label TEXT
);

CREATE TABLE IF NOT EXISTS audit_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts_ms INTEGER NOT NULL,
  session_id TEXT NOT NULL REFERENCES audit_session(session_id),
  action_type TEXT NOT NULL CHECK(action_type IN ('tool','pty','a2a')),
  actor TEXT NOT NULL,                 -- 'user' | 'agent' | 'system'
  name TEXT NOT NULL,                  -- tool name / pty title / a2a method
  command TEXT,                        -- shell command (if applicable)
  args_json TEXT,                      -- JSON string (sanitized)
  policy_level TEXT,                   -- approval ladder label
  policy_decision TEXT NOT NULL CHECK(policy_decision IN ('allow','deny','prompt')),
  approval_type TEXT,                  -- 'auto' | 'user_confirm' | 'none'
  approval_id TEXT,                    -- correlates to UI prompt/decision if applicable
  status TEXT NOT NULL CHECK(status IN ('started','succeeded','failed','canceled')),
  exit_code INTEGER,
  signal TEXT,
  stdout_tail TEXT,
  stderr_tail TEXT,
  artifacts_json TEXT,                 -- paths/ids of full transcripts, diffs, exports
  hash_prev TEXT,
  hash_self TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_event_session_ts ON audit_event(session_id, ts_ms);
```

- Hash chain definition (tamper evidence):
  - `hash_self = sha256( hash_prev || canonical_json(event_row_without_hashes) )`.
  - Store `hash_prev` from last event in the same session (or global chain if
    you prefer).
- Record before+after execution for tool calls.
- Integrate redaction using existing sanitizer
  (`packages/core/src/telemetry/sanitize.ts`).
- Provide a read-only UI path (`/audit`) and export tool.

**Scrubbing list**

- Ensure file paths and table names do not contain `gemini`.

**Verification**

- `npm run test -w packages/core`
- Manual:
  - Execute a shell tool command and confirm audit entry exists.
  - Modify DB file and verify hash chain detects tampering.

---

## 4) [H-Defensiveness] Blueprints (Moat)

### [H-D1] A2A Protocol Harden + Spec

**Goal**: A2A is a stable local control plane API with policy enforcement.

**Target files**

- `packages/a2a-server/src/http/server.ts`
- `packages/a2a-server/src/http/app.ts`
- `packages/a2a-server/src/http/replay.ts`
- `packages/a2a-server/src/agent/executor.ts`
- `packages/a2a-server/development-extension-rfc.md` → `A2A_PROTOCOL_SPEC.md`
- `packages/core/src/policy/policy-engine.ts` (enforcement hook)

**Logic change**

- Standardize request/response as JSON-RPC 2.0.
- All command execution requests must be policy-checked in core before running.
- Add a concrete auth handshake (non-breaking, CLI-first):
  1. **Pairing (mint a client token)**
     - User runs: `terminai a2a auth issue --name <clientName>`.
     - CLI prompts (TTY) for approval and prints a **one-time pairing code**
       (base64url, 32 bytes) valid for ~60s.
  2. **Exchange (client obtains bearer token)**
     - Client POSTs to `POST /auth/exchange` with `{ code, client_name }`.
     - Server returns `{ access_token, expires_in_s, token_type: "Bearer" }`.
  3. **Use (authenticated calls)**
     - Client includes `Authorization: Bearer <access_token>` on JSON-RPC and
       SSE endpoints.
  4. **Verification (server side)**
     - Access token is a signed JWT (HS256) using a local secret stored at
       `~/.terminai/a2a/secret.key` created on first enable.
     - Claims must include: `sub` (client id), `iat`, `exp`, `scope` (e.g.
       `execute`, `read_audit`).
  5. **Revocation**
     - User runs: `terminai a2a auth revoke <clientId>` (removes client record;
       rejects subsequent tokens).
- Add SSE stream for stdout/stderr.
- Add rate limiting + CORS hardening.

**Scrubbing list**

- Command names/binaries: `gemini-cli-a2a-server` → `terminai-a2a-server`.

**Verification**

- `npm run test -w packages/a2a-server`
- Integration: start server, run a small client, verify denied commands are
  denied.

---

### [H-D2] System Operator Recipe Pack (product surface)

**Goal**: shipped, governed workflows users can trust.

**Target files**

- New recipes dir:
  - `packages/core/src/policy/recipes/*.toml`
- Loader:
  - `packages/core/src/policy/toml-loader.ts`
- Registry:
  - `packages/core/src/agents/registry.ts`
- CLI help:
  - `packages/cli/src/ui/components/Help.tsx`

**Logic change**

- Add built-in recipe loading on startup.
- Register recipes as callable agents (e.g., `@system wifi-fix`).
- Add validation script for recipe schema.

**Scrubbing list**

- Remove Gemini naming from recipe UX.

**Verification**

- `npm run test -w packages/core`
- `node --import tsx scripts/validate-recipes.ts` (once added)

---

## 5) Post-Launch Backlog (kept intentionally short)

### [M]

- Desktop governance dashboard (policy feed, audit browser, approval queue).
- One-line installer scripts once naming is final.

### [L]

- [L11] Provider Abstraction Layer (remove core’s direct `@google/genai`
  coupling).
- Additional providers (Ollama/Anthropic skeletons) only after [L11].
- Local-first safety classifier toggle only after [L11].
- Marketing/docs SEO backlog.

---

### [L11] Provider Abstraction Layer (major refactor; Month 2)

**Goal**: core compiles and runs with _any_ provider adapter; Google is a
plugin, not the spine.

**Target files**

- New provider-neutral types and interfaces:
  - `packages/core/src/core/types/provider.ts` (new)
  - `packages/core/src/core/types/messages.ts` (new)
  - `packages/core/src/core/types/tools.ts` (new)
- Existing choke points:
  - `packages/core/src/core/contentGenerator.ts`
  - `packages/core/src/core/client.ts`
  - `packages/core/src/core/geminiChat.ts`
  - `packages/core/src/tools/tools.ts`
  - `packages/core/src/policy/policy-engine.ts`
- Schema + settings:
  - `/schemas/settings.schema.json`
  - `/packages/cli/src/config/settings-validation.ts`

**Logic change (minimal viable refactor)**

1. Define `BaseModelProvider` with methods:
   - `generate(request)`, `stream(request)`, `countTokens(request)`,
     `embed(request)`.
2. Define internal tool schema types (provider-neutral) and a mapping layer.
3. Implement `GoogleProvider` in
   `packages/core/src/core/providers/googleProvider.ts` that is the _only_ place
   importing `@google/genai`.
4. Refactor runtime names:
   - `GeminiClient` → `LlmClient` (provider-neutral)
   - `GeminiChat` → `ChatSession`
   - Keep `GeminiProvider` as the Google implementation.
5. Update policy engine to consume provider-neutral `FunctionCall` shape (do not
   import it from `@google/genai`).

**Scrubbing list**

- Imports: `from '@google/genai'` in core (target: **0** outside Google provider
  adapter).
- Type names: `Gemini*` for non-provider-specific runtime classes.

**Verification**

- `npm run typecheck -w packages/core`
- `npm run test -w packages/core`
- `npm run test -w packages/cli` (ensures UI compiles against provider-neutral
  types)
