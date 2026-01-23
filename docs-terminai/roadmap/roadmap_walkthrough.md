# Walkthrough - Sovereign Runtime Implementation

**Date:** 2026-01-23 **Status:** Phase 3 Foundations Parked (Docker Primary)

This document details the step-by-step implementation of the Sovereign Runtime
(Phases 0-3), creating a robust, multi-tiered execution environment for the
agent.

## Phase 0: Restore Power (Runtime Repair)

**Objective:** Restore strict shell execution capabilities that were regressed,
ensuring `LocalRuntimeContext` can execute basic commands reliably.

- **Issue Identified:** `LocalRuntimeContext.execute` was failing to properly
  span shell processes, causing basic agent commands to fail due to incorrect
  argument handling.
- **Fix Implementation:**
  - Modified `packages/cli/src/runtime/LocalRuntimeContext.ts`: Corrected the
    `child_process.spawn` invocation to handle shell arguments properly on both
    Linux and Windows.
  - Ensured proper signal propagation and exit code handling.
- **Verification:**
  - Created reproduction/regression test suite in
    `packages/cli/src/runtime/tests/LocalRuntimeContext.test.ts`.
  - Verified pass on Linux/Host environment using `npm test`.

## Phase 1: Host Mode & T-APTS (Foundation)

**Objective:** Implement the "Action/Platform Abstraction" (T-APTS) layer and
ensure the Host Runtime (Tier 2) can utilize it via a managed Python
environment.

- **T-APTS Implementation:**
  - **Location:** `packages/sandbox-image/python/terminai_apts/action/files.py`.
  - **Features:**
    - `read_file`: Atomic read with size limits.
    - `write_file`: Atomic write with `overwrite=False` protection by default.
    - `search_files`: Glob-based recursive search.
  - **Testing:** Added comprehensive unit tests in
    `packages/sandbox-image/python/tests/test_files.py` covering edge cases
    (UTF-8, binary, missing files).
- **Host Runtime Integration:**
  - **Component:** `LocalRuntimeContext`.
  - **Logic:** Enhanced context initialization to locate the managed Python venv
    and verify `terminai_apts` availability.
  - **Verification:** Created `packages/cli/verify_tapts.ts` to spin up a local
    runtime, inject Python code invoking T-APTS, and parse the JSON response.
    Validated successful execution on the host.

## Phase 2: Docker Runtime (Sovereign Tier 1)

**Objective:** Implement a fully isolated, containerized runtime using Docker,
serving as the immediate "Tier 1" solution before Micro-VMs (Phase 3).

### 1. Runtime Logic Implementation

- **Revived Component:** `packages/cli/src/runtime/ContainerRuntimeContext.ts`.
  - _Previous State:_ Deprecated stub.
  - _New State:_ Fully implemented `RuntimeContext` interface with Docker
    backend.
- **Lifecycle Management:**
  - `initialize()`: Checks for Docker daemon, starts a detached container
    (`docker run -d ... tail -f /dev/null`) to serve as a persistent session.
    Stores `containerId` for subsequent commands.
  - `dispose()`: Kills and removes the container (`docker rm -f`).
- **Execution Primitives:**
  - `execute()`: Uses `execFile('docker', ['exec', ...])` to run commands safely
    inside the persistent container. Supports working directory and environment
    variable injection.
  - `spawn()`: Implements streaming execution via `spawn` for interactive
    processes.
- **Manager Integration:**
  - Updated `packages/cli/src/runtime/RuntimeManager.ts` to prioritize
    `ContainerRuntimeContext` (Tier 1.5) when Docker is detected, falling back
    to Host Mode only if Docker is absent.

### 2. Sandbox Build System Engineering

- **Challenge:** The build command `npm run build:sandbox` entered an infinite
  recursion loop.
  - _Root Cause:_ `scripts/build_sandbox.js` unconditionally ran
    `npm run build --workspaces`, which in turn invoked the
    `@terminai/sandbox-image` build script, calling `build_sandbox.js` again.
- **Fix:**
  - Modified `packages/sandbox-image/package.json` to pass a skip flag:
    `"build": "cd ../.. && node scripts/build_sandbox.js -s"`.
  - Modified `scripts/build_sandbox.js` to respect the `-s` flag and skip the
    redundant workspace build step during the inner loop.
- **Result:** Successfully built the `terminai-sandbox:latest` image containing
  the CLI, Core, and T-APTS packages.

### 3. End-to-End Verification

- **Verification Script:** Created
  `packages/cli/src/runtime/verify_container_context.ts`.
- **Test Flow:**
  1.  Initialize Container Context (spins up Docker container).
  2.  **File Isolation:** Write a file `/tmp/test_file.txt` inside the
      container. Verify it exists inside, read it back.
  3.  **T-APTS Integration:** Execute a Python one-liner inside the container
      that imports `terminai_apts.action.files` and reads the test file.
  4.  **Result:** Success. The JSON output matched the file content, proving the
      Python wheel was correctly installed and accessible in the Docker
      environment.

## Phase 3: MicroVM Foundations (Future Capability)

**Objective:** Build the infrastructure for Firecracker-based MicroVM sandboxing
to eventually replace Docker as the primary Linux isolator.

- **Status:** Foundations complete. Integration parked to prioritize Docker
  sandbox for Tier 1 stability.
- **Assets Created:**
  - **Kernel Build:**
    [build-microvm-kernel.sh](file:///home/profharita/Code/terminaI/scripts/build-microvm-kernel.sh)
    (Minimal 6.1.100 kernel).
  - **Rootfs Build System:**
    [build-microvm-rootfs.sh](file:///home/profharita/Code/terminaI/scripts/build-microvm-rootfs.sh) +
    [setup-rootfs.sh](file:///home/profharita/Code/terminaI/scripts/setup-rootfs.sh)
    (converting Docker images to bootable ext4).
  - **Guest Agent:**
    [guest_agent.py](file:///home/profharita/Code/terminaI/packages/sandbox-image/python/guest_agent.py)
    refactored for Serial (`ttyS0`) communication.
  - **Runtime Context:**
    [MicroVMRuntimeContext.ts](file:///home/profharita/Code/terminaI/packages/microvm/src/MicroVMRuntimeContext.ts)
    and
    [FirecrackerDriver.ts](file:///home/profharita/Code/terminaI/packages/microvm/src/FirecrackerDriver.ts).
- **Achievements:**
  - ✅ Kernel boots successfully in ~1.4s.
  - ✅ Rootfs mounts and init script executes (verified via `/INIT_SUCCESS`
    marker).
  - ✅ Hardware-agnostic Serial Transport protocol designed.
- **Key Learning:** Encountered a persistent `virtio-vsock` driver hang on MMIO;
  pivoted to Serial transport for host-guest communication to ensure
  reliability.

## Next Steps

- **Windows Hardening:** Implement AppContainer Broker restrictions to ensure
  Windows users have similar safety guarantees.
- **MicroVM Integration:** Complete the Host-side Serial driver when resuming
  MicroVM work to replace Docker with Firecracker for lower overhead.

## Day 5: Tooling Safety (Large-Output Protection)

**Objective:** Prevent agent context flooding by enforcing strict pagination and
bounding mechanisms on file exploration tools.

- **Logic Implemented:**
  - **Bounded Defaults:** `ls` and `grep` return max 100 entries by default.
  - **Strict Upper Bounds:** `limit` strictly capped at 1000 items. Requests for
    more are clamped.
  - **Pagination:** Added `offset` and `limit` to allow full dataset traversal
    in safe chunks.
- **Code Changes:**
  - `packages/core/src/tools/ls.ts`: Added strict clamping logic and pagination
    help messages.
  - `packages/core/src/tools/grep.ts`: Added `limit`/`offset` to params,
    implemented result slicing, and result regrouping.
- **Verification:**
  - Extended `ls.test.ts` to verify clamping (e.g., requesting 5000 items
    returns 1000).
  - Extended `grep.test.ts` to verify pagination logic.
  - All tests passed.

## Phase 4: Windows Broker Hardening (Security)

**Objective:** Harden the Windows "Brain & Hands" runtime by enforcing strict
policy boundaries between the untrusted Brain (AppContainer) and the privileged
Broker.

### 1. Command Execution Hardening

- **Issue:** `execute` and `spawn` used `shell: true`, allowing injection.
- **Fix:**
  - Centralized `ALLOWED_COMMANDS` static list.
  - Added `parseCommand` using `shell-quote` for safe argument extraction.
  - Set `shell: false` on all `spawn` calls.
  - Commands are validated against allowlist before execution.

### 2. Filesystem Isolation (Workspace Jail)

- **Issue:** File handlers accepted arbitrary absolute paths (e.g.,
  `C:\Windows\System32`).
- **Fix:**
  - Added `validatePath` method to strictly contain all paths within
    `workspacePath`.
  - All file operations (`readFile`, `writeFile`, `listDir`) and execution CWDs
    go through `validatePath`.
  - Prevents `../../../Windows/System32` traversal attacks.

### 3. Verification

- **Code Location:**
  [WindowsBrokerContext.ts](file:///home/profharita/Code/terminaI/packages/cli/src/runtime/windows/WindowsBrokerContext.ts)
- **Typecheck:** Passes (unrelated error in `verify_microvm_context.ts`).
- **Manual Tests (Windows):**
  - Path Jail: Read `C:\Windows\win.ini` → blocked.
  - Injection: `echo hello && calc` → calculator does NOT open.
  - CWD Escape: Set `cwd: "C:\\Windows"` → rejected.

## Day 03: Runtime Tier Visibility + Health Checks

**Objective:** Ensure users and logs show runtime tier; if runtime is broken,
fail early with a clear, actionable fix.

### 1. Startup Health Checks

- **Issue:** `RuntimeManager.getContext()` called `context.initialize()` but
  never called `context.healthCheck()`. Broken runtimes caused mid-task crashes.
- **Fix:** Added `healthCheck()` call immediately after `initialize()` for all 4
  runtime paths (MicroVM, Container, Windows Broker, Local).
- **Fail-Fast:** If health check fails, `context.dispose()` is called and an
  error is thrown with actionable message.

### 2. User-Facing Runtime Display

- **Issue:** Runtime tier was only logged internally, not shown to user.
- **Fix:** Added clear `[TerminaI] Runtime: X (Tier Y)` message after successful
  health check for each tier.

### 3. Audit Integration (Already Complete)

- `FileAuditLedger.append()` already injects `runtime: {type, tier, isIsolated}`
  into every audit event via `setRuntimeContext()`.

### Verification

- Typecheck passes for `RuntimeManager.ts` (unrelated error in
  `verify_microvm_context.ts`).
- Manual: Break Docker → should see fail-fast error with clear message.
