# Q1 2026: Windows AppContainer roadmap (“Brain & Hands”)

**Date:** 2026-01-23  
**Scope:** make Windows AppContainer a _real_ isolation tier (Defender-friendly)
**without** turning it into an allowlist/scripting trap  
**Companion docs:**

- `docs-terminai/roadmap/roadmap.md` (ATS‑50 capability roadmap; do not edit)
- `docs-terminai/architecture-sovereign-runtime.md` (Appendix M is the Windows
  architecture spec)

This roadmap is intentionally focused on **agentic primitives** (safe execution
contracts, secure transport, policy‑gated capability) rather than “pre-scripting
tasks”.

---

## 0) Current state snapshot (as of 2026-01-23)

### What already exists (good raw material)

1. **Native module groundwork exists (real Windows APIs)**
   - `packages/cli/native/appcontainer_manager.cpp`:
     - creates/derives AppContainer profile
     - grants workspace ACL to AppContainer SID
     - launches a process in AppContainer with Internet + private network
       capability SIDs
   - `packages/cli/native/amsi_scanner.cpp`: AMSI scanning primitives
   - `packages/cli/src/runtime/windows/native.ts`: TS bindings and lazy loader

2. **Broker protocol and IPC building blocks exist**
   - `packages/cli/src/runtime/windows/BrokerSchema.ts`: Zod‑validated
     request/response types
   - `packages/cli/src/runtime/windows/BrokerServer.ts`: named pipe server (but
     ACLs still open)
   - `packages/cli/src/runtime/windows/BrokerClient.ts`: client (but response
     matching is FIFO)

### What is still “scaffold / hollow” (must be fixed before you can trust it)

1. **End-to-end runtime path is not implemented**
   - `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`:
     - spawns a Brain script name (`agent-brain.js`) that does not exist in the
       repo
     - `execute()` / `spawn()` currently throw “not implemented”
   - This means enabling the tier will immediately break basic tool execution.

2. **Named pipe transport is not secured**
   - `BrokerServer` explicitly warns the pipe ACL is open.
   - Appendix M requires restricting pipe access to the AppContainer SID +
     session/user.

3. **IPC is not concurrency-safe**
   - `BrokerClient` currently matches responses FIFO (no request IDs).

4. **There is no “proof it works” gate**
   - Tests exist, but the full initialization path is skipped and there is no
     acceptance/doctor flow to validate AppContainer on a real Windows machine.

---

## 1) Definition of Done (Windows AppContainer “production candidate”)

Windows AppContainer isolation is “done” when all of the following are true:

1. **End-to-end works on a clean Windows machine**
   - The tier can be enabled and completes a representative ATS subset on
     Windows without regressing basic shell/python/file operations.

2. **No bypass paths**
   - When AppContainer tier is active, privileged execution does not fall back
     to uncontrolled host execution (no silent “do it on host anyway” paths).

3. **Pipe transport is secured**
   - Pipe ACL restricted to the correct AppContainer SID (plus owning
     user/session).
   - A per-session handshake token prevents “same-user other process” injection.

4. **IPC is correct under concurrency**
   - Requests/responses have IDs; client matches by ID; timeouts are
     per-request.

5. **Capability is policy-driven, not allowlist-driven**
   - The system does not devolve into “expand ALLOWED_COMMANDS forever”.
   - Risky operations are handled by approvals (B/C) and audit, not by brittle
     hardcoding.

6. **Native distribution is real**
   - Users do not need Visual Studio build tools to install TerminAI.
   - Native module strategy is compatible with Defender expectations (no
     “download a binary at install time” behavior).

---

## 2) Q1 work plan (Windows AppContainer track)

“Agent” means Codex 5.2 implements; “Human” means you make the strategic call
and do any Windows admin/manual validation that an agent can’t do safely.

### W1) Lock the launch model and ship the missing Brain artifact

**What to do**

- Choose the minimal Q1 launch model that still matches Appendix M’s intent:
  - **Hands:** privileged broker (admin), network‑blocked (Q1 may start as “best
    effort”, but must be on the roadmap)
  - **Brain:** sandboxed agent process (AppContainer), network‑allowed, talks to
    LLMs
- Implement and ship the missing Brain entrypoint (`agent-brain.js` or replace
  it with a versioned, packaged artifact).

**Deliverables**

- A real Brain entrypoint exists in the `@terminai/cli` package output and is
  referenced by `WindowsBrokerContext`.
- A minimal “brain ↔ hands ping” handshake is functional.

**Who does what**

- **Agent:** implement the Brain artifact + packaging + smoke test.
- **Human:** decide whether Brain is:
  - a thin wrapper around the existing CLI entrypoint, or
  - a dedicated “brain runtime” process that hosts LLM + tool scheduling.

**Definition of success**

- `WindowsBrokerContext.initialize()` can start the broker and successfully
  start the Brain process (no missing-file failures).

---

### W2) Secure the named pipe (ACL + handshake)

**What to do**

- Implement pipe creation with a restricted DACL (Appendix M requirement).
  Node’s `net.createServer()` cannot set `SECURITY_ATTRIBUTES`, so this must be
  solved via native support or a safe alternative.
- Add a session-unique handshake token so even same-user processes can’t inject
  requests without the token.

**Deliverables**

- Pipe DACL grants access only to:
  - the specific AppContainer SID for the Brain, and
  - the owning user/session (as needed for connectivity)
- Broker protocol includes a handshake (`hello`) containing a random token that
  is not logged.

**Who does what**

- **Agent:** extend the native module and update BrokerServer/Client.
- **Human:** validate with a manual “attempt to connect from another process”
  test.

**Definition of success**

- A random local process cannot connect to the pipe and execute broker
  operations.

---

### W3) Fix IPC correctness (request IDs + concurrency)

**What to do**

- Add `id` fields to broker requests/responses and update client/server to
  correlate by ID.

**Deliverables**

- Updated `BrokerSchema` with `id`.
- `BrokerClient` matches responses by `id` (no FIFO).
- Server handles multiple in-flight requests safely.

**Who does what**

- **Agent:** implement schema + client + server updates and add tests.
- **Human:** none.

**Definition of success**

- Parallel tool calls cannot cross-wire responses (no “stdout from the wrong
  command”).

---

### W4) Make RuntimeContext real for AppContainer tier (execute/spawn)

**What to do**

- Implement the runtime bridge so core tools (shell/grep and REPL where
  appropriate) can actually execute.
- This is where “agent power” returns: the tier must support broad command
  execution via approvals rather than allowlists.

**Deliverables**

- A working `RuntimeContext.execute/spawn` implementation for the AppContainer
  tier that:
  - uses `shell: false`
  - uses `command + args` (structured execution)
  - supports timeouts and returns stdout/stderr/exit codes deterministically
- A compatibility layer for the current shell tool behavior (which still passes
  a single command string) OR an upstream change that makes shell execution
  structured everywhere.

**Who does what**

- **Agent:** implement runtime bridge + integration tests.
- **Human:** confirm the execution-contract direction (string shell vs
  structured exec) because this affects a lot of code.

**Definition of success**

- On Windows with AppContainer enabled, `shell` tool, `grep`, and Python REPL
  workflows work without “not implemented” errors.

---

### W5) Replace the allowlist trap with policy-driven capability

**What to do**

- Remove “only `echo`/`dir` allowed” limitations and lean on:
  - your existing approval ladder (A/B/C),
  - provenance-aware escalation,
  - immutable audit,
  - AMSI scanning for scripts.

**Deliverables**

- Broker execution policy that:
  - allows general commands (structured execution)
  - requires higher approvals for risky ops (installs, system directories,
    registry edits, service management)
  - logs runtime metadata to audit
- AMSI enforcement integrated for PowerShell/script-like execution paths.

**Who does what**

- **Agent:** implement policy plumbing + tests.
- **Human:** define the “hard stops” you want even with C-level approval (if
  any).

**Definition of success**

- The tier can complete broad tasks without expanding static allowlists, while
  still forcing explicit approval for high-risk operations.

---

### W6) Native module distribution strategy (must be solved for real users)

**What to do**

- Decide and implement how `terminai_native.node` ships for Windows users.

**Deliverables**

- A distribution approach that does not require build tools on user machines:
  - prebuilt artifacts per platform/arch (preferred), published as optional deps
    or release artifacts
  - deterministic loading behavior + clear fallback messaging
- CI job that builds/signs these artifacts reproducibly.

**Who does what**

- **Agent:** implement packaging + CI plumbing.
- **Human:** choose the strategy that best avoids Defender heuristics (avoid
  “download binary during install” if possible).

**Definition of success**

- A clean Windows machine can enable AppContainer tier without compiling native
  code locally.

---

### W7) Windows acceptance suite (“doctor”) for AppContainer

**What to do**

- Create an acceptance gate that tells you, quickly, if this tier is real on a
  given machine.

**Deliverables**

- `terminai doctor --windows-appcontainer` (or equivalent) that validates:
  - native module loads
  - AppContainer profile exists / SID derivation works
  - workspace ACL grant succeeded
  - pipe ACL is restricted
  - brain↔hands ping works
  - a structured `execute` call works end-to-end
  - AMSI scan path returns sensible results (and blocks known-bad test strings
    if available)

**Who does what**

- **Agent:** implement doctor + minimal docs.
- **Human:** run it on at least two Windows setups (consumer laptop + dev box).

**Definition of success**

- You can validate AppContainer readiness in <2 minutes, and failures are
  actionable.

---

### W8) Fail-safe enablement and rollout (no “false security”)

**What to do**

- Keep AppContainer tier behind an explicit enablement knob until the above
  gates pass.
- Provide a safe fallback to host mode that preserves capability (with
  warnings).

**Deliverables**

- A feature flag / settings key that enables AppContainer tier explicitly.
- Clear runtime banner showing:
  - which tier is active
  - whether the environment is isolated
  - what is being brokered
- Fallback behavior if initialization fails (do not partially enable).

**Who does what**

- **Agent:** implement gating + UX.
- **Human:** decide the default (off until proven vs on when available).

**Definition of success**

- Users never end up in a half-enabled AppContainer state that is both insecure
  _and_ capability-nerfed.
