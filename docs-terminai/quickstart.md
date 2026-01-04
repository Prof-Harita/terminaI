# Quickstart Guide

Get up and running with TerminaI in 5 minutes.

## Installation

### From Source (Recommended for now)

```bash
# Clone the repo
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI

# Install dependencies and build
npm ci
npm run build

# Link the CLI
npm link --workspace packages/cli

# Run it
terminai
```

### NPM (Coming Soon)

```bash
npm install -g @terminai/cli
```

## Authentication

TerminaI uses OAuth (browser flow) or an API key for model access.

### Option 1: Login with Google (Recommended)

```bash
terminai
# Follow the browser authentication flow
```

### Option 2: API Key

```bash
export TERMINAI_API_KEY="YOUR_API_KEY"
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

## Verification

After installation, verify your setup:

```bash
# CLI verification
terminai --version
# Should print: terminai vX.Y.Z

# Desktop verification
# Launch the app and check About → version matches release
```

## Next Steps

- [Voice Guide](./voice.md) - Offline voice install + usage
- [Web Remote (A2A) Guide](./web-remote.md) - Connect Desktop/web clients
- [Desktop App Guide](./desktop.md) - Tauri Desktop client
- [Safety Guide](./safety.md) - Approval ladder (A/B/C) + PIN
- [Configuration](./configuration.md) - Settings and flags

## Optional: Run the Desktop App (Tauri)

The Desktop app can run an embedded agent (via a bundled CLI sidecar) or connect
to an external agent.

```bash
npm -w packages/desktop run dev
```

In the Desktop app, set:

- **Agent URL**: the A2A server URL (e.g. `http://127.0.0.1:41242`)
- **Token**: the web-remote token printed by the CLI (see Web Remote guide)
