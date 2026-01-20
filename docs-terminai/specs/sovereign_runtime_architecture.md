# Sovereign Runtime Architecture: Detailed Study & Specification

**Status:** Draft
**Author:** Principal Engineer (Agentic Systems)
**Date:** 2026-01-20

## 1. Executive Summary

TerminAI's mission is to serve as an **Autonomous System Operator**. To fulfill this, it must guarantee reliable execution of tools (like `apts`) regardless of the user's local environment (Docker vs. No Docker, Linux vs. Windows).

The recent crash (`AttributeError: ObjectTableLabels.TRANSIT`) revealed a critical weakness: our dependency on an opaque, upstream Docker image (`gemini-cli/sandbox`) created a "works on my machine" failure mode for end users.

This document defines the **Sovereign Runtime Architecture**. It replaces the "Developer-Centric" model (where Docker is assumed) with a **Three-Tiered Execution Strategy** that ensures parity and reliability for all users.

### Key Decisions
1.  **Own the Stack:** We will replace upstream binaries with `T-APTS` (TerminAI Python Tool Set), a versioned, repo-owned Python package.
2.  **Hybrid Execution:** We will support both **Sovereign Sandbox** (Docker/Podman) and **Managed Host Shim** (Local Venv).
3.  **Auto-Magic Fallback:** If Docker is missing, the system will silently but safely provision a local environment, preventing crashes.

---

## 2. Impact Analysis & Trade-offs

A "Thorough Study" was conducted to evaluate the risks of this architectural shift on existing subsystems (MCP, Extensions, A2A).

### 2.1. Impact on Model Context Protocol (MCP)
*   **Current State:** MCP servers are launched via `StdioClientTransport` (child processes) or connected via HTTP/SSE.
*   **Analysis:** MCP servers run independently of the `ComputerSessionManager` / `PersistentShell`. They typically execute binaries (`node`, `python`, `docker`) directly from the host PATH.
*   **Risk:** **Low.** The Sovereign Runtime changes focuses on the *Agent's* execution environment (REPL, Shell Tool), not the MCP server hosting environment.
*   **Caveat:** If an MCP server *itself* relies on `apts` (unlikely, as `apts` is an internal agent tool), it would need to be updated to use `terminai-apts`.

### 2.2. Impact on Extensions & A2A
*   **Current State:** Extensions are configuration wrappers. A2A is a control plane.
*   **Analysis:** Neither subsystem calls `PersistentShell` directly. They rely on the core `ToolRegistry` and `ComputerSessionManager`.
*   **Risk:** **Low.** As long as `ComputerSessionManager` maintains its API contract, upstream consumers remain unaffected.

### 2.3. The "Managed Host" Risk (Security)
*   **Concern:** Running code on the Host (Tier 2) is inherently less secure than Docker (Tier 1).
*   **Mitigation:**
    *   **Governance:** The Policy Engine (Approval Ladder) remains the primary defense. "Outcome: Irreversible" actions still require approval, regardless of where they run.
    *   **Transparency:** The Audit Log must explicitly tag execution events with `domain="host"` vs `domain="sandbox"` so users know *where* code ran.
    *   **Isolation:** The "Managed Venv" protects the user's *system python* from pollution, even if it doesn't protect the file system.

---

## 3. Detailed Architecture

### 3.1. The Three Tiers

| Tier | Name | Technology | Target User | Pros | Cons |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Sovereign Sandbox** | Docker / Podman | Devs, Enterprise | Max Security, Parity | Requires Docker installed |
| **2** | **Managed Host Shim** | Local Venv (`~/.terminai/venv`) | Windows/Mac Laymen | Zero-Config, Reliable | Low Isolation |
| **3** | **Embedded Runtime** | PyOxidizer | (Future) | Works without Python | High Build Complexity |

### 3.2. Component Design

#### A. `T-APTS` (TerminAI Python Tool Set)
A standard Python package located in `packages/terminai-apts/`.
*   **Purpose:** Provides the "Standard Library" for TerminAI agents (cleanup, file ops, data transform).
*   **Structure:**
    ```
    terminai_apts/
    ├── __init__.py
    ├── model.py          # Defines ObjectTableLabels (TRANSIT, etc.)
    └── action/
        └── cleanup.py    # The logic
    ```
*   **Distribution:** Published to PyPI as `terminai-apts`.

#### B. `Sovereign Sandbox` Image
A Docker image built from `packages/sandbox-image/`.
*   **Base:** `python:3.11-slim-bookworm`
*   **Content:** `pip install terminai-apts`
*   **Build:** GitHub Actions -> GHCR (`ghcr.io/prof-harita/terminai/sandbox`)

#### C. `RuntimeManager` (New Core Service)
A new service in `packages/core/src/runtime/` responsible for environment selection.

```typescript
class RuntimeManager {
  async getBestStrategy(): Promise<'sandbox' | 'managed-host'> {
    if (await isDockerAvailable()) return 'sandbox';
    return 'managed-host';
  }

  async ensureManagedHostEnvironment(): Promise<string> {
    // 1. Check/Create ~/.terminai/venv
    // 2. Check installed packages
    // 3. pip install terminai-apts if missing
    return venvPath;
  }
}
```

#### D. Updated `PersistentShell.ts`
Modified to support the "Persistent Venv" pattern.

```typescript
// Current
execSync(`python3 -m venv "${this.tempVenvPath}"`); // Ephemeral

// New (Logic Injection)
if (options.venvMode === 'managed') {
   this.venvPath = runtimeManager.getManagedVenvPath();
   // Do NOT delete on exit
} else {
   // Original Ephemeral Logic
}
```

---

## 4. Implementation Roadmap

### Phase 1: The Foundation (T-APTS)
1.  **Create Package:** Initialize `packages/terminai-apts` with `pyproject.toml`.
2.  **Implement Logic:** Port the missing "cleanup" logic and `ObjectTableLabels`.
3.  **Publish:** Set up GH Actions to publish to PyPI.

### Phase 2: The Sovereign Image
1.  **Dockerize:** Create `packages/sandbox-image/Dockerfile` installing `terminai-apts`.
2.  **Pipeline:** Configure `.github/workflows/build-sandbox.yml`.
3.  **Verify:** Manually test `docker run ... python -c "import terminai_apts"`.

### Phase 3: The "Auto-Magic" Runtime
1.  **Core Logic:** Implement `RuntimeManager` in `@terminai/core`.
2.  **Shell Update:** Refactor `PersistentShell` to accept an external venv path.
3.  **Integration:** Update `ReplTool` to ask `RuntimeManager` for the strategy.
    *   If `managed-host`: Ensure venv exists -> Run `PersistentShell` pointing to it.
    *   If `sandbox`: Run `docker run ...`.

### Phase 4: Migration & Cleanup
1.  **Update Config:** Change default `sandboxImageUri` to the new GHCR image.
2.  **Deprecate:** Warn users if they are still using legacy `GEMINI_SANDBOX_IMAGE` overrides.

---

## 5. Security & Governance Specification

### 5.1. Audit Logging
Every execution must log the `runtime_mode`:
```json
{
  "event": "tool.execution",
  "tool": "repl",
  "runtime": {
    "mode": "managed-host",
    "venv": "/Users/alice/.terminai/venv",
    "isolation": "none"
  }
}
```

### 5.2. Policy Gating
The `ActionProfile` passed to the Approval Ladder must include the domain.
*   **Sandbox:** `domain: "container"` (Standard risk)
*   **Host:** `domain: "host"` (High risk)

This allows enterprise policies to say: *"Block all file modifications unless running in a container."*

---

## 6. Success Metrics

1.  **Parity:** Running a script in Docker and in Managed Host yields identical results.
2.  **Resilience:** Uninstalling Docker does not break the agent; it transparently falls back to Host Mode.
3.  **Fix Confirmation:** The "cleanup downloads" command works on a fresh Windows install without Docker.
