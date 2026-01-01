# TerminaI UX Streamlining: Unified Execution Plan

**Date:** 2025-12-29  
**Source:** Synthesis of all UX review documents  
**Constraint:** UI/Frontend changes only. No backend API modifications.  
**Target Executor:** Any LLM agent (written for Gemini Flash level
comprehension)

---

## Critical Instructions for Executing Agent

1. **ALWAYS verify current file content before editing** — Line numbers may have
   shifted
2. **Use exact string matching** — Copy the BEFORE block exactly as shown
3. **Include all imports** — Each task specifies required imports
4. **Test after each task** — Run `npm run dev --workspace @terminai/desktop`
5. **Do tasks in order** — Some tasks depend on earlier changes

---

## Implementation Checklist

### Phase 0: Bootstrap (Foundational)

- [ ] Task 0: Auto-spawn CLI backend when Tauri app starts (single entry point)

### Phase 1: Critical Flow Fixes (P1)

- [ ] Task 1: Add `Ctrl+Enter` global hotkey to approve pending confirmation
- [ ] Task 2: Add `Esc` global hotkey to deny/cancel pending confirmation
- [ ] Task 3: Auto-focus chat input after modal closes
- [ ] Task 4: Auto-focus chat input after tool execution completes
- [ ] Task 5: Add `Ctrl+N` global hotkey for New Chat
- [ ] Task 6: Add connection status indicator to header bar
- [ ] Task 7: Lock chat input during message sending
- [ ] Task 8: Add Up-Arrow history navigation in chat input
- [ ] Task 9: Add model dropdown to header bar
- [ ] Task 10: Add voice toggle button to header bar

---

## Task 0: Auto-Spawn CLI Backend When Tauri App Starts

### Objective

Make the Tauri desktop app the **single entry point** for TerminaI. When the
user opens the app:

1. Tauri spawns the CLI backend with `--web-remote` enabled
2. Tauri captures the generated token and connection URL
3. Tauri auto-connects to the backend
4. If LLM API key is missing, guide user through inline setup
5. User never needs to run `terminai` separately or copy-paste tokens

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Tauri App Launch                                 │
│                          │                                          │
│                          ▼                                          │
│              ┌───────────────────────┐                              │
│              │  spawn_cli_backend()  │  (Rust: lib.rs)              │
│              │  - Run terminai       │                              │
│              │  - --web-remote       │                              │
│              │  - --web-remote-port  │                              │
│              │  - Capture stdout     │                              │
│              └───────────┬───────────┘                              │
│                          │                                          │
│            ┌─────────────┴─────────────┐                            │
│            │  Parse startup output     │                            │
│            │  - Extract token          │                            │
│            │  - Extract port           │                            │
│            │  - Emit "cli-ready" event │                            │
│            └─────────────┬─────────────┘                            │
│                          │                                          │
│                          ▼                                          │
│              ┌───────────────────────┐                              │
│              │  Frontend listener    │  (React: App.tsx)            │
│              │  - listen("cli-ready")│                              │
│              │  - setAgentUrl(url)   │                              │
│              │  - setAgentToken(tok) │                              │
│              │  - setShowAuth(false) │                              │
│              └───────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Files to Modify (in order)

1. `packages/desktop/src-tauri/src/lib.rs` — Add `spawn_cli_backend` command
2. `packages/desktop/src-tauri/src/cli_bridge.rs` — Modify to capture web-remote
   token
3. `packages/desktop/src/App.tsx` — Auto-spawn on mount, listen for ready event
4. `packages/desktop/src/components/AuthScreen.tsx` — Add "Starting agent..."
   loading state

---

### Step 0.1: Add spawn_cli_backend command to lib.rs

**File:** `packages/desktop/src-tauri/src/cli_bridge.rs`

**FIND THIS EXACT CODE:**

```rust
impl CliBridge {
    pub fn spawn(app: AppHandle) -> Result<Self, String> {
        // Try to find termai/gemini binary
        let cli_cmd = std::env::var("TERMAI_CLI_PATH").unwrap_or_else(|_| "gemini".to_string());

        let mut child = Command::new(&cli_cmd)
            .args(["--output-format", "stream-json"])
```

**REPLACE WITH:**

```rust
#[derive(Clone, serde::Serialize)]
pub struct CliReadyEvent {
    pub url: String,
    pub token: String,
    pub workspace: String,
}

impl CliBridge {
    pub fn spawn_web_remote(app: AppHandle, workspace: String) -> Result<Self, String> {
        // Try to find termai/gemini binary
        let cli_cmd = std::env::var("TERMAI_CLI_PATH").unwrap_or_else(|_| "terminai".to_string());

        // Fixed port for predictable connection
        let port = std::env::var("CODER_AGENT_PORT").unwrap_or_else(|_| "41242".to_string());

        let mut child = Command::new(&cli_cmd)
            .args([
                "--web-remote",
                "--web-remote-port", &port,
                "--output-format", "stream-json",
            ])
            .current_dir(&workspace)
```

---

**FIND THIS EXACT CODE:**

```rust
        // Stream stdout to frontend
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if !*running_clone.lock().unwrap() {
                    break;
                }
                if let Ok(line) = line {
                    let _ = app.emit("cli-output", line);
                }
            }
        });
```

**REPLACE WITH:**

```rust
        let workspace_clone = workspace.clone();
        let app_clone = app.clone();

        // Stream stdout and capture web-remote ready signal
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            let mut token_found = false;

            for line in reader.lines() {
                if !*running_clone.lock().unwrap() {
                    break;
                }
                if let Ok(line) = line {
                    // Look for the web-remote token in output
                    // Format: "Token stored at /path" or contains token
                    if !token_found && line.contains("Token") {
                        // Try to read token from auth file
                        if let Ok(token) = Self::read_web_remote_token() {
                            let url = format!("http://127.0.0.1:{}", port);
                            let _ = app.emit("cli-ready", CliReadyEvent {
                                url: url.clone(),
                                token: token.clone(),
                                workspace: workspace_clone.clone(),
                            });
                            token_found = true;
                        }
                    }

                    // Also check for "Server listening" message
                    if !token_found && line.contains("listening") {
                        if let Ok(token) = Self::read_web_remote_token() {
                            let url = format!("http://127.0.0.1:{}", port);
                            let _ = app.emit("cli-ready", CliReadyEvent {
                                url,
                                token,
                                workspace: workspace_clone.clone(),
                            });
                            token_found = true;
                        }
                    }

                    let _ = app_clone.emit("cli-output", line);
                }
            }
        });
```

---

**ADD THIS CODE at the end of the CliBridge impl block (before the closing
`}`):**

```rust
    fn read_web_remote_token() -> Result<String, String> {
        // Read from ~/.terminai/web-remote-auth.json
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let auth_path = format!("{}/.terminai/web-remote-auth.json", home);

        let content = std::fs::read_to_string(&auth_path)
            .map_err(|e| format!("Failed to read auth file: {}", e))?;

        // Parse JSON to extract token
        // Format: {"token": "xxx", "tokenHash": "yyy"}
        if let Some(start) = content.find("\"token\":") {
            let rest = &content[start + 9..];
            if let Some(end) = rest.find('"') {
                let after_quote = &rest[1..];
                if let Some(close) = after_quote.find('"') {
                    return Ok(after_quote[..close].to_string());
                }
            }
        }

        Err("Token not found in auth file".to_string())
    }

    // Keep the old spawn for backward compatibility
    pub fn spawn(app: AppHandle) -> Result<Self, String> {
        Self::spawn_web_remote(app, "/tmp".to_string())
    }
```

---

### Step 0.2: Add spawn_cli_backend command to lib.rs

**File:** `packages/desktop/src-tauri/src/lib.rs`

**FIND THIS EXACT CODE:**

```rust
#[tauri::command]
fn start_cli(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
    let bridge = CliBridge::spawn(app)?;
    *state.cli.lock().unwrap() = Some(bridge);
    Ok(())
}
```

**REPLACE WITH:**

```rust
#[tauri::command]
fn start_cli(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
    let bridge = CliBridge::spawn(app)?;
    *state.cli.lock().unwrap() = Some(bridge);
    Ok(())
}

#[tauri::command]
fn spawn_cli_backend(
    app: tauri::AppHandle,
    state: State<AppState>,
    workspace: String,
) -> Result<(), String> {
    // Spawn CLI with web-remote enabled
    let bridge = cli_bridge::CliBridge::spawn_web_remote(app, workspace)?;
    *state.cli.lock().unwrap() = Some(bridge);
    Ok(())
}
```

---

**FIND THIS EXACT CODE:**

```rust
        .invoke_handler(tauri::generate_handler![
            greet,
            start_cli,
            send_to_cli,
```

**REPLACE WITH:**

```rust
        .invoke_handler(tauri::generate_handler![
            greet,
            start_cli,
            spawn_cli_backend,
            send_to_cli,
```

---

### Step 0.3: Auto-spawn backend from App.tsx

**File:** `packages/desktop/src/App.tsx`

**FIND THIS EXACT CODE:**

```typescript
import { useRef, useState, useEffect, useCallback } from 'react';
```

**REPLACE WITH:**

```typescript
import { useRef, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
```

---

**FIND THIS EXACT CODE:**

```typescript
const [showAuth, setShowAuth] = useState(true);
```

**REPLACE WITH:**

```typescript
const [showAuth, setShowAuth] = useState(true);
const [isBootstrapping, setIsBootstrapping] = useState(true);
const [bootstrapError, setBootstrapError] = useState<string | null>(null);
```

---

**ADD THIS CODE after the `resolvedTheme` useEffect (around line 63), before
`useKeyboardShortcuts`:**

```typescript
// Auto-spawn CLI backend on app start
useEffect(() => {
  let unlisten: (() => void) | undefined;

  const bootstrap = async () => {
    try {
      // Listen for CLI ready event
      unlisten = await listen<{
        url: string;
        token: string;
        workspace: string;
      }>('cli-ready', (event) => {
        const { url, token, workspace } = event.payload;
        useSettingsStore.getState().setAgentUrl(url);
        useSettingsStore.getState().setAgentToken(token);
        useSettingsStore.getState().setAgentWorkspacePath(workspace);
        setShowAuth(false);
        setIsBootstrapping(false);
      });

      // Get current working directory for workspace
      const workspace = await invoke<string>('get_current_dir').catch(
        () => '/tmp',
      );

      // Spawn CLI backend
      await invoke('spawn_cli_backend', { workspace });

      // Timeout fallback - if CLI doesn't emit ready in 10s, show auth screen
      setTimeout(() => {
        if (isBootstrapping) {
          setIsBootstrapping(false);
          setBootstrapError(
            'CLI backend did not respond. Please check the logs.',
          );
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to spawn CLI backend:', error);
      setIsBootstrapping(false);
      setBootstrapError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  // Only bootstrap if we don't have a token already
  if (!agentToken) {
    bootstrap();
  } else {
    setIsBootstrapping(false);
    setShowAuth(false);
  }

  return () => {
    unlisten?.();
  };
}, [agentToken]);
```

---

### Step 0.4: Add loading state to AuthScreen

**File:** `packages/desktop/src/components/AuthScreen.tsx`

**FIND THIS EXACT CODE:**

```typescript
interface Props {
  onAuthenticated: () => void;
}
```

**REPLACE WITH:**

```typescript
interface Props {
  onAuthenticated: () => void;
  isBootstrapping?: boolean;
  bootstrapError?: string | null;
}
```

---

**FIND THIS EXACT CODE:**

```typescript
export function AuthScreen({ onAuthenticated }: Props) {
```

**REPLACE WITH:**

```typescript
export function AuthScreen({ onAuthenticated, isBootstrapping, bootstrapError }: Props) {
```

---

**FIND THIS EXACT CODE:**

```typescript
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-primary)]">
      <h1 className="text-4xl font-bold mb-2 text-white">TerminaI</h1>
      <p className="text-gray-400 mb-8">Connect to your agent (A2A) backend</p>
```

**REPLACE WITH:**

```typescript
  // Show bootstrapping state
  if (isBootstrapping) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-primary)]">
        <h1 className="text-4xl font-bold mb-2 text-white">TerminaI</h1>
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Starting agent backend...</span>
        </div>
        {bootstrapError && (
          <p className="mt-4 text-red-400 text-sm">{bootstrapError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-primary)]">
      <h1 className="text-4xl font-bold mb-2 text-white">TerminaI</h1>
      <p className="text-gray-400 mb-8">Connect to your agent (A2A) backend</p>
```

---

### Step 0.5: Pass bootstrap props to AuthScreen in App.tsx

**FIND THIS EXACT CODE:**

```typescript
  if (showAuth && !agentToken) {
    return <AuthScreen onAuthenticated={() => setShowAuth(false)} />
  }
```

**REPLACE WITH:**

```typescript
  if (showAuth && !agentToken) {
    return (
      <AuthScreen
        onAuthenticated={() => setShowAuth(false)}
        isBootstrapping={isBootstrapping}
        bootstrapError={bootstrapError}
      />
    )
  }
```

---

### Step 0.6: Add get_current_dir command to lib.rs

**File:** `packages/desktop/src-tauri/src/lib.rs`

**FIND THIS EXACT CODE:**

```rust
#[tauri::command]
fn greet(name: &str) -> String {
```

**ADD THIS CODE BEFORE IT:**

```rust
#[tauri::command]
fn get_current_dir() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get current dir: {}", e))
}
```

---

**FIND THIS EXACT CODE:**

```rust
            greet,
            start_cli,
```

**REPLACE WITH:**

```rust
            greet,
            get_current_dir,
            start_cli,
```

---

### Verification for Task 0

1. Run: `npm run tauri dev --workspace @terminai/desktop`
2. App should show "Starting agent backend..." spinner
3. After 2-3 seconds, should auto-connect and show chat
4. Check header shows green "Connected" indicator
5. Send a test message — agent should respond

### Fallback Behavior

If the CLI fails to start (binary not found, port in use, etc.):

- App shows error message after 10s timeout
- User can manually enter Agent URL + Token as fallback
- This preserves the ability to connect to remote agents

---

## Task 1: Add `Ctrl+Enter` Global Hotkey to Approve Pending Confirmation

### Objective

Allow users to approve tool confirmations with keyboard instead of mouse click.

### Files to Modify (in order)

1. `packages/desktop/src/hooks/useKeyboardShortcuts.ts`
2. `packages/desktop/src/App.tsx`
3. `packages/desktop/src/components/ConfirmationCard.tsx`

---

### Step 1.1: Modify useKeyboardShortcuts.ts

**File:** `packages/desktop/src/hooks/useKeyboardShortcuts.ts`

**FIND THIS EXACT CODE:**

```typescript
interface KeyboardShortcuts {
  onToggleTerminal?: () => void;
  onFocusChat?: () => void;
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onNewConversation?: () => void;
  onEscape?: () => void;
}
```

**REPLACE WITH:**

```typescript
interface KeyboardShortcuts {
  onToggleTerminal?: () => void;
  onFocusChat?: () => void;
  onOpenPalette?: () => void;
  onOpenSettings?: () => void;
  onNewConversation?: () => void;
  onEscape?: () => void;
  onApprove?: () => void;
}
```

---

**FIND THIS EXACT CODE:**

```typescript
// Escape: Close/return
if (e.key === 'Escape') {
  handlers.onEscape?.();
  return;
}
```

**REPLACE WITH:**

```typescript
// Ctrl+Enter: Approve pending confirmation
if (e.ctrlKey && e.key === 'Enter') {
  e.preventDefault();
  handlers.onApprove?.();
  return;
}

// Escape: Close/return
if (e.key === 'Escape') {
  handlers.onEscape?.();
  return;
}
```

---

### Step 1.2: Modify App.tsx

**File:** `packages/desktop/src/App.tsx`

**FIND THIS EXACT CODE:**

```typescript
import { useRef, useState, useEffect } from 'react';
```

**REPLACE WITH:**

```typescript
import { useRef, useState, useEffect, useCallback } from 'react';
```

---

**FIND THIS EXACT CODE:**

```typescript
const chatInputRef = useRef<HTMLTextAreaElement>(null);
```

**REPLACE WITH:**

```typescript
const chatInputRef = useRef<HTMLTextAreaElement>(null);
const [pendingConfirmationId, setPendingConfirmationId] = useState<
  string | null
>(null);
```

---

**FIND THIS EXACT CODE:**

```typescript
useKeyboardShortcuts({
  onOpenPalette: () => setIsPaletteOpen(true),
  onOpenSettings: () => setIsSettingsOpen(true),
  onFocusChat: () => chatInputRef.current?.focus(),
});
```

**REPLACE WITH:**

```typescript
useKeyboardShortcuts({
  onOpenPalette: () => setIsPaletteOpen(true),
  onOpenSettings: () => setIsSettingsOpen(true),
  onFocusChat: () => chatInputRef.current?.focus(),
  onApprove: () => {
    if (pendingConfirmationId) {
      respondToConfirmation(pendingConfirmationId, true);
      setPendingConfirmationId(null);
      setTimeout(() => chatInputRef.current?.focus(), 0);
    }
  },
  onEscape: () => {
    if (pendingConfirmationId) {
      respondToConfirmation(pendingConfirmationId, false);
      setPendingConfirmationId(null);
      setTimeout(() => chatInputRef.current?.focus(), 0);
    } else if (isSettingsOpen) {
      setIsSettingsOpen(false);
      setTimeout(() => chatInputRef.current?.focus(), 0);
    } else if (isPaletteOpen) {
      setIsPaletteOpen(false);
      setTimeout(() => chatInputRef.current?.focus(), 0);
    }
  },
});
```

---

**FIND THIS EXACT CODE:**

```typescript
            <ChatView
              messages={messages}
              isConnected={isConnected}
              isProcessing={isProcessing}
              currentToolStatus={currentToolStatus}
              sendMessage={sendMessage}
              respondToConfirmation={respondToConfirmation}
              inputRef={chatInputRef}
            />
```

**REPLACE WITH:**

```typescript
            <ChatView
              messages={messages}
              isConnected={isConnected}
              isProcessing={isProcessing}
              currentToolStatus={currentToolStatus}
              sendMessage={sendMessage}
              respondToConfirmation={respondToConfirmation}
              inputRef={chatInputRef}
              onPendingConfirmation={setPendingConfirmationId}
            />
```

---

### Step 1.3: Modify ChatView.tsx to expose pending confirmation

**File:** `packages/desktop/src/components/ChatView.tsx`

**FIND THIS EXACT CODE:**

```typescript
interface ChatViewProps {
  messages: Message[];
  isConnected: boolean;
  isProcessing: boolean;
  currentToolStatus?: string | null;
  sendMessage: (text: string) => void;
  respondToConfirmation: (id: string, approved: boolean, pin?: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}
```

**REPLACE WITH:**

```typescript
interface ChatViewProps {
  messages: Message[];
  isConnected: boolean;
  isProcessing: boolean;
  currentToolStatus?: string | null;
  sendMessage: (text: string) => void;
  respondToConfirmation: (id: string, approved: boolean, pin?: string) => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onPendingConfirmation?: (id: string | null) => void;
}
```

---

**FIND THIS EXACT CODE:**

```typescript
export function ChatView({
  messages,
  isConnected,
  isProcessing,
  currentToolStatus,
  sendMessage,
  inputRef,
}: ChatViewProps) {
```

**REPLACE WITH:**

```typescript
export function ChatView({
  messages,
  isConnected,
  isProcessing,
  currentToolStatus,
  sendMessage,
  inputRef,
  onPendingConfirmation,
}: ChatViewProps) {
```

---

**ADD THIS CODE after the `const displayMessages = ...` block (around line
52):**

```typescript
// Track pending confirmation for keyboard shortcuts
useEffect(() => {
  const pendingMsg = messages.find((m) => m.pendingConfirmation);
  onPendingConfirmation?.(pendingMsg?.pendingConfirmation?.id ?? null);
}, [messages, onPendingConfirmation]);
```

---

### Step 1.4: Modify ConfirmationCard.tsx to show keyboard hints

**File:** `packages/desktop/src/components/ConfirmationCard.tsx`

**FIND THIS EXACT CODE:**

```typescript
        <button
          className="btn"
          onClick={() => onRespond(true, requiresPin ? pin : undefined)}
          disabled={requiresPin && pin.length !== pinLength}
          style={{
            flex: 1,
            background: '#22c55e',
            color: 'white',
          }}
        >
          Yes, proceed
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onRespond(false, requiresPin ? pin : undefined)}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
```

**REPLACE WITH:**

```typescript
        <button
          className="btn"
          onClick={() => onRespond(true, requiresPin ? pin : undefined)}
          disabled={requiresPin && pin.length !== pinLength}
          style={{
            flex: 1,
            background: '#22c55e',
            color: 'white',
          }}
        >
          Yes, proceed
          <kbd style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.7em', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>Ctrl+↵</kbd>
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onRespond(false, requiresPin ? pin : undefined)}
          style={{ flex: 1 }}
        >
          Cancel
          <kbd style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.7em', background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Esc</kbd>
        </button>
```

---

### Verification for Task 1

1. Run: `npm run dev --workspace @terminai/desktop`
2. Send a message that triggers a tool confirmation (e.g., "list files in /tmp")
3. When confirmation appears, press `Ctrl+Enter` — should approve
4. Trigger another confirmation, press `Esc` — should cancel
5. After both actions, cursor should be in chat input (no click needed)

---

## Task 2: (Already done in Task 1)

The `Esc` handling and keyboard hints were included in Task 1. Skip to Task 3.

---

## Task 3: Auto-Focus Chat Input After Modal Closes

### Objective

When Settings or Command Palette closes, focus returns to chat input
automatically.

### File to Modify

`packages/desktop/src/App.tsx`

---

### Step 3.1: Modify CommandPalette onClose

**FIND THIS EXACT CODE:**

```typescript
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onSelect={(cmd) => {
            sendMessage(cmd.action)
            setIsPaletteOpen(false)
          }}
        />
```

**REPLACE WITH:**

```typescript
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => {
            setIsPaletteOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
          onSelect={(cmd) => {
            sendMessage(cmd.action)
            setIsPaletteOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
        />
```

---

### Step 3.2: Modify SettingsPanel onClose

**FIND THIS EXACT CODE:**

```typescript
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
```

**REPLACE WITH:**

```typescript
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false)
            setTimeout(() => chatInputRef.current?.focus(), 0)
          }}
        />
```

---

### Verification for Task 3

1. Press `Ctrl+K` to open palette, then `Esc` — cursor should be in chat
2. Press `Ctrl+,` to open settings, then `Esc` — cursor should be in chat
3. No clicking required to resume typing

---

## Task 4: Auto-Focus Chat Input After Tool Execution Completes

### Objective

When agent finishes processing, focus returns to chat input.

### Files to Modify

1. `packages/desktop/src/hooks/useCliProcess.ts`
2. `packages/desktop/src/App.tsx`

---

### Step 4.1: Modify useCliProcess.ts signature

**FIND THIS EXACT CODE:**

```typescript
export function useCliProcess() {
```

**REPLACE WITH:**

```typescript
export function useCliProcess(options?: { onComplete?: () => void }) {
```

---

### Step 4.2: Call onComplete when processing finishes

**FIND THIS EXACT CODE in handleJsonRpc function:**

```typescript
      if (result.final === true) {
        setIsProcessing(false);
        setToolStatus(null);
        setWaitingForInput(false);
        activeStreamAbortRef.current = null;

        if (voiceEnabled) {
```

**REPLACE WITH:**

```typescript
      if (result.final === true) {
        setIsProcessing(false);
        setToolStatus(null);
        setWaitingForInput(false);
        activeStreamAbortRef.current = null;

        // Return focus to chat input
        options?.onComplete?.();

        if (voiceEnabled) {
```

---

### Step 4.3: Pass onComplete from App.tsx

**FIND THIS EXACT CODE:**

```typescript
const {
  messages,
  isConnected,
  isProcessing,
  activeTerminalSession,
  sendMessage,
  respondToConfirmation,
} = useCliProcess();
```

**REPLACE WITH:**

```typescript
const {
  messages,
  isConnected,
  isProcessing,
  activeTerminalSession,
  sendMessage,
  respondToConfirmation,
} = useCliProcess({
  onComplete: () => {
    setTimeout(() => chatInputRef.current?.focus(), 0);
  },
});
```

---

### Verification for Task 4

1. Send a message to the agent
2. Wait for response to complete
3. Immediately start typing — should work (no click needed)

---

## Task 5: Add `Ctrl+N` Global Hotkey for New Chat

### Objective

Start a new conversation with a keyboard shortcut.

### File to Modify

`packages/desktop/src/App.tsx`

---

### Step 5.1: Add clearChat function and wire to shortcuts

**FIND THIS EXACT CODE:**

```typescript
  useKeyboardShortcuts({
    onOpenPalette: () => setIsPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
    onFocusChat: () => chatInputRef.current?.focus(),
    onApprove: () => {
```

**REPLACE WITH:**

```typescript
  const clearChat = useCallback(() => {
    sendMessage('/clear')
    setTimeout(() => chatInputRef.current?.focus(), 100)
  }, [sendMessage])

  useKeyboardShortcuts({
    onOpenPalette: () => setIsPaletteOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
    onFocusChat: () => chatInputRef.current?.focus(),
    onNewConversation: clearChat,
    onApprove: () => {
```

---

### Verification for Task 5

1. Have some chat messages visible
2. Press `Ctrl+N`
3. Chat should clear and cursor should be in input

---

## Task 6: Add Connection Status Indicator to Header Bar

### Objective

Show always-visible Connected/Disconnected status.

### File to Modify

`packages/desktop/src/App.tsx`

---

### Step 6.1: Add status indicator to header

**FIND THIS EXACT CODE:**

```typescript
        <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="h-8 w-8 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <TerminaILogo size="small" />
          </div>
```

**REPLACE WITH:**

```typescript
        <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="h-8 w-8 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <TerminaILogo size="small" />
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs ml-4">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                style={{
                  boxShadow: isConnected
                    ? '0 0 6px rgba(34, 197, 94, 0.6)'
                    : '0 0 6px rgba(239, 68, 68, 0.6)'
                }}
              />
              <span className="text-muted-foreground hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
```

---

### Verification for Task 6

1. Run the app — should show green "Connected"
2. Stop the agent backend — should show red "Disconnected"

---

## Task 7: Lock Chat Input During Message Sending

### Objective

Show clear visual feedback when agent is processing.

### File to Modify

`packages/desktop/src/components/ChatView.tsx`

---

### Step 7.1: Add cn import if not present

**VERIFY this import exists at top of file:**

```typescript
import { cn } from '../lib/utils';
```

If missing, add it after the React imports.

---

### Step 7.2: Improve textarea styling

**FIND THIS EXACT CODE:**

```typescript
            <textarea
              ref={actualInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, @ for context"
              rows={3}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 pr-10 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-base resize-none min-h-[84px] max-h-48 disabled:opacity-50"
```

**REPLACE WITH:**

```typescript
            <textarea
              ref={actualInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isProcessing ? "Agent is thinking..." : "Ask anything, @ for context"}
              rows={3}
              disabled={isProcessing}
              className={cn(
                "w-full px-4 py-2.5 pr-10 bg-input border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-base resize-none min-h-[84px] max-h-48",
                isProcessing
                  ? "opacity-60 cursor-not-allowed border-amber-500/40 bg-amber-500/5"
                  : "border-border"
              )}
```

---

### Verification for Task 7

1. Send a message to agent
2. While processing: input should show "Agent is thinking..." and have amber
   tint
3. After completion: input returns to normal

---

## Task 8: Add Up-Arrow History Navigation in Chat Input

### Objective

Press Up-Arrow in empty input to recall previous messages.

### File to Modify

`packages/desktop/src/components/ChatView.tsx`

---

### Step 8.1: Add useMemo import

**FIND THIS EXACT CODE:**

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';
```

**REPLACE WITH:**

```typescript
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
```

---

### Step 8.2: Add history state

**FIND THIS EXACT CODE:**

```typescript
const [input, setInput] = useState('');
```

**REPLACE WITH:**

```typescript
const [input, setInput] = useState('');
const [historyIndex, setHistoryIndex] = useState(-1);

// Memoize user message history (most recent first)
const userMessages = useMemo(
  () =>
    messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .reverse(),
  [messages],
);
```

---

### Step 8.3: Replace handleKeyDown function

**FIND THIS EXACT CODE:**

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};
```

**REPLACE WITH:**

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
    setHistoryIndex(-1);
    return;
  }

  // Up-Arrow: Navigate to older messages
  if (e.key === 'ArrowUp' && (input === '' || historyIndex >= 0)) {
    e.preventDefault();
    const newIndex = Math.min(historyIndex + 1, userMessages.length - 1);
    if (newIndex >= 0 && userMessages[newIndex]) {
      setHistoryIndex(newIndex);
      setInput(userMessages[newIndex]);
    }
    return;
  }

  // Down-Arrow: Navigate to newer messages
  if (e.key === 'ArrowDown' && historyIndex >= 0) {
    e.preventDefault();
    const newIndex = historyIndex - 1;
    if (newIndex < 0) {
      setHistoryIndex(-1);
      setInput('');
    } else {
      setHistoryIndex(newIndex);
      setInput(userMessages[newIndex]);
    }
    return;
  }
};
```

---

### Verification for Task 8

1. Send 2-3 messages
2. Clear the input
3. Press Up-Arrow — should show last message
4. Press Up-Arrow again — should show older message
5. Press Down-Arrow — should go back to newer message

---

## Task 9: Add Model Dropdown to Header Bar

### Objective

1-click model switching from header.

### File to Modify

`packages/desktop/src/App.tsx`

---

### Step 9.1: Add provider state access

**FIND THIS EXACT CODE:**

```typescript
const agentToken = useSettingsStore((s) => s.agentToken);
const theme = useSettingsStore((s) => s.theme);
const setTheme = useSettingsStore((s) => s.setTheme);
```

**REPLACE WITH:**

```typescript
const agentToken = useSettingsStore((s) => s.agentToken);
const theme = useSettingsStore((s) => s.theme);
const setTheme = useSettingsStore((s) => s.setTheme);
const provider = useSettingsStore((s) => s.provider);
const setProvider = useSettingsStore((s) => s.setProvider);
```

---

### Step 9.2: Add dropdown to header (after connection indicator)

**FIND THIS EXACT CODE:**

```typescript
              <span className="text-muted-foreground hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
```

**REPLACE WITH:**

```typescript
              <span className="text-muted-foreground hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {/* Model Dropdown */}
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'gemini' | 'ollama')}
              className="bg-transparent border border-border rounded px-2 py-1 text-xs text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>
```

---

### Verification for Task 9

1. Model dropdown visible in header next to connection status
2. Can switch between Gemini and Ollama
3. Selection persists after page reload

---

## Task 10: Add Voice Toggle Button to Header Bar

### Objective

1-click voice mode toggle from header.

### File to Modify

`packages/desktop/src/App.tsx`

---

### Step 10.1: Add Mic imports

**FIND THIS EXACT CODE:**

```typescript
import { Sun, Moon, Menu, Settings } from 'lucide-react';
```

**REPLACE WITH:**

```typescript
import { Sun, Moon, Menu, Settings, Mic, MicOff } from 'lucide-react';
```

---

### Step 10.2: Add voice state access

**FIND THIS EXACT CODE:**

```typescript
const provider = useSettingsStore((s) => s.provider);
const setProvider = useSettingsStore((s) => s.setProvider);
```

**REPLACE WITH:**

```typescript
const provider = useSettingsStore((s) => s.provider);
const setProvider = useSettingsStore((s) => s.setProvider);
const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
```

---

### Step 10.3: Add voice toggle button to header

**FIND THIS EXACT CODE:**

```typescript
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
```

**REPLACE WITH:**

```typescript
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`h-8 w-8 ${voiceEnabled ? 'text-red-500' : ''}`}
              title={voiceEnabled ? 'Disable voice mode' : 'Enable voice mode'}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
```

---

### Verification for Task 10

1. Voice toggle button visible in header (left of theme toggle)
2. Shows red Mic icon when enabled, grey MicOff when disabled
3. Clicking toggles state

---

## Phase 2 & 3 Tasks (Summary Only)

These tasks are outlined for future execution:

| Task | Description                          | Effort |
| ---- | ------------------------------------ | ------ |
| 11   | Add context usage indicator          | Medium |
| 12   | Expand Command Palette with settings | Medium |
| 13   | Add fuzzy search to Command Palette  | Medium |
| 14   | Refactor settings hierarchy          | High   |
| 15   | Add draft persistence for chat       | Medium |
| 16   | Smart expand/collapse for outputs    | Medium |
| 17   | Voice state visual indicators        | Medium |
| 18   | Context limit warning modal          | High   |
| 19   | Connection drop read-only mode       | Medium |

---

## Final Verification Checklist

After completing all 10 tasks, verify:

- [ ] `Ctrl+Enter` approves confirmations
- [ ] `Esc` cancels confirmations / closes modals
- [ ] Focus always returns to chat input after any action
- [ ] `Ctrl+N` starts new chat
- [ ] `Ctrl+K` opens palette, `Esc` closes it
- [ ] `Ctrl+,` opens settings, `Esc` closes it
- [ ] Up-Arrow recalls previous messages
- [ ] Connection status shows in header
- [ ] Model dropdown works in header
- [ ] Voice toggle works in header
- [ ] Input shows "thinking" state during processing
