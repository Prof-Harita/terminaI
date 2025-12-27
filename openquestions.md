## Finalized Architectural Decisions (Maintainers)

These decisions supersede any previously open items and are treated as binding
constraints for the professionalization plan.

1. **Audit**
   - Ship structured audit log (Level B) first.
   - Hash-chain tamper evidence in Phase 2.
   - Audit must be queryable by the brain and exportable for enterprise.
   - Redaction at write-time for secrets; at export-time for everything else.
   - Audit logging cannot be disabled (only what gets logged is configurable).

2. **Brain Authority**
   - Default: advisory + escalation-only (can raise review level, never lower).
   - Configurable via
     `brain.authority: 'advisory' | 'escalate-only' | 'governing'`.
   - Enterprise admins can lock via policy-as-code.

3. **Operator-Grade PTY**
   - Windows + Linux parity target (macOS is bonus).
   - Expect Windows to take ~2x the effort.
   - Phase 1: minimum viable (resize + kill).
   - Phase 2: operator-grade (password prompts, background tracking, output
     bounds).

4. **Remote Features Default**
   - Enabled, but requires strong first-run consent.
   - Visible indicator when remote is active (cannot be hidden).
   - Remote sources trigger provenance escalation (higher review levels).
   - Loopback binds work by default; non-loopback binds require explicit
     `--remote-bind`.

5. **Upstream Relationship**
   - Pull upstream when they ship something valuable.
   - Ignore upstream when they’re not solving our problems.
   - Shim layer enables divergence without breaking everything.
   - Wrap `@google/genai` behind shims to reduce merge conflict surface.

6. **Safety Invariants**
   - No hard blocks; all invariants are soft (user can override).
   - UX must show ELI5 warnings transparently.
   - Level C actions always show ELI5 consequences + require PIN.
   - First-run explains consequences of YOLO mode with scary examples.
   - Audit logging cannot be disabled.

7. **Moat MVP (90 days)**
   - Brain + Desktop Automation are door openers (differentiation).
   - Governance + Audit are room keepers (required infra, not the wedge).
   - Evolution Lab is critical to prove “brain is the wedge” with measurements.

8. **Recipe Trust Model**
   - Built-in + user recipes first.
   - Community recipes require user confirmation on first load.
   - No signing for v0.
   - Recipes can escalate review levels, never downgrade.
   - Audit records recipe ID + version for every step.

9. **Brain Local Code Execution**
   - Route `FW_SCRIPT` through existing REPL tool (governed by
     `CoreToolScheduler`).
   - Tiered sandboxing:
     - Tier 1 (default): ephemeral venv/nvm in temp dir, no network, 30-second
       timeout.
     - Tier 2 (opt-in): Docker with pre-cached base image.
   - Simple tasks → Tier 1; complex/system deps → Tier 2.

10. **GUI Automation Safety Contract**

- Default: `ui.click` / `ui.type` require Level B (click-to-approve).
- Typed text is redacted in audit by default.
- Snapshots are depth-limited (100 nodes default).
- All configurable via `tools.guiAutomation.*`.
- Onboarding journey makes this transparent.
