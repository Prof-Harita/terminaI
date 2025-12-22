# Safety Guide

terminaI is a “terminal operator”. Safety is enforced in layers:

- **Deterministic enforcement** (parser/policy driven) is the line of defense.
- **Model risk assessment** is used for UX (explain consequences, choose
  preview/confirm), not for final allow/deny.

## Approval ladder (A/B/C)

TerminaI routes actions into three review levels:

- **Level A**: no approval (read-only, bounded, reversible; includes low-impact
  git ops like `git add` / `git commit`)
- **Level B**: click-to-approve after a clear plain-English explanation of
  ramifications
- **Level C**: click-to-approve + a 6-digit PIN for extreme/irreversible actions

If parsing is uncertain or scope is unbounded, TerminaI fails closed into a
higher level.

## PIN

PIN is stored in settings as `security.approvalPin` (default: `000000`). See
[Configuration](./configuration.md).

## Where it applies today

- **Shell tool**: uses a deterministic action profile + minimum review
  computation; Level C requires PIN.
- **Other tools**: continue to use tool-specific confirmation prompts; they
  should migrate to the same ladder over time.

## In clients

The same confirmation semantics work across:

- CLI (Ink TUI)
- Desktop (Tauri)
- Browser `/ui` (A2A web client)

Level C prompts for a PIN in all clients.

## Architecture details

See [Safety Architecture](./safety-architecture.md) for the detailed pipeline
and invariants.
