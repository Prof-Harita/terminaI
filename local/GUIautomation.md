# TerminaI Desktop Automation: The Strategic Manifesto & Technical Architectures

**Version:** 1.1 (Enhanced with Deep Research Findings)  
**Target:** Linux (X11/Wayland) & Windows (Enterprise)  
**Status:** DEFINITIVE SPECIFICATION

---

## Part 1: The Cofounder's Manifesto (Strategy & Relevance)

### 1.1 The "Probabilistic Wall" & The Enterprise Trust Crisis

The AI industry is currently blindly sprinting towards "Universal Computer
Use"—agents that view the screen as a video stream and use vision models to
click coordinates. This approach has hit a hard ceiling: **Reliability**.

- **The Stat:** Best-in-class vision agents (Anthropic/OpenAI) achieve ~38%
  success rates on complex workflows.
- **The Reality:** In an enterprise setting, a 62% failure rate isn't "beta
  software"—it's a liability.
- **The Gap:** Enterprises are desperate to automate legacy workflows (SAP,
  Oracle, Mainframes) but are terrified of "black box" AI that might hallucinate
  a "Delete" click. They need **Governance**, **Auditability**, and
  **Determinism**.

### 1.2 TerminaI's "Trojan Horse" Strategy

We are not building this module just to have a cool feature. We are building it
as a strategic wedge to enter the enterprise market.

- **The Hook (CAC):** "Desktop Automation" is the viral feature that draws
  attention. It's the "Party Trick" that gets us installed on the DevOps
  engineer's machine.
- **The Retention:** Once installed, they discover our Core CLI—which is
  governed, safe, and powerful.
- **The Business Model:** We Open Source the core to build trust (the "License
  to Operate"). We monetize the **Governance Layer** (Cloud Relay, Team Policy,
  Audit Logs) and the **Enterprise Drivers** (SAP, Citrix).

### 1.3 Why "Hybrid" Wins

We reject the False Dichotomy of "Vision vs. Code."

1.  **Vision Only (Anthropic/OpenAI):** Flexible but unreliable & slow (5s
    latency).
2.  **Code Only (RPA/UiPath):** Reliable but brittle & expensive ($10k/seat).
3.  **TerminaI Hybrid (Our Way):**
    - **Tier 1 (Velocity):** Use OS Accessibility APIs (Structure) for 100%
      accuracy and <50ms latency.
    - **Tier 2 (Fallback):** Use Local Vision (OCR/VLM) for "opaque" apps
      (Citrix/Canvas) where Tier 1 fails.
    - **Tier 3 (Governance):** Intercept _every_ input event at the kernel level
      for policy checking before execution.

This architecture allows us to say: **"We are 10x faster than OpenAI, and safer
than UiPath."**

---

## Part 2: Architectural Principles

### 2.1 The "Safety Sandwich" Architecture

The core principle is that the "Brain" (LLM) never touches the "Body" (OS)
directly.

- **Brain:** Generates intent (`Click "Submit"`).
- **Safety Layer (The Airbag):** Intercepts the intent. Checks Policy Engine.
- **Driver:** Executes the action.

### 2.2 The "Visual DOM" (State Management)

Standard agents are stateless amnesiacs; they re-scan the screen every step.

- **TerminaI maintains a `LocalDOM`:** A cached graph of the current window's UI
  tree.
- **Diffing:** We only query the OS for _changes_.
- **Persistence:** We assign stable IDs to elements (hashes of their
  path/properties) so the LLM can reference `id="btn_4096"` reliably across
  frames.

---

## Part 3: Detailed Technical Specification (Linux)

### 3.1 The Linux Stack (X11 & Wayland)

- **Primary Interaction:** `at-spi2` (Assistive Technology Service Provider
  Interface) via `DBus`.
- **Input Injection:**
  - **X11:** `xdotool` / `XTest` extension.
  - **Wayland:** `libei` (Emulated Input) or Compositor-specific protocols
    (GNOME Remote Desktop).
- **Vision Fallback:** `pipewire` for screen capture (works on Wayland & X11).

### 3.2 Linux Component Architecture (`packages/mcp-screen-linux`)

We implement a specialized MCP Server that spawns a "Sidecar" process (Python)
to bridge the messy DBus/GTK world to our Node.js ecosystem.

**The Sidecar (Python):**

- **Library:** `pyatspi` (Standard Linux A11y bindings).
- **Responsibility:**
  1.  Connect to Session Bus.
  2.  Traverse `lregistry.getDesktop(0)` to find the Active Window.
  3.  Dump the UI Tree to JSON (sanitized) for the Policy Engine.
  4.  Expose `click_role("push button", "Submit")` function.

**The IO Bridge:**

- **Stdio JSON-RPC:** Node.js spawns the Python sidecar and communicates via
  Stdin/Stdout.
- **Latency:** < 10ms overhead (negligible).

---

## Part 4: Detailed Technical Specification (Windows)

### 4.1 The Windows Stack

- **Language:** **Rust** (cdylib loaded by Node).
- **Primary Interaction:** **Microsoft UI Automation (UIA)** via `windows-rs`.
- **Legacy Win32 Strategy:** **GetDlgCtrlID** (Win32 API) for retrieving stable
  control IDs from unstable legacy apps.
- **SAP Strategy:** **SAP GUI Scripting API** (COM ISapGuiAuto).
- **Safety Layer:** `SetWindowsHookEx` (Kernel Hook) with **EV Code Signing**
  bypass.

### 4.2 Windows Component Architecture (`packages/mcp-screen-windows`)

**The Rust Driver (`libscreen.dll`):**

- **UIA Module (Reliability):**
  - Direct `IUIAutomation` implementation.
  - **Critical:** Uses `IsHungAppWindow()` check _before_ any UIA call to
    prevent the agent from freezing if the target app hangs.
  - Uses `IUIAutomationCacheRequest` to batch-fetch properties (preventing 100s
    of IPC calls).

- **SAP Module (Deep Integration):**
  - Connects to `rot_get_object("SAPGUI")`.
  - **Prerequisite:** Checks registry `HKEY_LOCAL_MACHINE\...\UserScripting` is
    `1`.
  - Traverses `GuiApplication -> GuiConnection -> GuiSession`.
  - Uses SAP's native stable IDs (`/app/con/ses/...`).

- **Win32 Legacy Module (The "Old App" Fix):**
  - For standard Win32 apps (VB6, MFC) where `AutomationId` is dynamic/unstable:
  - Calls `GetDlgCtrlID(hwnd)` to cure the "Amnesia" problem.
  - This ID is baked into the binary definition (.rc file) and never changes.

- **OCR Fallback (Vision):**
  - Uses `Windows.Media.Ocr` (WinRT) directly.
  - Zero-dependency, hardware-accelerated text extraction.
  - Triggered when UIA returns `CurrentControlType == Pane` (opaque).

### 4.3 Windows "Hook" Implementation (The Governance Enforcer)

This is the critical differentiation.

1.  **Install:** `SetWindowsHookEx(WH_MOUSE_LL, callback)`.
2.  **Callback:** A high-performance Rust function (**Must complete in <300ms**
    or OS kills it).
3.  **Architecture:**
    - **Ring Buffer:** Rust writes event to Shared Memory.
    - **Node.js:** Reads Shared Memory, checks Policy, writes Verdict.
    - **Rust:** Reads Verdict -> `CallNextHookEx` (Allow) or `return 1` (Block).
4.  **Security Requirement:** The DLL must be signed with an **EV (Extended
    Validation) Code Signing Certificate** to interact with
    AppLocker/SmartScreen in enterprise environments.

---

## Part 5: "The Unifier" (Unified Abstraction Layer)

### 5.1 The `ScreenDriver` Interface

We abstract the OS complexity behind a single TypeScript interface for the rest
of TerminaI.

```typescript
interface ScreenDriver {
  // Perception
  snapshot(): Promise<VisualDOM>; // Returns tree of Elements

  // Action
  click(elementId: string): Promise<void>;
  type(text: string): Promise<void>;

  // Governance
  intercept(policy: PolicyFunction): void;
}

interface VisualDOM {
  root: Element;
  screenshot?: Buffer; // Only if fallback triggered
}
```

### 5.2 The Selector Syntax Spec

We unify Linux/Windows/SAP querying into one text format for the LLM.

- `[app="notepad"] > button[name="Save"]` (Generic UIA/AT-SPI)
- `sap="#/app/con/ses/wnd[0]/tbar[0]/btn[11]"` (Direct SAP ID)
- `win32="#4096"` (Legacy Resource ID via GetDlgCtrlID)
- `ocr="Invoice Total" >> right-of >> text` (Spatial Vision Query)

---

## Part 6: Implementation Plan

### Phase 1: The Linux MVP (Week 1)

- **Goal:** Ship a working MCP server that controls `xdotool` + Python `atspi`
  reader.
- **Why:** Fastest path to "It works."
- **Deliverable:** `packages/mcp-screen-linux`

### Phase 2: The Windows "Enterprise Core" (Month 2)

- **Goal:** Build the Rust driver foundation.
- **Focus:** `windows-rs` setup, UIA tree dumping, `GetDlgCtrlID`
  implementation.
- **Why:** Unlock the massive Windows user base.

### Phase 3: The "Safety Airbag" (Quarter 2)

- **Goal:** Implement the Kernel Hooks.
- **Focus:** Signing binaries (EV Certificate), AppLocker bypass strategies.
- **Why:** This is the feature that lets us sell to the Fortune 500.

---

**This is the spec. This is how we win.**
