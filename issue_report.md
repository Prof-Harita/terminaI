# Issue Report: Crash during "cleanup downloads" (AttributeError: ObjectTableLabels.TRANSIT)

## 1. Issue Description

**Summary:**
When a user instructs the agent to "cleanup my downloads folder", the agent initiates a cleanup action that crashes with a Python `AttributeError`.

**Observed Behavior:**
The agent attempts to execute a Python script but fails immediately. The user sees a traceback indicating a missing attribute.

**Traceback:**
```
AttributeError: type object 'ObjectTableLabels' has no attribute 'TRANSIT'
  File "apts/action/cleanup.py", line <line_number>, in <module>
    ...
```

**Context:**
The crash occurs during the execution of the `apts.action.cleanup` module. This module is attempting to access a constant or enumeration member named `TRANSIT` on the `ObjectTableLabels` class.

## 2. Code-Specific Analysis

**Root Cause:**
The `ObjectTableLabels` class (likely an enumeration or configuration class) does not define the attribute `TRANSIT`, but the consumer code in `apts/action/cleanup.py` expects it to exist. This indicates a version mismatch or a breaking change in the internal `apts` library where `TRANSIT` was either removed, renamed, or never added to the version currently deployed.

**Location of Fault:**
The error originates in `apts/action/cleanup.py`.

**Environment Context:**
The `apts` (likely "Agent Python Tool Set" or similar) package is **not present in the public `terminaI` repository**. It is identified as a pre-installed Python library provided by the agent's execution environment, specifically the sandbox Docker image:
- **Docker Image:** `us-docker.pkg.dev/gemini-code-dev/gemini-cli/sandbox:0.26.0` (referenced in `packages/cli/package.json`).

Since the code resides in the binary/image artifact and not the source repository, this issue cannot be fixed by modifying the code in this repository directly. It requires an update to the sandbox image generation process or the upstream `apts` library.

## 3. Proposed Fixes

### A. Immediate Fix (Sandbox Update)
The maintainers of the `apts` library need to ensure compatibility between `apts.action.cleanup` and `apts.model.ObjectTableLabels` (or wherever the class is defined).
1.  **If `TRANSIT` is missing:** Add `TRANSIT` to `ObjectTableLabels`.
    ```python
    class ObjectTableLabels:
        # ...
        TRANSIT = "transit" # Example value
    ```
2.  **If `TRANSIT` was renamed:** Update `apts/action/cleanup.py` to use the new name.

### B. Repository-Side Workaround (If applicable)
If `apts` is fetched dynamically or can be monkey-patched, a preamble script could be injected into the REPL session before the cleanup action runs:
```python
import apts.model # Adjust import based on actual structure
if not hasattr(apts.model.ObjectTableLabels, 'TRANSIT'):
    apts.model.ObjectTableLabels.TRANSIT = 'transit'
```
*Note: This is brittle and requires precise knowledge of the package structure which is currently hidden.*

### C. Recommendation (Strategic)
See the detailed architectural recommendation below to move away from the upstream sandbox entirely.

---

## 4. Recommended Solution: Architecture for Custom TerminAI Sandbox

To permanently resolve this class of issues (dependency conflicts in opaque binary artifacts) and align with TerminAI's "Governed Autonomy" mission, we must replace the upstream `gemini-cli/sandbox` with a self-managed `terminai/sandbox` image.

### Goal
Establish a sovereign build pipeline for the execution sandbox, allowing full control over installed libraries (`apts`), Python versions, and security policies.

### Proposed Architecture

#### 1. Repository Structure
Create a new package workspace for the sandbox definition:
```
packages/
└── sandbox/
    ├── src/
    │   └── apts/              # Re-implementation or fork of the Agent Python Tool Set
    │       ├── __init__.py
    │       ├── model.py       # Define ObjectTableLabels here (with TRANSIT)
    │       └── action/
    │           └── cleanup.py # The logic currently failing
    ├── Dockerfile             # The transparent blueprint
    ├── requirements.txt       # Explicit dependency locking
    └── package.json           # Scripts for build/publish
```

#### 2. The Dockerfile Blueprint
We stop inheriting from the opaque Google image and build from a standard, trusted base (e.g., `python:3.11-slim` or `mcr.microsoft.com/devcontainers/python`).

```dockerfile
# packages/sandbox/Dockerfile
FROM python:3.11-slim

# 1. Install System Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ripgrep \
    fzf \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup TerminAI User (Safety)
RUN useradd -m -s /bin/bash terminai
WORKDIR /home/terminai
USER terminai

# 3. Install Python Dependencies
COPY --chown=terminai:terminai requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Install Internal Tooling (APTS)
# This is where we FIX the bug. We copy our own source code.
COPY --chown=terminai:terminai src/apts /home/terminai/apts
ENV PYTHONPATH="/home/terminai"

# 5. Entrypoint
CMD ["/bin/bash"]
```

#### 3. Migration Strategy (The "apts" Library)
Since `apts` is currently closed-source in the upstream image, we have two paths:

*   **Path A (Clean Room):** Re-implement the `cleanup` logic using standard Python libraries (`os`, `shutil`, `pathlib`) within our new `packages/sandbox/src/apts` directory. This is safer and avoids licensing issues.
*   **Path B (Extraction):** Temporarily run the upstream container, inspect the `apts` source code (it is likely interpreted Python), and port relevant parts to our repository, respecting the Apache 2.0 license.

**For the `TRANSIT` bug:**
In our new `packages/sandbox/src/apts/model.py`, we explicitly define:
```python
class ObjectTableLabels:
    TRANSIT = "TRANSIT"
    # ... other labels identified during reverse engineering
```

#### 4. Build & Release Pipeline
Integrate with the existing GitHub Actions workflows:

1.  **Build:** Create a `docker build` step in the CI pipeline triggered on changes to `packages/sandbox/**`.
2.  **Publish:** Push the resulting image to GitHub Container Registry (GHCR):
    *   `ghcr.io/prof-harita/terminai/sandbox:latest`
    *   `ghcr.io/prof-harita/terminai/sandbox:0.27.0`

#### 5. Configuration Update
Finally, point the CLI to the new sovereign image in `packages/cli/package.json`:

```diff
  "config": {
-   "sandboxImageUri": "us-docker.pkg.dev/gemini-code-dev/gemini-cli/sandbox:0.26.0"
+   "sandboxImageUri": "ghcr.io/prof-harita/terminai/sandbox:0.27.0"
  },
```

### Benefits
1.  **Sovereignty:** We are no longer blocked by upstream release cycles.
2.  **Stability:** We control the environment. If a library breaks, we pin the version in `requirements.txt`.
3.  **Security:** We know exactly what binary code is running in the user's sandbox (no hidden malware or telemetry).
4.  **Debuggability:** The source code for the cleanup tools is now in the monorepo, searchable and editable by developers.
