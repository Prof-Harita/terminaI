# Handoff: Professionalization & Stability (Dec 30, 2025)

## 1. Context & Purpose

This document serves as the bridging context for the next development phase of
**TerminaI**. The goal is to transition from a "developer debugging" phase to a
"professional product" phase.

**The Vision (User Manifesto):**

1.  **Global Assistant**: TerminaI is NOT just a coding tool bound to a folder.
    It is a general-purpose AI assistant that roams the computer and web.
2.  **One-Click Experience**: Startup must be seamless (like Slack or Discord).
    No terminals, no manual server starts. Click icon -> Ask question.
3.  **Security**: Use sandboxes/venvs for code execution, but otherwise allow
    broad access (with approval).

## 2. Technical State (As of Dec 30)

### ✅ What works (Verified)

- **Terminal Connection**: Tauri Desktop connects to local `a2a-server` (Gemini
  CLI).
- **Interactive Input**: The UI properly handles `stdin` requests (e.g., `sudo`
  password prompts), displaying an input field when the backend pauses.
- **Tool Execution**:
  - `search_web` works and renders Markdown.
  - Backend status strings (`success`, `error`) are correctly mapped to frontend
    UI (`completed`, `failed`).
  - Duplicate tool log entries have been fixed.

### 🛠️ Key Fixes Applied (Do Not Regress)

- **Environment Variables**: The server MUST start with
  `GEMINI_WEB_REMOTE_TOKEN`. The Desktop App MUST use this same token.
- **CORS**: The server MUST be started with `--web-remote-allowed-origins "*"`.
- **Frontend Logic**:
  - **Idempotency**: `addToolEvent` in `useCliProcess.ts` checks for existing
    IDs to prevent duplicates.
  - **Status Mapping**: We explicitly map `success` -> `completed` and `error`
    -> `failed`.

### ⚠️ Current Friction / Bugs

- **Workspace Restrictions**: Starting the server from a sub-directory (e.g.,
  `packages/a2a-server`) locks the agent into that directory. It cannot access
  the root.
  - _Immediate Fix for Next Dev_: Always start server from repo root.
  - _Long-term Fix_: Configure the Agent's allowable paths to be system-wide or
    user-home-wide.
- **Startup Friction**: Currently requires 2 terminals + manual app launch.

## 3. Immediate Roadmap (For Next Chat)

### Phase 1: Robustness (First 10 mins)

1.  **Systematic Bug Hunt**: Create a clean `task.md`. Run through standard user
    flows (Search, File IO, Shell Command) to catch edge cases.
2.  **Fix Workspace Logic**: Ensure the agent can access file scopes defined by
    the user (e.g., `/home/profharita/`), not just the CWD.

### Phase 2: Professionalization (The "One Click" Goal)

1.  **Bundling**: Investigate bundling the `a2a-server` (Node.js) binary
    _inside_ the Tauri app.
2.  **Process Management**: The Tauri backend (Rust) should spawn the Node.js
    server silently in the background on startup.
3.  **Auto-Discovery**: The app should automatically find the port/token of its
    spawned server, removing the need for manual Settings entry.
