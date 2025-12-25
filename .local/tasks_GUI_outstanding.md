# Outstanding — GUI Automation One-shot Execution Review

This document is a **code review + gap analysis** of the implementation against:

- `.local/GUI_Automation_Architecture.md` (spec)
- `.local/tasks_gui_automation.md` (the execution checklist)

It contains:

- Remaining **unchecked** One-shot tasks
- **Gaps vs expectations** for tasks marked complete
- Suspected **regressions/unintended changes**
- Additional items that improve “one-shot” UX + reliability

---

## Executive summary

A large portion of tasks were marked as complete, but a code inspection shows
several **P0 correctness** and **P0 safety** issues that likely prevent the
system from working end-to-end or create unsafe behavior.

The highest-risk issues are:

- **Driver lifecycle is incomplete**: drivers are never `connect()`ed before
  calls.
- **Protocol shape mismatches** between DAP TS types and driver JSON-RPC
  payloads.
- **Missing `ui.describe`** tool despite being referenced/declared.
- **UI tool invocations implement `execute()` with the wrong signature**
  (missing `AbortSignal` parameter), likely breaking compilation/runtime.
- **Default policy for `ui.click_xy` is not DENY** (it’s `ask_user`),
  contradicting the spec and the intended default safety posture.

---

# A) One-shot tasks not completed yet (carry-forward)

## A10.3 Integration tests (opt-in)

- **[Task]** Add “manual” integration test scripts for Linux/Windows.
- **[Status]** Not completed.
- **[Acceptance criteria]**
  - Provide a deterministic test app or workflow on each OS (e.g., Notepad +
    Win32 dialog; a GTK sample app).
  - Documented commands to run, expected results, and troubleshooting.

## A12.1 Bundling / packaging verification

- **[Task]** Verify root `esbuild` bundle remains clean; installing TerminaI
  doesn’t require Rust/Python by default.
- **[Status]** Not completed.
- **[Acceptance criteria]**
  - `terminai` install/run does not fail on machines without Rust/Python.
  - Drivers are optional (installed separately) and invoked only when available.

---

# B) Gaps vs expectations (tasks marked complete but implementation is not yet “bulletproof”)

## B1) Missing or incomplete features vs checklist

### B1.1 `ui.describe` tool is missing (spec + checklist mismatch)

- **[Expected]** `ui.describe({ elementRef | selector })` exists (DAP + tasks
  list).
- **[Found]** `UI_DESCRIBE_TOOL_NAME` exists in `tool-names.ts`, but no
  `ui-describe.ts` implementation exists.
- **[Required fix]**
  - Implement `UiDescribeTool` and register it.
  - Add Zod schema (`UiDescribeSchema`) is present but unused.
  - Tool must resolve:
    - selector → best match → return full node + ancestry
    - elementRef → validate snapshot → return node

### B1.2 Driver connection lifecycle is missing (system likely non-functional)

- **[Expected]** Driver process is started and verified before any RPC call.
- **[Found]** `DesktopAutomationService` never calls `driver.connect()`.
  - `LinuxAtspiDriver.sendRequest()` rejects if process not connected.
  - Same for `WindowsUiaDriver.sendRequest()`.
- **[Required fix]**
  - Add a `ensureConnected()` in `DesktopAutomationService` called by every
    public method.
  - Handle reconnect on driver exit.
  - Return structured errors (e.g., `DRIVER_UNAVAILABLE`) instead of raw
    `Error('Driver not connected')`.

### B1.3 DAP type/schema mismatch with driver payloads (breaks validation + runtime assumptions)

- **[Expected]** Driver JSON-RPC returns `VisualDOMSnapshot` and
  `UiActionResult` shapes matching `packages/core/src/gui/protocol/types.ts`.
- **[Found]**
  - Linux sidecar returns:
    - `get_capabilities`: `{ platform, driver, version, actions, native }` (not
      `DriverCapabilities` booleans)
    - `snapshot`: `{ tree, screenshot: None, textIndex: None, driver: <caps> }`
      missing `snapshotId`, `timestamp`, `activeApp`, and driver descriptor
      shape.
    - Nodes use `location` not `bounds`, and nodes do not include `id`.
  - Windows driver currently appears to implement only `get_capabilities` (see
    `packages/desktop-windows-driver/src/main.rs`).
- **[Required fix]**
  - Choose one canonical contract and enforce it:
    - Option 1 (recommended): keep `DriverDescriptor` + boolean
      `DriverCapabilities` and return those everywhere.
    - Option 2: expand protocol types to include `platform/driver/native` fields
      and update all TS.
  - Add runtime validation of driver responses in `LinuxAtspiDriver` /
    `WindowsUiaDriver` using Zod.

### B1.4 Linux driver is missing required JSON-RPC methods

- **[Expected]** Sidecar supports at least: `snapshot`, `click`, `type`, `key`,
  `scroll`, `focus`, optionally `click_xy`.
- **[Found]** Linux sidecar implements `get_capabilities`, `snapshot`, `click`,
  `type` only.
- **[Required fix]**
  - Implement missing methods or adjust the Node driver to not expose
    unsupported tools/capabilities.
  - `ui.capabilities` must accurately report what is supported.

### B1.5 Selector round-tripping is broken for AT-SPI

- **[Expected]** If a node has `platformIds.atspiPath`, the resolver can
  generate a robust selector that matches later.
- **[Found]** `DesktopAutomationService.resolveTargetForAction()` generates
  `atspi:path=...`.
  - But matcher supports `atspiPath` attribute name, not `path`.
- **[Required fix]**
  - Standardize on **one attribute key** (recommend `atspiPath`).
  - Ensure both generator and matcher use the same field.

### B1.6 UI tool invocation `execute()` signatures don’t match base class

- **[Expected]** `BaseToolInvocation.execute(signal: AbortSignal, ...)` is
  implemented.
- **[Found]** Several UI tool invocations implement
  `async execute(): Promise<ToolResult>` without `AbortSignal`.
- **[Required fix]**
  - Update all `Ui*ToolInvocation.execute()` signatures to accept
    `signal: AbortSignal` (and ignore if not used).

### B1.7 `ui.capabilities` tool returns a fake driver descriptor

- **[Expected]** It returns the current driver descriptor
  (name/kind/version/capabilities) consistent with spec.
- **[Found]** `ui-capabilities.ts` hardcodes driver
  `{ name: 'mock', kind: 'mock', version: '0' }`.
- **[Required fix]**
  - Driver should return a full `DriverDescriptor`, or the service should
    construct it.

### B1.8 ToolResult `llmContent` format likely invalid

- **[Expected]** `ToolResult.llmContent` is a `PartListUnion` (commonly `string`
  or `Part[]`).
- **[Found]** UI helpers return `llmContent: { text: jsonContent }` (object),
  which is likely not a valid `PartListUnion` in this codebase.
- **Required fix**
  - Use the same conventions as other tools (e.g., `llmContent: jsonContent`
    string).

---

## B2) Safety / governance gaps

### B2.1 `ui.click_xy` default policy is not DENY

- **[Expected]** Default policy denies coordinate clicks.
- **[Found]** `packages/core/src/policy/policies/write.toml` sets `ui.click_xy`
  to `ask_user`.
- **[Required fix]**
  - Change default decision for `ui.click_xy` to `deny`.
  - Optionally provide a documented “relax policy” override for advanced users.

### B2.2 Unsupported OS behavior uses MockDriver (unsafe / misleading)

- **[Expected]** On unsupported OS, tools should fail with structured
  `DRIVER_UNAVAILABLE`.
- **[Found]** `driverRegistry.ts` silently falls back to `MockDriver`.
- **[Required fix]**
  - Remove default MockDriver fallback (or gate behind explicit env var).
  - Return errors that force explicit install/enablement.

---

# C) Regressions / unintended changes introduced during execution

## C1) Duplicate tool name entry

- **[Found]** `packages/core/src/tools/tool-names.ts` includes
  `DELEGATE_TO_AGENT_TOOL_NAME` twice in `ALL_BUILTIN_TOOL_NAMES`.
- **Impact]** Confusing and may hide ordering/logic issues.
- **Fix]** Remove duplicate entry.

## C2) `schemas/settings.schema.json` changed unrelated to GUI automation

- **[Found]** A large new `llm` configuration section was added.
- **Impact]** Unclear scope; should be a separate PR.
- **Fix]** Revert or isolate unless explicitly required.

## C3) Driver code quality / module format issues

- **[Found]** Mixed import styles in `packages/core/src/gui/drivers/*`:
  - Some files import without `.js` extension (likely broken under ESM build).
  - `mockDriver.ts` does not implement the `DesktopDriver` interface
    (`getHealth` vs `isHealthy`, connect return type mismatch).
- **Fix]** Normalize imports and make MockDriver conformant or remove.

---

# D) Additional “one-shot execution” improvements (not explicitly in checklist but strongly recommended)

## D1) Add `ui.health` tool

- **[What]** `ui.health()` returns:
  - driver installed? binary path? sidecar reachable?
  - last error
  - capabilities
- **Why]** Reduces support load and speeds onboarding.

## D2) Add an explicit GUI automation enablement gate

- **[What]** A config flag like `guiAutomation.enabled` with default `false`.
- **Why]** Prevents accidental tool exposure in environments where it’s not
  intended.

## D3) Add a “driver install” doc + scripts

- **[What]** Documented install steps and a lightweight
  `./scripts/gui/install-linux.sh` and `install-windows.ps1` (or similar).
- **Why]** One-shot UX for contributors.

## D4) Make the snapshot model window-scoped by default

- **[What]** Default `ui.snapshot` should prefer the active window/application,
  not the entire desktop tree.
- **Why]** Faster, safer, less data.

---

# Next step

After addressing the P0 items in B1/B2/C, re-run:

- unit tests (selector + schemas + tool contracts)
- the new manual integration scripts (A10.3)
- packaging sanity checks (A12.1)
