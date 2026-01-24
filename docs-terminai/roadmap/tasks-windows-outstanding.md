# Windows AppContainer — Outstanding Tasks (Post-Implementation Update)

**Date:** 2026-01-24  
**Scope:** Remaining gaps vs `roadmap-q1-window-appcontainer.md` and
`docs-terminai/roadmap/windows-appcontainers/*` after current changes  
**Goal:** Concrete, executable checklist for Linux-side completion

---

## What’s Already Done (Summary)

- **Brain artifact + spawn path**: `agent-brain` entrypoint created, bundled,
  and spawned with env block and handshake token.
- **Secure pipe + handshake**: Native `SecurePipeServer` with DACL restriction
  and per-session handshake token (with unsafe escape hatch).
- **IPC IDs + schema updates**: Request/response IDs added; hello handshake
  schema present; BrokerClient correlates by ID.
- **Structured execution mode**: `mode: exec|shell` added to ExecuteRequest.
- **Allowlist removed**: `ALLOWED_COMMANDS` removed from broker runtime.
- **AMSI coverage**: PowerShell requires AMSI; script‑path scanning enforced.
- **Hands‑side approvals**: Broker prompts for B/C approvals (PIN for Level C).
- **Policy + audit**: Policy decisions + risk factors logged to audit ledger.
- **Feature gate + fallback**: `checkAppContainerGate()` added; fallback to host
  on failure.
- **Doctor command**: `/doctor windows-appcontainer` includes real AppContainer
  handshake, workspace ACL, and pipe DACL checks.
- **Native loader enhancements**: status tracking + optional dep resolution.
- **Optional deps stubs**: `packages/native-win32-x64` and `...-arm64` stubs
  added; optionalDependencies wired.
- **Runtime banner**: UI footer shows active runtime + isolation status.

---

## Phase A — Infrastructure (W1–W3)

### W1: Brain launch + coordination

- [x] **Startup coordination**  
  `WindowsBrokerContext.initialize()` waits for hello handshake (timeout).
- [x] **Full init integration test**  
  Windows‑only test exists (gated by `TERMINAI_RUN_WINDOWS_INTEGRATION=1`).

### W2: Secure pipe hardening

- [x] **Verify DACL at runtime**  
  Doctor checks pipe DACL includes AppContainer SID + user SID.
- [x] **Handshake tests**  
  Unit tests validate hello flow + wrong‑token rejection (Windows only).

### W3: IPC correctness

- [x] **Concurrency tests**  
  Tests validate concurrent request handling (Windows only).

---

## Phase B — Capability (W4–W5)

### W4: Execution contract + approvals

- [x] **Hands‑side approvals (B/C)**  
  Approval prompting is implemented in the Hands broker (no `preApproved` field).
- [x] **Shell mode Level C enforcement**  
  Shell mode routes through Level C approval.
- [x] **Structured exec everywhere**  
  `exec` uses `command + args`; shell wrapper only when `mode: shell`.

### W5: Policy + audit + zone classification

- [x] **Policy engine integration**  
  `BrokerPolicyEngine` drives approvals with risk factors and prompts.
- [x] **Secrets zone enforcement**  
  Secrets access denied by policy.
- [x] **Audit logging**  
  Policy decisions + risk factors logged per execution.
- [ ] **Tests**  
  Unit tests added; integration tests for approval flows still needed.

---

## Phase C — Productization (W6–W8)

### W6: Native distribution

- [ ] **Prebuilt artifacts**  
  Add real `.node` files to platform packages (x64, arm64).
- [ ] **CI prebuild workflow**  
  Workflow added for win32‑x64 build + artifact upload; signing + publish pending.

### W7: Doctor command

- [x] **Workspace ACL check**  
  Doctor validates AppContainer SID on workspace ACL.
- [x] **Secure pipe ACL check**  
  Doctor verifies pipe DACL includes AppContainer SID + user SID.
- [x] **Brain↔Hands end‑to‑end**  
  Doctor validates real AppContainer broker+brain handshake when artifact exists.
- [x] **AMSI blocked‑path check**  
  Doctor validates AMSI blocks a known bad sample when available.

### W8: Runtime visibility

- [x] **Runtime banner**  
  UI footer displays active runtime + isolation status.

---

## Regression‑Proofing Checklist (Must Pass)

- [ ] No AppContainer bypass to host execution when tier enabled.
- [ ] Pipe DACL restricted to AppContainer SID + user SID; fails closed unless
      `TERMINAI_UNSAFE_OPEN_PIPE=1`.
- [ ] Per‑request IDs correctly correlated under concurrency.
- [ ] AMSI required for script execution; block when unavailable.
- [ ] Approvals enforced in Hands (Brain cannot pre‑approve).
- [ ] Feature gate prevents partial enablement; clean fallback path is clear.
