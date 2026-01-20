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

### C. Recommendation
File a bug report against the `gemini-cli/sandbox` or the internal `apts` library project to release a patched version of the sandbox image (e.g., `0.26.1`) that resolves this dependency conflict.
