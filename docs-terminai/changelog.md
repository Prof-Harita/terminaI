# Changelog - terminaI Modifications

This document tracks terminaI-specific changes from the upstream Gemini CLI.

## Stable Core v0.21.0

**Release Date:** 2025-12-21  
**Based On:** Gemini CLI v0.21.0-nightly.20251219

### Major Changes

#### 1. Repositioning: Coding Agent → Universal Terminal Agent

**Modified:** `packages/core/src/core/prompts.ts`

- Changed system prompt from coding-focused to general terminal operations
- Added system awareness (CPU, memory, disk monitoring)
- Added process control capabilities
- Removed coding-specific constraints
- Enabled general-purpose task execution

#### 2. Voice Mode Integration

**Added:**
- `packages/cli/src/voice/` - Voice interface components
- Push-to-talk functionality (Spacebar / Ctrl+Space)
- Deepgram STT integration
- Text-to-speech for responses

#### 3. Web Remote Access (POC)

**Added:**
- `packages/web-client/` - Browser-based UI
- A2A server integration for remote access
- Real-time command streaming
- Session management UI

#### 4. Process Orchestration

**Enhanced:**
- Background process management (`/sessions`)
- Long-running task monitoring
- Process lifecycle control (start/stop/tail)

#### 5. Branding & Identity

**Changed:**
- Package name: `@google/gemini-cli` → `termai`
- Binary name: `gemini` → `terminai`
- Project identity: Gemini CLI → terminaI

### Stability Changes (Go Public Initiative)

- **Version Freeze:** Locked to v0.21.0 (removed nightly tag)
- **Update Checker:** Disabled version nag and git clone warnings
- **Dependencies:** Frozen via `package-lock.json`

### Documentation

**Added:**
- `docs-terminai/` - terminaI-specific documentation hub
- Quickstart guide
- Voice mode guide
- Web remote guide

**Preserved:**
- `docs/` - Upstream Gemini CLI documentation (frozen, unchanged)

## Upstream Sync Policy

**Status:** FROZEN for 30 days (until 100 GitHub Stars milestone)

We do **not** sync with upstream until explicitly authorized by the Chief Architect. This ensures stability and prevents breaking changes during the "Go Public" phase.

For upstream changes, see [Gemini CLI Releases](https://github.com/google-gemini/gemini-cli/releases).

---

*Last Updated: 2025-12-21*
