# TermAI Desktop — Frontend Task List

> **Goal:** A cross-platform, lightweight desktop app that wraps the TermAI CLI.
>
> _"A typical user should never have to go to terminal across their journeys."_

This document contains **surgical, file-level tasks** for building the TermAI Desktop application. Each task specifies exact files, implementation details, and verification steps.

---

## Context for Execution

### Technology Decisions

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Framework** | Tauri 2.0 | 10MB bundle (vs 200MB Electron), Rust backend for performance |
| **Frontend** | React + TypeScript | Match CLI codebase skills, component reuse |
| **Styling** | Tailwind CSS | Rapid prototyping, dark mode built-in |
| **State** | Zustand | Lightweight, no boilerplate |
| **IPC** | Tauri Commands | Rust ↔ JS bridge, type-safe |

### Project Structure (To Be Created)

```
packages/desktop/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── commands.rs     # IPC handlers
│   │   ├── cli_bridge.rs   # Spawns/manages CLI process
│   │   └── oauth.rs        # System browser OAuth flow
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ChatView.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ConfirmationCard.tsx
│   │   ├── VoiceOrb.tsx
│   │   ├── SessionsSidebar.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── CommandPalette.tsx
│   │   └── TransparencyView.tsx
│   ├── hooks/
│   │   ├── useCliProcess.ts
│   │   ├── useVoice.ts
│   │   └── useSessions.ts
│   ├── stores/
│   │   └── appStore.ts
│   └── styles/
│       └── globals.css
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### Key Conventions

```typescript
// Tauri IPC - invoke Rust commands from JS
import { invoke } from '@tauri-apps/api/core';
const result = await invoke<string>('send_to_cli', { message: userInput });

// Listen to CLI stdout stream
import { listen } from '@tauri-apps/api/event';
await listen<string>('cli-output', (event) => {
  appendMessage(event.payload);
});
```

### Required Reading

| Document | Path | Purpose |
|----------|------|---------|
| **Tauri Docs** | https://tauri.app/v2/guide/ | Framework reference |
| **CLI Architecture** | `packages/cli/src/gemini.tsx` | How CLI handles input/output |
| **Voice Controller** | `packages/cli/src/voice/voiceController.ts` | Existing voice infra |
| **A2A Server** | `packages/a2a-server/src/http/app.ts` | Alternative: HTTP bridge |

### System Dependencies

```bash
# macOS
brew install rust
xcode-select --install

# Linux (Ubuntu/Debian)
sudo apt install libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev

# All platforms
npm install -g @tauri-apps/cli
```

---

## Theme A: Project Scaffolding

> **Goal:** Create the Tauri project structure and verify it builds.

### Task A.1: Initialize Tauri Project

**Status:** ✅ **COMPLETE**
**Priority:** P0
**Effort:** Easy (1-2 hours)

> **Implementation Notes:** Tauri project initialized via `npx create-tauri-app@latest`. Tailwind v4 required `@tailwindcss/postcss` plugin. `@apply` with custom theme vars caused issues; refactored to standard CSS.

**Description:**
Create the `packages/desktop` directory with Tauri + React + Vite scaffolding.

**Commands to Run:**

```bash
cd packages
npm create tauri-app@latest desktop -- --template react-ts --manager npm
cd desktop
npm install
npm install zustand @tauri-apps/api tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Files to Modify After Scaffolding:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/desktop/src-tauri/tauri.conf.json` | Set app name, window size, permissions |
| MODIFY | `packages/desktop/tailwind.config.js` | Add dark mode, custom colors |
| CREATE | `packages/desktop/src/styles/globals.css` | Tailwind directives + custom styles |

**Implementation Details:**

```json
// packages/desktop/src-tauri/tauri.conf.json
{
  "productName": "TermAI",
  "version": "0.1.0",
  "identifier": "ai.termai.desktop",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "TermAI",
        "width": 900,
        "height": 700,
        "minWidth": 600,
        "minHeight": 400,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'"
    }
  },
  "bundle": {
    "active": true,
    "icon": ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"]
  }
}
```

```css
/* packages/desktop/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0f0f1a;
  --bg-secondary: #1a1a2e;
  --accent: #00d4ff;
  --text-primary: #f0f0f0;
  --text-secondary: #888;
}

body {
  @apply bg-[--bg-primary] text-[--text-primary] font-sans;
}
```

**Verification:**

```bash
cd packages/desktop
npm run tauri dev
# Should open a window with React app
```

---

### Task A.2: Monorepo Integration

**Status:** ✅ **COMPLETE**
**Priority:** P0
**Effort:** Easy (30 min)

> **Implementation Notes:** Renamed to `@termai/desktop`. Root workspace uses glob `packages/*` so no change needed.

**Description:**
Add `packages/desktop` to the root npm workspace.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `package.json` (root) | Add `packages/desktop` to workspaces |
| MODIFY | `packages/desktop/package.json` | Set correct name, add scripts |

**Implementation Details:**

```json
// Root package.json - add to "workspaces" array
{
  "workspaces": [
    "packages/core",
    "packages/cli",
    "packages/a2a-server",
    "packages/termai",
    "packages/desktop"  // ADD THIS
  ]
}
```

```json
// packages/desktop/package.json
{
  "name": "@termai/desktop",
  "version": "0.1.0",
  "scripts": {
    "dev": "tauri dev",
    "build": "tauri build",
    "preview": "vite preview"
  }
}
```

**Verification:**

```bash
# From repo root
npm install
npm run dev --workspace @termai/desktop
```

---

## Theme B: CLI Bridge (Rust Backend)

> **Goal:** Spawn and communicate with the TermAI CLI as a child process.

### Task B.1: CLI Process Manager (Rust)

**Status:** ✅ **COMPLETE**  
**Priority:** P0
**Effort:** Medium (4-6 hours)

> **Implementation Notes:** Created `cli_bridge.rs` with `CliBridge` struct. Uses `std::process::Command` (not PTY yet). Added `stop_cli` command. Env var `TERMAI_CLI_PATH` allows custom binary path.

**Description:**
Create Rust code to spawn the CLI process, pipe stdin/stdout, and expose to frontend via Tauri commands.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src-tauri/src/cli_bridge.rs` | Process spawn + stream management |
| MODIFY | `packages/desktop/src-tauri/src/main.rs` | Import and register commands |
| MODIFY | `packages/desktop/src-tauri/Cargo.toml` | Add tokio, serde dependencies |

**Implementation Details:**

```rust
// packages/desktop/src-tauri/src/cli_bridge.rs
use std::process::{Command, Stdio};
use std::io::{BufReader, BufRead, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct CliBridge {
    stdin: Arc<Mutex<std::process::ChildStdin>>,
    running: Arc<Mutex<bool>>,
}

impl CliBridge {
    pub fn spawn(app: AppHandle) -> Result<Self, String> {
        let mut child = Command::new("termai")
            .args(["--output-format", "stream-json"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn CLI: {}", e))?;

        let stdin = Arc::new(Mutex::new(child.stdin.take().unwrap()));
        let stdout = child.stdout.take().unwrap();
        let running = Arc::new(Mutex::new(true));
        let running_clone = running.clone();

        // Stream stdout to frontend
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if !*running_clone.lock().unwrap() { break; }
                if let Ok(line) = line {
                    let _ = app.emit("cli-output", line);
                }
            }
        });

        Ok(Self { stdin, running })
    }

    pub fn send(&self, message: &str) -> Result<(), String> {
        let mut stdin = self.stdin.lock().unwrap();
        writeln!(stdin, "{}", message)
            .map_err(|e| format!("Failed to send: {}", e))
    }

    pub fn stop(&self) {
        *self.running.lock().unwrap() = false;
    }
}
```

```rust
// packages/desktop/src-tauri/src/main.rs
mod cli_bridge;

use cli_bridge::CliBridge;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    cli: Mutex<Option<CliBridge>>,
}

#[tauri::command]
fn start_cli(app: tauri::AppHandle, state: State<AppState>) -> Result<(), String> {
    let bridge = CliBridge::spawn(app)?;
    *state.cli.lock().unwrap() = Some(bridge);
    Ok(())
}

#[tauri::command]
fn send_to_cli(message: String, state: State<AppState>) -> Result<(), String> {
    let guard = state.cli.lock().unwrap();
    guard.as_ref()
        .ok_or("CLI not started")?
        .send(&message)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState { cli: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![start_cli, send_to_cli])
        .run(tauri::generate_context!())
        .expect("error running app");
}
```

**Verification:**

```bash
cd packages/desktop
cargo build --manifest-path src-tauri/Cargo.toml
npm run tauri dev
# In browser devtools: await window.__TAURI__.invoke('start_cli')
```

---

### Task B.2: CLI Output Parser (Frontend)

**Status:** ✅ **COMPLETE**
**Priority:** P0
**Effort:** Medium (3-4 hours)

> **Implementation Notes:** Created `types/cli.ts` and `hooks/useCliProcess.ts`. Hook manages IPC lifecycle, parses JSON/plaintext, handles confirmations. Uses `crypto.randomUUID()` for message IDs.

**Description:**
Parse streaming JSON output from CLI into UI-friendly message objects.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/hooks/useCliProcess.ts` | Hook to manage CLI state |
| CREATE | `packages/desktop/src/types/cli.ts` | TypeScript types for CLI events |

**Implementation Details:**

```typescript
// packages/desktop/src/types/cli.ts
export interface CliEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'confirmation' | 'error' | 'done';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  confirmationId?: string;
  riskLevel?: 'low' | 'moderate' | 'high' | 'dangerous';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  events: CliEvent[];
  pendingConfirmation?: {
    id: string;
    description: string;
    command: string;
    riskLevel: string;
  };
}
```

```typescript
// packages/desktop/src/hooks/useCliProcess.ts
import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CliEvent, Message } from '../types/cli';

export function useCliProcess() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Start CLI on mount
    invoke('start_cli').then(() => setIsConnected(true));

    // Listen for CLI output
    const unlisten = listen<string>('cli-output', (event) => {
      try {
        const parsed: CliEvent = JSON.parse(event.payload);
        handleCliEvent(parsed);
      } catch {
        // Plain text output
        appendToLastMessage(event.payload);
      }
    });

    return () => { unlisten.then(fn => fn()); };
  }, []);

  const handleCliEvent = (event: CliEvent) => {
    if (event.type === 'confirmation') {
      // Show confirmation card
      updateLastMessage(msg => ({
        ...msg,
        pendingConfirmation: {
          id: event.confirmationId!,
          description: event.content!,
          command: event.toolArgs?.command as string,
          riskLevel: event.riskLevel!,
        }
      }));
    } else if (event.type === 'done') {
      setIsProcessing(false);
    }
    // ... handle other event types
  };

  const sendMessage = useCallback(async (text: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      events: [],
    }]);
    setIsProcessing(true);
    await invoke('send_to_cli', { message: text });
  }, []);

  const respondToConfirmation = useCallback(async (id: string, approved: boolean) => {
    await invoke('send_to_cli', { message: approved ? 'y' : 'n' });
  }, []);

  return { messages, isConnected, isProcessing, sendMessage, respondToConfirmation };
}
```

**Verification:**

```bash
npm run tauri dev
# Type message, see it appear in chat
# CLI responses should stream in
```

---

## Theme C: Core UI Components

> **Goal:** Build the main UI components for chat, confirmations, and sessions.

### Task C.1: Chat View Component

**Status:** ✅ **COMPLETE**
**Priority:** P0
**Effort:** Medium (3-4 hours)

> **Implementation Notes:** Created `ChatView.tsx`, `MessageBubble.tsx`, `ChatInput.tsx`. Note: `VoiceOrb` import removed from `ChatInput` (voice component pending). App.tsx now renders `ChatView` as root.

**Description:**
Main chat interface with message bubbles and input area.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/ChatView.tsx` | Main chat container |
| CREATE | `packages/desktop/src/components/MessageBubble.tsx` | Individual message |
| CREATE | `packages/desktop/src/components/ChatInput.tsx` | Input with voice button |

**Implementation Details:**

```tsx
// packages/desktop/src/components/ChatView.tsx
import { useRef, useEffect } from 'react';
import { useCliProcess } from '../hooks/useCliProcess';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConfirmationCard } from './ConfirmationCard';

export function ChatView() {
  const { messages, isProcessing, sendMessage, respondToConfirmation } = useCliProcess();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.pendingConfirmation && (
              <ConfirmationCard
                confirmation={msg.pendingConfirmation}
                onRespond={(approved) => respondToConfirmation(msg.pendingConfirmation!.id, approved)}
              />
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="text-gray-400 animate-pulse">Thinking...</div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <ChatInput onSend={sendMessage} disabled={isProcessing} />
    </div>
  );
}
```

```tsx
// packages/desktop/src/components/MessageBubble.tsx
import { Message } from '../types/cli';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[80%] rounded-2xl px-4 py-3
        ${isUser
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-gray-800 text-gray-100 rounded-bl-md'
        }
      `}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
```

```tsx
// packages/desktop/src/components/ChatInput.tsx
import { useState, KeyboardEvent } from 'react';
import { VoiceOrb } from './VoiceOrb';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend(input.trim());
        setInput('');
      }
    }
  };

  return (
    <div className="border-t border-gray-800 p-4 bg-gray-900">
      <div className="flex items-center gap-3">
        <VoiceOrb onTranscript={(text) => setInput(prev => prev + ' ' + text)} />
        <textarea
          className="flex-1 bg-gray-800 rounded-xl px-4 py-3 resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask TermAI anything..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl
                     disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => { onSend(input.trim()); setInput(''); }}
          disabled={disabled || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Should see chat interface
# Type message → appears as user bubble
# Response streams back as assistant bubble
```

---

### Task C.2: Confirmation Card Component

**Status:** ✅ **COMPLETE**
**Priority:** P0
**Effort:** Medium (2-3 hours)

> **Implementation Notes:** Created `ConfirmationCard.tsx` and `RiskBadge.tsx`. Uses `details/summary` for collapsible command preview.

**Description:**
Visual confirmation card for risky actions with risk level, command preview, and approve/deny buttons.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/ConfirmationCard.tsx` | Confirmation UI |
| CREATE | `packages/desktop/src/components/RiskBadge.tsx` | Risk level indicator |

**Implementation Details:**

```tsx
// packages/desktop/src/components/ConfirmationCard.tsx
import { RiskBadge } from './RiskBadge';

interface Confirmation {
  id: string;
  description: string;
  command: string;
  riskLevel: string;
}

interface Props {
  confirmation: Confirmation;
  onRespond: (approved: boolean) => void;
}

export function ConfirmationCard({ confirmation, onRespond }: Props) {
  return (
    <div className="bg-gray-800 border border-yellow-500/50 rounded-xl p-4 my-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-500">⚠️</span>
        <span className="font-semibold">Confirmation Required</span>
        <RiskBadge level={confirmation.riskLevel} />
      </div>

      <p className="text-gray-300 mb-3">{confirmation.description}</p>

      <details className="mb-4">
        <summary className="text-gray-400 cursor-pointer hover:text-gray-200">
          Show command
        </summary>
        <pre className="mt-2 bg-black/50 p-3 rounded-lg text-sm overflow-x-auto">
          {confirmation.command}
        </pre>
      </details>

      <div className="flex gap-3">
        <button
          className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-medium"
          onClick={() => onRespond(true)}
        >
          ✅ Yes, proceed
        </button>
        <button
          className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-medium"
          onClick={() => onRespond(false)}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}
```

```tsx
// packages/desktop/src/components/RiskBadge.tsx
const RISK_COLORS = {
  low: 'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  dangerous: 'bg-red-500/20 text-red-400',
};

const RISK_ICONS = {
  low: '🟢',
  moderate: '🟡',
  high: '🟠',
  dangerous: '🔴',
};

interface Props {
  level: string;
}

export function RiskBadge({ level }: Props) {
  const colorClass = RISK_COLORS[level as keyof typeof RISK_COLORS] || RISK_COLORS.moderate;
  const icon = RISK_ICONS[level as keyof typeof RISK_ICONS] || '🟡';

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {icon} {level.toUpperCase()}
    </span>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Ask to delete a file
# Should see confirmation card with risk badge
# Click approve → action proceeds
# Click cancel → action cancelled
```

---

### Task C.3: Sessions Sidebar

**Status:** ✅ **COMPLETE**
**Priority:** P1
**Effort:** Medium (3-4 hours)

> **Implementation Notes:** Created `useSessions.ts`, `SessionCard.tsx`, `SessionsSidebar.tsx`. Listens for `session-update`/`session-removed` Tauri events.

**Description:**
Sidebar showing running background processes with status, controls, and log access.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/SessionsSidebar.tsx` | Sessions panel |
| CREATE | `packages/desktop/src/components/SessionCard.tsx` | Individual session |
| CREATE | `packages/desktop/src/hooks/useSessions.ts` | Sessions state management |

**Implementation Details:**

```tsx
// packages/desktop/src/components/SessionsSidebar.tsx
import { useSessions } from '../hooks/useSessions';
import { SessionCard } from './SessionCard';

export function SessionsSidebar() {
  const { sessions, stopSession, viewLogs } = useSessions();

  if (sessions.length === 0) return null;

  return (
    <div className="w-64 bg-gray-900 border-l border-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-400 mb-4">
        🔄 SESSIONS ({sessions.length})
      </h2>
      <div className="space-y-3">
        {sessions.map(session => (
          <SessionCard
            key={session.name}
            session={session}
            onStop={() => stopSession(session.name)}
            onViewLogs={() => viewLogs(session.name)}
          />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// packages/desktop/src/components/SessionCard.tsx
interface Session {
  name: string;
  command: string;
  status: 'running' | 'stopped' | 'done';
  startedAt: string;
  outputLineCount: number;
}

interface Props {
  session: Session;
  onStop: () => void;
  onViewLogs: () => void;
}

export function SessionCard({ session, onStop, onViewLogs }: Props) {
  const statusIcon = {
    running: '●',
    stopped: '○',
    done: '✓',
  }[session.status];

  const statusColor = {
    running: 'text-green-400',
    stopped: 'text-gray-400',
    done: 'text-blue-400',
  }[session.status];

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={statusColor}>{statusIcon}</span>
        <span className="font-medium truncate">{session.name}</span>
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{session.command}</p>
      <div className="flex gap-2">
        <button
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
          onClick={onViewLogs}
        >
          View
        </button>
        {session.status === 'running' && (
          <button
            className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded"
            onClick={onStop}
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Ask: "Start npm run dev as devserver"
# Sidebar should appear with session card
# Session should show running status
```

---

## Theme D: OAuth & Settings

> **Goal:** Native OAuth flow and settings management.

### Task D.1: OAuth Flow (System Browser)

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Implement Google OAuth using system browser and localhost callback.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src-tauri/src/oauth.rs` | OAuth server + browser launch |
| CREATE | `packages/desktop/src/components/AuthScreen.tsx` | Login UI |
| CREATE | `packages/desktop/src/hooks/useAuth.ts` | Auth state management |

**Implementation Details:**

```rust
// packages/desktop/src-tauri/src/oauth.rs
use std::net::TcpListener;
use std::io::{Read, Write};
use tauri::Emitter;

const REDIRECT_PORT: u16 = 9876;

#[tauri::command]
pub fn start_oauth(app: tauri::AppHandle) -> Result<(), String> {
    // Open system browser
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
        client_id={}&\
        redirect_uri=http://localhost:{}&\
        response_type=code&\
        scope=openid%20email",
        std::env::var("GOOGLE_CLIENT_ID").unwrap_or_default(),
        REDIRECT_PORT
    );
    
    open::that(&auth_url).map_err(|e| e.to_string())?;

    // Start local server to catch callback
    std::thread::spawn(move || {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", REDIRECT_PORT)).unwrap();
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0; 1024];
            stream.read(&mut buffer).ok();
            
            // Extract code from query string
            let request = String::from_utf8_lossy(&buffer);
            if let Some(code) = extract_code(&request) {
                let _ = app.emit("oauth-callback", code);
                
                // Send success response to browser
                let response = "HTTP/1.1 200 OK\r\n\r\n<html><body><h1>✅ Signed in! You can close this tab.</h1></body></html>";
                stream.write_all(response.as_bytes()).ok();
            }
        }
    });

    Ok(())
}

fn extract_code(request: &str) -> Option<String> {
    request.split("code=")
        .nth(1)?
        .split(&['&', ' '][..])
        .next()
        .map(String::from)
}
```

```tsx
// packages/desktop/src/components/AuthScreen.tsx
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

interface Props {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  useEffect(() => {
    const unlisten = listen<string>('oauth-callback', async (event) => {
      // Exchange code for token (CLI handles this)
      await invoke('send_to_cli', { message: `__oauth_code:${event.payload}` });
      onAuthenticated();
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const handleGoogleLogin = async () => {
    await invoke('start_oauth');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl font-bold mb-2">⚡ TermAI</h1>
      <p className="text-gray-400 mb-8">Your AI-powered terminal assistant</p>
      
      <button
        className="flex items-center gap-3 bg-white text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-100"
        onClick={handleGoogleLogin}
      >
        <img src="/google-icon.svg" className="w-5 h-5" alt="" />
        Sign in with Google
      </button>

      <div className="mt-6 text-gray-500 text-sm">
        <button className="hover:text-gray-300">Use API Key instead</button>
        <span className="mx-2">•</span>
        <button className="hover:text-gray-300">Use Ollama (Local)</button>
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Should see login screen
# Click "Sign in with Google"
# Browser opens, authenticate
# App receives callback, proceeds to chat
```

---

### Task D.2: Settings Panel

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Medium (3-4 hours)

**Description:**
Slide-out settings panel with account, security, model, and voice settings.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/SettingsPanel.tsx` | Settings UI |
| CREATE | `packages/desktop/src/stores/settingsStore.ts` | Settings state |

**Implementation Details:**

```tsx
// packages/desktop/src/components/SettingsPanel.tsx
import { useSettingsStore } from '../stores/settingsStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: Props) {
  const settings = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="w-80 bg-gray-900 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">⚙️ Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Account */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">👤 ACCOUNT</h3>
          <p className="text-sm">{settings.email}</p>
          <button className="text-sm text-blue-400 hover:underline mt-1">Sign Out</button>
        </section>

        {/* Security */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">🔐 SECURITY</h3>
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm">Approval Mode</span>
            <select
              className="bg-gray-800 rounded px-2 py-1 text-sm"
              value={settings.approvalMode}
              onChange={(e) => settings.setApprovalMode(e.target.value)}
            >
              <option value="safe">Safe (confirm all)</option>
              <option value="prompt">Smart (confirm risky)</option>
              <option value="yolo">YOLO (no confirm)</option>
            </select>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Preview Mode</span>
            <input
              type="checkbox"
              checked={settings.previewMode}
              onChange={(e) => settings.setPreviewMode(e.target.checked)}
            />
          </label>
        </section>

        {/* Model */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">🤖 MODEL</h3>
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm">Provider</span>
            <select
              className="bg-gray-800 rounded px-2 py-1 text-sm"
              value={settings.provider}
              onChange={(e) => settings.setProvider(e.target.value)}
            >
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </label>
        </section>

        {/* Voice */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">🎤 VOICE</h3>
          <label className="flex items-center justify-between mb-2">
            <span className="text-sm">Push-to-Talk Key</span>
            <span className="text-sm text-gray-400">Space</span>
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Voice Volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.voiceVolume}
              onChange={(e) => settings.setVoiceVolume(Number(e.target.value))}
            />
          </label>
        </section>
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Click settings icon in header
# Settings panel slides in
# Change approval mode → persists
# Close and reopen → settings retained
```

---

## Theme E: Command Palette

> **Goal:** Quick access to all CLI commands via ⌘K palette.

### Task E.1: Command Palette Component

**Status:** ✅ **COMPLETE**
**Priority:** P1
**Effort:** Medium (3-4 hours)

> **Implementation Notes:** Created `commands.ts` and `CommandPalette.tsx`. Fuzzy search, arrow key navigation, Enter to execute. Opens with ⌘K.

**Description:**
Fuzzy-searchable command palette triggered by ⌘K.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/CommandPalette.tsx` | Palette UI |
| CREATE | `packages/desktop/src/data/commands.ts` | Command definitions |

**Implementation Details:**

```typescript
// packages/desktop/src/data/commands.ts
export interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  action: string; // CLI command to send
  shortcut?: string;
}

export const COMMANDS: Command[] = [
  // Sessions
  { id: 'sessions-list', name: '/sessions list', description: 'Show running sessions', category: 'Sessions', action: '/sessions list' },
  { id: 'sessions-stop', name: '/sessions stop', description: 'Stop a session', category: 'Sessions', action: '/sessions stop ' },
  
  // Conversation
  { id: 'clear', name: '/clear', description: 'Clear chat history', category: 'Conversation', action: '/clear' },
  { id: 'checkpoint', name: '/checkpoint', description: 'Save conversation state', category: 'Conversation', action: '/checkpoint' },
  { id: 'restore', name: '/restore', description: 'Resume previous session', category: 'Conversation', action: '/restore' },
  
  // Security
  { id: 'trust', name: '/trust', description: 'Trust current folder', category: 'Security', action: '/trust' },
  { id: 'untrust', name: '/untrust', description: 'Revoke folder trust', category: 'Security', action: '/untrust' },
  
  // Help
  { id: 'help', name: '/help', description: 'Show all commands', category: 'Help', action: '/help' },
  { id: 'bug', name: '/bug', description: 'Report an issue', category: 'Help', action: '/bug' },
];
```

```tsx
// packages/desktop/src/components/CommandPalette.tsx
import { useState, useEffect, useMemo } from 'react';
import { COMMANDS, Command } from '../data/commands';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: Command) => void;
}

export function CommandPalette({ isOpen, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return COMMANDS;
    const lower = query.toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      if (e.key === 'ArrowUp') setSelectedIndex(i => Math.max(i - 1, 0));
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex]);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[500px] bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        <input
          className="w-full px-4 py-3 bg-transparent border-b border-gray-800 focus:outline-none"
          placeholder="Search commands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-80 overflow-y-auto">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`px-4 py-3 cursor-pointer ${
                i === selectedIndex ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
              onClick={() => { onSelect(cmd); onClose(); }}
            >
              <div className="flex justify-between">
                <span className="font-mono text-sm">{cmd.name}</span>
                <span className="text-xs text-gray-500">{cmd.category}</span>
              </div>
              <p className="text-sm text-gray-400">{cmd.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Press ⌘K (or Ctrl+K on Windows)
# Palette opens
# Type "session" → filters to session commands
# Press Enter → command executes
```

## Theme F: Embedded Terminal (Full TUI Parity)

> **Goal:** Render any terminal output perfectly, including htop, vim, nano, and any interactive TUI.
> 
> _"A power user should never hit a wall where they need to drop to terminal."_

### The Solution: Hybrid Layout

The app seamlessly transitions between **Chat Mode** and **Terminal Mode** based on CLI output.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚡ TermAI                        [Sessions ▼] [👁️ View] [⚙️]               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ CHAT ──────────────────────────────────────────────┐ ┌─ TERMINAL ─────┐ │
│  │                                                      │ │                │ │
│  │  👤 You: Show me what's eating CPU                   │ │  (collapsed)   │ │
│  │                                                      │ │                │ │
│  │  🤖 TermAI: Opening htop for you...                  │ │       ◀        │ │
│  │                                                      │ │  [Expand]      │ │
│  │  ┌───────────────────────────────────────────────┐  │ │                │ │
│  │  │  🖥️ LIVE TERMINAL                       [⤢]  │  │ │                │ │
│  │  │   [htop running - actual terminal output]       │  │ │                │ │
│  │  │   Mem: ███████████░░░░ 11.8G/31.0G              │  │ │                │ │
│  │  │   PID  USER    CPU%  MEM%  COMMAND              │  │ │                │ │
│  │  │   1234 profh   82.3  4.2   chrome               │  │ │                │ │
│  │  │  [Press Q to exit htop]          [Focus: ⌘T]   │  │ │                │ │
│  │  └───────────────────────────────────────────────┘  │ │                │ │
│  └──────────────────────────────────────────────────────┘ └────────────────┘ │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │ 🎤 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  [Send] ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Task F.1: xterm.js Integration

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Embed xterm.js for rendering terminal output with full ANSI escape code support.

**Files to Create/Modify:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/EmbeddedTerminal.tsx` | xterm.js wrapper |
| MODIFY | `packages/desktop/package.json` | Add xterm, xterm-addon-fit |
| MODIFY | `packages/desktop/src-tauri/src/cli_bridge.rs` | PTY spawning |
| MODIFY | `packages/desktop/src-tauri/Cargo.toml` | Add portable-pty |

**Dependencies:**

```bash
cd packages/desktop
npm install xterm @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
```

```toml
# packages/desktop/src-tauri/Cargo.toml
[dependencies]
portable-pty = "0.8"
```

**Implementation Details:**

```tsx
// packages/desktop/src/components/EmbeddedTerminal.tsx
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import '@xterm/xterm/css/xterm.css';

interface Props {
  sessionId: string;
  onExit?: () => void;
  isExpanded?: boolean;
}

export function EmbeddedTerminal({ sessionId, onExit, isExpanded = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      fontSize: 13,  // 12pt minimum, comfortable reading
      lineHeight: 1.2,
      theme: {
        background: '#0f0f1a',
        foreground: '#f0f0f0',
        cursor: '#00d4ff',
      },
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;

    // Receive output from Rust
    const unlisten = listen<Uint8Array>(`terminal-output-${sessionId}`, (event) => {
      terminal.write(new Uint8Array(event.payload));
    });

    // Send input to Rust
    terminal.onData((data) => {
      invoke('send_terminal_input', { sessionId, data });
    });

    return () => {
      unlisten.then(fn => fn());
      terminal.dispose();
    };
  }, [sessionId]);

  return (
    <div
      className={`rounded-lg overflow-hidden border transition-all duration-200
        ${isFocused ? 'border-cyan-500' : 'border-gray-700'}
        ${isExpanded ? 'h-[60vh]' : 'h-64'}`}
      onClick={() => terminalRef.current?.focus()}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
        <span className="text-xs font-mono text-gray-400">🖥️ LIVE TERMINAL</span>
        {isFocused && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 rounded">FOCUSED</span>}
      </div>
      <div ref={containerRef} className="h-full" />
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Ask: "Show me htop"
# Should see live htop inside the app
# Press q → htop exits, terminal collapses
```

---

### Task F.2: PTY Spawning (Rust Backend)

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (4-6 hours)

**Description:**
Use pseudo-terminal (PTY) instead of plain pipes for interactive programs.

**Files to Modify:**

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `packages/desktop/src-tauri/src/cli_bridge.rs` | Add PTY master/slave |
| CREATE | `packages/desktop/src-tauri/src/pty_session.rs` | PTY session manager |

**Implementation Details:**

```rust
// packages/desktop/src-tauri/src/pty_session.rs
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
}

impl PtySession {
    pub fn spawn(app: AppHandle, session_id: String, command: &str) -> Result<Self, String> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| e.to_string())?;

        let cmd = CommandBuilder::new(command);
        pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        
        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = Arc::new(Mutex::new(pair.master.take_writer().map_err(|e| e.to_string())?));

        let event_name = format!("terminal-output-{}", session_id);
        std::thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            while let Ok(n) = reader.read(&mut buffer) {
                if n == 0 { break; }
                let _ = app.emit(&event_name, buffer[..n].to_vec());
            }
        });

        Ok(Self { writer })
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        self.writer.lock().unwrap().write_all(data).map_err(|e| e.to_string())
    }
}
```

**Verification:**

```bash
npm run tauri dev
# Ask: "Open vim main.rs"
# Vim should render correctly with colors
# Can type, navigate, save, quit
```

---

### Task F.3: Sudo Prompt Handling

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (3-4 hours)

**Description:**
Detect sudo prompts and show a secure password input overlay.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/SudoPrompt.tsx` | Password overlay |
| CREATE | `packages/desktop/src/hooks/useSudoDetection.ts` | Detect password prompts |

**Implementation Details:**

```tsx
// packages/desktop/src/hooks/useSudoDetection.ts
const SUDO_PATTERNS = [/\[sudo\] password for/i, /Password:/i, /Enter passphrase/i];

export function useSudoDetection(outputBuffer: string) {
  const recent = outputBuffer.slice(-500);
  for (const pattern of SUDO_PATTERNS) {
    const match = recent.match(pattern);
    if (match) return { needsPassword: true, prompt: match[0] };
  }
  return { needsPassword: false, prompt: '' };
}
```

```tsx
// packages/desktop/src/components/SudoPrompt.tsx
export function SudoPrompt({ prompt, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState('');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-500/50 rounded-xl p-6 w-96">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔐</span>
          <h2 className="font-semibold">Authentication Required</h2>
        </div>
        <input
          type="password"
          className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-4"
          placeholder="Enter password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3">
          <button className="flex-1 bg-cyan-600 py-2.5 rounded-lg" onClick={() => onSubmit(password + '\n')}>
            Authenticate
          </button>
          <button className="flex-1 bg-gray-700 py-2.5 rounded-lg" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">🔒 Password sent directly to terminal, not stored</p>
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Ask: "Update my system packages"
# Secure password overlay appears
# Enter password → command continues
```

---

## Theme G: Adaptive Layout

> **Goal:** Seamlessly transition between chat-only and terminal views.

### Task G.1: Smart Output Detection

**Status:** 🔲 Not Started
**Priority:** P0
**Effort:** Medium (3-4 hours)

**Description:**
Detect when CLI output is plain text vs. TUI and render appropriately.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/utils/outputDetector.ts` | ANSI/TUI detection |
| MODIFY | `packages/desktop/src/hooks/useCliProcess.ts` | Route output to correct renderer |

**Implementation Details:**

```typescript
// packages/desktop/src/utils/outputDetector.ts
export type OutputType = 'text' | 'tui' | 'progress';

const TUI_INDICATORS = ['\x1b[?1049h', '\x1b[?25l', '\x1b[2J']; // Alternate screen, hide cursor, clear

export function detectOutputType(data: string): OutputType {
  for (const indicator of TUI_INDICATORS) {
    if (data.includes(indicator)) return 'tui';
  }
  if (/\[#+\s*\]|\d+%\s*\||███+/.test(data)) return 'progress';
  return 'text';
}
```

**Verification:**

```bash
npm run tauri dev
# Ask: "List files" → chat bubbles
# Ask: "Show htop" → embedded terminal appears
# Press q in htop → back to chat mode
```

---

### Task G.2: Split View Layout

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Medium (3-4 hours)

**Description:**
Resizable split view with chat on left, terminal on right (when active).

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/SplitLayout.tsx` | Resizable panes |
| MODIFY | `packages/desktop/src/App.tsx` | Use SplitLayout |

**Implementation Details:**

```tsx
// packages/desktop/src/components/SplitLayout.tsx
export function SplitLayout({ leftPanel, rightPanel, rightPanelVisible }: Props) {
  const [rightWidth, setRightWidth] = useState(50);
  
  return (
    <div className="flex h-full">
      <div style={{ width: rightPanelVisible ? `${100 - rightWidth}%` : '100%' }}>
        {leftPanel}
      </div>
      {rightPanelVisible && (
        <>
          <div className="w-1 bg-gray-800 hover:bg-cyan-500 cursor-col-resize" />
          <div style={{ width: `${rightWidth}%` }}>{rightPanel}</div>
        </>
      )}
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Start a long-running command → terminal panel slides in
# Drag divider to resize
```

---

### Task G.3: Keyboard Shortcuts & Focus Management

**Status:** 🔲 Not Started
**Priority:** P1
**Effort:** Easy (2-3 hours)

**Description:**
Global keyboard shortcuts for switching between chat and terminal.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/hooks/useKeyboardShortcuts.ts` | Global hotkeys |
| MODIFY | `packages/desktop/src/App.tsx` | Wire shortcuts |

**Keyboard Reference:**

| Shortcut | Action |
|----------|--------|
| `⌘T` | Toggle/focus terminal panel |
| `⌘J` | Focus chat input |
| `⌘K` | Open command palette |
| `⌘,` | Open settings |
| `⌘N` | New conversation |
| `Escape` | Return to chat |

**Verification:**

```bash
npm run tauri dev
# Press ⌘T → terminal panel expands
# Press ⌘J → chat input focused
# Press ⌘K → command palette opens
```

---

## Theme H: Progress & Activity Indicators

> **Goal:** Show progress for long-running operations inline.

### Task H.1: Progress Bar Component

**Status:** 🔲 Not Started
**Priority:** P2
**Effort:** Easy (2-3 hours)

**Description:**
Inline progress bars for operations like npm install, downloads.

**Files to Create:**

| Action | File | Changes |
|--------|------|---------|
| CREATE | `packages/desktop/src/components/ProgressBar.tsx` | Progress UI |
| MODIFY | `packages/desktop/src/components/MessageBubble.tsx` | Embed progress |

**Implementation Details:**

```tsx
// packages/desktop/src/components/ProgressBar.tsx
export function ProgressBar({ label, progress, status = 'running' }: Props) {
  const statusColor = { running: 'bg-cyan-500', success: 'bg-green-500', error: 'bg-red-500' }[status];
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 my-2">
      <div className="flex justify-between text-sm mb-1.5">
        <span>{label}</span>
        <span className="text-gray-400">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${statusColor} transition-all`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
```

**Verification:**

```bash
npm run tauri dev
# Ask: "Install lodash"
# Should see progress bar updating
```

---

## Verification & Build

### Development

```bash
cd packages/desktop
npm run tauri dev
```

### Production Build

```bash
cd packages/desktop
npm run tauri build
# Outputs:
# - macOS: src-tauri/target/release/bundle/dmg/TermAI.dmg
# - Windows: src-tauri/target/release/bundle/msi/TermAI.msi
# - Linux: src-tauri/target/release/bundle/appimage/TermAI.AppImage
```

---

## Task Priority Matrix

| Priority | Task | Effort | Dependencies |
|----------|------|--------|--------------|
| P0 | A.1 Initialize Tauri | Easy | None |
| P0 | A.2 Monorepo Integration | Easy | A.1 |
| P0 | B.1 CLI Bridge (Rust) | Medium | A.2 |
| P0 | B.2 CLI Output Parser | Medium | B.1 |
| P0 | C.1 Chat View | Medium | B.2 |
| P0 | C.2 Confirmation Card | Medium | C.1 |
| P0 | D.1 OAuth Flow | Medium | B.1 |
| P0 | F.1 xterm.js Integration | Medium | C.1 |
| P0 | F.2 PTY Spawning | Medium | F.1 |
| P0 | F.3 Sudo Prompt | Medium | F.1 |
| P0 | G.1 Smart Detection | Medium | F.1 |
| P1 | C.3 Sessions Sidebar | Medium | C.1 |
| P1 | D.2 Settings Panel | Medium | C.1 |
| P1 | E.1 Command Palette | Medium | C.1 |
| P1 | G.2 Split Layout | Medium | F.1 |
| P1 | G.3 Keyboard Shortcuts | Easy | G.2 |
| P2 | H.1 Progress Bar | Easy | None |

---

## Success Criteria

**Base Functionality:**
- [ ] App launches and shows login screen
- [ ] Google OAuth works via system browser
- [ ] Chat messages send and responses stream back
- [ ] Confirmation cards appear for risky actions
- [ ] Sessions sidebar shows running processes
- [ ] Settings persist across restarts
- [ ] ⌘K palette opens and commands work

**Full TUI Parity:**
- [ ] htop renders correctly and is interactive
- [ ] vim/nano work with full keyboard input
- [ ] sudo prompts show secure password overlay
- [ ] Long-running commands show progress
- [ ] Split view resizes smoothly
- [ ] ⌘T toggles terminal focus
- [ ] Escape returns to chat
- [ ] No visible "flash" when switching modes

**Distribution:**
- [ ] Production builds work on macOS, Windows, Linux
- [ ] Bundle size < 20MB

---

*Last Updated: December 2025*
*Version: 2.0 (merged with TUI parity addendum)*
