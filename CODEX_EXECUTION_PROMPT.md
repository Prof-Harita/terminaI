# TerminaI Professionalization: Technical Specification Request

**Context:** You are being asked to produce a detailed technical specification
and task list for a phased professionalization plan for TerminaI, a community
fork of Google's Gemini CLI that has evolved into a "universal terminal
operator" with governed autonomy.

**Your job:**

1. **FIRST:** Read and deeply understand ALL attached context and the actual
   codebase
2. **SECOND:** Produce a comprehensive technical specification with file-level
   detail
3. **THIRD:** Produce a sequenced task list that can be executed step-by-step
4. **DO NOT EXECUTE YET** — I will review your spec, then ask you to execute

---

## Part 1: The Initiatives

Produce detailed technical specifications for ALL of the following initiatives:

### Phase 1: Safe-to-Oneshot (Low Risk)

| #   | Initiative                   | Scope                                        | Verification                                                              |
| --- | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Branding migration cleanup   | Doc updates, env var shims, no logic changes | Search Markdown for legacy Gemini-prefixed env vars in non-upstream files |
| 2   | CI determinism fix           | Build script changes, clear pass/fail        | `npm run preflight` passes, CI goes green                                 |
| 3   | Evolution Lab Docker default | Sandbox.ts changes, clear scope              | Default sandbox type is `docker`, `headless` requires opt-in flag         |
| 4   | Framework selector alignment | Remove `FW_DECOMPOSE` or implement it        | Unit tests pass, no orphaned framework IDs                                |
| 5   | Audit schema definition      | Types file, no runtime changes               | `npm run typecheck` passes                                                |

### Phase 2: Governance & Safety (Medium Risk)

| #   | Initiative                     | Scope                                                |
| --- | ------------------------------ | ---------------------------------------------------- |
| 6   | Eliminate brain bypass paths   | Gate `FW_SCRIPT` through tool approvals + audit      |
| 7   | Provenance threading           | Thread provenance into all action profiles           |
| 8   | Centralize approval ladder     | Extend A/B/C to all mutating tools (not just shell)  |
| 9   | Audit ledger v1 implementation | Hooks at scheduler choke points + schema + redaction |

### Phase 3: Product Surfaces (Higher Risk)

| #   | Initiative                   | Scope                                            |
| --- | ---------------------------- | ------------------------------------------------ |
| 10  | Recipes v0                   | Format + loader + 5-10 built-in recipes          |
| 11  | GUI automation hardening     | A/B/C ladder for UI tools + bounding + redaction |
| 12  | Evolution Lab safety harness | Docker default + deterministic regression suite  |
| 13  | Desktop PTY hardening        | Resize + kill + backpressure (Windows + Linux)   |
| 14  | Voice mode v0                | STT wiring into input path                       |

---

## Part 2: Architectural Decisions (Finalized)

These decisions have been made by the maintainers. Do not deviate from them.

### 1. Audit Trail Definition

- Ship **structured audit log (Level B)** first
- Hash-chain tamper-evidence in Phase 2
- Audit MUST be queryable by the brain (for history-based confidence
  adjustments)
- Audit MUST be exportable for enterprise
- Redaction: at write-time for secrets, at export-time for everything else
- Audit logging **cannot be disabled**, only what gets logged can be configured

### 2. Brain Authority Model

- Default: **Advisory + escalation-only** (can raise review level, never lower)
- Exposable via setting
  `brain.authority: 'advisory' | 'escalate-only' | 'governing'`
- Enterprise admins can lock via policy-as-code

### 3. Operator-Grade PTY

- **Windows + Linux parity target.** macOS is bonus.
- Expect Windows to take ~2x the effort (ConPTY semantics differ)
- Phase 1: Minimum viable (resize + kill)
- Phase 2: Operator-grade (password prompts, background tracking, output bounds)

### 4. Remote Features Default

- **Enabled, but requires strong first-run consent**
- Visible indicator when remote is active (cannot be hidden)
- Remote sources trigger provenance escalation (higher review levels)
- Loopback works by default; non-loopback binds require explicit --remote-bind

### 5. Upstream Relationship

- Pull upstream when they ship something valuable we don't have
- Ignore upstream when they're not solving our problems
- Shim layer enables divergence without breaking everything
- Wrap `@google/genai` behind shims to reduce merge conflict surface

### 6. Safety Invariants

- **No hard blocks.** All safety invariants are soft (user can override)
- UX MUST flash ELI5 warnings transparently (not buried in settings)
- Level C actions always show ELI5 consequences + require PIN
- First-run explains consequences of YOLO mode with scary examples
- Audit logging cannot be disabled

### 7. Moat MVP (90 days)

- **Brain + Desktop Automation** are the door openers (differentiation)
- **Governance + Audit** are room keepers (required infrastructure, not the
  wedge)
- Evolution Lab is critical to prove "Brain is the wedge" with measurements

### 8. Recipe Trust Model

- Built-in + user recipes first
- Community recipes require user confirmation on first load
- No signing for v0
- Recipes can escalate review levels, never downgrade
- Audit records recipe ID + version for every step

### 9. Brain Local Code Execution

- Route `FW_SCRIPT` through existing REPL tool (governed by CoreToolScheduler)
- Tiered sandboxing:
  - **Tier 1 (default):** Ephemeral venv/nvm in temp dir, no network, 30-second
    timeout
  - **Tier 2 (opt-in):** Docker with pre-cached base image
- Simple tasks (pip install, run script) → Tier 1
- Complex tasks (system deps, compilation) → Tier 2

### 10. GUI Automation Safety Contract

- Default: `ui.click`/`ui.type` require Level B (click-to-approve)
- Typed text is redacted in audit by default
- Snapshots are depth-limited (100 nodes default)
- All configurable via `tools.guiAutomation.*`
- Onboarding journey makes this transparent

---

## Part 3: Current State Assessment

Read the full evaluation document at:
`/home/profharita/Code/terminaI/codex_evaluation.md`

Key findings from that document:

### What's Strong Today

1. Real tool execution scheduler (`CoreToolScheduler`) with cross-surface
   approval contract
2. Deterministic Approval Ladder (A/B/C) wired into Shell with PIN verification
3. Operator-grade shell execution (PTY fallback, output truncation, binary
   detection, cancellation)
4. Provider architecture scaffolding (model routing + provider capabilities)
5. Remote relay crypto & pairing protocol

### Biggest Blockers

1. Governance consistency not centralized (Shell is ahead, other tools lag)
2. Brain has bypass path (`FW_SCRIPT` executes via `REPLManager` without
   approvals/audit)
3. Auditability incomplete (no unified governance ledger)
4. Evolution Lab runs on host by default (unsafe for adversarial tasks)
5. Desktop PTY is not operator-grade
6. Branding migration incomplete
7. CI/DX friction and partial test visibility

### Dependency Order

1. Centralize governance primitives
2. Audit ledger v1
3. Eliminate bypass paths
4. Evolution Lab safety harness
5. Ship differentiated operator surfaces safely
6. Desktop PTY hardening
7. Remote governance hardening
8. Provider boundary + platformization

---

## Part 4: Your Deliverables

**IMPORTANT: Do not execute any code changes yet. Produce specifications only.**

### Deliverable A: Technical Specification Document

Create a file `TECHNICAL_SPEC.md` with the following structure for EACH of the
14 initiatives:

````markdown
## Initiative N: [Name]

### Summary

One paragraph describing the goal and scope.

### Affected Files

List every file that needs to change:

- `path/to/file.ts` — Description of changes needed
- `path/to/other.ts` — Description of changes needed

### Interface Changes

Any new types, exports, or API changes:

```typescript
// New types to add
interface NewType { ... }
```
````

### Implementation Details

Step-by-step description of what code changes are needed.

### Migration Strategy

How to transition existing behavior without breaking.

### Testing Strategy

- What new tests to add
- What existing tests to update
- Edge cases to cover

### Verification Criteria

Exact commands to run and expected output.

### Dependencies

Which other initiatives must be completed first.

### Estimated Effort

T-shirt size (S/M/L/XL) with justification.

````

### Deliverable B: Sequenced Task Checklist

Create a file `TASK_CHECKLIST.md` with:

```markdown
# TerminaI Professionalization Task Checklist

## Phase 1: Safe-to-Oneshot
- [ ] **Initiative 1: Branding migration cleanup**
  - [ ] Update docs/*.md files
  - [ ] Add TERMINAI_* env var shims in paths.ts
  - [ ] (etc. - detailed sub-tasks)
- [ ] **Initiative 2: CI determinism fix**
  - [ ] (detailed sub-tasks)
...

## Phase 2: Governance & Safety
- [ ] **Initiative 6: Eliminate brain bypass paths**
  - [ ] (detailed sub-tasks)
...

## Phase 3: Product Surfaces
- [ ] **Initiative 10: Recipes v0**
  - [ ] (detailed sub-tasks)
...
````

### Deliverable C: Risk Assessment

For each initiative, identify:

- What could go wrong
- Rollback strategy if it breaks
- Files that are high-risk (touched by many systems)

---

## Part 5: After I Review

Once I approve your specification:

1. I will say "Execute Phase 1" (or specific initiatives)
2. You will execute those tasks sequentially
3. After each initiative, run the verification command
4. Report pass/fail before proceeding to next initiative

---

## Part 6: Key File Locations

### Core Architecture

- Tool scheduler: `packages/core/src/core/coreToolScheduler.ts`
- Approval ladder: `packages/core/src/safety/approval-ladder/`
- Shell tool: `packages/core/src/tools/shell.ts`
- Brain orchestrator: `packages/core/src/brain/thinkingOrchestrator.ts`
- Framework selector: `packages/core/src/brain/frameworkSelector.ts`
- REPL manager (bypass risk): `packages/core/src/brain/replManager.ts`

### CLI/UI

- Main entry: `packages/cli/src/gemini.tsx`
- Non-interactive: `packages/cli/src/nonInteractiveCli.ts`
- Slash commands: `packages/cli/src/ui/commands/`
- Hooks: `packages/cli/src/ui/hooks/`

### Evolution Lab

- Sandbox: `packages/evolution-lab/src/sandbox.ts`
- Runner: `packages/evolution-lab/src/runner.ts`
- CLI: `packages/evolution-lab/src/cli.ts`

### Configuration

- Paths: `packages/core/src/utils/paths.ts`
- Constants: `packages/core/src/config/constants.ts`
- Settings schema: `schemas/settings.schema.json`

### CI/CD

- Main workflow: `.github/workflows/ci.yml`
- Build script: `scripts/build.js`

---

## Part 6: Constraints

1. **Minimal fork:** Prefer configuration/prompt overrides over core rewrites
2. **Safety first:** Deterministic enforcement is the last line of defense
3. **Bounded outputs:** No unbounded logs, memory growth, or token costs
4. **Upstream compatibility:** Isolate divergence behind shims

---

## Begin Work

Start by reading:

1. `/home/profharita/Code/terminaI/codex_evaluation.md` (full context)
2. `/home/profharita/Code/terminaI/openquestions.md` (decisions reference)

Then produce:

1. `TECHNICAL_SPEC.md` — Detailed specification for all 14 initiatives
2. `TASK_CHECKLIST.md` — Sequenced task list for execution

**DO NOT make any code changes until I review and approve your specifications.**
