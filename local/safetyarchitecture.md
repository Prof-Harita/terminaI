# TermAI Safety Architecture

## Goals

TermAI is a “universal system operator”: it must be capable of running
_anything_, while ensuring the user remains in control—especially for
destructive or irreversible actions.

This design treats **tool safety as a deterministic enforcement problem** and
treats “AI risk assessment” as a **UX/strategy problem** (explain, preview,
plan, and request the right kind of approval).

## Core Principles (Invariants)

1. **Everything is possible with explicit user confirmation.** TermAI should not
   permanently block actions; it should escalate the required review level and
   require stronger consent.
2. **The last line of defense is deterministic.** LLM judgment is never the
   final guardrail for whether an action is allowed to run.
3. **Fail closed into higher review.** If TermAI cannot confidently interpret an
   action (parse ambiguity, missing context, unclear target), it must require a
   higher approval tier.
4. **Minimum required review cannot be downgraded by the LLM.** The model may
   only _increase_ caution, never decrease it below the deterministic minimum.
5. **Plain-English consent.** Before executing non-trivial actions, TermAI must
   clearly describe:
   - what it will do (step-by-step, in plain English),
   - direct and indirect consequences,
   - what could go wrong,
   - how to roll back / recover (when possible),
   - what remains unknown.
6. **Provenance-aware.** Inputs from untrusted sources (workspace files, web
   content, remote clients, tool output) can inform investigation but must not
   silently authorize execution.

## Approval Ladder (A/B/C)

TermAI uses three levels of user review. Each action has a **minimum required
level** computed deterministically from its structured action profile plus
context modifiers.

### Level A — No approval

Used for actions that are low-impact and effectively reversible or read-only.

Examples:

- read-only diagnostics (`ls`, `cat`, `free -h`, `ps`, `df`)
- non-destructive repo inspection (`git status`, `git log`, `git diff`)
- web search / fetch (subject to separate URL/trust controls)
- analysis-only responses (no tools)

### Level B — Click-to-approve (with explanation)

Used for meaningful state change or moderate blast radius. Requires a clear
explanation of ramifications and a standard confirmation.

Examples:

- package installs/uninstalls
- `git push` (especially to shared branches)
- file writes that overwrite existing content
- restarting a service or killing a process (depending on context)

### Level C — Click-to-approve + 6‑digit PIN (extreme actions)

Used for high irreversibility, high blast radius, or high uncertainty with
catastrophic downside.

Examples:

- recursive deletes with large scope (`rm -rf`, “delete database”, “wipe disk”)
- actions affecting system stability, boot, partitions, accounts, permissions
- destructive actions outside the current workspace scope (context bump)

**PIN:** user-set, stored in config as a 6-digit string.

- Default: `"000000"`
- Verification: exact match required
- Future hardening: enforce “not default”, rate limiting, lockout/backoff

## System Pipeline (End-to-End)

### 1) Provenance tagging (trust boundary)

Every candidate action/tool call is tagged with provenance, e.g.:

- `local_user`
- `web_remote_user`
- `model_suggestion`
- `workspace_file`
- `web_content`
- `tool_output`

Provenance affects required review level via context modifiers (see below), but
does not directly “allow” execution.

### 2) Deterministic action profiling (structured parse)

Before execution, TermAI builds an **ActionProfile** from tool args using
parsing and static analysis.

For shell commands, this means parsing into a command graph:

- sequences (`;`, newlines)
- conditionals (`&&`, `||`)
- pipelines (`|`, `|&`)
- substitutions (`$(...)`, backticks, `<(...)`, `>(...)`)
- redirects (`>`, `>>`, `2>`, `2>&1`, etc.)
- heredocs
- background jobs (`&`)
- prompt transformations / risky expansions (e.g. `${var@P}`) treated as unsafe

For file tools, this means extracting:

- operation type (read/write/delete/move/copy)
- resolved paths (workspace vs outside, symlinks, devices)
- recursive/overwrite flags

Output: a normalized profile such as:

```ts
type OperationClass =
  | 'read'
  | 'write'
  | 'delete'
  | 'privileged'
  | 'network'
  | 'process'
  | 'device'
  | 'unknown';

type ReviewLevel = 'A' | 'B' | 'C';

type ActionProfile = {
  toolName: string;
  raw: { command?: string; paths?: string[]; [k: string]: unknown };
  operations: Set<OperationClass>;
  roots: string[]; // command roots or tool sub-ops
  touchedPaths: string[]; // normalized/expanded when possible
  outsideWorkspace: boolean;
  usesSudoOrEquivalent: boolean;
  hasUnboundedScopeSignals: boolean; // globs, /, ~, “all”, unknown target count
  parseConfidence: 'high' | 'medium' | 'low';
};
```

### 3) Deterministic minimum review computation (A/B/C)

From the ActionProfile and environment context, TermAI computes:

- `minimumReviewLevel` ∈ {A, B, C}
- `requiredConsentArtifacts` (preview required? plan snapshot required? pin
  required?)
- `preflightRecommendations` (e.g., “list affected files first”, “estimate blast
  radius”)

**Context modifiers** (examples):

- If `outsideWorkspace === true`, bump required level by +1 (A→B, B→C).
- If provenance includes remote/untrusted sources, bump required level by +1
  when the operation is non-trivial.
- If `parseConfidence === low`, require Level C (because TermAI cannot safely
  reason about indirect effects without understanding the action).

### 4) Policy engine + safety checkers (enforcement)

The policy engine decides **allow / deny / ask_user**, but in TermAI this maps
onto the approval ladder:

- `allow` ⇒ proceed (still may show warnings/preview depending on UX rules)
- `ask_user` ⇒ require at least Level B (or C if minimumReviewLevel is C)
- `deny` ⇒ not “forever blocked”; instead it should translate into “needs
  stronger consent” when the denial is safety-related rather than admin policy.

Safety checkers enforce invariant constraints:

- allowed path scope checks for file tools
- disallow or escalate risky shell features when parsing is uncertain
- prevent prompt-injection sourced config changes in untrusted workspaces

### 5) Brain strategy routing (UX, not enforcement)

The brain layer consumes:

- ActionProfile
- minimumReviewLevel
- user request intent
- environment signals

It outputs:

- execution strategy (fast-path / preview / iterate / plan-snapshot)
- a plain-English explanation of what will happen
- direct + indirect consequences
- unknowns + preflight to reduce unknowns

**Important:** the brain may only _increase_ caution (e.g., B→C), never reduce
it below the minimumReviewLevel.

### 6) Consent UX and execution

Depending on required level:

- **A:** execute without confirmation
- **B:** show explanation + click approve
- **C:** show explanation + click approve + prompt for 6-digit PIN

Then execute under sandbox policy when enabled/configured. Sandbox reduces blast
radius but never replaces the ladder.

### 7) Audit + learning (non-authorizing)

Record:

- action profile
- approval level used
- user-approved or cancelled
- outcome + error

Use logs to:

- improve explanations
- suggest preflight checks
- calibrate “uncertainty” signals

**Never auto-escalate privileges or reduce required review purely from history
without explicit user opt-in.**

## The “6 Dimensions” Framework (Refined)

The original 6D model is useful, but it contains two different concepts:

### Safety impact (deterministic-ish)

- **Irreversibility**
- **Consequences / blast radius**
- **Privilege level**
- **Data sensitivity**
- **Scope** (paths touched, recursion, “all”)
- **Network/exfil potential**

These drive the deterministic minimumReviewLevel (A/B/C).

### Execution uncertainty (brain)

- **Complexity**
- **Uniqueness/novelty**
- **Confidence**
- **Ambiguity**

These drive strategy: preview vs plan snapshot vs diagnostic-first, and can
_raise_ the approval tier.

## Implementation Mapping (Current Code)

This architecture corresponds to existing components:

- Policy decisions: `packages/core/src/policy/policy-engine.ts`
- Safety checkers: `packages/core/src/safety/` (e.g., `AllowedPathChecker`)
- Shell parsing + structure: `packages/core/src/utils/shell-utils.ts`
- Shell allow/block enforcement: `packages/core/src/utils/shell-permissions.ts`
- Brain risk assessment + routing:
  - `packages/core/src/brain/riskAssessor.ts`
  - `packages/core/src/brain/executionRouter.ts`
- User confirmations: `packages/core/src/confirmation-bus/`
- Tool integration point (shell): `packages/core/src/tools/shell.ts`

### Known gaps / follow-ups

1. **Approval ladder is not yet centralized.**
   - Today, “risk” and confirmations are implemented in a few places. The A/B/C
     ladder should be a single shared module used by all tools.
2. **PIN confirmation is not yet implemented.**
   - Add config storage, UI prompt for 6-digit PIN on Level C, and verification.
3. **Policy `DENY` should distinguish admin-deny vs safety-escalate.**
   - Admin-deny: always deny.
   - Safety-deny: translate into “requires higher review”, not a permanent
     block.
4. **Structured “ramifications” output should be schema-driven.**
   - The LLM should return structured JSON for explanation sections to avoid
     omissions and to make UX consistent.
