# GUI Automation for TerminaI — Architecture & Technical Specification

**Status:** Proposed v1 specification (hyper-detailed)

**Primary design goal:** Extend TerminaI from “terminal operator” to “system
operator” by adding deterministic, governed desktop UI automation
(click/type/read UI state) while preserving TerminaI’s core differentiators:
**policy gating**, **auditability**, and **extensibility**.

---

## 1. Executive summary

TerminaI already has the correct governance and execution substrate:

- **Tools** (`ToolRegistry`, `CoreToolScheduler`) for structured actions.
- **Policy gating** (`PolicyEngine` + `MessageBus`) for `ALLOW` / `DENY` /
  `ASK_USER`.
- **Session recording** (`ChatRecordingService`) for audit + replay.
- **Extensions/MCP** (`McpClientManager`, `ExtensionLoader`) for plug-in
  capability.
- **Remote control** (`a2a-server`, web remote) for external orchestration.

GUI automation must not be bolted on as an ad-hoc “mouse controller.” Instead,
it becomes:

- A **capability** represented as a set of tools.
- A **driver system** (OS-specific) that implements perception + action.
- A **policy-governed execution path**, identical to shell execution.
- A **first-class audited workflow**, identical to shell tool calls.

This specification implements a “Structure-First, Vision-Fallback” paradigm:

- **Tier 1 (Structure):** OS accessibility/automation trees (Windows UIA, Linux
  AT-SPI2, macOS AX) and deep app-native APIs (SAP scripting) for deterministic
  selection and action.
- **Tier 2 (Vision fallback):** Local capture + OCR/VLM for opaque surfaces
  (Citrix/VDI/canvas), used only when structure is insufficient and policy
  allows.
- **Tier 3 (Governance):** Policy gating for every action; optional enterprise
  mode “Safety Airbag” input interception (Windows) for strict blocking/allowing
  of physical input.

---

## 2. Requirements

### 2.1 Functional requirements

- **Perception**
  - Snapshot active window UI tree into a portable “Visual DOM.”
  - Resolve selectors to one or more elements.
  - Provide window/app metadata, bounds, focus state.
  - Provide optional screenshot and OCR index (policy-gated).

- **Action**
  - Click (single/double/right), focus, scroll, type text, send hotkeys.
  - Wait/Assert primitives for robust automation (avoid blind sleeps).

- **Reliability**
  - Deterministic selectors when possible (AutomationId, RuntimeId, SAP IDs,
    GetDlgCtrlID).
  - “Verify before act” and “verify after act” checks.
  - Resilience against hung apps (Windows: `IsHungAppWindow` preflight).

- **Governance**
  - Every action is a tool call and is evaluated by `PolicyEngine`.
  - Interactive CLI shows actionable evidence before approving.
  - Secrets typed into UI can be redacted from logs.

- **Auditability**
  - Record the intent, selector, resolved target metadata, evidence hashes,
    driver used, and results.
  - Provide deterministic replay where possible.

### 2.2 Non-functional requirements

- **Security & privacy**
  - Default policy should be conservative (deny coordinate clicks by default).
  - Screenshots are sensitive; capture and storage must be explicitly
    controlled.
  - Avoid always-on global hooks by default.

- **Portability**
  - Windows + Linux are mandatory.
  - macOS support is strategically important; design must not block it.

- **Extensibility**
  - App-specific “drivers” (SAP, Citrix runtime, Oracle Forms) can be shipped as
    extensions/MCP servers.

---

## 3. Architectural principles

### 3.1 Safety Sandwich (non-negotiable)

**LLM (“Brain”) never touches OS input directly.**

- **Brain:** produces intent and tool calls.
- **Safety layer:** `PolicyEngine` + `MessageBus` decides allow/deny/ask-user.
- **Driver (“Body”):** executes only after policy decision.

### 3.2 Determinism-first

Prefer APIs that identify a UI element by **identity and semantics**, not
pixels:

- Windows: UIA properties/patterns, `RuntimeId`, `AutomationId`, `GetDlgCtrlID`.
- SAP: scripting IDs (`FindById`).
- Linux: AT-SPI2 object path/roles.
- macOS: AX identifiers/roles.

Vision (OCR/VLM) is a fallback, not a default.

### 3.3 Observability + replayability by default

Every GUI action yields:

- What was targeted
- Why it was targeted
- What driver was used
- Whether verification succeeded

Recorded in the same session log stream as shell tools.

### 3.4 Capability negotiation

Not all environments support injection/capture.

- Wayland may block input injection.
- macOS requires explicit user permissions.
- Windows EDR may block low-level hooks.

Drivers must expose **capabilities**, and TerminaI must degrade gracefully.

---

## 4. System architecture overview

### 4.1 Components

- **TerminaI Orchestrator (existing)**
  - `packages/cli`: interactive Ink UI, non-interactive mode.
  - `packages/core`: tool scheduling, policy engine, message bus, session
    recording, MCP.

- **Desktop Automation Protocol (DAP) — new, stable contract**
  - Tool schemas, Visual DOM schema, selector grammar.
  - Conformance tests.

- **Desktop Automation Service — new (core-owned coordinator)**
  - Resolves selectors, manages snapshots, verification.
  - Calls into drivers through MCP.

- **OS Drivers — separate deployables (recommended as MCP servers)**
  - `mcp-desktop-windows`
  - `mcp-desktop-linux`
  - `mcp-desktop-macos` (strategic)

### 4.2 Execution flow (interactive)

1. User requests: “Click ‘Submit’ in the invoice app.”
2. Model proposes `ui.click({ selector })` tool call.
3. `PolicyEngine.check()` evaluates the call.
4. If `ASK_USER`, UI renders an approval dialog with evidence:
   - resolved element metadata
   - bounding box
   - optional screenshot crop (if allowed)
5. If approved, tool executes via driver.
6. Post-condition verification runs (e.g., dialog closed, button disabled).
7. `ChatRecordingService` records action + evidence.

### 4.3 Execution flow (non-interactive)

1. Tool call is evaluated.
2. If policy returns `ASK_USER`, non-interactive mode must:
   - fail with a clear error, or
   - be configured to auto-deny/auto-allow by policy.
3. Results are printed as JSON or stream-JSON in a deterministic schema.

---

## 5. Packaging & repo strategy

### 5.1 Monorepo now, separable later

Implement drivers as **separate MCP servers** even if they live under
`packages/` initially.

- Tactical advantages:
  - atomic interface + UI + policy changes
  - rapid iteration
- Strategic advantage:
  - clean extraction path into separate repos once protocol stabilizes

### 5.2 Recommended package layout (within monorepo initially)

- `packages/core/src/gui/` (new)
  - `protocol/` (schemas and shared types)
  - `selectors/` (parser + resolver)
  - `service/` (DesktopAutomationService)

- `packages/mcp-desktop-windows/`
  - Node MCP server
  - Rust cdylib(s): UIA, SAP, capture, optional hook

- `packages/mcp-desktop-linux/`
  - Node MCP server
  - Python sidecar (AT-SPI2)
  - injection and capture helpers

- `packages/mcp-desktop-macos/` (optional but recommended)
  - Node MCP server
  - Swift/ObjC or Rust bridge

---

## 6. Tool surface (DAP v1)

All GUI automation is exposed to the LLM as a small, composable set of tools.

### 6.1 Core tools

#### Perception

- `ui.capabilities()`
  - Returns available drivers and capabilities.

- `ui.snapshot({ scope, includeTree, includeScreenshot, includeTextIndex, maxDepth })`
  - Returns `VisualDOMSnapshot`.

- `ui.query({ selector, limit, timeoutMs })`
  - Returns a list of `ElementRef` matches.

- `ui.describe({ element })`
  - Returns a fully expanded node for approvals and debugging.

#### Action

- `ui.click({ target, button, clickCount, modifiers, verify })`
- `ui.type({ text, target, mode, redactInLogs, verify })`
- `ui.key({ keys, target, verify })`
- `ui.scroll({ target, deltaX, deltaY, verify })`
- `ui.focus({ target, verify })`

#### Robustness

- `ui.wait({ until, timeoutMs, pollMs })`
- `ui.assert({ condition })`

#### Escape hatch (high-risk)

- `ui.click_xy({ x, y, coordinateSpace, verify })`

### 6.2 Tool argument types

- `target` is either:
  - `selector: string` (preferred)
  - `elementRef: { snapshotId, elementId }` (when already resolved)

- `verify` is optional post-condition checks (see §10).

### 6.3 Tool result types

Tools return:

- `status: 'success'|'error'`
- `driver: { name, kind, version }`
- `resolvedTarget?: { elementId, bounds, role, name, confidence }`
- `evidence?: { snapshotId, screenshotHash?, cropHash?, redactions? }`
- `verification?: { passed: boolean, details }`

---

## 7. Visual DOM (portable UI state)

### 7.1 VisualDOMSnapshot schema (conceptual)

- `snapshotId: string`
- `timestamp: string`
- `activeApp: { pid, appId?, processName?, title, windowHandle?, bounds }`
- `tree?: ElementNode` (if `includeTree`)
- `textIndex?: Array<{ text, bounds, source, confidence }>`
- `screenshot?: { hash, width, height, encoding }` (policy gated)
- `driver: { kind, name, version, capabilities }`

### 7.2 ElementNode schema (conceptual)

- `id: string` (stable within session)
- `platformIds?: { automationId?, runtimeId?, legacyId?, axId?, atspiPath?, sapId? }`
- `role: string`
- `name?: string`
- `value?: string` (sanitized)
- `bounds?: { x, y, w, h }`
- `states?: { enabled?, focused?, checked?, selected?, expanded? }`
- `patterns?: { invoke?, value?, grid?, selection?, range? }` (Windows)
- `children?: ElementNode[]`

### 7.3 Stable ID strategy

Drivers must populate the best available identifiers:

- Windows UIA:
  - `automationId`, `runtimeId`
  - if classic Win32: `legacyId = GetDlgCtrlID(hwnd)`
- SAP:
  - `sapId` (stable path)
- Linux AT-SPI:
  - `atspiPath` (object path)
- macOS:
  - `axId` if available, else derived path hash

The orchestrator must treat IDs as references and always re-validate before
action.

---

## 8. Selector engine (desktop-grade)

### 8.1 Design goals

- Deterministic where possible.
- Expressive enough for real apps.
- Explicit fallback semantics.
- Debris-resistant across minor UI changes.

### 8.2 Selector syntax (v1)

Selectors are strings, parsed into an AST.

#### Prefixes

- `uia:` Windows UIA
- `sap:` SAP scripting
- `atspi:` Linux AT-SPI
- `ax:` macOS AX
- `ocr:` vision/OCR index
- `any:` orchestrator chooses best available driver

#### Predicates

- `role=Button`
- `name="Submit"`
- `name~="save"` (regex/contains)
- `automationId="SubmitBtn"`
- `legacyId=4096`
- `enabled=true`
- `visible=true`

#### Chaining

- `>>` to scope within matched subtree
- Spatial relations:
  - `right-of`, `left-of`, `above`, `below`, `near`

#### Explicit fallback

- `A ?? B` means: evaluate selector `A`; if no matches, evaluate `B`.

Examples:

- `any:role=Button && name="Submit"`
- `win32:legacyId=4096`
- `sap:"#/app/con/ses/wnd[0]/tbar[0]/btn[11]"`
- `any:text="Invoice Total" >> right-of >> any:role=Edit`
- `uia:automationId="SubmitBtn" ?? ocr:"Submit"`

### 8.3 Matching & confidence

Resolution returns matches with a confidence score based on:

- identity strength (automationId/runtimeId > name-only > OCR)
- bounds stability
- uniqueness (single match vs many)

Policies can use this confidence to require confirmation.

---

## 9. Platform drivers

### 9.1 Windows driver (mcp-desktop-windows)

#### 9.1.1 Structure-first: UI Automation (UIA)

- Language: Rust
- Binding: `windows-rs`
- Key performance requirements:
  - Use `IUIAutomationCacheRequest` for batched property retrieval.
  - Avoid per-property IPC round trips.
- Reliability requirements:
  - Call `IsHungAppWindow(hwnd)` before deep tree operations.
  - Prefer a detached worker model for potentially blocking calls.

#### 9.1.2 Legacy Win32 stabilization

- When `AutomationId` is unstable:
  - fetch element HWND via UIA
  - call `GetDlgCtrlID(hwnd)`
  - expose as `legacyId`

#### 9.1.3 SAP deep integration

- Use SAP GUI Scripting API (COM/IDispatch) to attach:
  - `GetActiveObject("SAPGUI")` via ROT
  - traverse `GuiApplication -> GuiConnection -> GuiSession`
  - operate via `FindById(sapId)`
- Must verify prerequisites:
  - registry keys enabling scripting
  - optionally surface remediation guidance

#### 9.1.4 Vision fallback

- Capture: DXGI Desktop Duplication
- OCR: `Windows.Media.Ocr`
- Provide OCR index in `textIndex` when requested and allowed

#### 9.1.5 Optional enterprise governance: “Safety Airbag”

- Low-level hooks:
  - `SetWindowsHookEx(WH_MOUSE_LL)`
  - optionally `WH_KEYBOARD_LL` (high EDR sensitivity)
- IPC:
  - shared memory ring buffer
  - strict timing budget
- Modes:
  - `OFF` (default)
  - `AUDIT_ONLY` (Raw Input fallback)
  - `ENFORCE` (block/allow)
- Enterprise operations:
  - EV code signing is required for broad enterprise coexistence.
  - allowlisting via AppLocker publisher rules.

### 9.2 Linux driver (mcp-desktop-linux)

#### 9.2.1 Structure-first: AT-SPI2

- Use DBus via a sidecar process.
- Recommended: Python `pyatspi` for fast iteration and ecosystem maturity.

#### 9.2.2 Input injection

- X11: XTest / xdotool
- Wayland:
  - capability gated
  - prefer portals / compositor-supported injection
  - treat “inject input” as requiring explicit user consent

#### 9.2.3 Capture

- PipeWire / portals (Wayland-safe)
- OCR is optional and should be policy-gated

### 9.3 macOS driver (strategic)

- Structure: AXUIElement
- Input: CGEventPost
- Capture: ScreenCaptureKit
- Permissions:
  - Accessibility + Screen Recording are mandatory and must be explicitly
    requested.

---

## 10. Robustness: wait/assert/verification

### 10.1 Pre-action checks (always)

Before executing any action:

- Re-resolve selector to current snapshot.
- Confirm target is still present, enabled, visible.
- If bounds changed significantly, downgrade confidence and likely request
  approval.

### 10.2 Post-action verification (recommended)

`verify` can include:

- `uiState`: element now disabled/checked/changed value
- `window`: title changed, dialog appeared/disappeared
- `text`: certain visible text exists

If verification fails:

- capture a new snapshot
- emit a structured failure
- never “guess-click” repeatedly

---

## 11. Governance model (policy + approvals)

### 11.1 Policy is the default governor

Every GUI tool call is evaluated by `PolicyEngine`.

Policy can match:

- tool name (`ui.click`, `ui.type`, `ui.click_xy`)
- args patterns (selectors, target app/process name)
- confidence tier (structure vs OCR)

### 11.2 Risk scoring (recommended)

Compute risk based on:

- action type: coordinate click > click > type > focus
- app classification: SAP/finance/admin consoles are higher risk
- selection method: OCR > name-only > automationId/runtimeId
- destructive keywords: Delete/Remove/Format/Submit/Pay

Risk maps to:

- low: auto-allow (if user enabled GUI automation)
- medium: ask-user
- high: ask-user with strong evidence
- prohibited: deny unless explicitly allowlisted

### 11.3 Approval UX (interactive)

When `ASK_USER`:

- show action summary
- show resolved element metadata (role, name, bounds)
- show evidence:
  - structure details always
  - screenshot crop only if allowed
- allow: once / session / app scope
- deny with reason

### 11.4 Non-interactive behavior

In non-interactive mode:

- if policy results in `ASK_USER`, execution must fail fast with a clear error
  and exit code unless user configured a strict policy default.

---

## 12. Privacy & data handling

### 12.1 Screenshots

- Off by default.
- Only captured if:
  - required for OCR/vision fallback
  - policy allows
  - optional redaction rules applied

### 12.2 Redaction

- `ui.type` supports `redactInLogs=true`.
- OCR results should support masking patterns (emails, SSNs) depending on user
  policy.

### 12.3 Storage

- Session logs already live under `~/.gemini/tmp/<project_hash>/...`.
- GUI evidence should store hashes and optionally encrypted blobs, configurable
  by policy.

---

## 13. Observability & audit trail integration

### 13.1 Session recording

Record in `ChatRecordingService` tool call records:

- selector
- resolved target metadata
- driver kind
- confidence
- evidence hashes
- verification outcome

### 13.2 Telemetry (optional)

- Count: UI snapshots, clicks, OCR fallbacks, approvals, denials.
- Avoid logging screenshot contents.

---

## 14. Integration with existing TerminaI systems

### 14.1 Tool system

- GUI actions are tools (built-in or MCP).
- Tool calls pass through `CoreToolScheduler` and are policy mediated via
  `MessageBus`.

### 14.2 Extensions

- Extensions can provide:
  - app-specific selector libraries
  - policy bundles
  - additional MCP servers (Citrix runtime, internal apps)

### 14.3 Web remote / A2A

- Web remote can expose:
  - snapshots (redacted)
  - pending approvals
  - step-by-step trace

---

## 15. Implementation plan (phased)

### Phase 1 (MVP, fastest reliable demo)

- Linux AT-SPI2 snapshot + click + focus + type
- Core tool schemas and basic selector parsing
- Policy gating + approval UI + session recording fields

### Phase 2 (Windows structure-first)

- Rust UIA snapshot with cache requests
- click/type/focus/wait/assert
- GetDlgCtrlID stabilization

### Phase 3 (SAP + vision fallback)

- SAP attach + FindById actions
- Windows capture + OCR index
- explicit selector fallback (`??`) and confidence-driven policy

### Phase 4 (Enterprise hard governance)

- optional Safety Airbag hook pipeline
- signing + allowlisting playbooks
- hardened deployment documentation

---

## 16. Open questions (to resolve during implementation)

- Exact selector grammar v1: how much Playwright-like syntax do we want vs a
  stricter JSON selector?
- Evidence storage policy: hashes-only vs encrypted blobs.
- macOS timeline and whether to ship as core or extension.

---

## 17. Summary

This architecture extends TerminaI into GUI automation without compromising its
core promise:

- deterministic-first execution
- policy gating at every step
- full audit trail
- modular drivers via MCP

It also explicitly preserves an enterprise growth path:

- SAP + legacy Win32 stability
- optional enforcement-grade input interception
- operational compatibility with EDR/allowlisting practices
