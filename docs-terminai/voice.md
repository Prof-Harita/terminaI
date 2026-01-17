# Voice Guide

> [!NOTE] Voice Mode is currently in **beta**. Desktop offers offline STT/TTS;
> CLI voice is TTS-only with STT planned.

TerminAI supports offline voice (download once → offline) via the Desktop app.

## Overview

There are two “voice surfaces” in this repo:

- **Desktop app (recommended)**: offline STT+TTS with natural turn-taking
  (barge-in).
- **CLI**: TTS spoken replies and spoken confirmations.

## Install Offline Voice (one time)

Run this once (requires internet during install):

```bash
terminai voice install
```

This installs voice dependencies into:

- `~/.terminai/voice`
  - `whisper` / `whisper.exe` + `ggml-base.en.bin` (STT)
  - `piper` / `piper.exe` + `en_US-lessac-medium.onnx` (TTS)

After install, voice runs offline.

## CLI Voice (TTS)

### Enable

```bash
terminai --voice
```

Or set `voice.enabled` in your settings file (default path:
`~/.terminai/settings.json`, legacy `~/.gemini/settings.json` is still read).

### What it does

- Speaks a short “spoken reply” for assistant responses.
- Speaks confirmation prompts.
- Lets you interrupt speech (barge-in) with the PTT key.

### Push-to-talk note

The CLI currently cannot do true “press-and-hold to record” in a normal
terminal. Today, the PTT key is used mainly for **interrupting speech**.

## Desktop Voice (Tauri)

The Desktop app supports:

- Offline STT: `whisper.cpp`
- Offline TTS: `piper`
- Natural turn-taking: starting to talk interrupts TTS immediately (barge-in)
- Spoken confirmations (including PIN prompts for Level C commands)
- Volume control (Desktop Settings → Voice volume)

### Use it

1. Start the Desktop app:

```bash
npm -w packages/desktop dev
```

2. In Desktop Settings:

- Enable **Voice**
- Connect to the A2A agent backend (see `web-remote.md`)

3. Hold **Space** to talk.

## TTS voice model

Desktop TTS uses a local piper model at
`~/.terminai/voice/en_US-lessac-medium.onnx`.

If you want a different voice (e.g. a deeper voice), you can replace that file
with another piper English `.onnx` voice model (keeping the same filename).

## Configuration (CLI)

Settings live in `~/.terminai/settings.json` (legacy `~/.gemini/settings.json`
is still read). Relevant keys:

- `voice.enabled`
- `voice.pushToTalk.key` (`space` or `ctrl+space`)
- `voice.tts.provider` (`auto` or `none`)
- `voice.spokenReply.maxWords`

## Troubleshooting

- If STT/TTS fails in Desktop, ensure `terminai voice install` completed and
  that `~/.terminai/voice` contains `whisper` and `piper`.
