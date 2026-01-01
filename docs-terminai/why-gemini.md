# Why the Gemini CLI core?

TerminaI is building “governed autonomy” on top of a proven, test-heavy upstream
engine.

## The short version

We reuse the Gemini CLI core today because it already provides:

- a working interactive CLI and tool scheduler
- extensive tests and battle-tested edge handling
- a model integration layer that can evolve independently

This lets TerminaI focus on the differentiators:

- system operator UX
- PTY execution (real TUIs)
- approvals/policy
- auditability
- A2A + MCP integration

## What TerminaI is _not_ doing (yet)

- ripping out the upstream engine
- forcing a breaking provider abstraction

We prefer **alias & append**: keep compatibility, ship identity and
capabilities.
