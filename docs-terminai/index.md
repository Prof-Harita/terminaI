# TerminAI Documentation

Welcome to TerminAI — an AI-powered terminal with governed autonomy for laptops
and servers.

## What is TerminAI?

TerminAI is a **general-purpose terminal operator** for everyone — from laymen
to sysadmins — built on a stable upstream core.

**Running on:** Stable Core v0.21.0

## Key Features

- **Voice**: Desktop supports offline STT+TTS (download once → offline) with
  barge-in; CLI supports TTS spoken replies (STT planned)
- **Web Remote (A2A)**: Single agent backend for local + remote clients
  (Desktop + browser `/ui` use this)
- **Authentication**: Model access via OAuth or `TERMINAI_API_KEY`; remote
  clients via A2A token + replay signatures
- **Multi-LLM**: Choose Gemini (default) or an OpenAI-compatible provider
  depending on your needs (see Multi-LLM architecture)
- **Safety**: Deterministic approval ladder (A/B/C) with Level C PIN protection
  (`security.approvalPin`)
- **🔧 Extensible**: MCP (Model Context Protocol) ecosystem support

## Quick Links

### Getting Started

- [Quickstart Guide](./quickstart.md) - Install and run TerminAI in 5 minutes
- [Voice Guide](./voice.md) - Install + use offline voice
- [Web Remote (A2A) Guide](./web-remote.md) - Run the A2A server and connect
  clients
- [Desktop App Guide](./desktop.md) - Tauri Desktop client (connects to A2A)
- [Safety Guide](./safety.md) - Safety posture + approval ladder
- [Configuration](./configuration.md) - Settings file + key options
- [Troubleshooting](./troubleshooting.md) - Common issues + fixes
- [Multi-LLM architecture](./multi-llm-support.md) - Provider support and
  OpenAI-compatible details

### For contributors

- [Governance](./governance.md)
- [Fork Zones](./FORK_ZONES.md) - Upstream sync zones (CANON/LEVERAGE/SKIP)
- [Sandbox Architecture](./terminai-sandbox-architecture.md) - Sovereign Sandbox
  - T-APTS
- [Sandbox Governance](./sandbox-governance-integration.md) - Sandbox ≠ policy
  bypass
- [Why the Gemini CLI core?](./why-gemini.md)
- [System Operator Recipes](./recipes.md)
- [A2A Protocol](./a2a.md)
- [Developer API reference](./api-reference.md)

## Architecture

TerminAI extends Gemini CLI with:

- **System Awareness**: CPU, memory, disk, and process monitoring
- **Process Orchestration**: Background process management (`/sessions`)
- **Voice**: CLI TTS spoken replies + interruption primitives; Desktop offline
  STT+TTS with barge-in (`useVoiceTurnTaking` state machine)
- **Accessibility**: ARIA-compliant desktop interface
- **Web Remote**: A2A server for local/remote clients (Desktop, browser `/ui`,
  custom)

See [Changelog](./changelog.md) for TerminAI-specific modifications.
