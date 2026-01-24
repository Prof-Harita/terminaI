# Windows AppContainer — Tasks Outstanding (Q1 2026)

**Date:** 2026-01-24  
**Scope:** Gaps vs `roadmap-q1-window-appcontainer.md` and
`docs-terminai/roadmap/windows-appcontainers/*` (Phase A/B/C specs + tasks)  
**Goal:** Exhaustive, regression‑proof checklist for Linux implementation before
Windows validation

---

## Executive Summary (Current Code vs Roadmap)

**Major blockers still open** (cannot claim “production candidate”):

1. **No Brain artifact** — `agent-brain.js` does not exist; broker cannot launch
   a real sandboxed brain process.
2. **Pipe transport is insecure** — Named pipe ACLs are open; no handshake
   token.
3. **IPC is not concurrency‑safe** — no request IDs; BrokerClient matches FIFO.
4. **Allowlist trap remains** — `ALLOWED_COMMANDS` still gates execution.
5. **No structured exec contract** — no `mode` field, no policy‑driven
   approvals, no Hand‑side approval prompting.
6. **AMSI policy incomplete** — only PowerShell uses AMSI; “AMSI unavailable =
   block” is not enforced.
7. **Productization missing** — no prebuilt native distribution, no doctor
   command, no feature gate, no runtime banner.

---

## Phase A — Infrastructure (W1–W3)

### W1: Brain entrypoint + launch (Phase A Tasks 20–24)

- [ ] **Create headless Brain entrypoint**  
  `packages/cli/src/runtime/windows/agent-brain.ts` (new)  
  Must: connect to broker pipe, perform hello handshake, and run agent loop
  without UI/TTY assumptions.
- [ ] **Bundle Brain artifact**  
  Add `agent-brain` bundle target in `esbuild.config.js` (or equivalent) to
  output `packages/cli/dist/agent-brain.js`.
- [ ] **Spawn Brain with env block**  
  Implement native `createAppContainerSandboxWithEnv()` and update
  `WindowsBrokerContext` to pass `TERMINAI_HANDSHAKE_TOKEN`, pipe path, and
  workspace in environment.
- [ ] **Startup coordination**  
  `WindowsBrokerContext.initialize()` must wait for Brain hello (timeout +
  error messaging).
- [ ] **Integration test for full init**  
  Add Windows‑only integration test that covers broker start → secure pipe →
  Brain spawn → hello response.

### W2: Secure named pipe (Phase A Tasks 14–19)

- [ ] **Native SecurePipeServer**  
  Implement in `packages/cli/native/pipe_security.{h,cpp}` and export in
  `native.ts`; update `binding.gyp`.
- [ ] **BrokerServer uses SecurePipeServer**  
  Replace `net.createServer()` path with native pipe server (DACL‑restricted).
- [ ] **Handshake token**  
  Generate per‑session token in `WindowsBrokerContext`, send via Brain env, and
  enforce in BrokerServer.
- [ ] **Hard fail on open pipe**  
  Enforce DACL requirement; add
  `TERMINAI_UNSAFE_OPEN_PIPE=1` escape hatch for dev only.
- [ ] **Handshake tests**  
  Unit tests for hello flow + rejection of wrong token.

### W3: IPC correctness (Phase A Tasks 1–13)

- [ ] **Request/response IDs**  
  Add `id` to all Broker requests/responses in `BrokerSchema.ts`.
- [ ] **Hello schemas + session type**  
  Add HelloRequest/HelloResponse + BrokerSession types and error codes.
- [ ] **BrokerClient response matching by ID**  
  Replace FIFO logic; add per‑request timeout and cleanup by id.
- [ ] **BrokerServer echoes request IDs**  
  Ensure all responses include the originating `id`.
- [ ] **Unit tests for concurrency**  
  Parallel requests must not cross‑wire.

---

## Phase B — Capability (W4–W5)

### W4: Runtime execute/spawn contract

- [ ] **Execution mode in schema**  
  Add `mode: 'exec' | 'shell'` to ExecuteRequest (default `exec`).
- [ ] **Structured exec everywhere**  
  Ensure RuntimeContext uses `command + args` for `exec`; shell mode only via
  explicit wrapper (`cmd /c`, `powershell -Command`) and **Level C**.
- [ ] **Remove allowlist**  
  Delete `ALLOWED_COMMANDS` from `WindowsBrokerContext` and replace with
  policy‑based classification.
- [ ] **Hands‑side approvals**  
  Implement Hands‑side approval prompting (no `preApproved` field).
- [ ] **Runtime bridge uses broker contract**  
  If Brain/Hands split is active, broker must be the only privileged execution
  path (no silent host bypass).

### W5: Policy & AMSI enforcement

- [ ] **Policy types & engine**  
  Add `PolicyTypes.ts` + `BrokerPolicyEngine` with zone classification,
  risk factors, approval levels.
- [ ] **Path canonicalization**  
  Implement `canonicalizePath()` + `classifyZone()` (handles junctions,
  symlinks, `\\?\` prefixes).
- [ ] **Hard stops (minimal list)**  
  Enforce irreversible command blocks per spec (disk/boot/credential tools).
- [ ] **AMSI coverage expanded**  
  Scan all script‑like execution paths (PowerShell, .ps1/.bat/.cmd/.js/.py) and
  **block** if AMSI unavailable (or explicit C‑level approval path).
- [ ] **Audit logging**  
  Log policy decisions + risk factors for each execution.
- [ ] **Tests**  
  Unit tests for policy classification and integration tests for approval flow.

---

## Phase C — Productization (W6–W8)

### W6: Native distribution strategy

- [ ] **Version export**  
  Export `native.version` from `packages/cli/native/main.cpp`.
- [ ] **Native loader enhancements**  
  Add loader types and status reporting in `native.ts`.
- [ ] **Optional deps packages**  
  Add `packages/native-win32-x64/` (and arm64 if planned) with prebuilt `.node`
  artifacts and `package.json` manifest.
- [ ] **Prebuild CI**  
  Add CI workflow to build/sign prebuilt native modules.
- [ ] **Optional deps wiring**  
  Add optionalDependencies to both `packages/cli` and `packages/terminai`.

### W7: Doctor command (acceptance suite)

- [ ] **Doctor command skeleton**  
  Implement `terminai doctor --windows-appcontainer` command.
- [ ] **Checks**  
  Native module load, AppContainer profile/SID, workspace ACL, secure pipe
  ACL, Brain↔Hands ping, structured exec, AMSI checks.
- [ ] **Output renderer**  
  Actionable, short, and explicit failure reasons.
- [ ] **Integration test**  
  End‑to‑end doctor run (Windows‑only).

### W8: Fail‑safe enablement + banner

- [ ] **Feature gate**  
  Add explicit enable flag (config/ENV) to activate AppContainer tier.
- [ ] **Fail‑safe initialization**  
  If any Phase A/B prerequisite fails, fall back to host mode with warning.
- [ ] **Runtime banner**  
  Display active tier + isolation status.

---

## Evidence of Current Gaps (Pointers)

- **Missing Brain artifact**: `WindowsBrokerContext` references
  `agent-brain.js`, but no file exists.  
  `packages/cli/src/runtime/windows/WindowsBrokerContext.ts:125`
- **Open pipe ACL**: `BrokerServer` uses `net.createServer()` with explicit TODO
  and warning about open ACLs.  
  `packages/cli/src/runtime/windows/BrokerServer.ts:188`
- **No request IDs**: `BrokerSchema` has no `id`; `BrokerClient` matches FIFO.  
  `packages/cli/src/runtime/windows/BrokerSchema.ts`  
  `packages/cli/src/runtime/windows/BrokerClient.ts:129`
- **Allowlist trap**: `ALLOWED_COMMANDS` still enforces hardcoded list.  
  `packages/cli/src/runtime/windows/WindowsBrokerContext.ts:95`
- **No handshake**: No hello schemas or token validation anywhere.

---

## Recommended Implementation Order (Regression‑Proof)

1. **Phase A W1–W3** (Brain, secure pipe, request IDs)  
2. **Phase B W4** (structured exec + remove allowlist)  
3. **Phase B W5** (policy + AMSI expansion + audit)  
4. **Phase C W8** (feature gate + safe fallback)  
5. **Phase C W7** (doctor command)  
6. **Phase C W6** (prebuild distribution)

---

## Regression‑Proofing Checklist (Must Pass)

- [ ] No AppContainer bypass to host execution when tier enabled.
- [ ] Pipe DACL restricted to AppContainer SID + owning user/session.
- [ ] Per‑request IDs with correct response matching (parallel requests).
- [ ] AMSI required for script execution (block if unavailable).
- [ ] Approval ladder used for high‑risk ops; Brain cannot pre‑approve.
- [ ] AppContainer tier can be explicitly enabled/disabled; no partial states.

