# TermAI

[![TermAI CI](https://github.com/Prof-Harita/termAI/actions/workflows/ci.yml/badge.svg)](https://github.com/Prof-Harita/termAI/actions/workflows/ci.yml)

> **The Universal Translator between Human Intent and System Action.**
>
> While coding agents exploded (Cursor, Claude Code, Copilot), the terminal
> remained untouched. TermAI fills that gap — an AI-powered terminal agent for
> **everyone**, from laymen to sysadmins.

---

## The Problem We're Solving

| Domain                      | For Developers             | For Everyone Else |
| --------------------------- | -------------------------- | ----------------- |
| **Coding**                  | Cursor, Claude Code, Aider | Replit, Bolt, v0  |
| **Terminal / OS Operation** | Claude Code, Codex CLI     | **❌ NOTHING**    |

There's no "Cursor for your computer." Until now.

**TermAI lets anyone say:**

- _"Why is my laptop slow? Fix it."_
- _"Back up my important files before I format."_
- _"What's eating my disk space? Clean it up safely."_
- _"Start the dev server, watch logs, ping me if it crashes."_

---

Forked and upgraded from Gemini CLI.

## 🚀 Why TermAI?

| Feature              | TermAI                          | Warp        | GitHub Copilot CLI | Open Interpreter   |
| -------------------- | ------------------------------- | ----------- | ------------------ | ------------------ |
| **Primary Focus**    | **Universal System Operator**   | Terminal UI | Command Suggestion | Desktop Automation |
| **License**          | **Open Source (Apache 2.0)**    | Proprietary | Proprietary        | Open Source        |
| **Voice Control**    | **✅ Push-to-Talk**             | ❌          | ❌                 | ❌                 |
| **Execution Safety** | **Confirmed + Sandbox**         | User runs   | User runs          | ⚠️ High risk       |
| **Web Remote**       | **✅ Control from phone/iPad**  | ❌          | ❌                 | ❌                 |
| **Model Agnostic**   | **✅ (Gemini, Ollama, Claude)** | N/A         | OpenAI only        | ✅                 |

**Our Moat:**

1. **🔓 Open Source + Model Agnostic** — No vendor lock-in
2. **🗣️ Voice-First** — Hands-free terminal (Push-to-Talk with `space`)
3. **🌐 Web-Remote** — Control your terminal from anywhere
4. **🔧 MCP Ecosystem** — Extensible like an app store
5. **🛡️ Safety Architecture** — Preview before execute, trust boundaries

---

## 📦 Installation

### From Source (Recommended)

```bash
git clone https://github.com/Prof-Harita/termAI.git
cd termAI
npm ci
npm run build
npm link --workspace packages/termai

# Run it
termai
```

### Optional: Add `gemini` Alias (for muscle memory)

```bash
./scripts/termai-install.sh --alias-gemini
```

---

## 🔐 Authentication

TermAI uses Gemini models via Google OAuth. Choose your method:

### Option 1: Login with Google (Recommended)

```bash
termai
# Follow the browser authentication flow
```

**Free tier:** 60 requests/min, 1,000 requests/day, Gemini 2.5 Pro

### Option 2: Gemini API Key

```bash
export GEMINI_API_KEY="YOUR_API_KEY"  # from https://aistudio.google.com/apikey
termai
```

### Option 3: Vertex AI (Enterprise)

```bash
export GOOGLE_API_KEY="YOUR_API_KEY"
export GOOGLE_GENAI_USE_VERTEXAI=true
termai
```

See [Authentication Guide](./docs/get-started/authentication.md) for more
options.

---

## ⚡ Quick Examples

### Everyday Tasks (Not Just Coding)

```bash
termai
> What's using all my disk space?
> Find large files over 1GB and show me which I can delete safely

> What processes are eating my CPU right now?

> Back up my Documents folder to an external drive
```

### Developer Workflows

```bash
termai
> Start the dev server in the background and watch the logs
> If it crashes, restart it and notify me

> Run the test suite, fix any failures, and commit the fix

> Explain the architecture of this codebase
```

### Voice Control

Press `space` or `ctrl+space` to activate Push-to-Talk.

```
🎤 "Start the build and tell me when it's done"
🎤 "What's the status of my running processes?"
```

---

## 🎯 Who Is This For?

| Persona                  | Pain Point                                     | TermAI Value                            |
| ------------------------ | ---------------------------------------------- | --------------------------------------- |
| **Junior Developer**     | Scared of `rm -rf`, doesn't know syntax        | Safety net: preview + explain           |
| **SRE / DevOps**         | Copilot hallucinates flags, hates latency      | Local-first, auditable, scriptable      |
| **Small Business Owner** | "The shop screen is black. I don't know Nginx" | Intent-based: "Restart the display"     |
| **Data Analyst**         | Excel crashes on 50 CSVs, can't use pandas     | Local pandas-power via natural language |
| **Accessibility User**   | GUIs are hostile, menus are nested             | Voice-first universal interface         |

---

## 📋 Key Features

### 🔧 Process Orchestration

- Start/stop/monitor long-running processes (`/sessions`)
- Tail logs with AI-powered summaries
- Background notifications when builds finish

### 🗣️ Voice Mode

- Push-to-Talk: `space` or `ctrl+space`
- Local STT (privacy-first)
- Spoken confirmations for risky operations

### 🌐 Web Remote (Coming Soon)

- Control your terminal from phone/iPad
- QR code pairing
- Read-only mode for observers

### 🛡️ Safety Architecture

- **Preview Mode**: See commands before they run
- **Trust Folders**: Different policies per directory
- **Risk Classification**: Commands labeled by impact
- **Never YOLO by default**: Confirmations required

### 🔌 MCP Extensions

- `@github` — Pull request management
- `@slack` — Team notifications
- Custom tools via [MCP protocol](./docs/tools/mcp-server.md)

---

## 📚 Documentation

### Getting Started

- [**Quickstart Guide**](./docs/get-started/index.md)
- [**Operator Recipes**](./docs/termai-operator-recipes.md) — Safe prompts for
  common tasks
- [**Authentication Setup**](./docs/get-started/authentication.md)
- [**Configuration Guide**](./docs/get-started/configuration.md)
- [**Keyboard Shortcuts**](./docs/cli/keyboard-shortcuts.md)

### Core Features

- [**Commands Reference**](./docs/cli/commands.md) — Slash commands (`/help`,
  `/sessions`)
- [**Context Files (GEMINI.md)**](./docs/cli/gemini-md.md) — Persistent project
  context
- [**Checkpointing**](./docs/cli/checkpointing.md) — Save and resume
  conversations
- [**Trusted Folders**](./docs/cli/trusted-folders.md) — Execution policies

### Tools & Extensions

- [**Built-in Tools**](./docs/tools/index.md) — File system, shell, web
- [**MCP Integration**](./docs/tools/mcp-server.md) — External capabilities
- [**Custom Extensions**](./docs/extensions/index.md) — Build your own

### Advanced

- [**Headless Mode**](./docs/cli/headless.md) — Scripting and CI/CD
- [**Architecture**](./docs/architecture.md) — How TermAI works
- [**Sandboxing & Security**](./docs/cli/sandbox.md)
- [**Enterprise Guide**](./docs/cli/enterprise.md)

---

## 🗺️ Roadmap

See our comprehensive [**Product Roadmap**](./futureroadmap_opus.md) for:

- **Horizon 1** (Now — Q1 2025): Foundation, Voice MVP, Web-Remote v1
- **Horizon 2** (2025): Novice UX, Workflow Engine, MCP Ecosystem
- **Horizon 3** (2026+): Fleet Orchestration, Terminal Apps, TermAI Cloud

---

## 🤝 Contributing

We welcome contributions! TermAI is fully open source (Apache 2.0).

- Report bugs and suggest features
- Improve documentation
- Submit code improvements
- Share your MCP servers and extensions

See [Contributing Guide](./CONTRIBUTING.md) for development setup.

---

## 🏗️ Fork Lineage

TermAI is a fork of
[Google's Gemini CLI](https://github.com/google-gemini/gemini-cli), transformed
from a coding-focused agent into a **general-purpose terminal operator**.

**What we changed:**

- Repositioned from "coding agent" to "universal terminal agent"
- Added system awareness (CPU, disk, processes)
- Added process orchestration (`/sessions`)
- Building voice-first interactions
- Building web-remote access

**What we keep in sync:**

- Core architecture and tool infrastructure
- Authentication mechanisms
- Security primitives

See [Sync Upstream Guide](./docs/sync-upstream.md) for merge workflow.

---

## 📖 Resources

- **[Product Roadmap](./futureroadmap_opus.md)** — Strategic direction
- **[Changelog](./docs/changelogs/index.md)** — Recent updates
- **[GitHub Issues](https://github.com/Prof-Harita/termAI/issues)** — Bugs &
  features
- **[Troubleshooting](./docs/troubleshooting.md)** — Common issues

---

## 📄 Legal

- **License**: [Apache License 2.0](LICENSE)
- **Terms of Service**: [Terms & Privacy](./docs/tos-privacy.md)
- **Security**: [Security Policy](SECURITY.md)

---

<p align="center">
  <strong>TermAI</strong> — The Universal Translator for Your Computer<br/>
  Built with ❤️ by Prof-Harita • Forked from Google Gemini CLI
</p>
