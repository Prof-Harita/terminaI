# CI Scorched Earth: The Road to 1-to-N Scaling

**Goal**: Create a "Clean Room" CI environment that is completely independent of
the developer's local machine. Stop fighting "works on my machine" bugs forever.

**Audience**:

1.  **The Chief**: Strategy and "Why".
2.  **The Agent**: Exact file paths, code snippets, and success criteria.

---

## Phase 1: Linux Foundation (The Hermetic Seal)

_These tasks must be executed on the Linux machine to create the bedrock._

### 1. The Workflow Purge

**Why**: We have 29+ workflow files. This is "Complexity Debt". We cannot verify
what we cannot understand. **Task**: Delete all legacy, unused, or redundant
workflows. Keep only the "Core 3".

- **Action**:
  - [ ] **DELETE** `.github/workflows/` files EXCEPT:
    - `ci.yml` (Rename to `pr-gatekeeper.yml`)
    - `release.yml` (The Ship)
    - `nightly-matrix.yml` (Create new if missing, for deep testing)
  - [ ] **ARCHIVE** deleted files to `local/.archive/workflows/` just in case.

### 2. The Hermetic Build Container

**Why**: Local builds depend on random Python versions and C++ compilers. CI
builds must use a "Golden Image" that never changes. **Task**: Create a
Dockerfile that contains the _exact_ toolchain for TerminaI.

- **Action**: Create `docker/Dockerfile.ci`

  ```dockerfile
  # Base image with Node 20 (LTS)
  FROM node:20-bullseye

  # Install Native Build Toolchain
  # python3, make, g++, build-essential are REQUIRED for node-gyp
  RUN apt-get update && apt-get install -y \
      python3 \
      python3-pip \
      make \
      g++ \
      build-essential \
      libsecret-1-dev \
      && rm -rf /var/lib/apt/lists/*

  # Pre-install global dependencies
  RUN npm install -g turbo typescript node-gyp

  WORKDIR /app
  ```

- **Action**: Update `pr-gatekeeper.yml` to run the build _inside_ this
  container.

### 3. Stabilize Flaky CLI Tests

**Why**: `gemini.test.tsx` fails because tests leak state
(`phase already active`). A flaky test is worse than no test—it actively
gaslights contributors. **Task**: Enforce strict cleanup in the test suite.

- **Action**: Modify `packages/cli/src/gemini.test.tsx`:
  - Add `afterEach` block that forcibly calls `CLI.reset()` or explicitly cleans
    up `appEvents` and `runtimeContext`.
  - **Verify**: Run `npm test` 10 times in a row locally. It must pass 10/10.

### 4. The "No Binary" Policy

**Why**: Checking in `packages/cli/build/terminai_native.node` allows a
developer to bypass the build system. This causes "it runs on my Mac but crashes
on Linux CI" issues. **Task**: strictly enforce gitignore.

- **Action**:
  - [ ] Ensure `.gitignore` contains `packages/cli/build/` (Done via
        cherry-pick).
  - [ ] **Add Pre-commit Hook**: Add a check in `.husky/pre-commit` that runs
        `git ls-files --error-unmatch packages/cli/build/` and fails if it finds
        anything.

---

## Phase 2: Windows Sovereign (The Final Gap)

_These tasks must be executed on a Windows machine (or deeply simulated) to
close the OS gap._

### 5. The Windows Setup Script

**Why**: Windows dev environment setup is notoriously hard (Visual Studio Build
Tools vs VS Code, Python path issues). We need to automate it. **Task**: Create
a PowerShell script that sets up the environment.

- **Action**: Create `scripts/setup-dev.ps1`
  - Check for `node`, `python`, `visual studio build tools`.
  - If missing, print EXACT install command (or use `winget` to install).
  - Run `npm install` and `npm run build:native`.

### 6. Integration Test: The Broker

**Why**: We mocked `BrokerClient` in Phase 1. But on Windows, the Broker is a
real separate process. We need to verify they can talk. **Task**: Create a true
E2E test.

- **Action**: Create
  `packages/cli/src/runtime/windows/BrokerClient.integration.test.ts`
  - **Skip on Linux**: `if (process.platform !== 'win32') return;`
  - **Logic**:
    1.  Spawn `BrokerServer` (The Hands).
    2.  Connect `BrokerClient` (The Brain).
    3.  Send `ping`. Expect `pong`.
    4.  Kill Server.

---

## Execution Order

1.  **Execute Phase 1 (Linux)** immediately on this machine.
2.  **Verify** "Green" status on GitHub.
3.  **Switch to Windows Machine** to execute Phase 2.
