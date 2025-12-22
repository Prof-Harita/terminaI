# terminaI Documentation

Welcome to terminaI - the universal terminal agent that bridges human intent and
system action.

## What is terminaI?

terminaI is an AI-powered terminal agent forked from Google's Gemini CLI,
repositioned from a coding-focused tool to a **general-purpose terminal
operator** for everyone - from laymen to sysadmins.

**Running on:** Stable Core v0.21

## Key Features

- **Voice**: Desktop supports offline STT+TTS (download once → offline) with
  barge-in; CLI supports TTS spoken replies
- **Web Remote (A2A)**: Single agent backend for local + remote clients
  (Desktop + browser `/ui` use this)
- **Authentication**: Model access via OAuth or `GEMINI_API_KEY`; remote clients
  via A2A token + replay signatures
- **Safety**: Deterministic approval ladder (A/B/C) with Level C PIN
- **🔧 Extensible**: MCP (Model Context Protocol) ecosystem support

## Quick Links

### Getting Started

- [Quickstart Guide](./quickstart.md) - Install and run terminaI in 5 minutes
- [Voice Guide](./voice.md) - Install + use offline voice
- [Web Remote (A2A) Guide](./web-remote.md) - Run the A2A server and connect
  clients
- [Desktop App Guide](./desktop.md) - Tauri Desktop client (connects to A2A)
- [Safety Guide](./safety.md) - Safety posture + approval ladder
- [Configuration](./configuration.md) - Settings file + key options
- [Troubleshooting](./troubleshooting.md) - Common issues + fixes

## Architecture

terminaI extends Gemini CLI with:

- **System Awareness**: CPU, memory, disk, and process monitoring
- **Process Orchestration**: Background process management (`/sessions`)
- **Voice**: CLI TTS spoken replies + interruption primitives; Desktop offline
  STT+TTS with barge-in
- **Web Remote**: A2A server for local/remote clients (Desktop, browser `/ui`,
  custom)

See [Changelog](./changelog.md) for terminaI-specific modifications.
