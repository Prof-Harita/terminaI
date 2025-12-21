# Voice Mode Guide

Control terminaI hands-free with voice commands.

## Overview

Voice Mode enables push-to-talk interaction with terminaI using speech recognition (Deepgram STT) and text-to-speech for responses.

**Status:** ✅ Available in Stable Core v0.21

## Activation

### Toggle Voice Mode

Press **Spacebar** or **Ctrl+Space** to activate push-to-talk.

Alternatively:
```bash
terminai
> /voice
```

## Usage

1. **Press and Hold** Spacebar or Ctrl+Space
2. **Speak your command**: "What processes are running?"
3. **Release** the key
4. terminaI transcribes, processes, and responds with voice

## Examples

🎤 *"What's using all my disk space?"*  
🎤 *"Start the build and notify me when done"*  
🎤 *"Show me the status of my running processes"*

## Configuration

Voice mode settings can be configured in `.gemini/config.yaml`:

```yaml
voice:
  enabled: true
  stt_provider: deepgram
  tts_enabled: true
```

See [upstream voice configuration](../docs/get-started/configuration.md) for advanced options.

## Troubleshooting

### Microphone Not Working

Ensure your OS has granted microphone permissions:
- **Linux**: Check PulseAudio/ALSA settings
- **macOS**: System Preferences → Security & Privacy → Microphone
- **Windows**: Settings → Privacy → Microphone

### STT Not Transcribing

Verify Deepgram API key is set:
```bash
export DEEPGRAM_API_KEY="your-key"
```

For more help, see [Troubleshooting](../docs/troubleshooting.md).
