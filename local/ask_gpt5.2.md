# TermAI Transformation - Context & Request

## Vision

**TermAI** is the ultimate Linux terminal agent — a general-purpose, self-aware,
self-hosted AI-native shell that speaks like Jarvis, orchestrates processes like
a conductor, and executes tasks like a pro.

**Key Philosophies:**

1.  **Identity:** TermAI _is_ the terminal itself, not just a chatbot inside it.
    It interacts with running processes, monitors system resources, and manages
    the shell environment.
2.  **Capability:** It is a general agent (system admin, devops, researcher,
    automation) that _retains_ full software engineering capabilities (coding,
    refactoring, testing) but applies them more broadly (scripting, quick
    fixes).
3.  **Authentication:** Uses native Gemini OAuth (via `gemini-cli` foundation) —
    no API keys, leverages existing user subscriptions.
4.  **Implementation:** A "True Fork" of `gemini-cli`. Modifications must be
    minimal and precise to maintain compatibility with the upstream project and
    its extensions. We do not want to rewrite the core, but rather "re-prompt"
    and extend it.
5.  **Voice (Phase 2):** Always-on, interruptible voice interaction.

## Current Architecture

The project is a fork of `gemini-cli`, a TypeScript monorepo using standard
Node.js/npm tooling.

### Repository Structure

- **`packages/core`**: The brain. Contains tools, prompts, agents, and LLM
  logic.
  - `src/core/prompts.ts`: The system prompt definition (Primary modification
    target).
  - `src/tools/`: Existing toolset (Shell, Read/Write File, Grep/Glob, Web
    Search, etc.).
- **`packages/cli`**: The interface. Handles user input, rendering, and terminal
  interaction.
- **`packages/a2a-server`**: Server component (likely for voice/advanced
  features).
- **`packages/vscode-ide-companion`**: IDE extension logic.

### Authentication

Existing OAuth mechanism stored in `~/.gemini/`. Works out-of-the-box.

## Current Specification (v2.0)

From `spec.md`:

1.  **Mental Model**: TermAI Brain <--> PTY <--> Spawned Processes (claude,
    aider, npm, etc.).
2.  **Core Capabilities**:
    - Full PTY Orchestration (Launch, Observe, Interact).
    - Native Gemini Auth.
    - Always-on Voice.
    - General Terminal tasks + Coding.
3.  **Success Criteria**: Voice query system stats, launch/control external
    agents (Claude), web search, native auth.

## Implementation Plan

1.  **Modify `packages/core/src/core/prompts.ts`**:
    - Change Identity to "TermAI".
    - Remove restrictive coding-only mandates.
    - Inject System Awareness (CPU/RAM stats) into the prompt context.
    - Add "Interactive Session Management" logic (handling sudo, passwords).
    - Broaden workflows to include general terminal tasks and scripting.
2.  **Verify**: Ensure existing tools (`shell`, `web-search`) work in this new
    context without code changes to the tools themselves.

## Request

Based on this context, please generate the following three documents to guide
the execution of this vision:

### 1. `prd.md` (Product Requirements Document)

- Define the full product scope, user stories, and functional requirements.
- Emphasize the "self-aware terminal" and "process orchestration" aspects.
- Prioritize the "Minimal Modification" philosophy.

### 2. `architecture.md`

- Describe the high-level system design.
- Explain how the `gemini-cli` core will be leveraged.
- Detail the "System Awareness" injection mechanism.
- Diagram (text-based) the interaction between TermAI, the Shell, and
  Subprocesses.

### 3. `tasks.md`

- A comprehensive, step-by-step checklist for the implementation.
- Break down the work into:
  - Phase 1: Core Transformation (Prompts & Identity).
  - Phase 2: Advanced Capabilities (System Injection, Process Control).
  - Phase 3: Verification & Polish.
- Ensure tasks are actionable and mapped to specific files where possible.

**Constraint:** All output must fundamentally respect the vision of a **minimal
fork** of `gemini-cli`. We are building a "huge winner" by standing on the
shoulders of this existing codebase, not by reinventing it.
