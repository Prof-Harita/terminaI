# TerminaI UX Streamlining: Tasks 51-100 Execution Plan

**Date:** 2025-12-29  
**Prerequisite:** Tasks 0-50 completed  
**Constraint:** UI/Frontend changes only. No backend API modifications.  
**Target Executor:** Gemini Flash (explicit find/replace format)

---

## Technical Context for Executor

Tasks 51-100 focus on **Premium Polish (Phase 3)** and **Expert Controls
(Phase 4)**.

- **Phase 3** items should feel high-end (smooth transitions, animations,
  micro-feedback).
- **Phase 4** items should be powerful but non-intrusive (hidden under
  "Advanced" or in the Command Palette).
- **Icons**: Use standard `lucide-react` icons already imported in the project:
  `Copy`, `Check`, `Square`, `Maximize2`, `Minimize2`, `Activity`, `Volume2`,
  `VolumeX`, `Shield`, `Globe`.

---

## Implementation Checklist: Tasks 51-100

### Phase 3A: Message & Content Polish (51-54)

- [ ] Task 51: Add copy button to all code blocks
- [ ] Task 52: Add copy button to assistant messages (on hover)
- [ ] Task 53: Add subtle "streaming cursor" / activity indicator
- [ ] Task 54: Add truncation UI ("Show more") for long tool outputs

### Phase 3B: Deep Voice Mode Polish (55-57)

- [ ] Task 55: Distinct voice states UI (Idle/Listening/Processing/Speaking)
- [ ] Task 56: Add waveform animation during voice capture
- [ ] Task 57: Add "Request Mic" / remedial instructions UI

### Phase 3C: Intelligence & Discovery (58-61)

- [ ] Task 58: Implement ranking algorithm for Command Palette results
- [ ] Task 59: Show keyboard shortcuts in Palette result list
- [ ] Task 60: (ALREADY DONE IN PREVIOUS PHASE as Task 18) - Re-check cheat
      sheet overlay
- [ ] Task 61: Inline error annotations for failed tool calls

### Phase 3D: MCP Server Management (62-66)

- [ ] Task 62: Build MCP server list UI (status, name, tools count)
- [ ] Task 63: Build "Add MCP Server" flow (guided JSON/env inputs)
- [ ] Task 64: Add include/exclude tool lists per server
- [ ] Task 65: Add "Trust Server" toggle with explanation
- [ ] Task 66: Add server timeout control with presets

### Phase 3E: Session & Navigation Polish (67-72)

- [ ] Task 67: Add "Click to resume" in history pane with activity preview
- [ ] Task 68: Add "Edit & resend last prompt" button
- [ ] Task 69: Fix/Unify focus rings across all panes
- [ ] Task 70: Add notification sounds for approvals (with mute toggle)
- [ ] Task 71: Add notification preferences (toasts vs sounds)
- [ ] Task 72: Show tool execution start time and duration

### Phase 3F: Remote Relay Expansion (73-75)

- [ ] Task 73: Add "Broadcast" button for Remote Relay in settings
- [ ] Task 74: Show connected client count in header/status
- [ ] Task 75: Add "Disconnect all clients" panic button

### Phase 4: Expert Controls & Cleanup (76-100)

- [ ] Task 76: Expose "Brain Authority" (Expert only) in Advanced Settings
- [ ] Task 77: Add Hooks configuration editor with validation
- [ ] Task 78: Add "Labs" page for experimental features
- [ ] Task 79: Add "Redact typed text" privacy toggle
- [ ] Task 80: Add "Export Audit Log" button
- [ ] Task 81: Add Log retention slider (1 day to 30 days)
- [ ] Task 82: Expose Session Checkpointing toggle
- [ ] Task 83: Add Network Diagnostics section (DNS, Connectivity)
- [ ] Task 84: Add Environment Var exclusion UI
- [ ] Task 85: Add "Smart Edit" toggle in Labs
- [ ] Task 86: Add "Write Todos" toggle in Labs
- [ ] Task 87: Implement Hotkey Customization UI
- [ ] Task 88: Add Security Profile selector (Safe/Prompt/YOLO)
- [ ] Task 89: Add "Unsaved changes" indicator to Settings
- [ ] Task 90: Deduplicate and cleanup all menu entries
- [ ] Task 91: Collapse "Experimental" sections by default
- [ ] Task 92: Add tooltips to all header icons
- [ ] Task 93: Add detailed "About" modal with versions
- [ ] Task 94: Update in-app documentation for shortcuts
- [ ] Task 95: Document settings hierarchy in help
- [ ] Task 96: Add subtle transitions for pane switching
- [ ] Task 97: Improve empty states for Logs/History with CTA
- [ ] Task 98: Implement "Report a Bug" diagnostics zip
- [ ] Task 99: Add inline microcopy for safety education
- [ ] Task 100: Add UI Density control (Comfortable/Compact)

---

## Detailed Task Specifications (51-60)

---

## Task 51: Add Copy Button to Code Blocks

### Objective

Provide a 1-click copy affordance for code blocks in chat messages.

### File to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 51.1: Add Copy icon import

**FIND THIS EXACT CODE:**

```typescript
import { Loader2, Send, Paperclip, Mic } from 'lucide-react';
```

**REPLACE WITH:**

```typescript
import { Loader2, Send, Paperclip, Mic, Copy, Check } from 'lucide-react';
```

---

### Step 51.2: Add CodeBlock component with copy logic

**ADD THIS CODE before the ChatView function definition:**

```typescript
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/50 backdrop-blur-sm border border-border"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="bg-muted/50 rounded-md p-4 font-mono text-sm overflow-x-auto border border-border">
        {language && <div className="text-xs text-muted-foreground mb-2 uppercase">{language}</div>}
        <code>{code}</code>
      </pre>
    </div>
  );
}
```

---

## Task 52: Add Copy Button to Assistant Messages

### Objective

Allow copying full message content on hover.

### File to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 52.1: Add message copy button to assistant bubble

**FIND THIS EXACT CODE:**

```typescript
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border border-border",
              )}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
```

**REPLACE WITH:**

```typescript
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border border-border relative group",
              )}
            >
              {message.role === "assistant" && (
                <button
                  onClick={() => navigator.clipboard.writeText(message.content)}
                  className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-foreground"
                  title="Copy message"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
```

---

## Task 53: Add Subtle "Streaming Cursor"

### Objective

Provide visual feedback that the agent is still writing.

### File to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 53.1: Add cursor to active message

**FIND THIS EXACT CODE:**

```typescript
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
```

**REPLACE WITH:**

```typescript
              <div className="whitespace-pre-wrap break-words inline">
                {message.content}
                {isProcessing && message.id === messages[messages.length - 1]?.id && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                )}
              </div>
```

---

---

## Task 54: Add Truncation UI for Long Tool Outputs

### Objective

Prevent UI spam by collapsing long command outputs, keeping the chat history
focused.

### Files to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 54.1: Update message filtering to keep tool events

**FIND THIS EXACT CODE:**

```typescript
// Filter out tool_call and tool_result events for clean chat
const filteredMessages = messages
  .map((msg) => ({
    ...msg,
    events:
      msg.events?.filter(
        (e) => e.type !== 'tool_call' && e.type !== 'tool_result',
      ) ?? [],
  }))
  .filter(
    (msg) => msg.content || msg.pendingConfirmation || msg.events.length > 0,
  );
```

**REPLACE WITH:**

```typescript
// Keep tool events but mark them for special rendering
const filteredMessages = messages
  .map((msg) => ({
    ...msg,
    hasToolResults: msg.events?.some((e) => e.type === 'tool_result'),
  }))
  .filter(
    (msg) => msg.content || msg.pendingConfirmation || msg.hasToolResults,
  );
```

---

### Step 54.2: Add ToolResult renderer with truncation

**ADD THIS CODE before the ChatView function definition:**

```typescript
function ToolResult({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = content.length > 500;
  const displayContent = isLong && !isExpanded ? content.slice(0, 500) + '...' : content;

  return (
    <div className="mt-2 text-xs border-l-2 border-primary/30 pl-3 py-1 bg-muted/20 rounded-r-md">
      <div className="font-mono whitespace-pre-wrap opacity-80">{displayContent}</div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:underline mt-1 font-semibold"
        >
          {isExpanded ? 'Show less' : 'Show full output'}
        </button>
      )}
    </div>
  );
}
```

---

## Task 55: Distinct Voice States UI

### Objective

Visualize the current voice interaction status (IDLE, LISTENING, PROCESSING,
SPEAKING).

### Files to Modify

- `packages/desktop/src/App.tsx`

---

### Step 55.1: Import useVoiceStore and update header icon

**FIND THIS EXACT CODE:**

```typescript
import { useSettingsStore } from './stores/settingsStore';
import { useExecutionStore } from './stores/executionStore';
```

**REPLACE WITH:**

```typescript
import { useSettingsStore } from './stores/settingsStore';
import { useExecutionStore } from './stores/executionStore';
import { useVoiceStore } from './stores/voiceStore';
```

---

### Step 55.2: Animate voice button based on state

**FIND THIS EXACT CODE:**

```typescript
const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
```

**REPLACE WITH:**

```typescript
const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
const voiceState = useVoiceStore((s) => s.state);
```

---

### Step 55.3: Update Mic icon colors

**FIND THIS EXACT CODE:**

```typescript
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`h-8 w-8 ${voiceEnabled ? 'text-red-500' : ''}`}
```

**REPLACE WITH:**

```typescript
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                "h-8 w-8 transition-all duration-300",
                voiceEnabled && voiceState === 'LISTENING' && "bg-red-500/10 text-red-500 animate-pulse border border-red-500/50",
                voiceEnabled && voiceState === 'PROCESSING' && "bg-blue-500/10 text-blue-500",
                voiceEnabled && voiceState === 'SPEAKING' && "bg-green-500/10 text-green-500",
                !voiceEnabled && "opacity-50"
              )}
```

---

## Task 56: Waveform Animation

### Objective

High-end visual feedback for audio capture.

### File to Modify

- `packages/desktop/src/components/Waveform.tsx` (NEW FILE)

---

### Step 56.1: Basic Waveform Component

```typescript
export function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`flex items-center gap-0.5 h-4 ${active ? 'opacity-100' : 'opacity-0'}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-primary animate-waveform"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
```

---

## Task 58: Command Palette Ranking Algorithm

### Objective

Ensure Actions > Settings > History prioritization in results.

### Files to Modify

- `packages/desktop/src/components/CommandPalette.tsx`

---

### Step 58.1: Update filtering and sorting logic

**FIND THIS EXACT CODE:**

```typescript
const filtered = useMemo(() => {
  if (!query) return COMMANDS;
  const lower = query.toLowerCase();
  return COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower),
  );
}, [query]);
```

**REPLACE WITH:**

```typescript
const filtered = useMemo(() => {
  const list = [...COMMANDS];
  if (!query) return list;

  const lower = query.toLowerCase();
  const weights = { Conversation: 10, Sessions: 8, Security: 5, Help: 1 };

  return list
    .filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lower) ||
        cmd.description.toLowerCase().includes(lower),
    )
    .sort((a, b) => {
      // Priority by category weight
      const weightA = weights[a.category as keyof typeof weights] || 0;
      const weightB = weights[b.category as keyof typeof weights] || 0;
      if (weightA !== weightB) return weightB - weightA;

      // Exact match boost
      if (a.name.toLowerCase() === lower) return -1;
      if (b.name.toLowerCase() === lower) return 1;

      return a.name.localeCompare(b.name);
    });
}, [query]);
```

---

## Task 59: Show Keyboard Shortcuts in Palette

### Objective

Improve discoverability by showing shortcut hints in the list results.

### Files to Modify

- `packages/desktop/src/components/CommandPalette.tsx`

---

### Step 59.1: Add shortcut badge to result row

**FIND THIS EXACT CODE:**

```typescript
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color:
                      i === selectedIndex
                        ? 'rgba(255,255,255,0.7)'
                        : 'var(--text-muted)',
                  }}
                >
                  {cmd.category}
                </span>
```

**REPLACE WITH:**

```typescript
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded opacity-60">
                      {cmd.shortcut}
                    </kbd>
                  )}
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color:
                        i === selectedIndex
                          ? 'rgba(255,255,255,0.7)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {cmd.category}
                  </span>
                </div>
```

---

Code Edit:

```
{{ ... }}
              </div>
```

---

---

## Task 54: Add Truncation UI for Long Tool Outputs

### Objective

Prevent UI spam by collapsing long command outputs, keeping the chat history
focused.

### Files to Modify

- `packages/desktop/src/components/ChatView.tsx`

---

### Step 54.1: Update message filtering to keep tool events

**FIND THIS EXACT CODE:**

```typescript
// Filter out tool_call and tool_result events for clean chat
const filteredMessages = messages
  .map((msg) => ({
    ...msg,
    events:
      msg.events?.filter(
        (e) => e.type !== 'tool_call' && e.type !== 'tool_result',
      ) ?? [],
  }))
  .filter(
    (msg) => msg.content || msg.pendingConfirmation || msg.events.length > 0,
  );
```

**REPLACE WITH:**

```typescript
// Keep tool events but mark them for special rendering
const filteredMessages = messages
  .map((msg) => ({
    ...msg,
    hasToolResults: msg.events?.some((e) => e.type === 'tool_result'),
  }))
  .filter(
    (msg) => msg.content || msg.pendingConfirmation || msg.hasToolResults,
  );
```

---

### Step 54.2: Add ToolResult renderer with truncation

**ADD THIS CODE before the ChatView function definition:**

```typescript
function ToolResult({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = content.length > 500;
  const displayContent = isLong && !isExpanded ? content.slice(0, 500) + '...' : content;

  return (
    <div className="mt-2 text-xs border-l-2 border-primary/30 pl-3 py-1 bg-muted/20 rounded-r-md">
      <div className="font-mono whitespace-pre-wrap opacity-80">{displayContent}</div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:underline mt-1 font-semibold"
        >
          {isExpanded ? 'Show less' : 'Show full output'}
        </button>
      )}
    </div>
  );
}
```

---

## Task 55: Distinct Voice States UI

### Objective

Visualize the current voice interaction status (IDLE, LISTENING, PROCESSING,
SPEAKING).

### Files to Modify

- `packages/desktop/src/App.tsx`

---

### Step 55.1: Import useVoiceStore and update header icon

**FIND THIS EXACT CODE:**

```typescript
import { useSettingsStore } from './stores/settingsStore';
import { useExecutionStore } from './stores/executionStore';
```

**REPLACE WITH:**

```typescript
import { useSettingsStore } from './stores/settingsStore';
import { useExecutionStore } from './stores/executionStore';
import { useVoiceStore } from './stores/voiceStore';
```

---

### Step 55.2: Animate voice button based on state

**FIND THIS EXACT CODE:**

```typescript
const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
```

**REPLACE WITH:**

```typescript
const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
const voiceState = useVoiceStore((s) => s.state);
```

---

### Step 55.3: Update Mic icon colors

**FIND THIS EXACT CODE:**

```typescript
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`h-8 w-8 ${voiceEnabled ? 'text-red-500' : ''}`}
```

**REPLACE WITH:**

```typescript
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={cn(
                "h-8 w-8 transition-all duration-300",
                voiceEnabled && voiceState === 'LISTENING' && "bg-red-500/10 text-red-500 animate-pulse border border-red-500/50",
                voiceEnabled && voiceState === 'PROCESSING' && "bg-blue-500/10 text-blue-500",
                voiceEnabled && voiceState === 'SPEAKING' && "bg-green-500/10 text-green-500",
                !voiceEnabled && "opacity-50"
              )}
```

---

## Task 58: Command Palette Ranking Algorithm

### Objective

Ensure Actions > Settings > History prioritization in results.

### Files to Modify

- `packages/desktop/src/components/CommandPalette.tsx`

---

### Step 58.1: Update filtering and sorting logic

**FIND THIS EXACT CODE:**

```typescript
const filtered = useMemo(() => {
  if (!query) return COMMANDS;
  const lower = query.toLowerCase();
  return COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower),
  );
}, [query]);
```

**REPLACE WITH:**

```typescript
const filtered = useMemo(() => {
  const list = [...COMMANDS];
  if (!query) return list;

  const lower = query.toLowerCase();
  const weights = { Conversation: 10, Sessions: 8, Security: 5, Help: 1 };

  return list
    .filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lower) ||
        cmd.description.toLowerCase().includes(lower),
    )
    .sort((a, b) => {
      // Priority by category weight
      const weightA = weights[a.category as keyof typeof weights] || 0;
      const weightB = weights[b.category as keyof typeof weights] || 0;
      if (weightA !== weightB) return weightB - weightA;

      // Exact match boost
      if (a.name.toLowerCase() === lower) return -1;
      if (b.name.toLowerCase() === lower) return 1;

      return a.name.localeCompare(b.name);
    });
}, [query]);
```

---

## Task 59: Show Keyboard Shortcuts in Palette

### Objective

Improve discoverability by showing shortcut hints in the list results.

### Files to Modify

- `packages/desktop/src/components/CommandPalette.tsx`

---

### Step 59.1: Add shortcut badge to result row

**FIND THIS EXACT CODE:**

```typescript
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color:
                      i === selectedIndex
                        ? 'rgba(255,255,255,0.7)'
                        : 'var(--text-muted)',
                  }}
                >
                  {cmd.category}
                </span>
```

**REPLACE WITH:**

```typescript
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded opacity-60">
                      {cmd.shortcut}
                    </kbd>
                  )}
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color:
                        i === selectedIndex
                          ? 'rgba(255,255,255,0.7)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {cmd.category}
                  </span>
                </div>
```

---

## Task 61-100: Advanced Features & Cleanup

The executor should continue implementing the remaining items in Phases 3 and 4,
focusing on:

- **61-66**: MCP Server Management (Build UI for managing model context
  protocols).
- **67-75**: Session Polish & Remote Relay Broadcaster.
- **76-100**: Expert Settings, Labs, and final UI density/theme polish.

Always prioritize **keyboard accessibility** and **visual consistency** with the
existing dark/glassmorphic aesthetic.

```

```
