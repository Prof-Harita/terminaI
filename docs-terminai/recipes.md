# System Operator Recipes

Recipes are reusable, human-readable playbooks that TerminaI can execute _under
governance_.

They are meant to be:

- **reviewable** (humans can understand them)
- **composable** (small building blocks)
- **safe-by-default** (confirmations for risky steps)

## What belongs in a recipe

A good recipe includes:

- **Goal**: what problem it solves
- **Pre-checks**: how to detect the issue
- **Plan**: ordered steps
- **Verification**: how to confirm success
- **Rollback**: how to undo if possible

## Examples (starter ideas)

- Fix: “Docker daemon not running”
- Fix: “Port already in use”
- Fix: “Disk full on Linux”
- Repair: “Broken apt dependencies”
- Ops: “Restart service and verify health”

## Where recipes live

Recipes are expected to evolve. If you’re contributing, propose the location via
an issue first.

## Contribution guidelines

- Prefer **idempotent** actions.
- Avoid destructive commands unless explicitly guarded with confirmations.
- Include verification commands.
- Assume the operator has limited context; write explicit, checkable steps.
