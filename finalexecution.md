## Prompt: Execute Initiatives 11–14 (Phase 3) per TASK_CHECKLIST

You are the execution agent picking up after Initiatives 1–10 on branch
`professionalization/execute-all`. Execute Initiatives 11–14 in order, honoring
all binding decisions/specs and the same commit/verification rules.

### Context

- Repo: `/home/profharita/Code/terminaI`, branch
  `professionalization/execute-all`.
- Binding decisions/specs: `openquestions.md`, `TECHNICAL_SPEC.md`,
  `TASK_CHECKLIST.md`, `RISK_ASSESSMENT.md`, `codex_evaluation.md`.
- Completed work/notes: `implementation_summary.md` (covers Initiatives 1–10),
  existing commits through `467eb4cb`.
- Hard constraints (from TASK_CHECKLIST & decisions):
  - Execute Initiatives 11 → 14 sequentially; after each initiative run required
    verification(s) and commit: message
    `phase<3>: initiative <N> - <short name>`, include only relevant files.
  - Audit non-disableable; Brain authority model; PTY parity; Remote
    consent/indicator; Upstream via shims; Safety invariants (no hard blocks,
    Level C PIN, ELI5 warnings); Recipes trust model; Brain local exec tiering;
    GUI safety defaults.
  - No logic changes where Phase 1 said none; minimal fork, bounded outputs.
  - Fix issues you introduce or that block required verifications; no broad
    refactors.
  - Keep outputs bounded (no unbounded logs/memory).
  - If sandbox/network blocks a required step, note it and seek minimal
    workaround; do not violate policy.

### Remaining Initiatives (from TASK_CHECKLIST/TECHNICAL_SPEC)

- **11: GUI automation hardening** — A/B/C ladder defaults for UI mutators (B by
  default), typed text redaction audit default, snapshot depth/rate limits,
  bounded evidence hashes, audit wiring. Verify: Level B prompts for
  `ui.click`/`ui.type`; audit shows redacted typed text + evidence hashes.
- **12: Evolution Lab safety harness** — Docker sandbox hardening (no network,
  explicit mounts/resources), deterministic regression suite + fixtures, CI job.
  Verify: `evolution-lab suite` in Docker, CI job green (document if CI-only).
- **13: Desktop PTY hardening** — Resize support, kill/stop (graceful then
  force), backpressure/bounded buffering, minimal integration test harness
  (platform-gated OK). Verify: manual resize/kill; no hangs on large output.
- **14: Voice mode v0** — AudioRecorder abstraction (clear errors), wire
  `VoiceStateMachine` events in `AppContainer.tsx` (start/stop/PTT release
  submit), extend settings schema for whisper binary/model paths,
  `/voice install` persists install metadata. Verify: Manual `terminai --voice`
  PTT → transcription → prompt submit.

### Execution Rules

1. Read relevant spec sections for each initiative before coding.
2. Run `git status` first; if unrelated dirty files appear, pause/ask. Do not
   revert user changes.
3. Per initiative:
   - Implement per spec/checklist; keep scope tight.
   - Run required verification commands; if they fail, fix and re-run until
     pass.
   - Commit with required message format; only initiative-relevant files.
4. Stop/ask if an initiative can’t be done without violating binding decisions
   or requires major unplanned refactor.
5. If network/escalation is required and blocked by sandbox, request approval
   with justification (unless policy forbids).

### Suggested Flow

1. Re-read TASK_CHECKLIST sections for Initiatives 11–14 + TECHNICAL_SPEC
   details.
2. For each initiative: implement → run verifications → commit.
3. Keep notes of verifications run for final report.

Deliverable: completed Initiatives 11–14 with per-initiative commits and passing
verifications, ready for final summary.
