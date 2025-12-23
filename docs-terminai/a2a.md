# A2A (Agent-to-Agent) Protocol

A2A is TerminaI’s remote control plane.

It allows external clients (Desktop app, browser UI, IDE integrations, scripts)
to:

- submit tasks
- stream events/output
- receive tool confirmations
- replay sessions

This project currently ships an HTTP server in `packages/a2a-server/`.

## Security model (current)

- The server is intended to bind to **loopback** by default.
- Clients authenticate using a shared token and request signing / replay
  protection.
- Tokens should be treated like secrets.

Operational tips:

- rotate token if leaked: `terminai --web-remote-rotate-token`

## Concepts

- **Task**: a unit of work (prompt + context + execution mode)
- **Run**: a single execution of a task
- **Events**: streamed output and state transitions

## High-level flow

1. Start the agent backend:

   ```bash
   terminai --web-remote
   ```

2. Connect a client (Desktop or browser `/ui`).
3. Client submits tasks; server streams events.

## Protocol surface (developer view)

Exact routes may evolve, but common groups include:

- **Auth**: token setup/rotation
- **Task execution**: create task, stream events, cancel
- **Replay**: fetch stored request/response streams

For implementation details, see:

- `packages/a2a-server/src/http/`

## Planned hardening (roadmap)

- explicit pairing handshake
- short-lived client tokens (JWT)
- per-client revocation
- structured audit log integration
