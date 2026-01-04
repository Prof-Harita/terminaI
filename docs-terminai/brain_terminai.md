# TerminaI brain architecture

This document explains how TerminaI’s “brain” works today, where it is enforced
in code, and how `terminaI.md` context should interact with it.

It is written for contributors who want to understand (and safely evolve) the
system operator loop.

## What “the brain” means in TerminaI

TerminaI is a governed system operator. “The brain” is the combination of:

- The **system prompt** (core operational instructions sent to the model).
- The **policy engine + approval ladder** (deterministic execution governance).
- The **cognitive architecture modules** (risk assessment, system spec, and
  optional thinking frameworks).
- The **context system** (`terminaI.md`, MCP instructions) that augments the
  model with project and user guidance.

In practice, safety and tool routing are enforced by code (policy + tools),
while problem solving is a hybrid of prompt-driven behavior and (increasingly)
code-level cognitive scaffolding.

## High-level runtime flow

At a high level, a single turn looks like this:

1. Load context (system prompt, `terminaI.md`, MCP instructions).
2. Send prompt to the model.
3. If the model requests tools, route each tool call through:
   - policy decisions (allow/ask/deny)
   - the approval ladder (A/B/C)
   - tool execution + audit/logging
4. Stream results back to the model until the turn completes.

The brain’s “extra cognition” shows up in two places today:

- **SystemSpec injection**: the system prompt includes machine capabilities.
- **Risk assessment for shell commands**: the shell tool evaluates risk and can
  escalate review (depending on `brain.authority`).

## Inputs the model receives

### Core system prompt (firmware)

The core system instructions are built in `@terminai/core` and are attached to
every model call as the `systemInstruction`.

- Source: `packages/core/src/core/prompts.ts` (`getCoreSystemPrompt`)
- Override: `TERMINAI_SYSTEM_MD` (mirrored to legacy `GEMINI_SYSTEM_MD`)
- Export current default prompt: `TERMINAI_WRITE_SYSTEM_MD=1`

The system prompt is where you put non-negotiable rules (tool protocol,
governance, safety invariants). Avoid duplicating those rules in `terminaI.md`.

### Hierarchical memory (`terminaI.md`) and MCP instructions (strategy)

The context system loads `terminaI.md` files and concatenates them into a single
memory blob that is appended to the system prompt.

Default discovery order:

1. Global: `~/.terminai/terminaI.md`
2. Project: `terminaI.md` in the current directory and parent directories up to
   the git root
3. Optional: subdirectory `terminaI.md` files (and JIT context when enabled)
4. Active extension context files
5. MCP server instructions

Key implementation:

- Loading: `packages/core/src/services/contextManager.ts`
- Discovery + concatenation: `packages/core/src/utils/memoryDiscovery.ts`
- Imports: `packages/core/src/utils/memoryImportProcessor.ts` (supports `@...`)

**Important constraint:** imports are restricted to the project root (git root,
or `~/.terminai` for global memory). Imports outside the root are rejected by
`validateImportPath()`.

### SystemSpec (capability snapshot)

TerminaI maintains a cached snapshot of the system’s capabilities and injects it
into the system prompt.

- Scanner + cache: `packages/core/src/brain/systemSpec.ts`
- Prompt formatter: `packages/core/src/brain/systemSpecPrompt.ts`
- Cache file: `~/.terminai/system-spec.json`
- Refresh behavior:
  - loaded on startup
  - re-scanned if missing or stale (24 hours)

The CLI wires this during startup:

- `packages/cli/src/core/initializer.ts`

## Risk assessment and proportional execution (current “brain” in production)

### Overview

Before confirming a shell command, TerminaI evaluates risk along six dimensions
and can adjust:

- confirmation copy (more explicit for elevated/critical commands)
- warning banners
- approval ladder escalation (depending on `brain.authority`)

This risk assessment is designed to add “safety cognition” without forcing a
deterministic plan for every task.

### Risk assessor

`packages/core/src/brain/riskAssessor.ts` produces a `RiskAssessment`:

- Heuristic scoring first (`patterns.ts`)
- Optional LLM scoring when heuristics are low confidence
  (`prompts/riskAssessment.ts`)
- Environment classification (`environmentDetector.ts`)
- Confidence adjustment from local outcomes (`historyTracker.ts`)

The output:

```ts
interface RiskAssessment {
  dimensions: {
    uniqueness: number;
    complexity: number;
    irreversibility: number;
    consequences: number;
    confidence: number;
    environment: 'dev' | 'staging' | 'prod' | 'unknown';
  };
  overallRisk: 'trivial' | 'normal' | 'elevated' | 'critical';
  reasoning: string;
  suggestedStrategy: 'fast-path' | 'preview' | 'iterate' | 'plan-snapshot';
}
```

### Execution router

`packages/core/src/brain/executionRouter.ts` maps `overallRisk` to an execution
decision (preview/iterate/plan-snapshot) plus confirmation and warning strings.

### Shell tool integration

The shell tool uses the brain to:

- generate better confirmation messages for risky commands
- optionally surface warnings and diagnostic suggestions
- log outcomes for future confidence adjustment

Entry point:

- `packages/core/src/tools/shell.ts` (`evaluateBrain()`,
  `applyBrainAuthority()`)

### Brain authority mode

`brain.authority` controls how much the brain can influence the approval ladder
for shell tool calls:

- `advisory`: brain does not affect review
- `escalate-only`: brain can raise review (A→B, B→C), never lower (default)
- `governing`: brain can force review changes (dangerous)

The effective authority is resolved from settings and policy floors:

- `packages/core/src/config/brainAuthority.ts`
- `packages/core/src/policy/config.ts`

## Thinking frameworks (System 2 scaffolding)

The cognitive architecture also includes “thinking frameworks” intended to
improve reliability on complex tasks:

- `FW_DIRECT`: direct execution for simple tasks
- `FW_SEQUENTIAL`: hypothesis → test → observe for diagnosis
- `FW_CONSENSUS`: parallel advisors propose approaches, then choose
- `FW_REFLECT`: generate → critique → refine for high-stakes correctness
- `FW_SCRIPT`: generate a throwaway script (REPL) for complex logic/data work

Key modules:

- Framework selection: `packages/core/src/brain/frameworkSelector.ts`
- Consensus advisors: `packages/core/src/brain/advisors/*` and `consensus.ts`
- PAC loop + step-back: `packages/core/src/brain/pacLoop.ts`,
  `packages/core/src/brain/stepBackEvaluator.ts`
- Orchestration wrapper: `packages/core/src/brain/thinkingOrchestrator.ts`

**Current status:** these frameworks exist as building blocks and are covered by
unit tests, but they are not yet the default “outer loop” for interactive CLI
turns. The primary production brain behavior is still largely prompt-driven,
with code-level cognition focused on system spec and risk gating.

## How `terminaI.md` should interact with the brain

Because `terminaI.md` is appended to the system prompt, it can strongly shape
behavior. To keep TerminaI a strong general problem solver, the rule of thumb
is:

- Put **invariants** in the system prompt + policy engine.
- Put **strategy and domain context** in `terminaI.md`.

### Recommended content for `terminaI.md`

Use `terminaI.md` for guidance that improves solutions without constraining the
agent into brittle scripts:

- Domain context (“what this repo is”, “what matters”, “where logs live”)
- Constraints (“do not touch production”, “never rotate real credentials”)
- Preferences (“prefer apt over snap”, “prefer reversible steps”)
- Soft process (“diagnose → act → verify; if stuck, broaden approach”)

Avoid putting these in `terminaI.md`:

- Tool mechanics and approval ladder rules (belongs in system prompt/policy)
- Long command lists that become stale
- Secrets or sensitive data

### Proposed “context packs” (new files)

To make context robust without making it rigid, use small imported modules that
act as “soft scaffolding”.

Global (user-level) example:

```markdown
# ~/.terminai/terminaI.md

@./packs/operator.md @./packs/user-preferences.md

## Machine constraints

- GUI automation is unavailable on this host.
```

Project (repo-level) example:

```markdown
# <repo>/terminaI.md

@./.terminai/context/project-contract.md @./.terminai/context/runbooks.md
@./.terminai/context/dev-conventions.md
```

Why packs help:

- They keep the “Using: N terminaI.md files” UI summary clean.
- They enable versioned, composable guidance.
- They are easy to tune centrally (via releases) and validate via Evolution Lab.

## How Evolution Lab fits (future-proofing)

Evolution Lab is a central, internal harness that:

- generates a large task set
- runs TerminaI in sandboxed environments
- aggregates failure clusters for engineering action

See: `docs-terminai/evolution_lab.md`.

To make the brain future-proof, treat these artifacts as first-class, versioned
inputs that Evolution Lab can evaluate:

- system prompt defaults
- policy defaults and recipes
- brain modules (risk assessor thresholds, framework routing)
- default context pack templates

This approach keeps customers safe and flexible today, while allowing rapid,
measured improvements as Evolution Lab comes online.
