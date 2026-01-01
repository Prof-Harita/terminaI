# TerminaI User Journey Streamlining Analysis

> **Purpose:** Strategic analysis of CLI and Tauri app UX to ensure 99% of
> functionality is 1-2 clicks for daily users, while supporting power users with
> tiered complexity.

## Executive Summary

The core insight: **Most users interact with TerminaI to chat and execute
commands.** All other settings should fade into the background unless explicitly
sought. This document proposes a tiered architecture where:

- **Daily use (1-2 clicks):** Chat, approve actions, voice toggle, model switch
- **Power use (2-3 clicks):** Settings panel, approval mode, MCP servers
- **Niche use (3-4 clicks):** Theme customization, hooks, experimental features,
  audit logs

---

## Strategic UX Principles

1. **Chat is Home** — Users should never leave the chat view for routine tasks
2. **Progressively Disclose** — Power settings hidden behind "Advanced" or
   "More"
3. **Model Context Protocol** — Frequent changes (model, voice) accessible from
   main UI
4. **Confirmation Flow** — Safety gates must never be more than 1 click from
   where needed
5. **Remember Preferences** — Sticky settings reduce future clicks to zero

---

## UX Streamlining Matrix

### Onboarding & Authentication

| Bucket     | Functionality | Sub-functionality       | CLI Current                                | CLI Future                             | Tauri Current                         | Tauri Future                             |
| ---------- | ------------- | ----------------------- | ------------------------------------------ | -------------------------------------- | ------------------------------------- | ---------------------------------------- |
| Onboarding | First Run     | Welcome/Branding        | Clean TUI wizard on first launch           | Keep as-is; proven onboarding flow     | Not implemented; jumps to connection  | Add first-run modal with setup steps     |
| Onboarding | First Run     | Approval Mode Selection | Interactive prompt (Safe/Preview/YOLO)     | Keep as-is; critical safety choice     | Not implemented; uses CLI default     | Add onboarding step in first-run modal   |
| Onboarding | First Run     | Voice Opt-in            | Y/n prompt during first run                | Keep as-is; explicit consent important | Not implemented                       | Add voice toggle in onboarding modal     |
| Auth       | Login         | Google OAuth            | Triggered on first API call; opens browser | Keep as-is (browser flow required)     | Uses CLI's cached token transparently | Add visual login button in settings      |
| Auth       | Login         | API Key                 | Set via TERMINAI_API_KEY env var           | Keep as-is; standard for CI/CD         | Inherit from CLI or agent URL         | Add API key field in connection settings |
| Auth       | Login         | Compute ADC             | Auto-detected on GCE/Cloud Shell           | Keep as-is; cloud-native flow          | N/A for desktop                       | N/A                                      |
| Auth       | Re-auth       | Token Refresh           | Silent auto-refresh; transparent to user   | Keep as-is; invisible is correct       | Inherits CLI behavior; no UI impact   | Status indicator shows auth state        |
| Auth       | Config        | Enforced Auth Type      | settings.json → security.auth.enforcedType | Keep as-is; admin enforcement          | Not exposed in UI                     | Add in Settings → Security → Auth (L3)   |

### Primary Chat Experience

| Bucket       | Functionality  | Sub-functionality | CLI Current                              | CLI Future                              | Tauri Current                             | Tauri Future                          |
| ------------ | -------------- | ----------------- | ---------------------------------------- | --------------------------------------- | ----------------------------------------- | ------------------------------------- |
| Primary Chat | Send Message   | Text Input        | Type at prompt; Enter to send            | Keep as-is; keyboard-native flow works  | Bottom textarea with send button          | Keep as-is; 1-click send button       |
| Primary Chat | Send Message   | Voice Input       | Hold SPACE for push-to-talk recording    | Keep as-is; ergonomic for hands-free    | Mic button; hold to record                | Keep as-is; add visual waveform       |
| Primary Chat | Send Message   | File Attachment   | Use @ syntax inline (e.g., @file.ts)     | Keep as-is; typing is fastest           | Paperclip button opens file picker        | Add @ autocomplete in input           |
| Primary Chat | View Response  | Streaming Text    | Real-time markdown rendering in TUI      | Keep as-is; streaming is essential      | Real-time bubbles with markdown           | Keep as-is; add code copy button      |
| Primary Chat | View Response  | Tool Execution    | Compact one-liner with expand option     | Keep as-is; progressive disclosure good | Execution log pane on right side          | Keep as-is; collapse by default       |
| Primary Chat | View Response  | Citations         | Hidden by default; settings.json toggle  | Keep as-is; niche feature               | Not exposed in UI                         | Add in Settings → Appearance (L3)     |
| Primary Chat | Confirm Action | Level A (Auto)    | Runs immediately; no prompt              | Keep as-is; friction-free for safe ops  | Same behavior                             | Same behavior                         |
| Primary Chat | Confirm Action | Level B (Confirm) | Inline modal; Y/n or click to approve    | Keep as-is; flows naturally in chat     | Toast/modal appears; click Approve/Reject | Keep as-is; prominent approve button  |
| Primary Chat | Confirm Action | Level C (PIN)     | Modal with PIN input field               | Keep as-is; friction is intentional     | PIN input dialog overlays chat            | Keep as-is; add PIN visibility toggle |
| Primary Chat | Context        | View Active Files | Footer shows context % + context summary | Keep as-is; non-intrusive info display  | Hidden; no context indicator visible      | Add context badge in header bar       |
| Primary Chat | Context        | Memory Refresh    | /memory refresh command                  | Keep as-is; useful for large projects   | Not implemented                           | Add refresh button in header          |

### Slash Commands (CLI-Native, Desktop Import)

| Bucket   | Functionality      | Sub-functionality          | CLI Current                            | CLI Future                       | Tauri Current          | Tauri Future                             |
| -------- | ------------------ | -------------------------- | -------------------------------------- | -------------------------------- | ---------------------- | ---------------------------------------- |
| Commands | Core Commands      | /clear                     | Clears chat history; works immediately | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Core Commands      | /exit or /quit             | Graceful exit with log flush           | Keep as-is                       | Window close           | Add to command palette                   |
| Commands | Core Commands      | /save                      | Save chat to file                      | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Model Commands     | /model                     | Shows current + lists available models | Keep as-is; already implemented! | Not available          | Add to command palette + header dropdown |
| Commands | Model Commands     | /model \<name\>            | Switches model for session             | Keep as-is; already implemented! | Not available          | Add to command palette + header dropdown |
| Commands | Chat Commands      | /chat list                 | List recent sessions                   | Keep as-is                       | History tab in sidebar | Keep sidebar history                     |
| Commands | Chat Commands      | /chat resume \<id\>        | Resume past session                    | Keep as-is                       | Not implemented        | Add click-to-resume in history           |
| Commands | Chat Commands      | /chat new                  | Start fresh session                    | Keep as-is                       | New chat button        | Keep new chat button                     |
| Commands | Memory Commands    | /memory                    | Show loaded context files              | Keep as-is                       | Not available          | Add context indicator in header          |
| Commands | Memory Commands    | /memory refresh            | Reload terminaI.md files               | Keep as-is                       | Not available          | Add refresh button                       |
| Commands | MCP Commands       | /mcp list                  | List connected MCP servers             | Keep as-is                       | Not available          | Add MCP indicator in header              |
| Commands | MCP Commands       | /mcp auth                  | Authenticate with MCP server           | Keep as-is                       | Not available          | Add in Settings → Integrations           |
| Commands | MCP Commands       | /mcp desc \<tool\>         | Describe MCP tool                      | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Tool Commands      | /tools                     | List available tools                   | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Settings Commands  | /settings                  | Opens settings.json in editor          | Keep as-is                       | Settings panel         | Keep settings panel                      |
| Commands | Settings Commands  | /vim on/off                | Toggle vim keybindings                 | Keep as-is                       | Not available          | Add in Settings → General                |
| Commands | Settings Commands  | /editor \<cmd\>            | Set preferred editor                   | Keep as-is                       | Not available          | Add in Settings → General                |
| Commands | Debug Commands     | /bug                       | Generate bug report                    | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Debug Commands     | /stats                     | Show session statistics                | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Debug Commands     | /audit                     | View audit log summary                 | Keep as-is                       | Not available          | Add in Settings → Privacy                |
| Commands | Debug Commands     | /policies                  | View active policies                   | Keep as-is                       | Not available          | Add to command palette (L3)              |
| Commands | Extension Commands | /extensions list           | List installed extensions              | Keep as-is                       | Not available          | Add in Settings → Extensions             |
| Commands | Extension Commands | /extensions enable/disable | Toggle extension                       | Keep as-is                       | Not available          | Add in Settings → Extensions             |
| Commands | IDE Commands       | /ide status                | Check IDE connection                   | Keep as-is                       | N/A for desktop        | N/A                                      |
| Commands | IDE Commands       | /ide install               | Install IDE companion                  | Keep as-is                       | N/A for desktop        | N/A                                      |
| Commands | Project Commands   | /init                      | Create terminaI.md in project          | Keep as-is                       | Not available          | Add to command palette                   |
| Commands | Project Commands   | /directory                 | Set working directory                  | Keep as-is                       | Workspace path setting | Keep in settings                         |

### Settings: Model & LLM Configuration

| Bucket   | Functionality | Sub-functionality     | CLI Current                                            | CLI Future                           | Tauri Current                | Tauri Future                            |
| -------- | ------------- | --------------------- | ------------------------------------------------------ | ------------------------------------ | ---------------------------- | --------------------------------------- |
| Settings | Model         | Current Model         | Shown in footer (always visible)                       | Keep as-is; low-friction information | Hidden; not shown in main UI | Add model name in header or footer      |
| Settings | Model         | Switch Model          | /model \<name\> or settings.json                       | Keep as-is; already 1-click via /    | Hidden in settings panel     | Add model dropdown in header bar        |
| Settings | Model         | Max Session Turns     | settings.json → model.maxSessionTurns                  | Keep as-is; power user setting       | Not exposed in UI            | Add in Settings → Model → Advanced (L3) |
| Settings | Model         | Compression Threshold | settings.json → model.compressionThreshold             | Keep as-is; rarely changed           | Not exposed in UI            | Add in Settings → Model → Advanced (L3) |
| Settings | Model         | Summarize Tool Output | settings.json → model.summarizeToolOutput              | Keep as-is; per-tool budgets         | Not exposed in UI            | Add in Settings → Model → Advanced (L4) |
| Settings | Model         | Model Aliases         | settings.json → modelConfigs.aliases                   | Keep as-is; power user customization | Not exposed in UI            | Add in Settings → Model → Aliases (L4)  |
| Settings | LLM           | Provider              | settings.json → llm.provider (gemini/openai/anthropic) | Keep as-is; restart required         | Not exposed in UI            | Add in Settings → LLM → Provider (L3)   |
| Settings | LLM           | OpenAI Base URL       | settings.json → llm.openaiCompatible.baseUrl           | Keep as-is; advanced integration     | Not exposed in UI            | Add in Settings → LLM → Custom (L4)     |
| Settings | LLM           | Custom Headers        | settings.json → llm.headers                            | Keep as-is; enterprise use           | Not exposed in UI            | Add in Settings → LLM → Advanced (L4)   |

### Settings: Voice Configuration

| Bucket   | Functionality | Sub-functionality   | CLI Current                                     | CLI Future                     | Tauri Current                | Tauri Future                            |
| -------- | ------------- | ------------------- | ----------------------------------------------- | ------------------------------ | ---------------------------- | --------------------------------------- |
| Settings | Voice         | Toggle Voice        | CLI flag --voice or settings.json               | /voice on/off (NEW)            | Hidden in deep settings menu | Add voice toggle button in header       |
| Settings | Voice         | PTT Key             | settings.json → voice.pushToTalk.key            | Keep as-is; rarely changed     | Not exposed in UI            | Move to Settings → Voice → PTT (L2)     |
| Settings | Voice         | STT Provider        | settings.json → voice.stt.provider              | Keep as-is; power user setting | Not exposed in UI            | Add in Settings → Voice → Advanced (L3) |
| Settings | Voice         | TTS Provider        | settings.json → voice.tts.provider              | Keep as-is; power user setting | Not exposed in UI            | Add in Settings → Voice → Advanced (L3) |
| Settings | Voice         | Whisper Binary Path | settings.json → voice.stt.whispercpp.binaryPath | Keep as-is; offline STT config | Not exposed in UI            | Add in Settings → Voice → Advanced (L4) |
| Settings | Voice         | Whisper Model Path  | settings.json → voice.stt.whispercpp.modelPath  | Keep as-is; offline STT config | Not exposed in UI            | Add in Settings → Voice → Advanced (L4) |
| Settings | Voice         | Input Device        | settings.json → voice.stt.whispercpp.device     | Keep as-is; mic selection      | Not exposed in UI            | Add in Settings → Voice → Device (L3)   |
| Settings | Voice         | Max Spoken Words    | settings.json → voice.spokenReply.maxWords      | Keep as-is; TTS length limit   | Not exposed in UI            | Add in Settings → Voice → TTS (L3)      |

### Settings: Security & Approval

| Bucket   | Functionality | Sub-functionality    | CLI Current                                          | CLI Future                           | Tauri Current            | Tauri Future                                 |
| -------- | ------------- | -------------------- | ---------------------------------------------------- | ------------------------------------ | ------------------------ | -------------------------------------------- |
| Settings | Security      | Approval Mode        | CLI flag --approval-mode or settings.json            | /approval \<mode\> (NEW)             | Hidden in settings panel | Add in Settings → Security (L2)              |
| Settings | Security      | Approval PIN         | settings.json → security.approvalPin                 | Keep as-is; security in file         | Not exposed in UI        | Add in Settings → Security → PIN (L2)        |
| Settings | Security      | Disable YOLO         | settings.json → security.disableYoloMode             | Keep as-is; admin enforcement        | Not exposed in UI        | Add in Settings → Security (L2)              |
| Settings | Security      | Permanent Approval   | settings.json → security.enablePermanentToolApproval | Keep as-is; "allow forever" checkbox | Not exposed in UI        | Add in Settings → Security (L3)              |
| Settings | Security      | Block Git Extensions | settings.json → security.blockGitExtensions          | Keep as-is; security enforcement     | Not exposed in UI        | Add in Settings → Security → Extensions (L3) |
| Settings | Security      | Folder Trust         | settings.json → security.folderTrust.enabled         | Keep as-is; workspace trust          | Not exposed in UI        | Add in Settings → Security (L3)              |
| Settings | Security      | Brain Authority      | settings.json → brain.authority                      | Keep as-is; expert setting           | Not exposed in UI        | Add in Settings → Advanced → Brain (L4)      |

### Settings: UI & Appearance

| Bucket   | Functionality | Sub-functionality       | CLI Current                                            | CLI Future                         | Tauri Current                         | Tauri Future                                      |
| -------- | ------------- | ----------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------------- | ------------------------------------------------- |
| Settings | Theme         | Change Theme            | settings.json → ui.theme                               | /theme \<name\> (NEW)              | Settings panel → App → Theme dropdown | Keep in Settings → Appearance (L2)                |
| Settings | Theme         | Light/Dark Toggle       | settings.json; no quick toggle                         | Ctrl+T for theme cycle (NEW)       | Header bar toggle (sun/moon icon)     | Keep as-is; 1-click toggle is correct             |
| Settings | Theme         | Custom Themes           | settings.json → ui.customThemes                        | Keep as-is; advanced customization | Not exposed in UI                     | Add in Settings → Appearance → Custom (L4)        |
| Settings | UI            | Hide Banner             | settings.json → ui.hideBanner                          | Keep as-is; minor preference       | Not exposed in UI                     | Add in Settings → Appearance → Layout (L3)        |
| Settings | UI            | Hide Footer             | settings.json → ui.hideFooter                          | Keep as-is; minor preference       | Not exposed in UI                     | Add in Settings → Appearance → Layout (L3)        |
| Settings | UI            | Hide Context Summary    | settings.json → ui.hideContextSummary                  | Keep as-is; minor preference       | Not exposed in UI                     | Add in Settings → Appearance → Layout (L3)        |
| Settings | UI            | Hide Tips               | settings.json → ui.hideTips                            | Keep as-is; minor preference       | Not exposed in UI                     | Add in Settings → Appearance → Layout (L3)        |
| Settings | UI            | Show Line Numbers       | settings.json → ui.showLineNumbers                     | Keep as-is; readability option     | Not exposed in UI                     | Add in Settings → Appearance (L2)                 |
| Settings | UI            | Show Citations          | settings.json → ui.showCitations                       | Keep as-is; niche feature          | Not exposed in UI                     | Add in Settings → Appearance (L3)                 |
| Settings | UI            | Show Model in Chat      | settings.json → ui.showModelInfoInChat                 | Keep as-is; debug option           | Not exposed in UI                     | Add in Settings → Appearance (L3)                 |
| Settings | UI            | Full Width Mode         | settings.json → ui.useFullWidth                        | Keep as-is; layout preference      | Not exposed in UI                     | Add in Settings → Appearance (L2)                 |
| Settings | UI            | Alternate Buffer        | settings.json → ui.useAlternateBuffer                  | Keep as-is; terminal mode          | N/A for desktop                       | N/A                                               |
| Settings | UI            | Incremental Rendering   | settings.json → ui.incrementalRendering                | Keep as-is; performance option     | N/A for desktop                       | N/A                                               |
| Settings | UI            | Custom Witty Phrases    | settings.json → ui.customWittyPhrases                  | Keep as-is; fun customization      | Not exposed in UI                     | Add in Settings → Appearance → Fun (L4)           |
| Settings | Accessibility | Screen Reader Mode      | settings.json → ui.accessibility.screenReader          | Keep as-is; accessibility critical | Not exposed in UI                     | Add in Settings → Appearance → Accessibility (L3) |
| Settings | Accessibility | Disable Loading Phrases | settings.json → ui.accessibility.disableLoadingPhrases | Keep as-is; accessibility option   | Not exposed in UI                     | Add in Settings → Appearance → Accessibility (L3) |

### Settings: Tools & Execution

| Bucket   | Functionality  | Sub-functionality  | CLI Current                                                  | CLI Future                      | Tauri Current     | Tauri Future                            |
| -------- | -------------- | ------------------ | ------------------------------------------------------------ | ------------------------------- | ----------------- | --------------------------------------- |
| Settings | Tools          | Sandbox Toggle     | settings.json → tools.sandbox                                | Keep as-is; restarts required   | Not exposed in UI | Add in Settings → Tools → Sandbox (L2)  |
| Settings | Tools          | Auto-Accept List   | settings.json → tools.allowed                                | Keep as-is; power user feature  | Not exposed in UI | Add in Settings → Tools → Allowed (L3)  |
| Settings | Tools          | Excluded Tools     | settings.json → tools.exclude                                | Keep as-is; hide unwanted tools | Not exposed in UI | Add in Settings → Tools → Excluded (L3) |
| Settings | Tools          | Core Tools         | settings.json → tools.core                                   | Keep as-is; restrict tool set   | Not exposed in UI | Add in Settings → Tools → Core (L4)     |
| Settings | Tools          | Use Ripgrep        | settings.json → tools.useRipgrep                             | Keep as-is; performance option  | Not exposed in UI | Add in Settings → Tools → Advanced (L4) |
| Settings | Tools          | Output Truncation  | settings.json → tools.enableToolOutputTruncation             | Keep as-is; performance option  | Not exposed in UI | Add in Settings → Tools → Advanced (L4) |
| Settings | Tools          | Message Bus        | settings.json → tools.enableMessageBusIntegration            | Keep as-is; policy integration  | Not exposed in UI | Add in Settings → Tools → Advanced (L4) |
| Settings | Shell          | Interactive Shell  | settings.json → tools.shell.enableInteractiveShell           | Keep as-is; pty mode            | Not exposed in UI | Add in Settings → Tools → Shell (L3)    |
| Settings | Shell          | Pager Command      | settings.json → tools.shell.pager                            | Keep as-is; output control      | Not exposed in UI | Add in Settings → Tools → Shell (L4)    |
| Settings | Shell          | Color Output       | settings.json → tools.shell.showColor                        | Keep as-is; terminal colors     | Not exposed in UI | Add in Settings → Tools → Shell (L3)    |
| Settings | Shell          | Inactivity Timeout | settings.json → tools.shell.inactivityTimeout                | Keep as-is; safety timeout      | Not exposed in UI | Add in Settings → Tools → Shell (L4)    |
| Settings | REPL           | Sandbox Tier       | settings.json → tools.repl.sandboxTier                       | Keep as-is; Docker tier         | Not exposed in UI | Add in Settings → Tools → REPL (L4)     |
| Settings | REPL           | Timeout            | settings.json → tools.repl.timeoutSeconds                    | Keep as-is; execution limit     | Not exposed in UI | Add in Settings → Tools → REPL (L4)     |
| Settings | REPL           | Docker Image       | settings.json → tools.repl.dockerImage                       | Keep as-is; container config    | Not exposed in UI | Add in Settings → Tools → REPL (L4)     |
| Settings | GUI Automation | Enable             | settings.json → tools.guiAutomation.enabled                  | Keep as-is; desktop control     | Not exposed in UI | Add in Settings → Tools → GUI (L3)      |
| Settings | GUI Automation | Min Review Level   | settings.json → tools.guiAutomation.minReviewLevel           | Keep as-is; safety enforcement  | Not exposed in UI | Add in Settings → Tools → GUI (L4)      |
| Settings | GUI Automation | Click Review Level | settings.json → tools.guiAutomation.clickMinReviewLevel      | Keep as-is; granular safety     | Not exposed in UI | Add in Settings → Tools → GUI (L4)      |
| Settings | GUI Automation | Type Review Level  | settings.json → tools.guiAutomation.typeMinReviewLevel       | Keep as-is; granular safety     | Not exposed in UI | Add in Settings → Tools → GUI (L4)      |
| Settings | GUI Automation | Redact Typed Text  | settings.json → tools.guiAutomation.redactTypedTextByDefault | Keep as-is; privacy             | Not exposed in UI | Add in Settings → Tools → GUI (L4)      |
| Settings | GUI Automation | Rate Limit         | settings.json → tools.guiAutomation.maxActionsPerMinute      | Keep as-is; safety limit        | Not exposed in UI | Add in Settings → Tools → GUI (L4)      |

### Settings: Context & Memory

| Bucket   | Functionality | Sub-functionality     | CLI Current                                                     | CLI Future                      | Tauri Current     | Tauri Future                              |
| -------- | ------------- | --------------------- | --------------------------------------------------------------- | ------------------------------- | ----------------- | ----------------------------------------- |
| Settings | Context       | Memory File           | settings.json → context.fileName                                | Keep as-is; per-project setting | Not exposed in UI | Add in Settings → Context → Memory (L3)   |
| Settings | Context       | Import Format         | settings.json → context.importFormat                            | Keep as-is; tree/flat format    | Not exposed in UI | Add in Settings → Context (L4)            |
| Settings | Context       | Discovery Max Dirs    | settings.json → context.discoveryMaxDirs                        | Keep as-is; scan limit          | Not exposed in UI | Add in Settings → Context → Advanced (L4) |
| Settings | Context       | Include Directories   | settings.json → context.includeDirectories                      | Keep as-is; monorepo support    | Not exposed in UI | Add in Settings → Context (L3)            |
| Settings | Context       | Respect .gitignore    | settings.json → context.fileFiltering.respectGitIgnore          | Keep as-is; default behavior    | Not exposed in UI | Add in Settings → Context → Filters (L3)  |
| Settings | Context       | Respect .geminiignore | settings.json → context.fileFiltering.respectGeminiIgnore       | Keep as-is; project filtering   | Not exposed in UI | Add in Settings → Context → Filters (L3)  |
| Settings | Context       | Recursive File Search | settings.json → context.fileFiltering.enableRecursiveFileSearch | Keep as-is; @ autocomplete      | Not exposed in UI | Add in Settings → Context → Filters (L3)  |
| Settings | Context       | Fuzzy Search          | settings.json → context.fileFiltering.disableFuzzySearch        | Keep as-is; search behavior     | Not exposed in UI | Add in Settings → Context → Filters (L4)  |

### Settings: MCP & Integrations

| Bucket   | Functionality | Sub-functionality | CLI Current                                      | CLI Future                   | Tauri Current     | Tauri Future                              |
| -------- | ------------- | ----------------- | ------------------------------------------------ | ---------------------------- | ----------------- | ----------------------------------------- |
| Settings | MCP           | Server Config     | settings.json → mcpServers.\<name\>              | Keep as-is; requires restart | Not exposed in UI | Add in Settings → Integrations → MCP (L3) |
| Settings | MCP           | Include Tools     | settings.json → mcpServers.\<name\>.includeTools | Keep as-is; tool allowlist   | Not exposed in UI | Add in Settings → Integrations → MCP (L4) |
| Settings | MCP           | Exclude Tools     | settings.json → mcpServers.\<name\>.excludeTools | Keep as-is; tool blocklist   | Not exposed in UI | Add in Settings → Integrations → MCP (L4) |
| Settings | MCP           | Server Timeout    | settings.json → mcpServers.\<name\>.timeout      | Keep as-is; request timeout  | Not exposed in UI | Add in Settings → Integrations → MCP (L4) |
| Settings | MCP           | Trust Server      | settings.json → mcpServers.\<name\>.trust        | Keep as-is; security flag    | Not exposed in UI | Add in Settings → Integrations → MCP (L4) |
| Settings | MCP           | Allowed Servers   | settings.json → mcp.allowed                      | Keep as-is; server allowlist | Not exposed in UI | Add in Settings → Integrations → MCP (L4) |

### Settings: Extensions & Hooks

| Bucket   | Functionality | Sub-functionality | CLI Current                                      | CLI Future                         | Tauri Current     | Tauri Future                                 |
| -------- | ------------- | ----------------- | ------------------------------------------------ | ---------------------------------- | ----------------- | -------------------------------------------- |
| Settings | Extensions    | Disabled List     | settings.json → extensions.disabled              | Keep as-is; extension management   | Not exposed in UI | Add in Settings → Extensions (L3)            |
| Settings | Extensions    | Enable Management | settings.json → experimental.extensionManagement | Keep as-is; experimental           | Not exposed in UI | Add in Settings → Extensions → Advanced (L4) |
| Settings | Extensions    | Hot Reloading     | settings.json → experimental.extensionReloading  | Keep as-is; experimental           | Not exposed in UI | Add in Settings → Extensions → Advanced (L4) |
| Settings | Hooks         | Enable Hooks      | settings.json → tools.enableHooks                | Keep as-is; automation             | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | Disabled Hooks    | settings.json → hooks.disabled                   | Keep as-is; hook management        | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | BeforeTool        | settings.json → hooks.BeforeTool                 | Keep as-is; tool interception      | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | AfterTool         | settings.json → hooks.AfterTool                  | Keep as-is; tool post-processing   | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | BeforeModel       | settings.json → hooks.BeforeModel                | Keep as-is; prompt injection       | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | AfterModel        | settings.json → hooks.AfterModel                 | Keep as-is; response processing    | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | SessionStart/End  | settings.json → hooks.SessionStart/SessionEnd    | Keep as-is; lifecycle hooks        | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |
| Settings | Hooks         | PreCompress       | settings.json → hooks.PreCompress                | Keep as-is; backup before compress | Not exposed in UI | Add in Settings → Advanced → Hooks (L4)      |

### Settings: Recipes & Automation

| Bucket   | Functionality | Sub-functionality     | CLI Current                                         | CLI Future                    | Tauri Current     | Tauri Future                                |
| -------- | ------------- | --------------------- | --------------------------------------------------- | ----------------------------- | ----------------- | ------------------------------------------- |
| Settings | Recipes       | User Paths            | settings.json → recipes.paths                       | Keep as-is; custom recipes    | Not exposed in UI | Add in Settings → Automation → Recipes (L3) |
| Settings | Recipes       | Community Paths       | settings.json → recipes.communityPaths              | Keep as-is; community recipes | Not exposed in UI | Add in Settings → Automation → Recipes (L3) |
| Settings | Recipes       | Allow Community       | settings.json → recipes.allowCommunity              | Keep as-is; community toggle  | Not exposed in UI | Add in Settings → Automation → Recipes (L3) |
| Settings | Recipes       | Confirm on First Load | settings.json → recipes.confirmCommunityOnFirstLoad | Keep as-is; safety prompt     | Not exposed in UI | Add in Settings → Automation → Recipes (L4) |
| Settings | Recipes       | Trusted Recipes       | settings.json → recipes.trustedCommunityRecipes     | Keep as-is; pre-approved list | Not exposed in UI | Add in Settings → Automation → Recipes (L4) |

### Settings: General & Advanced

| Bucket   | Functionality | Sub-functionality     | CLI Current                                               | CLI Future                       | Tauri Current     | Tauri Future                                |
| -------- | ------------- | --------------------- | --------------------------------------------------------- | -------------------------------- | ----------------- | ------------------------------------------- |
| Settings | General       | Preview Features      | settings.json → general.previewFeatures                   | Keep as-is; beta models          | Not exposed in UI | Add in Settings → General (L2)              |
| Settings | General       | Preferred Editor      | settings.json → general.preferredEditor                   | Keep as-is; editor integration   | Not exposed in UI | Add in Settings → General (L2)              |
| Settings | General       | Vim Mode              | settings.json → general.vimMode                           | /vim command already exists      | Not exposed in UI | Add in Settings → General (L2)              |
| Settings | General       | Auto Update           | settings.json → general.disableAutoUpdate                 | Keep as-is; update control       | Not exposed in UI | Add in Settings → General (L3)              |
| Settings | General       | Update Nag            | settings.json → general.disableUpdateNag                  | Keep as-is; notification control | Not exposed in UI | Add in Settings → General (L3)              |
| Settings | General       | Prompt Completion     | settings.json → general.enablePromptCompletion            | Keep as-is; AI autocomplete      | Not exposed in UI | Add in Settings → General (L2)              |
| Settings | General       | Retry Fetch Errors    | settings.json → general.retryFetchErrors                  | Keep as-is; network resilience   | Not exposed in UI | Add in Settings → Advanced (L4)             |
| Settings | General       | Checkpointing         | settings.json → general.checkpointing.enabled             | Keep as-is; session recovery     | Not exposed in UI | Add in Settings → Advanced (L3)             |
| Settings | General       | Session Retention     | settings.json → general.sessionRetention                  | Keep as-is; cleanup policy       | Not exposed in UI | Add in Settings → Advanced → Logs (L3)      |
| Settings | Output        | Format                | settings.json → output.format (text/json)                 | Keep as-is; CLI output mode      | N/A for desktop   | N/A                                         |
| Settings | IDE           | Enable IDE Mode       | settings.json → ide.enabled                               | Keep as-is; VS Code integration  | N/A for desktop   | N/A                                         |
| Settings | Privacy       | Usage Statistics      | settings.json → privacy.usageStatisticsEnabled            | Keep as-is; telemetry toggle     | Not exposed in UI | Add in Settings → Privacy (L3)              |
| Settings | Telemetry     | OTLP Config           | settings.json → telemetry                                 | Keep as-is; observability        | Not exposed in UI | Add in Settings → Advanced → Telemetry (L4) |
| Settings | Audit         | Redact UI Text        | settings.json → audit.redactUiTypedText                   | Keep as-is; privacy              | Not exposed in UI | Add in Settings → Privacy → Audit (L3)      |
| Settings | Audit         | Retention Days        | settings.json → audit.retentionDays                       | Keep as-is; compliance           | Not exposed in UI | Add in Settings → Privacy → Audit (L4)      |
| Settings | Audit         | Export Format         | settings.json → audit.export.format                       | Keep as-is; export control       | Not exposed in UI | Add in Settings → Privacy → Audit (L4)      |
| Settings | Audit         | Export Redaction      | settings.json → audit.export.redaction                    | Keep as-is; enterprise export    | Not exposed in UI | Add in Settings → Privacy → Audit (L4)      |
| Settings | Logs          | Retention Days        | settings.json → logs.retention.days                       | Keep as-is; log cleanup          | Not exposed in UI | Add in Settings → Advanced → Logs (L3)      |
| Settings | Experimental  | Enable Agents         | settings.json → experimental.enableAgents                 | Keep as-is; subagents            | Not exposed in UI | Add in Settings → Advanced → Labs (L4)      |
| Settings | Experimental  | JIT Context           | settings.json → experimental.jitContext                   | Keep as-is; lazy loading         | Not exposed in UI | Add in Settings → Advanced → Labs (L4)      |
| Settings | Experimental  | Codebase Investigator | settings.json → experimental.codebaseInvestigatorSettings | Keep as-is; code analysis        | Not exposed in UI | Add in Settings → Advanced → Labs (L4)      |
| Settings | Experimental  | Introspection Agent   | settings.json → experimental.introspectionAgentSettings   | Keep as-is; self-analysis        | Not exposed in UI | Add in Settings → Advanced → Labs (L4)      |
| Settings | Advanced      | DNS Resolution Order  | settings.json → advanced.dnsResolutionOrder               | Keep as-is; network config       | Not exposed in UI | Add in Settings → Advanced → Network (L4)   |
| Settings | Advanced      | Excluded Env Vars     | settings.json → advanced.excludedEnvVars                  | Keep as-is; context filtering    | Not exposed in UI | Add in Settings → Advanced (L4)             |
| Settings | Advanced      | Bug Command Config    | settings.json → advanced.bugCommand                       | Keep as-is; bug report config    | Not exposed in UI | Add in Settings → Advanced (L4)             |
| Settings | Advanced      | Smart Edit            | settings.json → useSmartEdit                              | Keep as-is; edit mode            | Not exposed in UI | Add in Settings → Advanced (L4)             |
| Settings | Advanced      | Write Todos           | settings.json → useWriteTodos                             | Keep as-is; todo tool            | Not exposed in UI | Add in Settings → Advanced (L4)             |

### Desktop-Only Features

| Bucket  | Functionality | Sub-functionality | CLI Current                   | CLI Future                      | Tauri Current                        | Tauri Future                               |
| ------- | ------------- | ----------------- | ----------------------------- | ------------------------------- | ------------------------------------ | ------------------------------------------ |
| Desktop | Connection    | Agent URL         | N/A (CLI is local)            | N/A                             | Settings panel → Agent → URL field   | Keep in Settings → Connection (L2)         |
| Desktop | Connection    | Agent Token       | N/A (CLI is local)            | N/A                             | Settings panel → Agent → Token field | Keep in Settings → Connection (L2)         |
| Desktop | Connection    | Workspace Path    | N/A (CLI is local)            | N/A                             | Settings panel → Agent → Path field  | Keep in Settings → Connection (L2)         |
| Desktop | Terminal      | Embedded Shell    | N/A (CLI is the shell)        | N/A                             | xterm.js pane for shell access       | Keep; toggle via header button             |
| Desktop | Notifications | System Alerts     | N/A                           | N/A                             | Native notifications on completion   | Keep as-is; add notification settings (L3) |
| Desktop | Remote        | Cloud Relay       | CLI: --web-remote + relay URL | Keep as-is; relay is CLI-hosted | Client connects via URL + token      | Add relay status in header                 |

### Troubleshooting & Exit

| Bucket          | Functionality | Sub-functionality | CLI Current                             | CLI Future                        | Tauri Current                 | Tauri Future                         |
| --------------- | ------------- | ----------------- | --------------------------------------- | --------------------------------- | ----------------------------- | ------------------------------------ |
| Troubleshooting | Errors        | View Diagnostics  | Error shown in red with diagnostic path | Keep as-is; actionable error info | Error toast with retry button | Add error detail expansion           |
| Troubleshooting | Errors        | Bug Report        | /bug generates report                   | Keep as-is; good escape hatch     | Not implemented               | Add /bug command in palette          |
| Troubleshooting | Connection    | Lost Connection   | N/A (CLI is local)                      | N/A                               | Modal with retry button       | Keep as-is; add auto-reconnect       |
| Exit            | Quit App      | Normal Exit       | Ctrl+C or /exit                         | Keep as-is; standard UX patterns  | Window close button           | Keep as-is; add confirmation if busy |
| Exit            | Quit App      | Emergency Stop    | Ctrl+C twice for force quit             | Keep as-is; escape hatch needed   | No equivalent                 | Add red stop button if processing    |

---

## Proposed Tauri Settings Hierarchy

```
Header Bar (Always Visible - L1)
├── Model Dropdown ← NEW (1 click to change model)
├── Voice Toggle Button ← NEW (1 click on/off)
├── Context Indicator ← NEW (shows loaded files count)
├── MCP Status Indicator ← NEW (connected servers)
├── Theme Toggle (sun/moon) ← KEEP
└── Connection Status Indicator ← NEW

Left Sidebar (L2)
├── [Settings Tab]
│   ├── Connection (L2)
│   │   ├── Agent URL
│   │   ├── Agent Token
│   │   └── Workspace Path
│   │
│   ├── General (L2)
│   │   ├── Preview Features Toggle
│   │   ├── Preferred Editor
│   │   ├── Vim Mode Toggle
│   │   └── Prompt Completion Toggle
│   │
│   ├── Security (L2)
│   │   ├── Approval Mode Dropdown (Safe/Preview/YOLO)
│   │   ├── PIN Configuration
│   │   ├── Disable YOLO Toggle
│   │   └── Advanced (L3)
│   │       ├── Permanent Tool Approval
│   │       ├── Block Git Extensions
│   │       ├── Folder Trust
│   │       └── Auth Settings (L4)
│   │
│   ├── Appearance (L2)
│   │   ├── Theme Picker
│   │   ├── Show Line Numbers
│   │   ├── Full Width Mode
│   │   ├── Layout Options (L3)
│   │   │   ├── Hide Banner
│   │   │   ├── Hide Footer
│   │   │   ├── Hide Context
│   │   │   └── Hide Tips
│   │   ├── Citations (L3)
│   │   ├── Model Info in Chat (L3)
│   │   ├── Custom Themes (L4)
│   │   ├── Custom Phrases (L4)
│   │   └── Accessibility (L3)
│   │       ├── Screen Reader Mode
│   │       └── Disable Loading Phrases
│   │
│   ├── Voice (L2)
│   │   ├── Enable/Disable Toggle
│   │   ├── PTT Key Selection
│   │   ├── Max Spoken Words
│   │   └── Advanced (L3)
│   │       ├── STT Provider
│   │       ├── TTS Provider
│   │       ├── Input Device
│   │       └── Whisper Paths (L4)
│   │
│   ├── Model (L3)
│   │   ├── Current Model (read-only)
│   │   ├── Max Session Turns
│   │   ├── Compression Threshold
│   │   └── Advanced (L4)
│   │       ├── Model Aliases
│   │       ├── Summarize Tool Output
│   │       └── Skip Speaker Check
│   │
│   ├── Tools (L3)
│   │   ├── Sandbox Toggle
│   │   ├── Allowed Commands List
│   │   ├── Excluded Tools
│   │   ├── Shell Settings (L3)
│   │   │   ├── Interactive Shell
│   │   │   ├── Color Output
│   │   │   ├── Pager Command (L4)
│   │   │   └── Inactivity Timeout (L4)
│   │   ├── GUI Automation (L3)
│   │   │   ├── Enable Toggle
│   │   │   └── Review Levels (L4)
│   │   ├── REPL Settings (L4)
│   │   └── Advanced (L4)
│   │       ├── Core Tools
│   │       ├── Use Ripgrep
│   │       ├── Output Truncation
│   │       └── Message Bus
│   │
│   ├── Integrations (L3)
│   │   ├── MCP Servers List
│   │   ├── Add New Server
│   │   └── Server Details (L4)
│   │       ├── Include/Exclude Tools
│   │       ├── Timeout
│   │       └── Trust Flag
│   │
│   ├── Context (L3)
│   │   ├── Memory File(s)
│   │   ├── Include Directories
│   │   └── File Filters (L3)
│   │       ├── Respect .gitignore
│   │       ├── Respect .geminiignore
│   │       └── Recursive Search
│   │
│   ├── LLM (L3)
│   │   ├── Provider Selection (Gemini/OpenAI/Anthropic)
│   │   └── Custom Endpoint (L4)
│   │       ├── Base URL
│   │       ├── Auth Type
│   │       └── Custom Headers
│   │
│   ├── Automation (L3)
│   │   └── Recipes
│   │       ├── Allow Community
│   │       ├── User Recipe Paths
│   │       └── Community Paths (L4)
│   │
│   ├── Extensions (L3)
│   │   ├── Enabled/Disabled List
│   │   └── Advanced (L4)
│   │       ├── Extension Management
│   │       └── Hot Reloading
│   │
│   ├── Privacy (L3)
│   │   ├── Usage Statistics
│   │   └── Audit (L4)
│   │       ├── Redact UI Text
│   │       ├── Retention Days
│   │       └── Export Settings
│   │
│   └── Advanced (L4)
│       ├── Brain Authority
│       ├── Hooks Configuration
│       │   ├── Enable Hooks
│       │   ├── Disabled Hooks
│       │   └── Hook Definitions (BeforeTool, AfterTool, etc.)
│       ├── Experimental Features
│       │   ├── Enable Agents
│       │   ├── JIT Context
│       │   ├── Codebase Investigator
│       │   └── Introspection Agent
│       ├── Logs & Retention
│       │   ├── Session Retention
│       │   ├── Log Retention Days
│       │   └── Checkpointing
│       ├── Telemetry
│       └── Other
│           ├── DNS Resolution
│           ├── Excluded Env Vars
│           ├── Smart Edit Toggle
│           └── Write Todos Toggle
│
├── [History Tab] (L2)
│   ├── Recent Sessions (scrollable)
│   ├── Click to Resume
│   └── Session Details (L3)
│
└── [Commands Tab] (L2)
    └── Searchable /command list
        ├── Core (/clear, /exit, /save)
        ├── Model (/model)
        ├── Chat (/chat list, /chat resume, /chat new)
        ├── Memory (/memory, /memory refresh)
        ├── MCP (/mcp list, /mcp auth)
        ├── Tools (/tools)
        ├── Settings (/settings, /vim, /editor)
        ├── Debug (/bug, /stats, /audit, /policies)
        ├── Extensions (/extensions list, /extensions enable)
        └── Project (/init, /directory)
```

---

## CLI Slash Commands Summary

### Already Implemented in CLI

| Command               | Action                   | Category   |
| --------------------- | ------------------------ | ---------- |
| `/clear`              | Clear chat history       | Core       |
| `/exit`, `/quit`      | Graceful exit            | Core       |
| `/save`               | Save chat to file        | Core       |
| `/model`              | Show/switch model        | Model      |
| `/model <name>`       | Switch to specific model | Model      |
| `/chat list`          | List sessions            | History    |
| `/chat resume <id>`   | Resume session           | History    |
| `/chat new`           | New session              | History    |
| `/memory`             | Show context             | Context    |
| `/memory refresh`     | Reload context           | Context    |
| `/mcp list`           | List MCP servers         | MCP        |
| `/mcp auth`           | Authenticate MCP         | MCP        |
| `/mcp desc <tool>`    | Describe tool            | MCP        |
| `/mcp schema <tool>`  | Show tool schema         | MCP        |
| `/mcp refresh`        | Refresh MCP              | MCP        |
| `/tools`              | List tools               | Tools      |
| `/settings`           | Open settings file       | Settings   |
| `/vim`                | Toggle vim mode          | Settings   |
| `/editor <cmd>`       | Set editor               | Settings   |
| `/bug`                | Generate bug report      | Debug      |
| `/stats`              | Session statistics       | Debug      |
| `/audit`              | Audit log summary        | Debug      |
| `/policies`           | View policies            | Debug      |
| `/extensions list`    | List extensions          | Extensions |
| `/extensions enable`  | Enable extension         | Extensions |
| `/extensions disable` | Disable extension        | Extensions |
| `/extensions update`  | Update extensions        | Extensions |
| `/extensions explore` | Browse extensions        | Extensions |
| `/extensions restart` | Restart extensions       | Extensions |
| `/ide status`         | IDE connection status    | IDE        |
| `/ide install`        | Install IDE companion    | IDE        |
| `/ide enable/disable` | Toggle IDE mode          | IDE        |
| `/init`               | Create terminaI.md       | Project    |
| `/directory`          | Set working directory    | Project    |

### Proposed New CLI Commands

| Command            | Action                   | Replaces                 |
| ------------------ | ------------------------ | ------------------------ |
| `/voice on/off`    | Toggle voice mode        | Edit settings.json       |
| `/approval <mode>` | Change approval mode     | Edit settings.json       |
| `/theme <name>`    | Switch theme             | Edit settings.json       |
| `/theme`           | List available themes    | Check docs               |
| `/history`         | Alias for `/chat list`   | Easier discovery         |
| `/resume <id>`     | Alias for `/chat resume` | Easier discovery         |
| `Ctrl+T`           | Cycle themes             | None (keyboard shortcut) |

---

## Click Depth Analysis

### Daily User (99% of interactions) - Target: 1-2 clicks

| Action           | Clicks | Notes                               |
| ---------------- | ------ | ----------------------------------- |
| Send message     | 1      | Type + Enter/click                  |
| Approve command  | 1      | Click Approve button                |
| Toggle voice     | 1      | Header toggle (proposed)            |
| Switch model     | 2      | Header dropdown → select (proposed) |
| View tool output | 1      | Click expand                        |
| Clear chat       | 1      | /clear or button                    |
| New session      | 1      | /chat new or button                 |

### Power User (weekly interactions) - Target: 2-3 clicks

| Action               | Clicks | Notes                          |
| -------------------- | ------ | ------------------------------ |
| Change approval mode | 2      | Settings → Security → dropdown |
| Add MCP server       | 3      | Settings → Integrations → Add  |
| Configure theme      | 2      | Settings → Appearance → picker |
| View session history | 2      | Sidebar → History tab          |
| Enable voice         | 2      | Settings → Voice → toggle      |
| Change model aliases | 3      | Settings → Model → Aliases     |
| Toggle sandbox       | 2      | Settings → Tools → toggle      |

### Niche User (rare interactions) - Target: 3-4 clicks

| Action                   | Clicks | Notes                                    |
| ------------------------ | ------ | ---------------------------------------- |
| Configure hooks          | 4      | Settings → Advanced → Hooks → edit       |
| Enable experimental      | 4      | Settings → Advanced → Labs → toggle      |
| Change brain authority   | 4      | Settings → Advanced → Brain → select     |
| Configure audit logs     | 4      | Settings → Privacy → Audit → set         |
| Screen reader mode       | 3      | Settings → Appearance → Accessibility    |
| Custom whisper path      | 4      | Settings → Voice → Advanced → Whisper    |
| GUI automation levels    | 4      | Settings → Tools → GUI → Levels          |
| REPL Docker config       | 4      | Settings → Tools → REPL → Docker         |
| MCP tool include/exclude | 4      | Settings → Integrations → Server → Tools |
| Hook definitions         | 4+     | Settings → Advanced → Hooks → BeforeTool |

---

## Summary Recommendations

### CLI Enhancements

1. **Add quick commands:** `/voice`, `/approval`, `/theme` (model already
   exists!)
2. **Add keyboard shortcuts:** `Ctrl+T` for theme toggle
3. **Keep file editing** for deep settings — appropriate for CLI power users
4. **Note:** Many commands already exist! Document them better in help text.

### Tauri App Enhancements

1. **Header bar additions:**
   - Model dropdown (1 click)
   - Voice toggle (1 click)
   - Context indicator (info display)
   - MCP status (info display)
   - Connection status (info display)

2. **Settings panel restructure:**
   - L2: General, Security, Appearance, Voice (immediate access)
   - L3: Model, Tools, Integrations, Context, LLM, Automation, Extensions,
     Privacy
   - L4: Advanced (Hooks, Experimental, Telemetry, etc.)

3. **Command palette (Cmd+K):**
   - Import all CLI slash commands
   - Searchable
   - Keyboard-navigable

4. **First-run experience:**
   - Onboarding modal
   - Approval mode selection
   - Voice opt-in
   - Connection setup

---

## Implementation Priority

| Priority | Change                                    | Impact                | Effort |
| -------- | ----------------------------------------- | --------------------- | ------ |
| P0       | Header bar: model dropdown + voice toggle | Massive daily UX      | Medium |
| P0       | Command palette (Cmd+K)                   | Power user efficiency | High   |
| P1       | Flatten settings hierarchy                | Reduce click depth    | Medium |
| P1       | Document existing CLI commands better     | Discovery             | Low    |
| P1       | Add context/MCP indicators to header      | Information display   | Low    |
| P2       | Onboarding modal                          | First-run experience  | Medium |
| P2       | Session resume in history tab             | Quality of life       | Low    |
| P2       | /voice, /approval, /theme commands        | CLI parity            | Low    |
| P3       | Advanced settings reorganization          | Cleaner architecture  | Medium |
| P3       | Full settings sync to Tauri               | Desktop completeness  | High   |

---

## Appendix: Settings Count by Depth

| Depth     | Category                | Count    | Notes                                                                     |
| --------- | ----------------------- | -------- | ------------------------------------------------------------------------- |
| L1        | Header bar actions      | 5        | Model, voice, theme, context, status                                      |
| L2        | Settings panel sections | 8        | General, Security, Appearance, Voice, Model, Tools, Integrations, Privacy |
| L3        | Sub-sections            | 20+      | Tool types, MCP details, context filters, etc.                            |
| L4        | Advanced/Power user     | 50+      | Hooks, experimental, REPL, telemetry, etc.                                |
| **Total** | All settings            | **150+** | Exhaustive coverage of settingsSchema.ts                                  |
