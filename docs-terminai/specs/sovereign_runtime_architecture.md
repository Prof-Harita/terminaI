# Sovereign Runtime Architecture

**Target:** Senior/Principal Engineer (Systems & Product Focus)
**Goal:** Architect and implement a robust, multi-tiered execution environment ("Sovereign Runtime") that guarantees operational reliability for non-technical users ("Laymen") while maintaining strict governance and security for power users.

---

## 1. Why

### The Reality Gap
TerminAI aspires to be an "Autonomous System Operator" accessible to everyone, from DevOps experts to non-technical users. However, the current execution model is "Developer Centric," relying heavily on an upstream Docker image (`gemini-cli/sandbox`) for safety and tooling.

### The Crash
A recent incident (`AttributeError: ObjectTableLabels.TRANSIT`) highlighted a critical failure mode:
1.  A user on Windows (without Docker) fell back to host execution.
2.  The system attempted to run a Python script requiring the `apts` library.
3.  `apts` exists in the upstream Docker image but is **missing** on the user's host machine.
4.  The result: A hard crash instead of a graceful fallback or self-repair.

### The Objective
We must shift from "You need Docker" to "I will handle the environment for you." The Sovereign Runtime must:
1.  **Own the Stack:** Replace opaque upstream dependencies with TerminAI-owned, versioned packages (`T-APTS`).
2.  **Adapt to the User:** Automatically select the best safe execution mode (Docker → Podman → Managed Local Venv).
3.  **Bootstrap Itself:** If dependencies are missing, install them automatically (Self-Healing).

---

## 2. Options and Evaluation

We evaluated three approaches for handling execution environments.

### Option A: "Fail Closed" (Docker Required)
*   **Strategy:** Require Docker or Podman for *any* operation.
*   **Pros:** High isolation, guaranteed environment consistency, high security.
*   **Cons:** Extremely high friction. Excludes the majority of non-technical Windows/macOS users.
*   **Verdict:** **Rejected**. TerminAI cannot be a consumer product if it requires Docker installation.

### Option B: "Prompt User" (Manual Intervention)
*   **Strategy:** Detect missing environment/dependencies and prompt: "Missing libraries. Install them now? [Y/n]".
*   **Pros:** User awareness, consent.
*   **Cons:** Adds friction to every new setup. Users may not understand *what* they are installing. prone to user error ("I clicked No").
*   **Verdict:** **Rejected**. The "System Operator" should fix the system, not ask the user how to fix the tool itself.

### Option C: "Auto-Magic" (Sovereign Runtime)
*   **Strategy:** Automatically detect the best available runtime. If Docker is missing, silently create and manage a local secure environment (Tier 2) without bothering the user.
*   **Pros:** "It just works." Zero friction. Seamless fallback. High reliability.
*   **Cons:** Increased complexity in the CLI to manage environments. Security nuances of running on the host (mitigated by Policy Engine).
*   **Verdict:** **Selected**. This aligns with the vision of an autonomous operator.

---

## 3. Detailed Architecture

The Sovereign Runtime utilizes a **Three-Tiered Execution Strategy** to ensure coverage for all users.

### Tier 1: The Sovereign Sandbox (Gold Standard)
*   **Technology:** Docker / Podman Container.
*   **Image:** `ghcr.io/prof-harita/terminai/sandbox:X.Y.Z` (Owned by this repo).
*   **Build Source:** `packages/sandbox-image/`.
*   **Contents:**
    *   Hardened Linux (Debian Slim).
    *   Python 3.11+.
    *   `terminai-apts` (pre-installed).
*   **Target User:** Developers, Power Users, Enterprise, CI/CD.
*   **Behavior:** The `SandboxOrchestrator` pulls this image and executes tools inside it.

### Tier 2: The Managed Host Shim (The Layman Fallback)
*   **Technology:** Managed Local Python Virtual Environment (`~/.terminai/runtime/venv`).
*   **Mechanism:**
    1.  **Detection:** `SandboxManager` detects that Docker is unavailable.
    2.  **Bootstrapping:**
        *   Checks for system `python3` (or `python` on Windows).
        *   Creates a persistent venv at `~/.terminai/runtime/venv` (if missing).
        *   Checks if `terminai-apts` is installed and matches the CLI version.
        *   If missing/mismatch: `pip install terminai-apts==<version>` into this venv.
    3.  **Execution:** `PersistentShell` is spawned using the *python executable inside this venv*.
*   **Target User:** Windows/Mac users without Docker.
*   **Why:** Prevents `ImportError` and `AttributeError` by guaranteeing `T-APTS` presence.
*   **Shim Layer:** The environment injects a shim so `import apts` redirects to `terminai_apts` (Legacy Compatibility).

### Tier 3: The Embedded Runtime (Future/Ideal)
*   **Technology:** PyOxidizer / Bundled Python.
*   **Target:** Users with *no* Python installed at all.
*   **Note:** Out of scope for this immediate sprint, but the architecture allows `SandboxManager` to point to a bundled binary in the future.

### Component: T-APTS (TerminAI Python Tool Set)
*   **Location:** `packages/terminai-apts/`
*   **Purpose:** Replaces the opaque upstream `apts` library.
*   **Structure:**
    *   `terminai_apts.model`: Defines data contracts (e.g., `ObjectTableLabels`).
    *   `terminai_apts.action`: Implements clean-room logic (e.g., `cleanup.py`).
*   **Distribution:** Published to PyPI as `terminai-apts`.

### Component: SandboxManager (`packages/core`)
*   **Responsibilities:**
    *   `ensureRuntime()`: Decides Tier 1 vs Tier 2.
    *   `ensureLocalRuntime()`: Manages the Tier 2 venv (creation, pip install).
    *   `getPythonExecutable()`: Returns the path to the correct python binary (Docker path or Local Venv path).

---

## 4. Detailed Risk Analysis

### Risk 1: Host Security & Isolation
*   **Risk:** Running code on the host (Tier 2) is less secure than Docker. A malicious LLM suggestion could harm the user's files.
*   **Mitigation:**
    *   **Audit Logging:** All Tier 2 executions are explicitly logged with `domain="host"`.
    *   **Policy Engine:** The Approval Ladder can enforce higher scrutiny (Level B/C) when `runtime.is_sandboxed` is false.
    *   **User Warning:** On first run in Tier 2, a dismissible warning advises installing Docker for better security.

### Risk 2: Dependency Drift (Tier 1 vs Tier 2)
*   **Risk:** The Python code behaves differently in the Docker image vs the Local Venv due to library version mismatches.
*   **Mitigation:**
    *   **Strict Versioning:** The CLI `package.json` pins a specific version of `terminai-apts`.
    *   **Runtime Check:** `SandboxManager` verifies `terminai-apts.__version__` matches the pinned requirement on every boot. If not, it triggers a `pip install`.

### Risk 3: Connectivity & Pip Failures
*   **Risk:** The user is offline or behind a firewall during the first run of Tier 2, preventing `pip install terminai-apts`.
*   **Mitigation:**
    *   **Graceful Failure:** Catch `pip` errors and return a human-readable error: "Internet connection required for initial setup."
    *   **Future Optimization:** Bundle the `terminai-apts` wheel file inside the CLI package to allow offline installation.

### Risk 4: System Python Absence
*   **Risk:** The user has no Python installed (Tier 2 fails).
*   **Mitigation:**
    *   **Clear Error:** "Python 3.11+ is required but not found. Please install it from python.org."
    *   **Tier 3 (Future):** Solve this by bundling a standalone Python runtime.

---

## 5. Ease of Implementation

The implementation is broken down into 3 phases to ensure stability.

### Phase 1: The T-APTS Library (Foundation)
*   **Goal:** Break dependency on opaque `apts`.
*   **Steps:**
    1.  Create `packages/terminai-apts/`.
    2.  Implement `ObjectTableLabels` and cleanup logic.
    3.  Set up CI to publish to PyPI.
*   **Difficulty:** **Low**. Pure Python coding.

### Phase 2: The Sovereign Sandbox Image (Tier 1)
*   **Goal:** Own the Docker container.
*   **Steps:**
    1.  Update `packages/sandbox-image/Dockerfile`.
    2.  Add `pip install terminai-apts`.
    3.  Verify contract tests.
*   **Difficulty:** **Low**. Standard Dockerfile updates.

### Phase 3: The "Local Shim" Logic (Tier 2)
*   **Goal:** Make "Host Mode" safe.
*   **Steps:**
    1.  Modify `PersistentShell.ts` to support a persistent `venvPath`.
    2.  Implement `SandboxManager` in `@terminai/core`.
    3.  Implement `ensureLocalRuntime()` with `pip` logic.
    4.  Update `start_sandbox` (or equivalent caller) to use `SandboxManager`.
*   **Difficulty:** **Medium**. Requires careful error handling for cross-platform `pip` execution and path management.

---

## Conclusion
This architecture transforms TerminAI from a fragile, developer-only tool into a robust Consumer System Operator. By owning the full stack—from the Python library (`T-APTS`) to the execution environment (`SandboxManager`)—we guarantee that if the user can run the CLI, they can run the agents.

## 6. Platform Compatibility & User Experience

### High-Level Summary (ELI5)
**How it works on different computers:**

*   **Option A: The "Lunchbox" (Docker Sandbox)**
    *   **What it is:** A pre-sealed container.
    *   **Does it have Python?** Yes, pre-installed inside.
    *   **Does it have Packages?** Yes, pre-installed inside.
    *   **Who uses it:** Linux users, Mac users, and Windows users who have Docker installed.
    *   **Experience:** You download the box, and it just runs. Perfect isolation.

*   **Option B: The "Home Kitchen" (Managed Host Shim)**
    *   **What it is:** A managed setup directly on your computer.
    *   **Does it have Python?** No, we use *your* installed Python. (If you don't have it, we ask you to get it).
    *   **Does it have Packages?** We automatically download and install them into a private folder (`~/.terminai/runtime/venv`) so we don't mess up your other work.
    *   **Who uses it:** Windows users (mostly) or anyone without Docker.
    *   **Experience:** TerminAI sees you don't have Docker. It checks for Python. It creates a safe workspace. It installs the tools. It runs the task.

### OS Compatibility Matrix

| OS | Default Strategy | Requirements | Package Installation |
| :--- | :--- | :--- | :--- |
| **Linux** | **Tier 1 (Sandbox)** | Docker / Podman | **Pre-packaged** (Inside Image) |
| **macOS** | **Tier 1 (Sandbox)** | Docker / OrbStack | **Pre-packaged** (Inside Image) |
| **Windows** | **Tier 2 (Shim)** | Python 3.10+ | **Auto-installed** (Local Venv) |
| **No Docker** | **Tier 2 (Shim)** | Python 3.10+ | **Auto-installed** (Local Venv) |

### Key Distinction
*   **Tier 1 (Sandbox)** is **Immutable**. The environment is built by us, signed, and shipped. It never changes on your machine.
*   **Tier 2 (Shim)** is **Managed Mutable**. We create it on your machine, but we manage the versions to match our "Gold Standard" as closely as possible.

---

## 7. Philosophy: Core Environment vs. Dynamic Capabilities

Should we stuff the image with every tool (AGI style) or keep it lean and let it build?

### The Decision: "Agentic Bootstrap"
We choose **Lean Core + Dynamic Expansion**. We do *not* try to prepackage `ffmpeg`, `gcloud`, `aws`, `k8s`, etc., into the core image. This leads to "Bloatware hell" and infinite maintenance.

Instead, we provide the **Core Capabilities** that allow the agent to *bootstrap* the rest.

### The Core Environment (Survival Kit)
This is what MUST be in every Tier 1 and Tier 2 runtime:
1.  **Python 3.11+**: The brain's execution runtime.
2.  **T-APTS**: The standard library for common tasks (fs, text, logic).
3.  **Package Manager (`pip` / `uv`)**: The ability to get new Python tools.
4.  **System Package Manager Shim**: A way to request system tools (e.g., `apt-get` in Docker, `brew` on Mac, `winget` on Windows).

### Dynamic Capabilities (Just-in-Time)
When the user asks: "Convert this video to gif", the Agent follows this flow:
1.  **Check:** "Do I have `ffmpeg`?" (`shutil.which('ffmpeg')`)
2.  **Reason:** "No. I am in Tier 1 (Debian). I should install it."
3.  **Action:** "Running `sudo apt-get install -y ffmpeg`."
4.  **Execute:** "Converting video..."

### Guardrails for Dynamic Build
To prevent the agent from breaking the environment:
*   **Ephemeral by Default (Tier 1):** In Docker, installations are lost on restart. This keeps the environment clean.
*   **User-Scoped (Tier 2):** On Host, we prefer installing to user-local paths or asking for permission before global installs.
*   **Policy Engine:**
    *   `apt-get install` -> **Level B** (Requires Approval).
    *   `pip install` -> **Level A** (Safe if in venv).

### Summary
*   **Deterministic:** The **Core Runtime** (Python + T-APTS). We guarantee this is always there.
*   **Dynamic:** The **Tooling Layer**. The agent builds its own workshop based on the task at hand.
