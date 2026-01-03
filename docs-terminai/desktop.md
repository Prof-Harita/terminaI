# Desktop App (Tauri) Guide

The Desktop app provides a GUI for TerminaI.

It supports two modes:

1. **Embedded agent (recommended)**: Desktop spawns a bundled `terminai-cli`
   sidecar and connects to it automatically.
2. **External agent**: Desktop connects to an A2A/Web Remote server you started
   yourself.

Desktop does not implement its own OAuth. Authentication is handled by the agent
backend (embedded sidecar or external server).

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

## Installation

### Linux

Download from
[GitHub Releases](https://github.com/Prof-Harita/terminaI/releases):

- `.deb` for Debian/Ubuntu: `sudo dpkg -i terminai_*.deb`
- `.AppImage` for other distros:
  `chmod +x TerminaI*.AppImage && ./TerminaI*.AppImage`

### Windows

Download the `.msi` installer from
[GitHub Releases](https://github.com/Prof-Harita/terminaI/releases) and run it.

> [!NOTE] Desktop installers bundle the CLI as an internal sidecar
> (`terminai-cli`). They do **not** install `terminai` onto your system PATH.
> For CLI access, use `npm i -g @terminai/cli` separately.

## Verification Checklist

After installation, verify your setup:

### Linux

```bash
# 1. Launch the Desktop app
# 2. Check "About" → version should match the release
# 3. Enter a prompt and verify the embedded sidecar responds
```

### Windows

```powershell
# 1. Launch TerminaI from Start Menu
# 2. Check Help → About → version should match the release
# 3. Enter a prompt and verify the embedded sidecar responds
```

## Accessibility

The Desktop app strives for WCAG compliance:

- **Screen readers**: Full ARIA support, including `role="main"` regions and
  labeled controls.
- **Keyboard navigation**: Full keyboard support.
- **Voice**: Hands-free operation via "system operator" voice mode.

## Run (from repo)

```bash
npm -w packages/desktop run dev
```

## Embedded agent (default)

On first launch, Desktop starts an embedded agent (the bundled sidecar). If the
agent cannot reach the model (OAuth not completed yet), run `terminai` once in a
terminal and finish the browser auth flow (or set `TERMINAI_API_KEY`).

## Connect to an external agent

1. Start the server in a terminal:

```bash
terminai --web-remote --web-remote-port 41242
```

2. In the Desktop app, set:

- **Agent URL**: `http://127.0.0.1:41242`
- **Token**: the token printed by the CLI (rotate with
  `terminai --web-remote-rotate-token` if needed)
- **Workspace Path**: server-side path the agent should operate in

## Connect to a remote agent

- Start the server with `--web-remote-host` and the required risk
  acknowledgement flag.
- Use the remote URL + token in the Desktop app.

See `docs-terminai/web-remote.md` for the server flags.
