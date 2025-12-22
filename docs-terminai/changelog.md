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

#### 2. Web Remote + Desktop (A2A)

**Added/Updated:**

- `packages/a2a-server/` - A2A server exposing the agent over HTTP(S)
- `packages/web-client/` - Browser UI served at `/ui` (token capture + URL
  stripping)
- Desktop app uses A2A directly (no separate OAuth implementation)
- Token auth + replay signatures (nonce + HMAC) for state-changing requests

#### 3. Voice (Offline, Download Once)

**CLI:**

- TTS spoken replies and spoken confirmations (`--voice`)
- Interruption primitives (barge-in / stop speaking)

**Desktop (Tauri):**

- Offline STT via `whisper.cpp`
- Offline TTS via `piper`
- Natural turn-taking (speaking interrupts playback immediately)

**Installer:**

- `terminai voice install` downloads + installs offline dependencies into
  `~/.terminai/voice`

#### 4. Safety Architecture (Approval Ladder + PIN)

- Deterministic approval ladder (A/B/C) with Level C requiring a 6-digit PIN
- PIN is configured via `security.approvalPin` (default `"000000"`)
- Confirmations work consistently across CLI, Desktop, and browser `/ui`

#### 5. Process Orchestration

**Enhanced:**

- Background process management (`/sessions`)
- Long-running task monitoring
- Process lifecycle control (start/stop/tail)

#### 6. Branding & Identity

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

We do **not** sync with upstream until explicitly authorized by the Chief
Architect. This ensures stability and prevents breaking changes during the "Go
Public" phase.

For upstream changes, see the upstream Gemini CLI release history.

---

_Last Updated: 2025-12-21_
