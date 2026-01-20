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

## 4. The Sovereign Sandbox Specification

To fulfill TerminAI's mission of "Sovereign Autonomy" and "System Operation" (as defined in `docs-terminai/why-terminai.md`), we must eliminate reliance on opaque upstream binaries. The following is a comprehensive architectural specification for the new `terminai/sandbox`.

### 4.1. Design Philosophy
*   **Sovereignty:** No binary blobs. Every line of code inside the container must be buildable from `packages/sandbox-image/`.
*   **Transparency:** The `Dockerfile` serves as the public audit log of the execution environment.
*   **Minimalism:** Only install what is necessary for "System Operation" (Python, Shell, core utils).
*   **Security:** Non-root execution, read-only root FS compatibility, signed images.

### 4.2. Repository Structure
We will establish a new workspace `packages/sandbox-image` to house the build artifacts.

```text
packages/sandbox-image/
├── src/
│   └── apts/                  # The TerminAI Python Tool Set (replaces upstream)
│       ├── __init__.py
│       ├── model.py           # Defines data models & constants (Fixes TRANSIT bug)
│       └── action/
│           └── cleanup.py     # Clean room implementation of cleanup logic
├── bin/                       # Custom shell scripts/wrappers
├── Dockerfile                 # The master blueprint
├── requirements.txt           # Python dependencies (pinned with hashes)
├── package.json               # Build scripts & versioning
└── README.md                  # Documentation
```

### 4.3. The Dockerfile Blueprint
We will use `python:3.11-slim-bookworm` as the base for a balance of modern Python features and stable Debian libraries.

```dockerfile
# packages/sandbox-image/Dockerfile
FROM python:3.11-slim-bookworm

# Metadata for Auditability
LABEL org.opencontainers.image.source="https://github.com/Prof-Harita/terminaI"
LABEL org.opencontainers.image.description="TerminAI Sovereign Execution Sandbox"
LABEL org.opencontainers.image.licenses="Apache-2.0"

# 1. System Dependencies (The "Kitchen Stocking")
# Selected to support the "System Operator" persona (network debug, file ops, processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core Utilities
    git \
    curl \
    wget \
    jq \
    zip \
    unzip \
    tree \
    # Search & Text Processing
    ripgrep \
    fzf \
    # System Diagnostics (Pillar II support)
    procps \
    lsof \
    htop \
    net-tools \
    iputils-ping \
    dnsutils \
    netcat-openbsd \
    # Build Essentials (for compilation if needed)
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Python Environment Setup
# Pin pip version for reproducibility
RUN pip install --no-cache-dir --upgrade pip==23.3.1

# 3. Security Hardening: Create Non-Root User
RUN useradd -m -s /bin/bash -u 1000 terminai

# 4. Install Python Dependencies
WORKDIR /app
COPY requirements.txt .
# Example requirements: pandas, numpy, requests, beautifulsoup4
RUN pip install --no-cache-dir -r requirements.txt

# 5. Install TerminAI's "APTS" (Agent Python Tool Set)
# This explicitly fixes the upstream crash by using our own source
COPY --chown=terminai:terminai src/apts /usr/local/lib/python3.11/site-packages/apts

# 6. Environment Configuration
# Ensure the user cannot write to system paths, only workspace
WORKDIR /workspace
RUN chown terminai:terminai /workspace

# Switch to non-root user
USER terminai

# Set strict environment variables
ENV PYTHONPATH="/usr/local/lib/python3.11/site-packages"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV HOME="/workspace"

# 7. Entrypoint
CMD ["/bin/bash"]
```

### 4.4. The `apts` Library Migration Strategy
To fix the `ObjectTableLabels.TRANSIT` crash and own the stack:

1.  **Define the Model (`src/apts/model.py`):**
    ```python
    class ObjectTableLabels:
        """
        Defines standard labels for object classification in cleanup tasks.
        """
        TRANSIT = "TRANSIT"
        KEEP = "KEEP"
        DELETE = "DELETE"
        ARCHIVE = "ARCHIVE"
        # ... extend as needed
    ```

2.  **Implement Cleanup Logic (`src/apts/action/cleanup.py`):**
    *   Write a standard Python function that traverses a directory.
    *   Apply rules (e.g., "delete .tmp files older than 7 days").
    *   Use `ObjectTableLabels` to tag files for the review UI.

### 4.5. Build & Supply Chain Security

#### CI/CD Pipeline (GitHub Actions)
We will add a new workflow `.github/workflows/build-sandbox.yml`:

1.  **Trigger:** On push to `packages/sandbox-image/**` or `tag`.
2.  **Build:** `docker buildx build --platform linux/amd64,linux/arm64 ...`
3.  **Sign:** Use **Sigstore/Cosign** to sign the container image. This ensures that the image pulled by the user's CLI matches exactly what was built on GitHub.
4.  **Publish:** Push to `ghcr.io/prof-harita/terminai/sandbox`.

#### Versioning
The sandbox version should track the CLI version to ensure compatibility.
*   CLI `v0.27.0` -> Sandbox `v0.27.0`

### 4.6. Integration Steps

1.  **Update CLI Config:**
    Modify `packages/cli/package.json`:
    ```json
    "config": {
      "sandboxImageUri": "ghcr.io/prof-harita/terminai/sandbox:latest"
    }
    ```

2.  **Update Documentation:**
    *   Update `AGENTS.md` to reference `packages/sandbox-image`.
    *   Update `CONTRIBUTING.md` with instructions on how to rebuild the sandbox locally (`docker build . -t terminai/sandbox`).

### 4.7. Benefits of Sovereignty
*   **Immediate Bug Fixes:** We can fix the `TRANSIT` crash in <1 hour by editing `src/apts/model.py`.
*   **Security Audit:** We can run `trivy` or `snyk` on our own image to find vulnerabilities.
*   **Offline Capability:** Users can `docker save/load` our image for air-gapped environments.
*   **Custom Tooling:** We can add tools like `ffmpeg` or `imagemagick` if the community requests them, without waiting for upstream.
