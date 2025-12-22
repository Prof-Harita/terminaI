# Web Remote (A2A) Guide

Run a single local/remote agent backend (A2A) and connect clients (Desktop,
browser, custom).

## Overview

Web Remote starts an **A2A server** that exposes the agent over HTTP(S).

Clients:

- **Desktop app (Tauri)**: recommended today (it speaks A2A directly).
- **Browser UI**: available at `/ui`.
- **Custom clients**: can use A2A JSON-RPC + SSE, with token + replay
  signatures.

**Status:** 🚧 Beta

## Architecture

```
[Client (Desktop/Web)] ←→ [A2A Server] ←→ [Local terminaI Agent]
       (Any)             (HTTP)           (Your Machine)
```

## Setup

### 1. Start Web Remote

Run terminaI with the `--web-remote` flag:

```bash
terminai --web-remote
# or
npm start -- --web-remote
```

By default it binds to `127.0.0.1` and chooses a random free port.

To pin a port:

```bash
terminai --web-remote --web-remote-port 41242
```

The CLI prints:

- the listening URL (host/port)
- the UI URL (may include a `?token=...` on first run)
- token storage notes

### 2. Connect

#### Desktop App (recommended)

- Open the Desktop app and set:
  - **Agent URL**: `http://127.0.0.1:<port>`
  - **Token**: the token printed by the CLI

If the CLI says the token is “stored hashed” (and it didn’t print it), rotate
it:

```bash
terminai --web-remote-rotate-token
```

#### Browser UI (experimental)

Open the `/ui` URL printed by the CLI.

- If the token was printed as `?token=...`, the UI stores it locally and removes
  it from the URL.
- If the token is not printed (stored hashed), rotate it first with
  `terminai --web-remote-rotate-token`.

## Features

- **Full Chat Interface**: Talk to your agent just like in the terminal.
- **Streaming Responses**: Real-time output streaming.
- **Tool Confirmations**: Approve or deny sensitive tool executions directly
  from the client UI.
- **Single backend**: same A2A surface works for local and remote clients.

## Security

The Web Remote is designed to be **safe by default**:

- **Authentication**: Bearer token required for API access.
- **Replay Protection**: All state-changing requests require a cryptographic
  signature (HMAC-SHA256) and a unique nonce to prevent replay attacks.
- **CORS Policy**: Cross-Origin Resource Sharing is strictly limited. By
  default, only same-origin requests are allowed. Use
  `--web-remote-allowed-origins` to whitelist other domains.
- **Token Rotation**: Use `--web-remote-rotate-token` to generate a new secret
  if you believe yours is compromised.

**Limitations**:

- The server binds to `127.0.0.1` by default. To expose it to the network, set
  `--web-remote-host` and you must also pass `--i-understand-web-remote-risk`.
- The built-in browser UI is intended for development and internal use; prefer
  Desktop for “daily driver” usage.

## Configuration

| Flag                                     | Description                                                       |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `--web-remote`                           | Enable the web remote server.                                     |
| `--web-remote-port <port>`               | Specify a custom port (default: random free port).                |
| `--web-remote-host <host>`               | Bind to a specific host (default: 127.0.0.1).                     |
| `--web-remote-token <token>`             | Manually specify the auth token (not recommended for production). |
| `--web-remote-rotate-token`              | Generate a new random token and update stored auth state.         |
| `--web-remote-allowed-origins <origins>` | Comma-separated list of allowed CORS origins.                     |
