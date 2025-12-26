# TermAI — Architecture

This repo is a TypeScript monorepo (npm workspaces) forked from `gemini-cli`.
TermAI is intended to be a **minimal fork** that reuses core primitives (prompt
assembly, tools, confirmations, PTY execution) and adds orchestration features
surgically.

## 0. Reality Check (What Exists Today)

- PTY-backed execution + streaming + fallback exists:
  `packages/core/src/services/shellExecutionService.ts`,
  `packages/core/src/utils/getPty.ts`.
- Tool registry and core-tool registration exists:
  `packages/core/src/config/config.ts` (`createToolRegistry()`).
- Global persistent memory exists via `memoryTool` writing to
  `~/.gemini/GEMINI.md`: `packages/core/src/tools/memoryTool.ts`.
- Hierarchical `GEMINI.md` discovery/loading exists:
  `packages/core/src/utils/memoryDiscovery.ts`.
- Sub-agent delegation exists as a tool when agents are enabled:
  `DelegateToAgentTool` registered in `packages/core/src/config/config.ts`.
- Process orchestration is implemented as a first-class tool:
  `packages/core/src/tools/process-manager.ts`.
- File organization primitives exist via `FileOpsTool`:
  `packages/core/src/tools/file-ops.ts`.
- External agent supervision is implemented via `AgentControlTool`:
  `packages/core/src/tools/agent-control.ts`.
- A TermAI wrapper package exists for distribution: `packages/termai` (bundles
  `system.md` and launches `@google/gemini-cli`).

Implication: “memory” and “agents” are not zero-to-one; the delta is making them
_TermAI-shaped_ (operator/process/system focus), not rebuilding them.

## 1. Baseline: What This Repo Already Provides

Core building blocks TermAI can leverage with minimal changes:

- **`packages/core` (engine):**
  - System prompt assembly: `packages/core/src/core/prompts.ts` (supports
    overrides via `TERMINAI_SYSTEM_MD` and prompt section toggles via
    `TERMINAI_PROMPT_*`).
  - Environment “setup” context: `packages/core/src/utils/environmentContext.ts`
    (injects date, OS, workspace structure, and `environmentMemory`).
  - Tool system + confirmations/policy: `packages/core/src/tools/*`,
    `packages/core/src/policy/*`, confirmation bus.
  - Shell execution with PTY + fallback:
    `packages/core/src/services/shellExecutionService.ts` and
    `packages/core/src/utils/getPty.ts`.
  - OAuth support (Gemini/Code Assist): `packages/core/src/code_assist/*`.

- **`packages/cli` (terminal UI):**
  - Ink-based interactive application (`packages/cli/src/gemini.tsx`) and
    non-interactive flows.
  - Settings, session management, and terminal behaviors (alternate buffer,
    mouse, etc.).
  - Voice integration currently lives in `packages/cli/src/ui/AppContainer.tsx`
    (speaks replies + interrupts on keypress).

- **`packages/a2a-server` (optional server):**
  - A2A protocol server that streams agent/task updates; useful as a foundation
    for external clients (voice, UI shells).
  - Web-remote security middleware lives here: auth + CORS allowlist + replay
    guard (`packages/a2a-server/src/http/*`) with token storage under
    `packages/a2a-server/src/persistence/remoteAuthStore.ts`.
- **`packages/cli/src/voice` (voice scaffolding):**
  - Spoken reply derivation + TTS provider selection + `VoiceController`
    (`packages/cli/src/voice/*`).
  - Opt-in flags and settings schema exist; STT/PTT capture are still pending.

## 2. TermAI Target Architecture (Minimal Fork)

TermAI should primarily be a **re-prompting + orchestration layer** on top of
existing `gemini-cli` primitives.

### 2.1 High-Level Component Diagram

```
User (text/voice)
        │
        ▼
TermAI CLI (Ink UI / non-interactive)
        │
        ▼
TermAI Brain (LLM via gemini-cli core)
  ├─ System Prompt (TermAI identity + rules)
  ├─ Environment Context (workspace + system snapshot)
  └─ Tool Router (shell/files/web/MCP)
        │
        ▼
Tooling Layer
  ├─ ShellTool → ShellExecutionService → PTY/child_process → OS processes
  ├─ File tools → filesystem
  └─ Web tools → search/fetch (when allowed)
```

### 2.2 Key Principle: Prompt/Config First

Prefer using existing override points:

- **System prompt override:** `TERMINAI_SYSTEM_MD` (load full prompt from a
  file) and `TERMINAI_WRITE_SYSTEM_MD` (dump current base prompt).
- **Prompt section toggles:** `TERMINAI_PROMPT_<SECTION>=0|false` to disable
  upstream sections selectively.
- **Environment context memory:** `config.getEnvironmentMemory()` is appended in
  `getEnvironmentContext()`; it’s a natural place to inject a compact system
  snapshot.

This keeps TermAI mergeable with upstream while still changing behavior
dramatically.

## 3. System Awareness Injection

Goal: make “what’s happening on this machine” cheap and available.

### 3.1 Where to Inject

Two low-diff options:

1. **Environment context injection:** extend
   `packages/core/src/utils/environmentContext.ts` to add a “System Snapshot”
   block (OS, load, RAM, disk, top procs). This becomes part of initial chat
   history.
2. **Prompt-side guidance + on-demand probing:** keep the injected snapshot
   minimal (or absent), and instruct the agent in the system prompt to call the
   shell tool (`ps`, `top`, `free`, `df`, etc.) whenever system state matters.

### 3.2 Snapshot Source

- **Node APIs:** `os` for platform + memory; optional lightweight `/proc` reads
  on Linux for load/processes.
- **Shell commands:** more portable for “top processes” and disk summaries but
  adds execution overhead.

Recommendation: include **small, cheap** Node-derived snapshot in context; use
shell for “deep dives” on demand.

## 4. Process Orchestration

The repo already has robust process execution primitives:

- PTY selection via `packages/core/src/utils/getPty.ts`
- Execution + streaming + fallbacks via
  `packages/core/src/services/shellExecutionService.ts`

TermAI orchestration can be implemented with minimal surface-area change by:

- Exposing a **persistent session/process handle** concept to the agent
  (recommended: new `ProcessManagerTool`).
- Maintaining a registry of named processes (pid + command + cwd + bounded
  output + status).
- Adding safe verbs: start/list/status/read/send/stop/restart.

### 4.1 Process Manager Tool (Recommended P0)

This is the core enabler for “living terminal” behavior (long-running sessions,
tailing, sending input).

- **New file:** `packages/core/src/tools/process-manager.ts`
- **Register in:** `packages/core/src/config/config.ts` (`createToolRegistry()`
  via existing `registerCoreTool(...)`)
- **Design constraints:**
  - Build on `ShellExecutionService` (PTY + streaming + fallback); don’t
    re-implement spawning.
  - Bounded output capture (ring buffer) to avoid unbounded memory usage.
  - Integrate with existing confirmation/policy flow for destructive actions
    (stop/kill/restart).

Status: **shipped**. Manual verification is documented in
`docs/termai-process-manager.md`.

## 5. Voice Mode (Phase 2)

Keep voice as a wrapper around the existing CLI loop:

- **STT**: spawn a local transcriber process (e.g., Whisper) and feed recognized
  text into the same prompt pipeline.
- **TTS**: synthesize short responses.
- **Interruption**: stop speaking when user talks.

Implementation options:

- In-process in `packages/cli` behind a `--voice` flag.
- External client using `packages/a2a-server` streaming protocol (clean
  separation, potentially easier UX). Current status:
- In-process TTS scaffolding exists (`packages/cli/src/voice/tts/auto.ts`,
  `packages/cli/src/voice/voiceController.ts`).
- Spoken reply derivation exists (`packages/cli/src/voice/spokenReply.ts`).
- Push-to-talk recording + STT are pending; current voice mode is **TTS-only**
  (spoken replies when enabled).

## 6. Security & Safety

Retain upstream safety mechanisms:

- Shell execution confirmation and policy allowlists
  (`packages/core/src/tools/shell.ts` + policy engine).
- “Explain critical commands” behavior in prompts.
- Sanitized environments in CI; local full env preserved by design.

Security posture upgrades for later phases:

- Awareness/proactive alerts must be opt-in and non-destructive by default.
- Web-remote must be opt-in and authenticated; bind to localhost by default;
  explicit origin allowlist.

## 7. Minimal Fork Strategy

Order of preference for changes:

1. **Configuration/Prompt overrides** (ship a TermAI `system.md` and set
   `TERMINAI_SYSTEM_MD` in wrappers/docs).
2. **Small targeted edits** to prompt assembly + environment context to default
   to TermAI behavior.
3. **New tools** only when the desired orchestration cannot be expressed with
   existing ones.

## 8. Recommended Execution Order (Next Agent Run)

To keep changes mergeable and tractable:

1. Process Manager Tool (persistent sessions)
2. Agent Control Tool (built on Process Manager sessions)
3. Awareness/watch mode (opt-in; observe/report first)
4. Web-remote (opt-in; auth-first)
5. Voice loop (opt-in; interruption and short replies)
