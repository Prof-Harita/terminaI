# TermAI Horizon 1 — Detailed Task List

> **Horizon 1: Foundation (Now — Q1 2025)**
>
> _"The best damn terminal agent for power users"_

This document contains **surgical, file-level tasks** for executing Horizon 1 of the TermAI roadmap. Each task specifies exact files, the changes required, and verification steps.

---

## Context for Execution

### Required Reading Before Starting

| Document | Path | Purpose |
|----------|------|---------|
| **Coding Standards** | `GEMINI.md` | TypeScript conventions, testing patterns, ESM imports |
| **Prior Tasks** | `.local/tasksv2.md` | What's already been built (avoid duplicating) |
| **Test Patterns** | `packages/core/src/tools/process-manager.test.ts` | Example of tool testing style |
| **Voice Scaffolding** | `packages/cli/src/voice/voiceController.ts` | Existing voice infrastructure |
| **CLI Config** | `packages/cli/src/config/config.ts` | How CLI flags are wired |

### Key Conventions

```typescript
// ESM imports MUST use .js extension (TypeScript compiles to ESM)
import { something } from './module.js';  // ✅ Correct
import { something } from './module';     // ❌ Will fail at runtime

// Plain objects over classes (per GEMINI.md)
export interface SessionEvent { ... }     // ✅ Preferred
export class SessionEvent { ... }         // ❌ Avoid unless necessary

// Use vi.mock for testing (Vitest)
vi.mock('../some-module.js', () => ({ ... }));
```

### npm Dependencies by Theme

| Theme | Package | Install Command |
|-------|---------|-----------------|
| **Voice (B)** | whisper.cpp bindings | System: `brew install whisper-cpp` |
| **Voice (B)** | Audio recording | `npm install node-record-lpcm16 --workspace packages/cli` |
| **Web-Remote (C)** | Static file serving | `npm install serve-static --workspace packages/a2a-server` |
| **Web-Remote (C)** | QR code | `npm install qrcode-terminal --workspace packages/cli` |

### Verification Commands

```bash
# Before any PR
npm run preflight          # Full suite: build, test, lint, typecheck

# Per-package testing
npm run test:ci --workspace @google/gemini-cli-core
npm run test:ci --workspace @google/gemini-cli
npm run test:ci --workspace @google/a2a-server
```

---

## Executive Summary: What's Done vs. Outstanding

### ✅ Completed (Verified in Codebase)

| Feature | Evidence |
|---------|----------|
| Process Manager Tool | `packages/core/src/tools/process-manager.ts` (853 lines) |
| Agent Control Tool | `packages/core/src/tools/agent-control.ts` (10.5KB) |
| Web-Remote Auth/CORS/Replay | `packages/a2a-server/src/http/auth.ts`, `cors.ts`, `replay.ts` |
| Voice Scaffolding | `packages/cli/src/voice/` (spokenReply.ts, voiceController.ts, tts/) |
| TermAI System Prompt | `packages/core/src/core/prompts.ts` (TermAI identity) |
| TermAI Themes | `packages/cli/src/ui/themes/termai-dark.ts`, `termai-light.ts` |
| Environment Context | `packages/core/src/utils/environmentContext.ts` |
| CLI Flags (voice, web-remote) | `packages/cli/src/config/config.ts` (CliArgs interface) |
| Distribution Package | `packages/termai/` exists |
| README & Roadmap | `README.md`, `futureroadmap_opus.md` |
| Operator Recipes | `docs/termai-operator-recipes.md` |

### 🔲 Outstanding (Horizon 1 Scope)

| Theme | Key Gaps |
|-------|----------|
| **Process Orchestration** | `/sessions` UI command, tail-and-summarize, background notifications |
| **Voice MVP** | Local whisper.cpp STT, push-to-talk wiring, voice-safe approvals |
| **Web-Remote v1** | Static web client, QR pairing, read-only mode |
| **Safety** | Preview Mode, Risk classification, sudo awareness, destructive guardrails |
| **Model Flexibility** | Ollama integration, model fallback strategies |
| **Polish & Docs** | Onboarding flow, demo scripts, security posture doc |

---

## Theme A: Process Orchestration (H1)

> **Goal:** Make process sessions a first-class citizen with UI commands and smart UX.

### Task A.1: `/sessions` Slash Command UI

**Status:** ✅ Done (sessions slash command + tool wiring)
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Create a `/sessions` slash command that provides interactive UI for managing process sessions.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/cli/src/ui/commands/sessionsCommand.ts` | Slash command wiring to `process_manager` tool |
| CREATE | `packages/cli/src/ui/commands/sessionsCommand.test.ts` | Unit tests |
| MODIFY | `packages/cli/src/services/BuiltinCommandLoader.ts` | Register sessions command |

**Implementation Details:**

```typescript
// packages/cli/src/commands/sessionsCommand.ts
export const sessionsCommand = {
  name: 'sessions',
  aliases: ['s', 'sess'],
  description: 'Manage background process sessions',
  subcommands: {
    list: { description: 'List all sessions' },
    status: { description: 'Get status of a session', args: ['name'] },
    read: { description: 'Read output from session', args: ['name', 'lines?'] },
    stop: { description: 'Stop a session', args: ['name'] },
    send: { description: 'Send input to session', args: ['name', 'text'] },
  },
  action: (context, args: string) => {
    // /sessions list | status <name> | read <name> [lines] | summarize <name> [lines]
    // send <name> <text> | stop <name> | start <name> <command>
    return {
      type: 'tool',
      toolName: 'process_manager',
      toolArgs: { operation, name, command, text, lines, background: true },
    };
  },
};
```

**Verification:** `npx vitest run packages/cli/src/ui/commands/sessionsCommand.test.ts`

---

### Task A.2: Tail-and-Summarize Action

**Status:** ✅ Done (summarize operation added)
**Priority:** P0
**Effort:** Medium (3-4 hours)

**Description:**
Add a "tail and summarize" action that reads the last N lines of session output and provides an AI summary.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/tools/process-manager.ts` | Add `summarize` operation with bounded tail + summary instructions |
| MODIFY | `packages/cli/src/ui/commands/sessionsCommand.ts` | Add `summarize` subcommand mapping to tool |

**Implementation Details:**

In `process-manager.ts`, add new operation:
```typescript
// Line ~55, add to ProcessManagerOperation type
type ProcessManagerOperation = 
  | 'start' | 'list' | 'status' | 'read' | 'send' 
  | 'signal' | 'stop' | 'restart'
  | 'summarize';  // NEW

// Add method to ProcessManager class (~line 560)
summarizeOutput(name: string, lines?: number): ToolResult {
  const outputLines = /* bounded tail of session output */;
  return {
    llmContent: `Session "${name}" — last ${lines ?? 50} lines:\n\n${outputLines}\n\nSummarize key events, errors, readiness signals, and current state in 3-5 bullet points.`,
    returnDisplay: /* last few lines for UI */,
  };
}
```

**Verification:**
`npx vitest run packages/core/src/tools/process-manager.test.ts`

---

### Task A.3: Background Notifications (Text-Based)

**Status:** ✅ Done (session events bubbled to UI)
**Priority:** P1
**Effort:** Medium (4-6 hours)

**Description:**
Notify user in the text UI when background sessions emit important events (finished, crashed, errors).

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/tools/process-notifications.ts` | Event emitter for session events |
| MODIFY | `packages/core/src/tools/process-manager.ts` | Emit events on start/finish/crash |
| MODIFY | `packages/cli/src/ui/AppContainer.tsx` | Subscribe and add info messages to history |

**Implementation Details:**

```typescript
// packages/core/src/tools/process-notifications.ts
import { EventEmitter } from 'node:events';

export interface SessionEvent {
  type: 'started' | 'finished' | 'crashed' | 'output_match';
  sessionName: string;
  message: string;
  timestamp: number;
}

class SessionNotifier extends EventEmitter {
  notify(event: SessionEvent) {
    this.emit('session-event', event);
  }
}

export const sessionNotifier = new SessionNotifier();
```

**Verification:**
```bash
# Unit tests
npm run test:ci

# Manual verification
termai
> Start a command that will finish: node -e "setTimeout(() => console.log('done'), 5000)"
# Wait 5 seconds, should see notification "Session X finished"
```

---

## Theme B: Voice — ChatGPT/Gemini-Level Experience (H1)

> **Goal:** Voice that feels as natural as ChatGPT or Gemini mobile — instant, interruptible, collaborative.

### Design Philosophy

The voice experience must feel **magical**, not mechanical. Key principles:

| Principle | Implementation |
|-----------|----------------|
| **Instant Activation** | <50ms from keypress to recording start |
| **Barge-In Interruption** | User speech immediately stops AI speech |
| **Streaming Transcription** | Words appear as you speak, not after |
| **Audio Ducking** | AI volume drops when user starts speaking |
| **Graceful Degradation** | Falls back to text if voice fails |
| **Natural Conversation** | "Wait, I meant..." / "Actually..." work naturally |

### Voice State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                        VOICE STATE MACHINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐  PTT press   ┌───────────┐  release   ┌────────┐│
│   │   IDLE   │─────────────▶│ LISTENING │───────────▶│PROCESS ││
│   └──────────┘              └───────────┘            └────────┘│
│        ▲                          │                       │     │
│        │                          │ barge-in              │     │
│        │                          ▼                       ▼     │
│        │                    ┌───────────┐           ┌────────┐ │
│        └────────────────────│  DUCKING  │◀──────────│SPEAKING│ │
│              (done)         └───────────┘  (start)  └────────┘ │
│                                   │                             │
│                                   │ PTT while ducking           │
│                                   ▼                             │
│                             ┌───────────┐                       │
│                             │ INTERRUPT │ → stops TTS, resumes  │
│                             └───────────┘   LISTENING           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task B.1: Voice State Machine Core

**Status:** ✅ Done (state machine implemented with tests)
**Priority:** P0
**Effort:** Hard (8-10 hours)

**Description:**
Implement the voice state machine that manages all voice states with sub-50ms transitions.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/cli/src/voice/VoiceStateMachine.ts` | Core state machine |
| CREATE | `packages/cli/src/voice/VoiceStateMachine.test.ts` | Unit tests |
| MODIFY | `packages/cli/src/voice/voiceController.ts` | Integrate state machine |

**Implementation Details:**

```typescript
// packages/cli/src/voice/VoiceStateMachine.ts
import { EventEmitter } from 'node:events';

export type VoiceState = 
  | 'IDLE'        // Not actively using voice
  | 'LISTENING'   // Recording user speech
  | 'PROCESSING'  // Transcribing/thinking
  | 'SPEAKING'    // AI is speaking
  | 'DUCKING'     // AI speaking but user started talking (volume reduced)
  | 'INTERRUPTED'; // User fully interrupted AI

export type VoiceEvent = 
  | { type: 'PTT_PRESS' }
  | { type: 'PTT_RELEASE' }
  | { type: 'TRANSCRIPTION_READY'; text: string }
  | { type: 'RESPONSE_READY'; text: string }
  | { type: 'TTS_START' }
  | { type: 'TTS_END' }
  | { type: 'USER_VOICE_DETECTED' }  // VAD during TTS
  | { type: 'USER_VOICE_STOPPED' };

export class VoiceStateMachine extends EventEmitter {
  private state: VoiceState = 'IDLE';
  private ttsAbortController?: AbortController;

  getState(): VoiceState {
    return this.state;
  }

  transition(event: VoiceEvent): void {
    const prevState = this.state;
    
    switch (this.state) {
      case 'IDLE':
        if (event.type === 'PTT_PRESS') {
          this.state = 'LISTENING';
          this.emit('startRecording');
        }
        break;
        
      case 'LISTENING':
        if (event.type === 'PTT_RELEASE') {
          this.state = 'PROCESSING';
          this.emit('stopRecording');
          this.emit('transcribe');
        }
        break;
        
      case 'PROCESSING':
        if (event.type === 'TRANSCRIPTION_READY') {
          this.emit('sendToLLM', event.text);
        }
        if (event.type === 'RESPONSE_READY') {
          this.emit('speak', event.text);
        }
        if (event.type === 'TTS_START') {
          this.state = 'SPEAKING';
        }
        break;
        
      case 'SPEAKING':
        // CRITICAL: Barge-in interruption
        if (event.type === 'PTT_PRESS' || event.type === 'USER_VOICE_DETECTED') {
          this.state = 'DUCKING';
          this.emit('duckAudio', 0.2); // Reduce volume to 20%
        }
        if (event.type === 'TTS_END') {
          this.state = 'IDLE';
        }
        break;
        
      case 'DUCKING':
        if (event.type === 'PTT_PRESS') {
          // Full interruption
          this.state = 'INTERRUPTED';
          this.emit('stopTTS');
          this.emit('startRecording');
        }
        if (event.type === 'USER_VOICE_STOPPED' && !this.isPTTPressed) {
          // User stopped, resume normal volume
          this.state = 'SPEAKING';
          this.emit('restoreAudio', 1.0);
        }
        break;
        
      case 'INTERRUPTED':
        // Now listening for new input
        this.state = 'LISTENING';
        break;
    }
    
    if (prevState !== this.state) {
      this.emit('stateChange', { from: prevState, to: this.state });
    }
  }
}
```

**Verification:**
```bash
npm run test:ci --workspace @google/gemini-cli

# State transition tests should verify:
# - IDLE → LISTENING (PTT press)
# - LISTENING → PROCESSING (PTT release)
# - SPEAKING → DUCKING (voice detected during speech)
# - DUCKING → INTERRUPTED (PTT press during ducking)
```

---

### Task B.2: Streaming STT with Whisper.cpp

**Status:** ✅ Done (streaming scaffolding + tests)
**Priority:** P0
**Effort:** Hard (10-12 hours)

**Description:**
Implement streaming speech-to-text that shows words as you speak (not after you're done).

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/cli/src/voice/stt/StreamingWhisper.ts` | Streaming transcription |
| CREATE | `packages/cli/src/voice/stt/AudioBuffer.ts` | Chunked audio buffer |
| CREATE | `packages/cli/src/voice/stt/VAD.ts` | Voice Activity Detection |
| MODIFY | `packages/cli/package.json` | Add whisper.cpp bindings |

**Implementation Details:**

```typescript
// packages/cli/src/voice/stt/StreamingWhisper.ts
import { EventEmitter } from 'node:events';

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export class StreamingWhisper extends EventEmitter {
  private whisperProcess: ChildProcess | null = null;
  private audioBuffer: Float32Array[] = [];
  private transcriptionBuffer = '';
  
  constructor(private modelPath: string) {
    super();
  }
  
  async startStreaming(): Promise<void> {
    // Start whisper.cpp in streaming mode
    this.whisperProcess = spawn('whisper-cpp', [
      '--model', this.modelPath,
      '--stream',
      '--output-format', 'json',
      '--print-progress',
    ]);
    
    this.whisperProcess.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const result = JSON.parse(line);
            this.emit('transcription', {
              text: result.text,
              isFinal: result.final,
              confidence: result.confidence,
            } as TranscriptionChunk);
          } catch {}
        }
      }
    });
  }
  
  feedAudio(chunk: Float32Array): void {
    if (this.whisperProcess) {
      // Feed audio to whisper stdin
      const buffer = Buffer.from(chunk.buffer);
      this.whisperProcess.stdin.write(buffer);
    }
  }
  
  async stopStreaming(): Promise<string> {
    if (this.whisperProcess) {
      this.whisperProcess.stdin.end();
      await new Promise((resolve) => 
        this.whisperProcess?.on('close', resolve)
      );
    }
    return this.transcriptionBuffer;
  }
}
```

```typescript
// packages/cli/src/voice/stt/VAD.ts (Voice Activity Detection)
export class SimpleVAD {
  private energyThreshold = 0.02;
  private silenceFrames = 0;
  private readonly silenceThreshold = 15; // ~300ms at 50fps
  
  isVoice(audioFrame: Float32Array): boolean {
    const energy = this.calculateEnergy(audioFrame);
    
    if (energy > this.energyThreshold) {
      this.silenceFrames = 0;
      return true;
    } else {
      this.silenceFrames++;
      return this.silenceFrames < this.silenceThreshold;
    }
  }
  
  private calculateEnergy(frame: Float32Array): number {
    let sum = 0;
    for (const sample of frame) {
      sum += sample * sample;
    }
    return Math.sqrt(sum / frame.length);
  }
}
```

**Dependencies:**
```bash
# macOS
brew install whisper-cpp

# Linux
sudo apt install whisper-cpp

# Model download
mkdir -p ~/.termai/models
curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" \
  -o ~/.termai/models/ggml-base.en.bin
```

**Verification:**
```bash
termai --voice
# Speak → words should appear IN REAL TIME as you speak
# Not waiting until you stop speaking
```

---

### Task B.3: Barge-In Interruption & Audio Ducking

**Status:** ✅ Done (duck/interrupt wired via AudioController + state machine)
**Priority:** P0
**Effort:** Medium (6-8 hours)

**Description:**
When user starts speaking while AI is speaking, immediately reduce AI volume (ducking), and if user presses PTT, fully interrupt and start listening.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/cli/src/voice/tts/auto.ts` | Add ducking & abort support |
| CREATE | `packages/cli/src/voice/AudioController.ts` | Volume control abstraction |
| MODIFY | `packages/cli/src/voice/voiceController.ts` | Wire interruption logic |

**Implementation Details:**

```typescript
// packages/cli/src/voice/AudioController.ts
export class AudioController {
  private currentVolume = 1.0;
  private abortController: AbortController | null = null;
  
  async speak(text: string): Promise<void> {
    this.abortController = new AbortController();
    
    // Use system TTS with volume control
    await this.platformSpeak(text, {
      volume: this.currentVolume,
      signal: this.abortController.signal,
    });
  }
  
  duck(volume: number): void {
    this.currentVolume = volume;
    // Platform-specific volume adjustment
    this.adjustSystemVolume(volume);
  }
  
  restore(): void {
    this.currentVolume = 1.0;
    this.adjustSystemVolume(1.0);
  }
  
  interrupt(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    // Kill any ongoing TTS
    this.killTTS();
  }
  
  private killTTS(): void {
    // macOS
    if (process.platform === 'darwin') {
      execSync('killall say 2>/dev/null || true');
    }
    // Linux (espeak)
    if (process.platform === 'linux') {
      execSync('killall espeak 2>/dev/null || true');
    }
  }
}
```

**Verification:**
```bash
termai --voice
> Tell me a long story about dragons

# While AI is speaking:
# 1. Start speaking softly → AI volume should DROP (ducking)
# 2. Stop speaking → AI volume should RESTORE
# 3. Press Ctrl+Space → AI should STOP IMMEDIATELY and listen to you
```

---

### Task B.4: Visual Voice Feedback (UI)

**Status:** ✅ Done (VoiceOrb component rendered in DefaultAppLayout)
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Show beautiful, informative voice state in the TUI — like ChatGPT's pulsing orb.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/cli/src/ui/components/VoiceOrb.tsx` | Animated voice indicator |
| MODIFY | `packages/cli/src/ui/AppContainer.tsx` | Integrate VoiceOrb |

**Implementation Details:**

```tsx
// packages/cli/src/ui/components/VoiceOrb.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { useVoiceState } from '../../voice/voiceController.js';

const STATE_VISUALS = {
  IDLE: { icon: '○', color: 'gray', label: 'voice ready' },
  LISTENING: { icon: '●', color: 'red', label: 'listening...' },
  PROCESSING: { icon: '◐', color: 'yellow', label: 'thinking...' },
  SPEAKING: { icon: '◉', color: 'cyan', label: 'speaking...' },
  DUCKING: { icon: '◎', color: 'blue', label: 'you interrupted' },
  INTERRUPTED: { icon: '⊙', color: 'magenta', label: 'go ahead!' },
};

export const VoiceOrb: React.FC = () => {
  const { state, amplitude } = useVoiceState();
  const visual = STATE_VISUALS[state];
  
  // Pulse effect based on audio amplitude
  const pulseSize = state === 'LISTENING' 
    ? Math.floor(amplitude * 3) 
    : 0;
  const pulseChars = '░▒▓'.slice(0, pulseSize);
  
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={visual.color} bold>
        {pulseChars}{visual.icon}{pulseChars}
      </Text>
      <Text dimColor>{visual.label}</Text>
    </Box>
  );
};
```

**Verification:**
```bash
termai --voice
# Should see voice indicator in corner of screen
# Indicator should change color/icon as state changes
# Should pulse when speaking (amplitude visualization)
```

---

### Task B.5: Voice-Safe Approvals

**Status:** ✅ Done (voice mode forces safe approval; confirmations spoken)
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
When voice mode is active, automatically disable YOLO mode, and for risky commands, READ the risk aloud before proceeding.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/cli/src/config/config.ts` | Override approvalMode when voice active |
| MODIFY | `packages/core/src/confirmation-bus/message-bus.ts` | Add spoken confirmation support |

**Implementation Details:**

```typescript
// In packages/cli/src/config/config.ts, within loadCliConfig
if (argv.voice) {
  // Force safe mode when voice is active
  if (config.approvalMode === 'yolo' || config.approvalMode === 'full-yolo') {
    console.warn('⚠️ YOLO mode disabled in voice mode for safety');
    config.approvalMode = 'prompt';
  }
  config.voiceActive = true;
  config.spokenConfirmations = true; // NEW
}

// In confirmation handling, if spokenConfirmations:
async function requestConfirmation(action: ConfirmationRequest): Promise<boolean> {
  if (config.spokenConfirmations && config.voiceActive) {
    // Speak the risk
    await speak(`This will ${action.description}. Say yes or press Y to confirm.`);
    
    // Listen for spoken "yes" or keyboard Y
    const response = await waitForVoiceOrKey(['yes', 'yeah', 'y', 'confirm']);
    return response;
  }
  // ... existing keyboard confirmation
}
```

**Verification:**
```bash
termai --voice --yolo
# Should see warning: "YOLO disabled in voice mode"

termai --voice
> Delete all temp files
# Should HEAR: "This will delete 5 files. Say yes to confirm."
# Say "yes" → proceeds
# Say "no" or stay silent → cancels
```

---

### Task B.6: Conversational Continuity

**Status:** ✅ Done (conversation stack w/ correction/cancel/repeat + prompt hints)
**Priority:** P1
**Effort:** Medium (4-6 hours)

**Description:**
Support natural conversation patterns: "Wait, I meant...", "Actually, first...", "Never mind".

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/cli/src/voice/ConversationStack.ts` | Context stack for corrections |
| MODIFY | `packages/core/src/core/prompts.ts` | Add voice conversation hints |

**Implementation Details:**

```typescript
// packages/cli/src/voice/ConversationStack.ts
export class ConversationStack {
  private stack: ConversationFrame[] = [];
  
  // Detect correction intents
  parseIntent(transcript: string): Intent {
    const lower = transcript.toLowerCase().trim();
    
    // Cancellation
    if (/^(never ?mind|cancel|stop|forget it)/.test(lower)) {
      return { type: 'CANCEL' };
    }
    
    // Correction
    if (/^(wait|actually|no|sorry|i meant)/.test(lower)) {
      return { 
        type: 'CORRECTION',
        newContext: transcript.replace(/^(wait|actually|no|sorry|i meant)[,.]?\s*/i, ''),
      };
    }
    
    // Clarification
    if (/^(what|huh|repeat|say that again)/.test(lower)) {
      return { type: 'REPEAT_LAST' };
    }
    
    // Normal input
    return { type: 'NEW_INPUT', text: transcript };
  }
  
  handleIntent(intent: Intent): Action {
    switch (intent.type) {
      case 'CANCEL':
        this.stack.pop();
        return { action: 'CANCEL_LAST_ACTION' };
        
      case 'CORRECTION':
        // Replace last input with corrected version
        this.stack.pop();
        return { action: 'REPLACE_INPUT', text: intent.newContext };
        
      case 'REPEAT_LAST':
        return { action: 'SPEAK_LAST_RESPONSE' };
        
      default:
        this.stack.push({ input: intent.text, timestamp: Date.now() });
        return { action: 'PROCESS_NORMALLY', text: intent.text };
    }
  }
}
```

**Verification:**
```bash
termai --voice
> Delete all log files
  # AI: "I found 50 log files..."
  
> Wait, I meant just the old ones
  # Should understand this is a CORRECTION, not new request
  # AI: "Got it, I'll only delete log files older than 30 days..."

> Never mind
  # Should CANCEL the operation entirely
```

---

### Voice UX Summary

| Task | Priority | Effort | Key Outcome |
|------|----------|--------|-------------|
| B.1 State Machine | P0 | Hard | Foundation for all voice behavior |
| B.2 Streaming STT | P0 | Hard | Real-time transcription |
| B.3 Barge-In | P0 | Medium | Natural interruption |
| B.4 Visual Feedback | P0 | Medium | Clear state indication |
| B.5 Voice-Safe | P1 | Easy | Spoken confirmations |
| B.6 Continuity | P1 | Medium | Natural conversation |

**Success Criteria:**
- [ ] Words appear as you speak (streaming)
- [ ] Pressing PTT mid-speech stops AI immediately
- [ ] State transitions feel instant (<50ms)
- [ ] Voice indicator shows clear state
- [ ] "Wait, I meant..." works naturally
- [ ] Risky commands are read aloud before confirmation

---

## Theme C: Web-Remote v1 (H1)

> **Goal:** Ship a minimal web client that works on phones.

### Task C.1: Static Web Client

**Status:** ✅ Done (packages/web-client static UI)
**Priority:** P0
**Effort:** Medium (6-8 hours)

**Description:**
Create a minimal, framework-free web client for mobile remote access.

**Files to Create:**

| Action | File | Description |
|--------|------|-------------|
| CREATE | `packages/web-client/index.html` | Main HTML |
| CREATE | `packages/web-client/style.css` | Mobile-responsive CSS |
| CREATE | `packages/web-client/app.js` | Chat interface logic |
| CREATE | `packages/web-client/package.json` | Minimal package config |

**Implementation Details:**

```html
<!-- packages/web-client/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TermAI Remote</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <header><h1>TermAI</h1></header>
    <main id="chat"></main>
    <footer>
      <textarea id="input" placeholder="Ask TermAI..."></textarea>
      <button id="send">Send</button>
    </footer>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

```css
/* packages/web-client/style.css */
:root { --bg: #1a1a2e; --fg: #eee; --accent: #00d4ff; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui; background: var(--bg); color: var(--fg); min-height: 100vh; }
#app { display: flex; flex-direction: column; height: 100vh; }
header { padding: 1rem; border-bottom: 1px solid #333; }
main { flex: 1; overflow-y: auto; padding: 1rem; }
footer { display: flex; gap: 0.5rem; padding: 1rem; background: #222; }
textarea { flex: 1; padding: 0.75rem; border-radius: 8px; border: none; resize: none; }
button { padding: 0.75rem 1.5rem; background: var(--accent); border: none; border-radius: 8px; cursor: pointer; }
```

**Verification:**
```bash
# Serve locally and test
cd packages/web-client && python3 -m http.server 8081
# Open http://localhost:8081 on phone (same network)
```

---

### Task C.2: Serve Web Client from A2A Server

**Status:** ✅ Done (express static /ui)
**Priority:** P0
**Effort:** Easy (2-3 hours)

**Description:**
Serve the static web client from the existing A2A server.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/a2a-server/src/http/app.ts` | Add static file serving |
| MODIFY | `packages/a2a-server/package.json` | Add serve-static dependency |

**Implementation Details:**

In `packages/a2a-server/src/http/app.ts`:
```typescript
import serveStatic from 'serve-static';
import path from 'node:path';

// Add before other routes (~line 50)
const webClientPath = path.join(__dirname, '../../..', 'web-client');
app.use('/ui', serveStatic(webClientPath));
```

**Verification:**
```bash
termai --web-remote
# Open http://localhost:8080/ui in browser
```

---

### Task C.3: QR Code Pairing

**Status:** ✅ Done (CLI prints URL/QR when available)
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
Generate a QR code in terminal for easy mobile pairing.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/cli/package.json` | Add qrcode-terminal dependency |
| MODIFY | `packages/cli/src/utils/webRemoteServer.ts` | Print QR on server start |

**Implementation Details:**

```typescript
// In packages/cli/src/utils/webRemoteServer.ts
import qrcode from 'qrcode-terminal';

export async function startWebRemoteServer(config) {
  // ... existing server start code
  
  const url = `http://${config.host}:${config.port}/ui?token=${config.token}`;
  console.log(`\n🌐 Web Remote available at: ${url}`);
  qrcode.generate(url, { small: true });
}
```

**Verification:**
```bash
termai --web-remote
# Should see QR code in terminal
# Scan with phone camera → opens web client
```

---

## Theme D: Safety Architecture (H1)

> **Goal:** Build trust through preview, risk classification, and guardrails.

### Task D.1: Preview Mode

**Status:** ✅ Done (preview flag, shell/file-ops preview)
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Add a "Preview Mode" that shows planned commands without executing them.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/cli/src/config/config.ts` | Add `--preview` flag |
| MODIFY | `packages/core/src/config/config.ts` | Add `previewMode` to Config |
| MODIFY | `packages/core/src/tools/shell.ts` | Check previewMode before executing |
| MODIFY | `packages/core/src/tools/file-ops.ts` | Check previewMode before writing |

**Implementation Details:**

In `packages/cli/src/config/config.ts`, add yargs option:
```typescript
// ~Line 350, add option
.option('preview', {
  alias: 'P',
  type: 'boolean',
  describe: 'Preview mode: show planned actions without executing',
  default: false,
})
```

In `packages/core/src/tools/shell.ts`, wrap execution:
```typescript
// ~Line 200, before actual execution
if (config.previewMode) {
  return {
    status: 'success',
    content: `[PREVIEW] Would execute:\n$ ${command}\n\nIn directory: ${cwd}`,
  };
}
```

**Verification:**
```bash
termai --preview
> Delete all .log files
# Should show "Would execute: rm *.log" without actually deleting
```

---

### Task D.2: Command Risk Classification

**Status:** ✅ Done (risk-classifier + tests, risk surfaced in confirmations)
**Priority:** P1
**Effort:** Medium (4-6 hours)

**Description:**
Classify commands by risk level (read-only, write, delete, privileged) and show in UI.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/safety/risk-classifier.ts` | Risk classification logic |
| CREATE | `packages/core/src/safety/risk-classifier.test.ts` | Unit tests |
| MODIFY | `packages/core/src/tools/shell.ts` | Add risk label to confirmation |

**Implementation Details:**

```typescript
// packages/core/src/safety/risk-classifier.ts
export type RiskLevel = 'read' | 'write' | 'delete' | 'privileged' | 'dangerous';

const DANGEROUS_PATTERNS = [
  /\brm\s+(-rf?|--recursive)\b/,
  /\bchmod\s+-R\b/,
  /\bdd\s+/,
  /\bmkfs\b/,
  /\bformat\b/,
];

const PRIVILEGED_PATTERNS = [
  /\bsudo\b/,
  /\bdoas\b/,
  /\bsu\s+-c\b/,
];

const DELETE_PATTERNS = [
  /\brm\b/,
  /\brmdir\b/,
  /\bunlink\b/,
];

export function classifyRisk(command: string): RiskLevel {
  if (DANGEROUS_PATTERNS.some(p => p.test(command))) return 'dangerous';
  if (PRIVILEGED_PATTERNS.some(p => p.test(command))) return 'privileged';
  if (DELETE_PATTERNS.some(p => p.test(command))) return 'delete';
  if (/\b(mv|cp|touch|mkdir|echo\s*>|tee)\b/.test(command)) return 'write';
  return 'read';
}
```

**Verification:**
```bash
npm run test:ci --workspace @google/gemini-cli-core

# Manual verification
termai
> List files       # Should show [read]
> Create a file    # Should show [write]
> Delete temp.txt  # Should show [delete]
> Run as root      # Should show [privileged]
```

---

### Task D.3: Destructive Guardrails

**Status:** ✅ Done (blocked destructive patterns in shell tool)
**Priority:** P1
**Effort:** Medium (3-4 hours)

**Description:**
Add explicit blocking or enhanced confirmation for known dangerous patterns.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/safety/built-in.ts` | Add dangerous command checks |
| MODIFY | `packages/core/src/tools/shell.ts` | Integrate guardrails |

**Implementation Details:**

In `packages/core/src/safety/built-in.ts`:
```typescript
// Add to existing safety checks (~line 50)
export const DESTRUCTIVE_PATTERNS = [
  { pattern: /rm\s+-rf?\s+\/(?!\S)/, message: 'Recursive delete of root directory' },
  { pattern: /rm\s+-rf?\s+~/, message: 'Recursive delete of home directory' },
  { pattern: />\s*\/dev\/sda/, message: 'Direct write to disk device' },
  { pattern: /mkfs\s+\/dev\/sd/, message: 'Formatting disk partition' },
];

export function checkDestructive(command: string): { blocked: boolean; reason?: string } {
  for (const { pattern, message } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) {
      return { blocked: true, reason: message };
    }
  }
  return { blocked: false };
}
```

**Verification:**
```bash
termai
> Delete everything in /
# Should be blocked with explanation
```

---

## Theme E: Model Flexibility (H1)

> **Goal:** Support Ollama for privacy-focused users.

### Task E.1: Ollama Provider Integration

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Hard (6-8 hours)

**Description:**
Add Ollama as an alternative model provider for fully local operation.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/core/src/routing/ollama-provider.ts` | Ollama API client |
| CREATE | `packages/core/src/routing/ollama-provider.test.ts` | Unit tests |
| MODIFY | `packages/core/src/routing/provider-registry.ts` | Register Ollama provider |
| MODIFY | `packages/cli/src/config/config.ts` | Add `--ollama` flag |

**Implementation Details:**

```typescript
// packages/core/src/routing/ollama-provider.ts
import { ModelProvider, GenerateRequest, GenerateResponse } from './types.js';

export class OllamaProvider implements ModelProvider {
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }
  
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama3.2',
        prompt: request.prompt,
        stream: false,
      }),
    });
    
    const data = await response.json();
    return { text: data.response };
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

**Verification:**
```bash
# Start Ollama locally first
ollama serve

termai --ollama
> What time is it?
# Should respond using local Ollama model
```

---

### Task E.2: Model Fallback Strategy

**Status:** 🔲 Not Started
**Priority:** P2
**Effort:** Medium (3-4 hours)

**Description:**
If primary model fails (timeout, rate limit), fall back to alternative.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/core/src/routing/router.ts` | Add fallback logic |
| MODIFY | `packages/core/src/config/config.ts` | Add fallbackModels config |

**Implementation Details:**

```typescript
// In packages/core/src/routing/router.ts
async function routeWithFallback(
  request: GenerateRequest,
  providers: ModelProvider[],
): Promise<GenerateResponse> {
  for (const provider of providers) {
    try {
      return await provider.generate(request);
    } catch (error) {
      console.warn(`Provider ${provider.name} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All model providers failed');
}
```

---

## Theme F: Polish & Documentation (H1)

> **Goal:** First impressions matter. Make setup magic.

### Task F.1: First-Run Onboarding Flow

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Medium (4-6 hours)

**Description:**
Guide new users through setup: choose safety mode, consent levels, quick demo.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/cli/src/ui/Onboarding.tsx` | Onboarding wizard component |
| MODIFY | `packages/cli/src/gemini.tsx` | Check first-run, show onboarding |
| CREATE | `packages/cli/src/utils/firstRun.ts` | Detect first run, store preference |

**Implementation Details:**

```typescript
// packages/cli/src/utils/firstRun.ts
const ONBOARDING_COMPLETE_FILE = path.join(os.homedir(), '.termai', '.onboarded');

export function isFirstRun(): boolean {
  return !fs.existsSync(ONBOARDING_COMPLETE_FILE);
}

export function markOnboardingComplete(): void {
  fs.mkdirSync(path.dirname(ONBOARDING_COMPLETE_FILE), { recursive: true });
  fs.writeFileSync(ONBOARDING_COMPLETE_FILE, new Date().toISOString());
}
```

---

### Task F.2: Demo Scripts Documentation

**Status:** 🔲 Partially Done
**Priority:** P2
**Effort:** Easy (2-3 hours)

**Description:**
Create 10 copy-paste demos that reliably impress.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `docs/demos.md` | 10 demo scripts |
| MODIFY | `docs/sidebar.json` | Add demos to navigation |

**Content:**

```markdown
# TermAI Demo Scripts

## 1. System Health Check
\`\`\`
What's eating my CPU? Show top 5 processes.
\`\`\`

## 2. Disk Space Analysis  
\`\`\`
How much disk space do I have? What's using the most?
\`\`\`

## 3. Find Large Files
\`\`\`
Find files larger than 100MB in my home directory
\`\`\`

## 4. Start Dev Server
\`\`\`
Start npm run dev as devserver in the background and tell me when it's ready
\`\`\`

## 5. Git Status Summary
\`\`\`
What's the status of this git repo? Any uncommitted changes?
\`\`\`

... (continue for 10 demos)
```

---

### Task F.3: Security Posture Documentation

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
Document the threat model and security architecture, especially for web-remote.

**Files to Create:**

| Action | File | Description |
|--------|------|-------------|
| CREATE | `docs/security-posture.md` | Threat model and security controls |

**Content Outline:**

```markdown
# TermAI Security Posture

## Threat Model

### Trusted Boundaries
- Local terminal user is trusted
- Web-remote requires authentication token
- ...

### Attack Vectors Considered
1. Prompt injection via untrusted files
2. Command injection via crafted inputs
3. Web-remote: CSRF, replay attacks, unauthorized access
4. ...

### Security Controls
| Control | Implementation |
|---------|----------------|
| Auth tokens | `packages/a2a-server/src/http/auth.ts` |
| CORS | `packages/a2a-server/src/http/cors.ts` |
| Replay guard | `packages/a2a-server/src/http/replay.ts` |
| Confirmation prompts | `packages/core/src/confirmation-bus/` |
| Risk classification | `packages/core/src/safety/risk-classifier.ts` |
```

---

## Verification Checklist

### Automated Tests

```bash
# Run full test suite
npm run preflight

# Individual packages
npm run test:ci --workspace @google/gemini-cli-core
npm run test:ci --workspace @google/gemini-cli
npm run test:ci --workspace @google/a2a-server
```

### Manual Verification Flows

| Flow | Steps | Expected Result |
|------|-------|-----------------|
| **Process Sessions** | 1. `termai` 2. "Start npm run dev as devserver" 3. `/sessions list` 4. `/sessions read devserver` 5. `/sessions stop devserver` | Sessions are managed correctly |
| **Voice Mode** | 1. `termai --voice` 2. Press Ctrl+Space 3. Speak 4. Release | Transcription appears in input |
| **Web Remote** | 1. `termai --web-remote` 2. Scan QR code 3. Send message from phone | Message processed, response visible |
| **Preview Mode** | 1. `termai --preview` 2. "Delete all .log files" | Shows what would be deleted without deleting |
| **Safety Guardrails** | 1. `termai` 2. "Run rm -rf /" | Command is blocked |

---

## Task Priority Matrix

| Priority | Task ID | Task Name | Effort | Dependencies |
|----------|---------|-----------|--------|--------------|
| P0 | A.1 | `/sessions` UI | M | None |
| P0 | B.1 | Whisper STT | H | None |
| P0 | C.1 | Static Web Client | M | None |
| P0 | D.1 | Preview Mode | M | None |
| P0 | A.2 | Tail-and-Summarize | M | A.1 |
| P0 | B.2 | Push-to-Talk Wiring | M | B.1 |
| P0 | C.2 | Serve Web Client | E | C.1 |
| P1 | A.3 | Background Notifications | M | A.1 |
| P1 | B.3 | Voice-Safe Approvals | E | B.2 |
| P1 | C.3 | QR Code Pairing | E | C.2 |
| P1 | D.2 | Risk Classification | M | None |
| P1 | D.3 | Destructive Guardrails | M | D.2 |
| P1 | E.1 | Ollama Provider | H | None |
| P1 | F.1 | Onboarding Flow | M | None |
| P1 | F.3 | Security Docs | E | None |
| P2 | E.2 | Model Fallback | M | E.1 |
| P2 | F.2 | Demo Scripts | E | None |

---

## Success Criteria (Horizon 1 Exit Criteria)

- [ ] `/sessions` command works end-to-end
- [ ] Voice mode transcribes speech locally
- [ ] Web client accessible from phone
- [ ] Preview mode shows without executing
- [ ] Dangerous commands are blocked or warned
- [ ] Ollama works as alternative provider
- [ ] New users see onboarding wizard
- [ ] Security posture is documented
- [ ] All tests pass: `npm run preflight`
- [ ] No P0 tasks remain open

---

*Last Updated: December 2025*
*Version: 1.0*
