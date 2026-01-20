# TerminAI Sandbox Architecture (Sovereign Sandbox)

## Rationale

TerminAI’s value proposition is **governed autonomy for system operations**.
That implies we must be able to:

- deterministically enforce policy/approvals for risky actions
- maintain an immutable audit trail
- execute tool workloads in an environment whose behavior is predictable,
  reviewable, and reproducible

The reported crash during “cleanup downloads”
(`AttributeError: ObjectTableLabels.TRANSIT`) demonstrates a **hard dependency
on an opaque, pre-installed Python library** inside the sandbox image. This is
an architectural failure mode:

- the repository cannot patch or test the dependency (`apts`) because it is not
  built from this repo
- the runtime contract between `apts.action.cleanup` and
  `apts.model.ObjectTableLabels` is not versioned or validated
- the sandbox image can drift independently of CLI/core, causing production
  regressions

This document defines a **Sovereign Sandbox** architecture so TerminAI can own
and validate its execution environment end-to-end.

## Scope

This architecture covers:

- the _container-based_ sandbox execution path (`docker` / `podman`) and its
  image supply chain
- sandbox runtime configuration and entrypoint behavior
- a clean-room replacement strategy for the opaque Python “APTS” toolset that
  triggered the crash
- CI/CD, versioning, and contract testing needed to prevent regressions

This document does **not** redesign:

- the core three-axis safety model (Outcome/Intention/Domain)
- the policy engine semantics
- GUI sandboxing (Seatbelt profiles are referenced but not redesigned)

---

## Background: the observed failure

### Symptom

A user asks TerminAI to “cleanup my downloads folder”. During execution, the
agent runs a Python module that crashes:

```
AttributeError: type object 'ObjectTableLabels' has no attribute 'TRANSIT'
  File "apts/action/cleanup.py", line <line_number>, in <module>
```

### Likely cause

The Python module `apts.action.cleanup` assumes `ObjectTableLabels.TRANSIT`
exists, but the shipped `apts.model.ObjectTableLabels` does not define it.

This is a classic “**runtime contract drift**” bug:

- consumer code expects a symbol
- provider version doesn’t contain it
- nothing in the repo pins/validates the contract

### Why this is structurally hard to fix today

TerminAI currently defaults to an upstream sandbox image referenced from the CLI
package config:

- `packages/cli/package.json`:
  - `config.sandboxImageUri = us-docker.pkg.dev/gemini-code-dev/gemini-cli/sandbox:0.26.0`
- `packages/cli/src/config/sandboxConfig.ts` chooses image in this order:
  - `TERMINAI_SANDBOX_IMAGE`
  - `GEMINI_SANDBOX_IMAGE` (legacy)
  - `packageJson.config.sandboxImageUri`

Because the failing Python code lives inside the sandbox image (not this
repository), **repo-side code changes cannot patch it directly** unless we own
the image contents.

---

## Current state (as-is) sandbox architecture

### Runtime entry

- The CLI decides whether sandboxing is enabled via:
  - CLI args
  - settings `tools.sandbox`
  - `TERMINAI_SANDBOX` / `GEMINI_SANDBOX`
- The sandbox is started by `packages/cli/src/utils/sandbox.ts`
  (`start_sandbox`).

### Image build & publish

This repo already contains a sandbox image build system:

- Root `Dockerfile` builds an image that:
  - is based on `node:20-slim`
  - installs a minimal set of OS tools
  - installs the packed `@terminai/cli` and `@terminai/core` tarballs
- `scripts/build_sandbox.js`:
  - packs CLI+core into tarballs
  - calls `docker build` / `podman build`
  - supports outputting the final image URI for CI
- CI workflows already exist to build/push images:
  - `.gcp/release-docker.yml`
  - `.github/actions/push-sandbox/action.yml`

However:

- runtime defaults still point at **an upstream image**
- the contents of that upstream image include additional Python tooling (`apts`)
  that TerminAI does not own

### Custom per-project sandboxing

The runtime also supports project-specific customization via `.terminai/`
(legacy `.gemini/`):

- `.terminai/sandbox.Dockerfile`
- `.terminai/sandbox.bashrc`

and env knobs:

- `SANDBOX_FLAGS`, `SANDBOX_MOUNTS`, `SANDBOX_PORTS`, `SANDBOX_ENV`

This is valuable, but it must be **layered on top of a sovereign base image**
that TerminAI controls.

---

## Design goals

- **Sovereignty**
  - No critical runtime dependencies that are “present in the image but not
    built from this repo”.

- **Contract correctness**
  - The sandbox must ship a versioned “toolset contract” and the repo must test
    it.
  - The `ObjectTableLabels.TRANSIT` class of bug must become a CI failure, not a
    runtime crash.

- **Governed execution**
  - Sandboxing is a _defense-in-depth mechanism_, not a bypass path.
  - All tool execution continues to flow through TerminAI’s
    policy/approval/audit pipeline.

- **Reproducibility & supply chain security**
  - Pinned dependencies where practical.
  - SBOM + provenance + signing for published images.

- **Compatibility**
  - Keep existing end-user knobs (`TERMINAI_SANDBOX`,
    `.terminai/sandbox.Dockerfile`, etc.).
  - Maintain legacy `GEMINI_*` aliases, but migrate docs and defaults to
    `TERMINAI_*`.

---

## Proposed target architecture: Sovereign Sandbox

### High-level structure

The Sovereign Sandbox has four layers:

1. **Sandbox Orchestrator (runtime)**
   - Responsible for running containers / Seatbelt.
   - Exists today (`packages/cli/src/utils/sandbox.ts`).

2. **Sovereign Base Sandbox Image**
   - Built from this repository.
   - Contains:
     - TerminAI CLI + core
     - OS tooling required for “system operator” workflows
     - a controlled Python runtime

3. **TerminAI Python Tool Set (T-APTS)**
   - A repo-owned Python package that replaces the opaque `apts`.
   - Contains the “cleanup downloads” primitives (and other Python helpers).

4. **Contract Tests + Release Pipeline**
   - CI builds the image, runs a contract test suite inside it, and only then
     publishes.

### Data/control flow (container-based sandbox)

```mermaid
flowchart TB
  U[User prompt: "cleanup my downloads"] --> B[Brain / Planner]
  B --> P[Policy + Approval Ladder]
  P -->|approved| TS[Tool Scheduler]
  TS -->|shell / repl / file ops| CLI[CLI Tool Host]
  CLI -->|container run| ORCH[Sandbox Orchestrator]
  ORCH --> IMG[Sovereign Sandbox Image]
  IMG --> PY[T-APTS Python Tool Set]
  CLI --> AUDIT[Audit Ledger]
  P --> AUDIT
  ORCH --> AUDIT
```

Key invariant:

- **The orchestrator never executes ungoverned actions**. It only provides
  isolation for already-approved tool calls.

---

## Addressing the immediate incident (ObjectTableLabels.TRANSIT)

### Immediate mitigation (0–48 hours)

- **Pin to a known-good sandbox image**
  - Update default `sandboxImageUri` to a TerminAI-owned tag that is known to
    work.
  - Ensure the tag is immutable in practice (avoid floating tags like `latest`
    for release builds).

- **P0: Add a runtime “sandbox health check” as a boot-time invariant**
  - The sandbox must fail fast at startup, not during a user task.
  - On sandbox startup, run a lightweight check that validates required Python
    symbols.
  - Minimum contract assertions:
    - `python3 -c "import apts; from apts.model import ObjectTableLabels; assert hasattr(ObjectTableLabels,'TRANSIT')"`
    - `python3 -c "import terminai_apts"` (once introduced)
  - Where to run it:
    - Orchestrator preflight: `docker run --rm <image> python3 -c ...` (fast, no
      long-running container)
    - In-container preflight: first command in the container entrypoint, before
      `gemini`/`terminai` starts
  - If the check fails:
    - provide a clear, user-actionable error
    - refuse to run the session in that sandbox (fail closed)

This prevents the crash from being a confusing Python traceback and converts it
into a deterministic, auditable error.

### Strategic fix (Sovereign Sandbox)

Eliminate reliance on upstream `apts` by shipping a repo-owned equivalent.

- `T-APTS` defines the canonical contract:
  - `ObjectTableLabels.TRANSIT` exists (or the concept is removed and all
    callers updated)
- the sandbox image installs `T-APTS`
- CI contract tests validate the symbol surface

---

## T-APTS (TerminAI Python Tool Set)

### Responsibility

T-APTS exists to provide:

- stable, versioned Python helpers for the agent’s REPL workloads
- a controlled place to implement “cleanup” semantics that should not depend on
  upstream/opaque modules

### Contract design

T-APTS MUST provide:

- **stable symbol names** for anything used by generated scripts or internal
  Python entrypoints
- **semantic versioning** coordinated with CLI/core sandbox versioning

Example contract surface:

- `terminai_apts.model.ObjectTableLabels`
  - `TRANSIT`, `KEEP`, `DELETE`, `ARCHIVE` (exact set versioned)
- `terminai_apts.action.cleanup.cleanup_downloads(...)`
  - deterministic file classification and proposed actions

### Compatibility layer for legacy `apts` imports (Phase 0/1 shim)

Even with a new namespace (`terminai_apts`), we should assume some existing
prompts and agent behaviors already “know” about `apts.*`.

During migration, the sandbox image should provide a temporary compatibility
layer so `import apts` continues to work.

Recommended strategy:

- Provide `terminai_apts` as the canonical implementation.
- Provide a **shim package** named `apts` that re-exports from `terminai_apts`.
- Additionally, for defensive compatibility, if an upstream `apts` is present,
  patch missing symbols at import time.

Implementation options (choose one, in order of preference):

1. **Ship an `apts` shim package** in the image
   - A minimal `apts/__init__.py` that forwards imports into `terminai_apts`.
   - Advantage: simplest and most predictable; avoids runtime monkey-patching.

2. **Use `sitecustomize.py` to alias module names**
   - On interpreter startup, import `terminai_apts` and register
     `sys.modules['apts'] = terminai_apts`.
   - Advantage: no need to duplicate package structure.

3. **Monkey patch only the specific missing symbol** (stopgap)
   - If `apts.model.ObjectTableLabels` exists but lacks `TRANSIT`, inject it.
   - Advantage: minimal change; Disadvantage: fragile and not a long-term
     contract.

### How TerminAI uses it

There are two safe patterns:

1. **Tool-first** (preferred)
   - TerminAI exposes a first-class tool (TS) that performs “downloads cleanup”
     and does not require Python.
   - Python helpers exist for advanced transforms, not core functionality.

2. **Python-in-sandbox** (allowed)
   - REPL Python scripts import from `terminai_apts`.
   - The sandbox guarantees the package is present.

Either way, the presence of `apts` (upstream) becomes irrelevant.

---

## Sovereign sandbox image

### Current repo reality

TerminAI already has a root `Dockerfile` used by `scripts/build_sandbox.js`. The
architecture builds on that capability.

### Required properties

- **Reproducible build inputs**
  - Dockerfile + pinned OS packages where feasible
  - pinned Node package tarballs (already done by packaging CLI/core)

- **Non-root runtime by default**
  - Continue the current approach (base image’s non-root user, with Linux
    UID/GID mapping support).

- **Controlled Python runtime**
  - Python version must be explicitly chosen and tested.
  - If `pip` is used, dependencies should be pinned.

- **T-APTS installed**
  - included in image build as a first-class artifact

### Recommended repository layout (incremental)

Phase the change to avoid disrupting current build scripts:

- Phase 1: keep root `Dockerfile`, add T-APTS install steps
- Phase 2: move image sources to `packages/sandbox-image/` and keep
  `scripts/build_sandbox.js` as a wrapper

Target layout:

```text
packages/sandbox-image/
  Dockerfile
  python/
    terminai_apts/
  scripts/
    contract_checks.sh
  README.md
```

---

## Runtime configuration & compatibility

### Canonical environment variables

- `TERMINAI_SANDBOX`
  - `true|false|docker|podman|sandbox-exec`
- `TERMINAI_SANDBOX_IMAGE`
  - overrides default image URI

### Legacy aliases

TerminAI already supports some `GEMINI_*` aliases (e.g.,
`GEMINI_SANDBOX_IMAGE`).

Architecture policy:

- **Documentation + defaults** must use `TERMINAI_*`.
- **Runtime** should continue to accept `GEMINI_*` for backward compatibility,
  via the existing env aliasing approach used elsewhere in TerminAI.

### Sandbox customization knobs

These remain supported:

- `.terminai/sandbox.Dockerfile`
- `.terminai/sandbox.bashrc`
- `SANDBOX_FLAGS`, `SANDBOX_MOUNTS`, `SANDBOX_PORTS`, `SANDBOX_ENV`

Constraint:

- customization must be layered on top of the sovereign base image, not replace
  it with opaque upstream blobs.

---

## Supply chain security

### Publishing

The sandbox image must be published to a TerminAI-controlled registry.

Canonical choice:

- **GHCR (default for open-source)**:
  `ghcr.io/prof-harita/terminai/sandbox:<version>`

Optional enterprise mirrors:

- **GCP Artifact Registry**:
  `us-west1-docker.pkg.dev/<project>/terminai/sandbox:<version>`

### Provenance & signing

For each published image:

- generate an **SBOM**
- sign with **cosign**
- publish provenance attestations (SLSA-style)

### Runtime verification (optional but recommended)

- allow users/enterprises to enforce signature verification before running a
  sandbox image

---

## Testing strategy (prevents recurrence)

### Contract tests (must-have)

A contract test suite executed inside the image during CI must validate:

- Python can import T-APTS
- required symbols exist:
  - `ObjectTableLabels.TRANSIT` (and others)
- basic cleanup invocation works and returns valid structured output

### Integration tests (feature-level)

Add an end-to-end scenario test (recommended in `packages/evolution-lab/`) that:

- runs the agent with sandbox enabled
- issues a “cleanup downloads” request
- verifies:
  - no crash
  - the agent produces a plan and asks for appropriate approvals
  - actions are audited

### Regression tests (image drift)

- pin sandbox version to CLI version
- ensure CI blocks publishing if contract tests fail

---

## Versioning & rollout plan

### Versioning rule

- CLI `X.Y.Z` should default to sandbox image `X.Y.Z`.
- avoid floating tags for releases.

### Rollout phases

1. **Phase 0 (now)**
   - create a known-good TerminAI-owned image tag
   - change defaults to use it

2. **Phase 1**
   - introduce T-APTS and install it into the image
   - add contract tests in CI

3. **Phase 2**
   - migrate image sources to `packages/sandbox-image/`
   - keep backwards compatible build scripts

4. **Phase 3**
   - add SBOM + cosign signing to pipelines
   - optionally add signature verification in runtime

5. **Phase 4**
   - remove reliance on upstream sandbox images for official releases

---

## Gaps in the senior proposal (what must be added)

The proposal correctly identifies “own the image” as strategic, but it needs
additional architecture commitments:

- **A formal contract + tests**
  - without this, we can still ship drift bugs even with a sovereign repo

- **Alignment with existing TerminAI sandbox build system**
  - the repo already builds a sandbox image (root `Dockerfile` +
    `scripts/build_sandbox.js`)
  - a new package should be phased in, not introduced as a parallel, competing
    pipeline

- **Governance integration language**
  - sandboxing is not a substitute for approvals/audit
  - the doc must explicitly state sandbox execution still flows through policy
    gating

- **Version pinning and default selection**
  - a sovereign image is only useful if the runtime defaults actually use it

---

## Open questions / decisions

- Do we want a strict rule that generated Python scripts must import from
  `terminai_apts` (not `apts`), and enforce it via prompt/tooling?
- Do we want runtime signature verification as a default, or only
  enterprise-configurable?

---

## Summary

The `ObjectTableLabels.TRANSIT` crash is not “just a missing constant”; it is a
symptom of an **unowned execution environment**.

The Sovereign Sandbox architecture fixes the class of failure by:

- making the sandbox image buildable from this repository
- introducing a repo-owned Python toolset (T-APTS) with a versioned contract
- adding CI contract tests so symbol drift cannot ship
- aligning defaults/versioning so CLI and sandbox cannot silently diverge
