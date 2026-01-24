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

## Day 6: ATS Evaluation Runner (Measurement)

**Objective:** Make ATS-50 measurable and repeatable, locking in a systematic
evaluation routine for the "Road to 90%".

### 1. ATS Runner Implementation

- **Component:** `scripts/verify-ats.sh`.
- **Logic:** A comprehensive bash runner that embeds all 50 ATS task
  definitions.
  - `--task <ID>`: Prints the EXACT prompt, evidence criteria (pass), and
    failure conditions for any of the 50 tasks.
  - `--list`: Lists all tasks with their titles for easy reference.
- **Integration:** Added `npm run verify:ats` as the standard entry point.

### 2. Scoreboard & Tracking

- **New Asset:** `docs-terminai/roadmap/scoreboard.md`.
- **Purpose:** A living document tracking pass/fail status for all 50 tasks
  across Linux, Windows, and macOS.
- **Categories:** Organized tasks into categories (File/Disk, System
  Diagnostics, Security, etc.) for trend analysis.

### 3. Verification

- All runner commands tested successfully:
  - ✅ `npm run verify:ats -- --help` (Usage)
  - ✅ `npm run verify:ats -- --list` (Task index)
  - ✅ `npm run verify:ats -- --task 01` (Task details)
  - ✅ Task data renders with ANSI colors for human readability.
- **Rollout:** Baseline for all subsequent "ATS Closure" work (Days 21-70).

## Days 7-19: Stability & Hygiene Marathon

**Objective:** Stabilize the codebase, improve developer experience, and ensure
native performance across platforms.

### 1. Hygiene & Version Drift

- **Lockfile Integrity:** Implemented `check-lockfile.js` to ensure
  `package-lock.json` remains in sync with `package.json` across all workspaces.
- **Linting & Formatting:** Enforced stricter `eslint` and `prettier` rules in
  CI.
- **Dependency Management:** Audited and pinned dependencies to prevent drift.

### 2. Windows Native Strategy

- **Path Handling:** Audited codebase for hardcoded `/` separators, switching to
  `path.join()` and `path.normalize()` where appropriate (precursor to Day 20
  work).
- **PowerShell Support:** Verified shell execution strategies for PowerShell vs
  cmd.exe.

### 3. Docker Runtime Refinement

- **Lifecycle Management:** Hardened `ContainerRuntimeContext` disposal logic to
  prevent orphaned containers.
- **Image Optimization:** Reduced sandbox image size by stripping unnecessary
  build artifacts.

### 4. Documentation

- **Roadmap Updates:** Centralized tracking in `docs-terminai/roadmap/`.
- **Developer Guides:** Updated project documentation and setup scripts.

### 5. Flaky Tests

- **Teardown Logic:** Identified issues with global state persistence in tests
  (leading to Day 20's `startupProfiler` fix).
- **CI Stability:** Tuned timeout values and retries for CI environments.

# Walkthrough - Day 20: Windows Test Identity

## Goal

Enable comprehensive testing of Windows-specific path logic (`shortenPath`,
`escapePath`) on non-Windows environments and fix flaky CLI tests caused by
persistent singleton state.

## Changes

### Core Package

#### [paths.ts](file:///home/profharita/Code/terminaI/packages/core/src/utils/paths.ts)

- Refactored `shortenPath` to dynamically select `path.win32` or `path.posix`
  based on `os.platform()`.
- Refactored `escapePath` to use `os.platform()` instead of `process.platform`
  for better testability.

#### [startupProfiler.ts](file:///home/profharita/Code/terminaI/packages/core/src/telemetry/startupProfiler.ts)

- Added `reset()` method to `StartupProfiler` to allow clearing state between
  tests.

### Tests

#### [paths.test.ts](file:///home/profharita/Code/terminaI/packages/core/src/utils/paths.test.ts)

- Replaced `describe.skipIf` with `vi.mock('node:os')` to enforce specific
  platforms during tests.
- Updated expectations to match correct `path.win32` parsing behavior
  (preserving drive letters).

#### [gemini.test.tsx](file:///home/profharita/Code/terminaI/packages/cli/src/gemini.test.tsx)

- Replaced unstable `vi.resetModules()` with `startupProfiler.reset()`.
- Updated `@terminai/core` mock to correctly handle `startupProfiler` class
  instance methods (`start`, `reset`).

## Verification Results

### Automated Tests

- `packages/core/src/utils/paths.test.ts`: **Passed** (All POSIX and Windows
  cases verified on Linux).
- `packages/cli/src/gemini.test.tsx`: **Passed** (No more "phase already active"
  errors).

## Phase 4: Agentic Harness (Upgrade)

**Objective:** Upgrade from manual copy-paste validation to an interactive,
data-driven workflow.

### 1. Harness Script (`scripts/harness-ats.ts`)

- **Interactive Runner:** Wrapper around `terminai` that:
  - Selects task (01-50).
  - Spawns the agent with the **exact** prompt.
  - Prompts you for immediate pass/fail grading on exit.
  - Updates the scoreboard automatically.

### 2. Data Extraction

- **Source of Truth:** Extracted all 50 task definitions from bash script to
  [ats-tasks.ts](file:///home/profharita/Code/terminaI/scripts/data/ats-tasks.ts).
- **Benefits:** Type-safe, reusable, single maintenance point.

### 3. Scoreboard 2.0

- **Columns Added:** Runtime, Session, Result, Notes, Actions.
- **Persistence:** Harness writes result symbols (✅/❌) and notes directly to
  markdown.

### Usage

```bash
# Run task 01 interactively
npm run harness:ats -- 01

# Run all tasks in sequence
npm run harness:ats
```
