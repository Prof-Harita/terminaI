# Quickstart Guide

Get up and running with terminaI in 5 minutes.

## Installation

### From Source (Recommended)

```bash
# From the repo root
npm ci
npm run build
npm link --workspace packages/termai

# Run it
terminai
```

### Optional: Add `gemini` Alias

For muscle memory compatibility:

```bash
./scripts/termai-install.sh --alias-gemini
```

## Authentication

terminaI uses Google OAuth (browser flow) or an API key for model access.

### Option 1: Login with Google (Recommended)

```bash
terminai
# Follow the browser authentication flow
```

### Option 2: API Key

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
terminai
```

## First Commands

### Interactive Mode

```bash
terminai
> What's eating my CPU right now?
> How much disk space do I have?
> Start the dev server and watch logs
```

### Slash Commands

- `/help` - Show available commands
- `/sessions` - List background processes
- `/exit` - Exit terminaI

## Next Steps

- [Voice Guide](./voice.md) - Offline voice install + usage
- [Web Remote (A2A) Guide](./web-remote.md) - Connect Desktop/web clients
- [Desktop App Guide](./desktop.md) - Tauri Desktop client
- [Safety Guide](./safety.md) - Approval ladder (A/B/C) + PIN
- [Configuration](./configuration.md) - Settings and flags

## Optional: Run the Desktop App (Tauri)

The Desktop app is an A2A client (it does not spawn the CLI).

```bash
npm -w packages/desktop dev
```

In the Desktop app, set:

- **Agent URL**: the A2A server URL (e.g. `http://127.0.0.1:41242`)
- **Token**: the web-remote token printed by the CLI (see Web Remote guide)
