# Safety Architecture (TerminaI)

TerminaI’s safety model is built around one core split:

- **Deterministic enforcement** decides what review level is minimally required.
- **The model/brain** decides _how to proceed safely_ (preview/plan/explain),
  but cannot lower the deterministic minimum.

## Invariants

1. **Everything is possible with explicit user confirmation.** The system should
   escalate review, not permanently block safety-related actions.
2. **Fail closed.** If an action can’t be parsed/understood confidently, require
   higher review.
3. **Minimum review cannot be downgraded by the model.** The model may only
   increase caution.
4. **Plain-English consent.** Before Level B/C actions, the user sees what will
   happen and why it’s risky (direct + indirect consequences).
5. **Provenance-aware.** Untrusted sources can inform investigation but must not
   silently authorize execution.

## Approval ladder (A/B/C)

- **A**: no approval needed
- **A** typically covers read-only work and explicitly low-impact reversible
  actions (e.g. some `git` operations).
- **B**: click-to-approve after explanation
- **C**: click-to-approve + 6-digit PIN (`security.approvalPin`, default
  `000000`)

## Pipeline (end-to-end)

1. **Provenance tagging**: label inputs and requested actions (local user vs
   web-remote user vs workspace file vs tool output).
2. **Structured parsing → ActionProfile**: normalize the tool call into a
   deterministic representation.
3. **Minimum review computation**: compute the minimum review level (A/B/C) from
   the profile + context bumps (e.g., outside-workspace).
4. **Enforcement**: if minimum is B/C, require the appropriate approval UX; for
   C require PIN verification.
5. **Brain routing (UX only)**: generate the explanation, preflight suggestions,
   and safer sequencing; may increase review level, never reduce it.
6. **Execution + sandbox**: run the tool; sandbox reduces blast radius but does
   not replace approvals.
7. **Audit**: record action profile + approval outcome for debugging and UX
   tuning (not auto-escalation).

## Current implementation notes

- The shell tool computes a deterministic minimum review level and emits:
  - `reviewLevel` (A/B/C)
  - `requiresPin` (true for Level C)
  - `explanation` (deterministic reasons)
- CLI/Desktop/Web all render the same confirmation details and enforce PIN entry
  when required.
