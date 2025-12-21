# Quickstart Guide

Get up and running with terminaI in 5 minutes.

## Installation

### From Source (Recommended)

```bash
git clone https://github.com/Prof-Harita/termAI.git
cd termAI
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

terminaI uses Google OAuth for Gemini API access.

### Option 1: Login with Google (Recommended)

```bash
terminai
# Follow the browser authentication flow
```

**Free tier:** 60 requests/min, 1,000 requests/day, Gemini 2.5 Pro

### Option 2: API Key

```bash
export GEMINI_API_KEY="YOUR_API_KEY"  # from https://aistudio.google.com/apikey
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
- `/voice` - Toggle voice mode
- `/exit` - Exit terminaI

## Next Steps

- [Voice Mode Guide](./voice.md) - Enable push-to-talk
- [Web Remote Guide](./web-remote.md) - Access from browser
- [Upstream Configuration](../docs/get-started/configuration.md) - Advanced settings
