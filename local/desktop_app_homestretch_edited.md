# Desktop App Home Stretch: UI/UX Parity + Product Completion

**Date**: 2025-12-31  
**Status**: COMPREHENSIVE DEEP SCAN COMPLETE

This document evaluates the current Desktop app UI/UX against what the backend
(sidecar CLI via `a2a-server`) is capable of, and recommends the remaining "home
stretch" work to make the Desktop app feel complete and reliable.

---

## 0) Quick Map: What the Desktop UI currently is

### Primary layout (currently used)

- **Header**: connectivity indicator, provider dropdown, context usage meter,
  voice toggle, theme toggle, settings button.
  - `packages/desktop/src/App.tsx`
  - `packages/desktop/src/components/ConnectivityIndicator.tsx`
  - `packages/desktop/src/components/ContextPopover.tsx`
- **Left activity rail + side panel**: views for History, Assistant,
  Connectivity, Library, Workspace, Terminal, Preferences, Account.
  - `packages/desktop/src/components/ActivityBar.tsx`
  - `packages/desktop/src/components/SidePanel.tsx`
  - Views:
    - `packages/desktop/src/components/views/HistoryView.tsx` (Local-only
      history visibility)
    - `.../AssistantView.tsx`
    - `.../ConnectivityView.tsx`
    - `.../LibraryView.tsx`
    - `.../WorkspaceView.tsx`
    - `.../TerminalView.tsx`
    - `.../PreferenceView.tsx`
    - `.../AccountView.tsx`
- **Middle**: Chat UI
  - `packages/desktop/src/components/ChatView.tsx` (Main interaction loop)
  - Confirmations UI: `packages/desktop/src/components/ConfirmationCard.tsx`
- **Right**: "Execution Log" tool/event stream + tool input box
  - `packages/desktop/src/components/EngineRoomPane.tsx`
  - Store: `packages/desktop/src/stores/executionStore.ts`

### Backend/bridge integration

- Agent communication is via HTTP + SSE streaming:
  - `packages/desktop/src/hooks/useCliProcess.ts` (591 lines - main
    orchestration)
  - `packages/desktop/src/bridge/eventHandler.ts` (367 lines - SSE parsing)
- Sidecar startup:
  - `packages/desktop/src/hooks/useSidecar.ts`
  - `packages/desktop/src-tauri/src/lib.rs`
  - `packages/desktop/src-tauri/src/cli_bridge.rs`

### Settings storage

- Desktop persists a lightweight settings model and syncs some values to CLI via
  `/config set ...` messages.
  - `packages/desktop/src/stores/settingsStore.ts` (251 lines)
  - **Audit Note**: This store is unrelated to the backend's `Config` object,
    leading to "Write-only" sync behavior. Settings are sent TO the backend but
    never read FROM it.

### Bridge State Machine

- The application uses a sophisticated bridge state machine for SSE event
  handling:
  - `packages/desktop/src/bridge/store.ts` - Zustand store with persistence
  - `packages/desktop/src/bridge/reducer.ts` - FSM transitions
  - `packages/desktop/src/bridge/types.ts` - State definitions
  - States: `disconnected` → `connecting` → `connected` → `sending` →
    `streaming` → `awaiting_confirmation` → `executing_tool`

---

## 1) What the Desktop app surfaces vs what the backend supports

### What the Desktop UI _does_ surface today

- **Core chat / streaming responses**
  - Chat messages (user + assistant) stream in.
  - Tool calls and results appear inline (as "execution logs" attached to
    messages) and in the right "Execution Log".
  - `ChatView.tsx`, `EngineRoomPane.tsx`, `useCliProcess.ts`

- **Approvals (confirmations)**
  - Confirmations appear inline as a `ConfirmationCard`.
  - Keyboard shortcut exists: `Ctrl+Enter` attempts to approve.
  - `ConfirmationCard.tsx`, `useKeyboardShortcuts.ts`, `App.tsx`,
    `useCliProcess.ts`

- **Workspace selection (server-side)**
  - There's a workspace path field (multiple places) and it is included in
    settings sync metadata.
  - `settingsStore.ts`, `AssistantView.tsx`, `WorkspaceView.tsx`,
    `AuthScreen.tsx`

- **MCP servers and relay actions (as CLI commands)**
  - UI can add/remove/toggle MCP servers and can execute `/mcp logs <name>`.
  - Relay: `/relay broadcast` and `/relay reset`.
  - `ConnectivityView.tsx`, `settingsStore.ts`

- **Recipes and tools discovery (as CLI commands)**
  - Buttons for `/recipes list` and `/tools list`.
  - `LibraryView.tsx`

- **Preferences (app-level)**
  - Theme + notifications + previewFeatures.
  - `PreferenceView.tsx`, `settingsStore.ts`

- **Voice output (TTS) to speak assistant replies + confirmations**
  - Desktop does TTS via Tauri `tts_synthesize`, and speaks:
    - a short version of the assistant reply at end of a turn
    - a confirmation prompt ("Allow running tool …?")
  - `useCliProcess.ts`, `useTts.ts`, `spokenReply.ts`, `src-tauri/src/voice.rs`

### What the backend supports that Desktop does _not_ adequately surface

This is where the Desktop app still feels like a "shell around the CLI" rather
than a complete product.

#### 1) Session management parity (list/resume/delete) is not actually wired

- The UI has "History", but it's local-only and restore is **partially
  implemented**.
  - `HistoryView` passes `onSelectSession` and `SidePanel` calls
    `setCurrentConversationId(sessionId)`.
  - **However**, `HistoryView` relies on `useHistoryStore` (zustand persist on
    `terminai-history`), which only knows about sessions created _locally_. It
    does not query the backend API (`/sessions`) for the source of truth.
  - **Impact**: If you clear local browser storage, you lose your history, even
    if the backend database still has it. You cannot switch machines.

- **Code Evidence**:

  ```typescript
  // historyStore.ts - purely local, 50 session limit, no backend sync
  sessions: [],
  addSession: (session) =>
    set((state) => ({
      sessions: [
        session,
        ...state.sessions.filter((s) => s.id !== session.id),
      ].slice(0, 50),
    })),
  ```

- **Unused Hook**: `useSessions.ts` exists with Tauri event listeners for
  `session-update` and `session-removed`, but it is designed for **PTY
  sessions**, not conversation history. This is a naming confusion.

#### 2) Terminal/PTTY capabilities are not surfaced as a first-class feature

- `EngineRoomPane` is a tool/event log, not a real terminal.
- Tauri includes **full PTY session plumbing**:
  - `start_pty_session(session_id, command, args)`
  - `send_terminal_input(session_id, data)`
  - `stop_pty_session(session_id)`
  - `kill_pty_session(session_id)`
  - `resize_pty_session(session_id, rows, cols)`
- **None of these are used by the Desktop UI**. The `TerminalView.tsx` component
  only shows settings (Preferred Editor, Output Format), not a terminal.
- **Impact**: The backend can spawn interactive shells, but users can only see
  tool output logs.

#### 3) Extensions, policies, sandboxing, context controls, and most config are not surfaced

Desktop settings cover only a small slice of backend configuration.

**Missing (examples)**:

- model name selection (not just provider) - only `gemini | ollama` dropdown
- provider auth details (openai-compatible baseUrl/model/auth, etc.)
- tool allow/deny lists and tool policies
- sandbox / repl config
- context includeDirectories / memory settings
- checkpointing config
- telemetry controls

#### 4) CLI command surface area is not represented as UI affordances

- The Command Palette (`CommandPalette.tsx`) has only **12 commands** defined in
  `data/commands.ts`:
  - Sessions: `/sessions list`, `/sessions stop`
  - Conversation: `/clear`, `/checkpoint`, `/restore`
  - Security: `/trust`, `/untrust`
  - Help: `/help`, `/bug`
  - System: (frontend actions)
- **Missing**: `/config`, `/model`, `/mcp`, `/extensions`, `/recipes run`,
  `/tools`, and dozens more.

### Deep Dive: Critical Backend Parity Gaps (The "Invisible" Divergence)

Beyond UI missing features, the **backend itself (A2A Server)** behaves
differently than the CLI. This is a critical foundation risk.

#### G-1: `a2a-server` does NOT use `ConfigBuilder`

- The CLI and Desktop backend construct their configuration differently.
- Desktop backend (A2A) manually builds a config with fewer defaults, missing
  `policyEngineConfig`, `sandbox` settings, and sophisticated
  `includeDirectories` logic.
- **Result**: "Same input, different output" bugs between CLI and Desktop.

#### G-2: Environment Loading Divergence

- A2A server uses `dotenv.config({ override: true })` on startup, potentially
  overriding system env vars. CLI is more conservative/trust-gated.
- Can lead to different Auth/Model tokens being used.

#### G-3: Model defaults differ

- CLI uses `PREVIEW_GEMINI_MODEL_AUTO` / `DEFAULT_GEMINI_MODEL_AUTO`
- A2A uses `PREVIEW_GEMINI_MODEL` / `DEFAULT_GEMINI_MODEL` (fixed, not auto)

#### G-4: Approval mode selection differs

- CLI: Uses `--approval-mode` / `--yolo` CLI args
- A2A: Uses `GEMINI_YOLO_MODE` env only

#### G-5: `/tmp` fallback removed but legacy code paths remain

- `useSidecar.ts` no longer falls back to `/tmp`
- But `lib.rs` `start_cli()` still has: `unwrap_or_else(|_| "/tmp".to_string())`

---

## 2) Is it surfaced in the right way? (format, grouping, correctness)

### A) Approvals UX: mostly present, but critical PIN approval is broken

**What works**

- Confirmations are visible inline and include risk level + description.
- PIN input is supported in the card.
- `RiskBadge` component shows risk levels visually.

**Gaps / risks**

- **Keyboard approve (`Ctrl+Enter`) is effectively broken for PIN
  confirmations**
  - `App.tsx` tracks `pendingConfirmationPinReady` but it is always set to
    `false`.
  - **Code Evidence** (App.tsx:173):
    ```typescript
    setPendingConfirmationPinReady(false); // PIN ready state will be managed by ConfirmationCard (added in future task)
    ```
  - **Code Evidence** (ChatView.tsx:120):
    ```typescript
    false, // PIN ready state will be managed by ConfirmationCard in a future task
    ```
  - **ConfirmationCard.tsx** has the PIN state (`pin`, `pinLength`) but **does
    not expose an `onPinReadyChange` callback**.
  - Result: If a confirmation requires a PIN, `Ctrl+Enter` will never approve.
    The button works; the keyboard shortcut doesn't.

- **No global "pending approval" affordance**
  - If the confirmation card scrolls out of view, there's no global
    banner/indicator.
  - Recommendation: persistent header badge + jump-to-confirmation.

- **Approval mode naming is inconsistent across UI surfaces**
  - In `settingsStore.ts`: `'safe' | 'prompt' | 'yolo'`
  - In `WorkspaceView.tsx`: "Safe (confirm all)", "Smart (confirm risky)", "YOLO
    (no confirm)"
  - Recommendation: Define canonical labels + descriptions once.

### B) Settings UX: duplicated, incomplete, and architecturally problematic

**What's good**

- Activity views give a clear mental model: Assistant / Connectivity / Workspace
  / Terminal / Preferences.
- Settings persistence is simple and works.

**Key structural issues**

- **Settings are duplicated across views**: | Setting | Header | AssistantView |
  WorkspaceView | PreferenceView |
  |---------|--------|---------------|---------------|----------------| | Voice
  Toggle | ✓ | ✓ | | | | Provider | ✓ | ✓ | | | | Theme | ✓ | | | ✓ | |
  Workspace | | ✓ | ✓ | | | Approval Mode | | | ✓ | |

- **"API Key Required" message is misleading**
  - In `ChatView.tsx`, it shows "API Key Required" when `agentToken` is missing.
  - But `agentToken` is the _web-remote token_ for A2A, not a Gemini API key.
  - **Code Evidence** (ChatView.tsx:102):
    ```typescript
    const needsApiKey = !useSettingsStore((s) => s.agentToken);
    ```
  - This will confuse users who have a Gemini API key but no session token.

- **Provider selection is under-specified**
  - Current: `'gemini' | 'ollama'` dropdown
  - Backend supports: OpenAI-compatible, Anthropic, Azure, Vertex AI, etc.
  - No fields for: `baseUrl`, `apiKey`, `modelName`, `temperature`, etc.

- **Settings sync is "Write-Only"**
  - `syncToCli()` sends `/config set ...` commands but never reads back.
  - If CLI has different values (from disk, env vars, or command line), Desktop
    doesn't know.

### C) Connectivity indicator is now improved but still imperfect

- **Fixed (BM-4)**: `ConnectivityIndicator` now uses
  `useBridgeStore((s) => s.isConnected())` in addition to token presence.
- **Remaining Issue**: "Connected" is shown if
  `hasToken && (bridgeConnected || sidecarReady)`, but this doesn't account for:
  - Token being invalid/expired
  - Backend being unreachable (network issue)
  - Recommendation: Periodic `/healthz` polling, not just passive event
    listening.

### D) History UX is not "real history"

- The history store is purely local (`terminai-history`) and keyed by
  `taskId || 'default'`.
- It does not query backend sessions nor guarantee restore works.
- **BM-2 Fix Applied**: `SidePanel.tsx` now calls
  `setCurrentConversationId(sessionId)` on click.
- **Still Missing**: `/restore <sessionId>` is not sent. The
  `currentConversationId` only affects _future_ messages but doesn't replay past
  context.

---

## 3) Voice mode audit: does it work? what's missing?

### Current voice architecture (Deep Code Inspection)

**Voice output (TTS) is FUNCTIONAL**

- TTS pipeline confirmed working:
  - `useCliProcess.ts` → `useTts.ts` → Tauri `tts_synthesize` → Rust spawns
    `piper`
  - `packages/desktop/src-tauri/src/voice.rs` (171 lines)
- Speaks:
  - Assistant response at completion (via `deriveSpokenReply`)
  - Confirmation prompts
- **Code Evidence** (useCliProcess.ts:256-280):
  ```typescript
  const onBridgeComplete = useCallback(() => {
    // ...
    if (voiceEnabled) {
      const spoken = deriveSpokenReply(assistantText, 30);
      if (spoken) {
        void speak(spoken, { signal, volume });
      }
    }
  }, [...]);
  ```

**Voice input (STT) is COMPLETELY DISCONNECTED**

- STT pipeline components exist:
  - `VoiceOrb.tsx` (228 lines) - Full implementation with:
    - Push-to-talk (Space key when not in input)
    - Mouse press-and-hold
    - Audio recording via `useAudioRecorder`
    - Tauri `stt_transcribe` invocation
    - `onTranscript` callback to receive text
  - `useAudioRecorder.ts` (5055 bytes) - WebAudio API recording
  - `voice.rs` Rust backend - Whisper.cpp integration
- **CRITICAL GAP**: `VoiceOrb` is **never mounted** in the application!
  - `App.tsx` does not import or render `VoiceOrb`
  - `ChatView.tsx` has a mic button that only toggles `voiceStore.state` - it
    does NOT record audio

- **Code Evidence** (ChatView.tsx:509-526):

  ```typescript
  {voiceEnabled && (
    <Button
      onClick={() => {
        const { state, startListening, stopListening } = useVoiceStore.getState();
        if (state === 'LISTENING') stopListening(); else startListening();
      }}
    >
      <Mic /> // Just toggles state, no audio capture!
    </Button>
  )}
  ```

- **Result**: The mic button in ChatView changes the icon state and
  `voiceStore.state`, but:
  - No audio is ever captured
  - No STT is ever called
  - No text is ever transcribed
  - The feature is **visually present but functionally dead**

**Hard dependency on external binaries**

- STT requires `~/.terminai/voice/whisper` + `ggml-base.en.bin`
- TTS requires `~/.terminai/voice/piper` + `en_US-lessac-medium.onnx`
- Desktop UI does not provide an install flow; Rust returns:
  > "Whisper binary not found. Run 'terminai voice install' first."

### Voice UX gaps (prioritized)

| ID        | Gap                                                | Severity     | Fix Complexity                        |
| --------- | -------------------------------------------------- | ------------ | ------------------------------------- |
| G-Voice-1 | Voice input (STT) is not integrated into main chat | **Critical** | Medium - Mount VoiceOrb or port logic |
| G-Voice-2 | No install/status UX for whisper/piper assets      | High         | Medium - Add Voice Setup view         |
| G-Voice-3 | Permission model fragile on Linux (WebKitGTK)      | Medium       | Low - Better error messages           |
| G-Voice-4 | VoiceStore state machine not driven by audio       | Medium       | Low - Wire to useAudioRecorder        |
| G-Voice-5 | Push-to-talk (Space) conflicts with text input     | Low          | Low - Use different key or modifier   |

---

## 4) Recommendations (the actual home-stretch plan)

### R-0: Backend Parity First (Foundation)

**Goal**: Ensure `a2a-server` behaves exactly like the CLI.

- Adopt `ConfigBuilder` in `a2a-server`.
- Align environment loading and model defaults.
- **Why**: Without this, UI features for settings/models will be unstable or
  ineffective.

**Files to change**:

- `packages/a2a-server/src/config/config.ts`
- `packages/a2a-server/src/http/app.ts`

### R-1: Make History real (backend-driven sessions)

**Goal**: History view should restore _real backend sessions_, not just local
metadata.

**Minimal viable approach**:

1. On click session: send `/restore <sessionId>` via `sendMessage` (in addition
   to setting `currentConversationId`).
2. Add backend sessions fetch: Call `/sessions list` on mount and merge with
   local.

**Better approach**:

- Add a "Sessions API integration" layer.
- Remove local-only store as source of truth.

**Code to modify**:

- `packages/desktop/src/components/SidePanel.tsx` (add `/restore` call)
- `packages/desktop/src/stores/historyStore.ts` (add backend sync)

### R-2: Make "Connectivity" truthful and actionable

**Goal**: User always understands: sidecar status, agent health, token validity.

**Implementation**:

1. Add periodic `/healthz` check (every 30s)
2. Use result as source of truth
3. Show detailed status on hover/click

**Code to modify**:

- `packages/desktop/src/hooks/useCliProcess.ts` (add `checkConnection` interval)
- `packages/desktop/src/components/ConnectivityIndicator.tsx` (show health
  details)

### R-3: Consolidate settings into one consistent system

**Problem**: Settings are scattered, incomplete, and write-only.

**Architecture recommendation**:

1. Create a `SettingsSchema.ts` mapping UI fields → backend config keys
2. Render Settings UI dynamically from schema
3. Add read-back on mount (parse `/config show` output or add API)

**Why**: Prevents missing settings, wrong keys, and drift.

### R-4: Approvals UX polish (make it "impossible to miss")

**Fix PIN + keyboard approval**:

1. Add `onPinReadyChange: (ready: boolean) => void` prop to `ConfirmationCard`
2. Call it when `pin.length === pinLength`
3. Wire to `App.tsx` `setPendingConfirmationPinReady`

**Add global approval banner**:

- Header pill: "⚠️ Approval needed: <tool>" with click-to-scroll

**Code to modify**:

- `packages/desktop/src/components/ConfirmationCard.tsx`
- `packages/desktop/src/components/ChatView.tsx`
- `packages/desktop/src/App.tsx`

### R-5: Make voice mode a first-class, cohesive feature

**Immediate Fix (Critical)**: Replace the `ChatView` mic toggle with actual STT:

Option A: **Embed VoiceOrb**

```tsx
// In ChatView.tsx toolbar
<VoiceOrb
  onTranscript={(text) => setInput((prev) => prev + text)}
  disabled={!voiceEnabled || isProcessing}
/>
```

Option B: **Port VoiceOrb logic into ChatView**

- Use `useAudioRecorder` directly
- Call `invoke('stt_transcribe', { wavBytes })` on stop

**Add Voice Setup View**:

- Check for whisper/piper binaries
- Show install command
- Test TTS/STT with sample

**Files to modify**:

- `packages/desktop/src/components/ChatView.tsx`
- `packages/desktop/src/components/views/AssistantView.tsx` (or new
  VoiceSetupView)

### R-6: Clarify the "token" story (reduce user confusion)

**Changes needed**:

1. Rename "API Key Required" to "Session Token Required" or "Agent Token
   Required"
2. Add explanation text: "This is your local session token, not a Gemini API
   key"
3. Auto-populate from sidecar if using embedded mode

**Files to modify**:

- `packages/desktop/src/components/ChatView.tsx` (lines 241-260)
- `packages/desktop/src/components/AuthScreen.tsx`

### R-7: Surface PTY terminal capabilities (NEW)

**Opportunity**: The Rust backend has full PTY support but UI doesn't use it.

**Implementation**:

1. Add "Open Terminal" button in TerminalView or EngineRoomPane
2. Call `invoke('start_pty_session', { ... })`
3. Render with xterm.js or similar
4. Use existing `send_terminal_input`, `resize_pty_session`

**Why**: Enables interactive debugging, `sudo` prompts, full shell access.

### R-8: Expand Command Palette (NEW)

**Current**: 12 commands **Should have**: All CLI commands discoverable

**Implementation**:

1. Fetch available commands from backend or use static list matching CLI
2. Add categories: Config, Extensions, MCP, Tools, Memory
3. Add arguments input for commands that need them (e.g., `/restore <id>`)

---

## 5) Suggested milestone checklist (tight scope)

### Phase 0: Backend Foundational Fixes

- [ ] Implement `ConfigBuilder` in A2A server
- [ ] Fix environment/trust loading logic
- [ ] Remove hardcoded `/tmp` paths in Rust bridge

### Phase 1: Critical UX Fixes

- [ ] **Voice STT works**: Mount `VoiceOrb` or port logic to ChatView
- [ ] **PIN approval works**: Add `onPinReadyChange` callback chain
- [ ] **History restore works**: Send `/restore` command on session click

### Phase 2: Connectivity & Settings

- [ ] Use healthz-based status with periodic polling
- [ ] Settings consolidation: Single schema, remove duplicates
- [ ] Token/API key naming clarification

### Phase 3: Polish & Expansion

- [ ] Global approval banner
- [ ] Voice setup/install screen
- [ ] Expand command palette
- [ ] (Optional) PTY terminal integration

---

## 6) Appendix: Code Audit Findings Summary

| Finding                              | Location                  | Severity | Status         |
| ------------------------------------ | ------------------------- | -------- | -------------- |
| VoiceOrb not mounted                 | App.tsx, ChatView.tsx     | Critical | Open           |
| PIN readiness not reported           | ConfirmationCard.tsx      | High     | Open           |
| History is local-only                | historyStore.ts           | High     | Partial (BM-2) |
| `/restore` not sent on session click | SidePanel.tsx             | High     | Open           |
| useSessions unused                   | hooks/useSessions.ts      | Low      | Design issue   |
| PTY fully implemented but unused     | lib.rs, pty_session.rs    | Medium   | Opportunity    |
| Command palette has 12/50+ commands  | data/commands.ts          | Medium   | Open           |
| Settings duplicated across 4 views   | views/\*.tsx              | Medium   | Open           |
| ConnectivityIndicator improved       | ConnectivityIndicator.tsx | -        | Fixed (BM-4)   |
| Bridge state machine robust          | bridge/\*.ts              | -        | Good           |

---

## Conclusion

The Desktop app is solid as a _streaming chat + tool trace_ frontend, but it
lacks the **"product glue"** to be a standalone tool.

**Critical blockers** (must fix for usability):

1. Voice STT is dead code - the mic button does nothing
2. PIN keyboard approval doesn't work
3. History restore doesn't work (just sets internal ID, no context replay)

**Foundation risks** (will cause mysterious bugs):

1. A2A server uses different config pipeline than CLI
2. Settings are write-only (no read-back)

**Quick wins** (easy to implement):

1. Mount VoiceOrb component
2. Add `onPinReadyChange` callback
3. Send `/restore` on session click
4. Expand command palette

This plan moves the app from **"UI Prototype"** to **"Reliable Product"**.
