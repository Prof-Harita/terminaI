# TerminaI Professionalization — Risk Assessment (Per Initiative)

For each initiative:
- **What could go wrong**: primary failure modes.
- **Rollback strategy**: how to revert safely if it breaks.
- **High-risk files**: high fan-out / central chokepoints / hard-to-debug surfaces.

---

## Initiative 1: Branding migration cleanup
**What could go wrong**
- Docs drift: examples no longer match actual behavior or supported env vars.
- Migration bugs: `.termai` → `.terminai` fallback logic breaks first-run or history reads.
- Wrapper ordering: env aliasing runs before wrapper sets env vars, producing confusing behavior.

**Rollback strategy**
- Revert doc-only changes independently if runtime behavior is correct.
- Keep dual-read fallback for `.termai` indefinitely if any migration issues appear.
- If wrapper changes regress startup, revert `packages/termai/src/index.ts` ordering while keeping the core env alias shim intact.

**High-risk files**
- `packages/cli/index.ts` (entrypoint; early init ordering)
- `packages/termai/src/index.ts` (wrapper behavior affects all launches)
- `packages/core/src/utils/envAliases.ts` (cross-cutting compatibility surface)

---

## Initiative 2: CI determinism fix
**What could go wrong**
- CI workflows fail due to missing build prerequisites previously hidden by auto-install.
- Local developer workflow friction increases if `npm run build` becomes strict without clear guidance.

**Rollback strategy**
- Temporarily restore a dev-only auto-install path behind an explicit env var while keeping CI strict.
- Revert CI workflow ordering changes if a runner/environment limitation is discovered, then re-apply with a targeted fix.

**High-risk files**
- `.github/workflows/ci.yml` (affects all CI)
- `scripts/build.js` (affects all builds and preflight)

---

## Initiative 3: Evolution Lab Docker default
**What could go wrong**
- Breaking change for anyone relying on the old `headless` naming or host execution.
- Docker availability issues in environments where Evolution Lab is run.
- Sandbox controller errors become more visible (previously “ignored”).

**Rollback strategy**
- Provide temporary CLI aliases (treat `headless` as `docker`) for one release window.
- Keep `host` support but require explicit opt-in; if that breaks too many flows, temporarily loosen the gate while adding a loud warning.

**High-risk files**
- `packages/evolution-lab/src/sandbox.ts` (exec environment boundary)
- `packages/evolution-lab/src/cli.ts` (flag parsing affects all runs)

---

## Initiative 4: Framework selector alignment
**What could go wrong**
- Behavioral change: some prompts previously mapped to `FW_DECOMPOSE` now map to `FW_CONSENSUS` (or similar), affecting injected strategy text in non-interactive mode.
- Tests or downstream code rely on the old enum member.

**Rollback strategy**
- Revert to previous enum while implementing `FW_DECOMPOSE` in the orchestrator (if removal proves undesirable).
- Keep selection mapping stable by documenting the new mapping and updating tests.

**High-risk files**
- `packages/core/src/brain/frameworkSelector.ts` (typed surface consumed by orchestrator/tests)

---

## Initiative 5: Audit schema definition
**What could go wrong**
- Type churn causes downstream compile errors if exports are mis-wired.
- Overly rigid schema makes Phase 2 ledger implementation harder.

**Rollback strategy**
- Keep schema additive and permissive (optional fields), minimizing breaking typing changes.
- If schema needs redesign, iterate before runtime hooks land (since Phase 1 is type-only).

**High-risk files**
- `packages/core/src/index.ts` (export surface for multiple packages)

---

## Initiative 6: Eliminate brain bypass paths
**What could go wrong**
- Regression in non-interactive flows that previously “just worked” because `FW_SCRIPT` executed ungoverned code.
- Increased “tool excluded” errors in non-interactive default mode.
- Users interpret the change as a capability loss rather than governance hardening.
- Tier 1 sandboxing is hard to enforce deterministically across OSes (especially “no network” without adding new dependencies).
- Tier 2 (Docker) introduces image/caching/availability issues and can slow down workflows.

**Rollback strategy**
- If severe, temporarily downgrade `FW_SCRIPT` to `inject_prompt` only (never execute) while refining tool allowance behavior.
- Avoid restoring ungoverned execution; instead provide explicit safe override paths (e.g., YOLO with warnings).
- If Tier 1 isolation is unreliable on a platform, default Tier 1 to a dockerized “no network” profile on that platform (still governed), and document the limitation.

**High-risk files**
- `packages/cli/src/nonInteractiveCli.ts` (non-interactive orchestration)
- `packages/core/src/brain/thinkingOrchestrator.ts` (decision logic for execution path)
- `packages/core/src/tools/repl.ts` (exec surface; must be governed)

---

## Initiative 7: Provenance threading
**What could go wrong**
- Wide compile breakage: adding `provenance` to `ToolCallRequestInfo` affects many call sites/tests.
- Incorrect provenance labeling causes review levels to escalate unexpectedly (UX friction) or fail to escalate (safety gap).
- Remote consent/indicator UX becomes noisy or confusing; users may see “remote active” unexpectedly if defaults aren’t carefully gated.
- Non-loopback bind restrictions may break existing remote workflows if they relied on implicit binds.

**Rollback strategy**
- Make `provenance` optional and default conservatively to `['unknown']`/`['model_suggestion']` to preserve runtime behavior.
- Roll out provenance population incrementally per source (local first, then web-remote, then web/tool-output chaining).
- If consent flow blocks users unexpectedly, re-scope to “strong first-run notice + explicit confirm” while still requiring explicit `--remote-bind` for non-loopback.

**High-risk files**
- `packages/core/src/core/turn.ts` (type is used broadly)
- `packages/core/src/core/coreToolScheduler.ts` (central executor)
- `packages/cli/src/utils/webRemoteServer.ts` (remote provenance correctness)

---

## Initiative 8: Centralize approval ladder
**What could go wrong**
- UX regression: tools that previously ran without confirmation now require Level B/C, surprising users.
- Incorrect ActionProfile mapping produces overly strict (or insufficient) review levels.
- PIN handling inconsistencies across tool types.
- Brain authority configuration can create unexpected behavior (e.g., “governing” causes extra prompts) if defaults and enterprise locks are not clearly explained.

**Rollback strategy**
- Keep mappings conservative but adjustable via settings while maintaining “brain can escalate, never downgrade” invariant.
- If a specific tool mapping is wrong, patch the mapping rather than disabling the ladder globally.
- If brain authority causes major confusion, keep `escalate-only` as the only supported mode temporarily while the other modes mature (still honoring enterprise policy where already deployed).

**High-risk files**
- `packages/core/src/safety/approval-ladder/computeMinimumReviewLevel.ts` (global safety semantics)
- `packages/core/src/core/coreToolScheduler.ts` (enforcement choke point)
- `packages/core/src/tools/*` (many tools; broad regression risk)

---

## Initiative 9: Audit ledger v1 implementation
**What could go wrong**
- Performance/IO overhead: audit writes slow down tool execution, especially with frequent UI/shell output.
- Redaction bugs leak secrets into on-disk logs (high severity).
- Hash-chain bugs cause false “tamper” failures.
- Storage growth exceeds bounds if not properly truncated/rotated.

**Rollback strategy**
- Keep audit always-on, but reduce verbosity: log metadata + hashes rather than full payloads.
- If redaction is suspect, immediately switch write-time strategy to “drop potentially sensitive fields” and rely on hashes until fixed.
- Provide a ledger version bump path and maintain backward-compatible readers.

**High-risk files**
- `packages/core/src/core/coreToolScheduler.ts` (central, high traffic)
- `packages/core/src/audit/*` (new security-critical subsystem)
- `schemas/settings.schema.json` (enterprise policy expectations)

---

## Initiative 10: Recipes v0
**What could go wrong**
- Recipes become a bypass vector if steps can downgrade review levels or skip scheduler.
- Recipe loader trust model is unclear; community recipes load without confirmation.
- Recipe execution becomes flaky without strong verification/rollback steps.

**Rollback strategy**
- Enforce “execute only through CoreToolScheduler” as a hard invariant.
- Disable community recipe loading by default if issues arise; keep built-in + user recipes.
- Keep recipes read-only preview mode if execution proves risky.

**High-risk files**
- `packages/core/src/recipes/executor.ts` (new high authority surface)
- `packages/cli/src/ui/commands/recipesCommand.ts` (user-facing entry)

---

## Initiative 11: GUI automation hardening
**What could go wrong**
- UI actions become flaky across platforms; bounding causes legitimate operations to fail.
- Redaction removes too much diagnostic context to debug GUI failures.
- Driver parity gaps: Windows driver stubs limit usefulness.

**Rollback strategy**
- Keep GUI automation disabled by default (`tools.guiAutomation.enabled=false`).
- If bounding is too strict, adjust limits upward but keep an upper bound.
- If redaction hinders support, allow opt-in debug export mode (still redact secrets).

**High-risk files**
- `packages/core/src/gui/service/DesktopAutomationService.ts` (central UI automation logic)
- `packages/core/src/tools/ui-*.ts` (many entrypoints)
- `packages/desktop-linux-atspi-sidecar/src/server.py` (OS-level automation)

---

## Initiative 12: Evolution Lab safety harness
**What could go wrong**
- CI flakiness if suite depends on environment-specific behavior.
- Docker image availability/caching issues increase CI time.
- Overly strict sandboxing prevents running needed tasks.

**Rollback strategy**
- Keep the suite minimal, offline, and deterministic; pin versions and inputs.
- If CI is too slow, move suite to nightly while keeping local developer runs.
- Add a clear “unsafe host” escape hatch for local experimentation (never default).

**High-risk files**
- `packages/evolution-lab/src/sandbox.ts` (sandbox boundary)
- `.github/workflows/ci.yml` (CI stability)

---

## Initiative 13: Desktop PTY hardening
**What could go wrong**
- PTY lifecycle bugs lead to zombies, hangs, or stuck UI.
- Windows ConPTY differences cause platform-specific regressions.
- Backpressure logic drops important output or breaks interactive behavior.

**Rollback strategy**
- Keep old PTY path behind a feature flag if needed while iterating.
- If backpressure causes regressions, start with conservative buffering + truncation markers.

**High-risk files**
- `packages/desktop/src-tauri/src/pty_session.rs` (core PTY lifecycle)
- `packages/desktop/src-tauri/src/lib.rs` (command surface)

---

## Initiative 14: Voice mode v0
**What could go wrong**
- Microphone capture is platform-dependent and brittle; voice mode fails silently.
- Whisper process management leaks processes or hangs on shutdown.
- Transcription errors produce confusing prompts or accidental submissions.

**Rollback strategy**
- Keep voice mode opt-in and degrade gracefully to TTS-only if STT fails.
- Require explicit user action (PTT release) to submit; do not auto-submit partial transcripts.

**High-risk files**
- `packages/cli/src/ui/AppContainer.tsx` (interactive input path)
- `packages/cli/src/voice/stt/StreamingWhisper.ts` (process lifecycle)
- `packages/cli/src/commands/voice/install.ts` (asset discovery/install)
