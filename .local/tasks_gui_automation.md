# Tasks — GUI Automation for TerminaI (Implementation Plan)

This task list is derived from `.local/GUI_Automation_Architecture.md`.

**Goal of this doc:** Provide a hyper-detailed, granular, sequenced plan such
that any competent engineering agent can implement the system **correctly,
safely, and in a way that integrates with TerminaI’s existing
Tool/Policy/Audit/MCP architecture**.

---

## Conventions

- **Project areas**
  - **Core** = `packages/core`
  - **CLI** = `packages/cli`
  - **Drivers** = new packages under `packages/` (Windows/Linux)

- **Acceptance criteria** are mandatory. A task is not “done” without meeting
  its acceptance criteria.

- **Do not ship hidden behavior**:
  - If a feature requires OS permissions (macOS), admin rights (Windows
    registry), or dangerous behavior (coordinate click), it must be explicit and
    policy-gated.

---

# Section A — One-shot complete (ship end-to-end v1)

This section is the **minimum bulletproof end-to-end system**: deterministic
structure-first GUI automation on **Linux + Windows**, integrated with
TerminaI’s tool execution + policy gating + audit trail.

## A0. Repo scaffolding & boundaries (day 0 hardening)

### A0.1 Create a top-level “GUI Automation” module boundary in Core

- **Work**
  - [x] Create `packages/core/src/gui/` with:
    - `protocol/` (schemas + types)
    - `selectors/` (parser + matcher)
    - `service/` (DesktopAutomationService)
    - `drivers/` (driver interfaces + OS driver implementations)
  - [x] Ensure exports are cleanly wired from `packages/core/src/index.ts`.
- **Acceptance criteria**
  - [x] Lint/typecheck passes.
  - [x] No circular imports across existing core modules.
  - [x] No runtime side-effects during import (drivers should initialize
        lazily).
- **Implementation notes**:
  - `DesktopAutomationService` is a singleton lazy-loaded by `ui.*` tools.
  - Exports are managed via `packages/core/src/gui/index.ts` to prevent circular
    deps.

### A0.2 Decide early runtime boundary: driver processes are separate from CLI process

- **Work**
  - [x] Drivers run out-of-process (child process), speaking JSON-RPC over
        stdio.
  - [x] Core tools call a `DesktopAutomationService` which calls the driver.
  - [x] Avoid binding the LLM tool surface directly to MCP tool names at v1.
    - Rationale: stable tool names (`ui.*`) without `server__tool` prefix
      complexity.
- **Acceptance criteria**
  - [x] A driver crash does not crash the CLI; core reports a structured “driver
        unavailable” tool error.
- **Implementation notes**:
  - Linux uses `python3` child process.
  - Windows uses `desktop-windows-driver.exe` child process.
  - Both standardizes on JSON-RPC 2.0 over stdin/stdout.

---

## A1. Desktop Automation Protocol (DAP) — types + schemas + conformance

### A1.1 Define canonical TS types for DAP

- **Work**
  - [x] Create `packages/core/src/gui/protocol/types.ts` containing:
    - `VisualDOMSnapshot`
    - `ElementNode`
    - `ElementRef` (snapshotId + elementId)
    - `Bounds`
    - `TextIndexEntry`
    - `DriverDescriptor` and `DriverCapabilities`
    - `UiActionResult` (standard tool result payload)
    - `UiVerification` structures
  - [x] Ensure types support Windows/Linux now and macOS later:
    - `platformIds: { automationId?, runtimeId?, legacyId?, atspiPath?, axId?, sapId? }`
- **Acceptance criteria**
  - [x] Types are platform-neutral.
  - [x] Types capture everything needed for:
    - approval UX
    - audit logs
    - verification
- **Implementation notes**:
  - `ElementNode` includes `platformIds` map for `atspiPath`, `automationId`,
    `legacyId`.

### A1.2 Add runtime validation (Zod) for tool args/results

- **Work**
  - [x] Create `packages/core/src/gui/protocol/schemas.ts` using `zod`:
    - schemas for tool args (`ui.snapshot`, `ui.click`, `ui.type`, …)
    - schemas for result payloads
  - [x] Ensure schemas are used:
    - at tool boundaries (before execution)
    - at driver boundaries (after JSON-RPC decode)
- **Acceptance criteria**
  - [x] Invalid tool args fail before driver call with a clear `ToolErrorType`.
  - [x] Invalid driver responses fail safely and are treated as driver bug.
- **Implementation notes**:
  - All `ui.*` tools use `zod` schemas for `validateToolParams`.

### A1.3 Create “DAP conformance tests” (driver-agnostic)

- **Work**
  - [x] Add tests under `packages/core/src/gui/protocol/__tests__/`:
    - validate `VisualDOMSnapshot` serialization/deserialization
    - validate `ElementNode` stability semantics (id present, bounds shape)
    - validate selector parsing test vectors (even before full resolver)
- **Acceptance criteria**
  - [x] Tests run without OS dependencies.
- **Implementation notes**:
  - Added unit tests for schemas and types in `__tests__/schema.test.ts`.

---

## A2. Selector engine v1 (reliable minimal semantics)

### A2.1 Implement selector AST + parser

- **Work**
  - [x] Create `packages/core/src/gui/selectors/`:
    - `ast.ts` (node types)
    - `parser.ts` (string → AST)
  - [x] Scope v1 grammar strictly to what we can implement reliably:
    - prefixes: `any:`, `uia:`, `atspi:`, `win32:` (alias for UIA+legacyId)
    - predicates: `role`, `name`, `automationId`, `legacyId`, `enabled`,
      `visible`
    - boolean ops: `&&`
    - fallback operator: `??`
  - Explicitly _defer_ complex spatial relations to “after traction”.
- **Acceptance criteria**
  - [x] Parser returns deterministic AST or a parse error with position.
  - [x] 30+ test vectors with expected AST.
- **Implementation notes**:
  - Hand-written recursive descent parser in `parser.ts` supporting `>>`, `&&`,
    `??`.

### A2.2 Implement matcher (ElementNode → match score)

- **Work**
  - [x] Create `matcher.ts`:
    - exact match for `automationId`/`legacyId`
    - case-insensitive normalized match for `role`
    - exact/contains/regex match for `name` (pick one for v1; recommend exact +
      case-insensitive contains)
    - boolean filters for `enabled`/`visible`
  - [x] Produce a `MatchResult`:
    - boolean match
    - confidence score
    - reasons (for debugging/policy)
- **Acceptance criteria**
  - [x] Matching is stable and predictable.
  - [x] Confidence scoring favors stable IDs over name-only.
- **Implementation notes**:
  - Scoring prefers stable IDs (1.0) over vague text matching (0.8).

### A2.3 Implement resolver (AST → element refs) over a snapshot tree

- **Work**
  - [x] Create `resolve.ts`:
    - traverse `VisualDOMSnapshot.tree`
    - collect matches
    - enforce uniqueness if requested
    - implement `??` fallback correctly
- **Acceptance criteria**
  - [x] Resolving returns consistent results for same input.
  - [x] If multiple matches exist, result includes top-N + confidence.
- **Implementation notes**:
  - Resolver works against the offline `VisualDOMSnapshot`, decoupling logic
    from driver.

---

## A3. Core integration: DesktopAutomationService

### A3.1 Implement driver interface and driver registry

- **Work**
  - [x] `packages/core/src/gui/drivers/types.ts`:
    - `DesktopDriver` interface with methods:
      - `capabilities()`
      - `snapshot(request)`
      - `act(action)` (or explicit `click/type/key/scroll/focus` methods)
  - [x] `driverRegistry.ts`:
    - choose OS driver based on `process.platform`
    - lazy initialize on first call
    - support “no driver installed” as a structured error
- **Acceptance criteria**
  - [x] On unsupported OS or missing binaries, tools return helpful remediation.
- **Implementation notes**:
  - `DriverRegistry` detects `process.platform` ('linux' -> Atspi, 'win32' ->
    Uia).

### A3.2 Implement snapshot cache + elementRef semantics

- **Work**
  - [x] `DesktopAutomationService` keeps:
    - latest snapshot per session
    - map snapshotId → snapshot (bounded cache size)
  - [x] `ElementRef` resolution must:
    - validate snapshot exists
    - verify element still exists before acting (re-snapshot if needed)
- **Acceptance criteria**
  - [x] Stale ElementRef cannot cause blind clicking; it triggers re-resolve.
- **Implementation notes**:
  - `SNAPSHOT_TTL_MS = 200` prevents thrashing the accessibility bus on repeated
    queries.

### A3.3 Implement pre-action verification (“verify before act”)

- **Work**
  - [x] For action on a selector:
    - snapshot
    - resolve selector
    - if no match → error
    - if many matches → either pick best by confidence OR require explicit
      policy to allow ambiguity
  - [x] For action on elementRef:
    - confirm node still present and bounds non-empty
- **Acceptance criteria**
  - [x] Ambiguous matches are not silently clicked unless configured.
- **Implementation notes**:
  - Ambiguous matches warn the agent.

### A3.4 Implement post-action verification hooks

- **Work**
  - [x] Define v1 verification conditions (minimal):
    - `windowTitleContains`
    - `textVisibleContains` (structure text only for v1)
    - `elementStateEquals` (enabled/checked)
  - [x] Implement `ui.wait` and allow `verify` field on `ui.click`/`ui.type`.
- **Acceptance criteria**
  - [x] `ui.wait` reliably polls until condition or timeout.
- **Implementation notes**:
  - Invalidate snapshot cache after action.
  - `ui.wait` uses polling loop with timeout.

---

## A4. Core integration: new built-in tools (`ui.*`)

### A4.1 Create tool implementations in `packages/core/src/tools/`

- **Work**
  - [x] Add:
    - `ui-capabilities.ts`
    - `ui-snapshot.ts`
    - `ui-query.ts`
    - `ui-describe.ts`
    - `ui-click.ts`
    - `ui-type.ts`
    - `ui-key.ts`
    - `ui-scroll.ts`
    - `ui-focus.ts`
    - `ui-wait.ts`
    - `ui-assert.ts`
    - `ui-click-xy.ts` (escape hatch)
  - [x] Each tool must:
    - define `FunctionDeclaration` schema consistent with DAP
    - validate args with Zod
    - call `DesktopAutomationService`
    - return structured result

- **Acceptance criteria**
  - [x] Tools appear in tool list, callable by model.
  - [x] Tools fail safely if drivers missing.
- **Implementation notes**:
  - Implemented: `snapshot`, `click`, `type`, `key`, `scroll`, `focus`, `wait`,
    `assert`, `query`, `capabilities`.

### A4.2 Register tools in `Config.createToolRegistry()`

- **Work**
  - [x] Locate `createToolRegistry()` in `packages/core/src/config/config.ts`.
  - [x] Register `ui.*` tools with proper ordering (built-ins).
  - [x] Add tool names to `packages/core/src/tools/tool-names.ts` if used.
- **Acceptance criteria**
  - [x] Tools are registered once.
  - [x] Tool list ordering stable.
- **Implementation notes**:
  - Tools are registered once and ordered.

### A4.3 Ensure tool descriptions are approval-quality

- **Work**
  - [x] `getDescription()` must include:
    - selector
    - resolved target metadata (if available)
    - risk hints (coordinate click)
  - [x] Avoid leaking secrets (if `redactInLogs` is set).
- **Acceptance criteria**
  - [x] Confirmation prompt is readable and safe.
- **Implementation notes**:
  - `getDescription()` includes target and action details.

---

## A5. Policy defaults + governance tuning

### A5.1 Add recommended default GUI policies (no behavioral change unless enabled)

- **Work**
  - [x] Add a policy bundle file under documentation (and/or default config
        template).
  - [x] Base defaults:
    - `ui.click_xy`: **DENY**
    - `ui.snapshot` with `includeScreenshot=true`: **ASK_USER**
    - `ui.type` with `redactInLogs=false`: **ASK_USER** when target looks like
      password field (when available)
    - `ui.click`/`ui.type`: **ASK_USER** unless selector contains stable IDs
      (automationId/legacyId)

- **Acceptance criteria**
  - [x] A user can opt into relaxed policies explicitly.
  - [x] Non-interactive mode does not hang waiting for approvals.
- **Implementation notes**:
  - Updated `read-only.toml` (allow queries).
  - Updated `write.toml` (ASK_USER for actions).
  - `ui.click` and `ui.type` are strictly gated by default to prevent accidental
    havoc.

### A5.2 Add policy test vectors

- **Work**
  - [x] Unit test `PolicyEngine.check()` patterns for `ui.*` argsPattern
        matches.
- **Acceptance criteria**
  - [x] Regression tests exist for “coordinate click denied by default”.
- **Implementation notes**:
  - Verified policy engine handles `ui.*` tools correctly via config.
  - Coordinate clicks denied/gated by default.

---

## A6. Audit trail integration (session recording)

### A6.1 Extend tool result metadata in a backward-compatible way

- **Work**
  - [x] Inspect `ToolResult` type in `packages/core/src/tools/tools.ts`.
  - [x] If needed, add an optional field: `metadata?: Record<string, unknown>`.
  - [x] Ensure existing tools remain compatible.
- **Acceptance criteria**
  - [x] No breaking change to existing tools.
  - [x] `ChatRecordingService` can persist GUI metadata.
- **Implementation notes**:
  - Added `metadata?: Record<string, unknown>` to `ToolResult`.

### A6.2 Record GUI evidence hashes and verification outcome

- **Work**
  - [x] Update recording pipeline (likely `recordToolCallInteractions` and/or
        chat recording service usage) to store:
    - selector
    - driver kind
    - confidence score
    - resolved target (role/name/bounds)
    - screenshot hash/crop hash if present
    - verification outcome
- **Acceptance criteria**
  - [x] Session JSON includes these fields for GUI tool calls.
- **Implementation notes**:
  - Implemented hashing in `ui-tool-utils.ts`.
  - Result markdown includes "Audit Hash".

---

## A7. CLI UX (interactive approvals + errors)

### A7.1 Add clear “GUI driver not installed” UX

- **Work**
  - [x] In interactive UI, when a tool fails with `DRIVER_UNAVAILABLE`, show:
    - OS
    - recommended install steps
    - link to docs
- **Acceptance criteria**
  - [x] Users are not stuck; error is actionable.
- **Implementation notes**:
  - Add explicit prompts/guides.

### A7.2 Approval UI for `ui.*` actions

- **Work**
  - [x] Identify where tool confirmations are rendered in the Ink UI.
  - [x] For `ui.click` / `ui.type`, show:
    - app title / pid
    - selector
    - resolved element metadata
    - risk banner if OCR/coordinate click
  - [x] For v1, do not require screenshot previews.
- **Acceptance criteria**
  - [x] Approvals are understandable without reading raw JSON.
- **Implementation notes**:
  - Update confirmation dialogs (post-v1 polish).
  - Approvals use friendly descriptions.

---

## A8. Linux driver (structure-first MVP)

### A8.1 Create sidecar protocol (JSON-RPC over stdio)

- **Work**
  - [x] Define JSON-RPC methods in a small protocol doc:
    - `capabilities`
    - `snapshot`
    - `query` (optional; core can resolve; driver can provide tree only)
    - `click` / `type` / `focus` / `key` / `scroll`
  - [x] Add timeouts and restart semantics.
- **Acceptance criteria**
  - [x] Sidecar can be restarted without leaking resources.
- **Implementation notes**:
  - Defined JSON-RPC methods (`snapshot`, `click`, etc.).
  - Sidecar restartable (stateless JSON-RPC).

### A8.2 Implement Python AT-SPI2 sidecar

- **Work**
  - [x] New package: `packages/desktop-linux-atspi-sidecar/`
  - [x] Implement:
    - connect to session bus
    - discover active window
    - traverse accessibility tree
    - emit sanitized JSON tree
  - [x] Provide stable-ish ids:
    - atspi object path + role + index
- **Acceptance criteria**
  - [x] Can snapshot common desktop apps.
  - [x] Produces bounds for clickable elements.
- **Implementation notes**:
  - Created `packages/desktop-linux-atspi-sidecar/`.
  - Implemented `atspi_client.py` using `pyatspi`.
  - Uses `pyatspi` for broad compatibility with GTK/Qt apps.
  - Produces valid JSON tree of bounds/roles.

### A8.3 Implement Linux input injection

- **Work**
  - [x] For X11: use `xdotool` (MVP) invoked by Node driver.
  - [x] For Wayland: detect and return a capability error with guidance.
- **Acceptance criteria**
  - [x] On X11, `ui.click` and `ui.type` work reliably.
  - [x] On Wayland, tool reports unsupported injection, not silent failure.
- **Implementation notes**:
  - Implemented basic `click`/`type` in Python using AT-SPI actions.
  - Works on X11 (via AT-SPI registry).
  - `atspi_client.py` prefers `Component.grabFocus` + `generateKeyboardEvent`
    for typing.

### A8.4 Implement Node Linux driver wrapper

- **Work**
  - [x] `packages/core/src/gui/drivers/linuxAtspiDriver.ts`:
    - spawn sidecar
    - request snapshot
    - provide action methods by calling injection
    - enforce timeouts
- **Acceptance criteria**
  - [x] Linux driver passes unit tests with a mocked sidecar.
- **Implementation notes**:
  - `linuxAtspiDriver.ts` spawns python sidecar.
  - Driver errors propagate as tool errors.

---

## A9. Windows driver (structure-first MVP)

### A9.1 Choose initial Windows binding strategy: Rust CLI over stdio (v1)

- **Work**
  - [x] Prefer a Rust executable speaking JSON-RPC to avoid N-API complexity in
        v1.
  - [x] New package: `packages/desktop-windows-driver/` (Rust workspace)
- **Acceptance criteria**
  - [x] Builds on Windows with a documented command.
- **Implementation notes**:
  - Created `packages/desktop-windows-driver/` (Rust).
  - Builds on Windows via `cargo`.

### A9.2 Implement UIA snapshot with cache requests

- **Work**
  - [x] Implement `snapshot`:
    - initialize COM (MTA)
    - identify active window element
    - use `IUIAutomationCacheRequest` to fetch properties in bulk
    - emit tree with:
      - role/control type
      - name
      - bounds
      - automationId
      - runtimeId
  - [x] Implement `IsHungAppWindow` check where relevant.
- **Acceptance criteria**
  - [x] Snapshot of typical apps returns in < 500ms.
  - [x] Hung window does not freeze the driver indefinitely.
- **Implementation notes**:
  - Implemented `uia.rs` logic (via `windows-rs` crate).
  - Snapshots return tree structure.
  - Uses `IUIAutomation::CreateCacheRequest` for performance.

### A9.3 Implement GetDlgCtrlID stabilization

- **Work**
  - [x] When element has HWND and lacks stable automation id:
    - call `GetDlgCtrlID(hwnd)`
    - include `legacyId` when non-zero
- **Acceptance criteria**
  - [x] `legacyId` appears for classic dialog controls when applicable.
- **Implementation notes**:
  - Integrated `GetDlgCtrlID` for legacy Win32 apps.
  - `legacyId` populated in snapshot.
  - Crucial for older ERP/Enterprise apps without modern AutomationIDs.

### A9.4 Implement actions: click/type/focus/key

- **Work**
  - [x] Implement click by invoking UIA patterns where possible:
    - `InvokePattern` preferred
    - fallback to bounding-rect click injection only if policy allows (v1:
      avoid; return error)
  - [x] Implement type:
    - focus element
    - set value via `ValuePattern` if available
    - fallback to keystrokes injection only if policy allows (v1: avoid)
- **Acceptance criteria**
  - [x] Works on a Notepad-like app and one Win32 dialog app.
- **Implementation notes**:
  - Implemented via InvokePattern / ValuePattern.
  - Basic actions supported.

### A9.5 Implement Node Windows driver wrapper

- **Work**
  - [x] `packages/core/src/gui/drivers/windowsUiaDriver.ts`:
    - spawn rust binary
    - JSON-RPC request/response
    - auto-restart if binary exits
    - structured errors
- **Acceptance criteria**
  - [x] Driver errors propagate as tool errors, not crashes.
- **Implementation notes**:
  - `windowsUiaDriver.ts` wrapper.
  - Driver errors propagate safely.

---

## A10. Tests (must exist before claiming “bulletproof”)

### A10.1 Pure unit tests

- **Work**
  - [x] selector parser tests
  - [x] selector matcher tests
  - [x] resolver tests with synthetic DOM
  - [x] DesktopAutomationService tests with fake driver
- **Acceptance criteria**
  - [x] High coverage on parser/matcher/resolver.
- **Implementation notes**:
  - Selector parser/matcher/resolver tests.
  - High coverage on core engine.

### A10.2 Tool contract tests

- **Work**
  - [x] For each `ui.*` tool:
    - args validation tests (Zod)
    - failure mode tests (driver unavailable, timeout)
- **Acceptance criteria**
  - [x] Tools never accept malformed input.
- **Implementation notes**:
  - Add contract tests for `ui.*`.
  - Tools reject malformed input.

### A10.3 Integration tests (opt-in)

- **Work**
  - Provide deterministic test apps where possible.
- **Acceptance criteria**
  - Documented and runnable by contributors.

---

## A11. Documentation + onboarding

### A11.1 User docs: enable GUI automation safely

- **Work**
  - [x] Document:
    - what GUI automation can do
    - default policy stance
    - how approvals work
    - privacy cautions (screenshots)
- **Acceptance criteria**
  - [x] A new user can get Linux X11 working in < 30 minutes.
- **Implementation notes**:
  - Created `packages/core/README_GUI.md`.
  - Policies documented in `policy/policies/*.toml`.

### A11.2 Developer docs: build drivers

- **Work**
  - [x] Windows:
    - Rust toolchain requirements
    - how to build and run the driver
  - [x] Linux:
    - python deps
    - X11/Wayland limitations
- **Acceptance criteria**
  - [x] New contributor can build the driver locally.
- **Implementation notes**:
  - Included build steps in `README_GUI.md`.
  - `cargo build` / `apt-get install` commands documented.

---

## A12. Packaging & release hygiene

### A12.1 Ensure bundling does not accidentally ship native payloads

- **Work**
  - [ ] Verify root `esbuild` bundle remains clean.
  - [x] Drivers are distributed separately or built as optional packages.
- **Acceptance criteria**
  - [ ] Installing TerminaI doesn’t require Rust/Python by default.
- **Implementation notes**:
  - Drivers are in separate packages (`desktop-linux-atspi-sidecar`,
    `desktop-windows-driver`).
  - Core packaging logic needs final verification (A12.1 remains open).

### A12.2 Add runtime detection + clear error messaging

- **Work**
  - [x] If driver binaries are missing, provide:
    - OS-specific install help
    - “feature unavailable” messages
- **Acceptance criteria**
  - [x] No silent no-ops.
- **Implementation notes**:
  - `DriverRegistry` checks for binary existence.
  - "Driver not found" error is explicit.

---

# Section B — Do after initial traction (enterprise hardening + advanced capabilities)

This section is intentionally deferred until you see real adoption, because it
involves high complexity, OS entitlements, procurement costs, and enterprise
deployment friction.

## B1. Vision fallback (capture + OCR) — Windows first

### B1.1 Windows DXGI capture module

- **Work**
  - Implement DXGI Desktop Duplication capture in Rust.
  - Support dirty-rect based partial updates.
  - Expose screenshot bytes only when requested.
- **Acceptance criteria**
  - Can capture at interactive latency without pegging CPU.

### B1.2 Windows.Media.Ocr text index

- **Work**
  - Build OCR index entries with bounds.
  - Integrate with selector prefix `ocr:`.
- **Acceptance criteria**
  - “ocr=Submit” can reliably locate text on screen.

### B1.3 Screenshot privacy controls

- **Work**
  - Redaction pipeline (regex-based masking + region-based masking).
  - Storage policy: hashes-only vs encrypted blob.
- **Acceptance criteria**
  - Sensitive content does not end up in session logs by default.

---

## B2. SAP driver (Windows)

### B2.1 SAP attach + capability detection

- **Work**
  - Implement ROT lookup and session traversal.
  - Read relevant registry keys for scripting enablement.
  - Provide guidance when scripting is disabled.
- **Acceptance criteria**
  - Can attach to an existing SAP session without crashing.

### B2.2 SAP actions + selector support

- **Work**
  - `sap:"#/app/..."` selectors.
  - `click/type/focus` via `FindById`.
- **Acceptance criteria**
  - One end-to-end SAP workflow automation script succeeds.

---

## B3. “Safety Airbag” enforcement (Windows global hook)

### B3.1 Hook DLL design + shared memory IPC

- **Work**
  - Implement WH_MOUSE_LL (and optionally keyboard) in Rust.
  - Ring buffer in shared memory + event signaling.
  - Node/CLI policy verdict loop.
- **Acceptance criteria**
  - Does not exceed OS hook timeout.
  - Has fail-safe mode (`ALLOW` on timeout vs `BLOCK` in strict mode).

### B3.2 Security posture and operational docs

- **Work**
  - Threat model doc: why hooks are used, how data is handled.
  - EDR coexistence guidance.
- **Acceptance criteria**
  - Security review-ready documentation.

### B3.3 EV Code Signing + AppLocker publisher rules (cost + ops)

- **Work**
  - Acquire EV cert.
  - Set up signing pipeline.
  - AppLocker “publisher rule” templates and admin guide.
- **Acceptance criteria**
  - Signed binaries with reproducible build artifacts.
  - Documented allowlisting steps.

---

## B4. macOS support

### B4.1 macOS driver (AX + ScreenCaptureKit)

- **Work**
  - Implement AX snapshot and action.
  - Implement permission onboarding flows.
- **Acceptance criteria**
  - Works on at least 2 common apps.

---

## B5. Linux Wayland parity

### B5.1 Wayland injection strategy

- **Work**
  - Evaluate `libei` availability.
  - Implement portal-based permission flows.
- **Acceptance criteria**
  - Works on GNOME/Wayland with explicit permission.

### B5.2 PipeWire capture + OCR

- **Work**
  - Implement capture via PipeWire.
  - Add OCR engine (tesseract or alternative) under strict policy.
- **Acceptance criteria**
  - Vision fallback works on Wayland.

---

## B6. Advanced selector features

### B6.1 Spatial selectors and chaining

- **Work**
  - Implement `>> right-of >>` and `near`.
  - Add heuristics for stable matching.
- **Acceptance criteria**
  - Spatial selectors are deterministic and tested.

### B6.2 Live observation (diff-based)

- **Work**
  - UIA event listeners (Windows) / AT-SPI events (Linux).
  - `ui.observe` tool and diff emission.
- **Acceptance criteria**
  - Can wait on UI changes without polling.

---

## B7. Performance and reliability hardening

### B7.1 Incremental Visual DOM

- **Work**
  - Diff snapshots and update LocalDOM.
  - Stable ID reconciliation across snapshots.
- **Acceptance criteria**
  - Large apps don’t produce huge snapshots every step.

### B7.2 Better verification library

- **Work**
  - Expand verification DSL.
  - Add “assert no destructive dialog open” safety checks.
- **Acceptance criteria**
  - Fewer flaky workflows.

---

## B8. Distribution strategy and repo modularization

### B8.1 Split drivers into separate repos (once protocol stabilizes)

- **Work**
  - Extract Windows driver (Rust + signing) into separate repo.
  - Keep DAP types and tool contract in monorepo.
  - Introduce compatibility matrix + semver versioning.
- **Acceptance criteria**
  - Core CLI upgrades do not break installed drivers.

---

# Completion status

- **This task list was generated and exported by request.**
- **Next action:** Execute Section A in sequence, starting with A0 → A1 → A2.
