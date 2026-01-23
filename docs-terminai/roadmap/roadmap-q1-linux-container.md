# Q1 2026: Linux container isolation roadmap (Option A)

**Date:** 2026-01-23  
**Scope:** make the existing container sandbox a *real* Tier‑1 Linux isolation runtime **without nerfing capability**  
**Companion docs:**  
- `docs-terminai/roadmap/roadmap.md` (ATS‑50 capability roadmap; do not edit)  
- `docs-terminai/terminai-sandbox-architecture.md` (container sandbox thesis + contracts)  
- `docs-terminai/tasks-ci-hardening.md` (CI hardening; referenced where needed)

This roadmap is explicitly **built on top of what already exists** in the repo (Gemini CLI fork + TerminAI sandbox work). The goal is to remove remaining “scaffold vs reality” gaps so Linux container isolation is dependable for real users.

---

## 0) Current state snapshot (as of 2026-01-23)

### What already exists (strong foundation)

1. **Container sandbox orchestrator is real and battle-tested**
   - `packages/cli/src/utils/sandbox.ts` implements `start_sandbox()` with Docker/Podman support:
     - re-execs the CLI inside the container
     - mounts workspace + settings dir + tmpdir
     - supports `TERMINAI_SANDBOX_FLAGS`, `TERMINAI_SANDBOX_MOUNTS`, `TERMINAI_SANDBOX_ENV`, ports, proxy container, UID/GID mapping
   - `packages/cli/src/config/sandboxConfig.ts` loads sandbox command + image from settings/env/package config.

2. **Sovereign sandbox image build + contract tests exist**
   - `packages/sandbox-image/Dockerfile` builds a Debian slim image with system tools + Python venv at `/opt/terminai/venv`.
   - `scripts/build_sandbox.js` builds image, runs pytest + `/opt/terminai/contract_checks.sh`, optionally generates SBOM.
   - `.github/actions/push-sandbox/action.yml` builds/publishes/signs images to GHCR and runs contract checks.

3. **T‑APTS packaging already exists (critical for “agent power”)**
   - `scripts/build_tapts.js` builds a `terminai_apts-*.whl` into `packages/cli/dist`.
   - `packages/cli/package.json` includes `dist/*.whl` so releases can ship the wheel.
   - `packages/cli/src/runtime/LocalRuntimeContext.ts` can install T‑APTS from the wheel offline into the managed venv.

### The sharp edges (why the container tier still feels “hollow”)

1. **Two competing “container runtime” models currently exist**
   - **Model A (good / mature):** `start_sandbox()` re-execs CLI inside container (full sandbox session).
   - **Model B (inconsistent / risky):** `packages/cli/src/runtime/ContainerRuntimeContext.ts` starts a detached container (`terminai-sandbox:latest`) and uses `docker exec`.
   - `packages/cli/src/runtime/RuntimeManager.ts` currently selects the ContainerRuntimeContext if `docker info`/`podman info` succeeds.

   **Problem:** Model B is not aligned to the sovereign image pipeline (`packages/cli/package.json#config.sandboxImageUri`) and does not handle mounts/UX/security the way `start_sandbox()` does. It also risks selecting container mode unexpectedly (just because Docker exists).

2. **Sandbox launch is currently coupled to RuntimeManager selection**
   - `packages/cli/src/gemini.tsx` only enters sandbox when `runtimeContext.type === 'container'` *and* sandbox is enabled.
   - This coupling makes “what happens on Linux” sensitive to RuntimeManager heuristics, which are currently mid-refactor.

3. **Default image/tag drift is possible**
   - `packages/cli/package.json#config.sandboxImageUri` must be kept compatible with the CLI version.
   - If CLI and image drift, users see “random” breakage (the exact class of bug the sovereign sandbox was created to prevent).

---

## 1) Definition of Done (Linux container Tier‑1 isolation)

**Linux container isolation is “done” when all of the following are true:**

1. **Single authoritative container path**
   - The product uses exactly one container model for Linux isolation (no competing “docker exec” vs “re-exec CLI” runtime behavior).

2. **Deterministic selection + safe fallback**
   - If Docker/Podman is unavailable or unhealthy, TerminAI falls back to Tier‑2 managed local runtime (with explicit host-access consent) without breaking basic usage.

3. **No capability nerf**
   - With sandbox enabled, the agent can still do OODA/REPL workflows (shell + python REPL + file ops + network research) and pass the ATS bar defined in `docs-terminai/roadmap/roadmap.md`.

4. **Contract correctness**
   - Sandbox startup runs a fast preflight (`packages/cli/src/utils/sandboxHealthCheck.ts`) and in-container contract checks (`/opt/terminai/contract_checks.sh`).
   - T‑APTS is always importable, and the “legacy shim” contract (if kept) is tested.

5. **Version compatibility is enforced**
   - The CLI’s default sandbox image tag is either (a) guaranteed compatible by release process or (b) checked at runtime with a clear, actionable error message.

6. **Security posture is explicit (not implied)**
   - Container isolation is treated as defense-in-depth. All real mutations still flow through the existing approval ladder and audit ledger.

---

## 2) Q1 work plan (Linux container track)

Each bucket below is written to be executable independently (deliverables + owner + success criteria). “Agent” means Codex 5.2 does the implementation work; “Human” means you approve design decisions and do the OS-level manual checks.

### L1) Choose and enforce the *one true* Linux container model

**What to do**
- Declare Model A (`start_sandbox()` re-exec) as the Tier‑1 Linux container runtime.
- Remove or feature-flag Model B (`ContainerRuntimeContext`) so it cannot be selected in normal runs.
- Decouple “sandbox entry” from “runtime tier detection” so Docker presence alone doesn’t silently change behavior.

**Deliverables**
- A single Linux container entry path:
  - outside container: `start_sandbox()` is the only way we enter the sandbox session
  - inside container: runtime is treated as “already isolated” (no nested container logic)
- Either:
  - `ContainerRuntimeContext` removed from RuntimeManager selection, **or**
  - it is gated behind an explicit dev-only flag and cannot be hit in release builds.

**Who does what**
- **Agent:** implement the refactor and update tests.
- **Human:** decide whether `ContainerRuntimeContext` is deleted vs dev-flagged.

**Definition of success**
- On a Linux machine with Docker installed, running TerminAI without explicitly enabling sandbox does **not** unexpectedly run inside/through containers.
- Enabling sandbox yields exactly one predictable behavior path.

---

### L2) Make sandbox enablement and UX deterministic (laymen-friendly)

**What to do**
- Make sandbox opt-in/opt-out behavior unambiguous across:
  - settings (`tools.sandbox`)
  - env (`TERMINAI_SANDBOX`, `TERMINAI_SANDBOX_IMAGE`)
  - CLI flags (`--sandbox …`)
- Ensure error messages are actionable for non-technical users.

**Deliverables**
- A clear “sandbox decision” table in docs (what wins when conflicting config exists).
- Improved error messages for:
  - Docker installed but daemon not running
  - image pull failures (GHCR auth vs network vs missing tag)
  - contract check failures (T‑APTS mismatch)

**Who does what**
- **Agent:** update config resolution code + docs.
- **Human:** sanity-check wording against your target customer persona.

**Definition of success**
- A new user can understand, from the error alone, what to do next (start Docker, disable sandbox, set `TERMINAI_SANDBOX_IMAGE`, etc.).

---

### L3) Lock down version compatibility between CLI ↔ sandbox image ↔ T‑APTS

**What to do**
- Ensure the release process makes it *hard* to ship CLI X with sandbox image Y that breaks contracts.
- Add an explicit compatibility check at runtime when using the default image.

**Deliverables**
- CI gate: publishing `@terminai/cli` requires that the referenced `config.sandboxImageUri` has passed contract checks for that exact version tag.
- Runtime gate (defense-in-depth): if CLI version and image tag mismatch and the user did not explicitly override the image, warn or fail closed with instructions.

**Who does what**
- **Agent:** implement CI checks + runtime guard.
- **Human:** decide policy: warn vs hard-fail; define the override escape hatch.

**Definition of success**
- The “ObjectTableLabels.TRANSIT”-class bug becomes a CI failure (or an immediate startup error), not a user-facing crash during a task.

---

### L4) Ensure the sandbox image is a real “system operator survival kit”

**What to do**
- Validate (and adjust) the sandbox image’s baseline tool inventory for your target 90% task set.
- Keep it minimal-but-sufficient; prefer adding primitives over adding “one-off helpers”.

**Deliverables**
- A curated list of required binaries (baseline) with justification.
- Contract tests for critical tools (at least: `python3`, `git`, `curl`, `jq`, `rg`, `tar`, `unzip`).
- Documented policy for adding new tools (must be justified by failing ATS tasks and covered by a contract/integration test).

**Who does what**
- **Agent:** add/adjust Dockerfile + contract tests.
- **Human:** decide the baseline tool policy (avoid bloat vs avoid capability nerf).

**Definition of success**
- Common “research + download + unpack + run + parse outputs” flows succeed inside sandbox without asking the user to install extra OS packages.

---

### L5) Tighten the sandbox security posture without killing usability

**What to do**
- Review default mounts and privileges to ensure we’re not accidentally giving container more power than necessary.
- Avoid “security theater”: every restriction must still allow the agent to do the 90% bar.

**Deliverables**
- Hardened default container flags (where compatible with Docker/Podman) with tests for regressions.
- A documented “safe mounts” guideline:
  - workspace mounted RW
  - `.terminai` settings mounted RW (or split config vs secrets)
  - optional mounts must be explicitly provided by user (`TERMINAI_SANDBOX_MOUNTS`)

**Who does what**
- **Agent:** implement flag hardening and regression tests.
- **Human:** decide what must remain mounted by default (customer usability vs strictness).

**Definition of success**
- Sandbox reduces blast radius meaningfully, but still lets the agent read/write the user’s target working directories and perform the tasks in ATS.

---

### L6) Acceptance suite for Linux container isolation (must be run before shipping)

**What to do**
- Create a small but high-signal acceptance suite that proves the container tier is “real”.

**Deliverables**
- A `terminai doctor` / `terminai self-test` flow (or equivalent scripts) that validates:
  - can start sandbox
  - can import `terminai_apts`
  - can run a shell command in mounted workspace and see files
  - can run python REPL in `ComputerSessionManager` and import `terminai_apts`
  - can access network (LLM calls may be stubbed; basic DNS/HTTPS OK)
  - audit ledger includes `runtime.type=container` and `isIsolated=true`

**Who does what**
- **Agent:** implement commands/tests + minimal docs.
- **Human:** run it on at least two real Linux environments (one with Docker, one with Podman).

**Definition of success**
- You can tell “container tier is healthy” in <2 minutes, and failures are actionable.

---

### L7) Align docs and naming (TERMINAI_* first, GEMINI_* legacy)

**What to do**
- Remove confusing drift between `.gemini` vs `.terminai` in sandbox-related scripts and docs where it matters to users.

**Deliverables**
- Update any remaining sandbox entry scripts that still prioritize `.gemini` over `.terminai` (keep legacy compatibility, but prefer TerminAI).
- Update docs to show TerminAI names by default.

**Who does what**
- **Agent:** doc + small script fixes.
- **Human:** none (review only).

**Definition of success**
- Users can follow one set of instructions (`TERMINAI_*`, `.terminai/`) and everything works; legacy still functions but is not the default.

