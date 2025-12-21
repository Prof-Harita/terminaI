# terminaI Documentation

Welcome to terminaI - the universal terminal agent that bridges human intent and system action.

## What is terminaI?

terminaI is an AI-powered terminal agent forked from Google's Gemini CLI, repositioned from a coding-focused tool to a **general-purpose terminal operator** for everyone - from laymen to sysadmins.

**Running on:** Stable Core v0.21

## Key Features

- **🗣️ Voice Mode**: Push-to-talk interface for hands-free terminal control
- **🌐 Web Remote**: Control your terminal from anywhere via web browser
- **🔐 Secure**: OAuth authentication with Gemini API
- **🛡️ Safe**: Command preview and confirmation before execution
- **🔧 Extensible**: MCP (Model Context Protocol) ecosystem support

## Quick Links

### Getting Started
- [Quickstart Guide](./quickstart.md) - Install and run terminaI in 5 minutes
- [Voice Mode Guide](./voice.md) - Using push-to-talk and voice commands
- [Web Remote Guide](./web-remote.md) - Accessing terminaI from any browser

### Upstream Documentation
For features inherited from Gemini CLI, see the [upstream docs](../docs/):
- [Configuration](../docs/get-started/configuration.md)
- [Troubleshooting](../docs/troubleshooting.md)
- [MCP Integration](../docs/tools/mcp-server.md)

## Architecture

terminaI extends Gemini CLI with:
- **System Awareness**: CPU, memory, disk, and process monitoring
- **Process Orchestration**: Background process management (`/sessions`)
- **Voice Interface**: Deepgram STT integration for voice commands
- **Web Remote**: A2A server for browser-based remote access

See [Changelog](./changelog.md) for terminaI-specific modifications.

## Support

- **Issues**: [GitHub Issues](https://github.com/Prof-Harita/termAI/issues)
- **Upstream**: Based on [Gemini CLI](https://github.com/google-gemini/gemini-cli)
