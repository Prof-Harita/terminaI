# Governance

TerminaI is built around a simple principle: **autonomy without governance is a
bug**.

This document describes how the project makes decisions and how contributions
ship.

## Roles

- **Maintainers**: merge PRs, cut releases, set technical direction.
- **Contributors**: propose changes, implement features, improve docs/tests.

## Decision making

We prefer:

1. **Issues + lightweight proposals** for any non-trivial change.
2. **Small PRs** that are easy to review and revert.
3. **Compatibility-first** changes (avoid breaking existing user setups).

If a change impacts safety boundaries (policy/approval, auth, sandboxing, PTY
execution), maintainers may require:

- a short threat model
- tests proving the boundary
- an explicit rollback plan

## What needs an issue first

Open an issue before starting work if your change:

- adds or changes auth/token handling (A2A/web remote)
- changes approval ladder semantics
- modifies shell execution policy
- touches the desktop PTY bridge
- changes default behavior or config formats

## Release policy (today)

- The project tracks a stable upstream core and adds TerminaI-specific layers.
- We favor “alias & append” surface changes over deep refactors.

## Safety review checklist

For PRs that can execute commands or expose remote control:

- Does the action require confirmation at the correct approval level?
- Are secrets redacted from logs and UI?
- Is there an audit trail (or at least deterministic logging) for user actions?
- Are defaults safe (loopback binding, least privilege, minimal permissions)?

## Merge Policy (Required Checks)

To maintain stability and safety, the following checks are **REQUIRED** for all
PRs targeting `main`:

1.  **`ci` (Aggregator)**: The main CI job that runs lint, build, and tests must
    pass.
2.  **`forbidden_artifacts`**: No binary artifacts (.node, .exe, etc.) may be
    present in the PR diff.

The following checks are **ADVISORY** (Non-Blocking):

1.  **`link_checker`**: Link failures should be fixed but must not block code
    validation.
2.  **`codeql`**: Security scanning results are reviewed asynchronously.
