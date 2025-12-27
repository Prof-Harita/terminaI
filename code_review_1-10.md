## Prompt: Phase 1–3 (Initiatives 1–10) Code Review

You are a fresh reviewer verifying that Initiatives 1–10 meet/exceed the binding
specs and runbook. Do a deep code review (not a rewrite). Treat this as a formal
gate: enumerate bugs, regressions, spec gaps, sloppy code, and integration
risks. If something is perfect, say so explicitly. If you find issues, cite
`file:line` and why it violates the spec or introduces risk.

### Context

- Repo: `/home/profharita/Code/terminaI`, branch
  `professionalization/execute-all`.
- Specs/decisions to honor: `openquestions.md` (binding decisions),
  `TECHNICAL_SPEC.md`, `TASK_CHECKLIST.md`, `RISK_ASSESSMENT.md`,
  `codex_evaluation.md`.
- Status tracker: `implementation_summary.md` (covers Initiatives 1–10; use for
  declared work/risks).
- Scope of review: Initiatives 1–10 only (Phase 1 “Safe-to-Oneshot” and Phase 2
  governance & audit; Phase 3 recipes v0). Later initiatives (11–14) are out of
  scope.

### What to review (Initiatives 1–10)

- I1 Branding migration: TERMINAI env/doc alignment, `.terminai` + legacy
  fallback, wrapper ordering, UX strings mentioning both prefixes.
- I2 CI determinism: `.github/workflows/ci.yml` ordering (`npm ci` before
  build), `scripts/build.js` deterministic, build script tests.
- I3 Evolution Lab: sandbox default docker, host gated, CLI flags, docs/tests.
- I4 Framework selector: removal of `FW_DECOMPOSE`, mapping to supported
  framework, prompts/tests.
- I5 Audit schema (types only) exported via core index.
- I6 Brain bypass removal + tiered REPL: FW_SCRIPT routed through governed REPL,
  non-interactive fails closed unless governed, tier1/2 sandbox plumbing, tests.
- I7 Provenance threading + remote consent/indicator + `--remote-bind` gating;
  provenance in scheduler/tool confirmations; shell provenance.
- I8 Central approval ladder: non-shell action profile builder, UI operation
  class, Level C PIN consistency, ELI5 warnings, brain authority setting/policy
  lock, ladder applied to mutating tools, tests.
- I9 Audit ledger v1: hash-chain ledger, write/export redaction, storage paths,
  scheduler hooks, audit settings (non-disableable), CLI `/audit` with tests;
  brain query helper.
- I10 Recipes v0: recipe schema/loader/executor, trust model
  (built-in/user/community with confirmation + trust store), built-in recipes,
  CLI `/recipes` command, audit metadata per step, review-floor enforcement,
  settings/schema updates, tests.

### Recent work to verify

- Commits: `14a46a78`, `8e964f87`, `2190216f`, `300ca923`, `12d0bbb4`,
  `18356bc3`, `a2448f12`, `70a74888`, `8c499eaf`, `c9037210`, `467eb4cb`.
- Tests run by implementer: `npm run test --workspace @terminai/core`,
  `npm run test --workspace @terminai/cli`,
  `npm run build --workspace @terminai/cli`. Manual `/recipes list` was blocked
  in sandbox (EPERM bind); note if that’s a gap.

### Known constraints / do not flag as misses

- Network restricted; manual CLI run on `/recipes` blocked by sandbox EPERM
  bind—should only be an issue if code paths require real network.
- Later initiatives (11–14) not yet executed; ignore their absence.

### How to review

1. Read `implementation_summary.md` for declared work/risks.
2. Cross-check TASK_CHECKLIST vs code/tests/docs for Initiatives 1–10. Do not
   trust status blindly.
3. Run tests if needed (examples above). Keep outputs bounded.
4. Report findings ordered by severity with `file:line` references; include
   residual risks/testing gaps even if no concrete bug is found.
5. If an area is perfect, state that explicitly.

Deliverable: a detailed code review summary focusing on correctness, spec
compliance, and integration quality for Initiatives 1–10.
