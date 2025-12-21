# TermAI Desktop — Outstanding Frontend Tasks

> **Code Review Date:** December 21, 2025  
> **Reviewed By:** Principal Engineer / Architect  
> **Source Document:** `tasks_frontend.md`

This document contains only the **outstanding tasks** after a detailed code review of the TermAI desktop frontend codebase. Tasks marked complete have implementations that match the specification. Outstanding items are gaps where components exist but aren't wired, or critical functionality is missing.

---

## Code Review Summary

### ✅ Verified Complete — Implementation Matches Spec

| Theme | Task | Evidence |
|-------|------|----------|
| **A: Scaffolding** | A.1 Initialize Tauri | `packages/desktop/` with React, Vite, Tailwind, Zustand |
| **A: Scaffolding** | A.2 Monorepo Integration | `@termai/desktop` in workspace |
| **B: CLI Bridge** | B.1 CLI Process Manager | `src-tauri/src/cli_bridge.rs` (spawns CLI, streams stdout) |
| **B: CLI Bridge** | B.2 CLI Output Parser | `hooks/useCliProcess.ts`, `types/cli.ts` |
| **C: Core UI** | C.1 Chat View | `components/ChatView.tsx`, `MessageBubble.tsx`, `ChatInput.tsx` |
| **C: Core UI** | C.2 Confirmation Card | `components/ConfirmationCard.tsx`, `RiskBadge.tsx` |
| **C: Core UI** | C.3 Sessions Sidebar | `components/SessionsSidebar.tsx`, `SessionCard.tsx`, `hooks/useSessions.ts` |
| **D: OAuth** | D.1 OAuth Flow | `src-tauri/src/oauth.rs`, `components/AuthScreen.tsx`, `hooks/useAuth.ts` |
| **D: OAuth** | D.2 Settings Panel | `components/SettingsPanel.tsx`, `stores/settingsStore.ts` (with persistence) |
| **E: Command Palette** | E.1 Command Palette | `components/CommandPalette.tsx`, `data/commands.ts` |
| **F: Terminal** | F.1 xterm.js Integration | `components/EmbeddedTerminal.tsx` (with FitAddon, WebLinksAddon) |
| **F: Terminal** | F.2 PTY Spawning | `src-tauri/src/pty_session.rs`, `lib.rs` has all handlers |
| **F: Terminal** | F.3 Sudo Prompt | `components/SudoPrompt.tsx`, `hooks/useSudoDetection.ts` |
| **G: Layout** | G.1 Output Detection | `utils/outputDetector.ts` (TUI indicators, progress patterns) |
| **G: Layout** | G.2 Split Layout | `components/SplitLayout.tsx` (resizable panes) |
| **G: Layout** | G.3 Keyboard Shortcuts | `hooks/useKeyboardShortcuts.ts` (⌘T, ⌘J, ⌘K, ⌘,, ⌘N, Escape) |
| **H: Progress** | H.1 Progress Bar | `components/ProgressBar.tsx` |

### 🔲 Outstanding Tasks (Detailed Below)

| Priority | Task | Gap Identified |
|----------|------|----------------|
| **P0** | 1. AuthScreen Not Wired | `App.tsx` bypasses auth, goes straight to ChatView |
| **P0** | 2. EmbeddedTerminal Not Wired | Terminal component exists but NOT rendered in App.tsx or ChatView.tsx |
| **P0** | 3. SplitLayout Not Wired | Component exists but layout uses plain flex, not SplitLayout |
| **P0** | 4. SudoPrompt Not Wired | Component exists but no detection integration in ChatView/EmbeddedTerminal |
| **P0** | 5. Output Detection Not Wired | `detectOutputType` exists but NOT called from `useCliProcess.ts` |
| **P1** | 6. VoiceOrb.tsx Missing | Referenced in spec but file doesn't exist |
| **P1** | 7. Settings → CLI Not Synced | Settings store exists but doesn't send config to CLI |
| **P1** | 8. useKeyboardShortcuts Not Wired | Hook exists but `App.tsx` has inline handling instead |
| **P2** | 9. No Production Build Test | Tauri build not verified on any platform |
| **P2** | 10. ProgressBar Not Integrated | Component exists but not rendered in MessageBubble |

---

## Outstanding Tasks — Detailed Guidance

### 1. Wire AuthScreen to App.tsx

**Status:** 🔲 Component exists, not integrated  
**Priority:** P0  
**Effort:** Easy (30 min)

**What Was Found:**
- ✅ `AuthScreen.tsx` exists with Google OAuth button
- ✅ `useAuth.ts` hook exists with sign-in logic
- ❌ `App.tsx` directly renders `ChatView`, no auth gate

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `src/App.tsx` | Add auth state, conditionally render AuthScreen or ChatView |

**Implementation:**

In `App.tsx`, add auth gate at component level:

```tsx
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated } = useAuth();
  const [showAuth, setShowAuth] = useState(!isAuthenticated);

  if (showAuth) {
    return <AuthScreen onAuthenticated={() => setShowAuth(false)} />;
  }

  return (
    // ... existing app layout
  );
}
```

**Verification:**
```bash
npm run tauri dev
# Should show login screen first
# Click "Sign in with Google" → browser opens
# After OAuth → chat view appears
```

---

### 2. Wire EmbeddedTerminal to Layout

**Status:** 🔲 Component exists, not integrated  
**Priority:** P0  
**Effort:** Medium (2-3 hours)

**What Was Found:**
- ✅ `EmbeddedTerminal.tsx` exists with full xterm.js integration
- ✅ `lib.rs` exports `start_pty_session`, `send_terminal_input`, `stop_pty_session`
- ❌ `ChatView.tsx` only renders message bubbles, no terminal embedding
- ❌ No state management for when to show terminal vs chat

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `hooks/useCliProcess.ts` | Add state for active terminal sessions |
| MODIFY | `components/ChatView.tsx` | Embed EmbeddedTerminal when TUI output detected |
| MODIFY | `src/App.tsx` | Use SplitLayout for chat + terminal panes |

**Implementation:**

Add terminal state to `useCliProcess.ts`:

```typescript
const [activeTerminalSession, setActiveTerminalSession] = useState<string | null>(null);
const [outputBuffer, setOutputBuffer] = useState('');

// When output detected as TUI, switch to terminal mode
if (detectOutputType(output) === 'tui') {
  const sessionId = crypto.randomUUID();
  await invoke('start_pty_session', { sessionId, command, args: [] });
  setActiveTerminalSession(sessionId);
}
```

**Verification:**
```bash
npm run tauri dev
> Show me htop
# Should switch from chat bubbles to embedded xterm.js terminal
# Can interact with htop using keyboard
# Press 'q' → returns to chat
```

---

### 3. Wire SplitLayout to App

**Status:** 🔲 Component exists, not used  
**Priority:** P0  
**Effort:** Easy (1 hour)

**What Was Found:**
- ✅ `SplitLayout.tsx` exists with resizable panes
- ❌ `App.tsx` uses plain `flex` divs, not SplitLayout

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `src/App.tsx` | Replace flex layout with SplitLayout component |

**Implementation:**

```tsx
import { SplitLayout } from './components/SplitLayout';

// In App component:
<SplitLayout
  leftPanel={<ChatView inputRef={chatInputRef} />}
  rightPanel={<EmbeddedTerminal sessionId={activeSessionId} />}
  rightPanelVisible={hasActiveTerminal}
/>
```

**Verification:**
```bash
npm run tauri dev
# Start a long-running command
# Terminal panel slides in from right
# Drag divider to resize panes
```

---

### 4. Wire SudoPrompt to Terminal Detection

**Status:** 🔲 Component exists, detection exists, not connected  
**Priority:** P0  
**Effort:** Easy (1 hour)

**What Was Found:**
- ✅ `SudoPrompt.tsx` exists with password input
- ✅ `useSudoDetection.ts` exists with pattern matching
- ❌ No component calls `useSudoDetection` with terminal output
- ❌ No state wires password to terminal input

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `components/EmbeddedTerminal.tsx` OR parent | Add sudo detection + overlay |

**Implementation:**

In parent component or EmbeddedTerminal:

```tsx
const { needsPassword, prompt } = useSudoDetection(outputBuffer);

return (
  <>
    <EmbeddedTerminal ... />
    {needsPassword && (
      <SudoPrompt
        prompt={prompt}
        onSubmit={(password) => {
          invoke('send_terminal_input', { sessionId, data: password });
          setOutputBuffer(''); // Clear to avoid re-triggering
        }}
        onCancel={() => invoke('stop_pty_session', { sessionId })}
      />
    )}
  </>
);
```

**Verification:**
```bash
npm run tauri dev
> Update system packages   (or: sudo apt update)
# Secure password overlay appears
# Enter password → command continues
```

---

### 5. Wire Output Detection to CLI Process

**Status:** 🔲 Utility exists, not called  
**Priority:** P0  
**Effort:** Easy (1 hour)

**What Was Found:**
- ✅ `outputDetector.ts` exports `detectOutputType` and `detectTuiExit`
- ❌ `useCliProcess.ts` does NOT import or use these functions
- ❌ All output treated as text, never switches to terminal mode

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `hooks/useCliProcess.ts` | Import outputDetector, route based on type |

**Implementation:**

```typescript
import { detectOutputType, detectTuiExit } from '../utils/outputDetector';

// In handleCliOutput:
const outputType = detectOutputType(event.payload);
if (outputType === 'tui') {
  setRenderMode('terminal');
} else if (outputType === 'progress') {
  updateProgressBar(event.payload);
} else {
  appendToLastMessage(event.payload);
}
```

**Verification:**
```bash
npm run tauri dev
> List files          # Should show chat bubbles
> Show htop           # Should switch to terminal mode
> npm install lodash  # Should show progress bar
```

---

### 6. Create VoiceOrb.tsx Component

**Status:** 🔲 Not created  
**Priority:** P1  
**Effort:** Medium (3-4 hours)

**What Was Found:**
- ❌ `VoiceOrb.tsx` referenced in spec but file doesn't exist
- ❌ No voice/audio components in the desktop package
- Note: CLI has voice components in `packages/cli/src/voice/` that could inform design

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `components/VoiceOrb.tsx` | Visual voice indicator with push-to-talk |
| CREATE | `hooks/useVoice.ts` | Voice state, microphone access |
| MODIFY | `components/ChatInput.tsx` | Add VoiceOrb to input area |

**Implementation Sketch:**

```tsx
// components/VoiceOrb.tsx
export function VoiceOrb({ onTranscript }: Props) {
  const [isListening, setIsListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);

  // Push-to-talk: hold space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isInputFocused()) {
        setIsListening(true);
      }
    };
    // ... keyup handler to stop
  }, []);

  return (
    <div className={`w-10 h-10 rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-700'}`}>
      <div style={{ transform: `scale(${1 + amplitude * 0.5})` }} />
    </div>
  );
}
```

> [!IMPORTANT]
> Voice integration requires evaluating whether to use Web Audio API in Tauri or pipe to CLI's existing voice infrastructure. Consider deferring to Phase 2 if time-constrained.

**Verification:**
```bash
npm run tauri dev
# Hold spacebar → orb pulses red
# Speak → transcript appears in input
# Release → message sends
```

---

### 7. Sync Settings Store with CLI

**Status:** 🔲 Store exists, CLI not updated  
**Priority:** P1  
**Effort:** Easy (1-2 hours)

**What Was Found:**
- ✅ `settingsStore.ts` persists settings to localStorage
- ❌ Changing `approvalMode` or `previewMode` doesn't update CLI
- ❌ No Tauri command to push settings to CLI

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `stores/settingsStore.ts` | Call invoke on setting change |
| MODIFY | `src-tauri/src/cli_bridge.rs` | Add command to update CLI config |
| OR | Send settings as CLI args | Simpler approach via `send_to_cli` |

**Implementation:**

Simplest approach — send settings command:

```typescript
// In settingsStore.ts
setApprovalMode: (approvalMode) => {
  set({ approvalMode });
  // Send to CLI
  invoke('send_to_cli', { message: `/config set yolo ${approvalMode === 'yolo'}` });
}
```

**Verification:**
```bash
npm run tauri dev
# Open Settings → change Approval Mode to YOLO
# Ask to delete a file → should NOT show confirmation
# Change back to Safe → should show confirmation
```

---

### 8. Refactor App.tsx to Use useKeyboardShortcuts

**Status:** 🔲 Hook exists, not used  
**Priority:** P1  
**Effort:** Easy (30 min)

**What Was Found:**
- ✅ `useKeyboardShortcuts.ts` is a well-structured hook
- ❌ `App.tsx` has inline `handleKeyDown` instead of using the hook
- Missing shortcuts: ⌘T (toggle terminal), ⌘J (focus chat), ⌘N (new conversation)

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `src/App.tsx` | Replace inline handler with useKeyboardShortcuts hook |

**Implementation:**

```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  useKeyboardShortcuts({
    onToggleTerminal: () => setTerminalVisible(prev => !prev),
    onFocusChat: () => chatInputRef.current?.focus(),
    onOpenPalette: () => setIsPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
    onNewConversation: () => { /* clear messages, start fresh */ },
    onEscape: () => {
      setIsPaletteOpen(false);
      setIsSettingsOpen(false);
    },
  });
  
  // Remove the inline useEffect with handleKeyDown
}
```

**Verification:**
```bash
npm run tauri dev
# ⌘K → palette opens
# ⌘T → terminal panel toggles
# ⌘J → chat input focused
# Escape → modals close
```

---

### 9. Test Production Build

**Status:** 🔲 Not verified  
**Priority:** P2  
**Effort:** Medium (2-3 hours)

**Description:**
No evidence of successful production builds on any platform. Must verify bundle size and functionality.

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| RUN | `npm run tauri build` | Build for current platform |
| VERIFY | Bundle in `target/release/bundle/` | Check size < 20MB |

**Commands:**

```bash
cd packages/desktop
npm run tauri build

# Check bundle size
du -sh src-tauri/target/release/bundle/*/

# macOS: open the .app
open src-tauri/target/release/bundle/macos/TermAI.app

# Linux: run the AppImage
./src-tauri/target/release/bundle/appimage/TermAI.AppImage
```

**Success Criteria:**
- [ ] Build completes without errors
- [ ] Bundle size < 20MB
- [ ] App launches on target platform
- [ ] Chat works end-to-end

---

### 10. Integrate ProgressBar in MessageBubble

**Status:** 🔲 Component exists, not rendered  
**Priority:** P2  
**Effort:** Easy (1 hour)

**What Was Found:**
- ✅ `ProgressBar.tsx` exists with proper styling
- ❌ `MessageBubble.tsx` doesn't render ProgressBar
- ❌ No progress extraction from CLI output

**Work Remaining:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `types/cli.ts` | Add progress field to Message type |
| MODIFY | `hooks/useCliProcess.ts` | Parse progress from CLI output |
| MODIFY | `components/MessageBubble.tsx` | Render ProgressBar when present |

**Implementation:**

```tsx
// In MessageBubble.tsx
{message.progress && (
  <ProgressBar
    label={message.progress.label}
    progress={message.progress.value}
    status={message.progress.done ? 'success' : 'running'}
  />
)}
```

**Verification:**
```bash
npm run tauri dev
> npm install lodash
# Should see a progress bar updating as packages download
```

---

## Verification Checklist

### Before Marking Frontend Complete

- [ ] App shows login screen on first launch (Task 1)
- [ ] OAuth completes and returns to chat (Task 1)
- [ ] TUI programs (htop, vim) render in embedded terminal (Task 2, 5)
- [ ] Split layout with resizable divider (Task 3)
- [ ] Sudo prompts show password overlay (Task 4)
- [ ] Settings changes affect CLI behavior (Task 7)
- [ ] All keyboard shortcuts work (Task 8)
- [ ] Production build < 20MB (Task 9)

### Already Verified ✅

- [x] Project scaffolding complete (A.1-A.2)
- [x] CLI process spawns and communicates (B.1-B.2)
- [x] Chat messages send/receive (C.1)
- [x] Confirmation cards render (C.2)
- [x] Sessions sidebar shows running processes (C.3)
- [x] Settings panel opens and persists (D.1-D.2)
- [x] Command palette opens with ⌘K (E.1)
- [x] Risk badges display correctly (C.2)

---

## Priority Order for Remaining Work

| Priority | Task | Effort | Rationale |
|----------|------|--------|-----------|
| 1 | Task 1: Wire AuthScreen | Easy | P0, blocks all auth flows |
| 2 | Task 5: Wire Output Detection | Easy | P0, enables Task 2 |
| 3 | Task 2: Wire EmbeddedTerminal | Medium | P0, core TUI parity feature |
| 4 | Task 3: Wire SplitLayout | Easy | P0, enables proper layout |
| 5 | Task 4: Wire SudoPrompt | Easy | P0, security UX |
| 6 | Task 7: Settings → CLI | Easy | P1, settings must work |
| 7 | Task 8: Refactor Shortcuts | Easy | P1, cleanup |
| 8 | Task 6: VoiceOrb | Medium | P1, can defer |
| 9 | Task 10: ProgressBar | Easy | P2, polish |
| 10 | Task 9: Prod Build Test | Medium | P2, before release |

**Estimated Total Remaining:** 12-16 hours of focused work

---

## Architecture Notes for Future Development

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx                                                     │
│  ├── ChatView (always shown)                                 │
│  │   ├── MessageBubble[]                                     │
│  │   ├── ConfirmationCard (when pending)                     │
│  │   └── ChatInput                                           │
│  ├── SessionsSidebar                                         │
│  ├── CommandPalette (modal)                                  │
│  └── SettingsPanel (modal)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Target State (After Completion)

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx                                                     │
│  ├── [IF NOT AUTH] AuthScreen                                │
│  └── [IF AUTH] SplitLayout                                   │
│      ├── LEFT: ChatView                                      │
│      │   ├── MessageBubble[] (when text mode)                │
│      │   ├── EmbeddedTerminal (when TUI mode)                │
│      │   ├── ProgressBar (inline)                            │
│      │   ├── ConfirmationCard (when pending)                 │
│      │   └── ChatInput + VoiceOrb                            │
│      └── RIGHT: EmbeddedTerminal (optional, expanded)        │
│  ├── SudoPrompt (overlay when detected)                      │
│  ├── SessionsSidebar                                         │
│  ├── CommandPalette (modal)                                  │
│  └── SettingsPanel (modal)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

*Generated from code review of `tasks_frontend.md` against codebase state as of December 21, 2025*
