# TerminaI UX Streamlining: Tasks 11-50 Execution Plan

**Date:** 2025-12-29  
**Prerequisite:** Tasks 0-10 completed  
**Constraint:** UI/Frontend changes only. No backend API modifications.  
**Target Executor:** Gemini Flash (explicit find/replace format)

---

## Code Review: Tasks 0-10 Implementation Status

### ✅ Fully Implemented

| Task                               | Status      | Notes                                                                                                                                                                                                                  |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task 0: Auto-spawn CLI**         | ✅ Complete | `spawn_cli_backend`, `get_current_dir` commands added to `lib.rs`. `cli_bridge.rs` has `spawn_web_remote` with token detection. `App.tsx` has bootstrap logic with event listener. `AuthScreen.tsx` has loading state. |
| **Task 1: Ctrl+Enter approve**     | ✅ Complete | `onApprove` added to `useKeyboardShortcuts.ts` (line 69-72). Wired in `App.tsx` (line 149-154). `ConfirmationCard.tsx` has kbd hint (line 131).                                                                        |
| **Task 2: Esc deny**               | ✅ Complete | `onEscape` handler in `App.tsx` (line 156-168) prioritizes confirmation denial. kbd hint in `ConfirmationCard.tsx` (line 139).                                                                                         |
| **Task 3: Focus after modal**      | ✅ Complete | `CommandPalette` and `SettingsPanel` `onClose` both call `setTimeout(() => chatInputRef.current?.focus(), 0)` in `App.tsx`.                                                                                            |
| **Task 4: Focus after completion** | ✅ Complete | `useCliProcess` accepts `options.onComplete` and calls it on `result.final === true`. `App.tsx` passes focus callback (line 35-39).                                                                                    |
| **Task 5: Ctrl+N new chat**        | ✅ Complete | `clearChat` function in `App.tsx` (line 139-142). `onNewConversation: clearChat` in shortcuts (line 148).                                                                                                              |
| **Task 6: Connection indicator**   | ✅ Complete | Header has green/red dot with glow (line 211-223 in `App.tsx`).                                                                                                                                                        |
| **Task 7: Locked input**           | ✅ Complete | `ChatView.tsx` has amber styling when `isProcessing` (line 176-181). Placeholder changes to "Agent is thinking..." (line 173).                                                                                         |
| **Task 8: Up-Arrow history**       | ✅ Complete | `historyIndex` state and `userMessages` memoization in `ChatView.tsx` (line 32-42). Enhanced `handleKeyDown` (line 89-121).                                                                                            |
| **Task 9: Model dropdown**         | ✅ Complete | `<select>` element in header (line 225-232 in `App.tsx`).                                                                                                                                                              |
| **Task 10: Voice toggle**          | ✅ Complete | Voice button in header with `Mic`/`MicOff` icons (line 235-243 in `App.tsx`).                                                                                                                                          |

---

## Outstanding Issues from Tasks 0-10

### 🔴 Critical Issues

| ID      | Issue                                                   | Location               | Fix Required                                                                                      |
| ------- | ------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| **O-1** | **Pending confirmation ID not cleared on disconnect**   | `App.tsx` line 80-137  | Add cleanup: when CLI fails or disconnects, clear `pendingConfirmationId`                         |
| **O-2** | **isBootstrapping stale reference in timeout**          | `App.tsx` line 109-116 | The `isBootstrapping` check inside `setTimeout` captures stale value. Use `ref` instead of state. |
| **O-3** | **Ctrl+Enter works even on PIN-required confirmations** | `App.tsx` line 149-154 | Add check: if current confirmation requires PIN and PIN not entered, don't approve                |

### 🟡 Medium Issues

| ID      | Issue                                               | Location               | Fix Required                                                                |
| ------- | --------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| **O-4** | **History navigation doesn't reset on manual edit** | `ChatView.tsx`         | Add `onChange` handler to reset `historyIndex` to -1 when user types        |
| **O-5** | **Model dropdown options incomplete**               | `App.tsx` line 225-232 | Only shows gemini/ollama; should fetch available models or add more options |
| **O-6** | **Voice toggle doesn't check mic permission first** | `App.tsx` line 235-243 | Should check `navigator.permissions.query` before enabling                  |

### 🟢 Nice-to-Have

| ID      | Issue                                           | Location               | Fix Required                                                  |
| ------- | ----------------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| **O-7** | **Connection indicator could show more states** | `App.tsx` line 211-223 | Add "Connecting..." state with yellow dot                     |
| **O-8** | **No visual feedback when /clear runs**         | `App.tsx` line 139-142 | Messages should clear immediately in UI, not wait for backend |

---

## Implementation Checklist: Tasks 11-50

### Phase 2A: Outstanding Fixes (11-14)

- [ ] Task 11: Fix isBootstrapping stale reference bug
- [ ] Task 12: Fix Ctrl+Enter for PIN-required confirmations
- [ ] Task 13: Reset history navigation on manual edit
- [ ] Task 14: Add "Connecting" state to connection indicator

### Phase 2B: Onboarding & Boot Experience (15-19)

- [ ] Task 15: Add welcome message with example prompts
- [ ] Task 16: Inline API key prompt in chat when missing
- [ ] Task 17: Auto-focus input when window regains focus
- [ ] Task 18: Add keyboard cheat sheet overlay (Ctrl+/)
- [ ] Task 19: Add "Stop" button for running tasks

### Phase 2C: Context & Limits (20-24)

- [ ] Task 20: Add context usage indicator to header
- [ ] Task 21: Add context popover with file details
- [ ] Task 22: Context limit warning modal
- [ ] Task 23: "Summarize & Continue" button in limit modal
- [ ] Task 24: Disconnect read-only mode with retry toast

### Phase 2D: Settings Improvements (25-30)

- [ ] Task 25: Add settings search box
- [ ] Task 26: Restructure settings into Capabilities/Project/General
- [ ] Task 27: Add per-setting reset button
- [ ] Task 28: Move PTT key to General → Input
- [ ] Task 29: Add "Advanced" toggle per section
- [ ] Task 30: Add import/export settings buttons

### Phase 2E: Command Palette Expansion (31-35)

- [ ] Task 31: Index settings pages in palette
- [ ] Task 32: Add frontend command equivalents (theme, model, voice)
- [ ] Task 33: Add fuzzy search with synonyms
- [ ] Task 34: Add recent chats to palette
- [ ] Task 35: Show shortcuts in palette results

### Phase 2F: Attachments & Drafts (36-40)

- [ ] Task 36: Implement @ autocomplete for files
- [ ] Task 37: Support drag-and-drop file attachment
- [ ] Task 38: Add attachment preview chip
- [ ] Task 39: Preserve draft text per session
- [ ] Task 40: Add "Attach File" button to input

### Phase 2G: Execution & Tool Output (41-45)

- [ ] Task 41: Smart collapse for tool outputs (>10 lines)
- [ ] Task 42: Add "Show more/less" toggle
- [ ] Task 43: Add copy button to code blocks
- [ ] Task 44: Add copy button to assistant messages
- [ ] Task 45: Show tool execution duration

### Phase 2H: Voice & Polish (46-50)

- [ ] Task 46: Distinct voice state indicators (4 states)
- [ ] Task 47: Waveform animation during voice capture
- [ ] Task 48: Check mic permission on voice enable
- [ ] Task 49: Streaming cursor indicator
- [ ] Task 50: Notification sounds for approvals

---

## Detailed Task Specifications

---

## Task 11: Fix isBootstrapping Stale Reference Bug

### Objective

Fix the bug where `isBootstrapping` check inside setTimeout captures a stale
value.

### Files to Modify

- `packages/desktop/src/App.tsx`

---

### Step 11.1: Add isBootstrapping ref

**FIND THIS EXACT CODE:**

```typescript
const [isBootstrapping, setIsBootstrapping] = useState(true);
const [bootstrapError, setBootstrapError] = useState<string | null>(null);
```

**REPLACE WITH:**

```typescript
const [isBootstrapping, setIsBootstrapping] = useState(true);
const [bootstrapError, setBootstrapError] = useState<string | null>(null);
const isBootstrappingRef = useRef(true);
```

---

### Step 11.2: Sync ref with state

**FIND THIS EXACT CODE:**

```typescript
setShowAuth(false);
setIsBootstrapping(false);
```

**REPLACE WITH:**

```typescript
setShowAuth(false);
setIsBootstrapping(false);
isBootstrappingRef.current = false;
```

---

### Step 11.3: Use ref in timeout check

**FIND THIS EXACT CODE:**

```typescript
        // Timeout fallback - if CLI doesn't emit ready in 10s, show auth screen
        setTimeout(() => {
          if (isBootstrapping) {
            setIsBootstrapping(false);
```

**REPLACE WITH:**

```typescript
        // Timeout fallback - if CLI doesn't emit ready in 10s, show auth screen
        setTimeout(() => {
          if (isBootstrappingRef.current) {
            setIsBootstrapping(false);
            isBootstrappingRef.current = false;
```

---

### Verification

1. Start app with no CLI running
2. Confirm timeout message appears after 10s (not immediately)

---

## Task 12: Fix Ctrl+Enter for PIN-Required Confirmations

### Objective

Prevent keyboard approval when PIN is required but not entered.

### Files to Modify

- `packages/desktop/src/App.tsx`
- `packages/desktop/src/components/ChatView.tsx`
- Add new state for tracking PIN requirement

---

### Step 12.1: Add pending confirmation details state to App.tsx

**FIND THIS EXACT CODE:**

```typescript
const [pendingConfirmationId, setPendingConfirmationId] = useState<
  string | null
>(null);
```

**REPLACE WITH:**

```typescript
const [pendingConfirmationId, setPendingConfirmationId] = useState<
  string | null
>(null);
const [pendingConfirmationRequiresPin, setPendingConfirmationRequiresPin] =
  useState(false);
const [pendingConfirmationPinReady, setPendingConfirmationPinReady] =
  useState(false);
```

---

### Step 12.2: Update onApprove to check PIN requirement

**FIND THIS EXACT CODE:**

```typescript
    onApprove: () => {
      if (pendingConfirmationId) {
        respondToConfirmation(pendingConfirmationId, true);
        setPendingConfirmationId(null);
        setTimeout(() => chatInputRef.current?.focus(), 0);
      }
    },
```

**REPLACE WITH:**

```typescript
    onApprove: () => {
      if (pendingConfirmationId) {
        // Don't approve if PIN required but not ready
        if (pendingConfirmationRequiresPin && !pendingConfirmationPinReady) {
          return;
        }
        respondToConfirmation(pendingConfirmationId, true);
        setPendingConfirmationId(null);
        setPendingConfirmationRequiresPin(false);
        setPendingConfirmationPinReady(false);
        setTimeout(() => chatInputRef.current?.focus(), 0);
      }
    },
```

---

### Step 12.3: Update ChatView props

**FIND THIS EXACT CODE:**

```typescript
onPendingConfirmation = { setPendingConfirmationId };
```

**REPLACE WITH:**

```typescript
              onPendingConfirmation={(id, requiresPin, pinReady) => {
                setPendingConfirmationId(id);
                setPendingConfirmationRequiresPin(requiresPin ?? false);
                setPendingConfirmationPinReady(pinReady ?? false);
              }}
```

---

### Step 12.4: Update ChatView interface

**File:** `packages/desktop/src/components/ChatView.tsx`

**FIND THIS EXACT CODE:**

```typescript
  onPendingConfirmation?: (id: string | null) => void
```

**REPLACE WITH:**

```typescript
  onPendingConfirmation?: (id: string | null, requiresPin?: boolean, pinReady?: boolean) => void
```

---

### Step 12.5: Update ChatView effect to pass PIN info

**FIND THIS EXACT CODE:**

```typescript
// Track pending confirmation for keyboard shortcuts
useEffect(() => {
  const pendingMsg = messages.find((m) => m.pendingConfirmation);
  onPendingConfirmation?.(pendingMsg?.pendingConfirmation?.id ?? null);
}, [messages, onPendingConfirmation]);
```

**REPLACE WITH:**

```typescript
// Track pending confirmation for keyboard shortcuts
useEffect(() => {
  const pendingMsg = messages.find((m) => m.pendingConfirmation);
  const confirmation = pendingMsg?.pendingConfirmation;
  onPendingConfirmation?.(
    confirmation?.id ?? null,
    confirmation?.requiresPin ?? false,
    false, // PIN ready state will be managed by ConfirmationCard
  );
}, [messages, onPendingConfirmation]);
```

---

### Verification

1. Trigger a PIN-required confirmation (sudo rm -rf /)
2. Press Ctrl+Enter without entering PIN
3. Confirm nothing happens
4. Enter PIN, then Ctrl+Enter should work

---

## Task 13: Reset History Navigation on Manual Edit

### Objective

Reset history index when user manually edits the input.

### File to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 13.1: Add onChange handler to reset history

**FIND THIS EXACT CODE:**

```typescript
              onChange={(e) => setInput(e.target.value)}
```

**REPLACE WITH:**

```typescript
              onChange={(e) => {
                setInput(e.target.value);
                // Reset history navigation on manual edit
                if (historyIndex >= 0) {
                  setHistoryIndex(-1);
                }
              }}
```

---

### Verification

1. Send a few messages
2. Press Up-Arrow to recall old message
3. Start typing something new
4. Confirm Up-Arrow now shows the most recent message again

---

## Task 14: Add "Connecting" State to Connection Indicator

### Objective

Show yellow "Connecting..." state during bootstrap.

### File to Modify

- `packages/desktop/src/App.tsx`

---

### Step 14.1: Replace connection indicator JSX

**FIND THIS EXACT CODE:**

```typescript
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
```

**REPLACE WITH:**

```typescript
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs ml-4">
              <div
                className={`w-2 h-2 rounded-full ${
                  isBootstrapping
                    ? 'bg-yellow-500 animate-pulse'
                    : isConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                }`}
                style={{
                  boxShadow: isBootstrapping
                    ? '0 0 6px rgba(234, 179, 8, 0.6)'
                    : isConnected
                      ? '0 0 6px rgba(34, 197, 94, 0.6)'
                      : '0 0 6px rgba(239, 68, 68, 0.6)'
                }}
              />
              <span className="text-muted-foreground hidden sm:inline">
                {isBootstrapping ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
```

---

### Verification

1. Start app fresh
2. Should show yellow pulsing "Connecting..."
3. Once connected, should show green "Connected"

---

## Task 15: Add Welcome Message with Example Prompts

### Objective

Show clickable example prompts in welcome message.

### File to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 15.1: Enhance welcome message

**FIND THIS EXACT CODE:**

```typescript
const displayMessages =
  filteredMessages.length === 0
    ? [
        {
          id: 'welcome',
          role: 'assistant' as const,
          content:
            "Hello! I'm your terminal agent assistant. I can help you execute commands, manage files, and automate your workflows. What would you like to do today?",
          events: [],
        },
      ]
    : filteredMessages;
```

**REPLACE WITH:**

```typescript
const examplePrompts = [
  'List all files in the current directory',
  'Show my git status',
  'Install dependencies for this project',
];

const displayMessages =
  filteredMessages.length === 0
    ? [
        {
          id: 'welcome',
          role: 'assistant' as const,
          content:
            "Hello! I'm your terminal agent assistant. I can help you execute commands, manage files, and automate your workflows.\n\nTry one of these to get started:",
          events: [],
          examplePrompts,
        },
      ]
    : filteredMessages;
```

---

### Step 15.2: Add example prompt buttons to message rendering

**FIND THIS EXACT CODE:**

```typescript
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div className={cn("text-xs mt-1.5", message.role === "user" ? "opacity-70" : "text-muted-foreground")}>
                {new Date(timestamp).toLocaleTimeString()}
              </div>
```

**REPLACE WITH:**

```typescript
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              {/* Example prompts for welcome message */}
              {message.examplePrompts && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.examplePrompts.map((prompt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div className={cn("text-xs mt-1.5", message.role === "user" ? "opacity-70" : "text-muted-foreground")}>
                {new Date(timestamp).toLocaleTimeString()}
              </div>
```

---

### Verification

1. Open app with no messages
2. See welcome message with 3 clickable example buttons
3. Click one - should send that message

---

## Task 16: Inline API Key Prompt in Chat When Missing

### Objective

When API key is missing, show a prompt in the chat area instead of blocking.

### Files to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 16.1: Add API key check and inline prompt

This task requires deeper integration with the settings store and should render
an inline "Add API Key" card when the agent fails due to missing authentication.
The implementation should detect auth failures from the agent response and show
a guided recovery flow inline in chat.

**NOTE:** This is a High complexity task. See implementation details below.

**Add after the welcome message logic:**

```typescript
// Check if we need to show API key prompt
const needsApiKey = !useSettingsStore.getState().agentToken;
```

**In the message list, before the first message if `needsApiKey` is true,
render:**

```typescript
{needsApiKey && (
  <div className="flex justify-start mb-4">
    <div className="max-w-[85%] rounded-lg px-4 py-4 bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔑</span>
        <span className="font-semibold text-amber-500">API Key Required</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        To get started, you need a Gemini API key.
      </p>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
      >
        Get API Key →
      </a>
    </div>
  </div>
)}
```

---

## Task 17: Auto-Focus Input When Window Regains Focus

### Objective

When user returns from another app, auto-focus the chat input.

### File to Modify

- `packages/desktop/src/App.tsx`

---

### Step 17.1: Add window focus listener

**ADD THIS CODE after the bootstrap useEffect (around line 137):**

```typescript
// Auto-focus chat input when window regains focus
useEffect(() => {
  const handleFocus = () => {
    // Only focus if we're on the main chat view (not in modals)
    if (!isPaletteOpen && !isSettingsOpen && !showAuth) {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [isPaletteOpen, isSettingsOpen, showAuth]);
```

---

### Verification

1. Click away from the app to another window
2. Click back into the app
3. Cursor should be in chat input without clicking

---

## Task 18: Add Keyboard Cheat Sheet Overlay (Ctrl+/)

### Objective

Show all keyboard shortcuts in a quick overlay.

### Files to Modify

- `packages/desktop/src/hooks/useKeyboardShortcuts.ts`
- `packages/desktop/src/App.tsx`
- Create new `packages/desktop/src/components/KeyboardCheatSheet.tsx`

---

### Step 18.1: Add onShowCheatSheet handler

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
  onApprove?: () => void;
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
  onShowCheatSheet?: () => void;
}
```

---

### Step 18.2: Add Ctrl+/ handler

**FIND THIS EXACT CODE:**

```typescript
      // Ctrl+Enter: Approve pending confirmation
      if (e.ctrlKey && e.key === 'Enter') {
```

**ADD THIS CODE BEFORE IT:**

```typescript
// Ctrl+/: Show keyboard cheat sheet
if (e.ctrlKey && e.key === '/') {
  e.preventDefault();
  handlers.onShowCheatSheet?.();
  return;
}
```

---

### Step 18.3: Create KeyboardCheatSheet component

**File:** `packages/desktop/src/components/KeyboardCheatSheet.tsx` (NEW FILE)

```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl+K', action: 'Open command palette' },
  { keys: 'Ctrl+N', action: 'New conversation' },
  { keys: 'Ctrl+,', action: 'Open settings' },
  { keys: 'Ctrl+J', action: 'Focus chat input' },
  { keys: 'Ctrl+T', action: 'Toggle terminal' },
  { keys: 'Ctrl+/', action: 'Show this cheat sheet' },
  { keys: 'Ctrl+Enter', action: 'Approve pending action' },
  { keys: 'Esc', action: 'Cancel / Close modal' },
  { keys: '↑', action: 'Recall previous message' },
  { keys: 'Enter', action: 'Send message' },
  { keys: 'Shift+Enter', action: 'New line in message' },
];

export function KeyboardCheatSheet({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          ⌨️ Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map(({ keys, action }) => (
            <div key={keys} className="flex justify-between items-center py-1">
              <span className="text-muted-foreground text-sm">{action}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground text-center">
          Press Esc or click outside to close
        </p>
      </div>
    </div>
  );
}
```

---

### Step 18.4: Wire up in App.tsx

**Add import:**

```typescript
import { KeyboardCheatSheet } from './components/KeyboardCheatSheet';
```

**Add state:**

```typescript
const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
```

**Add to keyboard shortcuts:**

```typescript
onShowCheatSheet: () => setIsCheatSheetOpen(true),
```

**Add to JSX (after SettingsPanel):**

```typescript
<KeyboardCheatSheet
  isOpen={isCheatSheetOpen}
  onClose={() => setIsCheatSheetOpen(false)}
/>
```

---

### Verification

1. Press Ctrl+/
2. Cheat sheet overlay appears
3. Press Esc - closes
4. Click outside - closes

---

## Task 19: Add "Stop" Button for Running Tasks

### Objective

Show a stop button when agent is processing.

### File to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 19.1: Add Stop button to processing indicator

**FIND THIS EXACT CODE:**

```typescript
      {/* Agent thinking indicator */}
      {isProcessing && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{currentToolStatus || "Agent is executing commands..."}</span>
          </div>
        </div>
      )}
```

**REPLACE WITH:**

```typescript
      {/* Agent thinking indicator */}
      {isProcessing && (
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{currentToolStatus || "Agent is executing commands..."}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => sendMessage('/stop')}
            >
              Stop
            </Button>
          </div>
        </div>
      )}
```

---

### Verification

1. Send a message that takes time to process
2. See "Stop" button appear
3. Click Stop - agent should attempt to stop

---

## Task 20: Add Context Usage Indicator to Header

### Objective

Show token/context usage as a percentage.

### Files to Modify

- `packages/desktop/src/stores/executionStore.ts` - Add context tracking
- `packages/desktop/src/App.tsx` - Display indicator

---

### Step 20.1: Add context state to execution store

**File:** `packages/desktop/src/stores/executionStore.ts`

Add new state fields and methods for tracking context:

```typescript
contextUsed: number,
contextLimit: number,
setContextUsage: (used: number, limit: number) => void,
```

---

### Step 20.2: Add indicator to header

**Add to App.tsx header, after the model dropdown:**

```typescript
{/* Context Usage Indicator */}
<div className="flex items-center gap-1.5 text-xs">
  <div
    className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"
    title={`Context: ${Math.round(contextUsed / contextLimit * 100)}%`}
  >
    <div
      className={`h-full transition-all ${
        contextUsed / contextLimit > 0.9
          ? 'bg-red-500 animate-pulse'
          : contextUsed / contextLimit > 0.7
            ? 'bg-yellow-500'
            : 'bg-green-500'
      }`}
      style={{ width: `${Math.min(100, contextUsed / contextLimit * 100)}%` }}
    />
  </div>
</div>
```

---

## Tasks 21-50: Summary Specifications

Due to length constraints, the remaining tasks are provided in condensed format:

---

### Task 21: Context Popover with File Details

- Click context indicator → show popover
- List loaded files with sizes
- "Refresh Context" button

### Task 22: Context Limit Warning Modal

- Detect context overflow from agent error
- Show modal with file list breakdown

### Task 23: "Summarize & Continue" Button

- Add to limit modal
- Triggers `/summarize` command (frontend intercept)

### Task 24: Disconnect Read-Only Mode

- When disconnected, disable input
- Show persistent toast with retry countdown

### Task 25: Settings Search Box

- Add search input at top of SettingsPanel
- Filter settings by name/description

### Task 26: Restructure Settings Hierarchy

- Create tabs: Capabilities, Project, General, Security, Appearance
- Move settings into appropriate categories

### Task 27: Per-Setting Reset Button

- Add "↺" reset button next to each setting
- Restores default value

### Task 28: Move PTT Key to General → Input

- Relocate push-to-talk key setting
- Update settings schema

### Task 29: Advanced Toggle Per Section

- Add "Show Advanced" toggle
- Hide L4 power settings by default

### Task 30: Import/Export Settings

- Export: Download settings as JSON
- Import: Upload and merge settings

### Task 31: Index Settings Pages in Palette

- Add settings sections as palette actions
- "Open Voice Settings", etc.

### Task 32: Frontend Command Equivalents

- `/theme dark` → palette action "Set Dark Theme"
- `/model gemini` → palette action "Switch to Gemini"

### Task 33: Fuzzy Search with Synonyms

- Install fuse.js or implement fuzzy matching
- Map: mic→voice, model→provider

### Task 34: Recent Chats in Palette

- Add "Recent" section in palette
- Show last 5 chat titles

### Task 35: Show Shortcuts in Palette Results

- Each action shows its keyboard shortcut
- Right-aligned in result row

### Task 36: @ Autocomplete for Files

- Detect `@` in input
- Show file picker dropdown

### Task 37: Drag-and-Drop File Attachment

- Register drop zone on input area
- Show drop indicator overlay

### Task 38: Attachment Preview Chip

- Show attached file as removable chip
- Display filename + size

### Task 39: Preserve Draft Text Per Session

- Store in sessionStorage
- Restore on session switch

### Task 40: "Attach File" Button

- Add button next to Paperclip icon
- Opens native file picker

### Task 41: Smart Collapse for Tool Outputs

- Auto-collapse if >10 lines
- Show "Show N more lines"

### Task 42: Show More/Less Toggle

- Click to expand/collapse
- Remember state per message

### Task 43: Copy Button for Code Blocks

- Add copy icon in top-right of code blocks
- Show "Copied!" feedback

### Task 44: Copy Button for Assistant Messages

- Add copy icon on hover
- Copies full message content

### Task 45: Show Tool Execution Duration

- Display "Completed in 2.3s"
- Show elapsed time during execution

### Task 46: Voice State Indicators

- Idle: Grey mic
- Listening: Red pulse
- Processing: Spinner
- Speaking: Wave animation

### Task 47: Waveform Animation

- Show audio waveform during capture
- Use Web Audio API for visualization

### Task 48: Check Mic Permission on Enable

- Call navigator.permissions.query
- Show error if denied

### Task 49: Streaming Cursor Indicator

- Show blinking cursor during streaming
- Disappears when complete

### Task 50: Notification Sounds for Approvals

- Play subtle sound when approval needed
- Add mute toggle in settings

---

## Final Verification Checklist

After completing all 50 tasks:

- [ ] No UI regressions from original design
- [ ] All keyboard shortcuts work correctly
- [ ] Focus always returns to chat input
- [ ] Connection states display correctly
- [ ] Settings are searchable and organized
- [ ] Command palette has expanded functionality
- [ ] Context usage is visible and actionable
- [ ] Voice mode has clear state indicators
- [ ] Tool outputs are manageable
- [ ] Draft text persists correctly
