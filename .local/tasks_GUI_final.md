# GUI Automation — Final Review (diff-based) + Remaining Tasks/TODOs

This document is a **diff-based code review** of the GUI automation
implementation added in:

- `c44b86f5` — `WIP: Snapshot of GUI automation work`
- `e550a02b` — `fix: GUI Automation build and lint fixes`

Review basis:

- Spec: `.local/GUI_Automation_Architecture.md`
- Task list: `.local/tasks_gui_automation.md`

Goal:

- List **all remaining work** as a prioritized backlog (P0/P1/P2)
- Provide **file pointers** and **acceptance criteria**

---

## What’s implemented (high-level)

- Core DAP types + Zod schemas:
  - `packages/core/src/gui/protocol/types.ts`
  - `packages/core/src/gui/protocol/schemas.ts`
- Selector engine v1 (`>>` chain and `??` fallback):
  - `packages/core/src/gui/selectors/*`
- `DesktopAutomationService` (snapshot caching, selector resolution, driver
  lifecycle):
  - `packages/core/src/gui/service/DesktopAutomationService.ts`
- Driver wrappers + registry:
  - `packages/core/src/gui/drivers/linuxAtspiDriver.ts`
  - `packages/core/src/gui/drivers/windowsUiaDriver.ts`
  - `packages/core/src/gui/drivers/driverRegistry.ts`
- Tool surface (`ui.*`):
  - `packages/core/src/tools/ui-*.ts`
- Policy bundles:
  - `packages/core/src/policy/policies/read-only.toml`
  - `packages/core/src/policy/policies/write.toml`
- Linux sidecar:
  - `packages/desktop-linux-atspi-sidecar/src/*`
- Windows driver skeleton:
  - `packages/desktop-windows-driver/*`
- Scripts:
  - `scripts/gui/install-linux.sh`
  - `scripts/gui/test-integration.ts`

---

# P0 — Must-fix (end-to-end blockers)

## P0.1 Linux sidecar entrypoint mismatch (driver cannot start)

- **Why P0**: Node spawns `packages/desktop-linux-atspi-sidecar/src/main.py`,
  but the Python server was rewritten in a way that likely breaks `main.py`’s
  `JsonRpcServer(client)` usage.
- **Files**:
  - `packages/desktop-linux-atspi-sidecar/src/main.py`
  - `packages/desktop-linux-atspi-sidecar/src/server.py`
  - `packages/core/src/gui/drivers/linuxAtspiDriver.ts`
- **TODO**:
  - Make the entrypoint consistent (either spawn `server.py` directly, or
    restore `server.py` to the handler-injected constructor used by `main.py`).
- **Acceptance criteria**:
  - `LinuxAtspiDriver.connect()` successfully spawns the sidecar and passes a
    `get_capabilities` ping.

## P0.2 Linux `ui.click` contract mismatch (core sends selectors, sidecar requires bounds/xy)

- **Why P0**: `DesktopAutomationService.click()` sends `{ target: <selector> }`,
  but sidecar click logic requires bounds or coordinates.
- **Files**:
  - `packages/core/src/gui/service/DesktopAutomationService.ts`
  - `packages/desktop-linux-atspi-sidecar/src/atspi_client.py`
- **TODO**:
  - Implement sidecar `click()` to resolve `target` (especially
    `atspi:atspiPath="..."`) and perform a real click via AT-SPI
    Action/Component interfaces, with coordinate fallback.
- **Acceptance criteria**:
  - On Linux: `ui.click` succeeds using an `atspi:` selector for a known
    element.

## P0.3 Linux capabilities don’t match reality (`key`/`scroll` advertised but not implemented)

- **Why P0**: planning + policy rely on truthful capabilities.
- **Files**:
  - `packages/desktop-linux-atspi-sidecar/src/atspi_client.py`
- **TODO**:
  - Either implement `press_key` and real scroll, or set
    `canKey/canScroll=false`.
- **Acceptance criteria**:
  - Capability flags match actual supported operations.

## P0.4 Windows Rust driver does not compile as written

- **Why P0**: the Windows driver package is currently non-buildable.
- **Evidence**: `main.rs` references `uuid` and `chrono`, but `Cargo.toml`
  doesn’t include them.
- **Files**:
  - `packages/desktop-windows-driver/src/main.rs`
  - `packages/desktop-windows-driver/Cargo.toml`
- **Acceptance criteria**:
  - `cargo build --release` succeeds on Windows.

## P0.5 Windows Node wrapper returns invalid fallback capabilities

- **Why P0**: `WindowsUiaDriver.getCapabilities()` fallback does not match
  `DriverCapabilities` boolean shape.
- **Files**:
  - `packages/core/src/gui/drivers/windowsUiaDriver.ts`
  - `packages/core/src/gui/protocol/types.ts`
- **Acceptance criteria**:
  - `getCapabilities()` always returns a properly shaped `DriverCapabilities`.

## P0.6 `ui.snapshot` tool sets incorrect evidence snapshot id

- **Why P0**: audit trail should reference the actual snapshot.
- **Files**:
  - `packages/core/src/tools/ui-snapshot.ts`
- **Acceptance criteria**:
  - `evidence.snapshotId === snap.snapshotId`.

## P0.7 Policy bundle tool names appear mismatched to actual built-in tool names

- **Why P0**: policies may not apply, causing unexpected prompts/denies.
- **Files**:
  - `packages/core/src/policy/policies/read-only.toml`
  - `packages/core/src/tools/tool-names.ts`
- **Acceptance criteria**:
  - Policy rules match actual registered tool names.

---

# P1 — Must-fix (spec compliance + quality)

## P1.1 `ui.describe` semantics (currently equivalent to `ui.query(limit=1)`)

- **Files**:
  - `packages/core/src/tools/ui-describe.ts`
- **TODO**:
  - Make `ui.describe` return structured “describe” info (element details +
    ancestry path + key attributes).
- **Acceptance criteria**:
  - `ui.describe` returns richer structured data than `ui.query`.

## P1.2 Add runtime validation for `snapshot` and `capabilities` responses

- **Files**:
  - `packages/core/src/gui/drivers/linuxAtspiDriver.ts`
  - `packages/core/src/gui/drivers/windowsUiaDriver.ts`
  - `packages/core/src/gui/protocol/schemas.ts`
- **Acceptance criteria**:
  - Driver responses are validated and failures return actionable errors.

## P1.3 Connection/cache invariants in `DesktopAutomationService`

- **Files**:
  - `packages/core/src/gui/service/DesktopAutomationService.ts`
- **Acceptance criteria**:
  - All public APIs behave consistently (either always require a healthy driver
    or explicitly allow cached reads).

## P1.4 Linux `ElementNode.id` stability

- **Files**:
  - `packages/desktop-linux-atspi-sidecar/src/atspi_client.py`
- **Acceptance criteria**:
  - `id` is deterministic (prefer deriving from `platformIds.atspiPath`).

## P1.5 Fix integration test selector (currently invalid)

- **Files**:
  - `scripts/gui/test-integration.ts`
- **Acceptance criteria**:
  - Script uses a valid selector like `role=Window` or `name~="..."` and runs
    successfully.

---

# P2 — Should-fix (polish, safety posture, maintainability)

## P2.1 Add explicit settings gate for GUI automation (default off)

- **Files**:
  - `packages/core/src/gui/service/DesktopAutomationService.ts`
  - `schemas/settings.schema.json`
- **Acceptance criteria**:
  - GUI tools fail with a clear message unless explicitly enabled.

## P2.2 Repo hygiene

- **Issue**: `__pycache__/` artifacts should not be committed.
- **Acceptance criteria**:
  - `__pycache__/` is ignored and removed from version control.

## P2.3 Standardize UI tool result formatting

- **Files**:
  - `packages/core/src/tools/ui-tool-base.ts`
  - `packages/core/src/tools/ui-tool-utils.ts`
- **Acceptance criteria**:
  - A single consistent formatting path is used.

---

# Packaging / install open decisions

## A12.1 Packaging model (ship prebuilt vs optional dev-only)

- **Current**:
  - Linux depends on system packages (`scripts/gui/install-linux.sh`).
  - Windows wrapper points at a local build artifact.
- **Acceptance criteria**:
  - Clear, documented installation story and graceful failure when sidecars are
    absent.

---

# Suggested PR/commit breakdown

- **Commit 1**: Protocol + selectors + UI tool surface
- **Commit 2**: DesktopAutomationService lifecycle + policy integration
- **Commit 3**: Linux sidecar + wrapper + scripts
- **Commit 4**: Windows driver compiling skeleton

---

# How to Test Manually

## Prerequisites (Linux)

```bash
# Install AT-SPI dependencies
./scripts/gui/install-linux.sh

# Verify pyatspi is installed
python3 -c "import pyatspi; print('AT-SPI available')"
```

## Run Integration Test

```bash
# Build the project first
npm run build

# Run the integration test
npx tsx scripts/gui/test-integration.ts
```

Expected output:

- Capabilities check should return `canSnapshot: true`, `canClick: true`, etc.
- Snapshot should return a valid tree with desktop elements
- Query should return matches for `role=Frame`

## Manual Sidecar Test

```bash
cd packages/desktop-linux-atspi-sidecar/src
echo '{"jsonrpc":"2.0","method":"get_capabilities","params":{},"id":1}' | python3 server.py
```

Expected response:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "canSnapshot": true,
    "canClick": true,
    "canType": true,
    "canScroll": false,
    "canKey": false,
    "canOcr": false,
    "canScreenshot": false,
    "canInjectInput": true
  },
  "id": 1
}
```

## Snapshot Test

```bash
cd packages/desktop-linux-atspi-sidecar/src
echo '{"jsonrpc":"2.0","method":"snapshot","params":{},"id":1}' | python3 server.py
```

This should return a JSON object with `snapshotId`, `timestamp`, `activeApp`,
`tree`, and `driver` fields.
