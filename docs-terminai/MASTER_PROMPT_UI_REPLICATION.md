# Master Prompt: TerminaI Desktop UI Replication

## Objective

**EXACTLY REPLICATE** the design in `docs-terminai/design/` into
`packages/desktop/`. Do NOT deviate. Do NOT simplify. Copy the design
pixel-for-pixel.

---

## Design Source (COPY THIS EXACTLY)

```
/home/profharita/Code/terminaI/docs-terminai/design/
├── app/
│   ├── globals.css          # CSS with oklch colors, Geist font
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Entry point
├── components/
│   ├── left-sidebar.tsx     # Settings/History tabs, App/CLI settings
│   ├── chat-pane.tsx        # Message bubbles, input area
│   ├── terminal-pane.tsx    # Tool execution cards, flash alerts
│   ├── terminal-interface.tsx # Main 3-pane layout coordinator
│   ├── resizable-handle.tsx # Pane resize divider
│   ├── theme-provider.tsx   # Light/dark theme wrapper
│   └── ui/                  # 57 shadcn/ui components
├── hooks/
│   └── use-mobile.tsx       # Mobile detection
├── lib/
│   └── utils.ts             # cn() classname utility
└── styles/
    └── globals.css          # Design tokens
```

---

## Target Location (MODIFY THESE)

```
/home/profharita/Code/terminaI/packages/desktop/
├── src/
│   ├── App.tsx              # REPLACE with terminal-interface.tsx logic
│   ├── main.tsx             # Entry (keep as-is)
│   ├── components/
│   │   ├── LeftSidebar.tsx  # REPLACE with left-sidebar.tsx
│   │   ├── ChatView.tsx     # REPLACE with chat-pane.tsx
│   │   ├── EngineRoomPane.tsx # REPLACE with terminal-pane.tsx
│   │   ├── TriPaneLayout.tsx  # REPLACE with resizable layout
│   │   └── ui/              # ADD all shadcn components from design
│   ├── hooks/
│   │   ├── useCliProcess.ts # Backend wiring (DO NOT MODIFY LOGIC)
│   │   ├── useFlashAlert.ts # Keep
│   │   └── useSessions.ts   # Keep
│   ├── stores/
│   │   ├── settingsStore.ts # Settings state (DO NOT MODIFY)
│   │   ├── executionStore.ts # Tool events state (DO NOT MODIFY)
│   │   └── voiceStore.ts    # Voice state (DO NOT MODIFY)
│   ├── types/
│   │   └── cli.ts           # TypeScript types (reference these)
│   ├── lib/
│   │   └── utils.ts         # cn() utility (ENSURE EXISTS)
│   └── styles/
│       └── globals.css      # REPLACE with design tokens
├── index.html               # Add Geist font links
└── package.json             # Add dependencies
```

---

## Backend Wiring (CRITICAL - DO NOT BREAK)

### useCliProcess Hook

This hook handles all communication with the CLI agent. Your UI components MUST
use these:

```typescript
// From useCliProcess:
const {
  messages, // Message[] - chat history
  isConnected, // boolean - agent connection status
  isProcessing, // boolean - agent is thinking
  activeTerminalSession, // string | null - PTY session ID
  sendMessage, // (text: string) => void - send user input
  respondToConfirmation, // (id, approved, pin?) => void - approve commands
  closeTerminal, // () => void
} = useCliProcess();
```

### useExecutionStore

Zustand store for tool execution events:

```typescript
// From executionStore:
const {
  toolEvents, // ToolEvent[] - array of tool executions
  currentToolStatus, // string | null - current status message
  isWaitingForInput, // boolean - terminal needs user input
} = useExecutionStore();
```

### useSettingsStore

Settings from this store should populate the Settings panel:

```typescript
// From settingsStore:
const {
  agentUrl, // string
  setAgentUrl, // (url: string) => void
  agentToken, // string
  setAgentToken, // (token: string) => void
  agentWorkspacePath, // string
  setAgentWorkspacePath, // (path: string) => void
  theme, // 'light' | 'dark' | 'system'
  setTheme, // (theme) => void
} = useSettingsStore();
```

---

## TypeScript Types (Reference)

```typescript
// types/cli.ts
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  events: CliEvent[];
  pendingConfirmation?: PendingConfirmation;
}

interface ToolEvent {
  id: string;
  toolName: string;
  inputArguments: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed' | 'awaiting_input';
  terminalOutput: string;
  startedAt: number;
  completedAt?: number;
}
```

---

## Required Dependencies

```bash
npm install lucide-react clsx tailwind-merge class-variance-authority \
  @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-slider \
  @radix-ui/react-label @radix-ui/react-slot --workspace @terminai/desktop
```

---

## Step-by-Step Instructions

### 1. Copy Design System

- Copy `docs-terminai/design/styles/globals.css` →
  `packages/desktop/src/styles/globals.css`
- Copy `docs-terminai/design/app/globals.css` content as reference for Tailwind
  v4 → adapt for Tailwind v3

### 2. Copy ALL shadcn/ui Components

- Copy entire `docs-terminai/design/components/ui/` →
  `packages/desktop/src/components/ui/`
- Fix import paths: `@/lib/utils` → `../../lib/utils`

### 3. Copy Main Components EXACTLY

- `left-sidebar.tsx` → `LeftSidebar.tsx`
- `chat-pane.tsx` → `ChatView.tsx`
- `terminal-pane.tsx` → `EngineRoomPane.tsx`
- `terminal-interface.tsx` → `App.tsx`
- `resizable-handle.tsx` → `ResizableHandle.tsx`
- `theme-provider.tsx` → `ThemeProvider.tsx`

### 4. Wire to Backend

- Replace mock data in components with real hooks:
  - `ChatView`: Use `messages`, `sendMessage`, `isProcessing` from
    `useCliProcess`
  - `EngineRoomPane`: Use `toolEvents` from `useExecutionStore`
  - `LeftSidebar`: Use settings from `useSettingsStore`

### 5. Add Fonts to index.html

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono&display=swap"
  rel="stylesheet"
/>
```

### 6. Build and Test

```bash
npm run build --workspace @terminai/desktop
npm run tauri dev --workspace @terminai/desktop
```

---

## Visual Reference

The target UI (from v0.dev) looks EXACTLY like this:

- **Header**: 48px, Terminal icon + "Antigravity" text + Sun/Moon toggle
- **Left Sidebar (280px)**:
  - Settings | History tabs
  - Under Settings: App | CLI sub-tabs
  - App settings: Agent section (URL, Token, Path), Security (Approval Mode,
    Preview), Model, Voice
  - CLI: Searchable /command list with categories
- **Chat Pane (flex-1)**:
  - Messages with timestamps (user: right-aligned dark, assistant: left-aligned
    with border)
  - Input: 3-row textarea + Paperclip + Mic + Send buttons
  - Footer: "^ Planning ~ Claude Opus 4.5 (Thinking)"
- **Execution Log (400px)**:
  - Header with Terminal icon + "Execution Log" + Test Alert button
  - Tool cards: tool name + args + status badge (Running/Completed/Failed)
  - Black terminal output with green monospace text

---

## Files to NOT Modify (Backend Logic)

- `src/hooks/useCliProcess.ts`
- `src/stores/settingsStore.ts`
- `src/stores/executionStore.ts`
- `src/stores/voiceStore.ts`
- `src/types/cli.ts`
- `src-tauri/*` (Rust backend)

---

## Success Criteria

1. The app looks IDENTICAL to the design in `docs-terminai/design/`
2. Light/dark theme toggle works
3. Settings panel populates from `useSettingsStore`
4. Chat messages display from `useCliProcess`
5. Tool events display from `useExecutionStore`
6. Build passes: `npm run build --workspace @terminai/desktop`
