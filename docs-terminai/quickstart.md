# Quickstart Guide

Get up and running with TerminAI in 5 minutes.

## Installation

### From Source (Recommended for now)

```bash
# Clone the repo
git clone https://github.com/Prof-Harita/terminaI.git
cd terminaI

# Install dependencies and# Build everything (uses Turbo)
npm install
turbo run build

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

TerminAI supports three authentication pathways. Run `terminai` and the wizard
will guide you through your chosen provider.

### Google Gemini (Default)

The fastest path to get started. Free tier credits available.

**Option A: OAuth (browser flow)**

```bash
terminai
# Select "Google Gemini" → browser opens → sign in
```

**Option B: API Key**

```bash
export TERMINAI_API_KEY="your-gemini-api-key"
terminai
```

### ChatGPT Plus/Pro (OAuth)

Use your existing ChatGPT subscription. No separate API key required.

```bash
terminai
# Select "ChatGPT Plus/Pro (OAuth)" → browser opens → sign in with OpenAI
```

Your ChatGPT Plus or Pro subscription works directly. Tokens reuse from existing
Codex CLI or OpenCode installations if present.

### OpenAI-Compatible (API Key)

Connect to OpenAI, OpenRouter, local inference servers, or any provider
supporting `/chat/completions`.

```bash
export OPENAI_API_KEY="sk-..."
terminai
# Select "OpenAI Compatible" → enter base URL and model
```

**Supported providers:**

- OpenAI Platform (`https://api.openai.com/v1`)
- OpenRouter (`https://openrouter.ai/api/v1`)
- Local servers (Ollama, vLLM, LM Studio)
- Any OpenAI-compatible endpoint

For advanced configuration, see [multi-llm-support.md](./multi-llm-support.md).

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
- `/exit` - Exit TerminAI

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
