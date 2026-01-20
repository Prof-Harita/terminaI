# Principal Engineer Prompt: The Sovereign Runtime Architecture

**Target:** Senior/Principal Engineer (Systems & Product Focus)
**Goal:** Architect and implement a robust, multi-tiered execution environment ("Sovereign Runtime") that guarantees operational reliability for non-technical users ("Laymen") while maintaining strict governance and security for power users.

---

## 1. Context & Problem Statement

### The Vision
TerminAI is not just a coding assistant; it is an **Autonomous System Operator**. Our users range from DevOps experts to non-technical individuals who simply want to "cleanup my downloads" or "fix my wifi."

### The Reality Gap
Currently, TerminAI's execution model is "Developer Centric." It relies heavily on an upstream Docker image (`gemini-cli/sandbox`) for safety and tooling.
- **The Crash:** A recent incident (`AttributeError: ObjectTableLabels.TRANSIT`) occurred because a user on Windows (without Docker) fell back to a host execution mode where the required internal library (`apts`) was missing or mismatched.
- **The UX Failure:** The system silently failed or crashed instead of guiding the user to a working state.
- **The Dependency Risk:** We rely on an opaque Google-provided Docker image containing proprietary/unversioned libraries (`apts`) that we cannot patch.

### The Objective
We must move from "You need Docker" to **"I will handle the environment for you."**
We need a **Sovereign Runtime** that:
1.  **Owns the Stack:** Replaces opaque upstream dependencies with TerminAI-owned, versioned packages (`T-APTS`).
2.  **Adapts to the User:** Automatically selects the best safe execution mode (Docker -> Podman -> Managed Local Venv).
3.  **Bootstraps Itself:** If dependencies are missing, it installs them (e.g., creating a local venv and pip-installing our tools).

---

## 2. Research Findings & Industry Patterns

### Claude Computer Use (Anthropic)
*   **Strategy:** "Reference Implementation via Docker."
*   **Pros:** High isolation, reproducible.
*   **Cons:** High friction. Requires user to install Docker and run a complex command. Not "consumer ready" without a wrapper.

### Open Interpreter
*   **Strategy:** "Batteries Included via Python."
*   **Mechanism:** One-line installers (`curl | bash`) that install Python if missing.
*   **Runtime:** Defaults to running on **Host** (Local) but offers a `--safe_mode` (using Docker/E2B).
*   **Key Insight:** They prioritize *working immediately* (Host) and offer *safety* (Docker) as an option. TerminAI must offer *safety by default* but *reliability as a fallback*.

---

## 3. The Sovereign Runtime Architecture

We propose a **Three-Tiered Execution Strategy** to ensure coverage for all users.

### Tier 1: The Sovereign Sandbox (Gold Standard)
*   **Technology:** Docker / Podman Container.
*   **Image:** `ghcr.io/prof-harita/terminai/sandbox:X.Y.Z` (Built from `packages/sandbox-image/`).
*   **Contents:** Hardened Linux, Python 3.11, `terminai-apts` (pre-installed).
*   **Target User:** Developers, Power Users, Enterprise.

### Tier 2: The Managed Host Shim (The Layman Fallback)
*   **Technology:** Local Python Virtual Environment (`~/.terminai/venv`).
*   **Mechanism:**
    1.  Agent detects "No Docker."
    2.  Agent checks for System Python.
    3.  Agent creates a persistent venv at `~/.terminai/runtime/venv`.
    4.  Agent installs `terminai-apts` from PyPI into this venv.
    5.  Agent executes scripts using this venv.
*   **Target User:** Windows/Mac users without Docker.
*   **Why:** Prevents "ImportError" and "AttributeError" by ensuring our libraries (`T-APTS`) are present even on the host.

### Tier 3: The Embedded Runtime (Future/Ideal)
*   **Technology:** PyOxidizer / Bundled Python.
*   **Target:** Users with *no* Python installed.
*   **Note:** Out of scope for this immediate sprint, but architecture should allow for it.

---

## 4. Implementation Roadmap (The "How")

### Phase 1: The `T-APTS` Library (Foundation)
**Goal:** Break the dependency on the opaque `apts` library.
1.  **Create Package:** `packages/terminai-apts/` (Python package).
2.  **Implement Contracts:**
    *   `model.py`: Define `ObjectTableLabels` with `TRANSIT`, `KEEP`, `DELETE`.
    *   `action/cleanup.py`: Implement the clean-room logic for file operations.
3.  **Publish:** Set up CI to publish this to PyPI (or a private repo) as `terminai-apts`.

### Phase 2: The Sovereign Sandbox Image
**Goal:** Own the Docker container.
1.  **Create Workspace:** `packages/sandbox-image/`.
2.  **Dockerfile:** Base on `python:3.11-slim`.
3.  **Install:** `pip install terminai-apts` (from Phase 1).
4.  **CI:** Build, Sign (Cosign), and Push to GHCR.

### Phase 3: The "Local Shim" Logic (The Fix)
**Goal:** Make "Host Mode" safe.
1.  **Update `PersistentShell.ts`:**
    *   Current: Creates ephemeral venv for *every* session.
    *   New: Check for `~/.terminai/runtime/venv`. If missing, create it.
2.  **Bootstrapping:**
    *   Add a `SandboxManager` class in `packages/core`.
    *   Method `ensureLocalRuntime()`:
        *   Checks `python3 --version`.
        *   Creates venv.
        *   Runs `pip install terminai-apts==<version_matching_cli>`.
3.  **Integration:**
    *   When a tool requests a Python script:
        *   If Docker is available -> Run in Container (Tier 1).
        *   If Docker is missing -> Run in Managed Venv (Tier 2).

---

## 5. Architectural Choices & Trade-offs

| Feature | Option A: "Fail Closed" | Option B: "Prompt User" | Option C: "Auto-Magic" (Selected) |
| :--- | :--- | :--- | :--- |
| **No Docker?** | Crash / Error Message | "Install Docker? [Y/n]" | **Silent fallback to Tier 2 (Managed Venv)** |
| **Missing Libs?** | `ImportError` | "Install libs?" | **Auto-install `terminai-apts` on boot** |
| **Security** | High (Always Sandbox) | Medium (User Consent) | **Nuanced (Sandboxed if possible, Managed if not)** |

**Decision:** We choose **Option C (Auto-Magic)** for the "System Operator" UX.
*   We warn the user: *"Docker not found. Running in Managed Local Mode. For higher security, install Docker."*
*   But we **allow the operation to proceed** safely by ensuring the environment is correct.

---

## 6. Specific Instructions for Principal Engineer

1.  **Review `issue_report.md`:** It contains the specific crash details (`ObjectTableLabels`).
2.  **Start with `T-APTS`:** Do not try to patch the Docker image. Write the Python library first.
3.  **Modify `PersistentShell.ts` carefully:** It currently supports `python`, `node`, `shell`.
    *   Do not break existing functionality.
    *   Add a `runtimeStrategy` option: `'ephemeral' | 'persistent'`.
    *   Use `'persistent'` for the Managed Host mode.
4.  **Security Audit:**
    *   Ensure "Managed Host Mode" is clearly flagged in the Audit Log (`domain="host"`).
    *   The Policy Engine must know we are running on Host to potentially require higher approval (Level B/C).

---

## 7. Success Metrics
1.  **Zero "Missing Dependency" Crashes:** The agent never crashes because `apts` is missing.
2.  **Seamless Fallback:** A user uninstalls Docker, and `terminai` still works (just switches to Host Mode).
3.  **Version Parity:** The Python code running in Docker is identical to the Python code running on Host.
