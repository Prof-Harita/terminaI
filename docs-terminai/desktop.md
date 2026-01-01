# Desktop App (Tauri) Guide

The Desktop app is a client for the **A2A server**. It does not spawn the CLI
and it does not implement its own OAuth.

## Status

- ✅ Connects to an A2A server (local or remote) using token auth + replay
  signatures
- ✅ Streams assistant output and handles tool confirmations
- ✅ Voice: offline STT+TTS (download once → offline), with barge-in and spoken
  confirmations (including PIN prompts)

## Platform Support

| Platform | Status         |
| -------- | -------------- |
| Linux    | ✅ Supported   |
| Windows  | ✅ Supported   |
| macOS    | 🚧 Coming Soon |

## Accessibility

The Desktop app strives for WCAG compliance:

- **Screen readers**: Full ARIA support, including `role="main"` regions and
  labeled controls.
- **Keyboard navigation**: Full keyboard support.
- **Voice**: Hands-free operation via "system operator" voice mode.

## Run (from repo)

```bash
npm -w packages/desktop dev
```

## Connect to a local agent

1. Start the A2A server via the CLI:

```bash
terminai --web-remote --web-remote-port 41242
```

2. In the Desktop app:

- **Agent URL**: `http://127.0.0.1:41242`
- **Token**: the token printed by the CLI (rotate with
  `terminai --web-remote-rotate-token` if needed)
- **Workspace Path**: server-side path the agent should operate in

If the agent cannot reach the model (OAuth not completed yet), run `terminai`
once in a terminal and finish the browser auth flow.

## Connect to a remote agent

- Start the server with `--web-remote-host` and the required risk
  acknowledgement flag.
- Use the remote URL + token in the Desktop app.

See `docs-terminai/web-remote.md` for the server flags.
