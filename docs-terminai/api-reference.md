# Developer API Reference (high-level)

TerminaI is a monorepo. “API” here means the surfaces other developers integrate
with.

## 1) CLI surface

- Binary: `terminai`
- Entry: `packages/termai/src/index.ts`

## 2) A2A server surface

- Package: `packages/a2a-server/`
- HTTP routes: `packages/a2a-server/src/http/`
- Auth logic: `packages/a2a-server/src/http/auth.ts`

See also: `docs-terminai/a2a.md`.

## 3) MCP surface

- MCP client/tooling lives in core.
- Extension config lives in CLI settings.

Docs:

- `docs/tools/mcp-server.md`
- `docs/cli/tutorials.md` (MCP tutorial)

## 4) Safety / policy surface

- Approval ladder: `packages/core/src/safety/`
- Policy engine: `packages/core/src/policy/`

## 5) Desktop (PTY) surface

- Desktop app: `packages/desktop/`
- Tauri PTY bridge: `packages/desktop/src-tauri/src/pty_session.rs`
