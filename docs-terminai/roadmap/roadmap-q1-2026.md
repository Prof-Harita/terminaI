# Q1 2026: Isolation-tier roadmap (Windows AppContainer + Linux MicroVM)

**Date:** 2026-01-23  
**Scope:** harden/finish the *isolation runtimes* without nerfing capability  
**Companion doc:** `docs-terminai/roadmap/roadmap.md` (ATS‑50 capability roadmap; unchanged)

This roadmap exists because the current “isolation tiers” are **not yet real** in the codebase:

- Windows AppContainer: multiple security/correctness gaps and bypass paths.
- Linux MicroVM: scaffolding exists, but selection is hard-disabled and execution is unimplemented.

The goal for Q1 is **not** “script every task.” It’s to ship *general primitives* (a survival kit) and runtime contracts that preserve agentic OODA/REPL power while making isolation trustworthy.

---

## 0) Current state snapshot (as of 2026-01-23)

### Windows AppContainer (“Brain & Hands”) is incomplete

**Hard gaps**

- **Bypass path exists via `runtimeContext.execute()`:** `ShellExecutionService` routes all shell execution to `runtimeContext.execute()` when a runtime is present (`packages/core/src/services/shellExecutionService.ts`). This bypasses PTY behavior and makes runtime semantics define correctness for *basic shell usage*.
- **`WindowsBrokerContext.execute()` uses `shell: true`:** host command execution uses `shell: true` (`packages/cli/src/runtime/windows/WindowsBrokerContext.ts`). This undermines “broker-enforced” safety and makes quoting/injection semantics fragile.
- **Named pipe ACL is explicitly open:** broker pipe access is *not* restricted to the AppContainer SID yet (`packages/cli/src/runtime/windows/BrokerServer.ts` contains TODO + warning).
- **IPC correctness is not concurrency-safe:** `BrokerClient` matches responses FIFO rather than correlating by request ID (`packages/cli/src/runtime/windows/BrokerClient.ts`).
- **`agent-brain.js` is missing:** `WindowsBrokerContext` attempts to spawn `agent-brain.js`, but it does not exist in the repo (only referenced in `packages/cli/src/runtime/windows/WindowsBrokerContext.ts`).

**Implication**

Right now, AppContainer is best described as a **partially implemented prototype**. Enabling it broadly would risk both (a) capability regressions and (b) a false sense of security.

### Linux MicroVM is scaffolding (not a runtime)

- **Hard-disabled selection:** `MicroVMRuntimeContext.isAvailable()` always returns `false` (`packages/microvm/src/MicroVMRuntimeContext.ts`).
- **No execution:** `MicroVMRuntimeContext.execute()` and `.spawn()` throw “not implemented”.
- **Missing guest assets:** there is no kernel/rootfs in `packages/microvm/resources/` today (only `firecracker` and a `vz-helper.swift` source file).

**Implication**

MicroVM cannot currently contribute to “secure runtime” in production. Treat it as an R&D track until it can actually boot and execute commands.

---

## 1) Q1 outcomes (what “done” means for each tier)

### Windows AppContainer: “production candidate” outcome

**Definition of done (Windows)**

1. **No bypass execution paths**
   - If AppContainer tier is active, command execution cannot silently fall back to uncontrolled host shell execution (`shell: true` must be gone).
2. **Pipe transport is secured**
   - Named pipe is ACL-restricted to the AppContainer SID (plus the owning user/session) *and* requires an unguessable session token handshake.
3. **IPC is correct**
   - Broker protocol includes a request ID; client matches responses by ID; concurrent requests are safe.
4. **The “Brain” artifact exists**
   - The AppContainer “brain” entrypoint is shipped with the CLI package and is verifiably invoked in runtime health checks.
5. **Capability is not nerfed**
   - With AppContainer enabled, the product can still complete a broad set of ATS tasks on Windows (the exact bar is still ATS‑50, but this tier must not break basic shell, python, and file operations).
6. **Audit and safety remain authoritative**
   - All brokered operations remain governed by the existing approval ladder and are logged with runtime metadata.

### Linux MicroVM: “developer preview” outcome (Q1 realistic target)

**Definition of done (Linux MicroVM Preview)**

1. **Boot + execute**
   - MicroVM can boot and execute a command in the guest, returning stdout/stderr/exitCode.
2. **Workspace mounting works**
   - A workspace directory can be mounted read/write into the guest.
3. **Survival kit exists**
   - Guest has Python 3 and can import `terminai_apts` (or has a deterministic install path).
4. **Health checks are real**
   - Runtime health check verifies boot + RPC roundtrip, not just “files exist”.
5. **Safe fallback**
   - If MicroVM is unavailable, the product falls back to other tiers without capability loss.

---

## 2) Key decision points (resolve early in Q1)

### D1: Linux isolation in Q1 — Container vs MicroVM as the “real” Tier 1

**Option A (recommended for Q1):** re-enable/finish the container-based sandbox as the primary Linux isolation tier (already architected in `docs-terminai/terminai-sandbox-architecture.md`) and keep MicroVM as “preview” until it can actually execute.

**Option B:** commit to MicroVM as Tier 1 and accept a larger engineering burden (kernel/rootfs, guest agent RPC, artifact distribution).

**Why this matters:** without a working Tier 1, “secure runtime” is mostly messaging. If you want credible Q1 progress, you need at least one isolation tier that’s real and testable.

### D2: Windows security model — what is the AppContainer “Brain” responsible for?

Pick one of these models (don’t mix them):

- **Model 1 (full split):** Brain (AppContainer) owns network + reasoning; Hands (host broker) owns privileged execution. This is closest to the Defender-friendly thesis, but requires deeper integration work.
- **Model 2 (minimal split):** Brain (host) stays as-is; AppContainer exists only as a helper. This is easier but provides less AV/safety benefit.

### D3: Native module distribution strategy

Windows AppContainer requires native code (`terminai_native.node`). Decide how users get it:

- **Prebuilt binary packages per platform** (preferred): publish optional dependencies (e.g., `@terminai/cli-native-win32-x64`) and load them if present.
- **Build from source on install**: high friction on Windows; will break many users.
- **Download during install**: high AV risk and often “looks like a dropper”.

This decision should align with your CI hardening strategy (forbid binaries in git, but allow them in release artifacts/npm packages).

---

## 3) Q1 execution plan (milestones + deliverables)

Timebox: the remaining weeks of Q1 (late Jan → Mar 31, 2026).

### Track A — Windows AppContainer (primary)

#### A1: Remove bypass + fix execution contract (Week 1–2)

**Deliverables**

- A single, explicit runtime execution contract: `execute({ command, args, cwd, env, timeout })` (no “string command requires shell parsing” ambiguity).
- `ShellExecutionService` uses the structured contract when a runtime exists, and preserves PTY behavior when it doesn’t.
- `WindowsBrokerContext.execute/spawn` does **not** use `shell: true` and does **not** accept ambiguous “one string with spaces” unless it is routed through an explicit wrapper (`cmd /c` or PowerShell) with policy gating.

**Success**

- On Windows with AppContainer tier enabled, basic shell commands and common pipelines do not regress vs host mode.

#### A2: Secure the broker transport (Week 2–3)

**Deliverables**

- Named pipe created with proper DACL (AppContainer SID + owning user).
- Session token handshake (token not trivially sniffable; at minimum random-per-session and not logged).
- A broker “ping” that is actually end-to-end (brain ↔ broker).

**Success**

- Another local process cannot connect to the broker pipe and execute operations.

#### A3: Make IPC correct under concurrency (Week 3)

**Deliverables**

- Add `id` to broker requests/responses (update schema + client + server).
- BrokerClient matches responses by ID; timeouts are per request; no FIFO hacks.

**Success**

- Parallel tool calls cannot cross-wire responses.

#### A4: Ship the AppContainer brain entrypoint (Week 3–4)

**Deliverables**

- A real brain entrypoint file exists (replace `agent-brain.js` placeholder) and is shipped in `@terminai/cli` package output.
- Health check confirms the brain process starts and can ping the broker.

**Success**

- AppContainer tier can be enabled on a clean Windows machine without “missing file” failures.

#### A5: Replace the allowlist trap with policy-driven capability (Week 4–6)

**Problem**

Static allowlists don’t scale to your “90% tasks succeed” bar.

**Deliverables**

- Broker execution becomes *policy-driven*:
  - Unknown or risky operations require higher approval (B/C) rather than being forbidden.
  - Safe operations remain A-level and easy.
- Broker still enforces no-shell / safe spawning semantics.
- “Downloads/install” flows remain explicit and approval-gated to avoid Defender heuristics.

**Success**

- Windows can perform broad tasks without expanding ALLOWED_COMMANDS endlessly.

#### A6: Acceptance gates for Windows runtime readiness (Week 6–8)

**Deliverables**

- A Windows-focused runtime acceptance suite:
  - “no bypass” checks (no `shell:true`, no direct uncontrolled spawn)
  - “pipe is secure” checks
  - a small set of ATS tasks that are known to stress runtime (files, python, network diagnosis, installs)
- Documentation for: how to enable AppContainer tier, how to verify it, how to fall back safely.

**Success**

- You can enable AppContainer tier and run a representative ATS subset without capability nerf.

### Track B — Linux MicroVM (secondary / preview)

#### B1: Make MicroVM bootable in dev (Week 1–3)

**Deliverables**

- Build pipeline that produces kernel + rootfs artifacts (not committed to git).
- `MicroVMRuntimeContext.isAvailable()` becomes a real probe (KVM + artifacts present) and is still gated behind a feature flag.

**Success**

- A developer can boot the VM locally and see a deterministic “hello world” command run.

#### B2: Add a guest agent + RPC (Week 3–6)

**Deliverables**

- Guest agent listens on vsock and supports:
  - execute command + args
  - return stdout/stderr/exitCode
- Host implements the RPC client and wires it to `MicroVMRuntimeContext.execute/spawn`.

**Success**

- `MicroVMRuntimeContext.execute()` works for non-interactive commands.

#### B3: Survival kit inside guest + workspace mount (Week 6–9)

**Deliverables**

- Workspace mount read/write (virtio-fs or alternative).
- Python available in guest + deterministic way to ensure `terminai_apts` is present.

**Success**

- A Python script can be executed inside the VM against mounted user files, without polluting host Python.

#### B4: Decide go/no-go for “Tier 1 MicroVM” (Week 9–10)

**Deliverable**

- A written decision: keep MicroVM as preview or promote it to Tier 1 on Linux.

**Success**

- MicroVM status is honest and aligned with what it can actually do.

---

## 4) What’s missing vs the current 70‑day ATS roadmap

The ATS roadmap is correct for regaining broad capability, but it does **not** fully capture isolation-tier completion work, especially:

- Windows broker pipe ACL + authentication
- broker IPC request IDs / concurrency correctness
- shipping the AppContainer “brain” artifact
- native module distribution strategy
- MicroVM guest agent + rootfs/kernels + artifact pipeline

This Q1 doc is the backlog for those isolation-tier gaps.

---

## 5) Recommended Q1 sequencing (to avoid “power nerf”)

1. **Fix execution contracts first** (shared prerequisite for both Windows AppContainer and any runtime bridging).
2. **Ship measurement gates** (so you can prove AppContainer doesn’t nerf capability).
3. **Harden broker transport + correctness** (ACL + request IDs).
4. **Only then** tighten security posture and raise default enforcement levels.

The guiding principle is: **security improvements must not degrade baseline capability**. Keep Host Mode strong while isolation tiers mature.

